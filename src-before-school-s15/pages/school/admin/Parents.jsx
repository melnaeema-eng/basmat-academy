import {useEffect,useState} from "react";
import {FaEdit,FaLink,FaPlus,FaSave,FaTimes,FaUsers} from "react-icons/fa";
import {getSchoolParents,getSchoolStudents,linkParentStudent,saveSchoolParent} from "../../../services/schoolService";

const newParent=()=>({id:null,auth_user_id:"",full_name:"",relation_default:"ولي أمر",national_id:"",phone:"",whatsapp:"",email:"",occupation:"",address:"",is_active:true});
export default function SchoolParents(){
 const[parents,setParents]=useState([]),[students,setStudents]=useState([]),[form,setForm]=useState(newParent()),[link,setLink]=useState({parent_id:"",student_id:"",relation:"ولي أمر",is_primary:true}),[saving,setSaving]=useState(false);
 async function load(){const[p,s]=await Promise.all([getSchoolParents(),getSchoolStudents()]);setParents(p);setStudents(s)}
 useEffect(()=>{load().catch(e=>alert(e.message))},[]);

 function startNew(){setForm(newParent());window.scrollTo({top:0,behavior:"smooth"})}
 function editParent(p){
  setForm({
    id:p.id,
    auth_user_id:p.auth_user_id||"",
    full_name:p.full_name||"",
    relation_default:p.relation_default||"ولي أمر",
    national_id:p.national_id||"",
    phone:p.phone||"",
    whatsapp:p.whatsapp||"",
    email:p.email||"",
    occupation:p.occupation||"",
    address:p.address||"",
    is_active:p.is_active!==false
  });
  window.scrollTo({top:0,behavior:"smooth"});
 }

 async function save(e){
  e.preventDefault();
  if(!form.email.trim()){alert("البريد الإلكتروني إلزامي لولي الأمر لأنه يستخدم Parent Portal.");return}
  try{
   setSaving(true);
   await saveSchoolParent({...form,email:form.email.trim(),auth_user_id:form.auth_user_id.trim()||null});
   const editing=!!form.id;
   setForm(newParent());
   await load();
   alert(editing?"تم تحديث بيانات ولي الأمر":"تم حفظ ولي الأمر");
  }catch(e){alert(e.message)}finally{setSaving(false)}
 }

 function editRelationship(parent,row){
  setLink({parent_id:parent.id,student_id:row.student_id,relation:row.relation||"ولي أمر",is_primary:!!row.is_primary});
  window.scrollTo({top:0,behavior:"smooth"});
 }
 async function saveLink(e){
  e.preventDefault();
  try{setSaving(true);await linkParentStudent(link);setLink(v=>({...v,student_id:""}));await load();alert("تم ربط ولي الأمر بالطالب")}catch(e){alert(e.message)}finally{setSaving(false)}
 }

 return <div>
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-extrabold text-[#12345b]">أولياء الأمور</h1><p className="mt-2 text-slate-500">إضافة وتعديل ولي الأمر وربط أكثر من ابن أو ابنة بحساب واحد.</p></div><button onClick={startNew} className="academy-btn-primary"><FaPlus/>ولي أمر جديد</button></div>

  <div className="mt-6 grid gap-6 xl:grid-cols-[440px_1fr]">
   <div className="space-y-6">
    <form onSubmit={save} className="academy-card space-y-4 p-5">
      <div className="flex items-center justify-between"><h2 className="font-extrabold text-[#12345b]">{form.id?"تعديل بيانات ولي الأمر":"إضافة ولي أمر"}</h2>{form.id&&<button type="button" onClick={startNew} className="rounded-lg bg-slate-100 p-2 text-slate-500"><FaTimes/></button>}</div>
      <Field label="الاسم الكامل"><input required className="academy-input" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></Field>
      <Field label="البريد الإلكتروني *"><input dir="ltr" required type="email" className="academy-input" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/><p className="mt-1 text-xs font-bold text-orange-600">إلزامي حتى يستطيع ولي الأمر الدخول إلى Parent Portal.</p></Field>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="الجوال"><input dir="ltr" className="academy-input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><Field label="واتساب"><input dir="ltr" className="academy-input" value={form.whatsapp} onChange={e=>setForm({...form,whatsapp:e.target.value})}/></Field></div>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="رقم الهوية"><input className="academy-input" value={form.national_id} onChange={e=>setForm({...form,national_id:e.target.value})}/></Field><Field label="المهنة"><input className="academy-input" value={form.occupation} onChange={e=>setForm({...form,occupation:e.target.value})}/></Field></div>
      <Field label="العنوان"><textarea className="academy-input min-h-20" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></Field>
      <Field label="Auth User ID (بعد إنشاء حساب الدخول)"><input dir="ltr" className="academy-input" value={form.auth_user_id} onChange={e=>setForm({...form,auth_user_id:e.target.value})}/></Field>
      <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form,is_active:e.target.checked})}/>حساب ولي الأمر نشط</label>
      <button disabled={saving} className="academy-btn-primary w-full">{form.id?<FaSave/>:<FaPlus/>}{form.id?"حفظ التعديلات":"حفظ ولي الأمر"}</button>
    </form>

    <form onSubmit={saveLink} className="academy-card space-y-4 p-5">
      <h2 className="font-extrabold text-[#12345b]">ربط ولي الأمر بالطالب</h2>
      <Field label="ولي الأمر"><select required className="academy-input" value={link.parent_id} onChange={e=>setLink({...link,parent_id:e.target.value})}><option value="">اختر</option>{parents.map(x=><option key={x.id} value={x.id}>{x.full_name} — {x.email}</option>)}</select></Field>
      <Field label="الطالب"><select required className="academy-input" value={link.student_id} onChange={e=>setLink({...link,student_id:e.target.value})}><option value="">اختر</option>{students.map(x=><option key={x.id} value={x.id}>{x.student_no} — {x.full_name_ar}</option>)}</select></Field>
      <Field label="صلة القرابة"><input className="academy-input" value={link.relation} onChange={e=>setLink({...link,relation:e.target.value})}/></Field>
      <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={link.is_primary} onChange={e=>setLink({...link,is_primary:e.target.checked})}/>ولي الأمر الأساسي</label>
      <button disabled={saving} className="academy-btn-dark w-full"><FaLink/>حفظ الربط</button>
    </form>
   </div>

   <div className="grid gap-4 md:grid-cols-2">{parents.map(p=><div key={p.id} className="academy-card p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-extrabold text-[#12345b]">{p.full_name}</h3><div dir="ltr" className="mt-1 text-sm text-slate-500">{p.email}</div><div dir="ltr" className="mt-1 text-xs text-slate-400">{p.phone||"—"}</div></div><div className="flex items-center gap-2"><button onClick={()=>editParent(p)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600" title="تعديل"><FaEdit/></button><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><FaUsers/></div></div></div><div className="mt-4 border-t pt-3"><div className="text-xs font-extrabold text-slate-400">الأبناء المرتبطون</div><div className="mt-2 space-y-2">{(p.school_parent_students||[]).map(l=><div key={l.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm"><div><b>{l.school_students?.full_name_ar}</b><div className="mt-1 text-xs text-slate-500">{l.relation} • {l.school_students?.student_no}</div></div><button onClick={()=>editRelationship(p,l)} className="rounded-lg bg-orange-50 p-2 text-orange-600"><FaEdit/></button></div>)}{!(p.school_parent_students||[]).length&&<div className="text-sm text-slate-400">لا يوجد ربط بعد.</div>}</div></div></div>)}</div>
  </div>
 </div>
}
function Field({label,children}){return <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span>{children}</label>}
