#!/usr/bin/env node
'use strict';

// Run with node scripts/test-backrooms.cjs. Execute the real production level
// helpers in memory; no browser, generated files, or duplicate movement code.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const gameDirectory = path.resolve(__dirname, '../src/lib/backrooms');
const modules = new Map();
function loadTypeScript(filename) {
  const resolved = path.resolve(filename);
  if (modules.has(resolved)) return modules.get(resolved).exports;
  const result = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
    fileName: resolved,
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n'));
  const module = { exports: {} };
  modules.set(resolved, module);
  const localRequire = id => {
    if (!id.startsWith('.')) return require(id);
    const target = path.resolve(path.dirname(resolved), id + (path.extname(id) ? '' : '.ts'));
    assert.ok(target.startsWith(gameDirectory + path.sep), 'Test imports stay within Backrooms source');
    return loadTypeScript(target);
  };
  const execute = new vm.Script(`(function(exports, require, module) {\n${result.outputText}\n})`, { filename: resolved }).runInThisContext();
  execute(module.exports, localRequire, module);
  return module.exports;
}

const {
  GRID, OPEN_CELLS, WALLS, SPAWN_CELL, EXIT_CELL, FUSE_CELLS, HOLLOW_START,
  cellToWorld, worldToCell, isOpen, findPath, visibleBetween, moveCharacter,
} = loadTypeScript(path.join(gameDirectory, 'level.ts'));
const { CELL_SIZE } = loadTypeScript(path.join(gameDirectory, 'types.ts'));
const RADIUS = 0.28;
const key = cell => `${cell.x},${cell.z}`;
const world = cell => cellToWorld(cell.x, cell.z);
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
let passed = 0, failed = 0;
function test(name, check) {
  try { check(); passed++; console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}\n  ${error.stack || error}`); }
}

function assertLegal(position, label = 'Character') {
  assert.ok(Number.isFinite(position.x) && Number.isFinite(position.z), `${label} has non-finite coordinates`);
  const cell = worldToCell(position.x, position.z);
  assert.ok(isOpen(cell.x, cell.z), `${label} left the walkable map at ${key(cell)}`);
  for (const wall of WALLS) {
    const dx = Math.max(Math.abs(position.x - wall.x) - wall.halfX, 0);
    const dz = Math.max(Math.abs(position.z - wall.z) - wall.halfZ, 0);
    assert.ok(dx * dx + dz * dz >= (RADIUS - 1e-7) ** 2, `${label} penetrated a wall at ${wall.x},${wall.z}`);
  }
}

test('Spawn, three fuses, The Hollow and exit occupy a single reachable district', () => {
  assert.equal(FUSE_CELLS.length, 3, 'The objective requires exactly three fuses');
  assert.equal(new Set(FUSE_CELLS.map(key)).size, 3, 'Fuse locations must be distinct');
  // Independent flood fill establishes topology before testing findPath itself.
  const reached = new Set([key(SPAWN_CELL)]), queue = [SPAWN_CELL];
  for (let index = 0; index < queue.length; index++) {
    const cell = queue[index];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { x: cell.x + dx, z: cell.z + dz };
      if (isOpen(next.x, next.z) && !reached.has(key(next))) {
        reached.add(key(next));
        queue.push(next);
      }
    }
  }
  for (const target of [...FUSE_CELLS, EXIT_CELL, HOLLOW_START]) {
    assert.ok(reached.has(key(target)), `Unreachable objective or pursuit spawn: ${key(target)}`);
    assertLegal(world(target));
  }
  assert.equal(reached.size, OPEN_CELLS.length, 'No isolated walkable pockets should strand the player or monster');
});

test('Cell/world conversion round-trips every walkable tile and rejects the map exterior', () => {
  for (const cell of OPEN_CELLS) {
    assert.deepEqual(worldToCell(...Object.values(world(cell))), cell);
  }
  assert.equal(isOpen(-1, 0), false);
  assert.equal(isOpen(GRID[0].length, GRID.length), false);
  assert.equal(visibleBetween(-10000, 0, -9999, 0), false);
});

test('Pursuit paths connect objectives with adjacent passable steps and never cut walls', () => {
  const targets = [SPAWN_CELL, ...FUSE_CELLS, EXIT_CELL, HOLLOW_START];
  for (const from of targets) for (const to of targets) {
    const route = findPath(from, to);
    if (key(from) === key(to)) { assert.equal(route.length, 0); continue; }
    assert.ok(route.length > 0, `No route from ${key(from)} to ${key(to)}`);
    assert.deepEqual(route[route.length - 1], to, 'Path must finish at its requested target');
    let previous = from;
    const seen = new Set([key(from)]);
    for (const cell of route) {
      assert.ok(isOpen(cell.x, cell.z), `Path enters solid tile ${key(cell)}`);
      assert.equal(Math.abs(cell.x - previous.x) + Math.abs(cell.z - previous.z), 1, 'Each path step must share an edge');
      assert.ok(!seen.has(key(cell)), 'A pursuit path should not loop');
      assert.equal(visibleBetween(...Object.values(world(previous)), ...Object.values(world(cell))), true);
      seen.add(key(cell));
      previous = cell;
    }
  }
  assert.deepEqual(findPath({ x: -1, z: 0 }, EXIT_CELL), []);
  assert.deepEqual(findPath(SPAWN_CELL, { x: 12, z: 11 }), []);
});

test('Visibility distinguishes a clear room, blocking pillar and a connected corridor around a corner', () => {
  const sight = (from, to) => visibleBetween(...Object.values(world(from)), ...Object.values(world(to)));
  assert.equal(sight({ x: 10, z: 10 }, { x: 17, z: 10 }), true, 'An unobstructed room must remain visible');
  assert.equal(sight({ x: 11, z: 11 }, { x: 13, z: 11 }), false, 'A solid pillar must block sight');
  assert.equal(sight({ x: 11, z: 10 }, { x: 13, z: 12 }), false, 'Diagonal sight through a pillar must be blocked');
  const beforeCorner = { x: 4, z: 10 }, afterCorner = { x: 9, z: 13 };
  assert.ok(findPath(beforeCorner, afterCorner).length > 0, 'The corridor must actually be connected');
  assert.equal(sight(beforeCorner, afterCorner), false, 'The Hollow cannot see around the corridor corner');
  assert.equal(sight(afterCorner, beforeCorner), false, 'Wall visibility must be symmetric');
  assert.equal(sight(SPAWN_CELL, SPAWN_CELL), true);
  assert.equal(sight({ x: 12, z: 11 }, { x: 12, z: 11 }), false);
});

test('Large swept moves cannot cross a wall even when their destination is open', () => {
  const pillar = world({ x: 12, z: 11 });
  for (const [from, axis, sign] of [
    [{ x: 11, z: 11 }, 'x', 1], [{ x: 13, z: 11 }, 'x', -1],
    [{ x: 12, z: 10 }, 'z', 1], [{ x: 12, z: 12 }, 'z', -1],
  ]) {
    const position = world(from);
    moveCharacter(position, axis === 'x' ? sign * CELL_SIZE * 2 : 0, axis === 'z' ? sign * CELL_SIZE * 2 : 0);
    assertLegal(position);
    assert.ok((position[axis] - pillar[axis]) * sign <= -CELL_SIZE / 2 - RADIUS + 1e-7,
      'A swept move must remain on its starting side of a solid pillar');
  }
});

test('Wall contacts preserve sliding and diagonal corner approaches stay outside solids', () => {
  const position = world({ x: 11, z: 11 }), start = { ...position };
  moveCharacter(position, CELL_SIZE * 1.5, 0.6);
  assertLegal(position);
  assert.ok(Math.abs(position.z - start.z - 0.6) < 1e-6, 'Wall contact should preserve tangential movement');
  assert.ok(position.x - start.x > 0.5 && position.x - start.x < CELL_SIZE / 2, 'Movement must approach and stop at the wall');
  for (const from of [{ x: 11, z: 10 }, { x: 13, z: 10 }, { x: 11, z: 12 }, { x: 13, z: 12 }]) {
    const corner = world(from), target = world({ x: 12, z: 11 });
    moveCharacter(corner, target.x - corner.x, target.z - corner.z);
    assertLegal(corner, 'Diagonal corner approach');
  }
});

test('All four outside boundaries contain even very large movement requests', () => {
  for (const axis of ['x', 'z']) for (const sign of [-1, 1]) {
    const extreme = OPEN_CELLS.reduce((best, cell) => cell[axis] * sign > best[axis] * sign ? cell : best);
    const position = world(extreme), start = { ...position };
    moveCharacter(position, axis === 'x' ? sign * 500 : 0, axis === 'z' ? sign * 500 : 0);
    assertLegal(position, `${axis} ${sign} boundary`);
    assert.ok((position[axis] - start[axis]) * sign < CELL_SIZE / 2,
      'A boundary must stop movement before the next cell');
  }
});

test('Ten simulated minutes of varied walking and sprinting remain finite and legal', () => {
  let seed = 0xe7a104;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const position = world(SPAWN_CELL), visited = new Set([key(SPAWN_CELL)]);
  let elapsed = 0, changeAt = 0, heading = 0, speed = 0, travelled = 0, contacts = 0, frames = 0;
  while (elapsed < 600) {
    const dt = Math.min(600 - elapsed, frames % 97 === 0 ? 0.2 : 1 / 60);
    if (elapsed >= changeAt) {
      heading = random() * Math.PI * 2;
      speed = random() > 0.3 ? 2.3 : 4.5;
      changeAt = elapsed + 0.35 + random() * 1.4;
    }
    const before = { ...position };
    moveCharacter(position, Math.sin(heading) * speed * dt, Math.cos(heading) * speed * dt);
    const moved = distance(before, position);
    travelled += moved;
    if (moved < speed * dt - 1e-5) contacts++;
    assertLegal(position, `Frame ${frames}`);
    visited.add(key(worldToCell(position.x, position.z)));
    elapsed += dt;
    frames++;
  }
  assert.ok(travelled > 500, 'The simulation must cover meaningful walking distance');
  assert.ok(contacts > 100, 'The simulation must exercise repeated wall contacts');
  assert.ok(visited.size > 15, 'The simulation must visit multiple rooms and corridors');
  console.log(`  Simulated 600 s, ${Math.round(travelled)} m, ${visited.size} cells and ${contacts} wall-contact frames.`);
});

test('A radius-bearing player can physically collect every fuse then reach the exit', () => {
  const position = world(SPAWN_CELL);
  let collected = 0, walked = 0;
  for (const target of [...FUSE_CELLS, EXIT_CELL]) {
    const route = findPath(worldToCell(position.x, position.z), target);
    assert.ok(route.length > 0, 'Each objective must have a route from the previous one');
    for (const waypoint of route) {
      const destination = world(waypoint);
      let frames = 0;
      while (distance(position, destination) > 1e-5 && frames++ < 300) {
        const remaining = distance(position, destination);
        const amount = Math.min(remaining, 3.5 / 60);
        const before = { ...position };
        moveCharacter(position, (destination.x - position.x) / remaining * amount, (destination.z - position.z) / remaining * amount);
        walked += distance(before, position);
        assertLegal(position, 'Objective traversal');
      }
      assert.ok(distance(position, destination) < 1e-5, `Character became stuck before ${key(waypoint)}`);
    }
    assert.ok(distance(position, world(target)) < 1e-5, 'Character must actually arrive at the objective');
    if (FUSE_CELLS.includes(target)) collected++;
  }
  assert.equal(collected, 3);
  assert.deepEqual(worldToCell(position.x, position.z), EXIT_CELL);
  assert.ok(walked > 100, 'The full route should cover a substantial district');
});

console.log(`\nBackrooms level: ${passed} passed, ${failed} failed.`);
if (failed) process.exitCode = 1;
