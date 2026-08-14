import { useEffect,useMemo,useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaBookOpen,FaEye,FaPen,FaPlus,FaTrashCan,FaClipboardQuestion } from "react-icons/fa6";
import { getAllCourses,deleteCourse } from "../../services/adminCourseService";
import { AdminPageHeader,AdminTable,StatusBadge } from "../../components/admin/AdminUI";

export default function Courses(){
 const {t}=useTranslation();const[courses,setCourses]=useState([]),[search,setSearch]=useState(""),[loading,setLoading]=useState(true);
 async function load(){try{setLoading(true);setCourses(await getAllCourses()||[])}finally{setLoading(false)}} useEffect(()=>{load()},[]);
 async function remove(id){if(!confirm(t("admin.deleteCourseConfirm")))return;await deleteCourse(id);await load()}
 const rows=useMemo(()=>courses.filter(c=>(c.title||"").toLowerCase().includes(search.toLowerCase())),[courses,search]);
 const typeLabel=v=>v==="live"?t("admin.live"):v==="hybrid"?t("admin.hybrid"):t("admin.recorded");
 return <div>
  <AdminPageHeader title={t("admin.courses")} description={t("admin.coursesDesc")} actions={<Link to="/admin/add-course" className="academy-btn-primary"><FaPlus/>{t("admin.addCourse")}</Link>}/>
  <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
   <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("admin.searchCourse")} className="academy-input border-0 bg-slate-50"/>
   <span className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-500">{rows.length}</span>
  </div>
  {loading?<div className="academy-card p-10 text-center">{t("common.loading")}</div>:<AdminTable minWidth="1100px">
   <thead className="bg-[#08284d] text-white"><tr>
    <th className="p-3 text-start">{t("admin.image")}</th><th className="p-3 text-start">{t("admin.courseName")}</th>
    <th className="p-3 text-start">{t("admin.instructor")}</th><th className="p-3 text-start">{t("admin.category")}</th>
    <th className="p-3 text-start">{t("admin.price")}</th><th className="p-3 text-start">{t("admin.type")}</th>
    <th className="p-3 text-start">{t("common.status")}</th><th className="p-3 text-start">{t("common.actions")}</th>
   </tr></thead>
   <tbody>{rows.map(c=><tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50/70">
    <td className="p-3"><img src={c.image||"https://placehold.co/160x90?text=Course"} className="h-14 w-24 rounded-xl object-cover" alt={c.title}/></td>
    <td className="p-3"><div className="max-w-[240px] font-extrabold text-[#08284d]">{c.title}</div><div className="mt-1 text-xs text-slate-400">{c.level||"—"}</div></td>
    <td className="p-3">{c.instructor||"—"}</td><td className="p-3">{c.category||"—"}</td>
    <td className="p-3 font-bold">{Number(c.price)>0?<span dir="ltr">{c.price} SAR</span>:t("common.free")}</td>
    <td className="p-3">{typeLabel(c.course_type)}</td><td className="p-3"><StatusBadge status={c.status||"Published"}/></td>
    <td className="p-3"><div className="flex items-center gap-1.5">
      <IconLink to={`/admin/view-course/${c.id}`} title={t("common.view")} cls="text-blue-600 bg-blue-50"><FaEye/></IconLink>
      <IconLink to={`/admin/courses/${c.id}/lessons`} title={t("admin.lessonsAction")} cls="text-emerald-600 bg-emerald-50"><FaBookOpen/></IconLink>
      <IconLink to={`/admin/courses/${c.id}/exams`} title={t("admin.examsAction")} cls="text-violet-600 bg-violet-50"><FaClipboardQuestion/></IconLink>
      <IconLink to={`/admin/edit-course/${c.id}`} title={t("common.edit")} cls="text-orange-600 bg-orange-50"><FaPen/></IconLink>
      <button onClick={()=>remove(c.id)} title={t("common.delete")} aria-label={t("common.delete")} className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100"><FaTrashCan/></button>
    </div></td>
   </tr>)}{!rows.length&&<tr><td colSpan="8" className="p-10 text-center text-slate-500">{t("admin.noCourses")}</td></tr>}</tbody>
  </AdminTable>}
 </div>
}
function IconLink({to,title,cls,children}){return <Link to={to} title={title} aria-label={title} className={`flex h-9 w-9 items-center justify-center rounded-lg hover:brightness-95 ${cls}`}>{children}</Link>}
