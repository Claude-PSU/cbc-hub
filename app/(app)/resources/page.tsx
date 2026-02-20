"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
import {
  FolderOpen,
  ExternalLink,
  Play,
  Github,
  Star,
  Clock,
  GraduationCap,
  Loader2,
} from "lucide-react";
import type { MemberProfile, Resource, ResourceCategory } from "@/lib/types";
import type { GitHubRepo } from "@/app/(app)/api/github-repos/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function techLevelLabel(level: MemberProfile["techLevel"]): string {
  const labels: Record<MemberProfile["techLevel"], string> = {
    beginner: "beginner",
    some: "some experience",
    intermediate: "intermediate",
    advanced: "advanced",
    "": "all levels",
  };
  return labels[level];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  id,
  label,
  count,
  sublabel,
  icon,
}: {
  id?: string;
  label: string;
  count: number;
  sublabel?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div id={id} className="mb-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-1 h-5 bg-[#d97757] rounded-full shrink-0" />
        {icon}
        <h2 className="heading text-lg font-semibold text-[#141413]">{label}</h2>
        <span className="text-xs bg-[#e8e6dc] text-[#6b6860] px-2 py-0.5 rounded-full font-medium">
          {count}
        </span>
      </div>
      {sublabel && (
        <p className="text-sm text-[#b0aea5] ml-4 pl-3">{sublabel}</p>
      )}
    </div>
  );
}

