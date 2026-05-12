import { useState, useEffect, useCallback, useRef } from "react";

// ============================================================
// CONSTANTS
// ============================================================

const ACCENT = "#7DD3FC";
const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE",
                 "JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
const HOURS = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2, "0")}:00`
);

const LABELS = {
  work:     { color: "#67E8F9", bg: "#67E8F915", label: "WORK" },
  personal: { color: "#A78BFA", bg: "#A78BFA15", label: "PERSONAL" },
  health:   { color: "#34D399", bg: "#34D39915", label: "HEALTH" },
  finance:  { color: "#FBBF24", bg: "#FBBF2415", label: "FINANCE" },
  travel:   { color: "#FB923C", bg: "#FB923C15", label: "TRAVEL" },
  other:    { color: "#94A3B8", bg: "#94A3B815", label: "OTHER" },
};

// ============================================================
// HELPERS
// ============================================================

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr, n) {
  const d = formatDate(dateStr);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

function startOfWeek(dateStr) {
  const d = formatDate(dateStr);
  d.setDate(d.getDate() - d.getDay());
  return toDateStr(d);
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

// LS fallback
const LS_KEY = "jarvis_calendar_events";
function lsSave(events) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(events)); } catch {}
}
function lsLoad() {
  try {
    const r = localStorage.getItem(LS_KEY);
    return r ? JSON.parse(r) : [];
  } catch { return []; }
}

// ============================================================
// EVENT MODAL
// ============================================================

function EventModal({ initial, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [date, setDate] = useState(initial?.date || today());
  const [startTime, setStartTime] = useState(initial?.startTime || "09:00");
  const [endTime, setEndTime] = useState(initial?.endTime || "10:00");
  const [label, setLabel] = useState(initial?.label || "work");
  const [notes, setNotes] = useState(initial?.notes || "");
  const isEdit = !!initial?.id;

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ ...initial, title: title.trim(), date, startTime, endTime, label, notes });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "#020617cc" }}>
      <div className="w-full max-w-md mx-4 relative" style={{ background: "#0B1626", border: `1px solid ${ACCENT}44` }}>
        {/* Corner brackets */}
        {["top-0 left-0 border-t border-l","top-0 right-0 border-t border-r",
          "bottom-0 left-0 border-b border-l","bottom-0 right-0 border-b border-r"].map((cls, i) => (
          <div key={i} className={`absolute w-3 h-3 ${cls}`} style={{ borderColor: ACCENT }} />
        ))}

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: `${ACCENT}22` }}>
          <span className="text-[10px] tracking-[0.25em]" style={{ color: ACCENT }}>
            {isEdit ? "EDIT EVENT" : "NEW EVENT"}
          </span>
          <button onClick={onClose} className="text-[10px] tracking-[0.2em] opacity-50 hover:opacity-100" style={{ color: ACCENT }}>✕</button>
        </div>

        <div className="p-4 space-y-3">
          {/* Title */}
          <div>
            <label className="text-[9px] tracking-[0.2em] opacity-60 block mb-1" style={{ color: ACCENT }}>TITLE</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent text-sm px-3 py-2 outline-none"
              style={{ border: `1px solid ${ACCENT}33`, color: "#E2E8F0", caretColor: ACCENT }}
              placeholder="Event title..."
              autoFocus
            />
          </div>

          {/* Date + Times */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="text-[9px] tracking-[0.2em] opacity-60 block mb-1" style={{ color: ACCENT }}>DATE</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-transparent text-[11px] px-2 py-2 outline-none"
                style={{ border: `1px solid ${ACCENT}33`, color: "#E2E8F0", colorScheme: "dark" }}
              />
            </div>
            <div>
              <label className="text-[9px] tracking-[0.2em] opacity-60 block mb-1" style={{ color: ACCENT }}>START</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-transparent text-[11px] px-2 py-2 outline-none"
                style={{ border: `1px solid ${ACCENT}33`, color: "#E2E8F0", colorScheme: "dark" }}
              />
            </div>
            <div>
              <label className="text-[9px] tracking-[0.2em] opacity-60 block mb-1" style={{ color: ACCENT }}>END</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-transparent text-[11px] px-2 py-2 outline-none"
                style={{ border: `1px solid ${ACCENT}33`, color: "#E2E8F0", colorScheme: "dark" }}
              />
            </div>
          </div>

          {/* Label */}
          <div>
            <label className="text-[9px] tracking-[0.2em] opacity-60 block mb-1" style={{ color: ACCENT }}>LABEL</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(LABELS).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setLabel(key)}
                  className="px-3 py-1 text-[9px] tracking-[0.15em] transition-all"
                  style={{
                    border: `1px solid ${val.color}${label === key ? "ff" : "44"}`,
                    background: label === key ? val.bg : "transparent",
                    color: val.color,
                    boxShadow: label === key ? `0 0 8px ${val.color}40` : "none",
                  }}
                >
                  {val.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[9px] tracking-[0.2em] opacity-60 block mb-1" style={{ color: ACCENT }}>NOTES</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-transparent text-[11px] px-3 py-2 outline-none resize-none"
              style={{ border: `1px solid ${ACCENT}33`, color: "#E2E8F0", caretColor: ACCENT }}
              placeholder="Optional notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              className="flex-1 py-2 text-[10px] tracking-[0.25em] transition-all"
              style={{ border: `1px solid ${ACCENT}`, color: ACCENT, background: `${ACCENT}15`, boxShadow: `0 0 12px ${ACCENT}30` }}
            >
              {isEdit ? "SAVE CHANGES" : "ADD EVENT"}
            </button>
            {isEdit && (
              <button
                onClick={() => onDelete(initial.id)}
                className="px-4 py-2 text-[10px] tracking-[0.2em] transition-all"
                style={{ border: "1px solid #FB718566", color: "#FB7185", background: "#FB718515" }}
              >
                DELETE
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MONTH VIEW
// ============================================================

function MonthView({ year, month, events, selectedDate, onSelectDate, onAddClick }) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const todayStr = today();

  // Build grid — 6 rows x 7 cols
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const getEventsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.date === dateStr);
  };

  return (
    <div className="flex-1 overflow-auto p-3">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center py-1 text-[9px] tracking-[0.2em] opacity-50" style={{ color: ACCENT }}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px" style={{ background: `${ACCENT}11` }}>
        {cells.map((day, i) => {
          const dateStr = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const dayEvents = getEventsForDay(day);

          return (
            <div
              key={i}
              className="min-h-16 p-1 cursor-pointer transition-all"
              style={{
                background: isSelected ? `${ACCENT}15` : "#0B1626",
                border: isToday ? `1px solid ${ACCENT}66` : "1px solid transparent",
              }}
              onClick={() => {
                if (dateStr) {
                  onSelectDate(dateStr);
                  onAddClick(dateStr);
                }
              }}
            >
              {day && (
                <>
                  <div className="text-[11px] tabular-nums mb-1 text-right pr-1"
                    style={{ color: isToday ? ACCENT : isSelected ? ACCENT : "#64748B",
                             fontWeight: isToday ? "600" : "normal" }}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((evt) => (
                      <div
                        key={evt.id}
                        className="text-[8px] tracking-[0.05em] px-1 truncate"
                        style={{
                          background: LABELS[evt.label]?.bg || LABELS.other.bg,
                          color: LABELS[evt.label]?.color || LABELS.other.color,
                          borderLeft: `2px solid ${LABELS[evt.label]?.color || LABELS.other.color}`,
                        }}
                        onClick={(e) => { e.stopPropagation(); onAddClick(dateStr, evt); }}
                      >
                        {evt.startTime} {evt.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[8px] opacity-50 pl-1" style={{ color: ACCENT }}>
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// WEEK VIEW
// ============================================================

function WeekView({ weekStart, events, onAddClick }) {
  const todayStr = today();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getEventsForDay = (dateStr) => events.filter((e) => e.date === dateStr);

  return (
    <div className="flex-1 overflow-auto">
      {/* Day headers */}
      <div className="grid sticky top-0 z-10" style={{ gridTemplateColumns: "48px repeat(7, 1fr)", background: "#0B1626", borderBottom: `1px solid ${ACCENT}22` }}>
        <div />
        {days.map((dateStr) => {
          const d = formatDate(dateStr);
          const isToday = dateStr === todayStr;
          return (
            <div key={dateStr} className="text-center py-2" style={{ borderLeft: `1px solid ${ACCENT}11` }}>
              <div className="text-[9px] tracking-[0.15em] opacity-50" style={{ color: ACCENT }}>{DAYS[d.getDay()]}</div>
              <div className="text-lg font-light tabular-nums" style={{ color: isToday ? ACCENT : "#64748B", textShadow: isToday ? `0 0 8px ${ACCENT}` : "none" }}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="grid" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
        {HOURS.map((hour) => (
          <>
            <div key={`h-${hour}`} className="text-[8px] tabular-nums text-right pr-2 pt-1 opacity-40 border-t" style={{ color: ACCENT, borderColor: `${ACCENT}11` }}>
              {hour}
            </div>
            {days.map((dateStr) => {
              const slotEvents = getEventsForDay(dateStr).filter((e) => e.startTime?.startsWith(hour.slice(0, 2)));
              return (
                <div
                  key={`${dateStr}-${hour}`}
                  className="h-12 border-t border-l cursor-pointer hover:bg-white/5 transition-all relative"
                  style={{ borderColor: `${ACCENT}11` }}
                  onClick={() => onAddClick(dateStr, null, hour)}
                >
                  {slotEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="absolute inset-x-0.5 top-0.5 text-[8px] px-1 py-0.5 truncate z-10 cursor-pointer"
                      style={{
                        background: LABELS[evt.label]?.bg || LABELS.other.bg,
                        color: LABELS[evt.label]?.color || LABELS.other.color,
                        borderLeft: `2px solid ${LABELS[evt.label]?.color || LABELS.other.color}`,
                      }}
                      onClick={(e) => { e.stopPropagation(); onAddClick(dateStr, evt); }}
                    >
                      {evt.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// DAY VIEW
// ============================================================

function DayView({ dateStr, events, onAddClick }) {
  const d = formatDate(dateStr);
  const dayEvents = events.filter((e) => e.date === dateStr).sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  const todayStr = today();
  const isToday = dateStr === todayStr;

  return (
    <div className="flex-1 overflow-auto p-3">
      {/* Date header */}
      <div className="mb-4 pb-2 border-b" style={{ borderColor: `${ACCENT}22` }}>
        <div className="text-[10px] tracking-[0.2em] opacity-50" style={{ color: ACCENT }}>{DAYS[d.getDay()]}</div>
        <div className="text-3xl font-light tabular-nums" style={{ color: isToday ? ACCENT : "#E2E8F0", textShadow: isToday ? `0 0 16px ${ACCENT}` : "none" }}>
          {MONTHS[d.getMonth()]} {d.getDate()}, {d.getFullYear()}
        </div>
        {isToday && <div className="text-[9px] tracking-[0.2em] mt-1" style={{ color: ACCENT }}>TODAY</div>}
      </div>

      {/* Hour slots */}
      <div className="space-y-px">
        {HOURS.map((hour) => {
          const slotEvents = dayEvents.filter((e) => e.startTime?.startsWith(hour.slice(0, 2)));
          return (
            <div
              key={hour}
              className="flex gap-3 group cursor-pointer"
              onClick={() => onAddClick(dateStr, null, hour)}
            >
              <div className="text-[9px] tabular-nums w-10 text-right flex-shrink-0 pt-1 opacity-40 group-hover:opacity-70 transition-opacity" style={{ color: ACCENT }}>
                {hour}
              </div>
              <div className="flex-1 min-h-10 border-t group-hover:bg-white/5 transition-all px-2 py-1 space-y-1" style={{ borderColor: `${ACCENT}11` }}>
                {slotEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="px-3 py-2 cursor-pointer"
                    style={{
                      background: LABELS[evt.label]?.bg || LABELS.other.bg,
                      borderLeft: `3px solid ${LABELS[evt.label]?.color || LABELS.other.color}`,
                    }}
                    onClick={(e) => { e.stopPropagation(); onAddClick(dateStr, evt); }}
                  >
                    <div className="text-[11px] font-medium" style={{ color: LABELS[evt.label]?.color || LABELS.other.color }}>
                      {evt.title}
                    </div>
                    <div className="text-[9px] opacity-60 mt-0.5" style={{ color: LABELS[evt.label]?.color || LABELS.other.color }}>
                      {evt.startTime} – {evt.endTime}
                      {evt.notes && ` · ${evt.notes}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// MAIN CALENDAR PANEL
