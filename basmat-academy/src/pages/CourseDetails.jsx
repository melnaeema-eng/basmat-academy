import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MainLayout from "../layouts/MainLayout";
import { supabase } from "../services/supabase";
import { enrollInCourse, getEnrollment } from "../services/enrollmentService";

function getYouTubeEmbedUrl(url) {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname.includes("youtu.be")) {
      const videoId = parsedUrl.pathname.replace("/", "");

      return videoId
        ? `https://www.youtube.com/embed/${videoId}`
        : null;
    }

    if (parsedUrl.hostname.includes("youtube.com")) {
      if (parsedUrl.pathname.includes("/embed/")) {
        return url;
      }

      if (parsedUrl.pathname.includes("/shorts/")) {
        const videoId = parsedUrl.pathname.split("/shorts/")[1]?.split("/")[0];

        return videoId
          ? `https://www.youtube.com/embed/${videoId}`
          : null;
      }

      const videoId = parsedUrl.searchParams.get("v");

      return videoId
        ? `https://www.youtube.com/embed/${videoId}`
        : null;
    }
  } catch {
    return null;
  }

  return null;
}

function isDirectVideo(url) {
  if (!url) return false;

  const cleanUrl = url.split("?")[0].toLowerCase();

  return (
    cleanUrl.endsWith(".mp4") ||
    cleanUrl.endsWith(".webm") ||
    cleanUrl.endsWith(".ogg") ||
    cleanUrl.endsWith(".mov")
  );
}

