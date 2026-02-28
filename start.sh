#!/bin/bash
# ============================================
# Decentralized Voting System - Startup Script
# ============================================
# This script starts all services in the correct order:
#   1. Hardhat blockchain node
#   2. Compile & deploy smart contract
#   3. Bundle frontend JavaScript
#   4. FastAPI authentication server
#   5. Express web server
# ============================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Decentralized Voting System Launcher  ${NC}"
echo -e "${CYAN}========================================${NC}"

# ---- Cleanup function ----
cleanup() {
    echo -e "\n${YELLOW}Shutting down all services...${NC}"
    # Kill background processes
    if [ ! -z "$HARDHAT_PID" ]; then
        kill $HARDHAT_PID 2>/dev/null && echo -e "${RED}Stopped Hardhat node${NC}"
    fi
    if [ ! -z "$FASTAPI_PID" ]; then
        kill $FASTAPI_PID 2>/dev/null && echo -e "${RED}Stopped FastAPI server${NC}"
    fi
    if [ ! -z "$EXPRESS_PID" ]; then
        kill $EXPRESS_PID 2>/dev/null && echo -e "${RED}Stopped Express server${NC}"
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM

# ---- Kill any existing processes on required ports ----
echo -e "\n${YELLOW}[Step 0] Cleaning up existing processes...${NC}"
for port in 8545 8000 8080; do
    pid=$(lsof -ti:$port 2>/dev/null || true)
    if [ ! -z "$pid" ]; then
        echo -e "  Killing process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
        sleep 1
    fi
done

# ---- Step 1: Start Hardhat Node ----
echo -e "\n${GREEN}[Step 1] Starting Hardhat node...${NC}"
export HARDHAT_DISABLE_TELEMETRY_PROMPT=true
npx hardhat node &
HARDHAT_PID=$!
echo -e "  Hardhat node PID: $HARDHAT_PID"

# Wait for hardhat node to be ready
echo -e "  Waiting for Hardhat node to be ready..."
for i in $(seq 1 30); do
    if curl -s http://127.0.0.1:8545 -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null 2>&1; then
        echo -e "  ${GREEN}Hardhat node is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "  ${RED}Hardhat node failed to start!${NC}"
        cleanup
    fi
    sleep 1
done

# ---- Step 2: Compile & Deploy Smart Contract ----
echo -e "\n${GREEN}[Step 2] Compiling and deploying smart contract...${NC}"
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
echo -e "  ${GREEN}Contract deployed successfully!${NC}"

# ---- Step 3: Bundle Frontend JS ----
echo -e "\n${GREEN}[Step 3] Bundling frontend JavaScript...${NC}"
npx browserify src/js/app.js -o src/dist/app.bundle.js
echo -e "  ${GREEN}Bundle created at src/dist/app.bundle.js${NC}"

# ---- Step 4: Start FastAPI Server ----
echo -e "\n${GREEN}[Step 4] Starting FastAPI authentication server...${NC}"
cd "$PROJECT_DIR/Database_API"

# Create venv if it doesn't exist
if [ ! -d "fastapi-env" ]; then
    echo -e "  Creating Python virtual environment..."
    python3 -m venv fastapi-env
fi

# Activate venv and install deps
source fastapi-env/bin/activate
pip install fastapi uvicorn mysql-connector-python python-dotenv PyJWT pydantic --quiet

uvicorn main:app --host 127.0.0.1 --port 8000 &
FASTAPI_PID=$!
echo -e "  FastAPI server PID: $FASTAPI_PID"
cd "$PROJECT_DIR"

# Wait for FastAPI to be ready
echo -e "  Waiting for FastAPI server to be ready..."
for i in $(seq 1 15); do
    if curl -s http://127.0.0.1:8000/docs > /dev/null 2>&1; then
        echo -e "  ${GREEN}FastAPI server is ready!${NC}"
        break
    fi
    if [ $i -eq 15 ]; then
        echo -e "  ${YELLOW}Warning: FastAPI may not be ready yet (MySQL might not be running)${NC}"
    fi
    sleep 1
done

# ---- Step 5: Start Express Server ----
echo -e "\n${GREEN}[Step 5] Starting Express web server...${NC}"
node index.js &
EXPRESS_PID=$!
echo -e "  Express server PID: $EXPRESS_PID"
sleep 2

# ---- Done! ----
echo -e "\n${CYAN}========================================${NC}"
echo -e "${GREEN}  All services are running!${NC}"
echo -e "${CYAN}========================================${NC}"
echo -e ""
echo -e "  ${CYAN}Web App:${NC}      http://localhost:8080"
echo -e "  ${CYAN}FastAPI:${NC}      http://localhost:8000/docs"
echo -e "  ${CYAN}Hardhat:${NC}      http://localhost:8545"
echo -e ""
echo -e "  ${YELLOW}Press Ctrl+C to stop all services${NC}"
echo -e ""

# Keep script running
wait
