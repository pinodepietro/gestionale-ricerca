# backend/app/models/autorizzazione_spesa.py
import uuid
from sqlalchemy import String, Boolean, Date, Numeric, Text, ForeignKey, Column, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Dipartimento(Base):
    __tablename__ = "dipartimento"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(200), nullable=False)
    direttore_id = Column(UUID(as_uuid=True), ForeignKey("persona.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    direttore = relationship("Persona", foreign_keys=[direttore_id])


class RichiestaAutorizzazioneSpesa(Base):
    __tablename__ = "richiesta_autorizzazione_spesa"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tipo = Column(String(20), nullable=False)                          # progetto | fondi_individuali
    progetto_id = Column(UUID(as_uuid=True), ForeignKey("progetto.id"), nullable=True)
    dipartimento_id = Column(UUID(as_uuid=True), ForeignKey("dipartimento.id"), nullable=False)
    richiedente_id = Column(UUID(as_uuid=True), ForeignKey("persona.id"), nullable=False)
    qualita_richiedente = Column(String(30), nullable=False)           # professore_ordinario | professore_associato | ricercatore
    tipo_contratto = Column(String(20), nullable=False)                # pieno | definito
    qualita_progetto = Column(String(100), nullable=True)
    macrocategoria = Column(String(30), nullable=False)                # personale | spese_generali | consulenze_servizi | strumentazioni
    voce_lettera = Column(String(1), nullable=False)                   # a-u
    voce_altro = Column(Text, nullable=True)
    oggetto = Column(String(500), nullable=False)
    descrizione = Column(Text, nullable=False)
    importo = Column(Numeric(14, 2), nullable=False)
    durata_da = Column(Date, nullable=True)
    durata_a = Column(Date, nullable=True)
    termini_pagamento = Column(Text, nullable=True)
    anticipazione_spesa = Column(Boolean, nullable=False, default=False)
    allegato_voce_g = Column(String(500), nullable=True)
    allegato_preventivo = Column(String(500), nullable=True)
    budget_voce_id = Column(UUID(as_uuid=True), ForeignKey("budget_voce.id"), nullable=True)
    stato = Column(String(30), nullable=False, default="bozza")
    motivazione_rigetto = Column(Text, nullable=True)
    impegno_id = Column(UUID(as_uuid=True), ForeignKey("impegno.id"), nullable=True)
    pdf_path = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    progetto = relationship("Progetto", foreign_keys=[progetto_id])
    dipartimento = relationship("Dipartimento", foreign_keys=[dipartimento_id])
    richiedente = relationship("Persona", foreign_keys=[richiedente_id])
    budget_voce = relationship("BudgetVoce", foreign_keys=[budget_voce_id])
