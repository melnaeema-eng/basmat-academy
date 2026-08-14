import { useEffect, useState } from "react";
import { getAllCourses, deleteCourse } from "../../services/adminCourseService";
import { Link } from "react-router-dom";
export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    const data = await getAllCourses();
    setCourses(data);
  }

  async function handleDelete(id) {
    if (!window.confirm("هل تريد حذف الدورة؟")) return;

    await deleteCourse(id);
    loadCourses();
  }

  const filteredCourses = courses.filter((course) =>
    course.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>

      <div className="flex justify-between items-center mb-8">

        <h1 className="text-4xl font-bold text-blue-700">
          إدارة الدورات
        </h1>

      </div>

      <input
        type="text"
        placeholder="🔍 بحث عن دورة..."
        className="border rounded-lg p-3 w-full mb-6"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <table className="w-full bg-white rounded-xl shadow overflow-hidden">

        <thead className="bg-blue-700 text-white">

          <tr>
            <th className="p-4">الصورة</th>
            <th>اسم الدورة</th>
            <th>المدرب</th>
            <th>التصنيف</th>
            <th>السعر</th>
            <th>المستوى</th>
            <th>النوع</th>
            <th>الحالة</th>
            <th>الإجراءات</th>
          </tr>

        </thead>

        <tbody>

          {filteredCourses.map((course) => (

            <tr
              key={course.id}
              className="border-b hover:bg-gray-50 text-center"
            >

              <td className="p-3">
                <img
                  src={
                    course.image ||
                    "https://placehold.co/120x80?text=Course"
                  }
                  alt={course.title}
                  className="w-20 h-14 rounded object-cover mx-auto"
                />
              </td>

              <td>{course.title}</td>

              <td>{course.instructor}</td>

              <td>{course.category}</td>

              <td>
                {course.price ? `${course.price} ر.س` : "مجاني"}
              </td>

              <td>{course.level}</td>

              <td>{course.course_type === "live" ? "Live" : course.course_type === "hybrid" ? "Hybrid" : "Recorded"}</td>

              <td>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                  {course.status || "Published"}
                </span>
              </td>

              <td>
                <div className="flex justify-center gap-2">
<Link
  to={`/admin/view-course/${course.id}`}
  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
>
  👁 عرض
</Link>
<Link
  to={`/admin/courses/${course.id}/lessons`}
  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
>
  📚 الدروس
</Link>
<Link
  to={`/admin/courses/${course.id}/exams`}
  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded"
>
  📝 الاختبارات
</Link>
<Link
  to={`/admin/edit-course/${course.id}`}
  className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded"
>
  ✏️ تعديل
</Link>
                  
                  <button
                    onClick={() => handleDelete(course.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                  >
                    🗑
                  </button>

                </div>
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}