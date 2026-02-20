const stats = [
  { value: "300+", label: "students who didn't wait" },
  { value: "10+", label: "events where things got built" },
  { value: "2+", label: "departments in the room" },
  { value: "20+", label: "projects actually shipped" },
];

export default function StatsSection() {
  return (
    <section className="py-20 bg-[#141413]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-[#b0aea5] text-sm font-medium uppercase tracking-widest">
            The momentum is real
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
