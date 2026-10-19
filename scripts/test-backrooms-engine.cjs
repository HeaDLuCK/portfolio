#!/usr/bin/env node
'use strict';

// Execute production game rules without WebGL/audio. Only class arrow fields
// are promoted to prototype methods so the browser constructor can be bypassed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const THREE = require('three');
const sourceDirectory = path.resolve(__dirname, '../src/lib/backrooms');
const modules = new Map(), tests = [], harnesses = [];
const DT = 1 / 60;

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
  const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n'));
  const module = { exports: {} };
  modules.set(resolved, module);
  const localRequire = id => {
    if (path.basename(resolved) === 'engine.ts' && id === './world') {
      return { createHorrorWorld() { throw new Error('Browser constructor must not run'); }, createHollow() { throw new Error('Browser constructor must not run'); } };
    }
    if (!id.startsWith('.')) return require(id);
    const target = path.resolve(path.dirname(resolved), id + (path.extname(id) ? '' : '.ts'));
    assert.ok(target.startsWith(sourceDirectory + path.sep));
    return loadTypeScript(target);
  };
  new vm.Script(`(function(exports, require, module) {\n${result.outputText}\n})`, { filename: resolved })
    .runInThisContext()(module.exports, localRequire, module);
  return module.exports;
}

const { HorrorGame } = loadTypeScript(path.join(sourceDirectory, 'engine.ts'));
const { SPAWN_CELL, HOLLOW_START, FUSE_CELLS, EXIT_CELL, OPEN_CELLS, cellToWorld, visibleBetween } = loadTypeScript(path.join(sourceDirectory, 'level.ts'));
const at = cell => cellToWorld(cell.x, cell.z);
const emptyInput = () => ({ forward: false, backward: false, left: false, right: false, sprint: false });
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const closeTo = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-6, `${label}: ${actual} versus ${expected}`);

function createHarness() {
  const game = Object.create(HorrorGame.prototype);
  const events = { sounds: [], snapshots: [], suspensions: 0, renders: 0, unlocks: 0, disposals: 0 };
  const canvas = { removeEventListener() {}, remove() {} };
  Object.assign(game, {
    scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(),
    world: { root: new THREE.Group(), fixtures: [], fuseModels: FUSE_CELLS.map(() => new THREE.Group()), exitDoor: new THREE.Group(), dispose() {} },
    hollow: { group: new THREE.Group(), head: new THREE.Group(), arms: [], legs: [], eyes: [] },
    introFigure: new THREE.Group(), flashlight: new THREE.SpotLight(), lamps: [], hemisphere: new THREE.HemisphereLight(),
    renderer: { domElement: canvas, setAnimationLoop() {}, dispose() {}, forceContextLoss() {} }, resizeObserver: { disconnect() {} },
    audio: { unlock: async () => { events.unlocks++; }, play: kind => events.sounds.push(kind), update() {},
      suspend: () => { events.suspensions++; }, setMuted() {}, dispose: () => { events.disposals++; } },
    options: { onStats: stats => events.snapshots.push(stats), onError: message => assert.fail(message) },
    stats: { phase: 'playing', fuses: 0, totalFuses: 3, stamina: 100, battery: 100, flashlight: true,
      danger: 0, elapsed: 0, prompt: '', message: '', caption: '', introProgress: 1, locked: false, muted: false },
    input: emptyInput(), position: at(SPAWN_CELL), hollowPosition: at(HOLLOW_START), yaw: 0, pitch: 0,
    turnLeft: false, turnRight: false, previousTime: 0, accumulator: 0, lastStats: 0,
    elapsed: 0, introTime: 0, activeFuses: new Set(), hollowPath: [], pathTimer: 0, memory: 0,
    lastKnown: at(SPAWN_CELL), directorTime: 0, walkClock: 0, messageUntil: 0, captionUntil: 0,
    scareTime: 0, ambientTime: 12, hunt: false, introEvent: -1, pausePhase: 'playing',
    disposed: false, lowQuality: true, dragging: false, dragX: 0, dragY: 0, endTimer: null,
    quality: 'low', reducedMotion: true, slowFrames: 0,
    coop: null, roomSnapshot: null, coopRound: -1, poseClock: 0, worldClock: 0,
    roomWasPaused: false, monsterYaw: 0, teammates: new Map(),
  });
  // GPU rendering and pointer lock are separately verified in the browser.
  game.render = () => { events.renders++; };
  game.releaseControl = () => {};
  harnesses.push(game);
  return { game, events };
}
function clearTimer(game) { if (game.endTimer) clearTimeout(game.endTimer); game.endTimer = null; }
function test(name, check) { tests.push({ name, check }); }

