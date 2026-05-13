# Gestionale Ricerca — Guida Completa

> Università Telematica Pegaso — Sistema di Gestione Progetti di Ricerca
>
> Versione: 1.0 — Maggio 2026

---

## Indice

1. [Panoramica del sistema](#1-panoramica-del-sistema)
2. [Architettura tecnica](#2-architettura-tecnica)
3. [Installazione e avvio](#3-installazione-e-avvio)
4. [Configurazione](#4-configurazione)
5. [Ruoli e permessi](#5-ruoli-e-permessi)
6. [Gestione utenti e personale](#6-gestione-utenti-e-personale)
7. [Gestione progetti](#7-gestione-progetti)
8. [Budget e rendicontazione](#8-budget-e-rendicontazione)
9. [Timesheet](#9-timesheet)
10. [SAL (Stato di Avanzamento Lavori)](#10-sal-stato-di-avanzamento-lavori)
11. [Portfolio e reportistica](#11-portfolio-e-reportistica)
12. [Notifiche](#12-notifiche)
13. [Integrazione con Missioni & Rimborsi](#13-integrazione-con-missioni--rimborsi)
14. [Manutenzione e amministrazione avanzata](#14-manutenzione-e-amministrazione-avanzata)
15. [Risoluzione problemi](#15-risoluzione-problemi)

---

## 1. Panoramica del sistema

Il Gestionale Ricerca è un'applicazione web per la gestione completa dei progetti di ricerca dell'Università Telematica Pegaso. Permette di:

- Censire e monitorare tutti i progetti di ricerca attivi
- Pianificare e rendicontare il budget per voce di costo
- Gestire i timesheet mensili del personale di ricerca
- Seguire l'iter dei SAL (stati di avanzamento lavori) verso i finanziatori
- Produrre report PDF/Excel per la rendicontazione
- Sincronizzarsi con il sistema Missioni & Rimborsi per le trasferte

### Concetti chiave

| Termine | Significato |
|---------|-------------|
| **Costo totale** | Costo complessivo del progetto (include cofinanziamento) |
| **Finanziato** | Contributo ricevuto dal finanziatore esterno |
| **Pianificato** | Somma delle voci di costo previste nel piano finanziario |
| **Rendicontato** | Importi formalmente rendicontati al finanziatore per voce |
| **Spese documentate** | Spese registrate nel sistema con stato "registrata" |

Esistono **due dimensioni di controllo** distinte:

- **Finanziato vs Speso**: quanto del contributo ricevuto è stato speso
- **Pianificato vs Rendicontato**: quanto del piano finanziario è stato rendicontato formalmente

---

## 2. Architettura tecnica

```
┌─────────────┐     HTTP/REST     ┌─────────────────┐
│   Frontend  │◄─────────────────►│    Backend API  │
│  React 18   │                   │   FastAPI 0.11  │
│  TypeScript │                   │   Python 3.11   │
│  Ant Design │                   │                 │
│  porta 5173 │                   │   porta 8000    │
└─────────────┘                   └────────┬────────┘
                                           │
                                   SQLAlchemy ORM
                                           │
                                  ┌────────▼────────┐
                                  │  PostgreSQL 16  │
                                  │  DB: gestionale │
                                  │     _ricerca    │
                                  │   porta 5432    │
                                  └─────────────────┘
```

### Stack frontend
- **React 18** + **TypeScript**
- **Ant Design 5** — componenti UI
- **TanStack React Query v5** — fetching dati e cache
- **Zustand** — stato globale (autenticazione)
- **React Router v6** — routing
- **Vite** — build tool

### Stack backend
- **FastAPI** — framework API REST
- **SQLAlchemy 2** — ORM
- **Alembic** — gestione migrazioni schema (nota: in sviluppo si usano `ALTER TABLE` diretti)
- **Passlib / bcrypt** — hashing password
- **python-jose** — generazione e verifica JWT

### Autenticazione
- JWT (JSON Web Token) con scadenza 8 ore
- Token salvato in `localStorage` come `access_token`
- Ogni richiesta API include header `Authorization: Bearer <token>`
- Ruoli codificati nel payload del token

---

## 3. Installazione e avvio

### Prerequisiti

- Docker Desktop ≥ 4.x
- Docker Compose ≥ 2.x
- Porta 5173, 8000, 5432, 8080 libere sull'host

### Avvio rapido

```bash
cd gestionale-ricerca
docker compose up -d
```

I servizi che vengono avviati:

| Servizio | Porta host | Descrizione |
|----------|-----------|-------------|
| `db` | 5432 | PostgreSQL 16 |
| `backend` | 8000 | API FastAPI |
| `frontend` | 5173 | UI React (Vite dev server) |
| `adminer` | 8080 | Interfaccia web DB |
| `missioni` | 8001 | App Django Missioni & Rimborsi |

### Verifica avvio

```bash
# Stato servizi
docker compose ps

# Log backend
docker compose logs -f backend

# Log frontend
docker compose logs -f frontend

# Test API
curl http://localhost:8000/health
```

### Primo avvio (inizializzazione DB)

Al primo avvio il database viene creato automaticamente tramite `CREATE TABLE IF NOT EXISTS`. Se si parte da zero:

```bash
# Entrare nel container backend
docker compose exec backend bash

# Il DB viene inizializzato all'avvio dell'app
# Verificare i log per conferma
```

Per creare il primo utente superadmin, utilizzare l'endpoint dedicato (o inserirlo direttamente nel DB):

```bash
docker compose exec db psql -U postgres -d gestionale_ricerca -c "
INSERT INTO persona (id, nome, cognome, email, password_hash, ruolo, attivo)
VALUES (gen_random_uuid(), 'Admin', 'Sistema', 'admin@unipegaso.it',
  '\$2b\$12\$...', 'superadmin', true);
"
```

> Usare `htpasswd -bnBC 12 "" <password>` o Python `passlib` per generare l'hash bcrypt.

---

## 4. Configurazione

### Variabili d'ambiente (docker-compose.yml)

```yaml
backend:
  environment:
    DATABASE_URL: postgresql://postgres:postgres@db:5432/gestionale_ricerca
    SECRET_KEY: <chiave-jwt-segreta-min-32-char>
    ALGORITHM: HS256
    ACCESS_TOKEN_EXPIRE_MINUTES: 480
    SYNC_API_KEY: <chiave-sync-missioni>
    MISSIONI_URL: http://missioni:8001

missioni:
  environment:
    DB_HOST: db
    DB_PORT: 5432
    DB_NAME: gestionale_ricerca    # stesso DB
    GESTIONALE_URL: http://backend:8000
    GESTIONALE_SYNC_KEY: <stessa-chiave-sync>
    GESTIONALE_DB_NAME: gestionale_ricerca
    SECRET_KEY: <chiave-django>
    DEBUG: "False"
```

> **Importante**: `SYNC_API_KEY` e `GESTIONALE_SYNC_KEY` devono essere la stessa stringa.

### Configurazioni in-app (superadmin)

Alcune configurazioni sono gestibili dall'interfaccia web senza toccare il codice:

1. **Tipologie progetto** — Menu → Configurazione → Tipologie
   - Aggiungere/rimuovere le categorie disponibili nel wizard "Nuovo progetto"

2. **Template timesheet** — Menu → Configurazione → Template
   - Definire i fogli ore standard per tipologia di finanziamento

---

## 5. Ruoli e permessi

### Matrice permessi completa

| Funzione | Ricercatore | PI | Amministrativo | Management | Monitor | Superadmin |
|----------|:-----------:|:--:|:--------------:|:----------:|:-------:|:----------:|
| Login | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Vedere propri progetti | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Vedere tutti i progetti | — | — | ✓ | ✓ | ✓ | ✓ |
| Inserire timesheet | ✓ | ✓ | — | — | — | — |
| Approvare timesheet | — | ✓* | ✓ | — | — | ✓ |
| Creare progetto | — | — | ✓ | — | — | ✓ |
| Modificare progetto | — | — | ✓ | — | — | ✓ |
| Eliminare progetto bozza | — | — | ✓ | — | — | ✓ |
| Eliminare progetto (qualsiasi stato) | — | — | — | — | — | ✓ |
| Attivare progetto | — | — | ✓ | — | — | ✓ |
| Gestire budget/spese | — | — | ✓ | — | — | ✓ |
| Gestire SAL | — | — | ✓ | — | — | ✓ |
| Allocare personale | — | — | ✓ | — | — | ✓ |
| Creare personale | — | — | ✓ | — | — | ✓ |
| Gestire personale (tutti) | — | — | — | — | — | ✓ |
| Esportare report | — | ✓** | ✓ | — | — | ✓ |
| Dashboard portfolio | — | — | ✓ | ✓ | ✓ | ✓ |
| Configurazione sistema | — | — | — | — | — | ✓ |

\* Il PI non può approvare il proprio timesheet  
\*\* Il PI può esportare solo i report dei propri progetti

### Il ruolo PI

Il PI (Principal Investigator) **non è un ruolo di sistema** ma una funzione per-progetto. Un ricercatore diventa PI di un progetto quando viene allocato con il flag `is_pi = true`.

```
Persona.ruolo = 'ricercatore'  →  ruolo di sistema
Allocazione.is_pi = true       →  PI del progetto specifico
```

Un ricercatore può essere PI di un progetto e semplice membro di un altro.

### Ruoli non allocabili

I ruoli `management`, `monitor` e `superadmin` non possono essere allocati a un progetto (non appaiono nel dropdown allocazione). Solo `ricercatore` e `amministrativo` sono allocabili.

---

## 6. Gestione utenti e personale

### Creare un nuovo utente

1. Menu laterale → **Personale** → **Nuova persona**
2. Compilare tutti i campi obbligatori:

| Campo | Note |
|-------|------|
| Nome, Cognome | — |
| Email | Usata come username — deve essere univoca |
| Ruolo | `ricercatore`, `amministrativo`, `management`, `monitor`, `superadmin` |
| Livello contratto | Es. "Ricercatore III livello" |
| Data inizio servizio | — |
| Costo orario | Storicizzato per data — usato nei calcoli di costo personale |
| Password iniziale | Min 8 caratteri — l'utente dovrebbe cambiarla al primo accesso |

> Per i ruoli `ricercatore` e `amministrativo`, l'utente viene sincronizzato automaticamente nel sistema Missioni & Rimborsi con le stesse credenziali.

### Modificare un utente

1. Menu → **Personale** → cliccare sulla persona
2. Cliccare l'icona **Modifica**
3. Modificare i campi e **Salva**

> La modifica di email o nome viene propagata automaticamente a Missioni & Rimborsi se il ruolo è `ricercatore` o `amministrativo`.

### Reimpostare la password

1. Menu → **Personale** → aprire la scheda
2. **Reimposta password**
3. Inserire la nuova password (min 8 caratteri) e confermarla
4. **Salva**

> La nuova password viene sincronizzata automaticamente con Missioni & Rimborsi.

### Storico costo orario

Ogni persona può avere più voci di costo orario nel tempo. Il sistema usa il costo valido alla data delle ore rendicontate per calcolare i costi effettivi del progetto.

1. Aprire la scheda persona
2. Sezione **Costo orario** → **Aggiungi**
3. Inserire importo e data di inizio validità

### Disattivare un utente

Un utente disattivato non può effettuare il login ma i suoi dati storici restano nel sistema.

1. Menu → **Personale** → aprire la scheda
2. **Disattiva** (disponibile solo per superadmin)

---

## 7. Gestione progetti

### Ciclo di vita di un progetto

```
BOZZA → ATTIVO → CHIUSO → RENDICONTATO
                    ↑
              (anche da ATTIVO)
```

- **Bozza**: progetto in preparazione, non ancora operativo
- **Attivo**: progetto in corso, sincronizzato con Missioni & Rimborsi
- **Chiuso**: attività terminate, in fase di rendicontazione finale
- **Rendicontato**: rendicontazione completata, archivio

### Wizard creazione progetto (3 step)

**Step 1 — Anagrafica**

| Campo | Obbligatorio | Note |
|-------|:---:|------|
| Codice | ✓ | Identificativo univoco (es. "PRIN-2024-001") |
| Titolo | ✓ | Titolo completo del progetto |
| Acronimo | ✓ | Sigla breve |
| Tipo | ✓ | Da lista configurabile |
| Riferimento bando | — | Numero/codice del bando di riferimento |
| Data inizio | ✓ | |
| Data fine | ✓ | |
| Data fine rendicontazione | — | Scadenza rendicontazione (spesso > data fine) |
| Costo totale | ✓ | Costo complessivo del progetto |
| Importo finanziato | ✓ | Quota coperta dal finanziatore |
| CUP | — | Codice Unico di Progetto |
| Note | — | |

**Step 2 — Finanziamento**

- Selezionare il **tipo di finanziamento** (finanziatore + template timesheet associato)
- Aggiungere le **voci di costo** con importi previsti:
  - Personale
  - Strumentazione
  - Missioni
  - Consumabili
  - Overhead
  - Altre voci configurabili

**Step 3 — Riepilogo**

- Verifica dati inseriti
- Cliccare **Crea progetto**
- Il progetto viene creato in stato **Bozza**

### Attivare un progetto

L'attivazione è irreversibile in senso diretto (un progetto attivo non torna in bozza).

1. Aprire il progetto in stato Bozza
2. **Attiva progetto** (in alto a destra)
3. Confermare

All'attivazione:
- Il progetto diventa visibile ai membri allocati
- Il progetto viene sincronizzato con Missioni & Rimborsi
- I timesheet possono essere inseriti

### Tab del progetto

| Tab | Contenuto | Chi può modificare |
|-----|-----------|-------------------|
| **Info** | Anagrafica, KPI, tachimetri | Amministrativo, Superadmin |
| **Budget** | Voci di costo con pianificato/rendicontato | Amministrativo, Superadmin |
| **Gantt** | Visualizzazione temporale WP/deliverable | Amministrativo, Superadmin |
| **Spese** | Registro spese documentate | Amministrativo, Superadmin |
| **Timesheet** | Ore mensili del personale | Ricercatore (inserimento), PI/Amm (approvazione) |
| **Allocazioni** | Personale assegnato con ore e ruolo | Amministrativo, Superadmin |
| **Partner** | Enti partner del progetto | Amministrativo, Superadmin |
| **Documenti** | File allegati (contratto, proposta, ecc.) | Amministrativo, Superadmin |

### Eliminare un progetto

- **Amministrativo**: può eliminare solo progetti in stato **Bozza**
- **Superadmin**: può eliminare progetti in **qualsiasi stato**

L'eliminazione è irreversibile e propaga la rimozione a Missioni & Rimborsi.

---

## 8. Budget e rendicontazione

### Struttura del budget

Il budget di un progetto è organizzato per **voci di costo**. Per ogni voce esistono due valori:

- `importo_previsto` (**pianificato**): quanto si prevede di spendere in quella voce
- `importo_rendicontato` (**rendicontato**): quanto è stato formalmente rendicontato

### Registrare una spesa

1. Aprire il progetto → tab **Spese**
2. **Nuova spesa**
3. Compilare:

| Campo | Note |
|-------|------|
| Voce di costo | Deve corrispondere a una voce nel budget |
| Importo | In euro |
| Data | Data della spesa/fattura |
| Descrizione | Riferimento documento, fornitore, ecc. |
| Allegato | PDF fattura o ricevuta (opzionale) |

4. **Salva** — la spesa entra in stato `registrata`

> Una spesa registrata concorre al calcolo delle `spese_documentate` usato nel tachimetro "Finanziato vs Speso".

### Aggiornare la rendicontazione

Per aggiornare l'importo rendicontato di una voce di costo:

1. Aprire il progetto → tab **Budget**
2. Cliccare sulla voce di costo → **Modifica**
3. Aggiornare il campo **Importo rendicontato**
4. **Salva**

### Tachimetri del cruscotto

Nella scheda progetto (Dashboard → cliccare progetto) appaiono tre tachimetri SVG:

| Tachimetro | Formula | Significato |
|-----------|---------|-------------|
| **Rendicontato / Pianificato** | rendicontato / pianificato | Avanzamento rendicontazione formale |
| **Speso / Finanziato** | spese_documentate / importo_finanziato | Utilizzo del contributo ricevuto |
| **Avanzamento temporale** | giorni_trascorsi / durata_totale | % durata del progetto trascorsa |

I colori indicano: verde < 70%, arancio 70–90%, rosso > 90%.

---

## 9. Timesheet

### Flusso di approvazione

```
BOZZA → INVIATO → APPROVATO
                ↘
              RIFIUTATO → (modifica) → INVIATO
```

### Inserire un timesheet (ricercatore / PI)

1. Menu → **Timesheet** → **Nuovo timesheet**
2. Selezionare:
   - Progetto (solo quelli a cui si è allocati)
   - Mese e anno
3. Compilare la griglia delle ore giornaliere
4. **Salva bozza** (per continuare dopo) oppure **Invia** (per sottomettere all'approvazione)

> Un timesheet inviato è bloccato in scrittura finché non viene rifiutato.

### Approvare/rifiutare un timesheet (PI / amministrativo)

1. Notifica campanella → cliccare la notifica, oppure Menu → **Timesheet**
2. Filtrare per stato **Inviato**
3. Aprire il timesheet e verificare le ore
4. **Approva** o **Rifiuta** (inserire motivo in caso di rifiuto)

> Il PI non può approvare il proprio timesheet — deve farlo un altro PI o un amministrativo.

### Regole di business

- Un ricercatore può avere al massimo un timesheet per progetto per mese
- Un timesheet approvato non è più modificabile
- Il numero di ore totali nel mese non può superare le ore contrattuali mensili (se configurate)
- Il timesheet contribuisce al calcolo delle ore consuntivate nel cruscotto progetto

---

## 10. SAL (Stato di Avanzamento Lavori)

### Ciclo di vita SAL

```
APERTO → CHIUSO → INVIATO → RENDICONTATO
                     ↘
                  CONTESTATO → (revisione) → INVIATO
```

### Gestire un SAL

1. Aprire il progetto → tab **SAL**
2. Cliccare su un SAL per aprirne il dettaglio
3. Le azioni disponibili dipendono dallo stato:

| Stato attuale | Azione disponibile | Stato successivo |
|:---:|---|:---:|
| Aperto | Chiudi SAL | Chiuso |
| Chiuso | Invia al finanziatore | Inviato |
| Inviato | Rendiconta (inserire importo erogato) | Rendicontato |
| Inviato | Segna come contestato | Contestato |
| Contestato | Riapri lavorazione | Chiuso |

> Ogni SAL ha una scadenza. I SAL in scadenza nei prossimi 30 giorni appaiono come alert nel Portfolio.

---

## 11. Portfolio e reportistica

### Vista Portfolio

Il Portfolio è accessibile da Menu → **Portfolio** (ruoli: amministrativo, management, monitor, superadmin; i ricercatori vedono solo i propri progetti).

Contenuto della pagina:

1. **Alert** — timesheet pendenti e SAL in scadenza
2. **KPI globali** (5 card):
   - Progetti attivi
   - Costo totale portfolio
   - Totale finanziato
   - Spese registrate (% del finanziato)
   - Rendicontato (% del pianificato)
3. **Tabella espandibile** — un progetto per riga con:
   - Barra "Finanziato vs Speso"
   - Barra "Pianificato vs Rendicontato"
   - PI, data fine (in rosso se < 30 giorni)
4. **Riga espandibile** (▶) — dettaglio completo con 4 indicatori

### Esportare un report

1. Aprire la scheda del progetto (Menu **Progetti** → cliccare il progetto)
2. In alto a destra → **Genera Report**
3. Scegliere **PDF** o **Excel**
4. Il file viene scaricato automaticamente

I report includono: anagrafica, budget per voce, spese, timesheet approvati, allocazioni, SAL.

---

## 12. Notifiche

Il sistema genera notifiche automatiche per i seguenti eventi:

| Evento | Destinatario |
|--------|-------------|
| Timesheet inviato | PI del progetto |
| Timesheet approvato | Ricercatore mittente |
| Timesheet rifiutato | Ricercatore mittente |
| SAL in scadenza (30 gg) | Amministrativo del progetto |
| Progetto in scadenza (30 gg) | PI e Amministrativo |

Le notifiche non lette appaiono sulla campanella in alto a destra. Le notifiche urgenti appaiono in rosso.

---

## 13. Integrazione con Missioni & Rimborsi

### Sincronizzazione progetti

Quando un progetto viene **attivato**, **modificato** o **eliminato** nel Gestionale, viene inviata una notifica in background all'app Missioni & Rimborsi per mantenere la lista progetti aggiornata.

Il meccanismo:
1. Azione nel Gestionale (attiva/modifica/elimina)
2. Background task FastAPI → `POST http://missioni:8001/internal/sync-progetti/`
3. Django esegue il comando `sync_progetti` che aggiorna la propria tabella
4. I progetti non più attivi nel Gestionale vengono marcati `attivo=False` in Missioni

### Sincronizzazione utenti

Quando un utente con ruolo `ricercatore` o `amministrativo` viene **creato o modificato** nel Gestionale:

1. Background task → `POST http://missioni:8001/internal/sync-utente/`
2. Django crea o aggiorna il corrispondente `auth_user`
3. Le credenziali (email/password) sono le stesse in entrambe le app

### Compatibilità password

Il Gestionale usa `passlib + bcrypt` per hashare le password (formato `$2b$12$...`).
Il sistema Missioni & Rimborsi usa un hasher custom `BCryptRawPasswordHasher` che verifica direttamente l'hash bcrypt senza il pre-hashing SHA256 di Django.

Al primo login su Missioni, l'hash viene automaticamente aggiornato a PBKDF2 (standard Django).

### Sincronizzazione manuale password (una tantum)

Se si parte da un database già popolato con utenti esistenti:

```bash
docker compose exec missioni python manage.py sync_password
```

Questo comando copia gli hash bcrypt dal DB del Gestionale agli utenti Django di Missioni.

### Navigazione tra le app

La landing page pubblica `http://localhost:8001/` offre due bottoni:
- **Gestione Progetti Ricerca** → `http://localhost:5173`
- **Missioni e Rimborsi** → form login Missioni

Gli utenti autenticati su Missioni vengono reindirizzati direttamente alla dashboard.

---

## 14. Manutenzione e amministrazione avanzata

### Backup del database

```bash
# Backup
docker compose exec db pg_dump -U postgres gestionale_ricerca > backup_$(date +%Y%m%d).sql

# Ripristino
docker compose exec -T db psql -U postgres gestionale_ricerca < backup_YYYYMMDD.sql
```

### Aggiornamento schema DB

Il progetto usa `ALTER TABLE` diretti (non Alembic in fase di sviluppo):

```bash
docker compose exec db psql -U postgres -d gestionale_ricerca -c "
ALTER TABLE tabella ADD COLUMN nome tipo DEFAULT valore;
"
```

### Log applicativi

```bash
# Backend FastAPI
docker compose logs -f backend

# Missioni Django
docker compose logs -f missioni

# Tutti i servizi
docker compose logs -f
```

### Accesso diretto al DB (Adminer)

1. Aprire `http://localhost:8080`
2. Sistema: PostgreSQL
3. Server: `db`
4. Utente: `postgres`
5. Password: `postgres` (o quella configurata)
6. Database: `gestionale_ricerca`

### Riavvio servizi

```bash
# Riavviare un singolo servizio
docker compose restart backend

# Ricostruire dopo modifica codice
docker compose up -d --build backend
docker compose up -d --build frontend
```

### Configurazione SMTP (email)

Attualmente la configurazione email è vuota — le notifiche sono solo in-app. Per abilitare le email:

Nel `docker-compose.yml`, aggiungere al servizio `backend`:

```yaml
environment:
  SMTP_HOST: smtp.unipegaso.it
  SMTP_PORT: 587
  SMTP_USER: noreply@unipegaso.it
  SMTP_PASSWORD: <password>
  SMTP_FROM: noreply@unipegaso.it
```

---

## 15. Risoluzione problemi

### Il frontend non carica

1. Verificare che il container `frontend` sia in stato `Up`: `docker compose ps`
2. Controllare i log: `docker compose logs frontend`
3. Verificare che la porta 5173 non sia occupata: `lsof -i :5173`

### Il login fallisce con credenziali corrette

1. Verificare che il backend sia raggiungibile: `curl http://localhost:8000/health`
2. Controllare che l'utente esista e sia attivo nel DB
3. Verificare che l'hash della password sia corretto (formato `$2b$12$...`)

### La sincronizzazione con Missioni non avviene

1. Verificare che il servizio `missioni` sia in esecuzione: `docker compose ps missioni`
2. Controllare che `SYNC_API_KEY` e `GESTIONALE_SYNC_KEY` siano identici nei due servizi
3. Controllare i log del backend per errori di background task: `docker compose logs backend | grep sync`
4. Testare manualmente: `docker compose exec missioni python manage.py sync_progetti`

### Un utente non vede il proprio progetto

1. Verificare che l'utente sia allocato al progetto: aprire il progetto → tab **Allocazioni**
2. Verificare che il progetto sia in stato **Attivo** (non Bozza)
3. Verificare che il ruolo dell'utente non sia `management`, `monitor`, o `superadmin` (questi ruoli non sono allocabili)

### I tachimetri mostrano 0%

Verificare che:
1. Il budget abbia voci di costo con `importo_previsto > 0` (per il tachimetro Rendicontato/Pianificato)
2. Il progetto abbia `importo_finanziato > 0` (per il tachimetro Speso/Finanziato)
3. Le date di inizio e fine siano valorizzate (per il tachimetro Tempo)

### Errore "Forbidden" nel PI su approvazione timesheet

Il PI non può approvare il proprio timesheet. È necessario che un altro PI o un amministrativo del progetto effettui l'approvazione.

---

*Documento generato: Maggio 2026 — Università Telematica Pegaso*
