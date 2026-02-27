"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { collection, getDocs, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { CalendarEvent } from "@/app/(app)/api/events/route";
import type { AttendanceRecord } from "@/lib/types";
import { Loader2, ChevronDown, ChevronRight, Users, MapPin, Clock, RefreshCw, QrCode, Download, Copy, X, CheckCircle2, Lock, Unlock, Search } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

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

// ─── QR Modal ─────────────────────────────────────────────────────────────────

type SaveState = "idle" | "saving" | "saved" | "error";

function QrModal({ event, onClose, onRedirectSaved }: {
  event: CalendarEvent;
  onClose: () => void;
  onRedirectSaved: (eventId: string, url: string) => void;
}) {
  const [redirectUrl, setRedirectUrl] = useState(event.qrRedirectUrl ?? "/dashboard");
  const [copied, setCopied] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isFirstRender = useRef(true);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const isValidRedirect = redirectUrl.startsWith("/") || redirectUrl.startsWith("https://") || redirectUrl.startsWith("http://");
  // QR code only contains check-in URL; redirect URL is protected by single-use tokens on server
  const checkInUrl = `${origin}/checkin/${event.id}`;

  // Debounced auto-save to Firestore whenever the redirect URL changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!isValidRedirect) return;

    setSaveState("saving");
    const timer = setTimeout(async () => {
      try {
        await updateDoc(doc(db, "events", event.id), { qrRedirectUrl: redirectUrl });
        onRedirectSaved(event.id, redirectUrl);
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      } catch {
        setSaveState("error");
      }
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirectUrl]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `checkin-qr-${event.id}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(checkInUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#b0aea5] uppercase tracking-wider mb-0.5">Check-In QR</p>
            <h3 className="text-sm font-semibold text-[#141413] leading-snug">{event.title}</h3>
            <p className="text-xs text-[#b0aea5] mt-0.5">{formatDate(event.start)} · {formatTime(event.start, event.isAllDay)}</p>
          </div>
          <button onClick={onClose} className="text-[#b0aea5] hover:text-[#141413] transition-colors shrink-0 mt-0.5">
            <X size={18} />
          </button>
        </div>

        {/* QR Code */}
        <div className="flex justify-center">
          <div className="p-4 bg-white border-2 border-[#e8e6dc] rounded-xl">
            <QRCodeCanvas
              ref={canvasRef}
              value={checkInUrl}
              size={200}
              level="M"
              marginSize={1}
            />
          </div>
        </div>

        {/* Redirect URL config */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-[#555555]">
              Redirect after check-in
            </label>
            <span className={`text-[10px] font-medium transition-colors ${
              saveState === "saving" ? "text-[#b0aea5]" :
              saveState === "saved"  ? "text-[#788c5d]" :
              saveState === "error"  ? "text-red-500" : "text-transparent"
            }`}>
              {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed" : "·"}
            </span>
          </div>
          <input
            type="text"
            value={redirectUrl}
            onChange={(e) => setRedirectUrl(e.target.value)}
            placeholder="/dashboard or https://..."
            className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 text-[#141413] font-mono bg-[#faf9f5] ${
              isValidRedirect
                ? "border-[#e8e6dc] focus:border-[#d97757] focus:ring-[#d97757]/20"
                : "border-red-300 focus:border-red-400 focus:ring-red-100"
            }`}
          />
          <p className="text-[10px] text-[#b0aea5] mt-1">
            Where users go after check-in (protected by single-use token). Path (e.g. <code>/dashboard</code>) or URL (e.g. <code>https://jotform.com/…</code>)
          </p>
        </div>

        {/* URL preview */}
        <div className="bg-[#faf9f5] rounded-lg px-3 py-2 border border-[#e8e6dc]">
          <p className="text-[10px] text-[#b0aea5] mb-0.5 font-medium uppercase tracking-wider">Check-in URL</p>
          <p className="text-xs text-[#555555] font-mono break-all leading-relaxed">{checkInUrl}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-[#e8e6dc] rounded-lg text-xs font-medium text-[#555555] hover:bg-[#faf9f5] transition-colors"
          >
            {copied ? <CheckCircle2 size={13} className="text-[#788c5d]" /> : <Copy size={13} />}
            {copied ? "Copied!" : "Copy URL"}
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#d97757] text-white rounded-lg text-xs font-medium hover:bg-[#c86843] transition-colors"
          >
            <Download size={13} />
            Download PNG
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Collapsible Attendee Section ────────────────────────────────────────────────

function CollapsibleAttendeeSection({
  title,
  count,
  icon,
  accentColor,
  emptyText,
  columns,
  rows,
  extraAction,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  accentColor: string;
  emptyText: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string>[];
  extraAction?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = search
    ? rows.filter((row) =>
        Object.values(row).some((v) => v.toLowerCase().includes(search.toLowerCase()))
      )
    : rows;

  const handleExportCsv = () => {
    const header = columns.map((c) => c.label).join(",");
    const body = filtered.map((row) => columns.map((c) => `"${(row[c.key] ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${title.toLowerCase().replace(/\s+/g, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="rounded-xl border border-[#e8e6dc] bg-white overflow-hidden">
      {/* Section header — always visible */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#faf9f5]/60 transition-colors text-left"
      >
        {open ? (
          <ChevronDown size={14} className="text-[#b0aea5] shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-[#b0aea5] shrink-0" />
        )}
        <span className="flex items-center gap-1.5">
          {icon}
          <span className="text-xs font-semibold text-[#555555]">{title}</span>
        </span>
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
        >
          {count}
        </span>
        <span className="flex-1" />
        {extraAction && (
          <span onClick={(e) => e.stopPropagation()}>{extraAction}</span>
        )}
      </button>

      {/* Collapsible body */}
      {open && (
        <div className="border-t border-[#e8e6dc]">
          {count === 0 ? (
            <p className="text-xs text-[#b0aea5] px-4 py-4">{emptyText}</p>
          ) : (
            <>
              {/* Search + export toolbar */}
              <div className="flex items-center gap-2 px-4 py-2 bg-[#faf9f5] border-b border-[#e8e6dc]">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <Search size={12} className="text-[#b0aea5] shrink-0" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter by name or email…"
                    className="text-xs bg-transparent border-none outline-none text-[#141413] placeholder:text-[#b0aea5] w-full"
                  />
                </div>
                <button
                  onClick={handleExportCsv}
                  className="flex items-center gap-1 text-[10px] font-medium text-[#555555] hover:text-[#d97757] transition-colors shrink-0"
                >
                  <Download size={10} />
                  CSV
                </button>
              </div>

              {/* Table */}
              <table className="w-full text-xs">
                <thead className="bg-[#faf9f5] border-b border-[#e8e6dc]">
                  <tr>
                    {columns.map((col) => (
                      <th key={col.key} className="px-4 py-2 text-left font-semibold text-[#555555]">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e6dc]">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="px-4 py-3 text-center text-[#b0aea5]">
                        No matches for &ldquo;{search}&rdquo;
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row, i) => (
                      <tr key={i}>
                        {columns.map((col) => (
                          <td
                            key={col.key}
                            className={`px-4 py-2 ${col.key === "name" ? "text-[#141413] font-medium" : col.key === "email" ? "text-[#555555]" : "text-[#b0aea5]"}`}
                          >
                            {row[col.key]}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function EventsTab() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [syncedAtMap, setSyncedAtMap] = useState<Record<string, string>>({});
  const [attendeesMap, setAttendeesMap] = useState<Record<string, Attendee[]>>({});
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord[]>>({});
  const [checkInOpenMap, setCheckInOpenMap] = useState<Record<string, boolean>>({});
  const [togglingCheckIn, setTogglingCheckIn] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  const [qrEvent, setQrEvent] = useState<CalendarEvent | null>(null);

  // Keep local event state in sync when admin saves a redirect URL in the modal
  const handleRedirectSaved = useCallback((eventId: string, url: string) => {
    setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, qrRedirectUrl: url } : e));
    setQrEvent((prev) => prev?.id === eventId ? { ...prev, qrRedirectUrl: url } : prev);
  }, []);

  const handleToggleCheckIn = async (eventId: string) => {
    setTogglingCheckIn(eventId);
    const currentStatus = checkInOpenMap[eventId] ?? true;
    const newStatus = !currentStatus;
    try {
      await updateDoc(doc(db, "events", eventId), { checkInOpen: newStatus });
      setCheckInOpenMap((prev) => ({ ...prev, [eventId]: newStatus }));
    } catch (err) {
      console.error("Error toggling check-in status:", err);
    } finally {
      setTogglingCheckIn(null);
    }
  };

  const loadFirestoreData = useCallback(async (eventList: CalendarEvent[]) => {
    // Load syncedAt metadata and checkInOpen status from Firestore events collection
    const syncSnap = await getDocs(collection(db, "events"));
    const syncMap: Record<string, string> = {};
    const checkInMap: Record<string, boolean> = {};
    syncSnap.docs.forEach((d) => {
      const data = d.data();
      if (data.syncedAt) syncMap[d.id] = data.syncedAt;
      // Default to true if not set (check-in is open by default)
      checkInMap[d.id] = data.checkInOpen !== false;
    });
    setSyncedAtMap(syncMap);
    setCheckInOpenMap(checkInMap);

    // Load RSVPs and attendance check-ins for each event in parallel
    const attendeesData: Record<string, Attendee[]> = {};
    const attendanceData: Record<string, AttendanceRecord[]> = {};

    await Promise.all(
      eventList.map(async (event) => {
        const [rsvpSnap, checkInSnap] = await Promise.all([
          getDocs(collection(db, "rsvps", event.id, "attendees")),
          getDocs(collection(db, "attendance", event.id, "checkins")),
        ]);

        attendeesData[event.id] = rsvpSnap.docs.map((d) => ({
          userId: d.id,
          ...(d.data() as Omit<Attendee, "userId">),
        }));

        attendanceData[event.id] = checkInSnap.docs.map((d) => d.data() as AttendanceRecord);
      })
    );

    setAttendeesMap(attendeesData);
    setAttendanceMap(attendanceData);
  }, []);

  useEffect(() => {
    (async () => {
      try {
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
      const res = await fetch("/api/admin/sync-events");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch from Google Calendar");

      const calendarEvents: CalendarEvent[] = data.events ?? [];
      const syncedAt = new Date().toISOString();

      await Promise.all(
        calendarEvents.map((event) =>
          // merge: true preserves admin-set fields (e.g. qrRedirectUrl) across syncs
          setDoc(doc(db, "events", event.id), { ...event, syncedAt }, { merge: true })
        )
      );

      // Merge admin-set fields (e.g. qrRedirectUrl) from current state so they
      // aren't lost when local state is replaced with the Google Calendar payload.
      const mergedEvents = calendarEvents.map((e) => ({
        ...e,
        qrRedirectUrl: events.find((ev) => ev.id === e.id)?.qrRedirectUrl,
      }));
      setEvents(mergedEvents);
      const newSyncMap: Record<string, string> = {};
      calendarEvents.forEach((e) => { newSyncMap[e.id] = syncedAt; });
      setSyncedAtMap(newSyncMap);
      await loadFirestoreData(mergedEvents);

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
      {/* QR Modal */}
      {qrEvent && <QrModal event={qrEvent} onClose={() => setQrEvent(null)} onRedirectSaved={handleRedirectSaved} />}

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
                const checkIns = attendanceMap[event.id] || [];
                const isExpanded = expandedId === event.id;
                const past = isPast(event.start);
                const syncedAt = syncedAtMap[event.id];

                return (
                  <div key={event.id} className="bg-white rounded-2xl border border-[#e8e6dc] overflow-hidden">
                    {/* Card header — toggle and QR button are siblings to avoid nested <button> */}
                    <div className="flex items-center">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : event.id)}
                        className="flex-1 min-w-0 px-6 py-4 flex items-center gap-4 hover:bg-[#faf9f5] transition-colors text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <h3 className="font-semibold text-[#141413]">{event.title}</h3>
                            {past && (
                              <span className="text-xs px-2 py-0.5 bg-[#e8e6dc] text-[#b0aea5] rounded-full">Past</span>
                            )}
                            {!(checkInOpenMap[event.id] ?? true) && (
                              <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-full flex items-center gap-1">
                                <Lock size={10} />
                                Check-in Closed
                              </span>
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
                            {checkIns.length > 0 && (
                              <div className="flex items-center gap-1 bg-[#788c5d]/10 text-[#788c5d] px-2 py-1 rounded">
                                <CheckCircle2 size={12} />
                                {checkIns.length} checked in
                              </div>
                            )}
                            {attendees.length > 0 && checkIns.length > 0 && (
                              <div
                                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold"
                                style={{
                                  color: checkIns.length / attendees.length >= 0.5 ? "#788c5d" : "#d97757",
                                  backgroundColor: checkIns.length / attendees.length >= 0.5 ? "rgba(120,140,93,0.1)" : "rgba(217,119,87,0.1)",
                                }}
                              >
                                {Math.round((checkIns.length / attendees.length) * 100)}%
                              </div>
                            )}
                          </div>
                        </div>
                        <ChevronDown
                          size={18}
                          className={`text-[#b0aea5] transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </button>

                      {/* Check-in toggle and QR button — siblings of the toggle, not nested inside it */}
                      <div className="pr-4 shrink-0 flex items-center gap-2">
                        <button
                          onClick={() => handleToggleCheckIn(event.id)}
                          disabled={togglingCheckIn === event.id}
                          className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-60 ${
                            checkInOpenMap[event.id] ?? true
                              ? "border border-[#e8e6dc] text-[#788c5d] hover:bg-[#788c5d]/5 hover:border-[#788c5d]/30"
                              : "border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100"
                          }`}
                          title={checkInOpenMap[event.id] ?? true ? "Close check-in" : "Open check-in"}
                        >
                          {togglingCheckIn === event.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : checkInOpenMap[event.id] ?? true ? (
                            <Unlock size={12} />
                          ) : (
                            <Lock size={12} />
                          )}
                        </button>
                        <button
                          onClick={() => setQrEvent(event)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#e8e6dc] rounded-lg text-[#555555] hover:bg-[#faf9f5] hover:border-[#d97757]/30 hover:text-[#d97757] transition-colors"
                          title="Generate QR check-in code"
                        >
                          <QrCode size={13} />
                          QR Code
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-[#e8e6dc] bg-[#faf9f5] px-6 py-4 space-y-4">
                        {event.description && (
                          <div>
                            <p className="text-xs font-medium text-[#555555] mb-2">Description</p>
                            <p className="text-sm text-[#555555] leading-relaxed">{event.description}</p>
                          </div>
                        )}

                        {/* Conversion rate summary */}
                        {attendees.length > 0 && (
                          <div className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl border border-[#e8e6dc]">
                            <div className="flex items-center gap-4 text-xs flex-wrap">
                              <span className="text-[#b0aea5]">
                                <span className="font-semibold text-[#d97757]">{attendees.length}</span> RSVP&apos;d
                              </span>
                              <span className="text-[#b0aea5]">→</span>
                              <span className="text-[#b0aea5]">
                                <span className="font-semibold text-[#788c5d]">{checkIns.length}</span> checked in
                              </span>
                              <span className="text-[#b0aea5]">·</span>
                              <span className="text-xs font-semibold" style={{ color: checkIns.length / attendees.length >= 0.5 ? "#788c5d" : "#d97757" }}>
                                {Math.round((checkIns.length / attendees.length) * 100)}% conversion
                              </span>
                            </div>
                          </div>
                        )}

                        {/* RSVPs — collapsible */}
                        <CollapsibleAttendeeSection
                          title="RSVPs"
                          count={attendees.length}
                          icon={<Users size={12} className="text-[#d97757]" />}
                          accentColor="#d97757"
                          emptyText="No RSVPs yet."
                          columns={[
                            { key: "name", label: "Name" },
                            { key: "email", label: "Email" },
                            { key: "date", label: "RSVP'd" },
                          ]}
                          rows={attendees.map((a) => ({
                            name: a.displayName,
                            email: a.email,
                            date: new Date(a.rsvpedAt).toLocaleDateString(),
                          }))}
                        />

                        {/* Check-ins — collapsible */}
                        <CollapsibleAttendeeSection
                          title="Check-ins"
                          count={checkIns.length}
                          icon={<CheckCircle2 size={12} className="text-[#788c5d]" />}
                          accentColor="#788c5d"
                          emptyText="No check-ins yet. Generate a QR code for members to scan at the event."
                          columns={[
                            { key: "name", label: "Name" },
                            { key: "email", label: "Email" },
                            { key: "time", label: "Checked In" },
                          ]}
                          rows={checkIns
                            .sort((a, b) => new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime())
                            .map((r) => ({
                              name: r.displayName,
                              email: r.email,
                              time: `${new Date(r.checkedInAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · ${new Date(r.checkedInAt).toLocaleDateString()}`,
                            }))}
                          extraAction={
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={() => setQrEvent(event)}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setQrEvent(event); } }}
                              className="flex items-center gap-1 text-[10px] font-medium text-[#d97757] hover:underline cursor-pointer"
                            >
                              <QrCode size={10} />
                              QR Code
                            </span>
                          }
                        />
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
