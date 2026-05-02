# SparkBin 部署指南：Vercel（前端）+ Zeabur（后端 + 数据库）

## 部署架构

```
用户浏览器
    ↓ HTTPS
Cloudflare CDN（自定义域名）
    ├─→ sparkbin.dev → Vercel（前端 React 静态站点）
    └─→ api.sparkbin.dev → Zeabur（FastAPI 后端 + PostgreSQL）
```

**月预估成本**：$8-15（Zeabur 后端 + 数据库）+ $0（Vercel 前端免费 tier）

---

## Phase 0：前置准备

### 0.1 注册账号

| 平台 | 用途 | 链接 |
|------|------|------|
| Zeabur | 后端 + 数据库托管 | https://zeabur.com |
| Vercel | 前端静态站点托管 | https://vercel.com |
| Cloudflare | 域名 + DNS + CDN | https://cloudflare.com |
| Resend | 邮件发送（SaaS 模式必需） | https://resend.com |
| Stripe | 支付收款 | https://stripe.com |

### 0.2 购买域名

推荐 Namecheap 或 Cloudflare Registrar：
- 主域名：`sparkbin.dev`（约 $12/年）
- 子域名规划：
  - `www.sparkbin.dev` → Vercel（前端）
  - `api.sparkbin.dev` → Zeabur（后端）

### 0.3 本地代码确认

确保代码已 push 到 GitHub 仓库：

```bash
cd /c/Code/Ideas/SparkBin
git status  # 确认无未提交修改
git push origin master
```

---

## Phase 1：后端部署到 Zeabur

### 1.1 创建 PostgreSQL 数据库

1. 登录 Zeabur Dashboard → 创建新项目 `sparkbin-prod`
2. 点击 "Add Service" → 选择 "Marketplace" → PostgreSQL
3. 等待数据库创建完成
4. 进入 PostgreSQL 服务 → "Connection" 标签
5. 复制 `DATABASE_URL`（格式：`postgres://user:pass@host:port/dbname`）

**保存 DATABASE_URL，后续步骤需要。**

### 1.2 配置后端 Dockerfile

确认 `docker/Dockerfile.backend` 内容：

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Expose FastAPI port
EXPOSE 8000

# Run migrations then start server
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 1.3 创建 Zeabur 部署配置

在仓库根目录创建 `zeabur.yaml`：

```yaml
version: "v2"
services:
  backend:
    name: sparkbin-backend
    type: Dockerfile
    Dockerfile: docker/Dockerfile.backend
    ports:
      - port: 8000
        targetPort: 8000
    env:
      - key: DATABASE_URL
        value: ${DATABASE_URL}
      - key: SECRET_KEY
        value: ${SECRET_KEY}
      - key: ENCRYPTION_KEY
        value: ${ENCRYPTION_KEY}
      - key: RESEND_API_KEY
        value: ${RESEND_API_KEY}
      - key: STRIPE_SECRET_KEY
        value: ${STRIPE_SECRET_KEY}
      - key: STRIPE_WEBHOOK_SECRET
        value: ${STRIPE_WEBHOOK_SECRET}
      - key: FRONTEND_URL
        value: ${FRONTEND_URL}
      - key: DEPLOYMENT_MODE
        value: saas
      - key: ENABLE_PAYMENTS
        value: true
      - key: CREDITS_GRANT_ON_REGISTER
        value: 20
```

### 1.4 配置环境变量

在 Zeabur Dashboard → 项目 → Backend 服务 → Environment Variables 添加：

```env
# 数据库（自动注入或手动填写）
DATABASE_URL=postgres://...（从 Phase 1.1 复制）

# 安全密钥（必须生成强随机字符串，至少 32 字符）
SECRET_KEY=your-64-char-random-secret-key-here-change-me
ENCRYPTION_KEY=your-32-byte-encryption-key-here!

# SaaS 模式
DEPLOYMENT_MODE=saas
ENABLE_PAYMENTS=true
ENABLE_SAAS_FEATURES=true
CREDITS_GRANT_ON_REGISTER=20

# 邮件（Resend）
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@sparkbin.dev

# Stripe 支付（测试模式先用 sk_test_xxx）
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
APP_URL=https://api.sparkbin.dev

# OAuth（可选，初期可关闭）
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
FRONTEND_URL=https://www.sparkbin.dev

# CORS
CORS_ORIGINS=https://www.sparkbin.dev,https://sparkbin.dev

# 默认管理员（首次启动后强制修改密码）
DEFAULT_USERNAME=admin
DEFAULT_PASSWORD=changeme-immediately

# API 端口
API_PORT=8000
```

**生成安全密钥命令**：

```bash
# 在本地终端执行
python -c "import secrets; print(secrets.token_hex(32))"  # SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"  # ENCRYPTION_KEY
```

### 1.5 部署后端

