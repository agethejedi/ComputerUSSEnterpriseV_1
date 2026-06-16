// FileIngestion.jsx
// JARVIS file drop zone — drag, drop, paste, browse
// Files are processed multimodally and sent to JARVIS as context

import { useState, useEffect, useRef, useCallback } from "react";

const G = "rgba(201,150,90,";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const FILE_ICONS = {
  image: "🖼",
  pdf: "📄",
  code: "💻",
  csv: "📊",
  text: "📝",
  audio: "🎵",
  video: "🎬",
  doc: "📃",
  unknown: "📎",
};

function getFileType(file) {
  const mime = file.type;
  const name = file.name.toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (name.endsWith(".csv")) return "csv";
  if (name.match(/\.(js|jsx|ts|tsx|py|rs|go|java|c|cpp|h|css|html|json|yaml|yml|toml|sh|sql)$/)) return "code";
  if (name.match(/\.(txt|md|markdown)$/)) return "text";
  if (name.match(/\.(doc|docx)$/)) return "doc";
  return "unknown";
}

async function readFile(file) {
  const type = getFileType(file);
  return new Promise((resolve) => {
    const reader = new FileReader();
    if (type === "image") {
      reader.onload = e => resolve({
        id: Date.now() + Math.random(),
        name: file.name,
        type,
        size: file.size,
        mimeType: file.type,
        preview: e.target.result,
        content: e.target.result, // base64 data URL
        isImage: true,
      });
      reader.readAsDataURL(file);
    } else if (type === "pdf") {
      reader.onload = e => resolve({
        id: Date.now() + Math.random(),
        name: file.name,
        type,
        size: file.size,
        mimeType: file.type,
        content: e.target.result, // base64 for PDF
        isPdf: true,
      });
      reader.readAsDataURL(file);
    } else {
      reader.onload = e => resolve({
        id: Date.now() + Math.random(),
        name: file.name,
        type,
        size: file.size,
        mimeType: file.type,
        content: (e.target.result || "").slice(0, 50000), // text content
        isText: true,
      });
      reader.readAsText(file);
    }
  });
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + "B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + "KB";
  return (bytes / (1024 * 1024)).toFixed(1) + "MB";
}

// Build multimodal Anthropic content blocks from staged files
export function buildFileContentBlocks(files, userText) {
  const blocks = [];

  for (const f of files) {
    if (f.isImage) {
      const base64 = f.content.split(",")[1];
      const mimeType = f.mimeType || "image/jpeg";
      blocks.push({ type: "image", source: { type: "base64", media_type: mimeType, data: base64 } });
    } else if (f.isPdf) {
      const base64 = f.content.split(",")[1];
      blocks.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } });
    } else if (f.isText) {
      blocks.push({ type: "text", text: `[FILE: ${f.name} (${f.type})]\n\`\`\`\n${f.content}\n\`\`\`` });
    }
  }

  if (userText?.trim()) {
    blocks.push({ type: "text", text: userText.trim() });
  } else if (files.length > 0) {
    blocks.push({ type: "text", text: `I'm sending you ${files.length} file${files.length > 1 ? "s" : ""}. Please review and tell me what you see or can help me do with ${files.length > 1 ? "them" : "it"}.` });
  }

  return blocks;
}

