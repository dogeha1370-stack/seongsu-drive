import { env } from 'cloudflare:workers';
type Member = { id: string; room: string; name: string };
type Fighter = Member & {
  x: number;
  z: number;
  heading: number;
  scene: string;
  updated_at: number;
  hp: number;
  armed: number;
  protected_until: number;
};
const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
export const featureSchema = () => [
  env.DB.prepare(
    'CREATE TABLE IF NOT EXISTS presence_vitals(id TEXT PRIMARY KEY,hp REAL NOT NULL DEFAULT 100,damage_total INTEGER NOT NULL DEFAULT 0,armed INTEGER NOT NULL DEFAULT 0,last_attack INTEGER NOT NULL DEFAULT 0,last_chat INTEGER NOT NULL DEFAULT 0,protected_until INTEGER NOT NULL DEFAULT 0)',
  ),
  env.DB.prepare(
    'CREATE TABLE IF NOT EXISTS presence_chat(id INTEGER PRIMARY KEY AUTOINCREMENT,room TEXT NOT NULL,sender TEXT NOT NULL,name TEXT NOT NULL,text TEXT NOT NULL,created_at INTEGER NOT NULL)',
  ),
  env.DB.prepare(
    'CREATE INDEX IF NOT EXISTS presence_chat_room ON presence_chat(room,id)',
  ),
  env.DB.prepare(
    'CREATE TABLE IF NOT EXISTS presence_hits(id TEXT PRIMARY KEY,attacker TEXT NOT NULL,target TEXT NOT NULL,created_at INTEGER NOT NULL)',
  ),
];
export async function extras(member: Member, after = 0) {
  const results = await env.DB.batch([
    env.DB.prepare(
      'SELECT damage_total AS damageTotal,hp FROM presence_vitals WHERE id=?',
    ).bind(member.id),
    env.DB.prepare(
      'SELECT * FROM (SELECT id,sender,name,text,created_at AS at FROM presence_chat WHERE room=? AND id>? ORDER BY id DESC LIMIT 50) ORDER BY id',
    ).bind(member.room, Number.isSafeInteger(after) && after >= 0 ? after : 0),
  ]);
  return {
    vitals: results[0].results[0] || { damageTotal: 0, hp: 100 },
    messages: results[1].results,
  };
}
export function clearShot(
  a: { x: number; z: number },
  b: { x: number; z: number },
) {
  const distance = Math.hypot(b.x - a.x, b.z - a.z);
  for (let t = 0.5; t < distance; t += 0.7) {
    const x = a.x + ((b.x - a.x) * t) / distance,
      z = a.z + ((b.z - a.z) * t) / distance;
    if (
      [-100, -40, 40, 100].some((bx) => Math.abs(x - bx) < 15.5) &&
      [-96, -36, 36, 96].some((bz) => Math.abs(z - bz) < 17.5)
    )
      return false;
  }
  return true;
}
export async function featureAction(
  data: Record<string, unknown>,
  member: Member,
  now: number,
): Promise<Response | null> {
  if (data.op === 'chat') {
    if (typeof data.text !== 'string')
      return json({ error: '메시지를 입력하세요.' }, 400);
    const text = data.text
      .normalize('NFC')
      .replace(/[\p{C}]/gu, '')
      .trim();
    if (!text || Array.from(text).length > 180)
      return json({ error: '메시지는 1~180자로 입력하세요.' }, 400);
    const allowed = await env.DB.prepare(
      'UPDATE presence_vitals SET last_chat=? WHERE id=? AND last_chat<=? RETURNING id',
    )
      .bind(now, member.id, now - 800)
      .first();
    if (!allowed) return json({ error: '잠시 후 메시지를 보내 주세요.' }, 429);
    await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO presence_chat(room,sender,name,text,created_at) VALUES(?,?,?,?,?)',
      ).bind(member.room, member.id, member.name, text, now),
      env.DB.prepare(
        'DELETE FROM presence_chat WHERE room=? AND id NOT IN (SELECT id FROM presence_chat WHERE room=? ORDER BY id DESC LIMIT 100)',
      ).bind(member.room, member.room),
    ]);
    return json({ ok: true });
  }
  if (data.op !== 'attack') return null;
  if (
    typeof data.target !== 'string' ||
    typeof data.attackId !== 'string' ||
    !/^[-a-f0-9]{36}$/.test(data.attackId) ||
    !['gun', 'punch'].includes(String(data.kind))
  )
    return json({ error: '잘못된 공격입니다.' }, 400);
  const prior = await env.DB.prepare(
    'SELECT id FROM presence_hits WHERE id=? AND attacker=?',
  )
    .bind(data.attackId, member.id)
    .first();
  if (prior) return json({ ok: true });
  const fighters = await env.DB.prepare(
    'SELECT p.id,p.room,p.name,p.x,p.z,p.heading,p.scene,p.updated_at,v.hp,v.armed,v.protected_until FROM presence_players p JOIN presence_vitals v ON v.id=p.id WHERE p.id IN (?,?)',
  )
    .bind(member.id, data.target)
    .all<Fighter>();
  const a = fighters.results.find((p) => p.id === member.id),
    b = fighters.results.find((p) => p.id === data.target);
  const gun = data.kind === 'gun';
  if (
    !a ||
    !b ||
    a.id === b.id ||
    a.room !== b.room ||
    a.scene !== b.scene ||
    a.scene.startsWith('home:') ||
    a.hp <= 0 ||
    b.hp <= 0 ||
    b.updated_at < now - 12000 ||
    b.protected_until > now ||
    a.protected_until > now ||
    (gun && !a.armed)
  )
    return json({ error: '지금 공격할 수 없는 대상입니다.' }, 409);
  const dx = b.x - a.x,
    dz = b.z - a.z,
    d = Math.hypot(dx, dz);
  if (
    d > (gun ? 65 : 3.3) ||
    (d > 0 &&
      (Math.sin(a.heading) * dx + Math.cos(a.heading) * dz) / d <
        (gun ? 0.75 : 0.1)) ||
    (a.scene === 'outdoors' && !clearShot(a, b))
  )
    return json({ error: '대상이 사거리 밖이거나 가려져 있습니다.' }, 409);
  const ready = await env.DB.prepare(
    'UPDATE presence_vitals SET last_attack=? WHERE id=? AND last_attack<=? RETURNING id',
  )
    .bind(now, a.id, now - (gun ? 250 : 450))
    .first();
  if (!ready) return json({ error: '다음 공격을 기다려 주세요.' }, 429);
  const amount = gun ? 35 : 25;
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO presence_hits(id,attacker,target,created_at) VALUES(?,?,?,?)',
    ).bind(data.attackId, a.id, b.id, now),
    env.DB.prepare(
      'UPDATE presence_vitals SET hp=MAX(0,hp-?),damage_total=damage_total+? WHERE id=? AND hp>0',
    ).bind(amount, amount, b.id),
  ]);
  return json({ ok: true, damage: amount });
}
