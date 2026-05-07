# Gestionale Ricerca — Stato Sessione

## Come riprendere
Dimmi: "Leggi /Users/pino/gestionale-ricerca/SESSIONE.md e riprendi da dove ci siamo fermati."

## Stack
- Frontend: React 18 + TypeScript + Ant Design + React Query + Zustand
- Backend: FastAPI + SQLAlchemy + PostgreSQL 16
- Deploy: Docker Compose
- Percorso: /Users/pino/gestionale-ricerca/

## Credenziali test
- admin@ateneo.it / admin123 (amministrativo)
- pi@ateneo.it / pi123 (PI — Mario Rossi)
- ricercatore@ateneo.it / ricercatore123 (Laura Bianchi)
- management@ateneo.it / management123 (management)
- superadmin@ateneo.it / superadmin123 (superadmin)
- DB: user=dev password=dev db=gestionale_ricerca

## Funzionalità completate
- Dashboard con gauge cerchi colorati (budget, spese ammissibili, tempo)
- Alert budget non allocato per voce (dashboard + tab Budget)
- Spese vs budget ammissibile (escluso personale e overhead)
- Percentuali con 1 decimale
- Tutte le funzionalità precedenti...

## Prossimi step
1. LDAP/SSO
2. Test completo flusso end-to-end
3. Eventuali fix minori
