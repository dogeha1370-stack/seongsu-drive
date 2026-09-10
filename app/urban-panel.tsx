import { CLOTHES, PERFUMES, VILLAINS, charm, serviceOpen } from './urban';
import type { Life } from './life';
export function UrbanPanel({
  s,
  run,
  at,
  metro = false,
}: {
  s: Life;
  run: (op: string, v?: string) => void;
  at?: string;
  metro?: boolean;
}) {
  const u = s.urban;
  if (at === 'aesop' || at === 'ader')
    return (
      <div className={'urban-shop ' + at}>
        <h3>{at === 'aesop' ? 'Aēsop · 향수' : 'ADERERROR · 옷장'}</h3>
        {(at === 'aesop' ? PERFUMES : CLOTHES).map((p) => (
          <article key={p.id}>
            <b>{p.name}</b>
            <span>매력 +{p.charm}</span>
            <button
              onClick={() => run(at === 'aesop' ? 'perfume' : 'clothes', p.id)}
            >
              {(at === 'aesop' ? u.perfumes : u.clothes).includes(p.id)
                ? '착용 / 사용'
                : '₩' + p.price.toLocaleString() + ' 구매'}
            </button>
          </article>
        ))}
        <small>게임 내 가격 · 매력 {charm(u)}</small>
      </div>
    );
  return (
    <div className="urban-panel">
      <div className="urban-stats">
        <span>
          멘탈 <b>{Math.round(u.mental)}</b>
        </span>
        <span>
          매력 <b>{charm(u)}</b>
        </span>
        <span>
          민첩 <b>{u.agility + (u.boost > 0 ? 15 : 0)}</b>
        </span>
        <span>
          평판 <b>{u.reputation}</b>
        </span>
        <span>
          악명 <b>{u.infamy}</b>
        </span>
        <span>
          전투 경험 <b>{u.xp}</b>
        </span>
      </div>
      <p>
        커피 {u.coffees}잔 ·{' '}
        {u.boost > 0 ? '집중·이동 강화 ' + Math.ceil(u.boost) + '초' : '평상시'}
        {u.toilet > 0 ? ' · 화장실 급함 / 불면' : ''}
        {u.buff
          ? ' · ' +
            ({
              focus: '소음 면역',
              rest: '착석 회복 강화',
              power: '공격 강화',
              shield: '방어 강화',
              agility: '민첩 강화',
            }[u.buff] || u.buff) +
            ' ' +
            Math.ceil(u.buffTime) +
            '초'
          : ''}
      </p>
      {metro ? (
        <>
          <h4>자리 경쟁 · 1·2번 노약자석</h4>
          <div className="seat-buttons">
            {Array.from({ length: 6 }, (_, i) => (
              <button
                key={i}
                disabled={u.occupied.includes(i)}
                aria-pressed={u.seat === i}
                onClick={() => run('seat', String(i))}
              >
                {i + 1} ·{' '}
                {u.seat === i
                  ? '나'
                  : u.occupied.includes(i)
                    ? 'NPC'
                    : '빈자리'}
              </button>
            ))}
          </div>
          {u.seat !== null && (
            <button onClick={() => run('stand')}>일어나기</button>
          )}
          {u.villain !== null && (
            <section className="villain-choice">
              <b>
                {VILLAINS[u.villain].name} · HP {u.villainHp}
              </b>
              <div>
                {[
                  ['persuade', '설득'],
                  ['ignore', '무시'],
                  ['report', '신고'],
                  ['move-seat', '자리 이동'],
                  ['fight', '전투'],
                ].map(([op, label]) => (
                  <button key={op} onClick={() => run(op)}>
                    {label}
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          <h4>노선 · 막차</h4>
          <p>
            {serviceOpen(s.minutes)
              ? '운행 중 · 00:00 막차 / 05:30 첫차'
              : '막차가 끝났습니다. 귀가 방법을 선택하세요.'}
          </p>
          <div className="urban-options">
            <button
              onClick={() => run('line', '2')}
              aria-pressed={u.line === '2'}
            >
              2호선 · 붐빔
            </button>
            <button
              onClick={() => run('line', 'bundang')}
              aria-pressed={u.line === 'bundang'}
            >
              분당선 · 평온
            </button>
          </div>
          <small>성수 맵 안 축약 운행 모드</small>
          <div className="urban-options">
            {[
              ['walk', '도보 · 무료'],
              ['taxi', '택시 · 12,000원'],
              ['bike', '따릉이 · 1,000원'],
              ['sauna', '찜질방 · 10,000원'],
              ['friend', '친구 집'],
            ].map(([id, name]) => (
              <button key={id} onClick={() => run('night', id)}>
                {name}
              </button>
            ))}
          </div>
          <h4>마음 돌보기</h4>
          <div className="urban-options">
            {[
              ['music', '음악 듣기'],
              ['game', 'PC방 게임'],
              ['drink', '친구 술자리'],
              ['sns', '동네 SNS'],
            ].map(([id, name]) => (
              <button key={id} onClick={() => run('recover-mental', id)}>
                {name}
              </button>
            ))}
          </div>
        </>
      )}
      {u.drops.length > 0 && (
        <>
          <h4>빌런 전리품</h4>
          <div className="urban-options">
            {u.drops.map((item) => (
              <button
                key={item}
                aria-pressed={u.equipped === item}
                onClick={() => run('equip-drop', item)}
              >
                {item}
              </button>
            ))}
          </div>
        </>
      )}
      <output>{u.notice}</output>
    </div>
  );
}
