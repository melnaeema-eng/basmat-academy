import { useState } from "react";
import { supabase } from "../../services/supabase";

export default function AddCourse() {

  const [course, setCourse] = useState({
    title: "",
    description: "",
    category: "",
    instructor: "",
    price: "",
    level: "",
    duration: "",
  });

  const handleChange = (e) => {
    setCourse({
      ...course,
      [e.target.name]: e.target.value,
    });
  };

  async function saveCourse(e) {
  e.preventDefault();

  const { data, error } = await supabase
    .from("courses")
    .insert([course])
    .select();

  console.log("Data:", data);
  console.log("Error:", error);

  if (error) {
    alert(error.message);
    return;
  }

  alert("تمت إضافة الدورة بنجاح ✅");

  setCourse({
    title: "",
    description: "",
    category: "",
    instructor: "",
    price: "",
    level: "",
    duration: "",
  });
}

  return (
    <div className="max-w-3xl mx-auto py-10">

      <h1 className="text-4xl font-bold mb-8">
        إضافة دورة جديدة
      </h1>

      <form
        onSubmit={saveCourse}
        className="space-y-4 bg-white shadow rounded-xl p-8"
      >

        <input
          className="w-full border p-3 rounded"
          placeholder="عنوان الدورة"
          name="title"
          value={course.title}
          onChange={handleChange}
        />

        <textarea
          className="w-full border p-3 rounded"
          placeholder="الوصف"
          name="description"
          value={course.description}
          onChange={handleChange}
        />

        <input
          className="w-full border p-3 rounded"
          placeholder="الفئة"
          name="category"
          value={course.category}
          onChange={handleChange}
        />

        <input
          className="w-full border p-3 rounded"
          placeholder="اسم المدرب"
          name="instructor"
          value={course.instructor}
          onChange={handleChange}
        />

        <input
          className="w-full border p-3 rounded"
          placeholder="السعر"
          type="number"
          name="price"
          value={course.price}
          onChange={handleChange}
        />

        <input
          className="w-full border p-3 rounded"
          placeholder="المستوى"
          name="level"
          value={course.level}
          onChange={handleChange}
        />

        <input
          className="w-full border p-3 rounded"
          placeholder="مدة الدورة"
          name="duration"
          value={course.duration}
          onChange={handleChange}
        />

        <button
          className="bg-orange-500 text-white px-8 py-3 rounded-lg"
        >
          حفظ الدورة
        </button>

      </form>

    </div>
  );
}