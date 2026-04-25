// Backend API Service
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Token 和角色管理
let authToken: string | null = localStorage.getItem('sparkbin_token');
let userRole: string | null = localStorage.getItem('sparkbin_role');
let userId: string | null = localStorage.getItem('sparkbin_user_id');

export function setAuthToken(token: string) {
  authToken = token;
  localStorage.setItem('sparkbin_token', token);
  // 从 JWT 中解析角色和用户 ID
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) throw new Error('Invalid token');
    const payload = JSON.parse(atob(parts[1]!));
    userRole = payload.role || 'user';
    userId = payload.sub || payload.user_id || null;
    localStorage.setItem('sparkbin_role', userRole || 'user');
    if (userId) {
      localStorage.setItem('sparkbin_user_id', userId);
    } else {
      localStorage.removeItem('sparkbin_user_id');
    }
  } catch {
    userRole = 'user';
    userId = null;
    localStorage.removeItem('sparkbin_user_id');
  }
}

export function clearAuthToken() {
  authToken = null;
  userRole = null;
  userId = null;
  localStorage.removeItem('sparkbin_token');
  localStorage.removeItem('sparkbin_role');
  localStorage.removeItem('sparkbin_user_id');
}

export function getAuthToken(): string | null {
  return authToken;
}

export function isAuthenticated(): boolean {
  return !!authToken;
}

export function isAdmin(): boolean {
  return userRole === 'admin';
}

export function getUserRole(): string {
  return userRole || 'user';
}

export function getUserId(): string | null {
  return userId;
}

function extractErrorMessage(responseText: string, statusCode: number): string {
  if (!responseText.trim()) {
    return `HTTP ${statusCode}`;
  }

  try {
    const parsed = JSON.parse(responseText) as {
      message?: string;
      detail?: string | { msg?: string }[] | { message?: string };
      error?: string;
    };

    if (typeof parsed.detail === 'string' && parsed.detail.trim()) {
      return parsed.detail;
    }

    if (Array.isArray(parsed.detail) && parsed.detail.length > 0) {
      return parsed.detail
        .map((item) => item?.msg?.trim())
        .filter((item): item is string => Boolean(item))
        .join('; ') || `HTTP ${statusCode}`;
    }

    const detailObject =
      parsed.detail && !Array.isArray(parsed.detail) && typeof parsed.detail === 'object'
        ? parsed.detail
        : null;

    if (typeof detailObject?.message === 'string' && detailObject.message.trim()) {
      return detailObject.message;
    }

    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return parsed.message;
    }

    if (typeof parsed.error === 'string' && parsed.error.trim()) {
      return parsed.error;
    }
  } catch {
    // 非 JSON 错误体直接回退为原始文本
  }

  return responseText.trim() || `HTTP ${statusCode}`;
}

// 通用请求函数
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuthToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(extractErrorMessage(responseText, response.status));
  }

  // 处理空响应
  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

// ===== 认证 API =====
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export const authApi = {
  login: (data: LoginRequest) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request('/auth/logout', { method: 'POST' }),

  getMe: () =>
    request<{
      id: string;
      username: string;
      role: string;
      preferred_model: AIProvider | null;
      subscription_status: string;
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
      current_tier_id: string | null;
      pet_config: { type: string; name: string; personality: string; verbosity: string } | null;
      theme_preference: string | null;
      created_at: string;
    }>('/auth/me'),

  changePassword: (oldPassword: string, newPassword: string) =>
    request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    }),

  // 获取首选 AI 模型
  getPreferredModel: () =>
    request<{ provider: AIProvider | null }>('/auth/preferred-model'),

  // 设置首选 AI 模型
  setPreferredModel: (provider: AIProvider) =>
    request<{ message: string }>('/auth/preferred-model', {
      method: 'PUT',
      body: JSON.stringify({ provider }),
    }),

  // 获取主题偏好
  getTheme: () =>
    request<{ theme: string }>('/auth/theme'),

  // 设置主题偏好
  setTheme: (theme: string) =>
    request<{ message: string }>('/auth/theme', {
      method: 'PUT',
      body: JSON.stringify({ theme }),
    }),

  // 更新宠物配置
  updatePetConfig: (config: { type?: string; name?: string; personality?: string; verbosity?: string }) =>
    request<{ message: string }>('/auth/me/pet-config', {
      method: 'PUT',
      body: JSON.stringify(config),
    }),
};

// ===== 项目 API =====
export interface Stage {
  id: string;
  stage_key: 'idea' | 'validate' | 'prototype' | 'ship' | 'grow' | 'monetize';
  content: string;
  completed_at: string | null;
  is_locked: boolean;
}

export interface PromoteTask {
  id: string;
  text: string;
  done: boolean;
  sort_order: number;
}

export interface Project {
  id: string;
  title: string;
  pain_point: string;
  original_idea: string;
  status: 'active' | 'paused' | 'archived';
  current_stage: Stage['stage_key'];
  created_at: string;
  updated_at: string;
}

export interface ProjectDetail extends Project {
  original_idea: string;
  stages: Stage[];
  promote_tasks: PromoteTask[];
  promote_suggestions: {
    id: string;
    channels: string[];
    templates: string[];
    created_at: string;
  }[];
}

