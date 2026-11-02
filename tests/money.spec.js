// =====================================================================
// money.spec.js — 💰 money goals and the pay-early game (grown-ups)
// =====================================================================
const { test, expect } = require('@playwright/test');
const { openAppAs, expectNoProblems, PET } = require('./helpers');

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

test('savings goal: milestones celebrate, 100% gives a trophy and stars', async ({ page }) => {
  const errors = await openAppAs(page, 'eagle', {
    ...PET, kiddyKatMoneyGoals: { goals: [{ id: 'g1', kind: 'save', name: 'Vacation', target: 1000, done: 0, log: [], hit: [] }] }
  });
  const before = await page.evaluate(() => pet.stars);
  await page.evaluate(() => moneyLog('g1', 300));                   // crosses 25%
  await expect(page.locator('#party')).toBeVisible();
  await expect(page.locator('#partyMessage')).toContainText('25%');
  await page.evaluate(() => { document.getElementById('party').style.display = 'none'; moneyLog('g1', 700); });
  await expect(page.locator('#partyMessage')).toContainText('GOAL REACHED');
  const m = await page.evaluate(() => loadMoney());
  expect(m.goals[0].hit).toEqual([25, 50, 75, 100]);
  expect(m.trophies.length).toBe(1);
  expect(await page.evaluate(() => pet.stars)).toBe(before + 1 + 5);
  await expectNoProblems(page, errors);
});

test('debt payoff: logging payments down to $0 celebrates paid off', async ({ page }) => {
  await openAppAs(page, 'eagle', {
    ...PET, kiddyKatMoneyGoals: { goals: [{ id: 'd1', kind: 'debt', name: 'Visa card', target: 500, done: 0, log: [], hit: [] }] }
  });
  await page.evaluate(() => moneyLog('d1', 500));
  await expect(page.locator('#partyMessage')).toContainText('PAID OFF');
  await page.evaluate(() => moneyUndo('d1'));                       // undo works and clears 100%
  expect(await page.evaluate(() => moneyPct(loadMoney().goals[0]))).toBe(0);
});

test('pay-early game: early payment earns stars and counts', async ({ page }) => {
  const errors = await openAppAs(page, 'eagle', {
    ...PET, kiddyKatBills: { list: [{ id: 'b1', name: 'Rent', amount: 1800, every: 'month', day: Number(plusDays(3).slice(8)), remind: 1, start: today() }], paid: {} }
  });
  const before = await page.evaluate(() => pet.stars);
  const msg = await page.evaluate(due => { const b = loadBills().list[0]; return moneyBillPaid(b, due, true); }, plusDays(3));
  expect(msg).toContain('3 days early');
  expect(await page.evaluate(() => pet.stars)).toBe(before + 2);
  expect(await page.evaluate(() => moneyStats().earlyTotal)).toBe(1);
  // Un-paying removes it again
  await page.evaluate(due => { const b = loadBills().list[0]; moneyBillPaid(b, due, false); }, plusDays(3));
  expect(await page.evaluate(() => moneyStats().earlyTotal)).toBe(0);
  await expectNoProblems(page, errors);
});

test('money: dollar amounts never go online; the card shows no dollars', async ({ page }) => {
  await openAppAs(page, 'eagle', {
    kiddyKatMoneyGoals: { goals: [{ id: 'g1', kind: 'save', name: 'Vacation', target: 2500, done: 1250, log: [], hit: [25, 50] }] }
  });
  const sent = await page.evaluate(() => cloudCollect());
  expect(sent.kiddyKatMoneyGoals).toBeUndefined();
  await expect(page.locator('#moneyCard')).toContainText('Vacation: 50%');
  await expect(page.locator('#moneyCard')).not.toContainText('$');
});

test('bills: the not-paid alert time goes online with autopay, but no amounts', async ({ page }) => {
  await openAppAs(page, 'eagle', {
    kiddyKatBills: { lateAt: '17:00', list: [{ id: 'b1', name: 'Car', amount: 450, every: 'month', day: 1, remind: 0, autopay: true, start: '2026-01-01' }], paid: {} }
  });
  const bills = JSON.parse(await page.evaluate(() => cloudCollect()._bills));
  expect(bills[0]).toMatchObject({ name: 'Car', late: '17:00', autopay: true });
  expect(JSON.stringify(bills)).not.toContain('450');
});

test('kids never see money or bills cards', async ({ page }) => {
  await openAppAs(page, 'lion', PET);
  await expect(page.locator('#moneyCard')).toBeHidden();
  await expect(page.locator('#billsCard')).toBeHidden();
});
