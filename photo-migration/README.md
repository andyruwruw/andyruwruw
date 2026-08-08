# photo-migration

A small self-hosted app that migrates photos from **Google Drive** (organized in
per-year folders) into **Google Photos** — with a database of tasks, a stoppable
/ resumable worker, a REST API, a static progress UI, and a **question queue** for
whenever a photo's year or location can't be confirmed automatically.

```
Google Drive (year folders) ──► scan ──► resolve ──► download ──► EXIF stamp ──► upload ──► Google Photos
                                   │         │
                                   │         └─ can't confirm year/location? → question for the user
                                   └─ every photo saved as a task row in SQLite
```

## Why it's shaped this way

- **Tasks are defined first and persisted.** A *scan* walks the Drive folders and
  writes one `item` row per photo. Nothing is downloaded during planning, so it's
  fast and safe to re-run.
- **Stoppable & rerunnable from the same state.** Every item's status is committed
  to SQLite the instant it changes. Pause flips the job to `paused` and the worker
  stops between items; start again and it resumes with the remaining work.
  Uploaded photos are never re-uploaded (idempotent). If the process dies
  mid-upload, the next start resets that one item and retries it.
- **Questions when unsure.** If a folder name yields a confident year, its photos
  go straight to `ready`. If not, a **blocking** year question is filed and those
  photos wait in `needs_review`. A **non-blocking** location question is offered
  per folder. Answering a year question promotes its photos to `ready`.
- **Date/location via EXIF.** Google Photos has no API field for date or GPS — it
  reads them from the file. So the app writes them into the JPEG before upload,
  and only fills in what's missing (camera metadata is never overwritten).

## The 2025 Google Photos API note

Since March 2025 a third-party app can only see media *it* uploaded. That's fine
here (we only upload), but it means the API can't dedup for you — the SQLite task
table is the source of truth for what's already done. Keep the `.db` file.

## Stack

TypeScript · Node.js · Express (one process serves the API *and* the static UI) ·
SQLite (better-sqlite3) · an async background worker · vanilla-JS frontend
(no build step). Google via `googleapis` + `@google-cloud/local-auth`; EXIF via
`piexifjs`.

## Setup

1. Create a Google Cloud project; enable **Google Drive API** and **Google Photos
   Library API**.
2. Configure the OAuth consent screen (External, "Testing" is fine) and add
   yourself + your dad as **test users** — no verification review needed.
3. Create an OAuth client of type **Desktop app**, download the JSON, save it as
   `credentials.json` in this folder.
4. Install and run:
   ```bash
   cd photo-migration
   npm install
   npm run dev                   # → http://127.0.0.1:8000  (or: npm run build && npm start)
   ```
   The first Drive/Photos call opens a browser for consent; the token is cached in
   `token.json`.

Run the end-to-end test (Google faked, no network) with `npm test`.

## Using it

1. Open http://127.0.0.1:8000.
2. **Create** a job with a name and the **root folder ID** (the folder that
   *contains* the year folders — it's the last segment of the folder's Drive URL).
3. **Scan** — populates the task list and any questions.
4. Answer open **questions** (year is required to date a folder's photos; location
   is optional).
5. **Start** — the worker downloads, stamps, and uploads. **Pause** any time;
   **Start** again to resume. Progress, counts, and failures update live.

## REST API

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/api/jobs` | List jobs |
| `POST` | `/api/jobs` | Create a job `{name, root_folder_id}` |
| `GET`  | `/api/jobs/{id}` | Job + progress summary |
| `POST` | `/api/jobs/{id}/scan` | Plan tasks (background) |
| `POST` | `/api/jobs/{id}/start` | Start / resume the worker |
| `POST` | `/api/jobs/{id}/pause` | Stop after the current item |
| `GET`  | `/api/jobs/{id}/items?status=` | List photo tasks |
| `GET`  | `/api/jobs/{id}/questions?status=open` | Open questions |
| `POST` | `/api/questions/{id}/answer` | Answer `{year}` / `{skip}` / `{lat,lng}` / `{none}` |

## Layout

| Path | Role |
|------|------|
| `src/api.ts` | Express app: REST endpoints + static mount |
| `src/server.ts` | Entry point (init DB, listen) |
| `src/db.ts` | SQLite schema + all persistence (the resumable state) |
| `src/planner.ts` | Scan + year resolution + question generation |
| `src/worker.ts` | Stoppable/resumable background execution |
| `src/answers.ts` | Applies user answers, promotes photos to `ready` |
| `src/exif.ts` | EXIF date/GPS stamping (fills only what's missing) |
| `src/drive.ts` | Drive listing + download |
| `src/photos.ts` | Two-step Google Photos upload |
| `src/auth.ts` | OAuth flow → Drive + Photos clients |
| `frontend/` | Static progress UI (index.html / app.js / style.css) |
| `scripts/e2e.ts` | End-to-end test with Google faked |

## Not committed

`credentials.json`, `token.json`, `photo_migration.db*`, `node_modules/`, and
`dist/` are git-ignored — they hold secrets, per-account state, or build output.

## Tuning date/location rules

The default folder-year date is Jan 1 at noon (`DEFAULT_MONTH/DAY/HOUR` in
`src/config.ts`), and folder-name year parsing lives in `src/planner.ts`
(`parseYear`). Adjust either to taste.
