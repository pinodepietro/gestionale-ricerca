# backend/app/api/v1/endpoints/admin.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.core.deps import solo_superadmin
from app.models.persona import Persona
from app.core.security import hash_password
import uuid, subprocess, os, datetime

router = APIRouter()

RUOLI_VALIDI = ["amministrativo", "ricercatore", "management", "superadmin", "monitor"]


# ─── Utenti ──────────────────────────────────────────────────────────────────

@router.get("/utenti")
def lista_utenti(db: Session = Depends(get_db), utente: Persona = Depends(solo_superadmin)):
    persone = db.query(Persona).order_by(Persona.cognome, Persona.nome).all()
    return {"data": [_persona_dict(p) for p in persone]}


@router.post("/utenti")
def crea_utente(body: dict, db: Session = Depends(get_db), utente: Persona = Depends(solo_superadmin)):
    if db.query(Persona).filter(Persona.email == body.get("email")).first():
        raise HTTPException(status_code=409, detail={"error": {"code": "EMAIL_DUPLICATA", "message": "Email già in uso"}})
    p = Persona(
        id=uuid.uuid4(),
        nome=body.get("nome"),
        cognome=body.get("cognome"),
        email=body.get("email"),
        password_hash=hash_password(body.get("password", "changeme")),
        ruolo=body.get("ruolo", "ricercatore"),
        ruolo_ente=body.get("ruolo_ente"),
        livello_contratto=body.get("livello_contratto"),
        attivo=True,
        deve_cambiare_password=True,
    )
    db.add(p); db.commit(); db.refresh(p)
    return {"data": _persona_dict(p)}


