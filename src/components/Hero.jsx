import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <section className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 text-white">
      <div className="max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-10 items-center">

        {/* النص */}
        <div>

          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            تعلم مهارات المستقبل
          </h1>

          <p className="mt-6 text-xl text-gray-200">
            Basmat Academy منصة احترافية لتعليم الشبكات،
            الأمن السيبراني، الذكاء الاصطناعي،
            الحوسبة السحابية ومراكز البيانات.
          </p>

          <div className="mt-10 flex gap-4">

            <Link
              to="/register"
              className="bg-yellow-400 text-black px-8 py-4 rounded-xl font-bold hover:bg-yellow-300"
            >
              ابدأ الآن
            </Link>

            <Link
              to="/courses"
             className="bg-red-400 text-black px-8 py-4 rounded-xl font-bold hover:bg-red-300"
            >
            تصفح الدورات
           </Link>

          </div>

        </div>

        {/* الصورة */}
        <div className="flex justify-center">

          <img
            src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=700"
            alt="Online Learning"
            className="rounded-3xl shadow-2xl"
          />

        </div>

      </div>
    </section>
  );
}