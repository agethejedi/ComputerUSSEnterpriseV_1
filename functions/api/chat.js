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
        panel: { type: "string", enum: ["local_weather", "national_weather", "watchlist", "commodities", "cnn", "bloomberg", "transcript", "flight_tracker", "traffic_cameras", "satellite_tracker"] },
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

  // ── Flight Tracker ────────────────────────────────────────────────────────
  {
    name: "get_flight_info",
    description: "Get live flight information from the DFW airspace tracker. Returns aircraft count, altitude distribution, and details on specific flights. Call this when Ron asks about flights, air traffic, or specific aircraft over Dallas.",
    input_schema: {
      type: "object",
      properties: {
        callsign: { type: "string", description: "Optional — filter by specific callsign e.g. 'AAL123'" },
        query: { type: "string", description: "Natural language query e.g. 'how many planes', 'highest aircraft', 'American Airlines flights'" },
      },
    },
  },

  // ── Satellite Tracker ─────────────────────────────────────────────────────
  {
    name: "get_satellite_info",
    description: "Get live satellite data from the N2YO tracker. Can return satellites currently overhead, position of a specific satellite, or pass predictions. Call this when Ron asks about satellites, the ISS, Starlink, or when something will be visible.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What Ron wants to know. Examples: 'how many satellites overhead', 'when is ISS visible', 'show me Starlink', 'where is Hubble'" },
        noradId: { type: "number", description: "Specific NORAD ID if known. ISS=25544, Hubble=20580, Tiangong=37849" },
        category: { type: "string", description: "Category filter: 0=all, 2=stations, 18=starlink, 22=gps, 3=weather, 52=military, 65=amateur" },
      },
    },
  },

  // ── Research / Browser ────────────────────────────────────────────────────
  {
    name: "show_research_results",
    description: "Display web search results in the JARVIS research panel. Call this after web_search returns results to show them visually on the dashboard. Pass the top 3-5 results with title, url, snippet, and source.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query that was run." },
        results: {
          type: "array",
          description: "Top search results to display.",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              url: { type: "string" },
              snippet: { type: "string" },
              source: { type: "string", description: "Domain name e.g. 'reuters.com'" },
            },
          },
        },
      },
      required: ["query", "results"],
    },
  },
  {
    name: "display_webpage",
    description: "Display a webpage full-screen in the JARVIS browser panel. Use when Ron asks to see a page full screen, open a specific URL, or view a search result in the browser.",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Full URL to display." },
        title: { type: "string", description: "Display title for the panel header." },
        mode: { type: "string", enum: ["fullscreen", "inline"], description: "fullscreen opens the browser panel, inline shows in research panel." },
      },
      required: ["url"],
    },
  },
  {
    name: "close_research",
    description: "Close/dismiss the research panel. Use when Ron says 'close research', 'minimize', 'dismiss', or 'close that'.",
    input_schema: { type: "object", properties: {} },
  },

  // ── Holographic Map ───────────────────────────────────────────────────────
  {
    name: "show_holographic_map",
    description: "Display a live interactive map in the holographic workspace. Opens the holographic panel and loads either a flat map or a 3D globe. Use when Ron asks to see a map, navigate somewhere, or view the globe.",
    input_schema: {
      type: "object",
      properties: {
        mode: { type: "string", enum: ["flat", "globe"], description: "flat = 2D map on 3D floating plane, globe = spinning 3D Earth. Default: flat." },
        location: { type: "string", description: "Location to center the map on. Examples: 'Dallas TX', 'Tokyo', 'The Colony TX'. Only used for flat mode." },
        style: { type: "string", enum: ["dark", "satellite", "street"], description: "Map tile style. Default: dark." },
      },
    },
  },
  {
    name: "fly_to_location",
    description: "Navigate the holographic map to a new location. Only works when the map is already displayed.",
    input_schema: {
      type: "object",
      properties: {
        location: { type: "string", description: "Place name to navigate to. Examples: 'Times Square', 'Eiffel Tower', 'Dallas Fort Worth Airport'." },
      },
      required: ["location"],
    },
  },
  {
    name: "switch_map_style",
    description: "Switch the holographic map tile style between dark, satellite, and street view.",
    input_schema: {
      type: "object",
      properties: {
        style: { type: "string", enum: ["dark", "satellite", "street"] },
      },
      required: ["style"],
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

  // ── Apple Music ───────────────────────────────────────────────────────────
  {
    name: "music_play_song",
    description: "Play a specific song from Ron's Apple Music library by name.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Song title and optionally artist. E.g. 'Back in Black' or 'Back in Black AC/DC'" },
      },
      required: ["query"],
    },
  },
  {
    name: "music_play_artist",
    description: "Shuffle and play songs by an artist from Ron's Apple Music library.",
    input_schema: {
      type: "object",
      properties: {
        artist: { type: "string", description: "Artist name. E.g. 'AC/DC', 'Lenny Kravitz', 'A Tribe Called Quest'" },
      },
      required: ["artist"],
    },
  },
  {
    name: "music_play_album",
    description: "Play an album from Ron's Apple Music library.",
    input_schema: {
      type: "object",
      properties: {
        album: { type: "string", description: "Album name and optionally artist. E.g. 'Back in Black AC/DC'" },
      },
      required: ["album"],
    },
  },
  {
    name: "music_pause",
    description: "Pause the currently playing music.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "music_resume",
    description: "Resume paused music.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "music_skip",
    description: "Skip to the next track.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "music_previous",
    description: "Go back to the previous track.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "music_volume",
    description: "Set the music volume level 0-100.",
    input_schema: {
      type: "object",
      properties: {
        level: { type: "number", description: "Volume 0-100. 0 is mute, 100 is maximum." },
      },
      required: ["level"],
    },
  },
  {
    name: "music_stop",
    description: "Stop music playback completely.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "music_now_playing",
    description: "Get the currently playing track. Use when Ron asks what's playing.",
    input_schema: { type: "object", properties: {} },
  },
];


