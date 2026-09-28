
const MAP=1254;





/* the two voices — names and roles still open */
const SPEAKERS={
  L:{ name:'RAWI', role:'smuggler boss,<br><span>the Interzone</span>' },
  R:{ name:'ADLER', role:'forensic architect,<br><span>off-island</span>' }
};

const DISTRICTS=[
  { id:'core',dbId:'island-core', hk:'a', name:'REMEMBRANCE', sub:'INGATAN', role:'central religious ground', seed:[620,633], col:'#ffffff',
    named:'Eastern Shoals Company, c.1740s', pair:'\u2014', cone:'origin of the cone' },
  { id:'ne',dbId:'island-ne', hk:'b', name:'SUNYI', sub:'UNNAMED ON CHART', role:'detention', seed:[1000,281], col:'#ffffff',
    named:'Lanting; no colonial name printed', pair:'CONCORD', cone:'inside the forward cone' },
  { id:'nw',dbId:'island-nw', hk:'c', name:'THE INTERZONE', sub:'COMPANY ROADS', role:'arrivals, free zone', seed:[253,280], col:'#ffffff',
    named:'Company customs status, inherited', pair:'SEMPADAN JAYA', cone:'inside the forward cone' },
  { id:'sw',dbId:'island-sw', hk:'d', name:'CONCORD', sub:'PROTECTORATE NAME', role:'upper-class enclave', seed:[265,984], col:'#ffffff',
    named:'Protectorate survey, virtue register', pair:'SUNYI', cone:'shielded' },
  { id:'se',dbId:'island-se', hk:'e', name:'SEMPADAN JAYA', sub:'CONTESTED NAME', role:'government', seed:[995,987], col:'#ffffff',
    named:'Present claimant; prior name withdrawn', pair:'THE INTERZONE', cone:'shielded' }
];

/* v = the neutral record: what both accounts agree on */
const POI=[
  {d:0,n:'1',id:'site-re-1',x:620,y:633,name:'THE VOID',role:'warhead site, unbuilt',
   v:{status:'Unbuilt',built:'\u2014',area:'2.1 ha',access:'Open, unpaved'}},
  {d:0,n:'2',id:'site-re-2',x:604,y:522,name:'THE WATCHTOWER',role:'seeker turret',
   v:{status:'Operational',built:'Occupation era',area:'0.4 ha',access:'Restricted'}},
  {d:1,n:'1',id:'site-ne-1',x:1008,y:200,name:'INTAKE YARD',role:'reception',
   v:{status:'Operational',built:'Protectorate',area:'3.6 ha',access:'Closed'}},
  {d:1,n:'2',id:'site-ne-2',x:1072,y:322,name:'THE LONG ROWS',role:'housing blocks',
   v:{status:'Occupied',built:'Protectorate, extended',area:'11.4 ha',access:'Closed'}},
  {d:1,n:'3',id:'site-ne-3',x:930,y:352,name:'TILT STATION NE',role:'ballast monitor',
   v:{status:'Unstaffed',built:'Contractor era',area:'0.05 ha',access:'Locked'}},
  {d:1,n:'4',id:'site-ne-4',x:1090,y:240,name:'THE UNNAMED GATE',role:'civic omission',
   v:{status:'Administrative',built:'\u2014',area:'\u2014',access:'Not a structure'}},

  {d:2,n:'1',id:'site-nw-1',x:76,y:247,name:'THE LOW SPACES',role:'tidal crossing',
   v:{status:'Open ground',built:'Lanting era',area:'\u2014',access:'Slack water'}},
  {d:2,n:'2',id:'site-nw-2',x:300,y:214,name:'THE EXAMINATION HALLS',role:'processing',
   v:{status:'Operational',built:'Protectorate',area:'2.2 ha',access:'Public, queued'}},
  {d:2,n:'3',id:'site-nw-3',x:214,y:352,name:'PORTSIDE',role:'holding market',
   v:{status:'Open ground',built:'\u2014',area:'5.9 ha',access:'Controlled'}},
  {d:3,n:'1',id:'site-sw-1',x:200,y:912,name:'LEVELLED QUARTER',role:'total reconstruction',
   v:{status:'Rebuilt',built:'Post-rupture',area:'8.3 ha',access:'Private'}},
  {d:3,n:'2',id:'site-sw-2',x:330,y:934,name:'SEAWALL TERRACES',role:'private frontage',
   v:{status:'Occupied',built:'Post-rupture',area:'4.1 ha',access:'Private'}},
  {d:3,n:'3',id:'site-sw-3',x:214,y:1056,name:'COUNTERWEIGHT GARDENS',role:'vernacular ballast',
   v:{status:'Maintained',built:'Custom, undated',area:'6.7 ha',access:'Private'}},
  {d:4,n:'1',id:'site-se-1',x:952,y:912,name:'OVERSIGHT BUREAU',role:'tilt authority',
   v:{status:'Operational',built:'Present claimant',area:'1.5 ha',access:'Closed'}},
  {d:4,n:'2',id:'site-se-2',x:1072,y:934,name:'THE SEALED ARCHIVE',role:'reclamation records',
   v:{status:'Sealed',built:'Contractor era',area:'0.9 ha',access:'None'}},
  {d:4,n:'3',id:'site-se-3',x:960,y:1056,name:'PERMIT HALL',role:'building consent',
   v:{status:'Operational',built:'Present claimant',area:'1.1 ha',access:'Public, queued'}},
  {d:4,n:'4',id:'site-se-4',x:1084,y:1046,name:'TILT STATION SE',role:'ballast monitor',
   v:{status:'Unstaffed',built:'Contractor era',area:'0.05 ha',access:'Locked'}}
];

