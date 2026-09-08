import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
async function load(file) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  }).outputText;
  return import(
    'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
  );
}
const { circleVehicleCorrection, isRoadSurface } =
  await load('app/world-rules.ts');
const { joystickVector, headingFromDirection } = await load('app/controls.ts');
const { numberChance } = await load('app/social.ts');
for (const angle of [0, Math.PI / 3, Math.PI / 2, Math.PI])
  for (const offset of [
    [0, 0],
    [0.5, 0.5],
    [-0.5, -0.5],
    [1.4, 0],
    [0, 2.4],
  ]) {
    const bounds = { x: 10, z: -5, angle, halfWidth: 1.2, halfLength: 2.2 },
      x = 10 + offset[0],
      z = -5 + offset[1],
      c = circleVehicleCorrection(x, z, 0.5, bounds);
    if (c)
      assert.equal(
        circleVehicleCorrection(x + c.x, z + c.z, 0.5, bounds),
        null,
      );
  }
assert.equal(
  circleVehicleCorrection(10, 10, 0.5, {
    x: 0,
    z: 0,
    angle: 0,
    halfWidth: 0.4,
    halfLength: 1,
  }),
  null,
);
for (const x of [-70, 0, 70])
  for (const z of [-100, -65, -15, 0, 15, 65, 100])
    assert(isRoadSurface(x, z, 2.8));
assert(!isRoadSurface(30, 15, 2.8));
assert(isRoadSurface(13, 65, 2.8));
assert.deepEqual(joystickVector(0, 0, 44), { x: 0, y: 0 });
assert(
  Math.abs(Math.hypot(...Object.values(joystickVector(100, 100, 44))) - 1) <
    1e-10,
);
assert.deepEqual(joystickVector(NaN, 0, 44), { x: 0, y: 0 });
assert.equal(joystickVector(22, 0, 44).x, 0.5);
assert.equal(headingFromDirection(0, -1), 0);
assert.equal(headingFromDirection(1, 0), Math.PI / 2);
const chances = [0, 1000, 10000, 100000, 500000, 1000000, 1e9].map(
  numberChance,
);
assert(
  chances.every((p, i) => p >= 0.15 && p < 0.85 && (!i || p > chances[i - 1])),
);
assert.equal(numberChance(NaN), 0.15);
console.log(
  'PASS rotated car/scooter collision, road exclusions, analog joystick bounds, map headings, and monotonic contact probability.',
);
