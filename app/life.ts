import { FEMALE_RESIDENT_IDS } from './social';
import { BBQ_MENU } from './bbq';
import { MCD_MENU } from './mcdonalds';
// Device-local, single-player simulation. All transactions are checked here.
import {
  DECOR,
  defaultDecor,
  WALL_COLORS,
  FLOOR_COLORS,
  type DecorId,
  type DecorState,
} from './decor';
export const SAVE_KEY = 'seongsu30-save-v1';
export const MINUTES_PER_SECOND = 0.8;
export const won = (n: number) => '₩ ' + Math.round(n).toLocaleString('ko-KR');
export const clamp = (n: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, n));
export const PLACES = [
  {
    id: 'olive',
    name: '올리브영 성수점',
    x: -40,
    z: 56,
    kind: 'beauty',
    person: '올리브영 직원',
    color: '#bbd832',
  },
  {
    id: 'bbq',
    name: 'BBQ 성수점',
    x: -100,
    z: -55,
    kind: 'food',
    person: 'BBQ 점장',
    color: '#ee6c4e',
  },
  {
    id: 'home',
    name: '반지하 주택가',
    x: -40,
    z: -75,
    kind: 'home',
    person: '박 사장',
    color: '#b4d6ff',
  },
  {
    id: 'station',
    name: '성수역 2번 출구',
    x: 3,
    z: -10,
    kind: 'station',
    person: '출근하는 직장인',
    color: '#7bdfbd',
  },
  {
    id: 'exit1',
    name: '성수역 1번 출구',
    x: 3,
    z: 18,
    kind: 'station',
    person: '길을 묻는 학생',
    color: '#7bdfbd',
  },
  {
    id: 'cafe',
    name: '연무장 로스터리',
    x: 40,
    z: 56,
    kind: 'cafe',
    person: '바리스타 지수',
    color: '#eeb675',
  },
  {
    id: 'burger',
    name: '맥도날드 성수점',
    x: 40,
    z: -75,
    kind: 'food',
    person: '맥도날드 크루',
    color: '#eeb675',
  },
  {
    id: 'store',
    name: '성수 편의점',
    x: 40,
    z: -16,
    kind: 'store',
    person: '야간 알바 민재',
    color: '#7bdfbd',
  },
  {
    id: 'garage',
    name: '성수 모터스 · 바이크 샵',
    x: -100,
    z: -16,
    kind: 'garage',
    person: '정비사 도윤',
    color: '#a8bef5',
  },
  {
    id: 'estate',
    name: '성수 부동산',
    x: -40,
    z: -16,
    kind: 'estate',
    person: '김실장',
    color: '#b4d6ff',
  },
  {
    id: 'police',
    name: '성수 파출소',
    x: 100,
    z: -75,
    kind: 'police',
    person: '이 순경',
    color: '#a8bef5',
  },
  {
    id: 'forest',
    name: '서울숲 입구',
    x: -100,
    z: 56,
    kind: 'park',
    person: '산책하는 주민',
    color: '#7bdfbd',
  },
  {
    id: 'office',
    name: '서울숲 오피스텔',
    x: 100,
    z: 56,
    kind: 'housing',
    person: '오피스텔 경비원',
    color: '#b4d6ff',
  },
  {
    id: 'bar',
    name: '성수 골목 술집',
    x: 100,
    z: -16,
    kind: 'bar',
    person: '술집 사장',
    color: '#eeb675',
  },
  {
    id: 'pc',
    name: '성수 PC방',
    x: -40,
    z: 56,
    kind: 'pc',
    person: 'PC방 직원',
    color: '#a8bef5',
  },
  {
    id: 'factory',
    name: '폐공장 · 버려진 부품',
    x: -100,
    z: -75,
    kind: 'loot',
    person: '폐품 수집가',
    color: '#eeb675',
  },
  {
    id: 'construction',
    name: '공사장 · 사유 자재',
    x: 40,
    z: 76,
    kind: 'loot',
    person: '현장 관리자',
    color: '#f18c85',
  },
  {
    id: 'warehouse',
    name: '창고 · 소유자 있음',
    x: 100,
    z: 76,
    kind: 'loot',
    person: '창고 관리인',
    color: '#f18c85',
  },
  {
    id: 'residential',
    name: '주택가 · 재활용품',
    x: -40,
    z: 76,
    kind: 'loot',
    person: '동네 주민',
    color: '#eeb675',
  },
] as const;
export type PlaceId = (typeof PLACES)[number]['id'];
export const place = (id: string) =>
  PLACES.find((p) => p.id === id) || PLACES[0];
