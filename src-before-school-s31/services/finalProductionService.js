import { supabase } from "./supabase";

export async function globalSearch(query){
  const {data,error}=await supabase.rpc("academy_global_search",{p_query:query});
  if(error)throw error; return data||{courses:[],paths:[],instructors:[]};
}
export async function getWatchState(lessonId){
  const {data,error}=await supabase.from("lesson_watch_state").select("*").eq("lesson_id",lessonId).maybeSingle();
  if(error)throw error;return data;
}
export async function saveWatchState({courseId,lessonId,positionSeconds,durationSeconds}){
  const {data:{session}}=await supabase.auth.getSession();if(!session?.user)return;
  const {error}=await supabase.from("lesson_watch_state").upsert({
    user_id:session.user.id,course_id:courseId,lesson_id:lessonId,
    position_seconds:Math.max(0,Math.floor(positionSeconds||0)),
    duration_seconds:durationSeconds?Math.floor(durationSeconds):null,
    updated_at:new Date().toISOString()
  },{onConflict:"user_id,lesson_id"});
  if(error)throw error;
}
export async function getCourseAnnouncements(courseId){
  const {data,error}=await supabase.from("course_announcements").select("*").eq("course_id",courseId).eq("is_published",true).order("published_at",{ascending:false});
  if(error)throw error;return data||[];
}
export async function adminGetAnnouncements(){
  const {data,error}=await supabase.from("course_announcements").select("*,courses(id,title)").order("published_at",{ascending:false});
  if(error)throw error;return data||[];
}
export async function saveAnnouncement(payload){
  const {data:{session}}=await supabase.auth.getSession();if(!session?.user)throw new Error("Login required");
  const scope=payload.audience_scope||"course";
  const row={
    course_id:scope==="course"?(payload.course_id||null):null,
    author_id:session.user.id,
    title:payload.title.trim(),
    body:payload.body.trim(),
    is_published:payload.is_published!==false,
    audience_scope:scope,
    send_email:!!payload.send_email,
    published_at:new Date().toISOString(),
    updated_at:new Date().toISOString()
  };
  let saved;
  if(payload.id){
    const {data,error}=await supabase.from("course_announcements").update(row).eq("id",payload.id).select().single();
    if(error)throw error;saved=data;
  }else{
    const {data,error}=await supabase.from("course_announcements").insert(row).select().single();
    if(error)throw error;saved=data;
  }
  let broadcast={queued:0};
  if(saved.is_published&&saved.send_email){
    const {data,error}=await supabase.rpc("queue_announcement_broadcast",{p_announcement_id:saved.id});
    if(error)throw error;
    broadcast=data||{queued:0};
  }
  return {...saved,broadcast};
}
export async function sendPendingAnnouncementEmails(){
  const {data,error}=await supabase.functions.invoke("process-email-outbox");
  if(error)throw error;
  return data;
}
export async function getGlobalAnnouncements(){
  const {data,error}=await supabase.rpc("get_global_announcements");
  if(error)throw error;return data||[];
}
export async function deleteAnnouncement(id){
  const {error}=await supabase.from("course_announcements").delete().eq("id",id);if(error)throw error;
}
export async function getSystemHealth(){
  const {data,error}=await supabase.rpc("admin_system_health");if(error)throw error;return data;
}
