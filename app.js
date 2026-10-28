/* =====================================================================
   SAT Math — Tutoring Workspace (static site + Supabase)
   ===================================================================== */
'use strict';

const CONF = window.SAT_CONFIG || {};
const CONFIGURED = CONF.SUPABASE_URL && !/VOTRE-PROJET/.test(CONF.SUPABASE_URL)
                && CONF.SUPABASE_ANON_KEY && !/COLLER-ICI/.test(CONF.SUPABASE_ANON_KEY);
const sb = CONFIGURED ? window.supabase.createClient(CONF.SUPABASE_URL, CONF.SUPABASE_ANON_KEY) : null;
const TUTOR = CONF.TUTOR_NAME || 'your tutor';
const DOMAIN = CONF.LOGIN_DOMAIN || 'eleves.satmath.app';

/* ============================================================
   ICONS
============================================================ */
const I={
  flag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V4M4 4h13l-2.5 4L17 12H4"/></svg>',
  checkw:'<svg viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-6" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>'
};

/* ============================================================
   TAXONOMY
============================================================ */
const SKILLS={
  lin1 :{domain:'Algebra',name:'Linear equations in one variable'},
  lin2 :{domain:'Algebra',name:'Linear equations in two variables'},
  linf :{domain:'Algebra',name:'Linear functions'},
  lineq:{domain:'Algebra',name:'Linear inequalities in one or two variables'},
  sys2 :{domain:'Algebra',name:'Systems of two linear equations in two variables'},
  eqex :{domain:'Advanced Math',name:'Equivalent expressions'},
  nleq :{domain:'Advanced Math',name:'Nonlinear equations in one variable and systems of equations in two variables'},
  nlfn :{domain:'Advanced Math',name:'Nonlinear functions'},
  rate :{domain:'Problem-Solving and Data Analysis',name:'Ratios, rates, proportional relationships and units'},
  pct  :{domain:'Problem-Solving and Data Analysis',name:'Percentages'},
  var1 :{domain:'Problem-Solving and Data Analysis',name:'One-variable data: distributions and measures of center and spread'},
  var2 :{domain:'Problem-Solving and Data Analysis',name:'Two-variable data: models and scatterplots'},
  prob :{domain:'Problem-Solving and Data Analysis',name:'Probability and conditional probability'},
  infer:{domain:'Problem-Solving and Data Analysis',name:'Inference from sample statistics and margin of error'},
  claim:{domain:'Problem-Solving and Data Analysis',name:'Evaluating statistical claims: observational studies and experiments'},
  lat  :{domain:'Geometry and Trigonometry',name:'Lines, angles, and triangles'},
  area :{domain:'Geometry and Trigonometry',name:'Area and volume'},
  circ :{domain:'Geometry and Trigonometry',name:'Circles'},
  trig :{domain:'Geometry and Trigonometry',name:'Right triangles and trigonometry'}
};
const SKILL_ORDER=Object.keys(SKILLS);
const DOMAIN_ORDER=['Algebra','Advanced Math','Problem-Solving and Data Analysis','Geometry and Trigonometry'];
const LEVELS=['Easy','Medium','Hard'];
const LEVEL_ORDER=['Easy','Medium','Hard','All'];
const skillsOfDomain=d=>SKILL_ORDER.filter(k=>SKILLS[k].domain===d);
const skillName=k=>(SKILLS[k]||{}).name||k;

/* ============================================================
   HELPERS
============================================================ */
const $=id=>document.getElementById(id);
const esc=v=>(v??'').toString().replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const L=['A','B','C','D','E','F'];
const dcl=d=>d==='Hard'?'hard':d==='Medium'?'med':d==='Easy'?'easy':'mix';
const pct=(a,b)=>b?Math.round(100*a/b):0;
const lvlTag=l=>l?`<span class="tag ${dcl(l)}">${l==='All'?'Mixed':esc(l)}</span>`:'';
const quizTitle=(skill,level,label)=>skillName(skill)+' · '+(level==='All'?'Mixed':level)+' · '+label;
const quizLabel=q=>q.label||('Quiz #'+q.seq);
const MIXED_TYPES='Mixed types';
const stemText=q=>(q.stem||'').replace(/\{\{img\}\}/g,' [figure] ').replace(/<[^>]+>/g,' ').replace(/\$/g,'');
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const slug=s=>(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9._-]/g,'');
const toEmail=u=>u.includes('@')?u.trim().toLowerCase():slug(u)+'@'+DOMAIN;

function toNum(v){
  let t=(v??'').toString().trim().replace(/\s+/g,'');
  if(/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t))t=t.replace(/,/g,'');   // 2,048 -> 2048
  t=t.replace(',','.');                                                // 2,5 -> 2.5
  if(t==='')return null;
  const f=t.match(/^(-?\d*\.?\d+)\/(-?\d*\.?\d+)$/);
  if(f){const d=parseFloat(f[2]);return d===0?null:parseFloat(f[1])/d;}
  if(!/^-?\d*\.?\d+$/.test(t))return null;
  return parseFloat(t);
}
/* several accepted answers are separated by ";" (e.g. "10/3;15/4") */
const answersOf=answer=>(answer??'').toString().split(';').map(x=>x.trim()).filter(Boolean);
function sprCorrect(given,answer){
  return answersOf(answer).some(a=>sprMatch(given,a));
}
function sprMatch(given,answer){
  const g=(given??'').toString().trim(),a=(answer??'').toString().trim();
  if(g==='')return false;
  if(g.replace(/\s+/g,'').toLowerCase()===a.replace(/\s+/g,'').toLowerCase())return true;
  const gn=toNum(g),an=toNum(a);
  if(gn===null||an===null)return false;
  if(Math.abs(gn-an)<1e-9)return true;
  // SAT accepts a decimal that fills the grid, e.g. .3333 or .3334 for 1/3
  const dec=(g.match(/\.(\d+)$/)||[,''])[1].length;
  return dec>=3&&Math.abs(gn-an)<Math.pow(10,-dec);
}
function isRight(q,given){
  if(given===undefined||given===null)return false;
  return q.type==='mcq'?Number(given)===q.correct:sprCorrect(given,q.answer);
}
/* ---------- figures: one JSON pack per skill in figures/, loaded on demand ---------- */
const FIGS={};
function figPack(sk){
  if(!FIGS[sk])FIGS[sk]=fetch('figures/'+encodeURIComponent(sk)+'.json').then(r=>r.ok?r.json():{}).catch(()=>{delete FIGS[sk];return {};});
  return FIGS[sk];
}
const figImg=(q,key,cls)=>`<img class="${cls}" data-fig="${esc(key)}" data-sk="${esc(q.skill)}" alt="Figure">`;
function loadFigs(root){
  (root||document).querySelectorAll('img[data-fig]:not([src])').forEach(el=>{
    figPack(el.dataset.sk).then(m=>{
      const src=m[el.dataset.fig];
      if(!src){el.outerHTML='<span class="figmiss">Figure not available</span>';return;}
      el.onload=()=>{el.style.width=Math.round(el.naturalWidth/(el.classList.contains('cfig')?1.5:1.9))+'px';};
      el.src=src;
    });
  });
}
function stemHtml(q){
  const img=q.image?`<span class="figwrap">${figImg(q,q.image,'qfig')}</span>`:'';
  const s=esc(q.stem||'');
  return s.includes('{{img}}')?s.replace('{{img}}',img).replace(/\{\{img\}\}/g,''):s+img;
}
function typeset(root){
  if(root)loadFigs(root);
  if(!root||!window.renderMathInElement)return;
  try{window.renderMathInElement(root,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false});}catch(e){}
}
function toast(msg,ms=2600){const r=$('toast-root');r.innerHTML=`<div class="toast">${esc(msg)}</div>`;setTimeout(()=>{if(r.firstChild)r.innerHTML='';},ms);}
function closeModal(){$('modal-root').innerHTML='';}
function modal(html,wide){
  const r=$('modal-root');
  r.innerHTML=`<div class="modal-bg" id="mbg"><div class="modal" id="mbox" ${wide?'style="max-width:820px"':''}>${html}</div></div>`;
  $('mbg').addEventListener('click',e=>{if(e.target.id==='mbg')closeModal();});
  typeset($('mbox'));
}
function fmtDate(ts){const d=new Date(ts);return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})+' '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});}
function errMsg(e){return (e&&(e.message||e.error_description))||String(e);}
function busy(btn,on,label){if(!btn)return;if(on){btn.dataset.l=btn.textContent;btn.disabled=true;btn.textContent=label||'Working…';}else{btn.disabled=false;btn.textContent=btn.dataset.l||btn.textContent;}}
function lsGet(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}}
function lsSet(k,v){try{v==null?localStorage.removeItem(k):localStorage.setItem(k,JSON.stringify(v));}catch(e){}}

/* ============================================================
   DATA LAYER
============================================================ */
async function fetchAll(table,{select='*',order='id',mod}={}){
  const out=[],step=1000;
  for(let from=0;;from+=step){
    let q=sb.from(table).select(select).order(order,{ascending:true}).range(from,from+step-1);
    if(mod)q=mod(q);
    const {data,error}=await q;
    if(error)throw error;
    out.push(...data);
    if(data.length<step)break;
  }
  return out;
}

let ME=null;            // my profile
const D={quizzes:[],Q:new Map(),attempts:[],access:[],students:[],settings:{quiz_size:10,split_by_level:true,by_tag:true,min_tag:5}};
let RUN=null;
const view={name:'boot',p:{}};

async function loadData(){
  const uid=ME.id;
  const [quizzes,questions,attempts]=await Promise.all([
    fetchAll('quizzes'),
    fetchAll('questions'),
    fetchAll('attempts',{mod:q=>ME.role==='tutor'?q:q.eq('student_id',uid)})
  ]);
  D.quizzes=quizzes.sort(quizSort);
  D.Q=new Map(questions.map(q=>[q.id,q]));
  D.attempts=attempts;
  if(ME.role==='tutor'){
    const [access,profiles,settings]=await Promise.all([
      fetchAll('access',{order:'quiz_id'}),
      fetchAll('profiles',{order:'created_at'}),
      sb.from('settings').select('*').eq('id',1).maybeSingle()
    ]);
    D.access=access;
    D.students=profiles.filter(p=>p.role==='student');
    if(settings.data)D.settings={...D.settings,...settings.data};
  }else{
    D.access=[];D.students=[];
  }
}
function quizSort(a,b){
  return SKILL_ORDER.indexOf(a.skill)-SKILL_ORDER.indexOf(b.skill)
      || LEVEL_ORDER.indexOf(a.level)-LEVEL_ORDER.indexOf(b.level)
      || a.seq-b.seq || a.id-b.id;
}

/* stats of one student over quizzes, from attempts */
function statsFor(studentId){
  const byQuiz={};
  D.attempts.filter(a=>a.student_id===studentId).forEach(a=>{
    if(a.quiz_id==null)return;
    const s=byQuiz[a.quiz_id]||(byQuiz[a.quiz_id]={n:0,best:0,bestTotal:a.total,last:null,lastScore:0});
    s.n++;
    if(a.score/a.total>=s.best/(s.bestTotal||1)){s.best=a.score;s.bestTotal=a.total;}
    if(!s.last||a.created_at>s.last){s.last=a.created_at;s.lastScore=a.score;s.lastId=a.id;}
  });
  return byQuiz;
}

