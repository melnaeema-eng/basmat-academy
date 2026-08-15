import {useEffect,useState} from "react";
import {useNavigate} from "react-router-dom";
import {FaChalkboardTeacher,FaSchool,FaUserGraduate,FaUsers,FaUserShield} from "react-icons/fa";
import {supabase} from "../../../services/supabase";
import {getSchoolRoles} from "../../../services/authDestination";

const icons={admin:FaUserShield,teacher:FaChalkboardTeacher,parent:FaUsers,student:FaUserGraduate};

export default function SchoolChooseRole(){
 const[roles,setRoles]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const navigate=useNavigate();
 useEffect(()=>{(async()=>{try{
   const{data:{session}}=await supabase.auth.getSession();
   if(!session?.user){navigate("/school/login",{replace:true});return}
   const found=await getSchoolRoles(session.user.id);
   if(found.length===1){navigate(found[0].path,{replace:true});return}
   setRoles(found);
 }catch(e){setError(e.message)}finally{setLoading(false)}})()},[navigate]);
 if(loading)return <div className="p-10 text-center">جاري تحديد أدوار المدرسة...</div>;
 return <div className="mx-auto max-w-3xl">
  <div className="rounded-[28px] bg-[#12345b] p-7 text-white"><FaSchool className="text-3xl text-orange-300"/><h1 className="mt-3 text-3xl font-extrabold">اختر طريقة الدخول</h1><p className="mt-2 text-slate-200">هذا الحساب لديه أكثر من دور في مدرسة نوابغ الجزيرة.</p></div>
  {error&&<div className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}
  <div className="mt-6 grid gap-4 sm:grid-cols-2">{roles.map(r=>{const Icon=icons[r.key]||FaSchool;return <button key={r.key} onClick={()=>navigate(r.path)} className="academy-card flex items-center gap-4 p-6 text-right transition hover:-translate-y-1 hover:shadow-lg"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-2xl text-orange-500"><Icon/></div><div><div className="text-lg font-extrabold text-[#12345b]">الدخول كـ {r.label}</div><div className="mt-1 text-sm text-slate-500">فتح بوابة {r.label}</div></div></button>})}</div>
 </div>
}
