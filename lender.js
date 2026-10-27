/* AgriScore Lender Portal (demo). Own layout and navigation, but reads the SAME data as the farmer
   portal (clients, metrics(), consent, applications) so scores and histories always match. */
const LP_PREF="agriscoreLenderPrefs";
const LP_NAV=[["overview","lp_nav_overview"],["farmers","lp_nav_farmers"],["assess","lp_nav_assess"],["apps","lp_nav_apps"],["reports","lp_nav_reports"],["settings","lp_nav_settings"]];
const LP_TITLES={overview:"lp_overview_title",farmers:"lp_farmers_title",assess:"lp_assess_title",apps:"lp_apps_title",reports:"lp_rep_title",settings:"lp_set_title"};
const CAT_HEX={strong:"#2F7D4A",limited:"#C98A1B",notelig:"#B4493F"};
const FARM_KEYS={"Mixed crops":"su_ft_mixed","Grain production":"su_ft_grain","Small-scale mixed farming":"su_ft_small","Vegetable production":"su_ft_veg"};
const LS={q:"",cat:"",share:"",sort:"hi",appStatus:"",repLoc:"",msg:"",pref:false};
const LP_BRAND='<svg viewBox="0 0 36 36" fill="none" aria-hidden="true"><circle cx="18" cy="18" r="16" stroke="#D9A441" stroke-width="2"/><path d="M18 27V15" stroke="#78B66A" stroke-width="2.4" stroke-linecap="round"/><path d="M18 18c-4 0-6-2.500-6-6 4 0 6 2.500 6 6zM18 21c4 0 6-2.500 6-6-4 0 6 2.500 6 6z" fill="#78B66A"/></svg>';
let lpLastKey="";

