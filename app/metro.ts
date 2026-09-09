import * as T from 'three';
import { mergeModel } from './merge-model';
export const PLATFORM_Y = 10.2;
// A compressed city shuttle, not the real timetable. All clients use UTC phase.
export function trainState(seconds: number) {
  const t = ((seconds % 120) + 120) % 120;
  const leg = Math.floor(t / 30),
    u = t % 30;
  const stops = [0, 76, 0, -76, 0];
  const k = T.MathUtils.clamp((u - 10) / 20, 0, 1),
    ease = k * k * (3 - 2 * k);
  return {
    z: stops[leg] + (stops[leg + 1] - stops[leg]) * ease,
    doors: u < 9,
    station: stops[leg],
    remaining: Math.ceil(10 - u),
    direction: Math.sign(stops[leg + 1] - stops[leg]),
  };
}
export function metroFloor(x: number, z: number): number | null {
  // Staircase and parallel escalator, with a shared upper landing.
  if (x >= 11 && x <= 17.8 && z >= -46 && z <= -22)
    return ((z + 46) / 24) * PLATFORM_Y;
  if (x >= 3.5 && x <= 17.8 && z >= -22 && z <= -18) return PLATFORM_Y;
  if (x >= 3.5 && x <= 7.5 && Math.abs(z) <= 23) return PLATFORM_Y;
  // Small end-of-map stops give riders a safe return platform.
  if (x >= 3.5 && x <= 7.5 && Math.abs(Math.abs(z) - 76) <= 20)
    return PLATFORM_Y;
  return null;
}
export function createMetro(scene: T.Scene) {
  const staticRoot = new T.Group();
  staticRoot.name = 'seongsu-station';
  scene.add(staticRoot);
  const materials = new Map<string, T.MeshStandardMaterial>();
  const mat = (color: string) => {
    if (!materials.has(color))
      materials.set(
        color,
        new T.MeshStandardMaterial({ color, roughness: 0.65 }),
      );
    return materials.get(color)!;
  };
  const box = (
    w: number,
    h: number,
    d: number,
    color: string,
    x: number,
    y: number,
    z: number,
    parent: T.Group = staticRoot,
  ) => {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(color));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const label = (
    text: string,
    w: number,
    x: number,
    y: number,
    z: number,
    parent: T.Group = staticRoot,
  ) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 160;
    const c = canvas.getContext('2d')!;
    c.fillStyle = '#148847';
    c.fillRect(0, 0, 1024, 160);
    c.fillStyle = '#fff';
    c.textAlign = 'center';
    c.font = 'bold 68px sans-serif';
    c.fillText(text, 512, 105);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    const m = new T.Mesh(
      new T.PlaneGeometry(w, (w * 160) / 1024),
      new T.MeshBasicMaterial({ map: texture, side: T.DoubleSide }),
    );
    m.position.set(x, y, z);
    parent.add(m);
  };
  // Four tracks and twin island platforms reference Seongsu's elevated station.
  for (const x of [-8, -1.8, 1.8, 8]) {
    box(2.6, 0.18, 218, '#575e61', x, 9.69, 0);
    for (const s of [-0.72, 0.72])
      box(0.1, 0.12, 218, '#b5bfc3', x + s, 9.84, 0);
    for (let z = -105; z <= 105; z += 3)
      box(2.4, 0.08, 0.28, '#343b3e', x, 9.8, z);
  }
  for (const x of [-5, 5.5]) {
    box(3.8, 0.6, 46, '#c5c6bf', x, 9.9, 0);
    for (const side of [-1, 1])
      box(0.2, 0.025, 46, '#efd648', x + side * 1.7, 10.22, 0);
    for (const z of [-19, -8, 8, 19]) {
      box(0.18, 3.5, 0.18, '#74818a', x, 11.9, z);
      box(1.8, 0.4, 0.7, '#406e99', x, 10.65, z + 2);
    }
    box(4.5, 0.2, 48, '#94abb6', x, 13.75, 0);
    label('② 성수  SEONGSU', 7, x, 12.6, -17);
    for (const z of [-12, 0, 12]) {
      box(3, 0.04, 0.3, '#fff3cd', x, 13.5, z);
    }
  }
  box(14.3, 0.4, 4, '#d0d1c8', 10.65, 10, -20);
  // Walkable stairs: 40 visible treads, continuously sampled for smooth movement.
  for (let i = 0; i < 40; i++)
    box(
      3,
      0.255 * (i + 1),
      0.6,
      '#c1c7c7',
      12.5,
      0.1275 * (i + 1),
      -45.7 + i * 0.6,
    );
  const escalator = new T.Group();
  escalator.name = 'moving-escalator';
  scene.add(escalator);
  const steps: T.Mesh[] = [];
  for (let i = 0; i < 40; i++)
    steps.push(box(2, 0.15, 0.58, '#657078', 16, 0, 0, escalator));
  for (const x of [11, 14, 14.9, 17.1]) {
    const rail = box(0.12, 0.14, 26.1, '#34484c', x, 6, -34);
    rail.rotation.x = -Math.atan2(10.2, 24);
    for (let i = 0; i < 7; i++)
      box(0.08, 1, 0.08, '#8eaaaf', x, 0.8 + i * 1.7, -46 + i * 4);
  }
  label('② 성수역 · 계단 / 에스컬레이터', 10, 14.4, 3, -46.5);
  for (const z of [-76, 76]) {
    box(4, 0.6, 40, '#bcc8c6', 5.5, 9.9, z);
    box(0.2, 1.1, 40, '#599282', 7.5, 10.7, z);
    label('② 성수 순환 · 정차역', 7, 5.5, 12, z);
  }
  const train = new T.Group();
  train.name = 'line-2-train';
  scene.add(train);
  const doorParts: { mesh: T.Mesh; z: number; side: number }[] = [];
  for (let car = 0; car < 3; car++) {
    const z = (car - 1) * 12.7;
    box(2.9, 0.25, 12, '#dae1df', 0, 0, z, train);
    box(2.9, 0.55, 12, '#209c65', 0, 0.4, z, train);
    box(0.12, 1.9, 12, '#ced8d6', -1.45, 1.6, z, train);
    // Open top preserves visibility of the player and seats while riding.
    for (const side of [-1, 1])
      for (const offset of [-4.5, -1.5, 1.5, 4.5]) {
        box(0.14, 0.9, 1.6, '#314e5b', side * 1.46, 1.75, z + offset, train);
        box(0.12, 0.45, 1.6, '#dde4df', side * 1.46, 2.45, z + offset, train);
      }
    for (const offset of [-3, 3])
      for (const side of [-1, 1]) {
        const door = box(
          0.14,
          2,
          1.25,
          '#aebfbd',
          1.45,
          1.55,
          z + offset + side * 0.63,
          train,
        );
        doorParts.push({ mesh: door, z: door.position.z, side });
        box(0.5, 0.45, 2, '#4b82b0', -0.8, 0.85, z + offset, train);
        box(0.07, 2.3, 0.07, '#d1c4a4', 0.8, 1.4, z + offset, train);
      }
    for (const side of [-1, 1])
      for (const offset of [-4, 4]) {
        const wheel = new T.Mesh(
          new T.CylinderGeometry(0.32, 0.32, 0.22, 10),
          mat('#29353b'),
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * 1.05, -0.25, z + offset);
        train.add(wheel);
      }
  }
  box(2.9, 2.6, 0.16, '#e3e7e1', 0, 1.35, 18.6, train);
  box(2.4, 0.9, 0.17, '#203c49', 0, 1.95, 18.7, train);
  label('② 성수 순환', 2.4, 0, 2.9, 18.72, train);
  mergeModel(staticRoot);
  doorParts.forEach((d) => train.remove(d.mesh));
  mergeModel(train);
  doorParts.forEach((d) => train.add(d.mesh));
  let state = trainState(Date.now() / 1000);
  return {
    train,
    get state() {
      return state;
    },
    update(seconds: number) {
      state = trainState(seconds);
      train.position.set(1.8, PLATFORM_Y, state.z);
      for (const door of doorParts)
        door.mesh.position.z = door.z + (state.doors ? door.side * 0.65 : 0);
      steps.forEach((step, i) => {
        const t = (i / 40 + seconds * 0.035) % 1;
        step.position.set(16, t * PLATFORM_Y, -46 + t * 24);
      });
    },
  };
}
