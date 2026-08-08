# Shoebox — Design & Decisions

> Working name: **Shoebox** (a box of undated family photos, finally sorted and
> dated). Shortlist if you want alternatives: Attic, Chronologue, Ferryman,
> Homecoming, Kodachrome. *Name not finalized.*

A self-hosted tool that migrates photos from **Google Drive** (organized in
per-year folders, possibly nested) into **Google Photos**, assigning each photo
a date — and a location where known — and asking the user whenever it can't
confidently figure a date out on its own.

```
Google Drive (nested year folders) ──► scan ──► resolve date/location ──► download ──► stamp EXIF ──► upload ──► Google Photos
                                          │             │
                                          │             └─ can't confirm a date? → question for the user
                                          └─ every photo saved as a task row in SQLite (stoppable / resumable)
```

---

## Guiding principle

**Sort everything the system can confidently date; escalate the rest to a user
question.** Never silently guess when a source is ambiguous — ask.

---

## Decisions (from the design review)

### D1 — Ownership & who runs it — **DECIDED**
Your dad runs it **on his own machine, under his own Google account**.
- He is a **test user** on your Google Cloud project; you hand him a
  `credentials.json` (OAuth client of type *Desktop app*).
- His **refresh token never leaves his machine** (`token.json`, local).
- The web UI binds to `127.0.0.1` only — no public surface, so no per-user web
  auth is needed.
- **Consequence:** the destination is his *real* Google Photos library and there
  is **no undo**. Verification/safety matters (see open items).

### D2 — Operability — **DECIDED (non-issue)**
Dad is technical. Terminal / `npm install` / Node are fine. **No executable
packaging** needed (which also avoids the `better-sqlite3` native-module
packaging trap).

### D3 — Folder structure: nested, recurse — **DECIDED**
His Drive is **nested** (`2003/Christmas/photo.jpg`, not flat).
- The scanner **recurses the entire subtree** under each top-level folder.
- Every image is **attributed to its top-level year ancestor** for year
  resolution.
- One code path handles flat and nested.
- Drive has no native recursive listing → walk folders breadth-first (more
  `files.list` calls; fine for a one-time migration).
- **Supersedes current code**, which is 2-level and non-recursive.

### D4 — Date source precedence — **DECIDED**
Resolve each photo's date in this order:
1. **Existing EXIF `DateTimeOriginal`** — trust the camera; never overwrite.
2. **Date parsed from the folder path** — year always; **month/day too** if a
   folder in the path encodes it (`2003-07`, `July 2003`).
3. **Folder year → Jan 1, noon** — last resort when only the year is known.
4. **(Do NOT use Drive `createdTime`.)** It reflects *upload/scan* time, not
   capture time — a 2003 print scanned in 2015 has a 2015 `createdTime`. For a
   shoebox migration the **folder year is more trustworthy than Drive's own
   timestamp**. If there is no folder-derived date at all, leave the date blank
   (Photos falls back to upload time) rather than stamp a misleading one.

### D5 — When to ask, and how precisely — **DECIDED**
- **Inspect EXIF during planning** to be surgical: a question is raised only when
  a photo has **no real date** from either its own EXIF *or* its folder path.
- Implement the inspection as an **HTTP range read of the JPEG header** (EXIF is
  in the first few KB) — precision without downloading whole files twice.
  - **Supersedes current code**, whose planner is download-free and folder-name
    only, and which only reads EXIF at upload time.
- **Ambiguity → question, not a guess.** Change year parsing so that **exactly
  one** unambiguous year in the folder path auto-sorts; **zero, two-or-more, or a
  fuzzy token** (`2003-2004`, `early 2000s`, `90s`) raises a question.
  - Current `parseYear` takes the *first* regex match — `2003-2004` silently
    becomes 2003. Must change.
- **Questions stay at folder granularity** (one question covers all photos in a
  folder) — a shoebox is dozens of folders, not thousands of per-photo prompts.

### D6 — Location — **DECIDED (carried from build)**
- Google Photos has **no API field** for date or GPS; both are read from the
  file's EXIF on upload. So we write them into the JPEG before upload.
- Location questions are **optional and non-blocking** (a photo can upload
  without a location). Location is set **per folder**.
- Only *fill in* missing metadata — never overwrite a real EXIF date/GPS.

---

## Architecture (already built, TypeScript)

One Node process (Express) serves the REST API **and** the static frontend, runs
the background worker, and persists everything to SQLite.

| Concern | Choice |
|---|---|
| Language / runtime | TypeScript · Node.js |
| Web | Express (API + static host, one process) |
| DB | SQLite via `better-sqlite3` (synchronous; no races with the async worker) |
| Worker | async loop + a `stop` flag; single-threaded |
| Google | `googleapis` (Drive) · `@google-cloud/local-auth` (OAuth) |
| Photos upload | two-step `uploads` → `mediaItems:batchCreate` via `axios` |
| EXIF | `piexifjs` — splices the EXIF segment in **without recompressing pixels** |
| Frontend | vanilla HTML/JS/CSS, no build step |

