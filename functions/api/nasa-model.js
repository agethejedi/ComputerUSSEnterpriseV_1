// Cloudflare Pages Function: /api/nasa-model
//
// Proxies NASA 3D model GLB files to solve two problems:
// 1. NASA's CDN blocks cross-origin requests (CORS)
// 2. Some NASA URLs have changed — this function uses a verified URL map
//
// GET /api/nasa-model?id=iss  → streams the GLB back with CORS headers
// GET /api/nasa-model?id=mars → streams Mars GLB back with CORS headers
//
// Models are cached at Cloudflare's edge for 24 hours (they never change).

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range",
};

// Verified working GLB URLs as of May 2026.
// Primary: assets.science.nasa.gov (NASA's own CDN)
// Fallback: Sketchfab embed downloads (publicly licensed, no login needed for GLB)
const MODEL_URLS = {
  // ── Planets & Moons ───────────────────────────────────────────────────────
  earth: {
    primary: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/s/Earth_1_12756.glb",
    fallback: "https://nasa3d.arc.nasa.gov/shared_assets/models/geo-earth/earth.glb",
  },
  mars: {
    primary: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/s/Mars_1_6792.glb",
    fallback: "https://nasa3d.arc.nasa.gov/shared_assets/models/geo-mars/mars.glb",
  },
  moon: {
    primary: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/s/Moon_1_3474.glb",
    fallback: "https://nasa3d.arc.nasa.gov/shared_assets/models/geo-moon/moon.glb",
  },
  jupiter: {
    primary: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/s/Jupiter_1_142984.glb",
    fallback: null,
  },
  saturn: {
    primary: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/s/Saturn_1_120536.glb",
    fallback: null,
  },
  venus: {
    primary: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/s/Venus_1_12103.glb",
    fallback: null,
  },
  mercury: {
    primary: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/s/Mercury_1_4879.glb",
    fallback: null,
  },
  sun: {
    primary: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/s/Sun_1_1391000.glb",
    fallback: null,
  },
  pluto: {
    primary: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/s/Pluto_1_2376.glb",
    fallback: null,
  },
  europa: {
    primary: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/s/Europa_1_3122.glb",
    fallback: null,
  },
  titan: {
    primary: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/s/Titan_1_5150.glb",
    fallback: null,
  },
  io: {
    primary: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/s/Io_1_3643.glb",
    fallback: null,
  },
  uranus: {
    primary: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/s/Uranus_1_51118.glb",
    fallback: null,
  },
  neptune: {
    primary: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/s/Neptune_1_49528.glb",
    fallback: null,
  },

  // ── Spacecraft ────────────────────────────────────────────────────────────
  iss: {
    primary: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/s/spacecraft_ISS.glb",
    fallback: "https://nasa3d.arc.nasa.gov/shared_assets/models/iss-4/ISS_4.glb",
  },
  hubble: {
    primary: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/s/spacecraft_HST.glb",
    fallback: "https://nasa3d.arc.nasa.gov/shared_assets/models/hst/hst.glb",
  },
  webb: {
    primary: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/s/spacecraft_JWST.glb",
    fallback: null,
  },
  voyager: {
    primary: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/s/spacecraft_Voyager.glb",
    fallback: "https://nasa3d.arc.nasa.gov/shared_assets/models/voyager/voyager.glb",
  },
  cassini: {
    primary: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/s/spacecraft_Cassini.glb",
    fallback: null,
  },
  juno: {
    primary: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/s/spacecraft_Juno.glb",
    fallback: null,
  },
  "new-horizons": {
    primary: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/s/spacecraft_NewHorizons.glb",
    fallback: null,
  },

  // ── Rovers ────────────────────────────────────────────────────────────────
  curiosity: {
    primary: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/s/rover_Curiosity.glb",
    fallback: "https://nasa3d.arc.nasa.gov/shared_assets/models/curiosity/curiosity.glb",
  },
  perseverance: {
    primary: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/s/rover_Perseverance.glb",
    fallback: null,
  },
  ingenuity: {
    primary: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/s/heli_Ingenuity.glb",
    fallback: null,
  },
  opportunity: {
    primary: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/s/rover_Opportunity.glb",
    fallback: "https://nasa3d.arc.nasa.gov/shared_assets/models/mer/mer.glb",
  },

  // ── Telescopes ────────────────────────────────────────────────────────────
  "osiris-rex": {
    primary: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/s/spacecraft_OSIRISREx.glb",
    fallback: null,
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
    return new Response(JSON.stringify({ error: `Unknown model: ${id}`, available: Object.keys(MODEL_URLS) }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  // Check edge cache first
  const cacheKey = new Request(`https://jarvis-nasa-model-cache/${id}.glb`);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    const fresh = new Response(cached.body, cached);
    fresh.headers.set("x-cache", "HIT");
    Object.entries(CORS).forEach(([k, v]) => fresh.headers.set(k, v));
    return fresh;
  }

  // Try primary URL, then fallback
  const urlsToTry = [modelDef.primary, modelDef.fallback].filter(Boolean);
  let lastErr = null;

  for (const sourceUrl of urlsToTry) {
    try {
      const upstream = await fetch(sourceUrl, {
        headers: {
          "User-Agent": "JARVIS-Briefing/1.0 (Cloudflare Pages proxy)",
          "Accept": "model/gltf-binary, */*",
        },
      });

      if (!upstream.ok) {
        lastErr = `${sourceUrl} returned ${upstream.status}`;
        continue;
      }

      const contentType = upstream.headers.get("content-type") || "model/gltf-binary";
      const contentLength = upstream.headers.get("content-length");

      const responseHeaders = {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // 24 hours
        "x-cache": "MISS",
        "x-source": sourceUrl,
        ...CORS,
      };
      if (contentLength) responseHeaders["Content-Length"] = contentLength;

      const response = new Response(upstream.body, {
        status: 200,
        headers: responseHeaders,
      });

      // Cache it at the edge
      context.waitUntil(cache.put(cacheKey, response.clone()));
      return response;

    } catch (err) {
      lastErr = String(err);
      continue;
    }
  }

  // All URLs failed
  return new Response(
    JSON.stringify({ error: "All model sources failed", detail: lastErr, id }),
    { status: 502, headers: { "Content-Type": "application/json", ...CORS } }
  );
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
