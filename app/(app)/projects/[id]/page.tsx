"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  Github,
  Star,
  Clock,
  ExternalLink,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import type { Project, ProjectTechLevel } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

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

const LEVEL_LABELS: Record<ProjectTechLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const LEVEL_STYLES: Record<ProjectTechLevel, string> = {
  beginner: "bg-[#788c5d]/10 text-[#788c5d]",
  intermediate: "bg-[#6a9bcc]/10 text-[#6a9bcc]",
  advanced: "bg-[#d97757]/10 text-[#d97757]",
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth");
      return;
    }

    getDoc(doc(db, "projects", id))
      .then((snap) => {
        if (!snap.exists()) {
          setNotFound(true);
          return;
        }
        const data = { id: snap.id, ...snap.data() } as Project;
        if (data.status !== "approved") {
          setNotFound(true);
          return;
        }
        setProject(data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [authLoading, user, router, id]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#d97757]" size={28} />
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="min-h-screen bg-[#faf9f5] flex flex-col items-center justify-center gap-4">
        <p className="text-[#b0aea5] text-sm">Project not found.</p>
        <Link
          href="/projects"
          className="text-sm text-[#d97757] font-medium hover:underline"
        >
          ← Back to Projects
        </Link>
      </div>
    );
  }

  const langColor = project.githubMeta.language
    ? (LANG_COLORS[project.githubMeta.language] ?? "#b0aea5")
    : null;

  return (
    <div className="min-h-screen bg-[#faf9f5]">
      {/* Hero */}
      <div className="bg-[#141413] pt-8 pb-12 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#d97757] rounded-full opacity-[0.06] blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-xs text-[#b0aea5] hover:text-white transition-colors mb-8"
          >
            <ArrowLeft size={12} />
            Back to Projects
          </Link>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${LEVEL_STYLES[project.techLevel]}`}
            >
              {LEVEL_LABELS[project.techLevel]}
            </span>
            {project.featured && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#d97757]/20 text-[#d97757]">
                Featured
              </span>
            )}
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-[#b0aea5]"
              >
                {tag}
              </span>
            ))}
          </div>

          <h1 className="heading text-3xl sm:text-4xl font-bold text-white mb-3 leading-tight">
            {project.title}
          </h1>
          <p className="text-[#b0aea5] leading-relaxed max-w-2xl">
            {project.description}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {/* Repo card + Demo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group col-span-2 bg-white rounded-2xl border border-[#e8e6dc] p-5 hover:border-[#d97757]/40 hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#141413] rounded-lg flex items-center justify-center shrink-0">
                <Github size={16} className="text-white" />
              </div>
              <div>
                <p className="font-mono text-sm font-medium text-[#141413]">
                  {project.githubMeta.owner}/{project.githubMeta.repo}
                </p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {langColor && project.githubMeta.language && (
                    <span className="inline-flex items-center gap-1 text-xs text-[#555555]">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: langColor }}
                      />
                      {project.githubMeta.language}
                    </span>
                  )}
                  {project.githubMeta.stars > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-[#b0aea5]">
                      <Star size={10} />
                      {project.githubMeta.stars}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs text-[#b0aea5]">
                    <Clock size={10} />
                    Updated {relativeTime(project.githubMeta.lastCommit)}
                  </span>
                </div>
              </div>
            </div>
            <ExternalLink
              size={14}
              className="text-[#b0aea5] group-hover:text-[#d97757] transition-colors shrink-0"
            />
          </a>

          {project.demoUrl ? (
            <a
              href={project.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-[#d97757] rounded-2xl p-5 flex flex-col items-center justify-center gap-2 hover:bg-[#c86843] transition-colors text-center"
            >
              <ExternalLink size={20} className="text-white" />
              <span className="text-sm font-medium text-white">Live Demo</span>
            </a>
          ) : (
            <div className="bg-white rounded-2xl border border-[#e8e6dc] p-5 flex flex-col items-center justify-center gap-2 text-center">
              <span className="text-sm text-[#b0aea5]">No demo available</span>
            </div>
          )}
        </div>

        {/* Submitter */}
        <div className="bg-white rounded-2xl border border-[#e8e6dc] p-5">
          <h2 className="heading text-sm font-semibold text-[#141413] mb-3">
            Submitted by
          </h2>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#d97757]/20 flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-[#d97757]">
                {project.ownerName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-[#141413]">{project.ownerName}</p>
              <p className="text-xs text-[#b0aea5]">{project.ownerEmail}</p>
            </div>
          </div>

          {project.collaborators.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#e8e6dc]">
              <p className="text-xs text-[#b0aea5] mb-1.5">Collaborators</p>
              <div className="flex flex-wrap gap-1.5">
                {project.collaborators.map((c) => (
                  <span
                    key={c}
                    className="text-xs text-[#555555] bg-[#faf9f5] border border-[#e8e6dc] px-2 py-0.5 rounded-full"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* README excerpt */}
        {project.githubMeta.readmeExcerpt && (
          <div className="bg-white rounded-2xl border border-[#e8e6dc] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading text-sm font-semibold text-[#141413]">README</h2>
              <a
                href={`${project.repoUrl}#readme`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#d97757] hover:underline font-medium"
              >
                View full README on GitHub →
              </a>
            </div>
            <p className="text-sm text-[#555555] leading-relaxed whitespace-pre-line">
              {project.githubMeta.readmeExcerpt}
              {project.githubMeta.readmeExcerpt.length >= 500 && "…"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