const BRIDGES=[
  {n:'A',id:'span-a',x:810,y:457,to:1,name:'CAUSEWAY A',role:'remembrance \u2013 sunyi',
   v:{status:'Operational',built:'Protectorate',area:'1.9 km span',access:'Checkpointed'}},
  {n:'B',id:'span-b',x:436,y:456,to:2,name:'CAUSEWAY B',role:'remembrance \u2013 interzone',
   v:{status:'Operational',built:'Company, rebuilt',area:'1.8 km span',access:'Open'}},
  {n:'C',id:'span-c',x:442,y:808,to:3,name:'CAUSEWAY C',role:'remembrance \u2013 concord',
   v:{status:'Operational',built:'Concession',area:'1.8 km span',access:'Load-restricted'}},
  {n:'D',id:'span-d',x:807,y:810,to:4,name:'CAUSEWAY D',role:'remembrance \u2013 sempadan jaya',
   v:{status:'Operational',built:'Present claimant',area:'1.9 km span',access:'Open'}}
];

/* ================= engine ================= */
const SEA=0, LAND=1, BUILT=2, ROAD=3;
/* ---- content database ----
   All authored text (site history notes + codec dialogue) lives in
   city-database.json, fetched at startup, rather than inline in this file.
   Falls back to a short notice if the fetch fails (e.g. opened as a bare
   local file rather than served). */
let DB = { hist:{}, dialogue:{}, intro:[] };
let dbReady = false;
async function loadDB(){
  try{
    const res = await fetch('city-database.json');
    if(!res.ok) throw new Error(res.status);
    DB = await res.json();
  } catch(e){
    console.warn('city-database.json not loaded (', e, ') — serve this folder over http(s) rather than opening the file directly.');
  }
  dbReady = true;
}

const canvas=document.getElementById('c'), ctx=canvas.getContext('2d');
const frame=document.getElementById('mapframe');
const sv=document.getElementById('sv'), svx=sv.getContext('2d');
let N=0, cells=null, owner=null, sheet=null;
let sel=null;

const dbLoad = loadDB();
const img=new Image();
img.onload=async ()=>{
  await dbLoad;
  N=img.width;
  const off=document.createElement('canvas'); off.width=N; off.height=N;
  const oc=off.getContext('2d',{willReadFrequently:true});
  oc.drawImage(img,0,0);
  const d=oc.getImageData(0,0,N,N).data;
  cells=new Uint8Array(N*N);
  for(let i=0;i<N*N;i++){
    const v=(d[i*4]+d[i*4+1]+d[i*4+2])/3;
    cells[i]= v<43?BUILT : v<128?SEA : v<213?ROAD : LAND;
  }
  partition();
  sheet=document.createElement('canvas'); sheet.width=N; sheet.height=N;
  paintSheet();
  drawPortraits(); buildMenus(); renderInfo(); say();
  document.getElementById('boot').remove();
  resize();
};
img.src='armature.png';

