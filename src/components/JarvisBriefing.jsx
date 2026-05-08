import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// VISUALIZER
// ============================================================

const MODE_LABELS = {
  idle: "STANDBY",
  listening: "LISTENING",
  thinking: "PROCESSING",
  speaking: "RESPONDING",
};

function AudioRing({ active, intensity = 1, bars = 64, color = "#7DD3FC" }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf;
    const loop = () => {
      setTick((t) => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  const radius = 110;
  const items = [];
  for (let i = 0; i < bars; i++) {
    const angle = (i / bars) * Math.PI * 2;
    const seed = i * 0.7;
    const wave =
      Math.sin(tick * 0.06 + seed) * 0.5 +
      Math.sin(tick * 0.13 + seed * 2.1) * 0.3 +
      Math.sin(tick * 0.21 + seed * 0.5) * 0.2;
    const amp = active ? (0.5 + wave * 0.5) * intensity : 0.15;
    const len = 4 + amp * 22;
    const x1 = Math.cos(angle) * radius;
    const y1 = Math.sin(angle) * radius;
    const x2 = Math.cos(angle) * (radius + len);
    const y2 = Math.sin(angle) * (radius + len);
    items.push(
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity={0.4 + amp * 0.6} />
    );
  }
  return <g>{items}</g>;
}

function RotatingArc({ radius, duration, reverse = false, segments = [[0, 60], [120, 30], [200, 80], [310, 20]], strokeWidth = 1.5, color = "#7DD3FC", opacity = 0.8 }) {
  return (
    <g style={{ transformOrigin: "center", animation: `${reverse ? "spinReverse" : "spin"} ${duration}s linear infinite` }}>
      {segments.map(([start, length], i) => {
        const circumference = 2 * Math.PI * radius;
        const dash = (length / 360) * circumference;
        const gap = circumference - dash;
        const offset = -((start / 360) * circumference);
        return <circle key={i} cx="0" cy="0" r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={`${dash} ${gap}`} strokeDashoffset={offset} opacity={opacity} strokeLinecap="round" />;
      })}
    </g>
  );
}

function TickRing({ radius, count, length = 4, color = "#7DD3FC", opacity = 0.5 }) {
  const ticks = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 360;
    ticks.push(<line key={i} x1="0" y1={-radius} x2="0" y2={-radius - length} stroke={color} strokeWidth="1" opacity={opacity} transform={`rotate(${angle})`} />);
  }
  return <g>{ticks}</g>;
}

function CornerBrackets({ size = 180, color = "#7DD3FC", opacity = 0.6 }) {
  const s = size;
  const len = 18;
  const corners = [
    { x: -s, y: -s, dx: 1, dy: 1 },
    { x: s, y: -s, dx: -1, dy: 1 },
    { x: -s, y: s, dx: 1, dy: -1 },
    { x: s, y: s, dx: -1, dy: -1 },
  ];
  return (
    <g opacity={opacity}>
      {corners.map((c, i) => (
        <g key={i}>
          <line x1={c.x} y1={c.y} x2={c.x + c.dx * len} y2={c.y} stroke={color} strokeWidth="1.5" />
          <line x1={c.x} y1={c.y} x2={c.x} y2={c.y + c.dy * len} stroke={color} strokeWidth="1.5" />
        </g>
      ))}
    </g>
  );
}

function OrbitingParticles({ active, color = "#7DD3FC" }) {
  if (!active) return null;
  const particles = [
    { r: 95, dur: 4, size: 2, delay: 0 },
    { r: 95, dur: 4, size: 1.5, delay: -1.3 },
    { r: 95, dur: 4, size: 2.5, delay: -2.6 },
    { r: 130, dur: 6, size: 1.5, delay: 0 },
    { r: 130, dur: 6, size: 2, delay: -3 },
    { r: 75, dur: 3, size: 1.5, delay: 0 },
    { r: 75, dur: 3, size: 1, delay: -1.5 },
  ];
  return (
    <>
      {particles.map((p, i) => (
        <g key={i} style={{ transformOrigin: "center", animation: `spin ${p.dur}s linear infinite`, animationDelay: `${p.delay}s` }}>
          <circle cx={p.r} cy="0" r={p.size} fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
        </g>
      ))}
    </>
  );
}

function JarvisCore({ mode }) {
  const colors = { idle: "#94A3B8", listening: "#7DD3FC", thinking: "#A78BFA", speaking: "#67E8F9" };
  const color = colors[mode];

  return (
    <div className="relative w-full aspect-square">
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at center, ${color}22 0%, transparent 55%)`, transition: "background 600ms ease" }} />
      {(mode === "thinking" || mode === "listening") && (
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 w-72 h-[2px] pointer-events-none" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)`, animation: "scanline 3s linear infinite", filter: `drop-shadow(0 0 6px ${color})` }} />
      )}
      <svg viewBox="-200 -200 400 400" className="absolute inset-0 w-full h-full" style={{ animation: "flicker 4s ease-in-out infinite" }}>
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="60%" stopColor={color} stopOpacity="0.05" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="innerCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="80%" stopColor="#020617" />
            <stop offset="100%" stopColor={color} stopOpacity="0.3" />
          </radialGradient>
        </defs>
        <CornerBrackets size={170} color={color} opacity={0.4} />
        <CornerBrackets size={150} color={color} opacity={0.25} />
        <g style={{ transformOrigin: "center", animation: mode === "thinking" ? "spin 30s linear infinite" : mode === "speaking" ? "spin 60s linear infinite" : "none" }}>
          <TickRing radius={140} count={48} length={6} color={color} opacity={0.4} />
        </g>
        <circle cx="0" cy="0" r="120" fill="url(#coreGlow)" />
        <RotatingArc radius={155} duration={mode === "thinking" ? 8 : 24} color={color} opacity={0.5} segments={[[0, 40], [180, 40]]} />
        <RotatingArc radius={140} duration={mode === "thinking" ? 6 : 18} reverse color={color} opacity={0.35} segments={[[20, 25], [120, 15], [220, 35], [320, 20]]} strokeWidth={1} />
        {(mode === "listening" || mode === "speaking") && <AudioRing active intensity={mode === "speaking" ? 1.2 : 0.85} color={color} />}
        <circle cx="0" cy="0" r="100" fill="none" stroke={color} strokeWidth="2.5" opacity="0.9" style={{ filter: `drop-shadow(0 0 8px ${color})`, animation: mode === "idle" ? "corePulse 3s ease-in-out infinite" : "none" }} />
        <RotatingArc radius={90} duration={mode === "thinking" ? 2 : mode === "idle" ? 30 : 12} color={color} opacity={0.7} segments={mode === "thinking" ? [[0, 80], [120, 60], [240, 70]] : [[0, 30], [180, 30]]} strokeWidth={1.5} />
        <OrbitingParticles active={mode === "thinking"} color={color} />
        <circle cx="0" cy="0" r="78" fill="url(#innerCore)" />
        <circle cx="0" cy="0" r="78" fill="none" stroke={color} strokeWidth="1" opacity="0.5" />
        <text x="0" y="6" textAnchor="middle" fill={color} fontSize="22" fontFamily="ui-monospace, 'SF Mono', monospace" fontWeight="300" letterSpacing="6" style={{ filter: `drop-shadow(0 0 4px ${color})`, animation: mode === "thinking" ? "thinkingPulse 1.2s ease-in-out infinite" : "none" }}>JARVIS</text>
        <circle cx="0" cy="-22" r="1.5" fill={color} opacity="0.8" />
      </svg>
    </div>
  );
}

