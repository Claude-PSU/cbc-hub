"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import type { MemberProfile, MemberRole } from "@/lib/types";
import { MEMBER_ROLES } from "@/lib/types";
import { Loader2, Trash2, Search, ChevronDown } from "lucide-react";

const ROLE_STYLES: Record<MemberRole, string> = {
  Admin: "bg-[#d97757]/10 text-[#d97757] border border-[#d97757]/20",
  "Executive Board Member": "bg-blue-50 text-blue-700 border border-blue-200",
  "General Member": "bg-green-50 text-green-700 border border-green-200",
};

export default function UsersTab({ currentUserUid }: { currentUserUid: string }) {
  const [members, setMembers] = useState<(MemberProfile & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [updatingRoles, setUpdatingRoles] = useState<string | null>(null);
  const [openRolePicker, setOpenRolePicker] = useState<string | null>(null);

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

  // Close role picker on outside click
  useEffect(() => {
    if (!openRolePicker) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`[data-role-picker="${openRolePicker}"]`)) {
        setOpenRolePicker(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openRolePicker]);

  const handleToggleRole = async (uid: string, role: MemberRole, checked: boolean) => {
    setUpdatingRoles(uid);
    try {
      const member = members.find((m) => m.id === uid);
      if (!member) return;

      const currentRoles = member.roles ?? [];
      const newRoles: MemberRole[] = checked
        ? ([...new Set([...currentRoles, role])] as MemberRole[])
        : currentRoles.filter((r) => r !== role);

      const updates: Partial<MemberProfile> = { roles: newRoles };
      // Keep isAdmin in sync with the Admin role
      if (role === "Admin") {
        updates.isAdmin = checked;
      }

      await updateDoc(doc(db, "members", uid), updates);
      setMembers((prev) =>
        prev.map((m) => (m.id === uid ? { ...m, ...updates } : m))
      );
    } catch (err) {
      console.error("Error updating roles:", err);
    } finally {
      setUpdatingRoles(null);
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
    const q = String(searchQuery).toLowerCase();
    return (
      m.displayName?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.college?.toLowerCase().includes(q)
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
                  <th className="px-6 py-3 text-left font-semibold text-[#555555]">Role</th>
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

                    {/* Role column */}
                    <td className="px-6 py-4">
                      {member.roles && member.roles.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {member.roles.map((role) => (
                            <span
                              key={role}
                              className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded ${ROLE_STYLES[role]}`}
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#b0aea5] text-xs">—</span>
                      )}
                    </td>

                    {/* Actions column */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Role picker dropdown */}
                        <div className="relative" data-role-picker={member.id}>
                          <button
                            onClick={() =>
                              setOpenRolePicker(openRolePicker === member.id ? null : member.id)
                            }
                            className="px-3 py-1 text-xs border border-[#e8e6dc] text-[#555555] rounded hover:bg-[#faf9f5] flex items-center gap-1 whitespace-nowrap"
                          >
                            Roles
                            <ChevronDown size={12} />
                          </button>
                          {openRolePicker === member.id && (
                            <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-[#e8e6dc] rounded-lg shadow-lg z-20 py-1">
                              {MEMBER_ROLES.map((role) => {
                                const hasRole =
                                  member.roles?.includes(role) ??
                                  (role === "Admin" && !!member.isAdmin);
                                return (
                                  <label
                                    key={role}
                                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#faf9f5] cursor-pointer select-none"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={!!hasRole}
                                      disabled={updatingRoles === member.id}
                                      onChange={(e) =>
                                        handleToggleRole(member.id, role, e.target.checked)
                                      }
                                      className="accent-[#d97757] w-3.5 h-3.5"
                                    />
                                    <span className="text-xs text-[#141413]">{role}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteUser(member.id)}
                          disabled={member.id === currentUserUid || deleting === member.id}
                          className={`p-2 ${
                            member.id === currentUserUid
                              ? "text-[#b0aea5] cursor-not-allowed"
                              : "text-red-500 hover:bg-red-50"
                          } rounded`}
                          title={
                            member.id === currentUserUid
                              ? "Cannot delete your own account"
                              : "Delete"
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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
