#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# docker compose (v2 plugin) vs docker-compose (v1) — use whichever exists.
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo -e "${RED}Neither 'docker compose' nor 'docker-compose' found. Install Docker.${NC}"
  exit 1
fi

# DB credentials (must match docker-compose.yml)
DB_USER="control_tower"
DB_NAME="control_tower"

cleanup() {
  echo ""
  echo -e "${YELLOW}Shutting down...${NC}"
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  echo -e "${GREEN}App services stopped. (DB container left running — '${DC} down' to stop it.)${NC}"
}
trap cleanup EXIT INT TERM

# Check .env
if [ ! -f .env ]; then
  echo -e "${RED}.env file missing. Copy .env.example → .env (or run ./setup.sh) first.${NC}"
  exit 1
fi

# 1. Database (docker) — start if not already up, then wait until it accepts connections
echo -e "${YELLOW}[1/4] Database${NC}"
if $DC ps db 2>/dev/null | grep -q "Up\|running"; then
  echo -e "  ${GREEN}Already running${NC}"
else
  $DC up -d db
fi
echo -n "  Waiting for DB"
until $DC exec -T db pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
  echo -n "."
  sleep 1
done
echo -e " ${GREEN}ready${NC}"

# 2. Backend deps + migrations
echo -e "${YELLOW}[2/4] Backend migrations${NC}"
(cd backend && uv run alembic upgrade head 2>&1 | tail -1)

# 3. Frontend deps + @ledgr/ui build (shell consumes @ledgr/ui from its dist/, not source)
echo -e "${YELLOW}[3/4] Frontend setup${NC}"
if [ ! -d node_modules ] || [ ! -d apps/shell/node_modules ]; then
  echo "  Installing workspace deps (pnpm install)..."
  pnpm install
fi
if [ ! -d packages/ui/dist ]; then
  echo "  Building @ledgr/ui..."
  pnpm --filter @ledgr/ui build >/dev/null
fi

# 4. Start backend (:8000) + frontend shell (:5173, proxies /api → backend)
echo -e "${YELLOW}[4/4] Starting services${NC}"
(cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000) &
BACKEND_PID=$!

(cd apps/shell && PORT=5173 pnpm dev) &
FRONTEND_PID=$!

sleep 2
echo ""
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo -e "${GREEN}  Control Tower running${NC}"
echo -e "  Frontend  → ${GREEN}http://localhost:5173${NC}"
echo -e "  Backend   → ${GREEN}http://localhost:8000${NC}"
echo -e "  API docs  → ${GREEN}http://localhost:8000/docs${NC}"
echo -e "  DB        → ${GREEN}localhost:5434${NC} (postgres: ${DB_USER}/${DB_NAME})"
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo -e "  ${YELLOW}Ctrl+C to stop backend + frontend${NC}"
echo ""

wait
