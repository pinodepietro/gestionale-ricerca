#!/bin/bash

# Script di riavvio gestionale-ricerca dopo reboot

echo "🔄 Riavviando gestionale-ricerca..."

cd /Users/pino/gestionale-ricerca

# Riavvia i container
docker compose up -d

# Aspetta che si avviino
echo "⏳ Attendo l'avvio dei servizi (20 secondi)..."
sleep 20

# Verifica lo stato
echo "📊 Stato container:"
docker compose ps

# Check se tutti sono up
RUNNING=$(docker compose ps | grep -c "Up")
TOTAL=5

if [ "$RUNNING" -eq "$TOTAL" ]; then
    echo "✅ Tutti i servizi sono online!"
    echo ""
    echo "🌐 Accedi al sito: http://localhost:5173"
    echo "💾 Database: localhost:5432 (user: dev, password: dev)"
    echo "🛠️  Adminer: http://localhost:5051"
else
    echo "⚠️  Alcuni servizi non sono up. Controlla i log:"
    echo "docker compose logs"
fi