export const projectsApi = {
  list: (status?: string) =>
    request<Project[]>(`/projects${status ? `?status=${status}` : ''}`),

  get: (id: string) =>
    request<ProjectDetail>(`/projects/${id}`),

  create: (data: { title: string; pain_point: string; original_idea?: string }) =>
    request<ProjectDetail>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Project>) =>
    request<ProjectDetail>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request(`/projects/${id}`, { method: 'DELETE' }),

  updateStatus: (id: string, status: Project['status']) =>
    request<ProjectDetail>(`/projects/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  updateStageContent: (id: string, stage: string, content: string) =>
    request<ProjectDetail>(`/projects/${id}/stages/${stage}/content`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),

  completeStage: (id: string, stage: string) =>
    request<ProjectDetail>(`/projects/${id}/stages/${stage}/complete`, {
      method: 'POST',
    }),

  reopenStage: (id: string, stage: string) =>
    request<ProjectDetail>(`/projects/${id}/stages/${stage}/reopen`, {
      method: 'POST',
    }),

  // 推广任务
  addTask: (id: string, text: string) =>
    request<ProjectDetail>(`/projects/${id}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  updateTask: (id: string, taskId: string, data: Partial<PromoteTask>) =>
    request<ProjectDetail>(`/projects/${id}/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTask: (id: string, taskId: string) =>
    request<ProjectDetail>(`/projects/${id}/tasks/${taskId}`, {
      method: 'DELETE',
    }),
};

// ===== AI API =====
export type AIProvider = 'deepseek' | 'kimi' | 'doubao' | 'openai';

export interface AIProviderInfo {
  provider: AIProvider;
  name: string;
  is_active: boolean;
}

export interface AIConfig {
  base_url: string;
  api_key: string;
  default_model: string;
  is_active: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StageSnapshot {
  project_id: string;
  project_title: string;
  project_pain_point: string;
  current_stage: Stage['stage_key'];
  stage_key: Stage['stage_key'];
  stage_locked: boolean;
  completion: {
    score: number;
    missing_items: string[];
  };
  content: {
    raw: string;
    normalized: unknown;
  };
}

export const aiApi = {
  // 获取可用提供商
  getProviders: () =>
    request<AIProviderInfo[]>('/ai/providers'),

  // 获取配置（仅管理员可见，返回的 api_key 是隐藏的）
  getConfigs: () =>
    request<{ id: string; provider: string; base_url: string; api_key: string; default_model: string; is_active: boolean }[]>('/ai/configs'),

  // 更新配置
  updateConfig: (provider: AIProvider, config: AIConfig) =>
    request(`/ai/configs/${provider}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  // 测试连接
  testConnection: (provider: AIProvider) =>
    request<{ success: boolean; message: string }>(`/ai/test/${provider}`, {
      method: 'POST',
    }),

  // 流式聊天 - 返回 EventSource
  chatStream: (provider: AIProvider, messages: ChatMessage[]) => {
    const url = `${API_BASE_URL}/ai/chat`;
    const response = fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken || ''}`,
      },
      body: JSON.stringify({ provider, messages, stream: true }),
    });
    return response;
  },

  // 生成推广建议
  generatePromoteSuggestions: (data: {
    provider: AIProvider;
    project_title: string;
    pain_point: string;
    project_description: string;
  }) =>
    request<{
      id: string;
      channels: string[];
      templates: string[];
      created_at: string;
    }>('/ai/promote-suggest', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 获取调用日志
  getCallLogs: (limit = 100) =>
    request<{
      id: string;
      provider: string;
      model: string;
      prompt_tokens: number;
      completion_tokens: number;
      status: string;
      created_at: string;
    }[]>(`/ai/call-logs?limit=${limit}`),

  // 获取阶段上下文快照（完成度/缺口）
  getStageContext: (projectId: string, stageKey: Stage['stage_key']) =>
    request<StageSnapshot>(`/ai/stage-context/${projectId}/${stageKey}`),

  // 生成想法阶段便利贴建议
  suggestIdeaNotes: (data: {
    project_id?: string;
    title: string;
    pain_point: string;
    original_idea: string;
    current_notes: { title: string; content: string }[];
  }) =>
    request<{ notes: { title: string; content: string }[] }>('/ai/idea-suggest', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ===== 支付 API =====
export interface CheckoutItem {
  name: string;
  price: number;
  period: 'month' | 'year' | 'lifetime';
  tier_id: string;
}

export interface CheckoutSessionResponse {
  session_url: string;
  session_id: string;
}

export interface SubscriptionStatusResponse {
  status: string;
  tier_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export const paymentsApi = {
  createCheckoutSession: (data: {
    items: CheckoutItem[];
    success_url: string;
    cancel_url: string;
  }) =>
    request<CheckoutSessionResponse>('/payments/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getSubscriptionStatus: () =>
    request<SubscriptionStatusResponse>('/payments/subscription-status'),
};

// ===== 管理 API =====
export const adminApi = {
  getLogs: (limit = 100) =>
    request<{
      id: string;
      action: string;
      entity_type: string;
      entity_id: string;
      old_values: string;
      new_values: string;
      created_at: string;
    }[]>(`/admin/logs?limit=${limit}`),
};
