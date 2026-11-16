import {uploadLessonFile,lessonFileAccept} from '../../services/lessonFileService';
import { useEffect, useState } from 'react';
import { useTranslation } from "react-i18next";
import { Link, useParams } from 'react-router-dom';
import { getCourseById } from '../../services/adminCourseService';
import { createLesson, deleteLesson, getLessonsByCourse, updateLesson, uploadLessonVideo } from '../../services/lessonService';

const emptyLesson = {
  title: '',
  description: '',
  lesson_type: 'video',
  video_url: '',
  file_url: '',
  content: '',
  duration: '',
  order_number: 1,
  is_preview: false,
  is_published: true,
};

export default function Lessons() {
  const { i18n } = useTranslation();
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [form, setForm] = useState(emptyLesson);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videoFile, setVideoFile] = useState(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [attachmentFile,setAttachmentFile]=useState(null),[saving,setSaving]=useState(false),[uploadProgress,setUploadProgress]=useState('');
  const ar=i18n.language?.startsWith('ar');

  async function load() {
    try {
      const [courseData, lessonData] = await Promise.all([
        getCourseById(courseId),
        getLessonsByCourse(courseId, { includeUnpublished: true }),
      ]);
      setCourse(courseData);
      setLessons(lessonData);
      setForm((prev) => ({ ...prev, order_number: lessonData.length + 1 }));
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [courseId]);

  function change(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function edit(lesson) {
    setAttachmentFile(null);
    setEditingId(lesson.id);
    setForm({
      title: lesson.title || '',
      description: lesson.description || '',
      lesson_type: lesson.lesson_type || 'video',
      video_url: lesson.video_url || '',
      file_url: lesson.file_url || '',
      content: lesson.content || '',
      duration: lesson.duration || '',
      order_number: lesson.order_number || 1,
      is_preview: !!lesson.is_preview,
      is_published: lesson.is_published !== false,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditingId(null);
    setVideoFile(null);
    setAttachmentFile(null);setUploadProgress('');
    setForm({ ...emptyLesson, order_number: lessons.length + 1 });
  }

  async function uploadMp4() {
    if (!videoFile) return alert('اختر ملف MP4 أولاً');
    try {
      setUploadingVideo(true);
      const result = await uploadLessonVideo({ courseId, file: videoFile });
      setForm((prev) => ({ ...prev, video_url: result.publicUrl }));
      alert('تم رفع الفيديو بنجاح. اضغط إضافة الدرس أو حفظ التعديل.');
    } catch (err) {
      alert(err.message || 'تعذر رفع الفيديو');
    } finally {
      setUploadingVideo(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      course_id: courseId,
      order_number: Number(form.order_number) || 1,
    };
    if(form.lesson_type==='file'&&!attachmentFile&&!form.file_url)return alert(ar?'اختر ملف الدرس من جهازك':'Choose a lesson file from your device');
    setSaving(true);setUploadProgress('');let id=editingId;
    try {
      if(attachmentFile){
        if(!id){const draft=await createLesson({...payload,is_published:false});id=draft.id;setEditingId(id)}
        payload.file_url=await uploadLessonFile({courseId,lessonId:id,file:attachmentFile,onProgress:(page,total)=>setUploadProgress(`${page} / ${total}`)});
      }
      if (id) await updateLesson(id, payload);
      else await createLesson(payload);
      await load();reset();
    } catch (err) { alert((id&&!editingId?(ar?'حُفظت مسودة الدرس. أعد محاولة رفع الملف: ':'Lesson draft saved. Retry the file upload: '):'')+err.message); }
    finally{setSaving(false);setUploadProgress('')}
  }

  async function remove(id) {
    if (!window.confirm('هل تريد حذف هذا الدرس؟')) return;
    try {
      await deleteLesson(id);
      await load();
      if (editingId === id) reset();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;

  return (
    <div dir={i18n.language?.startsWith("ar") ? "rtl" : "ltr"} className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#08284d]">إدارة دروس الدورة</h1>
          <p className="mt-1 text-gray-600">{course?.title}</p>
        </div>
        <Link to="/admin/courses" className="rounded-lg bg-gray-700 px-4 py-2 text-white">العودة للدورات</Link>
      </div>

      <form onSubmit={submit} className="academy-card p-6"><fieldset disabled={saving||uploadingVideo} className="space-y-4">
        <h2 className="text-xl font-bold">{editingId ? 'تعديل الدرس' : 'إضافة درس جديد'}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <input name="title" value={form.title} onChange={change} required placeholder="عنوان الدرس" className="rounded-lg border p-3" />
          <select name="lesson_type" value={form.lesson_type} onChange={change} className="rounded-lg border p-3">
            <option value="video">فيديو</option><option value="text">نصي</option><option value="file">ملف</option>
          </select>
          <input name="duration" value={form.duration} onChange={change} placeholder="المدة - مثال 15 دقيقة" className="rounded-lg border p-3" />
          <input name="order_number" type="number" min="1" value={form.order_number} onChange={change} placeholder="الترتيب" className="rounded-lg border p-3" />
        </div>
        <textarea name="description" value={form.description} onChange={change} placeholder="وصف مختصر" className="h-24 w-full rounded-lg border p-3" />
        {form.lesson_type === 'video' && (
          <div className="space-y-3 rounded-xl border bg-gray-50 p-4">
            <input name="video_url" value={form.video_url} onChange={change} placeholder="رابط YouTube أو رابط فيديو مباشر" className="w-full rounded-lg border p-3" />
            <div className="text-center text-sm text-gray-500">أو ارفع فيديو MP4 مباشرة</div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <input type="file" accept="video/mp4,.mp4" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} className="w-full rounded-lg border bg-white p-3" />
              <button type="button" onClick={uploadMp4} disabled={!videoFile || uploadingVideo} className="rounded-lg bg-[#08284d] px-5 py-3 font-semibold text-white disabled:opacity-50">
                {uploadingVideo ? 'جاري رفع الفيديو...' : 'رفع MP4'}
              </button>
            </div>
            <p className="text-xs text-gray-500">الحد الحالي حسب إعداد Storage: 50MB. بعد الرفع سيُملأ رابط الفيديو تلقائيًا.</p>
          </div>
        )}
        {form.lesson_type === 'text' && <textarea name="content" value={form.content} onChange={change} placeholder="محتوى الدرس النصي" className="h-44 w-full rounded-lg border p-3" />}
        <section className="space-y-2 rounded-xl border bg-slate-50 p-4"><label className="block font-bold">{ar?(form.lesson_type==='file'?'رفع ملف الدرس من الجهاز':'إرفاق ملف بالدرس (اختياري)'):(form.lesson_type==='file'?'Upload lesson file from your device':'Attach a lesson file (optional)')}<input key={`${editingId||'new'}-${attachmentFile?'selected':'empty'}`} type="file" accept={lessonFileAccept} disabled={saving} onChange={e=>setAttachmentFile(e.target.files?.[0]||null)} className="mt-2 w-full rounded-lg border bg-white p-3"/></label>{attachmentFile&&<p className="break-all">{attachmentFile.name}</p>}{form.file_url&&!attachmentFile&&<p className="text-sm text-slate-600">{ar?'المرفق الحالي محفوظ. اختر ملفًا جديدًا لاستبداله عند الحفظ.':'The current attachment is saved. Choose a new file to replace it when saving.'}</p>}<p className="text-xs text-slate-500">{ar?'حتى 50MB. PDF حتى 100 صفحة للعرض فقط؛ بقية الملفات المسموحة تُفتح بعد السماح بالمحتوى.':'Up to 50MB. PDF: up to 100 pages for page viewing only; other allowed files open after course authorization.'}</p>{saving&&<p role="status">{ar?'جارٍ الرفع وحفظ الدرس…':'Uploading and saving the lesson…'} {uploadProgress}</p>}</section>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2"><input type="checkbox" name="is_preview" checked={form.is_preview} onChange={change} /> معاينة مجانية</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="is_published" checked={form.is_published} onChange={change} /> منشور</label>
        </div>
        <div className="flex gap-3">
          <button disabled={saving||uploadingVideo} className="disabled:opacity-40 rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white">{editingId ? 'حفظ التعديل' : 'إضافة الدرس'}</button>
          {editingId && <button type="button" disabled={saving} onClick={reset} className="rounded-lg bg-gray-200 px-6 py-3">إلغاء</button>}
        </div>
      </fieldset></form>

      <div className="overflow-hidden rounded-xl bg-white shadow">
        <table className="w-full text-center">
          <thead className="bg-[#08284d] text-white"><tr><th className="p-3">#</th><th>العنوان</th><th>النوع</th><th>المدة</th><th>الحالة</th><th>الإجراءات</th></tr></thead>
          <tbody>
            {lessons.map((lesson) => (
              <tr key={lesson.id} className="border-b">
                <td className="p-3">{lesson.order_number}</td><td>{lesson.title}</td><td>{lesson.lesson_type}</td><td>{lesson.duration || '-'}</td>
                <td>{lesson.is_published ? 'منشور' : 'مخفي'}{lesson.is_preview ? ' / Preview' : ''}</td>
                <td className="space-x-2 space-x-reverse"><button onClick={() => edit(lesson)} className="rounded bg-orange-500 px-3 py-1 text-white">تعديل</button><button onClick={() => remove(lesson.id)} className="rounded bg-red-600 px-3 py-1 text-white">حذف</button></td>
              </tr>
            ))}
            {lessons.length === 0 && <tr><td colSpan="6" className="p-8 text-gray-500">لا توجد دروس بعد.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}