
const MAP=1254;





/* the two voices — names and roles still open */
const SPEAKERS={
  L:{ name:'RAWI', role:'smuggler boss,<br><span>the Interzone</span>' },
  R:{ name:'ADLER', role:'forensic architect,<br><span>off-island</span>' }
};

const DISTRICTS=[
  { id:'core', dbId:'island-core', name:'REMEMBRANCE', sub:'INGATAN' },
  { id:'ne', dbId:'island-ne', name:'SILENCE', sub:'UNNAMED ON CHART' },
  { id:'nw', dbId:'island-nw', name:'THE INTERZONE', sub:'COMPANY ROADS' },
  { id:'sw', dbId:'island-sw', name:'HOMELAND', sub:'REPUBLIC NAME' },
  { id:'se', dbId:'island-se', name:'SEMPADAN JAYA', sub:'CONTESTED NAME' }
];

const POI=[
  {d:0,n:'1',id:'site-re-1',x:620,y:633,name:'THE VOID'},
  {d:0,n:'2',id:'site-re-2',x:604,y:522,name:'THE WATCHTOWER'},

  {d:1,n:'1',id:'site-ne-1',x:1020,y:265,name:'THE EYE'},
  {d:1,n:'2',id:'site-ne-2',x:1072,y:322,name:'THE LONG ROWS'},

  {d:2,n:'1',id:'site-nw-1',x:76,y:247,name:'THE LOW SPACES'},
  {d:2,n:'2',id:'site-nw-3',x:214,y:352,name:'PORTSIDE'},

  {d:3,n:'1',id:'site-sw-1',x:200,y:912,name:'LEVELLED QUARTER'},
  {d:3,n:'2',id:'site-sw-2',x:312,y:972,name:'THE GARDENS'},

  {d:4,n:'1',id:'site-se-1',x:952,y:912,name:'OVERSIGHT BUREAU'},
  {d:4,n:'2',id:'site-se-2',x:1072,y:934,name:'THE SEALED ARCHIVE'},
  {d:4,n:'3',id:'site-se-3',x:960,y:1056,name:'PERMIT HALL'},
  {d:4,n:'4',id:'site-se-4',x:1084,y:1046,name:'TILT STATION SE'}
];

const BRIDGES=[
  {n:'A',id:'span-a',x:810,y:457,to:1,name:'CAUSEWAY A'},
  {n:'B',id:'span-b',x:436,y:456,to:2,name:'CAUSEWAY B'},
  {n:'C',id:'span-c',x:442,y:808,to:3,name:'CAUSEWAY C'},
  {n:'D',id:'span-d',x:807,y:810,to:4,name:'CAUSEWAY D'}
];

/* ================= engine ================= */
/* ---- content database ----
   All authored text (site history notes + codec dialogue) lives in
   city-database.json, fetched at startup, rather than inline in this file.
   Falls back to a short notice if the fetch fails (e.g. opened as a bare
   local file rather than served). */
let DB = { hist:{}, dialogue:{}, intro:[] };
async function loadDB(){
  try{
    const res = await fetch('city-database.json');
    if(!res.ok) throw new Error(res.status);
    DB = await res.json();
  } catch(e){
    console.warn('city-database.json not loaded (', e, ') — serve this folder over http(s) rather than opening the file directly.');
  }
}

const canvas=document.getElementById('c'), ctx=canvas.getContext('2d');
const frame=document.getElementById('mapframe');
const sv=document.getElementById('sv'), svx=sv.getContext('2d');
let N=0, sheet=null, lit=null;
let sel=null;

/* ---- islands are defined by mask pictures, not by code ----
   masks/island-<id>.png is the same size as armature.png: opaque where that
   island is, transparent everywhere else. Edit them in Photoshop to change
   where an island's edges fall. They do two jobs: working out which island
   a click landed on, and keeping the selected island lit while the rest of
   the map dims. A missing mask just means that island can't be selected. */
const MASKS=[];                                   // MASKS[k] belongs to DISTRICTS[k]
function maskSrc(k){ return 'masks/'+DISTRICTS[k].dbId+'.png'; }
function loadImage(src){
  return new Promise(res=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>res(null); i.src=src; });
}

