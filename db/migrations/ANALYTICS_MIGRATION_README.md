# Analytics Features Migration - Updated for Sprint 3 Schema

## Overview

This migration adds missing columns to support analytics features (UC-096 through UC-101) while aligning with the existing `sprint3_tables_migration.sql` schema.

## What This Migration Does

### 1. Enhanced Job Opportunities Table
**Purpose**: Support application source/method tracking for UC-097

**New Columns Added**:
- `application_source` - How the job was found (job_board, company_website, referral, etc.)
- `application_method` - How application was submitted (online_form, email, linkedin_easy_apply, etc.)
- `referral_contact_name` and `referral_contact_email` - Referral tracking
- `application_submitted_at` - Actual submission timestamp
- `first_response_at` - Time to first response tracking
- `interview_scheduled_at` - Interview scheduling timestamp

### 2. Enhanced Interviews Table  
**Purpose**: Support interview performance tracking for UC-098

**New Columns Added**:
- `interview_round` - Interview round number
- `confidence_rating` - Self-rated confidence (1-5)
- `difficulty_rating` - Self-rated difficulty (1-5)
- `preparation_hours` - Hours spent preparing
- `questions_asked` - Array of questions asked
- `improvement_areas` - Array of improvement areas
- `feedback_notes` - Detailed feedback

### 3. Analytics Tables (Already Exist)
**Note**: The following analytics tables were already created by `sprint3_tables_migration.sql`:

- `job_search_metrics` - UC-096: Job Search Performance Dashboard
- `application_success_analysis` - UC-097: Application Success Rate Analysis  
- `interview_performance_tracking` - UC-098: Interview Performance Tracking
- `network_roi_analytics` - UC-099: Network ROI Analytics
- `salary_progression_tracking` - UC-100: Salary Progression
- `career_goals` - UC-101: Goal Setting (NOT `goals`)
- `goal_milestones` - UC-101: Goal Milestones (NOT `goal_progress`)

### 4. Networking Tables (Already Exist)
**Note**: Networking features use existing tables from sprint3:

- `professional_contacts` - Professional contact management
- `networking_events` - Networking event tracking
- `event_connections` - Connections made at events

## What This Migration Does NOT Do

- ❌ Does NOT create duplicate analytics tables
- ❌ Does NOT create `goals` table (use `career_goals` instead)
- ❌ Does NOT create `goal_progress` table (use `goal_milestones` instead)
- ❌ Does NOT create `networking_activities` table (use `professional_contacts` + `networking_events` instead)

## How to Run

```bash
# From project root
psql -U postgres -d ats_tracker -f db/migrations/add_analytics_features.sql
```

Or if using the ats_user:

```bash
psql -U ats_user -d ats_tracker -f db/migrations/add_analytics_features.sql
```

## Prerequisites

This migration assumes:
1. `sprint3_tables_migration.sql` has been run (or equivalent schema exists)
2. `job_opportunities` table exists
3. `interviews` table exists (from base schema or `add_interview_scheduling_features.sql`)

## Backwards Compatibility

- All new columns are nullable
- Existing functionality continues to work
- Migration is idempotent (can be run multiple times safely)

## Integration with Backend Services

The backend `analyticsService.js` should:
- Query `job_opportunities` with new application_source/method columns
- Query `interviews` with new performance tracking columns
- Store aggregated analytics in existing sprint3 analytics tables:
  - `job_search_metrics`
  - `application_success_analysis`
  - `interview_performance_tracking`
  - `network_roi_analytics`
  - `salary_progression_tracking`

For goals, use:
- `career_goals` table (not `goals`)
- `goal_milestones` table (not `goal_progress`)

For networking, use:
- `professional_contacts` table
- `networking_events` table
- `event_connections` table

## Next Steps

After running this migration:
1. Update backend services to use correct table names (`career_goals` not `goals`)
2. Update analytics service to populate existing sprint3 analytics tables
3. Update networking service to use `professional_contacts` table
4. Frontend components can now capture application_source/method data