1. Zeabur Dashboard → 项目 → "Deploy from GitHub"
2. 选择 `yaolinhui/sparkbin` 仓库
3. 选择分支 `master`
4. Zeabur 自动识别 `zeabur.yaml` 并部署
5. 等待部署完成（约 2-3 分钟）

### 1.6 绑定自定义域名

1. Zeabur Dashboard → Backend 服务 → "Domains"
2. 添加自定义域名：`api.sparkbin.dev`
3. 按提示添加 DNS 记录（CNAME 到 Zeabur 提供的地址）
4. 等待 SSL 证书自动颁发（约 1-2 分钟）

### 1.7 验证后端部署

```bash
# 检查健康状态
curl https://api.sparkbin.dev/docs
# 应返回 Swagger UI HTML

# 检查 API 可用性
curl https://api.sparkbin.dev/health
# 应返回 {"status":"ok"}
```

---

## Phase 2：前端部署到 Vercel

### 2.1 配置 API 基础地址

编辑 `frontend/.env.production`：

```env
VITE_API_URL=https://api.sparkbin.dev
```

如果没有该文件，创建它：

```bash
cd /c/Code/Ideas/SparkBin/frontend
echo "VITE_API_URL=https://api.sparkbin.dev" > .env.production
```

### 2.2 创建 Vercel 配置

在 `frontend/` 目录创建 `vercel.json`：

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 2.3 Push 配置到仓库

```bash
cd /c/Code/Ideas/SparkBin
git add frontend/.env.production frontend/vercel.json zeabur.yaml
git commit -m "infra: add Vercel + Zeabur deployment config"
git push origin master
```

### 2.4 部署前端

1. 登录 Vercel Dashboard → "Add New Project"
2. 导入 `yaolinhui/sparkbin` 仓库
3. Framework Preset：选择 "Vite"
4. Root Directory：`frontend`
5. Build Command：`npm run build`
6. Output Directory：`dist`
7. Environment Variables：添加 `VITE_API_URL=https://api.sparkbin.dev`
8. 点击 "Deploy"

### 2.5 绑定自定义域名

1. Vercel Dashboard → 项目 → "Domains"
2. 添加 `www.sparkbin.dev`
3. 按提示配置 DNS（CNAME 到 `cname.vercel-dns.com`）

### 2.6 验证前端部署

```bash
curl https://www.sparkbin.dev
# 应返回 HTML 页面，非 404
```

---

## Phase 3：Cloudflare DNS 配置

### 3.1 添加 DNS 记录

在 Cloudflare Dashboard → DNS → Records：

| Type | Name | Content | Proxy Status |
|------|------|---------|-------------|
| CNAME | www | cname.vercel-dns.com | Proxied |
| CNAME | api | [Zeabur 提供的 CNAME] | Proxied |
| A | @ | [Vercel Anycast IP，或 CNAME 到 www] | Proxied |

### 3.2 强制 HTTPS

Cloudflare Dashboard → SSL/TLS → Overview → 选择 "Full (strict)"

### 3.3 国内访问优化（可选）

Cloudflare Dashboard → Speed → Optimization → 开启：
- Auto Minify（HTML/CSS/JS）
- Brotli
- Early Hints

---

## Phase 4：Stripe 支付配置（SaaS 模式）

### 4.1 创建 Stripe Webhook Endpoint

1. Stripe Dashboard → Developers → Webhooks → "Add endpoint"
2. Endpoint URL：`https://api.sparkbin.dev/webhooks/stripe`
3. 选择事件：
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.deleted`
4. 复制 Signing Secret → 填入 Zeabur 环境变量 `STRIPE_WEBHOOK_SECRET`

### 4.2 配置 Stripe 产品

1. Stripe Dashboard → Products → "Add product"
2. 创建充值套餐：
   - 100 AI 额度 - $5
   - 250 AI 额度 - $10
   - 600 AI 额度 - $20
3. 复制 Price IDs → 填入后端配置

---

## Phase 5：自托管版部署（Docker Compose）

为开源用户提供一键自托管方案：

### 5.1 创建 `docker-compose.yml`

在仓库根目录：

```yaml
version: "3.8"

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: sparkbin
      POSTGRES_PASSWORD: sparkbin
      POSTGRES_DB: sparkbin
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build:
      context: .
      dockerfile: docker/Dockerfile.backend
    environment:
      DATABASE_URL: postgresql://sparkbin:sparkbin@db:5432/sparkbin
      SECRET_KEY: ${SECRET_KEY:-change-me-in-production}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY:-change-me-in-production}
      DEPLOYMENT_MODE: selfhosted
      ENABLE_PAYMENTS: false
      ENABLE_SAAS_FEATURES: false
      CREDITS_GRANT_ON_REGISTER: 0
      FRONTEND_URL: http://localhost:5173
      CORS_ORIGINS: http://localhost:5173,http://localhost:5174
      DEFAULT_USERNAME: admin
      DEFAULT_PASSWORD: ${DEFAULT_PASSWORD:-admin}
    ports:
      - "8000:8000"
    depends_on:
      - db

  frontend:
    build:
      context: .
      dockerfile: docker/Dockerfile.frontend
    environment:
      VITE_API_URL: http://localhost:8000
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### 5.2 自托管一键启动命令

