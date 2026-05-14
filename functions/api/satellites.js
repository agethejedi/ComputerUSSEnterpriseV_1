// Cloudflare Pages Function: /api/satellites
//
// Proxies N2YO API for satellite tracking.
// GET /api/satellites?mode=above              → all sats above The Colony
// GET /api/satellites?mode=above&category=18  → Starlink only
// GET /api/satellites?mode=position&id=25544  → single satellite position
// GET /api/satellites?mode=passes&id=25544    → ISS pass predictions
//
// N2YO category IDs:
//   0  = all, 1 = brightest, 2 = ISS, 3 = weather, 6 = geostationary
//   18 = Starlink, 22 = GPS, 30 = NOAA, 48 = Hubble, 52 = military
//   65 = amateur radio, 386 = Tiangong

const N2YO_BASE = "https://api.n2yo.com/rest/v1/satellite";
const OBSERVER_LAT = 33.0807;
const OBSERVER_LON = -96.8867;
const OBSERVER_ALT = 0;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json", ...CORS },
  });

// Category metadata for display
const CATEGORIES = {
  0:   { name: "ALL",       color: "#94A3B8" },
  2:   { name: "STATIONS",  color: "#67E8F9" },
  18:  { name: "STARLINK",  color: "#34D399" },
  22:  { name: "GPS",       color: "#FBBF24" },
  3:   { name: "WEATHER",   color: "#A78BFA" },
  52:  { name: "MILITARY",  color: "#FB7185" },
  65:  { name: "AMATEUR",   color: "#FB923C" },
  48:  { name: "HUBBLE",    color: "#67E8F9" },
  6:   { name: "GEO",       color: "#94A3B8" },
};

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const apiKey = env.N2YO_API_KEY;

  if (!apiKey) {
    return json({
      error: "N2YO_API_KEY not configured",
      note: "Register at n2yo.com, generate an API key, add N2YO_API_KEY to Cloudflare env vars.",
    }, 503);
  }

  const mode = url.searchParams.get("mode") || "above";
  const id = url.searchParams.get("id");
  const category = url.searchParams.get("category") || "0";
  const days = parseInt(url.searchParams.get("days") || "3");

  // Cache keys and TTLs per mode
  const cacheKey = new Request(
    `https://jarvis-satellites-v1/${mode}/${id || category}`,
    request
  );
  const cacheTTL = mode === "above" ? 60 : mode === "position" ? 30 : 3600;
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    const fresh = new Response(cached.body, cached);
    fresh.headers.set("x-cache", "HIT");
    Object.entries(CORS).forEach(([k, v]) => fresh.headers.set(k, v));
    return fresh;
  }

  let apiUrl;
  if (mode === "above") {
    // All satellites above observer within 90 degree search radius
    apiUrl = `${N2YO_BASE}/above/${OBSERVER_LAT}/${OBSERVER_LON}/${OBSERVER_ALT}/90/${category}/&apiKey=${apiKey}`;
  } else if (mode === "position" && id) {
    // Current position of a specific satellite, 1 second ahead
    apiUrl = `${N2YO_BASE}/positions/${id}/${OBSERVER_LAT}/${OBSERVER_LON}/${OBSERVER_ALT}/1/&apiKey=${apiKey}`;
  } else if (mode === "passes" && id) {
    // Visual pass predictions
    apiUrl = `${N2YO_BASE}/visualpasses/${id}/${OBSERVER_LAT}/${OBSERVER_LON}/${OBSERVER_ALT}/${days}/10/&apiKey=${apiKey}`;
  } else if (mode === "tle" && id) {
    apiUrl = `${N2YO_BASE}/tle/${id}&apiKey=${apiKey}`;
  } else {
    return json({ error: "Invalid mode or missing id" }, 400);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    let res;
    try {
      res = await fetch(apiUrl, {
        signal: controller.signal,
        headers: { "Accept": "application/json" },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      return json({ error: `N2YO returned ${res.status}` }, res.status);
    }

    const data = await res.json();

    // Enrich the response with category metadata
    const payload = {
      ...data,
      fetchedAt: Date.now(),
      mode,
      categoryMeta: CATEGORIES[parseInt(category)] || CATEGORIES[0],
      observerLocation: { lat: OBSERVER_LAT, lon: OBSERVER_LON },
    };

    const response = new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${cacheTTL}`,
        "x-cache": "MISS",
        ...CORS,
      },
    });

    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;

  } catch (err) {
    const isTimeout = String(err).includes("aborted");
    return json({
      error: isTimeout ? "N2YO request timed out" : "N2YO fetch failed",
      detail: String(err),
    }, 502);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
