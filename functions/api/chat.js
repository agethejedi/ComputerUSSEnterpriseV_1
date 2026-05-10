// Cloudflare Pages Function: /api/chat
// Proxies requests to the Anthropic API. API key lives in Cloudflare env vars.

const TOOLS = [
  {
    name: "get_weather",
    description: "Get LIVE weather data from NOAA / National Weather Service. For 'local' scope, returns current observed conditions for The Colony, TX, plus four forecast periods (6 AM, noon, 6 PM, midnight) and any active alerts. For 'national' scope, returns current temperatures for major US cities. Always call this when the user asks about weather, conditions, temperature, forecast, rain, storms, or alerts — never make up weather values.",
    input_schema: {
      type: "object",
      properties: {
        scope: {
          type: "string",
          enum: ["local", "national"],
          description: "'local' for The Colony TX detail, 'national' for major-city overview.",
        },
      },
    },
  },
  {
    name: "get_market_data",
    description: "Get current price and change data for stocks on the user's watchlist or commodity ETFs. Use this for any question about market prices or movement.",
    input_schema: {
      type: "object",
      properties: {
        symbols: {
          type: "array",
          items: { type: "string" },
          description: "List of symbols or names. Use ['all'] to fetch entire active watchlist plus commodities.",
        },
        listName: {
          type: "string",
          description: "Optional: fetch a specific named watchlist instead of the active one.",
        },
      },
      required: ["symbols"],
    },
  },
  {
    name: "list_watchlists",
    description: "Returns all saved watchlists and their symbols. Use when the user asks what lists exist, or before adding/removing to confirm current state.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "create_watchlist",
    description: "Create a new named watchlist with up to 5 validated symbols. For thematic requests ('create a financials list'), propose the symbols to the user before calling this — don't add them silently. Max 5 symbols per list.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Short name for the list, e.g. 'TECH', 'FINANCIALS'." },
        symbols: {
          type: "array",
          items: { type: "string" },
          description: "Up to 5 ticker symbols, e.g. ['AAPL','MSFT','GOOGL'].",
        },
      },
      required: ["name", "symbols"],
    },
  },
  {
    name: "delete_watchlist",
    description: "Delete a named watchlist. Cannot delete DEFAULT. Confirm with the user before deleting.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the list to delete." },
      },
      required: ["name"],
    },
  },
  {
    name: "add_to_watchlist",
    description: "Add one or more symbols to an existing watchlist. Validates each symbol against Twelve Data first. Respects the 5-symbol cap.",
    input_schema: {
      type: "object",
      properties: {
        listName: { type: "string", description: "Name of the watchlist to add to." },
        symbols: { type: "array", items: { type: "string" }, description: "Symbols to add." },
      },
      required: ["listName", "symbols"],
    },
  },
  {
    name: "remove_from_watchlist",
    description: "Remove one or more symbols from an existing watchlist.",
    input_schema: {
      type: "object",
      properties: {
        listName: { type: "string", description: "Name of the watchlist to remove from." },
        symbols: { type: "array", items: { type: "string" }, description: "Symbols to remove." },
      },
      required: ["listName", "symbols"],
    },
  },
  {
    name: "set_active_watchlist",
    description: "Switch the dashboard's active watchlist to a named list.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the watchlist to make active." },
      },
      required: ["name"],
    },
  },
  {
    name: "compare_watchlists",
    description: "Fetch live data for two named watchlists and return a side-by-side performance summary. Use when the user asks how one list is doing versus another, or compares individual stocks across lists.",
    input_schema: {
      type: "object",
      properties: {
        nameA: { type: "string", description: "First watchlist name." },
        nameB: { type: "string", description: "Second watchlist name." },
      },
      required: ["nameA", "nameB"],
    },
  },
  {
    name: "highlight_panel",
    description: "Visually highlight a specific dashboard panel to draw the user's attention to it.",
    input_schema: {
      type: "object",
      properties: {
        panel: {
          type: "string",
          enum: ["local_weather", "national_weather", "watchlist", "commodities", "cnn", "bloomberg", "transcript"],
        },
      },
      required: ["panel"],
    },
  },
  {
    name: "run_morning_briefing",
    description: "Trigger the full scripted morning briefing sequence. Use only if the user explicitly asks for 'the morning briefing' or 'my briefing'.",
    input_schema: { type: "object", properties: {} },
  },
  // ── Holographic Interface ─────────────────────────────────────────────────
  {
    name: "activate_holographic",
    description: "Open the full-screen holographic interface — starts the webcam and Three.js scene. Call this before any load or manipulate commands if the panel is not already open.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "deactivate_holographic",
    description: "Close the holographic interface and stop the webcam.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "load_holographic_model",
    description: "Load a 3D model into the holographic workspace. Use NASA model names (ISS, Hubble, Webb, SLS, Mars, Earth, Moon, Saturn, Perseverance, etc.) or 'wireframe' for the default sci-fi object.",
    input_schema: {
      type: "object",
      properties: {
        model: {
          type: "string",
          description: "Name of the model to load. Examples: 'ISS', 'James Webb', 'Mars', 'wireframe', 'Perseverance rover'.",
        },
      },
      required: ["model"],
    },
  },
  {
    name: "manipulate_holographic",
    description: "Apply a voice command to rotate, zoom, or reset the current holographic model.",
    input_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["rotate_left", "rotate_right", "rotate_up", "rotate_down", "zoom_in", "zoom_out", "reset"],
          description: "What to do to the current model.",
        },
      },
      required: ["action"],
    },
  },
];

