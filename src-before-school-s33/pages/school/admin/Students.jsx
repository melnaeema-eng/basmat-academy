import {useEffect,useMemo,useState} from "react";
import {FaPlus,FaSearch,FaUserGraduate} from "react-icons/fa";
import {getSchoolCore,getSchoolStudents,saveSchoolEnrollment,saveSchoolStudent} from "../../../services/schoolService";

const emptyStudent={auth_user_id:"",full_name_ar:"",full_name_en:"",gender:"",date_of_birth:"",nationality:"Sudanese",phone:"",email:"",status:"active",admission_date:new Date().toISOString().slice(0,10),notes:""};
const emptyEnrollment={student_id:"",academic_year_id:"",grade_level_id:"",curriculum_id:"",class_section_id:"",status:"active"};

export default function SchoolStudents(){
 const[students,setStudents]=useState([]),[core,setCore]=useState(null),[form,setForm]=useState(emptyStudent),[enroll,setEnroll]=useState(emptyEnrollment),[search,setSearch]=useState(""),[saving,setSaving]=useState(false),[mode,setMode]=useState("student");
 async function load(){
  const[c,s]=await Promise.all([getSchoolCore(),getSchoolStudents()]);
  setCore(c);setStudents(s);
  setEnroll(e=>({...e,academic_year_id:e.academic_year_id||c.years.find(x=>x.is_current)?.id||"",grade_level_id:e.grade_level_id||c.grades[0]?.id||"",curriculum_id:e.curriculum_id||c.curricula[0]?.id||""}));
 }
 useEffect(()=>{load().catch(e=>alert(e.message))},[]);
 async function saveStudent(e){e.preventDefault();try{setSaving(true);await saveSchoolStudent(form);setForm(emptyStudent);await load()}catch(e){alert(e.message)}finally{setSaving(false)}}
 async function saveEnrollment(e){e.preventDefault();try{setSaving(true);await saveSchoolEnrollment(enroll);setEnroll(v=>({...v,student_id:"",class_section_id:""}));await load()}catch(e){alert(e.message)}finally{setSaving(false)}}
 const visible=useMemo(()=>students.filter(s=>[s.student_no,s.full_name_ar,s.full_name_en,s.phone,s.email].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase())),[students,search]);
 const sections=(core?.sections||[]).filter(x=>!enroll.grade_level_id||x.grade_level_id===enroll.grade_level_id).filter(x=>!enroll.curriculum_id||x.curriculum_id===enroll.curriculum_id);
 return <div>
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-extrabold text-[#12345b]">الطلاب والتسجيل الأكاديمي</h1><p className="mt-2 text-slate-500">إنشاء ملف الطالب ثم تسجيله في العام والصف والمنهج والفصل.</p></div><div className="flex gap-2"><button onClick={()=>setMode("student")} className={`rounded-xl px-4 py-2 font-bold ${mode==="student"?"bg-orange-500 text-white":"bg-white text-[#12345b]"}`}>طالب جديد</button><button onClick={()=>setMode("enroll")} className={`rounded-xl px-4 py-2 font-bold ${mode==="enroll"?"bg-orange-500 text-white":"bg-white text-[#12345b]"}`}>تسجيل طالب</button></div></div>

  <div className="grid gap-6 xl:grid-cols-[440px_1fr]">
   <div>
    {mode==="student"?<form onSubmit={saveStudent} className="academy-card space-y-4 p-5">
      <h2 className="font-extrabold text-[#12345b]">إضافة طالب</h2>
      <Field label="الاسم بالعربية"><input required className="academy-input" value={form.full_name_ar} onChange={e=>setForm({...form,full_name_ar:e.target.value})}/></Field>
      <Field label="الاسم بالإنجليزية"><input className="academy-input" value={form.full_name_en} onChange={e=>setForm({...form,full_name_en:e.target.value})}/></Field>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="النوع"><select className="academy-input" value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}><option value="">—</option><option value="male">ذكر</option><option value="female">أنثى</option></select></Field><Field label="تاريخ الميلاد"><input type="date" className="academy-input" value={form.date_of_birth} onChange={e=>setForm({...form,date_of_birth:e.target.value})}/></Field></div>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="الجوال"><input dir="ltr" className="academy-input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><Field label="البريد"><input dir="ltr" type="email" className="academy-input" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field></div>
      <Field label="Auth User ID للبوابة (اختياري)"><input dir="ltr" className="academy-input" value={form.auth_user_id} onChange={e=>setForm({...form,auth_user_id:e.target.value})}/></Field><Field label="ملاحظات"><textarea className="academy-input min-h-24" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></Field>
      <button disabled={saving} className="academy-btn-primary w-full"><FaPlus/>{saving?"جاري الحفظ...":"حفظ الطالب"}</button>
    </form>:<form onSubmit={saveEnrollment} className="academy-card space-y-4 p-5">
      <h2 className="font-extrabold text-[#12345b]">التسجيل الأكاديمي</h2>
      <Field label="الطالب"><select required className="academy-input" value={enroll.student_id} onChange={e=>setEnroll({...enroll,student_id:e.target.value})}><option value="">اختر الطالب</option>{students.map(s=><option key={s.id} value={s.id}>{s.student_no} — {s.full_name_ar}</option>)}</select></Field>
      <Field label="العام الدراسي"><select required className="academy-input" value={enroll.academic_year_id} onChange={e=>setEnroll({...enroll,academic_year_id:e.target.value})}>{(core?.years||[]).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
      <Field label="الصف/المستوى"><select required className="academy-input" value={enroll.grade_level_id} onChange={e=>setEnroll({...enroll,grade_level_id:e.target.value,class_section_id:""})}>{(core?.grades||[]).map(x=><option key={x.id} value={x.id}>{x.name_ar} / {x.name_en}</option>)}</select></Field>
      <Field label="المنهج"><select required className="academy-input" value={enroll.curriculum_id} onChange={e=>setEnroll({...enroll,curriculum_id:e.target.value,class_section_id:""})}>{(core?.curricula||[]).map(x=><option key={x.id} value={x.id}>{x.name_ar}</option>)}</select></Field>
      <Field label="الفصل"><select className="academy-input" value={enroll.class_section_id} onChange={e=>setEnroll({...enroll,class_section_id:e.target.value})}><option value="">بدون فصل حاليًا</option>{sections.map(x=><option key={x.id} value={x.id}>{x.section_name}</option>)}</select></Field>
      <button disabled={saving} className="academy-btn-primary w-full"><FaUserGraduate/>{saving?"جاري التسجيل...":"تسجيل الطالب"}</button>
    </form>}
   </div>

   <div>
    <div className="mb-4 flex items-center gap-2 rounded-2xl border bg-white px-3"><FaSearch className="text-slate-400"/><input className="w-full bg-transparent py-3 outline-none" placeholder="بحث بالاسم أو الرقم أو الجوال..." value={search} onChange={e=>setSearch(e.target.value)}/><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{visible.length}</span></div>
    <div className="space-y-3">{visible.map(s=>{const active=(s.school_enrollments||[]).find(e=>e.status==="active");return <div key={s.id} className="academy-card p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div dir="ltr" className="text-xs font-bold text-orange-600">{s.student_no}</div><h3 className="mt-1 text-lg font-extrabold text-[#12345b]">{s.full_name_ar}</h3><div className="text-sm text-slate-500">{s.full_name_en||"—"}</div></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{s.status}</span></div>{active?<div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2"><span><b>العام:</b> {active.school_academic_years?.name||"—"}</span><span><b>المستوى:</b> {active.school_grade_levels?.name_ar||"—"}</span><span><b>المنهج:</b> {active.school_curricula?.name_ar||"—"}</span><span><b>الفصل:</b> {active.school_class_sections?.section_name||"—"}</span></div>:<div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-700">لا يوجد تسجيل أكاديمي نشط.</div>}</div>})}{!visible.length&&<div className="academy-card p-10 text-center text-slate-500">لا يوجد طلاب.</div>}</div>
   </div>
  </div>
 </div>
}
function Field({label,children}){return <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span>{children}</label>}
