import { useState, useEffect, useRef, useCallback } from "react";

const ACCENT = "#7DD3FC";
const ACCENT_DIM = "#7DD3FC33";

const LABELS = {
  work:     { color: "#67E8F9", bg: "#67E8F915", label: "WORK" },
  personal: { color: "#A78BFA", bg: "#A78BFA15", label: "PERSONAL" },
  health:   { color: "#34D399", bg: "#34D39915", label: "HEALTH" },
  finance:  { color: "#FBBF24", bg: "#FBBF2415", label: "FINANCE" },
  travel:   { color: "#FB923C", bg: "#FB923C15", label: "TRAVEL" },
  other:    { color: "#94A3B8", bg: "#94A3B815", label: "OTHER" },
};

const DAYS = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
const MONTHS = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function genId() { return `evt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`; }
function toISODate(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function parseISODate(s) { const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); }
function formatTime(t) { if(!t) return ""; const [h,m]=t.split(":").map(Number); const ap=h>=12?"PM":"AM"; const hr=h%12||12; return `${hr}:${String(m).padStart(2,"0")} ${ap}`; }
function isSameDay(a,b) { return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }

const LS_KEY = "jarvis_calendar_events";
function lsLoad() { try { const r=localStorage.getItem(LS_KEY); return r?JSON.parse(r):[]; } catch { return []; } }
function lsSave(e) { try { localStorage.setItem(LS_KEY,JSON.stringify(e)); } catch {} }
async function kvLoad() { try { const r=await fetch("/api/calendar"); if(!r.ok) return null; return r.json(); } catch { return null; } }
async function kvAdd(event) { try { await fetch("/api/calendar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"add",event})}); } catch {} }
async function kvDel(id) { try { await fetch(`/api/calendar?id=${id}`,{method:"DELETE"}); } catch {} }

function Brackets() {
  return <>
    {["top-0 left-0 border-t border-l","top-0 right-0 border-t border-r","bottom-0 left-0 border-b border-l","bottom-0 right-0 border-b border-r"].map((cls,i)=>(
      <div key={i} className={`absolute w-3 h-3 ${cls}`} style={{borderColor:ACCENT}}/>
    ))}
  </>;
}

function EventModal({initialDate,initialTime,event,onSave,onDelete,onClose}) {
  const isEdit=!!event;
  const [title,setTitle]=useState(event?.title||"");
  const [date,setDate]=useState(event?.date||(initialDate?toISODate(initialDate):toISODate(new Date())));
  const [startTime,setStartTime]=useState(event?.startTime||initialTime||"");
  const [endTime,setEndTime]=useState(event?.endTime||"");
  const [label,setLabel]=useState(event?.label||"work");
  const [notes,setNotes]=useState(event?.notes||"");
  const [allDay,setAllDay]=useState(event?.allDay!==false&&!event?.startTime);

  const handleSave=()=>{
    if(!title.trim()) return;
    onSave({id:event?.id||genId(),title:title.trim(),date,startTime:allDay?null:(startTime||null),endTime:allDay?null:(endTime||null),label,notes,allDay,createdAt:event?.createdAt||Date.now()});
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{background:"#00000088"}} onClick={onClose}>
      <div className="relative w-full max-w-md p-6 mx-4" style={{background:"#060B14",border:`1px solid ${ACCENT}44`}} onClick={e=>e.stopPropagation()}>
        <Brackets/>
        <div className="text-[11px] tracking-[0.3em] mb-5" style={{color:ACCENT}}>{isEdit?"EDIT EVENT":"NEW EVENT"}</div>
        <div className="mb-4">
          <label className="text-[9px] tracking-[0.2em] opacity-60 block mb-1" style={{color:ACCENT}}>TITLE</label>
          <input autoFocus value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSave()}
            className="w-full px-3 py-2 text-sm bg-transparent outline-none" placeholder="Event title…"
            style={{border:`1px solid ${ACCENT}44`,color:"#E2E8F0",caretColor:ACCENT}}/>
        </div>
        <div className="mb-4">
          <label className="text-[9px] tracking-[0.2em] opacity-60 block mb-1" style={{color:ACCENT}}>DATE</label>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-transparent outline-none"
            style={{border:`1px solid ${ACCENT}44`,color:"#E2E8F0",colorScheme:"dark"}}/>
        </div>
        <div className="mb-4 flex items-center gap-3">
          <button onClick={()=>setAllDay(!allDay)} className="w-8 h-4 rounded-full transition-all relative" style={{background:allDay?ACCENT:`${ACCENT}30`}}>
            <span className="absolute top-0.5 w-3 h-3 rounded-full bg-slate-900 transition-all" style={{left:allDay?"18px":"2px"}}/>
          </button>
          <span className="text-[10px] tracking-[0.15em] opacity-70" style={{color:ACCENT}}>ALL DAY</span>
        </div>
        {!allDay&&(
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] tracking-[0.2em] opacity-60 block mb-1" style={{color:ACCENT}}>START</label>
              <input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-transparent outline-none"
                style={{border:`1px solid ${ACCENT}44`,color:"#E2E8F0",colorScheme:"dark"}}/>
            </div>
            <div>
              <label className="text-[9px] tracking-[0.2em] opacity-60 block mb-1" style={{color:ACCENT}}>END</label>
              <input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-transparent outline-none"
                style={{border:`1px solid ${ACCENT}44`,color:"#E2E8F0",colorScheme:"dark"}}/>
            </div>
          </div>
        )}
        <div className="mb-4">
          <label className="text-[9px] tracking-[0.2em] opacity-60 block mb-2" style={{color:ACCENT}}>LABEL</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(LABELS).map(([key,{color,label:lbl}])=>(
              <button key={key} onClick={()=>setLabel(key)} className="px-2 py-1 text-[8px] tracking-[0.15em] transition-all"
                style={{border:`1px solid ${color}${label===key?"ff":"44"}`,color:label===key?color:`${color}88`,background:label===key?`${color}20`:"transparent"}}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-5">
          <label className="text-[9px] tracking-[0.2em] opacity-60 block mb-1" style={{color:ACCENT}}>NOTES</label>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2}
            className="w-full px-3 py-2 text-sm bg-transparent outline-none resize-none" placeholder="Optional notes…"
            style={{border:`1px solid ${ACCENT}44`,color:"#E2E8F0"}}/>
        </div>
        <div className="flex gap-3 justify-between">
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 text-[10px] tracking-[0.2em] uppercase transition-all"
              style={{border:`1px solid ${ACCENT}`,color:ACCENT,background:`${ACCENT}15`}}>{isEdit?"UPDATE":"SAVE"}</button>
            <button onClick={onClose} className="px-4 py-2 text-[10px] tracking-[0.2em] uppercase"
              style={{border:"1px solid #64748B44",color:"#64748B"}}>CANCEL</button>
          </div>
          {isEdit&&<button onClick={()=>onDelete(event.id)} className="px-4 py-2 text-[10px] tracking-[0.2em] uppercase"
            style={{border:"1px solid #FB718544",color:"#FB7185"}}>DELETE</button>}
        </div>
      </div>
    </div>
  );
}

function MonthView({year,month,events,today,selectedDate,onDayClick,onEventClick}) {
  const firstDay=new Date(year,month,1).getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const daysInPrev=new Date(year,month,0).getDate();
  const cells=[];
  for(let i=firstDay-1;i>=0;i--) cells.push({day:daysInPrev-i,cur:false,date:new Date(year,month-1,daysInPrev-i)});
  for(let d=1;d<=daysInMonth;d++) cells.push({day:d,cur:true,date:new Date(year,month,d)});
  let nx=1; while(cells.length%7!==0) cells.push({day:nx++,cur:false,date:new Date(year,month+1,nx-1)});
  return (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-7 border-b" style={{borderColor:ACCENT_DIM}}>
        {DAYS.map(d=><div key={d} className="py-2 text-center text-[9px] tracking-[0.2em] opacity-50" style={{color:ACCENT}}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7" style={{gridAutoRows:"minmax(80px,1fr)"}}>
        {cells.map((cell,i)=>{
          const ds=toISODate(cell.date);
          const dayEvts=events.filter(e=>e.date===ds);
          const isToday=isSameDay(cell.date,today);
          const isSel=selectedDate&&isSameDay(cell.date,selectedDate);
          return (
            <div key={i} onClick={()=>onDayClick(cell.date)} className="border-b border-r p-1 cursor-pointer transition-all"
              style={{borderColor:ACCENT_DIM,background:isSel?`${ACCENT}10`:isToday?`${ACCENT}08`:"transparent",opacity:cell.cur?1:0.3}}>
              <div className="flex items-center justify-center w-6 h-6 mb-1" style={{background:isToday?ACCENT:"transparent",borderRadius:"50%"}}>
                <span className="text-[11px] font-light tabular-nums" style={{color:isToday?"#020617":ACCENT}}>{cell.day}</span>
              </div>
              <div className="space-y-0.5">
                {dayEvts.slice(0,3).map(evt=>{
                  const lbl=LABELS[evt.label]||LABELS.other;
                  return <div key={evt.id} onClick={e=>{e.stopPropagation();onEventClick(evt);}}
                    className="px-1 py-0.5 text-[8px] truncate cursor-pointer rounded-sm"
                    style={{background:lbl.bg,color:lbl.color,border:`1px solid ${lbl.color}44`}}>
                    {!evt.allDay&&evt.startTime?`${formatTime(evt.startTime)} `:""}{evt.title}
                  </div>;
                })}
                {dayEvts.length>3&&<div className="text-[7px] opacity-50 px-1" style={{color:ACCENT}}>+{dayEvts.length-3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({weekStart,events,today,onSlotClick,onEventClick}) {
  const days=Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(weekStart.getDate()+i);return d;});
  return (
    <div className="flex-1 overflow-auto">
      <div className="grid sticky top-0 z-10" style={{gridTemplateColumns:"48px repeat(7,1fr)",background:"#060B14",borderBottom:`1px solid ${ACCENT_DIM}`}}>
        <div/>
        {days.map((d,i)=>{
          const isToday=isSameDay(d,today);
          return <div key={i} className="py-2 text-center border-l" style={{borderColor:ACCENT_DIM}}>
            <div className="text-[9px] tracking-[0.15em] opacity-50" style={{color:ACCENT}}>{DAYS[d.getDay()]}</div>
            <div className="flex items-center justify-center w-6 h-6 mx-auto mt-0.5" style={{background:isToday?ACCENT:"transparent",borderRadius:"50%"}}>
              <span className="text-[11px]" style={{color:isToday?"#020617":ACCENT}}>{d.getDate()}</span>
            </div>
          </div>;
        })}
      </div>
      {HOURS.map(hour=>(
        <div key={hour} className="grid" style={{gridTemplateColumns:"48px repeat(7,1fr)",minHeight:"48px"}}>
          <div className="text-[8px] tabular-nums opacity-40 pt-1 pr-2 text-right" style={{color:ACCENT}}>
            {hour===0?"12AM":hour<12?`${hour}AM`:hour===12?"12PM":`${hour-12}PM`}
          </div>
          {days.map((d,di)=>{
            const ds=toISODate(d);
            const slotEvts=events.filter(e=>{
              if(e.date!==ds) return false;
              if(e.allDay) return hour===0;
              return e.startTime?parseInt(e.startTime.split(":")[0])===hour:false;
            });
            return <div key={di} onClick={()=>onSlotClick(d,`${String(hour).padStart(2,"0")}:00`)}
              className="border-l border-b cursor-pointer hover:bg-blue-950/20 relative" style={{borderColor:ACCENT_DIM}}>
              {slotEvts.map(evt=>{
                const lbl=LABELS[evt.label]||LABELS.other;
                return <div key={evt.id} onClick={e=>{e.stopPropagation();onEventClick(evt);}}
                  className="absolute inset-x-0.5 top-0.5 px-1 py-0.5 text-[8px] truncate cursor-pointer rounded-sm"
                  style={{background:lbl.bg,color:lbl.color,border:`1px solid ${lbl.color}44`,zIndex:1}}>{evt.title}</div>;
              })}
            </div>;
          })}
        </div>
      ))}
    </div>
  );
}

function DayView({date,events,today,onSlotClick,onEventClick}) {
  const ds=toISODate(date);
  const dayEvts=events.filter(e=>e.date===ds);
  const isToday=isSameDay(date,today);
  return (
    <div className="flex-1 overflow-auto">
      <div className="px-4 py-3 border-b text-center" style={{borderColor:ACCENT_DIM}}>
        <div className="text-[10px] tracking-[0.25em] opacity-60" style={{color:ACCENT}}>{DAYS[date.getDay()]}</div>
        <div className="text-3xl font-light mt-1" style={{color:isToday?ACCENT:"#E2E8F0"}}>{date.getDate()}</div>
        <div className="text-[10px] tracking-[0.2em] opacity-50 mt-0.5" style={{color:ACCENT}}>{MONTHS[date.getMonth()]} {date.getFullYear()}</div>
      </div>
      {dayEvts.filter(e=>e.allDay).length>0&&(
        <div className="px-4 py-2 border-b" style={{borderColor:ACCENT_DIM}}>
          <div className="text-[8px] tracking-[0.2em] opacity-40 mb-1" style={{color:ACCENT}}>ALL DAY</div>
          {dayEvts.filter(e=>e.allDay).map(evt=>{
            const lbl=LABELS[evt.label]||LABELS.other;
            return <div key={evt.id} onClick={()=>onEventClick(evt)} className="px-2 py-1.5 mb-1 text-[11px] cursor-pointer rounded-sm"
              style={{background:lbl.bg,color:lbl.color,border:`1px solid ${lbl.color}44`}}>{evt.title}</div>;
          })}
        </div>
      )}
      {HOURS.map(hour=>{
        const slotEvts=dayEvts.filter(e=>!e.allDay&&e.startTime&&parseInt(e.startTime.split(":")[0])===hour);
        const isCurHour=isToday&&new Date().getHours()===hour;
        return <div key={hour} onClick={()=>onSlotClick(date,`${String(hour).padStart(2,"0")}:00`)}
          className="flex border-b cursor-pointer hover:bg-blue-950/20 transition-all relative" style={{borderColor:ACCENT_DIM,minHeight:"56px"}}>
          <div className="w-16 text-[8px] tabular-nums opacity-40 pt-1 px-2 text-right flex-shrink-0" style={{color:ACCENT}}>
            {hour===0?"12 AM":hour<12?`${hour} AM`:hour===12?"12 PM":`${hour-12} PM`}
          </div>
          <div className="flex-1 px-2 py-1 relative">
            {isCurHour&&<div className="absolute left-0 right-0 top-0 h-px" style={{background:"#FB7185"}}/>}
            {slotEvts.map(evt=>{
              const lbl=LABELS[evt.label]||LABELS.other;
              return <div key={evt.id} onClick={e=>{e.stopPropagation();onEventClick(evt);}}
                className="px-2 py-1.5 mb-0.5 text-[11px] cursor-pointer rounded-sm"
                style={{background:lbl.bg,color:lbl.color,border:`1px solid ${lbl.color}44`}}>
                <div className="font-medium">{evt.title}</div>
                {evt.startTime&&<div className="text-[8px] opacity-70 mt-0.5">{formatTime(evt.startTime)}{evt.endTime?` → ${formatTime(evt.endTime)}`:""}</div>}
                {evt.notes&&<div className="text-[8px] opacity-60 mt-0.5 truncate">{evt.notes}</div>}
              </div>;
            })}
          </div>
        </div>;
      })}
    </div>
  );
}

export default function CalendarPanel({isOpen,onClose,externalCommand}) {
  const today=new Date();
  const [view,setView]=useState("month");
  const [currentDate,setCurrentDate]=useState(new Date(today.getFullYear(),today.getMonth(),1));
  const [selectedDate,setSelectedDate]=useState(today);
  const [events,setEventsState]=useState([]);
  const [kvAvailable,setKvAvailable]=useState(true);
  const [modal,setModal]=useState(null);
  const [loaded,setLoaded]=useState(false);
  const eventsRef=useRef(events);
  useEffect(()=>{eventsRef.current=events;},[events]);

  const setEvents=useCallback((evts)=>{setEventsState(evts);eventsRef.current=evts;lsSave(evts);},[]);

  useEffect(()=>{
    const ls=lsLoad();
    if(ls.length>0) setEventsState(ls);
    kvLoad().then(data=>{
      if(data){setKvAvailable(data.kvAvailable!==false);const m=data.events||ls;setEventsState(m);eventsRef.current=m;lsSave(m);}
      setLoaded(true);
    });
  },[]);

  useEffect(()=>{
    if(!externalCommand) return;
    const{action,payload}=externalCommand;
    if(action==="add_event"){
      const updated=[...eventsRef.current,payload].sort((a,b)=>a.date.localeCompare(b.date));
      setEvents(updated);kvAdd(payload);
      const d=parseISODate(payload.date);
      setCurrentDate(new Date(d.getFullYear(),d.getMonth(),1));setSelectedDate(d);
    } else if(action==="delete_event"){
      const updated=eventsRef.current.filter(e=>!e.title.toLowerCase().includes((payload.title||"").toLowerCase()));
      setEvents(updated);
    } else if(action==="set_view"){
      setView(payload.view||"month");
    } else if(action==="navigate"){
      const d=new Date(currentDate);
      const dir=payload.direction==="next"?1:-1;
      if(view==="month") d.setMonth(d.getMonth()+dir);
      else if(view==="week") d.setDate(d.getDate()+dir*7);
      else d.setDate(d.getDate()+dir);
      setCurrentDate(d);
    }
  },[externalCommand]);

  const navigate=(dir)=>{
    const d=new Date(currentDate);
    if(view==="month") d.setMonth(d.getMonth()+dir);
    else if(view==="week") d.setDate(d.getDate()+dir*7);
    else d.setDate(d.getDate()+dir);
    setCurrentDate(d);
  };

  const handleSave=(event)=>{
    const idx=eventsRef.current.findIndex(e=>e.id===event.id);
    let updated;
    if(idx>=0){updated=[...eventsRef.current];updated[idx]=event;}
    else updated=[...eventsRef.current,event];
    updated.sort((a,b)=>a.date.localeCompare(b.date)||(a.startTime||"").localeCompare(b.startTime||""));
    setEvents(updated);kvAdd(event);setModal(null);
  };

  const handleDelete=(id)=>{
    setEvents(eventsRef.current.filter(e=>e.id!==id));kvDel(id);setModal(null);
  };

  useEffect(()=>{
    const onKey=(e)=>{if(e.key==="Escape"&&!modal) onClose();};
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[modal,onClose]);

  if(!isOpen) return null;

  const year=currentDate.getFullYear(),month=currentDate.getMonth();
  const weekStart=new Date(currentDate);
  weekStart.setDate(currentDate.getDate()-currentDate.getDay());
  const headerLabel=view==="month"?`${MONTHS[month]} ${year}`:
    view==="week"?`${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()} – ${weekStart.getDate()+6}, ${weekStart.getFullYear()}`:
    `${DAYS[selectedDate.getDay()]} ${MONTHS[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`;

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col" style={{background:"#060B14"}}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 flex-shrink-0"
          style={{borderBottom:`1px solid ${ACCENT_DIM}`,background:"#060B14EE"}}>
          <div className="flex items-center gap-4">
            <span className="text-[10px] tracking-[0.3em]" style={{color:ACCENT}}>● CALENDAR // JARVIS</span>
            {!kvAvailable&&<span className="text-[8px] opacity-50" style={{color:"#FBBF24"}}>⚠ LOCAL ONLY</span>}
          </div>
          <div className="flex items-center gap-1">
            {["month","week","day"].map(v=>(
              <button key={v} onClick={()=>{setView(v);if(v==="day") setCurrentDate(new Date(selectedDate));}}
                className="px-3 py-1.5 text-[9px] tracking-[0.2em] uppercase transition-all"
                style={{border:`1px solid ${view===v?ACCENT:ACCENT_DIM}`,color:view===v?ACCENT:`${ACCENT}60`,background:view===v?`${ACCENT}15`:"transparent"}}>
                {v}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="px-4 py-1.5 text-[10px] tracking-[0.25em] uppercase"
            style={{border:"1px solid #FB718544",color:"#FB7185"}}>✕ CLOSE</button>
        </div>
        {/* Nav bar */}
        <div className="flex items-center justify-between px-6 py-2 flex-shrink-0" style={{borderBottom:`1px solid ${ACCENT_DIM}`}}>
          <div className="flex items-center gap-3">
            <button onClick={()=>navigate(-1)} className="w-7 h-7 flex items-center justify-center"
              style={{border:`1px solid ${ACCENT_DIM}`,color:ACCENT}}>◀</button>
            <button onClick={()=>navigate(1)} className="w-7 h-7 flex items-center justify-center"
              style={{border:`1px solid ${ACCENT_DIM}`,color:ACCENT}}>▶</button>
            <button onClick={()=>{setCurrentDate(new Date(today.getFullYear(),today.getMonth(),1));setSelectedDate(today);}}
              className="px-3 py-1 text-[9px] tracking-[0.2em] uppercase"
              style={{border:`1px solid ${ACCENT_DIM}`,color:`${ACCENT}80`}}>TODAY</button>
          </div>
          <span className="text-[12px] tracking-[0.2em] font-light" style={{color:ACCENT}}>{headerLabel}</span>
          <button onClick={()=>setModal({mode:"add",date:selectedDate,time:null})}
            className="px-4 py-1.5 text-[9px] tracking-[0.2em] uppercase"
            style={{border:`1px solid ${ACCENT}`,color:ACCENT,background:`${ACCENT}15`}}>+ ADD EVENT</button>
        </div>
        {/* Views */}
        {view==="month"&&<MonthView year={year} month={month} events={events} today={today} selectedDate={selectedDate}
          onDayClick={d=>{setSelectedDate(d);setModal({mode:"add",date:d,time:null});}} onEventClick={e=>setModal({mode:"edit",event:e})}/>}
        {view==="week"&&<WeekView weekStart={weekStart} events={events} today={today}
          onSlotClick={(d,t)=>{setSelectedDate(d);setModal({mode:"add",date:d,time:t});}} onEventClick={e=>setModal({mode:"edit",event:e})}/>}
        {view==="day"&&<DayView date={selectedDate} events={events} today={today}
          onSlotClick={(d,t)=>{setSelectedDate(d);setModal({mode:"add",date:d,time:t});}} onEventClick={e=>setModal({mode:"edit",event:e})}/>}
        {/* Legend */}
        <div className="flex items-center gap-4 px-6 py-2 flex-shrink-0" style={{borderTop:`1px solid ${ACCENT_DIM}`}}>
          {Object.entries(LABELS).map(([k,{color,label}])=>(
            <div key={k} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{background:color}}/>
              <span className="text-[8px] tracking-[0.1em] opacity-60" style={{color}}>{label}</span>
            </div>
          ))}
          <div className="ml-auto text-[8px] tracking-[0.15em] opacity-40" style={{color:ACCENT}}>ESC TO CLOSE · CLICK TO ADD</div>
        </div>
      </div>
      {modal&&<EventModal initialDate={modal.date} initialTime={modal.time}
        event={modal.mode==="edit"?modal.event:null}
        onSave={handleSave} onDelete={handleDelete} onClose={()=>setModal(null)}/>}
    </>
  );
}

export function buildCalendarCommand(toolName, input) {
  switch(toolName) {
    case "open_calendar": return {action:"set_view", payload:input.view||"month"};
    case "add_calendar_event": return {action:"add_event", payload:{title:input.title, date:input.date, startTime:input.startTime, endTime:input.endTime, label:input.label||"work", notes:input.notes||"", allDay:input.allDay||false}};
    case "delete_calendar_event": return {action:"delete_event", payload:{id:input.id}};
    case "navigate_calendar": return {action:"go_to_date", payload:input.date};
    default: return null;
  }
}

export function getEventsForTool(events, dateRange) {
  if(!dateRange) return events;
  const {start, end} = dateRange;
  return events.filter(e => {
    if(start && e.date < start) return false;
    if(end && e.date > end) return false;
    return true;
  });
}
