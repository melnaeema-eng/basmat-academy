import {createClient} from "https://esm.sh/@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"
};

function escapeHtml(value=""){
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function emailHtml(x:any){
  if(x.template==="announcement"){
    const title=escapeHtml(x.payload?.title||x.subject||"Academy Announcement");
    const body=escapeHtml(x.payload?.body||"").replaceAll("\n","<br/>");
    const course=escapeHtml(x.payload?.course_title||"");
    return `
      <div style="font-family:Arial,Tahoma,sans-serif;background:#f5f7fb;padding:28px">
        <div style="max-width:680px;margin:auto;background:white;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb">
          <div style="background:#08284d;color:white;padding:22px 26px">
            <div style="font-size:13px;color:#fdba74;font-weight:700">Basmat Alnawabigh Academy</div>
            <h2 style="margin:8px 0 0;font-size:24px">${title}</h2>
          </div>
          <div style="padding:26px;color:#334155;line-height:1.9;font-size:15px">
            ${course?`<div style="margin-bottom:14px;font-weight:700;color:#f97316">${course}</div>`:""}
            <div>${body}</div>
            <div style="margin-top:26px;padding-top:18px;border-top:1px solid #e5e7eb;color:#64748b;font-size:12px">
              academy.basmat-alnawabig.com.sa
            </div>
          </div>
        </div>
      </div>`;
  }

  return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto">
    <h2>Basmat Alnawabigh Academy</h2>
    <p>${escapeHtml(x.subject||"")}</p>
    <p>Reference: ${escapeHtml(x.payload?.payment_id||x.payload?.refund_id||"")}</p>
  </div>`;
}

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const auth=req.headers.get("Authorization")||"";
  const url=Deno.env.get("SUPABASE_URL")!;
  const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const{data:{user}}=await userClient.auth.getUser();
  if(!user)throw new Error("Unauthorized");

  const{data:isAdmin}=await userClient.rpc("is_admin");
  if(!isAdmin)throw new Error("Admin required");

  const resend=Deno.env.get("RESEND_API_KEY");
  const from=Deno.env.get("ACADEMY_FROM_EMAIL");
  if(!resend||!from)throw new Error("RESEND_API_KEY / ACADEMY_FROM_EMAIL missing");

  const admin=createClient(url,service);
  const{data:rows,error}=await admin
    .from("email_outbox")
    .select("*")
    .eq("status","pending")
    .order("created_at")
    .limit(25);
  if(error)throw error;

  let sent=0,failed=0;
  for(const x of rows||[]){
   const r=await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{"Authorization":`Bearer ${resend}`,"Content-Type":"application/json"},
    body:JSON.stringify({
      from,
      to:[x.recipient],
      subject:x.subject,
      html:emailHtml(x)
    })
   });

   if(r.ok){
    sent++;
    await admin.from("email_outbox").update({
      status:"sent",
      sent_at:new Date().toISOString(),
      attempts:x.attempts+1,
      last_error:null
    }).eq("id",x.id);
   }else{
    failed++;
    await admin.from("email_outbox").update({
      status:"failed",
      attempts:x.attempts+1,
      last_error:(await r.text()).slice(0,1000)
    }).eq("id",x.id);
   }
  }

  return new Response(JSON.stringify({
    success:true,
    sent,
    failed,
    remaining:Math.max(0,(rows||[]).length-25)
  }),{headers:{...cors,"Content-Type":"application/json"}});
 }catch(e){
  return new Response(JSON.stringify({success:false,error:e.message}),{
    status:400,
    headers:{...cors,"Content-Type":"application/json"}
  });
 }
});
