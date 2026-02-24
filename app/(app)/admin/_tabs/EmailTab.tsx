"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import type { StoredEvent } from "@/lib/types";
import { Loader2, Send, Users, Calendar, ChevronDown, Info } from "lucide-react";

type Segment = "all" | "event";
type SendResult = { ok: true; count: number } | { error: string };

export default function EmailTab() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [events, setEvents] = useState<StoredEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);

  useEffect(() => {
    getDocs(collection(db, "events")).then((snap) => {
      const evts = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as StoredEvent))
        .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
      setEvents(evts);
      if (evts.length > 0) setSelectedEventId(evts[0].id);
    });
  }, []);

  const canSend =
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    (segment === "all" || (segment === "event" && selectedEventId !== ""));

  const handleSend = async () => {
    if (!canSend) return;

    const confirmMsg =
      segment === "all"
        ? "Send this email to ALL members? This cannot be undone."
        : "Send this email to everyone RSVP'd to the selected event?";
    if (!confirm(confirmMsg)) return;

    setSending(true);
    setResult(null);

    try {
      const idToken = await auth.currentUser?.getIdToken(/* forceRefresh */ true);
      if (!idToken) {
        setResult({ error: "Not authenticated. Please refresh the page and try again." });
        setSending(false);
        return;
      }
      const apiSegment =
        segment === "all" ? "all" : { eventId: selectedEventId };

      const res = await fetch("/api/admin/send-bulk-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim(), segment: apiSegment }),
      });

      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.error || "Failed to send." });
      } else {
        setResult(data as { ok: true; count: number });
        setSubject("");
        setBody("");
      }
    } catch (err) {
      setResult({ error: (err as Error).message });
    } finally {
      setSending(false);
    }
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-[#141413]">Compose Email</h2>
        <p className="text-sm text-[#b0aea5] mt-1">
          Send announcements to member segments via Gmail.
        </p>
      </div>

      {/* Segment selector */}
      <div className="bg-white rounded-2xl border border-[#e8e6dc] p-6 space-y-4">
        <h3 className="text-sm font-semibold text-[#141413]">Recipients</h3>

        <div className="flex gap-3">
          <button
            onClick={() => setSegment("all")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              segment === "all"
                ? "bg-[#d97757] border-[#d97757] text-white"
                : "border-[#e8e6dc] text-[#555555] hover:bg-[#faf9f5]"
            }`}
          >
            <Users size={15} />
            All Members
          </button>
          <button
            onClick={() => setSegment("event")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              segment === "event"
                ? "bg-[#d97757] border-[#d97757] text-white"
                : "border-[#e8e6dc] text-[#555555] hover:bg-[#faf9f5]"
            }`}
          >
            <Calendar size={15} />
            RSVP&apos;d to Event
          </button>
        </div>

        {segment === "event" && (
          <div>
            <label className="block text-xs font-medium text-[#555555] mb-1.5">
              Select event
            </label>
            {events.length === 0 ? (
              <p className="text-sm text-[#b0aea5]">No synced events found. Sync events from the Events tab first.</p>
            ) : (
              <div className="relative">
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 border border-[#e8e6dc] rounded-lg text-sm bg-white text-[#141413] focus:outline-none focus:border-[#d97757]"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} — {new Date(ev.start).toLocaleDateString()}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-3 text-[#b0aea5] pointer-events-none"
                />
              </div>
            )}
          </div>
        )}

        {/* Segment summary */}
        <div className="flex items-start gap-2 text-xs text-[#b0aea5] bg-[#faf9f5] rounded-lg px-3 py-2.5">
          <Info size={13} className="shrink-0 mt-0.5" />
          {segment === "all"
            ? "Email will be sent to all registered members (BCC'd for privacy)."
            : selectedEvent
            ? `Email will be sent to everyone who RSVP'd to "${selectedEvent.title}" (BCC'd for privacy).`
            : "Select an event above."}
        </div>
      </div>

      {/* Compose */}
      <div className="bg-white rounded-2xl border border-[#e8e6dc] p-6 space-y-4">
        <h3 className="text-sm font-semibold text-[#141413]">Message</h3>

        <div>
          <label className="block text-xs font-medium text-[#555555] mb-1.5">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Club meeting this Thursday!"
            className="w-full px-3 py-2.5 border border-[#e8e6dc] rounded-lg text-sm focus:outline-none focus:border-[#d97757]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#555555] mb-1.5">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message here…"
            rows={12}
            className="w-full px-3 py-2.5 border border-[#e8e6dc] rounded-lg text-sm resize-y focus:outline-none focus:border-[#d97757] font-mono leading-relaxed"
          />
          <p className="text-xs text-[#b0aea5] mt-1.5">
            Plain text — line breaks are preserved in the email.
          </p>
        </div>
      </div>

      {/* Result banner */}
      {result && (
        <div
          className={`px-4 py-3 rounded-xl text-sm border ${
            "ok" in result
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {"ok" in result
            ? `Email sent to ${result.count} recipient${result.count !== 1 ? "s" : ""}.`
            : result.error}
        </div>
      )}

      {/* Send */}
      <button
        onClick={handleSend}
        disabled={sending || !canSend}
        className="flex items-center gap-2 px-6 py-3 bg-[#d97757] hover:bg-[#c86843] disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
      >
        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        {sending ? "Sending…" : "Send Email"}
      </button>
    </div>
  );
}
