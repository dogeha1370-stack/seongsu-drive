// Run the real Three.js scene and simulation with only GPU/DOM surfaces stubbed.
// This verifies integration, not rendering quality or browser input behavior.
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
  if (file.endsWith('game.ts'))
    code = code.replace(
      /import \* as T from 'three';/,
      "import * as THREE from 'three'; const T = {...THREE, WebGLRenderer:globalThis.TestRenderer,TextureLoader:class{load(){return new THREE.Texture();}}};",
    );
  if (file.endsWith('game.ts'))
    code = code.replace(
      'return {\n        urban:',
      'return {\n        __test:{get attackTime(){return attackTime;},metro,people,vehicles,abandonedBikes,playerBlocked,mouseDown,mouseMove,mouseUp,down,move,up,get life(){return life;},get camera(){return camera;},bikeMotion,get buildingFloor(){return buildingFloor;}},\n        urban:',
    );
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
const noop = () => {};
class Element {
  constructor() {
    this.style = {};
    this.width = 768;
    this.height = 160;
    this.clientWidth = 1440;
    this.clientHeight = 900;
  }
  appendChild() {}
  addEventListener() {}
  removeEventListener() {}
  remove() {}
  setPointerCapture() {}
  closest() {
    return null;
  }
  getContext() {
    return new Proxy(
      {},
      { get: (_, key) => (key === 'canvas' ? this : noop), set: () => true },
    );
  }
}
globalThis.HTMLElement = Element;
globalThis.document = {
  // oxlint-disable-next-line typescript/no-deprecated -- Deliberately replaces the DOM factory in this Node-only test.
  createElement: () => new Element(),
  getElementById: () => null,
  addEventListener: noop,
  removeEventListener: noop,
  hidden: false,
};
globalThis.window = { addEventListener: noop, removeEventListener: noop };
globalThis.devicePixelRatio = 1;
let frame,
  now = performance.now(),
  scene;
globalThis.requestAnimationFrame = (cb) => ((frame = cb), 1);
globalThis.cancelAnimationFrame = noop;
globalThis.TestRenderer = class {
  domElement = new Element();
  shadowMap = {};
  setPixelRatio() {}
  setSize() {}
  dispose() {}
  render(world, camera) {
    scene = world;
    world.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
  }
};
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, value) => storage.set(key, value),
};
const lifeModule = await import(load('app/life.ts'));
const { createLife, SAVE_KEY, PLACES } = lifeModule;
const { createGame } = await import(load('app/game.ts'));
const { sidewalkPath } = await import(load('app/city.ts'));
const start = createLife();
start.cash = 2000000;
storage.set(SAVE_KEY, JSON.stringify(start));
let hud;
const api = createGame(new Element(), (value) => (hud = value));
function step(ms = 120) {
  now += ms;
  frame(now);
}
function settle() {
  step();
  step();
}
function go(id) {
  const p = PLACES.find((p) => p.id === id);
  scene.getObjectByName('player').position.set(p.x, 0, p.z);
  settle();
}
settle();
assert.equal(hud.life.inside, true);
assert.equal(hud.hp, 100);
api.action('accept', '0');
api.open(null);
scene.getObjectByName('player').position.set(300, 0, 4.3);
settle();
assert.equal(hud.life.inside, false);
go('forest');
api.interact();
settle();
assert.equal(hud.life.order.stage, 'pickup');
api.open(null);
go('cafe');
api.interact();
settle();
assert.equal(hud.life.order.stage, 'dropoff');
go('forest');
api.interact();
settle();
assert.equal(hud.life.deliveries, 1);
assert.equal(hud.life.cash, 2034300);
go('store');
api.interact();
settle();
assert.equal(hud.panel, 'place');
const time = hud.life.minutes;
step(1000);
assert(hud.life.minutes > time);
api.action('buy', 'meal');
api.action('consume', 'meal');
settle();
assert.equal(hud.life.inventory.meal, 0);
api.open(null);
go('garage');
api.interact();
settle();
api.action('bike', '0');
api.open(null);
settle();
assert.equal(hud.life.bikeTier, 0);
scene
  .getObjectByName('player')
  .position.copy(scene.getObjectByName('player-bike').position);
