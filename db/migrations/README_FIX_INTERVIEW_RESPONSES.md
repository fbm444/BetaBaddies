# Fix Interview Response Library Migration

If you're getting a "something went wrong" error after running the migration, follow these steps:

## Step 1: Check if tables exist

Run this SQL to check if the tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'interview_response%';
```

## Step 2: If tables don't exist or are incomplete

Run the fix migration script:

```bash
psql -U your_db_user -d your_database -f db/migrations/fix_interview_response_library.sql
```

Or manually run the SQL in `db/migrations/fix_interview_response_library.sql`

## Step 3: Verify the migration

Check that all tables exist:

```sql
\d interview_responses
\d interview_response_versions
\d interview_response_tags
\d interview_response_outcomes
\d interview_response_suggestions
```

## Step 4: Check backend logs

Look at your backend console/logs for specific error messages. Common issues:

1. **Table doesn't exist**: Run the migration
2. **Permission denied**: Check that `ats_user` has permissions
3. **Foreign key constraint**: Make sure `interviews` table exists
4. **Trigger error**: Check trigger functions are created

## Step 5: Test the API endpoint

Try accessing:
```
GET /api/v1/interview-responses
```

Check the browser console and network tab for specific error messages.

## Common Issues and Solutions

### Issue: "relation does not exist"
**Solution**: Run the migration script

### Issue: "permission denied"
**Solution**: 
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ats_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ats_user;
```

### Issue: "foreign key constraint violation"
**Solution**: Make sure the `interviews` table exists:
```sql
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'interviews'
);
```

### Issue: "function does not exist"
**Solution**: The trigger functions should be created by the migration. Re-run the fix migration.

## Manual Fix

If all else fails, you can manually create the tables:

1. Drop existing tables (if any):
```sql
DROP TABLE IF EXISTS interview_response_suggestions CASCADE;
DROP TABLE IF EXISTS interview_response_outcomes CASCADE;
DROP TABLE IF EXISTS interview_response_tags CASCADE;
DROP TABLE IF EXISTS interview_response_versions CASCADE;
DROP TABLE IF EXISTS interview_responses CASCADE;
```

2. Run the fix migration script: `db/migrations/fix_interview_response_library.sql`

