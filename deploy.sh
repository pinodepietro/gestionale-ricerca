#!/bin/bash
# deploy.sh — primo avvio o aggiornamento in produzione
# Eseguire dalla directory gestionale-ricerca/ sul server
# Uso: bash deploy.sh

set -e

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.prod"

# ── Controllo prerequisiti ─────────────────────────────────────────────────
if [ ! -f ".env.prod" ]; then
  echo "ERRORE: file .env.prod non trovato."
  echo "Copia .env.prod.example in .env.prod e compila le variabili."
  exit 1
fi

echo "==> Build e avvio dei servizi..."
$COMPOSE up -d --build

echo "==> Attesa database ready..."
sleep 10

echo "==> Esecuzione migrazioni Alembic (opzionale)..."
$COMPOSE exec -T backend sh -c 'cd /app && alembic upgrade head' || echo "⚠️  Migrazioni non disponibili (schema creato via startup)"

echo "==> Verifica health services..."
$COMPOSE ps

echo ""
echo "✓ Deploy completato."
echo ""
echo "Accesso applicazione:"
echo "  HTTP:  http://localhost"
echo "  HTTPS: https://your-domain.com (configurare TLS)"
echo ""
echo "Per vedere i log:"
echo "  $COMPOSE logs -f"
echo ""
echo "Per creare superadmin (se necessario):"
echo "  $COMPOSE exec backend python -c 'from app.models.persona import Persona; ...'"
echo ""