test('Walking, sprinting and normalized diagonal controls match their advertised speeds', () => {
  const walk = createHarness().game, sprint = createHarness().game, diagonal = createHarness().game;
  const origin = at(SPAWN_CELL);
  walk.setInput({ forward: true });
  sprint.setInput({ forward: true, sprint: true });
  diagonal.setInput({ forward: true, right: true });
  for (let i = 0; i < 60; i++) { walk.update(DT); sprint.update(DT); diagonal.update(DT); }
  closeTo(distance(walk.position, origin), 2.45, 'Walking distance after one second');
  closeTo(distance(sprint.position, origin), 4.65, 'Sprinting distance after one second');
  closeTo(distance(diagonal.position, origin), 2.45, 'Diagonal movement must not be faster');
  assert.ok(walk.position.z < origin.z && diagonal.position.x > origin.x, 'Forward and right must use camera-relative axes');
  closeTo(sprint.stats.stamina, 78, 'Sprinting consumes stamina');
  sprint.setInput({ forward: false });
  sprint.update(DT);
  assert.ok(sprint.stats.stamina > 78, 'Standing still recovers stamina even while Shift remains held');
  for (const code of ['KeyW', 'ArrowUp']) assert.equal(walk.control(code), 'forward');
  for (const code of ['KeyS', 'ArrowDown']) assert.equal(walk.control(code), 'backward');
  assert.equal(walk.control('KeyA'), 'left'); assert.equal(walk.control('KeyD'), 'right');
  assert.equal(walk.control('ShiftRight'), 'sprint');
  const oldYaw = walk.yaw;
  walk.look(NaN, 0); walk.look(Infinity, 0);
  assert.equal(walk.yaw, oldYaw, 'Invalid pointer deltas are ignored');
  for (let i = 0; i < 10; i++) walk.look(10, -350);
  assert.equal(walk.pitch, 1.25, 'The camera cannot rotate upside down');
});

test('Pause releases held controls, freezes simulation and resumes without a time jump', () => {
  const { game, events } = createHarness();
  game.setInput({ forward: true, sprint: true }); game.turnLeft = true; game.dragging = true;
  game.pause();
  assert.equal(game.stats.phase, 'paused'); assert.deepEqual(game.input, emptyInput());
  assert.equal(game.turnLeft, false); assert.equal(game.dragging, false); assert.equal(events.suspensions, 1);
  const frozen = { stats: { ...game.stats }, position: { ...game.position }, hollow: { ...game.hollowPosition } };
  game.frame(1000); game.frame(61000); game.look(10, 10); game.interact();
  assert.deepEqual(game.stats, frozen.stats); assert.deepEqual(game.position, frozen.position); assert.deepEqual(game.hollowPosition, frozen.hollow);
  game.resume(); game.setInput({ forward: true }); game.frame(62000);
  assert.equal(game.elapsed, 0, 'Paused time must not be replayed');
  game.frame(62100);
  assert.ok(game.elapsed > 0 && game.elapsed <= 0.1 && game.position.z < frozen.position.z);
});

test('The intro keeps the run frozen, survives pause and can be skipped into a clean spawn', () => {
  const { game } = createHarness();
  game.start(); game.frame(1000); game.frame(1100);
  assert.equal(game.stats.phase, 'intro'); assert.equal(game.elapsed, 0);
  assert.equal(game.stats.battery, 100); assert.equal(game.stats.stamina, 100);
  assert.deepEqual(game.position, at(SPAWN_CELL));
  const introTime = game.introTime;
  game.pause(); game.frame(61000);
  assert.equal(game.introTime, introTime, 'Paused intro must remain at the same scene');
  game.resume(); assert.equal(game.stats.phase, 'intro');
  game.skipIntro();
  assert.equal(game.stats.phase, 'playing'); assert.equal(game.stats.introProgress, 1);
  assert.deepEqual(game.hollowPosition, at(HOLLOW_START)); assert.equal(game.introFigure.visible, false);
  assert.equal(game.stats.caption, '');
});

