import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

type Segment = "all" | { eventId: string };

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const memberDoc = await db.collection("members").doc(uid).get();
  if (!memberDoc.exists || !memberDoc.data()?.isAdmin) {
    return NextResponse.json({ error: "Forbidden: admins only." }, { status: 403 });
  }

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

  // ── Collect recipients ────────────────────────────────────────────────────
  let emails: string[] = [];

  if (segment === "all") {
    const snap = await db.collection("members").get();
    emails = snap.docs
      .map((d) => d.data().email as string | undefined)
      .filter((e): e is string => !!e);
  } else if (segment && typeof segment === "object" && segment.eventId) {
    const snap = await db
      .collection("rsvps")
      .doc(segment.eventId)
      .collection("attendees")
      .get();
    emails = snap.docs
      .map((d) => d.data().email as string | undefined)
      .filter((e): e is string => !!e);
  } else {
    return NextResponse.json({ error: "Invalid segment." }, { status: 400 });
  }

  // Deduplicate
  emails = [...new Set(emails)];

  if (emails.length === 0) {
    return NextResponse.json({ error: "No recipients found for that segment." }, { status: 400 });
  }

  // ── Send via Nodemailer ───────────────────────────────────────────────────
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const escapedBody = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#141413;padding:24px 32px;border-radius:12px 12px 0 0">
        <p style="color:#d97757;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin:0 0 6px">Claude Builder Club · Penn State</p>
        <h1 style="color:white;margin:0;font-size:22px;font-weight:700;line-height:1.3">${subject}</h1>
      </div>
      <div style="background:white;padding:32px;border:1px solid #e8e6dc;border-top:none;border-radius:0 0 12px 12px">
        <div style="color:#333;font-size:14px;line-height:1.7;white-space:pre-wrap">${escapedBody}</div>
        <hr style="border:none;border-top:1px solid #e8e6dc;margin:28px 0 20px"/>
        <p style="color:#b0aea5;font-size:12px;margin:0;line-height:1.6">
          You're receiving this as a member of the Claude Builder Club at Penn State University.<br/>
          Questions? Reply to this email or visit
          <a href="https://claudepsu.vercel.app" style="color:#d97757;text-decoration:none">our website</a>.
        </p>
      </div>
    </div>
  `;

  // Send as a single email with all recipients BCC'd to protect privacy
  await transporter.sendMail({
    from: `"Claude Builder Club" <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER,
    bcc: emails.join(", "),
    subject: subject.trim(),
    text: body.trim(),
    html,
  });

  return NextResponse.json({ ok: true, count: emails.length });
}
