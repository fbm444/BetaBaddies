#!/bin/bash

# Run All k6 Tests
# 
# This script runs all k6 load tests in sequence.
# 
# Usage:
#   ./run-all-tests.sh
#   BACKEND_URL=https://your-api.com ./run-all-tests.sh
#   ./run-all-tests.sh --skip-soak  # Skip long-running soak test
#
# Options:
#   --skip-soak    Skip the soak test (can take hours)
#   --skip-stress  Skip the stress test (can take a while)
#   --smoke-only   Run only the smoke test
#   --help         Show this help message

# Don't use set -e - we want to continue even if a test fails
# set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="$SCRIPT_DIR/results"
SKIP_SOAK=false
SKIP_STRESS=false
SMOKE_ONLY=false

# Create results directory if it doesn't exist
mkdir -p "$RESULTS_DIR"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-soak)
      SKIP_SOAK=true
      shift
      ;;
    --skip-stress)
      SKIP_STRESS=true
      shift
      ;;
    --smoke-only)
      SMOKE_ONLY=true
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --skip-soak     Skip the soak test (can take hours)"
      echo "  --skip-stress   Skip the stress test (can take a while)"
      echo "  --smoke-only    Run only the smoke test"
      echo "  --help          Show this help message"
      echo ""
      echo "Environment Variables:"
      echo "  BACKEND_URL     Backend API URL (default: http://localhost:3001)"
      echo ""
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
  echo -e "${RED}❌ Error: k6 is not installed${NC}"
  echo "Install with: brew install k6"
  exit 1
fi

echo -e "${BLUE}=============================================================================${NC}"
echo -e "${BLUE}k6 Test Suite Runner${NC}"
echo -e "${BLUE}=============================================================================${NC}"
echo ""
echo -e "${GREEN}Backend URL:${NC} $BACKEND_URL"
echo -e "${GREEN}Test Directory:${NC} $SCRIPT_DIR"
echo ""

# Track results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
FAILED_TEST_NAMES=()

# Function to run a test
run_test() {
  local test_name=$1
  local test_file=$2
  local test_path="$SCRIPT_DIR/$test_file"
  
  if [ ! -f "$test_path" ]; then
    echo -e "${YELLOW}⚠️  Test file not found: $test_file${NC}"
    return 1
  fi
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  # Create sanitized filename for JSON output
  local test_name_sanitized=$(echo "$test_name" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
  local timestamp=$(date +%Y%m%d_%H%M%S)
  local json_output="$RESULTS_DIR/${test_name_sanitized}-${timestamp}.json"
  
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Running: $test_name${NC}"
  echo -e "${BLUE}File: $test_file${NC}"
  echo -e "${BLUE}JSON Output: $json_output${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  
  # Run the test with BACKEND_URL environment variable and JSON output
  # Capture exit code (k6 returns non-zero on threshold failures, but we still want to continue)
  BACKEND_URL="$BACKEND_URL" k6 run --out json="$json_output" "$test_path"
  K6_EXIT_CODE=$?
  
  # k6 exit codes:
  # 0 = success
  # 99 = threshold failure (test ran but thresholds were crossed)
  # other = actual error
  
  if [ $K6_EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ PASSED: $test_name${NC}"
    echo -e "${BLUE}   Results saved to: $json_output${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo ""
    return 0
  elif [ $K6_EXIT_CODE -eq 99 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  THRESHOLD FAILURE: $test_name${NC}"
    echo -e "${BLUE}   Test completed but thresholds were crossed${NC}"
    echo -e "${BLUE}   Results saved to: $json_output${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    FAILED_TEST_NAMES+=("$test_name")
    echo ""
    return 1
  else
    echo ""
    echo -e "${RED}❌ FAILED: $test_name${NC}"
    echo -e "${BLUE}   Exit code: $K6_EXIT_CODE${NC}"
    echo -e "${BLUE}   Results saved to: $json_output${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    FAILED_TEST_NAMES+=("$test_name")
    echo ""
    return 1
  fi
}

# Start timer
START_TIME=$(date +%s)

# Run tests
if [ "$SMOKE_ONLY" = true ]; then
  # Only run smoke test
  run_test "Smoke Test" "smoke-test.js"
else
  # Run all tests in order
  
  # 1. Smoke Test (quick health check)
  run_test "Smoke Test" "smoke-test.js"
  
  # 2. API Test (comprehensive endpoint testing)
  run_test "API Test" "api-test.js"
  
  # 3. Load Test (normal load simulation)
  run_test "Load Test" "load-test.js"
  
  # 4. Stress Test (find breaking point)
  if [ "$SKIP_STRESS" = false ]; then
    run_test "Stress Test" "stress-test.js"
  else
    echo -e "${YELLOW}⏭️  Skipping Stress Test (--skip-stress)${NC}"
    echo ""
  fi
  
  # 5. Spike Test (sudden traffic increase)
  run_test "Spike Test" "spike-test.js"
  
  # 6. Soak Test (long-duration test)
  if [ "$SKIP_SOAK" = false ]; then
    run_test "Soak Test" "soak-test.js"
  else
    echo -e "${YELLOW}⏭️  Skipping Soak Test (--skip-soak)${NC}"
    echo ""
  fi
fi

# End timer
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

# Create summary JSON
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SUMMARY_JSON="$RESULTS_DIR/test-suite-summary-${TIMESTAMP}.json"

# Print summary
echo -e "${BLUE}=============================================================================${NC}"
echo -e "${BLUE}Test Suite Summary${NC}"
echo -e "${BLUE}=============================================================================${NC}"
echo ""
echo -e "${GREEN}Total Tests:${NC} $TOTAL_TESTS"
echo -e "${GREEN}Passed:${NC} $PASSED_TESTS"
echo -e "${RED}Failed:${NC} $FAILED_TESTS"
echo -e "${BLUE}Duration:${NC} ${MINUTES}m ${SECONDS}s"
echo ""

if [ $FAILED_TESTS -gt 0 ]; then
  echo -e "${RED}Failed Tests:${NC}"
  for test_name in "${FAILED_TEST_NAMES[@]}"; do
    echo -e "  ${RED}❌${NC} $test_name"
  done
  echo ""
fi

# Create summary JSON file
# Build failed_tests array
FAILED_TESTS_JSON="["
if [ ${#FAILED_TEST_NAMES[@]} -gt 0 ]; then
  for i in "${!FAILED_TEST_NAMES[@]}"; do
    if [ $i -gt 0 ]; then
      FAILED_TESTS_JSON+=","
    fi
    FAILED_TESTS_JSON+="\"${FAILED_TEST_NAMES[$i]}\""
  done
fi
FAILED_TESTS_JSON+="]"

cat > "$SUMMARY_JSON" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "backend_url": "$BACKEND_URL",
  "summary": {
    "total_tests": $TOTAL_TESTS,
    "passed": $PASSED_TESTS,
    "failed": $FAILED_TESTS,
    "duration_seconds": $DURATION,
    "duration_formatted": "${MINUTES}m ${SECONDS}s"
  },
  "failed_tests": $FAILED_TESTS_JSON,
  "results_directory": "$RESULTS_DIR"
}
EOF

echo -e "${BLUE}📊 Summary JSON saved to: $SUMMARY_JSON${NC}"
echo ""

# Exit with appropriate code
if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
fi