const SYSTEM_PROMPT = `You are JARVIS, a personal AI assistant inspired by the Tony Stark interface — composed, dry, efficient, lightly British in cadence. You address the user as "Ron" or "sir" sparingly.

You are embedded in a heads-up dashboard showing local and national weather, a stock watchlist, commodity prices, live flight tracking, satellite tracking, traffic cameras, and a research browser. The user speaks to you; their speech is transcribed and sent to you. You respond with concise, conversational text that will be spoken aloud — so write for the ear, not the eye. Avoid lists, markdown, and bullet points. Use short sentences. One or two paragraphs maximum.

## APPLE MUSIC

Ron's Apple Music library is accessible via MusicKit JS running in the browser. Use music tools when Ron asks to play music, pause, skip, adjust volume, or asks what's playing.

Natural language mappings:
- "Play Back in Black" → music_play_song, query: "Back in Black"
- "Play some AC/DC" / "Put on AC/DC" → music_play_artist, artist: "AC/DC"
- "Play the Back in Black album" → music_play_album, album: "Back in Black AC/DC"
- "Pause" / "Stop the music" / "Pause that" → music_pause
- "Resume" / "Keep playing" / "Unpause" → music_resume
- "Skip this" / "Next song" / "Skip it" → music_skip
- "Go back" / "Previous song" → music_previous
- "Turn it up" → music_volume, level: 80
- "Turn it down" / "Lower the volume" → music_volume, level: 30
- "Mute" → music_volume, level: 0
- "Stop the music" → music_stop
- "What's playing?" / "What is this?" → music_now_playing

After playing, narrate naturally: "Playing Back in Black by AC/DC." or "Shuffling 12 songs by Lenny Kravitz, sir."
If a song is not found in the library, say so clearly and suggest trying a different search term or artist name.
Music plays directly in the browser — Apple Music authorization happens automatically on first load.

## WATCHLISTS

The dashboard supports multiple named watchlists, each holding up to 5 symbols, persisted to Cloudflare KV. An "active" watchlist is displayed in the panel at any time.

Rules:
- Before creating a thematic watchlist, PROPOSE symbols and ask Ron to confirm before calling create_watchlist.
- For direct requests ("add Tesla to my tech list"), just validate and add.
- Max 5 symbols per list. If at cap, tell Ron which symbol to drop first.
- DEFAULT list cannot be deleted.
- Always call list_watchlists first if unsure what lists exist.
- After any mutation, confirm naturally: "Done. I've added Tesla to your Tech list."

## COMPARATIVE ANALYSIS

When asked to compare watchlists, call compare_watchlists. Lead with the stronger performer, cite the top gainer and worst drag in each list. Keep it to two sentences.

## CALENDAR

Ron maintains a personal calendar inside JARVIS. Events persist to Cloudflare KV.

When Ron says things like:
- "Open my calendar" → call open_calendar
- "What's on my schedule today?" → call list_calendar_events then narrate
- "Add a meeting tomorrow at 2pm" → call add_calendar_event, then open_calendar so he sees it
- "What do I have this week?" → call list_calendar_events
- "Cancel my 2pm meeting" → confirm first, then delete_calendar_event

Label mapping (infer from context):
- Meetings, calls, work tasks → work
- Personal appointments, family → personal
- Doctor, gym, health → health
- Bills, investments, financial → finance
- Flights, hotels, trips → travel
- Everything else → other

Date handling: convert natural language like "next Tuesday at 3pm" to YYYY-MM-DD and HH:MM before calling the tool. Always read back parsed details before saving. Always open the calendar after adding events.

## FLIGHT TRACKER

The dashboard has a live DFW airspace panel showing all aircraft over North Texas via OpenSky Network ADS-B data. Updates every 15 seconds.

When Ron asks about air traffic, call get_flight_info and highlight_panel("flight_tracker"). Callsigns are ICAO format (AAL = American, DAL = Delta, UAL = United, SWA = Southwest).

## SATELLITE TRACKER

The dashboard has a live satellite tracking panel showing satellites overhead The Colony, TX via N2YO API. Updates every 60 seconds.

When Ron asks about satellites, call get_satellite_info and highlight_panel("satellite_tracker"). Key NORAD IDs: ISS=25544, Hubble=20580, Tiangong=37849. Narrate pass predictions naturally: "The ISS will pass over tonight at 9:47 PM, reaching 52 degrees — clear skies required."

## HOLOGRAPHIC MAP

The holographic panel supports a flat map (Leaflet texture on a 3D plane) or a spinning 3D globe, viewable with webcam composite.

When Ron says things like:
- "Show me a map" / "Open the map" → show_holographic_map with mode: flat
- "Show me the globe" / "3D globe" → show_holographic_map with mode: globe
- "Show me Dallas on the map" → show_holographic_map, location: "Dallas TX"
- "Fly to Tokyo" / "Navigate to Paris" → fly_to_location
- "Switch to satellite" → switch_map_style, style: satellite
- "Street view" → switch_map_style, style: street

Narrate naturally: "Opening the map now — centering on Dallas Fort Worth."

## WEB SEARCH & RESEARCH

Use web_search freely for current events, news, prices, people, companies — anything that benefits from fresh data. After searching, ALWAYS call show_research_results to display results visually. Keep verbal summaries to 2-3 sentences.

- "Search for X" / "Look up X" → web_search then show_research_results
- "Show me that full screen" / "Go to [URL]" → display_webpage with mode: fullscreen
- "Close research" / "Minimize" → close_research

## HOLOGRAPHIC INTERFACE

The holographic workspace composites Three.js 3D scenes over the live webcam feed. Ron sees himself with models floating in front of him. Hand gestures and voice commands drive manipulation.

NASA models: ISS, Hubble, Webb, Voyager, Juno, Cassini, SLS, Orion, Curiosity, Perseverance, Ingenuity, Earth, Mars, Moon, Jupiter, Saturn, Venus, Mercury, Sun, Pluto, Europa, Titan, Io.

## WEATHER

Weather data is LIVE from NOAA. Always call get_weather for any weather question — never fabricate temperatures or conditions.

## MARKET DATA

Stocks from Twelve Data. ETF proxies for commodities (USO/GLD/UNG/WEAT/CPER/SLV). Session field indicates market context: open (live), afterhours (most recent close), closed (Friday's close). Highlight the relevant panel when referencing data.

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
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: [
          { type: "web_search_20250305", name: "web_search" },
          ...TOOLS,
        ],
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
