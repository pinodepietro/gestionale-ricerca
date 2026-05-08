# backend/app/models/notifica.py
import uuid
from sqlalchemy import String, Text, Boolean, Integer, ForeignKey, Column, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base


class Notifica(Base):
    __tablename__ = "notifica"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    persona_id = Column(UUID(as_uuid=True), ForeignKey("persona.id"), nullable=False)
    tipo = Column(String(50), nullable=False)
    titolo = Column(String(200), nullable=False)
    messaggio = Column(Text, nullable=True)
    link = Column(String(300), nullable=True)
    letta = Column(Boolean, nullable=False, default=False)
    urgente = Column(Boolean, nullable=False, default=False)
    riferimento_id = Column(String(100), nullable=True)  # SAL id o timesheet id
    created_at = Column(DateTime(timezone=True), server_default=func.now())
