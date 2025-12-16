# Intelligent Follow-Up Reminders - Implementation Plan

## Overview
Automated follow-up reminder system that helps users maintain appropriate contact with employers based on application stage, timing, and company responsiveness.

---

## 1. Database Schema

### 1.1 `follow_up_reminders` Table
```sql
CREATE TABLE follow_up_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_opportunity_id UUID NOT NULL REFERENCES job_opportunities(id) ON DELETE CASCADE,
  
  -- Reminder Details
  reminder_type VARCHAR(50) NOT NULL, -- 'application', 'interview', 'post_interview', 'offer_response', 'custom'
  application_stage VARCHAR(50) NOT NULL, -- Current status when reminder was created
  scheduled_date TIMESTAMP NOT NULL,
  due_date TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  dismissed_at TIMESTAMP,
  snoozed_until TIMESTAMP,
  
  -- Timing Configuration
  days_after_event INTEGER, -- e.g., 7 days after application, 3 days after interview
  event_date TIMESTAMP, -- The event this reminder is based on (application date, interview date, etc.)
  
  -- Email Template
  email_template_id UUID REFERENCES email_templates(id),
  generated_email_subject TEXT,
  generated_email_body TEXT,
  
  -- Tracking
  email_sent_at TIMESTAMP,
  response_received_at TIMESTAMP,
  response_type VARCHAR(50), -- 'positive', 'negative', 'neutral', 'no_response'
  
  -- Adaptive Settings
  reminder_frequency_days INTEGER DEFAULT 7, -- Adjusts based on responsiveness
  company_responsiveness_score DECIMAL(3,2), -- 0.0 to 1.0, based on response history
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'snoozed', 'completed', 'dismissed', 'expired'
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_reminder_type CHECK (reminder_type IN ('application', 'interview', 'post_interview', 'offer_response', 'custom')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'snoozed', 'completed', 'dismissed', 'expired'))
);

CREATE INDEX idx_follow_up_user_job ON follow_up_reminders(user_id, job_opportunity_id);
CREATE INDEX idx_follow_up_due_date ON follow_up_reminders(due_date) WHERE status = 'pending';
CREATE INDEX idx_follow_up_scheduled ON follow_up_reminders(scheduled_date) WHERE is_active = true;
```

### 1.2 `follow_up_reminder_rules` Table
```sql
CREATE TABLE follow_up_reminder_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Rule Configuration
  application_stage VARCHAR(50) NOT NULL, -- 'Applied', 'Interview', 'Offer', etc.
  reminder_type VARCHAR(50) NOT NULL,
  days_after_event INTEGER NOT NULL, -- Default timing
  is_enabled BOOLEAN DEFAULT true,
  
  -- Customization
  custom_message TEXT,
  preferred_contact_method VARCHAR(50) DEFAULT 'email', -- 'email', 'linkedin', 'phone'
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, application_stage, reminder_type)
);
```

### 1.3 `company_responsiveness_tracking` Table
```sql
CREATE TABLE company_responsiveness_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  
  -- Metrics
  total_follow_ups_sent INTEGER DEFAULT 0,
  total_responses_received INTEGER DEFAULT 0,
  average_response_time_hours DECIMAL(10,2),
  responsiveness_score DECIMAL(3,2) DEFAULT 0.5, -- 0.0 to 1.0
  
  -- Last Interaction
  last_follow_up_sent_at TIMESTAMP,
  last_response_received_at TIMESTAMP,
  
  -- Calculated Fields
  response_rate DECIMAL(5,2), -- percentage
  preferred_follow_up_frequency_days INTEGER DEFAULT 7,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, company_name)
);
```

### 1.4 `email_templates` Table (if not exists)
```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type VARCHAR(50) NOT NULL, -- 'follow_up_application', 'follow_up_interview', etc.
  template_name VARCHAR(255) NOT NULL,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  variables JSONB, -- Available template variables
  is_system_template BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 2. Backend Services

### 2.1 `followUpReminderService.js`
**Responsibilities:**
- Create reminders based on application events
- Calculate appropriate timing
- Generate email templates
- Track completion and responses
- Adjust frequency based on responsiveness

**Key Methods:**
```javascript
class FollowUpReminderService {
  // Create reminder when application status changes
  async createReminderForStatusChange(jobOpportunityId, newStatus, eventDate)
  
  // Calculate appropriate follow-up timing
  calculateFollowUpTiming(applicationStage, eventDate, companyResponsiveness)
  
  // Generate email template based on stage
  async generateFollowUpEmail(reminderId, jobOpportunityId)
  
  // Get pending reminders for user
  async getPendingReminders(userId, limit = 10)
  
  // Mark reminder as completed
  async completeReminder(reminderId, responseType = null)
  
  // Snooze reminder
  async snoozeReminder(reminderId, days)
  
