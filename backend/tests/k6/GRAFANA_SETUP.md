# k6 + Grafana Setup (InfluxDB or Prometheus)

Guide for visualizing k6 test results in Grafana dashboards.

## Overview

k6 can send metrics to **InfluxDB** or **Prometheus**, which Grafana can then visualize in dashboards. This provides real-time and historical performance metrics.

## Architecture Options

**Option 1: InfluxDB**

```
k6 Test → InfluxDB → Grafana Dashboard
```

**Option 2: Prometheus**

```
k6 Test → Prometheus → Grafana Dashboard
```

## Which to Choose?

### InfluxDB

- ✅ Time-series database optimized for metrics
- ✅ Simple setup
- ✅ Good for high-frequency metrics
- ✅ Built-in retention policies

### Prometheus

- ✅ Industry standard for metrics
- ✅ Pull-based model (scrapes metrics)
- ✅ Powerful query language (PromQL)
- ✅ Excellent for Kubernetes environments
- ⚠️ Requires k6 extension or push gateway

**Recommendation**: Use **InfluxDB** for simplicity, **Prometheus** if you already have Prometheus infrastructure.

## Setup Options

### Option A: InfluxDB Setup

#### Option 1: Local Setup (Development)

#### 1. Install InfluxDB

```bash
# macOS
brew install influxdb

# Start InfluxDB
brew services start influxdb

# Or run directly
influxd
```

#### 2. Install Grafana

```bash
# macOS
brew install grafana

# Start Grafana
brew services start grafana

# Or run directly
grafana-server
```

#### 3. Configure InfluxDB

```bash
# Create database for k6 metrics
influx -execute "CREATE DATABASE k6"
```

#### 4. Run k6 with InfluxDB Output

```bash
k6 run \
  --out influxdb=http://localhost:8086/k6 \
  tests/k6/load-test.js
```

#### 5. Configure Grafana

1. **Access Grafana**: http://localhost:3000
2. **Default credentials**: admin/admin
3. **Add InfluxDB Data Source**:
   - Settings → Data Sources → Add data source
   - Select InfluxDB
   - URL: `http://localhost:8086`
   - Database: `k6`
   - Click "Save & Test"

#### 6. Import k6 Dashboard

1. **Download k6 Dashboard JSON**: https://grafana.com/grafana/dashboards/2587
2. **Import in Grafana**:
   - Dashboards → Import
   - Upload JSON or paste dashboard ID: `2587`
   - Select InfluxDB data source
   - Click "Import"

### Option 2: Docker Setup (Recommended)

#### Docker Compose

Create `docker-compose.yml`:

```yaml
version: "3.8"

services:
  influxdb:
    image: influxdb:2.7
    ports:
      - "8086:8086"
    environment:
      - DOCKER_INFLUXDB_INIT_MODE=setup
      - DOCKER_INFLUXDB_INIT_USERNAME=admin
      - DOCKER_INFLUXDB_INIT_PASSWORD=admin123456
      - DOCKER_INFLUXDB_INIT_ORG=myorg
      - DOCKER_INFLUXDB_INIT_BUCKET=k6
    volumes:
      - influxdb-data:/var/lib/influxdb2

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - influxdb

volumes:
  influxdb-data:
  grafana-data:
```

#### Start Services

```bash
docker-compose up -d
```

#### Configure InfluxDB (v2)

1. **Access InfluxDB**: http://localhost:8086
2. **Initial Setup**:
   - Create organization: `myorg`
   - Create bucket: `k6`
   - Create API token with write permissions
3. **Get Connection Details**:
   - Organization: `myorg`
   - Bucket: `k6`
   - Token: (from API tokens)

#### Run k6 with InfluxDB v2

```bash
k6 run \
  --out influxdb=http://localhost:8086/k6 \
  --out influxdb-org=myorg \
  --out influxdb-token=YOUR_TOKEN \
  tests/k6/load-test.js
```

### Option 3: Cloud Setup (Production Monitoring)

#### InfluxDB Cloud

