// Cloudflare Pages Function: /api/memory
// Reads and writes JARVIS memory modules from D1.
//
// GET  /api/memory?modules=m1,m2,m3        → fetch specific modules for session start
// GET  /api/memory?module=m4&project=kaso  → fetch filtered module entries
// POST /api/memory                          → write session summary or new entry

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

// Module → table mapping
const MODULE_TABLES = {
  m1: "m1_principal",
  m2: "m2_jarvis_identity",
  m3: "m3_operating_philosophy",
  m4: "m4_portfolio",
  m5: "m5_institutional",
  m6: "m6_ready_room",
  m7: "m7_tania_bible",
  m8: "m8_capabilities",
};

// Fetch a single module's contents
async function fetchModule(db, moduleId, filters = {}) {
  const table = MODULE_TABLES[moduleId];
  if (!table) return { error: `Unknown module: ${moduleId}` };

  let query = `SELECT * FROM ${table}`;
  const params = [];

  if (moduleId === "m4" && filters.project) {
    query += " WHERE project = ?";
    params.push(filters.project);
  } else if (moduleId === "m5" && filters.category) {
    query += " WHERE category = ?";
    params.push(filters.category);
  } else if (moduleId === "m6") {
    query += " ORDER BY session_date DESC LIMIT 10";
  } else if (moduleId === "m8" && filters.status) {
    query += " WHERE status = ?";
    params.push(filters.status);
  }

  const result = await db.prepare(query).bind(...params).all();
  return { module: moduleId, table, rows: result.results || [] };
}

// Build a readable memory context string for the system prompt
function buildMemoryContext(moduleResults) {
  const sections = [];

  for (const result of moduleResults) {
    if (!result.rows || result.rows.length === 0) continue;

    const moduleId = result.module;
    const rows = result.rows;

    switch (moduleId) {
      case "m1": {
        sections.push("## THE PRINCIPAL\n" +
          rows.map(r => `[${r.category.toUpperCase()}] ${r.content}`).join("\n\n"));
        break;
      }
      case "m2": {
        sections.push("## JARVIS IDENTITY\n" +
          rows.map(r => `[${r.category.toUpperCase()}] ${r.content}`).join("\n\n"));
        break;
      }
      case "m3": {
        sections.push("## OPERATING PHILOSOPHY\n" +
          rows.map(r => `[${r.category.toUpperCase()}] ${r.content}`).join("\n\n"));
        break;
      }
      case "m4": {
        const byProject = {};
        rows.forEach(r => {
          if (!byProject[r.project]) byProject[r.project] = [];
          byProject[r.project].push(`  [${r.category}] ${r.content}`);
        });
        sections.push("## PROJECT PORTFOLIO\n" +
          Object.entries(byProject)
            .map(([proj, entries]) => `### ${proj.toUpperCase()}\n${entries.join("\n")}`)
            .join("\n\n"));
        break;
      }
      case "m5": {
        sections.push("## INSTITUTIONAL KNOWLEDGE\n" +
          rows.map(r => `[${r.category.toUpperCase()}] ${r.title}: ${r.content}`).join("\n\n"));
        break;
      }
      case "m6": {
        sections.push("## RECENT SESSIONS\n" +
          rows.slice(0, 5).map(r =>
            `[${r.session_date}] ${r.session_type.toUpperCase()}: ${r.summary}`
          ).join("\n\n"));
        break;
      }
      case "m7": {
        sections.push("## TANIA STORY BIBLE\n" +
          rows.map(r => `[${r.category.toUpperCase()}] ${r.content}`).join("\n\n"));
        break;
      }
      case "m8": {
        const active = rows.filter(r => r.status === "active");
        sections.push("## CAPABILITIES\n" +
          active.map(r => `[${r.name}] ${r.content}`).join("\n\n"));
        break;
      }
    }
  }

  return sections.join("\n\n---\n\n");
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const db = env.JARVIS_MEMORY;

  if (!db) {
    return json({ error: "JARVIS_MEMORY D1 binding not configured" }, 503);
  }

  const url = new URL(request.url);
  const modulesParam = url.searchParams.get("modules");
  const moduleParam  = url.searchParams.get("module");
  const project      = url.searchParams.get("project");
  const category     = url.searchParams.get("category");
  const status       = url.searchParams.get("status");
  const format       = url.searchParams.get("format"); // "context" = readable string

  try {
    // Fetch multiple modules
    if (modulesParam) {
      const moduleIds = modulesParam.split(",").map(m => m.trim().toLowerCase());
      const results = await Promise.all(
        moduleIds.map(id => fetchModule(db, id, { project, category, status }))
      );

      if (format === "context") {
        const contextString = buildMemoryContext(results);
        return json({ context: contextString, modules: moduleIds });
      }

      return json({ results });
    }

    // Fetch single module
    if (moduleParam) {
      const result = await fetchModule(db, moduleParam.toLowerCase(), { project, category, status });
      return json(result);
    }

    // List available modules
    return json({
      modules: Object.keys(MODULE_TABLES),
      tables: MODULE_TABLES,
    });

  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.JARVIS_MEMORY;

  if (!db) {
    return json({ error: "JARVIS_MEMORY D1 binding not configured" }, 503);
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  const { action, module: moduleId, data } = body;

  try {
    switch (action) {

      // Write a session summary to M6
      case "log_session": {
        const { session_date, session_type, summary, key_moments, decisions, next_steps } = data;
        await db.prepare(`
          INSERT INTO m6_ready_room (session_date, session_type, summary, key_moments, decisions, next_steps)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          session_date || new Date().toISOString().slice(0, 10),
          session_type || "briefing",
          summary,
          key_moments ? JSON.stringify(key_moments) : null,
          decisions   ? JSON.stringify(decisions)   : null,
          next_steps  ? JSON.stringify(next_steps)  : null
        ).run();
        return json({ ok: true, action: "log_session" });
      }

      // Add entry to any module
      case "add_entry": {
        const table = MODULE_TABLES[moduleId];
        if (!table) return json({ error: `Unknown module: ${moduleId}` }, 400);

        if (moduleId === "m4") {
          await db.prepare(`
            INSERT INTO m4_portfolio (project, category, content, source)
            VALUES (?, ?, ?, 'session')
          `).bind(data.project, data.category, data.content).run();
        } else if (moduleId === "m5") {
          await db.prepare(`
            INSERT INTO m5_institutional (category, title, content, date_ref, source)
            VALUES (?, ?, ?, ?, 'session')
          `).bind(data.category, data.title, data.content, data.date_ref || null).run();
        } else if (moduleId === "m7") {
          await db.prepare(`
            INSERT INTO m7_tania_bible (category, content, source)
            VALUES (?, ?, 'session')
          `).bind(data.category, data.content).run();
        } else if (moduleId === "m8") {
          await db.prepare(`
            INSERT INTO m8_capabilities (category, name, content, status, source)
            VALUES (?, ?, ?, ?, 'session')
          `).bind(data.category, data.name, data.content, data.status || 'active').run();
        } else {
          await db.prepare(`
            INSERT INTO ${table} (category, content, source)
            VALUES (?, ?, 'session')
          `).bind(data.category, data.content).run();
        }
        return json({ ok: true, action: "add_entry", module: moduleId });
      }

      // Update an existing entry
      case "update_entry": {
        const table = MODULE_TABLES[moduleId];
        if (!table) return json({ error: `Unknown module: ${moduleId}` }, 400);
        await db.prepare(`
          UPDATE ${table} SET content = ?, updated_at = datetime('now') WHERE id = ?
        `).bind(data.content, data.id).run();
        return json({ ok: true, action: "update_entry" });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
