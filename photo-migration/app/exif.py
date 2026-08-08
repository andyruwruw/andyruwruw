"""EXIF date/location stamping.

Google Photos has NO API field for a photo's date or GPS location; on upload
it reads both from the file's embedded EXIF (date <- DateTimeOriginal, falling
back to upload time; location <- GPS tags). So to "set date/location" we write
them into the JPEG bytes before uploading.

We only ever *fill in* missing metadata -- a real date/GPS the camera already
recorded is never overwritten.
"""

from __future__ import annotations

import io
from datetime import datetime
from typing import Optional, Tuple

import piexif
from PIL import Image

from . import config


def _has_datetime(exif: dict) -> bool:
    return bool(exif.get("Exif", {}).get(piexif.ExifIFD.DateTimeOriginal))


def _has_gps(exif: dict) -> bool:
    return bool(exif.get("GPS"))


def _deg_to_dms_rational(deg: float) -> tuple:
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


def _is_jpeg(name: str, mime: str) -> bool:
    return mime == "image/jpeg" or name.lower().endswith((".jpg", ".jpeg"))


def stamp_if_needed(
    data: bytes,
    name: str,
    mime: str,
    year: Optional[int],
    coords: Optional[Tuple[float, float]],
) -> Tuple[bytes, bool]:
    """Return (possibly-modified bytes, changed?).

    ``year``   -> if set and the photo has no EXIF date, stamp
                  <year>-<DEFAULT_MONTH>-<DEFAULT_DAY> at DEFAULT_HOUR.
    ``coords`` -> if set and the photo has no EXIF GPS, stamp the coordinates.

    Only JPEG carries EXIF here (piexif limitation); other formats pass through
    unchanged.
    """
    if year is None and coords is None:
        return data, False
    if not _is_jpeg(name, mime):
        return data, False

    try:
        exif = piexif.load(data)
    except Exception:
        exif = {"0th": {}, "Exif": {}, "GPS": {}, "1st": {}, "thumbnail": None}

    changed = False

    if year is not None and not _has_datetime(exif):
        when = datetime(year, config.DEFAULT_MONTH, config.DEFAULT_DAY, config.DEFAULT_HOUR, 0, 0)
        stamp = when.strftime("%Y:%m:%d %H:%M:%S")
        exif.setdefault("Exif", {})
        exif["Exif"][piexif.ExifIFD.DateTimeOriginal] = stamp
        exif["Exif"][piexif.ExifIFD.DateTimeDigitized] = stamp
        exif.setdefault("0th", {})
        exif["0th"][piexif.ImageIFD.DateTime] = stamp
        changed = True

    if coords is not None and not _has_gps(exif):
        exif["GPS"] = _build_gps_ifd(coords[0], coords[1])
        changed = True

    if not changed:
        return data, False

    exif_bytes = piexif.dump(exif)
    image = Image.open(io.BytesIO(data))
    out = io.BytesIO()
    image.save(out, format="jpeg", exif=exif_bytes, quality="keep")
    return out.getvalue(), True
