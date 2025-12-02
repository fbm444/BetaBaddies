# Setting Up Demo User - createInterviewAnalyticsTestUser.js

## Overview
This script creates a comprehensive test user with complete profile data, job opportunities, interviews, and analytics data for testing the Interview Analytics features.

## Prerequisites
1. Database must be running and accessible
2. Backend environment variables configured (see `backend/backend.env`)
3. Node.js and npm installed

## Setup Steps

### 1. Create the Database (if it doesn't exist)
First, make sure PostgreSQL is running and create the database:

```bash
# Option 1: Using createdb command
createdb -U postgres ats_tracker

# Option 2: Using psql
psql -U postgres -c "CREATE DATABASE ats_tracker;"
```

### 2. Load the Database Schema
Load the database schema from the SQL file:

```bash
psql -U postgres -d ats_tracker -f db/ats_db.sql
```

**Note**: If you're using different database credentials, adjust the commands above or set them in your `backend/backend.env` file.

### 3. Check Database Connection
Make sure your PostgreSQL database is running and the connection details in `backend/backend.env` are correct:
- DB_HOST=localhost
- DB_PORT=5432
- DB_NAME=ats_tracker
- DB_USER=ats_user
- DB_PASS=ats_password

### 4. Navigate to Backend Directory
```bash
cd backend
```

### 5. Install Dependencies (if not already installed)
```bash
npm install
```

### 6. Run the Script
```bash
node scripts/createInterviewAnalyticsTestUser.js
```

Or using npm script (if configured):
```bash
npm run create:test-user
```

## What Gets Created

The script creates a test user with the following:

### Login Credentials
- **Email**: `analytics.test@betabaddies.com`
- **Password**: `Test123!`

### User Data
- ✅ Complete profile (Sarah Chen, Senior Software Engineer)
- ✅ 33 Skills (Languages, Frontend, Backend, Databases, Cloud, etc.)
- ✅ 2 Education entries (Stanford University, UC Berkeley)
- ✅ 2 Employment history entries
- ✅ 6 Projects (including distributed systems, ML, etc.)
- ✅ 6 Certifications (AWS, GCP, Kubernetes, MongoDB)
- ✅ 6 Job Opportunities (Meta, Amazon, Apple, Netflix, Google, Microsoft)
  - 3 with "Offer" status for salary negotiation testing
  - 3 with "Interview" status
  - All with recruiter contact information (name, email, phone)
  - 3 linked to resumes and cover letters

### Interview Data
- ✅ 2 Practice interviews
- ✅ 11 Past completed interviews (spread over 12 months)
- ✅ 14 Scheduled future interviews with real companies
- ✅ Interview feedback with skill area scores
- ✅ Pre/post assessments for confidence/anxiety tracking
- ✅ Follow-up actions

### Networking Data
- ✅ 8 Professional Contacts (recruiters, mentors, colleagues, industry contacts)
  - Mix from MAANG companies and other tech companies
- ✅ 4 Coffee Chats (upcoming and completed)
  - Mix of coffee chats and informational interviews
  - Some with responses and referrals
  - Linked to job opportunities
- ✅ 4 Networking Messages (conversations with recruiters)
  - Mix of coffee chat requests, interview requests, and referral requests
  - Shows sent/received status

### Resume and Cover Letter Data
- ✅ 3 Resume records (master resume and variants)
- ✅ 4 Cover Letters (3 job-specific, 1 general template)
- ✅ All job opportunities have recruiter information

### Additional Data
- ✅ 3 Salary negotiations (2 active, 1 completed)
- ✅ Writing practice sessions (last 30 days, showing trends)
- ✅ Salary progression history
- ✅ 7 Career Goals (application, interview, offer, salary, networking, skills)

## Important Notes

1. **Existing User**: If the test user already exists, the script will:
   - Clear all existing data
   - Recreate everything fresh

2. **Database Tables Used**:
   - users, profiles
   - skills, educations, jobs, projects, certifications
   - job_opportunities (with recruiter info, resume_id, coverletter_id)
   - resume, coverletter
   - interviews, interview_feedback, interview_pre_assessment, interview_post_reflection
   - interview_follow_ups
   - salary_negotiations, salary_progression_history
   - writing_practice_sessions
   - professional_contacts
   - coffee_chats
   - networking_messages
   - career_goals

3. **Data Quality**:
   - All data is realistic and suitable for testing
   - Interviews are spread across time to show trends
   - Feedback scores show improvement over time
   - Writing practice shows improvement trends

## Troubleshooting

### Error: "database does not exist"
Make sure the database `ats_tracker` is created first:
```bash
createdb ats_tracker
```

### Error: "relation does not exist"
Run database migrations first:
```bash
# Check if migrations need to be run
cd backend
npm run migrate  # or check your migration setup
```

### Error: "Cannot connect to database"
- Check database is running: `pg_isready`
- Verify connection details in `backend/backend.env`
- Check database user has proper permissions

## After Running

Once the script completes successfully:
1. Log in with the test credentials:
   - Email: `analytics.test@betabaddies.com`
   - Password: `Test123!`
2. Navigate to **Interview Analytics** page to see comprehensive analytics
3. Navigate to **Salary Negotiation** page to see active negotiations
4. Navigate to **Writing Practice** to see trends over last 30 days
5. Navigate to **Analytics > Network ROI** to see:
   - Professional contacts
   - Coffee chats (upcoming and completed)
   - Networking messages (conversations with recruiters)
   - Recruiters from job opportunities
6. Navigate to **Analytics > Goal Setting** to see career goals
7. Navigate to **Analytics > Salary Progression** to see salary history with bonus and equity

## Script Output

The script provides detailed console output showing:
- Each step of data creation
- Number of records created
- Summary of all data at the end
- Login credentials reminder

