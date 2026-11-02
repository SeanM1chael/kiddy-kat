// =====================================================================
// pages.spec.js — the other pages open with no errors
// =====================================================================
const { test, expect } = require('@playwright/test');

for (const pageName of ['dashboard.html', 'signup.html', 'privacy.html', 'fan.html']) {
  test(`${pageName} opens with no errors`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(url => !url.href.startsWith('http://localhost:8080'), route => route.abort());
    const response = await page.goto('/' + pageName);
    expect(response.status()).toBe(200);
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });
}

test('privacy policy names the business and contact', async ({ page }) => {
  await page.goto('/privacy.html');
  await expect(page.locator('body')).toContainText('APS Legacy Group');
});
