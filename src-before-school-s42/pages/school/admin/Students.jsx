import {useEffect,useMemo,useState} from "react";
import {FaEdit,FaPlus,FaSave,FaSearch,FaTimes,FaUserGraduate} from "react-icons/fa";
import {getSchoolCore,getSchoolStudents,saveSchoolEnrollment,saveSchoolStudent} from "../../../services/schoolService";


const LOGIN_REQUIRED_CODES=new Set(["P4","P5","P6","M1","M2","M3","S1","S2","S3"]);

const newStudent=()=>({
  id:null,
  auth_user_id:"",
  has_login:false,
  full_name_ar:"",
  full_name_en:"",
  gender:"",
  date_of_birth:"",
  nationality:"Sudanese",
  phone:"",
  email:"",
  status:"active",
  admission_date:new Date().toISOString().slice(0,10),
  notes:""
});
const emptyEnrollment={student_id:"",academic_year_id:"",grade_level_id:"",curriculum_id:"",class_section_id:"",status:"active"};

export default function SchoolStudents(){
 const[students,setStudents]=useState([]),[core,setCore]=useState(null),[form,setForm]=useState(newStudent()),[enroll,setEnroll]=useState(emptyEnrollment),[search,setSearch]=useState(""),[saving,setSaving]=useState(false),[mode,setMode]=useState("student");
 async function load(){
  const[c,s]=await Promise.all([getSchoolCore(),getSchoolStudents()]);
  setCore(c);setStudents(s);
  setEnroll(e=>({...e,academic_year_id:e.academic_year_id||c.years.find(x=>x.is_current)?.id||"",grade_level_id:e.grade_level_id||c.grades[0]?.id||"",curriculum_id:e.curriculum_id||c.curricula[0]?.id||""}));
 }
 useEffect(()=>{load().catch(e=>alert(e.message))},[]);

 function startNew(){setMode("student");setForm(newStudent());window.scrollTo({top:0,behavior:"smooth"})}
 function editStudent(s){
  setMode("student");
  setForm({
    id:s.id,
    auth_user_id:s.auth_user_id||"",
    has_login:!!s.auth_user_id||!!s.email,
    full_name_ar:s.full_name_ar||"",
    full_name_en:s.full_name_en||"",
    gender:s.gender||"",
    date_of_birth:s.date_of_birth||"",
    nationality:s.nationality||"Sudanese",
    phone:s.phone||"",
    email:s.email||"",
    status:s.status||"active",
    admission_date:s.admission_date||new Date().toISOString().slice(0,10),
    notes:s.notes||""
  });
  window.scrollTo({top:0,behavior:"smooth"});
 }

 async function saveStudentForm(e){
  e.preventDefault();
  if(form.has_login&&!form.email.trim()){alert("البريد الإلكتروني إلزامي عندما يكون للطالب حساب دخول.");return}
  try{
   setSaving(true);
   await saveSchoolStudent({...form,email:form.email.trim()||null,auth_user_id:form.auth_user_id.trim()||null});
   setForm(newStudent());
   await load();
   alert(form.id?"تم تحديث بيانات الطالب":"تم حفظ الطالب");
  }catch(e){alert(e.message)}finally{setSaving(false)}
 }

 async function saveEnrollmentForm(e){
  e.preventDefault();
  const grade=core?.grades?.find(g=>g.id===enroll.grade_level_id);
  const student=students.find(st=>st.id===enroll.student_id);
  const loginRequired=LOGIN_REQUIRED_CODES.has(grade?.code);

  if(loginRequired && !student?.email?.trim()){
    alert("ابتداءً من الصف الرابع الابتدائي، البريد الإلكتروني للطالب إلزامي. عدّل بيانات الطالب وأضف البريد أولًا.");
    return;
  }

  if(loginRequired && !student?.auth_user_id){
    const ok=confirm("هذا المستوى يتطلب حساب دخول للطالب. البريد موجود ولكن Auth User ID غير مربوط بعد. هل تريد حفظ التسجيل الآن وربط الحساب لاحقًا؟");
    if(!ok)return;
  }

  try{
    setSaving(true);
    await saveSchoolEnrollment(enroll);
    setEnroll(v=>({...v,student_id:"",class_section_id:""}));
    await load();
    alert("تم تسجيل الطالب أكاديميًا");
  }catch(e){alert(e.message)}finally{setSaving(false)}
 }

 const visible=useMemo(()=>students.filter(s=>[s.student_no,s.full_name_ar,s.full_name_en,s.phone,s.email].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase())),[students,search]);
 const sections=(core?.sections||[]).filter(x=>!enroll.grade_level_id||x.grade_level_id===enroll.grade_level_id).filter(x=>!enroll.curriculum_id||x.curriculum_id===enroll.curriculum_id);

 return <div>
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-extrabold text-[#12345b]">الطلاب والتسجيل الأكاديمي</h1><p className="mt-2 text-slate-500">إضافة وتعديل بيانات الطالب وربطه بالعام والصف والمنهج والفصل.</p><div className="mt-3 rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">سياسة الدخول: البريد اختياري حتى الصف الثالث الابتدائي، وإلزامي من الصف الرابع الابتدائي فأعلى.</div></div><div className="flex gap-2"><button onClick={startNew} className={`rounded-xl px-4 py-2 font-bold ${mode==="student"?"bg-orange-500 text-white":"bg-white text-[#12345b]"}`}>طالب جديد</button><button onClick={()=>setMode("enroll")} className={`rounded-xl px-4 py-2 font-bold ${mode==="enroll"?"bg-orange-500 text-white":"bg-white text-[#12345b]"}`}>تسجيل طالب</button></div></div>

  <div className="grid gap-6 xl:grid-cols-[460px_1fr]">
   <div>
    {mode==="student"?<form onSubmit={saveStudentForm} className="academy-card space-y-4 p-5">
      <div className="flex items-center justify-between"><h2 className="font-extrabold text-[#12345b]">{form.id?"تعديل بيانات الطالب":"إضافة طالب"}</h2>{form.id&&<button type="button" onClick={startNew} className="rounded-lg bg-slate-100 p-2 text-slate-500"><FaTimes/></button>}</div>
      <Field label="الاسم بالعربية"><input required className="academy-input" value={form.full_name_ar} onChange={e=>setForm({...form,full_name_ar:e.target.value})}/></Field>
      <Field label="الاسم بالإنجليزية"><input className="academy-input" value={form.full_name_en} onChange={e=>setForm({...form,full_name_en:e.target.value})}/></Field>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="النوع"><select className="academy-input" value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}><option value="">—</option><option value="male">ذكر</option><option value="female">أنثى</option></select></Field><Field label="تاريخ الميلاد"><input type="date" className="academy-input" value={form.date_of_birth} onChange={e=>setForm({...form,date_of_birth:e.target.value})}/></Field></div>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="الجوال"><input dir="ltr" className="academy-input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><Field label={form.has_login?"البريد الإلكتروني *":"البريد الإلكتروني"}><input dir="ltr" type="email" required={form.has_login} className="academy-input" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field></div>

      <label className="flex items-start gap-3 rounded-xl border bg-slate-50 p-4"><input type="checkbox" className="mt-1" checked={form.has_login} onChange={e=>setForm({...form,has_login:e.target.checked})}/><span><b className="text-[#12345b]">لديه حساب دخول للبوابة</b><span className="mt-1 block text-xs leading-6 text-slate-500">البريد اختياري للروضة والصفوف 1–3 ابتدائي. ابتداءً من الصف الرابع الابتدائي يصبح البريد وحساب الدخول مطلوبين للطالب.</span></span></label>

      {form.has_login&&<Field label="Auth User ID (بعد إنشاء حساب Supabase)"><input dir="ltr" className="academy-input" value={form.auth_user_id} onChange={e=>setForm({...form,auth_user_id:e.target.value})}/></Field>}
      <Field label="الحالة"><select className="academy-input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="active">نشط</option><option value="inactive">غير نشط</option><option value="graduated">متخرج</option><option value="withdrawn">منسحب</option></select></Field>
      <Field label="ملاحظات"><textarea className="academy-input min-h-24" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></Field>
      <button disabled={saving} className="academy-btn-primary w-full">{form.id?<FaSave/>:<FaPlus/>}{saving?"جاري الحفظ...":form.id?"حفظ التعديلات":"حفظ الطالب"}</button>
    </form>:<form onSubmit={saveEnrollmentForm} className="academy-card space-y-4 p-5">
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
    <div className="space-y-3">{visible.map(s=>{const active=(s.school_enrollments||[]).find(e=>e.status==="active");return <div key={s.id} className="academy-card p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div dir="ltr" className="text-xs font-bold text-orange-600">{s.student_no}</div><h3 className="mt-1 text-lg font-extrabold text-[#12345b]">{s.full_name_ar}</h3><div className="text-sm text-slate-500">{s.full_name_en||"—"}</div><div dir="ltr" className="mt-1 text-xs text-slate-400">{s.email||"بدون بريد"}</div></div><div className="flex items-center gap-2"><button onClick={()=>editStudent(s)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600" title="تعديل"><FaEdit/></button><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{s.status}</span></div></div>{active?<div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2"><span><b>العام:</b> {active.school_academic_years?.name||"—"}</span><span><b>المستوى:</b> {active.school_grade_levels?.name_ar||"—"}</span><span><b>المنهج:</b> {active.school_curricula?.name_ar||"—"}</span><span><b>الفصل:</b> {active.school_class_sections?.section_name||"—"}</span></div>:<div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-700">لا يوجد تسجيل أكاديمي نشط.</div>}</div>})}{!visible.length&&<div className="academy-card p-10 text-center text-slate-500">لا يوجد طلاب.</div>}</div>
   </div>
  </div>
 </div>
}
function Field({label,children}){return <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span>{children}</label>}
