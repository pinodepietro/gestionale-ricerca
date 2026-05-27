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

if [ ! -d "../missioni-app" ]; then
  echo "ERRORE: directory ../missioni-app non trovata."
  echo "Clona il repository missioni-app nella stessa cartella padre."
  exit 1
fi

echo "==> Build e avvio dei servizi..."
$COMPOSE up -d --build

echo "==> Attesa avvio missioni..."
sleep 10

echo "==> Migrazioni gestionale (già gestite dall'entrypoint FastAPI)"
echo "==> Verifica migrazioni missioni..."
$COMPOSE exec missioni python manage.py migrate --noinput

echo "==> File statici missioni..."
$COMPOSE exec missioni python manage.py collectstatic --noinput

echo ""
echo "✓ Deploy completato."
echo ""
echo "  Gestionale:  http://$(grep ALLOWED_ORIGINS .env.prod | cut -d= -f2 | sed 's|http://||')/"
echo "  Missioni:    http://$(grep ALLOWED_HOSTS .env.prod | cut -d= -f2 | head -1):8001/"
echo ""
echo "Per creare il superadmin Django (solo primo avvio):"
echo "  $COMPOSE exec missioni python manage.py createsuperuser"
echo ""
echo "Per vedere i log:"
echo "  $COMPOSE logs -f"
