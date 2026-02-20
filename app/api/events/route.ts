import { NextResponse } from "next/server";

export const revalidate = 300; // cache for 5 minutes

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
  isAllDay: boolean;
}

interface GoogleCalendarItem {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

export async function GET() {
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!apiKey || !calendarId) {
    return NextResponse.json(
      { error: "Google Calendar not configured. Add GOOGLE_CALENDAR_API_KEY and GOOGLE_CALENDAR_ID to .env.local." },
      { status: 503 }
    );
  }

  const timeMin = new Date().toISOString();
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
  );
  url.searchParams.set("key", apiKey);
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("maxResults", "20");
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Google Calendar API error:", res.status, text);
      return NextResponse.json(
        { error: "Failed to fetch events from Google Calendar." },
        { status: res.status }
      );
    }

    const data = await res.json();
    const items: GoogleCalendarItem[] = data.items ?? [];

    const events: CalendarEvent[] = items.map((item) => ({
      id: item.id,
      title: item.summary ?? "Untitled Event",
      description: item.description ?? "",
      location: item.location ?? "",
      start: item.start.dateTime ?? item.start.date ?? "",
      end: item.end.dateTime ?? item.end.date ?? "",
      isAllDay: !item.start.dateTime,
    }));

    return NextResponse.json({ events });
  } catch (err) {
    console.error("Events fetch error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
