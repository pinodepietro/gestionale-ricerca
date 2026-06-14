# backend/app/api/v1/endpoints/dipartimenti.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import tutti_i_ruoli, solo_amministrativo
from app.models.autorizzazione_spesa import Dipartimento
from app.models.persona import Persona

router = APIRouter()


def _dict(d: Dipartimento) -> dict:
    return {
        "id": str(d.id),
        "nome": d.nome,
        "direttore_id": str(d.direttore_id) if d.direttore_id else None,
        "direttore": {
            "id": str(d.direttore.id),
            "nome": d.direttore.nome,
            "cognome": d.direttore.cognome,
        } if d.direttore else None,
    }


@router.get("/dipartimenti")
def lista_dipartimenti(db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    items = db.query(Dipartimento).order_by(Dipartimento.nome).all()
    return {"data": [_dict(d) for d in items]}


@router.post("/dipartimenti")
def crea_dipartimento(body: dict, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    d = Dipartimento(nome=body["nome"], direttore_id=body.get("direttore_id"))
    db.add(d)
    db.commit()
    db.refresh(d)
    return {"data": _dict(d)}


@router.patch("/dipartimenti/{id}")
def aggiorna_dipartimento(id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    d = db.query(Dipartimento).filter(Dipartimento.id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Dipartimento non trovato"}})
    if "nome" in body:
        d.nome = body["nome"]
    if "direttore_id" in body:
        d.direttore_id = body["direttore_id"]
    db.commit()
    db.refresh(d)
    return {"data": _dict(d)}


@router.delete("/dipartimenti/{id}")
def elimina_dipartimento(id: str, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    d = db.query(Dipartimento).filter(Dipartimento.id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Dipartimento non trovato"}})
    db.delete(d)
    db.commit()
    return {"data": {"deleted": True}}
