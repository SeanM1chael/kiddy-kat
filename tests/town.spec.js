// =====================================================================
// town.spec.js — 🏙️ Kat Town: character, stores, wish list
// =====================================================================
const { test, expect } = require('@playwright/test');
const { openAppAs, expectNoProblems, PET } = require('./helpers');

test('first visit: make a character, then the town map shows', async ({ page }) => {
  const errors = await openAppAs(page, 'tiger', PET);
  await page.click('#townButton');
  await expect(page.locator('#townTitle')).toContainText('Make your character');
  await page.click('.townChoice >> text=Curly');
  await page.click('text=✅ Done! Go to town');
  await expect(page.locator('.townPlace')).toHaveCount(6);
  expect(await page.evaluate(() => loadTown().avatar.hair)).toBe('curly');
  await expectNoProblems(page, errors);
});

test('buying spends stars, unlocks the outfit, and needs enough stars', async ({ page }) => {
  await openAppAs(page, 'tiger', { ...PET, kiddyKatTown: { avatar: { skin: 1, hair: 'short', hairColor: 0, outfit: 'tee', color: 0, extra: 'none' } } });
  page.on('dialog', d => d.accept());
  await page.evaluate(() => { openTown(); showTownStore('closet'); });
  await page.locator('.townItem', { hasText: 'Cozy hoodie' }).locator('.townBuy').click();
  expect(await page.evaluate(() => pet.stars)).toBe(30 - 15);
  await expect(page.locator('.townItem', { hasText: 'Cozy hoodie' }).locator('.townBuy')).toHaveText('✅ Got it');
  // Too expensive: the crown costs 30, only 15 left
  await page.locator('.townItem', { hasText: 'Royal crown' }).locator('.townBuy').click();
  await expect(page.locator('#townBody .arcadeMessage')).toContainText('more ⭐');
  expect(await page.evaluate(() => pet.stars)).toBe(15);
  // The hoodie is now unlocked in the character creator
  await page.evaluate(() => { townCreating = loadTown().avatar; showTownCreator(false); });
  await expect(page.locator('.townChoice', { hasText: 'Hoodie' })).not.toHaveClass(/locked/);
  await expect(page.locator('.townChoice', { hasText: 'Jersey' })).toHaveClass(/locked/);
});

test('wish list: hearts and notes go online for the parent dashboard', async ({ page }) => {
  await openAppAs(page, 'kitten', { ...PET, kiddyKatTown: { avatar: { skin: 1, hair: 'short', hairColor: 0, outfit: 'tee', color: 0, extra: 'none' } } });
  await page.evaluate(() => { openTown(); showTownStore('burger'); });
  await page.locator('.townItem', { hasText: 'Tacos' }).locator('.townHeart').click();
  await page.evaluate(() => showTownHome());
  await page.fill('.townWishNote', 'the spicy ones');
  await page.locator('.townWishNote').blur();
  const sent = JSON.parse(await page.evaluate(() => cloudCollect().kiddyKatTown));
  expect(sent.wishes).toEqual([expect.objectContaining({ name: 'Tacos', note: 'the spicy ones', kind: 'food' })]);
});

test('grown-ups (eagle) do not get Kat Town', async ({ page }) => {
  await openAppAs(page, 'eagle', PET);
  await expect(page.locator('#townButton')).toBeHidden();
});
