import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaHeart, FaRegHeart, FaStar, FaPlayCircle, FaCheckCircle, FaGlobe, FaSignal, FaClock, FaTimes } from "react-icons/fa";
import MainLayout from "../layouts/MainLayout";
import { supabase } from "../services/supabase";
import { enrollInCourse, getCurrentUser, getEnrollment } from "../services/enrollmentService";
import { getCourseReviews, getMyReview, isCourseWishlisted, saveMyReview, toggleWishlist } from "../services/marketplaceService";
import { addToCart } from "../services/commerceService";

export default function CourseDetails() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const ar = i18n.language?.startsWith("ar");
  const [course,setCourse]=useState(null),[lessons,setLessons]=useState([]),[reviews,setReviews]=useState([]);
  const [enrollment,setEnrollment]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const [wishlisted,setWishlisted]=useState(false),[busy,setBusy]=useState(false),[preview,setPreview]=useState(null);
  const [myReview,setMyReview]=useState(null),[rating,setRating]=useState(5),[reviewText,setReviewText]=useState("");

  async function load(){
    try{
      setLoading(true);setError("");
      const [{data:c,error:ce},{data:l,error:le},reviewRows] = await Promise.all([
        supabase.from("courses").select("*").eq("id",id).single(),
        supabase.rpc("get_course_curriculum_public",{p_course_id:id}),
        getCourseReviews(id),
      ]);
      if(ce)throw ce;if(le)throw le;
      setCourse(c);setLessons(l||[]);setReviews(reviewRows);
      const user=await getCurrentUser();
      if(user){
        const [en,w,mr]=await Promise.all([getEnrollment(id,user.id),isCourseWishlisted(id),getMyReview(id)]);
        setEnrollment(en);setWishlisted(w);setMyReview(mr);
        if(mr){setRating(mr.rating);setReviewText(mr.review_text||"")}
      }
    }catch(e){setError(e.message||"Could not load course")}finally{setLoading(false)}
  }
  useEffect(()=>{load()},[id]);

  const title=useMemo(()=>course?((ar?course.title_ar:course.title_en)||course.title||t("course.untitled")):"",[course,ar,t]);
  const description=useMemo(()=>course?((ar?course.description_ar:course.description_en)||course.description||""):"",[course,ar]);
  const average=reviews.length?reviews.reduce((s,r)=>s+Number(r.rating||0),0)/reviews.length:0;
  const totalMinutes=lessons.reduce((s,l)=>s+(Number.parseInt(l.duration)||0),0);

  async function enroll(){
    try{
      setBusy(true);const user=await getCurrentUser();
      if(!user){navigate("/login",{state:{from:`/courses/${id}`}});return}
      if(enrollment){navigate("/my-courses");return}
      if(Number(course?.price||0)>0){navigate(`/checkout/${id}`);return}
      const created=await enrollInCourse(id,user.id);setEnrollment(created);navigate(`/learn/${id}`);
    }catch(e){alert(e.message)}finally{setBusy(false)}
  }
  async function cart(){
    try{setBusy(true);const user=await getCurrentUser();if(!user){navigate("/login",{state:{from:`/courses/${id}`}});return}await addToCart(id);navigate("/cart")}catch(e){alert(e.message)}finally{setBusy(false)}
  }
  async function wishlist(){
    try{setBusy(true);setWishlisted(await toggleWishlist(id))}catch(e){if(e.message==="LOGIN_REQUIRED")navigate("/login",{state:{from:`/courses/${id}`}});else alert(e.message)}finally{setBusy(false)}
  }
  async function submitReview(e){
    e.preventDefault();
    try{setBusy(true);const saved=await saveMyReview(id,rating,reviewText);setMyReview(saved);setReviews(await getCourseReviews(id))}catch(e){alert(e.message==="LOGIN_REQUIRED"?"Please login first":e.message)}finally{setBusy(false)}
  }

  if(loading)return <MainLayout><div className="flex min-h-[60vh] items-center justify-center">{t("common.loading")}</div></MainLayout>;
  if(error||!course)return <MainLayout><div className="academy-container py-16"><div className="academy-card p-8 text-center text-red-700">{error||"Course not found"}</div></div></MainLayout>;

  return <MainLayout><main dir={i18n.dir()} className="min-h-screen bg-[#f7f9fc]">
    <section className="bg-[#08284d] text-white">
      <div className="academy-container grid gap-8 py-10 lg:grid-cols-[1fr_390px] lg:py-12">
        <div>
          <div className="mb-4 text-sm font-bold text-orange-300">{course.category||"Academy"}</div>
          <h1 className="text-3xl font-extrabold leading-[1.35] md:text-5xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-200 md:text-lg">{description}</p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-amber-300"><FaStar/> <b>{average?average.toFixed(1):"New"}</b> <span className="text-slate-300">({reviews.length})</span></span>
            {course.instructor&&<span>{ar?"المدرب":"Instructor"}: {course.instructor_id?<Link to={`/instructors/${course.instructor_id}`} className="font-bold underline decoration-orange-400 underline-offset-4">{course.instructor}</Link>:<b>{course.instructor}</b>}</span>}
            <span className="flex items-center gap-1"><FaSignal/>{course.level||"All levels"}</span>
            <span className="flex items-center gap-1"><FaGlobe/>{ar?"العربية / الإنجليزية":"Arabic / English"}</span>
          </div>
        </div>
        <aside className="lg:row-span-2">
          <div className="overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl">
            <img src={course.image||"https://placehold.co/800x450?text=Course"} alt={title} className="aspect-video w-full object-cover"/>
            <div className="p-5">
              <div className="text-3xl font-extrabold text-[#08284d]">{Number(course.price)>0?<span dir="ltr">{course.price} SAR</span>:t("common.free")}</div>
              <button onClick={enroll} disabled={busy} className="academy-btn-primary mt-4 w-full">{enrollment?(ar?"اذهب إلى دوراتي":"Go to My Courses"):Number(course.price)>0?(ar?"اشترِ الدورة":"Buy Course"):(ar?"سجل مجانًا":"Enroll for Free")}</button>
              {Number(course.price)>0&&!enrollment&&<button onClick={cart} disabled={busy} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 font-bold text-orange-700 hover:bg-orange-100">🛒 {ar?"أضف للسلة":"Add to Cart"}</button>}
              <button onClick={wishlist} disabled={busy} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 font-bold hover:bg-slate-50">{wishlisted?<FaHeart className="text-red-500"/>:<FaRegHeart/>}{wishlisted?(ar?"في قائمة الرغبات":"Wishlisted"):(ar?"أضف لقائمة الرغبات":"Add to Wishlist")}</button>
              <div className="mt-5 space-y-3 border-t pt-5 text-sm text-slate-600">
                <div className="flex items-center gap-2"><FaPlayCircle className="text-[#f97316]"/>{lessons.length} {ar?"درس":"lessons"}</div>
                {totalMinutes>0&&<div className="flex items-center gap-2"><FaClock className="text-[#f97316]"/>{totalMinutes} {ar?"دقيقة تقريبًا":"minutes approx."}</div>}
                <div className="flex items-center gap-2"><FaCheckCircle className="text-emerald-600"/>{ar?"وصول من الجوال والكمبيوتر":"Access on mobile and desktop"}</div>
                <div className="flex items-center gap-2"><FaCheckCircle className="text-emerald-600"/>{ar?"شهادة عند استيفاء المتطلبات":"Certificate when requirements are met"}</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>

    <div className="academy-container grid gap-7 py-9 lg:grid-cols-[1fr_390px]">
      <div className="space-y-6">
        <section className="academy-card p-6">
          <h2 className="academy-title text-2xl">{ar?"ماذا ستتعلم؟":"What you'll learn"}</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[ar?"فهم المفاهيم الأساسية والتطبيقية للدورة":"Understand core and practical concepts",ar?"تطبيق المعرفة في بيئة عملية":"Apply the knowledge in practical scenarios",ar?"متابعة تقدمك درسًا بعد درس":"Track progress lesson by lesson",ar?"تقييم مستواك عبر الاختبارات":"Assess your skills through exams"].map(x=><div key={x} className="flex gap-2 text-sm leading-7"><FaCheckCircle className="mt-1 shrink-0 text-emerald-600"/><span>{x}</span></div>)}
          </div>
        </section>

        <section className="academy-card overflow-hidden">
          <div className="border-b p-5"><h2 className="academy-title text-2xl">{ar?"محتوى الدورة":"Course content"}</h2><p className="mt-1 text-sm text-slate-500">{lessons.length} {ar?"درس":"lessons"}</p></div>
          <div className="divide-y">{lessons.map((l,i)=><div key={l.id} className="flex items-center justify-between gap-4 p-4"><div className="flex min-w-0 items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold">{i+1}</span><div className="min-w-0"><div className="truncate font-bold text-[#08284d]">{l.title}</div>{l.description&&<div className="mt-1 line-clamp-1 text-xs text-slate-500">{l.description}</div>}</div></div><div className="flex shrink-0 items-center gap-3 text-xs text-slate-500">{l.is_preview&&<button onClick={()=>setPreview(l)} className="rounded-full bg-orange-50 px-2 py-1 font-bold text-orange-700 hover:bg-orange-100">{ar?"معاينة":"Preview"}</button>}{l.duration&&<span dir="ltr">{l.duration}</span>}</div></div>)}
            {!lessons.length&&<div className="p-8 text-center text-slate-500">{ar?"سيتم إضافة محتوى الدورة قريبًا.":"Course content will be added soon."}</div>}
          </div>
        </section>

        <section className="academy-card p-6">
          <h2 className="academy-title text-2xl">{ar?"عن المدرب":"Instructor"}</h2>
          <div className="mt-5 flex items-center gap-4"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#08284d] text-xl font-extrabold text-white">{(course.instructor||"B").charAt(0).toUpperCase()}</div><div><h3 className="text-lg font-extrabold text-[#08284d]">{course.instructor_id?<Link to={`/instructors/${course.instructor_id}`} className="hover:text-orange-600">{course.instructor||"Basmat Alnawabigh Academy"}</Link>:(course.instructor||"Basmat Alnawabigh Academy")}</h3><p className="mt-1 text-sm text-slate-500">{ar?"مدرب متخصص وخبرة عملية في مجال الدورة.":"Specialist instructor with practical field experience."}</p></div></div>
        </section>

        <section className="academy-card p-6">
          <div className="flex items-end justify-between gap-4"><div><h2 className="academy-title text-2xl">{ar?"تقييمات الطلاب":"Student reviews"}</h2><p className="mt-1 text-sm text-slate-500">{reviews.length} {ar?"تقييم":"reviews"}</p></div>{reviews.length>0&&<div className="text-3xl font-extrabold text-[#08284d]">{average.toFixed(1)} <FaStar className="inline text-lg text-amber-400"/></div>}</div>
          <div className="mt-5 space-y-4">{reviews.slice(0,8).map(r=><article key={r.id} className="border-t pt-4"><div className="flex items-center justify-between gap-3"><b>{r.display_name}</b><span className="text-amber-400">{"★".repeat(r.rating)}<span className="text-slate-200">{"★".repeat(5-r.rating)}</span></span></div>{r.review_text&&<p className="mt-2 text-sm leading-7 text-slate-600">{r.review_text}</p>}</article>)}{!reviews.length&&<div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">{ar?"لا توجد تقييمات بعد.":"No reviews yet."}</div>}</div>
          {enrollment&&<form onSubmit={submitReview} className="mt-6 border-t pt-5"><h3 className="font-extrabold text-[#08284d]">{myReview?(ar?"عدّل تقييمك":"Update your review"):(ar?"قيّم هذه الدورة":"Rate this course")}</h3><div className="mt-3 flex gap-1">{[1,2,3,4,5].map(n=><button type="button" key={n} onClick={()=>setRating(n)} className={`text-2xl ${n<=rating?"text-amber-400":"text-slate-200"}`}>★</button>)}</div><textarea value={reviewText} onChange={e=>setReviewText(e.target.value)} className="academy-input mt-3 min-h-24" placeholder={ar?"اكتب تجربتك مع الدورة...":"Share your experience..."}/><button disabled={busy} className="academy-btn-dark mt-3">{ar?"حفظ التقييم":"Save Review"}</button></form>}
        </section>
      </div>
      <div className="hidden lg:block"/>
    </div>
  {preview&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={()=>setPreview(null)}><div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between border-b p-4"><h3 className="font-extrabold text-[#08284d]">{preview.title}</h3><button onClick={()=>setPreview(null)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100"><FaTimes/></button></div>{preview.video_url?<video controls autoPlay className="aspect-video w-full bg-black" src={preview.video_url}/>:preview.file_url?<div className="p-8 text-center"><a href={preview.file_url} target="_blank" rel="noreferrer" className="academy-btn-primary">{ar?"فتح ملف المعاينة":"Open Preview File"}</a></div>:<div className="p-8 text-center text-slate-500">{preview.description|| (ar?"لا يوجد محتوى معاينة لهذا الدرس.":"No preview content for this lesson.")}</div>}</div></div>}
  </main></MainLayout>
}
