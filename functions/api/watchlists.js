// Cloudflare Pages Function: /api/watchlists
//
// Manages named watchlists persisted to Cloudflare KV (WATCHLISTS_KV binding).
// Single-tenant — no auth. URL is treated as semi-private.
//
// GET  /api/watchlists         → returns all watchlists
// POST /api/watchlists         → body: { name, symbols[] } — create/update a list
// DELETE /api/watchlists?name= → delete a named list
//
// KV layout: single key "watchlists" stores the entire object as JSON.
// { DEFAULT: ["AAPL","NVDA","MSFT"], TECH: ["AAPL","GOOGL",...], ... }
//
// Max 5 symbols per watchlist enforced here and in the frontend.

const KV_KEY = "watchlists";

const DEFAULT_WATCHLISTS = {
  DEFAULT: ["AAPL", "NVDA", "MSFT"],
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

async function getAll(kv) {
  const raw = await kv.get(KV_KEY);
  if (!raw) return { ...DEFAULT_WATCHLISTS };
  try {
    return JSON.parse(raw);
  } catch {
    return { ...DEFAULT_WATCHLISTS };
  }
}

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.WATCHLISTS_KV) {
    return json({ watchlists: DEFAULT_WATCHLISTS, source: "fallback" });
  }
  const watchlists = await getAll(env.WATCHLISTS_KV);
  // Ensure DEFAULT always exists
  if (!watchlists.DEFAULT) watchlists.DEFAULT = [...DEFAULT_WATCHLISTS.DEFAULT];
  return json({ watchlists, source: "kv" });
}

export async function onRequestPost(context) {
  const { env, request } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { name, symbols } = body;
  if (!name || typeof name !== "string") return json({ error: "name required" }, 400);
  if (!Array.isArray(symbols)) return json({ error: "symbols array required" }, 400);

  const cleanName = name.toUpperCase().trim().replace(/[^A-Z0-9_\- ]/g, "").slice(0, 32);
  const cleanSymbols = [...new Set(symbols.map((s) => s.toUpperCase().trim()).filter(Boolean))].slice(0, 5);

  if (!env.WATCHLISTS_KV) {
    return json({ ok: true, name: cleanName, symbols: cleanSymbols, source: "fallback" });
  }

  const watchlists = await getAll(env.WATCHLISTS_KV);
  watchlists[cleanName] = cleanSymbols;
  await env.WATCHLISTS_KV.put(KV_KEY, JSON.stringify(watchlists));
  return json({ ok: true, name: cleanName, symbols: cleanSymbols, source: "kv" });
}

export async function onRequestDelete(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const name = (url.searchParams.get("name") || "").toUpperCase().trim();
  if (!name) return json({ error: "name query param required" }, 400);
  if (name === "DEFAULT") return json({ error: "Cannot delete DEFAULT watchlist" }, 400);

  if (!env.WATCHLISTS_KV) {
    return json({ ok: true, deleted: name, source: "fallback" });
  }

  const watchlists = await getAll(env.WATCHLISTS_KV);
  delete watchlists[name];
  await env.WATCHLISTS_KV.put(KV_KEY, JSON.stringify(watchlists));
  return json({ ok: true, deleted: name, source: "kv" });
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
