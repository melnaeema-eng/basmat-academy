import {useEffect,useState} from "react";
import {useTranslation} from "react-i18next";
import {FaPen,FaPlus,FaTrash} from "react-icons/fa";
import {supabase} from "../../services/supabase";
import {AdminPageHeader,AdminCard,AdminTable,Directional,StatusBadge} from "../../components/admin/AdminUI";
import {adminDeleteLiveSession,adminGetLiveSessions,adminSaveLiveSession} from "../../services/professionalAcademyService";

const empty={course_id:"",title:"",provider:"zoom",meeting_url:"",start_at:"",end_at:"",notes:"",status:"scheduled"};
function localInput(iso){if(!iso)return"";const d=new Date(iso);const off=d.getTimezoneOffset()*60000;return new Date(d.getTime()-off).toISOString().slice(0,16)}

export default function AdminLiveSessions(){
 const {i18n}=useTranslation();const ar=i18n.language?.startsWith("ar");const[items,setItems]=useState([]),[courses,setCourses]=useState([]),[form,setForm]=useState(empty),[editing,setEditing]=useState(null),[loading,setLoading]=useState(true);
 async function load(){setLoading(true);try{const [rows,c]=await Promise.all([adminGetLiveSessions(),supabase.from("courses").select("id,title,course_type").order("title")]);if(c.error)throw c.error;setItems(rows);setCourses(c.data||[])}finally{setLoading(false)}}useEffect(()=>{load()},[]);
 function edit(x){setEditing(x.id);setForm({...x,start_at:localInput(x.start_at),end_at:localInput(x.end_at)})}function reset(){setEditing(null);setForm(empty)}
 async function save(e){e.preventDefault();try{await adminSaveLiveSession({...form,id:editing,start_at:new Date(form.start_at).toISOString(),end_at:form.end_at?new Date(form.end_at).toISOString():null});reset();await load()}catch(e){alert(e.message)}}
 async function remove(id){if(!confirm(ar?"حذف الجلسة؟":"Delete session?"))return;await adminDeleteLiveSession(id);await load()}
 return <div><AdminPageHeader title={ar?"الجلسات المباشرة":"Live Sessions"} description={ar?"إدارة Zoom وTeams وGoogle Meet للدورات المباشرة والهجينة.":"Manage Zoom, Teams and Google Meet sessions."}/>
  <div className="grid gap-6 xl:grid-cols-[430px_1fr]"><AdminCard className="p-5"><form onSubmit={save} className="space-y-4">
   <h2 className="font-extrabold text-[#08284d]">{editing?(ar?"تعديل جلسة":"Edit Session"):(ar?"إضافة جلسة":"Add Session")}</h2>
   <Field label={ar?"الدورة":"Course"}><select required className="academy-input" value={form.course_id} onChange={e=>setForm({...form,course_id:e.target.value})}><option value="">—</option>{courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></Field>
   <Field label={ar?"عنوان الجلسة":"Session Title"}><input required className="academy-input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></Field>
   <div className="grid gap-3 sm:grid-cols-2"><Field label={ar?"المنصة":"Provider"}><select className="academy-input" value={form.provider} onChange={e=>setForm({...form,provider:e.target.value})}><option value="zoom">Zoom</option><option value="teams">Microsoft Teams</option><option value="meet">Google Meet</option><option value="other">{ar?"أخرى":"Other"}</option></select></Field><Field label={ar?"الحالة":"Status"}><select className="academy-input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="scheduled">{ar?"مجدولة":"Scheduled"}</option><option value="completed">{ar?"مكتملة":"Completed"}</option><option value="cancelled">{ar?"ملغاة":"Cancelled"}</option></select></Field></div>
   <Field label={ar?"رابط الدخول":"Meeting URL"}><input dir="ltr" required type="url" className="academy-input" value={form.meeting_url} onChange={e=>setForm({...form,meeting_url:e.target.value})}/></Field>
   <div className="grid gap-3 sm:grid-cols-2"><Field label={ar?"البداية":"Start"}><input dir="ltr" required type="datetime-local" className="academy-input" value={form.start_at} onChange={e=>setForm({...form,start_at:e.target.value})}/></Field><Field label={ar?"النهاية":"End"}><input dir="ltr" type="datetime-local" className="academy-input" value={form.end_at||""} onChange={e=>setForm({...form,end_at:e.target.value})}/></Field></div>
   <Field label={ar?"ملاحظات":"Notes"}><textarea className="academy-input min-h-20" value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})}/></Field>
   <div className="flex gap-2"><button className="academy-btn-primary flex-1">{ar?"حفظ":"Save"}</button>{editing&&<button type="button" onClick={reset} className="rounded-xl border px-4 font-bold">{ar?"إلغاء":"Cancel"}</button>}</div>
  </form></AdminCard>
  {loading?<AdminCard className="p-10 text-center">{ar?"جاري التحميل...":"Loading..."}</AdminCard>:<AdminTable minWidth="900px"><thead className="bg-[#08284d] text-white"><tr>{[ar?"الدورة":"Course",ar?"الجلسة":"Session",ar?"المنصة":"Provider",ar?"البداية":"Start",ar?"الحالة":"Status",ar?"الإجراءات":"Actions"].map(x=><th className="p-3 text-start" key={x}>{x}</th>)}</tr></thead><tbody>{items.map(x=><tr key={x.id} className="border-t"><td className="p-3 font-bold">{x.courses?.title}</td><td className="p-3">{x.title}</td><td className="p-3"><Directional>{x.provider}</Directional></td><td className="p-3"><Directional>{new Date(x.start_at).toLocaleString()}</Directional></td><td className="p-3"><StatusBadge status={x.status}/></td><td className="p-3"><div className="flex gap-2"><button onClick={()=>edit(x)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600"><FaPen/></button><button onClick={()=>remove(x.id)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600"><FaTrash/></button></div></td></tr>)}</tbody></AdminTable>}</div>
 </div>
}
function Field({label,children}){return <label className="block"><span className="mb-1.5 block text-sm font-bold">{label}</span>{children}</label>}
