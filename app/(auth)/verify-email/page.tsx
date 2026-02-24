"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import ClubLogo from "@/components/ClubLogo";

function VerifyEmailForm() {
  const { user, loading, markEmailVerified } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    }
  }, [user, loading, router]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const submitCode = async (code: string) => {
    if (code.length < 6 || submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const idToken = await user!.getIdToken();
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 410) {
          setError("Code expired. Sending you a new one...");
          await handleResend();
          return;
        }
        setError(data.error ?? "Verification failed. Please try again.");
        return;
      }
      markEmailVerified();
      router.push(next && next.startsWith("/") ? next : "/settings");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    // Accept only a single digit, or handle paste of full code
    const sanitized = value.replace(/\D/g, "");
    if (sanitized.length > 1) {
      // Paste: spread across all 6 inputs
      const chars = sanitized.slice(0, 6).split("");
      const next = [...digits];
      chars.forEach((ch, i) => {
        if (index + i < 6) next[index + i] = ch;
      });
      setDigits(next);
      const focusIndex = Math.min(index + chars.length, 5);
      inputRefs.current[focusIndex]?.focus();
      const filled = next.join("");
      if (filled.length === 6) submitCode(filled);
      return;
    }
    const next = [...digits];
    next[index] = sanitized;
    setDigits(next);
    if (sanitized && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (sanitized && index === 5) {
      // Last digit typed — auto-submit
      submitCode(next.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    await submitCode(digits.join(""));
  };

  const handleResend = async () => {
    setResendSuccess(false);
    setError("");
    setResending(true);
    try {
      const idToken = await user!.getIdToken();
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          // Rate limited; extract wait time from error if available
          setError(data.error ?? "Please wait a moment before requesting another code.");
        } else {
          setError(data.error ?? "Failed to resend code. Please try again in a moment.");
        }
        return;
      }
      setResendSuccess(true);
      setResendCooldown(60);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setResending(false);
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-[#faf9f5]" />;
  }

  const email = user.email ?? "";

  return (
    <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <ClubLogo size="sm" variant="dark" />
        </div>

        <h1 className="heading text-2xl font-bold text-[#141413] mb-2">
          Check your inbox
        </h1>
        <p className="text-sm text-[#b0aea5] mb-8 leading-relaxed">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-[#141413]">{email}</span>.
          Enter it below to verify your Penn State email.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 6-digit input */}
          <div className="flex gap-3 justify-between">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onFocus={(e) => e.target.select()}
                className="w-full aspect-square text-center text-xl font-bold border border-[#e8e6dc] rounded-xl focus:outline-none focus:border-[#d97757] focus:ring-1 focus:ring-[#d97757]/20 bg-white text-[#141413] caret-transparent"
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          {resendSuccess && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              A new code has been sent to your inbox.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || digits.join("").length < 6}
            className="w-full py-3 bg-[#d97757] hover:bg-[#c86843] disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {submitting ? "Verifying…" : "Verify Email"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-[#b0aea5] mb-2">Didn&apos;t receive it?</p>
          <button
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
            className="text-sm text-[#d97757] hover:underline font-medium disabled:opacity-50 disabled:no-underline"
          >
            {resending
              ? "Sending…"
              : resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : "Resend code"}
          </button>
        </div>

        <p className="text-center text-xs text-[#b0aea5] mt-8">
          Code expires in 10 minutes. Check your spam folder if you don&apos;t see it.
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#faf9f5]" />}>
      <VerifyEmailForm />
    </Suspense>
  );
}
