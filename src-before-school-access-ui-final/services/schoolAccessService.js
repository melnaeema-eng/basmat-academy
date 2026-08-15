import { supabase } from "../lib/supabase";

export async function getMySchoolRoles(){
  const {data,error}=await supabase.rpc("school_my_roles");
  if(error) throw error;
  return data||[];
}
export async function canAccessSchoolArea(area){
  const {data,error}=await supabase.rpc("school_can_access_area",{p_area:area});
  if(error) throw error;
  return !!data;
}
export async function getSchoolRoleHome(role){
  const {data,error}=await supabase.rpc("school_role_home",{p_role:role});
  if(error) throw error;
  return data||"/school/login";
}
export async function getSchoolAccessHealth(){
  const {data,error}=await supabase.rpc("school_access_health");
  if(error) throw error;
  return data||{};
}
export async function getSchoolStaffRoles(){
  const {data,error}=await supabase.from("school_staff_roles")
    .select("id,auth_user_id,role,is_active,granted_at")
    .order("granted_at",{ascending:false});
  if(error) throw error;
  return data||[];
}
export async function grantSchoolStaffRole(authUserId,role){
  const {data:{user}}=await supabase.auth.getUser();
  const {error}=await supabase.from("school_staff_roles").upsert({
    auth_user_id:authUserId,role,is_active:true,granted_by:user?.id||null
  },{onConflict:"auth_user_id,role"});
  if(error) throw error;
}
export async function revokeSchoolStaffRole(id){
  const {error}=await supabase.from("school_staff_roles").update({is_active:false}).eq("id",id);
  if(error) throw error;
}
