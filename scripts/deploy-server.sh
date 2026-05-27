#!/bin/bash
set -e

# SparkBin 生产环境一键部署脚本
# 适用于：阿里云/腾讯云轻量服务器（Ubuntu 22.04）
# 执行方式：bash deploy-server.sh

echo "========================================"
echo "SparkBin 生产环境部署脚本"
echo "========================================"

# ========== 配置区 ==========
# ⚠️ 安全警告：请勿在脚本中硬编码敏感信息！请通过环境变量传入。
DOMAIN="${DOMAIN:-api-sparkbin.wanchun.me}"
FRONTEND_DOMAIN="${FRONTEND_DOMAIN:-sparkbin.wanchun.me}"
REPO_URL="${REPO_URL:-https://github.com/yaolinhui/sparkbin.git}"
BRANCH="${BRANCH:-deploy/production}"
APP_DIR="${APP_DIR:-/opt/sparkbin}"

# 安全密钥必须从环境变量传入，脚本中不留默认值
SECRET_KEY="${SECRET_KEY:?SECRET_KEY must be set}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:?ENCRYPTION_KEY must be set}"

# ========== Step 1: 系统更新 ==========
echo "[1/8] 更新系统..."
apt-get update -y
apt-get upgrade -y

# ========== Step 2: 安装 Docker ==========
echo "[2/8] 安装 Docker..."
if ! command -v docker &> /dev/null; then
    apt-get install -y ca-certificates curl gnupg lsb-release
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
else
    echo "Docker 已安装，跳过"
fi

# ========== Step 3: 安装 Docker Compose ==========
echo "[3/8] 安装 Docker Compose..."
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# 兼容 docker-compose 和 docker compose
if docker compose version &> /dev/null; then
    COMPOSE="docker compose"
else
    COMPOSE="docker-compose"
fi

# ========== Step 4: 拉取代码 ==========
echo "[4/8] 拉取代码..."
if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/$BRANCH
else
    git clone -b $BRANCH $REPO_URL $APP_DIR
    cd "$APP_DIR"
fi

# ========== Step 5: 构建后端镜像 ==========
echo "[5/8] 构建后端镜像..."
cd "$APP_DIR/backend"
docker build -f ../docker/Dockerfile.backend -t sparkbin-backend:latest .

# ========== Step 6: 创建 docker-compose 文件 ==========
echo "[6/8] 创建部署配置..."
cat > "$APP_DIR/docker-compose.deploy.yml" << 'EOF'
version: "3.8"

services:
  postgres:
    image: postgres:15-alpine
    container_name: sparkbin-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: sparkbin
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}
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
    env_file:
      - .env
    environment:
      DATABASE_URL: postgresql://sparkbin:${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}@postgres:5432/sparkbin
      SECRET_KEY: ${SECRET_KEY}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      DEFAULT_USERNAME: ${DEFAULT_USERNAME:-admin}
      DEFAULT_PASSWORD: ${DEFAULT_PASSWORD:?DEFAULT_PASSWORD must be set}
      API_PORT: 8000
      DEBUG: "false"
      CORS_ORIGINS: ${CORS_ORIGINS:-https://${FRONTEND_DOMAIN}}
      ENABLE_PAYMENTS: "false"
      ENABLE_SAAS_FEATURES: "false"
      FRONTEND_URL: https://${FRONTEND_DOMAIN}
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
    volumes:
      - ./nginx.deploy.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - backend
    networks:
      - sparkbin-net

volumes:
  postgres_data:

networks:
  sparkbin-net:
    driver: bridge
EOF

# ========== Step 7: 创建 Nginx 配置 ==========
echo "[7/8] 创建 Nginx 配置..."
cat > "$APP_DIR/nginx.deploy.conf" << EOF
server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /docs {
        proxy_pass http://backend:8000/docs;
    }

    location /openapi.json {
        proxy_pass http://backend:8000/openapi.json;
    }
}
EOF

# ========== Step 8: 启动服务 ==========
echo "[8/8] 启动服务..."
cd "$APP_DIR"
SECRET_KEY="$SECRET_KEY" ENCRYPTION_KEY="$ENCRYPTION_KEY" POSTGRES_PASSWORD="$POSTGRES_PASSWORD" DEFAULT_PASSWORD="$DEFAULT_PASSWORD" $COMPOSE -f docker-compose.deploy.yml up -d

# ========== 验证 ==========
echo ""
echo "========================================"
echo "部署完成！"
echo "========================================"
echo ""
echo "后端 API: https://${DOMAIN}"
echo "健康检查: https://${DOMAIN}/health"
echo "API 文档: https://${DOMAIN}/docs"
echo ""
echo "下一步:"
echo "1. 配置域名 DNS: ${DOMAIN} → A记录 → 你的服务器IP"
echo "2. 配置 SSL 证书（等域名生效后执行 certbot 或手动配置）"
echo "3. Vercel 部署前端 App: ${FRONTEND_DOMAIN}，环境变量 VITE_API_URL=https://${DOMAIN}"
echo ""
echo "查看日志: docker logs -f sparkbin-backend"
echo "查看状态: docker ps"
echo ""
