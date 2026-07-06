# backend/app/api/v1/endpoints/notifiche.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import date, timedelta
from app.core.database import get_db
from app.core.deps import tutti_i_ruoli
from app.models.persona import Persona
from app.models.notifica import Notifica
from app.models.budget import Sal
from app.models.progetto import Progetto
from app.models.personale import Allocazione
from app.services.notifiche import crea_notifica
import uuid

router = APIRouter()


def _notifica_dict(n: Notifica, giorni_rimanenti: int | None = None) -> dict:
    return {
        "id": str(n.id),
        "tipo": n.tipo,
        "titolo": n.titolo,
        "messaggio": n.messaggio or "",
        "link": n.link or "",
        "urgente": n.urgente,
        "letta": n.letta,
        "richiede_azione": getattr(n, 'richiede_azione', False),
        "giorni_rimanenti": giorni_rimanenti,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }


def _genera_notifiche_sal_scadenza(db: Session, utente: Persona) -> list[dict]:
    """Genera (e persiste se nuove) notifiche SAL in scadenza per l'amministrativo."""
    if utente.ruolo not in ("amministrativo", "superadmin"):
        return []

    oggi = date.today()
    tra_30 = oggi + timedelta(days=30)

    sal_in_scadenza = db.query(Sal).join(
        Progetto, Sal.progetto_id == Progetto.id
    ).filter(
        Progetto.amministrativo_id == utente.id,
        Sal.stato.in_(["aperto", "chiuso"]),
        Sal.data_scadenza_rendiconto != None,
        Sal.data_scadenza_rendiconto >= oggi,
        Sal.data_scadenza_rendiconto <= tra_30,
    ).all()

    risultati = []
    for s in sal_in_scadenza:
        gg = (s.data_scadenza_rendiconto - oggi).days
        urgente = gg <= 7
        rif = f"sal_{s.id}_{oggi.isoformat()}"

        # Crea la notifica solo se non già presente per oggi
        esistente = db.query(Notifica).filter(
            Notifica.persona_id == utente.id,
            Notifica.riferimento_id == rif,
        ).first()

        if not esistente:
            progetto = db.query(Progetto).filter(Progetto.id == s.progetto_id).first()
            nome_prog = progetto.acronimo or progetto.codice if progetto else "—"
            n = crea_notifica(
                db,
                persona_id=utente.id,
                tipo="sal_scadenza",
                titolo=f"SAL {s.numero} — {nome_prog} in scadenza",
                messaggio=f"Scadenza rendiconto tra {gg} giorni ({s.data_scadenza_rendiconto.strftime('%d/%m/%Y')})",
                link=f"/sal/{s.id}",
                urgente=urgente,
                riferimento_id=rif,
            )
            db.flush()
            risultati.append(_notifica_dict(n, giorni_rimanenti=gg))
        else:
            risultati.append(_notifica_dict(esistente, giorni_rimanenti=gg))

    return risultati


@router.get("")
def lista_notifiche(
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    # Genera e/o aggiorna notifiche SAL scadenza per l'utente corrente
    sal_notifiche = _genera_notifiche_sal_scadenza(db, utente)
    db.commit()

    # Recupera notifiche non lette + quelle che richiedono ancora un'azione
    notifiche_db = db.query(Notifica).filter(
        Notifica.persona_id == utente.id,
        or_(Notifica.letta == False, Notifica.richiede_azione == True),
    ).order_by(Notifica.created_at.desc()).limit(50).all()

    # Mappa id → giorni_rimanenti per le SAL
    gg_map = {n["id"]: n["giorni_rimanenti"] for n in sal_notifiche}

    risultato = [
        _notifica_dict(n, giorni_rimanenti=gg_map.get(str(n.id)))
        for n in notifiche_db
    ]

    return {
        "data": risultato,
        "meta": {"totale": len(risultato)},
    }


@router.post("/{id}/letta")
def segna_letta(
    id: str,
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    n = db.query(Notifica).filter(
        Notifica.id == id,
        Notifica.persona_id == utente.id,
    ).first()
    if n:
        n.letta = True
        db.commit()
    return {"data": {"ok": True}}


@router.post("/leggi-tutte")
def segna_tutte_lette(
    db: Session = Depends(get_db),
    utente: Persona = Depends(tutti_i_ruoli),
):
    db.query(Notifica).filter(
        Notifica.persona_id == utente.id,
    ).update({"letta": True, "richiede_azione": False})
    db.commit()
    return {"data": {"ok": True}}
