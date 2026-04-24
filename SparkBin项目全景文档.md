# SparkBin 项目全景文档

> **文档用途**：每次新开 AI 对话窗口时，首先将此文件作为上下文输入，让 AI 快速、准确地理解本项目的全部信息，避免重复沟通成本。
>
> **更新时间**：2026-04-24 15:02:26
> **项目路径**：`C:\Code\Ideas\SparkBin`

---

## 一、项目概述

**SparkBin** 是一个面向 Vibe 开发者 / 独立开发者（Indie Hacker）的项目创意管理工具，帮助用户将想法（Idea）系统地推进到变现（Monetize）的六个阶段。项目采用 **前后端分离架构**。

- **产品定位**：个人创意 / 点子深度规划看板，AI 辅助的项目生命周期管理平台
- **设计风格**：Brutalist（粗野主义）—— 等宽字体（JetBrains Mono）、零圆角边框、高对比度、深色/浅色双主题
- **核心流程**：想法(IDEA) → 验证(VALIDATE) → 原型(PROTOTYPE) → 发布(SHIP) → 增长(GROW) → 变现(MONETIZE)

---

## 二、技术栈

### 前端
| 层级 | 技术 |
|------|------|
| 构建工具 | Vite 5.x（端口 5173） |
| UI 框架 | React 18 + TypeScript |
| 路由 | react-router-dom 6.x |
| 样式 | Tailwind CSS 3.4 + 自定义 CSS 变量（主题系统） |
| 状态管理 | Zustand |
| 拖拽 | @dnd-kit/core & sortable |
| 富文本 | TipTap (@tiptap/react + starter-kit) |
| 国际化 | 自建 i18n（zh / en） |
| 支付 | Stripe Test Mode |

### 后端
| 层级 | 技术 |
|------|------|
| Web 框架 | FastAPI 0.109.2 |
| 服务器 | Uvicorn 0.27.1 |
| ORM | SQLAlchemy 2.0.27 |
| 迁移 | Alembic 1.13.1 |
| 数据库 | PostgreSQL（生产）/ SQLite（本地开发） |
| 认证 | JWT (python-jose) + bcrypt (passlib) |
| 加密 | cryptography (Fernet) |
| HTTP 客户端 | httpx 0.27.0 |
| 支付 | Stripe 9.12.0（测试模式） |
| 配置 | Pydantic Settings 2.1.0 |

---

## 三、项目目录结构

```
C:\Code\Ideas\SparkBin/
├── AGENTS.md                         # AI 助手系统指令与代码规范
├── start-all.bat                     # 一键启动前后端
├── stop-all.bat                      # 一键停止前后端
├── update_api.ts                     # API 更新脚本
├── SparkBin项目全景文档.md            # ← 本文件
├── docs/
│   └── VIBE_WORKFLOW_DESIGN.md       # Vibe 工作流产品设计文档
├── frontend/                         # React 前端项目
│   ├── src/
│   │   ├── components/               # 全部 UI 组件（见下文详细列表）
│   │   ├── hooks/                    # 自定义 Hooks
│   │   ├── i18n/                     # 国际化（zh/en）
│   │   ├── services/                 # API 调用层 + AI 业务逻辑 + GitHub 备份
│   │   ├── stores/                   # Zustand 状态管理
│   │   ├── theme/                    # 主题系统（light/dark）
│   │   ├── types/                    # TypeScript 类型定义
│   │   ├── utils/                    # 工具函数
│   │   ├── App.tsx                   # 路由 + 登录态
│   │   ├── main.tsx                  # 应用挂载点
│   │   └── index.css                 # 全局 Brutalist 样式系统
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
├── backend/                          # FastAPI 后端项目
│   ├── app/
│   │   ├── main.py                   # FastAPI 入口
│   │   ├── config.py                 # 配置管理（Pydantic Settings）
│   │   ├── database.py               # SQLAlchemy 数据库连接
│   │   ├── models.py                 # 数据库模型定义
│   │   ├── schemas.py                # Pydantic 数据校验模型
│   │   ├── auth.py                   # JWT / bcrypt 认证
│   │   ├── encryption.py             # Fernet API Key 加密
│   │   ├── routers/                  # 路由层
│   │   │   ├── auth.py               # 认证路由（登录/登出/改密）
│   │   │   ├── projects.py           # 项目 CRUD 路由
│   │   │   ├── ai.py                 # AI 聊天/配置路由（SSE 流式）
│   │   │   ├── admin.py              # 管理后台路由
│   │   │   └── payments.py           # Stripe 支付路由
│   │   └── services/                 # 服务层
│   │       ├── ai_proxy.py           # AI 代理服务（DeepSeek/Kimi/豆包/OpenAI）
│   │       ├── logger.py             # 操作日志服务
│   │       └── stage_context.py      # 阶段上下文评估与 AI Prompt 构建
│   ├── alembic/                      # 数据库迁移
│   ├── start.py                      # 启动脚本
│   ├── requirements.txt
│   ├── .env                          # 环境变量（敏感）
│   └── .env.example                  # 环境变量模板
└── .git/                             # Git 仓库
```

