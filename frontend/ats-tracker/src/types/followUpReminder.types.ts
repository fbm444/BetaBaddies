// Follow-Up Reminder Types

export type ReminderType = 'application' | 'interview' | 'post_interview' | 'offer_response' | 'custom';
export type ReminderStatus = 'pending' | 'snoozed' | 'completed' | 'dismissed' | 'expired';
export type ResponseType = 'positive' | 'negative' | 'neutral' | 'no_response';

export interface FollowUpReminder {
  id: string;
  userId: string;
  jobOpportunityId: string;
  jobTitle?: string;
  companyName?: string;
  location?: string;
  currentStatus?: string;
  
  // Reminder Details
  reminderType: ReminderType;
  applicationStage: string;
  scheduledDate: string;
  dueDate: string;
  completedAt?: string;
  dismissedAt?: string;
  snoozedUntil?: string;
  
  // Timing Configuration
  daysAfterEvent?: number;
  eventDate?: string;
  
  // Email Template
  emailTemplateId?: string;
  generatedEmailSubject?: string;
  generatedEmailBody?: string;
  
  // Tracking
  emailSentAt?: string;
  responseReceivedAt?: string;
  responseType?: ResponseType;
  
  // Adaptive Settings
  reminderFrequencyDays: number;
  companyResponsivenessScore: number;
  
  // Status
  status: ReminderStatus;
  isActive: boolean;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  
  // Computed fields
  daysUntilDue?: number;
  isOverdue?: boolean;
}

export interface FollowUpReminderRule {
  id: string;
  userId: string;
  applicationStage: string;
  reminderType: ReminderType;
  daysAfterEvent: number;
  isEnabled: boolean;
  customMessage?: string;
  preferredContactMethod: 'email' | 'linkedin' | 'phone';
  createdAt: string;
  updatedAt: string;
}

export interface CompanyResponsiveness {
  id: string;
  userId: string;
  companyName: string;
  totalFollowUpsSent: number;
  totalResponsesReceived: number;
  averageResponseTimeHours?: number;
  responsivenessScore: number;
  lastFollowUpSentAt?: string;
  lastResponseReceivedAt?: string;
  responseRate: number;
  preferredFollowUpFrequencyDays: number;
  updatedAt: string;
}

export interface EmailTemplate {
  id: string;
  templateType: string;
  templateName: string;
  subjectTemplate: string;
  bodyTemplate: string;
  variables?: string[];
  isSystemTemplate: boolean;
  createdAt: string;
}

export interface FollowUpReminderInput {
  jobOpportunityId: string;
  reminderType?: ReminderType;
  scheduledDate?: string;
  dueDate?: string;
  customMessage?: string;
  daysAfterEvent?: number;
}

export interface FollowUpReminderUpdate {
  responseType?: ResponseType;
  notes?: string;
}

export interface SnoozeReminderInput {
  days: number;
}

