# backend/app/models/proposta.py
import uuid
from sqlalchemy import String, Date, Numeric, Text, ForeignKey, Column, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Proposta(Base):
    __tablename__ = "proposta"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    acronimo = Column(String(30), nullable=True)
    titolo = Column(Text, nullable=False)
    bando = Column(Text, nullable=False)
    data_scadenza_bando = Column(Date, nullable=False)
    responsabile_scientifico_id = Column(UUID(as_uuid=True), ForeignKey("persona.id"), nullable=False)
    descrizione = Column(String(500), nullable=True)
    data_inizio_prevista = Column(Date, nullable=True)
    durata_mesi = Column(Integer, nullable=True)
    costo_totale = Column(Numeric(14, 2), nullable=True)
    importo_finanziato = Column(Numeric(14, 2), nullable=True)
    importo_cofinanziato = Column(Numeric(14, 2), nullable=True)
    importo_personale_interno = Column(Numeric(14, 2), nullable=True)
    importo_overhead = Column(Numeric(14, 2), nullable=True)
    stato = Column(String(20), nullable=False, default="in_preparazione")
    created_by = Column(UUID(as_uuid=True), ForeignKey("persona.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    responsabile_scientifico = relationship("Persona", foreign_keys=[responsabile_scientifico_id])
    partner = relationship("PropostaPartner", back_populates="proposta", cascade="all, delete-orphan")


class PropostaPartner(Base):
    __tablename__ = "proposta_partner"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposta_id = Column(UUID(as_uuid=True), ForeignKey("proposta.id"), nullable=False)
    denominazione = Column(String(200), nullable=False)
    tipologia = Column(String(100), nullable=False)
    ruolo = Column(String(30), nullable=False)
    nazionalita = Column(String(100), nullable=True)
    sito_web = Column(String(200), nullable=True)

    proposta = relationship("Proposta", back_populates="partner")