// ============================================================
// PANEL CHROME
// ============================================================

function Panel({ title, code, children, accent = "#7DD3FC", highlighted = false, panelKey }) {
  const glowColor = highlighted ? "#FBBF24" : accent;
  return (
    <div
      data-panel={panelKey}
      className="relative bg-slate-950/40 backdrop-blur-sm transition-all duration-500"
      style={{
        border: `1px solid ${highlighted ? glowColor : `${accent}33`}`,
        boxShadow: highlighted ? `0 0 24px ${glowColor}66, inset 0 0 24px ${glowColor}22` : "none",
      }}
    >
      <div className="absolute -top-px -left-px w-3 h-3 border-t border-l" style={{ borderColor: highlighted ? glowColor : accent }} />
      <div className="absolute -top-px -right-px w-3 h-3 border-t border-r" style={{ borderColor: highlighted ? glowColor : accent }} />
      <div className="absolute -bottom-px -left-px w-3 h-3 border-b border-l" style={{ borderColor: highlighted ? glowColor : accent }} />
      <div className="absolute -bottom-px -right-px w-3 h-3 border-b border-r" style={{ borderColor: highlighted ? glowColor : accent }} />

      <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: `${accent}22`, background: `${accent}08` }}>
        <div className="flex items-center gap-2">
          <span className="inline-block w-1 h-1 rounded-full" style={{ background: highlighted ? glowColor : accent, boxShadow: `0 0 6px ${highlighted ? glowColor : accent}` }} />
          <span className="text-[10px] tracking-[0.25em] uppercase" style={{ color: highlighted ? glowColor : accent }}>{title}</span>
        </div>
        <span className="text-[9px] tracking-[0.2em] opacity-50" style={{ color: accent }}>{code}</span>
      </div>

      <div className="p-3">{children}</div>
    </div>
  );
}

// ============================================================
// MOCK DATA
// ============================================================

// Live weather is fetched from /api/weather (NOAA). This fallback is
// used briefly on first load before the fetch completes and during
// error states so the UI never goes blank.
const FALLBACK_WEATHER = {
  fetchedAt: null,
  local: {
    location: "The Colony, TX",
    current: null,
    forecastTiles: [
      { label: "6AM", tempF: null },
      { label: "12PM", tempF: null },
      { label: "6PM", tempF: null },
      { label: "12AM", tempF: null },
    ],
    alerts: [],
  },
  national: {
    cities: [
      { code: "SFO", name: "San Francisco", tempF: null, lat: 37.7749, lon: -122.4194 },
      { code: "LAX", name: "Los Angeles",  tempF: null, lat: 34.0522, lon: -118.2437 },
      { code: "CHI", name: "Chicago",      tempF: null, lat: 41.8781, lon: -87.6298 },
      { code: "NYC", name: "New York",     tempF: null, lat: 40.7128, lon: -74.0060 },
      { code: "MIA", name: "Miami",        tempF: null, lat: 25.7617, lon: -80.1918 },
      { code: "DFW", name: "Dallas",       tempF: null, lat: 32.7767, lon: -96.7970 },
    ],
  },
};

// Market data is fetched live from /api/market. These fallbacks
// are used briefly on first load before the fetch completes, and
// during error states so the UI never goes blank.
// Watchlist data is fetched live from /api/market. These fallbacks
// are used briefly on first load before the fetch completes, and
// during error states so the UI never goes blank.
const FALLBACK_WATCHLIST = [
  { id: "AAPL", name: "APPLE",     symbol: "AAPL", val: null, chg: null, pct: null },
  { id: "NVDA", name: "NVIDIA",    symbol: "NVDA", val: null, chg: null, pct: null },
  { id: "MSFT", name: "MICROSOFT", symbol: "MSFT", val: null, chg: null, pct: null },
];

const FALLBACK_INDICES = FALLBACK_WATCHLIST; // legacy alias, removed once nothing uses it

