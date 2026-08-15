import {useEffect,useState} from "react";
import {useNavigate} from "react-router-dom";
import {getMySchoolRoles,getSchoolRoleHome} from "../../services/schoolAccessService";

const names={school_admin:"إدارة المدرسة",finance:"الحسابات والمالية",hr:"الموارد البشرية",admissions:"القبول والتسجيل",student_affairs:"شؤون الطلاب",teacher:"المعلم",parent:"ولي الأمر",student:"الطالب",employee:"الموظف"};

export default function SchoolChooseRole(){
 const nav=useNavigate(),[roles,setRoles]=useState([]),[loading,setLoading]=useState(true);
 useEffect(()=>{(async()=>{try{const r=await getMySchoolRoles();if(r.length===1){nav(await getSchoolRoleHome(r[0]),{replace:true});return}setRoles(r)}finally{setLoading(false)}})()},[]);
 async function go(role){localStorage.setItem("school_active_role",role);nav(await getSchoolRoleHome(role),{replace:true})}
 if(loading)return <div className="min-h-screen grid place-items-center">جاري تحديد صلاحيات المدرسة...</div>;
 return <div dir="rtl" className="min-h-screen bg-slate-50 grid place-items-center p-6"><div className="w-full max-w-xl rounded-3xl bg-white p-7 shadow"><h1 className="text-2xl font-extrabold text-[#12345b]">اختر بوابة المدرسة</h1><p className="mt-2 text-slate-500">لديك أكثر من دور في المدرسة. اختر الدور الذي تريد استخدامه الآن.</p><div className="mt-6 grid gap-3 sm:grid-cols-2">{roles.map(r=><button key={r} onClick={()=>go(r)} className="rounded-2xl border p-5 text-right font-extrabold hover:bg-slate-50">{names[r]||r}</button>)}</div>{!roles.length&&<div className="mt-6 rounded-xl bg-amber-50 p-4 text-amber-800">الحساب صحيح، لكن لا توجد له صلاحية مدرسة مفعلة.</div>}</div></div>
}
