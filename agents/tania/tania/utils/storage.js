/**
 * Tania Agent — Storage Utility
 *
 * Uploads audio/video buffers so Runway can pull them via URL.
 * Default: Railway Volume (local file) exposed via your own /media endpoint.
 * Swap uploadAudio() for S3/R2/Cloudflare if you prefer.
 */

import fs from "fs/promises";
import path from "path";

const MEDIA_DIR = process.env.TANIA_MEDIA_DIR ?? path.join(process.cwd(), "data", "media");
const MEDIA_BASE_URL = process.env.TANIA_MEDIA_BASE_URL ?? "http://localhost:3000/media/tania";

/**
 * Save an audio buffer to disk and return a publicly accessible URL.
 *
 * @param {Buffer} buffer
 * @param {string} filename
 * @returns {Promise<string>} public URL
 */
export async function uploadAudio(buffer, filename) {
  await fs.mkdir(MEDIA_DIR, { recursive: true });
  const filePath = path.join(MEDIA_DIR, filename);
  await fs.writeFile(filePath, buffer);
  return `${MEDIA_BASE_URL}/${filename}`;
}

/**
 * Serve media files in Express.
 * Add this to your JARVIS app: app.use("/media/tania", serveMedia())
 */
export function serveMedia() {
  const { default: serveStatic } = await import("serve-static");
  return serveStatic(MEDIA_DIR);
}