const FALLBACK_COMMODITIES = [
  { id: "CL", name: "CRUDE OIL", unit: "USD/SHARE (USO)", val: null, chg: null, pct: null },
  { id: "GC", name: "GOLD",      unit: "USD/SHARE (GLD)", val: null, chg: null, pct: null },
  { id: "NG", name: "NAT GAS",   unit: "USD/SHARE (UNG)", val: null, chg: null, pct: null },
  { id: "ZW", name: "WHEAT",     unit: "USD/SHARE (WEAT)", val: null, chg: null, pct: null },
  { id: "HG", name: "COPPER",    unit: "USD/SHARE (CPER)", val: null, chg: null, pct: null },
  { id: "SI", name: "SILVER",    unit: "USD/SHARE (SLV)", val: null, chg: null, pct: null },
];

// Determine which "session" the US stock market is in, based on Central Time.
// Mirrors the logic in functions/api/market.js. Returns:
//   "open"       → Mon-Fri 8:30 AM CT to 3:00 PM CT (regular trading hours)
//   "afterhours" → Mon-Fri outside those hours (early morning, after-close, evening)
//   "closed"     → Sat all day, Sun all day
//
// Note: Twelve Data free tier doesn't include extended-hours quotes, so
// in "afterhours" we show the most recent regular-session close.
function getMarketSession(now = new Date()) {
  const ctString = now.toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false });
  // ctString looks like "5/8/2026, 14:23:45" — parse it.
  const [datePart, timePart] = ctString.split(", ");
  const [month, day, year] = datePart.split("/").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const ctDate = new Date(Date.UTC(year, month - 1, day));
  const dow = ctDate.getUTCDay();

  if (dow === 0 || dow === 6) return "closed"; // Sat/Sun
  const minutesOfDay = hour * 60 + minute;
  const REGULAR_OPEN = 8 * 60 + 30;  // 8:30 AM CT
  const REGULAR_CLOSE = 15 * 60;     // 3:00 PM CT
  if (minutesOfDay >= REGULAR_OPEN && minutesOfDay < REGULAR_CLOSE) return "open";
  return "afterhours";
}

// ============================================================
// TOOL EXECUTORS
// ============================================================

function executeToolCall(name, input, ctx) {
  switch (name) {
    case "get_weather": {
      const scope = input.scope || "local";
      const wx = ctx.weatherData || FALLBACK_WEATHER;
      if (scope === "national") {
        return JSON.stringify({
          fetchedAt: wx.fetchedAt,
          cities: wx.national.cities,
          note: "Temperatures are current-period forecast values from NOAA for each city.",
        });
      }
      // local
      const c = wx.local.current;
      return JSON.stringify({
        fetchedAt: wx.fetchedAt,
        location: wx.local.location,
        current: c
          ? {
              tempF: c.tempF,
              feelsF: c.feelsF,
              humidity: c.humidity,
              windDir: c.windDir,
              windSpeedMph: c.windSpeed,
              barometricInHg: c.baroIn,
              conditions: c.conditions,
              station: c.stationName,
              observedAt: c.observedAt,
            }
          : null,
        forecastTiles: wx.local.forecastTiles,
        alerts: wx.local.alerts,
        note: "Live data from NOAA / National Weather Service.",
      });
    }
    case "get_market_data": {
      const symbols = (input.symbols || []).map((s) => s.toLowerCase());
      const wantsAll = symbols.includes("all");
      const watchlist = ctx.marketData?.watchlist || [];
      const commodities = ctx.marketData?.commodities || [];
      const all = [...watchlist, ...commodities];
      const session = ctx.marketSession;
      const sessionNote = {
        open: "US stock market is open (Mon-Fri 8:30 AM – 3:00 PM CT). Watchlist values are live regular-session quotes.",
        afterhours: "US stock market is in after-hours (weekday outside 8:30 AM – 3:00 PM CT). Watchlist values shown are the most recent regular-session close. Free-tier data does not include extended-hours quotes.",
        closed: "US stock market is closed for the weekend. Watchlist values are Friday's close.",
      }[session] || "Market session unknown.";
      if (wantsAll) {
        return JSON.stringify({ session, sessionNote, fetchedAt: ctx.marketData?.fetchedAt, data: all });
      }
      const matches = all.filter((item) =>
        symbols.some((s) =>
          item.id?.toLowerCase() === s ||
          item.symbol?.toLowerCase() === s ||
          item.name?.toLowerCase().includes(s) ||
          s.includes(item.name?.toLowerCase().split(" ")[0] || "___")
        )
      );
      return JSON.stringify({
        session,
        sessionNote,
        fetchedAt: ctx.marketData?.fetchedAt,
        data: matches.length ? matches : { note: "No matching symbols", available: all.map((a) => `${a.name} (${a.symbol || a.id})`) },
      });
    }
    case "highlight_panel": {
      ctx.setHighlightedPanel(input.panel);
      setTimeout(() => ctx.setHighlightedPanel(null), 8000);
      return JSON.stringify({ highlighted: input.panel });
    }
    case "run_morning_briefing": {
      ctx.triggerBriefing();
      return JSON.stringify({ status: "briefing started" });
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ============================================================
// PANELS
// ============================================================

function LocalWeather({ highlighted, weather, loading, error }) {
  const accent = "#7DD3FC";
  const c = weather?.current;
  const tiles = weather?.forecastTiles || [];
  const alerts = weather?.alerts || [];
  return (
    <Panel title={`LOCAL // ${weather?.location || "—"}`} code="WX.01" accent={accent} highlighted={highlighted} panelKey="local_weather">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-4xl font-light tracking-tight" style={{ color: accent }}>
            {c?.tempF != null ? `${c.tempF}°` : (loading ? "…" : "—")}
          </div>
          <div className="text-[10px] tracking-[0.2em] opacity-60 mt-1 uppercase truncate max-w-[160px]">
            {c?.conditions || (loading ? "loading" : error ? "no data" : "—")}
          </div>
        </div>
        <div className="text-right text-[10px] tracking-[0.15em] opacity-70 space-y-0.5">
          <div>FEELS · {c?.feelsF != null ? `${c.feelsF}°` : "—"}</div>
          <div>HUMID · {c?.humidity != null ? `${c.humidity}%` : "—"}</div>
          <div>WIND · {c?.windDir && c?.windSpeed != null ? `${c.windDir} ${c.windSpeed}` : "—"}</div>
          <div>BARO · {c?.baroIn != null ? c.baroIn.toFixed(2) : "—"}</div>
        </div>
      </div>

      <RadarMap
        center={[33.0807, -96.8867]}
        zoom={7}
        markers={[{ lat: 33.0807, lon: -96.8867, label: "YOU", isYou: true }]}
        className="h-32"
        showLabels={true}
        accent={accent}
      />

      <div className="mt-2 grid grid-cols-4 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="text-center">
            <div className="text-[9px] tracking-[0.15em] opacity-50">{t.label}</div>
            <div className="text-sm font-light" style={{ color: accent }}>
              {t.tempF != null ? `${t.tempF}°` : "—"}
            </div>
          </div>
        ))}
      </div>

      {alerts.length > 0 && (
        <div className="mt-2 px-2 py-1 text-[9px] tracking-[0.15em]" style={{ background: "#FB718515", border: "1px solid #FB718566", color: "#FB7185" }}>
          ⚠ {alerts[0].event}: {alerts[0].areaDesc?.split(";")[0]}
        </div>
      )}
    </Panel>
  );
}

