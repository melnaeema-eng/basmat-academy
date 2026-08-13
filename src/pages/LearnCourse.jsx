import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import { supabase } from '../services/supabase';
import { getCurrentUser, getEnrollment } from '../services/enrollmentService';
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

  useEffect(() => {
    async function load() {
      try {
        const user = await getCurrentUser();
        if (!user) {
          setNeedsLogin(true);
          return;
        }
        setUserId(user.id);

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
        setSelectedId(lessonData[0]?.id ?? null);

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
  const progress = useMemo(() => {
    if (!lessons.length) return 0;
    return Math.round((completedIds.size / lessons.length) * 100);
  }, [completedIds, lessons.length]);

  async function toggleCompleted() {
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
      <main dir="rtl" className="min-h-screen bg-gray-50 px-4 py-8 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{course?.title || 'الدورة'}</h1>
                <p className="mt-1 text-gray-500">الدورة المسجلة</p>
              </div>
              <div className="min-w-56">
                <div className="mb-2 flex justify-between text-sm"><span>التقدم</span><span>{progress}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-200"><div className="h-full bg-orange-500" style={{ width: `${progress}%` }} /></div>
              </div>
            </div>
          </div>

          {error && <div className="mb-6 rounded-xl bg-red-100 p-4 text-red-700">{error}</div>}

          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <aside className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">الدروس</h2>
              {lessons.length === 0 && <p className="text-sm text-gray-500">لا توجد دروس منشورة بعد.</p>}
              <div className="space-y-2">
                {lessons.map((lesson, index) => {
                  const done = completedIds.has(lesson.id);
                  return (
                    <button key={lesson.id} onClick={() => setSelectedId(lesson.id)} className={`w-full rounded-xl border p-3 text-right ${selectedLesson?.id === lesson.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white'}`}>
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

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              {!selectedLesson ? (
                <p>اختر درسًا للبدء.</p>
              ) : (
                <>
                  <h2 className="text-2xl font-bold">{selectedLesson.title}</h2>
                  {selectedLesson.description && <p className="mt-3 text-gray-600">{selectedLesson.description}</p>}

                  {selectedLesson.lesson_type === 'video' && selectedLesson.video_url && (
                    <div className="mt-6 overflow-hidden rounded-xl bg-black">
                      {getYouTubeEmbedUrl(selectedLesson.video_url) ? (
                        <iframe className="aspect-video w-full" src={getYouTubeEmbedUrl(selectedLesson.video_url)} title={selectedLesson.title} allowFullScreen />
                      ) : (
                        <video className="aspect-video w-full" controls src={selectedLesson.video_url} />
                      )}
                    </div>
                  )}

                  {selectedLesson.lesson_type === 'text' && (
                    <div className="mt-6 whitespace-pre-wrap rounded-xl bg-gray-50 p-5 leading-8">{selectedLesson.content || 'لا يوجد محتوى نصي.'}</div>
                  )}

                  {selectedLesson.lesson_type === 'file' && selectedLesson.file_url && (
                    <a className="mt-6 inline-block rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white" href={selectedLesson.file_url} target="_blank" rel="noreferrer">فتح ملف الدرس</a>
                  )}

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
