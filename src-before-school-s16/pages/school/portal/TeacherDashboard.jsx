import {useEffect,useMemo,useState} from "react";
import {Link} from "react-router-dom";
import {FaBell,FaBookOpen,FaChalkboardTeacher,FaClipboardCheck,FaGraduationCap,FaUserCheck,FaUsers} from "react-icons/fa";
import {getTeacherFullPortal,getTeacherStudentSnapshot,gradeSchoolSubmission,saveSchoolAttendance} from "../../../services/schoolService";

const tabs=[["overview","الملخص"],["classes","الفصول والطلاب"],["attendance","الحضور"],["homework","الواجبات والتصحيح"],["timetable","الجدول"],["exams","الامتحانات"]];
export default function TeacherSchoolDashboard({initialTab="overview"}){
 const[data,setData]=useState(null),[error,setError]=useState(""),[tab,setTab]=useState(initialTab),[classId,setClassId]=useState(""),[attendance,setAttendance]=useState({}),[studentSnapshot,setStudentSnapshot]=useState(null);
 async function load(){try{const d=await getTeacherFullPortal();setData(d);setClassId(v=>v||d?.assignments?.find(x=>x.class_section_id)?.class_section_id||"")}catch(e){setError(e.message)}}
 useEffect(()=>{load()},[]);useEffect(()=>setTab(initialTab),[initialTab]);

 const classes=useMemo(()=>{
  const map=new Map();
  for(const a of data?.assignments||[]){if(a.class_section_id&&!map.has(a.class_section_id))map.set(a.class_section_id,a)}
  return [...map.values()];
 },[data]);
 const students=(data?.students||[]).filter(x=>!classId||x.class_section_id===classId);

 function setStatus(eid,status){setAttendance(v=>({...v,[eid]:{enrollment_id:eid,status,note:v[eid]?.note||""}}))}
 async function saveAttendanceToday(){
  if(!classId)return alert("اختر الفصل");
  const first=(data?.assignments||[]).find(x=>x.class_section_id===classId);
  const records=students.map(s=>attendance[s.enrollment_id]||{enrollment_id:s.enrollment_id,status:"present",note:""});
  try{
   await saveSchoolAttendance({class_section_id:classId,subject_id:first?.subject_id||null,attendance_date:new Date().toISOString().slice(0,10),period_no:null,notes:"Teacher Portal",records});
   alert("تم حفظ حضور اليوم");
  }catch(e){alert(e.message)}
 }
 async function grade(sub){
  const score=prompt(`الدرجة من ${sub.max_score}`,"0"); if(score===null)return;
  const feedback=prompt("ملاحظة للطالب (اختياري)","")||"";
  try{await gradeSchoolSubmission({id:sub.id,score,teacher_feedback:feedback});await load();alert("تم التصحيح")}catch(e){alert(e.message)}
 }
 async function snapshot(eid){
  try{setStudentSnapshot(await getTeacherStudentSnapshot(eid))}catch(e){alert(e.message)}
 }

 return <div><div className="rounded-[28px] bg-[#12345b] p-7 text-white"><div className="flex flex-wrap items-center justify-between gap-4"><div><FaChalkboardTeacher className="text-3xl text-orange-300"/><h1 className="mt-3 text-3xl font-extrabold">بوابة المعلم</h1><p className="mt-2 text-slate-200">{data?.teacher?.full_name_ar||"إدارة الفصول والطلاب والواجبات والنتائج."}</p></div><div className="flex gap-2"><Link to="/school/teacher/notifications" className="rounded-xl bg-white/10 px-4 py-2 font-bold"><FaBell className="inline"/> الإشعارات</Link><Link to="/school/teacher/profile" className="rounded-xl bg-white/10 px-4 py-2 font-bold">ملفي</Link></div></div></div>
 {error&&<div className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}
 <div className="mt-5 grid gap-3 md:grid-cols-4"><Card t="المواد/التكليفات" v={(data?.assignments||[]).length}/><Card t="الطلاب" v={(data?.students||[]).length}/><Card t="واجبات تنتظر التصحيح" v={(data?.pending_submissions||[]).length}/><Card t="أسئلة بنك الأسئلة" v={data?.question_count||0}/></div>
 <div className="mt-5 flex flex-wrap gap-2">{tabs.map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={`rounded-xl px-4 py-2 font-bold ${tab===k?"bg-[#12345b] text-white":"bg-white border"}`}>{l}</button>)}<Link to="/school/teacher/library" className="rounded-xl border bg-white px-4 py-2 font-bold">المكتبة</Link></div>

 {tab==="overview"&&<div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{(data?.assignments||[]).map(x=><div key={x.id} className="academy-card p-5"><div className="text-xs font-bold text-orange-600">{x.curriculum_ar}</div><h2 className="mt-1 text-xl font-extrabold text-[#12345b]">{x.subject_ar}</h2><p className="mt-2 text-sm text-slate-500">{x.grade_ar} • فصل {x.section_name||"عام"}</p></div>)}</div>}

 {["classes","attendance"].includes(tab)&&<div className="mt-5"><div className="academy-card p-5"><label className="block max-w-md"><span className="mb-1.5 block text-sm font-bold">الفصل</span><select className="academy-input" value={classId} onChange={e=>setClassId(e.target.value)}>{classes.map(x=><option key={x.class_section_id} value={x.class_section_id}>{x.grade_ar} / {x.section_name} / {x.curriculum_ar}</option>)}</select></label></div>
 <div className="mt-4 space-y-3">{students.map(st=><div key={st.enrollment_id} className="academy-card p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs text-orange-600">{st.student_no}</div><b className="text-[#12345b]">{st.full_name_ar}</b></div>{tab==="classes"?<button onClick={()=>snapshot(st.enrollment_id)} className="academy-btn-dark">متابعة الطالب</button>:<div className="flex gap-2">{["present","absent","late","excused"].map(k=><button key={k} onClick={()=>setStatus(st.enrollment_id,k)} className={`rounded-lg px-3 py-2 text-xs font-bold ${(attendance[st.enrollment_id]?.status||"present")===k?"bg-orange-500 text-white":"bg-slate-100"}`}>{k}</button>)}</div>}</div></div>)}</div>{tab==="attendance"&&<button onClick={saveAttendanceToday} className="academy-btn-primary mt-4 w-full"><FaUserCheck/>حفظ حضور اليوم</button>}{tab==="classes"&&studentSnapshot&&<div className="academy-card mt-5 p-5"><h3 className="font-extrabold text-[#12345b]">ملخص الطالب المحدد</h3><div className="mt-3 grid gap-3 sm:grid-cols-4">{Object.entries(studentSnapshot.attendance||{}).map(([k,v])=><Card key={k} t={k} v={v}/>)}</div><div className="mt-4 text-sm">نتائج متاحة: {(studentSnapshot.results||[]).length} • واجبات: {(studentSnapshot.assignments||[]).length}</div></div>}</div>}

 {tab==="homework"&&<div className="mt-5 grid gap-6 xl:grid-cols-2"><section><h2 className="text-xl font-extrabold text-[#12345b]">الواجبات</h2><div className="mt-3 space-y-3">{(data?.homework||[]).map(x=><div key={x.id} className="academy-card p-5"><div className="text-xs text-orange-600">{x.subject_ar} • {x.section_name}</div><b>{x.title}</b><div className="mt-2 text-sm">التسليمات {x.submitted_count} • المصحح {x.graded_count}</div></div>)}</div></section><section><h2 className="text-xl font-extrabold text-[#12345b]">بانتظار التصحيح</h2><div className="mt-3 space-y-3">{(data?.pending_submissions||[]).map(x=><div key={x.id} className="academy-card p-5"><div className="text-xs text-orange-600">{x.student_name} • {x.student_no}</div><b>{x.assignment_title}</b><p className="mt-2 text-sm text-slate-600">{x.submission_text||"مرفق فقط"}</p><button onClick={()=>grade(x)} className="academy-btn-primary mt-3"><FaClipboardCheck/>تصحيح</button></div>)}</div></section></div>}

 {tab==="timetable"&&<Timetable rows={data?.timetable||[]}/>}
 {tab==="exams"&&<div className="mt-5 grid gap-4 md:grid-cols-2">{(data?.exams||[]).map(x=><div key={x.id} className="academy-card p-5"><div className="text-xs font-bold text-orange-600">{x.subject_ar} • {x.section_name}</div><h3 className="font-extrabold text-[#12345b]">{x.title}</h3><div className="mt-2 text-sm">{x.exam_date} • {x.delivery_mode} • {x.max_score} درجة</div></div>)}</div>}
 </div>
}
function Card({t,v}){return <div className="academy-card p-5"><div className="text-sm text-slate-500">{t}</div><div className="mt-2 text-2xl font-extrabold text-[#12345b]">{v}</div></div>}
const days=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
function Timetable({rows}){return <div className="mt-5 space-y-4">{days.map((d,i)=>{const r=rows.filter(x=>Number(x.weekday)===i);return <div key={d} className="academy-card overflow-hidden"><div className="bg-[#12345b] px-5 py-3 font-extrabold text-white">{d}</div>{r.map((x,j)=><div key={j} className="grid gap-2 border-t p-4 text-sm md:grid-cols-4"><b>الحصة {x.period_no}</b><span>{x.subject_ar}</span><span>{x.grade_ar} / {x.section_name}</span><span dir="ltr">{String(x.starts_at).slice(0,5)} - {String(x.ends_at).slice(0,5)}</span></div>)}{!r.length&&<div className="p-4 text-sm text-slate-400">لا توجد حصص.</div>}</div>})}</div>}
