-- Migrazione: Richiesta Rimborso Spesa
-- Idempotente: può essere rieseguita senza errori (IF NOT EXISTS ovunque).

BEGIN;

-- ── Richiesta Rimborso Spesa ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS richiesta_rimborso_spesa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    richiesta_autorizzazione_spesa_id UUID NOT NULL REFERENCES richiesta_autorizzazione_spesa(id),
    richiedente_id UUID NOT NULL REFERENCES persona(id),
    stato VARCHAR(30) NOT NULL DEFAULT 'bozza',
    note TEXT,
    motivazione_rigetto TEXT,
    spesa_id UUID REFERENCES spesa(id),
    pdf_path VARCHAR(500),
    data_invio TIMESTAMPTZ,
    data_approvazione_rs TIMESTAMPTZ,
    data_approvazione_dir_dip TIMESTAMPTZ,
    data_approvazione_dg TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Righe di spesa del rimborso ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rimborso_spesa_riga (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    richiesta_rimborso_spesa_id UUID NOT NULL REFERENCES richiesta_rimborso_spesa(id) ON DELETE CASCADE,
    descrizione TEXT NOT NULL,
    data DATE NOT NULL,
    importo NUMERIC(14,2) NOT NULL,
    documento_path VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Nome file originale dell'allegato (per la visualizzazione) ─────────
ALTER TABLE rimborso_spesa_riga ADD COLUMN IF NOT EXISTS documento_nome_originale VARCHAR(255);

COMMIT;
