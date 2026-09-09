import * as T from 'three';
export function createMotorcycle(color: string, tier = 0) {
  const root = new T.Group(),
    chassis = new T.Group(),
    front = new T.Group();
  root.add(chassis);
  chassis.add(front);
  const materials = new Map<string, T.MeshStandardMaterial>();
  const mat = (c: string) => {
    if (!materials.has(c))
      materials.set(
        c,
        new T.MeshStandardMaterial({
          color: c,
          flatShading: true,
          roughness: 0.58,
          metalness: c === '#a7b0b7' ? 0.75 : 0.15,
        }),
      );
    return materials.get(c)!;
  };
  const part = (
    g: T.BufferGeometry,
    c: string,
    x: number,
    y: number,
    z: number,
    parent: T.Object3D = chassis,
  ) => {
    const m = new T.Mesh(g, mat(c));
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const box = (
    w: number,
    h: number,
    d: number,
    c: string,
    x: number,
    y: number,
    z: number,
    parent: T.Object3D = chassis,
  ) => part(new T.BoxGeometry(w, h, d), c, x, y, z, parent);
  const strut = (
    a: T.Vector3,
    b: T.Vector3,
    r: number,
    c: string,
    parent: T.Object3D = chassis,
  ) => {
    const m = part(
      new T.CylinderGeometry(r, r, a.distanceTo(b), 6),
      c,
      0,
      0,
      0,
      parent,
    );
    m.position.copy(a).lerp(b, 0.5);
    m.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      b.clone().sub(a).normalize(),
    );
    return m;
  };
  const wheels: T.Group[] = [];
  front.position.set(0, 0.42, 0.87);
  for (const z of [-0.84, 0.87]) {
    const pivot = new T.Group();
    pivot.position.set(0, z > 0 ? 0 : 0.42, z > 0 ? 0 : z);
    (z > 0 ? front : chassis).add(pivot);
    wheels.push(pivot);
    const tire = part(
      new T.CylinderGeometry(0.4, 0.4, 0.24, 12),
      '#172028',
      0,
      0,
      0,
      pivot,
    );
    tire.rotation.z = Math.PI / 2;
    for (const side of [-1, 1]) {
      const rim = part(
        new T.CylinderGeometry(0.28, 0.28, 0.018, 10),
        '#a7b0b7',
        side * 0.125,
        0,
        0,
        pivot,
      );
      rim.rotation.z = Math.PI / 2;
      const hub = part(
        new T.CylinderGeometry(0.1, 0.1, 0.028, 8),
        '#35414a',
        side * 0.14,
        0,
        0,
        pivot,
      );
      hub.rotation.z = Math.PI / 2;
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        strut(
          new T.Vector3(side * 0.15, 0, 0),
          new T.Vector3(side * 0.15, Math.sin(a) * 0.27, Math.cos(a) * 0.27),
          0.027,
          '#222b33',
          pivot,
        );
      }
    }
  }
  for (const side of [-1, 1]) {
    strut(
      new T.Vector3(side * 0.2, 0, 0),
      new T.Vector3(side * 0.2, 0.91, -0.22),
      0.05,
      tier > 2 ? '#cfa65b' : '#a7b0b7',
      front,
    );
    strut(
      new T.Vector3(side * 0.22, 0.42, -0.84),
      new T.Vector3(side * 0.25, 0.76, 0.12),
      0.06,
      '#343d46',
    );
    strut(
      new T.Vector3(side * 0.23, 0.5, -0.6),
      new T.Vector3(side * 0.22, 1.05, -0.37),
      0.045,
      '#d5b756',
    );
    box(0.3, 0.05, 0.15, '#242a31', side * 0.37, 0.58, -0.24);
    strut(
      new T.Vector3(side * 0.34, 1.46, 0.55),
      new T.Vector3(side * 0.49, 1.77, 0.51),
      0.02,
      '#a7b0b7',
    );
    box(0.19, 0.11, 0.07, '#111d28', side * 0.5, 1.78, 0.51);
  }
  const tank = part(new T.IcosahedronGeometry(0.48, 0), color, 0, 1.07, 0.12);
  tank.scale.set(0.82, 0.67, 1.15);
  box(0.58, 0.17, 0.68, '#20232a', 0, 1.03, -0.45);
  const tail = box(0.47, 0.24, 0.53, color, 0, 1.06, -0.85);
  tail.rotation.x = 0.15;
  box(0.45, 0.45, 0.45, '#41464b', 0, 0.65, 0.02);
  for (let i = 0; i < 4; i++)
    box(0.53, 0.035, 0.47, '#889097', 0, 0.53 + i * 0.1, 0.02);
  strut(
    new T.Vector3(0.33, 0.55, 0.27),
    new T.Vector3(0.38, 0.44, -0.81),
    0.085,
    '#a7b0b7',
  );
  box(0.84, 0.065, 0.08, '#a7b0b7', 0, 1.45, 0.57);
  for (const x of [-0.4, 0.4]) box(0.18, 0.09, 0.1, '#18232a', x, 1.45, 0.57);
  const lamp = part(
    new T.CylinderGeometry(0.18, 0.18, 0.13, 10),
    '#f7f0ca',
    0,
    0.87,
    -0.01,
    front,
  );
  lamp.rotation.x = Math.PI / 2;
  box(0.23, 0.07, 0.05, '#ef5446', 0, 1.06, -1.12);
  box(0.25, 0.17, 0.025, '#ecede4', 0, 0.81, -1.09);
  if (tier >= 2) {
    const screen = box(0.47, 0.4, 0.07, '#526c7a', 0, 1.49, 0.7);
    screen.rotation.x = 0.28;
  }
  if (tier >= 3) {
    for (const side of [-1, 1]) {
      const fairing = part(
        new T.IcosahedronGeometry(0.38, 0),
        color,
        side * 0.29,
        0.96,
        0.4,
      );
      fairing.scale.set(0.45, 1, 1.5);
    }
  }
  root.userData.animateBike = (
    travel: number,
    steering: number,
    lean: number,
  ) => {
    front.rotation.y = steering;
    chassis.rotation.z = lean;
    wheels.forEach((w) => (w.rotation.x = travel / 0.4));
  };
  root.userData.bikeTier = tier;
  root.userData.chassis = chassis;
  return root;
}
