export type BikeMotion = {
  velocity: number;
  heading: number;
  steering: number;
  lean: number;
  travel: number;
};
export const newBikeMotion = (heading = 0): BikeMotion => ({
  velocity: 0,
  heading,
  steering: 0,
  lean: 0,
  travel: 0,
});
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
export function stepBike(
  s: BikeMotion,
  throttle: number,
  turn: number,
  brake: boolean,
  maximum: number,
  seconds: number,
) {
  const dt = clamp(seconds, 0, 0.05),
    input = clamp(throttle, -1, 1);
  const acceleration =
    input >= 0
      ? input *
        6.38 *
        Math.max(0.15, 1 - Math.max(0, s.velocity) / Math.max(1, maximum))
      : s.velocity > 0.1
        ? input * 10
        : input * 2;
  const drag = 0.55 + 0.00818 * s.velocity * s.velocity;
  const old = s.velocity;
  s.velocity += acceleration * dt;
  const resistance = (brake ? 13 : drag) * dt;
  s.velocity =
    Math.sign(s.velocity) * Math.max(0, Math.abs(s.velocity) - resistance);
  s.velocity = clamp(s.velocity, -2.2, Math.max(0, maximum));
  if (maximum <= 0) s.velocity = Math.sign(old) * Math.max(0, Math.abs(old) - 3 * dt);
  const steer = clamp(turn, -1, 1) * (0.52 / (1 + Math.abs(s.velocity) / 9));
  s.steering += (steer - s.steering) * (1 - Math.exp(-dt * 9));
  const yawRate = (s.velocity / 1.65) * Math.tan(s.steering);
  s.heading += yawRate * dt;
  s.lean +=
    (clamp(-Math.atan((s.velocity * yawRate) / 9.81), -0.48, 0.48) - s.lean) *
    (1 - Math.exp(-dt * 7));
  s.travel += s.velocity * dt;
  return {
    x: Math.sin(s.heading) * s.velocity * dt,
    z: Math.cos(s.heading) * s.velocity * dt,
  };
}
