import {useEffect,useState} from "react";
import {FaCheckCircle,FaDownload,FaExclamationTriangle,FaShieldAlt,FaSyncAlt} from "react-icons/fa";
import {getSchoolControlCenter,getSchoolExportSummary} from "../../../services/schoolService";

export default function SchoolControlCenter(){
 const[data,setData]=useState(null),[busy,setBusy]=useState(false);
 async function load(){try{setBusy(true);setData(await getSchoolControlCenter())}catch(e){alert(e.message)}finally{setBusy(false)}}
 useEffect(()=>{load()},[]);
 async function exportJson(){
  try{
   const d=await getSchoolExportSummary();
   const blob=new Blob([JSON.stringify(d,null,2)],{type:"application/json"});
   const url=URL.createObjectURL(blob);
   const a=document.createElement("a");
   a.href=url;a.download=`school-export-${new Date().toISOString().slice(0,10)}.json`;a.click();
   URL.revokeObjectURL(url);
  }catch(e){alert(e.message)}
 }
 const r=data?.readiness||{},c=r.checks||{},academic=data?.academic||{},finance=data?.finance||{},hr=data?.hr||{},security=data?.security||{};
 const ok=r.status==="READY";
 return <div>
  <div className="flex flex-wrap items-end justify-between gap-3">
   <div><h1 className="text-3xl font-extrabold text-[#12345b]">مركز التحكم النهائي</h1><p className="mt-2 text-slate-500">حالة المدرسة، الجاهزية للإنتاج، الأكاديميات، المالية، الموارد البشرية والأمان في شاشة واحدة.</p></div>
   <div className="flex gap-2"><button onClick={load} disabled={busy} className="academy-btn-dark"><FaSyncAlt/>إعادة الفحص</button><button onClick={exportJson} className="academy-btn-primary"><FaDownload/>تصدير ملخص JSON</button></div>
  </div>

  <div className={`mt-6 rounded-2xl p-5 ${ok?"bg-emerald-50 text-emerald-800":r.status==="BLOCKED"?"bg-red-50 text-red-800":"bg-amber-50 text-amber-800"}`}>
   <div className="flex items-center gap-3 text-xl font-extrabold">{ok?<FaCheckCircle/>:<FaExclamationTriangle/>}حالة الجاهزية: {r.status||"..."}</div>
   <div className="mt-2 text-sm">Critical: {r.critical_issues||0} • Warnings: {r.warnings||0}</div>
  </div>

  <h2 className="mt-7 text-xl font-extrabold text-[#12345b]">فحوص الإنتاج</h2>
  <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
   <Card t="دوال أساسية مفقودة" v={c.missing_core_functions}/>
   <Card t="جداول بدون RLS" v={c.school_tables_rls_disabled}/>
   <Card t="حسابات بريد غير مربوطة" v={c.email_accounts_unlinked}/>
   <Card t="تسجيلات بلا فصل" v={c.active_enrollments_without_class}/>
   <Card t="معلمون بلا تكليف" v={c.active_teachers_without_assignments}/>
   <Card t="طلاب بلا خطة رسوم" v={c.active_enrollments_without_fee_plan}/>
   <Card t="Orphan Records" v={c.orphan_records}/>
   <Card t="عدد الأعوام الحالية" v={c.current_academic_year_count}/>
  </div>

  <h2 className="mt-7 text-xl font-extrabold text-[#12345b]">التشغيل الأكاديمي</h2>
  <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
   <Card t="الطلاب" v={academic.students}/><Card t="أولياء الأمور" v={academic.parents}/><Card t="المعلمون" v={academic.teachers}/><Card t="التسجيلات" v={academic.active_enrollments}/>
   <Card t="الفصول" v={academic.active_sections}/><Card t="تكليفات المعلمين" v={academic.teacher_assignments}/><Card t="حصص الجدول" v={academic.timetable_entries}/><Card t="سجلات الحضور" v={academic.attendance_records}/>
  </div>

  <h2 className="mt-7 text-xl font-extrabold text-[#12345b]">المالية والموارد البشرية</h2>
  <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
   <Card t="تحصيل الطلاب" v={`${Number(finance.student_payments_total||0).toFixed(2)} SAR`}/>
   <Card t="المصروفات" v={`${Number(finance.expense_total||0).toFixed(2)} SAR`}/>
   <Card t="الموظفون النشطون" v={hr.employees_active}/>
   <Card t="العقود النشطة" v={hr.active_contracts}/>
  </div>

  <div className="academy-card mt-7 p-5">
   <h2 className="flex items-center gap-2 font-extrabold text-[#12345b]"><FaShieldAlt/>الأمان</h2>
   <pre className="mt-3 overflow-auto rounded-xl bg-slate-50 p-4 text-xs">{JSON.stringify(security,null,2)}</pre>
  </div>
 </div>
}
function Card({t,v}){return <div className="academy-card p-5"><div className="text-sm text-slate-500">{t}</div><div className="mt-2 text-2xl font-extrabold text-[#12345b]">{v??0}</div></div>}
