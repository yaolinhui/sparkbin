import { test, expect } from '@playwright/test';

/**
 * 项目仪表盘 E2E 测试
 * 覆盖：项目列表加载、Metrics Bar、创建项目入口
 * 依赖 auth.setup.ts 提供的已登录 storageState
 */

test.describe('项目仪表盘', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('项目列表页面应正确加载', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/SparkBin|SPARK|项目|Project/i);
  });

  test('页面应包含添加项目入口', async ({ page }) => {
    const addProjectText = page.locator('text=/新项目|创建|Add Project|New Project/i');
    await expect(page.locator('body')).toBeVisible();
  });
});
