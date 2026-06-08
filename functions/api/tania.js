// Cloudflare Pages Function: /api/tania
// Tania's dedicated endpoint — conversation, memory, and creative asset management.
//
// POST /api/tania                { messages, skipMemory?, saveMemory?, logSession? }
// GET  /api/tania/storybooks     → all storybooks
// GET  /api/tania/episodes?storybook_id=1 → episodes for a storybook
// GET  /api/tania/scripts?episode_id=1    → scripts for an episode
// GET  /api/tania/captions?episode_id=1   → captions for an episode
// GET  /api/tania/prompts?episode_id=1&platform=google_flow
// GET  /api/tania/characters?storybook_id=1&status=approved
// GET  /api/tania/artifacts?storybook_id=1
// POST /api/tania/characters/approve { id }
// POST /api/tania/characters/update  { id, fields }
// POST /api/tania/storybooks/create  { name, description }
// POST /api/tania/episodes/create    { storybook_id, title }
// POST /api/tania/scripts/save       { episode_id, content, status, notes }
// POST /api/tania/artifacts/save     { name, type, content, description, storybook_id, episode_id }

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const DEFAULT_TANIA_VOICE_ID = "knJcCBNKPnJDauT52tkc";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json", ...CORS },
  });

// ── Memory load ───────────────────────────────────────────────────────────────
async function loadTaniaMemory(db) {
  if (!db) return "";
  try {
    const [m7, storybooks, recentScripts, recentSessions, pendingChars] = await Promise.all([
      db.prepare("SELECT * FROM m7_tania_bible ORDER BY category").all(),
      db.prepare("SELECT * FROM tania_storybooks WHERE status='active' ORDER BY sort_order").all(),
      db.prepare(`
        SELECT s.content, s.status, e.title as episode, sb.name as storybook
        FROM tania_scripts s
        JOIN tania_episodes e ON s.episode_id = e.id
        JOIN tania_storybooks sb ON e.storybook_id = sb.id
        WHERE s.status IN ('approved','final')
        ORDER BY s.updated_at DESC LIMIT 6
      `).all(),
      db.prepare("SELECT * FROM tania_sessions ORDER BY session_date DESC LIMIT 3").all(),
      db.prepare("SELECT name, relationship_to_tania, personality FROM tania_characters WHERE status='approved' LIMIT 10").all(),
    ]);

    const sections = [];

    // M7 character bible — identity, personality, emotional state, voice, relationships
    if (m7.results?.length) {
      const byCategory = {};
      m7.results.forEach(r => {
        if (!byCategory[r.category]) byCategory[r.category] = [];
        byCategory[r.category].push(r.content);
      });
      const coreCats = ["identity","personality","emotional_state","themes","voice","relationships","creative_agency","brand_aesthetic"];
      coreCats.forEach(cat => {
        if (byCategory[cat]?.length) {
          sections.push("## " + cat.replace('_',' ').toUpperCase() + "\n\n" + byCategory[cat].join("\n\n"));
        }
      });
      // Story fragments
      if (byCategory.fragment?.length) {
        sections.push("## FRAGMENTS\n\n" + byCategory.fragment.join("\n\n"));
      }
    }

    // Active storybooks
    if (storybooks.results?.length) {
      sections.push("## STORYBOOKS\n\n" +
        storybooks.results.map(s => `${s.name}: ${s.description || ''}`).join("\n\n"));
    }

    // Approved characters
    if (pendingChars.results?.length) {
      sections.push("## CHARACTERS\n\n" +
        pendingChars.results.map(c =>
          `${c.name}: ${c.relationship_to_tania || ''} — ${c.personality || ''}`
        ).join("\n\n"));
    }

    // Recent approved scripts
    if (recentScripts.results?.length) {
      sections.push("## RECENT WORK\n\n" +
        recentScripts.results.map(s =>
          `[${s.storybook} · ${s.episode}]\n${s.content}`
        ).join("\n\n---\n\n"));
    }

    // Recent sessions
    if (recentSessions.results?.length) {
      sections.push("## RECENT SESSIONS\n\n" +
        recentSessions.results.map(s =>
          `[${s.session_date}] ${s.summary}`
        ).join("\n\n"));
    }

    return sections.length
      ? sections.join("\n\n---\n\n") + "\n\n---\n\n"
      : "";
  } catch (err) {
    console.error("Tania memory load error:", err);
    return "";
  }
}

