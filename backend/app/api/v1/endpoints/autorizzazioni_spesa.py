# backend/app/api/v1/endpoints/autorizzazioni_spesa.py
import uuid as _uuid
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
import os

from app.core.database import get_db
from app.core.deps import tutti_i_ruoli, solo_amministrativo, solo_direttore_generale
from app.core.config import settings
from app.models.autorizzazione_spesa import RichiestaAutorizzazioneSpesa, Dipartimento
from app.models.progetto import Progetto
from app.models.personale import Allocazione
from app.services.notifiche import crea_notifica, invia_email
from app.models.budget import BudgetVoce, Spesa, VoceDiCosto, Impegno
from app.models.persona import Persona

router = APIRouter()


def _aut_spesa_folder(r) -> str:
    from app.services.storage import _safe
    cog = _safe(r.richiedente.cognome if r.richiedente else "richiedente")
    # data creazione: stabile dall'inizio, usata per allegati pre-approvazione
    data = r.created_at.strftime('%d%m%Y') if r.created_at else "00000000"
    return f"{cog}_{data}"

STATI_VALIDI = {
    "bozza", "attesa_ammin", "attesa_rs", "attesa_dir_dip", "attesa_dg", "approvata", "rigettata"
}


# ── Serializzazione ───────────────────────────────────────────────────────────

