"""SQLite persistence layer.

Every unit of work is a row, and every state transition is committed
immediately -- that is what makes the job stoppable and rerunnable from the
exact same state. A fresh connection is opened per call (WAL mode) so the API
thread and the worker thread can safely touch the DB concurrently.

Status vocabularies
-------------------
job.status   : created | scanning | scanned | running | paused |
               waiting_for_input | completed | failed
item.status  : pending | needs_review | ready | uploading | uploaded |
               failed | skipped
question.kind: year | location
question.status: open | answered
"""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from typing import Any, Optional

from . import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT NOT NULL,
    root_folder_id TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'created',
    message        TEXT,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS folders (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id          INTEGER NOT NULL,
    drive_id        TEXT NOT NULL,
    name            TEXT NOT NULL,
    resolved_year   INTEGER,
    resolved_lat    REAL,
    resolved_lng    REAL,
    year_status     TEXT NOT NULL DEFAULT 'unknown',     -- unknown|confident|answered|skipped
    location_status TEXT NOT NULL DEFAULT 'unknown',     -- unknown|answered|none
    UNIQUE(job_id, drive_id)
);

CREATE TABLE IF NOT EXISTS items (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id        INTEGER NOT NULL,
    folder_id     INTEGER NOT NULL,
    drive_id      TEXT NOT NULL,
    name          TEXT NOT NULL,
    mime_type     TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending',
    media_item_id TEXT,
    stamped       INTEGER NOT NULL DEFAULT 0,
    error         TEXT,
    updated_at    TEXT NOT NULL,
    UNIQUE(job_id, drive_id)
);

