/* Sign in (demo only: credentials live in this browser, this is not real security) */
function enterPortal(role,id,demo){
  startSession(role,id);
  try{demo?localStorage.setItem("agriscoreDemo",role):localStorage.removeItem("agriscoreDemo")}catch(e){}
  location.hash=role==="lender"?"l-overview":"dashboard";
  boot();
}

document.getElementById("login-form").addEventListener("submit",async function(e){
  e.preventDefault();
  const email=document.getElementById("email").value.trim().toLowerCase();
  const password=document.getElementById("password").value;
  const error=document.getElementById("login-error");
  let target=null;
  const demoFarmer=clients.find(c=>!c.registered&&c.email.toLowerCase()===email&&c.password===password);
  if(demoFarmer)target={role:"farmer",id:demoFarmer.id,demo:true};
  else if(email===DEMO_LENDER.email&&password===DEMO_LENDER_PASSWORD)target={role:"lender",id:DEMO_LENDER.id,demo:true};
  else{
    const u=loadUsers().find(x=>x.email.toLowerCase()===email);
    if(u&&await hashPassword(password,u.salt)===u.pwHash)target={role:u.role,id:u.id,demo:false};
  }
  if(!target){error.textContent=t("login_err_invalid");return}
  error.textContent="";
  enterPortal(target.role,target.id,target.demo);
});

document.querySelectorAll("[data-fill]").forEach(b=>b.addEventListener("click",()=>{
  document.getElementById("email").value=b.dataset.fill;
  document.getElementById("password").value=b.dataset.pw||"farmer123";
}));

/* one-click demo access */
document.getElementById("demo-farmer").addEventListener("click",()=>enterPortal("farmer",clients.find(c=>!c.registered).id,true));
document.getElementById("demo-lender").addEventListener("click",()=>enterPortal("lender",DEMO_LENDER.id,true));
