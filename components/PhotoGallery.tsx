"use client";

import { useRef, useState, useCallback } from "react";

const GALLERY_PHOTOS = [
  { src: "/photos/gallery-1.jpg", alt: "Club members collaborating during a workshop" },
  { src: "/photos/gallery-2.jpg", alt: "Students presenting AI projects" },
  { src: "/photos/gallery-3.jpg", alt: "Hands-on coding session" },
  { src: "/photos/gallery-4.jpg", alt: "Guest speaker at a club meeting" },
  { src: "/photos/gallery-5.jpg", alt: "Group photo after a build night" },
];

export default function PhotoGallery() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  const scroll = useCallback((dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.6;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  }, []);

  return (
    <div className="mt-16 relative group">
      {/* Scroll container */}
      <div
        ref={scrollRef}
        onScroll={updateArrows}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-none rounded-2xl"
      >
        {GALLERY_PHOTOS.map((photo, i) => (
          <div
            key={i}
            className="snap-start shrink-0 w-72 sm:w-80 aspect-[4/3] rounded-2xl overflow-hidden bg-[#e8e6dc] border border-[#e8e6dc]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.src}
              alt={photo.alt}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {/* Navigation arrows */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 border border-[#e8e6dc] shadow-sm flex items-center justify-center text-[#141413] opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Scroll left"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 12 6 8l4-4" /></svg>
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 border border-[#e8e6dc] shadow-sm flex items-center justify-center text-[#141413] opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Scroll right"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4l4 4-4 4" /></svg>
        </button>
      )}
    </div>
  );
}
