# backend/app/models/budget.py
import uuid
from sqlalchemy import String, Date, Numeric, Text, ForeignKey, Column, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class VoceDiCosto(Base):
    __tablename__ = "voce_di_costo"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codice = Column(String(20), nullable=False, unique=True)
    descrizione = Column(String(200), nullable=False)
    categoria = Column(String(50), nullable=False)
    ammissibile_horizon = Column(String, nullable=False, default=True)
    ammissibile_pnrr = Column(String, nullable=False, default=True)
    ammissibile_por = Column(String, nullable=False, default=True)


class BudgetVoce(Base):
    __tablename__ = "budget_voce"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    progetto_id = Column(UUID(as_uuid=True), ForeignKey("progetto.id"), nullable=False)
    voce_id = Column(UUID(as_uuid=True), ForeignKey("voce_di_costo.id"), nullable=False)
    partner_id = Column(UUID(as_uuid=True), ForeignKey("partner.id"), nullable=True)
    importo_previsto = Column(Numeric(14, 2), nullable=False, default=0)
    importo_rendicontato = Column(Numeric(14, 2), nullable=False, default=0)

    progetto = relationship("Progetto", back_populates="budget_voci")
    voce = relationship("VoceDiCosto")


class Spesa(Base):
    __tablename__ = "spesa"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    progetto_id = Column(UUID(as_uuid=True), ForeignKey("progetto.id"), nullable=False)
    voce_id = Column(UUID(as_uuid=True), ForeignKey("voce_di_costo.id"), nullable=False)
    persona_id = Column(UUID(as_uuid=True), ForeignKey("persona.id"), nullable=True)
    partner_id = Column(UUID(as_uuid=True), ForeignKey("partner.id"), nullable=True)
    sal_id = Column(UUID(as_uuid=True), ForeignKey("sal.id"), nullable=True)
    spesa_origine_id = Column(UUID(as_uuid=True), ForeignKey("spesa.id"), nullable=True)
    importo = Column(Numeric(14, 2), nullable=False)
    data = Column(Date, nullable=False)
    numero_documento = Column(String(50), nullable=True)
    descrizione = Column(Text, nullable=True)
    stato = Column(String(20), nullable=False, default="registrata")
    allegato_path = Column(String(500), nullable=True)

    progetto = relationship("Progetto", back_populates="spese")
    voce = relationship("VoceDiCosto")
    sal = relationship("Sal", back_populates="spese")


class Sal(Base):
    __tablename__ = "sal"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    progetto_id = Column(UUID(as_uuid=True), ForeignKey("progetto.id"), nullable=False)
    numero = Column(Integer, nullable=False)
    data_inizio = Column(Date, nullable=False)
    data_fine = Column(Date, nullable=False)
    stato = Column(String(20), nullable=False, default="aperto")
    importo_tranche = Column(Numeric(14, 2), nullable=True)
    importo_erogato = Column(Numeric(14, 2), nullable=True)
    data_erogazione = Column(Date, nullable=True)
    data_scadenza_rendiconto = Column(Date, nullable=True)
    motivo_contestazione = Column(Text, nullable=True)

    progetto = relationship("Progetto", back_populates="sal")
    spese = relationship("Spesa", back_populates="sal", foreign_keys="[Spesa.sal_id]")
