import { createHash, randomInt } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

const CODE_TTL_MS = 10 * 60 * 1000;

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function sendVerificationCode(uid: string, email: string) {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const now = Date.now();

  await getAdminDb()
    .collection("emailVerificationCodes")
    .doc(uid)
    .set({
      codeHash: sha256(code),
      expiresAt: Timestamp.fromMillis(now + CODE_TTL_MS),
      createdAt: Timestamp.fromMillis(now),
    });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
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
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Claude Builder Club" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `${code} — your Claude Builder Club verification code`,
    text: `Your verification code is: ${code}\n\nIt expires in 10 minutes.`,
    html,
  });
}

export async function POST(req: NextRequest) {
  let email: string | undefined;
  let password: string | undefined;

  try {
    ({ email, password } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // ── Server-side domain enforcement ────────────────────────────────────────
  if (!email || !email.toLowerCase().endsWith("@psu.edu")) {
    return NextResponse.json(
      { error: "Sign-up is restricted to Penn State email addresses (@psu.edu)." },
      { status: 403 }
    );
  }

  if (!password || password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }

  try {
    const adminAuth = getAdminAuth();

    // Create the user via Admin SDK — bypasses client-side SDK entirely
    const userRecord = await adminAuth.createUser({ email, password });

    // Return a custom token so the client can sign in with signInWithCustomToken()
    const customToken = await adminAuth.createCustomToken(userRecord.uid);

    // Generate and send OTP — non-blocking so email issues don't fail registration
    sendVerificationCode(userRecord.uid, email).catch((err) =>
      console.error("Failed to send verification email:", err)
    );

    return NextResponse.json({ customToken });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err) {
      const code = (err as { code: string }).code;
      if (code === "auth/email-already-exists") {
        return NextResponse.json(
          { error: "An account with this email already exists. Try signing in instead." },
          { status: 409 }
        );
      }
      if (code === "auth/invalid-email") {
        return NextResponse.json(
          { error: "Invalid email address. Please check and try again." },
          { status: 400 }
        );
      }
      if (code === "auth/invalid-password") {
        return NextResponse.json(
          { error: "Password does not meet security requirements. Use at least 6 characters." },
          { status: 400 }
        );
      }
    }
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: "Registration failed. Please try again later or contact support." },
      { status: 500 }
    );
  }
}
