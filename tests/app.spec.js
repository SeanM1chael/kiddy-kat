// =====================================================================
// app.spec.js — the kids' app (index.html) for each animal
// =====================================================================
const { test, expect } = require('@playwright/test');
const { openAppAs, expectNoProblems, PET } = require('./helpers');

for (const who of ['kitten', 'tiger', 'lion', 'eagle']) {
  test(`${who}: the main screen loads with no problems`, async ({ page }) => {
    const errors = await openAppAs(page, who, PET);
    await expect(page.locator('#hello')).toContainText(who === 'eagle' ? 'eagle' : who);
    await page.click('.tabs >> text=Morning');
    await expect(page.locator('#morning .task').first()).toBeVisible();      // the morning list
    await expect(page.locator('#streakCard')).toBeVisible();                 // 🔥 streak
    await expect(page.locator('#leagueCard')).toBeVisible();                 // 🏆 points
    if (who === 'eagle') {
      await expect(page.locator('#careerCard')).toBeVisible();
      await expect(page.locator('#billsCard')).toBeVisible();
      await expect(page.locator('#suppliesCard')).toBeHidden();
      await expect(page.locator('#today')).toContainText(/Work day|Weekend/);
    } else {
      await expect(page.locator('#suppliesCard')).toBeVisible();
      await expect(page.locator('#careerCard')).toBeHidden();
      await expect(page.locator('#billsCard')).toBeHidden();
    }
    await expectNoProblems(page, errors);
  });
}

// Bug from Oct 29: the challenge streak and the morning streak shared one storage name,
// and the morning streak card broke on every phone that had won a challenge.
test('streak card still works when a challenge win streak is saved', async ({ page }) => {
  const errors = await openAppAs(page, 'tiger', { ...PET, kiddyKatStreak: { last: new Date().toDateString(), count: 2 } });
  await expect(page.locator('#streakCard')).toBeVisible();
  await page.evaluate(() => markStreakDay());
  await page.evaluate(() => showStreakCard());
  await expect(page.locator('#streakCard')).toContainText('Done today');
  expect(await page.evaluate(() => winStreak())).toBe(2);                      // the challenge streak is untouched
  await expectNoProblems(page, errors);
});

test('finishing the morning list checks off tasks and earns stars', async ({ page }) => {
  const errors = await openAppAs(page, 'tiger', PET);
  const before = await page.evaluate(() => pet.stars);
  await page.click('.tabs >> text=Morning');
  const tasks = page.locator('#morning .task');
  const n = await tasks.count();
  for (let i = 0; i < n; i++) await tasks.nth(i).click();
  await expect(page.locator('#party')).toBeVisible();                          // the celebration
  expect(await page.evaluate(() => pet.stars)).toBeGreaterThan(before);
  await expectNoProblems(page, errors);
});

test('a broken card shows the problem bar but the rest still loads', async ({ page }) => {
  // Pretend streak.js breaks on this phone
  await page.route('**/streak.js*', route => route.fulfill({ body: 'function showStreakCard() { throw new Error("Test") }' }));
  await openAppAs(page, 'tiger', PET);
  await expect(page.locator('#kkError')).toContainText('showStreakCard');
  await expect(page.locator('#suppliesCard')).toBeVisible();
  await page.click('.tabs >> text=Morning');
  await expect(page.locator('#morning .task').first()).toBeVisible();
});

// Nov 4: a task list sent from the dashboard replaces the list and can be locked
test('a task list from the dashboard replaces the list, and a lock stops kid edits', async ({ page }) => {
  const errors = await openAppAs(page, 'lion', {
    ...PET, kiddyKatParentInbox: [{ type: 'tasks', list: 'afternoon', items: ['📱 Turn in your phone to Dad', '📚 Do your homework'], lock: true, from: 'Dad', id: 'list-1' }]
  });
  await page.evaluate(() => { processParentInbox(); document.getElementById('party').style.display = 'none'; });
  expect(await page.evaluate(() => tasks.afternoon)).toEqual(['📱 Turn in your phone to Dad', '📚 Do your homework']);
  await page.click('#myTasksButton');                                  // lions can edit their own lists...
  expect(await page.locator('#editAfternoon').evaluate(e => e.readOnly)).toBe(true);   // ...but not a locked one
  expect(await page.locator('#editMorning').evaluate(e => e.readOnly)).toBe(false);
  await page.evaluate(() => { document.getElementById('editAfternoon').value = 'Nothing!'; saveTasks(); });
  expect(await page.evaluate(() => tasks.afternoon)).toEqual(['📱 Turn in your phone to Dad', '📚 Do your homework']);
  await expectNoProblems(page, errors);
});

// Nov 5: phones kept showing the old version for up to 10 minutes after a release
test('a newer version on GitHub shows the update banner; the same version does not', async ({ page }) => {
  const errors = await openAppAs(page, 'tiger', PET);
  await page.waitForTimeout(1800);                                    // the check runs 1.5 seconds after opening
  await expect(page.locator('#updateBanner')).toHaveCount(0);         // the test server has this same version
  // Pretend GitHub has a newer version
  await page.evaluate(() => {
    const real = window.fetch;
    window.fetch = (url, opts) => String(url).startsWith('index.html?check=')
      ? Promise.resolve(new Response("const APP_VERSION = '2099-01-01a';"))
      : real(url, opts);
  });
  expect(await page.evaluate(() => checkForUpdate(true))).toBe('2099-01-01a');
  await expect(page.locator('#updateBanner')).toContainText('new version');
  // An older or equal version never shows it
  await page.evaluate(() => { document.getElementById('updateBanner').remove(); window.fetch = () => Promise.resolve(new Response("const APP_VERSION = '2020-01-01a';")); });
  expect(await page.evaluate(() => checkForUpdate(true))).toBe(null);
  await expect(page.locator('#updateBanner')).toHaveCount(0);
  // Offline never breaks anything
  await page.evaluate(() => { window.fetch = () => Promise.reject(new Error('offline')); });
  expect(await page.evaluate(() => checkForUpdate(true))).toBe(null);
  await expectNoProblems(page, errors);
});