function partition(){
  owner=new Int8Array(N*N).fill(-1);
  const q=new Int32Array(N*N); let h=0,t=0;
  DISTRICTS.forEach((dd,k)=>{
    let [sx,sy]=dd.seed;
    if(cells[sy*N+sx]===SEA){
      outer: for(let r=1;r<70;r++)
        for(let oy=-r;oy<=r;oy++) for(let ox=-r;ox<=r;ox++){
          const nx=sx+ox, ny=sy+oy;
          if(nx<0||ny<0||nx>=N||ny>=N) continue;
          if(cells[ny*N+nx]!==SEA){ sx=nx; sy=ny; break outer; }
        }
    }
    const i=sy*N+sx; owner[i]=k; q[t++]=i;
  });
  while(h<t){
    const i=q[h++], k=owner[i], x=i%N, y=(i/N)|0;
    if(x>0){const j=i-1; if(cells[j]!==SEA&&owner[j]<0){owner[j]=k;q[t++]=j;}}
    if(x<N-1){const j=i+1; if(cells[j]!==SEA&&owner[j]<0){owner[j]=k;q[t++]=j;}}
    if(y>0){const j=i-N; if(cells[j]!==SEA&&owner[j]<0){owner[j]=k;q[t++]=j;}}
    if(y<N-1){const j=i+N; if(cells[j]!==SEA&&owner[j]<0){owner[j]=k;q[t++]=j;}}
  }
}
/* ---- the chart is the uploaded plan ----
   Its own four values are kept as drawn: sea #555, ground white, roads
   #aaa, buildings black. Selection only dims what is not selected; nothing
   is re-toned or re-textured.                                            */
const BAYER=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
function dith(x,y,d){ return BAYER[y&3][x&3] < d; }

const BASE={ sea:85, land:255, road:170, built:0 };
const TONE=[
  {land:255, road:170, built:0},
  {land:255, road:170, built:0},
  {land:255, road:170, built:0},
  {land:255, road:170, built:0},
  {land:255, road:170, built:0}
];

function paintSheet(){
  const sc=sheet.getContext('2d'), im=sc.createImageData(N,N);
  const hi = sel ? sel.d : null;
  for(let i=0;i<N*N;i++){
    const t=cells[i], k=owner[i];
    let v = t===SEA ? BASE.sea : t===LAND ? BASE.land : t===ROAD ? BASE.road : BASE.built;
    if(hi!==null){
      if(t===SEA) v=(v*0.48)|0;
      else if(k!==hi) v = t===BUILT ? 0 : (v*0.42)|0;   // unselected islands recede
      // the selected island keeps the plan's own values, untouched
    }
    im.data[i*4]=v; im.data[i*4+1]=v; im.data[i*4+2]=v; im.data[i*4+3]=255;
  }
  sc.putImageData(im,0,0);

}

/* the chart is letterboxed into its frame, sea filling the remainder */
let fitS=1, fitX=0, fitY=0;
function draw(){
  if(!sheet) return;
  const w=canvas.width, h=canvas.height;
  ctx.imageSmoothingEnabled=false;
  ctx.fillStyle = sel ? 'rgb(41,41,41)' : 'rgb(85,85,85)';
  ctx.fillRect(0,0,w,h);
  fitS=Math.min(w,h)/MAP;
  fitX=(w-MAP*fitS)/2; fitY=(h-MAP*fitS)/2;
  ctx.drawImage(sheet, fitX, fitY, MAP*fitS, MAP*fitS);
  drawMarkers();
}

/* markers live on top of the baked map, redrawn every frame so the
   unselected ones can pulse — a plain visual cue that they're clickable.
   The selected marker stays static (inverted, full size) so it doesn't
   compete with whichever one the person is meant to notice next. */
