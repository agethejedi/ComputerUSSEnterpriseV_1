/**
 * Tania Agent — REST API
 * Mount this under /api/tania in your JARVIS Express app.
 *
 * Routes:
 *   GET  /api/tania/queue          — all queue items
 *   POST /api/tania/generate       — trigger a pipeline run
 *   POST /api/tania/queue/:id/approve
 *   POST /api/tania/queue/:id/reject
 *   GET  /api/tania/config         — current pace/config
 *   POST /api/tania/config         — update pace
 */

import { Router } from "express";
import { runTaniaPipeline } from "./index.js";
import { getAllItems, approveItem, rejectItem } from "./services/queue.js";
import { setPace, getConfig } from "./scheduler.js";
import { logger } from "./utils/logger.js";

const router = Router();

// Simple auth middleware — reads TANIA_API_SECRET from env
router.use((req, res, next) => {
  const secret = process.env.TANIA_API_SECRET;
  if (!secret) return next(); // No secret set → open (dev mode)
  const provided = req.headers["x-tania-secret"] ?? req.query.secret;
  if (provided !== secret) return res.status(401).json({ error: "Unauthorized" });
  next();
});

// ── Queue ─────────────────────────────────────────────────────────────────────

router.get("/queue", async (req, res) => {
  try {
    const items = await getAllItems();
    res.json({ items });
  } catch (err) {
    logger.error("[Tania API] GET /queue", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/queue/:id/approve", async (req, res) => {
  try {
    const item = await approveItem(req.params.id, { scheduledFor: req.body.scheduledFor });
    res.json({ ok: true, item });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.post("/queue/:id/reject", async (req, res) => {
  try {
    const item = await rejectItem(req.params.id, { reason: req.body.reason });
    res.json({ ok: true, item });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// ── Generate ─────────────────────────────────────────────────────────────────

router.post("/generate", async (req, res) => {
  const { theme = "supra_nights", visualStyle = "cinematic_rain", extraContext = "" } = req.body;
  try {
    // Fire async, return immediately with jobId
    const result = await runTaniaPipeline({ theme, visualStyle, extraContext });
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error("[Tania API] POST /generate", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Config / Pace ─────────────────────────────────────────────────────────────

router.get("/config", (req, res) => {
  res.json(getConfig());
});

router.post("/config", (req, res) => {
  const { postsPerWeek } = req.body;
  if (typeof postsPerWeek !== "number") {
    return res.status(400).json({ error: "postsPerWeek must be a number" });
  }
  setPace(postsPerWeek);
  res.json({ ok: true, config: getConfig() });
});

export default router;
