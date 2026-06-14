# backend/app/models/progetto.py
import uuid
from sqlalchemy import String, Boolean, Date, Numeric, Text, ForeignKey, Column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class Progetto(Base):
    __tablename__ = "progetto"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codice = Column(String(50), nullable=False, unique=True, index=True)
    titolo = Column(Text, nullable=False)
    acronimo = Column(String(30), nullable=True)
    descrizione = Column(Text, nullable=True)
    tipo = Column(String(30), nullable=False)
    data_inizio = Column(Date, nullable=False)
    data_fine = Column(Date, nullable=False)
    data_fine_rendicontazione = Column(Date, nullable=True)
    stato = Column(String(20), nullable=False, default="bozza")
    costo_totale = Column(Numeric(14, 2), nullable=False)
    importo_finanziato = Column(Numeric(14, 2), nullable=False)
    cup = Column(String(20), nullable=True)
    budget_per_partner = Column(Boolean, nullable=False, default=False)
    template_timesheet_id = Column(UUID(as_uuid=True), ForeignKey("template_timesheet.id"), nullable=True)
    riferimento_bando = Column(Text, nullable=True)
    note = Column(Text, nullable=True)
    amministrativo_id = Column(UUID(as_uuid=True), ForeignKey('persona.id'), nullable=True)
    pi_id = Column(UUID(as_uuid=True), ForeignKey('persona.id'), nullable=True)
    dipartimento_id = Column(UUID(as_uuid=True), ForeignKey('dipartimento.id'), nullable=True)

    # Relazioni con cascade delete
    partner = relationship("ProgettoPartner", back_populates="progetto", cascade="all, delete-orphan")
    work_packages = relationship("WorkPackage", back_populates="progetto", cascade="all, delete-orphan")
    budget_voci = relationship("BudgetVoce", back_populates="progetto", cascade="all, delete-orphan")
    allocazioni = relationship("Allocazione", back_populates="progetto", cascade="all, delete-orphan")
    documenti = relationship("DocumentoProgetto", back_populates="progetto", cascade="all, delete-orphan")
    sal = relationship("Sal", back_populates="progetto", cascade="all, delete-orphan")
    spese = relationship("Spesa", back_populates="progetto", cascade="all, delete-orphan")

    # Relazioni
    work_packages = relationship("WorkPackage", back_populates="progetto", cascade="all, delete-orphan")
    budget_voci = relationship("BudgetVoce", back_populates="progetto", cascade="all, delete-orphan")
    spese = relationship("Spesa", back_populates="progetto")
    sal = relationship("Sal", back_populates="progetto", order_by="Sal.numero")
    allocazioni = relationship("Allocazione", back_populates="progetto")
    documenti = relationship("DocumentoProgetto", back_populates="progetto")
    partner = relationship("ProgettoPartner", back_populates="progetto")
    erogazioni = relationship("Erogazione", back_populates="progetto", cascade="all, delete-orphan")
    dipartimento = relationship("Dipartimento", foreign_keys=[dipartimento_id])
