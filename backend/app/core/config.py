# backend/app/core/config.py
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://dev:dev@db:5432/gestionale_ricerca"
    JWT_SECRET: str = "dev-secret-change-in-prod"
    JWT_EXPIRE_MINUTES: int = 480
    # Stringa semplice — evita problemi di parsing JSON con pydantic-settings.
    # Per più origini separate da virgola: http://localhost:5173,https://gestionale.ateneo.it
    ALLOWED_ORIGINS: str = "http://localhost:5173"
    UPLOAD_DIR: str = "/app/uploads"

    # LDAP — opzionali, vuoti in sviluppo
    LDAP_URL: str = ""
    LDAP_BASE_DN: str = ""
    LDAP_BIND_DN: str = ""
    LDAP_BIND_PASSWORD: str = ""

    # Email — opzionali, disabilitati se SMTP_HOST vuoto
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_TLS: bool = True
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@gestionale-ricerca.it"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
