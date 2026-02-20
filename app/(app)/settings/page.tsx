"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { User as UserIcon, Bell } from "lucide-react";
import type { MemberProfile } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const YEARS = [
  "Freshman", "Sophomore", "Junior", "Senior",
  "Graduate", "Faculty/Staff", "Alumni", "Other",
];

const COLLEGES = [
  "College of Engineering",
  "Smeal College of Business",
  "College of IST",
  "Eberly College of Science",
  "College of Liberal Arts",
  "College of Education",
  "College of Communications",
  "Penn State Law",
  "Other",
];

const INTERESTS = [
  "Learn AI/ML concepts",
  "Build AI projects",
  "Network with peers",
  "Career opportunities in AI",
  "Academic research",
  "Teaching / curriculum development",
  "Other",
];

const REFERRAL_SOURCES = [
  "Instagram",
  "GroupMe",
  "Friend / Classmate",
  "Professor / Class announcement",
  "Campus Flyer",
  "PSU Engage / Org Fair",
  "LinkedIn",
  "Other",
];

const TECH_LEVELS = [
  { value: "beginner", label: "Beginner", description: "New to AI and coding" },
  { value: "some", label: "Some experience", description: "Tried a few tools or tutorials" },
  { value: "intermediate", label: "Intermediate", description: "Comfortable with APIs and code" },
  { value: "advanced", label: "Advanced", description: "Building ML models or production apps" },
];

type Tab = "profile" | "notifications";

type FormState = Omit<MemberProfile, "uid" | "email" | "updatedAt" | "createdAt">;

const defaultForm: FormState = {
  displayName: "",
  major: "",
  year: "",
  college: "",
  techLevel: "",
  interests: [],
  emailReminders: true,
  newsletter: true,
  referralSource: "",
};

