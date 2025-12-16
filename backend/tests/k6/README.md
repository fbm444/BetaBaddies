# Grafana k6 Load Testing

This directory contains k6 load testing scripts for the BetaBaddies backend API.

## What is k6?

k6 is a modern load testing tool that uses JavaScript (ES6) for writing test scripts. It's designed for performance testing, load testing, and stress testing of APIs and web services.

## Installation

### macOS

```bash
brew install k6
```

### Linux

```bash
# Debian/Ubuntu
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Or use binary
wget https://github.com/grafana/k6/releases/download/v0.50.0/k6-v0.50.0-linux-amd64.tar.gz
tar -xzf k6-v0.50.0-linux-amd64.tar.gz
sudo mv k6-v0.50.0-linux-amd64/k6 /usr/local/bin/
```

### Windows

Download from: https://github.com/grafana/k6/releases

Or use Chocolatey:

```bash
choco install k6
```

### Verify Installation

```bash
k6 version
```

## ⚠️ Production vs Staging Testing

### **DO NOT run load/stress tests in production!**

**Why?**

- Can impact real users and degrade performance
- May trigger rate limiting or DDoS protection
- Could cause service outages
- May generate false alerts

### **When to Test in Production**

✅ **Safe to run in production:**

- **Smoke tests** - Quick health checks (1 VU, minimal load)
- **Scheduled health checks** - Low-frequency monitoring

❌ **Never run in production:**

- **Load tests** - Normal load simulation
- **Stress tests** - Finding breaking points
- **Spike tests** - Sudden traffic increases
- **Soak tests** - Long-duration tests

### **Recommended Approach**

1. **Staging/Pre-Production Environment**

   - Mirror production setup
   - Run all test types safely
   - Validate performance before deployment

2. **Production Smoke Tests**

   - Run smoke tests only
   - Low frequency (e.g., hourly)
   - Minimal load (1-2 VUs)

3. **Load Testing Strategy**
   ```
   Development → Staging → Production
      ↓            ↓          ↓
   All tests    All tests   Smoke only
   ```

## Quick Start

### Visualizing Test Results

**See [VISUALIZATION.md](./VISUALIZATION.md) for complete guide**

**Quick options:**

- **Console** (easiest): Just run `k6 run tests/k6/smoke-test.js`
- **InfluxDB + Grafana** (recommended): `k6 run --out influxdb=http://localhost:8086/k6 tests/k6/smoke-test.js`
- **k6 Cloud** (zero setup): `k6 cloud tests/k6/smoke-test.js`

### Run All Tests

Run all k6 tests in sequence:

```bash
# Run all tests against local backend
./tests/k6/run-all-tests.sh

# Run all tests against production (⚠️ use with caution!)
BACKEND_URL=https://betabaddies-production.up.railway.app ./tests/k6/run-all-tests.sh

# Skip long-running tests
./tests/k6/run-all-tests.sh --skip-soak --skip-stress

# Run only smoke test (quick health check)
./tests/k6/run-all-tests.sh --smoke-only
```

**Options:**

- `--skip-soak` - Skip the soak test (can take hours)
- `--skip-stress` - Skip the stress test (can take a while)
- `--smoke-only` - Run only the smoke test
- `--help` - Show help message

### 1. Basic Load Test (Staging Only!)

```bash
# ⚠️ Run in STAGING, not production!

# Set staging URL
export BACKEND_URL=https://staging-backend.example.com

# Run basic smoke test (safe for production)
k6 run tests/k6/smoke-test.js

# Run load test (STAGING ONLY)
k6 run tests/k6/load-test.js

# Run stress test (STAGING ONLY)
k6 run tests/k6/stress-test.js
```

### 2. Production Smoke Test (Safe)

```bash
# Set production URL
export BACKEND_URL=https://betabaddies-production.up.railway.app

# ✅ Safe: Smoke test only (1 VU, minimal load)
k6 run tests/k6/smoke-test.js

# ❌ DO NOT: Load/stress tests in production
# k6 run tests/k6/load-test.js  # DON'T DO THIS IN PRODUCTION!
```

### 3. With Options

```bash
# Custom duration and VUs
k6 run --vus 50 --duration 2m tests/k6/load-test.js

# Output to file
k6 run --out json=results.json tests/k6/load-test.js

# Multiple output formats
k6 run --out json=results.json --out cloud tests/k6/load-test.js
```

## Test Scripts

### Available Scripts

- **`smoke-test.js`** - Quick smoke test (1 user, verify endpoints work)
- **`load-test.js`** - Standard load test (10-50 VUs, typical load)
- **`stress-test.js`** - Stress test (100+ VUs, find breaking point)
- **`spike-test.js`** - Spike test (sudden traffic increase)
- **`soak-test.js`** - Soak test (sustained load over time)
- **`api-test.js`** - Comprehensive API endpoint testing

## Configuration

### Environment Variables

Create a `.env.k6` file or set environment variables:

```env
BACKEND_URL=https://betabaddies-production.up.railway.app
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=test-password
```

### Authentication

Most tests require authentication. You can:

1. **Use test credentials** (set in environment)
2. **Create test user** (via registration endpoint)
3. **Use existing session** (export session cookie)

