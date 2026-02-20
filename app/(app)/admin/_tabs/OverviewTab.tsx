"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MemberProfile, Resource, CaseStudy, StoredEvent } from "@/lib/types";
import {
  Loader2,
  Users,
  TrendingUp,
  CheckCircle,
  Mail,
  Zap,
  BookOpen,
  Calendar,
  Shield,
  Activity,
  UserX,
  Clock,
  Megaphone,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventRsvpSummary {
  title: string;
  start: string;
  count: number;
  eventId: string;
}

interface TopMember {
  displayName: string;
  email: string;
  rsvpCount: number;
}

interface RetentionRow {
  fromSemester: string;
  toSemester: string;
  cohortSize: number;
  retained: number;
  rate: number;
}

interface AdminStats {
  // Membership
  totalMembers: number;
  newThisSemester: number;
  profileCompletionRate: number;
  adminCount: number;

  // Engagement
  engagementRate: number;
  avgRsvpsPerEvent: number;
  totalRsvps: number;
  membersWithNoRsvps: number;
  emailRemindersOptIn: number;
  newsletterOptIn: number;

  // Events
  eventsHosted: number;
  eventsSynced: boolean;
  eventRsvpBreakdown: EventRsvpSummary[];
  topActiveMembers: TopMember[];

  // Retention
  retentionRows: RetentionRow[];

  // Content
  resourcesPublished: number;
  resourcesDraft: number;
  caseStudiesPublished: number;
  caseStudiesDraft: number;

  // Demographics
  yearBreakdown: Record<string, number>;
  collegeBreakdown: Record<string, number>;
  techLevelBreakdown: Record<string, number>;
  majorBreakdown: Record<string, number>;
  interestsBreakdown: Record<string, number>;
  referralSourceBreakdown: Record<string, number>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isProfileComplete(p: MemberProfile): boolean {
  return !!(p.displayName && p.major && p.year && p.college && p.techLevel);
}

function getSemesterWindow(): { start: Date; end: Date } {
  const now = new Date();
  const month = now.getMonth();
  let start: Date, end: Date;
  if (month <= 4) {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 4, 31);
  } else if (month <= 7) {
    start = new Date(now.getFullYear(), 5, 1);
    end = new Date(now.getFullYear(), 7, 31);
  } else {
    start = new Date(now.getFullYear(), 8, 1);
    end = new Date(now.getFullYear(), 11, 31);
  }
  return { start, end };
}

function getSemesterLabel(date: Date): string {
  const month = date.getMonth();
  const year = date.getFullYear();
  if (month <= 4) return `Spring ${year}`;
  if (month <= 7) return `Summer ${year}`;
  return `Fall ${year}`;
}

function getSemesterRange(label: string): { start: Date; end: Date } {
  const parts = label.split(" ");
  const season = parts[0];
  const year = parseInt(parts[1]);
  if (season === "Spring") return { start: new Date(year, 0, 1), end: new Date(year, 4, 31, 23, 59, 59) };
  if (season === "Summer") return { start: new Date(year, 5, 1), end: new Date(year, 7, 31, 23, 59, 59) };
  return { start: new Date(year, 8, 1), end: new Date(year, 11, 31, 23, 59, 59) };
}

function nextSemester(label: string): string {
  const parts = label.split(" ");
  const season = parts[0];
  const year = parseInt(parts[1]);
  if (season === "Spring") return `Summer ${year}`;
  if (season === "Summer") return `Fall ${year}`;
  return `Spring ${year + 1}`;
}

function sortSemesters(a: string, b: string): number {
  const order = ["Spring", "Summer", "Fall"];
  const [aSeason, aYear] = a.split(" ");
  const [bSeason, bYear] = b.split(" ");
  if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear);
  return order.indexOf(aSeason) - order.indexOf(bSeason);
}

