#!/bin/sh
# scripts/run-backup-loop.sh
# Esegue backup.sh ogni giorno alle 02:00 (senza dipendere da cron, non presente nell'immagine postgres).

while true; do
  hour=$(date +%H)
  minute=$(date +%M)
  if [ "$hour" = "02" ] && [ "$minute" = "00" ]; then
    sh /backup.sh >> /var/log/backup.log 2>&1
    sleep 60
  fi
  sleep 20
done
