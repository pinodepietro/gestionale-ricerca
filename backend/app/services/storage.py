# backend/app/services/storage.py
import os
import re
import unicodedata
from app.core.config import settings


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
