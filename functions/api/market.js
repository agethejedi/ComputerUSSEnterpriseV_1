// Cloudflare Pages Function: /api/market
//
// Returns live data for a hardcoded watchlist of stocks plus commodity ETFs.
// Stocks come back clean from Twelve Data's free tier (no proxy nonsense),
// so the values displayed are real share prices for the actual companies.
//
// Edge-cached at Cloudflare for 60 seconds.

const WATCHLIST = [
  { id: "AAPL", name: "APPLE",    sym: "AAPL" },
  { id: "NVDA", name: "NVIDIA",   sym: "NVDA" },
  { id: "MSFT", name: "MICROSOFT", sym: "MSFT" },
];

const COMMODITIES = [
  { id: "CL", name: "CRUDE OIL", sym: "USO",  unit: "USD/SHARE (USO)" },
  { id: "GC", name: "GOLD",      sym: "GLD",  unit: "USD/SHARE (GLD)" },
  { id: "NG", name: "NAT GAS",   sym: "UNG",  unit: "USD/SHARE (UNG)" },
  { id: "ZW", name: "WHEAT",     sym: "WEAT", unit: "USD/SHARE (WEAT)" },
  { id: "HG", name: "COPPER",    sym: "CPER", unit: "USD/SHARE (CPER)" },
  { id: "SI", name: "SILVER",    sym: "SLV",  unit: "USD/SHARE (SLV)" },
];

// Returns "open" | "afterhours" | "closed" based on Central Time.
// "open"       → Mon-Fri 8:30 AM CT to 3:00 PM CT (regular US equity hours)
// "afterhours" → Mon-Fri before 8:30 AM or after 3:00 PM (free tier doesn't
//                actually carry extended-hours quotes, so values shown will
//                be the most recent regular-session close)
// "closed"     → Sat all day, Sun all day
function getMarketSession(now = new Date()) {
  const ctString = now.toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false });
  const [datePart, timePart] = ctString.split(", ");
  const [month, day, year] = datePart.split("/").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const ctDate = new Date(Date.UTC(year, month - 1, day));
  const dow = ctDate.getUTCDay();

  if (dow === 0 || dow === 6) return "closed";
  const minutesOfDay = hour * 60 + minute;
  const REGULAR_OPEN = 8 * 60 + 30;  // 8:30 AM CT
  const REGULAR_CLOSE = 15 * 60;     // 3:00 PM CT
  if (minutesOfDay >= REGULAR_OPEN && minutesOfDay < REGULAR_CLOSE) return "open";
  return "afterhours";
}

async function fetchQuotes(symbols, apiKey) {
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(
    symbols.join(",")
  )}&apikey=${apiKey}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Twelve Data HTTP ${resp.status}`);
  const data = await resp.json();
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

  const cacheKey = new Request(new URL(request.url).toString(), request);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    const fresh = new Response(cached.body, cached);
    fresh.headers.set("x-cache", "HIT");
    return fresh;
  }

  const session = getMarketSession();
  const watchlistSymbols = WATCHLIST.map((s) => s.sym);
  const commoditySymbols = COMMODITIES.map((c) => c.sym);
  const allSymbols = [...watchlistSymbols, ...commoditySymbols];

  let quotes;
  try {
    quotes = await fetchQuotes(allSymbols, env.TWELVE_DATA_API_KEY);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Twelve Data fetch failed", detail: String(err) }),
      { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const watchlist = WATCHLIST.map((meta) => {
    const parsed = parseQuote(quotes[meta.sym]);
    return {
      id: meta.id,
      name: meta.name,
      sourceSymbol: meta.sym,
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
    watchlist,
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
