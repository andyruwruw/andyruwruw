/**
 * Apply user answers to open questions.
 *
 * Answering a blocking *year* question promotes that folder's photos from
 * `needs_review` to `ready` so the worker can pick them up. *Location* answers
 * are optional and never gate an upload.
 */
import * as db from "./db";
import { AnswerPayload } from "./types";

export class AnswerError extends Error {}

export function applyAnswer(questionId: number, payload: AnswerPayload): { promoted_items: number } {
  const question = db.getQuestion(questionId);
  if (!question) throw new AnswerError("question not found");
  if (question.status === "answered") throw new AnswerError("question already answered");

  const { folder_id: folderId, job_id: jobId } = question;
  let promoted = 0;

  if (question.kind === "year") {
    if (payload.skip) {
      // User can't recall: fall back to each file's own EXIF/upload time.
      db.setFolderYear(folderId, null, "skipped");
    } else {
      db.setFolderYear(folderId, coerceYear(payload.year), "answered");
    }
    promoted = db.moveItemsStatus(jobId, folderId, "needs_review", "ready");
  } else if (question.kind === "location") {
    if (payload.none) {
      db.setFolderLocation(folderId, null, null, "none");
    } else {
      const lat = coerceCoord(payload.lat, "latitude", 90);
      const lng = coerceCoord(payload.lng, "longitude", 180);
      db.setFolderLocation(folderId, lat, lng, "answered");
    }
  } else {
    throw new AnswerError(`unknown question kind: ${question.kind}`);
  }

  db.answerQuestion(questionId, payload);
  return { promoted_items: promoted };
}

function coerceYear(value: unknown): number {
  const year = Number(value);
  if (!Number.isInteger(year)) {
    throw new AnswerError("year must be an integer (or pass skip=true)");
  }
  if (year < 1826 || year > 2100) {
    // first photograph ~1826
    throw new AnswerError("year is out of a plausible range");
  }
  return year;
}

function coerceCoord(value: unknown, label: string, limit: number): number {
  const coord = Number(value);
  if (!Number.isFinite(coord)) {
    throw new AnswerError(`${label} must be a number (or pass none=true)`);
  }
  if (coord < -limit || coord > limit) {
    throw new AnswerError(`${label} must be between -${limit} and ${limit}`);
  }
  return coord;
}
