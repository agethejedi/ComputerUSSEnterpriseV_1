// TaniaPanel.jsx — v2
// Full creative workspace for Tania.
// Layout: episode catalogue left | lotus + dialogue center | canvas right (collapsible)
// Sections: Storybooks / Characters / Artifacts

import { useState, useEffect, useRef, useCallback } from "react";

// ── Constants ─────────────────────────────────────────────────────────────────
const GOLD      = "#c9965a";
const GOLD_L    = "#f0c87a";
const GOLD_DIM  = "rgba(201,150,90,0.35)";
const JADE      = "#3ecfaa";
const VIOLET    = "#a78bfa";
const BG        = "#0a0805";
const BG2       = "#060503";
const BG3       = "#050402";

const PLATFORMS = ["google_flow","dalle","instagram","runway","midjourney","seedance"];
const PLATFORM_LABELS = {
  google_flow:"Google Flow", dalle:"DALL·E", instagram:"Instagram",
  runway:"Runway", midjourney:"Midjourney", seedance:"Seedance"
};

// ── Lotus SVG ─────────────────────────────────────────────────────────────────
const LOTUS_SVG = `<svg viewBox="0 0 400 400" width="80" height="80" overflow="visible">
  <defs>
    <radialGradient id="tgP" cx="50%" cy="68%" r="75%">
      <stop offset="0%" stop-color="#fff8d8" stop-opacity="0.97"/>
      <stop offset="30%" stop-color="#f0c87a" stop-opacity="0.65"/>
      <stop offset="65%" stop-color="#c9783a" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#7a4010" stop-opacity="0.04"/>
    </radialGradient>
    <filter id="tcg" x="-200%" y="-200%" width="500%" height="500%">
      <feGaussianBlur stdDeviation="6" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <ellipse cx="200" cy="258" rx="128" ry="18" fill="none" stroke="rgba(201,150,90,0.45)" stroke-width="0.8"/>
  <path style="transform-origin:200px 245px;transform:rotate(-52deg) scale(0.80);mix-blend-mode:screen;opacity:0.58" d="M200 248 C170 192 145 138 158 82 C204 116 220 185 200 248Z" fill="url(#tgP)"/>
  <path style="transform-origin:200px 245px;transform:rotate(-33deg) scale(0.91);mix-blend-mode:screen;opacity:0.58" d="M200 248 C172 174 168 108 204 54 C238 122 234 182 200 248Z" fill="url(#tgP)"/>
  <path style="transform-origin:200px 245px;transform:rotate(-16deg) scale(0.99);mix-blend-mode:screen;opacity:0.58" d="M200 248 C190 158 202 88 256 40 C270 128 248 192 200 248Z" fill="url(#tgP)"/>
  <path style="transform-origin:200px 245px;transform:rotate(0deg) scale(1.04);mix-blend-mode:screen;opacity:0.58"  d="M200 248 C178 162 176 82 200 24 C224 82 222 162 200 248Z" fill="url(#tgP)"/>
  <path style="transform-origin:200px 245px;transform:rotate(16deg) scale(0.99);mix-blend-mode:screen;opacity:0.58" d="M200 248 C210 158 198 88 144 40 C130 128 152 192 200 248Z" fill="url(#tgP)"/>
  <path style="transform-origin:200px 245px;transform:rotate(33deg) scale(0.91);mix-blend-mode:screen;opacity:0.58" d="M200 248 C228 174 232 108 196 54 C162 122 166 182 200 248Z" fill="url(#tgP)"/>
  <path style="transform-origin:200px 245px;transform:rotate(52deg) scale(0.80);mix-blend-mode:screen;opacity:0.58" d="M200 248 C230 192 255 138 242 82 C196 116 180 185 200 248Z" fill="url(#tgP)"/>
  <circle cx="200" cy="248" r="11" fill="#fff8d8" filter="url(#tcg)"/>
  <circle cx="200" cy="248" r="5" fill="rgba(255,255,240,0.95)"/>
</svg>`;

