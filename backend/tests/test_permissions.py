"""RBAC (Role-Based Access Control) permission tests."""
import pytest
from uuid import uuid4
from app.models.persona import Persona
from app.models.ruolo import RuoloEnum
from app.core.security import hash_password, crea_access_token


@pytest.fixture
def create_user_with_role(db):
    """Factory fixture to create users with specific roles."""
    def _create(role: str):
        persona = Persona(
            id=uuid4(),
            nome=role.capitalize(),
            cognome="User",
            email=f"{role}@example.com",
            username=role,
            password_hash=hash_password("Pass123!"),
            ruolo=role,
            attivo=True,
        )
        db.add(persona)
        db.commit()
        return persona
    return _create


@pytest.fixture
def all_roles(create_user_with_role):
    """Create users for all roles."""
    return {
        "superadmin": create_user_with_role(RuoloEnum.SUPERADMIN.value),
        "amministrativo": create_user_with_role(RuoloEnum.AMMINISTRATIVO.value),
        "pi": create_user_with_role(RuoloEnum.PI.value),
        "ricercatore": create_user_with_role(RuoloEnum.RICERCATORE.value),
        "direttore_generale": create_user_with_role(RuoloEnum.DIRETTORE_GENERALE.value),
    }


class TestSuperadminAccess:
    """Superadmin should have access to all admin endpoints."""

    def test_superadmin_can_list_users(self, client, all_roles):
        """Superadmin can list all users."""
        superadmin = all_roles["superadmin"]
        token = crea_access_token({"sub": str(superadmin.id)})

        response = client.get(
            "/api/v1/admin/utenti",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200

    def test_superadmin_can_create_users(self, client, all_roles):
        """Superadmin can create new users."""
        superadmin = all_roles["superadmin"]
        token = crea_access_token({"sub": str(superadmin.id)})

        response = client.post(
            "/api/v1/admin/utenti",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "nome": "New",
                "cognome": "User",
                "email": "newuser@example.com",
                "password": "NewPass123!",
                "ruolo": "ricercatore",
            },
        )
        assert response.status_code == 200

    def test_superadmin_can_access_statistics(self, client, all_roles):
        """Superadmin can view statistics."""
        superadmin = all_roles["superadmin"]
        token = crea_access_token({"sub": str(superadmin.id)})

        response = client.get(
            "/api/v1/admin/statistiche",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200


class TestNonAdminAccess:
    """Non-admin users should be denied access to admin endpoints."""

    def test_ricercatore_cannot_list_users(self, client, all_roles):
        """Regular user cannot list users."""
        ricercatore = all_roles["ricercatore"]
        token = crea_access_token({"sub": str(ricercatore.id)})

        response = client.get(
            "/api/v1/admin/utenti",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403

    def test_ricercatore_cannot_create_users(self, client, all_roles):
        """Regular user cannot create users."""
        ricercatore = all_roles["ricercatore"]
        token = crea_access_token({"sub": str(ricercatore.id)})

        response = client.post(
            "/api/v1/admin/utenti",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "nome": "New",
                "cognome": "User",
                "email": "newuser@example.com",
                "password": "Pass123!",
            },
        )
        assert response.status_code == 403

    def test_amministrativo_cannot_access_admin_endpoints(self, client, all_roles):
        """Admin users cannot access super-admin-only endpoints."""
        amministrativo = all_roles["amministrativo"]
        token = crea_access_token({"sub": str(amministrativo.id)})

        response = client.get(
            "/api/v1/admin/utenti",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403


class TestProjectAccess:
    """Test project-level permissions."""

    def test_authenticated_user_can_list_projects(self, client, all_roles):
        """Any authenticated user can list projects (unfiltered for now)."""
        ricercatore = all_roles["ricercatore"]
        token = crea_access_token({"sub": str(ricercatore.id)})

        response = client.get(
            "/api/v1/progetti",
            headers={"Authorization": f"Bearer {token}"},
        )
        # Should succeed (returns 200 or 404 depending on projects)
        assert response.status_code in [200, 404]

    def test_unauthenticated_cannot_list_projects(self, client):
        """Unauthenticated user cannot list projects."""
        response = client.get("/api/v1/progetti")
        assert response.status_code == 403


class TestInactiveUserAccess:
    """Inactive users should be denied access."""

    def test_inactive_user_cannot_authenticate(self, client, db, create_user_with_role):
        """Inactive user cannot login."""
        user = create_user_with_role(RuoloEnum.RICERCATORE.value)
        user.attivo = False
        db.commit()

        token = crea_access_token({"sub": str(user.id)})
        response = client.get(
            "/api/v1/auth/profile",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401

    def test_inactive_user_cannot_access_endpoints(self, client, db, create_user_with_role):
        """Inactive user token should be rejected."""
        user = create_user_with_role(RuoloEnum.AMMINISTRATIVO.value)
        token = crea_access_token({"sub": str(user.id)})

        # Deactivate after token generation
        user.attivo = False
        db.commit()

        response = client.get(
            "/api/v1/admin/utenti",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401


class TestInvalidTokenAccess:
    """Invalid tokens should be rejected."""

    def test_malformed_token_rejected(self, client):
        """Malformed token should be rejected."""
        response = client.get(
            "/api/v1/auth/profile",
            headers={"Authorization": "Bearer invalid_token_xyz"},
        )
        assert response.status_code == 401

    def test_missing_authorization_header(self, client):
        """Missing Authorization header should return 403."""
        response = client.get("/api/v1/auth/profile")
        assert response.status_code == 403

    def test_wrong_auth_scheme(self, client):
        """Wrong authorization scheme should be rejected."""
        response = client.get(
            "/api/v1/auth/profile",
            headers={"Authorization": "Basic dXNlcjpwYXNz"},
        )
        assert response.status_code in [403, 401]


class TestRoleEnum:
    """Test RuoloEnum validation."""

    def test_all_valid_roles(self):
        """All defined roles should be valid."""
        from app.models.ruolo import RuoloEnum

        valid_roles = RuoloEnum.values()
        expected = {
            "amministrativo",
            "ricercatore",
            "management",
            "superadmin",
            "monitor",
            "direttore_generale",
            "pi",
            "responsabile_scientifico",
            "direttore_istituto",
        }
        assert valid_roles == expected

    def test_invalid_role_rejected(self):
        """Invalid role should not be in enum."""
        from app.models.ruolo import RuoloEnum

        assert not RuoloEnum.is_valid("invalid_role")
        assert not RuoloEnum.is_valid("hacker")
        assert not RuoloEnum.is_valid("god")

    def test_valid_role_accepted(self):
        """Valid roles should be accepted."""
        from app.models.ruolo import RuoloEnum

        assert RuoloEnum.is_valid("superadmin")
        assert RuoloEnum.is_valid("amministrativo")
        assert RuoloEnum.is_valid("ricercatore")
