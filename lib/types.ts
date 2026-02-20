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
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
