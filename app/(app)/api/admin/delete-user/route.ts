import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export const revalidate = 0;

export async function DELETE(request: NextRequest) {
  try {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const idToken = authHeader.slice(7);

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const callerUid = decodedToken.uid;

    const callerDocSnapshot = await adminDb.doc(`members/${callerUid}`).get();
    const callerData = callerDocSnapshot.data() as { isAdmin?: boolean } | undefined;

    if (!callerData?.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: user is not an admin" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const targetUid = body.uid;

    if (!targetUid || typeof targetUid !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid uid in request body" },
        { status: 400 }
      );
    }

    if (targetUid === callerUid) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Delete Firebase Auth account
    await adminAuth.deleteUser(targetUid);

    // Delete Firestore member document
    await adminDb.doc(`members/${targetUid}`).delete();

    // Clean up RSVPs across all events
    const rsvpsSnap = await adminDb.collection("rsvps").listDocuments();
    await Promise.all(
      rsvpsSnap.map((eventRef) =>
        adminDb.doc(`rsvps/${eventRef.id}/attendees/${targetUid}`).delete().catch(() => {})
      )
    );

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
