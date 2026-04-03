#!/bin/bash
# AI News Hub - Quick Health Check
# Checks each service port and prints a status table

set -uo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

TIMEOUT=3

# Service definitions: "Service Name|Port"
SERVICES=(
    "Frontend        |3000"
    "API Gateway     |4000"
    "News API        |4001"
    "User API        |4002"
    "Admin API       |4003"
    "Content Fetcher |4007"
    "AI Analysis     |4008"
    "Health Monitor  |4009"
    "HTML Fetcher    |4010"
)

echo -e "\n${BOLD}┌──────────────────┬──────┬─────────┐${NC}"
echo -e "${BOLD}│ Service          │ Port │ Status  │${NC}"
echo -e "${BOLD}├──────────────────┼──────┼─────────┤${NC}"

PASS=0
FAIL=0

for entry in "${SERVICES[@]}"; do
    IFS='|' read -r name port <<< "$entry"
    name=$(echo "$name" | xargs)  # trim whitespace
    port=$(echo "$port" | xargs)

    if curl -sf --max-time "$TIMEOUT" "http://localhost:${port}/health" > /dev/null 2>&1; then
        status="${GREEN}  UP ${NC}"
        ((PASS++))
    elif curl -sf --max-time "$TIMEOUT" "http://localhost:${port}" > /dev/null 2>&1; then
        status="${GREEN}  UP ${NC}"
        ((PASS++))
    else
        status="${RED} DOWN${NC}"
        ((FAIL++))
    fi

    printf "│ %-16s │ %4s │${status}│\n" "$name" "$port"
done

echo -e "${BOLD}└──────────────────┴──────┴─────────┘${NC}"

TOTAL=$((PASS + FAIL))
echo -e "\n  ${GREEN}●${NC} $PASS/$TOTAL services up"

if [ "$FAIL" -gt 0 ]; then
    echo -e "  ${RED}●${NC} $FAIL/$TOTAL services down"
    exit 1
else
    echo ""
    exit 0
fi
