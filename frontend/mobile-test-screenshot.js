import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';

const BASE_URL = 'http://localhost:4173';
const OUTPUT_DIR = './mobile-test-screenshots';

// 确保输出目录存在
try { mkdirSync(OUTPUT_DIR); } catch {}

const devices = [
  { name: 'iphone-se', viewport: { width: 375, height: 667 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)' },
  { name: 'iphone-14', viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)' },
  { name: 'ipad-mini', viewport: { width: 768, height: 1024 }, userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)' },
];

const pages = [
  { path: '/', name: 'landing-login' },
  { path: '/project/test-123', name: 'project-detail-loading' },
];

async function run() {
  const browser = await chromium.launch();

  for (const device of devices) {
    const context = await browser.newContext({
      viewport: device.viewport,
      userAgent: device.userAgent,
      deviceScaleFactor: 2,
    });

    for (const pageInfo of pages) {
      const page = await context.newPage();
      try {
        await page.goto(`${BASE_URL}${pageInfo.path}`, { waitUntil: 'networkidle', timeout: 15000 });
        // 等待一段时间让 JS 渲染完成
        await page.waitForTimeout(2000);

        const filename = `${OUTPUT_DIR}/${device.name}-${pageInfo.name}.png`;
        await page.screenshot({ path: filename, fullPage: false });
        console.log(`✓ ${filename}`);
      } catch (err) {
        console.error(`✗ ${device.name}-${pageInfo.name}: ${err.message}`);
      } finally {
        await page.close();
      }
    }

    await context.close();
  }

  await browser.close();
}

run().catch(console.error);
