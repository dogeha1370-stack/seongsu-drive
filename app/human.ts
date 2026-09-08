import * as T from 'three';
export type HumanRig = {
  root: T.Group;
  hips: T.Bone;
  head: T.Bone;
  arms: T.Bone[];
  elbows: T.Bone[];
  legs: T.Bone[];
  knees: T.Bone[];
  pose: (time: number, speed: number, punch: number, down?: boolean) => void;
  ride: (lean: number) => void;
};
export function createHuman(
  shirt: string,
  skin = '#cda17e',
  hair = '#302923',
  female = false,
): HumanRig {
  const root = new T.Group();
  const materials = new Map<string, T.MeshStandardMaterial>();
  const material = (c: string) => {
    if (!materials.has(c))
      materials.set(
        c,
        new T.MeshStandardMaterial({ color: c, roughness: 0.85 }),
      );
    return materials.get(c)!;
  };
  function mesh(
    geo: T.BufferGeometry,
    c: string,
    parent: T.Object3D,
    x = 0,
    y = 0,
    z = 0,
  ) {
    const m = new T.Mesh(geo, material(c));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function oval(
    x: number,
    y: number,
    z: number,
    c: string,
    parent: T.Object3D,
    px = 0,
    py = 0,
    pz = 0,
  ) {
    const m = mesh(new T.SphereGeometry(1, 12, 10), c, parent, px, py, pz);
    m.scale.set(x, y, z);
    return m;
  }
  function bone(name: string, parent: T.Object3D, x: number, y: number, z = 0) {
    const b = new T.Bone();
    b.name = name;
    b.position.set(x, y, z);
    parent.add(b);
    return b;
  }
  const hips = bone('hips', root, 0, 0.92),
    spine = bone('spine', hips, 0, 0.25),
    chest = bone('chest', spine, 0, 0.3),
    neck = bone('neck', chest, 0, 0.22),
    head = bone('head', neck, 0, 0.29);
  oval(0.29, 0.2, 0.19, '#34465b', hips);
  const torso = mesh(
    new T.CylinderGeometry(0.32, 0.25, 0.55, 12),
    shirt,
    spine,
    0,
    0.08,
  );
  torso.scale.z = 0.65;
  oval(0.34, 0.16, 0.21, shirt, chest, 0, -0.03);
  mesh(new T.CylinderGeometry(0.105, 0.12, 0.19, 10), skin, neck, 0, 0.015);
  oval(0.235, 0.29, 0.215, skin, head);
  oval(0.23, 0.12, 0.215, hair, head, 0, 0.225, -0.025);
  oval(0.225, 0.21, 0.095, hair, head, 0, 0.07, -0.15);
  for (const side of [-1, 1]) {
    oval(0.045, 0.075, 0.04, skin, head, side * 0.235, -0.01);
    oval(0.07, 0.045, 0.025, '#fff5e9', head, side * 0.09, 0.055, 0.19);
    oval(0.026, 0.029, 0.015, '#292c30', head, side * 0.09, 0.054, 0.215);
    const brow = mesh(
      new T.BoxGeometry(0.115, 0.023, 0.026),
      hair,
      head,
      side * 0.09,
      0.12,
      0.203,
    );
    brow.rotation.z = side * -0.08;
  }
  oval(0.044, 0.06, 0.07, skin, head, 0, -0.015, 0.216);
  oval(0.072, 0.018, 0.018, '#875448', head, 0, -0.12, 0.19);
  // Front-only collar, zipper, and nose make facing direction unambiguous.
  mesh(new T.BoxGeometry(0.025, 0.4, 0.02), '#c7c6b9', spine, 0, 0.07, 0.216);
  mesh(
    new T.TorusGeometry(0.105, 0.025, 5, 12, Math.PI),
    '#e8ded0',
    chest,
    0,
    0.08,
    0.16,
  );
  const arms: T.Bone[] = [],
    elbows: T.Bone[] = [],
    legs: T.Bone[] = [],
    knees: T.Bone[] = [];
  for (const side of [-1, 1]) {
    const shoulder = bone(
        side < 0 ? 'left_shoulder' : 'right_shoulder',
        chest,
        side * 0.37,
        -0.025,
      ),
      elbow = bone('elbow', shoulder, 0, -0.32),
      wrist = bone('wrist', elbow, 0, -0.3);
    mesh(new T.CapsuleGeometry(0.105, 0.18, 4, 10), shirt, shoulder, 0, -0.16);
    oval(0.1, 0.1, 0.1, shirt, elbow);
    mesh(new T.CapsuleGeometry(0.082, 0.17, 4, 10), skin, elbow, 0, -0.15);
    oval(0.09, 0.105, 0.07, skin, wrist, 0, -0.05, 0.018);
    oval(0.035, 0.065, 0.035, skin, wrist, -side * 0.07, -0.035, 0.06);
    arms.push(shoulder);
    elbows.push(elbow);
    const thigh = bone(
        side < 0 ? 'left_hip' : 'right_hip',
        hips,
        side * 0.16,
        -0.035,
      ),
      knee = bone('knee', thigh, 0, -0.39),
      ankle = bone('ankle', knee, 0, -0.38);
    mesh(new T.CapsuleGeometry(0.12, 0.23, 4, 10), '#34465b', thigh, 0, -0.19);
    oval(0.108, 0.105, 0.105, '#34465b', knee);
    mesh(new T.CapsuleGeometry(0.095, 0.22, 4, 10), '#34465b', knee, 0, -0.18);
    oval(0.12, 0.085, 0.21, '#e6e5db', ankle, 0, -0.02, 0.09);
    legs.push(thigh);
    knees.push(knee);
  }
  if (female) {
    oval(0.25, 0.33, 0.13, hair, head, 0, -0.035, -0.16);
    for (const side of [-1, 1])
      oval(0.085, 0.27, 0.14, hair, head, side * 0.22, -0.04, -0.015);
    oval(0.12, 0.21, 0.13, hair, head, 0, -0.17, -0.25);
  }
  const pose = (time: number, speed: number, punch: number, down = false) => {
    const amount = down ? 0 : Math.min(speed / 5, 1),
      cycle = time * (speed > 6 ? 13 : 9);
    hips.position.y = 0.92 + Math.abs(Math.sin(cycle)) * 0.025 * amount;
    hips.rotation.z = 0;
    for (let i = 0; i < 2; i++) {
      const phase = cycle + i * Math.PI;
      legs[i].rotation.x = Math.sin(phase) * 0.65 * amount;
      legs[i].rotation.z = 0;
      knees[i].rotation.x = Math.max(0, -Math.sin(phase)) * 0.7 * amount;
      arms[i].rotation.set(
        -Math.sin(phase) * 0.42 * amount,
        0,
        (i === 0 ? 1 : -1) * 0.08,
      );
      elbows[i].rotation.x =
        -0.12 - Math.max(0, Math.sin(phase)) * 0.25 * amount;
    }
    if (punch > 0 && !down) {
      arms[1].rotation.x = -1.7 * punch;
      elbows[1].rotation.x = -0.7 * (1 - punch);
      spine.rotation.y = -0.18 * punch;
    } else spine.rotation.y = 0;
    head.rotation.y = 0;
  };
  pose(0, 0, 0);
  const ride = (lean: number) => {
    hips.position.y = 0.76;
    for (let i = 0; i < 2; i++) {
      legs[i].rotation.set(-1.15, 0, i === 0 ? -0.13 : 0.13);
      knees[i].rotation.x = 1.55;
      arms[i].rotation.set(-1.15, 0, i === 0 ? 0.13 : -0.13);
      elbows[i].rotation.x = -0.32;
    }
    hips.rotation.z = lean * 0.3;
  };
  return { root, hips, head, arms, elbows, legs, knees, pose, ride };
}
