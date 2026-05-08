# backend/app/api/v1/endpoints/personale.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.core.deps import tutti_i_ruoli, solo_amministrativo
from app.models.persona import Persona
from app.models.personale import CostoOrarioPersona, MonteOreAnnuale, Allocazione
from app.core.security import hash_password
from datetime import date
import math

router = APIRouter()


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


def persona_dict(p: Persona) -> dict:
    return {
        "id": str(p.id),
        "nome": p.nome,
        "cognome": p.cognome,
        "email": p.email,
        "codice_fiscale": p.codice_fiscale,
        "ruolo": p.ruolo,
        "ruolo_ente": p.ruolo_ente,
        "livello_contratto": p.livello_contratto,
        "data_inizio_servizio": str(p.data_inizio_servizio) if p.data_inizio_servizio else None,
        "attivo": p.attivo,
    }


def costo_dict(c: CostoOrarioPersona) -> dict:
    return {
        "id": str(c.id),
        "persona_id": str(c.persona_id),
        "costo_orario": float(c.costo_orario),
        "data_inizio": str(c.data_inizio),
        "data_fine": str(c.data_fine) if c.data_fine else None,
        "motivazione": c.motivazione,
        "created_at": str(c.created_at) if c.created_at else None,
    }


def monte_ore_dict(m: MonteOreAnnuale) -> dict:
    ore_residue = float(m.ore_disponibili) - float(m.ore_allocate)
    return {
        "id": str(m.id),
        "persona_id": str(m.persona_id),
        "anno": m.anno,
        "ore_disponibili": float(m.ore_disponibili),
        "ore_allocate": float(m.ore_allocate),
        "ore_residue": ore_residue,
    }


# ─── Stato PI (per dashboard) ────────────────────────────────────────────────

@router.get("/me/is-pi")
def sono_pi_di_qualcuno(
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    is_pi = db.query(Allocazione).filter(
        Allocazione.persona_id == utente.id,
        Allocazione.is_pi == True,
    ).first() is not None
    return {"data": {"is_pi": is_pi}}


# ─── Persone ─────────────────────────────────────────────────────────────────

@router.get("/persone")
def lista_persone(
    search: str = Query(None),
    attivo: bool = Query(None),
    ruolo: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    q = db.query(Persona)
    if attivo is not None:
        q = q.filter(Persona.attivo == attivo)
    if ruolo:
        q = q.filter(Persona.ruolo == ruolo)
    if search:
        q = q.filter(or_(
            Persona.nome.ilike(f"%{search}%"),
            Persona.cognome.ilike(f"%{search}%"),
            Persona.email.ilike(f"%{search}%"),
        ))
    q = q.order_by(Persona.cognome, Persona.nome)
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return pagina([persona_dict(p) for p in items], total, page, page_size)


@router.get("/persone/{id}")
def get_persona(
    id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    p = _get_persona_or_404(id, db)
    return {"data": persona_dict(p)}


@router.post("/persone")
def crea_persona(
    body: dict,
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_amministrativo),
):
    # Verifica email unica
    if db.query(Persona).filter(Persona.email == body.get("email")).first():
        raise HTTPException(
            status_code=409,
            detail={"error": {"code": "EMAIL_DUPLICATA", "message": "Email già presente nel sistema"}},
        )

    password = body.pop("password", None)
    campi_validi = {k: v for k, v in body.items() if hasattr(Persona, k) and k not in ("id", "password_hash")}
    p = Persona(**campi_validi)
    if password:
        p.password_hash = hash_password(password)
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"data": persona_dict(p)}


@router.patch("/persone/{id}")
def aggiorna_persona(
    id: str,
    body: dict,
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_amministrativo),
):
    p = _get_persona_or_404(id, db)
    password = body.pop("password", None)
    for k, v in body.items():
        if hasattr(Persona, k) and k not in ("id", "password_hash"):
            setattr(p, k, v)
    if password:
        p.password_hash = hash_password(password)
    db.commit()
    db.refresh(p)
    return {"data": persona_dict(p)}


# ─── Costi Orari ─────────────────────────────────────────────────────────────

