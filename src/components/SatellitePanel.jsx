import { useState, useEffect, useRef, useCallback } from "react";

const ACCENT = "#67E8F9";

// Category definitions — matches functions/api/satellites.js
const CATEGORIES = [
  { id: "0",  name: "ALL",      color: "#94A3B8" },
  { id: "2",  name: "STATIONS", color: "#67E8F9" },
  { id: "18", name: "STARLINK", color: "#34D399" },
  { id: "22", name: "GPS",      color: "#FBBF24" },
  { id: "3",  name: "WEATHER",  color: "#A78BFA" },
  { id: "52", name: "MILITARY", color: "#FB7185" },
  { id: "65", name: "AMATEUR",  color: "#FB923C" },
];

// Known satellites with friendly names
const KNOWN_SATS = {
  25544: { name: "ISS",          color: "#67E8F9", icon: "🛸" },
  20580: { name: "HUBBLE",       color: "#67E8F9", icon: "🔭" },
  37849: { name: "TIANGONG",     color: "#FB7185", icon: "🛸" },
};

// Leaflet lazy loader
let leafletPromise = null;
function loadLeaflet() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector("link[data-leaflet]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
      link.crossOrigin = "";
      link.setAttribute("data-leaflet", "");
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
    script.crossOrigin = "";
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return leafletPromise;
}

