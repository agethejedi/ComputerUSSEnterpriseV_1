// JarvisSphere.jsx — JARVIS V8
// React conversion of jarvis_v8_fixed.html
// Drop-in replacement for JarvisCore in JarvisBriefing.jsx
//
// Props:
//   mode: "idle" | "listening" | "thinking" | "speaking"

import { useEffect, useRef } from "react";

function modeToState(mode) {
  switch (mode) {
    case "listening": return "listening";
    case "thinking":  return "thinking";
    case "speaking":  return "speaking";
    default:          return "standby";
  }
}

const STATES = {
  standby:   { col:[59,130,246],  core:[147,197,253], glow:[29,78,216],   spd:0.18, ringOp:0.18, pulse:0.4,  coreR:11 },
  listening: { col:[34,211,238],  core:[255,255,255], glow:[6,182,212],   spd:0.55, ringOp:0.30, pulse:1.2,  coreR:13 },
  thinking:  { col:[251,191,36],  core:[253,230,138], glow:[217,119,6],   spd:0.95, ringOp:0.40, pulse:1.8,  coreR:15 },
  speaking:  { col:[167,139,250], core:[255,255,255], glow:[124,58,237],  spd:0.75, ringOp:0.45, pulse:2.2,  coreR:13 },
  doing:     { col:[74,222,128],  core:[134,239,172], glow:[22,163,74],   spd:1.30, ringOp:0.55, pulse:2.8,  coreR:12 },
};

const MEM_MODULES = [
  { id:"m1", label:"M1", name:"Principal",    col:[245,240,232] },
  { id:"m2", label:"M2", name:"Identity",     col:[96,165,250]  },
  { id:"m3", label:"M3", name:"Philosophy",   col:[167,139,250] },
  { id:"m4", label:"M4", name:"Portfolio",    col:[251,146,60]  },
  { id:"m5", label:"M5", name:"Institutional",col:[45,212,191]  },
  { id:"m6", label:"M6", name:"Ready Room",   col:[251,113,133] },
  { id:"m7", label:"M7", name:"Tania Bible",  col:[201,168,76]  },
  { id:"m8", label:"M8", name:"Capabilities", col:[132,204,22]  },
];

const HEX_DEFS = [
  { angle: -2.6 }, { angle: -1.9 }, { angle: -1.1 }, { angle: -0.3 },
  { angle:  0.5 }, { angle:  1.3 }, { angle:  2.1 }, { angle:  2.9 },
];
const HEX_SIZE = 28;

class Ring {
  constructor(rf, tX, tY, tZ, nodeCount, spdMult, phaseOff) {
    this.rf = rf; this.tX = tX; this.tY = tY; this.tZ = tZ;
    this.spdMult = spdMult; this.angle = phaseOff;
    const n = Math.ceil(nodeCount * 1.2);
    this.nodes = Array.from({ length: n }, () => ({
      offset: Math.random() * Math.PI * 2,
      size:   1.0 + Math.random() * 2.2,
      bright: 0.45 + Math.random() * 0.55,
      phase:  Math.random() * Math.PI * 2,
    }));
  }
  project(theta, cx, cy, R) {
    const px = Math.cos(theta)*this.rf*R, py = Math.sin(theta)*this.rf*R*0.52;
    const cosX=Math.cos(this.tX),sinX=Math.sin(this.tX);
    let x1=px, y1=py*cosX, z1=py*sinX;
    const cosY=Math.cos(this.tY),sinY=Math.sin(this.tY);
    let x2=x1*cosY+z1*sinY, y2=y1, z2=-x1*sinY+z1*cosY;
    const cosZ=Math.cos(this.tZ),sinZ=Math.sin(this.tZ);
    let x3=x2*cosZ-y2*sinZ, y3=x2*sinZ+y2*cosZ, z3=z2;
    const fov=480, zd=z3+fov, sc=fov/zd;
    return { x:cx+x3*sc, y:cy+y3*sc, depth:(z3+R)/(2*R) };
  }
  update(dt, spd) { this.angle += this.spdMult*spd*0.011*dt; }
  drawTrack(ctx, cx, cy, R, col, ringOp) {
    const segs=100;
    ctx.beginPath();
    for (let i=0;i<=segs;i++) {
      const p=this.project((i/segs)*Math.PI*2+this.angle,cx,cy,R);
      i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);
    }
    ctx.strokeStyle=`rgba(${col.join(',')},${ringOp*0.5})`;
    ctx.lineWidth=0.5; ctx.stroke();
  }
}

