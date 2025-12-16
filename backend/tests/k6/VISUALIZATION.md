# Visualizing k6 Test Results

This guide shows you all the ways to visualize k6 test results.

## Quick Comparison

| Method | Difficulty | Setup Time | Best For |
|--------|-----------|------------|----------|
| **Console Output** | ⭐ Easiest | 0 min | Quick checks |
| **JSON Output** | ⭐ Easy | 0 min | Custom analysis |
| **InfluxDB + Grafana** | ⭐⭐ Medium | 5 min | **Recommended** - Full dashboards |
| **k6 Cloud** | ⭐ Easiest | 2 min | Easiest setup, requires account |
| **Prometheus** | ⭐⭐⭐ Hard | 15 min | Existing Prometheus infrastructure |

---

## Option 1: Console Output (Built-in) ⭐ Easiest

**What you get:** Real-time metrics in your terminal

**How to use:**
```bash
k6 run tests/k6/smoke-test.js
```

**What you see:**
```
     data_received........: 45 kB  750 B/s
     data_sent............: 5.0 kB 83 B/s
     http_req_duration....: avg=150ms min=100ms med=140ms max=500ms
     http_req_failed......: 0.00%  ✓ 0%
     http_reqs............: 30     0.5/s
     iteration_duration...: avg=1.2s min=1.0s med=1.1s max=2.0s
     iterations...........: 30    0.5/s
     vus..................: 1      min=1 max=1
```

**Pros:**
- ✅ No setup required
- ✅ Immediate feedback
- ✅ Works everywhere

**Cons:**
- ❌ No historical data
- ❌ No charts/graphs
- ❌ Limited detail

---

## Option 2: JSON Output ⭐ Easy

**What you get:** Detailed JSON file with all metrics

**How to use:**
```bash
k6 run --out json=results.json tests/k6/smoke-test.js
```

**What you get:**
- `results.json` file with all metrics
- Can analyze with scripts or tools
- Can import into other systems

**View results:**
```bash
# Pretty print
cat results.json | jq '.'

# Extract specific metrics
cat results.json | jq '.metrics.http_req_duration.values'
```

**Pros:**
- ✅ Detailed data
- ✅ Can process programmatically
- ✅ No external dependencies

**Cons:**
- ❌ No visual charts
- ❌ Requires parsing/analysis

---

## Option 3: InfluxDB + Grafana ⭐⭐ Recommended

**What you get:** Beautiful dashboards with charts, graphs, and historical data

**How to use:**

### Step 1: Install InfluxDB and Grafana

```bash
# macOS
brew install influxdb grafana

# Start services
brew services start influxdb
brew services start grafana
```

### Step 2: Run k6 with InfluxDB output

```bash
# InfluxDB v1 (simpler)
k6 run --out influxdb=http://localhost:8086/k6 tests/k6/smoke-test.js

# InfluxDB v2 (if using v2)
k6 run \
  --out influxdb=http://localhost:8086/k6 \
  --out influxdb-org=myorg \
  --out influxdb-token=YOUR_TOKEN \
  --out influxdb-bucket=k6 \
  tests/k6/smoke-test.js
```

### Step 3: View in Grafana

1. **Open Grafana:** http://localhost:3000
2. **Login:** admin/admin (change password on first login)
3. **Add Data Source:**
   - Configuration → Data Sources → Add data source
   - Select "InfluxDB"
   - URL: `http://localhost:8086`
   - Database: `k6` (for v1) or select bucket (for v2)
   - Click "Save & Test"

4. **Import k6 Dashboard:**
   - Dashboards → Import
   - Dashboard ID: `2587`
   - Click "Load"
   - Select your InfluxDB data source
   - Click "Import"

**What you see:**
- 📊 Line charts for response times
- 📈 Request rate graphs
- 🚨 Error rate visualization
- 📉 Virtual users over time
- 📊 Data transfer metrics
- 📈 Historical comparisons

**Pros:**
- ✅ Beautiful dashboards
- ✅ Historical data
- ✅ Real-time updates
- ✅ Ready-made dashboard (ID: 2587)
- ✅ Free and open-source

**Cons:**
- ⚠️ Requires setup (5-10 minutes)
- ⚠️ Needs InfluxDB and Grafana running

