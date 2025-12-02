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
  contactUserId?: string;
  profilePicture?: string;
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
  contactUserId?: string;
}

export interface ContactInteraction {
  id: string;
  contactId: string;
  interactionType?: string;
  interactionDate: string;
  summary?: string;
  notes?: string;
  createdAt?: string;
  source?: "interaction" | "event" | "referral";
  // Event-specific fields
  eventId?: string;
  eventName?: string;
  eventType?: string;
  eventDate?: string;
  eventTime?: string;
  location?: string;
  industry?: string;
  userAttended?: boolean;
  attendanceDate?: string;
  // Referral-specific fields
  referralId?: string;
  requestStatus?: string;
  sentAt?: string;
  responseReceivedAt?: string;
  responseContent?: string;
  referralSuccessful?: boolean;
  personalizedMessage?: string;
  followupRequired?: boolean;
  gratitudeExpressed?: boolean;
  relationshipImpact?: string;
  jobTitle?: string;
  jobCompany?: string;
}

export interface ContactInteractionInput {
  interactionType?: string;
  interactionDate?: string;
  summary?: string;
  notes?: string;
}

export interface ContactNetworkItem {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  industry?: string;
  location?: string;
  linkedinUrl?: string;
  profilePicture?: string;
  connectionStrength?: string;
}

export interface DiscoveredContact {
  id: string;
  contactName?: string;
  contactTitle?: string;
  company?: string;
  email?: string;
  phone?: string;
  industry?: string;
  location?: string;
  linkedinUrl?: string;
  profilePicture?: string;
  discoverySource?: string;
  connectionDegree?: string;
  mutualConnections?: Array<Record<string, any>> | string[] | null;
  connectionPath?: string;
  relevanceScore?: number;
  outreachInitiated?: boolean;
  addedToContacts?: boolean;
  alreadyInContacts?: boolean;
  createdAt?: string;
}

export interface GoogleContactsStatus {
  connected: boolean;
  lastSyncAt?: string | null;
  totalImported?: number;
  lastImportCount?: number;
  needsReconnect?: boolean;
}

export interface GoogleContactsImportSummary {
  fetched: number;
  processed: number;
  created: number;
  skippedNoEmail: number;
  skippedExisting: number;
  errors: { email?: string | null; message: string }[];
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
  isVirtual?: boolean;
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
  isVirtual?: boolean;
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
  draftReferralLetter?: string;
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
  jobLocation?: string;
  requesterName?: string;
  requesterEmail?: string;
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
  tone?: "warm professional" | "friendly casual" | "formal respectful" | "enthusiastic";
  length?: "brief" | "standard" | "detailed";
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

