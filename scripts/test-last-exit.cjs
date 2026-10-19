#!/usr/bin/env node
'use strict';

// Run with: node scripts/test-last-exit.cjs
// The production TypeScript is transpiled in memory; no build, browser, test
// dependency, generated files or substitute copy of the physics is required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const gameDirectory = path.resolve(__dirname, '../src/lib/game');
const modules = new Map();
function loadTypeScript(filename) {
  const resolved = path.resolve(filename);
  if (modules.has(resolved)) return modules.get(resolved).exports;
  const source = fs.readFileSync(resolved, 'utf8');
  const result = ts.transpileModule(source, {
    fileName: resolved,
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n'));
  const module = { exports: {} };
  modules.set(resolved, module);
  const localRequire = (id) => {
    if (!id.startsWith('.')) return require(id);
    const target = path.resolve(path.dirname(resolved), id + (path.extname(id) ? '' : '.ts'));
    assert.ok(target.startsWith(gameDirectory + path.sep), 'Test loader only imports game source');
    return loadTypeScript(target);
  };
  const execute = new vm.Script(`(function(exports, require, module, __filename, __dirname) {\n${result.outputText}\n})`, { filename: resolved }).runInThisContext();
  execute(module.exports, localRequire, module, resolved, path.dirname(resolved));
  return module.exports;
}

const { stepVehicle, resolveCollisions, clearRoad, emptyInput } = loadTypeScript(path.join(gameDirectory, 'physics.ts'));
const { CITY_LIMIT } = loadTypeScript(path.join(gameDirectory, 'types.ts'));
const DT = 1 / 60;
const RADIUS = 1.35;
const speed = (car) => Math.hypot(car.vx, car.vz);
const vehicle = (values = {}) => ({ x: 0, z: 0, vx: 0, vz: 0, heading: 0, ...values });
const input = (values = {}) => ({ ...emptyInput(), ...values });

// Holding position at the origin acts as a rolling road: it measures driving
// behavior without reaching the finite city boundary during a long speed run.
function driveOnRollingRoad(car, controls, seconds, boosting = false) {
  let driftSeen = false;
  for (let frame = 0; frame < Math.round(seconds / DT); frame++) {
    const state = stepVehicle(car, controls, DT, boosting, []);
    driftSeen ||= state.drift;
    car.x = 0;
    car.z = 0;
  }
  return { car, driftSeen };
}

function assertOutside(car, box, label = 'Vehicle penetrated a solid building') {
  const dx = Math.max(Math.abs(car.x - box.x) - box.halfX, 0);
  const dz = Math.max(Math.abs(car.z - box.z) - box.halfZ, 0);
  assert.ok(Math.hypot(dx, dz) >= RADIUS - 1e-6, label);
}

let passed = 0;
let failed = 0;
function test(name, check) {
  try { check(); passed++; console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}\n  ${error.stack || error}`); }
}

test('Acceleration reaches a stable arcade speed; boost is materially faster', () => {
  const normal = driveOnRollingRoad(vehicle(), input({ throttle: true }), 12).car;
  const boosted = driveOnRollingRoad(vehicle(), input({ throttle: true, boost: true }), 12, true).car;
  assert.ok(speed(normal) > 25 && speed(normal) < 55, 'Normal driving must be useful and speed-limited');
  assert.ok(speed(boosted) > speed(normal) * 1.2, 'Boost must give a noticeable top-speed advantage');
  assert.ok(speed(boosted) < 80, 'Boost must remain controllable');
  const settled = speed(normal);
  driveOnRollingRoad(normal, input({ throttle: true }), 4);
  assert.ok(Math.abs(speed(normal) - settled) < 0.5, 'Holding throttle must not accelerate without limit');
});

test('Braking slows faster than coasting, and holding brake engages limited reverse', () => {
  const coast = vehicle({ vz: 30 });
  const brake = vehicle({ vz: 30 });
  driveOnRollingRoad(coast, input(), 0.5);
  driveOnRollingRoad(brake, input({ brake: true }), 0.5);
  assert.ok(speed(brake) < speed(coast) * 0.65, 'Brake must slow the car substantially faster than releasing throttle');
  const reverse = driveOnRollingRoad(vehicle(), input({ brake: true }), 4).car;
  assert.ok(reverse.vz < -3 && reverse.vz > -16, 'A held brake must allow a slower, speed-limited reverse');
  const stopped = vehicle();
  driveOnRollingRoad(stopped, input({ left: true }), 2);
  assert.ok(speed(stopped) < 0.001 && Math.abs(stopped.heading) < 0.001, 'Steering at rest must not move or spin the car');
});

test('Left/right turns mirror each other and reverse steering remains consistent', () => {
  const left = vehicle({ vz: 22 });
  const right = vehicle({ vz: 22 });
  for (let i = 0; i < 45; i++) {
    stepVehicle(left, input({ throttle: true, left: true }), DT, false, []);
    stepVehicle(right, input({ throttle: true, right: true }), DT, false, []);
  }
  assert.ok(Math.abs(left.heading) > 0.3 && Math.abs(left.x) > 1, 'A moving car must actually turn');
  assert.ok(Math.abs(left.x + right.x) < 1e-5 && Math.abs(left.z - right.z) < 1e-5, 'Equivalent opposite steering must create mirrored paths');
  assert.ok(Math.abs(left.heading + right.heading) < 1e-5, 'Left and right handling must be symmetric');
  const reversing = driveOnRollingRoad(vehicle({ vz: -8 }), input({ brake: true, left: true }), 0.35).car;
  assert.ok(Math.sign(reversing.heading) === -Math.sign(left.heading), 'Steering while reversing must turn in the opposite direction');
});

test('Handbrake creates sustained lateral slip and a tighter turn', () => {
  const grip = driveOnRollingRoad(vehicle({ vz: 25 }), input({ throttle: true, left: true }), 0.65);
  const drift = driveOnRollingRoad(vehicle({ vz: 25 }), input({ throttle: true, left: true, drift: true }), 0.65);
  const slip = (car) => Math.abs(car.vx * Math.cos(car.heading) - car.vz * Math.sin(car.heading));
  assert.ok(drift.driftSeen, 'A handbrake turn at speed must register as a drift');
  assert.ok(slip(drift.car) > slip(grip.car) * 1.5, 'Drifting must retain more sideways movement than normal grip');
  assert.ok(Math.abs(drift.car.heading) > Math.abs(grip.car.heading), 'The handbrake must help rotate the car');
});

test('Wall contact removes penetration and rebounds inward motion while preserving a slide', () => {
  const wall = { x: 0, z: 0, halfX: 5, halfZ: 4 };
  const car = vehicle({ x: -6, vx: 14, vz: 8 });
  const impact = resolveCollisions(car, [wall]);
  assertOutside(car, wall);
  assert.ok(impact > 5, 'A wall strike must register an impact');
  assert.ok(car.vx <= 0, 'A car must not keep moving into the wall');
  assert.ok(Math.abs(car.vz - 8) < 0.01, 'A glancing collision must preserve movement along the wall');
});

test('Corner and fully-inside contacts recover outside the building', () => {
  const box = { x: 0, z: 0, halfX: 5, halfZ: 4 };
  const corner = vehicle({ x: 5.6, z: 4.6, vx: -7, vz: -7 });
  assert.ok(resolveCollisions(corner, [box]) > 0, 'An incoming corner strike must register an impact');
  assertOutside(corner, box, 'Car must not remain embedded in a building corner');
  for (const position of [{ x: 0, z: 0 }, { x: 4.8, z: 2 }, { x: -3, z: -3.8 }]) {
    const inside = vehicle(position);
    resolveCollisions(inside, [box]);
    assertOutside(inside, box, 'An embedded car must recover to a drivable position');
    assert.ok(Number.isFinite(inside.x) && Number.isFinite(inside.z));
  }
});

test('Driving continuously into a wall cannot tunnel through it', () => {
  const wall = { x: 0, z: 0, halfX: 1, halfZ: 20 };
  const car = vehicle({ x: -12, heading: Math.PI / 2, vx: 40 });
  let hit = false;
  for (let frame = 0; frame < 240; frame++) {
    const result = stepVehicle(car, input({ throttle: true }), DT, false, [wall]);
    hit ||= result.impact > 0;
    assertOutside(car, wall);
    assert.ok(car.x < -wall.halfX, 'The car must stay on its original side of a solid wall');
  }
  assert.ok(hit, 'The test must actually strike the wall');
});

test('All four district boundaries contain the car and rebound outward velocity', () => {
  for (const axis of ['x', 'z']) for (const sign of [-1, 1]) {
    const velocity = axis === 'x' ? 'vx' : 'vz';
    const car = vehicle({ [axis]: sign * (CITY_LIMIT + 5), [velocity]: sign * 25 });
    assert.ok(resolveCollisions(car, []) > 0, 'Boundary strikes must register an impact');
    assert.ok(Math.abs(car[axis]) <= CITY_LIMIT, 'Cars must stay inside the district');
    assert.ok(car[velocity] * sign < 0, 'Boundary contact must rebound a car toward the district');
  }
});

test('Pursuit visibility distinguishes an empty street, blocked wall and near miss', () => {
  const box = { x: 0, z: 0, halfX: 3, halfZ: 5 };
  assert.equal(clearRoad(-20, 0, 20, 0, []), true, 'An empty road must be visible');
  assert.equal(clearRoad(-20, 0, 20, 0, [box]), false, 'Pursuers must not see through a building');
  assert.equal(clearRoad(-20, 12, 20, 12, [box]), true, 'A parallel street beyond the building must stay open');
  assert.equal(clearRoad(-20, 0, -10, 0, [box]), true, 'A building beyond the destination must not block the segment');
  assert.equal(clearRoad(-20, 6, 20, 6, [box]), false, 'A route too close to a wall must account for vehicle clearance');
  assert.equal(clearRoad(0, 0, 0, 0, [box]), false, 'A point inside a building is blocked');
  assert.equal(clearRoad(10, 10, 10, 10, [box]), true, 'A stationary point on an empty street is clear');
});

test('Ten simulated minutes of varied driving remain finite, contained and outside buildings', () => {
  const buildings = [];
  for (const x of [-160, -96, -32, 32, 96, 160]) for (const z of [-160, -96, -32, 32, 96, 160]) {
    for (const dx of [-10, 10]) for (const dz of [-10, 10]) buildings.push({ x: x + dx, z: z + dz, halfX: 8, halfZ: 8 });
  }
  let seed = 0x15e1a7;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const car = vehicle({ x: -4, z: -155 });
  let controls = input();
  let changeAt = 0;
  let distance = 0;
  let impacts = 0;
  for (let frame = 0; frame < 60 * 600; frame++) {
    if (frame >= changeAt) {
      const steering = random();
      controls = input({ throttle: random() > 0.18, brake: random() < 0.17, left: steering < 0.34, right: steering > 0.67, drift: random() < 0.3, boost: random() < 0.22 });
      changeAt = frame + 12 + Math.floor(random() * 100);
    }
    const oldX = car.x, oldZ = car.z;
    const result = stepVehicle(car, controls, DT, controls.boost && controls.throttle, buildings);
    distance += Math.hypot(car.x - oldX, car.z - oldZ);
    if (result.impact > 0) impacts++;
    for (const [key, value] of Object.entries(car)) assert.ok(Number.isFinite(value), `${key} became non-finite at frame ${frame}`);
    assert.ok(Math.abs(car.x) <= CITY_LIMIT && Math.abs(car.z) <= CITY_LIMIT, `Escaped district at frame ${frame}`);
    assert.ok(Math.abs(car.heading) <= Math.PI + 1e-6, `Heading became unstable at frame ${frame}`);
    assert.ok(result.speed < 90 && result.impact >= 0 && Number.isFinite(result.impact), `Unstable speed or impact at frame ${frame}`);
    for (const box of buildings) assertOutside(car, box, `Building penetration at frame ${frame}`);
  }
  assert.ok(distance > 1000, 'The simulation must cover meaningful driving distance');
  assert.ok(impacts > 10, 'The simulation must exercise repeated collision recovery');
  console.log(`  Simulated 600 s, ${Math.round(distance)} distance units and ${impacts} collision frames.`);
});

console.log(`\nLast Exit physics: ${passed} passed, ${failed} failed.`);
if (failed) process.exitCode = 1;
