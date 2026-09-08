import assert from 'node:assert/strict';
const origin = 'http://localhost:3000',
  tokens = [];
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(body, status = 200) {
  const r = await fetch(origin + '/api/presence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(body),
  });
  const result = await r.json();
  assert.equal(r.status, status, result.error);
  return result;
}
async function join(options) {
  const p = await call({ op: 'join', ...options });
  tokens.push(p.token);
  p.seq = 0;
  return p;
}
const state = {
  x: 0,
  z: 20,
  heading: 0,
  speed: 0,
  mode: 'walk',
  inside: false,
  scene: 'outdoors',
  hp: 100,
  armed: true,
  damageAck: 0,
  emote: '',
};
const sync = async (p, extra = {}) => {
  await pause(130);
  return call({
    op: 'sync',
    token: p.token,
    seq: ++p.seq,
    state: { ...state, ...extra },
  });
};
try {
  const a = await join({ name: '전투 테스트 A', createRoom: true }),
    b = await join({ name: '전투 테스트 B', room: a.room }),
    c = await join({ name: '격리 테스트', createRoom: true });
  await pause(180);
  await sync(a);
  await sync(b, { z: 22 });
  await sync(c, { z: 22 });
  await call({ op: 'chat', token: a.token, text: '안녕 <b>친구</b> 👋' });
  const inbox = await sync(b, { z: 22 });
  assert(inbox.messages.some((m) => m.text === '안녕 <b>친구</b> 👋'));
  const isolated = await sync(c, { z: 22 });
  assert.equal(isolated.messages.length, 0);
  await call({ op: 'chat', token: a.token, text: 'x'.repeat(181) }, 400);
  await call(
    {
      op: 'attack',
      token: a.token,
      target: c.id,
      kind: 'gun',
      attackId: crypto.randomUUID(),
    },
    409,
  );
  await pause(3100);
  const hit = {
    op: 'attack',
    token: a.token,
    target: b.id,
    kind: 'punch',
    attackId: crypto.randomUUID(),
  };
  await call(hit);
  await call(hit);
  const injured = await sync(b, { z: 22 });
  assert.equal(injured.vitals.damageTotal, 25);
  assert.equal(injured.vitals.hp, 75);
  await pause(180);
  const acknowledged = await sync(b, { z: 22, hp: 75, damageAck: 25 });
  assert.equal(acknowledged.vitals.hp, 75);
  for (let i = 0; i < 3; i++) {
    await pause(500);
    await call({
      op: 'attack',
      token: a.token,
      target: b.id,
      kind: 'gun',
      attackId: crypto.randomUUID(),
    });
  }
  const dead = await sync(b, { z: 22, hp: 75, damageAck: 25 });
  assert.equal(dead.vitals.hp, 0);
  assert.equal(dead.vitals.damageTotal, 130);
  const other = await sync(a);
  assert.equal(other.peers.find((p) => p.id === b.id).hp, 0);
  await pause(180);
  const revive = await sync(b, { z: 22, hp: 100, damageAck: 130 });
  assert.equal(revive.vitals.hp, 100);
  await call(
    {
      op: 'attack',
      token: a.token,
      target: b.id,
      kind: 'gun',
      attackId: crypto.randomUUID(),
    },
    409,
  );
  await pause(180);
  await call({ op: 'sync', token: b.token, seq: b.seq, state }, 409);
  console.log(
    'PASS real server chat delivery/room isolation/length validation; PvP punch and gun, duplicate-hit protection, health acknowledgement, death, recovery protection and replay rejection.',
  );
} finally {
  await Promise.all(
    tokens.map((token) => call({ op: 'leave', token }).catch(() => {})),
  );
}
