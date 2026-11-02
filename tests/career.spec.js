// =====================================================================
// career.spec.js — 🦅 career mode focus: job search or building a business
// =====================================================================
const { test, expect } = require('@playwright/test');
const { openAppAs, expectNoProblems, PET } = require('./helpers');

test('first time: pick a focus, builder gets its own goals and tracker tabs', async ({ page }) => {
  const errors = await openAppAs(page, 'eagle', PET);
  await expect(page.locator('#careerCard')).toContainText("What's your focus");
  await page.click('#careerCard >> text=🚀 Building my own business');
  await expect(page.locator('#careerCard')).toContainText('Builder this week: 0 of 20');
  await expect(page.locator('#careerCard')).toContainText('Milestones shipped');
  await expect(page.locator('#careerCard')).not.toContainText('Job applications');
  // The tracker opens on Projects (no PIN set in this test)
  await page.click('#careerCard .careerOpen');
  await expect(page.locator('#careerBody .careerTabs').nth(1)).toContainText('🚀 Projects');
  await expect(page.locator('#careerBody .careerTabs').nth(1)).not.toContainText('Job search');
  await expectNoProblems(page, errors);
});

test('launching a project counts a shipped milestone and celebrates', async ({ page }) => {
  await openAppAs(page, 'eagle', { ...PET, kiddyKatCareerFocus: 'builder' });
  await page.evaluate(() => careerAutoStep('projects', 'testing', 'launched'));
  await expect(page.locator('#party')).toBeVisible();
  expect(await page.evaluate(() => careerWeek().counts.ship)).toBe(1);
});

test('job search focus still has the job goals', async ({ page }) => {
  await openAppAs(page, 'eagle', { ...PET, kiddyKatCareerFocus: 'job' });
  await expect(page.locator('#careerCard')).toContainText('Career this week');
  await expect(page.locator('#careerCard')).toContainText('Job applications');
});
