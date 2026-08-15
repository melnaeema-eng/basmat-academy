import {useEffect,useState} from "react";
import QRCode from "qrcode";
import {FaAward,FaPrint} from "react-icons/fa";
import {getMySchoolAcademicRecords} from "../../../services/schoolService";

export default function StudentAcademicRecords(){
 const[data,setData]=useState(null),[tab,setTab]=useState("annual");
 useEffect(()=>{getMySchoolAcademicRecords().then(setData).catch(e=>alert(e.message))},[]);
 return <div>
  <h1 className="text-3xl font-extrabold text-[#12345b]">سجلي الأكاديمي</h1>
  <p className="mt-2 text-slate-500">النتائج السنوية، كشف الدرجات والشهادات.</p>
  <div className="mt-5 flex gap-2">{[["annual","النتائج السنوية"],["terms","بطاقات الفصول"],["transcript","كشف الدرجات"],["certificates","الشهادات"]].map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={`rounded-xl px-4 py-2 font-bold ${tab===k?"bg-orange-500 text-white":"bg-white"}`}>{l}</button>)}</div>

  {tab==="annual"&&<div className="mt-5 grid gap-4 md:grid-cols-2">{(data?.annual||[]).map(r=><div key={r.id} className="academy-card p-5"><div className="text-xs font-bold text-orange-600">{r.school_academic_years?.name}</div><h2 className="mt-1 font-extrabold text-[#12345b]">{r.school_grade_levels?.name_ar}</h2><div className="mt-4 text-4xl font-extrabold">{r.average_score??"—"}%</div><div className="mt-2 text-sm">النتيجة: <b>{r.result_status}</b> • الترتيب: <b>{r.rank_in_class||"—"}</b></div></div>)}</div>}

  {tab==="terms"&&<div className="mt-5 grid gap-4 md:grid-cols-2">{(data?.reportCards||[]).map(r=><div key={r.id} className="academy-card p-5"><div className="text-xs font-bold text-orange-600">{r.school_academic_years?.name} • الفصل الدراسي {r.term_no}</div><div className="mt-3 text-4xl font-extrabold text-[#12345b]">{r.average_score??"—"}%</div><div className="mt-2 text-sm">النتيجة: <b>{r.result_status}</b></div><div className="mt-2 text-sm text-slate-500">حاضر {r.attendance_present} • غائب {r.attendance_absent}</div><button onClick={()=>window.print()} className="academy-btn-dark mt-4"><FaPrint/>طباعة</button></div>)}</div>}

  {tab==="transcript"&&<div className="academy-card mt-5 p-6"><div className="flex justify-between"><div><h2 className="text-2xl font-extrabold text-[#12345b]">كشف الدرجات</h2><div>{data?.student?.full_name_ar} — {data?.student?.student_no}</div></div><button onClick={()=>window.print()} className="academy-btn-dark"><FaPrint/>طباعة</button></div><div className="mt-5 space-y-5">{(data?.transcript?.years||[]).map((y,i)=><section key={i} className="rounded-2xl border p-5"><div className="flex justify-between"><div><b>{y.academic_year}</b><div className="text-sm text-slate-500">{y.grade_ar} • {y.curriculum_ar}</div></div><b>{y.annual_average??"—"}%</b></div><div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50 text-right"><th className="p-2">المادة</th><th>الدرجة</th><th>من</th><th>%</th></tr></thead><tbody>{(y.subjects||[]).map((s,j)=><tr key={j} className="border-t"><td className="p-2">{s.subject_ar}</td><td>{s.score}</td><td>{s.max_score}</td><td>{s.percentage}%</td></tr>)}</tbody></table></div></section>)}</div></div>}

  {tab==="certificates"&&<div className="mt-5 grid gap-4 md:grid-cols-2">{(data?.certificates||[]).map(c=><StudentCertificate key={c.id} c={c}/>)}</div>}
 </div>
}

function StudentCertificate({c}){
 const[qr,setQr]=useState("");
 useEffect(()=>{
  if(!c.verification_code)return;
  const url=`${window.location.origin}/school/verify-certificate/${c.verification_code}`;
  QRCode.toDataURL(url,{width:180,margin:1}).then(setQr).catch(()=>{});
 },[c.verification_code]);
 return <div className="academy-card p-6 text-center">
  <FaAward className="mx-auto text-4xl text-orange-500"/>
  <div className="mt-3 text-xs font-bold text-orange-600">{c.certificate_no}</div>
  <h2 className="mt-1 text-xl font-extrabold text-[#12345b]">{c.title_ar}</h2>
  <div className="mt-2 text-sm text-slate-500">{c.school_academic_years?.name} • {c.school_grade_levels?.name_ar}</div>
  {qr&&<img src={qr} alt="QR verification" className="mx-auto mt-4 h-36 w-36"/>}
  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs">رمز التحقق: <b dir="ltr">{c.verification_code}</b></div>
  <button onClick={()=>window.print()} className="academy-btn-dark mt-4"><FaPrint/>طباعة</button>
 </div>
}
