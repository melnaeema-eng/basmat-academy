import {useEffect,useState} from "react";
import {FaBook,FaChalkboard,FaGraduationCap,FaLanguage,FaLayerGroup,FaMoneyBillWave,FaUsers,FaUserGraduate} from "react-icons/fa";
import {getSchoolCore,getSchoolS2Health,getSchoolS3Health,getSchoolS4Health,getSchoolS5Health} from "../../../services/schoolService";

export default function SchoolDashboard(){
 const[data,setData]=useState(null),[s2,setS2]=useState(null),[s3,setS3]=useState(null),[s4,setS4]=useState(null),[s5,setS5]=useState(null),[error,setError]=useState("");
 useEffect(()=>{Promise.all([getSchoolCore(),getSchoolS2Health(),getSchoolS3Health(),getSchoolS4Health(),getSchoolS5Health()]).then(([a,b,c,d,e])=>{setData(a);setS2(b);setS3(c);setS4(d);setS5(e)}).catch(e=>setError(e.message))},[]);
 const h=data?.health||{};
 const cards=[
  ["المراحل",h.stages||0,FaLayerGroup],
  ["المستويات",h.grade_levels||0,FaGraduationCap],
  ["المناهج",h.curricula||0,FaLanguage],
  ["المواد",h.subjects||0,FaBook],
  ["الفصول",h.class_sections||0,FaChalkboard],
  ["الطلاب",s2?.students||0,FaUserGraduate],
  ["أولياء الأمور",s2?.parents||0,FaUsers],
  ["دفعات مسجلة",s2?.payments||0,FaMoneyBillWave],
  ["المعلمون",s3?.teachers||0,FaUsers],
  ["حصص الجدول",s3?.timetable_entries||0,FaBook],
  ["جلسات حضور",s3?.attendance_sessions||0,FaGraduationCap],
  ["الواجبات",s3?.assignments||0,FaBook],
  ["الامتحانات",s4?.exams||0,FaBook],
  ["النتائج",s4?.results||0,FaGraduationCap],
  ["الموظفون",s5?.employees||0,FaUsers],
  ["قيود مالية",s5?.finance_transactions||0,FaMoneyBillWave],
 ];
 return <div>
  <div className="mb-7 rounded-[28px] bg-gradient-to-br from-[#12345b] to-[#1e4b79] p-7 text-white">
   <div className="text-sm font-bold text-orange-300">School Management System</div>
   <h1 className="mt-2 text-3xl font-extrabold">نوابغ الجزيرة</h1>
   <p className="mt-2 max-w-3xl text-slate-200">KG1–KG3 / المستوى الأول–الثالث • Grade 1–12 • عربي/English • طلاب • أولياء أمور • رسوم وأقساط</p>
  </div>
  {error&&<div className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value,Icon])=><div key={label} className="academy-card p-5"><div className="flex items-center justify-between"><div><div className="text-sm text-slate-500">{label}</div><div className="mt-2 text-3xl font-extrabold text-[#12345b]">{data?value:"…"}</div></div><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><Icon/></div></div></div>)}</div>
  <div className="mt-6 grid gap-5 lg:grid-cols-3">
   <Card title="التسجيل الأكاديمي" text={`${s2?.active_enrollments||0} تسجيل نشط`}/>
   <Card title="الأقساط" text={`${s2?.installments||0} قسط • ${s2?.overdue_installments||0} متأخر`}/>
   <Card title="الربط الأسري" text={`${s2?.parent_links||0} علاقة ولي أمر/طالب`}/>
  </div>
 </div>
}
function Card({title,text}){return <div className="academy-card p-6"><h2 className="text-xl font-extrabold text-[#12345b]">{title}</h2><p className="mt-2 leading-7 text-slate-500">{text}</p></div>}
