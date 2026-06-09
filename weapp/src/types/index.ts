// SparkBin 微信小程序类型定义
// 从 frontend/src/types/index.ts 复用并适配小程序

export type ProjectStatus = 'active' | 'paused' | 'archived';
export type StageKey = 'idea' | 'validate' | 'prototype' | 'ship' | 'grow' | 'monetize';

export interface Stage {
  content: string;
  completedAt: string | null;
  isLocked: boolean;
}

export interface Stages {
  idea: Stage;
  validate: Stage;
  prototype: Stage;
  ship: Stage;
  grow: Stage;
  monetize: Stage;
}

export type ProjectType =
  | 'web'
  | 'app'
  | 'plugin'
  | 'api'
  | 'miniprogram'
  | 'desktop'
  | 'ai_agent'
  | 'game'
  | 'script'
  | 'other';

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  web: 'Web 应用',
  app: '移动 App',
  plugin: '浏览器插件',
  api: 'API 服务',
  miniprogram: '小程序',
  desktop: '桌面应用',
  ai_agent: 'AI Agent',
  game: '游戏',
  script: '工具脚本',
  other: '其他',
};

export const PROJECT_TYPE_ICONS: Record<ProjectType, string> = {
  web: '🌐',
  app: '📱',
  plugin: '🔌',
  api: '⚡',
  miniprogram: '📦',
  desktop: '💻',
  ai_agent: '🤖',
  game: '🎮',
  script: '🔧',
  other: '📋',
};

export interface Project {
  id: string;
  title: string;
  painPoint: string;
  originalIdea: string;
  status: ProjectStatus;
  currentStage: StageKey;
  projectType: ProjectType;
  stages: Stages;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListItem {
  id: string;
  title: string;
  status: ProjectStatus;
  currentStage: StageKey;
  projectType: ProjectType;
  updatedAt: string;
}

export const STAGE_LABELS: Record<StageKey, string> = {
  idea: 'IDEA',
  validate: 'VALIDATE',
  prototype: 'PROTOTYPE',
  ship: 'SHIP',
  grow: 'GROW',
  monetize: 'MONETIZE',
};

export const STAGE_ORDER: StageKey[] = ['idea', 'validate', 'prototype', 'ship', 'grow', 'monetize'];

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'ACTIVE',
  paused: 'PAUSED',
  archived: 'ARCHIVED',
};

// AI 相关
export type AIProvider = 'deepseek' | 'kimi' | 'doubao' | 'openai' | 'ollama';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AgentRun {
  runId: string;
  status: string;
  strategy: string;
  summary: string;
  createdAt: string | null;
  completedAt: string | null;
  results: Record<string, unknown>;
  tasks: AgentTask[];
}

export interface AgentTask {
  id: string;
  agentType: string;
  status: string;
  provider: string | null;
  model: string;
  error: string;
}

// 用户相关
export interface UserProfile {
  id: string;
  username: string;
  email: string | null;
  emailVerified: boolean;
  avatarUrl: string | null;
  role: string;
  preferredModel: AIProvider | null;
  themePreference: string | null;
  quota: {
    aiCredits: number;
    aiCreditsTotalConsumed: number;
    projectsUsed: number;
    projectsLimit: number | null;
  };
  createdAt: string;
}

// 主题
export type Theme = 'dark' | 'light';
