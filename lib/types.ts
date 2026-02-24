export type ResourceCategory =
  | "getting-started"
  | "prompt-engineering"
  | "workshops"
  | "reference"
  | "external"
  | "faculty";

export type ResourceAudience = "student" | "faculty" | "all";

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: "drive" | "link" | "video";
  href: string;
  category: ResourceCategory;
  audience: ResourceAudience;
  techLevels: MemberProfile["techLevel"][];
  tags: string[];
  featured: boolean;
  order: number;
  published: boolean;
}

export type MemberRole = "Admin" | "Executive Board Member" | "General Member";

export const MEMBER_ROLES: MemberRole[] = [
  "Admin",
  "Executive Board Member",
  "General Member",
];

export interface MemberProfile {
  uid: string;
  email: string;
  displayName: string;
  major: string;
  year: string;
  college: string;
  techLevel: "beginner" | "some" | "intermediate" | "advanced" | "";
  interests: string[];
  emailReminders: boolean;
  newsletter: boolean;
  updatedAt: string;
  createdAt?: string;
  lastActive?: string; // ISO timestamp of last login
  isAdmin?: boolean;
  roles?: MemberRole[];
  referralSource?: string;
  utmSource?: string;
  githubUsername?: string;
  linkedinUrl?: string;
  profilePublic?: boolean;
  emailPasswordAccountVerified?: boolean;
}

/** Maps {{varName}} in email templates → MemberProfile field.
 *  Adding an entry here automatically propagates to the toolbar hint and per-recipient detection. */
export const EMAIL_PROFILE_VAR_MAP = {
  name: "displayName",
  major: "major",
  year: "year",
  college: "college",
  techLevel: "techLevel",
} as const satisfies Partial<Record<string, keyof MemberProfile>>;

export interface StoredEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
  isAllDay: boolean;
  syncedAt: string;
  checkInOpen?: boolean; // whether check-in is currently open for this event
  qrRedirectUrl?: string; // where to redirect after check-in
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ── Email ──────────────────────────────────────────────────────────────────────

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string; // raw markdown
  createdAt: string; // ISO
  createdBy: string; // Firebase UID
}

export interface EmailLog {
  id: string;
  subject: string;
  bodyExcerpt: string; // first 120 chars of raw body
  segment: string; // human-readable label
  recipientCount: number;
  sentAt: string; // ISO
  sentBy: string; // Firebase UID
  displayName: string;
  isScheduled?: boolean;
}

export type ProjectTechLevel = "beginner" | "intermediate" | "advanced";
export type ProjectStatus = "pending" | "approved" | "rejected" | "changes_requested";

export const PROJECT_TAGS = [
  "chatbot",
  "data analysis",
  "education",
  "automation",
  "research",
  "agent",
  "RAG",
] as const;

export type ProjectTag = (typeof PROJECT_TAGS)[number];

export interface ProjectGitHubMeta {
  owner: string;
  repo: string;
  language: string | null;
  stars: number;
  lastCommit: string; // ISO
  readmeExcerpt: string;
}

export interface Project {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  collaborators: string[]; // PSU emails
  repoUrl: string;
  title: string;
  description: string;
  tags: string[];
  techLevel: ProjectTechLevel;
  courseId?: string;
  demoUrl?: string;
  bannerUrl?: string;
  githubMeta: ProjectGitHubMeta;
  status: ProjectStatus;
  featured: boolean;
  submittedAt: string; // ISO
  approvedAt?: string; // ISO
  adminNote?: string;
}

export interface AttendanceRecord {
  uid: string;
  displayName: string;
  email: string;
  checkedInAt: string; // ISO
  eventId: string;
  eventTitle: string;
  eventStart: string; // ISO — denormalized for display
}

export interface CaseStudy {
  id: string;
  type: "academic" | "club";

  // Academic-specific
  course?: string;
  courseTitle?: string;
  professor?: string;
  department?: string;

  // Club-specific
  orgName?: string;
  orgType?: string;

  // Shared
  title: string;
  semester: string;
  description: string;
  outcomes: string[];
  tools: string[];
  studentCount?: number;
  image?: string;

  featured: boolean;
  order: number;
  published: boolean;
}
