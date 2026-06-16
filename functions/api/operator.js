// Cloudflare Pages Function: /api/operator
// JARVIS operator tools — GitHub and Cloudflare API access
//
// POST /api/operator?resource=push_files         — push files to a GitHub repo
// POST /api/operator?resource=create_pages       — create Cloudflare Pages project
// POST /api/operator?resource=create_d1          — create a D1 database
// POST /api/operator?resource=set_env_vars       — set environment variables
// POST /api/operator?resource=trigger_deploy     — trigger a Pages deployment
// GET  /api/operator?resource=deploy_status      — check deployment status
// GET  /api/operator?resource=list_repos         — list accessible repos
// GET  /api/operator?resource=list_pages         — list Cloudflare Pages projects

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json", ...CORS },
  });

// ── GitHub API helpers ────────────────────────────────────────────────────
const ghBase = "https://api.github.com";

function ghHeaders(token) {
  return {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
    "User-Agent": "JARVIS-Operator/1.0",
  };
}

async function ghRequest(token, method, path, body) {
  const res = await fetch(`${ghBase}${path}`, {
    method,
    headers: ghHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`GitHub ${method} ${path}: ${data.message || res.status}`);
  return data;
}

async function pushFiles(token, owner, repo, files, message, branch = "main") {
  let baseSha = null;
  let baseTree = null;

  try {
    const ref = await ghRequest(token, "GET", `/repos/${owner}/${repo}/git/ref/heads/${branch}`);
    baseSha = ref.object.sha;
    const commit = await ghRequest(token, "GET", `/repos/${owner}/${repo}/git/commits/${baseSha}`);
    baseTree = commit.tree.sha;
  } catch {
    // Empty repo — no base commit yet
  }

  const treeItems = await Promise.all(
    files.map(async (f) => {
      const blob = await ghRequest(token, "POST", `/repos/${owner}/${repo}/git/blobs`, {
        content: btoa(unescape(encodeURIComponent(f.content))),
        encoding: "base64",
      });
      return { path: f.path, mode: "100644", type: "blob", sha: blob.sha };
    })
  );

  const treeBody = baseTree
    ? { base_tree: baseTree, tree: treeItems }
    : { tree: treeItems };
  const tree = await ghRequest(token, "POST", `/repos/${owner}/${repo}/git/trees`, treeBody);

  const commitBody = {
    message,
    tree: tree.sha,
    ...(baseSha ? { parents: [baseSha] } : {}),
  };
  const newCommit = await ghRequest(token, "POST", `/repos/${owner}/${repo}/git/commits`, commitBody);

  try {
    if (baseSha) {
      await ghRequest(token, "PATCH", `/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
        sha: newCommit.sha, force: false,
      });
    } else {
      await ghRequest(token, "POST", `/repos/${owner}/${repo}/git/refs`, {
        ref: `refs/heads/${branch}`, sha: newCommit.sha,
      });
    }
  } catch {
    await ghRequest(token, "PATCH", `/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      sha: newCommit.sha, force: true,
    });
  }

  return { sha: newCommit.sha, files: files.length };
}

// ── Cloudflare API helpers ────────────────────────────────────────────────
const cfBase = "https://api.cloudflare.com/client/v4";

function cfHeaders(token) {
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function cfRequest(token, method, path, body) {
  const res = await fetch(`${cfBase}${path}`, {
    method,
    headers: cfHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.success) throw new Error(`Cloudflare ${method} ${path}: ${JSON.stringify(data.errors)}`);
  return data.result;
}

// ── GET handler ───────────────────────────────────────────────────────────
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const resource = url.searchParams.get("resource") || "";
  const ghToken  = env.GITHUB_TOKEN;
  const cfToken  = env.CLOUDFLARE_API_TOKEN;
  const cfAccount = env.CLOUDFLARE_ACCOUNT_ID;

  try {
    if (resource === "list_repos") {
      if (!ghToken) return json({ error: "GITHUB_TOKEN not configured" }, 503);
      const repos = await ghRequest(ghToken, "GET", "/user/repos?sort=updated&per_page=30");
      return json({ repos: repos.map(r => ({ name: r.name, full_name: r.full_name, private: r.private, updated_at: r.updated_at })) });
    }

    if (resource === "list_pages") {
      if (!cfToken || !cfAccount) return json({ error: "Cloudflare credentials not configured" }, 503);
      const projects = await cfRequest(cfToken, "GET", `/accounts/${cfAccount}/pages/projects`);
      return json({ projects: projects.map(p => ({ name: p.name, subdomain: p.subdomain, created_on: p.created_on })) });
    }

    if (resource === "deploy_status") {
      if (!cfToken || !cfAccount) return json({ error: "Cloudflare credentials not configured" }, 503);
      const project = url.searchParams.get("project");
      if (!project) return json({ error: "project required" }, 400);
      const deployments = await cfRequest(cfToken, "GET", `/accounts/${cfAccount}/pages/projects/${project}/deployments?per_page=1`);
      const latest = deployments[0];
      return json({
        status: latest?.latest_stage?.status,
        stage: latest?.latest_stage?.name,
        url: latest?.url,
        created_on: latest?.created_on,
      });
    }

    return json({ error: "Unknown resource" }, 404);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

// ── POST handler ──────────────────────────────────────────────────────────
export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const resource = url.searchParams.get("resource") || "";
  const ghToken  = env.GITHUB_TOKEN;
  const cfToken  = env.CLOUDFLARE_API_TOKEN;
  const cfAccount = env.CLOUDFLARE_ACCOUNT_ID;

  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  try {
    if (resource === "push_files") {
      if (!ghToken) return json({ error: "GITHUB_TOKEN not configured" }, 503);
      const { owner, repo, files, message, branch } = body;
      if (!owner || !repo || !files?.length) return json({ error: "owner, repo, files required" }, 400);
      const result = await pushFiles(ghToken, owner, repo, files, message || "JARVIS: initial scaffold", branch || "main");
      return json({ ok: true, ...result });
    }

    if (resource === "create_pages") {
      if (!cfToken || !cfAccount) return json({ error: "Cloudflare credentials not configured" }, 503);
      const { name, owner, repo, branch, build_command, output_dir } = body;
      if (!name || !owner || !repo) return json({ error: "name, owner, repo required" }, 400);
      const project = await cfRequest(cfToken, "POST", `/accounts/${cfAccount}/pages/projects`, {
        name,
        production_branch: branch || "main",
        source: {
          type: "github",
          config: {
            owner,
            repo_name: repo,
            production_branch: branch || "main",
            pr_comments_enabled: false,
            deployments_enabled: true,
          },
        },
        build_config: {
          build_command: build_command || "",
          destination_dir: output_dir || "",
          root_dir: "",
        },
      });
      return json({ ok: true, name: project.name, subdomain: project.subdomain, url: `https://${project.subdomain}.pages.dev` });
    }

    if (resource === "create_d1") {
      if (!cfToken || !cfAccount) return json({ error: "Cloudflare credentials not configured" }, 503);
      const { name } = body;
      if (!name) return json({ error: "name required" }, 400);
      const db = await cfRequest(cfToken, "POST", `/accounts/${cfAccount}/d1/database`, { name });
      return json({ ok: true, id: db.uuid, name: db.name });
    }

    if (resource === "set_env_vars") {
      if (!cfToken || !cfAccount) return json({ error: "Cloudflare credentials not configured" }, 503);
      const { project, vars } = body;
      if (!project || !vars) return json({ error: "project and vars required" }, 400);
      const envVars = {};
      for (const [k, v] of Object.entries(vars)) {
        envVars[k] = { type: "secret_text", value: v };
      }
      await cfRequest(cfToken, "PATCH", `/accounts/${cfAccount}/pages/projects/${project}`, {
        deployment_configs: {
          production: { env_vars: envVars },
          preview: { env_vars: envVars },
        },
      });
      return json({ ok: true, vars: Object.keys(vars) });
    }

    if (resource === "trigger_deploy") {
      if (!cfToken || !cfAccount) return json({ error: "Cloudflare credentials not configured" }, 503);
      const { project } = body;
      if (!project) return json({ error: "project required" }, 400);
      const deploy = await cfRequest(cfToken, "POST", `/accounts/${cfAccount}/pages/projects/${project}/deployments`, {});
      return json({ ok: true, id: deploy.id, url: deploy.url, status: deploy.latest_stage?.status });
    }

    return json({ error: "Unknown resource" }, 404);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