function drawMarkers(){
  const S=Math.max(15,Math.round(N/56))*fitS;
  // hard flip, not a tween: unselected markers swap white-on-black /
  // black-on-white twice a second, like a blinking cursor
  const flip = Math.floor(performance.now()/500)%2===0;
  const one=(wx,wy,label,on)=>{
    const x=fitX+wx*fitS, y=fitY+wy*fitS;
    const inverted = on ? true : flip;
    ctx.save();
    ctx.translate(x,y);
    ctx.fillStyle='#000'; ctx.fillRect(-S/2-4,-S/2-4,S+8,S+8);
    ctx.fillStyle='#fff'; ctx.fillRect(-S/2-2,-S/2-2,S+4,S+4);
    ctx.fillStyle= inverted?'#fff':'#141414'; ctx.fillRect(-S/2,-S/2,S,S);
    ctx.fillStyle= inverted?'#000':'#fff';
    ctx.font='bold '+Math.round(S*0.8)+'px DotGothic16, monospace';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(label, 0, S*0.04);
    ctx.restore();
  };
  BRIDGES.forEach((b,i)=> one(b.x,b.y,b.n, !!(sel&&sel.key==='b'+i)) );
  POI.forEach((p,i)=> one(p.x,p.y,p.n, !!(sel&&sel.key==='p'+i)) );
}

(function pulseLoop(){
  if(sheet) draw();
  requestAnimationFrame(pulseLoop);
})();
function resize(){
  const r=frame.getBoundingClientRect();
  const dpr=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(r.width*dpr); canvas.height=Math.round(r.height*dpr);
  const b=sv.getBoundingClientRect();
  sv.width=Math.max(1,Math.round(b.width)); sv.height=Math.max(1,Math.round(b.height));
  draw(); drawSiteView();
}
window.addEventListener('resize',resize);

/* ---- site view: a pixel-art elevation, built from the site's own facts ---- */
function hsh(a,b){ let h=Math.imul(a|0,374761393)^Math.imul(b|0,668265263);
  h=Math.imul(h^(h>>>13),1274126177); return ((h^(h>>>16))>>>0)/4294967296; }

/* ---- real site-view images, one per id, with procedural fallback ----
   If views/<id>.png exists it is drawn as-is (nearest-neighbour scaled to
   the panel). Anything without a file falls through to the generated
   elevation below, so sites can be swapped in one at a time. */
const FOCAL={};  // e.g. FOCAL['site-re-1']={x:0.49,y:0.5}
const VIEW_IMAGES={};
function viewSrc(id){ return 'views/'+id+'.png'; }

function ensureView(id){
  let rec=VIEW_IMAGES[id];
  if(rec) return rec;
  rec={status:'pending', img:null};
  VIEW_IMAGES[id]=rec;
  const img=new Image();
  img.onload =()=>{ rec.status='ok';    rec.img=img; if(sel && sel.o && sel.o.id===id) drawSiteView(); };
  img.onerror=()=>{ rec.status='error'; if(sel && sel.o && sel.o.id===id) drawSiteView(); };
  img.src=viewSrc(id);
  return rec;
}