// ── Lotus orbital canvas ───────────────────────────────────────────────────────
function LotusVisualizer({ state = "resting" }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const tRef      = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = 88, H = 88, cx = 44, cy = 44, base = 30;

    const cfg = {
      resting:  { c:[201,150,90],  speed:0.22, density:45 },
      thinking: { c:[251,191,36],  speed:0.85, density:60 },
      speaking: { c:[167,139,250], speed:1.2,  density:70 },
    }[state] || { c:[201,150,90], speed:0.22, density:45 };

    const particles = Array.from({ length: cfg.density }, () => ({
      a: Math.random()*Math.PI*2, b: Math.random()*Math.PI*2,
      r: 0.5+Math.random()*0.45, s: 0.4+Math.random()*1.6,
      size: 0.5+Math.random()*1.8, bright: 0.4+Math.random()*0.6,
      phase: Math.random()*Math.PI*2,
    }));

    const frame = () => {
      animRef.current = requestAnimationFrame(frame);
      tRef.current += 0.009 * cfg.speed;
      const t = tRef.current;
      ctx.clearRect(0,0,W,H);

      for (let i=0;i<3;i++) {
        const rr=base*(0.48+i*0.18);
        ctx.beginPath(); ctx.ellipse(cx,cy,rr*1.2,rr*0.58,0,0,Math.PI*2);
        ctx.strokeStyle=`rgba(${cfg.c.join(',')},${0.05+i*0.02})`; ctx.lineWidth=0.6; ctx.stroke();
      }
      ctx.globalCompositeOperation="lighter";
      for (let ring=0;ring<4;ring++) {
        const rot=t*(0.38+ring*0.04)+ring*0.6, rr=base*(0.56+ring*0.04);
        ctx.beginPath();
        for (let k=0;k<=60;k++) {
          const a=k/60*Math.PI*2;
          k===0?ctx.moveTo(cx+Math.cos(a+rot)*rr*1.1,cy+Math.sin(a+rot)*rr*0.54)
               :ctx.lineTo(cx+Math.cos(a+rot)*rr*1.1,cy+Math.sin(a+rot)*rr*0.54);
        }
        ctx.strokeStyle=`rgba(${cfg.c.join(',')},${0.04+ring*0.005})`; ctx.lineWidth=0.5; ctx.stroke();
      }
      for (const p of particles) {
        const a=p.a+t*p.s, b=p.b+t*0.65;
        const wobble=Math.sin(t*3+p.phase)*0.18;
        const x3=Math.cos(a)*base*p.r, z3=Math.sin(a)*base*p.r;
        const y3=Math.sin(b+wobble)*base*0.52*p.r;
        const perspective=0.82+(z3/base)*0.18;
        const x=cx+x3*perspective, y=cy+y3*perspective;
        const bright=0.2+0.8*((z3/base+1)/2);
        ctx.beginPath();
        ctx.fillStyle=`rgba(${cfg.c.join(',')},${0.15+bright*0.6})`;
        ctx.shadowBlur=5+bright*10; ctx.shadowColor=`rgba(${cfg.c.join(',')},0.8)`;
        ctx.arc(x,y,p.size*(0.5+bright*0.6),0,Math.PI*2); ctx.fill();
      }
      ctx.shadowBlur=0; ctx.globalCompositeOperation="source-over";
    };
    animRef.current = requestAnimationFrame(frame);
    return () => { if(animRef.current) cancelAnimationFrame(animRef.current); };
  }, [state]);

  return (
    <div style={{ position:"relative", width:88, height:88, flexShrink:0 }}>
      <canvas ref={canvasRef} width={88} height={88}
        style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} />
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
        animation:"taniaBreath 5.5s ease-in-out infinite",
        filter:`drop-shadow(0 0 10px rgba(201,150,90,0.65)) drop-shadow(0 0 32px rgba(201,150,90,0.18))`,
        zIndex:2 }}
        dangerouslySetInnerHTML={{ __html: LOTUS_SVG }} />
      <style>{`@keyframes taniaBreath{0%,100%{transform:scale(0.97);opacity:0.9}50%{transform:scale(1.03);opacity:1}}`}</style>
    </div>
  );
}

// ── Inline content card (script/caption/prompt in dialogue) ───────────────────
function InlineCard({ type, title, content, platform, status, onApprove, onRevise, onCopy }) {
  const isPrompt = type === "prompt";
  const borderCol = isPrompt ? "rgba(167,139,250,0.22)" : "rgba(201,150,90,0.22)";
  const labelCol  = isPrompt ? "rgba(167,139,250,0.5)"  : "rgba(201,150,90,0.48)";
  const bgCol     = isPrompt ? "rgba(167,139,250,0.03)"  : "rgba(201,150,90,0.04)";
  return (
    <div style={{ border:`0.5px solid ${borderCol}`, borderRadius:2, background:bgCol, overflow:"hidden", margin:"4px 0" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"6px 12px", borderBottom:`0.5px solid ${borderCol}`, background:`${bgCol}` }}>
        <span style={{ fontSize:8, letterSpacing:"0.2em", color:labelCol, display:"flex", alignItems:"center", gap:5 }}>
          {type === "script" ? "📄" : type === "caption" ? "💬" : "✨"} {title}
        </span>
        <div style={{ display:"flex", gap:4 }}>
          {platform && <span style={{ fontSize:7, letterSpacing:"0.1em", padding:"1px 6px",
            background:"rgba(167,139,250,0.1)", color:"rgba(167,139,250,0.6)",
            border:"0.5px solid rgba(167,139,250,0.2)", borderRadius:2 }}>{PLATFORM_LABELS[platform]||platform}</span>}
          {status !== "approved" && <button onClick={onApprove} style={{ fontSize:7, letterSpacing:"0.1em", padding:"2px 7px",
            border:"0.5px solid rgba(34,197,94,0.25)", color:"rgba(34,197,94,0.6)", borderRadius:2, background:"transparent", cursor:"pointer" }}>APPROVE</button>}
          {status === "approved" && <span style={{ fontSize:7, color:"rgba(34,197,94,0.5)", padding:"2px 7px" }}>✓ APPROVED</span>}
          <button onClick={onRevise} style={{ fontSize:7, letterSpacing:"0.1em", padding:"2px 7px",
            border:`0.5px solid ${GOLD_DIM}`, color:GOLD_DIM, borderRadius:2, background:"transparent", cursor:"pointer" }}>REVISE</button>
          <button onClick={onCopy} style={{ fontSize:7, letterSpacing:"0.1em", padding:"2px 7px",
            border:"0.5px solid rgba(167,139,250,0.2)", color:"rgba(167,139,250,0.5)", borderRadius:2, background:"transparent", cursor:"pointer" }}>COPY</button>
        </div>
      </div>
      <div style={{ padding:"12px 14px", fontSize:isPrompt?10:12, lineHeight:1.85,
        color: isPrompt ? "rgba(200,185,240,0.72)" : "rgba(240,210,170,0.88)",
        fontFamily: isPrompt ? "ui-monospace, monospace" : "Georgia, serif",
        fontStyle: isPrompt ? "normal" : "italic" }}>
        {content}
      </div>
    </div>
  );
}

