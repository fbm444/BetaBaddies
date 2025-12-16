#!/bin/bash

# Setup Prometheus + StatsD Exporter for k6 Visualization
# 
# This script sets up a local Prometheus + StatsD exporter stack
# to visualize k6 test results in Prometheus/Grafana.
#
# Usage:
#   ./setup-prometheus-local.sh
#   ./setup-prometheus-local.sh --start  # Start services after setup

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$SCRIPT_DIR/prometheus-config"
START_SERVICES=false

# Parse arguments
if [[ "$1" == "--start" ]]; then
  START_SERVICES=true
fi

echo -e "${BLUE}=============================================================================${NC}"
echo -e "${BLUE}Prometheus + StatsD Exporter Setup for k6${NC}"
echo -e "${BLUE}=============================================================================${NC}"
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
  echo -e "${RED}❌ Error: Homebrew not found${NC}"
  echo "Please install Homebrew first: https://brew.sh"
  exit 1
fi

# Install Prometheus
if ! command -v prometheus &> /dev/null; then
  echo -e "${YELLOW}📦 Installing Prometheus...${NC}"
  brew install prometheus
else
  echo -e "${GREEN}✅ Prometheus already installed${NC}"
fi

# Install StatsD Exporter
if ! command -v statsd_exporter &> /dev/null; then
  echo -e "${YELLOW}📦 Installing StatsD Exporter...${NC}"
  brew install statsd_exporter
else
  echo -e "${GREEN}✅ StatsD Exporter already installed${NC}"
fi

# Install Grafana (optional but recommended)
if ! command -v grafana &> /dev/null; then
  echo -e "${YELLOW}📦 Installing Grafana...${NC}"
  brew install grafana
else
  echo -e "${GREEN}✅ Grafana already installed${NC}"
fi

# Create config directory
mkdir -p "$CONFIG_DIR"

# Create Prometheus config
cat > "$CONFIG_DIR/prometheus.yml" << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # StatsD Exporter (receives k6 metrics)
  - job_name: 'statsd'
    static_configs:
      - targets: ['localhost:9102']
  
  # StatsD Exporter metrics endpoint
  - job_name: 'statsd_exporter'
    static_configs:
      - targets: ['localhost:9102']
EOF

echo -e "${GREEN}✅ Prometheus configuration created${NC}"
echo "   Location: $CONFIG_DIR/prometheus.yml"
echo ""

# Create StatsD exporter mapping (converts StatsD metrics to Prometheus format)
cat > "$CONFIG_DIR/statsd-mapping.yml" << 'EOF'
mappings:
  # k6 HTTP request metrics
  - match: "k6.http_reqs.*"
    name: "k6_http_requests_total"
    labels:
      stat: "$1"
  
  - match: "k6.http_req_duration.*"
    name: "k6_http_request_duration_seconds"
    labels:
      stat: "$1"
    timer_type: histogram
  
  - match: "k6.http_req_failed"
    name: "k6_http_request_failed_total"
    match_type: counter
  
  # k6 iteration metrics
  - match: "k6.iterations.*"
    name: "k6_iterations_total"
    labels:
      stat: "$1"
  
  # k6 VU metrics
  - match: "k6.vus.*"
    name: "k6_virtual_users"
    labels:
      stat: "$1"
  
  # k6 data transfer metrics
  - match: "k6.data.*"
    name: "k6_data_bytes"
    labels:
      stat: "$1"
  
  # Generic k6 metrics
  - match: "k6.*"
    name: "k6_metric"
    labels:
      metric: "$1"
EOF

echo -e "${GREEN}✅ StatsD mapping configuration created${NC}"
echo "   Location: $CONFIG_DIR/statsd-mapping.yml"
echo ""

# Create startup script
cat > "$CONFIG_DIR/start-services.sh" << 'EOF'
#!/bin/bash

# Start Prometheus + StatsD Exporter for k6

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Starting services..."
echo ""

