import { isRoadSurface } from './world-rules';
export const intersections = [-70, 0, 70].flatMap((x) =>
  [-65, 0, 65].map((z) => ({ x, z })),
);
// Green -> clearance -> cross traffic. One clock drives both lamps and vehicles.
export function signalGreen(vertical: boolean, seconds: number) {
  const phase = ((seconds % 32) + 32) % 32;
  return vertical ? phase < 14 : phase >= 16 && phase < 30;
}
export function signalDistance(
  x: number,
  z: number,
  heading: number,
  seconds: number,
) {
  const vertical = Math.abs(Math.cos(heading)) > 0.7;
  if (signalGreen(vertical, seconds)) return Infinity;
  const dx = Math.sin(heading),
    dz = Math.cos(heading);
  let nearest = Infinity;
  for (const c of intersections) {
    const along = (c.x - x) * dx + (c.z - z) * dz,
      across = Math.abs((c.x - x) * dz - (c.z - z) * dx);
    if (across < 8 && along > 8 && along < 33)
      nearest = Math.min(nearest, Math.max(0, along - 12));
  }
  return nearest;
}
export function onRoad(x: number, z: number, r = 1.3) {
  return Math.abs(x) < 110 && Math.abs(z) < 107 && isRoadSurface(x, z, -r);
}
export function roadLoop(id: number) {
  return id % 2
    ? [
        { x: -65, z: -5 },
        { x: -65, z: -60 },
        { x: 65, z: -60 },
        { x: 65, z: -5 },
      ]
    : [
        { x: -65, z: 5 },
        { x: 65, z: 5 },
        { x: 65, z: 60 },
        { x: -65, z: 60 },
      ];
}
export function separateCrowd<
  T extends { id: number; x: number; z: number; hp: number },
>(people: T[], blocked: (x: number, z: number, r: number) => boolean) {
  for (let pass = 0; pass < 3; pass++)
    for (let i = 0; i < people.length; i++)
      for (let j = i + 1; j < people.length; j++) {
        const a = people[i],
          b = people[j];
        if (a.hp <= 0 || b.hp <= 0) continue;
        let dx = b.x - a.x,
          dz = b.z - a.z,
          d = Math.hypot(dx, dz);
        if (d >= 1.05) continue;
        if (d < 0.0001) {
          const angle = (a.id * 2.4 + b.id) * 1.71;
          dx = Math.cos(angle);
          dz = Math.sin(angle);
          d = 1;
        } else {
          dx /= d;
          dz /= d;
        }
        const push = (1.05 - Math.hypot(b.x - a.x, b.z - a.z)) * 0.5 + 0.001;
        if (!blocked(a.x - dx * push, a.z - dz * push, 0.45)) {
          a.x -= dx * push;
          a.z -= dz * push;
        }
        if (!blocked(b.x + dx * push, b.z + dz * push, 0.45)) {
          b.x += dx * push;
          b.z += dz * push;
        }
      }
}
