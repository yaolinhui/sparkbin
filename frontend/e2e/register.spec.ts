import { test, expect } from '@playwright/test';

/**
 * 注册流程 E2E 测试
 * 覆盖：注册页面、注册成功/失败场景
 * 运行在全新的 storageState（未登录）上
 */

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('注册流程', () => {
  test('注册新用户应成功', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 如果显示未登录占位页，先点击"进入系统"打开登录弹窗
    const enterBtn = page.locator('button').filter({ hasText: '进入系统' });
    if (await enterBtn.isVisible().catch(() => false)) {
      await enterBtn.click();
      await page.waitForTimeout(500);
    }

    // 切换到注册标签
    const registerTab = page.getByRole('button', { name: '注册' });
    await registerTab.click();
    await page.waitForTimeout(300);

    // 填写注册表单
    const testUsername = `e2euser${Date.now()}`;
    const testEmail = `e2e${Date.now()}@test.com`;
    const testPassword = 'Test123!';

    // 用户名
    const inputs = page.locator('input');
    await inputs.nth(1).fill(testUsername); // 第0个是honeypot隐藏字段
    await inputs.nth(2).fill(testEmail);
    await inputs.nth(3).fill(testPassword);
    await inputs.nth(4).fill(testPassword);

    // 监听注册 API 响应
    const registerPromise = page.waitForResponse(
      (resp) => resp.url().includes('/auth/register'),
      { timeout: 10000 }
    );

    // 点击注册按钮
    const registerButton = page.getByRole('button', { name: '注册账号' });
    await registerButton.click();

    const registerResponse = await registerPromise.catch(() => null);

    if (registerResponse) {
      console.log('Register response status:', registerResponse.status());
      const responseBody = await registerResponse.text().catch(() => '');
      console.log('Register response body:', responseBody.substring(0, 500));
    }

    await page.waitForLoadState('networkidle');

    // 检查是否有错误提示
    const errorVisible = await page.locator('text=/注册失败|Internal Server Error|用户名已被|邮箱已被|密码需要/i').first().isVisible().catch(() => false);
    const errorText = errorVisible
      ? await page.locator('text=/注册失败|Internal Server Error|用户名已被|邮箱已被|密码需要/i').first().textContent().catch(() => '')
      : '';

    if (errorVisible) {
      console.log('Registration error visible:', errorText);
    }

    // 检查是否登录成功（token 写入 localStorage）
    const token = await page.evaluate(() => localStorage.getItem('sparkbin_token'));
    console.log('Token after register:', token ? 'exists' : 'null');

    expect(token).toBeTruthy();
  });

  test('注册已存在的用户名应显示具体错误', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const enterBtn = page.locator('button').filter({ hasText: '进入系统' });
    if (await enterBtn.isVisible().catch(() => false)) {
      await enterBtn.click();
      await page.waitForTimeout(500);
    }

    const registerTab = page.getByRole('button', { name: '注册' });
    await registerTab.click();
    await page.waitForTimeout(300);

    const inputs = page.locator('input');
    await inputs.nth(1).fill('admin');
    await inputs.nth(2).fill('existing@test.com');
    await inputs.nth(3).fill('Test123!');
    await inputs.nth(4).fill('Test123!');

    const registerButton = page.getByRole('button', { name: '注册账号' });
    await registerButton.click();

    await page.waitForResponse((resp) => resp.url().includes('/auth/register'), { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=/用户名已被|邮箱已被/i').first()).toBeVisible({ timeout: 5000 });
  });
});
