# backend/app/api/v1/endpoints/partner.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.core.deps import tutti_i_ruoli, solo_amministrativo
from app.models.partner import Partner
from app.models.persona import Persona
import math

router = APIRouter()


def partner_dict(p: Partner) -> dict:
    return {
        "id": str(p.id), "nome": p.nome, "codice_fiscale": p.codice_fiscale,
        "tipo": p.tipo, "paese": p.paese,
        "referente_nome": p.referente_nome, "referente_email": p.referente_email,
    }


@router.get("/partner")
def lista_partner(
    search: str = Query(None),
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli),
):
    q = db.query(Partner)
    if search:
        q = q.filter(or_(Partner.nome.ilike(f"%{search}%"), Partner.codice_fiscale.ilike(f"%{search}%")))
    q = q.order_by(Partner.nome)
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return {"data": [partner_dict(p) for p in items],
            "meta": {"total": total, "page": page, "page_size": page_size,
                     "total_pages": math.ceil(total / page_size) if page_size else 1}}


@router.get("/partner/{id}")
def get_partner(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    return {"data": partner_dict(_get_or_404(id, db))}


@router.post("/partner")
def crea_partner(body: dict, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    p = Partner(nome=body["nome"], codice_fiscale=body.get("codice_fiscale"),
                tipo=body.get("tipo", "università"), paese=body.get("paese", "IT"),
                referente_nome=body.get("referente_nome"), referente_email=body.get("referente_email"))
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"data": partner_dict(p)}


@router.patch("/partner/{id}")
def aggiorna_partner(id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    p = _get_or_404(id, db)
    for k, v in body.items():
        if hasattr(Partner, k) and k != "id":
            setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return {"data": partner_dict(p)}


@router.delete("/partner/{id}")
def elimina_partner(id: str, db: Session = Depends(get_db), utente: Persona = Depends(solo_amministrativo)):
    p = _get_or_404(id, db)
    db.delete(p)
    db.commit()
    return {"data": {"deleted": True}}


def _get_or_404(id: str, db: Session) -> Partner:
    p = db.query(Partner).filter(Partner.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Partner non trovato"}})
    return p
