/* "Upload records" page for registered farmers: CSV upload or manual entry of mobile money, cooperative
   repayment and harvest records. Scoring (metrics() in app.js) reads these records automatically. */
const REC_CAP=500, REC_MAX_BYTES=1024*1024, REC_GOAL=20;
const REC_CROPS=["Maize","Beans","Vegetables","Sunflower","Soybeans"], REC_PURPOSES=["Seeds","Irrigation","Fertiliser","Equipment"];
const REC_PRICE={Vegetables:7.5,Beans:18,Soybeans:9.2};
let REC_MSG={kind:"",ok:true,text:"",errors:[]};

/* ----- CSV parsing ----- */
function parseCSV(text){
  text=text.replace(/^\uFEFF/,"");
  const first=text.split(/\r?\n/)[0]||"", d=first.split(";").length>first.split(",").length?";":",";
  const rows=[];let row=[],cur="",q=false;
  for(let i=0;i<text.length;i++){const ch=text[i];
    if(q){if(ch==='"'){if(text[i+1]==='"'){cur+='"';i++}else q=false}else cur+=ch}
    else if(ch==='"')q=true;
    else if(ch===d){row.push(cur);cur=""}
    else if(ch==="\n"||ch==="\r"){if(ch==="\r"&&text[i+1]==="\n")i++;row.push(cur);cur="";rows.push(row);row=[]}
    else cur+=ch}
  row.push(cur);rows.push(row);
  return rows.filter(r=>r.some(x=>x.trim()!==""));
}
const normKey=s=>String(s).toLowerCase().replace(/[\s_\-]/g,"");
function isoDate(s){s=String(s||"").trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;const d=new Date(s+"T12:00:00");if(isNaN(d)||d.toISOString().slice(0,10)!==s)return null;return d<=new Date()?s:null}
function num(s){s=String(s==null?"":s).trim().replace(/\s/g,"");if(/^\d+,\d{1,2}$/.test(s))s=s.replace(",",".");const n=Number(s);return s!==""&&Number.isFinite(n)?n:NaN}
const money2=n=>Math.round(n*100)/100;
const pick=(list,v)=>list.find(x=>x.toLowerCase()===String(v).trim().toLowerCase());
const daysBetween=(a,b)=>Math.round((new Date(b+"T12:00:00")-new Date(a+"T12:00:00"))/864e5);
const recId=(c,k,i)=>`${c.id}-${k.toUpperCase()}-U${Date.now().toString(36)}${i}`;

