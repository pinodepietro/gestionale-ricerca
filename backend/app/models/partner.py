# backend/app/models/partner.py
import uuid
from sqlalchemy import String, Date, Numeric, ForeignKey, Column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class TipoProgetto(Base):
    __tablename__ = "tipo_progetto"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(255), nullable=False, unique=True)


class Partner(Base):
    __tablename__ = "partner"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(200), nullable=False)
    codice_fiscale = Column(String(20), nullable=True)
    tipo = Column(String(30), nullable=False)
    paese = Column(String(2), nullable=False, default="IT")
    referente_nome = Column(String(100), nullable=True)
    referente_email = Column(String(100), nullable=True)


class ProgettoPartner(Base):
    __tablename__ = "progetto_partner"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    progetto_id = Column(UUID(as_uuid=True), ForeignKey("progetto.id"), nullable=False)
    partner_id = Column(UUID(as_uuid=True), ForeignKey("partner.id"), nullable=False)
    ruolo = Column(String(30), nullable=False)
    budget_assegnato = Column(Numeric(14, 2), nullable=True)

    progetto = relationship("Progetto", back_populates="partner")
    partner = relationship("Partner")


class TipoFinanziamento(Base):
    __tablename__ = "tipo_finanziamento"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(100), nullable=False)
    categoria = Column(String(50), nullable=False)
    ente_erogante = Column(String(100), nullable=True)
    template_timesheet_id = Column(UUID(as_uuid=True), ForeignKey("template_timesheet.id"), nullable=True)
    note_rendicontazione = Column(String, nullable=True)


class Finanziamento(Base):
    __tablename__ = "finanziamento"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    progetto_id = Column(UUID(as_uuid=True), ForeignKey("progetto.id"), nullable=False)
    tipo_id = Column(UUID(as_uuid=True), ForeignKey("tipo_finanziamento.id"), nullable=False)
    importo = Column(Numeric(14, 2), nullable=False)
    riferimento_contratto = Column(String(100), nullable=True)
    data_stipula = Column(Date, nullable=True)
