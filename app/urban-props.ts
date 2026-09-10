import * as T from 'three';
// Small, original low-poly props; no images of real nuisance passengers.
export function urbanProp(item: string) {
  const root = new T.Group();
  root.name = item;
  const part = (
    w: number,
    h: number,
    d: number,
    color: string,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    const mesh = new T.Mesh(
      new T.BoxGeometry(w, h, d),
      new T.MeshStandardMaterial({ color, roughness: 0.7 }),
    );
    mesh.position.set(x, y, z);
    root.add(mesh);
    return mesh;
  };
  if (item === '단소' || item === '등산 스틱') {
    part(
      0.055,
      item === '단소' ? 0.62 : 1.1,
      0.055,
      item === '단소' ? '#c4a276' : '#78929b',
      0,
      -0.2,
    );
    if (item === '단소')
      for (let i = 0; i < 5; i++)
        part(0.025, 0.025, 0.012, '#332b27', 0, -0.3 + i * 0.07, 0.033);
    else part(0.15, 0.08, 0.08, '#222c31', 0, 0.3);
  } else if (item === '신문지 방패') {
    part(0.5, 0.65, 0.07, '#d9d5c3', 0, -0.12);
    for (let i = 0; i < 6; i++)
      part(0.38, 0.015, 0.008, '#646967', 0, -0.35 + i * 0.08, 0.04);
  } else if (item === '교통카드') part(0.12, 0.18, 0.015, '#74c48b');
  else if (item === '정체불명 장바구니') {
    part(0.42, 0.5, 0.22, '#c39d6c', 0, -0.3);
    for (const x of [-0.12, 0.12]) part(0.04, 0.25, 0.05, '#715b40', x, 0.05);
    part(0.28, 0.04, 0.05, '#715b40', 0, 0.18);
  } else if (item === '소음 차단 헤드폰') {
    part(0.34, 0.06, 0.1, '#adb7be', 0, 0.16);
    for (const x of [-0.17, 0.17]) {
      part(0.04, 0.3, 0.07, '#adb7be', x, 0.03);
      part(0.11, 0.19, 0.13, '#313e54', x, -0.05);
    }
  } else {
    part(0.28, 0.43, 0.22, item === '작은 확성기' ? '#e4d7a4' : '#313b50');
    for (const y of [-0.1, 0.1]) {
      const disk = new T.Mesh(
        new T.CylinderGeometry(0.085, 0.085, 0.02, 12),
        new T.MeshStandardMaterial({ color: '#121f29' }),
      );
      disk.rotation.x = Math.PI / 2;
      disk.position.set(0, y, 0.12);
      root.add(disk);
    }
  }
  root.position.set(0, -0.55, 0.08);
  return root;
}
