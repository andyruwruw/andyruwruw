"""Google Photos upload.

Two-step API contract:
  1. POST raw bytes to the uploads endpoint -> receive an upload token.
  2. mediaItems:batchCreate with that token -> the item appears in the
     user's library.

Note (2025 API change): the app can only later see items IT created, but
that's irrelevant here -- we only ever upload.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from requests import Session

from . import config


@dataclass
class UploadResult:
    ok: bool
    media_item_id: Optional[str] = None
    error: Optional[str] = None


def _upload_bytes(session: Session, data: bytes, filename: str) -> str:
    headers = {
        "Content-Type": "application/octet-stream",
        "X-Goog-Upload-Content-Type": "application/octet-stream",
        "X-Goog-Upload-Protocol": "raw",
        "X-Goog-Upload-File-Name": filename,
    }
    resp = session.post(config.PHOTOS_UPLOAD_URL, data=data, headers=headers)
    resp.raise_for_status()
    token = resp.text.strip()
    if not token:
        raise RuntimeError("Photos upload returned an empty upload token")
    return token


def upload(
    session: Session,
    data: bytes,
    filename: str,
    description: str = "",
) -> UploadResult:
    """Upload one photo and create the media item."""
    try:
        token = _upload_bytes(session, data, filename)
        body = {
            "newMediaItems": [
                {
                    "description": description,
                    "simpleMediaItem": {
                        "fileName": filename,
                        "uploadToken": token,
                    },
                }
            ]
        }
        resp = session.post(config.PHOTOS_BATCH_CREATE_URL, json=body)
        resp.raise_for_status()
        results = resp.json().get("newMediaItemResults", [])
        if not results:
            return UploadResult(ok=False, error="batchCreate returned no results")

        status = results[0].get("status", {})
        # status.code 0 (or absent) means success.
        if status.get("code", 0) not in (0, None):
            return UploadResult(ok=False, error=status.get("message", "unknown error"))

        media_item = results[0].get("mediaItem", {})
        return UploadResult(ok=True, media_item_id=media_item.get("id"))
    except Exception as exc:  # noqa: BLE001 - surface any failure to the caller
        return UploadResult(ok=False, error=str(exc))
