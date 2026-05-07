# backend/app/api/v1/endpoints/config.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import tutti_i_ruoli, solo_amministrativo
from app.models.persona import Persona
from app.models.partner import TipoFinanziamento, Partner
from app.models.budget import VoceDiCosto
from app.models.timesheet import TemplateTimesheet
import uuid

router = APIRouter()


# ─── Voci di costo ────────────────────────────────────────────────────────────

@router.get("/voci-di-costo")
def lista_voci_di_costo(db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    items = db.query(VoceDiCosto).order_by(VoceDiCosto.codice).all()
    return {"data": [_voce_dict(i) for i in items]}


@router.post("/voci-di-costo")
def crea_voce(body: dict, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    if db.query(VoceDiCosto).filter(VoceDiCosto.codice == body.get("codice")).first():
        raise HTTPException(status_code=409, detail={"error": {"code": "CODICE_DUPLICATO", "message": "Esiste già una voce con questo codice"}})
    v = VoceDiCosto(
        id=uuid.uuid4(),
        codice=body.get("codice"),
        descrizione=body.get("descrizione"),
        categoria=body.get("categoria", "altro"),
        ammissibile_horizon=body.get("ammissibile_horizon", True),
        ammissibile_pnrr=body.get("ammissibile_pnrr", True),
        ammissibile_por=body.get("ammissibile_por", True),
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return {"data": _voce_dict(v)}


@router.patch("/voci-di-costo/{id}")
def aggiorna_voce(id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    v = db.query(VoceDiCosto).filter(VoceDiCosto.id == id).first()
    if not v:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Voce non trovata"}})
    for k in ("codice", "descrizione", "categoria", "ammissibile_horizon", "ammissibile_pnrr", "ammissibile_por"):
        if k in body:
            setattr(v, k, body[k])
    db.commit()
    db.refresh(v)
    return {"data": _voce_dict(v)}


@router.delete("/voci-di-costo/{id}")
def elimina_voce(id: str, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    v = db.query(VoceDiCosto).filter(VoceDiCosto.id == id).first()
    if not v:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Voce non trovata"}})
    db.delete(v)
    db.commit()
    return {"data": {"deleted": True}}


def _voce_dict(v: VoceDiCosto) -> dict:
    return {
        "id": str(v.id), "codice": v.codice, "descrizione": v.descrizione,
        "categoria": v.categoria,
        "ammissibile_horizon": bool(v.ammissibile_horizon),
        "ammissibile_pnrr": bool(v.ammissibile_pnrr),
        "ammissibile_por": bool(v.ammissibile_por),
    }


# ─── Template Timesheet ───────────────────────────────────────────────────────

@router.get("/template-timesheet")
def lista_template(db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    items = db.query(TemplateTimesheet).all()
    return {"data": [_template_dict(i) for i in items]}


@router.post("/template-timesheet")
def crea_template(body: dict, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    t = TemplateTimesheet(
        id=uuid.uuid4(),
        nome=body.get("nome"),
        granularita=body.get("granularita", "mensile"),
        righe_wp_task=body.get("righe_wp_task", True),
        riga_altri_progetti=body.get("riga_altri_progetti", True),
        riga_ordinaria=body.get("riga_ordinaria", True),
        riga_assenze=body.get("riga_assenze", True),
        num_firmatari=body.get("num_firmatari", 2),
        etichetta_firmatario_1=body.get("etichetta_firmatario_1", "Firma Dipendente"),
        etichetta_firmatario_2=body.get("etichetta_firmatario_2"),
        etichetta_firmatario_3=body.get("etichetta_firmatario_3"),
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return {"data": _template_dict(t)}


@router.patch("/template-timesheet/{id}")
def aggiorna_template(id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    t = db.query(TemplateTimesheet).filter(TemplateTimesheet.id == id).first()
    if not t:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Template non trovato"}})
    for k in ("nome", "granularita", "righe_wp_task", "riga_altri_progetti", "riga_ordinaria",
              "riga_assenze", "num_firmatari", "etichetta_firmatario_1", "etichetta_firmatario_2", "etichetta_firmatario_3"):
        if k in body:
            setattr(t, k, body[k])
    db.commit()
    db.refresh(t)
    return {"data": _template_dict(t)}


@router.delete("/template-timesheet/{id}")
def elimina_template(id: str, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    t = db.query(TemplateTimesheet).filter(TemplateTimesheet.id == id).first()
    if not t:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Template non trovato"}})
    db.delete(t)
    db.commit()
    return {"data": {"deleted": True}}


def _template_dict(t: TemplateTimesheet) -> dict:
    return {
        "id": str(t.id), "nome": t.nome, "granularita": t.granularita,
        "righe_wp_task": t.righe_wp_task, "riga_altri_progetti": t.riga_altri_progetti,
        "riga_ordinaria": t.riga_ordinaria, "riga_assenze": t.riga_assenze,
        "num_firmatari": t.num_firmatari,
        "etichetta_firmatario_1": t.etichetta_firmatario_1,
        "etichetta_firmatario_2": t.etichetta_firmatario_2,
        "etichetta_firmatario_3": t.etichetta_firmatario_3,
    }


# ─── Tipi finanziamento (sola lettura) ───────────────────────────────────────

@router.get("/tipi-finanziamento")
def lista_tipi_finanziamento(db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    items = db.query(TipoFinanziamento).all()
    return {"data": [{"id": str(i.id), "nome": i.nome, "categoria": i.categoria,
                      "ente_erogante": i.ente_erogante} for i in items]}


@router.get("/partner")
def lista_partner(db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    items = db.query(Partner).order_by(Partner.nome).all()
    return {"data": [{"id": str(i.id), "nome": i.nome, "tipo": i.tipo, "paese": i.paese} for i in items]}


@router.post("/template-timesheet/{id}/upload")
async def upload_template_file(
    id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_amministrativo),
):
    import os

    t = db.query(TemplateTimesheet).filter(TemplateTimesheet.id == id).first()
    if not t:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Template non trovato"}})

    upload_dir = "/app/uploads/templates"
    os.makedirs(upload_dir, exist_ok=True)
    dest = f"{upload_dir}/{id}.xlsx"

    with open(dest, "wb") as f_out:
        content_bytes = await file.read()
        f_out.write(content_bytes)

    t.file_template_path = dest
    db.commit()
    return {"data": {"path": dest, "message": "Template caricato con successo"}}