settle();
api.mount();
settle();
assert.equal(hud.riding, true);
api.key('w', true);
settle();
assert(hud.speed > 0);
api.key('w', false);
settle();
api.mount();
settle();
assert.equal(hud.riding, false);
api.equip();
settle();
assert.equal(hud.armed, true);
api.attack();
settle();
assert.equal(hud.life.ammo, 11);
api.reload();
for (let i = 0; i < 130; i++) step(20);
assert.equal(hud.life.ammo, 12);
assert.equal(hud.life.reserve, 35);
go('home');
api.interact();
settle();
assert.equal(hud.life.inside, true);
assert.equal(hud.panel, 'home');
api.pause();
settle();
assert.equal(hud.panel, null);
const frozen = hud.life.minutes;
step(1000);
assert.equal(hud.life.minutes, frozen);
api.pause();
api.open(null);
settle();
api.dispose();
const saved = JSON.parse(storage.get(SAVE_KEY));
assert.equal(saved.deliveries, 1);
assert.equal(saved.bikeTier, 0);
saved.hp = 0;
storage.set(SAVE_KEY, JSON.stringify(saved));
const recovered = createGame(new Element(), (value) => (hud = value));
settle();
recovered.pause();
recovered.action('recover');
settle();
assert.equal(hud.hp, 100);
assert.equal(hud.paused, false);
assert.equal(hud.life.inside, true);
recovered.dispose();
const solids = [];
for (const x of [-100, -40, 40, 100])
  for (const z of [-96, -36, 36, 96]) solids.push({ x, z, w: 31, d: 35 });
const blocked = (x, z, r) =>
  Math.abs(x) > 113 ||
  Math.abs(z) > 110 ||
  solids.some(
    (b) => Math.abs(x - b.x) < b.w / 2 + r && Math.abs(z - b.z) < b.d / 2 + r,
  );
for (const to of PLACES) {
  const route = sidewalkPath(PLACES[0], to, blocked);
  assert(route.length, `No path to ${to.id}`);
  for (const waypoint of route)
    assert(
      !blocked(waypoint.x, waypoint.z, 0.55),
      `Blocked waypoint to ${to.id}`,
    );
}
console.log(
  'Game integration checks passed: scene initialization, home/outdoors, delivery, menu pause, purchases, bike mounting/driving/dismounting, ammo/reload, pause, save, recovery, and routes to all 17 places.',
);

