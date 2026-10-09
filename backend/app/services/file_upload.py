"""
File upload utilities with security validations.

Features:
- File size limits (MAX_FILE_SIZE)
- MIME type validation
- Chunk-based reading (prevent memory exhaustion)
- Safe filename generation (UUID + extension)
"""

import os
import uuid
from fastapi import UploadFile, HTTPException
from pathlib import Path

# Configuration
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

ALLOWED_MIMES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
    "application/msword",  # .doc
    "application/vnd.ms-excel",  # .xls
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # .xlsx
    "application/zip",  # .zip
}

MIME_TO_EXT = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/msword": ".doc",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/zip": ".zip",
}

CHUNK_SIZE = 1024 * 1024  # 1MB chunks


async def validate_and_save_upload(
    file: UploadFile,
    upload_dir: str,
    allowed_mimes: set = None,
) -> dict:
    """
    Validate and save uploaded file with security checks.

    Args:
        file: FastAPI UploadFile
        upload_dir: Directory to save file (must exist)
        allowed_mimes: Set of allowed MIME types (default: ALLOWED_MIMES)

    Returns:
        dict with 'file_id' and 'mime_type'

    Raises:
        HTTPException 400: Invalid MIME type or file too large
        HTTPException 413: File exceeds size limit
    """
    if allowed_mimes is None:
        allowed_mimes = ALLOWED_MIMES

    # 1. Validate MIME type
    mime_type = file.content_type or "application/octet-stream"
    if mime_type not in allowed_mimes:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "INVALID_MIME_TYPE",
                    "message": f"File type not allowed. Allowed types: {', '.join(allowed_mimes)}",
                }
            },
        )

    # 2. Create safe filename (UUID + extension from MIME type)
    safe_ext = MIME_TO_EXT.get(mime_type, ".bin")
    file_id = f"{uuid.uuid4()}{safe_ext}"
    file_path = os.path.join(upload_dir, file_id)

    # 3. Read file in chunks and validate size
    total_size = 0
    content = b""

    try:
        while True:
            chunk = await file.read(CHUNK_SIZE)
            if not chunk:
                break

            total_size += len(chunk)
            if total_size > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail={
                        "error": {
                            "code": "FILE_TOO_LARGE",
                            "message": f"File exceeds maximum size of {MAX_FILE_SIZE / (1024*1024):.0f}MB",
                        }
                    },
                )

            content += chunk
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "UPLOAD_ERROR",
                    "message": f"Error reading file: {str(e)}",
                }
            },
        )

    # 4. Save file
    try:
        os.makedirs(upload_dir, exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(content)
    except IOError as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": {
                    "code": "SAVE_ERROR",
                    "message": f"Error saving file: {str(e)}",
                }
            },
        )

    return {
        "file_id": file_id,
        "mime_type": mime_type,
        "size": total_size,
        "path": file_path,
    }
