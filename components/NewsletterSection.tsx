"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import AuthCTA from "./AuthCTA";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function GroupMeSection() {
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [ref, visible] = useScrollReveal<HTMLElement>();

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => setMemberCount(data.members))
      .catch(() => {});
  }, []);

  return (
    <section
      ref={ref}
      className={`py-24 bg-[#e8e6dc] transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#d97757] mb-3 block">
          Get Involved
        </span>
        <h2 className="heading text-3xl sm:text-4xl font-bold text-[#141413] mb-4">
          Your classmates are already building.
        </h2>
        <p className="body-editorial text-lg text-[#b0aea5] mb-8 leading-relaxed">
          One click with your Penn State Google account. No application,
          no waitlist, no cost. Takes about five seconds.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <AuthCTA
            joinLabel="Sign Up Free"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#d97757] hover:bg-[#c86843] text-white text-sm font-semibold rounded-xl transition-colors"
          />
          <Link
            href="https://groupme.com/join_group/108706896/m6t7b7Vs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-[#d0cdc5] hover:border-[#141413] text-[#141413] text-sm font-medium rounded-xl transition-colors bg-white"
          >
            <MessageCircle size={16} />
            Join GroupMe
          </Link>
        </div>

        <p className="text-xs text-[#b0aea5] mt-5">
          Already {memberCount ?? "300+"} members. Open to all Penn State
          students.
        </p>
      </div>
    </section>
  );
}
