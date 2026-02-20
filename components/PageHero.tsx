interface PageHeroProps {
  /** Short overline label above the heading */
  eyebrow: string;
  /** Main heading — supports JSX for line breaks and colored spans */
  heading: React.ReactNode;
  /** Body copy below the heading */
  description: string;
  /** Optional right-side CTA (button or link group) */
  action?: React.ReactNode;
  /** Optional content inside the left column, below the description */
  belowDescription?: React.ReactNode;
  /** Optional bottom stats bar rendered inside a border-t divider */
  statsBar?: React.ReactNode;
  /** Optional full-width content below the flex row, still on the dark band */
  children?: React.ReactNode;
}

export default function PageHero({
  eyebrow,
  heading,
  description,
  action,
  belowDescription,
  statsBar,
  children,
}: PageHeroProps) {
  return (
    <div className="bg-[#141413] pt-16 relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#d97757] rounded-full opacity-[0.06] blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#6a9bcc] rounded-full opacity-[0.06] blur-3xl pointer-events-none" />

      {/* Main content */}
      <div
        className={`relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${
          statsBar ? "pb-10" : "pb-14"
        }`}
      >
        <div className="flex items-end justify-between gap-4 flex-wrap">
          {/* Left column */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#d97757] mb-3">
              {eyebrow}
            </p>
            <h1 className="heading text-4xl sm:text-5xl font-bold text-white leading-tight mb-4">
              {heading}
            </h1>
            <p className="body-editorial text-lg text-[#b0aea5] max-w-xl leading-relaxed">
              {description}
            </p>
            {belowDescription && <div className="mt-4">{belowDescription}</div>}
          </div>

          {/* Right-side CTA */}
          {action && <div className="shrink-0">{action}</div>}
        </div>

        {/* Below-flex slot (e.g. success banners) */}
        {children}
      </div>

      {/* Stats bar */}
      {statsBar && (
        <div className="relative z-10 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {statsBar}
          </div>
        </div>
      )}
    </div>
  );
}
