#!/bin/bash
# setup-server.sh — primo avvio sul server (Ubuntu 22.04)
# Installa Docker, genera le chiavi sicure e crea .env.prod
# Eseguire come root dalla directory gestionale-ricerca/
#
# Uso: bash setup-server.sh

set -e

# ── Colori ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC}  $1"; }
err()  { echo -e "${RED}✗${NC}  $1"; exit 1; }

echo ""
echo "══════════════════════════════════════════════════════"
echo "  Setup server — Gestionale Ricerca + Missioni"
echo "══════════════════════════════════════════════════════"
echo ""

# ── Controllo directory ────────────────────────────────────────────────────
if [ ! -f "docker-compose.prod.yml" ]; then
  err "Esegui questo script dalla directory gestionale-ricerca/"
fi

if [ ! -d "../missioni-app" ]; then
  err "Directory ../missioni-app non trovata. Trasferisci prima i file con rsync."
fi

# ── Installazione Docker ───────────────────────────────────────────────────
if command -v docker &>/dev/null; then
  ok "Docker già installato: $(docker --version)"
else
  echo "==> Installazione Docker..."
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable --now docker
  ok "Docker installato: $(docker --version)"
fi

# ── Se .env.prod esiste già, chiedi conferma ───────────────────────────────
if [ -f ".env.prod" ]; then
  warn ".env.prod già presente."
  read -r -p "   Vuoi sovrascriverlo? (s/N) " OVERWRITE
  if [[ ! "$OVERWRITE" =~ ^[sS]$ ]]; then
    echo ""
    echo "==> .env.prod invariato. Avvio deploy..."
    bash deploy.sh
    exit 0
  fi
fi

# ── Richiesta IP / dominio ─────────────────────────────────────────────────
echo ""
echo "Inserisci l'IP pubblico del server (es. 1.2.3.4)"
echo "oppure il dominio se hai già un DNS (es. gestionale.ateneo.it):"
read -r -p "  IP o dominio: " SERVER_HOST

if [ -z "$SERVER_HOST" ]; then
  err "IP/dominio obbligatorio."
fi

# Determina http:// o https://
if [[ "$SERVER_HOST" == *.* && "$SERVER_HOST" != http* ]]; then
  BASE_URL="http://${SERVER_HOST}"
else
  BASE_URL="$SERVER_HOST"
fi

# ── Generazione chiavi sicure ──────────────────────────────────────────────
echo ""
echo "==> Generazione chiavi sicure..."

DB_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 64)
DJANGO_SECRET_KEY=$(openssl rand -hex 50)
SYNC_API_KEY=$(openssl rand -hex 32)

ok "Chiavi generate."

# ── Scrittura .env.prod ────────────────────────────────────────────────────
echo ""
echo "==> Scrittura .env.prod..."

cat > .env.prod <<EOF
# .env.prod — generato da setup-server.sh — NON committare

# ── Database condiviso ────────────────────────────────────────────────────
DB_NAME=gestionale_ricerca
DB_USER=gestionale_user
DB_PASSWORD=${DB_PASSWORD}

# ── Gestionale (FastAPI) ──────────────────────────────────────────────────
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRE_MINUTES=480
ALLOWED_ORIGINS=${BASE_URL}
UPLOAD_DIR=/app/uploads

# ── Missioni-app (Django) ─────────────────────────────────────────────────
MISSIONI_DB_NAME=missioni
DJANGO_SECRET_KEY=${DJANGO_SECRET_KEY}
ALLOWED_HOSTS=${SERVER_HOST}
CSRF_TRUSTED_ORIGINS=${BASE_URL}:8001
MISSIONI_SITE_URL=${BASE_URL}:8001
GESTIONALE_FRONTEND_URL=${BASE_URL}

# ── Integrazione gestionale ↔ missioni ───────────────────────────────────
SYNC_API_KEY=${SYNC_API_KEY}
EOF

chmod 600 .env.prod
ok ".env.prod creato (permessi 600)."

# ── Riepilogo ──────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════"
echo "  Configurazione completata"
echo "══════════════════════════════════════════════════════"
echo ""
echo "  Server:      ${SERVER_HOST}"
echo "  Gestionale:  ${BASE_URL}/"
echo "  Missioni:    ${BASE_URL}:8001/"
echo ""
echo "  DB password:  ${DB_PASSWORD}"
echo "  (salvata in .env.prod — conserva questo file in luogo sicuro)"
echo ""

# ── Avvio deploy ───────────────────────────────────────────────────────────
read -r -p "Avviare subito il deploy? (S/n) " START_DEPLOY
if [[ ! "$START_DEPLOY" =~ ^[nN]$ ]]; then
  echo ""
  bash deploy.sh
else
  echo ""
  echo "Per avviare il deploy in seguito:"
  echo "  bash deploy.sh"
fi
