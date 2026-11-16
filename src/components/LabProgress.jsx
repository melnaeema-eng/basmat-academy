import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {getLabProgress,trackLabView} from '../services/labService';
const stages=[['الأهداف والمتطلبات','Objectives and prerequisites'],['المخطط والأجهزة','Topology and equipment'],['العناوين والإعدادات','Addressing and settings'],['خطوات التنفيذ','Execution steps'],['أوامر الإعداد','Configuration commands'],['التحقق من النتائج','Verify the results'],['استكشاف الأعطال','Troubleshooting'],['التسليم والتقييم العملي','Submission and practical assessment']];
export default function LabProgress({lab,contentRef,pdfRequested,pdfView}){
 const {i18n}=useTranslation(),ar=i18n.language?.startsWith('ar');
 const [state,setState]=useState({loading:true,completed_stages:[],stage_progress:[],progress:0,canRecord:false});
 const [error,setError]=useState(false),[observed,setObserved]=useState(null);const latest=useRef(state);latest.current=state;
 useEffect(()=>{let active=true;setError(false);setState({loading:true,completed_stages:[],stage_progress:[],progress:0,canRecord:false});getLabProgress(lab).then(r=>{if(active)setState({...r,loading:false})}).catch(()=>{if(active){setState(s=>({...s,loading:false}));setError(true)}});return()=>{active=false}},[lab.id,lab.course_id]);
 useEffect(()=>{const update=e=>{if(e.detail?.courseId===lab.course_id)setState(s=>({...s,course_progress:e.detail.course_progress,lesson_count:e.detail.lesson_count,lessons:e.detail.lessons}))};window.addEventListener('academy-course-progress',update);return()=>window.removeEventListener('academy-course-progress',update)},[lab.course_id]);
 useEffect(()=>{
  if(!state.canRecord||!state.session_id)return;
  let active=true,busy=false,seen=null,lastSent=null;
  function visible(element){if(!element||document.visibilityState!=='visible'||!document.hasFocus())return false;const r=element.getBoundingClientRect();return Math.min(r.bottom,window.innerHeight)-Math.max(r.top,0)>=Math.min(120,r.height/2)}
  function viewport(){const frame=contentRef.current;if(!frame||pdfRequested)return;const r=frame.getBoundingClientRect();frame.contentWindow?.postMessage({type:'academy-viewport',active:visible(frame),top:Math.max(0,-r.top),bottom:Math.min(r.height,window.innerHeight-r.top)},'*')}
  function message(event){if(event.source!==contentRef.current?.contentWindow||event.data?.type!=='academy-lab-view')return;const stage=event.data.stage;seen=Number.isInteger(stage)&&stage>=1&&stage<=8?stage:null;if(active)setObserved(seen)}
  async function tick(){
   if(busy||!active)return;let stage=null;
   if(pdfRequested&&visible(pdfView?.element)){
    const options=pdfView?.stages||[];stage=options.find(i=>(latest.current.stage_progress?.[i-1]||0)<100)||null;
   }else if(!pdfRequested&&visible(contentRef.current)){stage=seen}
   if(stage===null&&lastSent===null)return;
   busy=true;try{const result=await trackLabView(lab.id,state.session_id,stage);if(active){lastSent=stage;setState(s=>({...s,...result}));setObserved(stage);setError(false)}}catch{if(active)setError(true)}finally{busy=false}
  }
  function visibility(){viewport();if(document.visibilityState!=='visible'||!document.hasFocus()){seen=null;void tick()}}
  window.addEventListener('message',message);window.addEventListener('scroll',viewport,{passive:true});window.addEventListener('resize',viewport);window.addEventListener('focus',viewport);window.addEventListener('blur',visibility);document.addEventListener('visibilitychange',visibility);
  viewport();const v=setInterval(viewport,1000),timer=setInterval(tick,5000);
  return()=>{active=false;void trackLabView(lab.id,state.session_id,null).catch(()=>{});clearInterval(v);clearInterval(timer);window.removeEventListener('message',message);window.removeEventListener('scroll',viewport);window.removeEventListener('resize',viewport);window.removeEventListener('focus',viewport);window.removeEventListener('blur',visibility);document.removeEventListener('visibilitychange',visibility)};
 },[lab.id,state.canRecord,state.session_id,contentRef,pdfRequested,pdfView]);
 return <section className="academy-card mt-5 p-5" aria-label={ar?'تقدم متابعة المختبر':'Lab viewing progress'}>
  <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">{ar?'تقدم متابعة المختبر':'Lab viewing progress'}</h2><strong dir="ltr">{state.progress}%</strong></div>
  <p className="mt-2 font-bold">{ar?'تقدم الدورة لجميع الدروس':'Course progress across all lessons'}: <bdi>{state.course_progress??0}%</bdi> · {state.lesson_count||1} {ar?'درس':'lesson(s)'}</p><div className="academy-progress mt-2" role="progressbar" aria-label={ar?'تقدم الدورة':'Course progress'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.course_progress??0}><span style={{width:(state.course_progress??0)+'%'}}/></div><p className="mt-2 text-sm">{ar?'وزن كل درس في الدورة':'Each lesson contributes'}: <bdi>{(100/(state.lesson_count||1)).toFixed(1)}%</bdi></p><div className="academy-progress mt-3" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.progress}><span style={{width:state.progress+'%'}}/></div>
  <p className="mt-3 text-sm text-slate-500">{ar?'تُحفظ النسبة تلقائيًا حسب ظهور كل مرحلة ومدة متابعتها أثناء القراءة والتمرير. تتوقف المتابعة عند مغادرة التبويب. هذه نسبة متابعة وليست درجة اختبار أو إثباتًا لتنفيذ التجربة.':'Progress is saved automatically from visible sections and viewing time while reading and scrolling. Tracking pauses when you leave the tab. This measures viewing, not an exam score or proof of practical execution.'}</p>
  {state.loading?<p className="mt-3">{ar?'جارٍ تحميل التقدم…':'Loading progress…'}</p>:!state.canRecord?<p className="mt-3"><Link className="font-bold text-orange-600" to={state.loginRequired?'/login':`/courses/${lab.course_id}`}>{ar?(state.loginRequired?'سجّل الدخول لحفظ تقدمك':'سجّل في المختبر لحفظ تقدمك'):(state.loginRequired?'Sign in to save progress':'Enroll in this lab to save progress')}</Link></p>:<ol className="mt-4 grid gap-3 sm:grid-cols-2">{stages.map(([arabic,english],i)=>{const percent=state.stage_progress?.[i]||0;return <li key={i} className={'rounded-xl border p-3 '+(observed===i+1?'border-orange-400 bg-orange-50':'')}><div className="flex items-center justify-between gap-2"><span>{percent===100?'✓ ':''}{i+1}. {ar?arabic:english}</span><bdi className="text-sm font-bold">{percent}%</bdi></div><div className="academy-progress mt-2"><span style={{width:percent+'%'}}/></div></li>})}</ol>}
  {error&&<p role="alert" className="mt-3 text-sm text-red-700">{ar?'توقفت مزامنة التقدم. تحقق من الاتصال وأعد فتح المختبر لاستئناف المتابعة.':'Progress synchronization paused. Check your connection and reopen the lab to resume.'}</p>}
 </section>;
}
