import {useEffect,useRef,useState} from "react";
import {useTranslation} from "react-i18next";
import {FaBullhorn,FaPlus,FaTrash,FaTimes} from "react-icons/fa";
import {supabase} from "../../services/supabase";
import {AdminCard,AdminPageHeader} from "../../components/admin/AdminUI";
import {adminGetAnnouncements,deleteAnnouncement,saveAnnouncement} from "../../services/finalProductionService";

const empty={course_id:"",title:"",body:"",is_published:true};

export default function Announcements(){
 const{i18n}=useTranslation();const ar=i18n.language?.startsWith("ar");
 const[rows,setRows]=useState([]),[courses,setCourses]=useState([]),[form,setForm]=useState(empty),[showForm,setShowForm]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState("");
 const formRef=useRef(null);

 async function load(){
  try{
   setError("");
   const[a,c]=await Promise.all([
    adminGetAnnouncements(),
    supabase.from("courses").select("id,title").order("title")
   ]);
   if(c.error)throw c.error;
   setRows(a||[]);setCourses(c.data||[]);
  }catch(e){setError(e.message)}
 }
 useEffect(()=>{load()},[]);

 function openForm(){
  setShowForm(true);
  setTimeout(()=>formRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),50);
 }

 async function submit(e){
  e.preventDefault();
  try{
   setSaving(true);
   await saveAnnouncement(form);
   setForm(empty);setShowForm(false);
   await load();
   alert(ar?"تم نشر الإعلان":"Announcement published");
  }catch(e){alert(e.message)}finally{setSaving(false)}
 }

 return <div>
  <AdminPageHeader
   title={ar?"إعلانات الدورات":"Course Announcements"}
   description={ar?"انشر إعلانًا لطلاب دورة محددة. يظهر الإعلان للطلاب المسجلين داخل صفحة تعلم الدورة.":"Publish announcements to students enrolled in a specific course."}
   actions={<button onClick={openForm} className="academy-btn-primary"><FaPlus/>{ar?"نشر إعلان جديد":"New Announcement"}</button>}
  />

  {error&&<div className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}

  {!showForm&&<AdminCard className="mb-6 border-orange-200 bg-orange-50/50 p-5">
   <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex gap-3">
     <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-xl text-orange-600"><FaBullhorn/></div>
     <div><h2 className="font-extrabold text-[#08284d]">{ar?"هل تريد نشر إعلان؟":"Want to publish an announcement?"}</h2><p className="mt-1 text-sm text-slate-600">{ar?"اختر الدورة، اكتب العنوان والمحتوى، ثم اضغط نشر.":"Choose a course, enter the title and message, then publish."}</p></div>
    </div>
    <button onClick={openForm} className="academy-btn-dark shrink-0"><FaPlus/>{ar?"ابدأ الآن":"Start Now"}</button>
   </div>
  </AdminCard>}

  {showForm&&<div ref={formRef} className="mb-7 scroll-mt-24">
   <AdminCard className="border-orange-200 p-5 shadow-lg">
    <div className="mb-5 flex items-center justify-between">
     <div><h2 className="text-xl font-extrabold text-[#08284d]">{ar?"نشر إعلان جديد":"Publish New Announcement"}</h2><p className="mt-1 text-sm text-slate-500">{ar?"سيظهر فقط للطلاب المسجلين في الدورة المختارة.":"Visible only to enrolled students in the selected course."}</p></div>
     <button onClick={()=>{setShowForm(false);setForm(empty)}} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><FaTimes/></button>
    </div>
    <form onSubmit={submit} className="space-y-4">
     <label className="block"><span className="mb-1.5 block text-sm font-bold">{ar?"الدورة":"Course"}</span><select required className="academy-input" value={form.course_id} onChange={e=>setForm({...form,course_id:e.target.value})}><option value="">— {ar?"اختر الدورة":"Choose course"} —</option>{courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
     <label className="block"><span className="mb-1.5 block text-sm font-bold">{ar?"عنوان الإعلان":"Announcement Title"}</span><input required className="academy-input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
     <label className="block"><span className="mb-1.5 block text-sm font-bold">{ar?"محتوى الإعلان":"Announcement Message"}</span><textarea required className="academy-input min-h-36" value={form.body} onChange={e=>setForm({...form,body:e.target.value})}/></label>
     <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.is_published} onChange={e=>setForm({...form,is_published:e.target.checked})}/>{ar?"نشر الآن":"Publish now"}</label>
     <button disabled={saving} className="academy-btn-primary w-full"><FaBullhorn/>{saving?(ar?"جاري النشر...":"Publishing..."):(ar?"نشر الإعلان":"Publish Announcement")}</button>
    </form>
   </AdminCard>
  </div>}

  <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-extrabold text-[#08284d]">{ar?"الإعلانات المنشورة":"Published Announcements"}</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">{rows.length}</span></div>
  <div className="grid gap-4 lg:grid-cols-2">
   {rows.map(x=><AdminCard key={x.id} className="p-5">
    <div className="flex items-start justify-between gap-4">
     <div><div className="text-xs font-bold text-orange-600">{x.courses?.title||"—"}</div><h3 className="mt-1 font-extrabold text-[#08284d]">{x.title}</h3></div>
     <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{ar?"منشور":"Published"}</span>
    </div>
    <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{x.body}</p>
    <div className="mt-4 flex justify-end border-t pt-3"><button onClick={async()=>{if(confirm(ar?"حذف الإعلان؟":"Delete announcement?")){await deleteAnnouncement(x.id);await load()}}} className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600"><FaTrash/>{ar?"حذف":"Delete"}</button></div>
   </AdminCard>)}
   {!rows.length&&<AdminCard className="p-10 text-center text-slate-500 lg:col-span-2">{ar?"لا توجد إعلانات منشورة بعد.":"No announcements published yet."}</AdminCard>}
  </div>
 </div>
}
