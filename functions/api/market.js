// Cloudflare Pages Function: /api/market
// Fetches live market data from Twelve Data and returns it shaped
// to match the JarvisBriefing component's existing expectations
// (id, name, val, chg, pct, unit, futuresLabel, fetchedAt, session).
//
// Caches at the edge for 60 seconds, so even if the page is open
// in many tabs / refreshed, we only hit Twelve Data ~once a minute.
//
// Sessions:
//   "futures" → Mon-Fri 12:00 AM CT to 8:29 AM CT (overnight)
//   "regular" → Mon-Fri 8:30 AM CT to 11:59 PM CT (cash + after-hours)
//   "closed"  → Sat all day, Sun all day
//
// During "regular" we query the actual cash indices (DJI, IXIC, SPX).
// During "futures" or "closed" we query the ETF proxies (DIA, QQQ, SPY)
// because cash indices don't update outside trading hours and ETFs do
// have extended-hours quotes that loosely reflect futures direction.

const INDICES = [
  { id: "DJIA", name: "DOW",     futuresLabel: "DOW FUT",    cashSym: ".DJI",  proxySym: "DIA" },
  { id: "NDX",  name: "NASDAQ",  futuresLabel: "NASDAQ FUT", cashSym: ".IXIC", proxySym: "QQQ" },
  { id: "SPX",  name: "S&P 500", futuresLabel: "S&P FUT",    cashSym: ".SPX",  proxySym: "SPY" },
];

const COMMODITIES = [
  { id: "CL", name: "CRUDE OIL", sym: "USO",  unit: "USD/SHARE (USO)" },
  { id: "GC", name: "GOLD",      sym: "GLD",  unit: "USD/SHARE (GLD)" },
  { id: "NG", name: "NAT GAS",   sym: "UNG",  unit: "USD/SHARE (UNG)" },
  { id: "ZW", name: "WHEAT",     sym: "WEAT", unit: "USD/SHARE (WEAT)" },
  { id: "HG", name: "COPPER",    sym: "CPER", unit: "USD/SHARE (CPER)" },
  { id: "SI", name: "SILVER",    sym: "SLV",  unit: "USD/SHARE (SLV)" },
];

// Returns "futures" | "regular" | "closed" using America/Chicago time.
function getMarketSession(now = new Date()) {
  const ctString = now.toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false });
  // ctString is like "5/8/2026, 14:23:45"
  const [datePart, timePart] = ctString.split(", ");
  const [month, day, year] = datePart.split("/").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const ctDate = new Date(Date.UTC(year, month - 1, day));
  const dow = ctDate.getUTCDay(); // 0=Sun ... 6=Sat

  if (dow === 0 || dow === 6) return "closed";
  const minutesOfDay = hour * 60 + minute;
  const REGULAR_OPEN = 8 * 60 + 30; // 8:30 AM CT
  if (minutesOfDay < REGULAR_OPEN) return "futures";
  return "regular";
}

async function fetchQuotes(symbols, apiKey) {
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(
    symbols.join(",")
  )}&apikey=${apiKey}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Twelve Data HTTP ${resp.status}`);
  const data = await resp.json();
  // Single-symbol responses come back flat; multi-symbol come back keyed.
  if (symbols.length === 1) return { [symbols[0]]: data };
  return data;
}

function parseQuote(q) {
  if (!q || q.code) {
    return { val: null, chg: null, pct: null, error: q?.message || "no data" };
  }
  const val = parseFloat(q.close);
  const chg = parseFloat(q.change);
  const pct = parseFloat(q.percent_change);
  if (isNaN(val)) return { val: null, chg: null, pct: null, error: "invalid price" };
  return {
    val,
    chg: isNaN(chg) ? 0 : chg,
    pct: isNaN(pct) ? 0 : pct,
  };
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (!env.TWELVE_DATA_API_KEY) {
    return new Response(
      JSON.stringify({
        error: "TWELVE_DATA_API_KEY not configured. Set it in Cloudflare Pages → Settings → Environment Variables.",
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Edge cache check
  const cacheKey = new Request(new URL(request.url).toString(), request);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    const fresh = new Response(cached.body, cached);
    fresh.headers.set("x-cache", "HIT");
    return fresh;
  }

  const session = getMarketSession();
  const useCash = session === "regular";
  const indexSymbols = INDICES.map((i) => (useCash ? i.cashSym : i.proxySym));
  const commoditySymbols = COMMODITIES.map((c) => c.sym);
  const allSymbols = [...indexSymbols, ...commoditySymbols];

  let quotes;
  try {
    quotes = await fetchQuotes(allSymbols, env.TWELVE_DATA_API_KEY);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Twelve Data fetch failed", detail: String(err) }),
      { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const indices = INDICES.map((meta, i) => {
    const sym = indexSymbols[i];
    const parsed = parseQuote(quotes[sym]);
    return {
      id: meta.id,
      name: meta.name,
      futuresLabel: meta.futuresLabel,
      sourceSymbol: sym, // e.g. "DJI" or "DIA" — useful for debugging
      ...parsed,
    };
  });

  const commodities = COMMODITIES.map((c) => {
    const parsed = parseQuote(quotes[c.sym]);
    return {
      id: c.id,
      name: c.name,
      unit: c.unit,
      sourceSymbol: c.sym,
      ...parsed,
    };
  });

  const payload = {
    session,
    fetchedAt: Date.now(),
    indices,
    commodities,
  };

  const response = new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60",
      "x-cache": "MISS",
      ...corsHeaders,
    },
  });

  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