1. **Sign up**: https://www.influxdata.com/products/influxdb-cloud/
2. **Create bucket**: `k6-metrics`
3. **Get token**: API token with write permissions
4. **Get connection URL**: Your InfluxDB cloud URL

#### Grafana Cloud

1. **Sign up**: https://grafana.com/auth/sign-up/create-user
2. **Add InfluxDB data source**: Use InfluxDB cloud connection
3. **Import k6 dashboard**: ID `2587`

#### Run k6 with Cloud InfluxDB

```bash
k6 run \
  --out influxdb=https://us-east-1-1.aws.cloud2.influxdata.com \
  --out influxdb-org=your-org \
  --out influxdb-token=YOUR_TOKEN \
  --out influxdb-bucket=k6-metrics \
  tests/k6/load-test.js
```

## k6 Output Configuration

### InfluxDB Output

**InfluxDB v1**:

```bash
k6 run \
  --out influxdb=http://localhost:8086/k6 \
  tests/k6/load-test.js
```

**InfluxDB v2**:

```bash
k6 run \
  --out influxdb=http://localhost:8086/k6 \
  --out influxdb-org=myorg \
  --out influxdb-token=YOUR_TOKEN \
  --out influxdb-bucket=k6 \
  tests/k6/load-test.js
```

### Prometheus Output

**Note**: k6 doesn't natively push to Prometheus. Options:

**Option 1: k6 Cloud** (Recommended)

```bash
k6 cloud tests/k6/load-test.js
# Metrics available via Prometheus-compatible API
```

**Option 2: StatsD + Prometheus Exporter**

```bash
# Requires statsd exporter
k6 run --out statsd tests/k6/load-test.js
```

**Option 3: JSON Output + Custom Adapter**

```bash
# Export to JSON, then convert to Prometheus format
k6 run --out json=results.json tests/k6/load-test.js
# Use custom script to push to Prometheus
```

### Multiple Outputs

```bash
# Send to both InfluxDB and console
k6 run \
  --out influxdb=http://localhost:8086/k6 \
  --out json=results.json \
  tests/k6/load-test.js
```

## Grafana Dashboard Metrics

### Default k6 Dashboard (ID: 2587)

**For InfluxDB**: Works out of the box with InfluxDB data source

**Metrics Available**:

- **Request Rate**: Requests per second
- **Response Time**: p50, p90, p95, p99
- **Error Rate**: Percentage of failed requests
- **Virtual Users**: Active VUs over time
- **Data Transfer**: Bytes sent/received
- **Iterations**: Completed iterations

### Custom Queries

#### InfluxDB Queries

**Request Duration (p95)**:

```sql
SELECT mean("value") FROM "http_req_duration"
WHERE "stat" = 'p(95)'
GROUP BY time(10s)
```

**Error Rate**:

```sql
SELECT mean("value") FROM "http_req_failed"
GROUP BY time(10s)
```

**Request Rate**:

```sql
SELECT derivative(mean("value"), 1s) FROM "http_reqs"
GROUP BY time(10s)
```

#### Prometheus Queries (PromQL)

**Request Duration (p95)**:

```promql
histogram_quantile(0.95, rate(http_req_duration_bucket[5m]))
```

**Error Rate**:

```promql
rate(http_req_failed[5m])
```

**Request Rate**:

```promql
rate(http_reqs_total[5m])
```

**Virtual Users**:

```promql
vus
```

## Quick Start Script

Create `tests/k6/run-with-grafana.sh`:

