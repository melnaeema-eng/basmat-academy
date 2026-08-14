import { supabase } from "./supabase";

export async function getInstructorDashboard(){
  const {data,error}=await supabase.rpc("instructor_dashboard_data");
  if(error)throw error; return data;
}
export async function getCourseQuestions(courseId){
  const {data,error}=await supabase.from("course_questions")
    .select("*, course_answers(*)").eq("course_id",courseId)
    .order("created_at",{ascending:false});
  if(error)throw error;
  const userIds=[...new Set((data||[]).flatMap(q=>[q.user_id,...(q.course_answers||[]).map(a=>a.user_id)]))];
  let map={};
  if(userIds.length){
    const {data:p,error:pe}=await supabase.from("profiles").select("id,full_name,email").in("id",userIds);
    if(pe)throw pe; map=Object.fromEntries((p||[]).map(x=>[x.id,x]));
  }
  return (data||[]).map(q=>({...q,profile:map[q.user_id]||null,course_answers:(q.course_answers||[]).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)).map(a=>({...a,profile:map[a.user_id]||null}))}));
}
export async function addCourseQuestion(courseId,title,body){
  const {data:{session}}=await supabase.auth.getSession();if(!session?.user)throw new Error("Login required");
  const {data,error}=await supabase.from("course_questions").insert({course_id:courseId,user_id:session.user.id,title:title.trim(),body:body.trim()}).select().single();
  if(error)throw error;return data;
}
export async function addCourseAnswer(questionId,body){
  const {data,error}=await supabase.rpc("add_course_answer",{p_question_id:questionId,p_body:body.trim()});
  if(error)throw error;return data;
}
export async function closeCourseQuestion(id){
  const {data,error}=await supabase.from("course_questions").update({status:"closed",updated_at:new Date().toISOString()}).eq("id",id).select().single();
  if(error)throw error;return data;
}
export async function getLessonNotes(lessonId){
  const {data,error}=await supabase.from("lesson_notes").select("*").eq("lesson_id",lessonId).order("created_at",{ascending:false});
  if(error)throw error;return data||[];
}
export async function addLessonNote({courseId,lessonId,noteText,timestampSeconds}){
  const {data:{session}}=await supabase.auth.getSession();if(!session?.user)throw new Error("Login required");
  const {data,error}=await supabase.from("lesson_notes").insert({user_id:session.user.id,course_id:courseId,lesson_id:lessonId,note_text:noteText.trim(),timestamp_seconds:timestampSeconds??null}).select().single();
  if(error)throw error;return data;
}
export async function deleteLessonNote(id){
  const {error}=await supabase.from("lesson_notes").delete().eq("id",id);if(error)throw error;
}
export async function getLessonBookmarks(lessonId){
  const {data,error}=await supabase.from("lesson_bookmarks").select("*").eq("lesson_id",lessonId).order("created_at",{ascending:false});
  if(error)throw error;return data||[];
}
export async function addLessonBookmark({courseId,lessonId,timestampSeconds}){
  const {data:{session}}=await supabase.auth.getSession();if(!session?.user)throw new Error("Login required");
  const {data,error}=await supabase.from("lesson_bookmarks").insert({user_id:session.user.id,course_id:courseId,lesson_id:lessonId,timestamp_seconds:timestampSeconds??null}).select().single();
  if(error&&error.code!=="23505")throw error;return data;
}
export async function deleteLessonBookmark(id){
  const {error}=await supabase.from("lesson_bookmarks").delete().eq("id",id);if(error)throw error;
}
export async function validateCoupon(code,courseId){
  const {data,error}=await supabase.rpc("validate_coupon",{p_code:code,p_course_id:courseId});if(error)throw error;return data;
}
export async function adminGetCoupons(){
  const {data,error}=await supabase.from("coupons").select("*,coupon_courses(course_id,courses(id,title))").order("created_at",{ascending:false});if(error)throw error;return data||[];
}
export async function adminSaveCoupon(payload,courseIds=[]){
  const row={code:payload.code.trim().toUpperCase(),description:payload.description||null,discount_type:payload.discount_type,discount_value:Number(payload.discount_value),starts_at:payload.starts_at||null,ends_at:payload.ends_at||null,max_uses:payload.max_uses?Number(payload.max_uses):null,is_active:payload.is_active!==false};
  let coupon;
  if(payload.id){
    const {data,error}=await supabase.from("coupons").update(row).eq("id",payload.id).select().single();if(error)throw error;coupon=data;
    const {error:de}=await supabase.from("coupon_courses").delete().eq("coupon_id",coupon.id);if(de)throw de;
  } else {
    const {data,error}=await supabase.from("coupons").insert(row).select().single();if(error)throw error;coupon=data;
  }
  if(courseIds.length){
    const {error}=await supabase.from("coupon_courses").insert(courseIds.map(course_id=>({coupon_id:coupon.id,course_id})));if(error)throw error;
  }
  return coupon;
}
export async function adminDeleteCoupon(id){
  const {error}=await supabase.from("coupons").delete().eq("id",id);if(error)throw error;
}
export async function getAdvancedAnalytics(){
  const {data,error}=await supabase.rpc("admin_advanced_analytics");if(error)throw error;return data;
}
export async function getExamSettings(examId){
  const {data,error}=await supabase.rpc("get_exam_settings",{p_exam_id:examId});if(error)throw error;return data||{};
}
export async function getAttemptReview(examId){
  const {data,error}=await supabase.rpc("get_attempt_review",{p_exam_id:examId});if(error)throw error;return data;
}
