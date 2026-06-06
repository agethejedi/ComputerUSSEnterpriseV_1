// Cloudflare Pages Function: /api/tania-data
// CRUD for Tania's relational creative memory.
// Separate from /api/tania which handles Claude conversation.
//
// GET  /api/tania-data?resource=storybooks
// GET  /api/tania-data?resource=episodes&storybook_id=1
// GET  /api/tania-data?resource=scripts&episode_id=1
// GET  /api/tania-data?resource=characters&status=active
// GET  /api/tania-data?resource=artifacts&storybook_id=1
// POST /api/tania-data { resource, action, data }

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

// ── GET handlers ──────────────────────────────────────────────────────────────
async function getResource(db, resource, params) {
  switch (resource) {

    case "storybooks": {
      const r = await db.prepare(
        "SELECT * FROM tania_storybooks WHERE status = 'active' ORDER BY sort_order ASC"
      ).all();
      return { storybooks: r.results || [] };
    }

    case "episodes": {
      const { storybook_id } = params;
      const q = storybook_id
        ? "SELECT * FROM tania_episodes WHERE storybook_id = ? ORDER BY season_num, episode_num"
        : "SELECT * FROM tania_episodes ORDER BY storybook_id, season_num, episode_num";
      const r = storybook_id
        ? await db.prepare(q).bind(storybook_id).all()
        : await db.prepare(q).all();
      return { episodes: r.results || [] };
    }

    case "scripts": {
      const { episode_id } = params;
      if (!episode_id) return { error: "episode_id required" };
      const r = await db.prepare(
        "SELECT * FROM tania_scripts WHERE episode_id = ? ORDER BY version DESC"
      ).bind(episode_id).all();
      return { scripts: r.results || [] };
    }

    case "captions": {
      const { episode_id } = params;
      if (!episode_id) return { error: "episode_id required" };
      const r = await db.prepare(
        "SELECT * FROM tania_captions WHERE episode_id = ? ORDER BY version DESC"
      ).bind(episode_id).all();
      return { captions: r.results || [] };
    }

    case "prompts": {
      const { episode_id, platform } = params;
      let q = "SELECT * FROM tania_prompts WHERE 1=1";
      const binds = [];
      if (episode_id) { q += " AND episode_id = ?"; binds.push(episode_id); }
      if (platform)   { q += " AND platform = ?";   binds.push(platform); }
      q += " ORDER BY platform, version DESC";
      const r = await db.prepare(q).bind(...binds).all();
      return { prompts: r.results || [] };
    }

    case "characters": {
      const { storybook_id, status } = params;
      let q = "SELECT * FROM tania_characters WHERE 1=1";
      const binds = [];
      if (storybook_id) { q += " AND (storybook_id = ? OR storybook_id IS NULL)"; binds.push(storybook_id); }
      if (status)       { q += " AND status = ?"; binds.push(status); }
      q += " ORDER BY status DESC, name ASC";
      const r = await db.prepare(q).bind(...binds).all();
      return { characters: r.results || [] };
    }

    case "artifacts": {
      const { storybook_id, episode_id, artifact_type } = params;
      let q = "SELECT * FROM tania_artifacts WHERE 1=1";
      const binds = [];
      if (storybook_id)  { q += " AND storybook_id = ?";  binds.push(storybook_id); }
      if (episode_id)    { q += " AND episode_id = ?";     binds.push(episode_id); }
      if (artifact_type) { q += " AND artifact_type = ?";  binds.push(artifact_type); }
      q += " ORDER BY created_at DESC";
      const r = await db.prepare(q).bind(...binds).all();
      return { artifacts: r.results || [] };
    }

    case "sessions": {
      const { storybook_id } = params;
      const q = storybook_id
        ? "SELECT * FROM tania_sessions WHERE storybook_id = ? ORDER BY session_date DESC LIMIT 10"
        : "SELECT * FROM tania_sessions ORDER BY session_date DESC LIMIT 10";
      const r = storybook_id
        ? await db.prepare(q).bind(storybook_id).all()
        : await db.prepare(q).all();
      return { sessions: r.results || [] };
    }

    // Full workspace load — everything needed to render the panel
    case "workspace": {
      const { storybook_id } = params;
      const [storybooks, episodes, characters, artifacts] = await Promise.all([
        db.prepare("SELECT * FROM tania_storybooks WHERE status='active' ORDER BY sort_order").all(),
        storybook_id
          ? db.prepare("SELECT * FROM tania_episodes WHERE storybook_id=? ORDER BY season_num,episode_num").bind(storybook_id).all()
          : db.prepare("SELECT * FROM tania_episodes ORDER BY storybook_id,season_num,episode_num").all(),
        db.prepare("SELECT * FROM tania_characters ORDER BY status DESC, name ASC").all(),
        db.prepare("SELECT * FROM tania_artifacts ORDER BY created_at DESC LIMIT 20").all(),
      ]);
      return {
        storybooks: storybooks.results || [],
        episodes:   episodes.results   || [],
        characters: characters.results || [],
        artifacts:  artifacts.results  || [],
      };
    }

    default:
      return { error: `Unknown resource: ${resource}` };
  }
}

