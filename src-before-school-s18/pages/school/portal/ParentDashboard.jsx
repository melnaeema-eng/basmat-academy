import {useEffect,useMemo,useState} from "react";
import {Link} from "react-router-dom";
import {FaAward,FaBell,FaBook,FaCalendarAlt,FaClipboardList,FaFileInvoiceDollar,FaGraduationCap,FaPrint,FaUserClock,FaUsers} from "react-icons/fa";
import {getParentChildPortal,getParentSchoolDashboard,getSchoolStudentTranscript,recordSchoolBookDownload} from "../../../services/schoolService";

const tabs=[
 ["overview","الملخص",FaUsers],
 ["fees","المالية",FaFileInvoiceDollar],
 ["attendance","الحضور",FaUserClock],
 ["assignments","الواجبات",FaClipboardList],
 ["timetable","الجدول",FaCalendarAlt],
 ["exams","الامتحانات",FaGraduationCap],
 ["results","النتائج",FaAward],
 ["books","الكتب",FaBook],
];

export default function ParentSchoolDashboard({initialTab="overview"}){
 const[base,setBase]=useState(null),[selected,setSelected]=useState(""),[data,setData]=useState(null),[tab,setTab]=useState(initialTab),[transcript,setTranscript]=useState(null),[error,setError]=useState("");
 useEffect(()=>{getParentSchoolDashboard().then(d=>{setBase(d);setSelected(d?.children?.[0]?.student_id||"")}).catch(e=>setError(e.message))},[]);
 useEffect(()=>{setTab(initialTab)},[initialTab]);
 useEffect(()=>{if(!selected){setData(null);return}setTranscript(null);getParentChildPortal(selected).then(setData).catch(e=>setError(e.message))},[selected]);

 const child=base?.children?.find(x=>x.student_id===selected);
 const summary=data?.attendance_summary||{};
 const fees=data?.fees||{};
 const totalAssignments=(data?.assignments||[]).length;
 const submittedAssignments=(data?.assignments||[]).filter(x=>x.submitted_at).length;

 async function loadTranscript(){
  if(!selected)return;
  try{setTranscript(await getSchoolStudentTranscript(selected))}catch(e){alert(e.message)}
 }
 async function openBook(b){
  try{await recordSchoolBookDownload(b.id)}catch{}
  window.open(b.file_url,"_blank","noopener,noreferrer");
 }

 return <div>
  <div className="rounded-[28px] bg-[#12345b] p-7 text-white">
   <div className="flex flex-wrap items-center justify-between gap-4">
    <div><FaUsers className="text-3xl text-orange-300"/><h1 className="mt-3 text-3xl font-extrabold">بوابة ولي الأمر</h1><p className="mt-2 text-slate-200">متابعة جميع الأبناء من حساب واحد.</p></div>
    <div className="flex gap-2"><Link to="/school/parent/notifications" className="rounded-xl bg-white/10 px-4 py-2 font-bold"><FaBell className="inline"/> الإشعارات</Link><Link to="/school/parent/profile" className="rounded-xl bg-white/10 px-4 py-2 font-bold">بياناتي</Link></div>
   </div>
  </div>

  {error&&<div className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}

  {(base?.children||[]).length>0&&<div className="mt-5 flex flex-wrap gap-2">{base.children.map(c=><button key={c.student_id} onClick={()=>setSelected(c.student_id)} className={`rounded-2xl px-4 py-3 text-right font-bold ${selected===c.student_id?"bg-orange-500 text-white":"bg-white border"}`}><div>{c.full_name_ar}</div><div className="text-xs opacity-70">{c.student_no} • {c.grade_name_ar||"—"}</div></button>)}</div>}

  {child&&<div className="mt-5 grid gap-3 md:grid-cols-4">
   <Card title="الصف" value={`${child.grade_name_ar||"—"} / ${child.section_name||"—"}`}/>
   <Card title="المنهج" value={child.curriculum_name_ar||"—"}/>
   <Card title="المستحقات" value={`${Number(fees.outstanding||0).toFixed(2)} SAR`} danger={Number(fees.outstanding)>0}/>
   <Card title="الواجبات" value={`${submittedAssignments}/${totalAssignments} مسلّم`}/>
  </div>}

  <div className="mt-5 flex flex-wrap gap-2">{tabs.map(([k,l,I])=><button key={k} onClick={()=>setTab(k)} className={`rounded-xl px-4 py-2 font-bold ${tab===k?"bg-[#12345b] text-white":"bg-white border"}`}><I className="inline"/> {l}</button>)}</div>

  {selected&&data&&<div className="mt-5">
   {tab==="overview"&&<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <Stat title="حضور" value={summary.present||0}/>
    <Stat title="غياب" value={summary.absent||0}/>
    <Stat title="تأخير" value={summary.late||0}/>
    <Stat title="إجازة/عذر" value={summary.excused||0}/>
   </div>}

   {tab==="fees"&&<Fees fees={fees}/>}
   {tab==="attendance"&&<Attendance rows={data.attendance||[]}/>}
   {tab==="assignments"&&<Assignments rows={data.assignments||[]}/>}
   {tab==="timetable"&&<Timetable rows={data.timetable||[]}/>}
   {tab==="exams"&&<Exams rows={data.exams||[]}/>}
   {tab==="results"&&<Results data={data} transcript={transcript} loadTranscript={loadTranscript}/>}
   {tab==="books"&&<Books rows={data.books||[]} openBook={openBook}/>}
  </div>}

  {base&&!base.children?.length&&<div className="academy-card mt-6 p-8 text-center text-slate-500">لا يوجد أبناء مرتبطون بهذا الحساب.</div>}
 </div>
}

