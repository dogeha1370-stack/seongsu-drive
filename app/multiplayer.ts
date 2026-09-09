import { connectSocketGuests } from './multiplayer-socket';
export type Peer = {
  id: string;
  name: string;
  scene: string;
  x: number;
  z: number;
  heading: number;
  speed: number;
  mode: 'walk' | 'bike' | 'car';
  emote: string;
  hp?: number;
  at?: number;
};
export type ChatMessage = {
  id: number;
  sender: string;
  name: string;
  text: string;
  at: number;
};
export type PresenceState = {
  hp?: number;
  armed?: boolean;
  scene?: string;
  x: number;
  z: number;
  heading: number;
  speed: number;
  mode: 'walk' | 'bike' | 'car';
  inside: boolean;
  emote: string;
};
export type Connection = {
  status: 'offline' | 'joining' | 'online' | 'reconnecting';
  name: string;
  room: string;
  count: number;
  error: string;
};
class ConnectionError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export function connectGuests(
  snapshot: () => PresenceState,
  change: (value: Connection) => void,
  peers: (value: Peer[]) => void,
  damage: (amount: number) => void = () => {},
  chat: (messages: ChatMessage[]) => void = () => {},
) {
  if (typeof __EC2__ !== 'undefined' && __EC2__)
    return connectSocketGuests(snapshot, change, peers, damage, chat);
  let damageSeen = 0,
    messageAfter = 0;
  let history: ChatMessage[] = [];
  const attacks: { target: string; kind: 'gun' | 'punch'; attackId: string }[] =
    [];
  let token = '',
    name = '',
    room = '',
    seq = 0,
    generation = 0,
    timer: ReturnType<typeof setTimeout> | undefined,
    closed = false,
    emote = '',
    emoteUntil = 0,
    lastOnline = 0;
  const report = (status: Connection['status'], error = '', count = 1) =>
    change({ status, name, room, count, error });
  async function post(body: unknown) {
    const response = await fetch('/api/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(6500),
    });
    const result = (await response.json()) as {
      id: string;
      token: string;
      name: string;
      room: string;
      peers: Peer[];
      vitals?: { damageTotal: number; hp: number };
      messages?: ChatMessage[];
      error?: string;
    };
    if (!response.ok)
      throw new ConnectionError(
        result.error || '서버와 연결하지 못했습니다.',
        response.status,
      );
    return result;
  }
  function receive(result: {
    peers: Peer[];
    vitals?: { damageTotal: number };
    messages?: ChatMessage[];
  }) {
    if (result.vitals && result.vitals.damageTotal > damageSeen) {
      const delta = result.vitals.damageTotal - damageSeen;
      damageSeen = result.vitals.damageTotal;
      damage(delta);
    }
    if (result.messages?.length) {
      const fresh = result.messages.filter((m) => m.id > messageAfter);
      if (fresh.length) {
        history = [...history, ...fresh].slice(-60);
        messageAfter = history[history.length - 1].id;
        chat(history);
      }
    }
    peers(result.peers);
  }
  async function sync(g: number) {
    if (closed || g !== generation || !token) return;
    const started = performance.now();
    try {
      const state = snapshot();
      state.emote = Date.now() < emoteUntil ? emote : '';
      const result = await post({
        op: 'sync',
        token,
        seq: ++seq,
        state: { ...state, damageAck: damageSeen },
        after: messageAfter,
      });
      if (closed || g !== generation) return;
      lastOnline = Date.now();
      receive(result);
      report('online', '', result.peers.length + 1);
      const attack = attacks.shift();
      if (attack)
        await post({ op: 'attack', token, ...attack }).catch(() => {});
      if (!closed && g === generation)
        timer = setTimeout(
          () => sync(g),
          Math.max(110, 180 - (performance.now() - started)),
        );
    } catch (error) {
      if (closed || g !== generation) return;
      if (error instanceof ConnectionError && error.status === 401) {
        void join({ name, room: room === 'PUBLIC' ? '' : room });
        return;
      }
      if (Date.now() - lastOnline > 12000) peers([]);
      report(
        'reconnecting',
        error instanceof Error ? error.message : '연결을 다시 시도합니다.',
      );
      timer = setTimeout(() => sync(g), 1800);
    }
  }
  async function join(
    options: { name?: string; room?: string; createRoom?: boolean } = {},
  ) {
    const g = ++generation;
    clearTimeout(timer);
    const old = token;
    token = '';
    damageSeen = messageAfter = 0;
    history = [];
    attacks.length = 0;
    chat([]);
    peers([]);
    if (old) void post({ op: 'leave', token: old }).catch(() => {});
    report('joining');
    try {
      const result = await post({ op: 'join', ...options });
      if (closed || g !== generation) {
        void post({ op: 'leave', token: result.token }).catch(() => {});
        return;
      }
      token = result.token;
      name = result.name;
      room = result.room;
      seq = 0;
      try {
        localStorage.setItem('seongsu-guest-name', name);
      } catch {}
      lastOnline = Date.now();
      receive(result);
      report('online', '', result.peers.length + 1);
      timer = setTimeout(() => sync(g), 160);
    } catch (error) {
      if (closed || g !== generation) return;
      const transient =
        !(error instanceof ConnectionError) || error.status >= 500;
      report(
        transient ? 'reconnecting' : 'offline',
        error instanceof Error ? error.message : '접속하지 못했습니다.',
        0,
      );
      if (transient)
        timer = setTimeout(() => {
          if (!closed && g === generation) void join(options);
        }, 2500);
    }
  }
  return {
    join,
    attack: (target: string, kind: 'gun' | 'punch') => {
      if (token && !closed && attacks.length < 3)
        attacks.push({ target, kind, attackId: crypto.randomUUID() });
    },
    sendChat: async (text: string) => {
      if (!token || closed) throw new Error('먼저 거리에 접속하세요.');
      await post({ op: 'chat', token, text });
    },
    emote: (value: string) => {
      emote = value;
      emoteUntil = Date.now() + 3500;
    },
    dispose: () => {
      closed = true;
      generation++;
      clearTimeout(timer);
      peers([]);
      if (token)
        void fetch('/api/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ op: 'leave', token }),
          keepalive: true,
        }).catch(() => {});
      token = '';
    },
  };
}
