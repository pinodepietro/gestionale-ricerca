# backend/app/api/v1/endpoints/proposte.py
import math
import uuid
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.core.deps import tutti_i_ruoli, solo_amministrativo
from app.models.proposta import Proposta, PropostaPartner
from app.models.progetto import Progetto
from app.models.personale import Allocazione
from app.models.persona import Persona

router = APIRouter()

STATI_VALIDI = {"in_preparazione", "sottomessa", "approvata", "rigettata"}


# ── Serializzatori ────────────────────────────────────────────────────────────

def _persona_mini(p: Persona) -> dict:
    return {
        "id": str(p.id),
        "nome": p.nome,
        "cognome": p.cognome,
        "email": p.email,
        "ssd": p.ssd,
    }


def _partner_dict(pp: PropostaPartner) -> dict:
    return {
        "id": str(pp.id),
        "proposta_id": str(pp.proposta_id),
        "denominazione": pp.denominazione,
        "tipologia": pp.tipologia,
        "ruolo": pp.ruolo,
        "nazionalita": pp.nazionalita,
        "sito_web": pp.sito_web,
    }


def _proposta_dict(p: Proposta, include_partner: bool = True) -> dict:
    perc_overhead = None
    if p.costo_totale and p.importo_overhead and float(p.costo_totale) > 0:
        perc_overhead = round(float(p.importo_overhead) / float(p.costo_totale) * 100, 2)

    d = {
        "id": str(p.id),
        "acronimo": p.acronimo,
        "titolo": p.titolo,
        "bando": p.bando,
        "data_scadenza_bando": p.data_scadenza_bando.isoformat() if p.data_scadenza_bando else None,
        "responsabile_scientifico": _persona_mini(p.responsabile_scientifico) if p.responsabile_scientifico else None,
        "descrizione": p.descrizione,
        "data_inizio_prevista": p.data_inizio_prevista.isoformat() if p.data_inizio_prevista else None,
        "durata_mesi": p.durata_mesi,
        "costo_totale": float(p.costo_totale) if p.costo_totale is not None else None,
        "importo_finanziato": float(p.importo_finanziato) if p.importo_finanziato is not None else None,
        "importo_cofinanziato": float(p.importo_cofinanziato) if p.importo_cofinanziato is not None else None,
        "importo_personale_interno": float(p.importo_personale_interno) if p.importo_personale_interno is not None else None,
        "importo_overhead": float(p.importo_overhead) if p.importo_overhead is not None else None,
        "percentuale_overhead": perc_overhead,
        "stato": p.stato,
        "created_by": str(p.created_by),
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }
    if include_partner:
        d["partner"] = [_partner_dict(pp) for pp in p.partner]
    return d


# ── Proposte CRUD ─────────────────────────────────────────────────────────────

@router.get("/proposte")
def lista_proposte(
    stato: str = Query(None),
    search: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    q = db.query(Proposta)
    if stato:
        q = q.filter(Proposta.stato == stato)
    if search:
        q = q.filter(or_(
            Proposta.titolo.ilike(f"%{search}%"),
            Proposta.acronimo.ilike(f"%{search}%"),
            Proposta.bando.ilike(f"%{search}%"),
        ))
    q = q.order_by(Proposta.data_scadenza_bando.desc())
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "data": [_proposta_dict(p, include_partner=False) for p in items],
        "meta": {"total": total, "page": page, "page_size": page_size,
                 "total_pages": math.ceil(total / page_size) if page_size else 1},
    }


