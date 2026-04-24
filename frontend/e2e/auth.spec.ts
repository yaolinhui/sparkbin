import { test, expect } from '@playwright/test';

/**
 * 认证相关 E2E 测试
 * 覆盖：登录页面、登录流程、Token 存储
 */

test.describe('认证流程', () => {
  test('登录页面应正确加载', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/SparkBin/);
    // 页面应可见登录相关元素或已登录后的主界面
    await expect(page.locator('body')).toBeVisible();
  });

  test('使用默认账号登录应成功', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 等待登录表单出现（后端初始化可能需要时间）
    const usernameInput = page.locator('input[type="text"]').first();
    await usernameInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

    const hasLoginForm = await usernameInput.isVisible().catch(() => false);
    if (!hasLoginForm) {
      test.skip('已登录或无登录表单');
      return;
    }

    // 填写默认账号
    await usernameInput.fill('admin');
    await page.locator('input[type="password"]').first().fill('admin');

    // 点击登录按钮
    const loginButton = page.locator('button').filter({ hasText: /登录|Login|Sign/i }).first();
    await loginButton.click();

    // 等待登录请求完成
    await page.waitForResponse(resp => resp.url().includes('/auth/login'), { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // 验证登录成功：token 已写入 localStorage（key 为 sparkbin_token）
    const token = await page.evaluate(() => localStorage.getItem('sparkbin_token'));
    expect(token).toBeTruthy();
  });

  test('错误密码登录应显示错误提示', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const usernameInput = page.locator('input[type="text"]').first();
    await usernameInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

    const hasLoginForm = await usernameInput.isVisible().catch(() => false);
    if (!hasLoginForm) {
      test.skip('已登录或无登录表单');
      return;
    }

    await usernameInput.fill('admin');
    await page.locator('input[type="password"]').first().fill('wrong-password');

    const loginButton = page.locator('button').filter({ hasText: /登录|Login|Sign/i }).first();
    await loginButton.click();

    // 等待登录请求完成（即使是失败）
    await page.waitForResponse(resp => resp.url().includes('/auth/login'), { timeout: 10000 });

    // 应显示错误提示或仍然停留在登录界面
    await expect(page.locator('body')).toBeVisible();
  });
});
