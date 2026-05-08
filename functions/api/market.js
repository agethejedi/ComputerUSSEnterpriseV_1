// Cloudflare Pages Function: /api/market
//
// Returns live price data from Twelve Data.
// Accepts optional ?symbols=AAPL,MSFT,WFC query param.
// If no symbols param, falls back to the default watchlist (AAPL/NVDA/MSFT).
// Always returns commodity ETFs.
//
// Cache key includes the symbol set so different watchlists cache separately.
// Edge-cached at Cloudflare for 60 seconds per unique symbol set.

const DEFAULT_WATCHLIST = [
  { id: "AAPL", name: "APPLE",     sym: "AAPL" },
  { id: "NVDA", name: "NVIDIA",    sym: "NVDA" },
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

// Sanity-check a parsed price value — Twelve Data sometimes returns
// a valid-looking response for garbage symbols with nonsensical values.
function isSanePrice(val) {
  if (val == null || isNaN(val)) return false;
  if (val <= 0 || val > 1_000_000) return false;
  return true;
}

function getMarketSession(now = new Date()) {
  const ctString = now.toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false });
  const [datePart, timePart] = ctString.split(", ");
  const [month, day, year] = datePart.split("/").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const ctDate = new Date(Date.UTC(year, month - 1, day));
  const dow = ctDate.getUTCDay();
  if (dow === 0 || dow === 6) return "closed";
  const minutesOfDay = hour * 60 + minute;
  if (minutesOfDay >= 8 * 60 + 30 && minutesOfDay < 15 * 60) return "open";
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
  if (!isSanePrice(val)) return { val: null, chg: null, pct: null, error: "invalid or insane price" };
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
      JSON.stringify({ error: "TWELVE_DATA_API_KEY not configured." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Parse optional ?symbols= param
  const url = new URL(request.url);
  const symbolsParam = url.searchParams.get("symbols");
  let watchlistMeta;
  if (symbolsParam) {
    const requested = symbolsParam.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 5);
    watchlistMeta = requested.map((sym) => ({ id: sym, name: sym, sym }));
  } else {
    watchlistMeta = DEFAULT_WATCHLIST;
  }

  // Cache key includes the symbol set
  const cacheKey = new Request(request.url, request);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    const fresh = new Response(cached.body, cached);
    fresh.headers.set("x-cache", "HIT");
    return fresh;
  }

  const session = getMarketSession();
  const watchlistSymbols = watchlistMeta.map((s) => s.sym);
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

  const watchlist = watchlistMeta.map((meta) => {
    const parsed = parseQuote(quotes[meta.sym]);
    return { id: meta.id, name: meta.name, symbol: meta.sym, sourceSymbol: meta.sym, ...parsed };
  });

  const commodities = COMMODITIES.map((c) => {
    const parsed = parseQuote(quotes[c.sym]);
    return { id: c.id, name: c.name, unit: c.unit, sourceSymbol: c.sym, ...parsed };
  });

  const payload = { session, fetchedAt: Date.now(), watchlist, commodities };

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

// Validate a single symbol against Twelve Data.
// Returns { valid: bool, val, error }.
export async function validateSymbol(sym, apiKey) {
  try {
    const resp = await fetch(
      `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(sym)}&apikey=${apiKey}`
    );
    if (!resp.ok) return { valid: false, error: `HTTP ${resp.status}` };
    const data = await resp.json();
    if (data.code) return { valid: false, error: data.message };
    const val = parseFloat(data.close);
    if (!isSanePrice(val)) return { valid: false, error: "price out of range" };
    return { valid: true, val };
  } catch (err) {
    return { valid: false, error: String(err) };
  }
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
