import type { FollowUpReminder } from "../types";

/**
 * Transform backend reminder data (snake_case) to frontend format (camelCase)
 */
export function transformReminder(backendReminder: any): FollowUpReminder | null {
  try {
    // Comprehensive null/undefined checks
    if (!backendReminder) {
      return null;
    }
    
    if (typeof backendReminder !== 'object') {
      return null;
    }

    // Check if id exists and is valid - if not, it's invalid
    if (!backendReminder.hasOwnProperty('id')) {
      return null;
    }
    
    const id = backendReminder.id;
    if (id == null || id === undefined || (typeof id !== 'string' && typeof id !== 'number')) {
      return null;
    }

    return {
    id: String(backendReminder.id),
    userId: String(backendReminder.user_id || backendReminder.userId || ''),
    jobOpportunityId: String(backendReminder.job_opportunity_id || backendReminder.jobOpportunityId || ''),
    jobTitle: backendReminder.job_title || backendReminder.jobTitle || undefined,
    companyName: backendReminder.company_name || backendReminder.companyName || undefined,
    location: backendReminder.location || undefined,
    currentStatus: backendReminder.current_status || backendReminder.currentStatus || undefined,
    
    // Reminder Details
    reminderType: backendReminder.reminder_type || backendReminder.reminderType || 'custom',
    applicationStage: backendReminder.application_stage || backendReminder.applicationStage || '',
    scheduledDate: backendReminder.scheduled_date || backendReminder.scheduledDate || new Date().toISOString(),
    dueDate: backendReminder.due_date || backendReminder.dueDate || new Date().toISOString(),
    completedAt: backendReminder.completed_at || backendReminder.completedAt || undefined,
    dismissedAt: backendReminder.dismissed_at || backendReminder.dismissedAt || undefined,
    snoozedUntil: backendReminder.snoozed_until || backendReminder.snoozedUntil || undefined,
    
    // Timing Configuration
    daysAfterEvent: backendReminder.days_after_event ?? backendReminder.daysAfterEvent ?? undefined,
    eventDate: backendReminder.event_date || backendReminder.eventDate || undefined,
    
    // Email Template
    emailTemplateId: backendReminder.email_template_id || backendReminder.emailTemplateId || undefined,
    generatedEmailSubject: backendReminder.generated_email_subject || backendReminder.generatedEmailSubject || undefined,
    generatedEmailBody: backendReminder.generated_email_body || backendReminder.generatedEmailBody || undefined,
    
    // Tracking
    emailSentAt: backendReminder.email_sent_at || backendReminder.emailSentAt || undefined,
    responseReceivedAt: backendReminder.response_received_at || backendReminder.responseReceivedAt || undefined,
    responseType: backendReminder.response_type || backendReminder.responseType || undefined,
    
    // Adaptive Settings
    reminderFrequencyDays: backendReminder.reminder_frequency_days ?? backendReminder.reminderFrequencyDays ?? 7,
    companyResponsivenessScore: parseFloat(backendReminder.company_responsiveness_score || backendReminder.companyResponsivenessScore || '0.5'),
    
    // Status
    status: backendReminder.status || 'pending',
    isActive: backendReminder.is_active ?? backendReminder.isActive ?? true,
    
    // Metadata
    createdAt: backendReminder.created_at || backendReminder.createdAt || new Date().toISOString(),
    updatedAt: backendReminder.updated_at || backendReminder.updatedAt || new Date().toISOString(),
    
    // Computed fields
    daysUntilDue: backendReminder.days_until_due ?? backendReminder.daysUntilDue ?? undefined,
    isOverdue: backendReminder.is_overdue ?? backendReminder.isOverdue ?? undefined,
  };
  } catch (error) {
    console.error("Error transforming reminder:", error);
    return null;
  }
}

/**
 * Transform array of backend reminders to frontend format
 */
export function transformReminders(backendReminders: any[]): FollowUpReminder[] {
  if (!Array.isArray(backendReminders)) {
    return [];
  }

  return backendReminders
    .map(transformReminder)
    .filter((r): r is FollowUpReminder => r !== null);
}