function Fees({fees}){
 return <div className="space-y-5">
  {(fees.discounts||[]).length>0&&<div className="academy-card p-5"><h2 className="font-extrabold text-[#12345b]">الخصومات</h2>{fees.discounts.map((d,i)=><div key={i} className="mt-3 rounded-xl bg-orange-50 p-4 text-sm"><b>{d.reason||d.type}</b><div className="mt-1">{d.percent}% • {Number(d.amount||0).toFixed(2)} SAR • {d.applies_to}</div></div>)}</div>}
  <div className="academy-card overflow-x-auto"><table className="w-full min-w-[750px] text-sm"><thead><tr className="bg-slate-50 text-right"><th className="p-3">القسط</th><th>الاستحقاق</th><th>القيمة</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th></tr></thead><tbody>{(fees.installments||[]).map(x=><tr key={x.id} className="border-t"><td className="p-3">{x.title}</td><td>{x.due_date}</td><td>{Number(x.amount).toFixed(2)}</td><td>{Number(x.paid_amount).toFixed(2)}</td><td>{Number(x.outstanding).toFixed(2)}</td><td>{x.status}</td></tr>)}</tbody></table></div>
  <div className="academy-card p-5"><div className="flex justify-between"><h2 className="font-extrabold text-[#12345b]">المدفوعات والإيصالات</h2><button onClick={()=>window.print()} className="academy-btn-dark"><FaPrint/>طباعة</button></div><div className="mt-4 space-y-2">{(fees.payments||[]).map(p=><div key={p.id} className="flex flex-wrap justify-between gap-3 rounded-xl bg-slate-50 p-4 text-sm"><div><b>{Number(p.amount).toFixed(2)} {p.currency}</b><div className="text-xs text-slate-500">{new Date(p.paid_at).toLocaleString()} • {p.method}</div></div><div dir="ltr">{p.reference_no||p.id.slice(0,8)}</div></div>)}</div></div>
 </div>
}

function Attendance({rows}){return <div className="academy-card overflow-x-auto"><table className="w-full min-w-[650px] text-sm"><thead><tr className="bg-slate-50 text-right"><th className="p-3">التاريخ</th><th>المادة</th><th>الحصة</th><th>الحالة</th><th>ملاحظة</th></tr></thead><tbody>{rows.map((x,i)=><tr key={i} className="border-t"><td className="p-3">{x.date}</td><td>{x.subject_ar||"—"}</td><td>{x.period_no||"—"}</td><td><b>{x.status}</b></td><td>{x.note||"—"}</td></tr>)}</tbody></table></div>}

function Assignments({rows}){return <div className="grid gap-4 md:grid-cols-2">{rows.map(x=><div key={x.id} className="academy-card p-5"><div className="text-xs font-bold text-orange-600">{x.subject_ar}</div><h3 className="font-extrabold text-[#12345b]">{x.title}</h3><p className="mt-2 text-sm text-slate-600">{x.description||"—"}</p><div className="mt-3 text-xs text-slate-500">التسليم: {x.due_at?new Date(x.due_at).toLocaleString():"—"}</div><div className={`mt-3 rounded-xl p-3 text-sm ${x.submitted_at?"bg-emerald-50 text-emerald-700":"bg-orange-50 text-orange-700"}`}>{x.submitted_at?`تم التسليم • الدرجة ${x.score??"لم تصحح"}`:"لم يتم التسليم"}{x.teacher_feedback&&<div className="mt-1">ملاحظة المعلم: {x.teacher_feedback}</div>}</div></div>)}</div>}

