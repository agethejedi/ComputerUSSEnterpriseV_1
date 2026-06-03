// JarvisSphere.jsx — V8 Orbital Sphere with full Orchestrator Mode
// ALL rendering happens on canvas — no DOM coordinate bridging.
// Project boxes are drawn on canvas so neurons connect perfectly.
//
// Props:
//   mode:       "idle" | "listening" | "thinking" | "speaking"
//   sphereMode: "briefing" | "orchestrator"
//
// Ref methods (via forwardRef):
//   toggleProject(key)         — activate/deactivate neuron stream
//   focusProject(key, secs)    — activate, auto-fade after secs
//   toggleMem(id)              — activate/deactivate memory hex
//   focusMem(id, secs)         — activate, auto-fade after secs
//   clearFocus()               — deactivate all
//   activateAllMem()           — light up all 8 hexagons

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

// ── State config ──────────────────────────────────────────────────────────────
const STATES = {
  standby:   { col:[59,130,246],  core:[147,197,253], glow:[29,78,216],   spd:0.18, ringOp:0.18, pulse:0.4,  coreR:11 },
  listening: { col:[34,211,238],  core:[255,255,255], glow:[6,182,212],   spd:0.55, ringOp:0.30, pulse:1.2,  coreR:13 },
  thinking:  { col:[251,191,36],  core:[253,230,138], glow:[217,119,6],   spd:0.95, ringOp:0.40, pulse:1.8,  coreR:15 },
  speaking:  { col:[167,139,250], core:[255,255,255], glow:[124,58,237],  spd:0.75, ringOp:0.45, pulse:2.2,  coreR:13 },
  doing:     { col:[74,222,128],  core:[134,239,172], glow:[22,163,74],   spd:1.30, ringOp:0.55, pulse:2.8,  coreR:12 },
};

function modeToState(m) {
  const map = { listening:"listening", thinking:"thinking", speaking:"speaking" };
  return map[m] || "standby";
}

// ── Memory modules ────────────────────────────────────────────────────────────
const MEM_MODULES = [
  { id:"m1", label:"M1", name:"Principal",    col:[245,240,232] },
  { id:"m2", label:"M2", name:"Identity",     col:[96,165,250]  },
  { id:"m3", label:"M3", name:"Philosophy",   col:[167,139,250] },
  { id:"m4", label:"M4", name:"Portfolio",    col:[251,146,60]  },
  { id:"m5", label:"M5", name:"Institutional",col:[45,212,191]  },
  { id:"m6", label:"M6", name:"Sessions",     col:[251,113,133] },
  { id:"m7", label:"M7", name:"Tania",        col:[201,168,76]  },
  { id:"m8", label:"M8", name:"Capabilities", col:[132,204,22]  },
];

// Project definitions — position as fraction of canvas (cx-relative)
// dx/dy = offset from center in units of sphere radius
const PROJ_DEFS = {
  tania:     { col:[201,168,76],  label:"Taste of Tania", sub:"Agent · Active",   active:true,  dx:-1.55, dy:-1.65, neuronCount:7 },
  kaso:      { col:[59,130,246],  label:"KASO",           sub:"RiskxLabs · Active",active:true,  dx: 1.55, dy:-1.65, neuronCount:7 },
  mcm:       { col:[42,58,80],    label:"MCM",            sub:"Inactive",          active:false, dx:-1.80, dy: 0.10, neuronCount:3 },
  xwallet:   { col:[42,58,80],    label:"Xwallet",        sub:"Inactive",          active:false, dx: 1.80, dy: 0.10, neuronCount:3 },
  vision:    { col:[42,58,80],    label:"Vision",         sub:"Inactive",          active:false, dx:-1.55, dy: 1.65, neuronCount:3 },
  riskxlabs: { col:[239,68,68],   label:"RiskxLabs",      sub:"Parent · Active",   active:true,  dx: 1.55, dy: 1.65, neuronCount:6 },
};

// Box dimensions in pixels
const BOX_W = 110, BOX_H = 42;

// ── Neuron class ──────────────────────────────────────────────────────────────
class Neuron {
  constructor(colStr, branchIdx, total) {
    this.colStr    = colStr;
    this.sway1     = Math.random() * Math.PI * 2;
    this.sway2     = Math.random() * Math.PI * 2;
    this.swayAmp   = 0.06 + Math.random() * 0.10;
    this.swaySpd   = 0.005 + Math.random() * 0.005;
    // Spread filament endpoint across the near edge of the target box
    this.edgeT     = (branchIdx / Math.max(total - 1, 1)) - 0.5; // -0.5 to 0.5
    // Flowing nodes
    const n = 5 + Math.floor(Math.random() * 5);
    this.nodes = Array.from({ length: n }, (_, i) => ({
      t:   (i / n + Math.random() * 0.1) % 1,
      sz:  1.0 + Math.random() * 1.8,
      op:  0.5 + Math.random() * 0.5,
      spd: 0.004 + Math.random() * 0.008,
    }));
  }

