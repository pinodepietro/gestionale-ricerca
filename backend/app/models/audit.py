# backend/app/models/audit.py
import uuid
from sqlalchemy import String, Text, UUID as UUIDType, ForeignKey, Column, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entita = Column(String(50), nullable=False, index=True)  # es. "progetto"
    entita_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # es. project_id
    azione = Column(String(50), nullable=False)  # es. "cambio_amministrativo"
    cambio_da = Column(String(500), nullable=True)  # valore precedente
    cambio_a = Column(String(500), nullable=True)  # nuovo valore
    cambiato_da = Column(UUID(as_uuid=True), ForeignKey("persona.id"), nullable=False)  # chi ha fatto il cambio
    motivo = Column(Text, nullable=True)
    dettagli = Column(Text, nullable=True)  # JSON con info aggiuntive
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
