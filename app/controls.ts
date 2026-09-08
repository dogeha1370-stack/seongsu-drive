export function joystickVector(dx: number, dy: number, radius: number) {
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || radius <= 0) return { x: 0, y: 0 };
  const scale = length > radius ? radius / length : 1;
  return { x: (dx * scale) / radius, y: (dy * scale) / radius };
}
export const headingFromDirection = (x: number, z: number) => Math.atan2(x, -z);