// Controlled fixtures exercise the real integration without depending on random traffic.
const fresh = createLife();
fresh.inside = false;
fresh.cash = 2000000;
fresh.playerX = -40;
fresh.playerZ = -69;
storage.set(SAVE_KEY, JSON.stringify(fresh));
const game = createGame(new Element(), (value) => (hud = value));
settle();
const test = game.__test;
assert(test, 'Test-only fixture access was not injected');
const player = scene.getObjectByName('player');
for (const v of test.vehicles) {
  v.exploded = true;
  v.hp = 0;
  v.respawnTime = 9999;
  v.mesh.visible = false;
}
for (const npc of test.people) {
  npc.state.x = 90;
  npc.state.z = -13;
  npc.state.aggro = 0;
  npc.wait = 9999;
}
go('home');
assert.equal(hud.panel, 'place');
game.open(null);
settle();
assert.equal(hud.panel, null);
player.position.set(-40, 0, -69);
settle();
go('home');
assert.equal(hud.panel, 'place');
player.position.set(-40, 0, -69);
settle();
assert.equal(hud.panel, null);
const beforeMove = player.position.clone();
game.stick(0.5, 0);
for (let i = 0; i < 20; i++) step(20);
game.stick(0, 0);
settle();
assert(player.position.distanceTo(beforeMove) > 0.4);
const stopped = player.position.clone();
for (let i = 0; i < 10; i++) step(20);
assert(player.position.distanceTo(stopped) < 0.01);
for (const tree of scene.getObjectsByProperty('name', 'street-tree')) {
  const { isRoadSurface } = await import(load('app/world-rules.ts'));
  assert(!isRoadSurface(tree.userData.x, tree.userData.z, 2.8));
}
const rider = test.people.find((p) => p.role === '배달기사');
rider.state.x = -30;
rider.state.z = -69;
rider.state.hp = 0;
rider.state.respawnIn = 30;
settle();
assert(rider.deathHandled);
assert.equal(rider.vehicle, null);
const abandoned = test.abandonedBikes.find((b) => b.id === rider.state.id);
assert(abandoned);
const bikePosition = abandoned.mesh.position.clone();
const serial = hud.life.dropSerial;
for (let i = 0; i < 10; i++) step(20);
assert.equal(hud.life.dropSerial, serial);
assert(abandoned.mesh.position.distanceTo(bikePosition) < 0.001);
const dropped = hud.life.cashDrops.find(
  (d) => Math.hypot(d.x + 30, d.z + 69) < 0.1,
);
assert(dropped);
player.position.set(dropped.x, 0, dropped.z);
const cash = hud.life.cash;
step(1000);
settle();
assert.equal(hud.life.cash, cash + dropped.amount);
step(500);
assert.equal(hud.life.cash, cash + dropped.amount);
player.position.set(bikePosition.x + 2, 0, bikePosition.z);
settle();
game.mount();
settle();
assert(hud.riding);
assert(hud.life.stolenBike && hud.life.bikeBox);
assert.equal(test.abandonedBikes.length, 0);
game.mount();
settle();
assert(!hud.riding);
// Mouse button chords and touch camera input preserve aiming and allow shots.
player.position.set(-40, 0, -69);
settle();
game.equip();
settle();
const mouse = (button, buttons = 1, x = 300, y = 300) => ({
  button,
  buttons,
  clientX: x,
  clientY: y,
  preventDefault: noop,
});
test.mouseDown(mouse(2, 2));
test.mouseMove(mouse(2, 2, 310));
settle();
assert(hud.aiming && !hud.ads);
let ammo = hud.life.ammo;
test.mouseDown(mouse(0, 3, 310));
settle();
assert.equal(hud.life.ammo, ammo - 1);
test.mouseUp(mouse(0, 2, 310));
settle();
assert(hud.aiming);
test.mouseUp(mouse(2, 0, 310));
settle();
assert(!hud.aiming);
test.mouseDown(mouse(2, 2));
test.mouseUp(mouse(2, 0));
settle();
assert(hud.ads);
assert.equal(player.visible, false);
assert(scene.getObjectByName('ads-weapon').visible);
const heading = hud.heading;
test.mouseMove(mouse(0, 0, 330));
settle();
assert.notEqual(hud.heading, heading);
assert(hud.ads);
for (let i = 0; i < 20; i++) step(20);
ammo = hud.life.ammo;
test.mouseDown(mouse(0, 1, 330));
settle();
assert.equal(hud.life.ammo, ammo - 1);
const touch = {
  pointerType: 'touch',
  button: 0,
  pointerId: 1,
  clientX: 330,
  clientY: 300,
  preventDefault: noop,
};
test.down(touch);
test.move({ ...touch, clientX: 360 });
test.up(touch);
settle();
assert(hud.ads && hud.aiming);
game.aim();
settle();
assert(player.visible && !hud.ads);
game.equip();
settle();
const victim = test.people[1];
victim.state.x = player.position.x;
victim.state.z = player.position.z + 1;
victim.state.hp = 100;
victim.state.down = 0;
victim.state.stun = 0;
player.rotation.y = 0;
const hpBefore = victim.state.hp;
test.mouseDown(mouse(0));
settle();
assert(victim.state.hp < hpBefore, 'Left click must punch while unarmed');
victim.state.aggro = 0;
victim.state.x = 90;
victim.state.z = -13;
// Approaching the front stops a car; E ejects first, then enters that specific car.
const car = test.vehicles[2];
car.route = [
  { x: -65, z: -65 },
  { x: 65, z: -65 },
  { x: 65, z: 5 },
  { x: -65, z: 5 },
];
car.exploded = false;
car.hp = 100;
car.driverOut = false;
car.outFor = 0;
car.physics.x = -40;
car.physics.z = -65;
car.physics.angle = Math.PI / 2;
car.physics.vx = 6;
car.physics.vz = 0;
car.physics.spin = 0;
car.physics.stun = 0;
car.waypoint = 1;
car.mesh.visible = true;
player.position.set(-34, 0, -65);
for (let i = 0; i < 120; i++) step(20);
assert(
  Math.hypot(car.physics.vx, car.physics.vz) < 1,
  'Car should stop in front of player',
);
game.interact();
settle();
assert(car.driverOut);
assert(!hud.driving);
game.interact();
settle();
assert(hud.driving);
game.interact();
settle();
assert(!hud.driving);
// Side impact removes actual HP and produces a floating negative number.
player.position.set(-40, 0, -65);
car.physics.x = -42.3;
car.physics.z = -65;
car.physics.angle = Math.PI / 2;
car.physics.vx = 8;
car.physics.vz = 0;
car.physics.stun = 1;
car.driverOut = false;
const beforeHit = hud.hp;
settle();
assert(hud.hp < beforeHit);
assert(scene.getObjectByName('damage-number'));
assert(!hud.hint.includes('교통사고 · HP'));
car.exploded = true;
car.hp = 0;
car.respawnTime = 9999;
for (const p of test.people) {
  p.state.aggro = 0;
  p.state.x = 90;
  p.state.z = -13;
  p.wait = 9999;
}
// A successful request follows the same NPC and can be ended.
player.position.set(-40, 0, -69);
const woman = test.people.find((p) => p.female);
woman.state.x = -38;
woman.state.z = -69;
woman.state.hp = 100;
woman.state.down = 0;
woman.state.stun = 0;
woman.state.aggro = 0;
woman.wait = 9999;
settle();
assert.equal(hud.social.id, woman.state.id);
game.askNumber();
settle();
assert(hud.social.remaining > 0);
const random = Math.random;
Math.random = () => 0;
for (let i = 0; i < 165; i++) step(20);
Math.random = random;
assert.equal(hud.life.companionId, woman.state.id);
assert(hud.life.contacts.includes(woman.state.id));
const oldWoman = { x: woman.state.x, z: woman.state.z };
player.position.set(-32, 0, -69);
for (let i = 0; i < 100; i++) step(20);
assert(
  Math.hypot(woman.state.x - oldWoman.x, woman.state.z - oldWoman.z) > 1,
  'Companion should follow movement',
);
player.position.set(woman.state.x + 1, 0, woman.state.z);
settle();
game.askNumber();
settle();
assert.equal(hud.life.companionId, null);
game.setPeers([
  {
    id: 'friend-test',
    name: '친구',
    scene: 'outdoors',
    x: -30,
    z: -69,
    heading: 0,
    speed: 4,
    mode: 'walk',
    emote: '👋',
  },
]);
settle();
assert(scene.getObjectByName('guest-friend-test').visible);
game.setPeers([]);
assert(!scene.getObjectByName('guest-friend-test'));

