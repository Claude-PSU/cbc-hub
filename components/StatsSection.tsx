"use client";

import { useEffect, useRef, useState } from "react";

interface StatsData {
  members: number;
  events: number;
  colleges: number;
}

/**
 * Animates a number from 0 to `target` using exponential decay:
 *   value(t) = target × (1 − e^(−λt))
 *
 * The rate of increase starts high and decays exponentially — fast initial
 * burst that smoothly eases into the final value. Animation only runs when
 * `active` is true (section visible + data loaded).
 */
function useCountUp(target: number, active: boolean, lambda = 3): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active || target <= 0) return;

    startRef.current = null;

    const tick = (now: number) => {
      if (!startRef.current) startRef.current = now;
      const t = (now - startRef.current) / 1000; // seconds elapsed
      const progress = 1 - Math.exp(-lambda * t);
      setValue(Math.round(target * progress));

      if (progress < 0.9995) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, active, lambda]);

  return value;
}

function StatItem({
  target,
  label,
  active,
}: {
  target: number;
  label: string;
  active: boolean;
}) {
  const displayed = useCountUp(target, active);

  return (
    <div className="text-center">
      <div className="heading text-4xl sm:text-5xl font-bold text-white mb-2">
        {active ? displayed : "—"}
      </div>
      <div className="text-sm text-[#b0aea5]">{label}</div>
    </div>
  );
}

const STAT_CARDS: { key: keyof StatsData; label: string }[] = [
  { key: "members", label: "active members" },
  { key: "events", label: "workshops and build nights" },
  { key: "colleges", label: "Penn State colleges represented" },
];

export default function StatsSection() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);

  // Fetch live stats from Firestore (via cached API route)
  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data: StatsData) => setStats(data))
      .catch(() => {
        // Fail silently — "—" placeholders remain until data loads
      });
  }, []);

  // Trigger animation once when the section scrolls into view
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Animation fires only when both the section is visible and data is ready
  const active = visible && stats !== null;

  return (
    <section
      ref={sectionRef}
      className={`py-20 bg-[#141413] transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-[#b0aea5] text-sm font-medium uppercase tracking-widest">
            The momentum is real
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {STAT_CARDS.map((card) => (
            <StatItem
              key={card.key}
              target={stats?.[card.key] ?? 0}
              label={card.label}
              active={active}
            />
          ))}
        </div>
        <p className="text-center text-xs text-[#b0aea5]/50 mt-10">
          Statistics are pulled from site data and updated daily.
        </p>
      </div>
    </section>
  );
}
