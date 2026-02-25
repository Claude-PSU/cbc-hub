"use client";

import { useScrollReveal } from "@/hooks/useScrollReveal";
import {
  CalendarDays,
  GraduationCap,
  Layers,
  Code2,
  Newspaper,
  Building2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const features: {
  Icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  badge: string | null;
  badgeColor: string;
  iconBg: string;
  iconColor: string;
  primary?: boolean;
}[] = [
  {
    Icon: CalendarDays,
    title: "Weekly Meetups",
    description:
      "Not a lecture. Every session is hands-on, low-pressure, and built around real projects you can walk away with.",
    href: "/events",
    badge: "Start Here",
    badgeColor: "bg-[#d97757] text-white",
    iconBg: "bg-[#d97757]/10",
    iconColor: "text-[#d97757]",
    primary: true,
  },
  {
    Icon: GraduationCap,
    title: "AI in the Classroom",
    description:
      "See how Penn State professors are embedding AI into real syllabi. Get ahead before your own classes catch up.",
    href: "/case-studies",
    badge: "Growing",
    badgeColor: "bg-[#788c5d]/10 text-[#788c5d]",
    iconBg: "bg-[#788c5d]/10",
    iconColor: "text-[#788c5d]",
  },
  {
    Icon: Layers,
    title: "Resource Hub",
    description:
      "Prompt engineering guides, starter code, and workshop decks. Everything organized so you can find it when you need it.",
    href: "/resources",
    badge: "New",
    badgeColor: "bg-[#6a9bcc]/10 text-[#6a9bcc]",
    iconBg: "bg-[#6a9bcc]/10",
    iconColor: "text-[#6a9bcc]",
  },
  {
    Icon: Code2,
    title: "Student Projects",
    description:
      "See what other students are building with Claude and the Anthropic API. Get inspired, fork something interesting, or submit your own.",
    href: "/projects",
    badge: null,
    badgeColor: "",
    iconBg: "bg-[#d97757]/10",
    iconColor: "text-[#d97757]",
  },
  {
    Icon: Newspaper,
    title: "Newsletter",
    description:
      "Weekly AI news that matters, campus updates, and resources worth bookmarking. No fluff, just signal.",
    href: "/newsletter",
    badge: "Weekly",
    badgeColor: "bg-[#6a9bcc]/10 text-[#6a9bcc]",
    iconBg: "bg-[#6a9bcc]/10",
    iconColor: "text-[#6a9bcc]",
  },
  {
    Icon: Building2,
    title: "Partner With Us",
    description:
      "Professor, student org, or department looking to bring AI into your work? We make it easy to get started.",
    href: "/contact",
    badge: null,
    badgeColor: "",
    iconBg: "bg-[#788c5d]/10",
    iconColor: "text-[#788c5d]",
  },
];

export default function FeaturesSection() {
  const [ref, visible] = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={ref}
      className={`py-24 bg-white transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#d97757] mb-3 block">
            What We Do
          </span>
          <h2 className="heading text-3xl sm:text-4xl font-bold text-[#141413] mb-4">
            One club. Six reasons to show up.
          </h2>
          <p className="body-editorial text-lg text-[#b0aea5] max-w-2xl mx-auto leading-relaxed">
            Whether you want to build, learn, or just stop feeling behind on
            AI, we&apos;ve got you covered.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <a
              key={feature.title}
              href={feature.href}
              className={`group block rounded-2xl p-6 transition-all duration-200 ${
                feature.primary
                  ? "bg-white border-2 border-[#d97757]/30 shadow-sm hover:shadow-md"
                  : "bg-[#faf9f5] hover:bg-white border border-[#e8e6dc] hover:border-[#d97757]/30 hover:shadow-md"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-10 h-10 ${feature.iconBg} rounded-xl flex items-center justify-center ${feature.iconColor} flex-shrink-0`}
                >
                  <feature.Icon size={18} strokeWidth={1.5} />
                </div>
                {feature.badge && (
                  <span
                    className={`text-xs font-medium px-2.5 py-1 ${feature.badgeColor} rounded-full`}
                  >
                    {feature.badge}
                  </span>
                )}
              </div>
              <h3 className="heading text-base font-semibold text-[#141413] group-hover:text-[#d97757] mb-2 transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-[#b0aea5] leading-relaxed">
                {feature.description}
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
