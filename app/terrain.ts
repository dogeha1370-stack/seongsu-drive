import * as T from 'three';
export function roadHeight(x: number, z: number) {
  if (Math.abs(x - 70) >= 11 || z <= 20 || z >= 54) return 0;
  const lateral = Math.max(0, Math.min(1, (11 - Math.abs(x - 70)) / 3));
  return Math.sin(((z - 20) / 34) * Math.PI) ** 2 * 1.6 * lateral;
}
export function roadGrade(x: number, z: number, heading: number) {
  return (
    (roadHeight(x + Math.sin(heading), z + Math.cos(heading)) -
      roadHeight(x - Math.sin(heading), z - Math.cos(heading))) /
    2
  );
}
export function createSlope(scene: T.Scene) {
  const geometry = new T.PlaneGeometry(22, 34, 22, 34);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(70, 0, 37);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++)
    p.setY(i, roadHeight(p.getX(i), p.getZ(i)) + 0.13);
  geometry.computeVertexNormals();
  const mesh = new T.Mesh(
    geometry,
    new T.MeshStandardMaterial({ color: '#39484a', roughness: 0.97 }),
  );
  mesh.receiveShadow = true;
  mesh.name = 'graded-road';
  scene.add(mesh);
  for (let z = 22; z < 53; z += 4) {
    const stripe = new T.Mesh(
      new T.BoxGeometry(0.12, 0.025, 1.5),
      new T.MeshBasicMaterial({ color: '#e7d393' }),
    );
    stripe.position.set(70, roadHeight(70, z) + 0.16, z);
    stripe.rotation.x = -Math.atan(roadGrade(70, z, 0));
    scene.add(stripe);
  }
}
