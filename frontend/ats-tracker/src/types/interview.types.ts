export type InterviewType = "phone" | "video" | "in-person";

export type InterviewStatus = "scheduled" | "completed" | "cancelled" | "rescheduled";

export type InterviewOutcome = 
  | "pending"
  | "passed"
  | "failed"
  | "no_decision"
  | "offer_extended"
  | "rejected";

export interface InterviewData {
  id: string;
  jobOpportunityId: string;
  title: string;
  company: string;
  interviewType: InterviewType;
  scheduledAt: string; // ISO datetime
  duration: number; // minutes
  location?: string; // for in-person
  videoLink?: string; // for video
  phoneNumber?: string; // for phone
  interviewerName?: string;
  interviewerEmail?: string;
  interviewerTitle?: string;
  notes?: string;
  preparationNotes?: string;
  status: InterviewStatus;
  outcome?: InterviewOutcome;
  outcomeNotes?: string;
  reminderSentAt?: string;
  reminderSent: boolean;
  cancelledAt?: string;
  cancellationReason?: string;
  rescheduledFrom?: string; // original interview id
  rescheduledTo?: string; // new interview id
  conflictDetected: boolean;
  conflictWith?: string[]; // array of conflicting interview ids
  preparationTasks?: InterviewPreparationTask[];
  googleCalendarEventId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewInput {
  jobOpportunityId: string;
  interviewType: InterviewType;
  scheduledAt: string;
  duration: number;
  location?: string;
  videoLink?: string;
  phoneNumber?: string;
  interviewerName?: string;
  interviewerEmail?: string;
  interviewerTitle?: string;
  notes?: string;
  preparationNotes?: string;
}

export interface InterviewPreparationTask {
  id: string;
  interviewId: string;
  task: string;
  completed: boolean;
  dueDate?: string;
  createdAt: string;
}

export interface InterviewConflict {
  interviewId: string;
  conflictingInterviewId: string;
  conflictType: "overlap" | "too_close";
  message: string;
}

export interface InterviewReminder {
  interviewId: string;
  reminderTime: string; // ISO datetime
  sent: boolean;
  sentAt?: string;
}

export const INTERVIEW_TYPES: InterviewType[] = ["phone", "video", "in-person"];

export const INTERVIEW_STATUSES: InterviewStatus[] = [
  "scheduled",
  "completed",
  "cancelled",
  "rescheduled",
];

export const INTERVIEW_OUTCOMES: InterviewOutcome[] = [
  "pending",
  "passed",
  "failed",
  "no_decision",
  "offer_extended",
  "rejected",
];

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  phone: "Phone",
  video: "Video",
  "in-person": "In-Person",
};

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  rescheduled: "Rescheduled",
};

export const INTERVIEW_OUTCOME_LABELS: Record<InterviewOutcome, string> = {
  pending: "Pending",
  passed: "Passed",
  failed: "Failed",
  no_decision: "No Decision",
  offer_extended: "Offer Extended",
  rejected: "Rejected",
};

export const INTERVIEW_TYPE_COLORS: Record<InterviewType, string> = {
  phone: "#3B82F6",
  video: "#8B5CF6",
  "in-person": "#10B981",
};

export const INTERVIEW_STATUS_COLORS: Record<InterviewStatus, string> = {
  scheduled: "#3B82F6",
  completed: "#10B981",
  cancelled: "#EF4444",
  rescheduled: "#F59E0B",
};

export const INTERVIEW_OUTCOME_COLORS: Record<InterviewOutcome, string> = {
  pending: "#6B7280",
  passed: "#10B981",
  failed: "#EF4444",
  no_decision: "#F59E0B",
  offer_extended: "#3B82F6",
  rejected: "#EF4444",
};

