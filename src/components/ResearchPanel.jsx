import { useState, useEffect, useRef, useCallback } from "react";

const ACCENT = "#A78BFA";
const ACCENT_CYAN = "#67E8F9";

// Extract domain from URL
function getDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

// Inline results panel — shows in center column
function InlineResults({ query, results, onOpenFull, onClose, onOpenUrl }) {
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft((n) => {
        if (n <= 1) { clearInterval(t); onClose(); return 0; }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [onClose]);

  return (
    <div className="relative bg-slate-950/40 backdrop-blur-sm"
      style={{ border: `1px solid ${ACCENT}44` }}>
      {/* Corner brackets */}
      {["-top-px -left-px border-t border-l", "-top-px -right-px border-t border-r",
        "-bottom-px -left-px border-b border-l", "-bottom-px -right-px border-b border-r"].map((cls, i) => (
        <div key={i} className={`absolute w-3 h-3 ${cls}`} style={{ borderColor: ACCENT }} />
      ))}

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b"
        style={{ borderColor: `${ACCENT}22`, background: `${ACCENT}08` }}>
        <div className="flex items-center gap-2">
          <span className="inline-block w-1 h-1 rounded-full"
            style={{ background: ACCENT, boxShadow: `0 0 6px ${ACCENT}` }} />
          <span className="text-[10px] tracking-[0.25em] uppercase truncate max-w-xs"
            style={{ color: ACCENT }}>
            RESEARCH // {query.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[8px] tracking-[0.15em] opacity-50" style={{ color: ACCENT }}>
            {timeLeft}s
          </span>
          <button onClick={onClose}
            className="text-[9px] opacity-40 hover:opacity-100 transition-opacity"
            style={{ color: ACCENT }}>✕</button>
        </div>
      </div>

      {/* Results */}
      <div className="divide-y" style={{ borderColor: `${ACCENT}11` }}>
        {results.map((r, i) => (
          <div key={i} className="px-3 py-2 hover:bg-white/5 transition-all group">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[8px] tracking-[0.1em] opacity-40 flex-shrink-0"
                    style={{ color: ACCENT }}>
                    {getDomain(r.url)}
                  </span>
                  <span className="text-[8px] opacity-20" style={{ color: ACCENT }}>·</span>
                  <span className="text-[8px] opacity-40" style={{ color: ACCENT }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="text-[11px] font-medium leading-snug mb-1 truncate"
                  style={{ color: "#E2E8F0" }}>
                  {r.title}
                </div>
                <div className="text-[9px] leading-relaxed opacity-60 line-clamp-2"
                  style={{ color: "#94A3B8" }}>
                  {r.snippet}
                </div>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onOpenUrl(r.url, r.title, "fullscreen")}
                  className="px-2 py-0.5 text-[7px] tracking-[0.15em] transition-all"
                  style={{ border: `1px solid ${ACCENT}44`, color: `${ACCENT}88` }}>
                  OPEN
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 flex items-center justify-between border-t"
        style={{ borderColor: `${ACCENT}11` }}>
        <span className="text-[8px] tracking-[0.15em] opacity-30" style={{ color: ACCENT }}>
          {results.length} RESULTS · CLICK TO OPEN
        </span>
        <button
          onClick={onOpenFull}
          className="text-[8px] tracking-[0.15em] opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: ACCENT }}>
          EXPAND ▶
        </button>
      </div>
    </div>
  );
}

// Full-screen browser/research panel
function FullScreenPanel({ url, title, query, results, initialMode, onClose }) {
  const [activeTab, setActiveTab] = useState(url ? "browser" : "results");
  const [currentUrl, setCurrentUrl] = useState(url || "");
  const [inputUrl, setInputUrl] = useState(url || "");
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [loading, setLoading] = useState(!!url);
  const iframeRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const navigate = (navUrl) => {
    setCurrentUrl(navUrl);
    setInputUrl(navUrl);
    setIframeBlocked(false);
    setLoading(true);
    setActiveTab("browser");
  };

  const handleIframeLoad = () => {
    setLoading(false);
    // Try to detect if the page was blocked
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc || doc.body?.innerHTML === "") setIframeBlocked(true);
    } catch {
      // Cross-origin — assume it loaded (can't inspect)
      setLoading(false);
    }
  };

  const handleIframeError = () => {
    setIframeBlocked(true);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#020617" }}>

      {/* ── TOP BAR ── */}
      <div className="flex items-center gap-3 px-4 py-2 flex-shrink-0"
        style={{ borderBottom: `1px solid ${ACCENT}22`, background: "#020617ee" }}>

        {/* Tab buttons */}
        <div className="flex items-center gap-1">
          {results?.length > 0 && (
            <button
              onClick={() => setActiveTab("results")}
              className="px-3 py-1 text-[9px] tracking-[0.2em] uppercase transition-all"
              style={{
                border: `1px solid ${activeTab === "results" ? ACCENT : `${ACCENT}33`}`,
                color: activeTab === "results" ? ACCENT : `${ACCENT}60`,
                background: activeTab === "results" ? `${ACCENT}15` : "transparent",
              }}>
              RESULTS
            </button>
          )}
          <button
            onClick={() => setActiveTab("browser")}
            className="px-3 py-1 text-[9px] tracking-[0.2em] uppercase transition-all"
            style={{
              border: `1px solid ${activeTab === "browser" ? ACCENT : `${ACCENT}33`}`,
              color: activeTab === "browser" ? ACCENT : `${ACCENT}60`,
              background: activeTab === "browser" ? `${ACCENT}15` : "transparent",
            }}>
            BROWSER
          </button>
        </div>

        {/* URL bar */}
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-1"
            style={{ border: `1px solid ${ACCENT}33`, background: `${ACCENT}08` }}>
            <span className="text-[9px] opacity-40" style={{ color: ACCENT }}>🔗</span>
            <input
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") navigate(inputUrl); }}
              className="flex-1 bg-transparent text-[10px] outline-none"
              style={{ color: "#E2E8F0", caretColor: ACCENT }}
              placeholder="Enter URL or search query…"
            />
          </div>
          <button
            onClick={() => navigate(inputUrl)}
            className="px-3 py-1 text-[9px] tracking-[0.2em] transition-all"
            style={{ border: `1px solid ${ACCENT}44`, color: `${ACCENT}88` }}>
            GO
          </button>
        </div>

        {/* Title */}
        {title && (
          <span className="text-[9px] tracking-[0.15em] opacity-50 max-w-48 truncate"
            style={{ color: ACCENT }}>
            {title.toUpperCase()}
          </span>
        )}

        <button
          onClick={onClose}
          className="px-4 py-1.5 text-[10px] tracking-[0.25em] flex-shrink-0"
          style={{ border: "1px solid #FB7185", color: "#FB7185", background: "#FB718515" }}>
          ✕ CLOSE
        </button>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 overflow-hidden relative">

        {/* Results list tab */}
        {activeTab === "results" && results?.length > 0 && (
          <div className="h-full overflow-y-auto p-4">
            <div className="max-w-3xl mx-auto space-y-3">
              <div className="text-[10px] tracking-[0.2em] opacity-50 mb-4" style={{ color: ACCENT }}>
                {results.length} RESULTS FOR "{query?.toUpperCase()}"
              </div>
              {results.map((r, i) => (
                <div key={i}
                  className="p-4 cursor-pointer hover:bg-white/5 transition-all group"
                  style={{ border: `1px solid ${ACCENT}22` }}
                  onClick={() => navigate(r.url)}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-[9px] tracking-[0.1em] mb-1"
                        style={{ color: `${ACCENT}88` }}>
                        {getDomain(r.url)}
                      </div>
                      <div className="text-sm font-medium mb-2" style={{ color: "#E2E8F0" }}>
                        {r.title}
                      </div>
                      <div className="text-[11px] leading-relaxed opacity-60"
                        style={{ color: "#94A3B8" }}>
                        {r.snippet}
                      </div>
                    </div>
                    <button
                      className="px-3 py-1.5 text-[8px] tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                      style={{ border: `1px solid ${ACCENT}`, color: ACCENT }}>
                      OPEN
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Browser iframe tab */}
        {activeTab === "browser" && (
          <>
            {!currentUrl && (
              <div className="h-full flex flex-col items-center justify-center gap-4">
                <div className="text-[11px] tracking-[0.3em] opacity-40" style={{ color: ACCENT }}>
                  JARVIS BROWSER
                </div>
                <div className="text-[9px] tracking-[0.15em] opacity-30 text-center max-w-sm"
                  style={{ color: ACCENT }}>
                  ENTER A URL ABOVE OR ASK JARVIS TO SEARCH FOR SOMETHING
                </div>
              </div>
            )}

            {currentUrl && loading && (
              <div className="absolute inset-0 flex items-center justify-center z-10"
                style={{ background: "#020617cc" }}>
                <span className="text-[10px] tracking-[0.2em] opacity-60" style={{ color: ACCENT }}>
                  LOADING…
                </span>
              </div>
            )}

            {currentUrl && iframeBlocked && (
              <div className="h-full flex flex-col items-center justify-center gap-4 p-8">
                <div className="text-[11px] tracking-[0.2em]" style={{ color: "#FBBF24" }}>
                  SITE BLOCKED EMBEDDING
                </div>
                <div className="text-[9px] tracking-[0.15em] opacity-60 text-center"
                  style={{ color: "#FBBF24" }}>
                  {getDomain(currentUrl)} doesn't allow iframe display.
                </div>
                <button
                  onClick={() => window.open(currentUrl, "_blank")}
                  className="px-6 py-2 text-[10px] tracking-[0.25em] mt-2 transition-all"
                  style={{ border: `1px solid ${ACCENT}`, color: ACCENT, background: `${ACCENT}15` }}>
                  OPEN IN NEW TAB
                </button>
              </div>
            )}

            {currentUrl && !iframeBlocked && (
              <iframe
                ref={iframeRef}
                src={currentUrl}
                className="w-full h-full border-0"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                title="JARVIS Browser"
              />
            )}
          </>
        )}
      </div>

      <div className="flex-shrink-0 px-4 py-1.5 text-center text-[8px] tracking-[0.2em] opacity-30 border-t"
        style={{ borderColor: `${ACCENT}11`, color: ACCENT }}>
        ESC TO CLOSE · SOME SITES BLOCK EMBEDDING AND WILL OPEN IN NEW TAB
      </div>
    </div>
  );
}

// ============================================================
// MAIN EXPORT
// ============================================================

export default function ResearchPanel({ externalCommand }) {
  const [inlineData, setInlineData] = useState(null); // { query, results }
  const [fullScreen, setFullScreen] = useState(null); // { url, title, query, results }

  // Handle commands from JARVIS tool executor
  useEffect(() => {
    if (!externalCommand) return;
    const { action, payload } = externalCommand;

    switch (action) {
      case "show_results":
        setInlineData({ query: payload.query, results: payload.results });
        break;
      case "open_url":
        setFullScreen({
          url: payload.url,
          title: payload.title || getDomain(payload.url),
          query: inlineData?.query,
          results: inlineData?.results,
        });
        break;
      case "open_fullscreen":
        setFullScreen({
          url: payload.url || "",
          title: payload.title || "JARVIS BROWSER",
          query: payload.query || inlineData?.query,
          results: payload.results || inlineData?.results,
        });
        break;
      case "close":
        setInlineData(null);
        setFullScreen(null);
        break;
      default:
        break;
    }
  }, [externalCommand]);

  return (
    <>
      {/* Inline results panel */}
      {inlineData && !fullScreen && (
        <InlineResults
          query={inlineData.query}
          results={inlineData.results}
          onOpenFull={() => setFullScreen({
            url: "",
            title: "RESEARCH",
            query: inlineData.query,
            results: inlineData.results,
          })}
          onClose={() => setInlineData(null)}
          onOpenUrl={(url, title, mode) => {
            if (mode === "fullscreen") {
              setFullScreen({ url, title, query: inlineData.query, results: inlineData.results });
            } else {
              window.open(url, "_blank");
            }
          }}
        />
      )}

      {/* Full-screen panel */}
      {fullScreen && (
        <FullScreenPanel
          url={fullScreen.url}
          title={fullScreen.title}
          query={fullScreen.query}
          results={fullScreen.results}
          onClose={() => setFullScreen(null)}
        />
      )}
    </>
  );
}

// Tool executor helper
export function buildResearchCommand(toolName, input) {
  switch (toolName) {
    case "show_research_results":
      return { action: "show_results", payload: { query: input.query, results: input.results || [] } };
    case "display_webpage":
      return {
        action: input.mode === "fullscreen" ? "open_fullscreen" : "open_url",
        payload: { url: input.url, title: input.title || "" },
      };
    case "close_research":
      return { action: "close", payload: {} };
    default:
      return null;
  }
}
