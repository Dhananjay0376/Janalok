export interface StatusUpdate {
  date: string;
  status: "Reported" | "Under Review" | "Scheduled" | "Resolved";
  comment: string;
}

export interface PublicIssue {
  id: string;
  title: string;
  description: string;
  category: "Roads & Transit" | "Utilities" | "Sanitation" | "Safety & Lighting" | "Environment" | "Other";
  status: "Reported" | "Under Review" | "Scheduled" | "Resolved";
  location: string;
  dateReported: string;
  reporterName: string;
  upvotes: number;
  photoUrl?: string;
  updates: StatusUpdate[];
  priority: "Low" | "Medium" | "High";
}

export interface CivicService {
  name: string;
  description: string;
  department: string;
  urgency: string;
  requirements: string[];
  processingTime: string;
  steps: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: Date;
  sources?: any;
  activeGrounding?: any;
}

export interface SimplifiedDoc {
  summary: string;
  keyTakeaways: string[];
  nextSteps: string[];
  glossary: { term: string; definition: string }[];
}

export interface AppUser {
  displayName: string | null;
  email: string | null;
  uid: string;
  isMock?: boolean;
}
