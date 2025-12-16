# Monitoring & Observability

Comprehensive guide to monitoring, logging, and observability for the BetaBaddies backend.

## Table of Contents

- [Overview](#overview)
- [Error Tracking (Sentry)](#error-tracking-sentry)
- [Application Logging](#application-logging)
- [API Monitoring](#api-monitoring)
- [Health Checks](#health-checks)
- [Performance Monitoring](#performance-monitoring)
- [Database Monitoring](#database-monitoring)
- [Alerting](#alerting)
- [Dashboards](#dashboards)

## Overview

The backend implements comprehensive monitoring and observability:

- **Error Tracking**: Sentry for error capture and tracking
- **Logging**: Structured logging with custom logger
- **API Monitoring**: Custom API usage and quota tracking
- **Health Checks**: Endpoint health monitoring
- **Performance**: Response time and query performance tracking

## Error Tracking (Sentry)

### Setup

**File**: `backend/instrument.js`

Sentry is initialized at application startup for error tracking and performance monitoring.

**Configuration**:

```javascript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% in production
  profileSessionSampleRate: 0.1,
});
```

### Features

- **Error Capture**: Automatic error capture from Express
- **Performance Monitoring**: Transaction tracing
- **Profiling**: CPU and memory profiling
- **Breadcrumbs**: Request and log breadcrumbs
- **User Context**: User information in errors
- **Release Tracking**: Version and deployment tracking

### Error Handler

**File**: `backend/server.js`

Sentry error handler is integrated with Express:

```javascript
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}
```

### Testing Sentry

**Debug Endpoint**: `GET /debug-sentry`

```bash
# Test error capture
curl https://betabaddies-production.up.railway.app/debug-sentry
```

This endpoint intentionally throws an error to test Sentry integration.

### Sentry Dashboard

Access: https://sentry.io

**Key Metrics**:

- Error rate
- Error frequency
- Affected users
- Performance metrics
- Release health

### Configuration

**Environment Variables**:

```env
SENTRY_DSN=https://xxxxx@o4510533802590208.ingest.us.sentry.io/xxxxx
NODE_ENV=production
```

## Application Logging

### Logger Service

**File**: `backend/utils/logger.js`

Structured logging with multiple log levels.

**Log Levels**:

- `debug` - Detailed debugging information
- `info` - General informational messages
- `warn` - Warning messages
- `error` - Error messages

### Usage

```javascript
import logger from "./utils/logger.js";

logger.info("User logged in", { userId, email });
logger.error("Database error", { error: error.message, query });
logger.debug("Request details", { method, url, headers });
```

### Log Format

**Structured JSON** (in production):

```json
{
  "level": "info",
  "message": "User logged in",
  "timestamp": "2024-12-15T18:00:00.000Z",
  "userId": "123",
  "email": "user@example.com"
}
```

**Human-readable** (in development):

```
[INFO] User logged in { userId: '123', email: 'user@example.com' }
```

### Log Output

- **Development**: Console output with colors
- **Production**: JSON structured logs (stdout/stderr)
- **Railway**: Captured in Railway logs dashboard

### Query Logging

All database queries are automatically logged:

```
📊 Executed query {
  text: "SELECT * FROM users WHERE id = $1...",
  duration: "5ms",
  rows: 1
}
```

## API Monitoring

### API Monitoring Service

**File**: `services/apiMonitoringService.js`

Tracks API usage, quotas, and performance.

**Features**:

- Usage tracking per service
- Quota management
- Response time monitoring
- Error logging
- Cost tracking

### Usage Tracking

```javascript
await apiMonitoringService.logUsage({
  serviceName: "openai",
  endpoint: "/api/v1/resumes/generate",
  userId: userId,
  responseTimeMs: 1500,
  tokensUsed: 500,
  costUsd: 0.01,
  success: true,
});
```

### Quota Management

**Database Tables**:

- `api_services` - Service definitions
- `api_quotas` - Quota tracking
- `api_response_times` - Performance metrics
- `api_error_logs` - Error tracking
- `api_alerts` - Alert management

### Monitoring Endpoints

**Endpoints**:

- `GET /api/v1/api-monitoring/services` - List services
- `GET /api/v1/api-monitoring/quotas` - Check quotas
- `GET /api/v1/api-monitoring/usage` - Usage statistics
- `GET /api/v1/api-monitoring/alerts` - Get alerts

## Health Checks

### Health Check Endpoint

**Endpoint**: `GET /health`

**Response**:

```json
{
  "status": "ok",
  "timestamp": "2024-12-15T18:00:00.000Z",
  "uptime": 3600,
  "database": "connected",
  "version": "1.0.0"
}
```

### Health Check Implementation

**File**: `backend/server.js`

```javascript
app.get("/health", async (req, res) => {
  try {
    // Test database connection
    await database.query("SELECT NOW()");

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: "connected",
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      database: "disconnected",
      error: error.message,
    });
  }
});
```

### Monitoring Health Checks

**Railway**: Automatically monitors `/health` endpoint

**External Monitoring**: Can be configured with:

- UptimeRobot
- Pingdom
- StatusCake
- Custom monitoring tools

## Performance Monitoring

### Response Time Tracking

**Middleware**: Custom middleware tracks response times

```javascript
const start = Date.now();
// ... request handling
const duration = Date.now() - start;
logger.info("Request completed", { duration, method, url });
```

### Database Query Performance

All queries are logged with duration:

```javascript
const start = Date.now();
const result = await database.query(text, params);
const duration = Date.now() - start;
console.log("📊 Executed query", { duration: `${duration}ms` });
```

### Sentry Performance

Sentry automatically tracks:

- Transaction duration
- Database query time
- External API calls
- Slow endpoints

**Performance Dashboard**: Available in Sentry

## Database Monitoring

### Connection Pool Monitoring

**File**: `services/database.js`

Connection pool status:

- Active connections
- Idle connections
- Pool size
- Connection errors

### Query Performance

**Logged Metrics**:

- Query text (truncated)
- Execution duration
- Row count
- Error details

### Database Health

**Health Check**: Tests database connectivity

```javascript
await database.query("SELECT NOW()");
```

## Alerting

### Sentry Alerts

**Configured Alerts**:

- Error rate threshold
- New error types
- Performance degradation
- Release issues

**Alert Channels**:

- Email
- Slack (if configured)
- PagerDuty (if configured)

### API Monitoring Alerts

**Alert Types**:

- Quota exceeded
- High error rate
- Slow response times
- Service unavailable

**Database Table**: `api_alerts`

### Deployment Notifications

**AWS SNS**: Deployment status notifications

**Configuration**: See [Deployment Documentation](./DEPLOYMENT.md)

## Dashboards

### Sentry Dashboard

**URL**: https://sentry.io

**Metrics**:

- Error rate over time
- Error frequency by type
- Performance metrics
- User impact
- Release health

### Railway Dashboard

**URL**: Railway project dashboard

**Metrics**:

- Deployment history
- Logs (real-time)
- Resource usage
- Environment variables

### Custom Dashboards

**Future Enhancements**:

- Grafana integration
- Custom metrics dashboard
- Business metrics tracking

## Log Analysis

### Railway Logs

**Access**: Railway dashboard → Service → Logs

**Features**:

- Real-time log streaming
- Log search
- Filter by level
- Export logs

### Log Aggregation

**Current**: Console output captured by Railway

**Future Options**:

- ELK Stack (Elasticsearch, Logstash, Kibana)
- Datadog
- New Relic
- CloudWatch

## Monitoring Best Practices

### 1. Structured Logging

Always use structured logging:

```javascript
// ✅ Good
logger.info("User action", { userId, action, timestamp });

// ❌ Bad
console.log("User did something");
```

### 2. Error Context

Include context in errors:

```javascript
logger.error("Database error", {
  error: error.message,
  query: query.substring(0, 100),
  userId,
  timestamp: new Date().toISOString(),
});
```

### 3. Performance Tracking

Track slow operations:

```javascript
const start = Date.now();
await expensiveOperation();
const duration = Date.now() - start;

if (duration > 1000) {
  logger.warn("Slow operation", { duration, operation: "expensiveOperation" });
}
```

### 4. Health Checks

Implement health checks for dependencies:

```javascript
// Database health
await database.query("SELECT 1");

// External API health
await externalApi.healthCheck();
```

## Testing Monitoring

### Test Sentry Integration

```bash
# Use debug endpoint
curl https://betabaddies-production.up.railway.app/debug-sentry

# Check Sentry dashboard for error
```

### Test Logging

```bash
# Check Railway logs
# Or local console output
npm start
```

### Test Health Check

```bash
curl https://betabaddies-production.up.railway.app/health
```

## Monitoring Scripts

### Bulk Sentry Testing

**File**: `backend/monitoring-tests/test-sentry-bulk.sh`

```bash
# Test Sentry with multiple requests
./monitoring-tests/test-sentry-bulk.sh production 500
```

See [Monitoring Tests README](../monitoring-tests/README.md) for details.

## Troubleshooting

### Sentry Not Capturing Errors

**Check**:

- `SENTRY_DSN` is set correctly
- Sentry initialization in `instrument.js`
- Error handler middleware is registered
- Network connectivity to Sentry

### Logs Not Appearing

**Check**:

- Logger is imported correctly
- Log level is appropriate
- Railway logs dashboard
- Console output capture

### Health Check Failing

**Check**:

- Database connection
- Environment variables
- Service availability
- Network connectivity

## Load Testing with k6

### Overview

Grafana k6 is integrated for load testing and performance validation. Test scripts are located in `tests/k6/`.

### Quick Start

```bash
# Install k6
brew install k6  # macOS
# or see k6.io/docs/getting-started/installation

# Run smoke test
k6 run tests/k6/smoke-test.js

# Run load test
k6 run tests/k6/load-test.js
```

### Available Test Scripts

- **`smoke-test.js`** - Quick verification (1 VU, 1 minute)
- **`load-test.js`** - Standard load test (10-50 VUs, 5 minutes)
- **`stress-test.js`** - Find breaking point (up to 250 VUs)
- **`spike-test.js`** - Sudden traffic spikes (10→200 VUs)
- **`soak-test.js`** - Sustained load (20 VUs, 40 minutes)
- **`api-test.js`** - Comprehensive API endpoint testing

### Configuration

Set environment variables:

```bash
export BACKEND_URL=https://betabaddies-production.up.railway.app
export TEST_USER_EMAIL=test@example.com
export TEST_USER_PASSWORD=test-password

k6 run tests/k6/load-test.js
```

### Test Scenarios

**Smoke Test**: Verify all endpoints are accessible

```bash
k6 run tests/k6/smoke-test.js
```

**Load Test**: Test under normal expected load

```bash
k6 run tests/k6/load-test.js
```

**Stress Test**: Find maximum capacity

```bash
k6 run tests/k6/stress-test.js
```

**Spike Test**: Test response to sudden traffic

```bash
k6 run tests/k6/spike-test.js
```

**Soak Test**: Detect memory leaks over time

```bash
k6 run tests/k6/soak-test.js
```

### Output Options

```bash
# JSON output
k6 run --out json=results.json tests/k6/load-test.js

# InfluxDB output
k6 run --out influxdb=http://localhost:8086/k6 tests/k6/load-test.js

# k6 Cloud
k6 cloud tests/k6/load-test.js
```

### Metrics Tracked

- Request rate (requests/second)
- Response times (p50, p95, p99)
- Error rate
- Data transfer
- Virtual users

### CI/CD Integration

Add to GitHub Actions:

```yaml
- name: Run k6 smoke test
  run: |
    k6 run tests/k6/smoke-test.js
```

### Documentation

See [k6 Tests README](../tests/k6/README.md) for detailed documentation.

## Next Steps

- Review [Deployment Documentation](./DEPLOYMENT.md) for production setup
- Check [Architecture Documentation](./ARCHITECTURE.md) for system design
- See [Services Documentation](./SERVICES.md) for service details
- Read [k6 Tests Documentation](../tests/k6/README.md) for load testing
