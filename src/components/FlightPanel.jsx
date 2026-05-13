import { useState, useEffect, useRef, useCallback } from "react";

const ACCENT = "#67E8F9";

// Altitude color coding
function altitudeColor(altFt) {
  if (altFt == null) return "#94A3B8";
  if (altFt > 30000) return "#67E8F9";   // cruise — cyan
  if (altFt > 15000) return "#A78BFA";   // mid — purple
  if (altFt > 5000)  return "#34D399";   // approach — green
  if (altFt > 0)     return "#FBBF24";   // low — amber
  return "#94A3B8";                       // ground — slate
}

function altitudeLabel(altFt) {
  if (altFt == null) return "—";
  if (altFt > 30000) return "CRUISE";
  if (altFt > 15000) return "CLIMB";
  if (altFt > 5000)  return "APPROACH";
  if (altFt > 0)     return "LOW";
  return "GROUND";
}

// DFW bounding box
const DFW_BOUNDS = { lamin: 31.5, lomin: -98.5, lamax: 34.5, lomax: -95.5 };

// Leaflet lazy loader (reuses the existing loader from JarvisBriefing)
let leafletReady = false;
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

export default function FlightPanel({ highlighted }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const [aircraft, setAircraft] = useState([]);
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const fetchIntervalRef = useRef(null);

  const glowColor = highlighted ? "#FBBF24" : ACCENT;

  // ── Init map ───────────────────────────────────────────────────────────────
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
        doubleClickZoom: true,
      }).setView([32.8998, -97.0403], 7);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
        maxZoom: 12, subdomains: "abcd",
      }).addTo(map);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", {
        maxZoom: 12, subdomains: "abcd", opacity: 0.4,
      }).addTo(map);

      // Add DFW airport marker
      const dfw = L.divIcon({
        html: `<div style="color:${ACCENT};font-size:9px;letter-spacing:0.1em;text-shadow:0 0 4px ${ACCENT};white-space:nowrap">✈ DFW</div>`,
        className: "", iconSize: [40, 16], iconAnchor: [20, 8],
      });
      L.marker([32.8998, -97.0403], { icon: dfw, interactive: false }).addTo(map);

      const dal = L.divIcon({
        html: `<div style="color:${ACCENT};font-size:9px;letter-spacing:0.1em;text-shadow:0 0 4px ${ACCENT};white-space:nowrap">✈ DAL</div>`,
        className: "", iconSize: [40, 16], iconAnchor: [20, 8],
      });
      L.marker([32.8481, -96.8512], { icon: dal, interactive: false }).addTo(map);

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

  // ── Fetch flights ──────────────────────────────────────────────────────────
  const [rateLimited, setRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState(60);
  const [isStale, setIsStale] = useState(false);

  const fetchFlights = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        lamin: DFW_BOUNDS.lamin,
        lomin: DFW_BOUNDS.lomin,
        lamax: DFW_BOUNDS.lamax,
        lomax: DFW_BOUNDS.lomax,
      });
      const res = await fetch(`/api/flights?${params}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || `HTTP ${res.status}`);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.rateLimited) {
        setRateLimited(true);
        setRetryAfter(data.retryAfter || 60);
        setAuthenticated(false);
        setLoading(false);
        return;
      }
      if (data.timedOut) {
        // Keep existing aircraft on map, mark as stale
        setIsStale(true);
        setLoading(false);
        return;
      }
      setIsStale(false);
      setRateLimited(false);
      setAircraft(data.aircraft || []);
      setAuthenticated(data.authenticated || false);
      setLastUpdated(new Date());
      setError(null);
      setLoading(false);
    } catch (err) {
      setError(`Network error: ${String(err)}`);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlights();
    // Anonymous: 60s refresh to stay within rate limits
    // Authenticated: 15s refresh for live data
    const interval = authenticated ? 15000 : 60000;
    fetchIntervalRef.current = setInterval(fetchFlights, interval);
    return () => clearInterval(fetchIntervalRef.current);
  }, [fetchFlights, authenticated]);

  // ── Update map markers ─────────────────────────────────────────────────────
  useEffect(() => {
    const L = window.L;
    const map = mapInstanceRef.current;
    if (!L || !map || !mapReady || aircraft.length === 0) return;

    const seen = new Set();

    aircraft.forEach((ac) => {
      if (!ac.latitude || !ac.longitude) return;
      seen.add(ac.icao24);
      const color = altitudeColor(ac.altitudeFt);
      const heading = ac.trueTrack || 0;

      const iconHtml = `
        <div style="transform:rotate(${heading}deg);font-size:14px;line-height:1;
          filter:drop-shadow(0 0 3px ${color});color:${color};cursor:pointer">✈</div>
      `;
      const icon = L.divIcon({
        html: iconHtml, className: "",
        iconSize: [16, 16], iconAnchor: [8, 8],
      });

      if (markersRef.current[ac.icao24]) {
        markersRef.current[ac.icao24].setLatLng([ac.latitude, ac.longitude]);
        markersRef.current[ac.icao24].setIcon(icon);
      } else {
        const marker = L.marker([ac.latitude, ac.longitude], { icon })
          .addTo(map)
          .on("click", () => setSelectedAircraft(ac));
        markersRef.current[ac.icao24] = marker;
      }

      // Update click handler to latest data
      markersRef.current[ac.icao24].off("click").on("click", () => setSelectedAircraft(ac));
    });

    // Remove stale markers
    Object.keys(markersRef.current).forEach((icao24) => {
      if (!seen.has(icao24)) {
        map.removeLayer(markersRef.current[icao24]);
        delete markersRef.current[icao24];
      }
    });
  }, [aircraft, mapReady]);

  return (
    <div
      data-panel="flight_tracker"
      className="relative bg-slate-950/40 backdrop-blur-sm transition-all duration-500"
      style={{
        border: `1px solid ${highlighted ? glowColor : `${ACCENT}33`}`,
        boxShadow: highlighted ? `0 0 24px ${glowColor}66, inset 0 0 24px ${glowColor}22` : "none",
      }}
    >
      {/* Corner brackets */}
      {["-top-px -left-px border-t border-l", "-top-px -right-px border-t border-r",
        "-bottom-px -left-px border-b border-l", "-bottom-px -right-px border-b border-r"].map((cls, i) => (
        <div key={i} className={`absolute w-3 h-3 ${cls}`} style={{ borderColor: highlighted ? glowColor : ACCENT }} />
      ))}

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: `${ACCENT}22`, background: `${ACCENT}08` }}>
        <div className="flex items-center gap-2">
          <span className="inline-block w-1 h-1 rounded-full" style={{ background: highlighted ? glowColor : ACCENT, boxShadow: `0 0 6px ${highlighted ? glowColor : ACCENT}` }} />
          <span className="text-[10px] tracking-[0.25em] uppercase" style={{ color: highlighted ? glowColor : ACCENT }}>
            AIR TRAFFIC // DFW
          </span>
        </div>
        <div className="flex items-center gap-3">
          {!loading && !error && (
            <span className="text-[9px] tracking-[0.15em]" style={{ color: isStale ? "#FBBF24" : ACCENT }}>
              {aircraft.length} AIRCRAFT{isStale ? " · RETRYING" : ""}
            </span>
          )}
          <span className="text-[9px] tracking-[0.2em] opacity-50" style={{ color: ACCENT }}>FLT.01</span>
        </div>
      </div>

      {/* Map */}
      <div className="relative" style={{ height: "220px" }}>
        <div ref={mapRef} className="absolute inset-0" style={{ background: "#020617" }} />

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "#020617cc" }}>
            <span className="text-[10px] tracking-[0.2em] opacity-60" style={{ color: ACCENT }}>ACQUIRING AIRCRAFT…</span>
          </div>
        )}

        {/* Error overlay */}
        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-3" style={{ background: "#020617cc" }}>
            <span className="text-[9px] tracking-[0.15em] text-center" style={{ color: "#FB7185" }}>
              {error.includes("401") || error.includes("403")
                ? "ADD OPENSKY_CLIENT_ID & OPENSKY_CLIENT_SECRET TO CLOUDFLARE ENV"
                : error}
            </span>
          </div>
        )}

        {/* Rate limit overlay */}
        {rateLimited && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-3 gap-2" style={{ background: "#020617cc" }}>
            <span className="text-[10px] tracking-[0.2em]" style={{ color: "#FBBF24" }}>RATE LIMITED</span>
            <span className="text-[8px] tracking-[0.15em] text-center opacity-70" style={{ color: "#FBBF24" }}>
              ADD OPENSKY CREDENTIALS TO CLOUDFLARE FOR LIVE DATA
            </span>
            <span className="text-[8px] tracking-[0.1em] opacity-50" style={{ color: "#FBBF24" }}>
              opensky-network.org → free account → API client
            </span>
          </div>
        )}

        {/* Altitude legend */}
        {!loading && !error && (
          <div className="absolute bottom-1 left-1 z-[400] flex flex-col gap-0.5 pointer-events-none">
            {[
              { color: "#67E8F9", label: "30K+" },
              { color: "#A78BFA", label: "15K+" },
              { color: "#34D399", label: "5K+" },
              { color: "#FBBF24", label: "LOW" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                <span className="text-[7px] tracking-[0.1em]" style={{ color, textShadow: "0 0 3px #000" }}>{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Last updated */}
        {lastUpdated && (
          <div className="absolute top-1 right-1 z-[400] text-[7px] tracking-[0.1em] opacity-60 pointer-events-none" style={{ color: ACCENT, textShadow: "0 0 3px #000" }}>
            {lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </div>
        )}

        {/* Auth warning */}
        {!authenticated && !loading && !error && (
          <div className="absolute top-1 left-1 z-[400] px-1.5 py-0.5 text-[7px] tracking-[0.1em]"
            style={{ background: "#FBBF2422", border: "1px solid #FBBF2466", color: "#FBBF24" }}>
            ANON · LIMITED
          </div>
        )}
      </div>

      {/* Selected aircraft info */}
      {selectedAircraft && (
        <div className="px-3 py-2 border-t" style={{ borderColor: `${ACCENT}22` }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] tracking-[0.2em] font-medium" style={{ color: altitudeColor(selectedAircraft.altitudeFt) }}>
                {selectedAircraft.callsign || selectedAircraft.icao24}
              </div>
              <div className="text-[9px] tracking-[0.1em] opacity-60 mt-0.5" style={{ color: ACCENT }}>
                {selectedAircraft.originCountry} · {altitudeLabel(selectedAircraft.altitudeFt)}
              </div>
            </div>
            <div className="text-right text-[9px] tracking-[0.1em] space-y-0.5" style={{ color: ACCENT }}>
              <div>{selectedAircraft.altitudeFt != null ? `${selectedAircraft.altitudeFt.toLocaleString()}ft` : "—"}</div>
              <div>{selectedAircraft.speedKnots != null ? `${selectedAircraft.speedKnots}kts` : "—"}</div>
              <div>{selectedAircraft.trueTrack != null ? `${Math.round(selectedAircraft.trueTrack)}°` : "—"}</div>
            </div>
            <button
              onClick={() => setSelectedAircraft(null)}
              className="text-[9px] opacity-40 hover:opacity-100 ml-2"
              style={{ color: ACCENT }}
            >✕</button>
          </div>
          <div className="text-[8px] opacity-30 mt-1 font-mono" style={{ color: ACCENT }}>
            {selectedAircraft.icao24} · {selectedAircraft.latitude?.toFixed(3)}, {selectedAircraft.longitude?.toFixed(3)}
          </div>
        </div>
      )}

      {/* No selection hint */}
      {!selectedAircraft && !loading && !error && aircraft.length > 0 && (
        <div className="px-3 py-1.5 text-[8px] tracking-[0.15em] opacity-40 border-t" style={{ borderColor: `${ACCENT}11`, color: ACCENT }}>
          TAP AIRCRAFT FOR DETAILS
        </div>
      )}
    </div>
  );
}