**See also:** [HOW_IT_WORKS.md](./HOW_IT_WORKS.md) for detailed explanation

---

## Option 4: k6 Cloud ⭐ Easiest Setup

**What you get:** Cloud-hosted dashboards with zero local setup

**How to use:**

### Step 1: Sign up for k6 Cloud

1. Go to: https://app.k6.io
2. Sign up (free tier available)
3. Get your API token

### Step 2: Run k6 with cloud output

```bash
# Set your token
export K6_CLOUD_TOKEN=your-token-here

# Run test
k6 cloud tests/k6/smoke-test.js
```

**What you see:**
- 📊 Real-time dashboards in browser
- 📈 Performance metrics
- 📉 Error analysis
- 📊 Historical data
- 🔗 Shareable links

**Pros:**
- ✅ Zero local setup
- ✅ Beautiful UI
- ✅ Team collaboration
- ✅ Historical data
- ✅ Prometheus-compatible metrics

**Cons:**
- ⚠️ Requires account (free tier available)
- ⚠️ Data stored in cloud
- ⚠️ Internet connection required

---

## Option 5: Prometheus + Grafana ⭐⭐⭐ Advanced

**What you get:** Prometheus metrics with Grafana visualization

**Note:** k6 doesn't natively push to Prometheus. You need:
- StatsD Exporter (bridge)
- Prometheus (scraper)
- Grafana (visualization)

**Setup is complex** - see k6 documentation for details.

**When to use:**
- You already have Prometheus infrastructure
- You need PromQL queries
- You're using Kubernetes

**For most users:** Use InfluxDB instead (easier setup).

---

## Recommended Workflow

### For Quick Testing:
```bash
# Just use console output
k6 run tests/k6/smoke-test.js
```

### For Detailed Analysis:
```bash
# 1. Start InfluxDB and Grafana
brew services start influxdb
brew services start grafana

# 2. Run test with InfluxDB output
k6 run --out influxdb=http://localhost:8086/k6 tests/k6/smoke-test.js

# 3. View in Grafana
# Open http://localhost:3000
# Import dashboard ID: 2587
```

### For Team Sharing:
```bash
# Use k6 Cloud
k6 cloud tests/k6/smoke-test.js
# Share the link with your team
```

---

## Quick Start: InfluxDB + Grafana (Recommended)

**Complete setup in 3 steps:**

```bash
# 1. Install (one-time)
brew install influxdb grafana
brew services start influxdb
brew services start grafana

# 2. Run test
k6 run --out influxdb=http://localhost:8086/k6 tests/k6/smoke-test.js

# 3. View results
# Open http://localhost:3000
# Login: admin/admin
# Add InfluxDB data source: http://localhost:8086, database: k6
# Import dashboard: ID 2587
```

**That's it!** You'll have beautiful dashboards with all your metrics.

---

## Troubleshooting

### InfluxDB Connection Issues

```bash
# Check if InfluxDB is running
curl http://localhost:8086/ping

# Should return: {"version":"..."}

# Check InfluxDB logs
brew services list
tail -f ~/Library/Logs/Homebrew/influxdb.log
```

### Grafana Can't Connect to InfluxDB

1. Verify InfluxDB is running: `curl http://localhost:8086/ping`
2. Check data source URL: `http://localhost:8086`
3. Verify database name: `k6` (for v1)
4. Check Grafana logs: `tail -f ~/Library/Logs/Homebrew/grafana.log`

### No Data in Dashboard

1. Verify k6 test ran with `--out influxdb` flag
2. Check InfluxDB has data:
   ```bash
   influx -execute "SHOW DATABASES"
   influx -execute "USE k6; SHOW MEASUREMENTS"
   ```
3. Verify Grafana data source is connected
4. Check time range in Grafana (top right corner)

---

## Summary

**For most users:** Use **InfluxDB + Grafana** - it's the best balance of features and ease of setup.

**For quick checks:** Use **console output** - no setup needed.

**For teams:** Use **k6 Cloud** - easiest collaboration.

**For existing Prometheus:** Use **Prometheus + StatsD Exporter** - more complex but integrates with existing infrastructure.


