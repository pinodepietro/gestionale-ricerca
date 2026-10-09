"""Admin endpoint tests."""
import pytest
from uuid import uuid4
from app.models.persona import Persona
from app.models.ruolo import RuoloEnum
from app.core.security import hash_password, crea_access_token


@pytest.fixture
def superadmin_user(db):
    """Create superadmin user."""
    persona = Persona(
        id=uuid4(),
        nome="Super",
        cognome="Admin",
        email="admin@example.com",
        username="admin",
        password_hash=hash_password("AdminPass123!"),
        ruolo=RuoloEnum.SUPERADMIN.value,
        attivo=True,
        deve_cambiare_password=False,
    )
    db.add(persona)
    db.commit()
    return persona


@pytest.fixture
def superadmin_token(superadmin_user):
    """Create token for superadmin."""
    return crea_access_token({"sub": str(superadmin_user.id)})


@pytest.fixture
def regular_user(db):
    """Create regular user."""
    persona = Persona(
        id=uuid4(),
        nome="Regular",
        cognome="User",
        email="user@example.com",
        username="user",
        password_hash=hash_password("UserPass123!"),
        ruolo=RuoloEnum.RICERCATORE.value,
        attivo=True,
    )
    db.add(persona)
    db.commit()
    return persona


@pytest.fixture
def regular_token(regular_user):
    """Create token for regular user."""
    return crea_access_token({"sub": str(regular_user.id)})


class TestListUsers:
    """GET /admin/utenti tests."""

    def test_list_users_requires_superadmin(self, client, regular_token):
        """Only superadmin can list users."""
        response = client.get(
            "/api/v1/admin/utenti",
            headers={"Authorization": f"Bearer {regular_token}"},
        )
        assert response.status_code == 403

    def test_list_users_as_superadmin(self, client, superadmin_token, db, regular_user):
        """Superadmin can list all users."""
        response = client.get(
            "/api/v1/admin/utenti",
            headers={"Authorization": f"Bearer {superadmin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert isinstance(data["data"], list)
        assert len(data["data"]) >= 2  # superadmin + regular_user


class TestCreateUser:
    """POST /admin/utenti tests."""

    def test_create_user_requires_superadmin(self, client, regular_token):
        """Only superadmin can create users."""
        response = client.post(
            "/api/v1/admin/utenti",
            headers={"Authorization": f"Bearer {regular_token}"},
            json={
                "nome": "New",
                "cognome": "User",
                "email": "new@example.com",
                "password": "NewPass123!",
                "ruolo": "ricercatore",
            },
        )
        assert response.status_code == 403

    def test_create_user_success(self, client, superadmin_token):
        """Superadmin can create new user."""
        response = client.post(
            "/api/v1/admin/utenti",
            headers={"Authorization": f"Bearer {superadmin_token}"},
            json={
                "nome": "New",
                "cognome": "User",
                "email": "newuser@example.com",
                "password": "NewPass123!",
                "ruolo": "ricercatore",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["email"] == "newuser@example.com"
        assert data["data"]["ruolo"] == "ricercatore"

    def test_create_user_duplicate_email(self, client, superadmin_token, regular_user):
        """Cannot create user with duplicate email."""
        response = client.post(
            "/api/v1/admin/utenti",
            headers={"Authorization": f"Bearer {superadmin_token}"},
            json={
                "nome": "Duplicate",
                "cognome": "User",
                "email": regular_user.email,  # existing email
                "password": "DupPass123!",
                "ruolo": "ricercatore",
            },
        )
        assert response.status_code == 409


class TestUpdateUser:
    """PATCH /admin/utenti/{id} tests."""

    def test_update_user_requires_superadmin(self, client, regular_token, superadmin_user):
        """Only superadmin can update users."""
        response = client.patch(
            f"/api/v1/admin/utenti/{superadmin_user.id}",
            headers={"Authorization": f"Bearer {regular_token}"},
            json={"nome": "Updated"},
        )
        assert response.status_code == 403

    def test_update_user_success(self, client, superadmin_token, regular_user):
        """Superadmin can update user."""
        response = client.patch(
            f"/api/v1/admin/utenti/{regular_user.id}",
            headers={"Authorization": f"Bearer {superadmin_token}"},
            json={"nome": "UpdatedName"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["nome"] == "UpdatedName"

    def test_update_user_nonexistent(self, client, superadmin_token):
        """Updating nonexistent user returns 404."""
        response = client.patch(
            f"/api/v1/admin/utenti/{uuid4()}",
            headers={"Authorization": f"Bearer {superadmin_token}"},
            json={"nome": "Test"},
        )
        assert response.status_code == 404


class TestDeleteUser:
    """DELETE /admin/utenti/{id} tests."""

    def test_delete_user_requires_superadmin(self, client, regular_token, superadmin_user):
        """Only superadmin can delete users."""
        response = client.delete(
            f"/api/v1/admin/utenti/{superadmin_user.id}",
            headers={"Authorization": f"Bearer {regular_token}"},
        )
        assert response.status_code == 403

    def test_delete_user_success(self, client, superadmin_token, db, regular_user):
        """Superadmin can delete (soft delete) user."""
        response = client.delete(
            f"/api/v1/admin/utenti/{regular_user.id}",
            headers={"Authorization": f"Bearer {superadmin_token}"},
        )
        assert response.status_code == 200

        # Verify user is marked inactive
        user = db.query(Persona).filter(Persona.id == regular_user.id).first()
        assert user.attivo == False

    def test_delete_self_fails(self, client, superadmin_token, superadmin_user):
        """User cannot delete themselves."""
        response = client.delete(
            f"/api/v1/admin/utenti/{superadmin_user.id}",
            headers={"Authorization": f"Bearer {superadmin_token}"},
        )
        assert response.status_code == 409


class TestStatistics:
    """GET /admin/statistiche tests."""

    def test_statistics_requires_superadmin(self, client, regular_token):
        """Only superadmin can view statistics."""
        response = client.get(
            "/api/v1/admin/statistiche",
            headers={"Authorization": f"Bearer {regular_token}"},
        )
        assert response.status_code == 403

    def test_statistics_success(self, client, superadmin_token):
        """Superadmin can view statistics."""
        response = client.get(
            "/api/v1/admin/statistiche",
            headers={"Authorization": f"Bearer {superadmin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "progetti" in data["data"]
        assert "utenti" in data["data"]
        assert "timesheet" in data["data"]
        assert "spese" in data["data"]
