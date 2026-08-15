import {useEffect,useState} from "react";
import {getCurrentSchoolAccess} from "../../../services/schoolAccessService";

const portals=[
 ["school_admin","إدارة المدرسة","/school/admin"],
 ["finance","الحسابات والمالية","/school/admin/finance"],
 ["hr","الموارد البشرية","/school/admin/hr-center"],
 ["admissions","القبول والتسجيل","/school/admin/admissions"],
 ["student_affairs","شؤون الطلاب","/school/admin/student-affairs"],
 ["teacher","بوابة المعلم","/school/teacher"],
 ["parent","بوابة ولي الأمر","/school/parent"],
 ["student","بوابة الطالب","/school/student"],
 ["employee","بوابة الموظف","/school/employee"]
];

export default function SchoolPortalDirectory(){
 const[data,setData]=useState({roles:[],destinations:{}});
 useEffect(()=>{getCurrentSchoolAccess().then(setData).catch(()=>{})},[]);
 return <div>
  <h1 className="text-3xl font-extrabold text-[#12345b]">بوابات المدرسة والصلاحيات</h1>
  <p className="mt-2 text-slate-500">جميع بوابات النظام موجودة هنا. حالة "مسموح" تعني أن حسابك الحالي يستطيع الدخول، وليست حالة وجود البوابة نفسها.</p>
  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
   {portals.map(([role,title,path])=>{
    const allowed=role==="finance"||role==="hr"||role==="admissions"||role==="student_affairs"
      ? Boolean(data.destinations?.[role])
      : (data.roles||[]).includes(role);
    return <div key={role} className="academy-card p-5">
      <div className="flex items-start justify-between gap-3">
       <div><h2 className="font-extrabold text-[#12345b]">{title}</h2><div dir="ltr" className="mt-1 text-xs text-slate-400">{path}</div></div>
       <span className={`rounded-full px-3 py-1 text-xs font-bold ${allowed?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-500"}`}>{allowed?"مسموح لحسابك":"غير مخصص لحسابك"}</span>
      </div>
      {allowed&&<a href={path} className="academy-btn-dark mt-4 inline-flex">فتح البوابة</a>}
    </div>
   })}
  </div>
  <div className="academy-card mt-6 p-5 text-sm text-slate-600">
   <b>قاعدة النظام:</b> الطالب يدخل ببيانات الطالب، المعلم ببيانات المعلم، ولي الأمر ببيانات ولي الأمر. حساب الإدارة لا يصبح طالبًا أو موظفًا تلقائيًا إلا إذا كان مرتبطًا فعليًا بذلك الدور.
  </div>
 </div>
}
