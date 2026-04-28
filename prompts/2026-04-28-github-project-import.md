# GitHub 项目导入功能实现

## 需求背景
用户希望能在新建项目时，通过绑定 GitHub 仓库自动导入项目信息。系统应自动分析仓库内容，识别项目所处阶段，并预填项目字段。

## 技术方案

### 1. 增量 OAuth 授权
- 登录 OAuth 使用 `user:email` scope
- GitHub 仓库导入使用独立的 `public_repo` scope 授权
- 采用 JWT 编码的 state 参数，包含 `oauth: "connect"` 和 `user_id`
- Token 使用 Fernet 加密存储在 `users.github_access_token_encrypted`

### 2. 后端实现
- `backend/app/services/github_import.py`: GitHubImportService
  - `list_repos()`: 分页获取用户公开仓库
  - `fetch_repo_data()`: 抓取 README、描述、topics、stars、issues、releases
  - `analyze_repo()`: 规则预过滤 + AI 提示词分析，返回 title/pain_point/original_idea/stage/confidence
- `backend/app/routers/github.py`: 三个路由
  - `GET /github/repos`: 解密 token 并返回仓库列表
  - `POST /github/preview`: 抓取仓库并返回 AI 分析预览
  - `POST /github/import`: 创建项目 + 6 个阶段，README 写入 IDEA 阶段
- `backend/app/routers/auth.py`: 新增 `/auth/oauth/github/connect` 和 `/auth/oauth/github/connect/callback`

### 3. 前端实现
- `frontend/src/components/GitHubImportModal.tsx`: 三步骤模态框
  - 步骤 1 (repos): 检查连接状态 → 未连接显示 OAuth 按钮 → 已连接显示仓库列表
  - 步骤 2 (preview): 显示 AI 分析结果（标题、痛点、想法、建议阶段、置信度）
  - 步骤 3 (creating): 创建项目并关闭
- `frontend/src/components/CreateProjectModal.tsx`: Step 1 添加「从 GitHub 导入」入口按钮
- `frontend/src/components/ProjectBoard.tsx`: 管理 `GitHubImportModal` 状态，OAuth 成功后自动打开
- `frontend/src/App.tsx`: `OAuthHandler` 处理 `?github_connect=success`，写入 `sessionStorage` 标记
- `frontend/src/services/api.ts`: 新增 `githubApi` 对象和 `getGitHubConnectUrl()`

### 4. 数据库
- `users` 表新增 3 列：
  - `github_access_token_encrypted` (TEXT)
  - `github_token_scope` (VARCHAR(50))
  - `github_token_updated_at` (DATETIME)
- SQLite 兼容性通过 `main.py` 的 `_ensure_sqlite_columns()` 动态添加

### 5. i18n
- 新增 `github.*` 翻译键（zh/en）
- 新增 `action.confirm_create` 翻译键

## 安全考虑
- 所有 GitHub API 调用通过后端代理（前端不接触 token）
- Token 加密存储（Fernet）
- Token 失效时自动清空数据库记录并返回 401
- 遵循 DEC-003：前端永不直接接触第三方 access token

## 测试验证
1. `npm run build` 前端构建通过
2. `python -c "from app.main import app"` 后端导入通过
3. OAuth 回调 URL 正确：`/?github_connect=success`
