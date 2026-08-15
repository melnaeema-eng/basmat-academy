import {useEffect,useMemo,useState} from "react";
import {Navigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {FaCalendarAlt,FaVideo} from "react-icons/fa";
import MainLayout from "../layouts/MainLayout";
import {getCurrentUser} from "../services/enrollmentService";
import {getMyLiveSessions} from "../services/professionalAcademyService";

export default function LiveSessions(){
 const {i18n}=useTranslation();const ar=i18n.language?.startsWith("ar");const[items,setItems]=useState([]),[loading,setLoading]=useState(true),[login,setLogin]=useState(false),[error,setError]=useState("");
 useEffect(()=>{(async()=>{try{const u=await getCurrentUser();if(!u){setLogin(true);return}setItems(await getMyLiveSessions())}catch(e){setError(e.message)}finally{setLoading(false)}})()},[]);
 const upcoming=useMemo(()=>items.filter(x=>x.status==="scheduled"&&new Date(x.start_at)>=new Date()),[items]);
 const past=useMemo(()=>items.filter(x=>!upcoming.some(u=>u.id===x.id)),[items,upcoming]);
 if(login)return <Navigate to="/login" replace/>;
 return <MainLayout><main className="min-h-screen bg-[#f7f9fc] py-10"><div className="academy-container max-w-6xl"><span className="academy-eyebrow">{ar?"التعلم المباشر":"Live Learning"}</span><h1 className="academy-title mt-3 text-3xl">{ar?"جلساتي المباشرة":"My Live Sessions"}</h1><p className="mt-2 text-slate-500">{ar?"مواعيد Zoom وTeams وMeet المرتبطة بدوراتك.":"Zoom, Teams and Meet sessions linked to your enrolled courses."}</p>{error&&<div className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}{loading?<div className="academy-card mt-6 p-10 text-center">{ar?"جاري التحميل...":"Loading..."}</div>:<>
 <Section title={ar?"الجلسات القادمة":"Upcoming Sessions"} rows={upcoming} ar={ar}/>
 <Section title={ar?"الجلسات السابقة أو الملغاة":"Past / Cancelled"} rows={past} ar={ar} past/>
 </>}</div></main></MainLayout>
}
function Section({title,rows,ar,past}){return <section className="mt-8"><h2 className="academy-title text-2xl">{title}</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{rows.map(x=><article key={x.id} className="academy-card overflow-hidden"><div className="flex gap-4 p-5"><img src={x.courses?.image||"https://placehold.co/320x180?text=Live"} className="h-24 w-36 rounded-xl object-cover"/><div className="min-w-0 flex-1"><div className="text-xs font-bold text-orange-600">{x.courses?.title}</div><h3 className="mt-1 font-extrabold text-[#08284d]">{x.title}</h3><div className="mt-3 flex items-center gap-2 text-sm text-slate-500"><FaCalendarAlt/><span dir="ltr">{new Date(x.start_at).toLocaleString()}</span></div><div className="mt-1 text-sm text-slate-500">{x.provider}</div></div></div>{x.notes&&<p className="border-t px-5 py-3 text-sm leading-7 text-slate-600">{x.notes}</p>}<div className="border-t p-4">{!past&&x.status==="scheduled"?<a href={x.meeting_url} target="_blank" rel="noreferrer" className="academy-btn-primary w-full"><FaVideo/>{ar?"دخول الجلسة":"Join Session"}</a>:<span className="text-sm font-bold text-slate-400">{x.status}</span>}</div></article>)}{!rows.length&&<div className="academy-card p-8 text-center text-slate-500 md:col-span-2">{ar?"لا توجد جلسات في هذا القسم.":"No sessions in this section."}</div>}</div></section>}