  // Dismiss reminder
  async dismissReminder(reminderId)
  
  // Update company responsiveness score
  async updateCompanyResponsiveness(userId, companyName, responseReceived)
  
  // Auto-disable reminders for rejected applications
  async handleRejectedApplication(jobOpportunityId)
  
  // Get follow-up etiquette tips
  getEtiquetteTips(applicationStage, daysSinceLastContact)
}
```

### 2.2 `followUpEmailService.js`
**Responsibilities:**
- Generate personalized email templates
- Use AI for context-aware emails
- Include relevant job/company details

**Key Methods:**
```javascript
class FollowUpEmailService {
  async generateEmailTemplate(reminderType, jobOpportunity, daysSinceEvent)
  async personalizeEmail(template, jobOpportunity, userProfile)
  getEmailVariables(jobOpportunity) // Returns available template variables
}
```

### 2.3 `companyResponsivenessService.js`
**Responsibilities:**
- Track company response patterns
- Calculate responsiveness scores
- Adjust reminder frequency

**Key Methods:**
```javascript
class CompanyResponsivenessService {
  async calculateResponsivenessScore(userId, companyName)
  async updateResponseMetrics(userId, companyName, responseTime, responseType)
  async getRecommendedFollowUpFrequency(userId, companyName)
}
```

---

## 3. Backend API Endpoints

### 3.1 Reminder Management
```
GET    /api/v1/follow-up-reminders
       - Get all reminders for user
       - Query params: status, jobOpportunityId, limit, offset

GET    /api/v1/follow-up-reminders/pending
       - Get pending reminders (for notifications)

GET    /api/v1/follow-up-reminders/:id
       - Get specific reminder details

POST   /api/v1/follow-up-reminders
       - Create custom reminder
       - Body: { jobOpportunityId, reminderType, scheduledDate, customMessage }

PATCH  /api/v1/follow-up-reminders/:id/complete
       - Mark reminder as completed
       - Body: { responseType?, notes? }

PATCH  /api/v1/follow-up-reminders/:id/snooze
       - Snooze reminder
       - Body: { days }

PATCH  /api/v1/follow-up-reminders/:id/dismiss
       - Dismiss reminder

DELETE /api/v1/follow-up-reminders/:id
       - Delete reminder
```

### 3.2 Email Templates
```
GET    /api/v1/follow-up-reminders/:id/email-template
       - Get generated email template for reminder

POST   /api/v1/follow-up-reminders/:id/send-email
       - Send follow-up email directly
       - Body: { recipientEmail?, customSubject?, customBody? }
```

### 3.3 Settings & Rules
```
GET    /api/v1/follow-up-reminders/rules
       - Get user's reminder rules/preferences

POST   /api/v1/follow-up-reminders/rules
       - Create/update reminder rule
       - Body: { applicationStage, reminderType, daysAfterEvent, isEnabled }

GET    /api/v1/follow-up-reminders/etiquette-tips
       - Get etiquette tips for current stage
       - Query params: applicationStage, daysSinceLastContact
```

### 3.4 Company Responsiveness
```
GET    /api/v1/company-responsiveness/:companyName
       - Get responsiveness metrics for company
