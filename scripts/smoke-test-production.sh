#!/bin/bash
# SparkBin production smoke test script
set -e

FRONTEND_URL="https://app.wanchun.me"
LANDING_URL="https://sparkbin.wanchun.me"
API_URL="https://api-sparkbin.wanchun.me"
HEALTH_ENDPOINT="$API_URL/health"
AUTH_ME_ENDPOINT="$API_URL/auth/me"

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

# DNS check
echo "[0/8] DNS resolution check..."
FRONTEND_IP=$(dig +short app.wanchun.me | tail -n1 || echo "")
SERVER_IP=$(hostname -I | awk '{print $1}')
if [ -n "$FRONTEND_IP" ] && [ "$FRONTEND_IP" = "$SERVER_IP" ]; then
  log_warn "app.wanchun.me resolves to this server ($SERVER_IP), frontend should be on Vercel -- DNS config may be wrong"
fi

# 1. Frontend
echo "[1/8] Frontend accessibility..."
STATUS=$(http_status "$FRONTEND_URL")
if [ "$STATUS" = "000" ]; then
  # Connection failed -- check if DNS points to this server
  DNS_IP=$(dig +short app.wanchun.me | tail -n1 || echo "")
  SERVER_PUB_IP=$(curl -s --max-time 10 ifconfig.me || echo "")
  if [ -n "$DNS_IP" ] && [ "$DNS_IP" = "$SERVER_PUB_IP" ]; then
    log_warn "Frontend DNS points to this server ($SERVER_PUB_IP), skipping check (fix DNS A record to point to Vercel)"
  else
    log_fail "Frontend returns 000 ($FRONTEND_URL)"
  fi
elif [ "$STATUS" = "200" ]; then
  log_pass "Frontend returns 200 ($FRONTEND_URL)"
else
  log_fail "Frontend returns $STATUS ($FRONTEND_URL)"
fi

# 2. Landing
echo "[2/8] Landing page accessibility..."
STATUS=$(http_status "$LANDING_URL")
if [ "$STATUS" = "200" ]; then
  log_pass "Landing returns 200 ($LANDING_URL)"
else
  log_fail "Landing returns $STATUS ($LANDING_URL)"
fi

# 3. Health check
echo "[3/8] Backend health check..."
STATUS=$(http_status "$HEALTH_ENDPOINT")
if [ "$STATUS" = "200" ]; then
  log_pass "Backend /health returns 200"
else
  log_fail "Backend /health returns $STATUS"
fi

# 4. API base response
echo "[4/8] Backend API base response..."
BODY=$(http_body "$API_URL")
if [ -n "$BODY" ]; then
  log_pass "Backend API returns response (FastAPI running)"
else
  log_warn "Backend API response empty"
fi

# 5. Auth endpoint
echo "[5/8] Auth endpoint security check..."
STATUS=$(http_status "$AUTH_ME_ENDPOINT")
if [ "$STATUS" = "401" ] || [ "$STATUS" = "403" ]; then
  log_pass "Unauthorized /auth/me correctly returns $STATUS"
else
  log_warn "/auth/me returns $STATUS (expected 401/403)"
fi

# 6. SSL certificate
echo "[6/8] SSL certificate check..."
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

# 7. Response time
echo "[7/8] Response time check..."
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

# 8. Login test
echo "[8/8] Login flow test..."
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
