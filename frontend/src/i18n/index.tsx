import React, { useState, useCallback } from 'react';
import type { Language } from './context';

export { type Language, type I18nContextType, I18nContext } from './context';

const translations = {
  zh: {
    // App
    app: {
      title: 'SPARK_BIN',
      subtitle: 'PROJECT_MANAGEMENT_SYSTEM',
      name: '创意管理',
    },
    // Navigation
    nav: {
      admin: '管理',
      account: '账号',
      logout: '退出登录',
      back: '返回',
      dashboard: '项目面板',
      toggle_menu: '切换菜单',
    },
    // Status
    status: {
      online: '在线',
      offline: '离线',
      syncing: '同步中...',
      active: '启用',
      paused: '暂停',
      archived: '归档',
      locked: '已锁定',
      never_synced: '未同步',
      completed: '已完成',
      viewing: '查看中',
    },
    // Actions
    action: {
      sync: '同步',
      config: '配置',
      create: '创建',
      save: '保存',
      cancel: '取消',
      delete: '删除',
      edit: '编辑',
      confirm: '确认',
      skip: '跳过',
      execute: '执行',
      test_connection: '测试连接',
      pause: '暂停',
      resume: '恢复',
      archive: '归档',
      restore: '恢复',
      return_to_dashboard: '返回面板',
      commit_stage: '提交阶段',
      generate_with_ai: 'AI 优化',
      manual_input: '手动输入',
      confirm_create: '确认创建',
    },
    // Common
    common: {
      or: '或',
      bind: '绑定',
      unbind: '解绑',
    },
    // Project
    project: {
      id: '项目编号',
      title: '项目名称',
      description: '描述',
      pain_point: '痛点描述',
      current_stage: '当前阶段',
      progress: '进度',
      total: '总计',
      active_projects: '活跃项目',
      paused_projects: '暂停项目',
      archived_projects: '归档项目',
      previous_stages: '已完成阶段',
      no_projects: '未找到项目',
      create_first: '点击下方按钮创建您的第一个项目',
      awaiting_input: '等待输入...',
      ready_to_commit: '准备提交...',
      add_new: '添加项目',
    },
    // Stages - Vibe/独立开发专用流程
    stage: {
      idea: '想法',        // 想法
      validate: '验证',    // 验证（快速确认需求）
      prototype: '原型',   // 原型（MVP，不完美但可用）
      ship: '发布',        // 发布（尽快上线）
      grow: '增长',        // 增长（获取用户）
      monetize: '变现',    // 变现（独立开发要赚钱）
      stages_completed: '已完成阶段',
    },
    // GitHub
    github: {
      config: 'GITHUB 配置',
      token: '个人访问令牌',
      owner: '仓库所有者',
      repository: '仓库名称',
      file_path: '文件路径',
      scope_required: '需要 repo 权限',
      import_title: '从 GitHub 导入',
      connect_prompt: '需要授权访问你的 GitHub 公开仓库',
      connect: '连接 GitHub',
      no_repos: '未找到公开仓库',
      select_repo: '选择要导入的仓库',
      loading_repos: '加载仓库中...',
      ai_analysis: 'AI 分析结果',
      confidence: '置信度',
      creating_project: '正在创建项目...',
      import_from_github: '从 GitHub 导入',
      repo_imported: '仓库导入成功',
    },
    // AI
    ai: {
      assistant: 'AI 助手',
      model: '模型版本',
      processing: '处理中...',
      thinking: '思考中...',
      error_prefix: '[错误]',
      ok_prefix: '[成功]',
      api_error: 'API 调用失败',
      config_required: '请先配置 AI 服务（管理 > AI 配置）',
      no_response: '无响应',
      quick_actions: '快捷操作',
      target_user: '目标用户',
      value_prop: '价值主张',
      framework: '调研框架',
      competitors: '竞品分析',
      tasks: '任务分解',
      tech_stack: '技术选型',
      social_copy: '宣传文案',
      channels: '推广渠道',
      no_models_available: '暂无可用模型，请联系管理员配置',
      providers_count: '个可用模型',
      credits: 'AI 额度',
    },
    // Modal
    modal: {
      init_project: '初始化项目',
      confirm_params: '确认参数',
      input_description: '输入描述',
      project_title: '项目名称',
      select_model: '选择模型',
      manual_input: '手动输入项目信息',
    },
    // Auth
    auth: {
      account_auth: 'ACCOUNT AUTHENTICATION',
      login: 'LOGIN',
      register: 'REGISTER',
      forgot_password: 'FORGOT PASSWORD',
      username: 'Username',
      password: 'Password',
      email: 'Email',
      confirm_password: 'Confirm Password',
      remember_me: 'Remember me',
      logging_in: 'Logging in...',
      registering: 'Registering...',
      sending: 'Sending...',
      send_reset_email: 'Send Reset Email',
      back_to_login: 'Back to Login',
      or_login_with: 'Or login with',
      password_requirements: 'At least 8 chars with uppercase, lowercase, digit and special char',
      slider_hint: 'Drag slider to complete puzzle',
      refresh_captcha: 'Refresh',
      login_failed: 'Login failed',
      register_failed: 'Registration failed',
      send_failed: 'Send failed',
      logout: 'Logout',
      account_overview: 'Account Overview',
      quota_info: 'Quota Info',
      preferences: 'Preferences',
      security_settings: 'Security Settings',
      oauth_accounts: 'Third-party Accounts',
      bind: 'Bind',
      unbind: 'Unbind',
      change_password: 'Change Password',
      admin: 'ADMIN',
      user: 'USER',
    },
    // Section Headers
    section: {
      active_projects: '活跃项目',
      paused_projects: '暂停项目',
      archived_projects: '归档项目',
    },
    // System
    system: {
      status: '系统状态',
      last_sync: '上次同步',
      total_projects: '项目总数',
    },
    // Theme
    theme: {
      dark: '深色',
      light: '浅色',
      switch_to_dark: '切换到深色模式',
      switch_to_light: '切换到浅色模式',
      toggle_theme: '切换主题',
    },
    // Placeholders
    placeholder: {
      describe_pain_point: '描述您的痛点或想法...',
      enter_notes: '在此输入笔记...',
      type_message: '输入消息...',
    },
    // Errors
    error: {
      project_not_found: '项目不存在',
      stage_not_found: '阶段数据缺失',
      connection_failed: '连接失败',
      optimize_failed: '优化失败',
    },
    // Backend
    backend: {
      mode: '后端模式',
      data_storage: '数据存储在 PostgreSQL',
    },
    // Filter
    filter: {
      filter: '筛选',
      clear: '清除',
      filtered: '已筛选',
      no_filtered_projects: '未找到匹配项目',
      try_different_filter: '尝试选择其他筛选条件',
    },
    // Error Banner
    error_banner: {
      error_prefix: '错误',
      retry: '重试',
    },
    // Empty State
    empty_state: {
      prompt: '> _',
      awaiting_input: '等待输入...',
    },
    // Quota
    quota: {
      credits: 'AI 额度',
      ai_label: 'AI: {{credits}}',
    },
    // Toast
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
    // Dialog
    dialog: {
      stay: '留下',
      leave: '离开',
    },
    // Account
    account: {
      settings: '账号设置',
      oauth_binding: '第三方账号绑定',
      bound: '已绑定',
      not_bound: '未绑定',
    },
    // Language
    language: {
      name_zh: '简体中文',
      name_en: 'English',
      name_ja: '日本語',
      name_ko: '한국어',
      name_es: 'Español',
      name_fr: 'Français',
      name_de: 'Deutsch',
    },
  },
  en: {
    // App
    app: {
      title: 'SPARK_BIN',
      subtitle: 'PROJECT_MANAGEMENT_SYSTEM',
      name: 'Spark Bin',
    },
    // Navigation
    nav: {
      admin: 'ADMIN',
      account: 'ACCOUNT',
      logout: 'LOGOUT',
      back: 'BACK',
      dashboard: 'DASHBOARD',
      toggle_menu: 'TOGGLE MENU',
    },
    // Status
    status: {
      online: 'ONLINE',
      offline: 'OFFLINE',
      syncing: 'SYNCING...',
      active: 'ACTIVE',
      paused: 'PAUSED',
      archived: 'ARCHIVED',
      locked: 'LOCKED',
      never_synced: 'NEVER_SYNCED',
      completed: 'COMPLETED',
      viewing: 'VIEWING',
    },
    // Actions
    action: {
      sync: 'SYNC',
      config: 'CONFIG',
      create: 'CREATE',
      save: 'SAVE',
      cancel: 'CANCEL',
      delete: 'DELETE',
      edit: 'EDIT',
      confirm: 'CONFIRM',
      skip: 'SKIP',
      execute: 'EXECUTE',
      test_connection: 'TEST_CONNECTION',
      pause: 'PAUSE',
      resume: 'RESUME',
      archive: 'ARCHIVE',
      restore: 'RESTORE',
      return_to_dashboard: 'RETURN_TO_DASHBOARD',
      commit_stage: 'COMMIT_STAGE',
      generate_with_ai: 'OPTIMIZE_WITH_AI',
      manual_input: 'MANUAL_INPUT',
      confirm_create: 'CONFIRM_CREATE',
    },
    // Common
    common: {
      or: 'OR',
      bind: 'BIND',
      unbind: 'UNBIND',
    },
    // Project
    project: {
      id: 'PROJECT_ID',
      title: 'PROJECT_TITLE',
      description: 'DESCRIPTION',
      pain_point: 'PAIN_POINT',
      current_stage: 'CURRENT_STAGE',
      progress: 'PROGRESS',
      total: 'TOTAL',
      active_projects: 'ACTIVE_PROJECTS',
      paused_projects: 'PAUSED_PROJECTS',
      archived_projects: 'ARCHIVED_PROJECTS',
      previous_stages: 'PREVIOUS_STAGES',
      no_projects: 'NO_PROJECTS_FOUND',
      create_first: 'Initialize your first project using the button below.',
      awaiting_input: 'AWAITING_INPUT...',
      ready_to_commit: 'READY_TO_COMMIT...',
      add_new: 'ADD PROJECT',
    },
    // Stages - Vibe/Indie Hacker flow
    stage: {
      idea: 'IDEA',        // Idea
      validate: 'VALIDATE', // Validate (quick demand check)
      prototype: 'PROTOTYPE', // Prototype (MVP, imperfect but works)
      ship: 'SHIP',        // Ship (release fast)
      grow: 'GROW',        // Grow (acquire users)
      monetize: 'MONETIZE', // Monetize (indie hackers need revenue)
      stages_completed: 'STAGES_COMPLETED',
    },
    // GitHub
    github: {
      config: 'GITHUB_CONFIG',
      token: 'Personal_Access_Token',
      owner: 'Owner',
      repository: 'Repository',
      file_path: 'File_Path',
      scope_required: 'Requires repo scope',
      import_title: 'Import from GitHub',
      connect_prompt: 'Authorization required to access your public GitHub repositories',
      connect: 'Connect GitHub',
      no_repos: 'No public repositories found',
      select_repo: 'Select a repository to import',
      loading_repos: 'Loading repositories...',
      ai_analysis: 'AI Analysis',
      confidence: 'Confidence',
      creating_project: 'Creating project...',
      import_from_github: 'Import from GitHub',
      repo_imported: 'Repository imported successfully',
    },
    // AI
    ai: {
      assistant: 'AI_ASSISTANT',
      model: 'MODEL_VERSION',
      processing: 'PROCESSING...',
      thinking: 'THINKING...',
      error_prefix: '[ERROR]',
      ok_prefix: '[OK]',
      api_error: 'API_ERROR',
      config_required: 'Please configure AI service first (Admin > AI Config)',
      no_response: 'NO_RESPONSE',
      quick_actions: 'QUICK_ACTIONS',
      target_user: 'target_user',
      value_prop: 'value_prop',
      framework: 'framework',
      competitors: 'competitors',
      tasks: 'tasks',
      tech_stack: 'tech_stack',
      social_copy: 'social_copy',
      channels: 'channels',
      no_models_available: 'No models available. Please contact admin to configure.',
      providers_count: 'available models',
      credits: 'AI CREDITS',
    },
    // Modal
    modal: {
      init_project: 'INIT_PROJECT',
      confirm_params: 'CONFIRM_PARAMS',
      input_description: 'Input_Description',
      project_title: 'Project_Title',
      select_model: 'SELECT_MODEL',
      manual_input: 'MANUAL_INPUT',
    },
    // Auth
    auth: {
      account_auth: 'ACCOUNT AUTHENTICATION',
      login: 'LOGIN',
      register: 'REGISTER',
      forgot_password: 'FORGOT PASSWORD',
      username: 'Username',
      password: 'Password',
      email: 'Email',
      confirm_password: 'Confirm Password',
      remember_me: 'Remember me',
      logging_in: 'Logging in...',
      registering: 'Registering...',
      sending: 'Sending...',
      send_reset_email: 'Send Reset Email',
      back_to_login: 'Back to Login',
      or_login_with: 'Or login with',
      password_requirements: 'At least 8 chars with uppercase, lowercase, digit and special char',
      slider_hint: 'Drag slider to complete puzzle',
      refresh_captcha: 'Refresh',
      login_failed: 'Login failed',
      register_failed: 'Registration failed',
      send_failed: 'Send failed',
      logout: 'Logout',
      account_overview: 'Account Overview',
      quota_info: 'Quota Info',
      preferences: 'Preferences',
      security_settings: 'Security Settings',
      oauth_accounts: 'Third-party Accounts',
      bind: 'Bind',
      unbind: 'Unbind',
      change_password: 'Change Password',
      admin: 'ADMIN',
      user: 'USER',
    },
    // Section Headers
    section: {
      active_projects: 'ACTIVE_PROJECTS',
      paused_projects: 'PAUSED_PROJECTS',
      archived_projects: 'ARCHIVED_PROJECTS',
    },
    // System
    system: {
      status: 'SYSTEM_STATUS',
      last_sync: 'LAST_SYNC',
      total_projects: 'TOTAL_PROJECTS',
    },
    // Theme
    theme: {
      dark: 'DARK',
      light: 'LIGHT',
      switch_to_dark: 'Switch to Dark Mode',
      switch_to_light: 'Switch to Light Mode',
      toggle_theme: 'TOGGLE THEME',
    },
    // Placeholders
    placeholder: {
      describe_pain_point: 'Describe your pain point or idea...',
      enter_notes: 'Enter your notes here...',
      type_message: 'Type your message...',
    },
    // Errors
    error: {
      project_not_found: 'PROJECT_NOT_FOUND',
      stage_not_found: 'STAGE_DATA_MISSING',
      connection_failed: 'CONNECTION_FAILED',
      optimize_failed: 'OPTIMIZE_FAILED',
    },
    // Backend
    backend: {
      mode: 'BACKEND MODE',
      data_storage: 'Data stored in PostgreSQL',
    },
    // Filter
    filter: {
      filter: 'FILTER',
      clear: '[CLEAR]',
      filtered: 'FILTERED',
      no_filtered_projects: 'No matching projects found',
      try_different_filter: 'Try selecting a different filter',
    },
    // Error Banner
    error_banner: {
      error_prefix: 'ERROR',
      retry: 'RETRY',
    },
    // Empty State
    empty_state: {
      prompt: '> _',
      awaiting_input: 'AWAITING_INPUT...',
    },
    // Quota
    quota: {
      credits: 'AI CREDITS',
      ai_label: 'AI: {{credits}}',
    },
    // Toast
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
    // Dialog
    dialog: {
      stay: 'STAY',
      leave: 'LEAVE',
    },
    // Account
    account: {
      settings: 'ACCOUNT SETTINGS',
      oauth_binding: 'THIRD-PARTY ACCOUNT BINDING',
      bound: 'Bound',
      not_bound: 'Not bound',
    },
    // Language
    language: {
      name_zh: '简体中文',
      name_en: 'English',
      name_ja: '日本語',
      name_ko: '한국어',
      name_es: 'Español',
      name_fr: 'Français',
      name_de: 'Deutsch',
    },
  },
  ja: {
    // App
    app: {
      title: 'SPARK_BIN',
      subtitle: 'PROJECT_MANAGEMENT_SYSTEM',
      name: 'クリエイティブ管理',
    },
    // Navigation
    nav: {
      admin: '管理',
      account: 'アカウント',
      logout: 'ログアウト',
      back: '戻る',
      dashboard: 'ダッシュボード',
      toggle_menu: 'メニュー切り替え',
    },
    // Status
    status: {
      online: 'オンライン',
      offline: 'オフライン',
      syncing: '同期中...',
      active: '進行中',
      paused: '一時停止',
      archived: 'アーカイブ',
      locked: 'ロック済み',
      never_synced: '未同期',
      completed: '完了',
      viewing: '閲覧中',
    },
    // Actions
    action: {
      sync: '同期',
      config: '設定',
      create: '作成',
      save: '保存',
      cancel: 'キャンセル',
      delete: '削除',
      edit: '編集',
      confirm: '確認',
      skip: 'スキップ',
      execute: '実行',
      test_connection: '接続テスト',
      pause: '一時停止',
      resume: '再開',
      archive: 'アーカイブ',
      restore: '復元',
      return_to_dashboard: 'ダッシュボードに戻る',
      commit_stage: 'ステージを確定',
      generate_with_ai: 'AIで最適化',
      manual_input: '手動入力',
      confirm_create: '作成を確認',
    },
    // Common
    common: {
      or: 'または',
      bind: '連携',
      unbind: '解除',
    },
    // Project
    project: {
      id: 'プロジェクトID',
      title: 'プロジェクト名',
      description: '説明',
      pain_point: '課題',
      current_stage: '現在のステージ',
      progress: '進捗',
      total: '合計',
      active_projects: '進行中プロジェクト',
      paused_projects: '一時停止プロジェクト',
      archived_projects: 'アーカイブ済みプロジェクト',
      previous_stages: '完了済みステージ',
      no_projects: 'プロジェクトが見つかりません',
      create_first: '下のボタンをクリックして最初のプロジェクトを作成してください',
      awaiting_input: '入力待ち...',
      ready_to_commit: '確定準備完了...',
      add_new: 'プロジェクトを追加',
    },
    // Stages - Vibe/独立開発専用フロー
    stage: {
      idea: 'アイデア',
      validate: '検証',
      prototype: 'プロトタイプ',
      ship: 'リリース',
      grow: '成長',
      monetize: '収益化',
      stages_completed: '完了済みステージ',
    },
    // GitHub
    github: {
      config: 'GITHUB設定',
      token: 'パーソナルアクセストークン',
      owner: 'オーナー',
      repository: 'リポジトリ',
      file_path: 'ファイルパス',
      scope_required: 'repoスコープが必要',
      import_title: 'GitHubからインポート',
      connect_prompt: '公開リポジトリにアクセスするには認可が必要です',
      connect: 'GitHubに接続',
      no_repos: '公開リポジトリが見つかりません',
      select_repo: 'インポートするリポジトリを選択',
      loading_repos: 'リポジトリを読み込み中...',
      ai_analysis: 'AI分析結果',
      confidence: '信頼度',
      creating_project: 'プロジェクトを作成中...',
      import_from_github: 'GitHubからインポート',
      repo_imported: 'リポジトリのインポートに成功しました',
    },
    // AI
    ai: {
      assistant: 'AIアシスタント',
      model: 'モデルバージョン',
      processing: '処理中...',
      thinking: '思考中...',
      error_prefix: '[エラー]',
      ok_prefix: '[成功]',
      api_error: 'API呼び出しに失敗しました',
      config_required: '先にAIサービスを設定してください（管理 > AI設定）',
      no_response: '応答なし',
      quick_actions: 'クイックアクション',
      target_user: 'ターゲットユーザー',
      value_prop: '価値提案',
      framework: '調査フレームワーク',
      competitors: '競合分析',
      tasks: 'タスク分解',
      tech_stack: '技術選定',
      social_copy: '宣伝文案',
      channels: 'プロモーション渠道',
      no_models_available: '利用可能なモデルがありません。管理者に連絡して設定してください',
      providers_count: '個の利用可能モデル',
      credits: 'AI クレジット',
    },
    // Modal
    modal: {
      init_project: 'プロジェクトを初期化',
      confirm_params: 'パラメータを確認',
      input_description: '説明を入力',
      project_title: 'プロジェクト名',
      select_model: 'モデルを選択',
      manual_input: 'プロジェクト情報を手動入力',
    },
    // Auth
    auth: {
      account_auth: 'ACCOUNT AUTHENTICATION',
      login: 'LOGIN',
      register: 'REGISTER',
      forgot_password: 'FORGOT PASSWORD',
      username: 'Username',
      password: 'Password',
      email: 'Email',
      confirm_password: 'Confirm Password',
      remember_me: 'Remember me',
      logging_in: 'Logging in...',
      registering: 'Registering...',
      sending: 'Sending...',
      send_reset_email: 'Send Reset Email',
      back_to_login: 'Back to Login',
      or_login_with: 'Or login with',
      password_requirements: 'At least 8 chars with uppercase, lowercase, digit and special char',
      slider_hint: 'Drag slider to complete puzzle',
      refresh_captcha: 'Refresh',
      login_failed: 'Login failed',
      register_failed: 'Registration failed',
      send_failed: 'Send failed',
      logout: 'Logout',
      account_overview: 'Account Overview',
      quota_info: 'Quota Info',
      preferences: 'Preferences',
      security_settings: 'Security Settings',
      oauth_accounts: 'Third-party Accounts',
      bind: 'Bind',
      unbind: 'Unbind',
      change_password: 'Change Password',
      admin: 'ADMIN',
      user: 'USER',
    },
    // Section Headers
    section: {
      active_projects: '進行中プロジェクト',
      paused_projects: '一時停止プロジェクト',
      archived_projects: 'アーカイブ済みプロジェクト',
    },
    // System
    system: {
      status: 'システム状態',
      last_sync: '前回同期',
      total_projects: 'プロジェクト総数',
    },
    // Theme
    theme: {
      dark: 'ダーク',
      light: 'ライト',
      switch_to_dark: 'ダークモードに切り替え',
      switch_to_light: 'ライトモードに切り替え',
      toggle_theme: 'テーマ切り替え',
    },
    // Placeholders
    placeholder: {
      describe_pain_point: '課題やアイデアを説明してください...',
      enter_notes: 'ここにメモを入力...',
      type_message: 'メッセージを入力...',
    },
    // Errors
    error: {
      project_not_found: 'プロジェクトが存在しません',
      stage_not_found: 'ステージデータが見つかりません',
      connection_failed: '接続に失敗しました',
      optimize_failed: '最適化に失敗しました',
    },
    // Backend
    backend: {
      mode: 'バックエンドモード',
      data_storage: 'PostgreSQL にデータを保存',
    },
    // Filter
    filter: {
      filter: 'フィルタ',
      clear: '[クリア]',
      filtered: 'フィルタ済み',
      no_filtered_projects: '一致するプロジェクトがありません',
      try_different_filter: '別のフィルタ条件を試してください',
    },
    // Error Banner
    error_banner: {
      error_prefix: 'エラー',
      retry: '再試行',
    },
    // Empty State
    empty_state: {
      prompt: '> _',
      awaiting_input: '入力待ち...',
    },
    // Quota
    quota: {
      credits: 'AI クレジット',
      ai_label: 'AI: {{credits}}',
    },
    // Toast
    toast: {
      oauth_bind_success: 'サードパーティアカウントの連携に成功しました',
      google_unbind_success: 'Googleアカウントの連携を解除しました',
      github_unbind_success: 'GitHubアカウントの連携を解除しました',
      unbind_failed: '連携解除に失敗しました',
      load_user_failed: 'ユーザー情報の読み込みに失敗しました',
      pet_saved: 'ペット設定を保存しました',
      pet_save_failed: '保存に失敗しました',
      merge_suggestions: 'AI提案を付箋に統合しました',
      override_suggestions: 'AI提案ですべての付箋を上書きしました',
      query_status_failed: '実行状態の確認に失敗しました',
      load_suggestions_failed: 'AI提案の取得に失敗しました',
    },
    // Dialog
    dialog: {
      stay: '残る',
      leave: '退出する',
    },
    // Account
    account: {
      settings: 'アカウント設定',
      oauth_binding: 'サードパーティアカウント連携',
      bound: '連携済み',
      not_bound: '未連携',
    },
    // Language
    language: {
      name_zh: '简体中文',
      name_en: 'English',
      name_ja: '日本語',
      name_ko: '한국어',
      name_es: 'Español',
      name_fr: 'Français',
      name_de: 'Deutsch',
    },
  },
  ko: {
    // App
    app: {
      title: 'SPARK_BIN',
      subtitle: 'PROJECT_MANAGEMENT_SYSTEM',
      name: '크리에이티브 관리',
    },
    // Navigation
    nav: {
      admin: '관리',
      account: '계정',
      logout: '로그아웃',
      back: '뒤로',
      dashboard: '대시보드',
      toggle_menu: '메뉴 전환',
    },
    // Status
    status: {
      online: '온라인',
      offline: '오프라인',
      syncing: '동기화 중...',
      active: '활성',
      paused: '일시 중지',
      archived: '보관',
      locked: '잠김',
      never_synced: '미동기화',
      completed: '완료',
      viewing: '보는 중',
    },
    // Actions
    action: {
      sync: '동기화',
      config: '설정',
      create: '생성',
      save: '저장',
      cancel: '취소',
      delete: '삭제',
      edit: '편집',
      confirm: '확인',
      skip: '걸너뛰기',
      execute: '실행',
      test_connection: '연결 테스트',
      pause: '일시 중지',
      resume: '재개',
      archive: '보관',
      restore: '복원',
      return_to_dashboard: '대시보드로 돌아가기',
      commit_stage: '단계 확정',
      generate_with_ai: 'AI 최적화',
      manual_input: '수동 입력',
      confirm_create: '생성 확인',
    },
    // Common
    common: {
      or: '또는',
      bind: '연동',
      unbind: '해제',
    },
    // Project
    project: {
      id: '프로젝트 ID',
      title: '프로젝트명',
      description: '설명',
      pain_point: '고통 지점',
      current_stage: '현재 단계',
      progress: '진행',
      total: '합계',
      active_projects: '활성 프로젝트',
      paused_projects: '일시 중지 프로젝트',
      archived_projects: '보관된 프로젝트',
      previous_stages: '완료된 단계',
      no_projects: '프로젝트를 찾을 수 없음',
      create_first: '아래 버튼을 클릭하여 첫 번째 프로젝트를 생성하세요',
      awaiting_input: '입력 대기 중...',
      ready_to_commit: '확정 준비 완료...',
      add_new: '프로젝트 추가',
    },
    // Stages - Vibe/인디 개발자 전용 플로우
    stage: {
      idea: '아이디어',
      validate: '검증',
      prototype: '프로토타입',
      ship: '배포',
      grow: '성장',
      monetize: '수익화',
      stages_completed: '완료된 단계',
    },
    // GitHub
    github: {
      config: 'GITHUB 설정',
      token: '개인 접근 토큰',
      owner: '소유자',
      repository: '저장소',
      file_path: '파일 경로',
      scope_required: 'repo 범위 필요',
      import_title: 'GitHub에서 가져오기',
      connect_prompt: '공개 저장소에 접근하려면 인증이 필요합니다',
      connect: 'GitHub 연결',
      no_repos: '공개 저장소를 찾을 수 없음',
      select_repo: '가져올 저장소 선택',
      loading_repos: '저장소 로드 중...',
      ai_analysis: 'AI 분석 결과',
      confidence: '신뢰도',
      creating_project: '프로젝트 생성 중...',
      import_from_github: 'GitHub에서 가져오기',
      repo_imported: '저장소 가져오기 성공',
    },
    // AI
    ai: {
      assistant: 'AI 어시스턴트',
      model: '모델 버전',
      processing: '처리 중...',
      thinking: '생각 중...',
      error_prefix: '[오류]',
      ok_prefix: '[성공]',
      api_error: 'API 호출 실패',
      config_required: 'AI 서비스를 먼저 설정하세요 (관리 > AI 설정)',
      no_response: '응답 없음',
      quick_actions: '빠른 작업',
      target_user: '타겟 사용자',
      value_prop: '가치 제안',
      framework: '조사 프레임워크',
      competitors: '경쟁사 분석',
      tasks: '작업 분해',
      tech_stack: '기술 스택',
      social_copy: '홍보 문구',
      channels: '프로모션 채널',
      no_models_available: '사용 가능한 모델이 없습니다. 관리자에게 문의하세요',
      providers_count: '개 사용 가능 모델',
      credits: 'AI 크레딧',
    },
    // Modal
    modal: {
      init_project: '프로젝트 초기화',
      confirm_params: '매개변수 확인',
      input_description: '설명 입력',
      project_title: '프로젝트명',
      select_model: '모델 선택',
      manual_input: '수동으로 프로젝트 정보 입력',
    },
    // Auth
    auth: {
      account_auth: 'ACCOUNT AUTHENTICATION',
      login: 'LOGIN',
      register: 'REGISTER',
      forgot_password: 'FORGOT PASSWORD',
      username: 'Username',
      password: 'Password',
      email: 'Email',
      confirm_password: 'Confirm Password',
      remember_me: 'Remember me',
      logging_in: 'Logging in...',
      registering: 'Registering...',
      sending: 'Sending...',
      send_reset_email: 'Send Reset Email',
      back_to_login: 'Back to Login',
      or_login_with: 'Or login with',
      password_requirements: 'At least 8 chars with uppercase, lowercase, digit and special char',
      slider_hint: 'Drag slider to complete puzzle',
      refresh_captcha: 'Refresh',
      login_failed: 'Login failed',
      register_failed: 'Registration failed',
      send_failed: 'Send failed',
      logout: 'Logout',
      account_overview: 'Account Overview',
      quota_info: 'Quota Info',
      preferences: 'Preferences',
      security_settings: 'Security Settings',
      oauth_accounts: 'Third-party Accounts',
      bind: 'Bind',
      unbind: 'Unbind',
      change_password: 'Change Password',
      admin: 'ADMIN',
      user: 'USER',
    },
    // Section Headers
    section: {
      active_projects: '활성 프로젝트',
      paused_projects: '일시 중지 프로젝트',
      archived_projects: '보관된 프로젝트',
    },
    // System
    system: {
      status: '시스템 상태',
      last_sync: '마지막 동기화',
      total_projects: '총 프로젝트',
    },
    // Theme
    theme: {
      dark: '다크',
      light: '라이트',
      switch_to_dark: '다크 모드로 전환',
      switch_to_light: '라이트 모드로 전환',
      toggle_theme: '테마 전환',
    },
    // Placeholders
    placeholder: {
      describe_pain_point: '고통 지점이나 아이디어를 설명하세요...',
      enter_notes: '여기에 메모를 입력...',
      type_message: '메시지를 입력...',
    },
    // Errors
    error: {
      project_not_found: '프로젝트가 존재하지 않습니다',
      stage_not_found: '단계 데이터를 찾을 수 없습니다',
      connection_failed: '연결 실패',
      optimize_failed: '최적화 실패',
    },
    // Backend
    backend: {
      mode: '백엔드 모드',
      data_storage: 'PostgreSQL에 데이터 저장',
    },
    // Filter
    filter: {
      filter: '필터',
      clear: '[지우기]',
      filtered: '필터링됨',
      no_filtered_projects: '일치하는 프로젝트 없음',
      try_different_filter: '다른 필터 조건을 선택해 보세요',
    },
    // Error Banner
    error_banner: {
      error_prefix: '오류',
      retry: '재시도',
    },
    // Empty State
    empty_state: {
      prompt: '> _',
      awaiting_input: '입력 대기 중...',
    },
    // Quota
    quota: {
      credits: 'AI 크레딧',
      ai_label: 'AI: {{credits}}',
    },
    // Toast
    toast: {
      oauth_bind_success: '제3자 계정 연동 성공',
      google_unbind_success: 'Google 계정 연동 해제됨',
      github_unbind_success: 'GitHub 계정 연동 해제됨',
      unbind_failed: '연동 해제 실패',
      load_user_failed: '사용자 정보 로드 실패',
      pet_saved: '펫 설정 저장됨',
      pet_save_failed: '저장 실패',
      merge_suggestions: 'AI 제안이 포스트잇에 스마트 병합됨',
      override_suggestions: 'AI 제안이 모든 포스트잇을 덮어씀',
      query_status_failed: '실행 상태 조회 실패',
      load_suggestions_failed: 'AI 제안 가져오기 실패',
    },
    // Dialog
    dialog: {
      stay: '남기',
      leave: '떠나기',
    },
    // Account
    account: {
      settings: '계정 설정',
      oauth_binding: '제3자 계정 연동',
      bound: '연동됨',
      not_bound: '미연동',
    },
    // Language
    language: {
      name_zh: '简体中文',
      name_en: 'English',
      name_ja: '日本語',
      name_ko: '한국어',
      name_es: 'Español',
      name_fr: 'Français',
      name_de: 'Deutsch',
    },
  },
  es: {
    // App
    app: {
      title: 'SPARK_BIN',
      subtitle: 'PROJECT_MANAGEMENT_SYSTEM',
      name: 'Gestión Creativa',
    },
    // Navigation
    nav: {
      admin: 'Administrar',
      account: 'Cuenta',
      logout: 'Cerrar sesión',
      back: 'Atrás',
      dashboard: 'Panel',
      toggle_menu: 'Alternar menú',
    },
    // Status
    status: {
      online: 'En línea',
      offline: 'Desconectado',
      syncing: 'Sincronizando...',
      active: 'Activo',
      paused: 'Pausado',
      archived: 'Archivado',
      locked: 'Bloqueado',
      never_synced: 'Nunca sincronizado',
      completed: 'Completado',
      viewing: 'Visualizando',
    },
    // Actions
    action: {
      sync: 'Sincronizar',
      config: 'Configuración',
      create: 'Crear',
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      confirm: 'Confirmar',
      skip: 'Omitir',
      execute: 'Ejecutar',
      test_connection: 'Probar conexión',
      pause: 'Pausar',
      resume: 'Reanudar',
      archive: 'Archivar',
      restore: 'Restaurar',
      return_to_dashboard: 'Volver al panel',
      commit_stage: 'Confirmar etapa',
      generate_with_ai: 'Optimizar con IA',
      manual_input: 'Entrada manual',
      confirm_create: 'Confirmar creación',
    },
    // Common
    common: {
      or: 'o',
      bind: 'Vincular',
      unbind: 'Desvincular',
    },
    // Project
    project: {
      id: 'ID del proyecto',
      title: 'Título del proyecto',
      description: 'Descripción',
      pain_point: 'Punto de dolor',
      current_stage: 'Etapa actual',
      progress: 'Progreso',
      total: 'Total',
      active_projects: 'Proyectos activos',
      paused_projects: 'Proyectos pausados',
      archived_projects: 'Proyectos archivados',
      previous_stages: 'Etapas completadas',
      no_projects: 'No se encontraron proyectos',
      create_first: 'Crea tu primer proyecto con el botón de abajo',
      awaiting_input: 'Esperando entrada...',
      ready_to_commit: 'Listo para confirmar...',
      add_new: 'Agregar proyecto',
    },
    // Stages - Flujo Vibe/Indie Hacker
    stage: {
      idea: 'Idea',
      validate: 'Validar',
      prototype: 'Prototipo',
      ship: 'Lanzar',
      grow: 'Crecer',
      monetize: 'Monetizar',
      stages_completed: 'Etapas completadas',
    },
    // GitHub
    github: {
      config: 'Configuración de GitHub',
      token: 'Token de acceso personal',
      owner: 'Propietario',
      repository: 'Repositorio',
      file_path: 'Ruta del archivo',
      scope_required: 'Requiere alcance repo',
      import_title: 'Importar desde GitHub',
      connect_prompt: 'Se requiere autorización para acceder a tus repositorios públicos de GitHub',
      connect: 'Conectar GitHub',
      no_repos: 'No se encontraron repositorios públicos',
      select_repo: 'Selecciona un repositorio para importar',
      loading_repos: 'Cargando repositorios...',
      ai_analysis: 'Análisis de IA',
      confidence: 'Confianza',
      creating_project: 'Creando proyecto...',
      import_from_github: 'Importar desde GitHub',
      repo_imported: 'Repositorio importado con éxito',
    },
    // AI
    ai: {
      assistant: 'Asistente de IA',
      model: 'Versión del modelo',
      processing: 'Procesando...',
      thinking: 'Pensando...',
      error_prefix: '[ERROR]',
      ok_prefix: '[OK]',
      api_error: 'Error en la llamada a la API',
      config_required: 'Configura el servicio de IA primero (Admin > Configuración de IA)',
      no_response: 'Sin respuesta',
      quick_actions: 'Acciones rápidas',
      target_user: 'Usuario objetivo',
      value_prop: 'Propuesta de valor',
      framework: 'Marco de investigación',
      competitors: 'Análisis de competidores',
      tasks: 'Desglose de tareas',
      tech_stack: 'Stack tecnológico',
      social_copy: 'Copia promocional',
      channels: 'Canales de promoción',
      no_models_available: 'No hay modelos disponibles. Contacta al administrador.',
      providers_count: 'modelos disponibles',
      credits: 'Créditos IA',
    },
    // Modal
    modal: {
      init_project: 'Inicializar proyecto',
      confirm_params: 'Confirmar parámetros',
      input_description: 'Ingresar descripción',
      project_title: 'Título del proyecto',
      select_model: 'Seleccionar modelo',
      manual_input: 'Ingresar información manualmente',
    },
    // Auth
    auth: {
      account_auth: 'ACCOUNT AUTHENTICATION',
      login: 'LOGIN',
      register: 'REGISTER',
      forgot_password: 'FORGOT PASSWORD',
      username: 'Username',
      password: 'Password',
      email: 'Email',
      confirm_password: 'Confirm Password',
      remember_me: 'Remember me',
      logging_in: 'Logging in...',
      registering: 'Registering...',
      sending: 'Sending...',
      send_reset_email: 'Send Reset Email',
      back_to_login: 'Back to Login',
      or_login_with: 'Or login with',
      password_requirements: 'At least 8 chars with uppercase, lowercase, digit and special char',
      slider_hint: 'Drag slider to complete puzzle',
      refresh_captcha: 'Refresh',
      login_failed: 'Login failed',
      register_failed: 'Registration failed',
      send_failed: 'Send failed',
      logout: 'Logout',
      account_overview: 'Account Overview',
      quota_info: 'Quota Info',
      preferences: 'Preferences',
      security_settings: 'Security Settings',
      oauth_accounts: 'Third-party Accounts',
      bind: 'Bind',
      unbind: 'Unbind',
      change_password: 'Change Password',
      admin: 'ADMIN',
      user: 'USER',
    },
    // Section Headers
    section: {
      active_projects: 'Proyectos activos',
      paused_projects: 'Proyectos pausados',
      archived_projects: 'Proyectos archivados',
    },
    // System
    system: {
      status: 'Estado del sistema',
      last_sync: 'Última sincronización',
      total_projects: 'Total de proyectos',
    },
    // Theme
    theme: {
      dark: 'Oscuro',
      light: 'Claro',
      switch_to_dark: 'Cambiar a modo oscuro',
      switch_to_light: 'Cambiar a modo claro',
      toggle_theme: 'Alternar tema',
    },
    // Placeholders
    placeholder: {
      describe_pain_point: 'Describe tu punto de dolor o idea...',
      enter_notes: 'Ingresa tus notas aquí...',
      type_message: 'Escribe tu mensaje...',
    },
    // Errors
    error: {
      project_not_found: 'El proyecto no existe',
      stage_not_found: 'Faltan datos de la etapa',
      connection_failed: 'Conexión fallida',
      optimize_failed: 'Optimización fallida',
    },
    // Backend
    backend: {
      mode: 'Modo backend',
      data_storage: 'Datos almacenados en PostgreSQL',
    },
    // Filter
    filter: {
      filter: 'Filtrar',
      clear: '[Limpiar]',
      filtered: 'Filtrado',
      no_filtered_projects: 'No se encontraron proyectos coincidentes',
      try_different_filter: 'Prueba seleccionando otro filtro',
    },
    // Error Banner
    error_banner: {
      error_prefix: 'Error',
      retry: 'Reintentar',
    },
    // Empty State
    empty_state: {
      prompt: '> _',
      awaiting_input: 'Esperando entrada...',
    },
    // Quota
    quota: {
      credits: 'Créditos IA',
      ai_label: 'IA: {{credits}}',
    },
    // Toast
    toast: {
      oauth_bind_success: 'Cuenta de terceros vinculada correctamente',
      google_unbind_success: 'Cuenta de Google desvinculada',
      github_unbind_success: 'Cuenta de GitHub desvinculada',
      unbind_failed: 'Error al desvincular',
      load_user_failed: 'Error al cargar información del usuario',
      pet_saved: 'Configuración de mascota guardada',
      pet_save_failed: 'Error al guardar',
      merge_suggestions: 'Sugerencias de IA fusionadas en notas adhesivas',
      override_suggestions: 'Sugerencias de IA reemplazaron todas las notas adhesivas',
      query_status_failed: 'Error al consultar el estado de ejecución',
      load_suggestions_failed: 'Error al obtener sugerencias de IA',
    },
    // Dialog
    dialog: {
      stay: 'Quedarse',
      leave: 'Salir',
    },
    // Account
    account: {
      settings: 'Configuración de cuenta',
      oauth_binding: 'Vinculación de cuentas de terceros',
      bound: 'Vinculado',
      not_bound: 'No vinculado',
    },
    // Language
    language: {
      name_zh: '简体中文',
      name_en: 'English',
      name_ja: '日本語',
      name_ko: '한국어',
      name_es: 'Español',
      name_fr: 'Français',
      name_de: 'Deutsch',
    },
  },
  fr: {
    // App
    app: {
      title: 'SPARK_BIN',
      subtitle: 'PROJECT_MANAGEMENT_SYSTEM',
      name: 'Gestion Créative',
    },
    // Navigation
    nav: {
      admin: 'Administrer',
      account: 'Compte',
      logout: 'Déconnexion',
      back: 'Retour',
      dashboard: 'Tableau de bord',
      toggle_menu: 'Basculer le menu',
    },
    // Status
    status: {
      online: 'En ligne',
      offline: 'Hors ligne',
      syncing: 'Synchronisation...',
      active: 'Actif',
      paused: 'En pause',
      archived: 'Archivé',
      locked: 'Verrouillé',
      never_synced: 'Jamais synchronisé',
      completed: 'Terminé',
      viewing: 'Visualisation',
    },
    // Actions
    action: {
      sync: 'Synchroniser',
      config: 'Configuration',
      create: 'Créer',
      save: 'Enregistrer',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      confirm: 'Confirmer',
      skip: 'Passer',
      execute: 'Exécuter',
      test_connection: 'Tester la connexion',
      pause: 'Mettre en pause',
      resume: 'Reprendre',
      archive: 'Archiver',
      restore: 'Restaurer',
      return_to_dashboard: 'Retour au tableau de bord',
      commit_stage: "Valider l'étape",
      generate_with_ai: 'Optimiser avec l\'IA',
      manual_input: 'Saisie manuelle',
      confirm_create: 'Confirmer la création',
    },
    // Common
    common: {
      or: 'ou',
      bind: 'Lier',
      unbind: 'Délier',
    },
    // Project
    project: {
      id: 'ID du projet',
      title: 'Titre du projet',
      description: 'Description',
      pain_point: 'Point de douleur',
      current_stage: 'Étape actuelle',
      progress: 'Progression',
      total: 'Total',
      active_projects: 'Projets actifs',
      paused_projects: 'Projets en pause',
      archived_projects: 'Projets archivés',
      previous_stages: 'Étapes terminées',
      no_projects: 'Aucun projet trouvé',
      create_first: 'Créez votre premier projet en utilisant le bouton ci-dessous',
      awaiting_input: 'En attente de saisie...',
      ready_to_commit: 'Prêt à valider...',
      add_new: 'Ajouter un projet',
    },
    // Stages - Flux Vibe/Indie Hacker
    stage: {
      idea: 'Idée',
      validate: 'Valider',
      prototype: 'Prototype',
      ship: 'Lancer',
      grow: 'Croître',
      monetize: 'Monétiser',
      stages_completed: 'Étapes terminées',
    },
    // GitHub
    github: {
      config: 'Configuration GitHub',
      token: 'Jeton d\'accès personnel',
      owner: 'Propriétaire',
      repository: 'Dépôt',
      file_path: 'Chemin du fichier',
      scope_required: 'Nécessite l\'étendue repo',
      import_title: 'Importer depuis GitHub',
      connect_prompt: 'Autorisation requise pour accéder à vos dépôts publics GitHub',
      connect: 'Connecter GitHub',
      no_repos: 'Aucun dépôt public trouvé',
      select_repo: 'Sélectionnez un dépôt à importer',
      loading_repos: 'Chargement des dépôts...',
      ai_analysis: 'Analyse IA',
      confidence: 'Confiance',
      creating_project: 'Création du projet...',
      import_from_github: 'Importer depuis GitHub',
      repo_imported: 'Dépôt importé avec succès',
    },
    // AI
    ai: {
      assistant: 'Assistant IA',
      model: 'Version du modèle',
      processing: 'Traitement...',
      thinking: 'Réflexion...',
      error_prefix: '[ERREUR]',
      ok_prefix: '[OK]',
      api_error: 'Échec de l\'appel API',
      config_required: 'Veuillez d\'abord configurer le service IA (Admin > Configuration IA)',
      no_response: 'Aucune réponse',
      quick_actions: 'Actions rapides',
      target_user: 'Utilisateur cible',
      value_prop: 'Proposition de valeur',
      framework: 'Cadre d\'étude',
      competitors: 'Analyse des concurrents',
      tasks: 'Décomposition des tâches',
      tech_stack: 'Stack technique',
      social_copy: 'Texte promotionnel',
      channels: 'Canaux de promotion',
      no_models_available: 'Aucun modèle disponible. Veuillez contacter l\'administrateur.',
      providers_count: 'modèles disponibles',
      credits: 'Crédits IA',
    },
    // Modal
    modal: {
      init_project: 'Initialiser le projet',
      confirm_params: 'Confirmer les paramètres',
      input_description: 'Saisir la description',
      project_title: 'Titre du projet',
      select_model: 'Sélectionner le modèle',
      manual_input: 'Saisir manuellement les informations',
    },
    // Auth
    auth: {
      account_auth: 'ACCOUNT AUTHENTICATION',
      login: 'LOGIN',
      register: 'REGISTER',
      forgot_password: 'FORGOT PASSWORD',
      username: 'Username',
      password: 'Password',
      email: 'Email',
      confirm_password: 'Confirm Password',
      remember_me: 'Remember me',
      logging_in: 'Logging in...',
      registering: 'Registering...',
      sending: 'Sending...',
      send_reset_email: 'Send Reset Email',
      back_to_login: 'Back to Login',
      or_login_with: 'Or login with',
      password_requirements: 'At least 8 chars with uppercase, lowercase, digit and special char',
      slider_hint: 'Drag slider to complete puzzle',
      refresh_captcha: 'Refresh',
      login_failed: 'Login failed',
      register_failed: 'Registration failed',
      send_failed: 'Send failed',
      logout: 'Logout',
      account_overview: 'Account Overview',
      quota_info: 'Quota Info',
      preferences: 'Preferences',
      security_settings: 'Security Settings',
      oauth_accounts: 'Third-party Accounts',
      bind: 'Bind',
      unbind: 'Unbind',
      change_password: 'Change Password',
      admin: 'ADMIN',
      user: 'USER',
    },
    // Section Headers
    section: {
      active_projects: 'Projets actifs',
      paused_projects: 'Projets en pause',
      archived_projects: 'Projets archivés',
    },
    // System
    system: {
      status: 'État du système',
      last_sync: 'Dernière synchro',
      total_projects: 'Total des projets',
    },
    // Theme
    theme: {
      dark: 'Sombre',
      light: 'Clair',
      switch_to_dark: 'Passer en mode sombre',
      switch_to_light: 'Passer en mode clair',
      toggle_theme: 'Basculer le thème',
    },
    // Placeholders
    placeholder: {
      describe_pain_point: 'Décrivez votre point de douleur ou idée...',
      enter_notes: 'Entrez vos notes ici...',
      type_message: 'Tapez votre message...',
    },
    // Errors
    error: {
      project_not_found: 'Le projet n\'existe pas',
      stage_not_found: 'Données d\'étape manquantes',
      connection_failed: 'Échec de connexion',
      optimize_failed: 'Échec de l\'optimisation',
    },
    // Backend
    backend: {
      mode: 'Mode backend',
      data_storage: 'Données stockées dans PostgreSQL',
    },
    // Filter
    filter: {
      filter: 'Filtrer',
      clear: '[Effacer]',
      filtered: 'Filtré',
      no_filtered_projects: 'Aucun projet correspondant trouvé',
      try_different_filter: 'Essayez un autre filtre',
    },
    // Error Banner
    error_banner: {
      error_prefix: 'Erreur',
      retry: 'Réessayer',
    },
    // Empty State
    empty_state: {
      prompt: '> _',
      awaiting_input: 'En attente de saisie...',
    },
    // Quota
    quota: {
      credits: 'Crédits IA',
      ai_label: 'IA: {{credits}}',
    },
    // Toast
    toast: {
      oauth_bind_success: 'Compte tiers lié avec succès',
      google_unbind_success: 'Compte Google délié',
      github_unbind_success: 'Compte GitHub délié',
      unbind_failed: 'Échec du déliage',
      load_user_failed: 'Échec du chargement des infos utilisateur',
      pet_saved: 'Configuration de l\'animal sauvegardée',
      pet_save_failed: 'Échec de la sauvegarde',
      merge_suggestions: 'Suggestions IA fusionnées dans les post-its',
      override_suggestions: 'Suggestions IA remplacé tous les post-its',
      query_status_failed: 'Échec de la consultation du statut',
      load_suggestions_failed: 'Échec de l\'obtention des suggestions IA',
    },
    // Dialog
    dialog: {
      stay: 'Rester',
      leave: 'Partir',
    },
    // Account
    account: {
      settings: 'Paramètres du compte',
      oauth_binding: 'Lien de compte tiers',
      bound: 'Lié',
      not_bound: 'Non lié',
    },
    // Language
    language: {
      name_zh: '简体中文',
      name_en: 'English',
      name_ja: '日本語',
      name_ko: '한국어',
      name_es: 'Español',
      name_fr: 'Français',
      name_de: 'Deutsch',
    },
  },
  de: {
    // App
    app: {
      title: 'SPARK_BIN',
      subtitle: 'PROJECT_MANAGEMENT_SYSTEM',
      name: 'Kreativ-Verwaltung',
    },
    // Navigation
    nav: {
      admin: 'Verwalten',
      account: 'Konto',
      logout: 'Abmelden',
      back: 'Zurück',
      dashboard: 'Dashboard',
      toggle_menu: 'Menü umschalten',
    },
    // Status
    status: {
      online: 'Online',
      offline: 'Offline',
      syncing: 'Synchronisierung...',
      active: 'Aktiv',
      paused: 'Pausiert',
      archived: 'Archiviert',
      locked: 'Gesperrt',
      never_synced: 'Nie synchronisiert',
      completed: 'Abgeschlossen',
      viewing: 'Anzeigen',
    },
    // Actions
    action: {
      sync: 'Synchronisieren',
      config: 'Konfiguration',
      create: 'Erstellen',
      save: 'Speichern',
      cancel: 'Abbrechen',
      delete: 'Löschen',
      edit: 'Bearbeiten',
      confirm: 'Bestätigen',
      skip: 'Überspringen',
      execute: 'Ausführen',
      test_connection: 'Verbindung testen',
      pause: 'Pausieren',
      resume: 'Fortsetzen',
      archive: 'Archivieren',
      restore: 'Wiederherstellen',
      return_to_dashboard: 'Zurück zum Dashboard',
      commit_stage: 'Phase bestätigen',
      generate_with_ai: 'Mit KI optimieren',
      manual_input: 'Manuelle Eingabe',
      confirm_create: 'Erstellung bestätigen',
    },
    // Common
    common: {
      or: 'oder',
      bind: 'Verbinden',
      unbind: 'Entkoppeln',
    },
    // Project
    project: {
      id: 'Projekt-ID',
      title: 'Projekttitel',
      description: 'Beschreibung',
      pain_point: 'Schmerzpunkt',
      current_stage: 'Aktuelle Phase',
      progress: 'Fortschritt',
      total: 'Gesamt',
      active_projects: 'Aktive Projekte',
      paused_projects: 'Pausierte Projekte',
      archived_projects: 'Archivierte Projekte',
      previous_stages: 'Abgeschlossene Phasen',
      no_projects: 'Keine Projekte gefunden',
      create_first: 'Erstellen Sie Ihr erstes Projekt mit der Schaltfläche unten',
      awaiting_input: 'Warte auf Eingabe...',
      ready_to_commit: 'Bereit zur Bestätigung...',
      add_new: 'Projekt hinzufügen',
    },
    // Stages - Vibe/Indie Hacker-Fluss
    stage: {
      idea: 'Idee',
      validate: 'Validieren',
      prototype: 'Prototyp',
      ship: 'Veröffentlichen',
      grow: 'Wachsen',
      monetize: 'Monetarisieren',
      stages_completed: 'Abgeschlossene Phasen',
    },
    // GitHub
    github: {
      config: 'GITHUB-KONFIGURATION',
      token: 'Persönlicher Zugangs-Token',
      owner: 'Besitzer',
      repository: 'Repository',
      file_path: 'Dateipfad',
      scope_required: 'Repo-Berechtigung erforderlich',
      import_title: 'Von GitHub importieren',
      connect_prompt: 'Autorisierung erforderlich für Zugriff auf öffentliche GitHub-Repositories',
      connect: 'GitHub verbinden',
      no_repos: 'Keine öffentlichen Repositories gefunden',
      select_repo: 'Repository zum Importieren auswählen',
      loading_repos: 'Repositories werden geladen...',
      ai_analysis: 'KI-Analyse',
      confidence: 'Konfidenz',
      creating_project: 'Projekt wird erstellt...',
      import_from_github: 'Von GitHub importieren',
      repo_imported: 'Repository erfolgreich importiert',
    },
    // AI
    ai: {
      assistant: 'KI-Assistent',
      model: 'Modellversion',
      processing: 'Verarbeitung...',
      thinking: 'Denke nach...',
      error_prefix: '[FEHLER]',
      ok_prefix: '[OK]',
      api_error: 'API-Aufruf fehlgeschlagen',
      config_required: 'Bitte konfigurieren Sie zuerst den KI-Service (Admin > KI-Konfiguration)',
      no_response: 'Keine Antwort',
      quick_actions: 'Schnellaktionen',
      target_user: 'Zielnutzer',
      value_prop: 'Wertversprechen',
      framework: 'Untersuchungsrahmen',
      competitors: 'Wettbewerbsanalyse',
      tasks: 'Aufgabenzerlegung',
      tech_stack: 'Technologie-Stack',
      social_copy: 'Werbetext',
      channels: 'Promotionskanäle',
      no_models_available: 'Keine Modelle verfügbar. Bitte Admin kontaktieren.',
      providers_count: 'verfügbare Modelle',
      credits: 'AI-Credits',
    },
    // Modal
    modal: {
      init_project: 'Projekt initialisieren',
      confirm_params: 'Parameter bestätigen',
      input_description: 'Beschreibung eingeben',
      project_title: 'Projekttitel',
      select_model: 'Modell auswählen',
      manual_input: 'Projektinformationen manuell eingeben',
    },
    // Auth
    auth: {
      account_auth: 'ACCOUNT AUTHENTICATION',
      login: 'LOGIN',
      register: 'REGISTER',
      forgot_password: 'FORGOT PASSWORD',
      username: 'Username',
      password: 'Password',
      email: 'Email',
      confirm_password: 'Confirm Password',
      remember_me: 'Remember me',
      logging_in: 'Logging in...',
      registering: 'Registering...',
      sending: 'Sending...',
      send_reset_email: 'Send Reset Email',
      back_to_login: 'Back to Login',
      or_login_with: 'Or login with',
      password_requirements: 'At least 8 chars with uppercase, lowercase, digit and special char',
      slider_hint: 'Drag slider to complete puzzle',
      refresh_captcha: 'Refresh',
      login_failed: 'Login failed',
      register_failed: 'Registration failed',
      send_failed: 'Send failed',
      logout: 'Logout',
      account_overview: 'Account Overview',
      quota_info: 'Quota Info',
      preferences: 'Preferences',
      security_settings: 'Security Settings',
      oauth_accounts: 'Third-party Accounts',
      bind: 'Bind',
      unbind: 'Unbind',
      change_password: 'Change Password',
      admin: 'ADMIN',
      user: 'USER',
    },
    // Section Headers
    section: {
      active_projects: 'Aktive Projekte',
      paused_projects: 'Pausierte Projekte',
      archived_projects: 'Archivierte Projekte',
    },
    // System
    system: {
      status: 'Systemstatus',
      last_sync: 'Letzte Synchronisierung',
      total_projects: 'Projekte gesamt',
    },
    // Theme
    theme: {
      dark: 'Dunkel',
      light: 'Hell',
      switch_to_dark: 'Zu Dunkelmodus wechseln',
      switch_to_light: 'Zu Hellmodus wechseln',
      toggle_theme: 'Thema umschalten',
    },
    // Placeholders
    placeholder: {
      describe_pain_point: 'Beschreiben Sie Ihren Schmerzpunkt oder Ihre Idee...',
      enter_notes: 'Geben Sie hier Ihre Notizen ein...',
      type_message: 'Nachricht eingeben...',
    },
    // Errors
    error: {
      project_not_found: 'Projekt existiert nicht',
      stage_not_found: 'Phasendaten fehlen',
      connection_failed: 'Verbindung fehlgeschlagen',
      optimize_failed: 'Optimierung fehlgeschlagen',
    },
    // Backend
    backend: {
      mode: 'Backend-Modus',
      data_storage: 'Daten in PostgreSQL gespeichert',
    },
    // Filter
    filter: {
      filter: 'Filtern',
      clear: '[Löschen]',
      filtered: 'Gefiltert',
      no_filtered_projects: 'Keine passenden Projekte gefunden',
      try_different_filter: 'Versuchen Sie einen anderen Filter',
    },
    // Error Banner
    error_banner: {
      error_prefix: 'Fehler',
      retry: 'Wiederholen',
    },
    // Empty State
    empty_state: {
      prompt: '> _',
      awaiting_input: 'Warte auf Eingabe...',
    },
    // Quota
    quota: {
      credits: 'AI-Credits',
      ai_label: 'AI: {{credits}}',
    },
    // Toast
    toast: {
      oauth_bind_success: 'Drittanbieter-Konto erfolgreich verbunden',
      google_unbind_success: 'Google-Konto entkoppelt',
      github_unbind_success: 'GitHub-Konto entkoppelt',
      unbind_failed: 'Entkopplung fehlgeschlagen',
      load_user_failed: 'Benutzerinfo konnte nicht geladen werden',
      pet_saved: 'Haustier-Konfiguration gespeichert',
      pet_save_failed: 'Speichern fehlgeschlagen',
      merge_suggestions: 'AI-Vorschläge in Haftnotizen gemerged',
      override_suggestions: 'AI-Vorschläge haben alle Haftnotizen überschrieben',
      query_status_failed: 'Abfrage des Ausführungsstatus fehlgeschlagen',
      load_suggestions_failed: 'AI-Vorschläge konnten nicht geladen werden',
    },
    // Dialog
    dialog: {
      stay: 'Bleiben',
      leave: 'Verlassen',
    },
    // Account
    account: {
      settings: 'Kontoeinstellungen',
      oauth_binding: 'Drittanbieter-Kontoverbindung',
      bound: 'Verbunden',
      not_bound: 'Nicht verbunden',
    },
    // Language
    language: {
      name_zh: '简体中文',
      name_en: 'English',
      name_ja: '日本語',
      name_ko: '한국어',
      name_es: 'Español',
      name_fr: 'Français',
      name_de: 'Deutsch',
    },
  },
};

import { I18nContext } from './context';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('sparkbin-language');
    return (saved as Language) || 'en';
  });

  const setLanguageWithStorage = useCallback((lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('sparkbin-language', lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    const cycle: Language[] = ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de'];
    const idx = cycle.indexOf(language);
    const newLang = cycle[(idx + 1) % cycle.length];
    setLanguageWithStorage(newLang);
  }, [language, setLanguageWithStorage]);

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
          const placeholder = `{{${varKey}}}`;
          result = result.split(placeholder).join(String(varValue));
        });
      }

      return result;
    },
    [language]
  );

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage: setLanguageWithStorage,
        t,
        toggleLanguage,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}
