<div align="center">

# 🗳️ Decentralized Voting System

A modern, blockchain-based voting system built on Ethereum. This application leverages smart contracts to ensure transparent, secure, and tamper-proof voting with full auditability.

[![Node.js](https://img.shields.io/badge/Node.js-v14+-green.svg)](https://nodejs.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.5.15-ff69b4.svg)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-v2.22.0-yellow.svg)](https://hardhat.org/)

</div>

## ✨ Features

- **🔐 Secure Voting**: Blockchain-based voting ensures immutability and transparency
- **🚫 Prevent Double Voting**: Built-in mechanisms to prevent voters from voting multiple times
- **📊 Real-time Results**: Instant vote counting and candidate ranking
- **🔑 JWT Authentication**: Secure user authentication and authorization
- **👥 Multi-role Support**: Admin and voter roles with different permissions
- **📱 Responsive UI**: Modern, user-friendly interface
- **🌐 Decentralized**: Run on your own node or test networks (Ganache, Hardhat)
- **⚡ Gas Optimized**: Efficient smart contract implementation

## 🛠️ Tech Stack

### Frontend

- **HTML5 / CSS3** - Modern responsive design
- **JavaScript (Vanilla)** - Client-side logic
- **Web3.js** - Ethereum blockchain interaction

### Backend

- **Node.js** - Runtime environment
- **Express.js** - REST API framework
- **JWT** - Authentication and authorization

### Blockchain

- **Solidity 0.5.15** - Smart contract language
- **Ethereum** - Blockchain network
- **Hardhat** - Development and testing framework

### Dependencies

- `web3` - Ethereum JavaScript API
- `@truffle/contract` - Contract abstraction
- `ethers` - Ethereum library
- `jsonwebtoken` - JWT implementation
- `express` - Web framework
- `dotenv` - Environment variable management

## 📁 Project Structure

```
FYP/
├── contracts/
│   └── Voting.sol              # Main voting smart contract
├── scripts/
│   └── deploy.js               # Deployment script
├── src/
│   ├── js/
│   │   ├── app.js              # Frontend voting application
│   │   └── login.js            # Login logic
│   ├── html/
│   │   ├── index.html          # Voting page
│   │   ├── login.html          # Login page
│   │   └── admin.html          # Admin dashboard
│   ├── css/
│   │   ├── index.css           # Voting page styles
│   │   ├── login.css           # Login page styles
│   │   └── admin.css           # Admin page styles
│   ├── assets/                 # Images and static files
│   └── dist/                   # Bundled JavaScript files
├── Database_API/               # Database API endpoints
├── artifacts/                  # Compiled contracts
├── public/                     # Public assets
├── hardhat.config.js           # Hardhat configuration
├── index.js                    # Express server entry point
├── package.json                # Project dependencies
├── start.sh                    # Quick start script
└── README.md                   # This file
```

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/decentralized-voting.git
cd FYP
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
SECRET_KEY=your_jwt_secret_key_here
NODE_ENV=development
```

## ⚙️ Configuration

### Hardhat Configuration

The project uses Hardhat for smart contract development. Configuration is defined in `hardhat.config.js`:

```javascript
module.exports = {
  solidity: '0.5.15',
  networks: {
    localhost: {
      url: 'http://127.0.0.1:8545',
    },
  },
  paths: {
    sources: './contracts',
    artifacts: './artifacts',
  },
}
```

### Network Setup

The project supports local development using Hardhat's built-in network or Ganache.

## 📖 Usage

```bash
chmod +x start.sh
./start.sh
```

This script automates the startup process.

## 🎬 Demo Videos

### Previous Implementation Demo (Ganache + Metamask)

This demo showcases the voting system using Ganache for local blockchain development and Metamask for wallet management.

https://github.com/user-attachments/assets/8176abd9-a3c2-4e95-9a01-4e6229e4c5e0

**Key Features Demonstrated:**

- User login and authentication
- Viewing candidates
- Casting votes securely
- Real-time vote updates

### New Implementation Demo (Hardhat)

This demo shows the automated deployment and testing using Hardhat framework.

https://github.com/user-attachments/assets/8e1b04cc-2968-4c28-adf8-77ce8069b5fe

**Key Features Demonstrated:**

- Automated contract deployment
- Smart contract testing
- Admin functionality
- System automation workflows

---

## 🔗 Smart Contract

### Voting.sol

The core smart contract that manages the voting process.

#### Key Functions

- **`addCandidate(string name, string party)`** - Add a new candidate
- **`vote(uint256 candidateID, string voter_id)`** - Cast a vote for a candidate
- **`checkVote(string voter_id)`** - Check if a voter has already voted
- **`getCandidates()`** - Retrieve all candidates and their vote counts

#### Key Features

- Duplicate candidate prevention
- Double-voting prevention
- Voting period enforcement
- Vote anonymity (voter_id is hashed)

---

## 🌐 API Documentation

### Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

### Endpoints

| Method | Endpoint         | Description        | Auth Required |
| ------ | ---------------- | ------------------ | ------------- |
| GET    | `/`              | Login page         | ❌            |
| GET    | `/index.html`    | Voting page        | ✅            |
| GET    | `/admin.html`    | Admin dashboard    | ✅            |
| GET    | `/js/app.js`     | Frontend app logic | ❌            |
| GET    | `/css/index.css` | Main styles        | ❌            |
| GET    | `/css/admin.css` | Admin styles       | ❌            |

### Database API

The `Database_API/` directory contains additional API endpoints for managing voting data and admin functions.
