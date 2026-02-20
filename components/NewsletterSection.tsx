"use client";

import { useState } from "react";

export default function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Wire to Beehiiv API
    setSubmitted(true);
  };

  return (
    <section className="py-24 bg-[#e8e6dc]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#d97757] mb-3 block">
          Newsletter
        </span>
        <h2 className="heading text-3xl sm:text-4xl font-bold text-[#141413] mb-4">
          Stay in the Loop
        </h2>
        <p className="body-editorial text-lg text-[#b0aea5] mb-8 leading-relaxed">
          AI news, club updates, and exclusive resources delivered to your inbox.
          For students, faculty, and anyone curious about the future of AI.
        </p>

        {submitted ? (
          <div className="inline-flex items-center gap-3 px-6 py-4 bg-green-50 border border-green-200 rounded-2xl text-green-700">
            <span className="text-2xl">✓</span>
            <div className="text-left">
              <p className="font-medium text-sm">You&apos;re on the list!</p>
              <p className="text-xs text-green-600 mt-0.5">
                Check your inbox to confirm your subscription.
              </p>
            </div>
          </div>
        ) : (
          <>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@psu.edu"
                required
                className="flex-1 px-4 py-3 border border-[#d0cdc5] rounded-xl text-sm focus:outline-none focus:border-[#d97757] focus:ring-1 focus:ring-[#d97757]/20 bg-white text-[#141413]"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-[#d97757] hover:bg-[#c86843] text-white text-sm font-medium rounded-xl transition-colors"
              >
                Subscribe
              </button>
            </form>
            <p className="text-xs text-[#b0aea5] mt-4">
              No spam. Unsubscribe at any time.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
