import { getAdminDb } from "@/lib/firebase-admin";
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
    const expiresAt = createdAt.getTime() + 5 * 60 * 1000;
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

    // Redirect to the form page, passing the real destination via a short-lived HttpOnly cookie.
    // This keeps the true URL server-side only — it never appears in the browser address bar.
    const formPageUrl = new URL(`/checkin/${eventId}/form`, request.url);
    const response = NextResponse.redirect(formPageUrl);
    response.cookies.set("checkin_dest", safeRedirect, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30, // 30-second window to load the form page
      path: `/checkin/${eventId}/form`,
    });
    return response;
  } catch (error) {
    console.error("Redirect error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
