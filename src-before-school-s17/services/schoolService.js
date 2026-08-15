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


export async function saveSchoolStage(payload){
  const row={
    code:payload.code.trim().toUpperCase(),
    name_ar:payload.name_ar.trim(),
    name_en:payload.name_en.trim(),
    sort_order:Number(payload.sort_order),
    is_active:payload.is_active!==false
  };
  if(payload.id){
    const {data,error}=await supabase.from("school_stages").update(row).eq("id",payload.id).select().single();
    if(error)throw error;return data;
  }
  const {data,error}=await supabase.from("school_stages").insert(row).select().single();
  if(error)throw error;return data;
}

export async function saveSchoolGradeLevel(payload){
  const row={
    stage_id:payload.stage_id,
    code:payload.code.trim().toUpperCase(),
    name_ar:payload.name_ar.trim(),
    name_en:payload.name_en.trim(),
    grade_number:Number(payload.grade_number),
    sort_order:Number(payload.sort_order),
    is_active:payload.is_active!==false
  };
  if(payload.id){
    const {data,error}=await supabase.from("school_grade_levels").update(row).eq("id",payload.id).select().single();
    if(error)throw error;return data;
  }
  const {data,error}=await supabase.from("school_grade_levels").insert(row).select().single();
  if(error)throw error;return data;
}

