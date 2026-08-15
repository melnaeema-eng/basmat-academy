import {useEffect,useMemo,useState} from "react";
import {Link,Navigate,useParams} from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import {getExamForStudent,submitExam} from "../services/examService";
import {issueCertificateIfEligible} from "../services/certificateService";
import {hasCourseCertificate} from "../services/courseCompletionService";
import {getAttemptReview,getExamSettings} from "../services/proAcademyFinalService";
import {supabase} from "../services/supabase";

export default function ExamAttempt(){
 const{examId}=useParams();
 const[exam,setExam]=useState(null),[answers,setAnswers]=useState({}),[loading,setLoading]=useState(true),[submitting,setSubmitting]=useState(false),[result,setResult]=useState(null),[review,setReview]=useState(null),[settings,setSettings]=useState({}),[secondsLeft,setSecondsLeft]=useState(null),[login,setLogin]=useState(false),[certifiedCourseId,setCertifiedCourseId]=useState(null),[error,setError]=useState("");
 useEffect(()=>{(async()=>{try{const{data:{session}}=await supabase.auth.getSession();if(!session?.user){setLogin(true);return}const[loaded,st]=await Promise.all([getExamForStudent(examId),getExamSettings(examId)]);if(loaded?.course_id&&await hasCourseCertificate(session.user.id,loaded.course_id)){setCertifiedCourseId(loaded.course_id);return}const questions=[...(loaded?.questions||[])];if(st?.randomize_questions)questions.sort(()=>Math.random()-.5);setExam({...loaded,questions});setSettings(st||{});if(st?.duration_minutes)setSecondsLeft(Number(st.duration_minutes)*60)}catch(e){setError(e.message||"تعذر تحميل الاختبار")}finally{setLoading(false)}})()},[examId]);

 useEffect(()=>{if(secondsLeft==null||result||submitting)return;if(secondsLeft<=0){finish(true);return}const t=setTimeout(()=>setSecondsLeft(v=>v-1),1000);return()=>clearTimeout(t)},[secondsLeft,result,submitting]);

 const answered=useMemo(()=>Object.keys(answers).length,[answers]);

 async function finish(force=false){
  if(!exam||submitting||result)return;
  if(!force&&answered<exam.questions.length&&!confirm("لم تجب على كل الأسئلة. هل تريد التسليم؟"))return;
  try{
   setSubmitting(true);setError("");
   const r=await submitExam(exam.id,answers);setResult(r);
   if(r?.passed){try{await issueCertificateIfEligible(exam.course_id)}catch{}}
   if(settings?.show_answers_after_submit){try{setReview(await getAttemptReview(exam.id))}catch{}}
  }catch(e){setError(e.message||"تعذر تسليم الاختبار")}finally{setSubmitting(false)}
 }

 if(login)return <Navigate to="/login" replace/>;
 if(certifiedCourseId)return <MainLayout><main dir="rtl" className="min-h-screen bg-[#f7f9fc] p-6"><div className="mx-auto max-w-2xl academy-card p-8 text-center"><div className="text-5xl">🏆</div><h1 className="mt-4 text-2xl font-bold">هذه الدورة مكتملة</h1><p className="mt-3 text-slate-600">تم إصدار شهادتك بالفعل، لذلك لا تحتاج إلى إعادة الاختبار.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Link to={`/learn/${certifiedCourseId}`} className="academy-btn-dark">مراجعة الدورة</Link><Link to="/certificates" className="academy-btn-primary">عرض الشهادة</Link></div></div></main></MainLayout>;

 return <MainLayout><main dir="rtl" className="min-h-screen bg-[#f7f9fc] p-4 md:p-6"><div className="mx-auto max-w-4xl">
  {loading?<div className="academy-card p-10 text-center">جاري التحميل...</div>:result?<div className="space-y-5"><div className="academy-card p-8 text-center"><div className="text-6xl">{result.passed?"🎉":"📝"}</div><h1 className="mt-4 text-3xl font-bold">{result.passed?"تم اجتياز الاختبار":"لم تحقق درجة النجاح"}</h1><p className="mt-4 text-xl">درجتك: <b>{result.score}%</b></p><p className="mt-2 text-slate-500">درجة النجاح: {result.passing_score}% — المحاولة {result.attempt_number}/{result.max_attempts}</p><div className="mt-6 flex justify-center gap-3"><Link to={`/exams/${result.course_id}`} className="academy-btn-dark">العودة للاختبارات</Link>{result.passed&&<Link to="/certificates" className="academy-btn-primary">شهاداتي</Link>}</div></div>{review?.questions?.length>0&&<div className="academy-card p-6"><h2 className="academy-title text-2xl">مراجعة الإجابات</h2><div className="mt-4 space-y-4">{review.questions.map((q,i)=><div key={q.id} className={`rounded-xl border p-4 ${q.correct?"border-emerald-200 bg-emerald-50":"border-red-200 bg-red-50"}`}><div className="font-bold">{i+1}. {q.question_text}</div><div className="mt-2 text-sm">إجابتك: <b>{q.selected_answer||"—"}</b></div>{!q.correct&&<div className="mt-1 text-sm text-emerald-700">الصحيحة: <b>{q.correct_answer}</b></div>}</div>)}</div></div>}</div>:exam?<><div className="academy-card p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold">{exam.title}</h1><p className="mt-2 text-slate-500">{exam.description}</p><p className="mt-3 text-sm">الأسئلة: {exam.questions.length} — درجة النجاح: {exam.passing_score}% — المتبقي: {exam.remaining_attempts}</p></div>{secondsLeft!=null&&<div dir="ltr" className={`rounded-xl px-4 py-3 text-xl font-extrabold ${secondsLeft<300?"bg-red-50 text-red-700":"bg-slate-100 text-[#08284d]"}`}>{fmt(secondsLeft)}</div>}</div></div><div className="mt-6 space-y-5">{exam.questions.map((q,i)=><div key={q.id} className="academy-card p-5"><h2 className="font-bold">{i+1}. {q.question_text}</h2><div className="mt-4 space-y-2">{q.options.map(opt=><label key={opt} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${answers[q.id]===opt?"border-orange-500 bg-orange-50":""}`}><input type="radio" name={q.id} value={opt} checked={answers[q.id]===opt} onChange={()=>setAnswers({...answers,[q.id]:opt})}/><span>{opt}</span></label>)}</div></div>)}</div>{error&&<div className="mt-5 rounded bg-red-50 p-3 text-red-700">{error}</div>}<button onClick={()=>finish(false)} disabled={submitting} className="academy-btn-primary mt-6">{submitting?"جارٍ التصحيح...":"تسليم الاختبار"}</button></>:<div className="rounded bg-red-50 p-4 text-red-700">{error||"الاختبار غير متاح"}</div>}
 </div></main></MainLayout>
}
function fmt(v){const m=Math.floor(v/60),s=v%60;return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`}
