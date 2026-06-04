// Cloudflare Pages Function: /api/tts
// Converts text to speech via ElevenLabs API.
// POST /api/tts { text, voiceId? } → audio/mpeg stream

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const DEFAULT_VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam — cinematic, authoritative
const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

export async function onRequestPost(context) {
  const { request, env } = context;
  const apiKey = env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not configured", fallback: true }), {
      status: 503,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  let body;
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json", ...CORS } }); }

  const { text, voiceId = DEFAULT_VOICE_ID } = body;
  if (!text?.trim()) {
    return new Response(JSON.stringify({ error: "text required" }), { status: 400, headers: { "Content-Type": "application/json", ...CORS } });
  }

  // Truncate at sentence boundary up to 2500 chars
  // This prevents Tania's voice being cut mid-sentence
  let truncated = text;
  if (text.length > 2500) {
    const cut = text.slice(0, 2500);
    const lastSentence = cut.search(/[.!?][^.!?]*$/);
    truncated = lastSentence > 0 ? cut.slice(0, lastSentence + 1) : cut;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}/stream`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text: truncated,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.78,
          style: 0.25,
          use_speaker_boost: true,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.text();
      // Return fallback flag so frontend can fall back to Web Speech API
      return new Response(JSON.stringify({ error: `ElevenLabs ${res.status}`, detail: err, fallback: true }), {
        status: res.status,
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    return new Response(res.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
        ...CORS,
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), fallback: true }), {
      status: 502,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
