import {Link,Outlet,useNavigate} from "react-router-dom";
import {FaHome,FaSchool,FaSignOutAlt} from "react-icons/fa";
import {supabase} from "../services/supabase";
export default function SchoolPortalLayout(){
 const navigate=useNavigate();
 async function logout(){
  try{
   await supabase.auth.signOut({scope:"local"});
  }finally{
   localStorage.removeItem("school_active_role");
   sessionStorage.removeItem("logged_out");
   navigate("/school/login",{replace:true});
  }
 }
 return <div dir="rtl" className="min-h-screen bg-[#f6f8fb]">
  <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4"><Link to="/" className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#12345b] text-white"><FaSchool/></div><div><div className="font-extrabold text-[#12345b]">نوابغ الجزيرة</div><div className="text-xs text-slate-400">School Portal</div></div></Link><div className="flex gap-2"><Link to="/" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-[#12345b]"><FaHome/></Link><button onClick={logout} title="تسجيل الخروج والعودة لدخول المدرسة" className="flex h-10 items-center gap-2 rounded-xl bg-red-50 px-3 font-bold text-red-600"><FaSignOutAlt/><span className="hidden sm:inline">تسجيل الخروج</span></button></div></div></header>
  <main className="mx-auto max-w-7xl p-4 md:p-7"><Outlet/></main>
 </div>
}