/* group quizzes into domain > skill > level */
function buildTree(quizzes){
  return DOMAIN_ORDER.map(d=>({
    domain:d,
    skills:skillsOfDomain(d).map(sk=>({
      skill:sk,
      levels:LEVEL_ORDER.map(l=>({level:l,quizzes:quizzes.filter(q=>q.skill===sk&&q.level===l)})).filter(x=>x.quizzes.length)
    })).filter(s=>s.levels.length)
  })).filter(d=>d.skills.length);
}
const quizzesOfNode=n=>n.skills?n.skills.flatMap(quizzesOfNode):n.levels?n.levels.flatMap(l=>l.quizzes):n.quizzes;

/* remember which accordions are open */
function openKey(){return 'satm_open_'+(ME?ME.id:'x');}
let OPEN=new Set();
document.addEventListener('toggle',e=>{
  const t=e.target;
  if(!(t instanceof HTMLDetailsElement)||!t.dataset.k)return;
  const k=t.dataset.k;
  if(t.open){OPEN.add(k);OPEN.delete('!'+k);}else{OPEN.delete(k);OPEN.add('!'+k);}
  lsSet(openKey(),[...OPEN]);
},true);
const isOpen=(k,def)=>OPEN.has(k)||(def&&!OPEN.has('!'+k));

/* ============================================================
   ROUTER
============================================================ */
function go(name,p={}){view.name=name;view.p=p;render();window.scrollTo({top:0,behavior:'instant'});}
function header(){
  let who='';
  if(ME){
    who=`<span class="who">Signed in as <b>${esc(ME.name)}</b>${ME.role==='tutor'?' (tutor)':''} ·
      <button class="link" style="font-size:12px" onclick="changeMyPassword()">Password</button> ·
      <button class="link" style="font-size:12px" onclick="signOut()">Sign out</button></span>`;
  }
  return `<div class="topbar"><div class="brand" style="cursor:pointer" onclick="home()">
    <div class="mark"><i class="f"></i><i></i><i class="f"></i></div>
    <div><h1>SAT MATH</h1><div class="sub">Tutoring workspace</div></div></div>${who}</div>`;
}
const VIEWS={};
function render(){
  const v=VIEWS[view.name]||VIEWS.login;
  try{
    $('app').innerHTML=header()+v(view.p);
  }catch(err){
    console.error(err);
    $('app').innerHTML=header()+`<div class="card"><h3>Something went wrong</h3><pre class="tiny" style="white-space:pre-wrap;color:var(--red)">${esc(err.stack||err)}</pre></div>`;
  }
  typeset($('app'));
  if(view.after){const f=view.after;view.after=null;f();}
}
function after(f){view.after=f;}
function home(){if(!ME)return go('login');go(ME.role==='tutor'?'admin':'dash');}

/* ============================================================
   BOOT + AUTH
============================================================ */
async function boot(){
  if(!CONFIGURED){go('noconfig');return;}
  try{
    const {data:{session}}=await sb.auth.getSession();
    if(session){await enter(session.user);return;}
    const {data:hasTutor,error}=await sb.rpc('tutor_exists');
    if(error)throw error;
    go(hasTutor?'login':'setup');
  }catch(e){
    go('fatal',{msg:errMsg(e)});
  }
}
async function enter(user){
  $('app').innerHTML='<div class="boot">Loading your workspace…</div>';
  const {data,error}=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();
  if(error||!data){go('fatal',{msg:error?errMsg(error):'No profile found for this account. Was schema.sql run before creating the account?'});return;}
  ME=data;
  OPEN=new Set(lsGet(openKey(),[]));
  await loadData();
  RUN=lsGet('satm_run_'+ME.id,null);
  if(RUN){
    RUN.timerId=null;
    RUN.questions=(RUN.qids||[]).map(id=>D.Q.get(id)).filter(Boolean);
    if(!RUN.questions.length||ME.role==='tutor'){RUN=null;saveRun();}
  }
  home();
}
async function signOut(){
  await sb.auth.signOut();
  ME=null;RUN=null;go('login');
}

VIEWS.noconfig=()=>`<div class="card" style="max-width:560px;margin:0 auto">
  <div class="eyebrow">Setup needed</div><h2 style="font-size:24px">Site not connected yet</h2>
  <p class="muted">Fill in <span class="mono">config.js</span> with your Supabase URL and anon key (see GUIDE.md, step 3), then reload.</p></div>`;
VIEWS.fatal=({msg})=>`<div class="card" style="max-width:600px;margin:0 auto">
  <div class="eyebrow" style="color:var(--red)">Error</div><h2 style="font-size:24px">Could not load</h2>
  <p class="tiny mono" style="color:var(--red);white-space:pre-wrap">${esc(msg)}</p>
  <button class="btn ghost sm" onclick="location.reload()">Reload</button>
  ${ME?'':''}<button class="link" style="margin-left:12px" onclick="signOut()">Sign out</button></div>`;

VIEWS.login=()=>{
  after(()=>{const u=$('lu');if(u)u.focus();});
  return `<div class="hero" style="text-align:center;margin-top:10px"><div class="eyebrow">Welcome back</div>
    <h2>Time to <span class="hl">practise</span>.</h2></div>
    <div class="card" style="max-width:420px;margin:26px auto 0">
      <label class="fld"><span class="lb">Username</span>
        <input type="text" id="lu" autocomplete="username" autocapitalize="none" spellcheck="false"></label>
      <label class="fld"><span class="lb">Password</span>
        <input type="password" id="lp" autocomplete="current-password" onkeydown="if(event.key==='Enter')doLogin()"></label>
      <div id="lerr" class="tiny" style="color:var(--red);min-height:19px;font-weight:600"></div>
      <button class="btn go wide" id="lbtn" onclick="doLogin()">Sign in</button>
      <p class="tiny muted" style="margin:14px 0 0;text-align:center">You stay signed in on this device.</p>
    </div>`;
};
async function doLogin(){
  const u=$('lu').value.trim(),p=$('lp').value;
  if(!u||!p){$('lerr').textContent='Enter your username and password.';return;}
  busy($('lbtn'),true,'Signing in…');
  const {data,error}=await sb.auth.signInWithPassword({email:toEmail(u),password:p});
  if(error){busy($('lbtn'),false);$('lerr').textContent=/invalid/i.test(error.message)?'Wrong username or password.':error.message;return;}
  await enter(data.user);
}

VIEWS.setup=()=>`<div class="card" style="max-width:480px;margin:0 auto">
  <div class="eyebrow">First launch</div><h2 style="font-size:25px">Create the tutor account</h2>
  <p class="tiny muted">This page only appears once, while no tutor exists. Every account created afterwards is a student account.</p>
  <label class="fld"><span class="lb">Display name</span><input type="text" id="tn" value="${esc(CONF.TUTOR_NAME||'')}"></label>
  <label class="fld"><span class="lb">Username (used to sign in)</span><input type="text" id="tu" autocapitalize="none" placeholder="thomas"></label>
  <label class="fld"><span class="lb">Password (8+ characters)</span><input type="password" id="tp1" autocomplete="new-password"></label>
  <label class="fld"><span class="lb">Repeat password</span><input type="password" id="tp2" autocomplete="new-password"></label>
  <div id="terr" class="tiny" style="color:var(--red);min-height:19px;font-weight:600"></div>
  <button class="btn go wide" id="tbtn" onclick="doSetup()">Create tutor account</button></div>`;
async function doSetup(){
  const name=$('tn').value.trim(),u=slug($('tu').value),p1=$('tp1').value,p2=$('tp2').value;
  const err=m=>{$('terr').textContent=m;};
  if(!name||!u)return err('Name and username are required.');
  if(p1.length<8)return err('Use at least 8 characters.');
  if(p1!==p2)return err('The two passwords differ.');
  busy($('tbtn'),true,'Creating…');
  const {data,error}=await sb.auth.signUp({email:toEmail(u),password:p1,options:{data:{name,role:'tutor'}}});
  if(error){busy($('tbtn'),false);return err(error.message);}
  if(!data.session){busy($('tbtn'),false);return err('Account created but not signed in: turn OFF "Confirm email" in Supabase (Authentication > Sign In / Providers > Email), then sign in.');}
  await enter(data.user);
  if(ME&&ME.role!=='tutor')toast('This account was created as a student: a tutor already exists.');
}

function changeMyPassword(){
  modal(`<h3 style="font-size:21px;margin-bottom:16px">Change my password</h3>
    <label class="fld"><span class="lb">New password (6+ characters)</span><input type="password" id="np1" autocomplete="new-password"></label>
    <label class="fld"><span class="lb">Repeat</span><input type="password" id="np2" autocomplete="new-password"></label>
    <div id="nperr" class="tiny" style="color:var(--red);min-height:19px;font-weight:600"></div>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost sm" onclick="closeModal()">Cancel</button>
      <button class="btn go sm" id="npbtn" onclick="saveMyPassword()">Save</button></div>`);
}
async function saveMyPassword(){
  const a=$('np1').value,b=$('np2').value;
  if(a.length<6){$('nperr').textContent='At least 6 characters.';return;}
  if(a!==b){$('nperr').textContent='The two passwords differ.';return;}
  busy($('npbtn'),true);
  const {error}=await sb.auth.updateUser({password:a});
  if(error){busy($('npbtn'),false);$('nperr').textContent=error.message;return;}
  closeModal();toast('Password changed.');
}

/* ============================================================
   STUDENT DASHBOARD
============================================================ */
let FILTER='all';
function setFilter(f){FILTER=f;render();}
function expandAll(on){
  document.querySelectorAll('#tree details.acc').forEach(d=>{d.open=on;});
}
function nextQuiz(quizzes,stats){return quizzes.find(q=>!stats[q.id]);}

