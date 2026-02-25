/** Generate a permanent referral code from UID — last 8 chars, uppercased */
export function generateReferralCode(uid: string): string {
  return uid.slice(-8).toUpperCase();
}

/** Build the full shareable referral URL */
export function getReferralUrl(code: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/auth?ref=${code}`;
}
