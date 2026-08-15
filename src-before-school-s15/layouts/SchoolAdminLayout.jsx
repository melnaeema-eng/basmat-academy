import {NavLink,Outlet} from "react-router-dom";
import {FaBook,FaCalendarAlt,FaChalkboard,FaHome,FaLayerGroup,FaSchool,FaUserGraduate,FaUsers,FaWallet,FaChalkboardTeacher,FaClock,FaClipboardCheck,FaTasks,FaFileAlt,FaChartBar,FaChalkboardTeacher as FaClassTeacher,FaMoneyCheckAlt,FaCalculator,FaFileContract,FaUserClock,FaPlaneDeparture,FaBookReader,FaUserPlus,FaQuestionCircle,FaLaptop,FaAward,FaBullhorn} from "react-icons/fa";
const items=[
 ["/school/admin",FaHome,"الرئيسية"],
 ["/school/admin/years",FaCalendarAlt,"السنوات الدراسية"],
 ["/school/admin/structure",FaLayerGroup,"المراحل والصفوف"],
 ["/school/admin/subjects",FaBook,"المواد"],
 ["/school/admin/classes",FaChalkboard,"الفصول"],
 ["/school/admin/students",FaUserGraduate,"الطلاب"],
 ["/school/admin/parents",FaUsers,"أولياء الأمور"],
 ["/school/admin/finance",FaWallet,"الرسوم والأقساط"],
 ["/school/admin/teachers",FaChalkboardTeacher,"المعلمون"],
 ["/school/admin/timetable",FaClock,"الجدول الدراسي"],
 ["/school/admin/attendance",FaClipboardCheck,"الحضور والغياب"],
 ["/school/admin/assignments",FaTasks,"الواجبات"],
 ["/school/admin/class-teachers",FaClassTeacher,"معلم الصف"],
 ["/school/admin/exams",FaFileAlt,"الامتحانات"],
 ["/school/admin/results",FaChartBar,"النتائج"],
 ["/school/admin/employees",FaUsers,"الموظفون"],
 ["/school/admin/payroll",FaMoneyCheckAlt,"الرواتب"],
 ["/school/admin/accounting",FaCalculator,"المحاسبة"],
 ["/school/admin/contracts",FaFileContract,"العقود"],
 ["/school/admin/staff-attendance",FaUserClock,"حضور الموظفين"],
 ["/school/admin/leave",FaPlaneDeparture,"الإجازات"],
 ["/school/admin/library",FaBookReader,"المكتبة الرقمية"],
 ["/school/admin/admissions",FaUserPlus,"القبول والتسجيل"],
 ["/school/admin/question-bank",FaQuestionCircle,"بنك الأسئلة"],
 ["/school/admin/online-exams",FaLaptop,"الامتحانات الإلكترونية"],
 ["/school/admin/academic-records",FaAward,"السجل الأكاديمي والشهادات"],
 ["/school/admin/communications",FaBullhorn,"التواصل والإشعارات"]
];
export default function SchoolAdminLayout(){
 return <div dir="rtl" className="min-h-screen bg-[#f6f8fb] lg:flex">
  <aside className="bg-[#12345b] text-white lg:min-h-screen lg:w-[280px] lg:shrink-0">
   <div className="border-b border-white/10 p-5">
    <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-xl"><FaSchool/></div><div><div className="font-extrabold">نوابغ الجزيرة</div><div className="mt-1 text-xs text-slate-300">Nawabigh Aljazeera School</div></div></div>
   </div>
   <nav className="flex gap-2 overflow-x-auto p-3 lg:block lg:space-y-1">{items.map(([to,Icon,label])=><NavLink end={to==="/school/admin"} key={to} to={to} className={({isActive})=>`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold ${isActive?"bg-[#f97316] text-white":"text-slate-200 hover:bg-white/10"}`}><Icon/>{label}</NavLink>)}</nav>
  </aside>
  <main className="min-w-0 flex-1 p-4 md:p-7"><div className="mx-auto max-w-[1500px]"><Outlet/></div></main>
 </div>
}
