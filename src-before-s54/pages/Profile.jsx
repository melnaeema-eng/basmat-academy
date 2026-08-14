import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import { getMyProfile, updateMyProfile, uploadProfileAvatar } from '../services/profileService';

export default function Profile() {
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[uploading,setUploading]=useState(false);
  const [needsLogin,setNeedsLogin]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  const [form,setForm]=useState({full_name:'',email:'',phone:'',city:'',bio:'',avatar_url:''});
  useEffect(()=>{(async()=>{try{const p=await getMyProfile();if(!p){setNeedsLogin(true);return;}setForm({full_name:p.full_name||'',email:p.email||p.auth_email||'',phone:p.phone||'',city:p.city||'',bio:p.bio||'',avatar_url:p.avatar_url||''});}catch(e){setError(e.message||'تعذر تحميل الملف الشخصي')}finally{setLoading(false)}})()},[]);
  if(needsLogin)return <Navigate to="/login" replace/>;
  async function save(e){e.preventDefault();try{setSaving(true);setError('');await updateMyProfile(form);setMessage('تم تحديث الملف الشخصي بنجاح');}catch(e){setError(e.message||'تعذر حفظ الملف الشخصي')}finally{setSaving(false)}}
  async function avatar(e){const f=e.target.files?.[0];if(!f)return;try{setUploading(true);const url=await uploadProfileAvatar(f);setForm(v=>({...v,avatar_url:url}));await updateMyProfile({...form,avatar_url:url});setMessage('تم تحديث الصورة الشخصية');}catch(e){setError(e.message||'تعذر رفع الصورة')}finally{setUploading(false)}}
  return <MainLayout><main dir="rtl" className="min-h-screen bg-gray-50 px-4 py-10"><div className="mx-auto max-w-4xl">
   <h1 className="text-3xl font-bold">الملف الشخصي</h1><p className="mt-2 text-gray-500">بيانات حساب الطالب في الأكاديمية</p>
   {loading?<div className="mt-8">جاري التحميل...</div>:<form onSubmit={save} className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
    {message&&<div className="mb-4 rounded bg-green-50 p-3 text-green-700">{message}</div>}{error&&<div className="mb-4 rounded bg-red-50 p-3 text-red-700">{error}</div>}
    <div className="mb-8 flex flex-col items-center gap-3 sm:flex-row"><div className="h-28 w-28 overflow-hidden rounded-full bg-orange-100 text-4xl font-bold text-orange-600 flex items-center justify-center">{form.avatar_url?<img src={form.avatar_url} className="h-full w-full object-cover"/>:(form.full_name?.[0]||'ط')}</div><div><label className="inline-block cursor-pointer rounded-lg bg-slate-800 px-4 py-2 text-white">{uploading?'جارٍ الرفع...':'تغيير الصورة'}<input type="file" accept="image/*" onChange={avatar} className="hidden" disabled={uploading}/></label><p className="mt-2 text-xs text-gray-500">JPG/PNG/WebP حتى 3MB</p></div></div>
    <div className="grid gap-5 md:grid-cols-2"><Field label="الاسم الكامل" value={form.full_name} onChange={v=>setForm({...form,full_name:v})}/><Field label="البريد الإلكتروني" value={form.email} disabled/><Field label="رقم الجوال" value={form.phone} onChange={v=>setForm({...form,phone:v})}/><Field label="المدينة" value={form.city} onChange={v=>setForm({...form,city:v})}/></div>
    <label className="mt-5 block"><span className="mb-2 block font-semibold">نبذة مختصرة</span><textarea className="min-h-32 w-full rounded-lg border p-3" value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})}/></label>
    <button className="mt-6 rounded-lg bg-orange-500 px-6 py-3 font-bold text-white disabled:opacity-50" disabled={saving}>{saving?'جارٍ الحفظ...':'حفظ التغييرات'}</button>
   </form>}
  </div></main></MainLayout>
}
function Field({label,value,onChange,disabled}){return <label><span className="mb-2 block font-semibold">{label}</span><input className="w-full rounded-lg border p-3 disabled:bg-gray-100" value={value||''} disabled={disabled} onChange={e=>onChange?.(e.target.value)}/></label>}
