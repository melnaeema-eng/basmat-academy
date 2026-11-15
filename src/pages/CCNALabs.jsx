import {useEffect,useState} from "react";
import {useTranslation} from "react-i18next";
import MainLayout from "../layouts/MainLayout";

export default function CCNALabs(){
 const {i18n}=useTranslation();const ar=i18n.language?.startsWith("ar");
 const [labs,setLabs]=useState([]),[status,setStatus]=useState("loading");
 useEffect(()=>{const controller=new AbortController();fetch("/ccna-labs/index.json",{signal:controller.signal,cache:"no-cache"}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{if(!Array.isArray(data.labs))throw Error();setLabs(data.labs.filter(x=>x.status==="published").sort((a,b)=>b.number-a.number));setStatus("ready")}).catch(e=>{if(e.name!=="AbortError")setStatus("error")});return()=>controller.abort()},[]);
 return <MainLayout><section className="academy-container py-12" dir={ar?"rtl":"ltr"}>
  <p className="font-bold text-orange-600">Basmat Alnawabigh Academy • CCNA 200-301</p>
  <h1 className="mt-3 text-3xl font-extrabold text-[#12345b]">{ar?"مختبرات CCNA العملية":"CCNA Practical Labs"}</h1>
  <p className="mt-4 text-slate-600">{ar?"مختبرات متسلسلة للتدريب العملي باستخدام Cisco Packet Tracer — بإشراف المهندس مجدي النعيم.":"Sequential hands-on Cisco Packet Tracer labs — Instructor: Eng. Magdi Alnaeem."}</p>
  <div aria-live="polite" className="mt-8">
   {status==="loading"&&<p>{ar?"جارٍ تحميل المختبرات…":"Loading labs…"}</p>}
   {status==="error"&&<p role="alert">{ar?"تعذر تحميل المختبرات. أعد تحميل الصفحة للمحاولة مجددًا.":"Unable to load labs. Reload the page to try again."}</p>}
   {status==="ready"&&!labs.length&&<div className="academy-card p-6">{ar?"سيظهر أول مختبر هنا بعد نشره. تُضاف المختبرات الجديدة أسبوعيًا.":"The first lab will appear here once published. New labs are added weekly."}</div>}
   <div className="grid gap-5 md:grid-cols-2">{labs.map(lab=><article key={lab.id} className="academy-card p-6">
    <p className="text-sm font-bold text-orange-600">{ar?"مختبر":"Lab"} {lab.number} • {lab.date}</p>
    <h2 className="mt-2 text-xl font-bold text-[#12345b]">{ar?lab.title_ar:lab.title_en}</h2>
    <p className="mt-3 text-slate-600">{ar?lab.summary_ar:lab.summary_en}</p>
    <p className="mt-3 text-sm">{lab.duration_minutes} {ar?"دقيقة":"minutes"}</p>
    {/^\/ccna-labs\/[a-z0-9-]+\/student\.html$/.test(lab.student_url)&&<a href={`${lab.student_url}?lang=${ar?"ar":"en"}`} className="academy-btn-primary mt-5 inline-flex">{ar?"افتح المختبر":"Open lab"}</a>}
   </article>)}</div>
  </div>
 </section></MainLayout>
}
