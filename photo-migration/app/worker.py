"""Background execution: stoppable, resumable, idempotent.

A job runs in its own daemon thread. State lives entirely in SQLite, and every
item's status is committed the moment it changes, so:

- **Stop**  -> flip the job to 'paused'; the worker notices between items and
  exits. Whatever was uploaded stays uploaded.
- **Resume / rerun from same state** -> start again; the worker reads the DB,
  resets any item caught mid-flight, and continues with the remaining 'ready'
  items. Uploaded items are skipped (never re-uploaded).

The worker only ever processes 'ready' items. Items in 'needs_review' wait for
a question to be answered (which promotes them to 'ready').
"""

from __future__ import annotations

import threading
from typing import Dict

from . import config, db, exif, photos
from .auth import get_clients
from .drive import DriveFile

# job_id -> control handle. Guarded by _LOCK.
_LOCK = threading.Lock()
_WORKERS: Dict[int, "threading.Event"] = {}


def is_running(job_id: int) -> bool:
    with _LOCK:
        return job_id in _WORKERS


def request_pause(job_id: int) -> None:
    """Signal the worker to stop after the current item."""
    with _LOCK:
        ev = _WORKERS.get(job_id)
    if ev:
        ev.set()
    db.set_job_status(job_id, "paused")


def start(job_id: int) -> bool:
    """Start (or resume) a job's worker. Returns False if already running."""
    with _LOCK:
        if job_id in _WORKERS:
            return False
        stop_event = threading.Event()
        _WORKERS[job_id] = stop_event
    thread = threading.Thread(target=_run, args=(job_id, stop_event), daemon=True)
    thread.start()
    return True


def _process_item(clients, item: dict, folder: dict) -> None:
    db.set_item_status(item["id"], "uploading")

    drive_file = DriveFile(
        id=item["drive_id"],
        name=item["name"],
        mime_type=item["mime_type"],
        parent_name=folder["name"],
    )
    from . import drive as drive_mod

    data = drive_mod.download_bytes(clients.drive, drive_file)

    year = folder["resolved_year"]
    coords = None
    if folder["resolved_lat"] is not None and folder["resolved_lng"] is not None:
        coords = (folder["resolved_lat"], folder["resolved_lng"])

    data, stamped = exif.stamp_if_needed(
        data, item["name"], item["mime_type"], year, coords
    )

    result = photos.upload(
        clients.photos,
        data,
        filename=item["name"],
        description=f"Migrated from Drive/{folder['name']}",
    )
    if result.ok:
        db.set_item_status(
            item["id"], "uploaded", media_item_id=result.media_item_id, stamped=stamped
        )
    else:
        db.set_item_status(item["id"], "failed", error=result.error, stamped=stamped)


def _run(job_id: int, stop_event: threading.Event) -> None:
    try:
        db.reset_stuck_items(job_id)
        db.set_job_status(job_id, "running")

        try:
            clients = get_clients(config.CLIENT_SECRET, config.TOKEN_FILE)
        except Exception as exc:  # noqa: BLE001
            db.set_job_status(job_id, "failed", message=f"auth failed: {exc}")
            return

        while not stop_event.is_set():
            item = db.next_ready_item(job_id)
            if item is None:
                break
            folder = db.get_folder(item["folder_id"])
            try:
                _process_item(clients, item, folder)
            except Exception as exc:  # noqa: BLE001 - one bad photo shouldn't kill the run
                db.set_item_status(item["id"], "failed", error=str(exc))

        if stop_event.is_set():
            db.set_job_status(job_id, "paused")
        elif db.count_needs_review(job_id) > 0:
            db.set_job_status(
                job_id, "waiting_for_input", message="Answer open questions to continue."
            )
        else:
            db.set_job_status(job_id, "completed")
    finally:
        with _LOCK:
            _WORKERS.pop(job_id, None)
