# Troubleshooting Load Tests

## Issue: "module not found" when running create-test-user.js

**Solution:** Run the script from the backend directory:

```bash
cd backend
node scripts/createLoadTestUser.js
```

Or use the registration endpoint instead:
```bash
curl -X POST http://localhost:3001/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{"email": "loadtest@example.com", "password": "LoadTest123!"}'
```

## Issue: Login failed 401 errors

### Check 1: Verify test user exists

```sql
SELECT u_id, email, account_type FROM users WHERE email = 'loadtest@example.com';
```

If no user exists, create one using the script or registration endpoint.

### Check 2: Verify password is correct

The default password is `LoadTest123!`. If you changed it, make sure to set the environment variable:

```bash
TEST_USER_PASSWORD="YourPassword" k6 run test-login.js
```

### Check 3: Test login manually

```bash
curl -X POST http://localhost:3001/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "loadtest@example.com", "password": "LoadTest123!"}' \
  -v
```

Check for:
- Status 200 (success)
- Set-Cookie header with `connect.sid`

### Check 4: Verify backend is running

```bash
curl http://localhost:3001/health
```

Should return: `{"ok":true,"data":{"status":"healthy",...}}`

### Check 5: Check backend logs

Look for authentication errors in your backend console/logs.

### Check 6: Test with k6 login test

```bash
cd load-tests
k6 run test-login.js
```

This will show detailed error messages.

## Issue: Session cookie not extracted

If login succeeds but cookie extraction fails:

1. Check k6 version: `k6 version` (should be 0.47+)
2. Update k6 if needed
3. Check the test-login.js output for cookie extraction details

## Issue: High error rates in load tests

1. **Check database connection pool**: Ensure pool size is sufficient
2. **Check rate limiting**: Backend might be rate-limiting requests
3. **Monitor server resources**: CPU, memory, database connections
4. **Check backend logs**: Look for specific error patterns

## Issue: Slow response times

1. **Database queries**: Check for missing indexes
2. **N+1 queries**: Look for queries in loops
3. **Connection pool**: Increase pool size if needed
4. **Server resources**: Monitor CPU/memory usage

## Quick Diagnostic Commands

```bash
# 1. Test user exists?
psql -U ats_user -d ats_tracker -c "SELECT email FROM users WHERE email = 'loadtest@example.com';"

# 2. Backend health
curl http://localhost:3001/health

# 3. Login test
curl -X POST http://localhost:3001/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "loadtest@example.com", "password": "LoadTest123!"}' \
  -c cookies.txt -v

# 4. Test authenticated request
curl http://localhost:3001/api/v1/profile -b cookies.txt

# 5. k6 login test
cd load-tests && k6 run test-login.js
```

## Common Solutions

### Reset test user password

```bash
cd backend
node -e "
import('bcrypt').then(async (bcrypt) => {
  const bcryptModule = bcrypt.default || bcrypt;
  const { Pool } = require('pg');
  const dbConfig = require('./config/db.config.js').default;
  const pool = new Pool(dbConfig);
  
  const email = 'loadtest@example.com';
  const newPassword = 'LoadTest123!';
  const hashed = await bcryptModule.hash(newPassword, 10);
  
  await pool.query('UPDATE users SET password = \$1 WHERE email = \$2', [hashed, email]);
  console.log('Password updated');
  await pool.end();
});
"
```

### Delete and recreate test user

```sql
DELETE FROM users WHERE email = 'loadtest@example.com';
```

Then run the create script again.

