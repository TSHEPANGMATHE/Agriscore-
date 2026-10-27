/* AgriScore shared data layer (demo only): accounts, sessions and loan applications.
   Everything is kept in this browser's localStorage. This is NOT real security. */
const USERS_KEY="agriscoreUsers", ROLE_KEY="agriscoreRole", LENDER_KEY="agriscoreLenderId";
const APP_KEY="agriscoreAppStatus", ENQ_KEY="agriscoreLoanEnquiries";
const DEMO_LENDER={id:"LND-DEMO",role:"lender",name:"Demo Lender",org:"Demo Agri-Finance (fictional)",orgType:"other",title:"Credit analyst",email:"lender@demo.agr"};
const DEMO_LENDER_PASSWORD="lender123";

function jget(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
function jset(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function cleanText(s){return String(s||"").replace(/[<>]/g,"").replace(/\s+/g," ").trim()}

/* ---------- users ---------- */
function loadUsers(){const u=jget(USERS_KEY,[]);return Array.isArray(u)?u:[]}
async function hashPassword(pw,salt){
  const data=new TextEncoder().encode(salt+":"+pw);
  if(window.crypto&&crypto.subtle){const buf=await crypto.subtle.digest("SHA-256",data);return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("")}
  let h=5381;for(const b of data)h=((h<<5)+h+b)>>>0;return "weak-"+h; /* fallback only if SubtleCrypto is unavailable */
}
function randomSalt(){const a=new Uint8Array(8);if(window.crypto&&crypto.getRandomValues)crypto.getRandomValues(a);else for(let i=0;i<8;i++)a[i]=Math.floor(Math.random()*256);return Array.from(a).map(b=>b.toString(16).padStart(2,"0")).join("")}
function emailTaken(email){
  const e=email.toLowerCase();
  return clients.some(c=>c.email.toLowerCase()===e)||DEMO_LENDER.email===e||loadUsers().some(u=>u.email.toLowerCase()===e);
}
function farmerFromUser(u){return {id:u.id,name:u.name,business:u.business,location:u.location,farmType:u.farmType,profileType:"New / Thin Credit File",email:u.email,password:"",weatherRisk:40,area:u.area,crops:u.crops,registered:true}}
function nextFarmerId(){const nums=clients.map(c=>parseInt(c.id.replace(/\D/g,""),10)||0);return "AGR"+String(Math.max(100,...nums)+1)}
/* Saves a new account. Returns {ok,user} or {ok:false,error:"translation key"} */
async function registerUser(form){
  if(emailTaken(form.email))return {ok:false,error:"su_err_email_taken"};
  const salt=randomSalt(), pwHash=await hashPassword(form.password,salt);
  const base={role:form.role,name:form.name,email:form.email.toLowerCase(),salt,pwHash,createdAt:new Date().toISOString(),privacyAcceptedAt:new Date().toISOString()};
  const user=form.role==="farmer"
    ?{...base,id:nextFarmerId(),business:form.business,location:form.location,farmType:form.farmType,area:form.area,crops:form.crops}
    :{...base,id:"LND-"+Date.now().toString(36).toUpperCase(),org:form.org,orgType:form.orgType,title:form.title};
  const users=loadUsers();users.push(user);
  if(!jset(USERS_KEY,users))return {ok:false,error:"su_err_save"};
  if(user.role==="farmer")clients.push(farmerFromUser(user));
  return {ok:true,user};
}
/* Registered farmers join the same `clients` list the farmer and lender portals both read. */
loadUsers().filter(u=>u.role==="farmer").forEach(u=>{if(!clients.some(c=>c.id===u.id))clients.push(farmerFromUser(u))});

/* ---------- sessions ---------- */
function getRole(){try{return localStorage.getItem(ROLE_KEY)||(localStorage.getItem("agriscoreClientId")?"farmer":null)}catch(e){return null}}
function startSession(role,id){
  try{localStorage.setItem(ROLE_KEY,role);
    if(role==="farmer"){localStorage.setItem("agriscoreClientId",id);localStorage.removeItem(LENDER_KEY)}
    else{localStorage.setItem(LENDER_KEY,id);localStorage.removeItem("agriscoreClientId")}}catch(e){}
}
function endSession(){try{["agriscoreClientId",ROLE_KEY,LENDER_KEY,"agriscoreDemo"].forEach(k=>localStorage.removeItem(k))}catch(e){}}
function lenderUser(){
  let id=null;try{id=localStorage.getItem(LENDER_KEY)}catch(e){}
  if(!id)return null;
  if(id===DEMO_LENDER.id)return DEMO_LENDER;
  return loadUsers().find(u=>u.id===id&&u.role==="lender")||null;
}

/* ---------- loan applications (shared by both portals) ---------- */
const APP_STATUSES=["Pending","Review","Approved","Declined"];
const SAMPLE_APPS=[ /* clearly labelled fictional sample applications */
  {id:"APP-001",clientId:"AGR001",amount:10000,purpose:"Seeds",date:"2026-09-02",status:"Pending"},
  {id:"APP-002",clientId:"AGR002",amount:5000,purpose:"Fertiliser",date:"2026-09-10",status:"Review"},
  {id:"APP-003",clientId:"AGR003",amount:4000,purpose:"Irrigation",date:"2026-09-15",status:"Pending"},
  {id:"APP-004",clientId:"AGR001",amount:7500,purpose:"Equipment",date:"2026-08-21",status:"Approved"},
  {id:"APP-005",clientId:"AGR003",amount:2500,purpose:"Seeds",date:"2026-08-28",status:"Declined"}
];
const stLabel=s=>t("app_st_"+s.toLowerCase());
const stBadge=s=>`<span class="tag st-${s.toLowerCase()}">${stLabel(s)}</span>`;
function allApps(){
  const dec=jget(APP_KEY,{});
  const enq=jget(ENQ_KEY,[]).map((r,i)=>({id:r.id||"ENQ-"+String(i+1).padStart(3,"0"),clientId:r.clientId,amount:r.amount,purpose:r.purpose,date:String(r.createdAt||"").slice(0,10),status:"Pending",sample:false}));
  return SAMPLE_APPS.map(a=>({...a,sample:true})).concat(enq).filter(a=>clients.some(c=>c.id===a.clientId))
    .map(a=>({...a,status:dec[a.id]?dec[a.id].status:a.status,at:dec[a.id]?dec[a.id].at:null}));
}
function setAppStatus(id,status){const dec=jget(APP_KEY,{});dec[id]={status,at:new Date().toISOString()};return jset(APP_KEY,dec)}

/* ---------- records uploaded by registered farmers (self-reported, unverified) ---------- */
const REC_KEY="agriscoreRecords";
const REC_KINDS={tx:mobileTransactions,rp:cooperativeRepayments,hr:harvestRecords};
function loadRecords(){const o=jget(REC_KEY,{});return o&&typeof o==="object"?o:{}}
/* (re)loads every saved upload into the same arrays the demo records live in, so scoring, the
   farmer pages and the lender portal all read them with no special cases */
function injectRecords(){
  Object.values(REC_KINDS).forEach(arr=>{for(let i=arr.length-1;i>=0;i--)if(arr[i].uploaded)arr.splice(i,1)});
  const all=loadRecords();
  Object.keys(all).forEach(id=>Object.keys(REC_KINDS).forEach(k=>(all[id][k]||[]).forEach(r=>REC_KINDS[k].push({...r,uploaded:true}))));
}
injectRecords();
function myRecords(id,kind){return (loadRecords()[id]||{})[kind]||[]}
function addRecords(id,kind,rows){
  const all=loadRecords();all[id]=all[id]||{};all[id][kind]=(all[id][kind]||[]).concat(rows);
  if(!jset(REC_KEY,all))return false;injectRecords();return true;
}
function deleteRecord(id,kind,recId){
  const all=loadRecords();if(!all[id])return;all[id][kind]=(all[id][kind]||[]).filter(r=>r.id!==recId);
  jset(REC_KEY,all);injectRecords();
}
function clearRecords(id){const all=loadRecords();delete all[id];jset(REC_KEY,all);injectRecords()}
