# 🚀 Deployment Guide for Decentralized Voting System

This guide covers deploying your voting system to production with separate components.

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│       Production Environment             │
├─────────────────────────────────────────┤
│  1. Frontend (Express + React SPA)       │ Port 8080
│  2. FastAPI Auth Service                 │ Port 8000
│  3. Smart Contract (on Public Testnet)   │ (Sepolia/Mumbai)
│  4. MySQL Database                       │ Port 3306
└─────────────────────────────────────────┘
```

## Prerequisites

- **Server**: Linux/Ubuntu VPS or Cloud VM (AWS, GCP, Azure, DigitalOcean, etc.)
- **Docker** (recommended) or Node.js 18+, Python 3.10+
- **MySQL 8.0+**
- **Domain name** (optional, for SSL)
- **Ethereum Testnet funds** (for smart contract deployment)

---

## Option 1: Manual Deployment (VPS/Server)

### Step 1: Setup Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python
sudo apt install -y python3 python3-pip python3-venv

# Install MySQL
sudo apt install -y mysql-server

# Install Nginx (reverse proxy)
sudo apt install -y nginx
```

### Step 2: Clone & Setup Project

```bash
# Clone repository
git clone https://github.com/RAJ8664/FYP.git
cd FYP

# Install dependencies
npm install
npm --prefix client install
```

### Step 3: Configure Environment

Create `.env` file with production values:

```bash
# .env
SECRET_KEY=your-production-secret-key-change-this
NODE_ENV=production

# MySQL
MYSQL_USER=voting_user
MYSQL_PASSWORD=strong-password-here
MYSQL_HOST=localhost
MYSQL_DB=voting_db

# FastAPI
AUTH_API_URL=http://localhost:8000

# Ethereum (choose one testnet)
# For Sepolia testnet:
VITE_NETWORK_RPC=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
VITE_CONTRACT_ADDRESS=0x... # deployed contract address
```

### Step 4: Setup MySQL

```bash
# Login to MySQL
sudo mysql -u root

# Create database and user
CREATE DATABASE voting_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'voting_user'@'localhost' IDENTIFIED BY 'strong-password-here';
GRANT ALL PRIVILEGES ON voting_db.* TO 'voting_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import schema (if you have one)
mysql -u voting_user -p voting_db < database_schema.sql
```

### Step 5: Setup Python Virtual Environment

```bash
cd Database_API
python3 -m venv fastapi-env
source fastapi-env/bin/activate
pip install -r requirements.txt
cd ..
```

### Step 6: Deploy Smart Contract

```bash
# Install Hardhat globally if not already
npm install -g hardhat

# Update hardhat.config.js for testnet deployment
# Add your private key (securely!) and testnet RPC

# Deploy to testnet (e.g., Sepolia)
npx hardhat run scripts/deploy.js --network sepolia

# Save the deployed contract address to build/contracts/Voting.json
```

### Step 7: Build Frontend

```bash
npm run build
# This creates client/dist
```

### Step 8: Setup Systemd Services

Create `/etc/systemd/system/voting-fastapi.service`:

```ini
[Unit]
Description=Voting System FastAPI Service
After=network.target

[Service]
Type=simple
User=voting
WorkingDirectory=/home/voting/FYP/Database_API
Environment="PATH=/home/voting/FYP/Database_API/fastapi-env/bin"
ExecStart=/home/voting/FYP/Database_API/fastapi-env/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/voting-express.service`:

```ini
[Unit]
Description=Voting System Express Gateway
After=network.target

[Service]
Type=simple
User=voting
WorkingDirectory=/home/voting/FYP
Environment="NODE_ENV=production"
Environment="PORT=8080"
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start services:

```bash
sudo systemctl daemon-reload
sudo systemctl enable voting-fastapi voting-express
sudo systemctl start voting-fastapi voting-express
sudo systemctl status voting-fastapi voting-express
```

### Step 9: Setup Nginx Reverse Proxy

Create `/etc/nginx/sites-available/voting`:

```nginx
upstream express_backend {
    server 127.0.0.1:8080;
}

