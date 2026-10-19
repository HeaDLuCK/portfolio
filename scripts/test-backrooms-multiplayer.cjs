#!/usr/bin/env node
'use strict';

// Protocol regression checks against the production room core. A deterministic
// wall clock exercises rate/movement budgets without sockets or sleep calls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const directory = path.resolve(__dirname, '../src/lib/backrooms');
const modules = new Map(), tests = [], rooms = [];
let now = 100000;
const originalNow = Date.now;

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
    assert.ok(target.startsWith(directory + path.sep), 'Tests only load production Backrooms source');
    return loadTypeScript(target);
  };
  new vm.Script(`(function(exports, require, module) {\n${result.outputText}\n})`, { filename: resolved })
    .runInThisContext()(module.exports, localRequire, module);
  return module.exports;
}

const { HollowRoom } = loadTypeScript(path.join(directory, 'room.ts'));
const { SPAWN_CELL, EXIT_CELL, FUSE_CELLS, findPath, cellToWorld, worldToCell, visibleBetween } = loadTypeScript(path.join(directory, 'level.ts'));
const { ROOM_CAPACITY } = loadTypeScript(path.join(directory, 'multiplayer-types.ts'));
const { CELL_SIZE } = loadTypeScript(path.join(directory, 'types.ts'));
const world = cell => cellToWorld(cell.x, cell.z);
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function test(name, check) { tests.push({ name, check }); }

function party(count = 2) {
  now += 10000;
  const room = new HollowRoom('123456789012345678901234');
  rooms.push(room);
  const ids = Array.from({ length: count }, (_, index) => String(index + 1).padStart(24, '0'));
  const inboxes = new Map();
  const connect = id => {
    const inbox = [];
    inboxes.set(id, inbox);
    return room.connect(id, packet => inbox.push(JSON.parse(JSON.stringify(packet))));
  };
  ids.forEach(id => assert.equal(connect(id), true, 'Anonymous player should connect'));
  const state = (id = ids[0]) => {
    const snapshot = inboxes.get(id).filter(packet => packet.type === 'state').at(-1);
    assert.ok(snapshot, 'Connected clients must receive a room snapshot');
    return snapshot;
  };
  const send = (id, packet) => room.receive(id, JSON.stringify(packet));
  let startedAt = now;
  const start = () => { send(ids[0], { type: 'start' }); startedAt = now; };
  const pose = (id, values = {}, paused = false) => {
    const current = state(id).players.find(player => player.id === id);
    send(id, { type: 'pose', pose: { x: current.x, z: current.z, yaw: 0, moving: false, sprinting: false, flashlight: true, ...values }, paused });
  };
  const hostWorld = (monster, captured = []) => send(ids[0], {
    type: 'world', elapsed: (now - startedAt) / 1000,
    monster: { ...state().run.monster, ...monster }, captured,
  });
  const walkTo = (id, target) => {
    let player = state(id).players.find(value => value.id === id);
    const route = findPath(worldToCell(player.x, player.z), target);
    if (!route.length) assert.ok(distance(player, world(target)) < 0.05, 'A required test destination must be reachable');
    for (const cell of route) {
      const destination = world(cell);
      let frames = 0;
      while (distance(player, destination) > 0.01 && frames++ < 100) {
        const remaining = distance(player, destination), amount = Math.min(0.4, remaining);
        now += 100;
        pose(id, { x: player.x + (destination.x - player.x) / remaining * amount,
          z: player.z + (destination.z - player.z) / remaining * amount, moving: true, sprinting: true });
        const next = state(id).players.find(value => value.id === id);
        assert.ok(distance(next, player) > 0.001, 'Legitimate movement must not stall under validation');
        player = next;
      }
      assert.ok(distance(player, destination) < 0.02, 'Legitimate movement must reach each corridor waypoint');
    }
    return player;
  };
  return { room, ids, inboxes, connect, state, send, start, pose, hostWorld, walkTo };
}