// Nov 5 privacy review: the settings PIN was copied online as typed, and the birth year went online too
test('privacy: the grown-up PIN, real name and birth year never go online', async ({ page }) => {
  const errors = await openAppAs(page, 'tiger', { ...PET, kiddyKatParentPin: '4821' });
  const sent = await page.evaluate(() => cloudCollect());
  expect(sent.kiddyKatParentPin).toBeUndefined();
  expect(JSON.stringify(sent)).not.toContain('4821');
  const profile = JSON.parse(sent.kiddyKatProfile);
  expect(profile.name).toBeUndefined();
  expect(profile.birthYear).toBeUndefined();
  expect(profile.ageGroup).toBe('tiger');
  await expectNoProblems(page, errors);
});

test('loading from online keeps this phone\'s PIN and birth year; a new phone gets an age from the group', async ({ page }) => {
  const errors = await openAppAs(page, 'tiger', { ...PET, kiddyKatParentPin: '4821' });
  const year = new Date().getFullYear();
  const mine = await page.evaluate(() => JSON.parse(localStorage.getItem('kiddyKatProfile')).birthYear);
  await page.evaluate(() => cloudApply({ kiddyKatProfile: JSON.stringify({ ageGroup: 'tiger', nicknames: ['PJ Flash'] }) }));
  expect(await page.evaluate(() => localStorage.getItem('kiddyKatParentPin'))).toBe('4821');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('kiddyKatProfile')).birthYear)).toBe(mine);
  // A brand-new phone (no profile yet)
  await page.evaluate(() => { localStorage.removeItem('kiddyKatProfile'); cloudApply({ kiddyKatProfile: JSON.stringify({ ageGroup: 'lion', nicknames: ['Lele'] }) }); });
  const fresh = await page.evaluate(() => JSON.parse(localStorage.getItem('kiddyKatProfile')));
  expect(fresh.birthYear).toBe(year - 16);
  expect(await page.evaluate(b => animalFor(new Date().getFullYear() - b).theme, fresh.birthYear)).toBe('lion');
  await expectNoProblems(page, errors);
});

// Nov 9: list first, then the pet and one big Kat Town button (home.js)
test('kids home: the list for right now opens, the list sits above the pet, extra buttons live in town', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 10, 16, 30));        // 4:30 PM: after school
  const errors = await openAppAs(page, 'kitten', PET);
  await expect(page.locator('#afternoon')).toBeVisible();
  await expect(page.locator('#morning')).toBeHidden();
  await expect(page.locator('.tabs button.active')).toHaveAttribute('data-list', 'afternoon');
  // The list comes before the pet card
  const listY = (await page.locator('#afternoon').boundingBox()).y;
  const petY = (await page.locator('#petCard').boundingBox()).y;
  expect(listY).toBeLessThan(petY);
  // Kat Town is up top, above the list, so it shows without scrolling
  const townBox = await page.locator('#townButton').boundingBox();
  expect(townBox.y).toBeLessThan(listY);
  expect(townBox.y + townBox.height).toBeLessThan(page.viewportSize().height);
  // One big Kat Town button; the rest are hidden
  await expect(page.locator('#townButton')).toBeVisible();
  for (const sel of ['#shopButton', '#challengeButton', '#albumButton', '#walletButton', 'button[onclick="openPractice()"]', 'button[onclick="openArcade()"]', 'button[onclick="openRewards()"]']) {
    await expect(page.locator(sel)).toBeHidden();
  }
  // Stars and streak up top
  await expect(page.locator('#kidChips')).toContainText('⭐ 30');
  await expect(page.locator('#kidChips')).toContainText('🔥');
  // Tasks have tap circles and check off
  await page.locator('#afternoon .task').first().click();
  await expect(page.locator('#afternoon .task').first()).toHaveClass(/done/);
  await expectNoProblems(page, errors);
});

test('grown-ups home keeps all the buttons; bedtime list opens at night', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 10, 20, 15));        // 8:15 PM
  const errors = await openAppAs(page, 'eagle', PET);
  await expect(page.locator('#bedtime')).toBeVisible();
  await expect(page.locator('#kidChips')).toHaveCount(0);
  await expect(page.locator('button[onclick="openPractice()"]')).toBeVisible();
  await expectNoProblems(page, errors);
});

test('the morning list opens before school', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 10, 7, 0));
  await openAppAs(page, 'tiger', PET);
  await expect(page.locator('#morning')).toBeVisible();
  expect(await page.evaluate(() => [listForNow(new Date(2026, 0, 1, 10, 59)), listForNow(new Date(2026, 0, 1, 11, 0)), listForNow(new Date(2026, 0, 1, 18, 0))]))
    .toEqual(['morning', 'afternoon', 'bedtime']);
});