export async function saveSchoolCurriculum(payload){
  const row={
    code:payload.code.trim().toUpperCase(),
    name_ar:payload.name_ar.trim(),
    name_en:payload.name_en.trim(),
    instruction_language:payload.instruction_language,
    is_active:payload.is_active!==false
  };
  if(payload.id){
    const {data,error}=await supabase.from("school_curricula").update(row).eq("id",payload.id).select().single();
    if(error)throw error;return data;
  }
  const {data,error}=await supabase.from("school_curricula").insert(row).select().single();
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
    auth_user_id:payload.auth_user_id||null,
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
    auth_user_id:payload.auth_user_id||null,
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


// ============================================================
// SCHOOL S3 — Teachers / Timetable / Attendance / Homework
// ============================================================

export async function getSchoolS3Health(){
  const {data,error}=await supabase.rpc("school_s3_health");
  if(error)throw error;return data||{};
}

export async function getSchoolTeachers(){
  const {data,error}=await supabase
    .from("school_teachers")
    .select("*")
    .order("created_at",{ascending:false});
  if(error)throw error;return data||[];
}

export async function saveSchoolTeacher(payload){
  const row={
    employee_no:payload.employee_no?.trim()||null,
    auth_user_id:payload.auth_user_id||null,
    full_name_ar:payload.full_name_ar.trim(),
    full_name_en:payload.full_name_en?.trim()||null,
    gender:payload.gender||null,
    phone:payload.phone?.trim()||null,
    email:payload.email?.trim()||null,
    qualification:payload.qualification?.trim()||null,
    specialization:payload.specialization?.trim()||null,
    hire_date:payload.hire_date||new Date().toISOString().slice(0,10),
    status:payload.status||"active",
    notes:payload.notes?.trim()||null,
    updated_at:new Date().toISOString()
  };
  if(payload.id){
    const {data,error}=await supabase.from("school_teachers").update(row).eq("id",payload.id).select().single();
    if(error)throw error;return data;
  }
  const {data,error}=await supabase.from("school_teachers").insert(row).select().single();
  if(error)throw error;return data;
}

export async function getTeacherAssignments(){
  const {data,error}=await supabase.from("school_teacher_assignments")
    .select("*,school_teachers(id,employee_no,full_name_ar,full_name_en),school_academic_years(name),school_grade_levels(name_ar,name_en,code),school_curricula(name_ar,name_en,code),school_subjects(name_ar,name_en,code),school_class_sections(section_name)")
    .order("created_at",{ascending:false});
  if(error)throw error;return data||[];
}

export async function saveTeacherAssignment(payload){
  const row={
    teacher_id:payload.teacher_id,
    academic_year_id:payload.academic_year_id,
    grade_level_id:payload.grade_level_id,
    curriculum_id:payload.curriculum_id,
    subject_id:payload.subject_id,
    class_section_id:payload.class_section_id||null,
    is_primary_teacher:payload.is_primary_teacher!==false,
    is_active:payload.is_active!==false
  };
  if(payload.id){
    const {data,error}=await supabase.from("school_teacher_assignments").update(row).eq("id",payload.id).select().single();
    if(error)throw error;return data;
  }
  const {data,error}=await supabase.from("school_teacher_assignments").upsert(row,{
    onConflict:"teacher_id,academic_year_id,grade_level_id,curriculum_id,subject_id,class_section_id"
  }).select().single();
  if(error)throw error;return data;
}

export async function getSchoolTimetable(){
  const {data,error}=await supabase.from("school_timetable")
    .select("*,school_academic_years(name),school_class_sections(id,section_name,school_grade_levels(name_ar,name_en),school_curricula(name_ar,name_en)),school_subjects(name_ar,name_en),school_teachers(full_name_ar,full_name_en)")
    .order("weekday").order("period_no");
  if(error)throw error;return data||[];
}

export async function saveSchoolTimetableEntry(payload){
  const row={
    academic_year_id:payload.academic_year_id,
    class_section_id:payload.class_section_id,
    subject_id:payload.subject_id,
    teacher_id:payload.teacher_id,
    weekday:Number(payload.weekday),
    period_no:Number(payload.period_no),
    starts_at:payload.starts_at,
    ends_at:payload.ends_at,
    room:payload.room?.trim()||null,
    is_active:payload.is_active!==false,
    updated_at:new Date().toISOString()
  };
  if(payload.id){
    const {data,error}=await supabase.from("school_timetable").update(row).eq("id",payload.id).select().single();
    if(error)throw error;return data;
  }
  const {data,error}=await supabase.from("school_timetable").insert(row).select().single();
  if(error)throw error;return data;
}

export async function getClassActiveEnrollments(classSectionId){
  const {data,error}=await supabase.from("school_enrollments")
    .select("id,student_id,school_students(id,student_no,full_name_ar,full_name_en)")
    .eq("class_section_id",classSectionId)
    .eq("status","active")
    .order("created_at");
  if(error)throw error;return data||[];
}

export async function saveSchoolAttendance(payload){
  const {data,error}=await supabase.rpc("school_save_attendance",{
    p_class_section_id:payload.class_section_id,
    p_subject_id:payload.subject_id||null,
    p_attendance_date:payload.attendance_date,
    p_period_no:payload.period_no?Number(payload.period_no):null,
    p_notes:payload.notes||null,
    p_records:payload.records||[]
  });
  if(error)throw error;return data;
}

export async function getAttendanceSessions(){
  const {data,error}=await supabase.from("school_attendance_sessions")
    .select("*,school_class_sections(section_name,school_grade_levels(name_ar,name_en)),school_subjects(name_ar,name_en),school_teachers(full_name_ar,full_name_en),school_attendance_records(id,status,enrollment_id)")
    .order("attendance_date",{ascending:false})
    .limit(100);
  if(error)throw error;return data||[];
}

export async function getSchoolAssignments(){
  const {data,error}=await supabase.from("school_assignments")
    .select("*,school_class_sections(section_name,school_grade_levels(name_ar,name_en)),school_subjects(name_ar,name_en),school_teachers(full_name_ar,full_name_en),school_assignment_submissions(id,score,enrollment_id,submitted_at)")
    .order("created_at",{ascending:false});
  if(error)throw error;return data||[];
}

export async function saveSchoolAssignment(payload){
  const {data:{session}}=await supabase.auth.getSession();
  const row={
    academic_year_id:payload.academic_year_id,
    class_section_id:payload.class_section_id,
    subject_id:payload.subject_id,
    teacher_id:payload.teacher_id,
    title:payload.title.trim(),
    description:payload.description?.trim()||null,
    due_at:payload.due_at||null,
    max_score:Number(payload.max_score||10),
    is_published:payload.is_published!==false,
    updated_at:new Date().toISOString()
  };
  if(payload.id){
    const {data,error}=await supabase.from("school_assignments").update(row).eq("id",payload.id).select().single();
    if(error)throw error;return data;
  }
  const {data,error}=await supabase.from("school_assignments").insert(row).select().single();
  if(error)throw error;return data;
}

export async function getTeacherPortalDashboard(){
  const {data,error}=await supabase.rpc("school_teacher_dashboard");
  if(error)throw error;return data||{};
}

export async function getStudentSchoolDashboard(){
  const {data,error}=await supabase.rpc("school_student_dashboard");
  if(error)throw error;return data||{};
}

export async function getParentSchoolDashboard(){
  const {data,error}=await supabase.rpc("school_parent_dashboard");
  if(error)throw error;return data||{};
}

export async function submitSchoolAssignment(payload){
  const {data,error}=await supabase.from("school_assignment_submissions").upsert({
    assignment_id:payload.assignment_id,
    enrollment_id:payload.enrollment_id,
    submission_text:payload.submission_text?.trim()||null,
    attachment_url:payload.attachment_url?.trim()||null,
    submitted_at:new Date().toISOString()
  },{onConflict:"assignment_id,enrollment_id"}).select().single();
  if(error)throw error;return data;
}

export async function gradeSchoolSubmission(payload){
  const {data:{session}}=await supabase.auth.getSession();
  const {data,error}=await supabase.from("school_assignment_submissions").update({
    score:Number(payload.score),
    teacher_feedback:payload.teacher_feedback?.trim()||null,
    graded_at:new Date().toISOString(),
    graded_by:session?.user?.id||null
  }).eq("id",payload.id).select().single();
  if(error)throw error;return data;
}

export async function getSchoolSubjects(){const {data,error}=await supabase.from("school_subjects").select("*").eq("is_active",true).order("name_en");if(error)throw error;return data||[];}


export async function getSchoolGradeSubjects(){
  const {data,error}=await supabase.from("school_grade_subjects")
    .select("*,school_academic_years(name),school_grade_levels(name_ar,name_en,code),school_curricula(name_ar,name_en,code),school_subjects(name_ar,name_en,code)")
    .order("sort_order");
  if(error)throw error;return data||[];
}

export async function saveSchoolGradeSubject(payload){
  const row={
    academic_year_id:payload.academic_year_id,
    grade_level_id:payload.grade_level_id,
    curriculum_id:payload.curriculum_id,
    subject_id:payload.subject_id,
    weekly_periods:Number(payload.weekly_periods||1),
    pass_mark:Number(payload.pass_mark||50),
    max_mark:Number(payload.max_mark||100),
    sort_order:Number(payload.sort_order||1),
    is_active:payload.is_active!==false
  };
  const {data,error}=await supabase.from("school_grade_subjects").upsert(row,{
    onConflict:"academic_year_id,grade_level_id,curriculum_id,subject_id"
  }).select().single();
  if(error)throw error;return data;
}


// ============================================================
// SCHOOL S4 — Exams / Results / Report Cards / Class Teacher
// ============================================================
export async function getSchoolS4Health(){
 const {data,error}=await supabase.rpc("school_s4_health");if(error)throw error;return data||{};
}
export async function getSchoolExamPeriods(){
 const {data,error}=await supabase.from("school_exam_periods").select("*,school_academic_years(name)").order("starts_on",{ascending:false});if(error)throw error;return data||[];
}
export async function saveSchoolExamPeriod(x){
 const row={academic_year_id:x.academic_year_id,name_ar:x.name_ar.trim(),name_en:x.name_en?.trim()||null,exam_type:x.exam_type,term_no:Number(x.term_no),starts_on:x.starts_on,ends_on:x.ends_on,is_published:!!x.is_published,updated_at:new Date().toISOString()};
 if(x.id){const {data,error}=await supabase.from("school_exam_periods").update(row).eq("id",x.id).select().single();if(error)throw error;return data}
 const {data,error}=await supabase.from("school_exam_periods").insert(row).select().single();if(error)throw error;return data;
}
export async function getSchoolExams(){
 const {data,error}=await supabase.from("school_exams").select("*,school_exam_periods(name_ar,exam_type,term_no),school_class_sections(section_name,school_grade_levels(name_ar,code),school_curricula(name_ar,code)),school_subjects(name_ar,name_en),school_teachers(full_name_ar)").order("exam_date",{ascending:false});if(error)throw error;return data||[];
}
export async function saveSchoolExam(x){
 const row={exam_period_id:x.exam_period_id,class_section_id:x.class_section_id,subject_id:x.subject_id,teacher_id:x.teacher_id||null,title:x.title.trim(),exam_date:x.exam_date,starts_at:x.starts_at||null,duration_minutes:Number(x.duration_minutes||60),max_score:Number(x.max_score||100),pass_score:Number(x.pass_score||50),financial_lock:x.financial_lock!==false,is_published:!!x.is_published,notes:x.notes?.trim()||null,updated_at:new Date().toISOString()};
 if(x.id){const {data,error}=await supabase.from("school_exams").update(row).eq("id",x.id).select().single();if(error)throw error;return data}
 const {data,error}=await supabase.from("school_exams").insert(row).select().single();if(error)throw error;return data;
}
export async function refreshSchoolExamAccess(examId){const {data,error}=await supabase.rpc("school_exam_refresh_access",{p_exam_id:examId});if(error)throw error;return data}
export async function seedSchoolExamResults(examId){const {data,error}=await supabase.rpc("school_exam_seed_results",{p_exam_id:examId});if(error)throw error;return data}
export async function getSchoolExamGradebook(examId){
 const {data,error}=await supabase.from("school_exam_results").select("*,school_enrollments(id,school_students(student_no,full_name_ar,full_name_en)),school_exams(id,title,max_score,pass_score,exam_date),school_exam_access(eligible,reason,outstanding)").eq("exam_id",examId).order("created_at");if(error)throw error;return data||[];
}
export async function saveSchoolExamResult(x){const {data,error}=await supabase.rpc("school_save_exam_result",{p_exam_id:x.exam_id,p_enrollment_id:x.enrollment_id,p_score:x.score===""?null:Number(x.score),p_status:x.status,p_teacher_note:x.teacher_note||null});if(error)throw error;return data}
export async function publishSchoolExamResults(examId){
 const {error}=await supabase.from("school_exam_results").update({published_at:new Date().toISOString()}).eq("exam_id",examId);if(error)throw error;
}
export async function getSchoolReportCards(){
 const {data,error}=await supabase.from("school_report_cards").select("*,school_enrollments(id,class_section_id,school_students(student_no,full_name_ar),school_grade_levels(name_ar),school_curricula(name_ar),school_class_sections(section_name)),school_academic_years(name)").order("created_at",{ascending:false});if(error)throw error;return data||[];
}
export async function buildSchoolReportCard(enrollmentId,termNo){const {data,error}=await supabase.rpc("school_build_report_card",{p_enrollment_id:enrollmentId,p_term_no:Number(termNo)});if(error)throw error;return data}
export async function publishSchoolReportCard(id){const {data,error}=await supabase.rpc("school_publish_report_card",{p_report_card_id:id});if(error)throw error;return data}
export async function getSchoolClassTeacherCycles(){
 const {data,error}=await supabase.from("school_class_teacher_cycles").select("*,school_teachers(full_name_ar,employee_no),school_curricula(name_ar,code),school_academic_years!school_class_teacher_cycles_current_academic_year_id_fkey(name),school_grade_levels(name_ar,code),school_class_sections(section_name)").order("created_at",{ascending:false});if(error)throw error;return data||[];
}
export async function saveSchoolClassTeacherCycle(x){
 const row={teacher_id:x.teacher_id,curriculum_id:x.curriculum_id,cohort_key:x.cohort_key.trim(),started_academic_year_id:x.started_academic_year_id,current_academic_year_id:x.current_academic_year_id,current_grade_level_id:x.current_grade_level_id,current_class_section_id:x.current_class_section_id||null,cycle_year:Number(x.cycle_year||1),status:x.status||"active",notes:x.notes?.trim()||null,updated_at:new Date().toISOString()};
 if(x.id){const {data,error}=await supabase.from("school_class_teacher_cycles").update(row).eq("id",x.id).select().single();if(error)throw error;return data}
 const {data,error}=await supabase.from("school_class_teacher_cycles").insert(row).select().single();if(error)throw error;return data;
}
export async function getStudentPublishedResults(){
 const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("Student access required");
 const {data:st,error:e}=await supabase.from("school_students").select("id").eq("auth_user_id",user.id).maybeSingle();if(e)throw e;if(!st)throw new Error("Student access required");
 const {data:en,error:e2}=await supabase.from("school_enrollments").select("id").eq("student_id",st.id).eq("status","active").maybeSingle();if(e2)throw e2;if(!en)return {results:[],cards:[]};
 const [r,c]=await Promise.all([
  supabase.from("school_exam_results").select("*,school_exams(title,max_score,pass_score,exam_date,school_subjects(name_ar),school_exam_periods(name_ar,exam_type,term_no))").eq("enrollment_id",en.id).not("published_at","is",null),
  supabase.from("school_report_cards").select("*").eq("enrollment_id",en.id).eq("is_published",true)
 ]);if(r.error)throw r.error;if(c.error)throw c.error;return {results:r.data||[],cards:c.data||[]};
}


// ============================================================
// SCHOOL S5 — Finance / HR / Payroll
// ============================================================
export async function getSchoolS5Health(){const {data,error}=await supabase.rpc("school_s5_health");if(error)throw error;return data||{}}
export async function getSchoolDepartments(){const {data,error}=await supabase.from("school_departments").select("*").order("name_en");if(error)throw error;return data||[]}
export async function getSchoolEmployees(){const {data,error}=await supabase.from("school_employees").select("*,school_departments(name_ar,name_en),school_teachers(employee_no,full_name_ar)").order("created_at",{ascending:false});if(error)throw error;return data||[]}
export async function saveSchoolEmployee(x){
 const row={auth_user_id:x.auth_user_id||null,teacher_id:x.teacher_id||null,department_id:x.department_id||null,employee_no:x.employee_no?.trim()||null,full_name_ar:x.full_name_ar.trim(),full_name_en:x.full_name_en?.trim()||null,job_title_ar:x.job_title_ar.trim(),job_title_en:x.job_title_en?.trim()||null,phone:x.phone?.trim()||null,email:x.email?.trim()||null,national_id:x.national_id?.trim()||null,bank_name:x.bank_name?.trim()||null,bank_iban:x.bank_iban?.trim()||null,hire_date:x.hire_date||new Date().toISOString().slice(0,10),employment_type:x.employment_type||"full_time",base_salary:Number(x.base_salary||0),housing_allowance:Number(x.housing_allowance||0),transport_allowance:Number(x.transport_allowance||0),other_allowances:Number(x.other_allowances||0),fixed_deduction:Number(x.fixed_deduction||0),status:x.status||"active",notes:x.notes?.trim()||null,updated_at:new Date().toISOString()};
 if(x.id){const {data,error}=await supabase.from("school_employees").update(row).eq("id",x.id).select().single();if(error)throw error;return data}
 const {data,error}=await supabase.from("school_employees").insert(row).select().single();if(error)throw error;return data
}
export async function getSchoolFinanceAccounts(){const {data,error}=await supabase.from("school_finance_accounts").select("*").order("code");if(error)throw error;return data||[]}
export async function getSchoolFinanceSummary(from,to){const {data,error}=await supabase.rpc("school_finance_summary",{p_from:from,p_to:to});if(error)throw error;return data||{}}
export async function getSchoolFinanceTransactions(){const {data,error}=await supabase.from("school_finance_transactions").select("*,school_students(student_no,full_name_ar),school_employees(employee_no,full_name_ar),school_finance_accounts(code,name_ar)").order("transaction_date",{ascending:false}).limit(500);if(error)throw error;return data||[]}
export async function saveSchoolIncome(x){const {data:{user}}=await supabase.auth.getUser();const {data,error}=await supabase.from("school_income_entries").insert({income_date:x.income_date,category:x.category.trim(),amount:Number(x.amount),account_id:x.account_id||null,reference_no:x.reference_no?.trim()||null,source:x.source?.trim()||null,description:x.description?.trim()||null,created_by:user?.id||null}).select().single();if(error)throw error;return data}
export async function saveSchoolExpense(x){const {data:{user}}=await supabase.auth.getUser();const {data,error}=await supabase.from("school_expense_entries").insert({expense_date:x.expense_date,category:x.category.trim(),vendor:x.vendor?.trim()||null,amount:Number(x.amount),account_id:x.account_id||null,reference_no:x.reference_no?.trim()||null,description:x.description?.trim()||null,attachment_url:x.attachment_url?.trim()||null,status:x.status||"paid",created_by:user?.id||null}).select().single();if(error)throw error;return data}
export async function reverseSchoolFinanceTransaction(id,reason){const {data,error}=await supabase.rpc("school_finance_reverse_transaction",{p_transaction_id:id,p_reason:reason});if(error)throw error;return data}
export async function adjustSchoolFinance(accountId,amount,direction,description){const {data,error}=await supabase.rpc("school_finance_adjust",{p_account_id:accountId,p_amount:Number(amount),p_direction:direction,p_description:description});if(error)throw error;return data}
export async function getSchoolPayrollRuns(){const {data,error}=await supabase.from("school_payroll_runs").select("*,school_payroll_items(*,school_employees(employee_no,full_name_ar))").order("payroll_month",{ascending:false});if(error)throw error;return data||[]}
export async function generateSchoolPayroll(month){const {data,error}=await supabase.rpc("school_generate_payroll",{p_payroll_month:month});if(error)throw error;return data}
export async function paySchoolPayroll(runId,accountId){const {data,error}=await supabase.rpc("school_mark_payroll_paid",{p_payroll_run_id:runId,p_account_id:accountId});if(error)throw error;return data}


// ============================================================
// SCHOOL S6 — HR / Contracts / Leave / Staff Attendance
// ============================================================
export async function getSchoolS6Health(){const {data,error}=await supabase.rpc("school_s6_health");if(error)throw error;return data||{}}

export async function getEmployeeContracts(){const {data,error}=await supabase.from("school_employee_contracts").select("*,school_employees(employee_no,full_name_ar)").order("created_at",{ascending:false});if(error)throw error;return data||[]}
export async function saveEmployeeContract(x){
 const row={employee_id:x.employee_id,contract_no:x.contract_no?.trim()||null,contract_type:x.contract_type||"annual",starts_on:x.starts_on,ends_on:x.ends_on||null,probation_ends_on:x.probation_ends_on||null,basic_salary:Number(x.basic_salary||0),housing_allowance:Number(x.housing_allowance||0),transport_allowance:Number(x.transport_allowance||0),other_allowances:Number(x.other_allowances||0),working_hours_per_day:Number(x.working_hours_per_day||8),working_days_per_week:Number(x.working_days_per_week||5),status:x.status||"active",document_url:x.document_url?.trim()||null,notes:x.notes?.trim()||null,updated_at:new Date().toISOString()};
 if(x.id){const {data,error}=await supabase.from("school_employee_contracts").update(row).eq("id",x.id).select().single();if(error)throw error;return data}
 const {data,error}=await supabase.from("school_employee_contracts").insert(row).select().single();if(error)throw error;return data
}

export async function getLeaveTypes(){const {data,error}=await supabase.from("school_leave_types").select("*").eq("is_active",true).order("name_en");if(error)throw error;return data||[]}
export async function getLeaveRequests(){const {data,error}=await supabase.from("school_leave_requests").select("*,school_employees(employee_no,full_name_ar),school_leave_types(code,name_ar,name_en)").order("created_at",{ascending:false});if(error)throw error;return data||[]}
export async function saveLeaveRequest(x){const days=Math.floor((new Date(x.ends_on)-new Date(x.starts_on))/(86400000))+1;const {data,error}=await supabase.from("school_leave_requests").insert({employee_id:x.employee_id,leave_type_id:x.leave_type_id,starts_on:x.starts_on,ends_on:x.ends_on,days_count:days,reason:x.reason?.trim()||null,attachment_url:x.attachment_url?.trim()||null}).select().single();if(error)throw error;return data}
export async function reviewLeaveRequest(id,status,note){const {data,error}=await supabase.rpc("school_review_leave",{p_leave_id:id,p_status:status,p_note:note||null});if(error)throw error;return data}

export async function getStaffAttendance(date){let q=supabase.from("school_staff_attendance").select("*,school_employees(employee_no,full_name_ar,job_title_ar)").order("created_at");if(date)q=q.eq("attendance_date",date);const {data,error}=await q;if(error)throw error;return data||[]}
export async function saveStaffAttendance(date,records){const {data,error}=await supabase.rpc("school_save_staff_attendance",{p_date:date,p_records:records});if(error)throw error;return data}

export async function getOvertimeEntries(){const {data,error}=await supabase.from("school_overtime_entries").select("*,school_employees(employee_no,full_name_ar)").order("overtime_date",{ascending:false});if(error)throw error;return data||[]}
export async function saveOvertimeEntry(x){const {data,error}=await supabase.from("school_overtime_entries").insert({employee_id:x.employee_id,overtime_date:x.overtime_date,minutes:Number(x.minutes),rate_per_hour:Number(x.rate_per_hour||0),reason:x.reason?.trim()||null,status:x.status||"pending"}).select().single();if(error)throw error;return data}
export async function approveOvertime(id,status){const {data:{user}}=await supabase.auth.getUser();const {data,error}=await supabase.from("school_overtime_entries").update({status,approved_by:user?.id||null,approved_at:new Date().toISOString()}).eq("id",id).select().single();if(error)throw error;return data}


// ============================================================
// SCHOOL S7 — Digital Library / Books
// ============================================================
export async function getSchoolS7Health(){
  const {data,error}=await supabase.rpc("school_s7_health");
  if(error)throw error;
  return data||{};
}

export async function getSchoolBooks({publishedOnly=false}={}){
  let q=supabase.from("school_books")
    .select("*,school_subjects(id,name_ar,name_en,code),school_grade_levels(id,name_ar,name_en,code),school_curricula(id,name_ar,name_en,code),school_academic_years(id,name)")
    .order("created_at",{ascending:false});
  if(publishedOnly)q=q.eq("is_published",true);
  const {data,error}=await q;
  if(error)throw error;
  return data||[];
}

export async function saveSchoolBook(x){
  const {data:{user}}=await supabase.auth.getUser();
  const row={
    title_ar:x.title_ar.trim(),
    title_en:x.title_en?.trim()||null,
    subject_id:x.subject_id||null,
    grade_level_id:x.grade_level_id||null,
    curriculum_id:x.curriculum_id||null,
    academic_year_id:x.academic_year_id||null,
    book_type:x.book_type||"textbook",
    file_url:x.file_url,
    storage_path:x.storage_path||null,
    cover_url:x.cover_url||null,
    file_size_bytes:x.file_size_bytes||null,
    mime_type:x.mime_type||null,
    version:x.version?.trim()||null,
    description:x.description?.trim()||null,
    is_downloadable:x.is_downloadable!==false,
    is_published:x.is_published!==false,
    audience:x.audience||"student",
    uploaded_by:user?.id||null,
    updated_at:new Date().toISOString()
  };

  if(x.id){
    const {data,error}=await supabase.from("school_books").update(row).eq("id",x.id).select().single();
    if(error)throw error;return data;
  }
  const {data,error}=await supabase.from("school_books").insert(row).select().single();
  if(error)throw error;return data;
}

export async function recordSchoolBookDownload(bookId){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return;
  const {error}=await supabase.from("school_book_downloads").insert({book_id:bookId,user_id:user.id});
  if(error)throw error;
}

export async function getSchoolBookFavorites(){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return [];
  const {data,error}=await supabase.from("school_book_favorites").select("book_id").eq("user_id",user.id);
  if(error)throw error;
  return (data||[]).map(x=>x.book_id);
}

export async function toggleSchoolBookFavorite(bookId,isFavorite){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)throw new Error("Login required");
  if(isFavorite){
    const {error}=await supabase.from("school_book_favorites").delete().eq("book_id",bookId).eq("user_id",user.id);
    if(error)throw error;
  }else{
    const {error}=await supabase.from("school_book_favorites").insert({book_id:bookId,user_id:user.id});
    if(error)throw error;
  }
}

