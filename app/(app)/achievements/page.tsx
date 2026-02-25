"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, getDocs, collection, query, where, orderBy, limit as firestoreLimit } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  Award,
  Lock,
  Loader2,
  Trophy,
  ArrowRight,
  Crown,
} from "lucide-react";
import type { MemberProfile } from "@/lib/types";
import PageHero from "@/components/PageHero";
import { ACHIEVEMENTS, ACHIEVEMENT_MAP, CATEGORY_COLORS, CATEGORY_HEX, evaluateAchievements } from "@/lib/achievements";
import type { AchievementCategory } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────

type FilterKey = "all" | AchievementCategory;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "engagement", label: "Engagement" },
  { key: "community", label: "Community" },
  { key: "creator", label: "Creator" },
  { key: "special", label: "Special" },
];

interface LeaderboardEntry {
  uid: string;
  displayName: string;
  achievementPoints: number;
  achievementCount: number;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AchievementsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [earnedIds, setEarnedIds] = useState<Set<string>>(new Set());
  const [earnedDates, setEarnedDates] = useState<Record<string, string>>({});
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  // Progress context for threshold display
  const [progressCtx, setProgressCtx] = useState<{
    eventsAttended: number;
    projectsSubmitted: number;
    projectsFeatured: number;
    referralsCompleted: number;
    resourcesViewed: number;
  }>({ eventsAttended: 0, projectsSubmitted: 0, projectsFeatured: 0, referralsCompleted: 0, resourcesViewed: 0 });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/auth"); return; }
      setUser(u);

