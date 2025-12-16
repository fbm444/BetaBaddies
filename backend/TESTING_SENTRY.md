# Testing Sentry Error Handling

## Quick Start

### Option 1: Use the Test Script (Easiest)

```bash
# Test locally
cd backend
./test-sentry-errors.sh local

# Test in production
./test-sentry-errors.sh production
```

### Option 2: Manual Testing

## Test Scenarios

### 1. Test Debug Endpoint (Intentional Error)

This endpoint is specifically designed to test Sentry:

```bash
# Local
curl http://localhost:3001/debug-sentry

# Production
curl https://betabaddies-production.up.railway.app/debug-sentry
```

**Expected:**
- HTTP 500 response
- Error appears in Sentry within 1-2 minutes
- Error message: "My first Sentry error!"

### 2. Test 404 Errors

```bash
curl https://betabaddies-production.up.railway.app/api/v1/nonexistent-endpoint
```

**Expected:**
- HTTP 404 response
- Should NOT appear in Sentry (404s are usually filtered)

### 3. Test Validation Errors

```bash
# Invalid login (missing fields)
curl -X POST https://betabaddies-production.up.railway.app/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{}'

# Invalid UUID format
curl https://betabaddies-production.up.railway.app/api/v1/users/invalid-uuid-here
```

**Expected:**
- HTTP 400/422 response
- May or may not appear in Sentry (depends on if it's a known error)

### 4. Test Database Errors

```bash
# Try to create duplicate user (if you have test data)
curl -X POST https://betabaddies-production.up.railway.app/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "existing@example.com",
    "password": "test123"
  }'
```

**Expected:**
- HTTP 409 (Conflict) response
- Should NOT appear in Sentry (known error, handled gracefully)

### 5. Test Unhandled Errors

Create a test route that throws an unexpected error:

```javascript
// Add this temporarily to server.js for testing
app.get("/test-unhandled-error", (req, res) => {
  // This will trigger Sentry
  throw new Error("Unhandled test error");
});
```

Then call:
```bash
curl https://betabaddies-production.up.railway.app/test-unhandled-error
```

## Verify in Sentry Dashboard

### 1. Check for New Issues

1. Go to https://sentry.io
2. Navigate to your project
3. Click on "Issues" in the sidebar
4. Look for new issues in the last 5-10 minutes
5. Issues should be sorted by "First Seen" (newest first)

### 2. Verify Error Details

Click on an error to see:

**Error Information:**
- ✅ Error message matches what you threw
- ✅ Stack trace is readable
- ✅ File names and line numbers are correct

**Request Information:**
- ✅ URL matches the endpoint you called
- ✅ HTTP method (GET, POST, etc.)
- ✅ Request headers
- ✅ Request body (if POST/PUT)

**Context:**
- ✅ Environment shows "production" or "development"
- ✅ Release/version information
- ✅ User information (if available)

**Breadcrumbs:**
- ✅ Logs leading up to the error
- ✅ Database queries (if enabled)
- ✅ HTTP requests (if enabled)

### 3. Check Performance Tab

1. Go to "Performance" in Sentry sidebar
2. Look for transactions from your API calls
3. Verify:
   - Transaction names match your routes
   - Response times are recorded
   - Profiling data is available (if enabled)

## What Errors Should Appear in Sentry?

### ✅ Should Appear (Unexpected Errors):
- Unhandled exceptions
- 500 errors from unexpected failures
- Database connection errors
- External API failures
- Runtime errors (null pointer, etc.)

### ❌ Should NOT Appear (Known/Handled Errors):
- 404 Not Found (handled gracefully)
- 400 Bad Request (validation errors)
- 401 Unauthorized (authentication errors)
- 409 Conflict (duplicate resources)
- 422 Validation errors (expected)

**Note:** Sentry is configured to capture all errors, but you can filter them in the Sentry dashboard based on error type, status code, etc.

## Testing Different Error Types

### Test Async Errors

```javascript
// Add this test route
app.get("/test-async-error", async (req, res) => {
  await new Promise(resolve => setTimeout(resolve, 100));
  throw new Error("Async error test");
});
```

### Test Database Errors

```javascript
// Add this test route
app.get("/test-db-error", async (req, res) => {
  // This will cause a database error
  await database.query("SELECT * FROM nonexistent_table");
});
```

### Test External API Errors

```javascript
// Add this test route
app.get("/test-external-api-error", async (req, res) => {
  // Simulate external API failure
  const response = await fetch("https://invalid-url-that-will-fail.com");
  if (!response.ok) {
    throw new Error("External API failed");
  }
});
```

## Environment Variables

Make sure these are set in production:

```env
NODE_ENV=production
SENTRY_DSN=https://24b0eb05209985e57974ae4d3a07765d@o4510533802590208.ingest.us.sentry.io/4510533803769856
```

## Troubleshooting

### Errors Not Appearing in Sentry

1. **Check Environment Variables:**
   ```bash
   # In Railway, verify:
   - NODE_ENV=production
   - SENTRY_DSN is set (or using default)
   ```

2. **Check Server Logs:**
   - Look for Sentry initialization messages
   - Check for any Sentry-related errors

3. **Verify Network:**
   - Ensure Railway can reach Sentry servers
   - Check firewall settings

4. **Check Sentry Project:**
   - Verify DSN is correct
   - Check if project is active
   - Verify API keys have permissions

### Errors Appearing But Missing Details

1. **Check Source Maps:**
   - Source maps help Sentry show readable stack traces
   - May need to upload source maps for production builds

2. **Check Breadcrumbs:**
   - Enable more integrations in `instrument.js`
   - Add custom breadcrumbs in your code

3. **Check Context:**
   - Add user context: `Sentry.setUser({ id, email })`
   - Add custom context: `Sentry.setContext("custom", { ... })`

## Best Practices

1. **Test Regularly:**
   - Test after each deployment
   - Test different error scenarios
   - Verify errors are being captured correctly

2. **Monitor Error Rates:**
   - Set up alerts in Sentry for high error rates
   - Track error trends over time

3. **Review Errors:**
   - Check Sentry dashboard daily
   - Fix critical errors immediately
   - Track error resolution

4. **Use Releases:**
   - Tag releases in Sentry
   - Track which version introduced errors
   - Use release tracking in deployments

## Security Note

⚠️ **Important:** The `/debug-sentry` endpoint is public. After testing:
- Add authentication
- Remove it
- Rate-limit it
- Or restrict it to admin users only