function buildRings() {
  const PI=Math.PI;
  const defs=[
    [0.96,0,0,0,13,1.0,0.0],[0.93,PI*0.12,PI*0.08,0,11,0.85,0.4],
    [0.89,PI*0.22,PI*0.18,PI*0.05,12,1.15,0.8],[0.85,PI*0.32,PI*0.28,PI*0.1,10,0.9,1.2],
    [0.81,PI*0.42,PI*0.38,PI*0.15,11,1.25,1.6],[0.77,PI*0.5,PI*0.12,PI*0.08,9,0.75,2.0],
    [0.73,PI*0.58,PI*0.22,PI*0.2,10,1.1,2.4],[0.69,PI*0.65,PI*0.35,PI*0.12,8,0.95,0.2],
    [0.66,PI*0.72,PI*0.45,PI*0.25,9,1.3,0.9],[0.63,PI*0.78,PI*0.55,PI*0.18,7,0.8,1.5],
    [0.59,PI*0.85,PI*0.65,PI*0.3,8,1.2,2.1],[0.56,PI*0.9,PI*0.75,PI*0.22,7,1.05,0.6],
    [0.46,PI*0.35,PI*0.9,PI*0.4,5,1.4,1.0],[0.39,PI*0.6,PI*0.15,PI*0.5,5,1.6,1.8],
    [0.31,PI*0.2,PI*0.7,PI*0.35,4,1.8,0.3],[1.0,PI*0.05,PI*0.42,PI*0.08,15,0.65,0.7],
    [0.99,PI*0.15,PI*0.62,PI*0.14,13,0.7,1.3],[0.76,PI*0.45,PI*0.82,PI*0.6,9,1.05,0.5],
    [0.71,PI*0.55,PI*0.92,PI*0.45,8,0.88,1.1],[0.86,PI*0.28,PI*0.52,PI*0.38,10,0.95,1.9],
  ];
  return defs.map(d=>new Ring(d[0],d[1],d[2],d[3],d[4],d[5],d[6]));
}

