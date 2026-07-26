import { useEffect, useState } from "react";
import CourseCard from "./CourseCard";
import { getCourses } from "../services/courseService";

export default function CourseSection() {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    async function loadCourses() {
      try {
        const data = await getCourses();
        setCourses(data);
      } catch (err) {
        console.error(err);
      }
    }

    loadCourses();
  }, []);

  return (
    <section className="py-20 bg-gray-100">
      <div className="max-w-7xl mx-auto px-6">

        <h2 className="text-4xl font-bold text-center text-blue-700 mb-12">
          أحدث الدورات
        </h2>

        <div className="grid md:grid-cols-3 gap-8">

          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
            />
          ))}

        </div>

      </div>
    </section>
  );
}