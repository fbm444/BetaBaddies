// Network Types for ATS Tracker
// UC-086, UC-087, UC-088: Network Management

// Professional Contacts
export interface ProfessionalContact {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  industry?: string;
  location?: string;
  relationshipType?: string;
  relationshipStrength?: string;
  relationshipContext?: string;
  personalInterests?: string;
  professionalInterests?: string;
  linkedinUrl?: string;
  notes?: string;
  importedFrom?: string;
  lastInteractionDate?: string;
  nextReminderDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContactInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  industry?: string;
  location?: string;
  relationshipType?: string;
  relationshipStrength?: string;
  relationshipContext?: string;
  personalInterests?: string;
  professionalInterests?: string;
  linkedinUrl?: string;
  notes?: string;
  importedFrom?: string;
  lastInteractionDate?: string;
  nextReminderDate?: string;
}

export interface ContactInteraction {
  id: string;
  contactId: string;
  interactionType?: string;
  interactionDate: string;
  summary?: string;
  notes?: string;
  createdAt?: string;
}

export interface ContactInteractionInput {
  interactionType?: string;
  interactionDate?: string;
  summary?: string;
  notes?: string;
}

// Networking Events
export interface NetworkingEvent {
  id: string;
  userId: string;
  eventName: string;
  eventType?: string;
  industry?: string;
  location?: string;
  eventDate: string;
  eventTime?: string;
  endDate?: string;
  endTime?: string;
  eventUrl?: string;
  description?: string;
  networkingGoals?: string;
  preparationNotes?: string;
  attended: boolean;
  attendanceDate?: string;
  postEventNotes?: string;
  roiScore?: number;
  connectionsMadeCount: number;
  signupCount?: number;
  creatorEmail?: string;
  cancelled?: boolean;
  cancelledAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NetworkingEventInput {
  eventName: string;
  eventType?: string;
  industry?: string;
  location?: string;
  eventDate: string;
  eventTime?: string;
  endDate?: string;
  endTime?: string;
  eventUrl?: string;
  description?: string;
  networkingGoals?: string;
  preparationNotes?: string;
  attended?: boolean;
  attendanceDate?: string;
  postEventNotes?: string;
  roiScore?: number;
  connectionsMadeCount?: number;
}

export interface EventConnection {
  id: string;
  eventId: string;
  contactId: string;
  contactName?: string;
  contactEmail?: string;
  contactCompany?: string;
  contactJobTitle?: string;
  contactIndustry?: string;
  connectionQuality?: string;
  followupRequired: boolean;
  followupCompleted: boolean;
  notes?: string;
  createdAt?: string;
}

export interface EventConnectionInput {
  contactId: string;
  connectionQuality?: string;
  followupRequired?: boolean;
  notes?: string;
}

// Referral Requests
export interface ReferralRequest {
  id: string;
  userId: string;
  contactId: string;
  jobId: string;
  requestTemplateId?: string;
  personalizedMessage?: string;
  requestStatus: string;
  sentAt?: string;
  responseReceivedAt?: string;
  responseContent?: string;
  referralSuccessful?: boolean;
  followupRequired: boolean;
  followupSentAt?: string;
  gratitudeExpressed: boolean;
  relationshipImpact?: string;
  createdAt?: string;
  updatedAt?: string;
  // Joined fields
  contactName?: string;
  contactEmail?: string;
  contactCompany?: string;
  jobTitle?: string;
  jobCompany?: string;
}

export interface ReferralRequestInput {
  contactId: string;
  jobId: string;
  requestTemplateId?: string;
  personalizedMessage?: string;
  requestStatus?: string;
  sentAt?: string;
  responseReceivedAt?: string;
  responseContent?: string;
  referralSuccessful?: boolean;
  followupRequired?: boolean;
  followupSentAt?: string;
  gratitudeExpressed?: boolean;
  relationshipImpact?: string;
}

export interface ReferralTemplate {
  id: string;
  templateName?: string;
  templateBody?: string;
  etiquetteGuidance?: string;
  timingGuidance?: string;
  createdAt?: string;
}

// Discovered Events from External APIs
export interface DiscoveredEvent {
  id: string;
  name: string;
  description?: string;
  url?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  location?: string;
  isVirtual: boolean;
  organizer?: string;
  category?: string;
  imageUrl?: string;
  capacity?: number;
  ticketAvailability?: string;
  source: string;
  signupCount?: number;
  creatorEmail?: string;
  isRegistered?: boolean;
  cancelled?: boolean;
  cancelledAt?: string;
  createdAt?: string;
}

// Networking Goals
export interface NetworkingGoal {
  id: string;
  userId: string;
  goalDescription?: string;
  targetIndustry?: string;
  targetCompanies?: string[];
  targetRoles?: string[];
  goalType?: string;
  targetCount: number;
  currentCount: number;
  deadline?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NetworkingGoalInput {
  goalDescription?: string;
  targetIndustry?: string;
  targetCompanies?: string[];
  targetRoles?: string[];
  goalType?: string;
  targetCount?: number;
  deadline?: string;
  status?: string;
}

// Event Attendees
export interface EventAttendee {
  registrationId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  industry?: string;
  jobTitle?: string;
  location?: string;
  registeredAt?: string;
  status?: string;
  isContact?: boolean; // Whether this attendee is already a contact
  contactId?: string; // ID of the existing contact if isContact is true
}

// Event Goals (linked to specific events)
export interface EventGoals {
  id: string;
  userId: string;
  eventId: string;
  eventName?: string;
  eventDate?: string;
  goalDescription?: string;
  targetIndustry?: string;
  targetCompanies?: string[];
  targetRoles?: string[];
  goalType?: string;
  targetCount: number;
  currentCount: number;
  deadline?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EventGoalsInput {
  goalDescription?: string;
  targetIndustry?: string;
  targetCompanies?: string[];
  targetRoles?: string[];
  goalType?: string;
  targetCount?: number;
  currentCount?: number;
  deadline?: string;
  status?: string;
}