const lerp  = (a,b,t) => a+(b-a)*t;
const lerpC = (a,b,t) => [lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
const ease  = x => x<0.5?2*x*x:-1+(4-2*x)*x;

function drawCore(ctx,cx,cy,R,col,core,t,pulse,coreR) {
  const p=1+pulse*0.12*Math.sin(t*pulse), cr=coreR*p;
  const g1=ctx.createRadialGradient(cx,cy,0,cx,cy,R*0.42*p);
  g1.addColorStop(0,`rgba(${core.join(',')},0.12)`);
  g1.addColorStop(0.4,`rgba(${col.join(',')},0.06)`);
  g1.addColorStop(1,'transparent');
  ctx.fillStyle=g1; ctx.beginPath(); ctx.arc(cx,cy,R*0.42*p,0,Math.PI*2); ctx.fill();
  const g2=ctx.createRadialGradient(cx,cy,0,cx,cy,R*0.16);
  g2.addColorStop(0,`rgba(${core.join(',')},0.45)`);
  g2.addColorStop(0.5,`rgba(${col.join(',')},0.18)`);
  g2.addColorStop(1,'transparent');
  ctx.fillStyle=g2; ctx.beginPath(); ctx.arc(cx,cy,R*0.16,0,Math.PI*2); ctx.fill();
  for (let i=0;i<8;i++) {
    const a=(i/8)*Math.PI*2+t*0.25, rL=R*0.13*p;
    const rx=cx+Math.cos(a)*rL, ry=cy+Math.sin(a)*rL;
    const gR=ctx.createLinearGradient(cx,cy,rx,ry);
    gR.addColorStop(0,`rgba(${core.join(',')},0.35)`); gR.addColorStop(1,'transparent');
    ctx.strokeStyle=gR; ctx.lineWidth=0.7;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(rx,ry); ctx.stroke();
  }
  const g3=ctx.createRadialGradient(cx,cy,0,cx,cy,cr);
  g3.addColorStop(0,'rgba(255,255,255,0.97)');
  g3.addColorStop(0.4,`rgba(${core.join(',')},0.85)`);
  g3.addColorStop(1,`rgba(${col.join(',')},0.3)`);
  ctx.fillStyle=g3; ctx.beginPath(); ctx.arc(cx,cy,cr,0,Math.PI*2); ctx.fill();
}

function drawHex(ctx,cx,cy,size,col,opacity,label,name,active) {
  const verts=Array.from({length:6},(_,i)=>{
    const angle=(i*Math.PI/3)+Math.PI/6;
    return [cx+size*Math.cos(angle),cy+size*Math.sin(angle)];
  });
  ctx.save(); ctx.globalAlpha=opacity;
  ctx.beginPath(); verts.forEach(([x,y],i)=>i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)); ctx.closePath();
  if (active) {
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,size);
    g.addColorStop(0,`rgba(${col.join(',')},0.18)`); g.addColorStop(1,`rgba(${col.join(',')},0.06)`);
    ctx.fillStyle=g;
  } else { ctx.fillStyle=`rgba(${col.join(',')},0.03)`; }
  ctx.fill();
  ctx.beginPath(); verts.forEach(([x,y],i)=>i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)); ctx.closePath();
  ctx.strokeStyle=active?`rgba(${col.join(',')},0.7)`:`rgba(${col.join(',')},0.2)`;
  ctx.lineWidth=active?1.0:0.5; ctx.stroke();
  if (active) {
    ctx.shadowColor=`rgba(${col.join(',')},0.8)`; ctx.shadowBlur=12;
    ctx.beginPath(); verts.forEach(([x,y],i)=>i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)); ctx.closePath();
    ctx.strokeStyle=`rgba(${col.join(',')},0.4)`; ctx.lineWidth=2; ctx.stroke(); ctx.shadowBlur=0;
  }
  ctx.fillStyle=active?`rgba(${col.join(',')},0.95)`:`rgba(${col.join(',')},0.35)`;
  ctx.font='bold 7px ui-monospace,monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(label,cx,cy-4);
  ctx.font='6px ui-monospace,monospace';
  ctx.fillStyle=active?`rgba(${col.join(',')},0.7)`:`rgba(${col.join(',')},0.2)`;
  ctx.fillText(name.slice(0,6),cx,cy+5);
  ctx.restore();
}