## Running Tests

### Smoke Test (Quick Verification)

```bash
k6 run tests/k6/smoke-test.js
```

**Purpose**: Verify all endpoints are accessible and responding

### Load Test (Normal Load)

```bash
k6 run tests/k6/load-test.js
```

**Purpose**: Test system under normal expected load

### Stress Test (Find Limits)

```bash
k6 run tests/k6/stress-test.js
```

**Purpose**: Find system breaking point and maximum capacity

### Spike Test (Sudden Traffic)

```bash
k6 run tests/k6/spike-test.js
```

**Purpose**: Test system response to sudden traffic spikes

### Soak Test (Sustained Load)

```bash
k6 run tests/k6/soak-test.js
```

**Purpose**: Test for memory leaks and performance degradation over time

## Output Options

### Console Output

Default output shows:

- Request rate
- Response times (p50, p95, p99)
- Error rate
- Data transfer

### JSON Output

```bash
k6 run --out json=results.json tests/k6/load-test.js
```

### Cloud Output (k6 Cloud)

```bash
# Requires k6 cloud account
k6 cloud tests/k6/load-test.js
```

### InfluxDB Output (for Grafana) - Recommended

```bash
# InfluxDB v1
k6 run --out influxdb=http://localhost:8086/k6 tests/k6/load-test.js

# InfluxDB v2
k6 run \
  --out influxdb=http://localhost:8086/k6 \
  --out influxdb-org=myorg \
  --out influxdb-token=YOUR_TOKEN \
  --out influxdb-bucket=k6 \
  tests/k6/load-test.js
```

### Prometheus Output (Alternative)

**Note**: k6 doesn't natively push to Prometheus. Options:

1. **k6 Cloud** (easiest - Prometheus-compatible):

   ```bash
   k6 cloud tests/k6/load-test.js
   ```

2. **StatsD + Prometheus Exporter** (requires setup)

3. **Use InfluxDB instead** (recommended for k6)

**View in Grafana**: See [HOW_IT_WORKS.md](./HOW_IT_WORKS.md) for a simple explanation, or check the k6 documentation for Grafana setup.

### Prometheus Output (Local Visualization)

To visualize k6 results in Prometheus locally:

```bash
# 1. Setup Prometheus + StatsD Exporter
./tests/k6/setup-prometheus-local.sh

# 2. Start services
cd tests/k6/prometheus-config && ./start-services.sh

# 3. Run k6 test with StatsD output
k6 run --out statsd tests/k6/smoke-test-prometheus.js

# 4. View in Prometheus: http://localhost:9090
# 5. (Optional) View in Grafana: http://localhost:3000
```

**Note**: k6 doesn't natively push to Prometheus, so we use StatsD as a bridge:

- k6 → StatsD Exporter → Prometheus → Grafana

See `tests/k6/prometheus-config/README.md` for detailed setup instructions.

### Custom Output

See k6 documentation for custom output plugins.

## Metrics

k6 tracks various metrics:

- **http_req_duration** - Request duration
- **http_req_failed** - Failed requests
- **http_reqs** - Total requests
- **iterations** - Completed iterations
- **vus** - Virtual users
- **data_received** - Data received
- **data_sent** - Data sent

## Thresholds

Define performance thresholds in test scripts:

```javascript
export const options = {
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests < 500ms
    http_req_failed: ["rate<0.01"], // Error rate < 1%
    http_reqs: ["rate>100"], // Request rate > 100/s
  },
};
```

## Best Practices

1. **Start Small**: Begin with smoke tests, then increase load
2. **Test Realistic Scenarios**: Test actual user workflows
3. **Monitor Resources**: Watch CPU, memory, database during tests
4. **Set Thresholds**: Define acceptable performance metrics
5. **Test Incrementally**: Gradually increase load to find limits
6. **Test Production-Like**: Use similar data and environment
7. **Document Results**: Save test results for comparison

## CI/CD Integration

### Pre-Deployment (Production Smoke Test)

```yaml
- name: Production Smoke Test
  run: |
    BACKEND_URL=https://betabaddies-production.up.railway.app \
      k6 run tests/k6/smoke-test.js
```

### Staging Tests (Full Suite)

```yaml
- name: Staging Load Tests
  env:
    BACKEND_URL: ${{ secrets.STAGING_BACKEND_URL }}
  run: |
    k6 run tests/k6/load-test.js
    k6 run tests/k6/stress-test.js
```

### Pre-deployment Testing

✅ **Safe**: Run smoke tests in production before deployment  
❌ **Never**: Run load/stress tests in production

**Best Practice**: Run full test suite in staging, smoke test only in production.

## Troubleshooting

### Connection Errors

- Verify `BACKEND_URL` is correct
- Check network connectivity
- Verify CORS settings

### Authentication Errors

- Check test credentials
- Verify session management
- Check token expiration

### High Error Rates

- Check backend logs
- Verify database connectivity
- Check rate limiting
- Monitor resource usage

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 JavaScript API](https://k6.io/docs/javascript-api/)
- [k6 Examples](https://k6.io/docs/examples/)
- [k6 Cloud](https://app.k6.io/)
