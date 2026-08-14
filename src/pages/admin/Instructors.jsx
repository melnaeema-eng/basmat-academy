import {useEffect,useState} from "react";
import {useTranslation} from "react-i18next";
import {FaPen,FaPlus,FaTrash,FaTimes} from "react-icons/fa";
import {AdminPageHeader,AdminCard,StatusBadge} from "../../components/admin/AdminUI";
import {adminDeleteInstructor,adminGetInstructors,adminSaveInstructor} from "../../services/professionalAcademyService";

const empty={full_name:"",title:"",bio:"",photo_url:"",linkedin_url:"",website_url:"",user_id:"",specialties_text:"",is_active:true};

export default function AdminInstructors(){
 const {i18n}=useTranslation();const ar=i18n.language?.startsWith("ar");
 const [items,setItems]=useState([]),[form,setForm]=useState(empty),[editing,setEditing]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 async function load(){try{setLoading(true);setItems(await adminGetInstructors())}catch(e){setError(e.message)}finally{setLoading(false)}}useEffect(()=>{load()},[]);
 function edit(x){setEditing(x.id);setForm({...x,specialties_text:(x.specialties||[]).join(", ")})}
 function reset(){setEditing(null);setForm(empty)}
 async function save(e){e.preventDefault();try{await adminSaveInstructor({...form,id:editing,specialties:form.specialties_text.split(",").map(x=>x.trim()).filter(Boolean)});reset();await load()}catch(e){alert(e.message)}}
 async function remove(id){if(!confirm(ar?"حذف ملف المدرب؟":"Delete instructor profile?"))return;try{await adminDeleteInstructor(id);await load()}catch(e){alert(e.message)}}
 return <div>
  <AdminPageHeader title={ar?"المدربون":"Instructors"} description={ar?"ملفات المدربين وربطها بالدورات.":"Instructor profiles and course association."} actions={<button onClick={reset} className="academy-btn-primary"><FaPlus/>{ar?"مدرب جديد":"New Instructor"}</button>}/>
  {error&&<div className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}
  <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
   <AdminCard className="p-5"><form onSubmit={save} className="space-y-4">
    <div className="flex items-center justify-between"><h2 className="font-extrabold text-[#08284d]">{editing?(ar?"تعديل المدرب":"Edit Instructor"):(ar?"إضافة مدرب":"Add Instructor")}</h2>{editing&&<button type="button" onClick={reset} className="text-slate-400"><FaTimes/></button>}</div>
    <Field label={ar?"الاسم الكامل":"Full Name"}><input required className="academy-input" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></Field>
    <Field label={ar?"المسمى/الصفة":"Professional Title"}><input className="academy-input" value={form.title||""} onChange={e=>setForm({...form,title:e.target.value})}/></Field>
    <Field label={ar?"الصورة (رابط)":"Photo URL"}><input dir="ltr" className="academy-input" value={form.photo_url||""} onChange={e=>setForm({...form,photo_url:e.target.value})}/></Field>
    <Field label={ar?"User ID لحساب المدرب (اختياري)":"Instructor Auth User ID (optional)"}><input dir="ltr" className="academy-input" value={form.user_id||""} onChange={e=>setForm({...form,user_id:e.target.value})}/><p className="mt-1 text-xs text-slate-400">{ar?"اربط هذا الملف بحساب مستخدم ليظهر له Instructor Dashboard.":"Link this profile to an auth user to enable Instructor Dashboard."}</p></Field>

    <Field label={ar?"التخصصات — افصل بفاصلة":"Specialties — comma separated"}><input className="academy-input" value={form.specialties_text||""} onChange={e=>setForm({...form,specialties_text:e.target.value})}/></Field>
    <Field label={ar?"نبذة":"Bio"}><textarea className="academy-input min-h-28" value={form.bio||""} onChange={e=>setForm({...form,bio:e.target.value})}/></Field>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="LinkedIn"><input dir="ltr" className="academy-input" value={form.linkedin_url||""} onChange={e=>setForm({...form,linkedin_url:e.target.value})}/></Field><Field label={ar?"الموقع":"Website"}><input dir="ltr" className="academy-input" value={form.website_url||""} onChange={e=>setForm({...form,website_url:e.target.value})}/></Field></div>
    <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.is_active!==false} onChange={e=>setForm({...form,is_active:e.target.checked})}/>{ar?"نشط":"Active"}</label>
    <button className="academy-btn-primary w-full">{ar?"حفظ":"Save"}</button>
   </form></AdminCard>
   <div className="grid gap-4 md:grid-cols-2">{loading?<AdminCard className="p-10 text-center md:col-span-2">{ar?"جاري التحميل...":"Loading..."}</AdminCard>:items.map(x=><AdminCard key={x.id} className="p-5"><div className="flex gap-4"><img src={x.photo_url||"https://placehold.co/160x160?text=Instructor"} className="h-20 w-20 rounded-2xl object-cover"/><div className="min-w-0 flex-1"><h3 className="font-extrabold text-[#08284d]">{x.full_name}</h3><p className="mt-1 text-sm text-slate-500">{x.title||"—"}</p><div className="mt-2"><StatusBadge status={x.is_active?"active":"draft"}/></div></div></div>{x.specialties?.length>0&&<div className="mt-4 flex flex-wrap gap-2">{x.specialties.map(s=><span key={s} className="rounded-full bg-slate-100 px-3 py-1 text-xs">{s}</span>)}</div>}<p className="mt-4 line-clamp-3 text-sm leading-7 text-slate-600">{x.bio||""}</p><div className="mt-4 flex justify-end gap-2 border-t pt-3"><button onClick={()=>edit(x)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600"><FaPen/></button><button onClick={()=>remove(x.id)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600"><FaTrash/></button></div></AdminCard>)}{!loading&&!items.length&&<AdminCard className="p-10 text-center md:col-span-2">{ar?"لا يوجد مدربون بعد.":"No instructors yet."}</AdminCard>}</div>
  </div>
 </div>
}
function Field({label,children}){return <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span>{children}</label>}
