import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let adminAuth: ReturnType<typeof getAdminAuth>;
  try {
    adminAuth = getAdminAuth();
  } catch (err) {
    console.error("Firebase Admin SDK initialization failed:", err);
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const db = getAdminDb();
    const memberDoc = await db.collection("members").doc(decoded.uid).get();
    if (!memberDoc.exists || !memberDoc.data()?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Count ──────────────────────────────────────────────────────────────────
  const db = getAdminDb();
  const { searchParams } = new URL(req.url);
  const segmentParam = searchParams.get("segment");
  const eventId = searchParams.get("eventId");

  try {
    if (segmentParam === "all") {
      const snap = await db.collection("members").count().get();
      return NextResponse.json({ count: snap.data().count });
    } else if (segmentParam === "event" && eventId) {
      const snap = await db
        .collection("rsvps")
        .doc(eventId)
        .collection("attendees")
        .count()
        .get();
      return NextResponse.json({ count: snap.data().count });
    } else {
      return NextResponse.json({ error: "Invalid segment." }, { status: 400 });
    }
  } catch (err) {
    console.error("email-recipient-count error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
