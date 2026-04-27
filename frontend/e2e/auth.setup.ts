import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

/**
 * Auth setup - runs once before all other tests
 * Logs in, handles forced password change, and saves storage state
 * so all other tests can reuse the authenticated session.
 */
setup('authenticate', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // 如果显示未登录占位页，先点击 LOGIN 打开弹窗
  const loginBtn = page.locator('button').filter({ hasText: 'LOGIN' });
  if (await loginBtn.isVisible().catch(() => false)) {
    await loginBtn.click();
    await page.waitForTimeout(500);
  }

  // 等待登录表单出现
  const usernameInput = page.locator('input[type="text"]').first();
  await usernameInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

  const hasLoginForm = await usernameInput.isVisible().catch(() => false);
  if (!hasLoginForm) {
    // 已经登录了（可能从上次session复用），直接保存state
    await page.context().storageState({ path: authFile });
    return;
  }

  // 尝试默认密码
  await usernameInput.fill('admin');
  await page.locator('input[type="password"]').first().fill('admin');

  const loginButton = page.locator('button').filter({ hasText: /登录|Login|Sign/i }).first();
  await loginButton.click();

  await page.waitForResponse(resp => resp.url().includes('/auth/login'), { timeout: 10000 }).catch(() => {});
  await page.waitForLoadState('networkidle');

  // 检查是否登录失败（密码已被修改）
  const errorVisible = await page.locator('text=/Unauthorized|用户名或密码错误/i').first().isVisible().catch(() => false);
  if (errorVisible) {
    await page.locator('input[type="password"]').first().fill('Admin123');
    await loginButton.click();
    await page.waitForResponse(resp => resp.url().includes('/auth/login'), { timeout: 10000 }).catch(() => {});
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
    await expect(changePasswordHeading).not.toBeVisible({ timeout: 10000 });
  }

  // 验证登录成功
  await expect.poll(async () => {
    const token = await page.evaluate(() => localStorage.getItem('sparkbin_token'));
    return token;
  }, { timeout: 10000 }).toBeTruthy();

  // 保存存储状态（包含 localStorage 中的 token）
  await page.context().storageState({ path: authFile });
});