---

## 四、前端所有文件功能详细列表

### 入口与全局
| 文件 | 功能 |
|------|------|
| `src/main.tsx` | React 应用挂载点，包裹 ThemeProvider → I18nProvider → App |
| `src/App.tsx` | BrowserRouter 路由管理：`/`→ProjectBoard, `/project/:id`→ProjectDetail, `/admin`→AdminPage；登录态校验（authApi.getMe()），未登录显示 LoginModal |
| `src/index.css` | Brutalist 设计系统全局样式：CSS 变量（暗色/浅色）、工具类（btn-brutal, panel-brutal）、动画（blink, pulse-glow）、React Flow / TipTap 自定义样式 |
| `src/vite-env.d.ts` | 声明 `VITE_API_URL` 环境变量 |

### 类型定义 `src/types/index.ts`
- 定义全部核心类型：`StageKey`, `Project`, `Stages`, `ValidationItem`, `Feature`, `PlatformContent`, `ContentItem`, `PricingTier`, `FunnelMetrics`, `AIPetConfig` 等
- 常量：`STAGE_LABELS`, `STAGE_ORDER`, `STATUS_LABELS`

### 服务层 `src/services/`
| 文件 | 功能 |
|------|------|
| `api.ts` | 统一后端 API 调用：认证(authApi)、项目(projectsApi)、AI(aiApi)、支付(paymentsApi)、管理(adminApi)；通用 `request<T>` 封装 + JWT token 解析 |
| `ai.ts` | AI 业务逻辑层（前端不接触 API Key，全部走后端代理）：`AIService` 类，包含流式聊天、阶段上下文、各类生成方法（优化痛点、阶段建议、验证工具、设计提示词、平台内容、变现分析等） |
| `github.ts` | GitHub API 备份服务：通过 PAT 读写仓库 JSON 文件（getData / saveData / getFileSha） |

### 状态管理 `src/stores/`
| 文件 | 功能 |
|------|------|
| `projectStore.ts` | Zustand：管理项目列表、GitHub 配置、加载状态；actions：fetchProjects, createProject, updateProject, deleteProject, updateStageContent, completeStage, reopenStage, 推广任务增删改查 |
| `aiStore.ts` | Zustand：管理 AI 提供商配置、是否已配置；从 localStorage 读取保存的 provider |

### 国际化 `src/i18n/`
| 文件 | 功能 |
|------|------|
| `context.tsx` | 定义 Language 类型和 I18nContextType |
| `hooks.ts` | `useI18n()`, `useStageLabel()`, `useStatusLabel()` |
| `index.tsx` | I18nProvider：完整 zh/en 双语翻译字典，点号路径查找（如 `stage.idea`），持久化到 localStorage |

### 主题系统 `src/theme/`
| 文件 | 功能 |
|------|------|
| `context.tsx` | Theme 类型定义 |
| `hooks.ts` | `useTheme()` hook |
| `index.tsx` | ThemeProvider：默认暗色，持久化到 localStorage，切换时设置 `data-theme` 属性；配合 index.html 防闪烁脚本 |

### Hooks `src/hooks/`
| 文件 | 功能 |
|------|------|
| `useToast.ts` | Toast 状态 hook：`showToast(message, type)`, `hideToast()` |

