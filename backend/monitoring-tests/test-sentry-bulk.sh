#!/bin/bash

# Bulk Test Sentry Error Handling
# Usage: ./test-sentry-bulk.sh [production|local] [count]
# Example: ./test-sentry-bulk.sh production 500

ENV=${1:-local}
COUNT=${2:-500}

if [ "$ENV" = "production" ]; then
  BASE_URL="https://betabaddies-production.up.railway.app"
  echo "🧪 Testing Sentry error handling in PRODUCTION"
else
  BASE_URL="http://localhost:3001"
  echo "🧪 Testing Sentry error handling LOCALLY"
fi

echo "📍 Base URL: $BASE_URL"
echo "📊 Number of requests: $COUNT"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting bulk test...${NC}"
echo ""

SUCCESS=0
FAILED=0
START_TIME=$(date +%s)

for i in $(seq 1 $COUNT); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/debug-sentry")
  
  if [ "$HTTP_CODE" = "500" ]; then
    SUCCESS=$((SUCCESS + 1))
  else
    FAILED=$((FAILED + 1))
  fi
  
  # Show progress every 50 requests
  if [ $((i % 50)) -eq 0 ]; then
    echo "Progress: $i/$COUNT (Success: $SUCCESS, Failed: $FAILED)"
  fi
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "=========================================="
echo "Test Results"
echo "=========================================="
echo -e "${GREEN}✅ Successful (500): $SUCCESS${NC}"
echo -e "${YELLOW}❌ Failed: $FAILED${NC}"
echo "⏱️  Total time: ${DURATION}s"
echo "📊 Average: $((DURATION * 1000 / COUNT))ms per request"
echo ""
echo "📊 Next Steps:"
echo "1. Check your Sentry dashboard: https://sentry.io"
echo "2. Look for the error 'My first Sentry error!'"
echo "3. Check the issue count - should show ~$COUNT occurrences"
echo "4. Verify performance metrics in Sentry"
echo ""
echo "💡 Note: Sentry may aggregate/rate-limit errors, so you might see fewer issues than requests"

