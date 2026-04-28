import { test, expect } from '@playwright/test';

/**
 * 阶段提交验证 E2E 测试
 * 覆盖：全部6个阶段在没有实质内容时，点击"提交阶段"应弹出确认对话框
 * 依赖 auth.setup.ts 提供的已登录 storageState
 */

test.describe('阶段提交内容验证', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('全部6个阶段在空内容时应弹出确认对话框', async ({ page }) => {
    test.slow();

    // ========== 创建新项目 ==========
    const addButton = page.getByRole('button', { name: /添加新项目/i });
    await expect(addButton).toBeVisible();
    await addButton.click();

    const skipButton = page.getByRole('button', { name: /跳过.*手动输入/i });
    await skipButton.click();

    const testTitle = `E2E验证测试-${Date.now()}`;
    const titleInput = page.locator('input[type="text"]').first();
    await titleInput.fill(testTitle);

    const executeButton = page.getByRole('button', { name: /执行|execute/i });
    await executeButton.click();

    await expect(page.locator('text=/初始化项目|init_project/i').first()).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('body')).toContainText(testTitle);

    const projectCard = page.locator('h3').filter({ hasText: testTitle });
    await expect(projectCard).toBeVisible({ timeout: 10000 });
    await projectCard.click();
    await page.waitForURL('**/project/**', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.locator('.animate-spin').first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

    // 辅助函数：点击提交阶段并验证确认对话框出现
    const assertEmptyContentWarning = async (stageName: string) => {
      const completeBtn = page.getByRole('button', { name: /提交阶段/i });
      await expect(completeBtn).toBeVisible({ timeout: 5000 });
      await completeBtn.click();

      // 验证确认对话框出现（包含 WARNING 或 EMPTY_STAGE_CONTENT 文案）
      const modal = page.locator('.fixed').filter({ hasText: /WARNING|EMPTY_STAGE_CONTENT|尚未记录内容/i });
      await expect(modal.first()).toBeVisible({ timeout: 5000 });

      // 点击"返回编辑"取消提交
      const cancelBtn = page.getByRole('button', { name: /RETURN_TO_EDIT|返回编辑|取消/i });
      await cancelBtn.click();

      // 验证对话框消失，提交按钮仍然可见（阶段未提交）
      await expect(modal.first()).not.toBeVisible({ timeout: 5000 });
      await expect(completeBtn).toBeVisible({ timeout: 5000 });
    };

    // 辅助函数：强制继续完成当前阶段，并等待下一阶段解锁
    const forceCompleteStage = async (nextStageLabel?: string) => {
      const completeBtn = page.getByRole('button', { name: /提交阶段/i });
      await completeBtn.click();

      const confirmBtn = page.getByRole('button', { name: /PROCEED|确认继续|仍要提交/i });
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click();
      }

      // 等待阶段完成状态更新（提交按钮消失或重新出现表示已完成）
      await page.waitForTimeout(2000);

      // 如果指定了下一阶段标签，等待页面上出现该标签
      if (nextStageLabel) {
        await expect(page.locator('body')).toContainText(nextStageLabel, { timeout: 10000 });
      }
    };

    // ========== 01 IDEA 阶段 ==========
    await assertEmptyContentWarning('idea');
    await forceCompleteStage('验证');

    // ========== 02 VALIDATE 阶段 ==========
    await assertEmptyContentWarning('validate');
    await forceCompleteStage('原型');

    // ========== 03 PROTOTYPE 阶段 ==========
    await assertEmptyContentWarning('prototype');
    await forceCompleteStage('发布');

    // ========== 04 SHIP 阶段 ==========
    await assertEmptyContentWarning('ship');
    await forceCompleteStage('增长');

    // ========== 05 GROW 阶段 ==========
    await assertEmptyContentWarning('grow');
    await forceCompleteStage('变现');

    // ========== 06 MONETIZE 阶段 ==========
    await assertEmptyContentWarning('monetize');
  });
});
