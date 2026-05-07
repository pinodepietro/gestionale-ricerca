#!/bin/sh
# scripts/backup.sh
# Esegue pg_dump e mantiene gli ultimi 30 giorni di backup.

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/backups/gestionale_${TIMESTAMP}.sql.gz"

echo "[$(date)] Avvio backup..."

pg_dump \
  -h db \
  -U "${DB_USER:-dev}" \
  -d "${DB_NAME:-gestionale_ricerca}" \
  | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "[$(date)] Backup completato: $BACKUP_FILE"
else
  echo "[$(date)] ERRORE durante il backup" >&2
  exit 1
fi

# Elimina backup più vecchi di 30 giorni
find /backups -name "gestionale_*.sql.gz" -mtime +30 -delete
echo "[$(date)] Pulizia backup vecchi completata"
