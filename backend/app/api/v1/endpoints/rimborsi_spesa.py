# backend/app/api/v1/endpoints/rimborsi_spesa.py
import os
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.deps import tutti_i_ruoli, solo_direttore_generale
from app.core.config import settings
from app.models.rimborso_spesa import RichiestaRimborsoSpesa, RimborsoSpesaRiga
from app.models.autorizzazione_spesa import RichiestaAutorizzazioneSpesa, Dipartimento
from app.models.personale import Allocazione
from app.models.budget import BudgetVoce, Spesa, Impegno
from app.models.persona import Persona
from app.services.notifiche import crea_notifica, invia_email

router = APIRouter()

STATI_VALIDI = {
    "bozza", "attesa_ammin", "attesa_rs", "attesa_dir_dip", "attesa_dg", "approvata", "rigettata"
}


# ── Serializzazione ───────────────────────────────────────────────────────────

def _riga_dict(riga: RimborsoSpesaRiga) -> dict:
    return {
        "id": str(riga.id),
        "descrizione": riga.descrizione,
        "data": riga.data.isoformat() if riga.data else None,
        "importo": float(riga.importo),
        "ha_documento": bool(riga.documento_path),
        "documento_nome": riga.documento_nome_originale or (os.path.basename(riga.documento_path) if riga.documento_path else None),
    }


