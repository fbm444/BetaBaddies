#!/bin/bash

# Create test user via API registration endpoint
# This is the easiest way to create a test user

API_URL=${API_URL:-"http://localhost:3001/api/v1"}
TEST_USER_EMAIL=${TEST_USER_EMAIL:-"loadtest@example.com"}
TEST_USER_PASSWORD=${TEST_USER_PASSWORD:-"LoadTest123!"}

echo "Creating test user via API..."
echo "Email: $TEST_USER_EMAIL"
echo "API: $API_URL"
echo ""

# Check if backend is running
if ! curl -s "$API_URL/../health" > /dev/null 2>&1; then
    echo "Error: Backend server is not running at $API_URL"
    echo "Please start the backend server first: cd backend && npm start"
    exit 1
fi

# Register user
echo "Registering user..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/users/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_USER_EMAIL\", \"password\": \"$TEST_USER_PASSWORD\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "201" ]; then
    echo "✓ Test user created successfully!"
    echo ""
    echo "You can now run load tests:"
    echo "  cd load-tests"
    echo "  TEST_USER_EMAIL=$TEST_USER_EMAIL TEST_USER_PASSWORD=$TEST_USER_PASSWORD k6 run test-login.js"
elif [ "$HTTP_CODE" = "409" ]; then
    echo "✓ Test user already exists"
    echo ""
    echo "You can run load tests:"
    echo "  cd load-tests"
    echo "  TEST_USER_EMAIL=$TEST_USER_EMAIL TEST_USER_PASSWORD=$TEST_USER_PASSWORD k6 run test-login.js"
else
    echo "✗ Failed to create user (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
    exit 1
fi

