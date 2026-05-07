# Gestionale Progetti di Ricerca — Stato avanzamento v2

Documento di continuità per nuova sessione di lavoro.
File di riferimento: `schema_gestionale_ricerca_v2.4.docx` (modello dati, 23 entità).
ZIP progetto: `gestionale-ricerca.zip` (tutto il codice aggiornato).

---

## 1. Stack e infrastruttura

| Componente | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + Ant Design + React Query + Zustand |
| Backend | FastAPI Python |
| Database | PostgreSQL 16 |
| Deploy | Docker Compose + Nginx |
| Deployment target | Server on-premise Windows con Docker |
| Dev machine | MacBook Pro |

### Avvio sviluppo (Mac)
```bash
cd gestionale-ricerca
docker compose up -d
# Frontend: http://localhost:5173
# Backend API docs: http://localhost:8000/api/docs
```

### Credenziali utenti di test
| Email | Password | Ruolo |
|---|---|---|
| admin@ateneo.it | admin123 | amministrativo |
| pi@ateneo.it | pi123 | PI |
| ricercatore@ateneo.it | ricercatore123 | ricercatore |
| management@ateneo.it | management123 | management |

---

## 2. Stato implementazione

### ✅ Completato e funzionante

**Infrastruttura**
- Docker Compose dev e prod configurati
- PostgreSQL con Alembic migrations (23 tabelle create)
- Seed dati: 4 template timesheet, 7 tipi finanziamento, 10 voci di costo, 4 utenti
- Backup schedulato (pg_dump notturno)
- Nginx con config HTTP e HTTPS (HTTPS commentata — da attivare quando disponibile certificato)

**Autenticazione**
- Login JWT con bcrypt (passlib rimosso — incompatibile con Python 3.12)
- RBAC con 4 ruoli: amministrativo, pi, ricercatore, management
- `RbacGuard` component per proteggere elementi UI
- Interceptor Axios centralizzato per gestione errori (401, 403, 409, 500)
- Sistema notifiche con `App.useApp()` di Ant Design (risolto problema provider)

**Gestione Personale** (completa)
- Lista personale con filtri (search, solo attivi)
- Scheda persona con tab: Anagrafica, Costi orari, Monte ore
- Modifica anagrafica (incluso cambio password)
- Inserimento costi orari con storicizzazione automatica (chiude il precedente)
- Validazione: impedisce inserimento costo con data sovrapposta
- Monte ore annuale con calcolo ore_residue

**Gestione Partner / Enti** (completa)
- Lista partner con ricerca
- CRUD completo (crea, modifica, elimina con conferma)
- Visibile in sidebar solo agli amministrativi

**Wizard Creazione Progetto** (5 step, completo)
- Step 1 — Anagrafica: tutti i campi, salva in bozza
- Step 2 — Finanziamento: voci di budget con alert se supera costo totale
- Step 3 — Partner: aggiunta/rimozione partner con ruolo
- Step 4 — Work Package: CRUD WP con modifica e validazione date
- Step 5 — Personale: allocazioni con modifica e validazione date/monte ore

**Validazioni attive**
- Budget voci > costo totale progetto: alert visivo + errore backend
- Date WP fuori periodo progetto: errore backend con notifica
- Date allocazione fuori periodo progetto: errore backend con notifica
- Monte ore insufficiente: errore backend con notifica
- Costo orario con date sovrapposte: errore backend con notifica
- Gestione errori con `switch` su `error.code` — messaggi specifici per tipo

**Lista progetti e bozze**
- Lista progetti attivi con filtri (stato, tipo, search)
- Sezione "In configurazione" (solo admin) con lista bozze
- ProgettoPage con tab: Gantt, Budget (con progress bar colorata), SAL, Personale, Documenti

---

### 🚧 Da implementare (prossimi passi in ordine consigliato)

**1. Attivazione progetto**
- Pulsante "Attiva progetto" nella scheda ProgettoPage (endpoint già pronto: `POST /progetti/{id}/attiva`)
- Controlli pre-attivazione: almeno 1 WP, almeno 1 allocazione, budget > 0
- Cambio stato bozza → attivo

**2. Gestione SAL**
- Backend: implementare endpoint `/sal` (stub presente, da completare)
- Frontend: SalPage con lista SAL, creazione, transizioni stato
- Macchina a stati: aperto → chiuso → inviato → rendicontato (+ deviazione contestato)
- Associazione automatica spese al SAL per data

**3. Gestione Spese**
- Backend: endpoint `/spese` (non ancora implementato)
- Frontend: form inserimento spesa a consuntivo
- Rettifica tramite nota di credito (importo negativo + spesa_origine_id)
- Aggiornamento automatico BUDGET_VOCE.importo_rendicontato

**4. Timesheet**
- Backend: implementare endpoint `/timesheet` con PUT `/righe` (stub presente)
- Frontend: TimesheetPage (lista) e TimesheetEditor (compilazione)
- Logica PUT righe: sostituzione completa righe+celle
- Flusso approvazione: ricercatore → PI → (firma aggiuntiva se template 3 firmatari)
- Snapshot costo orario all'approvazione

**5. Rendicontazione SAL**
- Export asincrono PDF/Excel/XML con job_id e polling
- AsyncExportButton già implementato (da collegare agli endpoint reali)
- Prospetto SAL con drill-down per voce di costo

