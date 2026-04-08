export type ProjectStatus = 'active' | 'paused' | 'archived';
export type StageKey = 'idea' | 'research' | 'dev' | 'complete' | 'launch' | 'promote';

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
  idea: Stage;
  research: Stage;
  dev: Stage;
  complete: Stage;
  launch: Stage;
  promote: PromoteStage;
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

// Brutalist style - English uppercase labels
export const STAGE_LABELS: Record<StageKey, string> = {
  idea: 'IDEA',
  research: 'RESEARCH',
  dev: 'DEVELOP',
  complete: 'COMPLETE',
  launch: 'LAUNCH',
  promote: 'PROMOTE',
};

export const STAGE_ORDER: StageKey[] = ['idea', 'research', 'dev', 'complete', 'launch', 'promote'];

// Brutalist style - English uppercase labels
export const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'ACTIVE',
  paused: 'PAUSED',
  archived: 'ARCHIVED',
};
