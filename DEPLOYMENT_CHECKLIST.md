# ✅ Quick Deployment Checklist

## Before Deployment

- [ ] Code committed to GitHub
- [ ] `.env` file is in `.gitignore`
- [ ] All environment variables documented
- [ ] Database schema created
- [ ] Smart contract deployed (locally or testnet)

## Vercel Frontend Deployment

- [ ] Create Vercel account
- [ ] Connect GitHub repository
- [ ] Set build command: `npm --prefix client run build`
- [ ] Set output directory: `client/dist`
- [ ] Add env vars if needed
- [ ] Deploy
- [ ] Test frontend loads
- [ ] Get Vercel URL

## Render Backend Deployment

- [ ] Create Render account
- [ ] Create new Web Service
- [ ] Connect GitHub repository
- [ ] Set build command: `pip install -r Database_API/requirements.txt`
- [ ] Set start command: `cd Database_API && uvicorn main:app --host 0.0.0.0 --port $PORT`
- [ ] Add environment variables:
  - [ ] MYSQL_USER
  - [ ] MYSQL_PASSWORD
  - [ ] MYSQL_HOST
  - [ ] MYSQL_DB
  - [ ] SECRET_KEY
- [ ] Deploy
- [ ] Test health endpoint: `/healthz`
- [ ] Check Swagger UI: `/docs`
- [ ] Get Render URL

## Integration

- [ ] Update frontend with Render API URL
- [ ] Test login flow
- [ ] Test candidate list
- [ ] Test voting functionality
- [ ] Check Swagger API docs

## Blockchain

- [ ] Keep `hardhat node` running locally
- [ ] Contract deployed and address saved
- [ ] RPC endpoint configured
- [ ] Test contract interactions

## Final Testing

- [ ] Frontend loads from Vercel
- [ ] Login works (FastAPI on Render)
- [ ] Voting works (Blockchain locally)
- [ ] No CORS errors
- [ ] No API connection errors
- [ ] Database queries work

## Share with Professor

- [ ] Vercel URL ready: https://your-app.vercel.app
- [ ] Demo credentials prepared
- [ ] Contract address documented
- [ ] API documentation link: https://voting-system-api.onrender.com/docs

