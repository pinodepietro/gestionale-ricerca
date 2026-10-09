"""
File upload utilities with security validations.

Features:
- File size limits (MAX_FILE_SIZE)
- MIME type validation
- Chunk-based reading (prevent memory exhaustion)
- Safe filename generation (UUID + extension)
"""

import os
import re
import uuid
from fastapi import UploadFile, HTTPException
from io import BytesIO

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


def validate_and_save_upload(
    file_obj,
    allowed_mimes: list = None,
    max_size: int = None,
) -> dict:
    """
    Synchronous validation for file uploads (for testing and simple cases).

    Args:
        file_obj: BytesIO-like object with .name and optional .content_type
        allowed_mimes: List of allowed MIME types
        max_size: Maximum file size in bytes

    Returns:
        dict with 'filename', 'size', 'path'

    Raises:
        ValueError: If file is invalid
    """
    if allowed_mimes is None:
        allowed_mimes = list(ALLOWED_MIMES)
    if max_size is None:
        max_size = MAX_FILE_SIZE

    # Get content and size
    if isinstance(file_obj, BytesIO):
        content = file_obj.getvalue()
    else:
        content = file_obj.read()

    file_size = len(content)

    # Check size
    if file_size == 0:
        raise ValueError("File is empty")

    if file_size > max_size:
        raise ValueError(f"File size {file_size} exceeds maximum {max_size}")

    # Check MIME type
    mime_type = getattr(file_obj, 'content_type', 'application/octet-stream')
    if mime_type not in allowed_mimes:
        raise ValueError(f"MIME type {mime_type} not allowed. Allowed: {', '.join(allowed_mimes)}")

    # Sanitize filename (prevent path traversal)
    filename = getattr(file_obj, 'name', 'file')
    filename = os.path.basename(filename)  # Remove directory parts
    filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)  # Remove special chars

    safe_filename = f"{uuid.uuid4()}_{filename}"

    return {
        "filename": safe_filename,
        "size": file_size,
        "path": f"/uploads/{safe_filename}",
    }


async def validate_and_save_upload_async(
    file: UploadFile,
    upload_dir: str = "/tmp/uploads",
    allowed_mimes: set = None,
) -> dict:
    """
    Async validation and save uploaded file with security checks.

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
