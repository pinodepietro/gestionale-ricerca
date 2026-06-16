#!/usr/bin/env python3
"""
Script di migrazione one-shot per la nuova struttura di storage.
Idempotente: può essere eseguito più volte senza danni.

Struttura finale:
  uploads/progetti/{codice}/
    documenti/
    missioni/{id}/
      AUT_MISS_*.pdf  allegati/  rimborso/{RIMB_MISS_*.pdf, giustificativi/, allegati/}
    autorizzazioni-spesa/{id}/
      AUT_SPESA_*.pdf  allegati/  rimborso/{RIMB_SPESA_*.pdf, giustificativi/}
    erogazioni/

Gestisce tre scenari per ogni file:
  A) file nella posizione originale  → sposta nella posizione corretta
  B) file già spostato in posizione parziale sbagliata (run precedente) → sposta nella posizione corretta
  C) file già nella posizione corretta → aggiorna solo il DB
  D) file non trovato da nessuna parte → warn, non tocca il DB

Eseguire con:
  docker compose exec backend python scripts/migrate_storage.py
"""

import os
import re
import shutil
import unicodedata
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.database import SessionLocal
from app.core.config import settings


# ── Utilità ───────────────────────────────────────────────────────────────────

def _safe(s: str) -> str:
    s = unicodedata.normalize("NFD", str(s or ""))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9_]", "_", s.lower()).strip("_") or "x"


def progetto_dir(codice: str, *subpath: str) -> str:
    folder = _safe(codice) if codice else "_senza_progetto"
    return os.path.join(settings.UPLOAD_DIR, "progetti", folder, *subpath)


def upload_filename(original_name: str, uid: str) -> str:
    ext = os.path.splitext(original_name or "")[1].lower()
    stem = _safe(os.path.splitext(original_name or "file")[0])
    return f"{uid}_{stem}{ext}"


def resolve(src: str, dst: str, extra_candidates: list = None) -> str:
    """
    Trova il file e lo porta a dst. Ritorna il path da salvare nel DB.
    Candidates controllati in ordine: dst (già ok), src (posizione originale),
    extra_candidates (posizioni errate di run precedenti).
    """
    if not src and not dst:
        return src

    # già nella posizione corretta
    if dst and os.path.exists(dst):
        print(f"  OK     {dst}")
        return dst

    # cerca tra i candidati: posizione originale + posizioni errate
    candidates = ([src] if src else []) + (extra_candidates or [])
    found = next((c for c in candidates if c and os.path.exists(c)), None)

    if not found:
        print(f"  WARN   file non trovato — candidati: {candidates}")
        return src  # non aggiornare il DB

    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.move(found, dst)
    print(f"  MOVED  {found}\n      -> {dst}")
    return dst


# ── Migrazione per entità ──────────────────────────────────────────────────────

def _migrate_autorizzazioni(db):
    from app.models.autorizzazione_spesa import RichiestaAutorizzazioneSpesa
    from app.models.progetto import Progetto

    print("\n--- Autorizzazioni spesa ---")
    for r in db.query(RichiestaAutorizzazioneSpesa).all():
        p = db.query(Progetto).filter(Progetto.id == r.progetto_id).first() if r.progetto_id else None
        codice = p.codice if p else None
        rid = str(r.id)

        # PDF
        if r.pdf_path:
            dst = os.path.join(progetto_dir(codice, "autorizzazioni-spesa", rid), os.path.basename(r.pdf_path))
            wrong = os.path.join(progetto_dir(codice, "autorizzazioni", rid), os.path.basename(r.pdf_path))
            r.pdf_path = resolve(r.pdf_path, dst, [wrong])

        # allegato_voce_g
        if r.allegato_voce_g:
            orig = os.path.basename(r.allegato_voce_g)
            new_name = upload_filename(orig, rid[:8] + "_g")
            dst = os.path.join(progetto_dir(codice, "autorizzazioni-spesa", rid, "allegati"), new_name)
            wrong = os.path.join(progetto_dir(codice, "autorizzazioni", rid, "allegati"), new_name)
            r.allegato_voce_g = resolve(r.allegato_voce_g, dst, [wrong])

        # allegato_preventivo
        if r.allegato_preventivo:
            orig = os.path.basename(r.allegato_preventivo)
            new_name = upload_filename(orig, rid[:8] + "_prev")
            dst = os.path.join(progetto_dir(codice, "autorizzazioni-spesa", rid, "allegati"), new_name)
            wrong = os.path.join(progetto_dir(codice, "autorizzazioni", rid, "allegati"), new_name)
            r.allegato_preventivo = resolve(r.allegato_preventivo, dst, [wrong])


