import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { marked } from "marked";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { EMAIL_PROFILE_VAR_MAP } from "@/lib/types";

type Segment = "all" | { eventId: string };

interface RecipientProfile {
  email: string;
  displayName: string;
  major: string;
  year: string;
  college: string;
  techLevel: string;
}

/** Matches any user-specific template variable — drives per-recipient vs. BCC decision. */
const USER_VAR_REGEX = new RegExp(
  `\\{\\{(${Object.keys(EMAIL_PROFILE_VAR_MAP).join("|")})\\}\\}`
);

function resolveProfileVars(template: string, profile: RecipientProfile): string {
  return (Object.entries(EMAIL_PROFILE_VAR_MAP) as [string, keyof RecipientProfile][]).reduce(
    (t, [varName, field]) =>
      t.replace(new RegExp(`\\{\\{${varName}\\}\\}`, "g"), profile[field] || ""),
    template
  );
}

function resolveEventVars(
  template: string,
  ev: FirebaseFirestore.DocumentData
): string {
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const timeRange = ev.isAllDay
    ? "All Day"
    : `${fmtTime(ev.start)} – ${fmtTime(ev.end)}`;

  return template
    .replace(/\{\{eventTitle\}\}/g, ev.title || "")
    .replace(/\{\{eventDate\}\}/g, ev.start ? fmtDate(ev.start) : "")
    .replace(/\{\{eventTime\}\}/g, ev.start ? timeRange : "")
    .replace(/\{\{eventLocation\}\}/g, ev.location || "")
    .replace(/\{\{eventDescription\}\}/g, ev.description || "");
}

