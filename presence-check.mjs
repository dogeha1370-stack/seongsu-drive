import assert from 'node:assert/strict';
const endpoint = 'http://localhost:3000/api/presence',
  tokens = [];
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function call(data, status = 200) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  assert.equal(response.status, status, result.error);
  return result;
}
async function join(options = {}) {
  const p = await call({ op: 'join', ...options });
  tokens.push(p.token);
  return p;
}
const state = {
  x: 15,
  z: 5,
  heading: 1.2,
  speed: 12,
  mode: 'walk',
  inside: false,
  emote: '👋',
};
try {
  const a = await join({ name: '연결확인 A', createRoom: true }),
    b = await join({ name: '연결확인 B', room: a.room }),
    c = await join({ createRoom: true });
  assert.match(c.name, /성수산책가-/);
  assert.equal(b.room, a.room);
  assert(b.peers.some((p) => p.id === a.id));
  assert(!c.peers.some((p) => p.id === a.id));
  await pause(180);
  await call({ op: 'sync', token: b.token, seq: 1, state });
  const snapshot = await call({
    op: 'sync',
    token: a.token,
    seq: 1,
    state: { ...state, x: 5 },
  });
  const peer = snapshot.peers.find((p) => p.id === b.id);
  assert.equal(peer.x, 15);
  assert.equal(peer.emote, '👋');
  assert(!('token' in peer));
  assert(!('token_hash' in peer));
  await call({ op: 'sync', token: 'x'.repeat(72), seq: 1, state }, 401);
  await call({ op: 'join', room: 'NOTAROOM' }, 404);
  await pause(180);
  await call(
    { op: 'sync', token: b.token, seq: 2, state: { ...state, x: 'bad' } },
    400,
  );
  await call({
    op: 'sync',
    token: b.token,
    seq: 2,
    state: { ...state, inside: true },
  });
  const home = await call({ op: 'sync', token: a.token, seq: 2, state });
  assert.equal(home.peers.find((p) => p.id === b.id).scene, 'home:' + b.id);
  await call({ op: 'leave', token: b.token });
  await pause(180);
  const left = await call({ op: 'sync', token: a.token, seq: 3, state });
  assert(!left.peers.some((p) => p.id === b.id));
  await pause(12100);
  await call({ op: 'sync', token: c.token, seq: 1, state }, 401);
  const rejoined = await join({ name: a.name, room: a.room });
  assert.equal(rejoined.room, a.room);
  console.log(
    'PASS real D1 presence: named/automatic guests, friend-room isolation, movement, gestures, private homes, token protection, invalid packets, departure, expiry and rejoin.',
  );
} finally {
  await Promise.all(
    tokens.map((token) => call({ op: 'leave', token }).catch(() => {})),
  );
}
