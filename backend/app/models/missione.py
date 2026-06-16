# backend/app/models/missione.py
import uuid
from sqlalchemy import String, Date, Time, Numeric, Text, Boolean, Integer, ForeignKey, Column, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class QualificaMissione(Base):
    __tablename__ = "qualifica_missione"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    gruppo = Column(String(1), nullable=False)
    codice = Column(String(20), nullable=False)
    nome = Column(String(200), nullable=False)
    attiva = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Missione(Base):
    __tablename__ = "missione"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    titolo = Column(String(200), nullable=False)
    destinazione = Column(String(200), nullable=False)
    motivo = Column(Text, nullable=False)
    data_inizio = Column(Date, nullable=True)
    data_fine = Column(Date, nullable=True)
    ora_inizio = Column(Time, nullable=True)
    ora_fine = Column(Time, nullable=True)
    stato = Column(String(20), nullable=False, default="bozza")
    progetto_id = Column(UUID(as_uuid=True), ForeignKey("progetto.id"), nullable=False)
    richiedente_id = Column(UUID(as_uuid=True), ForeignKey("persona.id"), nullable=False)
    gruppo_missione = Column(String(1), nullable=True)
    copertura_tipo = Column(String(30), nullable=False)
    copertura_descrizione = Column(Text, nullable=True)
    mezzo_tipo = Column(String(20), nullable=False)
    mezzo_descrizione = Column(String(250), nullable=True)
    auto_alimentazione = Column(String(50), nullable=True)
    auto_cilindrata = Column(String(50), nullable=True)
    motivazione_mezzo_straordinario = Column(Text, nullable=True)
    importo_stimato = Column(Numeric(12, 2), nullable=True)
    voce_impegno = Column(String(20), nullable=True)
    impegno_gestionale_id = Column(UUID(as_uuid=True), nullable=True)
    luogo_approvazione = Column(String(255), nullable=True)
    note_approvazione = Column(Text, nullable=True)
    pdf_path = Column(String(500), nullable=True)
    inviata_il = Column(DateTime(timezone=True), nullable=True)
    approvata_il = Column(DateTime(timezone=True), nullable=True)
    respinta_il = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    progetto = relationship("Progetto", foreign_keys=[progetto_id])
    richiedente = relationship("Persona", foreign_keys=[richiedente_id])
    rimborso = relationship("RimborsoMissione", back_populates="missione", uselist=False)
    step_approvazione = relationship("StepApprovazioneMissione", back_populates="missione",
                                     foreign_keys="[StepApprovazioneMissione.missione_id]",
                                     cascade="all, delete-orphan")
    allegati = relationship("AllegatoMissione", back_populates="missione",
                            foreign_keys="[AllegatoMissione.missione_id]",
                            cascade="all, delete-orphan")


class RimborsoMissione(Base):
    __tablename__ = "rimborso_missione"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    missione_id = Column(UUID(as_uuid=True), ForeignKey("missione.id"), nullable=False, unique=True)
    richiedente_id = Column(UUID(as_uuid=True), ForeignKey("persona.id"), nullable=False)
    stato = Column(String(20), nullable=False, default="bozza")
    note = Column(Text, nullable=True)
    ciclo = Column(Integer, nullable=False, default=1)
    scheda_finanziaria_path = Column(String(500), nullable=True)
    pdf_path = Column(String(500), nullable=True)
    inviata_il = Column(DateTime(timezone=True), nullable=True)
    approvata_il = Column(DateTime(timezone=True), nullable=True)
    respinta_il = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    missione = relationship("Missione", back_populates="rimborso")
    richiedente = relationship("Persona", foreign_keys=[richiedente_id])
    righe = relationship("RigaRimborsoMissione", back_populates="rimborso",
                         cascade="all, delete-orphan", order_by="RigaRimborsoMissione.data_inizio")
    step_approvazione = relationship("StepApprovazioneMissione", back_populates="rimborso",
                                     foreign_keys="[StepApprovazioneMissione.rimborso_missione_id]",
                                     cascade="all, delete-orphan")
    allegati = relationship("AllegatoMissione", back_populates="rimborso",
                            foreign_keys="[AllegatoMissione.rimborso_missione_id]",
                            cascade="all, delete-orphan")


class RigaRimborsoMissione(Base):
    __tablename__ = "riga_rimborso_missione"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rimborso_missione_id = Column(UUID(as_uuid=True), ForeignKey("rimborso_missione.id", ondelete="CASCADE"), nullable=False)
    data_inizio = Column(Date, nullable=False)
    data_fine = Column(Date, nullable=False)
    attivita = Column(String(255), nullable=False)
    importo = Column(Numeric(12, 2), nullable=True)
    documento_path = Column(String(500), nullable=True)
    documento_nome_originale = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    rimborso = relationship("RimborsoMissione", back_populates="righe")


class StepApprovazioneMissione(Base):
    __tablename__ = "step_approvazione_missione"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    missione_id = Column(UUID(as_uuid=True), ForeignKey("missione.id", ondelete="CASCADE"), nullable=True)
    rimborso_missione_id = Column(UUID(as_uuid=True), ForeignKey("rimborso_missione.id", ondelete="CASCADE"), nullable=True)
    approvatore_id = Column(UUID(as_uuid=True), ForeignKey("persona.id"), nullable=False)
    ruolo = Column(String(10), nullable=False)
    decisione = Column(String(10), nullable=False)
    luogo_firma = Column(String(100), nullable=True)
    note = Column(Text, nullable=True)
    ciclo = Column(Integer, nullable=False, default=1)
    decided_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    approvatore = relationship("Persona", foreign_keys=[approvatore_id])
    missione = relationship("Missione", back_populates="step_approvazione", foreign_keys=[missione_id])
    rimborso = relationship("RimborsoMissione", back_populates="step_approvazione", foreign_keys=[rimborso_missione_id])


class AllegatoMissione(Base):
    __tablename__ = "allegato_missione"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tipo = Column(String(20), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_nome_originale = Column(String(255), nullable=True)
    missione_id = Column(UUID(as_uuid=True), ForeignKey("missione.id", ondelete="CASCADE"), nullable=True)
    rimborso_missione_id = Column(UUID(as_uuid=True), ForeignKey("rimborso_missione.id", ondelete="CASCADE"), nullable=True)
    caricato_da = Column(UUID(as_uuid=True), ForeignKey("persona.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    missione = relationship("Missione", back_populates="allegati", foreign_keys=[missione_id])
    rimborso = relationship("RimborsoMissione", back_populates="allegati", foreign_keys=[rimborso_missione_id])
    caricato_da_persona = relationship("Persona", foreign_keys=[caricato_da])
