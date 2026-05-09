# 🗳️ Decentralized Voting System

Blockchain-based campus election system with:
- **Smart contract backend** (`contracts/Voting.sol`, Hardhat)
- **Authentication backend** (`Database_API`, FastAPI + MySQL + JWT)
- **Frontend** (`client`, React + Vite + ethers)
- **Gateway server** (`index.js`, Express)

The project is now organized so `client/` is the primary frontend, and Express serves the built frontend while proxying auth requests to FastAPI.

## Project Structure

```text
FYP/
├── client/                    # React frontend (Vite)
├── contracts/                 # Solidity contracts
├── scripts/deploy.js          # Hardhat deployment script
├── build/contracts/Voting.json# Frontend-consumable deployed contract artifact
├── Database_API/              # FastAPI auth service (MySQL-backed)
├── index.js                   # Express gateway (frontend + API proxy)
├── start.sh                   # Single-command local launcher
├── hardhat.config.js
└── package.json
```

## Prerequisites

- Node.js + npm
- Python 3
- MySQL (for `Database_API`)

Create a root `.env` file (you can copy from `.env.example`):

```env
SECRET_KEY=your_jwt_secret
NODE_ENV=development

MYSQL_USER=...
MYSQL_PASSWORD=...
MYSQL_HOST=...
MYSQL_DB=...
```

## Install

```bash
npm install
npm --prefix client install
```

## Run Everything (single command)

```bash
npm start
```

This runs:
1. Hardhat node (`8545`)
2. Contract compile + deploy (updates `build/contracts/Voting.json`)
3. Frontend build (`client/dist`)
4. FastAPI auth server (`8000`)
5. Express gateway serving frontend (`8080`)

Open: `http://localhost:8080`

## Development

Run only frontend dev server:

```bash
npm run client:dev
```

Run gateway only:

```bash
npm run server
```

## Build / Deployment

Build full app artifact for deployment:

```bash
npm run build
```

This compiles contracts and builds `client/dist`.  
If you also want to deploy contract artifacts for local chain usage, run:

```bash
npm run chain:prepare
```

For production deployments, run FastAPI separately, set `AUTH_API_URL` for Express if needed, and serve via `npm run server`.
# fyp