function drawSiteView(){
  const W=sv.width, H=sv.height;
  svx.imageSmoothingEnabled=false;
  const g=(v)=>'rgb('+v+','+v+','+v+')';
  svx.fillStyle=g(12); svx.fillRect(0,0,W,H);

  if(!sel || sel.kind==='district'){
    for(let y=0;y<H;y++) for(let x=0;x<W;x++)
      if(dith(x,y,3)){ svx.fillStyle=g(56); svx.fillRect(x,y,1,1); }
    svx.fillStyle=g(0); svx.fillRect(0,(H>>1)-11,W,22);
    svx.fillStyle=g(200); svx.font='8px DotGothic16, monospace'; svx.textAlign='center';
    svx.fillText(sel?sel.o.name:'NO SITE SELECTED', W/2, (H>>1)+3);
    return;
  }

  const o=sel.o, d=DISTRICTS[sel.d], seed=(sel.d+1)*97+o.name.length*13+o.n.charCodeAt(0);

  const view=ensureView(o.id);
  if(view.status==='ok'){
    svx.imageSmoothingEnabled=false;
    svx.fillStyle='#000'; svx.fillRect(0,0,W,H);

    // centre cover-crop: scale so the image fully fills the panel on its
    // shorter axis, then crop whatever overhangs on the longer one, taken
    // equally off both sides. Source images are drawn wide (320x180-ish)
    // with their subject centred, so the crop trims background, not it.
    const subj=view.img;
    const scale=Math.max(W/subj.width, H/subj.height);
    const dw=subj.width*scale, dh=subj.height*scale;
    // crop centres on the subject's own focal point (default dead-centre);
    // with the panel now locked to the same 16:9 as the source images this
    // rarely has anything to trim, but it's here for anything off-ratio
    const focal = FOCAL[o.id] || {x:0.5, y:0.5};
    const dx = -(dw-W)*focal.x, dy = -(dh-H)*focal.y;
    svx.drawImage(subj, dx, dy, dw, dh);
    return;
  }

  const px=Math.max(2,Math.round(Math.min(W,H)/56));
  const horizon=Math.round(H*0.58);
  const tn=TONE[sel.d];

  // sky, four bands lightening toward the horizon
  [26,44,66,92].forEach((v,i)=>{ svx.fillStyle=g(v);
    svx.fillRect(0, Math.round(horizon*i/4), W, Math.ceil(horizon/4)+1); });
  // water
  svx.fillStyle=g(38); svx.fillRect(0, horizon-Math.round(H*0.055), W, Math.round(H*0.055));
  svx.fillStyle=g(64);
  for(let y=horizon-Math.round(H*0.055); y<horizon; y+=3) svx.fillRect(0,y,W,1);
  // ground
  svx.fillStyle=g(226); svx.fillRect(0,horizon,W,H-horizon);
  svx.fillStyle=g(178);
  for(let y=horizon;y<H;y+=px*3) svx.fillRect(0,y,W,1);

  // background massing
  const n = d.id==='ne'?9 : d.id==='nw'?13 : d.id==='sw'?5 : 7;
  for(let i=0;i<n;i++){
    const r1=hsh(seed,i*3+1), r2=hsh(seed,i*3+2), r3=hsh(seed,i*3+3);
    const bw=Math.round((d.id==='sw'?0.16:d.id==='nw'?0.07:0.11)*W*(0.6+r1*0.9));
    const bh=Math.round(H*(d.id==='ne'?0.13+r2*0.10 : d.id==='se'?0.20+r2*0.22 : 0.10+r2*0.26));
    const bx=Math.round(r3*(W-bw)), by=horizon-bh;
    const face=[30,52,74][i%3];
    svx.fillStyle=g(150); svx.fillRect(bx-1,by-1,bw+2,bh+2);     // edge highlight
    svx.fillStyle=g(face); svx.fillRect(bx,by,bw,bh);
    svx.fillStyle=g(Math.max(0,face-18));                        // shaded flank
    svx.fillRect(bx+Math.round(bw*0.62),by,Math.round(bw*0.38),bh);
    svx.fillStyle=g(214);
    const cols=Math.max(1,Math.floor(bw/(px*4))), rows=Math.max(1,Math.floor(bh/(px*5)));
    for(let cx=0;cx<cols;cx++) for(let cy=0;cy<rows;cy++){
      if(hsh(seed+i,cx*31+cy)>0.62) continue;
      svx.fillRect(bx+px+cx*px*4, by+px*2+cy*px*5, px*2, px*2);
    }
  }

  const fw=Math.round(W*0.24), fh=Math.round(H*0.32);
  const fx=Math.round(W/2-fw/2), fy=horizon-fh;
  if(sel.kind==='span'){
    const dy=horizon-Math.round(H*0.11), dh=Math.round(H*0.11);
    svx.fillStyle=g(180); svx.fillRect(0,dy,W,px*3);
    svx.fillStyle=g(60);  svx.fillRect(0,dy+px,W,px);
    for(let x=px*4;x<W;x+=px*14){
      svx.fillStyle=g(150); svx.fillRect(x-1,dy,px*2+2,dh);
      svx.fillStyle=g(42);  svx.fillRect(x,dy,px*2,dh);
    }
  } else if(o.v.status==='Unbuilt' || o.v.status==='Open ground'){
    svx.fillStyle=g(150);
    svx.fillRect(fx-px*2,horizon-Math.round(H*0.10),fw+px*4,Math.round(H*0.10));
    for(let i=0;i<34;i++){
      const rx=fx+Math.round(hsh(seed,100+i)*fw), ry=horizon-Math.round(hsh(seed,200+i)*H*0.08);
      svx.fillStyle=g([90,130,170][i%3]);
      svx.fillRect(rx,ry,px*(1+Math.round(hsh(seed,300+i)*2)),px);
    }
  } else {
    svx.fillStyle=g(206); svx.fillRect(fx-2,fy-2,fw+4,fh+4);
    svx.fillStyle=g(26);  svx.fillRect(fx,fy,fw,fh);
    svx.fillStyle=g(14);  svx.fillRect(fx+Math.round(fw*0.66),fy,Math.round(fw*0.34),fh);
    svx.fillStyle=g(226);
    for(let cy=0;cy<Math.floor(fh/(px*5));cy++)
      for(let cx=0;cx<Math.floor(fw/(px*4));cx++){
        if(hsh(seed+999,cx*17+cy)>0.55) continue;
        svx.fillRect(fx+px+cx*px*4, fy+px*2+cy*px*5, px*2, px*3);
      }
  }
}

