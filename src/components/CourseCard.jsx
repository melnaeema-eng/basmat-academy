import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useNavigate} from 'react-router-dom';

function mixedText(text){
 const spaced=text.replace(/([\u0621-\u064A])([A-Za-z0-9])/g,'$1 $2').replace(/([A-Za-z0-9])([\u0621-\u064A])/g,'$1 $2');
 return spaced.split(/([A-Za-z0-9][A-Za-z0-9_+./-]*(?:[ \t]+[A-Za-z0-9][A-Za-z0-9_+./-]*)*)/g).map((part,index)=>/^[A-Za-z0-9]/.test(part)?<bdi key={index} dir="ltr">{part}</bdi>:part);
}
function LabCover({track,number}){
 return <div className="relative flex h-52 flex-col justify-center overflow-hidden bg-[#10284c] px-7 text-white" dir="ltr">
  <svg aria-hidden="true" className="absolute inset-0 h-full w-full opacity-20" viewBox="0 0 600 300"><path d="M70 210L200 90L390 90L530 210M70 210H530M200 90L300 210L390 90" fill="none" stroke="#9fd47d" strokeWidth="4"/>{[[70,210],[200,90],[390,90],[530,210],[300,210]].map(([cx,cy])=><circle key={cx} cx={cx} cy={cy} r="13" fill="#9fd47d"/>)}</svg>
  <p className="relative text-xs tracking-wider text-white/75">Basmat Alnawabigh Academy</p>
  <p className="relative mt-3 text-4xl font-extrabold">{track.toUpperCase()} <span className="text-[#ff8b38]">LAB {String(number).padStart(2,'0')}</span></p>
  <p className="relative mt-3 text-sm text-white/80">Configuration · Verification · Troubleshooting</p>
 </div>;
}
export default function CourseCard({course}){
 const {t,i18n}=useTranslation(),navigate=useNavigate(),ar=i18n.language?.startsWith('ar');
 const [imageFailed,setImageFailed]=useState(false);
 const isLab=!!course.lab_track;
 const title=(ar?course.title_ar:course.title_en)||course.title||t('course.untitled');
 const body=isLab?title.replace(/^[^:]+:\s*/,''):title;
 const category=(ar?course.category_ar:course.category_en)||course.category||'';
 return <article className="academy-card group overflow-hidden hover:-translate-y-1 hover:shadow-xl" dir={ar?'rtl':'ltr'}>
  <div className="relative overflow-hidden">
   {isLab?<LabCover track={course.lab_track} number={course.lab_number}/>:course.image&&!imageFailed?<img src={course.image} alt={title} onError={()=>setImageFailed(true)} className="academy-course-image transition duration-500 group-hover:scale-[1.03]"/>:<div className="flex h-52 items-center justify-center bg-[#10284c] px-6 text-center text-2xl font-bold text-white">{ar?'أكاديمية بصمة النوابغ':'Basmat Alnawabigh Academy'}</div>}
   <span className="absolute top-3 right-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-[#071d49] shadow">{ar?mixedText(category||'Academy'):(category||'Academy')}</span>
  </div>
  <div className="p-5">
   {isLab&&<p className="mb-2 text-sm font-bold text-orange-600">{ar?'المختبر':'Lab'} <bdi dir="ltr">{course.lab_number}</bdi></p>}
   <h3 className="line-clamp-3 min-h-24 text-xl font-extrabold leading-8 text-[#071d49]" title={title}>{ar?mixedText(body):body}</h3>
   {course.instructor&&<p className="mt-2 text-sm text-slate-500">{ar?'المدرب: ':'Instructor: '}{ar?course.instructor:(isLab?'Eng. Magdi Alnaeem':course.instructor)}</p>}
   <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4">
    <span className="font-extrabold text-[#ff7417]">{Number(course.price)>0?<><bdi dir="ltr">{course.price}</bdi> {t('course.currency')}</>:t('course.free')}</span>
    <button onClick={()=>navigate(`/courses/${course.id}`)} className="rounded-xl bg-[#071d49] px-4 py-2 text-sm font-bold text-white hover:bg-[#0b2d70]">{t('course.details')}</button>
   </div>
  </div>
 </article>;
}