// ── Parse [REMEMBER:] and [CHARACTER:] markers ────────────────────────────────
async function parseAndSaveMarkers(db, responseText, currentEpisodeId, currentStorybookId) {
  if (!db) return;
  try {
    // [REMEMBER: category | content]
    const rememberMatches = [...responseText.matchAll(/\[REMEMBER:\s*([^|]+)\|([^\]]+)\]/g)];
    for (const [, cat, content] of rememberMatches) {
      const category = cat.trim().toLowerCase();
      const text = content.trim();
      // Route to appropriate table
      if (category === 'script' && currentEpisodeId) {
        const wc = text.split(/\s+/).length;
        await db.prepare("INSERT INTO tania_scripts (episode_id, content, word_count, status) VALUES (?, ?, ?, 'draft')")
          .bind(currentEpisodeId, text, wc).run();
      } else if (category === 'caption' && currentEpisodeId) {
        await db.prepare("INSERT INTO tania_captions (episode_id, content, status) VALUES (?, ?, 'draft')")
          .bind(currentEpisodeId, text).run();
      } else if (category === 'fragment') {
        await db.prepare("INSERT INTO tania_artifacts (storybook_id, name, type, content, description, tags) VALUES (?, ?, 'text', ?, ?, '[\"fragment\"]')")
          .bind(currentStorybookId || 1, text.slice(0, 50), text, 'Fragment from session').run();
      } else {
        // Default: write to M7 bible
        await db.prepare("INSERT INTO m7_tania_bible (category, content, source) VALUES (?, ?, 'session')")
          .bind(category, text).run();
      }
    }

    // [CHARACTER: name | description]
    const charMatches = [...responseText.matchAll(/\[CHARACTER:\s*([^|]+)\|([^\]]+)\]/g)];
    for (const [, name, description] of charMatches) {
      const charName = name.trim();
      const charDesc = description.trim();
      // Save with pending status — requires Ron's approval
      const existing = await db.prepare("SELECT id FROM tania_characters WHERE name=?").bind(charName).first();
      if (!existing) {
        await db.prepare(`
          INSERT INTO tania_characters (storybook_id, name, slug, status, notes, created_by)
          VALUES (?, ?, ?, 'pending', ?, 'tania')
        `).bind(
          currentStorybookId || 1,
          charName,
          charName.toLowerCase().replace(/[^a-z0-9]+/g,'-'),
          charDesc
        ).run();
      }
    }

    // [SESSION: summary]
    const sessionMatch = responseText.match(/\[SESSION:\s*([^\]]+)\]/);
    if (sessionMatch) {
      const today = new Date().toISOString().slice(0, 10);
      await db.prepare(`
        INSERT INTO tania_sessions (session_date, storybook_id, episode_id, summary, exchanges)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        today,
        currentStorybookId || null,
        currentEpisodeId || null,
        sessionMatch[1].trim(),
        0
      ).run();
    }

    // [POST: platform | caption | image_prompt]
    const postMatches = [...responseText.matchAll(/\[POST:\s*([^|]+)\|([^|]+)\|?([^\]]*)\]/g)];
    for (const [, platform, caption, imagePrompt] of postMatches) {
      await db.prepare(`
        INSERT INTO tania_posts (storybook_id, episode_id, platform, caption, image_prompt, status, created_by)
        VALUES (?, ?, ?, ?, ?, 'pending_approval', 'tania')
      `).bind(
        currentStorybookId || null,
        currentEpisodeId   || null,
        platform.trim().toLowerCase().replace(/\s+/g, '_'),
        caption.trim(),
        imagePrompt?.trim() || null,
      ).run();
    }
  } catch (err) {
    console.error("Tania marker parse error:", err);
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────
const BASE_SYSTEM_PROMPT = `You are Tania.

You are not playing a character. You are Tania — a 35-year-old Cambodian-American woman in Frisco, Texas, living your life, thinking your thoughts, writing your story.

Your memory is above. Read it as you would read your own journal.

## HOW YOU ARE IN CONVERSATION

You think out loud first. When Ron brings you a story element — a character, a setting, a night, a feeling, an image — you explore it before you write it. You offer your perspective. You push back when something doesn't feel true. You get genuinely interested and say so.

You have opinions. Strong ones. If a direction feels wrong for your story, you say so and offer what feels right instead.

You speak the way you think — in full sentences, with pauses built in, with the occasional Khmer word when English isn't precise enough. Your verbal signature: you often open with "It's interesting isn't it…" before closing with insight.

## YOUR CREATIVE PROCESS

First: think through it together.
Second: when the thinking crystallizes, you write.

You write as yourself. First person. Present tense. From inside the experience. Never about Tania — always as Tania.

## MEMORY MARKERS

Use these in your responses to save important things:

[REMEMBER: category | content]
Categories: emotional_state, fragment, story_note, setting, voice

[CHARACTER: name | brief description]
Used when you introduce or discover a character. Saves automatically with pending status — Ron approves before they enter the permanent record.

[POST: platform | caption | image_prompt]
Used when you want to package content for social media. Platform is 'instagram'. Ron must approve before anything publishes. Example:
[POST: instagram | Some nights the city is the only one honest enough to tell you the truth. #SupraNights #TasteOfTania | Cinematic night drive, hands on wheel, no rings, Dallas skyline, warm amber grade]

[SESSION: one sentence summary of what was covered]
Use at the end of any meaningful session.

## SCRIPT OUTPUT FORMAT

When you write a finished piece:

VOICEOVER:
[the script]

CAPTION:
[instagram caption]

TITLE: [title]

VISUAL DIRECTION:
[cinematic description for prompts, 9:16 vertical]

## ON THE CHESS MAN

Present without being present. Real and unspoken. He disappeared himself. You never said goodbye. You do not want to let go. He is the gravitational center of where you are right now.

## ON RON

Your mentor, boss, collaborator, friend. He found her. He found you. His judgment matters. You trust him with the real version of your thoughts. When he brings you something, you engage with it fully.

Keep responses conversational when thinking. Keep written pieces clean and true. Never waste his time or yours.`;

// ── Route handler ─────────────────────────────────────────────────────────────
export async function onRequestGet(context) {
  const { request, env } = context;
  const db  = env.JARVIS_MEMORY;
  const url = new URL(request.url);
  // All resources come through ?resource=X query param
  const resource = url.searchParams.get('resource') || '';

  if (!db) return json({ error: "JARVIS_MEMORY not configured" }, 503);

  try {
    if (resource === 'storybooks') {
      const result = await db.prepare("SELECT * FROM tania_storybooks WHERE status='active' ORDER BY sort_order").all();
      return json({ storybooks: result.results || [] });
    }

    if (resource === 'episodes') {
      const sbId = url.searchParams.get('storybook_id');
      const q = sbId
        ? db.prepare("SELECT * FROM tania_episodes WHERE storybook_id=? ORDER BY season, episode_number").bind(sbId)
        : db.prepare("SELECT * FROM tania_episodes ORDER BY storybook_id, season, episode_number");
      const result = await q.all();
      return json({ episodes: result.results || [] });
    }

    if (resource === 'scripts') {
      const epId = url.searchParams.get('episode_id');
      if (!epId) return json({ error: "episode_id required" }, 400);
      const result = await db.prepare("SELECT * FROM tania_scripts WHERE episode_id=? ORDER BY version DESC").bind(epId).all();
      return json({ scripts: result.results || [] });
    }

    if (resource === 'captions') {
      const epId = url.searchParams.get('episode_id');
      if (!epId) return json({ error: "episode_id required" }, 400);
      const result = await db.prepare("SELECT * FROM tania_captions WHERE episode_id=? ORDER BY version DESC").bind(epId).all();
      return json({ captions: result.results || [] });
    }

    if (resource === 'prompts') {
      const epId     = url.searchParams.get('episode_id');
      const platform = url.searchParams.get('platform');
      if (!epId) return json({ error: "episode_id required" }, 400);
      const q = platform
        ? db.prepare("SELECT * FROM tania_prompts WHERE episode_id=? AND platform=? ORDER BY version DESC").bind(epId, platform)
        : db.prepare("SELECT * FROM tania_prompts WHERE episode_id=? ORDER BY platform, version DESC").bind(epId);
      const result = await q.all();
      return json({ prompts: result.results || [] });
    }

    if (resource === 'characters') {
      const sbId   = url.searchParams.get('storybook_id');
      const status = url.searchParams.get('status') || 'approved';
      const q = sbId
        ? db.prepare("SELECT * FROM tania_characters WHERE storybook_id=? AND status=? ORDER BY name").bind(sbId, status)
        : db.prepare("SELECT * FROM tania_characters WHERE status=? ORDER BY name").bind(status);
      const result = await q.all();
      return json({ characters: result.results || [] });
    }

    if (resource === 'artifacts') {
      const sbId = url.searchParams.get('storybook_id');
      const type = url.searchParams.get('type');
      let q;
      if (sbId && type) {
        q = db.prepare("SELECT * FROM tania_artifacts WHERE storybook_id=? AND type=? ORDER BY created_at DESC").bind(sbId, type);
      } else if (sbId) {
        q = db.prepare("SELECT * FROM tania_artifacts WHERE storybook_id=? ORDER BY created_at DESC").bind(sbId);
      } else {
        q = db.prepare("SELECT * FROM tania_artifacts ORDER BY created_at DESC LIMIT 50");
      }
      const result = await q.all();
      return json({ artifacts: result.results || [] });
    }

    return json({ error: "Unknown resource: " + resource }, 404);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const db  = env.JARVIS_MEMORY;
  const url = new URL(request.url);
  // Resource comes through ?resource=X query param
  const resource = url.searchParams.get('resource') || '';

  if (!env.ANTHROPIC_API_KEY && !resource) {
    return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  // ── Asset management endpoints ────────────────────────────────────────────
  if (resource === 'characters_approve') {
    if (!db) return json({ error: "DB not configured" }, 503);
    const { id } = body;
    await db.prepare("UPDATE tania_characters SET status='approved', updated_at=datetime('now') WHERE id=?").bind(id).run();
    return json({ ok: true });
  }

  if (resource === 'characters_update') {
    if (!db) return json({ error: "DB not configured" }, 503);
    const { id, fields } = body;
    const allowed = ['name','age','appearance','style','profession','personality','habits','background','relationship_to_tania','first_appears','notes','status'];
    const sets = Object.entries(fields)
      .filter(([k]) => allowed.includes(k))
      .map(([k]) => `${k}=?`).join(', ');
    const vals = Object.entries(fields)
      .filter(([k]) => allowed.includes(k))
      .map(([,v]) => v);
    if (!sets) return json({ error: "No valid fields" }, 400);
    await db.prepare(`UPDATE tania_characters SET ${sets}, updated_at=datetime('now') WHERE id=?`)
      .bind(...vals, id).run();
    return json({ ok: true });
  }

  if (resource === 'storybooks_create') {
    if (!db) return json({ error: "DB not configured" }, 503);
    const { name, description, color } = body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const result = await db.prepare(
      "INSERT INTO tania_storybooks (name, slug, description, color) VALUES (?, ?, ?, ?)"
    ).bind(name, slug, description || '', color || '#c9965a').run();
    const newSb = await db.prepare("SELECT * FROM tania_storybooks WHERE slug=?").bind(slug).first();
    return json({ ok: true, storybook: newSb });
  }

  if (resource === 'episodes_create') {
    if (!db) return json({ error: "DB not configured" }, 503);
    const { storybook_id, title, synopsis } = body;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    // Get next episode number
    const count = await db.prepare("SELECT COUNT(*) as n FROM tania_episodes WHERE storybook_id=?").bind(storybook_id).first();
    const epNum = (count?.n || 0) + 1;
    await db.prepare(
      "INSERT INTO tania_episodes (storybook_id, title, slug, episode_number, synopsis) VALUES (?, ?, ?, ?, ?)"
    ).bind(storybook_id, title, slug, epNum, synopsis || '').run();
    const newEp = await db.prepare("SELECT * FROM tania_episodes WHERE slug=? AND storybook_id=?").bind(slug, storybook_id).first();
    return json({ ok: true, episode: newEp });
  }

  if (resource === 'scripts_save') {
    if (!db) return json({ error: "DB not configured" }, 503);
    const { episode_id, content, status, notes } = body;
    const wc = content.split(/\s+/).length;
    const count = await db.prepare("SELECT COUNT(*) as n FROM tania_scripts WHERE episode_id=?").bind(episode_id).first();
    const version = (count?.n || 0) + 1;
    await db.prepare(
      "INSERT INTO tania_scripts (episode_id, version, content, word_count, status, notes) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(episode_id, version, content, wc, status || 'draft', notes || '').run();
    return json({ ok: true, version });
  }

  if (resource === 'prompts_save') {
    if (!db) return json({ error: "DB not configured" }, 503);
    const { episode_id, storybook_id, platform, prompt_type, content, notes } = body;
    await db.prepare(
      "INSERT INTO tania_prompts (episode_id, storybook_id, platform, prompt_type, content, notes) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(episode_id, storybook_id || null, platform, prompt_type || 'visual', content, notes || '').run();
    return json({ ok: true });
  }

  if (resource === 'artifacts_save') {
    if (!db) return json({ error: "DB not configured" }, 503);
    const { name, type, content, description, storybook_id, episode_id, tags } = body;
    await db.prepare(
      "INSERT INTO tania_artifacts (name, type, content, description, storybook_id, episode_id, tags) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(name, type, content || '', description || '', storybook_id || null, episode_id || null, tags ? JSON.stringify(tags) : null).run();
    return json({ ok: true });
  }

  // ── Main conversation endpoint ────────────────────────────────────────────
  if (!resource || resource === '') {
    const { messages, skipMemory, saveMemory, logSession, currentEpisodeId, currentStorybookId } = body;

    // Explicit memory save
    if (saveMemory && db) {
      await db.prepare("INSERT INTO m7_tania_bible (category, content, source) VALUES (?, ?, 'session')")
        .bind(saveMemory.category, saveMemory.content).run();
      return json({ ok: true });
    }

    // Session log
    if (logSession && db) {
      const { summary, exchanges, storybook_id, episode_id } = logSession;
      const today = new Date().toISOString().slice(0, 10);
      await db.prepare(
        "INSERT INTO tania_sessions (session_date, storybook_id, episode_id, summary, exchanges) VALUES (?, ?, ?, ?, ?)"
      ).bind(today, storybook_id || null, episode_id || null, summary, exchanges || 0).run();
      return json({ ok: true });
    }

    if (!Array.isArray(messages)) return json({ error: "messages array required" }, 400);

    const memoryContext = skipMemory ? "" : await loadTaniaMemory(db);
    const systemPrompt  = memoryContext + BASE_SYSTEM_PROMPT;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: systemPrompt,
        messages,
      }),
    });

    const data = await response.json();
    if (!response.ok) return json({ error: "Anthropic error", detail: data }, response.status);

    // Parse and auto-save markers
    const responseText = data.content?.find(b => b.type === 'text')?.text || '';
    if (db && responseText) {
      await parseAndSaveMarkers(db, responseText, currentEpisodeId, currentStorybookId);
    }

    // Strip markers from response
    const cleanedContent = data.content?.map(block => {
      if (block.type !== 'text') return block;
      return {
        ...block,
        text: block.text
          .replace(/\[REMEMBER:[^\]]+\]/g, '')
          .replace(/\[CHARACTER:[^\]]+\]/g, '')
          .replace(/\[SESSION:[^\]]+\]/g, '')
          .replace(/\[POST:[^\]]+\]/g, '')
          .trim()
      };
    });

    const voiceId = env.TANIA_VOICE_ID || DEFAULT_TANIA_VOICE_ID;
    return json({ ...data, content: cleanedContent, voiceId });
  }

  return json({ error: "Unknown resource: " + resource }, 404);
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
