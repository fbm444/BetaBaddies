#!/bin/bash

# Script to login and test Sentry error endpoint
# Usage: ./test-sentry-with-auth.sh

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BACKEND_URL:-https://betabaddies-production.up.railway.app}"
EMAIL="test@gmail.com"
PASSWORD="Test123!"

echo -e "${YELLOW}🔐 Testing Sentry with Authentication${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Login
echo -e "${YELLOW}Step 1: Logging in as ${EMAIL}...${NC}"
LOGIN_RESPONSE=$(curl -s -c /tmp/cookies.txt -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" \
  "${BASE_URL}/api/v1/users/login")

# Extract HTTP status code (last line)
HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n 1)
# Extract response body (all but last line)
RESPONSE_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo -e "${RED}❌ Login failed!${NC}"
  echo "HTTP Status: $HTTP_CODE"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

echo -e "${GREEN}✅ Login successful!${NC}"
echo "Response: $RESPONSE_BODY"
echo ""

# Step 2: Extract session cookie
SESSION_COOKIE=$(grep "connect.sid" /tmp/cookies.txt | awk '{print $NF}')
if [ -z "$SESSION_COOKIE" ]; then
  echo -e "${RED}❌ Failed to extract session cookie${NC}"
  exit 1
fi

echo -e "${YELLOW}Step 2: Extracted session cookie${NC}"
echo "Cookie: ${SESSION_COOKIE:0:50}..."
echo ""

# Step 3: Call Sentry test endpoint
echo -e "${YELLOW}Step 3: Calling Sentry test endpoint...${NC}"
SENTRY_RESPONSE=$(curl -s -b /tmp/cookies.txt -w "\n%{http_code}" \
  -X GET \
  -H "Content-Type: application/json" \
  "${BASE_URL}/api/v1/test/sentry-error")

# Extract HTTP status code (last line)
SENTRY_HTTP_CODE=$(echo "$SENTRY_RESPONSE" | tail -n 1)
# Extract response body (all but last line)
SENTRY_RESPONSE_BODY=$(echo "$SENTRY_RESPONSE" | sed '$d')

echo "HTTP Status: $SENTRY_HTTP_CODE"
echo "Response: $SENTRY_RESPONSE_BODY"
echo ""

if [ "$SENTRY_HTTP_CODE" == "500" ]; then
  echo -e "${GREEN}✅ Successfully triggered Sentry error!${NC}"
  echo ""
  echo -e "${YELLOW}📊 Next Steps:${NC}"
  echo "1. Check your Sentry dashboard: https://sentry.io"
  echo "2. Look for the error: 'Test 500 Error: This is a deliberate error for testing Sentry integration'"
  echo "3. Verify the error includes user context and tags"
else
  echo -e "${RED}❌ Unexpected response code: $SENTRY_HTTP_CODE${NC}"
  exit 1
fi

# Cleanup
rm -f /tmp/cookies.txt

echo ""
echo -e "${GREEN}✨ Test completed!${NC}"