@router.patch("/utenti/{id}")
def aggiorna_utente(id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(solo_superadmin)):
    p = db.query(Persona).filter(Persona.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Utente non trovato"}})
    for k in ("nome", "cognome", "email", "ruolo", "ruolo_ente", "livello_contratto", "attivo"):
        if k in body:
            setattr(p, k, body[k])
    if "password" in body and body["password"]:
        p.password_hash = hash_password(body["password"])
    db.commit(); db.refresh(p)
    return {"data": _persona_dict(p)}


@router.delete("/utenti/{id}")
def elimina_utente(id: str, db: Session = Depends(get_db), utente: Persona = Depends(solo_superadmin)):
    p = db.query(Persona).filter(Persona.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Utente non trovato"}})
    if str(p.id) == str(utente.id):
        raise HTTPException(status_code=409, detail={"error": {"code": "SELF_DELETE", "message": "Non puoi eliminare te stesso"}})
    p.attivo = False
    db.commit()
    return {"data": {"deleted": True}}


def _persona_dict(p: Persona) -> dict:
    return {
        "id": str(p.id), "nome": p.nome, "cognome": p.cognome,
        "email": p.email, "ruolo": p.ruolo, "ruolo_ente": p.ruolo_ente,
        "livello_contratto": p.livello_contratto, "attivo": p.attivo,
    }


# ─── Tabelle DB ───────────────────────────────────────────────────────────────

TABELLE_CONSENTITE = [
    "progetto", "work_package", "persona", "allocazione",
    "budget_voce", "voce_di_costo", "spesa", "sal",
    "timesheet_testata", "template_timesheet", "documento_progetto",
]

@router.get("/tabelle")
def lista_tabelle(utente: Persona = Depends(solo_superadmin)):
    return {"data": TABELLE_CONSENTITE}

@router.get("/tabelle/{nome}")
def dati_tabella(nome: str, limit: int = 100, offset: int = 0,
                 db: Session = Depends(get_db), utente: Persona = Depends(solo_superadmin)):
    if nome not in TABELLE_CONSENTITE:
        raise HTTPException(status_code=403, detail={"error": {"code": "TABELLA_NON_CONSENTITA", "message": "Tabella non accessibile"}})
    result = db.execute(text(f"SELECT * FROM {nome} LIMIT :limit OFFSET :offset"), {"limit": limit, "offset": offset})
    rows = [dict(row._mapping) for row in result]
    count = db.execute(text(f"SELECT COUNT(*) FROM {nome}")).scalar()
    # Converti UUID e date in stringhe
    import json
    rows_str = json.loads(json.dumps(rows, default=str))
    return {"data": rows_str, "meta": {"total": count, "limit": limit, "offset": offset}}


# ─── Backup ───────────────────────────────────────────────────────────────────

@router.post("/backup")
def crea_backup(db: Session = Depends(get_db), utente: Persona = Depends(solo_superadmin)):
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = "/app/uploads/backup"
    os.makedirs(backup_dir, exist_ok=True)
    filename = f"backup_{timestamp}.sql"
    filepath = f"{backup_dir}/{filename}"

    try:
        # Usa pg_dump tramite connessione diretta con psycopg2
        import psycopg2
        conn = psycopg2.connect(
            host=os.getenv("POSTGRES_HOST", "db"),
            user=os.getenv("POSTGRES_USER", "dev"),
            password=os.getenv("POSTGRES_PASSWORD", "dev"),
            dbname=os.getenv("POSTGRES_DB", "gestionale_ricerca"),
        )
        cursor = conn.cursor()

        # Genera SQL per tutte le tabelle
        cursor.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """)
        tabelle = [r[0] for r in cursor.fetchall()]

        with open(filepath, 'w') as f:
            f.write(f"-- Backup gestionale_ricerca {timestamp}\n\n")
            for tabella in tabelle:
                cursor.execute(f"SELECT * FROM {tabella}")
                rows = cursor.fetchall()
                cols = [desc[0] for desc in cursor.description]
                f.write(f"-- Tabella: {tabella} ({len(rows)} righe)\n")
                if rows:
                    cols_str = ", ".join(cols)
                    for row in rows:
                        vals = ", ".join(
                            "NULL" if v is None else f"'{str(v).replace(chr(39), chr(39)+chr(39))}'"
                            for v in row
                        )
                        f.write(f"INSERT INTO {tabella} ({cols_str}) VALUES ({vals});\n")
                f.write("\n")

        cursor.close()
        conn.close()

        size = os.path.getsize(filepath)
        return {"data": {"filename": filename, "size": size, "path": filepath}}
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": {"code": "BACKUP_FAILED", "message": str(e)}})


@router.get("/backup")
def lista_backup(utente: Persona = Depends(solo_superadmin)):
    backup_dir = "/app/uploads/backup"
    os.makedirs(backup_dir, exist_ok=True)
    files = []
    for f in sorted(os.listdir(backup_dir), reverse=True):
        if f.endswith(".sql"):
            path = f"{backup_dir}/{f}"
            files.append({
                "filename": f,
                "size": os.path.getsize(path),
                "created_at": datetime.datetime.fromtimestamp(os.path.getctime(path)).isoformat(),
            })
    return {"data": files}


@router.get("/backup/{filename}/download")
def scarica_backup(filename: str, utente: Persona = Depends(solo_superadmin)):
    from fastapi.responses import FileResponse
    filepath = f"/app/uploads/backup/{filename}"
    if not os.path.exists(filepath) or not filename.endswith(".sql"):
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Backup non trovato"}})
    return FileResponse(filepath, filename=filename, media_type="application/octet-stream")


# ─── Statistiche ─────────────────────────────────────────────────────────────

@router.get("/statistiche")
def statistiche(db: Session = Depends(get_db), utente: Persona = Depends(solo_superadmin)):
    from app.models.progetto import Progetto
    from app.models.timesheet import TimesheetTestata
    from app.models.budget import Spesa
    from app.models.personale import Allocazione
    from sqlalchemy import func
    import datetime

    oggi = datetime.date.today()
    mese_corrente = oggi.month
    anno_corrente = oggi.year

    return {"data": {
        "progetti": {
            "totale": db.query(func.count(Progetto.id)).scalar(),
            "attivi": db.query(func.count(Progetto.id)).filter(Progetto.stato == "attivo").scalar(),
            "bozze": db.query(func.count(Progetto.id)).filter(Progetto.stato == "bozza").scalar(),
            "chiusi": db.query(func.count(Progetto.id)).filter(Progetto.stato == "chiuso").scalar(),
        },
        "utenti": {
            "totale": db.query(func.count(Persona.id)).scalar(),
            "attivi": db.query(func.count(Persona.id)).filter(Persona.attivo == True).scalar(),
            "per_ruolo": {
                r: db.query(func.count(Persona.id)).filter(Persona.ruolo == r).scalar()
                for r in ["amministrativo", "ricercatore", "management", "superadmin", "monitor"]
            },
        },
        "timesheet": {
            "totale": db.query(func.count(TimesheetTestata.id)).scalar(),
            "questo_mese": db.query(func.count(TimesheetTestata.id)).filter(
                TimesheetTestata.mese == mese_corrente,
                TimesheetTestata.anno == anno_corrente,
            ).scalar(),
            "in_attesa": db.query(func.count(TimesheetTestata.id)).filter(
                TimesheetTestata.stato == "inviato").scalar(),
            "approvati_mese": db.query(func.count(TimesheetTestata.id)).filter(
                TimesheetTestata.stato == "approvato",
                TimesheetTestata.mese == mese_corrente,
                TimesheetTestata.anno == anno_corrente,
            ).scalar(),
        },
        "spese": {
            "totale_registrate": db.query(func.count(Spesa.id)).filter(Spesa.stato == "registrata").scalar(),
            "importo_totale": float(db.query(func.sum(Spesa.importo)).filter(Spesa.stato == "registrata").scalar() or 0),
        },
        "personale": {
            "allocazioni_attive": db.query(func.count(Allocazione.id)).filter(
                Allocazione.data_fine >= oggi).scalar(),
        },
    }}


# ─── Log operazioni ───────────────────────────────────────────────────────────

@router.get("/log")
def lista_log(
    limit: int = 100,
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_superadmin)
):
    from app.models.timesheet import ApprovazioneTimesheet
    from app.models.progetto import Progetto
    import datetime

    log_entries = []

    # Timesheet approvati/rifiutati
    approvazioni = db.query(ApprovazioneTimesheet).order_by(
        ApprovazioneTimesheet.created_at.desc()
    ).limit(limit).all()

    for a in approvazioni:
        ts = db.query(TimesheetTestata).filter(TimesheetTestata.id == a.testata_id).first()
        approvatore = db.query(Persona).filter(Persona.id == a.approvatore_id).first()
        persona_ts = db.query(Persona).filter(Persona.id == ts.persona_id).first() if ts else None
        progetto = db.query(Progetto).filter(Progetto.id == ts.progetto_id).first() if ts else None

        log_entries.append({
            "id": str(a.id),
            "timestamp": a.data.isoformat() if a.data else None,
            "tipo": "timesheet_approvato" if a.esito == "approvato" else "timesheet_rifiutato",
            "utente": f"{approvatore.cognome} {approvatore.nome}" if approvatore else "—",
            "descrizione": f"Timesheet {persona_ts.cognome if persona_ts else '?'} {persona_ts.nome if persona_ts else ''} — {ts.mese:02d}/{ts.anno} ({progetto.acronimo or progetto.codice if progetto else '?'})" if ts else "—",
            "esito": a.esito,
        })

    log_entries.sort(key=lambda x: x["timestamp"] or "", reverse=True)
    return {"data": log_entries[:limit]}


# ─── Creazione progetto minimale ──────────────────────────────────────────────

@router.post("/progetti")
def crea_progetto_minimale(
    body: dict,
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_superadmin),
):
    from app.models.progetto import Progetto
    import uuid as _uuid

    codice = body.get("codice", "").strip()
    titolo = body.get("titolo", "").strip()
    amministrativo_id = body.get("amministrativo_id")

    if not codice and not titolo:
        raise HTTPException(status_code=422, detail={"error": {
            "code": "DATI_INSUFFICIENTI",
            "message": "Almeno codice o titolo devono essere valorizzati"
        }})

    # Genera codice automatico se mancante
    if not codice:
        codice = f"PROG-{_uuid.uuid4().hex[:6].upper()}"

    if not titolo:
        titolo = codice

    if db.query(Progetto).filter(Progetto.codice == codice).first():
        raise HTTPException(status_code=409, detail={"error": {
            "code": "CODICE_DUPLICATO",
            "message": f"Esiste già un progetto con codice {codice}"
        }})

    p = Progetto(
        id=_uuid.uuid4(),
        codice=codice,
        titolo=titolo,
        tipo="Altro",
        data_inizio="2026-01-01",
        data_fine="2026-12-31",
        stato="bozza",
        costo_totale=0,
        importo_finanziato=0,
        budget_per_partner=False,
        amministrativo_id=amministrativo_id,
    )
    db.add(p)
    db.commit()
    db.refresh(p)

    # Crea notifica per l'amministrativo assegnato
    if amministrativo_id:
        from app.models.notifica import Notifica
        import uuid as _uuid2
        try:
            n = Notifica(
                id=_uuid2.uuid4(),
                persona_id=amministrativo_id,
                tipo="progetto_assegnato",
                titolo="Nuovo progetto assegnato",
                messaggio=f"Il superamministratore ti ha assegnato il progetto '{p.titolo}' (codice: {p.codice}). Accedi alla sezione Configurazione per completarlo.",
                link=f"/configurazione/{str(p.id)}",
            )
            db.add(n)
            db.commit()
        except Exception:
            pass  # Non bloccare se il modello notifica non esiste

    return {"data": {"id": str(p.id), "codice": p.codice, "titolo": p.titolo}}


# ─── Notifiche personali ──────────────────────────────────────────────────────

@router.get("/notifiche-personali")
def notifiche_personali(
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_superadmin),
):
    from app.models.notifica import Notifica
    notifiche = db.query(Notifica).filter(
        Notifica.persona_id == utente.id,
        Notifica.letta == False,
    ).order_by(Notifica.created_at.desc()).all()
    return {"data": [{
        "id": str(n.id),
        "tipo": n.tipo,
        "titolo": n.titolo,
        "messaggio": n.messaggio,
        "link": n.link,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    } for n in notifiche]}


@router.delete("/progetti/{id}")
def elimina_progetto_superadmin(
    id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(solo_superadmin),
):
    from app.models.progetto import Progetto
    from app.models.partner import ProgettoPartner
    from app.models.personale import Allocazione
    from app.models.budget import BudgetVoce, Spesa, Sal
    from app.models.documento import DocumentoProgetto
    from app.models.struttura import WorkPackage, Milestone, Deliverable
    from app.models.timesheet import TimesheetTestata, ApprovazioneTimesheet
    from app.models.notifica import Notifica
    import os

    p = db.query(Progetto).filter(Progetto.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail={"error": {
            "code": "NOT_FOUND", "message": "Progetto non trovato"}})

    # Elimina timesheet e approvazioni
    ts_list = db.query(TimesheetTestata).filter(TimesheetTestata.progetto_id == id).all()
    for ts in ts_list:
        db.query(ApprovazioneTimesheet).filter(ApprovazioneTimesheet.testata_id == ts.id).delete()
    db.query(TimesheetTestata).filter(TimesheetTestata.progetto_id == id).delete()

    # Elimina file documenti
    docs = db.query(DocumentoProgetto).filter(DocumentoProgetto.progetto_id == id).all()
    for doc in docs:
        if doc.path_file and os.path.exists(doc.path_file):
            os.remove(doc.path_file)
    db.query(DocumentoProgetto).filter(DocumentoProgetto.progetto_id == id).delete()

    # Elimina tutto il resto
    db.query(ProgettoPartner).filter(ProgettoPartner.progetto_id == id).delete()
    db.query(Allocazione).filter(Allocazione.progetto_id == id).delete()
    db.query(Spesa).filter(Spesa.progetto_id == id).delete()
    db.query(Sal).filter(Sal.progetto_id == id).delete()
    db.query(BudgetVoce).filter(BudgetVoce.progetto_id == id).delete()
    db.query(Milestone).filter(Milestone.progetto_id == id).delete()
    db.query(Deliverable).filter(Deliverable.progetto_id == id).delete()
    db.query(WorkPackage).filter(WorkPackage.progetto_id == id).delete()

    db.delete(p)
    db.commit()
    return {"data": {"deleted": True}}
