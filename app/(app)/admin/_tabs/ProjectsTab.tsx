"use client";

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Project, ProjectStatus, ProjectTechLevel } from "@/lib/types";
import {
  Loader2,
  Check,
  X,
  AlertCircle,
  Star,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<ProjectStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
  changes_requested: "bg-blue-100 text-blue-700",
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  changes_requested: "Needs Changes",
};

const LEVEL_LABELS: Record<ProjectTechLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

// ─── Project Row ──────────────────────────────────────────────────────────────

function ProjectRow({
  project,
  onUpdate,
}: {
  project: Project;
  onUpdate: (id: string, updates: Partial<Project>) => void;
}) {
  const [expanded, setExpanded] = useState(project.status === "pending");
  const [note, setNote] = useState(project.adminNote ?? "");
  const [saving, setSaving] = useState(false);

  const act = async (status: ProjectStatus) => {
    setSaving(true);
    const updates: Partial<Project> = { status, adminNote: note };
    if (status === "approved") {
      updates.approvedAt = new Date().toISOString();
      updates.adminNote = "";
    }
    try {
      await updateDoc(doc(db, "projects", project.id), updates);
      onUpdate(project.id, updates);
    } catch (err) {
      console.error("Error updating project:", err);
    } finally {
      setSaving(false);
    }
  };

  const toggleFeatured = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "projects", project.id), {
        featured: !project.featured,
      });
      onUpdate(project.id, { featured: !project.featured });
    } catch (err) {
      console.error("Error toggling featured:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-xl border transition-colors ${
        project.status === "pending" ? "border-yellow-200" : "border-[#e8e6dc]"
      }`}
    >
      {/* Collapsed header */}
      <button
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-[#141413] truncate">
              {project.title}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[project.status]}`}
            >
              {STATUS_LABELS[project.status]}
            </span>
            {project.featured && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#d97757]/10 text-[#d97757] font-medium">
                Featured
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-[#b0aea5] flex-wrap">
            <span>{project.ownerName}</span>
            <span>·</span>
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="font-mono hover:text-[#d97757] transition-colors inline-flex items-center gap-1"
            >
              {project.githubMeta.owner}/{project.githubMeta.repo}
              <ExternalLink size={10} />
            </a>
            {project.githubMeta.language && (
              <>
                <span>·</span>
                <span>{project.githubMeta.language}</span>
              </>
            )}
            <span>·</span>
            <span>{LEVEL_LABELS[project.techLevel]}</span>
          </div>
        </div>
        <div className="text-[#b0aea5] shrink-0">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-[#e8e6dc] pt-4">
          <p className="text-sm text-[#555555] leading-relaxed">{project.description}</p>

          {project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-[#b0aea5] bg-[#faf9f5] border border-[#e8e6dc] rounded-full px-2 py-0.5"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {project.githubMeta.readmeExcerpt && (
            <div className="bg-[#faf9f5] rounded-lg p-3">
              <p className="text-xs text-[#b0aea5] mb-1 font-medium">README excerpt</p>
              <p className="text-xs text-[#555555] leading-relaxed line-clamp-4">
                {project.githubMeta.readmeExcerpt}
              </p>
            </div>
          )}

          {project.demoUrl && (
            <a
              href={project.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#d97757] hover:underline font-medium"
            >
              <ExternalLink size={11} />
              View live demo
            </a>
          )}

          {/* Admin note */}
          <div>
            <label className="text-xs font-medium text-[#141413] block mb-1.5">
              Note to submitter{" "}
              <span className="text-[#b0aea5] font-normal">
                (required for Request Changes / Reject)
              </span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Explain what needs to change or why it's being rejected…"
              className="w-full px-3 py-2 border border-[#e8e6dc] rounded-lg text-xs focus:outline-none focus:border-[#d97757] resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {project.status !== "approved" && (
              <button
                onClick={() => act("approved")}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <Check size={12} />
                Approve
              </button>
            )}
            {project.status !== "changes_requested" && (
              <button
                onClick={() => act("changes_requested")}
                disabled={saving || !note.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <AlertCircle size={12} />
                Request Changes
              </button>
            )}
            {project.status !== "rejected" && (
              <button
                onClick={() => act("rejected")}
                disabled={saving || !note.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                <X size={12} />
                Reject
              </button>
            )}
            {project.status === "approved" && (
              <button
                onClick={toggleFeatured}
                disabled={saving}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50 transition-colors border ${
                  project.featured
                    ? "bg-[#d97757]/10 text-[#d97757] border-[#d97757]/30 hover:bg-[#d97757]/20"
                    : "bg-white text-[#6b6860] border-[#e8e6dc] hover:border-[#d97757]/40"
                }`}
              >
                <Star size={12} />
                {project.featured ? "Unfeature" : "Feature"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab ──────────────────────────────────────────────────────────────────────

type StatusFilter = ProjectStatus | "all";

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "changes_requested", label: "Needs Changes" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

export default function ProjectsTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "projects"), orderBy("submittedAt", "desc"))
        );
        setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project)));
      } catch (err) {
        console.error("Error loading projects:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleUpdate = (id: string, updates: Partial<Project>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const pending = projects.filter((p) => p.status === "pending");
  const filtered =
    statusFilter === "all"
      ? projects
      : projects.filter((p) => p.status === statusFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-[#d97757]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-[#141413]">
            Projects ({projects.length})
          </h2>
          {pending.length > 0 && (
            <span className="bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {pending.length} pending review
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                statusFilter === value
                  ? "bg-[#141413] text-white border-[#141413]"
                  : "bg-white text-[#6b6860] border-[#e8e6dc] hover:border-[#141413]/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-[#b0aea5]">
          No {statusFilter === "all" ? "" : STATUS_LABELS[statusFilter as ProjectStatus].toLowerCase()}{" "}
          projects.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <ProjectRow key={p.id} project={p} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