// ── Conversation message ───────────────────────────────────────────────────────
function Message({ role, content }) {
  return (
    <div style={{ display:"flex", gap:10 }}>
      <span style={{ fontSize:8, letterSpacing:"0.16em", minWidth:40, textAlign:"right",
        paddingTop:2, flexShrink:0,
        color: role==="tania" ? "rgba(201,150,90,0.45)" : "rgba(255,255,255,0.22)" }}>
        {role === "tania" ? "TANIA" : "RON"}
      </span>
      <div style={{ fontSize: role==="tania"?11:10, lineHeight:1.78,
        borderLeft:`1px solid rgba(201,150,90,0.12)`, paddingLeft:10,
        color: role==="tania" ? "rgba(240,210,170,0.84)" : "rgba(255,255,255,0.42)",
        fontFamily: role==="tania" ? "Georgia, serif" : "inherit",
        fontStyle: role==="tania" ? "italic" : "normal" }}>
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
    <div style={{ border:`0.5px solid ${isPending?"rgba(251,191,36,0.2)":"rgba(201,150,90,0.18)"}`,
      borderRadius:2, background:"rgba(201,150,90,0.03)", marginBottom:8, overflow:"hidden" }}>
      <div onClick={() => setExpanded(e=>!e)}
        style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"8px 12px", cursor:"pointer" }}>
        <div>
          <div style={{ fontSize:11, color:isPending?"rgba(251,191,36,0.7)":"rgba(240,200,122,0.75)", marginBottom:2 }}>
            {char.name}
            {isPending && <span style={{ marginLeft:6, fontSize:7, letterSpacing:"0.15em", padding:"1px 5px",
              background:"rgba(251,191,36,0.1)", color:"rgba(251,191,36,0.6)",
              border:"0.5px solid rgba(251,191,36,0.2)", borderRadius:2 }}>PENDING</span>}
          </div>
          <div style={{ fontSize:8, color:"rgba(201,150,90,0.3)", letterSpacing:"0.08em" }}>
            {char.role} {char.profession ? `· ${char.profession}` : ""}
          </div>
        </div>
        <div style={{ display:"flex", gap:4, alignItems:"center" }}>
          {isPending && <button onClick={e=>{e.stopPropagation();onApprove(char.id);}}
            style={{ fontSize:7, letterSpacing:"0.1em", padding:"2px 7px",
              border:"0.5px solid rgba(34,197,94,0.25)", color:"rgba(34,197,94,0.6)",
              borderRadius:2, background:"transparent", cursor:"pointer" }}>APPROVE</button>}
          <button onClick={e=>{e.stopPropagation();onEdit(char);}}
            style={{ fontSize:7, letterSpacing:"0.1em", padding:"2px 7px",
              border:`0.5px solid ${GOLD_DIM}`, color:GOLD_DIM,
              borderRadius:2, background:"transparent", cursor:"pointer" }}>EDIT</button>
          <span style={{ fontSize:10, color:GOLD_DIM }}>{expanded?"▲":"▼"}</span>
        </div>
      </div>
      {expanded && (
        <div style={{ padding:"10px 12px", borderTop:"0.5px solid rgba(201,150,90,0.08)" }}>
          {char.relationship_to_tania && (
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:8, letterSpacing:"0.2em", color:"rgba(201,150,90,0.3)", marginBottom:4 }}>RELATIONSHIP</div>
              <div style={{ fontSize:10, color:"rgba(240,210,170,0.65)", fontFamily:"Georgia, serif", fontStyle:"italic", lineHeight:1.65 }}>{char.relationship_to_tania}</div>
            </div>
          )}
          {char.personality && (
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:8, letterSpacing:"0.2em", color:"rgba(201,150,90,0.3)", marginBottom:4 }}>PERSONALITY</div>
              <div style={{ fontSize:10, color:"rgba(240,210,170,0.6)", lineHeight:1.65 }}>{char.personality}</div>
            </div>
          )}
          {char.story_arc && (
            <div>
              <div style={{ fontSize:8, letterSpacing:"0.2em", color:"rgba(201,150,90,0.3)", marginBottom:4 }}>STORY ARC</div>
              <div style={{ fontSize:10, color:"rgba(240,210,170,0.6)", lineHeight:1.65 }}>{char.story_arc}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Artifact thumb ────────────────────────────────────────────────────────────
function ArtifactThumb({ artifact, onClick }) {
  const icons = { image:"🖼", audio:"🎵", link:"🔗", text:"📄", video:"🎬" };
  return (
    <div onClick={() => onClick(artifact)}
      style={{ border:"0.5px solid rgba(167,139,250,0.14)", borderRadius:2,
        background:"rgba(167,139,250,0.03)", padding:"8px 6px", cursor:"pointer",
        display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
      <span style={{ fontSize:18 }}>{icons[artifact.artifact_type]||"📎"}</span>
      <span style={{ fontSize:7, letterSpacing:"0.06em", color:"rgba(167,139,250,0.38)",
        textAlign:"center", lineHeight:1.3, wordBreak:"break-all" }}>
        {artifact.name.slice(0,16)}
      </span>
    </div>
  );
}

// ── Main TaniaPanel ───────────────────────────────────────────────────────────
export default function TaniaPanel({ isOpen, onClose }) {
  const [section, setSection]         = useState("storybooks"); // storybooks | characters | artifacts
  const [activeStorybook, setActiveStorybook] = useState(null);
  const [activeEpisode, setActiveEpisode]     = useState(null);
  const [activeSubMenu, setActiveSubMenu]     = useState(null); // script | caption | prompts

  const [storybooks, setStorybooks]   = useState([]);
  const [episodes, setEpisodes]       = useState([]);
  const [characters, setCharacters]   = useState([]);
  const [artifacts, setArtifacts]     = useState([]);

  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [thinking, setThinking]       = useState(false);
  const [speaking, setSpeaking]       = useState(false);
  const [taniaState, setTaniaState]   = useState("resting");
  const [canvasOpen, setCanvasOpen]   = useState(false);
  const [canvasText, setCanvasText]   = useState("");

  const [editingChar, setEditingChar] = useState(null);
  const [newStorybook, setNewStorybook] = useState(false);
  const [newStorybookName, setNewStorybookName] = useState("");

  const apiMessagesRef  = useRef([]);
  const scrollRef       = useRef(null);
  const inputRef        = useRef(null);
  const recognitionRef  = useRef(null);
  const [listening, setListening] = useState(false);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  // Load workspace data
  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/tania-data?resource=workspace")
      .then(r => r.json())
      .then(d => {
        setStorybooks(d.storybooks || []);
        setCharacters(d.characters || []);
        setArtifacts(d.artifacts || []);
        if (d.storybooks?.length) setActiveStorybook(d.storybooks[0]);
      }).catch(() => {});
  }, [isOpen]);

  // Load episodes when storybook changes
  useEffect(() => {
    if (!activeStorybook) return;
    fetch(`/api/tania-data?resource=episodes&storybook_id=${activeStorybook.id}`)
      .then(r => r.json())
      .then(d => { setEpisodes(d.episodes || []); setActiveEpisode(null); setActiveSubMenu(null); })
      .catch(() => {});
  }, [activeStorybook]);

  // Opening greeting
  useEffect(() => {
    if (!isOpen || messages.length > 0) return;
    const greet = async () => {
      setThinking(true); setTaniaState("thinking");
      try {
        const res = await fetch("/api/tania", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ messages:[{ role:"user", content:"[Session opening. Greet Ron in one or two sentences. You are in your world.]" }] }),
        });
        const data = await res.json();
        const text = data.content?.find(b => b.type==="text")?.text || "";
        if (text) {
          apiMessagesRef.current = [
            { role:"user", content:"[Session opening]" },
            { role:"assistant", content:text },
          ];
          setMessages([{ role:"tania", content:text, id:Date.now() }]);
          setTaniaState("speaking"); setSpeaking(true);
          await speakAsTania(text, data.voiceId);
          setSpeaking(false);
        }
      } catch {}
      setThinking(false); setTaniaState("resting");
    };
    greet();
  }, [isOpen]);

  // Fetch content for sub-menu click
  const loadSubMenuContent = useCallback(async (episode, subMenu) => {
    setActiveEpisode(episode); setActiveSubMenu(subMenu);
    const resource = subMenu === "prompts" ? "prompts" : subMenu === "caption" ? "captions" : "scripts";
    try {
      const res = await fetch(`/api/tania-data?resource=${resource}&episode_id=${episode.id}`);
      const data = await res.json();
      const items = data[resource] || [];
      if (!items.length) {
        setMessages(prev => [...prev, {
          role:"tania", content:`No ${subMenu} yet for ${episode.title}. Would you like to work on one now?`, id:Date.now()
        }]);
        return;
      }
      // Surface content inline in dialogue
      const latest = items[0];
      setMessages(prev => [...prev, {
        role:"system", type:subMenu==="prompts"?"prompt":"script",
        title:`${episode.title} · ${subMenu.toUpperCase()}`,
        content:latest.content,
        platform:latest.platform,
        status:latest.status,
        itemId:latest.id,
        episodeId:episode.id,
        id:Date.now()
      }]);
    } catch {}
  }, []);

  // Send to Tania
  const send = useCallback(async (textOverride) => {
    const text = (textOverride || input).trim();
    if (!text || thinking) return;
    setInput("");
    setMessages(prev => [...prev, { role:"ron", content:text, id:Date.now() }]);
    apiMessagesRef.current = [...apiMessagesRef.current, { role:"user", content:text }];
    setThinking(true); setTaniaState("thinking");
    try {
      const res = await fetch("/api/tania", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          messages: apiMessagesRef.current,
          skipMemory: apiMessagesRef.current.length > 2,
        }),
      });
      const data = await res.json();
      const responseText = data.content?.find(b => b.type==="text")?.text || "";
      if (responseText) {
        apiMessagesRef.current = [...apiMessagesRef.current, { role:"assistant", content:responseText }];
        setMessages(prev => [...prev, { role:"tania", content:responseText, id:Date.now() }]);
        setTaniaState("speaking"); setSpeaking(true);
        await speakAsTania(responseText, data.voiceId);
        setSpeaking(false);
      }
    } catch {
      setMessages(prev => [...prev, { role:"tania", content:"Something pulled me away. A moment.", id:Date.now() }]);
    }
    setThinking(false); setTaniaState("resting");
  }, [input, thinking]);

  // Canvas submit
  const submitCanvas = useCallback(async () => {
    if (!canvasText.trim()) return;
    const text = `[Canvas submission] ${canvasText.trim()}`;
    setCanvasText("");
    await send(text);
  }, [canvasText, send]);

  // Voice input
  const toggleVoice = useCallback(() => {
    if (listening) { recognitionRef.current?.stop(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = false; r.interimResults = false; r.lang = "en-US";
    let final = "";
    r.onresult = e => { for (let i=e.resultIndex;i<e.results.length;i++) if(e.results[i].isFinal) final+=e.results[i][0].transcript; };
    r.onend = () => { setListening(false); if (final.trim()) setInput(final.trim()); };
    r.onerror = () => setListening(false);
    r.start(); recognitionRef.current = r; setListening(true);
  }, [listening]);

  // Approve content item
  const approveItem = useCallback(async (type, id, episodeId) => {
    const resource = type==="prompt"?"prompt":type==="caption"?"caption":"script";
    await fetch("/api/tania-data", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ resource, action:"approve", data:{ id, episode_id:episodeId } }),
    }).catch(()=>{});
    setMessages(prev => prev.map(m => m.itemId===id ? {...m, status:"approved"} : m));
  }, []);

  // Approve character
  const approveCharacter = useCallback(async (id) => {
    await fetch("/api/tania-data", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ resource:"character", action:"approve", data:{ id } }),
    }).catch(()=>{});
    setCharacters(prev => prev.map(c => c.id===id ? {...c, status:"active"} : c));
  }, []);

  // Create new storybook
  const createStorybook = useCallback(async () => {
    if (!newStorybookName.trim()) return;
    const res = await fetch("/api/tania-data", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ resource:"storybook", action:"create", data:{ name:newStorybookName } }),
    });
    const data = await res.json();
    if (data.ok && data.storybook) {
      setStorybooks(prev => [...prev, data.storybook]);
      setActiveStorybook(data.storybook);
    }
    setNewStorybookName(""); setNewStorybook(false);
  }, [newStorybookName]);

  // Session log on close
  const handleClose = useCallback(() => {
    const userMsgs = messages.filter(m => m.role==="ron");
    if (userMsgs.length >= 2) {
      const summary = `Session with ${userMsgs.length} exchanges. Topics: ${userMsgs.slice(-3).map(m=>m.content?.slice(0,50)).join(" | ")}`;
      fetch("/api/tania-data", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ resource:"session", action:"log", data:{
          storybook_id: activeStorybook?.id || null,
          episode_id: activeEpisode?.id || null,
          session_date: new Date().toISOString().slice(0,10),
          summary, exchanges: userMsgs.length,
        }}),
      }).catch(()=>{});
    }
    onClose();
  }, [messages, activeStorybook, activeEpisode, onClose]);

  if (!isOpen) return null;

  const stateLabel = { resting:"RESTING", thinking:"THINKING", speaking:"SPEAKING" }[taniaState];
  const stateColor = { resting:GOLD_DIM, thinking:"rgba(251,191,36,0.55)", speaking:"rgba(167,139,250,0.55)" }[taniaState];

  return (
    <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex", flexDirection:"column", background:BG, fontFamily:"ui-sans-serif, system-ui, sans-serif" }}>

      {/* Grid bg */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none",
        backgroundImage:`linear-gradient(rgba(201,150,90,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(201,150,90,0.022) 1px,transparent 1px)`,
        backgroundSize:"40px 40px" }} />

      {/* ── Top bar ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"9px 16px", borderBottom:`0.5px solid rgba(201,150,90,0.12)`,
        background:BG3, flexShrink:0, position:"relative", zIndex:2 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:13, letterSpacing:"0.18em", color:GOLD }}>Taste of Tania</span>
          <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:9, letterSpacing:"0.18em",
            color:stateColor, border:`0.5px solid ${stateColor}`, padding:"2px 8px", borderRadius:2 }}>
            <span style={{ width:4, height:4, borderRadius:"50%", background:stateColor, display:"inline-block",
              boxShadow:`0 0 5px ${stateColor}` }} />
            {stateLabel}
          </div>
        </div>
        <button onClick={handleClose} style={{ fontSize:9, letterSpacing:"0.18em",
          color:"rgba(251,113,133,0.55)", border:"0.5px solid rgba(251,113,133,0.25)",
          padding:"2px 10px", borderRadius:2, background:"transparent", cursor:"pointer" }}>
          ✕ CLOSE
        </button>
      </div>

      {/* ── Section nav ── */}
      <div style={{ display:"flex", borderBottom:`0.5px solid rgba(201,150,90,0.1)`, background:BG3, flexShrink:0, position:"relative", zIndex:2 }}>
        {[["storybooks","📚","STORYBOOKS"],["characters","👤","CHARACTERS"],["artifacts","🖼","ARTIFACTS"]].map(([id,icon,label]) => (
          <div key={id} onClick={() => setSection(id)}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px",
              fontSize:9, letterSpacing:"0.22em", cursor:"pointer",
              color: section===id ? GOLD : "rgba(201,150,90,0.32)",
              borderBottom: section===id ? `1.5px solid ${GOLD}` : "1.5px solid transparent" }}>
            {icon} {label}
          </div>
        ))}
      </div>

      {/* ── Storybook tabs (only in storybooks section) ── */}
      {section === "storybooks" && (
        <div style={{ display:"flex", alignItems:"center", gap:3, padding:"7px 12px",
          borderBottom:`0.5px solid rgba(201,150,90,0.08)`, background:BG2, flexShrink:0, position:"relative", zIndex:2 }}>
          {storybooks.map(sb => (
            <div key={sb.id} onClick={() => setActiveStorybook(sb)}
              style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 10px",
                fontSize:9, letterSpacing:"0.13em", cursor:"pointer", borderRadius:2,
                color: activeStorybook?.id===sb.id ? GOLD : "rgba(201,150,90,0.35)",
                border: activeStorybook?.id===sb.id ? `0.5px solid rgba(201,150,90,0.28)` : "0.5px solid transparent",
                background: activeStorybook?.id===sb.id ? "rgba(201,150,90,0.06)" : "transparent" }}>
              {sb.name}
            </div>
          ))}
          {newStorybook ? (
            <div style={{ display:"flex", alignItems:"center", gap:4, marginLeft:"auto" }}>
              <input value={newStorybookName} onChange={e=>setNewStorybookName(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&createStorybook()}
                placeholder="Storybook name…"
                style={{ background:"rgba(201,150,90,0.05)", border:`0.5px solid rgba(201,150,90,0.25)`,
                  borderRadius:2, padding:"3px 8px", fontSize:9, color:GOLD_L, outline:"none", width:140 }} />
              <button onClick={createStorybook} style={{ fontSize:8, padding:"3px 8px",
                border:`0.5px solid rgba(201,150,90,0.3)`, color:GOLD, borderRadius:2,
                background:"rgba(201,150,90,0.08)", cursor:"pointer" }}>ADD</button>
              <button onClick={()=>setNewStorybook(false)} style={{ fontSize:8, padding:"3px 6px",
                border:"0.5px solid rgba(255,100,100,0.2)", color:"rgba(255,100,100,0.5)", borderRadius:2,
                background:"transparent", cursor:"pointer" }}>✕</button>
            </div>
          ) : (
            <div onClick={() => setNewStorybook(true)} style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:3,
              padding:"3px 9px", fontSize:9, letterSpacing:"0.13em",
              color:"rgba(201,150,90,0.28)", border:"0.5px dashed rgba(201,150,90,0.18)",
              borderRadius:2, cursor:"pointer" }}>
              + New storybook
            </div>
          )}
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ display:"grid",
        gridTemplateColumns: canvasOpen ? "215px 1fr 234px" : "215px 1fr 0px",
        flex:1, overflow:"hidden", minHeight:0, transition:"grid-template-columns 0.2s ease", position:"relative", zIndex:1 }}>

        {/* ── LEFT: catalogue ── */}
        <div style={{ borderRight:`0.5px solid rgba(201,150,90,0.1)`, background:BG2, overflowY:"auto", padding:"10px 0" }}>

          {section === "storybooks" && (
            <>
              <div style={{ fontSize:8, letterSpacing:"0.28em", color:"rgba(201,150,90,0.28)", padding:"4px 12px 8px" }}>EPISODES</div>
              {episodes.map(ep => (
                <div key={ep.id}>
                  <div onClick={() => setActiveEpisode(ep.id===activeEpisode?.id ? null : ep)}
                    style={{ padding:"7px 12px", borderLeft:`2px solid ${activeEpisode?.id===ep.id?GOLD:"transparent"}`,
                      background:activeEpisode?.id===ep.id?"rgba(201,150,90,0.05)":"transparent", cursor:"pointer" }}>
                    <div style={{ fontSize:10, color:"rgba(240,200,122,0.72)", marginBottom:2 }}>{ep.title}</div>
                    <div style={{ fontSize:8, color:"rgba(201,150,90,0.3)", letterSpacing:"0.08em" }}>
                      S{ep.season_num}E{ep.episode_num} · {activeStorybook?.name}
                    </div>
                    <div style={{ display:"flex", gap:3, marginTop:4, flexWrap:"wrap" }}>
                      {ep.status==="final"||ep.status==="approved" ? <span style={{ fontSize:7, padding:"1px 5px", background:"rgba(34,197,94,0.08)", color:"rgba(34,197,94,0.6)", border:"0.5px solid rgba(34,197,94,0.2)", borderRadius:2 }}>FINAL</span>
                      : ep.status==="draft" ? <span style={{ fontSize:7, padding:"1px 5px", background:"rgba(251,191,36,0.08)", color:"rgba(251,191,36,0.55)", border:"0.5px solid rgba(251,191,36,0.2)", borderRadius:2 }}>DRAFT</span>
                      : <span style={{ fontSize:7, padding:"1px 5px", background:"rgba(59,130,246,0.08)", color:"rgba(59,130,246,0.55)", border:"0.5px solid rgba(59,130,246,0.2)", borderRadius:2 }}>IN PROGRESS</span>}
                    </div>
                  </div>
                  {activeEpisode?.id===ep.id && (
                    <div style={{ padding:"2px 12px 6px 26px" }}>
                      {[["script","📄","Script"],["caption","💬","Caption"],["prompts","✨","Prompts"]].map(([key,icon,label]) => (
                        <div key={key} onClick={() => loadSubMenuContent(ep, key)}
                          style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 0",
                            fontSize:9, letterSpacing:"0.1em", cursor:"pointer",
                            color: activeSubMenu===key ? "rgba(201,150,90,0.8)" : "rgba(201,150,90,0.35)",
                            borderBottom:"0.5px solid rgba(201,150,90,0.05)" }}>
                          {icon} {label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div onClick={() => {
                const name = prompt("Episode title:");
                if (!name || !activeStorybook) return;
                fetch("/api/tania-data", { method:"POST", headers:{"Content-Type":"application/json"},
                  body: JSON.stringify({ resource:"episode", action:"create",
                    data:{ storybook_id:activeStorybook.id, title:name, episode_num:(episodes.length+1) }}) })
                  .then(r=>r.json()).then(d => {
                    if (d.ok) fetch(`/api/tania-data?resource=episodes&storybook_id=${activeStorybook.id}`)
                      .then(r=>r.json()).then(d2=>setEpisodes(d2.episodes||[]));
                  }).catch(()=>{});
              }} style={{ margin:"8px 12px 0", fontSize:8, letterSpacing:"0.15em",
                color:"rgba(201,150,90,0.25)", border:"0.5px dashed rgba(201,150,90,0.15)",
                borderRadius:2, padding:5, textAlign:"center", cursor:"pointer" }}>
                + New episode
              </div>
            </>
          )}

          {section === "characters" && (
            <>
              <div style={{ fontSize:8, letterSpacing:"0.28em", color:"rgba(201,150,90,0.28)", padding:"4px 12px 8px" }}>CHARACTERS</div>
              <div style={{ padding:"0 10px" }}>
                {characters.map(c => (
                  <CharacterCard key={c.id} char={c}
                    onApprove={approveCharacter}
                    onEdit={setEditingChar} />
                ))}
                {characters.length === 0 && (
                  <div style={{ fontSize:10, color:"rgba(201,150,90,0.25)", fontStyle:"italic", padding:"8px 2px", lineHeight:1.6 }}>
                    No characters yet. As Tania names people in her world, they'll appear here for your approval.
                  </div>
                )}
              </div>
            </>
          )}

          {section === "artifacts" && (
            <>
              <div style={{ fontSize:8, letterSpacing:"0.28em", color:"rgba(201,150,90,0.28)", padding:"4px 12px 8px" }}>ALL ARTIFACTS</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5, padding:"0 10px" }}>
                {artifacts.map(a => (
                  <ArtifactThumb key={a.id} artifact={a}
                    onClick={art => setMessages(prev => [...prev, {
                      role:"system", type:"artifact",
                      content:`[Artifact: ${art.name}] ${art.description||""}\n${art.content||""}`,
                      id:Date.now()
                    }])} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── CENTER: work area ── */}
        <div style={{ display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {/* Lotus presence — above dialogue */}
          <div style={{ background:BG3, borderBottom:`0.5px solid rgba(201,150,90,0.1)`,
            padding:"14px 20px 12px", display:"flex", alignItems:"center", gap:18,
            flexShrink:0, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, pointerEvents:"none",
              background:"radial-gradient(ellipse 55% 100% at 16% 50%, rgba(201,150,90,0.06) 0%, transparent 65%)" }} />
            <LotusVisualizer state={taniaState} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:10, letterSpacing:"0.32em", color:"rgba(201,150,90,0.48)", marginBottom:4 }}>{stateLabel}</div>
              <div style={{ fontSize:9, letterSpacing:"0.15em", color:"rgba(201,150,90,0.25)", marginBottom:8 }}>
                {activeStorybook ? `${activeStorybook.name}${activeEpisode?" · "+activeEpisode.title:""}` : "At ease · Ready"}
              </div>
              {messages.filter(m=>m.role==="tania").slice(-1).map((m,i) => (
                <div key={i} style={{ fontSize:11, lineHeight:1.65, color:"rgba(240,210,170,0.48)",
                  fontFamily:"Georgia, serif", fontStyle:"italic",
                  borderLeft:`1px solid rgba(201,150,90,0.15)`, paddingLeft:10 }}>
                  {m.content?.slice(0,120)}{m.content?.length>120?"…":""}
                </div>
              ))}
            </div>
          </div>

          {/* Dialogue */}
          <div ref={scrollRef} style={{ flex:1, overflowY:"auto", padding:"16px 18px", display:"flex", flexDirection:"column", gap:14 }}>
            {messages.map(msg => {
              if (msg.role === "system") {
                if (msg.type === "artifact") {
                  return <div key={msg.id} style={{ fontSize:10, color:"rgba(167,139,250,0.55)",
                    border:"0.5px solid rgba(167,139,250,0.15)", borderRadius:2, padding:"8px 12px",
                    background:"rgba(167,139,250,0.03)", fontFamily:"Georgia, serif", fontStyle:"italic" }}>
                    {msg.content}
                  </div>;
                }
                return <InlineCard key={msg.id}
                  type={msg.type} title={msg.title} content={msg.content}
                  platform={msg.platform} status={msg.status}
                  onApprove={() => approveItem(msg.type, msg.itemId, msg.episodeId)}
                  onRevise={() => setInput(`Let's revise the ${msg.type} for ${msg.title}. `)}
                  onCopy={() => navigator.clipboard?.writeText(msg.content).catch(()=>{})} />;
              }
              return <Message key={msg.id} role={msg.role} content={msg.content} />;
            })}
            {thinking && (
              <div style={{ display:"flex", gap:4, alignItems:"center", paddingLeft:50 }}>
                {[0,1,2].map(i => <span key={i} style={{ width:4, height:4, borderRadius:"50%",
                  background:GOLD, display:"inline-block",
                  animation:`taniaPulse 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ borderTop:`0.5px solid rgba(201,150,90,0.1)`, padding:"10px 14px",
            flexShrink:0, display:"flex", gap:6, alignItems:"flex-end", background:BG2 }}>
            <button onClick={toggleVoice} style={{ padding:"8px 9px", fontSize:13,
              color: listening ? "rgba(251,113,133,0.7)" : "rgba(201,150,90,0.38)",
              border: listening ? "0.5px solid rgba(251,113,133,0.4)" : `0.5px solid rgba(201,150,90,0.16)`,
              borderRadius:2, background:"transparent", cursor:"pointer" }}>🎙</button>
            <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();} }}
              placeholder="Bring her a direction, a story element, an instruction…"
              rows={1} disabled={thinking}
              style={{ flex:1, background:"rgba(201,150,90,0.04)", border:`0.5px solid rgba(201,150,90,0.16)`,
                borderRadius:2, padding:"8px 10px", fontSize:11, color:"rgba(240,200,122,0.65)",
                fontFamily:"inherit", resize:"none", minHeight:36, outline:"none" }} />
            <button onClick={() => send()} disabled={thinking||!input.trim()}
              style={{ padding:"8px 16px", fontSize:9, letterSpacing:"0.2em",
                color:"rgba(201,150,90,0.65)", border:`0.5px solid rgba(201,150,90,0.32)`,
                borderRadius:2, background:"rgba(201,150,90,0.06)", cursor:"pointer",
                opacity:thinking||!input.trim()?0.4:1 }}>SEND</button>
          </div>
        </div>

        {/* ── RIGHT: canvas column ── */}
        <div style={{ display:"flex", flexDirection:"column", overflow:"hidden",
          borderLeft:`0.5px solid rgba(167,139,250,0.15)` }}>
          {/* Canvas tab — always visible */}
          <div onClick={() => setCanvasOpen(o=>!o)}
            style={{ background:BG2, padding:"8px 11px", flexShrink:0,
              borderBottom:`0.5px solid rgba(167,139,250,0.12)`,
              display:"flex", alignItems:"center", gap:6, cursor:"pointer" }}>
            <span style={{ fontSize:9, letterSpacing:"0.22em", color:"rgba(167,139,250,0.48)",
              display:"flex", alignItems:"center", gap:5 }}>⊞ CANVAS</span>
            <span style={{ marginLeft:"auto", fontSize:7, letterSpacing:"0.1em", color:"rgba(167,139,250,0.22)" }}>
              {canvasOpen ? "COLLAPSE" : "EXPAND"}
            </span>
          </div>

          {canvasOpen && (
            <div style={{ flex:1, overflowY:"auto", background:BG2 }}>
              {/* Artifacts grid */}
              <div style={{ padding:"10px 10px 6px" }}>
                <div style={{ fontSize:8, letterSpacing:"0.24em", color:"rgba(167,139,250,0.28)", marginBottom:7 }}>ARTIFACTS</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5 }}>
                  {artifacts.slice(0,6).map(a => (
                    <ArtifactThumb key={a.id} artifact={a}
                      onClick={art => {
                        setCanvasText(prev => prev + (art.description||art.name) + "\n");
                      }} />
                  ))}
                  <div style={{ border:"0.5px dashed rgba(167,139,250,0.14)", borderRadius:2,
                    background:"transparent", padding:"8px 6px", cursor:"pointer",
                    display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                    color:"rgba(167,139,250,0.25)", fontSize:7, letterSpacing:"0.08em", textAlign:"center" }}
                    onClick={() => setSection("artifacts")}>
                    + Add artifact
                  </div>
                </div>
              </div>

              <hr style={{ border:"none", borderTop:"0.5px solid rgba(167,139,250,0.07)", margin:"4px 10px 8px" }} />

              {/* Submit area */}
              <div style={{ padding:"0 10px 12px" }}>
                <div style={{ border:"0.5px dashed rgba(167,139,250,0.2)", borderRadius:2,
                  background:"rgba(167,139,250,0.025)", padding:8,
                  fontSize:8, letterSpacing:"0.1em", color:"rgba(167,139,250,0.3)",
                  textAlign:"center", minHeight:36, display:"flex", alignItems:"center",
                  justifyContent:"center", gap:5, marginBottom:6, cursor:"pointer" }}>
                  ↑ Drop file · paste image · Ctrl+V
                </div>
                <textarea value={canvasText} onChange={e=>setCanvasText(e.target.value)}
                  placeholder="Paste text, a link, or a note to submit to Tania…"
                  style={{ width:"100%", background:"rgba(167,139,250,0.04)",
                    border:"0.5px solid rgba(167,139,250,0.14)", borderRadius:2,
                    padding:"7px 8px", fontSize:10, color:"rgba(167,139,250,0.6)",
                    fontFamily:"inherit", resize:"none", minHeight:54, outline:"none", marginBottom:5 }} />
                <button onClick={submitCanvas} disabled={!canvasText.trim()}
                  style={{ width:"100%", padding:6, fontSize:8, letterSpacing:"0.18em",
                    color:"rgba(167,139,250,0.6)", border:"0.5px solid rgba(167,139,250,0.22)",
                    borderRadius:2, background:"rgba(167,139,250,0.06)", cursor:"pointer",
                    opacity:canvasText.trim()?1:0.4 }}>SUBMIT TO TANIA</button>
              </div>
            </div>
          )}
        </div>

      </div>

      <style>{`
        @keyframes taniaPulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }
      `}</style>
    </div>
  );
}

// ── TTS helper ────────────────────────────────────────────────────────────────
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
        src.buffer = decoded; src.connect(actx.destination);
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