function TypeBadge({ type }: { type: Resource["type"] }) {
  const config = {
    drive: { label: "Drive", icon: <FolderOpen size={12} />, color: "text-[#788c5d] bg-[#788c5d]/10" },
    link: { label: "Link", icon: <ExternalLink size={12} />, color: "text-[#6a9bcc] bg-[#6a9bcc]/10" },
    video: { label: "Video", icon: <Play size={12} />, color: "text-[#d97757] bg-[#d97757]/10" },
  }[type];

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

function ResourceCard({ resource }: { resource: Resource }) {
  const actionLabel = resource.type === "video" ? "Watch →" : "Open →";

  return (
    <a
      id={resource.id}
      href={resource.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-white rounded-2xl border border-[#e8e6dc] p-5 flex flex-col hover:border-[#d97757]/40 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <TypeBadge type={resource.type} />
      </div>

      <h3 className="heading font-semibold text-[#141413] group-hover:text-[#d97757] transition-colors text-sm leading-snug mb-2">
        {resource.title}
      </h3>

      <p className="text-sm text-[#b0aea5] line-clamp-3 leading-relaxed flex-1">
        {resource.description}
      </p>

      {resource.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {resource.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs text-[#b0aea5] bg-[#faf9f5] border border-[#e8e6dc] rounded-full px-2 py-0.5"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-[#e8e6dc] flex items-center justify-between">
        <span className="text-xs font-medium text-[#d97757]">{actionLabel}</span>
        <ExternalLink size={12} className="text-[#b0aea5] group-hover:text-[#d97757] transition-colors" />
      </div>
    </a>
  );
}

function GitHubRepoCard({ repo }: { repo: GitHubRepo }) {
  return (
    <a
      href={repo.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-white rounded-2xl border border-[#e8e6dc] p-5 flex flex-col hover:border-[#d97757]/40 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Github size={14} className="text-[#6b6860]" />
          <span className="text-xs text-[#6b6860] font-mono">{repo.name}</span>
        </div>
        {repo.stargazers_count > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-[#b0aea5]">
            <Star size={11} />
            {repo.stargazers_count}
          </span>
        )}
      </div>

      <p className="text-sm text-[#b0aea5] line-clamp-2 leading-relaxed flex-1">
        {repo.description ?? "No description provided."}
      </p>

      <div className="mt-4 pt-3 border-t border-[#e8e6dc] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {repo.language && (
            <span className="inline-flex items-center gap-1.5 text-xs text-[#788c5d]">
              <span className="w-2 h-2 rounded-full bg-[#788c5d]" />
              {repo.language}
            </span>
          )}
          {repo.topics.slice(0, 2).map((topic) => (
            <span
              key={topic}
              className="text-xs text-[#b0aea5] bg-[#faf9f5] border border-[#e8e6dc] rounded-full px-2 py-0.5"
            >
              {topic}
            </span>
          ))}
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-[#b0aea5]">
          <Clock size={10} />
          {relativeTime(repo.updated_at)}
        </span>
      </div>
    </a>
  );
}

function EmptySection({ label }: { label: string }) {
  return (
    <div className="col-span-full text-center py-10 text-sm text-[#b0aea5]">
      No {label.toLowerCase()} resources yet — check back soon.
    </div>
  );
}

// ─── Filter chips ──────────────────────────────────────────────────────────────

type FilterKey = "all" | ResourceCategory;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "getting-started", label: "Getting Started" },
  { key: "prompt-engineering", label: "Prompt Engineering" },
  { key: "workshops", label: "Workshops" },
  { key: "faculty", label: "For Faculty" },
  { key: "reference", label: "Reference" },
  { key: "external", label: "Further Reading" },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ResourcesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [resources, setResources] = useState<Resource[]>([]);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [reposError, setReposError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth");
      return;
    }

    Promise.all([
      getDocs(query(collection(db, "resources"), where("published", "==", true))),
      getDoc(doc(db, "members", user.uid)),
      fetch("/api/github-repos").then((r) => r.json()).catch(() => ({ repos: [], error: true })),
    ]).then(([resourcesSnap, profileSnap, reposRes]) => {
      const allResources = resourcesSnap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Resource))
        .sort((a, b) => a.order - b.order);
      setResources(allResources);
      if (profileSnap.exists()) setProfile(profileSnap.data() as MemberProfile);
      setRepos(reposRes.repos ?? []);
      if (reposRes.error) setReposError(true);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [authLoading, user, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#d97757]" size={28} />
      </div>
    );
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const forYou = profile?.techLevel
    ? resources
        .filter((r) => r.featured && r.techLevels.includes(profile.techLevel as "beginner" | "some" | "intermediate" | "advanced"))
        .slice(0, 3)
    : [];

  const byCategory = (cat: ResourceCategory) =>
    resources.filter((r) => r.category === cat);

  const facultyResources = resources.filter((r) => r.category === "faculty");

  const shouldShowSection = (cat: FilterKey) =>
    activeFilter === "all" || activeFilter === cat;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#faf9f5]">
      {/* Hero */}
      <div className="bg-[#141413] pt-16 pb-14 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#d97757] rounded-full opacity-[0.06] blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#6a9bcc] rounded-full opacity-[0.06] blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#d97757] mb-3">
            Members Resource Hub
          </p>
          <h1 className="heading text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            Build responsibly.
            <br />
            <span className="text-[#d97757]">Build boldly.</span>
          </h1>
          <p className="body-editorial text-[#b0aea5] text-lg max-w-2xl leading-relaxed mb-6">
            Everything you need to work with AI purposefully — curated for the Penn State community of students and faculty.
          </p>
          {profile?.techLevel && (
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 text-xs bg-[#d97757]/10 border border-[#d97757]/30 text-[#d97757] rounded-full px-3 py-1.5 hover:bg-[#d97757]/20 transition-colors"
            >
              Personalized for {techLevelLabel(profile.techLevel)} level · update in settings →
            </Link>
          )}
        </div>
      </div>

      {/* Sticky filter bar */}
      <div className="sticky top-[64px] z-20 bg-[#faf9f5]/90 backdrop-blur-sm border-b border-[#e8e6dc]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                activeFilter === key
                  ? "bg-[#d97757] text-white border-[#d97757]"
                  : "bg-white text-[#6b6860] border-[#e8e6dc] hover:border-[#d97757]/40 hover:text-[#d97757]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">

        {/* A. Picked for You */}
        {activeFilter === "all" && forYou.length > 0 && (
          <section>
            <SectionHeader
              id="picked-for-you"
              label="Picked for You"
              count={forYou.length}
              sublabel={`Based on your ${techLevelLabel(profile!.techLevel)} skill level`}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {forYou.map((r) => <ResourceCard key={r.id} resource={r} />)}
            </div>
          </section>
        )}

        {/* B. Getting Started */}
        {shouldShowSection("getting-started") && (
          <section>
            <SectionHeader
              id="getting-started"
              label="Getting Started"
              count={byCategory("getting-started").length}
              sublabel="New to AI? Start here. No prior experience required."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {byCategory("getting-started").length > 0
                ? byCategory("getting-started").map((r) => <ResourceCard key={r.id} resource={r} />)
                : <EmptySection label="Getting Started" />}
            </div>
          </section>
        )}

        {/* C. Prompt Engineering */}
        {shouldShowSection("prompt-engineering") && (
          <section>
            <SectionHeader
              id="prompt-engineering"
              label="Prompt Engineering"
              count={byCategory("prompt-engineering").length}
              sublabel="Learn to communicate with AI precisely and effectively."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {byCategory("prompt-engineering").length > 0
                ? byCategory("prompt-engineering").map((r) => <ResourceCard key={r.id} resource={r} />)
                : <EmptySection label="Prompt Engineering" />}
            </div>
          </section>
        )}

        {/* D. Workshop Materials */}
        {shouldShowSection("workshops") && (
          <section>
            <SectionHeader
              id="workshops"
              label="Workshop Materials"
              count={byCategory("workshops").length}
              sublabel="Slides, boilerplate, and code from Claude Builder Club workshops."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {byCategory("workshops").length > 0
                ? byCategory("workshops").map((r) => <ResourceCard key={r.id} resource={r} />)
                : <EmptySection label="Workshops" />}
            </div>
          </section>
        )}

        {/* E. For Faculty */}
        {shouldShowSection("faculty") && (
          <section>
            <SectionHeader
              id="faculty"
              label="For Faculty"
              count={facultyResources.length}
              sublabel="Resources for instructors integrating AI responsibly into coursework."
              icon={<GraduationCap size={16} className="text-[#6a9bcc]" />}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {facultyResources.length > 0
                ? facultyResources.map((r) => <ResourceCard key={r.id} resource={r} />)
                : <EmptySection label="Faculty" />}
            </div>
          </section>
        )}

        {/* F. From Our GitHub — always visible */}
        <section>
          <SectionHeader
            id="github"
            label="From Our GitHub"
            count={repos.length}
            sublabel="Real projects built by Penn State students with Claude."
          />
          {reposError || repos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#e8e6dc] p-8 text-center">
              <Github size={24} className="text-[#b0aea5] mx-auto mb-3" />
              <p className="text-sm text-[#b0aea5] mb-3">
                No public repositories found yet — or we hit a rate limit.
              </p>
              <a
                href="https://github.com/Claude-PSU"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#d97757] hover:underline font-medium"
              >
                Browse Claude-PSU on GitHub →
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {repos.map((repo) => <GitHubRepoCard key={repo.id} repo={repo} />)}
            </div>
          )}
        </section>

        {/* G. Reference & Docs */}
        {shouldShowSection("reference") && (
          <section>
            <SectionHeader
              id="reference"
              label="Reference & Docs"
              count={byCategory("reference").length}
              sublabel="Technical documentation and API references for building with Claude."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {byCategory("reference").length > 0
                ? byCategory("reference").map((r) => <ResourceCard key={r.id} resource={r} />)
                : <EmptySection label="Reference" />}
            </div>
          </section>
        )}

        {/* H. Further Reading */}
        {shouldShowSection("external") && (
          <section>
            <SectionHeader
              id="external"
              label="Further Reading"
              count={byCategory("external").length}
              sublabel="Selected articles, guides, and perspectives from across the AI landscape."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {byCategory("external").length > 0
                ? byCategory("external").map((r) => <ResourceCard key={r.id} resource={r} />)
                : <EmptySection label="External" />}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
