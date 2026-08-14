import {useEffect,useRef,useState} from "react";
import {useTranslation} from "react-i18next";
import {FaCamera,FaPen,FaPlus,FaTrash,FaTimes,FaUpload} from "react-icons/fa";
import {AdminPageHeader,AdminCard,StatusBadge} from "../../components/admin/AdminUI";
import {adminDeleteInstructor,adminGetInstructors,adminSaveInstructor,uploadInstructorPhoto} from "../../services/professionalAcademyService";

const empty={full_name:"",title:"",bio:"",photo_url:"",linkedin_url:"",website_url:"",user_id:"",specialties_text:"",is_active:true};

export default function AdminInstructors(){
 const {i18n}=useTranslation();const ar=i18n.language?.startsWith("ar");
 const [items,setItems]=useState([]),[form,setForm]=useState(empty),[editing,setEditing]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[photoFile,setPhotoFile]=useState(null),[preview,setPreview]=useState(""),[uploading,setUploading]=useState(false);
 const fileRef=useRef(null);

 async function load(){try{setLoading(true);setError("");setItems(await adminGetInstructors())}catch(e){setError(e.message)}finally{setLoading(false)}}
 useEffect(()=>{load()},[]);

 function edit(x){setEditing(x.id);setForm({...x,specialties_text:(x.specialties||[]).join(", ")});setPreview(x.photo_url||"");setPhotoFile(null)}
 function reset(){setEditing(null);setForm(empty);setPreview("");setPhotoFile(null);if(fileRef.current)fileRef.current.value=""}
 function choosePhoto(e){
   const f=e.target.files?.[0];if(!f)return;
   if(!f.type.startsWith("image/")){alert(ar?"اختر ملف صورة فقط":"Choose an image file only");return}
   if(f.size>5*1024*1024){alert(ar?"حجم الصورة يجب ألا يتجاوز 5MB":"Image must be 5MB or less");return}
   setPhotoFile(f);setPreview(URL.createObjectURL(f));
 }
 async function save(e){
   e.preventDefault();
   try{
     setUploading(true);
     let photoUrl=form.photo_url||null;
     if(photoFile){
       const uploaded=await uploadInstructorPhoto(photoFile,editing||"new");
       photoUrl=uploaded.publicUrl;
     }
     await adminSaveInstructor({...form,id:editing,photo_url:photoUrl,specialties:form.specialties_text.split(",").map(x=>x.trim()).filter(Boolean)});
     reset();await load();
   }catch(e){alert(e.message)}finally{setUploading(false)}
 }
 async function remove(id){if(!confirm(ar?"حذف ملف المدرب؟":"Delete instructor profile?"))return;try{await adminDeleteInstructor(id);await load()}catch(e){alert(e.message)}}

 return <div>
  <AdminPageHeader title={ar?"المدربون":"Instructors"} description={ar?"إدارة الملف المهني والصورة والتعريف وربطه بالدورات.":"Manage instructor profile, photo, bio and course association."} actions={<button onClick={reset} className="academy-btn-primary"><FaPlus/>{ar?"مدرب جديد":"New Instructor"}</button>}/>
  {error&&<div className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}
  <div className="grid gap-6 xl:grid-cols-[460px_1fr]">
   <AdminCard className="p-5"><form onSubmit={save} className="space-y-4">
    <div className="flex items-center justify-between"><h2 className="font-extrabold text-[#08284d]">{editing?(ar?"تعديل ملف المدرب":"Edit Instructor Profile"):(ar?"إضافة مدرب":"Add Instructor")}</h2>{editing&&<button type="button" onClick={reset} className="text-slate-400"><FaTimes/></button>}</div>

    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm">
          {preview?<img src={preview} className="h-full w-full object-cover" alt="Instructor preview"/>:<div className="flex h-full items-center justify-center text-3xl text-slate-300"><FaCamera/></div>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-extrabold text-[#08284d]">{ar?"صورة المدرب":"Instructor Photo"}</div>
          <p className="mt-1 text-xs leading-6 text-slate-500">{ar?"ارفع JPG أو PNG حتى 5MB. ستظهر الصورة في صفحة المدرب وبطاقاته.":"Upload JPG/PNG up to 5MB. It will appear on instructor cards and profile."}</p>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={choosePhoto} className="mt-3 block w-full text-xs"/>
        </div>
      </div>
    </div>

    <Field label={ar?"الاسم الكامل":"Full Name"}><input required className="academy-input" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></Field>
    <Field label={ar?"المسمى/الصفة المهنية":"Professional Title"}><input className="academy-input" value={form.title||""} onChange={e=>setForm({...form,title:e.target.value})} placeholder={ar?"مثال: مهندس اتصالات وتقنية معلومات":"e.g. Telecom & ICT Engineer"}/></Field>
    <Field label={ar?"التعريف بالمدرب":"Instructor Bio"}><textarea required className="academy-input min-h-36" value={form.bio||""} onChange={e=>setForm({...form,bio:e.target.value})} placeholder={ar?"اكتب الخبرة، المؤهلات، المجالات التي يدرّسها، وأبرز الخبرات العملية...":"Write experience, qualifications, teaching areas and practical background..."}/><div className="mt-1 text-end text-xs text-slate-400">{(form.bio||"").length} {ar?"حرف":"characters"}</div></Field>
    <Field label={ar?"التخصصات — افصل بفاصلة":"Specialties — comma separated"}><input className="academy-input" value={form.specialties_text||""} onChange={e=>setForm({...form,specialties_text:e.target.value})}/></Field>

    <Field label={ar?"User ID لحساب المدرب (اختياري)":"Instructor Auth User ID (optional)"}><input dir="ltr" className="academy-input" value={form.user_id||""} onChange={e=>setForm({...form,user_id:e.target.value})}/><p className="mt-1 text-xs text-slate-400">{ar?"يستخدم فقط لربط الملف بلوحة المدرب.":"Used only to link this profile to Instructor Dashboard."}</p></Field>

    <div className="grid gap-3 sm:grid-cols-2"><Field label="LinkedIn"><input dir="ltr" className="academy-input" value={form.linkedin_url||""} onChange={e=>setForm({...form,linkedin_url:e.target.value})}/></Field><Field label={ar?"الموقع":"Website"}><input dir="ltr" className="academy-input" value={form.website_url||""} onChange={e=>setForm({...form,website_url:e.target.value})}/></Field></div>
    <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.is_active!==false} onChange={e=>setForm({...form,is_active:e.target.checked})}/>{ar?"نشط ويظهر للزوار":"Active and visible publicly"}</label>
    <button disabled={uploading} className="academy-btn-primary w-full"><FaUpload/>{uploading?(ar?"جاري الحفظ...":"Saving..."):(ar?"حفظ ملف المدرب":"Save Instructor")}</button>
   </form></AdminCard>

   <div className="grid gap-4 md:grid-cols-2">{loading?<AdminCard className="p-10 text-center md:col-span-2">{ar?"جاري التحميل...":"Loading..."}</AdminCard>:items.map(x=><AdminCard key={x.id} className="overflow-hidden">
     <div className="flex gap-4 p-5"><img src={x.photo_url||"https://placehold.co/200x200?text=Instructor"} className="h-24 w-24 rounded-2xl object-cover"/><div className="min-w-0 flex-1"><h3 className="text-lg font-extrabold text-[#08284d]">{x.full_name}</h3><p className="mt-1 text-sm font-bold text-orange-600">{x.title||"—"}</p><div className="mt-2"><StatusBadge status={x.is_active?"active":"draft"}/></div></div></div>
     {x.bio?<div className="border-t bg-slate-50/70 px-5 py-4"><div className="mb-1 text-xs font-extrabold text-slate-400">{ar?"التعريف":"BIO"}</div><p className="line-clamp-4 text-sm leading-7 text-slate-600">{x.bio}</p></div>:<div className="border-t bg-amber-50 px-5 py-3 text-xs font-bold text-amber-700">{ar?"لا يوجد تعريف للمدرب بعد.":"Instructor bio is missing."}</div>}
     {x.specialties?.length>0&&<div className="flex flex-wrap gap-2 px-5 py-3">{x.specialties.map(s=><span key={s} className="rounded-full bg-slate-100 px-3 py-1 text-xs">{s}</span>)}</div>}
     <div className="flex justify-end gap-2 border-t p-4"><button onClick={()=>edit(x)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600"><FaPen/></button><button onClick={()=>remove(x.id)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600"><FaTrash/></button></div>
   </AdminCard>)}{!loading&&!items.length&&<AdminCard className="p-10 text-center md:col-span-2">{ar?"لا يوجد مدربون بعد.":"No instructors yet."}</AdminCard>}</div>
  </div>
 </div>
}
function Field({label,children}){return <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span>{children}</label>}
