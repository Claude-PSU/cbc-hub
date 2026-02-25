"use client";

import { useEffect, useState } from "react";
import AuthCTA from "./AuthCTA";

export default function SocialProofBar() {
  const [stats, setStats] = useState<{ members: number; colleges: number } | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => setStats({ members: data.members, colleges: data.colleges }))
      .catch(() => {});
  }, []);

  return (
    <section className="py-4 bg-[#1a1a19] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-[#b0aea5]">
          Join{" "}
          <span className="text-white font-semibold">
            {stats?.members ?? "..."}
          </span>{" "}
          students across{" "}
          <span className="text-white font-semibold">
            {stats?.colleges ?? "..."}
          </span>{" "}
          colleges
        </p>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[#b0aea5] hidden sm:inline">
            Free, one-click with Google
          </span>
          <AuthCTA
            joinLabel="Sign Up"
            className="px-5 py-2 text-sm font-medium text-white bg-[#d97757] hover:bg-[#c86843] rounded-xl transition-colors"
          />
        </div>
      </div>
    </section>
  );
}
