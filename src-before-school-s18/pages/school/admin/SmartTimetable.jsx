import {useEffect,useMemo,useState} from "react";
import {FaClock,FaPlus,FaSave} from "react-icons/fa";
import {getSchoolCore,getSchoolOperationalSetup,getSchoolPeriodSettings,getSchoolTimetable,getSchoolTimetableWeeklyLoad,saveSchoolPeriodSetting,saveSchoolTimetableEntrySmart} from "../../../services/schoolService";

const days=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس"];
export default function SmartTimetable(){
 const[core,setCore]=useState(null),[ops,setOps]=useState(null),[periods,setPeriods]=useState([]),[rows,setRows]=useState([]),[sectionId,setSectionId]=useState(""),[load,setLoad]=useState([]),[tab,setTab]=useState("schedule");
 const[entry,setEntry]=useState({academic_year_id:"",class_section_id:"",subject_id:"",teacher_id:"",weekday:0,period_no:1,room:""});
 const[period,setPeriod]=useState({academic_year_id:"",period_no:1,starts_at:"07:30",ends_at:"08:15",label_ar:"",is_break:false});

 async function refresh(){
  const[c,o,p,t]=await Promise.all([getSchoolCore(),getSchoolOperationalSetup(),getSchoolPeriodSettings(),getSchoolTimetable()]);
  setCore(c);setOps(o);setPeriods(p);setRows(t);
  const sec=sectionId||o.sections?.[0]?.id||"";
  setSectionId(sec);
  const sy=o.current_year?.id||c.years.find(x=>x.is_current)?.id||"";
  setEntry(e=>({...e,academic_year_id:sy,class_section_id:sec}));
  setPeriod(v=>({...v,academic_year_id:sy}));
  if(sec)setLoad(await getSchoolTimetableWeeklyLoad(sec));
 }
 useEffect(()=>{refresh().catch(e=>alert(e.message))},[]);
 useEffect(()=>{if(sectionId)getSchoolTimetableWeeklyLoad(sectionId).then(setLoad).catch(e=>alert(e.message))},[sectionId,rows.length]);

 const section=ops?.sections?.find(x=>x.id===sectionId);
 const assignments=(ops?.teacher_assignments||[]).filter(x=>x.class_section_id===sectionId);
 const subjects=useMemo(()=>[...new Map(assignments.map(x=>[x.subject_id,{id:x.subject_id,name:x.subject_ar}])).values()],[assignments]);
 const teachers=useMemo(()=>[...new Map(assignments.filter(x=>!entry.subject_id||x.subject_id===entry.subject_id).map(x=>[x.teacher_id,{id:x.teacher_id,name:x.teacher_name}])).values()],[assignments,entry.subject_id]);

 async function saveEntry(e){
  e.preventDefault();
  try{
   await saveSchoolTimetableEntrySmart({...entry,class_section_id:sectionId,academic_year_id:section?.academic_year_id||entry.academic_year_id});
   setEntry(x=>({...x,subject_id:"",teacher_id:"",room:""}));
   await refresh();
  }catch(err){alert(err.message)}
 }
 async function savePeriod(e){
  e.preventDefault();
  try{await saveSchoolPeriodSetting(period);await refresh();alert("تم حفظ وقت الحصة")}catch(err){alert(err.message)}
 }

 return <div><div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-extrabold text-[#12345b]">الجدول الذكي</h1><p className="mt-2 text-slate-500">توزيع الحصص مع منع تعارض المعلم والفصل ومتابعة الحمل الأسبوعي لكل مادة.</p></div><div className="flex gap-2"><button onClick={()=>setTab("schedule")} className={`rounded-xl px-4 py-2 font-bold ${tab==="schedule"?"bg-[#12345b] text-white":"bg-white border"}`}>الجدول</button><button onClick={()=>setTab("periods")} className={`rounded-xl px-4 py-2 font-bold ${tab==="periods"?"bg-[#12345b] text-white":"bg-white border"}`}>أوقات الحصص</button></div></div>

 {tab==="schedule"&&<>
  <div className="academy-card mt-5 p-5"><label className="block max-w-xl"><span className="mb-1 block text-sm font-bold">الفصل</span><select className="academy-input" value={sectionId} onChange={e=>{setSectionId(e.target.value);setEntry(x=>({...x,class_section_id:e.target.value}))}}>{(ops?.sections||[]).map(x=><option key={x.id} value={x.id}>{x.grade_ar} / {x.curriculum_ar} / {x.section_name}</option>)}</select></label></div>

  <div className="mt-5 grid gap-6 xl:grid-cols-[400px_1fr]">
   <form onSubmit={saveEntry} className="academy-card space-y-4 p-5">
    <h2 className="font-extrabold text-[#12345b]">إضافة حصة</h2>
    <F l="اليوم"><select className="academy-input" value={entry.weekday} onChange={e=>setEntry({...entry,weekday:e.target.value})}>{days.map((d,i)=><option key={d} value={i}>{d}</option>)}</select></F>
    <F l="الحصة"><select className="academy-input" value={entry.period_no} onChange={e=>setEntry({...entry,period_no:e.target.value})}>{periods.filter(x=>!x.is_break).map(x=><option key={x.id} value={x.period_no}>{x.period_no} — {String(x.starts_at).slice(0,5)}-{String(x.ends_at).slice(0,5)}</option>)}</select></F>
    <F l="المادة"><select required className="academy-input" value={entry.subject_id} onChange={e=>setEntry({...entry,subject_id:e.target.value,teacher_id:""})}><option value="">اختر</option>{subjects.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></F>
    <F l="المعلم"><select required className="academy-input" value={entry.teacher_id} onChange={e=>setEntry({...entry,teacher_id:e.target.value})}><option value="">اختر</option>{teachers.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></F>
    <F l="الغرفة"><input className="academy-input" value={entry.room} onChange={e=>setEntry({...entry,room:e.target.value})}/></F>
    <button className="academy-btn-primary w-full"><FaPlus/>إضافة الحصة</button>
   </form>

   <div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{load.map(x=><div key={x.subject_id} className="academy-card p-4"><div className="font-extrabold text-[#12345b]">{x.subject_ar}</div><div className="mt-2 text-sm">المطلوب {x.required_periods} • المجدول {x.scheduled_periods} • المتبقي <b>{x.remaining_periods}</b></div></div>)}</div>
    <div className="mt-5 space-y-4">{days.map((d,i)=><div key={d} className="academy-card overflow-hidden"><div className="bg-[#12345b] px-5 py-3 font-extrabold text-white">{d}</div>{rows.filter(x=>x.class_section_id===sectionId&&Number(x.weekday)===i).sort((a,b)=>a.period_no-b.period_no).map(x=><div key={x.id} className="grid gap-2 border-t p-4 text-sm md:grid-cols-5"><b>الحصة {x.period_no}</b><span>{x.school_subjects?.name_ar}</span><span>{x.school_teachers?.full_name_ar}</span><span dir="ltr">{String(x.starts_at).slice(0,5)}-{String(x.ends_at).slice(0,5)}</span><span>{x.room||"—"}</span></div>)}{!rows.some(x=>x.class_section_id===sectionId&&Number(x.weekday)===i)&&<div className="p-4 text-sm text-slate-400">لا توجد حصص.</div>}</div>)}</div>
   </div>
  </div>
 </>}

 {tab==="periods"&&<div className="mt-5 grid gap-6 xl:grid-cols-[400px_1fr]">
  <form onSubmit={savePeriod} className="academy-card space-y-4 p-5"><h2 className="font-extrabold text-[#12345b]">إعداد وقت الحصة</h2><F l="رقم الحصة"><input type="number" min="1" className="academy-input" value={period.period_no} onChange={e=>setPeriod({...period,period_no:e.target.value})}/></F><F l="البداية"><input type="time" className="academy-input" value={period.starts_at} onChange={e=>setPeriod({...period,starts_at:e.target.value})}/></F><F l="النهاية"><input type="time" className="academy-input" value={period.ends_at} onChange={e=>setPeriod({...period,ends_at:e.target.value})}/></F><F l="الاسم"><input className="academy-input" value={period.label_ar} onChange={e=>setPeriod({...period,label_ar:e.target.value})}/></F><label className="flex gap-2 font-bold"><input type="checkbox" checked={period.is_break} onChange={e=>setPeriod({...period,is_break:e.target.checked})}/>فسحة / Break</label><button className="academy-btn-primary w-full"><FaSave/>حفظ</button></form>
  <div className="space-y-3">{periods.map(x=><div key={x.id} className="academy-card flex items-center justify-between p-5"><div><b>الحصة {x.period_no}</b><div className="text-sm text-slate-500">{x.label_ar||"—"} • {String(x.starts_at).slice(0,5)} - {String(x.ends_at).slice(0,5)}</div></div><span className="text-sm font-bold">{x.is_break?"فسحة":"حصة"}</span></div>)}</div>
 </div>}
 </div>
}
function F({l,children}){return <label className="block"><span className="mb-1 block text-sm font-bold">{l}</span>{children}</label>}
