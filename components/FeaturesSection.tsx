const features = [
  {
    icon: "📅",
    title: "Events & Meetups",
    description:
      "Regular club meetings, guest speaker sessions, and AI hackathons open to all Penn State students.",
    href: "/events",
    badge: "Weekly",
    badgeColor: "bg-[#d97757]/10 text-[#d97757]",
  },
  {
    icon: "📚",
    title: "Class Case Studies",
    description:
      "Real examples of how Penn State professors have integrated Claude-powered AI projects into their syllabi — with our club's support.",
    href: "/case-studies",
    badge: "Growing",
    badgeColor: "bg-[#788c5d]/10 text-[#788c5d]",
  },
  {
    icon: "🔧",
    title: "Resource Hub",
    description:
      "Prompt engineering guides, workshop slide decks, boilerplate code, and curated tools — all organized and searchable in one place.",
    href: "/resources",
    badge: "New",
    badgeColor: "bg-[#6a9bcc]/10 text-[#6a9bcc]",
  },
  {
    icon: "💻",
    title: "Student Projects",
    description:
      "A showcase of real AI applications built by Penn State students in collaboration with the club, pulled live from our GitHub.",
    href: "/projects",
    badge: null,
    badgeColor: "",
  },
  {
    icon: "📧",
    title: "Newsletter",
    description:
      "Stay informed with AI news, Claude updates, and club highlights. Tailored for students, faculty, and partner organizations.",
    href: "/newsletter",
    badge: "Monthly",
    badgeColor: "bg-[#6a9bcc]/10 text-[#6a9bcc]",
  },
  {
    icon: "🤝",
    title: "Partner With Us",
    description:
      "Interested in integrating AI into your class, department, or student org? We'd love to collaborate and help you get started.",
    href: "/contact",
    badge: null,
    badgeColor: "",
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#d97757] mb-3 block">
            What We Do
          </span>
          <h2 className="heading text-3xl sm:text-4xl font-bold text-[#141413] mb-4">
            Everything You Need to Explore AI
          </h2>
          <p className="body-editorial text-lg text-[#b0aea5] max-w-2xl mx-auto leading-relaxed">
            From campus events to class collaborations, we&apos;re building Penn
            State&apos;s AI community one project at a time.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <a
              key={feature.title}
              href={feature.href}
              className="group block bg-[#faf9f5] hover:bg-white border border-[#e8e6dc] hover:border-[#d97757]/30 hover:shadow-md rounded-2xl p-6 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-3xl">{feature.icon}</span>
                {feature.badge && (
                  <span
                    className={`text-xs font-medium px-2.5 py-1 ${feature.badgeColor} rounded-full`}
                  >
                    {feature.badge}
                  </span>
                )}
              </div>
              <h3 className="heading text-base font-semibold text-[#141413] group-hover:text-[#d97757] mb-2 transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-[#b0aea5] leading-relaxed">
                {feature.description}
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