### Stoppable / resumable / idempotent
State lives entirely in SQLite and every item's status is committed the instant
it changes.
- **Stop** → job flips to `paused`; the worker exits between items.
- **Resume / rerun** → start again; the worker resets any item caught mid-flight
  and continues with the remaining `ready` items.
- Uploaded photos are **never re-uploaded** (idempotent).
- **Dedup ledger is the DB** — the post-2025 Photos API can only see media the
  app itself created, so it can't dedup for us. Keep the `.db` file. *(Robustness
  if the DB is lost is an open item.)*

---

## Data model (SQLite)

- **jobs** — one migration run: `id, name, root_folder_id, status, message,
  created_at, updated_at`
  - status: `created | scanning | scanned | running | paused |
    waiting_for_input | completed | failed`
- **folders** — `id, job_id, drive_id, name, resolved_year, resolved_lat,
  resolved_lng, year_status, location_status`
- **items** — one photo task: `id, job_id, folder_id, drive_id, name, mime_type,
  status, media_item_id, stamped, error, updated_at`
  - status: `pending | needs_review | ready | uploading | uploaded | failed |
    skipped`
- **questions** — `id, job_id, folder_id, kind(year|location), prompt, blocking,
  status(open|answered), answer, created_at, answered_at`

---

## Pipeline phases

1. **Scan** — recurse Drive; write one `item` per photo (this is "define the
   tasks and save them"). *Per D3.*
2. **Resolve** — for each photo, apply the D4 precedence, inspecting EXIF via
   header range-read (D5). Confident date → `ready`. Unconfirmable → a **blocking
   year question**, photo → `needs_review`. Optional **location question** per
   folder (non-blocking). *Per D4/D5.*
3. **Execute** — download → stamp EXIF (fill only what's missing) → upload →
   `uploaded`. Every step commits; idempotent and resumable.

Answering a blocking year question promotes that folder's photos
`needs_review → ready`.

---

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

---

## Delta: what the decisions still require (to build)

The reviewed decisions go **beyond the current code**. To implement:
- [ ] **D3** — recursive subtree scan; attribute images to top-level year ancestor.
- [ ] **D5** — EXIF-aware planning via **header range-reads**; only ask when a
      photo has no date from EXIF *or* folder path.
- [ ] **D5** — ambiguity-aware `parseYear`: one year → sort; zero / two+ / fuzzy → ask.
- [ ] **D4** — parse **month/day** from folder-path names, not just the year.
- [ ] Ensure execution **reuses** the header already fetched in planning where
      possible (avoid double download).

---

## Open questions (not yet grilled — continue in the new workspace)

1. **Month/day asking bar.** Year-level is the current "sorted" bar. Do we ever
   *ask* for month/day when only a year is known? (Leaning: derive finer dates
   from the folder path when present; otherwise year-level is enough — do **not**
   prompt per folder for month/day.)
2. **In-year ordering.** All photos in a year land on Jan 1 (same instant), so
   they pile onto one day in Photos. Acceptable, or spread across the year to
   preserve Drive order?
3. **File types.** `piexifjs` is JPEG-only. What about **HEIC** (iPhone), PNG,
   and **video**? Note: the current scanner filters to `image/*`, so **videos
   are skipped entirely** today — decide whether they migrate (and how they get
   dated, since EXIF stamping doesn't apply).
4. **Dedup robustness.** The DB is the only ledger. If it's lost or a second job
   targets the same root, everything re-uploads as duplicates. Add a content-hash
   ledger, or accept the risk?
5. **Concurrency & scale.** Uploads are sequential. Parallelize N-at-a-time for
   large libraries? Handle Google **rate limits / backoff**?
6. **Retries.** Failed items stay failed — add automatic retry with backoff?
7. **Verification / safety.** Writes to his real library with no undo. Do we want
   a stronger **dry-run / preview** (show the resolved date + location per photo
   before committing)?
8. **Photos storage quality.** Upload preserves originals, but Photos may
   recompress unless the account is set to original quality — document/confirm.

---

## Setup recap

1. Google Cloud project; enable **Drive API** + **Photos Library API**.
2. OAuth consent screen (External, Testing); add dad as a **test user**.
3. OAuth client type **Desktop app** → `credentials.json` in the project root.
4. `npm install` → `npm run dev` (or `npm run build && npm start`) →
   `http://127.0.0.1:8000`. First run opens a browser for consent; token caches
   to `token.json`.
5. `npm test` runs the end-to-end suite with Google faked (no network).

Never commit: `credentials.json`, `token.json`, `photo_migration.db*`.
