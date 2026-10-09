#!/bin/sh
# scripts/backup.sh
# Esegue pg_dump e mantiene gli ultimi 30 giorni di backup.
# NOTA: pg_dump e gzip vengono verificati SEPARATAMENTE per evitare backup corrotti.

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_SQL="/backups/.tmp_gestionale_${TIMESTAMP}.sql"
BACKUP_GZ="/backups/gestionale_${TIMESTAMP}.sql.gz"

echo "[$(date)] Avvio backup..."

# Step 1: Esegui pg_dump e salva temporaneamente
pg_dump \
  -h db \
  -U "${DB_USER:-dev}" \
  -d "${DB_NAME:-gestionale_ricerca}" \
  > "$BACKUP_SQL"

if [ $? -ne 0 ]; then
  echo "[$(date)] ERRORE: pg_dump fallito" >&2
  rm -f "$BACKUP_SQL"
  exit 1
fi

# Step 2: Comprimi il file
gzip "$BACKUP_SQL"

if [ $? -ne 0 ]; then
  echo "[$(date)] ERRORE: gzip fallito" >&2
  rm -f "$BACKUP_SQL" "$BACKUP_GZ"
  exit 1
fi

# Step 3: Verifica che il file compresso esista e non sia vuoto
if [ ! -s "$BACKUP_GZ" ]; then
  echo "[$(date)] ERRORE: backup vuoto o assente" >&2
  rm -f "$BACKUP_GZ"
  exit 1
fi

echo "[$(date)] Backup completato: $BACKUP_GZ ($(du -h "$BACKUP_GZ" | cut -f1))"

# Step 4: Elimina backup più vecchi di 30 giorni
find /backups -name "gestionale_*.sql.gz" -mtime +30 -delete
echo "[$(date)] Pulizia backup vecchi completata"
