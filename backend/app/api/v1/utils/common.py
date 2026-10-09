"""
Common utility functions for API endpoints.

Questo file centralizza funzioni duplicate fra più endpoint:
- _calcola_disponibile() — calcolo budget disponibile
- _get_persona_by_role() — recupero persona per ruolo
- _folder_paths() — percorsi cartelle upload

Usando questi, evitare duplicazione e mantenere logica centralizzata.
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.budget import BudgetVoce, Spesa
from app.models.personale import Allocazione
from app.models.persona import Persona


def calcola_disponibile(db: Session, budget_voce_id: str) -> float:
    """
    Calcola disponibilità budget per una voce di costo.

    Returns:
        Importo disponibile: importo_erogato - importo_impegnato - spese_registrate
    """
    bv = db.query(BudgetVoce).filter(BudgetVoce.id == budget_voce_id).first()
    if not bv:
        return 0.0

    speso = float(
        db.query(func.coalesce(func.sum(Spesa.importo), 0))
        .filter(
            Spesa.progetto_id == bv.progetto_id,
            Spesa.voce_id == bv.voce_id,
            Spesa.stato == "registrata",
        )
        .scalar()
    )

    return round(float(bv.importo_erogato or 0) - float(bv.importo_impegnato or 0) - speso, 2)


def get_persona_by_role(
    db: Session, progetto_id: str, role: str = "pi"
) -> Persona | None:
    """
    Recupera persona per ruolo nel progetto.

    Args:
        db: Database session
        progetto_id: ID del progetto
        role: "pi", "amministrativo", etc.

    Returns:
        Persona con il ruolo, o None
    """
    role_field = f"is_{role}" if role != "dg" else "is_direttore_generale"

    return (
        db.query(Persona)
        .join(Allocazione, Allocazione.persona_id == Persona.id)
        .filter(
            Allocazione.progetto_id == progetto_id,
            getattr(Allocazione, role_field) == True,
        )
        .first()
    )


def get_upload_folder_path(base_path: str, *parts: str) -> str:
    """
    Costruisce percorso cartella upload.

    Args:
        base_path: Percorso base (es: /app/uploads)
        *parts: Componenti aggiuntive (es: "progetti", "codice", "allegati")

    Returns:
        Percorso completo: base_path/part1/part2/part3
    """
    import os

    path = base_path
    for part in parts:
        if part:
            path = os.path.join(path, part)
    return path