test('Three distinct E interactions restore circuits; an empty battery cannot block completion', () => {
  const { game, events } = createHarness();
  game.position = at(EXIT_CELL); game.interact();
  assert.equal(game.stats.phase, 'playing', 'The exit stays locked before restoring power');
  assert.match(game.stats.message, /No power/);
  game.stats.battery = 0; game.stats.flashlight = false;
  const first = at(FUSE_CELLS[0]);
  game.position = { x: first.x + 2.51, z: first.z }; game.interact();
  assert.equal(game.stats.fuses, 0, 'A distant circuit cannot be restored');
  for (let i = 0; i < 3; i++) {
    game.position = at(FUSE_CELLS[i]); game.interact();
    assert.equal(game.stats.fuses, i + 1); assert.equal(game.world.fuseModels[i].visible, false);
    const battery = game.stats.battery;
    game.interact();
    assert.equal(game.stats.fuses, i + 1, 'A restored circuit cannot count twice');
    assert.equal(game.stats.battery, battery, 'Repeated E cannot farm a circuit battery bonus');
  }
  assert.equal(game.stats.battery, 54);
  game.position = at(EXIT_CELL); game.interact();
  assert.equal(game.stats.phase, 'escaped'); assert.ok(events.sounds.includes('escape'));
  game.finish('caught');
  assert.equal(game.stats.phase, 'escaped', 'Late capture events cannot overwrite an escaped run');
  clearTimer(game);
});

test('Restart clears the old run and end timer while preserving the mute preference', async () => {
  const { game } = createHarness();
  game.stats.muted = true; game.stats.battery = 0; game.stats.stamina = 0; game.stats.fuses = 3;
  game.activeFuses = new Set([0, 1, 2]); game.world.fuseModels.forEach(model => { model.visible = false; });
  game.elapsed = 100; game.hunt = true; game.memory = 8; game.directorTime = 18; game.turnLeft = true;
  game.position = at(EXIT_CELL); game.input.forward = true;
  let obsoleteTimerRan = false;
  game.endTimer = setTimeout(() => { obsoleteTimerRan = true; }, 5);
  game.restart();
  assert.equal(game.stats.phase, 'playing'); assert.equal(game.stats.muted, true);
  assert.equal(game.stats.battery, 100); assert.equal(game.stats.stamina, 100); assert.equal(game.stats.fuses, 0);
  assert.equal(game.elapsed, 0); assert.equal(game.memory, 0); assert.equal(game.hunt, false);
  assert.equal(game.activeFuses.size, 0); assert.equal(game.hollowPath.length, 0);
  assert.deepEqual(game.position, at(SPAWN_CELL)); assert.deepEqual(game.hollowPosition, at(HOLLOW_START));
  assert.deepEqual(game.input, emptyInput()); assert.equal(game.turnLeft, false);
  assert.ok(game.world.fuseModels.every(model => model.visible));
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(obsoleteTimerRan, false, 'A prior result must not later silence a restarted run');
});

test('The Hollow can hear running around a corner but loses a hidden target after nine seconds', () => {
  const { game } = createHarness();
  game.position = at({ x: 4, z: 10 }); game.hollowPosition = at({ x: 9, z: 13 }); game.elapsed = 10;
  assert.equal(visibleBetween(game.position.x, game.position.z, game.hollowPosition.x, game.hollowPosition.z), false);
  game.updateHollow(DT, true, false);
  assert.equal(game.hunt, false, 'Distant quiet walking behind walls should not reveal the player');
  game.updateHollow(DT, true, true);
  assert.equal(game.hunt, true); assert.equal(game.memory, 9); assert.deepEqual(game.lastKnown, game.position);
  game.position = at({ x: 7, z: 3 }); game.hollowPosition = at({ x: 19, z: 21 });
  game.pathTimer = 999; game.hollowPath = []; game.directorTime = 0;
  for (let i = 0; i < 8 * 60; i++) game.updateHollow(DT, false, false);
  assert.equal(game.hunt, true, 'The monster should remember a target for more than eight seconds');
  for (let i = 0; i < 61; i++) game.updateHollow(DT, false, false);
  assert.equal(game.hunt, false); assert.equal(game.memory, 0);
});