const days=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
function Timetable({rows}){return <div className="space-y-4">{days.map((d,i)=>{const r=rows.filter(x=>Number(x.weekday)===i);return <div key={d} className="academy-card overflow-hidden"><div className="bg-[#12345b] px-5 py-3 font-extrabold text-white">{d}</div>{r.map((x,j)=><div key={j} className="grid gap-2 border-t p-4 text-sm md:grid-cols-4"><b>الحصة {x.period_no}</b><span>{x.subject_ar}</span><span>{x.teacher_ar}</span><span dir="ltr">{String(x.starts_at).slice(0,5)} - {String(x.ends_at).slice(0,5)}</span></div>)}{!r.length&&<div className="p-4 text-sm text-slate-400">لا توجد حصص.</div>}</div>})}</div>}

function Exams({rows}){return <div className="grid gap-4 md:grid-cols-2">{rows.map(x=><div key={x.id} className="academy-card p-5"><div className="text-xs font-bold text-orange-600">{x.subject_ar} • {x.period_ar}</div><h3 className="font-extrabold text-[#12345b]">{x.title}</h3><div className="mt-3 text-sm">{x.exam_date} • {x.duration_minutes} دقيقة • {x.delivery_mode}</div></div>)}</div>}

function Results({data,transcript,loadTranscript}){
 return <div className="space-y-5">
  <div className="grid gap-4 md:grid-cols-2">{(data.results||[]).map(x=><div key={x.id} className="academy-card p-5"><div className="text-xs font-bold text-orange-600">{x.subject_ar} • {x.period_ar}</div><h3 className="font-extrabold text-[#12345b]">{x.exam_title}</h3><div className="mt-3 text-3xl font-extrabold">{x.score}/{x.max_score}</div></div>)}</div>
  <div className="grid gap-4 md:grid-cols-2">{(data.report_cards||[]).map(x=><div key={x.id} className="academy-card p-5"><b>بطاقة الفصل الدراسي {x.term_no}</b><div className="mt-3 text-4xl font-extrabold text-[#12345b]">{x.average_score??"—"}%</div><div className="mt-2">{x.result_status} • الترتيب {x.rank_in_class||"—"}</div></div>)}</div>
  <div className="grid gap-4 md:grid-cols-2">{(data.annual_results||[]).map(x=><div key={x.id} className="academy-card p-5"><b>النتيجة السنوية</b><div className="mt-3 text-4xl font-extrabold text-[#12345b]">{x.average_score??"—"}%</div><div className="mt-2">{x.result_status} • {x.promotion_status}</div></div>)}</div>
  <div className="academy-card p-5"><div className="flex justify-between gap-3"><h2 className="font-extrabold text-[#12345b]">كشف الدرجات الكامل</h2><button onClick={loadTranscript} className="academy-btn-dark">تحميل السجل</button></div>{transcript&&<div className="mt-4 space-y-3">{(transcript.years||[]).map((y,i)=><div key={i} className="rounded-xl bg-slate-50 p-4"><b>{y.academic_year} • {y.grade_ar}</b><div className="mt-1 text-sm">المعدل {y.annual_average??"—"}% • {y.annual_result||"—"}</div></div>)}</div>}</div>
  <div className="grid gap-4 md:grid-cols-2">{(data.certificates||[]).map(c=><div key={c.id} className="academy-card p-5"><FaAward className="text-3xl text-orange-500"/><div className="mt-2 text-xs text-orange-600">{c.certificate_no}</div><h3 className="font-extrabold text-[#12345b]">{c.title_ar}</h3><Link to={`/school/verify-certificate/${c.verification_code}`} className="academy-btn-dark mt-4 inline-flex">التحقق من الشهادة</Link></div>)}</div>
 </div>
}

function Books({rows,openBook}){return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{rows.map(b=><div key={b.id} className="academy-card overflow-hidden">{b.cover_url?<img src={b.cover_url} className="h-40 w-full object-cover" alt=""/>:<div className="flex h-40 items-center justify-center bg-slate-100"><FaBook className="text-5xl text-slate-300"/></div>}<div className="p-5"><div className="text-xs font-bold text-orange-600">{b.subject_ar||b.book_type}</div><h3 className="font-extrabold text-[#12345b]">{b.title_ar}</h3><button onClick={()=>openBook(b)} className="academy-btn-primary mt-4 w-full">{b.is_downloadable?"فتح / تنزيل":"فتح"}</button></div></div>)}</div>}

function Card({title,value,danger}){return <div className={`academy-card p-5 ${danger?"border-red-200":""}`}><div className="text-sm text-slate-500">{title}</div><div className={`mt-2 text-xl font-extrabold ${danger?"text-red-700":"text-[#12345b]"}`}>{value}</div></div>}
function Stat({title,value}){return <div className="academy-card p-5"><div className="text-sm text-slate-500">{title}</div><div className="mt-2 text-3xl font-extrabold text-[#12345b]">{value}</div></div>}