// SCHOOL S8 — Admissions
export async function getSchoolS8Health(){const{data,error}=await supabase.rpc("school_s8_health");if(error)throw error;return data||{}}
export async function getSchoolAdmissions(){const{data,error}=await supabase.from("school_admission_applications").select("*,school_academic_years(name),school_curricula(name_ar,name_en),school_grade_levels(name_ar,name_en)").order("created_at",{ascending:false});if(error)throw error;return data||[]}
export async function saveSchoolAdmission(x){const row={academic_year_id:x.academic_year_id||null,curriculum_id:x.curriculum_id||null,grade_level_id:x.grade_level_id||null,student_name_ar:x.student_name_ar.trim(),student_name_en:x.student_name_en?.trim()||null,gender:x.gender||null,birth_date:x.birth_date||null,nationality:x.nationality?.trim()||null,previous_school:x.previous_school?.trim()||null,parent_id:x.parent_id||null,parent_name:x.parent_name.trim(),parent_national_id:x.parent_national_id?.trim()||null,parent_email:x.parent_email?.trim()||null,parent_phone:x.parent_phone.trim(),sibling_detected:!!x.sibling_detected,sibling_discount_percent:Number(x.sibling_discount_percent||0),address:x.address?.trim()||null,notes:x.notes?.trim()||null,updated_at:new Date().toISOString()};if(x.id){const{data,error}=await supabase.from("school_admission_applications").update(row).eq("id",x.id).select().single();if(error)throw error;return data}const{data,error}=await supabase.from("school_admission_applications").insert(row).select().single();if(error)throw error;return data}
export async function reviewSchoolAdmission(id,status,note){const{data,error}=await supabase.rpc("school_review_admission",{p_id:id,p_status:status,p_note:note||null});if(error)throw error;return data}
export async function getStudentStatusHistory(studentId){const{data,error}=await supabase.from("school_student_status_history").select("*").eq("student_id",studentId).order("changed_at",{ascending:false});if(error)throw error;return data||[]}
export async function changeSchoolStudentStatus(studentId,status,reason){const{data,error}=await supabase.rpc("school_change_student_status",{p_student_id:studentId,p_new_status:status,p_reason:reason||null});if(error)throw error;return data}


