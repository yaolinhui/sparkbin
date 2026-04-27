import { test, expect } from '@playwright/test';

/**
 * 项目详情页 E2E 测试
 * 覆盖：项目详情加载、StageFlow 导航、标题编辑、复选框勾选标记
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

  test('PrototypeStage 和 ShipStage 复选框勾选后应显示勾选标记', async ({ page }) => {
    test.slow();

    // ========== 创建项目 ==========
    const addButton = page.getByRole('button', { name: /添加新项目/i });
    await expect(addButton).toBeVisible();
    await addButton.click();

    const skipButton = page.getByRole('button', { name: /跳过.*手动输入/i });
    await skipButton.click();

    const testTitle = `E2E复选框测试-${Date.now()}`;
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

    // ========== 辅助函数：完成当前阶段 ==========
    const completeCurrentStage = async () => {
      const completeBtn = page.getByRole('button', { name: /提交阶段/i });
      await expect(completeBtn).toBeVisible({ timeout: 5000 });
      await completeBtn.click();

      // 如果弹出空内容确认框，点击 PROCEED 继续
      const confirmBtn = page.getByRole('button', { name: /PROCEED|确认继续|仍要提交/i });
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click();
      }

      // 等待完成状态更新（提交按钮消失或变成"已完成"）
      await page.waitForTimeout(1000);
    };

    // ========== 完成 idea 阶段 ==========
    await completeCurrentStage();

    // ========== 完成 validate 阶段 ==========
    await completeCurrentStage();

    // ========== 完成 prototype 阶段（先选择平台+模板）==========
    // 导航到 Prototype 阶段（03）
    const prototypeBtn = page.locator('button[title*="原型"]').first();
    await prototypeBtn.click();
    await page.waitForTimeout(500);

    // 选择平台：Web 网站
    const webPlatform = page.locator('button').filter({ hasText: 'Web 网站' }).first();
    await expect(webPlatform).toBeVisible({ timeout: 10000 });
    await webPlatform.click();
    await page.waitForTimeout(300);

    // 进入"挑选设计"步骤
    const designTab = page.locator('button').filter({ hasText: '挑选设计' }).first();
    await expect(designTab).toBeVisible({ timeout: 5000 });
    await designTab.click();
    await page.waitForTimeout(300);

    // 选择第一个设计模板（按钮形式）
    const firstTemplate = page.locator('button').filter({ hasText: /简洁仪表板|卡片列表|时间轴|落地页/i }).first();
    if (await firstTemplate.isVisible().catch(() => false)) {
      await firstTemplate.click();
      await page.waitForTimeout(300);
    }

    // 进入"功能开发"步骤
    const devTab = page.locator('button').filter({ hasText: '功能开发' }).first();
    await expect(devTab).toBeVisible({ timeout: 5000 });
    await devTab.click();
    await page.waitForTimeout(300);

    // ========== 测试 PrototypeStage 复选框 ==========
    // 滚动到 release checklist 区域（在页面下方）
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    // 找到"域名配置"复选框并点击
    const domainCheckbox = page.getByText('域名配置').locator('xpath=ancestor::label').first();
    await expect(domainCheckbox).toBeVisible({ timeout: 10000 });

    // 获取 checkbox 视觉 div（label 下的第一个 div）
    const checkboxDiv = domainCheckbox.locator('div').first();
    await expect(checkboxDiv).toBeVisible();

    // 确保复选框未选中（背景不是绿色）
    await expect(checkboxDiv).toHaveClass(/border-brutal-muted/);

    // 点击复选框
    await domainCheckbox.click();
    await page.waitForTimeout(300);

    // 验证：背景变绿且 SVG checkmark 可见
    await expect(checkboxDiv).toHaveClass(/bg-brutal-success/);
    await expect(checkboxDiv).toHaveClass(/border-brutal-success/);
    const svg = checkboxDiv.locator('svg');
    await expect(svg).toBeVisible();

    // 完成 prototype 阶段
    await completeCurrentStage();

    // ========== 测试 ShipStage 复选框 ==========
    // 导航到 Ship 阶段（04）
    const shipBtn = page.locator('button[title*="发布"]').first();
    await shipBtn.click();
    await page.waitForTimeout(500);

    // 找到"域名配置"复选框并点击（ShipStage 也有同名项）
    const shipCheckbox = page.locator('label').filter({ hasText: '域名配置' }).first();
    await expect(shipCheckbox).toBeVisible({ timeout: 10000 });

    // 获取图标容器
    const iconWrapper = shipCheckbox.locator('div.relative').first();
    await expect(iconWrapper).toBeVisible();

    // 点击前：badge 不存在
    const badgeBefore = iconWrapper.locator('div.absolute').first();
    expect(await badgeBefore.isVisible().catch(() => false)).toBe(false);

    // 点击复选框
    await shipCheckbox.click();
    await page.waitForTimeout(300);

    // 验证：绿色 badge 出现且包含 Check 图标
    const badgeAfter = iconWrapper.locator('div.absolute').first();
    await expect(badgeAfter).toBeVisible();
    await expect(badgeAfter).toHaveClass(/bg-brutal-success/);
  });
});