# Start StatsD Exporter
echo "📊 Starting StatsD Exporter on port 9125 (UDP) and 9102 (HTTP)..."
statsd_exporter \
  --statsd.listen-udp=":9125" \
  --statsd.listen-tcp=":9125" \
  --web.listen-address=":9102" \
  --statsd.mapping-config="$SCRIPT_DIR/statsd-mapping.yml" \
  > "$SCRIPT_DIR/statsd-exporter.log" 2>&1 &
STATSD_PID=$!
echo "   PID: $STATSD_PID"
echo "   Logs: $SCRIPT_DIR/statsd-exporter.log"
echo ""

# Wait a moment for StatsD to start
sleep 2

# Start Prometheus
echo "📊 Starting Prometheus on port 9090..."
prometheus \
  --config.file="$SCRIPT_DIR/prometheus.yml" \
  --storage.tsdb.path="$SCRIPT_DIR/prometheus-data" \
  > "$SCRIPT_DIR/prometheus.log" 2>&1 &
PROMETHEUS_PID=$!
echo "   PID: $PROMETHEUS_PID"
echo "   Logs: $SCRIPT_DIR/prometheus.log"
echo ""

# Start Grafana (optional)
if command -v grafana-server &> /dev/null; then
  echo "📊 Starting Grafana on port 3000..."
  grafana-server \
    --homepath=/opt/homebrew/share/grafana \
    --config=/opt/homebrew/etc/grafana/grafana.ini \
    > "$SCRIPT_DIR/grafana.log" 2>&1 &
  GRAFANA_PID=$!
  echo "   PID: $GRAFANA_PID"
  echo "   Logs: $SCRIPT_DIR/grafana.log"
  echo ""
fi

# Save PIDs for cleanup
echo "$STATSD_PID" > "$SCRIPT_DIR/statsd.pid"
echo "$PROMETHEUS_PID" > "$SCRIPT_DIR/prometheus.pid"
if [ -n "$GRAFANA_PID" ]; then
  echo "$GRAFANA_PID" > "$SCRIPT_DIR/grafana.pid"
fi

echo "✅ Services started!"
echo ""
echo "📍 Access:"
echo "   - Prometheus: http://localhost:9090"
echo "   - StatsD Exporter: http://localhost:9102"
if [ -n "$GRAFANA_PID" ]; then
  echo "   - Grafana: http://localhost:3000 (admin/admin)"
fi
echo ""
echo "🛑 To stop services:"
echo "   ./stop-services.sh"
EOF

chmod +x "$CONFIG_DIR/start-services.sh"

# Create stop script
cat > "$CONFIG_DIR/stop-services.sh" << 'EOF'
#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🛑 Stopping services..."

if [ -f "$SCRIPT_DIR/statsd.pid" ]; then
  PID=$(cat "$SCRIPT_DIR/statsd.pid")
  kill $PID 2>/dev/null && echo "✅ Stopped StatsD Exporter (PID: $PID)" || echo "⚠️  StatsD Exporter not running"
  rm -f "$SCRIPT_DIR/statsd.pid"
fi

if [ -f "$SCRIPT_DIR/prometheus.pid" ]; then
  PID=$(cat "$SCRIPT_DIR/prometheus.pid")
  kill $PID 2>/dev/null && echo "✅ Stopped Prometheus (PID: $PID)" || echo "⚠️  Prometheus not running"
  rm -f "$SCRIPT_DIR/prometheus.pid"
fi

if [ -f "$SCRIPT_DIR/grafana.pid" ]; then
  PID=$(cat "$SCRIPT_DIR/grafana.pid")
  kill $PID 2>/dev/null && echo "✅ Stopped Grafana (PID: $PID)" || echo "⚠️  Grafana not running"
  rm -f "$SCRIPT_DIR/grafana.pid"
fi

echo "✅ All services stopped"
EOF

chmod +x "$CONFIG_DIR/stop-services.sh"

