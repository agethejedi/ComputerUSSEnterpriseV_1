/**
 * Taste of Tania — Content Generation Agent
 * Sub-agent of JARVIS · /agents/tania/
 *
 * Pipeline: Claude (script) → ElevenLabs (voice) → Runway ML (video) → Approval queue
 */

import { generateScript } from "./services/claude.js";
import { generateVoice } from "./services/elevenlabs.js";
import { generateVideo } from "./services/runway.js";
import { queueForApproval } from "./services/queue.js";
import { logger } from "./utils/logger.js";
import { THEMES, VISUAL_STYLES } from "./config/themes.js";

/**
 * Main content generation pipeline.
 * Call this from JARVIS or the scheduler.
 *
 * @param {object} opts
 * @param {'supra_nights'|'looking_for_home'|'founder_notes'} opts.theme
 * @param {string} opts.visualStyle  - key from VISUAL_STYLES
 * @param {string} [opts.extraContext] - freeform nudge for Claude's script
 * @returns {Promise<{ jobId: string, status: string }>}
 */
export async function runTaniaPipeline(opts = {}) {
  const {
    theme = "supra_nights",
    visualStyle = "cinematic_rain",
    extraContext = "",
  } = opts;

  const jobId = `tania_${Date.now()}`;
  logger.info(`[Tania] Starting pipeline · job=${jobId} · theme=${theme}`);

  try {
    // ── Step 1: Script (Claude) ──────────────────────────────────────────────
    logger.info(`[Tania] Generating script...`);
    const { script, caption } = await generateScript({ theme, visualStyle, extraContext });
    logger.info(`[Tania] Script ready (${script.length} chars)`);

    // ── Step 2: Voice (ElevenLabs) ───────────────────────────────────────────
    logger.info(`[Tania] Synthesizing voice...`);
    const audioBuffer = await generateVoice(script);
    logger.info(`[Tania] Voice ready (${audioBuffer.byteLength} bytes)`);

    // ── Step 3: Video (Runway ML) ─────────────────────────────────────────────
    logger.info(`[Tania] Generating video...`);
    const videoUrl = await generateVideo({ theme, visualStyle, script, audioBuffer });
    logger.info(`[Tania] Video ready · ${videoUrl}`);

    // ── Step 4: Queue for human approval ─────────────────────────────────────
    const queueEntry = await queueForApproval({
      jobId,
      theme,
      visualStyle,
      script,
      caption,
      videoUrl,
    });

    logger.info(`[Tania] Queued for approval · entry=${queueEntry.id}`);
    return { jobId, status: "pending_approval", queueEntry };

  } catch (err) {
    logger.error(`[Tania] Pipeline failed · job=${jobId}`, err);
    throw err;
  }
}

export { THEMES, VISUAL_STYLES };
