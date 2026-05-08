// Cloudflare Pages Function: /api/chat
// Proxies requests to the Anthropic API. The API key lives in
// Cloudflare environment variables (set in the Pages dashboard),
// NOT in this code or in the frontend.

// Tool definitions — these tell Claude what actions it can take
// in the dashboard. The actual execution happens client-side: the
// frontend reads the tool_use blocks Claude returns and reacts.
const TOOLS = [
  {
    name: "get_weather",
    description: "Get current weather conditions and forecast for a location, or for the user's local area if no location is given. Returns temperature, conditions, and a brief forecast.",
    input_schema: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "Location name (city, region, or 'local' for the user's current area). Defaults to local.",
        },
        scope: {
          type: "string",
          enum: ["local", "national"],
          description: "Whether to give a local report or a national overview.",
        },
      },
    },
  },
  {
    name: "get_market_data",
    description: "Get current price and change data for stock index futures (Dow, Nasdaq, S&P) or commodities (oil, gold, natural gas, wheat, copper, silver). Use this for any question about market prices or movement.",
    input_schema: {
      type: "object",
      properties: {
        symbols: {
          type: "array",
          items: { type: "string" },
          description: "List of symbols or names. Examples: ['DJIA', 'gold', 'crude oil']. Use ['all'] to fetch everything.",
        },
      },
      required: ["symbols"],
    },
  },
  {
    name: "highlight_panel",
    description: "Visually highlight a specific dashboard panel to draw the user's attention to it. Call this when referencing data shown in a panel.",
    input_schema: {
      type: "object",
      properties: {
        panel: {
          type: "string",
          enum: ["local_weather", "national_weather", "futures", "commodities", "cnn", "bloomberg", "transcript"],
          description: "Which panel to highlight.",
        },
      },
      required: ["panel"],
    },
  },
  {
    name: "run_morning_briefing",
    description: "Trigger the full scripted morning briefing sequence. Use this only if the user explicitly asks for 'the morning briefing' or 'my briefing'.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
];

const SYSTEM_PROMPT = `You are JARVIS, a personal AI assistant inspired by the Tony Stark interface — composed, dry, efficient, lightly British in cadence. You address the user as "Ron" or "sir" sparingly.

You are embedded in a heads-up dashboard showing local and national weather, US stock indices, commodity prices, and live news feeds. The user speaks to you; their speech is transcribed and sent to you. You respond with concise, conversational text that will be spoken aloud — so write for the ear, not the eye. Avoid lists, markdown, and bullet points. Use short sentences. One or two paragraphs maximum.

When the user asks about anything visible on the dashboard (weather, markets, commodities), call the appropriate tool to fetch real values, AND call highlight_panel to visually direct their attention. You can call multiple tools in one turn.

Market data is live from Twelve Data. The get_market_data tool returns a "session" field that can be:
  - "regular" → US markets are open (Mon-Fri 8:30 AM – 11:59 PM CT). Numbers are live cash-market quotes. Refer to them as "the Dow", "the Nasdaq", "the S&P", etc.
  - "futures" → Overnight session (Mon-Fri midnight – 8:30 AM CT). Refer to them as "Dow futures", "Nasdaq futures", "S&P futures". Note: on the free data tier, the underlying number is the most recent cash close, not a true overnight futures quote — if a user asks specifically about overnight futures movement, be honest that the system is showing the prior close as a proxy.
  - "closed" → Weekend. Refer to values as "the most recent close" or "Friday's close".

Commodity prices are shown via ETF proxies (USO for crude, GLD for gold, etc.) since true futures contracts require a paid data feed. The numbers are accurate share prices that closely track the underlying commodity, but they are share prices, not per-barrel or per-ounce. If a user asks "how much is gold per ounce", be honest that the dashboard shows GLD ETF price, which is roughly 1/10 the spot gold price.

If the user makes small talk or asks about something outside the dashboard's scope, respond conversationally without calling tools.

If asked to run the morning briefing, call run_morning_briefing instead of narrating it yourself.

Keep responses tight. JARVIS does not waste words.`;

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS for local development. In production same-origin so this is harmless.
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (!env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({
        error: "ANTHROPIC_API_KEY not configured. Set it in Cloudflare Pages → Settings → Environment Variables.",
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const { messages } = body;
  if (!Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: "messages array required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
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
        { status: anthropicResponse.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Proxy error", detail: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
