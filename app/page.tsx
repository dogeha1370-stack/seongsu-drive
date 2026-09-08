'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { connectGuests, type Connection } from './multiplayer';
import { Users, Copy } from 'lucide-react';
import { BBQ_MENU, type BbqItem } from './bbq';
import { MCD_MENU, type McdItem } from './mcdonalds';
import { Joystick } from './joystick';
import { residentName } from './social';
import { RoomChat } from './room-chat';
import { BikeShowroom } from './bike-showroom';
import type { ChatMessage } from './multiplayer';
import { DECOR, WALL_COLORS, FLOOR_COLORS, type DecorId } from './decor';
import {
  TrainFront,
  Store,
  Wrench,
  Trees,
  Building2,
  Beer,
  Monitor,
  Palette,
  Armchair,
  Leaf,
  LampDesk,
  Frame,
  Library,
  Signal,
  Wifi,
  BatteryFull,
  CircleGauge,
} from 'lucide-react';
import {
  Coffee,
  Smartphone,
  Backpack,
  MapPin,
  House,
  Wallet,
  Heart,
  Sun,
  Moon,
  CloudRain,
  ArrowUpRight,
  Bike,
  Shield,
  ChevronRight,
  Package,
  Pause,
  Play,
  HelpCircle,
  Utensils,
  Navigation,
  Check,
  BedDouble,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { createGame, type GameApi, type Hud, type Panel } from './game';
import {
  createLife,
  PLACES,
  place,
  HOUSES,
  BIKES,
  ITEMS,
  EVENT_TYPES,
  won,
  day,
  clockText,
  availableOrders,
  targetPlace,
  countItems,
  type Action,
  type ItemId,
  type Inventory,
} from './life';
const initial: Hud = {
  social: null,
  position: { x: -40, z: -75 },
  heading: 0,
  playerHeading: 0,
  life: createLife(),
  panel: null,
  nearby: 'home',
  riding: false,
  aiming: false,
  ads: false,
  reload: 0,
  spread: 8,
  saveStatus: '이 브라우저에 자동 저장',
  activity: '',
  armed: false,
  vehicleHp: 100,
  hp: 100,
  hurt: false,
  speed: 0,
  driving: false,
  mission: 0,
  distance: 0,
  paused: false,
  hint: 'E 집 관리 · P 휴대폰',
  error: '',
};
const wantedLabels = [
  '평범한 시민',
  '신고 접수',
  '순찰차 출동',
  '경찰 추적',
  '지역 수색',
  '대규모 추적',
];
export default function Page() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const host = useRef<HTMLDivElement>(null),
    api = useRef<GameApi | null>(null);
  const [h, setHud] = useState<Hud>(initial);
  const latest = useRef(initial),
    network = useRef<ReturnType<typeof connectGuests> | null>(null);
  const [connection, setConnection] = useState<Connection>({
      status: 'offline',
      name: '',
      room: '',
      count: 0,
      error: '',
    }),
    [nickname, setNickname] = useState(''),
    [roomCode, setRoomCode] = useState(''),
    [copyNotice, setCopyNotice] = useState(''),
    [selectedHouse, setSelectedHouse] = useState(0);
  useEffect(() => {
    latest.current = h;
  }, [h]);
  useEffect(() => {
    let game: GameApi;
    try {
      game = createGame(host.current!, setHud);
      api.current = game;
      const guests = connectGuests(
        () => game.presence(),
        setConnection,
        (peers) => game.setPeers(peers),
        (amount) => game.receiveDamage(amount),
        setMessages,
      );
      network.current = guests;
      game.onPeerAttack((id, kind) => guests.attack(id, kind));
      let preferred = '';
      try {
        preferred = localStorage.getItem('seongsu-guest-name') || '';
      } catch {}
      const invited =
        new URLSearchParams(window.location.search).get('room') || '';
      void guests.join({ name: preferred, room: invited });
    } catch (error) {
      console.error(error);
      queueMicrotask(() =>
        setHud((s) => ({
          ...s,
          error:
            '3D 화면을 시작하지 못했습니다. 하드웨어 가속을 지원하는 브라우저에서 다시 열어주세요.',
        })),
      );
    }
    return () => {
      network.current?.dispose();
      network.current = null;
      game?.dispose();
    };
  }, []);
  const s = h.life,
    home = HOUSES[s.homeTier],
    target = targetPlace(s),
    at = h.nearby ? place(h.nearby) : null;
  const chatTyping = useCallback(
    (value: boolean) => api.current?.typing(value),
    [],
  );
  const sendChat = useCallback(async (text: string) => {
    if (!network.current) throw new Error('먼저 접속하세요.');
    await network.current.sendChat(text);
  }, []);
  const action = useCallback(
      (type: Action, value = '') => api.current?.action(type, value),
      [],
    ),
    open = useCallback((panel: Panel) => api.current?.open(panel), []);
  const time = clockText(s),
    night = Number(time.slice(0, 2)) < 6 || Number(time.slice(0, 2)) >= 19,
    event = s.event ? EVENT_TYPES[s.event.index] : null;
  const panelTitle =
    h.panel === 'friends'
      ? '친구와 성수에서'
      : h.panel === 'phone'
        ? '내 손안의 성수'
        : h.panel === 'bag'
          ? '가방과 소지품'
          : h.panel === 'map'
            ? '성수동 동네 지도'
            : h.panel === 'home'
              ? home.name
              : h.panel === 'help'
                ? '성수에서 살아가는 법'
                : at?.name || '동네 이야기';
  const distanceTo = (p: { x: number; z: number }) =>
    Math.round(Math.hypot(p.x - h.position.x, p.z - h.position.z));
  const placeIcons = {
    home: House,
    station: TrainFront,
    cafe: Coffee,
    food: Utensils,
    beauty: Store,
    store: Store,
    garage: Wrench,
    estate: Building2,
    police: Shield,
    park: Trees,
    housing: Building2,
    bar: Beer,
    pc: Monitor,
    loot: Package,
  };
  const decorIcons = {
    rug: Armchair,
    plant: Leaf,
    lamp: LampDesk,
    shelf: Library,
    poster: Frame,
  };
  function inventory(items: Inventory, stored = false) {
    const entries = Object.entries(items).filter(([, n]) => n && n > 0) as [
      ItemId,
      number,
    ][];
    return entries.length ? (
      <div className="item-list">
        {entries.map(([id, n]) => (
          <div className="item-row" key={id}>
            <div className="item-icon">
              {ITEMS[id].food ? (
                <Utensils size={19} />
              ) : ITEMS[id].energy ? (
                <Coffee size={19} />
              ) : (
                <Package size={19} />
              )}
            </div>
            <div className="grow">
              <b>
                {ITEMS[id].name} <span>×{n}</span>
              </b>
              <small>
                {ITEMS[id].price
                  ? `HP +${ITEMS[id].hp}`
                  : `판매가 ${won(ITEMS[id].sell)}`}
              </small>
            </div>
            <div className="row-actions">
              {!stored && ITEMS[id].price > 0 && (
                <button onClick={() => action('consume', id)}>사용</button>
              )}
              {s.inside && (
                <button onClick={() => action(stored ? 'take' : 'store', id)}>
                  {stored ? '꺼내기' : '보관'}
                </button>
              )}
              {!stored &&
                h.panel === 'place' &&
                at &&
                ['store', 'garage'].includes(at.kind) && (
                  <button onClick={() => action('sell', id)}>판매</button>
                )}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="empty">
        {stored
          ? '보관함이 비어 있습니다. 가방의 물건을 보관해 보세요.'
          : '가방이 비어 있습니다. 상점이나 골목에서 필요한 물건을 찾아보세요.'}
      </p>
    );
  }
  function shop(ids: ItemId[]) {
    return (
      <div className="cards">
        {ids.map((id) => (
          <article className="offer" key={id}>
            <Coffee size={22} />
            <h3>{ITEMS[id].name}</h3>
            <p>HP +{ITEMS[id].hp}</p>
            <button
              disabled={
                s.cash < ITEMS[id].price || countItems(s.inventory) >= 12
              }
              onClick={() => action('buy', id)}
            >
              {won(ITEMS[id].price)} <span>구매 +</span>
            </button>
          </article>
        ))}
      </div>
    );
  }
  function homePanel() {
    return (
      <>
        <div className="home-summary">
          <House size={32} />
          <div>
            <span>
              TIER {s.homeTier} · {home.area}
            </span>
            <h3>{home.name}</h3>
            <p>문 쪽으로 걸어가면 밖으로 나갑니다.</p>
          </div>
          <button onClick={() => open(null)}>방으로 돌아가기</button>
        </div>
        <Tabs defaultValue="decorate" className="home-tabs">
          <TabsList className="game-tabs">
            <TabsTrigger value="decorate">
              <Palette size={16} />방 꾸미기
            </TabsTrigger>
            <TabsTrigger value="living">집 관리</TabsTrigger>
            <TabsTrigger value="storage">보관함</TabsTrigger>
          </TabsList>
          <TabsContent value="decorate">
            <div className="section-label">
              벽지 <span>색상 변경 무료</span>
            </div>
            <div className="color-swatches">
              {WALL_COLORS.map((color, i) => (
                <button
                  key={color}
                  aria-label={
                    ['그레이 벽지', '크림 벽지', '블루 벽지', '테라코타 벽지'][
                      i
                    ]
                  }
                  aria-pressed={s.decor.wall === color}
                  style={{ background: color }}
                  onClick={() => action('wallpaper', color)}
                >
                  {s.decor.wall === color && <Check size={20} />}
                </button>
              ))}
            </div>
            <div className="section-label">바닥</div>
            <div className="color-swatches">
              {FLOOR_COLORS.map((color, i) => (
                <button
                  key={color}
                  aria-label={['다크 우드', '라이트 우드', '차콜'][i]}
                  aria-pressed={s.decor.floor === color}
                  style={{ background: color }}
                  onClick={() => action('flooring', color)}
                >
                  {s.decor.floor === color && <Check size={20} />}
                </button>
              ))}
            </div>
            <div className="cards decor-cards">
              {(Object.keys(DECOR) as DecorId[]).map((id) => {
                const item = DECOR[id],
                  owned = s.decor.owned.includes(id),
                  slot = s.decor.placed[id],
                  Icon = decorIcons[id];
                return (
                  <article className="offer" key={id}>
                    <Icon />
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    <button
                      disabled={!owned && s.cash < item.price}
                      onClick={() =>
                        action(owned ? 'decor-place' : 'decor-buy', id)
                      }
                    >
                      {owned
                        ? slot === undefined
                          ? '방에 놓기'
                          : slot === 2
                            ? '보관하기'
                            : '배치 ' + (slot + 1) + ' → 다음 자리'
                        : won(item.price) + ' · 구매'}
                    </button>
                  </article>
                );
              })}
            </div>
            <p className="subtle">
              구매한 소품은 세 자리로 옮기거나 보관할 수 있습니다. 문은 항상
              열어 둡니다.
            </p>
          </TabsContent>
          <TabsContent value="living">
            <div className="cards">
              <article className="offer">
                <BedDouble />
                <h3>잠자기</h3>
                <p>8시간 수면 · HP 100 회복</p>
                <button
                  disabled={!!(s.wanted || s.pendingHeat)}
                  onClick={() => action('sleep')}
                >
                  8시간 쉬기
                </button>
              </article>
              <article className="offer">
                <Wallet />
                <h3>{s.arrears ? '미납 청구서' : '다음 월세'}</h3>
                <strong>{won(s.arrears || home.rent)}</strong>
                <p>납부까지 D-{s.rentDueDay - day(s)}</p>
                <button
                  disabled={
                    s.cash < (s.arrears || home.rent) ||
                    !(s.arrears || home.rent)
                  }
                  onClick={() => action('rent')}
                >
                  납부하기
                </button>
              </article>
              <article className="offer">
                <BedDouble />
                <h3>침대 교체</h3>
                <p>편안한 침구로 방의 분위기를 바꿔보세요.</p>
                <button
                  disabled={s.homeUpgrade || s.cash < 120000}
                  onClick={() => action('furniture')}
                >
                  {s.homeUpgrade ? '교체 완료' : '120,000원 · 교체'}
                </button>
              </article>
            </div>
          </TabsContent>
          <TabsContent value="storage">
            <div className="section-label">
              가방 <span>{countItems(s.inventory)} / 12</span>
            </div>
            {inventory(s.inventory)}
            <div className="section-label">
              집 보관함{' '}
              <span>
                {countItems(s.storage)} / {home.capacity}
              </span>
            </div>
            {inventory(s.storage, true)}
          </TabsContent>
        </Tabs>
      </>
    );
  }
  function phonePanel() {
    return (
      <Tabs defaultValue="delivery" className="phone-tabs">
        <TabsList className="game-tabs">
          <TabsTrigger value="delivery">
            <Bike size={21} />
            <span>배달</span>
          </TabsTrigger>
          <TabsTrigger value="money">
            <Wallet size={21} />
            <span>지갑</span>
          </TabsTrigger>
          <TabsTrigger value="people">
            <Heart size={21} />
            <span>연락처</span>
          </TabsTrigger>
          <TabsTrigger value="news">
            <MapPin size={21} />
            <span>소식</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="delivery">
          <div className="delivery-summary">
            <div>
              <span>라이더 레벨 {1 + Math.floor(s.deliveries / 5)}</span>
              <h3>오늘도, 잘 부탁드립니다.</h3>
            </div>
            <b>
              ★ {s.rating.toFixed(2)}
              <small>완료 {s.deliveries}건</small>
            </b>
          </div>
          {s.order ? (
            <article className="active-order">
              <span className="pill">
                {s.order.stage === 'pickup'
                  ? '픽업하러 가는 중'
                  : '고객에게 배달 중'}
              </span>
              <h3>{s.order.label}</h3>
              <p>
                {place(s.order.pickup).name} → {place(s.order.dropoff).name}
              </p>
              <strong>{won(s.order.pay)}</strong>
              <p>
                게임 시간 {Math.max(0, Math.ceil(s.order.deadline - s.minutes))}
                분 남음 · 목적지에서 E 키
              </p>
              <div className="row-actions">
                <button className="primary" onClick={() => open(null)}>
                  거리로 돌아가기 <ArrowUpRight size={16} />
                </button>
                <button onClick={() => action('cancel')}>
                  취소 · 평점 −0.1
                </button>
              </div>
            </article>
          ) : (
            <>
              <p className="subtle">
                도보로도 시작할 수 있어요. 첫 배달 완료 시 정착 보너스 30,000원.
              </p>
              <div className="order-list">
                {availableOrders(s).map((order, i) => (
                  <article className="order" key={i}>
                    <div className="order-number">0{i + 1}</div>
                    <div className="grow">
                      <span>{order.label}</span>
                      <h3>
                        {place(order.pickup).name} <ChevronRight size={15} />{' '}
                        {place(order.dropoff).name}
                      </h3>
                      <small>
                        150분 이내 ·{' '}
                        {Math.round(
                          Math.hypot(
                            place(order.pickup).x - place(order.dropoff).x,
                            place(order.pickup).z - place(order.dropoff).z,
                          ),
                        )}
                        m 직선거리
                        {s.weather === '폭우' ? ' · 우천 할증 포함' : ''}
                      </small>
                    </div>
                    <div>
                      <strong>{won(order.pay)}</strong>
                      <button
                        disabled={!!(s.wanted || s.pendingHeat)}
                        onClick={() => action('accept', String(i))}
                      >
                        배달 수락 <ArrowUpRight size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </TabsContent>
        <TabsContent value="money">
          <div className="ledger-balance">
            <small>지금 쓸 수 있는 돈</small>
            <strong>{won(s.cash)}</strong>
            <span>누적 수입 {won(s.earned)}</span>
          </div>
          <div className="fact-grid">
            <div>
              집<b>{home.name}</b>
            </div>
            <div>
              다음 월세
              <b>
                {won(home.rent)} · D-{s.rentDueDay - day(s)}
              </b>
            </div>
            <div>
              미납금
              <b className={s.arrears ? 'danger' : ''}>{won(s.arrears)}</b>
            </div>
            <div>
              하루 고정 생활비
              <b>
                {won(2000 + (s.bikeTier >= 0 ? 1500 : 0) + s.homeTier * 1000)}
              </b>
            </div>
            <div>
              기납부 보증금 / 주택 자산<b>{won(home.deposit)}</b>
            </div>
            <div>
              이동수단<b>{s.bikeTier >= 0 ? BIKES[s.bikeTier].name : '도보'}</b>
            </div>
          </div>
          <p className="subtle">
            고정 생활비는 자정에 통신·관리비와 바이크 보험료로 정산됩니다.
            집에서 월세를 납부할 수 있습니다.
          </p>
          <div className="section-label">최근 생활 기록</div>
          <div className="journal">
            {s.logs.map((l, i) => (
              <p key={i}>
                <time>{Math.floor(l.at / 1440) + 1}일차</time>
                {l.text}
              </p>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="people">
          {s.contacts.length > 0 && (
            <>
              <div className="section-label">저장한 연락처</div>
              {s.contacts.map((id) => (
                <article className="contact" key={`resident-${id}`}>
                  <div>
                    <h3>{residentName(id)}</h3>
                    <p>
                      {s.companionId === id
                        ? '지금 함께 걷는 중'
                        : '거리에서 다시 만나면 함께 걸을 수 있어요.'}
                    </p>
                  </div>
                  <Heart size={19} />
                </article>
              ))}
              <div className="section-label">동네 사람들</div>
            </>
          )}
          <p className="subtle">
            직접 찾아가 대화하고 의뢰를 마치면 호감이 쌓입니다.
          </p>
          {['cafe', 'garage', 'estate', 'home', 'police'].map((id) => {
            const p = place(id);
            return (
              <article className="contact" key={id}>
                <div>
                  <h3>{p.person}</h3>
                  <p>
                    {p.name} · 호감 {s.relations[id] || 0}
                  </p>
                  {id === 'cafe' && (
                    <small>
                      의뢰: 배달 3회 · 20,000원{' '}
                      {s.quests.includes(id)
                        ? '✓ 완료'
                        : `(${Math.min(3, s.deliveries)}/3)`}
                    </small>
                  )}
                  {id === 'garage' && (
                    <small>
                      의뢰: 바이크 부품 2개 · 25,000원{' '}
                      {s.quests.includes(id) ? '✓ 완료' : ''}
                    </small>
                  )}
                </div>
                <button onClick={() => action('navigate', id)}>
                  길 안내 <Navigation size={15} />
                </button>
              </article>
            );
          })}
        </TabsContent>
        <TabsContent value="news">
          {event ? (
            <article className="active-order">
              <span className="pill">지금 성수에서는</span>
              <h3>{event.title}</h3>
              <p>{event.body}</p>
              <p>{event.choice}</p>
              <small>
                게임 시간 {Math.ceil(s.event!.expires - s.minutes)}분 남음 ·
                참여는 자유입니다.
              </small>
              <button
                className="primary"
                onClick={() => action('navigate', event.at)}
              >
                현장으로 길 안내 <ArrowUpRight size={16} />
              </button>
            </article>
          ) : (
            <p className="empty">
              지금은 조용한 동네입니다. 거리를 둘러보면 새로운 소식이
              도착합니다.
            </p>
          )}
          <div className="fact-grid">
            <div>
              날씨<b>{s.weather}</b>
            </div>
            <div>
              전력<b>{s.outage ? '일부 간판 정전' : '정상 공급'}</b>
            </div>
            <div>
              시간 흐름<b>실제 30분 = 하루</b>
            </div>
            <div>
              현재 활동
              <b>
                {night
                  ? '야간 배달 · 취객 · 경찰 순찰'
                  : '출퇴근 · 카페 · 배달'}
              </b>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    );
  }
  function estatePanel() {
    const house = HOUSES[selectedHouse],
      price = Math.max(0, house.deposit - home.deposit);
    return (
      <div className="estate-shop">
        <div className="estate-nameplate">
          <House />
          <div>
            <b>성수 공인중개사</b>
            <span>김실장의 오늘의 매물</span>
          </div>
          <span className="estate-stamp">계약</span>
        </div>
        <div className="estate-tab">
          주거 매물 <b>{HOUSES.length}</b>
        </div>
        <div className="estate-slots" aria-label="4행 4열 주거 매물">
          {Array.from({ length: 16 }, (_, i) => {
            const item = HOUSES[i];
            const Icon = i < 2 ? House : Building2;
            return (
              <button
                key={i}
                disabled={!item}
                aria-label={item ? item.name : '빈 매물칸'}
                aria-pressed={selectedHouse === i}
                onClick={() => setSelectedHouse(i)}
              >
                {item ? (
                  <>
                    <Icon size={30} />
                    <span>
                      {['반지하', '원룸', '오피스텔', '투룸', '아파트'][i]}
                    </span>
                    {s.homeTier === i && <i>거주</i>}
                  </>
                ) : (
                  <span className="empty-slot" />
                )}
              </button>
            );
          })}
        </div>
        <article className="estate-details">
          <span>
            매물 No. {String(selectedHouse + 1).padStart(2, '0')} · {house.area}
          </span>
          <h3>{house.name}</h3>
          <p>
            {house.detail} · 수납 {house.capacity}칸
          </p>
          <dl>
            <div>
              <dt>{selectedHouse === 4 ? '매매가' : '보증금'}</dt>
              <dd>{won(house.deposit)}</dd>
            </div>
            <div>
              <dt>월세</dt>
              <dd>{won(house.rent)}</dd>
            </div>
            <div>
              <dt>기존 보증금 반환</dt>
              <dd>{won(home.deposit)}</dd>
            </div>
          </dl>
        </article>
        <footer>
          <div>
            <span>
              보유 현금 <b>{won(s.cash)}</b>
            </span>
            <span>
              추가 계약금 <b>{won(price)}</b>
            </span>
          </div>
          <button
            disabled={
              selectedHouse <= s.homeTier || !!s.arrears || s.cash < price
            }
            onClick={() => action('house', String(selectedHouse))}
          >
            {selectedHouse === s.homeTier
              ? '현재 거주 중'
              : selectedHouse < s.homeTier
                ? '계약 완료'
                : s.arrears
                  ? '미납 월세 납부 필요'
                  : s.cash < price
                    ? '현금 부족'
                    : '계약하기'}
          </button>
        </footer>
        <p className="estate-note">
          다음 월세일은 유지됩니다. 매물을 선택해 조건을 확인하세요.
        </p>
      </div>
    );
  }
  function placePanel() {
    if (!at) return null;
    return (
      <>
        <div className="shop-greeting">
          <span>{at.person}</span>
          <h3>
            {at.kind === 'estate'
              ? '어떤 집 찾으세요?'
              : at.kind === 'garage'
                ? '오늘도 안전하게 타요.'
                : at.kind === 'loot'
                  ? '주변을 꼼꼼히 살펴보자.'
                  : '어서 오세요.'}
          </h3>
          <p>동네 호감 {s.relations[at.id] || 0}</p>
          <button onClick={() => action('talk')}>이야기 나누기</button>
        </div>
        {at.kind === 'cafe' && shop(['americano', 'specialty'])}
        {at.kind === 'store' && shop(['snack', 'meal', 'canned'])}
        {at.kind === 'bar' && shop(['meal'])}
        {at.id === 'bbq' && (
          <div className="mcd-menu bbq-menu">
            <header>
              <Image
                unoptimized
                src="/bbq/logo.svg"
                alt="BBQ"
                width={75}
                height={33}
              />
              <div>
                <h3>치킨 주문</h3>
                <p>BBQ · 성수점</p>
              </div>
            </header>
            <div className="mcd-products">
              {(Object.keys(BBQ_MENU) as BbqItem[]).map((id) => {
                const item = BBQ_MENU[id];
                return (
                  <article key={id}>
                    <Image
                      unoptimized
                      src={item.image}
                      alt={item.name}
                      width={1500}
                      height={1000}
                    />
                    <h4>{item.name}</h4>
                    <p>{item.description}</p>
                    <small>HP +{item.hp}</small>
                    <button
                      disabled={
                        s.cash < item.price || countItems(s.inventory) >= 12
                      }
                      onClick={() => action('buy', id)}
                    >
                      {won(item.price)} · 담기
                    </button>
                  </article>
                );
              })}
            </div>
            <p className="mcd-source">
              게임 내 설정 가격 · 가방에서 꺼내 먹기
              <br />
              <a
                href="https://bbq.co.kr/categories/17"
                target="_blank"
                rel="noreferrer"
              >
                BBQ 공식 메뉴 ↗
              </a>
            </p>
            <button
              className="primary bbq-delivery"
              onClick={() => open('phone')}
            >
              치킨 배달로 돈 벌기 →
            </button>
          </div>
        )}
        {at.id === 'burger' && (
          <div className="mcd-menu">
            <header>
              <Image
                unoptimized
                src="/mcd/logo.svg"
                alt="맥도날드"
                width="44"
                height="44"
              />
              <div>
                <h3>맛있는 선택</h3>
                <p>McDonald’s · 주문 메뉴</p>
              </div>
            </header>
            <div className="mcd-products">
              {(Object.keys(MCD_MENU) as McdItem[]).map((id) => {
                const item = MCD_MENU[id];
                return (
                  <article key={id}>
                    <Image
                      unoptimized
                      src={item.image}
                      alt={item.name}
                      width="772"
                      height="530"
                    />
                    <h4>{item.name}</h4>
                    <p>{item.description}</p>
                    <small>HP +{item.hp}</small>
                    <button
                      disabled={
                        s.cash < item.price || countItems(s.inventory) >= 12
                      }
                      onClick={() => action('buy', id)}
                    >
                      {won(item.price)} · 담기
                    </button>
                  </article>
                );
              })}
            </div>
            <p className="mcd-source">
              게임 내 설정 가격 · 구매 후 가방에서 꺼내 먹기
              <br />
              <a
                href="https://www.mcdonalds.co.kr/kor/menu/burger?ca=2&page=1"
                target="_blank"
                rel="noreferrer"
              >
                공식 메뉴 보기 ↗
              </a>
            </p>
          </div>
        )}
        {(at.id === 'bbq' ||
          ['cafe', 'store', 'bar', 'pc'].includes(at.kind)) && (
          <article className="job">
            <div>
              <h3>
                {at.id === 'bbq' ? '치킨 포장 보조' : '오늘의 아르바이트'}
              </h3>
              <p>
                {at.id === 'bbq'
                  ? '2시간 근무 · 하루 한 번'
                  : '6시간 근무 · 하루 한 번'}
              </p>
              <small>진행 중인 배달을 마친 뒤 근무할 수 있습니다.</small>
            </div>
            <button
              disabled={
                s.worked[at.id] === day(s) ||
                !!s.order ||
                !!(s.wanted || s.pendingHeat)
              }
              onClick={() => action('work')}
            >
              {s.worked[at.id] === day(s)
                ? '오늘 근무 완료'
                : at.id === 'bbq'
                  ? '포장하기 · 30,000원'
                  : '일하기 · 60,000원'}
            </button>
          </article>
        )}
        {['cafe', 'garage'].includes(at.id) && (
          <article className="job">
            <div>
              <h3>
                {at.id === 'cafe' ? '지수의 배달 응원' : '도윤의 부품 수집'}
              </h3>
              <p>
                {at.id === 'cafe'
                  ? `배달 3회 완료 (${Math.min(3, s.deliveries)}/3) · 20,000원`
                  : `바이크 부품 2개 (${Math.min(2, s.inventory.scrap || 0)}/2) · 25,000원`}
              </p>
            </div>
            <button
              disabled={
                s.quests.includes(at.id) ||
                (at.id === 'cafe'
                  ? s.deliveries < 3
                  : (s.inventory.scrap || 0) < 2)
              }
              onClick={() => action('quest')}
            >
              {s.quests.includes(at.id) ? '의뢰 완료' : '보상 받기'}
            </button>
          </article>
        )}
        {at.kind === 'garage' && (
          <>
            {s.garageBike && (
              <article className="job">
                <div>
                  <h3>보관한 바이크</h3>
                  <p>{BIKES[s.garageBike.tier].name}</p>
                </div>
                <button onClick={() => action('garage-bike')}>꺼내기</button>
              </article>
            )}
            <div className="section-label">
              내 바이크{' '}
              <span>
                {s.bikeTier < 0 ? '아직 없음' : BIKES[s.bikeTier].name}
              </span>
            </div>
            {s.bikeTier >= 0 && (
              <>
                <div className="fact-grid">
                  <div>
                    연료<b>{Math.round(s.fuel)}%</b>
                  </div>
                  <div>
                    내구도<b>{Math.round(s.bikeHp)}%</b>
                  </div>
                </div>
                <div className="row-actions wrap">
                  <button onClick={() => action('fuel')}>
                    주유 {won(Math.ceil(100 - s.fuel) * 100)}
                  </button>
                  <button onClick={() => action('repair')}>
                    수리 {won(Math.ceil(100 - s.bikeHp) * 250)}
                  </button>
                  <button disabled={s.bikeBox} onClick={() => action('box')}>
                    {s.bikeBox
                      ? '배달 박스 장착됨'
                      : '박스 80,000원 · 건당 +700원'}
                  </button>
                  <button disabled={s.bikeTune} onClick={() => action('tune')}>
                    {s.bikeTune ? '튜닝 완료' : '튜닝 150,000원 · 속도 향상'}
                  </button>
                </div>
              </>
            )}
            <BikeShowroom
              owned={s.bikeTier}
              cash={s.cash}
              buy={(i) => action('bike', String(i))}
            />
          </>
        )}
        {at.id === 'office' && (
          <article className="job">
            <div>
              <h3>서울숲 빌딩 · 2층</h3>
              <p>1층 로비 → 엘리베이터 → 2층 201호</p>
            </div>
            <button onClick={() => api.current?.elevator()}>
              로비 들어가기
            </button>
          </article>
        )}
        {at.id === 'olive' && (
          <article className="olive-pickup">
            <small>OLIVE YOUNG</small>
            <h3>뷰티 박스 픽업</h3>
            <p>
              휴대폰에서 배달을 수락하고 E 키로 상품을 받아 주세요. 서울숲 빌딩
              2층 201호에 전달합니다.
            </p>
            <button onClick={() => open('phone')}>배달 주문 보기</button>
          </article>
        )}
        {at.kind === 'estate' && estatePanel()}
        {at.kind === 'loot' && (
          <article className="active-order">
            <Package />
            <h3>
              {['warehouse', 'construction'].includes(at.id)
                ? '소유권이 있는 물건'
                : '버려진 물건 살펴보기'}
            </h3>
            <p>
              {['warehouse', 'construction'].includes(at.id)
                ? '가져가면 절도입니다. 현장 CCTV 신고로 경찰 관심도가 올라갑니다.'
                : '가져가도 되는 폐품입니다. 부품과 생활용품을 찾아 상점에 판매해 보세요.'}
            </p>
            <p>가방 2칸 필요 · 게임 시간 15분 · 하루 한 번</p>
            <button
              className={
                ['warehouse', 'construction'].includes(at.id)
                  ? 'danger-button'
                  : 'primary'
              }
              disabled={
                s.looted[at.id] === day(s) || countItems(s.inventory) > 10
              }
              onClick={() => action('loot')}
            >
              {s.looted[at.id] === day(s)
                ? '오늘 탐색 완료'
                : ['warehouse', 'construction'].includes(at.id)
                  ? '훔치기 · 신고 위험'
                  : '탐색하기'}
            </button>
            {at.id === 'factory' && (
              <button onClick={() => action('ammo')} disabled={s.cash < 24000}>
                탄약 24발 교환 · 24,000원
              </button>
            )}
          </article>
        )}
        {at.kind === 'police' && (
          <article className="job">
            <div>
              <h3>{wantedLabels[s.wanted]}</h3>
              <p>벌금을 납부하면 신고와 수배가 해제됩니다.</p>
            </div>
            <button
              disabled={
                !(s.wanted + s.pendingHeat) ||
                s.cash < (s.wanted + s.pendingHeat) * 25000
              }
              onClick={() => action('fine')}
            >
              벌금 납부 {won((s.wanted + s.pendingHeat) * 25000)}
            </button>
          </article>
        )}
        {event && event.at === at.id && (
          <article className="active-order">
            <span className="pill">동네 이벤트</span>
            <h3>{event.title}</h3>
            <p>{event.body}</p>
            <button onClick={() => action('event')}>{event.choice}</button>
          </article>
        )}
        {['store', 'garage'].includes(at.kind) && (
          <>
            <div className="section-label">가방 · 중고 물품 거래</div>
            {inventory(s.inventory)}
          </>
        )}
      </>
    );
  }
  return (
    <main className="game-shell">
      <div ref={host} className="world" />
      <div className="shade" />
      <header className="game-header">
        <div className="brand">
          <b>
            <CircleGauge size={29} />
          </b>
          <div>
            <h1>성수 드라이브</h1>
            <small>SEONGSU DRIVE</small>
          </div>
          <span className="edition">성수에서, 내 방식대로.</span>
        </div>
        <nav className="header-actions" aria-label="게임 메뉴">
          <button aria-label="친구와 만나기" onClick={() => open('friends')}>
            <Users size={19} />
            <span>함께하기</span>
            <b className="online-count">{connection.count}</b>
          </button>
          <button onClick={() => open('phone')}>
            <Smartphone size={19} />
            <span>휴대폰</span>
            <kbd>P</kbd>
          </button>
          <button onClick={() => open('bag')} aria-label="가방 열기">
            <Backpack size={19} />
            <span>가방</span>
          </button>
          <button onClick={() => open('map')} aria-label="지도 열기">
            <MapPin size={19} />
            <span>지도</span>
          </button>
          <button aria-label="조작 도움말" onClick={() => open('help')}>
            <HelpCircle size={19} />
          </button>
          <button
            onClick={() => api.current?.pause()}
            aria-label={h.paused ? '계속하기' : '일시정지'}
          >
            {h.paused ? <Play size={19} /> : <Pause size={19} />}
          </button>
        </nav>
      </header>
      <button className="guest-badge" onClick={() => open('friends')}>
        <i className={connection.status === 'online' ? 'connected' : ''} />
        {connection.name || '게스트 접속'}
        <span>
          {connection.status === 'online'
            ? connection.room === 'PUBLIC'
              ? '공개 거리'
              : connection.room
            : connection.status === 'joining'
              ? '접속 중'
              : connection.status === 'reconnecting'
                ? '재연결 중'
                : '오프라인'}
        </span>
      </button>
      <aside className="life-card">
        <div className="eyebrow">
          <span className="live-dot" /> MY SEONGSU{' '}
          <span>{String(day(s)).padStart(2, '0')}일차</span>
        </div>
        <div className="cash">
          <small>보유 현금</small>
          <strong>{won(s.cash)}</strong>
        </div>
        <div className="rent-line">
          <span>
            <House size={15} />{' '}
            {s.arrears ? '미납금' : `월세 ${won(home.rent)}`}
          </span>
          <b className={s.arrears ? 'danger' : ''}>
            {s.arrears ? won(s.arrears) : `D-${s.rentDueDay - day(s)}`}
          </b>
        </div>
        <div className="savings-track">
          <i
            style={{
              width: `${Math.min(100, (s.cash / (s.arrears || home.rent || 1)) * 100)}%`,
            }}
          />
        </div>
        <div className="current-task">
          <span>
            {s.order
              ? 'SS DELIVERY'
              : s.inside
                ? '오늘의 시작'
                : target
                  ? '동네 길 안내'
                  : '나의 첫 번째 목표'}
          </span>
          <h2>
            {target
              ? `${s.order?.stage === 'pickup' ? '픽업 · ' : s.order ? '배달 · ' : ''}${target.name}`
              : s.inside
                ? '작은 방에서 시작하는 하루'
                : '이번 달 월세를 모아보자'}
          </h2>
          <p>
            {s.order
              ? `${s.order.label} · ${won(s.order.pay)}`
              : s.inside
                ? '휴대폰으로 첫 배달을 받아보세요.'
                : '배달, 알바, 골목 탐색. 돈 버는 방법은 여러 가지.'}
          </p>
          {target ? (
            <div className="task-distance">
              <Navigation size={16} /> {h.distance}m{' '}
              <span>
                {s.order
                  ? `${Math.max(0, Math.ceil(s.order.deadline - s.minutes))}분 남음`
                  : '원 안으로 방문'}
              </span>
            </div>
          ) : (
            <button className="task-link" onClick={() => open('phone')}>
              배달 앱 열기 <ArrowUpRight size={17} />
            </button>
          )}
        </div>
      </aside>
      <aside className="clock-card">
        <div>
          {s.weather === '폭우' ? (
            <CloudRain size={22} />
          ) : night ? (
            <Moon size={22} />
          ) : (
            <Sun size={22} />
          )}
          <span>{s.weather}</span>
          <b>{time}</b>
        </div>
        <p>
          {s.inside
            ? home.name
            : h.nearby
              ? place(h.nearby).name
              : '서울 · 성수동'}
        </p>
        <small>
          {h.panel === 'dialogue'
            ? '대화 중 시간 10%'
            : h.panel && h.panel !== 'place' && h.panel !== 'home'
              ? '메뉴에서 시간 정지'
              : s.inside
                ? '집에서 시간 2배'
                : '실제 30분 = 성수의 하루'}
        </small>
        <div className={'wanted ' + (s.wanted || s.pendingHeat ? 'alert' : '')}>
          <Shield size={15} />
          <span>
            {s.reportIn > 0
              ? `신고 중 · ${Math.ceil(s.reportIn)}초`
              : wantedLabels[s.wanted]}
          </span>
          <b>
            {'●'.repeat(s.wanted)}
            {'○'.repeat(5 - s.wanted)}
          </b>
        </div>
        {s.wanted > 0 && (
          <small>경찰의 시야에서 벗어나면 수색이 줄어듭니다.</small>
        )}
      </aside>
      <div className="map-block">
        <button onClick={() => open('map')} aria-label="큰 지도 열기">
          <canvas id="minimap" width="220" height="220" />
          <span>성수동</span>
        </button>
        <small>
          {s.inside
            ? '집에서 휴식 중'
            : h.activity || '연무장길을 따라 걸어보세요'}
        </small>
      </div>
      <section className="vitals health-only" aria-label="체력">
        <div>
          <span>
            <Heart size={15} /> HP
          </span>
          <b>{Math.round(h.hp)}</b>
          <progress max="100" value={h.hp} aria-label="체력" />
        </div>
        {s.caffeine >= 3 && <p className="danger">카페인 과다 · 손떨림</p>}
      </section>
      {h.social && !h.paused && (!h.panel || h.panel === 'place') && (
        <aside className="social-card">
          <Heart size={18} />
          <div>
            <b>{h.social.name}</b>
            <span>
              {h.social.remaining > 0
                ? '번호 따는 중…'
                : h.social.following
                  ? '함께 걷는 중'
                  : h.social.known
                    ? '연락처 저장됨'
                    : '번호 받기 확률 ' + h.social.chance + '%'}
            </span>
            {h.social.remaining > 0 && (
              <progress max={3} value={3 - h.social.remaining} />
            )}
          </div>
          <button
            disabled={
              h.social.remaining > 0 ||
              (!h.social.known && h.social.cooldown > 0)
            }
            onClick={() => api.current?.askNumber()}
          >
            {h.social.remaining > 0
              ? '…'
              : h.social.following
                ? '동행 끝내기'
                : h.social.known
                  ? '함께 걷기'
                  : h.social.cooldown > 0
                    ? '잠시 후'
                    : '번호 따기'}
          </button>
        </aside>
      )}
      {h.building && (
        <aside className="elevator-hud">
          <b>서울숲 빌딩 · {h.building.floor}F</b>
          <p>
            {h.building.moving
              ? '엘리베이터 이동 중…'
              : h.building.nearDelivery
                ? '201호 · 상품 전달'
                : h.building.nearLift
                  ? '엘리베이터 · ' +
                    (h.building.floor === 1 ? '2층으로' : '1층으로')
                  : '엘리베이터는 복도 안쪽 · 1층 출구는 로비 앞'}
          </p>
          {!h.building.moving &&
            (h.building.nearLift || h.building.nearDelivery) && (
              <button onClick={() => api.current?.interact()}>
                {h.building.nearDelivery ? '배달 완료하기' : '엘리베이터 타기'}{' '}
                · E
              </button>
            )}
        </aside>
      )}
      {(!h.panel || h.panel === 'place') && h.hp > 0 && (
        <RoomChat
          messages={messages}
          send={sendChat}
          typing={chatTyping}
          online={connection.status === 'online'}
        />
      )}
      <output className="context-hint">{h.hint}</output>
      {h.hurt && <div className="hurt" />}
      {h.armed && !h.ads && (!h.panel || h.panel === 'place') && (
        <div
          className={'crosshair ' + (h.aiming ? 'aimed' : '')}
          style={{ width: h.spread, height: h.spread }}
          aria-hidden="true"
        >
          <i />
          <i />
          <i />
          <i />
        </div>
      )}
      <aside className="movement-card">
        {(h.driving || h.riding) && (
          <div className="instrument-cluster">
            <div
              className="gauge-face"
              style={
                {
                  '--needle': -120 + Math.min(1, h.speed / 140) * 240 + 'deg',
                } as React.CSSProperties
              }
            >
              <span className="gauge-label">
                {h.riding ? 'SCOOTER' : 'DRIVE'}
              </span>
              <svg viewBox="0 0 200 150" aria-hidden="true">
                <path
                  d="M 33 122 A 77 77 0 1 1 167 122"
                  fill="none"
                  stroke="#ffffff24"
                  strokeWidth="8"
                />
                <path
                  d="M 33 122 A 77 77 0 1 1 167 122"
                  fill="none"
                  stroke="#d9ef8d"
                  strokeWidth="8"
                  pathLength="100"
                  strokeDasharray={
                    Math.min(100, (h.speed / 140) * 100) + ' 100'
                  }
                />
              </svg>
              <div className="speed">
                <strong>{String(h.speed).padStart(2, '0')}</strong>
                <small>km/h</small>
              </div>
              <div className="gauge-meta">
                <span>
                  {h.riding ? '연료 ' + Math.round(s.fuel) + '%' : 'D'}
                </span>
                <span>
                  내구도 {Math.round(h.riding ? s.bikeHp : h.vehicleHp)}%
                </span>
              </div>
            </div>
          </div>
        )}
        {h.armed && !s.inside && (
          <p className="ammo-display">
            {h.reload ? '재장전 중…' : s.ammo + ' / ' + s.reserve + '발'}
          </p>
        )}
        <div className="quick-actions">
          {s.inside ? (
            <button onClick={() => open('home')}>
              <Palette size={17} />집 꾸미기 · 관리
            </button>
          ) : (
            <>
              <button onClick={() => api.current?.interact()}>
                <MapPin size={16} />
                상호작용 <kbd>E</kbd>
              </button>
              <button
                disabled={h.driving || h.riding}
                onClick={() => api.current?.equip()}
              >
                {h.armed ? '권총 넣기' : '권총'} <kbd>Q</kbd>
              </button>
              {h.armed && (
                <>
                  <button onClick={() => api.current?.attack()}>
                    발사 <kbd>F</kbd>
                  </button>
                  <button onClick={() => api.current?.reload()}>
                    재장전 <kbd>R</kbd>
                  </button>
                  <button onClick={() => api.current?.aim()}>조준</button>
                </>
              )}
              {(s.bikeTier >= 0 || h.riding) && (
                <button onClick={() => api.current?.mount()}>
                  <Bike size={16} />
                  {h.riding ? '내리기' : '바이크 타기'}
                </button>
              )}
            </>
          )}
        </div>
      </aside>
      <Joystick
        disabled={h.paused || (!!h.panel && h.panel !== 'place') || h.hp <= 0}
        onMove={(x, y) => api.current?.stick(x, y)}
      />
      <div className="touch-actions">
        <button onClick={() => api.current?.interact()}>E</button>
        <button onClick={() => api.current?.jump()}>점프</button>
        <button onClick={() => api.current?.attack()}>
          {h.armed ? '발사' : '공격'}
        </button>
      </div>
      {h.panel === 'place' && at && (
        <aside
          className={
            'proximity-panel ' + (at.kind === 'estate' ? 'estate-window' : '')
          }
          aria-label={at.name}
        >
          <header>
            <div>
              <span>NEARBY · {distanceTo(at)}m</span>
              <h2>{at.name}</h2>
            </div>
            <button aria-label="상점 창 닫기" onClick={() => open(null)}>
              ×
            </button>
          </header>
          <div className="proximity-scroll">
            {at.kind === 'home' && (
              <button
                className="primary"
                onClick={() => api.current?.interact()}
              >
                <House size={18} />
                집에 들어가기
              </button>
            )}
            {s.order &&
              (s.order.stage === 'pickup'
                ? s.order.pickup
                : s.order.dropoff) === at.id && (
                <button
                  className="primary"
                  onClick={() => api.current?.interact()}
                >
                  {s.order.stage === 'pickup'
                    ? '배달 음식 받기'
                    : '배달 완료하기'}
                </button>
              )}
            {placePanel()}
          </div>
          <footer>원 밖으로 걸어나가면 닫힙니다.</footer>
        </aside>
      )}
      <Dialog
        open={!!h.panel && h.panel !== 'place'}
        onOpenChange={(value) => {
          if (!value) open(null);
        }}
      >
        <DialogContent
          className={
            'game-dialog ' +
            (h.panel === 'phone'
              ? 'phone-dialog'
              : h.panel === 'home'
                ? 'home-dialog'
                : h.panel === 'bag'
                  ? 'bag-dialog'
                  : '')
          }
        >
          {h.panel === 'phone' && (
            <div className="phone-statusbar">
              <b>{time}</b>
              <span className="dynamic-island" />
              <span>
                <Signal size={15} />
                <Wifi size={15} />
                <BatteryFull size={21} />
              </span>
            </div>
          )}
          <div className="dialog-heading">
            <span className="eyebrow">SEONGSU DRIVE · {time}</span>
            <DialogTitle>{panelTitle}</DialogTitle>
            <DialogDescription>
              {h.panel === 'home'
                ? '작지만, 돌아올 곳이 있다는 것.'
                : h.panel === 'place'
                  ? '거래와 상점 메뉴에서는 시간이 멈춥니다.'
                  : '하루를 살아가는 데 필요한 것들.'}
            </DialogDescription>
          </div>
          <div className="dialog-scroll">
            {h.panel === 'dialogue' && (
              <article className="active-order">
                <span className="pill">{at?.person}</span>
                <h3>동네 이야기</h3>
                <p>{s.logs[0]?.text}</p>
                <button
                  className="primary"
                  onClick={() => open(s.inside ? 'home' : 'place')}
                >
                  돌아가기 <ChevronRight size={16} />
                </button>
              </article>
            )}
            {h.panel === 'friends' && (
              <div className="friends-panel">
                <div className="friends-presence">
                  <Users size={32} />
                  <div>
                    <h3>{connection.name || '성수의 새 이웃'}</h3>
                    <p>
                      {connection.status === 'online'
                        ? connection.count + '명 접속 중'
                        : connection.status === 'joining'
                          ? '거리로 연결하는 중…'
                          : connection.status === 'reconnecting'
                            ? '다시 연결하는 중…'
                            : '접속 대기'}
                    </p>
                  </div>
                </div>
                {connection.error && (
                  <output className="danger">{connection.error}</output>
                )}
                <label>
                  닉네임{' '}
                  <input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    maxLength={16}
                    placeholder={connection.name || '비워두면 자동 이름'}
                  />
                </label>
                <button
                  className="primary"
                  disabled={connection.status === 'joining'}
                  onClick={() => network.current?.join({ name: nickname })}
                >
                  이 이름으로 공개 거리 접속
                </button>
                <div className="friend-room">
                  <h3>친구끼리 만나기</h3>
                  <p>
                    같은 방 코드를 입력하면 서로의 캐릭터와 이동이 보입니다.
                  </p>
                  <button
                    disabled={connection.status === 'joining'}
                    onClick={() =>
                      network.current?.join({
                        name: nickname || connection.name,
                        createRoom: true,
                      })
                    }
                  >
                    친구 방 만들기
                  </button>
                  {connection.room && connection.room !== 'PUBLIC' && (
                    <div className="room-code">
                      <strong>{connection.room}</strong>
                      <button
                        aria-label="초대 링크 복사"
                        onClick={async () => {
                          const url = new URL(window.location.href);
                          url.searchParams.set('room', connection.room);
                          const localOnly = [
                            'localhost',
                            '127.0.0.1',
                            '[::1]',
                          ].includes(url.hostname);
                          try {
                            await navigator.clipboard.writeText(
                              localOnly ? connection.room : url.toString(),
                            );
                            setCopyNotice(
                              localOnly
                                ? '방 코드를 복사했습니다. 친구는 공유된 게임 주소에서 이 코드를 입력해 주세요.'
                                : '초대 링크를 복사했습니다.',
                            );
                          } catch {
                            setCopyNotice('방 코드를 친구에게 알려 주세요.');
                          }
                        }}
                      >
                        <Copy size={17} />
                      </button>
                    </div>
                  )}
                  <label>
                    방 코드
                    <input
                      value={roomCode}
                      onChange={(e) =>
                        setRoomCode(e.target.value.toUpperCase())
                      }
                      placeholder="8자리 코드"
                      maxLength={8}
                    />
                  </label>
                  <button
                    disabled={
                      roomCode.length !== 8 || connection.status === 'joining'
                    }
                    onClick={() =>
                      network.current?.join({
                        name: nickname || connection.name,
                        room: roomCode,
                      })
                    }
                  >
                    친구 방 입장
                  </button>
                  <output>{copyNotice}</output>
                </div>
                <div className="emote-row">
                  {['👋', '😄', '배달 가자!', '잠깐만!'].map((value) => (
                    <button
                      key={value}
                      disabled={connection.status !== 'online'}
                      onClick={() => {
                        network.current?.emote(value);
                        open(null);
                      }}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <p className="subtle">
                  집 밖에서 만나요. 친구끼리 공격과 채팅이 가능합니다.
                  소지품·돈·NPC는 각자의 플레이에 저장됩니다.
                </p>
              </div>
            )}
            {h.panel === 'phone' && phonePanel()}
            {h.panel === 'home' && homePanel()}
            {h.panel === 'bag' && (
              <div className="open-backpack">
                <div className="bag-flap">
                  <Backpack size={30} />
                  <span>SEONGSU DAILY</span>
                  <b>{countItems(s.inventory)} / 12</b>
                </div>
                <div className="bag-zipper" />
                <div className="bag-compartments">
                  {Array.from({ length: 12 }, (_, index) => {
                    const items = Object.entries(s.inventory).flatMap(
                      ([id, count]) =>
                        Array.from({ length: count || 0 }, () => id as ItemId),
                    );
                    const id = items[index];
                    return (
                      <div
                        className={'bag-slot ' + (id ? 'filled' : '')}
                        key={index}
                      >
                        {id ? (
                          <>
                            <div className="bag-item-icon">
                              {ITEMS[id].food ? (
                                <Utensils size={30} />
                              ) : ITEMS[id].energy ? (
                                <Coffee size={30} />
                              ) : (
                                <Package size={30} />
                              )}
                            </div>
                            <b>{ITEMS[id].name}</b>
                            <small>
                              {ITEMS[id].price
                                ? 'HP +' + ITEMS[id].hp
                                : won(ITEMS[id].sell)}
                            </small>
                            <div>
                              {ITEMS[id].price > 0 && (
                                <button onClick={() => action('consume', id)}>
                                  꺼내 쓰기
                                </button>
                              )}
                              {s.inside && (
                                <button onClick={() => action('store', id)}>
                                  보관
                                </button>
                              )}
                            </div>
                          </>
                        ) : (
                          <span>{String(index + 1).padStart(2, '0')}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="bag-pocket">
                  <Wallet size={20} />
                  <span>앞주머니 · 현금</span>
                  <b>{won(s.cash)}</b>
                </div>
              </div>
            )}
            {h.panel === 'place' && placePanel()}
            {h.panel === 'map' && (
              <>
                <p className="subtle">
                  목적지를 고르면 거리의 노란 빛과 미니맵이 안내합니다. 성수동을
                  모티브로 압축한 가상 구역입니다.
                </p>
                <canvas
                  id="citymap"
                  width="220"
                  height="220"
                  className="full-map"
                  aria-label="성수동 전체 지도"
                />
                <div className="map-list">
                  {PLACES.map((p) => {
                    const Icon = placeIcons[p.kind];
                    return (
                      <button
                        key={p.id}
                        onClick={() => action('navigate', p.id)}
                      >
                        <span
                          className="map-place-icon"
                          style={{ color: p.color }}
                        >
                          <Icon size={23} />
                        </span>
                        <span>
                          <b>{p.name}</b>
                          <small>{p.person}</small>
                          <em className="place-distance">
                            내 위치에서 {distanceTo(p)}m
                          </em>
                        </span>
                        <Navigation size={17} />
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {h.panel === 'help' && (
              <>
                <div className="help-intro">
                  <h3>월세 30만 원. 다음 납부까지 7일.</h3>
                  <p>
                    성수 반지하에서 시작해 배달과 알바로 돈을 모으고, 내
                    바이크와 더 나은 집을 마련하세요.
                  </p>
                </div>
                <ol className="help-steps">
                  <li>
                    <b>휴대폰에서 배달 수락</b>
                    <p>
                      P → SS Delivery에서 주문을 고르고 문 밖으로 걸어 나가세요.
                    </p>
                  </li>
                  <li>
                    <b>픽업하고, 고객에게 전달</b>
                    <p>
                      노란 빛을 따라 이동해 E 키로 음식을 받으세요. 다음
                      목적지에서 E 키를 누르면 수익이 입금됩니다.
                    </p>
                  </li>
                  <li>
                    <b>먹고, 쉬고, 월세 납부</b>
                    <p>
                      편의점에서 음식을 사서 가방에서 사용하세요. 집에서 8시간
                      수면과 보관, 월세 납부가 가능합니다.
                    </p>
                  </li>
                  <li>
                    <b>나만의 생활을 넓히기</b>
                    <p>
                      정비소에서 바이크를 사고, 부동산의 김실장에게 더 나은 집을
                      계약하세요. 폐공장과 주택가의 버려진 물건은 판매할 수
                      있습니다.
                    </p>
                  </li>
                </ol>
                <div className="help-controls">
                  <p>
                    <kbd>WASD / 방향키</kbd> 이동 · <kbd>SHIFT</kbd> 달리기
                  </p>
                  <p>
                    <kbd>E</kbd> 장소 / 배달 상호작용 · <kbd>V</kbd> 바이크
                    승하차
                  </p>
                  <p>
                    <kbd>우클릭 드래그</kbd> 카메라 회전 · 우클릭 유지 어깨 조준
                    · 짧게 클릭 조준기 · <kbd>좌클릭 / F</kbd> 발사 / 주먹
                  </p>
                  <p>
                    <kbd>Q</kbd> 권총 · <kbd>R</kbd> 재장전 · <kbd>SPACE</kbd>{' '}
                    점프 / 차량 브레이크
                  </p>
                  <p>
                    <kbd>P</kbd> 휴대폰 · <kbd>I</kbd> 가방 · <kbd>M</kbd> 지도
                    · <kbd>ESC</kbd> 닫기 / 일시정지
                  </p>
                </div>
                <p className="subtle">
                  목격자·CCTV·총성으로 신고가 발생합니다. 신고 후 경찰이
                  출동하며, 시야에서 벗어나면 수색이 줄어듭니다. 저장은 현재
                  브라우저에만 남고 다른 기기로 동기화되지 않습니다.
                </p>
              </>
            )}
          </div>
          <output className="dialog-status">
            <span>{won(s.cash)}</span>
            <p>{s.logs[0]?.text}</p>
          </output>
        </DialogContent>
      </Dialog>
      <Dialog open={h.hp <= 0 || !!h.error}>
        <DialogContent
          className="game-dialog recovery-dialog"
          showCloseButton={false}
        >
          <DialogTitle>
            {h.error ? '거리에 연결하지 못했어요' : '잠시 쓰러졌습니다'}
          </DialogTitle>
          <DialogDescription>
            {h.error ||
              '응급 처치 후 집에서 다시 시작합니다. 생활 기록과 소지품은 유지됩니다.'}
          </DialogDescription>
          {!h.error && (
            <button className="primary" onClick={() => action('recover')}>
              응급 처치 · 최대 15,000원
            </button>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
