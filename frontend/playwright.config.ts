import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 测试配置
 * 覆盖 SparkBin 核心用户流程：登录 → 项目列表 → 创建项目 → 阶段编辑
 */
export default defineConfig({
  testDir: './e2e',

  /* 测试文件匹配模式 */
  testMatch: '**/*.spec.ts',

  /* 并行运行测试 */
  fullyParallel: true,

  /* 失败时保留工件 */
  forbidOnly: !!process.env.CI,

  /* 全局超时 */
  timeout: 60 * 1000,

  /* 期望超时 */
  expect: {
    timeout: 15 * 1000,
  },

  /* 重试次数（CI 环境重试 2 次） */
  retries: process.env.CI ? 2 : 0,

  /* 并发 worker 数 */
  workers: process.env.CI ? 1 : undefined,

  /* 测试报告器 */
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],

  /* 全局测试配置 */
  use: {
    /* 基础 URL */
    baseURL: 'http://localhost:5173',

    /* 收集追踪信息 */
    trace: 'on-first-retry',

    /* 截图策略 */
    screenshot: 'only-on-failure',

    /* 视频录制 */
    video: 'on-first-retry',

    /* 视口大小 */
    viewport: { width: 1280, height: 720 },
  },

  /* 项目配置（浏览器） */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* 自动启动服务 */
  webServer: [
    {
      command: 'cd ../backend && python start.py',
      url: 'http://localhost:8000/health',
      timeout: 180 * 1000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      timeout: 180 * 1000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
