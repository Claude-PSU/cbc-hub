"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { MemberProfile } from "@/lib/types";
import { Loader2, BarChart3, Settings2, Users, Calendar, Zap } from "lucide-react";
import OverviewTab from "./_tabs/OverviewTab";
import ResourcesTab from "./_tabs/ResourcesTab";
import CaseStudiesTab from "./_tabs/CaseStudiesTab";
import UsersTab from "./_tabs/UsersTab";
import EventsTab from "./_tabs/EventsTab";

type TabType = "overview" | "resources" | "case-studies" | "users" | "events";

const TABS: { id: TabType; label: string; icon: React.ReactNode; description: string }[] = [
  { id: "overview", label: "Overview", icon: <BarChart3 size={18} />, description: "Club metrics & growth" },
  { id: "resources", label: "Resources", icon: <Zap size={18} />, description: "Manage learning materials" },
  { id: "case-studies", label: "Case Studies", icon: <Settings2 size={18} />, description: "Manage case studies" },
  { id: "users", label: "Users", icon: <Users size={18} />, description: "Member management" },
  { id: "events", label: "Events", icon: <Calendar size={18} />, description: "Event tracking" },
];

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/auth");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "members", u.uid));
        if (!snap.exists()) {
          router.push("/settings");
          return;
        }

        const profileData = snap.data() as MemberProfile;

        // Check if user is admin
        if (!profileData.isAdmin) {
          router.push("/dashboard");
          return;
        }

        setUser(u);
        setProfile(profileData);
      } catch (err) {
        console.error("Error loading admin profile:", err);
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [router]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={28} className="animate-spin text-[#d97757] mx-auto mb-3" />
          <p className="text-sm text-[#b0aea5]">Loading admin dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f5]">
      {/* Header */}
      <section className="bg-[#141413] relative overflow-hidden">
        <div className="absolute top-0 -left-24 w-80 h-80 bg-[#d97757]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#6a9bcc]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#d97757]/20 rounded-lg flex items-center justify-center">
              <BarChart3 size={20} className="text-[#d97757]" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white heading">Admin Dashboard</h1>
          </div>
          <p className="text-[#b0aea5] text-sm max-w-2xl">Manage club content, members, and track growth metrics.</p>
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="sticky top-16 z-20 bg-white border-b border-[#e8e6dc]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-all whitespace-nowrap text-sm font-medium ${
                  activeTab === tab.id
                    ? "border-[#d97757] text-[#141413]"
                    : "border-transparent text-[#b0aea5] hover:text-[#555555]"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "resources" && <ResourcesTab />}
        {activeTab === "case-studies" && <CaseStudiesTab />}
        {activeTab === "users" && <UsersTab currentUserUid={user!.uid} />}
        {activeTab === "events" && <EventsTab />}
      </div>
    </div>
  );
}
