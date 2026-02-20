"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import ClubLogo from "@/components/ClubLogo";

async function getRedirectPath(uid: string): Promise<string> {
  const snap = await getDoc(doc(db, "members", uid));
  return snap.exists() ? "/dashboard" : "/settings";
}

type Mode = "signin" | "signup";

const GOOGLE_LOGO = (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
    <path
      d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908C16.657 14.153 17.64 11.845 17.64 9.2z"
      fill="#4285F4"
    />
    <path
      d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
      fill="#34A853"
    />
    <path
      d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      fill="#FBBC05"
    />
    <path
      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"
      fill="#EA4335"
    />
  </svg>
);

const perks = [
  { icon: "📅", text: "RSVP to events and workshops" },
  { icon: "📚", text: "Access exclusive resources and materials" },
  { icon: "🔔", text: "Get personalized meeting reminders" },
  { icon: "💻", text: "Showcase your projects to the community" },
];

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const formatError = (err: unknown) => {
    if (err instanceof Error) {
      return err.message
        .replace("Firebase: ", "")
        .replace(/\(auth\/[^)]+\)\.?/, "")
        .trim();
    }
    return "Something went wrong. Please try again.";
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "signup" && !email.toLowerCase().endsWith("@psu.edu")) {
      setError("Please use your Penn State email address (@psu.edu) to sign up.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        router.push(await getRedirectPath(cred.user.uid));
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        router.push(await getRedirectPath(cred.user.uid));
      }
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ hd: "psu.edu" });
      const cred = await signInWithPopup(auth, provider);
      router.push(await getRedirectPath(cred.user.uid));
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f5] flex">
      {/* Left panel — dark branding */}
      <div className="hidden lg:flex lg:w-5/12 bg-[#141413] flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Subtle glow orbs */}
        <div className="absolute top-1/4 -left-16 w-64 h-64 bg-[#d97757]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-16 w-64 h-64 bg-[#6a9bcc]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-sm w-full">
          {/* Logo */}
          <div className="mb-12">
            <ClubLogo size="md" variant="light" />
          </div>

          {/* Headline */}
          <h2 className="heading text-3xl font-bold text-white mb-3 leading-tight">
            {mode === "signup" ? (
              <>Join Penn State&apos;s<br />AI Community</>
            ) : (
              <>Welcome<br />Back</>
            )}
          </h2>
          <p className="body-editorial text-[#b0aea5] text-sm leading-relaxed mb-10">
            {mode === "signup"
              ? "Create your account to access events, resources, and connect with the Claude Builder Club."
              : "Sign in to manage your profile, RSVP to events, and access member resources."}
          </p>

          {/* Perks list */}
          <div className="space-y-3">
            {perks.map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <span className="w-8 h-8 bg-[#d97757]/10 border border-[#d97757]/20 rounded-lg flex items-center justify-center text-sm shrink-0">
                  {item.icon}
                </span>
                <span className="text-sm text-[#b0aea5]">{item.text}</span>
              </div>
            ))}
          </div>

          {/* Anthropic attribution */}
          <div className="mt-12 pt-8 border-t border-white/10 flex items-center gap-2">
            <Image
              src="/branding/anthropic_icon.png"
              alt="Anthropic"
              width={16}
              height={16}
              className="brightness-0 invert opacity-30"
            />
            <span className="text-xs text-white/30">Powered by Claude</span>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo (shown on small screens) */}
          <div className="lg:hidden mb-8">
            <ClubLogo size="sm" variant="dark" />
          </div>

          <Link
            href="/"
            className="text-sm text-[#b0aea5] hover:text-[#141413] flex items-center gap-2 mb-8 transition-colors"
          >
            ← Back to home
          </Link>

          <h1 className="heading text-2xl font-bold text-[#141413] mb-1">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-[#b0aea5] mb-8">
            {mode === "signin"
              ? "Sign in to your Claude Builder Club account"
              : "Join Penn State's AI community today"}
          </p>

          {/* Google */}
          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-[#e8e6dc] rounded-xl text-sm font-medium text-[#141413] hover:bg-[#e8e6dc] transition-colors disabled:opacity-50 mb-6"
          >
            {GOOGLE_LOGO}
            Continue with Google (PSU)
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#e8e6dc]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-[#faf9f5] text-xs text-[#b0aea5]">
                or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#141413] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@psu.edu"
                required
                className="w-full px-4 py-3 border border-[#e8e6dc] rounded-xl text-sm focus:outline-none focus:border-[#d97757] focus:ring-1 focus:ring-[#d97757]/20 bg-white text-[#141413] placeholder:text-[#b0aea5]"
              />
              {mode === "signup" && (
                <p className="mt-1.5 text-xs text-[#b0aea5]">
                  Must be a Penn State address ending in <span className="font-medium text-[#141413]">@psu.edu</span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#141413] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-4 py-3 border border-[#e8e6dc] rounded-xl text-sm focus:outline-none focus:border-[#d97757] focus:ring-1 focus:ring-[#d97757]/20 bg-white text-[#141413]"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#d97757] hover:bg-[#c86843] disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {loading
                ? "Please wait…"
                : mode === "signin"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-[#b0aea5] mt-6">
            {mode === "signin"
              ? "Don't have an account? "
              : "Already have an account? "}
            <button
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError("");
              }}
              className="text-[#d97757] hover:underline font-medium"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