  draw(ctx, ox, oy, tx, ty, tw, th, t, globalOp) {
    if (globalOp < 0.01) return;
    const col = this.colStr;

    // Direction from sphere center (ox,oy) to box center (tx,ty)
    const angle  = Math.atan2(ty - oy, tx - ox);
    const cosA   = Math.cos(angle), sinA = Math.sin(angle);

    // Arrival: point on near edge of box, spread by edgeT
    // Near edge is the one facing the sphere
    const hw = tw / 2, hh = th / 2;
    const scX = hw / (Math.abs(cosA) || 0.001);
    const scY = hh / (Math.abs(sinA) || 0.001);
    const edgeScale = Math.min(scX, scY);
    // Wall contact
    const wallX = tx - cosA * edgeScale;
    const wallY = ty - sinA * edgeScale;
    // Tangent spread along wall
    const tangX = -sinA, tangY = cosA;
    const spread = edgeScale * this.edgeT * 0.85;
    const ex = wallX + tangX * spread;
    const ey = wallY + tangY * spread;

    // Origin: behind sphere center (opposite direction from target)
    const dist  = Math.sqrt((tx - ox) ** 2 + (ty - oy) ** 2);
    const originR = dist * 0.08;
    const originAngle = angle + Math.PI;
    const startX = ox + Math.cos(originAngle) * originR;
    const startY = oy + Math.sin(originAngle) * originR;

    // Sway control points
    const s1 = Math.sin(t * this.swaySpd * 60 + this.sway1) * this.swayAmp * dist;
    const s2 = Math.sin(t * this.swaySpd * 40 + this.sway2) * this.swayAmp * dist * 0.5;
    const px  = angle + Math.PI / 2;
    const cp1x = ox + Math.cos(angle) * dist * 0.3 + Math.cos(px) * s1;
    const cp1y = oy + Math.sin(angle) * dist * 0.3 + Math.sin(px) * s1;
    const cp2x = ox + Math.cos(angle) * dist * 0.7 + Math.cos(px) * s2;
    const cp2y = oy + Math.sin(angle) * dist * 0.7 + Math.sin(px) * s2;

    const EMERGE = 0.30; // invisible inside sphere

    // Filament
    const grad = ctx.createLinearGradient(startX, startY, ex, ey);
    const lop  = globalOp * 0.45;
    grad.addColorStop(0,       `rgba(${col},0)`);
    grad.addColorStop(EMERGE,  `rgba(${col},${lop})`);
    grad.addColorStop(0.80,    `rgba(${col},${lop * 0.75})`);
    grad.addColorStop(0.95,    `rgba(${col},${lop * 1.4})`);
    grad.addColorStop(1,       `rgba(${col},${lop})`);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ex, ey);
    ctx.strokeStyle = grad;
    ctx.lineWidth   = 0.7 + globalOp * 0.7;
    ctx.stroke();

    // Arrival glow at box edge
    const ag = ctx.createRadialGradient(ex, ey, 0, ex, ey, 12);
    ag.addColorStop(0, `rgba(${col},${globalOp * 0.55})`);
    ag.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = ag;
    ctx.beginPath(); ctx.arc(ex, ey, 12, 0, Math.PI * 2); ctx.fill();

