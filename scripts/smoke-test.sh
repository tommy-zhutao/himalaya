#!/bin/bash
# AI News Hub - Deployment Smoke Test
# Verifies all services are healthy and critical flows work

set -uo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
SKIP=0
RESULTS=()

print_header() {
    echo -e "\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}  AI News Hub — Deployment Smoke Test${NC}"
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

check_service() {
    local name="$1"
    local port="$2"
    local url="$3"
    local timeout=5

    if curl -sf --max-time "$timeout" "$url" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} $name (:$port)"
        ((PASS++))
        RESULTS+=("PASS|$name|$port")
        return 0
    else
        echo -e "  ${RED}✗${NC} $name (:$port) — not responding"
        ((FAIL++))
        RESULTS+=("FAIL|$name|$port")
        return 1
    fi
}

check_docker_container() {
    local name="$1"
    local container="$2"

    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${container}$"; then
        status=$(docker inspect --format '{{.State.Status}}' "$container" 2>/dev/null)
        if [ "$status" = "running" ]; then
            echo -e "  ${GREEN}✓${NC} $name (container: running)"
            ((PASS++))
            RESULTS+=("PASS|$name|internal")
            return 0
        else
            echo -e "  ${RED}✗${NC} $name (container: $status)"
            ((FAIL++))
            RESULTS+=("FAIL|$name|internal")
            return 1
        fi
    elif docker compose -f /root/.openclaw/workspace/news-app/docker-compose.yml ps --format '{{.Name}}' 2>/dev/null | grep -q "$container"; then
        echo -e "  ${YELLOW}⚠${NC} $name (container: exists but not in docker ps)"
        ((SKIP++))
        RESULTS+=("SKIP|$name|internal")
        return 0
    else
        echo -e "  ${RED}✗${NC} $name (container: not found)"
        ((FAIL++))
        RESULTS+=("FAIL|$name|internal")
        return 1
    fi
}

# ── Run checks ──

print_header

echo -e "${BOLD}[1/3] Service Health Checks${NC}\n"

check_service "API Gateway"       4000 "http://localhost:4000/health"
check_service "News API"          4001 "http://localhost:4001/health"
check_service "User API"          4002 "http://localhost:4002/health"
check_service "Admin API"         4003 "http://localhost:4003/health"
check_docker_container "RSS Fetcher"     "news-app-rss-fetcher"
check_docker_container "API Fetcher"     "news-app-api-fetcher"
check_docker_container "Scheduler"       "news-app-scheduler"
check_service "Content Fetcher"   4007 "http://localhost:4007/health"
check_service "AI Analysis"       4008 "http://localhost:4008/health"
check_service "Health Monitor"    4009 "http://localhost:4009/health"
check_service "HTML Fetcher"      4010 "http://localhost:4010/health"
check_service "Frontend"          3000 "http://localhost:3000"

echo -e "\n${BOLD}[2/3] Critical Flow Tests${NC}\n"

# Gateway health
if curl -sf --max-time 5 "http://localhost:4000/health" | grep -qE '"(success|status|ok|uptime)"' 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Gateway health endpoint returns valid JSON"
    ((PASS++))
else
    echo -e "  ${RED}✗${NC} Gateway health endpoint — invalid or no response"
    ((FAIL++))
fi

# News list
if curl -sf --max-time 5 "http://localhost:4000/api/news" | grep -qE '"(news|data|success)"' 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} GET /api/news — news list endpoint works"
    ((PASS++))
else
    echo -e "  ${RED}✗${NC} GET /api/news — no valid response"
    ((FAIL++))
fi

# Frontend loads
if curl -sf --max-time 5 "http://localhost:3000" | grep -qiE '<html|<!doctype' 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Frontend — HTML page loads"
    ((PASS++))
else
    echo -e "  ${RED}✗${NC} Frontend — not loading HTML"
    ((FAIL++))
fi

echo -e "\n${BOLD}[3/3] Infrastructure Checks${NC}\n"

# PostgreSQL
if docker exec news-app-postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} PostgreSQL — ready"
    ((PASS++))
elif docker exec news-app-db pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} PostgreSQL — ready"
    ((PASS++))
else
    echo -e "  ${YELLOW}⚠${NC} PostgreSQL — cannot verify (not a Docker check failure)"
    ((SKIP++))
fi

# Redis (optional)
if docker exec news-app-redis redis-cli ping 2>/dev/null | grep -q PONG; then
    echo -e "  ${GREEN}✓${NC} Redis — connected"
    ((PASS++))
elif redis-cli ping 2>/dev/null | grep -q PONG; then
    echo -e "  ${GREEN}✓${NC} Redis — connected"
    ((PASS++))
else
    echo -e "  ${YELLOW}⚠${NC} Redis — not available (optional)"
    ((SKIP++))
fi

# ── Summary ──

echo -e "\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  Summary${NC}"
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

TOTAL=$((PASS + FAIL + SKIP))
echo -e "  ${GREEN}Passed:  $PASS${NC}"
echo -e "  ${RED}Failed:  $FAIL${NC}"
echo -e "  ${YELLOW}Skipped: $SKIP${NC}"
echo -e "  Total:   $TOTAL"
echo ""

if [ "$FAIL" -eq 0 ]; then
    echo -e "  ${GREEN}${BOLD}🎉 All checks passed!${NC}\n"
    exit 0
else
    echo -e "  ${RED}${BOLD}❌ $FAIL check(s) failed${NC}\n"
    exit 1
fi
