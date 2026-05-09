# 📋 Step-by-Step Deployment Guide for Your FYP Demo

Follow these exact steps to get your project live for your professor.

## Phase 1: Prepare Smart Contract (30 minutes)

### Step 1.1: Get Sepolia Testnet ETH (Free)

1. Go to: https://sepoliafaucet.com/
2. Connect your wallet (MetaMask)
3. Get free test ETH
4. Wait 2-3 minutes for it to appear

**Why?** You need ETH to pay for deploying the contract.

### Step 1.2: Create Infura Account (Free)

1. Go to: https://infura.io/
2. Sign up free
3. Create a project
4. Copy your API key
5. Update your `.env`:

```env
INFURA_API_KEY=your-key-here
SEPOLIA_PRIVATE_KEY=your-metamask-private-key
```

**⚠️ WARNING**: Never share your private key!

### Step 1.3: Update Hardhat Config

Edit `hardhat.config.js`:

```javascript
require("@nomiclabs/hardhat-ethers");
require('dotenv').config();

module.exports = {
    solidity: "0.5.15",
    networks: {
        localhost: {
            url: "http://127.0.0.1:8545",
        },
        sepolia: {
            url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
            accounts: [process.env.SEPOLIA_PRIVATE_KEY],
        }
    },
    paths: {
        sources: "./contracts",
        artifacts: "./artifacts",
    },
};
```

### Step 1.4: Deploy Contract to Testnet

```bash
cd /home/nikhil/final/FYP

# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia
```

You'll get output like:
```
Deploying contracts with account: 0x...
Voting contract deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

**Save this contract address!** You'll need it for the frontend.

### Step 1.5: Verify Contract (Optional but good for demo)

```bash
npx hardhat verify --network sepolia 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

Now your contract is visible on: https://sepolia.etherscan.io/

---

## Phase 2: Configure Frontend (15 minutes)

### Step 2.1: Update Frontend Environment

Edit `client/.env`:

```env
VITE_NETWORK_RPC=https://sepolia.infura.io/v3/YOUR_INFURA_API_KEY
VITE_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### Step 2.2: Build Frontend

```bash
cd /home/nikhil/final/FYP

# Build React app
npm run build
```

This creates `client/dist/` folder with your website.

### Step 2.3: Test Locally

```bash
# Start local server
npm run server
```

Visit: http://localhost:8080

Test everything works!

---

## Phase 3: Deploy to Cloud (Choose ONE)

### Option A: Render.com (Easiest) ⭐

**Time: 10 minutes**

1. Go to: https://render.com/
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Select your GitHub repo
5. Fill in:
   - **Name**: voting-system-fyp
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node index.js`
6. Add Environment Variables:
   - `SECRET_KEY=your-secret`
   - `MYSQL_USER=root`
   - `MYSQL_PASSWORD=Nikhil@2003`
   - `MYSQL_HOST=localhost` (or your DB host)
   - `MYSQL_DB=voting_db`
   - `VITE_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3`
   - `VITE_NETWORK_RPC=https://sepolia.infura.io/v3/YOUR_KEY`
7. Click "Deploy"
8. Wait 5 minutes...
9. Get URL: `https://voting-system-fyp.onrender.com` ✅

**Problem**: Render's free tier might not have MySQL. Solution below.

---

### Option B: Railway.app (Good) ⭐⭐

**Time: 15 minutes**

1. Go to: https://railway.app/
2. Sign up with GitHub
3. Create new project
4. Select "Deploy from GitHub"
5. Choose your repo
6. Click "Deploy Now"
7. Wait for auto-deployment
8. Get URL: `https://your-project.up.railway.app` ✅

Railway auto-reads your `docker-compose.yml` if it exists.

---

### Option C: AWS EC2 (Best for real deployment) ⭐⭐⭐

**Time: 30 minutes**

1. Launch EC2 instance (Ubuntu 22.04)
2. Get public IP
3. Connect via SSH:
   ```bash
   ssh -i your-key.pem ubuntu@your-ip
   ```

4. Run deployment script:
   ```bash
   curl -O https://raw.githubusercontent.com/RAJ8664/FYP/main/deploy.sh
   chmod +x deploy.sh
   ./deploy.sh
   ```

5. Follow prompts
6. Get URL: `https://your-domain.com` ✅

---

## Phase 4: Database Setup on Cloud

### If using Render/Railway (they handle databases):