# Create example k6 test with StatsD output
cat > "$SCRIPT_DIR/smoke-test-prometheus.js" << 'EOF'
/**
 * Smoke Test with Prometheus/StatsD Output
 * 
 * Usage:
 *   k6 run --out statsd tests/k6/smoke-test-prometheus.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const errorRate = new Rate("errors");

const BASE_URL = __ENV.BACKEND_URL || "http://localhost:3001";
const API_BASE = `${BASE_URL}/api/v1`;

export const options = {
  vus: 1,
  duration: "1m",
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.1"],
    errors: ["rate<0.1"],
  },
};

export default function () {
  // Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    "health check status is 200": (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // Geocoding endpoint
  const geoRes = http.get(`${API_BASE}/geocoding/geocode?query=New York, NY`);
  check(geoRes, {
    "geocoding status is 200": (r) => r.status === 200,
    "geocoding has results": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && body.length > 0;
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);

  sleep(1);
}
EOF

echo -e "${GREEN}✅ Example k6 test with StatsD output created${NC}"
echo "   Location: $SCRIPT_DIR/smoke-test-prometheus.js"
echo ""

# Create README
cat > "$CONFIG_DIR/README.md" << 'EOF'
# Prometheus Setup for k6

This directory contains the configuration for running k6 tests with Prometheus visualization.

## Quick Start

### 1. Start Services

```bash
./start-services.sh
```

This starts:
- **StatsD Exporter** on port 9125 (UDP) and 9102 (HTTP)
- **Prometheus** on port 9090
- **Grafana** on port 3000 (if installed)

### 2. Run k6 Test with StatsD Output

```bash
# From backend directory
k6 run --out statsd tests/k6/smoke-test-prometheus.js

# Or with custom backend URL
BACKEND_URL=https://your-api.com k6 run --out statsd tests/k6/smoke-test-prometheus.js
```

### 3. View Metrics

**Prometheus UI:**
- Open: http://localhost:9090
- Query examples:
  - `k6_http_requests_total`
  - `rate(k6_http_requests_total[1m])`
  - `histogram_quantile(0.95, rate(k6_http_request_duration_seconds_bucket[5m]))`

**Grafana:**
- Open: http://localhost:3000
- Login: admin/admin
- Add Prometheus data source: http://localhost:9090
- Create dashboard with k6 metrics

### 4. Stop Services

```bash
./stop-services.sh
```

## Configuration Files

- `prometheus.yml` - Prometheus scrape configuration
- `statsd-mapping.yml` - Maps StatsD metrics to Prometheus format
- `start-services.sh` - Start all services
- `stop-services.sh` - Stop all services

## Metrics Available

After running k6 tests, you'll see these metrics in Prometheus:

- `k6_http_requests_total` - Total HTTP requests
- `k6_http_request_duration_seconds` - Request duration histogram
- `k6_http_request_failed_total` - Failed requests
- `k6_iterations_total` - Completed iterations
- `k6_virtual_users` - Active virtual users
- `k6_data_bytes` - Data transferred

## Troubleshooting

**StatsD Exporter not receiving metrics:**
- Check logs: `cat statsd-exporter.log`
- Verify k6 is using `--out statsd` flag
- Check StatsD exporter is running: `curl http://localhost:9102/metrics`

**Prometheus not scraping:**
- Check logs: `cat prometheus.log`
- Verify Prometheus config: `promtool check config prometheus.yml`
- Check targets: http://localhost:9090/targets

**Grafana can't connect to Prometheus:**
- Verify Prometheus is running: `curl http://localhost:9090/-/healthy`
- Check data source URL: http://localhost:9090
EOF

echo -e "${GREEN}✅ Documentation created${NC}"
echo "   Location: $CONFIG_DIR/README.md"
echo ""

echo -e "${BLUE}=============================================================================${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${BLUE}=============================================================================${NC}"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Start services:"
echo "   cd $CONFIG_DIR && ./start-services.sh"
echo ""
echo "2. Run k6 test with StatsD output:"
echo "   k6 run --out statsd tests/k6/smoke-test-prometheus.js"
echo ""
echo "3. View metrics in Prometheus:"
echo "   http://localhost:9090"
echo ""
echo "4. (Optional) View in Grafana:"
echo "   http://localhost:3000 (admin/admin)"
echo ""
echo "📖 For more details, see: $CONFIG_DIR/README.md"
echo ""

if [ "$START_SERVICES" = true ]; then
  echo "🚀 Starting services now..."
  cd "$CONFIG_DIR" && ./start-services.sh
fi


