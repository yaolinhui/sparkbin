// SparkBin 微信小程序 API 封装
// 基于 wx.request（Taro.request），复用后端 FastAPI 接口

import Taro from '@tarojs/taro';

const API_BASE_URL = 'http://localhost:8000'; // 开发环境，生产替换为真实域名

// ===== Token 管理 =====
let authToken: string | null = null;

export function getToken(): string | null {
  if (!authToken) {
    authToken = Taro.getStorageSync('sparkbin_token') || null;
  }
  return authToken;
}

export function setToken(token: string) {
  authToken = token;
  Taro.setStorageSync('sparkbin_token', token);
}

export function clearToken() {
  authToken = null;
  Taro.removeStorageSync('sparkbin_token');
  Taro.removeStorageSync('sparkbin_refresh_token');
}

export function getRefreshToken(): string | null {
  return Taro.getStorageSync('sparkbin_refresh_token') || null;
}

export function setRefreshToken(token: string) {
  Taro.setStorageSync('sparkbin_refresh_token', token);
}

// ===== 通用请求封装 =====
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  skipAuth?: boolean;
}

async function request<T>(options: RequestOptions): Promise<T> {
  const token = options.skipAuth ? null : getToken();

  return new Promise((resolve, reject) => {
    Taro.request({
      url: `${API_BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
        } else if (res.statusCode === 401) {
          clearToken();
          reject(new ApiError('Unauthorized', 401));
        } else {
          const detail = (res.data as any)?.detail || (res.data as any)?.message || `HTTP ${res.statusCode}`;
          reject(new ApiError(detail, res.statusCode));
        }
      },
      fail: (err) => {
        reject(new ApiError(err.errMsg || 'Network Error', 0));
      },
    });
  });
}

// ===== 认证 API =====
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface WechatLoginRequest {
  code: string;
}

export interface WechatLoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  is_new_user: boolean;
}

export const authApi = {
  // 账号密码登录
  login: (data: LoginRequest) =>
    request<LoginResponse>('/auth/login', { method: 'POST', data }),

  // 微信登录
  wechatLogin: (data: WechatLoginRequest) =>
    request<WechatLoginResponse>('/auth/wechat', { method: 'POST', data }),

  // 注册
  register: (data: { username: string; email: string; password: string }) =>
    request<LoginResponse>('/auth/register', { method: 'POST', data }),

  // 获取当前用户
  getMe: () =>
    request<{
      id: string;
      username: string;
      email: string | null;
      email_verified: boolean;
      avatar_url: string | null;
      role: string;
      preferred_model: AIProvider | null;
      theme_preference: string | null;
      quota: {
        ai_credits: number;
        ai_credits_total_consumed: number;
        projects_used: number;
        projects_limit: number | null;
      };
      created_at: string;
    }>('/auth/me'),

  // 退出登录
  logout: () =>
    request('/auth/logout', { method: 'POST' }),

  // 刷新 Token
  refresh: () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      return Promise.reject(new ApiError('No refresh token', 401));
    }
    return request<LoginResponse>('/auth/refresh', {
      method: 'POST',
      data: { refresh_token: refreshToken },
    });
  },
};

// ===== 项目 API =====
export interface ApiStage {
  id: string;
  stage_key: StageKey;
  content: string;
  completed_at: string | null;
  is_locked: boolean;
}

export interface ApiProject {
  id: string;
  title: string;
  pain_point: string;
  original_idea: string;
  status: ProjectStatus;
  current_stage: StageKey;
  project_type: ProjectType;
  stages: ApiStage[];
  created_at: string;
  updated_at: string;
}

export const projectsApi = {
  list: () => request<ApiProject[]>('/projects'),

  get: (id: string) => request<ApiProject>(`/projects/${id}`),

  create: (data: { title: string; pain_point: string; original_idea?: string; project_type?: ProjectType }) =>
    request<ApiProject>('/projects', { method: 'POST', data }),

  update: (id: string, data: Partial<ApiProject>) =>
    request<ApiProject>(`/projects/${id}`, { method: 'PUT', data }),

  delete: (id: string) => request(`/projects/${id}`, { method: 'DELETE' }),

  updateStageContent: (id: string, stage: StageKey, content: string) =>
    request<ApiProject>(`/projects/${id}/stages/${stage}/content`, {
      method: 'PUT',
      data: { content },
    }),

  completeStage: (id: string, stage: StageKey) =>
    request<ApiProject>(`/projects/${id}/stages/${stage}/complete`, { method: 'POST' }),

  reopenStage: (id: string, stage: StageKey) =>
    request<ApiProject>(`/projects/${id}/stages/${stage}/reopen`, { method: 'POST' }),
};

// ===== AI API =====
export { type AIProvider } from '../types';

export const aiApi = {
  // 获取可用提供商
  getProviders: () =>
    request<{ provider: AIProvider; name: string; is_active: boolean }[]>('/ai/providers'),

  // 非流式聊天（小程序专用）
  chatSync: (data: { provider: AIProvider; messages: { role: string; content: string }[] }) =>
    request<{ content: string; tokens_used: number }>('/ai/chat-sync', {
      method: 'POST',
      data: { ...data, stream: false },
    }),

  // 创建轮询任务
  createChatJob: (data: { provider: AIProvider; messages: { role: string; content: string }[] }) =>
    request<{ job_id: string }>('/ai/chat-job', { method: 'POST', data }),

  // 查询轮询任务
  getChatJob: (jobId: string) =>
    request<{
      status: 'pending' | 'running' | 'completed' | 'failed';
      partial_content: string;
      content: string | null;
      error: string | null;
    }>(`/ai/chat-job/${jobId}`),

  // Agent 驾驶舱
  runAgent: (data: { project_id: string; strategy?: string; provider?: string }) =>
    request<{ run_id: string; status: string; strategy: string; summary: string }>('/ai/agent/run', {
      method: 'POST',
      data,
    }),

  getAgentRun: (runId: string) =>
    request<{
      run_id: string;
      status: string;
      strategy: string;
      summary: string;
      created_at: string | null;
      completed_at: string | null;
      results: Record<string, unknown>;
      tasks: { id: string; agent_type: string; status: string; provider: string | null; model: string; error: string }[];
    }>(`/ai/agent/run/${runId}`),

  listAgentRuns: (limit = 20) =>
    request<{ run_id: string; status: string; strategy: string; summary: string; created_at: string }[]>(
      `/ai/agent/runs?limit=${limit}`
    ),
};