/* ---- portraits ----
   Three frames per speaker: normal, talking, blinking. The talk frame
   alternates while a line is typing, blinks fire on a slow random timer,
   and both fall back to normal.                                          */
const FRAMES={
  L:{ normal:new Image(), talk:new Image(), blink:new Image() },
  R:{ normal:new Image(), talk:new Image(), blink:new Image() }
};
FRAMES.L.normal.src='portraits/rawi-normal.png';
FRAMES.L.talk.src  ='portraits/rawi-talk.png';
FRAMES.L.blink.src ='portraits/rawi-blink.png';
FRAMES.R.normal.src='portraits/adler-normal.png';
FRAMES.R.talk.src  ='portraits/adler-talk.png';
FRAMES.R.blink.src ='portraits/adler-blink.png';

const CANV={ L:document.getElementById('pL'), R:document.getElementById('pR') };
const state={ L:{talking:false,blink:false,phase:0}, R:{talking:false,blink:false,phase:0} };

function paintPortrait(side){
  const cv=CANV[side], g=cv.getContext('2d');
  const st=state[side], f=FRAMES[side];
  let img = f.normal;
  if(st.blink && f.blink.complete) img=f.blink;
  else if(st.talking && st.phase && f.talk.complete) img=f.talk;
  g.imageSmoothingEnabled=false;
  g.clearRect(0,0,cv.width,cv.height);
  if(img.complete && img.naturalWidth) g.drawImage(img,0,0,cv.width,cv.height);
}
function drawPortraits(){
  ['L','R'].forEach(side=>{
    Object.values(FRAMES[side]).forEach(im=>{ im.onload=()=>paintPortrait(side); });
    paintPortrait(side);
  });
  document.getElementById('nmL').innerHTML='<b>'+SPEAKERS.L.name+'</b><br>'+SPEAKERS.L.role;
  document.getElementById('nmR').innerHTML='<b>'+SPEAKERS.R.name+'</b><br>'+SPEAKERS.R.role;
}

/* mouth flap while typing */
setInterval(()=>{
  ['L','R'].forEach(side=>{
    if(!state[side].talking) return;
    state[side].phase = state[side].phase ? 0 : 1;
    paintPortrait(side);
  });
}, 110);

/* blinks, independent per speaker */
['L','R'].forEach(side=>{
  const schedule=()=>{
    setTimeout(()=>{
      state[side].blink=true; paintPortrait(side);
      setTimeout(()=>{ state[side].blink=false; paintPortrait(side); schedule(); }, 110);
    }, 2200+Math.random()*4200);
  };
  schedule();
});

/* ---- neutral record ---- */
function renderInfo(){
  const el=document.getElementById('info');
  if(!sel){
    el.innerHTML = '<div class="frag">'
      + '&ldquo;&hellip;the five reclamations are to be administered as one instrument, '
      + 'notwithstanding any subsequent dispute as to sovereignty.&rdquo;'
      + '<div class="src">&mdash; concession clause, undated, contractor unknown</div></div>';
    return;
  }
  const o=sel.o;
  const dbId = sel.kind==='district' ? o.dbId : o.id;
  const text = DB.hist[dbId] || '';
  el.innerHTML='<h4>'+o.name+'</h4><div class="bd">'+text+'</div>';
}

