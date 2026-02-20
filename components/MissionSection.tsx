const pillars = [
  {
    icon: "🔍",
    title: "Explore",
    description:
      "Dive into AI concepts — from prompt engineering to model behavior — through guided workshops, demos, and open exploration sessions.",
    accent: "bg-[#d97757]/10 text-[#d97757] border-[#d97757]/20",
  },
  {
    icon: "🔨",
    title: "Build",
    description:
      "Create real AI-powered applications using the Claude API. From class integrations to startup prototypes, you'll ship things that matter.",
    accent: "bg-[#6a9bcc]/10 text-[#6a9bcc] border-[#6a9bcc]/20",
  },
  {
    icon: "🤝",
    title: "Connect",
    description:
      "Join a diverse community of students, faculty, and industry partners united by curiosity, creativity, and a commitment to responsible AI.",
    accent: "bg-[#788c5d]/10 text-[#788c5d] border-[#788c5d]/20",
  },
];

export default function MissionSection() {
  return (
    <section className="py-24 bg-[#faf9f5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#d97757] mb-3 block">
            Our Mission
          </span>
          <h2 className="heading text-3xl sm:text-4xl font-bold text-[#141413] mb-4 leading-tight">
            Anyone Can Shape the Future
            <br />
            with AI
          </h2>
          <p className="body-editorial text-lg text-[#b0aea5] max-w-2xl mx-auto leading-relaxed">
            Regardless of major or technical background, our three pillars guide
            everything we do — and every student is welcome.
          </p>
        </div>

        {/* Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="bg-white rounded-2xl border border-[#e8e6dc] p-8 hover:shadow-md transition-shadow duration-200"
            >
              <div
                className={`w-12 h-12 ${pillar.accent} border rounded-xl flex items-center justify-center text-2xl mb-6`}
              >
                {pillar.icon}
              </div>
              <h3 className="heading text-xl font-semibold text-[#141413] mb-3">
                {pillar.title}
              </h3>
              <p className="body-editorial text-[#b0aea5] leading-relaxed text-sm">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>

        {/* Mission quote */}
        <div className="mt-16 max-w-3xl mx-auto text-center">
          <blockquote className="body-editorial text-lg text-[#b0aea5] italic leading-relaxed">
            &ldquo;We believe in hands-on learning, ethical innovation, and
            creating a campus culture where anyone — regardless of major — can
            shape the future with AI.&rdquo;
          </blockquote>
          <p className="mt-4 text-sm text-[#b0aea5]">— Club Mission Statement</p>
        </div>
      </div>
    </section>
  );
}
