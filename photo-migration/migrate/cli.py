"""Command-line orchestration.

Ties together: auth -> list Drive folders -> download -> EXIF stamp ->
upload -> record in the manifest. Resumable and idempotent; supports a
dry run that touches Drive but never uploads.
"""

from __future__ import annotations

import argparse
import sys

from . import auth, config, drive, exif, photos
from .manifest import Manifest


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="photo-migration",
        description="Migrate photos from Google Drive (organized by year) to Google Photos.",
    )
    parser.add_argument(
        "--root-folder-id",
        required=True,
        help="Drive folder ID whose sub-folders are the per-year photo folders.",
    )
    parser.add_argument("--client-secret", default=config.DEFAULT_CLIENT_SECRET)
    parser.add_argument("--token-file", default=config.DEFAULT_TOKEN_FILE)
    parser.add_argument("--manifest", default=config.DEFAULT_MANIFEST)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List and download+stamp photos but do NOT upload. Nothing is written to Photos.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Stop after N uploads (0 = no limit). Handy for a first test run.",
    )
    parser.add_argument(
        "--only-year",
        default=None,
        help="Only process folders whose name contains this string (e.g. '2003').",
    )
    return parser


def run(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    clients = auth.get_clients(args.client_secret, args.token_file)
    manifest = Manifest.load(args.manifest)

    folders = drive.list_child_folders(clients.drive, args.root_folder_id)
    if args.only_year:
        folders = [f for f in folders if args.only_year in f.name]
    folders.sort(key=lambda f: f.name)

    if not folders:
        print("No sub-folders found under the given root folder.", file=sys.stderr)
        return 1

    print(f"Found {len(folders)} folder(s): {', '.join(f.name for f in folders)}")
    if args.dry_run:
        print("DRY RUN -- no photos will be uploaded.\n")

    uploaded = 0
    skipped = 0
    failed = 0

    for folder in folders:
        print(f"\n== {folder.name} ==")
        for file in drive.list_images_in_folder(clients.drive, folder):
            if manifest.is_done(file.id):
                skipped += 1
                continue

            data = drive.download_bytes(clients.drive, file)
            data, stamped = exif.stamp_if_needed(data, file)
            tag = " [stamped]" if stamped else ""

            if args.dry_run:
                print(f"  would upload: {file.name}{tag}")
                continue

            result = photos.upload(
                clients.photos,
                data,
                filename=file.name,
                description=f"Migrated from Drive/{folder.name}",
            )
            if result.ok:
                manifest.record(file.id, file.name, result.media_item_id, "uploaded")
                manifest.save()
                uploaded += 1
                print(f"  uploaded: {file.name}{tag}")
            else:
                manifest.record(file.id, file.name, None, "failed")
                manifest.save()
                failed += 1
                print(f"  FAILED:  {file.name} -- {result.error}", file=sys.stderr)

            if args.limit and uploaded >= args.limit:
                print(f"\nReached --limit of {args.limit}.")
                _summary(uploaded, skipped, failed, manifest)
                return 0

    _summary(uploaded, skipped, failed, manifest)
    return 0 if failed == 0 else 2


def _summary(uploaded: int, skipped: int, failed: int, manifest: Manifest) -> None:
    print("\n--- summary ---")
    print(f"uploaded this run: {uploaded}")
    print(f"skipped (already done): {skipped}")
    print(f"failed: {failed}")
    print(f"total uploaded (all runs): {manifest.uploaded_count}")


if __name__ == "__main__":
    raise SystemExit(run())
