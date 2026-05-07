#!/bin/bash
set -e

cd /opt/sparkbin

echo "[1/3] 写入 Nginx SSL 配置..."
cat > nginx.deploy.conf << 'NGINXEOF'
server {
    listen 80;
    server_name api-sparkbin.wanchun.me;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl;
    server_name api-sparkbin.wanchun.me;

    ssl_certificate /etc/letsencrypt/live/api-sparkbin.wanchun.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api-sparkbin.wanchun.me/privkey.pem;

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
NGINXEOF

echo "[2/3] 写入 docker-compose 配置..."
cat > docker-compose.deploy.yml << 'COMPOSEEOF'
services:
  postgres:
    image: postgres:15-alpine
    container_name: sparkbin-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: sparkbin
      POSTGRES_PASSWORD: sparkbin_pass_2024
      POSTGRES_DB: sparkbin
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sparkbin -d sparkbin"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - sparkbin-net

  backend:
    image: sparkbin-backend:latest
    container_name: sparkbin-backend
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://sparkbin:sparkbin_pass_2024@postgres:5432/sparkbin
      SECRET_KEY: \${SECRET_KEY}
      ENCRYPTION_KEY: \${ENCRYPTION_KEY}
      DEFAULT_USERNAME: admin
      DEFAULT_PASSWORD: admin123456
      API_PORT: 8000
      DEBUG: "false"
      CORS_ORIGINS: https://sparkbin.wanchun.me,https://wanchun.me
      ENABLE_PAYMENTS: "false"
      ENABLE_SAAS_FEATURES: "false"
      FRONTEND_URL: https://sparkbin.wanchun.me
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "8000:8000"
    networks:
      - sparkbin-net

  nginx:
    image: nginx:alpine
    container_name: sparkbin-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.deploy.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - backend
    networks:
      - sparkbin-net

volumes:
  postgres_data:

networks:
  sparkbin-net:
    driver: bridge
COMPOSEEOF

echo "[3/3] 重启 Nginx 容器..."
SECRET_KEY="PLrKNYTVPKqMvSHdesSIjMZLEXo46UdO6k05iefq-3H2Ps7_zL801noTyyz2uhI7" \
ENCRYPTION_KEY="86B-dqIThpDgrhNYHvjlXefzJ1QbXn5wL0lwP5KGsLA=" \
docker compose -f docker-compose.deploy.yml up -d --force-recreate nginx

echo ""
echo "等待 3 秒..."
sleep 3

echo ""
echo "验证 HTTPS..."
curl -s https://api-sparkbin.wanchun.me/health && echo "  SSL 配置成功" || echo "  仍然失败"
