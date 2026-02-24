/**
 * test-auth-user.mjs
 *
 * Creates (or reuses) a Firebase Auth user and injects a stub members/{uid}
 * document into Firestore so the app treats them as a fully onboarded member.
 * Useful for testing authenticated flows without going through /settings.
 *
 * Usage:
 *   node --env-file=.env.local scripts/test-auth-user.mjs --email you@psu.edu
 *
 * Options:
 *   --email          Required. The email to register/reuse.
 *   --password       Account password.              (default: "testpassword123")
 *   --name           Stub display name.             (default: "Test User")
 *   --major          Stub major.                    (default: "Computer Science")
 *   --year           Stub year.                     (default: "Junior")
 *   --college        Stub college.                  (default: "IST")
 *   --tech-level     Stub tech level.               (default: "intermediate")
 *   --admin          Set isAdmin: true on the stub. (default: false)
 *   --unverified     Set emailPasswordAccountVerified: false and inject a known
 *                    OTP code so you can test the /verify-email UI without
 *                    needing a real email send or a @psu.edu address.
 *   --code           OTP to inject when --unverified is set. (default: "000000")
 *   --delete         Delete the user + Firestore docs instead of creating.
 *
 * Requires: FIREBASE_SERVICE_ACCOUNT_KEY in .env.local
 */

import { createHash } from "crypto";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// ── Bootstrap Firebase Admin ─────────────────────────────────────────────────

function initAdmin() {
  if (getApps().length > 0) return;
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    console.error("❌  FIREBASE_SERVICE_ACCOUNT_KEY is not set in .env.local");
    process.exit(1);
  }
  const json = key.startsWith("{") ? key : Buffer.from(key, "base64").toString("utf8");
  initializeApp({ credential: cert(JSON.parse(json)) });
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

// ── Arg parsing ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getArg(flag, fallback = undefined) {
  const i = args.indexOf(flag);
  if (i !== -1 && args[i + 1] !== undefined) return args[i + 1];
  return fallback;
}

const email      = getArg("--email");
const password   = getArg("--password", "testpassword123");
const name       = getArg("--name", "Test User");
const major      = getArg("--major", "Computer Science");
const year       = getArg("--year", "Junior");
const college    = getArg("--college", "IST");
const techLevel  = getArg("--tech-level", "intermediate");
const isAdmin    = args.includes("--admin");
const unverified = args.includes("--unverified");
const otpCode    = getArg("--code", "000000");
const doDelete   = args.includes("--delete");

if (!email) {
  console.error(
    "Usage: node --env-file=.env.local scripts/test-auth-user.mjs --email <email> [options]"
  );
  process.exit(1);
}

if (unverified && !/^\d{6}$/.test(otpCode)) {
  console.error("❌  --code must be exactly 6 digits (e.g. 000000)");
  process.exit(1);
}

// ── Main ─────────────────────────────────────────────────────────────────────

initAdmin();
const auth = getAuth();
const db   = getFirestore();

// ── Delete mode ──────────────────────────────────────────────────────────────

if (doDelete) {
  let uid;
  try {
    const user = await auth.getUserByEmail(email);
    uid = user.uid;
  } catch {
    console.error("❌  User not found in Firebase Auth.");
    process.exit(1);
  }

  await auth.deleteUser(uid);
  console.log(`✅  Deleted from Firebase Auth (uid: ${uid})`);

  const batch = db.batch();
  batch.delete(db.collection("members").doc(uid));
  batch.delete(db.collection("emailVerificationCodes").doc(uid));
  await batch.commit();
  console.log("✅  Cleaned up members and emailVerificationCodes docs");
  process.exit(0);
}

// ── Create or reuse Firebase Auth user ───────────────────────────────────────

let uid;
let action;

try {
  const existing = await auth.getUserByEmail(email);
  uid    = existing.uid;
  action = "reused";
  await auth.updateUser(uid, { password });
  console.log(`\nℹ️   User already exists — reusing (uid: ${uid}), password updated`);
} catch (err) {
  if (err.code === "auth/user-not-found") {
    const created = await auth.createUser({ email, password });
    uid    = created.uid;
    action = "created";
    console.log(`\n✅  Firebase Auth user created (uid: ${uid})`);
  } else {
    console.error("❌  Firebase Auth error:", err.message);
    process.exit(1);
  }
}

// ── Inject members stub ───────────────────────────────────────────────────────

const now = new Date().toISOString();

const stub = {
  uid,
  email,
  displayName:                  name,
  major,
  year,
  college,
  techLevel,
  interests:                    [],
  emailReminders:               false,
  newsletter:                   false,
  profilePublic:                false,
  emailPasswordAccountVerified: !unverified,
  createdAt:                    now,
  updatedAt:                    now,
  lastActive:                   now,
  ...(isAdmin ? { isAdmin: true } : {}),
};

await db.collection("members").doc(uid).set(stub, { merge: true });
console.log(`✅  members/${uid} stub written (emailPasswordAccountVerified: ${!unverified})`);

// ── Inject OTP code when testing verify-email flow ───────────────────────────

if (unverified) {
  await db.collection("emailVerificationCodes").doc(uid).set({
    codeHash:  sha256(otpCode),
    expiresAt: Timestamp.fromMillis(Date.now() + 60 * 60 * 1000), // 1 hour
    createdAt: Timestamp.now(),
  });
  console.log(`✅  Verification code injected into emailVerificationCodes/${uid}`);
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`
┌─────────────────────────────────────────────────────┐
│  Test user ready                                    │
├─────────────────────────────────────────────────────┤
│  Email    : ${email.padEnd(39)}│
│  Password : ${password.padEnd(39)}│
│  Name     : ${name.padEnd(39)}│
│  Admin    : ${String(isAdmin).padEnd(39)}│
│  Verified : ${String(!unverified).padEnd(39)}│${unverified ? `
│  OTP code : ${otpCode.padEnd(39)}│` : ""}
│  Action   : ${action.padEnd(39)}│
└─────────────────────────────────────────────────────┘
${unverified ? `
Sign in at /auth → you will be redirected to /verify-email.
Enter the OTP code above: ${otpCode}
` : `
Sign in at /auth with the email/password above.
`}
To clean up:
  node --env-file=.env.local scripts/test-auth-user.mjs --email ${email} --delete
`);
