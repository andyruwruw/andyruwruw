"""Apply user answers to open questions.

Answering a blocking *year* question promotes that folder's photos from
``needs_review`` to ``ready`` so the worker can pick them up on the next run.
*Location* answers are optional and never gate an upload.
"""

from __future__ import annotations

from typing import Optional

from . import db


class AnswerError(ValueError):
    pass


def apply_answer(question_id: int, payload: dict) -> dict:
    question = db.get_question(question_id)
    if question is None:
        raise AnswerError("question not found")
    if question["status"] == "answered":
        raise AnswerError("question already answered")

    folder_id = question["folder_id"]
    job_id = question["job_id"]
    promoted = 0

    if question["kind"] == "year":
        if payload.get("skip"):
            # User can't recall: fall back to each file's own EXIF/upload time.
            db.set_folder_year(folder_id, None, "skipped")
        else:
            year = _coerce_year(payload.get("year"))
            db.set_folder_year(folder_id, year, "answered")
        promoted = db.move_items_status(job_id, folder_id, "needs_review", "ready")

    elif question["kind"] == "location":
        if payload.get("none"):
            db.set_folder_location(folder_id, None, None, "none")
        else:
            lat = _coerce_coord(payload.get("lat"), "latitude", 90.0)
            lng = _coerce_coord(payload.get("lng"), "longitude", 180.0)
            db.set_folder_location(folder_id, lat, lng, "answered")
    else:
        raise AnswerError(f"unknown question kind: {question['kind']}")

    db.answer_question(question_id, payload)
    return {"promoted_items": promoted}


def _coerce_year(value) -> int:
    try:
        year = int(value)
    except (TypeError, ValueError):
        raise AnswerError("year must be an integer (or pass skip=true)")
    if not (1826 <= year <= 2100):  # first photograph ~1826
        raise AnswerError("year is out of a plausible range")
    return year


def _coerce_coord(value, label: str, limit: float) -> Optional[float]:
    try:
        coord = float(value)
    except (TypeError, ValueError):
        raise AnswerError(f"{label} must be a number (or pass none=true)")
    if not (-limit <= coord <= limit):
        raise AnswerError(f"{label} must be between -{limit} and {limit}")
    return coord
