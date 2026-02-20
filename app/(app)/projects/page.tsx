"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import {
  Github,
  Star,
  Clock,
  Plus,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import PageHero from "@/components/PageHero";
import Modal from "@/components/Modal";
import type { Project, MemberProfile, ProjectTechLevel } from "@/lib/types";
import { PROJECT_TAGS } from "@/lib/types";

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

const TECH_LEVELS: { value: ProjectTechLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

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

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ project }: { project: Project }) {
  const langColor = project.githubMeta.language
    ? (LANG_COLORS[project.githubMeta.language] ?? "#b0aea5")
    : null;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group bg-white rounded-2xl border border-[#e8e6dc] p-5 flex flex-col hover:border-[#d97757]/40 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex flex-wrap gap-1.5">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${LEVEL_STYLES[project.techLevel]}`}
          >
            {TECH_LEVELS.find((t) => t.value === project.techLevel)?.label}
          </span>
          {project.featured && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#d97757]/10 text-[#d97757]">
              Featured
            </span>
          )}
        </div>
        {project.githubMeta.stars > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-[#b0aea5] shrink-0">
            <Star size={11} />
            {project.githubMeta.stars}
          </span>
        )}
      </div>

      <h3 className="heading font-semibold text-[#141413] group-hover:text-[#d97757] transition-colors text-sm leading-snug mb-2">
        {project.title}
      </h3>

      <p className="text-sm text-[#b0aea5] line-clamp-2 leading-relaxed flex-1">
        {project.description}
      </p>

      {project.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {project.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs text-[#b0aea5] bg-[#faf9f5] border border-[#e8e6dc] rounded-full px-2 py-0.5"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-[#e8e6dc] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {langColor && project.githubMeta.language && (
            <span className="inline-flex items-center gap-1.5 text-xs text-[#555555]">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: langColor }}
              />
              {project.githubMeta.language}
            </span>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-[#b0aea5]">
          <Clock size={10} />
          {relativeTime(project.githubMeta.lastCommit)}
        </span>
      </div>
    </Link>
  );
}

// ─── Submit Modal ─────────────────────────────────────────────────────────────

interface RepoMeta {
  owner: string;
  repo: string;
  suggestedTitle: string;
  language: string | null;
  stars: number;
  lastCommit: string;
  readmeExcerpt: string;
}

interface SubmitFormData {
  repoUrl: string;
  title: string;
  description: string;
  tags: string[];
  techLevel: ProjectTechLevel;
  demoUrl: string;
  collaborators: string;
}

function SubmitModal({
  onClose,
  onSuccess,
  profile,
  userId,
}: {
  onClose: () => void;
  onSuccess: () => void;
  profile: MemberProfile;
  userId: string;
}) {
  const [repoUrl, setRepoUrl] = useState("");
  const [repoMeta, setRepoMeta] = useState<RepoMeta | null>(null);
  const [validateError, setValidateError] = useState("");
  const [validating, setValidating] = useState(false);
  const [form, setForm] = useState<SubmitFormData>({
    repoUrl: "",
    title: "",
    description: "",
    tags: [],
    techLevel: "beginner",
    demoUrl: "",
    collaborators: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleValidate = async () => {
    if (!repoUrl.trim()) return;
    setValidating(true);
    setValidateError("");
    setRepoMeta(null);
    try {
      const res = await fetch(
        `/api/github-repos/validate?url=${encodeURIComponent(repoUrl.trim())}`
      );
      const data = await res.json();
      if (!res.ok) {
        setValidateError(data.error ?? "Failed to validate repository");
        return;
      }
      setRepoMeta(data);
      setForm((f) => ({ ...f, repoUrl: repoUrl.trim(), title: data.suggestedTitle }));
    } catch {
      setValidateError("Network error — please try again");
    } finally {
      setValidating(false);
    }
  };

  const toggleTag = (tag: string) => {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoMeta) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "projects"), {
        ownerId: userId,
        ownerName: profile.displayName,
        ownerEmail: profile.email,
        collaborators: form.collaborators
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        repoUrl: form.repoUrl,
        title: form.title,
        description: form.description,
        tags: form.tags,
        techLevel: form.techLevel,
        demoUrl: form.demoUrl || null,
        bannerUrl: null,
        githubMeta: {
          owner: repoMeta.owner,
          repo: repoMeta.repo,
          language: repoMeta.language,
          stars: repoMeta.stars,
          lastCommit: repoMeta.lastCommit,
          readmeExcerpt: repoMeta.readmeExcerpt,
        },
        status: "pending",
        featured: false,
        submittedAt: new Date().toISOString(),
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error submitting project:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Submit a Project" onClose={onClose}>
      <div className="space-y-5">
        {/* GitHub URL + Validate */}
          <div>
            <label className="block text-sm font-medium text-[#141413] mb-1.5">
              GitHub Repository URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={repoUrl}
                onChange={(e) => {
                  setRepoUrl(e.target.value);
                  setRepoMeta(null);
                  setValidateError("");
                }}
                placeholder="https://github.com/username/repo"
                className="flex-1 px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm focus:outline-none focus:border-[#d97757]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleValidate();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleValidate}
                disabled={validating || !repoUrl.trim()}
                className="px-3 py-2 text-sm bg-[#141413] text-white rounded-lg hover:bg-[#2a2a28] disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {validating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Github size={14} />
                )}
                {validating ? "Checking…" : "Validate"}
              </button>
            </div>
            {validateError && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle size={12} />
                {validateError}
              </div>
            )}
            {repoMeta && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-[#788c5d]">
                <Check size={12} />
                <span className="font-mono">
                  {repoMeta.owner}/{repoMeta.repo}
                </span>
                {repoMeta.language && (
                  <span className="text-[#b0aea5]">· {repoMeta.language}</span>
                )}
                <span className="text-[#b0aea5]">· ★ {repoMeta.stars}</span>
              </div>
            )}
          </div>

          {/* Form — shown after successful validation */}
          {repoMeta && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#141413] mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm focus:outline-none focus:border-[#d97757]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#141413] mb-1.5">
                  Description{" "}
                  <span className="text-[#b0aea5] font-normal">
                    ({form.description.length}/280)
                  </span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  maxLength={280}
                  rows={3}
                  placeholder="What does this project do? What problem does it solve?"
                  className="w-full px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm focus:outline-none focus:border-[#d97757] resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#141413] mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        form.tags.includes(tag)
                          ? "bg-[#141413] text-white border-[#141413]"
                          : "bg-white text-[#6b6860] border-[#e8e6dc] hover:border-[#d97757]/40"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#141413] mb-2">
                  Technical Level
                </label>
                <div className="flex gap-2">
                  {TECH_LEVELS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, techLevel: value }))}
                      className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${
                        form.techLevel === value
                          ? "bg-[#d97757] text-white border-[#d97757]"
                          : "bg-white text-[#6b6860] border-[#e8e6dc] hover:border-[#d97757]/40"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#141413] mb-1.5">
                  Live Demo URL{" "}
                  <span className="text-[#b0aea5] font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  value={form.demoUrl}
                  onChange={(e) => setForm((f) => ({ ...f, demoUrl: e.target.value }))}
                  placeholder="https://your-demo.vercel.app"
                  className="w-full px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm focus:outline-none focus:border-[#d97757]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#141413] mb-1.5">
                  Collaborators{" "}
                  <span className="text-[#b0aea5] font-normal">
                    (optional — PSU emails, comma-separated)
                  </span>
                </label>
                <input
                  type="text"
                  value={form.collaborators}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, collaborators: e.target.value }))
                  }
                  placeholder="abc123@psu.edu, def456@psu.edu"
                  className="w-full px-3 py-2 border border-[#e8e6dc] rounded-lg text-sm focus:outline-none focus:border-[#d97757]"
                />
              </div>

              <div className="bg-[#faf9f5] rounded-xl border border-[#e8e6dc] p-4">
                <p className="text-xs text-[#b0aea5] leading-relaxed">
                  Your project will be reviewed by a club officer before going live. You'll
                  receive an email once it's approved or if changes are needed.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm border border-[#e8e6dc] rounded-lg text-[#555555] hover:bg-[#faf9f5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !form.description.trim() || !form.title.trim()}
                  className="px-4 py-2 text-sm bg-[#d97757] text-white rounded-lg hover:bg-[#c86843] disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {submitting ? "Submitting…" : "Submit for Review"}
                </button>
              </div>
            </form>
          )}
      </div>
    </Modal>
  );
}

