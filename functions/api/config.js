// Cloudflare Pages Function: /api/config
// Serves non-sensitive client config from Cloudflare env vars.
// GET /api/config → { wakeWord, ttsEnabled, voiceId }
//
// Required Cloudflare env vars:
//   JARVIS_WAKE_WORD — e.g. "hey jarvis" (stored as secret)
//   ELEVENLABS_VOICE_ID — optional, defaults to Adam

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function onRequestGet(context) {
  const { env } = context;

  const config = {
    wakeWord: (env.JARVIS_WAKE_WORD || "hey jarvis").toLowerCase().trim(),
    ttsEnabled: !!env.ELEVENLABS_API_KEY,
    voiceId: env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB", // Adam default
    appleMusicEnabled: !!(env.APPLE_MUSIC_KEY_ID && env.APPLE_MUSIC_TEAM_ID && env.APPLE_MUSIC_PRIVATE_KEY),
  };

  return new Response(JSON.stringify(config), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300", // 5 min cache
      ...CORS,
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
