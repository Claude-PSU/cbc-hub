"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, ChevronDown, Settings, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import ClubLogo from "./ClubLogo";

const navLinks = [
  { href: "/events", label: "Events" },
  { href: "/case-studies", label: "Case Studies" },
  { href: "/resources", label: "Resources" },
  { href: "/projects", label: "Projects" },
];

function getInitials(displayName: string | null, email: string | null): string {
  if (displayName) {
    return displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return (email ?? "?")[0].toUpperCase();
}

function getDisplayName(displayName: string | null, email: string | null): string {
  if (displayName) return displayName;
  return email?.split("@")[0] ?? "Member";
}

function UserMenu({ scrolled }: { scrolled: boolean }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = getInitials(user.displayName, user.email);
  const name = getDisplayName(user.displayName, user.email);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut(auth);
    router.push("/");
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
          scrolled
            ? "hover:bg-[#e8e6dc] text-[#141413]"
            : "hover:bg-white/10 text-white"
        }`}
      >
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-[#d97757] flex items-center justify-center text-white text-xs font-bold shrink-0">
          {initials}
        </div>
        {/* Name */}
        <span className="text-sm font-medium hidden lg:block">{name}</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-[#e8e6dc] shadow-lg overflow-hidden z-50">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-[#e8e6dc] bg-[#faf9f5]">
            <p className="text-sm font-medium text-[#141413] truncate">{name}</p>
            <p className="text-xs text-[#b0aea5] truncate">{user.email}</p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#141413] hover:bg-[#faf9f5] transition-colors"
            >
              <Settings size={15} className="text-[#b0aea5]" />
              Settings
            </Link>
          </div>

          <div className="border-t border-[#e8e6dc] py-1">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#141413] hover:bg-[#faf9f5] transition-colors"
            >
              <LogOut size={15} className="text-[#b0aea5]" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { user, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#faf9f5]/95 backdrop-blur-md shadow-sm border-b border-[#e8e6dc]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Club logo lockup */}
          <Link href="/" className="shrink-0">
            <ClubLogo size="sm" variant={scrolled ? "dark" : "light"} />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  scrolled
                    ? "text-[#555555] hover:text-[#141413] hover:bg-[#e8e6dc]"
                    : "text-[#C0C8D8] hover:text-white hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {!loading && (
              user ? (
                <UserMenu scrolled={scrolled} />
              ) : (
                <Link
                  href="/auth"
                  className="px-4 py-2 text-sm font-medium text-white bg-[#d97757] hover:bg-[#c86843] rounded-lg transition-colors shadow-sm"
                >
                  Sign In
                </Link>
              )
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors ${
              scrolled
                ? "text-[#141413] hover:bg-[#e8e6dc]"
                : "text-white hover:bg-white/10"
            }`}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-[#e8e6dc] py-4 px-4">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 text-sm font-medium text-[#555555] hover:text-[#141413] hover:bg-[#faf9f5] rounded-lg transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-3 mt-3 border-t border-[#e8e6dc]">
            {!loading && (
              user ? (
                <>
                  {/* Mobile user info */}
                  <div className="flex items-center gap-3 px-4 py-3 mb-1">
                    <div className="w-8 h-8 rounded-full bg-[#d97757] flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {getInitials(user.displayName, user.email)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#141413]">
                        {getDisplayName(user.displayName, user.email)}
                      </p>
                      <p className="text-xs text-[#b0aea5]">{user.email}</p>
                    </div>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm font-medium text-[#555555] hover:text-[#141413] hover:bg-[#faf9f5] rounded-lg transition-colors"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={async () => {
                      setMenuOpen(false);
                      await signOut(auth);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-[#555555] hover:text-[#141413] hover:bg-[#faf9f5] rounded-lg transition-colors"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  href="/auth"
                  onClick={() => setMenuOpen(false)}
                  className="block text-center px-4 py-2.5 text-sm font-medium text-white bg-[#d97757] hover:bg-[#c86843] rounded-lg transition-colors"
                >
                  Sign In
                </Link>
              )
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