test('Hunt speed escalates fairly below sprint speed, and capture respects its grace period', () => {
  for (const fuses of [0, 3]) {
    const { game } = createHarness();
    game.position = at({ x: 4, z: 3 }); game.hollowPosition = at({ x: 4, z: 6 }); game.stats.fuses = fuses; game.elapsed = 10;
    const before = { ...game.hollowPosition };
    for (let i = 0; i < 60; i++) game.updateHollow(DT, false, false);
    const speed = distance(before, game.hollowPosition);
    closeTo(speed, 3.12 + fuses * 0.14, 'Pursuit speed');
    assert.ok(speed > 2.45 && speed < 4.65, 'Sprint must provide an escape advantage');
  }
  const { game, events } = createHarness();
  game.hollowPosition = { x: game.position.x + 0.5, z: game.position.z }; game.elapsed = 4;
  game.updateHollow(0, false, false); assert.equal(game.stats.phase, 'playing');
  game.elapsed = 6; game.updateHollow(0, false, false);
  assert.equal(game.stats.phase, 'caught'); assert.equal(game.stats.danger, 1);
  assert.ok(events.sounds.includes('caught')); assert.deepEqual(game.input, emptyInput());
  game.finish('escaped'); assert.equal(game.stats.phase, 'caught', 'A completed result is final');
  clearTimer(game);
});

test('Director relocation stays behind walls, behind the player and 19–32 metres away', () => {
  const { game } = createHarness();
  let relocations = 0;
  for (let cellIndex = 0; cellIndex < OPEN_CELLS.length; cellIndex += 3) for (let heading = 0; heading < 8; heading++) {
    game.position = at(OPEN_CELLS[cellIndex]); game.yaw = heading * Math.PI / 4;
    game.hollowPosition = { x: 10000, z: 10000 };
    game.repositionHollow();
    if (game.hollowPosition.x === 10000) continue; // No legal candidate means no teleport.
    const dx = game.hollowPosition.x - game.position.x, dz = game.hollowPosition.z - game.position.z;
    const d = Math.hypot(dx, dz);
    assert.ok(d >= 19 && d <= 32, `Unfair relocation distance ${d}`);
    assert.ok((-Math.sin(game.yaw) * dx - Math.cos(game.yaw) * dz) / d < -0.35, 'Monster cannot appear in front of the camera');
    assert.equal(visibleBetween(game.position.x, game.position.z, game.hollowPosition.x, game.hollowPosition.z), false, 'Monster cannot materialize in direct sight');
    relocations++;
  }
  assert.ok(relocations > 100, 'Exercise relocation throughout the district');
  console.log(`  Checked ${relocations} safe relocations across the district and eight camera headings.`);
});

