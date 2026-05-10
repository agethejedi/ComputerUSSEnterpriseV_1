// Cloudflare Pages Function: /api/nasa-model
//
// Proxies NASA 3D model GLB files — solves CORS blocking from NASA's CDN.
//
// CONFIRMED URLs (scraped directly from NASA science pages):
//   Webb (B): https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/model/james-webb-space-telescope-(b)/James%20Webb%20Space%20Telescope%20(B).glb
//   Hubble:   https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/model/hubble-space-telescope/Hubble.glb
//
// Pattern for all others (derived from confirmed URLs):
//   https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/model/[page-slug]/[Model%20Name].glb
//
// Page slugs are from science.nasa.gov/3d-resources/[slug]/
// Edge-cached 24h. Models never change.

const BASE = "https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/model";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range",
};

// Each entry: urls[] tried in order, first 200 wins
const MODEL_URLS = {
  // ── CONFIRMED from page HTML ──────────────────────────────────────────────
  webb: {
    urls: [
      `${BASE}/james-webb-space-telescope-(b)/James%20Webb%20Space%20Telescope%20(B).glb`,
    ],
  },
  hubble: {
    urls: [
      `${BASE}/hubble-space-telescope/Hubble.glb`,
      `${BASE}/hubble-space-telescope-3d-model/Hubble.glb`,
    ],
  },

  // ── Pattern-derived from confirmed structure ───────────────────────────────
  // Planets & Moons (slug = body name, file = "Body Name.glb")
  earth: {
    urls: [
      `${BASE}/earth/Earth.glb`,
      `${BASE}/earth-3d-model/Earth.glb`,
    ],
  },
  mars: {
    urls: [
      `${BASE}/mars/Mars.glb`,
      `${BASE}/mars-3d-model/Mars.glb`,
    ],
  },
  moon: {
    urls: [
      `${BASE}/moon/Moon.glb`,
      `${BASE}/earths-moon/Moon.glb`,
      `${BASE}/earths-moon-3d-model/Moon.glb`,
    ],
  },
  jupiter: {
    urls: [
      `${BASE}/jupiter/Jupiter.glb`,
      `${BASE}/jupiter-3d-model/Jupiter.glb`,
    ],
  },
  saturn: {
    urls: [
      `${BASE}/saturn/Saturn.glb`,
      `${BASE}/saturn-3d-model/Saturn.glb`,
    ],
  },
  venus: {
    urls: [
      `${BASE}/venus/Venus.glb`,
      `${BASE}/venus-3d-model/Venus.glb`,
    ],
  },
  mercury: {
    urls: [
      `${BASE}/mercury/Mercury.glb`,
      `${BASE}/mercury-3d-model/Mercury.glb`,
    ],
  },
  sun: {
    urls: [
      `${BASE}/sun/Sun.glb`,
      `${BASE}/sun-3d-model/Sun.glb`,
    ],
  },
  pluto: {
    urls: [
      `${BASE}/pluto/Pluto.glb`,
      `${BASE}/pluto-3d-model/Pluto.glb`,
    ],
  },
  europa: {
    urls: [
      `${BASE}/europa/Europa.glb`,
    ],
  },
  titan: {
    urls: [
      `${BASE}/titan/Titan.glb`,
    ],
  },
  io: {
    urls: [
      `${BASE}/io/Io.glb`,
    ],
  },

  // ── Spacecraft ────────────────────────────────────────────────────────────
  iss: {
    urls: [
      `${BASE}/international-space-station/International%20Space%20Station.glb`,
      `${BASE}/international-space-station-3d-model/ISS.glb`,
      // GitHub raw as last resort — public, no CORS issues when proxied
      "https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/ISS/ISS_stationary.glb",
    ],
  },
  voyager: {
    urls: [
      `${BASE}/voyager/Voyager.glb`,
      `${BASE}/voyager-spacecraft/Voyager.glb`,
    ],
  },
  cassini: {
    urls: [
      `${BASE}/cassini/Cassini.glb`,
      `${BASE}/cassini-spacecraft/Cassini.glb`,
    ],
  },
  juno: {
    urls: [
      `${BASE}/juno/Juno.glb`,
      `${BASE}/juno-spacecraft/Juno.glb`,
    ],
  },
  "new-horizons": {
    urls: [
      `${BASE}/new-horizons/New%20Horizons.glb`,
      `${BASE}/new-horizons-spacecraft/New%20Horizons.glb`,
    ],
  },
  "osiris-rex": {
    urls: [
      `${BASE}/osiris-rex/OSIRIS-REx.glb`,
      `${BASE}/osiris-rex-spacecraft/OSIRIS-REx.glb`,
    ],
  },
  sls: {
    urls: [
      `${BASE}/space-launch-system-sls/Space%20Launch%20System%20(SLS).glb`,
      `${BASE}/space-launch-system-sls/SLS.glb`,
    ],
  },
  orion: {
    urls: [
      `${BASE}/orion-capsule/Orion%20Capsule.glb`,
      `${BASE}/orion-capsule/Orion.glb`,
    ],
  },
  gateway: {
    urls: [
      `${BASE}/gateway-lunar-space-station/Gateway%20Lunar%20Space%20Station.glb`,
      `${BASE}/gateway-lunar-space-station/Gateway.glb`,
    ],
  },
  shuttle: {
    urls: [
      `${BASE}/space-shuttle-d/Space%20Shuttle%20(D).glb`,
      `${BASE}/space-shuttle-d/Space%20Shuttle.glb`,
    ],
  },

  // ── Rovers ────────────────────────────────────────────────────────────────
  perseverance: {
    urls: [
      `${BASE}/mars-2020-perseverance-rover/Mars%202020%20Perseverance%20Rover.glb`,
      `${BASE}/mars-2020-perseverance-rover/Perseverance.glb`,
    ],
  },
  curiosity: {
    urls: [
      `${BASE}/curiosity-rover/Curiosity.glb`,
      `${BASE}/mars-science-laboratory-curiosity-rover/Curiosity.glb`,
      "https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Curiosity/Curiosity_static.glb",
    ],
  },
  ingenuity: {
    urls: [
      `${BASE}/ingenuity-mars-helicopter/Ingenuity.glb`,
      `${BASE}/ingenuity/Ingenuity.glb`,
    ],
  },
  opportunity: {
    urls: [
      `${BASE}/mars-exploration-rover-spirit-and-opportunity/Mars%20Exploration%20Rover.glb`,
      `${BASE}/mars-exploration-rover-spirit-and-opportunity/Opportunity.glb`,
    ],
  },
};

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.toLowerCase();

  if (!id) {
    return new Response(JSON.stringify({ error: "id required", available: Object.keys(MODEL_URLS) }), {
      status: 400, headers: { "Content-Type": "application/json", ...CORS },
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
  const cacheKey = new Request(`https://jarvis-nasa-model-cache-v3/${id}.glb`);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    const fresh = new Response(cached.body, cached);
    fresh.headers.set("x-cache", "HIT");
    Object.entries(CORS).forEach(([k, v]) => fresh.headers.set(k, v));
    return fresh;
  }

  let lastErr = null;
  for (const sourceUrl of modelDef.urls) {
    try {
      const upstream = await fetch(sourceUrl, {
        headers: {
          "User-Agent": "JARVIS-Dashboard/1.0 (personal; cloudflare-pages)",
          "Accept": "model/gltf-binary, application/octet-stream, */*",
          "Referer": "https://science.nasa.gov/",
        },
      });

      if (!upstream.ok) {
        lastErr = `${sourceUrl} → HTTP ${upstream.status}`;
        continue;
      }

      const ct = upstream.headers.get("content-type") || "model/gltf-binary";
      const cl = upstream.headers.get("content-length");
      const responseHeaders = {
        "Content-Type": ct,
        "Cache-Control": "public, max-age=86400",
        "x-cache": "MISS",
        "x-source-url": sourceUrl,
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
    JSON.stringify({ error: "All sources failed", id, detail: lastErr }),
    { status: 502, headers: { "Content-Type": "application/json", ...CORS } }
  );
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