export default function SatellitePanel({ highlighted }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const [satellites, setSatellites] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activeCategory, setActiveCategory] = useState("0");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [passes, setPasses] = useState(null);
  const [showPasses, setShowPasses] = useState(false);
  const fetchIntervalRef = useRef(null);
  const glowColor = highlighted ? "#FBBF24" : ACCENT;

  // ── Init map ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let observer = null;
    (async () => {
      const L = await loadLeaflet();
      if (cancelled || !L || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: true,
      }).setView([20, 0], 1);

      // Dark world map
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
        maxZoom: 6, subdomains: "abcd",
      }).addTo(map);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", {
        maxZoom: 6, subdomains: "abcd", opacity: 0.3,
      }).addTo(map);

      // Observer location marker — The Colony, TX
      const observerIcon = L.divIcon({
        html: `<div style="
          width:8px;height:8px;border-radius:50%;
          background:${ACCENT};
          box-shadow:0 0 8px ${ACCENT},0 0 16px ${ACCENT};
          animation:corePulse 1.5s ease-in-out infinite
        "></div>`,
        className: "", iconSize: [8, 8], iconAnchor: [4, 4],
      });
      L.marker([33.0807, -96.8867], { icon: observerIcon, interactive: false }).addTo(map);

      mapInstanceRef.current = map;
      setMapReady(true);

      if (typeof ResizeObserver !== "undefined" && mapRef.current) {
        observer = new ResizeObserver(() => map.invalidateSize());
        observer.observe(mapRef.current);
      }
    })();
    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // ── Fetch satellites ────────────────────────────────────────────────────
  const fetchSatellites = useCallback(async () => {
    try {
      const res = await fetch(`/api/satellites?mode=above&category=${activeCategory}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
        setLoading(false);
        return;
      }

      const sats = data.above || [];
      setSatellites(sats);
      setLastUpdated(new Date());
      setError(null);
      setLoading(false);
    } catch (err) {
      const isTransient = String(err).includes("network") || String(err).includes("fetch");
      if (!isTransient) setError(String(err));
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    setLoading(true);
    setSatellites([]);
    fetchSatellites();
    fetchIntervalRef.current = setInterval(fetchSatellites, 60000);
    return () => clearInterval(fetchIntervalRef.current);
  }, [fetchSatellites]);

  // ── Fetch pass predictions for selected satellite ───────────────────────
  const fetchPasses = useCallback(async (noradId) => {
    try {
      const res = await fetch(`/api/satellites?mode=passes&id=${noradId}&days=3`);
      const data = await res.json();
      setPasses(data.passes || []);
    } catch {
      setPasses([]);
    }
  }, []);

  // ── Update map markers ──────────────────────────────────────────────────
  useEffect(() => {
    const L = window.L;
    const map = mapInstanceRef.current;
    if (!L || !map || !mapReady || satellites.length === 0) return;

    const seen = new Set();
    const catColor = CATEGORIES.find((c) => c.id === activeCategory)?.color || ACCENT;

    satellites.forEach((sat) => {
      if (!sat.satlat || !sat.satlng) return;
      seen.add(sat.satid);

      const known = KNOWN_SATS[sat.satid];
      const color = known?.color || catColor;
      const size = known ? 10 : 5;

      const iconHtml = known
        ? `<div style="font-size:${size}px;line-height:1;filter:drop-shadow(0 0 3px ${color});cursor:pointer" title="${known.name}">${known.icon}</div>`
        : `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};opacity:0.8;box-shadow:0 0 3px ${color};cursor:pointer"></div>`;

      const icon = L.divIcon({
        html: iconHtml, className: "",
        iconSize: [size, size], iconAnchor: [size / 2, size / 2],
      });

      if (markersRef.current[sat.satid]) {
        markersRef.current[sat.satid].setLatLng([sat.satlat, sat.satlng]);
        markersRef.current[sat.satid].setIcon(icon);
      } else {
        const marker = L.marker([sat.satlat, sat.satlng], { icon })
          .addTo(map)
          .on("click", () => {
            setSelected(sat);
            setShowPasses(false);
            setPasses(null);
          });
        markersRef.current[sat.satid] = marker;
      }
      markersRef.current[sat.satid]
        .off("click")
        .on("click", () => {
          setSelected(sat);
          setShowPasses(false);
          setPasses(null);
        });
    });

    // Remove stale markers
    Object.keys(markersRef.current).forEach((id) => {
      if (!seen.has(parseInt(id))) {
        map.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });
  }, [satellites, mapReady, activeCategory]);

  // ── Format pass time ────────────────────────────────────────────────────
  const formatPassTime = (unixTime) => {
    if (!unixTime) return "—";
    const d = new Date(unixTime * 1000);
    return d.toLocaleString("en-US", {
      timeZone: "America/Chicago",
      weekday: "short", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  };

  return (
    <div
      data-panel="satellite_tracker"
      className="relative bg-slate-950/40 backdrop-blur-sm transition-all duration-500"
      style={{
        border: `1px solid ${highlighted ? glowColor : `${ACCENT}33`}`,
        boxShadow: highlighted ? `0 0 24px ${glowColor}66, inset 0 0 24px ${glowColor}22` : "none",
      }}
    >
      {/* Corner brackets */}
      {["-top-px -left-px border-t border-l", "-top-px -right-px border-t border-r",
        "-bottom-px -left-px border-b border-l", "-bottom-px -right-px border-b border-r"].map((cls, i) => (
        <div key={i} className={`absolute w-3 h-3 ${cls}`}
          style={{ borderColor: highlighted ? glowColor : ACCENT }} />
      ))}

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b"
        style={{ borderColor: `${ACCENT}22`, background: `${ACCENT}08` }}>
        <div className="flex items-center gap-2">
          <span className="inline-block w-1 h-1 rounded-full"
            style={{ background: highlighted ? glowColor : ACCENT, boxShadow: `0 0 6px ${highlighted ? glowColor : ACCENT}` }} />
          <span className="text-[10px] tracking-[0.25em] uppercase"
            style={{ color: highlighted ? glowColor : ACCENT }}>
            SATELLITES // LIVE
          </span>
        </div>
        <div className="flex items-center gap-3">
          {!loading && !error && (
            <span className="text-[9px] tracking-[0.15em]" style={{ color: ACCENT }}>
              {satellites.length} OVERHEAD
            </span>
          )}
          <span className="text-[9px] tracking-[0.2em] opacity-50" style={{ color: ACCENT }}>SAT.01</span>
        </div>
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-1 px-2 py-1.5 border-b"
        style={{ borderColor: `${ACCENT}11` }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => { setActiveCategory(cat.id); setSelected(null); }}
            className="px-1.5 py-0.5 text-[7px] tracking-[0.12em] transition-all"
            style={{
              border: `1px solid ${activeCategory === cat.id ? cat.color : `${cat.color}33`}`,
              color: activeCategory === cat.id ? cat.color : `${cat.color}66`,
              background: activeCategory === cat.id ? `${cat.color}15` : "transparent",
              boxShadow: activeCategory === cat.id ? `0 0 6px ${cat.color}40` : "none",
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="relative" style={{ height: "160px" }}>
        <div ref={mapRef} className="absolute inset-0" style={{ background: "#020617" }} />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10"
            style={{ background: "#020617cc" }}>
            <span className="text-[10px] tracking-[0.2em] opacity-60" style={{ color: ACCENT }}>
              ACQUIRING SATELLITES…
            </span>
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-3 gap-2"
            style={{ background: "#020617cc" }}>
            <span className="text-[9px] tracking-[0.15em] text-center" style={{ color: "#FB7185" }}>
              {error.includes("N2YO_API_KEY") || error.includes("not configured")
                ? "ADD N2YO_API_KEY TO CLOUDFLARE ENV VARS"
                : error}
            </span>
            {(error.includes("N2YO_API_KEY") || error.includes("not configured")) && (
              <span className="text-[8px] tracking-[0.1em] opacity-50 text-center" style={{ color: "#FB7185" }}>
                Free key at n2yo.com
              </span>
            )}
          </div>
        )}

        {/* Observer dot legend */}
        {!loading && !error && (
          <div className="absolute bottom-1 left-1 z-[400] flex items-center gap-1 pointer-events-none">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
            <span className="text-[7px]" style={{ color: ACCENT, textShadow: "0 0 3px #000" }}>
              THE COLONY
            </span>
          </div>
        )}

        {lastUpdated && (
          <div className="absolute top-1 right-1 z-[400] text-[7px] tracking-[0.1em] opacity-60 pointer-events-none"
            style={{ color: ACCENT, textShadow: "0 0 3px #000" }}>
            {lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </div>
        )}
      </div>

      {/* Selected satellite info */}
      {selected && (
        <div className="border-t" style={{ borderColor: `${ACCENT}22` }}>
          <div className="px-3 py-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] tracking-[0.15em] font-medium"
                  style={{ color: KNOWN_SATS[selected.satid]?.color || ACCENT }}>
                  {selected.satname}
                </div>
                <div className="text-[8px] tracking-[0.1em] opacity-50 mt-0.5 font-mono"
                  style={{ color: ACCENT }}>
                  NORAD {selected.satid} · {selected.satlat?.toFixed(2)}°, {selected.satlng?.toFixed(2)}°
                </div>
                {selected.satalt && (
                  <div className="text-[9px] tracking-[0.1em] mt-0.5" style={{ color: ACCENT }}>
                    ALT: {Math.round(selected.satalt)} km
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => { setShowPasses(!showPasses); if (!passes) fetchPasses(selected.satid); }}
                  className="px-2 py-1 text-[7px] tracking-[0.15em] transition-all"
                  style={{
                    border: `1px solid ${showPasses ? ACCENT : `${ACCENT}44`}`,
                    color: showPasses ? ACCENT : `${ACCENT}66`,
                    background: showPasses ? `${ACCENT}15` : "transparent",
                  }}
                >
                  PASSES
                </button>
                <button
                  onClick={() => { setSelected(null); setShowPasses(false); setPasses(null); }}
                  className="text-[9px] opacity-40 hover:opacity-100 px-1"
                  style={{ color: ACCENT }}
                >✕</button>
              </div>
            </div>
          </div>

          {/* Pass predictions */}
          {showPasses && (
            <div className="px-3 pb-2 border-t" style={{ borderColor: `${ACCENT}11` }}>
              <div className="text-[8px] tracking-[0.15em] opacity-50 py-1" style={{ color: ACCENT }}>
                VISIBLE PASSES — NEXT 3 DAYS
              </div>
              {passes === null && (
                <div className="text-[8px] opacity-40" style={{ color: ACCENT }}>Loading…</div>
              )}
              {passes !== null && passes.length === 0 && (
                <div className="text-[8px] opacity-40" style={{ color: ACCENT }}>
                  No visible passes in next 3 days
                </div>
              )}
              {passes !== null && passes.length > 0 && (
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {passes.slice(0, 5).map((p, i) => (
                    <div key={i} className="flex justify-between text-[8px]"
                      style={{ color: ACCENT }}>
                      <span className="opacity-70">{formatPassTime(p.startUTC)}</span>
                      <span>↑{Math.round(p.maxEl)}° · {p.duration}s</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!selected && !loading && !error && satellites.length > 0 && (
        <div className="px-3 py-1 text-[8px] tracking-[0.15em] opacity-30 border-t"
          style={{ borderColor: `${ACCENT}11`, color: ACCENT }}>
          TAP SATELLITE FOR DETAILS + PASS PREDICTIONS
        </div>
      )}
    </div>
  );
}
