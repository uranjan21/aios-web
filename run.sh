#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cleanup() {
  echo ""
  echo -e "${YELLOW}Shutting down...${NC}"
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
  echo -e "${GREEN}All services stopped.${NC}"
}
trap cleanup EXIT INT TERM

# Check .env
if [ ! -f .env ]; then
  echo -e "${RED}.env file missing. Run ./setup.sh first.${NC}"
  exit 1
fi

# 1. Start DB (docker) — skip if already running
echo -e "${YELLOW}[1/3] Database${NC}"
if docker-compose ps db 2>/dev/null | grep -q "running"; then
  echo -e "  ${GREEN}Already running${NC}"
else
  docker-compose up -d db
  echo -n "  Waiting for DB"
  until docker-compose exec -T db pg_isready -U aios -d aios_web >/dev/null 2>&1; do
    echo -n "."
    sleep 1
  done
  echo -e " ${GREEN}ready${NC}"
fi

# 2. Run pending migrations
echo -e "${YELLOW}[2/3] Migrations${NC}"
(cd backend && uv run alembic upgrade head 2>&1 | tail -1)

# 3. Start backend
echo -e "${YELLOW}[3/3] Starting services${NC}"
(cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000) &
BACKEND_PID=$!

# 4. Start frontend
(cd frontend && pnpm dev --port 5173) &
FRONTEND_PID=$!

sleep 2
echo ""
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo -e "${GREEN}  AIOS Web running${NC}"
echo -e "  Frontend  → ${GREEN}http://localhost:5173${NC}"
echo -e "  Backend   → ${GREEN}http://localhost:8000${NC}"
echo -e "  API docs  → ${GREEN}http://localhost:8000/docs${NC}"
echo -e "  DB        → ${GREEN}localhost:5434${NC}"
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo -e "  ${YELLOW}Ctrl+C to stop all${NC}"
echo ""

wait