def _ras_dict(r: RichiestaAutorizzazioneSpesa, db: Session) -> dict:
    amministrativo_id = _persona_ammin(r, db)
    pi_id = _persona_pi(r, db)
    direttore_dip_id = _persona_dir_dip(r, db)
    return {
        "id": str(r.id),
        "amministrativo_id": str(amministrativo_id) if amministrativo_id else None,
        "pi_id": str(pi_id) if pi_id else None,
        "direttore_dipartimento_id": str(direttore_dip_id) if direttore_dip_id else None,
        "tipo": r.tipo,
        "progetto_id": str(r.progetto_id) if r.progetto_id else None,
        "progetto_titolo": r.progetto.titolo if r.progetto else None,
        "progetto_cup": r.progetto.cup if r.progetto else None,
        "dipartimento_id": str(r.dipartimento_id),
        "dipartimento_nome": r.dipartimento.nome if r.dipartimento else None,
        "richiedente_id": str(r.richiedente_id),
        "richiedente_nome": f"{r.richiedente.cognome} {r.richiedente.nome}" if r.richiedente else None,
        "qualita_richiedente": r.qualita_richiedente,
        "tipo_contratto": r.tipo_contratto,
        "qualita_progetto": r.qualita_progetto,
        "macrocategoria": r.macrocategoria,
        "voce_lettera": r.voce_lettera,
        "voce_altro": r.voce_altro,
        "oggetto": r.oggetto,
        "descrizione": r.descrizione,
        "importo": float(r.importo),
        "durata_da": r.durata_da.isoformat() if r.durata_da else None,
        "durata_a": r.durata_a.isoformat() if r.durata_a else None,
        "termini_pagamento": r.termini_pagamento,
        "anticipazione_spesa": r.anticipazione_spesa,
        "ha_allegato_g": bool(r.allegato_voce_g),
        "ha_allegato_preventivo": bool(r.allegato_preventivo),
        "budget_voce_id": str(r.budget_voce_id) if r.budget_voce_id else None,
        "stato": r.stato,
        "motivazione_rigetto": r.motivazione_rigetto,
        "impegno_id": str(r.impegno_id) if r.impegno_id else None,
        "ha_pdf": bool(r.pdf_path),
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


def _get_or_404(id: str, db: Session) -> RichiestaAutorizzazioneSpesa:
    r = db.query(RichiestaAutorizzazioneSpesa).filter(RichiestaAutorizzazioneSpesa.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Richiesta non trovata"}})
    return r


def _calcola_disponibile(bv: BudgetVoce, db: Session) -> float:
    speso = float(db.query(func.coalesce(func.sum(Spesa.importo), 0)).filter(
        Spesa.progetto_id == bv.progetto_id,
        Spesa.voce_id == bv.voce_id,
        Spesa.stato == "registrata",
    ).scalar())
    return float(bv.importo_erogato or 0) - float(bv.importo_impegnato) - speso


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("/autorizzazioni-spesa")
def lista_autorizzazioni(
    stato: str = Query(None),
    progetto_id: str = Query(None),
    solo_mie: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    import math
    q = db.query(RichiestaAutorizzazioneSpesa)
    if stato:
        q = q.filter(RichiestaAutorizzazioneSpesa.stato == stato)
    if progetto_id:
        q = q.filter(RichiestaAutorizzazioneSpesa.progetto_id == progetto_id)
    if solo_mie:
        q = q.filter(RichiestaAutorizzazioneSpesa.richiedente_id == utente.id)
    elif utente.ruolo not in ("superadmin", "direttore_generale"):
        alloc_ids = db.query(Allocazione.progetto_id).filter(Allocazione.persona_id == utente.id).subquery()
        q = q.filter(
            RichiestaAutorizzazioneSpesa.richiedente_id == utente.id,
            RichiestaAutorizzazioneSpesa.progetto_id.in_(alloc_ids),
        )
    total = q.count()
    items = q.order_by(RichiestaAutorizzazioneSpesa.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "data": [_ras_dict(r, db) for r in items],
        "meta": {"total": total, "page": page, "page_size": page_size,
                 "total_pages": math.ceil(total / page_size) if page_size else 1},
    }


@router.get("/autorizzazioni-spesa/{id}")
def get_autorizzazione(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    return {"data": _ras_dict(_get_or_404(id, db), db)}


@router.post("/autorizzazioni-spesa")
def crea_autorizzazione(
    body: dict,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    if utente.ruolo in ("superadmin", "monitor"):
        raise HTTPException(status_code=403, detail={"error": {"code": "NON_CONSENTITO", "message": "Il ruolo non può creare richieste di autorizzazione alla spesa"}})

    tipo = body.get("tipo", "progetto")
    progetto_id = body.get("progetto_id")
    dipartimento_id = body.get("dipartimento_id")

    # Validazioni progetto
    if tipo == "progetto":
        if not progetto_id:
            raise HTTPException(status_code=422, detail={"error": {"code": "CAMPO_MANCANTE", "message": "progetto_id obbligatorio per richieste di tipo progetto"}})
        p = db.query(Progetto).filter(Progetto.id == progetto_id).first()
        if not p:
            raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Progetto non trovato"}})
        # Controlla PI
        ha_pi = db.query(Allocazione).filter(Allocazione.progetto_id == progetto_id, Allocazione.is_pi == True).first()
        if not ha_pi:
            raise HTTPException(status_code=422, detail={"error": {"code": "PROGETTO_SENZA_PI", "message": "Il progetto non ha un Responsabile Scientifico (PI) allocato"}})
        # Controlla Ammin
        ha_ammin = db.query(Allocazione).filter(Allocazione.progetto_id == progetto_id, Allocazione.is_ammin == True).first()
        if not ha_ammin:
            raise HTTPException(status_code=422, detail={"error": {"code": "PROGETTO_SENZA_AMMIN", "message": "Il progetto non ha un Responsabile Amministrativo allocato"}})
        # Dipartimento dal progetto
        if not dipartimento_id and p.dipartimento_id:
            dipartimento_id = str(p.dipartimento_id)

    if not dipartimento_id:
        raise HTTPException(status_code=422, detail={"error": {"code": "CAMPO_MANCANTE", "message": "dipartimento_id obbligatorio"}})

    r = RichiestaAutorizzazioneSpesa(
        tipo=tipo,
        progetto_id=progetto_id,
        dipartimento_id=dipartimento_id,
        richiedente_id=utente.id,
        qualita_richiedente=body["qualita_richiedente"],
        tipo_contratto=body["tipo_contratto"],
        qualita_progetto=body.get("qualita_progetto"),
        macrocategoria=body["macrocategoria"],
        voce_lettera=body["voce_lettera"],
        voce_altro=body.get("voce_altro"),
        oggetto=body["oggetto"],
        descrizione=body["descrizione"],
        importo=body["importo"],
        durata_da=date.fromisoformat(body["durata_da"]) if body.get("durata_da") else None,
        durata_a=date.fromisoformat(body["durata_a"]) if body.get("durata_a") else None,
        termini_pagamento=body.get("termini_pagamento"),
        anticipazione_spesa=body.get("anticipazione_spesa", False),
        stato="bozza",
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return {"data": _ras_dict(r, db)}


@router.patch("/autorizzazioni-spesa/{id}")
def aggiorna_autorizzazione(
    id: str,
    body: dict,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    r = _get_or_404(id, db)
    if r.stato != "bozza":
        raise HTTPException(status_code=409, detail={"error": {"code": "STATO_NON_MODIFICABILE", "message": "La richiesta può essere modificata solo in stato bozza"}})
    if str(r.richiedente_id) != str(utente.id) and utente.ruolo not in ("superadmin", "amministrativo"):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Non puoi modificare questa richiesta"}})

    campi = ["qualita_richiedente", "tipo_contratto", "qualita_progetto", "macrocategoria",
             "voce_lettera", "voce_altro", "oggetto", "descrizione", "importo",
             "termini_pagamento", "anticipazione_spesa"]
    for k in campi:
        if k in body:
            setattr(r, k, body[k])
    if "durata_da" in body:
        r.durata_da = date.fromisoformat(body["durata_da"]) if body["durata_da"] else None
    if "durata_a" in body:
        r.durata_a = date.fromisoformat(body["durata_a"]) if body["durata_a"] else None

    db.commit()
    db.refresh(r)
    return {"data": _ras_dict(r, db)}


@router.delete("/autorizzazioni-spesa/{id}")
def elimina_autorizzazione(
    id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    r = _get_or_404(id, db)
    if r.stato != "bozza":
        raise HTTPException(status_code=409, detail={"error": {"code": "STATO_NON_ELIMINABILE", "message": "Solo le richieste in bozza possono essere eliminate"}})
    if str(r.richiedente_id) != str(utente.id) and utente.ruolo != "superadmin":
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Non puoi eliminare questa richiesta"}})
    db.delete(r)
    db.commit()
    return {"data": {"deleted": True}}


# ── Upload allegati ───────────────────────────────────────────────────────────

@router.post("/autorizzazioni-spesa/{id}/allegato-g")
async def upload_allegato_g(
    id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    r = _get_or_404(id, db)
    if r.stato != "bozza":
        raise HTTPException(status_code=409, detail={"error": {"code": "NON_MODIFICABILE", "message": "Allegato modificabile solo in stato bozza"}})
    from app.services.storage import progetto_dir, upload_filename
    _codice = r.progetto.codice if r.progetto else None
    upload_dir = progetto_dir(_codice, "autorizzazioni-spesa", _aut_spesa_folder(r), "allegati")
    os.makedirs(upload_dir, exist_ok=True)
    import uuid as _uuid_mod
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    path = os.path.join(upload_dir, upload_filename(file.filename or f"allegato_g{ext}", str(_uuid_mod.uuid4())))
    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)
    r.allegato_voce_g = path
    db.commit()
    return {"data": {"allegato_g": path}}


@router.post("/autorizzazioni-spesa/{id}/allegato-preventivo")
async def upload_allegato_preventivo(
    id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    r = _get_or_404(id, db)
    from app.services.storage import progetto_dir, upload_filename
    _codice = r.progetto.codice if r.progetto else None
    upload_dir = progetto_dir(_codice, "autorizzazioni-spesa", _aut_spesa_folder(r), "allegati")
    os.makedirs(upload_dir, exist_ok=True)
    import uuid as _uuid_mod
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    path = os.path.join(upload_dir, upload_filename(file.filename or f"preventivo{ext}", str(_uuid_mod.uuid4())))
    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)
    r.allegato_preventivo = path
    db.commit()
    return {"data": {"allegato_preventivo": path}}


@router.get("/autorizzazioni-spesa/{id}/pdf")
def scarica_pdf(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    r = _get_or_404(id, db)
    if not r.pdf_path or not os.path.exists(r.pdf_path):
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "PDF non ancora generato"}})
    return FileResponse(r.pdf_path, filename=os.path.basename(r.pdf_path))


# ── Helper notifiche ─────────────────────────────────────────────────────────

def _notifica_step(
    db: Session,
    r: RichiestaAutorizzazioneSpesa,
    persona_id,
    titolo: str,
    messaggio: str,
):
    """Crea notifica in-app e tenta invio email."""
    link = f"/autorizzazioni/{r.id}"
    crea_notifica(db, persona_id, tipo="autorizzazione_spesa", titolo=titolo,
                  messaggio=messaggio, link=link, riferimento_id=str(r.id))
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if persona:
        invia_email(persona.email, titolo, messaggio)


def _persona_ammin(r: RichiestaAutorizzazioneSpesa, db: Session):
    alloc = db.query(Allocazione).filter(
        Allocazione.progetto_id == r.progetto_id, Allocazione.is_ammin == True).first()
    return alloc.persona_id if alloc else None


def _persona_pi(r: RichiestaAutorizzazioneSpesa, db: Session):
    alloc = db.query(Allocazione).filter(
        Allocazione.progetto_id == r.progetto_id, Allocazione.is_pi == True).first()
    return alloc.persona_id if alloc else None


def _persona_dir_dip(r: RichiestaAutorizzazioneSpesa, db: Session):
    dip = db.query(Dipartimento).filter(Dipartimento.id == r.dipartimento_id).first()
    return dip.direttore_id if dip else None


def _persona_dg(db: Session):
    dg = db.query(Persona).filter(Persona.ruolo == "direttore_generale", Persona.attivo == True).first()
    return dg.id if dg else None


# ── Workflow — transizioni ────────────────────────────────────────────────────

@router.post("/autorizzazioni-spesa/{id}/invia")
def invia(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    r = _get_or_404(id, db)
    if r.stato != "bozza":
        raise HTTPException(status_code=409, detail={"error": {"code": "TRANSIZIONE_NON_VALIDA", "message": "Solo le richieste in bozza possono essere inviate"}})
    if str(r.richiedente_id) != str(utente.id):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Solo il richiedente può inviare la richiesta"}})
    # Voce g: allegato obbligatorio
    if r.voce_lettera == "g" and not r.allegato_voce_g:
        raise HTTPException(status_code=422, detail={"error": {"code": "ALLEGATO_MANCANTE", "message": "Per la voce g è obbligatorio allegare il Modulo Richiesta Incentivazione Personale Docente"}})
    # Stato successivo dipende dal tipo
    r.stato = "attesa_ammin" if r.tipo == "progetto" else "attesa_dir_dip"
    r.data_invio = datetime.now(timezone.utc)

    # Notifica al primo approvatore
    if r.tipo == "progetto":
        dest = _persona_ammin(r, db)
        step_label = "Responsabile Amministrativo"
    else:
        dest = _persona_dir_dip(r, db)
        step_label = "Direttore di Dipartimento"
    if dest:
        _notifica_step(db, r, dest,
            titolo="Nuova richiesta di autorizzazione spesa",
            messaggio=f"{r.richiedente.cognome if r.richiedente else ''} ha inviato una richiesta di autorizzazione spesa per '{r.oggetto}' — importo {float(r.importo):,.2f} €. In attesa della tua approvazione come {step_label}.")

    db.commit()
    db.refresh(r)
    return {"data": _ras_dict(r, db)}


@router.post("/autorizzazioni-spesa/{id}/approva-ammin")
def approva_ammin(
    id: str,
    body: dict,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    r = _get_or_404(id, db)
    if r.stato != "attesa_ammin":
        raise HTTPException(status_code=409, detail={"error": {"code": "TRANSIZIONE_NON_VALIDA", "message": f"La richiesta è in stato '{r.stato}', non attesa_ammin"}})

    # Verifica che l'utente sia il Responsabile Ammin del progetto
    alloc_ammin = db.query(Allocazione).filter(
        Allocazione.progetto_id == r.progetto_id,
        Allocazione.persona_id == utente.id,
        Allocazione.is_ammin == True,
    ).first()
    if not alloc_ammin and utente.ruolo != "superadmin":
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Solo il Responsabile Amministrativo del progetto può approvare in questo step"}})

    # Verifica voce di budget selezionata
    budget_voce_id = body.get("budget_voce_id")
    if not budget_voce_id:
        raise HTTPException(status_code=422, detail={"error": {"code": "CAMPO_MANCANTE", "message": "Selezionare la voce di budget da impegnare"}})

    bv = db.query(BudgetVoce).filter(
        BudgetVoce.id == budget_voce_id,
        BudgetVoce.progetto_id == r.progetto_id,
    ).first()
    if not bv:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Voce di budget non trovata per questo progetto"}})

    disponibile = _calcola_disponibile(bv, db)
    if disponibile < float(r.importo):
        raise HTTPException(status_code=422, detail={"error": {
            "code": "DISPONIBILITA_INSUFFICIENTE",
            "message": f"Disponibilità insufficiente sulla voce selezionata. Disponibile: {disponibile:,.2f} € — Richiesto: {float(r.importo):,.2f} €",
        }})

    r.budget_voce_id = budget_voce_id
    r.stato = "attesa_rs"

    dest = _persona_pi(r, db)
    if dest:
        _notifica_step(db, r, dest,
            titolo="Richiesta autorizzazione spesa — tua approvazione richiesta",
            messaggio=f"La richiesta '{r.oggetto}' ({float(r.importo):,.2f} €) è stata approvata dall'Amministrativo e attende la tua approvazione come Responsabile Scientifico.")

    db.commit()
    db.refresh(r)
    return {"data": _ras_dict(r, db)}


@router.post("/autorizzazioni-spesa/{id}/approva-rs")
def approva_rs(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    r = _get_or_404(id, db)
    if r.stato != "attesa_rs":
        raise HTTPException(status_code=409, detail={"error": {"code": "TRANSIZIONE_NON_VALIDA", "message": f"La richiesta è in stato '{r.stato}', non attesa_rs"}})

    alloc_pi = db.query(Allocazione).filter(
        Allocazione.progetto_id == r.progetto_id,
        Allocazione.persona_id == utente.id,
        Allocazione.is_pi == True,
    ).first()
    if not alloc_pi and utente.ruolo != "superadmin":
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Solo il Responsabile Scientifico (PI) del progetto può approvare in questo step"}})

    r.stato = "attesa_dir_dip"
    r.data_approvazione_rs = datetime.now(timezone.utc)

    dest = _persona_dir_dip(r, db)
    if dest:
        _notifica_step(db, r, dest,
            titolo="Richiesta autorizzazione spesa — tua approvazione richiesta",
            messaggio=f"La richiesta '{r.oggetto}' ({float(r.importo):,.2f} €) è stata approvata dal Responsabile Scientifico e attende la tua approvazione come Direttore di Dipartimento.")

    db.commit()
    db.refresh(r)
    return {"data": _ras_dict(r, db)}


@router.post("/autorizzazioni-spesa/{id}/approva-dir-dip")
def approva_dir_dip(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    r = _get_or_404(id, db)
    if r.stato != "attesa_dir_dip":
        raise HTTPException(status_code=409, detail={"error": {"code": "TRANSIZIONE_NON_VALIDA", "message": f"La richiesta è in stato '{r.stato}', non attesa_dir_dip"}})

    dip = db.query(Dipartimento).filter(Dipartimento.id == r.dipartimento_id).first()
    if dip and str(dip.direttore_id) != str(utente.id) and utente.ruolo != "superadmin":
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Solo il Direttore di Dipartimento può approvare in questo step"}})

    r.stato = "attesa_dg"
    r.data_approvazione_dir_dip = datetime.now(timezone.utc)

    dest = _persona_dg(db)
    if dest:
        _notifica_step(db, r, dest,
            titolo="Richiesta autorizzazione spesa — tua approvazione richiesta",
            messaggio=f"La richiesta '{r.oggetto}' ({float(r.importo):,.2f} €) è stata approvata dal Direttore di Dipartimento e attende la tua approvazione definitiva come Direttore Generale.")

    db.commit()
    db.refresh(r)
    return {"data": _ras_dict(r, db)}


@router.post("/autorizzazioni-spesa/{id}/approva-dg")
def approva_dg(
    id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_direttore_generale),
):
    r = _get_or_404(id, db)
    if r.stato != "attesa_dg":
        raise HTTPException(status_code=409, detail={"error": {"code": "TRANSIZIONE_NON_VALIDA", "message": f"La richiesta è in stato '{r.stato}', non attesa_dg"}})

    # Crea Impegno se il tipo è progetto
    if r.tipo == "progetto" and r.budget_voce_id:
        bv = db.query(BudgetVoce).filter(BudgetVoce.id == r.budget_voce_id).first()
        if bv:
            impegno = Impegno(
                progetto_id=r.progetto_id,
                voce_id=bv.voce_id,
                data=date.today(),
                descrizione=f"Autorizzazione spesa — {r.oggetto}",
                importo=r.importo,
                created_by=utente.id,
            )
            db.add(impegno)
            db.flush()
            bv.importo_impegnato = float(bv.importo_impegnato) + float(r.importo)
            r.impegno_id = impegno.id

    r.stato = "approvata"
    r.data_approvazione_dg = datetime.now(timezone.utc)

    # Notifica al richiedente
    _notifica_step(db, r, r.richiedente_id,
        titolo="Richiesta autorizzazione spesa APPROVATA",
        messaggio=f"La tua richiesta '{r.oggetto}' ({float(r.importo):,.2f} €) è stata approvata definitivamente dal Direttore Generale. Il PDF è disponibile nella sezione Autorizzazioni.")

    # Genera PDF
    try:
        from app.services.pdf_autorizzazione import genera_pdf_autorizzazione
        from app.services.storage import progetto_dir
        _codice = r.progetto.codice if r.progetto else None
        output_dir = progetto_dir(_codice, "autorizzazioni-spesa", _aut_spesa_folder(r))
        pdf_path = genera_pdf_autorizzazione(r, db, output_dir)
        r.pdf_path = pdf_path
    except Exception as e:
        pass  # Il PDF è non bloccante — la richiesta è approvata comunque

    db.commit()
    db.refresh(r)
    return {"data": _ras_dict(r, db)}


@router.post("/autorizzazioni-spesa/{id}/rigetta")
def rigetta(
    id: str,
    body: dict,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    r = _get_or_404(id, db)
    if r.stato in ("bozza", "approvata", "rigettata"):
        raise HTTPException(status_code=409, detail={"error": {"code": "TRANSIZIONE_NON_VALIDA", "message": "Impossibile rigettare in questo stato"}})

    if r.stato == "attesa_dg":
        # Lo step del Direttore Generale non ammette override del superadmin
        if utente.ruolo != "direttore_generale":
            raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Solo il Direttore Generale può rigettare in questo step"}})
    elif utente.ruolo != "superadmin":
        if r.stato == "attesa_ammin":
            autorizzato = str(_persona_ammin(r, db)) == str(utente.id)
        elif r.stato == "attesa_rs":
            autorizzato = str(_persona_pi(r, db)) == str(utente.id)
        elif r.stato == "attesa_dir_dip":
            autorizzato = str(_persona_dir_dip(r, db)) == str(utente.id)
        else:
            autorizzato = False
        if not autorizzato:
            raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Non sei l'approvatore di questo step e non puoi rigettare la richiesta"}})

    motivazione = body.get("motivazione", "").strip()
    if not motivazione:
        raise HTTPException(status_code=422, detail={"error": {"code": "MOTIVAZIONE_MANCANTE", "message": "La motivazione del rigetto è obbligatoria"}})

    r.stato = "rigettata"
    r.motivazione_rigetto = motivazione

    _notifica_step(db, r, r.richiedente_id,
        titolo="Richiesta autorizzazione spesa RIGETTATA",
        messaggio=f"La tua richiesta '{r.oggetto}' ({float(r.importo):,.2f} €) è stata rigettata. Motivazione: {motivazione}. Puoi riaprirla, correggerla e reinviarla.")

    db.commit()
    db.refresh(r)
    return {"data": _ras_dict(r, db)}


@router.post("/autorizzazioni-spesa/{id}/riapri")
def riapri(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    r = _get_or_404(id, db)
    if r.stato != "rigettata":
        raise HTTPException(status_code=409, detail={"error": {"code": "TRANSIZIONE_NON_VALIDA", "message": "Solo le richieste rigettate possono essere riaperte"}})
    if str(r.richiedente_id) != str(utente.id) and utente.ruolo != "superadmin":
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Solo il richiedente può riaprire la richiesta"}})

    r.stato = "bozza"
    r.motivazione_rigetto = None
    r.budget_voce_id = None  # L'admin dovrà riselezionare
    db.commit()
    db.refresh(r)
    return {"data": _ras_dict(r, db)}


# ── Endpoint di supporto ──────────────────────────────────────────────────────

@router.get("/autorizzazioni-spesa/{id}/budget-voci-disponibili")
def budget_voci_disponibili(
    id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    """Restituisce le BudgetVoci del progetto con la disponibilità calcolata."""
    r = _get_or_404(id, db)
    if not r.progetto_id:
        return {"data": []}

    voci = db.query(BudgetVoce).filter(BudgetVoce.progetto_id == r.progetto_id).all()
    result = []
    for bv in voci:
        disponibile = _calcola_disponibile(bv, db)
        result.append({
            "id": str(bv.id),
            "voce_id": str(bv.voce_id),
            "codice": bv.voce.codice if bv.voce else None,
            "descrizione": bv.voce.descrizione if bv.voce else None,
            "importo_previsto": float(bv.importo_previsto),
            "importo_impegnato": float(bv.importo_impegnato),
            "disponibile": round(disponibile, 2),
            "importo_richiesto": float(r.importo),
            "sufficiente": disponibile >= float(r.importo),
        })
    return {"data": sorted(result, key=lambda x: -x["disponibile"])}
