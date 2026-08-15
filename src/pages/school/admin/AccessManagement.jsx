import {useEffect,useMemo,useState} from "react";
import {getSchoolAccessUsers,getSchoolUserAccessDetails,setSchoolStaffRoles} from "../../../services/schoolAccessService";

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
 const[users,setUsers]=useState([]),[q,setQ]=useState(""),[editing,setEditing]=useState({}),[busy,setBusy]=useState(""),[detail,setDetail]=useState(null);

 async function load(){
  const u=await getSchoolAccessUsers();
  setUsers(u);
  const e={};u.forEach(x=>e[x.auth_user_id]=x.staff_roles||[]);
  setEditing(e);
 }
 useEffect(()=>{load().catch(e=>alert(e.message))},[]);

 const filtered=useMemo(()=>users.filter(x=>`${x.email||""} ${x.display_name||""}`.toLowerCase().includes(q.toLowerCase())),[users,q]);

 function toggle(uid,role){
  setEditing(v=>{
   const a=v[uid]||[];
   return {...v,[uid]:a.includes(role)?a.filter(x=>x!==role):[...a,role]};
  });
 }

 async function save(uid){
  try{
   setBusy(uid);
   await setSchoolStaffRoles(uid,editing[uid]||[]);
   await load();
   alert("تم حفظ صلاحيات المدرسة");
  }catch(e){alert(e.message)}finally{setBusy("")}
 }

 async function inspect(uid){
  try{setDetail(await getSchoolUserAccessDetails(uid))}catch(e){alert(e.message)}
 }

 return <div>
  <h1 className="text-3xl font-extrabold text-[#12345b]">المستخدمون والصلاحيات</h1>
  <p className="mt-2 text-slate-500">الأدوار الأكاديمية للطالب والمعلم وولي الأمر تأتي من سجلاتهم تلقائيًا. هنا نمنح صلاحيات الموظفين والإدارة فقط.</p>

  <div className="academy-card mt-5 p-4"><input className="academy-input" placeholder="بحث بالاسم أو البريد..." value={q} onChange={e=>setQ(e.target.value)}/></div>

  <div className="mt-5 space-y-4">
   {filtered.map(u=><div key={u.auth_user_id} className="academy-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
     <div>
      <div className="font-extrabold text-[#12345b]">{u.display_name}</div>
      <div className="text-sm text-slate-500">{u.email}</div>
      <div className="mt-2 flex flex-wrap gap-2">
       {(u.identity_roles||[]).map(r=><span key={r} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{identityLabel[r]||r}</span>)}
       {!(u.identity_roles||[]).length&&<span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">لا يوجد دور أكاديمي مربوط</span>}
      </div>
     </div>
     <div className="flex gap-2">
      <button onClick={()=>inspect(u.auth_user_id)} className="academy-btn-dark">تفاصيل الربط</button>
      <button disabled={busy===u.auth_user_id} onClick={()=>save(u.auth_user_id)} className="academy-btn-primary">حفظ</button>
     </div>
    </div>

    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
     {staffRoles.map(([r,l])=><label key={r} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${(editing[u.auth_user_id]||[]).includes(r)?"border-orange-400 bg-orange-50":""}`}>
      <input type="checkbox" checked={(editing[u.auth_user_id]||[]).includes(r)} onChange={()=>toggle(u.auth_user_id,r)}/>
      <span className="font-bold">{l}</span>
     </label>)}
    </div>
   </div>)}
  </div>

  {detail&&<div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={()=>setDetail(null)}>
   <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white p-6" onClick={e=>e.stopPropagation()}>
    <div className="flex justify-between"><h2 className="text-xl font-extrabold text-[#12345b]">تفاصيل ربط الحساب</h2><button onClick={()=>setDetail(null)}>✕</button></div>
    <div className="mt-3 text-sm text-slate-500">{detail.email}</div>
    <pre className="mt-4 overflow-auto rounded-xl bg-slate-50 p-4 text-xs">{JSON.stringify(detail,null,2)}</pre>
   </div>
  </div>}
 </div>
}
