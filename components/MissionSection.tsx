import { Compass, Wrench, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const pillars: {
  Icon: LucideIcon;
  step: string;
  title: string;
  description: string;
  accent: string;
  iconColor: string;
  stepColor: string;
}[] = [
  {
    Icon: Compass,
    step: "01",
    title: "Explore",
    description:
      "Curious but don't know where to start? Our workshops, demos, and hands-on sessions meet you exactly where you are — no prior experience needed.",
    accent: "bg-[#d97757]/10 border-[#d97757]/20",
    iconColor: "text-[#d97757]",
    stepColor: "text-[#d97757]",
  },
  {
    Icon: Wrench,
    step: "02",
    title: "Build",
    description:
      "Have an idea you actually want to ship? Use the Claude API to build real things — for a class project, a startup pitch, or just because you can.",
    accent: "bg-[#6a9bcc]/10 border-[#6a9bcc]/20",
    iconColor: "text-[#6a9bcc]",
    stepColor: "text-[#6a9bcc]",
  },
  {
    Icon: Users,
    step: "03",
    title: "Connect",
    description:
      "Looking for your people? A community of students, faculty, and industry folks who take AI seriously — but don't gatekeep it.",
    accent: "bg-[#788c5d]/10 border-[#788c5d]/20",
    iconColor: "text-[#788c5d]",
    stepColor: "text-[#788c5d]",
  },
];

export default function MissionSection() {
  return (
    <section className="py-24 bg-[#faf9f5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#d97757] mb-3 block">
            Why We Exist
          </span>
          <h2 className="heading text-3xl sm:text-4xl font-bold text-[#141413] mb-4 leading-tight">
            Most AI content is made
            <br />
            for people who already get it.
          </h2>
          <p className="body-editorial text-lg text-[#b0aea5] max-w-2xl mx-auto leading-relaxed">
            We&apos;re building for everyone else. STEM, liberal arts, business,
            whatever — if you&apos;re at Penn State and curious about AI,
            you&apos;re exactly who this is for.
          </p>
        </div>

        {/* Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="bg-white rounded-2xl border border-[#e8e6dc] p-8 hover:shadow-md transition-shadow duration-200"
            >
              {/* Step + icon row */}
              <div className="flex items-center justify-between mb-6">
                <div
                  className={`w-12 h-12 ${pillar.accent} border rounded-xl flex items-center justify-center ${pillar.iconColor}`}
                >
                  <pillar.Icon size={20} strokeWidth={1.5} />
                </div>
                <span
                  className={`text-2xl font-bold tabular-nums tracking-tight ${pillar.stepColor} opacity-30 select-none`}
                >
                  {pillar.step}
                </span>
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
            &ldquo;The AI wave isn&apos;t coming — it&apos;s here. The students
            who build with it now will define what it looks like for everyone
            else. We want those students to be from Penn State.&rdquo;
          </blockquote>
          <p className="mt-4 text-sm text-[#b0aea5]">— Claude Builder Club</p>
        </div>
      </div>
    </section>
  );
}
