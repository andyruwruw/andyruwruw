/**
 * Configuration, OAuth scopes, and shared constants.
 *
 * Scopes:
 * - drive.readonly            list folders and download files (never modifies Drive)
 * - photoslibrary.appendonly  upload new media items. Post-2025 the Photos API
 *   only lets an app see media it created, but uploads still land in the real
 *   library -- a migration only ever uploads, so this is least-privilege.
 */
import * as path from "path";

export const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/photoslibrary.appendonly",
];

export const BASE_DIR = path.resolve(__dirname, "..");

export const CLIENT_SECRET = process.env.PM_CLIENT_SECRET || path.join(BASE_DIR, "credentials.json");
export const TOKEN_FILE = process.env.PM_TOKEN_FILE || path.join(BASE_DIR, "token.json");
export const DB_PATH = process.env.PM_DB_PATH || path.join(BASE_DIR, "photo_migration.db");
export const FRONTEND_DIR = path.join(BASE_DIR, "frontend");

export const HOST = process.env.PM_HOST || "127.0.0.1";
export const PORT = parseInt(process.env.PM_PORT || "8000", 10);

export const IMAGE_MIME_PREFIXES = ["image/"];

export const PHOTOS_UPLOAD_URL = "https://photoslibrary.googleapis.com/v1/uploads";
export const PHOTOS_BATCH_CREATE_URL =
  "https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate";

// When a folder's year is known but a photo has no EXIF date, this is the
// month/day/time stamped onto it (only the year varies per folder).
export const DEFAULT_MONTH = 1; // 1-12
export const DEFAULT_DAY = 1;
export const DEFAULT_HOUR = 12;
