// =====================================================================
// rewardshop.js — 🎟️ Reward Shop: real-life rewards inside Kat Town
// Uses the same rewards and approvals as rewards.js (a grown-up says yes
// with a PIN or from the dashboard; "not this time" gives the stars back).
// What's new here: pay with wallet OR Kat Bank savings, "save for this"
// sets the Kat Bank goal, and every reward shows what it costs in real effort.
// Real rewards don't count toward the daily Kat Town spending limit.
// =====================================================================

// Rough stars a kid earns on a good day (all lists + a few games): see rewards.js
const SHOP_DAILY_STARS = { kitten: 15, tiger: 20, lion: 20 };

function shopAge() { return typeof animal !== 'undefined' && animal ? animal.theme : 'tiger'; }
function shopSaved() { return typeof bankOf === 'function' ? bankOf(loadTown()).saved : 0; }

// "About 4 days of finishing your lists, or 12 🍔 in Kat Town"
function shopEffort(price) {
  const days = Math.max(1, Math.round(price / (SHOP_DAILY_STARS[shopAge()] || 20)));
  const burger = (TOWN_STORES.burger && TOWN_STORES.burger.items.find(i => i[0] === 'burger')) || ['burger', '🍔', 'Burger', 5];
  const burgers = Math.floor(price / burger[3]);
  return `About ${days} day${days === 1 ? '' : 's'} of finishing your lists` + (burgers > 1 ? `, or ${burgers} ${burger[1]} in Kat Town` : '');
}

function showTownRewardShop(message) {
  townView = 'rewards';
  const box = townBody('🎟️ Reward Shop');
  townAdd(box, 'button', '← Town', 'arcadeBack').addEventListener('click', () => showTownMap());
  if (message) townAdd(box, 'div', message, 'arcadeMessage');
  townAdd(box, 'div', `Real rewards from ${parentName()}! Pay with your wallet or your Kat Bank savings. ${parentName()} says yes, and it happens for real.`, 'arcadeHint');

  const wallet = townStars(), saved = shopSaved();
  const accounts = townAdd(box, 'div', undefined, 'bankAccounts');
  const w = townAdd(accounts, 'div', undefined, 'bankAccount');
  townAdd(w, 'div', '👛 Wallet', 'bankLabel');
  townAdd(w, 'div', `${wallet} ⭐`, 'bankAmount');
  const s = townAdd(accounts, 'div', undefined, 'bankAccount saving');
  townAdd(s, 'div', '🐷 Savings', 'bankLabel');
  townAdd(s, 'div', `${saved} ⭐`, 'bankAmount');

  // Waiting for a grown-up
  rewardRequests.filter(r => r.status === 'waiting').forEach(r => {
    townAdd(box, 'div', `⏳ ${r.emoji} ${r.name}: waiting for ${parentName()} to say yes.`, 'waitingCard shopWaiting');
  });

  const goalName = localStorage.getItem('kiddyKatGoal');
  const list = townAdd(box, 'div', undefined, 'shopList');
  myRewards().forEach(reward => {
    const card = townAdd(list, 'div', undefined, 'shopCard' + (goalName === reward.rawName ? ' goal' : ''));
    card.dataset.reward = reward.rawName;
    const head = townAdd(card, 'div', undefined, 'shopHead');
    townAdd(head, 'span', reward.emoji, 'shopEmoji');
    townAdd(head, 'span', reward.name, 'shopName');
    townAdd(head, 'span', `⭐ ${reward.price}`, 'shopPrice');
    townAdd(card, 'div', shopEffort(reward.price), 'shopEffort');
    const bar = townAdd(card, 'div', undefined, 'bankBar');
    townAdd(bar, 'div', '', 'bankBarFill').style.width = Math.min(100, (wallet + saved) / reward.price * 100) + '%';
    const row = townAdd(card, 'div', undefined, 'shopButtons');
    townAdd(row, 'button', goalName === reward.rawName ? '🎯 My goal' : '🎯 Save for this', 'arcadeSmall shopGoal')
      .addEventListener('click', () => shopSetGoal(reward));
    if (wallet >= reward.price) {
      townAdd(row, 'button', '🎉 Get it (wallet)', 'arcadeGo shopBuy').addEventListener('click', () => shopBuy(reward, false));
    }
    if (saved > 0 && wallet + saved >= reward.price) {
      townAdd(row, 'button', '🐷 Use my savings', 'arcadeGo shopBuy shopSavings').addEventListener('click', () => shopBuy(reward, true));
    }
    if (wallet + saved < reward.price) townAdd(row, 'span', `${reward.price - wallet - saved} more ⭐ to go`, 'shopShort');
  });

  const done = rewardRequests.filter(r => r.status === 'approved').slice(-3).reverse();
  if (done.length) townAdd(box, 'div', '✅ Recent rewards: ' + done.map(r => `${r.emoji} ${r.name}`).join(' · '), 'arcadeHint');
  townAdd(box, 'div', '💡 Waiting and saving for something you really want is called delayed gratification. It\'s one of the best habits you can build!', 'bankTip');
}

// Make this reward the goal everywhere: the pet card and Kat Bank
function shopSetGoal(reward) {
  localStorage.setItem('kiddyKatGoal', reward.rawName);
  if (typeof bankOf === 'function') {
    const t = loadTown();
    bankOf(t).goal = { name: reward.name, stars: reward.price, emoji: reward.emoji };
    saveTown(t);
  }
  if (typeof showGoal === 'function') showGoal();
  showTownRewardShop(`🎯 Saving for ${reward.emoji} ${reward.name}! Put stars in 🏦 Kat Bank and watch your goal grow.`);
}

// Ask a grown-up for it. Savings are used first when the kid chooses them.
function shopBuy(reward, useSavings) {
  const wallet = townStars(), t = loadTown();
  const saved = typeof bankOf === 'function' ? bankOf(t).saved : 0;
  const fromSavings = useSavings ? Math.min(saved, reward.price) : 0;
  const fromWallet = reward.price - fromSavings;
  if (fromWallet > wallet) return;
  const how = fromSavings ? (fromWallet ? `${fromSavings} ⭐ from savings and ${fromWallet} ⭐ from your wallet` : `${fromSavings} ⭐ from savings`) : `${fromWallet} ⭐ from your wallet`;
  if (!confirm(`Ask ${parentName()} for "${reward.name}"? It uses ${how}.`)) return;
  if (fromSavings) {
    const b = bankOf(t);
    b.saved -= fromSavings;
    b.low = Math.min(b.low, b.saved);
    if (typeof bankLog === 'function') bankLog(b, 'reward', fromSavings);
    saveTown(t);
  }
  pet.stars -= fromWallet;                       // the stars are held until a grown-up decides
  savePet();
  rewardRequests.push({ id: Date.now(), emoji: reward.emoji, name: reward.name, price: reward.price,
                        date: new Date().toDateString(), status: 'waiting' });
  if (localStorage.getItem('kiddyKatGoal') === reward.rawName) localStorage.removeItem('kiddyKatGoal');
  saveRewards();
  if (typeof kidAlert === 'function') kidAlert('reward', reward.name);
  if (typeof showPet === 'function') showPet();
  if (typeof lifeSkillLog === 'function') lifeSkillLog('money', 'reward');
  showTownRewardShop();
  townPop(reward.emoji, `⏳ You asked ${parentName()} for ${reward.name}! You'll get a message when ${parentName()} decides.\n\n💡 ${fromSavings ? 'Your savings paid off. That\'s what saving is for!' : 'You earned this with real work. Nice job!'}`,
    [['🙌 Yay!', null]], 'townBounceIn');
}
