# 前端全面英文化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐 `frontend/src/i18n/index.tsx` 缺失键，替换所有用户可见硬编码中文/英文文本，补全 7 种语言翻译，使英文界面完整无键名回退。

**Architecture:** 保持现有单文件 i18n 架构；先扩展 `t()` 支持简单字符串插值；然后按“核心导航与项目面板 → 项目创建与 GitHub 导入 → AI 聊天与宠物 → 项目详情与 Stage 组件 → 账号/管理/认证页面 → 落地页与辅助组件”的顺序分批替换；每批独立 build 验证。

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind CSS + react-router-dom

## Global Constraints

- 不引入新的 npm 依赖。
- 所有组件保持命名导出风格。
- 不修改 `migrations/` 目录下的文件。
- 不停止任何运行中的服务/进程。
- 新增 i18n 键采用 `namespace.key` 格式，子键使用 `snake_case`。
- 翻译字符串值的风格与现有 `i18n/index.tsx` 保持一致：英文全大写（UI 标签），中文/日文/韩文/西班牙文/法文/德文使用自然语言。
- 每次 commit 前运行 `npm run build`，确保无 TypeScript 错误。
- 不自动提交 git commit，仅在工作区产生修改，最终由用户确认后统一提交或按任务提交。

---

## File Structure

| 文件 | 变更类型 | 说明 |
|---|---|---|
| `frontend/src/i18n/context.tsx` | 修改 | 更新 `t` 类型签名以支持可选插值对象。 |
| `frontend/src/i18n/index.tsx` | 修改 | 扩展 `t` 实现；新增/扩展 17 个命名空间；补全 7 种语言翻译。 |
| `frontend/src/i18n/hooks.ts` | 不修改 | 保持 `useI18n`、`useStageLabel`、`useStatusLabel` 不变。 |
| `frontend/src/components/ProjectBoard.tsx` | 修改 | 替换硬编码文本，补齐缺失键。 |
| `frontend/src/components/ModelSelector.tsx` | 修改 | 替换模型下拉/按钮中的硬编码文本。 |
| `frontend/src/components/LanguageSwitcher.tsx` | 修改 | 语言列表标签走 i18n。 |
| `frontend/src/components/ThemeSwitcher.tsx` | 修改 | tooltip 走 i18n。 |
| `frontend/src/components/CreateProjectModal.tsx` | 修改 | 移除 `\|\| '中文'` 兜底，替换所有硬编码文本。 |
| `frontend/src/components/GitHubImportModal.tsx` | 修改 | 移除 `\|\| '中文'` 兜底，补齐缺失键。 |
| `frontend/src/components/AIChat.tsx` | 修改 | 替换错误提示、占位符、未命名项目等文本。 |
| `frontend/src/components/AIPetConfig.tsx` | 修改 | 配置项标签、占位符走 i18n。 |
| `frontend/src/components/PetHabitat.tsx` | 修改 | tooltip/aria 标签走 i18n。 |
| `frontend/src/components/ProjectDetail.tsx` | 修改 | 替换项目详情页所有硬编码文本。 |
| `frontend/src/components/IdeaStage.tsx` | 修改 | 替换便利贴标题、占位符、toast、确认对话框。 |
| `frontend/src/components/IdeaSuggestModal.tsx` | 修改 | 替换提示标题、占位符、按钮。 |
| `frontend/src/components/ValidateStage.tsx` | 修改 | 替换验证阶段表单标签/占位符。 |
| `frontend/src/components/PrototypeStage.tsx` | 修改 | 替换原型阶段标签/占位符。 |
| `frontend/src/components/ShipStage.tsx` | 修改 | 替换发布阶段标签/占位符。 |
| `frontend/src/components/GrowStage.tsx` | 修改 | 替换内容类型、渠道、星期、状态文本。 |
| `frontend/src/components/MonetizeStage.tsx` | 修改 | 替换定价方案、支付测试卡、测试模式文本。 |
| `frontend/src/components/AgentCockpit.tsx` | 修改 | 替换模式/角色标签。 |
| `frontend/src/components/ProfilePage.tsx` | 修改 | 替换账号/配额/偏好/安全/OAuth 文本。 |
| `frontend/src/components/AdminPage.tsx` | 修改 | 替换管理后台标签/按钮。 |
| `frontend/src/components/ChangePasswordModal.tsx` | 修改 | 替换密码校验错误/占位符/按钮。 |
| `frontend/src/pages/VerifyEmailPage.tsx` | 修改 | 替换验证状态文本。 |
| `frontend/src/pages/ResetPasswordPage.tsx` | 修改 | 替换重置表单文本。 |
| `frontend/src/components/LandingPage.tsx` | 修改 | 替换 stage 描述、CTA 文本。 |
| `frontend/src/components/ImageUpload.tsx` | 修改 | 替换 alert/title 文本。 |
| `frontend/src/components/ProjectCard.tsx` | 修改 | 替换卡片内状态/操作文本。 |
| `frontend/src/components/UpgradePromptModal.tsx` | 修改 | 替换升级提示文本。 |
| `frontend/src/components/PaymentResultModal.tsx` | 修改 | 替换支付结果文本。 |
| `frontend/src/components/PricingPreview.tsx` | 修改 | 替换定价预览文本。 |

---

## Task 0: 扩展 `t()` 支持可选插值

**Files:**
- Modify: `frontend/src/i18n/context.tsx:6-8`
- Modify: `frontend/src/i18n/index.tsx:1431-1447`

**Interfaces:**
- Consumes: 无。
- Produces: `t(key: string, vars?: Record<string, string | number>): string`，向后兼容现有 `t('foo.bar')` 调用。

- [ ] **Step 1: 更新 `I18nContextType` 中 `t` 的类型签名**

  修改 `frontend/src/i18n/context.tsx`：

  ```typescript
  export interface I18nContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string, vars?: Record<string, string | number>) => string;
    toggleLanguage: () => void;
  }
  ```

- [ ] **Step 2: 更新 `t` 实现以支持 `{{var}}` 插值**

  修改 `frontend/src/i18n/index.tsx` 中的 `t` 函数：

  ```typescript
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const keys = key.split('.');
      let value: unknown = translations[language];

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = (value as Record<string, unknown>)[k];
        } else {
          return key;
        }
      }

      let result = typeof value === 'string' ? value : key;

      if (vars) {
        Object.entries(vars).forEach(([varKey, varValue]) => {
          result = result.replace(new RegExp(`\\{\\{${varKey}\\}\\}`, 'g'), String(varValue));
        });
      }

      return result;
    },
    [language]
  );
  ```

