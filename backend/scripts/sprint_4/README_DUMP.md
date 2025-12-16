# Supabase Database Dump Script

A language-agnostic bash script to dump your Supabase production database.

## Prerequisites

- PostgreSQL client tools installed (`pg_dump`)
- For macOS: `brew install postgresql@17` (recommended for Supabase PostgreSQL 17 compatibility)
- Supabase database credentials configured in `backend/.env`

## Configuration

Add to `backend/.env`:

```env
# Option 1: Full connection string (recommended)
SUPABASE_DATABASE_URL=postgresql://user:password@host:6543/database?pgbouncer=true

# Option 2: Individual variables
SUPABASE_DB_HOST=aws-0-us-west-2.pooler.supabase.com
SUPABASE_DB_PORT=6543
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres.jnjxvsncxfwencryoklc
SUPABASE_DB_PASS=your-password
```

## Usage

```bash
cd backend/scripts/sprint_4
./dump-supabase-db.sh
```

The dump will be saved to: `db/supabase_production_backups/supabase_dump_YYYYMMDD_HHMMSS.sql`

## Custom Output Location

```bash
./dump-supabase-db.sh db/my_custom_backup.sql
```

## Features

- ✅ Language-agnostic (pure bash, no Node.js/Python required)
- ✅ Automatically uses PostgreSQL 17 if available
- ✅ Removes query parameters for pg_dump compatibility
- ✅ Uses Supabase-specific variables (no conflicts with local DB)
- ✅ Creates output directory automatically
- ✅ Includes both schema and data
