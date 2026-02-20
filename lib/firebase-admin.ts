import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Called lazily inside route handlers so a missing env var surfaces as a
// JSON error response rather than crashing the module at import time.
function getAdminApp() {
  if (getApps().length > 0) return getApp();
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set. " +
      "Download your service account JSON from Firebase Console → Project Settings → Service Accounts."
    );
  }
  return initializeApp({ credential: cert(JSON.parse(key)) });
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}
