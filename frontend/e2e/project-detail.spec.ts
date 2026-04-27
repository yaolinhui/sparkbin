import { test, expect } from '@playwright/test';

/**
 * 项目详情页 E2E 测试
 * 覆盖：项目详情加载、StageFlow 导航、标题编辑
 * 依赖 auth.setup.ts 提供的已登录 storageState
 */

test.describe('项目详情页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('点击项目卡片应能导航到详情页', async ({ page }) => {
    const clickableCards = page.locator('a[href*="/project/"], [class*="card"], [class*="project"]').first();
    const count = await page.locator('a[href*="/project/"]').count();

    if (count === 0) {
      test.skip('没有可点击的项目卡片');
      return;
    }

    await page.locator('a[href*="/project/"]').first().click();
    await page.waitForURL('**/project/**', { timeout: 10000 });

    await expect(page.locator('body')).toBeVisible();
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/阶段|Stage|IDEA|想法|验证|原型/i);
  });

  test('应能编辑项目标题', async ({ page }) => {
    // 1. 先创建一个新项目，确保有项目可编辑
    const addButton = page.getByRole('button', { name: /添加新项目/i });
    await expect(addButton).toBeVisible();
    await addButton.click();

    // 2. 跳过 AI 建议，进入手动输入
    const skipButton = page.getByRole('button', { name: /跳过.*手动输入/i });
    await skipButton.click();

    // 3. 在确认参数步骤输入项目标题
    const testTitle = `E2E标题测试-${Date.now()}`;
    const titleInput = page.locator('input[type="text"]').first();
    await titleInput.fill(testTitle);

    // 4. 点击执行按钮创建项目
    const executeButton = page.getByRole('button', { name: /执行|execute/i });
    await executeButton.click();

    // 5. 等待弹窗关闭，项目列表出现新项目
    await expect(page.locator('text=/初始化项目|init_project/i').first()).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('body')).toContainText(testTitle);

    // 6. 点击新项目卡片进入详情页
    const projectCard = page.locator('h3').filter({ hasText: testTitle });
    await expect(projectCard).toBeVisible({ timeout: 10000 });
    await projectCard.click();
    await page.waitForURL('**/project/**', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // 等待页面加载完成（loading spinner 消失）
    await page.locator('.animate-spin').first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

    // 7. 点击标题进入编辑模式
    const titleButton = page.locator('button[title="点击修改项目名称"]').first();
    await expect(titleButton).toBeVisible({ timeout: 15000 });
    await titleButton.click();

    // 8. 输入新标题并按 Enter 保存
    const newTitle = `已修改-${Date.now()}`;
    const editInput = page.locator('input[type="text"]').filter({ hasValue: testTitle });
    await expect(editInput).toBeVisible();
    await editInput.fill(newTitle);
    await editInput.press('Enter');

    // 9. 验证标题已更新
    await expect(page.locator('body')).toContainText(newTitle);
    await expect(page.locator('button[title="点击修改项目名称"]').first()).toContainText(newTitle);
  });
});
