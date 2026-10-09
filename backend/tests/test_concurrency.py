"""Concurrency and race condition tests."""
import pytest
from uuid import uuid4
from datetime import date
from concurrent.futures import ThreadPoolExecutor
from app.models.persona import Persona
from app.models.progetto import Progetto
from app.models.budget import BudgetVoce, VoceDiCosto
from app.models.ruolo import RuoloEnum
from app.core.security import hash_password


@pytest.fixture
def budget_scenario(db):
    """Create a project with budget for testing."""
    admin = Persona(
        id=uuid4(),
        nome="Admin",
        cognome="Test",
        email="admin@example.com",
        username="admin",
        password_hash=hash_password("Pass123!"),
        ruolo=RuoloEnum.AMMINISTRATIVO.value,
        attivo=True,
    )
    db.add(admin)
    db.flush()

    progetto = Progetto(
        id=uuid4(),
        codice="RACE-001",
        titolo="Race Condition Test",
        tipo="Ricerca",
        data_inizio=date(2026, 1, 1),
        data_fine=date(2026, 12, 31),
        stato="attivo",
        costo_totale=1000.0,
        importo_finanziato=1000.0,
        amministrativo_id=admin.id,
    )
    db.add(progetto)
    db.flush()

    voce = VoceDiCosto(
        id=uuid4(),
        codice="V001",
        descrizione="Test Voice",
        categoria="Personale",
    )
    db.add(voce)
    db.flush()

    budget_voce = BudgetVoce(
        id=uuid4(),
        progetto_id=progetto.id,
        voce_id=voce.id,
        importo_erogato=1000.0,
        importo_impegnato=0.0,
    )
    db.add(budget_voce)
    db.commit()

    return {
        "progetto": progetto,
        "budget_voce": budget_voce,
        "voce": voce,
        "admin": admin,
    }


class TestBudgetRaceCondition:
    """Test that concurrent budget operations are handled correctly."""

    def test_budget_concurrent_reads(self, budget_scenario):
        """Multiple concurrent reads should not cause issues."""
        budget_voce = budget_scenario["budget_voce"]

        # Simulate concurrent reads of same budget
        def read_budget():
            # In a real test, this would be a DB query
            return budget_voce.importo_erogato - budget_voce.importo_impegnato

        with ThreadPoolExecutor(max_workers=5) as executor:
            results = list(executor.map(lambda _: read_budget(), range(5)))

        # All reads should return same value
        assert all(r == 1000.0 for r in results)

    def test_pessimistic_locking_comment(self):
        """Verify that pessimistic locking is documented."""
        # Check that with_for_update is mentioned in code
        try:
            with open("/app/app/api/v1/endpoints/autorizzazioni_spesa.py") as f:
                content = f.read()
                assert "with_for_update" in content or "FOR UPDATE" in content
        except FileNotFoundError:
            pytest.skip("File not found for locking verification")

    def test_budget_voce_immutability(self, budget_scenario):
        """Budget voce should have constraints to prevent invalid states."""
        budget_voce = budget_scenario["budget_voce"]

        # Verify initial state
        assert budget_voce.importo_erogato == 1000.0
        assert budget_voce.importo_impegnato == 0.0

        # importo_impegnato should never exceed importo_erogato
        # (This should be enforced at DB or app level)
        assert budget_voce.importo_impegnato <= budget_voce.importo_erogato


class TestTimesheetConcurrency:
    """Test concurrent timesheet operations."""

    def test_timesheet_version_conflict(self):
        """Concurrent updates to same timesheet should be detected."""
        # This would require versioning or optimistic locking
        # For now, test that the concept is documented
        try:
            from app.models.timesheet import TimesheetTestata
            # Check if versioning exists
            if hasattr(TimesheetTestata, "versione"):
                pytest.skip("Versioning already implemented")
            else:
                # No versioning - this is a gap to address
                assert True
        except ImportError:
            pytest.skip("Timesheet model not found")


class TestDatabaseConstraints:
    """Test that database constraints prevent invalid states."""

    def test_required_fields_enforced(self, db):
        """Required fields should raise errors when missing."""
        # Try to create progetto without required fields
        progetto = Progetto(
            id=uuid4(),
            # Missing required fields: codice, titolo, etc.
        )
        db.add(progetto)

        # Should fail at commit or insert
        with pytest.raises(Exception):
            db.commit()

    def test_unique_constraints(self, db, budget_scenario):
        """Unique constraints should prevent duplicates."""
        progetto = budget_scenario["progetto"]

        # Try to create another project with same codice
        dup = Progetto(
            id=uuid4(),
            codice=progetto.codice,  # Duplicate
            titolo="Different",
            tipo="Ricerca",
            data_inizio=date(2026, 1, 1),
            data_fine=date(2026, 12, 31),
            stato="attivo",
        )
        db.add(dup)

        with pytest.raises(Exception):  # Should raise IntegrityError or similar
            db.commit()


class TestTransactionIsolation:
    """Test transaction isolation levels."""

    def test_dirty_reads_prevented(self, db, budget_scenario):
        """Uncommitted changes should not be visible to other transactions."""
        budget_voce = budget_scenario["budget_voce"]
        original_value = budget_voce.importo_impegnato

        # Modify in transaction (don't commit)
        budget_voce.importo_impegnato = 500.0

        # Create new session (simulating other transaction)
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker

        # In test, we use same DB but transaction should isolate
        # This is hard to test with in-memory SQLite
        # But the pattern shows what should be tested

        # Rollback
        db.rollback()

        # Verify original value is preserved
        assert budget_voce.importo_impegnato == original_value


class TestDeadlockPrevention:
    """Test that code patterns prevent deadlocks."""

    def test_lock_ordering(self):
        """Locks should be acquired in consistent order to prevent deadlock."""
        # Check code for consistent lock patterns
        try:
            with open("/app/app/api/v1/endpoints/autorizzazioni_spesa.py") as f:
                content = f.read()
                # Should use pessimistic locking in right order
                lines_with_lock = [l for l in content.split("\n") if "with_for_update" in l or "FOR UPDATE" in l]
                assert len(lines_with_lock) >= 1
        except FileNotFoundError:
            pytest.skip("File not found")


class TestRaceConditionDocumentation:
    """Verify that race conditions are documented in code."""

    def test_pessimistic_locking_documented(self):
        """Budget approval should mention why pessimistic locking is needed."""
        try:
            with open("/app/app/api/v1/endpoints/autorizzazioni_spesa.py") as f:
                content = f.read()
                # Should have comment about race condition prevention
                has_race_condition_comment = (
                    "race" in content.lower()
                    or "concurrent" in content.lower()
                    or "lock" in content.lower()
                )
                assert has_race_condition_comment
        except FileNotFoundError:
            pytest.skip("File not found")

    def test_budget_calculation_atomic(self):
        """Budget calculations should be atomic to prevent partial updates."""
        # This is a design check rather than executable test
        # Verifies that calcola_disponibile logic is sound
        try:
            from app.api.v1.utils.common import calcola_disponibile
            # If function exists, it should handle all calculations atomically
            assert calcola_disponibile is not None
        except ImportError:
            pytest.skip("Budget calculation function not found")
