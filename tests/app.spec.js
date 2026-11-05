// =====================================================================
// app.spec.js — the kids' app (index.html) for each animal
// =====================================================================
const { test, expect } = require('@playwright/test');
const { openAppAs, expectNoProblems, PET } = require('./helpers');

for (const who of ['kitten', 'tiger', 'lion', 'eagle']) {
  test(`${who}: the main screen loads with no problems`, async ({ page }) => {
    const errors = await openAppAs(page, who, PET);
    await expect(page.locator('#hello')).toContainText(who === 'eagle' ? 'eagle' : who);
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
