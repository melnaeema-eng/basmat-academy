import {useEffect,useMemo,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import MainLayout from '../layouts/MainLayout';
import {getLabPage,getLabPdf,prepareLabDocument} from '../services/labService';
export default function LabViewer(){
 const {track,slug}=useParams();const {i18n}=useTranslation();const ar=i18n.language?.startsWith('ar');
 const [state,setState]=useState({loading:true,lab:null,html:null,error:false});
 useEffect(()=>{let active=true;setState({loading:true,lab:null,html:null,error:false});if(!['ccna','ccnp'].includes(track)){setState({loading:false,lab:null,error:false});return}getLabPage(track,slug).then(r=>{if(active)setState({...r,loading:false,error:false})}).catch(()=>{if(active)setState({loading:false,error:true})});return()=>{active=false}},[track,slug]);
 const content=useMemo(()=>prepareLabDocument(state.html,ar?'ar':'en'),[state.html,ar]);
 const lab=state.lab;
 const [pdfRequested,setPdfRequested]=useState(false);
 const [pdf,setPdf]=useState({loading:false,url:null,error:false});
 useEffect(()=>{setPdfRequested(false)},[track,slug]);
 useEffect(()=>{let active=true;let objectUrl;
  if(!pdfRequested||!lab?.id||!state.html)return;
  setPdf({loading:true,url:null,error:false});
  getLabPdf(lab.id).then(encoded=>{
   if(!active)return;
   if(!encoded){setPdf({loading:false,url:null,error:true});return;}
   const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
   objectUrl=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
   setPdf({loading:false,url:objectUrl,error:false});
  }).catch(()=>{if(active)setPdf({loading:false,url:null,error:true})});
  return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl)};
 },[pdfRequested,lab?.id,state.html]);
 return <MainLayout><main className="academy-container py-8" dir={ar?'rtl':'ltr'}>
  <Link to={`/${track==='ccnp'?'ccnp':'ccna'}-labs`} className="font-bold text-orange-600">{ar?'العودة إلى المختبرات':'Back to labs'}</Link>
  {state.loading?<p className="mt-6">{ar?'جارٍ التحميل…':'Loading…'}</p>:state.error?<p role="alert" className="mt-6">{ar?'تعذر تحميل المختبر. حاول مجددًا.':'Unable to load the lab. Please retry.'}</p>:!lab?<p className="mt-6">{ar?'المختبر غير متاح.':'Lab not available.'}</p>:content?<>
   <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-bold">{ar?lab.title_ar:lab.title_en}</h1><Link to={`/courses/${lab.course_id}`} className="text-sm font-bold text-orange-600">{ar?'تفاصيل المختبر':'Lab details'}</Link></div>
   {track==='ccnp'&&<div className="mt-4 flex gap-3"><button type="button" className={!pdfRequested?'academy-btn-primary':'academy-btn-dark'} onClick={()=>setPdfRequested(false)}>{ar?'المحتوى العملي':'Practical content'}</button><button type="button" className={pdfRequested?'academy-btn-primary':'academy-btn-dark'} onClick={()=>setPdfRequested(true)}>{ar?'عرض PDF':'View PDF'}</button></div>}
   {pdfRequested?pdf.loading?<p className="mt-5">{ar?'جارٍ تجهيز العرض…':'Preparing the viewer…'}</p>:pdf.error?<p role="alert" className="mt-5">{ar?'تعذر عرض الملف. حاول مجددًا أو افتح المحتوى العملي.':'Unable to display the file. Retry or open the practical content.'}</p>:pdf.url?<iframe title="PDF" src={pdf.url+'#toolbar=0&navpanes=0&scrollbar=1'} className="mt-5 w-full rounded-2xl border bg-white" style={{height:'85vh'}}/>:null:<iframe key={ar?'ar':'en'} title={ar?lab.title_ar:lab.title_en} srcDoc={content} sandbox="allow-scripts allow-downloads allow-modals" className="mt-5 min-h-[85vh] w-full rounded-2xl border bg-white" style={{height:'85vh'}}/>}
  </>:<section className="academy-card mt-6 max-w-2xl p-8"><h1 className="text-2xl font-bold">{ar?lab.title_ar:lab.title_en}</h1><p className="mt-4">{ar?'هذا المختبر مدفوع. سجّل الدخول بحساب الشراء، أو اشترِ المختبر لفتح المحتوى بعد تأكيد الدفع.':'This lab requires purchase. Sign in with the purchasing account, or purchase it to unlock content after payment confirmation.'}</p><p className="mt-4 text-2xl font-bold" dir="ltr">{Number(lab.price).toFixed(0)} SAR</p><div className="mt-5 flex flex-wrap gap-3"><Link className="academy-btn-primary" to={`/courses/${lab.course_id}`}>{ar?'التفاصيل والشراء':'Details & purchase'}</Link><Link className="academy-btn-dark" to="/login" state={{from:`/labs/${track}/${slug}`}}>{ar?'تسجيل الدخول':'Sign in'}</Link></div></section>}
 </main></MainLayout>
}
