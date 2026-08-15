import { supabase } from './supabase';

export async function issueCertificateIfEligible(courseId) {
  const { data, error } = await supabase.rpc('issue_certificate_if_eligible', { p_course_id: courseId });
  if (error) throw error;
  return data;
}
export async function getMyCertificates() {
  const { data:{session} }=await supabase.auth.getSession(); if(!session?.user)return [];
  const {data,error}=await supabase.from('certificates').select('*, courses(id,title,instructor)').eq('user_id',session.user.id).order('issued_at',{ascending:false});
  if(error)throw error;
  const {data:profile}=await supabase.from('profiles').select('full_name,email').eq('id',session.user.id).maybeSingle();
  return (data||[]).map(c=>({...c,profiles:profile||null}));
}
export async function getCertificate(id) {
  const {data,error}=await supabase.from('certificates').select('*, courses(id,title,instructor)').eq('id',id).single();
  if(error)throw error;
  const {data:profile}=await supabase.from('profiles').select('full_name,email').eq('id',data.user_id).maybeSingle();
  return {...data,profiles:profile||null};
}
export async function verifyCertificate(token){
  const {data,error}=await supabase.rpc('verify_certificate_public',{p_token:token});
  if(error)throw error;
  return Array.isArray(data)?data[0]:data;
}
export async function adminGetCertificates(){
  const {data,error}=await supabase.from('certificates').select('*, courses(id,title)').order('issued_at',{ascending:false}); if(error)throw error;
  const certs=data||[],ids=[...new Set(certs.map(x=>x.user_id))]; if(!ids.length)return certs;
  const {data:profiles,error:pe}=await supabase.from('profiles').select('id,full_name,email').in('id',ids);if(pe)throw pe;
  const map=Object.fromEntries((profiles||[]).map(p=>[p.id,p]));return certs.map(c=>({...c,profiles:map[c.user_id]||null}));
}
export async function setCertificateStatus(id,status){
 const {data,error}=await supabase.rpc('admin_set_certificate_status',{p_certificate_id:id,p_status:status});
 if(error)throw error; return data;
}
