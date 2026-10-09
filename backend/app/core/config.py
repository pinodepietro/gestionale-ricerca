# backend/app/core/config.py
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_EXPIRE_MINUTES: int = 480
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5180"
    UPLOAD_DIR: str = "/app/uploads"
    SYNC_API_KEY: str
    MISSIONI_URL: str = "http://missioni:8001"

    def __init__(self, **data):
        super().__init__(**data)
        # Validate JWT_SECRET strength (SECURITY: prevent weak secrets in production)
        # Allow weak secrets only in development/test environments
        if os.getenv("ENVIRONMENT", "development") == "production":
            if len(self.JWT_SECRET) < 32:
                raise ValueError(
                    "JWT_SECRET must be at least 32 characters long in production. "
                    "Use: openssl rand -base64 32"
                )
            if len(self.SYNC_API_KEY) < 32:
                raise ValueError(
                    "SYNC_API_KEY must be at least 32 characters long in production. "
                    "Use: openssl rand -base64 32"
                )

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
