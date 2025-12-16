# Monitoring Tests

This directory contains scripts for testing monitoring and error tracking in production.

## Scripts

### `test-sentry-bulk.sh`

Bulk test Sentry error handling by sending multiple requests to the debug endpoint.

**Usage:**

```bash
# Test in production with 500 requests
./test-sentry-bulk.sh production 500

# Test locally with 100 requests
./test-sentry-bulk.sh local 100

# Default: 500 requests
./test-sentry-bulk.sh production
```

**What it does:**

- Sends multiple requests to `/debug-sentry` endpoint
- Tests Sentry error capture and aggregation
- Shows success/failure rates and timing metrics

**Expected Results:**

- All requests should return HTTP 500
- Errors should appear in Sentry dashboard
- Issue count should reflect the number of requests

## Notes

⚠️ **Important:** These scripts are for testing purposes only. The `/debug-sentry` endpoint should be:

- Protected by authentication in production, OR
- Removed after testing, OR
- Rate-limited to prevent abuse

## Running Tests

From the `backend` directory:

```bash
cd monitoring-tests
./test-sentry-bulk.sh production 500
```

Or from the `monitoring-tests` directory:

```bash
./test-sentry-bulk.sh production 500
```

