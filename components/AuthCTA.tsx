"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

interface AuthCTAProps {
  className?: string;
  joinLabel?: string;
  dashboardLabel?: string;
}

/**
 * Auth-aware CTA that renders "Join the Club" → /auth for guests
 * and a configurable label → /dashboard for signed-in users.
 * Accepts any className for full styling flexibility.
 */
export default function AuthCTA({
  className,
  joinLabel = "Join the Club",
  dashboardLabel = "Visit Dashboard",
}: AuthCTAProps) {
  const { user } = useAuth();
  return (
    <Link href={user ? "/dashboard" : "/auth"} className={className}>
      {user ? dashboardLabel : joinLabel}
    </Link>
  );
}