### 组件层 `src/components/`（按功能分组）

#### 核心页面组件
| 文件 | 功能 |
|------|------|
| `ProjectBoard.tsx` | 项目仪表盘（首页）：终端风格 Header、Metrics Bar（总项目/活跃/暂停/归档筛选）、项目网格（ProjectCard）、归档折叠面板、右下角 AI 宠物互动 |
| `ProjectDetail.tsx` | 项目详情页（六阶段编辑器）：可折叠 Header、StageFlow 阶段导航、左侧阶段编辑器、右侧 AIChat（可折叠/全屏）、同步系统（AI 内容结构化写入左侧）、删除保护 |
| `AdminPage.tsx` | 系统管理后台（仅 admin 可见）：AI 服务配置（DeepSeek/Kimi/豆包/OpenAI）、操作日志表格 |

#### 阶段组件（六阶段）
| 文件 | 功能 |
|------|------|
| `IdeaStage.tsx` | **想法阶段**：便利贴墙，@dnd-kit 拖拽排序，五种颜色便利贴，默认五个维度（核心痛点/目标用户/使用场景/解决方案/差异化价值），AI 建议按钮 |
| `ValidateStage.tsx` | **验证阶段**：三列看板（待验证/进行中/已验证，DnD 拖拽），验证项（标题/描述/结果录入），验证工具箱（问卷/访谈/社区/竞品），GO/NO-GO 决策系统 |
| `PrototypeStage.tsx` | **原型阶段**：三步向导（选择平台→挑选模板→功能开发），功能清单（P0/P1/P2，todo/doing/done，截图上传），AI 生成设计提示词，发布检查清单 |
| `ShipStage.tsx` | **发布阶段**：发布检查清单，多平台文案生成（小红书/Twitter/ProductHunt/即刻/V2EX/公众号），发布后数据指标，用户反馈收集（星级+来源+内容），闭环流转（反馈转功能项） |
| `GrowStage.tsx` | **增长阶段**：内容日历（周视图+月视图切换），内容类型（教程/展示/故事/技术/技巧），渠道效果面板（6 个渠道的新增/累计/转化率），AI 生成内容标题 + 增长分析 |
| `MonetizeStage.tsx` | **变现阶段**：收入概览（MRR/累计收入/付费用户），变现策略，定价方案多档位卡片，转化漏斗（访客→注册→试用→付费），Stripe Test Mode 集成 |

#### AI 与交互组件
| 文件 | 功能 |
|------|------|
| `AIChat.tsx` | 核心 AI 聊天组件：侧边栏/全屏双模式，流式消息渲染（ReactMarkdown），快捷操作按钮，消息动作（同步到左侧/采用下一轮问题），宠物配置驱动回复风格 |
| `AIPetConfig.tsx` | AI 宠物领养配置弹窗：10 种宠物、4 种性格、3 种话痨程度，实时预览 |
| `AIPetConfig.constants.ts` | 宠物数据常量 + `getContextDialogue()`：根据项目状态/完成度/阶段/空内容/性格生成上下文感知台词 |
| `ModelSelector.tsx` / `ModelSelectorModal.tsx` | 模型选择器按钮 + 弹窗，从后端拉取可用提供商列表，同步用户首选模型 |
| `SnakeLoader.tsx` | 创建项目加载动画：SVG 贪吃蛇沿边框爬行 + 终端窗口模拟系统日志输出 + 进度条 |

#### 编辑器与内容组件
| 文件 | 功能 |
|------|------|
| `RichTextEditor.tsx` | 基于 TipTap 的富文本编辑器：Bold/Italic/列表/占位符/只读模式 |
| `SafeMarkdown.tsx` | 安全 Markdown 渲染：rehype-sanitize 过滤危险 HTML，禁用 script/iframe/form |
| `ImageUpload.tsx` | 图片上传组件：FileReader 转 Base64，限制 2MB，缩略图预览 + 删除 |
| `MonthView.tsx` | 月视图日历（date-fns）：中文本地化，显示内容计划分布，点击日期快速添加内容 |

