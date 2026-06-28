// EmailApprovalModal.jsx
// Shows JARVIS-drafted email for Ron's approval before sending.
// Props: draft, onApprove, onEdit, onCancel, sending

import { useState, useEffect } from "react";

export default function EmailApprovalModal({ draft, onApprove, onEdit, onCancel, sending }) {
  const [editingField, setEditingField] = useState(null)
  const [editedDraft, setEditedDraft] = useState(null)
  const [editValue, setEditValue] = useState("")

  useEffect(() => { if (draft) setEditedDraft({ ...draft }) }, [draft])

  // Guard — don't render until both draft prop and local state are set
  if (!draft || !editedDraft) return null

  const startEdit = (field) => {
    setEditingField(field)
    setEditValue(editedDraft[field] || "")
  }

  const commitEdit = () => {
    if (editingField) {
      const updated = { ...editedDraft, [editingField]: editValue }
      setEditedDraft(updated)
      onEdit(updated)
    }
    setEditingField(null)
  }

  const accent = "#7DD3FC"
  const gold   = "#c9a84c"

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000,
      background: "rgba(3,7,13,0.92)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "ui-monospace, 'SF Mono', monospace",
    }}>
      <div style={{
        width: "min(640px, 92vw)",
        background: "#070d14",
        border: `1px solid ${gold}44`,
        boxShadow: `0 0 40px ${gold}22`,
        position: "relative",
      }}>
        {/* Corner decorators */}
        {[["top","left"],["top","right"],["bottom","left"],["bottom","right"]].map(([v,h]) => (
          <div key={v+h} style={{
            position: "absolute", [v]: -1, [h]: -1, width: 10, height: 10,
            borderTop: v === "top" ? `1px solid ${gold}` : "none",
            borderBottom: v === "bottom" ? `1px solid ${gold}` : "none",
            borderLeft: h === "left" ? `1px solid ${gold}` : "none",
            borderRight: h === "right" ? `1px solid ${gold}` : "none",
          }} />
        ))}

        {/* Header */}
        <div style={{
          padding: "14px 20px", borderBottom: `1px solid ${gold}22`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: `${gold}08`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: gold, display: "inline-block", boxShadow: `0 0 6px ${gold}` }} />
            <span style={{ fontSize: 10, letterSpacing: "0.3em", color: gold }}>EMAIL APPROVAL REQUIRED</span>
          </div>
          <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "#4a6a70", fontSize: 16, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        {/* Email fields */}
        <div style={{ padding: "20px" }}>

          {/* To */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 8, letterSpacing: "0.25em", color: "#4a6a70", marginBottom: 4 }}>TO</div>
            {editingField === "to" ? (
              <div style={{ display: "flex", gap: 6 }}>
                <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && commitEdit()}
                  style={{ flex: 1, background: "#0b1620", border: `1px solid ${accent}44`, color: accent, padding: "6px 10px", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
                <button onClick={commitEdit} style={{ padding: "6px 12px", background: `${accent}15`, border: `1px solid ${accent}44`, color: accent, cursor: "pointer", fontSize: 10, letterSpacing: "0.1em" }}>OK</button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => startEdit("to")}>
                <span style={{ fontSize: 13, color: "#d4e8ea" }}>{editedDraft.to}</span>
                <span style={{ fontSize: 9, color: "#4a6a70", letterSpacing: "0.1em" }}>EDIT</span>
              </div>
            )}
          </div>

          {/* Subject */}
          <div style={{ marginBottom: 16, borderTop: `1px solid #182e32`, paddingTop: 14 }}>
            <div style={{ fontSize: 8, letterSpacing: "0.25em", color: "#4a6a70", marginBottom: 4 }}>SUBJECT</div>
            {editingField === "subject" ? (
              <div style={{ display: "flex", gap: 6 }}>
                <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && commitEdit()}
                  style={{ flex: 1, background: "#0b1620", border: `1px solid ${accent}44`, color: accent, padding: "6px 10px", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
                <button onClick={commitEdit} style={{ padding: "6px 12px", background: `${accent}15`, border: `1px solid ${accent}44`, color: accent, cursor: "pointer", fontSize: 10, letterSpacing: "0.1em" }}>OK</button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => startEdit("subject")}>
                <span style={{ fontSize: 13, color: "#d4e8ea" }}>{editedDraft.subject}</span>
                <span style={{ fontSize: 9, color: "#4a6a70", letterSpacing: "0.1em" }}>EDIT</span>
              </div>
            )}
          </div>

          {/* Body */}
          <div style={{ marginBottom: 20, borderTop: `1px solid #182e32`, paddingTop: 14 }}>
            <div style={{ fontSize: 8, letterSpacing: "0.25em", color: "#4a6a70", marginBottom: 6 }}>BODY</div>
            {editingField === "body" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <textarea autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} rows={8}
                  style={{ background: "#0b1620", border: `1px solid ${accent}44`, color: "#a8c4c8", padding: "8px 10px", fontSize: 12, fontFamily: "inherit", outline: "none", resize: "vertical", lineHeight: 1.6 }} />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                  <button onClick={() => setEditingField(null)} style={{ padding: "5px 12px", background: "transparent", border: "1px solid #182e32", color: "#4a6a70", cursor: "pointer", fontSize: 9, letterSpacing: "0.1em" }}>CANCEL</button>
                  <button onClick={commitEdit} style={{ padding: "5px 12px", background: `${accent}15`, border: `1px solid ${accent}44`, color: accent, cursor: "pointer", fontSize: 9, letterSpacing: "0.1em" }}>APPLY</button>
                </div>
              </div>
            ) : (
              <div onClick={() => startEdit("body")} style={{ cursor: "pointer", position: "relative" }}>
                <div style={{
                  fontSize: 12, color: "#a8c4c8", lineHeight: 1.7, whiteSpace: "pre-wrap",
                  maxHeight: 200, overflowY: "auto", padding: "10px 12px",
                  background: "#0b1620", border: "1px solid #182e32",
                }}>
                  {editedDraft.body}
                </div>
                <div style={{ position: "absolute", top: 8, right: 8, fontSize: 9, color: "#4a6a70", letterSpacing: "0.1em" }}>EDIT</div>
              </div>
            )}
          </div>

          {/* Tip */}
          <div style={{ fontSize: 9, color: "#4a6a70", letterSpacing: "0.12em", marginBottom: 18, textAlign: "center" }}>
            SAY "APPROVE" / "SEND IT" · "EDIT THE SUBJECT" · "CANCEL" — OR USE BUTTONS BELOW
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onCancel}
              style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid #1e3040", color: "#4a6a70", cursor: "pointer", fontSize: 10, letterSpacing: "0.2em", fontFamily: "inherit" }}>
              ✕ CANCEL
            </button>
            <button onClick={() => onApprove(editedDraft)} disabled={sending}
              style={{ flex: 2, padding: "10px", background: sending ? `${gold}08` : `${gold}15`, border: `1px solid ${gold}${sending ? "33" : "88"}`, color: sending ? `${gold}66` : gold, cursor: sending ? "not-allowed" : "pointer", fontSize: 10, letterSpacing: "0.2em", fontFamily: "inherit", boxShadow: sending ? "none" : `0 0 12px ${gold}33` }}>
              {sending ? "SENDING…" : "✓ APPROVE & SEND"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
