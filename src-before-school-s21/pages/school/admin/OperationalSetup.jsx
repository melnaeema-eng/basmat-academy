import {useEffect,useMemo,useState} from "react";
import {FaChalkboardTeacher,FaCheck,FaExchangeAlt,FaSchool,FaTrashAlt,FaUserGraduate} from "react-icons/fa";
import {
  assignSchoolEnrollmentToSection,
  assignSchoolTeacherToClassSubject,
  bulkAssignSchoolEnrollmentsToSection,
  deactivateSchoolTeacherAssignment,
  getSchoolOperationalSetup
} from "../../../services/schoolService";

export default function SchoolOperationalSetup(){
 const[data,setData]=useState(null),[tab,setTab]=useState("students"),[selected,setSelected]=useState([]),[sectionId,setSectionId]=useState("");
 const[teacherId,setTeacherId]=useState(""),[teacherSectionId,setTeacherSectionId]=useState(""),[subjectId,setSubjectId]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");

 async function load(){
  try{
   const d=await getSchoolOperationalSetup();
   setData(d);
   const firstSection=d?.sections?.[0]?.id||"";
   setSectionId(v=>v||firstSection);
   setTeacherSectionId(v=>v||firstSection);
   setTeacherId(v=>v||d?.teachers?.[0]?.id||"");
   setError("");
  }catch(e){setError(e.message)}
 }
 useEffect(()=>{load()},[]);

 const unassigned=data?.unassigned_enrollments||[];
 const sections=data?.sections||[];
 const teachers=data?.teachers||[];
 const assignments=data?.teacher_assignments||[];
 const gradeSubjects=data?.grade_subjects||[];

 const targetSection=sections.find(x=>x.id===sectionId);
 const compatibleUnassigned=useMemo(()=>unassigned.filter(x=>!targetSection||(
   x.academic_year_id===targetSection.academic_year_id &&
   x.grade_level_id===targetSection.grade_level_id &&
   x.curriculum_id===targetSection.curriculum_id
 )),[unassigned,targetSection]);

 const teacherSection=sections.find(x=>x.id===teacherSectionId);
 const subjectOptions=useMemo(()=>gradeSubjects.filter(x=>teacherSection &&
   x.academic_year_id===teacherSection.academic_year_id &&
   x.grade_level_id===teacherSection.grade_level_id &&
   x.curriculum_id===teacherSection.curriculum_id
 ),[gradeSubjects,teacherSection]);

 useEffect(()=>{
  if(subjectOptions.length&&!subjectOptions.some(x=>x.subject_id===subjectId))setSubjectId(subjectOptions[0].subject_id);
  if(!subjectOptions.length)setSubjectId("");
 },[teacherSectionId,data]);

 function toggle(id){setSelected(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id])}

 async function assignOne(enrollmentId){
  try{setBusy(true);await assignSchoolEnrollmentToSection(enrollmentId,sectionId);await load()}
  catch(e){alert(e.message)}finally{setBusy(false)}
 }

 async function assignBulk(){
  if(!selected.length)return alert("اختر طالبًا واحدًا على الأقل");
  if(!sectionId)return alert("اختر الفصل");
  try{
   setBusy(true);
   const r=await bulkAssignSchoolEnrollmentsToSection(selected,sectionId);
   setSelected([]);
   await load();
   alert(`تم التوزيع: ${r.success||0} • فشل: ${r.failed||0}`);
  }catch(e){alert(e.message)}finally{setBusy(false)}
 }

 async function assignTeacher(){
  if(!teacherId||!teacherSectionId||!subjectId)return alert("اختر المعلم والفصل والمادة");
  try{
   setBusy(true);
   await assignSchoolTeacherToClassSubject({teacher_id:teacherId,section_id:teacherSectionId,subject_id:subjectId,is_primary_teacher:true});
   await load();
   alert("تم إسناد المعلم للمادة والفصل");
  }catch(e){alert(e.message)}finally{setBusy(false)}
 }

 async function deactivate(id){
  if(!confirm("إلغاء هذا التكليف؟ لن يتم حذف السجل نهائيًا."))return;
  try{setBusy(true);await deactivateSchoolTeacherAssignment(id);await load()}
  catch(e){alert(e.message)}finally{setBusy(false)}
 }

 return <div>
  <div className="flex flex-wrap items-end justify-between gap-3">
   <div><h1 className="text-3xl font-extrabold text-[#12345b]">التشغيل الأكاديمي</h1><p className="mt-2 text-slate-500">توزيع الطلاب على الفصول وإسناد المعلمين للمواد والفصول قبل تشغيل الحضور والواجبات والجدول.</p></div>
   <div className="rounded-xl bg-white px-4 py-3 text-sm font-bold">العام الحالي: {data?.current_year?.name||"—"}</div>
  </div>

  {error&&<div className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}

  <div className="mt-5 grid gap-4 md:grid-cols-4">
   <Stat t="فصول نشطة" v={sections.length} icon={<FaSchool/>}/>
   <Stat t="طلاب بلا فصل" v={unassigned.length} icon={<FaUserGraduate/>}/>
   <Stat t="معلمون" v={teachers.length} icon={<FaChalkboardTeacher/>}/>
   <Stat t="تكليفات معلمين" v={assignments.length} icon={<FaCheck/>}/>
  </div>

  <div className="mt-6 flex gap-2">
   <button onClick={()=>setTab("students")} className={`rounded-xl px-4 py-2 font-bold ${tab==="students"?"bg-[#12345b] text-white":"bg-white border"}`}>توزيع الطلاب</button>
   <button onClick={()=>setTab("teachers")} className={`rounded-xl px-4 py-2 font-bold ${tab==="teachers"?"bg-[#12345b] text-white":"bg-white border"}`}>إسناد المعلمين</button>
   <button onClick={()=>setTab("sections")} className={`rounded-xl px-4 py-2 font-bold ${tab==="sections"?"bg-[#12345b] text-white":"bg-white border"}`}>إشغال الفصول</button>
  </div>

  {tab==="students"&&<div className="mt-5 grid gap-6 xl:grid-cols-[390px_1fr]">
   <div className="academy-card p-5">
    <h2 className="font-extrabold text-[#12345b]">الفصل المستهدف</h2>
    <select className="academy-input mt-3" value={sectionId} onChange={e=>{setSectionId(e.target.value);setSelected([])}}>
     {sections.map(x=><option key={x.id} value={x.id}>{x.grade_ar} / {x.curriculum_ar} / {x.section_name} — {x.enrolled_count}/{x.capacity??"∞"}</option>)}
    </select>
    {targetSection&&<div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm">
     <div>العام: <b>{targetSection.academic_year}</b></div>
     <div>الصف: <b>{targetSection.grade_ar}</b></div>
     <div>المنهج: <b>{targetSection.curriculum_ar}</b></div>
     <div>المتاح: <b>{targetSection.available_places??"غير محدود"}</b></div>
    </div>}
    <button disabled={busy||!selected.length} onClick={assignBulk} className="academy-btn-primary mt-4 w-full"><FaExchangeAlt/>توزيع المحددين ({selected.length})</button>
   </div>

   <div className="space-y-3">
    {compatibleUnassigned.map(x=><div key={x.enrollment_id} className="academy-card flex flex-wrap items-center justify-between gap-4 p-5">
     <label className="flex items-center gap-3">
      <input type="checkbox" checked={selected.includes(x.enrollment_id)} onChange={()=>toggle(x.enrollment_id)}/>
      <div><div className="text-xs font-bold text-orange-600">{x.student_no}</div><b className="text-[#12345b]">{x.student_name}</b><div className="text-xs text-slate-500">{x.grade_ar} • {x.curriculum_ar}</div></div>
     </label>
     <button disabled={busy} onClick={()=>assignOne(x.enrollment_id)} className="academy-btn-dark">إسناد لهذا الفصل</button>
    </div>)}
    {!compatibleUnassigned.length&&<div className="academy-card p-8 text-center text-slate-500">لا يوجد طلاب غير موزعين يطابقون هذا الفصل.</div>}
   </div>
  </div>}

  {tab==="teachers"&&<div className="mt-5 grid gap-6 xl:grid-cols-[420px_1fr]">
   <div className="academy-card space-y-4 p-5">
    <h2 className="font-extrabold text-[#12345b]">تكليف معلم</h2>
    <F l="المعلم"><select className="academy-input" value={teacherId} onChange={e=>setTeacherId(e.target.value)}>{teachers.map(x=><option key={x.id} value={x.id}>{x.full_name_ar} — {x.specialization||"بدون تخصص"}</option>)}</select></F>
    <F l="الفصل"><select className="academy-input" value={teacherSectionId} onChange={e=>setTeacherSectionId(e.target.value)}>{sections.map(x=><option key={x.id} value={x.id}>{x.grade_ar} / {x.curriculum_ar} / {x.section_name}</option>)}</select></F>
    <F l="المادة"><select className="academy-input" value={subjectId} onChange={e=>setSubjectId(e.target.value)}>{subjectOptions.map(x=><option key={x.subject_id} value={x.subject_id}>{x.subject_ar} — {x.weekly_periods} حصص/أسبوع</option>)}</select></F>
    {!subjectOptions.length&&<div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">لا توجد مواد مفعلة لهذا الصف/المنهج/العام. أضفها أولًا من صفحة المواد.</div>}
    <button disabled={busy||!subjectOptions.length} onClick={assignTeacher} className="academy-btn-primary w-full"><FaChalkboardTeacher/>حفظ التكليف</button>
   </div>

   <div className="space-y-3">
    {assignments.map(x=><div key={x.id} className="academy-card flex flex-wrap items-center justify-between gap-4 p-5">
     <div><div className="text-xs font-bold text-orange-600">{x.teacher_name}</div><b className="text-[#12345b]">{x.subject_ar}</b><div className="text-sm text-slate-500">{x.grade_ar} • {x.curriculum_ar} • فصل {x.section_name||"عام"}</div></div>
     <button disabled={busy} onClick={()=>deactivate(x.id)} className="rounded-xl bg-red-50 px-4 py-2 font-bold text-red-600"><FaTrashAlt className="inline"/> إلغاء التكليف</button>
    </div>)}
    {!assignments.length&&<div className="academy-card p-8 text-center text-slate-500">لا توجد تكليفات معلمين حتى الآن.</div>}
   </div>
  </div>}

  {tab==="sections"&&<div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
   {sections.map(x=><div key={x.id} className="academy-card p-5">
    <div className="text-xs font-bold text-orange-600">{x.academic_year} • {x.curriculum_ar}</div>
    <h3 className="mt-1 text-xl font-extrabold text-[#12345b]">{x.grade_ar} — فصل {x.section_name}</h3>
    <div className="mt-4 text-3xl font-extrabold">{x.enrolled_count} <span className="text-base text-slate-400">/ {x.capacity??"∞"}</span></div>
    <div className="mt-2 text-sm text-slate-500">المقاعد المتاحة: {x.available_places??"غير محدودة"}</div>
   </div>)}
  </div>}
 </div>
}
function Stat({t,v,icon}){return <div className="academy-card p-5"><div className="flex justify-between"><div><div className="text-sm text-slate-500">{t}</div><div className="mt-2 text-3xl font-extrabold text-[#12345b]">{v}</div></div><div className="text-2xl text-orange-500">{icon}</div></div></div>}
function F({l,children}){return <label className="block"><span className="mb-1.5 block text-sm font-bold">{l}</span>{children}</label>}
