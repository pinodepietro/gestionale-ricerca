# backend/app/models/timesheet.py
import uuid
from sqlalchemy import String, Integer, Numeric, Text, ForeignKey, Column, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy import DateTime
from app.core.database import Base


class TemplateTimesheet(Base):
    __tablename__ = "template_timesheet"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(100), nullable=False)
    granularita = Column(String(20), nullable=False)   # mensile / giornaliero
    righe_wp_task = Column(Boolean, nullable=False, default=True)
    riga_altri_progetti = Column(Boolean, nullable=False, default=True)
    riga_ordinaria = Column(Boolean, nullable=False, default=True)
    riga_assenze = Column(Boolean, nullable=False, default=True)
    num_firmatari = Column(Integer, nullable=False, default=2)
    etichetta_firmatario_1 = Column(String(100), nullable=False, default="Firma Dipendente")
    etichetta_firmatario_2 = Column(String(100), nullable=True)
    etichetta_firmatario_3 = Column(String(100), nullable=True)
    file_template_path = Column(String(500), nullable=True)
    ente_finanziatore = Column(String(200), nullable=True)


class TimesheetTestata(Base):
    __tablename__ = "timesheet_testata"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    persona_id = Column(UUID(as_uuid=True), ForeignKey("persona.id"), nullable=False)
    progetto_id = Column(UUID(as_uuid=True), ForeignKey("progetto.id"), nullable=False)
    template_id = Column(UUID(as_uuid=True), ForeignKey("template_timesheet.id"), nullable=False)
    anno = Column(Integer, nullable=False)
    mese = Column(Integer, nullable=False)
    sal_id = Column(UUID(as_uuid=True), ForeignKey("sal.id"), nullable=True)
    granularita = Column(String(20), nullable=False, default="mensile")
    stato = Column(String(20), nullable=False, default="bozza")
    inviato_at = Column(DateTime(timezone=True), nullable=True)
    approvato_at = Column(DateTime(timezone=True), nullable=True)
    xlsx_path = Column(String(500), nullable=True)

    righe = relationship("TimesheetRiga", back_populates="testata",
                         cascade="all, delete-orphan", order_by="TimesheetRiga.ordine")
    approvazioni = relationship("ApprovazioneTimesheet", back_populates="testata",
                                order_by="ApprovazioneTimesheet.ordine_firma")


class TimesheetRiga(Base):
    __tablename__ = "timesheet_riga"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    testata_id = Column(UUID(as_uuid=True), ForeignKey("timesheet_testata.id"), nullable=False)
    tipo_riga = Column(String(20), nullable=False)
    wp_id = Column(UUID(as_uuid=True), ForeignKey("work_package.id"), nullable=True)
    task_id = Column(UUID(as_uuid=True), ForeignKey("task.id"), nullable=True)
    progetto_correlato_id = Column(UUID(as_uuid=True), ForeignKey("progetto.id"), nullable=True)
    descrizione_libera = Column(Text, nullable=True)
    ordine = Column(Integer, nullable=False, default=0)

    testata = relationship("TimesheetTestata", back_populates="righe")
    celle = relationship("TimesheetCella", back_populates="riga",
                         cascade="all, delete-orphan", order_by="TimesheetCella.giorno")


class TimesheetCella(Base):
    __tablename__ = "timesheet_cella"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    riga_id = Column(UUID(as_uuid=True), ForeignKey("timesheet_riga.id"), nullable=False)
    giorno = Column(Integer, nullable=False)   # 0 = totale mese, 1-31 giornaliero
    ore = Column(Numeric(4, 2), nullable=False, default=0)
    costo_orario_applicato = Column(Numeric(8, 2), nullable=True)   # snapshot all'approvazione
    costo_calcolato = Column(Numeric(10, 2), nullable=True)

    riga = relationship("TimesheetRiga", back_populates="celle")


class ApprovazioneTimesheet(Base):
    __tablename__ = "approvazione_timesheet"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    testata_id = Column(UUID(as_uuid=True), ForeignKey("timesheet_testata.id"), nullable=False)
    approvatore_id = Column(UUID(as_uuid=True), ForeignKey("persona.id"), nullable=False)
    ruolo_firma = Column(String(100), nullable=False)
    ordine_firma = Column(Integer, nullable=False)
    esito = Column(String(20), nullable=True)   # null finché non ha firmato
    data = Column(DateTime(timezone=True), nullable=True)
    note = Column(Text, nullable=True)

    testata = relationship("TimesheetTestata", back_populates="approvazioni")