// ── POST handlers ─────────────────────────────────────────────────────────────
async function postResource(db, resource, action, data) {
  switch (`${resource}:${action}`) {

    // ── Storybooks ────────────────────────────────────────────────────────────
    case "storybook:create": {
      const slug = data.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      await db.prepare(
        "INSERT INTO tania_storybooks (name, slug, description, color, sort_order) VALUES (?,?,?,?,?)"
      ).bind(data.name, slug, data.description || '', data.color || '#c9965a', data.sort_order || 99).run();
      const r = await db.prepare("SELECT * FROM tania_storybooks WHERE slug=?").bind(slug).first();
      return { ok: true, storybook: r };
    }

    // ── Episodes ──────────────────────────────────────────────────────────────
    case "episode:create": {
      await db.prepare(
        "INSERT INTO tania_episodes (storybook_id, title, episode_num, season_num, logline, status) VALUES (?,?,?,?,?,?)"
      ).bind(data.storybook_id, data.title, data.episode_num || null, data.season_num || 1, data.logline || '', 'in_progress').run();
      const r = await db.prepare("SELECT last_insert_rowid() as id").first();
      return { ok: true, episode_id: r.id };
    }
    case "episode:update": {
      const fields = ['title','logline','status','notes'].filter(f => data[f] !== undefined);
      if (!fields.length) return { error: "No fields to update" };
      const sets = fields.map(f => `${f}=?`).join(',');
      await db.prepare(`UPDATE tania_episodes SET ${sets}, updated_at=datetime('now') WHERE id=?`)
        .bind(...fields.map(f => data[f]), data.id).run();
      return { ok: true };
    }

    // ── Scripts ───────────────────────────────────────────────────────────────
    case "script:create": {
      const wc = data.content?.split(/\s+/).length || 0;
      await db.prepare(
        "INSERT INTO tania_scripts (episode_id, version, content, word_count, status, notes) VALUES (?,?,?,?,?,?)"
      ).bind(data.episode_id, data.version || 1, data.content, wc, data.status || 'draft', data.notes || '').run();
      // Update episode status to 'draft' if currently in_progress
      await db.prepare("UPDATE tania_episodes SET status='draft', updated_at=datetime('now') WHERE id=? AND status='in_progress'")
        .bind(data.episode_id).run();
      return { ok: true };
    }
    case "script:approve": {
      await db.prepare("UPDATE tania_scripts SET status='approved', updated_at=datetime('now') WHERE id=?")
        .bind(data.id).run();
      await db.prepare("UPDATE tania_episodes SET status='final', updated_at=datetime('now') WHERE id=?")
        .bind(data.episode_id).run();
      return { ok: true };
    }
    case "script:update": {
      const wc = data.content?.split(/\s+/).length || 0;
      await db.prepare("UPDATE tania_scripts SET content=?, word_count=?, status=?, notes=?, updated_at=datetime('now') WHERE id=?")
        .bind(data.content, wc, data.status || 'revision', data.notes || '', data.id).run();
      return { ok: true };
    }

    // ── Captions ──────────────────────────────────────────────────────────────
    case "caption:create": {
      await db.prepare(
        "INSERT INTO tania_captions (episode_id, version, content, platform, status) VALUES (?,?,?,?,?)"
      ).bind(data.episode_id, data.version || 1, data.content, data.platform || 'instagram', 'draft').run();
      return { ok: true };
    }
    case "caption:approve": {
      await db.prepare("UPDATE tania_captions SET status='approved', updated_at=datetime('now') WHERE id=?")
        .bind(data.id).run();
      return { ok: true };
    }

    // ── Prompts ───────────────────────────────────────────────────────────────
    case "prompt:create": {
      await db.prepare(
        "INSERT INTO tania_prompts (episode_id, platform, prompt_type, content, version, status, notes) VALUES (?,?,?,?,?,?,?)"
      ).bind(data.episode_id, data.platform, data.prompt_type || 'video', data.content, data.version || 1, 'draft', data.notes || '').run();
      return { ok: true };
    }
    case "prompt:approve": {
      await db.prepare("UPDATE tania_prompts SET status='approved', updated_at=datetime('now') WHERE id=?")
        .bind(data.id).run();
      return { ok: true };
    }
    case "prompt:update": {
      await db.prepare("UPDATE tania_prompts SET content=?, notes=?, status=?, updated_at=datetime('now') WHERE id=?")
        .bind(data.content, data.notes || '', data.status || 'draft', data.id).run();
      return { ok: true };
    }

    // ── Characters ────────────────────────────────────────────────────────────
    case "character:create": {
      await db.prepare(`
        INSERT INTO tania_characters
          (storybook_id, name, nickname, role, status, physical_desc, age, appearance,
           profession, personality, habits, voice_notes, relationship_to_tania,
           first_appears, story_arc, image_url, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).bind(
        data.storybook_id || null, data.name, data.nickname || null,
        data.role || 'supporting', 'pending',
        data.physical_desc || null, data.age || null, data.appearance || null,
        data.profession || null, data.personality || null, data.habits || null,
        data.voice_notes || null, data.relationship_to_tania || null,
        data.first_appears || null, data.story_arc || null,
        data.image_url || null, data.notes || null
      ).run();
      const r = await db.prepare("SELECT last_insert_rowid() as id").first();
      return { ok: true, character_id: r.id, status: 'pending' };
    }
    case "character:approve": {
      await db.prepare("UPDATE tania_characters SET status='active', updated_at=datetime('now') WHERE id=?")
        .bind(data.id).run();
      return { ok: true };
    }
    case "character:update": {
      const fields = ['name','nickname','role','physical_desc','age','appearance','profession',
                      'personality','habits','voice_notes','relationship_to_tania','first_appears',
                      'story_arc','image_url','notes','status'];
      const toUpdate = fields.filter(f => data[f] !== undefined);
      if (!toUpdate.length) return { error: "No fields to update" };
      const sets = toUpdate.map(f => `${f}=?`).join(',');
      await db.prepare(`UPDATE tania_characters SET ${sets}, updated_at=datetime('now') WHERE id=?`)
        .bind(...toUpdate.map(f => data[f]), data.id).run();
      return { ok: true };
    }
    case "character:archive": {
      await db.prepare("UPDATE tania_characters SET status='archived', updated_at=datetime('now') WHERE id=?")
        .bind(data.id).run();
      return { ok: true };
    }

    // ── Artifacts ─────────────────────────────────────────────────────────────
    case "artifact:create": {
      await db.prepare(
        "INSERT INTO tania_artifacts (storybook_id, episode_id, name, artifact_type, content, description, tags) VALUES (?,?,?,?,?,?,?)"
      ).bind(
        data.storybook_id || null, data.episode_id || null,
        data.name, data.artifact_type, data.content || '',
        data.description || '', data.tags ? JSON.stringify(data.tags) : null
      ).run();
      return { ok: true };
    }
    case "artifact:delete": {
      await db.prepare("DELETE FROM tania_artifacts WHERE id=?").bind(data.id).run();
      return { ok: true };
    }

    // ── Sessions ──────────────────────────────────────────────────────────────
    case "session:log": {
      await db.prepare(
        "INSERT INTO tania_sessions (storybook_id, episode_id, session_date, summary, exchanges, key_moments, decisions) VALUES (?,?,?,?,?,?,?)"
      ).bind(
        data.storybook_id || null, data.episode_id || null,
        data.session_date || new Date().toISOString().slice(0,10),
        data.summary, data.exchanges || 0,
        data.key_moments ? JSON.stringify(data.key_moments) : null,
        data.decisions   ? JSON.stringify(data.decisions)   : null
      ).run();
      return { ok: true };
    }

    default:
      return { error: `Unknown action: ${resource}:${action}` };
  }
}

// ── Main handlers ─────────────────────────────────────────────────────────────
export async function onRequestGet(context) {
  const { request, env } = context;
  const db = env.JARVIS_MEMORY;
  if (!db) return json({ error: "JARVIS_MEMORY not configured" }, 503);

  const url      = new URL(request.url);
  const resource = url.searchParams.get("resource");
  const params   = Object.fromEntries(url.searchParams.entries());

  if (!resource) return json({ error: "resource param required" }, 400);

  try {
    const result = await getResource(db, resource, params);
    return json(result);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.JARVIS_MEMORY;
  if (!db) return json({ error: "JARVIS_MEMORY not configured" }, 503);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  const { resource, action, data } = body;
  if (!resource || !action) return json({ error: "resource and action required" }, 400);

  try {
    const result = await postResource(db, resource, action, data || {});
    return json(result);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
