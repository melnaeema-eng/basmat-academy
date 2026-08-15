import {useEffect,useRef,useState} from "react";
import {useTranslation} from "react-i18next";
import {FaBullhorn,FaEnvelope,FaPlus,FaTrash,FaTimes,FaUsers} from "react-icons/fa";
import {supabase} from "../../services/supabase";
import {AdminCard,AdminPageHeader} from "../../components/admin/AdminUI";
import {adminGetAnnouncements,deleteAnnouncement,saveAnnouncement,sendPendingAnnouncementEmails} from "../../services/finalProductionService";

const empty={course_id:"",title:"",body:"",is_published:true,audience_scope:"course",send_email:true};

export default function Announcements(){
 const{i18n}=useTranslation();const ar=i18n.language?.startsWith("ar");
 const[rows,setRows]=useState([]),[courses,setCourses]=useState([]),[form,setForm]=useState(empty),[showForm,setShowForm]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState("");
 const formRef=useRef(null);

 async function load(){
  try{
   setError("");
   const[a,c]=await Promise.all([adminGetAnnouncements(),supabase.from("courses").select("id,title").order("title")]);
   if(c.error)throw c.error;
   setRows(a||[]);setCourses(c.data||[]);
  }catch(e){setError(e.message)}
 }
 useEffect(()=>{load()},[]);

 function openForm(){setShowForm(true);setTimeout(()=>formRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),50)}

 async function submit(e){
  e.preventDefault();
  if(form.audience_scope==="course"&&!form.course_id){alert(ar?"اختر الدورة":"Choose course");return}
  try{
   setSaving(true);
   const result=await saveAnnouncement(form);
   let message=ar?"تم نشر الإعلان":"Announcement published";
   if(form.send_email){
     const queued=Number(result?.broadcast?.queued||0);
     message+=ar?`\nتمت إضافة ${queued} رسالة إلى قائمة البريد.`:`\n${queued} email(s) queued.`;
     if(queued>0){
       try{
         const sent=await sendPendingAnnouncementEmails();
         message+=ar?`\nتم إرسال ${sent?.sent||0} الآن، والفشل ${sent?.failed||0}.`:`\nSent now: ${sent?.sent||0}, failed: ${sent?.failed||0}.`;
         if(queued>(sent?.sent||0)+(sent?.failed||0)){
           message+=ar?"\nبقية الرسائل ما زالت Pending ويمكن إرسالها من صفحة البريد.":"\nRemaining messages stay Pending and can be sent from Email Notifications.";
         }
       }catch(err){
         message+=ar?`\nتم حفظ البريد في القائمة، لكن الإرسال المباشر تعذر: ${err.message}`:`\nEmails were queued, but direct sending failed: ${err.message}`;
       }
     }
   }
   alert(message);
   setForm(empty);setShowForm(false);await load();
  }catch(e){alert(e.message)}finally{setSaving(false)}
 }

 return <div>
  <AdminPageHeader title={ar?"الإعلانات والبث البريدي":"Announcements & Email Broadcast"} description={ar?"انشر لطلاب دورة محددة أو لكل حسابات الأكاديمية، مع إرسال نسخة بالبريد الإلكتروني.":"Publish to one course or all Academy accounts, with optional email delivery."} actions={<button onClick={openForm} className="academy-btn-primary"><FaPlus/>{ar?"نشر إعلان جديد":"New Announcement"}</button>}/>
  {error&&<div className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}

  {!showForm&&<AdminCard className="mb-6 border-orange-200 bg-orange-50/50 p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-xl text-orange-600"><FaBullhorn/></div><div><h2 className="font-extrabold text-[#08284d]">{ar?"إعلان دورة أم إعلان عام؟":"Course or Global Announcement?"}</h2><p className="mt-1 text-sm text-slate-600">{ar?"يمكنك الوصول لطلاب الدورة فقط، أو لكل المسجلين في الأكاديمية حتى غير المسجلين في الدورة.":"Reach course learners only, or every Academy account including users not enrolled in the course."}</p></div></div><button onClick={openForm} className="academy-btn-dark shrink-0"><FaPlus/>{ar?"ابدأ الآن":"Start Now"}</button></div></AdminCard>}

  {showForm&&<div ref={formRef} className="mb-7 scroll-mt-24"><AdminCard className="border-orange-200 p-5 shadow-lg">
   <div className="mb-5 flex items-center justify-between"><div><h2 className="text-xl font-extrabold text-[#08284d]">{ar?"نشر إعلان جديد":"Publish New Announcement"}</h2><p className="mt-1 text-sm text-slate-500">{ar?"حدد الجمهور ثم اختر ما إذا كنت تريد إرسال نسخة بالبريد.":"Choose the audience and whether to send an email copy."}</p></div><button onClick={()=>{setShowForm(false);setForm(empty)}} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><FaTimes/></button></div>

   <form onSubmit={submit} className="space-y-4">
    <div>
     <span className="mb-2 block text-sm font-bold">{ar?"نطاق الإعلان":"Audience"}</span>
     <div className="grid gap-3 md:grid-cols-2">
      <label className={`cursor-pointer rounded-2xl border p-4 ${form.audience_scope==="course"?"border-orange-300 bg-orange-50":"border-slate-200"}`}><input type="radio" name="audience" className="me-2" checked={form.audience_scope==="course"} onChange={()=>setForm({...form,audience_scope:"course"})}/><span className="font-extrabold text-[#08284d]">{ar?"طلاب الدورة فقط":"Course Students Only"}</span><p className="mt-2 text-xs leading-6 text-slate-500">{ar?"المسجلون فعليًا في الدورة المختارة.":"Only users actively enrolled in the selected course."}</p></label>
      <label className={`cursor-pointer rounded-2xl border p-4 ${form.audience_scope==="all_registered"?"border-orange-300 bg-orange-50":"border-slate-200"}`}><input type="radio" name="audience" className="me-2" checked={form.audience_scope==="all_registered"} onChange={()=>setForm({...form,audience_scope:"all_registered",course_id:""})}/><span className="font-extrabold text-[#08284d]">{ar?"كل المسجلين في الأكاديمية":"All Academy Accounts"}</span><p className="mt-2 text-xs leading-6 text-slate-500">{ar?"يشمل المسجلين وغير المسجلين في أي دورة، طالما لديهم حساب وبريد في الأكاديمية.":"Includes enrolled and not-enrolled users as long as they have an Academy account/email."}</p></label>
     </div>
    </div>

    {form.audience_scope==="course"&&<label className="block"><span className="mb-1.5 block text-sm font-bold">{ar?"الدورة":"Course"}</span><select required className="academy-input" value={form.course_id} onChange={e=>setForm({...form,course_id:e.target.value})}><option value="">— {ar?"اختر الدورة":"Choose course"} —</option>{courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>}

    <label className="block"><span className="mb-1.5 block text-sm font-bold">{ar?"عنوان الإعلان":"Announcement Title"}</span><input required className="academy-input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
    <label className="block"><span className="mb-1.5 block text-sm font-bold">{ar?"محتوى الإعلان":"Announcement Message"}</span><textarea required className="academy-input min-h-40" value={form.body} onChange={e=>setForm({...form,body:e.target.value})}/></label>

    <div className="grid gap-3 md:grid-cols-2">
     <label className="flex items-center gap-3 rounded-xl border bg-slate-50 p-4 text-sm font-bold"><input type="checkbox" checked={form.is_published} onChange={e=>setForm({...form,is_published:e.target.checked})}/><FaBullhorn className="text-orange-500"/>{ar?"نشر داخل الأكاديمية":"Publish in Academy"}</label>
     <label className="flex items-center gap-3 rounded-xl border bg-slate-50 p-4 text-sm font-bold"><input type="checkbox" checked={form.send_email} onChange={e=>setForm({...form,send_email:e.target.checked})}/><FaEnvelope className="text-blue-600"/>{ar?"إرسال نسخة بالبريد الإلكتروني":"Send Email Copy"}</label>
    </div>

    <div className="rounded-xl bg-blue-50 p-4 text-xs leading-6 text-blue-800"><FaUsers className="me-2 inline"/>{form.audience_scope==="all_registered"?(ar?"سيتم إرسال البريد لكل حساب في الأكاديمية لديه بريد إلكتروني، وليس فقط طلاب دورة معينة.":"Email will go to every Academy account with an email, not just course learners."):(ar?"سيتم إرسال البريد فقط للمسجلين النشطين في الدورة المختارة.":"Email will go only to active learners in the selected course.")}</div>

    <button disabled={saving} className="academy-btn-primary w-full"><FaBullhorn/>{saving?(ar?"جاري النشر والإرسال...":"Publishing & Sending..."):(ar?"نشر الإعلان":"Publish Announcement")}</button>
   </form>
  </AdminCard></div>}

  <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-extrabold text-[#08284d]">{ar?"الإعلانات المنشورة":"Published Announcements"}</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">{rows.length}</span></div>
  <div className="grid gap-4 lg:grid-cols-2">{rows.map(x=><AdminCard key={x.id} className="p-5"><div className="flex items-start justify-between gap-4"><div><div className="text-xs font-bold text-orange-600">{x.audience_scope==="all_registered"?(ar?"كل الأكاديمية":"All Academy"):(x.courses?.title||"—")}</div><h3 className="mt-1 font-extrabold text-[#08284d]">{x.title}</h3></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{ar?"منشور":"Published"}</span></div><p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{x.body}</p><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-slate-100 px-2.5 py-1">{x.send_email?(ar?`بريد: ${x.email_queued_count||0}`:`Email: ${x.email_queued_count||0}`):(ar?"بدون بريد":"No Email")}</span></div><div className="mt-4 flex justify-end border-t pt-3"><button onClick={async()=>{if(confirm(ar?"حذف الإعلان؟":"Delete announcement?")){await deleteAnnouncement(x.id);await load()}}} className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600"><FaTrash/>{ar?"حذف":"Delete"}</button></div></AdminCard>)}{!rows.length&&<AdminCard className="p-10 text-center text-slate-500 lg:col-span-2">{ar?"لا توجد إعلانات منشورة بعد.":"No announcements published yet."}</AdminCard>}</div>
 </div>
}
