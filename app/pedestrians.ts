import type { Body } from './physics';
export type Person = {
  id: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  heading: number;
  stun: number;
  down: number;
  cooldown: number;
  lean: number;
  direction: number;
  homeZ: number;
  respawnIn: number;
  hp: number;
  aggro: number;
  swing: number;
  attackCooldown: number;
  walkSpeed: number;
};
export function person(id: number, x: number, z: number): Person {
  return {
    respawnIn: 0,
    hp: 100,
    aggro: 0,
    swing: 0,
    attackCooldown: 0,
    id,
    x,
    z,
    vx: 0,
    vz: 0,
    heading: Math.PI / 2,
    stun: 0,
    down: 0,
    cooldown: 0,
    lean: 0,
    direction: 1,
    homeZ: z,
    walkSpeed: 1 + (id % 4) * 0.15,
  };
}
export function hitPerson(p: Person, dx: number, dz: number, power: number) {
  const len = Math.hypot(dx, dz);
  if (len < 0.0001 || p.cooldown > 0 || p.hp <= 0) return false;
  const force = Math.min(22, Math.max(0, power));
  p.vx += (dx / len) * force;
  p.vz += (dz / len) * force;
  p.heading = Math.atan2(dx, dz);
  p.stun = Math.max(p.stun, 0.65 + force * 0.07);
  if (force >= 6) p.down = Math.max(p.down, 1.4 + force * 0.045);
  p.cooldown = 0.3;
  return true;
}
export function vehiclePerson(car: Body, p: Person) {
  const sin = Math.sin(car.angle),
    cos = Math.cos(car.angle),
    dx = p.x - car.x,
    dz = p.z - car.z;
  const lx = dx * cos - dz * sin,
    lz = dx * sin + dz * cos;
  const qx = Math.max(-1.25, Math.min(1.25, lx)),
    qz = Math.max(-2.2, Math.min(2.2, lz));
  let nx = lx - qx,
    nz = lz - qz;
  const distance = Math.hypot(nx, nz);
  let depth = 0.48 - distance;
  if (depth <= 0) return 0;
  if (distance < 0.0001) {
    const ex = 1.25 - Math.abs(lx),
      ez = 2.2 - Math.abs(lz);
    if (ex < ez) {
      nx = lx < 0 ? -1 : 1;
      nz = 0;
      depth = 0.48 + ex;
    } else {
      nx = 0;
      nz = lz < 0 ? -1 : 1;
      depth = 0.48 + ez;
    }
  } else {
    nx /= distance;
    nz /= distance;
  }
  const wx = nx * cos + nz * sin,
    wz = -nx * sin + nz * cos;
  p.x += wx * (depth + 0.005);
  p.z += wz * (depth + 0.005);
  const closing = (car.vx - p.vx) * wx + (car.vz - p.vz) * wz;
  if (closing <= 0.5) return 0;
  const power = Math.min(22, closing * 1.05 + 1);
  if (!hitPerson(p, wx, wz, power)) return 0;
  const reaction = (power * 75) / car.mass;
  car.vx -= wx * reaction;
  car.vz -= wz * reaction;
  return power;
}
export function stepPerson(
  p: Person,
  dt: number,
  blocked: (x: number, z: number, r: number) => boolean,
  target?: { x: number; z: number },
  destination?: { x: number; z: number },
) {
  p.cooldown = Math.max(0, p.cooldown - dt);
  p.stun = Math.max(0, p.stun - dt);
  p.down = Math.max(0, p.down - dt);
  if (p.hp > 0 && !p.stun && !p.down) {
    if (Math.abs(p.x) > 104) p.direction = p.x > 0 ? -1 : 1;
    const chase = target && p.aggro > 0;
    const dx = chase ? target.x - p.x : destination ? destination.x - p.x : 0,
      dz = chase ? target.z - p.z : destination ? destination.z - p.z : 0,
      distance = Math.hypot(dx, dz);
    const desiredX = chase
        ? distance > 1.5
          ? (dx / distance) * 3.5
          : 0
        : destination
          ? distance > 0.5
            ? (dx / distance) * p.walkSpeed
            : 0
          : p.direction * p.walkSpeed,
      desiredZ = chase
        ? distance > 1.5
          ? (dz / distance) * 3.5
          : 0
        : destination
          ? distance > 0.5
            ? (dz / distance) * p.walkSpeed
            : 0
          : Math.max(-1, Math.min(1, p.homeZ - p.z));
    const t = 1 - Math.exp(-4 * dt);
    p.vx += (desiredX - p.vx) * t;
    p.vz += (desiredZ - p.vz) * t;
    p.heading = Math.atan2(p.vx, p.vz);
  } else {
    const drag = Math.exp(-(p.down ? 2.3 : 4) * dt);
    p.vx *= drag;
    p.vz *= drag;
  }
  const x = p.x + p.vx * dt,
    z = p.z + p.vz * dt;
  if (!blocked(x, p.z, 0.5)) p.x = x;
  else {
    p.vx *= -0.15;
    if (!p.stun) p.direction *= -1;
  }
  if (!blocked(p.x, z, 0.5)) p.z = z;
  else p.vz *= -0.15;
  const tilt = p.hp <= 0 || p.down ? 1.48 : p.stun ? 0.3 : 0;
  p.lean += (tilt - p.lean) * (1 - Math.exp(-10 * dt));
}

export function damagePerson(p: Person, damage: number, retaliate = true) {
  if (p.hp <= 0) return;
  p.hp = Math.max(0, p.hp - damage);
  if (retaliate) p.aggro = 20;
  if (p.hp === 0) {
    p.respawnIn = 10;
    p.down = 3;
    p.aggro = 0;
    p.swing = 0;
  }
}
export function combatStep(
  p: Person,
  dt: number,
  target: { x: number; z: number; available: boolean },
  clearLine: boolean,
) {
  p.aggro = Math.max(0, p.aggro - dt);
  p.attackCooldown = Math.max(0, p.attackCooldown - dt);
  if (p.hp <= 0 || p.stun > 0 || p.down > 0 || !target.available) {
    p.swing = 0;
    return 0;
  }
  const distance = Math.hypot(target.x - p.x, target.z - p.z);
  if (p.aggro <= 0) {
    p.swing = 0;
    return 0;
  }
  if (distance < 3) p.heading = Math.atan2(target.x - p.x, target.z - p.z);
  if (p.swing > 0) {
    p.swing = Math.max(0, p.swing - dt);
    if (p.swing === 0 && distance < 2.3 && clearLine) return 12;
  } else if (distance < 2.1 && p.attackCooldown === 0 && clearLine) {
    p.swing = 0.3;
    p.attackCooldown = 1.2;
  }
  return 0;
}

export function respawnStep(
  p: Person,
  dt: number,
  isSafe: (x: number, z: number) => boolean,
  random: () => number = Math.random,
) {
  if (p.hp > 0) return false;
  p.respawnIn = Math.max(0, p.respawnIn - dt);
  if (p.respawnIn > 1e-8) return false;
  for (let attempt = 0; attempt < 100; attempt++) {
    const x = -100 + random() * 200;
    const lanes = [-77, -53, -13, 13, 53, 77];
    const z = lanes[Math.floor(random() * lanes.length)];
    if (!isSafe(x, z)) continue;
    Object.assign(p, person(p.id, x, z));
    p.direction = random() < 0.5 ? -1 : 1;
    p.heading = (p.direction * Math.PI) / 2;
    return true;
  }
  return false;
}
