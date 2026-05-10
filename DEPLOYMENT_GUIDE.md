# 🚀 Deployment Guide - Vercel & Render

## Overview
- **Frontend**: Vercel (https://your-app.vercel.app)
- **Backend API**: Render (https://voting-system-api.onrender.com)
- **Blockchain**: Local Hardhat Node

---

## 1️⃣ Deploy Frontend to Vercel

### Prerequisites:
- Vercel account (https://vercel.com)
- GitHub account with this repo pushed

### Steps:

1. **Push to GitHub** (if not already done):
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

2. **Connect to Vercel**:
   - Go to https://vercel.com
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Select the project

3. **Configure Vercel Project**:
   - **Framework Preset**: Vite
   - **Root Directory**: ./
   - **Build Command**: `npm --prefix client run build`
   - **Output Directory**: `client/dist`
   - **Install Command**: `npm install`

4. **Environment Variables** (in Vercel Dashboard):
   ```
   VITE_API_URL=https://voting-system-api.onrender.com
   ```

5. **Click Deploy** ✅

Your frontend will be live at: **https://your-app.vercel.app**

---

## 2️⃣ Deploy Backend to Render

### Prerequisites:
- Render account (https://render.com)
- MySQL database accessible from internet (or Render Private Service)
- Environment variables ready

### Steps:

1. **Create New Web Service on Render**:
   - Go to https://render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repo
   - Select the repository

2. **Configure the Service**:
   - **Name**: `voting-system-api`
   - **Environment**: Python 3
   - **Build Command**: `pip install -r Database_API/requirements.txt`
   - **Start Command**: `cd Database_API && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free (or paid for better uptime)

3. **Add Environment Variables** in Render Dashboard:
   ```
   MYSQL_USER=your_mysql_user
   MYSQL_PASSWORD=your_mysql_password
   MYSQL_HOST=your_mysql_host
   MYSQL_DB=voting_db
   SECRET_KEY=your-secret-key
   ```

4. **Deploy** ✅

Your backend will be at: **https://voting-system-api.onrender.com**

---

## 3️⃣ Update Frontend API Endpoints

After getting your Render URL, update frontend to point to Render backend:

### Option A: Environment Variable (Recommended)
Create `.env.production` in `client/`:
```
VITE_API_URL=https://voting-system-api.onrender.com
```

### Option B: Update API Config
Edit `client/src/lib/api.ts`:
```typescript
const API_BASE_URL = process.env.VITE_API_URL || 'https://voting-system-api.onrender.com'

export async function authenticate(voterId: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/login`, {
    // ... rest of code
  })
}
```

---

## 4️⃣ Blockchain (Local or Sepolia)

### Option A: Keep Running Locally (Recommended for Demo)
```bash
cd /home/nikhil/final/FYP
npx hardhat node
```

Deploy in another terminal:
```bash
npx hardhat run scripts/deploy.js --network localhost
```

Contract address: `0x5FbDB2315678afecb367f032d93F642f64180aa3`

### Option B: Deploy to Sepolia Testnet
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

Update `.env` with contract address and use Sepolia RPC.

---

## 5️⃣ Database Setup for Render

If using Render's MySQL, or external MySQL:

1. Create database:
```bash
mysql -u root -p
CREATE DATABASE voting_db;
```

2. Create voters table:
```sql
CREATE TABLE voters (
  voter_id VARCHAR(255) PRIMARY KEY,
  password VARCHAR(255),
  email VARCHAR(255),
  role ENUM('admin', 'voter') DEFAULT 'voter'
);
```

3. Add sample voters:
```sql
INSERT INTO voters (voter_id, password, role) VALUES
('admin1', 'admin_pass_hash', 'admin'),
('voter1', 'voter_pass_hash', 'voter');
```

---

## 📋 Final Deployment Link

Share this link with your professor:
```
https://your-app.vercel.app
```

**Demo Credentials:**
- Admin: `admin1` / `admin_pass`
- Voter: `voter1` / `voter_pass`

---

## 🔗 API Endpoints (Render)

- **Login**: `POST /login`
- **Register**: `POST /register`
- **Healthz**: `GET /healthz`

All endpoints: https://voting-system-api.onrender.com/docs (Swagger UI)

---

## ⚠️ Important Notes

1. **Keep blockchain running locally** for contract interaction
2. **Use HTTPS** for all production URLs
3. **Never commit** `.env` files to GitHub
4. **Update CORS** in FastAPI if frontend URL changes
5. **Test thoroughly** before final demo

---

## 🐛 Troubleshooting

### Frontend not connecting to API:
- Check CORS in `Database_API/main.py`
- Verify API URL in environment variables
- Check browser console for errors

### Backend deployment fails:
- Ensure `Database_API/requirements.txt` is present
- Check MySQL credentials
- View Render build logs

### Blockchain issues:
- Keep Hardhat node running locally
- Update contract address in frontend
- Use testnet for external access

