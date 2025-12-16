# Production Testing Guidelines

## ⚠️ Critical: Production Testing Policy

**TL;DR**: Only run **smoke tests** in production. All other tests should run in staging/pre-production environments.

## Safe Production Tests

### ✅ Smoke Tests Only

**What**: Quick health verification with minimal load (1 VU)

**When**:

- Pre-deployment verification
- Scheduled health monitoring
- Post-deployment validation

**Example**:

```bash
# ✅ Safe for production
BACKEND_URL=https://betabaddies-production.up.railway.app \
  k6 run tests/k6/smoke-test.js
```

**Why Safe**:

- Single virtual user
- Short duration (1 minute)
- Minimal load impact
- Only tests endpoint accessibility

## Never Run in Production

### ❌ Load Tests

- **Why**: Simulates normal user load
- **Impact**: Can degrade performance for real users
- **Use Instead**: Run in staging environment

### ❌ Stress Tests

- **Why**: Finds breaking points with high load
- **Impact**: Can crash or severely impact production
- **Use Instead**: Run in isolated staging environment

### ❌ Spike Tests

- **Why**: Tests sudden traffic increases
- **Impact**: Can trigger rate limiting, affect real users
- **Use Instead**: Run in staging with production-like setup

### ❌ Soak Tests

- **Why**: Long-duration sustained load
- **Impact**: Can cause memory leaks, resource exhaustion
- **Use Instead**: Run in staging for extended periods

## Recommended Testing Strategy

### 1. Development Environment

**Purpose**: Quick iteration and validation

```bash
# Local development
BACKEND_URL=http://localhost:3001 k6 run tests/k6/smoke-test.js
```

**Tests**: All test types

### 2. Staging/Pre-Production Environment

**Purpose**: Production-like testing without risk

```bash
# Staging environment
BACKEND_URL=https://staging-backend.example.com \
  k6 run tests/k6/load-test.js

# Stress testing
BACKEND_URL=https://staging-backend.example.com \
  k6 run tests/k6/stress-test.js
```

**Tests**: All test types (load, stress, spike, soak)

**Setup**:

- Mirror production configuration
- Use production-like data volumes
- Monitor resources during tests

### 3. Production Environment

**Purpose**: Health verification only

```bash
# Production smoke test (safe)
BACKEND_URL=https://betabaddies-production.up.railway.app \
  k6 run tests/k6/smoke-test.js
```

**Tests**: Smoke tests only

**Frequency**:

- Pre-deployment: Once before deploy
- Post-deployment: Once after deploy
- Scheduled: Hourly/daily health checks

## Production Smoke Test Workflow

### Pre-Deployment

```bash
# 1. Run smoke test before deploying
BACKEND_URL=https://betabaddies-production.up.railway.app \
  k6 run tests/k6/smoke-test.js

# 2. Verify all checks pass
# 3. Proceed with deployment
```

### Post-Deployment

```bash
# 1. Deploy to production
# 2. Run smoke test to verify deployment
BACKEND_URL=https://betabaddies-production.up.railway.app \
  k6 run tests/k6/smoke-test.js

# 3. Verify all endpoints working
```

### Scheduled Monitoring

```bash
# Cron job or scheduled task
# Run hourly/daily
BACKEND_URL=https://betabaddies-production.up.railway.app \
  k6 run --quiet tests/k6/smoke-test.js \
  --out json=health-check-$(date +%Y%m%d-%H%M%S).json
```

## Staging Environment Setup

### Recommended Staging Configuration

1. **Separate Database**: Use staging database (not production)
2. **Production-Like**: Same configuration as production
3. **Isolated**: No impact on production users
4. **Monitoring**: Full monitoring enabled

### Staging Test Workflow

```bash
# 1. Deploy to staging
# 2. Run comprehensive tests
export BACKEND_URL=https://staging-backend.example.com

# Load test
k6 run tests/k6/load-test.js

# Stress test (find limits)
k6 run tests/k6/stress-test.js

# Spike test
k6 run tests/k6/spike-test.js

# Soak test (if needed)
k6 run tests/k6/soak-test.js

# 3. Review results
# 4. If all pass, deploy to production
```

## CI/CD Integration

### Pre-Deployment (Safe)

```yaml
# GitHub Actions - Pre-deployment smoke test
- name: Production Smoke Test
  run: |
    BACKEND_URL=https://betabaddies-production.up.railway.app \
      k6 run tests/k6/smoke-test.js
```

### Staging Tests (Full Suite)

```yaml
# GitHub Actions - Staging load tests
- name: Staging Load Tests
  run: |
    BACKEND_URL=${{ secrets.STAGING_BACKEND_URL }} \
      k6 run tests/k6/load-test.js
```

## Monitoring During Tests

### Production Smoke Tests

**Monitor**:

- Response times
- Error rates
- Health check status

**Alerts**: Only if smoke test fails (indicates real issue)

### Staging Load Tests

**Monitor**:

- CPU usage
- Memory usage
- Database connections
- Response times
- Error rates
- Throughput

## Best Practices

1. **Always test in staging first**

   - Run full test suite
   - Validate performance
   - Fix issues before production

2. **Production smoke tests only**

   - Minimal load
   - Quick verification
   - Health monitoring

3. **Schedule appropriately**

   - Avoid peak hours
   - Coordinate with team
   - Monitor during tests

4. **Document results**

   - Save test results
   - Compare over time
   - Track performance trends

5. **Set up alerts**
   - Alert on smoke test failures
   - Monitor production metrics
   - Track degradation

## Example: Safe Production Workflow

```bash
# 1. Test in staging first
export BACKEND_URL=https://staging.example.com
k6 run tests/k6/load-test.js
k6 run tests/k6/stress-test.js

# 2. If staging tests pass, deploy to production

# 3. Run smoke test in production (safe)
export BACKEND_URL=https://betabaddies-production.up.railway.app
k6 run tests/k6/smoke-test.js

# 4. Verify deployment successful
```

## Troubleshooting

### If Smoke Test Fails in Production

1. **Check health endpoint**: `curl https://betabaddies-production.up.railway.app/health`
2. **Check logs**: Railway dashboard → Logs
3. **Check Sentry**: Error tracking dashboard
4. **Verify deployment**: Check recent deployments
5. **Rollback if needed**: Use Railway rollback feature

### If You Accidentally Run Load Test in Production

1. **Stop immediately**: Ctrl+C
2. **Monitor metrics**: Check CPU, memory, response times
3. **Check user impact**: Monitor error rates
4. **Review logs**: Check for issues
5. **Scale if needed**: Increase resources temporarily

## Summary

| Test Type   | Production | Staging | Development |
| ----------- | ---------- | ------- | ----------- |
| Smoke Test  | ✅ Yes     | ✅ Yes  | ✅ Yes      |
| Load Test   | ❌ No      | ✅ Yes  | ✅ Yes      |
| Stress Test | ❌ No      | ✅ Yes  | ✅ Yes      |
| Spike Test  | ❌ No      | ✅ Yes  | ✅ Yes      |
| Soak Test   | ❌ No      | ✅ Yes  | ✅ Yes      |

**Rule of Thumb**: If the test uses more than 1-2 VUs or runs longer than 1 minute, don't run it in production.

