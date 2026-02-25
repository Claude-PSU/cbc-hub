"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
  isAllDay: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function UpcomingEventBanner() {
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [failed, setFailed] = useState(false);
  const [ref, visible] = useScrollReveal<HTMLDivElement>();

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((data) => {
        if (data.events?.length > 0) setEvent(data.events[0]);
        else setFailed(true);
      })
      .catch(() => setFailed(true));
  }, []);

  // Hide entirely when there are no events
  if (failed) return null;

  return (
    <div ref={ref}>
      {event && (
        <section
          className={`py-12 bg-[#faf9f5] transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="border-l-4 border-[#d97757] bg-white rounded-r-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#d97757] mb-2 block">
                  Next Event
                </span>
                <h3 className="heading text-lg sm:text-xl font-semibold text-[#141413] mb-3 truncate">
                  {event.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#b0aea5]">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar size={14} className="text-[#d97757]" />
                    {formatDate(event.start)}
                  </span>
                  {!event.isAllDay && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={14} className="text-[#d97757]" />
                      {formatTime(event.start)}
                    </span>
                  )}
                  {event.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={14} className="text-[#d97757]" />
                      {event.location}
                    </span>
                  )}
                </div>
              </div>

              <Link
                href="/events"
                className="shrink-0 px-5 py-2.5 text-sm font-medium text-[#d97757] border border-[#d97757]/30 hover:bg-[#d97757] hover:text-white rounded-xl transition-colors"
              >
                See all events
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