    // Flowing nodes — steady stream along the bezier
    this.nodes.forEach(node => {
      node.t = (node.t + node.spd) % 1;
      const bt = node.t;
      // Cubic bezier point
      const bx = (1-bt)**3*startX + 3*(1-bt)**2*bt*cp1x + 3*(1-bt)*bt**2*cp2x + bt**3*ex;
      const by = (1-bt)**3*startY + 3*(1-bt)**2*bt*cp1y + 3*(1-bt)*bt**2*cp2y + bt**3*ey;
      // Fade in as particle leaves sphere, pulse bright on arrival
      const emerge  = Math.max(0, Math.min(1, (bt - EMERGE) / 0.09));
      const arrival = bt > 0.88 ? 1 + (bt - 0.88) / 0.12 * 2.5 : 1;
      const pOp     = globalOp * node.op * emerge * arrival;
      if (pOp < 0.01) return;
      const sz = node.sz * (0.35 + 0.65 * emerge) * Math.min(arrival, 2);
      // Glow halo
      const gr = ctx.createRadialGradient(bx, by, 0, bx, by, sz * 4.5);
      gr.addColorStop(0, `rgba(${col},${pOp * 0.5})`);
      gr.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(bx, by, sz * 4.5, 0, Math.PI * 2); ctx.fill();
      // Dot
      ctx.fillStyle = `rgba(${col},${pOp})`;
      ctx.beginPath(); ctx.arc(bx, by, sz, 0, Math.PI * 2); ctx.fill();
      // Bright core
      ctx.fillStyle = `rgba(255,255,255,${pOp * 0.65})`;
      ctx.beginPath(); ctx.arc(bx, by, sz * 0.3, 0, Math.PI * 2); ctx.fill();
    });
  }
}

// ── Ring class ────────────────────────────────────────────────────────────────
class Ring {
  constructor(rf, tX, tY, tZ, nc, sm, ph) {
    this.rf=rf; this.tX=tX; this.tY=tY; this.tZ=tZ;
    this.spdMult=sm; this.angle=ph;
    this.nodes = Array.from({ length: Math.ceil(nc*1.2) }, () => ({
      offset: Math.random()*Math.PI*2,
      size:   1.0+Math.random()*2.2,
      bright: 0.45+Math.random()*0.55,
      phase:  Math.random()*Math.PI*2,
    }));
  }
  project(theta, cx, cy, R) {
    const px=Math.cos(theta)*this.rf*R, py=Math.sin(theta)*this.rf*R*0.52;
    const cX=Math.cos(this.tX),sX=Math.sin(this.tX);
    let x1=px,y1=py*cX,z1=py*sX;
    const cY=Math.cos(this.tY),sY=Math.sin(this.tY);
    let x2=x1*cY+z1*sY,y2=y1,z2=-x1*sY+z1*cY;
    const cZ=Math.cos(this.tZ),sZ=Math.sin(this.tZ);
    let x3=x2*cZ-y2*sZ,y3=x2*sZ+y2*cZ,z3=z2;
    const fov=480,zd=z3+fov,sc=fov/zd;
    return{x:cx+x3*sc,y:cy+y3*sc,depth:(z3+R)/(2*R)};
  }
  update(dt,spd){this.angle+=this.spdMult*spd*0.011*dt;}
  drawTrack(ctx,cx,cy,R,col,op){
    ctx.beginPath();
    for(let i=0;i<=100;i++){
      const p=this.project((i/100)*Math.PI*2+this.angle,cx,cy,R);
      i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);
    }
    ctx.strokeStyle=`rgba(${col},${op*0.5})`; ctx.lineWidth=0.5; ctx.stroke();
  }
}

function buildRings() {
  const P=Math.PI;
  return [
    [0.96,0,0,0,13,1.0,0.0],[0.93,P*.12,P*.08,0,11,.85,.4],
    [0.89,P*.22,P*.18,P*.05,12,1.15,.8],[0.85,P*.32,P*.28,P*.1,10,.9,1.2],
    [0.81,P*.42,P*.38,P*.15,11,1.25,1.6],[0.77,P*.5,P*.12,P*.08,9,.75,2.0],
    [0.73,P*.58,P*.22,P*.2,10,1.1,2.4],[0.69,P*.65,P*.35,P*.12,8,.95,.2],
    [0.66,P*.72,P*.45,P*.25,9,1.3,.9],[0.63,P*.78,P*.55,P*.18,7,.8,1.5],
    [0.59,P*.85,P*.65,P*.3,8,1.2,2.1],[0.56,P*.9,P*.75,P*.22,7,1.05,.6],
    [0.46,P*.35,P*.9,P*.4,5,1.4,1.0],[0.39,P*.6,P*.15,P*.5,5,1.6,1.8],
    [0.31,P*.2,P*.7,P*.35,4,1.8,.3],[1.0,P*.05,P*.42,P*.08,15,.65,.7],
    [0.99,P*.15,P*.62,P*.14,13,.7,1.3],[0.76,P*.45,P*.82,P*.6,9,1.05,.5],
    [0.71,P*.55,P*.92,P*.45,8,.88,1.1],[0.86,P*.28,P*.52,P*.38,10,.95,1.9],
  ].map(d=>new Ring(...d));
}

