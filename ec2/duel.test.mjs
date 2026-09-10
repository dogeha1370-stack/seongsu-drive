import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Rooms } from './rooms.mjs';
test('duel requires consent, expires, restricts scene and registers loss only for opponent kill', () => {
  const rooms = new Rooms(),
    now = Date.now(),
    socket = {};
  const a = rooms.join({ name: 'A', createRoom: true }, socket, now),
    b = rooms.join({ name: 'B', room: a.room }, socket, now),
    c = rooms.join({ name: 'C', createRoom: true }, socket, now);
  Object.assign(a, { x: 0, z: 0, heading: 0, protectedUntil: 0 });
  Object.assign(b, { x: 0, z: 1, heading: Math.PI, protectedUntil: 0 });
  assert.throws(() =>
    rooms.challenge(a, { op: 'duel-invite', target: c.id }, now),
  );
  assert.throws(() => rooms.challenge(b, { op: 'duel-accept' }, now));
  rooms.challenge(a, { op: 'duel-invite', target: b.id }, now);
  assert.equal(a.duel, null);
  assert.equal(b.offer.id, a.id);
  rooms.challenge(b, { op: 'duel-decline' }, now);
  assert.equal(b.offer, null);
  assert.equal(a.duel, null);
  rooms.challenge(a, { op: 'duel-invite', target: b.id }, now + 11000);
  rooms.challenge(b, { op: 'duel-accept' }, now + 11001);
  assert.equal(a.duel.target, b.id);
  assert.equal(b.duel.target, a.id);
  assert.throws(
    () =>
      rooms.attack(
        a,
        { target: b.id, kind: 'punch', attackId: randomUUID() },
        now + 12000,
      ),
    'three second ready protection',
  );
  b.at = now + 20000;
  for (let i = 0; i < 4; i++)
    rooms.attack(
      a,
      { target: b.id, kind: 'punch', attackId: randomUUID() },
      now + 15000 + i * 500,
    );
  assert.equal(b.hp, 0);
  assert.equal(b.losses, 1);
  assert.equal(a.losses, 0);
  assert.equal(a.duel, null);
  assert.equal(b.duel, null);
  b.hp = 100;
  b.at = now + 20000;
  for (let i = 0; i < 4; i++)
    rooms.attack(
      a,
      { target: b.id, kind: 'punch', attackId: randomUUID() },
      now + 20000 + i * 500,
    );
  assert.equal(b.losses, 1, 'ordinary PvP death never triggers duel cash loss');
  b.hp = 100;
  rooms.challenge(a, { op: 'duel-invite', target: b.id }, now + 40000);
  assert.throws(
    () => rooms.challenge(b, { op: 'duel-accept' }, now + 71000),
    'expired invitation',
  );
  rooms.challenge(a, { op: 'duel-invite', target: b.id }, now + 80000);
  rooms.challenge(b, { op: 'duel-accept' }, now + 80001);
  rooms.leave(a);
  assert.equal(b.duel, null, 'leaving clears the opponent duel');
});
