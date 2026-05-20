#!/bin/bash
# SparkBin production smoke test script
# Usage: bash scripts/smoke-test-production.sh
set -e

FRONTEND_URL="https://sparkbin.wanchun.me"
API_URL="https://api-sparkbin.wanchun.me"
HEALTH_ENDPOINT="$API_URL/health"
AUTH_ME_ENDPOINT="$API_URL/auth/me"

# Test credentials for login flow validation (create a dedicated test account)
TEST_USERNAME="${TEST_USERNAME:-}"
TEST_PASSWORD="${TEST_PASSWORD:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

log_pass() {
  echo -e "${GREEN}[PASS]${NC} $1"
  PASS=$((PASS + 1))
}

log_fail() {
  echo -e "${RED}[FAIL]${NC} $1"
  FAIL=$((FAIL + 1))
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
  WARN=$((WARN + 1))
}

http_status() {
  curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$1" || true
}

http_body() {
  curl -s --max-time 15 "$1" || echo ""
}

echo "========================================"
echo "SparkBin Production Smoke Test"
echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"
echo ""

# 1. Frontend accessibility
echo "[1/7] Frontend accessibility..."
STATUS=$(http_status "$FRONTEND_URL")
if [ "$STATUS" = "200" ]; then
  log_pass "Frontend returns 200 ($FRONTEND_URL)"
else
  log_fail "Frontend returns $STATUS ($FRONTEND_URL)"
fi

# 2. Backend health check
echo "[2/7] Backend health check..."
STATUS=$(http_status "$HEALTH_ENDPOINT")
if [ "$STATUS" = "200" ]; then
  log_pass "Backend /health returns 200"
else
  log_fail "Backend /health returns $STATUS"
fi

# 3. Backend API base response
echo "[3/7] Backend API base response..."
BODY=$(http_body "$API_URL")
if [ -n "$BODY" ]; then
  log_pass "Backend API returns response (FastAPI running)"
else
  log_warn "Backend API response empty"
fi

# 4. Auth endpoint (unauthorized should return 401/403)
echo "[4/7] Auth endpoint security check..."
STATUS=$(http_status "$AUTH_ME_ENDPOINT")
if [ "$STATUS" = "401" ] || [ "$STATUS" = "403" ]; then
  log_pass "Unauthorized /auth/me correctly returns $STATUS"
else
  log_warn "/auth/me returns $STATUS (expected 401/403)"
fi

# 5. SSL certificate validity
echo "[5/7] SSL certificate check..."
EXPIRY=$(echo | openssl s_client -servername api-sparkbin.wanchun.me -connect api-sparkbin.wanchun.me:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep notAfter | cut -d= -f2)
if [ -n "$EXPIRY" ]; then
  EXPIRY_TS=$(date -d "$EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$EXPIRY" +%s 2>/dev/null)
  NOW_TS=$(date +%s)
  DAYS_LEFT=$(( (EXPIRY_TS - NOW_TS) / 86400 ))
  if [ "$DAYS_LEFT" -gt 30 ]; then
    log_pass "SSL certificate valid, $DAYS_LEFT days left"
  elif [ "$DAYS_LEFT" -gt 7 ]; then
    log_warn "SSL certificate expiring soon, $DAYS_LEFT days left"
  else
    log_fail "SSL certificate expiring soon, $DAYS_LEFT days left"
  fi
else
  log_warn "Cannot get SSL certificate info"
fi

# 6. Response time
echo "[6/7] Response time check..."
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "$HEALTH_ENDPOINT")
if [ -n "$RESPONSE_TIME" ]; then
  RT_MS=$(echo "$RESPONSE_TIME * 1000" | bc 2>/dev/null || echo "0")
  if [ "${RT_MS%.*}" -lt 500 ] 2>/dev/null; then
    log_pass "Backend response time ${RESPONSE_TIME}s"
  else
    log_warn "Backend response time ${RESPONSE_TIME}s (suggest < 0.5s)"
  fi
else
  log_warn "Cannot measure response time"
fi

# 7. Login flow test (requires test credentials)
echo "[7/7] Login flow test..."
if [ -n "$TEST_USERNAME" ] && [ -n "$TEST_PASSWORD" ]; then
  LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TEST_USERNAME\",\"password\":\"$TEST_PASSWORD\"}" \
    --max-time 15)
  if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
    log_pass "Login API returns token"
  else
    log_fail "Login API did not return token"
  fi
else
  log_warn "TEST_USERNAME/TEST_PASSWORD not set, skipping login test"
fi

echo ""
echo "========================================"
echo "Test Result Summary"
echo "========================================"
echo -e "Pass:  ${GREEN}$PASS${NC}"
echo -e "Fail:  ${RED}$FAIL${NC}"
echo -e "Warn:  ${YELLOW}$WARN${NC}"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}Smoke test FAILED, check production environment!${NC}"
  exit 1
elif [ "$WARN" -gt 0 ]; then
  echo -e "${YELLOW}Smoke test passed with warnings.${NC}"
  exit 0
else
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
fi