#### 配置与系统组件
| 文件 | 功能 |
|------|------|
| `LoginModal.tsx` | 登录弹窗（全屏覆盖）：用户名/密码表单，JWT 存储到 localStorage，默认 admin/admin |
| `GitHubConfigModal.tsx` | GitHub 备份配置：PAT/Owner/Repo/Path 输入，测试连接，保存后触发 loadFromGitHub |
| `AIConfigModal.tsx` | AI 配置弹窗（普通用户版）：提供商选择网格，API Key/Base URL/Model 输入，保存并测试 |
| `ThemeSwitcher.tsx` | 主题切换按钮（Sun/Moon） |
| `LanguageSwitcher.tsx` | 语言切换按钮（中文/EN） |
| `Toast.tsx` | 全局 Toast 通知（success/error/info），底部居中自动关闭 |
| `Skeleton.tsx` | 四种骨架屏：SkeletonCard, SkeletonText, SkeletonNote, SkeletonTable |

#### 视图与流程组件
| 文件 | 功能 |
|------|------|
| `ProjectCard.tsx` | 项目卡片：编号（001, 002...）、当前阶段编号、标题、痛点描述、进度条、状态指示器（活跃/暂停/归档），compact 模式 |
| `StageFlow.tsx` | 阶段流程导航条：六个阶段按钮（01-06），当前阶段高亮青色，已完成绿色，进度百分比条，提交阶段按钮 |
| `ProjectBlueprint.tsx` | 项目蓝图（全屏分析面板）：六阶段完成度/阻塞数/更新时间卡片、目标vs实际天数时间轴、阶段目标与退出标准检查清单、阻塞项列表、下一步动作、数据快照 |
| `PricingPreview.tsx` | Stripe Pricing Page 预览弹窗：三列定价卡片，调用 paymentsApi.createCheckoutSession 跳转 Stripe Checkout（Test Mode） |
| `PaymentResultModal.tsx` | 支付结果弹窗：成功显示订阅状态，取消提示无扣款 |
| `CreateProjectModal.tsx` | 创建项目弹窗：三步流程输入想法 |

#### 其他
| 文件 | 功能 |
|------|------|
| `components/index.ts` | 统一命名导出所有组件 |

---

## 五、后端所有文件功能详细列表

### 入口与配置
| 文件 | 功能 |
|------|------|
| `start.py` | 启动入口：`uvicorn.run("app.main:app", host="0.0.0.0", port=settings.api_port, reload=True)` |
| `app/main.py` | FastAPI 入口：lifespan 管理（init_database），CORS，路由挂载（/auth, /projects, /ai, /admin, /payments），根路由 /health |
| `app/config.py` | Settings 类（Pydantic Settings）：数据库、安全密钥、管理员、API、GitHub、Stripe 配置；提供 `get_settings()`（LRU 缓存）和 `get_cors_origins()` |
| `app/database.py` | SQLAlchemy：支持 SQLite（check_same_thread=False）和 PostgreSQL，SessionLocal + declarative_base()，`get_db()` 依赖注入 |

### 数据层
| 文件 | 功能 |
|------|------|
| `app/models.py` | SQLAlchemy 模型：User, Project, Stage, PromoteTask, PromoteSuggestion, AIConfig, AICallLog, OperationLog；枚举：ProjectStatus, StageKey, AIProvider, UserRole |
| `app/schemas.py` | Pydantic V2 模型：全部 API 出入参定义（LoginRequest/Response, ProjectBase/Create/Update/Info/Detail, AIChatRequest, CheckoutRequest 等） |

### 认证与安全
| 文件 | 功能 |
|------|------|
| `app/auth.py` | bcrypt 密码哈希/校验，JWT HS256 创建/解码（默认 7 天），`get_current_user()` FastAPI Depends，`init_default_user()` 启动时创建默认管理员 |
| `app/encryption.py` | EncryptionManager 单例：cryptography.fernet.Fernet 加密/解密 API Key；密钥派生逻辑（PBKDF2HMAC / SHA256） |