const SYSTEM_PROMPT = `You are JARVIS, a personal AI assistant inspired by the Tony Stark interface — composed, dry, efficient, lightly British in cadence. You address the user as "Ron" or "sir" sparingly.

You are embedded in a heads-up dashboard showing local and national weather, a stock watchlist, commodity prices, and live news feeds. The user speaks to you; their speech is transcribed and sent to you. You respond with concise, conversational text that will be spoken aloud — so write for the ear, not the eye. Avoid lists, markdown, and bullet points. Use short sentences. One or two paragraphs maximum.

## WATCHLISTS

The dashboard now supports multiple named watchlists, each holding up to 5 symbols, persisted to Cloudflare KV. An "active" watchlist is displayed in the panel at any time.

Rules for watchlist management:
- Before creating a new watchlist from a theme (e.g. "create a financials list"), PROPOSE which symbols you'd add and ask Ron to confirm before calling create_watchlist. Never add symbols silently.
- For pure mechanical requests ("add Tesla to my tech list"), no need to ask — just validate and add.
- Max 5 symbols per list. If at cap, tell Ron which symbol to drop before adding a new one.
- DEFAULT list cannot be deleted.
- Always call list_watchlists first if you're unsure what lists exist or what's in them.
- When adding symbols, validate them via the tool — if one fails Twelve Data validation, apologize and suggest a nearby alternative (e.g. "Tesla comes up as TSLA, shall I use that?").
- After any watchlist mutation, confirm with a short natural sentence: "Done. I've added Tesla to your Tech list."

## COMPARATIVE ANALYSIS

When asked to compare watchlists or individual stocks ("how is financials doing versus tech?"), call compare_watchlists. Narrate the result conversationally: lead with the stronger performer, cite the top gainer and worst drag in each list, and keep it to two sentences. Don't read every ticker — summarize the story.

## HOLOGRAPHIC INTERFACE

The dashboard has a holographic workspace that composites a Three.js 3D scene over the user's live webcam feed. Ron sees himself on screen with models floating in front of him. Hand gestures (pinch to grab, move to rotate, two hands to scale) drive manipulation. Voice commands also work.

Use these tools:
- activate_holographic: open full-screen holographic panel and start webcam
- deactivate_holographic: close it
- load_holographic_model(model): load a named NASA model or default wireframe
- manipulate_holographic(action): rotate_left, rotate_right, rotate_up, rotate_down, zoom_in, zoom_out, reset

NASA models available: ISS, Hubble, Webb, Voyager, Juno, Cassini, SLS, Orion, Curiosity, Perseverance, Ingenuity, Earth, Mars, Moon, Jupiter, Saturn, Venus, Mercury, Sun, Pluto, Europa, Titan, Io.

When Ron says "show me the ISS": call activate_holographic then load_holographic_model with "ISS". Narrate the load naturally. For manipulation commands like "rotate left" or "zoom in", call manipulate_holographic directly.

## PERIODIC TABLE OF THE DOW (COMING SOON)

A companion app called the "Periodic Table of the Dow" exists that tracks market regimes, Dow cohorts, and market momentum. JARVIS is aware of it but cannot yet query it directly — that integration is coming in a future build. If Ron asks about market regime, cohort analysis, or the Periodic Table app, acknowledge it and note that the direct integration is on the roadmap.

## WEATHER

Weather data is LIVE from NOAA / National Weather Service. Always call get_weather for any weather question — never make up temperatures or conditions. Report them naturally.

## MARKET DATA

Stocks come from Twelve Data free tier. ETF proxies are used for commodities (USO/GLD/UNG/WEAT/CPER/SLV). The session field tells you market context: "open" (live quotes), "afterhours" (most recent close, no extended-hours data), "closed" (Friday's close).

When referencing data shown in a panel, also call highlight_panel to direct Ron's attention visually.

Keep responses tight. JARVIS does not waste words.`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured." }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  const { messages } = body;
  if (!Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: "messages array required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  try {
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      }),
    });

    const data = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Anthropic API error", detail: data }),
        { status: anthropicResponse.status, headers: { "Content-Type": "application/json", ...CORS } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Proxy error", detail: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS } }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
