/**
 * End-to-end test. Google is faked at its real seams — a stub `clients.drive`
 * (so the real drive.ts runs) and an axios adapter for the Photos HTTP (so the
 * real photos.ts runs) — not by monkeypatching modules. Exercises scan/resolve,
 * question generation, answering, the resumable worker, EXIF stamping, and
 * idempotency. Run: npx tsx scripts/e2e.ts
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pm-"));
process.env.PM_DB_PATH = path.join(tmp, "test.db");

import axios from "axios";
import piexif from "piexifjs";
import * as config from "../src/config";
import * as db from "../src/db";
import * as planner from "../src/planner";
import * as answers from "../src/answers";
import * as exif from "../src/exif";
import * as worker from "../src/worker";
import { _setTestClients, Clients } from "../src/auth";
import { DriveFile } from "../src/types";

let failures = 0;
function check(cond: boolean, msg: string): void {
  process.stdout.write((cond ? "  ok  " : " FAIL ") + msg + "\n");
  if (!cond) failures++;
}

const JPEG_1x1 = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof" +
    "Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAAB" +
    "AAAAAAAAAAAAAAAAAAAAAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AfwD/2Q==",
  "base64"
);

const FOLDERS: DriveFile[] = [
  { id: "fld_2003", name: "2003", mimeType: "application/vnd.google-apps.folder", parentName: "" },
  { id: "fld_misc", name: "Misc Trip", mimeType: "application/vnd.google-apps.folder", parentName: "" },
];
const IMAGES: Record<string, DriveFile[]> = {
  fld_2003: [
    { id: "img_a", name: "a.jpg", mimeType: "image/jpeg", parentName: "2003" },
    { id: "img_b", name: "b.jpg", mimeType: "image/jpeg", parentName: "2003" },
  ],
  fld_misc: [
    { id: "img_c", name: "c.jpg", mimeType: "image/jpeg", parentName: "Misc Trip" },
    { id: "img_d", name: "d.jpg", mimeType: "image/jpeg", parentName: "Misc Trip" },
  ],
};

// Fake googleapis Drive: the REAL drive.ts calls these.
const driveStub = {
  files: {
    list: async (params: { q: string }) => {
      if (params.q.includes("application/vnd.google-apps.folder")) {
        return { data: { files: FOLDERS } };
      }
      const folder = FOLDERS.find((f) => params.q.includes(`'${f.id}' in parents`))!;
      return { data: { files: IMAGES[folder.id] } };
    },
    get: async () => ({ data: JPEG_1x1 }),
  },
};

const oauthStub = { getAccessToken: async () => ({ token: "test-token" }) };
const fakeClients = { drive: driveStub, oauth: oauthStub } as unknown as Clients;

// Fake Photos HTTP at the axios layer: the REAL photos.ts runs.
const uploads: string[] = [];
axios.defaults.adapter = async (cfg: any) => {
  const base = { status: 200, statusText: "OK", headers: {}, config: cfg };
  if (cfg.url === config.PHOTOS_UPLOAD_URL) return { ...base, data: "upload-token-123" };
  if (cfg.url === config.PHOTOS_BATCH_CREATE_URL) {
    const body = JSON.parse(cfg.data);
    const name = body.newMediaItems[0].simpleMediaItem.fileName;
    uploads.push(name);
    return { ...base, data: { newMediaItemResults: [{ status: {}, mediaItem: { id: "media_" + name } }] } };
  }
  throw new Error("unexpected URL " + cfg.url);
};

_setTestClients(fakeClients);

function settle(jobId: number): Promise<void> {
  worker.start(jobId);
  return new Promise((resolve, reject) => {
    let n = 0;
    const t = setInterval(() => {
      if (!worker.isRunning(jobId)) {
        clearInterval(t);
        resolve();
      } else if (++n > 400) {
        clearInterval(t);
        reject(new Error("worker did not settle"));
      }
    }, 25);
  });
}

async function main(): Promise<void> {
  db.initDb();

  // 1. Create + scan
  const job = db.createJob("Dad photos", "root123");
  await planner.scanJob(fakeClients, job.id, "root123");

  const counts = db.statusCounts(job.id);
  check(counts.ready === 2, `2 confident-year items ready (got ${counts.ready})`);
  check(counts.needs_review === 2, `2 items need review (got ${counts.needs_review})`);

  const qs = db.listQuestions(job.id, "open");
  const years = qs.filter((q) => q.kind === "year");
  const locs = qs.filter((q) => q.kind === "location");
  check(years.length === 1 && years[0].blocking === 1, "1 blocking year question");
  check(locs.length === 2 && locs.every((q) => q.blocking === 0), "2 non-blocking location questions");

  // 2. First worker run: only the 2 ready items upload
  await settle(job.id);
  check(db.statusCounts(job.id).uploaded === 2, "2 uploaded after first run");
  check(db.getJob(job.id)!.status === "waiting_for_input", "job waits for input");

  // 3. Answer the year question -> promote items, then resume
  const res = answers.applyAnswer(years[0].id, { year: 1999 });
  check(res.promoted_items === 2, "answering year promoted 2 items to ready");
  await settle(job.id);
  check(db.statusCounts(job.id).uploaded === 4, "all 4 uploaded after resume");
  check(db.getJob(job.id)!.status === "completed", "job completed");

  // 4. Idempotency
  const before = uploads.length;
  await settle(job.id);
  check(uploads.length === before, "re-running uploads nothing (idempotent)");

  // 5. Location answer stored
  answers.applyAnswer(locs[0].id, { lat: 40.71, lng: -74.0 });
  const fld = db.getFolder(locs[0].folder_id)!;
  check(Math.abs((fld.resolved_lat as number) - 40.71) < 1e-6, "location stored on folder");

  // 6. Crash recovery
  const anItem = db.listItems(job.id, "uploaded", 1, 0)[0];
  db.setItemStatus(anItem.id, "uploading");
  const n = db.resetStuckItems(job.id);
  check(n === 1 && db.listItems(job.id, "ready", 10, 0).length === 1, "stuck item reset to ready");

  // 7. EXIF stamping writes date + GPS (real function)
  const { buffer, changed } = exif.stampIfNeeded(Buffer.from(JPEG_1x1), "x.jpg", "image/jpeg", 1988, [12.5, -8.0]);
  check(changed, "exif reported a change");
  const loaded = piexif.load(buffer.toString("binary"));
  const dt = String(loaded.Exif[piexif.ExifIFD.DateTimeOriginal]);
  check(dt.startsWith("1988:01:01"), `date stamped as 1988 (got ${dt})`);
  check(Object.keys(loaded.GPS).length > 0, "GPS stamped");

  process.stdout.write(failures ? `\n${failures} CHECK(S) FAILED\n` : "\nALL CHECKS PASSED\n");
  process.exit(failures ? 1 : 0);
}

void main();
