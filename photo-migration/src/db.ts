/**
 * SQLite persistence layer (better-sqlite3, synchronous).
 *
 * Every unit of work is a row, and every state transition is committed
 * immediately -- that is what makes a job stoppable and rerunnable from the
 * exact same state. better-sqlite3 is synchronous, so there are no races
 * between the HTTP handlers and the async worker loop (single-threaded event
 * loop + synchronous DB calls).
 */
import Database from "better-sqlite3";
import * as config from "./config";
import { Folder, Item, Job, Question } from "./types";

const SCHEMA = `
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
    year_status     TEXT NOT NULL DEFAULT 'unknown',
    location_status TEXT NOT NULL DEFAULT 'unknown',
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
    kind        TEXT NOT NULL,
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
`;

let _db: Database.Database | null = null;

function db(): Database.Database {
  if (!_db) {
    _db = new Database(config.DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
  }
  return _db;
}

export function initDb(): void {
  db().exec(SCHEMA);
}

const now = (): string => new Date().toISOString();

/* --------------------------------------------------------------------- Jobs */
export function createJob(name: string, rootFolderId: string): Job {
  const ts = now();
  const info = db()
    .prepare(
      "INSERT INTO jobs (name, root_folder_id, status, created_at, updated_at) VALUES (?,?,?,?,?)"
    )
    .run(name, rootFolderId, "created", ts, ts);
  return getJob(Number(info.lastInsertRowid))!;
}

export function getJob(jobId: number): Job | undefined {
  return db().prepare("SELECT * FROM jobs WHERE id=?").get(jobId) as Job | undefined;
}

export function listJobs(): Job[] {
  return db().prepare("SELECT * FROM jobs ORDER BY id DESC").all() as Job[];
}

export function setJobStatus(jobId: number, status: string, message: string | null = null): void {
  db()
    .prepare("UPDATE jobs SET status=?, message=?, updated_at=? WHERE id=?")
    .run(status, message, now(), jobId);
}

/* ----------------------------------------------------------------- Folders */
export function upsertFolder(jobId: number, driveId: string, name: string): number {
  db()
    .prepare("INSERT OR IGNORE INTO folders (job_id, drive_id, name) VALUES (?,?,?)")
    .run(jobId, driveId, name);
  const row = db()
    .prepare("SELECT id FROM folders WHERE job_id=? AND drive_id=?")
    .get(jobId, driveId) as { id: number };
  return row.id;
}

export function getFolder(folderId: number): Folder | undefined {
  return db().prepare("SELECT * FROM folders WHERE id=?").get(folderId) as Folder | undefined;
}

export function setFolderYear(folderId: number, year: number | null, yearStatus: string): void {
  db()
    .prepare("UPDATE folders SET resolved_year=?, year_status=? WHERE id=?")
    .run(year, yearStatus, folderId);
}

export function setFolderLocation(
  folderId: number,
  lat: number | null,
  lng: number | null,
  locationStatus: string
): void {
  db()
    .prepare("UPDATE folders SET resolved_lat=?, resolved_lng=?, location_status=? WHERE id=?")
    .run(lat, lng, locationStatus, folderId);
}

/* ------------------------------------------------------------------- Items */
export function upsertItem(
  jobId: number,
  folderId: number,
  driveId: string,
  name: string,
  mimeType: string,
  status: string
): void {
  // Existing rows are left untouched so an already-uploaded photo keeps its
  // state across a re-scan (idempotent planning).
  db()
    .prepare(
      "INSERT OR IGNORE INTO items (job_id, folder_id, drive_id, name, mime_type, status, updated_at) " +
        "VALUES (?,?,?,?,?,?,?)"
    )
    .run(jobId, folderId, driveId, name, mimeType, status, now());
}

export function setItemStatus(
  itemId: number,
  status: string,
  opts: { mediaItemId?: string | null; error?: string | null; stamped?: boolean } = {}
): void {
  const fields = ["status=?", "updated_at=?"];
  const params: unknown[] = [status, now()];
  if (opts.mediaItemId !== undefined) {
    fields.push("media_item_id=?");
    params.push(opts.mediaItemId);
  }
  if (opts.error !== undefined) {
    fields.push("error=?");
    params.push(opts.error);
  }
  if (opts.stamped !== undefined) {
    fields.push("stamped=?");
    params.push(opts.stamped ? 1 : 0);
  }
  params.push(itemId);
  db().prepare(`UPDATE items SET ${fields.join(", ")} WHERE id=?`).run(...params);
}

export function moveItemsStatus(
  jobId: number,
  folderId: number,
  fromStatus: string,
  toStatus: string
): number {
  const info = db()
    .prepare(
      "UPDATE items SET status=?, updated_at=? WHERE job_id=? AND folder_id=? AND status=?"
    )
    .run(toStatus, now(), jobId, folderId, fromStatus);
  return info.changes;
}

export function resetStuckItems(jobId: number): number {
  // On (re)start, return any item left mid-flight to 'ready' -- crash recovery.
  const info = db()
    .prepare(
      "UPDATE items SET status='ready', updated_at=? WHERE job_id=? AND status IN ('uploading','downloading')"
    )
    .run(now(), jobId);
  return info.changes;
}

export function nextReadyItem(jobId: number): Item | undefined {
  return db()
    .prepare("SELECT * FROM items WHERE job_id=? AND status='ready' ORDER BY id LIMIT 1")
    .get(jobId) as Item | undefined;
}

export function listItems(
  jobId: number,
  status: string | undefined,
  limit: number,
  offset: number
): Item[] {
  if (status) {
    return db()
      .prepare("SELECT * FROM items WHERE job_id=? AND status=? ORDER BY id LIMIT ? OFFSET ?")
      .all(jobId, status, limit, offset) as Item[];
  }
  return db()
    .prepare("SELECT * FROM items WHERE job_id=? ORDER BY id LIMIT ? OFFSET ?")
    .all(jobId, limit, offset) as Item[];
}

export function statusCounts(jobId: number): Record<string, number> {
  const rows = db()
    .prepare("SELECT status, COUNT(*) c FROM items WHERE job_id=? GROUP BY status")
    .all(jobId) as { status: string; c: number }[];
  const out: Record<string, number> = {};
  for (const r of rows) out[r.status] = r.c;
  return out;
}

export function countNeedsReview(jobId: number): number {
  return statusCounts(jobId).needs_review || 0;
}

/* --------------------------------------------------------------- Questions */
export function upsertQuestion(
  jobId: number,
  folderId: number,
  kind: string,
  prompt: string,
  blocking: boolean
): void {
  db()
    .prepare(
      "INSERT OR IGNORE INTO questions (job_id, folder_id, kind, prompt, blocking, status, created_at) " +
        "VALUES (?,?,?,?,?, 'open', ?)"
    )
    .run(jobId, folderId, kind, prompt, blocking ? 1 : 0, now());
}

export function getQuestion(questionId: number): Question | undefined {
  return db().prepare("SELECT * FROM questions WHERE id=?").get(questionId) as Question | undefined;
}

export function listQuestions(jobId: number, status: string | null = "open"): Question[] {
  if (status) {
    return db()
      .prepare(
        "SELECT q.*, f.name AS folder_name FROM questions q JOIN folders f ON f.id=q.folder_id " +
          "WHERE q.job_id=? AND q.status=? ORDER BY q.blocking DESC, q.id"
      )
      .all(jobId, status) as Question[];
  }
  return db()
    .prepare(
      "SELECT q.*, f.name AS folder_name FROM questions q JOIN folders f ON f.id=q.folder_id " +
        "WHERE q.job_id=? ORDER BY q.id"
    )
    .all(jobId) as Question[];
}

export function answerQuestion(questionId: number, answer: object): void {
  db()
    .prepare("UPDATE questions SET status='answered', answer=?, answered_at=? WHERE id=?")
    .run(JSON.stringify(answer), now(), questionId);
}
