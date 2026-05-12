// Cloudflare Pages Function: /api/traffic-cameras
//
// Proxies TxDOT traffic camera snapshots to solve CORS.
// TxDOT publishes public JPEG snapshots — no auth required.
//
// GET /api/traffic-cameras          → list of available cameras near The Colony
// GET /api/traffic-cameras?id=XXX   → proxy the JPEG snapshot for camera XXX
//
// Image snapshots cached 30 seconds at edge.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Curated TxDOT cameras near The Colony, TX
// Format: TxDOT ITS snapshot URL pattern
// Source: its.txdot.gov Dallas district camera list
const CAMERAS = [
  {
    id: "us380_colony",
    name: "US-380 @ The Colony",
    highway: "US-380",
    direction: "E/W",
    location: "The Colony",
    lat: 33.0807,
    lon: -96.8867,
    snapshotUrl: "https://its.txdot.gov/ITS_WEB/FrontEnd/snapshots/US 380 @ Colony_DAL.jpg",
  },
  {
    id: "sh121_121",
    name: "SH-121 @ Plano Pkwy",
    highway: "SH-121",
    direction: "E/W",
    location: "The Colony / Frisco",
    lat: 33.1012,
    lon: -96.8823,
    snapshotUrl: "https://its.txdot.gov/ITS_WEB/FrontEnd/snapshots/SH 121 @ Plano Pkwy_DAL.jpg",
  },
  {
    id: "dnt_main",
    name: "Dallas North Tollway @ Main",
    highway: "DNT",
    direction: "N/S",
    location: "Frisco",
    lat: 33.1497,
    lon: -96.8236,
    snapshotUrl: "https://its.txdot.gov/ITS_WEB/FrontEnd/snapshots/DNT @ Main_DAL.jpg",
  },
  {
    id: "i35e_lewisville",
    name: "I-35E @ Round Grove",
    highway: "I-35E",
    direction: "N/S",
    location: "Lewisville",
    lat: 33.0462,
    lon: -97.0001,
    snapshotUrl: "https://its.txdot.gov/ITS_WEB/FrontEnd/snapshots/IH 35E @ Round Grove_DAL.jpg",
  },
  {
    id: "pgbt_colony",
    name: "PGBT @ Plano Rd",
    highway: "PGBT",
    direction: "E/W",
    location: "Plano",
    lat: 33.0504,
    lon: -96.7366,
    snapshotUrl: "https://its.txdot.gov/ITS_WEB/FrontEnd/snapshots/PGBT @ Plano Rd_DAL.jpg",
  },
  {
    id: "us75_campbell",
    name: "US-75 @ Campbell Rd",
    highway: "US-75",
    direction: "N/S",
    location: "Richardson",
    lat: 32.9776,
    lon: -96.7298,
    snapshotUrl: "https://its.txdot.gov/ITS_WEB/FrontEnd/snapshots/US 75 @ Campbell_DAL.jpg",
  },
];

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  // List cameras
  if (!id) {
    return json({
      cameras: CAMERAS.map(({ id, name, highway, direction, location, lat, lon }) => ({
        id, name, highway, direction, location, lat, lon,
        snapshotEndpoint: `/api/traffic-cameras?id=${id}`,
      })),
    });
  }

  // Find camera
  const cam = CAMERAS.find((c) => c.id === id);
  if (!cam) {
    return json({ error: `Camera ${id} not found` }, 404);
  }

  // Check edge cache
  const cacheKey = new Request(`https://jarvis-txdot-cam/${id}`, request);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    const fresh = new Response(cached.body, cached);
    fresh.headers.set("x-cache", "HIT");
    Object.entries(CORS).forEach(([k, v]) => fresh.headers.set(k, v));
    return fresh;
  }

  // Proxy the snapshot JPEG from TxDOT
  try {
    const upstream = await fetch(cam.snapshotUrl, {
      headers: {
        "User-Agent": "JARVIS-Dashboard/1.0 (personal traffic monitoring)",
        "Referer": "https://its.txdot.gov/",
        "Accept": "image/jpeg, image/*, */*",
      },
    });

    if (!upstream.ok) {
      // Return a 1x1 transparent GIF placeholder if camera unavailable
      return new Response(
        Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"),
        {
          status: 200,
          headers: {
            "Content-Type": "image/gif",
            "x-camera-status": "unavailable",
            "x-upstream-status": String(upstream.status),
            ...CORS,
          },
        }
      );
    }

    const response = new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=30",
        "x-cache": "MISS",
        "x-camera-id": id,
        "x-camera-name": cam.name,
        ...CORS,
      },
    });

    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;

  } catch (err) {
    return json({ error: "Camera fetch failed", detail: String(err) }, 502);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