VIEWS.dash=()=>{
  const quizzes=D.quizzes;
  const st=statsFor(ME.id);
  const doneN=quizzes.filter(q=>st[q.id]).length;
  const mine=D.attempts.filter(a=>a.student_id===ME.id);
  const answered=mine.reduce((n,a)=>n+a.total,0),right=mine.reduce((n,a)=>n+a.score,0);
  const next=nextQuiz(quizzes,st);
  const resume=RUN?`<div class="card flat" style="border-color:var(--amber);background:var(--amber-soft);margin-bottom:18px">
      <div class="row between"><div><b>Unfinished: ${esc(RUN.title)}</b><div class="tiny muted">${Object.keys(RUN.answers).length}/${RUN.questions.length} answered</div></div>
      <div class="row"><button class="link danger" onclick="dropRun()">Discard</button><button class="btn go sm" onclick="go('run')">Resume</button></div></div></div>`:'';

  if(!quizzes.length){
    return `<div class="hero"><div class="eyebrow">Your practice</div><h2 style="font-size:30px">Hello, ${esc(ME.name)}</h2></div>
      ${resume}<div class="empty" style="margin-top:20px">No quizzes are open for you yet.<br>${esc(TUTOR)} will unlock them soon.</div>${historyBlock(mine)}`;
  }

  const tree=buildTree(quizzes);
  const keep=q=>FILTER==='all'||(FILTER==='todo'?!st[q.id]:!!st[q.id]);
  const firstTodoDomain=next?SKILLS[next.skill].domain:null;

  const treeHtml=tree.map(d=>{
    const dq=quizzesOfNode(d),dDone=dq.filter(q=>st[q.id]).length;
    const skillsHtml=d.skills.map(s=>{
      const sq=quizzesOfNode(s);if(!sq.some(keep))return '';
      const sDone=sq.filter(q=>st[q.id]).length;
      const levels=s.levels.map(l=>{
        const rows=l.quizzes.filter(keep).map(q=>quizRow(q,st[q.id])).join('');
        return rows?`<div class="lvlhead">${l.level==='All'?'Mixed difficulty':l.level}</div>${rows}`:'';
      }).join('');
      const k='s:'+s.skill;
      return `<details class="acc sk" data-k="${k}" ${isOpen(k,next&&next.skill===s.skill)?'open':''}>
        <summary><span class="ttl"><span class="chev">▶</span><b>${esc(skillName(s.skill))}</b></span>
          <span class="row" style="gap:8px;flex-wrap:nowrap"><span class="tiny mono muted">${sDone}/${sq.length}</span>${miniBar(sDone,sq.length)}</span></summary>
        <div class="abody">${levels}</div></details>`;
    }).join('');
    if(!skillsHtml)return '';
    const k='d:'+d.domain;
    return `<details class="acc dom" data-k="${k}" ${isOpen(k,d.domain===firstTodoDomain)?'open':''}>
      <summary><span class="ttl"><span class="chev">▶</span><h3>${esc(d.domain)}</h3></span>
        <span class="row" style="gap:8px;flex-wrap:nowrap"><span class="tiny mono muted">${dDone}/${dq.length} done</span>${miniBar(dDone,dq.length)}</span></summary>
      <div class="abody">${skillsHtml}</div></details>`;
  }).join('')||`<div class="empty">${FILTER==='todo'?'Everything is done. Nice work!':'Nothing here yet.'}</div>`;

  const nMist=mistakePool().length,nHard=hardPool().length;
  const practice=`<div class="grid" style="margin-bottom:22px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
      <div class="card flat"><div class="row between"><div><b>My mistakes</b>
        <div class="tiny muted">${nMist?`${nMist} question${nMist>1?'s':''} to fix`:'Nothing to fix right now'}</div></div>
        <button class="btn ${nMist?'go':'ghost'} sm" ${nMist?'':'disabled'} onclick="go('special',{kind:'mistakes'})">Review</button></div></div>
      <div class="card flat"><div class="row between"><div><b>Mixed Hard</b>
        <div class="tiny muted">${nHard?`${Math.min(HARD_N,nHard)} random Hard questions, topic hidden`:'No Hard question open yet'}</div></div>
        <button class="btn ghost sm" ${nHard?'':'disabled'} onclick="go('special',{kind:'hard'})">Start</button></div></div>
    </div>`;
  const pool=accessiblePool();
  const mix=ME.mix_enabled&&pool.length>=3?`<div class="card flat" style="margin-top:22px"><div class="row between">
      <div><b>Mixed set</b><div class="tiny muted">Random questions drawn from everything you can access (${pool.length} questions).</div></div>
      <button class="btn ghost sm" onclick="go('mix')">Build a mixed set</button></div></div>`:'';

  return `<div class="hero"><div class="eyebrow">Your practice</div><h2 style="font-size:30px">Hello, ${esc(ME.name)}</h2></div>
    <div class="grid stats" style="margin:18px 0 22px">
      <div class="stat"><div class="n">${doneN}<span class="muted" style="font-size:18px">/${quizzes.length}</span></div><div class="l">Quizzes done</div></div>
      <div class="stat"><div class="n">${answered}</div><div class="l">Questions answered</div></div>
      <div class="stat"><div class="n">${answered?pct(right,answered)+'%':'—'}</div><div class="l">Overall accuracy</div></div>
    </div>
    ${resume}
    ${practice}
    ${next&&!RUN?`<div class="card" style="margin-bottom:22px"><div class="row between">
      <div><div class="eyebrow">Up next</div><b style="font-size:16px">${esc(next.title)}</b>
      <div class="tiny muted mono">${next.question_ids.length} questions</div></div>
      <button class="btn go" onclick="go('pre',{quizId:${next.id}})">Start</button></div></div>`:''}
    <div class="row between" style="margin-bottom:12px">
      <div class="chips">${[['all','All'],['todo','To do'],['done','Done']].map(([k,l])=>`<button class="chip ${FILTER===k?'on':''}" onclick="setFilter('${k}')">${l}</button>`).join('')}</div>
      <div class="row" style="gap:12px"><button class="link" style="font-size:13px" onclick="expandAll(true)">Expand all</button><button class="link" style="font-size:13px" onclick="expandAll(false)">Collapse all</button></div>
    </div>
    <div id="tree">${treeHtml}</div>
    ${mix}
    ${historyBlock(mine)}`;
};
function miniBar(a,b){return `<div class="barback mini"><div class="barfill" style="width:${pct(a,b)}%"></div></div>`;}
function scorePill(s){
  if(!s)return '<span class="pill todo">New</span>';
  const r=s.best/(s.bestTotal||1);
  return `<span class="pill ${r>=.8?'done':r>=.5?'warn':'bad'}" title="Best score">${s.best}/${s.bestTotal}</span>`;
}
function quizRow(q,s){
  return `<div class="qrow"><div><span class="nm">${esc(quizLabel(q))}</span>
      <span class="tiny muted mono" style="margin-left:8px">${q.question_ids.length} q${s?` · ${s.n} attempt${s.n>1?'s':''}`:''}</span></div>
    <div class="row" style="gap:8px">${scorePill(s)}
      ${s&&s.lastId?`<button class="btn ghost xs" onclick="go('attempt',{id:${s.lastId}})">Review</button>`:''}
      <button class="btn ${s?'ghost':'go'} xs" onclick="go('pre',{quizId:${q.id}})">${s?'Retake':'Start'}</button></div></div>`;
}
function historyBlock(list,forTutor){
  if(!list.length)return '';
  const all=list.slice().sort((a,b)=>b.created_at<a.created_at?-1:1);
  const k='h:'+(forTutor||'me');
  return `<details class="acc" data-k="${k}" style="margin-top:26px" ${isOpen(k)?'open':''}>
    <summary><span class="ttl"><span class="chev">▶</span><b>History</b><span class="tiny muted mono">${all.length} attempt${all.length>1?'s':''}</span></span></summary>
    <div class="abody">${all.map(a=>{
      const f=Object.values(a.flags||{}).filter(Boolean).length;
      return `<div class="qrow"><div><b style="font-size:14px">${esc(a.title)}</b>
        <div class="tiny muted mono">${fmtDate(a.created_at)}${a.timed?' · timed':''}${f?` · ${f} flagged`:''}</div></div>
        <div class="row"><span class="pill ${a.score/a.total>=.8?'done':a.score/a.total>=.5?'warn':'bad'}">${a.score}/${a.total}</span>
        <button class="btn ghost xs" onclick="go('attempt',{id:${a.id}})">Review</button></div></div>`;}).join('')}</div></details>`;
}
function accessiblePool(){
  const ids=new Set(D.quizzes.flatMap(q=>q.question_ids));
  return [...ids].map(id=>D.Q.get(id)).filter(Boolean);
}
/* My mistakes: questions whose LAST recorded answer (all attempts, oldest to newest) was wrong or blank.
   A later correct answer removes the question; only questions still open to the student are kept. */
function mistakePool(){
  const last=new Map();
  D.attempts.filter(a=>a.student_id===ME.id).slice().sort((a,b)=>a.created_at<b.created_at?-1:a.created_at>b.created_at?1:a.id-b.id)
    .forEach(a=>{const ans=a.answers||{};(a.question_ids||[]).forEach(qid=>{const q=D.Q.get(qid);if(q)last.set(qid,isRight(q,ans[qid]));});});
  const open=new Set(D.quizzes.flatMap(q=>q.question_ids));
  return [...last].filter(([id,ok])=>!ok&&open.has(id)).map(([id])=>D.Q.get(id))
    .sort((a,b)=>SKILL_ORDER.indexOf(a.skill)-SKILL_ORDER.indexOf(b.skill)||LEVELS.indexOf(a.difficulty)-LEVELS.indexOf(b.difficulty)||a.id-b.id);
}
/* Mixed Hard: random Hard questions from every quiz open to the student; topic hidden until review */
const HARD_N=20;
const hardPool=()=>accessiblePool().filter(q=>q.difficulty==='Hard');
const SPECIAL={
  mistakes:{eyebrow:'Review',title:'My mistakes',
    text:n=>`${n} question${n>1?'s':''} you got wrong (or left blank) and have not answered correctly since. Each one you get right leaves the list.`,
    pool:()=>mistakePool(),pick:p=>p,hide:false,runTitle:n=>'My mistakes · '+n+' question'+(n>1?'s':'')},
  hard:{eyebrow:'Test day practice',title:'Mixed Hard',
    text:n=>`${n} Hard questions drawn at random from all your open topics. The topic and question type stay hidden until you submit — recognizing them is part of the exercise.`,
    pool:()=>hardPool(),pick:p=>shuffle(p).slice(0,HARD_N),hide:true,runTitle:n=>'Mixed Hard · '+n+' questions'}
};

