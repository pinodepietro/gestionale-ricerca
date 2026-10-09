"""Authentication endpoint tests."""
import pytest
from uuid import uuid4
from app.models.persona import Persona
from app.models.ruolo import RuoloEnum
from app.core.security import hash_password, crea_access_token


@pytest.fixture
def test_user(db):
    """Create test user."""
    persona = Persona(
        id=uuid4(),
        nome="Test",
        cognome="User",
        email="test@example.com",
        username="testuser",
        password_hash=hash_password("TestPass123!"),
        ruolo=RuoloEnum.RICERCATORE.value,
        attivo=True,
        deve_cambiare_password=False,
    )
    db.add(persona)
    db.commit()
    return persona


@pytest.fixture
def test_token(test_user):
    """Create token for test user."""
    return crea_access_token({"sub": str(test_user.id)})


class TestLogin:
    """Login endpoint tests."""

    def test_login_success(self, client, test_user):
        """Successful login returns token and user."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "testuser", "password": "TestPass123!"},
        )
        assert response.status_code == 200
        resp_data = response.json()
        assert "data" in resp_data
        data = resp_data["data"]
        assert "access_token" in data
        assert data.get("token_type") == "bearer"
        assert "user" in data
        assert data["user"]["email"] == "test@example.com"

    def test_login_invalid_username(self, client):
        """Login with invalid username fails."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "nonexistent", "password": "password"},
        )
        assert response.status_code == 401

    def test_login_invalid_password(self, client, test_user):
        """Login with wrong password fails."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "testuser", "password": "WrongPass123!"},
        )
        assert response.status_code == 401

    def test_login_inactive_user(self, client, db):
        """Login with inactive user fails."""
        inactive = Persona(
            id=uuid4(),
            nome="Inactive",
            cognome="User",
            email="inactive@example.com",
            username="inactive",
            password_hash=hash_password("TestPass123!"),
            ruolo=RuoloEnum.RICERCATORE.value,
            attivo=False,
        )
        db.add(inactive)
        db.commit()

        response = client.post(
            "/api/v1/auth/login",
            json={"username": "inactive", "password": "TestPass123!"},
        )
        assert response.status_code == 401

    def test_login_case_insensitive(self, client, test_user):
        """Username is case-insensitive."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "TESTUSER", "password": "TestPass123!"},
        )
        assert response.status_code == 200


class TestProfile:
    """Profile endpoint tests."""

    def test_profile_with_valid_token(self, client, test_user, test_token):
        """Get profile with valid token."""
        response = client.get(
            "/api/v1/auth/profile",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_user.id)
        assert data["email"] == "test@example.com"
        assert data["ruolo"] == RuoloEnum.RICERCATORE.value

    def test_profile_no_token(self, client):
        """Profile without token fails."""
        response = client.get("/api/v1/auth/profile")
        assert response.status_code == 403

    def test_profile_invalid_token(self, client):
        """Profile with invalid token fails."""
        response = client.get(
            "/api/v1/auth/profile",
            headers={"Authorization": "Bearer invalid_token_here"},
        )
        assert response.status_code == 401

    def test_profile_inactive_user(self, client, db):
        """Profile for inactive user fails."""
        user = Persona(
            id=uuid4(),
            nome="Test",
            cognome="Inactive",
            email="inactive@test.com",
            username="inactive2",
            password_hash=hash_password("pass"),
            ruolo=RuoloEnum.RICERCATORE.value,
            attivo=False,
        )
        db.add(user)
        db.commit()

        token = crea_token(str(user.id))
        response = client.get(
            "/api/v1/auth/profile",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401


class TestPasswordValidation:
    """Password validation tests."""

    def test_password_too_short(self, client, test_user, test_token):
        """Password must be at least 8 characters."""
        response = client.patch(
            "/api/v1/auth/password",
            headers={"Authorization": f"Bearer {test_token}"},
            json={"old_password": "TestPass123!", "new_password": "Short1!"},
        )
        assert response.status_code == 422

    def test_password_missing_uppercase(self, client, test_user, test_token):
        """Password must have uppercase letter."""
        response = client.patch(
            "/api/v1/auth/password",
            headers={"Authorization": f"Bearer {test_token}"},
            json={"old_password": "TestPass123!", "new_password": "newpass123!"},
        )
        assert response.status_code == 422

    def test_password_missing_special_char(self, client, test_user, test_token):
        """Password must have special character."""
        response = client.patch(
            "/api/v1/auth/password",
            headers={"Authorization": f"Bearer {test_token}"},
            json={"old_password": "TestPass123!", "new_password": "NewPass123"},
        )
        assert response.status_code == 422

    def test_password_change_success(self, client, test_user, test_token):
        """Successful password change."""
        response = client.patch(
            "/api/v1/auth/password",
            headers={"Authorization": f"Bearer {test_token}"},
            json={"old_password": "TestPass123!", "new_password": "NewPass456!"},
        )
        assert response.status_code == 200

        # Verify old password no longer works
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "testuser", "password": "TestPass123!"},
        )
        assert response.status_code == 401

        # Verify new password works
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "testuser", "password": "NewPass456!"},
        )
        assert response.status_code == 200
