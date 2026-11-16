import {useEffect,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {getLessonsByCourse} from '../services/lessonService';
import TrackedLabLesson from './TrackedLabLesson';
export function youtubeEmbed(value){
 try{const u=new URL(value);let id;if(['youtu.be','www.youtu.be'].includes(u.hostname))id=u.pathname.slice(1);else if(['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname))id=u.pathname.startsWith('/embed/')?u.pathname.split('/')[2]:u.searchParams.get('v');return /^[\w-]{11}$/.test(id||'')?`https://www.youtube.com/embed/${id}`:null}catch{return null}
}
function safeUrl(value){try{const u=new URL(value,window.location.origin);return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null}}
export default function LabLessons({lab}){
 const {i18n}=useTranslation(),ar=i18n.language?.startsWith('ar');
 const [lessons,setLessons]=useState([]),[selected,setSelected]=useState(null),[error,setError]=useState(false);
 useEffect(()=>{let active=true;setLessons([]);setSelected(null);setError(false);getLessonsByCourse(lab.course_id).then(rows=>{if(active)setLessons(rows.filter(x=>x.id!==lab.lesson_id&&x.file_url!==`/labs/${lab.track}/${lab.slug}`))}).catch(()=>{if(active)setError(true)});return()=>{active=false}},[lab.course_id,lab.lesson_id,lab.track,lab.slug]);
 if(error)return <p role="alert" className="mt-4">{ar?'تعذر تحميل الدروس الإضافية. أعد تحميل الصفحة.':'Unable to load additional lessons. Reload the page.'}</p>;
 if(!lessons.length)return null;
 const item=lessons.find(x=>x.id===selected),video=safeUrl(item?.video_url),file=safeUrl(item?.file_url),embed=youtubeEmbed(video);
 return <section className="academy-card mt-5 min-w-0 p-4" aria-label={ar?'دروس المختبر':'Lab lessons'}>
  <h2 className="text-xl font-bold">{ar?'دروس المختبر':'Lab lessons'}</h2>
  <div className="mt-3 flex flex-wrap gap-2"><button className={!selected?'academy-btn-primary':'academy-btn-dark'} onClick={()=>setSelected(null)}>{ar?'ورقة المختبر':'Lab worksheet'}</button>{lessons.map((x,i)=><button key={x.id} aria-pressed={selected===x.id} onClick={()=>setSelected(x.id)} className={selected===x.id?'academy-btn-primary':'academy-btn-dark'}>{i+1}. {x.title}</button>)}</div>
  {item&&<article className="mt-5 min-w-0 space-y-4"><h3 className="text-lg font-bold">{item.title}</h3><p>{item.description}</p><TrackedLabLesson key={item.id} lesson={item} embed={embed} src={video}/>{file&&<a href={file} target="_blank" rel="noopener noreferrer" className="inline-block font-bold text-orange-600">{ar?'فتح المرفق':'Open attachment'}</a>}</article>}
 </section>;
}
