'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Package, Coins } from 'lucide-react';
import {
  ITEMS,
  countItems,
  won,
  type ItemId,
  type Life,
  type Action,
} from './life';
const photos: Partial<Record<ItemId, string>> = {
  snack: '/food/samgak.jpg',
  meal: '/food/bento.jpg',
  canned: '/food/coffee.jpg',
  americano: '/mcd/coffee.png',
  specialty: '/mcd/coffee.png',
};
export function Inventory({
  life,
  action,
}: {
  life: Life;
  action: (a: Action, id: ItemId) => void;
}) {
  const [tab, setTab] = useState<'all' | 'food' | 'other'>('all'),
    [selection, setSelection] = useState<ItemId | null>(null);
  const items = (Object.entries(life.inventory) as [ItemId, number][]).filter(
    ([id, n]) =>
      n > 0 && (tab === 'all' || (tab === 'food') === ITEMS[id].price > 0),
  );
  const selected =
    selection && life.inventory[selection] ? selection : items[0]?.[0];
  const photo = (id: ItemId) =>
    'image' in ITEMS[id] ? (ITEMS[id] as { image: string }).image : photos[id];
  return (
    <div className="maple-inventory">
      <header>
        <b>ITEM INVENTORY</b>
        <span>{countItems(life.inventory)} / 12</span>
      </header>
      <nav aria-label="인벤토리 분류">
        {(
          [
            ['all', '전체'],
            ['food', '소비'],
            ['other', '기타'],
          ] as const
        ).map(([id, name]) => (
          <button
            key={id}
            aria-pressed={tab === id}
            onClick={() => {
              setTab(id);
              setSelection(null);
            }}
          >
            {name}
          </button>
        ))}
      </nav>
      <div className="inventory-grid">
        {Array.from({ length: 16 }, (_, i) => {
          const item = items[i];
          return item ? (
            <button
              key={item[0]}
              aria-label={ITEMS[item[0]].name + ' ' + item[1] + '개'}
              aria-pressed={selected === item[0]}
              title={ITEMS[item[0]].name}
              onClick={() => setSelection(item[0])}
              onDoubleClick={() =>
                ITEMS[item[0]].price > 0 && action('consume', item[0])
              }
            >
              {photo(item[0]) ? (
                <Image
                  width={90}
                  height={90}
                  unoptimized
                  src={photo(item[0])!}
                  alt={ITEMS[item[0]].name}
                />
              ) : (
                <Package />
              )}
              <b>{item[1]}</b>
            </button>
          ) : (
            <div key={'empty' + i} className="inventory-empty" />
          );
        })}
      </div>
      <section className="inventory-detail">
        {selected ? (
          <>
            <strong>{ITEMS[selected].name}</strong>
            <span>
              {ITEMS[selected].price > 0
                ? 'HP +' + ITEMS[selected].hp
                : won(ITEMS[selected].sell)}
            </span>
            <div>
              {ITEMS[selected].price > 0 && (
                <button onClick={() => action('consume', selected)}>
                  사용
                </button>
              )}
              {life.inside && (
                <button onClick={() => action('store', selected)}>보관</button>
              )}
            </div>
          </>
        ) : (
          <p>소지품이 없습니다.</p>
        )}
      </section>
      <footer>
        <Coins size={18} />
        <b>{won(life.cash)}</b>
        <small>현금</small>
      </footer>
      <a
        className="inventory-credits"
        href="/food/credits.html"
        target="_blank"
        rel="noreferrer"
      >
        음식 사진 출처
      </a>
    </div>
  );
}
