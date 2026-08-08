/**
 * Scan + resolve: turn a Drive folder tree into persisted photo tasks.
 *
 * This is the "define the tasks and save them" phase. It never downloads photo
 * bytes -- only lists metadata -- so planning a large library is fast and safe
 * to re-run (rows are upserted).
 *
 * Year resolution uses only the folder name. A confident year -> photos become
 * `ready`. Otherwise a blocking year question is filed and photos wait in
 * `needs_review`. A non-blocking location question is always offered per folder.
 */
import { Clients } from "./auth";
import * as db from "./db";
import * as drive from "./drive";

const YEAR_RE = /(?<!\d)(19|20)\d{2}(?!\d)/;

export function parseYear(folderName: string): number | null {
  const m = YEAR_RE.exec(folderName || "");
  return m ? parseInt(m[0], 10) : null;
}

export async function scanJob(
  clients: Clients,
  jobId: number,
  rootFolderId: string
): Promise<void> {
  db.setJobStatus(jobId, "scanning");
  try {
    const folders = await drive.listChildFolders(clients.drive, rootFolderId);
    for (const folder of folders) {
      const folderId = db.upsertFolder(jobId, folder.id, folder.name);

      const year = parseYear(folder.name);
      let itemStatus: string;
      if (year !== null) {
        db.setFolderYear(folderId, year, "confident");
        itemStatus = "ready";
      } else {
        db.setFolderYear(folderId, null, "unknown");
        db.upsertQuestion(
          jobId,
          folderId,
          "year",
          `What year were the photos in "${folder.name}" taken?`,
          true
        );
        itemStatus = "needs_review";
      }

      // Location is always optional -- never blocks an upload.
      db.upsertQuestion(
        jobId,
        folderId,
        "location",
        `Optional: where were the photos in "${folder.name}" taken? (latitude/longitude, or mark none)`,
        false
      );

      const images = await drive.listImagesInFolder(clients.drive, folder);
      for (const image of images) {
        db.upsertItem(jobId, folderId, image.id, image.name, image.mimeType, itemStatus);
      }
    }
    db.setJobStatus(jobId, "scanned");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    db.setJobStatus(jobId, "failed", `scan failed: ${msg}`);
    throw err;
  }
}
