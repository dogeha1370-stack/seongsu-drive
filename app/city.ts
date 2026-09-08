import { place, type PlaceId } from './life';
export type Point = { x: number; z: number };
export type Occupation =
  | '직장인'
  | '배달기사'
  | '경찰'
  | '학생'
  | '취객'
  | '흡연 중인 주민'
  | '청소 직원';
export const roles: Occupation[] = [
  '직장인',
  '직장인',
  '직장인',
  '학생',
  '배달기사',
  '배달기사',
  '경찰',
  '흡연 중인 주민',
  '취객',
  '청소 직원',
];
export function schedule(
  role: Occupation,
  hour: number,
  index: number,
): { at: PlaceId; activity: string; active: boolean } {
  if (role === '경찰')
    return {
      at: hour < 5 ? 'bar' : index % 2 ? 'station' : 'police',
      activity: '동네 순찰',
      active: true,
    };
  if (role === '배달기사')
    return {
      at: hour >= 11 && hour < 14 ? 'burger' : 'cafe',
      activity: '주문 대기',
      active: hour >= 7 || hour < 4,
    };
  if (role === '취객')
    return { at: 'bar', activity: '귀가 중', active: hour >= 18 || hour < 4 };
  if (role === '흡연 중인 주민')
    return {
      at: hour >= 18 ? 'bar' : 'store',
      activity: '통화하며 흡연',
      active: hour >= 7 || hour < 2,
    };
  if (role === '청소 직원')
    return {
      at: 'station',
      activity: '새벽 거리 청소',
      active: hour >= 4 && hour < 6,
    };
  if (role === '학생')
    return {
      at: hour < 9 ? 'station' : hour < 17 ? 'pc' : 'forest',
      activity: hour < 9 ? '등교 중' : '친구 만나러 가는 중',
      active: hour >= 7 && hour < 22,
    };
  return {
    at:
      hour < 9
        ? 'station'
        : hour < 12
          ? 'office'
          : hour < 14
            ? 'burger'
            : hour < 18
              ? 'office'
              : hour < 22
                ? 'bar'
                : 'home',
    activity:
      hour < 9
        ? '출근 중'
        : hour < 12
          ? '근무 중'
          : hour < 14
            ? '점심시간'
            : hour < 18
              ? '근무 중'
              : '퇴근 후',
    active: hour >= 7 && hour < 22,
  };
}
// Sidewalk graph; routing through street intersections avoids steering through buildings.
export function sidewalkPath(
  from: Point,
  to: Point,
  blocked: (x: number, z: number, r: number) => boolean,
): Point[] {
  const xs = [-82, -58, -12, 12, 58, 82],
    zs = [-76, -55, -16, 16, 55, 76];
  const points: Point[] = [
    from,
    to,
    ...zs.flatMap((z) => xs.map((x) => ({ x, z }))),
  ];
  const clear = (a: Point, b: Point) => {
    const d = Math.hypot(a.x - b.x, a.z - b.z);
    for (let t = 0; t <= d; t += 1)
      if (
        blocked(
          a.x + ((b.x - a.x) * t) / (d || 1),
          a.z + ((b.z - a.z) * t) / (d || 1),
          0.55,
        )
      )
        return false;
    return true;
  };
  const distance = points.map(() => Infinity),
    previous = points.map(() => -1),
    remaining = new Set(points.map((_, i) => i));
  distance[0] = 0;
  while (remaining.size) {
    let current = -1;
    for (const i of remaining)
      if (current < 0 || distance[i] < distance[current]) current = i;
    if (current === 1 || !Number.isFinite(distance[current])) break;
    remaining.delete(current);
    for (const next of remaining) {
      const a = points[current],
        b = points[next];
      if (current > 1 && next > 1 && a.x !== b.x && a.z !== b.z) continue;
      const d = Math.hypot(a.x - b.x, a.z - b.z);
      if (distance[current] + d >= distance[next] || !clear(a, b)) continue;
      distance[next] = distance[current] + d;
      previous[next] = current;
    }
  }
  if (!Number.isFinite(distance[1])) return [];
  const path: Point[] = [];
  for (let at = 1; at !== 0; at = previous[at]) {
    if (at < 0) return [];
    path.unshift(points[at]);
  }
  return path;
}
export const destination = (id: PlaceId): Point => ({
  x: place(id).x,
  z: place(id).z,
});
