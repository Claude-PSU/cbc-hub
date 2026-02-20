const stats = [
  { value: "100+", label: "Club Members" },
  { value: "15+", label: "Events Hosted" },
  { value: "8+", label: "Departments Reached" },
  { value: "20+", label: "Student Projects" },
];

export default function StatsSection() {
  return (
    <section className="py-20 bg-[#141413]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-[#b0aea5] text-sm font-medium uppercase tracking-widest">
            Growing Fast Across Campus
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="heading text-4xl sm:text-5xl font-bold text-white mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-[#b0aea5]">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
