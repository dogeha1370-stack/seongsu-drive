import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import { Rooms } from './rooms.mjs';

export function createGameServer({ root = fileURLToPath(new URL('../dist-ec2/client', import.meta.url)), origins = ['http://localhost:3000'], maxConnections = 260 } = {}) {
  const rooms = new Rooms(), allowed = new Set(origins), base = resolve(root);
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.url === '/healthz') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ ok: true })); return; }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      let file = resolve(base, '.' + pathname);
      if (file !== base && !file.startsWith(base + sep)) { res.writeHead(403); res.end(); return; }
      if (pathname === '/') file = resolve(base, 'index.html');
      const info = await stat(file);
      if (!info.isFile()) throw new Error('not file');
      res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
      res.setHeader('Content-Length', info.size);
      res.setHeader('Cache-Control', pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
      if (req.method === 'HEAD') res.end(); else createReadStream(file).on('error', () => res.destroy()).pipe(res);
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096, perMessageDeflate: false });
  server.on('upgrade', (req, socket, head) => {
    socket.on('error', () => {});
    if (req.url !== '/ws' || !allowed.has(req.headers.origin) || wss.clients.size >= maxConnections) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return;
    }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws));
  });
  const send = (ws, value) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    if (ws.bufferedAmount > 256 * 1024) { ws.terminate(); return; }
    ws.send(JSON.stringify(value));
  };
  wss.on('connection', ws => {
    const started = Date.now();
    let p, after = 0, budget = 0, budgetAt = started, admin = false, lastAdminAttempt = 0;
    ws.alive = true;
    ws.on('pong', () => { ws.alive = true; if (p) p.at = Date.now(); });
    ws.on('error', () => {});
    ws.on('close', () => { if (p?.socket === ws) { p.socket = null; p.at = Date.now(); } });
    ws.on('message', (raw, binary) => {
      let data;
      try {
        const now = Date.now();
        if (now - budgetAt >= 1000) { budget = 0; budgetAt = now; }
        if (++budget > 45 || binary) { ws.close(1008, 'Rate limit'); return; }
        data = JSON.parse(raw.toString());
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('잘못된 요청입니다.');
        if (data.op === 'join' && !p) {
          p = typeof data.token === 'string' ? rooms.resume(data.token, ws) : null;
          const resumed = !!p;
          p ||= rooms.join(data, ws);
          send(ws, { type: 'joined', id: p.id, token: p.token, name: p.name, room: p.room, seq: p.seq, resumed, damageTotal: p.damageTotal });
        } else {
          if (!p || p.socket !== ws) throw new Error('먼저 접속하세요.');
          if (data.op === 'admin') {
            if (now - lastAdminAttempt < 1500) rooms.fail('잠시 후 다시 시도하세요.',429);
            lastAdminAttempt = now;
            if (typeof data.code !== 'string' || data.code !== (process.env.ADMIN_CODE || '123123123')) rooms.fail('관리자 코드가 올바르지 않습니다.',403);
            admin = true;
          }
          else if (data.op === 'kick') {
            if (!admin) rooms.fail('관리자 권한이 필요합니다.',403);
            const target = rooms.rooms.get(p.room)?.members.get(data.target);
            if (!target || target === p) rooms.fail('추방할 접속자를 찾을 수 없습니다.',404);
            const targetSocket = target.socket;
            rooms.leave(target); target.socket = null;
            if (targetSocket) { send(targetSocket,{type:'kicked',error:'관리자에 의해 퇴장되었습니다.'});targetSocket.close(4003,'Kicked'); }
          }
          else if (data.op === 'teleport') {
            const target = rooms.rooms.get(p.room)?.members.get(data.target);
            if (!target?.socket || target === p || p.hp <= 0 || target.hp <= 0) rooms.fail('이동할 친구를 찾을 수 없습니다.',404);
            send(ws,{type:'teleport',destination:{x:target.x,z:target.z,scene:target.scene,heading:target.heading,y:target.y||0,train:!!target.train}});
          }
          else if (data.op === 'sync') rooms.sync(p, data);
          else if (data.op === 'chat') rooms.chat(p, data.text);
          else if (data.op === 'attack') rooms.attack(p, data);
          else if (data.op === 'leave') { rooms.leave(p); p = null; ws.close(1000); return; }
          else throw new Error('잘못된 요청입니다.');
          if (Number.isSafeInteger(data.after) && data.after >= 0) after = data.after;
          if (data.requestId) send(ws, { type: 'ack', requestId: data.requestId });
        }
      } catch (error) { send(ws, { type: 'error', requestId: data?.requestId, error: error.message, status: error.status || 400, joining: !p }); }
    });
    ws.publish = () => {
      if (p?.socket === ws) send(ws, {...rooms.snapshot(p, after), admin});
      else if (!p && Date.now() - started > 10000) ws.close(1008, 'Join timeout');
    };
  });
  const tick = setInterval(() => { for (const ws of wss.clients) ws.publish(); }, 50);
  const heartbeat = setInterval(() => {
    rooms.sweep();
    for (const ws of wss.clients) { if (!ws.alive) ws.terminate(); else { ws.alive = false; ws.ping(); } }
  }, 10000);
  return { server, rooms, async close() { clearInterval(tick); clearInterval(heartbeat); for (const ws of wss.clients) ws.terminate(); await new Promise(r => wss.close(r)); await new Promise(r => server.close(r)); } };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.env.STATIC_DIR || fileURLToPath(new URL('../dist-ec2/client', import.meta.url));
  if (!existsSync(resolve(root, 'index.html'))) throw new Error('Run npm run build:ec2 first.');
  const origins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(s => s.trim()).filter(Boolean);
  const game = createGameServer({ root, origins });
  game.server.listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1', () => console.log('Seongsu Drive listening on port ' + (process.env.PORT || 3000)));
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { void game.close().then(() => process.exit(0)); });
}
