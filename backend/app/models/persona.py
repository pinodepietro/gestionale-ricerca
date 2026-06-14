# backend/app/models/persona.py
import uuid
from sqlalchemy import String, Boolean, Date, Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class Persona(Base):
    __tablename__ = "persona"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(100), nullable=False)
    cognome = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False, unique=True, index=True)
    username = Column(String(100), nullable=False, unique=True, index=True)
    password_hash = Column(String(200), nullable=True)
    codice_fiscale = Column(String(16), nullable=True)
    ruolo = Column(String(30), nullable=False)
    ruolo_ente = Column(String(100), nullable=True)
    livello_contratto = Column(String(50), nullable=True)
    data_inizio_servizio = Column(Date, nullable=True)
    ssd = Column(String(100), nullable=True)
    dipartimento_id = Column(UUID(as_uuid=True), ForeignKey('dipartimento.id'), nullable=True)
    attivo = Column(Boolean, nullable=False, default=True)
    deve_cambiare_password = Column(Boolean, nullable=False, default=False)

    costi_orari = relationship(
        "CostoOrarioPersona",
        back_populates="persona",
        foreign_keys="[CostoOrarioPersona.persona_id]",
        order_by="CostoOrarioPersona.data_inizio.desc()",
    )
    monte_ore = relationship("MonteOreAnnuale", back_populates="persona")
    allocazioni = relationship("Allocazione", back_populates="persona")
