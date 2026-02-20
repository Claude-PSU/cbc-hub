"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { CalendarEvent } from "@/app/(app)/api/events/route";
import { Loader2, ChevronDown, Users, MapPin, Clock, RefreshCw } from "lucide-react";

interface Attendee {
  userId: string;
  displayName: string;
  email: string;
  rsvpedAt: string;
}

function formatTime(start: string, isAllDay: boolean): string {
  if (isAllDay) return "All day";
  return new Date(start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDate(start: string): string {
  return new Date(start).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isPast(start: string): boolean {
  return new Date(start) < new Date();
}

export default function EventsTab() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [syncedAtMap, setSyncedAtMap] = useState<Record<string, string>>({});
  const [attendeesMap, setAttendeesMap] = useState<Record<string, Attendee[]>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");

  const loadFirestoreData = useCallback(async (eventList: CalendarEvent[]) => {
    // Load syncedAt metadata from Firestore events collection
    const syncSnap = await getDocs(collection(db, "events"));
    const syncMap: Record<string, string> = {};
    syncSnap.docs.forEach((d) => {
      const data = d.data();
      if (data.syncedAt) syncMap[d.id] = data.syncedAt;
    });
    setSyncedAtMap(syncMap);

    // Load RSVPs for each event
    const attendeesData: Record<string, Attendee[]> = {};
    await Promise.all(
      eventList.map(async (event) => {
        const snap = await getDocs(collection(db, "rsvps", event.id, "attendees"));
        attendeesData[event.id] = snap.docs.map((d) => ({
          userId: d.id,
          ...(d.data() as Omit<Attendee, "userId">),
        }));
      })
    );
    setAttendeesMap(attendeesData);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // Load synced events from Firestore only — no Google Calendar call on mount.
        // Use "Sync to Database" to pull fresh data from Google Calendar.
        const snap = await getDocs(collection(db, "events"));
        const eventList: CalendarEvent[] = snap.docs.map((d) => d.data() as CalendarEvent);
        setEvents(eventList);
        await loadFirestoreData(eventList);
      } catch (err) {
        console.error("Error loading events:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadFirestoreData]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      // 1. Re-fetch all events from Google Calendar
      const res = await fetch("/api/admin/sync-events");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch from Google Calendar");

      const calendarEvents: CalendarEvent[] = data.events ?? [];
      const syncedAt = new Date().toISOString();

      // 2. Write each event to Firestore using client SDK
      //    Firestore rules enforce isAdmin() — no server-side admin SDK needed
      await Promise.all(
        calendarEvents.map((event) =>
          setDoc(doc(db, "events", event.id), { ...event, syncedAt })
        )
      );

      // 3. Update local state
      setEvents(calendarEvents);
      const newSyncMap: Record<string, string> = {};
      calendarEvents.forEach((e) => { newSyncMap[e.id] = syncedAt; });
      setSyncedAtMap(newSyncMap);
      await loadFirestoreData(calendarEvents);

      setSyncMessage(`Synced ${calendarEvents.length} events from Google Calendar.`);
    } catch (err) {
      setSyncMessage(`Error: ${(err as Error).message}`);
    } finally {
      setSyncing(false);
    }
  };

  const filteredEvents = [...events]
    .sort((a, b) => {
      if (filter === "past") return new Date(b.start).getTime() - new Date(a.start).getTime();
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    })
    .filter((e) => {
      if (filter === "upcoming") return !isPast(e.start);
      if (filter === "past") return isPast(e.start);
      return true;
    });

  const upcomingCount = events.filter((e) => !isPast(e.start)).length;
  const pastCount = events.filter((e) => isPast(e.start)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-[#d97757]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-[#141413]">
          Events ({events.length} total)
        </h2>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-[#d97757] text-white text-sm font-medium rounded-lg hover:bg-[#c86843] disabled:opacity-60"
        >
          <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing…" : "Sync to Database"}
        </button>
      </div>

      {syncMessage && (
        <div
          className={`text-sm px-4 py-3 rounded-lg border ${
            syncMessage.startsWith("Error")
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-green-50 border-green-200 text-green-700"
          }`}
        >
          {syncMessage}
        </div>
      )}

      {events.length === 0 ? (
        <div className="text-center py-12 text-[#b0aea5]">
          <p>No events found in Google Calendar.</p>
        </div>
      ) : (
        <>
          {/* Filter tabs */}
          <div className="flex gap-1 bg-[#f0ede6] rounded-lg p-1 w-fit">
            {(["upcoming", "past", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                  filter === f
                    ? "bg-white text-[#141413] shadow-sm"
                    : "text-[#b0aea5] hover:text-[#555555]"
                }`}
              >
                {f === "upcoming" ? `Upcoming (${upcomingCount})` : f === "past" ? `Past (${pastCount})` : `All (${events.length})`}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredEvents.length === 0 ? (
              <p className="text-sm text-[#b0aea5] text-center py-8">No {filter} events.</p>
            ) : (
              filteredEvents.map((event) => {
                const attendees = attendeesMap[event.id] || [];
                const isExpanded = expandedId === event.id;
                const past = isPast(event.start);
                const syncedAt = syncedAtMap[event.id];

                return (
                  <div key={event.id} className="bg-white rounded-2xl border border-[#e8e6dc] overflow-hidden">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : event.id)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#faf9f5] transition-colors text-left"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <h3 className="font-semibold text-[#141413]">{event.title}</h3>
                          {past && (
                            <span className="text-xs px-2 py-0.5 bg-[#e8e6dc] text-[#b0aea5] rounded-full">Past</span>
                          )}
                          {syncedAt ? (
                            <span className="text-xs px-2 py-0.5 bg-[#788c5d]/10 text-[#788c5d] rounded-full">
                              Synced {timeAgo(syncedAt)}
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-full">
                              Not synced
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-[#b0aea5] flex-wrap">
                          <div className="flex items-center gap-1">
                            <Clock size={13} />
                            {formatDate(event.start)} · {formatTime(event.start, event.isAllDay)}
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1">
                              <MapPin size={13} />
                              {event.location}
                            </div>
                          )}
                          <div className="flex items-center gap-1 bg-[#d97757]/10 text-[#d97757] px-2 py-1 rounded">
                            <Users size={12} />
                            {attendees.length} RSVP&apos;d
                          </div>
                        </div>
                      </div>
                      <ChevronDown
                        size={18}
                        className={`text-[#b0aea5] transition-transform ml-4 shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="border-t border-[#e8e6dc] bg-[#faf9f5] px-6 py-4">
                        {event.description && (
                          <div className="mb-4">
                            <p className="text-xs font-medium text-[#555555] mb-2">Description</p>
                            <p className="text-sm text-[#555555] leading-relaxed">{event.description}</p>
                          </div>
                        )}

                        <div>
                          <p className="text-xs font-medium text-[#555555] mb-2">Attendees ({attendees.length})</p>
                          {attendees.length === 0 ? (
                            <p className="text-xs text-[#b0aea5]">No RSVPs.</p>
                          ) : (
                            <div className="bg-white rounded-xl border border-[#e8e6dc] overflow-hidden">
                              <table className="w-full text-xs">
                                <thead className="bg-[#faf9f5] border-b border-[#e8e6dc]">
                                  <tr>
                                    <th className="px-4 py-2 text-left font-semibold text-[#555555]">Name</th>
                                    <th className="px-4 py-2 text-left font-semibold text-[#555555]">Email</th>
                                    <th className="px-4 py-2 text-left font-semibold text-[#555555]">RSVP&apos;d</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#e8e6dc]">
                                  {attendees.map((attendee) => (
                                    <tr key={attendee.userId}>
                                      <td className="px-4 py-2 text-[#141413] font-medium">{attendee.displayName}</td>
                                      <td className="px-4 py-2 text-[#555555]">{attendee.email}</td>
                                      <td className="px-4 py-2 text-[#b0aea5]">
                                        {new Date(attendee.rsvpedAt).toLocaleDateString()}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