/* Each builder takes a row object (keys already normalised) and returns {rec} or {err:translationKey} */
const REC_DEF={
  tx:{req:["date","direction","amount"],opt:["category","description"],
    template:"date,direction,category,description,amount\n2026-08-14,Incoming,Produce sales,Maize sales payment,3500\n2026-08-20,Outgoing,Fertiliser,Fertiliser purchase,900\n",
    build(c,r,i){
      const date=isoDate(r.date);if(!date)return{err:"rec_err_date"};
      const dir=/^(in|incoming|credit|income)$/i.test(r.direction||"")?"Incoming":/^(out|outgoing|debit|expense)$/i.test(r.direction||"")?"Outgoing":null;if(!dir)return{err:"rec_err_dir"};
      const amount=num(r.amount);if(!(amount>0))return{err:"rec_err_amount"};
      const cat=pick(categories,r.category||"")||(dir==="Incoming"?"Produce sales":"Supplier payment"), id=recId(c,"tx",i);
      return{rec:{id,clientId:c.id,date,direction:dir,category:cat,description:cleanText(r.description)||cat,amount:money2(amount),status:"Completed",reference:"UP-"+id}}}},
  rp:{req:["cooperative","purpose","scheduleddate","scheduledamount"],opt:["actualdate","paidamount","loanref"],
    template:"cooperative,purpose,scheduledDate,actualDate,scheduledAmount,paidAmount\nMy Co-op,Seeds,2026-06-10,2026-06-10,800,800\nMy Co-op,Fertiliser,2026-07-10,2026-07-14,800,800\nMy Co-op,Equipment,2026-08-10,,800,0\n",
    build(c,r,i){
      const coop=cleanText(r.cooperative),purpose=cleanText(r.purpose);if(!coop||!purpose)return{err:"rec_err_text"};
      const sd=isoDate(r.scheduleddate);if(!sd)return{err:"rec_err_date"};
      let ad="";if(String(r.actualdate||"").trim()!==""){ad=isoDate(r.actualdate);if(!ad)return{err:"rec_err_date"}}
      const sa=num(r.scheduledamount);if(!(sa>0))return{err:"rec_err_amount"};
      let pa=String(r.paidamount||"").trim()===""?(ad?sa:0):num(r.paidamount);if(!(pa>=0))return{err:"rec_err_amount"};
      const unpaid=!ad||pa<sa, late=!unpaid&&ad>sd, id=recId(c,"rp",i);
      return{rec:{id,clientId:c.id,cooperative:coop,loanRef:cleanText(r.loanref)||"LN-"+c.id,purpose:pick(REC_PURPOSES,purpose)||purpose,originalLoan:money2(sa),scheduledDate:sd,actualDate:ad,scheduledAmount:money2(sa),paidAmount:money2(pa),status:unpaid?"Outstanding":late?"Late":"On time",daysLate:late?daysBetween(sd,ad):0,outstanding:money2(Math.max(0,sa-pa))}}}},
  hr:{req:["crop","plantingdate","harvestdate","areaha","quantitykg"],opt:["salesvalue"],
    template:"crop,plantingDate,harvestDate,areaHa,quantityKg,salesValue\nMaize,2026-01-10,2026-06-05,2,6400,40960\nBeans,2026-03-01,2026-07-01,1,900,16200\n",
    build(c,r,i){
      const crop=pick(REC_CROPS,r.crop||"")||cleanText(r.crop);if(!crop)return{err:"rec_err_text"};
      const pd=isoDate(r.plantingdate),hd=isoDate(r.harvestdate);if(!pd||!hd)return{err:"rec_err_date"};if(hd<=pd)return{err:"rec_err_order"};
      const area=num(r.areaha),qty=num(r.quantitykg);if(!(area>0)||!(qty>0))return{err:"rec_err_amount"};
      let sales=String(r.salesvalue||"").trim()===""?qty*(REC_PRICE[crop]||6.4):num(r.salesvalue);if(!(sales>=0))return{err:"rec_err_amount"};
      const y=+hd.slice(0,4),mo=+hd.slice(5,7),season=mo>=10?`${y}/${y+1} summer`:mo<=3?`${y-1}/${y} summer`:`${y} winter`;
      return{rec:{id:recId(c,"hr",i),clientId:c.id,farm:c.business,crop,plantingDate:pd,harvestDate:hd,season,areaHa:money2(area),quantityKg:money2(qty),yieldPerHa:money2(qty/area),salesValue:money2(sales),status:"Recorded",notes:"Self-reported"}}}}
};

/* Validates a whole file. All-or-nothing: if any row is wrong nothing is imported. */
function buildFromRows(c,kind,rows){
  const def=REC_DEF[kind],errors=[],recs=[];
  if(!rows.length)return{errors:[t("rec_no_rows")]};
  const head=rows[0].map(normKey),miss=def.req.filter(k=>!head.includes(k));
  if(miss.length)return{errors:miss.map(k=>tf("rec_header_missing",{col:k}))};
  const body=rows.slice(1);
  if(!body.length)return{errors:[t("rec_no_rows")]};
  if(body.length>REC_CAP)return{errors:[t("rec_too_many")]};
  if(myRecords(c.id,kind).length+body.length>REC_CAP)return{errors:[t("rec_limit")]};
  body.forEach((cells,i)=>{const r={};head.forEach((h,j)=>{r[h]=cells[j]});const out=def.build(c,r,i);
    if(out.err)errors.push(tf("rec_row_err",{row:i+2,msg:t(out.err)}));else recs.push(out.rec)});
  return{errors,recs};
}

