# 前端全面英文化实施方案（保守增量式）

## 背景

`frontend/src/i18n/index.tsx` 已支持 7 种语言（zh/en/ja/ko/es/fr/de），并包含 `app`、`nav`、`status`、`action`、`project`、`stage`、`github`、`ai`、`modal`、`auth`、`section`、`system`、`theme`、`placeholder`、`error` 等命名空间。

但当前存在四类问题：

1. **键缺失**：`ProjectBoard.tsx` 等组件已使用 `t('nav.admin')`、`t('ai.credits')`、`t('toast.oauth_bind_success')` 等键，但 `i18n/index.tsx` 中未定义，导致英文界面直接回显键名。
2. **硬编码中文**：`AIChat.tsx`、`IdeaStage.tsx`、`ChangePasswordModal.tsx` 等组件中仍有大量写死的中文用户可见文本。
3. **硬编码英文**：`ProjectBoard.tsx` 中 `"BACKEND MODE"`、`"ERROR:"`、`"FILTER:"`、`"ONLINE"` 等英文 UI 文本未走 i18n，其他语言无法翻译。
4. **`|| '中文'` 兜底**：`GitHubImportModal.tsx`、`CreateProjectModal.tsx` 等使用 `t('xxx') || '中文'`，翻译缺失时回退到中文。

## 目标

在保持现有 i18n 架构不变的前提下，补齐所有缺失键、替换所有硬编码用户可见文本，并补全 7 种语言翻译，使英文界面（默认语言）完整无键名回退，其他语言切换后也基本可用。

## 范围

本次覆盖的组件/页面共 18 个：

- `ProjectBoard.tsx`
- `ProjectDetail.tsx`
- `ProfilePage.tsx`
- `AdminPage.tsx`
- `AIPetConfig.tsx`
- `ModelSelector.tsx`
- `CreateProjectModal.tsx`
- `GitHubImportModal.tsx`
- `AIChat.tsx`
- `IdeaStage.tsx`
- `IdeaSuggestModal.tsx`
- `ValidateStage.tsx`
- `PrototypeStage.tsx`
- `ShipStage.tsx`
- `GrowStage.tsx`
- `MonetizeStage.tsx`
- `AgentCockpit.tsx`
- `ChangePasswordModal.tsx`
- `VerifyEmailPage.tsx`
- `ResetPasswordPage.tsx`
- `LandingPage.tsx`
- `LanguageSwitcher.tsx`

不在本次范围内的：

- 代码注释（不影响用户界面）
- 后端返回的错误消息（需后端支持，本次仅处理前端文本）
- 第三方库内部文本

## 新增/扩展命名空间

在 `i18n/index.tsx` 的 `translations` 对象中新增或扩展以下命名空间：

| 命名空间 | 用途 | 示例键 |
|---|---|---|
| `nav` | 导航链接 | `admin`, `account`, `logout`, `back` |
| `toast` | 全局 toast 提示 | `oauth_bind_success`, `google_unbind_success`, `github_unbind_success`, `unbind_failed`, `load_user_failed`, `pet_saved`, `pet_save_failed`, `merge_suggestions`, `override_suggestions`, `query_status_failed`, `load_suggestions_failed` |
| `dialog` | 确认对话框 | `stay`, `leave` |
| `account` | 账号设置弹窗 | `settings`, `oauth_binding`, `bound`, `not_bound` |
| `backend` | 后端模式标识 | `mode`, `data_storage` |
| `filter` | 项目筛选 | `filter`, `clear`, `filtered`, `no_filtered_projects`, `try_different_filter` |
| `error_banner` | 错误横幅 | `error_prefix`, `retry` |
| `empty_state` | 空状态 | `prompt`, `awaiting_input` |
| `pet` | AI 宠物配置 | `dialogue_*`（提示词已在 `AIPetConfig.constants.ts` 中部分存在，需评估是否迁移） |
| `quota` | 额度显示 | `credits`, `ai_label` |
| `landing` | 落地页 | `stage_desc_*`, `cta_*`, `features` |
| `pricing` | 定价/支付测试 | `tier_free`, `tier_pro`, `tier_team`, `period_month`, `period_year`, `period_lifetime`, `test_cards` |
| `validation` | 表单校验 | `required`, `password_mismatch`, `min_length`, `uppercase_required`, `lowercase_required`, `digit_required`, `special_required` |
| `grow` | 增长阶段 | `content_type_*`, `channel_*`, `week_today`, `week_offset`, `weekdays`, `status_published`, `status_scheduled`, `status_draft` |
| `monetize` | 变现阶段 | `model_*`, `visitor`, `registered`, `test_mode_on`, `test_mode_off` |
| `agent` | Agent Cockpit | `mode_*`, `role_*` |
| `model` | 模型选择器 | 已有 `ModelSelector.tsx` 内嵌多语言对象，评估是否统一迁移到 i18n |
| `auth` | 已有，需扩展 | 补充 `change_password_*`, `verify_email_*`, `reset_password_*` |

