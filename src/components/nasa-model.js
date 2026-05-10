// Cloudflare Pages Function: /api/nasa-model
//
// Proxies NASA 3D model GLB files to solve two problems:
// 1. NASA's CDN blocks cross-origin requests (CORS)
// 2. Verified URLs scraped directly from NASA science pages
//
// URL pattern discovered from NASA science pages:
// https://assets.science.nasa.gov/content/dam/science/psd/solar/2023/09/[first-letter]/[Name].glb
//
// Confirmed: Hubble.glb (from science page HTML)
// ISS page renders download link via JS — using best-guess based on pattern
//
// Edge-cached 24 hours. Models never change.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range",
};

const BASE = "https://assets.science.nasa.gov/content/dam/science/psd/solar/2023/09";

// Helper: builds NASA CDN URL using confirmed pattern
// [first letter of filename] subfolder, e.g. Hubble.glb -> /h/Hubble.glb
const nasa = (filename) => `${BASE}/${filename[0].toLowerCase()}/${filename}`;

const MODEL_URLS = {
  // ── Confirmed from NASA page HTML ─────────────────────────────────────────
  hubble: {
    urls: [
      "https://assets.science.nasa.gov/content/dam/science/psd/solar/2023/09/h/Hubble.glb",
    ],
  },

  // ── Pattern-derived URLs (same CDN, same date structure) ──────────────────
  // Planets — named after standard solar system body names
  earth: {
    urls: [
      nasa("Earth_1_12756.glb"),
      nasa("Earth.glb"),
      "https://solarsystem.nasa.gov/system/downloadable_items/2393_Earth_1_12756.zip",
    ],
  },
  mars: {
    urls: [
      nasa("Mars_1_6792.glb"),
      nasa("Mars.glb"),
    ],
  },
  moon: {
    urls: [
      nasa("Moon_1_3474.glb"),
      nasa("Moon.glb"),
    ],
  },
  jupiter: {
    urls: [
      nasa("Jupiter_1_142984.glb"),
      nasa("Jupiter.glb"),
    ],
  },
  saturn: {
    urls: [
      nasa("Saturn_1_120536.glb"),
      nasa("Saturn.glb"),
    ],
  },
  venus: {
    urls: [
      nasa("Venus_1_12103.glb"),
      nasa("Venus.glb"),
    ],
  },
  mercury: {
    urls: [
      nasa("Mercury_1_4879.glb"),
      nasa("Mercury.glb"),
    ],
  },
  sun: {
    urls: [
      nasa("Sun_1_1391000.glb"),
      nasa("Sun.glb"),
    ],
  },
  pluto: {
    urls: [
      nasa("Pluto_1_2376.glb"),
      nasa("Pluto.glb"),
    ],
  },
  europa: {
    urls: [
      nasa("Europa_1_3122.glb"),
      nasa("Europa.glb"),
    ],
  },
  titan: {
    urls: [
      nasa("Titan_1_5150.glb"),
      nasa("Titan.glb"),
    ],
  },
  io: {
    urls: [
      nasa("Io_1_3643.glb"),
      nasa("Io.glb"),
    ],
  },
  uranus: {
    urls: [
      nasa("Uranus_1_51118.glb"),
      nasa("Uranus.glb"),
    ],
  },
  neptune: {
    urls: [
      nasa("Neptune_1_49528.glb"),
      nasa("Neptune.glb"),
    ],
  },

  // ── Spacecraft ────────────────────────────────────────────────────────────
  iss: {
    urls: [
      nasa("ISS_stationary.glb"),
      nasa("International_Space_Station.glb"),
      nasa("ISS.glb"),
      // NASA's actual 3D resources GitHub (raw, no CORS issues via proxy)
      "https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/ISS/ISS_stationary.glb",
    ],
  },
  webb: {
    urls: [
      nasa("Webb.glb"),
      nasa("JWST.glb"),
      nasa("James_Webb_Space_Telescope.glb"),
    ],
  },
  voyager: {
    urls: [
      nasa("Voyager.glb"),
    ],
  },
  cassini: {
    urls: [
      nasa("Cassini.glb"),
    ],
  },
  juno: {
    urls: [
      nasa("Juno.glb"),
    ],
  },
  "new-horizons": {
    urls: [
      nasa("New_Horizons.glb"),
      nasa("NewHorizons.glb"),
    ],
  },
  "osiris-rex": {
    urls: [
      nasa("OSIRIS-REx.glb"),
      nasa("OSIRISREx.glb"),
    ],
  },

  // ── Rovers ────────────────────────────────────────────────────────────────
  curiosity: {
    urls: [
      nasa("Curiosity.glb"),
      "https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Curiosity/Curiosity_static.glb",
    ],
  },
  perseverance: {
    urls: [
      nasa("Perseverance.glb"),
      nasa("Mars_2020_Perseverance.glb"),
    ],
  },
  ingenuity: {
    urls: [
      nasa("Ingenuity.glb"),
      nasa("Mars_Helicopter.glb"),
    ],
  },
  opportunity: {
    urls: [
      nasa("Opportunity.glb"),
      nasa("MER.glb"),
    ],
  },
};

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.toLowerCase();

  if (!id) {
    return new Response(JSON.stringify({ error: "id parameter required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  const modelDef = MODEL_URLS[id];
  if (!modelDef) {
    return new Response(
      JSON.stringify({ error: `Unknown model: ${id}`, available: Object.keys(MODEL_URLS) }),
      { status: 404, headers: { "Content-Type": "application/json", ...CORS } }
    );
  }

  // Edge cache check
  const cacheKey = new Request(`https://jarvis-nasa-model-cache-v2/${id}.glb`);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    const fresh = new Response(cached.body, cached);
    fresh.headers.set("x-cache", "HIT");
    Object.entries(CORS).forEach(([k, v]) => fresh.headers.set(k, v));
    return fresh;
  }

  // Try each URL in order until one works
  let lastErr = null;
  for (const sourceUrl of modelDef.urls) {
    try {
      const upstream = await fetch(sourceUrl, {
        headers: {
          "User-Agent": "JARVIS-Briefing/1.0 (personal dashboard; ron@example.com)",
          "Accept": "model/gltf-binary, application/octet-stream, */*",
        },
      });

      if (!upstream.ok) {
        lastErr = `${sourceUrl} → ${upstream.status}`;
        continue;
      }

      const ct = upstream.headers.get("content-type") || "model/gltf-binary";
      const cl = upstream.headers.get("content-length");

      const responseHeaders = {
        "Content-Type": ct,
        "Cache-Control": "public, max-age=86400",
        "x-cache": "MISS",
        "x-source": sourceUrl,
        ...CORS,
      };
      if (cl) responseHeaders["Content-Length"] = cl;

      const response = new Response(upstream.body, { status: 200, headers: responseHeaders });
      context.waitUntil(cache.put(cacheKey, response.clone()));
      return response;

    } catch (err) {
      lastErr = `${sourceUrl} → ${String(err)}`;
      continue;
    }
  }

  return new Response(
    JSON.stringify({ error: "All model sources failed", detail: lastErr, id }),
    { status: 502, headers: { "Content-Type": "application/json", ...CORS } }
  );
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