// Lazy-loads Leaflet from CDN once and caches the promise.
let leafletLoadPromise = null;
function loadLeaflet() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.L) return Promise.resolve(window.L);
  if (leafletLoadPromise) return leafletLoadPromise;

  leafletLoadPromise = new Promise((resolve, reject) => {
    // CSS
    if (!document.querySelector('link[data-leaflet]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
      link.crossOrigin = "";
      link.setAttribute("data-leaflet", "");
      document.head.appendChild(link);
    }
    // JS
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
    script.crossOrigin = "";
    script.onload = () => resolve(window.L);
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
  return leafletLoadPromise;
}

// ---------------------------------------------------------------------------
// RadarMap — Leaflet map with animated RainViewer radar overlay.
// Used by both the National and Local weather panels. Configurable center,
// zoom, and overlay markers.
// ---------------------------------------------------------------------------
function RadarMap({
  center,             // [lat, lon]
  zoom,               // initial zoom level
  markers,            // [{ lat, lon, label, isYou }]
  className,          // wrapper className for height etc.
  showLabels = true,  // overlay city/state labels (faint)
  accent = "#7DD3FC",
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const radarLayersRef = useRef([]);
  const animTimerRef = useRef(null);
  const animPosRef = useRef(0);
  const framesRef = useRef([]);
  const apiHostRef = useRef(null);
  const cancelledRef = useRef(false);
  const [timestamp, setTimestamp] = useState("");
  const [mapReady, setMapReady] = useState(false);

  // Initialize map once
  useEffect(() => {
    let cancelled = false;
    cancelledRef.current = false;
    let observer = null;

    (async () => {
      const L = await loadLeaflet();
      if (cancelled || !L || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        keyboard: false,
        touchZoom: false,
      }).setView(center, zoom);

      // Dark base
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
        maxZoom: 12,
        subdomains: "abcd",
      }).addTo(map);

      if (showLabels) {
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", {
          maxZoom: 12,
          subdomains: "abcd",
          opacity: 0.5,
        }).addTo(map);
      }

      mapInstanceRef.current = map;
      setMapReady(true);

      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(() => map.invalidateSize());
        observer.observe(mapRef.current);
      }
    })();

    return () => {
      cancelled = true;
      cancelledRef.current = true;
      if (observer) observer.disconnect();
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render markers (re-runs when markers array changes)
  useEffect(() => {
    const L = window.L;
    const map = mapInstanceRef.current;
    if (!L || !map || !mapReady) return;

    map.eachLayer((layer) => {
      if (layer.options?.isOverlayMarker) map.removeLayer(layer);
    });

    (markers || []).forEach((m) => {
      if (m.lat == null || m.lon == null) return;
      const dotSize = m.isYou ? 8 : 4;
      const dotStyle = m.isYou
        ? `
            width: ${dotSize}px; height: ${dotSize}px;
            background: ${accent};
            box-shadow: 0 0 8px ${accent}, 0 0 16px ${accent};
            border-radius: 50%;
            animation: corePulse 1.5s ease-in-out infinite;
          `
        : `
            width: ${dotSize}px; height: ${dotSize}px;
            background: ${accent};
            box-shadow: 0 0 4px ${accent};
            border-radius: 50%;
          `;
      const labelHtml = m.label
        ? `<div style="
            font-family: ui-monospace, 'SF Mono', monospace;
            color: ${accent};
            font-size: 10px;
            letter-spacing: 0.05em;
            text-shadow: 0 0 4px ${accent}, 0 0 2px #000, 0 0 2px #000;
            white-space: nowrap;
            transform: translate(${dotSize + 4}px, -50%);
          ">${m.label}</div>`
        : "";
      const html = `${labelHtml}<div style="${dotStyle}"></div>`;
      const icon = L.divIcon({ html, className: "", iconSize: [dotSize, dotSize], iconAnchor: [dotSize / 2, dotSize / 2] });
      L.marker([m.lat, m.lon], { icon, isOverlayMarker: true, interactive: false }).addTo(map);
    });
  }, [markers, mapReady, accent]);

  // Fetch RainViewer frames + animate
  useEffect(() => {
    if (!mapReady) return;
    let cancelled = false;

    const start = async () => {
      try {
        const resp = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        if (!resp.ok) return;
        const data = await resp.json();
        if (cancelled) return;

        apiHostRef.current = data.host;
        const past = data.radar?.past || [];
        const nowcast = data.radar?.nowcast || [];
        framesRef.current = [...past, ...nowcast];
        if (!framesRef.current.length) return;

        animPosRef.current = past.length - 1; // start at "now"
        playAnimation();
      } catch {}
    };

    const playAnimation = () => {
      const L = window.L;
      const map = mapInstanceRef.current;
      const frames = framesRef.current;
      if (!L || !map || !frames.length || cancelled) return;

      const tick = () => {
        if (cancelled) return;
        const frame = frames[animPosRef.current];
        const tileUrl = `${apiHostRef.current}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;

        const layer = L.tileLayer(tileUrl, {
          tileSize: 256,
          opacity: 0.0,
          zIndex: 100,
        }).addTo(map);

        let opacity = 0;
        const fadeIn = setInterval(() => {
          opacity += 0.15;
          if (opacity >= 0.7) {
            opacity = 0.7;
            clearInterval(fadeIn);
            while (radarLayersRef.current.length > 1) {
              const old = radarLayersRef.current.shift();
              if (old) map.removeLayer(old);
            }
          }
          layer.setOpacity(opacity);
        }, 30);

        radarLayersRef.current.push(layer);

        const date = new Date(frame.time * 1000);
        const ctTime = date.toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" });
        setTimestamp(`${ctTime} CT`);

        animPosRef.current = (animPosRef.current + 1) % frames.length;
        animTimerRef.current = setTimeout(tick, 800);
      };

      tick();
    };

    start();

    return () => {
      cancelled = true;
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      if (mapInstanceRef.current) {
        radarLayersRef.current.forEach((layer) => mapInstanceRef.current.removeLayer(layer));
        radarLayersRef.current = [];
      }
    };
  }, [mapReady]);

  return (
    <div className={`relative overflow-hidden ${className || ""}`} style={{ background: "#020617", border: `1px solid ${accent}22` }}>
      <div ref={mapRef} className="absolute inset-0" style={{ background: "#020617" }} />
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] tracking-[0.2em] opacity-60" style={{ color: accent }}>
          LOADING RADAR…
        </div>
      )}
      <div className="absolute top-1 left-2 text-[8px] tracking-[0.2em] z-[400] pointer-events-none" style={{ color: accent, opacity: 0.85, textShadow: "0 0 4px #000" }}>RAINVIEWER · LIVE</div>
      <div className="absolute top-1 right-2 text-[8px] tracking-[0.2em] z-[400] pointer-events-none tabular-nums" style={{ color: accent, opacity: 0.85, textShadow: "0 0 4px #000" }}>{timestamp}</div>
    </div>
  );
}

function NationalWeather({ highlighted, weather }) {
  const accent = "#7DD3FC";
  const cities = weather?.national?.cities || [];
  const markers = cities
    .filter((c) => c.lat != null && c.lon != null)
    .map((c) => ({
      lat: c.lat,
      lon: c.lon,
      label: `${c.code} ${c.tempF != null ? c.tempF + "°" : "—"}`,
    }));

  return (
    <Panel title="NATIONAL // CONUS" code="WX.02" accent={accent} highlighted={highlighted} panelKey="national_weather">
      <RadarMap
        center={[39.5, -98.35]}
        zoom={3}
        markers={markers}
        className="h-44"
        accent={accent}
      />
    </Panel>
  );
}

function MiniSparkline({ up, color }) {
  const pts = [];
  let y = 50;
  for (let x = 0; x <= 100; x += 5) {
    y += (Math.random() - 0.5) * 8 + (up ? -0.4 : 0.4);
    y = Math.max(15, Math.min(85, y));
    pts.push(`${x},${y}`);
  }
  return (
    <svg viewBox="0 0 100 100" className="w-full h-8" preserveAspectRatio="none">
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" opacity="0.9" />
      <polyline points={`${pts.join(" ")} 100,100 0,100`} fill={color} opacity="0.1" />
    </svg>
  );
}

function StatusPill({ session }) {
  if (session === "open") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] tracking-[0.2em]" style={{ background: "#34D39922", border: "1px solid #34D39966", color: "#34D399" }}>
        <span className="w-1 h-1 rounded-full bg-emerald-400" style={{ animation: "corePulse 1.5s ease-in-out infinite" }} />
        LIVE
      </span>
    );
  }
  if (session === "afterhours") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] tracking-[0.2em]" style={{ background: "#FBBF2422", border: "1px solid #FBBF2466", color: "#FBBF24" }}>
        <span className="w-1 h-1 rounded-full bg-amber-400" />
        AFTER HRS
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] tracking-[0.2em]" style={{ background: "#64748B22", border: "1px solid #64748B66", color: "#94A3B8" }}>
      <span className="w-1 h-1 rounded-full bg-slate-400" />
      CLOSED
    </span>
  );
}

function WatchlistPanel({ highlighted, watchlist, session, loading, error }) {
  const accent = "#67E8F9";
  // Title reflects market state for the watchlist
  const title = session === "open" ? "WATCHLIST · LIVE" : session === "afterhours" ? "WATCHLIST · AFTER HRS" : "WATCHLIST · CLOSED";
  return (
    <Panel title={title} code="MKT.01" accent={accent} highlighted={highlighted} panelKey="watchlist">
      <div className="flex justify-end mb-1">
        <StatusPill session={session} />
      </div>
      <div className="space-y-2">
        {watchlist.map((stock) => {
          const up = (stock.chg ?? 0) >= 0;
          const color = up ? "#34D399" : "#FB7185";
          const hasData = stock.val != null;
          return (
            <div key={stock.id} className="flex items-center gap-3 py-1.5 border-b last:border-b-0" style={{ borderColor: `${accent}15` }}>
              <div className="w-20">
                <div className="text-[10px] tracking-[0.2em] opacity-70">{stock.name}</div>
                <div className="text-[8px] tracking-[0.15em] opacity-40">{stock.symbol || stock.id}</div>
              </div>
              <div className="flex-1"><MiniSparkline up={up} color={color} /></div>
              <div className="text-right">
                {hasData ? (
                  <>
                    <div className="text-sm font-light tabular-nums" style={{ color: accent }}>
                      {stock.val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] tabular-nums" style={{ color }}>
                      {up ? "▲" : "▼"} {Math.abs(stock.chg).toFixed(2)} ({up ? "+" : ""}{(stock.pct ?? 0).toFixed(2)}%)
                    </div>
                  </>
                ) : (
                  <div className="text-[10px] opacity-40 italic">{loading ? "loading…" : error ? "no data" : "—"}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {error && <div className="mt-2 text-[9px]" style={{ color: "#FB7185" }}>{error}</div>}
    </Panel>
  );
}

function CommoditiesPanel({ highlighted, commodities, session, loading, error }) {
  const accent = "#67E8F9";
  return (
    <Panel title="COMMODITIES" code="MKT.02" accent={accent} highlighted={highlighted} panelKey="commodities">
      <div className="flex justify-end mb-1">
        <StatusPill session={session} />
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {commodities.map((c) => {
          const up = (c.chg ?? 0) >= 0;
          const color = up ? "#34D399" : "#FB7185";
          const hasData = c.val != null;
          return (
            <div key={c.id} className="py-1 border-b" style={{ borderColor: `${accent}10` }}>
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] tracking-[0.2em] opacity-70">{c.name}</span>
                <span className="text-[8px] opacity-40 tracking-[0.1em]">{c.id}</span>
              </div>
              {hasData ? (
                <>
                  <div className="flex justify-between items-baseline mt-0.5">
                    <span className="text-sm font-light tabular-nums" style={{ color: accent }}>{c.val.toFixed(2)}</span>
                    <span className="text-[10px] tabular-nums" style={{ color }}>{up ? "+" : ""}{c.chg.toFixed(2)}</span>
                  </div>
                  <div className="text-[8px] opacity-30 tracking-[0.1em] mt-0.5">{c.unit}</div>
                </>
              ) : (
                <div className="text-[10px] opacity-40 italic mt-0.5">{loading ? "loading…" : error ? "no data" : "—"}</div>
              )}
            </div>
          );
        })}
      </div>
      {error && <div className="mt-2 text-[9px]" style={{ color: "#FB7185" }}>{error}</div>}
    </Panel>
  );
}

function VideoFeed({ network, code, panelKey, highlighted }) {
  const accent = "#A78BFA";
  return (
    <Panel title={network} code={code} accent={accent} highlighted={highlighted} panelKey={panelKey}>
      <div className="relative aspect-video overflow-hidden" style={{ background: "#020617", border: `1px solid ${accent}22` }}>
        <div className="absolute inset-0 pointer-events-none opacity-30" style={{ backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${accent}08 2px, ${accent}08 3px)` }} />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><filter id='n'><feTurbulence baseFrequency='0.95' /></filter><rect width='100' height='100' filter='url(%23n)' /></svg>")` }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl tracking-[0.3em] font-light mb-2" style={{ color: accent, filter: `drop-shadow(0 0 8px ${accent})` }}>{network}</div>
          <div className="text-[9px] tracking-[0.3em] opacity-60" style={{ color: accent }}>FEED PLACEHOLDER</div>
          <div className="text-[8px] tracking-[0.2em] opacity-40 mt-1" style={{ color: accent }}>EMBED ENDPOINT REQUIRED</div>
        </div>
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-1.5 py-0.5" style={{ background: "#FB718533", border: "1px solid #FB7185" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" style={{ animation: "corePulse 1.2s ease-in-out infinite" }} />
          <span className="text-[8px] tracking-[0.2em] text-rose-300">LIVE</span>
        </div>
      </div>
    </Panel>
  );
}

function ConversationPanel({ messages, highlighted }) {
  const accent = "#A78BFA";
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  return (
    <Panel title="CONVERSATION" code="VOX.01" accent={accent} highlighted={highlighted} panelKey="transcript">
      <div ref={scrollRef} className="space-y-2 max-h-44 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="text-[11px] opacity-40 italic" style={{ color: accent }}>
            Standing by. Hold the spacebar or tap the mic to speak.
          </div>
        )}
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <div key={i} className="flex gap-2 text-[11px] leading-relaxed">
              <span className="text-[9px] tabular-nums opacity-50 flex-shrink-0 mt-0.5 w-8" style={{ color: isUser ? "#7DD3FC" : accent }}>
                {isUser ? "YOU" : "JVS"}
              </span>
              <span style={{ color: isUser ? "#CBD5E1" : "#E0E7FF" }}>{m.display}</span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ============================================================
// MAIN
// ============================================================

export default function JarvisBriefing() {
  const [mode, setMode] = useState("idle");
  const [conversation, setConversation] = useState([]);
  const [highlightedPanel, setHighlightedPanel] = useState(null);
  const [now, setNow] = useState(new Date());
  const [voiceError, setVoiceError] = useState(null);
  const [interimTranscript, setInterimTranscript] = useState("");

  // Live market data
  const [marketData, setMarketData] = useState({
    fetchedAt: null,
    watchlist: FALLBACK_WATCHLIST,
    commodities: FALLBACK_COMMODITIES,
  });
  const [marketLoading, setMarketLoading] = useState(true);
  const [marketError, setMarketError] = useState(null);
  const marketSession = getMarketSession(now);

  // Live weather data
  const [weatherData, setWeatherData] = useState(FALLBACK_WEATHER);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(null);

  // Keep refs in sync so the tool executor (which is created once) can read latest values
  const marketDataRef = useRef(marketData);
  const marketSessionRef = useRef(marketSession);
  const weatherDataRef = useRef(weatherData);
  useEffect(() => { marketDataRef.current = marketData; }, [marketData]);
  useEffect(() => { marketSessionRef.current = marketSession; }, [marketSession]);
  useEffect(() => { weatherDataRef.current = weatherData; }, [weatherData]);

  const apiMessagesRef = useRef([]);
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch market data on mount + every 60 seconds.
  // The Cloudflare Function caches at the edge for 60s too, so this
  // only actually hits Twelve Data once per minute across all users.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/market");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setMarketError(data.error || "Failed to load market data");
          setMarketLoading(false);
          return;
        }
        setMarketData({
          fetchedAt: data.fetchedAt,
          watchlist: data.watchlist?.length ? data.watchlist : FALLBACK_WATCHLIST,
          commodities: data.commodities?.length ? data.commodities : FALLBACK_COMMODITIES,
        });
        setMarketError(null);
        setMarketLoading(false);
      } catch (err) {
        if (!cancelled) {
          setMarketError(`Network error: ${String(err)}`);
          setMarketLoading(false);
        }
      }
    };
    load();
    const interval = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Fetch weather data on mount + every 10 minutes.
  // Cloudflare Function caches at the edge for 10 minutes too, so this
  // only actually hits NOAA roughly every 10 minutes across all users.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/weather");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setWeatherError(data.error || "Failed to load weather data");
          setWeatherLoading(false);
          return;
        }
        // Preserve lat/lon from FALLBACK_WEATHER for the map markers
        // (NOAA payload doesn't echo them back, only city codes and temps).
        const fallbackByCode = Object.fromEntries(
          FALLBACK_WEATHER.national.cities.map((c) => [c.code, c])
        );
        const merged = {
          ...data,
          national: {
            ...data.national,
            cities: data.national.cities.map((c) => ({
              ...fallbackByCode[c.code],
              ...c,
            })),
          },
        };
        setWeatherData(merged);
        setWeatherError(null);
        setWeatherLoading(false);
      } catch (err) {
        if (!cancelled) {
          setWeatherError(`Network error: ${String(err)}`);
          setWeatherLoading(false);
        }
      }
    };
    load();
    const interval = setInterval(load, 10 * 60 * 1000); // 10 min
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Pre-warm voices list (some browsers load it async)
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  const speak = useCallback((text) => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis || !text) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.98;
      u.pitch = 0.85;
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => /daniel|alex|google uk english male|microsoft david|microsoft george/i.test(v.name)) ||
        voices.find((v) => v.lang?.startsWith("en"));
      if (preferred) u.voice = preferred;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });
  }, []);

  const sendToClaude = useCallback(async (userMessage) => {
    setMode("thinking");

    const newUserMsg = { role: "user", content: userMessage };
    let messages = [...apiMessagesRef.current, newUserMsg];

    for (let round = 0; round < 5; round++) {
      let response;
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages }),
        });
        response = await res.json();
        if (!res.ok) {
          const errMsg = response.error || "Unknown error";
          setConversation((c) => [...c, { role: "assistant", display: `[Error: ${errMsg}]` }]);
          setMode("idle");
          return;
        }
      } catch (err) {
        setConversation((c) => [...c, { role: "assistant", display: `[Network error: ${String(err)}]` }]);
        setMode("idle");
        return;
      }

      messages = [...messages, { role: "assistant", content: response.content }];

      const textBlocks = response.content.filter((b) => b.type === "text");
      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
      const spokenText = textBlocks.map((b) => b.text).join(" ").trim();

      if (toolUseBlocks.length === 0) {
        if (spokenText) {
          setConversation((c) => [...c, { role: "assistant", display: spokenText }]);
          apiMessagesRef.current = messages;
          setMode("speaking");
          await speak(spokenText);
        } else {
          apiMessagesRef.current = messages;
        }
        setMode("idle");
        return;
      }

      const toolResults = toolUseBlocks.map((tb) => {
        const result = executeToolCall(tb.name, tb.input, {
          setHighlightedPanel,
          triggerBriefing: () => {},
          marketData: marketDataRef.current,
          marketSession: marketSessionRef.current,
          weatherData: weatherDataRef.current,
        });
        return { type: "tool_result", tool_use_id: tb.id, content: result };
      });

      if (spokenText) {
        setConversation((c) => [...c, { role: "assistant", display: spokenText }]);
        setMode("speaking");
        await speak(spokenText);
        setMode("thinking");
      }

      messages = [...messages, { role: "user", content: toolResults }];
    }

    apiMessagesRef.current = messages;
    setMode("idle");
  }, [speak]);

  const startListening = useCallback(() => {
    if (isListeningRef.current) return;
    setVoiceError(null);

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setVoiceError("Speech recognition not supported. Use Chrome, Edge, or Safari.");
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = "";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcript;
        else interim += transcript;
      }
      setInterimTranscript(interim || finalTranscript);
    };

    recognition.onerror = (event) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        setVoiceError(`Voice error: ${event.error}`);
      }
      isListeningRef.current = false;
      setMode("idle");
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      setInterimTranscript("");
      const text = finalTranscript.trim();
      if (text) {
        setConversation((c) => [...c, { role: "user", display: text }]);
        sendToClaude(text);
      } else {
        setMode("idle");
      }
    };

    recognitionRef.current = recognition;
    isListeningRef.current = true;
    setMode("listening");
    recognition.start();
  }, [sendToClaude]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (e.code === "Space" && !e.repeat && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        if (mode === "idle") startListening();
      }
    };
    const onKeyUp = (e) => {
      const tag = document.activeElement?.tagName;
      if (e.code === "Space" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        if (isListeningRef.current) stopListening();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [mode, startListening, stopListening]);

  const handleMicClick = () => {
    if (mode === "idle") startListening();
    else if (mode === "listening") stopListening();
  };

  const timeStr = now.toLocaleTimeString("en-US", { hour12: false });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase();

  return (
    <div className="min-h-screen w-full text-slate-200 font-mono relative overflow-hidden" style={{ background: "radial-gradient(ellipse at center, #0B1626 0%, #060B14 60%, #03070D 100%)" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(rgba(125, 211, 252, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(125, 211, 252, 0.05) 1px, transparent 1px)`, backgroundSize: "32px 32px", maskImage: "radial-gradient(ellipse at center, black 30%, transparent 95%)", WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 95%)" }} />
      <div className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence baseFrequency='0.9' /></filter><rect width='200' height='200' filter='url(%23n)' /></svg>")` }} />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spinReverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes corePulse { 0%, 100% { opacity: 0.85; } 50% { opacity: 1; } }
        @keyframes thinkingPulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.1); opacity: 1; } }
        @keyframes scanline { 0% { transform: translateY(-160px); opacity: 0; } 10% { opacity: 0.6; } 90% { opacity: 0.6; } 100% { transform: translateY(160px); opacity: 0; } }
        @keyframes flicker { 0%, 100% { opacity: 1; } 50% { opacity: 0.93; } }
        @keyframes blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
      `}</style>

      <div className="relative z-10 flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: "#7DD3FC22" }}>
        <div className="flex items-center gap-4">
          <span className="text-[10px] tracking-[0.3em]" style={{ color: "#7DD3FC" }}>● JARVIS // INTERACTIVE</span>
          <span className="text-[10px] tracking-[0.2em] opacity-50">v2.0.0</span>
        </div>
        <div className="flex items-center gap-6 text-[10px] tracking-[0.25em]">
          <span className="opacity-60">{dateStr}</span>
          <span style={{ color: "#7DD3FC" }} className="tabular-nums">{timeStr}<span style={{ animation: "blink 1s steps(1) infinite" }}>:</span></span>
          <span className="opacity-50">SYS.{MODE_LABELS[mode]}</span>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-12 gap-3 p-3">
        <div className="col-span-12 lg:col-span-3 space-y-3">
          <LocalWeather
            highlighted={highlightedPanel === "local_weather"}
            weather={weatherData.local}
            loading={weatherLoading}
            error={weatherError}
          />
          <NationalWeather
            highlighted={highlightedPanel === "national_weather"}
            weather={weatherData}
          />
        </div>

        <div className="col-span-12 lg:col-span-6 space-y-3">
          <div className="relative" style={{ background: "linear-gradient(180deg, #0B162600 0%, #0B162640 100%)", border: "1px solid #7DD3FC22" }}>
            <div className="absolute -top-px -left-px w-3 h-3 border-t border-l" style={{ borderColor: "#7DD3FC" }} />
            <div className="absolute -top-px -right-px w-3 h-3 border-t border-r" style={{ borderColor: "#7DD3FC" }} />
            <div className="absolute -bottom-px -left-px w-3 h-3 border-b border-l" style={{ borderColor: "#7DD3FC" }} />
            <div className="absolute -bottom-px -right-px w-3 h-3 border-b border-r" style={{ borderColor: "#7DD3FC" }} />

            <div className="px-4 pt-4 pb-2 max-w-md mx-auto">
              <JarvisCore mode={mode} />
            </div>

            {interimTranscript && (
              <div className="px-4 pb-2 text-center text-[11px] italic opacity-70" style={{ color: "#7DD3FC" }}>
                "{interimTranscript}"
              </div>
            )}

            {voiceError && (
              <div className="px-4 pb-2 text-center text-[10px]" style={{ color: "#FB7185" }}>
                {voiceError}
              </div>
            )}

            <div className="flex flex-wrap gap-2 justify-center pb-5 px-4">
              <button
                onClick={handleMicClick}
                disabled={mode === "thinking" || mode === "speaking"}
                className="px-6 py-2.5 text-xs tracking-[0.25em] uppercase border transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  borderColor: mode === "listening" ? "#FB7185" : "#7DD3FC",
                  color: mode === "listening" ? "#FB7185" : "#7DD3FC",
                  background: mode === "listening" ? "#FB718515" : "#7DD3FC15",
                  boxShadow: `0 0 20px ${mode === "listening" ? "#FB7185" : "#7DD3FC"}40`,
                }}
              >
                {mode === "listening" ? "■ Stop" : "🎙 Tap or Hold Space"}
              </button>
            </div>
          </div>

          <ConversationPanel messages={conversation} highlighted={highlightedPanel === "transcript"} />

          <div className="grid grid-cols-2 gap-3">
            <VideoFeed network="CNN" code="VID.01" panelKey="cnn" highlighted={highlightedPanel === "cnn"} />
            <VideoFeed network="BLOOMBERG" code="VID.02" panelKey="bloomberg" highlighted={highlightedPanel === "bloomberg"} />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-3 space-y-3">
          <WatchlistPanel
            highlighted={highlightedPanel === "watchlist"}
            watchlist={marketData.watchlist}
            session={marketSession}
            loading={marketLoading}
            error={marketError}
          />
          <CommoditiesPanel
            highlighted={highlightedPanel === "commodities"}
            commodities={marketData.commodities}
            session={marketSession}
            loading={marketLoading}
            error={marketError}
          />
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between px-6 py-2 border-t text-[9px] tracking-[0.25em] opacity-50" style={{ borderColor: "#7DD3FC22" }}>
        <span>HOLD SPACEBAR · OR TAP MIC TO SPEAK</span>
        <span>
          MARKET · {marketLoading ? "LOADING…" : marketError ? "ERROR" : "LIVE / TWELVE DATA"} ·
          {marketData.fetchedAt ? ` ${new Date(marketData.fetchedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""}
        </span>
        <span>SONNET 4.6 · ENG-US</span>
      </div>
    </div>
  );
}