### 路由层 `app/routers/`
| 文件 | 功能 |
|------|------|
| `auth.py` | `/auth`：POST /login（返回 JWT），POST /logout，POST /change-password，GET /me，GET/PUT /preferred-model |
| `projects.py` | `/projects`：项目 CRUD 核心。GET /（列表，按 status 过滤，排除软删除），POST /（创建，自动创建 6 阶段），GET/PUT/DELETE /{id}，PUT /{id}/status，PUT /{id}/stages/{stage_key}/content，POST /{id}/stages/{stage_key}/complete（解锁下一阶段），POST /{id}/stages/{stage_key}/reopen，推广任务增删改 |
| `ai.py` | `/ai`：GET /ping，GET /providers，GET /configs，PUT /configs/{provider}，POST /test/{provider}，**POST /chat（核心 SSE 流式聊天）**——支持阶段上下文注入、阶段原生格式验证（【阶段事实】【关键缺口】【下一步动作】【可同步JSON】）、自动重试、提取 sync_payload/next_question，GET /stage-context，POST /promote-suggest，GET /call-logs |
| `payments.py` | `/payments`：POST /create-checkout-session（Stripe Test Mode，month/year/lifetime），GET /subscription-status，POST /webhook（校验签名，处理 checkout.session.completed / subscription.updated 等事件） |
| `admin.py` | `/admin`：GET /logs（操作日志列表，limit=100） |

### 服务层 `app/services/`
| 文件 | 功能 |
|------|------|
| `ai_proxy.py` | AIProxyService：4 个提供商默认配置，get_active_config，decrypt_api_key，test_connection，chat_completion（异步生成器，httpx 60 秒超时，SSE 错误处理，记录 AICallLog），generate_promote_suggestions，init_default_ai_configs |
| `logger.py` | OperationLogger：通用日志记录，log_create / log_update / log_delete 便捷方法 |
| `stage_context.py` | 阶段上下文评估引擎：_evaluate_idea / validate / prototype / ship / grow / monetize，evaluate_stage_content，build_stage_snapshot，build_stage_native_system_prompt（固定四段格式），validate_stage_native_response，extract_sync_payload_structured / sync_payload，extract_next_round_question |

### 迁移 `alembic/`
| 文件 | 功能 |
|------|------|
| `env.py` | 标准 Alembic 环境，动态读取 database_url |
| `versions/88edf4721b21_add_user_preferred_model.py` | 添加 preferred_model 列 |
| `versions/add_user_security_fields.py` | 添加 require_password_change, last_login_at |
| `versions/add_user_subscription_fields.py` | 添加 subscription_status, stripe_customer_id, stripe_subscription_id, current_tier_id |

---

## 六、代码规范（来自 AGENTS.md）

1. **导出方式**：全部使用命名导出（`export function`），禁止使用默认导出
2. **类型偏好**：优先使用 `interface` 而非 `type`
3. **错误处理**：使用 `Result<T, E>` 模式而非 try-catch
4. **路径别名**：`@/*` 映射到 `src/*`
5. **主题系统**：CSS 变量 + `data-theme` 属性，无闪烁加载
6. **Brutalist 风格**：全局 `border-radius: 0`，等宽字体，高对比度边框
7. **新增依赖**：需检查 bundle size 影响
8. **禁忌**：禁止在代码中写死 API keys（使用 env 变量），禁止修改 migrations 文件夹下的文件，禁止运行 `rm -rf` 或 `git push --force`

---

## 七、启动方式

### 一键启动
```bat
start-all.bat
```
- 设置 UTF-8 编码，禁用代理
- 启动后端：`python backend/start.py`（端口 8000，API 文档 /docs）
- 等待 5 秒后启动前端：`npm run dev`（默认端口 5173）
- 默认账号：`admin / admin`

### 一键停止
```bat
stop-all.bat
```
- 强制终止所有 node.exe、python.exe、python3.exe 进程

### 单独启动
- **后端**：`cd backend && python start.py`
- **前端**：`cd frontend && npm run dev`

---

## 八、AI 协作工作方案（重要！）

> 以下内容描述了人类开发者与 AI 助手协作优化本项目的标准工作流程。每次新开对话窗口时，AI 必须首先理解此方案，确保协作方式一致。

### 8.1 工作流程概述

每次优化项目遵循以下步骤：

