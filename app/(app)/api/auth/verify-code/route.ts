import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

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
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Payload ────────────────────────────────────────────────────────────────
  let code: string;
  try {
    ({ code } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "Invalid code format. Please enter 6 digits." },
      { status: 400 }
    );
  }

  const db = getAdminDb();
  const codeRef = db.collection("emailVerificationCodes").doc(uid);
  const snap = await codeRef.get();

  if (!snap.exists) {
    return NextResponse.json(
      { error: "No verification code found. Please request a new one." },
      { status: 404 }
    );
  }

  const { codeHash, expiresAt } = snap.data() as {
    codeHash: string;
    expiresAt: Timestamp;
  };

  if (expiresAt.toMillis() < Date.now()) {
    return NextResponse.json(
      { error: "Code has expired. A new one has been sent to your email." },
      { status: 410 }
    );
  }

  if (sha256(code) !== codeHash) {
    return NextResponse.json(
      { error: "Incorrect code. Please check and try again." },
      { status: 400 }
    );
  }

  // ── Mark verified ──────────────────────────────────────────────────────────
  await Promise.all([
    codeRef.delete(),
    db.collection("members").doc(uid).set(
      { emailPasswordAccountVerified: true },
      { merge: true }
    ),
  ]);

  return NextResponse.json({ ok: true });
}
