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
};
export type PresenceState = {
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
) {
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
      error?: string;
    };
    if (!response.ok)
      throw new ConnectionError(
        result.error || '서버와 연결하지 못했습니다.',
        response.status,
      );
    return result;
  }
  async function sync(g: number) {
    if (closed || g !== generation || !token) return;
    try {
      const state = snapshot();
      state.emote = Date.now() < emoteUntil ? emote : '';
      const result = await post({ op: 'sync', token, seq: ++seq, state });
      if (closed || g !== generation) return;
      lastOnline = Date.now();
      peers(result.peers);
      report('online', '', result.peers.length + 1);
      timer = setTimeout(() => sync(g), 350);
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
      peers(result.peers);
      report('online', '', result.peers.length + 1);
      timer = setTimeout(() => sync(g), 350);
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
