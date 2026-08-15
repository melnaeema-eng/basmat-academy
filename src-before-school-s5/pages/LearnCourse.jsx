import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import LearningTools from '../components/LearningTools';
import ResumeVideo from '../components/ResumeVideo';
import { issueCertificateIfEligible } from '../services/certificateService';
import { supabase } from '../services/supabase';
import { getCurrentUser, getEnrollment } from '../services/enrollmentService';
import { hasCourseCertificate } from '../services/courseCompletionService';
import {
  getLessonsByCourse,
  getLessonProgress,
  setLessonCompleted,
  updateEnrollmentProgress,
} from '../services/lessonService';

function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.replace('/', '');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname.includes('/embed/')) return url;
      const id = parsed.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export default function LearnCourse() {
  const { courseId } = useParams();
  const [loading, setLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [notEnrolled, setNotEnrolled] = useState(false);
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [completedIds, setCompletedIds] = useState(new Set());
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState('');
  const [certified, setCertified] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const user = await getCurrentUser();
        if (!user) {
          setNeedsLogin(true);
          return;
        }
        setUserId(user.id);
        setCertified(await hasCourseCertificate(user.id, courseId));

        const enrollment = await getEnrollment(courseId, user.id);
        if (!enrollment || enrollment.status === 'cancelled') {
          setNotEnrolled(true);
          return;
        }

        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();
        if (courseError) throw courseError;
        setCourse(courseData);

        const lessonData = await getLessonsByCourse(courseId);
        setLessons(lessonData);
        const saved = localStorage.getItem(`academy:last-lesson:${courseId}`);
        setSelectedId(lessonData.some(x=>x.id===saved) ? saved : (lessonData[0]?.id ?? null));

        const progressData = await getLessonProgress(user.id, courseId);
        setCompletedIds(new Set(progressData.map((item) => item.lesson_id)));
      } catch (err) {
        console.error('LEARN COURSE ERROR:', err);
        setError(err.message || 'تعذر تحميل محتوى الدورة');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId]);

  const selectedLesson = lessons.find((lesson) => lesson.id === selectedId) ?? lessons[0] ?? null;
  const selectedIndex = lessons.findIndex((lesson) => lesson.id === selectedLesson?.id);
  function selectLesson(id){ setSelectedId(id); localStorage.setItem(`academy:last-lesson:${courseId}`, id); window.scrollTo({top:0,behavior:'smooth'}); }
  const progress = useMemo(() => {
    if (!lessons.length) return 0;
    return Math.round((completedIds.size / lessons.length) * 100);
  }, [completedIds, lessons.length]);

  async function toggleCompleted() {
    if (certified) return;
    if (!selectedLesson || !userId) return;
    const isCompleted = completedIds.has(selectedLesson.id);
    const next = new Set(completedIds);
    if (isCompleted) next.delete(selectedLesson.id);
    else next.add(selectedLesson.id);

    try {
      await setLessonCompleted({ lessonId: selectedLesson.id, userId, completed: !isCompleted });
      const nextProgress = lessons.length ? Math.round((next.size / lessons.length) * 100) : 0;
      await updateEnrollmentProgress(courseId, userId, nextProgress);
      setCompletedIds(next);
      if (nextProgress === 100) {
        try { await issueCertificateIfEligible(courseId); } catch { /* final exam may still be required */ }
      }
    } catch (err) {
      alert(err.message || 'تعذر تحديث التقدم');
    }
  }

  if (needsLogin) return <Navigate to="/login" replace />;

  if (loading) {
    return <MainLayout><div className="p-12 text-center">جاري تحميل الدورة...</div></MainLayout>;
  }

  if (notEnrolled) {
    return (
      <MainLayout>
        <div dir="rtl" className="mx-auto max-w-2xl p-12 text-center">
          <h1 className="text-2xl font-bold">هذه الدورة غير مسجلة في حسابك</h1>
          <Link to={`/courses/${courseId}`} className="mt-6 inline-block rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white">العودة إلى صفحة الدورة</Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <main dir="rtl" className="min-h-screen bg-[#f6f8fb] px-3 py-5 md:px-6 md:py-8">
        <div className="mx-auto max-w-7xl">{certified&&<div className="mb-5 rounded-xl bg-emerald-50 p-4 font-bold text-emerald-700">🏆 الدورة مكتملة والشهادة صادرة — وضع المراجعة: يمكنك مشاهدة جميع الدروس دون إعادة الاختبارات.</div>}
          <div className="academy-card mb-5 p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="academy-title text-2xl md:text-3xl">{course?.title || 'الدورة'}</h1>
                <p className="mt-1 text-gray-500">الدورة المسجلة</p>
              </div>
              <div className="min-w-56">
                <div className="mb-2 flex justify-between text-sm"><span>التقدم</span><span>{progress}%</span></div>
                <div className="academy-progress"><span style={{ width: `${progress}%` }} /></div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {!certified && (
                    <Link to={`/exams/${courseId}`} className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white">
                      اختبارات الدورة
                    </Link>
                  )}
                  <Link to={`/completion/${courseId}`} className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white">حالة الإكمال</Link>
                  <Link to={`/qa/${courseId}`} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#08284d]">Q&A</Link>
                  <Link to={`/announcements/${courseId}`} className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700">الإعلانات</Link>
                  {progress === 100 && <Link to="/certificates" className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white">الشهادات</Link>}
                </div>
              </div>
            </div>
          </div>

          {error && <div className="mb-6 rounded-xl bg-red-100 p-4 text-red-700">{error}</div>}

          <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="academy-card h-fit p-4 lg:sticky lg:top-24">
              <h2 className="mb-4 text-xl font-bold">الدروس</h2>
              {lessons.length === 0 && <p className="text-sm text-gray-500">لا توجد دروس منشورة بعد.</p>}
              <div className="space-y-2">
                {lessons.map((lesson, index) => {
                  const done = completedIds.has(lesson.id);
                  return (
                    <button key={lesson.id} onClick={() => selectLesson(lesson.id)} className={`w-full rounded-xl border p-3 text-right ${selectedLesson?.id === lesson.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold">{index + 1}. {lesson.title}</span>
                        <span>{done ? '✅' : '○'}</span>
                      </div>
                      {lesson.duration && <p className="mt-1 text-xs text-gray-500">{lesson.duration}</p>}
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="academy-card overflow-hidden p-4 md:p-6">
              {!selectedLesson ? (
                <p>اختر درسًا للبدء.</p>
              ) : (
                <>
                  <h2 className="text-2xl font-bold">{selectedLesson.title}</h2>
                  {selectedLesson.description && <p className="mt-3 text-gray-600">{selectedLesson.description}</p>}

                  {selectedLesson.lesson_type === 'video' && selectedLesson.video_url && (
                    <div className="mt-5 overflow-hidden rounded-2xl bg-black shadow-xl">
                      {getYouTubeEmbedUrl(selectedLesson.video_url) ? (
                        <iframe className="aspect-video w-full" src={getYouTubeEmbedUrl(selectedLesson.video_url)} title={selectedLesson.title} allowFullScreen />
                      ) : (
                        <ResumeVideo className="aspect-video w-full" src={selectedLesson.video_url} courseId={courseId} lessonId={selectedLesson.id} onEnded={() => { if (!completedIds.has(selectedLesson.id)) toggleCompleted(); }} />
                      )}
                    </div>
                  )}

                  {selectedLesson.lesson_type === 'text' && (
                    <div className="mt-6 whitespace-pre-wrap rounded-xl bg-gray-50 p-5 leading-8">{selectedLesson.content || 'لا يوجد محتوى نصي.'}</div>
                  )}

                  {selectedLesson.lesson_type === 'file' && selectedLesson.file_url && (
                    <a className="mt-6 inline-block rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white" href={selectedLesson.file_url} target="_blank" rel="noreferrer">فتح ملف الدرس</a>
                  )}

                  {selectedLesson.file_url && selectedLesson.lesson_type !== 'file' && <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="font-bold text-[#08284d]">مرفقات الدرس</div><a href={selectedLesson.file_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-bold text-[#f97316]">فتح / تحميل الملف</a></div>}
                  <div className="mt-6 flex items-center justify-between gap-3 border-t pt-5"><button disabled={selectedIndex<=0} onClick={()=>selectLesson(lessons[selectedIndex-1]?.id)} className="rounded-xl border px-4 py-2 font-bold disabled:opacity-30">السابق</button><span className="text-sm text-slate-500">{selectedIndex+1} / {lessons.length}</span><button disabled={selectedIndex<0||selectedIndex>=lessons.length-1} onClick={()=>selectLesson(lessons[selectedIndex+1]?.id)} className="rounded-xl bg-[#071d49] px-4 py-2 font-bold text-white disabled:opacity-30">التالي</button></div>
                  <LearningTools courseId={courseId} lessonId={selectedLesson.id}/>
                  <div className="mt-8 border-t pt-5">
                    <button onClick={toggleCompleted} className={`rounded-lg px-6 py-3 font-semibold text-white ${completedIds.has(selectedLesson.id) ? 'bg-gray-600' : 'bg-green-600'}`}>
                      {completedIds.has(selectedLesson.id) ? 'إلغاء اكتمال الدرس' : 'تم إكمال الدرس'}
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </main>
    </MainLayout>
  );
}
