# SparkBin 开源发布检查清单

> 从当前状态到 GitHub 公开仓库发布的完整步骤。每完成一步勾选一项。

---

## 第一阶段：法律与品牌（1-2 天）

- [x] **选择开源许可证** — 已从 Elastic License 2.0 更换为 **AGPL-3.0**
  - AGPL-3.0 是 OSI 认可的真正开源许可证
  - 保留网络服务的 Copyleft：任何修改后提供网络服务的，必须开源其修改
  - 与 Elastic License 的保护意图一致，但符合开源定义
- [ ] **确认所有依赖许可证兼容 AGPL-3.0**
  - Python: FastAPI (MIT)、SQLAlchemy (MIT)、Pydantic (MIT) 等全部兼容
  - Node: React (MIT)、Vite (MIT)、Tailwind (MIT) 等全部兼容
  - 注意：若未来引入 GPL-2.0-only 的库，需检查兼容性
- [ ] **检查代码中无硬编码密钥、密码、个人信息**
  - 确认 `.env` 和 `.env.example` 中所有默认值都是安全的占位符
  - 扫描是否有注释中遗留的 API key、测试账号密码
- [ ] **商标声明**
  - README 中明确 "SparkBin" 名称和 Logo 的商标归属
  - 可考虑添加 `TRADEMARK.md` 说明他人可以 Fork 代码但不能使用原品牌名做商业推广

---

## 第二阶段：仓库清理（1 天）

- [ ] **清理 Git 历史中的敏感信息**（如曾误提交的密钥）
  ```bash
  # 使用 git-filter-repo 或 BFG Repo-Cleaner 扫描历史
  git log --all --full-history -S 'sk_live_'  # 搜索 Stripe live key
  git log --all --full-history -S 're_'       # 搜索 Resend key
  ```
- [ ] **删除或归档不需要开源的文件**
  - `prompts/` 目录中的历史提示词文件（可选择性保留或移入私有分支）
  - `frontend/backend_run.err`、`frontend_run.err` 等日志文件（应加入 `.gitignore`）
  - `landing/` 目录若包含未完成的商业页面，评估是否开源
- [ ] **统一 `.gitignore`**
  - 确保根目录 `.gitignore` 覆盖所有子目录的日志、数据库、node_modules、.pyc 等
  - 确保 `.env` 不会被意外提交
- [ ] **整理目录结构**
  - 根目录下的 `start-all.bat`、`stop-all.bat`、`stop-all.ps1` 保留（对 Windows 用户友好）
  - `scripts/` 目录若为空或混乱，整理为 `scripts/dev-start.sh`、`scripts/dev-start.bat`

---

## 第三阶段：文档完善（2-3 天）

- [x] **README.md** — 当前已包含 Quick Start、Features、Tech Stack、Screenshots
  - [ ] 补充：Docker 一键部署的具体命令
  - [ ] 补充：最低系统要求（CPU、内存、磁盘）
  - [ ] 补充：截图占位符替换为真实运行截图
- [x] **SELF_HOSTING.md** — 当前已非常完善
  - [ ] 补充：从 Elastic License 迁移到 AGPL-3.0 的说明
  - [ ] 补充：环境变量完整表格（所有可选/必填项）
- [x] **CONTRIBUTING.md** — 已存在，检查是否需要补充
  - [ ] 补充：Issue 模板和 PR 模板（`.github/ISSUE_TEMPLATE`、`PULL_REQUEST_TEMPLATE.md`）
- [x] **SECURITY.md** — 已存在
  - [ ] 补充：安全更新通知邮箱或 GitHub Security Advisories 开启方式