// SCHOOL S8 FAMILY — Parent reuse + sibling discount
export async function findSchoolParent({email="",phone="",national_id=""}){
 const {data,error}=await supabase.rpc("school_find_parent",{p_email:email||null,p_phone:phone||null,p_national_id:national_id||null});
 if(error)throw error;return data||[];
}
export async function enrollSchoolAdmission(applicationId){
 const {data,error}=await supabase.rpc("school_enroll_admission",{p_application_id:applicationId});
 if(error)throw error;return data;
}
export async function getSchoolEnrollmentDiscounts(enrollmentId){
 const {data,error}=await supabase.from("school_enrollment_discounts").select("*").eq("enrollment_id",enrollmentId).eq("is_active",true);
 if(error)throw error;return data||[];
}
export async function refreshSchoolSiblingDiscount(enrollmentId){
 const {data,error}=await supabase.rpc("school_refresh_sibling_discount",{p_enrollment_id:enrollmentId});
 if(error)throw error;return data;
}


// ============================================================
// SCHOOL S9 — Question Bank / Online Exams
// ============================================================
export async function getSchoolS9Health(){const{data,error}=await supabase.rpc("school_s9_health");if(error)throw error;return data||{}}

export async function getSchoolQuestionBank(){
 const {data,error}=await supabase.from("school_question_bank")
 .select("*,school_subjects(name_ar,name_en),school_grade_levels(name_ar,name_en),school_curricula(name_ar,name_en),school_teachers(full_name_ar)")
 .eq("is_active",true).order("created_at",{ascending:false});
 if(error)throw error;return data||[];
}