```bash
#!/bin/bash

# Configuration
INFLUXDB_URL="${INFLUXDB_URL:-http://localhost:8086/k6}"
INFLUXDB_ORG="${INFLUXDB_ORG:-myorg}"
INFLUXDB_TOKEN="${INFLUXDB_TOKEN:-}"
INFLUXDB_BUCKET="${INFLUXDB_BUCKET:-k6}"

# Test script
TEST_SCRIPT="${1:-tests/k6/load-test.js}"

echo "🚀 Running k6 test with InfluxDB output..."
echo "📊 Results will be available in Grafana"
echo ""

if [ -n "$INFLUXDB_TOKEN" ]; then
  # InfluxDB v2
  k6 run \
    --out influxdb="$INFLUXDB_URL" \
    --out influxdb-org="$INFLUXDB_ORG" \
    --out influxdb-token="$INFLUXDB_TOKEN" \
    --out influxdb-bucket="$INFLUXDB_BUCKET" \
    "$TEST_SCRIPT"
else
  # InfluxDB v1
  k6 run \
    --out influxdb="$INFLUXDB_URL" \
    "$TEST_SCRIPT"
fi

echo ""
echo "✅ Test completed!"
echo "📊 View results in Grafana: http://localhost:3000"
echo "   Dashboard ID: 2587 (k6 Load Testing Results)"
```

## CI/CD Integration

### GitHub Actions with InfluxDB

```yaml
- name: Run k6 with InfluxDB
  env:
    INFLUXDB_URL: ${{ secrets.INFLUXDB_URL }}
    INFLUXDB_TOKEN: ${{ secrets.INFLUXDB_TOKEN }}
  run: |
    k6 run \
      --out influxdb="$INFLUXDB_URL" \
      --out influxdb-token="$INFLUXDB_TOKEN" \
      tests/k6/load-test.js
```

## Troubleshooting

### InfluxDB Connection Issues

**Error**: `Failed to connect to InfluxDB`

**Solutions**:

- Verify InfluxDB is running: `curl http://localhost:8086/ping`
- Check URL format (v1 vs v2)
- Verify network connectivity
- Check firewall rules

### No Data in Grafana

**Check**:

1. InfluxDB data source is configured correctly
2. Database/bucket name matches
3. Time range in Grafana includes test time
4. Query syntax is correct

### Missing Metrics

**Verify**:

- k6 output is configured correctly
- InfluxDB is receiving data
- Grafana queries match metric names

## Comparison: InfluxDB vs Prometheus

| Feature                 | InfluxDB            | Prometheus                |
| ----------------------- | ------------------- | ------------------------- |
| **Setup Complexity**    | Simple              | Moderate                  |
| **k6 Native Support**   | ✅ Yes              | ⚠️ Requires extension     |
| **Query Language**      | InfluxQL            | PromQL                    |
| **Storage Model**       | Push                | Pull (scrape)             |
| **Best For**            | Time-series metrics | Kubernetes, microservices |
| **Grafana Integration** | ✅ Excellent        | ✅ Excellent              |
| **Dashboard**           | ID: 2587 (ready)    | Custom or k6 Cloud        |

## Recommendation

**For k6 specifically**: Use **InfluxDB** because:

- ✅ Native k6 support (no extensions needed)
- ✅ Simple setup
- ✅ Ready-made dashboard (ID: 2587)
- ✅ Push-based (works well with k6)

**Use Prometheus if**:

- You already have Prometheus infrastructure
- You're using Kubernetes
- You need PromQL queries
- You want pull-based metrics

## Alternative: k6 Cloud

k6 Cloud provides built-in dashboards without setup:

```bash
# Requires k6 cloud account
k6 cloud tests/k6/load-test.js
```

**Benefits**:

- No setup required
- Built-in dashboards
- Prometheus-compatible metrics
- Historical data
- Team collaboration

**Sign up**: https://app.k6.io

## Summary

**For Local Development**:

1. Install InfluxDB and Grafana (or use Docker)
2. Run k6 with `--out influxdb` flag
3. Import k6 dashboard (ID: 2587) in Grafana
4. View real-time metrics

**For Production Monitoring**:

1. Use InfluxDB Cloud + Grafana Cloud
2. Configure k6 to send metrics to cloud
3. Set up dashboards for monitoring
4. Create alerts based on thresholds

**Quick Command**:

```bash
# Local setup
k6 run --out influxdb=http://localhost:8086/k6 tests/k6/load-test.js

# Then view in Grafana: http://localhost:3000
```
