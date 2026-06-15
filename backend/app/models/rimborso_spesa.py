# backend/app/models/rimborso_spesa.py
import uuid
from sqlalchemy import String, Date, Numeric, Text, ForeignKey, Column, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class RichiestaRimborsoSpesa(Base):
    __tablename__ = "richiesta_rimborso_spesa"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    richiesta_autorizzazione_spesa_id = Column(UUID(as_uuid=True), ForeignKey("richiesta_autorizzazione_spesa.id"), nullable=False)
    richiedente_id = Column(UUID(as_uuid=True), ForeignKey("persona.id"), nullable=False)
    stato = Column(String(30), nullable=False, default="bozza")
    note = Column(Text, nullable=True)
    motivazione_rigetto = Column(Text, nullable=True)
    spesa_id = Column(UUID(as_uuid=True), ForeignKey("spesa.id"), nullable=True)
    pdf_path = Column(String(500), nullable=True)
    data_invio = Column(DateTime(timezone=True), nullable=True)
    data_approvazione_rs = Column(DateTime(timezone=True), nullable=True)
    data_approvazione_dir_dip = Column(DateTime(timezone=True), nullable=True)
    data_approvazione_dg = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    richiesta_autorizzazione = relationship("RichiestaAutorizzazioneSpesa", foreign_keys=[richiesta_autorizzazione_spesa_id])
    richiedente = relationship("Persona", foreign_keys=[richiedente_id])
    righe = relationship("RimborsoSpesaRiga", back_populates="richiesta", cascade="all, delete-orphan", order_by="RimborsoSpesaRiga.data")


class RimborsoSpesaRiga(Base):
    __tablename__ = "rimborso_spesa_riga"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    richiesta_rimborso_spesa_id = Column(UUID(as_uuid=True), ForeignKey("richiesta_rimborso_spesa.id", ondelete="CASCADE"), nullable=False)
    descrizione = Column(Text, nullable=False)
    data = Column(Date, nullable=False)
    importo = Column(Numeric(14, 2), nullable=False)
    documento_path = Column(String(500), nullable=True)
    documento_nome_originale = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    richiesta = relationship("RichiestaRimborsoSpesa", back_populates="righe")
