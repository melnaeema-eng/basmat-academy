import {useEffect,useState} from "react";
import {getMySchoolStudentProfile,updateMySchoolStudentContact} from "../../../services/schoolService";
export default function StudentProfile(){
 const[form,setForm]=useState({student_no:"",full_name_ar:"",full_name_en:"",email:"",phone:"",date_of_birth:"",nationality:"",status:""}),[saving,setSaving]=useState(false);
 useEffect(()=>{getMySchoolStudentProfile().then(x=>setForm({...form,...x,email:x.email||"",phone:x.phone||""})).catch(e=>alert(e.message))},[]);
 async function save(e){e.preventDefault();try{setSaving(true);await updateMySchoolStudentContact(form);alert("تم تحديث بيانات التواصل")}catch(e){alert(e.message)}finally{setSaving(false)}}
 return <div><h1 className="text-3xl font-extrabold text-[#12345b]">ملفي الدراسي</h1><form onSubmit={save} className="academy-card mt-6 max-w-2xl space-y-4 p-5"><F l="الرقم المدرسي"><input disabled className="academy-input bg-slate-50" value={form.student_no||""}/></F><F l="الاسم"><input disabled className="academy-input bg-slate-50" value={form.full_name_ar||""}/></F><F l="الجوال"><input className="academy-input" value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})}/></F><F l="البريد الإلكتروني"><input type="email" className="academy-input" value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})}/></F><button disabled={saving} className="academy-btn-primary w-full">حفظ</button></form></div>}
function F({l,children}){return <label className="block"><span className="mb-1.5 block text-sm font-bold">{l}</span>{children}</label>}
