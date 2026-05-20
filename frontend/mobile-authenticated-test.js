import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';

const BASE_URL = 'http://localhost:4173';
const API_BASE = 'https://api-sparkbin.wanchun.me';
const OUTPUT_DIR = './mobile-test-screenshots';

// 确保输出目录存在
try { mkdirSync(OUTPUT_DIR); } catch {}

const devices = [
  { name: 'iphone-se', viewport: { width: 375, height: 667 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)' },
  { name: 'iphone-14', viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)' },
  { name: 'ipad-mini', viewport: { width: 768, height: 1024 }, userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)' },
];

const pages = [
  { path: '/', name: 'project-board', auth: true },
  { path: '/project/test-123', name: 'project-detail', auth: true },
  { path: '/admin', name: 'admin-page', auth: true, admin: true },
  { path: '/profile', name: 'profile-page', auth: true },
  { path: '/', name: 'landing-login', auth: false },
];

// 模拟 JWT token（符合 header.payload.signature 格式）
const MOCK_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6IlRlc3QgVXNlciJ9.mock-signature-1234567890abcdef';

// 模拟 API 响应数据
const mockAuthMe = {
  id: 'test-user-123',
  username: 'testuser',
  email: 'test@example.com',
  email_verified: true,
  avatar_url: null,
  role: 'admin',
  preferred_model: 'deepseek',
  enable_payments: true,
  pet_config: null,
  theme_preference: 'dark',
  require_password_change: false,
  oauth_provider: null,
  oauth_id: null,
  quota: {
    ai_credits: 100,
    ai_credits_total_consumed: 50,
    projects_used: 3,
    projects_limit: 10,
  },
  created_at: '2024-01-01T00:00:00Z',
};

const mockProjects = [
  {
    id: 'test-123',
    title: '移动端适配测试项目',
    pain_point: '移动端显示效果不佳',
    original_idea: '优化移动端响应式布局',
    status: 'active',
    current_stage: 'prototype',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 'test-456',
    title: 'AI 助手集成',
    pain_point: '缺少智能建议',
    original_idea: '集成 AI 提供项目建议',
    status: 'active',
    current_stage: 'idea',
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-10T00:00:00Z',
  },
  {
    id: 'test-789',
    title: '已归档项目示例',
    pain_point: '旧项目管理混乱',
    original_idea: '归档功能实现',
    status: 'archived',
    current_stage: 'ship',
    created_at: '2023-12-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockProjectDetail = {
  id: 'test-123',
  title: '移动端适配测试项目',
  pain_point: '移动端显示效果不佳',
  original_idea: '优化移动端响应式布局',
  status: 'active',
  current_stage: 'prototype',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  stages: [
    { id: 's1', stage_key: 'idea', content: '## 想法阶段\n\n已完成的初步构思', completed_at: '2024-01-02T00:00:00Z', is_locked: false },
    { id: 's2', stage_key: 'validate', content: '## 验证阶段\n\n用户调研完成', completed_at: '2024-01-05T00:00:00Z', is_locked: false },
    { id: 's3', stage_key: 'prototype', content: '## 原型阶段\n\n正在开发中', completed_at: null, is_locked: false },
    { id: 's4', stage_key: 'ship', content: '', completed_at: null, is_locked: true },
    { id: 's5', stage_key: 'grow', content: '', completed_at: null, is_locked: true },
    { id: 's6', stage_key: 'monetize', content: '', completed_at: null, is_locked: true },
  ],
  promote_tasks: [],
  promote_suggestions: [],
};

const mockLogs = [
  {
    id: 'log-1',
    action: 'create',
    entity_type: 'project',
    entity_id: 'test-123',
    old_values: '',
    new_values: '{"title": "移动端适配测试项目"}',
    created_at: '2024-01-01T10:00:00Z',
  },
  {
    id: 'log-2',
    action: 'update',
    entity_type: 'project',
    entity_id: 'test-123',
    old_values: '{"status": "paused"}',
    new_values: '{"status": "active"}',
    created_at: '2024-01-02T14:30:00Z',
  },
  {
    id: 'log-3',
    action: 'complete_stage',
    entity_type: 'stage',
    entity_id: 's1',
    old_values: '',
    new_values: '{"stage_key": "idea"}',
    created_at: '2024-01-03T09:15:00Z',
  },
];

const mockAIProviders = [
  { provider: 'deepseek', name: 'DeepSeek', is_active: true },
  { provider: 'kimi', name: 'Kimi (Moonshot)', is_active: false },
  { provider: 'doubao', name: '豆包 (Volces)', is_active: false },
];

const mockAIConfigs = [
  { id: '1', provider: 'deepseek', base_url: 'https://api.deepseek.com', api_key: '***', default_model: 'deepseek-v4-flash', is_active: true },
];

const mockCredits = { credits: 100, total_consumed: 50 };

function getMockResponse(url) {
  if (url === `${API_BASE}/auth/me`) return mockAuthMe;
  if (url === `${API_BASE}/projects`) return mockProjects;
  if (url === `${API_BASE}/projects/test-123`) return mockProjectDetail;
  if (url === `${API_BASE}/admin/logs`) return mockLogs;
  if (url === `${API_BASE}/ai/providers`) return mockAIProviders;
  if (url === `${API_BASE}/ai/configs`) return mockAIConfigs;
  if (url === `${API_BASE}/payments/credits-status`) return mockCredits;
  return null;
}

async function setupMocks(page) {
  await page.route(`${API_BASE}/**`, async (route) => {
    const url = route.request().url();
    const mock = getMockResponse(url);
    if (mock !== null) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mock),
      });
    } else {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Not found' }),
      });
    }
  });
}

async function run() {
  const browser = await chromium.launch();

  for (const device of devices) {
    const context = await browser.newContext({
      viewport: device.viewport,
      userAgent: device.userAgent,
      deviceScaleFactor: 2,
    });

    // 在所有页面创建前设置 localStorage
    await context.addInitScript((token) => {
      localStorage.setItem('sparkbin_token', token);
    }, MOCK_JWT);

    for (const pageInfo of pages) {
      const page = await context.newPage();

      try {
        // 设置 API 模拟
        await setupMocks(page);

        // 导航到页面
        await page.goto(`${BASE_URL}${pageInfo.path}`, {
          waitUntil: 'networkidle',
          timeout: 15000,
        });

        // 等待 JS 渲染完成
        await page.waitForTimeout(3000);

        const filename = `${OUTPUT_DIR}/${device.name}-${pageInfo.name}.png`;
        await page.screenshot({ path: filename, fullPage: false });
        console.log(`✓ ${filename}`);
      } catch (err) {
        console.error(`✗ ${device.name}-${pageInfo.name}: ${err.message}`);
      } finally {
        await page.close();
      }
    }

    await context.close();
  }

  await browser.close();
}

run().catch(console.error);
