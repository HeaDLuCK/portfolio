#!/usr/bin/env node
'use strict';

// Run with: node scripts/test-last-exit-engine.cjs
// Exercise the actual game rules without creating WebGL or an audio device.
// Arrow class fields are promoted to methods only in this in-memory test build,
// allowing Object.create to bypass the browser-only constructor. Their bodies
// and all physics/scoring/lifecycle methods are the unchanged production code.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const THREE = require('three');

const gameDirectory = path.resolve(__dirname, '../src/lib/game');
const modules = new Map();
const tests = [];
const DT = 1 / 60;
const STORAGE_KEY = 'last-exit-best-v1';

function carVisual(group = new THREE.Group()) {
  return { group, wheels: [], brakeLights: [], exhaust: new THREE.Group() };
}

function promoteArrowFields(context) {
  const visit = node => {
    if (ts.isPropertyDeclaration(node) && node.initializer && ts.isArrowFunction(node.initializer)) {
      const arrow = node.initializer;
      const body = ts.isBlock(arrow.body) ? arrow.body : ts.factory.createBlock([ts.factory.createReturnStatement(arrow.body)]);
      return ts.factory.createMethodDeclaration(node.modifiers, undefined, node.name, undefined, arrow.typeParameters, arrow.parameters, arrow.type, body);
    }
    return ts.visitEachChild(node, visit, context);
  };
  return source => ts.visitNode(source, visit);
}