export async function saveSchoolQuestion(x){
 const {data:{user}}=await supabase.auth.getUser();
 const row={
  academic_year_id:x.academic_year_id||null,
  curriculum_id:x.curriculum_id||null,
  grade_level_id:x.grade_level_id||null,
  subject_id:x.subject_id,
  teacher_id:x.teacher_id||null,
  question_type:x.question_type,
  question_text:x.question_text.trim(),
  options:x.question_type==="mcq"?(x.options||[]).filter(Boolean):null,
  correct_answer:x.correct_answer?.trim()||null,
  accepted_answers:x.question_type==="short_answer"?(x.accepted_answers||[]).filter(Boolean):null,
  explanation:x.explanation?.trim()||null,
  difficulty:x.difficulty||"medium",
  default_points:Number(x.default_points||1),
  is_active:x.is_active!==false,
  created_by:user?.id||null,
  updated_at:new Date().toISOString()
 };
 if(x.id){const{data,error}=await supabase.from("school_question_bank").update(row).eq("id",x.id).select().single();if(error)throw error;return data}
 const{data,error}=await supabase.from("school_question_bank").insert(row).select().single();if(error)throw error;return data
}

export async function addQuestionToSchoolExam(examId,questionId,points){
 const{data,error}=await supabase.rpc("school_add_question_to_exam",{p_exam_id:examId,p_question_id:questionId,p_points:Number(points||1)});
 if(error)throw error;return data;
}

