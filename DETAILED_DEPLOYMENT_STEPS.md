# 🎓 Complete Step-by-Step Guide to Deploy Your Smart Contract

I'll walk you through EVERY step with screenshots descriptions.

---

## 📍 STEP 1: Create Infura Account & Get API Key (5 minutes)

### 1.1: Go to Infura Website
- Open your browser
- Go to: **https://infura.io/**
- You should see the Infura homepage

### 1.2: Click "Sign Up"
- Look for the "Sign Up" button (top right)
- Click it
- You'll see a signup form

### 1.3: Fill in Your Details
```
Email: your-email@gmail.com
Password: Create a strong password
```
- Fill both fields
- Click "Sign Up"

### 1.4: Verify Your Email
- Check your email inbox
- Look for email from Infura
- Click the verification link
- You should now be logged in

### 1.5: Create a New Project
- You'll see a dashboard
- Look for "Create New Project" button
- Click it

### 1.6: Fill Project Details
```
Project Name: Voting System
Project Description: FYP Blockchain Voting
```
- Fill these fields
- Click "Create"

### 1.7: Copy Your API Key
- You'll see your project dashboard
- Look for "Project ID" or "API Key"
- It looks like: `47b45ad147984b0c9060f71166db2d2c`
- **COPY THIS** - this is your INFURA_API_KEY

✅ **Save this somewhere** - you already have it! `47b45ad147984b0c9060f71166db2d2c`

---

## 💰 STEP 2: Setup MetaMask & Get Private Key (10 minutes)

### 2.1: Install MetaMask
- Open your browser
- Go to: **https://metamask.io/**
- Click "Download" or "Install Extension"
- Choose your browser (Chrome, Firefox, etc.)
- Click "Install"
- Wait for installation to complete

### 2.2: Create Your Wallet
- Click the MetaMask extension icon (fox icon)
- Click "Create a New Wallet"
- Create a password (something strong)
- You'll see 12 words - **SAVE THESE WORDS** somewhere safe!
  - Write them down on paper or save in a file
  - These are your backup recovery phrase
  - NEVER share these words!
- Click "I have saved my seed phrase"
- Done! Your wallet is created

### 2.3: Get Your Account Address
- MetaMask extension is now open
- You'll see "Account 1"
- Below it is your address (looks like: `0x1234567890abcdef...`)
- This is your wallet address
- **SAVE THIS** - you'll need it later

### 2.4: Add Sepolia Network to MetaMask
Your MetaMask currently shows "Ethereum Mainnet". We need to add Sepolia testnet.

**Method 1: Manual Add (Detailed)**
1. Click the network dropdown (top of MetaMask)
2. Look for "Sepolia" in the list
3. If you see it, click it and go to step 2.6
4. If NOT, click "Add Network"

**Method 2: If "Add Network" is shown**
1. Fill in these details EXACTLY:
```
Network Name: Sepolia
RPC URL: https://sepolia.infura.io/v3/47b45ad147984b0c9060f71166db2d2c
Chain ID: 11155111
Currency Symbol: ETH
Block Explorer URL: https://sepolia.etherscan.io
```
2. Click "Save"
3. MetaMask will now show "Sepolia" network

### 2.5: Switch to Sepolia Network
- Click the network dropdown at top of MetaMask
- Select "Sepolia"
- You should now see "Sepolia" displayed

### 2.6: Get Your Private Key
**IMPORTANT: Keep this completely SECRET!**

1. In MetaMask, click the three dots menu (top right)
2. Click "Account Details"
3. You'll see your account address
4. Look for "Export Private Key" button
5. Click it
6. MetaMask will ask for your password
7. Enter the password you created earlier
8. You'll see your private key (starts with `0x`)
9. **COPY THIS ENTIRE STRING**

