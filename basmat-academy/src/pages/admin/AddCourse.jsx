import { supabase } from "../../services/supabase";
import CourseForm from "../../components/admin/CourseForm";

export default function AddCourse() {

  async function saveCourse(course, resetForm) {

    const { error } = await supabase
      .from("courses")
      .insert([course]);

    if (error) {
      alert(error.message);
      return;
    }

    alert("✅ تمت إضافة الدورة بنجاح");

    resetForm(); // تفريغ النموذج

  }

  return (
    <CourseForm
      onSubmit={saveCourse}
      submitText="➕ إضافة الدورة"
    />
  );
}