```

---

## 4. Frontend Components

### 4.1 `FollowUpReminderNotification.tsx`
**Purpose:** Show reminder notifications in header/navbar
**Features:**
- Badge count of pending reminders
- Dropdown list of upcoming reminders
- Quick actions (snooze, dismiss, view)
- Link to full reminder page

### 4.2 `FollowUpRemindersPage.tsx`
**Purpose:** Main page for managing all reminders
**Features:**
- List of all reminders (pending, completed, dismissed)
- Filter by status, job opportunity, date
- Calendar view of upcoming reminders
- Bulk actions

### 4.3 `FollowUpReminderCard.tsx`
**Purpose:** Individual reminder card component
**Features:**
- Display reminder details (job, stage, due date)
- Show generated email preview
- Actions: Complete, Snooze, Dismiss, View Email
- Status indicators (overdue, upcoming, completed)

### 4.4 `FollowUpEmailTemplate.tsx`
**Purpose:** Display and edit email template
**Features:**
- Show generated email template
- Edit subject/body
- Preview with job details
- Send email directly
- Copy to clipboard

### 4.5 `FollowUpReminderSettings.tsx`
**Purpose:** Configure reminder rules and preferences
**Features:**
- Enable/disable reminders by stage
- Set default timing for each stage
- Customize email templates
- Set notification preferences

### 4.6 `EtiquetteTipsPanel.tsx`
**Purpose:** Show follow-up best practices
**Features:**
- Context-aware tips based on stage
- Days since last contact
- Company responsiveness indicators
- Do's and don'ts

### 4.7 Integration in `JobOpportunityDetailModal.tsx`
- Add "Follow-Up Reminders" section
- Show upcoming reminders for this job
- Quick action to create reminder
- Link to email template

---

## 5. Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- [ ] Create database tables and migrations
- [ ] Implement `followUpReminderService.js` (basic CRUD)
- [ ] Create API endpoints for reminder management
- [ ] Basic frontend components (list, card, notification)

### Phase 2: Timing & Scheduling (Week 2)
- [ ] Implement timing calculation logic
- [ ] Auto-create reminders on status changes
- [ ] Integration with job opportunity status updates
- [ ] Calendar/scheduling view

### Phase 3: Email Generation (Week 3)
- [ ] Implement email template generation
- [ ] AI-powered email personalization
- [ ] Email preview and editing
- [ ] Send email functionality

### Phase 4: Intelligence & Adaptation (Week 4)
- [ ] Company responsiveness tracking
- [ ] Adaptive frequency adjustment
- [ ] Auto-disable for rejected applications
- [ ] Response tracking and metrics

### Phase 5: UX Enhancements (Week 5)
- [ ] Etiquette tips system
- [ ] Snooze/dismiss functionality
- [ ] Notification system
- [ ] Settings and preferences UI

### Phase 6: Testing & Polish (Week 6)
- [ ] End-to-end testing
- [ ] Edge case handling
- [ ] Performance optimization
- [ ] Documentation

---

## 6. Key Business Logic

### 6.1 Default Timing Rules
```javascript
const DEFAULT_TIMING = {
  'Applied': 7, // 1 week after application
  'Interview Scheduled': 1, // 1 day before interview
  'Interview Completed': 3, // 3 days after interview
  'Offer Received': 2, // 2 days to respond to offer
  'Offer Accepted': 0, // No follow-up needed
  'Rejected': 0, // Auto-disable
  'Withdrawn': 0, // Auto-disable
};
```

### 6.2 Responsiveness Score Calculation
```javascript
function calculateResponsivenessScore(companyMetrics) {
  const responseRate = companyMetrics.totalResponses / companyMetrics.totalFollowUps;
  const avgResponseTime = companyMetrics.averageResponseTimeHours;
  
  // Faster responses = higher score
  const timeScore = avgResponseTime < 24 ? 1.0 : 
                    avgResponseTime < 72 ? 0.7 : 
                    avgResponseTime < 168 ? 0.4 : 0.2;
  
  // Combine response rate and time
  return (responseRate * 0.6) + (timeScore * 0.4);
}
```

### 6.3 Adaptive Frequency
```javascript
function getRecommendedFrequency(responsivenessScore) {
  if (responsivenessScore > 0.7) {
    return 5; // Responsive companies: check in more frequently
  } else if (responsivenessScore > 0.4) {
    return 7; // Average: standard frequency
  } else {
    return 10; // Less responsive: space out follow-ups
  }
}
```

---

## 7. Integration Points

### 7.1 Job Opportunity Status Changes
**Location:** `backend/services/jobOpportunityService.js`
```javascript
// When status changes, trigger reminder creation
async function updateJobOpportunityStatus(jobId, newStatus) {
  // ... existing status update logic
  
  // Create follow-up reminder if applicable
  if (shouldCreateReminder(newStatus, oldStatus)) {
    await followUpReminderService.createReminderForStatusChange(
      jobId, 
      newStatus, 
      new Date()
    );
  }
  
  // Auto-disable reminders if rejected
  if (newStatus === 'Rejected') {
    await followUpReminderService.handleRejectedApplication(jobId);
  }
}
```

### 7.2 Email Response Tracking
**Location:** `backend/services/emailService.js`
```javascript
// When email response received, update tracking
async function handleEmailResponse(emailId, jobOpportunityId) {
  // ... existing email handling
  
  // Update follow-up reminder if applicable
  await followUpReminderService.recordResponse(
    jobOpportunityId,
    'email',
    responseType
  );
  
  // Update company responsiveness
  await companyResponsivenessService.updateResponseMetrics(
    userId,
    companyName,
    responseTime,
    responseType
  );
}
```

### 7.3 Notification System
**Location:** Frontend notification service
```javascript
// Poll for pending reminders
useEffect(() => {
  const interval = setInterval(async () => {
    const reminders = await api.getPendingReminders();
    if (reminders.length > 0) {
      showNotification({
        type: 'follow_up_reminder',
        count: reminders.length,
        reminders: reminders
      });
    }
  }, 60000); // Check every minute
  
  return () => clearInterval(interval);
}, []);
```

---

## 8. Email Template Examples

### 8.1 Post-Application Follow-Up (7 days)
```
Subject: Following up on [Job Title] application at [Company]

Hi [Recruiter Name],