def _migrate_rimborsi_spesa(db):
    from app.models.rimborso_spesa import RichiestaRimborsoSpesa, RimborsoSpesaRiga
    from app.models.autorizzazione_spesa import RichiestaAutorizzazioneSpesa
    from app.models.progetto import Progetto

    print("\n--- Rimborsi spesa ---")
    for r in db.query(RichiestaRimborsoSpesa).all():
        ras = db.query(RichiestaAutorizzazioneSpesa).filter(
            RichiestaAutorizzazioneSpesa.id == r.richiesta_autorizzazione_spesa_id).first()
        p = db.query(Progetto).filter(Progetto.id == ras.progetto_id).first() if (ras and ras.progetto_id) else None
        codice = p.codice if p else None
        ras_id = str(ras.id) if ras else str(r.id)

        # PDF
        if r.pdf_path:
            dst = os.path.join(progetto_dir(codice, "autorizzazioni-spesa", ras_id, "rimborso"), os.path.basename(r.pdf_path))
            wrong = os.path.join(progetto_dir(codice, "autorizzazioni", ras_id, "rimborso"), os.path.basename(r.pdf_path))
            r.pdf_path = resolve(r.pdf_path, dst, [wrong])

        # giustificativi righe
        for riga in db.query(RimborsoSpesaRiga).filter(
                RimborsoSpesaRiga.richiesta_rimborso_spesa_id == r.id).all():
            if riga.documento_path:
                orig = riga.documento_nome_originale or os.path.basename(riga.documento_path)
                new_name = upload_filename(orig, str(riga.id))
                dst = os.path.join(progetto_dir(codice, "autorizzazioni-spesa", ras_id, "rimborso", "giustificativi"), new_name)
                wrong = os.path.join(progetto_dir(codice, "autorizzazioni", ras_id, "rimborso", "giustificativi"), new_name)
                riga.documento_path = resolve(riga.documento_path, dst, [wrong])


def _migrate_missioni(db):
    from app.models.missione import Missione, RimborsoMissione, RigaRimborsoMissione, AllegatoMissione
    from app.models.progetto import Progetto

    print("\n--- Missioni ---")
    for m in db.query(Missione).all():
        p = db.query(Progetto).filter(Progetto.id == m.progetto_id).first() if m.progetto_id else None
        codice = p.codice if p else None
        mid = str(m.id)

        # PDF autorizzazione
        if m.pdf_path:
            dst = os.path.join(progetto_dir(codice, "missioni", mid), os.path.basename(m.pdf_path))
            m.pdf_path = resolve(m.pdf_path, dst)

        # allegati missione
        for a in db.query(AllegatoMissione).filter(AllegatoMissione.missione_id == m.id).all():
            if a.file_path:
                orig = a.file_nome_originale or os.path.basename(a.file_path)
                new_name = upload_filename(orig, str(a.id))
                dst = os.path.join(progetto_dir(codice, "missioni", mid, "allegati"), new_name)
                a.file_path = resolve(a.file_path, dst)

        # rimborso missione
        rimborso = db.query(RimborsoMissione).filter(RimborsoMissione.missione_id == m.id).first()
        if not rimborso:
            continue

        if rimborso.pdf_path:
            dst = os.path.join(progetto_dir(codice, "missioni", mid, "rimborso"), os.path.basename(rimborso.pdf_path))
            rimborso.pdf_path = resolve(rimborso.pdf_path, dst)

        if rimborso.scheda_finanziaria_path:
            dst = os.path.join(progetto_dir(codice, "missioni", mid, "rimborso"), os.path.basename(rimborso.scheda_finanziaria_path))
            rimborso.scheda_finanziaria_path = resolve(rimborso.scheda_finanziaria_path, dst)

        for riga in db.query(RigaRimborsoMissione).filter(
                RigaRimborsoMissione.rimborso_missione_id == rimborso.id).all():
            if riga.documento_path:
                orig = riga.documento_nome_originale or os.path.basename(riga.documento_path)
                new_name = upload_filename(orig, str(riga.id))
                dst = os.path.join(progetto_dir(codice, "missioni", mid, "rimborso", "giustificativi"), new_name)
                riga.documento_path = resolve(riga.documento_path, dst)

        for a in db.query(AllegatoMissione).filter(
                AllegatoMissione.rimborso_missione_id == rimborso.id).all():
            if a.file_path:
                orig = a.file_nome_originale or os.path.basename(a.file_path)
                new_name = upload_filename(orig, str(a.id))
                dst = os.path.join(progetto_dir(codice, "missioni", mid, "rimborso", "allegati"), new_name)
                a.file_path = resolve(a.file_path, dst)


def _migrate_documenti(db):
    from app.models.documento import DocumentoProgetto
    from app.models.progetto import Progetto

    print("\n--- Documenti progetto ---")
    for d in db.query(DocumentoProgetto).all():
        p = db.query(Progetto).filter(Progetto.id == d.progetto_id).first() if d.progetto_id else None
        codice = p.codice if p else None
        if d.path_file:
            orig = d.nome_file or os.path.basename(d.path_file)
            new_name = upload_filename(orig, str(d.id))
            dst = os.path.join(progetto_dir(codice, "documenti"), new_name)
            d.path_file = resolve(d.path_file, dst)


def _migrate_erogazioni(db):
    from app.models.budget import Erogazione
    from app.models.progetto import Progetto

    print("\n--- Erogazioni ---")
    for e in db.query(Erogazione).filter(Erogazione.documento_path.isnot(None)).all():
        p = db.query(Progetto).filter(Progetto.id == e.progetto_id).first() if e.progetto_id else None
        codice = p.codice if p else None
        if e.documento_path:
            orig = os.path.basename(e.documento_path)
            new_name = upload_filename(orig, str(e.id))
            dst = os.path.join(progetto_dir(codice, "erogazioni"), new_name)
            e.documento_path = resolve(e.documento_path, dst)


# ── Entry point ────────────────────────────────────────────────────────────────

def run():
    db = SessionLocal()
    try:
        _migrate_autorizzazioni(db)
        _migrate_rimborsi_spesa(db)
        _migrate_missioni(db)
        _migrate_documenti(db)
        _migrate_erogazioni(db)
        db.commit()
        print("\n=== Migrazione completata ===")
    except Exception as e:
        db.rollback()
        print(f"\n!!! ERRORE: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