      try {
        const snap = await getDoc(doc(db, "members", u.uid));
        if (!snap.exists()) { router.push("/settings"); return; }
        const profileData = snap.data() as MemberProfile;
        setProfile(profileData);

        // Fetch earned achievements + progress data in parallel
        const [earnedSnap, attendanceSnap, projectsSnap, referralsSnap] = await Promise.all([
          getDocs(collection(db, "members", u.uid, "earnedAchievements")),
          getDocs(collection(db, "members", u.uid, "attendance")),
          getDocs(query(collection(db, "projects"), where("ownerId", "==", u.uid))),
          getDocs(query(collection(db, "referrals"), where("referrerUid", "==", u.uid), where("status", "==", "completed"))),
        ]);

        const earned = new Set<string>();
        const dates: Record<string, string> = {};
        earnedSnap.docs.forEach((d) => {
          earned.add(d.id);
          dates[d.id] = d.data().earnedAt as string;
        });
        setEarnedIds(earned);
        setEarnedDates(dates);

        const projectDocs = projectsSnap.docs.map((d) => d.data());
        setProgressCtx({
          eventsAttended: attendanceSnap.size,
          projectsSubmitted: projectDocs.length,
          projectsFeatured: projectDocs.filter((p) => p.featured).length,
          referralsCompleted: referralsSnap.size,
          resourcesViewed: profileData.resourceViews ?? 0,
        });

        // Fetch leaderboard — top 20 by achievementPoints
        const membersSnap = await getDocs(query(collection(db, "members"), where("achievementPoints", ">", 0)));
        const entries: LeaderboardEntry[] = membersSnap.docs
          .map((d) => {
            const data = d.data() as MemberProfile;
            return {
              uid: d.id,
              displayName: data.displayName || data.email?.split("@")[0] || "Member",
              achievementPoints: data.achievementPoints ?? 0,
              achievementCount: (data.achievements ?? []).length,
            };
          })
          .sort((a, b) => b.achievementPoints - a.achievementPoints)
          .slice(0, 20);
        setLeaderboard(entries);

        // Find user's rank
        const allSorted = membersSnap.docs
          .map((d) => ({ uid: d.id, points: (d.data() as MemberProfile).achievementPoints ?? 0 }))
          .sort((a, b) => b.points - a.points);
        const rank = allSorted.findIndex((e) => e.uid === u.uid);
        setUserRank(rank >= 0 ? rank + 1 : null);
      } catch (err) {
        console.error("Achievements page error:", err);
      } finally {
        setLoading(false);
        setLoadingLeaderboard(false);
      }
    });
    return unsubscribe;
  }, [router]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#d97757]" size={28} />
      </div>
    );
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const filteredAchievements = activeFilter === "all"
    ? ACHIEVEMENTS
    : ACHIEVEMENTS.filter((a) => a.category === activeFilter);

  const totalPoints = profile.achievementPoints ?? 0;
  const totalEarned = earnedIds.size;

  function getProgress(achievement: (typeof ACHIEVEMENTS)[number]): { current: number; max: number } | null {
    if (!achievement.condition) return null;
    let current = 0;
    switch (achievement.condition.type) {
      case "profile_complete": current = profile && profile.displayName && profile.major && profile.year && profile.college && profile.techLevel ? 1 : 0; break;
      case "events_attended": current = progressCtx.eventsAttended; break;
      case "projects_submitted": current = progressCtx.projectsSubmitted; break;
      case "project_featured": current = progressCtx.projectsFeatured; break;
      case "referrals_completed": current = progressCtx.referralsCompleted; break;
      case "resources_viewed": current = progressCtx.resourcesViewed; break;
    }
    return { current, max: achievement.condition.threshold };
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#faf9f5]">
      <PageHero
        eyebrow="Gamification"
        heading={
          <>
            Earn Badges,{" "}
            <span className="text-[#d97757]">Build Your Legacy</span>
          </>
        }
        description="Complete challenges, attend events, and build projects to unlock achievements and climb the leaderboard."
        statsBar={
          <div className="flex items-center gap-8 text-sm">
            <div>
              <span className="text-white font-bold">{totalPoints}</span>
              <span className="text-[#b0aea5] ml-1.5">points</span>
            </div>
            <div>
              <span className="text-white font-bold">{totalEarned}</span>
              <span className="text-[#b0aea5] ml-1.5">/ {ACHIEVEMENTS.length} badges</span>
            </div>
            {userRank && (
              <div>
                <span className="text-white font-bold">#{userRank}</span>
                <span className="text-[#b0aea5] ml-1.5">rank</span>
              </div>
            )}
          </div>
        }
      />

      {/* Filter bar */}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">

        {/* Achievement Grid */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAchievements.map((def) => {
              const isEarned = earnedIds.has(def.id);
              const colors = CATEGORY_COLORS[def.category];
              const progress = getProgress(def);
              const earnedDate = earnedDates[def.id];

              return (
                <div
                  key={def.id}
                  className={`relative bg-white rounded-2xl border p-5 flex flex-col transition-all ${
                    isEarned
                      ? "border-[#e8e6dc] hover:shadow-md"
                      : "border-[#e8e6dc] opacity-60"
                  }`}
                >
                  {/* Icon */}
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isEarned ? colors.bg : "bg-[#e8e6dc]"}`}>
                      {isEarned ? (
                        <Award size={18} className={colors.text} />
                      ) : (
                        <Lock size={16} className="text-[#b0aea5]" />
                      )}
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${isEarned ? colors.bg + " " + colors.text : "bg-[#e8e6dc] text-[#b0aea5]"}`}>
                      {def.points} pts
                    </span>
                  </div>

                  {/* Info */}
                  <h3 className={`text-sm font-semibold mb-0.5 ${isEarned ? "text-[#141413]" : "text-[#b0aea5]"}`}>
                    {def.name}
                  </h3>
                  <p className={`text-xs leading-relaxed flex-1 ${isEarned ? "text-[#555555]" : "text-[#b0aea5]"}`}>
                    {def.description}
                  </p>

                  {/* Category badge */}
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${colors.bg} ${colors.text}`}>
                      {def.category}
                    </span>
                    {def.tier && (
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${
                        def.tier === "platinum" ? "bg-[#b08d57]/10 text-[#b08d57]" :
                        def.tier === "gold" ? "bg-yellow-100 text-yellow-700" :
                        def.tier === "silver" ? "bg-gray-100 text-gray-600" :
                        "bg-orange-100 text-orange-700"
                      }`}>
                        {def.tier}
                      </span>
                    )}
                  </div>

                  {/* Progress bar or earned date */}
                  {isEarned && earnedDate ? (
                    <p className="text-[10px] text-[#b0aea5] mt-2 pt-2 border-t border-[#e8e6dc]">
                      Earned {new Date(earnedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  ) : progress && !def.condition?.type.includes("profile") ? (
                    <div className="mt-2 pt-2 border-t border-[#e8e6dc]">
                      <div className="flex items-center justify-between text-[10px] text-[#b0aea5] mb-1">
                        <span>{Math.min(progress.current, progress.max)} / {progress.max}</span>
                      </div>
                      <div className="h-1 bg-[#e8e6dc] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (progress.current / progress.max) * 100)}%`,
                            backgroundColor: CATEGORY_HEX[def.category],
                          }}
                        />
                      </div>
                    </div>
                  ) : !isEarned && def.condition === null ? (
                    <p className="text-[10px] text-[#b0aea5] mt-2 pt-2 border-t border-[#e8e6dc] italic">
                      Awarded by admin
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        {/* Leaderboard */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-5 bg-[#d97757] rounded-full shrink-0" />
            <Trophy size={16} className="text-[#d97757]" />
            <h2 className="heading text-lg font-semibold text-[#141413]">Leaderboard</h2>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e6dc] overflow-hidden">
            {loadingLeaderboard ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={18} className="animate-spin text-[#b0aea5]" />
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-10">
                <Trophy size={24} className="text-[#b0aea5] mb-3" />
                <p className="text-sm text-[#b0aea5]">No one has earned achievements yet. Be the first!</p>
              </div>
            ) : (
              <div className="divide-y divide-[#e8e6dc]">
                {leaderboard.map((entry, idx) => {
                  const isCurrentUser = entry.uid === user?.uid;
                  const rank = idx + 1;
                  return (
                    <div
                      key={entry.uid}
                      className={`flex items-center gap-4 px-5 py-3.5 ${isCurrentUser ? "bg-[#d97757]/5" : "hover:bg-[#faf9f5]"} transition-colors`}
                    >
                      {/* Rank */}
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                        rank === 1 ? "bg-[#b08d57]/15 text-[#b08d57]" :
                        rank === 2 ? "bg-gray-100 text-gray-500" :
                        rank === 3 ? "bg-orange-100 text-orange-600" :
                        "bg-[#e8e6dc] text-[#b0aea5]"
                      }`}>
                        {rank <= 3 ? <Crown size={13} /> : rank}
                      </div>

                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-[#d97757]/20 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-[#d97757]">
                          {entry.displayName.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isCurrentUser ? "text-[#d97757]" : "text-[#141413]"}`}>
                          {entry.displayName}
                          {isCurrentUser && <span className="text-[10px] ml-1.5 text-[#b0aea5]">(you)</span>}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-xs text-[#b0aea5]">{entry.achievementCount} badges</span>
                        <span className="text-sm font-bold text-[#141413]">{entry.achievementPoints} pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Current user rank if not in top 20 */}
            {userRank && userRank > 20 && (
              <div className="px-5 py-3 border-t border-[#e8e6dc] bg-[#faf9f5]">
                <p className="text-xs text-[#b0aea5] text-center">
                  Your rank: <span className="font-bold text-[#141413]">#{userRank}</span> with{" "}
                  <span className="font-bold text-[#141413]">{totalPoints} pts</span>
                </p>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
