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
  await expect(page.locator('.townTile.place')).toHaveCount(6);
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
  await page.click('[data-place=toys]');
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
  await page.click('[data-place=arcade]');
  await expect(page.locator('#arcade')).toBeVisible();
  await page.click('#arcade .closeGame');
  await expect(page.locator('#town')).toBeVisible();
  await page.click('[data-place=school]');
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

// Round 2: 🔨 build your own town with stars you earned
const AVATAR = { avatar: { skin: 1, hair: 'short', hairColor: 0, outfit: 'tee', color: 0, extra: 'none' } };
const RICH = { ...PET, kiddyKatPets: [{ ...PET.kiddyKatPets[0], stars: 200 }] };
const paletteItem = (page, name) => page.locator('.townPaletteItem').filter({ has: page.locator('.townPaletteName', { hasText: new RegExp(`^${name}$`) }) });

test('build mode: pick, place, level up, move, rename and take down', async ({ page }) => {
  const errors = await openAppAs(page, 'tiger', { ...RICH, kiddyKatTown: AVATAR });
  page.on('dialog', d => d.accept('Slime Spot'));
  await page.click('#townButton');
  await page.click('text=🔨 Build');
  // Tapping a lot with nothing picked gives a hint, not a build
  await page.click('.townTile[data-lot="0,0"]');
  await expect(page.locator('#townBody .arcadeMessage')).toContainText('First pick');
  const place = async (tab, name, lot) => {
    if (await page.locator('.townPop').count()) await page.click('.townPop .arcadeGo');
    await page.click(`.townTab >> text=${tab}`);
    await paletteItem(page, name).click();
    await page.click(`.townTile[data-lot="${lot}"]`);
  };
  await place('Nature', 'Tree', '0,0');            // 3
  await place('Nature', 'Flower bed', '0,2');      // 2
  await place('Fun', 'Pool', '5,0');               // 20
  await place('Fun', 'Playground', '0,8');         // 15
  await place('Buildings', 'My own shop', '2,7');  // 25, asks for a name
  await expect(page.locator('.townPop')).toContainText('Village');   // 5 things built
  await page.click('.townPop .arcadeGo');
  const t = await page.evaluate(() => loadTown());
  expect(t.built.map(b => b.lot)).toEqual(['0,0', '0,2', '5,0', '0,8', '2,7']);
  expect(t.built.find(b => b.id === 'shop').name).toBe('Slime Spot');
  expect(await page.evaluate(() => pet.stars)).toBe(200 - 65 + 2);   // +2 for leveling up
  // Move the pool
  await page.click('.townTile[data-lot="5,0"]');
  await page.click('.townPop >> text=🚚 Move');
  await page.click('.townTile[data-lot="6,0"]');
  expect(await page.evaluate(() => loadTown().built.find(b => b.id === 'pool').lot)).toBe('6,0');
  // Take down the playground: half the stars back
  await page.click('.townTile[data-lot="0,8"]');
  await page.click('.townPop >> text=Take down');
  expect(await page.evaluate(() => loadTown().built.length)).toBe(4);
  expect(await page.evaluate(() => pet.stars)).toBe(137 + 7);
  // Roads and stores can't be built on
  await expect(page.locator('.townTile.road[data-lot]')).toHaveCount(0);
  await expectNoProblems(page, errors);
});

test('build mode: not enough stars means no build', async ({ page }) => {
  await openAppAs(page, 'kitten', { ...PET, kiddyKatTown: AVATAR });
  await page.click('#townButton');
  await page.click('text=🔨 Build');
  await page.click('.townTab >> text=Fun');
  await paletteItem(page, 'Ferris wheel').click();
  await page.click('.townTile[data-lot="0,0"]');
  await expect(page.locator('#townBody .arcadeMessage')).toContainText('more ⭐');
  expect(await page.evaluate(() => loadTown().built.length)).toBe(0);
  expect(await page.evaluate(() => pet.stars)).toBe(30);
});

test('outside build mode, tapping something you built makes it do its thing', async ({ page }) => {
  const errors = await openAppAs(page, 'tiger', { ...PET, kiddyKatTown: { ...AVATAR, built: [{ lot: '2,7', id: 'shop', name: 'Slime Spot' }] } });
  await page.click('#townButton');
  await page.click('.townTile[data-lot="2,7"]');
  await expect(page.locator('.townPopSay')).toContainText('Welcome to Slime Spot', { timeout: 5000 });
  await expectNoProblems(page, errors);
});