/* ============================================================
   PRE-QUIZ + MIXED SET
============================================================ */
let TIMER_ON=false;
VIEWS.pre=({quizId})=>{
  const q=D.quizzes.find(x=>x.id===quizId);
  if(!q)return `<div class="empty">This quiz is not available.</div>`;
  TIMER_ON=false;
  const n=q.question_ids.length,suggested=Math.max(5,Math.round(n*1.5));
  return `<button class="back" onclick="home()">${I.back} Dashboard</button>
    <div class="card" style="max-width:560px">
      <div class="eyebrow">${esc(SKILLS[q.skill]?SKILLS[q.skill].domain:'')}</div>
      <h2 style="font-size:25px;line-height:1.15">${esc(q.title)}</h2>
      <p class="muted tiny" style="margin:10px 0 20px">${n} questions. Take as long as you need — the clock only runs if you ask for it.</p>
      ${timerSwitch(suggested)}
      <button class="btn go wide" style="margin-top:20px" onclick="beginQuiz(${quizId})">Start</button></div>`;
};
function timerSwitch(suggested){
  return `<div class="switch" id="tsw" onclick="toggleTimer()"><div class="track"><div class="knob"></div></div>
      <div><b style="font-size:14.5px">Timed practice</b><div class="tiny muted" id="tswl">Off — no pressure. Turn on to rehearse exam pacing.</div></div></div>
    <div id="tdur" style="display:none;margin-top:14px"><label class="fld" style="margin:0"><span class="lb">Minutes</span>
      <input type="number" id="tmin" value="${suggested}" min="1" style="max-width:130px"></label></div>`;
}
function toggleTimer(){
  TIMER_ON=!TIMER_ON;
  $('tsw').classList.toggle('on',TIMER_ON);
  $('tdur').style.display=TIMER_ON?'':'none';
  $('tswl').textContent=TIMER_ON?'On — the quiz submits itself when time runs out.':'Off — no pressure. Turn on to rehearse exam pacing.';
}
function startRun(title,quizId,questions){
  const mins=TIMER_ON?Math.max(1,parseInt($('tmin').value)||10):0;
  RUN={title,quizId,qids:questions.map(q=>q.id),questions,answers:{},flags:{},timed:!!mins,endTime:mins?Date.now()+mins*60000:null};
  saveRun();go('run');
}
function beginQuiz(quizId){
  const q=D.quizzes.find(x=>x.id===quizId);
  const qs=q.question_ids.map(id=>D.Q.get(id)).filter(Boolean);
  if(!qs.length){toast('This quiz has no questions.');return;}
  startRun(q.title,q.id,qs);
}
VIEWS.special=({kind})=>{
  const K=SPECIAL[kind];if(!K)return `<div class="empty">Not available.</div>`;
  const pool=K.pool(),n=Math.min(pool.length,kind==='hard'?HARD_N:pool.length);
  TIMER_ON=false;
  const body=n?`<p class="muted tiny" style="margin:10px 0 20px">${K.text(n)}</p>${timerSwitch(Math.max(5,Math.round(n*(kind==='hard'?1.6:1.5))))}
      <button class="btn go wide" style="margin-top:20px" onclick="beginSpecial('${kind}')">Start</button>`
    :`<p class="muted" style="margin:12px 0 0">${kind==='mistakes'?'Nothing to review right now: every question you missed has since been answered correctly.':'No Hard question is open for you yet.'}</p>`;
  return `<button class="back" onclick="home()">${I.back} Dashboard</button>
    <div class="card" style="max-width:560px"><div class="eyebrow">${K.eyebrow}</div>
      <h2 style="font-size:25px;line-height:1.15">${K.title}</h2>${body}</div>`;
};
function beginSpecial(kind){
  const K=SPECIAL[kind],qs=K.pick(K.pool());
  if(!qs.length){toast('No question available.');return;}
  startRun(K.runTitle(qs.length),null,qs);
  if(K.hide){RUN.hideMeta=true;saveRun();render();}
}
function saveRun(){if(!ME)return;lsSet('satm_run_'+ME.id,RUN?{...RUN,questions:undefined}:null);}
function dropRun(){if(!confirm('Discard this unfinished quiz?'))return;RUN=null;saveRun();render();}

let MIX={skills:new Set(),levels:new Set(LEVELS),tagsOff:new Set(),n:10};
VIEWS.mix=()=>{
  const pool=accessiblePool();
  const sks=SKILL_ORDER.filter(k=>pool.some(q=>q.skill===k));
  if(!MIX.skills.size)sks.forEach(k=>MIX.skills.add(k));
  TIMER_ON=false;
  return `<button class="back" onclick="home()">${I.back} Dashboard</button>
    <div class="card" style="max-width:640px">
      <div class="eyebrow">Mixed set</div><h2 style="font-size:25px">Build your own set</h2>
      <div class="sect" style="margin-top:18px">Topics</div>
      <div class="chips">${sks.map(k=>`<button class="chip ${MIX.skills.has(k)?'on':''}" onclick="mixTgl('skills','${k}')">${esc(skillName(k))} <span class="mono" style="opacity:.6">${pool.filter(q=>q.skill===k).length}</span></button>`).join('')}</div>
      <div class="sect">Difficulty</div>
      <div class="chips">${LEVELS.map(l=>`<button class="chip ${MIX.levels.has(l)?'on':''}" onclick="mixTgl('levels','${l}')">${l}</button>`).join('')}</div>
      ${mixTagsHtml(pool)}
      <div class="sect">Number of questions</div>
      <input type="number" id="mixn" min="1" max="60" value="${MIX.n}" style="max-width:130px" onchange="MIX.n=parseInt(this.value)||10">
      <p class="tiny muted" id="mixav">${mixPool().length} questions match.</p>
      <div style="margin-top:6px">${timerSwitch(Math.round(MIX.n*1.5))}</div>
      <button class="btn go wide" style="margin-top:20px" onclick="beginMix()">Start</button></div>`;
};
function mixTgl(set,k){MIX[set].has(k)?MIX[set].delete(k):MIX[set].add(k);MIX.n=parseInt($('mixn').value)||MIX.n;render();}
/* optional filter by question type (tag), grouped by the selected skills */
const tagKey=q=>q.skill+'|'+(q.tag||'Unclassified');
function mixTagsHtml(pool){
  const base=pool.filter(q=>MIX.skills.has(q.skill)&&MIX.levels.has(q.difficulty));
  const groups=SKILL_ORDER.filter(k=>MIX.skills.has(k)).map(k=>{
    const cnt=new Map();
    base.filter(q=>q.skill===k).forEach(q=>cnt.set(q.tag||'Unclassified',(cnt.get(q.tag||'Unclassified')||0)+1));
    const tags=[...cnt.keys()].sort((a,b)=>(a==='Unclassified')-(b==='Unclassified')||a.localeCompare(b));
    if(!tags.length)return '';
    return `<div class="tagsub">${esc(skillName(k))}</div><div class="chips">${tags.map(t=>{const key=k+'|'+t;
      return `<button class="chip ${MIX.tagsOff.has(key)?'':'on'}" data-k="${esc(key)}" onclick="mixTag(this.dataset.k)">${esc(t)} <span class="mono" style="opacity:.6">${cnt.get(t)}</span></button>`;}).join('')}</div>`;
  }).join('');
  if(!groups)return '';
  const off=[...MIX.tagsOff].filter(k=>MIX.skills.has(k.split('|')[0])).length;
  return `<details class="acc" data-k="mixtags" style="margin-top:16px" ${isOpen('mixtags')?'open':''}>
    <summary><span class="ttl"><span class="chev">▶</span><b>Question types</b><span class="tiny muted">${off?off+' excluded':'all included'}</span></span></summary>
    <div class="abody"><div class="row" style="gap:14px"><button class="link" style="font-size:13px" onclick="mixTagsAll(true)">Select all</button><button class="link" style="font-size:13px" onclick="mixTagsAll(false)">Clear all</button></div>${groups}</div></details>`;
}
function mixTag(key){MIX.tagsOff.has(key)?MIX.tagsOff.delete(key):MIX.tagsOff.add(key);MIX.n=parseInt($('mixn').value)||MIX.n;render();}
function mixTagsAll(on){
  MIX.n=parseInt($('mixn').value)||MIX.n;
  if(on)MIX.tagsOff.clear();
  else accessiblePool().filter(q=>MIX.skills.has(q.skill)).forEach(q=>MIX.tagsOff.add(tagKey(q)));
  render();
}
function mixPool(){return accessiblePool().filter(q=>MIX.skills.has(q.skill)&&MIX.levels.has(q.difficulty)&&!MIX.tagsOff.has(tagKey(q)));}
function beginMix(){
  MIX.n=Math.max(1,parseInt($('mixn').value)||10);
  const pool=mixPool();
  if(!pool.length){toast('No question matches these filters.');return;}
  startRun('Mixed set · '+Math.min(MIX.n,pool.length)+' questions',null,shuffle(pool).slice(0,MIX.n));
}

