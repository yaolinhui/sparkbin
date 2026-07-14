#!/bin/bash
set -e

# SparkBin OAuth 502 问题一键诊断修复脚本
# 适用于：阿里云轻量服务器 + Docker Compose 部署

echo "========================================"
echo "SparkBin 502 问题诊断修复工具"
echo "========================================"
echo ""

APP_DIR="${APP_DIR:-/opt/sparkbin}"
CD="cd $APP_DIR"

echo "[1/6] 检查 Docker 容器状态..."
echo "----------------------------------------"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "sparkbin|NAME" || echo "无 sparkbin 容器"
echo ""

echo "[2/6] 检查后端崩溃日志（最近30行）..."
echo "----------------------------------------"
if docker ps -a --format "{{.Names}}" | grep -q "sparkbin-backend"; then
    docker logs --tail 30 sparkbin-backend 2&1 || echo "无法获取日志"
else
    echo "后端容器不存在！"
fi
echo ""

echo "[3/6] 检查 .env 文件..."
echo "----------------------------------------"
if [ -f "$APP_DIR/.env" ]; then
    echo ".env 文件存在"
    echo "关键变量检查："
    grep -E "^(SECRET_KEY|ENCRYPTION_KEY|POSTGRES_PASSWORD|DEFAULT_PASSWORD|FRONTEND_URL)=" "$APP_DIR/.env" 2>/dev/null | sed 's/=.*/=***/' || echo "未找到关键变量"
else
    echo "警告：$APP_DIR/.env 文件不存在！"
fi
echo ""

echo "[4/6] 检查 nginx 配置..."
echo "----------------------------------------"
if [ -f "$APP_DIR/nginx.deploy.conf" ]; then
    cat "$APP_DIR/nginx.deploy.conf"
else
    echo "nginx.deploy.conf 不存在"
fi
echo ""

echo "[5/6] 直接测试后端健康检查..."
echo "----------------------------------------"
curl -s --max-time 5 http://localhost:8000/health || echo "后端无响应（可能是容器未运行）"
echo ""

echo "[6/6] 检查磁盘空间..."
echo "----------------------------------------"
df -h / | tail -1
echo ""

echo "========================================"
echo "诊断完成"
echo "========================================"
echo ""

# 自动修复：如果后端容器存在但已停止，尝试重启
if docker ps -a --format "{{.Names}} {{.State}}" | grep -q "sparkin-backend exited"; then
    echo "检测到后端容器已停止，尝试重启..."
    cd "$APP_DIR"
    if [ -f ".env" ]; then
        export $(grep -v '^#' .env | xargs)
    fi
    docker-compose -f docker-compose.deploy.yml up -d backend
    echo "后端已重启，请等待 10 秒后测试"
fi

echo ""
echo "下一步建议："
echo "1. 如果日志显示 'SECRET_KEY is not set' → 编辑 $APP_DIR/.env 补全密钥"
echo "2. 如果日志显示数据库连接失败 → 检查 POSTGRES_PASSWORD"
echo "3. 如果 nginx 配置显示 server_name \${DOMAIN} → 重新运行 deploy-server.sh"
echo "4. 如果磁盘使用率 >90% → 清理日志：docker system prune -f"
echo ""
echo "查看实时日志：docker logs -f sparkbin-backend"
