"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import AuthCTA from "@/components/AuthCTA";
import { Calendar, MapPin, Clock, Loader2, Users, MessageCircle } from "lucide-react";
import PageHero from "@/components/PageHero";
import type { CalendarEvent } from "@/app/(app)/api/events/route";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Attendee {
  userId: string;
  displayName: string;
  email: string;
  rsvpedAt: string;
}

interface EventGroups {
  today: CalendarEvent[];
  thisWeek: CalendarEvent[];
  thisMonth: CalendarEvent[];
  thisSemester: CalendarEvent[];
  later: CalendarEvent[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function groupEvents(events: CalendarEvent[]): EventGroups {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(todayStart.getDate() + 7);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Semester end: Spring = May, Summer = Aug, Fall = Dec
  const m = now.getMonth(); // 0-indexed
  const semesterEndMonth = m <= 4 ? 5 : m <= 7 ? 9 : 12; // exclusive month index
  const semesterEnd = new Date(now.getFullYear(), semesterEndMonth, 1);

  const groups: EventGroups = { today: [], thisWeek: [], thisMonth: [], thisSemester: [], later: [] };

  for (const event of events) {
    const d = new Date(event.start);
    if (d >= todayStart && d < tomorrowStart)       groups.today.push(event);
    else if (d >= tomorrowStart && d < weekEnd)     groups.thisWeek.push(event);
    else if (d >= weekEnd && d < monthEnd)          groups.thisMonth.push(event);
    else if (d >= monthEnd && d < semesterEnd)      groups.thisSemester.push(event);
    else if (d >= semesterEnd)                      groups.later.push(event);
  }
  return groups;
}

function semesterLabel(): string {
  const m = new Date().getMonth();
  if (m <= 4) return "This Spring";
  if (m <= 7) return "This Summer";
  return "This Fall";
}

function formatTime(start: string, isAllDay: boolean): string {
  if (isAllDay) return "All day";
  return new Date(start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDateShort(start: string): string {
  return new Date(start).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatDateBadge(start: string): { month: string; day: string } {
  const d = new Date(start);
  return {
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: d.getDate().toString(),
  };
}

// ─── Event Card ───────────────────────────────────────────────────────────────

interface EventCardProps {
  event: CalendarEvent;
  attendees: Attendee[];
  isRsvped: boolean;
  isProcessing: boolean;
  isAuthenticated: boolean;
  currentUserId: string | undefined;
  onRsvp: (eventId: string) => void;
  /** grid = fills column width; scroll = fixed narrow width for scroll row */
  layout: "grid" | "scroll";
}

function EventCard({
  event,
  attendees,
  isRsvped,
  isProcessing,
  isAuthenticated,
  currentUserId,
  onRsvp,
  layout,
}: EventCardProps) {
  const badge = formatDateBadge(event.start);
  // Show more attendee chips in grid layout where there's room
  const maxChips = layout === "grid" ? 4 : 2;
  const visibleAttendees = attendees.slice(0, maxChips);
  const overflow = attendees.length - visibleAttendees.length;

  const outerCls =
    layout === "scroll"
      ? "shrink-0 w-[260px] h-[340px]"
      : "w-full";

  return (
    <div className={`${outerCls} bg-white rounded-2xl border border-[#e8e6dc] flex flex-col overflow-hidden hover:shadow-md hover:border-[#d97757]/30 transition-all duration-200`}>
      <div className="flex-1 flex flex-col p-5 min-h-0">
        {/* Date badge + title row */}
        <div className="flex items-start gap-3 mb-3">
          <div className="shrink-0 flex flex-col items-center bg-[#d97757]/10 border border-[#d97757]/20 rounded-xl px-2.5 py-1.5 min-w-[44px]">
            <span className="text-[9px] font-bold text-[#d97757] tracking-widest leading-none">
              {badge.month}
            </span>
            <span className="text-lg font-bold text-[#d97757] leading-tight">
              {badge.day}
            </span>
          </div>
          <h3 className={`heading font-semibold text-[#141413] leading-snug line-clamp-3 flex-1 ${layout === "grid" ? "text-base" : "text-sm"}`}>
            {event.title}
          </h3>
        </div>

        {/* Meta */}
        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-[#b0aea5]">
            <Clock size={11} className="shrink-0" />
            <span className="truncate">{formatDateShort(event.start)}{!event.isAllDay && ` · ${formatTime(event.start, false)}`}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1.5 text-xs text-[#b0aea5]">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <p className={`text-xs text-[#b0aea5] leading-relaxed ${layout === "grid" ? "line-clamp-4" : "line-clamp-3"}`}>
            {event.description}
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer */}
        <div className="border-t border-[#e8e6dc] pt-3 mt-3">
          {!isAuthenticated ? (
            <Link
              href="/auth"
              className="flex items-center justify-between w-full text-xs"
            >
              <span className="text-[#b0aea5] flex items-center gap-1">
                <Users size={11} />
                Sign in to RSVP
              </span>
              <span className="text-[#d97757] font-medium">→</span>
            </Link>
          ) : (
            <div className="space-y-2">
              {/* Attendee count + names */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-[#b0aea5] flex items-center gap-1 shrink-0">
                  <Users size={11} />
                  {attendees.length === 0 ? "No RSVPs yet" : `${attendees.length} attending`}
                </span>
                {visibleAttendees.map((a) => {
                  const isMe = a.userId === currentUserId;
                  return (
                    <span
                      key={a.userId}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full border leading-none ${
                        isMe
                          ? "bg-[#d97757]/10 border-[#d97757]/30 text-[#d97757] font-medium"
                          : "bg-[#faf9f5] border-[#e8e6dc] text-[#555555]"
                      }`}
                    >
                      {isMe ? "you" : (a.displayName || a.email.split("@")[0]).split(" ")[0]}
                    </span>
                  );
                })}
                {overflow > 0 && (
                  <span className="text-[10px] text-[#b0aea5]">+{overflow}</span>
                )}
              </div>

              {/* RSVP button */}
              <button
                onClick={() => onRsvp(event.id)}
                disabled={isProcessing}
                className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-60 ${
                  isRsvped
                    ? "border border-[#e8e6dc] text-[#555555] hover:border-red-200 hover:text-red-500 hover:bg-red-50"
                    : "bg-[#d97757] hover:bg-[#c86843] text-white"
                }`}
              >
                {isProcessing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : isRsvped ? (
                  "Cancel RSVP"
                ) : (
                  "RSVP →"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Section (label + horizontal scroll row) ─────────────────────────────────

interface EventSectionProps {
  label: string;
  events: CalendarEvent[];
  rsvpData: Record<string, Attendee[]>;
  userRsvps: Set<string>;
  rsvping: string | null;
  isAuthenticated: boolean;
  currentUserId: string | undefined;
  onRsvp: (eventId: string) => void;
}

function EventSection({
  label,
  events,
  rsvpData,
  userRsvps,
  rsvping,
  isAuthenticated,
  currentUserId,
  onRsvp,
}: EventSectionProps) {
  if (events.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5 px-4 sm:px-6 lg:px-8">
        <div className="w-1 h-5 bg-[#d97757] rounded-full shrink-0" />
        <h2 className="heading text-base font-semibold text-[#141413]">{label}</h2>
        <span className="text-xs text-[#b0aea5] bg-[#e8e6dc] px-2.5 py-0.5 rounded-full font-medium">
          {events.length}
        </span>
      </div>

      {/* Wrapping grid — max 4 columns, wraps onto new rows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-4 sm:px-6 lg:px-8">
        {events.map((event) => (
          <EventCard
            key={event.id}
            layout="grid"
            event={event}
            attendees={rsvpData[event.id] ?? []}
            isRsvped={userRsvps.has(event.id)}
            isProcessing={rsvping === event.id}
            isAuthenticated={isAuthenticated}
            currentUserId={currentUserId}
            onRsvp={onRsvp}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [rsvpData, setRsvpData] = useState<Record<string, Attendee[]>>({});
  const [userRsvps, setUserRsvps] = useState<Set<string>>(new Set());
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [rsvping, setRsvping] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setEventsError(data.error);
        else setEvents(data.events ?? []);
      })
      .catch(() => setEventsError("Failed to load events. Try again later."))
      .finally(() => setLoadingEvents(false));
  }, []);

  const fetchRsvps = useCallback(
    async (eventList: CalendarEvent[]) => {
      if (!user || eventList.length === 0) return;
      const results = await Promise.all(
        eventList.map(async (event) => {
          const snap = await getDocs(collection(db, "rsvps", event.id, "attendees"));
          const attendees: Attendee[] = snap.docs.map((d) => ({
            userId: d.id,
            ...(d.data() as Omit<Attendee, "userId">),
          }));
          return { eventId: event.id, attendees };
        })
      );
      const dataMap: Record<string, Attendee[]> = {};
      const rsvped = new Set<string>();
      for (const { eventId, attendees } of results) {
        dataMap[eventId] = attendees;
        if (attendees.some((a) => a.userId === user.uid)) rsvped.add(eventId);
      }
      setRsvpData(dataMap);
      setUserRsvps(rsvped);
    },
    [user]
  );

  useEffect(() => {
    if (!authLoading && events.length > 0) fetchRsvps(events);
  }, [authLoading, events, fetchRsvps]);

  const handleRsvp = async (eventId: string) => {
    if (!user) { router.push("/auth"); return; }
    setRsvping(eventId);
    const ref = doc(db, "rsvps", eventId, "attendees", user.uid);
    const isRsvped = userRsvps.has(eventId);
    try {
      if (isRsvped) {
        setUserRsvps((prev) => { const next = new Set(prev); next.delete(eventId); return next; });
        setRsvpData((prev) => ({ ...prev, [eventId]: (prev[eventId] ?? []).filter((a) => a.userId !== user.uid) }));
        await deleteDoc(ref);
      } else {
        const newAttendee: Attendee = {
          userId: user.uid,
          displayName: user.displayName ?? "",
          email: user.email ?? "",
          rsvpedAt: new Date().toISOString(),
        };
        setUserRsvps((prev) => new Set(prev).add(eventId));
        setRsvpData((prev) => ({ ...prev, [eventId]: [...(prev[eventId] ?? []), newAttendee] }));
        await setDoc(ref, { displayName: newAttendee.displayName, email: newAttendee.email, rsvpedAt: newAttendee.rsvpedAt });
      }
    } catch (err) {
      console.error("RSVP error:", err);
      await fetchRsvps(events);
    } finally {
      setRsvping(null);
    }
  };

  const groups = groupEvents(events);
  const hasEvents = events.length > 0;

  const sectionProps = {
    rsvpData,
    userRsvps,
    rsvping,
    isAuthenticated: !!user,
    currentUserId: user?.uid,
    onRsvp: handleRsvp,
  };

  return (
    <div className="min-h-screen bg-[#faf9f5]">
      {/* Hero band */}
      <PageHero
        eyebrow="Club Events"
        heading="Events & Meetups"
        description="Weekly meetings, workshops, hackathons, and more — all open to Penn State students of any background or skill level."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="https://calendar.google.com/calendar/u/0?cid=Y2xhdWRlcHN1QGdtYWlsLmNvbQ"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#d97757] hover:bg-[#c86843] text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              <Calendar size={15} />
              Add to Google Calendar
            </Link>
            {!user && (
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 border border-white/20 hover:border-white/40 text-white/70 hover:text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
              >
                Sign in to RSVP
              </Link>
            )}
          </div>
        }
        statsBar={
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm text-[#b0aea5]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d97757] inline-block" />
                <span><span className="text-white font-medium">{events.length}</span> upcoming events</span>
              </div>
              {hasEvents && (
                <div className="flex items-center gap-2 text-sm text-[#b0aea5]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6a9bcc] inline-block" />
                  <span>Open to all Penn State students</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="https://groupme.com/join_group/108706896/m6t7b7Vs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-[#b0aea5] hover:text-white transition-colors"
              >
                <MessageCircle size={13} />
                GroupMe
              </Link>
              <span className="text-white/20">·</span>
              <Link
                href="https://www.instagram.com/claude.psu"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-[#b0aea5] hover:text-white transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <circle cx="12" cy="12" r="4"/>
                  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
                </svg>
                @claude.psu
              </Link>
            </div>
          </div>
        }
      />

      {/* Content */}
      <section className="py-12">
        {loadingEvents ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-[#b0aea5]" />
          </div>
        ) : eventsError ? (
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center">
              <p className="text-sm text-red-600 font-medium mb-1">Couldn&apos;t load events</p>
              <p className="text-xs text-red-400">{eventsError}</p>
            </div>
          </div>
        ) : !hasEvents ? (
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl border border-[#e8e6dc] p-12 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-[#e8e6dc] rounded-xl flex items-center justify-center mb-4">
                <Calendar size={20} className="text-[#b0aea5]" />
              </div>
              <p className="text-base font-medium text-[#141413] mb-2">No upcoming events</p>
              <p className="text-sm text-[#b0aea5] max-w-xs leading-relaxed">
                Nothing scheduled yet — check back soon or follow us for announcements.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            <EventSection label="Today" events={groups.today} {...sectionProps} />
            <EventSection label="This Week" events={groups.thisWeek} {...sectionProps} />
            <EventSection label="This Month" events={groups.thisMonth} {...sectionProps} />
            <EventSection label={semesterLabel()} events={groups.thisSemester} {...sectionProps} />
            <EventSection label="Later" events={groups.later} {...sectionProps} />

            {/* Bottom CTA */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
              <div className="bg-[#141413] rounded-2xl p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                  <h3 className="heading text-lg font-semibold text-white mb-1">Stay in the loop</h3>
                  <p className="text-sm text-[#b0aea5] mb-4">Join our GroupMe for announcements, or follow us on Instagram.</p>
                  <div className="flex items-center gap-4">
                    <Link
                      href="https://groupme.com/join_group/108706896/m6t7b7Vs"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-[#b0aea5] hover:text-white transition-colors"
                    >
                      <MessageCircle size={15} />
                      Join GroupMe
                    </Link>
                    <span className="text-white/20">·</span>
                    <Link
                      href="https://www.instagram.com/claude.psu"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-[#b0aea5] hover:text-white transition-colors"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                        <circle cx="12" cy="12" r="4"/>
                        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
                      </svg>
                      @claude.psu
                    </Link>
                  </div>
                </div>
                <div className="flex gap-3 shrink-0">
                  <Link
                    href="/resources"
                    className="inline-flex items-center gap-2 bg-[#d97757] hover:bg-[#c86843] text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
                  >
                    Browse resources
                  </Link>
                  <AuthCTA
                    className="inline-flex items-center gap-2 border border-white/20 hover:border-white/40 text-white/70 hover:text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
                    joinLabel="Join the club"
                    dashboardLabel="Visit dashboard"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
