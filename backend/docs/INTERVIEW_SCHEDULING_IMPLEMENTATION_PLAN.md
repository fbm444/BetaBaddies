# Interview Scheduling System - Implementation Plan

## 📋 Overview

This document outlines how to implement an integrated interview scheduling system with calendar sync, reminders, and follow-up actions.

## ✅ What Already Exists

### Backend
- ✅ **Google Calendar Integration** (`googleCalendarService.js`)
  - OAuth authentication flow
  - Create/update/delete calendar events
  - Basic event details (title, time, location, description)
  - Reminders in calendar (24h email, 1h popup)

- ✅ **Interview Service** (`interviewService.js`)
  - Create/update/delete interviews
  - Link to job opportunities
  - Preparation tasks generation
  - Conflict detection
  - Status and outcome tracking

- ✅ **Database Schema**
  - `interviews` table with all necessary fields
  - `interview_preparation_tasks` table
  - `interview_conflicts` table
  - Job opportunity linking

### Frontend
- ✅ **Interview Scheduling Page** (`InterviewScheduling.tsx`)
  - Create/edit interviews
  - View interviews in list/calendar format
  - Link to job opportunities

---

## 🚀 What Needs to be Implemented

### 1. Google Calendar Integration

#### Current State
- ✅ Google Calendar service exists and works
- ✅ OAuth flow implemented
- ✅ Create/update/delete events works

#### To Verify/Enhance

- Ensure Google Calendar integration is properly connected throughout the interview scheduling flow
- Calendar sync should happen automatically when interviews are created/updated/deleted

---

### 2. Reminder System (24h and 2h Before)

