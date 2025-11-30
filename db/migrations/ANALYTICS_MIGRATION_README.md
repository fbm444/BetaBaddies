# Analytics Features Migration

This migration adds comprehensive job search analytics and performance tracking features to support User Cases UC-096 through UC-101.

## What This Migration Adds

### 1. Goals Table (UC-101)
- **Purpose**: Track SMART career goals with specific timelines and metrics
- **Key Features**:
  - Goal categories: career, job_search, skills, networking, salary
  - Short-term and long-term goals
  - Target values with current progress tracking
  - Status tracking: active, completed, paused, cancelled
  - Priority levels

### 2. Goal Progress History Table
- **Purpose**: Track historical progress updates for goals
- Allows users to see progress over time and identify patterns

### 3. Networking Activities Table (UC-099)
- **Purpose**: Track networking efforts and relationship building
- **Key Features**:
  - Contact information and relationship strength
  - Activity types: events, coffee chats, emails, LinkedIn, referrals
  - Event tracking with dates and locations
  - Referral tracking linked to job opportunities
  - Outcome tracking

### 4. Enhanced Job Opportunities Table
- **New Columns**:
  - `application_source`: How the job was found (job_board, company_website, referral, etc.)
  - `application_method`: How the application was submitted
  - `referral_contact_name` and `referral_contact_email`: For tracking referrals
  - `application_submitted_at`: Actual submission timestamp
  - `first_response_at`: Time to first response tracking
  - `interview_scheduled_at`: Interview scheduling timestamp

### 5. Interviews Table (UC-098)
- **Purpose**: Detailed interview performance tracking
- **Key Features**:
  - Interview types and rounds
  - Confidence and difficulty ratings
  - Feedback notes and improvement areas
  - Outcome tracking
  - Preparation time tracking

## How to Run

```bash
# From project root
psql -U postgres -d ats_tracker -f db/migrations/add_analytics_features.sql
```

Or if using the ats_user:

```bash
psql -U ats_user -d ats_tracker -f db/migrations/add_analytics_features.sql
```

## Features Supported

This migration enables:

- **UC-096**: Job Search Performance Dashboard - Application source tracking, time-to-response metrics
- **UC-097**: Application Success Rate Analysis - Source/method comparison, referral tracking
- **UC-098**: Interview Performance Tracking - Detailed interview analytics
- **UC-099**: Network ROI Analytics - Comprehensive networking activity tracking
- **UC-100**: Salary Progression - Uses existing salary fields with enhanced tracking
- **UC-101**: Goal Setting and Tracking - Full SMART goals implementation

## Backwards Compatibility

- All new columns are nullable, so existing data remains intact
- Existing functionality continues to work without changes
- New features are opt-in through the frontend UI

## Next Steps

After running this migration:
1. Backend services need to be created/updated for goals, networking, and enhanced statistics
2. Frontend components need to be built for the analytics dashboard
3. API endpoints need to be added for CRUD operations on new tables

