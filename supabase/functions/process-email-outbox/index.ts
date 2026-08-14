import {createClient} from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const auth=req.headers.get("Authorization")||"";
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const{data:{user}}=await userClient.auth.getUser();if(!user)throw new Error("Unauthorized");
  const{data:isAdmin}=await userClient.rpc("is_admin");if(!isAdmin)throw new Error("Admin required");
  const resend=Deno.env.get("RESEND_API_KEY"),from=Deno.env.get("ACADEMY_FROM_EMAIL");if(!resend||!from)throw new Error("RESEND_API_KEY / ACADEMY_FROM_EMAIL missing");
  const admin=createClient(url,service);
  const{data:rows,error}=await admin.from("email_outbox").select("*").eq("status","pending").order("created_at").limit(25);if(error)throw error;
  let sent=0,failed=0;
  for(const x of rows||[]){
   const html=`<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><h2>Basmat Alnawabigh Academy</h2><p>${x.subject}</p><p>Reference: ${x.payload?.payment_id||x.payload?.refund_id||""}</p></div>`;
   const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":`Bearer ${resend}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:[x.recipient],subject:x.subject,html})});
   if(r.ok){sent++;await admin.from("email_outbox").update({status:"sent",sent_at:new Date().toISOString(),attempts:x.attempts+1,last_error:null}).eq("id",x.id)}
   else{failed++;await admin.from("email_outbox").update({status:"failed",attempts:x.attempts+1,last_error:(await r.text()).slice(0,1000)}).eq("id",x.id)}
  }
  return new Response(JSON.stringify({success:true,sent,failed}),{headers:{...cors,"Content-Type":"application/json"}});
 }catch(e){return new Response(JSON.stringify({success:false,error:e.message}),{status:400,headers:{...cors,"Content-Type":"application/json"}})}
});