#### Current State
- ✅ Calendar events have reminders built-in (Google's system)
- ❌ No custom email reminders
- ❌ No in-app notifications

#### To Implement

**A. Reminder Tracking Table**

```sql
CREATE TABLE interview_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('24_hours', '2_hours', 'custom')),
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT unique_interview_reminder UNIQUE (interview_id, reminder_type)
);
```

**B. Reminder Service** (`backend/services/reminderService.js`)

1. **Functions needed:**
   - `scheduleReminders(interviewId)` - Create 24h and 2h reminders when interview is created
   - `sendReminder(reminderId)` - Send reminder via email/push
   - `cancelReminders(interviewId)` - Cancel if interview cancelled
   - `rescheduleReminders(interviewId, newDateTime)` - Update reminder times

2. **Integration points:**
   - Called when interview is created
   - Called when interview is rescheduled
   - Called when interview is cancelled

**C. Scheduled Job/Cron System**

1. **Background Worker** (`backend/services/scheduler.js` or use `node-cron`)
   - Run every 5-15 minutes
   - Query `interview_reminders` for due reminders
   - Send emails/notifications
   - Update reminder status

2. **Email Templates** (`backend/templates/reminderEmail.html`)
   - 24-hour reminder: "Interview tomorrow at [time]"
   - 2-hour reminder: "Interview in 2 hours"
   - Include: Interview details, location/link, preparation checklist

**D. Email Service Enhancement**

- Extend existing `emailService.js` to send reminder emails
- Use existing SMTP configuration
- Include interview details and links

---

### 3. Job Application Linking Enhancement

#### Current State
- ✅ Interviews can link to job opportunities via `job_opportunity_id`
- ✅ Frontend can select job opportunity when creating interview

#### To Implement

**A. Frontend Improvements**

1. **Schedule from Job Opportunities Page**
   - Add "Schedule Interview" button on each job opportunity
   - Pre-populate interview form with:
     - Company name
     - Job title
     - Interviewer info (if saved)
   - Direct navigation to interview scheduling with pre-filled data

2. **Visual Linking in UI**
   - Show linked job opportunity in interview details
   - Link back to job opportunity from interview
   - Show all interviews for a job opportunity

**B. Backend Enhancement**

- Add endpoint: `GET /api/v1/job-opportunities/:id/interviews`
- Return all interviews linked to a job opportunity

---

### 4. Preparation Tasks & Reminders

#### Current State
- ✅ Default preparation tasks are auto-generated
- ✅ Tasks stored in database

#### To Implement

**A. Task Reminders in UI**

1. **Preparation Dashboard**
   - Show upcoming interviews with prep status
   - Checklist of incomplete tasks
   - Progress indicator (X of Y tasks complete)

2. **Task Notifications**
   - In-app notifications for tasks due soon
   - Email reminders for incomplete tasks 1 day before interview

**B. Smart Task Generation**

- Based on interview format (phone/video/in-person)
- Based on job opportunity industry/role
- Based on interviewer information (if available)

---

### 5. Thank-You Note Generation Integration

#### Current State
- ❌ Thank-you note system doesn't exist yet

#### To Implement

**A. Thank-You Note Service** (`backend/services/thankYouNoteService.js`)

1. **Generate Thank-You Notes**
   - After interview completion (status = 'completed')
   - Use interview data:
     - Interviewer name/email
     - Interview date/time
     - Job opportunity details
     - Interview notes
   - AI-generated or template-based

2. **Integration Points**
   - Button in interview details: "Send Thank-You Note"
   - Auto-suggest after interview completion
   - Link to existing cover letter system if available

3. **Database**
   ```sql
   CREATE TABLE interview_thank_you_notes (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
       recipient_email VARCHAR(255),
       recipient_name VARCHAR(255),
       subject VARCHAR(500),
       body TEXT,
       sent_at TIMESTAMP WITH TIME ZONE,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
   );
   ```

**B. Frontend Integration**

- Modal/component to:
  - Review generated note
  - Edit before sending
  - Send via email
  - Track sent status

---

### 6. Follow-Up Actions Tracking

#### Current State
- ✅ Interview outcomes tracked (outcome field)
- ❌ No structured follow-up actions

#### To Implement

**A. Follow-Up Actions Table**

```sql
CREATE TABLE interview_follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'thank_you_note', 'follow_up_email', 'status_inquiry', 
        'references_sent', 'portfolio_sent', 'other'
    )),
    due_date TIMESTAMP WITH TIME ZONE,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**B. Auto-Generate Follow-Ups**

- After interview completion, suggest:
  - Send thank-you note (within 24 hours)
  - Follow-up email (within 1 week)
  - Status inquiry (after 2 weeks)

**C. Follow-Up Dashboard**

- Show pending follow-up actions
- Mark as complete
- Set reminders for follow-ups

---

## 📐 Architecture Decisions

### 1. Reminder System Architecture

**Option A: Database-Driven + Cron Job**
- ✅ Simple to implement
- ✅ Reliable
- ✅ Easy to debug
- ❌ Requires background job runner

**Option B: Queue-Based (Redis/Bull)**
- ✅ More scalable
- ✅ Better for high volume
- ❌ Additional infrastructure

**Recommendation: Start with Option A (cron job), migrate to Option B if needed**

### 2. Google Calendar Integration

- Google Calendar service already exists
- Ensure proper integration throughout interview scheduling flow
- Calendar sync should happen automatically

### 3. Email Service

**Use existing emailService.js** - just extend it for reminders

---

## 🗂️ File Structure

```
backend/
├── services/
│   ├── googleCalendarService.js (exists - verify integration)
│   ├── reminderService.js (new)
│   ├── thankYouNoteService.js (new)
│   ├── followUpService.js (new)
│   ├── emailService.js (exists - extend)
│   └── scheduler.js (new - cron job runner)
├── controllers/
│   ├── calendarController.js (new - unified)
│   └── reminderController.js (new)
├── routes/
│   ├── calendarRoutes.js (verify Google Calendar routes)
│   └── interviewRoutes.js (add reminder/thank-you/follow-up routes)
├── templates/
│   └── reminderEmail.html (new)
└── jobs/
    └── reminderJob.js (new - cron job)

frontend/
├── pages/
│   ├── InterviewScheduling.tsx (enhance)
│   ├── CalendarSettings.tsx (new)
│   └── FollowUpActions.tsx (new)
├── components/
│   ├── ScheduleFromJob.tsx (new)
│   ├── PreparationChecklist.tsx (new)
│   └── ThankYouNoteModal.tsx (new)
```

---

## 📝 Implementation Order (Recommended)

### Phase 1: Core Reminder System
1. Create reminder tracking table
2. Create reminder service
3. Schedule reminders when interview created
4. Create cron job to send reminders
5. Email templates for reminders

### Phase 2: Calendar Verification
1. Verify Google Calendar integration works end-to-end
2. Test calendar sync on interview create/update/delete

### Phase 3: Job Application Linking
1. "Schedule Interview" button on job opportunities
2. Pre-populate interview form
3. Show linked interviews in job details

### Phase 4: Thank-You Notes
1. Thank-you note service
2. Generation logic
3. Frontend modal
4. Email sending

### Phase 5: Follow-Up Actions
1. Follow-up actions table
2. Auto-generation logic
3. Follow-up dashboard

---

## 🔧 Technical Dependencies

### New Packages Needed

```json
{
  "node-cron": "^3.x",  // Cron jobs for reminders
  "uuid": "^9.x"        // Already have
}
```

### Environment Variables

```env
# Google Calendar (should already be configured)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALENDAR_CALLBACK_URL=http://localhost:3001/api/v1/calendar/auth/callback

# Reminder System (optional)
REMINDER_CHECK_INTERVAL=5  # minutes (defaults to 5)

# Email (already exists, ensure configured)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password
EMAIL_FROM=noreply@atstracker.com
```

---

## ✅ Acceptance Criteria Mapping

| Requirement | Implementation |
|------------|----------------|
| Sync with Google Calendar | ✅ Already exists - verify integration |
| Link to job applications | ✅ Exists - enhance UI workflow |
| Auto-generate prep tasks | ✅ Exists - enhance with smart generation |
| Location/video link info | ✅ Exists in schema |
| 24h and 2h reminders | New: reminderService.js + cron job |
| Track outcomes | ✅ Exists - enhance with follow-ups |
| Thank-you note system | New: thankYouNoteService.js |

---

## 🧪 Testing Strategy

### Unit Tests
- Reminder scheduling logic
- Calendar event creation
- Thank-you note generation

### Integration Tests
- End-to-end interview creation → reminder sent
- Calendar sync (Google Calendar)
- Email delivery

### Manual Testing
- Schedule interview from job opportunity
- Verify calendar sync
- Verify reminder emails received
- Test thank-you note flow

---

## 📊 Success Metrics

- Interview creation to calendar sync: < 2 seconds
- Reminder delivery rate: > 99%
- User calendar connection rate: Track in analytics
- Thank-you note send rate: Track usage

---

## 🚨 Edge Cases to Handle

1. **Interview rescheduled** - Update reminders and calendar
2. **Interview cancelled** - Cancel all reminders
3. **Calendar disconnect** - Handle gracefully, allow re-connect
4. **Multiple interviews same time** - Conflict detection already exists
5. **Timezone issues** - Use user's timezone for reminders
6. **Email delivery failures** - Retry logic, log errors
7. **Google Calendar quota limits** - Rate limiting, error handling

---

## 🔐 Security Considerations

1. **OAuth tokens** - Store encrypted, refresh automatically
2. **Calendar permissions** - Only request necessary scopes
3. **Email sending** - Rate limiting, validation
4. **User data** - Only access user's own calendar/interviews

---

## 📚 Resources

- [Google Calendar API Docs](https://developers.google.com/calendar/api/v3/reference)
- [Microsoft Graph API Docs](https://docs.microsoft.com/en-us/graph/overview)
- [Node-Cron Documentation](https://www.npmjs.com/package/node-cron)
- Existing code references:
  - `backend/services/googleCalendarService.js`
  - `backend/services/interviewService.js`
  - `backend/services/emailService.js`

---

This plan provides a comprehensive roadmap for implementing all the requested features. Start with Phase 1 (reminders) as it's the most critical user-facing feature.

