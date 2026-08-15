import {supabase} from "./supabase";

export function isSchoolHost(){
  const host=window.location.hostname.toLowerCase();
  return host==="school.basmat-alnawabig.com.sa"
    || host.startsWith("school.")
    || window.location.pathname.startsWith("/school/");
}

export async function resolveSchoolDestination(userId){
  const {data:profile,error:profileError}=await supabase
    .from("profiles").select("role,school_role").eq("id",userId).maybeSingle();
  if(profileError)throw profileError;

  if(profile?.school_role?.trim().toLowerCase()==="school_admin"){
    return "/school/admin";
  }

  const [teacher,parent,student]=await Promise.all([
    supabase.from("school_teachers").select("id").eq("auth_user_id",userId).eq("status","active").maybeSingle(),
    supabase.from("school_parents").select("id").eq("auth_user_id",userId).eq("is_active",true).maybeSingle(),
    supabase.from("school_students").select("id").eq("auth_user_id",userId).eq("status","active").maybeSingle()
  ]);

  if(teacher.error)throw teacher.error;
  if(parent.error)throw parent.error;
  if(student.error)throw student.error;

  // Priority if one account has multiple school identities.
  if(teacher.data)return "/school/teacher";
  if(parent.data)return "/school/parent";
  if(student.data)return "/school/student";

  // Academy admin remains allowed to administer school only when explicitly
  // marked by school_role. No accidental Academy -> School redirect here.
  throw new Error("هذا الحساب غير مرتبط بأي مستخدم في مدرسة نوابغ الجزيرة.");
}

export async function resolveAcademyDestination(userId,requestedPath){
  const {data:profile,error}=await supabase
    .from("profiles").select("role").eq("id",userId).maybeSingle();
  if(error)throw error;
  const role=profile?.role?.trim().toLowerCase();
  if(role==="admin")return "/admin/dashboard";
  if(requestedPath && !requestedPath.startsWith("/school"))return requestedPath;
  return "/";
}

export async function resolveLoginDestination(userId,requestedPath){
  if(isSchoolHost())return resolveSchoolDestination(userId);
  return resolveAcademyDestination(userId,requestedPath);
}
