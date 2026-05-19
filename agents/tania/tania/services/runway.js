/**
 * Tania Agent — Runway ML Video Generation
 * Uses Runway Gen-3 Alpha Turbo for cinematic short-form video.
 */

import { uploadAudio } from "../utils/storage.js";
import { VISUAL_STYLES } from "../config/themes.js";

const RUNWAY_API = "https://api.dev.runwayml.com/v1";

// Shared cinematic suffix applied to all Tania videos
const CINEMATIC_SUFFIX =
  "shallow depth of field, 4K, cinematic color grade, slow motion, warm shadows, grain overlay, Tania's world";

/**
 * Generate a video via Runway ML and return the final video URL.
 *
 * @param {object} opts
 * @param {string} opts.theme
 * @param {string} opts.visualStyle
 * @param {string} opts.script  - used only for metadata/logging
 * @param {Buffer} opts.audioBuffer - mp3 audio from ElevenLabs
 * @returns {Promise<string>} - URL to the rendered video
 */
export async function generateVideo({ theme, visualStyle, script, audioBuffer }) {
  const apiKey = process.env.RUNWAY_API_KEY;
  if (!apiKey) throw new Error("RUNWAY_API_KEY not set");

  const styleConfig = VISUAL_STYLES[visualStyle];
  if (!styleConfig) throw new Error(`Unknown visual style: ${visualStyle}`);

  // Upload audio to get a URL Runway can pull from
  const audioUrl = await uploadAudio(audioBuffer, `${Date.now()}_tania.mp3`);

  // Build the full video prompt
  const videoPrompt = `${styleConfig.prompt}, ${CINEMATIC_SUFFIX}`;

  // ── Submit generation job ─────────────────────────────────────────────────
  const submitRes = await fetch(`${RUNWAY_API}/image_to_video`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Runway-Version": "2024-11-06",
    },
    body: JSON.stringify({
      model: "gen3a_turbo",
      promptText: videoPrompt,
      duration: 10,        // seconds (Runway Gen-3 max for turbo)
      ratio: "9:16",       // vertical for Reels/TikTok
      watermark: false,
    }),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`Runway submit error ${submitRes.status}: ${err}`);
  }

  const { id: taskId } = await submitRes.json();
  if (!taskId) throw new Error("Runway did not return a task ID");

  // ── Poll for completion ───────────────────────────────────────────────────
  const videoUrl = await pollRunwayTask(taskId, apiKey);
  return videoUrl;
}

/**
 * Poll Runway task until complete or failed.
 * Runway Gen-3 typically takes 30–120 seconds.
 */
async function pollRunwayTask(taskId, apiKey, maxWaitMs = 180_000) {
  const started = Date.now();
  const interval = 5_000; // poll every 5s

  while (Date.now() - started < maxWaitMs) {
    await sleep(interval);

    const res = await fetch(`${RUNWAY_API}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}`, "X-Runway-Version": "2024-11-06" },
    });

    if (!res.ok) throw new Error(`Runway poll error ${res.status}`);
    const task = await res.json();

    if (task.status === "SUCCEEDED") {
      const videoUrl = task.output?.[0];
      if (!videoUrl) throw new Error("Runway task succeeded but no output URL");
      return videoUrl;
    }

    if (task.status === "FAILED") {
      throw new Error(`Runway task failed: ${task.failure ?? "unknown reason"}`);
    }

    // PENDING or RUNNING — keep polling
  }

  throw new Error(`Runway task ${taskId} timed out after ${maxWaitMs / 1000}s`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
