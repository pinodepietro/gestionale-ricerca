# backend/app/models/struttura.py
import uuid
from sqlalchemy import String, Date, Text, ForeignKey, Column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class WorkPackage(Base):
    __tablename__ = "work_package"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    progetto_id = Column(UUID(as_uuid=True), ForeignKey("progetto.id"), nullable=False)
    codice = Column(String(20), nullable=False)
    titolo = Column(String(200), nullable=False)
    descrizione = Column(Text, nullable=True)
    data_inizio = Column(Date, nullable=False)
    data_fine = Column(Date, nullable=False)
    partner_lead_id = Column(UUID(as_uuid=True), ForeignKey("partner.id"), nullable=True)
    responsabile_id = Column(UUID(as_uuid=True), ForeignKey("persona.id"), nullable=True)
    stato = Column(String(20), nullable=False, default="pianificato")

    progetto = relationship("Progetto", back_populates="work_packages")
    task = relationship("Task", back_populates="wp", cascade="all, delete-orphan")
    deliverable = relationship("Deliverable", back_populates="wp")
    milestone = relationship("Milestone", back_populates="wp")


class Task(Base):
    __tablename__ = "task"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wp_id = Column(UUID(as_uuid=True), ForeignKey("work_package.id"), nullable=False)
    codice = Column(String(20), nullable=False)
    titolo = Column(String(200), nullable=False)
    descrizione = Column(Text, nullable=True)
    data_inizio = Column(Date, nullable=False)
    data_fine = Column(Date, nullable=False)
    stato = Column(String(20), nullable=False, default="pianificato")
    responsabile_id = Column(UUID(as_uuid=True), ForeignKey("persona.id"), nullable=True)

    wp = relationship("WorkPackage", back_populates="task")


class Deliverable(Base):
    __tablename__ = "deliverable"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    progetto_id = Column(UUID(as_uuid=True), ForeignKey("progetto.id"), nullable=False)
    wp_id = Column(UUID(as_uuid=True), ForeignKey("work_package.id"), nullable=True)
    codice = Column(String(20), nullable=False)
    titolo = Column(String(200), nullable=False)
    tipo = Column(String(50), nullable=False)
    data_scadenza = Column(Date, nullable=False)
    data_consegna = Column(Date, nullable=True)
    stato = Column(String(20), nullable=False, default="atteso")
    responsabile_id = Column(UUID(as_uuid=True), ForeignKey("persona.id"), nullable=True)
    path_file = Column(String(500), nullable=True)

    wp = relationship("WorkPackage", back_populates="deliverable")


class Milestone(Base):
    __tablename__ = "milestone"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    progetto_id = Column(UUID(as_uuid=True), ForeignKey("progetto.id"), nullable=False)
    wp_id = Column(UUID(as_uuid=True), ForeignKey("work_package.id"), nullable=True)
    codice = Column(String(20), nullable=False)
    titolo = Column(String(200), nullable=False)
    data_prevista = Column(Date, nullable=False)
    data_effettiva = Column(Date, nullable=True)
    stato = Column(String(20), nullable=False, default="attesa")

    wp = relationship("WorkPackage", back_populates="milestone")
