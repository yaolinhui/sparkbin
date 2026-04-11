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

// 验证阶段专用类型
export interface ValidationItem {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'validated' | 'failed';
  method?: 'interview' | 'survey' | 'community' | 'competitor';
  result?: {
    sampleSize: number;
    keyFindings: string[];
    conclusion: 'passed' | 'failed' | 'needs_more';
    notes: string;
  };
  createdAt: string;
}

export interface ValidationTool {
  id: string;
  type: 'survey' | 'interview' | 'community' | 'competitor';
  title: string;
  content: string;
  generatedAt: string;
}

export interface ValidationData {
  items: ValidationItem[];
  tools: ValidationTool[];
  decision?: 'go' | 'no_go' | 'maybe';
  decisionReason?: string;
}

// 原型阶段专用类型
export type PlatformType = 'web' | 'ios' | 'android' | 'miniapp' | 'desktop';

export interface DesignTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  previewImage?: string;
}

export interface Feature {
  id: string;
  name: string;
  priority: 'P0' | 'P1' | 'P2';
  status: 'todo' | 'doing' | 'done';
  screenshot?: string;
  referenceUrl?: string;
  notes: string;
  order: number;
}

export interface PrototypeData {
  selectedPlatform?: PlatformType;
  selectedTemplate?: string;
  features: Feature[];
  techStack?: string;
  designPrompt?: string;
  releaseChecklist: {
    domain: boolean;
    ssl: boolean;
    payment: boolean;
    analytics: boolean;
    feedback: boolean;
  };
}

// 发布阶段专用类型
export interface PlatformContent {
  platform: 'xiaohongshu' | 'twitter' | 'producthunt' | 'jike' | 'v2ex' | 'wechat';
  title: string;
  content: string;
  tags?: string[];
  imageUrl?: string;
}

export interface ShipData {
  checklist: {
    domain: boolean;
    ssl: boolean;
    payment: boolean;
    analytics: boolean;
    socialMedia: boolean;
  };
  platformBindings: string[];
  contents: PlatformContent[];
  launchUrl?: string;
  metrics: {
    newUsers: number;
    activeUsers: number;
    feedbackCount: number;
    bugReports: number;
  };
  feedbacks: UserFeedback[];
}

export interface UserFeedback {
  id: string;
  content: string;
  rating: number;
  source: string;
  createdAt: string;
}

// 增长阶段专用类型
export type ContentType = 'tutorial' | 'showcase' | 'story' | 'tech' | 'tips';
export type ChannelKey = 'xiaohongshu' | 'twitter' | 'jike' | 'v2ex' | 'blog' | 'producthunt';

export interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
  channel: ChannelKey;
  scheduledDate: string;
  status: 'draft' | 'scheduled' | 'published';
  content?: string;
}

export interface ChannelMetrics {
  channel: ChannelKey;
  newUsers: number;
  totalUsers: number;
  conversionRate: number;
}

export interface GrowData {
  contentCalendar: ContentItem[];
  channelMetrics: ChannelMetrics[];
}

// 变现阶段专用类型
export type MonetizeStrategy = 'freemium' | 'subscription' | 'onetime' | 'ads' | 'donation';

export interface PricingTier {
  id: string;
  name: string;
  price: number;
  period: 'month' | 'year' | 'lifetime';
  features: string[];
  highlighted?: boolean;
}

export interface FunnelMetrics {
  visitors: number;
  signups: number;
  trials: number;
  paid: number;
}

export interface MonetizeData {
  strategy: MonetizeStrategy;
  pricingTiers: PricingTier[];
  mrr: number;
  totalRevenue: number;
  paidUsers: number;
  funnel: FunnelMetrics;
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
