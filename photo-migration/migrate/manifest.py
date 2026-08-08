"""Resumable upload ledger.

The Google Photos API can't tell us whether a photo already exists in the
library (post-2025 it only reports items our app created). To avoid
creating duplicates on re-runs, we keep our own record keyed by Drive
file ID.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from typing import Dict


@dataclass
class Manifest:
    path: str
    # drive_file_id -> record ({"name", "media_item_id", "status"})
    entries: Dict[str, dict] = field(default_factory=dict)

    @classmethod
    def load(cls, path: str) -> "Manifest":
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as handle:
                data = json.load(handle)
            return cls(path=path, entries=data.get("entries", {}))
        return cls(path=path)

    def is_done(self, drive_file_id: str) -> bool:
        rec = self.entries.get(drive_file_id)
        return bool(rec and rec.get("status") == "uploaded")

    def record(self, drive_file_id: str, name: str, media_item_id: str | None, status: str) -> None:
        self.entries[drive_file_id] = {
            "name": name,
            "media_item_id": media_item_id,
            "status": status,
        }

    def save(self) -> None:
        tmp = f"{self.path}.tmp"
        with open(tmp, "w", encoding="utf-8") as handle:
            json.dump({"entries": self.entries}, handle, indent=2)
        os.replace(tmp, self.path)

    @property
    def uploaded_count(self) -> int:
        return sum(1 for r in self.entries.values() if r.get("status") == "uploaded")
