import { test, expect } from '@playwright/test';

/**
 * 项目详情页 E2E 测试
 * 覆盖：项目详情加载、StageFlow 导航
 */

test.describe('项目详情页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 尝试登录
    const usernameInput = page.locator('input[type="text"]').first();
    await usernameInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

    const hasLoginForm = await usernameInput.isVisible().catch(() => false);
    if (hasLoginForm) {
      await usernameInput.fill('admin');
      await page.locator('input[type="password"]').first().fill('admin');
      await page.locator('button').filter({ hasText: /登录|Login|Sign/i }).first().click();
      await page.waitForResponse(resp => resp.url().includes('/auth/login'), { timeout: 10000 });
      await page.waitForLoadState('networkidle');
    }
  });

  test('点击项目卡片应能导航到详情页', async ({ page }) => {
    // 查找项目卡片（使用更通用的选择器）
    const clickableCards = page.locator('a[href*="/project/"], [class*="card"], [class*="project"]').first();
    const count = await page.locator('a[href*="/project/"]').count();

    if (count === 0) {
      test.skip('没有可点击的项目卡片');
      return;
    }

    await page.locator('a[href*="/project/"]').first().click();
    await page.waitForURL('**/project/**', { timeout: 10000 });

    // 验证详情页加载成功
    await expect(page.locator('body')).toBeVisible();
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/阶段|Stage|IDEA|想法|验证|原型/i);
  });
});