export default function FileIngestion({ isOpen, onClose, onSubmit }) {
  const [files, setFiles]         = useState([]);
  const [dragOver, setDragOver]   = useState(false);
  const [text, setText]           = useState("");
  const [processing, setProcessing] = useState(false);
  const inputId = useRef("fi-" + Math.random().toString(36).slice(2));
  const textRef = useRef(null);

  // Document-level paste
  useEffect(() => {
    if (!isOpen) return;
    const handler = async (e) => {
      const items = e.clipboardData?.items || [];
      const fileItems = [];
      for (const item of items) {
        if (item.kind === "file") fileItems.push(item.getAsFile());
      }
      if (fileItems.length) {
        e.preventDefault();
        await addFiles(fileItems);
      }
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [isOpen]);

  const addFiles = useCallback(async (newFiles) => {
    setProcessing(true);
    const valid = [...newFiles].filter(f => f.size <= MAX_FILE_SIZE);
    const processed = await Promise.all(valid.map(readFile));
    setFiles(prev => [...prev, ...processed]);
    setProcessing(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleSubmit = () => {
    if (!files.length && !text.trim()) return;
    const blocks = buildFileContentBlocks(files, text);
    onSubmit(blocks, files, text);
    setFiles([]);
    setText("");
    onClose();
  };

  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id));

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      background: "rgba(5,4,3,0.88)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>

      <div style={{
        width: 520, maxHeight: "80vh",
        background: "#080705", border: "0.5px solid rgba(201,150,90,0.18)",
        borderRadius: 3, display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
      }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderBottom:"0.5px solid rgba(201,150,90,0.08)" }}>
          <div style={{ fontSize:9, letterSpacing:"0.3em", color:"rgba(201,150,90,0.5)", fontFamily:"ui-monospace,monospace" }}>
            JARVIS · FILE INGESTION
          </div>
          <button onClick={onClose} style={{ fontSize:10, color:"rgba(251,113,133,0.45)", background:"transparent", border:"0.5px solid rgba(251,113,133,0.2)", padding:"2px 8px", borderRadius:2, cursor:"pointer", letterSpacing:"0.1em", fontFamily:"ui-monospace,monospace" }}>
            ✕
          </button>
        </div>

        {/* Drop zone */}
        <input id={inputId.current} type="file" multiple
          accept="image/*,.pdf,.txt,.md,.csv,.js,.jsx,.ts,.tsx,.py,.json,.sql,.html,.css"
          style={{ display:"none" }}
          onChange={e => { addFiles(e.target.files); e.target.value=""; }}
        />

        <label htmlFor={inputId.current}
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          style={{
            display: "flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            margin: "14px 14px 0",
            border: `0.5px dashed rgba(201,150,90,${dragOver?0.55:0.2})`,
            borderRadius: 2,
            background: `rgba(201,150,90,${dragOver?0.06:0.02})`,
            padding: "20px 14px",
            cursor: "pointer",
            transition: "all 0.15s ease",
            minHeight: 80,
          }}>
          <div style={{ fontSize:20, marginBottom:6 }}>{processing ? "⏳" : "↑"}</div>
          <div style={{ fontSize:9, letterSpacing:"0.2em", color:`rgba(201,150,90,${dragOver?0.7:0.35})`, fontFamily:"ui-monospace,monospace" }}>
            {processing ? "PROCESSING…" : dragOver ? "DROP TO ADD" : "DROP FILES · CLICK TO BROWSE · CTRL+V ANYWHERE"}
          </div>
          <div style={{ fontSize:7, letterSpacing:"0.12em", color:"rgba(201,150,90,0.2)", marginTop:4, fontFamily:"ui-monospace,monospace" }}>
            Images · PDFs · Code · CSV · Text · Max 10MB each
          </div>
        </label>

        {/* Staged files */}
        {files.length > 0 && (
          <div style={{ margin:"10px 14px 0", maxHeight:180, overflowY:"auto", display:"flex", flexDirection:"column", gap:4 }}>
            {files.map(f => (
              <div key={f.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 8px", background:"rgba(201,150,90,0.04)", border:"0.5px solid rgba(201,150,90,0.1)", borderRadius:2 }}>
                {f.isImage && f.preview ? (
                  <img src={f.preview} alt="" style={{ width:28, height:28, objectFit:"cover", borderRadius:1, flexShrink:0 }}/>
                ) : (
                  <span style={{ fontSize:16, flexShrink:0 }}>{FILE_ICONS[f.type]}</span>
                )}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:9, color:"rgba(240,200,122,0.7)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.name}</div>
                  <div style={{ fontSize:7, color:"rgba(201,150,90,0.3)", fontFamily:"ui-monospace,monospace", letterSpacing:"0.1em" }}>
                    {f.type.toUpperCase()} · {formatSize(f.size)}
                  </div>
                </div>
                <button onClick={() => removeFile(f.id)}
                  style={{ fontSize:10, color:"rgba(251,113,133,0.4)", background:"transparent", border:"none", cursor:"pointer", flexShrink:0, padding:"0 3px" }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text input */}
        <div style={{ margin:"10px 14px 0", flex:1 }}>
          <textarea ref={textRef} value={text} onChange={e => setText(e.target.value)}
            placeholder="Add context or instructions for JARVIS… (optional)"
            style={{ width:"100%", background:"rgba(201,150,90,0.03)", border:"0.5px solid rgba(201,150,90,0.1)", borderRadius:2, padding:"8px 10px", fontSize:11, color:"rgba(240,210,170,0.65)", fontFamily:"ui-sans-serif,sans-serif", resize:"none", minHeight:64, outline:"none", lineHeight:1.6 }}
          />
        </div>

        {/* Actions */}
        <div style={{ display:"flex", gap:6, padding:"10px 14px 12px", justifyContent:"flex-end" }}>
          <button onClick={onClose}
            style={{ fontSize:8, letterSpacing:"0.18em", padding:"5px 12px", color:"rgba(201,150,90,0.35)", border:"0.5px solid rgba(201,150,90,0.15)", borderRadius:2, background:"transparent", cursor:"pointer", fontFamily:"ui-monospace,monospace" }}>
            CANCEL
          </button>
          <button onClick={handleSubmit}
            disabled={!files.length && !text.trim()}
            style={{ fontSize:8, letterSpacing:"0.18em", padding:"5px 16px", color:"rgba(201,150,90,0.8)", border:"0.5px solid rgba(201,150,90,0.35)", borderRadius:2, background:"rgba(201,150,90,0.08)", cursor:"pointer", fontFamily:"ui-monospace,monospace", opacity: !files.length && !text.trim() ? 0.4 : 1 }}>
            SEND TO JARVIS {files.length > 0 ? `(${files.length} file${files.length>1?"s":""})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