**Example (NOT real):**
```
0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

✅ **Keep this private key safe!** You'll use it in next step.

---

## 🪙 STEP 3: Get Free Test ETH (5 minutes)

You need test ETH to pay for deploying your contract (gas fees).

### 3.1: Go to Faucet
- Open your browser
- Go to: **https://sepoliafaucet.com/**
- You'll see a form

### 3.2: Connect Your Wallet
- Click "Connect Wallet"
- MetaMask will popup
- Review the permissions
- Click "Connect"
- MetaMask now has permission to see your address

### 3.3: Request Test ETH
- You'll see your wallet address displayed
- Look for "Request Funds" or similar button
- Amount should be: `0.5 ETH` (or as shown)
- Click "Request" or "Send me 0.5 ETH"

### 3.4: Wait for ETH to Arrive
- It usually takes 2-5 minutes
- You'll see a message like "Funds will arrive shortly"
- Open your MetaMask extension
- Check your balance
- When you see ETH there, you're ready! ✅

**Your MetaMask should now show:**
```
Account: 0x... (your address)
Network: Sepolia
Balance: 0.5 ETH
```

---

## 📝 STEP 4: Update Your .env File (2 minutes)

Now let's put your keys into your project's `.env` file.

### 4.1: Open .env File
- File location: `/home/nikhil/final/FYP/.env`
- You can edit it with any text editor

### 4.2: Find These Lines
Look for:
```
INFURA_API_KEY=your-infura-api-key-here
SEPOLIA_PRIVATE_KEY=your-metamask-private-key-here
```

### 4.3: Replace with Your Values

**REPLACE THIS:**
```
INFURA_API_KEY=your-infura-api-key-here
```

**WITH THIS:**
```
INFURA_API_KEY=47b45ad147984b0c9060f71166db2d2c
```

**AND REPLACE THIS:**
```
SEPOLIA_PRIVATE_KEY=your-metamask-private-key-here
```

**WITH THIS:**
```
SEPOLIA_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

(Use YOUR actual private key, not the example above)

### 4.4: Save the File
- Save the file (Ctrl+S or Cmd+S)
- Close the editor

✅ **Your .env file is now configured!**

---

## 🚀 STEP 5: Deploy Contract to Sepolia (5 minutes)

Now comes the exciting part - deploying your contract!

### 5.1: Open Terminal
- Open your terminal/command prompt
- Navigate to your project:
```bash
cd /home/nikhil/final/FYP
```

### 5.2: Run Deployment Command
Copy and paste this EXACTLY:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### 5.3: Wait for Deployment
The script will:
1. Connect to Sepolia network
2. Compile your contract
3. Deploy it
4. Show you the contract address

**You should see output like:**
```
Deploying contracts with account: 0x1234567890abcdef...
Voting contract deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Contract artifact written to build/contracts/Voting.json
```

### 5.4: SAVE THE CONTRACT ADDRESS
The address shown (like `0x5FbDB2315678afecb367f032d93F642f64180aa3`) is your **Smart Contract Address**.

**COPY THIS ADDRESS!** You'll need it for the next step.

✅ **Your contract is now deployed to Sepolia!**

---

## ✅ STEP 6: Verify Deployment (2 minutes)

Let's verify your contract was deployed successfully.

### 6.1: Open Sepolia Etherscan
- Open your browser
- Go to: **https://sepolia.etherscan.io/**
- This is like a "Google for Sepolia blockchain"

### 6.2: Search for Your Contract
- Look for the search box
- Paste your contract address
- Example: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- Press Enter

### 6.3: Verify Contract Details
- You should see your contract information
- Look for:
  - ✅ "Contract" label
  - ✅ Your contract address
  - ✅ Transaction details
  - ✅ "Voting" contract name (if verified)

### 6.4: Check Transactions
- Click on the "Transactions" tab
- You should see your deployment transaction
- It shows the contract was created

✅ **Your contract is live on Sepolia!**

---

## 📊 Summary of What You Have

After completing all steps, you should have:

```
✅ Infura Project ID: 47b45ad147984b0c9060f71166db2d2c
✅ MetaMask Wallet: 0x... (your address)
✅ MetaMask Private Key: 0x... (saved in .env)
✅ Test ETH in wallet: 0.5 ETH
✅ Contract deployed to Sepolia
✅ Contract Address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
✅ Verified on Etherscan
```

---

## 🎯 Next Steps

Once you've completed ALL these steps:

1. **Tell me:**
   - "Deployment successful!"
   - Your contract address

2. **Then I'll help you with:**
   - Update frontend to use this contract address
   - Deploy to cloud (Render/Railway/AWS)
   - Make it publicly accessible

---

## ⚠️ Troubleshooting

### "I don't see Sepolia in MetaMask"
- Click "Add Network"
- Manually enter the details I showed above
- Save and select it

### "Deployment fails with 'insufficient funds'"
- You might not have received test ETH yet
- Wait a few more minutes
- Try the faucet again
- Check your MetaMask balance

### "Private key error"
- Make sure private key starts with `0x`
- Make sure there are no extra spaces
- Make sure it's in .env file (not shared!)

### "Can't find contract on Etherscan"
- Wait 30 seconds
- Try again
- If still nothing, deployment might have failed
- Check terminal output for errors

---

## 🔐 SECURITY REMINDER

⚠️ **NEVER:**
- Share your private key with anyone
- Post it on internet/Discord/GitHub
- Show it in screenshots
- Save it in public places

✅ **DO:**
- Keep it in your `.env` file locally
- Add `.env` to `.gitignore` (so it's not uploaded to GitHub)
- Treat it like a password

---

## Questions?

If anything is unclear, ask me and I'll explain further!

Good luck! 🚀

