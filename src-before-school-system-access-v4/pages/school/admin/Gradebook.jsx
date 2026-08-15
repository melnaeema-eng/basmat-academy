import {useEffect,useMemo,useState} from "react";
import {FaCalculator,FaCheckCircle,FaCog,FaSyncAlt} from "react-icons/fa";
import {
 getSchoolGradebookClass,getSchoolOperationalSetup,publishSchoolTermGradebook,
 rebuildSchoolAnnualGradebook,rebuildSchoolSubjectGradebook,saveSchoolGradebookSetting
} from "../../../services/schoolService";

export default function SchoolGradebook(){
 const[ops,setOps]=useState(null),[sectionId,setSectionId]=useState(""),[subjectId,setSubjectId]=useState(""),[term,setTerm]=useState(1),[book,setBook]=useState({rows:[],setting:{}}),[busy,setBusy]=useState(false);
 const[settings,setSettings]=useState({assignments_weight:20,exams_weight:80,pass_mark:50});

 async function loadBase(){
  const o=await getSchoolOperationalSetup();setOps(o);
  const sec=sectionId||o.sections?.[0]?.id||"";setSectionId(sec);
  const a=o.teacher_assignments?.find(x=>x.class_section_id===sec);
  if(a)setSubjectId(v=>v||a.subject_id);
 }
 useEffect(()=>{loadBase().catch(e=>alert(e.message))},[]);

 const section=ops?.sections?.find(x=>x.id===sectionId);
 const subjects=useMemo(()=>{
  const a=(ops?.teacher_assignments||[]).filter(x=>x.class_section_id===sectionId);
  return [...new Map(a.map(x=>[x.subject_id,{id:x.subject_id,name:x.subject_ar}])).values()];
 },[ops,sectionId]);

 useEffect(()=>{
  if(subjects.length&&!subjects.some(x=>x.id===subjectId))setSubjectId(subjects[0].id);
 },[sectionId,subjects.length]);

 async function refresh(){
  if(!sectionId||!subjectId)return;
  const b=await getSchoolGradebookClass(sectionId,subjectId,term);
  setBook(b);
  setSettings({
   assignments_weight:Number(b.setting?.assignments_weight??20),
   exams_weight:Number(b.setting?.exams_weight??80),
   pass_mark:Number(b.setting?.pass_mark??50)
  });
 }
 useEffect(()=>{refresh().catch(e=>alert(e.message))},[sectionId,subjectId,term]);

 async function saveSettings(){
  if(Number(settings.assignments_weight)+Number(settings.exams_weight)!==100)return alert("مجموع الأوزان يجب أن يساوي 100");
  try{
   setBusy(true);
   await saveSchoolGradebookSetting({
    ...settings,
    academic_year_id:section.academic_year_id,
    grade_level_id:section.grade_level_id,
    curriculum_id:section.curriculum_id,
    subject_id:subjectId,term_no:term
   });
   await refresh();
  }catch(e){alert(e.message)}finally{setBusy(false)}
 }
 async function rebuild(){
  try{setBusy(true);const n=await rebuildSchoolSubjectGradebook(sectionId,subjectId,term);await refresh();alert(`تم حساب درجات ${n} طالب`)}catch(e){alert(e.message)}finally{setBusy(false)}
 }
 async function publish(){
  try{setBusy(true);const r=await publishSchoolTermGradebook(sectionId,term);alert(`تم النشر: ${r.published||0} • موقوف ماليًا: ${r.financially_blocked||0}`)}catch(e){alert(e.message)}finally{setBusy(false)}
 }
 async function annual(){
  try{setBusy(true);const n=await rebuildSchoolAnnualGradebook(sectionId);alert(`تم بناء النتيجة السنوية لعدد ${n} طالب`)}catch(e){alert(e.message)}finally{setBusy(false)}
 }

 return <div>
  <div><h1 className="text-3xl font-extrabold text-[#12345b]">دفتر الدرجات الموحد</h1><p className="mt-2 text-slate-500">يجمع الواجبات والامتحانات الورقية والإلكترونية في درجة مادة واحدة لكل فصل دراسي.</p></div>

  <div className="academy-card mt-5 grid gap-3 p-5 md:grid-cols-3">
   <F l="الفصل"><select className="academy-input" value={sectionId} onChange={e=>setSectionId(e.target.value)}>{(ops?.sections||[]).map(x=><option key={x.id} value={x.id}>{x.grade_ar} / {x.curriculum_ar} / {x.section_name}</option>)}</select></F>
   <F l="المادة"><select className="academy-input" value={subjectId} onChange={e=>setSubjectId(e.target.value)}>{subjects.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></F>
   <F l="الفصل الدراسي"><select className="academy-input" value={term} onChange={e=>setTerm(Number(e.target.value))}><option value="1">الأول</option><option value="2">الثاني</option><option value="3">الثالث</option></select></F>
  </div>

  <div className="mt-5 grid gap-5 xl:grid-cols-[360px_1fr]">
   <div className="academy-card space-y-4 p-5">
    <h2 className="flex items-center gap-2 font-extrabold text-[#12345b]"><FaCog/>أوزان المادة</h2>
    <F l="الواجبات %"><input type="number" min="0" max="100" className="academy-input" value={settings.assignments_weight} onChange={e=>setSettings({...settings,assignments_weight:e.target.value})}/></F>
    <F l="الامتحانات %"><input type="number" min="0" max="100" className="academy-input" value={settings.exams_weight} onChange={e=>setSettings({...settings,exams_weight:e.target.value})}/></F>
    <F l="درجة النجاح %"><input type="number" min="0" max="100" className="academy-input" value={settings.pass_mark} onChange={e=>setSettings({...settings,pass_mark:e.target.value})}/></F>
    <button disabled={busy} onClick={saveSettings} className="academy-btn-dark w-full">حفظ الأوزان</button>
    <button disabled={busy||!subjectId} onClick={rebuild} className="academy-btn-primary w-full"><FaSyncAlt/>إعادة حساب المادة</button>
    <button disabled={busy} onClick={publish} className="academy-btn-dark w-full"><FaCheckCircle/>بناء ونشر بطاقة الفصل</button>
    <button disabled={busy} onClick={annual} className="academy-btn-primary w-full"><FaCalculator/>بناء النتيجة السنوية</button>
   </div>

   <div className="academy-card overflow-x-auto">
    <table className="w-full min-w-[850px] text-sm">
     <thead><tr className="bg-slate-50 text-right"><th className="p-3">الطالب</th><th>متوسط الواجبات</th><th>متوسط الامتحانات</th><th>الدرجة النهائية</th><th>الحالة</th><th>النشر</th></tr></thead>
     <tbody>{(book.rows||[]).map(x=><tr key={x.enrollment_id} className="border-t"><td className="p-3"><b>{x.student_name}</b><div className="text-xs text-slate-400">{x.student_no}</div></td><td>{x.assignment_average==null?"—":`${x.assignment_average}%`}</td><td>{x.exam_average==null?"—":`${x.exam_average}%`}</td><td><b className="text-lg">{x.final_score==null?"—":`${x.final_score}%`}</b></td><td>{x.result_status}</td><td>{x.published_at?"منشور":"غير منشور"}</td></tr>)}</tbody>
    </table>
   </div>
  </div>

  <div className="academy-card mt-5 p-5 text-sm text-slate-600">
   <b>التكامل:</b> الواجبات من صفحة الواجبات، الامتحانات الورقية من صفحة الامتحانات، والامتحانات الإلكترونية من بنك الأسئلة/Online Exams. هذه الصفحة تجمع النتائج فقط في Gradebook واحد.
  </div>
 </div>
}
function F({l,children}){return <label className="block"><span className="mb-1 block text-sm font-bold">{l}</span>{children}</label>}
