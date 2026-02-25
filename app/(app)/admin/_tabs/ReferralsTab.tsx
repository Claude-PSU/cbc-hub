"use client";

import { useState, useEffect } from "react";
import { getDocs, collection, query, where, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  Loader2,
  UserPlus,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  Users,
  AlertTriangle,
} from "lucide-react";
import type { MemberProfile, Referral } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReferrerSummary {
  uid: string;
  displayName: string;
  referralCode: string;
  total: number;
  completed: number;
  pending: number;
}

const STATUS_STYLES: Record<string, { label: string; Icon: typeof CheckCircle; text: string; bg: string }> = {
  completed: { label: "Completed", Icon: CheckCircle, text: "text-[#788c5d]", bg: "bg-[#788c5d]/10" },
  pending: { label: "Pending", Icon: Clock, text: "text-amber-600", bg: "bg-amber-50" },
  invalidated: { label: "Invalidated", Icon: XCircle, text: "text-red-500", bg: "bg-red-50" },
};

// ─── Tab ─────────────────────────────────────────────────────────────────────

export default function ReferralsTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<(Referral & { referrerName?: string; referredName?: string })[]>([]);
  const [leaderboard, setLeaderboard] = useState<ReferrerSummary[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, conversionRate: 0 });
  const [invalidating, setInvalidating] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [referralsSnap, membersSnap] = await Promise.all([
          getDocs(collection(db, "referrals")),
          getDocs(collection(db, "members")),
        ]);

        const memberMap = new Map<string, MemberProfile>();
        membersSnap.docs.forEach((d) => memberMap.set(d.id, d.data() as MemberProfile));

        const allReferrals = referralsSnap.docs.map((d) => {
          const data = d.data() as Referral;
          return {
            ...data,
            id: d.id,
            referrerName: memberMap.get(data.referrerUid)?.displayName ?? data.referrerUid,
            referredName: memberMap.get(data.referredUid)?.displayName ?? data.referredEmail,
          };
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setReferrals(allReferrals);

        // Stats
        const completed = allReferrals.filter((r) => r.status === "completed").length;
        const pending = allReferrals.filter((r) => r.status === "pending").length;
        setStats({
          total: allReferrals.length,
          completed,
          pending,
          conversionRate: allReferrals.length > 0 ? Math.round((completed / allReferrals.length) * 100) : 0,
        });

        // Leaderboard
        const referrerMap = new Map<string, ReferrerSummary>();
        for (const ref of allReferrals) {
          if (ref.status === "invalidated") continue;
          const existing = referrerMap.get(ref.referrerUid);
          if (existing) {
            existing.total++;
            if (ref.status === "completed") existing.completed++;
            if (ref.status === "pending") existing.pending++;
          } else {
            const member = memberMap.get(ref.referrerUid);
            referrerMap.set(ref.referrerUid, {
              uid: ref.referrerUid,
              displayName: member?.displayName ?? ref.referrerUid,
              referralCode: member?.referralCode ?? "",
              total: 1,
              completed: ref.status === "completed" ? 1 : 0,
              pending: ref.status === "pending" ? 1 : 0,
            });
          }
        }
        const sorted = [...referrerMap.values()].sort((a, b) => b.completed - a.completed);
        setLeaderboard(sorted);
      } catch (err) {
        console.error("Error loading referrals:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleInvalidate = async (referralId: string) => {
    if (!user) return;
    setInvalidating(referralId);
    try {
      await updateDoc(doc(db, "referrals", referralId), {
        status: "invalidated",
        invalidatedAt: new Date().toISOString(),
        invalidatedBy: user.uid,
      });
      setReferrals((prev) =>
        prev.map((r) => r.id === referralId ? { ...r, status: "invalidated" as const } : r)
      );
      // Recalculate stats
      setStats((prev) => ({
        ...prev,
        total: prev.total,
        completed: prev.completed - (referrals.find((r) => r.id === referralId)?.status === "completed" ? 1 : 0),
        pending: prev.pending - (referrals.find((r) => r.id === referralId)?.status === "pending" ? 1 : 0),
      }));
    } catch (err) {
      console.error("Error invalidating referral:", err);
    } finally {
      setInvalidating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-[#d97757]" />
      </div>
    );
  }

  return (
    <div className="space-y-10">

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Referrals", value: stats.total, Icon: Users, color: "text-[#6a9bcc]", bg: "bg-[#6a9bcc]/10" },
          { label: "Completed", value: stats.completed, Icon: CheckCircle, color: "text-[#788c5d]", bg: "bg-[#788c5d]/10" },
          { label: "Pending", value: stats.pending, Icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Conversion Rate", value: `${stats.conversionRate}%`, Icon: TrendingUp, color: "text-[#d97757]", bg: "bg-[#d97757]/10" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-[#e8e6dc] p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center`}>
                <stat.Icon size={16} className={stat.color} />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#141413]">{stat.value}</p>
            <p className="text-xs text-[#b0aea5] mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Leaderboard */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-5 bg-[#d97757] rounded-full" />
          <h3 className="heading text-lg font-semibold text-[#141413]">Referral Leaderboard</h3>
        </div>

        <div className="bg-white rounded-2xl border border-[#e8e6dc] overflow-hidden">
          {leaderboard.length === 0 ? (
            <div className="text-center py-10 text-sm text-[#b0aea5]">No referrals yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e8e6dc] text-left">
                    <th className="px-5 py-3 text-xs font-semibold text-[#b0aea5] uppercase tracking-wider">#</th>
                    <th className="px-5 py-3 text-xs font-semibold text-[#b0aea5] uppercase tracking-wider">Member</th>
                    <th className="px-5 py-3 text-xs font-semibold text-[#b0aea5] uppercase tracking-wider">Code</th>
                    <th className="px-5 py-3 text-xs font-semibold text-[#b0aea5] uppercase tracking-wider text-right">Total</th>
                    <th className="px-5 py-3 text-xs font-semibold text-[#b0aea5] uppercase tracking-wider text-right">Completed</th>
                    <th className="px-5 py-3 text-xs font-semibold text-[#b0aea5] uppercase tracking-wider text-right">Pending</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e6dc]">
                  {leaderboard.map((entry, idx) => (
                    <tr key={entry.uid} className="hover:bg-[#faf9f5] transition-colors">
                      <td className="px-5 py-3 text-[#b0aea5] font-medium">{idx + 1}</td>
                      <td className="px-5 py-3 font-medium text-[#141413]">{entry.displayName}</td>
                      <td className="px-5 py-3 font-mono text-xs text-[#b0aea5]">{entry.referralCode}</td>
                      <td className="px-5 py-3 text-right text-[#141413]">{entry.total}</td>
                      <td className="px-5 py-3 text-right text-[#788c5d] font-medium">{entry.completed}</td>
                      <td className="px-5 py-3 text-right text-amber-600">{entry.pending}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* All Referrals List */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-5 bg-[#d97757] rounded-full" />
          <h3 className="heading text-lg font-semibold text-[#141413]">All Referrals</h3>
          <span className="text-xs bg-[#e8e6dc] text-[#6b6860] px-2 py-0.5 rounded-full font-medium">{referrals.length}</span>
        </div>

        <div className="bg-white rounded-2xl border border-[#e8e6dc] overflow-hidden">
          {referrals.length === 0 ? (
            <div className="text-center py-10 text-sm text-[#b0aea5]">No referrals recorded yet.</div>
          ) : (
            <div className="divide-y divide-[#e8e6dc]">
              {referrals.map((ref) => {
                const statusCfg = STATUS_STYLES[ref.status] ?? STATUS_STYLES.pending;
                const StatusIcon = statusCfg.Icon;
                return (
                  <div key={ref.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#faf9f5] transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-[#141413] truncate">
                          {ref.referredName}
                        </p>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${statusCfg.bg} ${statusCfg.text}`}>
                          <StatusIcon size={10} />
                          {statusCfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-[#b0aea5]">
                        Referred by <span className="font-medium text-[#555555]">{ref.referrerName}</span>
                        {" · "}
                        {new Date(ref.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>

                    {ref.status !== "invalidated" && (
                      <button
                        onClick={() => handleInvalidate(ref.id)}
                        disabled={invalidating === ref.id}
                        className="shrink-0 flex items-center gap-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {invalidating === ref.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <AlertTriangle size={12} />
                        )}
                        Invalidate
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