@router.get("/persone/{id}/costi-orari")
def lista_costi_orari(
    id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    _get_persona_or_404(id, db)
    costi = db.query(CostoOrarioPersona)\
        .filter(CostoOrarioPersona.persona_id == id)\
        .order_by(CostoOrarioPersona.data_inizio.desc())\
        .all()
    return {"data": [costo_dict(c) for c in costi]}


@router.post("/persone/{id}/costi-orari")
def inserisci_costo_orario(
    id: str,
    body: dict,
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_amministrativo),
):
    _get_persona_or_404(id, db)

    nuova_data_inizio = date.fromisoformat(body["data_inizio"])

    # Verifica che non ci siano periodi sovrapposti
    sovrapposto = db.query(CostoOrarioPersona).filter(
        CostoOrarioPersona.persona_id == id,
        CostoOrarioPersona.data_inizio >= nuova_data_inizio,
    ).first()

    if sovrapposto:
        raise HTTPException(
            status_code=422,
            detail={"error": {
                "code": "COSTO_ORARIO_SOVRAPPOSTO",
                "message": f"Esiste già un costo orario con data di inizio {sovrapposto.data_inizio} successiva o uguale a quella inserita. Inserire una data precedente.",
            }},
        )

    # Chiudi il record precedente ancora aperto
    precedente = db.query(CostoOrarioPersona).filter(
        CostoOrarioPersona.persona_id == id,
        CostoOrarioPersona.data_fine == None,
    ).first()

    if precedente:
        from datetime import timedelta
        precedente.data_fine = nuova_data_inizio - timedelta(days=1)

    nuovo = CostoOrarioPersona(
        persona_id=id,
        costo_orario=body["costo_orario"],
        data_inizio=nuova_data_inizio,
        motivazione=body.get("motivazione"),
        inserito_da=str(utente.id),
    )
    db.add(nuovo)
    db.commit()
    db.refresh(nuovo)
    return {"data": costo_dict(nuovo)}


# ─── Monte Ore ────────────────────────────────────────────────────────────────

@router.get("/persone/{id}/monte-ore")
def lista_monte_ore(
    id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    _get_persona_or_404(id, db)
    records = db.query(MonteOreAnnuale)\
        .filter(MonteOreAnnuale.persona_id == id)\
        .order_by(MonteOreAnnuale.anno.desc())\
        .all()
    return {"data": [monte_ore_dict(m) for m in records]}


@router.put("/persone/{id}/monte-ore/{anno}")
def upsert_monte_ore(
    id: str,
    anno: int,
    body: dict,
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_amministrativo),
):
    _get_persona_or_404(id, db)
    m = db.query(MonteOreAnnuale).filter(
        MonteOreAnnuale.persona_id == id,
        MonteOreAnnuale.anno == anno,
    ).first()

    if m:
        m.ore_disponibili = body["ore_disponibili"]
    else:
        m = MonteOreAnnuale(
            persona_id=id,
            anno=anno,
            ore_disponibili=body["ore_disponibili"],
            ore_allocate=0,
        )
        db.add(m)

    db.commit()
    db.refresh(m)
    return {"data": monte_ore_dict(m)}


# ─── Helper ───────────────────────────────────────────────────────────────────

def _get_persona_or_404(id: str, db: Session) -> Persona:
    p = db.query(Persona).filter(Persona.id == id).first()
    if not p:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Persona non trovata"}},
        )
    return p


@router.delete("/persone/{id}")
def elimina_persona(
    id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_amministrativo),
):
    from app.models.personale import Allocazione, CostoOrarioPersona, MonteOreAnnuale
    from app.models.timesheet import TimesheetTestata
    
    p = db.query(Persona).filter(Persona.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Persona non trovata"}})
    
    if str(p.id) == str(utente.id):
        raise HTTPException(status_code=409, detail={"error": {"code": "SELF_DELETE", "message": "Non puoi eliminare te stesso"}})

    # Controlla allocazioni attive
    from datetime import date
    allocazioni_attive = db.query(Allocazione).filter(
        Allocazione.persona_id == id,
        Allocazione.data_fine >= date.today()
    ).count()

    # Controlla timesheet non completati
    ts_pendenti = db.query(TimesheetTestata).filter(
        TimesheetTestata.persona_id == id,
        TimesheetTestata.stato.in_(["bozza", "inviato"])
    ).count()

    if allocazioni_attive > 0 or ts_pendenti > 0:
        raise HTTPException(status_code=409, detail={"error": {
            "code": "PERSONA_CON_ATTIVITA",
            "message": f"La persona ha {allocazioni_attive} allocazioni attive e {ts_pendenti} timesheet pendenti. Completa o rimuovi prima queste attività.",
            "detail": {"allocazioni_attive": allocazioni_attive, "ts_pendenti": ts_pendenti}
        }})

    # Elimina dati correlati
    from app.models.notifica import Notifica
    db.query(Notifica).filter(Notifica.persona_id == id).delete()
    db.query(CostoOrarioPersona).filter(CostoOrarioPersona.persona_id == id).delete()
    db.query(MonteOreAnnuale).filter(MonteOreAnnuale.persona_id == id).delete()
    db.query(Allocazione).filter(Allocazione.persona_id == id).delete()
    db.delete(p)
    db.commit()
    return {"data": {"deleted": True}}
