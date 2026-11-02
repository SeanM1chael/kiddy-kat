// Shared helpers for the tests
const { expect } = require('@playwright/test');

// Birth years that make each animal (the app works out the animal from the age)
const YEAR = new Date().getFullYear();
const PEOPLE = {
  kitten: { name: 'Juju', birthYear: YEAR - 7 },
  tiger: { name: 'PJ Flash', birthYear: YEAR - 12 },
  lion: { name: 'Lele', birthYear: YEAR - 16 },
  eagle: { name: 'Dad', birthYear: YEAR - 46 }
};

// Opens the app as a person, with no internet except the app itself.
// extra: more things to put in the phone's storage first, like { kiddyKatStreak: {...} }
async function openAppAs(page, who, extra = {}) {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // Block the real server, weather and anything else outside the app, so tests never touch real family data
  await page.route(url => !url.href.startsWith('http://localhost:8080'), route => route.abort());
  await page.goto('/index.html');
  const person = PEOPLE[who];
  await page.evaluate(([p, more]) => {
    localStorage.clear();
    localStorage.setItem('kiddyKatProfile', JSON.stringify({ name: p.name, birthYear: p.birthYear, nicknames: [p.name] }));
    localStorage.setItem('kiddyKatTourDone', 'test');
    for (const [k, v] of Object.entries(more)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  }, [person, extra]);
  await page.reload();
  await page.waitForTimeout(800);
  return errors;
}

// A pet with some stars, so star rewards have somewhere to go
const PET = { kiddyKatPets: [{ type: 'puppy', name: 'Jones', points: 8, cared: {}, treats: { date: '', count: 0 }, stars: 30, owned: [], wearing: null, poops: 0 }] };

// The app's own problem reporter (index.html) shows a red bar when anything breaks
async function expectNoProblems(page, errors) {
  await expect(page.locator('#kkError')).toHaveCount(0);
  expect(errors, 'JavaScript errors on the page').toEqual([]);
}

module.exports = { PEOPLE, PET, openAppAs, expectNoProblems };
