"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, getDocs, setDoc, deleteDoc, collection, query, where, getCountFromServer, limit } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  Calendar,
  BookOpen,
  GitFork,
  ArrowRight,
  AlertCircle,
  ExternalLink,
  Clock,
  MapPin,
  Users,
  Loader2,
  CheckCircle,
  XCircle,
  Play,
  FileText,
  PlusCircle,
  Star,
  TrendingUp,
  Sparkle,
  MessageCircle,
} from "lucide-react";
import type { MemberProfile, Resource, Project } from "@/lib/types";
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

function formatMemberSince(createdAt?: string): string {
  if (!createdAt) return "";
  return new Date(createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ─── Data ─────────────────────────────────────────────────────────────────────

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
    icon: GitFork,
    title: "Projects",
    description: "Explore real student AI projects from our GitHub showcase.",
    href: "/projects",
    accentColor: "text-[#788c5d]",
    accentBg: "bg-[#788c5d]/10",
  },
  {
    icon: MessageCircle,
    title: "Visit GroupMe",
    description: "Join the community chat for announcements and discussions.",
    href: "https://groupme.com/join_group/108706896/m6t7b7Vs",
    accentColor: "text-[#d97757]",
    accentBg: "bg-[#d97757]/10",
  },
] as const;

const RESOURCE_TYPE_CONFIG = {
  drive: { label: "Drive", Icon: FileText,     color: "text-[#6a9bcc]", bg: "bg-[#6a9bcc]/10" },
  video: { label: "Video", Icon: Play,         color: "text-[#d97757]", bg: "bg-[#d97757]/10" },
  link:  { label: "Link",  Icon: ExternalLink, color: "text-[#788c5d]", bg: "bg-[#788c5d]/10" },
} as const;

const PROJECT_STATUS_CONFIG = {
  pending: {
    label: "Under Review",
    Icon: Clock,
    textColor: "text-amber-600",
    bg: "bg-amber-50",
    borderColor: "border-l-amber-400",
  },
  approved: {
    label: "Published",
    Icon: CheckCircle,
    textColor: "text-[#788c5d]",
    bg: "bg-[#788c5d]/5",
    borderColor: "border-l-[#788c5d]",
  },
  changes_requested: {
    label: "Changes Needed",
    Icon: AlertCircle,
    textColor: "text-[#d97757]",
    bg: "bg-[#d97757]/5",
    borderColor: "border-l-[#d97757]",
  },
  rejected: {
    label: "Not Accepted",
    Icon: XCircle,
    textColor: "text-red-500",
    bg: "bg-red-50",
    borderColor: "border-l-red-400",
  },
} as const;

const LANG_COLORS: Record<string, string> = {
  Python: "#3572A5",
  JavaScript: "#f1e05a",
  TypeScript: "#2b7489",
  Java: "#b07219",
  "Jupyter Notebook": "#DA5B0B",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Go: "#00ADD8",
  Rust: "#dea584",
  Ruby: "#701516",
};

