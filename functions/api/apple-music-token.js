// Cloudflare Pages Function: /api/apple-music-token
// Generates a MusicKit JS developer token (JWT) from your Apple credentials.
// The token is valid for 6 months — we cache it at the edge.
//
// GET /api/apple-music-token → { token, expiresAt }
//
// Required Cloudflare env vars:
//   APPLE_MUSIC_KEY_ID      — Key ID from Apple Developer (e.g. ABC1234567)
//   APPLE_MUSIC_TEAM_ID     — Team ID from Apple Developer (e.g. TEAM123456)
//   APPLE_MUSIC_PRIVATE_KEY — Contents of the .p8 file Apple gives you

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

async function buildJWT(keyId, teamId, privateKeyPem, origin) {
  // Clean up PEM — remove headers and whitespace
  const pemBody = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/-----BEGIN EC PRIVATE KEY-----/, "")
    .replace(/-----END EC PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const keyData = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 15897600; // 6 months

  const header = { alg: "ES256", kid: keyId };

  // origin claim is required for MusicKit JS web apps —
  // without it Apple returns 401 on all user-authenticated calls
  const payload = {
    iss: teamId,
    iat: now,
    exp,
    origin,
  };

  const encode = (obj) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

  const signingInput = `${encode(header)}.${encode(payload)}`;
  const msgBuffer = new TextEncoder().encode(signingInput);
  const sigBuffer = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    msgBuffer
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return { token: `${signingInput}.${sig}`, expiresAt: exp };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const keyId      = env.APPLE_MUSIC_KEY_ID;
  const teamId     = env.APPLE_MUSIC_TEAM_ID;
  const privateKey = env.APPLE_MUSIC_PRIVATE_KEY;

  if (!keyId || !teamId || !privateKey) {
    return json({
      error: "Apple Music credentials not configured",
      missing: [
        !keyId      && "APPLE_MUSIC_KEY_ID",
        !teamId     && "APPLE_MUSIC_TEAM_ID",
        !privateKey && "APPLE_MUSIC_PRIVATE_KEY",
      ].filter(Boolean),
    }, 503);
  }

  // Derive origin from the incoming request so it works on any domain
  // (custom domain, pages.dev preview, localhost)
  const reqUrl = new URL(request.url);
  const origin = `${reqUrl.protocol}//${reqUrl.host}`;

  // Cache key includes origin so different domains get different tokens
  const cacheKey = new Request(`https://jarvis-apple-music-token-v1/token?origin=${encodeURIComponent(origin)}`);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    const fresh = new Response(cached.body, cached);
    fresh.headers.set("x-cache", "HIT");
    Object.entries(CORS).forEach(([k, v]) => fresh.headers.set(k, v));
    return fresh;
  }

  try {
    const { token, expiresAt } = await buildJWT(keyId, teamId, privateKey, origin);
    const response = new Response(JSON.stringify({ token, expiresAt, origin }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=86400",
        "x-cache": "MISS",
        ...CORS,
      },
    });
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (err) {
    return json({ error: `JWT generation failed: ${String(err)}` }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
