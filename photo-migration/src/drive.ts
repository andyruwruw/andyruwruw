/** Google Drive listing and downloading. */
import type { drive_v3 } from "googleapis";
import * as config from "./config";
import { DriveFile } from "./types";

const FOLDER_MIME = "application/vnd.google-apps.folder";

/** Escape single quotes/backslashes for Drive query literals. */
function esc(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export async function listChildFolders(
  drive: drive_v3.Drive,
  parentId: string
): Promise<DriveFile[]> {
  const folders: DriveFile[] = [];
  let pageToken: string | undefined;
  const q = `'${esc(parentId)}' in parents and mimeType = '${FOLDER_MIME}' and trashed = false`;
  do {
    const res = await drive.files.list({
      q,
      fields: "nextPageToken, files(id, name, mimeType)",
      pageSize: 100,
      pageToken,
    });
    for (const f of res.data.files || []) {
      folders.push({ id: f.id!, name: f.name!, mimeType: f.mimeType!, parentName: "" });
    }
    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);
  return folders;
}

export async function listImagesInFolder(
  drive: drive_v3.Drive,
  folder: DriveFile
): Promise<DriveFile[]> {
  const images: DriveFile[] = [];
  let pageToken: string | undefined;
  const q = `'${esc(folder.id)}' in parents and trashed = false`;
  do {
    const res = await drive.files.list({
      q,
      fields: "nextPageToken, files(id, name, mimeType)",
      pageSize: 100,
      pageToken,
    });
    for (const f of res.data.files || []) {
      const mime = f.mimeType || "";
      if (config.IMAGE_MIME_PREFIXES.some((p) => mime.startsWith(p))) {
        images.push({ id: f.id!, name: f.name!, mimeType: mime, parentName: folder.name });
      }
    }
    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);
  return images;
}

export async function downloadBytes(drive: drive_v3.Drive, file: DriveFile): Promise<Buffer> {
  const res = await drive.files.get(
    { fileId: file.id, alt: "media" },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data as ArrayBuffer);
}
