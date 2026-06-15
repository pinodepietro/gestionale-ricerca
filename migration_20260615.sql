-- Migrazione manuale per il deploy del 15/06/2026
-- Porta lo schema prod allo stato corrispondente ai commit b213bc8..24c4a98
-- (Proposte, Erogazioni/Disponibilità, Dipartimenti, Autorizzazioni Spesa + DG)
--
-- Idempotente: può essere rieseguita senza errori (IF NOT EXISTS ovunque).
-- Eseguire con:
--   docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T db \
--     psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/migration_20260615.sql
-- (vedi istruzioni di deploy per il comando completo)

BEGIN;

-- ── Dipartimento ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dipartimento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(200) NOT NULL,
    direttore_id UUID REFERENCES persona(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Persona: nuovi campi ────────────────────────────────────────────────
ALTER TABLE persona ADD COLUMN IF NOT EXISTS ssd VARCHAR(100);
ALTER TABLE persona ADD COLUMN IF NOT EXISTS dipartimento_id UUID REFERENCES dipartimento(id);

-- ── Progetto: dipartimento di riferimento ──────────────────────────────
ALTER TABLE progetto ADD COLUMN IF NOT EXISTS dipartimento_id UUID REFERENCES dipartimento(id);

-- ── Richiesta Autorizzazione Spesa ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS richiesta_autorizzazione_spesa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('progetto', 'fondi_individuali')),
    progetto_id UUID REFERENCES progetto(id),
    dipartimento_id UUID NOT NULL REFERENCES dipartimento(id),
    richiedente_id UUID NOT NULL REFERENCES persona(id),
    qualita_richiedente VARCHAR(30) NOT NULL,
    tipo_contratto VARCHAR(20) NOT NULL,
    qualita_progetto VARCHAR(100),
    macrocategoria VARCHAR(30) NOT NULL,
    voce_lettera CHAR(1) NOT NULL,
    voce_altro TEXT,
    oggetto VARCHAR(500) NOT NULL,
    descrizione TEXT NOT NULL,
    importo NUMERIC(14,2) NOT NULL,
    durata_da DATE,
    durata_a DATE,
    termini_pagamento TEXT,
    anticipazione_spesa BOOLEAN NOT NULL DEFAULT FALSE,
    allegato_voce_g VARCHAR(500),
    allegato_preventivo VARCHAR(500),
    budget_voce_id UUID REFERENCES budget_voce(id),
    stato VARCHAR(30) NOT NULL DEFAULT 'bozza',
    motivazione_rigetto TEXT,
    impegno_id UUID REFERENCES impegno(id),
    pdf_path VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_invio TIMESTAMPTZ,
    data_approvazione_rs TIMESTAMPTZ,
    data_approvazione_dir_dip TIMESTAMPTZ,
    data_approvazione_dg TIMESTAMPTZ
);

-- ── Erogazione ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS erogazione (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    progetto_id UUID NOT NULL REFERENCES progetto(id) ON DELETE CASCADE,
    importo NUMERIC(14,2) NOT NULL,
    data_erogazione DATE NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    documento_path VARCHAR(500),
    descrizione TEXT,
    created_by UUID REFERENCES persona(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Proposta / PropostaPartner ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proposta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    acronimo VARCHAR(30),
    titolo TEXT NOT NULL,
    bando TEXT NOT NULL,
    data_scadenza_bando DATE NOT NULL,
    responsabile_scientifico_id UUID NOT NULL REFERENCES persona(id),
    descrizione VARCHAR(500),
    data_inizio_prevista DATE,
    durata_mesi INTEGER,
    costo_totale NUMERIC(14,2),
    importo_finanziato NUMERIC(14,2),
    importo_cofinanziato NUMERIC(14,2),
    importo_personale_interno NUMERIC(14,2),
    importo_overhead NUMERIC(14,2),
    stato VARCHAR(20) NOT NULL DEFAULT 'in_preparazione',
    created_by UUID NOT NULL REFERENCES persona(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proposta_partner (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposta_id UUID NOT NULL REFERENCES proposta(id) ON DELETE CASCADE,
    denominazione VARCHAR(200) NOT NULL,
    tipologia VARCHAR(100) NOT NULL,
    ruolo VARCHAR(30) NOT NULL,
    nazionalita VARCHAR(100),
    sito_web VARCHAR(200)
);

COMMIT;
