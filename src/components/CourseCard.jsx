export default function CourseCard({ course }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition">

      <div className="h-48 bg-gray-200 flex items-center justify-center">
        <span className="text-6xl">🎓</span>
      </div>

      <div className="p-6">

        <h3 className="text-2xl font-bold">
          {course.title}
        </h3>

        <p className="text-gray-500 mt-2">
          {course.category}
        </p>

        <p className="mt-4">
          👨‍🏫 {course.instructor}
        </p>

        <div className="flex justify-between items-center mt-6">

          <span className="text-orange-600 font-bold text-xl">
            {course.price}
          </span>

          <button className="bg-blue-700 text-white px-4 py-2 rounded-lg">
            التفاصيل
          </button>

        </div>

      </div>

    </div>
  );
}