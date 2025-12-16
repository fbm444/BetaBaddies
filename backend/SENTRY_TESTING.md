# Testing Sentry in Production

## Quick Test Methods

### 1. Test Debug Endpoint (Easiest)

Call the `/debug-sentry` endpoint on your production backend:

```bash
# Replace with your actual production URL
curl https://betabaddies-production.up.railway.app/debug-sentry
```

**Expected Result:**
- HTTP 500 error response
- Error appears in Sentry dashboard within 1-2 minutes

### 2. Test via Browser

Open in your browser:
```
https://betabaddies-production.up.railway.app/debug-sentry
```

### 3. Test Real Error Scenario

Trigger a real error by calling an invalid endpoint or API:

```bash
# Test 404 handler
curl https://betabaddies-production.up.railway.app/api/v1/nonexistent

# Test invalid API call (if you have validation)
curl -X POST https://betabaddies-production.up.railway.app/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'
```

## Verify in Sentry Dashboard

1. **Go to Sentry Dashboard:**
   - Visit: https://sentry.io/organizations/YOUR_ORG/issues/
   - Or use the direct link from your project settings

2. **Check for New Issues:**
   - Look for "My first Sentry error!" (from debug endpoint)
   - Check the timestamp matches when you called the endpoint
   - Verify environment shows "production"

3. **Verify Error Details:**
   - Click on the error to see:
     - Stack trace
     - Request details (URL, headers, body)
     - User context (if available)
     - Breadcrumbs (logs leading up to error)

4. **Check Performance:**
   - Go to Performance tab
   - Look for transactions from your API calls
   - Verify profiling data is being collected

## Environment Variables to Check

Make sure these are set in your Railway production environment:

```env
NODE_ENV=production
SENTRY_DSN=https://24b0eb05209985e57974ae4d3a07765d@o4510533802590208.ingest.us.sentry.io/4510533803769856
```

**Note:** If `SENTRY_DSN` is not set, it will use the default DSN from `instrument.js`.

## Testing Checklist

- [ ] Call `/debug-sentry` endpoint
- [ ] Verify error appears in Sentry dashboard
- [ ] Check error has correct environment tag (production)
- [ ] Verify stack trace is readable
- [ ] Check that request details are captured
- [ ] Test a real API error (e.g., invalid login)
- [ ] Verify performance monitoring is working
- [ ] Check that logs are being sent to Sentry

## Troubleshooting

### Error Not Appearing in Sentry

1. **Check Environment Variables:**
   ```bash
   # In Railway dashboard, verify:
   - NODE_ENV=production
   - SENTRY_DSN is set (or using default)
   ```

2. **Check Server Logs:**
   - Look for Sentry initialization messages
   - Check for any Sentry-related errors

3. **Verify Network:**
   - Ensure Railway can reach Sentry's servers
   - Check firewall/security group settings

4. **Check Sentry Project Settings:**
   - Verify DSN is correct
   - Check if project is active
   - Verify API keys have correct permissions

### Performance Data Not Showing

- Check `tracesSampleRate` in `instrument.js` (should be 0.1 for production = 10%)
- Wait a few minutes for data to appear
- Make multiple API calls to generate transactions

### Profiling Not Working

- Verify `@sentry/profiling-node` is installed
- Check `profileSessionSampleRate` is set (0.1 for production)
- Profiling requires Node.js 18+ (Railway should have this)

## Advanced Testing

### Test Custom Context

You can add custom context to errors:

```javascript
// In your route handler
Sentry.setUser({ id: "123", email: "user@example.com" });
Sentry.setContext("custom", { feature: "payment", amount: 100 });
throw new Error("Payment failed");
```

### Test Metrics

```javascript
// In your route handler
Sentry.metrics.increment("api.requests", 1, { tags: { route: "/api/v1/users" } });
```

### Test Logs

```javascript
// In your route handler
Sentry.logger.info("User action", { action: "login", userId: "123" });
```

## Production Monitoring

After testing, monitor:

1. **Error Rate:** Check Sentry dashboard for error frequency
2. **Performance:** Monitor API response times in Performance tab
3. **Alerts:** Set up Sentry alerts for critical errors
4. **Releases:** Tag releases to track which version introduced errors

## Security Note

⚠️ **Important:** The `/debug-sentry` endpoint should be:
- Protected by authentication in production, OR
- Removed after testing, OR
- Rate-limited to prevent abuse

Consider adding authentication:

```javascript
// In server.js, protect the debug endpoint
app.get("/debug-sentry", requireAuth, function mainHandler(req, res) {
  // ... existing code
});
```


