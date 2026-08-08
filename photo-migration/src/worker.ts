/**
 * Background execution: stoppable, resumable, idempotent.
 *
 * Node is single-threaded, so a job runs as an async loop rather than a thread.
 * State lives entirely in SQLite and every item's status is committed the moment
 * it changes, so:
 *
 * - Stop  -> flip the job to 'paused'; the loop notices between items and exits.
 *   Whatever was uploaded stays uploaded.
 * - Resume / rerun from same state -> start again; the loop reads the DB, resets
 *   any item caught mid-flight, and continues with the remaining 'ready' items.
 *   Uploaded items are skipped (never re-uploaded).
 *
 * The loop only processes 'ready' items; 'needs_review' items wait for a
 * question to be answered (which promotes them to 'ready').
 */
import { Clients, getClients } from "./auth";
import * as db from "./db";
import * as drive from "./drive";
import * as exif from "./exif";
import * as photos from "./photos";
import { Folder, Item } from "./types";

interface Control {
  stop: boolean;
}

const workers = new Map<number, Control>();

export function isRunning(jobId: number): boolean {
  return workers.has(jobId);
}

export function requestPause(jobId: number): void {
  const control = workers.get(jobId);
  if (control) control.stop = true;
  db.setJobStatus(jobId, "paused");
}

/** Start (or resume) a job's worker. Returns false if already running. */
export function start(jobId: number): boolean {
  if (workers.has(jobId)) return false;
  const control: Control = { stop: false };
  workers.set(jobId, control);
  // Fire-and-forget; the loop cleans itself up in `finally`.
  void run(jobId, control);
  return true;
}

async function processItem(clients: Clients, item: Item, folder: Folder): Promise<void> {
  db.setItemStatus(item.id, "uploading");

  const data = await drive.downloadBytes(clients.drive, {
    id: item.drive_id,
    name: item.name,
    mimeType: item.mime_type,
    parentName: folder.name,
  });

  const coords: [number, number] | null =
    folder.resolved_lat !== null && folder.resolved_lng !== null
      ? [folder.resolved_lat, folder.resolved_lng]
      : null;

  const { buffer, changed } = exif.stampIfNeeded(
    data,
    item.name,
    item.mime_type,
    folder.resolved_year,
    coords
  );

  const result = await photos.upload(
    clients.oauth,
    buffer,
    item.name,
    `Migrated from Drive/${folder.name}`
  );

  if (result.ok) {
    db.setItemStatus(item.id, "uploaded", { mediaItemId: result.mediaItemId, stamped: changed });
  } else {
    db.setItemStatus(item.id, "failed", { error: result.error, stamped: changed });
  }
}

async function run(jobId: number, control: Control): Promise<void> {
  try {
    db.resetStuckItems(jobId);
    db.setJobStatus(jobId, "running");

    let clients: Clients;
    try {
      clients = await getClients();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      db.setJobStatus(jobId, "failed", `auth failed: ${msg}`);
      return;
    }

    while (!control.stop) {
      const item = db.nextReadyItem(jobId);
      if (!item) break;
      const folder = db.getFolder(item.folder_id)!;
      try {
        await processItem(clients, item, folder);
      } catch (err: unknown) {
        // One bad photo shouldn't kill the run.
        const msg = err instanceof Error ? err.message : String(err);
        db.setItemStatus(item.id, "failed", { error: msg });
      }
    }

    if (control.stop) {
      db.setJobStatus(jobId, "paused");
    } else if (db.countNeedsReview(jobId) > 0) {
      db.setJobStatus(jobId, "waiting_for_input", "Answer open questions to continue.");
    } else {
      db.setJobStatus(jobId, "completed");
    }
  } finally {
    workers.delete(jobId);
  }
}
