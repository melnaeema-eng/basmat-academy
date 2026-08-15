import {useEffect,useState} from "react";
import {useNavigate} from "react-router-dom";
import {FaBell,FaCheckDouble} from "react-icons/fa";
import {getMySchoolNotifications,markAllSchoolNotificationsRead,markSchoolNotificationRead} from "../../../services/schoolService";
export default function SchoolNotifications(){
 const[rows,setRows]=useState([]);const nav=useNavigate();
 async function load(){setRows(await getMySchoolNotifications())}
 useEffect(()=>{load().catch(e=>alert(e.message))},[]);
 async function open(x){if(!x.is_read)await markSchoolNotificationRead(x.id);if(x.action_url)nav(x.action_url);else await load()}
 async function all(){await markAllSchoolNotificationsRead();await load()}
 return <div><div className="flex items-end justify-between"><div><h1 className="text-3xl font-extrabold text-[#12345b]">الإشعارات</h1><p className="mt-2 text-slate-500">التنبيهات والإعلانات الخاصة بك.</p></div><button onClick={all} className="academy-btn-dark"><FaCheckDouble/>تحديد الكل كمقروء</button></div><div className="mt-5 space-y-3">{rows.map(x=><button key={x.id} onClick={()=>open(x)} className={`academy-card w-full p-5 text-right ${x.is_read?"opacity-60":"border-orange-200 bg-orange-50/30"}`}><div className="flex justify-between gap-3"><div><div className="flex items-center gap-2"><FaBell className={x.is_read?"text-slate-400":"text-orange-500"}/><b className="text-[#12345b]">{x.title}</b></div><p className="mt-2 text-sm text-slate-600">{x.body}</p><div className="mt-2 text-xs text-slate-400">{new Date(x.created_at).toLocaleString()}</div></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs">{x.notification_type}</span></div></button>)}{!rows.length&&<div className="academy-card p-8 text-center text-slate-400">لا توجد إشعارات.</div>}</div></div>
}