function roomSnapshot(you = 'host') {
  const spawn = at(SPAWN_CELL);
  return { type: 'state', you, host: 'host', players: ['host', 'guest'].map((id, i) => ({
    id, label: `Explorer ${i + 1}`, color: 0xc5d2b8, x: spawn.x + i * .5, z: spawn.z,
    yaw: 0, moving: false, sprinting: false, flashlight: true, alive: true, escaped: false, paused: false,
  })), run: { round: 1, status: 'playing', elapsed: 0, fuses: [], monster: { ...at(HOLLOW_START), yaw: 0, hunt: false }, captured: [], escaped: [] } };
}
test('Co-op rounds create teammates, synchronize circuits, delegate E, and reset for everyone', () => {
  const { game, events } = createHarness(), sent = [];
  game.configureCoop({ send: packet => sent.push(packet) });
  const snapshot = roomSnapshot();
  game.applyRoomSnapshot(snapshot);
  assert.equal(game.stats.phase, 'playing'); assert.equal(game.teammates.size, 1);
  assert.equal(game.introFigure.visible, false);
  game.interact(); assert.equal(sent.at(-1).type, 'interact'); assert.equal(game.stats.fuses, 0);
  snapshot.run.fuses = [1]; game.applyRoomSnapshot(snapshot);
  assert.equal(game.stats.fuses, 1); assert.equal(game.world.fuseModels[1].visible, false);
  assert.ok(events.sounds.includes('fuse'));
  game.restart(); assert.equal(sent.at(-1).type, 'restart'); assert.equal(game.stats.fuses, 1);
  snapshot.run.round++; snapshot.run.fuses = []; game.applyRoomSnapshot(snapshot);
  assert.equal(game.stats.fuses, 0); assert.equal(game.world.fuseModels[1].visible, true);
  snapshot.players = snapshot.players.filter(p => p.id === 'host'); game.applyRoomSnapshot(snapshot);
  assert.equal(game.teammates.size, 0);
});
test('Host pause freezes guest simulation and unpausing restores its audio', () => {
  const { game, events } = createHarness();
  game.configureCoop({ send() {} });
  const snapshot = roomSnapshot('guest'); snapshot.players[0].paused = true;
  game.applyRoomSnapshot(snapshot); game.setInput({ forward: true });
  const position = { ...game.position }, unlocks = events.unlocks;
  game.frame(1000); game.frame(1100);
  assert.deepEqual(game.position, position); assert.equal(game.elapsed, 0);
  assert.ok(events.suspensions > 0);
  snapshot.players[0].paused = false; game.applyRoomSnapshot(snapshot); game.frame(1200);
  assert.ok(game.elapsed > 0); assert.ok(events.unlocks > unlocks);
});
test('A paused guest can be caught and still receives the team escape result', () => {
  const { game } = createHarness(); game.configureCoop({ send() {} });
  const snapshot = roomSnapshot('guest'); game.applyRoomSnapshot(snapshot); game.pause();
  snapshot.players[1].alive = false; snapshot.run.captured = ['guest']; game.applyRoomSnapshot(snapshot);
  assert.equal(game.stats.phase, 'caught');
  snapshot.run.status = 'escaped'; snapshot.players[0].escaped = true; game.applyRoomSnapshot(snapshot);
  assert.equal(game.stats.phase, 'escaped');
});
test('A captured host keeps the creature simulation running for surviving teammates', () => {
  const { game } = createHarness(), sent = []; game.configureCoop({ send: packet => sent.push(packet) });
  const snapshot = roomSnapshot(); game.applyRoomSnapshot(snapshot);
  game.elapsed = 6; snapshot.run.elapsed = 6; snapshot.players[0].alive = false; snapshot.run.captured = ['host'];
  game.applyRoomSnapshot(snapshot); assert.equal(game.stats.phase, 'caught');
  game.frame(1000); game.frame(1100); game.frame(1200);
  assert.ok(game.elapsed > 6);
  assert.ok(sent.some(p => p.type === 'world' && Number.isFinite(p.monster.yaw)));
  assert.equal(game.stats.phase, 'caught');
});

test('Disposal is idempotent and stopped engines cannot start, resume or accept movement', () => {
  const { game, events } = createHarness();
  game.dispose(); game.dispose();
  assert.equal(events.disposals, 1, 'Audio resources must be released once');
  game.start(); game.restart(); game.resume(); game.setInput({ forward: true });
  assert.equal(game.disposed, true); assert.deepEqual(game.input, emptyInput());
  assert.equal(events.unlocks, 0, 'Disposed games cannot reopen audio');
});

(async () => {
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = { removeEventListener() {} };
  globalThis.document = { removeEventListener() {} };
  let passed = 0, failed = 0;
  try {
    for (const { name, check } of tests) {
      try { await check(); passed++; console.log(`PASS ${name}`); }
      catch (error) { failed++; console.error(`FAIL ${name}\n  ${error.stack || error}`); }
    }
  } finally {
    harnesses.forEach(clearTimer);
    if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow;
    if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument;
  }
  console.log(`\nBackrooms game rules: ${passed} passed, ${failed} failed.`);
  if (failed) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
