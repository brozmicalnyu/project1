
const MAP=1254; // armature.png is 1254x1254; every x/y below is in these pixels

// ---- data ----
const SPEAKERS={ // L = left portrait, R = right portrait
  L:{ name:'RAWI', role:'smuggler boss,<br><span>the Interzone</span>' },
  R:{ name:'ADLER', role:'forensic architect,<br><span>off-island</span>' }
};

const DISTRICTS=[ // the five islands; dbId keys their text and their mask/view files
  { id:'core', dbId:'island-core', name:'REMEMBRANCE', sub:'INGATAN' },
  { id:'ne', dbId:'island-ne', name:'SILENCE', sub:'UNNAMED ON CHART' },
  { id:'nw', dbId:'island-nw', name:'THE INTERZONE', sub:'COMPANY ROADS' },
  { id:'sw', dbId:'island-sw', name:'FOREVER', sub:'REPUBLIC NAME' },
  { id:'se', dbId:'island-se', name:'TESTAMENT', sub:'CONTESTED NAME' }
];

const POI=[ // sites: d = island index, n = marker label, x/y = position on the chart
  {d:0,n:'1',id:'site-re-1',x:620,y:633,name:'THE VOID'},
  {d:0,n:'2',id:'site-re-2',x:604,y:522,name:'THE WATCHTOWER'},

  {d:1,n:'1',id:'site-ne-1',x:1020,y:265,name:'THE EYE'},
  {d:1,n:'2',id:'site-ne-2',x:1072,y:322,name:'THE LONG ROWS'},

  {d:2,n:'1',id:'site-nw-1',x:76,y:247,name:'THE LOW SPACES'},
  {d:2,n:'2',id:'site-nw-3',x:214,y:352,name:'PORTSIDE'},

  {d:3,n:'1',id:'site-sw-1',x:200,y:912,name:'HOMELAND'},
  {d:3,n:'2',id:'site-sw-2',x:312,y:972,name:'THE GARDENS'},

  {d:4,n:'1',id:'site-se-1',x:952,y:912,name:'THE REGISTRY'},
  {d:4,n:'2',id:'site-se-2',x:1072,y:934,name:'THE TESTIMONIES',nomad:true} // nomad: moves when you look away
];

const BRIDGES=[ // causeways: to = the island each one leads to
  {n:'A',id:'span-a',x:810,y:457,to:1,name:'CAUSEWAY A'},
  {n:'B',id:'span-b',x:436,y:456,to:2,name:'CAUSEWAY B'},
  {n:'C',id:'span-c',x:442,y:808,to:3,name:'CAUSEWAY C'},
  {n:'D',id:'span-d',x:807,y:810,to:4,name:'CAUSEWAY D'}
];

// ---- text ----
let DB = { hist:{}, dialogue:{}, intro:[] }; // all writing lives in city-database.json, not here
async function loadDB(){
  try{
    const res = await fetch('city-database.json');
    if(!res.ok) throw new Error(res.status);
    DB = await res.json();
  } catch(e){ // opened as a local file, not served: panels fall back to empty
    console.warn('city-database.json not loaded (', e, ') — serve this folder over http(s) rather than opening the file directly.');
  }
}

const canvas=document.getElementById('c'), ctx=canvas.getContext('2d');
const frame=document.getElementById('mapframe');
const sv=document.getElementById('sv'), svx=sv.getContext('2d');
let N=0, sheet=null, lit=null; // map size, the drawn chart, and a scratch layer for the lit island
let sel=null; // what's selected: an island, a site or a span

// ---- islands ----
// each island is a mask png (white = island), edited in photoshop, not code
const MASKS=[]; // MASKS[k] belongs to DISTRICTS[k]
function maskSrc(k){ return 'masks/'+DISTRICTS[k].dbId+'.png'; }
function loadImage(src){ // resolves to null if the file is missing
  return new Promise(res=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>res(null); i.src=src; });
}

const probe=document.createElement('canvas'); probe.width=probe.height=1; // 1px canvas for reading a mask
const probeX=probe.getContext('2d',{willReadFrequently:true});
function islandAt(x,y){ // which island is under this pixel, -1 for sea
  for(let k=0;k<MASKS.length;k++){
    if(!MASKS[k]) continue;
    probeX.clearRect(0,0,1,1);
    probeX.drawImage(MASKS[k], x,y,1,1, 0,0,1,1);
    if(probeX.getImageData(0,0,1,1).data[3]>0) return k;
  }
  return -1;
}

