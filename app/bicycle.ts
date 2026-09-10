import * as T from 'three';
export function createBicycle() {
  const root = new T.Group();
  root.name = 'rental-bicycle';
  const metal = new T.MeshStandardMaterial({
    color: '#70c845',
    metalness: 0.3,
    roughness: 0.55,
  });
  const dark = new T.MeshStandardMaterial({ color: '#263334' });
  function bar(a: number[], b: number[], radius = 0.035, mat = metal) {
    const va = new T.Vector3(...a),
      vb = new T.Vector3(...b),
      d = vb.clone().sub(va);
    const m = new T.Mesh(
      new T.CylinderGeometry(radius, radius, d.length(), 8),
      mat,
    );
    m.position.copy(va.add(vb).multiplyScalar(0.5));
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    root.add(m);
  }
  const wheels = [-0.72, 0.72].map((z) => {
    const g = new T.Group();
    g.position.set(0, 0.43, z);
    const tire = new T.Mesh(new T.TorusGeometry(0.4, 0.04, 6, 20), dark);
    tire.rotation.y = Math.PI / 2;
    g.add(tire);
    for (let i = 0; i < 6; i++) {
      const spoke = new T.Mesh(new T.BoxGeometry(0.018, 0.79, 0.018), metal);
      spoke.rotation.x = (i * Math.PI) / 6;
      g.add(spoke);
    }
    root.add(g);
    return g;
  });
  const rear = [0, 0.43, -0.72],
    front = [0, 0.43, 0.72],
    crank = [0, 0.42, -0.05],
    seat = [0, 1, -0.2],
    head = [0, 1, 0.52];
  for (const [a, b] of [
    [rear, seat],
    [rear, crank],
    [crank, seat],
    [seat, head],
    [crank, head],
    [head, front],
  ])
    bar(a, b);
  bar(head, [0, 1.25, 0.55]);
  bar([-0.35, 1.25, 0.55], [0.35, 1.25, 0.55], 0.03, dark);
  const saddle = new T.Mesh(new T.BoxGeometry(0.3, 0.09, 0.35), dark);
  saddle.position.set(0, 1.05, -0.2);
  root.add(saddle);
  const basket = new T.Mesh(
    new T.BoxGeometry(0.5, 0.3, 0.4),
    new T.MeshStandardMaterial({ color: '#ccd7cf', wireframe: true }),
  );
  basket.position.set(0, 1.1, 0.87);
  root.add(basket);
  return {
    root,
    animate: (distance: number) =>
      wheels.forEach((w) => (w.rotation.x = distance / 0.4)),
  };
}
