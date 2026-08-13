import { useState, useEffect } from "react";
import { uploadCourseImage } from "../../services/storageService";

const emptyCourse = {
  title: "",
  description: "",
  category: "",
  instructor: "",
  price: "",
  level: "",
  duration: "",
  status: "Published",
  image: "",
  featured: false,
};

export default function CourseForm({
  initialData,
  onSubmit,
  submitText = "حفظ الدورة",
}) {

  const [course, setCourse] = useState(emptyCourse);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setCourse({
        title: initialData.title || "",
        description: initialData.description || "",
        category: initialData.category || "",
        instructor: initialData.instructor || "",
        price: initialData.price || "",
        level: initialData.level || "",
        duration: initialData.duration || "",
        status: initialData.status || "Published",
        image: initialData.image || "",
        featured: initialData.featured || false,
      });
    }
  }, [initialData]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setCourse((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0];

    if (!file) return;

    try {
      setUploading(true);

      const imageUrl = await uploadCourseImage(file);

      setCourse((prev) => ({
        ...prev,
        image: imageUrl,
      }));

    } catch (error) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  }

function handleSubmit(e) {
  e.preventDefault();

  onSubmit(course, () => {
    setCourse(emptyCourse);

    // تفريغ حقل اختيار الملف
    const fileInput = document.getElementById("course-image");
    if (fileInput) fileInput.value = "";
  });
}
  return (
    <div className="max-w-4xl mx-auto py-8">

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-lg p-8 space-y-5"
      >

        <h2 className="text-3xl font-bold text-blue-700 mb-6">
          بيانات الدورة
        </h2>

        <input
          type="text"
          name="title"
          placeholder="عنوان الدورة"
          value={course.title}
          onChange={handleChange}
          className="w-full border rounded-lg p-3"
          required
        />

        <textarea
          name="description"
          placeholder="وصف الدورة"
          value={course.description}
          onChange={handleChange}
          className="w-full border rounded-lg p-3 h-32"
        />

        <div className="grid md:grid-cols-2 gap-4">

          <input
            type="text"
            name="category"
            placeholder="التصنيف"
            value={course.category}
            onChange={handleChange}
            className="border rounded-lg p-3"
          />

          <input
            type="text"
            name="instructor"
            placeholder="اسم المدرب"
            value={course.instructor}
            onChange={handleChange}
            className="border rounded-lg p-3"
          />

          <input
            type="number"
            name="price"
            placeholder="السعر"
            value={course.price}
            onChange={handleChange}
            className="border rounded-lg p-3"
          />

          <input
            type="text"
            name="level"
            placeholder="المستوى"
            value={course.level}
            onChange={handleChange}
            className="border rounded-lg p-3"
          />

          <input
            type="text"
            name="duration"
            placeholder="مدة الدورة"
            value={course.duration}
            onChange={handleChange}
            className="border rounded-lg p-3"
          />

          <select
            name="status"
            value={course.status}
            onChange={handleChange}
            className="border rounded-lg p-3"
          >
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
          </select>

        </div>

        <div className="space-y-3">

          <label className="font-semibold">
            صورة الدورة
          </label>

          <input
            id="course-image"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="w-full border rounded-lg p-3"
          />

          {uploading && (
            <p className="text-blue-600">
              جاري رفع الصورة...
            </p>
          )}

        </div>

        {course.image && (
          <div className="mt-4">

            <img
              src={course.image}
              alt="Preview"
              className="w-64 rounded-lg border shadow"
            />

          </div>
        )}

        <label className="flex items-center gap-3">

          <input
            type="checkbox"
            name="featured"
            checked={course.featured}
            onChange={handleChange}
          />

          <span>عرض الدورة في الصفحة الرئيسية</span>

        </label>

        <button
          type="submit"
          className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold"
        >
          {submitText}
        </button>

      </form>

    </div>
  );
}