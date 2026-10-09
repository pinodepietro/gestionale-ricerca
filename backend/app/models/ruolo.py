"""
Ruoli centralizzati per RBAC.

Fonte unica di verità per tutti i ruoli validi nel sistema.
Usare RuoloEnum ovunque invece di stringhe hardcoded.
"""

from enum import Enum


class RuoloEnum(str, Enum):
    """Enum di tutti i ruoli validi nel sistema."""

    AMMINISTRATIVO = "amministrativo"
    RICERCATORE = "ricercatore"
    MANAGEMENT = "management"
    SUPERADMIN = "superadmin"
    MONITOR = "monitor"
    DIRETTORE_GENERALE = "direttore_generale"
    PI = "pi"  # Project Investigator
    RESPONSABILE_SCIENTIFICO = "responsabile_scientifico"
    DIRETTORE_ISTITUTO = "direttore_istituto"

    @classmethod
    def values(cls) -> set:
        """Restituisce set di tutti i valori di ruolo validi."""
        return {role.value for role in cls}

    @classmethod
    def is_valid(cls, ruolo: str) -> bool:
        """Verifica se un ruolo è valido."""
        try:
            cls(ruolo)
            return True
        except ValueError:
            return False
