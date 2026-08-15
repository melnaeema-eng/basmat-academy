import {useEffect,useState} from "react";
import {FaEdit,FaLock,FaPlus,FaSave,FaSync,FaTimes} from "react-icons/fa";
import {getSchoolCore,getSchoolExamPeriods,getSchoolExams,getSchoolGradeSubjects,getSchoolSubjects,getSchoolTeachers,refreshSchoolExamAccess,saveSchoolExam,saveSchoolExamPeriod,seedSchoolExamResults} from "../../../services/schoolService";

const periodFresh=()=>({id:null,academic_year_id:"",name_ar:"",name_en:"",exam_type:"monthly",term_no:"1",starts_on:"",ends_on:"",is_published:false});
const examFresh=()=>({id:null,exam_period_id:"",curriculum_id:"",grade_level_id:"",class_section_id:"",subject_id:"",teacher_id:"",title:"",exam_date:"",starts_at:"08:00",duration_minutes:"60",max_score:"100",pass_score:"50",financial_lock:true,is_published:false,notes:""});

export default function SchoolExams(){
 const[core,setCore]=useState(null),[subjects,setSubjects]=useState([]),[gradeSubjects,setGradeSubjects]=useState([]),[teachers,setTeachers]=useState([]),[periods,setPeriods]=useState([]),[exams,setExams]=useState([]),[mode,setMode]=useState("exam");
 const[period,setPeriod]=useState(periodFresh()),[exam,setExam]=useState(examFresh());

 async function load(){
  const[c,s,gs,t,p,e]=await Promise.all([getSchoolCore(),getSchoolSubjects(),getSchoolGradeSubjects(),getSchoolTeachers(),getSchoolExamPeriods(),getSchoolExams()]);
  setCore(c);setSubjects(s);setGradeSubjects(gs);setTeachers(t);setPeriods(p);setExams(e);
  setPeriod(v=>({...v,academic_year_id:v.academic_year_id||c.years.find(x=>x.is_current)?.id||""}));
  setExam(v=>({...v,exam_period_id:v.exam_period_id||p[0]?.id||"",curriculum_id:v.curriculum_id||c.curricula[0]?.id||""}));
 }
 useEffect(()=>{load().catch(e=>alert(e.message))},[]);

 function resetPeriod(){setPeriod({...periodFresh(),academic_year_id:core?.years.find(x=>x.is_current)?.id||""})}
 function resetExam(){setExam({...examFresh(),exam_period_id:periods[0]?.id||"",curriculum_id:core?.curricula[0]?.id||""})}
 function editPeriod(x){setMode("period");setPeriod({id:x.id,academic_year_id:x.academic_year_id,name_ar:x.name_ar||"",name_en:x.name_en||"",exam_type:x.exam_type,term_no:String(x.term_no),starts_on:x.starts_on,ends_on:x.ends_on,is_published:!!x.is_published});window.scrollTo({top:0,behavior:"smooth"})}
 function editExam(x){
  const sec=(core?.sections||[]).find(s=>s.id===x.class_section_id);
  setMode("exam");
  setExam({id:x.id,exam_period_id:x.exam_period_id,curriculum_id:sec?.curriculum_id||"",grade_level_id:sec?.grade_level_id||"",class_section_id:x.class_section_id,subject_id:x.subject_id,teacher_id:x.teacher_id||"",title:x.title||"",exam_date:x.exam_date||"",starts_at:x.starts_at?String(x.starts_at).slice(0,5):"08:00",duration_minutes:String(x.duration_minutes||60),max_score:String(x.max_score||100),pass_score:String(x.pass_score||50),financial_lock:x.financial_lock!==false,is_published:!!x.is_published,notes:x.notes||""});
  window.scrollTo({top:0,behavior:"smooth"});
 }

 async function savePeriodForm(e){e.preventDefault();try{const editing=!!period.id;await saveSchoolExamPeriod(period);resetPeriod();await load();alert(editing?"تم تحديث فترة الامتحانات":"تم إضافة فترة الامتحانات")}catch(e){alert(e.message)}}
 async function saveExamForm(e){e.preventDefault();try{const editing=!!exam.id;await saveSchoolExam(exam);resetExam();await load();alert(editing?"تم تحديث الامتحان":"تم إنشاء الامتحان")}catch(e){alert(e.message)}}
 async function prepare(id){try{const n=await refreshSchoolExamAccess(id);await seedSchoolExamResults(id);alert(`تم فحص الأهلية المالية وتجهيز ${n} طالبًا للامتحان`)}catch(e){alert(e.message)}}

 const filteredGrades=(core?.grades||[]).filter(g=>{
  if(!exam.curriculum_id)return true;
  return (core?.sections||[]).some(sec=>sec.curriculum_id===exam.curriculum_id&&sec.grade_level_id===g.id&&sec.is_active!==false);
 });
 const filteredSections=(core?.sections||[]).filter(sec=>
  sec.is_active!==false &&
  (!exam.curriculum_id||sec.curriculum_id===exam.curriculum_id)&&
  (!exam.grade_level_id||sec.grade_level_id===exam.grade_level_id)
 );
 const currentYearId=core?.years?.find(y=>y.is_current)?.id||"";
 const allowedSubjectIds=new Set(gradeSubjects.filter(gs=>
   gs.curriculum_id===exam.curriculum_id &&
   gs.grade_level_id===exam.grade_level_id &&
   (!currentYearId||gs.academic_year_id===currentYearId)
 ).map(gs=>gs.subject_id));
 const filteredSubjects=subjects.filter(sub=>allowedSubjectIds.has(sub.id));

 return <div>
  <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-extrabold text-[#12345b]">الامتحانات</h1><p className="mt-2 text-slate-500">إنشاء وتعديل الامتحانات وفتراتها مع المنع المالي التلقائي.</p></div><div className="flex gap-2"><button onClick={()=>{setMode("exam");resetExam()}} className={`rounded-xl px-4 py-2 font-bold ${mode==="exam"?"bg-orange-500 text-white":"bg-white"}`}>الامتحانات</button><button onClick={()=>{setMode("period");resetPeriod()}} className={`rounded-xl px-4 py-2 font-bold ${mode==="period"?"bg-orange-500 text-white":"bg-white"}`}>فترات الامتحانات</button></div></div>

  <div className="mt-6 grid gap-6 xl:grid-cols-[440px_1fr]">
   {mode==="period"?<form onSubmit={savePeriodForm} className="academy-card space-y-4 p-5"><div className="flex justify-between"><h2 className="font-extrabold text-[#12345b]">{period.id?"تعديل فترة الامتحانات":"فترة امتحانات جديدة"}</h2>{period.id&&<button type="button" onClick={resetPeriod}><FaTimes/></button>}</div><Field l="العام"><select className="academy-input" value={period.academic_year_id} onChange={e=>setPeriod({...period,academic_year_id:e.target.value})}>{(core?.years||[]).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field><Field l="الاسم"><input required className="academy-input" value={period.name_ar} onChange={e=>setPeriod({...period,name_ar:e.target.value})}/></Field><Field l="English name"><input className="academy-input" value={period.name_en} onChange={e=>setPeriod({...period,name_en:e.target.value})}/></Field><div className="grid gap-3 sm:grid-cols-2"><Field l="النوع"><select className="academy-input" value={period.exam_type} onChange={e=>setPeriod({...period,exam_type:e.target.value})}><option value="monthly">شهري</option><option value="midterm">نصف سنوي</option><option value="final">نهائي</option></select></Field><Field l="الفصل الدراسي"><select className="academy-input" value={period.term_no} onChange={e=>setPeriod({...period,term_no:e.target.value})}><option value="1">الأول</option><option value="2">الثاني</option><option value="3">الثالث</option></select></Field></div><div className="grid gap-3 sm:grid-cols-2"><Field l="من"><input required type="date" className="academy-input" value={period.starts_on} onChange={e=>setPeriod({...period,starts_on:e.target.value})}/></Field><Field l="إلى"><input required type="date" className="academy-input" value={period.ends_on} onChange={e=>setPeriod({...period,ends_on:e.target.value})}/></Field></div><label className="flex gap-2 font-bold"><input type="checkbox" checked={period.is_published} onChange={e=>setPeriod({...period,is_published:e.target.checked})}/>منشورة</label><button className="academy-btn-primary w-full">{period.id?<FaSave/>:<FaPlus/>}{period.id?"حفظ التعديلات":"إضافة الفترة"}</button></form>:
   <form onSubmit={saveExamForm} className="academy-card space-y-4 p-5"><div className="flex justify-between"><h2 className="font-extrabold text-[#12345b]">{exam.id?"تعديل الامتحان":"امتحان جديد"}</h2>{exam.id&&<button type="button" onClick={resetExam}><FaTimes/></button>}</div><Field l="فترة الامتحان"><select required className="academy-input" value={exam.exam_period_id} onChange={e=>setExam({...exam,exam_period_id:e.target.value})}>{periods.map(x=><option key={x.id} value={x.id}>{x.name_ar}</option>)}</select></Field><Field l="المنهج"><select required className="academy-input" value={exam.curriculum_id} onChange={e=>setExam({...exam,curriculum_id:e.target.value,grade_level_id:"",class_section_id:"",subject_id:""})}><option value="">اختر المنهج</option>{(core?.curricula||[]).map(x=><option key={x.id} value={x.id}>{x.name_ar}</option>)}</select></Field><Field l="الصف / المستوى"><select required className="academy-input" value={exam.grade_level_id} onChange={e=>setExam({...exam,grade_level_id:e.target.value,class_section_id:"",subject_id:""})}><option value="">اختر الصف أو المستوى</option>{filteredGrades.map(x=><option key={x.id} value={x.id}>{x.name_ar} / {x.name_en}</option>)}</select></Field><Field l="الفصل"><select required disabled={!exam.grade_level_id} className="academy-input" value={exam.class_section_id} onChange={e=>setExam({...exam,class_section_id:e.target.value})}><option value="">{exam.grade_level_id?"اختر الفصل":"اختر الصف أولًا"}</option>{filteredSections.map(x=><option key={x.id} value={x.id}>{x.section_name}</option>)}</select></Field><Field l="المادة"><select required disabled={!exam.grade_level_id} className="academy-input" value={exam.subject_id} onChange={e=>setExam({...exam,subject_id:e.target.value})}><option value="">{exam.grade_level_id?"اختر المادة":"اختر الصف أولًا"}</option>{filteredSubjects.map(x=><option key={x.id} value={x.id}>{x.name_ar} / {x.name_en}</option>)}</select></Field><Field l="المعلم"><select className="academy-input" value={exam.teacher_id} onChange={e=>setExam({...exam,teacher_id:e.target.value})}><option value="">—</option>{teachers.map(x=><option key={x.id} value={x.id}>{x.full_name_ar}</option>)}</select></Field><Field l="العنوان"><input required className="academy-input" value={exam.title} onChange={e=>setExam({...exam,title:e.target.value})}/></Field><div className="grid gap-3 sm:grid-cols-2"><Field l="التاريخ"><input required type="date" className="academy-input" value={exam.exam_date} onChange={e=>setExam({...exam,exam_date:e.target.value})}/></Field><Field l="الوقت"><input type="time" className="academy-input" value={exam.starts_at} onChange={e=>setExam({...exam,starts_at:e.target.value})}/></Field></div><div className="grid gap-3 sm:grid-cols-3"><Field l="المدة"><input type="number" className="academy-input" value={exam.duration_minutes} onChange={e=>setExam({...exam,duration_minutes:e.target.value})}/></Field><Field l="الدرجة"><input type="number" className="academy-input" value={exam.max_score} onChange={e=>setExam({...exam,max_score:e.target.value})}/></Field><Field l="النجاح"><input type="number" className="academy-input" value={exam.pass_score} onChange={e=>setExam({...exam,pass_score:e.target.value})}/></Field></div><label className="flex gap-2 font-bold"><input type="checkbox" checked={exam.financial_lock} onChange={e=>setExam({...exam,financial_lock:e.target.checked})}/>تطبيق المنع المالي</label><label className="flex gap-2 font-bold"><input type="checkbox" checked={exam.is_published} onChange={e=>setExam({...exam,is_published:e.target.checked})}/>نشر الامتحان</label><Field l="ملاحظات"><textarea className="academy-input min-h-20" value={exam.notes} onChange={e=>setExam({...exam,notes:e.target.value})}/></Field><button className="academy-btn-primary w-full">{exam.id?<FaSave/>:<FaPlus/>}{exam.id?"حفظ التعديلات":"حفظ الامتحان"}</button></form>}

   <div className="space-y-3">
    {mode==="period"?(periods.map(x=><div key={x.id} className="academy-card flex items-center justify-between gap-4 p-5"><div><div className="font-extrabold text-[#12345b]">{x.name_ar}</div><div className="mt-1 text-sm text-slate-500">{x.exam_type} • الفصل {x.term_no} • {x.starts_on} → {x.ends_on}</div></div><button onClick={()=>editPeriod(x)} className="rounded-lg bg-orange-50 p-2 text-orange-600"><FaEdit/></button></div>)):
    exams.map(x=><div key={x.id} className="academy-card p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-xs font-bold text-orange-600">{x.school_exam_periods?.name_ar} • {x.school_subjects?.name_ar}</div><h3 className="mt-1 text-lg font-extrabold text-[#12345b]">{x.title}</h3><div className="mt-1 text-sm text-slate-500">{x.school_class_sections?.school_grade_levels?.name_ar} / {x.school_class_sections?.section_name}</div></div><div className="flex items-center gap-2"><button onClick={()=>editExam(x)} className="rounded-lg bg-orange-50 p-2 text-orange-600"><FaEdit/></button>{x.financial_lock&&<span className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700"><FaLock/>منع مالي</span>}</div></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3"><span dir="ltr" className="text-xs text-slate-500">{x.exam_date} • {x.max_score} marks</span><button onClick={()=>prepare(x.id)} className="academy-btn-dark"><FaSync/>فحص وتجهيز الطلاب</button></div></div>)}
   </div>
  </div>
 </div>
}
function Field({l,children}){return <label className="block"><span className="mb-1.5 block text-sm font-bold">{l}</span>{children}</label>}