// ─── Settings Page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [form, setForm] = useState<FormState>(defaultForm);
  const [existingCreatedAt, setExistingCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/auth");
        return;
      }
      setUser(u);
      const docRef = doc(db, "members", u.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<MemberProfile>;
        setExistingCreatedAt(data.createdAt ?? null);
        setForm((prev) => ({ ...prev, ...data }));
      } else if (u.displayName) {
        setForm((prev) => ({ ...prev, displayName: u.displayName ?? "" }));
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, "members", user.uid),
        { ...form, email: user.email, uid: user.uid, updatedAt: new Date().toISOString(), createdAt: existingCreatedAt ?? new Date().toISOString() },
        { merge: true }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Error saving settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center">
        <div className="text-[#b0aea5] text-sm">Loading…</div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Profile", icon: <UserIcon size={16} /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-[#faf9f5] pt-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="heading text-2xl font-bold text-[#141413]">Settings</h1>
          <p className="text-sm text-[#b0aea5] mt-1">
            Manage your profile and notification preferences
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">

          {/* Left sidebar */}
          <aside className="md:w-52 shrink-0">
            {/* Avatar + identity */}
            <div className="flex items-center gap-3 px-3 py-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#d97757] flex items-center justify-center text-white text-sm font-bold shrink-0">
                {user?.displayName
                  ? user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                  : (user?.email ?? "?")[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#141413] truncate">
                  {user?.displayName || user?.email?.split("@")[0]}
                </p>
                <p className="text-xs text-[#b0aea5] truncate">{user?.email}</p>
              </div>
            </div>

            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                    activeTab === tab.id
                      ? "bg-[#d97757]/10 text-[#d97757]"
                      : "text-[#555555] hover:bg-[#e8e6dc] hover:text-[#141413]"
                  }`}
                >
                  <span className={activeTab === tab.id ? "text-[#d97757]" : "text-[#b0aea5]"}>
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <form onSubmit={handleSave}>

              {/* ── Profile Tab ── */}
              {activeTab === "profile" && (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="bg-white rounded-2xl border border-[#e8e6dc] p-6">
                    <h2 className="text-xs font-semibold text-[#b0aea5] uppercase tracking-wider mb-5">
                      Basic Information
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[#141413] mb-1.5">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={form.displayName}
                          onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                          placeholder="Your name"
                          className="w-full px-4 py-3 border border-[#e8e6dc] rounded-xl text-sm focus:outline-none focus:border-[#d97757] focus:ring-1 focus:ring-[#d97757]/20 bg-white text-[#141413] placeholder:text-[#b0aea5]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[#141413] mb-1.5">
                            Major
                          </label>
                          <input
                            type="text"
                            value={form.major}
                            onChange={(e) => setForm((p) => ({ ...p, major: e.target.value }))}
                            placeholder="e.g. Computer Science"
                            className="w-full px-4 py-3 border border-[#e8e6dc] rounded-xl text-sm focus:outline-none focus:border-[#d97757] focus:ring-1 focus:ring-[#d97757]/20 bg-white text-[#141413] placeholder:text-[#b0aea5]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#141413] mb-1.5">
                            Year
                          </label>
                          <select
                            value={form.year}
                            onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}
                            className="w-full px-4 py-3 border border-[#e8e6dc] rounded-xl text-sm focus:outline-none focus:border-[#d97757] bg-white text-[#141413]"
                          >
                            <option value="">Select year</option>
                            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#141413] mb-1.5">
                          College / Department
                        </label>
                        <select
                          value={form.college}
                          onChange={(e) => setForm((p) => ({ ...p, college: e.target.value }))}
                          className="w-full px-4 py-3 border border-[#e8e6dc] rounded-xl text-sm focus:outline-none focus:border-[#d97757] bg-white text-[#141413]"
                        >
                          <option value="">Select college</option>
                          {COLLEGES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#141413] mb-1.5">
                          How did you hear about us?
                        </label>
                        <select
                          value={form.referralSource ?? ""}
                          onChange={(e) => setForm((p) => ({ ...p, referralSource: e.target.value }))}
                          className="w-full px-4 py-3 border border-[#e8e6dc] rounded-xl text-sm focus:outline-none focus:border-[#d97757] bg-white text-[#141413]"
                        >
                          <option value="">Select source</option>
                          {REFERRAL_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Technical Background */}
                  <div className="bg-white rounded-2xl border border-[#e8e6dc] p-6">
                    <h2 className="text-xs font-semibold text-[#b0aea5] uppercase tracking-wider mb-5">
                      Technical Background
                    </h2>
                    <div className="space-y-3">
                      {TECH_LEVELS.map((level) => (
                        <label
                          key={level.value}
                          className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${
                            form.techLevel === level.value
                              ? "border-[#d97757] bg-[#d97757]/5"
                              : "border-[#e8e6dc] hover:border-[#d97757]/30"
                          }`}
                        >
                          <input
                            type="radio"
                            name="techLevel"
                            value={level.value}
                            checked={form.techLevel === level.value}
                            onChange={(e) =>
                              setForm((p) => ({ ...p, techLevel: e.target.value as MemberProfile["techLevel"] }))
                            }
                            className="accent-[#d97757] shrink-0"
                          />
                          <div>
                            <span className="text-sm font-medium text-[#141413]">{level.label}</span>
                            <span className="text-sm text-[#b0aea5] ml-2">— {level.description}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Interests */}
                  <div className="bg-white rounded-2xl border border-[#e8e6dc] p-6">
                    <h2 className="text-xs font-semibold text-[#b0aea5] uppercase tracking-wider mb-1">
                      What Are You Looking For?
                    </h2>
                    <p className="text-xs text-[#b0aea5] mb-5">Select all that apply</p>
                    <div className="flex flex-wrap gap-2">
                      {INTERESTS.map((interest) => (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => toggleInterest(interest)}
                          className={`px-4 py-2 text-sm rounded-full border transition-colors ${
                            form.interests.includes(interest)
                              ? "bg-[#d97757] text-white border-[#d97757]"
                              : "bg-white text-[#555555] border-[#e8e6dc] hover:border-[#d97757]/40"
                          }`}
                        >
                          {interest}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Notifications Tab ── */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-[#e8e6dc] p-6">
                    <h2 className="text-xs font-semibold text-[#b0aea5] uppercase tracking-wider mb-2">
                      Email Notifications
                    </h2>
                    <p className="text-sm text-[#b0aea5] mb-6 leading-relaxed">
                      Choose what you&apos;d like to hear about. You can update these at any time.
                    </p>

                    <div className="space-y-5">
                      {/* Event reminders */}
                      <div className="flex items-start justify-between gap-6">
                        <div>
                          <p className="text-sm font-medium text-[#141413]">Event Reminders</p>
                          <p className="text-xs text-[#b0aea5] mt-0.5 leading-relaxed">
                            Get notified before upcoming meetings, workshops, and hackathons
                            relevant to your interests and technical background.
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={form.emailReminders}
                          onClick={() => setForm((p) => ({ ...p, emailReminders: !p.emailReminders }))}
                          className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#d97757]/30 ${
                            form.emailReminders ? "bg-[#d97757]" : "bg-[#e8e6dc]"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              form.emailReminders ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="border-t border-[#e8e6dc]" />

                      {/* Newsletter */}
                      <div className="flex items-start justify-between gap-6">
                        <div>
                          <p className="text-sm font-medium text-[#141413]">Monthly Newsletter</p>
                          <p className="text-xs text-[#b0aea5] mt-0.5 leading-relaxed">
                            AI news, Claude updates, and club highlights delivered to your inbox
                            once a month. Great for students, faculty, and partner organizations.
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={form.newsletter}
                          onClick={() => setForm((p) => ({ ...p, newsletter: !p.newsletter }))}
                          className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#d97757]/30 ${
                            form.newsletter ? "bg-[#d97757]" : "bg-[#e8e6dc]"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              form.newsletter ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#faf9f5] rounded-2xl border border-[#e8e6dc] p-5">
                    <p className="text-xs text-[#b0aea5] leading-relaxed">
                      Emails are sent from <span className="text-[#141413]">club@psu.edu</span>.
                      You can unsubscribe from any email using the link in the footer.
                      We never share your email with third parties.
                    </p>
                  </div>
                </div>
              )}

              {/* Save button — shared across tabs */}
              <div className="flex items-center gap-4 mt-6">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-[#d97757] hover:bg-[#c86843] disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                {saved && (
                  <span className="text-sm text-[#788c5d] font-medium">Changes saved ✓</span>
                )}
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
