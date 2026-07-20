# backend/app/api/v1/endpoints/missioni.py
import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import tutti_i_ruoli
from app.core.config import settings
from app.models.missione import (
    Missione, RimborsoMissione, RigaRimborsoMissione,
    StepApprovazioneMissione, AllegatoMissione, QualificaMissione,
)
from app.models.progetto import Progetto
from app.models.personale import Allocazione
from app.models.persona import Persona
from app.models.budget import BudgetVoce, VoceDiCosto, Impegno, Spesa
from app.models.autorizzazione_spesa import Dipartimento
from app.services.notifiche import crea_notifica, invia_email, segna_lette_per_link

router = APIRouter()

STATI_MISSIONE = {"bozza", "attesa_ammin", "attesa_pi", "attesa_dir_dip", "attesa_dg", "approvata", "rigettata"}
STATI_RIMBORSO = {"bozza", "attesa_ammin", "attesa_pi", "attesa_dir_dip", "attesa_dg", "approvata", "rigettata"}


# ── Helpers storage ───────────────────────────────────────────────────────────

def _missione_folder(m) -> str:
    from app.services.storage import _safe
    from datetime import date
    cog = _safe(m.richiedente.cognome if m.richiedente else "richiedente")
    data = m.approvata_il.strftime('%d%m%Y') if m.approvata_il else date.today().strftime('%d%m%Y')
    return f"{cog}_{data}"


# ── Helpers approvers ─────────────────────────────────────────────────────────

def _pi(progetto_id, db: Session) -> Persona | None:
    alloc = db.query(Allocazione).filter(
        Allocazione.progetto_id == progetto_id, Allocazione.is_pi == True).first()
    return alloc.persona if alloc else None


def _ammin(progetto_id, db: Session) -> Persona | None:
    prog = db.query(Progetto).filter(Progetto.id == progetto_id).first()
    if prog and prog.amministrativo_id:
        return db.query(Persona).filter(Persona.id == prog.amministrativo_id).first()
    return None


def _dir_dip(progetto_id, db: Session) -> Persona | None:
    prog = db.query(Progetto).filter(Progetto.id == progetto_id).first()
    if prog and prog.dipartimento_id:
        dip = db.query(Dipartimento).filter(Dipartimento.id == prog.dipartimento_id).first()
        if dip and dip.direttore_id:
            return db.query(Persona).filter(Persona.id == dip.direttore_id).first()
    return None


def _dg(db: Session) -> Persona | None:
    return db.query(Persona).filter(Persona.ruolo == "direttore_generale", Persona.attivo == True).first()


def _nome(persona: Persona | None) -> str:
    return f"{persona.cognome} {persona.nome}" if persona else "—"


# ── Helpers serializzazione ───────────────────────────────────────────────────

def _step_dict(s: StepApprovazioneMissione) -> dict:
    return {
        "id": str(s.id),
        "ruolo": s.ruolo,
        "decisione": s.decisione,
        "approvatore_nome": _nome(s.approvatore),
        "luogo_firma": s.luogo_firma,
        "note": s.note,
        "ciclo": s.ciclo,
        "decided_at": s.decided_at.isoformat() if s.decided_at else None,
    }


