"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { Github, Linkedin, Loader2, Search } from "lucide-react";
import PageHero from "@/components/PageHero";
import type { MemberProfile } from "@/lib/types";

const TECH_LEVELS = ["beginner", "some", "intermediate", "advanced"] as const;

const COLLEGES = [
  "College of Engineering",
  "Smeal College of Business",
  "College of IST",
  "Eberly College of Science",
  "College of Liberal Arts",
  "College of Education",
  "College of Communications",
  "Penn State Law",
  "Other",
];

const LEVEL_COLORS: Record<string, string> = {
  beginner: "bg-[#788c5d]/10 text-[#788c5d]",
  some: "bg-[#6a9bcc]/10 text-[#6a9bcc]",
  intermediate: "bg-[#6a9bcc]/10 text-[#6a9bcc]",
  advanced: "bg-[#d97757]/10 text-[#d97757]",
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner",
  some: "Some experience",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

interface PublicMember extends MemberProfile {
  id: string;
}

function MemberCard({ member }: { member: PublicMember }) {
  const initials = member.displayName
    ? member.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (member.email[0] ?? "?").toUpperCase();

  return (
    <div
      onClick={() => window.location.href = `/members/${member.id}`}
      className="group bg-white rounded-2xl border border-[#e8e6dc] p-5 hover:border-[#d97757]/40 hover:shadow-md transition-all cursor-pointer"
    >
      {/* Avatar + basic info */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-[#d97757] flex items-center justify-center text-white text-xs font-bold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[#141413] group-hover:text-[#d97757] transition-colors truncate">
            {member.displayName}
          </h3>
          {member.major && member.year && (
            <p className="text-xs text-[#b0aea5] truncate">
              {member.major} · {member.year}
            </p>
          )}
        </div>
      </div>

      {/* College + tech level */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {member.college && (
          <span className="text-[10px] px-2 py-0.5 bg-[#e8e6dc] text-[#6b6963] rounded-full">
            {member.college}
          </span>
        )}
        {member.techLevel && (
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              LEVEL_COLORS[member.techLevel]
            }`}
          >
            {LEVEL_LABELS[member.techLevel] || member.techLevel}
          </span>
        )}
      </div>

      {/* Interests */}
      {member.interests.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {member.interests.slice(0, 3).map((interest) => (
            <span
              key={interest}
              className="text-[9px] px-1.5 py-0.5 bg-[#faf9f5] border border-[#e8e6dc] text-[#6b6963] rounded"
            >
              {interest}
            </span>
          ))}
        </div>
      )}

      {/* Social links */}
      {(member.githubUsername || member.linkedinUrl) && (
        <div className="flex items-center gap-2 pt-3 border-t border-[#e8e6dc]">
          {member.githubUsername && (
            <a
              href={`https://github.com/${member.githubUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[#b0aea5] hover:text-[#141413] transition-colors"
              title={`GitHub: ${member.githubUsername}`}
            >
              <Github size={14} />
            </a>
          )}
          {member.linkedinUrl && (
            <a
              href={member.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[#b0aea5] hover:text-[#141413] transition-colors"
              title="LinkedIn"
            >
              <Linkedin size={14} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function MembersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<PublicMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTechLevel, setFilterTechLevel] = useState<string>("all");
  const [filterCollege, setFilterCollege] = useState<string>("all");

  // Auth gate + load data
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth");
      return;
    }

    // Check if user has a member profile
    getDoc(doc(db, "members", user.uid)).then((snap) => {
      if (!snap.exists()) {
        router.push("/settings");
        return;
      }

      // Fetch all members with public profiles
      getDocs(collection(db, "members"))
        .then((snap) => {
          const publicMembers: PublicMember[] = snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as PublicMember))
            .filter((m) => m.profilePublic !== false); // undefined = public (default)

          setMembers(publicMembers);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, [authLoading, user, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#d97757]" />
      </div>
    );
  }

  // Filter members
  const filtered = members
    .filter((m) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          m.displayName.toLowerCase().includes(query) ||
          m.major.toLowerCase().includes(query) ||
          m.college.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .filter((m) => filterTechLevel === "all" || m.techLevel === filterTechLevel)
    .filter((m) => filterCollege === "all" || m.college === filterCollege)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return (
    <div className="min-h-screen bg-[#faf9f5]">
      {/* Hero */}
      <PageHero
        eyebrow="Club Members"
        heading="Meet the Community"
        description="Connect with fellow Penn State students building with Claude. Find collaborators, learn from peers, and grow together."
      />

      {/* Filters */}
      <div className="sticky top-[64px] z-20 bg-[#faf9f5]/90 backdrop-blur-sm border-b border-[#e8e6dc] py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#b0aea5]" />
            <input
              type="text"
              placeholder="Search by name, major, or college…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-[#e8e6dc] rounded-xl text-sm focus:outline-none focus:border-[#d97757] focus:ring-1 focus:ring-[#d97757]/20 bg-white"
            />
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-2">
            {/* Tech level */}
            <button
              onClick={() => setFilterTechLevel("all")}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                filterTechLevel === "all"
                  ? "bg-[#d97757] text-white border-[#d97757]"
                  : "bg-white text-[#6b6860] border-[#e8e6dc] hover:border-[#d97757]/40"
              }`}
            >
              All Levels
            </button>
            {TECH_LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => setFilterTechLevel(level)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  filterTechLevel === level
                    ? "bg-[#d97757] text-white border-[#d97757]"
                    : "bg-white text-[#6b6860] border-[#e8e6dc] hover:border-[#d97757]/40"
                }`}
              >
                {LEVEL_LABELS[level]}
              </button>
            ))}

            {/* College */}
            <div className="w-px h-6 bg-[#e8e6dc] shrink-0" />

            <select
              value={filterCollege}
              onChange={(e) => setFilterCollege(e.target.value)}
              className="text-xs font-medium px-3 py-1.5 rounded-full border border-[#e8e6dc] bg-white text-[#6b6860] focus:outline-none focus:border-[#d97757]"
            >
              <option value="all">All Colleges</option>
              {COLLEGES.map((college) => (
                <option key={college} value={college}>
                  {college}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#b0aea5] text-sm mb-4">No members found matching your filters.</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setFilterTechLevel("all");
                setFilterCollege("all");
              }}
              className="text-sm text-[#d97757] font-medium hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div>
            <p className="text-xs font-semibold text-[#b0aea5] uppercase tracking-wider mb-6">
              {filtered.length} member{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
