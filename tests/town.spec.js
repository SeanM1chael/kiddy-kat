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
  await expect(page.locator('.townTile.place')).toHaveCount(10);
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
  await expect(page.locator('.toy-soccer')).toBeVisible();          // the toy's own game opens
  await page.click('#town .closeGame');
  await page.locator('.townStuffItem[aria-label="Soccer ball"]').click();
  await expect(page.locator('.toy-soccer')).toBeVisible();
  await expectNoProblems(page, errors);
});

// Round 2: 🔨 build your own town with stars you earned
const AVATAR = { avatar: { skin: 1, hair: 'short', hairColor: 0, outfit: 'tee', color: 0, extra: 'none' } };
const RICH = { ...PET, kiddyKatPets: [{ ...PET.kiddyKatPets[0], stars: 200 }] };
const paletteItem = (page, name) => page.locator('.townPaletteItem').filter({ has: page.locator('.townPaletteName', { hasText: new RegExp(`^${name}$`) }) });

test('build mode: pick, place, level up, move, rename and take down', async ({ page }) => {
  const errors = await openAppAs(page, 'tiger', { ...RICH, kiddyKatTown: { ...AVATAR, limit: 500 } });
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

// Nov 4: Juju spent about 100 stars in 5 minutes. Kat Town now has a daily limit (25 ⭐ unless a grown-up changes it)
test('Kat Town spending stops at the daily limit, and a grown-up can change it', async ({ page }) => {
  const errors = await openAppAs(page, 'kitten', { ...RICH, kiddyKatTown: AVATAR });
  page.on('dialog', d => d.accept());
  await page.evaluate(() => { openTown(); showTownStore('closet'); });
  await expect(page.locator('.townSpendLine')).toContainText('25 of 25');
  await page.locator('.townItem', { hasText: 'Cozy hoodie' }).locator('.townBuy').click();     // 15
  await page.click('.townPop >> text=Later');
  await page.locator('.townItem', { hasText: 'Headphones' }).locator('.townBuy').click();      // 12: only 10 left
  await expect(page.locator('#townBody .arcadeMessage')).toContainText('only spend 10 more');
  expect(await page.evaluate(() => pet.stars)).toBe(200 - 15);
  // Building counts too
  await page.evaluate(() => { townBuilding = true; townPick = 'pool'; showTownMap(); });
  await page.click('.townTile[data-lot="0,0"]');
  await expect(page.locator('#townBody .arcadeMessage')).toContainText('only spend 10 more');
  // The dashboard raises the limit through the parent inbox
  await page.evaluate(() => {
    localStorage.setItem('kiddyKatParentInbox', JSON.stringify([{ type: 'townlimit', limit: 50, from: 'Dad', id: 'lim-1' }]));
    processParentInbox(); document.getElementById('party').style.display = 'none';
  });
  expect(await page.evaluate(() => townSpendLeft())).toBe(35);
  await page.evaluate(() => showTownMap());
  await page.click('.townTile[data-lot="0,0"]');
  expect(await page.evaluate(() => loadTown().built.map(b => b.id))).toEqual(['pool']);
  await expectNoProblems(page, errors);
});

// Nov 4: "every item would have some kind of interactive level"
const ALL_TOYS = ['puzzle', 'blocks', 'soccer', 'art', 'plush', 'rccar', 'science', 'books', 'game', 'slime'];
test('every toy opens its own game, and ✖ goes back to My House', async ({ page }) => {
  test.setTimeout(60000);                                  // opens all ten toys; slow on GitHub's iPhone tester
  const errors = await openAppAs(page, 'tiger', { ...PET, kiddyKatTown: { ...AVATAR, owned: ALL_TOYS } });
  await page.click('#townButton');
  for (const id of ALL_TOYS) {
    await page.evaluate(() => showTownHome());
    const name = await page.evaluate(i => TOWN_STORES.toys.items.find(x => x[0] === i)[2], id);
    await page.locator(`.townStuffItem[aria-label="${name}"]`).click();
    await expect(page.locator('.toyArea')).toBeVisible();
    await page.waitForTimeout(300);
    await page.click('#town .closeGame');
    await expect(page.locator('#townTitle')).toContainText('My House');
  }
  await expectNoProblems(page, errors);
});

test('toy games can be won: first win of the day gives +1 ⭐, the second is for fun', async ({ page }) => {
  test.setTimeout(90000);                                  // plays seven games in a row; slow on GitHub's iPhone tester
  const errors = await openAppAs(page, 'tiger', { ...PET, kiddyKatTown: { ...AVATAR, owned: ALL_TOYS } });
  await page.click('#townButton');
  const won = async () => { await expect(page.locator('.townPopSay')).toContainText('🎉', { timeout: 8000 }); await page.click('.townPop >> text=🏠 My House'); };
  // 🧩 Puzzle: put each piece where it belongs
  await page.evaluate(() => openToy('puzzle'));
  for (let pos = 0; pos < 9; pos++) {
    const order = await page.evaluate(() => toyPuzzleState());
    if (order[pos] === pos) continue;
    const from = order.indexOf(pos);
    await page.click(`.toyPiece[data-i="${pos}"]`);
    await page.click(`.toyPiece[data-i="${from}"]`);
  }
  await won();
  expect(await page.evaluate(() => pet.stars)).toBe(31);
  // 🎨 Art: paint every square its number
  await page.evaluate(() => openToy('art'));
  const cells = await page.evaluate(() => toyArtCells());
  for (const color of [...new Set(cells)]) {
    await page.locator('.toyBrush').nth(color).click();
    for (let i = 0; i < cells.length; i++) if (cells[i] === color) await page.click(`.toyPaint[data-i="${i}"]`);
  }
  await won();
  // 🧸 Memory match
  await page.evaluate(() => openToy('plush'));
  const deck = await page.evaluate(() => toyPlushDeck());
  const seen = new Set();
  for (let i = 0; i < deck.length; i++) {
    if (seen.has(i)) continue;
    const j = deck.findIndex((f, k) => k !== i && f === deck[i]);
    seen.add(i); seen.add(j);
    await page.click(`.toyCard[data-i="${i}"]`);
    await page.click(`.toyCard[data-i="${j}"]`);
  }
  await won();
  // 🔬 Science: mix the right two potions, three times
  await page.evaluate(() => openToy('science'));
  for (let r = 0; r < 3; r++) {
    const want = await page.evaluate(() => toyScienceWant());
    for (const c of want) await page.click(`.toyPotion[data-color="${c}"]`);
    await page.waitForTimeout(1000);
  }
  await won();
  // 📚 Books: spell three words
  await page.evaluate(() => openToy('books'));
  for (let w = 0; w < 3; w++) {
    const word = await page.evaluate(() => toyBooksWord());
    for (const ch of word) await page.locator('.toyLetter:not([disabled])', { hasText: ch }).first().click();
    await page.waitForTimeout(900);
  }
  await won();
  // 🧱 Blocks: drop each block right on top
  await page.evaluate(() => openToy('blocks'));
  for (let b = 0; b < 8; b++) await page.evaluate(() => toyBlocksDrop(33));
  await won();
  // 🟢 Slime: repeat the recipe as it grows
  await page.evaluate(() => openToy('slime'));
  for (let round = 1; round <= 5; round++) {
    await page.waitForFunction(n => { const s = toySlimeState(); return s.recipe.length === n && !s.watching; }, round, { timeout: 8000 });
    const { recipe } = await page.evaluate(() => toySlimeState());
    for (const i of recipe) await page.locator('.toySlimeBtn').nth(i).click();
  }
  await won();
  expect(await page.evaluate(() => pet.stars)).toBe(30 + 7);
  // Same toy again today: fun, but no more stars
  await page.evaluate(() => openToy('blocks'));
  for (let b = 0; b < 8; b++) await page.evaluate(() => toyBlocksDrop(33));
  await expect(page.locator('.townPopSay')).toContainText('Playing for fun');
  expect(await page.evaluate(() => pet.stars)).toBe(37);
  await expectNoProblems(page, errors);
});

test('toy games you can lose say try again', async ({ page }) => {
  await openAppAs(page, 'tiger', { ...PET, kiddyKatTown: { ...AVATAR, owned: ALL_TOYS } });
  await page.click('#townButton');
  await page.evaluate(() => openToy('blocks'));
  await page.evaluate(() => toyBlocksDrop(0));
  await page.evaluate(() => toyBlocksDrop(66));
  await expect(page.locator('.townPopSay')).toContainText('Crash');
  await expect(page.locator('.townPop >> text=🔁 Try again')).toBeVisible();
  // The board game's ladders and slides work
  await page.click('.townPop >> text=🏠 My House');
  await page.evaluate(() => openToy('game'));
  expect(await page.evaluate(() => [toyBoardMove(0, 3), toyBoardMove(4, 2), toyBoardMove(13, 6)])).toEqual([8, 2, 15]);
});

// Nov 5: 🏦 Kat Bank — a learning concept behind every action
test('Kat Bank: saving moves stars out of the wallet, and saved stars are safe from shopping', async ({ page }) => {
  const errors = await openAppAs(page, 'tiger', { ...PET, kiddyKatTown: AVATAR });
  await page.click('#townButton');
  await page.click('[data-place=bank]');
  await expect(page.locator('#townTitle')).toContainText('Kat Bank', { timeout: 5000 });
  await page.click('text=➕ Save 10');
  await page.click('text=➕ Save 5');
  expect(await page.evaluate(() => [pet.stars, loadTown().bank.saved])).toEqual([15, 15]);
  await expect(page.locator('.bankSaved')).toHaveText('15 ⭐');
  await page.click('text=➖ Take out 1');
  expect(await page.evaluate(() => [pet.stars, loadTown().bank.saved])).toEqual([16, 14]);
  // Savings goal
  await page.fill('.bankGoalInput', 'Real sneakers');
  await page.fill('.bankGoalStars', '40');
  await page.click('text=🎯 Set');
  await expect(page.locator('.bankGoalName')).toContainText('Real sneakers: 14 of 40');
  await expectNoProblems(page, errors);
});

test('Kat Bank interest: paid on Monday on the stars that stayed saved all week', async ({ page }) => {
  // Last week: 50 saved, and it never dropped below 40
  await openAppAs(page, 'tiger', { ...PET, kiddyKatTown: { ...AVATAR, bank: { saved: 50, low: 40, week: '2020-01-06', history: [] } } });
  await page.click('#townButton');
  await page.click('[data-place=bank]');
  await expect(page.locator('.townPopSay')).toContainText('paid you 4 ⭐', { timeout: 5000 });
  const bank = await page.evaluate(() => loadTown().bank);
  expect(bank.saved).toBe(54);
  expect(bank.low).toBe(54);
  // Opening again the same week doesn't pay twice
  await page.click('.townPop >> text=🤑 Yay!');
  await page.evaluate(() => showTownBank());
  expect(await page.evaluate(() => loadTown().bank.saved)).toBe(54);
  // A deposit this week doesn't count toward next interest until it stays a full week
  await page.click('text=➕ Save 10');
  expect(await page.evaluate(() => loadTown().bank.low)).toBe(54);
  // Taking stars out lowers it
  await page.evaluate(() => bankWithdraw(30));
  expect(await page.evaluate(() => loadTown().bank.low)).toBe(34);
});

test('Kat Bank lessons match the age, and a win gives +1 ⭐ once a day', async ({ page }) => {
  const errors = await openAppAs(page, 'kitten', { ...PET, kiddyKatTown: AVATAR });
  await page.click('#townButton');
  await page.evaluate(() => showTownBank());
  await expect(page.locator('.bankLesson')).toHaveText(['🪙 Coin counter', '🛒 Needs or wants?']);
  // 🪙 Coins: make each amount, biggest coins first
  await page.click('.bankLesson >> text=Coin counter');
  for (let round = 0; round < 3; round++) {
    let left = await page.evaluate(() => bankCoinTarget());
    for (const c of [25, 10, 5, 1]) while (left >= c) { await page.click(`.bankCoin[data-cents="${c}"]`); left -= c; }
    await page.waitForTimeout(800);
  }
  await expect(page.locator('.townPopSay')).toContainText('+1 ⭐');
  await expect(page.locator('.townPopSay')).toContainText('💡');
  expect(await page.evaluate(() => pet.stars)).toBe(31);
  await page.click('.townPop >> text=🏦 Kat Bank');
  // 🛒 Needs or wants: answer all 8
  await page.click('.bankLesson >> text=Needs or wants');
  for (let i = 0; i < 8; i++) {
    const a = await page.evaluate(() => bankRoundAnswer());
    await page.click(`.bankOption[data-i="${a}"]`);
    await page.click('.bankNext');
  }
  await expect(page.locator('.townPopSay')).toContainText('8 of 8');
  expect(await page.evaluate(() => pet.stars)).toBe(32);
  expect(await page.evaluate(() => loadTown().skills.map(s => s.act))).toEqual(['coins', 'needs']);
  await expectNoProblems(page, errors);
});

test('Lele gets the grown-up money lessons: paycheck with taxes, and 50/30/20', async ({ page }) => {
  const errors = await openAppAs(page, 'lion', { ...PET, kiddyKatTown: AVATAR });
  await page.click('#townButton');
  await page.evaluate(() => showTownBank());
  await expect(page.locator('.bankLesson')).toHaveText(['🛒 Needs or wants?', '🏷️ The better deal', '💵 My first paycheck', '📊 Budget 50/30/20']);
  await page.click('.bankLesson >> text=My first paycheck');
  await expect(page.locator('.bankStub')).toContainText('Social Security (6.2%)');
  for (let i = 0; i < 3; i++) {
    // The right answer is the net pay: gross minus 20.65% in taxes
    const [opts, a] = await page.evaluate(() => [[...document.querySelectorAll('.bankOption')].map(b => b.textContent), bankRoundAnswer()]);
    const gross = Number((await page.locator('.bankStubGross').textContent()).replace(/[^0-9.]/g, ''));
    expect(Number(opts[a].replace('$', ''))).toBeCloseTo(gross * (1 - 0.2065), 1);
    await page.click(`.bankOption[data-i="${a}"]`);
    await page.click('.bankNext');
  }
  await expect(page.locator('.townPopSay')).toContainText('pay stub');
  await page.click('.townPop >> text=🏦 Kat Bank');
  await page.click('.bankLesson >> text=Budget');
  for (let i = 0; i < 8; i++) { await page.click(`.bankOption[data-i="${await page.evaluate(() => bankRoundAnswer())}"]`); await page.click('.bankNext'); }
  await expect(page.locator('.townPopSay')).toContainText('50/30/20');
  await expectNoProblems(page, errors);
});

test('the better deal and interest math always have one right answer', async ({ page }) => {
  await openAppAs(page, 'tiger', { ...PET, kiddyKatTown: AVATAR });
  await page.click('#townButton');
  for (let run = 0; run < 5; run++) {
    for (const id of ['deal', 'interest']) {
      await page.evaluate(i => openBankLesson(i), id);
      const ok = await page.evaluate(() => {
        const opts = [...document.querySelectorAll('.bankOption')].map(b => b.textContent);
        return new Set(opts).size === opts.length && bankRoundAnswer() >= 0;
      });
      expect(ok).toBe(true);
    }
  }
});

test('something built where Kat Bank now stands moves to a free lot', async ({ page }) => {
  await openAppAs(page, 'tiger', { ...PET, kiddyKatTown: { ...AVATAR, built: [{ lot: '1,3', id: 'pool', name: '' }] } });
  const lot = await page.evaluate(() => loadTown().built[0].lot);
  expect(lot).not.toBe('1,3');
  await page.click('#townButton');
  await expect(page.locator('[data-place=bank]')).toBeVisible();
  await expect(page.locator(`.townTile[data-lot="${lot}"]`)).toContainText('🏊');
});

// Nov 5: mid-update, an old page (no bank.js) loaded the new town.js, and tapping 🏦 Bank crashed in the store code
test('a half-updated phone (no bank.js yet) does not crash when the Bank is tapped', async ({ page }) => {
  const errors = await openAppAs(page, 'tiger', { ...PET, kiddyKatTown: AVATAR });
  await page.evaluate(() => { window.showTownBank = undefined; });
  await page.click('#townButton');
  await page.evaluate(() => townEnter('bank'));
  await expect(page.locator('#townBody .arcadeMessage')).toContainText('opening soon');
  await page.evaluate(() => showTownStore('nope'));
  await expect(page.locator('#townTitle')).toContainText('Kat Town');
  await expectNoProblems(page, errors);
});

// Nov 5: 🍳 Kat Kitchen — cook real recipes, shop on a budget
async function cookThrough(page) {
  for (let guard = 0; guard < 10; guard++) {
    const stage = await page.evaluate(() => window.kitchenStage && kitchenStage());
    if (await page.locator('.townPop').count()) return;
    if (stage === 'gather') {
      for (const name of await page.evaluate(() => kitchenNeeds())) await page.click(`.kitchenItem[data-name="${name}"]`);
    } else if (stage === 'measure') {
      const sizes = await page.$$eval('.kitchenTool', bs => bs.map(b => Number(b.dataset.size)));
      let left = await page.evaluate(() => kitchenMeasureLeft());
      for (const size of sizes) while (left >= size) { await page.click(`.kitchenTool[data-size="${size}"]`); left -= size; }
    } else if (stage === 'steps') {
      const n = await page.locator('.kitchenStep').count();
      for (let i = 0; i < n; i++) await page.click(`.kitchenStep[data-i="${i}"]`);
    } else if (stage === 'safety' || stage === 'scale') {
      await page.click('.kitchenOption[data-right="1"]');
      await page.click('.bankNext');
      await page.waitForTimeout(100);
      continue;
    } else if (stage === 'cook') {
      await page.evaluate(() => kitchenCookAt(65));
    }
    await page.waitForTimeout(900);
  }
}

test('Kat Kitchen: cook a recipe start to finish, and it goes in the recipe book', async ({ page }) => {
  test.setTimeout(60000);
  const errors = await openAppAs(page, 'tiger', { ...PET, kiddyKatTown: AVATAR });
  await page.click('#townButton');
  await page.click('[data-place=kitchen]');
  await expect(page.locator('#townTitle')).toContainText('Kat Kitchen', { timeout: 5000 });
  await expect(page.locator('.kitchenCook')).toHaveText(['🥞 Pancakes', '🍳 Scrambled eggs']);
  await page.click('.kitchenCook >> text=Pancakes');
  // A wrong ingredient is refused
  await page.click('.kitchenItem[data-name="Ketchup"]');
  await expect(page.locator('.toySay')).toContainText("isn't in this recipe");
  // Measuring too much spills and starts over
  for (const name of await page.evaluate(() => kitchenNeeds())) await page.click(`.kitchenItem[data-name="${name}"]`);
  await page.waitForTimeout(900);
  expect(await page.evaluate(() => kitchenStage())).toBe('measure');
  for (let i = 0; i < 2; i++) await page.click('.kitchenTool[data-size="4"]');
  await expect(page.locator('.toySay')).toContainText('Too much');
  await cookThrough(page);
  await expect(page.locator('.townPopSay')).toContainText('You made Pancakes');
  await expect(page.locator('.townPopSay')).toContainText('+1 ⭐');
  expect(await page.evaluate(() => [pet.stars, loadTown().recipes.pancakes])).toEqual([31, 1]);
  // Recipe book: ask to cook it for real → wish list for the dashboard
  await page.click('.townPop >> text=🍳 Kitchen');
  await page.click('.kitchenReal');
  expect(await page.evaluate(() => loadTown().wishes.map(w => w.name))).toEqual(['Cook Pancakes together for real']);
  await expectNoProblems(page, errors);
});

test('cooking: taking it off too early or too late means try again', async ({ page }) => {
  await openAppAs(page, 'lion', { ...PET, kiddyKatTown: AVATAR });
  await page.click('#townButton');
  await page.evaluate(() => openKitchenCook('tacos'));
  // Jump straight to the cook stage's checks
  await page.evaluate(() => {
    const area = document.querySelector('.kitchenArea');
    area.textContent = '';
    kitchenCookIt(area, document.querySelector('.toySay'), kitchenRecipe('tacos'), '', () => { window.cookedOK = true; });
  });
  await page.evaluate(() => kitchenCookAt(20));
  await expect(page.locator('.toySay')).toContainText('Still pink');
  await page.evaluate(() => kitchenCookAt(95));
  await expect(page.locator('.toySay')).toContainText('burnt');
  await page.evaluate(() => kitchenCookAt(60));
  await page.waitForFunction(() => window.cookedOK === true);
});

test('every recipe can be cooked by its age group', async ({ page }) => {
  test.setTimeout(90000);
  for (const who of ['kitten', 'lion']) {
    await openAppAs(page, who, { ...PET, kiddyKatTown: AVATAR });
    await page.click('#townButton');
    for (const id of await page.evaluate(() => kitchenRecipes().map(r => r.id))) {
      await page.evaluate(i => openKitchenCook(i), id);
      await cookThrough(page);
      await expect(page.locator('.townPopSay')).toContainText('You made');
      await page.click('.townPop >> text=🍳 Kitchen');
    }
  }
});

test('grocery shopping: everything on the list, inside the budget, with change back', async ({ page }) => {
  const errors = await openAppAs(page, 'tiger', { ...PET, kiddyKatTown: AVATAR });
  await page.click('#townButton');
  await page.evaluate(() => openKitchenShop('pancakes'));
  await expect(page.locator('.kitchenBudget')).toContainText('Budget $15.00');
  // Forgot something
  await page.click('.kitchenPrice[data-item="Flour"][data-kind="brand"]');
  await page.click('.kitchenCheckout');
  await expect(page.locator('.toySay')).toContainText('You forgot');
  // All name brand is over budget ($18.76)
  for (const item of ['Milk', 'Eggs', 'Butter']) await page.click(`.kitchenPrice[data-item="${item}"][data-kind="brand"]`);
  expect(await page.evaluate(() => kitchenShopTotal())).toBe(18.76);
  await expect(page.locator('.kitchenBudget')).toHaveClass(/over/);
  await page.click('.kitchenCheckout');
  await expect(page.locator('.toySay')).toContainText('over your budget');
  // Switch to store brands: $13.46, $1.54 change, saved $5.30
  for (const item of ['Flour', 'Milk', 'Eggs', 'Butter']) await page.click(`.kitchenPrice[data-item="${item}"][data-kind="store"]`);
  await page.click('.kitchenCheckout');
  await expect(page.locator('.townPopSay')).toContainText('$13.46');
  await expect(page.locator('.townPopSay')).toContainText('$1.54 back');
  await expect(page.locator('.townPopSay')).toContainText('saved you $5.30');
  expect(await page.evaluate(() => pet.stars)).toBe(31);
  await expectNoProblems(page, errors);
});

test('every shopping trip can be done within budget using store brands', async ({ page }) => {
  for (const who of ['kitten', 'tiger', 'lion']) {
    await openAppAs(page, who, { ...PET, kiddyKatTown: AVATAR });
    const ok = await page.evaluate(() => kitchenRecipes().every(r => r.shop.reduce((s, i) => s + i[3], 0) <= r.budget && r.shop.reduce((s, i) => s + i[2], 0) > r.budget));
    expect(ok).toBe(true);           // store brands fit, but all name brands don't: there's a real choice to make
  }
});

// Nov 5: 🛡️ Safety HQ — real-life and online safety, by age
async function answerAllRight(page) {
  for (let i = 0; i < 12; i++) {
    if (await page.locator('.townPop').count()) return;
    const a = await page.evaluate(() => bankRoundAnswer());
    await page.click(`.bankOption[data-i="${a}"]`);
    await page.click('.bankNext');
  }
}

test('Safety HQ: each age gets its own lessons', async ({ page }) => {
  for (const [who, lessons] of [['kitten', ['🚦 Safe or not safe?', '🤔 What would you do?']],
                                ['tiger', ['🤔 What would you do?', '🎣 Spot the scam', '🔐 Password builder']],
                                ['lion', ['🎣 Spot the scam', '🔐 Password builder', '👣 Privacy & digital footprint']]]) {
    await openAppAs(page, who, { ...PET, kiddyKatTown: AVATAR });
    await page.click('#townButton');
    await page.click('[data-place=safety]');
    await expect(page.locator('.safetyLesson')).toHaveText(lessons, { timeout: 5000 });
  }
});

test('Safety HQ: every quiz lesson can be won, gives +1 ⭐ once, and logs the skill', async ({ page }) => {
  test.setTimeout(90000);
  const errors = await openAppAs(page, 'kitten', { ...PET, kiddyKatTown: AVATAR });
  await page.click('#townButton');
  for (const id of ['safeornot', 'whatif']) {
    await page.evaluate(i => openSafetyLesson(i), id);
    await answerAllRight(page);
    await expect(page.locator('.townPopSay')).toContainText('+1 ⭐');
    await page.click('.townPop >> text=🛡️ Safety HQ');
  }
  expect(await page.evaluate(() => pet.stars)).toBe(32);
  expect(await page.evaluate(() => loadTown().skills.map(s => s.act))).toEqual(['safety-safeornot', 'safety-whatif']);
  await expectNoProblems(page, errors);
  for (const who of ['tiger', 'lion']) {
    const errs = await openAppAs(page, who, { ...PET, kiddyKatTown: AVATAR });
    await page.click('#townButton');
    for (const id of (who === 'tiger' ? ['whatif', 'scam'] : ['scam', 'footprint'])) {
      await page.evaluate(i => openSafetyLesson(i), id);
      await answerAllRight(page);
      await expect(page.locator('.townPopSay')).toContainText('🎉');
      await page.click('.townPop >> text=🛡️ Safety HQ');
    }
    await expectNoProblems(page, errs);
  }
});

test('Spot the scam: a wrong answer shows the red flag, and too many wrong means try again', async ({ page }) => {
  await openAppAs(page, 'tiger', { ...PET, kiddyKatTown: AVATAR });
  await page.click('#townButton');
  await page.evaluate(() => openSafetyLesson('scam'));
  await expect(page.locator('.safetyPhone')).toBeVisible();
  for (let i = 0; i < 6; i++) {
    const a = await page.evaluate(() => bankRoundAnswer());
    await page.click(`.bankOption[data-i="${1 - a}"]`);                // always wrong
    await expect(page.locator('.bankWhy')).toContainText('❌');
    await page.click('.bankNext');
  }
  await expect(page.locator('.townPopSay')).toContainText('You need 5 to win');
  expect(await page.evaluate(() => pet.stars)).toBe(30);
});

test('Password builder: personal info is weak, a long random passphrase wins', async ({ page }) => {
  const errors = await openAppAs(page, 'tiger', { ...PET, kiddyKatTown: AVATAR });
  await page.click('#townButton');
  await page.evaluate(() => openSafetyLesson('password'));
  const tiles = await page.evaluate(() => safetyTiles());
  const tap = text => page.click(`.safetyTile[data-text="${text}"]`);
  // The kid's own name (from the profile) is a trap
  await tap('PJ');
  await expect(page.locator('.safetyStrength')).toContainText('Weak');
  await expect(page.locator('.bankWhy')).toContainText('Never use your name');
  await page.click('text=⌫ Undo');
  // Random words + a number + a symbol = very strong
  const words = tiles.filter(t => !t.trap && /^[A-Z][a-z]+$/.test(t.text)).map(t => t.text);
  await tap(words[0]); await tap(words[1]);
  await expect(page.locator('.safetyStrength')).not.toContainText('Very strong');
  await page.click('.safetyLock');
  await expect(page.locator('.toySay')).toContainText('Not yet');
  await tap(words[2]); await tap('42'); await tap('!');
  await expect(page.locator('.safetyStrength')).toContainText('Very strong');
  await page.click('.safetyLock');
  await expect(page.locator('.townPopSay')).toContainText('millions of years');
  await expectNoProblems(page, errors);
});

// Nov 5: 🏛️ Town Hall — family vote, budget, civics
function ballot(extra) {
  return { ok: true, week: '2026-11-02', options: ['library', 'dogpark', 'skatepark'], counts: {}, mine: null, voted: [], kids: 2, final: false, winner: null, winners: [], ...extra };
}
async function fakeHall(page, first, afterVote) {
  await page.evaluate(([a, b]) => {
    window.sentToServer = [];
    window.cloudCall = async (name, args) => {
      window.sentToServer.push([name, args]);
      if (name === 'town_ballot') return window.hallAnswer || a;
      if (name === 'town_vote') { window.hallAnswer = b; return b; }
      return { ok: false, error: 'not in this test' };
    };
  }, [first, afterVote]);
}

test('Town Hall: vote with a reason, see the count, then the winner gets built in my town', async ({ page }) => {
  const errors = await openAppAs(page, 'tiger', { ...PET, ...LINKED, kiddyKatTown: AVATAR });
  await fakeHall(page, ballot(), ballot({ mine: 'dogpark', counts: { dogpark: 1 }, voted: ['PJ Flash'] }));
  await page.click('#townButton');
  await page.click('[data-place=hall]');
  await expect(page.locator('.hallOption')).toHaveCount(3, { timeout: 5000 });
  await page.locator('.hallOption[data-project="dogpark"] .hallVoteBtn').click();
  await expect(page.locator('.hallReason')).toHaveCount(5);                 // preset reasons only, no typing
  await page.click('.hallReason[data-reason="healthy"]');
  expect(await page.evaluate(() => window.sentToServer.find(s => s[0] === 'town_vote')[1]))
    .toEqual({ p_token: 'test-token', p_choice: 'dogpark', p_reason: 'healthy' });
  await expect(page.locator('.hallOption[data-project="dogpark"]')).toHaveClass(/mine/);
  await expect(page.locator('.hallVoted')).toContainText('1 of 2 kids voted: PJ Flash');
  // Juju votes too (on her phone): the result is final, and the winner is built here
  await page.evaluate(() => { window.hallAnswer = { ok: true, week: '2026-11-02', options: ['library', 'dogpark', 'skatepark'], counts: { dogpark: 2 },
    mine: 'dogpark', voted: ['PJ Flash', 'Juju'], kids: 2, final: true, winner: 'dogpark', winners: [{ week: '2026-11-02', choice: 'dogpark' }] }; });
  await page.evaluate(() => showTownHall());
  await expect(page.locator('.hallResult')).toContainText('Dog park wins');
  await expect(page.locator('.hallVoteBtn')).toHaveCount(0);
  const built = await page.evaluate(() => loadTown().built);
  expect(built.map(b => [b.id, b.community])).toEqual([['c-dogpark', true]]);
  // On the map it shows up, does its thing, and can't be moved or taken down
  await page.evaluate(() => showTownMap());
  const lot = built[0].lot;
  await expect(page.locator(`.townTile[data-lot="${lot}"]`)).toContainText('🦮');
  await page.evaluate(() => { townBuilding = true; showTownMap(); });
  await page.click(`.townTile[data-lot="${lot}"]`);
  await expect(page.locator('.townPopSay')).toContainText('belongs to everyone');
  await expect(page.locator('.townPop >> text=Take down')).toHaveCount(0);
  // Opening the hall again doesn't build a second one
  await page.evaluate(() => showTownHall());
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => loadTown().built.length)).toBe(1);
  await expectNoProblems(page, errors);
});