- [ ] **Step 3: 验证类型检查通过**

  Run: `cd frontend && npm run build`
  Expected: 无 TypeScript 错误，构建成功。

- [ ] **Step 4: 提交**

  ```bash
  git add frontend/src/i18n/context.tsx frontend/src/i18n/index.tsx
  git commit -m "i18n: extend t() to support optional variable interpolation"
  ```

---

## Task 1: 核心导航与项目面板

**Files:**
- Modify: `frontend/src/i18n/index.tsx`（新增命名空间 `nav`、`backend`、`filter`、`error_banner`、`empty_state`、`quota`、`toast`、`dialog`、`account`）
- Modify: `frontend/src/components/ProjectBoard.tsx`
- Modify: `frontend/src/components/ModelSelector.tsx`
- Modify: `frontend/src/components/LanguageSwitcher.tsx`
- Modify: `frontend/src/components/ThemeSwitcher.tsx`

**Interfaces:**
- Consumes: Task 0 的插值 `t()`。
- Produces: 新增 i18n 键供后续任务复用；`ProjectBoard` 不再显示键名或硬编码中文/英文。

- [ ] **Step 1: 在 `i18n/index.tsx` 添加新命名空间**

  在 `zh` 语言对象内添加（en/ja/ko/es/fr/de 同步添加，下同）：

  ```typescript
  nav: {
    admin: '管理',
    account: '账号',
    logout: '退出登录',
    back: '返回',
    dashboard: '项目面板',
  },
  backend: {
    mode: '后端模式',
    data_storage: '数据存储在 PostgreSQL',
  },
  filter: {
    filter: '筛选',
    clear: '清除',
    filtered: '已筛选',
    no_filtered_projects: '未找到匹配项目',
    try_different_filter: '尝试选择其他筛选条件',
  },
  error_banner: {
    error_prefix: '错误',
    retry: '重试',
  },
  empty_state: {
    prompt: '> _',
    awaiting_input: '等待输入...',
  },
  quota: {
    credits: 'AI 额度',
    ai_label: 'AI: {{credits}}',
  },
  toast: {
    oauth_bind_success: '第三方账号绑定成功',
    google_unbind_success: 'Google 账号已解绑',
    github_unbind_success: 'GitHub 账号已解绑',
    unbind_failed: '解绑失败',
    load_user_failed: '加载用户信息失败',
    pet_saved: '宠物配置已保存',
    pet_save_failed: '保存失败',
    merge_suggestions: 'AI 建议已智能合并到便利贴',
    override_suggestions: 'AI 建议已覆盖全部便利贴',
    query_status_failed: '查询运行状态失败',
    load_suggestions_failed: '获取 AI 建议失败',
  },
  dialog: {
    stay: '留下',
    leave: '离开',
  },
  account: {
    settings: '账号设置',
    oauth_binding: '第三方账号绑定',
    bound: '已绑定',
    not_bound: '未绑定',
  },
  ```

  在 `en` 中对应使用大写/英文自然语言：

  ```typescript
  nav: {
    admin: 'ADMIN',
    account: 'ACCOUNT',
    logout: 'LOGOUT',
    back: 'BACK',
    dashboard: 'DASHBOARD',
  },
  backend: {
    mode: 'BACKEND MODE',
    data_storage: 'Data stored in PostgreSQL',
  },
  filter: {
    filter: 'FILTER',
    clear: '[CLEAR]',
    filtered: 'FILTERED',
    no_filtered_projects: 'No matching projects found',
    try_different_filter: 'Try selecting a different filter',
  },
  error_banner: {
    error_prefix: 'ERROR',
    retry: 'RETRY',
  },
  empty_state: {
    prompt: '> _',
    awaiting_input: 'AWAITING_INPUT...',
  },
  quota: {
    credits: 'AI CREDITS',
    ai_label: 'AI: {{credits}}',
  },
  toast: {
    oauth_bind_success: 'Third-party account bound successfully',
    google_unbind_success: 'Google account unbound',
    github_unbind_success: 'GitHub account unbound',
    unbind_failed: 'Unbind failed',
    load_user_failed: 'Failed to load user info',
    pet_saved: 'Pet config saved',
    pet_save_failed: 'Save failed',
    merge_suggestions: 'AI suggestions merged into sticky notes',
    override_suggestions: 'AI suggestions replaced all sticky notes',
    query_status_failed: 'Failed to query running status',
    load_suggestions_failed: 'Failed to get AI suggestions',
  },
  dialog: {
    stay: 'STAY',
    leave: 'LEAVE',
  },
  account: {
    settings: 'ACCOUNT SETTINGS',
    oauth_binding: 'THIRD-PARTY ACCOUNT BINDING',
    bound: 'Bound',
    not_bound: 'Not bound',
  },
  ```

- [ ] **Step 2: 替换 `ProjectBoard.tsx` 中的缺失键和硬编码文本**

  代表性修改（需全文扫描替换）：

  ```tsx
  // 替换前
  <span className="text-xs font-mono">{t('nav.admin')}</span>
  // 已能工作，但需确保键存在

  // 替换前
  <span className="text-xs font-mono">{t('nav.account')}</span>

  // 替换前
  title="Logout"
  // 替换后
  title={t('nav.logout')}

  // 替换前
  <span className="text-xs font-mono">{t('nav.logout')}</span>

  // 替换前
  <div className="text-xs text-brutal-muted">{t('ai.credits')}</div>

  // 替换前
  <span className="text-xs font-mono">{t('project.add_new')}</span>
  // project.add_new 不存在，新增 project.add_new: '添加项目' / 'ADD PROJECT'

  // 替换前
  title="Toggle menu"
  // 替换后
  title={t('nav.toggle_menu')}
  // 需在 nav 中新增 toggle_menu

  // 替换前
  <span className="text-brutal-accent">BACKEND MODE</span>
  // 替换后
  <span className="text-brutal-accent">{t('backend.mode')}</span>

  // 替换前
  <span className="text-brutal-muted">Data stored in PostgreSQL</span>
  // 替换后
  <span className="text-brutal-muted">{t('backend.data_storage')}</span>

  // 替换前
  <span className="font-bold">ERROR:</span>
  // 替换后
  <span className="font-bold">{t('error_banner.error_prefix')}:</span>

  // 替换前
  RETRY
  // 替换后
  {t('error_banner.retry')}

  // 替换前
  <span className="text-brutal-muted">// FILTER: </span>
  // 替换后
  <span className="text-brutal-muted">// {t('filter.filter')}: </span>

  // 替换前
  [CLEAR]
  // 替换后
  {t('filter.clear')}

  // 替换前
  title={`FILTERED: ${filter}`}
  // 替换后
  title={`${t('filter.filtered')}: ${filter}`}

  // 替换前
  AI: {quota.ai_credits}
  // 替换后
  {t('quota.ai_label', { credits: quota.ai_credits })}

  // 替换前
  No ${filter} projects found
  // 替换后
  {t('filter.no_filtered_projects')}

  // 替换前
  Try selecting a different filter
  // 替换后
  {t('filter.try_different_filter')}
  ```

  在 `i18n/index.tsx` 的 `project` 命名空间新增：

  ```typescript
  add_new: '添加项目', // zh
  add_new: 'ADD PROJECT', // en
  ```

  在 `nav` 命名空间新增：

  ```typescript
  toggle_menu: '切换菜单', // zh
  toggle_menu: 'TOGGLE MENU', // en
  ```

