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
