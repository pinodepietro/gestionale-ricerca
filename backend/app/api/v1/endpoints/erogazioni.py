# backend/app/api/v1/endpoints/erogazioni.py
import json
import os
import uuid as _uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.deps import tutti_i_ruoli, solo_amministrativo
from app.core.config import settings
from app.models.budget import Erogazione, ErogazioneVoce, BudgetVoce
from app.models.progetto import Progetto
from app.models.persona import Persona

router = APIRouter()

TIPI_EROGAZIONE = {"anticipazione", "pagamento_fattura", "trasferimento_fondi"}


def _erogazione_dict(e: Erogazione) -> dict:
    return {
        "id": str(e.id),
        "progetto_id": str(e.progetto_id),
        "importo": float(e.importo),
        "data_erogazione": e.data_erogazione.isoformat() if e.data_erogazione else None,
        "tipo": e.tipo,
        "descrizione": e.descrizione,
        "documento_path": e.documento_path,
        "ha_documento": bool(e.documento_path),
        "created_by": str(e.created_by) if e.created_by else None,
        "created_at": e.created_at.isoformat() if e.created_at else None,
        "voci": [{"budget_voce_id": str(v.budget_voce_id), "importo": float(v.importo)} for v in e.voci],
    }


def _get_progetto_or_404(progetto_id: str, db: Session) -> Progetto:
    p = db.query(Progetto).filter(Progetto.id == progetto_id).first()
    if not p:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Progetto non trovato"}})
    return p


def _get_or_404(eid: str, progetto_id: str, db: Session) -> Erogazione:
    e = db.query(Erogazione).filter(Erogazione.id == eid, Erogazione.progetto_id == progetto_id).first()
    if not e:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Erogazione non trovata"}})
    return e


def _applica_voci(e: Erogazione, voci_data: list, db: Session, delta: int = 1) -> None:
    """Applica o rimuove allocazioni voce. delta=1 per aggiungere, delta=-1 per sottrarre."""
    for item in voci_data:
        bv_id = item["budget_voce_id"]
        importo = float(item["importo"])
        bv = db.query(BudgetVoce).filter(BudgetVoce.id == bv_id, BudgetVoce.progetto_id == e.progetto_id).first()
        if not bv:
            raise HTTPException(status_code=400, detail={"error": {"code": "VOCE_NON_TROVATA",
                                                                    "message": f"Budget voce {bv_id} non trovata"}})
        bv.importo_erogato = float(bv.importo_erogato or 0) + delta * importo


@router.get("/progetti/{progetto_id}/erogazioni")
def lista_erogazioni(
    progetto_id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    _get_progetto_or_404(progetto_id, db)
    progetto = db.query(Progetto).filter(Progetto.id == progetto_id).first()
    erogazioni = db.query(Erogazione).filter(
        Erogazione.progetto_id == progetto_id
    ).order_by(Erogazione.data_erogazione).all()

    totale_erogato = float(
        db.query(func.coalesce(func.sum(Erogazione.importo), 0))
        .filter(Erogazione.progetto_id == progetto_id)
        .scalar()
    )
    importo_finanziato = float(progetto.importo_finanziato or 0)
    da_ricevere = max(0, importo_finanziato - totale_erogato)

    return {
        "data": [_erogazione_dict(e) for e in erogazioni],
        "totali": {
            "totale_erogato": totale_erogato,
            "importo_finanziato": importo_finanziato,
            "da_ricevere": da_ricevere,
        },
    }


@router.post("/progetti/{progetto_id}/erogazioni")
async def crea_erogazione(
    progetto_id: str,
    data_erogazione: str = Form(...),
    tipo: str = Form(...),
    voci: str = Form(...),
    descrizione: str = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_amministrativo),
):
    _get_progetto_or_404(progetto_id, db)
    if tipo not in TIPI_EROGAZIONE:
        raise HTTPException(status_code=400, detail={"error": {"code": "TIPO_NON_VALIDO",
                                                                "message": f"Tipo '{tipo}' non valido"}})
    try:
        voci_data = json.loads(voci)
    except Exception:
        raise HTTPException(status_code=400, detail={"error": {"code": "VOCI_NON_VALIDE", "message": "Campo voci non valido"}})
    if not voci_data:
        raise HTTPException(status_code=400, detail={"error": {"code": "VOCI_OBBLIGATORIE",
                                                                "message": "Allocare almeno una voce di costo"}})
    importo_totale = round(sum(float(v["importo"]) for v in voci_data), 2)

    documento_path = None
    if file and file.filename:
        from app.services.storage import progetto_dir, upload_filename
        p = _get_progetto_or_404(progetto_id, db)
        upload_dir = progetto_dir(p.codice, "erogazioni")
        os.makedirs(upload_dir, exist_ok=True)
        eid_tmp = _uuid.uuid4()
        documento_path = os.path.join(upload_dir, upload_filename(file.filename, str(eid_tmp)))
        content = await file.read()
        with open(documento_path, "wb") as f_out:
            f_out.write(content)

    e = Erogazione(
        progetto_id=progetto_id,
        importo=importo_totale,
        data_erogazione=date.fromisoformat(data_erogazione),
        tipo=tipo,
        descrizione=descrizione,
        documento_path=documento_path,
        created_by=utente.id,
    )
    db.add(e)
    db.flush()

    for item in voci_data:
        bv_id = item["budget_voce_id"]
        imp = float(item["importo"])
        bv = db.query(BudgetVoce).filter(BudgetVoce.id == bv_id, BudgetVoce.progetto_id == progetto_id).first()
        if not bv:
            db.rollback()
            raise HTTPException(status_code=400, detail={"error": {"code": "VOCE_NON_TROVATA",
                                                                    "message": f"Budget voce {bv_id} non trovata"}})
        db.add(ErogazioneVoce(erogazione_id=e.id, budget_voce_id=bv_id, importo=imp))
        bv.importo_erogato = float(bv.importo_erogato or 0) + imp

    db.commit()
    db.refresh(e)
    return {"data": _erogazione_dict(e)}


