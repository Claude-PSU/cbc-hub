import Link from "next/link";
import Image from "next/image";
import {
  Compass,
  Wrench,
  Users,
  CalendarDays,
  GraduationCap,
  Code2,
  Newspaper,
  Building2,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
import PageHero from "@/components/PageHero";
import AuthCTA from "@/components/AuthCTA";

// ─── Data ─────────────────────────────────────────────────────────────────────

const pillars = [
  {
    icon: Compass,
    step: "01",
    title: "Explore",
    headline: "Start anywhere. Go anywhere.",
    description:
      "You don't need to know what a transformer is to show up. Our workshops, demos, and sessions are designed around genuine curiosity — not prerequisites. We meet people where they are, whether that's absolute beginner or ready to build something production-worthy.",
    accent: "bg-[#d97757]/10 border-[#d97757]/20",
    iconColor: "text-[#d97757]",
    stepColor: "text-[#d97757]",
    bar: "bg-[#d97757]",
  },
  {
    icon: Wrench,
    step: "02",
    title: "Build",
    headline: "Real projects. Real portfolio.",
    description:
      "Ideas are cheap. Shipped things are not. We give you API access, boilerplate code, and people who can help you finish. Whether it's a class project, a startup idea, or just something you think is cool — we're here to get it out the door with you.",
    accent: "bg-[#6a9bcc]/10 border-[#6a9bcc]/20",
    iconColor: "text-[#6a9bcc]",
    stepColor: "text-[#6a9bcc]",
    bar: "bg-[#6a9bcc]",
  },
  {
    icon: Users,
    step: "03",
    title: "Connect",
    headline: "Your people are here.",
    description:
      "AI is more interesting when you're not figuring it out alone. Find collaborators across every college, get mentorship from people one step ahead, and be part of a community that takes AI seriously — without gatekeeping it. Engineers and English majors, welcome.",
    accent: "bg-[#788c5d]/10 border-[#788c5d]/20",
    iconColor: "text-[#788c5d]",
    stepColor: "text-[#788c5d]",
    bar: "bg-[#788c5d]",
  },
];

const activities = [
  {
    icon: CalendarDays,
    title: "Weekly Meetups",
    description:
      "Hands-on sessions every week. No lecture format — just demos, live coding, and people actually building things together. Attendance is free and open.",
    iconBg: "bg-[#d97757]/10",
    iconColor: "text-[#d97757]",
  },
  {
    icon: GraduationCap,
    title: "Class Integrations",
    description:
      "We partner directly with Penn State professors to embed real AI projects into course syllabi. Students get academic credit for building with Claude.",
    iconBg: "bg-[#788c5d]/10",
    iconColor: "text-[#788c5d]",
  },
  {
    icon: Code2,
    title: "Hackathons & Showcases",
    description:
      "Periodic build sprints and showcase events where members demo what they've been working on. Past projects range from research assistants to accessibility tools.",
    iconBg: "bg-[#6a9bcc]/10",
    iconColor: "text-[#6a9bcc]",
  },
  {
    icon: Newspaper,
    title: "AI Newsletter",
    description:
      "Monthly newsletter covering AI news, Claude updates, and campus highlights — written for people who want to stay sharp without drowning in content.",
    iconBg: "bg-[#6a9bcc]/10",
    iconColor: "text-[#6a9bcc]",
  },
  {
    icon: Building2,
    title: "Department Partnerships",
    description:
      "Student organizations, academic departments, and research groups can partner with us to bring AI workshops or collaborative projects to their communities.",
    iconBg: "bg-[#788c5d]/10",
    iconColor: "text-[#788c5d]",
  },
  {
    icon: Users,
    title: "Resource Hub",
    description:
      "Prompt engineering guides, workshop slides, starter code, and API walkthroughs — all organized and accessible to every member.",
    iconBg: "bg-[#d97757]/10",
    iconColor: "text-[#d97757]",
  },
];

const stats = [
  { value: "300+", label: "Members" },
  { value: "Any major", label: "No prerequisites" },
  { value: "Free", label: "Claude Subscription for members" },
  { value: "Official", label: "Anthropic partnership" },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#faf9f5]">
      {/* Hero */}
      <PageHero
        eyebrow="About the Club"
        heading={
          <>
            Penn State&apos;s official
            <br />
            <span className="text-[#d97757]">AI builder community.</span>
          </>
        }
        description="We're the Claude Builder Club — Anthropic's campus partner at Penn State. Our goal is simple: make AI accessible, practical, and genuinely useful for every student, regardless of background."
        action={
          <div className="flex flex-col sm:flex-row gap-3">
            <AuthCTA
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#d97757] hover:bg-[#c86843] text-white text-sm font-medium rounded-xl transition-colors"
            />
            <Link
              href="/events"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-white/20 hover:border-white/40 text-white/70 hover:text-white text-sm font-medium rounded-xl transition-colors"
            >
              See upcoming events
            </Link>
          </div>
        }
        statsBar={
          <div className="flex items-center gap-8 flex-wrap">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="text-white font-semibold text-sm">{s.value}</span>
                <span className="text-[#b0aea5] text-sm">{s.label}</span>
              </div>
            ))}
          </div>
        }
      />

      {/* ── Origin story ──────────────────────────────────────────────────── */}
      <section className="py-24 bg-[#faf9f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Text */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-[#d97757] mb-3 block">
                Our Story
              </span>
              <h2 className="heading text-3xl sm:text-4xl font-bold text-[#141413] mb-6 leading-tight">
                Built from the belief that
                <br />
                AI belongs to everyone.
              </h2>
              <div className="space-y-4 body-editorial text-[#555555] leading-relaxed">
                <p>
                  The Claude Builder Club was founded on a frustration that a lot of
                  Penn State students share: AI was everywhere in the news, but the
                  actual tools and knowledge to work with it felt locked behind CS
                  degrees and industry jobs.
                </p>
                <p>
                  We partnered with Anthropic to change that. As one of Anthropic&apos;s
                  official campus clubs, we get direct API access, educational resources,
                  and support to run a program that actually meets students where they are
                  — whether that&apos;s an engineering lab or an English seminar.
                </p>
                <p>
                  Today the club spans every college at Penn State. Our members have built
                  research assistants, accessibility tools, educational apps, and more —
                  most of them with no prior AI experience when they joined.
                </p>
              </div>
            </div>

            {/* Partnership card */}
            <div className="bg-[#141413] rounded-2xl p-10 relative overflow-hidden">
              {/* Glow */}
              <div className="absolute top-1/4 -right-12 w-48 h-48 bg-[#d97757]/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-1/4 -left-12 w-48 h-48 bg-[#6a9bcc]/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#d97757]/15 border border-[#d97757]/25 rounded-full mb-8">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d97757] inline-block" />
                  <span className="text-xs font-medium text-[#d97757]">Official Anthropic Partner</span>
                </div>

                <div className="flex items-center gap-4 mb-8">
                  <Image
                    src="/branding/anthropic_icon.png"
                    alt="Anthropic"
                    width={40}
                    height={40}
                    className="brightness-0 invert opacity-60"
                  />
                  <div className="w-px h-10 bg-white/10" />
                  <div>
                    <p className="text-sm font-semibold text-white">Anthropic</p>
                    <p className="text-xs text-[#b0aea5]">AI Safety Company</p>
                  </div>
                </div>

                <h3 className="heading text-xl font-bold text-white mb-3 leading-snug">
                  What the partnership means for you
                </h3>
                <ul className="space-y-3">
                  {[
                    "Free Claude Pro subscription for verified members",
                    "Direct API access to build real projects",
                    "Educational resources and workshop curriculum",
                    "Support from Anthropic's campus programs team",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-[#b0aea5]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#d97757] mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Three pillars ─────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#d97757] mb-3 block">
              How We Operate
            </span>
            <h2 className="heading text-3xl sm:text-4xl font-bold text-[#141413] mb-4 leading-tight">
              Three pillars. One community.
            </h2>
            <p className="body-editorial text-lg text-[#b0aea5] max-w-2xl mx-auto leading-relaxed">
              Everything we do maps back to these three ideas. Show up for one and
              you&apos;ll find the others waiting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pillars.map((p) => (
              <div
                key={p.title}
                className="bg-[#faf9f5] rounded-2xl border border-[#e8e6dc] p-8 flex flex-col"
              >
                {/* Icon + step */}
                <div className="flex items-center justify-between mb-6">
                  <div
                    className={`w-12 h-12 ${p.accent} border rounded-xl flex items-center justify-center ${p.iconColor}`}
                  >
                    <p.icon size={20} strokeWidth={1.5} />
                  </div>
                  <span className={`text-2xl font-bold tabular-nums tracking-tight ${p.stepColor} opacity-25 select-none`}>
                    {p.step}
                  </span>
                </div>

                {/* Title */}
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-1 h-4 ${p.bar} rounded-full`} />
                  <h3 className="heading text-xl font-bold text-[#141413]">{p.title}</h3>
                </div>
                <p className="text-sm font-medium text-[#555555] mb-3">{p.headline}</p>
                <p className="body-editorial text-[#b0aea5] leading-relaxed text-sm flex-1">
                  {p.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What we actually do ───────────────────────────────────────────── */}
      <section className="py-24 bg-[#faf9f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-5 bg-[#d97757] rounded-full shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[#d97757]">
                Programs & Activities
              </span>
            </div>
            <h2 className="heading text-3xl sm:text-4xl font-bold text-[#141413] mb-4 leading-tight">
              What we actually do.
            </h2>
            <p className="body-editorial text-lg text-[#b0aea5] max-w-2xl leading-relaxed">
              Beyond "learn AI," here&apos;s the concrete stuff the club runs every semester.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map((a) => (
              <div
                key={a.title}
                className="bg-white rounded-2xl border border-[#e8e6dc] p-6 hover:shadow-md hover:border-[#d97757]/30 transition-all"
              >
                <div className={`w-10 h-10 ${a.iconBg} rounded-xl flex items-center justify-center ${a.iconColor} mb-4`}>
                  <a.icon size={18} strokeWidth={1.5} />
                </div>
                <h3 className="heading text-base font-semibold text-[#141413] mb-2">{a.title}</h3>
                <p className="text-sm text-[#b0aea5] leading-relaxed">{a.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Open to everyone callout ──────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#faf9f5] rounded-2xl border border-[#e8e6dc] p-10 md:p-14 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-[#d97757] mb-3 block">
                Who We&apos;re For
              </span>
              <h2 className="heading text-3xl font-bold text-[#141413] mb-5 leading-tight">
                No CS degree. No prior AI experience.
                <br />
                <span className="text-[#d97757]">No problem.</span>
              </h2>
              <p className="body-editorial text-[#555555] leading-relaxed mb-6">
                Seriously — more than half our members come from non-technical backgrounds.
                Business students have built financial analysis tools. English majors have
                built writing assistants. Pre-med students have built study aids. The only
                thing you need to join is curiosity.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Engineering", "Liberal Arts", "Business", "IST",
                  "Science", "Education", "Communications", "Law",
                ].map((college) => (
                  <span
                    key={college}
                    className="text-xs font-medium px-3 py-1.5 bg-white border border-[#e8e6dc] text-[#6b6860] rounded-full"
                  >
                    {college}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {[
                { step: "1", text: "Create a free account on this site", sub: "Just your PSU email — takes 30 seconds." },
                { step: "2", text: "Complete your member profile", sub: "We use it to surface the right events and resources for you." },
                { step: "3", text: "Show up to your first meeting", sub: "Check the Events page for the next one. No need to RSVP in advance." },
                { step: "4", text: "Claim your free Claude Pro subscription", sub: "Verified members get full access — on us." },
              ].map(({ step, text, sub }) => (
                <div key={step} className="flex gap-4">
                  <div className="w-7 h-7 rounded-full bg-[#d97757]/10 border border-[#d97757]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-[#d97757]">{step}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#141413]">{text}</p>
                    <p className="text-xs text-[#b0aea5] mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Mission quote band ────────────────────────────────────────────── */}
      <section className="py-20 bg-[#faf9f5]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <blockquote className="body-editorial text-2xl sm:text-3xl text-[#141413] font-medium leading-relaxed mb-6">
            &ldquo;The AI wave isn&apos;t coming — it&apos;s here. The students who build
            with it now will define what it looks like for everyone else. We want those
            students to be from Penn State.&rdquo;
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-px bg-[#e8e6dc]" />
            <p className="text-sm text-[#b0aea5]">Claude Builder Club at Penn State</p>
            <div className="w-8 h-px bg-[#e8e6dc]" />
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#141413] rounded-2xl p-10 md:p-14 relative overflow-hidden">
            {/* Glow */}
            <div className="absolute top-0 right-1/4 w-80 h-80 bg-[#d97757]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-[#6a9bcc]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div>
                <h2 className="heading text-2xl sm:text-3xl font-bold text-white mb-3 leading-tight">
                  Ready to start building?
                </h2>
                <p className="text-[#b0aea5] text-base max-w-md leading-relaxed">
                  Join Penn State&apos;s AI community. It&apos;s free, it&apos;s open to everyone,
                  and the next meeting is closer than you think.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <AuthCTA
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#d97757] hover:bg-[#c86843] text-white text-sm font-semibold rounded-xl transition-colors"
                />
                <Link
                  href="/events"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/20 hover:border-white/40 text-white/70 hover:text-white text-sm font-medium rounded-xl transition-colors"
                >
                  <ArrowRight size={15} />
                  See events
                </Link>
                <Link
                  href="https://groupme.com/join_group/108706896/m6t7b7Vs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/20 hover:border-white/40 text-white/70 hover:text-white text-sm font-medium rounded-xl transition-colors"
                >
                  <MessageCircle size={15} />
                  Join GroupMe
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
