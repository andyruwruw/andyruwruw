"""REST API + static frontend host.

One FastAPI app serves:
  - JSON endpoints under /api/*
  - the static progress UI at / (from ../frontend)

Long operations (scan, execute) run in background threads so the HTTP calls
return immediately; the UI polls the progress endpoints.
"""

from __future__ import annotations

import threading

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import answers, config, db, planner, worker
from .auth import get_clients

app = FastAPI(title="photo-migration", version="0.1.0")

# Ensure the schema exists as soon as the app is imported, independent of
# startup-event timing.
db.init_db()


@app.on_event("startup")
def _startup() -> None:
    db.init_db()


# --------------------------------------------------------------------------- #
# Request models
# --------------------------------------------------------------------------- #
class CreateJob(BaseModel):
    name: str
    root_folder_id: str


class AnswerPayload(BaseModel):
    year: int | None = None
    skip: bool | None = None
    lat: float | None = None
    lng: float | None = None
    none: bool | None = None


# --------------------------------------------------------------------------- #
# Jobs
# --------------------------------------------------------------------------- #
@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


@app.get("/api/jobs")
def get_jobs() -> list[dict]:
    return db.list_jobs()


@app.post("/api/jobs")
def post_job(body: CreateJob) -> dict:
    return db.create_job(body.name, body.root_folder_id)


def _job_or_404(job_id: int) -> dict:
    job = db.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="job not found")
    return job


@app.get("/api/jobs/{job_id}")
def get_job(job_id: int) -> dict:
    job = _job_or_404(job_id)
    counts = db.status_counts(job_id)
    total = sum(counts.values())
    open_questions = db.list_questions(job_id, "open")
    return {
        "job": job,
        "running": worker.is_running(job_id),
        "counts": counts,
        "total_items": total,
        "uploaded": counts.get("uploaded", 0),
        "failed": counts.get("failed", 0),
        "needs_review": counts.get("needs_review", 0),
        "open_questions": len(open_questions),
        "blocking_questions": sum(1 for q in open_questions if q["blocking"]),
    }


@app.post("/api/jobs/{job_id}/scan")
def scan(job_id: int) -> dict:
    job = _job_or_404(job_id)
    if job["status"] == "scanning":
        raise HTTPException(status_code=409, detail="scan already in progress")

    def _do_scan() -> None:
        try:
            clients = get_clients(config.CLIENT_SECRET, config.TOKEN_FILE)
            planner.scan_job(clients, job_id, job["root_folder_id"])
        except Exception as exc:  # noqa: BLE001
            db.set_job_status(job_id, "failed", message=f"scan failed: {exc}")

    threading.Thread(target=_do_scan, daemon=True).start()
    return {"status": "scanning"}


@app.post("/api/jobs/{job_id}/start")
def start(job_id: int) -> dict:
    _job_or_404(job_id)
    started = worker.start(job_id)
    if not started:
        raise HTTPException(status_code=409, detail="job already running")
    return {"status": "running"}


@app.post("/api/jobs/{job_id}/pause")
def pause(job_id: int) -> dict:
    _job_or_404(job_id)
    worker.request_pause(job_id)
    return {"status": "pausing"}


@app.get("/api/jobs/{job_id}/items")
def items(job_id: int, status: str | None = None, limit: int = 100, offset: int = 0) -> list[dict]:
    _job_or_404(job_id)
    return db.list_items(job_id, status, min(limit, 500), offset)


@app.get("/api/jobs/{job_id}/questions")
def questions(job_id: int, status: str = "open") -> list[dict]:
    _job_or_404(job_id)
    return db.list_questions(job_id, status)


# --------------------------------------------------------------------------- #
# Questions
# --------------------------------------------------------------------------- #
@app.post("/api/questions/{question_id}/answer")
def answer(question_id: int, body: AnswerPayload) -> dict:
    try:
        return answers.apply_answer(question_id, body.model_dump(exclude_none=True))
    except answers.AnswerError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# --------------------------------------------------------------------------- #
# Static frontend (mounted last so /api/* wins)
# --------------------------------------------------------------------------- #
app.mount("/", StaticFiles(directory=config.FRONTEND_DIR, html=True), name="frontend")
