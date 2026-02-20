import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

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
        return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
      }
    }
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
