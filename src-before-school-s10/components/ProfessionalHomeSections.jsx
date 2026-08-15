import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {getLearningPaths,getPublicInstructors} from "../services/professionalAcademyService";

export default function ProfessionalHomeSections(){
  const {i18n}=useTranslation();
  const ar=i18n.language?.startsWith("ar");
  const [paths,setPaths]=useState([]);
  const [instructors,setInstructors]=useState([]);

  useEffect(()=>{
    Promise.all([getLearningPaths(),getPublicInstructors()])
      .then(([p,i])=>{setPaths(p.slice(0,3));setInstructors(i.slice(0,4))})
      .catch(()=>{});
  },[]);

  return <>
    {paths.length>0&&<section className="academy-section bg-white">
      <div className="academy-container">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="academy-eyebrow">{ar?"تعلم بخطة":"Learn with a Plan"}</span>
            <h2 className="academy-title mt-3 text-3xl">{ar?"المسارات التعليمية":"Learning Paths"}</h2>
          </div>
          <Link to="/paths" className="font-bold text-orange-600">{ar?"عرض الكل":"View All"} ←</Link>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {paths.map(p=><Link key={p.id} to={`/paths/${p.id}`} className="academy-card overflow-hidden hover:-translate-y-1 hover:shadow-lg">
            <img src={p.image_url||"https://placehold.co/800x450?text=Learning+Path"} className="aspect-video w-full object-cover"/>
            <div className="p-5">
              <h3 className="font-extrabold text-[#08284d]">{p.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-500">{p.description}</p>
              <div className="mt-3 text-xs font-bold text-orange-600">{p.learning_path_courses?.length||0} {ar?"دورة":"courses"}</div>
            </div>
          </Link>)}
        </div>
      </div>
    </section>}

    {instructors.length>0&&<section className="academy-section bg-[#f7f9fc]">
      <div className="academy-container">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="academy-eyebrow">{ar?"خبرات حقيقية":"Real Expertise"}</span>
            <h2 className="academy-title mt-3 text-3xl">{ar?"تعرف على المدربين":"Meet the Instructors"}</h2>
          </div>
          <Link to="/instructors" className="font-bold text-orange-600">{ar?"كل المدربين":"All Instructors"} ←</Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {instructors.map(x=><Link key={x.id} to={`/instructors/${x.id}`} className="academy-card overflow-hidden text-center">
            <img src={x.photo_url||"https://placehold.co/500x500?text=Instructor"} className="aspect-square w-full object-cover"/>
            <div className="p-4"><h3 className="font-extrabold text-[#08284d]">{x.full_name}</h3><p className="mt-1 text-xs text-slate-500">{x.title}</p></div>
          </Link>)}
        </div>
      </div>
    </section>}
  </>
}
