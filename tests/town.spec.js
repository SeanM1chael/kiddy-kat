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

// Round 3: decorate My House
test('decorate my room: buy, place, recolor, move, put away', async ({ page }) => {
  const errors = await openAppAs(page, 'tiger', { ...RICH, kiddyKatTown: AVATAR });
  await page.click('#townButton');
  await page.click('[data-place=home]');
  await page.click('text=🎨 Decorate my room', { timeout: 5000 });
  await page.click('.townRoomSpot[data-spot="0,0"]');
  await expect(page.locator('#townBody .arcadeMessage')).toContainText('First pick');
  await paletteItem(page, 'TV').click();
  await page.click('.townRoomSpot[data-spot="2,1"]');
  await paletteItem(page, 'Comfy bed').click();
  await page.click('.townRoomSpot[data-spot="0,3"]');
  expect(await page.evaluate(() => pet.stars)).toBe(200 - 12 - 6);
  await page.click('[aria-label="wall color 3"]');
  // Move the TV, then put the bed away for half back
  await page.click('.townRoomSpot[data-spot="2,1"]');
  await page.click('.townPop >> text=🚚 Move');
  await page.click('.townRoomSpot[data-spot="4,1"]');
  await page.click('.townRoomSpot[data-spot="0,3"]');
  await page.click('.townPop >> text=Put away');
  const room = await page.evaluate(() => loadTown().room);
  expect(room.wall).toBe(2);
  expect(room.items).toEqual([{ spot: '4,1', id: 'tv' }]);
  expect(await page.evaluate(() => pet.stars)).toBe(182 + 3);
  // Done decorating: tapping the TV makes it do its thing
  await page.click('text=✅ Done decorating');
  await page.click('.townRoomSpot[data-spot="4,1"]');
  await expect(page.locator('.townPopSay')).toContainText('favorite show');
  await expectNoProblems(page, errors);
});

// Round 3: real chores unlock town jobs
test('finishing a real list unlocks a matching town job that pays stars', async ({ page }) => {
  const errors = await openAppAs(page, 'tiger', { ...PET, kiddyKatTown: { ...AVATAR, built: [{ lot: '0,0', id: 'fire', name: '' }] } });
  // Nothing finished yet: no shifts
  await page.evaluate(() => { openTown(); showTownJobs(); });
  await expect(page.locator('#townBody .arcadeMessage')).toContainText('No shifts yet');
  await page.evaluate(() => leaveTown());
  // The job matches a chore word on the list ("clothes" -> laundromat), once per list per day
  const job = await page.evaluate(() => townJobUnlock('bedtime', ['👕 Lay out clothes', '📖 Read']));
  expect(job[0]).toBe('laundry');
  expect(await page.evaluate(() => townJobUnlock('bedtime', ['👕 Lay out clothes']))).toBeNull();
  // No chore words: the list's own job (After School -> firefighter, +1 for the fire station they built)
  expect(await page.evaluate(() => townJobUnlock('afternoon', ['🎵 Piano'])[0])).toBe('fire');
  await page.click('#townButton');
  await expect(page.locator('.townJobsBtn')).toContainText('2 ready');
  await page.click('.townJobsBtn');
  await page.locator('.townJob', { hasText: 'Firefighter' }).locator('text=▶️ Work').click();
  for (let i = 0; i < 6; i++) await page.click('.townJobTarget');
  await expect(page.locator('.townPopSay')).toContainText('You earned ⭐ 3');
  expect(await page.evaluate(() => pet.stars)).toBe(30 + 3);
  await page.click('text=💪 Yay!');
  await expect(page.locator('.townJobDone')).toContainText('Firefighter');
  await expect(page.locator('.townJob')).toHaveCount(1);
  await expectNoProblems(page, errors);
});

test('the version line can clear an old problem note', async ({ page }) => {
  await openAppAs(page, 'tiger', PET);
  await page.evaluate(() => { localStorage.setItem('kkLastError', '10/29 old bug'); openSettings(true); });
  await expect(page.locator('#appVersionLine')).toContainText('tap to clear');
  await page.click('#appVersionLine');
  await expect(page.locator('#appVersionLine')).toContainText('Cleared');
  expect(await page.evaluate(() => localStorage.getItem('kkLastError'))).toBeNull();
});

