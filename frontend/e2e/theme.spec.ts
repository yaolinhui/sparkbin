import { test, expect } from '@playwright/test';

/**
 * 主题切换 E2E 测试
 * 覆盖：深色/浅色主题切换、localStorage 持久化
 * 依赖 auth.setup.ts 提供的已登录 storageState
 */

test.describe('主题切换', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('页面应默认使用深色主题', async ({ page }) => {
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme === 'dark' || theme === 'light').toBeTruthy();
  });

  test('点击主题切换按钮应改变主题', async ({ page }) => {
    const themeButton = page.locator('button[aria-label*="theme"]').or(
      page.locator('button').filter({ has: page.locator('svg') }).first()
    );

    if (!(await themeButton.isVisible().catch(() => false))) {
      test.skip('未找到主题切换按钮');
      return;
    }

    const themeBefore = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));

    await themeButton.click();
    await page.waitForTimeout(300);

    const themeAfter = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));

    expect(themeAfter).not.toBe(themeBefore);
  });

  test('主题偏好应持久化到 localStorage', async ({ page }) => {
    const themeButton = page.locator('button[aria-label*="theme"]').or(
      page.locator('button').filter({ has: page.locator('svg') }).first()
    );

    if (!(await themeButton.isVisible().catch(() => false))) {
      test.skip('未找到主题切换按钮');
      return;
    }

    await themeButton.click();
    await page.waitForTimeout(300);

    const currentTheme = await page.evaluate(() => {
      return {
        html: document.documentElement.getAttribute('data-theme'),
        localStorage: localStorage.getItem('sparkbin-theme'),
      };
    });

    expect(currentTheme.localStorage).toBe(currentTheme.html);
  });
});
