import {useEffect,useState} from 'react';
import {useParams,Link} from 'react-router-dom';
import {verifyCertificate} from '../services/certificateService';
import logo from '../assets/images/logo.png';
export default function VerifyCertificate(){
 const {token}=useParams();const [c,setC]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{verifyCertificate(token).then(x=>{if(!x)throw new Error('الشهادة غير موجودة');setC(x)}).catch(e=>setError(e.message||'تعذر التحقق')).finally(()=>setLoading(false))},[token]);
 return <main dir="rtl" className="min-h-screen bg-slate-100 p-6"><div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 text-center shadow-xl"><img src={logo} className="mx-auto h-24 w-auto"/><h1 className="mt-4 text-3xl font-bold">التحقق من الشهادة</h1>
 {loading&&<div className="mt-8">جاري التحقق...</div>}
 {error&&<div className="mt-8 rounded-xl bg-red-50 p-5 font-bold text-red-700">❌ {error}</div>}
 {c&&<div className="mt-8">{c.status==='active'?<div className="rounded-xl bg-green-50 p-5 text-2xl font-bold text-green-700">✓ شهادة صحيحة وسارية</div>:<div className="rounded-xl bg-red-50 p-5 text-2xl font-bold text-red-700">⚠ الشهادة ملغاة</div>}
 <div className="mt-6 divide-y rounded-xl border text-right"><Row a="اسم المتدرب" b={c.student_name}/><Row a="الدورة" b={c.course_title}/><Row a="رقم الشهادة" b={c.certificate_number}/><Row a="تاريخ الإصدار" b={new Date(c.issued_at).toLocaleDateString('ar-SA')}/><Row a="الحالة" b={c.status==='active'?'سارية':'ملغاة'}/></div></div>}
 <Link to="/" className="mt-8 inline-block text-amber-700">العودة للأكاديمية</Link></div></main>
}
function Row({a,b}){return <div className="grid grid-cols-2 gap-3 p-4"><span className="text-slate-500">{a}</span><b>{b||'—'}</b></div>}
