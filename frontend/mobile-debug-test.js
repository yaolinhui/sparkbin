import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:4173';
const MOCK_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6IlRlc3QgVXNlciJ9.mock-signature-1234567890abcdef';

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // 拦截所有请求并打印
  await page.route('**/*', (route) => {
    const request = route.request();
    console.log(`[REQUEST] ${request.method()} ${request.url()}`);
    route.continue();
  });

  // 设置认证 token
  await page.addInitScript((token) => {
    localStorage.setItem('sparkbin_token', token);
    console.log('[INIT] Token set to localStorage');
  }, MOCK_JWT);

  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);

  // 检查页面状态
  const localStorageToken = await page.evaluate(() => localStorage.getItem('sparkbin_token'));
  const isLoggedIn = await page.evaluate(() => {
    // 检查页面是否显示了登录后的元素
    const hasProjectBoard = document.querySelector('.grid') !== null;
    const hasLoginPage = document.querySelector('[data-testid="landing-page"]') !== null || document.textContent?.includes('进入系统');
    return { hasProjectBoard, hasLoginPage, url: window.location.href };
  });

  console.log('LocalStorage token:', localStorageToken);
  console.log('Page state:', isLoggedIn);

  await page.screenshot({ path: './mobile-test-screenshots/debug-auth.png', fullPage: false });
  console.log('Screenshot saved');

  await context.close();
  await browser.close();
}

run().catch(console.error);