// ============================================================

export default function CalendarPanel({ isOpen, onClose, externalCommand }) {
  const [view, setView] = useState("month"); // month | week | day
  const [currentDate, setCurrentDate] = useState(today());
  const [selectedDate, setSelectedDate] = useState(today());
  const [events, setEventsState] = useState([]);
  const [kvAvailable, setKvAvailable] = useState(true);
  const [modal, setModal] = useState(null); // null | { date, event? }
  const [loading, setLoading] = useState(false);

  const eventsRef = useRef(events);
  useEffect(() => { eventsRef.current = events; }, [events]);

  // ── Parse current date ───────────────────────────────────────────────────
  const cd = formatDate(currentDate);
  const year = cd.getFullYear();
  const month = cd.getMonth();

  // ── KV / localStorage sync ───────────────────────────────────────────────
  const setEvents = useCallback((evts) => {
    setEventsState(evts);
    lsSave(evts);
  }, []);

  const saveToKV = useCallback(async (action, payload) => {
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (data.events) setEvents(data.events);
      setKvAvailable(data.kvAvailable !== false);
      return data;
    } catch {
      return null;
    }
  }, [setEvents]);

  // ── Load events on mount ─────────────────────────────────────────────────
  useEffect(() => {
    // Instant load from localStorage
    const ls = lsLoad();
    if (ls.length > 0) setEventsState(ls);

    // Then sync from KV
    fetch("/api/calendar")
      .then((r) => r.json())
      .then((data) => {
        if (data.events) {
          setEvents(data.events);
          setKvAvailable(data.kvAvailable !== false);
        }
      })
      .catch(() => setKvAvailable(false));
  }, []);

  // ── External commands from JARVIS ────────────────────────────────────────
  useEffect(() => {
    if (!externalCommand) return;
    const { action, payload } = externalCommand;

    switch (action) {
      case "add_event": {
        const evtData = payload;
        saveToKV("add", evtData).then((data) => {
          if (data?.event && evtData.date) {
            setSelectedDate(evtData.date);
            setCurrentDate(evtData.date);
          }
        });
        break;
      }
      case "delete_event":
        saveToKV("delete", { id: payload.id });
        break;
      case "update_event":
        saveToKV("update", { id: payload.id, changes: payload.changes });
        break;
      case "set_view":
        if (["month", "week", "day"].includes(payload)) setView(payload);
        break;
      case "go_to_date":
        if (payload) { setCurrentDate(payload); setSelectedDate(payload); }
        break;
      default: break;
    }
  }, [externalCommand, saveToKV]);

  // ── ESC to close ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !modal) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, modal]);

  // ── Navigation ───────────────────────────────────────────────────────────
  const navigate = (dir) => {
    const d = formatDate(currentDate);
    if (view === "month") {
      d.setMonth(d.getMonth() + dir);
      setCurrentDate(toDateStr(d));
    } else if (view === "week") {
      setCurrentDate(addDays(currentDate, dir * 7));
    } else {
      setCurrentDate(addDays(currentDate, dir));
    }
  };

  const goToday = () => {
    setCurrentDate(today());
    setSelectedDate(today());
  };

  // ── Modal handlers ───────────────────────────────────────────────────────
  const handleAddClick = useCallback((dateStr, existingEvent = null, prefillTime = null) => {
    setModal({
      date: dateStr,
      event: existingEvent || (prefillTime ? { date: dateStr, startTime: prefillTime, endTime: prefillTime ? `${String(Number(prefillTime.slice(0, 2)) + 1).padStart(2, "0")}:00` : "10:00" } : null),
    });
  }, []);

  const handleSave = useCallback(async (eventData) => {
    setModal(null);
    if (eventData.id) {
      const { id, ...changes } = eventData;
      await saveToKV("update", { id, changes });
    } else {
      await saveToKV("add", eventData);
    }
  }, [saveToKV]);

  const handleDelete = useCallback(async (id) => {
    setModal(null);
    await saveToKV("delete", { id });
  }, [saveToKV]);

  // ── Header label ─────────────────────────────────────────────────────────
  const headerLabel = () => {
    if (view === "month") return `${MONTHS[month]} ${year}`;
    if (view === "week") {
      const ws = startOfWeek(currentDate);
      const we = addDays(ws, 6);
      return `${formatDate(ws).getDate()} – ${formatDate(we).getDate()} ${MONTHS[formatDate(we).getMonth()]} ${year}`;
    }
    const d = formatDate(currentDate);
    return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${year}`;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Full-screen calendar overlay */}
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#020617" }}>

        {/* ── TOP BAR ── */}
        <div className="flex items-center justify-between px-6 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${ACCENT}22`, background: "#020617ee" }}>
          <div className="flex items-center gap-4">
            <span className="text-[10px] tracking-[0.3em]" style={{ color: ACCENT }}>● CALENDAR // JARVIS</span>
            {!kvAvailable && (
              <span className="text-[8px] tracking-[0.15em]" style={{ color: "#FBBF24" }}>⚠ LOCAL ONLY</span>
            )}
          </div>

          {/* View tabs */}
          <div className="flex items-center gap-1">
            {["month", "week", "day"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1 text-[9px] tracking-[0.2em] uppercase transition-all"
                style={{
                  border: `1px solid ${view === v ? ACCENT : `${ACCENT}33`}`,
                  color: view === v ? ACCENT : `${ACCENT}60`,
                  background: view === v ? `${ACCENT}15` : "transparent",
                }}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Nav controls */}
            <div className="flex items-center gap-1">
              <button onClick={() => navigate(-1)} className="w-7 h-7 flex items-center justify-center text-[11px] transition-all" style={{ border: `1px solid ${ACCENT}33`, color: `${ACCENT}88` }}>◀</button>
              <button onClick={goToday} className="px-3 py-1 text-[9px] tracking-[0.15em] transition-all" style={{ border: `1px solid ${ACCENT}33`, color: `${ACCENT}88` }}>TODAY</button>
              <button onClick={() => navigate(1)} className="w-7 h-7 flex items-center justify-center text-[11px] transition-all" style={{ border: `1px solid ${ACCENT}33`, color: `${ACCENT}88` }}>▶</button>
            </div>

            {/* Current period */}
            <span className="text-[11px] tracking-[0.15em] font-light min-w-48 text-center" style={{ color: ACCENT }}>
              {headerLabel()}
            </span>

            {/* Add event */}
            <button
              onClick={() => handleAddClick(selectedDate)}
              className="px-4 py-1.5 text-[9px] tracking-[0.2em] transition-all"
              style={{ border: `1px solid ${ACCENT}`, color: ACCENT, background: `${ACCENT}15`, boxShadow: `0 0 12px ${ACCENT}30` }}
            >
              + EVENT
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 text-[10px] tracking-[0.25em] transition-all"
              style={{ border: "1px solid #FB7185", color: "#FB7185", background: "#FB718515" }}
            >
              ✕ CLOSE
            </button>
          </div>
        </div>

        {/* ── LEGEND ── */}
        <div className="flex items-center gap-3 px-6 py-2 flex-shrink-0" style={{ borderBottom: `1px solid ${ACCENT}11` }}>
          {Object.entries(LABELS).map(([key, val]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: val.color, boxShadow: `0 0 4px ${val.color}` }} />
              <span className="text-[8px] tracking-[0.15em]" style={{ color: `${val.color}99` }}>{val.label}</span>
            </div>
          ))}
          <div className="ml-auto text-[8px] tracking-[0.15em] opacity-40" style={{ color: ACCENT }}>
            {events.length} EVENT{events.length !== 1 ? "S" : ""}
          </div>
        </div>

        {/* ── CALENDAR BODY ── */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {view === "month" && (
            <MonthView
              year={year}
              month={month}
              events={events}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onAddClick={handleAddClick}
            />
          )}
          {view === "week" && (
            <WeekView
              weekStart={startOfWeek(currentDate)}
              events={events}
              onAddClick={handleAddClick}
            />
          )}
          {view === "day" && (
            <DayView
              dateStr={currentDate}
              events={events}
              onAddClick={handleAddClick}
            />
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="flex-shrink-0 px-6 py-2 flex items-center justify-between" style={{ borderTop: `1px solid ${ACCENT}11` }}>
          <span className="text-[8px] tracking-[0.2em] opacity-40" style={{ color: ACCENT }}>
            CLICK ANY DAY OR TIME SLOT TO ADD EVENT · ESC TO CLOSE
          </span>
          <span className="text-[8px] tracking-[0.2em] opacity-40" style={{ color: ACCENT }}>
            JARVIS CALENDAR · KV SYNCED
          </span>
        </div>
      </div>

      {/* ── EVENT MODAL ── */}
      {modal && (
        <EventModal
          initial={modal.event || { date: modal.date }}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

// ============================================================
// TOOL EXECUTOR HELPER
// ============================================================

export function buildCalendarCommand(toolName, input) {
  switch (toolName) {
    case "open_calendar":
      return { action: "set_view", payload: input.view || "month" };
    case "add_calendar_event":
      return {
        action: "add_event",
        payload: {
          title: input.title,
          date: input.date,
          startTime: input.startTime || "09:00",
          endTime: input.endTime || "10:00",
          label: input.label || "work",
          notes: input.notes || "",
        },
      };
    case "delete_calendar_event":
      return { action: "delete_event", payload: { id: input.id } };
    case "update_calendar_event":
      return { action: "update_event", payload: { id: input.id, changes: input.changes } };
    case "go_to_date":
      return { action: "go_to_date", payload: input.date };
    default:
      return null;
  }
}
