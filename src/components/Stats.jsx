export default function Stats() {
  const stats = [
    { number: "+1000", label: "طالب" },
    { number: "+50", label: "دورة تدريبية" },
    { number: "+25", label: "مدرب محترف" },
    { number: "+15", label: "شهادة احترافية" },
  ];

  return (
    <section className="bg-white py-16">
      <div className="max-w-7xl mx-auto px-6">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">

          {stats.map((item, index) => (
            <div
              key={index}
              className="text-center bg-gray-50 rounded-2xl shadow-md p-8 hover:shadow-xl transition"
            >
              <h2 className="text-5xl font-bold text-orange-500">
                {item.number}
              </h2>

              <p className="mt-4 text-gray-700 text-lg">
                {item.label}
              </p>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}