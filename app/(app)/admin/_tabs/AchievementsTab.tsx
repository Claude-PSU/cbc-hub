"use client";

import { useState, useEffect } from "react";
import { getDocs, collection, doc, setDoc, deleteDoc, getDoc, arrayUnion, arrayRemove, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  Loader2,
  Award,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  Users,
} from "lucide-react";
import type { MemberProfile } from "@/lib/types";
import { ACHIEVEMENTS, ACHIEVEMENT_MAP, CATEGORY_COLORS } from "@/lib/achievements";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MemberWithAchievements {
  uid: string;
  displayName: string;
  email: string;
  achievements: string[];
  achievementPoints: number;
}

// ─── Tab ─────────────────────────────────────────────────────────────────────

export default function AchievementsTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Achievement stats: how many members earned each
  const [achievementCounts, setAchievementCounts] = useState<Record<string, number>>({});
  const [totalMembers, setTotalMembers] = useState(0);

  // Manual award state
  const [members, setMembers] = useState<MemberWithAchievements[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberWithAchievements | null>(null);
  const [awarding, setAwarding] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const membersSnap = await getDocs(collection(db, "members"));
        const allMembers: MemberWithAchievements[] = membersSnap.docs.map((d) => {
          const data = d.data() as MemberProfile;
          return {
            uid: d.id,
            displayName: data.displayName || data.email?.split("@")[0] || "Member",
            email: data.email ?? "",
            achievements: data.achievements ?? [],
            achievementPoints: data.achievementPoints ?? 0,
          };
        });
        setMembers(allMembers);
        setTotalMembers(allMembers.length);

        // Count how many members earned each achievement
        const counts: Record<string, number> = {};
        for (const m of allMembers) {
          for (const a of m.achievements) {
            counts[a] = (counts[a] ?? 0) + 1;
          }
        }
        setAchievementCounts(counts);
      } catch (err) {
        console.error("Error loading achievements admin:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredMembers = searchQuery.length >= 2
    ? members.filter((m) =>
        m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8)
    : [];

  const handleAward = async (achievementId: string) => {
    if (!selectedMember || !user) return;
    setAwarding(achievementId);
    try {
      const def = ACHIEVEMENT_MAP.get(achievementId);
      if (!def) return;

      await Promise.all([
        setDoc(doc(db, "members", selectedMember.uid, "earnedAchievements", achievementId), {
          achievementId,
          earnedAt: new Date().toISOString(),
          awardedBy: user.uid,
        }),
        setDoc(doc(db, "members", selectedMember.uid), {
          achievements: arrayUnion(achievementId),
          achievementPoints: increment(def.points),
        }, { merge: true }),
      ]);

      // Update local state
      setSelectedMember((prev) => prev ? {
        ...prev,
        achievements: [...prev.achievements, achievementId],
        achievementPoints: prev.achievementPoints + def.points,
      } : null);
      setMembers((prev) => prev.map((m) =>
        m.uid === selectedMember.uid
          ? { ...m, achievements: [...m.achievements, achievementId], achievementPoints: m.achievementPoints + def.points }
          : m
      ));
      setAchievementCounts((prev) => ({ ...prev, [achievementId]: (prev[achievementId] ?? 0) + 1 }));
      setSuccessMsg(`Awarded "${def.name}" to ${selectedMember.displayName}`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Error awarding achievement:", err);
    } finally {
      setAwarding(null);
    }
  };

  const handleRevoke = async (achievementId: string) => {
    if (!selectedMember || !user) return;
    setRevoking(achievementId);
    try {
      const def = ACHIEVEMENT_MAP.get(achievementId);
      if (!def) return;

      await Promise.all([
        deleteDoc(doc(db, "members", selectedMember.uid, "earnedAchievements", achievementId)),
        setDoc(doc(db, "members", selectedMember.uid), {
          achievements: arrayRemove(achievementId),
          achievementPoints: increment(-def.points),
        }, { merge: true }),
      ]);

      // Update local state
      setSelectedMember((prev) => prev ? {
        ...prev,
        achievements: prev.achievements.filter((a) => a !== achievementId),
        achievementPoints: Math.max(0, prev.achievementPoints - def.points),
      } : null);
      setMembers((prev) => prev.map((m) =>
        m.uid === selectedMember.uid
          ? { ...m, achievements: m.achievements.filter((a) => a !== achievementId), achievementPoints: Math.max(0, m.achievementPoints - def.points) }
          : m
      ));
      setAchievementCounts((prev) => ({ ...prev, [achievementId]: Math.max(0, (prev[achievementId] ?? 0) - 1) }));
      setSuccessMsg(`Revoked "${def.name}" from ${selectedMember.displayName}`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Error revoking achievement:", err);
    } finally {
      setRevoking(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-[#d97757]" />
      </div>
    );
  }

  const specialAchievements = ACHIEVEMENTS.filter((a) => a.condition === null);

  return (
    <div className="space-y-10">

      {/* Manual Award Section */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-5 bg-[#d97757] rounded-full" />
          <h3 className="heading text-lg font-semibold text-[#141413]">Award Achievement</h3>
        </div>

        <div className="bg-white rounded-2xl border border-[#e8e6dc] p-6">
          {successMsg && (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-[#788c5d]/10 border border-[#788c5d]/20 rounded-xl">
              <CheckCircle size={14} className="text-[#788c5d] shrink-0" />
              <p className="text-sm text-[#788c5d]">{successMsg}</p>
            </div>
          )}

          {/* Member search */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-[#b0aea5] uppercase tracking-wider mb-2">
              Search Member
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0aea5]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.length < 2) setSelectedMember(null);
                }}
                placeholder="Search by name or email..."
                className="w-full pl-9 pr-4 py-2.5 border border-[#e8e6dc] rounded-xl text-sm focus:outline-none focus:border-[#d97757] focus:ring-1 focus:ring-[#d97757]/20 bg-white text-[#141413] placeholder:text-[#b0aea5]"
              />
            </div>

            {/* Search results */}
            {filteredMembers.length > 0 && !selectedMember && (
              <div className="mt-2 bg-white border border-[#e8e6dc] rounded-xl overflow-hidden divide-y divide-[#e8e6dc] shadow-lg">
                {filteredMembers.map((m) => (
                  <button
                    key={m.uid}
                    onClick={() => {
                      setSelectedMember(m);
                      setSearchQuery(m.displayName);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#faf9f5] transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#d97757]/20 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-[#d97757]">{m.displayName.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#141413] truncate">{m.displayName}</p>
                      <p className="text-xs text-[#b0aea5] truncate">{m.email}</p>
                    </div>
                    <span className="ml-auto text-xs text-[#b0aea5]">{m.achievements.length} badges</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected member — show awardable achievements */}
          {selectedMember && (
            <div>
              <div className="flex items-center gap-3 mb-4 px-3 py-2 bg-[#faf9f5] rounded-xl">
                <div className="w-8 h-8 rounded-full bg-[#d97757]/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-[#d97757]">{selectedMember.displayName.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#141413]">{selectedMember.displayName}</p>
                  <p className="text-xs text-[#b0aea5]">{selectedMember.achievementPoints} pts · {selectedMember.achievements.length} badges</p>
                </div>
                <button
                  onClick={() => { setSelectedMember(null); setSearchQuery(""); }}
                  className="ml-auto text-xs text-[#b0aea5] hover:text-[#d97757]"
                >
                  Clear
                </button>
              </div>

              <p className="text-xs font-semibold text-[#b0aea5] uppercase tracking-wider mb-3">Special Awards</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {specialAchievements.map((def) => {
                  const hasIt = selectedMember.achievements.includes(def.id);
                  const colors = CATEGORY_COLORS[def.category];
                  return (
                    <div
                      key={def.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                        hasIt ? "border-[#788c5d]/30 bg-[#788c5d]/5" : "border-[#e8e6dc]"
                      }`}
                    >
                      <div className={`w-8 h-8 ${colors.bg} rounded-lg flex items-center justify-center shrink-0`}>
                        <Award size={14} className={colors.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#141413]">{def.name}</p>
                        <p className="text-[10px] text-[#b0aea5]">{def.description} · {def.points} pts</p>
                      </div>
                      {hasIt ? (
                        <button
                          onClick={() => handleRevoke(def.id)}
                          disabled={revoking === def.id}
                          className="shrink-0 flex items-center gap-1 text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {revoking === def.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          Revoke
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAward(def.id)}
                          disabled={awarding === def.id}
                          className="shrink-0 flex items-center gap-1 text-xs text-[#d97757] hover:bg-[#d97757]/10 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {awarding === def.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                          Award
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Also show earned auto-achievements for revoke capability */}
              {selectedMember.achievements.filter((id) => {
                const def = ACHIEVEMENT_MAP.get(id);
                return def && def.condition !== null;
              }).length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-semibold text-[#b0aea5] uppercase tracking-wider mb-3">Earned Achievements (auto)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedMember.achievements
                      .filter((id) => { const def = ACHIEVEMENT_MAP.get(id); return def && def.condition !== null; })
                      .map((id) => {
                        const def = ACHIEVEMENT_MAP.get(id);
                        if (!def) return null;
                        const colors = CATEGORY_COLORS[def.category];
                        return (
                          <div key={id} className="flex items-center gap-3 p-3 rounded-xl border border-[#788c5d]/30 bg-[#788c5d]/5">
                            <div className={`w-8 h-8 ${colors.bg} rounded-lg flex items-center justify-center shrink-0`}>
                              <Award size={14} className={colors.text} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#141413]">{def.name}</p>
                              <p className="text-[10px] text-[#b0aea5]">{def.description} · {def.points} pts</p>
                            </div>
                            <button
                              onClick={() => handleRevoke(id)}
                              disabled={revoking === id}
                              className="shrink-0 flex items-center gap-1 text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {revoking === id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                              Revoke
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Achievement Stats */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-5 bg-[#d97757] rounded-full" />
          <h3 className="heading text-lg font-semibold text-[#141413]">Achievement Distribution</h3>
        </div>

        <div className="bg-white rounded-2xl border border-[#e8e6dc] p-6">
          <div className="space-y-3">
            {ACHIEVEMENTS.map((def) => {
              const count = achievementCounts[def.id] ?? 0;
              const pct = totalMembers > 0 ? (count / totalMembers) * 100 : 0;
              const colors = CATEGORY_COLORS[def.category];
              return (
                <div key={def.id} className="flex items-center gap-3">
                  <div className={`w-7 h-7 ${colors.bg} rounded-lg flex items-center justify-center shrink-0`}>
                    <Award size={12} className={colors.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-[#141413] truncate">{def.name}</p>
                      <span className="text-xs text-[#b0aea5] shrink-0 ml-2">
                        {count} / {totalMembers} ({Math.round(pct)}%)
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#e8e6dc] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all`}
                        style={{
                          width: `${pct}%`,
                          backgroundColor: def.category === "engagement" ? "#d97757" : def.category === "community" ? "#6a9bcc" : def.category === "creator" ? "#788c5d" : "#b08d57",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
