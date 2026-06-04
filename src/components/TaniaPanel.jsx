// TaniaPanel.jsx
// Tania's creative workspace — a full-screen overlay launched from Orchestrator Mode.
// She thinks out loud, collaborates, then produces drafts for review.
//
// Props:
//   isOpen: bool
//   onClose: fn

import { useState, useEffect, useRef, useCallback } from "react";

const ACCENT   = "#c9a84c"; // Tania gold
const ACCENT_DIM = "rgba(201,168,76,0.35)";
const BG       = "radial-gradient(ellipse at center, #0D0B06 0%, #020100 100%)";

// ── Conversation message ──────────────────────────────────────────────────────
function Message({ role, content, isNew }) {
  const isTania = role === "tania";
  return (
    <div
      className={`flex gap-4 ${isNew ? "animate-pulse-once" : ""}`}
      style={{ marginBottom: "20px" }}
    >
      {/* Speaker label */}
      <div
        style={{
          flexShrink: 0,
          width: "52px",
          paddingTop: "2px",
          textAlign: "right",
          fontSize: "8px",
          letterSpacing: "0.2em",
          color: isTania ? ACCENT : "rgba(255,255,255,0.3)",
          fontFamily: "ui-monospace, monospace",
        }}
      >
        {isTania ? "TANIA" : "RON"}
      </div>
      {/* Content */}
      <div
        style={{
          flex: 1,
          fontSize: "13px",
          lineHeight: "1.75",
          color: isTania ? "rgba(245,240,230,0.9)" : "rgba(255,255,255,0.6)",
          fontFamily: isTania ? "'Georgia', serif" : "ui-monospace, monospace",
          whiteSpace: "pre-wrap",
          borderLeft: isTania ? `1px solid ${ACCENT_DIM}` : "1px solid rgba(255,255,255,0.08)",
          paddingLeft: "16px",
        }}
      >
        {content}
      </div>
    </div>
  );
}