def _rrs_dict(r: RichiestaRimborsoSpesa, db: Session) -> dict:
    ras = r.richiesta_autorizzazione
    amministrativo_id = _persona_ammin(ras, db)
    pi_id = _persona_pi(ras, db)
    direttore_dip_id = _persona_dir_dip(ras, db)

    totale_righe = float(sum(float(riga.importo) for riga in r.righe))
    warning_capienza = False
    delta_importo = 0.0
    if ras.impegno_id:
        impegno = db.query(Impegno).filter(Impegno.id == ras.impegno_id).first()
        if impegno:
            delta_importo = round(totale_righe - float(impegno.importo), 2)
            if delta_importo > 0:
                bv = db.query(BudgetVoce).filter(BudgetVoce.id == ras.budget_voce_id).first()
                if bv:
                    disponibile = _calcola_disponibile(bv, db)
                    warning_capienza = disponibile < delta_importo

    return {
        "id": str(r.id),
        "richiesta_autorizzazione_spesa_id": str(r.richiesta_autorizzazione_spesa_id),
        "amministrativo_id": str(amministrativo_id) if amministrativo_id else None,
        "pi_id": str(pi_id) if pi_id else None,
        "direttore_dipartimento_id": str(direttore_dip_id) if direttore_dip_id else None,
        "autorizzazione": {
            "tipo": ras.tipo,
            "oggetto": ras.oggetto,
            "importo": float(ras.importo),
            "progetto_id": str(ras.progetto_id) if ras.progetto_id else None,
            "progetto_titolo": ras.progetto.titolo if ras.progetto else None,
            "dipartimento_id": str(ras.dipartimento_id),
            "dipartimento_nome": ras.dipartimento.nome if ras.dipartimento else None,
            "impegno_id": str(ras.impegno_id) if ras.impegno_id else None,
        },
        "richiedente_id": str(r.richiedente_id),
        "richiedente_nome": f"{r.richiedente.cognome} {r.richiedente.nome}" if r.richiedente else None,
        "stato": r.stato,
        "note": r.note,
        "motivazione_rigetto": r.motivazione_rigetto,
        "righe": [_riga_dict(riga) for riga in r.righe],
        "totale_righe": round(totale_righe, 2),
        "warning_capienza": warning_capienza,
        "delta_importo": delta_importo,
        "spesa_id": str(r.spesa_id) if r.spesa_id else None,
        "ha_pdf": bool(r.pdf_path),
        "data_invio": r.data_invio.isoformat() if r.data_invio else None,
        "data_approvazione_rs": r.data_approvazione_rs.isoformat() if r.data_approvazione_rs else None,
        "data_approvazione_dir_dip": r.data_approvazione_dir_dip.isoformat() if r.data_approvazione_dir_dip else None,
        "data_approvazione_dg": r.data_approvazione_dg.isoformat() if r.data_approvazione_dg else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


def _get_or_404(id: str, db: Session) -> RichiestaRimborsoSpesa:
    r = db.query(RichiestaRimborsoSpesa).filter(RichiestaRimborsoSpesa.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Richiesta di rimborso non trovata"}})
    return r


def _get_riga_or_404(riga_id: str, db: Session) -> RimborsoSpesaRiga:
    riga = db.query(RimborsoSpesaRiga).filter(RimborsoSpesaRiga.id == riga_id).first()
    if not riga:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Riga di spesa non trovata"}})
    return riga


def _calcola_disponibile(bv: BudgetVoce, db: Session) -> float:
    speso = float(db.query(func.coalesce(func.sum(Spesa.importo), 0)).filter(
        Spesa.progetto_id == bv.progetto_id,
        Spesa.voce_id == bv.voce_id,
        Spesa.stato == "registrata",
    ).scalar())
    return float(bv.importo_previsto) - float(bv.importo_impegnato) - speso


# ── Helper risoluzione approvatori ───────────────────────────────────────────

def _persona_ammin(ras: RichiestaAutorizzazioneSpesa, db: Session):
    if ras.progetto_id:
        alloc = db.query(Allocazione).filter(
            Allocazione.progetto_id == ras.progetto_id, Allocazione.is_ammin == True).first()
        if alloc:
            return alloc.persona_id
        return None
    # Fondi individuali: nessun progetto, risolvi via ruolo + dipartimento
    p = db.query(Persona).filter(
        Persona.ruolo == "amministrativo",
        Persona.dipartimento_id == ras.dipartimento_id,
        Persona.attivo == True,
    ).first()
    if not p:
        p = db.query(Persona).filter(Persona.ruolo == "amministrativo", Persona.attivo == True).first()
    return p.id if p else None


def _persona_pi(ras: RichiestaAutorizzazioneSpesa, db: Session):
    if not ras.progetto_id:
        return None
    alloc = db.query(Allocazione).filter(
        Allocazione.progetto_id == ras.progetto_id, Allocazione.is_pi == True).first()
    return alloc.persona_id if alloc else None


def _persona_dir_dip(ras: RichiestaAutorizzazioneSpesa, db: Session):
    dip = db.query(Dipartimento).filter(Dipartimento.id == ras.dipartimento_id).first()
    return dip.direttore_id if dip else None


def _persona_dg(db: Session):
    dg = db.query(Persona).filter(Persona.ruolo == "direttore_generale", Persona.attivo == True).first()
    return dg.id if dg else None


def _notifica_step(db: Session, r: RichiestaRimborsoSpesa, persona_id, titolo: str, messaggio: str):
    link = f"/rimborsi-spesa/{r.id}"
    crea_notifica(db, persona_id, tipo="rimborso_spesa", titolo=titolo,
                  messaggio=messaggio, link=link, riferimento_id=str(r.id))
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if persona:
        invia_email(persona.email, titolo, messaggio)


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("/rimborsi-spesa")
def lista_rimborsi(
    stato: str = Query(None),
    solo_miei: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    import math
    q = db.query(RichiestaRimborsoSpesa)
    if stato:
        q = q.filter(RichiestaRimborsoSpesa.stato == stato)
    if solo_miei:
        q = q.filter(RichiestaRimborsoSpesa.richiedente_id == utente.id)
    total = q.count()
    items = q.order_by(RichiestaRimborsoSpesa.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "data": [_rrs_dict(r, db) for r in items],
        "meta": {"total": total, "page": page, "page_size": page_size,
                 "total_pages": math.ceil(total / page_size) if page_size else 1},
    }


@router.get("/rimborsi-spesa/autorizzazioni-disponibili")
def autorizzazioni_disponibili(
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    """Richieste di autorizzazione spesa approvate dell'utente, senza un rimborso attivo collegato."""
    q = db.query(RichiestaAutorizzazioneSpesa).filter(
        RichiestaAutorizzazioneSpesa.stato == "approvata",
    )
    if utente.ruolo not in ("amministrativo", "superadmin"):
        q = q.filter(RichiestaAutorizzazioneSpesa.richiedente_id == utente.id)
    ras_list = q.order_by(RichiestaAutorizzazioneSpesa.data_approvazione_dg.desc()).all()

    risultato = []
    for ras in ras_list:
        rimborso_attivo = db.query(RichiestaRimborsoSpesa).filter(
            RichiestaRimborsoSpesa.richiesta_autorizzazione_spesa_id == ras.id,
            RichiestaRimborsoSpesa.stato != "rigettata",
        ).first()
        if rimborso_attivo:
            continue
        risultato.append({
            "id": str(ras.id),
            "tipo": ras.tipo,
            "oggetto": ras.oggetto,
            "importo": float(ras.importo),
            "progetto_titolo": ras.progetto.titolo if ras.progetto else None,
            "data_approvazione_dg": ras.data_approvazione_dg.isoformat() if ras.data_approvazione_dg else None,
        })
    return {"data": risultato}


@router.get("/rimborsi-spesa/{id}")
def get_rimborso(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    return {"data": _rrs_dict(_get_or_404(id, db), db)}


@router.post("/rimborsi-spesa")
def crea_rimborso(
    body: dict,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    ras_id = body.get("richiesta_autorizzazione_spesa_id")
    if not ras_id:
        raise HTTPException(status_code=422, detail={"error": {"code": "CAMPO_MANCANTE", "message": "richiesta_autorizzazione_spesa_id obbligatorio"}})

    ras = db.query(RichiestaAutorizzazioneSpesa).filter(RichiestaAutorizzazioneSpesa.id == ras_id).first()
    if not ras:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Richiesta di autorizzazione spesa non trovata"}})

    if ras.stato != "approvata":
        raise HTTPException(status_code=409, detail={"error": {"code": "AUTORIZZAZIONE_NON_APPROVATA", "message": "È possibile richiedere il rimborso solo per autorizzazioni di spesa approvate"}})

    if str(ras.richiedente_id) != str(utente.id) and utente.ruolo not in ("amministrativo", "superadmin"):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Non puoi richiedere il rimborso per questa autorizzazione"}})

    esistente = db.query(RichiestaRimborsoSpesa).filter(
        RichiestaRimborsoSpesa.richiesta_autorizzazione_spesa_id == ras_id,
        RichiestaRimborsoSpesa.stato != "rigettata",
    ).first()
    if esistente:
        raise HTTPException(status_code=409, detail={"error": {"code": "RIMBORSO_GIA_ESISTENTE", "message": "Esiste già una richiesta di rimborso attiva per questa autorizzazione"}})

    r = RichiestaRimborsoSpesa(
        richiesta_autorizzazione_spesa_id=ras_id,
        richiedente_id=ras.richiedente_id,
        note=body.get("note"),
        stato="bozza",
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return {"data": _rrs_dict(r, db)}


@router.patch("/rimborsi-spesa/{id}")
def aggiorna_rimborso(
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

    if "note" in body:
        r.note = body["note"]

    db.commit()
    db.refresh(r)
    return {"data": _rrs_dict(r, db)}


@router.delete("/rimborsi-spesa/{id}")
def elimina_rimborso(
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


# ── Righe di spesa ────────────────────────────────────────────────────────────

@router.post("/rimborsi-spesa/{id}/righe")
def crea_riga(
    id: str,
    body: dict,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    r = _get_or_404(id, db)
    if r.stato != "bozza":
        raise HTTPException(status_code=409, detail={"error": {"code": "STATO_NON_MODIFICABILE", "message": "Le righe possono essere modificate solo in stato bozza"}})
    if str(r.richiedente_id) != str(utente.id) and utente.ruolo not in ("superadmin", "amministrativo"):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Non puoi modificare questa richiesta"}})

    riga = RimborsoSpesaRiga(
        richiesta_rimborso_spesa_id=r.id,
        descrizione=body["descrizione"],
        data=date.fromisoformat(body["data"]),
        importo=body["importo"],
    )
    db.add(riga)
    db.commit()
    db.refresh(r)
    return {"data": _rrs_dict(r, db)}


@router.put("/rimborsi-spesa/righe/{riga_id}")
def aggiorna_riga(
    riga_id: str,
    body: dict,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    riga = _get_riga_or_404(riga_id, db)
    r = riga.richiesta
    if r.stato != "bozza":
        raise HTTPException(status_code=409, detail={"error": {"code": "STATO_NON_MODIFICABILE", "message": "Le righe possono essere modificate solo in stato bozza"}})
    if str(r.richiedente_id) != str(utente.id) and utente.ruolo not in ("superadmin", "amministrativo"):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Non puoi modificare questa richiesta"}})

    if "descrizione" in body:
        riga.descrizione = body["descrizione"]
    if "data" in body:
        riga.data = date.fromisoformat(body["data"])
    if "importo" in body:
        riga.importo = body["importo"]

    db.commit()
    db.refresh(r)
    return {"data": _rrs_dict(r, db)}


@router.delete("/rimborsi-spesa/righe/{riga_id}")
def elimina_riga(
    riga_id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    riga = _get_riga_or_404(riga_id, db)
    r = riga.richiesta
    if r.stato != "bozza":
        raise HTTPException(status_code=409, detail={"error": {"code": "STATO_NON_MODIFICABILE", "message": "Le righe possono essere modificate solo in stato bozza"}})
    if str(r.richiedente_id) != str(utente.id) and utente.ruolo not in ("superadmin", "amministrativo"):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Non puoi modificare questa richiesta"}})

    db.delete(riga)
    db.commit()
    db.refresh(r)
    return {"data": _rrs_dict(r, db)}


@router.post("/rimborsi-spesa/righe/{riga_id}/documento")
async def upload_documento_riga(
    riga_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    riga = _get_riga_or_404(riga_id, db)
    r = riga.richiesta
    if r.stato != "bozza":
        raise HTTPException(status_code=409, detail={"error": {"code": "STATO_NON_MODIFICABILE", "message": "I documenti possono essere caricati solo in stato bozza"}})
    if str(r.richiedente_id) != str(utente.id) and utente.ruolo not in ("superadmin", "amministrativo"):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Non puoi modificare questa richiesta"}})

    from app.services.storage import progetto_dir, upload_filename
    _ras = r.richiesta_autorizzazione
    _codice = _ras.progetto.codice if (_ras and _ras.progetto) else None
    upload_dir = progetto_dir(_codice, "autorizzazioni-spesa", str(_ras.id if _ras else r.id), "rimborso", "giustificativi")
    os.makedirs(upload_dir, exist_ok=True)
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    path = os.path.join(upload_dir, upload_filename(file.filename or f"doc{ext}", riga_id))
    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)
    riga.documento_path = path
    riga.documento_nome_originale = file.filename
    db.commit()
    return {"data": {"documento_path": path}}


@router.get("/rimborsi-spesa/righe/{riga_id}/documento")
def scarica_documento_riga(riga_id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    riga = _get_riga_or_404(riga_id, db)
    if not riga.documento_path or not os.path.exists(riga.documento_path):
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Documento non trovato"}})
    nome = riga.documento_nome_originale or os.path.basename(riga.documento_path)
    return FileResponse(riga.documento_path, filename=nome)


@router.get("/rimborsi-spesa/{id}/pdf")
def scarica_pdf(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    r = _get_or_404(id, db)
    if not r.pdf_path or not os.path.exists(r.pdf_path):
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "PDF non ancora generato"}})
    return FileResponse(r.pdf_path, filename=os.path.basename(r.pdf_path))


# ── Workflow — transizioni ────────────────────────────────────────────────────

@router.post("/rimborsi-spesa/{id}/invia")
def invia(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    r = _get_or_404(id, db)
    if r.stato != "bozza":
        raise HTTPException(status_code=409, detail={"error": {"code": "TRANSIZIONE_NON_VALIDA", "message": "Solo le richieste in bozza possono essere inviate"}})
    if str(r.richiedente_id) != str(utente.id):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Solo il richiedente può inviare la richiesta"}})
    if not r.righe:
        raise HTTPException(status_code=422, detail={"error": {"code": "RIGHE_MANCANTI", "message": "Inserire almeno una riga di spesa da rimborsare"}})

    ras = r.richiesta_autorizzazione
    r.stato = "attesa_ammin"
    r.data_invio = datetime.now(timezone.utc)

    dest = _persona_ammin(ras, db)
    totale = sum(float(x.importo) for x in r.righe)
    if dest:
        _notifica_step(db, r, dest,
            titolo="Nuova richiesta di rimborso spesa",
            messaggio=f"{r.richiedente.cognome if r.richiedente else ''} ha richiesto il rimborso spesa per '{ras.oggetto}' — totale {totale:,.2f} €. In attesa della tua approvazione come Responsabile Amministrativo.")

    db.commit()
    db.refresh(r)
    return {"data": _rrs_dict(r, db)}


@router.post("/rimborsi-spesa/{id}/approva-ammin")
def approva_ammin(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    r = _get_or_404(id, db)
    if r.stato != "attesa_ammin":
        raise HTTPException(status_code=409, detail={"error": {"code": "TRANSIZIONE_NON_VALIDA", "message": f"La richiesta è in stato '{r.stato}', non attesa_ammin"}})

    ras = r.richiesta_autorizzazione
    ammin_id = _persona_ammin(ras, db)
    if str(ammin_id) != str(utente.id) and utente.ruolo != "superadmin":
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Solo il Responsabile Amministrativo può approvare in questo step"}})

    # Step successivo: salta il PI per i fondi individuali (non esiste)
    if ras.tipo == "progetto":
        r.stato = "attesa_rs"
        dest = _persona_pi(ras, db)
        step_label = "Responsabile Scientifico"
    else:
        r.stato = "attesa_dir_dip"
        dest = _persona_dir_dip(ras, db)
        step_label = "Direttore di Dipartimento"

    totale = sum(float(x.importo) for x in r.righe)
    if dest:
        _notifica_step(db, r, dest,
            titolo="Richiesta rimborso spesa — tua approvazione richiesta",
            messaggio=f"La richiesta di rimborso per '{ras.oggetto}' ({totale:,.2f} €) è stata controllata dall'Amministrativo e attende la tua approvazione come {step_label}.")

    db.commit()
    db.refresh(r)
    return {"data": _rrs_dict(r, db)}


@router.post("/rimborsi-spesa/{id}/approva-rs")
def approva_rs(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    r = _get_or_404(id, db)
    if r.stato != "attesa_rs":
        raise HTTPException(status_code=409, detail={"error": {"code": "TRANSIZIONE_NON_VALIDA", "message": f"La richiesta è in stato '{r.stato}', non attesa_rs"}})

    ras = r.richiesta_autorizzazione
    pi_id = _persona_pi(ras, db)
    if str(pi_id) != str(utente.id) and utente.ruolo != "superadmin":
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Solo il Responsabile Scientifico (PI) del progetto può approvare in questo step"}})

    r.stato = "attesa_dir_dip"
    r.data_approvazione_rs = datetime.now(timezone.utc)

    dest = _persona_dir_dip(ras, db)
    totale = sum(float(x.importo) for x in r.righe)
    if dest:
        _notifica_step(db, r, dest,
            titolo="Richiesta rimborso spesa — tua approvazione richiesta",
            messaggio=f"La richiesta di rimborso per '{ras.oggetto}' ({totale:,.2f} €) è stata approvata dal Responsabile Scientifico e attende la tua approvazione come Direttore di Dipartimento.")

    db.commit()
    db.refresh(r)
    return {"data": _rrs_dict(r, db)}


@router.post("/rimborsi-spesa/{id}/approva-dir-dip")
def approva_dir_dip(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    r = _get_or_404(id, db)
    if r.stato != "attesa_dir_dip":
        raise HTTPException(status_code=409, detail={"error": {"code": "TRANSIZIONE_NON_VALIDA", "message": f"La richiesta è in stato '{r.stato}', non attesa_dir_dip"}})

    ras = r.richiesta_autorizzazione
    dip = db.query(Dipartimento).filter(Dipartimento.id == ras.dipartimento_id).first()
    if dip and str(dip.direttore_id) != str(utente.id) and utente.ruolo != "superadmin":
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Solo il Direttore di Dipartimento può approvare in questo step"}})

    r.stato = "attesa_dg"
    r.data_approvazione_dir_dip = datetime.now(timezone.utc)

    dest = _persona_dg(db)
    totale = sum(float(x.importo) for x in r.righe)
    if dest:
        _notifica_step(db, r, dest,
            titolo="Richiesta rimborso spesa — tua approvazione richiesta",
            messaggio=f"La richiesta di rimborso per '{ras.oggetto}' ({totale:,.2f} €) è stata approvata dal Direttore di Dipartimento e attende la tua approvazione definitiva come Direttore Generale.")

    db.commit()
    db.refresh(r)
    return {"data": _rrs_dict(r, db)}


@router.post("/rimborsi-spesa/{id}/approva-dg")
def approva_dg(
    id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_direttore_generale),
):
    r = _get_or_404(id, db)
    if r.stato != "attesa_dg":
        raise HTTPException(status_code=409, detail={"error": {"code": "TRANSIZIONE_NON_VALIDA", "message": f"La richiesta è in stato '{r.stato}', non attesa_dg"}})

    ras = r.richiesta_autorizzazione
    totale_righe = sum(float(x.importo) for x in r.righe)

    # Aggiornamento budget: solo per le richieste di tipo 'progetto', dove è stato creato un impegno
    if ras.impegno_id:
        impegno = db.query(Impegno).filter(Impegno.id == ras.impegno_id).first()
        if impegno:
            bv = db.query(BudgetVoce).filter(BudgetVoce.id == ras.budget_voce_id).first()
            delta = totale_righe - float(impegno.importo)
            if delta > 0 and bv:
                disponibile = _calcola_disponibile(bv, db)
                if disponibile < delta:
                    raise HTTPException(status_code=422, detail={"error": {
                        "code": "CAPIENZA_INSUFFICIENTE",
                        "message": f"Capienza insufficiente sulla voce di budget per coprire il rimborso. Disponibile aggiuntivo: {disponibile:,.2f} € — Richiesto: {delta:,.2f} €",
                    }})

            if bv:
                bv.importo_impegnato = float(bv.importo_impegnato) - float(impegno.importo)
            impegno.importo = totale_righe  # "freeze" sull'importo effettivamente rendicontato

            spesa = Spesa(
                progetto_id=impegno.progetto_id,
                voce_id=impegno.voce_id,
                persona_id=r.richiedente_id,
                impegno_id=impegno.id,
                importo=totale_righe,
                data=date.today(),
                descrizione=f"Rimborso spesa — {ras.oggetto}",
                stato="registrata",
            )
            db.add(spesa)
            db.flush()
            r.spesa_id = spesa.id

    r.stato = "approvata"
    r.data_approvazione_dg = datetime.now(timezone.utc)

    _notifica_step(db, r, r.richiedente_id,
        titolo="Richiesta rimborso spesa APPROVATA",
        messaggio=f"La tua richiesta di rimborso per '{ras.oggetto}' ({totale_righe:,.2f} €) è stata approvata definitivamente dal Direttore Generale. Il PDF è disponibile nella sezione Rimborsi Spesa.")

    # Genera PDF
    try:
        from app.services.pdf_rimborso_spesa import genera_pdf_rimborso_spesa
        from app.services.storage import progetto_dir
        _codice_r = ras.progetto.codice if (ras and ras.progetto) else None
        output_dir = progetto_dir(_codice_r, "autorizzazioni", str(ras.id), "rimborso")
        pdf_path = genera_pdf_rimborso_spesa(r, db, output_dir)
        r.pdf_path = pdf_path
    except Exception:
        pass  # Il PDF è non bloccante — la richiesta è approvata comunque

    db.commit()
    db.refresh(r)
    return {"data": _rrs_dict(r, db)}


@router.post("/rimborsi-spesa/{id}/rigetta")
def rigetta(
    id: str,
    body: dict,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    r = _get_or_404(id, db)
    if r.stato in ("bozza", "approvata", "rigettata"):
        raise HTTPException(status_code=409, detail={"error": {"code": "TRANSIZIONE_NON_VALIDA", "message": "Impossibile rigettare in questo stato"}})

    ras = r.richiesta_autorizzazione
    if r.stato == "attesa_dg":
        if utente.ruolo != "direttore_generale":
            raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Solo il Direttore Generale può rigettare in questo step"}})
    elif utente.ruolo != "superadmin":
        if r.stato == "attesa_ammin":
            autorizzato = str(_persona_ammin(ras, db)) == str(utente.id)
        elif r.stato == "attesa_rs":
            autorizzato = str(_persona_pi(ras, db)) == str(utente.id)
        elif r.stato == "attesa_dir_dip":
            autorizzato = str(_persona_dir_dip(ras, db)) == str(utente.id)
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
        titolo="Richiesta rimborso spesa RIGETTATA",
        messaggio=f"La tua richiesta di rimborso per '{ras.oggetto}' è stata rigettata. Motivazione: {motivazione}. Puoi riaprirla, correggerla e reinviarla.")

    db.commit()
    db.refresh(r)
    return {"data": _rrs_dict(r, db)}


@router.post("/rimborsi-spesa/{id}/riapri")
def riapri(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    r = _get_or_404(id, db)
    if r.stato != "rigettata":
        raise HTTPException(status_code=409, detail={"error": {"code": "TRANSIZIONE_NON_VALIDA", "message": "Solo le richieste rigettate possono essere riaperte"}})
    if str(r.richiedente_id) != str(utente.id) and utente.ruolo != "superadmin":
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Solo il richiedente può riaprire la richiesta"}})

    r.stato = "bozza"
    r.motivazione_rigetto = None
    db.commit()
    db.refresh(r)
    return {"data": _rrs_dict(r, db)}
