// Cloudflare Pages Function: /api/geocode
// Proxies Nominatim geocoding to avoid CORS and add caching.
// GET /api/geocode?q=Dallas+TX → { lat, lon, display_name }
// Edge-cached 24 hours — place coordinates don't change.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  if (!q) return new Response(JSON.stringify({ error: "q required" }), { status: 400, headers: { "Content-Type": "application/json", ...CORS } });

  const cacheKey = new Request(`https://jarvis-geocode-v1/${encodeURIComponent(q.toLowerCase())}`);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    const fresh = new Response(cached.body, cached);
    fresh.headers.set("x-cache", "HIT");
    Object.entries(CORS).forEach(([k, v]) => fresh.headers.set(k, v));
    return fresh;
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
      { headers: { "User-Agent": "JARVIS-Dashboard/1.0 (personal-dashboard)" } }
    );
    if (!res.ok) return new Response(JSON.stringify({ error: `Nominatim ${res.status}` }), { status: res.status, headers: { "Content-Type": "application/json", ...CORS } });

    const data = await res.json();
    if (!data[0]) return new Response(JSON.stringify({ error: "No results", q }), { status: 404, headers: { "Content-Type": "application/json", ...CORS } });

    const result = {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      display_name: data[0].display_name,
      q,
    };

    const response = new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=86400", "x-cache": "MISS", ...CORS },
    });
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 502, headers: { "Content-Type": "application/json", ...CORS } });
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
