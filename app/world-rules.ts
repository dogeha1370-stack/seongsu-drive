export type VehicleBounds = {
  x: number;
  z: number;
  angle: number;
  halfWidth: number;
  halfLength: number;
};
export function isRoadSurface(x: number, z: number, clearance = 0) {
  return (
    [-70, 0, 70].some(
      (road) => Math.abs(x - road) < (road === 0 ? 9 : 7.5) + clearance,
    ) ||
    [-65, 0, 65].some(
      (road) => Math.abs(z - road) < (road === 0 ? 10 : 7.5) + clearance,
    )
  );
}
export function circleVehicleCorrection(
  x: number,
  z: number,
  r: number,
  b: VehicleBounds,
) {
  const sin = Math.sin(b.angle),
    cos = Math.cos(b.angle),
    dx = x - b.x,
    dz = z - b.z,
    lx = dx * cos - dz * sin,
    lz = dx * sin + dz * cos;
  const qx = Math.max(-b.halfWidth, Math.min(b.halfWidth, lx)),
    qz = Math.max(-b.halfLength, Math.min(b.halfLength, lz));
  let nx = lx - qx,
    nz = lz - qz;
  const distance = Math.hypot(nx, nz);
  let depth = r - distance;
  if (depth <= 0) return null;
  if (distance < 1e-6) {
    const ex = b.halfWidth - Math.abs(lx),
      ez = b.halfLength - Math.abs(lz);
    if (ex < ez) {
      nx = lx < 0 ? -1 : 1;
      nz = 0;
      depth = r + ex;
    } else {
      nx = 0;
      nz = lz < 0 ? -1 : 1;
      depth = r + ez;
    }
  } else {
    nx /= distance;
    nz /= distance;
  }
  return {
    x: (nx * cos + nz * sin) * (depth + 0.01),
    z: (-nx * sin + nz * cos) * (depth + 0.01),
  };
}
