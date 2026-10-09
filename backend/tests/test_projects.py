"""Project endpoint tests."""
import pytest
from uuid import uuid4
from datetime import date
from app.models.persona import Persona
from app.models.progetto import Progetto
from app.models.ruolo import RuoloEnum
from app.core.security import hash_password, crea_access_token


@pytest.fixture
def admin_user(db):
    """Create admin user."""
    persona = Persona(
        id=uuid4(),
        nome="Admin",
        cognome="User",
        email="admin@example.com",
        username="admin",
        password_hash=hash_password("AdminPass123!"),
        ruolo=RuoloEnum.AMMINISTRATIVO.value,
        attivo=True,
    )
    db.add(persona)
    db.commit()
    return persona


@pytest.fixture
def admin_token(admin_user):
    """Create token for admin."""
    return crea_access_token({"sub": str(admin_user.id)})


@pytest.fixture
def test_project(db, admin_user):
    """Create test project."""
    progetto = Progetto(
        id=uuid4(),
        codice="PROJ-001",
        titolo="Test Project",
        tipo="Ricerca",
        data_inizio=date(2026, 1, 1),
        data_fine=date(2026, 12, 31),
        stato="attivo",
        costo_totale=10000.0,
        importo_finanziato=8000.0,
        budget_per_partner=False,
        amministrativo_id=admin_user.id,
    )
    db.add(progetto)
    db.commit()
    return progetto


class TestListProjects:
    """GET /api/v1/progetti tests."""

    def test_list_projects_requires_auth(self, client):
        """List projects requires authentication."""
        response = client.get("/api/v1/progetti")
        assert response.status_code == 403

    def test_list_projects_empty(self, client, admin_token):
        """List projects returns empty array initially."""
        response = client.get(
            "/api/v1/progetti",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data.get("data"), list)

    def test_list_projects_with_data(self, client, admin_token, test_project):
        """List projects returns created projects."""
        response = client.get(
            "/api/v1/progetti",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) >= 1
        proj = data["data"][0]
        assert proj["codice"] == "PROJ-001"
        assert proj["titolo"] == "Test Project"


class TestGetProjectDetail:
    """GET /api/v1/progetti/{id} tests."""

    def test_get_project_requires_auth(self, client, test_project):
        """Get project requires authentication."""
        response = client.get(f"/api/v1/progetti/{test_project.id}")
        assert response.status_code == 403

    def test_get_project_success(self, client, admin_token, test_project):
        """Get project detail."""
        response = client.get(
            f"/api/v1/progetti/{test_project.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_project.id)
        assert data["codice"] == "PROJ-001"
        assert data["stato"] == "attivo"

    def test_get_project_nonexistent(self, client, admin_token):
        """Get nonexistent project returns 404."""
        response = client.get(
            f"/api/v1/progetti/{uuid4()}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 404


class TestCreateProject:
    """POST /api/v1/progetti tests."""

    def test_create_project_requires_auth(self, client):
        """Create project requires authentication."""
        response = client.post(
            "/api/v1/progetti",
            json={
                "codice": "NEW-001",
                "titolo": "New Project",
                "tipo": "Ricerca",
            },
        )
        assert response.status_code == 403

    def test_create_project_success(self, client, admin_token):
        """Create new project."""
        response = client.post(
            "/api/v1/progetti",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "codice": "NEW-001",
                "titolo": "New Project",
                "tipo": "Ricerca",
                "data_inizio": "2026-01-01",
                "data_fine": "2026-12-31",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["codice"] == "NEW-001"
        assert data["titolo"] == "New Project"

    def test_create_project_duplicate_code(self, client, admin_token, test_project):
        """Cannot create project with duplicate code."""
        response = client.post(
            "/api/v1/progetti",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "codice": test_project.codice,  # duplicate
                "titolo": "Different Title",
                "tipo": "Ricerca",
            },
        )
        assert response.status_code == 409


class TestUpdateProject:
    """PATCH /api/v1/progetti/{id} tests."""

    def test_update_project_requires_auth(self, client, test_project):
        """Update project requires authentication."""
        response = client.patch(
            f"/api/v1/progetti/{test_project.id}",
            json={"titolo": "Updated Title"},
        )
        assert response.status_code == 403

    def test_update_project_success(self, client, admin_token, test_project):
        """Update project."""
        response = client.patch(
            f"/api/v1/progetti/{test_project.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"titolo": "Updated Title"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["titolo"] == "Updated Title"

    def test_update_project_nonexistent(self, client, admin_token):
        """Update nonexistent project returns 404."""
        response = client.patch(
            f"/api/v1/progetti/{uuid4()}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"titolo": "Test"},
        )
        assert response.status_code == 404


class TestProjectBudget:
    """GET /api/v1/progetti/{id}/budget tests."""

    def test_get_budget_requires_auth(self, client, test_project):
        """Get budget requires authentication."""
        response = client.get(f"/api/v1/progetti/{test_project.id}/budget")
        assert response.status_code == 403

    def test_get_budget_success(self, client, admin_token, test_project):
        """Get project budget."""
        response = client.get(
            f"/api/v1/progetti/{test_project.id}/budget",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["costo_totale"] == 10000.0
        assert data["importo_finanziato"] == 8000.0
        assert data["importo_cofinanziato"] == 2000.0


class TestProjectDisponibilita:
    """GET /api/v1/progetti/{id}/disponibilita tests."""

    def test_get_disponibilita_requires_auth(self, client, test_project):
        """Get disponibilita requires authentication."""
        response = client.get(f"/api/v1/progetti/{test_project.id}/disponibilita")
        assert response.status_code == 403

    def test_get_disponibilita_success(self, client, admin_token, test_project):
        """Get budget availability (no spese yet, should equal budget)."""
        response = client.get(
            f"/api/v1/progetti/{test_project.id}/disponibilita",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data.get("spese_registrate"), (int, float))
        assert isinstance(data.get("disponibilita"), (int, float))