// ── Draft card ────────────────────────────────────────────────────────────────
function DraftCard({ draft, onApprove, onRevise }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div
      style={{
        border: `1px solid ${ACCENT_DIM}`,
        borderRadius: "4px",
        background: "rgba(201,168,76,0.04)",
        marginBottom: "16px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: expanded ? `1px solid ${ACCENT_DIM}` : "none",
          cursor: "pointer",
        }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, display: "inline-block", boxShadow: `0 0 6px ${ACCENT}` }} />
          <span style={{ fontSize: "9px", letterSpacing: "0.25em", color: ACCENT, fontFamily: "ui-monospace, monospace" }}>
            DRAFT · {draft.title || "UNTITLED"}
          </span>
        </div>
        <span style={{ fontSize: "10px", color: ACCENT_DIM }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div style={{ padding: "14px" }}>
          {/* Voiceover */}
          {draft.voiceover && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "8px", letterSpacing: "0.2em", color: ACCENT_DIM, marginBottom: "8px", fontFamily: "ui-monospace, monospace" }}>VOICEOVER</div>
              <div style={{ fontSize: "13px", lineHeight: "1.8", color: "rgba(245,240,230,0.9)", fontFamily: "'Georgia', serif", whiteSpace: "pre-wrap", borderLeft: `2px solid ${ACCENT}`, paddingLeft: "12px" }}>
                {draft.voiceover}
              </div>
            </div>
          )}

          {/* Caption */}
          {draft.caption && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "8px", letterSpacing: "0.2em", color: ACCENT_DIM, marginBottom: "8px", fontFamily: "ui-monospace, monospace" }}>CAPTION</div>
              <div style={{ fontSize: "12px", lineHeight: "1.65", color: "rgba(245,240,230,0.75)", whiteSpace: "pre-wrap" }}>
                {draft.caption}
              </div>
            </div>
          )}

          {/* Visual direction */}
          {draft.visual && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "8px", letterSpacing: "0.2em", color: ACCENT_DIM, marginBottom: "8px", fontFamily: "ui-monospace, monospace" }}>VISUAL DIRECTION</div>
              <div style={{ fontSize: "11px", lineHeight: "1.65", color: "rgba(245,240,230,0.55)", fontStyle: "italic", whiteSpace: "pre-wrap" }}>
                {draft.visual}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            <button
              onClick={() => onApprove(draft)}
              style={{
                padding: "6px 16px", fontSize: "8px", letterSpacing: "0.2em",
                border: `1px solid ${ACCENT}`, color: ACCENT,
                background: "rgba(201,168,76,0.1)", cursor: "pointer",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              APPROVE
            </button>
            <button
              onClick={() => onRevise(draft)}
              style={{
                padding: "6px 16px", fontSize: "8px", letterSpacing: "0.2em",
                border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)",
                background: "transparent", cursor: "pointer",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              REVISE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Parse draft from Tania's response ─────────────────────────────────────────
function parseDraft(text) {
  // Look for structured markers she uses when writing
  const voiceoverMatch = text.match(/(?:VOICEOVER|Voiceover)[:\s]*\n?([\s\S]*?)(?=\n(?:CAPTION|Caption|VISUAL|Visual|$))/i);
  const captionMatch   = text.match(/(?:CAPTION|Caption)[:\s]*\n?([\s\S]*?)(?=\n(?:VISUAL|Visual|TITLE|Title|$))/i);
  const visualMatch    = text.match(/(?:VISUAL DIRECTION|Visual direction|VISUAL)[:\s]*\n?([\s\S]*?)(?=\n(?:TITLE|Title|$))/i);
  const titleMatch     = text.match(/(?:TITLE|Title)[:\s]*(.+)/i);

  if (!voiceoverMatch) return null; // Not a draft — just conversation

  return {
    voiceover: voiceoverMatch?.[1]?.trim(),
    caption:   captionMatch?.[1]?.trim(),
    visual:    visualMatch?.[1]?.trim(),
    title:     titleMatch?.[1]?.trim() || "Untitled",
    raw:       text,
  };
}

// ── TTS for Tania's voice ─────────────────────────────────────────────────────
async function speakAsTania(text, voiceId = "knJcCBNKPnJDauT52tkc") {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 2500), voiceId }),
    });
    if (!res.ok || !res.headers.get("content-type")?.includes("audio")) return;
    const arrayBuffer = await res.arrayBuffer();

    // iOS: use shared AudioContext unlocked by JARVIS gesture
    const actx = window._jarvisAudioCtx;
    if (actx) {
      try {
        if (actx.state === "suspended") await actx.resume();
        const decoded = await actx.decodeAudioData(arrayBuffer.slice(0));
        const src = actx.createBufferSource();
        src.buffer = decoded;
        src.connect(actx.destination);
        await new Promise(resolve => { src.onended = resolve; src.start(0); });
        return;
      } catch {}
    }

    // Fallback: blob URL
    const blob  = new Blob([arrayBuffer], { type: "audio/mpeg" });
    const url   = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.playsInline = true;
    audio.onended = () => URL.revokeObjectURL(url);
    await audio.play();
  } catch {}
}

// ── Main component ────────────────────────────────────────────────────────────
// Auto-log session to M7 when workspace closes with meaningful content
async function autoLogSession(messages) {
  const userMessages = messages.filter(m => m.role === "ron");
  if (userMessages.length < 2) return; // Not enough to log
  const topics = userMessages
    .slice(-4)
    .map(m => m.content?.slice(0, 60))
    .filter(Boolean)
    .join(' | ');
  try {
    await fetch("/api/tania", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        logSession: {
          summary: `Session covered: ${topics}`,
          exchanges: userMessages.length,
          keyMoments: [],
        }
      }),
    });
  } catch {}
}