/* ---- transcript: both voices, in sequence ---- */
let script=[], step=0, typing=null;
function say(){
  if(!sel){
    script = (DB.intro && DB.intro.length) ? DB.intro : [
      {s:'R', t:'(city-database.json not loaded)'}
    ];
  } else if(sel.kind==='district'){
    const d=sel.o;
    script=[
      {s:'R', t:'Tuning on '+d.name+'. Charted as '+d.sub.toLowerCase()+'. '+POI.filter(p=>p.d===sel.d).length+' sites logged, ballast-paired with '+d.pair.toLowerCase()+'.'},
      {s:'L', t:'Pick one. What is said about a place and what is true about it are two different records, and you are going to want both.'}
    ];
  } else {
    const o=sel.o;
    script = DB.dialogue[o.id] && DB.dialogue[o.id].length ? DB.dialogue[o.id] : [
      {s:'R', t:'(no dialogue recorded for '+o.name+')'}
    ];
  }
  step=0; showStep();
}
function showStep(){
  if(typing){ clearInterval(typing); typing=null; }
  state.L.talking=false; state.R.talking=false;
  const s=script[step];
  state[s.s].talking=true;
  document.getElementById('who').textContent=SPEAKERS[s.s].name;
  document.getElementById('portL').classList.toggle('on', s.s==='L');
  document.getElementById('portR').classList.toggle('on', s.s==='R');
  const el=document.getElementById('line'); el.textContent='';
  let i=0;
  typing=setInterval(()=>{ el.textContent=s.t.slice(0,++i);
    if(i>=s.t.length){ clearInterval(typing); typing=null;
      state.L.talking=false; state.R.talking=false;
      state.L.phase=0; state.R.phase=0; paintPortrait('L'); paintPortrait('R');
      adv(); } },13);
  document.getElementById('adv').textContent='';
}
function adv(){
  document.getElementById('adv').textContent = step<script.length-1 ? '\u25bc  CLICK / SPACE' : '\u25a0  END';
}
function advance(){
  if(typing){ clearInterval(typing); typing=null;
    state.L.talking=false; state.R.talking=false;
    state.L.phase=0; state.R.phase=0; paintPortrait('L'); paintPortrait('R');
    document.getElementById('line').textContent=script[step].t; adv(); return; }
  if(step<script.length-1){ step++; showStep(); }
}
document.getElementById('talkbox').addEventListener('click',advance);

/* ---- selection ---- */
function pick(key){
  if(sel && sel.key===key) sel=null;
  else if(key[0]==='p'){ const p=POI[+key.slice(1)]; sel={key,kind:'site',d:p.d,o:p}; }
  else if(key[0]==='b'){ const b=BRIDGES[+key.slice(1)]; sel={key,kind:'span',d:b.to,o:b}; }
  else { const k=+key.slice(1); sel={key,kind:'district',d:k,o:DISTRICTS[k]}; }
  paintSheet(); draw(); drawSiteView(); buildMenus(); renderInfo(); say();
}
canvas.addEventListener('click',e=>{
  const r=canvas.getBoundingClientRect();
  const dpr=canvas.width/r.width;
  const mx=((e.clientX-r.left)*dpr-fitX)/fitS, my=((e.clientY-r.top)*dpr-fitY)/fitS;
  let hit=null, bd=34;
  POI.forEach((p,i)=>{ const d=Math.hypot(p.x-mx,p.y-my); if(d<bd){bd=d;hit='p'+i;} });
  BRIDGES.forEach((b,i)=>{ const d=Math.hypot(b.x-mx,b.y-my); if(d<bd){bd=d;hit='b'+i;} });
  if(hit){ pick(hit); return; }
  const gx=Math.floor(mx), gy=Math.floor(my);
  if(gx<0||gy<0||gx>=N||gy>=N) return;
  const i=gy*N+gx;
  if(cells[i]===SEA||owner[i]<0) return;
  pick('d'+owner[i]);
});

function buildMenus(){
  // no clickable list any more — navigation is by clicking the chart itself.
  // this just keeps the hint strip in the map's corner up to date.
  const hint=document.getElementById('maphint');
  if(hint){
    hint.textContent = !sel ? 'SELECT AN ISLAND OR CLICK A MARKER'
      : sel.kind==='district' ? 'SELECT A SITE, OR CLICK A MARKER ON THE CHART'
      : sel.o.name + '  \u2014  ' + DISTRICTS[sel.d].name;
  }
}
function clearSel(){
  sel=null; paintSheet(); draw(); drawSiteView(); buildMenus(); renderInfo(); say();
}


window.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(k===' '){ e.preventDefault(); advance(); return; }
  if(k==='escape'){ clearSel(); return; }
  const di=DISTRICTS.findIndex(d=>d.hk===k);
  if(di>=0){ pick('d'+di); return; }
  if(sel && '1234'.includes(k)){
    const i=POI.findIndex(p=>p.d===sel.d && p.n===k);
    if(i>=0) pick('p'+i);
  }
});
