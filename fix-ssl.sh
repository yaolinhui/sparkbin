#!/bin/bash
set -e

# SparkBin SSL enablement script
# Usage: DOMAIN=api.example.com bash fix-ssl.sh
# Requires: SSL certificate at /etc/letsencrypt/live/${DOMAIN}/

DOMAIN="${DOMAIN:?DOMAIN must be set, e.g. api.example.com}"
APP_DIR="${APP_DIR:-/opt/sparkbin}"

echo "[1/3] Generating Nginx SSL config for ${DOMAIN}..."

cat > "${APP_DIR}/nginx.deploy.conf" << EOF
server {
    listen 80;
    server_name ${DOMAIN};
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl;
    server_name ${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    location / {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /docs {
        proxy_pass http://backend:8000/docs;
    }

    location /openapi.json {
        proxy_pass http://backend:8000/openapi.json;
    }
}
EOF

echo "[2/3] Checking SSL certificates..."
if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo "WARNING: SSL certificate not found at /etc/letsencrypt/live/${DOMAIN}/"
    echo "Obtain a certificate before restarting Nginx, e.g.:"
    echo "  certbot certonly --standalone -d ${DOMAIN}"
    echo "Or use your preferred ACME client."
fi

echo "[3/3] Restarting Nginx container..."
cd "${APP_DIR}"
docker compose -f docker-compose.deploy.yml up -d --force-recreate nginx

echo ""
echo "SSL configuration updated for ${DOMAIN}"
echo "Verify: curl -sf https://${DOMAIN}/health"
