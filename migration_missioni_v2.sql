-- Migrazione missioni v2 — aggiunta gruppo_missione su persona e missione
BEGIN;
ALTER TABLE persona  ADD COLUMN IF NOT EXISTS gruppo_missione CHAR(1) CHECK (gruppo_missione IN ('A', 'B', 'C'));
ALTER TABLE missione ADD COLUMN IF NOT EXISTS gruppo_missione CHAR(1);
COMMIT;
