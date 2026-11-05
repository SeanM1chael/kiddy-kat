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
  await expect(page.locator('.townPop')).toContainText('Cozy hoodie is yours');      // the "put it on" scene
  await page.click('.townPop >> text=Later');
  await expect(page.locator('.townItem', { hasText: 'Cozy hoodie' }).locator('.townBuy')).toHaveText('👕 Wear');
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

// Nov 4: leaving a place went to the app's home page instead of the town map
test('✖ in a store goes back to the map; ✖ on the map leaves town', async ({ page }) => {
  await openAppAs(page, 'tiger', { ...PET, kiddyKatTown: { avatar: { skin: 1, hair: 'short', hairColor: 0, outfit: 'tee', color: 0, extra: 'none' } } });
  await page.click('#townButton');
  await page.click('.townPlace >> text=Toy Box');
  await expect(page.locator('#townTitle')).toContainText('Toy Box');
  await page.click('#town .closeGame');
  await expect(page.locator('#townTitle')).toContainText('Kat Town');
  await expect(page.locator('#town')).toBeVisible();
  await page.click('#town .closeGame');
  await expect(page.locator('#town')).toBeHidden();
});

test('Practice and the Arcade opened from town come back to the town map', async ({ page }) => {
  await openAppAs(page, 'tiger', { ...PET, kiddyKatTown: { avatar: { skin: 1, hair: 'short', hairColor: 0, outfit: 'tee', color: 0, extra: 'none' } } });
  await page.click('#townButton');
  await page.click('.townPlace >> text=Arcade');
  await expect(page.locator('#arcade')).toBeVisible();
  await page.click('#arcade .closeGame');
  await expect(page.locator('#town')).toBeVisible();
  await page.click('.townPlace >> text=Kat Academy');
  await expect(page.locator('#game')).toBeVisible();
  await page.click('#game .closeGame');
  await expect(page.locator('#townTitle')).toContainText('Kat Town');
  // Opening Practice from the main screen still closes normally
  await page.click('#town .closeGame');
  await page.click('text=🎮 Practice');
  await page.click('#game .closeGame');
  await expect(page.locator('#town')).toBeHidden();
});

// Nov 4: "nothing happens when you select things"
test('things you buy do something: put on clothes, eat food, play with toys', async ({ page }) => {
  const errors = await openAppAs(page, 'tiger', { ...PET, kiddyKatTown: { avatar: { skin: 1, hair: 'short', hairColor: 0, outfit: 'tee', color: 0, extra: 'none' } } });
  page.on('dialog', d => d.accept());
  await page.evaluate(() => { openTown(); showTownStore('closet'); });
  // Tap a card to try it on in the mirror (free)
  await page.locator('.townItem', { hasText: 'Baseball cap' }).click();
  await expect(page.locator('.townItem.trying')).toContainText('Baseball cap');
  // Buy and put it on
  await page.locator('.townItem', { hasText: 'Baseball cap' }).locator('.townBuy').click();
  await page.click('.townPop >> text=👕 Put it on');
  expect(await page.evaluate(() => loadTown().avatar.extra)).toBe('cap');
  await page.click('.townPop >> text=😎 Thanks!');
  // Food: three bites, then yum
  await page.evaluate(() => showTownStore('burger'));
  await page.locator('.townItem', { hasText: 'Tacos' }).locator('.townBuy').click();
  await expect(page.locator('.townPopSay')).toContainText('Yum', { timeout: 5000 });
  await page.click('.townPop >> text=😄 So good!');
  // Toys: play right away, and again from My House
  await page.evaluate(() => showTownStore('toys'));
  await page.locator('.townItem', { hasText: 'Soccer ball' }).locator('.townBuy').click();
  await page.click('.townPop >> text=▶️ Play now');
  await expect(page.locator('.townPopSay')).toContainText('GOAL');
  await page.click('.townPop >> text=Done');
  await page.evaluate(() => showTownHome());
  await page.locator('.townStuffItem[aria-label="Soccer ball"]').click();
  await expect(page.locator('.townPop')).toBeVisible();
  await expectNoProblems(page, errors);
});