// ---- nomadic sites ----
// the testimonies have no address: look away and they're somewhere new
const landCache={}; // inland points per island, worked out once
function landPoints(k){ // every inland point on island k, from its mask
  if(landCache[k]) return landCache[k];
  const m=MASKS[k]; if(!m) return (landCache[k]=[]);
  const c=document.createElement('canvas'); c.width=m.width; c.height=m.height;
  const cx=c.getContext('2d'); cx.drawImage(m,0,0);
  const a=cx.getImageData(0,0,c.width,c.height).data, W=c.width, H=c.height;
  const on=(x,y)=> x>=0&&y>=0&&x<W&&y<H && a[(y*W+x)*4+3]>0;
  const pts=[], STEP=6, INSET=18; // STEP = sample spacing, INSET = distance kept from the coast
  for(let y=0;y<H;y+=STEP) for(let x=0;x<W;x+=STEP)
    if(on(x,y)&&on(x-INSET,y)&&on(x+INSET,y)&&on(x,y-INSET)&&on(x,y+INSET)) pts.push([x,y]);
  return (landCache[k]=pts);
}
function relocate(p){ // move a nomad to fresh ground
  const pts=landPoints(p.d); if(!pts.length) return;
  p.seen=p.seen||[[p.x,p.y]]; // everywhere it has been
  const others=POI.filter(q=>q!==p).concat(BRIDGES);
  const clear=(x,y,far)=> others.every(q=>Math.hypot(q.x-x,q.y-y)>=45) // never on top of another marker
                       && p.seen.every(([sx,sy])=>Math.hypot(sx-x,sy-y)>=far);
  let spot=null;
  for(const far of [60,30,12]){ // distance from old spots, relaxed only if the island runs out
    const ok=pts.filter(([x,y])=>clear(x,y,far));
    if(ok.length){ spot=ok[Math.floor(Math.random()*ok.length)]; break; }
  }
  if(!spot) return;
  p.x=spot[0]; p.y=spot[1]; p.seen.push(spot);
}
function lookAway(prev){ // moves a nomad once it stops being looked at
  if(prev && prev.kind==='site' && prev.o.nomad && (!sel || sel.o!==prev.o)) relocate(prev.o);
}

// ---- start-up ----
const dbLoad = loadDB();
const img=new Image(); // the chart itself
img.onload=async ()=>{
  await dbLoad;
  N=img.width;
  const found=await Promise.all(DISTRICTS.map((d,k)=>loadImage(maskSrc(k))));
  found.forEach((m,k)=>{ MASKS[k]=m; });
  sheet=document.createElement('canvas'); sheet.width=N; sheet.height=N;
  lit=document.createElement('canvas');   lit.width=N;   lit.height=N;
  paintSheet();
  drawPortraits(); updateHint(); renderInfo(); say();
  document.getElementById('boot').remove(); // hide LOADING CHART
  resize();
};
img.src='armature.png';

// ---- chart ----
// the plan is shown exactly as drawn; selecting only dims what isn't chosen
const BAYER=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
function dith(x,y,d){ return BAYER[y&3][x&3] < d; } // ordered dither: true for d of every 16 pixels

function paintSheet(){
  const sc=sheet.getContext('2d');
  sc.clearRect(0,0,N,N);
  sc.drawImage(img,0,0); // the plan, untouched
  if(!sel || !MASKS[sel.d]) return;
  sc.fillStyle='rgba(0,0,0,0.55)'; // dim everything...
  sc.fillRect(0,0,N,N);
  const lc=lit.getContext('2d'); // ...then cut the selected island back out at full strength
  lc.globalCompositeOperation='source-over';
  lc.clearRect(0,0,N,N);
  lc.drawImage(img,0,0);
  lc.globalCompositeOperation='destination-in';
  lc.drawImage(MASKS[sel.d],0,0);
  sc.drawImage(lit,0,0);
}