export const HOUSES = [
  {
    name: '성수 반지하',
    deposit: 3000000,
    rent: 300000,
    area: '5평',
    detail: '작은 창문 · 낡은 냉장고',
    capacity: 16,
  },
  {
    name: '햇빛 드는 원룸',
    deposit: 10000000,
    rent: 550000,
    area: '9평',
    detail: '채광 · 넉넉한 수납',
    capacity: 24,
  },
  {
    name: '성수 오피스텔',
    deposit: 30000000,
    rent: 900000,
    area: '14평',
    detail: '주차장 · 바이크 보관',
    capacity: 32,
  },
  {
    name: '서울숲 투룸',
    deposit: 70000000,
    rent: 1600000,
    area: '24평',
    detail: '숲 전망 · 별도 작업실',
    capacity: 40,
  },
  {
    name: '성수 고급 아파트',
    deposit: 800000000,
    rent: 0,
    area: '42평',
    detail: '자가 소유 · 서울숲의 아침',
    capacity: 64,
  },
] as const;
export const BIKES = [
  { name: '중고 스쿠터', price: 800000, speed: 16.5 },
  { name: '125cc 시티 스쿠터', price: 2200000, speed: 22 },
  { name: '투어링 스쿠터', price: 4200000, speed: 26.4 },
  { name: '네이키드 바이크', price: 7500000, speed: 31.9 },
  { name: '프리미엄 바이크', price: 16000000, speed: 37.4 },
] as const;
export const ITEMS = {
  ...MCD_MENU,
  ...BBQ_MENU,
  snack: {
    name: '삼각김밥',
    price: 1500,
    sell: 600,
    hp: 3,
    energy: 6,
    food: 24,
  },
  meal: {
    name: '따뜻한 도시락',
    price: 5500,
    sell: 2200,
    hp: 10,
    energy: 15,
    food: 55,
  },
  canned: {
    name: '편의점 커피',
    price: 1800,
    sell: 700,
    hp: 5,
    energy: 10,
    food: 0,
  },
  americano: {
    name: '아메리카노',
    price: 4500,
    sell: 1800,
    hp: 10,
    energy: 25,
    food: 0,
  },
  specialty: {
    name: '성수 스페셜티',
    price: 7000,
    sell: 2800,
    hp: 20,
    energy: 40,
    food: 0,
  },
  scrap: {
    name: '바이크 부품',
    price: 0,
    sell: 8500,
    hp: 0,
    energy: 0,
    food: 0,
  },
  tool: { name: '공구 세트', price: 0, sell: 16000, hp: 0, energy: 0, food: 0 },
  metal: {
    name: '희귀 금속',
    price: 0,
    sell: 32000,
    hp: 0,
    energy: 0,
    food: 0,
  },
  electronics: {
    name: '중고 전자제품',
    price: 0,
    sell: 45000,
    hp: 0,
    energy: 0,
    food: 0,
  },
  clothes: {
    name: '빈티지 의류',
    price: 0,
    sell: 6500,
    hp: 0,
    energy: 0,
    food: 0,
  },
  gunpart: {
    name: '낡은 총기 부품',
    price: 0,
    sell: 22000,
    hp: 0,
    energy: 0,
    food: 0,
  },
} as const;
export type ItemId = keyof typeof ITEMS;
export type Inventory = Partial<Record<ItemId, number>>;
export type Order = {
  id: number;
  pickup: PlaceId;
  dropoff: PlaceId;
  pay: number;
  label: string;
  floor?: number;
  stage: 'pickup' | 'dropoff';
  deadline: number;
};
export const ORDER_ROUTES: {
  floor?: number;
  pickup: PlaceId;
  dropoff: PlaceId;
  pay: number;
  label: string;
}[] = [
  {
    pickup: 'cafe',
    dropoff: 'forest',
    pay: 4300,
    label: '산책길 아메리카노 2잔',
  },
  { pickup: 'burger', dropoff: 'office', pay: 6100, label: '빅맥 세트 배달' },
  { pickup: 'store', dropoff: 'station', pay: 4800, label: '야근 간식 배달' },
  { pickup: 'cafe', dropoff: 'pc', pay: 5200, label: '아이스 라테 4잔' },
  { pickup: 'bbq', dropoff: 'office', pay: 8500, label: '황금올리브치킨 배달' },
  { pickup: 'bbq', dropoff: 'pc', pay: 7200, label: '황올 반+양념 반 배달' },
  {
    pickup: 'olive',
    dropoff: 'office',
    pay: 9800,
    label: '올리브영 뷰티 박스 · 2층 201호',
    floor: 2,
  },
];
export const EVENT_TYPES = [
  {
    id: 'wallet',
    title: '길에 떨어진 지갑',
    body: '성수역 앞에서 지갑을 발견했습니다.',
    at: 'station',
    choice: '파출소에 신고 · 사례금 10,000원',
  },
  {
    id: 'cat',
    title: '골목의 길고양이',
    body: '서울숲 입구에서 배고픈 고양이가 기다립니다.',
    at: 'forest',
    choice: '삼각김밥 1개 나눠주기 · HP +10',
  },
  {
    id: 'popup',
    title: '팝업스토어 오픈',
    body: '연무장 거리에서 행사 도우미를 구합니다.',
    at: 'cafe',
    choice: '1시간 돕기 · 20,000원',
  },
  {
    id: 'complaint',
    title: '카페의 곤란한 손님',
    body: '지수가 줄을 정리해 줄 사람을 찾습니다.',
    at: 'cafe',
    choice: '30분 돕기 · 8,000원',
  },
  {
    id: 'smoking',
    title: '여기는 금연구역',
    body: '편의점 앞에서 흡연 문제로 실랑이가 벌어집니다.',
    at: 'store',
    choice: '흡연구역 안내 · 동네 호감 +1',
  },
  {
    id: 'accident',
    title: '배달기사 접촉 사고',
    body: '정비소 앞에서 배달기사가 도움을 요청합니다.',
    at: 'garage',
    choice: '30분 돕기 · 부품 1개',
  },
  {
    id: 'drunk',
    title: '귀갓길을 잃은 취객',
    body: '술집 앞 취객이 파출소의 도움을 기다립니다.',
    at: 'bar',
    choice: '경찰에 연락 · 사례금 5,000원',
  },
] as const;
export type Life = {
  contacts: number[];
  companionId: number | null;
  numberCooldowns: Record<string, number>;
  decor: DecorState;
  cashDrops: {
    id: number;
    x: number;
    z: number;
    amount: number;
    readyAt: number;
  }[];
  dropSerial: number;
  stolenBike: boolean;
  garageBike: {
    tier: number;
    fuel: number;
    hp: number;
    box: boolean;
    tune: boolean;
    stolen: boolean;
  } | null;
  playerX: number;
  playerZ: number;
  bikeX: number;
  bikeZ: number;
  version: 1;
  minutes: number;
  cash: number;
  hp: number;
  caffeine: number;
  focus: number;
  homeTier: number;
  rentDueDay: number;
  arrears: number;
  homeUpgrade: boolean;
  inside: boolean;
  inventory: Inventory;
  storage: Inventory;
  bikeTier: number;
  fuel: number;
  bikeHp: number;
  bikeBox: boolean;
  bikeTune: boolean;
  deliveries: number;
  rating: number;
  earned: number;
  orderSerial: number;
  order: Order | null;
  nav: PlaceId | null;
  wanted: number;
  reportIn: number;
  pendingHeat: number;
  unseen: number;
  lastCrime: number;
  ammo: number;
  reserve: number;
  relations: Record<string, number>;
  talked: Record<string, number>;
  quests: string[];
  looted: Record<string, number>;
  worked: Record<string, number>;
  logs: { text: string; at: number }[];
  event: { index: number; expires: number } | null;
  nextEvent: number;
  weather: '맑음' | '폭우';
  outage: boolean;
};
export function createLife(): Life {
  return {
    decor: defaultDecor(),
    cashDrops: [],
    dropSerial: 0,
    stolenBike: false,
    garageBike: null,
    contacts: [],
    companionId: null,
    numberCooldowns: {},
    playerX: -40,
    playerZ: -75,
    bikeX: -97,
    bikeZ: -13,
    version: 1,
    minutes: 450,
    cash: 127400,
    hp: 100,
    caffeine: 0,
    focus: 0,
    homeTier: 0,
    rentDueDay: 8,
    arrears: 0,
    homeUpgrade: false,
    inside: true,
    inventory: { snack: 2, canned: 1 },
    storage: {},
    bikeTier: -1,
    fuel: 100,
    bikeHp: 100,
    bikeBox: false,
    bikeTune: false,
    deliveries: 0,
    rating: 5,
    earned: 0,
    orderSerial: 0,
    order: null,
    nav: null,
    wanted: 0,
    reportIn: 0,
    pendingHeat: 0,
    unseen: 0,
    lastCrime: -1000,
    ammo: 12,
    reserve: 36,
    relations: {},
    talked: {},
    quests: [],
    looted: {},
    worked: {},
    logs: [
      {
        text: '성수에서의 첫 아침. 월세까지 7일, 내 방식으로 살아보자.',
        at: 450,
      },
    ],
    event: null,
    nextEvent: 570,
    weather: '맑음',
    outage: false,
  };
}
export const day = (s: Life) => Math.floor(s.minutes / 1440) + 1;
export const clockText = (s: Life) => {
  const m = Math.floor(s.minutes % 1440);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
export const countItems = (inventory: Inventory) =>
  Object.values(inventory).reduce((a, b) => a + (b || 0), 0);
export const log = (s: Life, text: string) => {
  s.logs.unshift({ text, at: s.minutes });
  s.logs = s.logs.slice(0, 20);
  return text;
};
const earn = (s: Life, n: number) => {
  s.cash += n;
  s.earned += n;
};
export function dropCash(s: Life, x: number, z: number, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return;
  s.cashDrops.push({
    id: ++s.dropSerial,
    x: clamp(x, -113, 113),
    z: clamp(z, -110, 110),
    amount: Math.min(100000, Math.floor(amount)),
    readyAt: s.minutes + 0.6,
  });
  if (s.cashDrops.length > 64) s.cashDrops.shift();
}
export function collectCash(s: Life, x: number, z: number) {
  let cash = 0;
  s.cashDrops = s.cashDrops.filter((d) => {
    if (s.minutes >= d.readyAt && Math.hypot(d.x - x, d.z - z) < 1.8) {
      cash += d.amount;
      return false;
    }
    return true;
  });
  if (cash) {
    earn(s, cash);
    log(s, `현금 ${won(cash)} 획득`);
  }
  return cash;
}
export function claimDeliveryBike(s: Life) {
  if (s.bikeTier >= 0 && (!s.stolenBike || !s.garageBike))
    s.garageBike = {
      tier: s.bikeTier,
      fuel: s.fuel,
      hp: s.bikeHp,
      box: s.bikeBox,
      tune: s.bikeTune,
      stolen: s.stolenBike,
    };
  Object.assign(s, {
    bikeTier: 0,
    bikeBox: true,
    bikeTune: false,
    stolenBike: true,
    fuel: 75,
    bikeHp: 80,
  });
  return log(
    s,
    `배달 바이크 획득 · 배달 박스 장착${s.garageBike ? ' · 기존 바이크는 정비소에 보관' : ''}`,
  );
}
const spend = (s: Life, n: number) => {
  if (s.cash < n) return false;
  s.cash -= n;
  return true;
};
const addItem = (s: Life, id: ItemId, n = 1) => {
  if (countItems(s.inventory) + n > 12) return false;
  s.inventory[id] = (s.inventory[id] || 0) + n;
  return true;
};
export function advanceMinutes(s: Life, minutes: number) {
  const oldDay = day(s);
  s.minutes += Math.max(0, minutes);
  for (let d = oldDay + 1; d <= day(s); d++) {
    const fees = 2000 + (s.bikeTier >= 0 ? 1500 : 0) + s.homeTier * 1000;
    const paid = Math.min(s.cash, fees);
    s.cash -= paid;
    s.arrears += fees - paid;
    log(
      s,
      `${d}일차 · 통신·관리${s.bikeTier >= 0 ? '·보험' : ''} ${won(fees)}${paid < fees ? ' · 부족액 미납' : ''}`,
    );
  }
  while (day(s) >= s.rentDueDay) {
    const rent = HOUSES[s.homeTier].rent;
    s.arrears += rent;
    s.rentDueDay += 30;
    if (rent)
      log(s, `집주인: 월세 ${won(rent)}가 미납됐어요. 집에서 납부해 주세요.`);
  }
  s.caffeine = clamp(s.caffeine - minutes / 160, 0, 6);
  s.focus = Math.max(0, s.focus - minutes);
  if (s.order && s.minutes > s.order.deadline) {
    s.order = null;
    s.rating = Math.max(1, s.rating - 0.2);
    log(s, '배달 시간이 만료되었습니다. 평점 -0.2 · 새 주문을 받아보세요.');
  }
  if (s.event && s.minutes > s.event.expires) s.event = null;
  if (s.minutes >= s.nextEvent) {
    const cycle = Math.floor(s.minutes / 120);
    s.weather = cycle % 7 === 4 ? '폭우' : '맑음';
    s.outage = cycle % 13 === 8;
    s.event = { index: cycle % EVENT_TYPES.length, expires: s.minutes + 100 };
    s.nextEvent = s.minutes + 120;
    log(
      s,
      `동네 소식 · ${EVENT_TYPES[s.event.index].title}${s.weather === '폭우' ? ' / 폭우, 배달 할증' : ''}${s.outage ? ' / 간판 정전' : ''}`,
    );
  }
}
export function tickLife(
  s: Life,
  seconds: number,
  context: {
    home?: boolean;
    menu?: boolean;
    dialogue?: boolean;
    moving?: boolean;
    running?: boolean;
    riding?: boolean;
    seen?: boolean;
  },
) {
  if (context.menu) return;
  const minutes =
    seconds *
    MINUTES_PER_SECOND *
    (context.dialogue ? 0.1 : context.home ? 2 : 1);
  advanceMinutes(s, minutes);
  if (context.riding) {
    s.fuel = clamp(s.fuel - seconds * 0.035);
    s.bikeHp = clamp(s.bikeHp - seconds * 0.002);
  }
  if (s.reportIn > 0) {
    s.reportIn = Math.max(0, s.reportIn - seconds);
    if (!s.reportIn) {
      s.wanted = clamp(s.wanted + s.pendingHeat, 0, 5);
      s.pendingHeat = 0;
      log(s, '신고가 접수되었습니다. 경찰이 마지막 목격 지점으로 출동합니다.');
    }
  }
  if (s.wanted > 0) {
    s.unseen = context.seen ? 0 : s.unseen + seconds;
    if (s.unseen >= 25) {
      s.wanted--;
      s.unseen = 0;
      if (!s.wanted) log(s, '경찰 수색이 종료되었습니다.');
    }
  }
}
export function reportCrime(s: Life, severity: number, evidence: string) {
  if (s.minutes - s.lastCrime < 2) return false;
  s.lastCrime = s.minutes;
  s.unseen = 0;
  s.pendingHeat = Math.min(5, s.pendingHeat + severity);
  if (!s.reportIn) s.reportIn = 4;
  log(s, `${evidence} · ${Math.ceil(s.reportIn)}초 뒤 신고 접수`);
  return true;
}
export const availableOrders = (s: Life) =>
  ORDER_ROUTES.map((r, i) => ({
    ...r,
    id: i,
    pay:
      r.pay +
      Math.floor(s.deliveries / 5) * 500 +
      (s.weather === '폭우' ? 1500 : 0) +
      (s.bikeBox ? 700 : 0),
  }));
export const targetPlace = (s: Life) =>
  s.order
    ? place(s.order.stage === 'pickup' ? s.order.pickup : s.order.dropoff)
    : s.nav
      ? place(s.nav)
      : null;
export function deliver(s: Life, at: PlaceId, floor = 0) {
  if (!s.order) return '';
  if (s.order.stage === 'pickup' && at === s.order.pickup) {
    s.order.stage = 'dropoff';
    return log(
      s,
      `상품 수령 완료 · ${place(s.order.dropoff).name}${s.order.floor ? ` ${s.order.floor}층` : ''}에 전달하세요.`,
    );
  }
  if (s.order.stage === 'dropoff' && at === s.order.dropoff) {
    if (s.order.floor && floor !== s.order.floor)
      return log(
        s,
        `${s.order.floor}층 201호까지 엘리베이터를 타고 올라가세요.`,
      );
    const pay = s.order.pay;
    earn(s, pay);
    s.deliveries++;
    s.rating = Math.min(5, s.rating + 0.02);
    s.order = null;
    s.nav = null;
    let msg = `배달 완료! ${won(pay)} 입금`;
    if (s.deliveries === 1) {
      earn(s, 30000);
      msg += ' · 첫 배달 보너스 30,000원';
    }
    return log(s, msg);
  }
  return '';
}
export type Action =
  | 'decor-buy'
  | 'decor-place'
  | 'wallpaper'
  | 'flooring'
  | 'garage-bike'
  | 'accept'
  | 'cancel'
  | 'navigate'
  | 'buy'
  | 'consume'
  | 'sell'
  | 'store'
  | 'take'
  | 'sleep'
  | 'rent'
  | 'furniture'
  | 'house'
  | 'bike'
  | 'fuel'
  | 'repair'
  | 'box'
  | 'tune'
  | 'work'
  | 'talk'
  | 'quest'
  | 'loot'
  | 'event'
  | 'fine'
  | 'ammo'
  | 'recover';
export function act(
  s: Life,
  action: Action,
  value = '',
  at: PlaceId | null = null,
): string {
  const fail = (message: string) => log(s, message);
  const here = at ? place(at) : null;
  const today = day(s);
  const item = Object.hasOwn(ITEMS, value) ? ITEMS[value as ItemId] : undefined,
    id = value as ItemId;
  if (action === 'navigate') {
    if (!PLACES.some((p) => p.id === value)) return '';
    s.nav = value as PlaceId;
    return log(
      s,
      `${place(value).name} 길 안내 시작${s.order ? ' · 진행 중인 배달이 먼저 표시됩니다.' : ''}`,
    );
  }
  if (action === 'accept') {
    if (s.order) return fail('진행 중인 배달을 먼저 마쳐 주세요.');
    if (s.wanted || s.pendingHeat)
      return fail('신고·수배가 해제되면 배달을 받을 수 있습니다.');
    const r = availableOrders(s)[Number(value)];
    if (!r) return '';
    s.order = {
      ...r,
      id: ++s.orderSerial,
      stage: 'pickup',
      deadline: s.minutes + 150,
    };
    return log(s, `배달 수락 · ${place(r.pickup).name}에서 픽업하세요.`);
  }
  if (action === 'cancel') {
    if (!s.order) return '';
    s.order = null;
    s.rating = Math.max(1, s.rating - 0.1);
    return log(s, '배달 취소 · 평점 -0.1');
  }
  if (action === 'consume') {
    if (!item || !(s.inventory[id] || 0))
      return fail('가방에 해당 아이템이 없습니다.');
    if (!item.price)
      return fail('사용할 수 없는 물건입니다. 상점에서 판매할 수 있어요.');
    s.inventory[id]!--;
    s.hp = clamp(s.hp + item.hp);
    if (['canned', 'americano', 'specialty', 'mccoffee'].includes(id))
      s.caffeine = clamp(s.caffeine + 1, 0, 6);
    if (id === 'specialty') s.focus = 90;
    return log(
      s,
      `${item.name} 사용 · HP +${item.hp}${s.caffeine >= 3 ? ' · 카페인 과다, 손떨림' : ''}`,
    );
  }
  if (action === 'recover') {
    const fee = Math.min(s.cash, 15000);
    s.cash -= fee;
    s.hp = 100;
    s.wanted = s.pendingHeat = s.reportIn = 0;
    s.inside = true;
    if (s.order) {
      s.order = null;
      s.rating = Math.max(1, s.rating - 0.2);
    }
    advanceMinutes(s, 120);
    return log(s, `응급 처치 후 귀가 · ${won(fee)}`);
  }
  if (
    [
      'sleep',
      'rent',
      'furniture',
      'store',
      'take',
      'decor-buy',
      'decor-place',
      'wallpaper',
      'flooring',
    ].includes(action) &&
    !s.inside
  )
    return fail('집에 돌아가서 이용하세요.');
  if (action === 'decor-buy') {
    if (!Object.hasOwn(DECOR, value)) return '';
    const id = value as DecorId;
    if (s.decor.owned.includes(id)) return fail('이미 보유한 소품입니다.');
    if (!spend(s, DECOR[id].price))
      return fail(`${won(DECOR[id].price)}이 필요합니다.`);
    s.decor.owned.push(id);
    s.decor.placed[id] = 0;
    return log(s, `${DECOR[id].name} 구매 · 방에 배치했습니다.`);
  }
  if (action === 'decor-place') {
    if (!s.decor.owned.includes(value as DecorId)) return '';
    const id = value as DecorId,
      current = s.decor.placed[id];
    if (current === undefined) s.decor.placed[id] = 0;
    else if (current === 2) delete s.decor.placed[id];
    else s.decor.placed[id] = current + 1;
    return log(
      s,
      `${DECOR[id].name} ${s.decor.placed[id] === undefined ? '보관함으로' : `배치 ${s.decor.placed[id]! + 1}`} 변경`,
    );
  }
  if (action === 'wallpaper' || action === 'flooring') {
    if (!(action === 'wallpaper' ? WALL_COLORS : FLOOR_COLORS).includes(value))
      return '';
    s.decor[action === 'wallpaper' ? 'wall' : 'floor'] = value;
    return log(
      s,
      `${action === 'wallpaper' ? '벽지' : '바닥'} 색상을 바꿨습니다.`,
    );
  }
  if (action === 'sleep') {
    if (s.wanted || s.pendingHeat)
      return fail('경찰 수색이 끝난 뒤 잠들 수 있습니다.');
    advanceMinutes(s, 480);
    s.hp = 100;
    return log(s, '8시간 푹 잤습니다. 체력을 회복했습니다.');
  }
  if (action === 'rent') {
    const debt = s.arrears,
      amount = debt || HOUSES[s.homeTier].rent;
    if (!amount) return fail('납부할 청구가 없습니다.');
    if (!spend(s, amount))
      return fail(`${won(amount - s.cash)}이 더 필요합니다.`);
    if (debt) s.arrears = 0;
    else s.rentDueDay += 30;
    return log(s, `${debt ? '미납금' : '다음 월세'} ${won(amount)} 납부 완료`);
  }
  if (action === 'furniture') {
    if (s.homeUpgrade) return fail('이미 편안한 침대를 사용하고 있습니다.');
    if (!spend(s, 120000)) return fail('침대 교체에는 120,000원이 필요합니다.');
    s.homeUpgrade = true;
    return log(s, '침대를 교체했습니다. 새로운 침구로 방을 꾸몄습니다.');
  }
  if (action === 'store' || action === 'take') {
    if (!item) return '';
    const from = action === 'store' ? s.inventory : s.storage,
      to = action === 'store' ? s.storage : s.inventory;
    if (!(from[id] || 0)) return '';
    if (
      countItems(to) >= (action === 'store' ? HOUSES[s.homeTier].capacity : 12)
    )
      return fail('수납 공간이 가득 찼습니다.');
    from[id]!--;
    to[id] = (to[id] || 0) + 1;
    return log(
      s,
      `${item.name} ${action === 'store' ? '보관' : '꺼내기'} 완료`,
    );
  }
  if (!here) return fail('해당 장소에 방문해서 이용하세요.');
  if (action === 'garage-bike') {
    if (here.kind !== 'garage' || !s.garageBike) return '';
    const stored = s.garageBike;
    s.garageBike =
      s.bikeTier < 0
        ? null
        : {
            tier: s.bikeTier,
            fuel: s.fuel,
            hp: s.bikeHp,
            box: s.bikeBox,
            tune: s.bikeTune,
            stolen: s.stolenBike,
          };
    Object.assign(s, {
      bikeTier: stored.tier,
      fuel: stored.fuel,
      bikeHp: stored.hp,
      bikeBox: stored.box,
      bikeTune: stored.tune,
      stolenBike: stored.stolen,
    });
    return log(s, `${BIKES[s.bikeTier].name}을 정비소 앞으로 꺼냈습니다.`);
  }
  if (action === 'buy') {
    if (!['cafe', 'store', 'food', 'bar'].includes(here.kind) || !item?.price)
      return '';
    const allowed =
      here.id === 'bbq'
        ? Object.keys(BBQ_MENU)
        : here.id === 'burger'
          ? Object.keys(MCD_MENU)
          : here.kind === 'cafe'
            ? ['americano', 'specialty']
            : here.kind === 'store'
              ? ['snack', 'meal', 'canned']
              : ['meal'];
    if (!allowed.includes(id)) return '';
    if (countItems(s.inventory) >= 12) return fail('가방이 가득 찼습니다.');
    if (!spend(s, item.price)) return fail('현금이 부족합니다.');
    addItem(s, id);
    return log(s, `${item.name} 구매 · ${won(item.price)}`);
  }
  if (action === 'sell') {
    if (
      !['store', 'garage'].includes(here.kind) ||
      !item ||
      !(s.inventory[id] || 0)
    )
      return '';
    s.inventory[id]!--;
    earn(s, item.sell);
    return log(s, `${item.name} 판매 · ${won(item.sell)}`);
  }
  if (action === 'house') {
    if (here.kind !== 'estate') return '';
    const tier = Number(value),
      house = HOUSES[tier];
    if (!house || tier <= s.homeTier)
      return fail('현재 집보다 높은 단계의 집을 선택하세요.');
    if (s.arrears) return fail('미납금을 먼저 정리해 주세요.');
    const cost = house.deposit - HOUSES[s.homeTier].deposit;
    if (!spend(s, cost)) return fail(`보증금 차액 ${won(cost)}이 필요합니다.`);
    s.homeTier = tier;
    s.homeUpgrade = false;
    return log(
      s,
      `${house.name} 계약 완료 · 기존 보증금 반환 후 ${won(cost)} 결제 · 다음 월세일 유지`,
    );
  }
  if (['bike', 'fuel', 'repair', 'box', 'tune'].includes(action)) {
    if (here.kind !== 'garage') return '';
    if (action === 'bike') {
      const tier = Number(value),
        bike = BIKES[tier];
      if (!bike || tier <= s.bikeTier)
        return fail('현재보다 높은 등급을 선택하세요.');
      if (!spend(s, bike.price))
        return fail(`${bike.name} 구입에는 ${won(bike.price)}이 필요합니다.`);
      s.bikeTier = tier;
      s.stolenBike = false;
      s.fuel = s.bikeHp = 100;
      return log(
        s,
        `${bike.name} 구매 완료 · 정비소 앞에서 V 키로 탑승하세요.`,
      );
    }
    if (s.bikeTier < 0) return fail('바이크를 먼저 구매해 주세요.');
    const cost =
      action === 'fuel'
        ? Math.ceil(100 - s.fuel) * 100
        : action === 'repair'
          ? Math.ceil(100 - s.bikeHp) * 250
          : action === 'box'
            ? 80000
            : 150000;
    if ((action === 'box' && s.bikeBox) || (action === 'tune' && s.bikeTune))
      return fail('이미 장착되어 있습니다.');
    if (!spend(s, cost)) return fail(`${won(cost)}이 필요합니다.`);
    if (action === 'fuel') s.fuel = 100;
    if (action === 'repair') s.bikeHp = 100;
    if (action === 'box') s.bikeBox = true;
    if (action === 'tune') s.bikeTune = true;
    return log(s, `정비 완료 · ${won(cost)}`);
  }
  if (action === 'work') {
    if (
      here.id !== 'bbq' &&
      !['cafe', 'store', 'bar', 'pc'].includes(here.kind)
    )
      return '';
    if (s.worked[here.id] === today)
      return fail('오늘 이곳의 근무를 마쳤습니다. 내일 다시 와 주세요.');
    if (s.order) return fail('배달을 마친 뒤 근무하세요.');
    if (s.wanted || s.pendingHeat)
      return fail('수배 중에는 근무할 수 없습니다.');
    s.worked[here.id] = today;
    advanceMinutes(s, here.id === 'bbq' ? 120 : 360);
    earn(s, here.id === 'bbq' ? 30000 : 60000);
    return log(
      s,
      here.id === 'bbq'
        ? '치킨 포장 보조 완료 · 30,000원 입금'
        : '6시간 근무 완료 · 일급 60,000원 입금',
    );
  }
  if (action === 'talk') {
    if (s.talked[here.id] !== today) {
      s.talked[here.id] = today;
      s.relations[here.id] = (s.relations[here.id] || 0) + 1;
    }
    const lines: Record<string, string> = {
      estate:
        '김실장: 어떤 집 찾으세요? 전에 낸 보증금은 새 계약에 돌려드려요.',
      cafe: '지수: 매일 들러 주니까 반갑네요. 배달 세 번만 끝내면 제가 보너스 챙겨드릴게요.',
      garage: '도윤: 폐공장 부품 두 개를 가져오면 25,000원에 살게요.',
      home: s.arrears
        ? '박 사장: 밀린 월세부터 부탁해요.'
        : '박 사장: 밥 잘 챙겨 먹어요. 월세일은 잊지 말고.',
      police:
        '이 순경: 위험한 일이 생기면 파출소로 오세요. 수색 중에는 여기서 벌금을 낼 수 있어요.',
    };
    return log(
      s,
      lines[here.id] ||
        `${here.person}: ${s.weather === '폭우' ? '오늘 비가 많이 오네요. 길 조심하세요.' : '오늘도 성수에서 좋은 하루 보내요.'}`,
    );
  }
  if (action === 'quest') {
    if (s.quests.includes(here.id)) return fail('이미 보상을 받은 의뢰입니다.');
    if (here.id === 'cafe') {
      if (s.deliveries < 3)
        return fail(`배달 ${3 - s.deliveries}회를 더 완료해 주세요.`);
      earn(s, 20000);
    } else if (here.id === 'garage') {
      if ((s.inventory.scrap || 0) < 2)
        return fail('바이크 부품 2개가 필요합니다.');
      s.inventory.scrap! -= 2;
      earn(s, 25000);
    } else return '';
    s.quests.push(here.id);
    s.relations[here.id] = (s.relations[here.id] || 0) + 3;
    return log(s, `${here.person} 의뢰 완료 · 사례금 입금, 호감 +3`);
  }
  if (action === 'loot') {
    if (here.kind !== 'loot') return '';
    if (s.looted[here.id] === today)
      return fail('오늘은 더 찾을 물건이 없습니다. 내일 다시 둘러보세요.');
    if (countItems(s.inventory) > 10)
      return fail('가방에 두 칸 이상의 여유가 필요합니다.');
    const loot: ItemId[] =
      here.id === 'factory'
        ? ['scrap', today % 2 ? 'tool' : 'gunpart']
        : here.id === 'construction'
          ? ['metal', 'tool']
          : here.id === 'warehouse'
            ? ['electronics', 'metal']
            : ['clothes', 'snack'];
    loot.forEach((i) => addItem(s, i));
    s.looted[here.id] = today;
    advanceMinutes(s, 15);
    if (['warehouse', 'construction'].includes(here.id))
      reportCrime(s, 2, '사유 물품 절도 · 현장 CCTV');
    return log(
      s,
      `${loot.map((i) => ITEMS[i].name).join(', ')} 획득${['warehouse', 'construction'].includes(here.id) ? ' · CCTV에 절도가 기록됐습니다.' : ''}`,
    );
  }
  if (action === 'event') {
    if (!s.event) return '';
    const e = EVENT_TYPES[s.event.index];
    if (here.id !== e.at) return fail('이벤트 장소를 방문하세요.');
    if (e.id === 'cat' && !(s.inventory.snack || 0))
      return fail('삼각김밥이 하나 필요합니다.');
    if (e.id === 'accident' && countItems(s.inventory) >= 12)
      return fail('가방 공간이 필요합니다.');
    s.event = null;
    if (e.id === 'cat') {
      if (!(s.inventory.snack || 0)) return fail('삼각김밥이 하나 필요합니다.');
      s.inventory.snack!--;
      s.hp = clamp(s.hp + 10);
    } else if (e.id === 'wallet') earn(s, 10000);
    else if (e.id === 'popup') {
      advanceMinutes(s, 60);
      earn(s, 20000);
    } else if (e.id === 'complaint') {
      advanceMinutes(s, 30);
      earn(s, 8000);
    } else if (e.id === 'accident') {
      if (!addItem(s, 'scrap')) return fail('가방 공간이 필요합니다.');
      advanceMinutes(s, 30);
    } else if (e.id === 'drunk') earn(s, 5000);
    s.relations[here.id] = (s.relations[here.id] || 0) + 1;
    return log(s, `${e.title} 해결 · 동네 호감 +1`);
  }
  if (action === 'fine') {
    if (here.id !== 'police') return '';
    const amount = (s.wanted + s.pendingHeat) * 25000;
    if (!amount) return fail('납부할 벌금이 없습니다.');
    if (!spend(s, amount)) return fail(`${won(amount)}이 필요합니다.`);
    s.wanted = s.reportIn = s.pendingHeat = 0;
    s.unseen = 0;
    return log(s, `벌금 ${won(amount)} 납부 · 수배 해제`);
  }
  if (action === 'ammo') {
    if (here.id !== 'factory') return '';
    if (!spend(s, 24000)) return fail('24,000원이 필요합니다.');
    s.reserve += 24;
    return log(s, '게임용 탄약 24발 교환 · 24,000원');
  }
  return '';
}

export function restoreLife(raw: string | null): Life {
  const fresh = createLife();
  if (!raw) return fresh;
  try {
    const data = JSON.parse(raw) as Life;
    data.decor ??= defaultDecor();
    data.cashDrops ??= [];
    data.dropSerial ??= 0;
    data.stolenBike ??= false;
    data.garageBike ??= null;
    data.contacts ??= [];
    data.companionId ??= null;
    data.numberCooldowns ??= {};
    if (data.version !== 1 || typeof data !== 'object') return fresh;
    for (const [key, defaultValue] of Object.entries(fresh)) {
      if (
        typeof defaultValue === 'number' &&
        (typeof data[key as keyof Life] !== 'number' ||
          !Number.isFinite(data[key as keyof Life] as number))
      )
        return fresh;
    }
    if (
      data.minutes < 0 ||
      data.minutes > 1440 * 36500 ||
      data.cash < 0 ||
      data.cash > 1e12 ||
      data.rentDueDay < 1 ||
      !Number.isInteger(data.rentDueDay) ||
      data.arrears < 0
    )
      return fresh;
    if (
      !Number.isInteger(data.homeTier) ||
      data.homeTier < 0 ||
      data.homeTier >= HOUSES.length ||
      !Number.isInteger(data.bikeTier) ||
      data.bikeTier < -1 ||
      data.bikeTier >= BIKES.length
    )
      return fresh;
    for (const key of ['inventory', 'storage'] as const) {
      if (
        !data[key] ||
        typeof data[key] !== 'object' ||
        Array.isArray(data[key])
      )
        return fresh;
      for (const [id, n] of Object.entries(data[key]))
        if (
          !Object.hasOwn(ITEMS, id) ||
          !Number.isInteger(n) ||
          n < 0 ||
          n > 64
        )
          return fresh;
    }
    for (const key of ['relations', 'talked', 'looted', 'worked'] as const) {
      if (
        !data[key] ||
        typeof data[key] !== 'object' ||
        Array.isArray(data[key])
      )
        return fresh;
      for (const [id, n] of Object.entries(data[key]))
        if (!PLACES.some((p) => p.id === id) || !Number.isInteger(n) || n < 0)
          return fresh;
    }
    for (const key of [
      'deliveries',
      'orderSerial',
      'earned',
      'ammo',
      'reserve',
    ] as const)
      if (!Number.isInteger(data[key]) || data[key] < 0 || data[key] > 1e12)
        return fresh;
    for (const key of ['playerX', 'playerZ', 'bikeX', 'bikeZ'] as const)
      if (Math.abs(data[key]) > 113) return fresh;
    if (
      data.order &&
      (typeof data.order.label !== 'string' ||
        (data.order.floor !== undefined && data.order.floor !== 2) ||
        !Number.isInteger(data.order.id) ||
        data.order.id < 1)
    )
      return fresh;
    if (
      !Array.isArray(data.quests) ||
      data.quests.some((q) => typeof q !== 'string') ||
      !Array.isArray(data.logs) ||
      data.logs.some(
        (l) => typeof l.text !== 'string' || !Number.isFinite(l.at),
      )
    )
      return fresh;
    for (const key of [
      'inside',
      'homeUpgrade',
      'bikeBox',
      'bikeTune',
      'outage',
    ] as const)
      if (typeof data[key] !== 'boolean') return fresh;
    if (data.nav !== null && !PLACES.some((p) => p.id === data.nav))
      return fresh;
    if (
      data.order &&
      (!PLACES.some((p) => p.id === data.order!.pickup) ||
        !PLACES.some((p) => p.id === data.order!.dropoff) ||
        !['pickup', 'dropoff'].includes(data.order.stage) ||
        !Number.isFinite(data.order.deadline) ||
        !Number.isFinite(data.order.pay) ||
        data.order.pay < 0 ||
        data.order.pay > 1e6)
    )
      return fresh;
    if (
      data.event &&
      (!Number.isInteger(data.event.index) ||
        !EVENT_TYPES[data.event.index] ||
        !Number.isFinite(data.event.expires))
    )
      return fresh;
    if (!['맑음', '폭우'].includes(data.weather)) return fresh;
    if (
      countItems(data.inventory) > 12 ||
      countItems(data.storage) > HOUSES[data.homeTier].capacity
    )
      return fresh;
    if (
      !data.decor ||
      !Array.isArray(data.decor.owned) ||
      data.decor.owned.some((id) => !Object.hasOwn(DECOR, id)) ||
      !data.decor.placed ||
      typeof data.decor.placed !== 'object' ||
      !WALL_COLORS.includes(data.decor.wall) ||
      !FLOOR_COLORS.includes(data.decor.floor)
    )
      return fresh;
    for (const [id, slot] of Object.entries(data.decor.placed))
      if (
        !data.decor.owned.includes(id as DecorId) ||
        !Number.isInteger(slot) ||
        slot! < 0 ||
        slot! > 2
      )
        return fresh;
    if (
      !Array.isArray(data.cashDrops) ||
      data.cashDrops.length > 64 ||
      !Number.isInteger(data.dropSerial) ||
      data.dropSerial < 0 ||
      data.cashDrops.some(
        (d) =>
          !d ||
          !Number.isInteger(d.id) ||
          d.id < 1 ||
          !Number.isInteger(d.amount) ||
          d.amount < 1 ||
          d.amount > 100000 ||
          !Number.isFinite(d.x) ||
          Math.abs(d.x) > 113 ||
          !Number.isFinite(d.z) ||
          Math.abs(d.z) > 110 ||
          !Number.isFinite(d.readyAt),
      )
    )
      return fresh;
    if (
      new Set(data.cashDrops.map((d) => d.id)).size !== data.cashDrops.length ||
      data.cashDrops.some((d) => d.id > data.dropSerial)
    )
      return fresh;
    if (typeof data.stolenBike !== 'boolean') return fresh;
    if (
      !Array.isArray(data.contacts) ||
      data.contacts.some((id) => !FEMALE_RESIDENT_IDS.includes(id)) ||
      new Set(data.contacts).size !== data.contacts.length ||
      (data.companionId !== null &&
        !data.contacts.includes(data.companionId)) ||
      !data.numberCooldowns ||
      typeof data.numberCooldowns !== 'object' ||
      Object.entries(data.numberCooldowns).some(
        ([id, time]) =>
          !FEMALE_RESIDENT_IDS.includes(Number(id)) ||
          !Number.isFinite(time) ||
          time < 0,
      )
    )
      return fresh;
    const gb = data.garageBike;
    if (
      gb &&
      (!Number.isInteger(gb.tier) ||
        !BIKES[gb.tier] ||
        !Number.isFinite(gb.fuel) ||
        gb.fuel < 0 ||
        gb.fuel > 100 ||
        !Number.isFinite(gb.hp) ||
        gb.hp < 0 ||
        gb.hp > 100 ||
        typeof gb.box !== 'boolean' ||
        typeof gb.tune !== 'boolean' ||
        typeof gb.stolen !== 'boolean')
    )
      return fresh;
    Reflect.deleteProperty(data, 'fatigue');
    Reflect.deleteProperty(data, 'hunger');
    for (const key of ['hp', 'fuel', 'bikeHp'] as const)
      data[key] = clamp(data[key]);
    data.caffeine = clamp(data.caffeine, 0, 6);
    data.ammo = Math.floor(clamp(data.ammo, 0, 30));
    data.reserve = Math.floor(clamp(data.reserve, 0, 9999));
    data.wanted = Math.floor(clamp(data.wanted, 0, 5));
    data.pendingHeat = clamp(data.pendingHeat, 0, 5);
    data.reportIn = clamp(data.reportIn, 0, 4);
    data.rating = clamp(data.rating, 1, 5);
    data.logs = data.logs.slice(0, 20);
    return { ...fresh, ...data };
  } catch {
    return fresh;
  }
}
