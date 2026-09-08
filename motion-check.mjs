import fs from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
const load = async (p) =>
  import(
    'data:text/javascript;base64,' +
      Buffer.from(
        ts.transpileModule(fs.readFileSync(p, 'utf8'), {
          compilerOptions: {
            module: ts.ModuleKind.ES2022,
            target: ts.ScriptTarget.ES2022,
          },
        }).outputText,
      ).toString('base64')
  );
const { newBikeMotion, stepBike } = await load('app/bike-motion.ts');
const bike = newBikeMotion();
stepBike(bike, 1, 0, false, 24, 0.016);
assert(bike.velocity > 0 && bike.velocity < 0.1);
for (let i = 0; i < 180; i++) stepBike(bike, 1, 0, false, 24, 1 / 60);
assert(bike.velocity > 5 && bike.velocity < 24);
const moving = bike.velocity;
stepBike(bike, 0, 0, false, 24, 0.016);
assert(bike.velocity > 0 && bike.velocity < moving);
for (let i = 0; i < 30; i++) stepBike(bike, 1, 1, false, 24, 1 / 60);
assert(bike.heading > 0 && bike.lean < 0);
for (let i = 0; i < 150; i++) stepBike(bike, 0, 0, true, 24, 1 / 60);
assert.equal(bike.velocity, 0);
const heading = bike.heading;
stepBike(bike, 0, 1, false, 24, 0.02);
assert.equal(bike.heading, heading);
const { sampleMotion } = await load('app/net-motion.ts');
const samples = [
  { x: 0, z: 0, heading: 3.1, speed: 5, at: 0 },
  { x: 1, z: 0, heading: -3.1, speed: 5, at: 200 },
  { x: 2, z: 0, heading: -3, speed: 5, at: 400 },
];
const frame = sampleMotion(samples, 500);
assert(frame.x > 1 && frame.x < 2);
assert(Math.abs(frame.heading) > 3);
assert(sampleMotion(samples, 10000).x <= 2.75);
console.log(
  'PASS progressive acceleration, coasting, braking, speed-dependent steering, leaning, stationary steering and bounded snapshot interpolation.',
);
