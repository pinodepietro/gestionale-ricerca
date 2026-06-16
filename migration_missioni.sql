-- Migrazione: Modulo Missioni
-- Idempotente: può essere rieseguita senza errori (IF NOT EXISTS ovunque).

BEGIN;

-- ── Firma olografa su Persona ────────────────────────────────────────────────
ALTER TABLE persona ADD COLUMN IF NOT EXISTS firma_olografa VARCHAR(500);

-- ── Qualifiche missione (configurabili) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS qualifica_missione (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gruppo CHAR(1) NOT NULL CHECK (gruppo IN ('A', 'B', 'C')),
    codice VARCHAR(20) NOT NULL,
    nome VARCHAR(200) NOT NULL,
    attiva BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (gruppo, codice, nome)
);

-- ── Missione ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS missione (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titolo VARCHAR(200) NOT NULL,
    destinazione VARCHAR(200) NOT NULL,
    motivo TEXT NOT NULL,
    data_inizio DATE,
    data_fine DATE,
    ora_inizio TIME,
    ora_fine TIME,
    stato VARCHAR(20) NOT NULL DEFAULT 'bozza',
    progetto_id UUID NOT NULL REFERENCES progetto(id),
    richiedente_id UUID NOT NULL REFERENCES persona(id),
    copertura_tipo VARCHAR(30) NOT NULL,
    copertura_descrizione TEXT,
    mezzo_tipo VARCHAR(20) NOT NULL,
    mezzo_descrizione VARCHAR(250),
    auto_alimentazione VARCHAR(50),
    auto_cilindrata VARCHAR(50),
    motivazione_mezzo_straordinario TEXT,
    importo_stimato NUMERIC(12,2),
    voce_impegno VARCHAR(20),
    impegno_gestionale_id UUID,
    luogo_approvazione VARCHAR(255),
    note_approvazione TEXT,
    pdf_path VARCHAR(500),
    inviata_il TIMESTAMPTZ,
    approvata_il TIMESTAMPTZ,
    respinta_il TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Rimborso Missione ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rimborso_missione (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    missione_id UUID NOT NULL UNIQUE REFERENCES missione(id),
    richiedente_id UUID NOT NULL REFERENCES persona(id),
    stato VARCHAR(20) NOT NULL DEFAULT 'bozza',
    note TEXT,
    ciclo INTEGER NOT NULL DEFAULT 1,
    scheda_finanziaria_path VARCHAR(500),
    pdf_path VARCHAR(500),
    inviata_il TIMESTAMPTZ,
    approvata_il TIMESTAMPTZ,
    respinta_il TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Righe rimborso missione ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS riga_rimborso_missione (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rimborso_missione_id UUID NOT NULL REFERENCES rimborso_missione(id) ON DELETE CASCADE,
    data_inizio DATE NOT NULL,
    data_fine DATE NOT NULL,
    attivita VARCHAR(255) NOT NULL,
    importo NUMERIC(12,2),
    documento_path VARCHAR(500),
    documento_nome_originale VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Step approvazione missione/rimborso ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS step_approvazione_missione (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    missione_id UUID REFERENCES missione(id) ON DELETE CASCADE,
    rimborso_missione_id UUID REFERENCES rimborso_missione(id) ON DELETE CASCADE,
    approvatore_id UUID NOT NULL REFERENCES persona(id),
    ruolo VARCHAR(10) NOT NULL,
    decisione VARCHAR(10) NOT NULL,
    luogo_firma VARCHAR(100),
    note TEXT,
    ciclo INTEGER NOT NULL DEFAULT 1,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Allegati missione/rimborso ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS allegato_missione (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(20) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_nome_originale VARCHAR(255),
    missione_id UUID REFERENCES missione(id) ON DELETE CASCADE,
    rimborso_missione_id UUID REFERENCES rimborso_missione(id) ON DELETE CASCADE,
    caricato_da UUID NOT NULL REFERENCES persona(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
