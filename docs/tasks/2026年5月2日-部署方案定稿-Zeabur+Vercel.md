# SparkBin 部署方案定稿：Zeabur + Vercel

> 决策时间：2026-05-02 09:45
> 决策人：野忍冬（开发者）+ Claude Code（AI 督战）
> 状态：✅ 方案确认，立即执行

---

## 一、最终架构

```
用户浏览器
    │
    ├─→ Vercel（前端 App）      https://sparkbin-app.vercel.app
    │   └── Vite React SPA（Vercel 原生构建，无需 Docker）
    │
    ├─→ Vercel（Landing 页）    https://sparkbin-landing.vercel.app
    │   └── Next.js 静态导出
    │
    └─→ Zeabur（后端 API）      https://sparkbin-api.zeabur.app
        └── FastAPI Docker 容器（docker/Dockerfile.backend）
            │
            └─→ Zeabur PostgreSQL（同平台，管理方便）
```

---

## 二、为什么选择 Zeabur + Vercel？

### ✅ 采纳理由

| 因素 | Zeabur + Vercel | Render + Vercel（原方案） | 结论 |
|------|-----------------|---------------------------|------|
| **你的熟悉度** | 有成功经验 | 全新平台 | Zeabur 胜 |
| **Dashboard 访问** | 国内访问顺畅 | 需要较强科学上网 | Zeabur 胜 |
| **API 节点位置** | 新加坡/东京 | 美国/欧洲 | Zeabur 胜（延迟更低）|
| **冷启动** | 有（免费 tier） | 有（免费 tier 15分钟休眠）| 平手 |
| **数据库** | 内置 PostgreSQL | 内置 PostgreSQL | 平手 |
| **Docker 支持** | ✅ 原生支持 | ❌ 仅原生 runtime | Zeabur 胜 |
| **社区规模** | 较小但活跃 | 更大更成熟 | Render 胜（但你不缺技术支持）|
| **长期成本** | 按量计费，可控 | $7/月起固定 | 取决于用量，平手 |

### 🔑 关键决策点

1. **项目已有 Dockerfile**：`docker/Dockerfile.backend` 可以直接给 Zeabur 用，无需额外改造
2. **你后期愿意充值**：免费 tier 的限制不构成长期障碍
3. **48 小时时间窗口**：用熟悉的平台 = 减少踩坑时间 = 更高上线成功率

---

## 三、Zeabur 部署注意事项

### 1. Dockerfile 路径问题 ⚠️

**现状**：`docker/Dockerfile.backend` 在子目录下  
**Zeabur 默认行为**：在项目根目录找 Dockerfile  
**解决方案**：已在根目录创建 `zbpack.json` 指定 Dockerfile 路径

```json
// zbpack.json
{
  "build": {
    "dockerfile": "./docker/Dockerfile.backend"
  }
}
```

### 2. 数据库选择

**推荐：Zeabur PostgreSQL**
- 在 Zeabur Dashboard 一键创建
- 同平台管理，环境变量自动注入
- 自动备份（付费 tier）

**备选：Neon PostgreSQL**
- Serverless，免费 tier  generous（500MB 存储）
- 如果 Zeabur PostgreSQL 有问题可以快速切换

### 3. 冷启动与常驻

| 阶段 | 策略 |
|------|------|
| **MVP 上线期** | 接受冷启动（3-10 秒），免费 tier 足够 |
| **有用户后** | 充值 $5-10/月保持实例常驻 |
| **增长期** | 升级到 Zeabur Pro，自动扩缩容 |

### 4. 环境变量清单（Zeabur Web Service）

```bash
DATABASE_URL=<Zeabur PostgreSQL 自动提供或手动填写>
SECRET_KEY=PLrKNYTVPKqMvSHdesSIjMZLEXo46UdO6k05iefq-3H2Ps7_zL801noTyyz2uhI7
ENCRYPTION_KEY=86B-dqIThpDgrhNYHvjlXefzJ1QbXn5wL0lwP5KGsLA=
DEFAULT_USERNAME=admin
DEFAULT_PASSWORD=<你自己设一个强密码>
DEBUG=false
CORS_ORIGINS=https://sparkbin-app.vercel.app,https://sparkbin-landing.vercel.app
ENABLE_PAYMENTS=false
ENABLE_SAAS_FEATURES=false
FRONTEND_URL=https://sparkbin-app.vercel.app
```

