import {useEffect,useState} from "react";
import {getSchoolCore,saveAcademicYear} from "../../../services/schoolService";
const empty={name:"",starts_on:"",ends_on:"",is_current:false,status:"draft"};
export default function AcademicYears(){
 const[data,setData]=useState(null),[form,setForm]=useState(empty),[saving,setSaving]=useState(false);
 async function load(){setData(await getSchoolCore())}
 useEffect(()=>{load()},[]);
 async function submit(e){e.preventDefault();try{setSaving(true);await saveAcademicYear(form);setForm(empty);await load()}catch(e){alert(e.message)}finally{setSaving(false)}}
 return <div><h1 className="text-3xl font-extrabold text-[#12345b]">السنوات الدراسية</h1><p className="mt-2 text-slate-500">إدارة العام الدراسي الحالي والقادم لمدرسة نوابغ الجزيرة.</p>
 <div className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]"><form onSubmit={submit} className="academy-card space-y-4 p-5">
  <Field label="اسم العام الدراسي"><input required className="academy-input" placeholder="2026/2027" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field>
  <div className="grid gap-3 sm:grid-cols-2"><Field label="بداية العام"><input required type="date" className="academy-input" value={form.starts_on} onChange={e=>setForm({...form,starts_on:e.target.value})}/></Field><Field label="نهاية العام"><input required type="date" className="academy-input" value={form.ends_on} onChange={e=>setForm({...form,ends_on:e.target.value})}/></Field></div>
  <Field label="الحالة"><select className="academy-input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="draft">مسودة</option><option value="active">نشط</option><option value="closed">مغلق</option></select></Field>
  <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={form.is_current} onChange={e=>setForm({...form,is_current:e.target.checked})}/>اجعله العام الدراسي الحالي</label>
  <button disabled={saving} className="academy-btn-primary w-full">{saving?"جاري الحفظ...":"حفظ العام الدراسي"}</button>
 </form>
 <div className="space-y-3">{(data?.years||[]).map(y=><div key={y.id} className="academy-card flex flex-wrap items-center justify-between gap-4 p-5"><div><div className="text-xl font-extrabold text-[#12345b]">{y.name}</div><div dir="ltr" className="mt-1 text-sm text-slate-500">{y.starts_on} → {y.ends_on}</div></div><div className="flex gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{y.status}</span>{y.is_current&&<span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">الحالي</span>}</div></div>)}{data&&!data.years.length&&<div className="academy-card p-8 text-center text-slate-500">لم تتم إضافة عام دراسي بعد.</div>}</div></div></div>
}
function Field({label,children}){return <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span>{children}</label>}