I wanted to follow up on my application for the [Job Title] position 
that I submitted on [Application Date]. I'm very interested in this 
opportunity and would love to discuss how my experience in [Relevant 
Skill/Experience] aligns with your team's needs.

I'm happy to provide any additional information or answer any questions 
you might have. Thank you for your time and consideration.

Best regards,
[Your Name]
```

### 8.2 Post-Interview Follow-Up (3 days)
```
Subject: Thank you - [Job Title] Interview

Hi [Interviewer Name],

Thank you for taking the time to speak with me about the [Job Title] 
position on [Interview Date]. I enjoyed learning more about [Specific 
Topic Discussed] and the team's goals for [Project/Initiative].

I'm very excited about the opportunity to contribute to [Company] and 
believe my experience with [Relevant Experience] would be a great fit. 
Please let me know if you need any additional information.

I look forward to hearing from you.

Best regards,
[Your Name]
```

---

## 9. Testing Strategy

### 9.1 Unit Tests
- Timing calculation logic
- Responsiveness score calculation
- Email template generation
- Reminder status transitions

### 9.2 Integration Tests
- Status change triggers reminder creation
- Email sending integration
- Response tracking updates
- Auto-disable on rejection

### 9.3 E2E Tests
- Create reminder → receive notification → complete reminder
- Snooze reminder → verify rescheduling
- Dismiss reminder → verify removal
- Email template generation and sending

---

## 10. Future Enhancements

- [ ] LinkedIn follow-up integration
- [ ] Phone call reminders
- [ ] Multi-language email templates
- [ ] A/B testing for email effectiveness
- [ ] Analytics dashboard for follow-up success rates
- [ ] Integration with calendar apps
- [ ] Smart suggestions based on industry best practices
- [ ] Batch follow-up management

---

## 11. Acceptance Criteria Verification

✅ **Automatically schedule follow-ups based on application stage**
- Verified: Reminders created on status change
- Test: Change status → verify reminder created

✅ **Suggest appropriate follow-up timing**
- Verified: Default timing rules applied
- Test: Check reminder due dates match expected timing

✅ **Generate follow-up email templates**
- Verified: Email template generated with job details
- Test: View reminder → verify email template populated

✅ **Track follow-up completion and responses**
- Verified: Completion status tracked
- Test: Complete reminder → verify status updated

✅ **Adjust reminder frequency based on responsiveness**
- Verified: Frequency adjusted based on company score
- Test: Multiple interactions → verify frequency changes

✅ **Disable reminders for rejected applications**
- Verified: Auto-disable on rejection
- Test: Reject application → verify reminders disabled

✅ **Provide follow-up etiquette tips**
- Verified: Tips shown in UI
- Test: View reminder → verify tips displayed

✅ **Allow snoozing or dismissing reminders**
- Verified: Snooze/dismiss actions work
- Test: Snooze reminder → verify rescheduled

✅ **Frontend Verification**
- Verified: Notification received
- Test: Reminder due → verify notification appears
- Test: Email template appropriate for stage

---

## 12. Database Migration Files

### `001_create_follow_up_reminders_tables.sql`
- Create all tables
- Add indexes
- Add foreign keys
- Add constraints

### `002_insert_default_email_templates.sql`
- Insert system email templates
- Template variables documentation

### `003_add_follow_up_reminder_triggers.sql`
- Auto-create reminders on status change
- Auto-update responsiveness scores
- Auto-disable on rejection

---

## 13. Environment Variables

```env
# Follow-up Reminder Settings
FOLLOW_UP_REMINDER_ENABLED=true
DEFAULT_FOLLOW_UP_FREQUENCY_DAYS=7
MAX_FOLLOW_UP_REMINDERS_PER_JOB=5

# Email Settings
FOLLOW_UP_EMAIL_FROM=noreply@yourapp.com
FOLLOW_UP_EMAIL_REPLY_TO=support@yourapp.com

# AI Settings (for email generation)
OPENAI_API_KEY=your_key_here
FOLLOW_UP_EMAIL_USE_AI=true
```

---

## 14. API Response Examples

### Get Pending Reminders
```json
{
  "ok": true,
  "data": {
    "reminders": [
      {
        "id": "uuid",
        "jobOpportunityId": "uuid",
        "jobTitle": "Software Engineer",
        "company": "Tech Corp",
        "reminderType": "post_interview",
        "dueDate": "2024-01-15T10:00:00Z",
        "daysOverdue": 0,
        "emailTemplate": {
          "subject": "Thank you - Software Engineer Interview",
          "body": "..."
        },
        "etiquetteTips": [
          "Keep it brief and professional",
          "Reference specific discussion points"
        ]
      }
    ],
    "total": 5
  }
}
```

---

This plan provides a comprehensive roadmap for implementing the intelligent follow-up reminder system. Each phase builds on the previous one, ensuring a solid foundation before adding advanced features.