// ─── Filter types ─────────────────────────────────────────────────────────────

type FilterLevel = "all" | ProjectTechLevel;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [filterLevel, setFilterLevel] = useState<FilterLevel>("all");
  const [filterTag, setFilterTag] = useState<string>("all");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth");
      return;
    }

    Promise.all([
      getDocs(query(collection(db, "projects"), where("status", "==", "approved"))).catch(
        () => null
      ),
      getDoc(doc(db, "members", user.uid)),
    ])
      .then(([projectsSnap, profileSnap]) => {
        if (projectsSnap) {
          const all = projectsSnap.docs
            .map((d) => ({ id: d.id, ...d.data() } as Project))
            .sort(
              (a, b) =>
                new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
            );
          setProjects(all);
        }
        if (profileSnap.exists()) setProfile(profileSnap.data() as MemberProfile);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [authLoading, user, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#d97757]" size={28} />
      </div>
    );
  }

  const isMember = !!profile;

  const filteredProjects = projects
    .filter((p) => filterLevel === "all" || p.techLevel === filterLevel)
    .filter((p) => filterTag === "all" || p.tags.includes(filterTag));

  const featured = filteredProjects.filter((p) => p.featured);
  const rest = filteredProjects.filter((p) => !p.featured);

  return (
    <div className="min-h-screen bg-[#faf9f5]">
      {/* Hero */}
      <PageHero
        eyebrow="Member Projects"
        heading={
          <>
            Built by Penn State.
            <br />
            <span className="text-[#d97757]">Powered by Claude.</span>
          </>
        }
        description="A showcase of AI projects built by students across campus — from chatbots to research tools to creative experiments."
        action={
          <button
            onClick={() => {
              if (!isMember) {
                router.push("/settings");
              } else {
                setShowSubmit(true);
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#d97757] text-white text-sm font-medium rounded-lg hover:bg-[#c86843] transition-colors"
          >
            <Plus size={16} />
            Submit a Project
          </button>
        }
      >
        {submitted && (
          <div className="mt-6 inline-flex items-center gap-2 text-sm text-[#788c5d] bg-[#788c5d]/10 border border-[#788c5d]/20 px-4 py-2 rounded-lg">
            <Check size={14} />
            Project submitted! It&apos;ll appear here once approved by a club officer.
          </div>
        )}
      </PageHero>

      {/* Sticky filter bar */}
      <div className="sticky top-[64px] z-20 bg-[#faf9f5]/90 backdrop-blur-sm border-b border-[#e8e6dc]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {(["all", "beginner", "intermediate", "advanced"] as FilterLevel[]).map(
            (level) => (
              <button
                key={level}
                onClick={() => setFilterLevel(level)}
                className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  filterLevel === level
                    ? "bg-[#d97757] text-white border-[#d97757]"
                    : "bg-white text-[#6b6860] border-[#e8e6dc] hover:border-[#d97757]/40 hover:text-[#d97757]"
                }`}
              >
                {level === "all"
                  ? "All Levels"
                  : level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            )
          )}

          <div className="w-px h-4 bg-[#e8e6dc] shrink-0 mx-1" />

          <button
            onClick={() => setFilterTag("all")}
            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              filterTag === "all"
                ? "bg-[#141413] text-white border-[#141413]"
                : "bg-white text-[#6b6860] border-[#e8e6dc] hover:border-[#141413]/40"
            }`}
          >
            All Tags
          </button>
          {PROJECT_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? "all" : tag)}
              className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                filterTag === tag
                  ? "bg-[#141413] text-white border-[#141413]"
                  : "bg-white text-[#6b6860] border-[#e8e6dc] hover:border-[#141413]/40"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-20">
            <Github size={32} className="text-[#b0aea5] mx-auto mb-4" />
            <p className="text-[#b0aea5] text-sm mb-4">
              {projects.length === 0
                ? "No projects yet — be the first to submit one!"
                : "No projects match your current filters."}
            </p>
            {isMember && (
              <button
                onClick={() => setShowSubmit(true)}
                className="text-sm text-[#d97757] font-medium hover:underline"
              >
                Submit a project →
              </button>
            )}
          </div>
        ) : (
          <>
            {featured.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-5 bg-[#d97757] rounded-full shrink-0" />
                  <h2 className="heading text-lg font-semibold text-[#141413]">
                    Featured
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featured.map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                </div>
              </section>
            )}

            {rest.length > 0 && (
              <section>
                {featured.length > 0 && (
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-5 bg-[#e8e6dc] rounded-full shrink-0" />
                    <h2 className="heading text-lg font-semibold text-[#141413]">
                      All Projects
                      <span className="ml-2 text-xs bg-[#e8e6dc] text-[#6b6860] px-2 py-0.5 rounded-full font-medium">
                        {rest.length}
                      </span>
                    </h2>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rest.map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {showSubmit && profile && user && (
        <SubmitModal
          onClose={() => setShowSubmit(false)}
          onSuccess={() => setSubmitted(true)}
          profile={profile}
          userId={user.uid}
        />
      )}
    </div>
  );
}