/* ============================================================
   RUNNING A QUIZ
============================================================ */
function qBlock(q,i,{review=false,given,flag=false,readonly=false}={}){
  if(!q)return `<div class="qcard"><div class="qnum">Question ${i+1}</div><p class="muted tiny">This question is no longer available.</p></div>`;
  const hide=!review&&RUN&&RUN.hideMeta;
  const tags=lvlTag(q.difficulty)+(q.tag&&!hide?`<span class="tag ttag">${esc(q.tag)}</span>`:'');
  const flagged=review?flag:!!(RUN&&RUN.flags[q.id]);
  const flagBtn=readonly?(flagged?`<span class="pill warn">${I.flag.replace('<svg','<svg width="13" height="13"')} Flagged</span>`:'')
    :`<button class="flagbtn ${flagged?'on':''}" id="fl_${q.id}" onclick="tglFlag(${q.id})">${I.flag}<span>${flagged?'Flagged':'Flag for '+esc(TUTOR)}</span></button>`;
  let body='';
  if(q.type==='mcq'){
    const sel=review?given:(RUN?RUN.answers[q.id]:undefined);
    body=`<div class="choices">${(q.choices||[]).map((c,ci)=>{
      let cls='';
      if(review){if(ci===q.correct)cls='correct';else if(sel!==undefined&&sel!==null&&sel!==''&&Number(sel)===ci)cls='wrong';}
      else if(sel===ci)cls='sel';
      return `<button class="choice ${cls}" ${review?'disabled':`onclick="choose(${q.id},${ci})"`}><span class="bub">${L[ci]}</span><span class="ctext">${q.choice_images&&q.choice_images[ci]?figImg(q,q.choice_images[ci],'cfig'):esc(c)}</span></button>`;
    }).join('')}</div>${review&&(given===undefined||given===null)?'<p class="tiny mono" style="color:var(--red);margin:10px 0 0">Not answered</p>':''}`;
  }else{
    const val=review?(given??''):(RUN&&RUN.answers[q.id]!=null?RUN.answers[q.id]:'');
    const ok=review&&sprCorrect(given,q.answer);
    body=`<div class="spr"><label class="fld" style="margin-bottom:8px"><span class="lb">Your answer</span>
      <input type="text" ${review?'disabled':''} value="${esc(val)}" placeholder="e.g. 3 or 5/2" inputmode="decimal" autocomplete="off"
        ${review?'':`oninput="typeIn(${q.id},this.value)"`}
        style="${review?(ok?'background:var(--green-soft)':'background:var(--red-soft)'):''}"></label>
      ${review?`<div class="tiny mono" style="color:${ok?'var(--green)':'var(--red)'}">Correct answer${answersOf(q.answer).length>1?'s (any one)':''}: ${answersOf(q.answer).map(esc).join(' or ')}</div>`:''}</div>`;
  }
  const sol=review?solHtml(q):'';
  return `<div class="qcard" id="qc_${q.id}">
    <div class="qhead"><div class="row"><span class="qnum">Question ${i+1}</span>${tags}
      ${hide?'':`<span class="tiny muted mono">${esc(skillName(q.skill))}</span>`}</div>${flagBtn}</div>
    <div class="stem">${stemHtml(q)}</div>${body}${sol}</div>`;
}
/* worked solution: several methods (fastest first) when available, else the plain steps */
const METHOD_KIND={fast:'Fastest',desmos:'Desmos',classic:'Classic'};
function solHtml(q){
  const ms=Array.isArray(q.methods)&&q.methods.length?q.methods:[{kind:'',label:'',steps:q.steps||[]}];
  const many=ms.length>1;
  const seen={};
  const body=ms.map(m=>{
    const steps=(m.steps||[]).map(x=>`<div>${esc(x)}</div>`).join('')||'<div class="muted">No solution recorded.</div>';
    const head=m.label||METHOD_KIND[m.kind]||'';
    const tag=seen[m.kind]?'Another way':(METHOD_KIND[m.kind]||'Method');seen[m.kind]=1;
    return `${head?`<div class="mhead ${esc(m.kind||'')}"><span class="mtag">${esc(tag)}</span>${m.label&&m.label!==METHOD_KIND[m.kind]?esc(m.label):''}</div>`:''}<div class="steps">${steps}</div>`;
  }).join('');
  return `<div class="sol"><h4>Worked solution${many?` · ${ms.length} ways`:''}</h4>${body}
    ${q.tip?`<div class="tip"><b>Watch out</b>${esc(q.tip)}</div>`:''}</div>`;
}
function sheetStrip(){
  return RUN.questions.map((q,i)=>{
    const a=RUN.answers[q.id],filled=a!==undefined&&a!=='';
    return `<button class="dot ${filled?'filled':''} ${RUN.flags[q.id]?'flagged':''}" id="dt_${q.id}" onclick="jumpTo(${q.id})">${i+1}</button>`;
  }).join('');
}
function jumpTo(id){const el=$('qc_'+id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});}
function refreshDot(id){
  const d=$('dt_'+id);if(!d)return;
  const a=RUN.answers[id];
  d.classList.toggle('filled',a!==undefined&&a!=='');
  d.classList.toggle('flagged',!!RUN.flags[id]);
}
VIEWS.run=()=>{
  if(!RUN)return `<div class="empty">No quiz in progress.</div>`;
  if(!RUN.questions)RUN.questions=RUN.qids.map(id=>D.Q.get(id)).filter(Boolean);
  if(RUN.timed)after(startClock);
  const answered=Object.keys(RUN.answers).length;
  return `<button class="back" onclick="leaveRun()">${I.back} Dashboard (progress is kept)</button>
    <div class="sheet"><div class="shead">
      <span class="stitle">${esc(RUN.title)}</span>
      ${RUN.timed?`<span class="clock" id="clk">--:--</span>`:`<span class="tiny mono muted" id="cnt">${answered}/${RUN.questions.length} answered</span>`}
    </div><div class="strip">${sheetStrip()}</div></div>
    ${RUN.questions.map((q,i)=>qBlock(q,i)).join('')}
    <button class="btn go wide" id="subbtn" onclick="submitRun()">Submit and see the worked solutions</button>`;
};
function leaveRun(){if(RUN&&RUN.timerId)clearInterval(RUN.timerId);home();}
function startClock(){
  if(RUN.timerId)clearInterval(RUN.timerId);
  const tick=()=>{
    const c=$('clk');if(!c||!RUN){if(RUN)clearInterval(RUN.timerId);return;}
    const left=Math.max(0,RUN.endTime-Date.now());
    const mm=Math.floor(left/60000),ss=Math.floor((left%60000)/1000);
    c.textContent=`${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
    c.classList.toggle('warn',left<60000);
    if(left<=0){clearInterval(RUN.timerId);toast('Time is up!');submitRun(true);}
  };
  tick();RUN.timerId=setInterval(tick,1000);
}
function bumpCount(){const c=$('cnt');if(c)c.textContent=`${Object.keys(RUN.answers).length}/${RUN.questions.length} answered`;}
function choose(qid,ci){
  RUN.answers[qid]=ci;
  const card=$('qc_'+qid);
  card.querySelectorAll('.choice').forEach((c,i)=>c.classList.toggle('sel',i===ci));
  refreshDot(qid);bumpCount();saveRun();
}
function typeIn(qid,v){if(v.trim()==='')delete RUN.answers[qid];else RUN.answers[qid]=v;refreshDot(qid);bumpCount();saveRun();}
function tglFlag(qid){
  RUN.flags[qid]=!RUN.flags[qid];
  if(!RUN.flags[qid])delete RUN.flags[qid];
  const b=$('fl_'+qid);
  b.classList.toggle('on',!!RUN.flags[qid]);
  b.querySelector('span').textContent=RUN.flags[qid]?'Flagged':'Flag for '+TUTOR;
  refreshDot(qid);saveRun();
}
async function submitRun(force){
  if(!RUN)return;
  const missing=RUN.questions.length-Object.keys(RUN.answers).length;
  if(!force&&missing>0&&!confirm(`${missing} question${missing>1?'s are':' is'} unanswered. Submit anyway?`))return;
  if(RUN.timerId)clearInterval(RUN.timerId);
  const btn=$('subbtn');busy(btn,true,'Saving…');
  const score=RUN.questions.filter(q=>isRight(q,RUN.answers[q.id])).length;
  const row={student_id:ME.id,quiz_id:RUN.quizId,title:RUN.title,question_ids:RUN.questions.map(q=>q.id),
    answers:RUN.answers,flags:RUN.flags,score,total:RUN.questions.length,timed:RUN.timed};
  const {data,error}=await sb.from('attempts').insert(row).select().single();
  if(error){busy(btn,false);toast('Could not save: '+errMsg(error)+' — try again.',5000);return;}
  D.attempts.push(data);
  RUN=null;saveRun();
  go('attempt',{id:data.id,fresh:true});
}

/* ============================================================
   ATTEMPT REVIEW
============================================================ */
let REVIEW_FILTER='all';
VIEWS.attempt=({id,fresh,back})=>{
  const a=D.attempts.find(x=>x.id===id);
  if(!a)return `<div class="empty">Attempt not found.</div>`;
  const qs=a.question_ids.map(qid=>D.Q.get(qid));
  const flags=a.flags||{},ans=a.answers||{};
  const show=(q,i)=>{
    const qid=a.question_ids[i];
    if(REVIEW_FILTER==='wrong')return !q||!isRight(q,ans[qid]);
    if(REVIEW_FILTER==='flag')return !!flags[qid];
    return true;
  };
  const who=ME.role==='tutor'?(D.students.find(s=>s.id===a.student_id)||{}).name:null;
  const r=a.score/a.total;
  const backTo=back||(ME.role==='tutor'?`go('student',{id:'${a.student_id}'})`:'home()');
  const nf=Object.values(flags).filter(Boolean).length;
  return `<button class="back" onclick="${backTo}">${I.back} Back</button>
    <div class="card" style="margin-bottom:22px"><div class="row between">
      <div><div class="eyebrow">${fresh?'Your result':'Attempt'}${who?' · '+esc(who):''}</div>
        <h2 style="font-size:22px;line-height:1.2">${esc(a.title)}</h2>
        <div class="tiny muted mono">${fmtDate(a.created_at)}${a.timed?' · timed':''}</div></div>
      <div style="text-align:right"><div class="scorebig" style="color:${r>=.8?'var(--green)':r>=.5?'var(--amber)':'var(--red)'}">${a.score}/${a.total}</div>
        <div class="tiny mono muted">${pct(a.score,a.total)}%</div></div></div>
      <div class="strip" style="margin-top:16px">${a.question_ids.map((qid,i)=>{
        const q=D.Q.get(qid),ok=q&&isRight(q,ans[qid]);
        return `<button class="dot ${ok?'ok':'ko'} ${flags[qid]?'flagged':''}" onclick="jumpTo(${qid})">${i+1}</button>`;}).join('')}</div>
      ${fresh&&nf?`<p class="tiny muted" style="margin:14px 0 0">You flagged ${nf} question${nf>1?'s':''}. ${esc(TUTOR)} will see ${nf>1?'them':'it'}.</p>`:''}
      ${fresh?`<div class="row" style="margin-top:16px">${a.quiz_id?`<button class="btn ghost sm" onclick="go('pre',{quizId:${a.quiz_id}})">Retake</button>`:''}${!a.quiz_id&&/^Mixed Hard/.test(a.title)?`<button class="btn ghost sm" onclick="go('special',{kind:'hard'})">New Mixed Hard</button>`:''}${!a.quiz_id&&/^My mistakes/.test(a.title)&&mistakePool().length?`<button class="btn ghost sm" onclick="go('special',{kind:'mistakes'})">My mistakes (${mistakePool().length} left)</button>`:''}<button class="btn go sm" onclick="home()">Back to dashboard</button></div>`:''}
    </div>
    <div class="chips" style="margin-bottom:16px">${[['all','All questions'],['wrong','Mistakes only'],['flag','Flagged']].map(([k,l])=>`<button class="chip ${REVIEW_FILTER===k?'on':''}" onclick="REVIEW_FILTER='${k}';render()">${l}</button>`).join('')}</div>
    ${qs.map((q,i)=>show(q,i)?qBlock(q,i,{review:true,given:ans[a.question_ids[i]],flag:!!flags[a.question_ids[i]],readonly:true}):'').join('')||'<div class="empty">Nothing to show with this filter.</div>'}`;
};

/* ============================================================
   TUTOR PANEL
============================================================ */
const TABS=[['students','Students'],['quizzes','Quizzes'],['bank','Question bank'],['review','Flags & activity']];
VIEWS.admin=({tab='students'}={})=>{
  const body={students:aStudents,quizzes:aQuizzes,bank:aBank,review:aReview}[tab]();
  return `<div class="tabs">${TABS.map(([k,l])=>`<button class="tab ${tab===k?'on':''}" onclick="go('admin',{tab:'${k}'})">${l}</button>`).join('')}</div>${body}`;
};
const accessOf=sid=>new Set(D.access.filter(a=>a.student_id===sid).map(a=>a.quiz_id));

/* ---------- students ---------- */
function aStudents(){
  if(!D.Q.size)return `<div class="empty">The question bank is empty. Start with the <b>Question bank</b> tab to import the question files (one per skill).</div>`;
  const cards=D.students.map(s=>{
    const acc=accessOf(s.id),att=D.attempts.filter(a=>a.student_id===s.id);
    const st=statsFor(s.id);const done=[...acc].filter(id=>st[id]).length;
    const last=att.reduce((m,a)=>a.created_at>m?a.created_at:m,'');
    const tot=att.reduce((n,a)=>n+a.total,0),ok=att.reduce((n,a)=>n+a.score,0);
    const flags=att.reduce((n,a)=>n+Object.values(a.flags||{}).filter(Boolean).length,0);
    return `<div class="card flat">
      <div class="row between"><div><h3 style="font-size:19px">${esc(s.name)}</h3>
        <div class="tiny muted mono">username: ${esc(s.username)}</div></div>
        <div class="row"><button class="btn ghost sm" onclick="go('student',{id:'${s.id}'})">Progress</button>
          <button class="btn go sm" onclick="go('grant',{id:'${s.id}'})">Open / close quizzes</button></div></div>
      <div class="grid g3" style="margin-top:14px">
        <div class="tiny"><span class="mono muted">Open quizzes</span><br><b>${acc.size}</b> <span class="muted">(${done} done)</span></div>
        <div class="tiny"><span class="mono muted">Accuracy</span><br><b>${tot?pct(ok,tot)+'%':'—'}</b> <span class="muted">over ${tot} q</span></div>
        <div class="tiny"><span class="mono muted">Last activity</span><br><b>${last?fmtDate(last):'never'}</b>${flags?` · <span style="color:var(--amber);font-weight:700">${flags} flag${flags>1?'s':''}</span>`:''}</div>
      </div>
      <hr class="div">
      <div class="row between">
        <div class="switch ${s.mix_enabled?'on':''}" style="max-width:320px;padding:9px 12px" onclick="tglMix('${s.id}',this)">
          <div class="track"><div class="knob"></div></div><div><b style="font-size:13.5px">Mixed sets</b><div class="tiny muted">Combine open topics freely</div></div></div>
        <div class="row" style="gap:14px"><button class="link" onclick="resetPw('${s.id}')">Reset password</button>
          <button class="link danger" onclick="delStudent('${s.id}')">Delete</button></div></div>
    </div>`;
  }).join('')||'<div class="empty">No students yet. Add your first one.</div>';
  return `<div class="row between" style="margin-bottom:16px"><h2 style="font-size:23px">Students</h2>
      <button class="btn go sm" onclick="addStudent()">Add student</button></div>
    <div class="stack">${cards}</div>`;
}
const WORDS=['maple','tiger','comet','delta','orbit','pixel','lemon','river','cedar','sigma','prism','vector','falcon','ember','quartz','lotus'];
const genPw=()=>WORDS[Math.floor(Math.random()*WORDS.length)]+'-'+(10+Math.floor(Math.random()*90))+WORDS[Math.floor(Math.random()*WORDS.length)].slice(0,3);
function addStudent(){
  modal(`<h3 style="font-size:21px;margin-bottom:16px">Add a student</h3>
    <label class="fld"><span class="lb">First name</span><input type="text" id="sName" oninput="$('sUser').value=slug(this.value)"></label>
    <label class="fld"><span class="lb">Username (what they type to sign in)</span><input type="text" id="sUser" autocapitalize="none"></label>
    <label class="fld"><span class="lb">Password (6+ characters)</span><input type="text" id="sPw" value="${genPw()}"></label>
    <div id="serr" class="tiny" style="color:var(--red);min-height:19px;font-weight:600"></div>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost sm" onclick="closeModal()">Cancel</button>
      <button class="btn go sm" id="sbtn" onclick="createStudent()">Create</button></div>`);
  setTimeout(()=>$('sName').focus(),0);
}
async function createStudent(){
  const name=$('sName').value.trim(),user=slug($('sUser').value),pw=$('sPw').value.trim();
  const err=m=>{$('serr').textContent=m;};
  if(!name||!user)return err('Name and username are required.');
  if(pw.length<6)return err('Password: at least 6 characters.');
  busy($('sbtn'),true,'Creating…');
  // separate client so the tutor stays signed in
  const tmp=window.supabase.createClient(CONF.SUPABASE_URL,CONF.SUPABASE_ANON_KEY,
    {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'satm-tmp'}});
  const {data,error}=await tmp.auth.signUp({email:toEmail(user),password:pw,options:{data:{name}}});
  if(error){busy($('sbtn'),false);return err(/registered|exists/i.test(error.message)?'This username is already taken.':error.message);}
  if(data.user&&Array.isArray(data.user.identities)&&!data.user.identities.length){busy($('sbtn'),false);return err('This username is already taken.');}
  const {data:prof}=await sb.from('profiles').select('*').eq('id',data.user.id).maybeSingle();
  if(prof){D.students.push(prof);}
  else{await loadData();}
  showCredentials(name,user,pw,data.user.id);
}
function showCredentials(name,user,pw,id){
  const url=location.origin+location.pathname;
  const txt=`SAT Math practice\n${url}\nUsername: ${user}\nPassword: ${pw}`;
  modal(`<h3 style="font-size:21px;margin-bottom:6px">Send this to ${esc(name)}</h3>
    <p class="tiny muted" style="margin-top:0">The password is not shown again (you can reset it later).</p>
    <textarea id="credtxt" readonly style="min-height:110px">${esc(txt)}</textarea>
    <div class="row" style="justify-content:flex-end;margin-top:14px">
      <button class="btn ghost sm" onclick="navigator.clipboard.writeText($('credtxt').value).then(()=>toast('Copied.'))">Copy</button>
      ${id?`<button class="btn go sm" onclick="closeModal();go('grant',{id:'${id}'})">Next: open quizzes</button>`:`<button class="btn go sm" onclick="closeModal();render()">Done</button>`}</div>`);
}
async function tglMix(id,node){
  const on=!node.classList.contains('on');
  node.classList.toggle('on',on);
  const {error}=await sb.from('profiles').update({mix_enabled:on}).eq('id',id);
  if(error){node.classList.toggle('on',!on);toast(errMsg(error));return;}
  D.students.find(s=>s.id===id).mix_enabled=on;
}
function resetPw(id){
  const s=D.students.find(x=>x.id===id);
  modal(`<h3 style="font-size:21px;margin-bottom:16px">New password for ${esc(s.name)}</h3>
    <label class="fld"><span class="lb">Password (6+ characters)</span><input type="text" id="rpw" value="${genPw()}"></label>
    <div id="rerr" class="tiny" style="color:var(--red);min-height:19px;font-weight:600"></div>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost sm" onclick="closeModal()">Cancel</button>
      <button class="btn go sm" id="rbtn" onclick="doResetPw('${id}')">Save</button></div>`);
}
async function doResetPw(id){
  const pw=$('rpw').value.trim();
  if(pw.length<6){$('rerr').textContent='At least 6 characters.';return;}
  busy($('rbtn'),true);
  const {error}=await sb.rpc('set_student_password',{student:id,new_password:pw});
  if(error){busy($('rbtn'),false);$('rerr').textContent=errMsg(error);return;}
  const s=D.students.find(x=>x.id===id);
  showCredentials(s.name,s.username,pw,null);
}
async function delStudent(id){
  const s=D.students.find(x=>x.id===id);
  if(!confirm(`Delete ${s.name}'s account and all their results? This cannot be undone.`))return;
  const {error}=await sb.rpc('delete_student',{student:id});
  if(error){toast(errMsg(error),5000);return;}
  D.students=D.students.filter(x=>x.id!==id);
  D.access=D.access.filter(a=>a.student_id!==id);
  D.attempts=D.attempts.filter(a=>a.student_id!==id);
  toast('Deleted.');render();
}

/* ---------- grant access (tree with checkboxes) ---------- */
let SEL=null;
VIEWS.grant=({id})=>{
  const s=D.students.find(x=>x.id===id);
  if(!s)return `<div class="empty">Student not found.</div>`;
  if(!SEL||SEL.sid!==id){SEL=new Set(accessOf(id));SEL.sid=id;}
  const st=statsFor(id);
  const tree=buildTree(D.quizzes);
  const cb=ids=>`<button class="cb" data-ids="${ids.join(',')}" onclick="event.preventDefault();event.stopPropagation();cbClick(this)">${I.checkw}</button>`;
  const html=tree.map(d=>{
    const k='g:'+d.domain;
    return `<details class="acc dom" data-k="${k}" ${isOpen(k)?'open':''}>
      <summary><span class="ttl">${cb(quizzesOfNode(d).map(q=>q.id))}<span class="chev">▶</span><h3>${esc(d.domain)}</h3></span>
        <span class="tiny mono muted cnt" data-ids="${quizzesOfNode(d).map(q=>q.id).join(',')}"></span></summary>
      <div class="abody">${d.skills.map(sk=>{
        const kk='g:'+sk.skill,ids=quizzesOfNode(sk).map(q=>q.id);
        return `<details class="acc sk" data-k="${kk}" ${isOpen(kk)?'open':''}>
          <summary><span class="ttl">${cb(ids)}<span class="chev">▶</span><b>${esc(skillName(sk.skill))}</b></span>
            <span class="tiny mono muted cnt" data-ids="${ids.join(',')}"></span></summary>
          <div class="abody">${sk.levels.map(l=>`
            <div class="row" style="margin:8px 8px 2px;gap:8px">${cb(l.quizzes.map(q=>q.id))}<span class="lvlhead" style="margin:0">${l.level==='All'?'Mixed':l.level} · all ${l.quizzes.length}</span></div>
            ${l.quizzes.map(q=>`<div class="qrow" style="padding-left:30px"><span class="row" style="gap:10px">${cb([q.id])}<span class="nm">${esc(quizLabel(q))}</span>
              <span class="tiny muted mono">${q.question_ids.length} q</span></span>${st[q.id]?scorePill(st[q.id]):''}</div>`).join('')}`).join('')}
          </div></details>`;}).join('')}</div></details>`;
  }).join('');
  after(refreshCbs);
  return `<button class="back" onclick="SEL=null;go('admin',{tab:'students'})">${I.back} Students</button>
    <div class="row between" style="margin-bottom:6px"><div><div class="eyebrow">Access</div><h2 style="font-size:24px">Quizzes open to ${esc(s.name)}</h2></div>
      <div class="row"><button class="btn ghost sm" onclick="SEL=null;go('admin',{tab:'students'})">Cancel</button>
      <button class="btn go sm" id="gsave" onclick="saveGrant('${id}')">Save</button></div></div>
    <p class="tiny muted">Tick a domain, a skill, a difficulty or a single quiz. Changes apply as soon as you save; ${esc(s.name)} sees them on next reload. <span id="gsum" class="mono"></span></p>
    <div class="row" style="gap:14px;margin:10px 0 14px"><button class="link" style="font-size:13px" onclick="expandAll(true)">Expand all</button><button class="link" style="font-size:13px" onclick="expandAll(false)">Collapse all</button></div>
    <div id="tree">${html||'<div class="empty">No quizzes exist yet. Import the question bank first.</div>'}</div>`;
};
function cbClick(el){
  const ids=el.dataset.ids.split(',').filter(Boolean).map(Number);
  const all=ids.every(i=>SEL.has(i));
  ids.forEach(i=>all?SEL.delete(i):SEL.add(i));
  refreshCbs();
}
function refreshCbs(){
  document.querySelectorAll('#tree .cb').forEach(el=>{
    const ids=el.dataset.ids.split(',').filter(Boolean).map(Number);
    const n=ids.filter(i=>SEL.has(i)).length;
    el.classList.toggle('on',n>0&&n===ids.length);
    el.classList.toggle('part',n>0&&n<ids.length);
  });
  document.querySelectorAll('#tree .cnt').forEach(el=>{
    const ids=el.dataset.ids.split(',').filter(Boolean).map(Number);
    el.textContent=ids.filter(i=>SEL.has(i)).length+'/'+ids.length+' open';
  });
  const before=accessOf(SEL.sid);
  const add=[...SEL].filter(i=>!before.has(i)).length,rem=[...before].filter(i=>!SEL.has(i)).length;
  const g=$('gsum');if(g)g.textContent=(add||rem)?`(+${add} / −${rem} unsaved)`:'';
}
async function saveGrant(id){
  const before=accessOf(id);
  const add=[...SEL].filter(i=>!before.has(i)),rem=[...before].filter(i=>!SEL.has(i));
  busy($('gsave'),true,'Saving…');
  try{
    if(add.length){const {error}=await sb.from('access').insert(add.map(q=>({student_id:id,quiz_id:q})));if(error)throw error;}
    for(let i=0;i<rem.length;i+=200){
      const {error}=await sb.from('access').delete().eq('student_id',id).in('quiz_id',rem.slice(i,i+200));if(error)throw error;
    }
    D.access=D.access.filter(a=>a.student_id!==id).concat([...SEL].map(q=>({student_id:id,quiz_id:q})));
    SEL=null;toast(`Saved: ${add.length} opened, ${rem.length} closed.`);go('admin',{tab:'students'});
  }catch(e){busy($('gsave'),false);toast(errMsg(e),5000);}
}

/* ---------- one student's progress ---------- */
VIEWS.student=({id})=>{
  const s=D.students.find(x=>x.id===id);
  if(!s)return `<div class="empty">Student not found.</div>`;
  const acc=accessOf(id),st=statsFor(id);
  const quizzes=D.quizzes.filter(q=>acc.has(q.id)||st[q.id]);
  const att=D.attempts.filter(a=>a.student_id===id);
  const bySkill=SKILL_ORDER.map(k=>{
    let t=0,ok=0;
    att.forEach(a=>a.question_ids.forEach(qid=>{const q=D.Q.get(qid);if(q&&q.skill===k){t++;if(isRight(q,(a.answers||{})[qid]))ok++;}}));
    return {k,t,ok};
  }).filter(x=>x.t);
  const tree=buildTree(quizzes);
  const treeHtml=tree.map(d=>{
    const k='p:'+d.domain,dq=quizzesOfNode(d),dd=dq.filter(q=>st[q.id]).length;
    return `<details class="acc dom" data-k="${k}" ${isOpen(k)?'open':''}><summary><span class="ttl"><span class="chev">▶</span><h3>${esc(d.domain)}</h3></span>
      <span class="row" style="gap:8px;flex-wrap:nowrap"><span class="tiny mono muted">${dd}/${dq.length}</span>${miniBar(dd,dq.length)}</span></summary>
      <div class="abody">${d.skills.map(sk=>sk.levels.map(l=>l.quizzes.map(q=>`<div class="qrow"><div><span class="nm">${esc(q.title)}</span>
        ${acc.has(q.id)?'':'<span class="tag" style="margin-left:6px">closed</span>'}</div>
        <div class="row" style="gap:8px">${scorePill(st[q.id])}${st[q.id]?`<button class="btn ghost xs" onclick="go('attempt',{id:${st[q.id].lastId}})">Last attempt</button>`:''}</div></div>`).join('')).join('')).join('')}</div></details>`;
  }).join('');
  return `<button class="back" onclick="go('admin',{tab:'students'})">${I.back} Students</button>
    <div class="row between"><div><div class="eyebrow">Progress</div><h2 style="font-size:26px">${esc(s.name)}</h2></div>
      <button class="btn go sm" onclick="go('grant',{id:'${id}'})">Open / close quizzes</button></div>
    ${bySkill.length?`<div class="sect">Accuracy by skill</div><table class="grid"><tr><th>Skill</th><th>Answered</th><th>Correct</th><th>%</th></tr>
      ${bySkill.map(x=>`<tr><td>${esc(skillName(x.k))}</td><td class="n">${x.t}</td><td class="n">${x.ok}</td>
      <td class="n" style="color:${x.ok/x.t>=.8?'var(--green)':x.ok/x.t>=.5?'var(--amber)':'var(--red)'};font-weight:700">${pct(x.ok,x.t)}%</td></tr>`).join('')}</table>`:''}
    <div class="sect">Quizzes</div>${treeHtml||'<div class="empty">No quiz open yet.</div>'}
    ${historyBlock(att,id)}`;
};

/* ---------- quizzes ---------- */
function aQuizzes(){
  const S=D.settings;
  const rows=SKILL_ORDER.map(k=>{
    const qs=D.quizzes.filter(q=>q.skill===k);if(!qs.length)return '';
    const c=l=>qs.filter(q=>q.level===l).length;
    return `<tr><td>${esc(skillName(k))}</td>${S.split_by_level?LEVELS.map(l=>`<td class="n">${c(l)||'—'}</td>`).join(''):`<td class="n">${c('All')}</td>`}
      <td class="n">${qs.reduce((n,q)=>n+q.question_ids.length,0)}</td></tr>`;
  }).join('');
  return `<h2 style="font-size:23px;margin-bottom:14px">Quizzes</h2>
    <div class="card flat"><div class="eyebrow">How quizzes are cut</div>
      <div class="row" style="align-items:flex-end;gap:16px">
        <label class="fld" style="margin:0"><span class="lb">Questions per quiz</span><input type="number" id="qsize" min="3" max="40" value="${S.quiz_size}" style="max-width:120px"></label>
        <div class="switch ${S.split_by_level?'on':''}" id="qsplit" onclick="this.classList.toggle('on')" style="padding:9px 12px">
          <div class="track"><div class="knob"></div></div><div><b style="font-size:13.5px">One series per difficulty</b></div></div>
        <div class="switch ${S.by_tag!==false?'on':''}" id="qbytag" onclick="this.classList.toggle('on')" style="padding:9px 12px">
          <div class="track"><div class="knob"></div></div><div><b style="font-size:13.5px">One series per question type</b></div></div>
        <label class="fld" style="margin:0"><span class="lb">Min. questions per type</span><input type="number" id="qmintag" min="2" max="20" value="${S.min_tag||5}" style="max-width:120px"></label>
        <button class="btn ghost sm" id="rbbtn" onclick="rebuildQuizzes()">Save &amp; rebuild</button></div>
      <p class="tiny muted" style="margin:12px 0 0">With <b>one series per question type</b>, each type (tag) with at least the minimum number of questions in a difficulty gets its own quizzes, named after it. Smaller types and "Unclassified" questions go into "Mixed types" quizzes.<br>
        Rebuilding re-cuts every automatic quiz. Students keep access to the new quizzes that contain questions they could already see. Past results stay in their history, but the "done" marks restart because the quizzes are new.</p></div>
    <div class="sect">${D.quizzes.length} quizzes</div>
    ${rows?`<table class="grid"><tr><th>Skill</th>${S.split_by_level?'<th>Easy</th><th>Medium</th><th>Hard</th>':'<th>Mixed</th>'}<th>Questions</th></tr>${rows}</table>`:'<div class="empty">No quizzes yet.</div>'}`;
}
/* split ids into n chunks of (almost) equal size, n = round(len/size) */
function evenChunks(ids,size){
  const n=Math.max(1,Math.round(ids.length/size)),base=Math.floor(ids.length/n),extra=ids.length%n,out=[];
  for(let i=0,p=0;i<n;i++){const len=base+(i<extra?1:0);out.push(ids.slice(p,p+len));p+=len;}
  return out;
}
/* within one skill+level: which tags get their own series, the rest is pooled */
function tagSeries(qs,minTag){
  const by=new Map();
  qs.forEach(q=>{const t=q.tag||'Unclassified';if(!by.has(t))by.set(t,[]);by.get(t).push(q.id);});
  let big=[...by].filter(([t,ids])=>t!=='Unclassified'&&ids.length>=minTag)
    .sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0]));
  const restOf=()=>[...by].filter(([t])=>!big.some(x=>x[0]===t)).flatMap(x=>x[1]);
  // never leave a "Mixed types" quiz of only 1-2 questions: fold the smallest type into it
  while(big.length&&restOf().length>0&&restOf().length<3)big=big.slice(0,-1);
  const out=big.map(([t,ids])=>({tag:t,ids}));
  const rest=restOf();
  if(rest.length)out.push({tag:null,ids:rest});
  return out;
}
function cutQuizzes(questions,size,split,byTag=true,minTag=5){
  const out=[];
  SKILL_ORDER.forEach(sk=>{
    const groups=split?LEVELS.map(l=>[l,questions.filter(q=>q.skill===sk&&q.difficulty===l)]):[['All',questions.filter(q=>q.skill===sk)]];
    groups.forEach(([lvl,qs])=>{
      if(!qs.length)return;
      const series=byTag?tagSeries(qs,minTag):[{tag:null,ids:qs.map(q=>q.id)}];
      const onlyMixed=series.length===1&&series[0].tag===null;
      let seq=0;
      series.forEach(({tag,ids})=>{
        const chunks=evenChunks(ids.slice().sort((a,b)=>a-b),size);
        const name=tag||(byTag&&!onlyMixed?MIXED_TYPES:'Quiz');
        chunks.forEach((c,i)=>{
          seq++;
          const label=name+(chunks.length>1||name==='Quiz'?' #'+(i+1):'');
          out.push({skill:sk,level:lvl,seq,tag,label,title:quizTitle(sk,lvl,label),question_ids:c,auto:true});
        });
      });
    });
  });
  return out;
}
const cutAll=qs=>cutQuizzes(qs,D.settings.quiz_size||10,D.settings.split_by_level!==false,D.settings.by_tag!==false,D.settings.min_tag||5);
async function rebuildQuizzes(){
  const size=Math.min(40,Math.max(3,parseInt($('qsize').value)||10));
  const split=$('qsplit').classList.contains('on');
  const byTag=$('qbytag').classList.contains('on');
  const minTag=Math.min(20,Math.max(2,parseInt($('qmintag').value)||5));
  if(D.quizzes.length&&!confirm(`Re-cut all quizzes into sets of about ${size}${split?', one series per difficulty':''}${byTag?', one series per question type':''}?`))return;
  busy($('rbbtn'),true,'Rebuilding…');
  try{
    // what each student could see before
    const seen={};
    D.students.forEach(s=>{
      const acc=accessOf(s.id);
      seen[s.id]=new Set(D.quizzes.filter(q=>acc.has(q.id)).flatMap(q=>q.question_ids));
    });
    let r=await sb.from('settings').update({quiz_size:size,split_by_level:split,by_tag:byTag,min_tag:minTag}).eq('id',1);if(r.error)throw r.error;
    Object.assign(D.settings,{quiz_size:size,split_by_level:split,by_tag:byTag,min_tag:minTag});
    const oldIds=D.quizzes.filter(q=>q.auto).map(q=>q.id);
    for(let i=0;i<oldIds.length;i+=200){r=await sb.from('quizzes').delete().in('id',oldIds.slice(i,i+200));if(r.error)throw r.error;}
    const fresh=cutAll([...D.Q.values()]);
    const inserted=await insertBatches('quizzes',fresh);
    const grants=[];
    D.students.forEach(s=>inserted.forEach(q=>{if(q.question_ids.some(id=>seen[s.id].has(id)))grants.push({student_id:s.id,quiz_id:q.id});}));
    if(grants.length)await insertBatches('access',grants,false);
    await loadData();
    toast(`Done: ${inserted.length} quizzes.`);go('admin',{tab:'quizzes'});
  }catch(e){busy($('rbbtn'),false);toast(errMsg(e),6000);await loadData();}
}
async function insertBatches(table,rows,ret=true,step=400){
  const out=[];
  for(let i=0;i<rows.length;i+=step){
    let q=sb.from(table).insert(rows.slice(i,i+step));
    if(ret)q=q.select();
    const {data,error}=await q;
    if(error)throw error;
    if(ret)out.push(...data);
  }
  return out;
}