function pct(num: number, denom: number): string {
  if (denom === 0) return "0%";
  return `${Math.round((num / denom) * 100)}%`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── UI Components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1 h-5 bg-[#d97757] rounded-full" />
      <h2 className="text-sm font-semibold text-[#141413] uppercase tracking-wider">{children}</h2>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
  icon,
  accent = "#d97757",
  faded = false,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  accent?: string;
  faded?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-[#e8e6dc] p-5 flex flex-col gap-3 ${
        faded ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#b0aea5] font-medium uppercase tracking-wider">{label}</p>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${accent}18`, color: accent }}
        >
          {icon}
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold" style={{ color: faded ? "#b0aea5" : accent }}>
          {value}
        </p>
        {subtext && <p className="text-xs text-[#b0aea5] mt-1.5 leading-relaxed">{subtext}</p>}
      </div>
    </div>
  );
}

function FutureStatCard({ label, description }: { label: string; description: string }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-[#e8e6dc] p-5 flex flex-col gap-3 opacity-50">
      <p className="text-xs text-[#b0aea5] font-medium uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-[#e8e6dc]">—</p>
      <p className="text-xs text-[#b0aea5] leading-relaxed">{description}</p>
    </div>
  );
}

function BarChart({
  label,
  data,
  accent = "#d97757",
}: {
  label: string;
  data: Record<string, number>;
  accent?: string;
}) {
  const entries = Object.entries(data).sort(([, a], [, b]) => b - a);
  const maxValue = Math.max(...entries.map(([, v]) => v), 1);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#e8e6dc] p-6">
        <h3 className="text-sm font-semibold text-[#141413] mb-4">{label}</h3>
        <p className="text-xs text-[#b0aea5]">No data yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e8e6dc] p-6">
      <h3 className="text-sm font-semibold text-[#141413] mb-4">{label}</h3>
      <div className="space-y-3">
        {entries.map(([key, value]) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-[#555555] font-medium truncate max-w-[60%]">{key}</span>
              <span className="text-xs text-[#b0aea5] ml-2 shrink-0">
                {value} · {((value / total) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#e8e6dc] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(value / maxValue) * 100}%`, background: accent }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OverviewTab() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // ── Parallel: members + events + resources + case-studies ──────────
        const [membersSnap, eventsSnap, resourcesSnap, caseStudiesSnap] = await Promise.all([
          getDocs(collection(db, "members")),
          getDocs(query(collection(db, "events"), orderBy("start", "asc"))),
          getDocs(collection(db, "resources")),
          getDocs(collection(db, "case-studies")),
        ]);

        // ── Members ────────────────────────────────────────────────────────
        const members = membersSnap.docs.map((d) => {
          const data = d.data() as MemberProfile;
          return { ...data, uid: d.id };
        });

        const totalMembers = members.length;
        const { start: semStart, end: semEnd } = getSemesterWindow();

        const adminCount = members.filter((m) => m.isAdmin).length;
        const newThisSemester = members.filter((m) => {
          const c = m.createdAt ? new Date(m.createdAt) : null;
          return c && c >= semStart && c <= semEnd;
        }).length;
        const profileCompletionRate =
          totalMembers > 0
            ? (members.filter(isProfileComplete).length / totalMembers) * 100
            : 0;
        const emailRemindersOptIn = members.filter((m) => m.emailReminders).length;
        const newsletterOptIn = members.filter((m) => m.newsletter).length;

        // ── Demographics ──────────────────────────────────────────────────
        const yearBreakdown: Record<string, number> = {};
        const collegeBreakdown: Record<string, number> = {};
        const techLevelBreakdown: Record<string, number> = {};
        const majorBreakdown: Record<string, number> = {};
        const interestsBreakdown: Record<string, number> = {};
        const referralSourceBreakdown: Record<string, number> = {};

        members.forEach((m) => {
          if (m.year) yearBreakdown[m.year] = (yearBreakdown[m.year] ?? 0) + 1;
          if (m.college) collegeBreakdown[m.college] = (collegeBreakdown[m.college] ?? 0) + 1;
          if (m.techLevel) techLevelBreakdown[m.techLevel] = (techLevelBreakdown[m.techLevel] ?? 0) + 1;
          if (m.major) majorBreakdown[m.major] = (majorBreakdown[m.major] ?? 0) + 1;
          if (m.referralSource) referralSourceBreakdown[m.referralSource] = (referralSourceBreakdown[m.referralSource] ?? 0) + 1;
          (m.interests ?? []).forEach((interest) => {
            interestsBreakdown[interest] = (interestsBreakdown[interest] ?? 0) + 1;
          });
        });

        // ── Events ────────────────────────────────────────────────────────
        const events = eventsSnap.docs.map((d) => d.data() as StoredEvent);
        const eventsSynced = events.length > 0;

        // Build member UID → displayName + email map
        const memberMap: Record<string, { displayName: string; email: string }> = {};
        members.forEach((m) => {
          memberMap[m.uid] = { displayName: m.displayName, email: m.email };
        });

        // Per-member RSVP counts, per-event summaries, and per-semester RSVP sets
        const memberRsvpCounts: Record<string, number> = {};
        const eventRsvpBreakdown: EventRsvpSummary[] = [];
        // semesterRsvpSets[semLabel] = Set of member UIDs who RSVPd ≥1 event in that semester
        const semesterRsvpSets: Record<string, Set<string>> = {};

        await Promise.all(
          events.map(async (event) => {
            const snap = await getDocs(collection(db, "rsvps", event.id, "attendees"));
            const semLabel = event.start ? getSemesterLabel(new Date(event.start)) : null;

            snap.docs.forEach((d) => {
              memberRsvpCounts[d.id] = (memberRsvpCounts[d.id] ?? 0) + 1;
              if (semLabel) {
                if (!semesterRsvpSets[semLabel]) semesterRsvpSets[semLabel] = new Set();
                semesterRsvpSets[semLabel].add(d.id);
              }
            });

            eventRsvpBreakdown.push({
              eventId: event.id,
              title: event.title,
              start: event.start,
              count: snap.size,
            });
          })
        );

        // Sort events by RSVP count descending
        eventRsvpBreakdown.sort((a, b) => b.count - a.count);

        const totalRsvps = eventRsvpBreakdown.reduce((sum, e) => sum + e.count, 0);
        const avgRsvpsPerEvent = events.length > 0 ? totalRsvps / events.length : 0;

        // Members with at least 1 RSVP
        const engagedMemberUids = new Set(Object.keys(memberRsvpCounts));
        const engagementRate = totalMembers > 0 ? (engagedMemberUids.size / totalMembers) * 100 : 0;
        const membersWithNoRsvps = totalMembers - engagedMemberUids.size;

        // Top 5 most active members
        const topActiveMembers: TopMember[] = Object.entries(memberRsvpCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([uid, count]) => ({
            displayName: memberMap[uid]?.displayName || "Unknown",
            email: memberMap[uid]?.email || uid,
            rsvpCount: count,
          }));

        // ── Retention Rate ────────────────────────────────────────────────
        // Group members by join semester
        const membersBySemester: Record<string, (typeof members[number])[]> = {};
        members.forEach((m) => {
          if (!m.createdAt) return;
          const label = getSemesterLabel(new Date(m.createdAt));
          if (!membersBySemester[label]) membersBySemester[label] = [];
          membersBySemester[label].push(m);
        });

        const allSemesters = Object.keys(membersBySemester).sort(sortSemesters);
        const currentSemLabel = getSemesterLabel(new Date());
        const retentionRows: RetentionRow[] = [];

        for (const fromSem of allSemesters) {
          const toSem = nextSemester(fromSem);
          // Only compute if the "to" semester has passed or is current and we have RSVP data
          const toRange = getSemesterRange(toSem);
          const toHasPassed = toRange.start <= new Date();
          if (!toHasPassed && toSem !== currentSemLabel) continue;
          if (!membersBySemester[fromSem] || membersBySemester[fromSem].length === 0) continue;

          const cohort = membersBySemester[fromSem];
          const rsvpSet = semesterRsvpSets[toSem] ?? new Set<string>();
          const retained = cohort.filter((m) => rsvpSet.has(m.uid)).length;

          retentionRows.push({
            fromSemester: fromSem,
            toSemester: toSem,
            cohortSize: cohort.length,
            retained,
            rate: cohort.length > 0 ? (retained / cohort.length) * 100 : 0,
          });
        }

        // ── Content ────────────────────────────────────────────────────────
        const resources = resourcesSnap.docs.map((d) => d.data() as Resource);
        const caseStudies = caseStudiesSnap.docs.map((d) => d.data() as CaseStudy);

        setStats({
          totalMembers,
          newThisSemester,
          profileCompletionRate,
          adminCount,
          engagementRate,
          avgRsvpsPerEvent,
          totalRsvps,
          membersWithNoRsvps,
          emailRemindersOptIn,
          newsletterOptIn,
          eventsHosted: events.length,
          eventsSynced,
          eventRsvpBreakdown,
          topActiveMembers,
          retentionRows,
          resourcesPublished: resources.filter((r) => r.published).length,
          resourcesDraft: resources.filter((r) => !r.published).length,
          caseStudiesPublished: caseStudies.filter((c) => c.published).length,
          caseStudiesDraft: caseStudies.filter((c) => !c.published).length,
          yearBreakdown,
          collegeBreakdown,
          techLevelBreakdown,
          majorBreakdown,
          interestsBreakdown,
          referralSourceBreakdown,
        });
      } catch (err) {
        console.error("Error loading stats:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <Loader2 size={28} className="animate-spin text-[#d97757] mx-auto mb-3" />
          <p className="text-sm text-[#b0aea5]">Crunching numbers…</p>
        </div>
      </div>
    );
  }

  const t = stats.totalMembers;

  return (
    <div className="space-y-10">

      {/* ── A: Membership ── */}
      <section>
        <SectionLabel>Membership</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Members"
            value={t}
            subtext={`${stats.adminCount} admin${stats.adminCount !== 1 ? "s" : ""}`}
            icon={<Users size={16} />}
          />
          <StatCard
            label="New This Semester"
            value={stats.newThisSemester}
            subtext={`${pct(stats.newThisSemester, t)} of total membership`}
            icon={<TrendingUp size={16} />}
            accent="#788c5d"
          />
          <StatCard
            label="Profile Completion"
            value={`${Math.round(stats.profileCompletionRate)}%`}
            subtext={`${Math.floor((stats.profileCompletionRate / 100) * t)} of ${t} profiles complete`}
            icon={<CheckCircle size={16} />}
            accent="#6a9bcc"
          />
          <StatCard
            label="Admins"
            value={stats.adminCount}
            subtext="Accounts with admin access"
            icon={<Shield size={16} />}
            accent="#b0aea5"
          />
        </div>
      </section>

      {/* ── B: Engagement ── */}
      <section>
        <SectionLabel>Engagement</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Engagement Rate"
            value={`${Math.round(stats.engagementRate)}%`}
            subtext={`${stats.totalMembers - stats.membersWithNoRsvps} of ${t} members RSVP'd ≥1 event`}
            icon={<Activity size={16} />}
            accent="#d97757"
          />
          <StatCard
            label="Avg RSVPs / Event"
            value={stats.avgRsvpsPerEvent.toFixed(1)}
            subtext={`${stats.totalRsvps} total RSVPs across ${stats.eventsHosted} events`}
            icon={<Calendar size={16} />}
            accent="#6a9bcc"
          />
          <StatCard
            label="Non-Engaged Members"
            value={stats.membersWithNoRsvps}
            subtext={`${pct(stats.membersWithNoRsvps, t)} have not RSVP'd any event`}
            icon={<UserX size={16} />}
            accent="#b0aea5"
            faded={stats.membersWithNoRsvps === 0}
          />
          <StatCard
            label="Email Reminders"
            value={stats.emailRemindersOptIn}
            subtext={`${pct(stats.emailRemindersOptIn, t)} opted in · ${stats.newsletterOptIn} on newsletter`}
            icon={<Mail size={16} />}
            accent="#788c5d"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <FutureStatCard
            label="Attendance Rate"
            description="% of members attending weekly meetings. Requires in-person check-in or QR tracking."
          />
          <FutureStatCard
            label="Feedback Score"
            description="Avg post-event rating (1–5). Requires feedback form integration."
          />
        </div>
      </section>

      {/* ── C: Event Performance ── */}
      <section>
        <SectionLabel>Event Performance</SectionLabel>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <StatCard
            label="Events Hosted (All-Time)"
            value={stats.eventsHosted}
            subtext={stats.eventsSynced ? "Synced from Google Calendar" : "Sync events to see history"}
            icon={<Calendar size={16} />}
            accent="#d97757"
            faded={!stats.eventsSynced}
          />
          <FutureStatCard
            label="Speaker / Partner Diversity"
            description="Variety of guest speakers by role and industry. Requires speaker tagging per event."
          />
        </div>

        {!stats.eventsSynced ? (
          <div className="bg-white rounded-2xl border border-dashed border-[#e8e6dc] p-8 text-center text-[#b0aea5]">
            <p className="text-sm mb-1">No events synced yet.</p>
            <p className="text-xs">Go to the Events tab and click &quot;Sync from Google Calendar&quot; to enable event performance metrics.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* RSVP per event table */}
            <div className="bg-white rounded-2xl border border-[#e8e6dc] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#e8e6dc]">
                <h3 className="text-sm font-semibold text-[#141413]">RSVPs per Event</h3>
              </div>
              <div className="divide-y divide-[#e8e6dc] max-h-80 overflow-y-auto">
                {stats.eventRsvpBreakdown.map((event) => (
                  <div key={event.eventId} className="px-5 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#141413] font-medium truncate">{event.title}</p>
                      <p className="text-xs text-[#b0aea5] flex items-center gap-1">
                        <Clock size={10} />
                        {formatDate(event.start)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-semibold text-[#d97757]">{event.count}</span>
                      <span className="text-xs text-[#b0aea5] ml-1">
                        ({pct(event.count, t)})
                      </span>
                    </div>
                  </div>
                ))}
                {stats.eventRsvpBreakdown.length === 0 && (
                  <div className="px-5 py-8 text-center text-xs text-[#b0aea5]">No RSVPs recorded yet.</div>
                )}
              </div>
            </div>

            {/* Top active members */}
            <div className="bg-white rounded-2xl border border-[#e8e6dc] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#e8e6dc]">
                <h3 className="text-sm font-semibold text-[#141413]">Most Active Members</h3>
              </div>
              <div className="divide-y divide-[#e8e6dc]">
                {stats.topActiveMembers.map((member, i) => (
                  <div key={member.email} className="px-5 py-3 flex items-center gap-3">
                    <span className="text-xs font-bold text-[#b0aea5] w-4 shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#141413] font-medium truncate">{member.displayName}</p>
                      <p className="text-xs text-[#b0aea5] truncate">{member.email}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1 bg-[#d97757]/10 text-[#d97757] text-xs font-semibold px-2.5 py-1 rounded-full">
                      <Calendar size={11} />
                      {member.rsvpCount}
                    </div>
                  </div>
                ))}
                {stats.topActiveMembers.length === 0 && (
                  <div className="px-5 py-8 text-center text-xs text-[#b0aea5]">No RSVP data yet.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── D: Retention ── */}
      <section>
        <SectionLabel>Retention</SectionLabel>
        {!stats.eventsSynced ? (
          <div className="bg-white rounded-2xl border border-dashed border-[#e8e6dc] p-8 text-center text-[#b0aea5]">
            <p className="text-sm mb-1">Retention tracking requires synced event history.</p>
            <p className="text-xs">Sync events first, then return here to see semester-over-semester retention.</p>
          </div>
        ) : stats.retentionRows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#e8e6dc] p-8 text-center text-[#b0aea5]">
            <p className="text-sm">Not enough data yet to compute retention.</p>
            <p className="text-xs mt-1">Retention is computed once members have RSVPs spanning at least two consecutive semesters.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#e8e6dc] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#faf9f5] border-b border-[#e8e6dc]">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-[#555555] text-xs">From Semester</th>
                  <th className="px-5 py-3 text-left font-semibold text-[#555555] text-xs">To Semester</th>
                  <th className="px-5 py-3 text-right font-semibold text-[#555555] text-xs">Cohort</th>
                  <th className="px-5 py-3 text-right font-semibold text-[#555555] text-xs">Retained</th>
                  <th className="px-5 py-3 text-right font-semibold text-[#555555] text-xs">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e6dc]">
                {stats.retentionRows.map((row) => (
                  <tr key={`${row.fromSemester}-${row.toSemester}`} className="hover:bg-[#faf9f5]">
                    <td className="px-5 py-3 text-[#141413] text-sm">{row.fromSemester}</td>
                    <td className="px-5 py-3 text-[#555555] text-sm">{row.toSemester}</td>
                    <td className="px-5 py-3 text-right text-[#b0aea5] text-sm">{row.cohortSize}</td>
                    <td className="px-5 py-3 text-right text-[#141413] font-medium text-sm">{row.retained}</td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`text-sm font-semibold ${
                          row.rate >= 60
                            ? "text-[#788c5d]"
                            : row.rate >= 30
                            ? "text-[#d97757]"
                            : "text-red-500"
                        }`}
                      >
                        {Math.round(row.rate)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 bg-[#faf9f5] border-t border-[#e8e6dc]">
              <p className="text-xs text-[#b0aea5]">
                Retention = members who joined in semester N-1 and RSVPd ≥1 event in semester N.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── E: Recruitment ── */}
      <section>
        <SectionLabel>Recruitment</SectionLabel>
        {Object.keys(stats.referralSourceBreakdown).length > 0 ? (
          <BarChart label="How Members Heard About Us" data={stats.referralSourceBreakdown} accent="#d97757" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FutureStatCard
              label="Referral Sources"
              description="Members have not yet filled in how they heard about the club. Data appears once profiles are updated."
            />
            <FutureStatCard
              label="Outreach Conversion Rate"
              description="% of those reached who became members. Requires outreach source tagging on signup."
            />
          </div>
        )}
      </section>

      {/* ── F: Content ── */}
      <section>
        <SectionLabel>Content</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Resources Published"
            value={stats.resourcesPublished}
            subtext={`${stats.resourcesDraft} draft${stats.resourcesDraft !== 1 ? "s" : ""} not yet live`}
            icon={<Zap size={16} />}
            accent="#788c5d"
          />
          <StatCard
            label="Case Studies Published"
            value={stats.caseStudiesPublished}
            subtext={`${stats.caseStudiesDraft} draft${stats.caseStudiesDraft !== 1 ? "s" : ""} not yet live`}
            icon={<BookOpen size={16} />}
            accent="#6a9bcc"
          />
          <FutureStatCard
            label="Speaker / Partner Diversity"
            description="Variety of guest speakers by role and industry. Requires speaker tracking per event."
          />
          <StatCard
            label="Newsletter Opt-Ins"
            value={stats.newsletterOptIn}
            subtext={`${pct(stats.newsletterOptIn, t)} of members subscribed`}
            icon={<Megaphone size={16} />}
            accent="#b0aea5"
          />
        </div>
      </section>

      {/* ── G: Demographics ── */}
      <section>
        <SectionLabel>Demographics</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <BarChart label="By Year" data={stats.yearBreakdown} />
          <BarChart label="By College" data={stats.collegeBreakdown} />
          <BarChart label="By Tech Level" data={stats.techLevelBreakdown} accent="#6a9bcc" />
          <BarChart label="By Major" data={stats.majorBreakdown} accent="#788c5d" />
          <BarChart label="By Interest" data={stats.interestsBreakdown} accent="#b0aea5" />
          <BarChart label="How They Heard About Us" data={stats.referralSourceBreakdown} accent="#d97757" />
        </div>
      </section>

      {/* ── Footnote ── */}
      <div className="flex items-start gap-3 bg-[#faf9f5] rounded-2xl border border-[#e8e6dc] p-4 text-xs text-[#b0aea5]">
        <span className="shrink-0 mt-0.5">📊</span>
        <span>
          <strong className="text-[#555555]">Data as of {new Date().toLocaleDateString()}.</strong>{" "}
          All metrics are computed live from Firestore. Retention and event performance require events to be synced via the Events tab. Dashed cards indicate metrics that need additional infrastructure.
        </span>
      </div>

    </div>
  );
}
