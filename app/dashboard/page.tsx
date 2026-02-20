"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  Calendar,
  BookOpen,
  Github,
  Bot,
  ArrowRight,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import type { MemberProfile } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getHourGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function isProfileIncomplete(p: MemberProfile): boolean {
  return !p.displayName || !p.major || !p.year || !p.college || !p.techLevel;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Resource {
  title: string;
  href: string;
}

const TAILORED_RESOURCES: Record<MemberProfile["techLevel"], Resource[]> = {
  beginner: [
    { title: "What is a prompt?", href: "/resources" },
    { title: "Claude 101", href: "/resources" },
    { title: "Getting Started with AI", href: "/resources" },
  ],
  some: [
    { title: "Prompt Engineering Basics", href: "/resources" },
    { title: "Your First API Call", href: "/resources" },
    { title: "Building a Chatbot", href: "/resources" },
  ],
  intermediate: [
    { title: "System Prompts Deep Dive", href: "/resources" },
    { title: "Claude API Reference", href: "/resources" },
    { title: "Building with MCP", href: "/resources" },
  ],
  advanced: [
    { title: "Agentic Patterns", href: "/resources" },
    { title: "Production Deployment", href: "/resources" },
    { title: "Fine-tuning Strategies", href: "/resources" },
  ],
  "": [
    { title: "What is a prompt?", href: "/resources" },
    { title: "Claude 101", href: "/resources" },
    { title: "Getting Started with AI", href: "/resources" },
  ],
};

const QUICK_ACTIONS = [
  {
    icon: Calendar,
    title: "Events",
    description: "RSVP to upcoming club meetings, workshops, and hackathons.",
    href: "/events",
    accentColor: "text-[#d97757]",
    accentBg: "bg-[#d97757]/10",
  },
  {
    icon: BookOpen,
    title: "Resources",
    description: "Prompt engineering guides, slide decks, and boilerplate code.",
    href: "/resources",
    accentColor: "text-[#6a9bcc]",
    accentBg: "bg-[#6a9bcc]/10",
  },
  {
    icon: Github,
    title: "Projects",
    description: "Explore real student AI projects from our GitHub showcase.",
    href: "/projects",
    accentColor: "text-[#788c5d]",
    accentBg: "bg-[#788c5d]/10",
  },
  {
    icon: Bot,
    title: "Ask Claude",
    description: "Have a question about the club? Get instant answers.",
    href: "/",
    accentColor: "text-[#d97757]",
    accentBg: "bg-[#d97757]/10",
  },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/auth");
        return;
      }
      const snap = await getDoc(doc(db, "members", u.uid));
      if (!snap.exists()) {
        router.push("/settings");
        return;
      }
      setProfile(snap.data() as MemberProfile);
      setLoading(false);
    });
    return unsubscribe;
  }, [router]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center">
        <div className="text-[#b0aea5] text-sm">Loading…</div>
      </div>
    );
  }

  const firstName = profile.displayName
    ? profile.displayName.split(" ")[0]
    : profile.email.split("@")[0];

  const resources = TAILORED_RESOURCES[profile.techLevel || ""];

  return (
    <div className="min-h-screen bg-[#faf9f5]">

      {/* ── Section A: Personalized header band ── */}
      <section className="bg-[#141413] pt-16 relative overflow-hidden">
        {/* Glow orbs */}
        <div className="absolute top-0 -left-24 w-80 h-80 bg-[#d97757]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#6a9bcc]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Profile incomplete nudge */}
          {isProfileIncomplete(profile) && (
            <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-[#d97757]/10 border border-[#d97757]/20 rounded-xl">
              <AlertCircle size={15} className="text-[#d97757] shrink-0" />
              <p className="text-sm text-[#d97757]">
                Your profile is incomplete.{" "}
                <Link
                  href="/settings"
                  className="underline font-medium hover:text-white transition-colors"
                >
                  Finish setting it up
                </Link>{" "}
                to get personalized event reminders.
              </p>
            </div>
          )}

          {/* Greeting */}
          <h1 className="heading text-3xl sm:text-4xl font-bold text-white leading-tight mb-3">
            Good {getHourGreeting()},{" "}
            <span className="text-[#d97757]">{firstName}</span>
          </h1>

          {/* Major + Year chip */}
          {profile.major && profile.year && (
            <div className="inline-flex items-center px-3 py-1.5 bg-white/[0.07] border border-white/[0.12] rounded-full">
              <span className="text-xs text-[#b0aea5] font-medium">
                {profile.major} · {profile.year}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ── Section B: Quick actions ── */}
      <section className="bg-[#faf9f5] py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold text-[#b0aea5] uppercase tracking-wider mb-5">
            Quick Actions
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.title}
                  href={action.href}
                  className="group bg-white rounded-2xl border border-[#e8e6dc] p-6
                             hover:border-[#d97757]/30 hover:shadow-md
                             transition-all duration-200 flex flex-col gap-4"
                >
                  <div className={`w-10 h-10 ${action.accentBg} rounded-xl flex items-center justify-center shrink-0`}>
                    <Icon size={18} className={action.accentColor} />
                  </div>
                  <div className="flex-1">
                    <h3 className="heading text-sm font-semibold text-[#141413] group-hover:text-[#d97757] mb-1 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-xs text-[#b0aea5] leading-relaxed">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight
                    size={14}
                    className="text-[#d97757] opacity-0 group-hover:opacity-100 transition-opacity self-end"
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Section C: Events + Resources ── */}
      <section className="pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Left: Upcoming Events */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-[#b0aea5] uppercase tracking-wider">
                  Upcoming Events
                </p>
                <Link
                  href="/events"
                  className="text-xs text-[#d97757] hover:underline flex items-center gap-1"
                >
                  View all
                  <ExternalLink size={11} />
                </Link>
              </div>

              {/* Empty state — replace with mapped EventCard components when Google Cal integration is added.
                  Future data shape: { id: string; title: string; date: string; location: string; rsvpUrl: string }[] */}
              <div className="bg-white rounded-2xl border border-[#e8e6dc] p-8 flex flex-col items-center justify-center text-center min-h-[200px]">
                <div className="w-10 h-10 bg-[#e8e6dc] rounded-xl flex items-center justify-center mb-4">
                  <Calendar size={18} className="text-[#b0aea5]" />
                </div>
                <p className="text-sm font-medium text-[#141413] mb-1">
                  No upcoming events yet
                </p>
                <p className="text-xs text-[#b0aea5] leading-relaxed max-w-[200px]">
                  Check back soon — we&apos;re planning something great.
                </p>
                <Link
                  href="/events"
                  className="mt-4 text-xs text-[#d97757] hover:underline font-medium"
                >
                  Browse all events →
                </Link>
              </div>
            </div>

            {/* Right: Tailored Resources */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-[#b0aea5] uppercase tracking-wider">
                  {profile.techLevel ? "Resources for You" : "Getting Started"}
                </p>
                <Link
                  href="/resources"
                  className="text-xs text-[#d97757] hover:underline flex items-center gap-1"
                >
                  All resources
                  <ExternalLink size={11} />
                </Link>
              </div>

              <div className="bg-white rounded-2xl border border-[#e8e6dc] divide-y divide-[#e8e6dc]">
                {resources.map((resource, idx) => (
                  <Link
                    key={idx}
                    href={resource.href}
                    className="group flex items-center justify-between px-6 py-4
                               hover:bg-[#faf9f5] transition-colors
                               first:rounded-t-2xl last:rounded-b-2xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#d97757] shrink-0" />
                      <span className="text-sm text-[#141413] group-hover:text-[#d97757] transition-colors">
                        {resource.title}
                      </span>
                    </div>
                    <ArrowRight
                      size={14}
                      className="text-[#b0aea5] group-hover:text-[#d97757] transition-colors shrink-0"
                    />
                  </Link>
                ))}
              </div>

              {profile.techLevel && (
                <p className="text-xs text-[#b0aea5] mt-3 px-1">
                  Personalized for your{" "}
                  <span className="text-[#141413] font-medium">
                    {profile.techLevel === "some" ? "some experience" : profile.techLevel}
                  </span>{" "}
                  level ·{" "}
                  <Link href="/settings" className="text-[#d97757] hover:underline">
                    update
                  </Link>
                </p>
              )}
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
