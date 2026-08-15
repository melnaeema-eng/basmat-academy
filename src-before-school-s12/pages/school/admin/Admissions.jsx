import {useEffect,useState} from "react";
import {FaCheck,FaEdit,FaPlus,FaSearch,FaTimes,FaUserFriends} from "react-icons/fa";
import {enrollSchoolAdmission,findSchoolParent,getSchoolAdmissions,getSchoolCore,reviewSchoolAdmission,saveSchoolAdmission} from "../../../services/schoolService";

const fresh=()=>({
 id:null,academic_year_id:"",curriculum_id:"",grade_level_id:"",
 student_name_ar:"",student_name_en:"",gender:"male",birth_date:"",
 nationality:"سوداني",previous_school:"",
 parent_id:"",parent_name:"",parent_national_id:"",parent_email:"",parent_phone:"",
 sibling_detected:false,sibling_discount_percent:0,address:"",notes:""
});

export default function SchoolAdmissions(){
 const[core,setCore]=useState(null),[rows,setRows]=useState([]),[form,setForm]=useState(fresh()),[matches,setMatches]=useState([]),[searching,setSearching]=useState(false);

 async function load(){
  const[c,r]=await Promise.all([getSchoolCore(),getSchoolAdmissions()]);
  setCore(c);setRows(r);
  setForm(f=>({...f,
   academic_year_id:f.academic_year_id||c.years.find(x=>x.is_current)?.id||"",
   curriculum_id:f.curriculum_id||c.curricula[0]?.id||"",
   grade_level_id:f.grade_level_id||c.grades[0]?.id||""
  }));
 }
 useEffect(()=>{load().catch(e=>alert(e.message))},[]);

 function reset(){
  setMatches([]);
  setForm({...fresh(),
   academic_year_id:core?.years.find(x=>x.is_current)?.id||"",
   curriculum_id:core?.curricula[0]?.id||"",
   grade_level_id:core?.grades[0]?.id||""
  });
 }

 async function searchParent(){
  if(!form.parent_email&&!form.parent_phone&&!form.parent_national_id){
   alert("أدخل بريد أو جوال أو هوية ولي الأمر أولًا");return;
  }
  try{
   setSearching(true);
   const r=await findSchoolParent({email:form.parent_email,phone:form.parent_phone,national_id:form.parent_national_id});
   setMatches(r);
   if(!r.length)alert("لا يوجد ولي أمر مطابق. سيتم إنشاء ولي أمر جديد عند اعتماد التسجيل.");
  }catch(e){alert(e.message)}finally{setSearching(false)}
 }

 function chooseParent(p){
  setForm(v=>({...v,
   parent_id:p.parent_id,
   parent_name:p.full_name||v.parent_name,
   parent_email:p.email||v.parent_email,
   parent_phone:p.phone||v.parent_phone,
   parent_national_id:p.national_id||v.parent_national_id,
   sibling_detected:Number(p.active_children_count||0)>0,
   sibling_discount_percent:Number(p.active_children_count||0)>0?10:0
  }));
  setMatches([]);
 }

 async function save(e){
  e.preventDefault();
  if(!form.parent_email.trim()){alert("بريد ولي الأمر إلزامي.");return}
  await saveSchoolAdmission(form);
  reset();await load();alert("تم حفظ طلب القبول");
 }

 async function review(id,status){
  const note=prompt("ملاحظة الإدارة (اختياري)")||"";
  await reviewSchoolAdmission(id,status,note);await load();
 }

 async function enroll(x){
  if(!confirm(`تحويل ${x.student_name_ar} إلى طالب مسجل فعليًا؟`))return;
  try{
   const r=await enrollSchoolAdmission(x.id);
   await load();
   alert(!r?.fee_plan_found
    ? (r?.sibling_discount_percent===10
      ? "تم تسجيل الطالب بنجاح وربطه بولي الأمر الموجود. خصم الأشقاء 10% محفوظ، وخطة الرسوم غير موجودة حاليًا؛ ستُحسب قيمة الخصم عند إنشاء خطة الرسوم."
      : "تم تسجيل الطالب بنجاح. خطة الرسوم غير موجودة حاليًا ويمكن إضافتها لاحقًا من المالية.")
    : (r?.sibling_discount_percent===10
      ? "تم تسجيل الطالب وربطه بولي الأمر الموجود وتطبيق خصم الأشقاء 10% على الرسوم الدراسية."
      : "تم تسجيل الطالب وربطه بولي الأمر."));
  }catch(e){alert(e.message)}
 }

 function edit(x){
  setMatches([]);
  setForm({
   ...fresh(),...x,
   birth_date:x.birth_date||"",
   student_name_en:x.student_name_en||"",
   nationality:x.nationality||"",
   previous_school:x.previous_school||"",
   parent_id:x.parent_id||"",
   parent_national_id:x.parent_national_id||"",
   parent_email:x.parent_email||"",
   parent_phone:x.parent_phone||"",
   address:x.address||"",notes:x.notes||""
  });
  window.scrollTo({top:0,behavior:"smooth"});
 }

 return <div>
  <h1 className="text-3xl font-extrabold text-[#12345b]">القبول والتسجيل</h1>
  <p className="mt-2 text-slate-500">يربط الأشقاء بنفس ولي الأمر تلقائيًا ويطبق خصم 10% على الرسوم الدراسية للابن الإضافي.</p>

  <div className="mt-6 grid gap-6 xl:grid-cols-[470px_1fr]">
   <form onSubmit={save} className="academy-card space-y-4 p-5">
    <h2 className="font-extrabold text-[#12345b]">{form.id?"تعديل الطلب":"طلب قبول جديد"}</h2>

    <F l="اسم الطالب بالعربية"><input required className="academy-input" value={form.student_name_ar} onChange={e=>setForm({...form,student_name_ar:e.target.value})}/></F>
    <F l="اسم الطالب بالإنجليزية"><input className="academy-input" value={form.student_name_en} onChange={e=>setForm({...form,student_name_en:e.target.value})}/></F>

    <div className="grid grid-cols-2 gap-3">
     <F l="الجنس"><select className="academy-input" value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}><option value="male">ذكر</option><option value="female">أنثى</option></select></F>
     <F l="تاريخ الميلاد"><input type="date" className="academy-input" value={form.birth_date} onChange={e=>setForm({...form,birth_date:e.target.value})}/></F>
    </div>

    <F l="المنهج"><select className="academy-input" value={form.curriculum_id} onChange={e=>setForm({...form,curriculum_id:e.target.value})}>{(core?.curricula||[]).map(x=><option key={x.id} value={x.id}>{x.name_ar}</option>)}</select></F>
    <F l="الصف / المستوى"><select className="academy-input" value={form.grade_level_id} onChange={e=>setForm({...form,grade_level_id:e.target.value})}>{(core?.grades||[]).map(x=><option key={x.id} value={x.id}>{x.name_ar} / {x.name_en}</option>)}</select></F>

    <div className="rounded-2xl border bg-slate-50 p-4">
     <div className="flex items-center gap-2 font-extrabold text-[#12345b]"><FaUserFriends/>ولي الأمر والأسرة</div>
     <div className="mt-3 space-y-3">
      <F l="اسم ولي الأمر"><input required className="academy-input" value={form.parent_name} onChange={e=>setForm({...form,parent_name:e.target.value,parent_id:"",sibling_detected:false,sibling_discount_percent:0})}/></F>
      <F l="البريد الإلكتروني *"><input required type="email" className="academy-input" value={form.parent_email} onChange={e=>setForm({...form,parent_email:e.target.value,parent_id:"",sibling_detected:false,sibling_discount_percent:0})}/></F>
      <div className="grid grid-cols-2 gap-3">
       <F l="الجوال"><input required className="academy-input" value={form.parent_phone} onChange={e=>setForm({...form,parent_phone:e.target.value,parent_id:"",sibling_detected:false,sibling_discount_percent:0})}/></F>
       <F l="الهوية"><input className="academy-input" value={form.parent_national_id} onChange={e=>setForm({...form,parent_national_id:e.target.value,parent_id:"",sibling_detected:false,sibling_discount_percent:0})}/></F>
      </div>
      <button type="button" onClick={searchParent} disabled={searching} className="academy-btn-dark w-full"><FaSearch/>{searching?"جاري البحث...":"بحث عن ولي أمر موجود"}</button>

      {matches.length>0&&<div className="space-y-2">{matches.map(p=><button type="button" key={p.parent_id} onClick={()=>chooseParent(p)} className="w-full rounded-xl border bg-white p-3 text-right hover:border-orange-400"><b>{p.full_name}</b><div className="mt-1 text-xs text-slate-500">{p.email||"—"} • {p.phone||"—"}</div><div className="mt-1 text-xs font-bold text-orange-600">الأبناء الحاليون: {p.active_children_count}</div></button>)}</div>}

      {form.parent_id&&<div className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">سيتم استخدام ولي الأمر الموجود في قاعدة البيانات، ولن ينشأ سجل مكرر.</div>}
      {form.sibling_detected&&<div className="rounded-xl bg-orange-50 p-3 text-sm font-bold text-orange-700">تم اكتشاف أخ/أخت مسجل: خصم الأشقاء 10% على Tuition فقط.</div>}
     </div>
    </div>

    <F l="المدرسة السابقة"><input className="academy-input" value={form.previous_school} onChange={e=>setForm({...form,previous_school:e.target.value})}/></F>
    <F l="ملاحظات"><textarea className="academy-input min-h-20" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></F>
    <button className="academy-btn-primary w-full"><FaPlus/>حفظ الطلب</button>
   </form>

   <div className="space-y-3">{rows.map(x=><div key={x.id} className="academy-card p-5">
    <div className="flex flex-wrap justify-between gap-3">
     <div>
      <div className="text-xs font-bold text-orange-600">{x.application_no}</div>
      <h3 className="font-extrabold text-[#12345b]">{x.student_name_ar}</h3>
      <div className="text-sm text-slate-500">{x.school_curricula?.name_ar} • {x.school_grade_levels?.name_ar}</div>
      <div className="mt-1 text-xs">{x.parent_name} • {x.parent_phone}</div>
      {Number(x.sibling_discount_percent||0)>0&&<div className="mt-2 inline-block rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">Sibling Discount {x.sibling_discount_percent}%</div>}
     </div>
     <div className="flex items-start gap-2">
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{x.status}</span>
      <button onClick={()=>edit(x)} className="p-2 text-orange-600"><FaEdit/></button>
     </div>
    </div>

    {["new","under_review"].includes(x.status)&&<div className="mt-4 flex flex-wrap gap-2">
     <button onClick={()=>review(x.id,"under_review")} className="academy-btn-dark">قيد المراجعة</button>
     <button onClick={()=>review(x.id,"accepted")} className="academy-btn-primary"><FaCheck/>قبول</button>
     <button onClick={()=>review(x.id,"rejected")} className="rounded-xl bg-red-50 px-4 py-2 font-bold text-red-600"><FaTimes/>رفض</button>
    </div>}

    {x.status==="accepted"&&<button onClick={()=>enroll(x)} className="academy-btn-primary mt-4"><FaCheck/>تحويل إلى طالب مسجل</button>}
   </div>)}</div>
  </div>
 </div>
}
function F({l,children}){return <label className="block"><span className="mb-1.5 block text-sm font-bold">{l}</span>{children}</label>}
