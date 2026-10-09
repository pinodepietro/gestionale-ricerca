# backend/app/core/deps.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verifica_token
from app.models.persona import Persona
from app.models.ruolo import RuoloEnum

bearer_scheme = HTTPBearer()

# Usa RuoloEnum per accesso centralizzato ai ruoli validi
RUOLI = RuoloEnum.values()


def get_utente_corrente(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Persona:
    payload = verifica_token(credentials.credentials)
    persona_id: str = payload.get("sub")
    if not persona_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "AUTH_TOKEN_EXPIRED", "message": "Token non valido"}},
        )
    persona = db.query(Persona).filter(Persona.id == persona_id, Persona.attivo == True).first()
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "AUTH_TOKEN_EXPIRED", "message": "Utente non trovato o disattivato"}},
        )

    # Valida che il ruolo dell'utente sia in RuoloEnum
    if not RuoloEnum.is_valid(persona.ruolo):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {
                "code": "INVALID_USER_ROLE",
                "message": f"Ruolo utente '{persona.ruolo}' non valido",
                "detail": {"ruolo": persona.ruolo, "ruoli_validi": list(RuoloEnum.values())},
            }},
        )

    return persona


def richiedi_ruolo(*ruoli_ammessi: str):
    def _check(utente: Persona = Depends(get_utente_corrente)) -> Persona:
        if utente.ruolo not in ruoli_ammessi:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": {
                    "code": "RBAC_AZIONE_NON_CONSENTITA",
                    "message": f"Il ruolo '{utente.ruolo}' non può eseguire questa operazione",
                    "detail": {"ruolo": utente.ruolo, "richiede": list(ruoli_ammessi)},
                }},
            )
        return utente
    return _check


def solo_amministrativo(utente: Persona = Depends(richiedi_ruolo("amministrativo", "superadmin"))) -> Persona:
    return utente

def amministrativo_o_pi(utente: Persona = Depends(richiedi_ruolo("amministrativo", "pi", "superadmin"))) -> Persona:
    return utente

def tutti_i_ruoli(utente: Persona = Depends(get_utente_corrente)) -> Persona:
    return utente

def solo_direttore_generale(utente: Persona = Depends(richiedi_ruolo("direttore_generale"))) -> Persona:
    return utente

def solo_superadmin(utente: Persona = Depends(richiedi_ruolo("superadmin"))) -> Persona:
    return utente