function loadTypeScript(filename) {
  const resolved = path.resolve(filename);
  if (modules.has(resolved)) return modules.get(resolved).exports;
  const result = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
    fileName: resolved,
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    transformers: path.basename(resolved) === 'engine.ts' ? { before: [promoteArrowFields] } : undefined,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter(item => item.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, errors.map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n')).join('\n'));
  const module = { exports: {} };
  modules.set(resolved, module);
  const localRequire = id => {
    // Scene generation is cosmetic and requires browser canvases. Give the real
    // engine simple Three groups; never replace its game rules or physics.
    if (path.basename(resolved) === 'engine.ts' && id === './world') {
      return { createCar: () => carVisual(), createWorld() { throw new Error('The browser constructor must not run in this test.'); } };
    }
    if (!id.startsWith('.')) return require(id);
    const target = path.resolve(path.dirname(resolved), id + (path.extname(id) ? '' : '.ts'));
    assert.ok(target.startsWith(gameDirectory + path.sep), 'Test loader only imports game source');
    return loadTypeScript(target);
  };
  const execute = new vm.Script(`(function(exports, require, module, __filename, __dirname) {\n${result.outputText}\n})`, { filename: resolved }).runInThisContext();
  execute(module.exports, localRequire, module, resolved, path.dirname(resolved));
  return module.exports;
}

const { LastExitGame } = loadTypeScript(path.join(gameDirectory, 'engine.ts'));
const { initialVehicle, emptyInput } = loadTypeScript(path.join(gameDirectory, 'physics.ts'));
const { ROAD_CENTERS, CITY_LIMIT } = loadTypeScript(path.join(gameDirectory, 'types.ts'));

function createHarness() {
  const game = Object.create(LastExitGame.prototype);
  const events = { sounds: [], suspensions: 0, snapshots: [], renders: 0 };
  const instanceVisual = () => ({ instanceMatrix: { needsUpdate: false }, setMatrixAt() {}, setColorAt() {}, dispose() {} });
  Object.assign(game, {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    sun: new THREE.DirectionalLight(),
    world: { colliders: [], dispose() {} },
    player: carVisual(),
    vehicle: initialVehicle(),
    input: emptyInput(),
    audio: {
      unlock: async () => {},
      play: kind => events.sounds.push(kind),
      update() {},
      suspend: () => events.suspensions++,
      setMuted() {},
      dispose() {},
    },
    rivals: [], traffic: [], pickups: [],
    checkpoint: new THREE.Group(), targetIndex: 0,
    particleMesh: instanceVisual(), particles: [], particleCursor: 0,
    skidMesh: instanceVisual(), skidCursor: 0, skidClock: 0,
    dummy: new THREE.Object3D(), color: new THREE.Color(),
    currentLook: new THREE.Vector3(), cameraTarget: new THREE.Vector3(), lookTarget: new THREE.Vector3(),
    previousTime: 0, accumulator: 0, lastStats: 0, lastMap: 0,
    elapsed: 0, damageCooldown: 0, driftTime: 0, messageUntil: 0, shake: 0,
    disposed: false, muted: false, endSoundTimer: null,
    quality: 'low', lowQuality: true, slowFrames: 0,
    minimap: null,
    options: { onStats: value => events.snapshots.push(value), onError: message => assert.fail(message) },
    stats: { phase: 'playing', speed: 0, fuel: 100, health: 100, boost: 100, score: 0, best: 0, seconds: 150, heat: 1, deliveries: 0, objectiveDistance: 91, objectiveBearing: 0, message: '', reason: '', combo: 1 },
  });
  // Particle placement and GPU drawing are covered by browser QA, not this suite.
  game.spawnParticles = () => {};
  game.render = () => { events.renders++; };
  return { game, events };
}

function test(name, check) { tests.push({ name, check }); }
function closeTo(actual, expected, message) { assert.ok(Math.abs(actual - expected) < 1e-7, `${message}: expected ${expected}, received ${actual}`); }
function clearEndTimer(game) { if (game.endSoundTimer) clearTimeout(game.endSoundTimer); game.endSoundTimer = null; }

test('Pursuit spawning stays at least 52 units away at all junctions, edges and headings', () => {
  const { game } = createHarness();
  const positions = [];
  for (const x of ROAD_CENTERS) for (const z of ROAD_CENTERS) positions.push({ x, z });
  for (const along of [...ROAD_CENTERS, -CITY_LIMIT, CITY_LIMIT]) {
    positions.push({ x: -CITY_LIMIT, z: along }, { x: CITY_LIMIT, z: along }, { x: along, z: -CITY_LIMIT }, { x: along, z: CITY_LIMIT });
  }
  let checked = 0;
  for (const position of positions) for (let direction = 0; direction < 8; direction++) {
    game.vehicle = { ...initialVehicle(), ...position, heading: direction * Math.PI / 4 };
    game.rivals = [];
    for (let index = 0; index < 4; index++) {
      const point = game.rivalSpawn(index);
      const distance = Math.hypot(point.x - position.x, point.z - position.z);
      assert.ok(distance >= 52, `Pursuit appeared ${distance.toFixed(2)} units from player at ${JSON.stringify(position)}`);
      assert.ok(ROAD_CENTERS.includes(point.x) && ROAD_CENTERS.includes(point.z), 'Pursuit must appear at a drivable street junction');
      assert.ok(game.rivals.every(other => Math.hypot(other.vehicle.x - point.x, other.vehicle.z - point.z) >= 20), 'Pursuing cars must not spawn on top of one another');
      game.rivals.push({ vehicle: { ...point } });
      checked++;
    }
  }
  console.log(`  Checked ${checked} pursuit spawns, including all 49 street junctions.`);
});

test('A distant rival relocating at the boundary cannot teleport onto the player', () => {
  const { game } = createHarness();
  game.vehicle = { x: 192, z: -192, vx: 0, vz: 0, heading: 0 };
  const rival = { car: carVisual(), vehicle: { x: -192, z: 192, vx: 0, vz: 0, heading: 0 }, target: { x: -192, z: 192 }, replan: 0, stuck: 0, previousX: -192, previousZ: 192, pulse: new THREE.PointLight() };
  game.rivals = [rival];
  const originalPlayer = { ...game.vehicle };
  game.updateRivals(DT);
  assert.ok(Math.hypot(rival.vehicle.x - game.vehicle.x, rival.vehicle.z - game.vehicle.z) >= 52, 'Relocation must preserve a fair reaction distance');
  assert.deepEqual(game.vehicle, originalPlayer, 'Relocation must not collide with or displace the player');
});

test('Reaching the beacon rewards score and 15 seconds, then sends the player to the next beacon', () => {
  const { game, events } = createHarness();
  Object.assign(game.vehicle, { x: 0, z: -64 });
  Object.assign(game.stats, { seconds: 100, boost: 40 });
  game.update(DT);
  assert.equal(game.stats.deliveries, 1);
  assert.equal(game.stats.score, 1400, 'The first checkpoint must award its promised score');
  closeTo(game.stats.seconds, 115 - DT, 'Checkpoint adds 15 seconds after the frame clock advances');
  assert.ok(game.stats.boost >= 65, 'Completing an objective replenishes nitro');
  assert.deepEqual([game.checkpoint.position.x, game.checkpoint.position.z], [128, -64], 'The visible beacon must move to the next destination');
  assert.ok(events.sounds.includes('delivery'));
  game.update(DT);
  assert.equal(game.stats.deliveries, 1, 'Remaining at an old checkpoint must not repeatedly award completion');
  assert.equal(game.stats.score, 1400);

  const capped = createHarness().game;
  Object.assign(capped.vehicle, { x: 0, z: -64 });
  capped.stats.seconds = 205;
  capped.update(DT);
  assert.equal(capped.stats.seconds, 210, 'Checkpoint time bonuses must respect the 210-second cap');
});

test('Fuel, bodywork and nitro pickups replenish the right resource and cannot be farmed during cooldown', () => {
  for (const [kind, field, reward] of [['fuel', 'fuel', 36], ['repair', 'health', 32], ['nitro', 'boost', 50]]) {
    const { game } = createHarness();
    Object.assign(game.stats, { fuel: 20, health: 20, boost: 20 });
    const pickup = { group: new THREE.Group(), kind, x: game.vehicle.x, z: game.vehicle.z, cooldown: 0, phase: 0 };
    game.pickups = [pickup];
    game.updatePickups(DT);
    assert.equal(game.stats[field], 20 + reward, `${kind} must replenish ${field}`);
    for (const other of ['fuel', 'health', 'boost']) if (other !== field) assert.equal(game.stats[other], 20, `${kind} must not change ${other}`);
    assert.equal(game.stats.score, 150);
    assert.equal(pickup.group.visible, false);
    assert.ok(pickup.cooldown > 27);
    game.updatePickups(1);
    assert.equal(game.stats.score, 150, 'Overlapping a cooling pickup must not award points again');
    assert.equal(game.stats[field], 20 + reward);
    game.vehicle.x += 30;
    game.updatePickups(28);
    assert.equal(pickup.group.visible, true, 'A pickup must return after its cooldown');
    game.vehicle.x -= 30;
    game.stats[field] = 96;
    game.updatePickups(DT);
    assert.equal(game.stats[field], 100, 'A pickup must never overfill a resource');
    assert.equal(game.stats.score, 300, 'A respawned pickup can be collected again');
  }
});

test('Pause clears held controls and freezes the run across browser frames; resume advances it again', () => {
  const { game, events } = createHarness();
  game.setInput({ throttle: true, left: true, boost: true });
  game.accumulator = 0.05;
  game.pause();
  assert.equal(game.stats.phase, 'paused');
  assert.deepEqual(game.input, emptyInput(), 'Pausing must release held steering and pedals');
  assert.equal(events.suspensions, 1, 'A paused game must silence its engine');
  const frozen = { stats: { ...game.stats }, vehicle: { ...game.vehicle }, elapsed: game.elapsed };
  game.frame(1000);
  game.frame(61000);
  assert.deepEqual(game.stats, frozen.stats, 'The timer, resources and score must not change while paused');
  assert.deepEqual(game.vehicle, frozen.vehicle, 'A paused car must not continue moving');
  assert.equal(game.elapsed, frozen.elapsed);
  game.resume();
  game.setInput({ throttle: true });
  game.frame(62000);
  assert.equal(game.stats.seconds, frozen.stats.seconds, 'Resuming must not simulate the entire paused interval');
  game.frame(62100);
  assert.ok(game.stats.seconds < frozen.stats.seconds && game.vehicle.z > frozen.vehicle.z, 'Driving and the run clock must resume normally');
});

test('Restart preserves the best score, resets the run and pickups, and releases old rival resources once', async () => {
  const { game } = createHarness();
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshBasicMaterial();
  let geometryDisposals = 0, materialDisposals = 0;
  geometry.addEventListener('dispose', () => geometryDisposals++);
  material.addEventListener('dispose', () => materialDisposals++);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
  const pulse = new THREE.PointLight();
  game.scene.add(group, pulse);
  game.rivals = [{ car: carVisual(group), pulse }];
  const pickup = { group: new THREE.Group(), kind: 'fuel', x: 0, z: 0, cooldown: 12, phase: 0 };
  pickup.group.visible = false;
  game.pickups = [pickup];
  Object.assign(game.stats, { phase: 'over', best: 3200, score: 1700, fuel: 0, health: 0, boost: 0, seconds: 0, deliveries: 8, heat: 5, combo: 4, reason: 'CAR WRECKED' });
  Object.assign(game.vehicle, { x: 100, z: 120, vx: 30, vz: 4 });
  game.input = { ...emptyInput(), throttle: true, drift: true };
  game.elapsed = 80;
  game.targetIndex = 5;
  let obsoleteEndTimerRan = false;
  game.endSoundTimer = setTimeout(() => { obsoleteEndTimerRan = true; }, 5);
  game.restart();
  assert.equal(game.stats.phase, 'playing');
  assert.equal(game.stats.best, 3200, 'Restart must retain the personal best');
  assert.equal(game.stats.score, 0);
  assert.equal(game.stats.seconds, 150);
  assert.equal(game.stats.deliveries, 0);
  assert.equal(game.stats.reason, '');
  for (const field of ['fuel', 'health', 'boost']) assert.equal(game.stats[field], 100);
  assert.deepEqual(game.vehicle, initialVehicle());
  assert.deepEqual(game.input, emptyInput());
  assert.deepEqual([game.checkpoint.position.x, game.checkpoint.position.z], [0, -64]);
  assert.equal(pickup.cooldown, 0);
  assert.equal(pickup.group.visible, true);
  assert.equal(game.rivals.length, 0);
  assert.equal(group.parent, null);
  assert.equal(pulse.parent, null);
  assert.equal(geometryDisposals, 1, 'Shared rival geometry must be released exactly once');
  assert.equal(materialDisposals, 1, 'Shared rival material must be released exactly once');
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(obsoleteEndTimerRan, false, 'An old game-over timer must not silence the restarted run');
});

test('Wrecked, empty-fuel and expired-clock runs end with the right reason and persist a whole-number best', () => {
  for (const [field, reason] of [['health', 'CAR WRECKED'], ['fuel', 'OUT OF FUEL'], ['seconds', 'SHIFT COMPLETE']]) {
    const saved = new Map();
    globalThis.localStorage = { setItem: (key, value) => saved.set(key, value) };
    const { game, events } = createHarness();
    Object.assign(game.stats, { score: 1480.75, best: 1000, [field]: 0 });
    game.input.left = true;
    try {
      game.update(DT);
      assert.equal(game.stats.phase, 'over');
      assert.equal(game.stats.reason, reason);
      assert.equal(game.stats.best, 1480);
      assert.equal(saved.get(STORAGE_KEY), '1480', 'A new best must persist for the next visit');
      assert.deepEqual(game.input, emptyInput(), 'Ending a run must release held controls');
      assert.ok(events.sounds.includes('end'), 'A finished run plays its result cue before suspending audio');
      assert.equal(events.suspensions, 0);
      assert.equal(events.snapshots.at(-1).phase, 'over', 'The overlay must receive the final result immediately');
    } finally { clearEndTimer(game); }
  }
});

test('Finishing a lower-scoring run or denied browser storage preserves the available personal best', () => {
  const saved = new Map();
  globalThis.localStorage = { setItem: (key, value) => saved.set(key, value) };
  const { game } = createHarness();
  Object.assign(game.stats, { score: 800, best: 3200, seconds: 0 });
  try {
    game.update(DT);
    assert.equal(game.stats.best, 3200);
    assert.equal(saved.get(STORAGE_KEY), '3200', 'A low-scoring run must never overwrite a higher record');
  } finally { clearEndTimer(game); }

  globalThis.localStorage = { setItem() { throw new Error('Storage denied'); } };
  const denied = createHarness().game;
  Object.assign(denied.stats, { score: 2000.8, best: 1000, seconds: 0 });
  try {
    assert.doesNotThrow(() => denied.update(DT), 'Private browsing must not break game-over handling');
    assert.equal(denied.stats.phase, 'over');
    assert.equal(denied.stats.best, 2000, 'A best score remains available for this visit even without storage');
  } finally { clearEndTimer(denied); }
});

(async () => {
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: { setItem() {} } });
  let passed = 0, failed = 0;
  try {
    for (const { name, check } of tests) {
      try { await check(); passed++; console.log(`PASS ${name}`); }
      catch (error) { failed++; console.error(`FAIL ${name}\n  ${error.stack || error}`); }
    }
  } finally {
    if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor);
    else delete globalThis.localStorage;
  }
  console.log(`\nLast Exit game rules: ${passed} passed, ${failed} failed.`);
  if (failed) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