const probe=document.createElement('canvas'); probe.width=probe.height=1;
const probeX=probe.getContext('2d',{willReadFrequently:true});
function islandAt(x,y){                            // which island is this map pixel on? -1 for none
  for(let k=0;k<MASKS.length;k++){
    if(!MASKS[k]) continue;
    probeX.clearRect(0,0,1,1);
    probeX.drawImage(MASKS[k], x,y,1,1, 0,0,1,1);
    if(probeX.getImageData(0,0,1,1).data[3]>0) return k;
  }
  return -1;
}

const dbLoad = loadDB();
const img=new Image();
img.onload=async ()=>{
  await dbLoad;
  N=img.width;
  const found=await Promise.all(DISTRICTS.map((d,k)=>loadImage(maskSrc(k))));
  found.forEach((m,k)=>{ MASKS[k]=m; });
  sheet=document.createElement('canvas'); sheet.width=N; sheet.height=N;
  lit=document.createElement('canvas');   lit.width=N;   lit.height=N;
  paintSheet();
  drawPortraits(); buildMenus(); renderInfo(); say();
  document.getElementById('boot').remove();
  resize();
};
img.src='armature.png';

/* ---- the chart is the uploaded plan ----
   Its own four values are kept as drawn: sea #555, ground white, roads
   #aaa, buildings black. Selecting something dims everything except that
   island; nothing is re-toned or re-textured.                              */
const BAYER=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
function dith(x,y,d){ return BAYER[y&3][x&3] < d; }

function paintSheet(){
  const sc=sheet.getContext('2d');
  sc.clearRect(0,0,N,N);
  sc.drawImage(img,0,0);                          // the plan, exactly as drawn
  if(!sel || !MASKS[sel.d]) return;
  sc.fillStyle='rgba(0,0,0,0.55)';                // dim everything...
  sc.fillRect(0,0,N,N);
  const lc=lit.getContext('2d');                  // ...then put the selected island back at full strength
  lc.globalCompositeOperation='source-over';
  lc.clearRect(0,0,N,N);
  lc.drawImage(img,0,0);
  lc.globalCompositeOperation='destination-in';
  lc.drawImage(MASKS[sel.d],0,0);
  sc.drawImage(lit,0,0);
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

/* ---- site-view images, one per id ----
   views/<id>.png is drawn if it exists. A site without a file shows a
   dithered card with its name, so images can be added one at a time. */
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
  svx.fillStyle='rgb(12,12,12)'; svx.fillRect(0,0,W,H);

  // a dithered card with a caption: nothing selected, an island selected,
  // or a site that has no image yet
  const card=(label)=>{
    svx.fillStyle='rgb(56,56,56)';
    for(let y=0;y<H;y++) for(let x=0;x<W;x++)
      if(dith(x,y,3)) svx.fillRect(x,y,1,1);
    svx.fillStyle='#000'; svx.fillRect(0,(H>>1)-11,W,22);
    svx.fillStyle='rgb(200,200,200)'; svx.font='8px DotGothic16, monospace'; svx.textAlign='center';
    svx.fillText(label, W/2, (H>>1)+3);
  };

  if(!sel){ card('NO SITE SELECTED'); return; }
  if(sel.kind==='district'){ card(sel.o.name); return; }

  const o=sel.o;
  const view=ensureView(o.id);
  if(view.status==='pending') return;                // stay dark until the file arrives, so a site with an image never flashes the card
  if(view.status!=='ok'){ card(o.name); return; }    // no image for this site yet

  // centre cover-crop: scale so the image fully fills the panel on its
  // shorter axis, then crop whatever overhangs on the longer one. Source
  // images are drawn wide (320x180) with the subject centred, so the crop
  // trims background, not the subject.
  const subj=view.img;
  const scale=Math.max(W/subj.width, H/subj.height);
  const dw=subj.width*scale, dh=subj.height*scale;
  // the crop centres on the subject's own focal point (default dead-centre)
  const focal = FOCAL[o.id] || {x:0.5, y:0.5};
  const dx = -(dw-W)*focal.x, dy = -(dh-H)*focal.y;
  svx.drawImage(subj, dx, dy, dw, dh);
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
    el.innerHTML = '<div class="frag">&ldquo;Our word for world is word.&rdquo;'
      + '<div class="src">&mdash; traditional Lanting saying</div></div>';
    return;
  }
  const o=sel.o;
  const dbId = sel.kind==='district' ? o.dbId : o.id;
  const text = unread(DB.hist[dbId] || '', sel.kind==='district' ? 0 : unreadLevel);
  el.innerHTML='<h4>'+o.name+'</h4>'+siteBody(text);
}

