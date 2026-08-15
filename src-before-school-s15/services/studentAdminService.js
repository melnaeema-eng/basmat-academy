import { supabase } from "./supabase";

export async function getStudentsAdmin(){
  const {data,error}=await supabase.from("profiles").select("*").neq("role","admin");
  if(error)throw error;
  const ids=(data||[]).map(x=>x.id);
  if(!ids.length)return [];
  const [enr,pay,cert]=await Promise.all([
    supabase.from("enrollments").select("id,user_id,course_id,progress,status").in("user_id",ids),
    supabase.from("payments").select("id,user_id,status,amount,created_at").in("user_id",ids),
    supabase.from("certificates").select("id,user_id,course_id,status").in("user_id",ids),
  ]);
  for(const x of [enr,pay,cert])if(x.error)throw x.error;
  return (data||[]).map(p=>({...p,
    enrollments:(enr.data||[]).filter(x=>x.user_id===p.id),
    payments:(pay.data||[]).filter(x=>x.user_id===p.id),
    certificates:(cert.data||[]).filter(x=>x.user_id===p.id),
  }));
}
export async function getStudentAdminDetail(id){
 const {data,error}=await supabase.rpc("admin_student_detail",{p_user_id:id});if(error)throw error;return data;
}
export async function updateStudentAdmin(id,form){
 const {data,error}=await supabase.rpc("admin_update_student",{p_user_id:id,p_full_name:form.full_name||"",p_phone:form.phone||"",p_city:form.city||"",p_bio:form.bio||"",p_admin_note:form.admin_note||""});if(error)throw error;return data;
}
export async function setStudentAdminStatus(id,status){
 const {data,error}=await supabase.rpc("admin_set_student_status",{p_user_id:id,p_status:status});if(error)throw error;return data;
}
export async function checkStudentPermanentDelete(id){
 const {data,error}=await supabase.rpc("admin_student_delete_check",{p_user_id:id});if(error)throw error;return data;
}
