"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { StoredEvent } from "@/lib/types";
import { CheckCircle, Loader2, AlertCircle, Calendar, MapPin, Clock } from "lucide-react";
import ClubLogo from "@/components/ClubLogo";
import Link from "next/link";

type CheckInState =
  | "loading"        // determining auth / fetching event
  | "checking_in"    // writing to Firestore
  | "success"        // wrote successfully
  | "already_in"    // already checked in
  | "event_not_found"
  | "checkin_closed" // check-in is not currently open
  | "error";

function formatEventTime(start: string, isAllDay: boolean): string {
  if (isAllDay) return new Date(start).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const d = new Date(start);
  const date = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} at ${time}`;
}

function CheckInForm() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventId = params.eventId as string;
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";
  // Allow relative paths (/dashboard) or absolute http(s) URLs (external forms, etc.)
  // Fall back to /dashboard for anything that doesn't match either shape.
  const isRelative = redirectTo.startsWith("/");
  const isAbsolute = redirectTo.startsWith("https://") || redirectTo.startsWith("http://");
  const safeRedirect = isRelative || isAbsolute ? redirectTo : "/dashboard";

  const [state, setState] = useState<CheckInState>("loading");
  const [event, setEvent] = useState<StoredEvent | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  // Guard against React StrictMode double-invocation and auth re-fires
  const hasRun = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (hasRun.current) return;
      hasRun.current = true;
      if (!user) {
        // Redirect to auth, preserving the full check-in URL as the ?next= param
        const next = encodeURIComponent(`/checkin/${eventId}?redirect=${encodeURIComponent(safeRedirect)}`);
        router.replace(`/auth?next=${next}`);
        return;
      }

      try {
        // Fetch the event to display its name and to denormalize into the record
        const eventSnap = await getDoc(doc(db, "events", eventId));
        if (!eventSnap.exists()) {
          setState("event_not_found");
          return;
        }
        const eventData = { id: eventSnap.id, ...eventSnap.data() } as StoredEvent;
        setEvent(eventData);

        // Check if check-in is open for this event
        if (eventData.checkInOpen === false) {
          setState("checkin_closed");
          return;
        }

        setState("checking_in");

        // Call server-side API which uses Admin SDK (bypasses Firestore rules)
        // This allows users without a members doc to still check in
        const idToken = await user.getIdToken();
        const res = await fetch("/api/checkin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ eventId }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (res.status === 403) {
            setState("checkin_closed");
            return;
          }
          throw new Error(data.error || "Check-in failed");
        }

        const token = data.token as string;

        if (data.status === "already_in") {
          setState("already_in");
        } else {
          setState("success");
        }

        console.log("✓ Check-in successful. Token created:", token.substring(0, 8) + "...");
        setTimeout(() => {
          console.log("→ Redirecting to token validation endpoint...");
          window.location.replace(`/api/checkin-redirect?token=${token}&eventId=${eventId}`);
        }, 2500);
      } catch (err) {
        console.error("Check-in error:", err);
        setErrorMsg((err as Error).message ?? "Something went wrong.");
        setState("error");
      }
    });
    return unsub;
  }, [eventId, safeRedirect, router]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (state === "loading" || state === "checking_in") {
    return (
      <div className="min-h-screen bg-[#faf9f5] flex flex-col items-center justify-center gap-4 px-4">
        <Loader2 size={32} className="animate-spin text-[#d97757]" />
        <p className="text-sm text-[#b0aea5]">
          {state === "checking_in" ? "Recording your check-in…" : "Loading…"}
        </p>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  if (state === "success" || state === "already_in") {
    return (
      <div className="min-h-screen bg-[#faf9f5] flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-16 h-16 bg-[#788c5d]/10 rounded-full flex items-center justify-center">
          <CheckCircle size={32} className="text-[#788c5d]" />
        </div>
        <div className="text-center">
          <h1 className="heading text-2xl font-bold text-[#141413] mb-1">
            {state === "already_in" ? "Already Checked In!" : "You're checked in!"}
          </h1>
          {event && (
            <p className="text-sm text-[#555555] font-medium mt-1">{event.title}</p>
          )}
          {event && (
            <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
              <span className="text-xs text-[#b0aea5] flex items-center gap-1">
                <Clock size={11} />
                {formatEventTime(event.start, event.isAllDay)}
              </span>
              {event.location && (
                <span className="text-xs text-[#b0aea5] flex items-center gap-1">
                  <MapPin size={11} />
                  {event.location}
                </span>
              )}
            </div>
          )}
          <p className="text-xs text-[#b0aea5] mt-4">Redirecting you in a moment…</p>
        </div>
        <Link
          href={safeRedirect}
          className="text-sm font-medium text-[#d97757] hover:underline flex items-center gap-1"
        >
          Continue now
        </Link>
      </div>
    );
  }

  // ── Event not found ──────────────────────────────────────────────────────────
  if (state === "event_not_found") {
    return (
      <div className="min-h-screen bg-[#faf9f5] flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center">
          <Calendar size={28} className="text-amber-500" />
        </div>
        <div className="text-center">
          <h1 className="heading text-xl font-bold text-[#141413] mb-2">Event Not Found</h1>
          <p className="text-sm text-[#b0aea5] max-w-xs">
            This QR code may be outdated. Ask an admin to re-sync events and regenerate the QR code.
          </p>
        </div>
        <Link href="/dashboard" className="text-sm font-medium text-[#d97757] hover:underline">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  // ── Check-in closed ────────────────────────────────────────────────────────────
  if (state === "checkin_closed") {
    return (
      <div className="min-h-screen bg-[#faf9f5] flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center">
          <AlertCircle size={28} className="text-amber-500" />
        </div>
        <div className="text-center">
          <h1 className="heading text-xl font-bold text-[#141413] mb-2">Check-In Not Open</h1>
          <p className="text-sm text-[#b0aea5] max-w-xs">
            Check-in for this event is not currently open. Please try again later.
          </p>
          {event && (
            <p className="text-sm text-[#555555] font-medium mt-3">{event.title}</p>
          )}
        </div>
        <Link href="/dashboard" className="text-sm font-medium text-[#d97757] hover:underline">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#faf9f5] flex flex-col items-center justify-center gap-6 px-4">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
        <AlertCircle size={28} className="text-red-500" />
      </div>
      <div className="text-center">
        <h1 className="heading text-xl font-bold text-[#141413] mb-2">Check-In Failed</h1>
        <p className="text-sm text-[#b0aea5] max-w-xs">{errorMsg || "An unexpected error occurred. Please try again."}</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => window.location.reload()}
          className="text-sm font-medium text-[#d97757] hover:underline"
        >
          Retry
        </button>
        <span className="text-[#e8e6dc]">·</span>
        <Link href="/dashboard" className="text-sm font-medium text-[#b0aea5] hover:underline">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default function CheckInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#faf9f5]" />}>
      <CheckInForm />
    </Suspense>
  );
}