- [ ] **Step 3: 替换 `ModelSelector.tsx` 中的硬编码文本**

  代表性修改：

  ```tsx
  // 替换前
  <span>选择模型</span>
  // 替换后
  <span>{t('modal.select_model')}</span>

  // 替换前
  <span>暂无可用模型</span>
  // 替换后
  <span>{t('ai.no_models_available')}</span>

  // 若组件内嵌了模型提供商下拉标签，新增 ai.provider_* 键并替换
  ```

- [ ] **Step 4: 替换 `LanguageSwitcher.tsx` 中的语言标签**

  代表性修改：

  ```tsx
  // 替换前
  { code: 'zh', label: '中文', flag: 'CN' },
  { code: 'en', label: 'English', flag: 'US' },
  { code: 'ja', label: '日本語', flag: 'JP' },
  // ...

  // 替换后：保留语言自身名称作为 label（通用做法），但 aria-label 使用 t('language.name_zh') 等
  ```

  在 `i18n/index.tsx` 新增 `language` 命名空间：

  ```typescript
  language: {
    name_zh: '简体中文',
    name_en: 'English',
    name_ja: '日本語',
    name_ko: '한국어',
    name_es: 'Español',
    name_fr: 'Français',
    name_de: 'Deutsch',
  },
  ```

- [ ] **Step 5: 替换 `ThemeSwitcher.tsx` 中的 tooltip 文本**

  代表性修改：

  ```tsx
  // 替换前
  title="Switch to dark mode"
  // 替换后
  title={t('theme.switch_to_dark')}

  // 替换前
  title="Switch to light mode"
  // 替换后
  title={t('theme.switch_to_light')}
  ```

- [ ] **Step 6: 运行 build 验证**

  Run: `cd frontend && npm run build`
  Expected: 构建成功，无类型错误。

- [ ] **Step 7: 在浏览器中切换英文/中文检查**

  打开 `http://localhost:5173`（或实际开发地址），检查：
  - 顶部导航无 `nav.admin` / `nav.account` 键名回退。
  - BACKEND MODE / ERROR / FILTER / AI: 等文本正常显示。
  - 退出登录对话框的“留下/离开”已翻译。

- [ ] **Step 8: 提交**

  ```bash
  git add frontend/src/i18n/index.tsx frontend/src/components/ProjectBoard.tsx frontend/src/components/ModelSelector.tsx frontend/src/components/LanguageSwitcher.tsx frontend/src/components/ThemeSwitcher.tsx
  git commit -m "i18n: core navigation and project board"
  ```

---

## Task 2: 项目创建与 GitHub 导入

**Files:**
- Modify: `frontend/src/i18n/index.tsx`（扩展 `modal`、`project`、`github`、`action`、`ai`）
- Modify: `frontend/src/components/CreateProjectModal.tsx`
- Modify: `frontend/src/components/GitHubImportModal.tsx`

**Interfaces:**
- Consumes: Task 0 的插值 `t()` 与 Task 1 的 `nav`、`action`、`ai`、`project` 命名空间。
- Produces: `CreateProjectModal`、`GitHubImportModal` 完全走 i18n。

- [ ] **Step 1: 在 `i18n/index.tsx` 扩展相关命名空间**

  新增/扩展键：

  ```typescript
  // modal
  modal: {
    // ... existing keys
    ai_confirm: 'AI 导师理解确认', // zh
    ai_confirm: 'AI TUTOR CONFIRMATION', // en
  },

  // project
  project: {
    // ... existing keys
    original_idea: '原始想法', // zh
    original_idea: 'ORIGINAL IDEA', // en
    suggested_stage: '建议阶段', // zh
    suggested_stage: 'SUGGESTED STAGE', // en
    unnamed: '未命名项目', // zh
    unnamed: 'UNNAMED PROJECT', // en
  },

  // ai
  ai: {
    // ... existing keys
    analyzing: 'AI 正在分析...', // zh
    analyzing: 'AI ANALYZING...', // en
    understanding_idea: '让我理解一下你的想法...', // zh
    understanding_idea: 'Let me understand your idea...', // en
  },

  // create
  create: {
    confirm_ai_understanding: '确认 AI 理解是否正确...', // zh
    confirm_ai_understanding: 'Confirm if AI understanding is correct...', // en
  },

  // github
  github: {
    // ... existing keys, remove || fallbacks in component
  }
  ```

- [ ] **Step 2: 移除 `GitHubImportModal.tsx` 中所有 `|| '中文'` 兜底**

  代表性修改：

  ```tsx
  // 替换前
  {t('github.import_title') || '从 GitHub 导入'}
  // 替换后
  {t('github.import_title')}

  // 对所有 t(...) || '...' 做同样处理
  ```