const lerp  = (a,b,t) => a+(b-a)*t;
const lerpC = (a,b,t) => [lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
const ease  = x => x<0.5?2*x*x:-1+(4-2*x)*x;

// ── Draw helpers ──────────────────────────────────────────────────────────────
function drawCore(ctx,cx,cy,R,col,core,t,pulse,coreR){
  const p=1+pulse*0.12*Math.sin(t*pulse), cr=coreR*p;
  const g1=ctx.createRadialGradient(cx,cy,0,cx,cy,R*0.42*p);
  g1.addColorStop(0,`rgba(${core},0.12)`); g1.addColorStop(0.4,`rgba(${col},0.06)`); g1.addColorStop(1,'transparent');
  ctx.fillStyle=g1; ctx.beginPath(); ctx.arc(cx,cy,R*0.42*p,0,Math.PI*2); ctx.fill();
  const g2=ctx.createRadialGradient(cx,cy,0,cx,cy,R*0.16);
  g2.addColorStop(0,`rgba(${core},0.45)`); g2.addColorStop(0.5,`rgba(${col},0.18)`); g2.addColorStop(1,'transparent');
  ctx.fillStyle=g2; ctx.beginPath(); ctx.arc(cx,cy,R*0.16,0,Math.PI*2); ctx.fill();
  for(let i=0;i<8;i++){
    const a=(i/8)*Math.PI*2+t*0.25, rL=R*0.13*p;
    const rx=cx+Math.cos(a)*rL, ry=cy+Math.sin(a)*rL;
    const gR=ctx.createLinearGradient(cx,cy,rx,ry);
    gR.addColorStop(0,`rgba(${core},0.35)`); gR.addColorStop(1,'transparent');
    ctx.strokeStyle=gR; ctx.lineWidth=0.7;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(rx,ry); ctx.stroke();
  }
  const g3=ctx.createRadialGradient(cx,cy,0,cx,cy,cr);
  g3.addColorStop(0,'rgba(255,255,255,0.97)');
  g3.addColorStop(0.4,`rgba(${core},0.85)`);
  g3.addColorStop(1,`rgba(${col},0.3)`);
  ctx.fillStyle=g3; ctx.beginPath(); ctx.arc(cx,cy,cr,0,Math.PI*2); ctx.fill();
}

function drawHex(ctx,cx,cy,size,col,opacity,label,name,active){
  const verts=Array.from({length:6},(_,i)=>{
    const a=(i*Math.PI/3)+Math.PI/6;
    return[cx+size*Math.cos(a),cy+size*Math.sin(a)];
  });
  ctx.save(); ctx.globalAlpha=opacity;
  ctx.beginPath(); verts.forEach(([x,y],i)=>i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)); ctx.closePath();
  if(active){
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,size);
    g.addColorStop(0,`rgba(${col},0.25)`); g.addColorStop(1,`rgba(${col},0.06)`);
    ctx.fillStyle=g;
  } else { ctx.fillStyle=`rgba(${col},0.04)`; }
  ctx.fill();
  ctx.beginPath(); verts.forEach(([x,y],i)=>i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)); ctx.closePath();
  ctx.strokeStyle=active?`rgba(${col},0.8)`:`rgba(${col},0.2)`;
  ctx.lineWidth=active?1.2:0.5; ctx.stroke();
  if(active){
    ctx.shadowColor=`rgba(${col},0.9)`; ctx.shadowBlur=18;
    ctx.beginPath(); verts.forEach(([x,y],i)=>i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)); ctx.closePath();
    ctx.strokeStyle=`rgba(${col},0.45)`; ctx.lineWidth=2.5; ctx.stroke();
    ctx.shadowBlur=0;
  }
  ctx.fillStyle=active?`rgba(${col},1.0)`:`rgba(${col},0.35)`;
  ctx.font='bold 8px ui-monospace,monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(label,cx,cy-5);
  ctx.font='6.5px ui-monospace,monospace';
  ctx.fillStyle=active?`rgba(${col},0.75)`:`rgba(${col},0.22)`;
  ctx.fillText(name.slice(0,7),cx,cy+6);
  ctx.restore();
}

