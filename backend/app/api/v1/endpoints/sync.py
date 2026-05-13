# Endpoint di sincronizzazione per missioni-app.
# Restituisce i progetti attivi/chiusi/rendicontati nel formato atteso da missioni-app.
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.config import settings
from app.models.progetto import Progetto
from app.models.personale import Allocazione
from app.models.persona import Persona
from app.models.budget import BudgetVoce, VoceDiCosto, Spesa, Impegno
from pydantic import BaseModel
from datetime import date as date_type
from decimal import Decimal
import uuid as uuid_module

router = APIRouter()


def _verifica_api_key(x_sync_key: str = Header(...)):
    if x_sync_key != settings.SYNC_API_KEY:
        raise HTTPException(status_code=403, detail="API key non valida")


@router.get("/sync/progetti")
def sync_progetti(db: Session = Depends(get_db), _: None = Depends(_verifica_api_key)):
    progetti = (
        db.query(Progetto)
        .filter(Progetto.stato.in_(["attivo", "chiuso", "rendicontato"]))
        .all()
    )

    result = []
    for p in progetti:
        pi_email = None
        alloc_pi = (
            db.query(Allocazione)
            .filter(Allocazione.progetto_id == p.id, Allocazione.is_pi == True)
            .first()
        )
        if alloc_pi:
            persona = db.query(Persona).filter(Persona.id == alloc_pi.persona_id).first()
            if persona:
                pi_email = persona.email

        ammin_email = None
        alloc_ammin = (
            db.query(Allocazione)
            .filter(Allocazione.progetto_id == p.id, Allocazione.is_ammin == True)
            .first()
        )
        if alloc_ammin:
            persona_ammin = db.query(Persona).filter(Persona.id == alloc_ammin.persona_id).first()
            if persona_ammin:
                ammin_email = persona_ammin.email

        result.append({
            "codice": p.codice,
            "nome": p.titolo,
            "tipologia": p.tipo,
            "stato": p.stato,
            "data_inizio": p.data_inizio.isoformat() if p.data_inizio else None,
            "data_fine": p.data_fine.isoformat() if p.data_fine else None,
            "attivo": p.stato == "attivo",
            "pi_email": pi_email,
            "ammin_email": ammin_email,
            "riferimento_bando": p.riferimento_bando,
        })

    return {"data": result, "totale": len(result)}


def _disponibile_per_voce(db: Session, bv: BudgetVoce) -> float:
    speso = db.query(func.sum(Spesa.importo)).filter(
        Spesa.voce_id == bv.voce_id,
        Spesa.progetto_id == bv.progetto_id,
    ).scalar() or 0
    return float(bv.importo_previsto or 0) - float(bv.importo_impegnato or 0) - float(speso)


@router.get("/internal/progetti/{codice}/disponibilita-missione")
def disponibilita_missione(
    codice: str,
    db: Session = Depends(get_db),
    _: None = Depends(_verifica_api_key),
):
    p = db.query(Progetto).filter(Progetto.codice == codice).first()
    if not p:
        raise HTTPException(status_code=404, detail="Progetto non trovato")

    result = {}
    for cat in ["missioni", "overhead"]:
        row = (
            db.query(BudgetVoce, VoceDiCosto)
            .join(VoceDiCosto, BudgetVoce.voce_id == VoceDiCosto.id)
            .filter(BudgetVoce.progetto_id == p.id, VoceDiCosto.categoria == cat)
            .first()
        )
        if row:
            bv, voce = row
            disponibile = _disponibile_per_voce(db, bv)
            result[cat] = {
                "voce_id": str(bv.voce_id),
                "voce_descrizione": voce.descrizione,
                "disponibile": round(disponibile, 2),
            }
        else:
            result[cat] = None

    return {"progetto_id": str(p.id), "disponibilita": result}


class ImpegnoInternoIn(BaseModel):
    voce_id: str
    importo: float
    descrizione: str
    data: str  # ISO date string YYYY-MM-DD


class RimborsoCompletato(BaseModel):
    impegno_id: str
    importo: float  # importo effettivo del rimborso
    descrizione: str
    data: str  # ISO date string YYYY-MM-DD


@router.post("/internal/progetti/{codice}/impegni")
def crea_impegno_interno(
    codice: str,
    body: ImpegnoInternoIn,
    db: Session = Depends(get_db),
    _: None = Depends(_verifica_api_key),
):
    p = db.query(Progetto).filter(Progetto.codice == codice).first()
    if not p:
        raise HTTPException(status_code=404, detail="Progetto non trovato")

    try:
        voce_uuid = uuid_module.UUID(body.voce_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="voce_id non valido")

    bv = db.query(BudgetVoce).filter(
        BudgetVoce.progetto_id == p.id,
        BudgetVoce.voce_id == voce_uuid,
    ).first()
    if not bv:
        raise HTTPException(status_code=404, detail="Voce di budget non trovata nel progetto")

    disponibile = _disponibile_per_voce(db, bv)
    if body.importo > disponibile:
        raise HTTPException(
            status_code=422,
            detail=f"Fondi insufficienti: disponibile € {disponibile:.2f}",
        )

    impegno = Impegno(
        progetto_id=p.id,
        voce_id=voce_uuid,
        importo=Decimal(str(body.importo)),
        descrizione=body.descrizione,
        data=date_type.fromisoformat(body.data),
    )
    db.add(impegno)
    bv.importo_impegnato = Decimal(str(float(bv.importo_impegnato or 0) + body.importo))
    db.commit()
    db.refresh(impegno)

    return {"id": str(impegno.id)}


@router.post("/internal/rimborso-completato")
def rimborso_completato(
    body: RimborsoCompletato,
    db: Session = Depends(get_db),
    _: None = Depends(_verifica_api_key),
):
    try:
        impegno_uuid = uuid_module.UUID(body.impegno_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="impegno_id non valido")

    impegno = db.query(Impegno).filter(Impegno.id == impegno_uuid).first()
    if not impegno:
        raise HTTPException(status_code=404, detail="Impegno non trovato")

    bv = db.query(BudgetVoce).filter(
        BudgetVoce.progetto_id == impegno.progetto_id,
        BudgetVoce.voce_id == impegno.voce_id,
    ).first()

    from app.models.budget import Spesa
    spesa = Spesa(
        progetto_id=impegno.progetto_id,
        voce_id=impegno.voce_id,
        importo=Decimal(str(body.importo)),
        data=date_type.fromisoformat(body.data),
        descrizione=body.descrizione,
        stato="registrata",
    )
    db.add(spesa)

    if bv:
        importo_impegnato_attuale = float(bv.importo_impegnato or 0)
        nuovo_impegnato = max(0.0, importo_impegnato_attuale - float(impegno.importo))
        bv.importo_impegnato = Decimal(str(nuovo_impegnato))

    db.delete(impegno)
    db.commit()
    db.refresh(spesa)

    return {"spesa_id": str(spesa.id)}
