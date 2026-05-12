// Cloudflare Pages Function: /api/flights
//
// Proxies OpenSky Network API for live flight tracking.
// Handles OAuth2 token refresh automatically.
// Returns aircraft state vectors for a bounding box.
//
// GET /api/flights?lamin=31.5&lomin=-98.5&lamax=34.5&lomax=-95.5
// GET /api/flights?icao24=abc123  (single aircraft)
//
// Edge-cached 15 seconds — matches refresh rate on frontend.

const OPENSKY_BASE = "https://opensky-network.org/api";
const TOKEN_URL = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";

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

// DFW default bounding box
const DFW_BOX = { lamin: 31.5, lomin: -98.5, lamax: 34.5, lomax: -95.5 };

// Token cache — stored in memory for the duration of the worker instance
let cachedToken = null;
let tokenExpiry = 0;

async function getToken(clientId, clientSecret) {
  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000);
  return cachedToken;
}

// Parse OpenSky state vector array into named object
function parseStateVector(s) {
  if (!s || s.length < 17) return null;
  return {
    icao24: s[0],
    callsign: (s[1] || "").trim() || null,
    originCountry: s[2],
    timePosition: s[3],
    lastContact: s[4],
    longitude: s[5],
    latitude: s[6],
    baroAltitude: s[7],    // meters
    onGround: s[8],
    velocity: s[9],        // m/s
    trueTrack: s[10],      // degrees clockwise from north
    verticalRate: s[11],   // m/s
    sensors: s[12],
    geoAltitude: s[13],    // meters
    squawk: s[14],
    spi: s[15],
    positionSource: s[16],
    // Derived/display fields
    altitudeFt: s[7] != null ? Math.round(s[7] * 3.28084) : null,
    speedKnots: s[9] != null ? Math.round(s[9] * 1.94384) : null,
  };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const clientId = env.OPENSKY_CLIENT_ID;
  const clientSecret = env.OPENSKY_CLIENT_SECRET;

  // Parse query params
  const lamin = parseFloat(url.searchParams.get("lamin") || DFW_BOX.lamin);
  const lomin = parseFloat(url.searchParams.get("lomin") || DFW_BOX.lomin);
  const lamax = parseFloat(url.searchParams.get("lamax") || DFW_BOX.lamax);
  const lomax = parseFloat(url.searchParams.get("lomax") || DFW_BOX.lomax);
  const icao24 = url.searchParams.get("icao24");

  // Cache key based on query
  const cacheKey = new Request(
    `https://jarvis-flights-cache/${icao24 || `${lamin},${lomin},${lamax},${lomax}`}`,
    request
  );
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    const fresh = new Response(cached.body, cached);
    fresh.headers.set("x-cache", "HIT");
    Object.entries(CORS).forEach(([k, v]) => fresh.headers.set(k, v));
    return fresh;
  }

  // Build OpenSky query
  let apiUrl = `${OPENSKY_BASE}/states/all?`;
  if (icao24) {
    apiUrl += `icao24=${icao24}`;
  } else {
    apiUrl += `lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
  }

  // Fetch with auth if credentials available, anonymous otherwise
  const headers = { "Accept": "application/json" };
  if (clientId && clientSecret) {
    try {
      const token = await getToken(clientId, clientSecret);
      headers["Authorization"] = `Bearer ${token}`;
    } catch (err) {
      console.warn("Token fetch failed, trying anonymous:", String(err));
    }
  }

  let data;
  try {
    const res = await fetch(apiUrl, { headers });
    if (!res.ok) {
      return json({ error: `OpenSky returned ${res.status}`, anonymous: !clientId }, res.status);
    }
    data = await res.json();
  } catch (err) {
    return json({ error: "OpenSky fetch failed", detail: String(err) }, 502);
  }

  const states = (data.states || [])
    .map(parseStateVector)
    .filter(Boolean)
    .filter((s) => s.latitude != null && s.longitude != null);

  const payload = {
    fetchedAt: Date.now(),
    time: data.time,
    count: states.length,
    bounds: { lamin, lomin, lamax, lomax },
    aircraft: states,
    authenticated: !!clientId,
  };

  const response = new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=15",
      "x-cache": "MISS",
      ...CORS,
    },
  });

  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
