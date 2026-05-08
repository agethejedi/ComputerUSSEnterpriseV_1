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

const WEATHER_DATA = {
  local: {
    temp: 47,
    feels: 43,
    humidity: 68,
    wind: "NW 12",
    baro: 30.12,
    conditions: "partly cloudy",
    high: 52,
    low: 38,
    forecast: "Light rain possible around 2 PM, otherwise dry through evening.",
    location: "The Colony, TX",
  },
  national: {
    summary: "Strong storm system tracking across upper Midwest with severe thunderstorm risk for Chicago and Detroit. Pacific Northwest under continued atmospheric river conditions through Thursday. Northeast cold and clear. Gulf coast mild.",
    cities: [
      { name: "San Francisco", temp: 58 },
      { name: "Los Angeles", temp: 71 },
      { name: "Chicago", temp: 39 },
      { name: "New York", temp: 44 },
      { name: "Miami", temp: 78 },
      { name: "Dallas", temp: 62 },
    ],
  },
};

const FUTURES = [
  { sym: "DJIA", name: "DOW FUT", val: 38247, chg: +152, pct: +0.40 },
  { sym: "NDX", name: "NASDAQ FUT", val: 17891, chg: -42, pct: -0.23 },
  { sym: "SPX", name: "S&P FUT", val: 5072.5, chg: +8.25, pct: +0.16 },
];

const COMMODITIES = [
  { sym: "CL", name: "CRUDE OIL", val: 82.47, chg: +1.12, unit: "USD/BBL" },
  { sym: "GC", name: "GOLD", val: 2041.30, chg: -8.40, unit: "USD/OZ" },
  { sym: "NG", name: "NAT GAS", val: 2.87, chg: +0.05, unit: "USD/MMBTU" },
  { sym: "ZW", name: "WHEAT", val: 6.12, chg: -0.08, unit: "USD/BU" },
  { sym: "HG", name: "COPPER", val: 3.84, chg: +0.02, unit: "USD/LB" },
  { sym: "SI", name: "SILVER", val: 22.91, chg: +0.18, unit: "USD/OZ" },
];

// ============================================================
// TOOL EXECUTORS
// ============================================================