> 注：以上键名在实施前会再次与组件实际文本对齐，部分命名空间可能合并。

## 组件处理清单

### 第一批：核心导航与项目面板

组件：`ProjectBoard.tsx`、`ModelSelector.tsx`、`LanguageSwitcher.tsx`、`ThemeSwitcher.tsx`

- 补齐 `nav.admin`、`nav.account`、`nav.logout`、`ai.credits`、`project.add_new`、`account.settings`、`account.oauth_binding`、`account.bound`、`account.not_bound`、`dialog.stay`、`dialog.leave`、`toast.oauth_bind_success`、`toast.google_unbind_success`、`toast.github_unbind_success`、`toast.unbind_failed`
- 替换 `"BACKEND MODE"` → `t('backend.mode')`
- 替换 `"Data stored in PostgreSQL"` → `t('backend.data_storage')`
- 替换 `"ERROR:"` / `"RETRY"` → `t('error_banner.error_prefix')` / `t('error_banner.retry')`
- 替换 `"FILTER:"` / `"[CLEAR]"` → `t('filter.filter')` / `t('filter.clear')`
- 替换 `"FILTERED: ${filter}"` → `t('filter.filtered', { filter })`（需扩展 `t` 支持插值或先使用字符串拼接）
- 替换 `"AI: {quota.ai_credits}"` → `t('quota.ai_label', { credits: quota.ai_credits })`
- 替换 `"Logout"`、`"Toggle menu"`、`"ONLINE"` 等

### 第二批：项目创建与 GitHub 导入

组件：`CreateProjectModal.tsx`、`GitHubImportModal.tsx`

- 移除所有 `|| '中文'` 兜底
- 补齐缺失键并替换硬编码文本
- 替换 `"// AI 导师理解确认"` → `t('modal.ai_confirm')`
- 替换 `"让我理解一下你的想法..."` → `t('create.understanding_idea')`
- 替换 `"AI 正在分析..."` → `t('ai.analyzing')`
- 替换 `"确认 AI 理解是否正确..."` → `t('create.confirm_ai_understanding')`
- 补齐 GitHub 导入相关缺失键

### 第三批：AI 聊天与宠物

组件：`AIChat.tsx`、`AIPetConfig.tsx`、`PetHabitat.tsx`

- 替换 AI 额度/配置错误提示中的中文
- 评估是否将 `AIPetConfig.constants.ts` 中的宠物对话模板迁移到 i18n
- 替换 `"未命名项目"` → `t('project.unnamed')`
- 替换 `"退出全屏 (ESC)"` / `"全屏对话"` →对应 i18n 键

### 第四批：项目详情与 Stage 组件

