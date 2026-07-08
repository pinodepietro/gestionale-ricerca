from app.core.database import SessionLocal
from app.models.notifica import Notifica
from sqlalchemy import or_
import uuid

db = SessionLocal()
persona_id = uuid.UUID('adc433c3-626d-436f-ae0d-a6c8ba340e86')

# Test 1
all_n = db.query(Notifica).filter(Notifica.persona_id == persona_id).count()
print(f'Total: {all_n}')

# Test 4
q = db.query(Notifica).filter(
    Notifica.persona_id == persona_id,
    or_(Notifica.letta == False, Notifica.richiede_azione == True)
)
print(f'With or_(): {q.count()}')