### 5. 部署顺序（不能乱）

```
Step 1: Zeabur 创建 PostgreSQL
    ↓
Step 2: Zeabur 部署后端（连接 PostgreSQL）
    ↓
Step 3: 拿到 Zeabur 后端 URL
    ↓
Step 4: Vercel 部署前端（填入后端 URL）
    ↓
Step 5: Vercel 部署 Landing
    ↓
Step 6: 联调测试
```

---

## 四、Vercel 部署注意事项

### 前端 App（Vite）

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Root Directory**: `frontend`
- **环境变量**: `VITE_API_URL=https://你的-zeabur-后端-url.zeabur.app`

### Landing（Next.js 静态导出）

- **Framework Preset**: Next.js
- **Build Command**: `next build`（已在 `next.config.mjs` 中配置 `output: 'export'`）
- **Output Directory**: `dist`
- **Root Directory**: `landing`
- **无需环境变量**

---

## 五、中国大陆开发特别注意事项

| 问题 | 影响范围 | 解决方案 |
|------|----------|----------|
| Zeabur Dashboard 访问 | 你（开发者） | 国内可直接访问，无需额外工具 |
| Vercel Dashboard 访问 | 你（开发者） | 需要科学上网 |
| 产品用户访问（海外） | 目标用户 | **无问题**，亚洲节点延迟优秀 |
| 产品用户访问（国内） | 国内用户 | Vercel 国内慢，但目标用户是 indie hacker（海外为主），可接受 |
| Google OAuth 登录 | 国内用户 | 无法使用，保留用户名密码注册即可 |
| AI API 调用 | 后端功能 | Zeabur 在海外，调用 DeepSeek/Kimi 天然通畅 |

---

## 六、与原 Render 方案的差异

**需要废弃的文件**：
- `render.yaml` → 不再使用（可保留作为备份）
- `backend/runtime.txt` → Render 专用，Zeabur 不需要
- `backend/Procfile` → Render 专用，Zeabur 不需要

**新增/修改的文件**：
- `zbpack.json` → Zeabur 部署配置（指定 Dockerfile 路径）
- `docker/Dockerfile.backend` → 已有，直接用
- `frontend/.env.production` → 更新为 Zeabur 后端 URL
- `backend/.env.production.template` → 更新 Zeabur 相关说明

---

## 七、风险备案

| 风险 | 概率 | 预案 |
|------|------|------|
| Zeabur 构建失败 | 中 | fallback 到 Render（render.yaml 已准备好）|
| Zeabur 免费额度耗尽 | 低 | 按量充值 $5-10 即可 |
| Vercel 构建失败 | 低 | 检查 node 版本（Vercel 默认 Node 18/20）|
| 数据库迁移失败 | 低 | 本地先用 PostgreSQL 测试迁移 |
| CORS 跨域报错 | 高 | 常见，部署后第一时间检查并调整 CORS_ORIGINS |

---

## 八、立即行动清单

### 我（AI）现在做
- [x] 方案定稿文档
- [ ] 创建 `zbpack.json` 配置
- [ ] 更新 `deploy/production` 分支为 Zeabur 方案
- [ ] 更新 `frontend/.env.production` 和 `backend/.env.production.template`

### 你（用户）现在做
- [ ] 登录 Zeabur Dashboard：https://dash.zeabur.com
- [ ] 创建 PostgreSQL 服务
- [ ] 从 GitHub 导入 `sparkbin` 仓库，选择 `deploy/production` 分支
- [ ] 配置环境变量（见第四节）
- [ ] 等待构建完成，复制后端 URL

---

> **督战口令**：方案已定，不再犹豫。Zeabur + Vercel = 熟悉 + 亚洲节点 + Docker 原生支持。现在立刻开始 Step 1。
