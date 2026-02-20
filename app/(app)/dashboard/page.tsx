"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, getDocs, setDoc, deleteDoc, collection } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  Calendar,
  BookOpen,
  Github,
  Bot,
  ArrowRight,
  AlertCircle,
  ExternalLink,
  Clock,
  MapPin,
  Users,
  Loader2,
} from "lucide-react";
import type { MemberProfile } from "@/lib/types";
import type { CalendarEvent } from "@/app/(app)/api/events/route";

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

function formatEventTime(start: string, isAllDay: boolean): string {
  if (isAllDay) return new Date(start).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const d = new Date(start);
  const date = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}

function formatDateBadge(start: string): { month: string; day: string } {
  const d = new Date(start);
  return {
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: d.getDate().toString(),
  };
}

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Resource {
  title: string;
  href: string;
}

const TAILORED_RESOURCES: Record<MemberProfile["techLevel"], Resource[]> = {
  beginner: [
    { title: "What is a prompt?",        href: "/resources#what-is-a-prompt" },
    { title: "Claude 101",               href: "/resources#claude-101" },
    { title: "Penn State's AI Position", href: "/resources#psu-ai-policy" },
  ],
  some: [
    { title: "Prompt Anatomy",           href: "/resources#prompt-anatomy" },
    { title: "API Workshop Boilerplate", href: "/resources#workshop-api-boilerplate" },
    { title: "Chain-of-Thought",         href: "/resources#chain-of-thought" },
  ],
  intermediate: [
    { title: "System Prompts Deep Dive", href: "/resources#system-prompts-deep-dive" },
    { title: "Claude API Reference",     href: "/resources#claude-api-reference" },
    { title: "Chain-of-Thought",         href: "/resources#chain-of-thought" },
  ],
  advanced: [
    { title: "Claude API Reference",     href: "/resources#claude-api-reference" },
    { title: "System Prompts Deep Dive", href: "/resources#system-prompts-deep-dive" },
    { title: "Anthropic Responsible AI", href: "/resources#anthropic-responsible-ai" },
  ],
  "": [
    { title: "What is a prompt?",        href: "/resources#what-is-a-prompt" },
    { title: "Claude 101",               href: "/resources#claude-101" },
    { title: "Penn State's AI Position", href: "/resources#psu-ai-policy" },
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

// ─── Dashboard Event Row ───────────────────────────────────────────────────────

interface EventRowProps {
  event: CalendarEvent;
  rsvpCount: number;
  isRsvped: boolean;
  isProcessing: boolean;
  onRsvp: (id: string) => void;
}

function DashboardEventRow({ event, rsvpCount, isRsvped, isProcessing, onRsvp }: EventRowProps) {
  const badge = formatDateBadge(event.start);
  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-[#faf9f5] transition-colors">
      {/* Date badge */}
      <div className="shrink-0 flex flex-col items-center bg-[#d97757]/10 border border-[#d97757]/20 rounded-xl px-2 py-1.5 min-w-[40px] text-center">
        <span className="text-[8px] font-bold text-[#d97757] tracking-widest leading-none">{badge.month}</span>
        <span className="text-[15px] font-bold text-[#d97757] leading-tight">{badge.day}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#141413] truncate">{event.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-[#b0aea5] flex items-center gap-1">
            <Clock size={10} className="shrink-0" />
            {formatEventTime(event.start, event.isAllDay)}
          </span>
          {event.location && (
            <>
              <span className="text-[#e8e6dc]">·</span>
              <span className="text-xs text-[#b0aea5] flex items-center gap-1 truncate">
                <MapPin size={10} className="shrink-0" />
                <span className="truncate">{event.location}</span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* RSVP */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-[#b0aea5] flex items-center gap-1 hidden sm:flex">
          <Users size={11} />
          {rsvpCount}
        </span>
        <button
          onClick={() => onRsvp(event.id)}
          disabled={isProcessing}
          className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-60 ${
            isRsvped
              ? "bg-[#d97757]/10 text-[#d97757] border border-[#d97757]/20 hover:bg-red-50 hover:text-red-500 hover:border-red-200"
              : "bg-[#d97757] text-white hover:bg-[#c86843]"
          }`}
        >
          {isProcessing ? (
            <Loader2 size={11} className="animate-spin" />
          ) : isRsvped ? (
            "Going ✓"
          ) : (
            "RSVP"
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [rsvpCounts, setRsvpCounts] = useState<Record<string, number>>({});
  const [userRsvps, setUserRsvps] = useState<Set<string>>(new Set());
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [rsvping, setRsvping] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/auth"); return; }
      setUser(u);

      const snap = await getDoc(doc(db, "members", u.uid));
      if (!snap.exists()) { router.push("/settings"); return; }
      setProfile(snap.data() as MemberProfile);
      setLoading(false);

      // Fetch next 3 events + their RSVP data in parallel
      try {
        const res = await fetch("/api/events");
        const data = await res.json();
        const eventList: CalendarEvent[] = (data.events ?? []).slice(0, 3);
        setEvents(eventList);

        if (eventList.length > 0) {
          const counts: Record<string, number> = {};
          const rsvped = new Set<string>();
          await Promise.all(
            eventList.map(async (event) => {
              const attendeesSnap = await getDocs(collection(db, "rsvps", event.id, "attendees"));
              counts[event.id] = attendeesSnap.size;
              if (attendeesSnap.docs.some((d) => d.id === u.uid)) rsvped.add(event.id);
            })
          );
          setRsvpCounts(counts);
          setUserRsvps(rsvped);
        }
      } catch (err) {
        console.error("Dashboard events fetch error:", err);
      } finally {
        setLoadingEvents(false);
      }
    });
    return unsubscribe;
  }, [router]);

  const handleRsvp = async (eventId: string) => {
    if (!user) return;
    setRsvping(eventId);
    const ref = doc(db, "rsvps", eventId, "attendees", user.uid);
    const isRsvped = userRsvps.has(eventId);
    try {
      if (isRsvped) {
        setUserRsvps((prev) => { const next = new Set(prev); next.delete(eventId); return next; });
        setRsvpCounts((prev) => ({ ...prev, [eventId]: Math.max(0, (prev[eventId] ?? 1) - 1) }));
        await deleteDoc(ref);
      } else {
        setUserRsvps((prev) => new Set(prev).add(eventId));
        setRsvpCounts((prev) => ({ ...prev, [eventId]: (prev[eventId] ?? 0) + 1 }));
        await setDoc(ref, {
          displayName: user.displayName ?? "",
          email: user.email ?? "",
          rsvpedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("RSVP error:", err);
      // Revert optimistic update on failure
      const attendeesSnap = await getDocs(collection(db, "rsvps", eventId, "attendees"));
      setRsvpCounts((prev) => ({ ...prev, [eventId]: attendeesSnap.size }));
      const reverted = new Set(userRsvps);
      if (attendeesSnap.docs.some((d) => d.id === user.uid)) reverted.add(eventId);
      else reverted.delete(eventId);
      setUserRsvps(reverted);
    } finally {
      setRsvping(null);
    }
  };

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
        <div className="absolute top-0 -left-24 w-80 h-80 bg-[#d97757]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#6a9bcc]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {isProfileIncomplete(profile) && (
            <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-[#d97757]/10 border border-[#d97757]/20 rounded-xl">
              <AlertCircle size={15} className="text-[#d97757] shrink-0" />
              <p className="text-sm text-[#d97757]">
                Your profile is incomplete.{" "}
                <Link href="/settings" className="underline font-medium hover:text-white transition-colors">
                  Finish setting it up
                </Link>{" "}
                to get personalized event reminders.
              </p>
            </div>
          )}

          <h1 className="heading text-3xl sm:text-4xl font-bold text-white leading-tight mb-3">
            Good {getHourGreeting()},{" "}
            <span className="text-[#d97757]">{firstName}</span>
          </h1>

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
                  className="group bg-white rounded-2xl border border-[#e8e6dc] p-6 hover:border-[#d97757]/30 hover:shadow-md transition-all duration-200 flex flex-col gap-4"
                >
                  <div className={`w-10 h-10 ${action.accentBg} rounded-xl flex items-center justify-center shrink-0`}>
                    <Icon size={18} className={action.accentColor} />
                  </div>
                  <div className="flex-1">
                    <h3 className="heading text-sm font-semibold text-[#141413] group-hover:text-[#d97757] mb-1 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-xs text-[#b0aea5] leading-relaxed">{action.description}</p>
                  </div>
                  <ArrowRight size={14} className="text-[#d97757] opacity-0 group-hover:opacity-100 transition-opacity self-end" />
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
                <Link href="/events" className="text-xs text-[#d97757] hover:underline flex items-center gap-1">
                  View all <ExternalLink size={11} />
                </Link>
              </div>

              <div className="bg-white rounded-2xl border border-[#e8e6dc] overflow-hidden divide-y divide-[#e8e6dc]">
                {loadingEvents ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={18} className="animate-spin text-[#b0aea5]" />
                  </div>
                ) : events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-8 min-h-[160px]">
                    <div className="w-10 h-10 bg-[#e8e6dc] rounded-xl flex items-center justify-center mb-3">
                      <Calendar size={18} className="text-[#b0aea5]" />
                    </div>
                    <p className="text-sm font-medium text-[#141413] mb-1">No upcoming events</p>
                    <p className="text-xs text-[#b0aea5]">Check back soon — we&apos;re planning something great.</p>
                  </div>
                ) : (
                  events.map((event) => (
                    <DashboardEventRow
                      key={event.id}
                      event={event}
                      rsvpCount={rsvpCounts[event.id] ?? 0}
                      isRsvped={userRsvps.has(event.id)}
                      isProcessing={rsvping === event.id}
                      onRsvp={handleRsvp}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Right: Tailored Resources */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-[#b0aea5] uppercase tracking-wider">
                  {profile.techLevel ? "Resources for You" : "Getting Started"}
                </p>
                <Link href="/resources" className="text-xs text-[#d97757] hover:underline flex items-center gap-1">
                  All resources <ExternalLink size={11} />
                </Link>
              </div>

              <div className="bg-white rounded-2xl border border-[#e8e6dc] divide-y divide-[#e8e6dc]">
                {resources.map((resource, idx) => (
                  <Link
                    key={idx}
                    href={resource.href}
                    className="group flex items-center justify-between px-6 py-4 hover:bg-[#faf9f5] transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#d97757] shrink-0" />
                      <span className="text-sm text-[#141413] group-hover:text-[#d97757] transition-colors">
                        {resource.title}
                      </span>
                    </div>
                    <ArrowRight size={14} className="text-[#b0aea5] group-hover:text-[#d97757] transition-colors shrink-0" />
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
                  <Link href="/settings" className="text-[#d97757] hover:underline">update</Link>
                </p>
              )}
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
