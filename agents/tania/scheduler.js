/**
 * Tania Agent — Content Scheduler
 *
 * Manages posting pace (posts per week) and triggers pipeline runs
 * on a cron-like schedule via JARVIS's scheduler.
 *
 * Railway deployment: use Railway's built-in cron jobs OR
 * call scheduleNextRun() from JARVIS's main loop.
 */

import { runTaniaPipeline } from "./index.js";
import { getPendingItems } from "./services/queue.js";
import { logger } from "./utils/logger.js";
import { THEMES, VISUAL_STYLES } from "./config/themes.js";

// ── Scheduler config ─────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  postsPerWeek: 3,               // Ron can change via control panel API
  themes: ["supra_nights", "looking_for_home", "founder_notes"],
  maxPendingBeforeThrottle: 5,   // Don't generate more if queue is full
};

let config = { ...DEFAULT_CONFIG };

/**
 * Update pace from the control panel.
 * @param {number} postsPerWeek  1–14
 */
export function setPace(postsPerWeek) {
  config.postsPerWeek = Math.max(1, Math.min(14, postsPerWeek));
  logger.info(`[Tania Scheduler] Pace updated → ${config.postsPerWeek}× / week`);
}

export function getConfig() {
  return { ...config };
}

/**
 * Determine if a new generation run should fire.
 * Called by JARVIS's cron every hour.
 */
export async function tick() {
  const pending = await getPendingItems();

  if (pending.length >= config.maxPendingBeforeThrottle) {
    logger.info(`[Tania Scheduler] Queue has ${pending.length} pending — throttling.`);
    return { skipped: true, reason: "queue_full" };
  }

  const shouldRun = rollDice(config.postsPerWeek);
  if (!shouldRun) {
    return { skipped: true, reason: "not_scheduled" };
  }

  // Pick a theme in rotation
  const theme = pickTheme(pending);
  const visualStyle = pickStyle(theme);

  logger.info(`[Tania Scheduler] Triggering pipeline · theme=${theme} · style=${visualStyle}`);
  const result = await runTaniaPipeline({ theme, visualStyle });
  return { skipped: false, result };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Probabilistically decide whether to run this hour,
 * given posts-per-week target.
 */
function rollDice(postsPerWeek) {
  const hoursPerWeek = 7 * 24;
  const probability = postsPerWeek / hoursPerWeek;
  return Math.random() < probability;
}

/**
 * Pick the theme least represented in the pending queue.
 */
function pickTheme(pendingItems) {
  const themes = Object.keys(THEMES);
  const counts = Object.fromEntries(themes.map((t) => [t, 0]));
  pendingItems.forEach((item) => {
    if (counts[item.theme] !== undefined) counts[item.theme]++;
  });
  return themes.reduce((a, b) => (counts[a] <= counts[b] ? a : b));
}

function pickStyle(theme) {
  const styleMap = {
    supra_nights: "cinematic_rain",
    looking_for_home: "market",
    founder_notes: "editorial",
  };
  return styleMap[theme] ?? "reflective";
}
