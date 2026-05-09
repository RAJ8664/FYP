# 🚀 Quick Sepolia Deployment Guide

## Step-by-Step Instructions

### Step 1: Create Infura Account (5 minutes)

1. Open: https://infura.io/
2. Click "Sign Up" 
3. Fill in email and password
4. Verify email
5. Login to dashboard
6. Click "Create New Project"
7. Name it: "Voting System"
8. Select "Sepolia" as the network (or leave as Ethereum)
9. **Copy your Project ID** - this is your INFURA_API_KEY

Example: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

---

### Step 2: Get MetaMask & Test ETH (10 minutes)

#### If you don't have MetaMask:
1. Install: https://metamask.io/
2. Create wallet
3. Save seed phrase somewhere safe

#### Add Sepolia Network to MetaMask:
1. Open MetaMask
2. Click Networks dropdown (top)
3. Click "Add Network"
4. Fill in:
   - Network Name: Sepolia
   - RPC URL: https://sepolia.infura.io/v3/YOUR_INFURA_KEY
   - Chain ID: 11155111
   - Currency: ETH
5. Save
6. Switch to Sepolia network

#### Get Your Private Key:
1. Open MetaMask
2. Click three dots menu → Account Details
3. Click "Export Private Key"
4. Enter password
5. **Copy the private key** - this is your SEPOLIA_PRIVATE_KEY

⚠️ **KEEP THIS SECRET! Never share it!**

#### Get Free Test ETH:
1. Go: https://sepoliafaucet.com/
2. Connect MetaMask wallet
3. Request 0.5 ETH
4. Wait 2-3 minutes
5. Check your MetaMask balance

---

### Step 3: Update Your .env File

Edit `/home/nikhil/final/FYP/.env` and replace:

```env
INFURA_API_KEY=your-infura-api-key-here
SEPOLIA_PRIVATE_KEY=your-metamask-private-key-here
```

With actual values you got above.

Example (.env):
```env
INFURA_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
SEPOLIA_PRIVATE_KEY=0x1234567890abcdef...
```

---

### Step 4: Deploy Contract to Sepolia

Run this command:

```bash
cd /home/nikhil/final/FYP
npx hardhat run scripts/deploy.js --network sepolia
```

You should see:
```
Deploying contracts with account: 0x...
Voting contract deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Contract artifact written to build/contracts/Voting.json
```

**SAVE THIS ADDRESS!** You'll need it for frontend.

---

### Step 5: Verify Deployment

1. Open: https://sepolia.etherscan.io/
2. Search for the contract address
3. You should see your contract ✅

---

## What to do next:

Once deployment is successful, message me with:
- [ ] Deployment was successful
- [ ] Your contract address

Then I'll help you update the frontend to use this contract!

