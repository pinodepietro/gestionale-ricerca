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
        "username": f"admin-{uuid4().hex[:4]}",
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
        "username": f"superadmin-{uuid4().hex[:4]}",
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


@pytest.fixture
def test_project_full(db, test_admin):
    """Create complete project with budget, allocations, and expenses."""
    from uuid import uuid4
    from datetime import date
    from app.models.progetto import Progetto
    from app.models.budget import VoceDiCosto, BudgetVoce, Spesa
    from app.models.personale import Allocazione

    # Create project
    project = Progetto(
        id=uuid4(),
        codice=f"PROJ-{uuid4().hex[:6].upper()}",
        titolo="Complete Test Project",
        tipo="Ricerca",
        data_inizio=date(2026, 1, 1),
        data_fine=date(2026, 12, 31),
        stato="attivo",
        costo_totale=50000.0,
        importo_finanziato=40000.0,
        budget_per_partner=False,
        amministrativo_id=test_admin.id,
    )
    db.add(project)
    db.flush()

    # Create cost voices
    voce_personale = VoceDiCosto(
        id=uuid4(),
        codice="PERS",
        descrizione="Costi Personale",
        categoria="Personale",
    )
    voce_attrezzature = VoceDiCosto(
        id=uuid4(),
        codice="ATTR",
        descrizione="Attrezzature",
        categoria="Attrezzature",
    )
    db.add(voce_personale)
    db.add(voce_attrezzature)
    db.flush()

    # Create budget allocations
    budget_personale = BudgetVoce(
        id=uuid4(),
        progetto_id=project.id,
        voce_id=voce_personale.id,
        importo_previsto=30000.0,
        importo_erogato=30000.0,
        importo_rendicontato=8000.0,
        importo_impegnato=5000.0,
    )
    budget_attrezzature = BudgetVoce(
        id=uuid4(),
        progetto_id=project.id,
        voce_id=voce_attrezzature.id,
        importo_previsto=20000.0,
        importo_erogato=20000.0,
        importo_rendicontato=5000.0,
        importo_impegnato=2000.0,
    )
    db.add(budget_personale)
    db.add(budget_attrezzature)
    db.flush()

    # Create allocations
    allocazione = Allocazione(
        id=uuid4(),
        progetto_id=project.id,
        persona_id=test_admin.id,
        ore_assegnate=200.0,
        data_inizio=date(2026, 1, 1),
        data_fine=date(2026, 12, 31),
        is_pi=True,
    )
    db.add(allocazione)
    db.flush()

    # Create expenses
    spesa = Spesa(
        id=uuid4(),
        progetto_id=project.id,
        importo=1500.0,
        voce_id=voce_personale.id,
        data=date(2026, 6, 15),
        stato="registrata",
    )
    db.add(spesa)
    db.commit()
    db.refresh(project)

    return {
        "project": project,
        "voce_personale": voce_personale,
        "voce_attrezzature": voce_attrezzature,
        "budget_personale": budget_personale,
        "budget_attrezzature": budget_attrezzature,
        "allocazione": allocazione,
        "spesa": spesa,
    }
