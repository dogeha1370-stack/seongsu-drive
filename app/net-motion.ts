export type MotionSample = {
  x: number;
  z: number;
  heading: number;
  at: number;
  speed: number;
};
export function sampleMotion(
  samples: MotionSample[],
  now: number,
): MotionSample {
  const last = samples[samples.length - 1];
  if (samples.length < 2) return last;
  const previous = samples[samples.length - 2];
  const gap = Math.max(1, last.at - previous.at);
  const realtime = typeof __EC2__ !== 'undefined' && __EC2__;
  const delay = realtime ? Math.min(180, Math.max(75, gap * 1.5)) : Math.min(450, Math.max(180, gap * 1.1));
  const time = now - delay;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1],
      b = samples[i];
    if (time <= b.at) {
      const t = Math.max(
        0,
        Math.min(1, (time - a.at) / Math.max(1, b.at - a.at)),
      );
      const angle = Math.atan2(
        Math.sin(b.heading - a.heading),
        Math.cos(b.heading - a.heading),
      );
      return {
        x: a.x + (b.x - a.x) * t,
        z: a.z + (b.z - a.z) * t,
        heading: a.heading + angle * t,
        speed: a.speed + (b.speed - a.speed) * t,
        at: time,
      };
    }
  }
  // Brief bounded prediction absorbs jitter, then holds rather than running away.
  const t = Math.min(150, Math.max(0, time - last.at)) / gap;
  return {
    ...last,
    x: last.x + (last.x - previous.x) * t,
    z: last.z + (last.z - previous.z) * t,
  };
}
