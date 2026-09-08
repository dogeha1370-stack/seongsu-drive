import { env } from 'cloudflare:workers';
import { featureSchema, featureAction, extras } from './features';
type Member = {
  id: string;
  room: string;
  name: string;
  updated_at: number;
  seq?: number;
};
const TTL = 12000,
  CAPACITY = 24;
const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
const hash = async (token: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)),
    ),
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
let schema: Promise<unknown> | undefined;
function init() {
  return (schema ??= (async () => {
    await env.DB.batch([
      ...featureSchema(),
      env.DB.prepare(
        'CREATE TABLE IF NOT EXISTS presence_rooms(code TEXT PRIMARY KEY, created_at INTEGER NOT NULL)',
      ),
      env.DB.prepare(
        "CREATE TABLE IF NOT EXISTS presence_players(id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, room TEXT NOT NULL, name TEXT NOT NULL, scene TEXT NOT NULL DEFAULT 'outdoors', x REAL NOT NULL DEFAULT -40, z REAL NOT NULL DEFAULT -69, heading REAL NOT NULL DEFAULT 0, speed REAL NOT NULL DEFAULT 0, mode TEXT NOT NULL DEFAULT 'walk', emote TEXT NOT NULL DEFAULT '', seq INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL)",
      ),
      env.DB.prepare(
        'CREATE INDEX IF NOT EXISTS presence_seen ON presence_players(room,updated_at)',
      ),
    ]);
  })().catch((error) => {
    schema = undefined;
    throw error;
  }));
}
async function peers(member: Member) {
  const result = await env.DB.prepare(
    'SELECT p.id,p.name,p.scene,p.x,p.z,p.heading,p.speed,p.mode,p.emote,p.updated_at AS at,COALESCE(v.hp,100) AS hp FROM presence_players p LEFT JOIN presence_vitals v ON v.id=p.id WHERE p.room=? AND p.id<>? AND p.updated_at>? LIMIT 24',
  )
    .bind(member.room, member.id, Date.now() - TTL)
    .all();
  return result.results;
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin)
      return json({ error: '허용되지 않은 접속입니다.' }, 403);
    if (Number(request.headers.get('content-length') || 0) > 4096)
      return json({ error: '요청이 너무 큽니다.' }, 413);
    const raw = await request.text();
    if (raw.length > 4096) return json({ error: '요청이 너무 큽니다.' }, 413);
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object')
      return json({ error: '잘못된 요청입니다.' }, 400);
    await init();
    const now = Date.now();
    if (data.op === 'join') {
      const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      let room = 'PUBLIC';
      if (data.createRoom) {
        room = Array.from(
          crypto.getRandomValues(new Uint8Array(8)),
          (b) => alphabet[b % alphabet.length],
        ).join('');
        await env.DB.prepare('INSERT INTO presence_rooms VALUES (?,?)')
          .bind(room, now)
          .run();
      } else if (data.room) {
        if (typeof data.room !== 'string')
          return json({ error: '방 코드를 확인하세요.' }, 400);
        room = data.room.trim().toUpperCase();
        if (
          !/^[A-Z2-9]{8}$/.test(room) ||
          !(await env.DB.prepare('SELECT code FROM presence_rooms WHERE code=?')
            .bind(room)
            .first())
        )
          return json({ error: '찾을 수 없는 방 코드입니다.' }, 404);
      }
      if (data.name !== undefined && typeof data.name !== 'string')
        return json({ error: '이름을 확인하세요.' }, 400);
      const requested = (data.name || '')
        .normalize('NFC')
        .replace(/[\p{C}]/gu, '')
        .trim();
      if ([...requested].length > 16)
        return json({ error: '이름은 16자 이내로 입력하세요.' }, 400);
      const id = crypto.randomUUID(),
        token = crypto.randomUUID() + crypto.randomUUID(),
        name =
          requested ||
          '성수산책가-' +
            String(
              crypto.getRandomValues(new Uint32Array(1))[0] % 10000,
            ).padStart(4, '0');
      await env.DB.prepare('DELETE FROM presence_players WHERE updated_at<?')
        .bind(now - 120000)
        .run();
      const result = await env.DB.prepare(
        'INSERT INTO presence_players(id,token_hash,room,name,updated_at) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM presence_players WHERE room=? AND updated_at>?)<?',
      )
        .bind(id, await hash(token), room, name, now, room, now - TTL, CAPACITY)
        .run();
      if (!result.meta.changes)
        return json(
          { error: '방이 가득 찼습니다. 새 친구 방을 만들어 주세요.' },
          409,
        );
      await env.DB.batch([
        env.DB.prepare(
          'INSERT INTO presence_vitals(id,protected_until) VALUES(?,?)',
        ).bind(id, now + 3000),
        env.DB.prepare(
          'DELETE FROM presence_vitals WHERE id NOT IN (SELECT id FROM presence_players)',
        ),
        env.DB.prepare('DELETE FROM presence_hits WHERE created_at<?').bind(
          now - 60000,
        ),
        env.DB.prepare('DELETE FROM presence_chat WHERE created_at<?').bind(
          now - 86400000,
        ),
      ]);
      return json({
        ...(await extras({ id, room, name })),
        id,
        token,
        name,
        room,
        peers: await peers({ id, room, name, updated_at: now }),
      });
    }
    if (typeof data.token !== 'string' || data.token.length !== 72)
      return json({ error: '접속이 만료되었습니다.' }, 401);
    const member = await env.DB.prepare(
      'SELECT id,room,name,updated_at,seq FROM presence_players WHERE token_hash=?',
    )
      .bind(await hash(data.token))
      .first<Member>();
    if (!member || now - member.updated_at > TTL)
      return json({ error: '다시 접속해 주세요.' }, 401);
    if (data.op === 'leave') {
      await env.DB.prepare('DELETE FROM presence_players WHERE id=?')
        .bind(member.id)
        .run();
      return json({ ok: true });
    }
    await env.DB.prepare('INSERT OR IGNORE INTO presence_vitals(id) VALUES(?)')
      .bind(member.id)
      .run();
    const feature = await featureAction(data, member, now);
    if (feature) return feature;
    if (data.op !== 'sync') return json({ error: '잘못된 요청입니다.' }, 400);
    const state = data.state;
    if (
      !state ||
      ![state.x, state.z, state.heading, state.speed].every(Number.isFinite) ||
      Math.abs(state.x) > 115 ||
      Math.abs(state.z) > 115 ||
      Math.abs(state.heading) > 100 ||
      state.speed < 0 ||
      state.speed > 200 ||
      !['walk', 'bike', 'car'].includes(state.mode) ||
      typeof state.inside !== 'boolean' ||
      (state.hp !== undefined &&
        (!Number.isFinite(state.hp) || state.hp < 0 || state.hp > 100)) ||
      (state.damageAck !== undefined &&
        (!Number.isSafeInteger(state.damageAck) || state.damageAck < 0)) ||
      (state.armed !== undefined && typeof state.armed !== 'boolean') ||
      (state.scene !== undefined &&
        !['outdoors', 'office:1', 'office:2'].includes(state.scene)) ||
      !Number.isSafeInteger(data.seq) ||
      data.seq < 1 ||
      !['', '👋', '😄', '배달 가자!', '잠깐만!'].includes(state.emote || '')
    )
      return json({ error: '위치 정보가 올바르지 않습니다.' }, 400);
    if (data.seq <= (member.seq ?? 0))
      return json({ error: '이미 처리한 위치입니다.' }, 409);
    if (now - member.updated_at < 100)
      return json({ error: '잠시 후 다시 연결합니다.' }, 429);
    await env.DB.prepare(
      'UPDATE presence_players SET scene=?,x=?,z=?,heading=?,speed=?,mode=?,emote=?,seq=?,updated_at=? WHERE id=? AND seq<?',
    )
      .bind(
        state.inside ? 'home:' + member.id : state.scene || 'outdoors',
        state.x,
        state.z,
        state.heading,
        state.speed,
        state.mode,
        state.emote || '',
        data.seq,
        now,
        member.id,
        data.seq,
      )
      .run();
    await env.DB.prepare(
      'UPDATE presence_vitals SET protected_until=CASE WHEN hp<=0 AND ?>0 AND ?>=damage_total THEN ? ELSE protected_until END,hp=MAX(0,?-MAX(0,damage_total-?)),armed=? WHERE id=?',
    )
      .bind(
        state.hp ?? 100,
        state.damageAck ?? 0,
        now + 3000,
        state.hp ?? 100,
        state.damageAck ?? 0,
        state.armed ? 1 : 0,
        member.id,
      )
      .run();
    return json({
      peers: await peers(member),
      ...(await extras(member, data.after)),
    });
  } catch (error) {
    console.error('Presence request failed', error);
    return json(
      {
        error:
          error instanceof SyntaxError
            ? '요청을 읽을 수 없습니다.'
            : '연결이 끊겼습니다. 잠시 후 다시 접속하세요.',
      },
      error instanceof SyntaxError ? 400 : 503,
    );
  }
}
