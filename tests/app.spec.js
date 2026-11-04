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
