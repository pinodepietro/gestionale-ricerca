"""Initial schema from current models.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-10-09 10:00:00.000000

NOTA: Lo schema attuale viene creato da Base.metadata.create_all() nel startup di FastAPI (main.py).
Questo file serve come tracking point per Alembic e per evitare problemi di migrazione nel futuro.

Se necessario eseguire da database vuoto, le tabelle vengono create automaticamente al primo startup.
"""

from alembic import op
import sqlalchemy as sa


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Le tabelle sono create da Base.metadata.create_all() al startup della app."""
    pass


def downgrade() -> None:
    """Downgrade non supportato."""
    pass
