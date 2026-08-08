"""Configuration and OAuth scope definitions.

Scopes explained:

- ``drive.readonly`` lets us list folders and download files. We never
  modify anything in Drive, so read-only is the safest choice.

- ``photoslibrary.appendonly`` lets us upload new media items. As of the
  2025 Google Photos API changes, third-party apps can only see/manage
  media they created themselves, but *uploading* still works and the
  photos land in the user's real library. A migration only ever uploads,
  so append-only is exactly what we need (and the least-privilege option).
"""

from __future__ import annotations

# OAuth scopes requested during the consent flow.
SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/photoslibrary.appendonly",
]

# Where the OAuth client secret (downloaded from Google Cloud Console)
# and the cached user token live. Override via CLI flags if desired.
DEFAULT_CLIENT_SECRET = "credentials.json"
DEFAULT_TOKEN_FILE = "token.json"

# Local ledger of what has already been uploaded, so the tool is
# resumable and idempotent across runs.
DEFAULT_MANIFEST = "manifest.json"

# MIME types we treat as photos worth migrating.
IMAGE_MIME_PREFIXES = ("image/",)

# Google Photos upload endpoints (not exposed by the discovery client,
# so we call them directly with an authorized session).
PHOTOS_UPLOAD_URL = "https://photoslibrary.googleapis.com/v1/uploads"
PHOTOS_BATCH_CREATE_URL = "https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate"