@router.get("/proposte/{id}")
def get_proposta(
    id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    return {"data": _proposta_dict(_get_or_404(id, db))}


@router.post("/proposte")
def crea_proposta(
    body: dict,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    p = Proposta(
        acronimo=body.get("acronimo"),
        titolo=body["titolo"],
        bando=body["bando"],
        data_scadenza_bando=date.fromisoformat(body["data_scadenza_bando"]),
        responsabile_scientifico_id=utente.id,
        descrizione=body.get("descrizione"),
        data_inizio_prevista=date.fromisoformat(body["data_inizio_prevista"]) if body.get("data_inizio_prevista") else None,
        durata_mesi=body.get("durata_mesi"),
        costo_totale=body.get("costo_totale"),
        importo_finanziato=body.get("importo_finanziato"),
        importo_cofinanziato=body.get("importo_cofinanziato"),
        importo_personale_interno=body.get("importo_personale_interno"),
        importo_overhead=body.get("importo_overhead"),
        stato="in_preparazione",
        created_by=utente.id,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"data": _proposta_dict(p)}


@router.patch("/proposte/{id}")
def aggiorna_proposta(
    id: str,
    body: dict,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    p = _get_or_404(id, db)
    _verifica_permesso(p, utente)

    campi_stringa = ["acronimo", "titolo", "bando", "descrizione"]
    campi_numerici = ["durata_mesi", "costo_totale", "importo_finanziato",
                      "importo_cofinanziato", "importo_personale_interno", "importo_overhead"]

    for k in campi_stringa + campi_numerici:
        if k in body:
            setattr(p, k, body[k])

    if "data_scadenza_bando" in body and body["data_scadenza_bando"]:
        p.data_scadenza_bando = date.fromisoformat(body["data_scadenza_bando"])
    if "data_inizio_prevista" in body:
        p.data_inizio_prevista = date.fromisoformat(body["data_inizio_prevista"]) if body["data_inizio_prevista"] else None

    if "stato" in body:
        if body["stato"] not in STATI_VALIDI:
            raise HTTPException(status_code=400, detail={"error": {"code": "STATO_NON_VALIDO",
                                                                    "message": f"Stato '{body['stato']}' non valido"}})
        p.stato = body["stato"]

    db.commit()
    db.refresh(p)
    return {"data": _proposta_dict(p)}


@router.delete("/proposte/{id}")
def elimina_proposta(
    id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    p = _get_or_404(id, db)
    _verifica_permesso(p, utente)
    db.delete(p)
    db.commit()
    return {"data": {"deleted": True}}


# ── Partner CRUD ──────────────────────────────────────────────────────────────

@router.post("/proposte/{id}/partner")
def aggiungi_partner(
    id: str,
    body: dict,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    p = _get_or_404(id, db)
    _verifica_permesso(p, utente)
    pp = PropostaPartner(
        proposta_id=p.id,
        denominazione=body["denominazione"],
        tipologia=body["tipologia"],
        ruolo=body.get("ruolo", "partner"),
        nazionalita=body.get("nazionalita"),
        sito_web=body.get("sito_web"),
    )
    db.add(pp)
    db.commit()
    db.refresh(pp)
    return {"data": _partner_dict(pp)}


@router.patch("/proposte/{id}/partner/{partner_id}")
def aggiorna_partner(
    id: str,
    partner_id: str,
    body: dict,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    p = _get_or_404(id, db)
    _verifica_permesso(p, utente)
    pp = _get_partner_or_404(partner_id, id, db)
    for k in ["denominazione", "tipologia", "ruolo", "nazionalita", "sito_web"]:
        if k in body:
            setattr(pp, k, body[k])
    db.commit()
    db.refresh(pp)
    return {"data": _partner_dict(pp)}


@router.delete("/proposte/{id}/partner/{partner_id}")
def elimina_partner(
    id: str,
    partner_id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    p = _get_or_404(id, db)
    _verifica_permesso(p, utente)
    pp = _get_partner_or_404(partner_id, id, db)
    db.delete(pp)
    db.commit()
    return {"data": {"deleted": True}}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_or_404(id: str, db: Session) -> Proposta:
    p = db.query(Proposta).filter(Proposta.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Proposta non trovata"}})
    return p


def _get_partner_or_404(partner_id: str, proposta_id: str, db: Session) -> PropostaPartner:
    pp = db.query(PropostaPartner).filter(
        PropostaPartner.id == partner_id,
        PropostaPartner.proposta_id == proposta_id,
    ).first()
    if not pp:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Partner non trovato"}})
    return pp


# ── Conversione proposta → progetto ──────────────────────────────────────────

@router.post("/proposte/{id}/converti")
def converti_in_progetto(
    id: str,
    body: dict,
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_amministrativo),
):
    """
    Crea un Progetto in stato 'bozza' pre-compilato con i dati della Proposta.
    Richiede nel body: codice, tipo.
    Opzionali: data_inizio, data_fine (se non derivabili dalla proposta).
    """
    proposta = _get_or_404(id, db)

    if proposta.stato == "approvata":
        raise HTTPException(status_code=400, detail={"error": {"code": "GIA_CONVERTITA",
                                                                "message": "Proposta già convertita in progetto"}})

    # codice e tipo sono obbligatori nella conversione
    codice = body.get("codice")
    tipo = body.get("tipo")
    if not codice or not tipo:
        raise HTTPException(status_code=400, detail={"error": {"code": "DATI_MANCANTI",
                                                                "message": "Campi obbligatori: codice, tipo"}})

    # Verifica unicità codice
    if db.query(Progetto).filter(Progetto.codice == codice).first():
        raise HTTPException(status_code=400, detail={"error": {"code": "CODICE_DUPLICATO",
                                                                "message": f"Codice progetto '{codice}' già in uso"}})

    # date: usa quelle della proposta se disponibili, altrimenti richiede body
    data_inizio = proposta.data_inizio_prevista
    if body.get("data_inizio"):
        data_inizio = date.fromisoformat(body["data_inizio"])
    if not data_inizio:
        raise HTTPException(status_code=400, detail={"error": {"code": "DATI_MANCANTI",
                                                                "message": "data_inizio richiesta (non presente nella proposta)"}})

    data_fine = None
    if body.get("data_fine"):
        data_fine = date.fromisoformat(body["data_fine"])
    elif proposta.durata_mesi and data_inizio:
        # stima: aggiungi i mesi di durata
        mesi = proposta.durata_mesi
        anno = data_inizio.year + (data_inizio.month - 1 + mesi) // 12
        mese = (data_inizio.month - 1 + mesi) % 12 + 1
        data_fine = data_inizio.replace(year=anno, month=mese)
    if not data_fine:
        raise HTTPException(status_code=400, detail={"error": {"code": "DATI_MANCANTI",
                                                                "message": "data_fine richiesta (non derivabile dalla proposta)"}})

    progetto = Progetto(
        codice=codice,
        titolo=proposta.titolo,
        acronimo=proposta.acronimo,
        descrizione=proposta.descrizione,
        tipo=tipo,
        stato="bozza",
        data_inizio=data_inizio,
        data_fine=data_fine,
        costo_totale=proposta.costo_totale or 0,
        importo_finanziato=proposta.importo_finanziato or 0,
        riferimento_bando=proposta.bando,
    )
    db.add(progetto)
    db.flush()  # ottieni l'id prima del commit

    # Allocazione PI
    alloc = Allocazione(
        persona_id=proposta.responsabile_scientifico_id,
        progetto_id=progetto.id,
        ore_assegnate=0,
        data_inizio=data_inizio,
        data_fine=data_fine,
        is_pi=True,
    )
    db.add(alloc)

    # Marca proposta come approvata
    proposta.stato = "approvata"

    db.commit()
    db.refresh(progetto)

    return {
        "data": {
            "progetto_id": str(progetto.id),
            "codice": progetto.codice,
            "titolo": progetto.titolo,
            "stato": progetto.stato,
        }
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _verifica_permesso(proposta: Proposta, utente: Persona):
    if utente.ruolo == "superadmin":
        return
    if str(proposta.created_by) != str(utente.id):
        raise HTTPException(status_code=403, detail={"error": {"code": "RBAC_AZIONE_NON_CONSENTITA",
                                                                "message": "Non hai i permessi per modificare questa proposta"}})
