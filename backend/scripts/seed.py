#!/usr/bin/env python3
# backend/scripts/seed.py
# Popola le tabelle di configurazione con i dati iniziali.
# Esegui con: docker compose exec backend python scripts/seed.py

import sys
sys.path.insert(0, "/app")

from app.core.database import SessionLocal
from app.models.timesheet import TemplateTimesheet
from app.models.budget import VoceDiCosto
from app.models.partner import TipoFinanziamento
from app.core.security import hash_password
from app.models.persona import Persona

db = SessionLocal()

templates = [
    TemplateTimesheet(nome="POR FESR / FEAMP (mensile)", granularita="mensile", righe_wp_task=True, riga_altri_progetti=True, riga_ordinaria=True, riga_assenze=False, num_firmatari=2, etichetta_firmatario_1="Firma Dipendente", etichetta_firmatario_2="Firma Responsabile Amministrativo"),
    TemplateTimesheet(nome="MISE / 5G (giornaliero)", granularita="giornaliero", righe_wp_task=True, riga_altri_progetti=True, riga_ordinaria=True, riga_assenze=True, num_firmatari=3, etichetta_firmatario_1="Firma Dipendente", etichetta_firmatario_2="Firma Direttore Istituto", etichetta_firmatario_3="Firma Responsabile Progetto"),
    TemplateTimesheet(nome="Horizon Europe (mensile)", granularita="mensile", righe_wp_task=True, riga_altri_progetti=True, riga_ordinaria=True, riga_assenze=True, num_firmatari=1, etichetta_firmatario_1="Firma Ricercatore"),
    TemplateTimesheet(nome="Standard interno (mensile)", granularita="mensile", righe_wp_task=True, riga_altri_progetti=False, riga_ordinaria=True, riga_assenze=True, num_firmatari=2, etichetta_firmatario_1="Firma Dipendente", etichetta_firmatario_2="Firma PI"),
]
for t in templates:
    if not db.query(TemplateTimesheet).filter(TemplateTimesheet.nome == t.nome).first():
        db.add(t)
db.commit()
print("Template timesheet: OK")

t1 = db.query(TemplateTimesheet).filter(TemplateTimesheet.nome == "POR FESR / FEAMP (mensile)").first()
t2 = db.query(TemplateTimesheet).filter(TemplateTimesheet.nome == "MISE / 5G (giornaliero)").first()
t3 = db.query(TemplateTimesheet).filter(TemplateTimesheet.nome == "Horizon Europe (mensile)").first()
t4 = db.query(TemplateTimesheet).filter(TemplateTimesheet.nome == "Standard interno (mensile)").first()

tipi = [
    TipoFinanziamento(nome="Horizon Europe", categoria="europeo", ente_erogante="Commissione Europea", template_timesheet_id=t3.id),
    TipoFinanziamento(nome="PNRR", categoria="nazionale", ente_erogante="MUR", template_timesheet_id=t1.id),
    TipoFinanziamento(nome="MUR/PRIN", categoria="nazionale", ente_erogante="MUR", template_timesheet_id=t1.id),
    TipoFinanziamento(nome="MISE", categoria="nazionale", ente_erogante="MISE", template_timesheet_id=t2.id),
    TipoFinanziamento(nome="POR FESR", categoria="regionale", ente_erogante="Regione", template_timesheet_id=t1.id),
    TipoFinanziamento(nome="Progetto Interno", categoria="privato", ente_erogante="Ateneo", template_timesheet_id=t4.id),
    TipoFinanziamento(nome="Commessa Esterna", categoria="privato", ente_erogante="Privato", template_timesheet_id=t4.id),
]
for t in tipi:
    if not db.query(TipoFinanziamento).filter(TipoFinanziamento.nome == t.nome).first():
        db.add(t)
db.commit()
print("Tipi finanziamento: OK")

voci = [
    VoceDiCosto(codice="A.1", descrizione="Personale dipendente", categoria="personale", ammissibile_horizon=True, ammissibile_pnrr=True, ammissibile_por=True),
    VoceDiCosto(codice="A.2", descrizione="Personale a contratto / assegnisti", categoria="personale", ammissibile_horizon=True, ammissibile_pnrr=True, ammissibile_por=True),
    VoceDiCosto(codice="B.1", descrizione="Strumentazione e attrezzature", categoria="materiali", ammissibile_horizon=True, ammissibile_pnrr=True, ammissibile_por=True),
    VoceDiCosto(codice="B.2", descrizione="Materiali di consumo", categoria="materiali", ammissibile_horizon=True, ammissibile_pnrr=True, ammissibile_por=True),
    VoceDiCosto(codice="C.1", descrizione="Servizi di ricerca e consulenza", categoria="servizi", ammissibile_horizon=True, ammissibile_pnrr=True, ammissibile_por=True),
    VoceDiCosto(codice="C.2", descrizione="Servizi IT e licenze software", categoria="servizi", ammissibile_horizon=True, ammissibile_pnrr=False, ammissibile_por=True),
    VoceDiCosto(codice="D.1", descrizione="Missioni e trasferte", categoria="missioni", ammissibile_horizon=True, ammissibile_pnrr=True, ammissibile_por=True),
    VoceDiCosto(codice="D.2", descrizione="Partecipazione a convegni", categoria="missioni", ammissibile_horizon=True, ammissibile_pnrr=False, ammissibile_por=True),
    VoceDiCosto(codice="E.1", descrizione="Overhead / Costi indiretti", categoria="overhead", ammissibile_horizon=True, ammissibile_pnrr=True, ammissibile_por=False),
    VoceDiCosto(codice="F.1", descrizione="Altre spese dirette", categoria="altro", ammissibile_horizon=True, ammissibile_pnrr=True, ammissibile_por=True),
]
for v in voci:
    if not db.query(VoceDiCosto).filter(VoceDiCosto.codice == v.codice).first():
        db.add(v)
db.commit()
print("Voci di costo: OK")

utenti = [
    Persona(nome="Mario", cognome="Rossi", email="pi@ateneo.it", password_hash=hash_password("pi123"), ruolo="pi", attivo=True),
    Persona(nome="Laura", cognome="Bianchi", email="ricercatore@ateneo.it", password_hash=hash_password("ricercatore123"), ruolo="ricercatore", attivo=True),
    Persona(nome="Giuseppe", cognome="Verdi", email="management@ateneo.it", password_hash=hash_password("management123"), ruolo="management", attivo=True),
]
for u in utenti:
    if not db.query(Persona).filter(Persona.email == u.email).first():
        db.add(u)
db.commit()
print("Utenti di test: OK")

db.close()
print("\nSeed completato.")
print("Credenziali:")
print("  admin@ateneo.it        / admin123        (amministrativo)")
print("  pi@ateneo.it           / pi123           (PI)")
print("  ricercatore@ateneo.it  / ricercatore123  (ricercatore)")
print("  management@ateneo.it   / management123   (management)")
