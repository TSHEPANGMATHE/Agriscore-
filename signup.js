/* Single-page signup: role, account, details, privacy information and consent on one form.
   Uses registerUser()/startSession() from store.js and t()/boot() from app.js. */
(function(){
  const $=id=>document.getElementById(id);
  const form=$("signup-form");
  if(!form)return;
  let lastErrors={}, lastSummaryKey=null;

  const role=()=>form.querySelector('input[name="role"]:checked').value;

  /* show the fields that belong to the selected role */
  window.syncRole=function(){
    const r=role();
    $("su-farmer").classList.toggle("hidden",r!=="farmer");
    $("su-lender").classList.toggle("hidden",r!=="lender");
    $("c-share-wrap").classList.toggle("hidden",r!=="farmer");
    $("c-lender-wrap").classList.toggle("hidden",r!=="lender");
    $("su-role-farmer").classList.toggle("on",r==="farmer");
    $("su-role-lender").classList.toggle("on",r==="lender");
    lastSummaryKey=null;showErrors({});
  };

  function collect(){
    return {
      role:role(), name:cleanText($("su-name").value), email:$("su-email").value.trim(),
      password:$("su-pw").value, pw2:$("su-pw2").value,
      business:cleanText($("su-biz").value), location:cleanText($("su-loc").value), farmType:$("su-ftype").value,
      area:parseFloat($("su-area").value),
      crops:[...form.querySelectorAll('input[name="crop"]:checked')].map(i=>i.value),
      org:cleanText($("su-org").value), orgType:$("su-orgtype").value, title:cleanText($("su-title").value),
      privacy:$("c-privacy").checked, share:$("c-share").checked, lenderAck:$("c-lender").checked
    };
  }

  /* returns {fieldId: translationKey} */
  function validate(v){
    const e={};
    if(v.name.length<2)e["su-name"]="su_err_name";
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email))e["su-email"]="su_err_email";
    else if(emailTaken(v.email))e["su-email"]="su_err_email_taken";
    if(v.password.length<8||!/[A-Za-z]/.test(v.password)||!/\d/.test(v.password))e["su-pw"]="su_err_pw";
    if(v.pw2!==v.password)e["su-pw2"]="su_err_pw_match";
    if(v.role==="farmer"){
      if(!v.business)e["su-biz"]="su_err_biz";
      if(!v.location)e["su-loc"]="su_err_loc";
      if(!v.farmType)e["su-ftype"]="su_err_ftype";
      if(!Number.isFinite(v.area)||v.area<=0||v.area>100000)e["su-area"]="su_err_area";
      if(!v.crops.length)e["su-crops"]="su_err_crops";
    }else{
      if(!v.org)e["su-org"]="su_err_org";
      if(!v.orgType)e["su-orgtype"]="su_err_orgtype";
      if(!v.title)e["su-title"]="su_err_title";
    }
    if(!v.privacy)e["c-privacy"]="su_err_privacy";
    if(v.role==="lender"&&!v.lenderAck)e["c-lender"]="su_err_lender";
    return e;
  }

  function showErrors(e){
    lastErrors=e;
    form.querySelectorAll(".su-err").forEach(d=>{d.textContent=""});
    form.querySelectorAll("[aria-invalid]").forEach(i=>i.removeAttribute("aria-invalid"));
    const ids=Object.keys(e);
    ids.forEach(id=>{const box=$("err-"+id),inp=$(id);if(box)box.textContent=t(e[id]);if(inp)inp.setAttribute("aria-invalid","true")});
    const sum=$("su-summary");
    if(ids.length){sum.textContent=t("su_err_summary");sum.classList.remove("hidden")}
    else if(lastSummaryKey){sum.textContent=t(lastSummaryKey);sum.classList.remove("hidden")}
    else sum.classList.add("hidden");
  }
  function focusFirst(e){
    const id=Object.keys(e)[0];
    const el=id==="su-crops"?form.querySelector('input[name="crop"]'):$(id);
    if(el)el.focus();
  }

  window.refreshSignupText=function(){
    showErrors(lastErrors);
    if(!$("signup-view").classList.contains("hidden"))document.title="AgriScore | "+t("su_title");
  };

  form.addEventListener("change",ev=>{if(ev.target.name==="role")syncRole()});
  /* clear a field's error as soon as the user edits it */
  function clearOne(ev){
    const id=ev.target.name==="crop"?"su-crops":ev.target.id;
    if(!lastErrors[id])return;
    delete lastErrors[id];
    const box=$("err-"+id);if(box)box.textContent="";
    const inp=$(id);if(inp)inp.removeAttribute("aria-invalid");
    if(!Object.keys(lastErrors).length&&!lastSummaryKey)$("su-summary").classList.add("hidden");
  }
  form.addEventListener("input",clearOne);
  form.addEventListener("change",clearOne);

  form.addEventListener("submit",async ev=>{
    ev.preventDefault();
    lastSummaryKey=null;
    const v=collect(), e=validate(v);
    if(Object.keys(e).length){showErrors(e);focusFirst(e);return}
    showErrors({});
    const btn=$("su-submit");btn.disabled=true;
    let res;
    try{res=await registerUser(v)}catch(err){res={ok:false,error:"su_err_save"}}
    btn.disabled=false;
    if(!res.ok){
      if(res.error==="su_err_email_taken"){showErrors({"su-email":res.error});focusFirst({"su-email":1})}
      else{lastSummaryKey=res.error;showErrors({})}
      return;
    }
    const u=res.user;
    if(u.role==="farmer")setConsent(u.id,v.share);   /* sharing consent: exactly what the user ticked (default: not ticked) */
    startSession(u.role,u.id);
    try{localStorage.removeItem("agriscoreDemo")}catch(_){}
    form.reset();syncRole();
    location.hash=u.role==="lender"?"l-overview":"records";
    boot();
  });
})();