test('Completed recordings reject late joins until the host restarts', () => {
  const p = party(1); p.start(); now += 6000;
  const host = p.state().players[0];
  p.hostWorld({ x: host.x, z: host.z }, p.ids);
  assert.equal(p.state().run.status, 'lost');
  assert.equal(p.connect('late-guest'), false);
  assert.equal(p.inboxes.get('late-guest').at(-1).code, 'run-ended');
  p.send(p.ids[0], { type: 'restart' });
  assert.equal(p.connect('late-guest'), true);
  assert.equal(p.state('late-guest').run.status, 'playing');
});

test('Two to four anonymous clients share a consistent roster and a single host', () => {
  for (const count of [2, 3, 4]) {
    const p = party(count);
    for (const id of p.ids) {
      const snapshot = p.state(id);
      assert.equal(snapshot.you, id); assert.equal(snapshot.host, p.ids[0]);
      assert.equal(snapshot.players.length, count); assert.equal(snapshot.run.status, 'lobby');
      assert.deepEqual(snapshot.players.map(player => player.id), p.ids);
      for (const player of snapshot.players) {
        assert.ok(player.label && typeof player.label === 'string', 'The server supplies an anonymous label');
        assert.equal(player.alive, true); assert.equal(player.escaped, false);
        assert.ok(!('ip' in player) && !('email' in player) && !('username' in player), 'Room snapshots need no personal identifiers');
      }
    }
    const excess = '999999999999999999999999';
    const duplicatePackets = [];
    assert.equal(p.room.connect(p.ids[0], packet => duplicatePackets.push(packet)), false);
    assert.ok(duplicatePackets.some(packet => packet.code === 'duplicate-player'));
    const invalidPackets = [];
    assert.equal(p.room.connect('invalid id / personal name', packet => invalidPackets.push(packet)), false);
    assert.ok(invalidPackets.some(packet => packet.code === 'invalid-id'));
    if (count === ROOM_CAPACITY) {
      assert.equal(p.connect(excess), false, 'A room must not exceed its four-player capacity');
      assert.ok(p.inboxes.get(excess).some(packet => packet.type === 'error' && packet.code === 'room-full'));
      assert.equal(p.state().players.length, ROOM_CAPACITY);
    }
  }
});

test('Only the host can start, restart or publish the shared monster state', () => {
  const p = party(3), host = p.ids[0], guest = p.ids[1];
  p.send(guest, { type: 'start' });
  assert.equal(p.state().run.status, 'lobby');
  assert.ok(p.inboxes.get(guest).some(packet => packet.code === 'host-only'));
  p.start(); assert.equal(p.state().run.status, 'playing');
  now += 1000; p.hostWorld({ hunt: true });
  const authorized = p.state().run;
  p.send(guest, { type: 'world', elapsed: 1, monster: { ...authorized.monster, x: 0, z: 0 }, captured: [host] });
  assert.deepEqual(p.state().run, authorized, 'A guest cannot forge world or capture snapshots');
  p.send(guest, { type: 'restart' });
  assert.equal(p.state().run.round, authorized.round, 'A guest cannot reset the team run');
});

test('Shared circuits require a nearby E interaction and can each be restored only once', () => {
  const p = party(); p.start();
  p.send(p.ids[1], { type: 'interact' });
  assert.equal(p.state().run.fuses.length, 0, 'A distant E cannot collect a circuit');
  for (let i = 0; i < FUSE_CELLS.length; i++) {
    const id = p.ids[i % p.ids.length];
    p.walkTo(id, FUSE_CELLS[i]); p.send(id, { type: 'interact' });
    assert.deepEqual([...p.state().run.fuses].sort(), Array.from({ length: i + 1 }, (_, index) => index));
    for (const teammate of p.ids) assert.equal(p.state(teammate).run.fuses.length, i + 1, 'All teammates share the circuit count');
    p.send(id, { type: 'interact' });
    assert.equal(p.state().run.fuses.length, i + 1, 'Repeating E cannot duplicate a shared pickup');
  }
});

