// Cloudflare Pages Function: /api/calendar
// Stores calendar events in KV (WATCHLISTS_KV binding — reuses same namespace)
// Falls back gracefully if KV not configured.

const KV_KEY = "calendar:events";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function onRequestGet(context) {
  const { env } = context;
  const kv = env.WATCHLISTS_KV;
  let events = [];
  let kvAvailable = false;
  if (kv) {
    try {
      const raw = await kv.get(KV_KEY, { type: "json" });
      events = raw || [];
      kvAvailable = true;
    } catch {}
  }
  return new Response(JSON.stringify({ events, kvAvailable }), {
    status: 200, headers: { "Content-Type": "application/json", ...CORS },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const kv = env.WATCHLISTS_KV;
  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json", ...CORS } });
  }
  const { action, events } = body;
  if (action === "save_all") {
    if (kv) {
      try { await kv.put(KV_KEY, JSON.stringify(events || [])); } catch {}
    }
    return new Response(JSON.stringify({ ok: true, kvAvailable: !!kv }), {
      status: 200, headers: { "Content-Type": "application/json", ...CORS },
    });
  }
  return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: { "Content-Type": "application/json", ...CORS } });
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