def _allegato_dict(a: AllegatoMissione) -> dict:
    return {
        "id": str(a.id),
        "tipo": a.tipo,
        "file_nome_originale": a.file_nome_originale,
        "caricato_da_nome": _nome(a.caricato_da_persona),
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


def _riga_dict(r: RigaRimborsoMissione) -> dict:
    return {
        "id": str(r.id),
        "data_inizio": r.data_inizio.isoformat() if r.data_inizio else None,
        "data_fine": r.data_fine.isoformat() if r.data_fine else None,
        "attivita": r.attivita,
        "importo": float(r.importo) if r.importo else None,
        "ha_documento": bool(r.documento_path),
        "documento_nome": r.documento_nome_originale or (
            os.path.basename(r.documento_path) if r.documento_path else None),
    }


def _rimborso_dict(r: RimborsoMissione, db: Session = None) -> dict:
    totale = sum(float(riga.importo or 0) for riga in r.righe)
    missione = r.missione
    progetto_id = missione.progetto_id if missione else None
    pi = _pi(progetto_id, db) if db and progetto_id else None
    ammin = _ammin(progetto_id, db) if db and progetto_id else None
    dir_dip = _dir_dip(progetto_id, db) if db and progetto_id else None

    # Campi copertura economica
    importo_stimato = float(missione.importo_stimato or 0) if missione else 0.0
    voce_categoria = missione.voce_impegno or "missioni" if missione else "missioni"
    voce_descrizione = None
    disponibilita_voce = None
    if db and progetto_id:
        bv = (
            db.query(BudgetVoce)
            .join(VoceDiCosto, BudgetVoce.voce_id == VoceDiCosto.id)
            .filter(
                BudgetVoce.progetto_id == progetto_id,
                VoceDiCosto.categoria == voce_categoria,
            )
            .first()
        )
        if bv:
            voce_descrizione = bv.voce.descrizione if bv.voce else voce_categoria
            from sqlalchemy import func as _func
            _speso = float(db.query(_func.coalesce(_func.sum(Spesa.importo), 0)).filter(
                Spesa.progetto_id == bv.progetto_id,
                Spesa.voce_id == bv.voce_id,
                Spesa.stato == "registrata",
            ).scalar())
            disponibilita_voce = round(
                float(bv.importo_erogato or 0)
                - float(bv.importo_impegnato or 0)
                - _speso,
                2,
            )

    return {
        "id": str(r.id),
        "missione_id": str(r.missione_id),
        "progetto_id": str(progetto_id) if progetto_id else None,
        "missione_titolo": missione.titolo if missione else None,
        "richiedente_id": str(r.richiedente_id),
        "richiedente_nome": _nome(r.richiedente),
        "pi_id": str(pi.id) if pi else None,
        "ammin_id": str(ammin.id) if ammin else None,
        "dir_dip_id": str(dir_dip.id) if dir_dip else None,
        "importo_stimato_missione": importo_stimato,
        "voce_impegno_missione": voce_categoria,
        "voce_descrizione": voce_descrizione,
        "disponibilita_voce": disponibilita_voce,
        "stato": r.stato,
        "note": r.note,
        "ciclo": r.ciclo,
        "ha_scheda_finanziaria": bool(r.scheda_finanziaria_path),
        "ha_pdf": bool(r.pdf_path),
        "totale": round(totale, 2),
        "righe": [_riga_dict(riga) for riga in r.righe],
        "step_approvazione": [_step_dict(s) for s in r.step_approvazione],
        "allegati": [_allegato_dict(a) for a in r.allegati],
        "inviata_il": r.inviata_il.isoformat() if r.inviata_il else None,
        "approvata_il": r.approvata_il.isoformat() if r.approvata_il else None,
        "respinta_il": r.respinta_il.isoformat() if r.respinta_il else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


def _missione_dict(m: Missione, db: Session) -> dict:
    pi = _pi(m.progetto_id, db)
    ammin = _ammin(m.progetto_id, db)
    dir_dip = _dir_dip(m.progetto_id, db)
    dg = _dg(db)
    return {
        "id": str(m.id),
        "titolo": m.titolo,
        "destinazione": m.destinazione,
        "motivo": m.motivo,
        "data_inizio": m.data_inizio.isoformat() if m.data_inizio else None,
        "data_fine": m.data_fine.isoformat() if m.data_fine else None,
        "ora_inizio": m.ora_inizio.isoformat() if m.ora_inizio else None,
        "ora_fine": m.ora_fine.isoformat() if m.ora_fine else None,
        "stato": m.stato,
        "progetto_id": str(m.progetto_id),
        "progetto_titolo": m.progetto.titolo if m.progetto else None,
        "progetto_codice": m.progetto.codice if m.progetto else None,
        "richiedente_id": str(m.richiedente_id),
        "richiedente_nome": _nome(m.richiedente),
        "gruppo_missione": m.gruppo_missione,
        "copertura_tipo": m.copertura_tipo,
        "copertura_descrizione": m.copertura_descrizione,
        "mezzo_tipo": m.mezzo_tipo,
        "mezzo_descrizione": m.mezzo_descrizione,
        "auto_alimentazione": m.auto_alimentazione,
        "auto_cilindrata": m.auto_cilindrata,
        "motivazione_mezzo_straordinario": m.motivazione_mezzo_straordinario,
        "importo_stimato": float(m.importo_stimato) if m.importo_stimato else None,
        "voce_impegno": m.voce_impegno,
        "impegno_gestionale_id": str(m.impegno_gestionale_id) if m.impegno_gestionale_id else None,
        "luogo_approvazione": m.luogo_approvazione,
        "note_approvazione": m.note_approvazione,
        "ha_pdf": bool(m.pdf_path),
        "pi_id": str(pi.id) if pi else None,
        "pi_nome": _nome(pi),
        "ammin_id": str(ammin.id) if ammin else None,
        "dir_dip_id": str(dir_dip.id) if dir_dip else None,
        "dg_id": str(dg.id) if dg else None,
        "step_approvazione": [_step_dict(s) for s in m.step_approvazione],
        "allegati": [_allegato_dict(a) for a in m.allegati],
        "rimborso": _rimborso_dict(m.rimborso, db) if m.rimborso else None,
        "inviata_il": m.inviata_il.isoformat() if m.inviata_il else None,
        "approvata_il": m.approvata_il.isoformat() if m.approvata_il else None,
        "respinta_il": m.respinta_il.isoformat() if m.respinta_il else None,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "updated_at": m.updated_at.isoformat() if m.updated_at else None,
    }


# ── Helpers get-or-404 ────────────────────────────────────────────────────────

def _get_missione(id: str, db: Session) -> Missione:
    m = db.query(Missione).filter(Missione.id == id).first()
    if not m:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Missione non trovata"}})
    return m


def _get_rimborso(id: str, db: Session) -> RimborsoMissione:
    r = db.query(RimborsoMissione).filter(RimborsoMissione.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Rimborso non trovato"}})
    return r


def _get_riga(riga_id: str, db: Session) -> RigaRimborsoMissione:
    r = db.query(RigaRimborsoMissione).filter(RigaRimborsoMissione.id == riga_id).first()
    if not r:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Riga non trovata"}})
    return r


def _notifica(db: Session, persona: Persona | None, titolo: str, messaggio: str, link: str, richiede_azione: bool = False):
    if not persona:
        return
    crea_notifica(db, persona.id, tipo="missione", titolo=titolo, messaggio=messaggio, link=link, richiede_azione=richiede_azione)
    invia_email(persona.email, titolo, messaggio)


# ── Helper impegno ────────────────────────────────────────────────────────────

def _crea_impegno_missione(missione: Missione, db: Session):
    """Crea un impegno sulla voce missioni/overhead del progetto."""
    bv = (
        db.query(BudgetVoce)
        .join(VoceDiCosto, BudgetVoce.voce_id == VoceDiCosto.id)
        .filter(
            BudgetVoce.progetto_id == missione.progetto_id,
            VoceDiCosto.categoria == (missione.voce_impegno or "missioni"),
        )
        .first()
    )
    if not bv:
        return None  # nessuna voce configurata — impegno non bloccante

    importo = float(missione.importo_stimato or 0)
    if importo <= 0:
        return None

    impegno = Impegno(
        progetto_id=missione.progetto_id,
        voce_id=bv.voce_id,
        data=missione.data_inizio or datetime.now(timezone.utc).date(),
        descrizione=f"Missione — {missione.titolo} ({missione.destinazione})",
        importo=importo,
        created_by=missione.richiedente_id,
    )
    db.add(impegno)
    bv.importo_impegnato = float(bv.importo_impegnato or 0) + importo
    db.flush()
    return impegno


def _finalizza_rimborso_budget(rimborso: RimborsoMissione, db: Session):
    """All'approvazione DG: crea spesa, aggiorna/chiude l'impegno."""
    missione = rimborso.missione
    if not missione.impegno_gestionale_id:
        return

    impegno = db.query(Impegno).filter(Impegno.id == missione.impegno_gestionale_id).first()
    if not impegno:
        return

    totale = sum(float(r.importo or 0) for r in rimborso.righe)
    bv = db.query(BudgetVoce).filter(
        BudgetVoce.progetto_id == impegno.progetto_id,
        BudgetVoce.voce_id == impegno.voce_id,
    ).first()

    if bv:
        bv.importo_impegnato = max(0, float(bv.importo_impegnato or 0) - float(impegno.importo))

    impegno.importo = totale

    spesa = Spesa(
        progetto_id=impegno.progetto_id,
        voce_id=impegno.voce_id,
        persona_id=rimborso.richiedente_id,
        impegno_id=impegno.id,
        importo=totale,
        data=datetime.now(timezone.utc).date(),
        descrizione=f"Rimborso missione — {missione.titolo}",
        stato="registrata",
    )
    db.add(spesa)
    db.flush()


# ════════════════════════════════════════════════════════════════════════════════
# QUALIFICHE MISSIONE
# ════════════════════════════════════════════════════════════════════════════════

@router.get("/qualifiche-missione")
def lista_qualifiche(solo_attive: bool = Query(True), db: Session = Depends(get_db),
                     utente: Persona = Depends(tutti_i_ruoli)):
    q = db.query(QualificaMissione)
    if solo_attive:
        q = q.filter(QualificaMissione.attiva == True)
    items = q.order_by(QualificaMissione.gruppo, QualificaMissione.codice).all()
    return {"data": [{"id": str(i.id), "gruppo": i.gruppo, "codice": i.codice,
                      "nome": i.nome, "attiva": i.attiva} for i in items]}


@router.post("/qualifiche-missione")
def crea_qualifica(body: dict, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    if utente.ruolo not in ("superadmin", "amministrativo"):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Accesso negato"}})
    q = QualificaMissione(gruppo=body["gruppo"], codice=body["codice"], nome=body["nome"])
    db.add(q)
    db.commit()
    db.refresh(q)
    return {"data": {"id": str(q.id), "gruppo": q.gruppo, "codice": q.codice, "nome": q.nome}}


@router.put("/qualifiche-missione/{id}")
def aggiorna_qualifica(id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    if utente.ruolo not in ("superadmin", "amministrativo"):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Accesso negato"}})
    q = db.query(QualificaMissione).filter(QualificaMissione.id == id).first()
    if not q:
        raise HTTPException(status_code=404)
    for campo in ("gruppo", "codice", "nome", "attiva"):
        if campo in body:
            setattr(q, campo, body[campo])
    db.commit()
    return {"data": {"id": str(q.id), "gruppo": q.gruppo, "codice": q.codice, "nome": q.nome, "attiva": q.attiva}}


@router.delete("/qualifiche-missione/{id}")
def elimina_qualifica(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    if utente.ruolo not in ("superadmin",):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Accesso negato"}})
    q = db.query(QualificaMissione).filter(QualificaMissione.id == id).first()
    if not q:
        raise HTTPException(status_code=404)
    db.delete(q)
    db.commit()
    return {"data": {"deleted": True}}


# ════════════════════════════════════════════════════════════════════════════════
# FIRMA OLOGRAFA
# ════════════════════════════════════════════════════════════════════════════════

@router.post("/personale/{persona_id}/firma-olografa")
async def upload_firma_olografa(
    persona_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    if str(utente.id) != persona_id and utente.ruolo != "superadmin":
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Puoi caricare solo la tua firma"}})
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404)
    upload_dir = os.path.join(settings.UPLOAD_DIR, "firme")
    os.makedirs(upload_dir, exist_ok=True)
    ext = os.path.splitext(file.filename)[1] if file.filename else ".png"
    path = os.path.join(upload_dir, f"{persona_id}{ext}")
    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)
    persona.firma_olografa = path
    db.commit()
    return {"data": {"firma_olografa": path}}


@router.get("/personale/{persona_id}/firma-olografa")
def scarica_firma_olografa(persona_id: str, db: Session = Depends(get_db),
                            utente: Persona = Depends(tutti_i_ruoli)):
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona or not persona.firma_olografa or not os.path.exists(persona.firma_olografa):
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Firma non trovata"}})
    return FileResponse(persona.firma_olografa)


# ════════════════════════════════════════════════════════════════════════════════
# MISSIONI — CRUD
# ════════════════════════════════════════════════════════════════════════════════

@router.get("/missioni")
def lista_missioni(
    stato: str = Query(None),
    progetto_id: str = Query(None),
    solo_mie: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    import math
    q = db.query(Missione)
    if stato:
        q = q.filter(Missione.stato == stato)
    if progetto_id:
        q = q.filter(Missione.progetto_id == progetto_id)
    if solo_mie:
        q = q.filter(Missione.richiedente_id == utente.id)
    elif utente.ruolo not in ("superadmin", "direttore_generale"):
        alloc_ids = db.query(Allocazione.progetto_id).filter(Allocazione.persona_id == utente.id).subquery()
        ammin_proj_ids = db.query(Progetto.id).filter(Progetto.amministrativo_id == utente.id).subquery()
        q = q.filter(
            or_(
                Missione.richiedente_id == utente.id,
                Missione.progetto_id.in_(alloc_ids),
                Missione.progetto_id.in_(ammin_proj_ids),
            )
        )
    total = q.count()
    items = q.order_by(Missione.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "data": [_missione_dict(m, db) for m in items],
        "meta": {"total": total, "page": page, "page_size": page_size,
                 "total_pages": math.ceil(total / page_size) if page_size else 1},
    }


@router.get("/missioni/{id}")
def get_missione(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    return {"data": _missione_dict(_get_missione(id, db), db)}


@router.post("/missioni")
def crea_missione(body: dict, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    if utente.ruolo == "superadmin":
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Il superadmin non può creare missioni"}})
    for campo in ("titolo", "destinazione", "motivo", "progetto_id", "copertura_tipo", "mezzo_tipo"):
        if not body.get(campo):
            raise HTTPException(status_code=422, detail={"error": {"code": "CAMPO_MANCANTE", "message": f"{campo} obbligatorio"}})
    from datetime import date, time
    def _parse_time(v):
        if not v:
            return None
        try:
            parts = str(v).split(":")
            return time(int(parts[0]), int(parts[1]))
        except Exception:
            return None
    m = Missione(
        titolo=body["titolo"],
        destinazione=body["destinazione"],
        motivo=body["motivo"],
        data_inizio=date.fromisoformat(body["data_inizio"]) if body.get("data_inizio") else None,
        data_fine=date.fromisoformat(body["data_fine"]) if body.get("data_fine") else None,
        ora_inizio=_parse_time(body.get("ora_inizio")),
        ora_fine=_parse_time(body.get("ora_fine")),
        progetto_id=body["progetto_id"],
        richiedente_id=str(utente.id),
        gruppo_missione=utente.gruppo_missione,
        copertura_tipo=body["copertura_tipo"],
        copertura_descrizione=body.get("copertura_descrizione"),
        mezzo_tipo=body["mezzo_tipo"],
        mezzo_descrizione=body.get("mezzo_descrizione"),
        auto_alimentazione=body.get("auto_alimentazione"),
        auto_cilindrata=body.get("auto_cilindrata"),
        motivazione_mezzo_straordinario=body.get("motivazione_mezzo_straordinario"),
        importo_stimato=body.get("importo_stimato"),
        voce_impegno=body.get("voce_impegno", "missioni"),
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return {"data": _missione_dict(m, db)}


@router.patch("/missioni/{id}")
def aggiorna_missione(id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    m = _get_missione(id, db)
    if m.stato != "bozza":
        raise HTTPException(status_code=409, detail={"error": {"code": "STATO_NON_MODIFICABILE", "message": "La missione può essere modificata solo in stato bozza"}})
    if str(m.richiedente_id) != str(utente.id) and utente.ruolo not in ("superadmin", "amministrativo"):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Non puoi modificare questa missione"}})
    from datetime import date, time as _time
    def _pt(v):
        if not v:
            return None
        try:
            parts = str(v).split(":")
            return _time(int(parts[0]), int(parts[1]))
        except Exception:
            return None
    campi = ("titolo", "destinazione", "motivo", "copertura_tipo", "copertura_descrizione",
             "mezzo_tipo", "mezzo_descrizione", "auto_alimentazione", "auto_cilindrata",
             "motivazione_mezzo_straordinario", "importo_stimato", "voce_impegno")
    for campo in campi:
        if campo in body:
            setattr(m, campo, body[campo])
    if "data_inizio" in body:
        m.data_inizio = date.fromisoformat(body["data_inizio"]) if body["data_inizio"] else None
    if "data_fine" in body:
        m.data_fine = date.fromisoformat(body["data_fine"]) if body["data_fine"] else None
    if "ora_inizio" in body:
        m.ora_inizio = _pt(body["ora_inizio"])
    if "ora_fine" in body:
        m.ora_fine = _pt(body["ora_fine"])
    db.commit()
    db.refresh(m)
    return {"data": _missione_dict(m, db)}


@router.delete("/missioni/{id}")
def elimina_missione(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    m = _get_missione(id, db)
    if m.stato != "bozza":
        raise HTTPException(status_code=409, detail={"error": {"code": "STATO_NON_ELIMINABILE", "message": "Solo le missioni in bozza possono essere eliminate"}})
    if str(m.richiedente_id) != str(utente.id) and utente.ruolo != "superadmin":
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Non puoi eliminare questa missione"}})
    db.delete(m)
    db.commit()
    return {"data": {"deleted": True}}


# ── Allegati missione ─────────────────────────────────────────────────────────

@router.post("/missioni/{id}/allegati")
async def upload_allegato_missione(
    id: str,
    tipo: str = Query("richiesta"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    m = _get_missione(id, db)
    from app.services.storage import progetto_dir, upload_filename
    _codice_m = m.progetto.codice if m.progetto else None
    upload_dir = progetto_dir(_codice_m, "missioni", str(m.id), "allegati")
    os.makedirs(upload_dir, exist_ok=True)
    import uuid
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    path = os.path.join(upload_dir, upload_filename(file.filename or f"allegato{ext}", str(uuid.uuid4())))
    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)
    allegato = AllegatoMissione(
        tipo=tipo, file_path=path, file_nome_originale=file.filename,
        missione_id=m.id, caricato_da=utente.id,
    )
    db.add(allegato)
    db.commit()
    db.refresh(m)
    return {"data": _missione_dict(m, db)}


@router.get("/missioni/allegati/{allegato_id}")
def scarica_allegato_missione(allegato_id: str, db: Session = Depends(get_db),
                               utente: Persona = Depends(tutti_i_ruoli)):
    a = db.query(AllegatoMissione).filter(AllegatoMissione.id == allegato_id).first()
    if not a or not os.path.exists(a.file_path):
        raise HTTPException(status_code=404)
    return FileResponse(a.file_path, filename=a.file_nome_originale or os.path.basename(a.file_path))


@router.delete("/missioni/allegati/{allegato_id}")
def elimina_allegato_missione(allegato_id: str, db: Session = Depends(get_db),
                               utente: Persona = Depends(tutti_i_ruoli)):
    a = db.query(AllegatoMissione).filter(AllegatoMissione.id == allegato_id).first()
    if not a:
        raise HTTPException(status_code=404)
    if str(a.caricato_da) != str(utente.id) and utente.ruolo != "superadmin":
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Accesso negato"}})
    if os.path.exists(a.file_path):
        os.remove(a.file_path)
    db.delete(a)
    db.commit()
    return {"data": {"deleted": True}}


# ── PDF missione ──────────────────────────────────────────────────────────────

@router.get("/missioni/{id}/pdf")
def scarica_pdf_missione(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    m = _get_missione(id, db)
    if not m.pdf_path or not os.path.exists(m.pdf_path):
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "PDF non ancora generato"}})
    return FileResponse(m.pdf_path, filename=os.path.basename(m.pdf_path))


# ════════════════════════════════════════════════════════════════════════════════
# MISSIONI — WORKFLOW
# ════════════════════════════════════════════════════════════════════════════════

@router.post("/missioni/{id}/invia")
def invia_missione(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    m = _get_missione(id, db)
    if m.stato != "bozza":
        raise HTTPException(status_code=409, detail={"error": {"code": "TRANSIZIONE_NON_VALIDA", "message": "Solo le missioni in bozza possono essere inviate"}})
    if str(m.richiedente_id) != str(utente.id):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Solo il richiedente può inviare la missione"}})
    for campo in ("data_inizio", "data_fine", "importo_stimato"):
        if not getattr(m, campo):
            raise HTTPException(status_code=422, detail={"error": {"code": "DATI_MANCANTI", "message": f"Campo obbligatorio mancante: {campo}"}})

    m.stato = "attesa_ammin"
    m.inviata_il = datetime.now(timezone.utc)
    ammin = _ammin(m.progetto_id, db)
    _notifica(db, ammin,
              titolo="Nuova richiesta di missione — verifica disponibilità",
              messaggio=f"{_nome(m.richiedente)} ha richiesto una missione a {m.destinazione} ({m.data_inizio} - {m.data_fine}). Importo stimato: {m.importo_stimato} €. Verifica la disponibilità di budget e approva.",
              link=f"/missioni/{m.id}", richiede_azione=True)
    db.commit()
    db.refresh(m)
    return {"data": _missione_dict(m, db)}


@router.post("/missioni/{id}/approva")
def approva_missione(id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    m = _get_missione(id, db)
    luogo = body.get("luogo", "").strip()
    note = body.get("note", "").strip()

    if m.stato == "attesa_ammin":
        ammin = _ammin(m.progetto_id, db)
        if (not ammin or str(ammin.id) != str(utente.id)) and utente.ruolo != "superadmin":
            raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Non sei l'amministratore di questo progetto"}})
        voce_impegno = body.get("voce_impegno")
        if voce_impegno:
            m.voce_impegno = voce_impegno
        step = StepApprovazioneMissione(missione_id=m.id, approvatore_id=utente.id, ruolo="ammin",
                                         decisione="approvato", luogo_firma=luogo or None, note=note, ciclo=1)
        db.add(step)
        m.stato = "attesa_pi"
        pi = _pi(m.progetto_id, db)
        _notifica(db, pi,
                  titolo="Nuova richiesta di missione da approvare",
                  messaggio=f"La missione di {_nome(m.richiedente)} a {m.destinazione} ({m.data_inizio} - {m.data_fine}) è stata verificata dall'amministratore. Importo stimato: {m.importo_stimato} €.",
                  link=f"/missioni/{m.id}", richiede_azione=True)
        segna_lette_per_link(db, utente.id, f"/missioni/{m.id}")

    elif m.stato == "attesa_pi":
        pi = _pi(m.progetto_id, db)
        if (not pi or str(pi.id) != str(utente.id)) and utente.ruolo != "superadmin":
            raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Non sei il PI di questo progetto"}})
        if not luogo:
            raise HTTPException(status_code=422, detail={"error": {"code": "LUOGO_OBBLIGATORIO", "message": "Il luogo è obbligatorio per l'approvazione del PI"}})
        m.luogo_approvazione = luogo
        m.note_approvazione = note or None
        step = StepApprovazioneMissione(missione_id=m.id, approvatore_id=utente.id, ruolo="pi",
                                         decisione="approvato", luogo_firma=luogo, note=note, ciclo=1)
        db.add(step)
        # Crea impegno sul budget
        impegno = _crea_impegno_missione(m, db)
        if impegno:
            m.impegno_gestionale_id = impegno.id
        m.stato = "attesa_dir_dip"
        dest = _dir_dip(m.progetto_id, db)
        _notifica(db, dest, titolo="Missione approvata dal PI — tua approvazione richiesta",
                  messaggio=f"La missione di {_nome(m.richiedente)} a {m.destinazione} è stata approvata dal PI. Attende la tua approvazione come Direttore di Dipartimento.",
                  link=f"/missioni/{m.id}", richiede_azione=True)
        segna_lette_per_link(db, utente.id, f"/missioni/{m.id}")

    elif m.stato == "attesa_dir_dip":
        dir_dip = _dir_dip(m.progetto_id, db)
        if (not dir_dip or str(dir_dip.id) != str(utente.id)) and utente.ruolo != "superadmin":
            raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Non sei il Direttore di Dipartimento"}})
        step = StepApprovazioneMissione(missione_id=m.id, approvatore_id=utente.id, ruolo="dir_dip",
                                         decisione="approvato", luogo_firma=luogo, note=note, ciclo=1)
        db.add(step)
        m.stato = "attesa_dg"
        dest = _dg(db)
        _notifica(db, dest, titolo="Missione — tua approvazione finale richiesta",
                  messaggio=f"La missione di {_nome(m.richiedente)} a {m.destinazione} è stata approvata dal Direttore di Dipartimento. Attende la tua approvazione definitiva.",
                  link=f"/missioni/{m.id}", richiede_azione=True)
        segna_lette_per_link(db, utente.id, f"/missioni/{m.id}")

    elif m.stato == "attesa_dg":
        if utente.ruolo != "direttore_generale" and utente.ruolo != "superadmin":
            raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Solo il Direttore Generale può approvare in questo step"}})
        step = StepApprovazioneMissione(missione_id=m.id, approvatore_id=utente.id, ruolo="dg",
                                         decisione="approvato", luogo_firma=luogo or None, note=note or None, ciclo=1)
        db.add(step)
        m.stato = "approvata"
        m.approvata_il = datetime.now(timezone.utc)
        _notifica(db, m.richiedente, titolo="Missione APPROVATA",
                  messaggio=f"La tua missione a {m.destinazione} è stata approvata definitivamente. Puoi scaricare il PDF di autorizzazione.",
                  link=f"/missioni/{m.id}")
        segna_lette_per_link(db, utente.id, f"/missioni/{m.id}")
        # Commit prima del PDF: step.decided_at (server_default) e la collection step_approvazione
        # devono essere disponibili con i valori corretti dal DB.
        db.commit()
        db.refresh(m)
        try:
            from app.services.pdf_missione import genera_pdf_missione
            from app.services.storage import progetto_dir
            _codice_pdf = m.progetto.codice if m.progetto else None
            output_dir = progetto_dir(_codice_pdf, "missioni", _missione_folder(m))
            m.pdf_path = genera_pdf_missione(m, db, output_dir)
            db.commit()
        except Exception:
            pass
        db.refresh(m)
        return {"data": _missione_dict(m, db)}
    else:
        raise HTTPException(status_code=409, detail={"error": {"code": "TRANSIZIONE_NON_VALIDA", "message": f"La missione è in stato '{m.stato}', non approvabile"}})

    db.commit()
    db.refresh(m)
    return {"data": _missione_dict(m, db)}


@router.post("/missioni/{id}/rigetta")
def rigetta_missione(id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    m = _get_missione(id, db)
    if m.stato not in ("attesa_ammin", "attesa_pi", "attesa_dir_dip", "attesa_dg"):
        raise HTTPException(status_code=409, detail={"error": {"code": "TRANSIZIONE_NON_VALIDA", "message": "La missione non è in uno stato rigettabile"}})
    motivazione = body.get("motivazione", "").strip()
    if not motivazione:
        raise HTTPException(status_code=422, detail={"error": {"code": "MOTIVAZIONE_MANCANTE", "message": "La motivazione è obbligatoria"}})

    if m.stato == "attesa_ammin":
        ammin = _ammin(m.progetto_id, db)
        if (not ammin or str(ammin.id) != str(utente.id)) and utente.ruolo != "superadmin":
            raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Non sei l'amministratore del progetto"}})
        ruolo = "ammin"
    elif m.stato == "attesa_pi":
        pi = _pi(m.progetto_id, db)
        if (not pi or str(pi.id) != str(utente.id)) and utente.ruolo != "superadmin":
            raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Non sei il PI"}})
        ruolo = "pi"
    elif m.stato == "attesa_dir_dip":
        dir_dip = _dir_dip(m.progetto_id, db)
        if (not dir_dip or str(dir_dip.id) != str(utente.id)) and utente.ruolo != "superadmin":
            raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Non sei il Direttore di Dipartimento"}})
        ruolo = "dir_dip"
    else:
        if utente.ruolo != "direttore_generale" and utente.ruolo != "superadmin":
            raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Solo il Direttore Generale può rigettare in questo step"}})
        ruolo = "dg"

    # Se PI aveva già creato un impegno, rilascialo
    if m.impegno_gestionale_id:
        impegno = db.query(Impegno).filter(Impegno.id == m.impegno_gestionale_id).first()
        if impegno:
            bv = db.query(BudgetVoce).filter(
                BudgetVoce.progetto_id == impegno.progetto_id,
                BudgetVoce.voce_id == impegno.voce_id,
            ).first()
            if bv:
                bv.importo_impegnato = max(0, float(bv.importo_impegnato or 0) - float(impegno.importo))
            db.delete(impegno)
        m.impegno_gestionale_id = None

    step = StepApprovazioneMissione(missione_id=m.id, approvatore_id=utente.id, ruolo=ruolo,
                                     decisione="rigettato", note=motivazione, ciclo=1)
    db.add(step)
    m.stato = "rigettata"
    m.respinta_il = datetime.now(timezone.utc)
    _notifica(db, m.richiedente, titolo="Missione RIGETTATA",
              messaggio=f"La tua missione a {m.destinazione} è stata rigettata. Motivazione: {motivazione}",
              link=f"/missioni/{m.id}")
    db.commit()
    db.refresh(m)
    return {"data": _missione_dict(m, db)}


@router.post("/missioni/{id}/riapri")
def riapri_missione(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    m = _get_missione(id, db)
    if m.stato != "rigettata":
        raise HTTPException(status_code=409, detail={"error": {"code": "TRANSIZIONE_NON_VALIDA", "message": "Solo le missioni rigettate possono essere riaperte"}})
    if str(m.richiedente_id) != str(utente.id) and utente.ruolo != "superadmin":
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Solo il richiedente può riaprire la missione"}})
    m.stato = "bozza"
    m.respinta_il = None
    m.impegno_gestionale_id = None
    db.commit()
    db.refresh(m)
    return {"data": _missione_dict(m, db)}


# ════════════════════════════════════════════════════════════════════════════════
# RIMBORSO MISSIONE — CRUD
# ════════════════════════════════════════════════════════════════════════════════

@router.get("/rimborsi-missione")
def lista_rimborsi(
    stato: str = Query(None),
    progetto_id: str = Query(None),
    solo_miei: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    import math
    q = db.query(RimborsoMissione)
    if stato:
        q = q.filter(RimborsoMissione.stato == stato)
    if progetto_id:
        missioni_project = db.query(Missione.id).filter(
            Missione.progetto_id == progetto_id
        ).subquery()
        q = q.filter(RimborsoMissione.missione_id.in_(missioni_project))
    if solo_miei:
        q = q.filter(RimborsoMissione.richiedente_id == utente.id)
    elif utente.ruolo not in ("superadmin", "direttore_generale"):
        alloc_proj_ids = db.query(Allocazione.progetto_id).filter(Allocazione.persona_id == utente.id).subquery()
        missioni_in_projects = db.query(Missione.id).filter(
            Missione.progetto_id.in_(alloc_proj_ids)
        ).subquery()
        ammin_proj_ids = db.query(Progetto.id).filter(Progetto.amministrativo_id == utente.id).subquery()
        missioni_ammin_projects = db.query(Missione.id).filter(
            Missione.progetto_id.in_(ammin_proj_ids)
        ).subquery()
        q = q.filter(
            or_(
                RimborsoMissione.richiedente_id == utente.id,
                RimborsoMissione.missione_id.in_(missioni_in_projects),
                RimborsoMissione.missione_id.in_(missioni_ammin_projects),
            )
        )
    total = q.count()
    items = q.order_by(RimborsoMissione.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "data": [_rimborso_dict(r, db) for r in items],
        "meta": {"total": total, "page": page, "page_size": page_size,
                 "total_pages": math.ceil(total / page_size) if page_size else 1},
    }


@router.get("/rimborsi-missione/missioni-disponibili")
def missioni_disponibili_per_rimborso(
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    """Missioni approvate dell'utente senza rimborso associato."""
    q = db.query(Missione).filter(
        Missione.stato == "approvata",
        Missione.richiedente_id == utente.id,
        ~db.query(RimborsoMissione).filter(
            RimborsoMissione.missione_id == Missione.id
        ).exists(),
    )
    items = q.order_by(Missione.approvata_il.desc()).all()
    return {"data": [
        {
            "id": str(m.id),
            "titolo": m.titolo,
            "destinazione": m.destinazione,
            "data_inizio": m.data_inizio.isoformat() if m.data_inizio else None,
            "data_fine": m.data_fine.isoformat() if m.data_fine else None,
            "approvata_il": m.approvata_il.isoformat() if m.approvata_il else None,
            "progetto_titolo": m.progetto.titolo if m.progetto else None,
        }
        for m in items
    ]}


@router.post("/missioni/{id}/rimborso")
def crea_rimborso(id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    m = _get_missione(id, db)
    if m.stato != "approvata":
        raise HTTPException(status_code=409, detail={"error": {"code": "MISSIONE_NON_APPROVATA", "message": "Il rimborso può essere creato solo per missioni approvate"}})
    if m.rimborso:
        raise HTTPException(status_code=409, detail={"error": {"code": "RIMBORSO_GIA_ESISTENTE", "message": "Esiste già un rimborso per questa missione"}})
    if str(m.richiedente_id) != str(utente.id) and utente.ruolo not in ("superadmin", "amministrativo"):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Non puoi creare un rimborso per questa missione"}})
    r = RimborsoMissione(
        missione_id=m.id,
        richiedente_id=m.richiedente_id,
        note=body.get("note"),
    )
    db.add(r)
    db.commit()
    db.refresh(m)
    return {"data": _missione_dict(m, db)}


@router.get("/rimborsi-missione/{id}")
def get_rimborso(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    return {"data": _rimborso_dict(_get_rimborso(id, db), db)}


@router.patch("/rimborsi-missione/{id}")
def aggiorna_rimborso(id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    r = _get_rimborso(id, db)
    if r.stato != "bozza":
        raise HTTPException(status_code=409, detail={"error": {"code": "STATO_NON_MODIFICABILE", "message": "Il rimborso può essere modificato solo in stato bozza"}})
    if str(r.richiedente_id) != str(utente.id) and utente.ruolo not in ("superadmin", "amministrativo"):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Non puoi modificare questo rimborso"}})
    if "note" in body:
        r.note = body["note"]
    db.commit()
    db.refresh(r)
    return {"data": _rimborso_dict(r, db)}


# ── Righe rimborso ────────────────────────────────────────────────────────────

@router.post("/rimborsi-missione/{id}/righe")
def crea_riga(id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    r = _get_rimborso(id, db)
    if r.stato != "bozza":
        raise HTTPException(status_code=409, detail={"error": {"code": "STATO_NON_MODIFICABILE", "message": "Le righe possono essere aggiunte solo in stato bozza"}})
    if str(r.richiedente_id) != str(utente.id) and utente.ruolo not in ("superadmin", "amministrativo"):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Accesso negato"}})
    from datetime import date
    riga = RigaRimborsoMissione(
        rimborso_missione_id=r.id,
        data_inizio=date.fromisoformat(body["data_inizio"]),
        data_fine=date.fromisoformat(body["data_fine"]),
        attivita=body["attivita"],
        importo=body.get("importo"),
    )
    db.add(riga)
    db.commit()
    db.refresh(r)
    return {"data": _rimborso_dict(r, db)}


@router.put("/rimborsi-missione/righe/{riga_id}")
def aggiorna_riga(riga_id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    riga = _get_riga(riga_id, db)
    r = riga.rimborso
    if r.stato != "bozza":
        raise HTTPException(status_code=409, detail={"error": {"code": "STATO_NON_MODIFICABILE", "message": "Le righe possono essere modificate solo in stato bozza"}})
    from datetime import date
    if "data_inizio" in body:
        riga.data_inizio = date.fromisoformat(body["data_inizio"])
    if "data_fine" in body:
        riga.data_fine = date.fromisoformat(body["data_fine"])
    if "attivita" in body:
        riga.attivita = body["attivita"]
    if "importo" in body:
        riga.importo = body["importo"]
    db.commit()
    db.refresh(r)
    return {"data": _rimborso_dict(r, db)}


@router.delete("/rimborsi-missione/righe/{riga_id}")
def elimina_riga(riga_id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    riga = _get_riga(riga_id, db)
    r = riga.rimborso
    if r.stato != "bozza":
        raise HTTPException(status_code=409, detail={"error": {"code": "STATO_NON_MODIFICABILE", "message": "Le righe possono essere eliminate solo in stato bozza"}})
    db.delete(riga)
    db.commit()
    db.refresh(r)
    return {"data": _rimborso_dict(r, db)}


@router.post("/rimborsi-missione/righe/{riga_id}/documento")
async def upload_documento_riga(
    riga_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    riga = _get_riga(riga_id, db)
    r = riga.rimborso
    if r.stato != "bozza":
        raise HTTPException(status_code=409, detail={"error": {"code": "STATO_NON_MODIFICABILE", "message": "Documenti caricabili solo in stato bozza"}})
    from app.services.storage import progetto_dir, upload_filename
    _codice_rig = r.missione.progetto.codice if (r.missione and r.missione.progetto) else None
    upload_dir = progetto_dir(_codice_rig, "missioni", _missione_folder(r.missione), "rimborso", "giustificativi")
    os.makedirs(upload_dir, exist_ok=True)
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    path = os.path.join(upload_dir, upload_filename(file.filename or f"doc{ext}", riga_id))
    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)
    riga.documento_path = path
    riga.documento_nome_originale = file.filename
    db.commit()
    db.refresh(r)
    return {"data": _rimborso_dict(r, db)}


@router.get("/rimborsi-missione/righe/{riga_id}/documento")
def scarica_documento_riga(riga_id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    riga = _get_riga(riga_id, db)
    if not riga.documento_path or not os.path.exists(riga.documento_path):
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Documento non trovato"}})
    nome = riga.documento_nome_originale or os.path.basename(riga.documento_path)
    return FileResponse(riga.documento_path, filename=nome)


@router.post("/rimborsi-missione/{id}/scheda-finanziaria")
async def upload_scheda_finanziaria(
    id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    r = _get_rimborso(id, db)
    if r.stato != "bozza":
        raise HTTPException(status_code=409, detail={"error": {"code": "STATO_NON_MODIFICABILE", "message": "Caricabile solo in stato bozza"}})
    from app.services.storage import progetto_dir
    _codice_sf = r.missione.progetto.codice if (r.missione and r.missione.progetto) else None
    upload_dir = progetto_dir(_codice_sf, "missioni", _missione_folder(r.missione), "rimborso")
    os.makedirs(upload_dir, exist_ok=True)
    path = os.path.join(upload_dir, f"scheda_finanziaria{os.path.splitext(file.filename or '')[1]}")
    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)
    r.scheda_finanziaria_path = path
    db.commit()
    db.refresh(r)
    return {"data": _rimborso_dict(r, db)}


@router.get("/rimborsi-missione/{id}/scheda-finanziaria")
def scarica_scheda_finanziaria(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    r = _get_rimborso(id, db)
    if not r.scheda_finanziaria_path or not os.path.exists(r.scheda_finanziaria_path):
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Scheda finanziaria non trovata"}})
    return FileResponse(r.scheda_finanziaria_path, filename=os.path.basename(r.scheda_finanziaria_path))


@router.get("/rimborsi-missione/{id}/pdf")
def scarica_pdf_rimborso(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    r = _get_rimborso(id, db)
    if not r.pdf_path or not os.path.exists(r.pdf_path):
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "PDF non ancora generato"}})
    return FileResponse(r.pdf_path, filename=os.path.basename(r.pdf_path))


# ── Allegati rimborso ─────────────────────────────────────────────────────────

@router.post("/rimborsi-missione/{id}/allegati")
async def upload_allegato_rimborso(
    id: str,
    tipo: str = Query("rimborso"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    r = _get_rimborso(id, db)
    from app.services.storage import progetto_dir, upload_filename
    _codice_all = r.missione.progetto.codice if (r.missione and r.missione.progetto) else None
    upload_dir = progetto_dir(_codice_all, "missioni", _missione_folder(r.missione), "rimborso", "allegati")
    os.makedirs(upload_dir, exist_ok=True)
    import uuid
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    path = os.path.join(upload_dir, upload_filename(file.filename or f"allegato{ext}", str(uuid.uuid4())))
    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)
    allegato = AllegatoMissione(
        tipo=tipo, file_path=path, file_nome_originale=file.filename,
        rimborso_missione_id=r.id, caricato_da=utente.id,
    )
    db.add(allegato)
    db.commit()
    db.refresh(r)
    return {"data": _rimborso_dict(r, db)}


# ════════════════════════════════════════════════════════════════════════════════
# RIMBORSO MISSIONE — WORKFLOW
# ════════════════════════════════════════════════════════════════════════════════

@router.post("/rimborsi-missione/{id}/invia")
def invia_rimborso(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    r = _get_rimborso(id, db)
    if r.stato != "bozza":
        raise HTTPException(status_code=409, detail={"error": {"code": "TRANSIZIONE_NON_VALIDA", "message": "Solo i rimborsi in bozza possono essere inviati"}})
    if str(r.richiedente_id) != str(utente.id):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Solo il richiedente può inviare il rimborso"}})
    if not r.righe:
        raise HTTPException(status_code=422, detail={"error": {"code": "RIGHE_MANCANTI", "message": "Inserire almeno una riga di rimborso"}})
    r.stato = "attesa_ammin"
    r.inviata_il = datetime.now(timezone.utc)
    ammin = _ammin(r.missione.progetto_id, db)
    totale = sum(float(riga.importo or 0) for riga in r.righe)
    _notifica(db, ammin, titolo="Nuovo rimborso missione da approvare",
              messaggio=f"{_nome(r.richiedente)} ha inviato un rimborso missione per {r.missione.titolo} — totale {totale:,.2f} €. In attesa della tua approvazione.",
              link=f"/rimborsi-missione/{r.id}", richiede_azione=True)
    db.commit()
    db.refresh(r)
    return {"data": _rimborso_dict(r, db)}


@router.post("/rimborsi-missione/{id}/approva")
def approva_rimborso(id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    r = _get_rimborso(id, db)
    luogo = body.get("luogo", "").strip()
    note = body.get("note", "").strip()
    progetto_id = r.missione.progetto_id
    totale = sum(float(riga.importo or 0) for riga in r.righe)

    if r.stato == "attesa_ammin":
        ammin = _ammin(progetto_id, db)
        if (not ammin or str(ammin.id) != str(utente.id)) and utente.ruolo != "superadmin":
            raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Non sei il Responsabile Amministrativo di questo progetto"}})
        step = StepApprovazioneMissione(rimborso_missione_id=r.id, approvatore_id=utente.id, ruolo="ammin",
                                         decisione="approvato", luogo_firma=luogo, note=note, ciclo=r.ciclo)
        db.add(step)
        from app.models.notifica import Notifica
        notifiche = db.query(Notifica).filter(
            Notifica.link == f"/rimborsi-missione/{str(r.id)}",
            Notifica.richiede_azione == True
        ).all()
        for notifica in notifiche:
            notifica.richiede_azione = False
        r.stato = "attesa_pi"
        dest = _pi(progetto_id, db)
        _notifica(db, dest, titolo="Rimborso missione — tua approvazione richiesta",
                  messaggio=f"Il rimborso missione di {_nome(r.richiedente)} ({totale:,.2f} €) è stato verificato dall'Amministrativo. Attende la tua approvazione come PI.",
                  link=f"/rimborsi-missione/{r.id}", richiede_azione=True)

    elif r.stato == "attesa_pi":
        pi = _pi(progetto_id, db)
        if (not pi or str(pi.id) != str(utente.id)) and utente.ruolo != "superadmin":
            raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Non sei il PI di questo progetto"}})
        if not luogo:
            raise HTTPException(status_code=422, detail={"error": {"code": "LUOGO_OBBLIGATORIO", "message": "Il luogo è obbligatorio per l'approvazione del PI"}})
        step = StepApprovazioneMissione(rimborso_missione_id=r.id, approvatore_id=utente.id, ruolo="pi",
                                         decisione="approvato", luogo_firma=luogo, note=note, ciclo=r.ciclo)
        db.add(step)
        from app.models.notifica import Notifica
        notifiche = db.query(Notifica).filter(
            Notifica.link == f"/rimborsi-missione/{str(r.id)}",
            Notifica.richiede_azione == True
        ).all()
        for notifica in notifiche:
            notifica.richiede_azione = False
        r.stato = "attesa_dir_dip"
        dest = _dir_dip(progetto_id, db)
        _notifica(db, dest, titolo="Rimborso missione — tua approvazione richiesta",
                  messaggio=f"Il rimborso missione di {_nome(r.richiedente)} ({totale:,.2f} €) è stato approvato dal PI. Attende la tua approvazione come Direttore di Dipartimento.",
                  link=f"/rimborsi-missione/{r.id}", richiede_azione=True)

    elif r.stato == "attesa_dir_dip":
        dir_dip = _dir_dip(progetto_id, db)
        if (not dir_dip or str(dir_dip.id) != str(utente.id)) and utente.ruolo != "superadmin":
            raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Non sei il Direttore di Dipartimento"}})
        step = StepApprovazioneMissione(rimborso_missione_id=r.id, approvatore_id=utente.id, ruolo="dir_dip",
                                         decisione="approvato", luogo_firma=luogo, note=note, ciclo=r.ciclo)
        db.add(step)
        from app.models.notifica import Notifica
        notifiche = db.query(Notifica).filter(
            Notifica.link == f"/rimborsi-missione/{str(r.id)}",
            Notifica.richiede_azione == True
        ).all()
        for notifica in notifiche:
            notifica.richiede_azione = False
        r.stato = "attesa_dg"
        dest = _dg(db)
        _notifica(db, dest, titolo="Rimborso missione — tua approvazione finale richiesta",
                  messaggio=f"Il rimborso missione di {_nome(r.richiedente)} ({totale:,.2f} €) è stato approvato dal Direttore di Dipartimento. Attende la tua approvazione definitiva.",
                  link=f"/rimborsi-missione/{r.id}", richiede_azione=True)

    elif r.stato == "attesa_dg":
        if utente.ruolo != "direttore_generale" and utente.ruolo != "superadmin":
            raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Solo il Direttore Generale può approvare in questo step"}})
        step = StepApprovazioneMissione(rimborso_missione_id=r.id, approvatore_id=utente.id, ruolo="dg",
                                         decisione="approvato", luogo_firma=luogo, note=note, ciclo=r.ciclo)
        db.add(step)
        from app.models.notifica import Notifica
        notifiche = db.query(Notifica).filter(
            Notifica.link == f"/rimborsi-missione/{str(r.id)}",
            Notifica.richiede_azione == True
        ).all()
        for notifica in notifiche:
            notifica.richiede_azione = False
        r.stato = "approvata"
        r.approvata_il = datetime.now(timezone.utc)
        _finalizza_rimborso_budget(r, db)
        _notifica(db, r.richiedente, titolo="Rimborso missione APPROVATO",
                  messaggio=f"Il tuo rimborso missione per {r.missione.titolo if r.missione else ''} ({totale:,.2f} €) è stato approvato definitivamente. Puoi scaricare il PDF.",
                  link=f"/rimborsi-missione/{r.id}")
        # commit PRIMA del PDF: decided_at dei step usa server_default e non è valorizzato finché non passiamo dal DB
        db.commit()
        db.refresh(r)
        try:
            from app.services.pdf_missione import genera_pdf_rimborso_missione
            from app.services.storage import progetto_dir
            _codice_rp = r.missione.progetto.codice if (r.missione and r.missione.progetto) else None
            output_dir = progetto_dir(_codice_rp, "missioni", _missione_folder(r.missione), "rimborso")
            r.pdf_path = genera_pdf_rimborso_missione(r, db, output_dir)
            db.commit()
        except Exception:
            pass
        db.refresh(r)
        return {"data": _rimborso_dict(r, db)}
    else:
        raise HTTPException(status_code=409, detail={"error": {"code": "TRANSIZIONE_NON_VALIDA", "message": f"Il rimborso è in stato '{r.stato}', non approvabile"}})

    db.commit()
    db.refresh(r)
    return {"data": _rimborso_dict(r, db)}


@router.post("/rimborsi-missione/{id}/rigetta")
def rigetta_rimborso(id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    r = _get_rimborso(id, db)
    if r.stato not in ("attesa_ammin", "attesa_pi", "attesa_dir_dip", "attesa_dg"):
        raise HTTPException(status_code=409, detail={"error": {"code": "TRANSIZIONE_NON_VALIDA", "message": "Il rimborso non è in uno stato rigettabile"}})
    motivazione = body.get("motivazione", "").strip()
    if not motivazione:
        raise HTTPException(status_code=422, detail={"error": {"code": "MOTIVAZIONE_MANCANTE", "message": "La motivazione è obbligatoria"}})
    ruolo_map = {"attesa_ammin": "ammin", "attesa_pi": "pi", "attesa_dir_dip": "dir_dip", "attesa_dg": "dg"}
    ruolo = ruolo_map[r.stato]
    step = StepApprovazioneMissione(rimborso_missione_id=r.id, approvatore_id=utente.id, ruolo=ruolo,
                                     decisione="rigettato", note=motivazione, ciclo=r.ciclo)
    db.add(step)
    r.stato = "rigettata"
    r.respinta_il = datetime.now(timezone.utc)
    _notifica(db, r.richiedente, titolo="Rimborso missione RIGETTATO",
              messaggio=f"Il tuo rimborso per {r.missione.titolo} è stato rigettato. Motivazione: {motivazione}",
              link=f"/rimborsi-missione/{r.id}")
    db.commit()
    db.refresh(r)
    return {"data": _rimborso_dict(r, db)}


@router.post("/rimborsi-missione/{id}/riapri")
def riapri_rimborso(id: str, db: Session = Depends(get_db), utente: Persona = Depends(tutti_i_ruoli)):
    r = _get_rimborso(id, db)
    if r.stato != "rigettata":
        raise HTTPException(status_code=409, detail={"error": {"code": "TRANSIZIONE_NON_VALIDA", "message": "Solo i rimborsi rigettati possono essere riaperti"}})
    if str(r.richiedente_id) != str(utente.id) and utente.ruolo != "superadmin":
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Solo il richiedente può riaprire il rimborso"}})
    r.stato = "bozza"
    r.ciclo += 1
    r.respinta_il = None
    db.commit()
    db.refresh(r)
    return {"data": _rimborso_dict(r, db)}
