"use client";

import Link from "next/link";
import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const footerLinks: Record<string, { href: string; label: string; external?: boolean }[]> = {
  Club: [
    { href: "/about", label: "About Us" },
    { href: "/events", label: "Events" },
    { href: "/case-studies", label: "Case Studies" },
    { href: "/contact", label: "Contact" },
  ],
  Resources: [
    { href: "/resources", label: "Resource Hub" },
    { href: "/projects", label: "Student Projects" },
  ],
  Community: [
    { href: "/auth", label: "Join the Club" },
    {
      href: "https://groupme.com/join_group/108706896/m6t7b7Vs",
      label: "GroupMe",
      external: true,
    },
    {
      href: "https://github.com/Claude-PSU",
      label: "GitHub",
      external: true,
    },
  ],
};

export default function Footer() {
  const { user } = useAuth();
  return (
    <footer className="bg-[#141413] text-[#faf9f5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/branding/claude_icon.svg"
                alt="Claude icon"
                width={32}
                height={32}
                className="shrink-0"
              />
              <span className="font-semibold text-sm">Claude Builder Club</span>
            </div>
            <p className="body-editorial text-sm text-[#b0aea5] leading-relaxed">
              Empowering Penn State students to build the future with AI.
            </p>
            <div className="flex items-center gap-1 mt-6">
              <p className="text-xs text-[#b0aea5]">In partnership with</p>
              <Image
                src="/branding/anthropic_logotype.png"
                alt="Anthropic"
                width={76}
                height={16}
                className="invert"
              />
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#d97757] mb-4">
                {category}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => {
                  const isJoin = link.label === "Join the Club";
                  return (
                    <li key={link.href}>
                      <Link
                        href={isJoin && user ? "/dashboard" : link.href}
                        className="text-sm text-[#b0aea5] hover:text-[#faf9f5] transition-colors"
                        {...(link.external
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                      >
                        {isJoin && user ? "Dashboard" : link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[#b0aea5]">
            © {new Date().getFullYear()} Claude Builder Club at Penn State University
          </p>
          <div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Link
                  href="https://groupme.com/join_group/108706896/m6t7b7Vs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-[#b0aea5] hover:text-white transition-colors"
                >
                  <MessageCircle size={13} />
                  GroupMe
                </Link>
                <span className="text-white/20">·</span>
                <Link
                  href="https://www.instagram.com/claude.psu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-[#b0aea5] hover:text-white transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
                  </svg>
                  @claude.psu
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
