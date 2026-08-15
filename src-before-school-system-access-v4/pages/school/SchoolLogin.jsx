import {useEffect,useState} from "react";
import {Link,useNavigate} from "react-router-dom";
import {supabase} from "../../services/supabase";
import {resolveSchoolDestination} from "../../services/schoolAccessService";

export default function SchoolLogin(){
 const nav=useNavigate();
 const[form,setForm]=useState({email:"",password:""});
 const[loading,setLoading]=useState(false),[checking,setChecking]=useState(true),[error,setError]=useState("");

 async function routeUser(){
  const r=await resolveSchoolDestination();
  if(!r.destination){
   await supabase.auth.signOut();
   throw new Error("هذا الحساب لا يملك صلاحية دخول إلى المدرسة.");
  }
  nav(r.destination,{replace:true});
 }
 useEffect(()=>{let on=true;(async()=>{try{const{data}=await supabase.auth.getSession();if(data.session?.user)await routeUser()}catch(e){if(on)setError(e.message)}finally{if(on)setChecking(false)}})();return()=>{on=false}},[]);

 async function submit(e){
  e.preventDefault();setLoading(true);setError("");
  try{
   const{error}=await supabase.auth.signInWithPassword({
    email:form.email.trim().toLowerCase(),password:form.password
   });
   if(error)throw error;
   await routeUser();
  }catch(e){
   setError(e.message==="Invalid login credentials"?"البريد الإلكتروني أو كلمة المرور غير صحيحة.":e.message);
  }finally{setLoading(false)}
 }
 if(checking)return <div dir="rtl" className="grid min-h-screen place-items-center bg-slate-50">جاري التحقق من حساب المدرسة...</div>;
 return <div dir="rtl" className="grid min-h-screen place-items-center bg-slate-50 p-4">
  <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
   <div className="text-center"><div className="text-sm font-bold text-orange-500">نوابغ الجزيرة</div><h1 className="mt-2 text-3xl font-extrabold text-[#12345b]">دخول المدرسة</h1><p className="mt-2 text-slate-500">للإدارة والمعلمين والطلاب وأولياء الأمور والموظفين.</p></div>
   {error&&<div className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
   <form onSubmit={submit} className="mt-6 space-y-4">
    <label className="block"><span className="mb-1.5 block font-bold">البريد الإلكتروني</span><input required type="email" className="academy-input" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
    <label className="block"><span className="mb-1.5 block font-bold">كلمة المرور</span><input required type="password" className="academy-input" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>
    <button disabled={loading} className="academy-btn-primary w-full">{loading?"جاري الدخول...":"دخول المدرسة"}</button>
   </form>
   <div className="mt-6 border-t pt-5 text-center text-sm text-slate-500">طالب في الأكاديمية وليس المدرسة؟ <Link to="/login" className="font-bold text-orange-600">دخول الأكاديمية</Link></div>
  </div>
 </div>
}
