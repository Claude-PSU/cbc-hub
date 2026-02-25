"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fires once when the element scrolls into view.
 * Returns a ref to attach and a boolean that flips to `true` on first intersection.
 */
export function useScrollReveal<T extends HTMLElement = HTMLElement>(
  threshold = 0.15,
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, visible];
}
