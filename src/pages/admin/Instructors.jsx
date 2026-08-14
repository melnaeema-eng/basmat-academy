import {useEffect,useMemo,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {FaBook,FaCamera,FaCheck,FaExternalLinkAlt,FaPen,FaPlus,FaSearch,FaTrash,FaTimes,FaUpload} from "react-icons/fa";
import {AdminPageHeader,AdminCard,StatusBadge} from "../../components/admin/AdminUI";
import {
  adminCreateCourseForInstructor,
  adminDeleteInstructor,
  adminGetCoursesForInstructorManagement,
  adminGetInstructors,
  adminSaveInstructor,
  adminSetInstructorCourses,
  uploadInstructorPhoto,
} from "../../services/professionalAcademyService";

const empty={full_name:"",title:"",bio:"",photo_url:"",linkedin_url:"",website_url:"",user_id:"",specialties_text:"",is_active:true};
const emptyCourse={title:"",description:"",category:"",price:"0",level:"",duration:"",course_type:"recorded",status:"Draft"};

export default function AdminInstructors(){
 const {i18n}=useTranslation();const ar=i18n.language?.startsWith("ar");
 const [items,setItems]=useState([]),[courses,setCourses]=useState([]),[form,setForm]=useState(empty),[editing,setEditing]=useState(null),[selectedCourses,setSelectedCourses]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[photoFile,setPhotoFile]=useState(null),[preview,setPreview]=useState(""),[saving,setSaving]=useState(false),[courseSearch,setCourseSearch]=useState(""),[newCourse,setNewCourse]=useState(emptyCourse),[showNewCourse,setShowNewCourse]=useState(false),[courseBusy,setCourseBusy]=useState(false);
 const fileRef=useRef(null);

 async function load(){
   try{
     setLoading(true);setError("");
     const [instructors,allCourses]=await Promise.all([adminGetInstructors(),adminGetCoursesForInstructorManagement()]);
     setItems(instructors);setCourses(allCourses);
     if(editing){
       setSelectedCourses(allCourses.filter(c=>c.instructor_id===editing).map(c=>c.id));
     }
   }catch(e){setError(e.message)}finally{setLoading(false)}
 }
 useEffect(()=>{load()},[]);

 function edit(x){
   setEditing(x.id);
   setForm({...x,specialties_text:(x.specialties||[]).join(", ")});
   setPreview(x.photo_url||"");
   setPhotoFile(null);
   setSelectedCourses(courses.filter(c=>c.instructor_id===x.id).map(c=>c.id));
   setShowNewCourse(false);setNewCourse(emptyCourse);
   window.scrollTo({top:0,behavior:"smooth"});
 }
 function reset(){
   setEditing(null);setForm(empty);setPreview("");setPhotoFile(null);setSelectedCourses([]);setShowNewCourse(false);setNewCourse(emptyCourse);
   if(fileRef.current)fileRef.current.value="";
 }
 function choosePhoto(e){
   const f=e.target.files?.[0];if(!f)return;
   if(!f.type.startsWith("image/")){alert(ar?"اختر ملف صورة فقط":"Choose an image file only");return}
   if(f.size>5*1024*1024){alert(ar?"حجم الصورة يجب ألا يتجاوز 5MB":"Image must be 5MB or less");return}
   setPhotoFile(f);setPreview(URL.createObjectURL(f));
 }

 async function saveProfile(e){
   e.preventDefault();
   try{
     setSaving(true);
     let photoUrl=form.photo_url||null;
     if(photoFile){
       const uploaded=await uploadInstructorPhoto(photoFile,editing||"new");
       photoUrl=uploaded.publicUrl;
     }
     const saved=await adminSaveInstructor({
       ...form,
       id:editing,
       photo_url:photoUrl,
       specialties:form.specialties_text.split(",").map(x=>x.trim()).filter(Boolean),
       // Existing Auth link is preserved but hidden from this UI.
       user_id:form.user_id||null,
     });

     setEditing(saved.id);
     setForm({...saved,specialties_text:(saved.specialties||[]).join(", ")});
     setPreview(saved.photo_url||photoUrl||"");
     setPhotoFile(null);
     await adminSetInstructorCourses(saved,selectedCourses);
     await load();
     alert(ar?"تم حفظ ملف المدرب وربط الدورات":"Instructor profile and courses saved");
   }catch(e){alert(e.message)}finally{setSaving(false)}
 }

 async function saveCourseLinks(){
   const instructor=items.find(x=>x.id===editing)||form;
   if(!editing){alert(ar?"احفظ ملف المدرب أولًا":"Save the instructor first");return}
   try{
     setCourseBusy(true);
     await adminSetInstructorCourses({...instructor,id:editing,full_name:form.full_name},selectedCourses);
     await load();
     alert(ar?"تم تحديث الدورات المرتبطة":"Linked courses updated");
   }catch(e){alert(e.message)}finally{setCourseBusy(false)}
 }

 async function createCourse(){
   if(!editing){alert(ar?"احفظ المدرب أولًا قبل إضافة دورة":"Save the instructor before creating a course");return}
   if(!newCourse.title.trim()){alert(ar?"اكتب اسم الدورة":"Enter the course title");return}
   try{
     setCourseBusy(true);
     const created=await adminCreateCourseForInstructor({id:editing,full_name:form.full_name},newCourse);
     setSelectedCourses(v=>[...new Set([...v,created.id])]);
     setNewCourse(emptyCourse);setShowNewCourse(false);
     await load();
     alert(ar?"تم إنشاء الدورة وربطها بالمدرب. ستجدها الآن في إدارة الدورات.":"Course created and linked. It is now available in Course Management.");
   }catch(e){alert(e.message)}finally{setCourseBusy(false)}
 }

 async function remove(id){
   if(!confirm(ar?"حذف ملف المدرب؟ لن يتم حذف الدورات المرتبطة.":"Delete instructor profile? Linked courses will not be deleted."))return;
   try{await adminDeleteInstructor(id);if(editing===id)reset();await load()}catch(e){alert(e.message)}
 }

 function toggleCourse(id){
   setSelectedCourses(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);
 }

 const visibleCourses=useMemo(()=>{
   const q=courseSearch.trim().toLowerCase();
   return courses.filter(c=>!q||[c.title,c.category,c.instructor].filter(Boolean).join(" ").toLowerCase().includes(q));
 },[courses,courseSearch]);

 const linkedCount=selectedCourses.length;

 return <div>
  <AdminPageHeader title={ar?"إدارة المدربين والدورات":"Instructors & Courses"} description={ar?"إدارة الملف المهني والصورة والتعريف وربط الدورات الحالية أو إنشاء دورة جديدة مباشرة.":"Manage instructor profiles and link existing courses or create new courses directly."} actions={<button onClick={reset} className="academy-btn-primary"><FaPlus/>{ar?"مدرب جديد":"New Instructor"}</button>}/>
  {error&&<div className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}

  <div className="grid gap-6 xl:grid-cols-[470px_1fr]">
   <div className="space-y-6">
    <AdminCard className="p-5"><form onSubmit={saveProfile} className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="font-extrabold text-[#08284d]">{editing?(ar?"تعديل ملف المدرب":"Edit Instructor Profile"):(ar?"إضافة مدرب":"Add Instructor")}</h2>{editing&&<p className="mt-1 text-xs text-slate-400">{ar?`مرتبط حاليًا بـ ${linkedCount} دورة`:`Currently linked to ${linkedCount} course(s)`}</p>}</div>{editing&&<button type="button" onClick={reset} className="text-slate-400"><FaTimes/></button>}</div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <div className="flex items-center gap-4">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm">{preview?<img src={preview} className="h-full w-full object-contain" alt="Instructor preview"/>:<div className="flex h-full items-center justify-center text-3xl text-slate-300"><FaCamera/></div>}</div>
          <div className="min-w-0 flex-1"><div className="font-extrabold text-[#08284d]">{ar?"صورة المدرب":"Instructor Photo"}</div><p className="mt-1 text-xs leading-6 text-slate-500">{ar?"JPG / PNG / WEBP حتى 5MB":"JPG / PNG / WEBP up to 5MB"}</p><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={choosePhoto} className="mt-3 block w-full text-xs"/></div>
        </div>
      </div>

      <Field label={ar?"الاسم الكامل":"Full Name"}><input required className="academy-input" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></Field>
      <Field label={ar?"المسمى/الصفة المهنية":"Professional Title"}><input className="academy-input" value={form.title||""} onChange={e=>setForm({...form,title:e.target.value})}/></Field>
      <Field label={ar?"التعريف بالمدرب":"Instructor Bio"}><textarea required className="academy-input min-h-36" value={form.bio||""} onChange={e=>setForm({...form,bio:e.target.value})} placeholder={ar?"الخبرة والمؤهلات والمجالات التي يدرّسها...":"Experience, qualifications and teaching areas..."}/></Field>
      <Field label={ar?"التخصصات — افصل بفاصلة":"Specialties — comma separated"}><input className="academy-input" value={form.specialties_text||""} onChange={e=>setForm({...form,specialties_text:e.target.value})}/></Field>

      <div className="grid gap-3 sm:grid-cols-2"><Field label="LinkedIn"><input dir="ltr" className="academy-input" value={form.linkedin_url||""} onChange={e=>setForm({...form,linkedin_url:e.target.value})}/></Field><Field label={ar?"الموقع":"Website"}><input dir="ltr" className="academy-input" value={form.website_url||""} onChange={e=>setForm({...form,website_url:e.target.value})}/></Field></div>
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.is_active!==false} onChange={e=>setForm({...form,is_active:e.target.checked})}/>{ar?"نشط ويظهر للزوار":"Active and visible publicly"}</label>
      <button disabled={saving} className="academy-btn-primary w-full"><FaUpload/>{saving?(ar?"جاري الحفظ...":"Saving..."):(ar?"حفظ ملف المدرب والدورات":"Save Instructor & Courses")}</button>
    </form></AdminCard>

    {editing&&<AdminCard className="p-5">
      <div className="flex items-center justify-between gap-3"><div><h3 className="font-extrabold text-[#08284d]">{ar?"إضافة دورة جديدة لهذا المدرب":"Create New Course for Instructor"}</h3><p className="mt-1 text-xs leading-6 text-slate-500">{ar?"تُنشأ كمسودة وتظهر فورًا في إدارة الدورات، ثم يمكنك فتحها لإكمال الصورة والوصف والدروس.":"Created as Draft and appears immediately in Course Management for full editing."}</p></div><button onClick={()=>setShowNewCourse(v=>!v)} className="rounded-xl bg-orange-50 px-3 py-2 font-bold text-orange-700"><FaPlus/></button></div>
      {showNewCourse&&<div className="mt-4 space-y-3 border-t pt-4">
        <Field label={ar?"اسم الدورة":"Course Title"}><input className="academy-input" value={newCourse.title} onChange={e=>setNewCourse({...newCourse,title:e.target.value})}/></Field>
        <div className="grid gap-3 sm:grid-cols-2"><Field label={ar?"التصنيف":"Category"}><input className="academy-input" value={newCourse.category} onChange={e=>setNewCourse({...newCourse,category:e.target.value})}/></Field><Field label={ar?"السعر":"Price"}><input dir="ltr" type="number" min="0" className="academy-input" value={newCourse.price} onChange={e=>setNewCourse({...newCourse,price:e.target.value})}/></Field></div>
        <div className="grid gap-3 sm:grid-cols-2"><Field label={ar?"المستوى":"Level"}><input className="academy-input" value={newCourse.level} onChange={e=>setNewCourse({...newCourse,level:e.target.value})}/></Field><Field label={ar?"النوع":"Type"}><select className="academy-input" value={newCourse.course_type} onChange={e=>setNewCourse({...newCourse,course_type:e.target.value})}><option value="recorded">{ar?"مسجل":"Recorded"}</option><option value="live">{ar?"مباشر":"Live"}</option><option value="hybrid">{ar?"هجين":"Hybrid"}</option></select></Field></div>
        <Field label={ar?"وصف مبدئي":"Initial Description"}><textarea className="academy-input min-h-20" value={newCourse.description} onChange={e=>setNewCourse({...newCourse,description:e.target.value})}/></Field>
        <button type="button" disabled={courseBusy} onClick={createCourse} className="academy-btn-dark w-full"><FaPlus/>{ar?"إنشاء الدورة وربطها":"Create & Link Course"}</button>
      </div>}
    </AdminCard>}
   </div>

   <div className="space-y-6">
    {editing&&<AdminCard className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold text-[#08284d]">{ar?"الدورات المرتبطة بالمدرب":"Instructor Courses"}</h2><p className="mt-1 text-sm text-slate-500">{ar?"اختر من الدورات الموجودة. إذا كانت الدورة مرتبطة بمدرب آخر فاختيارها سينقلها لهذا المدرب.":"Choose from existing courses. Selecting a course owned by another instructor will reassign it."}</p></div><button disabled={courseBusy} onClick={saveCourseLinks} className="academy-btn-primary"><FaCheck/>{ar?"حفظ الربط":"Save Links"}</button></div>
      <div className="mt-4 flex items-center gap-2 rounded-xl border bg-slate-50 px-3"><FaSearch className="text-slate-400"/><input className="w-full bg-transparent py-3 outline-none" value={courseSearch} onChange={e=>setCourseSearch(e.target.value)} placeholder={ar?"بحث في الدورات":"Search courses"}/><span className="text-xs font-bold text-slate-500">{linkedCount}</span></div>
      <div className="mt-4 max-h-[620px] space-y-2 overflow-y-auto pe-1">{visibleCourses.map(c=>{const checked=selectedCourses.includes(c.id);const other=c.instructor_id&&c.instructor_id!==editing;return <label key={c.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${checked?"border-orange-300 bg-orange-50":"border-slate-200 bg-white"}`}><input type="checkbox" checked={checked} onChange={()=>toggleCourse(c.id)} className="h-4 w-4"/><img src={c.image||"https://placehold.co/120x70?text=Course"} className="academy-course-admin-thumb !h-12 !w-20"/><div className="min-w-0 flex-1"><div className="truncate font-bold text-[#08284d]">{c.title}</div><div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500"><span>{c.category||"—"}</span><span>{c.status||"Published"}</span>{other&&<span className="font-bold text-red-500">{ar?`حاليًا: ${c.instructor||"مدرب آخر"}`:`Currently: ${c.instructor||"Other instructor"}`}</span>}</div></div><Link to={`/admin/edit-course/${c.id}`} onClick={e=>e.stopPropagation()} className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600" title={ar?"فتح الدورة":"Open course"}><FaExternalLinkAlt/></Link></label>})}{!visibleCourses.length&&<div className="p-8 text-center text-sm text-slate-500">{ar?"لا توجد دورات مطابقة.":"No matching courses."}</div>}</div>
    </AdminCard>}

    <div>
      <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-extrabold text-[#08284d]">{ar?"ملفات المدربين":"Instructor Profiles"}</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">{items.length}</span></div>
      <div className="grid gap-4 md:grid-cols-2">{loading?<AdminCard className="p-10 text-center md:col-span-2">{ar?"جاري التحميل...":"Loading..."}</AdminCard>:items.map(x=>{const count=courses.filter(c=>c.instructor_id===x.id).length;return <AdminCard key={x.id} className={`overflow-hidden ${editing===x.id?"ring-2 ring-orange-300":""}`}>
       <div className="flex gap-4 p-5"><img src={x.photo_url||"https://placehold.co/200x200?text=Instructor"} className="h-24 w-24 rounded-2xl object-contain"/><div className="min-w-0 flex-1"><h3 className="text-lg font-extrabold text-[#08284d]">{x.full_name}</h3><p className="mt-1 text-sm font-bold text-orange-600">{x.title||"—"}</p><div className="mt-2 flex items-center gap-2"><StatusBadge status={x.is_active?"active":"draft"}/><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700"><FaBook className="me-1 inline"/>{count}</span></div></div></div>
       {x.bio&&<div className="border-t bg-slate-50/70 px-5 py-4"><p className="line-clamp-3 text-sm leading-7 text-slate-600">{x.bio}</p></div>}
       <div className="flex justify-end gap-2 border-t p-4"><button onClick={()=>edit(x)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600"><FaPen/></button><button onClick={()=>remove(x.id)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600"><FaTrash/></button></div>
      </AdminCard>})}</div>
    </div>
   </div>
  </div>
 </div>
}

function Field({label,children}){return <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span>{children}</label>}