const LEVEL_STYLES: Record<string, string> = {
  beginner: "bg-[#788c5d]/10 text-[#788c5d]",
  intermediate: "bg-[#6a9bcc]/10 text-[#6a9bcc]",
  advanced: "bg-[#d97757]/10 text-[#d97757]",
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const CLAUDE_PRO_URL = "https://www.jotform.com/253555944387168";

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

// ─── My Project Row ────────────────────────────────────────────────────────────

function MyProjectRow({ project }: { project: Project }) {
  const cfg = PROJECT_STATUS_CONFIG[project.status];
  const StatusIcon = cfg.Icon;
  return (
    <div className={`border-l-2 ${cfg.borderColor} px-5 py-4 hover:bg-[#faf9f5] transition-colors flex items-start gap-4`}>
      <div className="flex-1 min-w-0">
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${cfg.textColor} ${cfg.bg} px-1.5 py-0.5 rounded mb-1.5`}>
          <StatusIcon size={10} />
          {cfg.label}
        </span>
        <p className="text-sm font-semibold text-[#141413] truncate">{project.title}</p>
        <div className="flex gap-1 mt-1 flex-wrap">
          {project.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-[#e8e6dc] text-[#6b6963] rounded">
              {tag}
            </span>
          ))}
        </div>
        {project.adminNote && (project.status === "changes_requested" || project.status === "rejected") && (
          <p className="text-xs text-[#b0aea5] italic mt-2 line-clamp-2">&ldquo;{project.adminNote}&rdquo;</p>
        )}
      </div>
      {project.status === "approved" && (
        <Link
          href={`/projects/${project.id}`}
          className="shrink-0 self-center text-[#d97757] hover:text-[#c86843] transition-colors"
        >
          <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}

// ─── Countdown Widget ─────────────────────────────────────────────────────────

interface CountdownWidgetProps {
  events: CalendarEvent[];
  userRsvps: Set<string>;
  loadingEvents: boolean;
}

function CountdownWidget({ events, userRsvps, loadingEvents }: CountdownWidgetProps) {
  const nextRsvpedEvent = events.find((e) => userRsvps.has(e.id));
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!nextRsvpedEvent) return;
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, [nextRsvpedEvent]);

  if (loadingEvents) {
    return (
      <div className="bg-white rounded-2xl border border-[#e8e6dc] p-5 flex items-center justify-center min-h-[140px]">
        <Loader2 size={18} className="animate-spin text-[#b0aea5]" />
      </div>
    );
  }

  if (!nextRsvpedEvent) {
    return (
      <div className="bg-white rounded-2xl border border-[#e8e6dc] p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#d97757]/10 rounded-lg flex items-center justify-center shrink-0">
            <Calendar size={14} className="text-[#d97757]" />
          </div>
          <p className="text-xs font-semibold text-[#b0aea5] uppercase tracking-wider">Next Event</p>
        </div>
        <p className="text-sm text-[#141413] leading-relaxed flex-1">
          You haven&apos;t RSVP&apos;d to any upcoming events yet.
        </p>
        <Link href="/events" className="text-xs font-medium text-[#d97757] hover:underline flex items-center gap-1 mt-auto">
          Browse events <ArrowRight size={11} />
        </Link>
      </div>
    );
  }

  const eventStart = new Date(nextRsvpedEvent.start);
  const diffMs = eventStart.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  const isHappeningNow = diffMs > -(3 * 60 * 60 * 1000) && diffMs < 0;
  const isSoon = diffDays === 0 && diffHrs < 3;

  const countdownLabel = isHappeningNow
    ? "Happening now!"
    : diffDays > 0
      ? `in ${diffDays}d ${diffHrs}h`
      : diffHrs > 0
        ? `in ${diffHrs}h ${diffMins}m`
        : `in ${diffMins}m`;

  const badge = formatDateBadge(nextRsvpedEvent.start);
  const isUrgent = isSoon || isHappeningNow;

  return (
    <div className={`bg-white rounded-2xl border p-5 flex flex-col gap-3 transition-colors ${isUrgent ? "border-[#d97757]/40" : "border-[#e8e6dc]"}`}>
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isUrgent ? "bg-[#d97757]/20" : "bg-[#d97757]/10"}`}>
          <Calendar size={14} className="text-[#d97757]" />
        </div>
        <p className="text-xs font-semibold text-[#b0aea5] uppercase tracking-wider">You&apos;re Going</p>
      </div>

      <div className="flex items-start gap-3">
        <div className="shrink-0 flex flex-col items-center bg-[#d97757]/10 border border-[#d97757]/20 rounded-xl px-2 py-1.5 min-w-[40px] text-center">
          <span className="text-[8px] font-bold text-[#d97757] tracking-widest leading-none">{badge.month}</span>
          <span className="text-[15px] font-bold text-[#d97757] leading-tight">{badge.day}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#141413] truncate">{nextRsvpedEvent.title}</p>
          <p className={`text-xs font-semibold mt-0.5 ${isHappeningNow ? "text-[#788c5d]" : isSoon ? "text-[#d97757]" : "text-[#b0aea5]"}`}>
            {countdownLabel}
          </p>
        </div>
      </div>

      <Link href="/events" className="text-xs text-[#b0aea5] hover:text-[#d97757] transition-colors flex items-center gap-1 mt-auto">
        View all events <ArrowRight size={11} />
      </Link>
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

  const [resources, setResources] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);

  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [loadingMyProjects, setLoadingMyProjects] = useState(true);

  const [pulseStats, setPulseStats] = useState<{ totalMembers: number; approvedProjects: number; eventsThisSemester: number } | null>(null);
  const [loadingPulse, setLoadingPulse] = useState(true);

  const [spotlightProject, setSpotlightProject] = useState<Project | null>(null);
  const [loadingSpotlight, setLoadingSpotlight] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/auth"); return; }
      setUser(u);

      const snap = await getDoc(doc(db, "members", u.uid));
      if (!snap.exists()) { router.push("/settings"); return; }
      const profileData = snap.data() as MemberProfile;
      setProfile(profileData);
      setLoading(false);

      // Fetch all data in parallel
      try {
        const [eventsRes, resourcesSnap, myProjectsSnap, membersCountSnap, approvedCountSnap, spotlightSnap] = await Promise.all([
          fetch("/api/events"),
          getDocs(query(collection(db, "resources"), where("published", "==", true))),
          getDocs(query(collection(db, "projects"), where("ownerId", "==", u.uid))),
          getCountFromServer(collection(db, "members")).catch(() => null),
          getCountFromServer(query(collection(db, "projects"), where("status", "==", "approved"))).catch(() => null),
          getDocs(query(collection(db, "projects"), where("status", "==", "approved"), where("featured", "==", true), limit(1))),
        ]);

        // Process events
        const eventData = await eventsRes.json();
        const allEvents: CalendarEvent[] = eventData.events ?? [];
        const eventList: CalendarEvent[] = allEvents.slice(0, 3);
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

        // Process resources — filter by tech level
        const allResources = resourcesSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Resource))
          .sort((a, b) => a.order - b.order);

        const techLevel = profileData.techLevel;
        const tailored = allResources
          .filter((r) => !techLevel || r.techLevels.includes(techLevel as never))
          .slice(0, 3);
        setResources(tailored);

        // Process user's project submissions
        const projectsList = myProjectsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Project))
          .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        setMyProjects(projectsList);

        // Community Pulse — semester start = Jan 1 (Spring), Jun 1 (Summer), Sep 1 (Fall)
        const now = new Date();
        const m = now.getMonth();
        const semesterStart = new Date(now.getFullYear(), m < 5 ? 0 : m < 8 ? 5 : 8, 1);
        const eventsThisSemester = allEvents.filter((e) => new Date(e.start) >= semesterStart).length;
        setPulseStats({
          totalMembers: membersCountSnap?.data().count ?? 0,
          approvedProjects: approvedCountSnap?.data().count ?? 0,
          eventsThisSemester,
        });

        // Spotlight project — featured first, fallback to top-starred approved
        if (!spotlightSnap.empty) {
          setSpotlightProject({ id: spotlightSnap.docs[0].id, ...spotlightSnap.docs[0].data() } as Project);
        } else if (approvedCountSnap && approvedCountSnap.data().count > 0) {
          // Fetch all approved and sort client-side to avoid composite index requirement
          const allApprovedSnap = await getDocs(query(collection(db, "projects"), where("status", "==", "approved")));
          const topStarred = allApprovedSnap.docs
            .map((d) => ({ id: d.id, ...d.data() } as Project))
            .sort((a, b) => (b.githubMeta?.stars ?? 0) - (a.githubMeta?.stars ?? 0))[0] ?? null;
          setSpotlightProject(topStarred);
        }

      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoadingEvents(false);
        setLoadingResources(false);
        setLoadingMyProjects(false);
        setLoadingPulse(false);
        setLoadingSpotlight(false);
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

  const memberSince = formatMemberSince(profile.createdAt);
  const displayedProjects = myProjects.slice(0, 3);

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

          <div className="flex flex-wrap items-center gap-2">
            {profile.major && profile.year && (
              <div className="inline-flex items-center px-3 py-1.5 bg-white/[0.07] border border-white/[0.12] rounded-full">
                <span className="text-xs text-[#b0aea5] font-medium">
                  {profile.major} · {profile.year}
                </span>
              </div>
            )}
            {memberSince && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.07] border border-white/[0.12] rounded-full">
                <Calendar size={11} className="text-[#b0aea5]" />
                <span className="text-xs text-[#b0aea5] font-medium">Member since {memberSince}</span>
              </div>
            )}
            {!loadingMyProjects && myProjects.length > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.07] border border-white/[0.12] rounded-full">
                <GitFork size={11} className="text-[#b0aea5]" />
                <span className="text-xs text-[#b0aea5] font-medium">
                  {myProjects.length} project{myProjects.length !== 1 ? "s" : ""} submitted
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Section B: Quick actions ── */}
            {/* ── Widget 3 + 4: Claude Pro CTA + Event Countdown ── */}
      <section className="bg-[#faf9f5] py-8 pb-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Widget 3: Claim Claude Pro */}
            <div className="relative bg-[#141413] rounded-2xl overflow-hidden p-5 flex flex-col gap-4">
              {/* Ambient glow */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#d97757]/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#6a9bcc]/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#d97757] bg-[#d97757]/15 border border-[#d97757]/20 px-2 py-1 rounded-full uppercase tracking-wider">
                  <Sparkle size={9} />
                  Member Benefit
                </span>
              </div>

              <div className="relative z-10 flex-1">
                <h3 className="heading text-lg font-bold text-white leading-tight mb-1.5">
                  Get Claude Pro — Free
                </h3>
                <p className="text-sm text-[#b0aea5] leading-relaxed">
                  Claim your free Claude Pro subscription as a verified club member.
                </p>
              </div>

              <a
                href={CLAUDE_PRO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="relative z-10 flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#d97757] hover:bg-[#c86843] text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Claim Now <ArrowRight size={14} />
              </a>
            </div>

            {/* Widget 4: Event Countdown */}
            <CountdownWidget events={events} userRsvps={userRsvps} loadingEvents={loadingEvents} />

          </div>
        </div>
      </section>

      <section className="bg-[#faf9f5] pb-8">
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
      <section className="pb-8">
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

              <div className="bg-white rounded-2xl border border-[#e8e6dc] overflow-hidden divide-y divide-[#e8e6dc]">
                {loadingResources ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={18} className="animate-spin text-[#b0aea5]" />
                  </div>
                ) : resources.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-8 min-h-[160px]">
                    <div className="w-10 h-10 bg-[#e8e6dc] rounded-xl flex items-center justify-center mb-3">
                      <BookOpen size={18} className="text-[#b0aea5]" />
                    </div>
                    <p className="text-sm font-medium text-[#141413] mb-1">No resources available</p>
                    <p className="text-xs text-[#b0aea5]">Browse all resources to find guides and materials.</p>
                  </div>
                ) : (
                  resources.map((resource) => {
                    const typeCfg = RESOURCE_TYPE_CONFIG[resource.type];
                    const TypeIcon = typeCfg.Icon;
                    return (
                      <a
                        key={resource.id}
                        href={resource.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block px-5 py-4 hover:bg-[#faf9f5] transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 shrink-0 w-6 h-6 ${typeCfg.bg} rounded-md flex items-center justify-center`}>
                            <TypeIcon size={12} className={typeCfg.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#141413] group-hover:text-[#d97757] transition-colors truncate">
                              {resource.title}
                            </p>
                            {resource.description && (
                              <p className="text-xs text-[#b0aea5] line-clamp-1 mt-0.5">{resource.description}</p>
                            )}
                          </div>
                          <ArrowRight size={13} className="text-[#b0aea5] group-hover:text-[#d97757] transition-colors shrink-0 mt-0.5" />
                        </div>
                      </a>
                    );
                  })
                )}
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

      {/* ── Section D: My Project Submissions ── */}
      <section className="pb-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-[#b0aea5] uppercase tracking-wider">
              My Project Submissions
            </p>
            <div className="flex items-center gap-3">
              {myProjects.length > 3 && (
                <Link href="/projects" className="text-xs text-[#d97757] hover:underline flex items-center gap-1">
                  View all {myProjects.length} <ExternalLink size={11} />
                </Link>
              )}
              <Link
                href="/projects"
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-[#141413] text-white rounded-lg hover:bg-[#2a2926] transition-colors"
              >
                <PlusCircle size={12} />
                Submit Project
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e6dc] overflow-hidden divide-y divide-[#e8e6dc]">
            {loadingMyProjects ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={18} className="animate-spin text-[#b0aea5]" />
              </div>
            ) : displayedProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-10">
                <div className="w-12 h-12 bg-[#e8e6dc] rounded-2xl flex items-center justify-center mb-4">
                  <GitFork size={20} className="text-[#b0aea5]" />
                </div>
                <p className="text-sm font-semibold text-[#141413] mb-1">No projects yet</p>
                <p className="text-xs text-[#b0aea5] max-w-xs mb-4">
                  Built something with Claude? Submit your GitHub repo to the club showcase.
                </p>
                <Link
                  href="/projects"
                  className="text-xs font-medium text-[#d97757] hover:underline flex items-center gap-1"
                >
                  Go to Projects <ArrowRight size={11} />
                </Link>
              </div>
            ) : (
              displayedProjects.map((project) => (
                <MyProjectRow key={project.id} project={project} />
              ))
            )}
          </div>
        </div>
      </section>

            {/* ── Widget 2: Community Spotlight ── */}
      {(loadingSpotlight || spotlightProject) && (
        <section className="pb-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-[#b0aea5] uppercase tracking-wider">Community Spotlight</p>
              <Link href="/projects" className="text-xs text-[#d97757] hover:underline flex items-center gap-1">
                All projects <ExternalLink size={11} />
              </Link>
            </div>

            {loadingSpotlight ? (
              <div className="bg-white rounded-2xl border border-[#e8e6dc] p-6 h-28 flex items-center justify-center">
                <Loader2 size={18} className="animate-spin text-[#b0aea5]" />
              </div>
            ) : spotlightProject ? (
              <Link
                href={`/projects/${spotlightProject.id}`}
                className="group block bg-white rounded-2xl border border-[#e8e6dc] p-5 hover:border-[#d97757]/30 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-5">
                  <div className="w-1 self-stretch bg-[#d97757] rounded-full shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {spotlightProject.featured && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#d97757]/10 text-[#d97757] uppercase tracking-wider">
                          Featured
                        </span>
                      )}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${LEVEL_STYLES[spotlightProject.techLevel]}`}>
                        {LEVEL_LABELS[spotlightProject.techLevel]}
                      </span>
                      {spotlightProject.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-[#e8e6dc] text-[#6b6963] rounded">{tag}</span>
                      ))}
                    </div>
                    <h3 className="heading font-semibold text-[#141413] group-hover:text-[#d97757] transition-colors text-sm leading-snug mb-1">
                      {spotlightProject.title}
                    </h3>
                    <p className="text-xs text-[#b0aea5] line-clamp-2 leading-relaxed">{spotlightProject.description}</p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-2 pl-2">
                    {spotlightProject.githubMeta?.language && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-[#555555]">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: LANG_COLORS[spotlightProject.githubMeta.language] ?? "#b0aea5" }} />
                        {spotlightProject.githubMeta.language}
                      </span>
                    )}
                    {(spotlightProject.githubMeta?.stars ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-[#b0aea5]">
                        <Star size={11} />
                        {spotlightProject.githubMeta.stars}
                      </span>
                    )}
                    <ArrowRight size={14} className="text-[#b0aea5] group-hover:text-[#d97757] transition-colors mt-1" />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-[#e8e6dc] flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#d97757]/20 flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-[#d97757]">{spotlightProject.ownerName.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="text-xs text-[#b0aea5]">
                    by <span className="text-[#555555] font-medium">{spotlightProject.ownerName}</span>
                  </span>
                </div>
              </Link>
            ) : null}
          </div>
        </section>
      )}

    </div>
  );
}
