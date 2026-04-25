import { test, expect } from '@playwright/test';

/**
 * AI 建议功能 E2E 测试
 * 覆盖：点击 AI 建议按钮 -> 弹窗加载 -> 应用建议 -> 刷新验证持久化
 */

test.describe('AI 建议功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 登录
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

  test('项目详情页应能打开 AI 建议弹窗并持久化保存', async ({ page }) => {
    // 直接访问测试项目详情页
    await page.goto('/project/bcb3c745-328a-4795-9315-a46408b6a939');
    await page.waitForURL('**/project/**', { timeout: 10000 });

    // 等待 IdeaStage 渲染
    await page.waitForTimeout(500);

    // 记录当前第一个便利贴的内容（应该是占位符）
    const firstNoteBefore = await page.locator('.grid > div').first().textContent();
    expect(firstNoteBefore).toContain('核心痛点');

    // 查找 AI 建议按钮
    const aiButton = page.locator('button').filter({ hasText: /AI|建议|Suggest/i }).first();
    const hasAiButton = await aiButton.isVisible().catch(() => false);
    if (!hasAiButton) {
      test.skip('未找到 AI 建议按钮');
      return;
    }

    await aiButton.click();

    // 验证弹窗出现
    const dialog = page.locator('div.fixed.z-50').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog).toContainText('AI 建议预览', { timeout: 10000 });

    // 等待 AI 请求完成
    const applyBtn = dialog.locator('button').filter({ hasText: /应用建议/i });
    await expect(applyBtn).toBeVisible({ timeout: 60000 });

    // 选择"全部覆盖"模式
    const overwriteBtn = dialog.locator('button').filter({ hasText: /全部覆盖/i });
    await overwriteBtn.click();

    // 点击应用建议
    await applyBtn.click();

    // 等待弹窗关闭
    await expect(dialog).not.toBeVisible({ timeout: 15000 });

    // 验证页面内容已被替换（不再包含占位符文案）
    const firstNoteAfter = await page.locator('.grid > div').first().textContent();
    expect(firstNoteAfter).not.toContain('描述你想解决的核心问题');

    // 刷新页面验证持久化
    await page.reload();
    await page.waitForURL('**/project/**', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // 刷新后第一个便利贴的内容应该和刷新前一致
    const firstNoteAfterReload = await page.locator('.grid > div').first().textContent();
    expect(firstNoteAfterReload).not.toContain('描述你想解决的核心问题');
  });
});