test('Town Hall: a tie is explained, and a phone not online can still do the lessons', async ({ page }) => {
  await openAppAs(page, 'tiger', { ...PET, ...LINKED, kiddyKatTown: AVATAR });
  await fakeHall(page, ballot({ counts: { library: 1, skatepark: 1 }, mine: 'skatepark', voted: ['PJ Flash', 'Juju'], final: true, winner: 'library',
                                winners: [{ week: '2026-11-02', choice: 'library' }] }), null);
  await page.click('#townButton');
  await page.evaluate(() => showTownHall());
  await expect(page.locator('#townBody')).toContainText('compromise');
  // Not in the online family
  await openAppAs(page, 'tiger', { ...PET, kiddyKatTown: AVATAR });
  await page.click('#townButton');
  await page.evaluate(() => showTownHall());
  await expect(page.locator('.hallVote')).toContainText('online family');
  await expect(page.locator('.hallLesson')).toHaveCount(2);
});

test('a family-vote winner shows up when Kat Town opens, even without visiting Town Hall', async ({ page }) => {
  await openAppAs(page, 'kitten', { ...PET, ...LINKED, kiddyKatTown: AVATAR });
  await fakeHall(page, ballot({ winners: [{ week: '2026-10-26', choice: 'zoo' }] }), null);
  await page.click('#townButton');
  await expect(page.locator('#townBody .arcadeMessage')).toContainText('Petting zoo was just built');
  expect(await page.evaluate(() => loadTown().built.map(b => b.id))).toEqual(['c-zoo']);
});

