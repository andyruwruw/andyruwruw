"""Google Drive listing and downloading."""

from __future__ import annotations

import io
from dataclasses import dataclass
from typing import Iterator

from googleapiclient.http import MediaIoBaseDownload

from . import config

FOLDER_MIME = "application/vnd.google-apps.folder"


@dataclass
class DriveFile:
    id: str
    name: str
    mime_type: str
    # Name of the immediate parent folder (often the "year" folder).
    parent_name: str


def _escape(value: str) -> str:
    """Escape single quotes for Drive query literals."""
    return value.replace("\\", "\\\\").replace("'", "\\'")


def list_child_folders(drive, parent_id: str) -> list[DriveFile]:
    """List sub-folders of a folder (e.g. the per-year folders)."""
    folders: list[DriveFile] = []
    page_token = None
    query = f"'{_escape(parent_id)}' in parents and mimeType = '{FOLDER_MIME}' and trashed = false"
    while True:
        resp = (
            drive.files()
            .list(
                q=query,
                fields="nextPageToken, files(id, name, mimeType)",
                pageSize=100,
                pageToken=page_token,
            )
            .execute()
        )
        for f in resp.get("files", []):
            folders.append(
                DriveFile(id=f["id"], name=f["name"], mime_type=f["mimeType"], parent_name="")
            )
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return folders


def list_images_in_folder(drive, folder: DriveFile) -> Iterator[DriveFile]:
    """Yield image files directly inside a folder."""
    page_token = None
    query = f"'{_escape(folder.id)}' in parents and trashed = false"
    while True:
        resp = (
            drive.files()
            .list(
                q=query,
                fields="nextPageToken, files(id, name, mimeType)",
                pageSize=100,
                pageToken=page_token,
            )
            .execute()
        )
        for f in resp.get("files", []):
            mime = f.get("mimeType", "")
            if any(mime.startswith(prefix) for prefix in config.IMAGE_MIME_PREFIXES):
                yield DriveFile(
                    id=f["id"],
                    name=f["name"],
                    mime_type=mime,
                    parent_name=folder.name,
                )
        page_token = resp.get("nextPageToken")
        if not page_token:
            break


def download_bytes(drive, file: DriveFile) -> bytes:
    """Download a Drive file's raw bytes into memory."""
    request = drive.files().get_media(fileId=file.id)
    buffer = io.BytesIO()
    downloader = MediaIoBaseDownload(buffer, request)
    done = False
    while not done:
        _, done = downloader.next_chunk()
    return buffer.getvalue()
