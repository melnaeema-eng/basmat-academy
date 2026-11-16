import {useEffect,useRef,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {supabase} from '../services/supabase';
let youtubeReady;
function loadYouTube(){
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(!youtubeReady)youtubeReady=new Promise((resolve,reject)=>{const previous=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{previous?.();resolve(window.YT)};if(!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')){const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=()=>reject(new Error('YouTube API unavailable'));document.head.appendChild(script)}});
 return youtubeReady;
}
export default function TrackedLabLesson({lesson,embed,src}){
 const {i18n}=useTranslation(),ar=i18n.language?.startsWith('ar');
 const native=useRef(null),mount=useRef(null),player=useRef(null),reader=useRef(null),send=useRef(()=>{});
 const [progress,setProgress]=useState(0),[error,setError]=useState(''),[signedIn,setSignedIn]=useState(false);
 useEffect(()=>{
  let active=true,token=null,timer;let chain=Promise.resolve();setProgress(0);setError('');setSignedIn(false);
  function sample(){const yt=player.current,v=native.current;return lesson.lesson_type==='video'?{playing:yt?yt.getPlayerState?.()===1:!!v&&!v.paused&&!v.ended,position:Math.floor(yt?.getCurrentTime?.()??v?.currentTime??0),duration:Math.floor(yt?.getDuration?.()??v?.duration??0)}:{playing:true,position:null,duration:null}}
  function visible(){const el=reader.current;if(!el||document.visibilityState!=='visible'||!document.hasFocus())return false;const r=el.getBoundingClientRect();return Math.min(r.bottom,window.innerHeight)-Math.max(r.top,0)>=Math.min(120,r.height/2)}
  send.current=(override)=>{const s=sample();if(typeof override==='boolean')s.playing=override;s.playing=s.playing&&visible();if(!active||!token)return;const args={p_lesson_id:lesson.id,p_session_id:token,p_playing:s.playing,p_position:Number.isFinite(s.position)?s.position:null,p_duration:Number.isFinite(s.duration)?s.duration:null};chain=chain.catch(()=>{}).then(async()=>{if(!active)return;const {data,error}=await supabase.rpc('track_academy_lesson_view',args);if(error)throw error;if(active){setProgress(data.progress);window.dispatchEvent(new CustomEvent('academy-course-progress',{detail:{courseId:lesson.course_id,...data}}))}}).catch(e=>{if(active)setError(e.message)})};
  (async()=>{const {data:{session}}=await supabase.auth.getSession();if(!active||!session)return;setSignedIn(true);const {data,error}=await supabase.rpc('open_academy_lesson_tracking',{p_lesson_id:lesson.id});if(error)throw error;if(!active)return;token=data.session_id;setProgress(data.progress);window.dispatchEvent(new CustomEvent('academy-course-progress',{detail:{courseId:lesson.course_id,...data}}));send.current();timer=setInterval(()=>send.current(),5000)})().catch(e=>{if(active)setError(e.message)});
  const visibility=()=>send.current();document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',visibility);
  return()=>{send.current(false);active=false;clearInterval(timer);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',visibility)};
 },[lesson.id,lesson.course_id,lesson.lesson_type]);
 useEffect(()=>{let active=true;if(!embed)return;loadYouTube().then(YT=>{if(!active||!mount.current)return;const node=document.createElement('div');mount.current.replaceChildren(node);player.current=new YT.Player(node,{videoId:embed.split('/').pop(),width:'100%',height:'100%',playerVars:{playsinline:1,origin:window.location.origin},events:{onReady:()=>send.current(),onStateChange:event=>{if(event.data===0){send.current(true);send.current(false)}else if(event.data===2){send.current(true);send.current(false)}else send.current()},onError:()=>setError(ar?'تعذر تشغيل فيديو YouTube':'Unable to play YouTube video')}})}).catch(e=>{if(active)setError(e.message)});return()=>{active=false;player.current?.destroy?.();player.current=null}},[lesson.id,embed,ar]);
 async function stopped(){send.current(true);send.current(false)}
 return <div ref={reader} className="min-w-0 space-y-3">{lesson.lesson_type==='video'?(embed?<div className="aspect-video w-full overflow-hidden rounded-xl bg-black"><div ref={mount} className="h-full w-full"/></div>:<video ref={native} controls playsInline className="aspect-video w-full rounded-xl bg-black" src={src} onPlay={()=>send.current()} onPause={stopped} onEnded={stopped}/>):<div className="whitespace-pre-wrap break-words leading-8">{lesson.content||lesson.description}</div>}
 <p className="text-sm">{ar?'متابعة الدرس':'Lesson viewing'}: <bdi>{progress}%</bdi> {!signedIn&&(ar?'— سجّل الدخول لحفظ المتابعة':'— Sign in to save viewing progress')}</p>{error&&<p role="alert" className="text-sm text-red-700">{ar?'تعذرت مزامنة المتابعة أو تشغيل الفيديو. أعد فتح الدرس بعد التحقق من الاتصال.':'Unable to synchronize progress or play the video. Check your connection and reopen the lesson.'}</p>}</div>;
}
