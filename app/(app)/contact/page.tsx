"use client";

import { useState } from "react";
import { MessageCircle, Mail, Github, Instagram, Send, CheckCircle } from "lucide-react";
import Link from "next/link";
import PageHero from "@/components/PageHero";

const contactMethods = [
  {
    icon: MessageCircle,
    label: "GroupMe",
    description: "Fastest way to reach us and meet the community.",
    action: "Join the group",
    href: "https://groupme.com/join_group/108706896/m6t7b7Vs",
    external: true,
    accent: "bg-[#d97757]/10 border-[#d97757]/20",
    iconColor: "text-[#d97757]",
  },
  {
    icon: Instagram,
    label: "Instagram",
    description: "Event recaps, announcements, and campus highlights.",
    action: "@claude.psu",
    href: "https://www.instagram.com/claude.psu",
    external: true,
    accent: "bg-[#6a9bcc]/10 border-[#6a9bcc]/20",
    iconColor: "text-[#6a9bcc]",
  },
  {
    icon: Github,
    label: "GitHub",
    description: "Browse our open-source projects and org repos.",
    action: "Claude-PSU",
    href: "https://github.com/Claude-PSU",
    external: true,
    accent: "bg-[#788c5d]/10 border-[#788c5d]/20",
    iconColor: "text-[#788c5d]",
  },
];

type FormState = "idle" | "submitting" | "success" | "error";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [formState, setFormState] = useState<FormState>("idle");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Request failed");
      setFormState("success");
    } catch {
      setFormState("error");
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f5]">
      <PageHero
        eyebrow="Get in Touch"
        heading={
          <>
            We&apos;d love to
            <br />
            <span className="text-[#d97757]">hear from you.</span>
          </>
        }
        description="Whether you're a professor looking to collaborate, a student org wanting to partner, or just curious about the club — reach out and we'll get back to you."
      />

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">

            {/* ── Left: Contact Methods ─────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-5">
              <div className="mb-8">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#d97757] mb-3 block">
                  Find Us Online
                </span>
                <h2 className="heading text-2xl font-bold text-[#141413] mb-2">
                  Other ways to connect
                </h2>
                <p className="text-sm text-[#b0aea5] leading-relaxed">
                  For quick questions or to join the community, these channels are the fastest.
                </p>
              </div>

              {contactMethods.map((method) => (
                <Link
                  key={method.label}
                  href={method.href}
                  {...(method.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={`flex items-start gap-4 p-5 rounded-2xl border ${method.accent} hover:shadow-sm transition-all group block`}
                >
                  <div className={`w-10 h-10 rounded-xl ${method.accent} border flex items-center justify-center shrink-0 ${method.iconColor}`}>
                    <method.icon size={18} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#141413] group-hover:text-[#d97757] transition-colors">
                      {method.label}
                    </p>
                    <p className="text-xs text-[#b0aea5] mt-0.5 leading-relaxed">
                      {method.description}
                    </p>
                    <p className={`text-xs font-medium mt-2 ${method.iconColor}`}>
                      {method.action} →
                    </p>
                  </div>
                </Link>
              ))}

              <div className="mt-8 pt-8 border-t border-[#e8e6dc]">
                <div className="flex items-start gap-3">
                  <Mail size={15} className="text-[#b0aea5] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-[#141413]">Email</p>
                    <p className="text-xs text-[#b0aea5] mt-0.5">
                      For partnership inquiries or formal outreach, use the form and select &quot;Partnership&quot;.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right: Contact Form ───────────────────────────────────── */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl border border-[#e8e6dc] p-8 md:p-10">
                {formState === "success" ? (
                  <div className="flex flex-col items-center justify-center text-center py-12 gap-4">
                    <div className="w-14 h-14 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-center">
                      <CheckCircle size={24} className="text-green-600" />
                    </div>
                    <h3 className="heading text-xl font-bold text-[#141413]">Message sent!</h3>
                    <p className="text-sm text-[#b0aea5] max-w-xs leading-relaxed">
                      Thanks for reaching out. We&apos;ll get back to you within a day or two.
                    </p>
                    <button
                      onClick={() => { setFormState("idle"); setForm({ name: "", email: "", subject: "", message: "" }); }}
                      className="mt-2 text-xs text-[#d97757] hover:text-[#c86843] font-medium transition-colors"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-8">
                      <span className="text-xs font-semibold uppercase tracking-widest text-[#d97757] mb-2 block">
                        Send a Message
                      </span>
                      <h2 className="heading text-2xl font-bold text-[#141413]">
                        Get in touch directly
                      </h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-medium text-[#555555] mb-1.5">
                            Name <span className="text-[#d97757]">*</span>
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            required
                            placeholder="Jane Smith"
                            className="w-full px-4 py-2.5 border border-[#d0cdc5] rounded-xl text-sm focus:outline-none focus:border-[#d97757] focus:ring-1 focus:ring-[#d97757]/20 bg-[#faf9f5] text-[#141413] placeholder:text-[#b0aea5]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#555555] mb-1.5">
                            Email <span className="text-[#d97757]">*</span>
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            required
                            placeholder="you@psu.edu"
                            className="w-full px-4 py-2.5 border border-[#d0cdc5] rounded-xl text-sm focus:outline-none focus:border-[#d97757] focus:ring-1 focus:ring-[#d97757]/20 bg-[#faf9f5] text-[#141413] placeholder:text-[#b0aea5]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#555555] mb-1.5">
                          Subject <span className="text-[#d97757]">*</span>
                        </label>
                        <select
                          name="subject"
                          value={form.subject}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2.5 border border-[#d0cdc5] rounded-xl text-sm focus:outline-none focus:border-[#d97757] focus:ring-1 focus:ring-[#d97757]/20 bg-[#faf9f5] text-[#141413] appearance-none"
                        >
                          <option value="" disabled>Select a topic...</option>
                          <option value="partnership">Partnership / Collaboration</option>
                          <option value="course">Course Integration</option>
                          <option value="sponsorship">Sponsorship</option>
                          <option value="press">Press / Media</option>
                          <option value="general">General Inquiry</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#555555] mb-1.5">
                          Message <span className="text-[#d97757]">*</span>
                        </label>
                        <textarea
                          name="message"
                          value={form.message}
                          onChange={handleChange}
                          required
                          rows={6}
                          placeholder="Tell us what you have in mind..."
                          className="w-full px-4 py-2.5 border border-[#d0cdc5] rounded-xl text-sm focus:outline-none focus:border-[#d97757] focus:ring-1 focus:ring-[#d97757]/20 bg-[#faf9f5] text-[#141413] placeholder:text-[#b0aea5] resize-none"
                        />
                      </div>

                      {formState === "error" && (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                          Something went wrong. Please try again or email us directly at{" "}
                          <a href="mailto:claudepsu@gmail.com" className="underline">claudepsu@gmail.com</a>.
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={formState === "submitting"}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#d97757] hover:bg-[#c86843] disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
                      >
                        <Send size={15} />
                        {formState === "submitting" ? "Sending..." : "Send Message"}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
