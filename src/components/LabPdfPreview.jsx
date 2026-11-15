import {useEffect,useRef,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {getLabPdfPreview} from '../services/labService';
export default function LabPdfPreview({lab,onReadingPage}){
 const {i18n}=useTranslation(),ar=i18n.language?.startsWith('ar');
 const [state,setState]=useState({loading:true,pages:[],stages:[],languages:[],error:false}),[page,setPage]=useState(0);
 const canvas=useRef(null),viewer=useRef(null);
 const indices=state.pages.map((_,i)=>i).filter(i=>!state.languages.length||state.languages[i]===(ar?'ar':'en'));
 const actual=indices[Math.min(page,Math.max(0,indices.length-1))];
 useEffect(()=>setPage(0),[ar]);
 useEffect(()=>{let active=true;setPage(0);setState({loading:true,pages:[],stages:[],languages:[],error:false});getLabPdfPreview(lab.id).then(result=>{if(active)setState({...result,loading:false,error:!result.pages.length})}).catch(()=>{if(active)setState({loading:false,pages:[],stages:[],languages:[],error:true})});return()=>{active=false}},[lab.id]);
 useEffect(()=>{let active=true;const data=state.pages[actual];if(!data||!canvas.current)return;const image=new Image();image.onload=()=>{if(!active||!canvas.current)return;const c=canvas.current;c.width=image.width;c.height=image.height;c.getContext('2d').drawImage(image,0,0);onReadingPage?.({element:c,stages:state.stages[actual]||[]})};image.onerror=()=>{if(active)setState(s=>({...s,error:true}))};image.src=data;return()=>{active=false}},[state.pages,state.stages,actual,onReadingPage]);
 if(state.loading)return <p className="mt-5">{ar?'جارٍ تجهيز العرض…':'Preparing the viewer…'}</p>;
 if(state.error)return <p role="alert" className="mt-5">{ar?'تعذر عرض الصفحات. افتح المحتوى العملي أو أعد المحاولة.':'Unable to display the pages. Open the practical content or retry.'}</p>;
 return <section ref={viewer} tabIndex={0} onPointerDown={()=>viewer.current?.focus({preventScroll:true})} onContextMenu={e=>e.preventDefault()} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&['s','p'].includes(e.key.toLowerCase()))e.preventDefault()}} className="mt-5 rounded-2xl border bg-slate-100 p-3 focus:outline-orange-500" aria-label={ar?'عرض صفحات المختبر':'Lab page viewer'}>
  <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><button className="academy-btn-dark disabled:opacity-40" disabled={page===0} onClick={()=>setPage(p=>p-1)}>{ar?'السابق':'Previous'}</button><span>{ar?'الصفحة':'Page'} <bdi>{page+1} / {indices.length}</bdi></span><button className="academy-btn-dark disabled:opacity-40" disabled={page===indices.length-1} onClick={()=>setPage(p=>p+1)}>{ar?'التالي':'Next'}</button></div>
  <canvas ref={canvas} role="img" aria-label={(ar?'صفحة المختبر ':'Lab page ')+(page+1)} className="mx-auto h-auto w-full max-w-4xl bg-white"/>
 </section>;
}
