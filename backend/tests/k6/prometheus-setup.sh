#!/bin/bash

# Prometheus Setup Script for k6
# This script sets up Prometheus + Pushgateway for k6 metrics

set -e

echo "🚀 Setting up Prometheus for k6 metrics..."
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
  echo "❌ Homebrew not found. Please install Homebrew first."
  exit 1
fi

# Install Prometheus
if ! command -v prometheus &> /dev/null; then
  echo "📦 Installing Prometheus..."
  brew install prometheus
else
  echo "✅ Prometheus already installed"
fi

# Install Pushgateway
if ! command -v pushgateway &> /dev/null; then
  echo "📦 Installing Prometheus Pushgateway..."
  brew install prometheus-pushgateway
else
  echo "✅ Pushgateway already installed"
fi

# Create Prometheus config
CONFIG_DIR="$(pwd)/prometheus-config"
mkdir -p "$CONFIG_DIR"

cat > "$CONFIG_DIR/prometheus.yml" << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'pushgateway'
    static_configs:
      - targets: ['localhost:9091']
    honor_labels: true
EOF

echo "✅ Prometheus configuration created: $CONFIG_DIR/prometheus.yml"
echo ""
echo "📋 To start services:"
echo ""
echo "  # Terminal 1: Start Prometheus"
echo "  prometheus --config.file=$CONFIG_DIR/prometheus.yml"
echo ""
echo "  # Terminal 2: Start Pushgateway"
echo "  pushgateway"
echo ""
echo "  # Terminal 3: Run k6 (requires k6 extension or statsd)"
echo "  # Note: k6 doesn't natively push to Prometheus"
echo "  # Use k6 Cloud or statsd exporter instead"
echo ""
echo "🌐 Access:"
echo "  - Prometheus: http://localhost:9090"
echo "  - Pushgateway: http://localhost:9091"
echo "  - Grafana: http://localhost:3000"
echo ""
echo "⚠️  Note: k6 doesn't natively support Prometheus push."
echo "   Consider using InfluxDB or k6 Cloud for easier setup."