upstream fastapi_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS (optional)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://express_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api-auth/ {
        proxy_pass http://fastapi_backend/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/voting /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 10: Setup SSL (Recommended)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot certonly --nginx -d your-domain.com
```

Then update Nginx config with SSL certificates.

---

## Option 2: Docker Deployment (Recommended)

Create `Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage
FROM node:18-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/build ./build
COPY index.js .
COPY .env .

EXPOSE 8080
CMD ["node", "index.js"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: voting_db
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"

  fastapi:
    build:
      context: ./Database_API
      dockerfile: Dockerfile
    environment:
      - MYSQL_USER=root
      - MYSQL_PASSWORD=root_password
      - MYSQL_HOST=mysql
      - MYSQL_DB=voting_db
    ports:
      - "8000:8000"
    depends_on:
      - mysql

  express:
    build: .
    environment:
      - NODE_ENV=production
      - AUTH_API_URL=http://fastapi:8000
      - MYSQL_HOST=mysql
    ports:
      - "8080:8080"
    depends_on:
      - fastapi
      - mysql

volumes:
  mysql_data:
```

Deploy with:

```bash
docker-compose up -d
```

---

## Option 3: Cloud Platform Deployment

### Vercel (Frontend only)
```bash
npm install -g vercel
vercel deploy --prod
```

### Heroku
```bash
heroku login
heroku create your-app-name
git push heroku main
```

### AWS EC2 + RDS
1. Launch EC2 instance
2. Use RDS for MySQL
3. Deploy Express & FastAPI on EC2
4. Use Elastic IP for static IP
5. Use Route53 for DNS

---

## Environment Variables for Production

```env
# Security
SECRET_KEY=generate-long-random-string-here
NODE_ENV=production

# MySQL
MYSQL_USER=voting_user
MYSQL_PASSWORD=strong-random-password
MYSQL_HOST=db.example.com (or localhost)
MYSQL_DB=voting_db

# API
AUTH_API_URL=http://your-api.com (if separate servers)
PORT=8080

# Ethereum Network (choose one)
# Sepolia Testnet
VITE_NETWORK_RPC=https://sepolia.infura.io/v3/YOUR_KEY
VITE_CONTRACT_ADDRESS=0x...

# OR Polygon Mumbai Testnet
# VITE_NETWORK_RPC=https://polygon-mumbai.infura.io/v3/YOUR_KEY
```

---

## Security Checklist

- [ ] Change all default passwords
- [ ] Enable SSL/HTTPS
- [ ] Setup firewall rules (only allow ports 80, 443)
- [ ] Enable MySQL user restrictions
- [ ] Use environment variables for secrets
- [ ] Enable database backups
- [ ] Setup monitoring/logging
- [ ] Use strong JWT_SECRET
- [ ] Rate limiting on API endpoints
- [ ] Regular security updates

---

## Monitoring & Maintenance

```bash
# Check service status
sudo systemctl status voting-fastapi voting-express

# View logs
sudo journalctl -u voting-express -f
sudo journalctl -u voting-fastapi -f

# Database backup
mysqldump -u voting_user -p voting_db > backup.sql

# Restart services
sudo systemctl restart voting-express voting-fastapi
```

---

## Production Checklist

- [ ] Contract deployed to testnet/mainnet
- [ ] Environment variables configured
- [ ] Database setup and seeded
- [ ] SSL certificate installed
- [ ] Backups configured
- [ ] Monitoring alerts setup
- [ ] Load testing completed
- [ ] Documentation updated
- [ ] Team trained on deployment process

---

## Support & Troubleshooting

For deployment issues:
1. Check logs: `sudo journalctl -u service-name -f`
2. Verify connectivity: `curl http://localhost:8000/healthz`
3. Test database: `mysql -u voting_user -p voting_db -e "SHOW TABLES;"`
4. Check Nginx: `sudo nginx -t`

