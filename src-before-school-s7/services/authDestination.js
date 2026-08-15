import {supabase} from "./supabase";

export function isSchoolHost(){
  const host=window.location.hostname.toLowerCase();
  return host==="school.basmat-alnawabig.com.sa"
    || host.startsWith("school.")
    || window.location.pathname.startsWith("/school/");
}

export async function getSchoolRoles(userId){
  const {data:profile,error:profileError}=await supabase
    .from("profiles").select("role,school_role").eq("id",userId).maybeSingle();
  if(profileError)throw profileError;

  const [teacher,parent,student]=await Promise.all([
    supabase.from("school_teachers").select("id").eq("auth_user_id",userId).eq("status","active").maybeSingle(),
    supabase.from("school_parents").select("id").eq("auth_user_id",userId).eq("is_active",true).maybeSingle(),
    supabase.from("school_students").select("id").eq("auth_user_id",userId).eq("status","active").maybeSingle()
  ]);
  if(teacher.error)throw teacher.error;
  if(parent.error)throw parent.error;
  if(student.error)throw student.error;

  const roles=[];
  if(profile?.school_role?.trim().toLowerCase()==="school_admin")
    roles.push({key:"admin",label:"إدارة المدرسة",path:"/school/admin"});
  if(teacher.data) roles.push({key:"teacher",label:"المعلم",path:"/school/teacher"});
  if(parent.data) roles.push({key:"parent",label:"ولي الأمر",path:"/school/parent"});
  if(student.data) roles.push({key:"student",label:"الطالب",path:"/school/student"});
  return roles;
}

export async function resolveSchoolDestination(userId){
  const roles=await getSchoolRoles(userId);
  if(!roles.length) throw new Error("هذا الحساب غير مرتبط بأي مستخدم في مدرسة نوابغ الجزيرة.");
  if(roles.length===1) return roles[0].path;
  return "/school/choose-role";
}

export async function resolveAcademyDestination(userId,requestedPath){
  const {data:profile,error}=await supabase.from("profiles").select("role").eq("id",userId).maybeSingle();
  if(error)throw error;
  if(profile?.role?.trim().toLowerCase()==="admin")return "/admin/dashboard";
  if(requestedPath && !requestedPath.startsWith("/school"))return requestedPath;
  return "/";
}

export async function resolveLoginDestination(userId,requestedPath){
  if(isSchoolHost())return resolveSchoolDestination(userId);
  return resolveAcademyDestination(userId,requestedPath);
}
