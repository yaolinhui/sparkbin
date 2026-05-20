import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 生产环境 E2E 测试配置
 *
 * 用途：在生产环境验证核心用户流程
 * 运行方式：npx playwright test --config=playwright.config.production.ts
 *
 * ⚠️ 注意事项：
 * - 使用专用测试账号，避免污染真实用户数据
 * - 测试会在生产数据库创建项目，建议配置测试后清理
 * - 不要在高峰期运行（避免占用生产资源）
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false, // 生产环境串行，避免并发压力
  timeout: 60 * 1000,
  expect: { timeout: 15 * 1000 },
  retries: 2, // 生产环境不稳定因素多，重试 2 次
  workers: 1, // 生产环境单 worker
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL: 'https://app.wanchun.me',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    // 生产环境额外头部（模拟真实浏览器）
    extraHTTPHeaders: {
      'X-Test-Run': 'playwright-production',
    },
  },
  projects: [
    {
      name: 'production-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // 如需测试移动端，取消注释：
    // {
    //   name: 'production-mobile',
    //   use: { ...devices['iPhone 14'] },
    // },
  ],
  // 生产环境不自动启动服务（使用线上地址）
  // webServer: undefined,
});
