# Gestionale Progetti di Ricerca

Web application per la gestione di progetti di ricerca universitari.

## Stack

- **Frontend**: React 18 + TypeScript + Ant Design + React Query + Zustand
- **Backend**: FastAPI (Python) — da implementare
- **Database**: PostgreSQL 16
- **Infrastruttura**: Docker + Nginx

## Avvio sviluppo (Mac)

### Prerequisiti
- Docker Desktop installato e avviato
- Node.js 20+ (solo se vuoi sviluppare il frontend fuori da Docker)

### Prima installazione

```bash
# Clona il repo e posizionati nella cartella
cd gestionale-ricerca

# Avvia tutti i servizi
docker compose up -d

# Controlla che i container siano in esecuzione
docker compose ps
```

L'applicazione sarà disponibile su:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Database**: localhost:5432

### Comandi utili

```bash
# Avvia
docker compose up -d

# Ferma
docker compose down

# Vedi i log
docker compose logs -f frontend
docker compose logs -f backend

# Rebuild dopo modifiche al Dockerfile o package.json
docker compose up -d --build frontend
```

## Deploy produzione (server on-premise)

```bash
# Copia .env.prod.example → .env.prod e compila le variabili
cp .env.prod.example .env.prod
nano .env.prod

# Avvia in produzione
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

Vedi i commenti in `docker-compose.prod.yml` per la configurazione SSL e storage file.

## Struttura del progetto

```
gestionale-ricerca/
├── frontend/          # React + TypeScript
├── backend/           # FastAPI (Python) — da scaffoldare
├── nginx/             # Config Nginx produzione
└── scripts/           # Script backup DB
```

## Decisioni architetturali

Tutte le decisioni di progetto sono documentate in `handoff_gestionale_ricerca.docx`.
Il modello dati completo (23 entità) è in `schema_gestionale_ricerca_v2.4.docx`.