// Multiplayer combat hooks, typing isolation and the complete elevator delivery.
player.position.set(0, 0, 40);
player.rotation.set(0, 0, 0);
game.open(null);
settle();
const outgoing = [];
game.onPeerAttack((id, kind) => outgoing.push({ id, kind }));
game.setPeers([
  {
    id: 'pvp-target',
    name: '친구',
    scene: 'outdoors',
    x: 0,
    z: 42,
    heading: 0,
    speed: 0,
    mode: 'walk',
    emote: '',
    hp: 100,
  },
]);
settle();
game.attack();
assert(outgoing.some((a) => a.id === 'pvp-target' && a.kind === 'punch'));
const beforePvp = hud.hp;
game.receiveDamage(35);
settle();
assert.equal(hud.hp, Math.max(0, beforePvp - 35));
const beforeChat = player.position.clone();
game.typing(true);
game.key('w', true);
for (let i = 0; i < 15; i++) step(20);
assert(player.position.distanceTo(beforeChat) < 0.01);
game.typing(false);
game.key('w', false);
game.setPeers([]);
test.life.wanted = test.life.pendingHeat = 0;
test.life.order = null;
player.position.set(-40, 0, 56);
settle();
game.action('accept', '6');
game.interact();
settle();
assert.equal(test.life.order.stage, 'dropoff');
assert.equal(test.life.order.floor, 2);
player.position.set(100, 0, 56);
settle();
const cashBefore = test.life.cash;
game.interact();
settle();
assert.equal(hud.building.floor, 1);
assert(test.life.order);
assert.equal(test.life.cash, cashBefore);
player.position.set(400, 0, -3.1);
settle();
game.interact();
assert.equal(game.presence().scene, 'office:1');
for (let i = 0; i < 155; i++) step(20);
assert.equal(hud.building.floor, 2);
assert.equal(player.position.y, 5);
player.position.set(404, 5, 1);
settle();
game.interact();
settle();
assert.equal(test.life.order, null);
assert(test.life.cash > cashBefore);
player.position.set(400, 5, -3.1);
settle();
game.interact();
for (let i = 0; i < 155; i++) step(20);
assert.equal(hud.building.floor, 1);
player.position.set(400, 0, 4);
settle();
assert.equal(hud.building, null);
assert.equal(game.presence().scene, 'outdoors');
assert(
  scene.userData.staticBatching.before >
    scene.userData.staticBatching.after * 5,
);
console.log(
  'PASS PvP damage, chat input isolation, Olive Young 2F elevator delivery; static draw calls',
  scene.userData.staticBatching,
);
// Regression: low-speed reverse must not be zeroed on each render frame.
game.open(null);
test.life.bikeTier = 0; test.life.fuel=100;test.life.bikeHp=100;
const ownBike=scene.getObjectByName('player-bike');
ownBike.position.set(0,0,25);player.position.set(0,0,25);
game.mount();settle();assert(hud.riding);
game.key('s',true);for(let i=0;i<60;i++)step(20);game.key('s',false);
assert(test.bikeMotion.velocity < -.3, 'reverse must accelerate from rest');
assert(player.position.distanceTo(new (await import('three')).Vector3(0,.22,25))>.2);
player.rotation.z=.45;game.receiveDamage(100);game.action('recover');settle();
assert.equal(player.rotation.z,0);assert.equal(test.bikeMotion.lean,0);assert.equal(game.presence().mode,'walk');
game.open(null);player.position.set(300,0,4.3);settle();
game.setPeers([{id:'companion-test',name:'친구',scene:'outdoors',x:0,z:25,heading:0,speed:0,mode:'walk',emote:'',companion:{id:2,x:1,z:25,heading:0}}]);settle();
assert(scene.getObjectByName('guest-companion-companion-test').visible);
game.setPeers([]);assert(!scene.getObjectByName('guest-companion-companion-test'));
game.selectWeapon(1);for(let i=0;i<140;i++)step(20);assert.equal(game.presence().weapon,1);assert(hud.life.ammo>0);
game.selectWeapon(3);for(let i=0;i<160;i++)step(20);assert.equal(hud.life.ammo,5);
assert(scene.getObjectByName('landmark-ADERERROR'));
assert(scene.getObjectByName('landmark-PRADA'));
assert(scene.getObjectByName('landmark-MUSINSA'));
console.log('PASS reverse startup, recovery pose, remote companion and weapon selection');