export default function TaniaPanel({ isOpen, onClose }) {
  const [messages, setMessages]     = useState([]);
  const [drafts, setDrafts]         = useState([]);
  const [input, setInput]           = useState("");
  const [thinking, setThinking]     = useState(false);
  const [speaking, setSpeaking]     = useState(false);
  const [sessionId]                 = useState(() => Date.now().toString());
  const apiMessagesRef              = useRef([]);
  const scrollRef                   = useRef(null);
  const inputRef                    = useRef(null);
  const sessionStartRef             = useRef(Date.now());
  const [listening, setListening]   = useState(false);
  const recognitionRef              = useRef(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, drafts]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  // Opening greeting — Tania speaks first
  useEffect(() => {
    if (!isOpen || messages.length > 0) return;
    const greeting = async () => {
      setThinking(true);
      try {
        const res = await fetch("/api/tania", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{
              role: "user",
              content: "[Session opening. Greet Ron naturally. One or two sentences. You are in your world, in your thoughts. Let him in.]"
            }],
          }),
        });
        const data = await res.json();
        const text = data.content?.find(b => b.type === "text")?.text || "";
        if (text) {
          apiMessagesRef.current = [
            { role: "user", content: "[Session opening]" },
            { role: "assistant", content: text },
          ];
          setMessages([{ role: "tania", content: text, id: Date.now() }]);
          setSpeaking(true);
          await speakAsTania(text);
          setSpeaking(false);
        }
      } catch {}
      setThinking(false);
    };
    greeting();
  }, [isOpen]);

  // Voice input for Tania
  const startVoiceInput = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    let final = "";
    recognition.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
      }
    };
    recognition.onend = () => {
      setListening(false);
      if (final.trim()) setInput(final.trim());
    };
    recognition.onerror = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  }, [listening]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");

    // Add Ron's message
    const ronMsg = { role: "ron", content: text, id: Date.now() };
    setMessages(prev => [...prev, ronMsg]);

    // Build API messages
    apiMessagesRef.current = [
      ...apiMessagesRef.current,
      { role: "user", content: text },
    ];

    setThinking(true);

    try {
      const res = await fetch("/api/tania", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessagesRef.current,
          skipMemory: apiMessagesRef.current.length > 2, // Load memory only on first exchange
        }),
      });

      const data = await res.json();
      const responseText = data.content?.find(b => b.type === "text")?.text || "";

      if (responseText) {
        apiMessagesRef.current = [
          ...apiMessagesRef.current,
          { role: "assistant", content: responseText },
        ];

        // Check if this is a draft
        const draft = parseDraft(responseText);

        if (draft) {
          setDrafts(prev => [...prev, { ...draft, id: Date.now() }]);
          const intro = responseText.split(/VOICEOVER|Voiceover/i)[0].trim();
          if (intro) {
            setMessages(prev => [...prev, { role: "tania", content: intro, id: Date.now() }]);
          }
          setSpeaking(true);
          await speakAsTania(intro || "Here's what I have.", data.voiceId);
          setSpeaking(false);
        } else {
          setMessages(prev => [...prev, { role: "tania", content: responseText, id: Date.now() }]);
          setSpeaking(true);
          await speakAsTania(responseText, data.voiceId);
          setSpeaking(false);
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "tania", content: "Something pulled me away. Give me a moment.", id: Date.now() }]);
    }

    setThinking(false);
  }, [input, thinking]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleApprove = useCallback(async (draft) => {
    // Save approved draft to M7
    await fetch("/api/tania", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        saveMemory: {
          category: "creative_work",
          content: `APPROVED DRAFT — ${draft.title}\n\nVOICEOVER: ${draft.voiceover || ""}\n\nCAPTION: ${draft.caption || ""}\n\nVISUAL: ${draft.visual || ""}`,
        }
      }),
    }).catch(() => {});

    setMessages(prev => [...prev, {
      role: "tania",
      content: `Good. "${draft.title}" is approved. I'll make sure it goes out right.`,
      id: Date.now(),
    }]);
  }, []);

  const handleRevise = useCallback((draft) => {
    setInput(`Let's revise "${draft.title}". `);
    inputRef.current?.focus();
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: BG }}
    >
      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(${ACCENT}08 1px,transparent 1px),linear-gradient(90deg,${ACCENT}08 1px,transparent 1px)`,
        backgroundSize: "48px 48px",
      }} />

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-8 py-3 flex-shrink-0 border-b z-10"
        style={{ borderColor: ACCENT_DIM, background: "rgba(0,0,0,0.8)" }}
      >
        <div className="flex items-center gap-5">
          <div>
            <div style={{ fontSize: "7px", letterSpacing: "0.35em", color: ACCENT_DIM, marginBottom: "2px", fontFamily: "ui-monospace, monospace" }}>
              PROJECT WORKSPACE
            </div>
            <div style={{ fontSize: "18px", letterSpacing: "0.15em", color: ACCENT, fontFamily: "'Georgia', serif" }}>
              Taste of Tania
            </div>
          </div>
          <div style={{ width: "1px", height: "28px", background: ACCENT_DIM }} />
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: thinking ? "#FBBF24" : speaking ? ACCENT : "#22c55e",
              boxShadow: `0 0 6px ${thinking ? "#FBBF24" : speaking ? ACCENT : "#22c55e"}`,
              display: "inline-block",
              transition: "all 0.3s",
            }} />
            <span style={{ fontSize: "8px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.4)", fontFamily: "ui-monospace, monospace" }}>
              {thinking ? "THINKING" : speaking ? "SPEAKING" : "PRESENT"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div style={{ fontSize: "8px", letterSpacing: "0.2em", color: ACCENT_DIM, fontFamily: "ui-monospace, monospace" }}>
            {drafts.length > 0 ? `${drafts.length} DRAFT${drafts.length > 1 ? "S" : ""}` : "NO DRAFTS YET"}
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "5px 14px", fontSize: "8px", letterSpacing: "0.2em",
              border: "1px solid rgba(251,113,133,0.4)", color: "#FB7185",
              background: "rgba(251,113,133,0.06)", cursor: "pointer",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            ✕ CLOSE
          </button>
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden">

        {/* Conversation — left/center */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto"
            style={{ padding: "32px 40px 16px" }}
          >
            {messages.map((msg) => (
              <Message
                key={msg.id}
                role={msg.role}
                content={msg.content}
              />
            ))}

            {thinking && (
              <div style={{ display: "flex", gap: "4px", alignItems: "center", marginBottom: "20px", paddingLeft: "68px" }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{
                    width: 4, height: 4, borderRadius: "50%", background: ACCENT,
                    animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite`,
                    display: "inline-block",
                  }} />
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div
            style={{
              padding: "16px 40px 24px",
              borderTop: `1px solid ${ACCENT_DIM}`,
              background: "rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Bring her a story element, a character, a setting, a feeling…"
                  rows={2}
                  disabled={thinking}
                  style={{
                    width: "100%",
                    background: "rgba(201,168,76,0.04)",
                    border: `1px solid ${ACCENT_DIM}`,
                    color: "rgba(255,255,255,0.85)",
                    padding: "12px 14px",
                    fontSize: "13px",
                    lineHeight: "1.6",
                    resize: "none",
                    outline: "none",
                    fontFamily: "ui-monospace, monospace",
                    borderRadius: "2px",
                  }}
                />
                <div style={{ position: "absolute", bottom: "8px", right: "10px", fontSize: "9px", color: ACCENT_DIM, fontFamily: "ui-monospace, monospace" }}>
                  ↵ SEND
                </div>
              </div>
              <button
                onClick={startVoiceInput}
                style={{
                  padding: "12px 14px",
                  border: `1px solid ${listening ? "#FB7185" : ACCENT_DIM}`,
                  color: listening ? "#FB7185" : ACCENT_DIM,
                  background: listening ? "rgba(251,113,133,0.08)" : "transparent",
                  cursor: "pointer",
                  fontSize: "14px",
                  flexShrink: 0,
                  transition: "all 0.2s",
                }}
                title={listening ? "Stop listening" : "Speak to Tania"}
              >
                {listening ? "■" : "🎙"}
              </button>
              <button
                onClick={send}
                disabled={thinking || !input.trim()}
                style={{
                  padding: "12px 20px",
                  border: `1px solid ${ACCENT}`,
                  color: ACCENT,
                  background: "rgba(201,168,76,0.08)",
                  cursor: thinking ? "not-allowed" : "pointer",
                  opacity: thinking || !input.trim() ? 0.4 : 1,
                  fontSize: "8px",
                  letterSpacing: "0.2em",
                  fontFamily: "ui-monospace, monospace",
                  flexShrink: 0,
                }}
              >
                SEND
              </button>
            </div>
            <div style={{ marginTop: "8px", fontSize: "9px", color: "rgba(255,255,255,0.2)", fontFamily: "ui-monospace, monospace" }}>
              SHIFT+ENTER FOR NEW LINE · ENTER TO SEND
            </div>
          </div>
        </div>

        {/* Drafts panel — right side, only when drafts exist */}
        {drafts.length > 0 && (
          <div
            style={{
              width: "340px",
              flexShrink: 0,
              borderLeft: `1px solid ${ACCENT_DIM}`,
              background: "rgba(0,0,0,0.3)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${ACCENT_DIM}` }}>
              <div style={{ fontSize: "8px", letterSpacing: "0.3em", color: ACCENT, fontFamily: "ui-monospace, monospace" }}>
                DRAFTS FOR REVIEW
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {drafts.map(draft => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  onApprove={handleApprove}
                  onRevise={handleRevise}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
