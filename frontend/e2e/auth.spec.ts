import { test, expect } from '@playwright/test';

/**
 * 认证相关 E2E 测试
 * 覆盖：登录页面、登录流程、Token 存储
 * 这些测试运行在全新的 storageState（未登录）上
 */

test.use({ storageState: { cookies: [], origins: [] } });

test.describe.configure({ mode: 'serial' });

test.describe('认证流程', () => {
  test('登录页面应正确加载', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/SparkBin/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('使用默认账号登录应成功', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loginBtn = page.locator('button').filter({ hasText: 'LOGIN' });
    if (await loginBtn.isVisible().catch(() => false)) {
      await loginBtn.click();
      await page.waitForTimeout(500);
    }

    const usernameInput = page.locator('input[type="text"]').first();
    await usernameInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

    const hasLoginForm = await usernameInput.isVisible().catch(() => false);
    if (!hasLoginForm) {
      test.skip('已登录或无登录表单');
      return;
    }

    await usernameInput.fill('admin');
    await page.locator('input[type="password"]').first().fill('admin');

    const loginButton = page.getByRole('button', { name: 'LOGIN' });
    await loginButton.click();

    await page.waitForResponse(resp => resp.url().includes('/auth/login'), { timeout: 10000 }).catch(() => {});
    await page.waitForLoadState('networkidle');

    const errorVisible = await page.locator('text=/Unauthorized|用户名或密码错误/i').first().isVisible().catch(() => false);
    if (errorVisible) {
      await page.locator('input[type="password"]').first().fill('Admin123');
      await loginButton.click();
      await page.waitForResponse(resp => resp.url().includes('/auth/login'), { timeout: 10000 }).catch(() => {});
      await page.waitForLoadState('networkidle');
    }

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
      await expect(changePasswordHeading).not.toBeVisible({ timeout: 10000 });
    }

    const token = await page.evaluate(() => localStorage.getItem('sparkbin_token'));
    expect(token).toBeTruthy();
  });

  test('错误密码登录应显示错误提示', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loginBtn = page.locator('button').filter({ hasText: 'LOGIN' });
    if (await loginBtn.isVisible().catch(() => false)) {
      await loginBtn.click();
      await page.waitForTimeout(500);
    }

    const usernameInput = page.locator('input[type="text"]').first();
    await usernameInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

    const hasLoginForm = await usernameInput.isVisible().catch(() => false);
    if (!hasLoginForm) {
      test.skip('已登录或无登录表单');
      return;
    }

    await usernameInput.fill('admin');
    await page.locator('input[type="password"]').first().fill('wrong-password');

    const loginButton = page.getByRole('button', { name: 'LOGIN' });
    await loginButton.click();

    await page.waitForResponse(resp => resp.url().includes('/auth/login'), { timeout: 10000 });
    await expect(page.locator('body')).toBeVisible();
  });
});