test('Teammate poses and paused state synchronize while teleporting and walls are rejected', () => {
  const p = party(); p.start(); const guest = p.ids[1];
  const before = p.state(guest).players.find(player => player.id === guest);
  now += 100; p.pose(guest, { z: before.z - 0.35, moving: true, yaw: 0.4 });
  let player = p.state().players.find(value => value.id === guest);
  assert.ok(player.z < before.z); assert.equal(player.yaw, 0.4); assert.equal(player.moving, true);
  p.pose(guest, {}, true);
  assert.equal(p.state().players.find(value => value.id === guest).paused, true);
  const pausedPosition = { ...p.state().players.find(value => value.id === guest) };
  now += 100; p.pose(guest, { z: pausedPosition.z - 0.3 }, true);
  assert.equal(p.state().players.find(value => value.id === guest).z, pausedPosition.z, 'Paused players must remain still');
  p.pose(guest, {}, false);
  assert.equal(p.state().players.find(value => value.id === guest).paused, false);
  player = p.state().players.find(value => value.id === guest);
  const distant = world(FUSE_CELLS[0]);
  p.pose(guest, { x: distant.x, z: distant.z });
  const after = p.state().players.find(value => value.id === guest);
  assert.ok(distance(after, player) < 2.6, 'A legal coordinate cannot bypass the movement budget');
});

test('Host capture claims need actual proximity and line of sight; all captured teammates lose', () => {
  const p = party(); p.start();
  now += 6000;
  p.hostWorld({}, [p.ids[1]]);
  assert.equal(p.state().run.captured.length, 0, 'A remote monster cannot capture a teammate');
  // Two valid open positions less than 1.6m apart, separated by a pillar corner.
  // Close Euclidean distance alone must not let the monster kill through walls.
  p.walkTo(p.ids[1], { x: 11, z: 10 });
  const pillar = world({ x: 12, z: 11 });
  const hidden = { x: pillar.x - CELL_SIZE / 2 - 0.3, z: pillar.z - CELL_SIZE / 2 + 0.4 };
  let guest = p.state().players.find(player => player.id === p.ids[1]);
  for (let step = 0; distance(guest, hidden) > 0.01 && step < 100; step++) {
    const d = distance(guest, hidden), amount = Math.min(0.3, d);
    now += 100;
    p.pose(p.ids[1], { x: guest.x + (hidden.x - guest.x) / d * amount, z: guest.z + (hidden.z - guest.z) / d * amount });
    guest = p.state().players.find(player => player.id === p.ids[1]);
  }
  assert.ok(distance(guest, hidden) < 0.02);
  const blockedMonster = { x: pillar.x - CELL_SIZE / 2 + 0.4, z: pillar.z - CELL_SIZE / 2 - 0.3 };
  assert.ok(distance(guest, blockedMonster) < 1.6);
  assert.equal(visibleBetween(guest.x, guest.z, blockedMonster.x, blockedMonster.z), false);
  p.hostWorld({ ...blockedMonster, hunt: true }, [p.ids[1]]);
  assert.equal(p.state().run.captured.length, 0, 'A pillar corner prevents a close capture');
  p.hostWorld({ x: guest.x, z: guest.z, hunt: true }, [p.ids[1]]);
  assert.ok(p.state().run.captured.includes(p.ids[1]));
  const spawn = world(SPAWN_CELL);
  assert.equal(p.state().players.find(player => player.id === p.ids[1]).alive, false);
  assert.equal(p.state().run.status, 'playing', 'A surviving teammate can continue the run');
  p.hostWorld({ ...spawn, yaw: 0, hunt: true }, p.ids);
  assert.equal(p.state().run.status, 'lost');
  assert.ok(p.ids.every(id => p.state().run.captured.includes(id)));
  assert.equal(visibleBetween(spawn.x, spawn.z, spawn.x, spawn.z), true, 'The capture case must actually have an unobstructed view');
});

test('The exit stays locked without circuits and a powered team can escape', () => {
  const p = party(); p.start();
  p.walkTo(p.ids[0], EXIT_CELL); p.send(p.ids[0], { type: 'interact' });
  assert.equal(p.state().run.status, 'playing'); assert.equal(p.state().run.escaped.length, 0);
  for (const cell of FUSE_CELLS) { p.walkTo(p.ids[0], cell); p.send(p.ids[0], { type: 'interact' }); }
  p.walkTo(p.ids[0], EXIT_CELL); p.send(p.ids[0], { type: 'interact' });
  assert.equal(p.state().run.status, 'escaped');
  assert.ok(p.state().run.escaped.length > 0, 'The winning snapshot records the escaping teammate');
});

