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
