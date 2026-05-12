// Cloudflare Pages Function: /api/calendar
// Stores calendar events in KV. Reuses WATCHLISTS_KV binding.
//
// Event schema:
// { id, title, date (YYYY-MM-DD), startTime (HH:MM), endTime (HH:MM),
//   label (work|personal|health|finance|travel|other), notes, createdAt }
//
// GET  /api/calendar  → { events[], kvAvailable }
// POST /api/calendar  → { action: add|update|delete|save_all|clear, ...payload }

const KV_KEY = "calendar:events";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

const genId = () => `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

async function getEvents(kv) {
  if (!kv) return [];
  try {
    const raw = await kv.get(KV_KEY, { type: "json" });
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

async function saveEvents(kv, events) {
  if (!kv) return;
  await kv.put(KV_KEY, JSON.stringify(events));
}

export async function onRequestGet(context) {
  const kv = context.env.WATCHLISTS_KV;
  const events = await getEvents(kv);
  return json({ events, kvAvailable: !!kv });
}

export async function onRequestPost(context) {
  const kv = context.env.WATCHLISTS_KV;
  let body;
  try { body = await context.request.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  const events = await getEvents(kv);
  const { action } = body;

  if (action === "add") {
    const { title, date, startTime, endTime, label, notes } = body;
    if (!title || !date) return json({ error: "title and date required" }, 400);
    const event = {
      id: genId(),
      title: title.trim(),
      date,
      startTime: startTime || "09:00",
      endTime: endTime || "10:00",
      label: label || "other",
      notes: notes || "",
      createdAt: Date.now(),
    };
    events.push(event);
    await saveEvents(kv, events);
    return json({ ok: true, event, events, kvAvailable: !!kv });
  }

  if (action === "update") {
    const { id, changes } = body;
    const idx = events.findIndex((e) => e.id === id);
    if (idx === -1) return json({ error: `Event ${id} not found` }, 404);
    events[idx] = { ...events[idx], ...changes, id, updatedAt: Date.now() };
    await saveEvents(kv, events);
    return json({ ok: true, event: events[idx], events, kvAvailable: !!kv });
  }

  if (action === "delete") {
    const filtered = events.filter((e) => e.id !== body.id);
    await saveEvents(kv, filtered);
    return json({ ok: true, events: filtered, kvAvailable: !!kv });
  }

  if (action === "save_all") {
    if (!Array.isArray(body.events)) return json({ error: "events array required" }, 400);
    await saveEvents(kv, body.events);
    return json({ ok: true, kvAvailable: !!kv });
  }

  if (action === "clear") {
    await saveEvents(kv, []);
    return json({ ok: true, events: [], kvAvailable: !!kv });
  }

  return json({ error: `Unknown action: ${action}` }, 400);
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
