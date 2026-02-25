import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { ServerCache } from "@/lib/server-cache";

export const revalidate = 86400; // 24-hour edge cache

interface Stats {
  members: number;
  events: number;
  colleges: number;
}

const statsCache = new ServerCache<Stats>(24 * 60 * 60 * 1000);

export async function GET() {
  try {
    const stats = await statsCache.get("site-stats", async () => {
      const db = getAdminDb();

      const [membersCountSnap, eventsCountSnap, membersCollegeSnap] =
        await Promise.all([
          db.collection("members").count().get(),
          db.collection("events").count().get(),
          // Lightweight: only fetch the college field to find distinct values
          db.collection("members").select("college").get(),
        ]);

      const colleges = new Set<string>();
      membersCollegeSnap.forEach((doc) => {
        const college = doc.data().college as string | undefined;
        if (college?.trim()) colleges.add(college.trim());
      });

      return {
        members: membersCountSnap.data().count,
        events: eventsCountSnap.data().count,
        colleges: colleges.size,
      };
    });

    return NextResponse.json(stats);
  } catch (err) {
    console.error("Stats fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch stats." }, { status: 500 });
  }
}
