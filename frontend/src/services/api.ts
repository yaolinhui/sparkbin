// Backend API Service
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Token 和角色管理
let authToken: string | null = localStorage.getItem('sparkbin_token');
let userRole: string | null = localStorage.getItem('sparkbin_role');

export function setAuthToken(token: string) {
  authToken = token;
  localStorage.setItem('sparkbin_token', token);
  // 从 JWT 中解析角色
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) throw new Error('Invalid token');
    const payload = JSON.parse(atob(parts[1]!));
    userRole = payload.role || 'user';
    localStorage.setItem('sparkbin_role', userRole || 'user');
  } catch {
    userRole = 'user';
  }
}

export function clearAuthToken() {
  authToken = null;
  userRole = null;
  localStorage.removeItem('sparkbin_token');
  localStorage.removeItem('sparkbin_role');
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
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
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
    request<{ id: string; username: string; created_at: string }>('/auth/me'),

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
  status: 'active' | 'paused' | 'archived';
  current_stage: Stage['stage_key'];
  created_at: string;
  updated_at: string;
}

export interface ProjectDetail extends Project {
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

  create: (data: { title: string; pain_point: string }) =>
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
