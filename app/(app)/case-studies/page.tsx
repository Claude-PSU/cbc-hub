"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, GraduationCap, Users } from "lucide-react";
import PageHero from "@/components/PageHero";
import type { CaseStudy } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uniqueSemesters(studies: CaseStudy[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of studies) {
    if (!seen.has(s.semester)) {
      seen.add(s.semester);
      out.push(s.semester);
    }
  }
  return out;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  label,
  count,
  sublabel,
  icon,
}: {
  label: string;
  count: number;
  sublabel?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
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

function AcademicCard({ study }: { study: CaseStudy }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e8e6dc] overflow-hidden flex flex-col hover:shadow-md hover:border-[#d97757]/30 transition-all duration-200">
      {/* Image */}
      {study.image && (
        <div className="w-full h-48 overflow-hidden bg-[#faf9f5]">
          <img
            src={study.image}
            alt={study.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-6 flex flex-col flex-1">
        {/* Top row: course badge + semester */}
        <div className="flex items-center justify-between gap-2 mb-4">
        {study.course && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#d97757] bg-[#d97757]/10 border border-[#d97757]/20 rounded-full px-3 py-1">
            {study.course}
          </span>
        )}
        <span className="text-xs text-[#b0aea5] bg-[#faf9f5] border border-[#e8e6dc] rounded-full px-2.5 py-1 ml-auto">
          {study.semester}
        </span>
      </div>

      {/* Professor + department */}
      {(study.professor || study.department) && (
        <p className="text-xs text-[#b0aea5] mb-2">
          {[study.professor, study.department].filter(Boolean).join(" · ")}
        </p>
      )}

      {/* Title */}
      <h3 className="heading font-semibold text-[#141413] text-base leading-snug mb-3">
        {study.title}
      </h3>

      {/* Course title if present */}
      {study.courseTitle && (
        <p className="text-xs text-[#b0aea5] italic mb-3">{study.courseTitle}</p>
      )}

      {/* Description */}
      <p className="body-editorial text-sm text-[#6b6860] leading-relaxed mb-4 flex-1">
        {study.description}
      </p>

      {/* Outcomes */}
      {study.outcomes.length > 0 && (
        <ul className="space-y-1.5 mb-4">
          {study.outcomes.slice(0, 3).map((outcome, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[#555555]">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#788c5d] shrink-0" />
              {outcome}
            </li>
          ))}
        </ul>
      )}

      {/* Footer: tools + student count */}
      <div className="border-t border-[#e8e6dc] pt-4 mt-auto">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex flex-wrap gap-1.5">
            {study.tools.slice(0, 3).map((tool) => (
              <span
                key={tool}
                className="text-xs text-[#b0aea5] bg-[#faf9f5] border border-[#e8e6dc] rounded-full px-2 py-0.5"
              >
                {tool}
              </span>
            ))}
          </div>
          {study.studentCount && (
            <span className="inline-flex items-center gap-1 text-xs text-[#b0aea5]">
              <Users size={11} />
              {study.studentCount} students
            </span>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

function ClubCard({ study }: { study: CaseStudy }) {
  return (
    <div className="bg-[#faf9f5] rounded-2xl border border-[#e8e6dc] overflow-hidden flex flex-col hover:shadow-md hover:border-[#788c5d]/30 transition-all duration-200">
      {/* Image */}
      {study.image && (
        <div className="w-full h-40 overflow-hidden bg-[#faf9f5]">
          <img
            src={study.image}
            alt={study.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        {/* Org name + type */}
        <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="heading font-semibold text-[#141413] text-sm">
            {study.orgName ?? "Partner Organization"}
          </p>
          {study.orgType && (
            <p className="text-xs text-[#b0aea5] mt-0.5">{study.orgType}</p>
          )}
        </div>
        <span className="text-xs text-[#b0aea5] bg-white border border-[#e8e6dc] rounded-full px-2.5 py-1 shrink-0">
          {study.semester}
        </span>
      </div>

      {/* Title */}
      <h3 className="heading font-semibold text-[#141413] text-sm leading-snug mb-2">
        {study.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-[#6b6860] leading-relaxed line-clamp-3 mb-4 flex-1">
        {study.description}
      </p>

      {/* Tools */}
      <div className="flex flex-wrap gap-1.5">
        {study.tools.slice(0, 3).map((tool) => (
          <span
            key={tool}
            className="text-xs text-[#788c5d] bg-[#788c5d]/10 border border-[#788c5d]/20 rounded-full px-2 py-0.5"
          >
            {tool}
          </span>
        ))}
      </div>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="col-span-full bg-white rounded-2xl border border-[#e8e6dc] p-12 text-center">
      <p className="text-sm text-[#b0aea5]">
        No {label} yet — check back soon.
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CaseStudiesPage() {
  const [studies, setStudies] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSemester, setActiveSemester] = useState<string>("all");

  useEffect(() => {
    getDocs(query(collection(db, "case-studies"), where("published", "==", true)))
      .then((snap) => {
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as CaseStudy))
          .sort((a, b) => a.order - b.order);
        setStudies(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const academic = studies.filter((s) => s.type === "academic");
  const club = studies.filter((s) => s.type === "club");

  const semesters = uniqueSemesters(academic);

  const filteredAcademic =
    activeSemester === "all"
      ? academic
      : academic.filter((s) => s.semester === activeSemester);

  // Stats
  const totalStudents = studies.reduce((sum, s) => sum + (s.studentCount ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#faf9f5]">
      {/* ── Hero ── */}
      <PageHero
        eyebrow="Impact & Partnerships"
        heading={
          <>
            AI in the Classroom
            <br />
            <span className="text-[#d97757]">& Beyond</span>
          </>
        }
        description="From semester-long course integrations to cross-club collaborations, here's how the Claude Builder Club is embedding AI across Penn State."
        statsBar={
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-[#b0aea5]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d97757] inline-block" />
              <span>
                <span className="text-white font-medium">{academic.length}</span> courses integrated
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#b0aea5]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#788c5d] inline-block" />
              <span>
                <span className="text-white font-medium">{club.length}</span> club partnerships
              </span>
            </div>
            {totalStudents > 0 && (
              <div className="flex items-center gap-2 text-sm text-[#b0aea5]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6a9bcc] inline-block" />
                <span>
                  <span className="text-white font-medium">{totalStudents}+</span> students reached
                </span>
              </div>
            )}
          </div>
        }
      />

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 size={28} className="animate-spin text-[#b0aea5]" />
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-16">

          {/* ── Section A: Academic Integrations ── */}
          <section>
            <SectionHeader
              label="Course Integrations"
              count={academic.length}
              sublabel="Penn State courses where professors embedded Claude-powered AI projects into their syllabi."
              icon={<GraduationCap size={16} className="text-[#d97757]" />}
            />

            {/* Semester filter chips */}
            {semesters.length > 1 && (
              <div className="flex items-center gap-2 flex-wrap mb-6">
                {["all", ...semesters].map((sem) => (
                  <button
                    key={sem}
                    onClick={() => setActiveSemester(sem)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                      activeSemester === sem
                        ? "bg-[#d97757] text-white border-[#d97757]"
                        : "bg-white text-[#6b6860] border-[#e8e6dc] hover:border-[#d97757]/40 hover:text-[#d97757]"
                    }`}
                  >
                    {sem === "all" ? "All Semesters" : sem}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredAcademic.length > 0
                ? filteredAcademic.map((s) => <AcademicCard key={s.id} study={s} />)
                : <EmptyState label="course integrations" />}
            </div>
          </section>

          {/* ── Section B: Club Collaborations ── */}
          <section>
            <SectionHeader
              label="Club Collaborations"
              count={club.length}
              sublabel="Highlights from our partnerships with other Penn State student organizations."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {club.length > 0
                ? club.map((s) => <ClubCard key={s.id} study={s} />)
                : <EmptyState label="club collaborations" />}
            </div>
          </section>

          {/* ── Bottom CTA ── */}
          <div className="bg-[#141413] rounded-2xl p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h3 className="heading text-lg font-semibold text-white mb-1">
                Want to collaborate?
              </h3>
              <p className="text-sm text-[#b0aea5]">
                We partner with faculty and student orgs to bring AI education to
                every corner of Penn State.
              </p>
            </div>
            <div className="flex gap-3 shrink-0 flex-wrap">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-[#d97757] hover:bg-[#c86843] text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
              >
                Partner with Us →
              </Link>
              <Link
                href="/resources"
                className="inline-flex items-center gap-2 border border-white/20 hover:border-white/40 text-white/70 hover:text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
              >
                Explore Resources
              </Link>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
