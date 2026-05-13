import { useState, useEffect, useRef, useCallback } from "react";

const ACCENT = "#67E8F9";

function CameraCell({ camera, onClick }) {
  const [imgSrc, setImgSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const fetchImage = useCallback(() => {
    // Add cache-busting timestamp
    const url = `/api/traffic-cameras?id=${camera.id}&t=${Date.now()}`;
    const img = new Image();
    img.onload = () => {
      setImgSrc(url);
      setLoading(false);
      setError(false);
      setLastUpdated(new Date());
    };
    img.onerror = () => {
      setLoading(false);
      setError(true);
    };
    img.src = url;
  }, [camera.id]);

  useEffect(() => {
    fetchImage();
    intervalRef.current = setInterval(fetchImage, 30000);
    return () => clearInterval(intervalRef.current);
  }, [fetchImage]);

  return (
    <div
      className="relative cursor-pointer overflow-hidden group"
      style={{ background: "#020617", border: `1px solid ${ACCENT}22` }}
      onClick={() => onClick(camera)}
    >
      {/* Image */}
      {imgSrc && !error && (
        <img
          src={imgSrc}
          alt={camera.name}
          className="w-full h-full object-cover"
          style={{ opacity: 0.9 }}
        />
      )}

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[8px] tracking-[0.15em] opacity-50" style={{ color: ACCENT }}>
            LOADING…
          </span>
        </div>
      )}

      {/* Error / unavailable */}
      {error && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span className="text-lg opacity-20">📷</span>
          <span className="text-[7px] tracking-[0.1em] opacity-40" style={{ color: ACCENT }}>
            UNAVAILABLE
          </span>
        </div>
      )}

      {/* Camera label overlay */}
      <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5"
        style={{ background: "linear-gradient(transparent, #02061799)" }}>
        <div className="text-[7px] tracking-[0.1em] truncate" style={{ color: ACCENT, textShadow: "0 0 4px #000" }}>
          {camera.highway} · {camera.direction}
        </div>
      </div>

      {/* Live indicator */}
      {!error && (
        <div className="absolute top-1 left-1">
          <div className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#34D399", boxShadow: "0 0 4px #34D399", animation: "corePulse 2s ease-in-out infinite" }} />
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        style={{ background: `${ACCENT}15` }}>
        <span className="text-[8px] tracking-[0.2em]" style={{ color: ACCENT }}>EXPAND</span>
      </div>
    </div>
  );
}

// Full-screen expanded camera view
function CameraExpanded({ camera, onClose }) {
  const [imgSrc, setImgSrc] = useState(`/api/traffic-cameras?id=${camera.id}&t=${Date.now()}`);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const url = `/api/traffic-cameras?id=${camera.id}&t=${Date.now()}`;
      setImgSrc(url);
      setLastUpdated(new Date());
    }, 10000); // faster refresh when expanded
    return () => clearInterval(intervalRef.current);
  }, [camera.id]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#020617ee" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ borderBottom: `1px solid ${ACCENT}22` }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: "#34D399", boxShadow: "0 0 6px #34D399", animation: "corePulse 1.5s ease-in-out infinite" }} />
          <span className="text-[10px] tracking-[0.3em]" style={{ color: ACCENT }}>
            {camera.name.toUpperCase()}
          </span>
          <span className="text-[9px] tracking-[0.15em] opacity-50" style={{ color: ACCENT }}>
            {camera.highway} · {camera.location}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[9px] tracking-[0.15em] opacity-50" style={{ color: ACCENT }}>
            {lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-[10px] tracking-[0.25em]"
            style={{ border: "1px solid #FB7185", color: "#FB7185", background: "#FB718515" }}
          >
            ✕ CLOSE
          </button>
        </div>
      </div>

      {/* Full image */}
      <div className="flex-1 flex items-center justify-center p-4">
        <img
          src={imgSrc}
          alt={camera.name}
          className="max-w-full max-h-full object-contain"
          style={{ border: `1px solid ${ACCENT}33`, boxShadow: `0 0 32px ${ACCENT}22` }}
        />
      </div>

      <div className="text-center pb-3 text-[8px] tracking-[0.2em] opacity-30" style={{ color: ACCENT }}>
        ESC TO CLOSE · REFRESHES EVERY 10 SECONDS
      </div>
    </div>
  );
}

export default function TrafficCameraPanel({ highlighted }) {
  const [cameras, setCameras] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const glowColor = highlighted ? "#FBBF24" : ACCENT;

  useEffect(() => {
    fetch("/api/traffic-cameras")
      .then((r) => r.json())
      .then((data) => {
        setCameras(data.cameras || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <div
        data-panel="traffic_cameras"
      className="relative bg-slate-950/40 backdrop-blur-sm transition-all duration-500"
        style={{
          border: `1px solid ${highlighted ? glowColor : `${ACCENT}33`}`,
          boxShadow: highlighted ? `0 0 24px ${glowColor}66` : "none",
        }}
      >
        {/* Corner brackets */}
        {["-top-px -left-px border-t border-l", "-top-px -right-px border-t border-r",
          "-bottom-px -left-px border-b border-l", "-bottom-px -right-px border-b border-r"].map((cls, i) => (
          <div key={i} className={`absolute w-3 h-3 ${cls}`} style={{ borderColor: highlighted ? glowColor : ACCENT }} />
        ))}

        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b"
          style={{ borderColor: `${ACCENT}22`, background: `${ACCENT}08` }}>
          <div className="flex items-center gap-2">
            <span className="inline-block w-1 h-1 rounded-full"
              style={{ background: highlighted ? glowColor : ACCENT, boxShadow: `0 0 6px ${highlighted ? glowColor : ACCENT}` }} />
            <span className="text-[10px] tracking-[0.25em] uppercase" style={{ color: highlighted ? glowColor : ACCENT }}>
              TRAFFIC CAMERAS // DFW
            </span>
          </div>
          <span className="text-[9px] tracking-[0.2em] opacity-50" style={{ color: ACCENT }}>CAM.01</span>
        </div>

        <div className="p-2">
          {loading && (
            <div className="h-32 flex items-center justify-center">
              <span className="text-[10px] tracking-[0.2em] opacity-40" style={{ color: ACCENT }}>
                LOADING CAMERAS…
              </span>
            </div>
          )}

          {!loading && cameras.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5" style={{ height: "180px" }}>
              {cameras.slice(0, 4).map((cam) => (
                <CameraCell key={cam.id} camera={cam} onClick={setExpanded} />
              ))}
            </div>
          )}

          {!loading && cameras.length === 0 && (
            <div className="h-32 flex items-center justify-center">
              <span className="text-[9px] tracking-[0.15em] opacity-40" style={{ color: ACCENT }}>
                NO CAMERAS AVAILABLE
              </span>
            </div>
          )}

          {/* Camera names below grid */}
          {!loading && cameras.length > 0 && (
            <div className="grid grid-cols-2 gap-x-2 mt-1">
              {cameras.slice(0, 4).map((cam) => (
                <div key={cam.id} className="text-[7px] tracking-[0.08em] opacity-40 truncate" style={{ color: ACCENT }}>
                  {cam.name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-3 py-1 border-t text-[7px] tracking-[0.15em] opacity-30"
          style={{ borderColor: `${ACCENT}11`, color: ACCENT }}>
          TXDOT LIVE · 30s REFRESH · TAP TO EXPAND
        </div>
      </div>

      {/* Expanded camera modal */}
      {expanded && (
        <CameraExpanded camera={expanded} onClose={() => setExpanded(null)} />
      )}
    </>
  );
}
