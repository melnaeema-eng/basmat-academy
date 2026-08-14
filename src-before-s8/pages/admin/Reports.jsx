import {useEffect,useMemo,useState} from "react";
import {useTranslation} from "react-i18next";
import {FaBookOpen,FaCertificate,FaDownload,FaFileInvoiceDollar,FaGraduationCap,FaUsers} from "react-icons/fa";
import {AdminPageHeader,AdminCard,AdminTable,Directional,StatusBadge} from "../../components/admin/AdminUI";
import {getAdminReportData} from "../../services/professionalAcademyService";

export default function AdminReports(){
 const {i18n}=useTranslation();const ar=i18n.language?.startsWith("ar");
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 async function load(){try{setLoading(true);setError("");setData(await getAdminReportData())}catch(e){setError(e.message)}finally{setLoading(false)}}useEffect(()=>{load()},[]);
 const paidTotal=useMemo(()=>data?(data.payments||[]).filter(x=>x.status==="paid").reduce((s,x)=>s+Number(x.amount||0),0):0,[data]);
 const pendingTotal=useMemo(()=>data?(data.payments||[]).filter(x=>x.status==="pending").reduce((s,x)=>s+Number(x.amount||0),0):0,[data]);
 const topCourses=useMemo(()=>{if(!data)return[];const m={};for(const e of data.enrollments||[]){const id=e.course_id;m[id]??={title:e.courses?.title||id,count:0};m[id].count++}return Object.values(m).sort((a,b)=>b.count-a.count).slice(0,8)},[data]);
 function exportCsv(){
  if(!data)return;
  const rows=[["Metric","Value"],["Students",data.counts.students],["Courses",data.counts.courses],["Exams",data.counts.exams],["Certificates",data.counts.certificates],["Paid Amount",paidTotal],["Pending Amount",pendingTotal],[],["Top Course","Enrollments"],...topCourses.map(x=>[x.title,x.count])];
  const csv=rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`academy-report-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
 }
 if(loading)return <AdminCard className="p-10 text-center">{ar?"جاري تحميل التقارير...":"Loading reports..."}</AdminCard>;
 return <div><AdminPageHeader title={ar?"التقارير والتحليلات":"Reports & Analytics"} description={ar?"مؤشرات الإدارة والتسجيلات والمدفوعات والشهادات.":"Management indicators for enrollments, payments and certificates."} actions={<button onClick={exportCsv} className="academy-btn-primary"><FaDownload/>{ar?"تصدير CSV":"Export CSV"}</button>}/>
 {error&&<div className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}{data&&<>
 <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6"><Metric icon={<FaUsers/>} label={ar?"الطلاب":"Students"} value={data.counts.students}/><Metric icon={<FaBookOpen/>} label={ar?"الدورات":"Courses"} value={data.counts.courses}/><Metric icon={<FaGraduationCap/>} label={ar?"الاختبارات":"Exams"} value={data.counts.exams}/><Metric icon={<FaCertificate/>} label={ar?"الشهادات":"Certificates"} value={data.counts.certificates}/><Metric icon={<FaFileInvoiceDollar/>} label={ar?"مدفوع مؤكد":"Paid"} value={`${paidTotal.toFixed(2)} SAR`} ltr/><Metric icon={<FaFileInvoiceDollar/>} label={ar?"قيد المراجعة":"Pending"} value={`${pendingTotal.toFixed(2)} SAR`} ltr/></div>
 <div className="mt-6 grid gap-6 xl:grid-cols-2"><AdminCard className="p-5"><h2 className="font-extrabold text-[#08284d]">{ar?"أكثر الدورات تسجيلًا":"Top Courses by Enrollment"}</h2><div className="mt-4 space-y-3">{topCourses.map((x,i)=><div key={x.title} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><div className="min-w-0"><span className="me-2 text-xs font-bold text-orange-600">#{i+1}</span><span className="font-bold text-[#08284d]">{x.title}</span></div><b>{x.count}</b></div>)}{!topCourses.length&&<div className="text-sm text-slate-500">{ar?"لا توجد تسجيلات بعد.":"No enrollments yet."}</div>}</div></AdminCard>
 <AdminCard className="p-5"><h2 className="font-extrabold text-[#08284d]">{ar?"آخر الشهادات":"Recent Certificates"}</h2><div className="mt-4 space-y-3">{(data.certificates||[]).slice(0,8).map(x=><div key={x.id} className="flex items-center justify-between gap-3 border-b pb-3"><span className="font-semibold">{x.courses?.title||x.course_id}</span><StatusBadge status={x.status||"active"}/></div>)}{!data.certificates?.length&&<div className="text-sm text-slate-500">{ar?"لا توجد شهادات.":"No certificates."}</div>}</div></AdminCard></div>
 <div className="mt-6"><AdminPageHeader title={ar?"أحدث المدفوعات":"Recent Payments"}/><AdminTable minWidth="760px"><thead className="bg-[#08284d] text-white"><tr><th className="p-3 text-start">{ar?"الدورة":"Course"}</th><th className="p-3 text-start">{ar?"المبلغ":"Amount"}</th><th className="p-3 text-start">{ar?"الوسيلة":"Method"}</th><th className="p-3 text-start">{ar?"الحالة":"Status"}</th><th className="p-3 text-start">{ar?"التاريخ":"Date"}</th></tr></thead><tbody>{(data.payments||[]).slice(0,20).map(x=><tr key={x.id} className="border-t"><td className="p-3">{x.courses?.title||x.course_id}</td><td className="p-3"><Directional>{Number(x.amount||0).toFixed(2)} SAR</Directional></td><td className="p-3">{x.method}</td><td className="p-3"><StatusBadge status={x.status}/></td><td className="p-3"><Directional>{new Date(x.created_at).toLocaleDateString()}</Directional></td></tr>)}</tbody></AdminTable></div>
 </>}</div>
}
function Metric({icon,label,value,ltr}){return <AdminCard className="p-4"><div className="text-lg text-orange-600">{icon}</div><div className="mt-2 text-xs font-semibold text-slate-500">{label}</div><div dir={ltr?"ltr":undefined} className="mt-1 text-xl font-extrabold text-[#08284d]">{value}</div></AdminCard>}
