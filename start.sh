#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

VENV_DIR="$PROJECT_DIR/Database_API/fastapi-env"

for cmd in npm npx python3 curl lsof; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo -e "${RED}Missing required command: $cmd${NC}"
    exit 1
  fi
done

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Decentralized Voting System Launcher  ${NC}"
echo -e "${CYAN}========================================${NC}"

cleanup() {
  echo -e "\n${YELLOW}Shutting down services...${NC}"
  if [[ -n "${EXPRESS_PID:-}" ]]; then kill "$EXPRESS_PID" 2>/dev/null || true; fi
  if [[ -n "${FASTAPI_PID:-}" ]]; then kill "$FASTAPI_PID" 2>/dev/null || true; fi
  if [[ -n "${HARDHAT_PID:-}" ]]; then kill "$HARDHAT_PID" 2>/dev/null || true; fi
  exit 0
}
trap cleanup SIGINT SIGTERM

echo -e "\n${YELLOW}[Step 0] Clearing occupied ports (8545, 8000, 8080)...${NC}"
for port in 8545 8000 8080; do
  pid="$(lsof -ti:"$port" 2>/dev/null || true)"
  if [[ -n "$pid" ]]; then
    kill "$pid" 2>/dev/null || true
    sleep 1
  fi
done

echo -e "\n${GREEN}[Step 1] Starting Hardhat node...${NC}"
export HARDHAT_DISABLE_TELEMETRY_PROMPT=true
npx hardhat node >/tmp/hardhat.log 2>&1 &
HARDHAT_PID=$!
for _ in $(seq 1 30); do
  if curl -s http://127.0.0.1:8545 -X POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' >/dev/null; then
    break
  fi
  sleep 1
done

echo -e "\n${GREEN}[Step 2] Compiling and deploying contract...${NC}"
npm run compile
npm run deploy

echo -e "\n${GREEN}[Step 3] Building React frontend (client)...${NC}"
npm --prefix client install --silent
npm --prefix client run build

echo -e "\n${GREEN}[Step 4] Starting FastAPI authentication service...${NC}"
# Load environment variables from .env file
if [[ -f "$PROJECT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$PROJECT_DIR/.env"
  set +a
fi
cd "$PROJECT_DIR/Database_API"
if [[ ! -d "$VENV_DIR" ]]; then
  python3 -m venv "$VENV_DIR"
fi
source "$VENV_DIR/bin/activate"
pip install -r requirements.txt --quiet
uvicorn main:app --host 127.0.0.1 --port 8000 >/tmp/fastapi.log 2>&1 &
FASTAPI_PID=$!
cd "$PROJECT_DIR"
for _ in $(seq 1 30); do
  if curl -sSf http://127.0.0.1:8000/healthz >/dev/null; then
    break
  fi
  if ! kill -0 "$FASTAPI_PID" 2>/dev/null; then
    echo -e "${RED}FastAPI failed to start. Check /tmp/fastapi.log${NC}"
    tail -n 80 /tmp/fastapi.log || true
    exit 1
  fi
  sleep 1
done
if ! curl -sSf http://127.0.0.1:8000/healthz >/dev/null; then
  echo -e "${RED}FastAPI is not healthy on :8000. Check /tmp/fastapi.log${NC}"
  tail -n 80 /tmp/fastapi.log || true
  exit 1
fi

echo -e "\n${GREEN}[Step 5] Starting Express gateway...${NC}"
NODE_ENV=production node index.js >/tmp/express.log 2>&1 &
EXPRESS_PID=$!
for _ in $(seq 1 20); do
  if curl -sSf http://127.0.0.1:8080/healthz >/dev/null; then
    break
  fi
  if ! kill -0 "$EXPRESS_PID" 2>/dev/null; then
    echo -e "${RED}Express failed to start. Check /tmp/express.log${NC}"
    tail -n 80 /tmp/express.log || true
    exit 1
  fi
  sleep 1
done
if ! curl -sSf http://127.0.0.1:8080/healthz >/dev/null; then
  echo -e "${RED}Express is not healthy on :8080. Check /tmp/express.log${NC}"
  tail -n 80 /tmp/express.log || true
  exit 1
fi

echo -e "\n${CYAN}========================================${NC}"
echo -e "${GREEN}All services are running${NC}"
echo -e "${CYAN}========================================${NC}"
echo -e "Web App:   http://localhost:8080"
echo -e "FastAPI:   http://localhost:8000/docs"
echo -e "Hardhat:   http://localhost:8545"
echo -e "\n${YELLOW}Press Ctrl+C to stop all services${NC}"

wait
