# 🎯 QUICK START - Deploy to Vercel & Render (5 minutes)

## Step 1: Push to GitHub (2 minutes)

```bash
cd /home/nikhil/final/FYP
git add .
git commit -m "Prepare for cloud deployment"
git push origin main
```

---

## Step 2: Deploy Frontend to Vercel (2 minutes)

1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Search for your GitHub repo
4. Click "Import"
5. **Framework Preset**: Vite
6. **Build Command**: `npm --prefix client run build`
7. **Output Directory**: `client/dist`
8. Click **Deploy** ✅

**Your Vercel URL**: https://your-project-name.vercel.app

---

## Step 3: Deploy Backend to Render (2 minutes)

### 3a. Create MySQL on Render (or use existing)

1. Go to https://render.com
2. Click "New" → "MySQL"
3. Name it: `voting-db`
4. Select region (Singapore)
5. Create database
6. Save credentials

### 3b. Deploy FastAPI Backend

1. Go to https://render.com
2. Click "New" → "Web Service"
3. Connect your GitHub repo
4. Select repository
5. Fill in:
   - **Name**: `voting-system-api`
   - **Environment**: Python 3
   - **Region**: Singapore
   - **Build Command**: `pip install -r Database_API/requirements.txt`
   - **Start Command**: `cd Database_API && uvicorn main:app --host 0.0.0.0 --port $PORT`

6. **Add Environment Variables**:
   ```
   MYSQL_USER=your_user
   MYSQL_PASSWORD=your_password
   MYSQL_HOST=your_host
   MYSQL_DB=voting_db
   SECRET_KEY=dev-voting-system-secret-key-12345
   AUTH_API_URL=https://voting-system-api.onrender.com
   ```

7. Click **Deploy** ✅

**Your Render URL**: https://voting-system-api.onrender.com

---

## Step 4: Update Vercel with API URL (1 minute)

1. Go to Vercel dashboard
2. Select your project
3. Go to "Settings" → "Environment Variables"
4. Add:
   ```
   VITE_API_URL=https://voting-system-api.onrender.com
   ```
5. Click "Save"
6. Go to "Deployments" and trigger redeploy

---

## Step 5: Update Backend CORS (1 minute)

Edit `Database_API/main.py` and update CORS origins:

```python
origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://your-project-name.vercel.app",  # ← Add your Vercel URL
]
```

Commit and push:
```bash
git add Database_API/main.py
git commit -m "Update CORS for Vercel"
git push origin main
```

Render will auto-redeploy.

---

## ✅ You're Done! Share This Link:

```
https://your-project-name.vercel.app
```

---

## 📝 Demo Credentials

Ask your professor to use:
- **Admin**: `admin1` / `admin_pass`
- **Voter**: `voter1` / `voter_pass`

(These are from your MySQL database)

---

## 🔗 Additional Links to Share

- **Frontend**: https://your-project-name.vercel.app
- **API Docs**: https://voting-system-api.onrender.com/docs
- **GitHub**: https://github.com/RAJ8664/FYP

---

## 🚨 Troubleshooting

### "Failed to connect to API"
- Check if Render is deployed and healthy
- Verify CORS URL in `Database_API/main.py`
- Check browser console for exact error

### "Database connection error"
- Verify MySQL credentials in Render env vars
- Check if MySQL is running and accessible from internet
- Update `MYSQL_HOST` to external hostname

### "Vercel build fails"
- Check build logs on Vercel
- Ensure `npm --prefix client run build` works locally
- Verify all dependencies installed

---

## 🎬 What's Happening

1. **Vercel hosts your React frontend** (client/dist)
2. **Render hosts your Python FastAPI backend** (Database_API)
3. **Frontend calls Render API** for auth/data
4. **Blockchain remains local** (hardhat node running on your machine)

This allows you to show a **live working demo** to your professor!

