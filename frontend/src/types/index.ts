export type ProjectStatus = 'active' | 'paused' | 'archived';
// Vibe/独立开发专用阶段流程
export type StageKey = 'idea' | 'validate' | 'prototype' | 'ship' | 'grow' | 'monetize';

export interface PromoteTask {
  text: string;
  done: boolean;
}

export interface AISuggestions {
  channels: string[];
  templates: string[];
}

export interface Stage {
  content: string;
  completedAt: string | null;
  isLocked: boolean;
}

export interface PromoteStage extends Stage {
  tasks?: PromoteTask[];
  aiSuggestions?: AISuggestions;
}

export interface Stages {
  idea: Stage;        // 想法
  validate: Stage;    // 验证
  prototype: Stage;   // 原型
  ship: Stage;        // 发布
  grow: Stage;        // 增长
  monetize: PromoteStage; // 变现
}

export interface Project {
  id: string;
  title: string;
  painPoint: string;
  status: ProjectStatus;
  currentStage: StageKey;
  stages: Stages;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  filePath: string;
}

// Brutalist style - English uppercase labels (Vibe/Indie Hacker flow)
export const STAGE_LABELS: Record<StageKey, string> = {
  idea: 'IDEA',        // 想法
  validate: 'VALIDATE', // 验证
  prototype: 'PROTOTYPE', // 原型
  ship: 'SHIP',        // 发布
  grow: 'GROW',        // 增长
  monetize: 'MONETIZE', // 变现
};

export const STAGE_ORDER: StageKey[] = ['idea', 'validate', 'prototype', 'ship', 'grow', 'monetize'];

// Brutalist style - English uppercase labels
export const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'ACTIVE',
  paused: 'PAUSED',
  archived: 'ARCHIVED',
};
