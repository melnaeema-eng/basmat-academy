import {useEffect,useState} from "react";
import {useParams} from "react-router-dom";
import {FaCheckCircle,FaTimesCircle} from "react-icons/fa";
import {verifySchoolCertificate} from "../../services/schoolService";

export default function SchoolCertificateVerify(){
 const{code}=useParams();const[data,setData]=useState(null);
 useEffect(()=>{verifySchoolCertificate(code).then(setData).catch(()=>setData({valid:false,not_found:true}))},[code]);
 if(!data)return <div className="min-h-screen bg-slate-50 p-8 text-center">جاري التحقق...</div>;
 return <div className="min-h-screen bg-slate-50 p-6"><div className="mx-auto mt-12 max-w-xl rounded-3xl bg-white p-8 shadow-sm">
  {data.valid?<><FaCheckCircle className="mx-auto text-6xl text-emerald-500"/><h1 className="mt-4 text-center text-2xl font-extrabold text-[#12345b]">شهادة صحيحة</h1><div className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-5"><Row l="رقم الشهادة" v={data.certificate_no}/><Row l="الطالب" v={data.student_name_ar}/><Row l="الرقم المدرسي" v={data.student_no}/><Row l="العام الدراسي" v={data.academic_year}/><Row l="الصف" v={data.grade_ar}/><Row l="المنهج" v={data.curriculum_ar}/><Row l="المعدل" v={data.average_score==null?"—":`${data.average_score}%`}/><Row l="تاريخ الإصدار" v={data.issued_on}/></div></>:<><FaTimesCircle className="mx-auto text-6xl text-red-500"/><h1 className="mt-4 text-center text-2xl font-extrabold text-red-700">{data.not_found?"الشهادة غير موجودة":"الشهادة غير صالحة"}</h1>{data.revoked_reason&&<div className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{data.revoked_reason}</div>}</>}
 </div></div>
}
function Row({l,v}){return <div className="flex justify-between gap-4 border-b pb-2 text-sm"><span className="text-slate-500">{l}</span><b>{v||"—"}</b></div>}
