import { randomUUID, randomInt } from 'node:crypto';

export class Rooms {
  constructor() { this.rooms = new Map(); this.sessions = new Map(); this.messageId = 0; }
  fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }
  join(data, socket, now = Date.now()) {
    this.sweep(now);
    if (this.sessions.size >= 240) this.fail('서버가 가득 찼습니다.', 503);
    if (data.name !== undefined && typeof data.name !== 'string') this.fail('이름을 확인하세요.');
    const requested = (data.name || '').normalize('NFC').replace(/[\p{C}]/gu, '').trim();
    if ([...requested].length > 16) this.fail('이름은 16자 이내로 입력하세요.');
    let code = 'PUBLIC';
    if (data.createRoom) {
      do { code = Array.from({ length: 8 }, () => '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'[randomInt(31)]).join(''); } while (this.rooms.has(code));
    } else if (data.room) {
      if (typeof data.room !== 'string') this.fail('방 코드를 확인하세요.');
      code = data.room.trim().toUpperCase();
      if (!this.rooms.has(code)) this.fail('찾을 수 없는 방 코드입니다.', 404);
    }
    let room = this.rooms.get(code);
    if (!room) { room = { members: new Map(), messages: [], emptyAt: now }; this.rooms.set(code, room); }
    if (room.members.size >= 24) this.fail('방이 가득 찼습니다.', 409);
    const p = { id: randomUUID(), token: randomUUID() + randomUUID(), room: code,
      name: requested || `성수산책가-${String(randomInt(10000)).padStart(4, '0')}`,
      x: -40, z: -69, heading: 0, speed: 0, mode: 'walk', scene: 'outdoors', emote: '',
      hp: 100, damageTotal: 0, armed: false, seq: 0, at: now, protectedUntil: now + 3000,
      lastAttack: 0, lastChat: 0, hits: new Map(), socket };
    room.members.set(p.id, p); this.sessions.set(p.token, p);
    return p;
  }
  resume(token, socket, now = Date.now()) {
    const p = this.sessions.get(token);
    if (!p || now - p.at > 30000) return null;
    p.socket?.close(4001, 'Reconnected'); p.socket = socket; p.at = now;
    return p;
  }
  leave(p, now = Date.now()) {
    this.sessions.delete(p.token);
    const room = this.rooms.get(p.room);
    room?.members.delete(p.id);
    if (room && !room.members.size) room.emptyAt = now;
  }
  sweep(now = Date.now()) {
    for (const p of this.sessions.values()) if (now - p.at > 30000) { p.socket?.terminate(); this.leave(p, now); }
    for (const [code, room] of this.rooms) if (!room.members.size && now - room.emptyAt > 300000) this.rooms.delete(code);
  }
  sync(p, data, now = Date.now()) {
    const s = data.state;
    if (!s || ![s.x, s.z, s.heading, s.speed, s.hp].every(Number.isFinite) ||
      Math.abs(s.x) > 115 || Math.abs(s.z) > 115 || Math.abs(s.heading) > 100 || s.speed < 0 || s.speed > 200 ||
      s.hp < 0 || s.hp > 100 || !Number.isSafeInteger(s.damageAck) || s.damageAck < 0 || s.damageAck > p.damageTotal ||
      !['walk', 'bike', 'car'].includes(s.mode) || typeof s.inside !== 'boolean' || typeof s.armed !== 'boolean' ||
      !['outdoors', 'office:1', 'office:2'].includes(s.scene || 'outdoors') ||
      !['', '👋', '😄', '배달 가자!', '잠깐만!'].includes(s.emote || '') ||
      !Number.isSafeInteger(data.seq) || data.seq <= p.seq) this.fail('위치 정보가 올바르지 않습니다.');
    if (p.hp <= 0 && s.hp > 0 && s.damageAck === p.damageTotal) p.protectedUntil = now + 3000;
    Object.assign(p, { x: s.x, z: s.z, heading: s.heading, speed: s.speed, mode: s.mode,
      scene: s.inside ? `home:${p.id}` : s.scene || 'outdoors', emote: s.emote || '',
      hp: Math.max(0, s.hp - (p.damageTotal - s.damageAck)), armed: s.armed, seq: data.seq, at: now });
  }
  chat(p, value, now = Date.now()) {
    if (typeof value !== 'string') this.fail('메시지를 입력하세요.');
    const text = value.normalize('NFC').replace(/[\p{C}]/gu, '').trim();
    if (!text || [...text].length > 180) this.fail('메시지는 1~180자로 입력하세요.');
    if (now - p.lastChat < 800) this.fail('잠시 후 메시지를 보내 주세요.', 429);
    p.lastChat = now;
    const room = this.rooms.get(p.room);
    room.messages.push({ id: ++this.messageId, sender: p.id, name: p.name, text, at: now });
    room.messages = room.messages.slice(-60);
  }
  attack(a, data, now = Date.now()) {
    if (!['gun', 'punch'].includes(data.kind) || typeof data.attackId !== 'string' || !/^[-a-f0-9]{36}$/.test(data.attackId)) this.fail('잘못된 공격입니다.');
    for (const [id, at] of a.hits) if (now - at > 60000) a.hits.delete(id);
    if (a.hits.has(data.attackId)) return;
    const b = this.rooms.get(a.room)?.members.get(data.target), gun = data.kind === 'gun';
    if (!b || b === a || a.scene !== b.scene || a.scene.startsWith('home:') || a.hp <= 0 || b.hp <= 0 ||
      !b.socket || now - b.at > 12000 || a.protectedUntil > now || b.protectedUntil > now || (gun && !a.armed)) this.fail('지금 공격할 수 없는 대상입니다.', 409);
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
    if (d > (gun ? 65 : 3.3) || (d > 0 && (Math.sin(a.heading) * dx + Math.cos(a.heading) * dz) / d < (gun ? 0.75 : 0.1))) this.fail('사거리 밖입니다.', 409);
    if (a.scene === 'outdoors') for (let t = 0.5; t < d; t += 0.7) {
      const x = a.x + dx * t / d, z = a.z + dz * t / d;
      if ([-100, -40, 40, 100].some(v => Math.abs(x - v) < 15.5) && [-96, -36, 36, 96].some(v => Math.abs(z - v) < 17.5)) this.fail('대상이 가려져 있습니다.', 409);
    }
    if (now - a.lastAttack < (gun ? 250 : 450)) this.fail('다음 공격을 기다려 주세요.', 429);
    a.lastAttack = now; a.hits.set(data.attackId, now);
    const amount = Math.min(b.hp, gun ? 35 : 25);
    b.hp -= amount; b.damageTotal += amount;
  }
  snapshot(p, after = 0) {
    const room = this.rooms.get(p.room);
    return { type: 'snapshot', peers: [...room.members.values()].filter(b => b !== p && b.socket && !b.scene.startsWith('home:')).map(b => ({
      id: b.id, name: b.name, scene: b.scene, x: b.x, z: b.z, heading: b.heading, speed: b.speed,
      mode: b.mode, emote: b.emote, hp: b.hp, at: b.at,
    })), vitals: { hp: p.hp, damageTotal: p.damageTotal }, messages: room.messages.filter(m => m.id > after), count: [...room.members.values()].filter(b => b.socket).length };
  }
}
