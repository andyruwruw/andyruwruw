/**
 * EXIF date/location stamping.
 *
 * Google Photos has NO API field for a photo's date or GPS location; on upload
 * it reads both from the file's embedded EXIF (date <- DateTimeOriginal, else
 * upload time; location <- GPS tags). So to "set date/location" we write them
 * into the JPEG bytes before uploading. We only fill in what's missing -- a
 * real date/GPS the camera already recorded is never overwritten.
 *
 * piexifjs operates on binary strings, so we bridge Buffer <-> "binary" here.
 */
import piexif, { ExifDict } from "piexifjs";
import * as config from "./config";

function isJpeg(name: string, mime: string): boolean {
  return mime === "image/jpeg" || /\.jpe?g$/i.test(name);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function hasDateTime(exif: ExifDict): boolean {
  return Boolean(exif.Exif && exif.Exif[piexif.ExifIFD.DateTimeOriginal]);
}

function hasGps(exif: ExifDict): boolean {
  return Boolean(exif.GPS && Object.keys(exif.GPS).length > 0);
}

function emptyExif(): ExifDict {
  return { "0th": {}, Exif: {}, GPS: {}, "1st": {}, thumbnail: null };
}

export interface StampResult {
  buffer: Buffer;
  changed: boolean;
}

export function stampIfNeeded(
  data: Buffer,
  name: string,
  mime: string,
  year: number | null,
  coords: [number, number] | null
): StampResult {
  if (year === null && coords === null) return { buffer: data, changed: false };
  if (!isJpeg(name, mime)) return { buffer: data, changed: false };

  const binary = data.toString("binary");

  let exif: ExifDict;
  try {
    exif = piexif.load(binary);
  } catch {
    exif = emptyExif();
  }
  if (!exif.Exif) exif.Exif = {};
  if (!exif["0th"]) exif["0th"] = {};
  if (!exif.GPS) exif.GPS = {};

  let changed = false;

  if (year !== null && !hasDateTime(exif)) {
    const stamp =
      `${year}:${pad(config.DEFAULT_MONTH)}:${pad(config.DEFAULT_DAY)} ` +
      `${pad(config.DEFAULT_HOUR)}:00:00`;
    exif.Exif[piexif.ExifIFD.DateTimeOriginal] = stamp;
    exif.Exif[piexif.ExifIFD.DateTimeDigitized] = stamp;
    exif["0th"][piexif.ImageIFD.DateTime] = stamp;
    changed = true;
  }

  if (coords !== null && !hasGps(exif)) {
    const [lat, lng] = coords;
    exif.GPS[piexif.GPSIFD.GPSLatitudeRef] = lat >= 0 ? "N" : "S";
    exif.GPS[piexif.GPSIFD.GPSLatitude] = piexif.GPSHelper.degToDmsRational(Math.abs(lat));
    exif.GPS[piexif.GPSIFD.GPSLongitudeRef] = lng >= 0 ? "E" : "W";
    exif.GPS[piexif.GPSIFD.GPSLongitude] = piexif.GPSHelper.degToDmsRational(Math.abs(lng));
    changed = true;
  }

  if (!changed) return { buffer: data, changed: false };

  const exifBytes = piexif.dump(exif);
  const newBinary = piexif.insert(exifBytes, binary);
  return { buffer: Buffer.from(newBinary, "binary"), changed: true };
}