export async function getSchoolOnlineExamQuestions(examId){
 const{data,error}=await supabase.from("school_online_exam_questions").select("*").eq("exam_id",examId).order("order_number");
 if(error)throw error;return data||[];
}

export async function updateSchoolExamOnlineSettings(examId,x){
 const row={
  delivery_mode:x.delivery_mode||"paper",
  opens_at:x.opens_at?new Date(x.opens_at).toISOString():null,
  closes_at:x.closes_at?new Date(x.closes_at).toISOString():null,
  attempts_allowed:Number(x.attempts_allowed||1),
  randomize_questions:!!x.randomize_questions,
  randomize_options:!!x.randomize_options,
  show_result_after_submit:!!x.show_result_after_submit,
  allow_review:!!x.allow_review,
  updated_at:new Date().toISOString()
 };
 const{data,error}=await supabase.from("school_exams").update(row).eq("id",examId).select().single();if(error)throw error;return data;
}

export async function getStudentAvailableOnlineExams(){
 const{data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("Student access required");
 const{data:student,error:sErr}=await supabase.from("school_students").select("id").eq("auth_user_id",user.id).maybeSingle();
 if(sErr)throw sErr;if(!student)return [];
 const{data:en,error:eErr}=await supabase.from("school_enrollments").select("id,class_section_id").eq("student_id",student.id).eq("status","active").maybeSingle();
 if(eErr)throw eErr;if(!en)return [];
 const{data,error}=await supabase.from("school_exams")
  .select("*,school_subjects(name_ar,name_en),school_exam_periods(name_ar,exam_type)")
  .eq("class_section_id",en.class_section_id).eq("is_published",true).in("delivery_mode",["online","hybrid"])
  .order("exam_date",{ascending:true});
 if(error)throw error;return data||[];
}

export async function startSchoolOnlineExam(examId){
 const{data,error}=await supabase.rpc("school_start_exam_attempt",{p_exam_id:examId});if(error)throw error;return data;
}

export async function saveSchoolOnlineAnswer(attemptId,questionId,answer){
 const{data,error}=await supabase.rpc("school_save_online_answer",{p_attempt_id:attemptId,p_question_id:questionId,p_answer:answer??""});if(error)throw error;return data;
}

export async function submitSchoolOnlineExam(attemptId){
 const{data,error}=await supabase.rpc("school_submit_exam_attempt",{p_attempt_id:attemptId});if(error)throw error;return data;
}

export async function getSchoolAttemptForStudent(attemptId){
 const[a,q,ans]=await Promise.all([
  supabase.from("school_exam_attempts").select("*,school_exams(title,duration_minutes,randomize_questions,randomize_options,show_result_after_submit,allow_review)").eq("id",attemptId).single(),
  supabase.from("school_online_exam_questions").select("id,exam_id,question_type,question_text,options,points,order_number").order("order_number"),
  supabase.from("school_exam_answers").select("exam_question_id,answer_text").eq("attempt_id",attemptId)
 ]);
 if(a.error)throw a.error;
 const examId=a.data.exam_id;
 if(q.error)throw q.error;if(ans.error)throw ans.error;
 return {attempt:a.data,questions:(q.data||[]).filter(x=>x.exam_id===examId),answers:ans.data||[]};
}

export async function getSchoolOnlineAttempts(examId){
 const{data,error}=await supabase.from("school_exam_attempts")
 .select("*,school_enrollments(id,school_students(student_no,full_name_ar)),school_exam_answers(id,answer_text,auto_score,manual_score,teacher_feedback,graded_at,school_online_exam_questions(id,question_text,question_type,points))")
 .eq("exam_id",examId).order("created_at",{ascending:false});
 if(error)throw error;return data||[];
}

export async function gradeSchoolOnlineAnswer(answerId,score,feedback){
 const{data,error}=await supabase.rpc("school_grade_online_answer",{p_answer_id:answerId,p_score:Number(score||0),p_feedback:feedback||null});if(error)throw error;return data;
}

export async function finalizeSchoolOnlineAttempt(attemptId){
 const{data,error}=await supabase.rpc("school_finalize_exam_attempt",{p_attempt_id:attemptId});if(error)throw error;return data;
}


// ============================================================
// SCHOOL S10 — Annual Results / Promotion / Certificates / Transcript
// ============================================================
export async function getSchoolS10Health(){
 const {data,error}=await supabase.rpc("school_s10_health");
 if(error)throw error;return data||{};
}

export async function getSchoolAnnualResults(){
 const {data,error}=await supabase.from("school_annual_results")
  .select("*,school_enrollments(id,class_section_id,school_students(id,student_no,full_name_ar,full_name_en),school_grade_levels(id,code,name_ar,name_en,sort_order),school_curricula(id,code,name_ar,name_en),school_class_sections(id,section_name)),school_academic_years(id,name)")
  .order("created_at",{ascending:false});
 if(error)throw error;return data||[];
}

export async function buildSchoolAnnualResult(enrollmentId){
 const {data,error}=await supabase.rpc("school_build_annual_result",{p_enrollment_id:enrollmentId});
 if(error)throw error;return data;
}

export async function buildSchoolSectionAnnualResults(sectionId){
 const {data,error}=await supabase.rpc("school_build_section_annual_results",{p_class_section_id:sectionId});
 if(error)throw error;return data;
}

export async function publishSchoolAnnualResult(id){
 const {data,error}=await supabase.rpc("school_publish_annual_result",{p_annual_result_id:id});
 if(error)throw error;return data;
}

export async function buildSchoolSectionReportCards(sectionId,termNo){
 const {data,error}=await supabase.rpc("school_build_section_report_cards",{p_class_section_id:sectionId,p_term_no:Number(termNo)});
 if(error)throw error;return data;
}

export async function processSchoolPromotion({enrollment_id,action,next_academic_year_id=null,next_class_section_id=null,reason=""}){
 const {data,error}=await supabase.rpc("school_process_promotion",{
  p_enrollment_id:enrollment_id,
  p_action:action,
  p_next_academic_year_id:next_academic_year_id||null,
  p_next_class_section_id:next_class_section_id||null,
  p_reason:reason||null
 });
 if(error)throw error;return data;
}

export async function bulkPromoteSchoolSection(fromSectionId,nextYearId,nextSectionId){
 const {data,error}=await supabase.rpc("school_bulk_promote_section",{
  p_from_class_section_id:fromSectionId,
  p_next_academic_year_id:nextYearId,
  p_next_class_section_id:nextSectionId||null
 });
 if(error)throw error;return data;
}

export async function getSchoolCertificates(){
 const {data,error}=await supabase.from("school_certificates")
  .select("*,school_students(student_no,full_name_ar,full_name_en),school_academic_years(name),school_grade_levels(name_ar,name_en),school_curricula(name_ar,name_en)")
  .order("issued_on",{ascending:false});
 if(error)throw error;return data||[];
}

export async function issueSchoolCertificate(enrollmentId,type="completion",titleAr="شهادة إتمام",titleEn="Completion Certificate"){
 const {data,error}=await supabase.rpc("school_issue_certificate",{
  p_enrollment_id:enrollmentId,
  p_certificate_type:type,
  p_title_ar:titleAr,
  p_title_en:titleEn
 });
 if(error)throw error;return data;
}

export async function revokeSchoolCertificate(id,reason){
 const {data,error}=await supabase.rpc("school_revoke_certificate",{p_certificate_id:id,p_reason:reason||"Revoked by school administration"});
 if(error)throw error;return data;
}

export async function getSchoolStudentTranscript(studentId){
 const {data,error}=await supabase.rpc("school_student_transcript",{p_student_id:studentId});
 if(error)throw error;return data||{};
}

export async function verifySchoolCertificate(code){
 const {data,error}=await supabase.rpc("school_verify_certificate",{p_code:code});
 if(error)throw error;return data||{};
}

export async function getMySchoolAcademicRecords(){
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)throw new Error("Login required");

 const {data:student,error:sError}=await supabase.from("school_students")
  .select("id,student_no,full_name_ar,full_name_en")
  .eq("auth_user_id",user.id).maybeSingle();
 if(sError)throw sError;
 if(!student)throw new Error("Student access required");

 const {data:enrollments,error:eError}=await supabase.from("school_enrollments")
  .select("id").eq("student_id",student.id);
 if(eError)throw eError;
 const enrollmentIds=(enrollments||[]).map(x=>x.id);

 const annualQ=supabase.from("school_annual_results")
  .select("*,school_academic_years(name),school_grade_levels(name_ar,name_en),school_curricula(name_ar,name_en)")
  .eq("student_id",student.id).eq("is_published",true)
  .order("created_at",{ascending:false});

 let cardsQ=supabase.from("school_report_cards")
  .select("*,school_academic_years(name)")
  .eq("is_published",true)
  .order("created_at",{ascending:false});
 if(enrollmentIds.length) cardsQ=cardsQ.in("enrollment_id",enrollmentIds);
 else cardsQ=cardsQ.eq("id","00000000-0000-0000-0000-000000000000");

 const certsQ=supabase.from("school_certificates")
  .select("*,school_academic_years(name),school_grade_levels(name_ar,name_en),school_curricula(name_ar,name_en)")
  .eq("student_id",student.id).eq("is_valid",true)
  .order("issued_on",{ascending:false});

 const [annual,reportCards,certs,transcript]=await Promise.all([
  annualQ,
  cardsQ,
  certsQ,
  supabase.rpc("school_student_transcript",{p_student_id:student.id})
 ]);

 if(annual.error)throw annual.error;
 if(reportCards.error)throw reportCards.error;
 if(certs.error)throw certs.error;
 if(transcript.error)throw transcript.error;

 return {
  student,
  annual:annual.data||[],
  reportCards:reportCards.data||[],
  certificates:certs.data||[],
  transcript:transcript.data||{}
 };
}


