"use client";

import { useState, useEffect, useRef } from "react";
import { collection, getDocs, addDoc, query, orderBy, limit } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { marked } from "marked";
import type { StoredEvent, EmailTemplate, EmailLog } from "@/lib/types";
import { EMAIL_PROFILE_VAR_MAP } from "@/lib/types";
import Modal from "@/components/Modal";
import {
  Loader2, Send, Users, Calendar, ChevronDown,
  CheckCircle2, XCircle, Eye, EyeOff, Mail, AlertTriangle,
  Bold, Italic, Heading2, List, Link2, Save, BookOpen,
} from "lucide-react";

type Segment = "all" | "event";
type SendResult = { ok: true; count: number } | { error: string };

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function EmailTab() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [events, setEvents] = useState<StoredEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Markdown editor
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Template library
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Recipient count
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);

  // Send history
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  // ── Data loading ───────────────────────────────────────────────────────────
  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "emailLogs"), orderBy("sentAt", "desc"), limit(10))
      );
      setEmailLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EmailLog)));
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    getDocs(collection(db, "events")).then((snap) => {
      const evts = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as StoredEvent))
        .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
      setEvents(evts);
      if (evts.length > 0) setSelectedEventId(evts[0].id);
    });

    getDocs(query(collection(db, "emailTemplates"), orderBy("createdAt", "desc"))).then((snap) => {
      setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EmailTemplate)));
    });

    loadLogs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Recipient count ────────────────────────────────────────────────────────
  useEffect(() => {
    if (segment === "event" && !selectedEventId) {
      setRecipientCount(null);
      return;
    }
    const fetchCount = async () => {
      setCountLoading(true);
      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) return;
        const params =
          segment === "all"
            ? "?segment=all"
            : `?segment=event&eventId=${selectedEventId}`;
        const res = await fetch(`/api/admin/email-recipient-count${params}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (res.ok) setRecipientCount((await res.json()).count);
      } catch {
        // silently ignore — count is non-critical
      } finally {
        setCountLoading(false);
      }
    };
    fetchCount();
  }, [segment, selectedEventId]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const USER_VAR_REGEX = new RegExp(
    `\\{\\{(${Object.keys(EMAIL_PROFILE_VAR_MAP).join("|")})\\}\\}`
  );
  const hasUserVars = USER_VAR_REGEX.test(subject) || USER_VAR_REGEX.test(body);

  /** Resolves event vars for the preview panel using the selected event's data. */
  const previewResolve = (text: string): string => {
    if (!selectedEvent) return text;
    const ev = selectedEvent;
    const fmtDate = (iso: string) =>
      new Date(iso).toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
      });
    const fmtTime = (iso: string) =>
      new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const timeRange = ev.isAllDay ? "All Day" : `${fmtTime(ev.start)} – ${fmtTime(ev.end)}`;
    return text
      .replace(/\{\{eventTitle\}\}/g, ev.title)
      .replace(/\{\{eventDate\}\}/g, fmtDate(ev.start))
      .replace(/\{\{eventTime\}\}/g, timeRange)
      .replace(/\{\{eventLocation\}\}/g, ev.location)
      .replace(/\{\{eventDescription\}\}/g, ev.description);
  };

  const canSend =
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    (segment === "all" || (segment === "event" && selectedEventId !== ""));

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  // ── Markdown toolbar ───────────────────────────────────────────────────────
  function insertMarkdown(prefix: string, suffix = "", placeholder = "") {
    const ta = bodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = body.slice(start, end) || placeholder;
    setBody(body.slice(0, start) + prefix + selected + suffix + body.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  }

  const toolbarActions = [
    { icon: Bold,    label: "Bold",        action: () => insertMarkdown("**", "**", "bold text") },
    { icon: Italic,  label: "Italic",      action: () => insertMarkdown("_", "_", "italic text") },
    { icon: Heading2,label: "Heading",     action: () => insertMarkdown("## ", "", "Heading") },
    { icon: List,    label: "Bullet list", action: () => insertMarkdown("- ", "", "list item") },
    { icon: Link2,   label: "Link",        action: () => insertMarkdown("[", "](url)", "link text") },
  ];

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSend = () => {
    if (!canSend) return;
    if (segment === "all") {
      setShowConfirm(true);
      return;
    }
    if (!confirm("Send this email to everyone RSVP'd to the selected event?")) return;
    executeSend();
  };

  const executeSend = async () => {
    setShowConfirm(false);
    setSending(true);
    setResult(null);

    try {
      const idToken = await auth.currentUser?.getIdToken(/* forceRefresh */ true);
      if (!idToken) {
        setResult({ error: "Not authenticated. Please refresh the page and try again." });
        setSending(false);
        return;
      }
      const apiSegment = segment === "all" ? "all" : { eventId: selectedEventId };

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
        loadLogs(); // refresh history after successful send
      }
    } catch (err) {
      setResult({ error: (err as Error).message });
    } finally {
      setSending(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !subject.trim() || !body.trim()) return;
    setSavingTemplate(true);
    try {
      const docRef = await addDoc(collection(db, "emailTemplates"), {
        name: templateName.trim(),
        subject: subject.trim(),
        body: body.trim(),
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser?.uid || "",
      });
      setTemplates((prev) => [
        {
          id: docRef.id,
          name: templateName.trim(),
          subject: subject.trim(),
          body: body.trim(),
          createdAt: new Date().toISOString(),
          createdBy: auth.currentUser?.uid || "",
        },
        ...prev,
      ]);
      setTemplateName("");
      setShowSaveModal(false);
    } catch (err) {
      console.error("Failed to save template:", err);
    } finally {
      setSavingTemplate(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#141413]">Compose Email</h2>
          <p className="text-sm text-[#b0aea5] mt-0.5">
            Send announcements to member segments via Gmail.
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-[#faf9f5] border border-[#e8e6dc] rounded-lg px-3 py-1.5 shrink-0">
          <Mail size={12} className="text-[#b0aea5]" />
          <span className="text-xs text-[#555555]">via Gmail</span>
        </div>
      </div>

      {/* Template row */}
      {(templates.length > 0 || subject.trim() || body.trim()) && (
        <div className="flex items-center gap-2">
          <BookOpen size={13} className="text-[#b0aea5] shrink-0" />
          {templates.length > 0 ? (
            <div className="relative flex-1">
              <select
                defaultValue=""
                onChange={(e) => {
                  const t = templates.find((t) => t.id === e.target.value);
                  if (t) {
                    setSubject(t.subject);
                    setBody(t.body);
                  }
                  e.target.value = "";
                }}
                className="w-full appearance-none pl-3.5 pr-9 py-2 border border-[#e8e6dc] rounded-xl text-sm bg-white text-[#141413] focus:outline-none focus:border-[#d97757] focus:ring-2 focus:ring-[#d97757]/10 transition-shadow"
              >
                <option value="" disabled>
                  Load a saved template…
                </option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b0aea5] pointer-events-none"
              />
            </div>
          ) : (
            <span className="flex-1 text-xs text-[#b0aea5]">No saved templates yet.</span>
          )}
          <button
            onClick={() => setShowSaveModal(true)}
            disabled={!subject.trim() || !body.trim()}
            className="flex items-center gap-1.5 px-3 py-2 border border-[#e8e6dc] rounded-xl text-xs font-medium text-[#555555] hover:bg-[#faf9f5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <Save size={13} />
            Save template
          </button>
        </div>
      )}

      {/* Segment selector */}
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            { id: "all" as Segment, label: "All Members", icon: Users, desc: "Every registered member" },
            { id: "event" as Segment, label: "Event RSVPs", icon: Calendar, desc: "Attendees of a specific event" },
          ] as const
        ).map(({ id, label, icon: Icon, desc }) => (
          <button
            key={id}
            onClick={() => setSegment(id)}
            className={`relative flex flex-col items-start gap-2.5 p-4 rounded-2xl border-2 text-left transition-all ${
              segment === id
                ? "border-[#d97757] bg-[#d97757]/[0.04]"
                : "border-[#e8e6dc] bg-white hover:border-[#d97757]/40 hover:bg-[#faf9f5]"
            }`}
          >
            <div
              className={`p-2 rounded-lg transition-colors ${
                segment === id ? "bg-[#d97757]/15" : "bg-[#f0efe9]"
              }`}
            >
              <Icon size={15} className={segment === id ? "text-[#d97757]" : "text-[#b0aea5]"} />
            </div>
            <div>
              <p
                className={`text-sm font-semibold leading-none ${segment === id ? "text-[#d97757]" : "text-[#141413]"}`}
              >
                {label}
              </p>
              <p className="text-xs text-[#b0aea5] mt-1">{desc}</p>
            </div>
            {segment === id && (
              <div className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-[#d97757]" />
            )}
          </button>
        ))}
      </div>

      {/* Event picker */}
      {segment === "event" && (
        <div>
          {events.length === 0 ? (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <Calendar size={14} className="text-amber-500 shrink-0" />
              <p className="text-sm text-amber-700">
                No synced events found. Sync events from the Events tab first.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-[#555555] mb-1.5">
                Select event
              </label>
              <div className="relative">
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full appearance-none pl-3.5 pr-9 py-2.5 border border-[#e8e6dc] rounded-xl text-sm bg-white text-[#141413] focus:outline-none focus:border-[#d97757] focus:ring-2 focus:ring-[#d97757]/10 transition-shadow"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} — {new Date(ev.start).toLocaleDateString()}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b0aea5] pointer-events-none"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compose + Preview side-by-side */}
      <div className={showPreview ? "grid grid-cols-2 gap-5" : ""}>
        {/* Compose card */}
        <div className="bg-white rounded-2xl border border-[#e8e6dc] overflow-hidden flex flex-col min-h-84">
          {/* To row */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-[#e8e6dc] bg-[#faf9f5]">
            <span className="text-xs font-medium text-[#b0aea5] w-14 shrink-0">To</span>
            <span className="text-sm text-[#555555]">
              {segment === "all"
                ? "All Members (BCC)"
                : selectedEvent
                ? `RSVPs — ${selectedEvent.title} (BCC)`
                : "Select an event above"}
            </span>
            <span className="ml-auto text-xs text-[#b0aea5] shrink-0 tabular-nums">
              {countLoading ? (
                <Loader2 size={11} className="animate-spin inline" />
              ) : recipientCount !== null ? (
                `~${recipientCount} recipients`
              ) : null}
            </span>
          </div>

          {/* Subject row */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-[#e8e6dc]">
            <span className="text-xs font-medium text-[#b0aea5] w-14 shrink-0">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Club meeting this Thursday!"
              className="flex-1 text-sm text-[#141413] placeholder:text-[#c8c6bc] bg-transparent focus:outline-none"
            />
          </div>

          {/* Body */}
          <div className="flex-1 flex flex-col px-5 pt-4 pb-2 min-h-0">
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message here… supports **Markdown**"
              className="flex-1 w-full text-sm text-[#141413] placeholder:text-[#c8c6bc] bg-transparent resize-none focus:outline-none font-mono leading-relaxed"
            />
          </div>

          {/* Markdown toolbar */}
          <div className="flex items-center gap-0.5 px-3 py-2 border-t border-[#e8e6dc] bg-[#faf9f5]">
            {toolbarActions.map(({ icon: Icon, label, action }) => (
              <button
                key={label}
                type="button"
                title={label}
                onClick={action}
                className="p-1.5 rounded-md text-[#b0aea5] hover:text-[#141413] hover:bg-white transition-colors"
              >
                <Icon size={14} />
              </button>
            ))}
            <div className="w-px h-4 bg-[#e8e6dc] mx-1.5" />
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[10px] text-[#b0aea5] font-mono truncate">
                {"{{"}<span className="text-[#d97757]">name</span>{"}}"}
                {" · " + Object.keys(EMAIL_PROFILE_VAR_MAP).slice(1).map((k) => `{{${k}}}`).join(" · ")}
              </span>
              {segment === "event" && selectedEvent && (
                <span className="text-[10px] text-[#b0aea5] font-mono truncate">
                  {"{{eventTitle}} · {{eventDate}} · {{eventTime}} · {{eventLocation}} · {{eventDescription}}"}
                </span>
              )}
            </div>
            {hasUserVars && (
              <span className="ml-auto text-[10px] text-[#d97757] font-semibold px-2 py-0.5 bg-[#d97757]/10 rounded-full shrink-0">
                Per-recipient send
              </span>
            )}
          </div>

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-[#e8e6dc] bg-[#faf9f5]">
            <span className="text-xs text-[#b0aea5] tabular-nums">
              {body.length > 0 ? `${body.length} chars` : "Plain text · line breaks preserved"}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreview((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e8e6dc] text-xs font-medium text-[#555555] hover:bg-white transition-colors"
              >
                {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
                {showPreview ? "Hide preview" : "Preview"}
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !canSend}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#d97757] hover:bg-[#c86843] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                {sending ? "Sending…" : "Send Email"}
              </button>
            </div>
          </div>
        </div>

        {/* Preview panel */}
        {showPreview && (
          <div className="rounded-2xl border border-[#e8e6dc] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 bg-[#faf9f5] border-b border-[#e8e6dc] shrink-0">
              <p className="text-xs font-medium text-[#555555]">Email Preview</p>
              <p className="text-xs text-[#b0aea5]">Approximate rendering</p>
            </div>
            <div className="bg-[#eceae4] p-5 flex-1 overflow-y-auto">
              <div style={{ fontFamily: "sans-serif" }}>
                <div style={{ background: "#141413", padding: "22px 28px", borderRadius: "10px 10px 0 0" }}>
                  <p style={{ color: "#d97757", fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", margin: "0 0 5px" }}>
                    Claude Builder Club · Penn State
                  </p>
                  <h1 style={{ color: "white", margin: 0, fontSize: 20, fontWeight: 700, lineHeight: 1.3 }}>
                    {previewResolve(subject) || <span style={{ opacity: 0.35 }}>Your subject line</span>}
                  </h1>
                </div>
                <div style={{ background: "white", padding: "28px", border: "1px solid #e8e6dc", borderTop: "none", borderRadius: "0 0 10px 10px" }}>
                  {body ? (
                    <div
                      style={{ color: "#333", fontSize: 14, lineHeight: 1.75 }}
                      dangerouslySetInnerHTML={{
                        __html: marked.parse(previewResolve(body), { breaks: true }) as string,
                      }}
                    />
                  ) : (
                    <p style={{ color: "#333", fontSize: 14, opacity: 0.35 }}>Your message body…</p>
                  )}
                  <hr style={{ border: "none", borderTop: "1px solid #e8e6dc", margin: "22px 0 18px" }} />
                  <p style={{ color: "#b0aea5", fontSize: 12, margin: 0, lineHeight: 1.6 }}>
                    You&apos;re receiving this as a member of the Claude Builder Club at Penn State University.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm modal — "all members" only */}
      {showConfirm && (
        <Modal
          title="Send to all members?"
          onClose={() => setShowConfirm(false)}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                This will send an email to <strong>every registered member</strong>. This action
                cannot be undone.
              </p>
            </div>
            <div className="bg-[#faf9f5] rounded-xl border border-[#e8e6dc] px-4 py-3 space-y-1">
              <p className="text-xs text-[#b0aea5] font-medium uppercase tracking-wide">Subject</p>
              <p className="text-sm text-[#141413]">{subject}</p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-xl border border-[#e8e6dc] text-sm font-medium text-[#555555] hover:bg-[#faf9f5] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeSend}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#d97757] hover:bg-[#c86843] text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <Send size={14} />
                Yes, send to all
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Save template modal */}
      {showSaveModal && (
        <Modal
          title="Save as template"
          onClose={() => setShowSaveModal(false)}
          maxWidth="max-w-sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#555555] mb-1.5">
                Template name
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveTemplate()}
                placeholder="e.g. Monthly Reminder"
                autoFocus
                className="w-full px-3.5 py-2.5 border border-[#e8e6dc] rounded-xl text-sm text-[#141413] focus:outline-none focus:border-[#d97757] focus:ring-2 focus:ring-[#d97757]/10"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 rounded-xl border border-[#e8e6dc] text-sm font-medium text-[#555555] hover:bg-[#faf9f5] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={savingTemplate || !templateName.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#d97757] hover:bg-[#c86843] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {savingTemplate ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Result */}
      {result && (
        <div
          className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border text-sm ${
            "ok" in result
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {"ok" in result ? (
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          ) : (
            <XCircle size={16} className="shrink-0 mt-0.5" />
          )}
          {"ok" in result
            ? `Sent successfully to ${result.count} recipient${result.count !== 1 ? "s" : ""}.`
            : result.error}
        </div>
      )}

      {/* Recent sends */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-semibold text-[#141413]">Recent Sends</h3>
        {logsLoading ? (
          <div className="flex items-center gap-2 text-sm text-[#b0aea5]">
            <Loader2 size={14} className="animate-spin" />
            Loading…
          </div>
        ) : emailLogs.length === 0 ? (
          <p className="text-sm text-[#b0aea5]">No emails sent yet.</p>
        ) : (
          <div className="space-y-2">
            {emailLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-xl border border-[#e8e6dc] px-4 py-3 flex items-start justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#141413] truncate">{log.subject}</p>
                  <p className="text-xs text-[#b0aea5] mt-0.5 truncate">
                    {log.segment} · {log.recipientCount} recipient{log.recipientCount !== 1 ? "s" : ""}
                    {log.isScheduled && (
                      <span className="ml-2 text-[#d97757] font-medium">· Scheduled</span>
                    )}
                  </p>
                </div>
                <span className="text-xs text-[#b0aea5] shrink-0 whitespace-nowrap">
                  {timeAgo(log.sentAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
