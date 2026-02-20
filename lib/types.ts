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
  isAdmin?: boolean;
  referralSource?: string;
}

export interface StoredEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
  isAllDay: boolean;
  syncedAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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