export default function JarvisSphere({ mode = "idle" }) {
  const mainRef  = useRef(null);
  const hexRef   = useRef(null);
  const stateRef = useRef({ cur:"standby", tgt:"standby", t:1 });
  const animRef  = useRef(null);
  const ringsRef = useRef(null);
  const dataRef  = useRef({
    t:0, lastT:0, wakePulse:0, wakeR:0,
    memOpacity: Object.fromEntries(MEM_MODULES.map(m=>[m.id,0.12])),
    memTarget:  Object.fromEntries(MEM_MODULES.map(m=>[m.id,0])),
  });

  useEffect(() => {
    const next = modeToState(mode);
    const st   = stateRef.current;
    if (next !== st.tgt) {
      const prev = st.tgt;
      st.cur = prev; st.tgt = next; st.t = 0;
      if (prev === "standby") { dataRef.current.wakePulse=1; dataRef.current.wakeR=0; }
    }
  }, [mode]);

  useEffect(() => {
    const main = mainRef.current, hex = hexRef.current;
    if (!main || !hex) return;
    const ctx = main.getContext("2d"), hctx = hex.getContext("2d");
    if (!ringsRef.current) ringsRef.current = buildRings();
    const rings = ringsRef.current;
    const d = dataRef.current;
    const FADE = 0.006;

    const resize = () => {
      const w = main.parentElement?.clientWidth  || 400;
      const h = main.parentElement?.clientHeight || 320;
      main.width=w; main.height=h; hex.width=w; hex.height=h;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(main.parentElement || document.body);

    const frame = (ts) => {
      animRef.current = requestAnimationFrame(frame);
      const dt = Math.min((ts-d.lastT)/16.67,3);
      d.lastT=ts; d.t+=0.016*dt;
      const t=d.t;
      const W=main.width, H=main.height;
      if (!W||!H) return;
      const cx=W/2, cy=H/2, radius=Math.min(W,H)*0.26;

      const st=stateRef.current;
      if (st.t<1) st.t=Math.min(st.t+0.018*dt,1);
      const e=ease(st.t);
      const from=STATES[st.cur]||STATES.standby, to=STATES[st.tgt]||STATES.standby;
      const dispState=e>0.5?st.tgt:st.cur;

      const curCol  =lerpC(from.col,  to.col,  e);
      const curCore =lerpC(from.core, to.core, e);
      const curGlow =lerpC(from.glow, to.glow, e);
      const curSpd  =lerp(from.spd,   to.spd,  e);
      const curRingO=lerp(from.ringOp,to.ringOp,e);
      const curPulse=lerp(from.pulse, to.pulse, e);
      const curCoreR=lerp(from.coreR, to.coreR, e);

      Object.keys(d.memOpacity).forEach(k=>{
        const tgt=d.memTarget[k], cur=d.memOpacity[k];
        if (cur<tgt) d.memOpacity[k]=Math.min(tgt,cur+FADE*dt);
        else if (cur>tgt) d.memOpacity[k]=Math.max(tgt,cur-FADE*dt);
      });

      ctx.clearRect(0,0,W,H);

      // BG glow
      const bg=ctx.createRadialGradient(cx,cy,0,cx,cy,radius*2.2);
      bg.addColorStop(0,`rgba(${curGlow.join(',')},0.07)`);
      bg.addColorStop(0.5,`rgba(${curGlow.join(',')},0.025)`);
      bg.addColorStop(1,'transparent');
      ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

      // Wake pulse
      if (d.wakePulse>0) {
        d.wakeR+=5*dt; d.wakePulse-=0.014*dt;
        if (d.wakePulse<0) d.wakePulse=0;
        ctx.beginPath(); ctx.arc(cx,cy,d.wakeR,0,Math.PI*2);
        ctx.strokeStyle=`rgba(255,255,255,${d.wakePulse*0.45})`; ctx.lineWidth=1.5; ctx.stroke();
        if (d.wakeR>30) {
          ctx.beginPath(); ctx.arc(cx,cy,d.wakeR*0.7,0,Math.PI*2);
          ctx.strokeStyle=`rgba(255,255,255,${d.wakePulse*0.25})`; ctx.lineWidth=0.8; ctx.stroke();
        }
      }

      // Reference rings
      [1.55,1.34,1.13].forEach((m,i)=>{
        ctx.beginPath(); ctx.arc(cx,cy,radius*m,0,Math.PI*2);
        ctx.strokeStyle=`rgba(${curCol.join(',')},${curRingO*(0.35-i*0.09)})`;
        ctx.lineWidth=0.5; ctx.setLineDash(i===0?[4,7]:i===1?[2,5]:[]);
        ctx.stroke(); ctx.setLineDash([]);
      });

      // Degree markers
      [{a:-Math.PI/2,l:'000'},{a:0,l:'090'},{a:Math.PI/2,l:'180'},{a:Math.PI,l:'270'}].forEach(({a,l})=>{
        const mx=cx+Math.cos(a)*radius*1.68, my=cy+Math.sin(a)*radius*1.68;
        ctx.font='6.5px ui-monospace,monospace';
        ctx.fillStyle=`rgba(${curCol.join(',')},0.28)`;
        ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(l,mx,my);
      });

      // Doing spin rings
      if (dispState==='doing') {
        const sa=t*1.6;
        ctx.save(); ctx.translate(cx,cy); ctx.rotate(sa);
        ctx.beginPath(); ctx.arc(0,0,radius*1.55,0,Math.PI*2);
        ctx.strokeStyle=`rgba(74,222,128,${curRingO*0.75})`; ctx.lineWidth=1;
        ctx.setLineDash([14,5]); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
        ctx.save(); ctx.translate(cx,cy); ctx.rotate(-sa*0.55);
        ctx.beginPath(); ctx.arc(0,0,radius*1.34,0,Math.PI*2);
        ctx.strokeStyle=`rgba(74,222,128,${curRingO*0.45})`; ctx.lineWidth=0.5;
        ctx.setLineDash([8,10]); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      }

      // Orbital rings
      rings.forEach(r=>r.update(dt,curSpd));
      rings.forEach(r=>r.drawTrack(ctx,cx,cy,radius,curCol,curRingO));

      const allNodes=[];
      rings.forEach(ring=>ring.nodes.forEach(node=>{
        const theta=node.offset+ring.angle;
        const p=ring.project(theta,cx,cy,radius);
        allNodes.push({ring,node,p});
      }));
      allNodes.sort((a,b)=>a.p.depth-b.p.depth);

      allNodes.forEach(({ring,node,p})=>{
        const {x,y,depth}=p;
        const dsc=0.28+depth*0.72;
        const pulse=1+curPulse*0.12*Math.sin(t*(1.8+ring.spdMult)+node.phase);
        let rx=x,ry=y;
        if (dispState==='speaking') {
          const push=Math.sin(t*curPulse*2+node.phase)*4*depth;
          const dx=x-cx,dy=y-cy,dist=Math.sqrt(dx*dx+dy*dy)||1;
          rx=x+(dx/dist)*push; ry=y+(dy/dist)*push;
        }
        const sz=node.size*dsc*pulse, op=node.bright*(0.3+0.7*depth);
        if (depth>0.25) {
          const gR=sz*5.5;
          const pg=ctx.createRadialGradient(rx,ry,0,rx,ry,gR);
          pg.addColorStop(0,`rgba(${curCore.join(',')},${op*0.48})`);
          pg.addColorStop(0.35,`rgba(${curCol.join(',')},${op*0.18})`);
          pg.addColorStop(1,'transparent');
          ctx.fillStyle=pg; ctx.beginPath(); ctx.arc(rx,ry,gR,0,Math.PI*2); ctx.fill();
        }
        if (dispState==='thinking'&&depth>0.6) {
          allNodes.forEach(other=>{
            if (other.p.depth<0.5) return;
            const dx2=other.p.x-x,dy2=other.p.y-y,d2=Math.sqrt(dx2*dx2+dy2*dy2);
            if (d2<radius*0.22&&d2>0) {
              ctx.strokeStyle=`rgba(${curCol.join(',')},${(1-d2/(radius*0.22))*0.09*depth})`;
              ctx.lineWidth=0.35;
              ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(other.p.x,other.p.y); ctx.stroke();
            }
          });
        }
        ctx.fillStyle=`rgba(${curCol.join(',')},${op})`;
        ctx.beginPath(); ctx.arc(rx,ry,sz,0,Math.PI*2); ctx.fill();
        if (depth>0.5) {
          ctx.fillStyle=`rgba(${curCore.join(',')},${op*0.75})`;
          ctx.beginPath(); ctx.arc(rx,ry,sz*0.38,0,Math.PI*2); ctx.fill();
        }
      });

      drawCore(ctx,cx,cy,radius,curCol,curCore,t,curPulse,curCoreR);

      if (dispState==='speaking') {
        const bw=3.5,bgap=4,bc=13,tw=bc*(bw+bgap);
        for (let i=0;i<bc;i++) {
          const bx=cx-tw/2+i*(bw+bgap);
          const bh=5+Math.abs(Math.sin(t*9+i*0.9))*22;
          const bo=0.3+0.5*Math.abs(Math.sin(t*6+i));
          ctx.fillStyle=`rgba(${curCol.join(',')},${bo})`;
          ctx.beginPath(); ctx.rect(bx,cy+radius*1.2-bh/2,bw,bh); ctx.fill();
        }
      }

      // Memory hexagons
      hctx.clearRect(0,0,W,H);
      MEM_MODULES.forEach((m,idx)=>{
        const def=HEX_DEFS[idx];
        const dist=radius*0.52+radius*0.55;
        const hx=cx+Math.cos(def.angle)*dist;
        const hy=cy+Math.sin(def.angle)*dist;
        const isActive=d.memTarget[m.id]===1;
        const hexOp=Math.max(0.12,isActive?d.memOpacity[m.id]:0.12);
        drawHex(hctx,hx,hy,HEX_SIZE,m.col,hexOp,m.label,m.name,isActive&&d.memOpacity[m.id]>0.3);
      });
    };

    animRef.current=requestAnimationFrame(frame);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <div style={{ position:"relative", width:"100%", height:"100%" }}>
      <canvas ref={mainRef} style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} />
      <canvas ref={hexRef}  style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:1 }} />
    </div>
  );
}
