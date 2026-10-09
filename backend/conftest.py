"""Pytest configuration and fixtures."""
import os
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from app.core.database import Base
import pytest


# Test database — in memory SQLite with better support
TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="session")
def engine():
    """Create test database engine with SQLite foreign key support."""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )

    # Enable foreign keys in SQLite
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    # Create all tables
    Base.metadata.create_all(bind=engine)
    yield engine

    # Cleanup: in-memory SQLite auto-cleanup, skip drop_all due to FK circular deps
    # Base.metadata.drop_all(bind=engine)  # Disabled: SQLite circular FK issue


@pytest.fixture
def db(engine):
    """Create test database session with proper transaction handling."""
    connection = engine.connect()
    transaction = connection.begin()

    # Create session with this connection
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=connection)
    session = session_factory()

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db):
    """Create FastAPI test client with injected database."""
    from fastapi.testclient import TestClient
    from main import app
    from app.core.deps import get_db

    # Override get_db dependency to use test database
    app.dependency_overrides[get_db] = lambda: db

    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()


# ─── HELPER FIXTURES ─────────────────────────────────────────────────────

@pytest.fixture
def test_user_dict():
    """Test user data template."""
    from uuid import uuid4
    return {
        "id": str(uuid4()),
        "nome": "Test",
        "cognome": "User",
        "email": f"test-{uuid4().hex[:8]}@example.com",
        "username": f"testuser{uuid4().hex[:4]}",
        "password": "TestPass123!",
        "ruolo": "ricercatore",
        "attivo": True,
    }


@pytest.fixture
def test_project_dict():
    """Test project data template."""
    from uuid import uuid4
    from datetime import date
    return {
        "id": str(uuid4()),
        "codice": f"PROJ-{uuid4().hex[:6].upper()}",
        "titolo": "Test Project",
        "tipo": "Ricerca",
        "data_inizio": "2026-01-01",
        "data_fine": "2026-12-31",
        "stato": "attivo",
        "costo_totale": 1000.0,
        "importo_finanziato": 800.0,
    }


@pytest.fixture
def test_admin(db, test_user_dict):
    """Create admin user in database."""
    from uuid import uuid4
    from app.models.persona import Persona
    from app.core.security import hash_password
    from app.models.ruolo import RuoloEnum

    admin_data = test_user_dict.copy()
    admin_data.update({
        "ruolo": RuoloEnum.AMMINISTRATIVO.value,
        "username": "admin",
    })

    admin = Persona(
        id=uuid4(),
        nome=admin_data["nome"],
        cognome=admin_data["cognome"],
        email=admin_data["email"],
        username=admin_data["username"],
        password_hash=hash_password(admin_data["password"]),
        ruolo=admin_data["ruolo"],
        attivo=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


@pytest.fixture
def test_superadmin(db, test_user_dict):
    """Create superadmin user in database."""
    from uuid import uuid4
    from app.models.persona import Persona
    from app.core.security import hash_password
    from app.models.ruolo import RuoloEnum

    admin_data = test_user_dict.copy()
    admin_data.update({
        "ruolo": RuoloEnum.SUPERADMIN.value,
        "username": "superadmin",
    })

    admin = Persona(
        id=uuid4(),
        nome=admin_data["nome"],
        cognome=admin_data["cognome"],
        email=admin_data["email"],
        username=admin_data["username"],
        password_hash=hash_password(admin_data["password"]),
        ruolo=admin_data["ruolo"],
        attivo=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


@pytest.fixture
def admin_token(test_superadmin):
    """Generate token for superadmin."""
    from app.core.security import crea_access_token
    return crea_access_token({"sub": str(test_superadmin.id)})
