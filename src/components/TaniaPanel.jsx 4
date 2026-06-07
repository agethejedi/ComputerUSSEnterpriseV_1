// TaniaPanel.jsx — Full workspace rebuild
// Layout: top bar → section nav → storybook tabs → three column body
// Left: episode catalogue  |  Center: lotus + dialogue  |  Right: canvas

import { useState, useEffect, useRef, useCallback } from "react";

const G = "#c9965a";       // gold
const GD = "rgba(201,150,90,0.35)";
const GX = "rgba(201,150,90,0.12)";
const INK = "#050402";
const INK2 = "#070504";

// ── Helpers ───────────────────────────────────────────────────────────────────
// All API calls go to /api/tania with resource as query param
// Cloudflare Pages Functions only route to the exact file path
const api = (path, opts = {}) =>
  fetch(`/api/tania${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  }).then(r => r.json());

function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-'); }

// ── Lotus orbit canvas ────────────────────────────────────────────────────────
function useLotusCanvas(canvasRef, state) {
  const tRef = useRef(0);
  const animRef = useRef(null);
  const particles = useRef(
    Array.from({ length: 55 }, () => ({
      a: Math.random() * Math.PI * 2,
      b: Math.random() * Math.PI * 2,
      r: 0.55 + Math.random() * 0.42,
      s: 0.45 + Math.random() * 1.6,
      size: 0.5 + Math.random() * 1.8,
      bright: 0.4 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
    }))
  );
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = 88, H = 88, cx = 44, cy = 44, base = 30;
    const col = state === "listening" ? "62,207,170" : state === "speaking" ? "232,128,106" : "201,150,90";
    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      tRef.current += 0.008;
      const t = tRef.current;
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < 3; i++) {
        const rr = base * (0.5 + i * 0.18);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rr * 1.2, rr * 0.6, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${col},${0.06 + i * 0.02})`;
        ctx.lineWidth = 0.6; ctx.stroke();
      }
      ctx.globalCompositeOperation = "lighter";
      for (let ring = 0; ring < 5; ring++) {
        const rot = t * (0.4 + ring * 0.04) + ring * 0.6;
        const rr  = base * (0.58 + ring * 0.045);
        ctx.beginPath();
        for (let k = 0; k <= 80; k++) {
          const a = k / 80 * Math.PI * 2;
          const x = cx + Math.cos(a + rot) * rr * 1.1;
          const y = cy + Math.sin(a + rot) * rr * 0.55;
          k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${col},${0.04 + ring * 0.006})`;
        ctx.lineWidth = 0.5; ctx.stroke();
      }
      for (const p of particles.current) {
        const a = p.a + t * p.s;
        const b = p.b + t * 0.7;
        const wobble = Math.sin(t * 3 + p.phase) * 0.18;
        const x3 = Math.cos(a) * base * p.r;
        const z3 = Math.sin(a) * base * p.r;
        const y3 = Math.sin(b + wobble) * base * 0.52 * p.r;
        const perspective = 0.82 + (z3 / base) * 0.18;
        const x = cx + x3 * perspective;
        const y = cy + y3 * perspective;
        const bright = 0.2 + 0.8 * ((z3 / base + 1) / 2);
        ctx.beginPath();
        ctx.fillStyle = `rgba(${col},${0.15 + bright * 0.6})`;
        ctx.shadowBlur = 6 + bright * 12;
        ctx.shadowColor = `rgba(${col},0.8)`;
        ctx.arc(x, y, p.size * (0.5 + bright * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = "source-over";
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [state]);
}

// ── Lotus SVG ─────────────────────────────────────────────────────────────────
function LotusSVG({ state }) {
  const fill = state === "listening" ? "url(#gL)" : state === "speaking" ? "url(#gS)" : "url(#gR)";
  const anim = state === "speaking" ? "breathSpeak 1.4s ease-in-out infinite" : "breathRest 5.5s ease-in-out infinite";
  const glow = state === "listening"
    ? "drop-shadow(0 0 10px rgba(62,207,170,0.65)) drop-shadow(0 0 30px rgba(62,207,170,0.18))"
    : state === "speaking"
    ? "drop-shadow(0 0 12px rgba(232,128,106,0.7)) drop-shadow(0 0 36px rgba(201,150,90,0.22))"
    : "drop-shadow(0 0 10px rgba(201,150,90,0.65)) drop-shadow(0 0 32px rgba(201,150,90,0.18))";

  return (
    <svg viewBox="0 0 400 400" width="82" height="82" overflow="visible"
      style={{ animation: anim, filter: glow, position: "absolute", inset: 0, zIndex: 2 }}>
      <defs>
        <radialGradient id="gR" cx="50%" cy="68%" r="75%">
          <stop offset="0%" stopColor="#fff8d8" stopOpacity="0.97"/>
          <stop offset="30%" stopColor="#f0c87a" stopOpacity="0.65"/>
          <stop offset="65%" stopColor="#c9783a" stopOpacity="0.22"/>
          <stop offset="100%" stopColor="#7a4010" stopOpacity="0.04"/>
        </radialGradient>
        <radialGradient id="gL" cx="50%" cy="68%" r="75%">
          <stop offset="0%" stopColor="#fffbe8" stopOpacity="0.96"/>
          <stop offset="28%" stopColor="#7affde" stopOpacity="0.58"/>
          <stop offset="62%" stopColor="#2abf9a" stopOpacity="0.22"/>
          <stop offset="100%" stopColor="#0a6040" stopOpacity="0.04"/>
        </radialGradient>
        <radialGradient id="gS" cx="50%" cy="68%" r="75%">
          <stop offset="0%" stopColor="#fffae0" stopOpacity="1.0"/>
          <stop offset="25%" stopColor="#ffd078" stopOpacity="0.75"/>
          <stop offset="55%" stopColor="#e87850" stopOpacity="0.38"/>
          <stop offset="82%" stopColor="#3ecfaa" stopOpacity="0.12"/>
          <stop offset="100%" stopColor="#1a3a30" stopOpacity="0.04"/>
        </radialGradient>
        <filter id="cg" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="6" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <ellipse cx="200" cy="258" rx="128" ry="18" fill="none" stroke="rgba(201,150,90,0.45)" strokeWidth="0.8"/>
      <ellipse cx="200" cy="264" rx="168" ry="26" fill="none" stroke="rgba(201,150,90,0.16)" strokeWidth="0.8"/>
      {[
        "M200 248 C170 192 145 138 158 82 C204 116 220 185 200 248Z",
        "M200 248 C172 174 168 108 204 54 C238 122 234 182 200 248Z",
        "M200 248 C190 158 202 88 256 40 C270 128 248 192 200 248Z",
        "M200 248 C178 162 176 82 200 24 C224 82 222 162 200 248Z",
        "M200 248 C210 158 198 88 144 40 C130 128 152 192 200 248Z",
        "M200 248 C228 174 232 108 196 54 C162 122 166 182 200 248Z",
        "M200 248 C230 192 255 138 242 82 C196 116 180 185 200 248Z",
      ].map((d, i) => {
        const rots = [-52,-33,-16,0,16,33,52];
        const scls = [0.80,0.91,0.99,1.04,0.99,0.91,0.80];
        return <path key={i} d={d} fill={fill}
          style={{ transformOrigin:"200px 245px", transform:`rotate(${rots[i]}deg) scale(${scls[i]})`, mixBlendMode:"screen", opacity:0.58 }}/>;
      })}
      <path d="M200 242 C186 202 188 158 200 122 C212 158 214 202 200 242Z" fill="none" stroke="rgba(255,242,188,0.28)" strokeWidth="0.9"/>
      <circle cx="200" cy="248" r="11" fill="#fff8d8" filter="url(#cg)"/>
      <circle cx="200" cy="248" r="5" fill="rgba(255,255,240,0.95)"/>
      <style>{`@keyframes breathRest{0%,100%{transform:scale(0.97);opacity:0.9}50%{transform:scale(1.03);opacity:1}}@keyframes breathSpeak{0%,100%{transform:scale(0.985) rotate(-0.4deg)}50%{transform:scale(1.055) rotate(0.5deg)}}`}</style>
    </svg>
  );
}

// ── Inline content card (scripts, captions, prompts) ─────────────────────────
function ContentCard({ type, label, content, platform, status, onApprove, onRevise, onCopy }) {
  const borderCol = type === "prompt" ? "rgba(167,139,250,0.25)" : GD;
  const labelCol  = type === "prompt" ? "rgba(167,139,250,0.55)" : "rgba(201,150,90,0.5)";
  return (
    <div style={{ border:`0.5px solid ${borderCol}`, borderRadius:2, background:type==="prompt"?"rgba(167,139,250,0.03)":"rgba(201,150,90,0.04)", overflow:"hidden", margin:"4px 0" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 12px", borderBottom:`0.5px solid ${type==="prompt"?"rgba(167,139,250,0.1)":GX}`, background:"rgba(0,0,0,0.15)" }}>
        <div style={{ fontSize:8, letterSpacing:"0.2em", color:labelCol, display:"flex", alignItems:"center", gap:5 }}>
          {label}
          {platform && <span style={{ fontSize:7, padding:"1px 5px", borderRadius:2, background:"rgba(167,139,250,0.1)", color:"rgba(167,139,250,0.6)", border:"0.5px solid rgba(167,139,250,0.2)", marginLeft:4 }}>{platform.replace('_',' ').toUpperCase()}</span>}
        </div>
        <div style={{ display:"flex", gap:4 }}>
          {status === "approved"
            ? <span style={{ fontSize:7, letterSpacing:"0.1em", padding:"2px 7px", borderRadius:2, color:"rgba(34,197,94,0.6)", border:"0.5px solid rgba(34,197,94,0.25)" }}>APPROVED</span>
            : <>
                <button onClick={onApprove} style={{ fontSize:7, letterSpacing:"0.1em", padding:"2px 7px", borderRadius:2, cursor:"pointer", color:"rgba(34,197,94,0.6)", border:"0.5px solid rgba(34,197,94,0.25)", background:"transparent" }}>APPROVE</button>
                <button onClick={onRevise}  style={{ fontSize:7, letterSpacing:"0.1em", padding:"2px 7px", borderRadius:2, cursor:"pointer", color:"rgba(201,150,90,0.45)", border:`0.5px solid ${GD}`, background:"transparent" }}>REVISE</button>
              </>
          }
          <button onClick={onCopy} style={{ fontSize:7, letterSpacing:"0.1em", padding:"2px 7px", borderRadius:2, cursor:"pointer", color:"rgba(167,139,250,0.5)", border:"0.5px solid rgba(167,139,250,0.2)", background:"transparent" }}>COPY</button>
        </div>
      </div>
      <div style={{ padding:"12px 14px", fontSize:type==="prompt"?10:12, lineHeight:type==="prompt"?1.7:1.9, color:type==="prompt"?"rgba(200,185,240,0.72)":"rgba(240,210,170,0.88)", fontFamily:type==="prompt"?"ui-monospace,monospace":"Georgia,serif", fontStyle:type==="prompt"?"normal":"italic", whiteSpace:"pre-wrap" }}>
        {content}
      </div>
    </div>
  );
}

// ── Message ───────────────────────────────────────────────────────────────────
function Message({ role, content }) {
  return (
    <div style={{ display:"flex", gap:10 }}>
      <span style={{ fontSize:8, letterSpacing:"0.16em", minWidth:40, textAlign:"right", paddingTop:2, flexShrink:0, color:role==="tania"?"rgba(201,150,90,0.45)":"rgba(255,255,255,0.2)" }}>
        {role === "tania" ? "TANIA" : "RON"}
      </span>
      <div style={{ fontSize:role==="tania"?11:10, lineHeight:1.78, borderLeft:`1px solid ${role==="tania"?"rgba(201,150,90,0.15)":"rgba(255,255,255,0.08)"}`, paddingLeft:10, color:role==="tania"?"rgba(240,210,170,0.85)":"rgba(255,255,255,0.42)", fontFamily:role==="tania"?"Georgia,serif":"inherit", fontStyle:role==="tania"?"italic":"normal" }}>
        {content}
      </div>
    </div>
  );
}

// ── Character card ────────────────────────────────────────────────────────────
function CharacterCard({ char, onApprove, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const isPending = char.status === "pending";
  return (
    <div style={{ border:`0.5px solid ${isPending?"rgba(251,191,36,0.25)":GD}`, borderRadius:2, background:"rgba(201,150,90,0.03)", marginBottom:6, overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"7px 12px", cursor:"pointer" }} onClick={() => setExpanded(e => !e)}>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          {isPending && <span style={{ fontSize:7, padding:"1px 5px", borderRadius:2, color:"rgba(251,191,36,0.6)", border:"0.5px solid rgba(251,191,36,0.25)", background:"rgba(251,191,36,0.07)" }}>PENDING</span>}
          <span style={{ fontSize:10, color:"rgba(240,200,122,0.75)" }}>{char.name}</span>
          {char.storybook_name && <span style={{ fontSize:8, color:"rgba(201,150,90,0.3)" }}>{char.storybook_name}</span>}
        </div>
        <span style={{ fontSize:10, color:"rgba(201,150,90,0.3)" }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div style={{ padding:"8px 12px", borderTop:`0.5px solid ${GX}` }}>
          {char.relationship_to_tania && <p style={{ fontSize:10, color:"rgba(240,200,122,0.65)", fontFamily:"Georgia,serif", fontStyle:"italic", lineHeight:1.7, marginBottom:8 }}>{char.relationship_to_tania}</p>}
          {char.appearance && <p style={{ fontSize:9, color:"rgba(201,150,90,0.45)", lineHeight:1.6, marginBottom:4 }}><strong style={{color:"rgba(201,150,90,0.35)"}}>Appearance</strong> — {char.appearance}</p>}
          {char.personality && <p style={{ fontSize:9, color:"rgba(201,150,90,0.45)", lineHeight:1.6, marginBottom:4 }}><strong style={{color:"rgba(201,150,90,0.35)"}}>Personality</strong> — {char.personality}</p>}
          {char.notes && <p style={{ fontSize:9, color:"rgba(201,150,90,0.35)", lineHeight:1.6, marginTop:6, fontStyle:"italic" }}>{char.notes}</p>}
          <div style={{ display:"flex", gap:5, marginTop:8 }}>
            {isPending && <button onClick={() => onApprove(char.id)} style={{ fontSize:7, letterSpacing:"0.1em", padding:"2px 8px", borderRadius:2, cursor:"pointer", color:"rgba(34,197,94,0.65)", border:"0.5px solid rgba(34,197,94,0.28)", background:"transparent" }}>APPROVE</button>}
            <button onClick={() => onEdit(char)} style={{ fontSize:7, letterSpacing:"0.1em", padding:"2px 8px", borderRadius:2, cursor:"pointer", color:"rgba(201,150,90,0.45)", border:`0.5px solid ${GD}`, background:"transparent" }}>EDIT</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TTS ───────────────────────────────────────────────────────────────────────
async function speakAsTania(text, voiceId = "knJcCBNKPnJDauT52tkc") {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 2500), voiceId }),
    });
    if (!res.ok || !res.headers.get("content-type")?.includes("audio")) return;
    const arrayBuffer = await res.arrayBuffer();
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
    const blob  = new Blob([arrayBuffer], { type:"audio/mpeg" });
    const url   = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.playsInline = true;
    audio.onended = () => URL.revokeObjectURL(url);
    await audio.play();
  } catch {}
}

// ── Canvas file/paste handling ────────────────────────────────────────────────
function useCanvasInput({ onSubmit, storybookId, episodeId, isActive }) {
  const [items, setItems]       = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const inputId                 = useRef("canvas-file-" + Math.random().toString(36).slice(2));

  const readFile = (file) => new Promise((resolve) => {
    const type = file.type.startsWith("image/") ? "image"
               : file.type.startsWith("audio/") ? "audio"
               : file.type.startsWith("video/") ? "video"
               : "file";
    const reader = new FileReader();
    if (type === "image") {
      reader.onload = e => resolve({ type, name: file.name, content: "[image: " + file.name + "]", preview: e.target.result, mimeType: file.type });
      reader.readAsDataURL(file);
    } else {
      reader.onload = e => resolve({ type, name: file.name, content: (e.target.result || "").slice(0, 3000), mimeType: file.type });
      reader.readAsText(file);
    }
  });

  const addFiles = useCallback(async (files) => {
    if (!files || !files.length) return;
    const newItems = await Promise.all([...files].map(readFile));
    setItems(prev => [...prev, ...newItems.map(i => ({ ...i, id: Date.now() + Math.random() }))]);
  }, []);

  const addText = useCallback((text) => {
    if (!text || !text.trim()) return;
    const trimmed = text.trim();
    const isLink = /^https?:\/\//i.test(trimmed);
    setItems(prev => [...prev, {
      id: Date.now() + Math.random(),
      type: isLink ? "link" : "text",
      name: isLink ? trimmed.slice(0, 50) : "Text note",
      content: trimmed,
    }]);
  }, []);

  // Document-level paste — catches image pastes anywhere in the canvas panel
  useEffect(() => {
    if (!isActive) return;
    const handler = (e) => {
      const clipItems = e.clipboardData?.items || [];
      const files = [];
      for (const ci of clipItems) {
        if (ci.kind === "file") files.push(ci.getAsFile());
      }
      if (files.length) {
        e.preventDefault();
        addFiles(files);
      }
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [isActive, addFiles]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) {
      addFiles(e.dataTransfer.files);
    } else {
      const t = e.dataTransfer.getData("text");
      if (t) addText(t);
    }
  }, [addFiles, addText]);

  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id));

  const submit = async (textNote) => {
    const parts = [];
    for (const item of items) {
      await fetch("/api/tania?resource=artifacts_save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: item.name,
          type: item.type,
          content: item.type === "image" ? item.content : (item.content || "").slice(0, 2000),
          description: "Canvas submission",
          storybook_id: storybookId,
          episode_id: episodeId,
        }),
      }).catch(() => {});
      if (item.type === "image") {
        parts.push("[IMAGE: " + item.name + "]");
      } else {
        parts.push("[" + item.type.toUpperCase() + ": " + item.name + "]\n" + (item.content || "").slice(0, 500));
      }
    }
    if (textNote && textNote.trim()) parts.push(textNote.trim());
    if (parts.length) onSubmit(parts.join("\n\n"));
    setItems([]);
  };

  return { items, dragOver, setDragOver, handleDrop, addFiles, addText, removeItem, submit, inputId: inputId.current };
}

// ── Session auto-log ──────────────────────────────────────────────────────────
async function autoLogSession(messages, storybookId, episodeId) {
  const userMsgs = messages.filter(m => m.role === "ron");
  if (userMsgs.length < 2) return;
  const topics = userMsgs.slice(-4).map(m => m.content?.slice(0,60)).filter(Boolean).join(" | ");
  try {
    await fetch("/api/tania", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ logSession:{ summary:`Session: ${topics}`, exchanges:userMsgs.length, storybook_id:storybookId, episode_id:episodeId } }),
    });
  } catch {}
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TaniaPanel({ isOpen, onClose }) {
  // Navigation state
  const [section, setSection]         = useState("storybooks"); // storybooks | characters | artifacts
  const [storybooks, setStorybooks]   = useState([]);
  const [activeStorybook, setActiveStorybook] = useState(null);
  const [episodes, setEpisodes]       = useState([]);
  const [activeEpisode, setActiveEpisode]     = useState(null);
  const [activeSub, setActiveSub]     = useState("script"); // script | caption | prompts

  // Content
  const [scripts, setScripts]         = useState([]);
  const [captions, setCaptions]       = useState([]);
  const [prompts, setPrompts]         = useState([]);
  const [characters, setCharacters]   = useState([]);
  const [artifacts, setArtifacts]     = useState([]);

  // Conversation
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [thinking, setThinking]       = useState(false);
  const [speaking, setSpeaking]       = useState(false);
  const [taniaState, setTaniaState]   = useState("resting");

  // Canvas
  const [canvasOpen, setCanvasOpen]   = useState(false);
  const [canvasText, setCanvasText]   = useState("");

  const canvas = useCanvasInput({
    onSubmit: (text) => send(text),
    storybookId: activeStorybook?.id,
    episodeId: activeEpisode?.id,
    isActive: canvasOpen,
  });

  // Edit character
  const [editingChar, setEditingChar] = useState(null);

  const apiMessagesRef = useRef([]);
  const scrollRef      = useRef(null);
  const inputRef       = useRef(null);
  const orbitCanvasRef = useRef(null);

  // Lotus animation
  useLotusCanvas(orbitCanvasRef, taniaState);

  // Load storybooks on open
  useEffect(() => {
    if (!isOpen) return;
    api("?resource=storybooks").then(d => {
      const sbs = d.storybooks || [];
      setStorybooks(sbs);
      if (sbs.length) {
        setActiveStorybook(sbs[0]);
        api(`?resource=episodes&storybook_id=${sbs[0].id}`).then(ep => {
          const eps = ep.episodes || [];
          setEpisodes(eps);
          if (eps.length) setActiveEpisode(eps[0]);
        });
      }
    }).catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  // Load content when episode or sub changes
  useEffect(() => {
    if (!activeEpisode) return;
    if (activeSub === "script")   api(`?resource=scripts&episode_id=${activeEpisode.id}`).then(d => setScripts(d.scripts||[]));
    if (activeSub === "caption")  api(`?resource=captions&episode_id=${activeEpisode.id}`).then(d => setCaptions(d.captions||[]));
    if (activeSub === "prompts")  api(`?resource=prompts&episode_id=${activeEpisode.id}`).then(d => setPrompts(d.prompts||[]));
  }, [activeEpisode, activeSub]);

  // Load characters when section changes
  useEffect(() => {
    if (section !== "characters") return;
    const q = activeStorybook
      ? `?resource=characters&storybook_id=${activeStorybook.id}&status=all`
      : "?resource=characters&status=all";
    api(q).then(d => setCharacters(d.characters||[])).catch(()=>{});
  }, [section, activeStorybook]);

  // Load artifacts
  useEffect(() => {
    if (section !== "artifacts") return;
    const q = activeStorybook
      ? `?resource=artifacts&storybook_id=${activeStorybook.id}`
      : "?resource=artifacts";
    api(q).then(d => setArtifacts(d.artifacts||[])).catch(()=>{});
  }, [section, activeStorybook]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Opening greeting
  useEffect(() => {
    if (!isOpen || messages.length > 0) return;
    const greet = async () => {
      setThinking(true); setTaniaState("thinking");
      try {
        const d = await fetch("/api/tania", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ messages:[{role:"user",content:"[Session opening. Greet Ron in one or two sentences. You are in your world, in your thoughts. Let him in.]"}] }),
        }).then(r => r.json());
        const text = d.content?.find(b => b.type==="text")?.text || "";
        if (text) {
          apiMessagesRef.current = [{role:"user",content:"[Session opening]"},{role:"assistant",content:text}];
          setMessages([{role:"tania",content:text,id:Date.now()}]);
          setSpeaking(true); setTaniaState("speaking");
          await speakAsTania(text, d.voiceId);
          setSpeaking(false);
        }
      } catch {}
      setThinking(false); setTaniaState("resting");
    };
    greet();
  }, [isOpen]);

  const send = useCallback(async (overrideText) => {
    const text = (overrideText || input).trim();
    if (!text || thinking) return;
    setInput("");
    const ronMsg = { role:"ron", content:text, id:Date.now() };
    setMessages(prev => [...prev, ronMsg]);
    apiMessagesRef.current = [...apiMessagesRef.current, {role:"user",content:text}];
    setThinking(true); setTaniaState("thinking");
    try {
      const d = await fetch("/api/tania", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          messages: apiMessagesRef.current,
          skipMemory: apiMessagesRef.current.length > 2,
          currentEpisodeId: activeEpisode?.id,
          currentStorybookId: activeStorybook?.id,
        }),
      }).then(r => r.json());
      const responseText = d.content?.find(b => b.type==="text")?.text || "";
      if (responseText) {
        apiMessagesRef.current = [...apiMessagesRef.current, {role:"assistant",content:responseText}];
        setMessages(prev => [...prev, {role:"tania",content:responseText,id:Date.now()}]);
        setSpeaking(true); setTaniaState("speaking");
        await speakAsTania(responseText, d.voiceId);
        setSpeaking(false);
        // Refresh content if she likely wrote something
        if (responseText.includes("VOICEOVER:") && activeEpisode) {
          api(`?resource=scripts&episode_id=${activeEpisode.id}`).then(d => setScripts(d.scripts||[]));
        }
      }
    } catch {
      setMessages(prev => [...prev, {role:"tania",content:"Something pulled me away. Give me a moment.",id:Date.now()}]);
    }
    setThinking(false); setTaniaState("resting");
  }, [input, thinking, activeEpisode, activeStorybook]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const approveCharacter = async (id) => {
    await api("?resource=characters_approve", { method:"POST", body:JSON.stringify({id}) });
    setCharacters(prev => prev.map(c => c.id===id ? {...c,status:"approved"} : c));
  };

  const handleNewStorybook = async () => {
    const name = window.prompt("New storybook name:");
    if (!name?.trim()) return;
    const d = await api("?resource=storybooks_create", { method:"POST", body:JSON.stringify({name:name.trim()}) });
    if (d.storybook) setStorybooks(prev => [...prev, d.storybook]);
  };

  const handleNewEpisode = async () => {
    if (!activeStorybook) return;
    const title = window.prompt("Episode title:");
    if (!title?.trim()) return;
    const d = await api("?resource=episodes_create", { method:"POST", body:JSON.stringify({storybook_id:activeStorybook.id,title:title.trim()}) });
    if (d.episode) {
      setEpisodes(prev => [...prev, d.episode]);
      setActiveEpisode(d.episode);
    }
  };

  const surfaceContent = (items, type) => {
    if (!items.length) { send(`Show me the ${type} for ${activeEpisode?.title || "this episode"}.`); return; }
    // Surface in dialogue as cards
    items.slice(0,3).forEach(item => {
      const cardMsg = {
        role: "content-card",
        type,
        content: item.content,
        platform: item.platform,
        status: item.status,
        id: Date.now() + Math.random(),
        itemId: item.id,
      };
      setMessages(prev => [...prev, cardMsg]);
    });
  };

  const approveItem = async (itemId, type) => {
    const tableMap = { script:"tania_scripts", caption:"tania_captions", prompt:"tania_prompts" };
    // Update via save endpoint (simplified — direct status update)
    await fetch("/api/memory", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ action:"update_entry", module:"m5", data:{ id:itemId, content:`Approved ${type}` } })
    }).catch(()=>{});
    setMessages(prev => prev.map(m => m.itemId===itemId ? {...m,status:"approved"} : m));
  };

  if (!isOpen) return null;

  const stateLabel = thinking ? "THINKING" : speaking ? "SPEAKING" : "RESTING";
  const stateSub   = thinking ? "Processing…" : speaking ? "Transmitting" : "At ease · Ready";

  const lastTaniaMsg = [...messages].reverse().find(m => m.role === "tania");

  return (
    <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex", flexDirection:"column", background:"#0a0805", fontFamily:"ui-sans-serif,system-ui,sans-serif" }}>

      {/* Grid bg */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none",
        backgroundImage:`linear-gradient(rgba(201,150,90,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(201,150,90,0.015) 1px,transparent 1px)`,
        backgroundSize:"40px 40px" }} />

      {/* ── Top bar ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 16px", borderBottom:`0.5px solid ${GX}`, background:INK, flexShrink:0, position:"relative", zIndex:2 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:13, letterSpacing:"0.18em", color:G }}>Taste of Tania</span>
          <div style={{ fontSize:9, letterSpacing:"0.18em", color:"rgba(201,150,90,0.4)", border:`0.5px solid ${GX}`, padding:"2px 8px", borderRadius:2, display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ width:4, height:4, borderRadius:"50%", background:"#22c55e", display:"inline-block" }}/>
            PRESENT
          </div>
          <span style={{ fontSize:9, letterSpacing:"0.18em", color:thinking?"rgba(251,191,36,0.55)":speaking?"rgba(232,128,106,0.55)":"rgba(201,150,90,0.3)", border:`0.5px solid ${thinking?"rgba(251,191,36,0.2)":speaking?"rgba(232,128,106,0.2)":"rgba(201,150,90,0.12)"}`, padding:"2px 8px", borderRadius:2 }}>
            {stateLabel}
          </span>
        </div>
        <button onClick={() => { autoLogSession(messages, activeStorybook?.id, activeEpisode?.id); onClose(); }}
          style={{ fontSize:9, letterSpacing:"0.18em", color:"rgba(251,113,133,0.55)", border:"0.5px solid rgba(251,113,133,0.25)", padding:"2px 10px", borderRadius:2, background:"transparent", cursor:"pointer" }}>
          ✕ CLOSE
        </button>
      </div>

      {/* ── Section nav ── */}
      <div style={{ display:"flex", borderBottom:`0.5px solid ${GX}`, background:INK, flexShrink:0, position:"relative", zIndex:2 }}>
        {[["storybooks","📖 STORYBOOKS"],["characters","👤 CHARACTERS"],["artifacts","🖼 ARTIFACTS"]].map(([s,l]) => (
          <button key={s} onClick={() => setSection(s)}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 16px", fontSize:9, letterSpacing:"0.22em", background:"transparent", border:"none", borderBottom:`1.5px solid ${section===s?G:"transparent"}`, color:section===s?G:"rgba(201,150,90,0.32)", cursor:"pointer" }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Storybook tabs ── */}
      {section === "storybooks" && (
        <div style={{ display:"flex", alignItems:"center", gap:3, padding:"7px 12px", borderBottom:`0.5px solid rgba(201,150,90,0.08)`, background:INK2, flexShrink:0, position:"relative", zIndex:2, overflowX:"auto" }}>
          {storybooks.map(sb => (
            <button key={sb.id} onClick={() => { setActiveStorybook(sb); api(`?resource=episodes&storybook_id=${sb.id}`).then(d=>{const eps=d.episodes||[];setEpisodes(eps);if(eps.length)setActiveEpisode(eps[0]);}); }}
              style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 10px", fontSize:9, letterSpacing:"0.13em", background:activeStorybook?.id===sb.id?"rgba(201,150,90,0.06)":"transparent", border:`0.5px solid ${activeStorybook?.id===sb.id?"rgba(201,150,90,0.28)":"transparent"}`, borderRadius:2, color:activeStorybook?.id===sb.id?G:"rgba(201,150,90,0.35)", cursor:"pointer", whiteSpace:"nowrap" }}>
              {sb.name}
            </button>
          ))}
          <button onClick={handleNewStorybook}
            style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:4, padding:"3px 9px", fontSize:9, letterSpacing:"0.13em", color:"rgba(201,150,90,0.28)", border:"0.5px dashed rgba(201,150,90,0.18)", borderRadius:2, background:"transparent", cursor:"pointer", whiteSpace:"nowrap" }}>
            + New storybook
          </button>
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ display:"grid", gridTemplateColumns:`210px 1fr ${canvasOpen?"230px":"32px"}`, flex:1, overflow:"hidden", minHeight:0, transition:"grid-template-columns 0.2s ease", position:"relative", zIndex:1 }}>

        {/* ── LEFT: catalogue ── */}
        <div style={{ borderRight:`0.5px solid ${GX}`, background:INK2, overflowY:"auto", padding:"10px 0" }}>

          {section === "storybooks" && (
            <>
              <div style={{ fontSize:8, letterSpacing:"0.28em", color:"rgba(201,150,90,0.28)", padding:"4px 12px 8px", textTransform:"uppercase" }}>Episodes</div>
              {episodes.map(ep => (
                <div key={ep.id}>
                  <div onClick={() => setActiveEpisode(ep)}
                    style={{ padding:"7px 12px", borderLeft:`2px solid ${activeEpisode?.id===ep.id?G:"transparent"}`, background:activeEpisode?.id===ep.id?"rgba(201,150,90,0.05)":"transparent", cursor:"pointer" }}>
                    <div style={{ fontSize:10, color:"rgba(240,200,122,0.72)", marginBottom:2 }}>{ep.title}</div>
                    <div style={{ fontSize:8, color:"rgba(201,150,90,0.3)", letterSpacing:"0.08em" }}>S{ep.season}E{ep.episode_number} · {activeStorybook?.name}</div>
                    <div style={{ display:"flex", gap:3, marginTop:4 }}>
                      <span style={{ fontSize:7, padding:"1px 5px", borderRadius:2, background:ep.status==="final"||ep.status==="approved"?"rgba(34,197,94,0.08)":"rgba(59,130,246,0.08)", color:ep.status==="final"||ep.status==="approved"?"rgba(34,197,94,0.6)":"rgba(59,130,246,0.55)", border:`0.5px solid ${ep.status==="final"||ep.status==="approved"?"rgba(34,197,94,0.2)":"rgba(59,130,246,0.2)"}` }}>
                        {ep.status?.toUpperCase().replace('_',' ')}
                      </span>
                    </div>
                  </div>
                  {activeEpisode?.id === ep.id && (
                    <div style={{ padding:"2px 12px 6px 26px" }}>
                      {[["script","📄 Script"],["caption","💬 Caption"],["prompts","✨ Prompts"]].map(([sub,label]) => (
                        <div key={sub} onClick={() => { setActiveSub(sub); surfaceContent(sub==="script"?scripts:sub==="caption"?captions:prompts, sub); }}
                          style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 0", fontSize:9, letterSpacing:"0.1em", color:activeSub===sub?"rgba(201,150,90,0.78)":"rgba(201,150,90,0.32)", cursor:"pointer", borderBottom:`0.5px solid ${GX}` }}>
                          {label}
                          <span style={{ marginLeft:"auto", fontSize:7, color:"rgba(201,150,90,0.22)" }}>
                            {sub==="script"?`${scripts.length} ver`:sub==="caption"?`${captions.length} ver`:`${prompts.length}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div onClick={handleNewEpisode}
                style={{ margin:"8px 12px 0", fontSize:8, letterSpacing:"0.15em", color:"rgba(201,150,90,0.25)", border:"0.5px dashed rgba(201,150,90,0.15)", borderRadius:2, padding:5, textAlign:"center", cursor:"pointer" }}>
                + New episode
              </div>
            </>
          )}

          {section === "characters" && (
            <>
              <div style={{ fontSize:8, letterSpacing:"0.28em", color:"rgba(201,150,90,0.28)", padding:"4px 12px 8px" }}>Characters</div>
              <div style={{ padding:"0 10px" }}>
                {characters.length === 0 && <div style={{ fontSize:9, color:"rgba(201,150,90,0.25)", padding:"8px 2px", fontStyle:"italic" }}>No characters yet</div>}
                {characters.map(c => (
                  <CharacterCard key={c.id} char={c}
                    onApprove={approveCharacter}
                    onEdit={(char) => setEditingChar(char)}
                  />
                ))}
              </div>
            </>
          )}

          {section === "artifacts" && (
            <>
              <div style={{ fontSize:8, letterSpacing:"0.28em", color:"rgba(201,150,90,0.28)", padding:"4px 12px 8px" }}>Artifacts</div>
              <div style={{ padding:"0 10px" }}>
                {artifacts.length === 0 && <div style={{ fontSize:9, color:"rgba(201,150,90,0.25)", padding:"8px 2px", fontStyle:"italic" }}>No artifacts yet</div>}
                {artifacts.map(a => (
                  <div key={a.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 4px", borderBottom:`0.5px solid ${GX}`, cursor:"pointer" }}
                    onClick={() => setMessages(prev => [...prev, {role:"tania",content:`[Artifact: ${a.name}]\n${a.content||a.description}`,id:Date.now()}])}>
                    <span style={{ fontSize:14 }}>{a.type==="image"?"🖼":a.type==="audio"?"🎵":a.type==="link"?"🔗":a.type==="video"?"🎬":"📄"}</span>
                    <div>
                      <div style={{ fontSize:9, color:"rgba(240,200,122,0.65)" }}>{a.name}</div>
                      {a.description && <div style={{ fontSize:8, color:"rgba(201,150,90,0.3)" }}>{a.description.slice(0,40)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── CENTER: work area ── */}
        <div style={{ display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {/* Lotus presence — above dialogue */}
          <div style={{ background:INK, borderBottom:`0.5px solid ${GX}`, padding:"14px 18px", display:"flex", alignItems:"center", gap:16, flexShrink:0, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 55% 100% at 14% 50%, rgba(201,150,90,0.06) 0%, transparent 65%)", pointerEvents:"none" }}/>
            <div style={{ width:88, height:88, position:"relative", flexShrink:0 }}>
              <canvas ref={orbitCanvasRef} width={88} height={88} style={{ position:"absolute", inset:0, width:"100%", height:"100%" }}/>
              <LotusSVG state={taniaState}/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:9, letterSpacing:"0.32em", color:"rgba(201,150,90,0.45)", marginBottom:3 }}>{stateLabel}</div>
              <div style={{ fontSize:8, letterSpacing:"0.15em", color:"rgba(201,150,90,0.25)", marginBottom:8 }}>{stateSub}</div>
              {lastTaniaMsg && (
                <div style={{ fontSize:11, lineHeight:1.65, color:"rgba(240,210,170,0.5)", fontFamily:"Georgia,serif", fontStyle:"italic", borderLeft:`1px solid rgba(201,150,90,0.15)`, paddingLeft:10, overflow:"hidden", maxHeight:52 }}>
                  {lastTaniaMsg.content?.slice(0,120)}{lastTaniaMsg.content?.length > 120 ? "…" : ""}
                </div>
              )}
            </div>
          </div>

          {/* Dialogue */}
          <div ref={scrollRef} style={{ flex:1, overflowY:"auto", padding:"16px 18px", display:"flex", flexDirection:"column", gap:14 }}>
            {messages.map(msg => {
              if (msg.role === "content-card") {
                return (
                  <ContentCard key={msg.id}
                    type={msg.type} label={`${activeEpisode?.title?.toUpperCase()} · ${msg.type.toUpperCase()}`}
                    content={msg.content} platform={msg.platform} status={msg.status}
                    onApprove={() => approveItem(msg.itemId, msg.type)}
                    onRevise={() => setInput(`Let's revise this ${msg.type}. `)}
                    onCopy={() => navigator.clipboard?.writeText(msg.content).catch(()=>{})}
                  />
                );
              }
              return <Message key={msg.id} role={msg.role} content={msg.content}/>;
            })}
            {thinking && (
              <div style={{ display:"flex", gap:4, alignItems:"center", paddingLeft:50 }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{ width:4, height:4, borderRadius:"50%", background:G, display:"inline-block", animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite` }}/>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ borderTop:`0.5px solid ${GX}`, padding:"10px 14px", flexShrink:0, display:"flex", gap:6, alignItems:"flex-end", background:INK2 }}>
            <button style={{ padding:"8px 9px", fontSize:13, color:"rgba(201,150,90,0.38)", border:`0.5px solid ${GX}`, borderRadius:2, background:"transparent", cursor:"pointer" }}>🎙</button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Bring her a direction, a story element, an instruction…"
              rows={1}
              disabled={thinking}
              style={{ flex:1, background:"rgba(201,150,90,0.04)", border:`0.5px solid ${GX}`, borderRadius:2, padding:"8px 10px", fontSize:11, color:"rgba(240,200,122,0.65)", fontFamily:"inherit", resize:"none", minHeight:36, outline:"none" }}
            />
            <button onClick={() => send()}
              style={{ padding:"8px 16px", fontSize:9, letterSpacing:"0.2em", color:"rgba(201,150,90,0.65)", border:`0.5px solid rgba(201,150,90,0.32)`, borderRadius:2, background:"rgba(201,150,90,0.06)", cursor:"pointer" }}>
              SEND
            </button>
          </div>
        </div>

        {/* ── RIGHT: canvas column ── */}
        <div style={{ display:"flex", flexDirection:"column", overflow:"hidden", borderLeft:`0.5px solid rgba(167,139,250,0.2)`, background:INK2 }}>

          {/* Canvas tab — visible in both states */}
          {canvasOpen ? (
            // Expanded header
            <div onClick={() => setCanvasOpen(false)}
              style={{ background:INK2, padding:"8px 10px", flexShrink:0, borderBottom:`0.5px solid rgba(167,139,250,0.12)`, display:"flex", alignItems:"center", gap:5, cursor:"pointer" }}>
              <span style={{ fontSize:9, letterSpacing:"0.18em", color:"rgba(167,139,250,0.55)" }}>⊞ CANVAS</span>
              <span style={{ marginLeft:"auto", fontSize:8, color:"rgba(167,139,250,0.35)", border:"0.5px solid rgba(167,139,250,0.18)", padding:"1px 6px", borderRadius:2 }}>CLOSE</span>
            </div>
          ) : (
            // Collapsed — vertical tab strip
            <div onClick={() => setCanvasOpen(true)}
              style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", padding:"12px 0", gap:8 }}
              title="Open Canvas">
              <span style={{ fontSize:11, color:"rgba(167,139,250,0.5)" }}>⊞</span>
              <span style={{
                fontSize:8, letterSpacing:"0.18em", color:"rgba(167,139,250,0.4)",
                writingMode:"vertical-rl", textOrientation:"mixed",
                transform:"rotate(180deg)", userSelect:"none",
              }}>CANVAS</span>
            </div>
          )}

          {canvasOpen && (
            <div style={{ flex:1, overflowY:"auto", background:INK2, display:"flex", flexDirection:"column" }}>

              {/* Queued items */}
              {canvas.items.length > 0 && (
                <div style={{ padding:"8px 10px 0" }}>
                  <div style={{ fontSize:8, letterSpacing:"0.22em", color:"rgba(167,139,250,0.35)", marginBottom:5 }}>QUEUED</div>
                  {canvas.items.map(item => (
                    <div key={item.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 6px", marginBottom:4, border:"0.5px solid rgba(167,139,250,0.15)", borderRadius:2, background:"rgba(167,139,250,0.04)" }}>
                      <span style={{ fontSize:14, flexShrink:0 }}>
                        {item.type==="image"?"🖼":item.type==="audio"?"🎵":item.type==="link"?"🔗":item.type==="video"?"🎬":"📄"}
                      </span>
                      {item.preview && (
                        <img src={item.preview} alt="" style={{ width:32, height:32, objectFit:"cover", borderRadius:1, flexShrink:0 }}/>
                      )}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:9, color:"rgba(167,139,250,0.6)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</div>
                        {item.type==="text" && <div style={{ fontSize:8, color:"rgba(167,139,250,0.3)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.content?.slice(0,50)}</div>}
                      </div>
                      <button onClick={() => canvas.removeItem(item.id)}
                        style={{ fontSize:10, color:"rgba(251,113,133,0.45)", background:"transparent", border:"none", cursor:"pointer", flexShrink:0, padding:"0 2px" }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Artifact grid */}
              {artifacts.length > 0 && (
                <div style={{ padding:"8px 10px 4px" }}>
                  <div style={{ fontSize:8, letterSpacing:"0.22em", color:"rgba(167,139,250,0.25)", marginBottom:6 }}>SAVED ARTIFACTS</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
                    {artifacts.slice(0,4).map(a => (
                      <div key={a.id} style={{ border:"0.5px solid rgba(167,139,250,0.12)", borderRadius:2, background:"rgba(167,139,250,0.03)", padding:"6px 5px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}
                        onClick={() => send(`[Artifact: ${a.name}] ${a.content||a.description||''}`)}>
                        <span style={{ fontSize:15 }}>{a.type==="image"?"🖼":a.type==="audio"?"🎵":a.type==="link"?"🔗":a.type==="video"?"🎬":"📄"}</span>
                        <span style={{ fontSize:7, color:"rgba(167,139,250,0.35)", textAlign:"center", lineHeight:1.3 }}>{a.name.slice(0,14)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <hr style={{ border:"none", borderTop:"0.5px solid rgba(167,139,250,0.07)", margin:"6px 10px" }}/>

              {/* Drop zone + file input */}
              <div style={{ padding:"0 10px 10px", flex:1, display:"flex", flexDirection:"column", gap:6 }}>
                {/* Hidden file input — triggered via label, no programmatic click needed */}
                <input
                  id={canvas.inputId}
                  type="file"
                  multiple
                  accept="image/*,audio/*,video/*,.txt,.md,.pdf,.csv"
                  style={{ display:"none" }}
                  onChange={e => { canvas.addFiles(e.target.files); e.target.value = ""; }}
                />

                {/* Drop zone — also acts as file browser label */}
                <label
                  htmlFor={canvas.inputId}
                  onDrop={canvas.handleDrop}
                  onDragOver={e => { e.preventDefault(); canvas.setDragOver(true); }}
                  onDragLeave={() => canvas.setDragOver(false)}
                  style={{
                    display:"flex", alignItems:"center", justifyContent:"center", gap:5,
                    border:`0.5px dashed rgba(167,139,250,${canvas.dragOver?0.65:0.22})`,
                    borderRadius:2,
                    background:`rgba(167,139,250,${canvas.dragOver?0.1:0.025})`,
                    padding:"11px 8px",
                    fontSize:8, letterSpacing:"0.1em",
                    color:`rgba(167,139,250,${canvas.dragOver?0.75:0.35})`,
                    textAlign:"center", cursor:"pointer",
                    transition:"all 0.15s ease",
                    minHeight:44,
                    userSelect:"none",
                  }}>
                  ↑ {canvas.dragOver ? "DROP TO ADD" : "Drop file or click to browse"}
                </label>

                {/* Text / link / paste input */}
                <textarea
                  value={canvasText}
                  onChange={e => setCanvasText(e.target.value)}
                  placeholder="Type a note, paste text or a link… images paste anywhere on the page"
                  style={{ width:"100%", background:"rgba(167,139,250,0.04)", border:"0.5px solid rgba(167,139,250,0.14)", borderRadius:2, padding:"7px 8px", fontSize:10, color:"rgba(167,139,250,0.65)", fontFamily:"inherit", resize:"none", minHeight:60, outline:"none" }}
                />

                {/* Add text to queue */}
                {canvasText.trim() && (
                  <button onClick={() => { canvas.addText(canvasText); setCanvasText(""); }}
                    style={{ width:"100%", padding:5, fontSize:8, letterSpacing:"0.15em", color:"rgba(167,139,250,0.5)", border:"0.5px solid rgba(167,139,250,0.18)", borderRadius:2, background:"transparent", cursor:"pointer" }}>
                    + ADD TO QUEUE
                  </button>
                )}

                {/* Submit to Tania */}
                <button
                  onClick={() => { canvas.submit(canvasText); setCanvasText(""); }}
                  disabled={canvas.items.length === 0 && !canvasText.trim()}
                  style={{ width:"100%", padding:6, fontSize:8, letterSpacing:"0.18em", color:"rgba(167,139,250,0.7)", border:"0.5px solid rgba(167,139,250,0.28)", borderRadius:2, background:"rgba(167,139,250,0.08)", cursor:"pointer", opacity: canvas.items.length===0 && !canvasText.trim() ? 0.4 : 1 }}>
                  SUBMIT TO TANIA
                </button>

                <div style={{ fontSize:7, color:"rgba(167,139,250,0.2)", textAlign:"center", letterSpacing:"0.08em" }}>
                  Files save as artifacts · Text sends directly to dialogue
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }
      `}</style>
    </div>
  );
}
