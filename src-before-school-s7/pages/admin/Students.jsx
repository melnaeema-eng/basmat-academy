import {useEffect,useMemo,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {FaEye,FaEnvelope,FaPhone,FaSearch,FaSyncAlt} from "react-icons/fa";
import {AdminCard,AdminPageHeader,Directional,StatusBadge} from "../../components/admin/AdminUI";
import {getStudentsAdmin} from "../../services/studentAdminService";

export default function Students(){
 const{t,i18n}=useTranslation();const ar=i18n.language?.startsWith("ar");
 const[rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[q,setQ]=useState(""),[status,setStatus]=useState("all");
 async function load(){try{setLoading(true);setError("");setRows(await getStudentsAdmin())}catch(e){setError(e.message)}finally{setLoading(false)}}useEffect(()=>{load()},[]);
 const filtered=useMemo(()=>{const x=q.trim().toLowerCase();return rows.filter(r=>(status==="all"||(r.account_status||"active")===status)&&(!x||[r.full_name,r.email,r.phone,r.city].filter(Boolean).join(" ").toLowerCase().includes(x)))},[rows,q,status]);
 const counts={all:rows.length,active:rows.filter(x=>(x.account_status||"active")==="active").length,disabled:rows.filter(x=>x.account_status==="disabled").length,archived:rows.filter(x=>x.account_status==="archived").length};
 return <div><AdminPageHeader title={ar?"إدارة الطلاب":"Student Management"} description={ar?"ملفات الطلاب، الحالة، الدورات، المدفوعات، الاختبارات والشهادات.":"Profiles, lifecycle, courses, payments, exams and certificates."} actions={<button onClick={load} className="academy-btn-dark"><FaSyncAlt/>{t("common.refresh")}</button>}/>
 <div className="mb-5 grid gap-3 sm:grid-cols-4">{["all","active","disabled","archived"].map(x=><button key={x} onClick={()=>setStatus(x)} className={`academy-card p-4 text-start ${status===x?"ring-2 ring-orange-400":""}`}><div className="text-xs font-bold text-slate-500">{x==="all"?(ar?"الكل":"All"):x==="active"?(ar?"نشط":"Active"):x==="disabled"?(ar?"معطل":"Disabled"):(ar?"مؤرشف":"Archived")}</div><div className="mt-1 text-2xl font-extrabold text-[#08284d]">{counts[x]}</div></button>)}</div>
 <div className="mb-5 flex max-w-2xl items-center gap-2 rounded-xl border bg-white px-3"><FaSearch className="text-slate-400"/><input className="w-full bg-transparent py-3 outline-none" value={q} onChange={e=>setQ(e.target.value)} placeholder={ar?"بحث بالاسم أو البريد أو الهاتف أو المدينة":"Search name, email, phone or city"}/></div>
 {error&&<div className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}
 {loading?<AdminCard className="p-10 text-center">{t("common.loading")}</AdminCard>:<div className="grid gap-4 xl:grid-cols-2">{filtered.map(s=><AdminCard key={s.id} className="p-5"><div className="flex gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-orange-50 font-extrabold text-orange-600">{s.avatar_url?<img src={s.avatar_url} className="h-full w-full object-cover"/>:(s.full_name||s.email||"S").charAt(0).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-extrabold text-[#08284d]">{s.full_name||s.email}</h3><StatusBadge status={s.account_status||"active"}/></div><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">{s.email&&<span className="flex items-center gap-1"><FaEnvelope/><Directional>{s.email}</Directional></span>}{s.phone&&<span className="flex items-center gap-1"><FaPhone/><Directional>{s.phone}</Directional></span>}</div></div><Link to={`/admin/students/${s.id}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#08284d] text-white" title={ar?"فتح الملف":"Open profile"}><FaEye/></Link></div>
 <div className="mt-4 grid grid-cols-3 gap-2"><Metric label={ar?"الدورات":"Courses"} value={s.enrollments.length}/><Metric label={ar?"المدفوعات":"Payments"} value={s.payments.length}/><Metric label={ar?"الشهادات":"Certificates"} value={s.certificates.length}/></div>
 </AdminCard>)}{!filtered.length&&<AdminCard className="p-10 text-center text-slate-500">{t("common.noResults")}</AdminCard>}</div>}</div>
}
function Metric({label,value}){return <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-xl font-extrabold text-[#08284d]">{value}</div></div>}
