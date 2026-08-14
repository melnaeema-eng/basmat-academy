import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import {FaClock,FaStar,FaUserGraduate} from "react-icons/fa";

export default function CourseCard({course}){
 const{t,i18n}=useTranslation();const navigate=useNavigate();const ar=i18n.language?.startsWith("ar");
 const title=(ar?course.title_ar:course.title_en)||course.title||t("course.untitled");
 const category=(ar?course.category_ar:course.category_en)||course.category||"Academy";
 const type=(course.course_type||"recorded").toLowerCase();
 const typeLabel=type==="live"?(ar?"مباشر":"Live"):type==="hybrid"?(ar?"هجين":"Hybrid"):(ar?"مسجل":"Recorded");
 return <article className="academy-card group overflow-hidden transition hover:-translate-y-1.5 hover:shadow-2xl">
  <div className="relative overflow-hidden">
   <img src={course.image||"https://placehold.co/800x450?text=Course"} alt={title} className="academy-course-image transition duration-500 group-hover:scale-[1.045]"/>
   <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
    <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-extrabold text-[#08284d] shadow">{category}</span>
    <span className="rounded-full bg-[#08284d]/95 px-3 py-1 text-[11px] font-bold text-white">{typeLabel}</span>
   </div>
  </div>
  <div className="p-5">
   <h3 className="line-clamp-2 min-h-14 text-lg font-extrabold leading-7 text-[#08284d]">{title}</h3>
   <p className="mt-2 truncate text-sm text-slate-500">{course.instructor||"Basmat Alnawabigh Academy"}</p>
   <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
    <span className="flex items-center gap-1 text-amber-500"><FaStar/><b>{Number(course.rating||course.average_rating||0)>0?Number(course.rating||course.average_rating).toFixed(1):"New"}</b></span>
    {course.level&&<span>{course.level}</span>}
    {course.duration&&<span className="flex items-center gap-1"><FaClock/>{course.duration}</span>}
   </div>
   <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4">
    <span className="text-lg font-extrabold text-[#f97316]">{Number(course.price)>0?<span dir="ltr">{Number(course.price).toFixed(2)} SAR</span>:t("course.free")}</span>
    <button onClick={()=>navigate(`/courses/${course.id}`)} className="rounded-xl bg-[#08284d] px-4 py-2 text-sm font-bold text-white hover:bg-[#0d3767]">{t("course.details")}</button>
   </div>
  </div>
 </article>
}
