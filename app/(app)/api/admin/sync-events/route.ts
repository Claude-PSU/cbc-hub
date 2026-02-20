import { NextResponse } from "next/server";

// No firebase-admin needed — auth is enforced by Firestore rules on the client write.
// This route only proxies Google Calendar (API key is server-side only).

export const revalidate = 0;

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

  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
  );
  url.searchParams.set("key", apiKey);
  url.searchParams.set("timeMin", "2023-08-01T00:00:00Z"); // club founding
  url.searchParams.set("timeMax", new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString());
  url.searchParams.set("maxResults", "500");
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text();
      console.error("Google Calendar API error:", res.status, text);
      return NextResponse.json(
        { error: `Google Calendar returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const items: GoogleCalendarItem[] = data.items ?? [];

    const events = items.map((item) => ({
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
    console.error("sync-events error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