/* ----- page ----- */
function recBanner(){return `<section class="panel" style="border-left:5px solid var(--gold)"><div class="page-intro" style="margin:0"><div><p style="color:var(--ink)">${t("rec_banner")}</p></div><a class="btn btn-primary" href="#records">${t("rec_banner_btn")}</a></div></section>`}
function recCard(c,kind,title,cols){
  const mine=myRecords(c.id,kind).slice().reverse(), msg=REC_MSG.kind===kind?REC_MSG:null;
  const heads={tx:[t("th_date"),t("th_description"),t("th_direction"),t("th_amount")],rp:[t("th_cooperative"),t("th_scheduled"),t("th_paid_on"),t("th_status")],hr:[t("rec_crop"),t("th_harvest_date"),t("th_quantity"),t("th_area")]}[kind].concat([""]);
  const row={tx:r=>[fmtDate(r.date),esc(r.description),tdir(r.direction),amt(r)],rp:r=>[esc(r.cooperative),fmtDate(r.scheduledDate),fmtDate(r.actualDate),badge(r.status)],hr:r=>[tcrop(r.crop),fmtDate(r.harvestDate),Math.round(r.quantityKg).toLocaleString(),r.areaHa]}[kind];
  const rows=mine.map(r=>`<tr>${row(r).map(x=>`<td>${x}</td>`).join("")}<td><button class="btn btn-outline" type="button" data-del="${kind}|${r.id}">${t("rec_delete")}</button></td></tr>`).join("");
  const opt=(arr,lab)=>arr.map(v=>`<option value="${v}">${lab(v)}</option>`).join("");
  const f={
    tx:`<div class="two-col"><div class="form-group"><label>${t("th_date")}<input class="field" style="width:100%" type="date" name="date" required></label></div><div class="form-group"><label>${t("th_direction")}<select class="field" style="width:100%" name="direction"><option value="Incoming">${t("dir_incoming")}</option><option value="Outgoing">${t("dir_outgoing")}</option></select></label></div><div class="form-group"><label>${t("rec_category")}<select class="field" style="width:100%" name="category">${opt(categories,tcat)}</select></label></div><div class="form-group"><label>${t("th_amount")} (R)<input class="field" style="width:100%" type="number" name="amount" min="0.01" step="0.01" required></label></div></div><div class="form-group"><label>${t("th_description")}<input class="field" style="width:100%" type="text" name="description" maxlength="80"></label></div>`,
    rp:`<div class="two-col"><div class="form-group"><label>${t("th_cooperative")}<input class="field" style="width:100%" type="text" name="cooperative" maxlength="60" required></label></div><div class="form-group"><label>${t("loan_purpose")}<select class="field" style="width:100%" name="purpose">${opt(REC_PURPOSES,tpurpose)}</select></label></div><div class="form-group"><label>${t("th_scheduled")}<input class="field" style="width:100%" type="date" name="scheduleddate" required></label></div><div class="form-group"><label>${t("th_paid_on")}<input class="field" style="width:100%" type="date" name="actualdate"></label></div><div class="form-group"><label>${t("rec_sched_amt")}<input class="field" style="width:100%" type="number" name="scheduledamount" min="0.01" step="0.01" required></label></div><div class="form-group"><label>${t("rec_paid_amt")}<input class="field" style="width:100%" type="number" name="paidamount" min="0" step="0.01"></label></div></div><p class="small muted">${t("rec_unpaid_note")}</p>`,
    hr:`<div class="two-col"><div class="form-group"><label>${t("rec_crop")}<select class="field" style="width:100%" name="crop">${opt(REC_CROPS,tcrop)}</select></label></div><div class="form-group"><label>${t("th_area")}<input class="field" style="width:100%" type="number" name="areaha" min="0.01" step="0.01" required></label></div><div class="form-group"><label>${t("rec_planted")}<input class="field" style="width:100%" type="date" name="plantingdate" required></label></div><div class="form-group"><label>${t("th_harvest_date")}<input class="field" style="width:100%" type="date" name="harvestdate" required></label></div><div class="form-group"><label>${t("th_quantity")}<input class="field" style="width:100%" type="number" name="quantitykg" min="0.01" step="0.01" required></label></div><div class="form-group"><label>${t("rec_sales")}<input class="field" style="width:100%" type="number" name="salesvalue" min="0" step="0.01"></label></div></div>`
  }[kind];
  const m=msg?`<div class="${msg.ok?"small":"error"}" role="${msg.ok?"status":"alert"}" style="${msg.ok?"color:var(--green);font-weight:700":""};margin:10px 0">${esc(msg.text)}${msg.errors.length?`<ul style="margin:6px 0 0;padding-left:18px">${msg.errors.slice(0,10).map(e=>`<li>${esc(e)}</li>`).join("")}</ul>`:""}</div>`:"";
  return `<section class="panel" id="rec-${kind}"><h2>${title}</h2><p class="small muted" style="margin-bottom:6px">${t("rec_cols")} <code>${cols}</code></p>
<div class="rec-upload" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:10px 0"><button class="btn btn-outline" type="button" data-template="${kind}">${t("rec_template")}</button><input type="file" accept=".csv,text/csv" id="file-${kind}" aria-label="${t("rec_choose")}"><button class="btn btn-primary" type="button" data-import="${kind}">${t("rec_import")}</button></div>${m}
<details><summary style="cursor:pointer;font-weight:700;margin:8px 0">${t("rec_manual")}</summary><form data-manual="${kind}" novalidate>${f}<button class="btn btn-light" type="submit">${t("rec_add")}</button></form></details>
<h3 style="margin-top:16px">${tf("rec_yours",{n:mine.length})}</h3>${mine.length?`<div class="rec-list">${table(heads,rows)}</div>`:`<p class="small muted">${t("rec_none")}</p>`}</section>`;
}
function recordsPage(c,m){
  const band=m.score>=700?null:m.score>=450?[t("category_strong"),700]:[t("category_limited"),450];
  const prog=(label,n)=>`<div class="factor-row"><div class="factor-row-head"><span>${label}</span><span>${tf("rec_progress",{n,goal:REC_GOAL})}</span></div><div class="progress"><span style="width:${Math.min(100,n/REC_GOAL*100)}%"></span></div></div>`;
  return `${intro(t("nav_records"),t("rec_title"),t("rec_sub"))}
<section class="panel"><h2>${t("rec_status_head")}</h2><div class="two-col"><div><div class="metric-value" style="font-size:36px">${m.score} <span class="muted" style="font-size:16px">/ ${MAX_SCORE}</span></div><div class="status"><span class="status-dot"></span>${eligibility(m)}</div><p class="small muted">${band?tf("rec_to_next",{pts:band[1]-m.score,band:band[0]}):t("rec_top")}</p><p><a class="btn btn-light" href="#loans">${t("rec_loan_link")}</a> <a class="btn btn-outline" href="#credit-score">${t("nav_credit_score")}</a></p></div><div>${prog(t("nav_transactions"),m.tx.length)}${prog(t("nav_repayments"),m.rp.length)}${prog(t("nav_harvest"),m.hr.length)}</div></div><p class="small muted" style="margin:6px 0 0">${t("rec_disclaimer")}</p></section>
${recCard(c,"tx",t("nav_transactions"),"date, direction, category, description, amount")}${recCard(c,"rp",t("nav_repayments"),"cooperative, purpose, scheduledDate, actualDate, scheduledAmount, paidAmount")}${recCard(c,"hr",t("nav_harvest"),"crop, plantingDate, harvestDate, areaHa, quantityKg, salesValue")}
<section class="panel"><button class="btn btn-outline" type="button" id="rec-clear">${t("rec_clear")}</button></section>`;
}
function initRecords(c){
  if(!document.getElementById("rec-tx"))return;
  const done=(kind,ok,text,errors=[])=>{REC_MSG={kind,ok,text,errors};renderPage()};
  const save=(kind,recs)=>addRecords(c.id,kind,recs)?true:false;
  document.querySelectorAll("[data-template]").forEach(b=>b.addEventListener("click",()=>download(`agriscore-${b.dataset.template}-template.csv`,REC_DEF[b.dataset.template].template,"text/csv")));
  document.querySelectorAll("[data-import]").forEach(b=>b.addEventListener("click",async()=>{
    const kind=b.dataset.import,f=document.getElementById("file-"+kind).files[0];
    if(!f)return done(kind,false,t("rec_empty_file"));
    if(!/\.csv$/i.test(f.name))return done(kind,false,t("rec_file_type"));
    if(f.size>REC_MAX_BYTES)return done(kind,false,t("rec_file_big"));
    const out=buildFromRows(c,kind,parseCSV(await f.text()));
    if(out.errors.length)return done(kind,false,t("rec_nothing"),out.errors);
    save(kind,out.recs)?done(kind,true,tf("rec_imported",{n:out.recs.length})):done(kind,false,t("su_err_save"));
  }));
  document.querySelectorAll("[data-manual]").forEach(f=>f.addEventListener("submit",e=>{
    e.preventDefault();const kind=f.dataset.manual,r={};
    new FormData(f).forEach((v,k)=>{r[k]=v});
    if(myRecords(c.id,kind).length>=REC_CAP)return done(kind,false,t("rec_limit"));
    const out=REC_DEF[kind].build(c,r,0);
    if(out.err)return done(kind,false,t(out.err));
    save(kind,[out.rec])?done(kind,true,t("rec_added")):done(kind,false,t("su_err_save"));
  }));
  document.querySelectorAll("[data-del]").forEach(b=>b.addEventListener("click",()=>{
    if(!confirm(t("rec_confirm_del")))return;const [k,id]=b.dataset.del.split("|");deleteRecord(c.id,k,id);REC_MSG={kind:"",ok:true,text:"",errors:[]};renderPage();
  }));
  document.getElementById("rec-clear").addEventListener("click",()=>{
    if(!confirm(t("rec_confirm_clear")))return;clearRecords(c.id);REC_MSG={kind:"tx",ok:true,text:t("rec_cleared"),errors:[]};renderPage();
  });
}
