"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import type { MemberProfile } from "@/lib/types";
import { Loader2, Trash2, Shield, Search } from "lucide-react";

export default function UsersTab({ currentUserUid }: { currentUserUid: string }) {
  const [members, setMembers] = useState<(MemberProfile & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [promoting, setPromoting] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "members"));
        const membersList = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as MemberProfile & { id: string }))
          .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        setMembers(membersList);
      } catch (err) {
        console.error("Error loading members:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePromoteAdmin = async (uid: string, currentlyAdmin: boolean) => {
    setPromoting(uid);
    try {
      await updateDoc(doc(db, "members", uid), { isAdmin: !currentlyAdmin });
      setMembers((prev) =>
        prev.map((m) => (m.id === uid ? { ...m, isAdmin: !currentlyAdmin } : m))
      );
    } catch (err) {
      console.error("Error updating admin status:", err);
    } finally {
      setPromoting(null);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!confirm(`Delete user ${uid}? This cannot be undone.`)) return;

    setDeleting(uid);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error("Unable to get auth token");
      }

      const response = await fetch("/api/admin/delete-user", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uid }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete user");
      }

      setMembers((prev) => prev.filter((m) => m.id !== uid));
    } catch (err) {
      console.error("Error deleting user:", err);
      alert(`Error: ${(err as Error).message}`);
    } finally {
      setDeleting(null);
    }
  };

  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase();
    return (
      m.displayName.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.college.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-[#d97757]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#141413]">Members ({members.length})</h2>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-3 text-[#b0aea5]" />
        <input
          type="text"
          placeholder="Search by name, email, or college…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-[#e8e6dc] rounded-lg text-sm"
        />
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-2xl border border-[#e8e6dc] overflow-hidden">
        {filteredMembers.length === 0 ? (
          <div className="p-8 text-center text-[#b0aea5]">
            {searchQuery ? "No members match your search." : "No members yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#faf9f5] border-b border-[#e8e6dc]">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-[#555555]">Name</th>
                  <th className="px-6 py-3 text-left font-semibold text-[#555555]">Email</th>
                  <th className="px-6 py-3 text-left font-semibold text-[#555555]">Year</th>
                  <th className="px-6 py-3 text-left font-semibold text-[#555555]">College</th>
                  <th className="px-6 py-3 text-left font-semibold text-[#555555]">Tech Level</th>
                  <th className="px-6 py-3 text-left font-semibold text-[#555555]">Joined</th>
                  <th className="px-6 py-3 text-left font-semibold text-[#555555]">Admin</th>
                  <th className="px-6 py-3 text-right font-semibold text-[#555555]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e6dc]">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-[#faf9f5] transition-colors">
                    <td className="px-6 py-4 text-[#141413] font-medium">{member.displayName}</td>
                    <td className="px-6 py-4 text-[#b0aea5] text-xs">{member.email}</td>
                    <td className="px-6 py-4 text-[#b0aea5] text-sm">{member.year || "—"}</td>
                    <td className="px-6 py-4 text-[#b0aea5] text-sm">{member.college || "—"}</td>
                    <td className="px-6 py-4 text-[#b0aea5] text-sm capitalize">{member.techLevel || "—"}</td>
                    <td className="px-6 py-4 text-[#b0aea5] text-sm">
                      {member.createdAt
                        ? new Date(member.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-6 py-4">
                      {member.isAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#d97757]/10 text-[#d97757] text-xs font-medium rounded">
                          <Shield size={12} />
                          Admin
                        </span>
                      ) : (
                        <span className="text-[#b0aea5] text-xs">Member</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => handlePromoteAdmin(member.id, !!member.isAdmin)}
                        disabled={promoting === member.id}
                        className="px-3 py-1 text-xs border border-[#d97757] text-[#d97757] rounded hover:bg-[#d97757]/5 disabled:opacity-60"
                      >
                        {promoting === member.id
                          ? "..."
                          : member.isAdmin
                            ? "Demote"
                            : "Promote"}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(member.id)}
                        disabled={member.id === currentUserUid || deleting === member.id}
                        className={`p-2 ${
                          member.id === currentUserUid
                            ? "text-[#b0aea5] cursor-not-allowed"
                            : "text-red-500 hover:bg-red-50"
                        } rounded`}
                        title={member.id === currentUserUid ? "Cannot delete your own account" : "Delete"}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
