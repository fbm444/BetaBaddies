# Database Migration Guide

This document outlines the database changes needed to run the resume functionality.

## Overview

The original database schema (`ats_db.sql`) had a basic `resume` table, but it was missing several columns required for full resume functionality. Two migration scripts were created to add these features.

## Migration Files

### 1. `add_resume_columns.sql`
**Purpose**: Adds missing columns to the `resume` table to support full resume functionality.

**Columns Added**:
- `template_id` (UUID) - Foreign key to `resume_template` table
- `job_id` (UUID) - Foreign key to `prospectivejobs` table (note: table name is `jobs` in the schema)
- `content` (JSONB) - Stores resume content (personalInfo, summary, experience, education, skills, projects, certifications)
- `section_config` (JSONB) - Stores section configuration (enabled/disabled, order, etc.)
- `customizations` (JSONB) - Stores layout customizations (colors, fonts, spacing, etc.)
- `version_number` (INTEGER) - Version number for version tracking (default: 1)
- `parent_resume_id` (UUID) - Self-referencing foreign key for resume versioning
- `is_master` (BOOLEAN) - Indicates if this is a master resume (default: false)
- `comments_id` (UUID) - Foreign key to resume_comments (optional, for backward compatibility)

**Indexes Created**:
- `idx_resume_template_id` on `template_id`
- `idx_resume_job_id` on `job_id`
- `idx_resume_parent_id` on `parent_resume_id`
- `idx_resume_user_id_created` on `user_id, created_at DESC`
- `idx_resume_is_master` on `is_master` (partial index where `is_master = true`)

**How to Run**:
```bash
psql -U postgres -d ats_tracker -f db/migrations/add_resume_columns.sql
```

### 2. `grant_permissions.sql`
**Purpose**: Grants necessary permissions to the `ats_user` database user.

**What it does**:
- Creates `ats_user` if it doesn't exist (with password `ats_password`)
- Grants `USAGE` on `public` schema
- Grants `SELECT, INSERT, UPDATE, DELETE` on all application tables:
  - resume, resume_template, resume_comments, resume_tailoring
  - users, profiles, jobs, skills, educations, projects, certifications
  - coverletter, coverletter_template
  - company_info, company_media, company_news
  - archived_prospectivejobs
- Grants `EXECUTE` on all database functions
- Sets default privileges for future tables and functions

**How to Run**:
```bash
psql -U postgres -d ats_tracker -f db/migrations/grant_permissions.sql
```

## Running Migrations

### Option 1: Run individually
```bash
# As postgres superuser
psql -U postgres -d ats_tracker -f db/migrations/add_resume_columns.sql
psql -U postgres -d ats_tracker -f db/migrations/grant_permissions.sql
```

### Option 2: Run all migrations
```bash
# As postgres superuser
psql -U postgres -d ats_tracker -f db/migrations/add_resume_columns.sql
psql -U postgres -d ats_tracker -f db/migrations/grant_permissions.sql
```

## Database Configuration

The backend uses the following database configuration (from `backend/config/db.config.js`):
- **User**: `ats_user` (or `DB_USER` env variable)
- **Host**: `localhost` (or `DB_HOST` env variable)
- **Database**: `ats_tracker` (or `DB_NAME` env variable)
- **Password**: `ats_password` (or `DB_PASS` env variable)
- **Port**: `5432` (or `DB_PORT` env variable)

## Important Notes

1. **Table Name Mismatch**: The migration references `prospectivejobs` but the actual table name in the schema is `jobs`. The migration script was corrected to use `jobs`.

2. **UUID Validation**: The application now validates UUIDs before database operations to prevent errors from invalid ID formats.

3. **Template ID Handling**: If a `templateId` is not a valid UUID (e.g., "default-chronological"), it's set to `NULL` in the database.

4. **Idempotent Migrations**: Both migration scripts use `IF NOT EXISTS` clauses, so they can be run multiple times safely.

## Troubleshooting

### Error: "permission denied for table resume"
**Solution**: Run `grant_permissions.sql` as the postgres superuser.

### Error: "relation 'resume' does not exist"
**Solution**: First run the base schema from `ats_db.sql`, then run the migrations.

### Error: "invalid input syntax for type uuid"
**Solution**: Ensure all IDs being passed are valid UUIDs. The application now validates UUIDs before database operations.

