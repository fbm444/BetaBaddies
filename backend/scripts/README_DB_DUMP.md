# Database Dump Scripts

Scripts to manually dump your Supabase database locally.

## Available Scripts

### 1. Bash Script (`dump-supabase-db.sh`)

**Usage:**
```bash
cd backend/scripts
./dump-supabase-db.sh [output-file]
```

**Examples:**
```bash
# Default filename (timestamped)
./dump-supabase-db.sh

# Custom filename
./dump-supabase-db.sh db/my-dump.sql

# With date in filename
./dump-supabase-db.sh db/dump_$(date +%Y%m%d).sql
```

### 2. Node.js Script (`dump-supabase-db.js`)

**Usage:**
```bash
cd backend/scripts
node dump-supabase-db.js [output-file]
```

**Examples:**
```bash
# Default filename (timestamped)
node dump-supabase-db.js

# Custom filename
node dump-supabase-db.js db/my-dump.sql
```

## Prerequisites

1. **PostgreSQL Client Tools** - Must have `pg_dump` installed:
   ```bash
   # macOS
   brew install postgresql
   
   # Ubuntu/Debian
   sudo apt-get install postgresql-client
   
   # Windows
   # Download from https://www.postgresql.org/download/
   ```

2. **Environment Variables** - Set in `backend/.env`:
   ```env
   DATABASE_URL=postgresql://user:password@host:6543/database?pgbouncer=true
   ```
   
   Or use individual variables:
   ```env
   DB_HOST=your-supabase-host.supabase.co
   DB_PORT=6543
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASS=your-password
   ```

## Getting Supabase Connection String

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **Database**
4. Under **Connection string**, select **Session mode** (port 6543)
5. Copy the connection string
6. Add it to your `.env` file as `DATABASE_URL`

**Important:** Use **Session mode** (port 6543) for connection pooler compatibility.

## Output Format

The dump is created in **plain SQL format** which:
- ✅ Is human-readable
- ✅ Can be edited if needed
- ✅ Works with any PostgreSQL version
- ✅ Can be restored with `psql`

## Restoring a Dump

### To Local Database

```bash
# Create database first (if it doesn't exist)
createdb -h localhost -U postgres ats_tracker

# Restore dump
psql -h localhost -U postgres -d ats_tracker -f db/dump_20241214.sql
```

### To Another Supabase Project

```bash
# Set DATABASE_URL to target project
export DATABASE_URL="postgresql://user:pass@host:6543/database?pgbouncer=true"

# Restore dump
psql "$DATABASE_URL" -f db/dump_20241214.sql
```

## Connection Pooler vs Direct Connection

### Connection Pooler (Port 6543) - Recommended
- ✅ Works with Railway and other IPv4-only platforms
- ✅ Better for production workloads
- ⚠️ Some pg_dump features may be limited

### Direct Connection (Port 5432)
- ✅ Full pg_dump functionality
- ⚠️ Requires IPv6 support (not available on Railway)
- ⚠️ May have connection limits

**For dumps:** Connection pooler (6543) works fine for most use cases.

## Troubleshooting

### Error: "pg_dump is not installed"
Install PostgreSQL client tools (see Prerequisites above).

### Error: "connection refused" or "timeout"
1. Check DATABASE_URL is correct
2. Verify network connectivity
3. Check Supabase project is active
4. Ensure firewall allows connections

### Error: "authentication failed"
1. Verify database credentials
2. Check if password has special characters (may need URL encoding)
3. Ensure user has proper permissions

### Error: "relation does not exist"
This is normal - pg_dump may reference objects that don't exist in the current schema.
The dump will still be created successfully.

## Dump Options Explained

- `--no-owner`: Don't set ownership (prevents permission errors)
- `--no-acl`: Don't set access privileges (prevents permission errors)
- `--clean`: Include DROP statements before CREATE
- `--if-exists`: Use IF EXISTS when dropping (prevents errors if object doesn't exist)
- `--format=plain`: Plain SQL text format (readable, editable)

## Best Practices

1. **Regular Backups**: Run dumps regularly (daily/weekly)
2. **Version Control**: Don't commit dumps to git (they're large and contain data)
3. **Secure Storage**: Store dumps securely (encrypted if containing sensitive data)
4. **Test Restores**: Periodically test restoring dumps to ensure they work
5. **Naming**: Use descriptive filenames with dates: `dump_20241214.sql`

## Example Workflow

```bash
# 1. Create dump
cd backend/scripts
./dump-supabase-db.sh ../db/dump_$(date +%Y%m%d).sql

# 2. Verify dump was created
ls -lh ../db/dump_*.sql

# 3. Check dump size and first few lines
head -50 ../db/dump_*.sql

# 4. (Optional) Compress dump
gzip ../db/dump_*.sql

# 5. (Optional) Restore to test database
psql -h localhost -U postgres -d ats_tracker_test -f ../db/dump_*.sql
```

## Related Scripts

- `db/sprint_4/database_schema_dump.sql` - Schema-only dump (no data)
- Migration scripts in `db/migrations/` - Incremental schema changes


