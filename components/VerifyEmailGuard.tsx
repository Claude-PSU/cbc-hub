"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

// Pages inside (app) that email/password users may visit before verifying.
// /verify-email lives in (auth) so it won't be wrapped by this guard,
// but we list it here defensively in case routing changes.
const EXEMPT_PATHS = ["/auth", "/verify-email", "/about", "/contact"];

export default function VerifyEmailGuard() {
  const { user, loading, emailPasswordAccountVerified } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Wait until auth + member doc have both resolved
    if (loading || emailPasswordAccountVerified === null) return;
    // Not signed in, or already verified — nothing to do
    if (!user || emailPasswordAccountVerified) return;
    // Let public/exempt pages through
    if (EXEMPT_PATHS.some((p) => pathname.startsWith(p))) return;

    const next = encodeURIComponent(pathname);
    router.replace(`/verify-email?next=${next}`);
  }, [loading, user, emailPasswordAccountVerified, pathname, router]);

  return null;
}
