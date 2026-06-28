// functions/api/contacts.js
// GET    /api/contacts              — list all contacts
// GET    /api/contacts?name=xxx     — look up by name (fuzzy)
// POST   /api/contacts              — save { name, email, notes? }
// DELETE /api/contacts?name=xxx     — remove by name

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}
const json = (d, s = 200) => new Response(JSON.stringify(d), {
  status: s, headers: { "Content-Type": "application/json", ...CORS }
})

const KV_PREFIX = "contact:"

export async function onRequestGet(context) {
  const { request, env } = context
  if (!env.JARVIS_KV) return json({ error: "JARVIS_KV not configured" }, 503)

  const url = new URL(request.url)
  const nameQuery = url.searchParams.get("name")?.toLowerCase().trim()

  try {
    // List all contacts
    const list = await env.JARVIS_KV.list({ prefix: KV_PREFIX })
    const contacts = await Promise.all(
      (list.keys || []).map(async k => {
        const val = await env.JARVIS_KV.get(k.name, "json")
        return val
      })
    )
    const valid = contacts.filter(Boolean)

    if (nameQuery) {
      // Fuzzy match — find contacts where name includes the query
      const matches = valid.filter(c =>
        c.name?.toLowerCase().includes(nameQuery) ||
        c.email?.toLowerCase().includes(nameQuery)
      )
      return json({ contacts: matches, query: nameQuery })
    }

    return json({ contacts: valid.sort((a, b) => a.name.localeCompare(b.name)) })
  } catch (err) { return json({ error: String(err) }, 500) }
}

export async function onRequestPost(context) {
  const { request, env } = context
  if (!env.JARVIS_KV) return json({ error: "JARVIS_KV not configured" }, 503)

  let body
  try { body = await request.json() } catch { return json({ error: "Invalid JSON" }, 400) }

  const { name, email, notes } = body
  if (!name || !email) return json({ error: "name and email required" }, 400)

  // Validate email format loosely
  if (!email.includes("@")) return json({ error: "Invalid email address" }, 400)

  const contact = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    notes: notes?.trim() || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const key = KV_PREFIX + name.trim().toLowerCase().replace(/\s+/g, "_")

  try {
    await env.JARVIS_KV.put(key, JSON.stringify(contact))
    return json({ ok: true, contact })
  } catch (err) { return json({ error: String(err) }, 500) }
}

export async function onRequestDelete(context) {
  const { request, env } = context
  if (!env.JARVIS_KV) return json({ error: "JARVIS_KV not configured" }, 503)

  const url = new URL(request.url)
  const name = url.searchParams.get("name")?.trim()
  if (!name) return json({ error: "name required" }, 400)

  const key = KV_PREFIX + name.toLowerCase().replace(/\s+/g, "_")

  try {
    await env.JARVIS_KV.delete(key)
    return json({ ok: true, deleted: name })
  } catch (err) { return json({ error: String(err) }, 500) }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS })
}
