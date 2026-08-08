"""Configuration, OAuth scopes, and shared constants.

Scopes:
- ``drive.readonly``            list folders and download files (never modifies Drive)
- ``photoslibrary.appendonly``  upload new media items. Post-2025 the Photos API
  only lets an app see media it created, but uploads still land in the real
  library -- a migration only ever uploads, so this is the least-privilege scope.
"""

from __future__ import annotations

import os

SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/photoslibrary.appendonly",
]

# Files live next to the project root by default; override via env vars.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CLIENT_SECRET = os.environ.get("PM_CLIENT_SECRET", os.path.join(BASE_DIR, "credentials.json"))
TOKEN_FILE = os.environ.get("PM_TOKEN_FILE", os.path.join(BASE_DIR, "token.json"))
DB_PATH = os.environ.get("PM_DB_PATH", os.path.join(BASE_DIR, "photo_migration.db"))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

IMAGE_MIME_PREFIXES = ("image/",)

PHOTOS_UPLOAD_URL = "https://photoslibrary.googleapis.com/v1/uploads"
PHOTOS_BATCH_CREATE_URL = "https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate"

# When a folder's year is known but a photo has no EXIF date, this is the
# month/day/time stamped onto it (only the year varies per folder).
DEFAULT_MONTH = 1
DEFAULT_DAY = 1
DEFAULT_HOUR = 12
