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


export async function getSchoolS2Health(){
  const {data,error}=await supabase.rpc("school_s2_health");
  if(error)throw error;return data||{};
}

export async function getSchoolStudents(){
  const {data,error}=await supabase
    .from("school_students")
    .select("*,school_enrollments(id,status,academic_year_id,grade_level_id,curriculum_id,class_section_id,school_academic_years(name),school_grade_levels(name_ar,name_en,code),school_curricula(name_ar,name_en,code),school_class_sections(section_name))")
    .order("created_at",{ascending:false});
  if(error)throw error;return data||[];
}

export async function saveSchoolStudent(payload){
  const row={
    student_no:payload.student_no?.trim()||null,
    full_name_ar:payload.full_name_ar.trim(),
    full_name_en:payload.full_name_en?.trim()||null,
    gender:payload.gender||null,
    date_of_birth:payload.date_of_birth||null,
    nationality:payload.nationality?.trim()||"Sudanese",
    phone:payload.phone?.trim()||null,
    email:payload.email?.trim()||null,
    status:payload.status||"active",
    admission_date:payload.admission_date||new Date().toISOString().slice(0,10),
    notes:payload.notes?.trim()||null,
    updated_at:new Date().toISOString()
  };
  if(payload.id){
    const {data,error}=await supabase.from("school_students").update(row).eq("id",payload.id).select().single();
    if(error)throw error;return data;
  }
  const {data,error}=await supabase.from("school_students").insert(row).select().single();
  if(error)throw error;return data;
}

export async function getSchoolParents(){
  const {data,error}=await supabase
    .from("school_parents")
    .select("*,school_parent_students(id,relation,is_primary,student_id,school_students(id,student_no,full_name_ar,full_name_en))")
    .order("created_at",{ascending:false});
  if(error)throw error;return data||[];
}

export async function saveSchoolParent(payload){
  const row={
    full_name:payload.full_name.trim(),
    relation_default:payload.relation_default?.trim()||null,
    national_id:payload.national_id?.trim()||null,
    phone:payload.phone?.trim()||null,
    whatsapp:payload.whatsapp?.trim()||null,
    email:payload.email?.trim()||null,
    occupation:payload.occupation?.trim()||null,
    address:payload.address?.trim()||null,
    is_active:payload.is_active!==false,
    updated_at:new Date().toISOString()
  };
  if(payload.id){
    const {data,error}=await supabase.from("school_parents").update(row).eq("id",payload.id).select().single();
    if(error)throw error;return data;
  }
  const {data,error}=await supabase.from("school_parents").insert(row).select().single();
  if(error)throw error;return data;
}

export async function linkParentStudent({parent_id,student_id,relation,is_primary}){
  const {data,error}=await supabase.from("school_parent_students").upsert({
    parent_id,student_id,relation:relation||"guardian",is_primary:!!is_primary
  },{onConflict:"parent_id,student_id"}).select().single();
  if(error)throw error;return data;
}

export async function saveSchoolEnrollment(payload){
  const row={
    student_id:payload.student_id,
    academic_year_id:payload.academic_year_id,
    grade_level_id:payload.grade_level_id,
    curriculum_id:payload.curriculum_id,
    class_section_id:payload.class_section_id||null,
    status:payload.status||"active",
    enrolled_on:payload.enrolled_on||new Date().toISOString().slice(0,10),
    updated_at:new Date().toISOString()
  };
  if(payload.id){
    const {data,error}=await supabase.from("school_enrollments").update(row).eq("id",payload.id).select().single();
    if(error)throw error;return data;
  }
  const {data,error}=await supabase.from("school_enrollments").insert(row).select().single();
  if(error)throw error;return data;
}

export async function getSchoolFeePlans(){
  const {data,error}=await supabase
    .from("school_fee_plans")
    .select("*,school_academic_years(name),school_grade_levels(name_ar,name_en,code),school_curricula(name_ar,name_en,code)")
    .order("created_at",{ascending:false});
  if(error)throw error;return data||[];
}

export async function saveSchoolFeePlan(payload){
  const row={
    academic_year_id:payload.academic_year_id,
    grade_level_id:payload.grade_level_id,
    curriculum_id:payload.curriculum_id,
    annual_tuition:Number(payload.annual_tuition||0),
    registration_fee:Number(payload.registration_fee||0),
    other_fees:Number(payload.other_fees||0),
    installments_count:Number(payload.installments_count||10),
    currency:payload.currency||"SAR",
    is_active:payload.is_active!==false,
    updated_at:new Date().toISOString()
  };
  const {data,error}=await supabase.from("school_fee_plans").upsert(row,{
    onConflict:"academic_year_id,grade_level_id,curriculum_id"
  }).select().single();
  if(error)throw error;return data;
}

export async function getSchoolInstallments(enrollmentId=null){
  let q=supabase.from("school_installments")
    .select("*,school_enrollments(id,student_id,school_students(student_no,full_name_ar,full_name_en))")
    .order("due_date",{ascending:true});
  if(enrollmentId)q=q.eq("enrollment_id",enrollmentId);
  const {data,error}=await q;
  if(error)throw error;return data||[];
}

export async function generateSchoolInstallments(enrollmentId,firstDueDate){
  const {data,error}=await supabase.rpc("school_generate_installments",{
    p_enrollment_id:enrollmentId,p_first_due_date:firstDueDate
  });
  if(error)throw error;return data;
}

export async function refreshSchoolOverdue(){
  const {data,error}=await supabase.rpc("school_refresh_overdue");
  if(error)throw error;return data;
}

export async function recordSchoolPayment(payload){
  const {data,error}=await supabase.rpc("school_record_payment",{
    p_enrollment_id:payload.enrollment_id,
    p_installment_id:payload.installment_id||null,
    p_amount:Number(payload.amount),
    p_method:payload.method||"cash",
    p_reference_no:payload.reference_no||null,
    p_notes:payload.notes||null
  });
  if(error)throw error;return data;
}

export async function getSchoolPayments(){
  const {data,error}=await supabase.from("school_payments")
    .select("*,school_enrollments(id,school_students(student_no,full_name_ar,full_name_en)),school_installments(title,due_date)")
    .order("paid_at",{ascending:false});
  if(error)throw error;return data||[];
}

export async function checkFinancialEligibility(enrollmentId,examDate){
  const {data,error}=await supabase.rpc("school_financial_exam_eligible",{
    p_enrollment_id:enrollmentId,p_exam_date:examDate
  });
  if(error)throw error;return data;
}
