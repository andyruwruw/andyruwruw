/**
 * REST API + static frontend host.
 *
 * One Express app serves JSON endpoints under /api/* and the static progress UI
 * at / (from ../frontend). Long operations (scan, execute) run detached so the
 * HTTP calls return immediately; the UI polls the progress endpoints.
 */
import express, { NextFunction, Request, Response } from "express";
import { AnswerError, applyAnswer } from "./answers";
import { getClients } from "./auth";
import * as config from "./config";
import * as db from "./db";
import * as planner from "./planner";
import * as worker from "./worker";

export function createApp(): express.Express {
  const app = express();
  app.use(express.json());

  const api = express.Router();

  api.get("/health", (_req, res) => res.json({ ok: true }));

  /* ----------------------------------------------------------------- Jobs */
  api.get("/jobs", (_req, res) => res.json(db.listJobs()));

  api.post("/jobs", (req, res) => {
    const { name, root_folder_id } = req.body || {};
    if (!name || !root_folder_id) {
      return res.status(400).json({ detail: "name and root_folder_id are required" });
    }
    res.json(db.createJob(String(name), String(root_folder_id)));
  });

  api.get("/jobs/:id", (req, res) => {
    const job = requireJob(req, res);
    if (!job) return;
    const counts = db.statusCounts(job.id);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const open = db.listQuestions(job.id, "open");
    res.json({
      job,
      running: worker.isRunning(job.id),
      counts,
      total_items: total,
      uploaded: counts.uploaded || 0,
      failed: counts.failed || 0,
      needs_review: counts.needs_review || 0,
      open_questions: open.length,
      blocking_questions: open.filter((q) => q.blocking).length,
    });
  });

  api.post("/jobs/:id/scan", (req, res) => {
    const job = requireJob(req, res);
    if (!job) return;
    if (job.status === "scanning") {
      return res.status(409).json({ detail: "scan already in progress" });
    }
    // Detached: authenticate + walk Drive in the background.
    void (async () => {
      try {
        const clients = await getClients();
        await planner.scanJob(clients, job.id, job.root_folder_id);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        db.setJobStatus(job.id, "failed", `scan failed: ${msg}`);
      }
    })();
    res.json({ status: "scanning" });
  });

  api.post("/jobs/:id/start", (req, res) => {
    const job = requireJob(req, res);
    if (!job) return;
    if (!worker.start(job.id)) {
      return res.status(409).json({ detail: "job already running" });
    }
    res.json({ status: "running" });
  });

  api.post("/jobs/:id/pause", (req, res) => {
    const job = requireJob(req, res);
    if (!job) return;
    worker.requestPause(job.id);
    res.json({ status: "pausing" });
  });

  api.get("/jobs/:id/items", (req, res) => {
    const job = requireJob(req, res);
    if (!job) return;
    const status = req.query.status ? String(req.query.status) : undefined;
    const limit = Math.min(parseInt(String(req.query.limit || "100"), 10) || 100, 500);
    const offset = parseInt(String(req.query.offset || "0"), 10) || 0;
    res.json(db.listItems(job.id, status, limit, offset));
  });

  api.get("/jobs/:id/questions", (req, res) => {
    const job = requireJob(req, res);
    if (!job) return;
    const status = req.query.status ? String(req.query.status) : "open";
    res.json(db.listQuestions(job.id, status));
  });

  /* ------------------------------------------------------------ Questions */
  api.post("/questions/:id/answer", (req, res) => {
    const questionId = parseInt(req.params.id, 10);
    try {
      res.json(applyAnswer(questionId, req.body || {}));
    } catch (err: unknown) {
      if (err instanceof AnswerError) {
        return res.status(400).json({ detail: err.message });
      }
      throw err;
    }
  });

  app.use("/api", api);

  // Static frontend (mounted after /api so the API always wins).
  app.use(express.static(config.FRONTEND_DIR, { extensions: ["html"] }));

  // JSON 500 fallback.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ detail: msg });
  });

  return app;
}

function requireJob(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  const job = db.getJob(id);
  if (!job) {
    res.status(404).json({ detail: "job not found" });
    return undefined;
  }
  return job;
}
