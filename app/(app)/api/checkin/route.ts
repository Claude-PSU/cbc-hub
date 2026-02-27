import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  try {
    // Verify the user's Firebase ID token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }
    const idToken = authHeader.split("Bearer ")[1];
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email ?? "";

    const { eventId } = await request.json();
    if (!eventId || typeof eventId !== "string") {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    const db = getAdminDb();

    // Fetch the event
    const eventDoc = await db.collection("events").doc(eventId).get();
    if (!eventDoc.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    const eventData = eventDoc.data()!;

    // Check if check-in is open
    if (eventData.checkInOpen === false) {
      return NextResponse.json({ error: "Check-in is not currently open for this event" }, { status: 403 });
    }

    // Check if already checked in
    const existingDoc = await db.collection("attendance").doc(eventId).collection("checkins").doc(uid).get();
    if (existingDoc.exists) {
      // Already checked in — still generate a redirect token
      const token = generateToken();
      await db.collection("checkInTokens").doc(token).set({
        eventId,
        uid,
        createdAt: FieldValue.serverTimestamp(),
        used: false,
      });
      return NextResponse.json({ status: "already_in", token });
    }

    // Get display name from members doc if it exists, fall back to auth display name
    let displayName = decoded.name ?? "";
    const memberDoc = await db.collection("members").doc(uid).get();
    if (memberDoc.exists) {
      displayName = memberDoc.data()?.displayName ?? displayName;
    }

    const now = new Date().toISOString();
    const record = {
      uid,
      displayName,
      email,
      checkedInAt: now,
      eventId,
      eventTitle: eventData.title ?? "",
      eventStart: eventData.start ?? "",
    };

    // Write attendance record + user's own subcollection + redirect token in parallel
    const token = generateToken();
    await Promise.all([
      db.collection("attendance").doc(eventId).collection("checkins").doc(uid).set(record),
      db.collection("members").doc(uid).collection("attendance").doc(eventId).set(record),
      db.collection("checkInTokens").doc(token).set({
        eventId,
        uid,
        createdAt: FieldValue.serverTimestamp(),
        used: false,
      }),
    ]);

    return NextResponse.json({ status: "success", token });
  } catch (err) {
    console.error("Check-in API error:", err);
    return NextResponse.json(
      { error: "Check-in failed. Please try again." },
      { status: 500 }
    );
  }
}

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
