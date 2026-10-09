# Setup TLS/HTTPS per Produzione

**Data**: 2026-10-09  
**Status**: INF-4 Fix  
**Requisito**: HTTPS obbligatorio in produzione

---

## 📋 Prerequisiti

- Dominio DNS configurato (es: `gestionale.example.com`)
- Accesso SSH al server produzione
- Certbot installato (per Let's Encrypt)

---

## 🔐 Opzione A: Let's Encrypt + Certbot (RACCOMANDATO)

Questo è il metodo gratuito e automatico consigliato.

### Step 1: Installare Certbot sul server

```bash
sudo apt-get update && sudo apt-get install -y certbot python3-certbot-nginx
```

### Step 2: Generare certificato

```bash
sudo certbot certonly --standalone \
  -d gestionale.example.com \
  --email admin@example.com \
  --agree-tos \
  -n
```

I certificati verranno salvati in `/etc/letsencrypt/live/gestionale.example.com/`

### Step 3: Copiare certificati nel container

```bash
sudo mkdir -p /root/opt/gestionale-ricerca/nginx/certs
sudo cp /etc/letsencrypt/live/gestionale.example.com/fullchain.pem \
        /root/opt/gestionale-ricerca/nginx/certs/cert.pem
sudo cp /etc/letsencrypt/live/gestionale.example.com/privkey.pem \
        /root/opt/gestionale-ricerca/nginx/certs/key.pem
sudo chown -R $(whoami):$(whoami) /root/opt/gestionale-ricerca/nginx/certs
```

### Step 4: Configurare auto-renewal

```bash
sudo certbot renew --dry-run  # Test
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## 🔧 Opzione B: Certificato Self-Signed (SVILUPPO SOLO)

Se non hai un dominio, usa self-signed per testing:

```bash
mkdir -p nginx/certs

openssl req -x509 -newkey rsa:4096 \
  -keyout nginx/certs/key.pem \
  -out nginx/certs/cert.pem \
  -days 365 \
  -nodes \
  -subj "/CN=localhost"
```

⚠️ **NOTA**: Il browser mostrerà warning di certificato non trusted. Usare SOLO per testing.

---

## 🚀 Attivare HTTPS nel Deploy

### Step 1: Aggiornare docker-compose.prod.yml

Sostituisci la volume di nginx.conf:

```yaml
nginx:
  volumes:
    - ./nginx/nginx.prod.ssl.conf:/etc/nginx/nginx.conf:ro
    - ./nginx/certs:/etc/nginx/certs:ro
  ports:
    - "80:80"
    - "443:443"
```

### Step 2: Deploy

```bash
cd /root/opt/gestionale-ricerca
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

### Step 3: Verificare

```bash
curl -k https://gestionale.example.com/api/health
# Output: {"status":"ok"}
```

---

## 🔄 Certificato Scaduto?

### Con Let's Encrypt

```bash
# Rinnovare manualmente
sudo certbot renew --force-renewal

# Copiare i certificati aggiornati
sudo cp /etc/letsencrypt/live/gestionale.example.com/fullchain.pem \
        /root/opt/gestionale-ricerca/nginx/certs/cert.pem
sudo cp /etc/letsencrypt/live/gestionale.example.com/privkey.pem \
        /root/opt/gestionale-ricerca/nginx/certs/key.pem

# Restart nginx
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

---

## 📊 Checklist

- [ ] Dominio DNS configurato
- [ ] Certificato ottenuto (Let's Encrypt o self-signed)
- [ ] Certificati copiati in `nginx/certs/`
- [ ] docker-compose.prod.yml aggiornato
- [ ] Port 443 aperta nel firewall
- [ ] HTTPS verificato (curl -k https://...)
- [ ] HTTP reindirizza a HTTPS
- [ ] Browser accetta certificato (se Let's Encrypt)

---

## 🚨 Troubleshooting

### "Connection refused" su port 443
- Verificare firewall: `sudo ufw allow 443`
- Verificare nginx config: `docker compose exec nginx nginx -t`

### "Certificate verify failed"
- Se self-signed: Usare `curl -k` per testing
- Se Let's Encrypt: Verificare dominio DNS corretto

### Certificato scaduto
- Let's Encrypt rinnova automaticamente (certbot.timer)
- Se manuale: Rigenerare e copiare nuovi certificati

