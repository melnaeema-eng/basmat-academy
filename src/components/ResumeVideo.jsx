import {useEffect,useRef} from "react";
import {getWatchState,saveWatchState} from "../services/finalProductionService";
export default function ResumeVideo({src,courseId,lessonId,onEnded,className=""}){
 const ref=useRef(null),lastSaved=useRef(0);
 useEffect(()=>{let live=true;(async()=>{try{const st=await getWatchState(lessonId);if(live&&ref.current&&st?.position_seconds>0&&st.position_seconds<(st.duration_seconds||Infinity)-5)ref.current.currentTime=st.position_seconds}catch{}})();return()=>{live=false}},[lessonId]);
 async function persist(){const v=ref.current;if(!v)return;try{await saveWatchState({courseId,lessonId,positionSeconds:v.currentTime,durationSeconds:v.duration})}catch{}}
 function time(){const v=ref.current;if(!v)return;if(Math.abs(v.currentTime-lastSaved.current)>=10){lastSaved.current=v.currentTime;persist()}}
 return <video ref={ref} className={className} controls src={src} onTimeUpdate={time} onPause={persist} onEnded={async()=>{await saveWatchState({courseId,lessonId,positionSeconds:0,durationSeconds:ref.current?.duration});onEnded?.()}}/>
}