- [ ] **CHANGELOG.md** — 当前已存在
  - [ ] 采用 [Keep a Changelog](https://keepachangelog.com/) 格式规范化
- [ ] **添加 CODE_OF_CONDUCT.md**
  - 使用 [Contributor Covenant](https://www.contributor-covenant.org/) 标准模板即可
- [ ] **添加 LICENSE 头部注释到关键源文件（可选但推荐）**
  - 在每个 `.py` 和 `.tsx` 文件顶部添加简短版权声明（可用脚本批量处理）

---

## 第四阶段：CI/CD 与自动化（2-3 天）

- [ ] **GitHub Actions：后端测试**
  ```yaml
  # .github/workflows/backend-tests.yml
  # 触发：PR / push to master
  # 步骤：Python 3.11 setup → pip install → pytest
  ```
- [ ] **GitHub Actions：前端构建**
  ```yaml
  # .github/workflows/frontend-build.yml
  # 触发：PR / push to master
  # 步骤：Node 20 setup → npm ci → npm run build
  ```
- [ ] **GitHub Actions：Docker 镜像构建与推送**
  ```yaml
  # .github/workflows/docker-publish.yml
  # 触发：Release published
  # 步骤：Buildx → 推送 ghcr.io/yourname/sparkbin-backend:latest
  #       → 推送 ghcr.io/yourname/sparkbin-frontend:latest
  ```
- [ ] **GitHub Actions：Playwright E2E 测试（可选）**
  - 需要启动后端 + 前端服务，测试环境较复杂，可放在第二阶段 CI 中实现
- [ ] **配置 Dependabot**
  - `.github/dependabot.yml` 自动检查 Python 和 npm 依赖安全更新

---

## 第五阶段：Docker 与部署优化（1-2 天）

- [x] **Dockerfile.backend** — 已优化（非 root 用户、HEALTHCHECK、启动脚本）
- [x] **Dockerfile.frontend** — 当前已合理（多阶段构建、Nginx、API Proxy）
- [x] **docker-compose.yml** — 当前已完整（PostgreSQL + Backend + Frontend）
- [x] **docker-compose.production.yml** — 当前已完整（Caddy + 预构建镜像）
- [ ] **创建 `docker/Caddyfile.example`**（若尚未存在）
  ```
  example.com {
      reverse_proxy frontend:80
      reverse_proxy /api/* backend:8000
  }
  ```
- [ ] **Docker 镜像体积优化（可选）**
  - Backend 可使用 `python:3.11-alpine` 或 `distroless` 进一步缩减
  - 但 slim 已经足够，alpine 可能引入 musl 兼容性问题，建议保持现状
- [ ] **多架构构建（可选）**
  - GitHub Actions 中启用 `linux/amd64,linux/arm64` 支持，方便树莓派/ARM 服务器部署

---

## 第六阶段：发布前测试（1-2 天）

- [ ] **全新环境 Docker 部署测试**
  1. 在全新虚拟机或另一台电脑上 `git clone`
  2. `cp .env.example .env`
  3. 修改 `SECRET_KEY`、`ENCRYPTION_KEY`、`DEFAULT_PASSWORD`
  4. `docker compose up -d`
  5. 访问 `http://localhost`，用 admin / 密码登录
  6. 验证：创建项目 → 添加 Idea → AI 建议（可选）→ 保存
- [ ] **离线模式测试**
  - 不配置任何外部 API key（Resend、Stripe、OAuth、AI）
  - 验证应用核心功能是否正常运行（这是自托管的核心价值主张）
- [ ] **Ollama 本地 AI 测试**
  - 取消注释 `docker-compose.yml` 中的 ollama 服务
  - `docker exec -it sparkbin-ollama ollama pull llama3.2`
  - 在 Admin 面板启用 Ollama，测试 AI 建议功能
- [ ] **数据库迁移测试**
  - 从旧版本数据库备份恢复到新容器，运行 `alembic upgrade head`

---

## 第七阶段：GitHub 仓库设置（1 天）

- [ ] **仓库 Settings → General**
  - 取消 "Wiki"（除非你需要）
  - 开启 "Discussions"（社区交流）
  - 开启 "Sponsorships"（如果你接受赞助）
  - 选择 "Social Preview" 图片（1200x630，展示项目品牌）
- [ ] **仓库 Settings → Branches**
  - 设置 `master` 分支保护规则：PR 必须经过至少 1 个 review 才能合并
  - 开启 "Require status checks to pass before merging"
- [ ] **仓库 Settings → Security**
  - 开启 "Private vulnerability reporting"
  - 开启 "Dependabot alerts" 和 "Dependabot security updates"
- [ ] **仓库 Settings → Actions**
  - 确认 Actions 权限允许读取和写入（用于推送 Docker 镜像到 ghcr.io）
- [ ] **Topics 标签**
  - 添加标签：`project-management`, `ai`, `self-hosted`, `fastapi`, `react`, `indie-hacker`, `productivity`

---

## 第八阶段：首次公开发布（1 天）

- [ ] **创建 Git Tag 和 Release**
  ```bash
  git tag -a v1.0.0 -m "First open-source release"
  git push origin v1.0.0
  ```
- [ ] **在 GitHub 上撰写 Release Notes**
  - 使用 GitHub 自动生成 changelog 功能
  - 手动补充：Docker 部署指南链接、最低配置要求、已知问题
  - 附上 Docker Compose 一键部署命令
- [ ] **推送 Docker 镜像到 GitHub Container Registry**
  - GitHub Actions 自动完成，或手动：
    ```bash
    docker build -f docker/Dockerfile.backend -t ghcr.io/yourname/sparkbin-backend:v1.0.0 .
    docker build -f docker/Dockerfile.frontend -t ghcr.io/yourname/sparkbin-frontend:v1.0.0 .
    docker push ghcr.io/yourname/sparkbin-backend:v1.0.0
    docker push ghcr.io/yourname/sparkbin-frontend:v1.0.0
    ```
- [ ] **发布到社区（可选，根据你的推广计划）**
  - V2EX、HelloGitHub、阮一峰科技周刊投稿
  - Product Hunt（如果是面向海外用户）
  - 个人博客/公众号发布开源公告

---

## 第九阶段：发布后维护（持续）

- [ ] **响应 Issue 和 Discussion**
  - 设定响应时间预期（如 48 小时内回复）
- [ ] **定期发布版本**
  - 采用语义化版本（SemVer）：`MAJOR.MINOR.PATCH`
  - 每 2-4 周一个小版本，累积功能后发布中版本
- [ ] **安全更新**
  - 每月检查 Dependabot alerts
  - 紧急安全漏洞在 7 天内发布补丁版本
- [ ] **文档同步**
  - 每次功能更新同步更新 README 和 SELF_HOSTING.md
  - 保持截图与实际 UI 一致

---

## 当前项目自托管兼容性评估

| 维度 | 状态 | 说明 |
|------|------|------|
| 数据库 | 完全兼容 | SQLite 零配置；PostgreSQL 生产级。均已支持 |
| 外部依赖 | 全部可选 | Stripe、Resend、OAuth、GitHub、AI API 均可留空禁用 |
| 本地 AI | 完全兼容 | Ollama 已在 docker-compose.yml 中预留，可完全离线运行 |
| 构建 | 完全兼容 | Docker Compose 一键启动，无需手动安装 Python/Node |
| 配置 | 完全兼容 | 全部通过 `.env` 文件配置，无明文硬编码 |
| 多租户 | 需注意 | 当前架构为单租户（一个实例服务一个团队）。如需多租户 SaaS，需额外开发 |

---

## 许可证对比（已决策）

| 许可证 | 开源认可 | 允许 SaaS | 要求修改开源 | 适用场景 |
|--------|----------|-----------|--------------|----------|
| MIT | 是 | 是 | 否 | 最大化采用率，不担心商业闭源分叉 |
| Apache-2.0 | 是 | 是 | 否 | 企业友好，专利保护 |
| AGPL-3.0 | 是 | 是（但必须开源） | 是（网络使用也触发） | **已选择** — 保护项目不被云厂商闭源利用 |
| Elastic-2.0 | 否 | 否 | 否 | 旧许可证，禁止托管服务，不符合开源定义 |

**决策理由**：从 Elastic-2.0 迁移到 AGPL-3.0，在保持"防止云厂商免费搭便车"意图的同时，获得 OSI 认可的真正开源身份，有利于社区信任和长期生态建设。
