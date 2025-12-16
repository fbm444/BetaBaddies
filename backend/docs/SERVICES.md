# Backend Services Documentation

This document provides detailed documentation for all backend services organized by domain.

## Table of Contents

- [Core Services](#core-services)
- [User & Authentication Services](#user--authentication-services)
- [Job Management Services](#job-management-services)
- [Interview Services](#interview-services)
- [Resume & Cover Letter Services](#resume--cover-letter-services)
- [Networking Services](#networking-services)
- [Analytics & Reporting Services](#analytics--reporting-services)
- [Integration Services](#integration-services)
- [Utility Services](#utility-services)

## Core Services

### Database Service

**File**: `services/database.js`

Centralized database connection and query management.

**Features**:

- Connection pooling via `pg.Pool`
- Query execution with logging
- Transaction support
- Automatic error handling

**Methods**:

- `query(text, params)` - Execute a parameterized query
- `getClient()` - Get a client from the pool
- `transaction(callback)` - Execute operations in a transaction
- `close()` - Close all connections

**Example**:

```javascript
import database from "./services/database.js";

// Simple query
const result = await database.query("SELECT * FROM users WHERE id = $1", [
  userId,
]);

// Transaction
await database.transaction(async (client) => {
  await client.query("INSERT INTO ...");
  await client.query("UPDATE ...");
});
```

### Email Service

**File**: `services/emailService.js`

Email sending service supporting AWS SES and SMTP.

**Features**:

- AWS SES integration (production)
- SMTP support (development/fallback)
- Connection pooling
- Retry logic
- Template support

**Methods**:

- `sendEmail(options)` - Send an email
- `sendPasswordResetEmail(user, token)` - Send password reset
- `sendWelcomeEmail(user)` - Send welcome email

**Configuration**:

- `AWS_SES_REGION` - AWS region for SES
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - SMTP configuration

### File Upload Service

**File**: `services/fileUploadService.js`

File upload and storage management.

**Features**:

- AWS S3 integration (production)
- Local filesystem storage (development)
- Image processing with Sharp
- File type validation
- Size limits

**Methods**:

- `uploadProfilePicture(userId, file)` - Upload profile picture
- `uploadResume(userId, file)` - Upload resume
- `uploadDocument(userId, file, type)` - Upload document
- `getFileById(fileId, userId)` - Retrieve file
- `deleteFile(fileId, userId)` - Delete file

**Storage Locations**:

- Profile pictures: `uploads/profile-pics/`
- Resumes: `uploads/resumes/`
- Documents: `uploads/documents/`

### Scheduler Service

**File**: `services/scheduler.js`

Background job scheduler for automated tasks.

**Features**:

- Cron-based scheduling
- Reminder email sending
- Interview reminders
- Follow-up notifications

**Jobs**:

- Interview reminders (15 minutes before)
- Follow-up reminders
- Daily/weekly reports

## User & Authentication Services

### User Service

**File**: `services/userService.js`

User management and authentication.

**Methods**:

- `createUser(userData)` - Create new user
- `getUserById(userId)` - Get user by ID
- `getUserByEmail(email)` - Get user by email
- `updateUser(userId, updates)` - Update user
- `deleteUser(userId, password)` - Delete user
- `changePassword(userId, oldPassword, newPassword)` - Change password
- `resetPassword(email)` - Initiate password reset
- `verifyResetToken(token)` - Verify reset token

### Google OAuth Services

**Files**:

- `services/gmailService.js`
- `services/googleCalendarService.js`
- `services/googleContactsService.js`

OAuth integration with Google services.

**Features**:

- OAuth 2.0 flow
- Token refresh
- API integration
- Sync capabilities

## Job Management Services

### Job Service

**File**: `services/jobService.js`

Job history and employment tracking.

**Methods**:

- `createJob(userId, jobData)` - Create job entry
- `getJobsByUserId(userId)` - Get user's jobs
- `updateJob(jobId, userId, updates)` - Update job
- `deleteJob(jobId, userId)` - Delete job
- `ensureOnlyOneCurrentJob(userId)` - Ensure single current job

### Job Opportunity Service

**File**: `services/jobOpportunityService.js`

Job application and opportunity tracking.

**Methods**:

- `createJobOpportunity(userId, opportunityData)` - Create opportunity
- `getJobOpportunitiesByUserId(userId, options)` - Get opportunities
- `updateJobOpportunity(opportunityId, userId, updates)` - Update opportunity
- `deleteJobOpportunity(opportunityId, userId)` - Delete opportunity
- `updateStatus(opportunityId, userId, status)` - Update application status
- `addInterview(opportunityId, userId, interviewData)` - Add interview
- `getInterviewsForOpportunity(opportunityId, userId)` - Get interviews

**Status Flow**:

```
applied → phone_screen → technical_interview →
onsite_interview → offer → accepted/rejected
```

### Prospective Job Service

**File**: `services/prospectiveJobService.js`

Prospective job tracking before application.

**Methods**:

- `createProspectiveJob(userId, jobData)` - Create prospective job
- `getProspectiveJobs(userId, filters)` - Get prospective jobs
- `convertToJobOpportunity(prospectiveJobId, userId)` - Convert to application

## Interview Services

### Interview Service

**File**: `services/interviewService.js`

Interview scheduling and management.

**Methods**:

- `createInterview(userId, interviewData)` - Schedule interview
- `getInterviewsByUserId(userId, filters)` - Get user's interviews
- `updateInterview(interviewId, userId, updates)` - Update interview
- `cancelInterview(interviewId, userId)` - Cancel interview
- `completeInterview(interviewId, userId, outcome)` - Mark as complete

### Interview Prep Service

**File**: `services/interviewPrep/`

Interview preparation and practice services.

**Services**:

- `mockInterviewService.js` - Mock interview sessions
- `interviewQuestionBankService.js` - Question bank management
- `interviewResponseCoachingService.js` - Response coaching
- `technicalInterviewPrepService.js` - Technical interview prep
- `interviewCompanyResearchService.js` - Company research

### Interview Prediction Service

**File**: `services/interviewPredictionService.js`

AI-powered interview outcome prediction.

**Features**:

- Historical performance analysis
- Bayesian prediction model
- Confidence scoring
- Outcome probability

**Methods**:

- `predictInterviewOutcome(userId, interviewData)` - Predict outcome
- `getPredictionHistory(userId)` - Get prediction history
- `updatePredictionAccuracy(predictionId, actualOutcome)` - Update accuracy

### Interview Analytics Service

**File**: `services/interviewAnalyticsService.js`

Interview performance analytics.

**Methods**:

- `getInterviewStats(userId, dateRange)` - Get statistics
- `getSuccessRate(userId)` - Calculate success rate
- `getInterviewTrends(userId)` - Get trends over time
- `getCompanyPerformance(userId)` - Performance by company

## Resume & Cover Letter Services

### Resume Services

**Location**: `services/resumes/`

Resume generation and management.

**Services**:

- `resumeService.js` - Core resume operations
- `resumeGenerationService.js` - AI-powered generation
- `resumeExportService.js` - PDF/DOCX export
- `resumeVersionService.js` - Version control
- `resumeTemplateService.js` - Template management

**Methods**:

- `createResume(userId, resumeData)` - Create resume
- `generateResume(userId, options)` - AI generate resume
- `exportResume(resumeId, format)` - Export to PDF/DOCX
- `getResumeVersions(resumeId)` - Get version history

### Cover Letter Services

**Location**: `services/coverletters/`

Cover letter generation and management.

**Services**:

- `coreService.js` - Core operations
- `aiService.js` - AI generation
- `templateService.js` - Templates
- `exportService.js` - Export functionality
- `versionService.js` - Version control

## Networking Services

### Networking Service

**File**: `services/networkingService.js`

Professional networking management.

**Methods**:

- `createNetworkingGoal(userId, goalData)` - Create goal
- `trackNetworkingActivity(userId, activityData)` - Track activity
- `getNetworkingStats(userId)` - Get statistics

### Professional Contact Service

**File**: `services/professionalContactService.js`

Contact management.

**Methods**:

- `createContact(userId, contactData)` - Add contact
- `getContactsByUserId(userId, filters)` - Get contacts
- `updateContact(contactId, userId, updates)` - Update contact
- `deleteContact(contactId, userId)` - Delete contact

### Networking Event Service

**File**: `services/networkingEventService.js`

Networking event tracking.

**Methods**:

- `createEvent(userId, eventData)` - Create event
- `getEventsByUserId(userId, filters)` - Get events
- `addEventConnection(eventId, userId, connectionData)` - Add connection
- `getEventConnections(eventId, userId)` - Get connections

### Network Discovery Service

**File**: `services/networkDiscoveryService.js`

Discover professionals in your industry.

**Methods**:

- `getPeopleInYourIndustry(userId, filters)` - Find people
- `getRecommendedConnections(userId)` - Get recommendations
- `discoverByCompany(companyName)` - Find by company

## Analytics & Reporting Services

### Analytics Service

**File**: `services/analyticsService.js`

User analytics and insights.

**Methods**:

- `getUserAnalytics(userId, dateRange)` - Get analytics
- `getJobSearchProgress(userId)` - Track progress
- `getApplicationStats(userId)` - Application statistics
- `getInterviewPerformance(userId)` - Interview performance

### Report Service

**Files**:

- `services/reportDataService.js` - Data aggregation
- `services/reportAIService.js` - AI insights
- `services/reportExportService.js` - Export functionality

**Methods**:

- `generateReport(userId, reportType, options)` - Generate report
- `exportReport(reportId, format)` - Export report
- `getReportHistory(userId)` - Get report history

## Integration Services

### LinkedIn Service

**File**: `services/linkedinService.js`

LinkedIn API integration.

**Features**:

- OAuth authentication
- Profile data sync
- Job posting access
- Connection management

### GitHub Service

**File**: `services/githubService.js`

GitHub API integration.

**Features**:

- OAuth authentication
- Repository access
- Contribution tracking
- Profile sync

### Google Services

**Files**:

- `services/gmailService.js` - Gmail integration
- `services/googleCalendarService.js` - Calendar sync
- `services/googleContactsService.js` - Contacts sync

**Features**:

- OAuth 2.0 authentication
- API integration
- Sync capabilities
- Token refresh

### External API Services

**Location**: `services/externalApis/`

Third-party API integrations.

**Services**:

- `adzunaService.js` - Job search API
- `blsService.js` - Bureau of Labor Statistics
- `eventbriteApiService.js` - Event discovery
- `meetupApiService.js` - Meetup events
- `newsApiService.js` - News articles
- `ticketmasterApiService.js` - Event tickets

## Utility Services

### Geocoding Service

**File**: `services/geocodingService.js`

Location geocoding using Nominatim (OpenStreetMap).

**Methods**:

- `geocode(query)` - Geocode address to coordinates
- `reverseGeocode(lat, lon)` - Reverse geocode coordinates
- `getTimezone(lat, lon)` - Get timezone for location

### Company Research Service

**File**: `services/companyResearchService.js`

Company information and research.

**Methods**:

- `researchCompany(companyName)` - Research company
- `getCompanyInfo(companyId)` - Get company details
- `getCompanyInterviewInsights(companyId)` - Interview insights

### Salary Services

**Files**:

- `services/salaryNegotiationService.js` - Negotiation tracking
- `services/salaryMarketResearchService.js` - Market research
- `services/totalCompensationService.js` - Compensation calculation

### Writing Services

**Files**:

- `services/writingPracticeService.js` - Writing practice
- `services/writingAIService.js` - AI feedback
- `services/writingFeedbackService.js` - Feedback analysis

### API Monitoring Service

**File**: `services/apiMonitoringService.js`

API usage and quota monitoring.

**Methods**:

- `logUsage(options)` - Log API usage
- `getQuotaStatus(serviceName)` - Check quota
- `getUsageStats(serviceName, period)` - Get statistics

## Service Patterns

### Standard Service Structure

```javascript
class ExampleService {
  constructor() {
    // Initialize service
  }

  async createResource(userId, data) {
    // Validation
    // Business logic
    // Database operation
    // Return result
  }

  async getResourceById(id, userId) {
    // Authorization check
    // Database query
    // Return result
  }

  async updateResource(id, userId, updates) {
    // Authorization
    // Validation
    // Update database
    // Return updated resource
  }

  async deleteResource(id, userId) {
    // Authorization
    // Delete from database
    // Cleanup related resources
  }
}

export default new ExampleService();
```

### Error Handling

Services throw errors that are caught by the error handler middleware:

```javascript
if (!resource) {
  throw new Error("Resource not found");
}
```

### Authorization

All services verify user ownership:

```javascript
const resource = await database.query(
  "SELECT * FROM resources WHERE id = $1 AND user_id = $2",
  [resourceId, userId]
);

if (resource.rows.length === 0) {
  throw new Error("Resource not found or access denied");
}
```

## Service Dependencies

Services can depend on other services:

```javascript
import userService from './userService.js';
import emailService from './emailService.js';

// Use in service methods
const user = await userService.getUserById(userId);
await emailService.sendEmail(...);
```

## Testing Services

Services are tested in `tests/` directory:

```bash
npm run test:all          # Run all tests
npm run test:user-api     # Test user service
npm run test:jobs-service # Test job service
```

See individual service files for detailed method documentation and examples.

