import * as T from 'three';
import { mergeModel } from './merge-model';
export function sportsCar(kind: number, color: string) {
  const g = new T.Group();
  g.name = [
    'Ferrari 296-inspired',
    'Lamborghini Revuelto-inspired',
    'Porsche 911-inspired',
  ][kind % 3];
  const body = new T.MeshStandardMaterial({
    color,
    roughness: 0.3,
    metalness: 0.45,
    flatShading: true,
  });
  const material = (c: string) =>
    new T.MeshStandardMaterial({ color: c, roughness: 0.4 });
  const dark = material('#14222c'),
    rubber = material('#121518'),
    alloy = material('#b9c3cd');
  const part = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    m: T.Material = body,
  ) => {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };
  const oval = (
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    m: T.Material,
  ) => {
    const mesh = new T.Mesh(new T.SphereGeometry(1, 12, 8), m);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    g.add(mesh);
    return mesh;
  };
  part(2.22, 0.38, 4.25, 0, 0.64, 0);
  part(2.3, 0.1, 4.35, 0, 0.4, 0, dark);
  if (kind % 3 === 2) {
    oval(0, 1, -0.3, 1.02, 0.67, 1.45, body);
    oval(0, 1.13, -0.25, 0.9, 0.48, 1.05, dark);
    part(0.8, 0.08, 1.6, 0, 1.58, -0.35);
    oval(0, 0.79, 1.2, 1.08, 0.24, 0.94, body);
    for (const s of [-1, 1])
      oval(s * 0.78, 0.94, 1.8, 0.24, 0.24, 0.12, material('#fff2c9'));
  } else {
    const hood = part(2.15, 0.25, 1.4, 0, 0.79, 1.28);
    hood.rotation.x = -0.12;
    const glass = part(1.72, 0.58, 1.7, 0, 1.13, -0.27, dark);
    glass.rotation.x = 0.12;
    part(1.56, 0.12, 1.0, 0, 1.45, -0.4);
    part(2.05, 0.27, 1.15, 0, 0.94, -1.45);
    for (const s of [-1, 1]) {
      part(0.09, 0.44, 1.7, s * 0.86, 1.1, -0.25);
      part(0.14, 0.23, 1.1, s * 1.07, 0.65, -0.25, dark);
      const lamp = part(
        0.65,
        0.07,
        0.1,
        s * 0.69,
        0.85,
        2.08,
        material('#fff3cf'),
      );
      lamp.rotation.z = s * 0.12;
      if (kind % 3 === 1) {
        const slash = part(
          0.07,
          0.28,
          0.11,
          s * 0.55,
          0.76,
          2.09,
          material('#fff3cf'),
        );
        slash.rotation.z = s * 0.5;
      }
    }
  }
  const wheels: T.Group[] = [];
  for (const s of [-1, 1]) {
    part(0.3, 0.12, 0.32, s * 1.12, 1.16, 0.3, dark);
    for (const z of [-1.35, 1.35]) {
      const axle = new T.Group();
      axle.position.set(s * 1.1, 0.49, z);
      g.add(axle);
      wheels.push(axle);
      const wheel = new T.Mesh(
        new T.CylinderGeometry(0.46, 0.46, 0.28, 16),
        rubber,
      );
      wheel.rotation.z = Math.PI / 2;
      axle.add(wheel);
      const rim = new T.Mesh(
        new T.CylinderGeometry(0.32, 0.32, 0.29, 10),
        alloy,
      );
      rim.rotation.z = Math.PI / 2;
      axle.add(rim);
      for (let i = 0; i < 5; i++) {
        const spoke = new T.Mesh(new T.BoxGeometry(0.31, 0.04, 0.61), dark);
        spoke.rotation.x = (i * Math.PI) / 5;
        axle.add(spoke);
      }
    }
    part(0.72, 0.1, 0.1, s * 0.67, 0.86, -2.15, material('#ef3434'));
    part(0.3, 0.16, 0.24, s * 0.7, 0.49, -2.2, dark);
  }
  part(1.3, 0.2, 0.1, 0, 0.6, 2.18, dark);
  if (kind % 3 === 1) {
    part(2, 0.12, 0.5, 0, 1.13, -1.85, dark);
    for (const s of [-1, 1]) part(0.1, 0.25, 0.1, s * 0.7, 0.97, -1.8, dark);
  }
  g.userData.model = kind % 3;
  g.userData.animateWheels = (distance: number) =>
    wheels.forEach((w) => (w.rotation.x += distance / 0.46));
  return mergeModel(g);
}