// ============================================================
// SCHOOL S11 — Communications / Notifications / Announcements
// ============================================================
export async function getSchoolS11Health(){
 const {data,error}=await supabase.rpc("school_s11_health");
 if(error)throw error;return data||{};
}

export async function getSchoolAnnouncements(){
 const {data,error}=await supabase.from("school_announcements")
  .select("*,school_academic_years(name),school_curricula(name_ar,name_en),school_grade_levels(name_ar,name_en),school_class_sections(section_name)")
  .order("created_at",{ascending:false});
 if(error)throw error;return data||[];
}

export async function saveSchoolAnnouncement(x){
 const {data:{user}}=await supabase.auth.getUser();
 const row={
  title_ar:x.title_ar.trim(),
  title_en:x.title_en?.trim()||null,
  body_ar:x.body_ar.trim(),
  body_en:x.body_en?.trim()||null,
  audience:x.audience||"all",
  academic_year_id:x.academic_year_id||null,
  curriculum_id:x.curriculum_id||null,
  grade_level_id:x.grade_level_id||null,
  class_section_id:x.class_section_id||null,
  priority:x.priority||"normal",
  starts_at:x.starts_at?new Date(x.starts_at).toISOString():new Date().toISOString(),
  expires_at:x.expires_at?new Date(x.expires_at).toISOString():null,
  is_published:!!x.is_published,
  created_by:user?.id||null,
  updated_at:new Date().toISOString()
 };
 if(x.id){
  const {data,error}=await supabase.from("school_announcements").update(row).eq("id",x.id).select().single();
  if(error)throw error;return data;
 }
 const {data,error}=await supabase.from("school_announcements").insert(row).select().single();
 if(error)throw error;return data;
}

export async function publishSchoolAnnouncement(id){
 const {data,error}=await supabase.rpc("school_publish_announcement",{p_announcement_id:id});
 if(error)throw error;return data;
}