组件：`ProjectDetail.tsx`、`IdeaStage.tsx`、`IdeaSuggestModal.tsx`、`ValidateStage.tsx`、`PrototypeStage.tsx`、`ShipStage.tsx`、`GrowStage.tsx`、`MonetizeStage.tsx`

- 替换 Stage 标题、占位符、按钮 tooltip、toast 提示
- 替换 GrowStage 中的内容类型、渠道、星期、状态文本
- 替换 MonetizeStage 中的定价方案、支付测试卡文本

### 第五批：账号、管理、认证页面

组件：`ProfilePage.tsx`、`AdminPage.tsx`、`ChangePasswordModal.tsx`、`VerifyEmailPage.tsx`、`ResetPasswordPage.tsx`

- 替换账号设置、配额信息、偏好设置等文本
- 替换密码修改、邮箱验证、密码重置页面的表单提示

### 第六批：落地页与辅助组件

组件：`LandingPage.tsx`、`AgentCockpit.tsx`、`ImageUpload.tsx`、`ProjectCard.tsx`、`UpgradePromptModal.tsx`、`PaymentResultModal.tsx`、`PricingPreview.tsx`

- 替换落地页 stage 描述、CTA 文本
- 替换 Agent Cockpit 的模式/角色标签
- 替换通用辅助组件中的提示文本

## 翻译策略

1. **中文（zh）**：作为源语言，由开发者人工编写，确保准确。
2. **英文（en）**：作为默认显示语言，人工校验，确保无键名回退、无语病。
3. **日文（ja）、韩文（ko）、西班牙文（es）、法文（fr）、德文（de）**：先使用机器翻译批量生成，然后对关键用户路径（登录、项目面板、项目创建、AI 聊天）进行人工抽查校验。
4. **键名规范**：采用 `namespace.key` 形式，子键用驼峰或下划线连接，保持与现有键风格一致。
5. **插值处理**：当前 `t` 函数仅支持点分键，暂不支持 `{var}` 插值。对于需要动态值的文本，先用字符串拼接实现（如 `t('filter.filtered') + ': ' + filter`），或在本方案中扩展 `t` 函数以支持 `t('key', { var: value })`。

## 分批 Commit 计划

建议按上述六批分 6 个 commit，每个 commit 包含对应组件的 i18n 替换和翻译补全：

1. `i18n: add core nav/backend/filter/quota/toast/account keys and ProjectBoard i18n`
2. `i18n: i18n-ize CreateProjectModal and GitHubImportModal`
3. `i18n: i18n-ize AIChat, AIPetConfig and PetHabitat`
4. `i18n: i18n-ize ProjectDetail and all Stage components`
5. `i18n: i18n-ize ProfilePage, AdminPage and auth pages`
6. `i18n: i18n-ize LandingPage and remaining auxiliary components`

每批完成后执行 `npm run build` 与 `npm run test`（如有测试），确保无类型错误和明显崩溃。

## 验证步骤

1. **类型检查**：每批 commit 前运行 `npm run build`，确保无 TypeScript 错误。
2. **键覆盖检查**：人工抽查英文界面，确认无键名回退（如 `nav.admin`、`toast.oauth_bind_success` 等）。
3. **语言切换抽查**：切换到 ja/ko/es/fr/de，确认关键路径文本已翻译。
4. **回归检查**：确认登录/注册、创建项目、GitHub 导入、AI 聊天、项目详情、账号设置等核心流程正常。

## 风险与回滚

- **风险**：新增键名与组件中已有 `t()` 调用对不上，导致界面仍回显键名。
- **缓解**：每批替换后在浏览器中实际切换语言检查。
- **回滚**：由于分 commit 进行，任何一批出问题可单独 revert。

## 后续可选优化

- 当 `i18n/index.tsx` 超过 3000 行后，可考虑拆分为 `locales/*.ts` 文件。
- 引入 `i18next` 或类似库以支持复数、插值、命名空间懒加载。
- 建立翻译文件校验脚本，检测缺失键和未使用键。
