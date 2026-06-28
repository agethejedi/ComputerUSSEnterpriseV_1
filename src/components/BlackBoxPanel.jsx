// BlackBoxPanel.jsx — JARVIS integration overlay for Black Box v2
// Renders Black Box as an iframe panel inside the JARVIS dashboard

import { useEffect, useRef } from "react";

const BB_URL = "https://jarvis-blackbox.pages.dev";

export default function BlackBoxPanel({
  open,
  action,
  onClose,
}) {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!open || !action || !iframeRef.current) return;
    // Post action to Black Box iframe when JARVIS triggers a command
    const msg = { source: "jarvis", action: action.tool, payload: action.input || {} };
    iframeRef.current.contentWindow?.postMessage(msg, BB_URL);
  }, [open, action]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: "480px",
        height: "100vh",
        zIndex: 9000,
        display: "flex",
        flexDirection: "column",
        background: "#0f0f1a",
        borderLeft: "1px solid #2a2a45",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.6)",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderBottom: "1px solid #2a2a45",
        background: "#16162a", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(135deg, #7c3aed, #2dd4bf)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: "white",
          }}>BB</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f1f5" }}>Black Box</div>
            <div style={{ fontSize: 10, color: "#9494b8" }}>Relationship Intelligence</div>
          </div>
        </div>
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "#9494b8", fontSize: 18, lineHeight: 1, padding: 4,
        }}>×</button>
      </div>

      {/* Iframe */}
      <iframe
        ref={iframeRef}
        src={BB_URL}
        title="Black Box"
        style={{ flex: 1, border: "none", background: "#0f0f1a" }}
        allow="microphone"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      />
    </div>
  );
}