CREATE TABLE IF NOT EXISTS questions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id      INTEGER NOT NULL,
    folder_id   INTEGER NOT NULL,
    kind        TEXT NOT NULL,        -- year|location
    prompt      TEXT NOT NULL,
    blocking    INTEGER NOT NULL DEFAULT 1,
    status      TEXT NOT NULL DEFAULT 'open',
    answer      TEXT,
    created_at  TEXT NOT NULL,
    answered_at TEXT,
    UNIQUE(job_id, folder_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_items_job_status ON items(job_id, status);
CREATE INDEX IF NOT EXISTS idx_questions_job_status ON questions(job_id, status);
"""


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(config.DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    conn = connect()
    try:
        conn.executescript(SCHEMA)
        conn.commit()
    finally:
        conn.close()


def _row(r: Optional[sqlite3.Row]) -> Optional[dict]:
    return dict(r) if r is not None else None


def _rows(rs) -> list[dict]:
    return [dict(r) for r in rs]


# --------------------------------------------------------------------------- #
# Jobs
# --------------------------------------------------------------------------- #
def create_job(name: str, root_folder_id: str) -> dict:
    conn = connect()
    try:
        ts = now()
        cur = conn.execute(
            "INSERT INTO jobs (name, root_folder_id, status, created_at, updated_at) "
            "VALUES (?,?,?,?,?)",
            (name, root_folder_id, "created", ts, ts),
        )
        conn.commit()
        return get_job(cur.lastrowid)  # type: ignore[arg-type]
    finally:
        conn.close()


def get_job(job_id: int) -> Optional[dict]:
    conn = connect()
    try:
        return _row(conn.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone())
    finally:
        conn.close()


def list_jobs() -> list[dict]:
    conn = connect()
    try:
        return _rows(conn.execute("SELECT * FROM jobs ORDER BY id DESC").fetchall())
    finally:
        conn.close()


def set_job_status(job_id: int, status: str, message: Optional[str] = None) -> None:
    conn = connect()
    try:
        conn.execute(
            "UPDATE jobs SET status=?, message=?, updated_at=? WHERE id=?",
            (status, message, now(), job_id),
        )
        conn.commit()
    finally:
        conn.close()


# --------------------------------------------------------------------------- #
# Folders
# --------------------------------------------------------------------------- #
def upsert_folder(job_id: int, drive_id: str, name: str) -> int:
    conn = connect()
    try:
        conn.execute(
            "INSERT OR IGNORE INTO folders (job_id, drive_id, name) VALUES (?,?,?)",
            (job_id, drive_id, name),
        )
        conn.commit()
        row = conn.execute(
            "SELECT id FROM folders WHERE job_id=? AND drive_id=?", (job_id, drive_id)
        ).fetchone()
        return int(row["id"])
    finally:
        conn.close()


def get_folder(folder_id: int) -> Optional[dict]:
    conn = connect()
    try:
        return _row(conn.execute("SELECT * FROM folders WHERE id=?", (folder_id,)).fetchone())
    finally:
        conn.close()


def set_folder_year(folder_id: int, year: Optional[int], year_status: str) -> None:
    conn = connect()
    try:
        conn.execute(
            "UPDATE folders SET resolved_year=?, year_status=? WHERE id=?",
            (year, year_status, folder_id),
        )
        conn.commit()
    finally:
        conn.close()


def set_folder_location(
    folder_id: int, lat: Optional[float], lng: Optional[float], location_status: str
) -> None:
    conn = connect()
    try:
        conn.execute(
            "UPDATE folders SET resolved_lat=?, resolved_lng=?, location_status=? WHERE id=?",
            (lat, lng, location_status, folder_id),
        )
        conn.commit()
    finally:
        conn.close()


# --------------------------------------------------------------------------- #
# Items
# --------------------------------------------------------------------------- #
def upsert_item(
    job_id: int, folder_id: int, drive_id: str, name: str, mime_type: str, status: str
) -> None:
    """Insert a photo task. Existing rows are left untouched so an already
    uploaded photo keeps its state across a re-scan (idempotent planning)."""
    conn = connect()
    try:
        conn.execute(
            "INSERT OR IGNORE INTO items "
            "(job_id, folder_id, drive_id, name, mime_type, status, updated_at) "
            "VALUES (?,?,?,?,?,?,?)",
            (job_id, folder_id, drive_id, name, mime_type, status, now()),
        )
        conn.commit()
    finally:
        conn.close()


def set_item_status(
    item_id: int,
    status: str,
    *,
    media_item_id: Optional[str] = None,
    error: Optional[str] = None,
    stamped: Optional[bool] = None,
) -> None:
    conn = connect()
    try:
        fields = ["status=?", "updated_at=?"]
        params: list[Any] = [status, now()]
        if media_item_id is not None:
            fields.append("media_item_id=?")
            params.append(media_item_id)
        if error is not None:
            fields.append("error=?")
            params.append(error)
        if stamped is not None:
            fields.append("stamped=?")
            params.append(1 if stamped else 0)
        params.append(item_id)
        conn.execute(f"UPDATE items SET {', '.join(fields)} WHERE id=?", params)
        conn.commit()
    finally:
        conn.close()


def move_items_status(job_id: int, folder_id: int, from_status: str, to_status: str) -> int:
    conn = connect()
    try:
        cur = conn.execute(
            "UPDATE items SET status=?, updated_at=? WHERE job_id=? AND folder_id=? AND status=?",
            (to_status, now(), job_id, folder_id, from_status),
        )
        conn.commit()
        return cur.rowcount
    finally:
        conn.close()


def reset_stuck_items(job_id: int) -> int:
    """On (re)start, return any item left mid-flight back to 'ready' so it is
    retried cleanly. This is the crash-recovery step."""
    conn = connect()
    try:
        cur = conn.execute(
            "UPDATE items SET status='ready', updated_at=? "
            "WHERE job_id=? AND status IN ('uploading','downloading')",
            (now(), job_id),
        )
        conn.commit()
        return cur.rowcount
    finally:
        conn.close()


def next_ready_item(job_id: int) -> Optional[dict]:
    conn = connect()
    try:
        return _row(
            conn.execute(
                "SELECT * FROM items WHERE job_id=? AND status='ready' ORDER BY id LIMIT 1",
                (job_id,),
            ).fetchone()
        )
    finally:
        conn.close()


def list_items(job_id: int, status: Optional[str], limit: int, offset: int) -> list[dict]:
    conn = connect()
    try:
        if status:
            q = "SELECT * FROM items WHERE job_id=? AND status=? ORDER BY id LIMIT ? OFFSET ?"
            rs = conn.execute(q, (job_id, status, limit, offset)).fetchall()
        else:
            q = "SELECT * FROM items WHERE job_id=? ORDER BY id LIMIT ? OFFSET ?"
            rs = conn.execute(q, (job_id, limit, offset)).fetchall()
        return _rows(rs)
    finally:
        conn.close()


def status_counts(job_id: int) -> dict:
    conn = connect()
    try:
        rs = conn.execute(
            "SELECT status, COUNT(*) c FROM items WHERE job_id=? GROUP BY status", (job_id,)
        ).fetchall()
        return {r["status"]: r["c"] for r in rs}
    finally:
        conn.close()


def count_needs_review(job_id: int) -> int:
    return status_counts(job_id).get("needs_review", 0)


# --------------------------------------------------------------------------- #
# Questions
# --------------------------------------------------------------------------- #
def upsert_question(
    job_id: int, folder_id: int, kind: str, prompt: str, blocking: bool
) -> None:
    conn = connect()
    try:
        conn.execute(
            "INSERT OR IGNORE INTO questions "
            "(job_id, folder_id, kind, prompt, blocking, status, created_at) "
            "VALUES (?,?,?,?,?, 'open', ?)",
            (job_id, folder_id, kind, prompt, 1 if blocking else 0, now()),
        )
        conn.commit()
    finally:
        conn.close()


def get_question(question_id: int) -> Optional[dict]:
    conn = connect()
    try:
        return _row(
            conn.execute("SELECT * FROM questions WHERE id=?", (question_id,)).fetchone()
        )
    finally:
        conn.close()


def list_questions(job_id: int, status: Optional[str] = "open") -> list[dict]:
    conn = connect()
    try:
        if status:
            rs = conn.execute(
                "SELECT q.*, f.name AS folder_name FROM questions q "
                "JOIN folders f ON f.id=q.folder_id "
                "WHERE q.job_id=? AND q.status=? ORDER BY q.blocking DESC, q.id",
                (job_id, status),
            ).fetchall()
        else:
            rs = conn.execute(
                "SELECT q.*, f.name AS folder_name FROM questions q "
                "JOIN folders f ON f.id=q.folder_id WHERE q.job_id=? ORDER BY q.id",
                (job_id,),
            ).fetchall()
        return _rows(rs)
    finally:
        conn.close()


def answer_question(question_id: int, answer: dict) -> None:
    conn = connect()
    try:
        conn.execute(
            "UPDATE questions SET status='answered', answer=?, answered_at=? WHERE id=?",
            (json.dumps(answer), now(), question_id),
        )
        conn.commit()
    finally:
        conn.close()
