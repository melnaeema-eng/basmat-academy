import {useEffect,useState} from 'react';
import {useParams} from 'react-router-dom';
import QRCode from 'qrcode';
import {getCertificate} from '../services/certificateService';
import logo from '../assets/images/logo.png';

export default function CertificateView(){
 const {id}=useParams();const [c,setC]=useState(null),[qr,setQr]=useState(''),[error,setError]=useState('');
 useEffect(()=>{getCertificate(id).then(async x=>{setC(x);const token=x.verification_token||x.verification_code;const url=`${window.location.origin}/verify/${token}`;setQr(await QRCode.toDataURL(url,{width:180,margin:1,errorCorrectionLevel:'H'}))}).catch(e=>setError(e.message||'تعذر تحميل الشهادة'))},[id]);
 if(error)return <div className="p-10 text-center text-red-700">{error}</div>;if(!c)return <div className="p-10 text-center">جاري التحميل...</div>;
 const active=(c.status||'active')==='active';
 return <main className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0" dir="rtl">
  <div className="mx-auto max-w-[1120px] bg-white p-3 shadow-2xl print:shadow-none">
   <div className="relative min-h-[720px] overflow-hidden border-[3px] border-amber-500 p-2">
    <div className="absolute inset-3 border border-slate-800 pointer-events-none"/>
    <div className="relative flex min-h-[690px] flex-col items-center justify-between px-10 py-8 text-center">
     <div>
      <img src={logo} alt="Basmat Alnawabigh" className="mx-auto h-24 w-auto object-contain"/>
      <div className="mt-2 text-sm font-bold tracking-[.25em] text-slate-700">BASMAT ALNAWABIGH ACADEMY</div>
      <div className="mx-auto mt-5 h-px w-56 bg-amber-500"/>
      <h1 className="mt-6 text-5xl font-serif font-bold text-slate-900">شهادة إتمام وتميّز</h1>
      <p className="mt-5 text-lg text-slate-500">تتشرف أكاديمية بصمة النوابغ بمنح هذه الشهادة إلى</p>
      <div className="mt-4 text-4xl font-bold text-amber-600">{c.profiles?.full_name||'الطالب'}</div>
      <p className="mt-5 text-lg text-slate-500">تقديرًا لإتمامه بنجاح متطلبات الدورة التدريبية</p>
      <div className="mt-3 text-3xl font-bold text-slate-900">{c.courses?.title}</div>
      {c.courses?.instructor&&<p className="mt-3 text-base text-slate-600">المدرب: <b>{c.courses.instructor}</b></p>}
     </div>
     <div className="grid w-full grid-cols-3 items-end gap-8">
      <div className="text-right text-sm leading-7 text-slate-600">
       <div>تاريخ الإصدار</div><b>{new Date(c.issued_at).toLocaleDateString('ar-SA')}</b>
       <div className="mt-2">رقم الشهادة</div><b className="font-mono">{c.certificate_number}</b>
       <div className={`mt-2 font-bold ${active?'text-green-700':'text-red-700'}`}>{active?'شهادة سارية':'شهادة ملغاة'}</div>
      </div>
      <div className="text-center"><div className="mx-auto h-px w-44 bg-slate-500"/><div className="mt-2 font-bold">إدارة الأكاديمية</div><div className="text-xs text-slate-500">Basmat Alnawabigh Academy</div></div>
      <div className="flex flex-col items-center">
       {qr&&<img src={qr} alt="QR verification" className="h-32 w-32"/>}
       <div className="mt-1 text-xs font-bold">امسح للتحقق من الشهادة</div>
       <div className="max-w-40 break-all text-[10px] text-slate-500">{c.verification_token||c.verification_code}</div>
      </div>
     </div>
    </div>
   </div>
  </div>
  <div className="mx-auto mt-5 flex max-w-[1120px] justify-center gap-3 print:hidden"><button onClick={()=>window.print()} className="rounded-lg bg-amber-600 px-6 py-3 font-bold text-white">طباعة / حفظ PDF</button><button onClick={()=>history.back()} className="rounded-lg bg-slate-200 px-6 py-3">رجوع</button></div>
 </main>
}
