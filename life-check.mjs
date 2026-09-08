import fs from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
import path from 'node:path';
function load(file) {
  let code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  code = code.replace(
    /from ['"]([^'"]+)['"]/g,
    (all, id) =>
      "from '" + load(path.resolve(path.dirname(file), id + '.ts')) + "'",
  );
  return 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
}
const {
  createLife,
  advanceMinutes,
  tickLife,
  act,
  deliver,
  restoreLife,
  reportCrime,
  day,
  HOUSES,
  dropCash,
  collectCash,
  claimDeliveryBike,
  ITEMS,
  ORDER_ROUTES,
} = await import(load('app/life.ts'));
let checks = 0;
function test(name, fn) {
  fn();
  checks++;
  console.log('PASS', name);
}
test('cash drop is spatial, delayed and collected exactly once', () => {
  const s = createLife();
  s.inside = false;
  const before = s.cash;
  dropCash(s, 20, 10, 1234);
  assert.equal(collectCash(s, 20, 10), 0);
  advanceMinutes(s, 1);
  assert.equal(collectCash(s, 100, 10), 0);
  assert.equal(collectCash(s, 20, 10), 1234);
  assert.equal(collectCash(s, 20, 10), 0);
  assert.equal(s.cash, before + 1234);
});
test('taken delivery scooter preserves upgraded bike and survives save', () => {
  const s = createLife();
  s.bikeTier = 3;
  s.bikeTune = true;
  s.fuel = 88;
  claimDeliveryBike(s);
  assert.equal(s.bikeTier, 0);
  assert(s.bikeBox);
  assert.equal(s.garageBike.tier, 3);
  const restored = restoreLife(JSON.stringify(s));
  assert(restored.stolenBike);
  assert(restored.garageBike.tune);
  restored.inside = false;
  act(restored, 'garage-bike', '', 'garage');
  assert.equal(restored.bikeTier, 3);
  assert.equal(restored.fuel, 88);
});
test('decor purchase and placements persist, old fatigue fields disappear', () => {
  const s = createLife();
  s.cash = 50000;
  act(s, 'decor-buy', 'rug', 'home');
  const balance = s.cash;
  act(s, 'decor-buy', 'rug', 'home');
  assert.equal(s.cash, balance);
  act(s, 'decor-place', 'rug', 'home');
  assert.equal(s.decor.placed.rug, 1);
  act(s, 'wallpaper', '#809eac', 'home');
  const restored = restoreLife(
    JSON.stringify({ ...s, fatigue: 45, hunger: 33 }),
  );
  assert.equal(restored.decor.placed.rug, 1);
  assert.equal(restored.decor.wall, '#809eac');
  assert(!('fatigue' in restored));
  assert(!('hunger' in restored));
});
test('restaurant menus, BBQ shift and all six delivery routes settle once', () => {
  for (const [at, ids] of [
    [
      'burger',
      ['bigmac', 'shanghai', 'burger1955', 'fries', 'nuggets', 'mccoffee'],
    ],
    [
      'bbq',
      [
        'golden',
        'halfchicken',
        'hotchicken',
        'cheesechicken',
        'jamaica',
        'saucechicken',
      ],
    ],
  ]) {
    for (const id of ids) {
      const s = createLife();
      s.inside = false;
      s.cash = 100000;
      s.hp = 10;
      act(s, 'buy', id, at);
      assert.equal(s.cash, 100000 - ITEMS[id].price);
      act(s, 'consume', id, at);
      assert.equal(s.hp, 10 + ITEMS[id].hp);
      assert.equal(s.inventory[id], 0);
      assert.equal(restoreLife(JSON.stringify(s)).cash, s.cash);
    }
  }
  const s = createLife();
  s.inside = false;
  const before = s.cash,
    time = s.minutes;
  act(s, 'work', '', 'bbq');
  assert.equal(s.cash, before + 30000);
  assert.equal(s.minutes, time + 120);
  act(s, 'work', '', 'bbq');
  assert.equal(s.cash, before + 30000);
  assert.equal(ORDER_ROUTES.length, 7);
  for (let i = 0; i < ORDER_ROUTES.length; i++) {
    const state = createLife();
    state.inside = false;
    act(state, 'accept', String(i));
    const order = state.order;
    assert(order);
    deliver(state, order.pickup);
    deliver(state, order.dropoff, order.floor || 0);
    const paid = state.cash;
    deliver(state, order.dropoff, order.floor || 0);
    assert.equal(state.cash, paid);
    assert.equal(state.deliveries, 1);
  }
});
test('30 real minutes = 1 full day; home twice as fast; menus freeze', () => {
  let s = createLife();
  tickLife(s, 1800, {});
  assert.equal(s.minutes, 1890);
  s = createLife();
  tickLife(s, 900, { home: true });
  assert.equal(s.minutes, 1890);
  const before = s.minutes;
  tickLife(s, 100, { menu: true });
  assert.equal(s.minutes, before);
});
test('delivery requires pickup and pays only once, with one starter bonus', () => {
  const s = createLife();
  act(s, 'accept', '0');
  const cash = s.cash;
  deliver(s, 'forest');
  assert.equal(s.cash, cash);
  assert.equal(s.order.stage, 'pickup');
  deliver(s, 'cafe');
  deliver(s, 'forest');
  assert.equal(s.cash, cash + 4300 + 30000);
  deliver(s, 'forest');
  assert.equal(s.deliveries, 1);
  act(s, 'accept', '0');
  deliver(s, 'cafe');
  deliver(s, 'forest');
  assert.equal(s.cash, cash + 38600);
});
test('order expires during sleep without a payout', () => {
  const s = createLife();
  act(s, 'accept', '0');
  const cash = s.cash;
  act(s, 'sleep');
  assert.equal(s.order, null);
  assert.equal(s.cash, cash);
  assert.equal(s.rating, 4.8);
  assert.equal(s.hp, 100);
  assert.equal('fatigue' in s, false);
  assert.equal('hunger' in s, false);
});
test('rent due day and multiple skipped months create each bill once', () => {
  const s = createLife();
  s.cash = 0;
  advanceMinutes(s, 1440 * 67 - s.minutes);
  assert.equal(day(s), 68);
  assert.equal(s.rentDueDay, 98);
  assert.equal(s.arrears, 900000 + 67 * 2000);
  const debt = s.arrears;
  advanceMinutes(s, 1);
  assert.equal(s.arrears, debt);
});
test('prepaid rent is not billed again at original deadline', () => {
  const s = createLife();
  s.cash = 1000000;
  act(s, 'rent');
  assert.equal(s.cash, 700000);
  assert.equal(s.rentDueDay, 38);
  advanceMinutes(s, 7 * 1440 - s.minutes);
  assert.equal(s.arrears, 0);
  assert.equal(s.cash, 686000);
});
test('failed transactions leave money and inventory intact', () => {
  const s = createLife();
  s.cash = 1000;
  const inventory = JSON.stringify(s.inventory);
  act(s, 'buy', 'specialty', 'cafe');
  assert.equal(s.cash, 1000);
  assert.equal(JSON.stringify(s.inventory), inventory);
  s.cash = 500000;
  s.inventory = { snack: 12 };
  act(s, 'buy', 'snack', 'store');
  assert.equal(s.cash, 500000);
  assert.equal(s.inventory.snack, 12);
  act(s, 'loot', '', 'factory');
  assert.equal(s.looted.factory, undefined);
});
test('housing refunds old deposit and preserves next due day', () => {
  const s = createLife();
  s.cash = 7000000;
  act(s, 'house', '1', 'estate');
  assert.equal(s.homeTier, 1);
  assert.equal(s.cash, 0);
  assert.equal(s.rentDueDay, 8);
  s.cash = 99999999;
  s.arrears = 1;
  act(s, 'house', '2', 'estate');
  assert.equal(s.homeTier, 1);
  assert.equal(s.cash, 99999999);
});
test('bike purchase, duplicate prevention, fuel and repair costs', () => {
  const s = createLife();
  s.cash = 1000000;
  act(s, 'bike', '0', 'garage');
  assert.equal(s.cash, 200000);
  act(s, 'bike', '0', 'garage');
  assert.equal(s.cash, 200000);
  s.fuel = 80;
  s.bikeHp = 50;
  act(s, 'fuel', '', 'garage');
  act(s, 'repair', '', 'garage');
  assert.equal(s.cash, 185500);
  assert.equal(s.fuel, 100);
  assert.equal(s.bikeHp, 100);
});
test('coffee bounds, caffeine excess and gradual decay', () => {
  const s = createLife();
  s.inventory = { specialty: 3 };
  for (let i = 0; i < 3; i++) act(s, 'consume', 'specialty');
  assert.equal(s.hp, 100);
  assert.equal('fatigue' in s, false);
  assert.equal('hunger' in s, false);
  assert.equal(s.caffeine, 3);
  advanceMinutes(s, 160);
  assert.equal(s.caffeine, 2);
  assert.equal(s.focus, 0);
});
test('loot is once daily, owned materials trigger a delayed report', () => {
  const s = createLife();
  act(s, 'loot', '', 'warehouse');
  assert.equal(s.inventory.electronics, 1);
  assert.equal(s.wanted, 0);
  assert.equal(s.pendingHeat, 2);
  act(s, 'loot', '', 'warehouse');
  assert.equal(s.inventory.electronics, 1);
  tickLife(s, 4, {});
  assert.equal(s.wanted, 2);
  tickLife(s, 25, { seen: true });
  assert.equal(s.wanted, 2);
  tickLife(s, 25, {});
  assert.equal(s.wanted, 1);
});
test('local save roundtrip preserves economy, order and loot cooldown', () => {
  const s = createLife();
  act(s, 'accept', '1');
  act(s, 'loot', '', 'factory');
  s.arrears = 300000;
  s.inside = false;
  const restored = restoreLife(JSON.stringify(s));
  assert.deepEqual(restored, s);
  assert.equal(restoreLife('{broken').cash, 127400);
  for (const bad of [
    { homeTier: 9 },
    { cash: -1 },
    { minutes: null },
    { inventory: { unknown: 2 } },
    { order: { stage: 'bad' } },
    { worked: { garage: null } },
  ])
    assert.equal(restoreLife(JSON.stringify({ ...s, ...bad })).cash, 127400);
});
test('work, quests, storage and event awards cannot repeat', () => {
  const s = createLife();
  act(s, 'work', '', 'store');
  const money = s.cash;
  act(s, 'work', '', 'store');
  assert.equal(s.cash, money);
  s.deliveries = 3;
  act(s, 'quest', '', 'cafe');
  act(s, 'quest', '', 'cafe');
  assert.equal(s.cash, money + 20000);
  act(s, 'store', 'snack');
  assert.equal(s.storage.snack, 1);
  act(s, 'take', 'snack');
  assert.equal(s.inventory.snack, 2);
  s.event = { index: 0, expires: s.minutes + 100 };
  act(s, 'event', '', 'station');
  const reward = s.cash;
  act(s, 'event', '', 'station');
  assert.equal(s.cash, reward);
});
test('a new crime is rate limited; fine clears pending reports', () => {
  const s = createLife();
  reportCrime(s, 1, 'test');
  reportCrime(s, 1, 'test');
  assert.equal(s.pendingHeat, 1);
  act(s, 'fine', '', 'police');
  assert.equal(s.pendingHeat, 0);
  assert.equal(s.reportIn, 0);
  tickLife(s, 10, {});
  assert.equal(s.wanted, 0);
});
assert.equal(HOUSES[4].rent, 0);
test('invalid counters and inherited item keys are rejected', () => {
  const s = createLife();
  s.cash = 222222;
  for (const bad of [
    { deliveries: -1 },
    { orderSerial: -2 },
    { earned: -1 },
    { inventory: { toString: 1 } },
    { inventory: [] },
    { worked: [] },
  ])
    assert.equal(restoreLife(JSON.stringify({ ...s, ...bad })).cash, 127400);
});
test('finishing an event retains a newly generated event', () => {
  const s = createLife();
  s.minutes = 680;
  s.nextEvent = 690;
  s.event = { index: 2, expires: 900 };
  act(s, 'event', '', 'cafe');
  assert(s.event);
  assert.equal(s.event.index, 6);
});
console.log(`${checks} life simulation checks passed.`);
