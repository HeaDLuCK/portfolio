#!/usr/bin/env node
'use strict';

// Exercise the real browser room client against a real local WebSocket relay.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawn } = require('node:child_process');
const { randomBytes, webcrypto } = require('node:crypto');
const net = require('node:net');
const WebSocket = require('ws');
const ts = require('typescript');
// Browser EventTarget error events do not crash the process like Node's emitter.
class BrowserWebSocket extends WebSocket {
  constructor(...args) { super(...args); this.on('error', () => {}); }
}
const root = path.resolve(__dirname, '..');
const clients = [];
let relay;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(condition, message) {
  const deadline = Date.now() + 6000;
  while (!condition()) { if (Date.now() > deadline) throw new Error(message); await delay(20); }
}
async function freePort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
function makeClient(port, href = 'http://127.0.0.1:3000/games/backrooms') {
  const window = { location: new URL(href), crypto: webcrypto, history: {
    state: { __NA: true }, replacements: 0,
    replaceState(state, _title, url) {
      assert.equal(state, this.state, 'Room links must preserve the Next.js history entry');
      this.replacements++; window.location = new URL(url, window.location);
    },
  } };
  const sandbox = vm.createContext({ window, WebSocket: BrowserWebSocket, URL, URLSearchParams, Uint8Array, setInterval, clearInterval, setTimeout, clearTimeout, process: { env: { NEXT_PUBLIC_HOLLOW_ROOM_URL: `http://127.0.0.1:${port}` } } });
  const modules = new Map();
  function load(name) {
    const filename = path.join(root, 'src/lib/backrooms', name + '.ts');
    if (modules.has(name)) return modules.get(name).exports;
    const module = { exports: {} }; modules.set(name, module);
    const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
    const execute = new vm.Script(`(function(exports,require,module){${js}\n})`, { filename }).runInContext(sandbox);
    execute(module.exports, id => load(id.replace('./', '')), module);
    return module.exports;
  }
  const { HollowCoop } = load('multiplayer');
  const result = { state: null, snapshot: null, updates: 0, window, Client: HollowCoop };
  result.client = new HollowCoop({ onState: state => { result.state = state; result.updates++; }, onSnapshot: snapshot => { result.snapshot = snapshot; } });
  clients.push(result);
  return result;
}
async function main() {
  const port = await freePort();
  relay = spawn(process.execPath, [path.join(root, 'scripts/multiplayer-local.cjs')], { cwd: root, env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  relay.stdout.on('data', data => { output += data; });
  relay.stderr.on('data', data => { output += data; });
  await until(() => output.includes('room relay:'), `Relay did not start: ${output}`);
  const health = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(health.status, 200); assert.equal((await health.json()).ok, true);
  const host = makeClient(port);
  await host.client.create();
  assert.equal(host.state.status, 'lobby');
  assert.match(host.state.room, /^[a-f0-9]{24}$/);
  assert.equal(host.state.host, host.state.you);
  assert.equal(host.window.location.hash, `#room=${host.state.room}`);
  console.log('✓ Real relay health, room creation, and private invite hash');
  const peers = [makeClient(port, host.state.invite), makeClient(port), makeClient(port)];
  for (const peer of peers) await peer.client.join(host.state.invite);
  await until(() => host.state.players.length === 4, 'Four-player roster did not synchronize');
  assert.equal(new Set(host.state.players.map(p => p.id)).size, 4);
  for (const peer of peers) assert.equal(peer.state.host, host.state.you);
  const excess = makeClient(port); await excess.client.join(host.state.invite);
  assert.equal(excess.state.status, 'error'); assert.match(excess.state.error, /four explorers/);
  console.log('✓ Four actual clients join one invite; a fifth is rejected');
  host.client.send({ type: 'start' });
  await until(() => [host, ...peers].every(p => p.snapshot.run.status === 'playing' && p.snapshot.run.round === 1), 'Shared start did not arrive');
  const guest = peers[0];
  const pose = guest.snapshot.players.find(p => p.id === guest.state.you);
  const beforeUpdates = host.updates;
  guest.client.send({ type: 'pose', pose: { ...pose, x: pose.x + .2, moving: true } });
  await until(() => host.snapshot.players.find(p => p.id === guest.state.you).x > pose.x + .1, 'Guest movement was not relayed');
  assert.equal(host.updates, beforeUpdates, 'Pose-only updates must not rerender the React lobby');
  assert.equal(host.window.history.replacements, 1, 'Pose updates must not rewrite the Next.js URL');
  assert.equal(guest.window.history.replacements, 0, 'An opened invite already has the correct URL');
  guest.client.send({ type: 'pose', pose, paused: true });
  await until(() => host.state.players.find(p => p.id === guest.state.you).paused, 'Pause status was not relayed');
  console.log('✓ Shared start, player movement, pause status, and UI update throttling');
  host.client.send({ type: 'restart' });
  await until(() => peers.every(p => p.snapshot.run.round === 2), 'Shared restart did not arrive');
  assert.equal(guest.snapshot.players.find(p => p.id === guest.state.you).paused, false);
  peers[2].client.leave();
  await until(() => host.state.players.length === 3, 'Guest departure was not relayed');
  assert.equal(peers[2].window.location.hash, '');
  host.client.leave();
  await until(() => peers.slice(0, 2).every(p => p.state.status === 'closed'), 'Host departure did not close remaining clients');
  assert.equal(host.window.location.hash, '');
  console.log('✓ Shared restart, guest cleanup, host departure, and invite cleanup');
  const invalid = makeClient(port); await invalid.client.join('not-a-room');
  assert.equal(invalid.state.status, 'error');
  const cancelled = makeClient(port);
  const connecting = cancelled.client.join(randomBytes(12).toString('hex'));
  cancelled.client.dispose();
  await Promise.race([connecting, delay(1000).then(() => { throw new Error('Cancelled connection stayed pending'); })]);
  console.log('✓ Invalid invitations and disposal while connecting');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  for (const item of clients) item.client.dispose();
  if (relay && relay.exitCode === null) {
    relay.kill();
    await Promise.race([new Promise(resolve => relay.once('exit', resolve)), delay(2000)]);
  }
});
