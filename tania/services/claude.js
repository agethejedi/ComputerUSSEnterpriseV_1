/**
 * Tania Agent — Claude Scripting Service
 * Generates voiceover script + social caption for a given theme.
 */

import Anthropic from "@anthropic-ai/sdk";
import { THEMES, VISUAL_STYLES } from "../config/themes.js";
import { TANIA_SYSTEM_PROMPT } from "../prompts/tania.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * @param {object} opts
 * @param {string} opts.theme
 * @param {string} opts.visualStyle
 * @param {string} [opts.extraContext]
 * @returns {Promise<{ script: string, caption: string }>}
 */
export async function generateScript({ theme, visualStyle, extraContext = "" }) {
  const themeConfig = THEMES[theme];
  const styleConfig = VISUAL_STYLES[visualStyle];

  if (!themeConfig) throw new Error(`Unknown theme: ${theme}`);
  if (!styleConfig) throw new Error(`Unknown visual style: ${visualStyle}`);

  const userPrompt = `
Generate a Tania voiceover script and Instagram caption for this content piece.

Theme: ${themeConfig.label}
Theme description: ${themeConfig.description}
Mood: ${themeConfig.mood}
Visual style: ${styleConfig.label} — ${styleConfig.prompt}
${extraContext ? `Additional context: ${extraContext}` : ""}

Return ONLY valid JSON in this exact shape, no markdown fences:
{
  "script": "30–60 second voiceover (spoken, natural, Tania's voice). No stage directions.",
  "caption": "Instagram caption, 2–3 sentences max. Tania's tone. No hashtags yet."
}
`.trim();

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: TANIA_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw = response.content[0]?.text ?? "";

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    if (!parsed.script || !parsed.caption) throw new Error("Missing fields");
    return parsed;
  } catch {
    // Fallback: extract script and caption manually
    const scriptMatch = raw.match(/"script"\s*:\s*"([\s\S]+?)(?<!\\)",/);
    const captionMatch = raw.match(/"caption"\s*:\s*"([\s\S]+?)(?<!\\)"\s*}/);
    if (scriptMatch && captionMatch) {
      return {
        script: scriptMatch[1].replace(/\\n/g, "\n"),
        caption: captionMatch[1].replace(/\\n/g, "\n"),
      };
    }
    throw new Error(`Claude response parse failed: ${raw.slice(0, 200)}`);
  }
}