- [ ] **Step 3: 替换 `CreateProjectModal.tsx` 中的硬编码文本**

  代表性修改：

  ```tsx
  // 替换前
  case 2: return '// AI 导师理解确认';
  // 替换后
  case 2: return `// ${t('modal.ai_confirm')}`;

  // 替换前
  "让我理解一下你的想法..."
  // 替换后
  {t('ai.understanding_idea')}

  // 替换前
  {'>'} {streamOutput || 'AI 正在分析...'}
  // 替换后
  {'>'} {streamOutput || t('ai.analyzing')}

  // 替换前
  {step === 2 && '> 确认 AI 理解是否正确...'}
  // 替换后
  {step === 2 && `> ${t('create.confirm_ai_understanding')}`}

  // 替换前
  <span className="text-xs font-mono">{t('github.import_from_github') || '从 GitHub 导入'}</span>
  // 替换后
  <span className="text-xs font-mono">{t('github.import_from_github')}</span>
  ```

- [ ] **Step 4: 运行 build 验证**

  Run: `cd frontend && npm run build`
  Expected: 构建成功。

- [ ] **Step 5: 在浏览器中测试项目创建流程**

  点击“添加项目”，检查步骤 1/2/3 的标题、占位符、按钮文本均已翻译。

- [ ] **Step 6: 提交**

  ```bash
  git add frontend/src/i18n/index.tsx frontend/src/components/CreateProjectModal.tsx frontend/src/components/GitHubImportModal.tsx
  git commit -m "i18n: project creation and GitHub import"
  ```

---

## Task 3: AI 聊天与宠物

**Files:**
- Modify: `frontend/src/i18n/index.tsx`（扩展 `ai`、`placeholder`、`pet`）
- Modify: `frontend/src/components/AIChat.tsx`
- Modify: `frontend/src/components/AIPetConfig.tsx`
- Modify: `frontend/src/components/PetHabitat.tsx`

**Interfaces:**
- Consumes: Task 0 的插值 `t()`、Task 1/2 的 `ai`、`project` 命名空间。
- Produces: AI 聊天和宠物相关 UI 文本全部可翻译。

- [ ] **Step 1: 在 `i18n/index.tsx` 扩展 AI/宠物命名空间**

  新增/扩展键：

  ```typescript
  ai: {
    // ... existing keys
    credit_exhausted: 'AI 额度已用完，请购买额度包继续', // zh
    credit_exhausted: 'AI credits exhausted. Purchase more to continue.', // en
    fullscreen: '全屏对话', // zh
    fullscreen: 'FULLSCREEN CHAT', // en
    exit_fullscreen: '退出全屏 (ESC)', // zh
    exit_fullscreen: 'EXIT FULLSCREEN (ESC)', // en
    unnamed_project: '未命名项目', // zh
    unnamed_project: 'UNNAMED PROJECT', // en
  },
  placeholder: {
    // ... existing keys
    content_title: '内容标题...', // zh
    content_title: 'Content title...', // en
    note_title: '标题', // zh
    note_title: 'TITLE', // en
    note_content: '内容', // zh
    note_content: 'CONTENT', // en
  },
  pet: {
    config_title: 'AI 宠物配置', // zh
    config_title: 'AI PET CONFIG', // en
    name: '宠物名称', // zh
    name: 'PET NAME', // en
    personality: '性格', // zh
    personality: 'PERSONALITY', // en
    verbosity: '话痨程度', // zh
    verbosity: 'VERBOSITY', // en
  },
  ```

- [ ] **Step 2: 替换 `AIChat.tsx` 中的硬编码中文/英文**

  代表性修改：

  ```tsx
  // 替换前
  setError(`${t('ai.error_prefix')} AI 额度已用完，请购买额度包继续`);
  // 替换后
  setError(`${t('ai.error_prefix')} ${t('ai.credit_exhausted')}`);

  // 替换前
  {projectTitle || '未命名项目'} · {stage}
  // 替换后
  {projectTitle || t('ai.unnamed_project')} · {stage}

  // 替换前
  title="退出全屏 (ESC)"
  // 替换后
  title={t('ai.exit_fullscreen')}

  // 替换前
  title="全屏对话"
  // 替换后
  title={t('ai.fullscreen')}
  ```

  注意：AIChat.tsx 中的 system prompt 中文提示词（如 `gentle: '你是一位温柔鼓励的助手...'`）属于 AI 行为文案，需要评估是否国际化。短期可先保留中文提示词并新增 `ai.persona_*` 键，后续按需调整。

- [ ] **Step 3: 替换 `AIPetConfig.tsx` 中的硬编码文本**

  代表性修改：

  ```tsx
  // 替换前
  <h2>AI 宠物配置</h2>
  // 替换后
  <h2>{t('pet.config_title')}</h2>

  // 替换前
  <label>宠物名称</label>
  // 替换后
  <label>{t('pet.name')}</label>

  // 替换前
  <label>性格</label>
  // 替换后
  <label>{t('pet.personality')}</label>

  // 替换前
  <label>话痨程度</label>
  // 替换后
  <label>{t('pet.verbosity')}</label>
  ```

- [ ] **Step 4: 替换 `PetHabitat.tsx` 中的 tooltip/aria 文本**

  代表性修改：

  ```tsx
  // 替换前
  aria-label="宠物栖息地"
  // 替换后
  aria-label={t('pet.habitat')}
  ```

  在 `i18n/index.tsx` 的 `pet` 命名空间新增 `habitat` 键。

- [ ] **Step 5: 运行 build 验证**

  Run: `cd frontend && npm run build`
  Expected: 构建成功。

- [ ] **Step 6: 提交**

  ```bash
  git add frontend/src/i18n/index.tsx frontend/src/components/AIChat.tsx frontend/src/components/AIPetConfig.tsx frontend/src/components/PetHabitat.tsx
  git commit -m "i18n: AI chat and pet config"
  ```

---

## Task 4: 项目详情与 Stage 组件

**Files:**
- Modify: `frontend/src/i18n/index.tsx`（扩展 `stage`、`placeholder`、`action`、`toast`）
- Modify: `frontend/src/components/ProjectDetail.tsx`
- Modify: `frontend/src/components/IdeaStage.tsx`
- Modify: `frontend/src/components/IdeaSuggestModal.tsx`
- Modify: `frontend/src/components/ValidateStage.tsx`
- Modify: `frontend/src/components/PrototypeStage.tsx`
- Modify: `frontend/src/components/ShipStage.tsx`
- Modify: `frontend/src/components/GrowStage.tsx`
- Modify: `frontend/src/components/MonetizeStage.tsx`

**Interfaces:**
- Consumes: Task 0 的插值 `t()`、Task 1 的 `toast`、Task 3 的 `placeholder`。
- Produces: 所有 Stage 组件和项目详情页文本可翻译。

- [ ] **Step 1: 在 `i18n/index.tsx` 扩展 Stage 相关命名空间**

  新增/扩展键：

  ```typescript
  stage: {
    // ... existing keys
    previous: '已完成阶段', // zh
    previous: 'PREVIOUS STAGES', // en
  },
  placeholder: {
    // ... existing keys
    drag_sort: '拖拽排序', // zh
    drag_sort: 'DRAG TO SORT', // en
  },
  action: {
    // ... existing keys
    edit: '编辑', // zh
    edit: 'EDIT', // en
    delete: '删除', // zh
    delete: 'DELETE', // en
    apply: '应用建议', // zh
    apply: 'APPLY SUGGESTIONS', // en
    saving: '保存中...', // zh
    saving: 'SAVING...', // en
    add: '添加', // zh
    add: 'ADD', // en
  },
  idea: {
    new_dimension: '新维度', // zh
    new_dimension: 'NEW DIMENSION', // en
    click_to_edit: '点击编辑...', // zh
    click_to_edit: 'Click to edit...', // en
    no_notes: '还没有便利贴，点击"添加"创建第一个', // zh
    no_notes: 'No sticky notes yet. Click ADD to create the first one.', // en
    confirm_delete: '确定要删除这个便利贴吗？', // zh
    confirm_delete: 'Are you sure you want to delete this sticky note?', // en
    core_pain: '核心痛点', // zh
    core_pain: 'CORE PAIN', // en
    target_user: '目标用户', // zh
    target_user: 'TARGET USER', // en
    scenario: '使用场景', // zh
    scenario: 'USAGE SCENARIO', // en
    solution: '解决方案', // zh
    solution: 'SOLUTION', // en
    differentiation: '差异化价值', // zh
    differentiation: 'DIFFERENTIATION', // en
  },
  grow: {
    content_type_tutorial: '教程', // zh
    content_type_tutorial: 'Tutorial', // en
    content_type_showcase: '展示', // zh
    content_type_showcase: 'Showcase', // en
    content_type_story: '故事', // zh
    content_type_story: 'Story', // en
    content_type_tech: '技术', // zh
    content_type_tech: 'Tech', // en
    content_type_tips: '技巧', // zh
    content_type_tips: 'Tips', // en
    channel_xiaohongshu: '小红书', // zh
    channel_xiaohongshu: 'Xiaohongshu', // en
    channel_jike: '即刻', // zh
    channel_jike: 'Jike', // en
    channel_blog: '博客', // zh
    channel_blog: 'Blog', // en
    week_today: '本周', // zh
    week_today: 'THIS WEEK', // en
    week_offset_positive: '+{{week}}周', // zh
    week_offset_positive: '+{{week}}W', // en
    week_offset: '{{week}}周', // zh
    week_offset: '{{week}}W', // en
    weekday_mon: '周一', // zh
    weekday_mon: 'MON', // en
    weekday_tue: '周二', // zh
    weekday_tue: 'TUE', // en
    weekday_wed: '周三', // zh
    weekday_wed: 'WED', // en
    weekday_thu: '周四', // zh
    weekday_thu: 'THU', // en
    weekday_fri: '周五', // zh
    weekday_fri: 'FRI', // en
    weekday_sat: '周六', // zh
    weekday_sat: 'SAT', // en
    weekday_sun: '周日', // zh
    weekday_sun: 'SUN', // en
    status_published: '已发布', // zh
    status_published: 'PUBLISHED', // en
    status_scheduled: '计划中', // zh
    status_scheduled: 'SCHEDULED', // en
    status_draft: '草稿', // zh
    status_draft: 'DRAFT', // en
  },
  monetize: {
    model_freemium: '免费+付费墙', // zh
    model_freemium: 'FREEMIUM', // en
    model_subscription: '订阅制', // zh
    model_subscription: 'SUBSCRIPTION', // en
    model_onetime: '一次性购买', // zh
    model_onetime: 'ONE-TIME PURCHASE', // en
    model_ads: '广告', // zh
    model_ads: 'ADS', // en
    model_donation: '打赏/捐赠', // zh
    model_donation: 'DONATION', // en
    tier_free: '免费版', // zh
    tier_free: 'FREE', // en
    tier_pro: 'Pro版', // zh
    tier_pro: 'PRO', // en
    tier_team: '团队版', // zh
    tier_team: 'TEAM', // en
    period_month: '月', // zh
    period_month: '/MO', // en
    period_year: '年', // zh
    period_year: '/YR', // en
    period_lifetime: '终身', // zh
    period_lifetime: '/LIFE', // en
    visitor: '访客', // zh
    visitor: 'VISITOR', // en
    registered: '注册', // zh
    registered: 'REGISTERED', // en
    test_mode_on: '开启支付测试模式', // zh
    test_mode_on: 'ENABLE PAYMENT TEST MODE', // en
    test_mode_off: '关闭测试模式', // zh
    test_mode_off: 'DISABLE TEST MODE', // en
    test_card_success: '成功支付', // zh
    test_card_success: 'SUCCESS', // en
    test_card_3ds: '需要 3D Secure 验证', // zh
    test_card_3ds: '3D SECURE REQUIRED', // en
    test_card_insufficient: '卡余额不足（失败测试）', // zh
    test_card_insufficient: 'INSUFFICIENT FUNDS (FAIL TEST)', // en
  },
  ```

- [ ] **Step 2: 替换 `IdeaStage.tsx` 中的硬编码中文**

  代表性修改：

  ```tsx
  // 替换前
  placeholder="标题"
  // 替换后
  placeholder={t('placeholder.note_title')}

  // 替换前
  placeholder="内容"
  // 替换后
  placeholder={t('placeholder.note_content')}

  // 替换前
  title="拖拽排序"
  // 替换后
  title={t('placeholder.drag_sort')}

  // 替换前
  title="编辑"
  // 替换后
  title={t('action.edit')}

  // 替换前
  title="删除"
  // 替换后
  title={t('action.delete')}

  // 替换前
  title: '新维度', content: '点击编辑...'
  // 替换后
  title: t('idea.new_dimension'), content: t('idea.click_to_edit')

  // 替换前
  if (!window.confirm('确定要删除这个便利贴吗？')) return;
  // 替换后
  if (!window.confirm(t('idea.confirm_delete'))) return;

  // 替换前
  showToast('AI 建议已智能合并到便利贴', 'success');
  // 替换后
  showToast(t('toast.merge_suggestions'), 'success');

  // 替换前
  showToast('AI 建议已覆盖全部便利贴', 'success');
  // 替换后
  showToast(t('toast.override_suggestions'), 'success');

  // 替换前
  '描述你想解决的核心问题...',
  // 替换后
  t('placeholder.describe_pain_point'),

  // 替换前
  '谁会使用这个产品？',
  // 替换后
  t('ai.target_user'),

  // 替换前
  '用户在什么情况下会用？',
  // 替换后
  // 新增 ai.usage_scenario 键

  // 替换前
  '简述核心功能...',
  // 替换后
  t('ai.solution'),

  // 替换前
  '与现有方案相比，你的优势是什么？',
  // 替换后
  t('ai.differentiation'),

  // 替换前
  <p>还没有便利贴，点击"添加"创建第一个</p>
  // 替换后
  <p>{t('idea.no_notes')}</p>
  ```

- [ ] **Step 3: 替换 `IdeaSuggestModal.tsx` 中的硬编码文本**

  与 `IdeaStage.tsx` 类似，替换 `SKELETON_TITLES`、占位符、`应用建议` / `保存中...` 等。

- [ ] **Step 4: 替换 `ValidateStage.tsx`、`PrototypeStage.tsx`、`ShipStage.tsx` 中的硬编码文本**

  每个组件扫描 `placeholder=`、`title=`、`showToast(` 和 JSX 文本节点，建立到 `stage`、`action`、`toast` 命名空间的映射。

- [ ] **Step 5: 替换 `GrowStage.tsx` 中的硬编码中文**

  代表性修改：

  ```tsx
  // 替换前
  { type: 'tutorial', label: '教程', description: '如何使用产品' },
  // 替换后
  { type: 'tutorial', label: t('grow.content_type_tutorial'), description: t('grow.content_type_tutorial_desc') },

  // 替换前
  { currentWeek === 0 ? '本周' : currentWeek > 0 ? `+${currentWeek}周` : `${currentWeek}周` }
  // 替换后
  { currentWeek === 0 ? t('grow.week_today') : currentWeek > 0 ? t('grow.week_offset_positive', { week: currentWeek }) : t('grow.week_offset', { week: currentWeek }) }

  // 替换前
  {['周一', '周二', ...].map((day, i) => ...)}
  // 替换后
  {[t('grow.weekday_mon'), t('grow.weekday_tue'), ...].map((day, i) => ...)}

  // 替换前
  {content.status === 'published' ? '已发布' : content.status === 'scheduled' ? '计划中' : '草稿'}
  // 替换后
  {content.status === 'published' ? t('grow.status_published') : content.status === 'scheduled' ? t('grow.status_scheduled') : t('grow.status_draft')}
  ```

- [ ] **Step 6: 替换 `MonetizeStage.tsx` 中的硬编码中文**

  代表性修改：

  ```tsx
  // 替换前
  { key: 'freemium', label: '免费+付费墙', description: '基础功能免费，高级功能付费' },
  // 替换后
  { key: 'freemium', label: t('monetize.model_freemium'), description: t('monetize.model_freemium_desc') },

  // 替换前
  { id: 'free', name: '免费版', price: 0, period: 'month', features: ['基础功能', '社区支持'] },
  // 替换后
  { id: 'free', name: t('monetize.tier_free'), price: 0, period: 'month', features: [t('monetize.feature_basic'), t('monetize.feature_community')] }

  // 替换前
  /{tier.period === 'month' ? '月' : tier.period === 'year' ? '年' : '终身'}
  // 替换后
  /{tier.period === 'month' ? t('monetize.period_month') : tier.period === 'year' ? t('monetize.period_year') : t('monetize.period_lifetime')}

  // 替换前
  label="访客"
  // 替换后
  label={t('monetize.visitor')}

  // 替换前
  label="注册"
  // 替换后
  label={t('monetize.registered')}
  ```

- [ ] **Step 7: 替换 `ProjectDetail.tsx` 中的硬编码文本**

  扫描所有 JSX 文本节点、`placeholder`、`title`、`aria-label`，建立到已有/新增键的映射。

- [ ] **Step 8: 运行 build 验证**

  Run: `cd frontend && npm run build`
  Expected: 构建成功。

- [ ] **Step 9: 提交**

  ```bash
  git add frontend/src/i18n/index.tsx frontend/src/components/ProjectDetail.tsx frontend/src/components/IdeaStage.tsx frontend/src/components/IdeaSuggestModal.tsx frontend/src/components/ValidateStage.tsx frontend/src/components/PrototypeStage.tsx frontend/src/components/ShipStage.tsx frontend/src/components/GrowStage.tsx frontend/src/components/MonetizeStage.tsx
  git commit -m "i18n: project detail and stage components"
  ```

---

## Task 5: 账号、管理、认证页面

**Files:**
- Modify: `frontend/src/i18n/index.tsx`（扩展 `auth`、`account`、`validation`、`system`）
- Modify: `frontend/src/components/ProfilePage.tsx`
- Modify: `frontend/src/components/AdminPage.tsx`
- Modify: `frontend/src/components/ChangePasswordModal.tsx`
- Modify: `frontend/src/pages/VerifyEmailPage.tsx`
- Modify: `frontend/src/pages/ResetPasswordPage.tsx`

**Interfaces:**
- Consumes: Task 1 的 `account`、`quota`、Task 0 的插值 `t()`。
- Produces: 账号/管理/认证相关页面完全可翻译。

- [ ] **Step 1: 在 `i18n/index.tsx` 扩展相关命名空间**

  新增/扩展键：

  ```typescript
  auth: {
    // ... existing keys
    current_password: '当前密码', // zh
    current_password: 'Current Password', // en
    new_password: '新密码', // zh
    new_password: 'New Password', // en
    confirm_new_password: '确认新密码', // zh
    confirm_new_password: 'Confirm New Password', // en
    change_password: '修改密码', // zh
    change_password: 'Change Password', // en
    first_login_change: '首次登录 — 修改默认密码', // zh
    first_login_change: 'First Login — Change Default Password', // en
    first_login_hint: '为了账户安全，请先修改默认密码', // zh
    first_login_hint: 'For account security, please change the default password first', // en
    password_min_length: '新密码至少需要 {{min}} 个字符', // zh
    password_min_length: 'New password must be at least {{min}} characters', // en
    password_require_uppercase: '新密码需要包含至少 1 个大写字母', // zh
    password_require_uppercase: 'New password must contain at least 1 uppercase letter', // en
    password_require_lowercase: '新密码需要包含至少 1 个小写字母', // zh
    password_require_lowercase: 'New password must contain at least 1 lowercase letter', // en
    password_require_digit: '新密码需要包含至少 1 个数字', // zh
    password_require_digit: 'New password must contain at least 1 digit', // en
    password_changed: '密码修改成功', // zh
    password_changed: 'Password changed successfully', // en
    verifying: '正在检查验证链接...', // zh
    verifying: 'Verifying link...', // en
    invalid_token: '验证链接无效：缺少 token', // zh
    invalid_token: 'Invalid verification link: missing token', // en
    verification_failed: '验证失败', // zh
    verification_failed: 'Verification failed', // en
    completing: '正在完成验证...', // zh
    completing: 'Completing verification...', // en
    reset_token_invalid: '重置链接无效：缺少 token', // zh
    reset_token_invalid: 'Invalid reset link: missing token', // en
    password_mismatch: '两次输入的密码不一致', // zh
    password_mismatch: 'Passwords do not match', // en
    reset_failed: '重置失败', // zh
    reset_failed: 'Reset failed', // en
    confirm_reset: '确认重置', // zh
    confirm_reset: 'Confirm Reset', // en
  },
  account: {
    // ... existing keys
    overview: '账户概览', // zh
    overview: 'ACCOUNT OVERVIEW', // en
    quota: '额度信息', // zh
    quota: 'QUOTA INFO', // en
    preferences: '偏好设置', // zh
    preferences: 'PREFERENCES', // en
    security: '安全设置', // zh
    security: 'SECURITY SETTINGS', // en
    oauth: '第三方账号', // zh
    oauth: 'THIRD-PARTY ACCOUNTS', // en
  },
  validation: {
    required: '请填写所有字段', // zh
    required: 'Please fill in all fields', // en
    password_mismatch: '两次输入的密码不一致', // zh
    password_mismatch: 'Passwords do not match', // en
    min_length: '密码至少需要 {{min}} 个字符', // zh
    min_length: 'Password must be at least {{min}} characters', // en
    password_complexity: '密码需要包含大小写字母和数字', // zh
    password_complexity: 'Password must contain uppercase, lowercase and digits', // en
  },
  ```

- [ ] **Step 2: 替换 `ProfilePage.tsx` 中的硬编码文本**

  代表性修改：

  ```tsx
  // 替换前
  showToast('加载用户信息失败', 'error');
  // 替换后
  showToast(t('toast.load_user_failed'), 'error');

  // 替换前
  showToast('宠物配置已保存', 'success');
  // 替换后
  showToast(t('toast.pet_saved'), 'success');

  // 替换前
  showToast('保存失败', 'error');
  // 替换后
  showToast(t('toast.pet_save_failed'), 'error');

  // 所有 Tab/按钮/标签使用 account.* 命名空间
  ```

- [ ] **Step 3: 替换 `AdminPage.tsx` 中的硬编码文本**

  扫描所有表格列头、按钮、提示文本，映射到 `system`、`action`、`auth` 等命名空间。

- [ ] **Step 4: 替换 `ChangePasswordModal.tsx` 中的硬编码文本**

  代表性修改：

  ```tsx
  // 替换前
  setError('请填写所有字段');
  // 替换后
  setError(t('validation.required'));

  // 替换前
  setError('两次输入的新密码不一致');
  // 替换后
  setError(t('validation.password_mismatch'));

  // 替换前
  setError('新密码至少需要 8 个字符');
  // 替换后
  setError(t('auth.password_min_length', { min: 8 }));

  // 替换前
  setError('新密码需要包含至少 1 个大写字母');
  // 替换后
  setError(t('auth.password_require_uppercase'));

  // 替换前
  {isForced ? '首次登录 — 修改默认密码' : '修改密码'}
  // 替换后
  {isForced ? t('auth.first_login_change') : t('auth.change_password')}

  // 替换前
  placeholder="输入当前密码"
  // 替换后
  placeholder={t('auth.current_password')}
  ```

- [ ] **Step 5: 替换 `VerifyEmailPage.tsx` 中的硬编码文本**

  代表性修改：

  ```tsx
  // 替换前
  const [message, setMessage] = useState('正在检查验证链接...');
  // 替换后
  const [message, setMessage] = useState(t('auth.verifying'));

  // 替换前
  setMessage('验证链接无效：缺少 token');
  // 替换后
  setMessage(t('auth.invalid_token'));

  // 替换前
  setMessage('验证失败');
  // 替换后
  setMessage(t('auth.verification_failed'));

  // 替换前
  setMessage('正在完成验证...');
  // 替换后
  setMessage(t('auth.completing'));
  ```

- [ ] **Step 6: 替换 `ResetPasswordPage.tsx` 中的硬编码文本**

  与 `ChangePasswordModal.tsx` 类似，替换校验错误、占位符、按钮。

- [ ] **Step 7: 运行 build 验证**

  Run: `cd frontend && npm run build`
  Expected: 构建成功。

- [ ] **Step 8: 提交**

  ```bash
  git add frontend/src/i18n/index.tsx frontend/src/components/ProfilePage.tsx frontend/src/components/AdminPage.tsx frontend/src/components/ChangePasswordModal.tsx frontend/src/pages/VerifyEmailPage.tsx frontend/src/pages/ResetPasswordPage.tsx
  git commit -m "i18n: profile, admin and auth pages"
  ```

---

## Task 6: 落地页与辅助组件

**Files:**
- Modify: `frontend/src/i18n/index.tsx`（扩展 `landing`、`agent`、`model`）
- Modify: `frontend/src/components/LandingPage.tsx`
- Modify: `frontend/src/components/AgentCockpit.tsx`
- Modify: `frontend/src/components/ImageUpload.tsx`
- Modify: `frontend/src/components/ProjectCard.tsx`
- Modify: `frontend/src/components/UpgradePromptModal.tsx`
- Modify: `frontend/src/components/PaymentResultModal.tsx`
- Modify: `frontend/src/components/PricingPreview.tsx`

**Interfaces:**
- Consumes: 前面所有任务建立的命名空间。
- Produces: 剩余所有组件文本可翻译。

- [ ] **Step 1: 在 `i18n/index.tsx` 扩展相关命名空间**

  新增/扩展键：

  ```typescript
  landing: {
    stage_idea: '想法', // zh
    stage_idea: 'Idea', // en
    stage_validate: '验证', // zh
    stage_validate: 'Validate', // en
    stage_prototype: '原型', // zh
    stage_prototype: 'Prototype', // en
    stage_ship: '发布', // zh
    stage_ship: 'Ship', // en
    stage_grow: '增长', // zh
    stage_grow: 'Grow', // en
    stage_monetize: '变现', // zh
    stage_monetize: 'Monetize', // en
    cta_start: '开始使用', // zh
    cta_start: 'GET STARTED', // en
    cta_login: '登录', // zh
    cta_login: 'LOGIN', // en
  },
  agent: {
    mode_router: '智能路由', // zh
    mode_router: 'SMART ROUTING', // en
    mode_router_desc: 'Router 分析项目状态，动态选择 Specialist 并行执行（推荐）', // zh
    mode_router_desc: 'Router analyzes project state and dynamically selects Specialists for parallel execution (recommended)', // en
    mode_parallel: '全并行', // zh
    mode_parallel: 'ALL PARALLEL', // en
    mode_parallel_desc: '同时启动所有 7 个 Specialist（演示模式，Token 消耗较高）', // zh
    mode_parallel_desc: 'Launch all 7 Specialists simultaneously (demo mode, higher token cost)', // en
    mode_serial: '串行', // zh
    mode_serial: 'SERIAL', // en
    mode_serial_desc: '按顺序逐个执行（最省 Token，适合低并发场景）', // zh
    mode_serial_desc: 'Execute one by one in order (most token-efficient, suitable for low-concurrency scenarios)', // en
    role_router: '调度器', // zh
    role_router: 'ROUTER', // en
    role_idea: '想法顾问', // zh
    role_idea: 'IDEA ADVISOR', // en
    role_validate: '验证顾问', // zh
    role_validate: 'VALIDATION ADVISOR', // en
    // ... 其他 Specialist 角色
  },
  image: {
    select_image: '请选择图片文件', // zh
    select_image: 'Please select an image file', // en
    max_size: '图片大小不能超过 {{size}}', // zh
    max_size: 'Image size cannot exceed {{size}}', // en
    delete: '删除', // zh
    delete: 'DELETE', // en
  },
  upgrade: {
    title: '升级提示', // zh
    title: 'UPGRADE', // en
    feature_ai_calls: 'AI 调用额度不足，升级以解锁更多额度', // zh
    feature_ai_calls: 'Insufficient AI call credits. Upgrade to unlock more.', // en
  },
  payment: {
    success: '支付成功', // zh
    success: 'PAYMENT SUCCESSFUL', // en
    failed: '支付失败', // zh
    failed: 'PAYMENT FAILED', // en
  },
  ```

- [ ] **Step 2: 替换 `LandingPage.tsx` 中的 stage 描述和 CTA**

  代表性修改：

  ```tsx
  // 替换前
  { key: 'idea', label: 'IDEA', desc: '想法', icon: Lightbulb },
  // 替换后
  { key: 'idea', label: 'IDEA', desc: t('landing.stage_idea'), icon: Lightbulb },
  ```

- [ ] **Step 3: 替换 `AgentCockpit.tsx` 中的模式/角色标签**

  代表性修改：

  ```tsx
  // 替换前
  label: '智能路由',
  // 替换后
  label: t('agent.mode_router'),

  // 替换前
  router: '调度器',
  // 替换后
  router: t('agent.role_router'),
  ```

- [ ] **Step 4: 替换 `ImageUpload.tsx` 中的提示和 title**

  代表性修改：

  ```tsx
  // 替换前
  alert('请选择图片文件');
  // 替换后
  alert(t('image.select_image'));

  // 替换前
  alert('图片大小不能超过 2MB');
  // 替换后
  alert(t('image.max_size', { size: '2MB' }));

  // 替换前
  title="删除"
  // 替换后
  title={t('image.delete')}
  ```

- [ ] **Step 5: 替换 `ProjectCard.tsx`、`UpgradePromptModal.tsx`、`PaymentResultModal.tsx`、`PricingPreview.tsx` 中的硬编码文本**

  扫描每个组件，使用 `project`、`status`、`action`、`upgrade`、`payment`、`pricing` 命名空间替换。

- [ ] **Step 6: 运行 build 验证**

  Run: `cd frontend && npm run build`
  Expected: 构建成功。

- [ ] **Step 7: 全局扫描收尾**

  Run: `cd frontend && grep -R "|| '中文'" src/ || true`
  Expected: 无 `|| '中文'` 兜底残留。

  Run: `cd frontend && grep -Rn "[一-龥]" src/components/ src/pages/ | grep -v "//" | grep -v "t('" | head -50`
  Expected: 仅剩代码注释或已确认不需要国际化的字符串（如 `xiaohongshu` 渠道 key）。

- [ ] **Step 8: 提交**

  ```bash
  git add frontend/src/i18n/index.tsx frontend/src/components/LandingPage.tsx frontend/src/components/AgentCockpit.tsx frontend/src/components/ImageUpload.tsx frontend/src/components/ProjectCard.tsx frontend/src/components/UpgradePromptModal.tsx frontend/src/components/PaymentResultModal.tsx frontend/src/components/PricingPreview.tsx
  git commit -m "i18n: landing page and auxiliary components"
  ```

---

## Self-Review Checklist

- [ ] **Spec coverage**: 所有 22 个组件/页面均已分配到 Task 1–6。
- [ ] **Placeholder scan**: 计划内无 TBD/TODO/"后续再填"等占位符。
- [ ] **Type consistency**: 所有任务使用统一的 `t(key)` / `t(key, vars)` 签名。
- [ ] **Build gate**: 每个 Task 末尾都有 `npm run build` 验证步骤。
- [ ] **Commit guidance**: 每个 Task 末尾都有明确的 `git add` 和 `git commit` 命令。

## Gaps / Follow-ups

- 后端返回的错误消息未在本计划中处理，如需国际化需后端配合。
- `AIPetConfig.constants.ts` 中的宠物对话模板未强制迁移到 i18n，如后续需要多语言宠物对话，需单独任务处理。
- 7 种语言中的 ja/ko/es/fr/de 使用机器翻译，关键路径需人工抽查。
