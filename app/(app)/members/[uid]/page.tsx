"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, doc, getDocs, getDoc, query, where } from "firebase/firestore";
import { Github, Linkedin, Loader2, ExternalLink, AlertCircle, Star, Clock } from "lucide-react";
import type { MemberProfile, Project } from "@/lib/types";

const LEVEL_STYLES: Record<string, string> = {
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

const LANG_COLORS: Record<string, string> = {
  Python: "#3572A5",
  JavaScript: "#f1e05a",
  TypeScript: "#2b7489",
  Java: "#b07219",
  "Jupyter Notebook": "#DA5B0B",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Go: "#00ADD8",
  Rust: "#dea584",
  Ruby: "#701516",
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default function MemberProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const uid = params.uid as string;

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwn, setIsOwn] = useState(false);

  // Auth gate + load data
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth");
      return;
    }

    // Check current user has member profile
    getDoc(doc(db, "members", user.uid)).then((snap) => {
      if (!snap.exists()) {
        router.push("/settings");
        return;
      }

      setIsOwn(user.uid === uid);

      // Fetch target member's profile
      getDoc(doc(db, "members", uid)).then((snap) => {
        if (!snap.exists()) {
          router.push("/members");
          return;
        }

        const memberData = snap.data() as MemberProfile;
        setProfile(memberData);

        // Fetch member's approved projects
        getDocs(query(collection(db, "projects"), where("ownerId", "==", uid), where("status", "==", "approved")))
          .then((snap) => {
            const projectList = snap.docs
              .map((d) => ({ id: d.id, ...d.data() } as Project))
              .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
            setProjects(projectList);
          })
          .finally(() => setLoading(false));
      });
    });
  }, [authLoading, user, router, uid]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#d97757]" />
      </div>
    );
  }

  if (!profile) {
    return null; // Should redirect before this
  }

  // Privacy check
  if (profile.profilePublic === false) {
    return (
      <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center">
        <div className="max-w-sm mx-auto px-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-[#e8e6dc] rounded-xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={20} className="text-[#b0aea5]" />
            </div>
            <p className="text-sm font-medium text-[#141413] mb-1">Profile is Private</p>
            <p className="text-xs text-[#b0aea5] mb-6">This member has chosen not to share their profile.</p>
            <Link href="/members" className="text-xs font-medium text-[#d97757] hover:underline">
              Back to Members Directory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const initials = profile.displayName
    ? profile.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (profile.email[0] ?? "?").toUpperCase();

  return (
    <div className="min-h-screen bg-[#faf9f5]">
      {/* Hero band */}
      <div className="bg-[#141413] pt-16 pb-12 relative overflow-hidden">
        <div className="absolute top-0 -left-24 w-80 h-80 bg-[#d97757]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#6a9bcc]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end gap-6 mb-6">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-[#d97757] flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {initials}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="heading text-3xl sm:text-4xl font-bold text-white leading-tight mb-1">
                {profile.displayName}
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                {profile.major && profile.year && (
                  <div className="inline-flex items-center px-3 py-1.5 bg-white/[0.07] border border-white/[0.12] rounded-full">
                    <span className="text-xs text-[#b0aea5] font-medium">
                      {profile.major} · {profile.year}
                    </span>
                  </div>
                )}
                {profile.college && (
                  <div className="inline-flex items-center px-3 py-1.5 bg-white/[0.07] border border-white/[0.12] rounded-full">
                    <span className="text-xs text-[#b0aea5] font-medium">{profile.college}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Edit button */}
            {isOwn && (
              <Link
                href="/settings"
                className="shrink-0 px-4 py-2.5 bg-[#d97757] hover:bg-[#c86843] text-white text-sm font-medium rounded-lg transition-colors"
              >
                Edit Profile
              </Link>
            )}
          </div>

          {/* Tech level + social */}
          <div className="flex flex-wrap items-center gap-4">
            {profile.techLevel && (
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${LEVEL_STYLES[profile.techLevel]}`}>
                {LEVEL_LABELS[profile.techLevel]}
              </span>
            )}

            {(profile.githubUsername || profile.linkedinUrl) && (
              <>
                <div className="w-px h-5 bg-white/20" />
                <div className="flex items-center gap-2">
                  {profile.githubUsername && (
                    <a
                      href={`https://github.com/${profile.githubUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.07] border border-white/[0.12] rounded-full hover:bg-white/[0.12] transition-colors"
                    >
                      <Github size={14} className="text-[#d97757]" />
                      <span className="text-xs text-[#b0aea5] font-medium">{profile.githubUsername}</span>
                    </a>
                  )}
                  {profile.linkedinUrl && (
                    <a
                      href={profile.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.07] border border-white/[0.12] rounded-full hover:bg-white/[0.12] transition-colors"
                    >
                      <Linkedin size={14} className="text-[#6a9bcc]" />
                      <span className="text-xs text-[#b0aea5] font-medium">LinkedIn</span>
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left: Interests */}
          <div className="md:col-span-1">
            {profile.interests.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-[#b0aea5] uppercase tracking-wider mb-4">
                  Interests
                </p>
                <div className="space-y-2">
                  {profile.interests.map((interest) => (
                    <div
                      key={interest}
                      className="inline-flex items-center px-3 py-1.5 bg-white border border-[#e8e6dc] text-[#6b6963] text-xs rounded-full"
                    >
                      {interest}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#b0aea5] italic">No interests listed</p>
            )}
          </div>

          {/* Right: Projects */}
          <div className="md:col-span-2">
            <p className="text-xs font-semibold text-[#b0aea5] uppercase tracking-wider mb-4">
              {projects.length} Project{projects.length !== 1 ? "s" : ""}
            </p>

            {projects.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#e8e6dc] p-8 text-center">
                <p className="text-sm text-[#b0aea5]">No approved projects yet.</p>
                {isOwn && (
                  <Link href="/projects" className="text-xs font-medium text-[#d97757] hover:underline mt-3 inline-block">
                    Submit a project →
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {projects.map((project) => {
                  const langColor = project.githubMeta.language
                    ? (LANG_COLORS[project.githubMeta.language] ?? "#b0aea5")
                    : null;

                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="group bg-white rounded-2xl border border-[#e8e6dc] p-4 hover:border-[#d97757]/40 hover:shadow-md transition-all"
                    >
                      <h4 className="text-sm font-semibold text-[#141413] group-hover:text-[#d97757] transition-colors mb-1 line-clamp-2">
                        {project.title}
                      </h4>
                      <p className="text-xs text-[#b0aea5] line-clamp-2 mb-3">{project.description}</p>

                      {project.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {project.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-[#faf9f5] border border-[#e8e6dc] text-[#6b6963] rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="pt-3 border-t border-[#e8e6dc] flex items-center justify-between gap-2 text-xs text-[#b0aea5]">
                        <div className="flex items-center gap-2">
                          {langColor && project.githubMeta.language && (
                            <span className="inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: langColor }} />
                              {project.githubMeta.language}
                            </span>
                          )}
                        </div>
                        {project.githubMeta.stars > 0 && (
                          <span className="inline-flex items-center gap-0.5">
                            <Star size={10} />
                            {project.githubMeta.stars}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