function buildHtml(resolvedSubject: string, resolvedBody: string): string {
  const bodyHtml = marked.parse(resolvedBody, { breaks: true }) as string;
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#141413;padding:24px 32px;border-radius:12px 12px 0 0">
        <p style="color:#d97757;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin:0 0 6px">Claude Builder Club · Penn State</p>
        <h1 style="color:white;margin:0;font-size:22px;font-weight:700;line-height:1.3">${resolvedSubject}</h1>
      </div>
      <div style="background:white;padding:32px;border:1px solid #e8e6dc;border-top:none;border-radius:0 0 12px 12px">
        <div style="color:#333;font-size:14px;line-height:1.7">${bodyHtml}</div>
        <hr style="border:none;border-top:1px solid #e8e6dc;margin:28px 0 20px"/>
        <p style="color:#b0aea5;font-size:12px;margin:0;line-height:1.6">
          You're receiving this as a member of the Claude Builder Club at Penn State University.<br/>
          Questions? Reply to this email or visit
          <a href="https://claudepsu.vercel.app" style="color:#d97757;text-decoration:none">our website</a>.
        </p>
      </div>
    </div>
  `;
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Initialize outside try/catch so SDK config errors surface as 500, not 401.
  let adminAuth: ReturnType<typeof getAdminAuth>;
  try {
    adminAuth = getAdminAuth();
  } catch (err) {
    console.error("Firebase Admin SDK initialization failed:", err);
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  // Reused below for the email log displayName — no extra read needed.
  const memberDoc = await db.collection("members").doc(uid).get();
  if (!memberDoc.exists || !memberDoc.data()?.isAdmin) {
    return NextResponse.json({ error: "Forbidden: admins only." }, { status: 403 });
  }
  const adminDisplayName: string = memberDoc.data()?.displayName || "Admin";

  // ── Payload ───────────────────────────────────────────────────────────────
  let subject: string;
  let body: string;
  let segment: Segment;

  try {
    ({ subject, body, segment } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Missing subject or body." }, { status: 400 });
  }

  subject = subject.trim();
  body = body.trim();

  // ── Resolve event variables & build segment label ────────────────────────
  // Event vars ({{eventTitle}}, {{eventDate}}, etc.) are identical for every
  // recipient, so we substitute them up-front. Only the remaining
  // user-specific vars ({{name}}, {{major}}, …) require per-recipient sends.
  let workingSubject = subject;
  let workingBody = body;
  let segmentLabel = "All Members";

  if (segment !== "all" && typeof segment === "object" && segment.eventId) {
    const eventDoc = await db.collection("events").doc(segment.eventId).get();
    const ev = eventDoc.data();
    segmentLabel = `RSVPs — ${ev?.title || segment.eventId}`;
    if (ev) {
      workingSubject = resolveEventVars(workingSubject, ev);
      workingBody = resolveEventVars(workingBody, ev);
    }
  } else if (segment !== "all") {
    return NextResponse.json({ error: "Invalid segment." }, { status: 400 });
  }

  // ── Detect remaining user-specific variables ───────────────────────────────
  const hasUserVars = USER_VAR_REGEX.test(workingSubject) || USER_VAR_REGEX.test(workingBody);

  // ── Collect recipients ────────────────────────────────────────────────────
  let recipients: RecipientProfile[] = [];

  const toProfile = (data: FirebaseFirestore.DocumentData): RecipientProfile | null =>
    data.email
      ? {
          email: data.email as string,
          displayName: data.displayName || "",
          major: data.major || "",
          year: data.year || "",
          college: data.college || "",
          techLevel: data.techLevel || "",
        }
      : null;

  if (segment === "all") {
    const snap = await db.collection("members").get();
    recipients = snap.docs
      .map((d) => toProfile(d.data()))
      .filter((r): r is RecipientProfile => r !== null);
  } else {
    // segment.eventId already validated above
    const eventId = (segment as { eventId: string }).eventId;
    const attendeesSnap = await db
      .collection("rsvps")
      .doc(eventId)
      .collection("attendees")
      .get();

    if (!hasUserVars) {
      // Fast path — attendees subcollection already has email
      recipients = attendeesSnap.docs
        .map((d) => toProfile(d.data()))
        .filter((r): r is RecipientProfile => r !== null);
    } else {
      // Need full profiles for user-var resolution
      const profileDocs = await Promise.all(
        attendeesSnap.docs.map((d) => db.collection("members").doc(d.id).get())
      );
      recipients = profileDocs
        .map((d) => (d.exists ? toProfile(d.data()!) : null))
        .filter((r): r is RecipientProfile => r !== null);
    }
  }

  // Deduplicate by email
  const deduped = [...new Map(recipients.map((r) => [r.email, r])).values()];

  if (deduped.length === 0) {
    return NextResponse.json({ error: "No recipients found for that segment." }, { status: 400 });
  }

  // ── Stream progress back to the client ───────────────────────────────────
  // Each chunk is a newline-terminated JSON object so the client can parse
  // incrementally without waiting for the full response body.
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const write = (obj: object) =>
        controller.enqueue(enc.encode(JSON.stringify(obj) + "\n"));

      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });

        const total = deduped.length;
        write({ type: "start", total });

        if (hasUserVars) {
          // Per-recipient sends — batched concurrency to avoid serial SMTP latency
          // without flooding Gmail's connection pool.
          const BATCH = 10;
          let sent = 0;
          for (let i = 0; i < deduped.length; i += BATCH) {
            await Promise.all(
              deduped.slice(i, i + BATCH).map((r) => {
                const resolvedSubject = resolveProfileVars(workingSubject, r);
                const resolvedBody = resolveProfileVars(workingBody, r);
                return transporter.sendMail({
                  from: `"Claude Builder Club" <${process.env.GMAIL_USER}>`,
                  to: r.email,
                  subject: resolvedSubject,
                  text: resolvedBody,
                  html: buildHtml(resolvedSubject, resolvedBody),
                });
              })
            );
            sent += Math.min(BATCH, deduped.length - i);
            write({ type: "progress", sent, total });
          }
        } else {
          // BCC send — Gmail caps total recipients (To + BCC) at 100 per message,
          // so batch in chunks of 99 to leave one slot for the To address.
          const BCC_BATCH = 99;
          const emails = deduped.map((r) => r.email);
          const html = buildHtml(workingSubject, workingBody);
          let sent = 0;
          for (let i = 0; i < emails.length; i += BCC_BATCH) {
            await transporter.sendMail({
              from: `"Claude Builder Club" <${process.env.GMAIL_USER}>`,
              to: process.env.GMAIL_USER,
              bcc: emails.slice(i, i + BCC_BATCH).join(", "),
              subject: workingSubject,
              text: workingBody,
              html,
            });
            sent += Math.min(BCC_BATCH, emails.length - i);
            write({ type: "progress", sent, total });
          }
        }

        await db.collection("emailLogs").add({
          subject,
          bodyExcerpt: body.slice(0, 120),
          segment: segmentLabel,
          recipientCount: deduped.length,
          sentAt: new Date().toISOString(),
          sentBy: uid,
          displayName: adminDisplayName,
          isScheduled: false,
        });

        write({ type: "done", count: deduped.length });
      } catch (err) {
        write({ type: "error", error: (err as Error).message || "Send failed." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
