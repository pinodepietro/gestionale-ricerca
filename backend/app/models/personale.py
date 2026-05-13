# backend/app/models/personale.py
import uuid
from sqlalchemy import String, Date, Numeric, Text, ForeignKey, Column, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy import DateTime
from app.core.database import Base


class CostoOrarioPersona(Base):
    __tablename__ = "costo_orario_persona"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    persona_id = Column(UUID(as_uuid=True), ForeignKey("persona.id"), nullable=False)
    costo_orario = Column(Numeric(8, 2), nullable=False)
    data_inizio = Column(Date, nullable=False)
    data_fine = Column(Date, nullable=True)   # null = ancora in vigore
    motivazione = Column(String(200), nullable=True)
    inserito_da = Column(UUID(as_uuid=True), ForeignKey("persona.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    persona = relationship("Persona", back_populates="costi_orari", foreign_keys=[persona_id])


class MonteOreAnnuale(Base):
    __tablename__ = "monte_ore_annuale"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    persona_id = Column(UUID(as_uuid=True), ForeignKey("persona.id"), nullable=False)
    anno = Column(Integer, nullable=False)
    ore_disponibili = Column(Numeric(8, 2), nullable=False)
    ore_allocate = Column(Numeric(8, 2), nullable=False, default=0)

    persona = relationship("Persona", back_populates="monte_ore")


class Allocazione(Base):
    __tablename__ = "allocazione"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    persona_id = Column(UUID(as_uuid=True), ForeignKey("persona.id"), nullable=False)
    progetto_id = Column(UUID(as_uuid=True), ForeignKey("progetto.id"), nullable=False)
    ore_assegnate = Column(Numeric(8, 2), nullable=False)
    data_inizio = Column(Date, nullable=False)
    data_fine = Column(Date, nullable=False)
    note = Column(Text, nullable=True)
    is_pi = Column(Boolean, nullable=False, default=False)
    is_ammin = Column(Boolean, nullable=False, default=False)

    persona = relationship("Persona", back_populates="allocazioni")
    progetto = relationship("Progetto", back_populates="allocazioni")
