import Image from "next/image";

interface ClubLogoProps {
  /** Controls icon height and text scale */
  size?: "sm" | "md" | "lg";
  /**
   * "light" → used on dark backgrounds (hero, footer): logos rendered white
   * "dark"  → used on light backgrounds (scrolled nav): logos rendered black
   */
  variant?: "light" | "dark";
}

const sizes = {
  sm: { h: 20, separator: "text-base", label: "text-xs", sub: "text-[10px]" },
  md: { h: 26, separator: "text-lg",   label: "text-sm",  sub: "text-xs"    },
  lg: { h: 34, separator: "text-xl",   label: "text-base", sub: "text-sm"   },
};

export default function ClubLogo({ size = "md", variant = "light" }: ClubLogoProps) {
  const s = sizes[size];

  // brightness-0 → solid black silhouette; +invert → solid white silhouette
  const imgClass =
    variant === "light"
      ? "brightness-0 invert"   // white on dark background
      : "brightness-0";          // black on light background

  const separatorColor =
    variant === "light" ? "text-white/35" : "text-[#b0aea5]";
  const labelColor =
    variant === "light" ? "text-white" : "text-[#141413]";
  const subColor =
    variant === "light" ? "text-white/50" : "text-[#b0aea5]";

  return (
    <div className="flex items-center gap-2">
      {/* Penn State mark — auto width so the oval isn't squished */}
      {/*
      <Image
        src="/branding/penn_state_logo.png"
        alt="Penn State"
        width={0}
        height={0}
        sizes="120px"
        style={{ height: s.h, width: "auto" }}
        className={`shrink-0 object-contain ${imgClass}`}
      />
      <span
        className={`${s.separator} font-extralight ${separatorColor} select-none leading-none`}
      >
        ×
      </span>
      */}
      {/* Claude icon — square, same height as PSU mark */}
      <Image
        src="/branding/claude_icon.svg"
        alt="Claude"
        width={s.h}
        height={s.h}
        className={`shrink-0`}
      />

      {/* Wordmark */}
      <div className="flex flex-row gap-1 leading-none items-baseline">
        <span className={`font-bold tracking-tight ${s.label} ${labelColor}`}>
          Claude
        </span>
        <span className={`${s.sub} font-medium ${subColor}`}>@ PSU</span>
      </div>
    </div>
  );
}
