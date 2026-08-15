import {useEffect,useMemo,useState} from "react";
import {useNavigate} from "react-router-dom";
import {getCurrentSchoolAccess,localSchoolRoleHome} from "../../services/schoolAccessService";

const labels={
 school_admin:["إدارة المدرسة","إدارة النظام الأكاديمي والتشغيلي"],
 finance:["الحسابات والمالية","الرسوم والتحصيل والمصروفات والرواتب"],
 hr:["الموارد البشرية","الموظفون والعقود والإجازات والتقييم"],
 admissions:["القبول والتسجيل","طلبات القبول والتسجيل"],
 student_affairs:["شؤون الطلاب","الحضور والسلوك والمتابعة"],
 teacher:["بوابة المعلم","الفصول والحضور والواجبات والامتحانات"],
 parent:["بوابة ولي الأمر","الأبناء والحضور والنتائج والرسوم"],
 student:["بوابة الطالب","الجدول والواجبات والامتحانات والنتائج"],
 employee:["بوابة الموظف","خدمات الموظف"]
};

export default function SchoolChooseAccessRole(){
 const nav=useNavigate();
 const[data,setData]=useState({roles:[],destinations:{}}),[loading,setLoading]=useState(true);

 useEffect(()=>{
  getCurrentSchoolAccess()
   .then(d=>{
    if((d.roles||[]).length===1){
      nav(localSchoolRoleHome(d.roles[0]),{replace:true});
      return;
    }
    setData(d);
   })
   .catch(()=>setData({roles:[],destinations:{}}))
   .finally(()=>setLoading(false));
 },[]);

 const roles=useMemo(()=>data.roles||[],[data]);

 if(loading)return <div dir="rtl" className="grid min-h-screen place-items-center bg-slate-50">جاري تحميل صلاحيات المدرسة...</div>;

 return <div dir="rtl" className="grid min-h-screen place-items-center bg-slate-50 p-4">
  <div className="w-full max-w-3xl rounded-3xl bg-white p-8 shadow">
   <h1 className="text-3xl font-extrabold text-[#12345b]">اختر دورك في المدرسة</h1>
   <p className="mt-2 text-slate-500">تظهر هنا فقط البوابات المصرح بها لهذا الحساب. وجود طالب في المدرسة لا يمنح حساب الإدارة دور الطالب تلقائيًا.</p>

   <div className="mt-6 grid gap-3 sm:grid-cols-2">
    {roles.map(r=>{
      const [title,desc]=labels[r]||[r,""];
      return <button key={r} onClick={()=>{localStorage.setItem("school_active_role",r);nav(localSchoolRoleHome(r))}} className="rounded-2xl border p-5 text-right hover:border-orange-400 hover:bg-orange-50">
       <div className="font-extrabold text-[#12345b]">{title}</div>
       <div className="mt-1 text-sm text-slate-500">{desc}</div>
      </button>
    })}
   </div>

   {!roles.length&&<div className="mt-6 rounded-xl bg-amber-50 p-4 text-amber-800">الحساب موجود، لكن لا توجد له أي صلاحية مدرسة مفعلة.</div>}
  </div>
 </div>
}
