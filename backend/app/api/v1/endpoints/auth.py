# backend/app/api/v1/endpoints/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import verifica_password, crea_access_token, hash_password
from app.core.deps import get_utente_corrente
from app.models.persona import Persona

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    nome: str
    cognome: str
    email: str
    ruolo: str

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


@router.post("/login", response_model=dict)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    persona = db.query(Persona).filter(
        Persona.email == payload.email,
        Persona.attivo == True,
    ).first()

    if not persona or not persona.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "AUTH_CREDENZIALI_NON_VALIDE", "message": "Email o password non corretti"}},
        )

    if not verifica_password(payload.password, persona.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "AUTH_CREDENZIALI_NON_VALIDE", "message": "Email o password non corretti"}},
        )

    token = crea_access_token({"sub": str(persona.id), "email": persona.email, "ruolo": persona.ruolo})

    return {
        "data": {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": str(persona.id),
                "nome": persona.nome,
                "cognome": persona.cognome,
                "email": persona.email,
                "ruolo": persona.ruolo,
                "deve_cambiare_password": bool(getattr(persona, 'deve_cambiare_password', False)),
            },
        }
    }


@router.post("/cambia-password")
def cambia_password(
    payload: dict,
    db: Session = Depends(get_db),
    utente: Persona = Depends(get_utente_corrente),
):
    vecchia = payload.get("password_vecchia", "")
    nuova = payload.get("password_nuova", "")

    if not nuova or len(nuova) < 6:
        raise HTTPException(status_code=422, detail={"error": {
            "code": "PASSWORD_TROPPO_CORTA",
            "message": "La nuova password deve essere di almeno 6 caratteri"
        }})

    if not verifica_password(vecchia, utente.password_hash):
        raise HTTPException(status_code=401, detail={"error": {
            "code": "PASSWORD_ERRATA",
            "message": "La password attuale non e corretta"
        }})

    utente.password_hash = hash_password(nuova)
    utente.deve_cambiare_password = False
    db.commit()
    return {"data": {"message": "Password cambiata con successo"}}
