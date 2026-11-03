// =====================================================================
// features.spec.js — Arcade, earn-back goals, bills
// =====================================================================
const { test, expect } = require('@playwright/test');
const { openAppAs, expectNoProblems, PET } = require('./helpers');

test('Arcade: Code Quest level 1 can be solved and gives stars', async ({ page }) => {
  const errors = await openAppAs(page, 'tiger', PET);
  const before = await page.evaluate(() => pet.stars);
  await page.click('text=🕹️ Arcade');
  await page.click('text=Code Quest');
  await page.click('.codeLevel >> nth=0');
  await page.click('.codeArrow >> nth=2');                                    // ➡️
  for (let i = 0; i < 3; i++) await page.click('.codeBlock');                  // ➡️×4
  await page.click('text=▶️ Run');
  await expect(page.locator('#arcadeBody')).toContainText('Level 1 done', { timeout: 5000 });
  expect(await page.evaluate(() => pet.stars)).toBe(before + 3);
  await expectNoProblems(page, errors);
});

test('Arcade: every Code Quest maze can be finished', async ({ page }) => {
  await openAppAs(page, 'tiger', PET);
  const pars = await page.evaluate(() => CODE_LEVELS.map(rows => codePar(codeParse(rows))));
  for (const [i, par] of pars.entries()) expect(par, `level ${i + 1} can't be solved`).toBeLessThan(30);
});

test('Arcade: Daily Word can be solved', async ({ page }) => {
  const errors = await openAppAs(page, 'lion', PET);
  await page.click('text=🕹️ Arcade');
  await page.click('text=Daily Word');
  const word = await page.evaluate(() => todaysWord().word);
  for (const ch of word) await page.click(`.wordKey:text-is("${ch}")`);
  await page.click('.wordKey:text-is("Enter")');
  await expect(page.locator('#party')).toBeVisible();
  await expectNoProblems(page, errors);
});

test('Arcade: stars stop at the daily limit', async ({ page }) => {
  await openAppAs(page, 'tiger', PET);
  const given = await page.evaluate(() => [arcadeStars(6), arcadeStars(6), arcadeStars(6)]);
  expect(given).toEqual([6, 4, 0]);
});

test('Earn-back goal: earned stars count, gifts do not', async ({ page }) => {
  const errors = await openAppAs(page, 'tiger', {
    ...PET, kiddyKatParentInbox: [{ type: 'earnback', goal: 'Roblox for 1 hour', stars: 10, from: 'Dad', id: 'test-goal' }]
  });
  await page.evaluate(() => { processParentInbox(); document.getElementById('party').style.display = 'none'; });
  await expect(page.locator('#earnbackCard')).toContainText('0 of 10');
  await page.evaluate(() => addStars(4));
  await page.evaluate(() => { pet.stars += 50; savePet(); });                  // a gift: shouldn't count
  await expect(page.locator('#earnbackCard')).toContainText('4 of 10');
  await page.evaluate(() => addStars(6));
  await expect(page.locator('#earnbackCard')).toContainText('Goal reached');
  expect(await page.evaluate(() => rewardRequests.some(r => r.earnback && r.status === 'waiting'))).toBe(true);
  await expectNoProblems(page, errors);
});

test('Bills (grown-ups): amounts never go online', async ({ page }) => {
  await openAppAs(page, 'eagle', {
    kiddyKatBills: { list: [{ id: 'b1', name: 'Rent', amount: 1800, every: 'month', day: 1, remind: 1, start: '2026-01-01' }], paid: {} }
  });
  const sent = await page.evaluate(() => cloudCollect());
  expect(sent.kiddyKatBills, 'the bill list stays on the phone').toBeUndefined();
  expect(sent._bills).toContain('Rent');
  expect(sent._bills).not.toContain('1800');
});

// Nov 2: the next question came too fast to read the explanation
test('Practice: after an answer, the explanation stays until Next is tapped', async ({ page }) => {
  const errors = await openAppAs(page, 'eagle', PET);
  await page.click('text=🎮 Practice');
  await page.click('text=🤝 Leadership');
  const question = await page.locator('#gameQuestion').innerText();
  await page.locator('#gameChoices .choice').first().click();
  await page.waitForTimeout(4500);                                        // longer than the old auto-advance
  await expect(page.locator('#gameQuestion')).toHaveText(question);
  await expect(page.locator('#gameFeedback')).toContainText(/Yes!|Not quite/);
  await page.click('.answerNext');
  await expect(page.locator('#gameQuestion')).not.toHaveText(question);
  await expectNoProblems(page, errors);
});
