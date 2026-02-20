import Link from "next/link";
import Image from "next/image";

const footerLinks: Record<string, { href: string; label: string; external?: boolean }[]> = {
  Club: [
    { href: "/about", label: "About Us" },
    { href: "/events", label: "Events" },
    { href: "/case-studies", label: "Case Studies" },
    { href: "/contact", label: "Contact" },
  ],
  Resources: [
    { href: "/resources", label: "Resource Hub" },
    { href: "/resources/prompt-engineering", label: "Prompt Engineering" },
    { href: "/resources/workshops", label: "Workshop Materials" },
    { href: "/projects", label: "Student Projects" },
  ],
  Community: [
    { href: "/auth", label: "Join the Club" },
    { href: "/newsletter", label: "Newsletter" },
    {
      href: "https://github.com",
      label: "GitHub",
      external: true,
    },
  ],
};

export default function Footer() {
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
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[#b0aea5] hover:text-[#faf9f5] transition-colors"
                      {...(link.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[#b0aea5]">
            © {new Date().getFullYear()} Claude Builder Club at Penn State University
          </p>
          <p className="text-xs text-[#b0aea5]">Built with Claude</p>
        </div>
      </div>
    </footer>
  );
}
