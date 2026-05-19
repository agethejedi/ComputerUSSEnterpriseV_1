/**
 * Tania Agent — ElevenLabs Voice Synthesis
 * Voice ID: knJcCBNKPnJDauT52tkc (Tania)
 */

const ELEVEN_API = "https://api.elevenlabs.io/v1";
const VOICE_ID = "knJcCBNKPnJDauT52tkc";

// Voice settings tuned for Tania's character: calm, warm, cinematic
const VOICE_SETTINGS = {
  stability: 0.72,        // Consistent but not robotic
  similarity_boost: 0.85, // Stay close to Tania's voice signature
  style: 0.28,            // Subtle expressive variation
  use_speaker_boost: true,
};

/**
 * Synthesize Tania's voiceover from script text.
 *
 * @param {string} script - The narration text
 * @returns {Promise<Buffer>} - Raw audio buffer (mp3)
 */
export async function generateVoice(script) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");

  const response = await fetch(`${ELEVEN_API}/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: script,
      model_id: "eleven_multilingual_v2",
      voice_settings: VOICE_SETTINGS,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs error ${response.status}: ${err}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Get voice info for Tania (useful for debugging / confirming voice is active).
 */
export async function getVoiceInfo() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const response = await fetch(`${ELEVEN_API}/voices/${VOICE_ID}`, {
    headers: { "xi-api-key": apiKey },
  });
  return response.json();
}