@router.patch("/progetti/{progetto_id}/erogazioni/{eid}")
async def aggiorna_erogazione(
    progetto_id: str,
    eid: str,
    data_erogazione: str = Form(None),
    tipo: str = Form(None),
    voci: str = Form(None),
    descrizione: str = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_amministrativo),
):
    e = _get_or_404(eid, progetto_id, db)

    if data_erogazione:
        e.data_erogazione = date.fromisoformat(data_erogazione)
    if tipo:
        if tipo not in TIPI_EROGAZIONE:
            raise HTTPException(status_code=400, detail={"error": {"code": "TIPO_NON_VALIDO",
                                                                    "message": f"Tipo '{tipo}' non valido"}})
        e.tipo = tipo
    if descrizione is not None:
        e.descrizione = descrizione

    if voci is not None:
        try:
            voci_data = json.loads(voci)
        except Exception:
            raise HTTPException(status_code=400, detail={"error": {"code": "VOCI_NON_VALIDE", "message": "Campo voci non valido"}})
        if not voci_data:
            raise HTTPException(status_code=400, detail={"error": {"code": "VOCI_OBBLIGATORIE",
                                                                    "message": "Allocare almeno una voce di costo"}})
        # sottrai vecchie allocazioni
        for old_v in e.voci:
            bv = db.query(BudgetVoce).filter(BudgetVoce.id == old_v.budget_voce_id).first()
            if bv:
                bv.importo_erogato = max(0.0, float(bv.importo_erogato or 0) - float(old_v.importo))
        # elimina vecchi record ErogazioneVoce
        for old_v in list(e.voci):
            db.delete(old_v)
        db.flush()
        # aggiungi nuove allocazioni
        importo_totale = round(sum(float(v["importo"]) for v in voci_data), 2)
        for item in voci_data:
            bv_id = item["budget_voce_id"]
            imp = float(item["importo"])
            bv = db.query(BudgetVoce).filter(BudgetVoce.id == bv_id, BudgetVoce.progetto_id == progetto_id).first()
            if not bv:
                db.rollback()
                raise HTTPException(status_code=400, detail={"error": {"code": "VOCE_NON_TROVATA",
                                                                        "message": f"Budget voce {bv_id} non trovata"}})
            db.add(ErogazioneVoce(erogazione_id=e.id, budget_voce_id=bv_id, importo=imp))
            bv.importo_erogato = float(bv.importo_erogato or 0) + imp
        e.importo = importo_totale

    if file and file.filename:
        if e.documento_path and os.path.exists(e.documento_path):
            os.remove(e.documento_path)
        from app.services.storage import progetto_dir, upload_filename
        p = _get_progetto_or_404(progetto_id, db)
        upload_dir = progetto_dir(p.codice, "erogazioni")
        os.makedirs(upload_dir, exist_ok=True)
        new_id = _uuid.uuid4()
        e.documento_path = os.path.join(upload_dir, upload_filename(file.filename, str(new_id)))
        content = await file.read()
        with open(e.documento_path, "wb") as f_out:
            f_out.write(content)

    db.commit()
    db.refresh(e)
    return {"data": _erogazione_dict(e)}


@router.delete("/progetti/{progetto_id}/erogazioni/{eid}")
def elimina_erogazione(
    progetto_id: str,
    eid: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_amministrativo),
):
    e = _get_or_404(eid, progetto_id, db)
    # sottrai allocazioni da BudgetVoce prima di eliminare
    for v in e.voci:
        bv = db.query(BudgetVoce).filter(BudgetVoce.id == v.budget_voce_id).first()
        if bv:
            bv.importo_erogato = max(0.0, float(bv.importo_erogato or 0) - float(v.importo))
    if e.documento_path and os.path.exists(e.documento_path):
        os.remove(e.documento_path)
    db.delete(e)
    db.commit()
    return {"data": {"deleted": True}}


@router.get("/progetti/{progetto_id}/erogazioni/{eid}/documento")
def scarica_documento(
    progetto_id: str,
    eid: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    e = _get_or_404(eid, progetto_id, db)
    if not e.documento_path or not os.path.exists(e.documento_path):
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND",
                                                                "message": "Documento non trovato"}})
    return FileResponse(e.documento_path, filename=os.path.basename(e.documento_path))
