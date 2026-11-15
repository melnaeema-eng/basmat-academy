import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import MainLayout from '../layouts/MainLayout';
import {getLabCatalog} from '../services/labService';
export default function LabLibrary({track}){
 const {i18n}=useTranslation();const ar=i18n.language?.startsWith('ar');
 const [labs,setLabs]=useState([]),[status,setStatus]=useState('loading');
 useEffect(()=>{let active=true;setStatus('loading');getLabCatalog(track).then(data=>{if(active){setLabs(data);setStatus('ready')}}).catch(()=>{if(active)setStatus('error')});return()=>{active=false}},[track]);
 return <MainLayout><section className="academy-container py-12" dir={ar?'rtl':'ltr'}>
  <p className="font-bold text-orange-600">Basmat Alnawabigh Academy • {track.toUpperCase()}</p>
  <h1 className="mt-3 text-3xl font-extrabold text-[#12345b]">{ar?`مختبرات ${track.toUpperCase()} العملية`:`${track.toUpperCase()} Practical Labs`}</h1>
  <p className="mt-4 text-slate-600">{ar?'المختبر الأول مجاني. اشترِ المختبرات التالية من صفحة التفاصيل، وتُفتح بعد تأكيد الدفع.':'The first lab is free. Purchase subsequent labs through the details page; access opens after payment confirmation.'}</p>
  <p className="mt-2 text-sm text-slate-500">{track==='ccnp'?(ar?'مسار Enterprise: ENCOR ثم ENARSI — بيئة CML/EVE-NG وصور داعمة حسب المختبر.':'Enterprise: ENCOR then ENARSI — CML/EVE-NG with feature-capable images as specified.'):(ar?'Cisco Packet Tracer والبيئات المحددة لكل مختبر.':'Cisco Packet Tracer and the environments specified in each lab.')}</p>
  <div aria-live="polite" className="mt-8">
   {status==='loading'&&<p>{ar?'جارٍ تحميل المختبرات…':'Loading labs…'}</p>}
   {status==='error'&&<p role="alert">{ar?'تعذر تحميل المختبرات. أعد تحميل الصفحة للمحاولة.':'Unable to load labs. Reload to try again.'}</p>}
   {status==='ready'&&!labs.length&&<p>{ar?'لا توجد مختبرات منشورة بعد.':'No labs are published yet.'}</p>}
   <div className="grid gap-5 md:grid-cols-2">{labs.map(lab=><article key={lab.id} className="academy-card flex flex-col p-6">
    <p className="text-sm font-bold text-orange-600">{ar?'مختبر':'Lab'} {lab.lab_number}</p>
    <h2 className="mt-2 text-xl font-bold text-[#12345b]">{ar?lab.title_ar:lab.title_en}</h2>
    <p className="mt-3 flex-1 text-slate-600">{ar?lab.summary_ar:lab.summary_en}</p>
    <div className="mt-4 flex justify-between gap-3"><span>{lab.duration_minutes} {ar?'دقيقة':'minutes'}</span><b>{Number(lab.price)===0?(ar?'مجاني':'Free'):<span dir="ltr">{Number(lab.price).toFixed(0)} SAR</span>}</b></div>
    <div className="mt-5 flex flex-wrap gap-2"><Link to={Number(lab.price)===0?`/labs/${track}/${lab.slug}`:`/courses/${lab.course_id}`} className="academy-btn-primary">{Number(lab.price)===0?(ar?'ابدأ مجانًا':'Start free'):(ar?'التفاصيل والشراء':'Details & purchase')}</Link>{Number(lab.price)>0&&<Link to={`/labs/${track}/${lab.slug}`} className="academy-btn-dark">{ar?'افتح مختبري':'Open my lab'}</Link>}</div>
   </article>)}</div>
  </div>
 </section></MainLayout>
}
