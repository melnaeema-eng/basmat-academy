import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {getLabProgress,saveLabStage} from '../services/labService';
const stages=[['الأهداف والمتطلبات','Objectives and prerequisites'],['المخطط والأجهزة','Topology and equipment'],['العناوين والإعدادات','Addressing and settings'],['خطوات التنفيذ','Execution steps'],['تطبيق أوامر الإعداد','Apply the configuration'],['التحقق من النتائج','Verify the results'],['استكشاف الأعطال','Troubleshooting'],['التسليم والتقييم العملي','Submission and practical assessment']];
export default function LabProgress({lab}){
 const {i18n}=useTranslation(),ar=i18n.language?.startsWith('ar');
 const [state,setState]=useState({loading:true,completed_stages:[],progress:0,canRecord:false});const [saving,setSaving]=useState(false),[error,setError]=useState(false);
 useEffect(()=>{let active=true;setState({loading:true,completed_stages:[],progress:0,canRecord:false});getLabProgress(lab).then(r=>{if(active)setState({...r,loading:false})}).catch(()=>{if(active){setState(s=>({...s,loading:false}));setError(true)}});return()=>{active=false}},[lab.id,lab.course_id]);
 async function change(stage,completed){setSaving(true);setError(false);try{const data=await saveLabStage(lab.id,stage,completed);setState(s=>({...s,...data}))}catch{setError(true)}finally{setSaving(false)}}
 return <section className="academy-card mt-5 p-5" aria-label={ar?'تقدم المختبر':'Lab progress'}>
  <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">{ar?'تقدم المختبر':'Lab progress'}</h2><strong dir="ltr">{state.progress}%</strong></div>
  <div className="academy-progress mt-3" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.progress}><span style={{width:state.progress+'%'}}/></div>
  <p className="mt-3 text-sm text-slate-500">{ar?'بعد تنفيذ كل مرحلة، ضع علامة إكمال. يُحفظ تقدمك في حسابك ويظهر في «دوراتي». هذه نسبة إكمال وليست درجة اختبار.':'Mark each stage after completing it. Progress is saved to your account and shown in My Courses. This is completion progress, not an exam score.'}</p>
  {state.loading?<p className="mt-3">{ar?'جارٍ تحميل التقدم…':'Loading progress…'}</p>:!state.canRecord?<p className="mt-3"><Link className="font-bold text-orange-600" to={state.loginRequired?'/login':`/courses/${lab.course_id}`}>{ar?(state.loginRequired?'سجّل الدخول لحفظ تقدمك':'سجّل في المختبر لحفظ تقدمك'):(state.loginRequired?'Sign in to save progress':'Enroll in this lab to save progress')}</Link></p>:<div className="mt-4 grid gap-3 sm:grid-cols-2">{stages.map(([arabic,english],i)=><label key={i} className="flex cursor-pointer items-center gap-3 rounded-xl border p-3"><input type="checkbox" checked={state.completed_stages.includes(i+1)} disabled={saving} onChange={e=>change(i+1,e.target.checked)} className="h-5 w-5 accent-orange-600"/><span>{i+1}. {ar?arabic:english}</span></label>)}</div>}
  {saving&&<p role="status" className="mt-3 text-sm">{ar?'جارٍ الحفظ…':'Saving…'}</p>}{error&&<p role="alert" className="mt-3 text-sm text-red-700">{ar?'تعذر حفظ أو تحميل التقدم. أعد المحاولة.':'Unable to load or save progress. Please retry.'}</p>}
 </section>;
}