/* ---------- question bank ---------- */
let BANK_SKILL='';
function aBank(){
  const qs=[...D.Q.values()];
  const rows=SKILL_ORDER.map(k=>{
    const c=l=>qs.filter(q=>q.skill===k&&q.difficulty===l).length;
    const t=qs.filter(q=>q.skill===k).length;
    return `<tr><td><button class="link" style="font-size:13.5px;text-align:left" onclick="BANK_SKILL='${k}';render()">${esc(skillName(k))}</button></td>${LEVELS.map(l=>`<td class="n">${c(l)||'—'}</td>`).join('')}<td class="n"><b>${t}</b></td></tr>`;
  }).join('');
  const list=BANK_SKILL?qs.filter(q=>q.skill===BANK_SKILL).sort((a,b)=>LEVELS.indexOf(a.difficulty)-LEVELS.indexOf(b.difficulty)||(a.tag||'').localeCompare(b.tag||'')||a.id-b.id):[];
  const nFig=qs.filter(q=>q.image||(q.choice_images&&q.choice_images.length)).length;
  return `<div class="row between" style="margin-bottom:14px"><h2 style="font-size:23px">Question bank · ${qs.length}</h2>
      <label class="btn go sm" style="display:inline-block">Import JSON files<input type="file" multiple accept=".json,application/json" style="display:none" onchange="importFile(this)"></label></div>
    <p class="tiny muted">Select one or several question files at once (one file per skill). Each question carries its College Board ID: importing a file again updates those questions instead of duplicating them. New questions are added to the matching quizzes. ${nFig} questions have a figure; figures are served from the <span class="mono">figures/</span> folder of the site.</p>
    <div id="impst" class="tiny mono" style="min-height:18px;margin-bottom:6px"></div>
    <table class="grid"><tr><th>Skill (click to browse)</th><th>Easy</th><th>Medium</th><th>Hard</th><th>Total</th></tr>${rows}</table>
    ${BANK_SKILL?`<div class="row between"><div class="sect">${esc(skillName(BANK_SKILL))} · ${list.length}</div><button class="link" onclick="BANK_SKILL='';render()">Close</button></div>
      ${list.map(q=>`<details class="acc sk"><summary><span class="ttl"><span class="chev">▶</span>${lvlTag(q.difficulty)}
        <span class="tiny" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:560px"><span class="mono muted">${esc(q.cb_id||'#'+q.id)}</span> · <b>${esc(q.tag||'')}</b> · ${esc(stemText(q).slice(0,100))}</span></span>
        <button class="link danger" style="font-size:12px" onclick="event.preventDefault();delQuestion(${q.id})">Delete</button></summary>
        <div class="abody" data-q="${q.id}"></div></details>`).join('')}`:''}`;
}
document.addEventListener('toggle',e=>{
  const t=e.target;
  if(!(t instanceof HTMLDetailsElement)||!t.open)return;
  const b=t.querySelector(':scope>.abody[data-q]');
  if(b&&!b.innerHTML){b.innerHTML=qBlock(D.Q.get(Number(b.dataset.q)),0,{review:true,given:null,readonly:true}).replace('Question 1','Preview');typeset(b);}
},true);
function normQuestion(q){
  const strArr=a=>Array.isArray(a)&&a.length?a.map(String):null;
  return {cb_id:q.cb_id?String(q.cb_id):null,skill:q.skill,difficulty:q.difficulty,type:q.type,stem:q.stem,
    choices:q.type==='mcq'?q.choices:null,correct:q.type==='mcq'?q.correct:null,
    answer:q.type==='spr'?String(q.answer):null,steps:Array.isArray(q.steps)?q.steps:[],tip:q.tip||'',
    tag:q.tag?String(q.tag):'Unclassified',image:q.image?String(q.image):null,choice_images:strArr(q.choice_images),
    methods:Array.isArray(q.methods)&&q.methods.length?q.methods:null};
}
async function importFile(input){
  const files=[...input.files];if(!files.length)return;
  const st=$('impst');
  let arr=[];
  for(const f of files){
    try{let a=JSON.parse(await f.text());if(!Array.isArray(a))a=a.questions||a.bank||[];arr=arr.concat(a);}
    catch(e){st.textContent=`${f.name}: not valid JSON.`;input.value='';return;}
  }
  const norm=s=>(s||'').replace(/\s+/g,' ').trim();
  const keyOf=q=>[q.skill,norm(q.stem),JSON.stringify(q.type==='mcq'?q.choices:String(q.answer))].join('|');
  const all=[...D.Q.values()];
  const byCb=new Map(all.filter(q=>q.cb_id).map(q=>[q.cb_id,q]));
  const have=new Set(all.map(keyOf));
  const bad=[],ups=[],ins=[],seenCb=new Set();
  arr.forEach((q,i)=>{
    if(!SKILLS[q.skill]||!LEVELS.includes(q.difficulty)||!['mcq','spr'].includes(q.type)||!q.stem){bad.push(i);return;}
    if(q.type==='mcq'&&(!Array.isArray(q.choices)||typeof q.correct!=='number')){bad.push(i);return;}
    if(q.type==='spr'&&(q.answer==null||q.answer==='')){bad.push(i);return;}
    const row=normQuestion(q);
    if(row.cb_id){if(seenCb.has(row.cb_id))return;seenCb.add(row.cb_id);ups.push(row);return;}
    const key=keyOf(q);if(have.has(key))return;have.add(key);ins.push(row);
  });
  const nNew=ups.filter(r=>!byCb.has(r.cb_id)).length+ins.length,nUpd=ups.length-ups.filter(r=>!byCb.has(r.cb_id)).length;
  const fl=`${files.length} file${files.length>1?'s':''}`;
  if(!ups.length&&!ins.length){st.textContent=`Nothing to import (${arr.length} read from ${fl}${bad.length?`, ${bad.length} invalid`:''}).`;input.value='';return;}
  if(!confirm(`${fl}: ${nNew} new question${nNew>1?'s':''}${nUpd?`, ${nUpd} updated`:''}. Import?${bad.length?` (${bad.length} invalid rows will be skipped)`:''}`)){input.value='';return;}
  try{
    st.textContent='Uploading questions…';
    const saved=[];
    for(let i=0;i<ups.length;i+=300){
      const {data,error}=await sb.from('questions').upsert(ups.slice(i,i+300),{onConflict:'cb_id'}).select();
      if(error)throw error;saved.push(...data);
    }
    if(ins.length)saved.push(...await insertBatches('questions',ins));
    const fresh=saved.filter(q=>!(q.cb_id&&byCb.has(q.cb_id)));
    st.textContent='Placing them into quizzes…';
    if(!D.quizzes.length)await insertBatches('quizzes',cutAll(saved),false);
    else if(fresh.length)await placeIntoQuizzes(fresh);
    await loadData();
    st.textContent='';toast(`Imported: ${fresh.length} new, ${saved.length-fresh.length} updated.`);render();
  }catch(e){st.textContent='Error: '+errMsg(e)+(/cb_id|tag|choice_images|column/i.test(errMsg(e))?' (did you run supabase/migration_2026_10.sql?)':'');await loadData();}
  input.value='';
}
/* add new questions to the last quiz of their series (same skill, level and type) while it has room */
async function placeIntoQuizzes(newQs){
  const size=D.settings.quiz_size||10,split=D.settings.split_by_level!==false,byTag=D.settings.by_tag!==false;
  const touched=new Map(),created=[];
  newQs.sort((a,b)=>a.id-b.id).forEach(q=>{
    const lvl=split?q.difficulty:'All';
    const pool=D.quizzes.concat(created).filter(z=>z.auto&&z.skill===q.skill&&z.level===lvl);
    let tag=byTag?(q.tag||null):null;
    if(tag!==null&&!pool.some(z=>z.tag===tag))tag=null;           // no series for this type: goes to "Mixed types"
    const series=pool.filter(z=>(z.tag||null)===tag).sort((a,b)=>a.seq-b.seq);
    let last=series[series.length-1];
    if(!last||last.question_ids.length>=size){
      const maxSeq=pool.reduce((m,z)=>Math.max(m,z.seq),0);
      const name=tag||(byTag&&pool.some(z=>z.tag)?MIXED_TYPES:'Quiz');
      const label=name+(series.length||name==='Quiz'?' #'+(series.length+1):'');
      last={skill:q.skill,level:lvl,seq:maxSeq+1,tag,label,auto:true,question_ids:[]};
      last.title=quizTitle(q.skill,lvl,label);created.push(last);
    }else if(last.id)touched.set(last.id,last);
    last.question_ids=last.question_ids.concat(q.id);
  });
  for(const z of touched.values()){
    const {error}=await sb.from('quizzes').update({question_ids:z.question_ids}).eq('id',z.id);if(error)throw error;
  }
  if(created.length)await insertBatches('quizzes',created,false);
}
async function delQuestion(id){
  if(!confirm('Delete this question from the bank and from every quiz?'))return;
  try{
    for(const z of D.quizzes.filter(z=>z.question_ids.includes(id))){
      const {error}=await sb.from('quizzes').update({question_ids:z.question_ids.filter(x=>x!==id)}).eq('id',z.id);if(error)throw error;
    }
    const {error}=await sb.from('questions').delete().eq('id',id);if(error)throw error;
    await loadData();toast('Deleted.');render();
  }catch(e){toast(errMsg(e),5000);}
}