1. **需求讨论阶段**：人类开发者向 AI 描述本次需要优化的内容，双方通过多轮对话讨论方案、技术选型、实现细节。
2. **方案确定阶段**：讨论完成后，形成明确的实现方案（包括修改哪些文件、如何修改、验收标准）。
3. **记录归档阶段**：将本次讨论确定的方案记录到 `docs/序号-YYYY年M月D日HH时MM分SS秒-任务名称.md` 文件中。
4. **执行阶段**：AI 根据已确定的方案执行代码修改、测试、验证。
5. **验收阶段**：验证通过后，更新相关文档。

### 8.2 任务记录文件规范

- **存放位置**：`C:\Code\Ideas\SparkBin\docs\`
- **命名格式**：`序号-YYYY年M月D日HH时MM分SS秒-任务名称.md`
  - 示例：`005-2026年4月24日15时21分07秒-UI登录页面优化.md`
  - 序号规则：按创建顺序递增，三位数（001, 002, 003...），便于排序和追溯历史
- **文件内容**：记录本次优化的前期工作，包括讨论过程、确定的技术方案、需要修改的文件清单、验收标准等。

### 8.3 AI 每次开窗口时的标准动作

当人类开发者将本项目全景文档作为上下文输入后，AI 应当：

1. **确认理解**：明确表示已阅读并理解项目全景文档和协作方案。
2. **回顾历史**：询问或查看 `docs/` 目录下已有的任务记录文件（按序号排序），了解之前的优化历史。同时查看根目录下的 `002-架构决策记录.md` 和 `003-任务边界约束模板.md`。
3. **等待指令**：询问人类开发者本次需要优化的具体内容，进入需求讨论阶段。

### 8.4 当前项目状态速览（截至 2026-04-24）

根据历史文档和代码审计：

- **完全实现**（约 60%）：六阶段基础编辑器、AI 聊天、用户认证、国际化、主题切换、项目蓝图、IdeaStage 拖拽、AIPetConfig、MonthView、ImageUpload、Stripe 测试支付
- **部分实现**（约 27%）：ValidateStage 跨列拖拽（复杂度高）、闭环反馈系统、月视图直接编辑、宠物配置仅 localStorage
- **未实现**（约 13%）：A/B 测试、自动归类反馈、反馈回流到原型的完整闭环、项目蓝图力导向图谱、多平台一键发布/配图生成

### 8.5 关键注意事项

- **不要修改 migrations 文件**：如有数据库变更，新增迁移文件。
- **保持命名导出**：所有新增组件和函数使用命名导出。
- **优先 interface**：类型定义使用 interface 而非 type。
- **后端代理模式**：AI 相关功能前端不接触 API Key，全部走后端代理。
- **测试模式**：Stripe 支付目前仅支持测试模式（`sk_test_`）。
- **构建验证**：前端修改后需运行 `npm run build` 确保 TypeScript 无错误。
- **闭合循环**：AI 修改代码后必须自动运行测试（Playwright E2E + 构建验证），失败则自修，通过后才报告完成。
- **Prompt 审查**：每次任务的 Prompt 保存到 `prompts/` 目录，任务完成后复盘优化。

---

## 九、历史文档索引（已归档于 Git 历史）

以下文档曾在项目根目录存在，现已被删除，但内容保留在 Git HEAD 历史中，可通过 `git show HEAD:<文件名>` 查看：

| 文档 | 内容 |
|------|------|
| `项目报告.md` | 原始需求文档（2026-04-07） |
| `项目架构文档.md` | 前后端分离改造方案（2026-04-08） |
| `开发计划.md` | 未实现功能开发计划（2026-04-13） |
| `实现总结报告.md` | 功能实现总结（2026-04-13） |
| `实现状态报告.md` | 与原始需求对比审计（2026-04-12） |
| `功能实现详细审计.md` | 代码级功能审计（2026-04-12） |
| `功能测试报告_2026-04-13.md` | 开发计划功能测试报告 |
| `组件集成完成报告_2026-04-13.md` | 集成任务完成报告 |
| `实现状态报告_VIBE设计.md` | Vibe 工作流实现状态报告 |
| `docs/VIBE_WORKFLOW_DESIGN.md` | Vibe/独立开发工作流详细设计文档 |

---

> **文档结束**。请将此文件作为每次对话的初始上下文，确保 AI 对 SparkBin 项目有完整准确的认知。
