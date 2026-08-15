import {useEffect,useState} from "react";
import {useNavigate} from "react-router-dom";
import {getMySchoolRoles,localSchoolRoleHome} from "../../services/schoolAccessService";
const labels={school_admin:"إدارة المدرسة",finance:"الحسابات والمالية",hr:"الموارد البشرية",admissions:"القبول والتسجيل",student_affairs:"شؤون الطلاب",teacher:"بوابة المعلم",parent:"بوابة ولي الأمر",student:"بوابة الطالب",employee:"بوابة الموظف"};
export default function SchoolChooseAccessRole(){
 const nav=useNavigate(),[roles,setRoles]=useState([]),[loading,setLoading]=useState(true);
 useEffect(()=>{getMySchoolRoles().then(r=>{if(r.length===1){nav(localSchoolRoleHome(r[0]),{replace:true});return}setRoles(r)}).catch(()=>setRoles([])).finally(()=>setLoading(false))},[]);
 if(loading)return <div className="grid min-h-screen place-items-center">جاري تحميل الأدوار...</div>;
 return <div dir="rtl" className="grid min-h-screen place-items-center bg-slate-50 p-4"><div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow"><h1 className="text-2xl font-extrabold text-[#12345b]">اختر دورك في المدرسة</h1><p className="mt-2 text-slate-500">يمكنك العودة لهذه الصفحة لاحقًا للتبديل بين أدوارك.</p><div className="mt-6 grid gap-3 sm:grid-cols-2">{roles.map(r=><button key={r} onClick={()=>{localStorage.setItem("school_active_role",r);nav(localSchoolRoleHome(r))}} className="rounded-2xl border p-5 text-right font-extrabold hover:border-orange-400 hover:bg-orange-50">{labels[r]||r}</button>)}</div>{!roles.length&&<div className="mt-6 rounded-xl bg-amber-50 p-4 text-amber-800">لا توجد صلاحية مدرسة لهذا الحساب.</div>}</div></div>
}
