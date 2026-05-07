# backend/app/models/documento.py
import uuid
from sqlalchemy import String, Text, ForeignKey, Column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy import DateTime
from app.core.database import Base


class DocumentoProgetto(Base):
    __tablename__ = "documento_progetto"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    progetto_id = Column(UUID(as_uuid=True), ForeignKey("progetto.id"), nullable=False)
    tipo_documento = Column(String(50), nullable=False)
    nome_file = Column(String(255), nullable=False)
    path_file = Column(String(500), nullable=False)
    versione = Column(String(20), nullable=True)
    descrizione = Column(Text, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("persona.id"), nullable=True)

    progetto = relationship("Progetto", back_populates="documenti")
