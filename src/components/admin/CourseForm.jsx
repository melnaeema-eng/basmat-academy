import {useEffect,useState} from "react";
import {useTranslation} from "react-i18next";
import {uploadCourseImage} from "../../services/storageService";
import {adminGetInstructors} from "../../services/professionalAcademyService";

const empty={
  title:"",description:"",category:"",instructor:"",instructor_id:"",
  price:"",level:"",duration:"",status:"Published",image:"",
  featured:false,course_type:"recorded"
};

export default function CourseForm({initialData,onSubmit,submitText}){
  const {t,i18n}=useTranslation();
  const ar=i18n.language?.startsWith("ar");
  const [course,setCourse]=useState(empty);
  const [uploading,setUploading]=useState(false);
  const [instructors,setInstructors]=useState([]);

  useEffect(()=>{
    if(initialData){
      setCourse({
        ...empty,
        ...initialData,
        title:initialData.title||"",
        description:initialData.description||"",
        image:initialData.image||"",
        featured:!!initialData.featured,
        course_type:initialData.course_type||"recorded",
        instructor_id:initialData.instructor_id||"",
      });
    }
  },[initialData]);

  useEffect(()=>{
    adminGetInstructors().then(setInstructors).catch(()=>setInstructors([]));
  },[]);

  function change(e){
    const {name,value,type,checked}=e.target;
    setCourse(p=>({...p,[name]:type==="checkbox"?checked:value}));
  }

  async function upload(e){
    const f=e.target.files?.[0];
    if(!f)return;
    try{
      setUploading(true);
      const url=await uploadCourseImage(f);
      setCourse(p=>({...p,image:url}));
    }catch(e){
      alert(e.message);
    }finally{
      setUploading(false);
    }
  }

  function selectInstructor(e){
    const id=e.target.value;
    const selected=instructors.find(x=>x.id===id);
    setCourse(p=>({
      ...p,
      instructor_id:id,
      instructor:selected?.full_name||p.instructor,
    }));
  }

  function submit(e){
    e.preventDefault();
    onSubmit({...course,instructor_id:course.instructor_id||null},()=>{
      setCourse(empty);
      const f=document.getElementById("course-image");
      if(f)f.value="";
    });
  }

  return <div className="mx-auto max-w-5xl">
    <form onSubmit={submit} className="academy-card p-5 md:p-7">
      <h1 className="academy-title text-2xl">{t("courseForm.title")}</h1>
      <p className="mt-2 text-sm text-slate-500">{t("admin.coursesDesc")}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field label={t("courseForm.courseTitle")}>
          <input required name="title" value={course.title} onChange={change} className="academy-input"/>
        </Field>

        <Field label={t("courseForm.category")}>
          <input name="category" value={course.category} onChange={change} className="academy-input"/>
        </Field>

        <Field label={t("courseForm.instructor")}>
          <input name="instructor" value={course.instructor} onChange={change} className="academy-input"/>
        </Field>

        <Field label={ar?"ملف المدرب المرتبط":"Linked Instructor Profile"}>
          <select name="instructor_id" value={course.instructor_id||""} onChange={selectInstructor} className="academy-input">
            <option value="">—</option>
            {instructors.map(x=><option key={x.id} value={x.id}>{x.full_name}</option>)}
          </select>
        </Field>

        <Field label={t("courseForm.price")}>
          <input type="number" min="0" name="price" value={course.price} onChange={change} className="academy-input" dir="ltr"/>
        </Field>

        <Field label={t("courseForm.level")}>
          <input name="level" value={course.level} onChange={change} className="academy-input"/>
        </Field>

        <Field label={t("courseForm.duration")}>
          <input name="duration" value={course.duration} onChange={change} className="academy-input"/>
        </Field>

        <Field label={t("courseForm.type")}>
          <select name="course_type" value={course.course_type} onChange={change} className="academy-input">
            <option value="recorded">{t("courseForm.recorded")}</option>
            <option value="live">{t("courseForm.live")}</option>
            <option value="hybrid">{t("courseForm.hybrid")}</option>
          </select>
        </Field>

        <Field label={t("courseForm.status")}>
          <select name="status" value={course.status} onChange={change} className="academy-input">
            <option value="Published">{t("courseForm.published")}</option>
            <option value="Draft">{t("courseForm.draft")}</option>
          </select>
        </Field>
      </div>

      <Field label={t("courseForm.description")} cls="mt-4">
        <textarea name="description" value={course.description} onChange={change} className="academy-input min-h-32"/>
      </Field>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_300px]">
        <div>
          <Field label={t("courseForm.image")}>
            <input id="course-image" type="file" accept="image/*" onChange={upload} className="academy-input bg-white"/>
          </Field>
          {uploading&&<p className="mt-2 text-sm text-blue-600">{t("courseForm.uploading")}</p>}
          <label className="mt-5 flex items-center gap-3 font-semibold">
            <input type="checkbox" name="featured" checked={course.featured} onChange={change}/>
            {t("courseForm.featured")}
          </label>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {course.image
            ? <img src={course.image} alt="" className="aspect-video w-full object-cover"/>
            : <div className="flex aspect-video items-center justify-center text-sm text-slate-400">{t("courseForm.image")}</div>}
        </div>
      </div>

      <div className="mt-7 flex justify-end">
        <button className="academy-btn-primary">{submitText||t("courseForm.save")}</button>
      </div>
    </form>
  </div>
}

function Field({label,children,cls=""}){
  return <label className={`block ${cls}`}>
    <span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span>
    {children}
  </label>
}
