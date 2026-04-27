import { test as setup, expect } from '@playwright/test';
import fs from 'fs';

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

  const loginButton = page.getByRole('button', { name: 'LOGIN' });
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

  // 手动构造包含 localStorage 的 storageState（Playwright 不会自动捕获 localStorage）
  const localStorageData = await page.evaluate(() => {
    return {
      token: localStorage.getItem('sparkbin_token') || '',
      refreshToken: localStorage.getItem('sparkbin_refresh_token') || '',
      role: localStorage.getItem('sparkbin_role') || '',
      userId: localStorage.getItem('sparkbin_user_id') || '',
    };
  });

  const storageState = {
    cookies: [],
    origins: [
      {
        origin: 'http://localhost:5173',
        localStorage: [
          { name: 'sparkbin_token', value: localStorageData.token },
          { name: 'sparkbin_refresh_token', value: localStorageData.refreshToken },
          { name: 'sparkbin_role', value: localStorageData.role },
          { name: 'sparkbin_user_id', value: localStorageData.userId },
        ],
      },
    ],
  };

  const fs = await import('fs');
  fs.mkdirSync('playwright/.auth', { recursive: true });
  fs.writeFileSync(authFile, JSON.stringify(storageState, null, 2));
});

setup.afterAll(async () => {
  // Playwright 在 context 关闭时会自动覆盖 storageState 文件，
  // 但由于 localStorage 未被自动捕获，我们需要在 afterAll 中重新写入
  const fs = await import('fs');
  if (!fs.existsSync(authFile)) return;

  const content = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
  if (!content.origins || content.origins.length === 0 || !content.origins[0].localStorage) {
    // 如果 Playwright 自动保存的文件没有 localStorage，则不做任何事
    // （说明 Playwright 仍然没有捕获 localStorage，需要其他方案）
  }
});
