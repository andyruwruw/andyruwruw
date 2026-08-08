# photo-migration

A small, resumable tool that copies photos from **Google Drive** (organized in
per-year folders) into **Google Photos**, optionally stamping EXIF **date** and
**GPS location** onto photos that are missing it.

> Built as a standalone utility — it does not touch the profile-page app in the
> rest of this repo.

## What it does

```
Google Drive (year folders) ──► download ──► EXIF stamp (if needed) ──► upload ──► Google Photos
```

- **Drive** — read-only. Lists sub-folders of a root folder and downloads the
  images inside each.
- **EXIF** — Google Photos has *no API field* for a photo's date or location; it
  reads those from the file's embedded EXIF. So when a photo lacks a date/GPS,
  the tool writes it into the JPEG before uploading. Camera-recorded metadata is
  never overwritten.
- **Photos** — append-only upload. Photos land in the real library normally.
- **Manifest** — a local `manifest.json` records every uploaded Drive file so
  re-runs skip finished work and don't create duplicates.

## The one big caveat (2025 Google Photos API change)

Since March 2025, a third-party app can only *see and manage media it uploaded
itself* — the broad "read the whole library" scopes were removed. That's fine
here because the tool **only uploads**. The consequence: the API can't tell us
whether a photo already exists, so de-duplication relies on the local manifest
(hence: keep `manifest.json`, and don't run two copies against the same account).

## Setup

1. **Create a Google Cloud project** and enable both **Google Drive API** and
   **Google Photos Library API**.
2. **Configure the OAuth consent screen** (External, "Testing" mode is fine).
   Add yourself and your dad as **test users** — no Google verification review
   needed while in testing.
3. **Create an OAuth client** of type **Desktop app**, download the JSON, and
   save it here as `credentials.json`.
4. Install deps:
   ```bash
   cd photo-migration
   python -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   ```

## Usage

Find the **root folder ID** (the folder that *contains* the year folders) — it's
the last path segment of the folder's URL in Drive.

```bash
# Safe: lists + downloads + stamps, but uploads nothing.
python main.py --root-folder-id <ROOT_FOLDER_ID> --dry-run

# Real run, but stop after 5 uploads to sanity-check the result in Photos.
python main.py --root-folder-id <ROOT_FOLDER_ID> --limit 5

# One specific year.
python main.py --root-folder-id <ROOT_FOLDER_ID> --only-year 2003

# Full run (resumable — safe to Ctrl-C and re-run).
python main.py --root-folder-id <ROOT_FOLDER_ID>
```

First run opens a browser for consent; the token is cached in `token.json`.

## Customizing date/location rules

Everything you'd want to change lives in **`migrate/exif.py`**, in two clearly
marked hook functions:

- `decide_datetime(file)` — what date to stamp. Default: parse a 4-digit year
  from the folder name and use Jan 1 of that year. Replace with filename parsing,
  a lookup table, per-folder overrides, etc.
- `decide_gps(file)` — what coordinates to stamp. Default: none. Fill in your own
  mapping (e.g. read a CSV of folder → lat/long).

Both receive the `DriveFile` (which carries `name` and `parent_name`), so you
have the filename and folder to base decisions on.

## Files

| Path | Role |
|------|------|
| `migrate/auth.py` | OAuth flow, returns Drive + Photos clients |
| `migrate/drive.py` | List folders / images, download bytes |
| `migrate/exif.py` | **Date/location hooks** + EXIF read/write |
| `migrate/photos.py` | Two-step Photos upload |
| `migrate/manifest.py` | Resumable dedup ledger |
| `migrate/cli.py` | Orchestration + CLI flags |
| `main.py` | Entry point |

## Not committed

`credentials.json`, `token.json`, and `manifest.json` are git-ignored — they hold
secrets and per-account state.
