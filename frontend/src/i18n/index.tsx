import React, { createContext, useContext, useState, useCallback } from 'react';

export type Language = 'zh' | 'en';

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
      back: '返回',
      dashboard: '项目面板',
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
    },
    // Stages
    stage: {
      idea: '想法',
      research: '调研',
      dev: '开发',
      complete: '完成',
      launch: '上线',
      promote: '宣传',
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
    },
    // Modal
    modal: {
      init_project: '初始化项目',
      confirm_params: '确认参数',
      input_description: '输入描述',
      project_title: '项目名称',
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
    // Placeholders
    placeholder: {
      describe_pain_point: '描述您的痛点或想法...',
      enter_notes: '在此输入笔记...',
      type_message: '输入消息...',
    },
    // Errors
    error: {
      project_not_found: '项目不存在',
      connection_failed: '连接失败',
      optimize_failed: '优化失败',
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
      back: 'BACK',
      dashboard: 'DASHBOARD',
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
    },
    // Stages
    stage: {
      idea: 'IDEA',
      research: 'RESEARCH',
      dev: 'DEVELOP',
      complete: 'COMPLETE',
      launch: 'LAUNCH',
      promote: 'PROMOTE',
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
    },
    // Modal
    modal: {
      init_project: 'INIT_PROJECT',
      confirm_params: 'CONFIRM_PARAMS',
      input_description: 'Input_Description',
      project_title: 'Project_Title',
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
    // Placeholders
    placeholder: {
      describe_pain_point: 'Describe your pain point or idea...',
      enter_notes: 'Enter your notes here...',
      type_message: 'Type your message...',
    },
    // Errors
    error: {
      project_not_found: 'PROJECT_NOT_FOUND',
      connection_failed: 'CONNECTION_FAILED',
      optimize_failed: 'OPTIMIZE_FAILED',
    },
  },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  toggleLanguage: () => void;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('sparkbin-language');
    return (saved as Language) || 'zh';
  });

  const setLanguageWithStorage = useCallback((lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('sparkbin-language', lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    const newLang = language === 'zh' ? 'en' : 'zh';
    setLanguageWithStorage(newLang);
  }, [language, setLanguageWithStorage]);

  const t = useCallback(
    (key: string): string => {
      const keys = key.split('.');
      let value: unknown = translations[language];

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = (value as Record<string, unknown>)[k];
        } else {
          return key;
        }
      }

      return typeof value === 'string' ? value : key;
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

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

// Hook for stage labels
export function useStageLabel(stageKey: string): string {
  const { t, language } = useI18n();
  const key = `stage.${stageKey}`;
  const translated = t(key);

  // If translation not found, fallback to uppercase
  if (translated === key) {
    return stageKey.toUpperCase();
  }

  // For Chinese, return as-is; for English, uppercase
  return language === 'en' ? translated.toUpperCase() : translated;
}

// Hook for status labels
export function useStatusLabel(status: string): string {
  const { t } = useI18n();
  const key = `status.${status}`;
  const translated = t(key);
  return translated === key ? status.toUpperCase() : translated;
}