// Round 4: visit brothers' and sisters' towns (look only, preset reactions)
const LINKED = { kiddyKatCloudToken: 'test-token' };
const JUJU_TOWN = { nickname: 'Juju', animal: 'kitten', avatar: { hair: 'puffs' }, reacted: false,
  built: [{ lot: '2,7', id: 'shop', name: 'Slime Spot' }, { lot: '0,0', id: 'tree', name: '' }],
  room: { wall: 2, floor: 1, items: [{ spot: '1,1', id: 'tv' }] } };

// Pretend server: answers family_towns and town_react, and remembers what was sent
async function fakeFamily(page, answer) {
  await page.evaluate(a => {
    window.sentToServer = [];
    window.cloudCall = async (name, args) => {
      window.sentToServer.push([name, args]);
      if (name === 'family_towns') return a;
      if (name === 'town_react') return { ok: true };
      return { ok: false, error: 'not in this test' };
    };
  }, answer);
}

test('family visits are off until a grown-up turns them on', async ({ page }) => {
  await openAppAs(page, 'tiger', { ...PET, ...LINKED, kiddyKatTown: AVATAR });
  await fakeFamily(page, { ok: true, on: false, towns: [] });
  await page.click('#townButton');
  await page.click('.townFamilyBtn');
  await expect(page.locator('#townBody .arcadeMessage')).toContainText('Family visits are off');
});

test('a phone not in the online family is told so', async ({ page }) => {
  await openAppAs(page, 'tiger', { ...PET, kiddyKatTown: AVATAR });
  await page.click('#townButton');
  await page.click('.townFamilyBtn');
  await expect(page.locator('#townBody .arcadeMessage')).toContainText('online family');
});

test('visit a sister\'s town and room, look only, and send one reaction', async ({ page }) => {
  const errors = await openAppAs(page, 'tiger', { ...PET, ...LINKED, kiddyKatTown: AVATAR });
  await fakeFamily(page, { ok: true, on: true, towns: [JUJU_TOWN] });
  await page.click('#townButton');
  await page.click('.townFamilyBtn');
  await expect(page.locator('.townFamilyCard')).toContainText("Juju's town");
  await page.click('.townFamilyCard >> text=🚶 Visit');
  await expect(page.locator('#townTitle')).toContainText("Juju's town");
  // Her things are there, and tapping one shows it off; there's no Build button and no empty lots to build on
  await expect(page.locator('.townTile[data-lot="2,7"]')).toContainText('Slime Spot');
  await expect(page.locator('text=🔨 Build')).toHaveCount(0);
  await expect(page.locator('.townTile.lot')).toHaveCount(0);
  await page.click('.townTile[data-lot="2,7"]');
  await expect(page.locator('.townPopSay')).toContainText('Slime Spot');
  await page.click('.townPop >> text=😄 Cool!');
  // Her room, look only
  await page.click("text=🏠 See Juju's room");
  await expect(page.locator('.townRoomSpot[data-spot="1,1"]')).toHaveText('📺');
  await expect(page.locator('.townPaletteItem')).toHaveCount(0);
  // Only the 4 preset reactions, no typing
  await expect(page.locator('.townReaction')).toHaveCount(4);
  await expect(page.locator('#townBody input, #townBody textarea')).toHaveCount(0);
  await page.click('.townReaction >> text=Wow!');
  await expect(page.locator('.townReaction')).toHaveCount(0);
  await expect(page.locator('#townBody')).toContainText('Come back tomorrow');
  const sent = await page.evaluate(() => window.sentToServer.filter(s => s[0] === 'town_react'));
  expect(sent).toEqual([['town_react', { p_token: 'test-token', p_to: 'Juju', p_reaction: 'wow' }]]);
  // Nothing in my own town changed
  expect(await page.evaluate(() => loadTown().built)).toEqual([]);
  await expectNoProblems(page, errors);
});

test('a visit from family shows up in my town', async ({ page }) => {
  const errors = await openAppAs(page, 'kitten', { ...PET, kiddyKatTown: AVATAR,
    kiddyKatParentInbox: [{ type: 'townvisit', from: 'PJ Flash', reaction: 'best', id: 'v-1' }] });
  await page.evaluate(() => { processParentInbox(); document.getElementById('party').style.display = 'none'; });
  expect(await page.evaluate(() => loadTown().visits.map(v => [v.from, v.reaction]))).toEqual([['PJ Flash', 'best']]);
  await page.click('#townButton');
  await expect(page.locator('.townVisitNote')).toContainText('PJ Flash visited your town: 🏆 Best town!');
  await expectNoProblems(page, errors);
});