/* ---------- helpers ---------- */
/* Registered farmers must have explicitly shared. Fictional demo farmers count as shared unless they declined. */
function canView(c){const g=getConsent(c.id);return c.registered?g===true:g!==false}
function shareText(c){const g=getConsent(c.id);if(g===true)return t("lender_shared");if(g===false)return t("lender_not_shared");return canView(c)?t("lp_demo_shared"):t("lender_not_shared")}
const tfarm=v=>FARM_KEYS[v]?t(FARM_KEYS[v]):esc(v);
const catBadge=s=>`<span class="tag cat-${outcomeKey(s)}">${category(s)}</span>`;
const cname=id=>{const c=clients.find(x=>x.id===id);return c?c.name:id};
const clientApps=c=>allApps().filter(a=>a.clientId===c.id).sort((x,y)=>String(y.date).localeCompare(String(x.date)));
const appPurpose=a=>a.sample?tpurpose(a.purpose):esc(a.purpose);
const sel=(v,cur)=>v===cur?" selected":"";
const orgTypeLabel=v=>({bank:"su_ot_bank",mfi:"su_ot_mfi",coop:"su_ot_coop",other:"su_ot_other"}[v]?t({bank:"su_ot_bank",mfi:"su_ot_mfi",coop:"su_ot_coop",other:"su_ot_other"}[v]):"—");
function lpRoute(){
  const h=location.hash.replace("#","");
  if(h.indexOf("l-")!==0)return {page:"overview",arg:""};
  const p=h.slice(2).split("/");
  return {page:LP_NAV.some(n=>n[0]===p[0])?p[0]:"overview",arg:decodeURIComponent(p[1]||"")};
}
function download(name,text,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function csvCell(v){v=String(v==null?"":v);if(/^[=+\-@]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"'}
function lpLogout(){endSession();location.hash="";location.reload()}
const kpi=(v,l,cls="")=>`<div class="lp-kpi ${cls}"><b>${v}</b><span>${l}</span></div>`;

/* ---------- Overview ---------- */
function lpOverview(){
  const vis=clients.filter(canView), ms={};clients.forEach(c=>{ms[c.id]=metrics(c)});
  const cnt=k=>vis.filter(c=>outcomeKey(ms[c.id].score)===k).length;
  const apps=allApps(), n=s=>apps.filter(a=>a.status===s).length, tot=vis.length||1;
  const seg=k=>`<span style="width:${cnt(k)/tot*100}%;background:${CAT_HEX[k]}"></span>`;
  const leg=k=>`<span><i style="background:${CAT_HEX[k]}"></i>${t("category_"+(k==="notelig"?"notelig":k))} (${cnt(k)})</span>`;
  const bars=clients.map(c=>{const ok=canView(c),sc=ms[c.id].score;return `<div class="lp-bar-row"><span>${esc(c.name)}</span><div class="lp-bar"><span style="width:${ok?sc/8.5:0}%;background:${CAT_HEX[outcomeKey(sc)]}"></span></div><b>${ok?sc:"—"}</b></div>`}).join("");
  const recent=apps.slice().sort((a,b)=>String(b.at||b.date).localeCompare(String(a.at||a.date))).slice(0,5);
  const rows=recent.map(a=>`<tr><td class="lp-id">${a.id}</td><td>${esc(cname(a.clientId))}</td><td>${fmtMoney(a.amount)}</td><td>${stBadge(a.status)}</td><td>${fmtDate(String(a.at||a.date).slice(0,10))}</td></tr>`).join("");
  return `<div class="lp-head"><p>${t("lp_overview_sub")}</p></div>
<div class="lp-kpis">${kpi(clients.length,t("lp_total"))}${kpi(cnt("strong"),t("category_strong"),"good")}${kpi(cnt("limited"),t("category_limited"),"warn")}${kpi(cnt("notelig"),t("category_notelig"),"bad")}${kpi(n("Pending")+n("Review"),t("lp_pending"),"warn")}${kpi(n("Approved"),stLabel("Approved"),"good")}${kpi(n("Declined"),stLabel("Declined"),"bad")}</div>
<div class="lp-grid2"><section class="lp-card"><h3>${t("lp_mix")}</h3><div class="lp-mix">${seg("strong")}${seg("limited")}${seg("notelig")}</div><div class="lp-legend">${leg("strong")}${leg("limited")}${leg("notelig")}<span>${t("lender_not_shared")} (${clients.length-vis.length})</span></div><p class="small muted" style="margin-top:10px">${t("lp_note_counts")}</p></section>
<section class="lp-card"><h3>${t("lp_dist")}</h3>${bars}</section></div>
<section class="lp-card"><h3>${t("lp_recent")}</h3>${table([t("lp_col_appid"),t("lp_col_name"),t("lp_col_amount"),t("lp_col_status"),t("lp_col_date")],rows)}</section>`;
}

/* ---------- Farmer directory ---------- */
function farmerRows(){
  const q=LS.q.toLowerCase();
  const rows=clients.map(c=>({c,m:metrics(c),ok:canView(c)})).filter(({c,m,ok})=>{
    if(q&&!`${c.name} ${c.id} ${c.location} ${c.farmType}`.toLowerCase().includes(q))return false;
    if(LS.cat&&!(ok&&outcomeKey(m.score)===LS.cat))return false;
    if(LS.share==="shared"&&!ok)return false;
    if(LS.share==="unshared"&&ok)return false;
    return true});
  const hi=r=>r.ok?r.m.score:-1, lo=r=>r.ok?r.m.score:1e9;
  rows.sort((a,b)=>LS.sort==="name"?a.c.name.localeCompare(b.c.name):LS.sort==="lo"?lo(a)-lo(b):hi(b)-hi(a));
  return rows;
}
function farmerTable(){
  const rows=farmerRows();
  if(!rows.length)return `<div class="lp-card empty">${t("lp_no_match")}</div>`;
  const html=rows.map(({c,m,ok})=>{const la=clientApps(c)[0];
    return `<tr><td><b>${esc(c.name)}</b><br><span class="small muted">${esc(shareText(c))}</span></td><td class="lp-id">${c.id}</td><td>${esc(c.location)}</td><td>${tfarm(c.farmType)}</td><td><b>${ok?m.score:"—"}</b></td><td>${ok?catBadge(m.score):"—"}</td><td>${la?stBadge(la.status):"—"}</td><td>${ok?`<a class="lp-btn" href="#l-assess/${c.id}">${t("lp_open")}</a>`:`<button class="lp-btn ghost" disabled>${t("lender_not_shared_btn")}</button>`}</td></tr>`}).join("");
  return `<div class="lp-card" style="padding:0">${table([t("lp_col_name"),t("lp_col_id"),t("lp_col_loc"),t("lp_col_type"),t("lp_col_score"),t("lp_col_cat"),t("lp_col_app"),""],html)}</div><p class="small muted">${tf("lp_showing",{n:rows.length,total:clients.length})}</p>`;
}
function lpFarmers(){
  return `<div class="lp-head"><p>${t("lp_farmers_sub")}</p></div><div class="lp-toolbar">
<input type="search" id="lp-q" value="${esc(LS.q)}" placeholder="${t("lp_search")}" aria-label="${t("lp_search")}">
<select id="lp-cat" aria-label="${t("lp_col_cat")}"><option value="">${t("lp_f_allcat")}</option><option value="strong"${sel("strong",LS.cat)}>${t("category_strong")}</option><option value="limited"${sel("limited",LS.cat)}>${t("category_limited")}</option><option value="notelig"${sel("notelig",LS.cat)}>${t("category_notelig")}</option></select>
<select id="lp-share" aria-label="${t("lp_f_allshare")}"><option value="">${t("lp_f_allshare")}</option><option value="shared"${sel("shared",LS.share)}>${t("lender_shared")}</option><option value="unshared"${sel("unshared",LS.share)}>${t("lender_not_shared")}</option></select>
<select id="lp-sort" aria-label="${t("lp_sort_hi")}"><option value="hi"${sel("hi",LS.sort)}>${t("lp_sort_hi")}</option><option value="lo"${sel("lo",LS.sort)}>${t("lp_sort_lo")}</option><option value="name"${sel("name",LS.sort)}>${t("lp_sort_name")}</option></select></div>
<div id="lp-ft">${farmerTable()}</div>`;
}
function bindFarmers(){
  const upd=()=>{LS.q=document.getElementById("lp-q").value;LS.cat=document.getElementById("lp-cat").value;LS.share=document.getElementById("lp-share").value;LS.sort=document.getElementById("lp-sort").value;document.getElementById("lp-ft").innerHTML=farmerTable()};
  ["lp-q","lp-cat","lp-share","lp-sort"].forEach(id=>document.getElementById(id).addEventListener("input",upd));
}

/* ---------- Credit assessment ---------- */
function indicators(c,m){
  const S=[],R=[],V=[],out=m.rp.filter(r=>r.status==="Outstanding").length,total=m.tx.length+m.rp.length+m.hr.length;
  if(m.rp.length&&m.repaymentRate>=90)S.push(tf("lp_str_repay",{rate:m.repaymentRate}));
  if(m.tx.length&&m.net>0)S.push(tf("lp_str_cf",{net:fmtMoney(m.net)}));
  if(m.tx.length>=15)S.push(tf("lp_str_activity",{n:m.tx.length}));
  if(m.hr.length&&m.harvestRate>=70)S.push(tf("lp_str_harvest",{rate:m.harvestRate}));
  if(c.weatherRisk<30)S.push(tf("lp_str_weather",{risk:c.weatherRisk}));
  if(m.rp.length&&m.repaymentRate<70)R.push(tf("lp_risk_repay",{rate:m.repaymentRate}));
  if(out)R.push(tf("lp_risk_out",{n:out}));
  if(m.tx.length&&m.net<=0)R.push(tf("lp_risk_cf",{net:fmtMoney(m.net)}));
  if(c.weatherRisk>=45)R.push(tf("lp_risk_weather",{risk:c.weatherRisk}));
  if(m.score<450)R.push(t("lp_risk_score"));
  if(m.tx.length<15||m.rp.length<15)V.push(tf("lp_rev_thin",{n:total}));
  if(m.hr.length<12||m.harvestRate<50)V.push(t("lp_rev_harvest"));
  if([...m.tx,...m.rp,...m.hr].some(x=>x.uploaded))V.push(t("lp_rev_self"));
  V.push(t("lp_rev_demo"));
  return {S,R,V};
}
const ul=(a,cls)=>`<ul class="lp-ind ${cls}">${a.length?a.map(x=>`<li>${esc(x)}</li>`).join(""):`<li>${t("lp_none_listed")}</li>`}</ul>`;
function lpAssess(u,r){
  const picker=`<div class="lp-toolbar lp-noprint"><label for="lp-pick" class="small muted">${t("lp_pick")}</label><select id="lp-pick"><option value="">${t("lp_pick")}</option>${clients.map(c=>`<option value="${c.id}"${sel(c.id,r.arg)}>${esc(c.name)} (${c.id})</option>`).join("")}</select></div>`;
  const c=clients.find(x=>x.id===r.arg);
  if(!c)return `<div class="lp-head"><p>${t("lp_assess_sub")}</p></div>${picker}`;
  if(!canView(c))return `${picker}<div class="lp-card">${t("lp_not_shared_msg")}</div>`;
  const m=metrics(c),k=outcomeKey(m.score),I=indicators(c,m);
  const factors=[[t("score_factor_mob"),m.mobileRate,WEIGHTS.mobile],[t("score_factor_repay"),m.repaymentScore,WEIGHTS.repayment],[t("score_factor_harvest"),m.harvestRate,WEIGHTS.harvest],[t("score_factor_weather"),m.weatherScore,WEIGHTS.weather]]
    .map(([n,rate,w])=>`<tr><td>${n}</td><td>${rate}%</td><td>${Math.round(rate/100*w)} / ${w}</td></tr>`).join("");
  const rp=m.rp.slice().sort((a,b)=>b.scheduledDate.localeCompare(a.scheduledDate)).slice(0,8).map(x=>`<tr><td class="lp-id">${x.id}</td><td>${esc(x.cooperative)}</td><td>${fmtDate(x.scheduledDate)}</td><td>${fmtDate(x.actualDate)}</td><td>${fmtMoney(x.paidAmount)}</td><td>${badge(x.status)}</td></tr>`).join("");
  const tx=m.tx.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8).map(x=>`<tr><td>${fmtDate(x.date)}</td><td>${esc(x.description)}</td><td>${tdir(x.direction)}</td><td>${amt(x)}</td></tr>`).join("");
  const hr=m.hr.slice().sort((a,b)=>b.harvestDate.localeCompare(a.harvestDate)).slice(0,8).map(x=>`<tr><td><span class="lp-id">${x.id}</span><br><span class="small muted">${tcrop(x.crop)}</span></td><td>${tseason(x.season)}</td><td>${fmtDate(x.harvestDate)}</td><td>${Math.round(x.quantityKg).toLocaleString()}</td><td>${Math.round(x.yieldPerHa).toLocaleString()}</td></tr>`).join("");
  const wl=c.weatherRisk<30?"weather_lower":c.weatherRisk<45?"weather_moderate":"weather_higher";
  const mine=clientApps(c).map(a=>`<tr><td class="lp-id">${a.id}</td><td>${fmtMoney(a.amount)}</td><td>${appPurpose(a)}</td><td>${fmtDate(a.date)}</td><td>${stBadge(a.status)}</td></tr>`).join("");
  return `${picker}<div class="lp-card"><div class="lp-hero"><div class="score-ring" style="--out:${CAT_HEX[k]};--score-deg:${m.score/MAX_SCORE*100}%"><div class="score-ring-inner"><div class="score-number">${m.score}</div><div class="score-outof">/ ${MAX_SCORE}</div></div></div>
<div class="lp-prof" style="flex:1;min-width:240px"><h3 style="font-size:20px;margin-bottom:4px">${esc(c.name)} ${catBadge(m.score)}</h3><dl><dt>${t("lp_col_id")}</dt><dd class="lp-id">${c.id}</dd><dt>${t("su_biz")}</dt><dd>${esc(c.business)}</dd><dt>${t("lp_col_loc")}</dt><dd>${esc(c.location)}</dd><dt>${t("lp_col_type")}</dt><dd>${tfarm(c.farmType)}</dd><dt>${t("su_area")}</dt><dd>${c.area}</dd><dt>${t("lender_shared")}</dt><dd>${esc(shareText(c))}</dd></dl></div></div></div>
<section class="lp-card"><h3>${t("lp_summary_head")}</h3><p style="margin:0">${esc(tf("lp_summary",{name:c.name,cat:category(m.score),score:m.score,rate:m.repaymentRate,net:fmtMoney(m.net)}))}</p></section>
<div class="lp-grid2"><section class="lp-card"><h3>${t("lp_breakdown")}</h3>${table([t("lp_col_factor"),t("lp_col_rate"),t("lp_col_points")],factors)}</section>
<section class="lp-card"><h3>${t("lp_weather_head")}</h3><div class="lp-kpis" style="margin:0">${kpi(c.weatherRisk+"%",t("weather_risk")+" · "+t(wl),c.weatherRisk<30?"good":c.weatherRisk<45?"warn":"bad")}</div></section></div>
<div class="lp-grid2"><section class="lp-card"><h3>${t("lp_strengths")}</h3>${ul(I.S,"good")}<h3 style="margin-top:14px">${t("lp_risks")}</h3>${ul(I.R,"bad")}</section><section class="lp-card"><h3>${t("lp_review")}</h3>${ul(I.V,"warn")}</section></div>
<section class="lp-card"><h3>${t("lp_hist_repay")} <span class="small muted">· ${t("lp_latest")}</span></h3>${table([t("th_rp_id"),t("th_cooperative"),t("th_scheduled"),t("th_paid_on"),t("th_paid_amount"),t("th_status")],rp)}</section>
<section class="lp-card"><h3>${t("lp_hist_tx")} <span class="small muted">· ${t("lp_latest")}</span></h3>${table([t("th_date"),t("th_description"),t("th_direction"),t("th_amount")],tx)}</section>
<section class="lp-card"><h3>${t("lp_hist_harv")} <span class="small muted">· ${t("lp_latest")}</span></h3>${table([t("th_hr_id"),t("th_season"),t("th_harvest_date"),t("th_quantity"),t("th_yield")],hr)}</section>
<section class="lp-card"><h3>${t("lp_farmer_apps")}</h3>${table([t("lp_col_appid"),t("lp_col_amount"),t("lp_col_purpose"),t("lp_col_date"),t("lp_col_status")],mine)}</section>
<div class="lp-actions"><button class="lp-btn" id="lp-dl">${t("lender_download")}</button><button class="lp-btn ghost" id="lp-print">${t("lp_print")}</button><a class="lp-btn ghost" href="#l-farmers">${t("lp_back")}</a></div>`;
}
function bindAssess(u,r){
  document.getElementById("lp-pick").addEventListener("change",e=>{location.hash="l-assess"+(e.target.value?"/"+e.target.value:"")});
  const c=clients.find(x=>x.id===r.arg);if(!c||!canView(c))return;
  document.getElementById("lp-dl").addEventListener("click",()=>{
    const m=metrics(c);
    const rep=t("demo_report").replace("{name}",c.name).replace("{id}",c.id).replace("{score}",m.score).replace("{category}",category(m.score)).replace("{tx}",m.tx.length).replace("{rp}",m.rp.length).replace("{hr}",m.hr.length);
    download(`${c.id}-demo-report.txt`,rep,"text/plain");
  });
  document.getElementById("lp-print").addEventListener("click",()=>window.print());
}

/* ---------- Loan applications ---------- */
function lpApps(){
  const msg=LS.msg;LS.msg="";
  let apps=allApps().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  if(LS.appStatus)apps=apps.filter(a=>a.status===LS.appStatus);
  const acts=a=>[["Review","lp_act_review","ghost"],["Approved","lp_act_approve","ok"],["Declined","lp_act_decline","no"]].filter(x=>x[0]!==a.status).map(x=>`<button class="lp-btn ${x[2]}" data-app="${a.id}" data-to="${x[0]}">${t(x[1])}</button>`).join("");
  const rows=apps.map(a=>`<tr><td class="lp-id">${a.id}</td><td><b>${esc(cname(a.clientId))}</b><br><span class="small muted">${a.clientId}</span></td><td>${fmtMoney(a.amount)}</td><td>${appPurpose(a)}</td><td>${fmtDate(a.date)}</td><td>${a.sample?t("lp_src_sample"):t("lp_src_farmer")}</td><td>${stBadge(a.status)}</td><td><div class="lp-actions">${acts(a)}</div></td></tr>`).join("");
  const dec=jget(APP_KEY,{}),log=Object.keys(dec).sort((x,y)=>String(dec[y].at).localeCompare(String(dec[x].at))).slice(0,8).map(id=>{const a=allApps().find(z=>z.id===id);return `<li>${fmtDate(String(dec[id].at).slice(0,10))} · <span class="lp-id">${id}</span> → ${stLabel(dec[id].status)}${a?" ("+esc(cname(a.clientId))+")":""}</li>`}).join("");
  return `<div class="lp-head"><p>${t("lp_apps_sub")}</p></div>${msg?`<div class="lp-msg" role="status">${esc(msg)}</div>`:""}
<div class="lp-toolbar"><select id="lp-appstatus" aria-label="${t("lp_col_status")}"><option value="">${t("lp_st_all")}</option>${APP_STATUSES.map(s=>`<option value="${s}"${sel(s,LS.appStatus)}>${stLabel(s)}</option>`).join("")}</select></div>
<div class="lp-card" style="padding:0">${apps.length?table([t("lp_col_appid"),t("lp_col_name"),t("lp_col_amount"),t("lp_col_purpose"),t("lp_col_date"),t("lp_col_source"),t("lp_col_status"),t("lp_col_actions")],rows):`<div class="empty">${t("lp_no_apps")}</div>`}</div>
<section class="lp-card"><h3>${t("lp_activity")}</h3>${log?`<ul class="lp-ind">${log}</ul>`:`<p class="small muted" style="margin:0">${t("lp_no_activity")}</p>`}</section>`;
}
function bindApps(){
  document.getElementById("lp-appstatus").addEventListener("change",e=>{LS.appStatus=e.target.value;renderLender()});
  document.querySelectorAll("[data-app]").forEach(b=>b.addEventListener("click",()=>{
    const a=allApps().find(x=>x.id===b.dataset.app);if(!a)return;
    const to=b.dataset.to;
    if(!confirm(tf("lp_confirm",{id:a.id,name:cname(a.clientId),status:stLabel(to)})))return;
    setAppStatus(a.id,to);
    LS.msg=tf("lp_updated",{id:a.id,status:stLabel(to)});
    renderLender();
  }));
}

/* ---------- Portfolio and reports ---------- */
function repFarmers(){return clients.filter(c=>!LS.repLoc||c.location===LS.repLoc)}
function lpReports(){
  const locs=[...new Set(clients.map(c=>c.location))].sort(), sub=repFarmers(), vis=sub.filter(canView);
  const grp=k=>vis.filter(c=>outcomeKey(metrics(c).score)===k);
  const rows=["strong","limited","notelig"].map(k=>{const g=grp(k),avg=g.length?Math.round(g.reduce((s,c)=>s+metrics(c).score,0)/g.length):"—";return `<tr><td><span class="tag cat-${k}">${t("category_"+k)}</span></td><td>${g.length}</td><td>${vis.length?Math.round(g.length/vis.length*100):0}%</td><td>${avg}</td></tr>`}).join("");
  const seg=k=>`<span style="width:${vis.length?grp(k).length/vis.length*100:0}%;background:${CAT_HEX[k]}"></span>`;
  const list=vis.map(c=>{const m=metrics(c),la=clientApps(c)[0];return `<tr><td>${esc(c.name)}</td><td class="lp-id">${c.id}</td><td>${esc(c.location)}</td><td>${m.score}</td><td>${catBadge(m.score)}</td><td>${la?stBadge(la.status):"—"}</td></tr>`}).join("");
  return `<div class="lp-head"><p>${t("lp_rep_sub")}</p></div>
<div class="lp-toolbar"><select id="lp-loc" aria-label="${t("lp_col_loc")}"><option value="">${t("lp_rep_loc")}</option>${locs.map(l=>`<option value="${esc(l)}"${sel(l,LS.repLoc)}>${esc(l)}</option>`).join("")}</select>
<button class="lp-btn" id="lp-csv">${t("lp_csv")}</button><button class="lp-btn ghost" id="lp-print">${t("lp_rep_print")}</button></div>
<p class="lp-report-head">AgriScore · ${t("lp_rep_title")} · ${tf("lp_generated",{date:new Date().toLocaleDateString("en-ZA")})}</p>
<div class="lp-kpis">${kpi(sub.length,t("lp_total"))}${kpi(vis.length,t("lender_shared"),"good")}${kpi(sub.length-vis.length,t("lender_not_shared"),"warn")}</div>
<section class="lp-card"><h3>${t("lp_mix")}</h3><div class="lp-mix">${seg("strong")}${seg("limited")}${seg("notelig")}</div>${table([t("lp_col_cat"),t("lp_nav_farmers"),t("lp_rep_share"),t("lp_rep_avg")],rows)}</section>
<section class="lp-card"><h3>${t("lp_farmers_title")}</h3>${table([t("lp_col_name"),t("lp_col_id"),t("lp_col_loc"),t("lp_col_score"),t("lp_col_cat"),t("lp_col_app")],list)}</section>
<p class="small muted">${tf("lp_generated",{date:new Date().toLocaleDateString("en-ZA")})}</p>`;
}
function bindReports(){
  document.getElementById("lp-loc").addEventListener("change",e=>{LS.repLoc=e.target.value;renderLender()});
  document.getElementById("lp-print").addEventListener("click",()=>window.print());
  document.getElementById("lp-csv").addEventListener("click",()=>{
    const head=[t("lp_col_id"),t("lp_col_name"),t("lp_col_loc"),t("lp_col_type"),t("lp_col_score"),t("lp_col_cat"),t("lp_col_app")];
    const lines=[head].concat(repFarmers().map(c=>{const ok=canView(c),m=metrics(c),la=clientApps(c)[0];return [c.id,c.name,c.location,tfarm(c.farmType).replace(/&amp;/g,"&"),ok?m.score:"",ok?category(m.score):t("lender_not_shared"),la?stLabel(la.status):""]}));
    download("agriscore-portfolio-demo.csv","\ufeff"+lines.map(r=>r.map(csvCell).join(",")).join("\r\n"),"text/csv;charset=utf-8");
  });
}

/* ---------- Settings ---------- */
function lpSettings(u){
  const pr=jget(LP_PREF,{}),demo=u.id===DEMO_LENDER.id,saved=LS.pref;LS.pref=false;
  return `<div class="lp-head"><p>${t("lp_set_sub")}</p></div><div class="lp-grid2"><section class="lp-card lp-prof"><h3>${t("lp_prof")}</h3><dl><dt>${t("su_name")}</dt><dd>${esc(u.name)}</dd><dt>${t("su_org")}</dt><dd>${esc(u.org)}</dd><dt>${t("su_orgtype")}</dt><dd>${orgTypeLabel(u.orgType)}</dd><dt>${t("su_jobtitle")}</dt><dd>${esc(u.title)}</dd><dt>${t("su_email")}</dt><dd>${esc(u.email)}</dd><dt></dt><dd><span class="tag${demo?" st-pending":""}">${demo?t("lp_demo_acct"):t("lp_local_acct")}</span></dd></dl></section>
<section class="lp-card"><h3>${t("lp_prefs")}</h3><label for="lp-dens" class="small muted">${t("lp_density")}</label><br><select id="lp-dens" class="lp-select"><option value="comfortable"${sel("comfortable",pr.density||"comfortable")}>${t("lp_dens_comfy")}</option><option value="compact"${sel("compact",pr.density)}>${t("lp_dens_compact")}</option></select>
<p class="small muted" role="status">${saved?t("lp_prefs_saved"):"&nbsp;"}</p><div class="lp-actions"><button class="lp-btn" id="lp-logout2">${t("login_logout")}</button><button class="lp-btn ghost" id="lp-switch">${t("lp_switch_farmer")}</button></div><p class="small muted" style="margin-top:12px">${t("lp_security_note")}</p></section></div>`;
}
function bindSettings(){
  document.getElementById("lp-dens").addEventListener("change",e=>{jset(LP_PREF,{...jget(LP_PREF,{}),density:e.target.value});LS.pref=true;renderLender()});
  document.getElementById("lp-logout2").addEventListener("click",lpLogout);
  document.getElementById("lp-switch").addEventListener("click",lpLogout);
}

/* ---------- shell + router ---------- */
const LP_PAGES={overview:lpOverview,farmers:lpFarmers,assess:lpAssess,apps:lpApps,reports:lpReports,settings:lpSettings};
const LP_BIND={farmers:bindFarmers,assess:bindAssess,apps:bindApps,reports:bindReports,settings:bindSettings};
function renderLender(){
  const u=lenderUser();if(!u){boot();return}
  const r=lpRoute(),pr=jget(LP_PREF,{});
  const nav=LP_NAV.map(([k,key])=>`<a href="#l-${k}" class="${k===r.page?"active":""}"${k===r.page?' aria-current="page"':""}>${t(key)}</a>`).join("");
  const opts=[["en","English"],["zu","isiZulu"],["nso","Sepedi"],["tn","Setswana"]].map(([v,n])=>`<option value="${v}"${sel(v,currentLang)}>${n}</option>`).join("");
  const demo=getDemo()==="lender"?`<span class="demo-pill">${t("demo_mode")}</span>`:"";
  document.getElementById("lender-view").innerHTML=`<div class="lp-shell${pr.density==="compact"?" lp-compact":""}"><aside class="lp-side"><a class="lp-brand" href="#l-overview">${LP_BRAND}<span>AgriScore<small>${t("lp_portal")}</small></span></a><nav class="lp-nav" aria-label="${t("lp_portal")}">${nav}</nav></aside><div class="lp-body"><header class="lp-top"><h1>${t(LP_TITLES[r.page])}</h1><div class="lp-top-r">${demo}<select class="lang-select" id="langSelectLender" aria-label="Choose language">${opts}</select><div class="lp-user">${esc(u.name)}<small>${esc(u.org)}</small></div><button class="btn btn-outline" id="lp-logout">${t("login_logout")}</button></div></header><main class="lp-main" id="lp-main">${LP_PAGES[r.page](u,r)}</main><footer class="lp-foot">${t("lp_footer")}</footer></div></div>`;
  if(LP_BIND[r.page])LP_BIND[r.page](u,r);
  document.getElementById("lp-logout").addEventListener("click",lpLogout);
  document.title="AgriScore | "+t("lp_portal")+" – "+t(LP_TITLES[r.page]);
  const key=r.page+"/"+r.arg;if(key!==lpLastKey){window.scrollTo(0,0);lpLastKey=key}
}