test('Malformed, oversized, nonfinite and rate-limited packets cannot corrupt the room', () => {
  const p = party(); p.start(); const guest = p.ids[1];
  const original = JSON.stringify(p.state().run);
  const invalid = ['{', 'null', '[]', JSON.stringify({ type: 'unexpected' }), JSON.stringify({ type: 'pose', pose: { x: null, z: 1, yaw: 0, moving: false, sprinting: false, flashlight: true } }),
    JSON.stringify({ type: 'pose', pose: { x: 1e200, z: 1e200, yaw: 1e200, moving: true, sprinting: true, flashlight: true } }), ' '.repeat(50000)];
  for (const data of invalid) { now += 200; assert.doesNotThrow(() => p.room.receive(guest, data)); }
  assert.equal(JSON.stringify(p.state().run), original, 'Invalid traffic must preserve the shared game state');
  for (let i = 0; i < 200; i++) p.send(guest, { type: 'ping' });
  assert.ok(p.inboxes.get(guest).some(packet => packet.code === 'rate-limit'), 'Flooding must be rate-limited');
  assert.equal(p.state().run.status, 'playing');
  assert.ok(p.state().players.every(player => Number.isFinite(player.x) && Number.isFinite(player.z) && Number.isFinite(player.yaw)));
});

test('Host restart clears team objectives and losses; guest disconnect cleans the roster', () => {
  const p = party(3); p.start();
  p.walkTo(p.ids[1], FUSE_CELLS[0]); p.send(p.ids[1], { type: 'interact' });
  now += 1000; p.hostWorld(world(SPAWN_CELL), [p.ids[2]]);
  const round = p.state().run.round;
  p.send(p.ids[0], { type: 'restart' });
  const reset = p.state();
  assert.ok(reset.run.round > round); assert.equal(reset.run.status, 'playing');
  assert.equal(reset.run.fuses.length, 0); assert.equal(reset.run.captured.length, 0); assert.equal(reset.run.escaped.length, 0);
  for (const player of reset.players) {
    assert.equal(player.alive, true); assert.equal(player.escaped, false); assert.equal(player.paused, false);
    assert.ok(distance(player, world(SPAWN_CELL)) < 3, 'Restart gives every teammate a safe spawn');
  }
  p.room.disconnect(p.ids[1]);
  assert.equal(p.state().players.length, 2); assert.ok(!p.state().players.some(player => player.id === p.ids[1]));
  const messages = p.inboxes.get(p.ids[1]).length;
  p.send(p.ids[1], { type: 'ping' });
  assert.equal(p.inboxes.get(p.ids[1]).length, messages, 'Disconnected callbacks must be released');
});

test('Host departure closes the shared run and disposal releases every client callback', () => {
  const p = party(); p.start();
  p.room.disconnect(p.ids[0]);
  assert.ok(p.inboxes.get(p.ids[1]).some(packet => packet.type === 'error' && packet.code === 'host-left'));
  const late = '888888888888888888888888';
  assert.equal(p.connect(late), false, 'Closed rooms cannot accept late teammates');
  assert.ok(p.inboxes.get(late).some(packet => packet.code === 'room-closed'));
  p.room.dispose(); p.room.dispose();
  const messages = p.inboxes.get(p.ids[1]).length;
  p.send(p.ids[1], { type: 'ping' });
  assert.equal(p.inboxes.get(p.ids[1]).length, messages, 'Disposal must remove live send callbacks');
});

let passed = 0, failed = 0;
Date.now = () => now;
try {
  for (const { name, check } of tests) {
    try { check(); passed++; console.log(`PASS ${name}`); }
    catch (error) { failed++; console.error(`FAIL ${name}\n  ${error.stack || error}`); }
  }
} finally {
  rooms.forEach(room => room.dispose());
  Date.now = originalNow;
}
console.log(`\nThe Hollow multiplayer: ${passed} passed, ${failed} failed.`);
if (failed) process.exitCode = 1;