**6. Autenticazione LDAP/SSO**
- Variabili d'ambiente già predisposte (LDAP_URL, LDAP_BASE_DN, ecc.)
- Da implementare nel backend quando l'IT di ateneo fornisce i dettagli

**7. Generazione documenti**
- Template Excel/PDF per timesheet e rendiconto
- Librerie Python: openpyxl (Excel), reportlab (PDF), lxml (XML)
- Già in requirements.txt

**8. Dashboard**
- Widget KPI con Recharts (BudgetDonut, AvanzamentoLine già implementati)
- Alert badge: SAL in scadenza, milestone in ritardo, timesheet pendenti
- Endpoint `/progetti/{id}/cruscotto` già definito (da implementare lato backend)

---

## 3. Architettura frontend

### Struttura cartelle
```
frontend/src/
├── api/           # Axios calls: client.ts, progetti.ts, personale.ts, partner.ts, sal.ts, timesheet.ts, budget.ts, config.ts
├── components/    # layout/ (AppLayout, AppSidebar, AppHeader), common/ (RbacGuard, StatoBadge, AsyncExportButton, ConfirmModal, ImportoBudget), gantt/, charts/
├── config/        # antd-theme.ts, constants.ts, env.ts
├── hooks/         # React Query hooks: useProgetti, usePersonale, useSal, useTimesheet, useBudget, useStruttura
├── i18n/          # it.ts
├── pages/         # dashboard/, progetti/, configurazione/WizardProgetto/, personale/, partner/, timesheet/, sal/, auth/
├── store/         # Zustand: useAuthStore, useLayoutStore, useWizardStore
├── types/         # api.ts, auth.ts, progetto.ts, struttura.ts, personale.ts, budget.ts, timesheet.ts
└── utils/         # formatters.ts, validators.ts, rbac.ts, queryKeys.ts
```

### Convenzioni chiave
- Query keys centralizzate in `queryKeys.ts`
- RBAC centralizzato in `utils/rbac.ts` con `canDo(ruolo, azione)`
- Notifiche via `App.useApp()` di Ant Design (NON `notification` statico)
- Errori backend letti da `error.response.data.detail.error` (struttura FastAPI)
- `switch (errData.code)` per messaggi specifici per tipo di errore
- Interceptor Axios in `api/client.ts` gestisce 401/403/409/500, propaga 422/404

---

## 4. Architettura backend

### Struttura
```
backend/
├── main.py                    # FastAPI app, CORS, router
├── app/
│   ├── api/v1/
│   │   ├── router.py          # Include tutti i router
│   │   └── endpoints/
│   │       ├── auth.py        # POST /auth/login
│   │       ├── progetti.py    # CRUD progetti + sub_router per /wp e /allocazioni
│   │       ├── personale.py   # CRUD persone, costi orari, monte ore
│   │       ├── partner.py     # CRUD partner
│   │       ├── sal.py         # Stub da implementare
│   │       ├── timesheet.py   # Stub da implementare
│   │       └── config.py      # Lookup: tipi finanziamento, voci costo, template
│   ├── core/
│   │   ├── config.py          # Settings (pydantic-settings)
│   │   ├── database.py        # SQLAlchemy session
│   │   ├── security.py        # JWT + bcrypt (NO passlib)
│   │   └── deps.py            # Dipendenze FastAPI: get_utente_corrente, richiedi_ruolo
│   └── models/                # SQLAlchemy ORM: tutti i 23 modelli
├── alembic/                   # Migrations
│   ├── env.py
│   └── versions/6a62fd0e4140_initial_schema.py
├── scripts/
│   └── seed.py                # Popola dati di configurazione e utenti test
└── requirements.txt           # bcrypt (NON passlib), fastapi, sqlalchemy, alembic, ecc.
```

### Note importanti backend
- **bcrypt diretto** — passlib rimosso perché incompatibile con bcrypt moderno su Python 3.12
- **sub_router** in `progetti.py` — endpoint `/wp/{id}` e `/allocazioni/{id}` usano `sub_router` con prefisso vuoto per evitare il prefisso `/progetti`
- **Errori HTTP** — struttura `{"detail": {"error": {"code": "...", "message": "..."}}}` (standard FastAPI)
- **Validazioni** — `_valida_date_nel_progetto()` riusabile per WP e allocazioni

### Comandi utili
```bash
# Nuova migrazione dopo modifica modelli
docker compose exec backend alembic revision --autogenerate -m "descrizione"
docker compose exec backend alembic upgrade head

# Riesegui seed (idempotente)
docker compose exec backend python scripts/seed.py

# Log backend in tempo reale
docker compose logs -f backend
```

---

## 5. Problemi noti / da verificare

| Problema | Stato |
|---|---|
| Modifica allocazione personale (Step5) | Implementato ma non ancora testato |
| Modifica anagrafica persona | Implementato, da testare |
| Sidebar voci Personale/Partner spariscono dopo refresh | Risolto con logout+login (token vecchio) |
| Alembic `versions/` — file placeholder nello zip | Il file reale è sul Mac in `backend/alembic/versions/` — NON sovrascrivere |

---

## 6. File da non toccare / attenzione

- `backend/alembic/versions/6a62fd0e4140_initial_schema.py` — lo zip contiene un placeholder, il file reale è sul Mac
- `.env.prod` — NON nel repo, da creare da `.env.prod.example`
- `nginx/certs/` — NON nel repo, da aggiungere quando disponibile certificato SSL
