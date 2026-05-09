#!/bin/bash

# Quick Deployment Script for B.Tech FYP Project Demo
# This creates a production-ready setup on a cheap VPS

echo "🎓 B.Tech FYP Project - Quick Deployment Setup"
echo "=============================================="
echo ""

# Check if running on VPS
if [ ! -f "/etc/os-release" ]; then
    echo "❌ This script should run on a Linux VPS"
    exit 1
fi

# Get domain from user
read -p "Enter your domain or IP (e.g., voting.example.com or 1.2.3.4): " DOMAIN

# Check if domain is reachable
echo "✓ Using domain: $DOMAIN"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Clone or pull latest code
echo ""
echo "📥 Setting up project..."
if [ ! -d "/var/www/voting-system" ]; then
    sudo git clone https://github.com/RAJ8664/FYP.git /var/www/voting-system
else
    cd /var/www/voting-system && sudo git pull origin main
fi

cd /var/www/voting-system

# Install node dependencies
echo "📚 Installing Node dependencies..."
sudo npm install
sudo npm --prefix client install

# Build frontend
echo "🏗️  Building frontend..."
sudo npm run build

# Setup Python environment for FastAPI
echo "🐍 Setting up Python environment..."
cd Database_API
sudo python3 -m venv fastapi-env
sudo ./fastapi-env/bin/pip install -r requirements.txt
cd ..

# Create Nginx config
echo "🔧 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/voting-system > /dev/null <<EOF
upstream express_backend {
    server 127.0.0.1:8080;
}

upstream fastapi_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://express_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /api-auth/ {
        proxy_pass http://fastapi_backend/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/voting-system /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# Setup SSL
echo "🔒 Setting up SSL certificate..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m your-email@example.com

# Create systemd services
echo "⚙️  Creating system services..."

sudo tee /etc/systemd/system/voting-express.service > /dev/null <<EOF
[Unit]
Description=Voting System Express
After=network.target

[Service]
Type=simple
User=voting
WorkingDirectory=/var/www/voting-system
EnvironmentFile=/var/www/voting-system/.env
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/voting-fastapi.service > /dev/null <<EOF
[Unit]
Description=Voting System FastAPI
After=network.target

[Service]
Type=simple
User=voting
WorkingDirectory=/var/www/voting-system/Database_API
EnvironmentFile=/var/www/voting-system/.env
ExecStart=/var/www/voting-system/Database_API/fastapi-env/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create voting user
sudo useradd -r -s /bin/bash voting 2>/dev/null || true
sudo chown -R voting:voting /var/www/voting-system

# Enable and start services
sudo systemctl daemon-reload
sudo systemctl enable voting-express voting-fastapi
sudo systemctl start voting-express voting-fastapi

# Check services
echo ""
echo "✅ Deployment Complete!"
echo "=============================================="
echo ""
echo "Your project is now live at: https://$DOMAIN"
echo ""
echo "Admin Login:"
echo "  Voter ID: admin"
echo "  Password: admin@12345"
echo ""
echo "Test Voters:"
echo "  voter001 / voter123"
echo "  voter002 / voter123"
echo "  voter003 / voter123"
echo ""
echo "Service Status:"
sudo systemctl status voting-express voting-fastapi --no-pager
echo ""
echo "To view logs:"
echo "  sudo journalctl -u voting-express -f"
echo "  sudo journalctl -u voting-fastapi -f"
