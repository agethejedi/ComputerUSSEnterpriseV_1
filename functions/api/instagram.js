// Cloudflare Pages Function: /api/instagram
// Handles Instagram Graph API posting pipeline.
// All posts require Ron's approval before publishing.
//
// POST /api/instagram?resource=create_post     — save post for approval
// POST /api/instagram?resource=approve_post    — approve and optionally schedule
// POST /api/instagram?resource=reject_post     — reject with notes
// POST /api/instagram?resource=publish_post    — trigger actual publish
// POST /api/instagram?resource=schedule_check  — check and publish scheduled posts
// GET  /api/instagram?resource=pending         — pending approval queue
// GET  /api/instagram?resource=posts           — all posts with filters

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json", ...CORS },
  });

// ── Instagram Graph API ───────────────────────────────────────────────────────
async function igCreateContainer(accessToken, accountId, imageUrl, caption) {
  const url = `https://graph.instagram.com/v18.0/${accountId}/media`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      access_token: accessToken,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.id; // creation_id
}

async function igPublishContainer(accessToken, accountId, creationId) {
  const url = `https://graph.instagram.com/v18.0/${accountId}/media_publish`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: creationId,
      access_token: accessToken,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.id; // instagram media id
}

async function igGetPostUrl(accessToken, mediaId) {
  const url = `https://graph.instagram.com/v18.0/${mediaId}?fields=permalink&access_token=${accessToken}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.permalink || null;
}

// ── GET handler ───────────────────────────────────────────────────────────────
export async function onRequestGet(context) {
  const { request, env } = context;
  const db  = env.JARVIS_MEMORY;
  const url = new URL(request.url);
  const resource = url.searchParams.get("resource") || "";

  if (!db) return json({ error: "DB not configured" }, 503);

  try {
    if (resource === "pending") {
      const result = await db.prepare(`
        SELECT p.*, sb.name as storybook_name, e.title as episode_title
        FROM tania_posts p
        LEFT JOIN tania_storybooks sb ON p.storybook_id = sb.id
        LEFT JOIN tania_episodes e ON p.episode_id = e.id
        WHERE p.status = 'pending_approval'
        ORDER BY p.created_at DESC
      `).all();
      return json({ posts: result.results || [] });
    }

    if (resource === "posts") {
      const status = url.searchParams.get("status");
      const sbId   = url.searchParams.get("storybook_id");
      let q = `
        SELECT p.*, sb.name as storybook_name, e.title as episode_title
        FROM tania_posts p
        LEFT JOIN tania_storybooks sb ON p.storybook_id = sb.id
        LEFT JOIN tania_episodes e ON p.episode_id = e.id
        WHERE 1=1
      `;
      const params = [];
      if (status) { q += " AND p.status = ?"; params.push(status); }
      if (sbId)   { q += " AND p.storybook_id = ?"; params.push(sbId); }
      q += " ORDER BY p.created_at DESC LIMIT 50";
      const result = await db.prepare(q).bind(...params).all();
      return json({ posts: result.results || [] });
    }

    if (resource === "pending_count") {
      const result = await db.prepare(
        "SELECT COUNT(*) as count FROM tania_posts WHERE status='pending_approval'"
      ).first();
      return json({ count: result?.count || 0 });
    }

    return json({ error: "Unknown resource" }, 404);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function onRequestPost(context) {
  const { request, env } = context;
  const db  = env.JARVIS_MEMORY;
  const url = new URL(request.url);
  const resource = url.searchParams.get("resource") || "";

  if (!db) return json({ error: "DB not configured" }, 503);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  try {
    // ── Create post (from Tania or Ron) ──────────────────────────────────────
    if (resource === "create_post") {
      const {
        storybook_id, episode_id, caption, image_prompt,
        hashtags, image_url, platform = "instagram"
      } = body;

      if (!caption) return json({ error: "caption required" }, 400);

      // Build full caption with hashtags
      const fullCaption = hashtags
        ? caption + "\n\n" + hashtags
        : caption;

      const result = await db.prepare(`
        INSERT INTO tania_posts
        (storybook_id, episode_id, platform, caption, image_url, image_prompt, hashtags, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_approval')
      `).bind(
        storybook_id || null,
        episode_id   || null,
        platform,
        fullCaption,
        image_url    || null,
        image_prompt || null,
        hashtags     || null,
      ).run();

      const post = await db.prepare(
        "SELECT * FROM tania_posts WHERE rowid = last_insert_rowid()"
      ).first();

      return json({ ok: true, post });
    }

    // ── Approve post ──────────────────────────────────────────────────────────
    if (resource === "approve_post") {
      const { id, scheduled_at } = body;
      if (!id) return json({ error: "id required" }, 400);

      const newStatus = scheduled_at ? "scheduled" : "approved";
      await db.prepare(`
        UPDATE tania_posts
        SET status = ?, scheduled_at = ?, approved_by = 'ron',
            approved_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).bind(newStatus, scheduled_at || null, id).run();

      // If approved with no schedule — publish immediately
      if (!scheduled_at) {
        const post = await db.prepare("SELECT * FROM tania_posts WHERE id=?").bind(id).first();
        if (post && env.INSTAGRAM_ACCESS_TOKEN && env.INSTAGRAM_ACCOUNT_ID && post.image_url) {
          return publishPost(post, env, db);
        }
        return json({ ok: true, status: newStatus, note: "Approved. Add image URL to publish." });
      }

      return json({ ok: true, status: newStatus, scheduled_at });
    }

    // ── Reject post ───────────────────────────────────────────────────────────
    if (resource === "reject_post") {
      const { id, revision_notes } = body;
      await db.prepare(`
        UPDATE tania_posts
        SET status = 'rejected', revision_notes = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(revision_notes || "", id).run();
      return json({ ok: true, status: "rejected" });
    }

    // ── Manual publish trigger ────────────────────────────────────────────────
    if (resource === "publish_post") {
      const { id } = body;
      const post = await db.prepare("SELECT * FROM tania_posts WHERE id=?").bind(id).first();
      if (!post) return json({ error: "Post not found" }, 404);
      if (!["approved","scheduled"].includes(post.status)) {
        return json({ error: "Post must be approved before publishing" }, 400);
      }
      return publishPost(post, env, db);
    }

    // ── Schedule check — call on a cron or from JARVIS briefing ──────────────
    if (resource === "schedule_check") {
      const now = new Date().toISOString();
      const scheduled = await db.prepare(`
        SELECT * FROM tania_posts
        WHERE status = 'scheduled' AND scheduled_at <= ?
        ORDER BY scheduled_at ASC LIMIT 10
      `).bind(now).all();

      const results = [];
      for (const post of (scheduled.results || [])) {
        const r = await publishPost(post, env, db);
        const d = await r.json();
        results.push({ id: post.id, ...d });
      }
      return json({ processed: results.length, results });
    }

    return json({ error: "Unknown resource" }, 404);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

// ── Publish helper ────────────────────────────────────────────────────────────
async function publishPost(post, env, db) {
  const accessToken = env.INSTAGRAM_ACCESS_TOKEN;
  const accountId   = env.INSTAGRAM_ACCOUNT_ID;

  if (!accessToken || !accountId) {
    // Credentials not yet configured — mark as ready
    await db.prepare(`
      UPDATE tania_posts
      SET status = 'approved', updated_at = datetime('now')
      WHERE id = ?
    `).bind(post.id).run();
    return json({
      ok: false,
      status: "approved",
      note: "Instagram credentials not configured. Post approved and queued. Add INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_ACCOUNT_ID to Cloudflare secrets to enable publishing.",
    });
  }

  if (!post.image_url) {
    return json({
      ok: false,
      status: post.status,
      note: "No image URL attached to this post. Generate image first, then publish.",
    });
  }

  try {
    // Step 1: Create media container
    const creationId = await igCreateContainer(accessToken, accountId, post.image_url, post.caption);

    // Step 2: Publish container
    const mediaId = await igPublishContainer(accessToken, accountId, creationId);

    // Step 3: Get permalink
    const postUrl = await igGetPostUrl(accessToken, mediaId);

    // Update DB
    await db.prepare(`
      UPDATE tania_posts
      SET status = 'published', instagram_media_id = ?, instagram_post_url = ?,
          published_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).bind(mediaId, postUrl, post.id).run();

    return json({ ok: true, status: "published", media_id: mediaId, url: postUrl });
  } catch (err) {
    // Update DB with error
    await db.prepare(`
      UPDATE tania_posts
      SET status = 'publish_failed', revision_notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(String(err), post.id).run();
    return json({ ok: false, error: String(err) }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
