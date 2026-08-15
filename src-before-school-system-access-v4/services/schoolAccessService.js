import {supabase} from "./supabase";

export async function getMySchoolRoles(){
 const {data,error}=await supabase.rpc("school_my_roles");
 if(error)throw error;return data||[];
}
export async function canAccessSchoolArea(area){
 const {data,error}=await supabase.rpc("school_can_access_area",{p_area:area});
 if(error)throw error;return !!data;
}
export function localSchoolRoleHome(role){
 return {
  school_admin:"/school/admin",
  finance:"/school/admin/finance",
  hr:"/school/admin/hr-center",
  admissions:"/school/admin/admissions",
  student_affairs:"/school/admin/student-affairs",
  teacher:"/school/teacher",
  parent:"/school/parent",
  student:"/school/student",
  employee:"/school/employee"
 }[role]||"/school/login";
}
export async function getSchoolAccessUsers(){
 const {data,error}=await supabase.rpc("school_access_users");
 if(error)throw error;return data||[];
}
export async function setSchoolStaffRoles(authUserId,roles){
 const {data,error}=await supabase.rpc("school_set_staff_roles",{
  p_auth_user_id:authUserId,p_roles:roles
 });
 if(error)throw error;return data||[];
}
export async function getSchoolAccessUIHealth(){
 const {data,error}=await supabase.rpc("school_access_ui_health");
 if(error)throw error;return data||{};
}
export async function resolveSchoolDestination(){
 const roles=await getMySchoolRoles();
 if(!roles.length)return {roles,destination:null};
 if(roles.length===1)return {roles,destination:localSchoolRoleHome(roles[0])};
 return {roles,destination:"/school/choose-role"};
}
