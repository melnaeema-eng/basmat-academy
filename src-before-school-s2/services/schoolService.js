import {supabase} from "./supabase";

export async function getSchoolCore(){
  const [years,stages,grades,curricula,subjects,sections,health]=await Promise.all([
    supabase.from("school_academic_years").select("*").order("starts_on",{ascending:false}),
    supabase.from("school_stages").select("*").order("sort_order"),
    supabase.from("school_grade_levels").select("*,school_stages(id,code,name_ar,name_en)").order("sort_order"),
    supabase.from("school_curricula").select("*").order("code"),
    supabase.from("school_subjects").select("*").order("name_en"),
    supabase.from("school_class_sections").select("*,school_grade_levels(id,code,name_ar,name_en),school_curricula(id,code,name_ar,name_en)").order("section_name"),
    supabase.rpc("school_core_health")
  ]);
  for(const r of [years,stages,grades,curricula,subjects,sections,health]) if(r.error) throw r.error;
  return {
    years:years.data||[],
    stages:stages.data||[],
    grades:grades.data||[],
    curricula:curricula.data||[],
    subjects:subjects.data||[],
    sections:sections.data||[],
    health:health.data||{}
  };
}

export async function saveAcademicYear(payload){
  const {data,error}=await supabase.rpc("school_save_academic_year",{
    p_id:payload.id||null,
    p_name:payload.name,
    p_starts_on:payload.starts_on,
    p_ends_on:payload.ends_on,
    p_is_current:!!payload.is_current,
    p_status:payload.status||"draft"
  });
  if(error)throw error;return data;
}

export async function saveSchoolSubject(payload){
  const row={
    code:payload.code.trim().toUpperCase(),
    name_ar:payload.name_ar.trim(),
    name_en:payload.name_en.trim(),
    description_ar:payload.description_ar?.trim()||null,
    description_en:payload.description_en?.trim()||null,
    is_active:payload.is_active!==false,
    updated_at:new Date().toISOString()
  };
  if(payload.id){
    const{data,error}=await supabase.from("school_subjects").update(row).eq("id",payload.id).select().single();
    if(error)throw error;return data;
  }
  const{data,error}=await supabase.from("school_subjects").insert(row).select().single();
  if(error)throw error;return data;
}

export async function saveClassSection(payload){
  const row={
    academic_year_id:payload.academic_year_id,
    grade_level_id:payload.grade_level_id,
    curriculum_id:payload.curriculum_id,
    section_name:payload.section_name.trim(),
    capacity:payload.capacity?Number(payload.capacity):null,
    is_active:payload.is_active!==false,
    updated_at:new Date().toISOString()
  };
  if(payload.id){
    const{data,error}=await supabase.from("school_class_sections").update(row).eq("id",payload.id).select().single();
    if(error)throw error;return data;
  }
  const{data,error}=await supabase.from("school_class_sections").insert(row).select().single();
  if(error)throw error;return data;
}
