import {useEffect,useMemo,useState} from "react";
import {FaSave,FaShieldAlt,FaUsers} from "react-icons/fa";
import {getSchoolAccessUsers,setSchoolStaffRoles} from "../../../services/schoolAccessService";
const staffRoles=[
 ["school_admin","إدارة المدرسة"],
 ["finance","الحسابات والمالية"],
 ["hr","الموارد البشرية"],
 ["admissions","القبول والتسجيل"],
 ["student_affairs","شؤون الطلاب"],
 ["employee","موظف"]
];
const identityLabel={teacher:"معلم",parent:"ولي أمر",student:"طالب"};
export default function SchoolAccessManagement(){
 const[users,setUsers]=useState([]),[q,setQ]=useState(""),[editing,setEditing]=useState({}),[busy,setBusy]=useState("");
 async function load(){const u=await getSchoolAccessUsers();setUsers(u);const m={};u.forEach(x=>m[x.auth_user_id]=x.staff_roles||[]);setEditing(m)}
 useEffect(()=>{load().catch(e=>alert(e.message))},[]);
 const filtered=useMemo(()=>users.filter(x=>`${x.email} ${x.display_name}`.toLowerCase().includes(q.toLowerCase())),[users,q]);
 function toggle(uid,role){setEditing(v=>{const a=v[uid]||[];return{...v,[uid]:a.includes(role)?a.filter(x=>x!==role):[...a,role]}})}
 async function save(uid){try{setBusy(uid);await setSchoolStaffRoles(uid,editing[uid]||[]);await load();alert("تم حفظ الصلاحيات")}catch(e){alert(e.message)}finally{setBusy("")}}
 return <div><div><h1 className="text-3xl font-extrabold text-[#12345b]">المستخدمون والصلاحيات</h1><p className="mt-2 text-slate-500">إدارة صلاحيات موظفي المدرسة. أدوار الطالب/المعلم/ولي الأمر تأتي تلقائيًا من ملفاتهم ولا يتم منحها يدويًا هنا.</p></div>
 <div className="academy-card mt-5 p-4"><input className="academy-input" placeholder="بحث بالاسم أو البريد..." value={q} onChange={e=>setQ(e.target.value)}/></div>
 <div className="mt-5 space-y-4">{filtered.map(u=><div key={u.auth_user_id} className="academy-card p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="font-extrabold text-[#12345b]">{u.display_name}</div><div className="text-sm text-slate-500">{u.email}</div><div className="mt-2 flex flex-wrap gap-2">{(u.identity_roles||[]).map(r=><span key={r} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{identityLabel[r]||r}</span>)}</div></div><button disabled={busy===u.auth_user_id} onClick={()=>save(u.auth_user_id)} className="academy-btn-primary"><FaSave/>حفظ</button></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{staffRoles.map(([r,l])=><label key={r} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${(editing[u.auth_user_id]||[]).includes(r)?"border-orange-400 bg-orange-50":""}`}><input type="checkbox" checked={(editing[u.auth_user_id]||[]).includes(r)} onChange={()=>toggle(u.auth_user_id,r)}/><span className="font-bold">{l}</span></label>)}</div></div>)}</div>
 </div>
}
