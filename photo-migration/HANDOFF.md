# HANDOFF — Shoebox design review (`/grill-me` in progress)

Purpose of this file: let the **next agent** resume the `/grill-me` design
interview exactly where it stopped, with full context on what's decided, what's
built, and what to ask next.

---

## What this project is

**Shoebox** (working name) — a self-hosted TypeScript app that migrates photos
from **Google Drive** (nested per-year folders) into **Google Photos**, assigning
each photo a date/location and **asking the user** whenever it can't confidently
date one. See `DESIGN.md` for the full spec; see `README.md` for run/setup.

Guiding principle the user set: **sort everything the system can confidently
date; escalate the rest to a user question. Never silently guess.**

---

## What `/grill-me` is

An interview skill: grill the user **relentlessly, one question at a time**,
walking down the design tree and resolving dependencies. **Always provide a
recommended answer** with each question. Explore the codebase to answer things
rather than asking. The user invoked it to stress-test Shoebox's design.

### How to resume it
Re-invoke the skill (`/grill-me`) or just continue the interview directly. Pick
up from the **Open questions queue** below — those are the un-grilled branches.
Keep the format: one question, a real recommendation, name your assumptions, make
the user feel the consequence of each choice.

---

## User interaction style (observed)

- **Terse and decisive** — answers with a single letter (`B`) or a short phrase
  (`Nested, and b`). Don't over-explain back; confirm and move on.
- Says **"move on" / "non-issue"** when a branch doesn't apply — drop it fast.
- Wants **recommendations**, not option dumps.
- Context: **dad is technical**; this is a one-time family migration, not a
  product. Destination is dad's **real** Photos library (no undo).

---

## Progress so far (Q1–Q5 asked & answered)

| # | Question | Answer | → captured as |
|---|----------|--------|---------------|
| Q1 | Who runs it / whose account? | Dad runs it on **his** machine + account (option b) | D1 |
| Q2 | How does a non-tech user launch it? | **Non-issue — dad is technical** | D2 |
| Q3 | Flat or nested Drive structure? | **Nested** → recurse (option b) | D3 |
| Q4 | Date source & precedence? | Agreed chain; **`createdTime` is a trap**; ask when unsure | D4 |
| Q5 | Ask granularity / download to decide? | **Inspect EXIF in planning, ask surgically** (option b) | D5 |

Decisions **D1–D6** are written up in `DESIGN.md` (D6 = location handling,
carried from the build). **Stopped after Q5** because the user asked to export
the decisions doc and take the project into a new repo/workspace.

One thread left dangling inside Q5: the **month/day asking bar** sub-question was
not explicitly answered → it's now Open Question #1 below.

---

## Build state (already implemented, verified)

- Full **TypeScript** app: Express (REST + static), `better-sqlite3`, async
  worker (stop/resume/idempotent), `googleapis` + `@google-cloud/local-auth`,
  `piexifjs`, vanilla-JS frontend.
- `npm run typecheck` clean; production build boots; **`npm test`** (an
  end-to-end suite with Google faked at its seams) passes 15 checks.
- **Important:** the reviewed decisions now **outrun the code**. The current
  build does *not* yet do recursion (D3), EXIF-aware planning / header
  range-reads (D5), `2003-2004`-style ambiguity detection (D5), or month/day
  folder parsing (D4). See the **Delta** section in `DESIGN.md` for the checklist.

---

## Open questions queue — GRILL THESE NEXT

Ordered roughly by impact. #3 is the one to start with (highest impact, a real
coverage gap).

1. **Month/day asking bar.** Year-level is the current "sorted" bar. Ever *ask*
   for month/day when only a year is known? (Leaning: derive finer dates from the
   folder path when present; don't prompt per folder for month/day.)
2. **In-year ordering.** All photos in a year land on Jan 1 (same instant) → they
   pile onto one day in Photos. Acceptable, or spread across the year to preserve
   Drive order?
3. **★ File types.** `piexifjs` is JPEG-only. HEIC (iPhone), PNG, and **video**?
   The scanner currently filters to `image/*`, so **videos are silently skipped
   today**. HEIC/PNG can't take the JPEG EXIF stamp path → how do they get dated?
   Start here.
4. **Dedup robustness.** The SQLite DB is the only ledger. Lose it (or run a
   second job over the same root) → everything re-uploads as duplicates. Add a
   content-hash ledger, or accept the risk?
5. **Concurrency & scale.** Uploads are sequential. Parallelize N-at-a-time?
   Handle Google **rate limits / backoff**?
6. **Retries.** Failed items stay failed — automatic retry with backoff?
7. **Verification / safety.** Real library, no undo. Stronger **dry-run/preview**
   (show resolved date + location per photo before committing)?
8. **Photos storage quality.** Originals may be recompressed unless the account is
   set to original quality — document/confirm.

Suggested next prompt to the user (Q6): grill **#3 (file types / video)**, with a
recommendation — e.g. *migrate videos too, dated by folder only (no EXIF stamp);
pass HEIC/PNG through un-stamped or convert; decide whether unsupported types
block or warn.*

---

## Repo / branch mechanics

- Lives at `photo-migration/` inside repo **`andyruwruw/andyruwruw`**, branch
  **`claude/google-drive-photos-migration-k9cjns`**. Self-contained (own
  `package.json`, `tsconfig`, `.gitignore`) — **intended to move to its own
  repo/workspace.**
- Commit + push to that branch when work is done. Push with
  `git push -u origin claude/google-drive-photos-migration-k9cjns` (retry with
  backoff on network errors). Do **not** push elsewhere without permission.
- A stop hook enforces "no untracked files" — commit/push new docs.
- Never commit `credentials.json`, `token.json`, `photo_migration.db*`,
  `node_modules/`, `dist/`.

---

## File map for the next agent

| File | What it is |
|------|-----------|
| `DESIGN.md` | The decisions doc (D1–D6), architecture, delta, open questions |
| `HANDOFF.md` | This file — how to resume the grill |
| `README.md` | Setup + run + API reference |
| `src/*.ts` | The built app (see `DESIGN.md` layout table) |
| `scripts/e2e.ts` | End-to-end test (`npm test`) |
| `frontend/` | Static progress UI |
