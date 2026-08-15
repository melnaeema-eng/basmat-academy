import {useEffect,useState} from "react";
import {FaCheckCircle,FaExclamationTriangle,FaShieldAlt,FaSyncAlt} from "react-icons/fa";
import {getSchoolSecurityDiagnostics} from "../../../services/schoolService";

export default function SchoolSecurity(){
 const[data,setData]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState("");
 async function load(){try{setLoading(true);setData(await getSchoolSecurityDiagnostics());setError("")}catch(e){setError(e.message)}finally{setLoading(false)}}
 useEffect(()=>{load()},[]);
 const h=data?.health||{};
 const ok=h.status==="OK";
 return <div>
  <div className="flex flex-wrap items-end justify-between gap-3">
   <div><h1 className="text-3xl font-extrabold text-[#12345b]">أمن وصحة نظام المدرسة</h1><p className="mt-2 text-slate-500">فحص موحد للربط والصلاحيات والدوال الأساسية قبل ظهور الأخطاء للمستخدم.</p></div>
   <button onClick={load} disabled={loading} className="academy-btn-dark"><FaSyncAlt/>إعادة الفحص</button>
  </div>
  {error&&<div className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}
  <div className={`mt-6 rounded-2xl p-5 ${ok?"bg-emerald-50 text-emerald-800":"bg-amber-50 text-amber-800"}`}>
   <div className="flex items-center gap-3 text-xl font-extrabold">{ok?<FaCheckCircle/>:<FaExclamationTriangle/>}الحالة: {h.status||"..."}</div>
  </div>
  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
   <Card t="دوال أساسية مفقودة" v={h.missing_core_functions||0}/>
   <Card t="تعارضات نفس الدور" v={h.same_role_auth_conflicts||0}/>
   <Card t="معلمون غير مربوطين" v={h.active_teachers_unlinked||0}/>
   <Card t="معلمون بلا تكليف" v={h.teachers_without_assignments||0}/>
   <Card t="طلاب بدون Login" v={h.active_students_without_login||0} note="ليس خطأ إذا الطالب لا يحتاج بوابة"/>
   <Card t="أولياء أمور غير مربوطين" v={h.active_parents_unlinked||0}/>
   <Card t="موظفون غير مربوطين" v={h.active_employees_unlinked||0}/>
   <Card t="Enrollments بلا فصل" v={h.active_enrollments_without_class||0}/>
  </div>
  <div className="academy-card mt-6 p-5">
   <h2 className="flex items-center gap-2 font-extrabold text-[#12345b]"><FaShieldAlt/>الأدوار الحالية لحسابك</h2>
   <div className="mt-3 flex flex-wrap gap-2">{(data?.my_roles||[]).map(r=><span key={r} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold">{r}</span>)}</div>
  </div>
  {(data?.same_role_conflicts||[]).length>0&&<div className="academy-card mt-6 p-5"><h2 className="font-extrabold text-red-700">تعارضات تحتاج مراجعة</h2><pre className="mt-3 overflow-auto text-xs">{JSON.stringify(data.same_role_conflicts,null,2)}</pre></div>}
 </div>
}
function Card({t,v,note}){return <div className="academy-card p-5"><div className="text-sm text-slate-500">{t}</div><div className="mt-2 text-3xl font-extrabold text-[#12345b]">{v}</div>{note&&<div className="mt-2 text-xs text-slate-400">{note}</div>}</div>}