1. Add MySQL service in Render/Railway dashboard
2. Copy connection string
3. Update `.env` with new credentials
4. Create tables by running:
   ```bash
   mysql -u user -p database_name < schema.sql
   ```

### If using AWS EC2:

```bash
# SSH into your server
ssh -i key.pem ubuntu@your-ip

# Setup MySQL
sudo apt install -y mysql-server

# Create database
sudo mysql -u root -e "CREATE DATABASE voting_db;"

# Create user
sudo mysql -u root -e "CREATE USER 'voting_user'@'localhost' IDENTIFIED BY 'strong-password';"

# Grant privileges
sudo mysql -u root -e "GRANT ALL PRIVILEGES ON voting_db.* TO 'voting_user'@'localhost'; FLUSH PRIVILEGES;"

# Import voters table with our users
mysql -u voting_user -p voting_db -e "INSERT INTO voters (voter_id, password, role, email) VALUES ('admin', '\$2b\$12\$...', 'admin', 'admin@voting.com');"
```

---

## Phase 5: Final Testing (10 minutes)

### Test Your Deployment

1. Open in browser: `https://your-deployed-url.com`
2. Login with:
   - Voter ID: `admin`
   - Password: `admin@12345`
3. View candidates (from blockchain)
4. Cast a vote
5. See vote recorded
6. Open blockchain explorer: https://sepolia.etherscan.io/
7. Search for your contract address
8. Show transactions to professor

---

## 🎓 What to Show Your Professor

```
DEMO SEQUENCE:

1. "Let me show you our voting system"
   → Open: https://your-deployed-url.com

2. "First, users log in with credentials"
   → Login with admin / admin@12345

3. "The system authenticates against our database (FastAPI)"
   → Explain: Authentication backend

4. "Then users see candidates stored on blockchain"
   → Click: View Candidates
   → Explain: Coming from smart contract

5. "Users can vote, which records on immutable blockchain"
   → Click: Vote for a candidate
   → Show: Transaction on Sepolia Etherscan
   → URL: https://sepolia.etherscan.io/tx/0x...

6. "All votes are transparent and permanent"
   → Show: Blockchain explorer
   → Click through transactions
   → Explain: Cannot be modified

7. "The source code is open on GitHub"
   → Link: github.com/RAJ8664/FYP
```

---

## ⚠️ Troubleshooting

### "Website not loading"
```bash
# Check logs on Render/Railway/AWS
# For AWS:
sudo journalctl -u voting-express -f
sudo journalctl -u voting-fastapi -f
```

### "Login not working"
```bash
# Check FastAPI is running
curl https://your-url.com/healthz

# Check database connection
mysql -u user -p database_name
```

### "Votes not recording"
```bash
# Check MetaMask is set to Sepolia network
# Check contract address is correct
# Verify you have test ETH in wallet
```

### "Contract not found"
```bash
# Double-check contract address
# Visit: https://sepolia.etherscan.io/address/0x...
# Should see "Voting" contract
```

---

## 📱 Final Checklist Before Demo

- [ ] Smart contract deployed to Sepolia testnet
- [ ] Contract address saved and configured
- [ ] Frontend built and tested locally
- [ ] Deployed to cloud (Render/Railway/AWS)
- [ ] Database setup with voters table
- [ ] Admin account exists (admin / admin@12345)
- [ ] Test voter accounts created
- [ ] Can login successfully
- [ ] Can view candidates from blockchain
- [ ] Can cast a vote
- [ ] Vote shows on blockchain explorer
- [ ] Website is accessible from any internet connection
- [ ] Can explain each component to professor
- [ ] Have backup: Local version on laptop

---

## 🚀 Quick Reference URLs

**Your Application**: https://your-deployed-url.com  
**Admin Login**: admin / admin@12345  
**Blockchain Explorer**: https://sepolia.etherscan.io/  
**Your Contract**: https://sepolia.etherscan.io/address/0x5FbDB2315678afecb367f032d93F642f64180aa3  
**GitHub Repository**: https://github.com/RAJ8664/FYP  

---

## 🎯 Estimated Total Time

- Smart Contract Deployment: 30 min
- Frontend Configuration: 15 min
- Cloud Deployment: 10-30 min (depending on platform)
- Database Setup: 10 min
- Testing: 10 min

**Total: ~1.5 - 2 hours for complete deployment**

Good luck with your demo! 🎓🚀

