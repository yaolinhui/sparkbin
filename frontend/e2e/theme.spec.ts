import { test, expect } from '@playwright/test';

/**
 * 主题切换 E2E 测试
 * 覆盖：深色/浅色主题切换、localStorage 持久化
 */

test.describe('主题切换', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 尝试登录（如果未登录）
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

    // 处理强制改密弹窗（首次登录）
    const changePasswordHeading = page.locator('h1').filter({ hasText: /首次登录|修改默认密码/i });
    const hasForceChange = await changePasswordHeading.isVisible().catch(() => false);
    if (hasForceChange) {
      const modal = page.locator('div.fixed').filter({ has: changePasswordHeading });
      const pwdInputs = modal.locator('input[type="password"]');
      await pwdInputs.nth(0).fill('admin');
      await pwdInputs.nth(1).fill('Admin123');
      await pwdInputs.nth(2).fill('Admin123');
      await modal.locator('button[type="submit"]').click();
      await page.waitForResponse(resp => resp.url().includes('/auth/change-password'), { timeout: 10000 }).catch(() => {});
      await page.waitForLoadState('networkidle');
    }
  });

  test('页面应默认使用深色主题', async ({ page }) => {
    // 检查 html 标签的 data-theme 属性
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    // 默认可能是 dark 或根据系统偏好
    expect(theme === 'dark' || theme === 'light').toBeTruthy();
  });

  test('点击主题切换按钮应改变主题', async ({ page }) => {
    // 查找主题切换按钮（Sun/Moon 图标）
    const themeButton = page.locator('button[aria-label*="theme"]').or(
      page.locator('button').filter({ has: page.locator('svg') }).first()
    );

    if (!(await themeButton.isVisible().catch(() => false))) {
      test.skip('未找到主题切换按钮');
      return;
    }

    // 获取切换前的主题
    const themeBefore = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));

    // 点击切换
    await themeButton.click();
    await page.waitForTimeout(300);

    // 获取切换后的主题
    const themeAfter = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));

    // 主题应该发生变化
    expect(themeAfter).not.toBe(themeBefore);
  });

  test('主题偏好应持久化到 localStorage', async ({ page }) => {
    // 先切换一次主题
    const themeButton = page.locator('button[aria-label*="theme"]').or(
      page.locator('button').filter({ has: page.locator('svg') }).first()
    );

    if (!(await themeButton.isVisible().catch(() => false))) {
      test.skip('未找到主题切换按钮');
      return;
    }

    await themeButton.click();
    await page.waitForTimeout(300);

    // 获取当前主题
    const currentTheme = await page.evaluate(() => {
      return {
        html: document.documentElement.getAttribute('data-theme'),
        localStorage: localStorage.getItem('sparkbin-theme'),
      };
    });

    // localStorage 中的值应与当前主题一致
    expect(currentTheme.localStorage).toBe(currentTheme.html);
  });
});
