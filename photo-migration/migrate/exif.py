"""EXIF date/location stamping.

This is the module you'll customize once you decide your exact rules.

WHY EXIF (and not the Photos API):
    Google Photos has NO API field for a photo's date or GPS location.
    On upload it reads those from the file's embedded EXIF:
      - date     <- EXIF DateTimeOriginal   (falls back to upload time)
      - location <- EXIF GPS tags
    So to "set date/location", we must write them into the JPEG bytes
    before uploading. That is exactly what this module does.

The two functions marked `HOOK` below are the decision points:
    * decide_datetime() -- what timestamp should a photo get?
    * decide_gps()      -- what coordinates (if any) should it get?

They currently implement a sensible default (derive a year from the
folder name, no location) but are deliberately isolated so you can wire
in whatever logic you want -- a CSV lookup, per-folder overrides, etc.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Optional, Tuple

import piexif
from PIL import Image
import io

from .drive import DriveFile

# A photo is only re-stamped when it lacks the metadata; we never
# overwrite a real EXIF date/location the camera already recorded.


# --------------------------------------------------------------------------- #
# HOOK 1: choose a date for a photo that has none.
# --------------------------------------------------------------------------- #
def decide_datetime(file: DriveFile) -> Optional[datetime]:
    """Return the datetime to stamp, or None to leave the date untouched.

    Default behavior: if the parent folder name contains a 4-digit year,
    stamp January 1st of that year at noon. Otherwise leave it alone.

    Customize this to, e.g., parse the filename, read a lookup table, or
    map specific folders to specific dates.
    """
    match = re.search(r"(19|20)\d{2}", file.parent_name or "")
    if not match:
        return None
    year = int(match.group(0))
    return datetime(year, 1, 1, 12, 0, 0)


# --------------------------------------------------------------------------- #
# HOOK 2: choose GPS coordinates for a photo.
# --------------------------------------------------------------------------- #
def decide_gps(file: DriveFile) -> Optional[Tuple[float, float]]:
    """Return (latitude, longitude) to stamp, or None for no location.

    Default behavior: no location. Fill this in with your own mapping
    (e.g. per-folder coordinates from a CSV/JSON you maintain).
    """
    return None


# --------------------------------------------------------------------------- #
# EXIF read/write plumbing (you shouldn't need to touch below here).
# --------------------------------------------------------------------------- #
def _has_datetime(exif: dict) -> bool:
    exif_ifd = exif.get("Exif", {})
    return bool(exif_ifd.get(piexif.ExifIFD.DateTimeOriginal))


def _has_gps(exif: dict) -> bool:
    return bool(exif.get("GPS"))


def _deg_to_dms_rational(deg: float) -> tuple:
    """Convert decimal degrees to EXIF (deg, min, sec) rational tuples."""
    deg = abs(deg)
    d = int(deg)
    m_full = (deg - d) * 60
    m = int(m_full)
    s = round((m_full - m) * 60 * 10000)
    return ((d, 1), (m, 1), (s, 10000))


def _build_gps_ifd(lat: float, lon: float) -> dict:
    return {
        piexif.GPSIFD.GPSLatitudeRef: "N" if lat >= 0 else "S",
        piexif.GPSIFD.GPSLatitude: _deg_to_dms_rational(lat),
        piexif.GPSIFD.GPSLongitudeRef: "E" if lon >= 0 else "W",
        piexif.GPSIFD.GPSLongitude: _deg_to_dms_rational(lon),
    }


def stamp_if_needed(data: bytes, file: DriveFile) -> Tuple[bytes, bool]:
    """Return (possibly-modified bytes, changed?).

    Only JPEG carries EXIF here (piexif limitation). Non-JPEG images are
    passed through unchanged; upload them as-is or convert upstream if you
    need metadata on them.
    """
    if not (file.mime_type == "image/jpeg" or file.name.lower().endswith((".jpg", ".jpeg"))):
        return data, False

    try:
        exif = piexif.load(data)
    except Exception:
        # No/……corrupt EXIF -- start a fresh dict.
        exif = {"0th": {}, "Exif": {}, "GPS": {}, "1st": {}, "thumbnail": None}

    changed = False

    if not _has_datetime(exif):
        when = decide_datetime(file)
        if when is not None:
            stamp = when.strftime("%Y:%m:%d %H:%M:%S")
            exif.setdefault("Exif", {})
            exif["Exif"][piexif.ExifIFD.DateTimeOriginal] = stamp
            exif["Exif"][piexif.ExifIFD.DateTimeDigitized] = stamp
            exif.setdefault("0th", {})
            exif["0th"][piexif.ImageIFD.DateTime] = stamp
            changed = True

    if not _has_gps(exif):
        coords = decide_gps(file)
        if coords is not None:
            lat, lon = coords
            exif["GPS"] = _build_gps_ifd(lat, lon)
            changed = True

    if not changed:
        return data, False

    exif_bytes = piexif.dump(exif)
    # Re-encode with the new EXIF block. Pillow keeps pixel data intact.
    image = Image.open(io.BytesIO(data))
    out = io.BytesIO()
    image.save(out, format="jpeg", exif=exif_bytes, quality="keep")
    return out.getvalue(), True
