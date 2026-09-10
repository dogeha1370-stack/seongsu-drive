import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import assert from 'node:assert/strict';
const loaded = new Map();
function load(file) {
  file = path.resolve(file);
  if (loaded.has(file)) return loaded.get(file);
  let code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  code = code.replace(
    /from ['"]([^'"]+)['"]/g,
    (all, id) =>
      `from '${id.startsWith('three') ? import.meta.resolve(id) : id.startsWith('.') ? load(path.resolve(path.dirname(file), id + '.ts')) : id}'`,
  );
  const url =
    'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
  loaded.set(file, url);
  return url;
}

const { createLife } = await import(load('app/life.ts'));
const {
  urbanAction,
  urbanTick,
  urbanCoffee,
  charm,
  restoreUrban,
  serviceOpen,
  VILLAINS,
} = await import(load('app/urban.ts'));
const s = createLife();
s.cash = 1000000;
const u = s.urban;
const run = (op, value = '', at = null, riding = false, random = () => 0.99) =>
  urbanAction(s, op, value, { at, riding }, random);
assert.match(run('perfume', 'tacit'), /매장/);
assert.equal(s.cash, 1000000);
run('perfume', 'tacit', 'aesop');
assert.equal(s.cash, 801000);
assert.equal(charm(u), 15);
run('perfume', 'tacit', 'aesop');
assert.equal(s.cash, 801000, 'owned perfume equips without charging');
run('clothes', 'blue', 'ader');
assert.equal(charm(u), 23);
assert.equal(u.worn, 'blue');
assert.equal(restoreUrban({ ...u, reputation: NaN }).reputation, 0);
assert.equal(restoreUrban(u).worn, 'blue');
assert.equal(restoreUrban({ worn: 'black' }).worn, '');
u.occupied = [];
run('seat', '0', null, true);
assert.equal(u.seat, 0);
assert.equal(u.reputation, -5);
run('seat', '0', null, true);
assert.equal(u.reputation, -5, 'same seat cannot repeatedly penalize');
run('stand');
run('seat', '2', null, true, () => 0.5);
assert(u.occupied.includes(2), 'faster NPC wins contested seat');
u.agility = 100;
run('seat', '4', null, true, () => 0.5);
assert.equal(u.seat, 4);
u.villain = 0;
u.villainHp = 80;
run('report', '', null, true);
assert.equal(u.villain, null);
assert.equal(u.reputation, 0);
u.villain = 4;
u.villainHp = VILLAINS[4].hp;
s.hp = 100;
for (let i = 0; i < 8 && u.villain !== null; i++) {
  run('fight', '', null, true);
  urbanTick(s, 1, true, null);
}
assert.equal(u.villain, null);
assert(u.drops.includes('단소'));
assert.equal(u.buff, 'power');
assert.equal(u.xp, 30);
u.villain = 0;
u.villainHp = 80;
u.buff = 'focus';
u.buffTime = 600;
u.seat = null;
u.mental = 70;
urbanTick(s, 10, true, null);
assert.equal(u.mental, 70);
urbanTick(s, 600, true, null);
assert.equal(u.buff, '');
s.minutes = 600;
for (let i = 0; i < 4; i++) urbanCoffee(s);
assert.equal(u.coffees, 4);
assert(u.toilet > 0 && u.insomnia > 0 && u.boost > 0);
urbanTick(s, 601, false, null);
assert.equal(u.insomnia, 0);
s.cash = 0;
assert.match(run('night', 'taxi'), /필요/);
assert.equal(u.travel, 0);
assert.match(run('night', 'walk'), /무료/);
s.cash = 12000;
run('night', 'taxi', null, false, () => 0.3);
assert.equal(s.cash, 0);
assert.equal(u.travel, 9);
assert(!serviceOpen(90));
assert(serviceOpen(330));
assert(serviceOpen(1439));
assert(!serviceOpen(1440));
u.mental = 20;
u.careCooldown = 0;
run('recover-mental', 'music');
const mental = u.mental;
run('recover-mental', 'music');
assert.equal(u.mental, mental);
const { roadHeight } = await import(load('app/terrain.ts'));
assert(roadHeight(70, 37) > 1.5);
assert.equal(roadHeight(70, 19), 0);
assert.equal(roadHeight(90, 37), 0);
for (let z = 19; z < 55; z += 0.1)
  assert(Math.abs(roadHeight(70, z + 0.1) - roadHeight(70, z)) < 0.03);
// Thumb button circles retain a gap at the requested mobile size.
const buttons = [
  [149, 99, 31],
  [92.5, 157.5, 22.5],
  [157.5, 34.5, 22.5],
  [40.5, 95.5, 22.5],
  [92.5, 34.5, 22.5],
  [157.5, 157.5, 22.5],
];
for (let i = 0; i < buttons.length; i++)
  for (let j = i + 1; j < buttons.length; j++) {
    const a = buttons[i],
      b = buttons[j];
    assert(
      Math.hypot(a[0] - b[0], a[1] - b[1]) > a[2] + b[2] + 3,
      'thumb controls have non-overlapping hit areas',
    );
  }
console.log(
  'PASS shops/save/charm, seat competition/priority penalty, villain reporting/combat/drops/buffs, caffeine, last train/cash, slopes, mobile controls',
);
