# backend/app/models/__init__.py
# Importa tutti i modelli in modo che Alembic li rilevi automaticamente.

from app.models.persona import Persona          # noqa: F401
from app.models.progetto import Progetto        # noqa: F401
from app.models.struttura import WorkPackage, Task, Deliverable, Milestone  # noqa: F401
from app.models.budget import VoceDiCosto, BudgetVoce, Spesa, Sal           # noqa: F401
from app.models.timesheet import (             # noqa: F401
    TemplateTimesheet,
    TimesheetTestata,
    TimesheetRiga,
    TimesheetCella,
    ApprovazioneTimesheet,
)
from app.models.personale import (             # noqa: F401
    CostoOrarioPersona,
    MonteOreAnnuale,
    Allocazione,
)
from app.models.partner import Partner, ProgettoPartner, Finanziamento, TipoFinanziamento  # noqa: F401
from app.models.documento import DocumentoProgetto  # noqa: F401

from app.models.notifica import Notifica  # noqa: F401
