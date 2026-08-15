import {useEffect,useMemo,useState} from "react";
import {FaBook,FaDownload,FaEdit,FaPlus,FaSave,FaSearch,FaTimes,FaUpload} from "react-icons/fa";
import {getSchoolBooks,getSchoolCore,getSchoolSubjects,saveSchoolBook} from "../../../services/schoolService";
import {uploadSchoolBookCover,uploadSchoolBookFile} from "../../../services/storageService";

const fresh=()=>({
 id:null,title_ar:"",title_en:"",subject_id:"",grade_level_id:"",curriculum_id:"",academic_year_id:"",
 book_type:"textbook",file_url:"",storage_path:"",cover_url:"",file_size_bytes:null,mime_type:"",
 version:"",description:"",is_downloadable:true,is_published:true,audience:"student"
});

const typeLabels={
 textbook:"كتاب الطالب",
 workbook:"كتاب النشاط",
 teacher_guide:"دليل المعلم",
 reference:"مرجع",
 worksheet:"ورقة عمل",
 other:"أخرى"
};

export default function SchoolLibraryAdmin(){
 const[core,setCore]=useState(null),[subjects,setSubjects]=useState([]),[rows,setRows]=useState([]),[form,setForm]=useState(fresh()),[query,setQuery]=useState(""),[busy,setBusy]=useState(false),[uploading,setUploading]=useState(false);
 async function load(){
  const[c,s,b]=await Promise.all([getSchoolCore(),getSchoolSubjects(),getSchoolBooks()]);
  setCore(c);setSubjects(s);setRows(b);
  setForm(f=>({...f,academic_year_id:f.academic_year_id||c.years.find(x=>x.is_current)?.id||"",grade_level_id:f.grade_level_id||c.grades[0]?.id||"",curriculum_id:f.curriculum_id||c.curricula[0]?.id||"",subject_id:f.subject_id||s[0]?.id||""}));
 }
 useEffect(()=>{load().catch(e=>alert(e.message))},[]);

 function reset(){
  setForm({...fresh(),academic_year_id:core?.years.find(x=>x.is_current)?.id||"",grade_level_id:core?.grades[0]?.id||"",curriculum_id:core?.curricula[0]?.id||"",subject_id:subjects[0]?.id||""})
 }

 function edit(x){
  setForm({
   id:x.id,title_ar:x.title_ar||"",title_en:x.title_en||"",subject_id:x.subject_id||"",grade_level_id:x.grade_level_id||"",curriculum_id:x.curriculum_id||"",academic_year_id:x.academic_year_id||"",
   book_type:x.book_type||"textbook",file_url:x.file_url||"",storage_path:x.storage_path||"",cover_url:x.cover_url||"",file_size_bytes:x.file_size_bytes||null,mime_type:x.mime_type||"",
   version:x.version||"",description:x.description||"",is_downloadable:x.is_downloadable!==false,is_published:x.is_published!==false,audience:x.audience||"student"
  });
  window.scrollTo({top:0,behavior:"smooth"});
 }

 async function uploadBook(file){
  if(!file)return;
  const allowed=["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.openxmlformats-officedocument.presentationml.presentation"];
  if(file.size>100*1024*1024){alert("الحد الأقصى للملف 100 MB");return}
  if(file.type&&!allowed.includes(file.type)){alert("المسموح حاليًا PDF / DOCX / PPTX");return}
  try{
   setUploading(true);
   const r=await uploadSchoolBookFile(file);
   setForm(v=>({...v,file_url:r.url,storage_path:r.path,file_size_bytes:r.size,mime_type:r.mime_type||""}));
  }catch(e){alert(e.message)}finally{setUploading(false)}
 }

 async function uploadCover(file){
  if(!file)return;
  try{
   setUploading(true);
   const r=await uploadSchoolBookCover(file);
   setForm(v=>({...v,cover_url:r.url}));
  }catch(e){alert(e.message)}finally{setUploading(false)}
 }

 async function save(e){
  e.preventDefault();
  if(!form.file_url)return alert("ارفع ملف الكتاب أولًا");
  try{
   setBusy(true);
   const editing=!!form.id;
   await saveSchoolBook(form);
   reset();await load();
   alert(editing?"تم تحديث الكتاب":"تم إضافة الكتاب للمكتبة");
  }catch(e){alert(e.message)}finally{setBusy(false)}
 }

 const visible=useMemo(()=>rows.filter(x=>{
  const q=query.trim().toLowerCase();
  if(!q)return true;
  return [x.title_ar,x.title_en,x.school_subjects?.name_ar,x.school_grade_levels?.name_ar,x.school_curricula?.name_ar].filter(Boolean).join(" ").toLowerCase().includes(q);
 }),[rows,query]);

 return <div>
  <div className="flex flex-wrap items-end justify-between gap-3">
   <div><h1 className="text-3xl font-extrabold text-[#12345b]">المكتبة الرقمية</h1><p className="mt-2 text-slate-500">رفع الكتب والملفات وتصنيفها حسب المنهج والصف والمادة.</p></div>
   {form.id&&<button onClick={reset} className="academy-btn-dark"><FaTimes/>إلغاء التعديل</button>}
  </div>

  <div className="mt-6 grid gap-6 xl:grid-cols-[470px_1fr]">
   <form onSubmit={save} className="academy-card space-y-4 p-5">
    <h2 className="font-extrabold text-[#12345b]">{form.id?"تعديل الكتاب":"إضافة كتاب/ملف"}</h2>
    <Field l="العنوان بالعربية"><input required className="academy-input" value={form.title_ar} onChange={e=>setForm({...form,title_ar:e.target.value})}/></Field>
    <Field l="العنوان بالإنجليزية"><input className="academy-input" value={form.title_en} onChange={e=>setForm({...form,title_en:e.target.value})}/></Field>
    <div className="grid grid-cols-2 gap-3">
     <Field l="نوع المحتوى"><select className="academy-input" value={form.book_type} onChange={e=>setForm({...form,book_type:e.target.value})}>{Object.entries(typeLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></Field>
     <Field l="الجمهور"><select className="academy-input" value={form.audience} onChange={e=>setForm({...form,audience:e.target.value})}><option value="student">الطلاب</option><option value="teacher">المعلمون</option><option value="both">الطلاب والمعلمون</option></select></Field>
    </div>
    <Field l="العام"><select className="academy-input" value={form.academic_year_id} onChange={e=>setForm({...form,academic_year_id:e.target.value})}>{(core?.years||[]).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
    <Field l="المنهج"><select className="academy-input" value={form.curriculum_id} onChange={e=>setForm({...form,curriculum_id:e.target.value})}>{(core?.curricula||[]).map(x=><option key={x.id} value={x.id}>{x.name_ar}</option>)}</select></Field>
    <Field l="الصف / المستوى"><select className="academy-input" value={form.grade_level_id} onChange={e=>setForm({...form,grade_level_id:e.target.value})}>{(core?.grades||[]).map(x=><option key={x.id} value={x.id}>{x.name_ar} / {x.name_en}</option>)}</select></Field>
    <Field l="المادة"><select className="academy-input" value={form.subject_id} onChange={e=>setForm({...form,subject_id:e.target.value})}>{subjects.map(x=><option key={x.id} value={x.id}>{x.name_ar} / {x.name_en}</option>)}</select></Field>
    <Field l="الإصدار"><input className="academy-input" placeholder="2026 / v1" value={form.version} onChange={e=>setForm({...form,version:e.target.value})}/></Field>
    <Field l="الوصف"><textarea className="academy-input min-h-24" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></Field>

    <div className="rounded-xl border border-dashed p-4">
     <div className="font-bold text-[#12345b]">ملف الكتاب</div>
     <input type="file" accept=".pdf,.docx,.pptx" className="mt-3 block w-full text-sm" onChange={e=>uploadBook(e.target.files?.[0])}/>
     <div className="mt-2 text-xs text-slate-500">PDF / DOCX / PPTX — حتى 100MB</div>
     {form.file_url&&<div className="mt-2 text-xs font-bold text-emerald-700">تم رفع الملف ✓</div>}
    </div>

    <div className="rounded-xl border border-dashed p-4">
     <div className="font-bold text-[#12345b]">غلاف الكتاب (اختياري)</div>
     <input type="file" accept="image/*" className="mt-3 block w-full text-sm" onChange={e=>uploadCover(e.target.files?.[0])}/>
     {form.cover_url&&<img src={form.cover_url} alt="" className="mt-3 h-28 rounded-lg object-cover"/>}
    </div>

    <label className="flex gap-2 font-bold"><input type="checkbox" checked={form.is_published} onChange={e=>setForm({...form,is_published:e.target.checked})}/>منشور</label>
    <label className="flex gap-2 font-bold"><input type="checkbox" checked={form.is_downloadable} onChange={e=>setForm({...form,is_downloadable:e.target.checked})}/>يسمح بالتنزيل</label>
    <button disabled={busy||uploading} className="academy-btn-primary w-full">{form.id?<FaSave/>:<FaPlus/>}{uploading?"جاري الرفع...":form.id?"حفظ التعديلات":"إضافة للمكتبة"}</button>
   </form>

   <div>
    <div className="mb-4 flex items-center gap-2 rounded-2xl border bg-white px-3">
     <FaSearch className="text-slate-400"/><input className="w-full bg-transparent py-3 outline-none" placeholder="بحث في الكتب..." value={query} onChange={e=>setQuery(e.target.value)}/>
    </div>
    <div className="grid gap-4 md:grid-cols-2">{visible.map(x=><div key={x.id} className={`academy-card overflow-hidden ${!x.is_published?"opacity-60":""}`}>
     <div className="h-40 bg-slate-100">{x.cover_url?<img src={x.cover_url} className="h-full w-full object-cover" alt=""/>:<div className="flex h-full items-center justify-center text-4xl text-slate-300"><FaBook/></div>}</div>
     <div className="p-5">
      <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-bold text-orange-600">{typeLabels[x.book_type]||x.book_type}</div><h3 className="mt-1 font-extrabold text-[#12345b]">{x.title_ar}</h3><div className="text-sm text-slate-500">{x.title_en||""}</div></div><button onClick={()=>edit(x)} className="text-orange-600"><FaEdit/></button></div>
      <div className="mt-3 text-xs text-slate-500">{x.school_grade_levels?.name_ar} • {x.school_curricula?.name_ar} • {x.school_subjects?.name_ar}</div>
      <div className="mt-4 flex gap-2">{x.file_url&&<a href={x.file_url} target="_blank" rel="noreferrer" className="academy-btn-dark"><FaDownload/>فتح</a>}</div>
     </div>
    </div>)}</div>
   </div>
  </div>
 </div>
}
function Field({l,children}){return <label className="block"><span className="mb-1.5 block text-sm font-bold">{l}</span>{children}</label>}
