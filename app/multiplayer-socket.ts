import type {
  Peer,
  PresenceState,
  Connection,
  ChatMessage,
} from './multiplayer';
type Options = { name?: string; room?: string; createRoom?: boolean };
export function connectSocketGuests(
  snapshot: () => PresenceState,
  change: (c: Connection) => void,
  peers: (p: Peer[]) => void,
  damage: (amount: number) => void,
  chat: (m: ChatMessage[]) => void,
) {
  let socket: WebSocket | undefined,
    disposed = false,
    generation = 0,
    admin = false;
  let token = '',
    name = '',
    room = '',
    seq = 0,
    damageSeen = 0,
    after = 0;
  let emote = '',
    emoteUntil = 0,
    ready = false,
    failures = 0,
    lastReceived = 0;
  let options: Options = {},
    history: ChatMessage[] = [];
  let retry: ReturnType<typeof setTimeout> | undefined;
  let interval: ReturnType<typeof setInterval> | undefined;
  const pending = new Map<
    string,
    {
      resolve: () => void;
      reject: (e: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  let onTeleport: (p: {
    x: number;
    z: number;
    scene: string;
    heading: number;
    y?: number;
    train?: boolean;
  }) => void = () => {};
  let duel:Connection['duel']=null,offer:Connection['offer']=null,lossSeen=0;
  let onDuelLoss=()=>{};
  const report = (status: Connection['status'], error = '', count = 0) =>
    change({ status, error, count, name, room, admin,duel,offer });
  const send = (data: unknown) => {
    if (socket?.readyState !== WebSocket.OPEN || socket.bufferedAmount > 65536)
      return false;
    socket.send(JSON.stringify(data));
    return true;
  };
  const sync = () => {
    if (!ready) return;
    const state = snapshot();
    send({
      op: 'sync',
      seq: ++seq,
      after,
      state: {
        ...state,
        armed: !!state.armed,
        hp: state.hp ?? 100,
        damageAck: damageSeen,
        emote: Date.now() < emoteUntil ? emote : '',
      },
    });
  };
  const rejectPending = () => {
    for (const p of pending.values()) {
      clearTimeout(p.timer);
      p.reject(new Error('연결이 끊겼습니다. 다시 보내 주세요.'));
    }
    pending.clear();
  };
  function open(g: number) {
    if (disposed || g !== generation) return;
    ready = false;
    admin = false;
    const ws = new WebSocket(
      `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`,
    );
    socket = ws;
    lastReceived = Date.now();
    let fatal = false;
    ws.onopen = () => {
      if (g !== generation) {
        ws.close();
        return;
      }
      send({ op: 'join', ...options, token: token || undefined });
    };
    ws.onmessage = (event) => {
      if (g !== generation || disposed) return;
      lastReceived = Date.now();
      const data = JSON.parse(event.data);
      if (data.type === 'teleport') {
        onTeleport(data.destination);
        sync();
        return;
      }
      if (data.type === 'kicked') {
        fatal = true;
        ready = false;
        admin = false;
        token = '';
        peers([]);
        report('offline', data.error);
        ws.close();
        return;
      }
      if (data.type === 'joined') {
        if(!data.resumed){lossSeen=0;duel=offer=null;}
        if (!data.resumed) {
          damageSeen = 0;
          after = 0;
          history = [];
          chat([]);
        }
        token = data.token;
        name = data.name;
        room = data.room;
        seq = data.seq;
        options = { name, room: room === 'PUBLIC' ? '' : room };
        try {
          localStorage.setItem('seongsu-guest-name', name);
        } catch {}
        ready = true;
        failures = 0;
        sync();
        report('online', '', 1);
      } else if (data.type === 'snapshot' && ready) {
        admin = data.admin === true;
        duel=data.duel;offer=data.offer;
        if((data.losses||0)>lossSeen){lossSeen=data.losses;onDuelLoss();}
        if (data.vitals.damageTotal > damageSeen) {
          const amount = data.vitals.damageTotal - damageSeen;
          damageSeen = data.vitals.damageTotal;
          damage(amount);
        }
        const fresh = (data.messages as ChatMessage[]).filter(
          (m) => m.id > after,
        );
        if (fresh.length) {
          history = [...history, ...fresh].slice(-60);
          after = history[history.length - 1].id;
          chat(history);
        }
        peers(data.peers);
        report('online', '', data.count);
      } else if (data.type === 'ack' || data.type === 'error') {
        const p = pending.get(data.requestId);
        if (p) {
          clearTimeout(p.timer);
          pending.delete(data.requestId);
          if (data.type === 'error') p.reject(new Error(data.error));
          else p.resolve();
        }
        if (data.joining) {
          fatal = data.status < 500;
          report(fatal ? 'offline' : 'reconnecting', data.error);
          ws.close();
        }
      }
    };
    ws.onerror = () => {};
    ws.onclose = (event) => {
      if (g !== generation || disposed) return;
      ready = false;
      peers([]);
      rejectPending();
      clearInterval(interval);
      admin = false;
      if (event.code === 4003) {
        fatal = true;
        token = '';
        report('offline', '관리자에 의해 퇴장되었습니다.');
      }
      if (!fatal) {
        report('reconnecting', '연결을 다시 시도합니다.');
        retry = setTimeout(
          () => open(g),
          Math.min(10000, 500 * 2 ** Math.min(failures++, 5)) +
            Math.random() * 300,
        );
      }
    };
    clearInterval(interval);
    interval = setInterval(() => {
      if (Date.now() - lastReceived > 10000) {
        ws.close();
        return;
      }
      sync();
    }, 50);
  }
  function command(op: string, args: Record<string, unknown>) {
    if (!ready) return Promise.reject(new Error('먼저 거리에 접속하세요.'));
    const requestId = crypto.randomUUID();
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error('응답을 확인하지 못했습니다.'));
      }, 5000);
      pending.set(requestId, { resolve, reject, timer });
      if (!send({ op, ...args, requestId })) {
        clearTimeout(timer);
        pending.delete(requestId);
        reject(new Error('연결을 확인하세요.'));
      }
    });
  }
  return {
    onDuelLoss:(callback:()=>void)=>{onDuelLoss=callback;},
    duel:(op:string,target?:string)=>command('duel-'+op,{target}),
    onTeleport: (callback: typeof onTeleport) => {
      onTeleport = callback;
    },
    teleport: (target: string) => command('teleport', { target }),
    admin: (code: string) => command('admin', { code }),
    kick: (target: string) => command('kick', { target }),
    join: async (next: Options = {}) => {
      const g = ++generation;
      clearTimeout(retry);
      clearInterval(interval);
      rejectPending();
      if (ready) send({ op: 'leave' });
      socket?.close();
      token = '';
      name = next.name || '';
      room = next.room || '';
      ready = false;
      options = next;
      damageSeen = after = seq = 0;
      history = [];
      peers([]);
      chat([]);
      report('joining');
      open(g);
    },
    attack: (target: string, kind: 'gun' | 'punch') => {
      if (!ready) return;
      sync();
      send({ op: 'attack', target, kind, attackId: crypto.randomUUID() });
    },
    sendChat: async (text: string) => {
      if (!ready) throw new Error('먼저 거리에 접속하세요.');
      const requestId = crypto.randomUUID();
      return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(requestId);
          reject(new Error('전송을 확인하지 못했습니다.'));
        }, 5000);
        pending.set(requestId, { resolve, reject, timer });
        if (!send({ op: 'chat', text, requestId })) {
          clearTimeout(timer);
          pending.delete(requestId);
          reject(new Error('잠시 후 다시 보내 주세요.'));
        }
      });
    },
    emote: (value: string) => {
      emote = value;
      emoteUntil = Date.now() + 3500;
      sync();
    },
    dispose: () => {
      disposed = true;
      generation++;
      clearTimeout(retry);
      clearInterval(interval);
      if (ready) send({ op: 'leave' });
      socket?.close();
      rejectPending();
      peers([]);
    },
  };
}