test('Mayor for a day: unbalanced or short-changed budgets fail, a good one wins', async ({ page }) => {
  const errors = await openAppAs(page, 'lion', { ...PET, kiddyKatTown: AVATAR });
  await page.click('#townButton');
  await page.evaluate(() => openHallLesson('mayor'));
  await expect(page.locator('.hallLeft')).toContainText('$400K');        // 6 × $100K planned of $1M
  await page.click('.hallPass');
  await expect(page.locator('.toySay')).toContainText('still have');
  // Balanced, but parks get nothing
  await page.evaluate(() => { hallSet('safety', 30); hallSet('schools', 30); hallSet('roads', 20); hallSet('trash', 10); hallSet('parks', 0); hallSet('library', 10); });
  await expect(page.locator('.hallLeft')).toContainText('Balanced');
  await page.click('.hallPass');
  await expect(page.locator('.townPopSay')).toContainText('playground broke');
  await page.click('.townPop >> text=🔁 Try again');
  await page.evaluate(() => { hallSet('safety', 30); hallSet('schools', 25); hallSet('roads', 15); hallSet('trash', 10); hallSet('parks', 15); hallSet('library', 5); });
  // The + and − buttons work too
  await page.locator('.hallDept[data-dept="parks"] .hallMinus').click();
  await page.locator('.hallDept[data-dept="safety"] .hallPlus').click();
  expect(await page.evaluate(() => hallPlan())).toMatchObject({ parks: 10, safety: 35 });
  await page.click('.hallPass');
  await expect(page.locator('.townPopSay')).toContainText('Great year, Mayor');
  await expect(page.locator('.townPopSay')).toContainText('+1 ⭐');
  await expectNoProblems(page, errors);
});

test('Town Hall lessons can be won at every age', async ({ page }) => {
  test.setTimeout(60000);
  for (const [who, id] of [['kitten', 'helpers'], ['tiger', 'taxes'], ['lion', 'taxes']]) {
    const errors = await openAppAs(page, who, { ...PET, kiddyKatTown: AVATAR });
    await page.click('#townButton');
    await page.evaluate(i => openHallLesson(i), id);
    await answerAllRight(page);
    await expect(page.locator('.townPopSay')).toContainText('6 of 6');
    await expectNoProblems(page, errors);
  }
});
