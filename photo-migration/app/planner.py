"""Scan + resolve: turn a Drive folder tree into persisted photo tasks.

This is the "define the tasks and save them" phase. It is deliberately cheap
-- it never downloads photo bytes, it only lists metadata -- so planning a
large library is fast and can be re-run safely (rows are upserted).

Year resolution uses only the folder name. If a folder name yields a confident
year, its photos become ``ready``. Otherwise a blocking year question is filed
and the photos wait in ``needs_review``. A non-blocking location question is
always offered per folder so the user can optionally add coordinates.
"""

from __future__ import annotations

import re

from . import db, drive
from .auth import Clients

YEAR_RE = re.compile(r"(?<!\d)(19|20)\d{2}(?!\d)")


def parse_year(folder_name: str) -> int | None:
    match = YEAR_RE.search(folder_name or "")
    return int(match.group(0)) if match else None


def scan_job(clients: Clients, job_id: int, root_folder_id: str) -> None:
    """Populate folders, items, and questions for a job."""
    db.set_job_status(job_id, "scanning")
    try:
        folders = drive.list_child_folders(clients.drive, root_folder_id)
        for folder in folders:
            folder_id = db.upsert_folder(job_id, folder.id, folder.name)

            year = parse_year(folder.name)
            if year is not None:
                db.set_folder_year(folder_id, year, "confident")
                item_status = "ready"
            else:
                db.set_folder_year(folder_id, None, "unknown")
                db.upsert_question(
                    job_id,
                    folder_id,
                    "year",
                    f'What year were the photos in "{folder.name}" taken?',
                    blocking=True,
                )
                item_status = "needs_review"

            # Location is always optional -- never blocks an upload.
            db.upsert_question(
                job_id,
                folder_id,
                "location",
                f'Optional: where were the photos in "{folder.name}" taken? '
                f"(latitude/longitude, or mark none)",
                blocking=False,
            )

            for image in drive.list_images_in_folder(clients.drive, folder):
                db.upsert_item(
                    job_id, folder_id, image.id, image.name, image.mime_type, item_status
                )

        db.set_job_status(job_id, "scanned")
    except Exception as exc:  # noqa: BLE001
        db.set_job_status(job_id, "failed", message=f"scan failed: {exc}")
        raise
