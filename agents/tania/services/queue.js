/**
 * Tania Agent — Approval Queue
 *
 * Stores generated content in a simple JSON queue on disk (Railway volume)
 * until Ron approves or rejects it via the control panel.
 *
 * For production: swap the JSON file for a Postgres/Redis store.
 */

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const QUEUE_PATH = process.env.TANIA_QUEUE_PATH ?? path.join(process.cwd(), "data", "tania_queue.json");

async function readQueue() {
  try {
    const raw = await fs.readFile(QUEUE_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeQueue(queue) {
  await fs.mkdir(path.dirname(QUEUE_PATH), { recursive: true });
  await fs.writeFile(QUEUE_PATH, JSON.stringify(queue, null, 2), "utf8");
}

/**
 * Add a generated video to the approval queue.
 */
export async function queueForApproval({ jobId, theme, visualStyle, script, caption, videoUrl }) {
  const queue = await readQueue();
  const entry = {
    id: crypto.randomUUID(),
    jobId,
    theme,
    visualStyle,
    script,
    caption,
    videoUrl,
    status: "pending_approval",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  queue.push(entry);
  await writeQueue(queue);
  return entry;
}

/**
 * Get all pending items (for the control panel to display).
 */
export async function getPendingItems() {
  const queue = await readQueue();
  return queue.filter((e) => e.status === "pending_approval");
}

/**
 * Get all queue items.
 */
export async function getAllItems() {
  return readQueue();
}

/**
 * Approve an item — marks it ready for posting.
 */
export async function approveItem(id, { scheduledFor } = {}) {
  const queue = await readQueue();
  const item = queue.find((e) => e.id === id);
  if (!item) throw new Error(`Queue item ${id} not found`);
  item.status = "approved";
  item.scheduledFor = scheduledFor ?? null;
  item.updatedAt = new Date().toISOString();
  await writeQueue(queue);
  return item;
}

/**
 * Reject an item — removes it from the active queue.
 */
export async function rejectItem(id, { reason } = {}) {
  const queue = await readQueue();
  const item = queue.find((e) => e.id === id);
  if (!item) throw new Error(`Queue item ${id} not found`);
  item.status = "rejected";
  item.rejectionReason = reason ?? null;
  item.updatedAt = new Date().toISOString();
  await writeQueue(queue);
  return item;
}