// Metro access, real boarding state, safe disembark and multiplayer height.
game.open(null);game.typing(false);game.teleport({x:12.5,z:-46,scene:'outdoors',heading:0});
player.position.set(12.5,0,-46);settle();
for(let z=-45.8;z<=-22;z+=.2){assert(!test.playerBlocked(12.5,z,.5),'stairs must be traversable');player.position.z=z;step(20);}
assert(player.position.y>9.8,'stairs reach the platform');
player.position.set(16,3,-39);const beforeEscalator=player.position.z;for(let i=0;i<60;i++)step(20);
assert(player.position.z>beforeEscalator+1,'escalator carries a standing player');
const actualNow=Date.now;let metroNow=120000+1000;Date.now=()=>metroNow;
player.position.set(5.5,10.2,0);settle();game.interact();settle();assert(hud.metro.riding);
metroNow=120000+21000;settle();assert(player.position.z>20,'passenger travels with train');
game.interact();settle();assert(hud.metro.riding,'cannot jump off a moving train');
metroNow=120000+31000;settle();game.interact();settle();assert(!hud.metro.riding);assert.equal(player.position.x,5.5);assert(player.position.y>=10.2);
assert.equal(game.presence().scene,'metro');assert.equal(game.presence().y,10.2);
Date.now=actualNow;
game.teleport({x:-40,z:-69,scene:'outdoors',heading:0});settle();assert.equal(game.presence().scene,'outdoors');
const {signalGreen,signalDistance,separateCrowd}=await import(load('app/traffic.ts'));
assert(signalGreen(true,1));assert(!signalGreen(false,1));assert(!signalGreen(true,15));assert(!signalGreen(false,15));assert(signalGreen(false,18));
assert(Number.isFinite(signalDistance(5,-22,0,20)));assert.equal(signalDistance(5,-22,0,1),Infinity);
const crowd=Array.from({length:8},(_,id)=>({id,x:20,z:0,hp:100}));for(let i=0;i<30;i++)separateCrowd(crowd,()=>false);
for(let i=0;i<crowd.length;i++)for(let j=i+1;j<crowd.length;j++)assert(Math.hypot(crowd[i].x-crowd[j].x,crowd[i].z-crowd[j].z)>=1.04);
const {sportsCar}=await import(load('app/vehicles.ts'));const model=sportsCar(0,'red');const axle=model.children.find(c=>c.type==='Group');model.userData.animateWheels(1);assert(axle.rotation.x>2);
assert.equal(ownBike.userData.chassis,ownBike.userData.chassis.children.find(c=>c.geometry?.parameters?.width===.85)?.parent);
console.log('PASS metro stairs, escalator, boarding/travel/exit, teleport, signals, crowd spacing, rotating wheels and attached delivery box');

