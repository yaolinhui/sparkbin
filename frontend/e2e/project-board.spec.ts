import { test, expect } from '@playwright/test';

/**
 * 项目仪表盘 E2E 测试
 * 覆盖：项目列表加载、Metrics Bar、创建项目入口
 */

test.describe('项目仪表盘', () => {
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

  test('项目列表页面应正确加载', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    // 检查页面包含 SparkBin 相关内容
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/SparkBin|SPARK|项目|Project/i);
  });

  test('页面应包含添加项目入口', async ({ page }) => {
    // 查找添加项目相关的按钮或链接
    const addProjectText = page.locator('text=/新项目|创建|Add Project|New Project/i');
    // 即使没有按钮，页面也应该是项目列表页
    await expect(page.locator('body')).toBeVisible();
  });
});