export async function getMySchoolNotifications(){
 const {data,error}=await supabase.from("school_notifications")
  .select("*").eq("recipient_user_id",(await supabase.auth.getUser()).data.user?.id||"00000000-0000-0000-0000-000000000000")
  .order("created_at",{ascending:false}).limit(200);
 if(error)throw error;return data||[];
}

export async function markSchoolNotificationRead(id){
 const {data,error}=await supabase.rpc("school_mark_notification_read",{p_notification_id:id});
 if(error)throw error;return data;
}

export async function markAllSchoolNotificationsRead(){
 const {data,error}=await supabase.rpc("school_mark_all_notifications_read");
 if(error)throw error;return data;
}

export async function sendSchoolFeeDueNotifications(days=7){
 const {data,error}=await supabase.rpc("school_send_fee_due_notifications",{p_due_within_days:Number(days)});
 if(error)throw error;return data;
}

export async function getSchoolCommunicationLog(){
 const {data,error}=await supabase.from("school_communication_log")
  .select("*").order("created_at",{ascending:false}).limit(500);
 if(error)throw error;return data||[];
}

export async function getSchoolMessageTemplates(){
 const {data,error}=await supabase.from("school_message_templates")
  .select("*").order("code");
 if(error)throw error;return data||[];
}

export async function saveSchoolNotificationPreferences(x){
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)throw new Error("Login required");
 const row={user_id:user.id,...x,updated_at:new Date().toISOString()};
 const {data,error}=await supabase.from("school_notification_preferences")
  .upsert(row,{onConflict:"user_id"}).select().single();
 if(error)throw error;return data;
}

export async function getSchoolNotificationPreferences(){
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return null;
 const {data,error}=await supabase.from("school_notification_preferences")
  .select("*").eq("user_id",user.id).maybeSingle();
 if(error)throw error;return data;
}


// ============================================================
// SCHOOL S12 — Complete Parent Portal
// ============================================================
export async function getSchoolS12Health(){
 const {data,error}=await supabase.rpc("school_s12_health");
 if(error)throw error;return data||{};
}

export async function getParentChildPortal(studentId){
 const {data,error}=await supabase.rpc("school_parent_child_portal",{p_student_id:studentId});
 if(error)throw error;return data||{};
}

export async function getMySchoolParentProfile(){
 const {data,error}=await supabase.rpc("school_parent_profile");
 if(error)throw error;return data||{};
}

export async function updateMySchoolParentContact(payload){
 const {data,error}=await supabase.rpc("school_update_my_parent_contact",{
  p_phone:payload.phone||null,
  p_whatsapp:payload.whatsapp||null,
  p_email:payload.email||null,
  p_address:payload.address||null
 });
 if(error)throw error;return data;
}


// ============================================================
// SCHOOL S13 — Complete Student Portal
// ============================================================
export async function getSchoolS13Health(){
 const {data,error}=await supabase.rpc("school_s13_health");
 if(error)throw error;return data||{};
}
export async function getStudentFullPortal(){
 const {data,error}=await supabase.rpc("school_student_full_portal");
 if(error)throw error;return data||{};
}
export async function getMySchoolStudentProfile(){
 const {data,error}=await supabase.rpc("school_student_profile");
 if(error)throw error;return data||{};
}
export async function updateMySchoolStudentContact(payload){
 const {data,error}=await supabase.rpc("school_update_my_student_contact",{
  p_phone:payload.phone||null,p_email:payload.email||null
 });
 if(error)throw error;return data;
}


// ============================================================
// SCHOOL S14 — Complete Teacher Portal
// ============================================================
export async function getSchoolS14Health(){
 const {data,error}=await supabase.rpc("school_s14_health");
 if(error)throw error;return data||{};
}
export async function getTeacherFullPortal(){
 const {data,error}=await supabase.rpc("school_teacher_full_portal");
 if(error)throw error;return data||{};
}
export async function getMySchoolTeacherProfile(){
 const {data,error}=await supabase.rpc("school_teacher_profile");
 if(error)throw error;return data||{};
}
export async function updateMySchoolTeacherContact(payload){
 const {data,error}=await supabase.rpc("school_update_my_teacher_contact",{
  p_phone:payload.phone||null,p_email:payload.email||null
 });
 if(error)throw error;return data;
}
export async function getTeacherStudentSnapshot(enrollmentId){
 const {data,error}=await supabase.rpc("school_teacher_student_snapshot",{p_enrollment_id:enrollmentId});
 if(error)throw error;return data||{};
}


// ============================================================
// SCHOOL S15 — Core Security / Permissions / Health
// ============================================================
export async function getSchoolS15Health(){
 const {data,error}=await supabase.rpc("school_s15_health");
 if(error)throw error;return data||{};
}
export async function getSchoolSecurityDiagnostics(){
 const {data,error}=await supabase.rpc("school_security_diagnostics");
 if(error)throw error;return data||{};
}
export async function getMySchoolRoles(){
 const {data,error}=await supabase.rpc("school_my_roles");
 if(error)throw error;return data||[];
}


// ============================================================
// SCHOOL S16 — Operational Setup
// ============================================================
export async function getSchoolS16Health(){
 const {data,error}=await supabase.rpc("school_s16_health");
 if(error)throw error;return data||{};
}
export async function getSchoolOperationalSetup(){
 const {data,error}=await supabase.rpc("school_operational_setup");
 if(error)throw error;return data||{};
}
export async function assignSchoolEnrollmentToSection(enrollmentId,sectionId){
 const {data,error}=await supabase.rpc("school_assign_enrollment_to_section",{
  p_enrollment_id:enrollmentId,p_section_id:sectionId
 });
 if(error)throw error;return data;
}
export async function bulkAssignSchoolEnrollmentsToSection(enrollmentIds,sectionId){
 const {data,error}=await supabase.rpc("school_bulk_assign_enrollments_to_section",{
  p_enrollment_ids:enrollmentIds,p_section_id:sectionId
 });
 if(error)throw error;return data||{};
}
export async function assignSchoolTeacherToClassSubject({teacher_id,section_id,subject_id,is_primary_teacher=true}){
 const {data,error}=await supabase.rpc("school_assign_teacher_to_class_subject",{
  p_teacher_id:teacher_id,
  p_section_id:section_id,
  p_subject_id:subject_id,
  p_is_primary:is_primary_teacher
 });
 if(error)throw error;return data;
}
export async function deactivateSchoolTeacherAssignment(id){
 const {data,error}=await supabase.rpc("school_deactivate_teacher_assignment",{p_assignment_id:id});
 if(error)throw error;return data;
}
