#!/bin/bash

# Test Sentry Error Handling
# Usage: ./test-sentry-errors.sh [production|local]
# Example: ./test-sentry-errors.sh production

ENV=${1:-local}

if [ "$ENV" = "production" ]; then
  BASE_URL="https://betabaddies-production.up.railway.app"
  echo "🧪 Testing Sentry error handling in PRODUCTION"
else
  BASE_URL="http://localhost:3001"
  echo "🧪 Testing Sentry error handling LOCALLY"
fi

echo "📍 Base URL: $BASE_URL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Test 1: Debug Endpoint (Intentional Error)"
echo "=========================================="
echo -e "${YELLOW}Calling: $BASE_URL/debug-sentry${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/debug-sentry")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "500" ]; then
  echo -e "${GREEN}✅ Test 1 PASSED: Got 500 error as expected${NC}"
  echo "Response: $BODY"
else
  echo -e "${RED}❌ Test 1 FAILED: Expected 500, got $HTTP_CODE${NC}"
fi
echo ""

echo "=========================================="
echo "Test 2: 404 Not Found Error"
echo "=========================================="
echo -e "${YELLOW}Calling: $BASE_URL/api/v1/nonexistent-endpoint${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/nonexistent-endpoint")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "404" ]; then
  echo -e "${GREEN}✅ Test 2 PASSED: Got 404 as expected${NC}"
else
  echo -e "${RED}❌ Test 2 FAILED: Expected 404, got $HTTP_CODE${NC}"
fi
echo ""

echo "=========================================="
echo "Test 3: Invalid UUID Format"
echo "=========================================="
echo -e "${YELLOW}Calling: $BASE_URL/api/v1/users/invalid-uuid-format${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/users/invalid-uuid-format")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "404" ]; then
  echo -e "${GREEN}✅ Test 3 PASSED: Got $HTTP_CODE (invalid UUID handled)${NC}"
else
  echo -e "${RED}❌ Test 3 FAILED: Expected 400/404, got $HTTP_CODE${NC}"
fi
echo ""

echo "=========================================="
echo "Test 4: Invalid JSON in POST Request"
echo "=========================================="
echo -e "${YELLOW}Calling: $BASE_URL/api/v1/users/login with invalid JSON${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/users/login" \
  -H "Content-Type: application/json" \
  -d '{"invalid": json}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "500" ]; then
  echo -e "${GREEN}✅ Test 4 PASSED: Got $HTTP_CODE (invalid JSON handled)${NC}"
else
  echo -e "${RED}❌ Test 4 FAILED: Expected 400/500, got $HTTP_CODE${NC}"
fi
echo ""

echo "=========================================="
echo "Test 5: Missing Required Fields"
echo "=========================================="
echo -e "${YELLOW}Calling: $BASE_URL/api/v1/users/login with empty body${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/users/login" \
  -H "Content-Type: application/json" \
  -d '{}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "422" ]; then
  echo -e "${GREEN}✅ Test 5 PASSED: Got $HTTP_CODE (validation error handled)${NC}"
else
  echo -e "${RED}❌ Test 5 FAILED: Expected 400/422, got $HTTP_CODE${NC}"
fi
echo ""

echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "✅ All tests completed!"
echo ""
echo "📊 Next Steps:"
echo "1. Check your Sentry dashboard: https://sentry.io"
echo "2. Look for new issues in the last 5 minutes"
echo "3. Verify errors have:"
echo "   - Correct stack traces"
echo "   - Request details (URL, method, headers)"
echo "   - Environment tag (production/development)"
echo "   - Breadcrumbs (logs leading to error)"
echo ""
echo "💡 Tip: Errors may take 1-2 minutes to appear in Sentry"


