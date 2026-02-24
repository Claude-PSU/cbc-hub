import { createHash, randomInt } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MS = 60 * 1000;    // 60 seconds between sends

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let uid: string;
  let email: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email ?? "";
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isPsuEmail = email.toLowerCase().endsWith("@psu.edu");
  const devBypass = process.env.ALLOW_ANY_EMAIL === "true" && process.env.NODE_ENV !== "production";
  if (!isPsuEmail && !devBypass) {
    return NextResponse.json(
      { error: "Verification codes are only sent to Penn State email accounts (@psu.edu)." },
      { status: 400 }
    );
  }

  const db = getAdminDb();
  const codeRef = db.collection("emailVerificationCodes").doc(uid);

  // ── Rate limit ─────────────────────────────────────────────────────────────
  const existing = await codeRef.get();
  if (existing.exists) {
    const createdAt = (existing.data()!.createdAt as Timestamp).toMillis();
    if (Date.now() - createdAt < RATE_LIMIT_MS) {
      const waitSec = Math.ceil((RATE_LIMIT_MS - (Date.now() - createdAt)) / 1000);
      return NextResponse.json(
        { error: `Please wait ${waitSec} seconds before requesting another code.` },
        { status: 429 }
      );
    }
  }

  // ── Generate and store code ────────────────────────────────────────────────
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const now = Date.now();
  await codeRef.set({
    codeHash: sha256(code),
    expiresAt: Timestamp.fromMillis(now + CODE_TTL_MS),
    createdAt: Timestamp.fromMillis(now),
  });

  // ── Send email ─────────────────────────────────────────────────────────────
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <div style="background:#141413;padding:24px 32px;border-radius:12px 12px 0 0">
        <p style="color:#d97757;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin:0 0 6px">Claude Builder Club · Penn State</p>
        <h1 style="color:white;margin:0;font-size:22px;font-weight:700;line-height:1.3">Verify your email</h1>
      </div>
      <div style="background:white;padding:32px;border:1px solid #e8e6dc;border-top:none;border-radius:0 0 12px 12px">
        <p style="color:#333;font-size:14px;line-height:1.7;margin:0 0 24px">
          Use the code below to verify your Penn State email address. It expires in <strong>10 minutes</strong>.
        </p>
        <div style="background:#faf9f5;border:1px solid #e8e6dc;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
          <span style="font-size:36px;font-weight:700;letter-spacing:.25em;color:#141413;font-family:monospace">${code}</span>
        </div>
        <p style="color:#b0aea5;font-size:12px;margin:0;line-height:1.6">
          If you didn't request this, you can safely ignore this email.<br/>
          Questions? Visit <a href="https://claudepsu.vercel.app" style="color:#d97757;text-decoration:none">our website</a>.
        </p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Claude Builder Club" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `${code} — your Claude Builder Club verification code`,
      text: `Your verification code is: ${code}\n\nIt expires in 10 minutes. If you didn't request this, ignore this email.`,
      html,
    });
  } catch (mailErr) {
    console.error("Failed to send verification email:", mailErr);
    return NextResponse.json(
      { error: "Failed to send verification code. Please try again in a moment." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
