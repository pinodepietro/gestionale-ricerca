# backend/app/services/notifiche.py
import uuid
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy.orm import Session
from app.models.notifica import Notifica
from app.core.config import settings

logger = logging.getLogger(__name__)


def crea_notifica(
    db: Session,
    persona_id,
    tipo: str,
    titolo: str,
    messaggio: str,
    link: str = None,
    urgente: bool = False,
    riferimento_id: str = None,
    richiede_azione: bool = False,
) -> Notifica:
    n = Notifica(
        id=uuid.uuid4(),
        persona_id=persona_id,
        tipo=tipo,
        titolo=titolo,
        messaggio=messaggio,
        link=link,
        urgente=urgente,
        riferimento_id=riferimento_id,
        richiede_azione=richiede_azione,
    )
    db.add(n)
    return n


def segna_lette_per_link(db: Session, persona_id, link: str) -> None:
    """Marca come lette e chiude richiede_azione per le notifiche di persona_id che puntano a link."""
    db.query(Notifica).filter(
        Notifica.persona_id == persona_id,
        Notifica.link == link,
    ).update({"letta": True, "richiede_azione": False})


def invia_email(destinatario: str, titolo: str, messaggio: str) -> None:
    if not settings.SMTP_HOST or not destinatario:
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[Gestionale Ricerca] {titolo}"
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = destinatario

        testo = f"{titolo}\n\n{messaggio}\n\n---\nGestionale Progetti di Ricerca"
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
          <div style="background:#185FA5;padding:16px 24px">
            <span style="color:#fff;font-size:16px;font-weight:700">Gestionale Ricerca</span>
          </div>
          <div style="padding:24px;background:#fafafa;border:1px solid #e0e0e0">
            <h2 style="color:#333;margin-top:0">{titolo}</h2>
            <p style="color:#555;line-height:1.6">{messaggio}</p>
          </div>
        </div>"""

        msg.attach(MIMEText(testo, "plain"))
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as s:
            if settings.SMTP_TLS:
                s.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            s.sendmail(settings.EMAIL_FROM, destinatario, msg.as_string())
    except Exception as exc:
        logger.warning("Email non inviata a %s: %s", destinatario, exc)
