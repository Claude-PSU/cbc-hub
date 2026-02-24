import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");
  const eventId = searchParams.get("eventId");

  if (!token || !eventId) {
    return NextResponse.json({ error: "Missing token or eventId" }, { status: 400 });
  }

  try {
    const db = getAdminDb();

    // Look up the token in Firestore
    const tokenRef = db.collection("checkInTokens").doc(token);
    const tokenDoc = await tokenRef.get();

    if (!tokenDoc.exists) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const tokenData = tokenDoc.data();
    if (!tokenData) {
      return NextResponse.json({ error: "Invalid token data" }, { status: 401 });
    }

    // Verify token hasn't been used
    if (tokenData.used === true) {
      return NextResponse.json({ error: "Token already used" }, { status: 401 });
    }

    // Verify token hasn't expired (TTL is 5 minutes)
    const createdAt = tokenData.createdAt.toDate();
    const expiresAt = createdAt.getTime() + 5 * 60 * 1000; // 5 minutes
    if (Date.now() > expiresAt) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }

    // Verify eventId matches
    if (tokenData.eventId !== eventId) {
      return NextResponse.json({ error: "Token/event mismatch" }, { status: 401 });
    }

    // Mark token as used atomically
    await tokenRef.update({ used: true });

    // Get the redirect URL from the event
    const eventDoc = await db.collection("events").doc(eventId).get();
    if (!eventDoc.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const eventData = eventDoc.data();
    const redirectUrl = eventData?.qrRedirectUrl;
    if (!redirectUrl) {
      return NextResponse.json({ error: "No redirect URL configured" }, { status: 404 });
    }

    // Validate redirect URL
    const isRelative = redirectUrl.startsWith("/");
    const isAbsolute = redirectUrl.startsWith("https://") || redirectUrl.startsWith("http://");
    const safeRedirect = (isRelative || isAbsolute) ? redirectUrl : "/dashboard";

    return NextResponse.redirect(safeRedirect);
  } catch (error) {
    console.error("Redirect error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