function drawProjectBox(ctx, bx, by, bw, bh, def, opacity, focused) {
  const col = def.col.join(',');
  const alpha = opacity;
  ctx.save();
  ctx.globalAlpha = alpha;
  // Background
  ctx.fillStyle = focused
    ? `rgba(${col},0.12)`
    : `rgba(${col},0.04)`;
  ctx.strokeStyle = focused
    ? `rgba(${col},0.85)`
    : `rgba(${col},${def.active ? 0.35 : 0.18})`;
  ctx.lineWidth = focused ? 1.2 : 0.7;
  roundRect(ctx, bx, by, bw, bh, 4);
  ctx.fill(); ctx.stroke();
  // Glow when focused
  if (focused) {
    ctx.shadowColor = `rgba(${col},0.9)`; ctx.shadowBlur = 20;
    ctx.strokeStyle = `rgba(${col},0.5)`; ctx.lineWidth = 2;
    roundRect(ctx, bx, by, bw, bh, 4);
    ctx.stroke(); ctx.shadowBlur = 0;
  }
  // Dot indicator
  if (def.active) {
    ctx.fillStyle = `rgba(${col},${focused ? 1 : 0.6})`;
    ctx.shadowColor = focused ? `rgba(${col},1)` : 'transparent';
    ctx.shadowBlur = focused ? 8 : 0;
    ctx.beginPath(); ctx.arc(bx + 10, by + bh/2, 3, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
  }
  // Label
  ctx.fillStyle = `rgba(${col},${focused ? 1 : def.active ? 0.75 : 0.35})`;
  ctx.font = `${focused ? 'bold ' : ''}8px ui-monospace,monospace`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(def.label.slice(0, 14), bx + (def.active ? 18 : 10), by + bh/2 - 5);
  // Sub
  ctx.fillStyle = `rgba(${col},${focused ? 0.6 : 0.3})`;
  ctx.font = '6.5px ui-monospace,monospace';
  ctx.fillText(def.sub.slice(0, 18), bx + (def.active ? 18 : 10), by + bh/2 + 6);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}

// ── Main component ────────────────────────────────────────────────────────────
const JarvisSphere = forwardRef(function JarvisSphere({ mode="idle", sphereMode="briefing" }, ref) {
  const canvasRef = useRef(null);
  const stateRef  = useRef({ cur:"standby", tgt:"standby", t:1 });
  const animRef   = useRef(null);
  const ringsRef  = useRef(null);

  // Pre-build neurons — stable per project and per memory module
  const neuronsRef = useRef(
    Object.fromEntries(
      Object.entries(PROJ_DEFS).map(([key, def]) => [
        key,
        Array.from({ length: def.neuronCount }, (_, i) =>
          new Neuron(def.col.join(','), i, def.neuronCount)
        )
      ])
    )
  );
  const memNeuronsRef = useRef(
    Object.fromEntries(
      MEM_MODULES.map((m) => [
        m.id,
        Array.from({ length: 4 }, (_, i) =>
          new Neuron(m.col.join(','), i, 4)
        )
      ])
    )
  );

  const dataRef = useRef({
    t:0, lastT:0, wakePulse:0, wakeR:0,
    sphereMode:"briefing",
    projOpacity: Object.fromEntries(Object.keys(PROJ_DEFS).map(k=>[k,0])),
    projTarget:  Object.fromEntries(Object.keys(PROJ_DEFS).map(k=>[k,0])),
    memOpacity:  Object.fromEntries(MEM_MODULES.map(m=>[m.id,0.12])),
    memTarget:   Object.fromEntries(MEM_MODULES.map(m=>[m.id,0])),
  });

  // Sync mode
  useEffect(() => {
    const next = modeToState(mode);
    const st = stateRef.current;
    if (next !== st.tgt) {
      const prev = st.tgt; st.cur=prev; st.tgt=next; st.t=0;
      if (prev==="standby") { dataRef.current.wakePulse=1; dataRef.current.wakeR=0; }
    }
  }, [mode]);

  // Sync sphereMode
  useEffect(() => {
    const d = dataRef.current;
    d.sphereMode = sphereMode;
    if (sphereMode !== "orchestrator") {
      Object.keys(d.projTarget).forEach(k => { d.projTarget[k]=0; });
      MEM_MODULES.forEach(m => { d.memTarget[m.id]=0; });
    }
  }, [sphereMode]);

  // Imperative API
  useImperativeHandle(ref, () => ({
    toggleProject(key) {
      const d = dataRef.current;
      if (!Object.keys(d.projTarget).includes(key)) return;
      const wasOn = d.projTarget[key] === 1;
      Object.keys(d.projTarget).forEach(k => { d.projTarget[k]=0; });
      if (!wasOn) d.projTarget[key] = 1;
    },
    focusProject(key, secs=0) {
      const d = dataRef.current;
      Object.keys(d.projTarget).forEach(k => { d.projTarget[k]=0; });
      d.projTarget[key] = 1;
      if (secs > 0) setTimeout(() => { dataRef.current.projTarget[key]=0; }, secs*1000);
    },
    toggleMem(id) {
      const d = dataRef.current;
      const wasOn = d.memTarget[id] === 1;
      MEM_MODULES.forEach(m => { d.memTarget[m.id]=0.08; });
      if (!wasOn) d.memTarget[id]=1;
    },
    focusMem(id, secs=0) {
      const d = dataRef.current;
      MEM_MODULES.forEach(m => { d.memTarget[m.id]=0.08; });
      d.memTarget[id]=1;
      if (secs > 0) setTimeout(() => { dataRef.current.memTarget[id]=0; }, secs*1000);
    },
    clearFocus() {
      const d = dataRef.current;
      Object.keys(d.projTarget).forEach(k => { d.projTarget[k]=0; });
      MEM_MODULES.forEach(m => { d.memTarget[m.id]=0; });
    },
    activateAllMem() {
      const d = dataRef.current;
      MEM_MODULES.forEach(m => { d.memTarget[m.id]=1; });
    },
  }), []);

  // Click handler — check if click hits a project box or memory hex
  const handleClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width  / rect.width;
    const sy = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * sx;
    const my = (e.clientY - rect.top)  * sy;

    const W = canvas.width, H = canvas.height;
    const cx = W/2, cy = H/2;
    const radius = Math.min(W,H) * 0.26;
    const d = dataRef.current;

    if (d.sphereMode !== "orchestrator") return;

    // Check project boxes
    for (const [key, def] of Object.entries(PROJ_DEFS)) {
      const bx = cx + def.dx * radius - BOX_W/2;
      const by = cy + def.dy * radius - BOX_H/2;
      if (mx>=bx && mx<=bx+BOX_W && my>=by && my<=by+BOX_H) {
        const wasOn = d.projTarget[key]===1;
        Object.keys(d.projTarget).forEach(k => { d.projTarget[k]=0; });
        if (!wasOn) d.projTarget[key]=1;
        return;
      }
    }

    // Check memory hexes
    const HEX_ANGLES = [-2.6,-1.9,-1.1,-0.3,0.5,1.3,2.1,2.9];
    const HEX_SIZE   = 22;
    MEM_MODULES.forEach((m,i) => {
      const dist = radius*0.52+radius*0.55;
      const hx = cx+Math.cos(HEX_ANGLES[i])*dist;
      const hy = cy+Math.sin(HEX_ANGLES[i])*dist;
      if (Math.sqrt((mx-hx)**2+(my-hy)**2) < HEX_SIZE*1.5) {
        const wasOn = d.memTarget[m.id]>=0.9;
        MEM_MODULES.forEach(mm => { d.memTarget[mm.id]=0.08; });
        if (!wasOn) d.memTarget[m.id]=1;
      }
    });
  };

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ringsRef.current) ringsRef.current = buildRings();
    const rings = ringsRef.current;
    const d     = dataRef.current;
    const FADE  = 0.005;
    const HEX_ANGLES = [-2.6,-1.9,-1.1,-0.3,0.5,1.3,2.1,2.9];
    const HEX_SIZE   = 22;

    const resize = () => {
      const w = canvas.parentElement?.clientWidth  || 400;
      const h = canvas.parentElement?.clientHeight || 320;
      canvas.width=w; canvas.height=h;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement || document.body);

    const frame = (ts) => {
      animRef.current = requestAnimationFrame(frame);
      const dt = Math.min((ts-d.lastT)/16.67,3);
      d.lastT=ts; d.t+=0.016*dt;
      const t = d.t;

      const W=canvas.width, H=canvas.height;
      if (!W||!H) return;
      const cx=W/2, cy=H/2;
      const radius = Math.min(W,H)*0.26;
      const isOrch = d.sphereMode==="orchestrator";

      // State interpolation
      const st=stateRef.current;
      if(st.t<1) st.t=Math.min(st.t+0.018*dt,1);
      const e=ease(st.t);
      const from=STATES[st.cur]||STATES.standby, to=STATES[st.tgt]||STATES.standby;
      const dispState=e>0.5?st.tgt:st.cur;
      const curColArr  =lerpC(from.col,  to.col,  e);
      const curCoreArr =lerpC(from.core, to.core, e);
      const curGlowArr =lerpC(from.glow, to.glow, e);
      const curSpd  =lerp(from.spd,   to.spd,  e);
      const curRingO=lerp(from.ringOp,to.ringOp,e);
      const curPulse=lerp(from.pulse, to.pulse, e);
      const curCoreR=lerp(from.coreR, to.coreR, e);
      const col  = curColArr.join(',');
      const core = curCoreArr.join(',');
      const glow = curGlowArr.join(',');

      // Fade opacities
      const fadeRate = FADE * dt;
      Object.keys(d.projOpacity).forEach(k=>{
        const tgt=d.projTarget[k], cur=d.projOpacity[k];
        d.projOpacity[k] = cur + (tgt-cur) * Math.min(1, fadeRate*4);
      });
      Object.keys(d.memOpacity).forEach(k=>{
        const tgt=d.memTarget[k], cur=d.memOpacity[k];
        d.memOpacity[k] = cur + (tgt-cur) * Math.min(1, fadeRate*3);
      });

      ctx.clearRect(0,0,W,H);

      // BG glow
      const bg=ctx.createRadialGradient(cx,cy,0,cx,cy,radius*2.2);
      bg.addColorStop(0,`rgba(${glow},0.07)`);
      bg.addColorStop(0.5,`rgba(${glow},0.025)`);
      bg.addColorStop(1,'transparent');
      ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

      // Wake pulse
      if(d.wakePulse>0){
        d.wakeR+=5*dt; d.wakePulse-=0.014*dt;
        if(d.wakePulse<0) d.wakePulse=0;
        ctx.beginPath(); ctx.arc(cx,cy,d.wakeR,0,Math.PI*2);
        ctx.strokeStyle=`rgba(255,255,255,${d.wakePulse*0.45})`; ctx.lineWidth=1.5; ctx.stroke();
        if(d.wakeR>30){
          ctx.beginPath(); ctx.arc(cx,cy,d.wakeR*0.7,0,Math.PI*2);
          ctx.strokeStyle=`rgba(255,255,255,${d.wakePulse*0.25})`; ctx.lineWidth=0.8; ctx.stroke();
        }
      }

      // ── Orchestrator: neurons behind sphere ───────────────────────────────
      if (isOrch) {
        // Project neurons
        Object.entries(PROJ_DEFS).forEach(([key, def]) => {
          const op = d.projOpacity[key];
          if (op < 0.01) return;
          // Box center (same formula as drawing)
          const tx = cx + def.dx * radius;
          const ty = cy + def.dy * radius;
          neuronsRef.current[key]?.forEach(n =>
            n.draw(ctx, cx, cy, tx, ty, BOX_W, BOX_H, t, op)
          );
        });

        // Memory hex neurons
        MEM_MODULES.forEach((m, i) => {
          const op = d.memOpacity[m.id];
          if (op < 0.05) return;
          const dist = radius*0.52+radius*0.55;
          const hx = cx+Math.cos(HEX_ANGLES[i])*dist;
          const hy = cy+Math.sin(HEX_ANGLES[i])*dist;
          memNeuronsRef.current[m.id]?.forEach(n =>
            n.draw(ctx, cx, cy, hx, hy, HEX_SIZE*2, HEX_SIZE*2, t, op*0.65)
          );
        });
      }

      // Reference rings
      [1.55,1.34,1.13].forEach((m,i)=>{
        ctx.beginPath(); ctx.arc(cx,cy,radius*m,0,Math.PI*2);
        ctx.strokeStyle=`rgba(${col},${curRingO*(0.35-i*0.09)})`;
        ctx.lineWidth=0.5; ctx.setLineDash(i===0?[4,7]:i===1?[2,5]:[]);
        ctx.stroke(); ctx.setLineDash([]);
      });

      // Degree markers
      [{a:-Math.PI/2,l:'000'},{a:0,l:'090'},{a:Math.PI/2,l:'180'},{a:Math.PI,l:'270'}].forEach(({a,l})=>{
        const mx=cx+Math.cos(a)*radius*1.68, my=cy+Math.sin(a)*radius*1.68;
        ctx.font='6.5px ui-monospace,monospace'; ctx.fillStyle=`rgba(${col},0.28)`;
        ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(l,mx,my);
      });

      // Orbital rings
      rings.forEach(r=>r.update(dt,curSpd));
      rings.forEach(r=>r.drawTrack(ctx,cx,cy,radius,col,curRingO));

      const allNodes=[];
      rings.forEach(ring=>ring.nodes.forEach(node=>{
        const p=ring.project(node.offset+ring.angle,cx,cy,radius);
        allNodes.push({ring,node,p});
      }));
      allNodes.sort((a,b)=>a.p.depth-b.p.depth);

      allNodes.forEach(({ring,node,p})=>{
        const{x,y,depth}=p;
        const dsc=0.28+depth*0.72;
        const pulse=1+curPulse*0.12*Math.sin(t*(1.8+ring.spdMult)+node.phase);
        let rx=x,ry=y;
        if(dispState==='speaking'){
          const push=Math.sin(t*curPulse*2+node.phase)*4*depth;
          const dx=x-cx,dy=y-cy,dist=Math.sqrt(dx*dx+dy*dy)||1;
          rx=x+(dx/dist)*push; ry=y+(dy/dist)*push;
        }
        const sz=node.size*dsc*pulse, op=node.bright*(0.3+0.7*depth);
        if(depth>0.25){
          const gR=sz*5.5;
          const pg=ctx.createRadialGradient(rx,ry,0,rx,ry,gR);
          pg.addColorStop(0,`rgba(${core},${op*0.48})`);
          pg.addColorStop(0.35,`rgba(${col},${op*0.18})`);
          pg.addColorStop(1,'transparent');
          ctx.fillStyle=pg; ctx.beginPath(); ctx.arc(rx,ry,gR,0,Math.PI*2); ctx.fill();
        }
        if(dispState==='thinking'&&depth>0.6){
          allNodes.forEach(other=>{
            if(other.p.depth<0.5) return;
            const dx2=other.p.x-x,dy2=other.p.y-y,d2=Math.sqrt(dx2*dx2+dy2*dy2);
            if(d2<radius*0.22&&d2>0){
              ctx.strokeStyle=`rgba(${col},${(1-d2/(radius*0.22))*0.09*depth})`;
              ctx.lineWidth=0.35;
              ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(other.p.x,other.p.y); ctx.stroke();
            }
          });
        }
        ctx.fillStyle=`rgba(${col},${op})`;
        ctx.beginPath(); ctx.arc(rx,ry,sz,0,Math.PI*2); ctx.fill();
        if(depth>0.5){
          ctx.fillStyle=`rgba(${core},${op*0.75})`;
          ctx.beginPath(); ctx.arc(rx,ry,sz*0.38,0,Math.PI*2); ctx.fill();
        }
      });

      drawCore(ctx,cx,cy,radius,col,core,t,curPulse,curCoreR);

      if(dispState==='speaking'){
        const bw=3.5,bgap=4,bc=13,tw=bc*(bw+bgap);
        for(let i=0;i<bc;i++){
          const bx=cx-tw/2+i*(bw+bgap);
          const bh=5+Math.abs(Math.sin(t*9+i*0.9))*22;
          const bo=0.3+0.5*Math.abs(Math.sin(t*6+i));
          ctx.fillStyle=`rgba(${col},${bo})`;
          ctx.beginPath(); ctx.rect(bx,cy+radius*1.2-bh/2,bw,bh); ctx.fill();
        }
      }

      // ── Orchestrator: project boxes + memory hexes ON CANVAS ─────────────
      if (isOrch) {
        // Project boxes — drawn at known canvas coordinates
        Object.entries(PROJ_DEFS).forEach(([key, def]) => {
          const bx = cx + def.dx * radius - BOX_W/2;
          const by = cy + def.dy * radius - BOX_H/2;
          const op = def.active ? (0.35 + d.projOpacity[key] * 0.65) : 0.25;
          const focused = d.projOpacity[key] > 0.5;
          drawProjectBox(ctx, bx, by, BOX_W, BOX_H, def, op, focused);
        });

        // Memory hexes
        MEM_MODULES.forEach((m,i)=>{
          const dist = radius*0.52+radius*0.55;
          const hx = cx+Math.cos(HEX_ANGLES[i])*dist;
          const hy = cy+Math.sin(HEX_ANGLES[i])*dist;
          const op = Math.max(0.10, d.memOpacity[m.id]);
          const isActive = d.memTarget[m.id] >= 0.8;
          drawHex(ctx,hx,hy,HEX_SIZE,m.col.join(','),op,m.label,m.name,isActive&&d.memOpacity[m.id]>0.5);
        });
      } else {
        // Briefing — dim hexes only
        MEM_MODULES.forEach((m,i)=>{
          const dist = radius*0.52+radius*0.55;
          const hx = cx+Math.cos(HEX_ANGLES[i])*dist;
          const hy = cy+Math.sin(HEX_ANGLES[i])*dist;
          drawHex(ctx,hx,hy,HEX_SIZE,m.col.join(','),0.10,m.label,m.name,false);
        });
      }
    };

    animRef.current=requestAnimationFrame(frame);
    return () => {
      if(animRef.current) cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{ display:"block", width:"100%", height:"100%", cursor:"pointer" }}
    />
  );
});

export default JarvisSphere;