/* SITE text is an optional verse, a blank line, then the neutral paragraph.
   The verse gets one block per line, with a hanging indent so a line that
   wraps in a narrow panel still reads as one line. */
function siteBody(text){
  const cut=text.indexOf('\n\n');
  if(cut<0) return '<div class="bd">'+text+'</div>';
  const verse=text.slice(0,cut).split('\n').map(l=>'<div class="vl">'+l+'</div>').join('');
  return '<div class="verse">'+verse+'</div><div class="bd">'+text.slice(cut+2).trim()+'</div>';
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
      {s:'R', t:'Tuning on '+d.name+'. Charted as '+d.sub.toLowerCase()+'. '+POI.filter(p=>p.d===sel.d).length+' sites logged.'},
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
/* ---- the unreading ----
   Once every marker has been clicked at least once, the map starts to
   unspeak itself. Each further full pass over the markers is a round:
   round 1 drops a (___) in among the words, round 2 replaces half the
   words with (___), round 3 replaces all of them. Which words go is
   random on every click. Applies to the SITE text and the dialogue.
   (To test without clicking through everything, type  round = 2  in the
   browser console.) */
const BLANK='(___)';
const MARKER_TOTAL = POI.length + BRIDGES.length;
const seenFirst = new Set();      // markers clicked at least once (the first pass)
let round = 0;                    // 0 = first pass; 1-3 = unreading rounds
let roundSeen = new Set();        // markers clicked during the current round
let unreadLevel = 0;              // level applied to whatever is on screen now

function noteVisit(key){
  unreadLevel = round;            // this click shows the current round
  if(round===0){
    seenFirst.add(key);
    if(seenFirst.size>=MARKER_TOTAL){ round=1; roundSeen=new Set(); }
  } else {
    roundSeen.add(key);
    if(roundSeen.size>=MARKER_TOTAL && round<3){ round++; roundSeen=new Set(); }
  }
}

function shuffled(a){
  a=a.slice();
  for(let k=a.length-1;k>0;k--){ const j=Math.floor(Math.random()*(k+1)); [a[k],a[j]]=[a[j],a[k]]; }
  return a;
}

function unread(text, level){
  if(!level || !text) return text;
  const parts=text.split(/(\s+)/);               // words and whitespace, line breaks kept
  const words=[];
  parts.forEach((t,i)=>{ if(t && !/^\s+$/.test(t) && /[\p{L}\p{N}]/u.test(t)) words.push(i); });
  if(!words.length) return text;
  const blank=(tok)=>{                            // swap the word, keep its punctuation
    const m=tok.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u);
    return m[1]+BLANK+m[3];
  };
  if(level>=3){
    words.forEach(i=>{ parts[i]=blank(parts[i]); });
  } else if(level===2){
    shuffled(words).slice(0,Math.floor(words.length/2)).forEach(i=>{ parts[i]=blank(parts[i]); });
  } else {
    const gaps=words.slice(0,-1);                 // a gap follows every word but the last
    const n=Math.max(1,Math.round(gaps.length/4));
    shuffled(gaps).slice(0,n).forEach(i=>{ parts[i]=parts[i]+' '+BLANK; });
  }
  return parts.join('');
}

function pick(key){
  if(sel && sel.key===key) sel=null;
  else if(key[0]==='p'){ const p=POI[+key.slice(1)]; sel={key,kind:'site',d:p.d,o:p}; }
  else if(key[0]==='b'){ const b=BRIDGES[+key.slice(1)]; sel={key,kind:'span',d:b.to,o:b}; }
  else { const k=+key.slice(1); sel={key,kind:'district',d:k,o:DISTRICTS[k]}; }
  unreadLevel=0;
  if(sel && (sel.kind==='site'||sel.kind==='span')) noteVisit(sel.key);
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
  const k=islandAt(gx,gy);
  if(k>=0) pick('d'+k);
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
});
