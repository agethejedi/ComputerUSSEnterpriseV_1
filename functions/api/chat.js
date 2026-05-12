// Cloudflare Pages Function: /api/chat
// Proxies requests to the Anthropic API. API key lives in Cloudflare env vars.

const TOOLS = [
  // ── Weather ───────────────────────────────────────────────────────────────
  {
    name: "get_weather",
    description: "Get LIVE weather data from NOAA / National Weather Service. For 'local' scope, returns current observed conditions for The Colony, TX, plus four forecast periods (6 AM, noon, 6 PM, midnight) and any active alerts. For 'national' scope, returns current temperatures for major US cities. Always call this when the user asks about weather, conditions, temperature, forecast, rain, storms, or alerts — never make up weather values.",
    input_schema: {
      type: "object",
      properties: {
        scope: { type: "string", enum: ["local", "national"], description: "'local' for The Colony TX detail, 'national' for major-city overview." },
      },
    },
  },

  // ── Market ────────────────────────────────────────────────────────────────
  {
    name: "get_market_data",
    description: "Get current price and change data for stocks on the user's active watchlist or commodity ETFs. Use for any question about market prices or movement.",
    input_schema: {
      type: "object",
      properties: {
        symbols: { type: "array", items: { type: "string" }, description: "List of symbols or names. Use ['all'] to fetch everything." },
        watchlistName: { type: "string", description: "Optional — which watchlist to draw from. Defaults to active watchlist." },
      },
      required: ["symbols"],
    },
  },

  // ── Watchlists ────────────────────────────────────────────────────────────
  {
    name: "list_watchlists",
    description: "Returns all named watchlists and which one is currently active.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "create_watchlist",
    description: "Create a new named watchlist. For thematic lists, propose tickers and ask Ron to confirm first.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        symbols: { type: "array", items: { type: "string" } },
      },
      required: ["name", "symbols"],
    },
  },
  {
    name: "delete_watchlist",
    description: "Delete a named watchlist. Cannot delete DEFAULT. Always confirm first.",
    input_schema: {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    },
  },
  {
    name: "add_to_watchlist",
    description: "Add ticker symbols to an existing watchlist. Max 5 symbols per list.",
    input_schema: {
      type: "object",
      properties: {
        listName: { type: "string" },
        symbols: { type: "array", items: { type: "string" } },
      },
      required: ["symbols"],
    },
  },
  {
    name: "remove_from_watchlist",
    description: "Remove ticker symbols from an existing watchlist.",
    input_schema: {
      type: "object",
      properties: {
        listName: { type: "string" },
        symbols: { type: "array", items: { type: "string" } },
      },
      required: ["symbols"],
    },
  },
  {
    name: "set_active_watchlist",
    description: "Switch the dashboard to display a different named watchlist.",
    input_schema: {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    },
  },
  {
    name: "compare_watchlists",
    description: "Fetch live price data for two named watchlists and return a side-by-side performance comparison.",
    input_schema: {
      type: "object",
      properties: {
        nameA: { type: "string" },
        nameB: { type: "string" },
      },
      required: ["nameA", "nameB"],
    },
  },

  // ── UI ────────────────────────────────────────────────────────────────────
  {
    name: "highlight_panel",
    description: "Visually highlight a specific dashboard panel to draw the user's attention to it.",
    input_schema: {
      type: "object",
      properties: {
        panel: { type: "string", enum: ["local_weather", "national_weather", "watchlist", "commodities", "cnn", "bloomberg", "transcript"] },
      },
      required: ["panel"],
    },
  },
  {
    name: "run_morning_briefing",
    description: "Trigger the full scripted morning briefing sequence. Use only if Ron explicitly asks for it.",
    input_schema: { type: "object", properties: {} },
  },

  // ── Calendar ──────────────────────────────────────────────────────────────
  {
    name: "open_calendar",
    description: "Open the JARVIS calendar. Optionally specify the view: month (default), week, or day.",
    input_schema: {
      type: "object",
      properties: {
        view: { type: "string", enum: ["month", "week", "day"] },
        date: { type: "string", description: "Optional ISO date YYYY-MM-DD to navigate to." },
      },
    },
  },
  {
    name: "add_calendar_event",
    description: "Add an event to the JARVIS calendar. Parse natural language dates into ISO format. Always narrate what was added.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        date: { type: "string", description: "ISO date YYYY-MM-DD." },
        startTime: { type: "string", description: "HH:MM 24h format." },
        endTime: { type: "string", description: "HH:MM 24h format." },
        label: { type: "string", enum: ["work", "personal", "health", "finance", "travel", "other"] },
        notes: { type: "string" },
      },
      required: ["title", "date"],
    },
  },
  {
    name: "update_calendar_event",
    description: "Update an existing calendar event by ID.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        changes: { type: "object", description: "Fields to update: title, date, startTime, endTime, label, notes." },
      },
      required: ["id", "changes"],
    },
  },
  {
    name: "delete_calendar_event",
    description: "Delete a calendar event by ID. Always confirm with Ron first.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "list_calendar_events",
    description: "Read events from the calendar for a date range. Use when Ron asks about his schedule or upcoming events.",
    input_schema: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "ISO date YYYY-MM-DD. Defaults to today." },
        endDate: { type: "string", description: "ISO date YYYY-MM-DD. Defaults to 7 days from start." },
      },
    },
  },

  // ── Holographic Interface ─────────────────────────────────────────────────
  {
    name: "activate_holographic",
    description: "Open the full-screen holographic interface — starts the webcam and Three.js scene.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "deactivate_holographic",
    description: "Close the holographic interface and stop the webcam.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "load_holographic_model",
    description: "Load a 3D model into the holographic workspace. Use NASA model names or 'wireframe' for the default.",
    input_schema: {
      type: "object",
      properties: {
        model: { type: "string", description: "Model name: ISS, Hubble, Webb, Mars, Earth, Moon, Perseverance, wireframe, etc." },
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
        action: { type: "string", enum: ["rotate_left", "rotate_right", "rotate_up", "rotate_down", "zoom_in", "zoom_out", "reset"] },
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

## CALENDAR

Ron maintains a personal calendar inside JARVIS. Events persist to Cloudflare KV.

When Ron says things like:
- "Open my calendar" → call open_calendar
- "What's on my schedule today?" → call list_calendar_events(range: "today") then narrate
- "Add a meeting tomorrow at 2pm" → call add_calendar_event, then open_calendar so he sees it
- "Schedule a doctor appointment next Tuesday at 10am" → label: health, call add_calendar_event
- "What do I have this week?" → call list_calendar_events(range: "this_week")
- "Cancel my 2pm meeting" → confirm first, then delete_calendar_event

Label mapping (use these automatically based on context):
- Meetings, calls, work tasks → work
- Personal appointments, family → personal  
- Doctor, gym, health → health
- Bills, investments, financial → finance
- Flights, hotels, trips → travel
- Everything else → other

When adding an event, always open the calendar afterward so Ron can see it added.
Narrate confirmations naturally: "Done — quarterly review added for Tuesday at 2 PM, labeled as work."

## CALENDAR

Ron has a personal JARVIS calendar for scheduling. It supports month, week, and day views with color-coded event labels (work/personal/health/finance/travel/other).

When Ron says things like:
- "What's on my schedule today/this week?" → call list_calendar_events with appropriate date range, then narrate naturally
- "Open my calendar" / "Show me my calendar" → call open_calendar
- "Add an event" / "Schedule a meeting" → parse the details, confirm with Ron, then call add_calendar_event
- "Cancel my 2pm Tuesday" → call list_calendar_events first to find the ID, confirm, then delete_calendar_event
- "What do I have coming up?" → list_calendar_events for the next 7 days

Date handling: today is always available via JavaScript's Date. Convert natural language like "next Tuesday at 3pm" to YYYY-MM-DD and HH:MM format before calling the tool. When adding events, always read back the parsed details before saving — "I'll add a work event for Tuesday May 14th at 2pm, shall I go ahead?"

Label selection: infer the label from context — meetings/calls → work, doctor → health, flights/hotels → travel, bills/investments → finance, birthdays/dinners → personal.

## CALENDAR

Ron has a personal JARVIS calendar. You can open it, add events, update them, delete them, and read his schedule.

When adding events, parse natural language naturally:
- "Tuesday at 2pm" → find the next Tuesday, set startTime "14:00"
- "tomorrow morning" → tomorrow's date, startTime "09:00"
- "next Friday 3-4pm" → correct date, startTime "15:00", endTime "16:00"

Label mapping — infer from context:
- Meetings, calls, work tasks → "work"
- Doctor, gym, wellness → "health"  
- Bills, investments → "finance"
- Flights, trips → "travel"
- Family, social → "personal"
- Everything else → "other"

Always open the calendar when adding or showing events — call open_calendar alongside add_calendar_event. Narrate confirmations naturally: "Done — quarterly review added for Tuesday the 15th at 2pm, labeled work."

For "what's on my schedule" questions, call list_calendar_events and read the results conversationally. If nothing is scheduled, say so.

Today's date for reference: always use the current date context when parsing relative dates like "tomorrow" or "next week."

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
