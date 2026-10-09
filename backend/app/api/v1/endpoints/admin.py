# backend/app/api/v1/endpoints/admin.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.core.deps import solo_superadmin
from app.models.persona import Persona
from app.core.security import hash_password
import uuid
import os
import datetime

router = APIRouter()

RUOLI_VALIDI = ["amministrativo", "ricercatore", "management", "superadmin", "monitor"]


# ─── Utenti ──────────────────────────────────────────────────────────────────

@router.get("/utenti")
def lista_utenti(db: Session = Depends(get_db), utente: Persona = Depends(solo_superadmin)):
    """
    List all users (persons).

    Only superadmin can access. Returns all active and inactive users ordered by cognome/nome.

    Args:
        db: Database session
        utente: Current user (must be superadmin)

    Returns:
        JSON with array of user objects: {id, nome, cognome, email, ruolo, ruolo_ente, livello_contratto, attivo}

    Raises:
        HTTPException 403: Not superadmin
    """
    persone = db.query(Persona).order_by(Persona.cognome, Persona.nome).all()
    return {"data": [_persona_dict(p) for p in persone]}


@router.post("/utenti")
def crea_utente(body: dict, db: Session = Depends(get_db), utente: Persona = Depends(solo_superadmin)):
    email = body.get("email")
    if db.query(Persona).filter(Persona.email == email).first():
        raise HTTPException(status_code=409, detail={"error": {"code": "EMAIL_DUPLICATA", "message": "Email già in uso"}})

    username = body.get("username") or email.split("@")[0] if email else None
    if not username:
        raise HTTPException(status_code=422, detail={"error": {"code": "INVALID_INPUT", "message": "username o email richiesti"}})

    p = Persona(
        id=uuid.uuid4(),
        nome=body.get("nome"),
        cognome=body.get("cognome"),
        email=email,
        username=username,
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
    from uuid import UUID
    try:
        persona_id_uuid = UUID(id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Utente non trovato"}})
    p = db.query(Persona).filter(Persona.id == persona_id_uuid).first()
    if not p:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Utente non trovato"}})
    for k in ("nome", "cognome", "email", "ruolo", "ruolo_ente", "livello_contratto", "attivo"):
        if k in body:
            setattr(p, k, body[k])
    if "password" in body and body["password"]:
        p.password_hash = hash_password(body["password"])
    db.commit(); db.refresh(p)
    return {"data": _persona_dict(p)}


@router.post("/utenti/{id}/reset-password")
def reset_password_utente(id: str, body: dict, db: Session = Depends(get_db), utente: Persona = Depends(solo_superadmin)):
    from uuid import UUID
    try:
        persona_id_uuid = UUID(id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Utente non trovato"}})
    p = db.query(Persona).filter(Persona.id == persona_id_uuid).first()
    if not p:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Utente non trovato"}})
    nuova = body.get("password", "")
    if not nuova:
        raise HTTPException(status_code=422, detail={"error": {"code": "PASSWORD_MANCANTE", "message": "Password obbligatoria"}})
    p.password_hash = hash_password(nuova)
    p.deve_cambiare_password = True
    db.commit()
    return {"data": {"message": "Password reimpostata. L'utente dovrà cambiarla al prossimo accesso."}}


@router.delete("/utenti/{id}")
def elimina_utente(id: str, db: Session = Depends(get_db), utente: Persona = Depends(solo_superadmin)):
    from uuid import UUID
    try:
        persona_id_uuid = UUID(id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Utente non trovato"}})
    p = db.query(Persona).filter(Persona.id == persona_id_uuid).first()
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
    from sqlalchemy import MetaData, Table, select, func

    if nome not in TABELLE_CONSENTITE:
        raise HTTPException(status_code=403, detail={"error": {"code": "TABELLA_NON_CONSENTITA", "message": "Tabella non accessibile"}})

    # Use SQLAlchemy reflection to safely access table
    metadata = MetaData()
    table = Table(nome, metadata, autoload_with=db.get_bind())

    # Execute parameterized queries (safe from SQL injection)
    result = db.execute(select(table).limit(limit).offset(offset))
    rows = [dict(row._mapping) for row in result]
    count = db.execute(select(func.count()).select_from(table)).scalar()

    # Convert UUID and dates to strings
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

        # SECURITY: Require all database credentials to be explicitly set
        # No default credentials allowed
        postgres_host = os.getenv("POSTGRES_HOST")
        postgres_user = os.getenv("POSTGRES_USER")
        postgres_password = os.getenv("POSTGRES_PASSWORD")
        postgres_db = os.getenv("POSTGRES_DB")

        if not all([postgres_host, postgres_user, postgres_password, postgres_db]):
            raise HTTPException(
                status_code=500,
                detail={
                    "error": {
                        "code": "CONFIG_ERROR",
                        "message": "Database credentials not configured. Set POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB environment variables."
                    }
                }
            )

        # Usa context manager per garantire cleanup anche se exception
        with psycopg2.connect(
            host=postgres_host,
            user=postgres_user,
            password=postgres_password,
            dbname=postgres_db,
        ) as conn:
            with conn.cursor() as cursor:
                # Get list of tables using parameterized query
                cursor.execute("""
                    SELECT table_name FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                    ORDER BY table_name
                """)
                tabelle = [r[0] for r in cursor.fetchall()]

                with open(filepath, 'w') as f:
                    f.write(f"-- Backup gestionale_ricerca {timestamp}\n\n")
                    for tabella in tabelle:
                        # Validate table name against whitelist
                        if tabella not in TABELLE_CONSENTITE:
                            continue

                        # Use identifier quoting to safely escape table name
                        from psycopg2 import sql
                        query = sql.SQL("SELECT * FROM {}").format(sql.Identifier(tabella))
                        cursor.execute(query)
                        rows = cursor.fetchall()
                        cols = [desc[0] for desc in cursor.description]
                        f.write(f"-- Tabella: {tabella} ({len(rows)} righe)\n")
                        if rows:
                            cols_str = ", ".join(sql.Identifier(col).as_string(cursor) for col in cols)
                            for row in rows:
                                # Safely escape values for SQL
                                vals = ", ".join(
                                    "NULL" if v is None else sql.Literal(v).as_string(cursor)
                                    for v in row
                                )
                                # Use sql.SQL to safely build INSERT statement
                                insert_query = sql.SQL("INSERT INTO {} ({}) VALUES ({});").format(
                                    sql.Identifier(tabella),
                                    sql.SQL(", ").join(sql.Identifier(col) for col in cols),
                                    sql.SQL(", ").join(sql.Literal(v) if v is not None else sql.SQL("NULL") for v in row)
                                )
                                f.write(insert_query.as_string(cursor) + "\n")
                        f.write("\n")

        size = os.path.getsize(filepath)
        return {"data": {"filename": filename, "size": size, "path": filepath}}
    except Exception as e:
        # SECURITY: Don't expose exception details
        import logging
        logging.error(f"Backup creation failed for user {utente.username}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": {
                    "code": "BACKUP_FAILED",
                    "message": "Backup creation failed. Contatta l'amministratore."
                }
            }
        )


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
    from pathlib import Path
    import re

    backup_dir = Path("/app/uploads/backup").resolve()

    if not re.match(r"^[a-zA-Z0-9_.-]+\.sql$", filename):
        raise HTTPException(status_code=400, detail={"error": {"code": "INVALID_FILENAME", "message": "Formato filename non valido"}})

    filepath = (backup_dir / filename).resolve()

    if not str(filepath).startswith(str(backup_dir)):
        raise HTTPException(status_code=403, detail={"error": {"code": "ACCESS_DENIED", "message": "Accesso negato"}})

    if not filepath.exists():
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
