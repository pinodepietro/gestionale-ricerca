-- Migrazione: Aggiunge tabella AuditLog per tracciare i cambi amministrativi
-- Data: 2026-09-21
-- Descrizione: Crea tabella audit_log per tenere traccia dei cambiamenti di amministrativo dei progetti

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entita VARCHAR(50) NOT NULL,
    entita_id UUID NOT NULL,
    azione VARCHAR(50) NOT NULL,
    cambio_da VARCHAR(500),
    cambio_a VARCHAR(500),
    cambiato_da UUID NOT NULL REFERENCES persona(id),
    motivo TEXT,
    dettagli TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indici per performance
CREATE INDEX idx_audit_log_entita ON audit_log(entita);
CREATE INDEX idx_audit_log_entita_id ON audit_log(entita_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
