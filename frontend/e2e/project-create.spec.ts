import { test, expect } from '@playwright/test';

/**
 * 创建项目 E2E 测试
 * 覆盖：打开弹窗、填写表单、提交成功
 * 依赖 auth.setup.ts 提供的已登录 storageState
 */

test.describe('创建项目', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // 等待项目列表 API 加载完成
    await page.waitForResponse(resp => resp.url().includes('/api/v1/projects'), { timeout: 15000 }).catch(() => {});
    await page.waitForLoadState('networkidle');
  });

  test('应能通过弹窗创建新项目', async ({ page }) => {
    // 1. 点击"添加新项目"按钮打开弹窗
    const addButton = page.getByRole('button', { name: /添加新项目/i });
    await expect(addButton).toBeVisible();
    await addButton.click();

    // 2. 验证弹窗已打开（Step 1）
    await expect(page.locator('text=/初始化项目|init_project/i').first()).toBeVisible();

    // 3. 输入痛点描述
    const descriptionTextarea = page.locator('textarea').first();
    await descriptionTextarea.fill('测试痛点描述');

    // 4. 点击"跳过 — 手动输入"直接进入 Step 3
    const skipButton = page.getByRole('button', { name: /跳过.*手动输入/i });
    await skipButton.click();

    // 5. 验证进入 Step 3（确认参数）
    await expect(page.locator('text=/确认参数|confirm_params/i').first()).toBeVisible();

    // 6. 输入项目标题（使用随机名称避免重复）
    const testTitle = `E2E测试项目-${Date.now()}`;
    const titleInput = page.locator('input[type="text"]').first();
    await titleInput.fill(testTitle);

    // 7. 点击执行按钮创建项目
    const executeButton = page.getByRole('button', { name: /执行|execute/i });
    await executeButton.click();

    // 8. 验证弹窗关闭，页面出现新项目
    await expect(page.locator('text=/初始化项目|init_project/i').first()).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('body')).toContainText(testTitle);
  });
});