/* ---------- flags & activity ---------- */
function aReview(){
  const name=id=>(D.students.find(s=>s.id===id)||{name:'(deleted)'}).name;
  const flagged=[];
  D.attempts.forEach(a=>Object.entries(a.flags||{}).forEach(([qid,v])=>{if(v)flagged.push({a,qid:Number(qid)});}));
  flagged.sort((x,y)=>y.a.created_at<x.a.created_at?-1:1);
  const recent=D.attempts.slice().sort((a,b)=>b.created_at<a.created_at?-1:1).slice(0,40);
  return `<h2 style="font-size:23px;margin-bottom:6px">Flagged questions · ${flagged.length}</h2>
    <p class="tiny muted" style="margin-top:0">Questions students marked for your next session.</p>
    ${flagged.length?flagged.map(({a,qid})=>{const q=D.Q.get(qid);const ok=q&&isRight(q,(a.answers||{})[qid]);
      return `<div class="card flat" style="padding:12px 16px;margin-bottom:10px"><div class="row between">
        <div style="min-width:0;flex:1"><b>${esc(name(a.student_id))}</b> <span class="tiny muted mono">· ${esc(a.title)} · ${fmtDate(a.created_at)}</span>
        <div class="tiny" style="margin-top:4px">${q?lvlTag(q.difficulty)+' '+esc(stemText(q).slice(0,140)):'(question deleted)'}</div></div>
        <div class="row"><span class="pill ${ok?'done':'bad'}">${ok?'right':'wrong'}</span>
        <button class="btn ghost xs" onclick="REVIEW_FILTER='flag';go('attempt',{id:${a.id},back:&quot;go('admin',{tab:'review'})&quot;})">Open</button></div></div></div>`;}).join('')
      :'<div class="empty">No flags right now.</div>'}
    <h2 style="font-size:23px;margin:30px 0 12px">Recent activity</h2>
    ${recent.length?`<div class="card flat" style="padding:8px 12px">${recent.map(a=>`<div class="qrow"><div><b style="font-size:14px">${esc(name(a.student_id))}</b>
      <span class="tiny muted"> · ${esc(a.title)}</span><div class="tiny muted mono">${fmtDate(a.created_at)}</div></div>
      <div class="row"><span class="pill ${a.score/a.total>=.8?'done':a.score/a.total>=.5?'warn':'bad'}">${a.score}/${a.total}</span>
      <button class="btn ghost xs" onclick="REVIEW_FILTER='all';go('attempt',{id:${a.id},back:&quot;go('admin',{tab:'review'})&quot;})">Review</button></div></div>`).join('')}</div>`
      :'<div class="empty">No attempts yet.</div>'}`;
}

/* ============================================================
   GO
============================================================ */
window.addEventListener('load',()=>typeset($('app')));
boot();
