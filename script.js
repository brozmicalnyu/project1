
const MAP=1254; // armature.png is 1254x1254; every x/y below is in these pixels

// ---- data ----
const SPEAKERS={ // L = left portrait, R = right portrait
  L:{ name:'RAWI', role:'smuggler boss,<br><span>the Interzone</span>' },
  R:{ name:'ADLER', role:'forensic architect,<br><span>off-island</span>' }
};

const ISLANDS=['REMEMBRANCE','SILENCE','THE INTERZONE','FOREVER','TESTAMENT']; // named in the hint strip

const POI=[ // sites: d = index into ISLANDS, n = marker label, x/y = position on the chart
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
let N=0; // map size, set once the chart loads
let sel=null; // the selected site, or null

// ---- nomadic sites ----
// the testimonies have no address: look away and they're somewhere new
const NOMAD_SPOTS=[ // hand-picked inland spots on testament, all clear of the registry
  [1072,934],[942,1002],[822,1038],[1026,846],[1068,1074],[858,954],[894,888],[984,1104]
];
let nomadBag=[]; // spots not yet used this cycle
function relocate(p){ // move a nomad to a spot it hasn't used, until all are used
  if(!nomadBag.length) nomadBag=shuffled(NOMAD_SPOTS).filter(([x,y])=>x!==p.x||y!==p.y);
  [p.x,p.y]=nomadBag.pop();
}
function lookAway(prev){ // moves a nomad once it stops being looked at
  if(prev && prev.nomad && sel!==prev) relocate(prev);
}

// ---- start-up ----
const dbLoad = loadDB();
const img=new Image(); // the chart itself
img.onload=async ()=>{
  await dbLoad;
  N=img.width;
  drawPortraits(); updateHint(); renderInfo(); say();
  document.getElementById('boot').remove(); // hide LOADING CHART
  resize();
};
img.src='armature.png';

// ---- chart ----
// the plan is shown exactly as drawn

let fitS=1, fitX=0, fitY=0; // scale and offset of the chart inside its frame
function draw(){
  if(!N) return; // chart not loaded yet
  const w=canvas.width, h=canvas.height;
  ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='rgb(85,85,85)'; // sea colour around the square chart
  ctx.fillRect(0,0,w,h);
  fitS=Math.min(w,h)/MAP;
  fitX=(w-MAP*fitS)/2; fitY=(h-MAP*fitS)/2;
  ctx.drawImage(img, fitX, fitY, MAP*fitS, MAP*fitS);
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
  POI.forEach(p=> one(p.x,p.y,p.n, sel===p) );
}

(function pulseLoop(){ // keeps the markers blinking
  if(N) draw();
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
// views/<id>.png for each site; no file = name card
const FOCAL={}; // optional crop centre per image, e.g. FOCAL['site-re-1']={x:0.49,y:0.5}
const VIEW_IMAGES={}; // loaded images, cached by id
function viewSrc(id){ return 'views/'+id+'.png'; }

function ensureView(id){ // load once; redraw when it arrives if still wanted
  let rec=VIEW_IMAGES[id];
  if(rec) return rec;
  rec={status:'pending', img:null};
  VIEW_IMAGES[id]=rec;
  const img=new Image();
  img.onload =()=>{ rec.status='ok';    rec.img=img; if(sel && sel.id===id) drawSiteView(); };
  img.onerror=()=>{ rec.status='error'; if(sel && sel.id===id) drawSiteView(); };
  img.src=viewSrc(id);
  return rec;
}

function drawSiteView(){
  const W=sv.width, H=sv.height;
  svx.imageSmoothingEnabled=false;
  svx.fillStyle='rgb(12,12,12)'; svx.fillRect(0,0,W,H);

  const card=(label)=>{ // plain stand-in with a caption
    svx.fillStyle='rgb(30,30,30)'; svx.fillRect(0,0,W,H);
    svx.fillStyle='#000'; svx.fillRect(0,(H>>1)-11,W,22);
    svx.fillStyle='rgb(200,200,200)'; svx.font='8px DotGothic16, monospace'; svx.textAlign='center';
    svx.fillText(label, W/2, (H>>1)+3);
  };

  if(!sel){ card('NO SITE SELECTED'); return; }
  const view=ensureView(sel.id);
  if(view.status==='pending') return; // stay dark while loading, so the card never flashes
  if(view.status!=='ok'){ card(sel.name); return; } // no image yet

  const subj=view.img;
  const scale=Math.max(W/subj.width, H/subj.height); // cover-crop: fill the panel, trim the overhang
  const dw=subj.width*scale, dh=subj.height*scale;
  const focal = FOCAL[sel.id] || {x:0.5, y:0.5}; // default: crop from the centre
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
  const text = unread(DB.hist[sel.id] || '', unreadLevel);
  el.innerHTML='<h4>'+sel.name+'</h4>'+siteBody(text);
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
  } else {
    const lines=DB.dialogue[sel.id];
    script = lines && lines.length
      ? lines.map(l=>({s:l.s, t:unread(l.t, unreadLevel)}))
      : [ {s:'R', t:'(no dialogue recorded for '+sel.name+')'} ];
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
// after a full pass over every site, each new pass blanks more words
// to test, type  round = 2  in the browser console
const BLANK='(___)';
const BLANK_CHANCE=[0, 0.15, 0.5, 1]; // share of words blanked in rounds 0-3
let round=0; // 0 = first pass, 1-3 = unreading rounds
let seen=new Set(); // sites clicked this round
let unreadLevel=0; // round shown on screen now

function noteVisit(id){ // a full pass over every site moves to the next round
  unreadLevel=round;
  seen.add(id);
  if(seen.size===POI.length && round<3){ round++; seen.clear(); }
}

function shuffled(a){ // copy, shuffled
  a=a.slice();
  for(let k=a.length-1;k>0;k--){ const j=Math.floor(Math.random()*(k+1)); [a[k],a[j]]=[a[j],a[k]]; }
  return a;
}

function unread(text, level){ // blank some words; spaces, line breaks and punctuation stay
  return text.replace(/\w+/g, w => {
    if(w==='___') return w; // the inside of an existing (___): leave it
    return Math.random() < BLANK_CHANCE[level] ? BLANK : w;
  });
}

// ---- selection ----
function pick(p){ // select a site; clicking the selected one again deselects it
  const prev=sel;
  sel = (sel===p) ? null : p;
  lookAway(prev);
  unreadLevel=0;
  if(sel) noteVisit(sel.id);
  draw(); drawSiteView(); updateHint(); renderInfo(); say();
}
canvas.addEventListener('click',e=>{ // select the nearest marker to the click, if any
  const r=canvas.getBoundingClientRect();
  const dpr=canvas.width/r.width;
  const mx=((e.clientX-r.left)*dpr-fitX)/fitS, my=((e.clientY-r.top)*dpr-fitY)/fitS;
  let hit=null, bd=34; // click radius around a marker, in chart pixels
  POI.forEach(p=>{ const d=Math.hypot(p.x-mx,p.y-my); if(d<bd){bd=d;hit=p;} });
  if(hit) pick(hit);
});

function updateHint(){ // the hint strip in the chart's corner
  const hint=document.getElementById('maphint');
  if(hint){
    hint.textContent = !sel ? 'CLICK A MARKER'
      : sel.name + '  \u2014  ' + ISLANDS[sel.d];
  }
}
function clearSel(){ // escape: select nothing
  const prev=sel; sel=null; lookAway(prev); draw(); drawSiteView(); updateHint(); renderInfo(); say();
}

window.addEventListener('keydown',e=>{ // space advances the codec, escape clears
  const k=e.key.toLowerCase();
  if(k===' '){ e.preventDefault(); advance(); return; }
  if(k==='escape'){ clearSel(); return; }
});