```bash
# 用户执行
git clone https://github.com/yaolinhui/sparkbin.git
cd sparkbin
cp .env.example .env
# 编辑 .env 设置 SECRET_KEY, ENCRYPTION_KEY, DEFAULT_PASSWORD
docker compose up -d
# 打开 http://localhost
# 登录: admin / 你设置的 DEFAULT_PASSWORD
```

---

## Phase 6：部署验证清单

### 6.1 核心功能验证

| 检查项 | 命令 / 操作 | 预期结果 |
|--------|------------|---------|
| 前端可访问 | `curl https://www.sparkbin.dev` | 返回 200 HTML |
| 后端 API 可用 | `curl https://api.sparkbin.dev/docs` | Swagger UI |
| 数据库连接 | 注册一个测试账号 | 成功写入 |
| 邮箱发送 | 注册后检查 Resend Dashboard | 有发送记录 |
| Stripe 支付 | 用测试卡 `4242 4242 4242 4242` | 支付成功，额度到账 |
| AI 调用 | 在 idea 阶段点击 "AI 建议" | 正常返回建议 |

### 6.2 安全验证

- [ ] 默认管理员密码已修改
- [ ] SECRET_KEY 和 ENCRYPTION_KEY 不是默认值
- [ ] Stripe Webhook 签名验证已启用
- [ ] Cloudflare SSL 设置为 Full (strict)
- [ ] 后端 CORS 只允许前端域名

---

## Phase 7：上线后监控

### 7.1 设置 Uptime 监控

注册 UptimeRobot（免费）：
- 监控 `https://www.sparkbin.dev`
- 监控 `https://api.sparkbin.dev/health`
- 宕机时发送邮件/钉钉/微信通知

### 7.2 设置日志监控

Zeabur Dashboard 自带日志查看，建议：
- 关注 500 错误频率
- 关注 AI API 调用异常（DeepSeek/Kimi 不可用）
- 关注注册频率（防止被刷）

### 7.3 成本控制预警

| 项目 | 免费额度 | 预警阈值 |
|------|---------|---------|
| Zeabur | $5 试用金 | 月消费 > $20 |
| Resend | 3000 封/天 | 日发送 > 1000 |
| Stripe | 无月费 | 关注退款率 > 5% |
| AI API | 按量付费 | 日调用 > 1000 次 |

---

## 回滚方案

如果部署失败：

```bash
# Zeabur 回滚
# Dashboard → 项目 → Deployments → 选择上一个成功的部署 → Redeploy

# 数据库回滚（迁移失败时）
docker compose exec db psql -U sparkbin -d sparkbin
# 手动执行 downgrade：alembic downgrade -1

# 前端回滚
# Vercel Dashboard → 项目 → Deployments → 选择上一个版本 → Promote to Production
```

---

## 附录：环境变量速查表

| 变量 | SaaS 值 | Selfhosted 值 | 说明 |
|------|---------|---------------|------|
| `DEPLOYMENT_MODE` | `saas` | `selfhosted` | 部署模式 |
| `ENABLE_PAYMENTS` | `true` | `false` | 支付功能开关 |
| `ENABLE_SAAS_FEATURES` | `true` | `false` | SaaS 专属功能 |
| `CREDITS_GRANT_ON_REGISTER` | `20` | `0` | 注册赠送额度 |
| `REQUIRE_EMAIL_VERIFICATION` | `true` | `false` | 强制邮箱验证 |
| `DATABASE_URL` | Zeabur PostgreSQL | Docker PostgreSQL | 数据库连接 |
| `FRONTEND_URL` | `https://www.sparkbin.dev` | `http://localhost:5173` | 前端地址 |

---

## 下一步行动

1. [ ] 注册 Zeabur / Vercel / Cloudflare / Resend / Stripe 账号
2. [ ] 购买域名 `sparkbin.dev`
3. [ ] 配置 Zeabur PostgreSQL 数据库
4. [ ] 在 Zeabur 部署后端并绑定 `api.sparkbin.dev`
5. [ ] 在 Vercel 部署前端并绑定 `www.sparkbin.dev`
6. [ ] 配置 Cloudflare DNS + SSL
7. [ ] 配置 Stripe Webhook
8. [ ] 执行部署验证清单
9. [ ] 设置 UptimeRobot 监控
10. [ ] 上线 🚀
