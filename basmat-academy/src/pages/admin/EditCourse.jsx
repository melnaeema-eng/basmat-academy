import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CourseForm from "../../components/admin/CourseForm";
import {
  getCourseById,
  updateCourse,
} from "../../services/adminCourseService";

export default function EditCourse() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);

  useEffect(() => {
    loadCourse();
  }, []);

  async function loadCourse() {
    try {
      const data = await getCourseById(id);
      setCourse(data);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleUpdate(updatedCourse) {
    try {
      await updateCourse(id, updatedCourse);

      alert("✅ تم تحديث الدورة");

      navigate("/admin/courses");
    } catch (err) {
      alert(err.message);
    }
  }

  if (!course) {
    return (
      <div className="text-center py-20 text-xl">
        جاري تحميل بيانات الدورة...
      </div>
    );
  }

  return (
    <CourseForm
      initialData={course}
      onSubmit={handleUpdate}
      submitText="💾 حفظ التعديلات"
    />
  );
}