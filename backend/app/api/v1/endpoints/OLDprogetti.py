# backend/app/api/v1/endpoints/progetti.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.core.deps import tutti_i_ruoli, solo_amministrativo
from app.models.progetto import Progetto
from app.models.persona import Persona
import math

router = APIRouter()

STATI_VALIDI = {"attivo", "chiuso", "rendicontato"}
TRANSIZIONI = {
    "bozza":         {"attiva": "attivo"},
    "attivo":        {"chiudi": "chiuso"},
    "chiuso":        {"attiva": "attivo", "rendiconta": "rendicontato"},
    "rendicontato":  {},
}


def pagina(items, total, page, page_size):
    return {
        "data": items,
        "meta": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": math.ceil(total / page_size) if page_size else 1,
        },
    }


@router.get("")
def lista_progetti(
    stato: str = Query(None),
    tipo: str = Query(None),
    search: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    q = db.query(Progetto).filter(Progetto.stato != "bozza")

    if stato:
        q = q.filter(Progetto.stato == stato)
    if tipo:
        q = q.filter(Progetto.tipo == tipo)
    if search:
        q = q.filter(or_(
            Progetto.codice.ilike(f"%{search}%"),
            Progetto.titolo.ilike(f"%{search}%"),
            Progetto.acronimo.ilike(f"%{search}%"),
        ))

    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()

    return pagina(
        [_progetto_dict(p) for p in items],
        total, page, page_size,
    )


@router.get("/{id}")
def get_progetto(
    id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    p = _get_or_404(id, db)
    return {"data": _progetto_dict(p)}


@router.post("")
def crea_progetto(
    body: dict,
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_amministrativo),
):
    p = Progetto(**{k: v for k, v in body.items() if hasattr(Progetto, k)})
    p.stato = "bozza"
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"data": _progetto_dict(p)}


@router.patch("/{id}")
def aggiorna_progetto(
    id: str,
    body: dict,
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_amministrativo),
):
    p = _get_or_404(id, db)
    for k, v in body.items():
        if hasattr(Progetto, k) and k not in ("id", "stato"):
            setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return {"data": _progetto_dict(p)}


@router.post("/{id}/attiva")
def attiva_progetto(
    id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_amministrativo),
):
    return _transizione(id, "attiva", db)


@router.post("/{id}/chiudi")
def chiudi_progetto(
    id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_amministrativo),
):
    return _transizione(id, "chiudi", db)


# ─── helpers ────────────────────────────────────────────────────────────────

def _get_or_404(id: str, db: Session) -> Progetto:
    p = db.query(Progetto).filter(Progetto.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Progetto non trovato"}})
    return p


def _transizione(id: str, azione: str, db: Session):
    p = _get_or_404(id, db)
    nuovo_stato = TRANSIZIONI.get(p.stato, {}).get(azione)
    if not nuovo_stato:
        raise HTTPException(
            status_code=409,
            detail={"error": {"code": "TRANSIZIONE_NON_VALIDA",
                               "message": f"Impossibile eseguire '{azione}' da stato '{p.stato}'"}},
        )
    p.stato = nuovo_stato
    db.commit()
    db.refresh(p)
    return {"data": _progetto_dict(p)}


def _progetto_dict(p: Progetto) -> dict:
    return {
        "id": str(p.id),
        "codice": p.codice,
        "titolo": p.titolo,
        "acronimo": p.acronimo,
        "tipo": p.tipo,
        "stato": p.stato,
        "data_inizio": str(p.data_inizio) if p.data_inizio else None,
        "data_fine": str(p.data_fine) if p.data_fine else None,
        "costo_totale": float(p.costo_totale) if p.costo_totale else 0,
        "importo_finanziato": float(p.importo_finanziato) if p.importo_finanziato else 0,
        "quota_cofinanziamento": float(p.costo_totale or 0) - float(p.importo_finanziato or 0),
        "budget_per_partner": p.budget_per_partner,
        "cup": p.cup,
    }
