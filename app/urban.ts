import type { Life } from './life';
export const PERFUMES = [
  { id: 'tacit', name: '테싯', price: 199000, charm: 15 },
  { id: 'hwyl', name: '휠', price: 199000, charm: 20 },
];
export const CLOTHES = [
  {
    id: 'blue',
    name: '아더 블루 티셔츠',
    price: 85000,
    color: '#3656cd',
    charm: 8,
  },
  {
    id: 'cream',
    name: '오버핏 크림 셔츠',
    price: 125000,
    color: '#dedbc9',
    charm: 12,
  },
  {
    id: 'black',
    name: '블랙 레이어드 재킷',
    price: 185000,
    color: '#292d36',
    charm: 16,
  },
];
export const VILLAINS = [
  { name: '블루투스 소음대장', item: '블루투스 스피커', perk: 'focus', hp: 80 },
  { name: '풀볼륨 쇼츠맨', item: '소음 차단 헤드폰', perk: 'focus', hp: 70 },
  {
    name: '가방 네 칸 점령자',
    item: '정체불명 장바구니',
    perk: 'rest',
    hp: 110,
  },
  { name: '취객 대장', item: '등산 스틱', perk: 'power', hp: 130 },
  { name: '리듬 단소맨', item: '단소', perk: 'power', hp: 90 },
  { name: '신문지 방패맨', item: '신문지 방패', perk: 'shield', hp: 100 },
  { name: '문닫힘 돌진맨', item: '교통카드', perk: 'agility', hp: 90 },
  { name: '전도 확성기왕', item: '작은 확성기', perk: 'focus', hp: 75 },
] as const;
export type Urban = {
  mental: number;
  reputation: number;
  infamy: number;
  xp: number;
  agility: number;
  perfumes: string[];
  perfume: string;
  clothes: string[];
  worn: string;
  coffeeDay: number;
  coffees: number;
  boost: number;
  toilet: number;
  insomnia: number;
  buff: string;
  buffTime: number;
  drops: string[];
  equipped: string;
  line: '2' | 'bundang';
  seat: number | null;
  occupied: number[];
  seatTimer: number;
  villain: number | null;
  villainHp: number;
  encounterTimer: number;
  combatCooldown: number;
  travel: number;
  rental: number;
  lastArrears: number;
  careCooldown: number;
  notice: string;
};
export const newUrban = (): Urban => ({
  mental: 100,
  reputation: 0,
  infamy: 0,
  xp: 0,
  agility: 30,
  perfumes: [],
  perfume: '',
  clothes: [],
  worn: '',
  coffeeDay: 0,
  coffees: 0,
  boost: 0,
  toilet: 0,
  insomnia: 0,
  buff: '',
  buffTime: 0,
  drops: [],
  equipped: '',
  line: '2',
  seat: null,
  occupied: [1, 3, 5],
  seatTimer: 12,
  villain: null,
  villainHp: 0,
  encounterTimer: 25,
  combatCooldown: 0,
  travel: 0,
  rental: 0,
  lastArrears: 0,
  careCooldown: 0,
  notice: '',
});
export function restoreUrban(value: unknown): Urban {
  const fresh = newUrban();
  if (!value || typeof value !== 'object') return fresh;
  const v = value as Record<string, unknown>;
  for (const k of Object.keys(fresh) as (keyof Urban)[]) {
    if (
      typeof fresh[k] === 'number' &&
      typeof v[k] === 'number' &&
      Number.isFinite(v[k])
    )
      (fresh as unknown as Record<string, unknown>)[k] = Math.max(
        0,
        Math.min(1000000, v[k] as number),
      );
  }
  for (const k of ['perfumes', 'clothes', 'drops'] as const)
    if (Array.isArray(v[k]))
      fresh[k] = (v[k] as unknown[])
        .filter((x): x is string => typeof x === 'string' && x.length < 60)
        .slice(0, 30);
  for (const k of ['perfume', 'worn', 'equipped'] as const)
    if (typeof v[k] === 'string' && v[k].length < 60) fresh[k] = v[k];
  fresh.mental = Math.min(100, fresh.mental);
  fresh.reputation = Math.max(
    -100,
    Math.min(
      100,
      typeof v.reputation === 'number' && Number.isFinite(v.reputation)
        ? v.reputation
        : 0,
    ),
  );
  fresh.line = v.line === 'bundang' ? 'bundang' : '2';
  // A reloaded session starts standing, without a stale encounter or timed trip.
  fresh.seat = null;
  fresh.villain = null;
  fresh.travel = 0;
  fresh.buff =
    typeof v.buff === 'string' &&
    ['focus', 'rest', 'power', 'shield', 'agility'].includes(v.buff)
      ? v.buff
      : '';
  if (!fresh.perfumes.includes(fresh.perfume)) fresh.perfume = '';
  if (!fresh.clothes.includes(fresh.worn)) fresh.worn = '';
  if (!fresh.drops.includes(fresh.equipped)) fresh.equipped = '';
  return fresh;
}
export function charm(u: Urban) {
  return (
    (PERFUMES.find((p) => p.id === u.perfume)?.charm || 0) +
    (CLOTHES.find((c) => c.id === u.worn)?.charm || 0)
  );
}
export function serviceOpen(minutes: number) {
  const hour = (minutes % 1440) / 60;
  return hour >= 5.5 && hour < 24;
}
export function urbanTick(
  s: Life,
  seconds: number,
  riding: boolean,
  at: string | null,
  random = Math.random,
) {
  const u = s.urban;
  for (const k of [
    'boost',
    'toilet',
    'insomnia',
    'buffTime',
    'combatCooldown',
    'rental',
    'careCooldown',
  ] as const)
    u[k] = Math.max(0, u[k] - seconds);
  if (u.buffTime === 0) u.buff = '';
  if (Math.floor(s.minutes / 1440) !== u.coffeeDay) {
    u.coffeeDay = Math.floor(s.minutes / 1440);
    u.coffees = 0;
  }
  if (s.arrears > u.lastArrears) u.mental = Math.max(0, u.mental - 12);
  u.lastArrears = s.arrears;
  if (at === 'forest') u.mental = Math.min(100, u.mental + seconds * 0.12);
  if (!riding) {
    u.seat = null;
    return;
  }
  u.seatTimer -= seconds;
  u.encounterTimer -= seconds;
  if (u.seat !== null) {
    s.hp = Math.min(
      100,
      s.hp +
        seconds *
          (u.buff === 'rest' || u.equipped === '정체불명 장바구니'
            ? 0.5
            : 0.15),
    );
    u.mental = Math.min(100, u.mental + seconds * 0.04);
  }
  if (u.seatTimer <= 0) {
    u.seatTimer = 12 + random() * 15;
    u.occupied = Array.from({ length: 6 }, (_, i) => i).filter(
      (i) => i !== u.seat && random() < (u.line === '2' ? 0.6 : 0.25),
    );
  }
  if (u.encounterTimer <= 0 && u.villain === null) {
    u.encounterTimer = 40 + random() * 70;
    if (random() < (u.line === '2' ? 0.65 : 0.25)) {
      u.villain =
        s.minutes % 1440 > 1320 && random() < 0.6
          ? 3
          : Math.floor(random() * VILLAINS.length);
      u.villainHp = VILLAINS[u.villain].hp;
      u.notice = VILLAINS[u.villain].name + ' 등장';
    }
  }
  if (
    u.villain !== null &&
    u.buff !== 'focus' &&
    u.equipped !== '소음 차단 헤드폰'
  )
    u.mental = Math.max(0, u.mental - seconds * 0.08);
}
export function urbanCoffee(s: Life) {
  const u = s.urban;
  if (u.coffeeDay !== Math.floor(s.minutes / 1440)) {
    u.coffeeDay = Math.floor(s.minutes / 1440);
    u.coffees = 0;
  }
  u.coffees++;
  u.boost = 180;
  s.focus = Math.max(s.focus, 90);
  if (u.coffees >= 4) {
    u.toilet = 180;
    u.insomnia = 600;
  }
}
export function urbanAction(
  s: Life,
  op: string,
  value: string,
  context: { at: string | null; riding: boolean },
  random = Math.random,
) {
  const u = s.urban;
  const pay = (n: number) => {
    if (s.cash < n) return false;
    s.cash -= n;
    return true;
  };
  if (op === 'perfume') {
    if (context.at !== 'aesop') return '이솝 매장에서 구매하세요.';
    const p = PERFUMES.find((x) => x.id === value);
    if (!p) return '';
    if (!u.perfumes.includes(value)) {
      if (!pay(p.price)) return '현금이 부족합니다.';
      u.perfumes.push(value);
    }
    u.perfume = value;
    return p.name + ' 사용 · 매력 +' + p.charm;
  }
  if (op === 'clothes') {
    if (context.at !== 'ader') return '아더에러 매장에서 구매하세요.';
    const c = CLOTHES.find((x) => x.id === value);
    if (!c) return '';
    if (!u.clothes.includes(value)) {
      if (!pay(c.price)) return '현금이 부족합니다.';
      u.clothes.push(value);
    }
    u.worn = value;
    return c.name + ' 착용';
  }
  if (op === 'line') {
    if (context.riding) return '내린 후 노선을 변경하세요.';
    u.line = value === 'bundang' ? 'bundang' : '2';
    return '노선 모드 변경 · 축약 순환 구간';
  }
  if (op === 'seat') {
    if (!context.riding) return '열차에 먼저 탑승하세요.';
    const i = Number(value);
    if (!Number.isInteger(i) || i < 0 || i >= 6) return '';
    if (u.seat === i) return '이미 앉아 있습니다.';
    if (u.occupied.includes(i)) return 'NPC가 앉아 있습니다.';
    if (
      random() < 0.55 &&
      u.agility + (u.boost > 0 ? 15 : 0) + (u.buff === 'agility' ? 25 : 0) <
        15 + random() * 65
    ) {
      u.occupied.push(i);
      return 'NPC가 먼저 앉았습니다. 민첩을 높여보세요.';
    }
    u.seat = i;
    if (i < 2) {
      u.reputation = Math.max(-100, u.reputation - 5);
      u.mental = Math.max(0, u.mental - 3);
      return '노약자석 · 주변의 따가운 시선, 평판 -5';
    }
    return '자리에 앉았습니다.';
  }
  if (op === 'stand') {
    u.seat = null;
    return '자리에서 일어났습니다.';
  }
  if (op === 'equip-drop') {
    if (u.drops.includes(value)) {
      u.equipped = value;
      return value + ' 장착';
    }
    return '';
  }
  if (['persuade', 'ignore', 'report', 'move-seat', 'fight'].includes(op)) {
    if (!context.riding || u.villain === null)
      return '현재 마주친 빌런이 없습니다.';
    const v = VILLAINS[u.villain];
    if (op === 'fight') {
      if (u.combatCooldown > 0) return '';
      u.combatCooldown =
        u.equipped === '교통카드'
          ? 0.35
          : u.equipped === '등산 스틱'
            ? 0.9
            : 0.6;
      u.villainHp -=
        20 +
        (u.buff === 'power' ? 15 : 0) +
        ({
          '등산 스틱': 24,
          단소: 16,
          '블루투스 스피커': 12,
          '작은 확성기': 12,
          '정체불명 장바구니': 8,
          교통카드: 3,
          '신문지 방패': 0,
          '소음 차단 헤드폰': 0,
        }[u.equipped] || 0);
      if (u.villainHp > 0) {
        s.hp = Math.max(
          0,
          s.hp - (u.equipped === '신문지 방패' || u.buff === 'shield' ? 3 : 8),
        );
        u.mental = Math.max(0, u.mental - 2);
        return v.name + '와 전투 · 남은 HP ' + u.villainHp;
      }
      u.infamy += 3;
      u.xp += 30;
      u.agility = Math.min(100, u.agility + 2);
      u.buff = v.perk;
      u.buffTime = 600;
      if (!u.drops.includes(v.item)) u.drops.push(v.item);
      u.equipped = v.item;
      u.villain = null;
      u.encounterTimer = 60;
      return v.item + ' 획득 · 10분 버프';
    }
    if (op === 'persuade' && random() > 0.45 + charm(u) / 100) {
      u.mental = Math.max(0, u.mental - 3);
      return '설득 실패 · 다른 방법을 선택하세요.';
    }
    if (op === 'report' || op === 'persuade')
      u.reputation = Math.min(100, u.reputation + 5);
    if (op === 'move-seat') u.seat = null;
    u.villain = null;
    u.encounterTimer = 60;
    return op === 'report'
      ? '신고로 해결 · 시민 평판 +5'
      : op === 'persuade'
        ? '설득 성공 · 시민 평판 +5'
        : '자리를 피해 상황을 넘겼습니다.';
  }
  if (op === 'recover-mental') {
    if (u.careCooldown > 0) return '잠시 쉬고 다시 이용하세요.';
    u.careCooldown = 30;
    if (value === 'music') {
      u.mental = Math.min(100, u.mental + 8);
      u.boost = Math.max(u.boost, 15);
      return '음악을 들으며 마음을 가라앉혔습니다.';
    }
    if (value === 'sns') {
      u.mental = Math.max(0, u.mental - 5);
      return '동네 SNS에서 악플을 읽었습니다 · 멘탈 -5';
    }
    if (value === 'game' && context.at === 'pc' && pay(1500)) {
      u.mental = Math.min(100, u.mental + 15);
      return 'PC방 게임 · 멘탈 +15';
    }
    if (value === 'drink' && context.at === 'bar' && pay(5000)) {
      u.mental = Math.min(100, u.mental + 12);
      return '친구들과 한 잔 · 멘탈 +12';
    }
    return 'PC방 또는 술집에서 이용하세요.';
  }
  if (op === 'night') {
    if (context.riding) return '열차에서 먼저 내려주세요.';
    if (value === 'walk') return '무료 도보 귀가 · 지도에서 집을 선택하세요.';
    if (value === 'bike') {
      if (!pay(1000))
        return '따릉이 대여료 1,000원이 필요합니다. 도보는 무료입니다.';
      u.rental = 600;
      return '따릉이 10분 대여 · 이동속도 증가';
    }
    if (value === 'taxi') {
      if (u.travel > 0) return '택시로 이동 중입니다.';
      if (!pay(12000))
        return '택시비 12,000원이 필요합니다. 도보는 무료입니다.';
      u.travel = 5;
      const event = Math.floor(random() * 4);
      if (event === 1) u.travel = 9;
      if (event === 3) u.mental = Math.min(100, u.mental + 10);
      return [
        '기사님의 정치 토크가 시작됐습니다.',
        '길을 잘못 들어 조금 더 걸립니다.',
        '기사님: 무슨 일 하세요?',
        '기사님의 인생 조언 · 멘탈 +10',
      ][event];
    }
    if (value === 'sauna') {
      if (!pay(10000)) return '찜질방 입장료가 부족합니다.';
      s.minutes += 240;
      s.hp = Math.min(100, s.hp + 40);
      u.mental = Math.min(100, u.mental + 25);
      return '찜질방에서 쉬었습니다.';
    }
    if (value === 'friend')
      return '집 안에 있는 친구에게 이동하면 두 시간 무료로 쉴 수 있습니다.';
  }
  return '';
}