// Exercise the real traffic controller against a red/green intersection.
game.open(null);player.position.set(-105,0,10);test.life.wanted=0;
for(const v of test.vehicles){v.exploded=true;v.respawnTime=99999;v.hp=0;}
const trafficCar=test.vehicles[0];trafficCar.exploded=false;trafficCar.hp=100;trafficCar.driverOut=false;trafficCar.waypoint=1;trafficCar.cruise=7;
Object.assign(trafficCar.physics,{x:-28,z:5,angle:Math.PI/2,vx:6,vz:0,spin:0,stun:0});
Date.now=()=>128000;
for(let i=0;i<300;i++)step(20);
assert(trafficCar.physics.x < -11.5,'red light stops car before intersection');
assert(Math.hypot(trafficCar.physics.vx,trafficCar.physics.vz)<1,'car settles at red signal');
const waitingX=trafficCar.physics.x;Date.now=()=>146000;
for(let i=0;i<180;i++)step(20);
assert(trafficCar.physics.x>waitingX+5,'green signal releases traffic');
const {onRoad}=await import(load('app/traffic.ts'));assert(onRoad(trafficCar.physics.x,trafficCar.physics.z));
Date.now=actualNow;
console.log('PASS actual traffic braking for red, departure on green and road confinement');

// Mobile attack goes through pointer-down separately while joystick input stays active.
game.open(null);game.teleport({x:0,z:-64,scene:'outdoors',heading:0});settle();
const movedFrom=player.position.clone();game.stick(.6,0);
for(let i=0;i<20;i++)step(20);game.attack();
assert(test.attackTime>0,'attack is accepted with movement input active');
for(let i=0;i<20;i++)step(20);game.stick(0,0);assert(player.position.distanceTo(movedFrom)>.5,'attack does not cancel joystick movement');
test.life.cash=123456;game.loseDuel();assert.equal(test.life.cash,0,'duel loss removes all cash');
test.life.urban.worn='blue';settle();assert.equal(game.presence().worn,'blue');
console.log('PASS concurrent joystick/action movement, duel cash loss and clothing presence');
game.dispose();
console.log(
  'PASS proximity dismissal/reentry, joystick movement, road-safe trees, one death/drop/collection, rider scooter, mouse/touch ADS firing, left-click punch, stopped-car ejection and entry, player damage numbers, NPC contacts/following, and remote avatars.',
);
