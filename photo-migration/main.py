#!/usr/bin/env python3
"""Entry point: `python main.py --root-folder-id <id> [--dry-run]`."""

from migrate.cli import run

if __name__ == "__main__":
    raise SystemExit(run())