export default function CourseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollmentMessage, setEnrollmentMessage] = useState("");

  const isArabic = i18n.language?.startsWith("ar");

  useEffect(() => {
    async function loadCourse() {
      setLoading(true);
      setErrorMessage("");

      try {
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("*")
          .eq("id", id)
          .single();

        if (courseError) {
          throw courseError;
        }

        setCourse(courseData);

        const firstVideo =
          courseData.trailer_url ||
          courseData.video_url ||
          courseData.preview_url ||
          "";

        setSelectedVideo(firstVideo);

        /*
          هذا الجزء يجلب دروس الدورة إذا كان جدول lessons موجودًا.
          إذا لم تنشئ الجدول بعد، ستظل صفحة الدورة تعمل بصورة طبيعية.
        */
        const { data: lessonsData, error: lessonsError } = await supabase
          .from("lessons")
          .select("*")
          .eq("course_id", id)
          .order("order_number", { ascending: true });

        if (!lessonsError && lessonsData) {
          setLessons(lessonsData);

          if (!firstVideo && lessonsData.length > 0) {
            setSelectedVideo(lessonsData[0].video_url || "");
            setSelectedLessonId(lessonsData[0].id);
          }
        } else {
          setLessons([]);
        }
      } catch (error) {
        console.error("COURSE DETAILS ERROR:", error);
        setErrorMessage(t("courseDetails.loadError"));
      } finally {
        setLoading(false);
      }
    }

    loadCourse();
  }, [id, t]);

  const title = useMemo(() => {
    if (!course) return "";

    return (
      (isArabic ? course.title_ar : course.title_en) ||
      course.title ||
      t("course.untitled")
    );
  }, [course, isArabic, t]);

  const description = useMemo(() => {
    if (!course) return "";

    return (
      (isArabic ? course.description_ar : course.description_en) ||
      course.description ||
      t("courseDetails.noDescription")
    );
  }, [course, isArabic, t]);

  const category = useMemo(() => {
    if (!course) return "";

    return (
      (isArabic ? course.category_ar : course.category_en) ||
      course.category ||
      ""
    );
  }, [course, isArabic]);

  const level = useMemo(() => {
    if (!course) return "";

    return (
      (isArabic ? course.level_ar : course.level_en) ||
      course.level ||
      t("courseDetails.notSpecified")
    );
  }, [course, isArabic, t]);

  const youtubeEmbedUrl = getYouTubeEmbedUrl(selectedVideo);

  useEffect(() => {
    let mounted = true;

    async function loadEnrollment() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;
      setCurrentUser(user || null);

      if (user) {
        try {
          const existing = await getEnrollment(user.id, id);
          if (mounted) setEnrollment(existing);
        } catch (error) {
          console.error("ENROLLMENT CHECK ERROR:", error);
        }
      }
    }

    loadEnrollment();
    return () => {
      mounted = false;
    };
  }, [id]);

  async function handleEnroll() {
    setEnrollmentMessage("");

    if (!currentUser) {
      navigate("/login", { state: { from: `/courses/${id}` } });
      return;
    }

    if (enrollment) {
      navigate("/my-courses");
      return;
    }

    try {
      setEnrolling(true);
      const created = await enrollInCourse(currentUser.id, id);
      setEnrollment(created);
      setEnrollmentMessage(isArabic ? "تم التسجيل في الدورة بنجاح" : "Successfully enrolled in the course");
    } catch (error) {
      console.error("ENROLLMENT ERROR:", error);
      if (error.code === "23505") {
        const existing = await getEnrollment(currentUser.id, id);
        setEnrollment(existing);
        setEnrollmentMessage(isArabic ? "أنت مسجل في هذه الدورة بالفعل" : "You are already enrolled in this course");
      } else {
        setEnrollmentMessage(isArabic ? "تعذر إكمال التسجيل" : "Could not complete enrollment");
      }
    } finally {
      setEnrolling(false);
    }
  }

  function selectLesson(lesson) {
    setSelectedVideo(lesson.video_url || "");
    setSelectedLessonId(lesson.id);
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500" />

            <p className="mt-4 text-gray-600">
              {t("courseDetails.loading")}
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (errorMessage || !course) {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] items-center justify-center px-6">
          <div className="max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
            <h1 className="text-2xl font-bold text-gray-900">
              {t("courseDetails.notFound")}
            </h1>

            <p className="mt-3 text-gray-600">
              {errorMessage || t("courseDetails.notFoundDescription")}
            </p>

            <Link
              to="/courses"
              className="mt-6 inline-block rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
            >
              {t("courseDetails.backToCourses")}
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <main dir={i18n.dir()} className="min-h-screen bg-gray-50">
        <section className="bg-gradient-to-br from-blue-950 to-blue-700 py-14 text-white">
          <div className="mx-auto max-w-7xl px-6">
            <Link
              to="/courses"
              className="inline-flex items-center text-sm text-blue-100 hover:text-white"
            >
              {isArabic ? "←" : "→"}{" "}
              {t("courseDetails.backToCourses")}
            </Link>

            {category && (
              <p className="mt-6 font-semibold text-orange-300">
                {category}
              </p>
            )}

            <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-tight md:text-5xl">
              {title}
            </h1>

            {course.instructor && (
              <p className="mt-5 text-lg text-blue-100">
                {t("courseDetails.instructor")}: {course.instructor}
              </p>
            )}
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-8">
            <div className="overflow-hidden rounded-2xl bg-black shadow-xl">
              {youtubeEmbedUrl ? (
                <div className="aspect-video">
                  <iframe
                    src={youtubeEmbedUrl}
                    title={title}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : selectedVideo && isDirectVideo(selectedVideo) ? (
                <video
                  key={selectedVideo}
                  controls
                  controlsList="nodownload"
                  className="aspect-video w-full bg-black"
                  poster={course.image || ""}
                >
                  <source src={selectedVideo} />
                  {t("courseDetails.videoNotSupported")}
                </video>
              ) : selectedVideo ? (
                <div className="flex aspect-video items-center justify-center bg-gray-900 p-8 text-center text-white">
                  <div>
                    <p className="text-lg font-semibold">
                      {t("courseDetails.unsupportedVideo")}
                    </p>

                    <a
                      href={selectedVideo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-block rounded-lg bg-orange-500 px-5 py-2 font-semibold hover:bg-orange-600"
                    >
                      {t("courseDetails.openVideo")}
                    </a>
                  </div>
                </div>
              ) : (
                <div className="relative aspect-video">
                  <img
                    src={
                      course.image ||
                      "https://placehold.co/1280x720?text=Course"
                    }
                    alt={title}
                    className="h-full w-full object-cover opacity-70"
                  />

                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <p className="rounded-lg bg-black/60 px-5 py-3 text-white">
                      {t("courseDetails.noVideo")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white p-7 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">
                {t("courseDetails.aboutCourse")}
              </h2>

              <p className="mt-5 whitespace-pre-line leading-8 text-gray-600">
                {description}
              </p>
            </div>

            {lessons.length > 0 && (
              <div className="rounded-2xl bg-white p-7 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {t("courseDetails.lessons")}
                  </h2>

                  <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700">
                    {lessons.length} {t("courseDetails.lessonCount")}
                  </span>
                </div>

                <div className="space-y-3">
                  {lessons.map((lesson, index) => {
                    const lessonTitle =
                      (isArabic ? lesson.title_ar : lesson.title_en) ||
                      lesson.title ||
                      `${t("courseDetails.lesson")} ${index + 1}`;

                    const isSelected = selectedLessonId === lesson.id;

                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => selectLesson(lesson)}
                        className={`flex w-full items-center justify-between rounded-xl border p-4 text-start transition ${
                          isSelected
                            ? "border-orange-500 bg-orange-50"
                            : "border-gray-200 hover:border-blue-400 hover:bg-blue-50"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <span
                            className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${
                              isSelected
                                ? "bg-orange-500 text-white"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            ▶
                          </span>

                          <div>
                            <p className="font-semibold text-gray-900">
                              {lessonTitle}
                            </p>

                            {lesson.duration && (
                              <p className="mt-1 text-sm text-gray-500">
                                {lesson.duration}
                              </p>
                            )}
                          </div>
                        </div>

                        {lesson.is_free && (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            {t("courseDetails.freePreview")}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <aside>
            <div className="sticky top-6 overflow-hidden rounded-2xl bg-white shadow-lg">
              <img
                src={
                  course.image ||
                  "https://placehold.co/600x400?text=Course"
                }
                alt={title}
                className="h-56 w-full object-cover"
              />

              <div className="p-6">
                <div className="mb-6 text-3xl font-bold text-orange-600">
                  {Number(course.price) > 0
                    ? `${course.price} ${t("course.currency")}`
                    : t("course.free")}
                </div>

                <div className="space-y-4 border-y border-gray-200 py-5">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">
                      {t("courseDetails.instructor")}
                    </span>

                    <span className="font-semibold text-gray-900">
                      {course.instructor ||
                        t("courseDetails.notSpecified")}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">
                      {t("courseDetails.level")}
                    </span>

                    <span className="font-semibold text-gray-900">
                      {level}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">
                      {t("courseDetails.duration")}
                    </span>

                    <span className="font-semibold text-gray-900">
                      {course.duration ||
                        t("courseDetails.notSpecified")}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">
                      {t("courseDetails.lessons")}
                    </span>

                    <span className="font-semibold text-gray-900">
                      {lessons.length}
                    </span>
                  </div>
                </div>

                {enrollmentMessage && (
                  <div className="mt-5 rounded-xl bg-green-50 p-3 text-sm font-medium text-green-700">
                    {enrollmentMessage}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className={`mt-6 w-full rounded-xl px-5 py-3 font-bold text-white transition disabled:opacity-60 ${
                    enrollment
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-orange-500 hover:bg-orange-600"
                  }`}
                >
                  {enrolling
                    ? (isArabic ? "جاري التسجيل..." : "Enrolling...")
                    : enrollment
                      ? (isArabic ? "مسجل بالفعل — افتح دوراتي" : "Enrolled — Open My Courses")
                      : !currentUser
                        ? (isArabic ? "سجل الدخول للتسجيل" : "Login to Enroll")
                        : Number(course.price) > 0
                          ? t("courseDetails.enrollNow")
                          : t("courseDetails.startCourse")}
                </button>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </MainLayout>
  );
}