function executeToolCall(name, input, ctx) {
  switch (name) {
    case "get_weather": {
      const scope = input.scope || "local";
      if (scope === "national") return JSON.stringify(WEATHER_DATA.national);
      return JSON.stringify(WEATHER_DATA.local);
    }
    case "get_market_data": {
      const symbols = (input.symbols || []).map((s) => s.toLowerCase());
      const wantsAll = symbols.includes("all");
      const all = [...FUTURES, ...COMMODITIES];
      if (wantsAll) return JSON.stringify(all);
      const matches = all.filter((item) =>
        symbols.some((s) =>
          item.sym.toLowerCase() === s ||
          item.name.toLowerCase().includes(s) ||
          s.includes(item.name.toLowerCase().split(" ")[0])
        )
      );
      return JSON.stringify(matches.length ? matches : { note: "No matching symbols found", available: all.map((a) => a.name) });
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

function LocalWeather({ highlighted }) {
  const accent = "#7DD3FC";
  return (
    <Panel title="LOCAL // KGRR" code="WX.01" accent={accent} highlighted={highlighted} panelKey="local_weather">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-4xl font-light tracking-tight" style={{ color: accent }}>{WEATHER_DATA.local.temp}°</div>
          <div className="text-[10px] tracking-[0.2em] opacity-60 mt-1 uppercase">{WEATHER_DATA.local.conditions}</div>
        </div>
        <div className="text-right text-[10px] tracking-[0.15em] opacity-70 space-y-0.5">
          <div>FEELS · {WEATHER_DATA.local.feels}°</div>
          <div>HUMID · {WEATHER_DATA.local.humidity}%</div>
          <div>WIND · {WEATHER_DATA.local.wind}</div>
          <div>BARO · {WEATHER_DATA.local.baro}</div>
        </div>
      </div>

      <div className="relative h-32 overflow-hidden" style={{ background: "#020617", border: `1px solid ${accent}22` }}>
        <svg viewBox="0 0 200 130" className="w-full h-full">
          {[20, 40, 60, 80, 100].map((y) => <line key={`h${y}`} x1="0" y1={y} x2="200" y2={y} stroke={accent} strokeWidth="0.3" opacity="0.15" />)}
          {[40, 80, 120, 160].map((x) => <line key={`v${x}`} x1={x} y1="0" x2={x} y2="130" stroke={accent} strokeWidth="0.3" opacity="0.15" />)}
          <path d="M 20 90 Q 60 70, 100 80 T 180 70 L 180 130 L 20 130 Z" fill={accent} opacity="0.05" />
          <ellipse cx="80" cy="55" rx="35" ry="18" fill="#22D3EE" opacity="0.4" />
          <ellipse cx="85" cy="55" rx="22" ry="10" fill="#A78BFA" opacity="0.5" />
          <ellipse cx="88" cy="55" rx="10" ry="5" fill="#F472B6" opacity="0.6" />
          <g style={{ transformOrigin: "100px 65px", animation: "spin 6s linear infinite" }}>
            <line x1="100" y1="65" x2="100" y2="10" stroke={accent} strokeWidth="0.5" opacity="0.6" />
            <path d="M 100 65 L 100 10 A 55 55 0 0 1 138 25 Z" fill={accent} opacity="0.08" />
          </g>
          <circle cx="100" cy="65" r="2" fill={accent} />
          <text x="103" y="75" fill={accent} fontSize="5" opacity="0.7" fontFamily="monospace">YOU</text>
        </svg>
        <div className="absolute top-1 left-2 text-[8px] tracking-[0.2em]" style={{ color: accent, opacity: 0.7 }}>RADAR · 1KM</div>
        <div className="absolute bottom-1 right-2 text-[8px] tracking-[0.2em]" style={{ color: accent, opacity: 0.5 }}>LIVE</div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2">
        {["6AM", "12PM", "6PM", "12AM"].map((t, i) => (
          <div key={t} className="text-center">
            <div className="text-[9px] tracking-[0.15em] opacity-50">{t}</div>
            <div className="text-sm font-light" style={{ color: accent }}>{[42, 51, 49, 38][i]}°</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function NationalWeather({ highlighted }) {
  const accent = "#7DD3FC";
  return (
    <Panel title="NATIONAL // CONUS" code="WX.02" accent={accent} highlighted={highlighted} panelKey="national_weather">
      <div className="relative h-44" style={{ background: "#020617", border: `1px solid ${accent}22` }}>
        <svg viewBox="0 0 300 180" className="w-full h-full">
          {[30, 60, 90, 120, 150].map((y) => <line key={`h${y}`} x1="0" y1={y} x2="300" y2={y} stroke={accent} strokeWidth="0.3" opacity="0.12" />)}
          {[40, 80, 120, 160, 200, 240, 280].map((x) => <line key={`v${x}`} x1={x} y1="0" x2={x} y2="180" stroke={accent} strokeWidth="0.3" opacity="0.12" />)}
          <path d="M 30 60 L 80 50 L 130 45 L 180 48 L 230 55 L 270 70 L 275 100 L 250 130 L 200 145 L 150 150 L 100 145 L 60 130 L 35 110 Z" fill={accent} opacity="0.04" stroke={accent} strokeWidth="0.5" strokeOpacity="0.3" />
          <ellipse cx="55" cy="90" rx="20" ry="35" fill="#22D3EE" opacity="0.35" />
          <ellipse cx="55" cy="90" rx="12" ry="22" fill="#A78BFA" opacity="0.4" />
          <ellipse cx="160" cy="85" rx="35" ry="22" fill="#F472B6" opacity="0.3" />
          <ellipse cx="160" cy="85" rx="20" ry="12" fill="#FB7185" opacity="0.5" />
          <ellipse cx="240" cy="70" rx="22" ry="14" fill="#E0E7FF" opacity="0.4" />
          <ellipse cx="180" cy="135" rx="28" ry="10" fill="#34D399" opacity="0.3" />
          <path d="M 80 60 Q 130 80 200 75" fill="none" stroke="#FB7185" strokeWidth="1" strokeDasharray="4 2" opacity="0.6" />
          <path d="M 100 120 Q 160 110 220 125" fill="none" stroke="#22D3EE" strokeWidth="1" strokeDasharray="4 2" opacity="0.6" />
          {[
            { x: 50, y: 95, label: "SFO 58°" },
            { x: 100, y: 130, label: "LAX 71°" },
            { x: 165, y: 90, label: "CHI 39°" },
            { x: 245, y: 75, label: "NYC 44°" },
            { x: 195, y: 140, label: "MIA 78°" },
            { x: 130, y: 135, label: "DFW 62°" },
          ].map((c, i) => (
            <g key={i}>
              <circle cx={c.x} cy={c.y} r="1.5" fill={accent} />
              <text x={c.x + 4} y={c.y + 3} fill={accent} fontSize="6" fontFamily="monospace" opacity="0.85">{c.label}</text>
            </g>
          ))}
        </svg>
        <div className="absolute top-1 left-2 text-[8px] tracking-[0.2em]" style={{ color: accent, opacity: 0.7 }}>NEXRAD COMPOSITE</div>
        <div className="absolute bottom-1 right-2 text-[8px] tracking-[0.2em] flex gap-3" style={{ color: accent, opacity: 0.6 }}>
          <span className="flex items-center gap-1"><span className="w-2 h-2 inline-block" style={{ background: "#22D3EE" }} />RAIN</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 inline-block" style={{ background: "#E0E7FF" }} />SNOW</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 inline-block" style={{ background: "#F472B6" }} />STORM</span>
        </div>
      </div>
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

function FuturesPanel({ highlighted }) {
  const accent = "#67E8F9";
  return (
    <Panel title="INDEX FUTURES" code="MKT.01" accent={accent} highlighted={highlighted} panelKey="futures">
      <div className="space-y-2">
        {FUTURES.map((f) => {
          const up = f.chg >= 0;
          const color = up ? "#34D399" : "#FB7185";
          return (
            <div key={f.sym} className="flex items-center gap-3 py-1.5 border-b last:border-b-0" style={{ borderColor: `${accent}15` }}>
              <div className="w-16">
                <div className="text-[10px] tracking-[0.2em] opacity-70">{f.name}</div>
                <div className="text-[8px] tracking-[0.15em] opacity-40">{f.sym}</div>
              </div>
              <div className="flex-1"><MiniSparkline up={up} color={color} /></div>
              <div className="text-right">
                <div className="text-sm font-light tabular-nums" style={{ color: accent }}>{f.val.toLocaleString(undefined, { minimumFractionDigits: f.val < 100 ? 2 : 0 })}</div>
                <div className="text-[10px] tabular-nums" style={{ color }}>{up ? "▲" : "▼"} {Math.abs(f.chg).toFixed(2)} ({up ? "+" : ""}{f.pct}%)</div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function CommoditiesPanel({ highlighted }) {
  const accent = "#67E8F9";
  return (
    <Panel title="COMMODITIES" code="MKT.02" accent={accent} highlighted={highlighted} panelKey="commodities">
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {COMMODITIES.map((c) => {
          const up = c.chg >= 0;
          const color = up ? "#34D399" : "#FB7185";
          return (
            <div key={c.sym} className="py-1 border-b" style={{ borderColor: `${accent}10` }}>
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] tracking-[0.2em] opacity-70">{c.name}</span>
                <span className="text-[8px] opacity-40 tracking-[0.1em]">{c.sym}</span>
              </div>
              <div className="flex justify-between items-baseline mt-0.5">
                <span className="text-sm font-light tabular-nums" style={{ color: accent }}>{c.val.toFixed(2)}</span>
                <span className="text-[10px] tabular-nums" style={{ color }}>{up ? "+" : ""}{c.chg.toFixed(2)}</span>
              </div>
              <div className="text-[8px] opacity-30 tracking-[0.1em] mt-0.5">{c.unit}</div>
            </div>
          );
        })}
      </div>
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

  const apiMessagesRef = useRef([]);
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
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
          <LocalWeather highlighted={highlightedPanel === "local_weather"} />
          <NationalWeather highlighted={highlightedPanel === "national_weather"} />
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
          <FuturesPanel highlighted={highlightedPanel === "futures"} />
          <CommoditiesPanel highlighted={highlightedPanel === "commodities"} />
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between px-6 py-2 border-t text-[9px] tracking-[0.25em] opacity-50" style={{ borderColor: "#7DD3FC22" }}>
        <span>HOLD SPACEBAR · OR TAP MIC TO SPEAK</span>
        <span>DATA · MOCK // PROTOTYPE</span>
        <span>SONNET 4.6 · ENG-US</span>
      </div>
    </div>
  );
}