let fitS=1, fitX=0, fitY=0; // scale and offset of the chart inside its frame
function draw(){
  if(!sheet) return;
  const w=canvas.width, h=canvas.height;
  ctx.imageSmoothingEnabled=false;
  ctx.fillStyle = sel ? 'rgb(41,41,41)' : 'rgb(85,85,85)'; // sea colour around the square chart, dimmed with it
  ctx.fillRect(0,0,w,h);
  fitS=Math.min(w,h)/MAP;
  fitX=(w-MAP*fitS)/2; fitY=(h-MAP*fitS)/2;
  ctx.drawImage(sheet, fitX, fitY, MAP*fitS, MAP*fitS);
  drawMarkers();
}

function drawMarkers(){ // redrawn every frame so unselected markers can blink
  const S=Math.max(15,Math.round(N/56))*fitS;
  const flip = Math.floor(performance.now()/500)%2===0; // hard on/off twice a second, like a cursor
  const one=(wx,wy,label,on)=>{
    const x=fitX+wx*fitS, y=fitY+wy*fitS;
    const inverted = on ? true : flip; // the selected one holds still
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

(function pulseLoop(){ // keeps the markers blinking
  if(sheet) draw();
  requestAnimationFrame(pulseLoop);
})();
function resize(){ // match canvases to their frames, sharp on retina
  const r=frame.getBoundingClientRect();
  const dpr=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(r.width*dpr); canvas.height=Math.round(r.height*dpr);
  const b=sv.getBoundingClientRect();
  sv.width=Math.max(1,Math.round(b.width)); sv.height=Math.max(1,Math.round(b.height));
  draw(); drawSiteView();
}
window.addEventListener('resize',resize);

// ---- view panel ----
// views/<id>.png for sites, views/island-<id>.png for islands; no file = name card
const FOCAL={}; // optional crop centre per image, e.g. FOCAL['site-re-1']={x:0.49,y:0.5}
const VIEW_IMAGES={}; // loaded images, cached by id
function viewSrc(id){ return 'views/'+id+'.png'; }

function viewKey(){ return !sel ? null : sel.kind==='district' ? sel.o.dbId : sel.o.id; } // which image the selection wants

function ensureView(id){ // load once; redraw when it arrives if still wanted
  let rec=VIEW_IMAGES[id];
  if(rec) return rec;
  rec={status:'pending', img:null};
  VIEW_IMAGES[id]=rec;
  const img=new Image();
  img.onload =()=>{ rec.status='ok';    rec.img=img; if(viewKey()===id) drawSiteView(); };
  img.onerror=()=>{ rec.status='error'; if(viewKey()===id) drawSiteView(); };
  img.src=viewSrc(id);
  return rec;
}

function drawSiteView(){
  const W=sv.width, H=sv.height;
  svx.imageSmoothingEnabled=false;
  svx.fillStyle='rgb(12,12,12)'; svx.fillRect(0,0,W,H);

  const card=(label)=>{ // dithered stand-in with a caption
    svx.fillStyle='rgb(56,56,56)';
    for(let y=0;y<H;y++) for(let x=0;x<W;x++)
      if(dith(x,y,3)) svx.fillRect(x,y,1,1);
    svx.fillStyle='#000'; svx.fillRect(0,(H>>1)-11,W,22);
    svx.fillStyle='rgb(200,200,200)'; svx.font='8px DotGothic16, monospace'; svx.textAlign='center';
    svx.fillText(label, W/2, (H>>1)+3);
  };

  if(!sel){ card('NO SITE SELECTED'); return; }
  const o=sel.o;
  const view=ensureView(viewKey());
  if(view.status==='pending') return; // stay dark while loading, so the card never flashes
  if(view.status!=='ok'){ card(o.name); return; } // no image yet

  const subj=view.img;
  const scale=Math.max(W/subj.width, H/subj.height); // cover-crop: fill the panel, trim the overhang
  const dw=subj.width*scale, dh=subj.height*scale;
  const focal = FOCAL[o.id] || {x:0.5, y:0.5}; // default: crop from the centre
  const dx = -(dw-W)*focal.x, dy = -(dh-H)*focal.y;
  svx.drawImage(subj, dx, dy, dw, dh);
}

// ---- portraits ----
const FRAMES={ // three frames each: normal, talking, blinking
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
const state={ L:{talking:false,blink:false,phase:0}, R:{talking:false,blink:false,phase:0} }; // phase flips the mouth open/shut

function paintPortrait(side){ // blink beats talk beats normal
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

setInterval(()=>{ // mouth flaps while a line types
  ['L','R'].forEach(side=>{
    if(!state[side].talking) return;
    state[side].phase = state[side].phase ? 0 : 1;
    paintPortrait(side);
  });
}, 110);

['L','R'].forEach(side=>{ // blinks on a random timer, each speaker separately
  const schedule=()=>{
    setTimeout(()=>{
      state[side].blink=true; paintPortrait(side);
      setTimeout(()=>{ state[side].blink=false; paintPortrait(side); schedule(); }, 110);
    }, 2200+Math.random()*4200);
  };
  schedule();
});

// ---- site panel ----
function renderInfo(){
  const el=document.getElementById('info');
  if(!sel){ // nothing selected: the lanting saying
    el.innerHTML = '<div class="frag">&ldquo;Our word for world is word.&rdquo;'
      + '<div class="src">&mdash; traditional Lanting saying</div></div>';
    return;
  }
  const o=sel.o;
  const dbId = sel.kind==='district' ? o.dbId : o.id;
  const text = unread(DB.hist[dbId] || '', sel.kind==='district' ? 0 : unreadLevel); // island text never unreads
  el.innerHTML='<h4>'+o.name+'</h4>'+siteBody(text);
}

function siteBody(text){ // verse, blank line, paragraph -> one block per verse line
  const cut=text.indexOf('\n\n');
  if(cut<0) return '<div class="bd">'+text+'</div>'; // no verse: paragraph only
  const verse=text.slice(0,cut).split('\n').map(l=>'<div class="vl">'+l+'</div>').join('');
  return '<div class="verse">'+verse+'</div><div class="bd">'+text.slice(cut+2).trim()+'</div>';
}

// ---- codec ----
let script=[], step=0, typing=null; // the lines, which one is showing, the typewriter timer
function say(){ // pick the lines for whatever is selected
  if(!sel){
    script = (DB.intro && DB.intro.length) ? DB.intro : [
      {s:'R', t:'(city-database.json not loaded)'}
    ];
  } else if(sel.kind==='district'){ // islands share one generated exchange
    const d=sel.o;
    script=[
      {s:'R', t:'Tuning on '+d.name+'. '+POI.filter(p=>p.d===sel.d).length+' sites logged.'},
      {s:'L', t:'Pick one. What is said about a place and what is true about it are two different records, and you are going to want both.'}
    ];
  } else {
    const o=sel.o;
    script = DB.dialogue[o.id] && DB.dialogue[o.id].length
      ? DB.dialogue[o.id].map(l=>({s:l.s, t:unread(l.t, unreadLevel)}))
      : [ {s:'R', t:'(no dialogue recorded for '+o.name+')'} ];
  }
  step=0; showStep();
}
function showStep(){ // type one line out, letter by letter
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
function adv(){ // the prompt under the line
  document.getElementById('adv').textContent = step<script.length-1 ? '\u25bc  CLICK / SPACE' : '\u25a0  END';
}
function advance(){ // click or space: finish the line, or go to the next
  if(typing){ clearInterval(typing); typing=null;
    state.L.talking=false; state.R.talking=false;
    state.L.phase=0; state.R.phase=0; paintPortrait('L'); paintPortrait('R');
    document.getElementById('line').textContent=script[step].t; adv(); return; }
  if(step<script.length-1){ step++; showStep(); }
}
document.getElementById('talkbox').addEventListener('click',advance);

// ---- the unreading ----
// after a full pass over every marker, each new pass blanks more words:
// round 1 adds a (___), round 2 blanks half, round 3 blanks all
// to test, type  round = 2  in the browser console
const BLANK='(___)';
const MARKER_TOTAL = POI.length + BRIDGES.length; // sites and spans both count
const seenFirst = new Set(); // markers clicked in the first pass
let round = 0; // 0 = first pass, 1-3 = unreading rounds
let roundSeen = new Set(); // markers clicked this round
let unreadLevel = 0; // level shown on screen now

function noteVisit(key){ // count a click toward the next round
  unreadLevel = round; // this click shows the current round
  if(round===0){
    seenFirst.add(key);
    if(seenFirst.size>=MARKER_TOTAL){ round=1; roundSeen=new Set(); }
  } else {
    roundSeen.add(key);
    if(roundSeen.size>=MARKER_TOTAL && round<3){ round++; roundSeen=new Set(); }
  }
}

function shuffled(a){ // copy, shuffled
  a=a.slice();
  for(let k=a.length-1;k>0;k--){ const j=Math.floor(Math.random()*(k+1)); [a[k],a[j]]=[a[j],a[k]]; }
  return a;
}

function unread(text, level){ // blank words at this level, keep spacing and punctuation
  if(!level || !text) return text;
  const parts=text.split(/(\s+)/); // words and spaces, line breaks kept
  const words=[];
  parts.forEach((t,i)=>{ if(t && !/^\s+$/.test(t) && /[\p{L}\p{N}]/u.test(t)) words.push(i); }); // a (___) already there isn't a word
  if(!words.length) return text;
  const blank=(tok)=>{ // swap the word, keep its punctuation
    const m=tok.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u);
    return m[1]+BLANK+m[3];
  };
  if(level>=3){
    words.forEach(i=>{ parts[i]=blank(parts[i]); });
  } else if(level===2){
    shuffled(words).slice(0,Math.floor(words.length/2)).forEach(i=>{ parts[i]=blank(parts[i]); });
  } else {
    const gaps=words.slice(0,-1); // a (___) can follow any word but the last
    const n=Math.max(1,Math.round(gaps.length/4));
    shuffled(gaps).slice(0,n).forEach(i=>{ parts[i]=parts[i]+' '+BLANK; });
  }
  return parts.join('');
}

// ---- selection ----
function pick(key){ // select a site (p), span (b) or island (d); same key again deselects
  const prev=sel;
  if(sel && sel.key===key) sel=null;
  else if(key[0]==='p'){ const p=POI[+key.slice(1)]; sel={key,kind:'site',d:p.d,o:p}; }
  else if(key[0]==='b'){ const b=BRIDGES[+key.slice(1)]; sel={key,kind:'span',d:b.to,o:b}; }
  else { const k=+key.slice(1); sel={key,kind:'district',d:k,o:DISTRICTS[k]}; }
  lookAway(prev);
  unreadLevel=0; // islands always read clean
  if(sel && (sel.kind==='site'||sel.kind==='span')) noteVisit(sel.key);
  paintSheet(); draw(); drawSiteView(); updateHint(); renderInfo(); say();
}
canvas.addEventListener('click',e=>{ // markers first, then whichever island was clicked
  const r=canvas.getBoundingClientRect();
  const dpr=canvas.width/r.width;
  const mx=((e.clientX-r.left)*dpr-fitX)/fitS, my=((e.clientY-r.top)*dpr-fitY)/fitS;
  let hit=null, bd=34; // click radius around a marker, in chart pixels
  POI.forEach((p,i)=>{ const d=Math.hypot(p.x-mx,p.y-my); if(d<bd){bd=d;hit='p'+i;} });
  BRIDGES.forEach((b,i)=>{ const d=Math.hypot(b.x-mx,b.y-my); if(d<bd){bd=d;hit='b'+i;} });
  if(hit){ pick(hit); return; }
  const gx=Math.floor(mx), gy=Math.floor(my);
  if(gx<0||gy<0||gx>=N||gy>=N) return;
  const k=islandAt(gx,gy);
  if(k>=0) pick('d'+k);
});

function updateHint(){ // the hint strip in the chart's corner
  const hint=document.getElementById('maphint');
  if(hint){
    hint.textContent = !sel ? 'SELECT AN ISLAND OR CLICK A MARKER'
      : sel.kind==='district' ? 'SELECT A SITE, OR CLICK A MARKER ON THE CHART'
      : sel.o.name + '  \u2014  ' + DISTRICTS[sel.d].name;
  }
}
function clearSel(){ // escape: select nothing
  const prev=sel; sel=null; lookAway(prev); paintSheet(); draw(); drawSiteView(); updateHint(); renderInfo(); say();
}

window.addEventListener('keydown',e=>{ // space advances the codec, escape clears
  const k=e.key.toLowerCase();
  if(k===' '){ e.preventDefault(); advance(); return; }
  if(k==='escape'){ clearSel(); return; }
});
