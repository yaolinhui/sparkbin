# Prompt: 清理过时 GitHub 备份功能 + Header 按钮视觉统一

## 任务背景

用户发现项目中有两套并行的 GitHub 相关逻辑：
1. **GitHub OAuth 登录**（DEC-016，刚实现）—— 用于用户身份认证
2. **GitHub 备份按钮**（第一版 localStorage 时代遗留）—— 让用户输入 PAT，把项目数据备份到 GitHub 仓库的 JSON 文件中

在公开多用户场景下，第二套逻辑存在严重问题：
- PAT 存储在前端 localStorage，属于安全隐患
- 数据已经存在后端数据库，备份到 GitHub JSON 失去了核心价值
- 和多用户认证体系冲突（用户 A 的 PAT 不应出现在多租户环境中）

同时，用户反馈 Header 按钮的边框颜色和图标颜色不统一，有的按钮有彩色边框/文字，有的只有默认灰色，视觉上破碎。

## 决策过程

### 关于 GitHub 备份功能

- 当前 `GitHubConfigModal` + `github.ts` + `projectStore` 中的 `loadFromGitHub`/`saveToGitHub` 是第一版纯前端架构的遗产
- 在前后端分离 + 数据库存储的新架构下，这个功能是**技术债**而非资产
- 公开项目场景下，PAT 前端存储 = 安全隐患
- 未来如果需要 GitHub 集成，应该是"后端代理 + 项目级仓库绑定 + AI 导入"的新架构，而非当前的前端直连接口

**决策：彻底删除第一版的 GitHub 备份功能。**

### 关于 Header 按钮视觉统一

Brutalist 风格要求克制、功能性、工业感。当前同一排按钮中：
- 蓝图按钮：青色边框+文字
- 删除/登出按钮：橙色边框+文字
- 其余按钮：灰色边框+白色文字
- ThemeSwitcher/LanguageSwitcher/ModelSelector：独立样式，hover 变白色边框，图标单独青色

**决策：制定统一规范并全局执行**

| 类型 | 边框 | 文字/图标 |
|---|---|---|
| 默认工具按钮 | 灰色（`var(--brutal-border)`） | 白色 |
| 核心功能按钮 | 青色（`border-brutal-accent`） | 青色 |
| 危险操作按钮 | 橙色（`border-brutal-warning`） | 橙色 |
| 独立切换组件 | 统一为 `btn-brutal` 等效样式 | 白色 |

**具体改动：**
- 登出按钮不是危险操作，改回默认灰色
- 恢复/暂停状态按钮不单独上色（状态已由图标和标签表达）
- ThemeSwitcher/LanguageSwitcher/ModelSelector 的 hover 统一为 `border-brutal-accent`，图标去掉单独的 `text-brutal-accent`

## 修改文件清单

### 删除（2 个文件）
- `frontend/src/services/github.ts` — 前端 GitHub API 直连接口，安全隐患
- `frontend/src/components/GitHubConfigModal.tsx` — 第一版备份配置弹窗

### 修改（4 个文件）
- `frontend/src/components/index.ts` — 删除 `GitHubConfigModal` 导出
- `frontend/src/types/index.ts` — 删除 `GitHubConfig` 接口
- `frontend/src/stores/projectStore.ts` — 删除 `githubConfig`, `setGitHubConfig`, `loadFromGitHub`, `saveToGitHub`
- `frontend/src/components/ProjectBoard.tsx` — 删除 GitHub 按钮 import、state、渲染
- `frontend/src/components/ProjectDetail.tsx` — 统一按钮颜色（登出改灰色，状态按钮去色）
- `frontend/src/components/ThemeSwitcher.tsx` — hover 统一，图标去色
- `frontend/src/components/LanguageSwitcher.tsx` — hover 统一，图标去色
- `frontend/src/components/ModelSelector.tsx` — hover 统一，图标去色

## 验收标准

- [x] `npm run build` 通过，零 TypeScript 错误
- [x] 代码中无任何 `GitHubConfigModal` / `githubService` / `loadFromGitHub` / `saveToGitHub` / `GitHubConfig` 残留引用
- [x] ProjectBoard Header 不再显示 GitHub 备份按钮
- [x] Header 按钮视觉统一：默认灰色，核心功能青色，危险操作橙色

## 后续行动

1. 未来实现"从 GitHub 导入项目"时，采用全新架构：
   - 后端代理调用 GitHub API（PAT 加密存储在后端）
   - 项目级仓库绑定（每个项目关联一个 GitHub repo）
   - AI 辅助解析 README/Issues/Releases 并建议填充到六阶段
   - 分步授权：登录时只申请 `read:user`，绑定仓库时再申请 `public_repo`
2. 自托管用户的数据已经在自己的服务器上，不需要额外 GitHub 备份

## 相关决策

- DEC-003：AI 代理模式（后端代理）—— 新 GitHub 集成也应走后端代理
- DEC-018：开源核心 + 社区会员模式—— 前端不应存储敏感凭证
