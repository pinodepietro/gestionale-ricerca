# backend/app/api/v1/endpoints/erogazioni.py
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
from app.models.budget import Erogazione
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
    importo: float = Form(...),
    data_erogazione: str = Form(...),
    tipo: str = Form(...),
    descrizione: str = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_amministrativo),
):
    _get_progetto_or_404(progetto_id, db)
    if tipo not in TIPI_EROGAZIONE:
        raise HTTPException(status_code=400, detail={"error": {"code": "TIPO_NON_VALIDO",
                                                                "message": f"Tipo '{tipo}' non valido"}})
    documento_path = None
    if file and file.filename:
        upload_dir = os.path.join(settings.UPLOAD_DIR, "erogazioni", progetto_id)
        os.makedirs(upload_dir, exist_ok=True)
        eid = _uuid.uuid4()
        ext = os.path.splitext(file.filename)[1]
        documento_path = os.path.join(upload_dir, f"{eid}{ext}")
        content = await file.read()
        with open(documento_path, "wb") as f_out:
            f_out.write(content)

    e = Erogazione(
        progetto_id=progetto_id,
        importo=importo,
        data_erogazione=date.fromisoformat(data_erogazione),
        tipo=tipo,
        descrizione=descrizione,
        documento_path=documento_path,
        created_by=utente.id,
    )
    db.add(e)
    db.commit()
    db.refresh(e)
    return {"data": _erogazione_dict(e)}


@router.patch("/progetti/{progetto_id}/erogazioni/{eid}")
async def aggiorna_erogazione(
    progetto_id: str,
    eid: str,
    importo: float = Form(None),
    data_erogazione: str = Form(None),
    tipo: str = Form(None),
    descrizione: str = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_amministrativo),
):
    e = _get_or_404(eid, progetto_id, db)

    if importo is not None:
        e.importo = importo
    if data_erogazione:
        e.data_erogazione = date.fromisoformat(data_erogazione)
    if tipo:
        if tipo not in TIPI_EROGAZIONE:
            raise HTTPException(status_code=400, detail={"error": {"code": "TIPO_NON_VALIDO",
                                                                    "message": f"Tipo '{tipo}' non valido"}})
        e.tipo = tipo
    if descrizione is not None:
        e.descrizione = descrizione

    if file and file.filename:
        # rimuovi vecchio file se esiste
        if e.documento_path and os.path.exists(e.documento_path):
            os.remove(e.documento_path)
        upload_dir = os.path.join(settings.UPLOAD_DIR, "erogazioni", progetto_id)
        os.makedirs(upload_dir, exist_ok=True)
        new_id = _uuid.uuid4()
        ext = os.path.splitext(file.filename)[1]
        e.documento_path = os.path.join(upload_dir, f"{new_id}{ext}")
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
