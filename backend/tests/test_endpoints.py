"""Integration tests for main API endpoints."""
import pytest
import json
from uuid import uuid4
from sqlalchemy.orm import Session
from app.models.persona import Persona
from app.models.progetto import Progetto
from app.models.ruolo import RuoloEnum
from app.core.security import hash_password
from app.core.config import settings


@pytest.fixture
def superadmin_token(client, db):
    """Create superadmin user and get auth token."""
    persona = Persona(
        id=uuid4(),
        nome="Super",
        cognome="Admin",
        email="super@test.com",
        username="superadmin",
        password_hash=hash_password("testpass123"),
        ruolo=RuoloEnum.SUPERADMIN.value,
        attivo=True,
        deve_cambiare_password=False,
    )
    db.add(persona)
    db.commit()

    from app.core.security import crea_access_token
    token = crea_access_token({"sub": str(persona.id)})
    return token, persona


@pytest.fixture
def admin_token(client, db):
    """Create admin user and get auth token."""
    persona = Persona(
        id=uuid4(),
        nome="Admin",
        cognome="Test",
        email="admin@test.com",
        username="admin",
        password_hash=hash_password("testpass123"),
        ruolo=RuoloEnum.AMMINISTRATIVO.value,
        attivo=True,
        deve_cambiare_password=False,
    )
    db.add(persona)
    db.commit()

    from app.core.security import crea_access_token
    token = crea_access_token({"sub": str(persona.id)})
    return token, persona


class TestHealth:
    """Test health check endpoint."""

    def test_health_check(self, client):
        """Health check should return ok."""
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestAuth:
    """Test authentication endpoints."""

    def test_login_invalid_credentials(self, client):
        """Login with invalid credentials should fail."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "invalid", "password": "wrong"},
        )
        assert response.status_code == 401

    def test_profile_no_token(self, client):
        """Profile without token should fail."""
        response = client.get("/api/v1/auth/profile")
        assert response.status_code == 403


class TestAdmin:
    """Test admin endpoints."""

    def test_list_utenti_requires_superadmin(self, client, admin_token):
        """List users requires superadmin role."""
        token, _ = admin_token
        response = client.get(
            "/api/v1/admin/utenti",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403

    def test_list_utenti_as_superadmin(self, client, superadmin_token, db):
        """Superadmin can list users."""
        token, superadmin = superadmin_token

        # Create another user
        user = Persona(
            id=uuid4(),
            nome="Test",
            cognome="User",
            email="test@test.com",
            password_hash=hash_password("pass"),
            ruolo=RuoloEnum.RICERCATORE.value,
            attivo=True,
        )
        db.add(user)
        db.commit()

        response = client.get(
            "/api/v1/admin/utenti",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert len(data["data"]) >= 1

    def test_health_check_endpoint(self, client):
        """Health check should be accessible without auth."""
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


class TestProjects:
    """Test project endpoints."""

    def test_create_project_requires_auth(self, client):
        """Create project requires authentication."""
        response = client.post(
            "/api/v1/progetti",
            json={"codice": "TEST-001", "titolo": "Test Project"},
        )
        assert response.status_code in [401, 403]

    def test_list_projects_empty(self, client, admin_token):
        """List projects should return empty array initially."""
        token, _ = admin_token
        response = client.get(
            "/api/v1/progetti",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data.get("data"), list)


class TestErrors:
    """Test error handling."""

    def test_invalid_endpoint_404(self, client):
        """Invalid endpoint should return 404."""
        response = client.get("/api/v1/invalid-endpoint")
        assert response.status_code == 404

    def test_malformed_json_422(self, client, superadmin_token):
        """Malformed JSON should return 422."""
        token, _ = superadmin_token
        response = client.post(
            "/api/v1/admin/utenti",
            headers={"Authorization": f"Bearer {token}"},
            data="malformed",
        )
        assert response.status_code in [400, 422]
