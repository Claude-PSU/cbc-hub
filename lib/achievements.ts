import type { AchievementDefinition } from "./types";

// ── Achievement Definitions ──────────────────────────────────────────────────

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // ── Engagement ──
  { id: "welcome", name: "Welcome!", description: "Complete your profile", icon: "UserCheck", category: "engagement", points: 10, condition: { type: "profile_complete", threshold: 1 } },
  { id: "first-event", name: "First Steps", description: "Attend your first event", icon: "Calendar", category: "engagement", points: 15, condition: { type: "events_attended", threshold: 1 } },
  { id: "regular", name: "Regular", description: "Attend 5 events", icon: "CalendarCheck", category: "engagement", points: 30, condition: { type: "events_attended", threshold: 5 } },
  { id: "mvp", name: "MVP", description: "Attend 10+ events", icon: "Trophy", category: "engagement", points: 50, condition: { type: "events_attended", threshold: 10 } },
  { id: "devoted", name: "Devoted", description: "Attend 20 events", icon: "Flame", category: "engagement", points: 75, condition: { type: "events_attended", threshold: 20 } },
  { id: "curious", name: "Curious Mind", description: "View 5 resources", icon: "BookOpen", category: "engagement", points: 10, condition: { type: "resources_viewed", threshold: 5 } },
  { id: "scholar", name: "Scholar", description: "View 20 resources", icon: "GraduationCap", category: "engagement", points: 30, condition: { type: "resources_viewed", threshold: 20 } },

  // ── Creator ──
  { id: "builder", name: "Builder", description: "Submit your first project", icon: "Hammer", category: "creator", points: 20, condition: { type: "projects_submitted", threshold: 1 } },
  { id: "prolific", name: "Prolific", description: "Submit 5 projects", icon: "Layers", category: "creator", points: 50, condition: { type: "projects_submitted", threshold: 5 } },
  { id: "architect", name: "Architect", description: "Submit 10 projects", icon: "Building2", category: "creator", points: 75, condition: { type: "projects_submitted", threshold: 10 } },
  { id: "featured-project", name: "Spotlight", description: "Have a project featured", icon: "Star", category: "creator", points: 40, condition: { type: "project_featured", threshold: 1 } },

  // ── Community ──
  { id: "connector", name: "Connector", description: "Refer your first member", icon: "UserPlus", category: "community", points: 15, condition: { type: "referrals_completed", threshold: 1 } },
  { id: "advocate", name: "Advocate", description: "Refer 5 members", icon: "Megaphone", category: "community", points: 40, condition: { type: "referrals_completed", threshold: 5 }, tier: "bronze" },
  { id: "ambassador", name: "Ambassador", description: "Refer 10 members", icon: "Flag", category: "community", points: 60, condition: { type: "referrals_completed", threshold: 10 }, tier: "silver" },
  { id: "champion", name: "Champion", description: "Refer 15 members", icon: "Shield", category: "community", points: 80, condition: { type: "referrals_completed", threshold: 15 }, tier: "gold" },
  { id: "legend", name: "Legend", description: "Refer 25 members", icon: "Crown", category: "community", points: 100, condition: { type: "referrals_completed", threshold: 25 }, tier: "platinum" },

  // ── Special (admin-only) ──
  { id: "early-adopter", name: "Early Adopter", description: "Founding member of the club", icon: "Sparkles", category: "special", points: 50, condition: null },
  { id: "workshop-leader", name: "Workshop Leader", description: "Led a club workshop", icon: "Presentation", category: "special", points: 40, condition: null },
  { id: "hackathon-winner", name: "Hackathon Winner", description: "Won a club hackathon", icon: "Award", category: "special", points: 60, condition: null },
  { id: "contributor", name: "Contributor", description: "Contributed to a club project", icon: "GitPullRequest", category: "special", points: 30, condition: null },
];

export const ACHIEVEMENT_MAP = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

// ── Category Colors ──────────────────────────────────────────────────────────

export const CATEGORY_COLORS: Record<string, { text: string; bg: string }> = {
  engagement: { text: "text-[#d97757]", bg: "bg-[#d97757]/10" },
  community: { text: "text-[#6a9bcc]", bg: "bg-[#6a9bcc]/10" },
  creator: { text: "text-[#788c5d]", bg: "bg-[#788c5d]/10" },
  special: { text: "text-[#b08d57]", bg: "bg-[#b08d57]/10" },
};

export const CATEGORY_HEX: Record<string, string> = {
  engagement: "#d97757",
  community: "#6a9bcc",
  creator: "#788c5d",
  special: "#b08d57",
};

// ── Referral Tiers ───────────────────────────────────────────────────────────

export const REFERRAL_TIERS: readonly { count: number; label: string; achievementId: string; perk?: string }[] = [
  { count: 1, label: "Connector", achievementId: "connector" },
  { count: 5, label: "Advocate", achievementId: "advocate", perk: "Advocate badge" },
  { count: 10, label: "Ambassador", achievementId: "ambassador", perk: "Priority event access" },
  { count: 15, label: "Champion", achievementId: "champion", perk: "Featured on landing page" },
  { count: 25, label: "Legend", achievementId: "legend", perk: "Legend status + club swag" },
];

// ── Achievement Evaluator ────────────────────────────────────────────────────

export interface UserAchievementContext {
  profileComplete: boolean;
  eventsAttended: number;
  projectsSubmitted: number;
  projectsFeatured: number;
  referralsCompleted: number;
  resourcesViewed: number;
  currentAchievements: string[];
}

/** Returns list of newly earned achievement IDs */
export function evaluateAchievements(ctx: UserAchievementContext): string[] {
  const newlyEarned: string[] = [];

  for (const def of ACHIEVEMENTS) {
    if (ctx.currentAchievements.includes(def.id)) continue;
    if (!def.condition) continue; // special — admin only

    let met = false;
    switch (def.condition.type) {
      case "profile_complete":
        met = ctx.profileComplete;
        break;
      case "events_attended":
        met = ctx.eventsAttended >= def.condition.threshold;
        break;
      case "projects_submitted":
        met = ctx.projectsSubmitted >= def.condition.threshold;
        break;
      case "project_featured":
        met = ctx.projectsFeatured >= def.condition.threshold;
        break;
      case "referrals_completed":
        met = ctx.referralsCompleted >= def.condition.threshold;
        break;
      case "resources_viewed":
        met = ctx.resourcesViewed >= def.condition.threshold;
        break;
    }

    if (met) newlyEarned.push(def.id);
  }

  return newlyEarned;
}
