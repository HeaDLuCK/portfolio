#!/usr/bin/env node
'use strict';

// Real room authority, transpiled in memory. No duplicate server rules or
// generated build artifacts. Bind to loopback unless HOST is set explicitly.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const ts = require('typescript');
const { WebSocketServer, WebSocket } = require('ws');

const directory = path.resolve(__dirname, '../src/lib/backrooms');
const modules = new Map();
function loadTypeScript(filename) {
  const resolved = path.resolve(filename);
  if (modules.has(resolved)) return modules.get(resolved).exports;
  if (!resolved.startsWith(directory + path.sep)) throw new Error('Room imports must stay inside Backrooms source');
  const result = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), { fileName: resolved, compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } });
  const module = { exports: {} }; modules.set(resolved, module);
  const localRequire = id => {
    if (!id.startsWith('.')) return require(id);
    return loadTypeScript(path.resolve(path.dirname(resolved), id + (path.extname(id) ? '' : '.ts')));
  };
  const execute = new vm.Script(`(function(exports, require, module) {\n${result.outputText}\n})`, { filename: resolved }).runInThisContext();
  execute(module.exports, localRequire, module);
  return module.exports;
}
const { HollowRoom } = loadTypeScript(path.join(directory, 'room.ts'));
const port = Number(process.env.PORT || 1999);
const host = process.env.HOST || '127.0.0.1';
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid port number');
const origins = (process.env.ALLOW_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
const rooms = new Map();
function allowed(request) { return origins.length === 0 || (typeof request.headers.origin === 'string' && origins.includes(request.headers.origin)); }
function getRoom(roomId) {
  let entry = rooms.get(roomId);
  if (!entry) { entry = { room: new HollowRoom(roomId), sockets: new Map(), lastActivity: Date.now() }; rooms.set(roomId, entry); }
  return entry;
}
const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  response.setHeader('Content-Type', 'application/json; charset=utf-8'); response.setHeader('Cache-Control', 'no-store'); response.setHeader('X-Content-Type-Options', 'nosniff');
  if (allowed(request) && request.headers.origin) { response.setHeader('Access-Control-Allow-Origin', request.headers.origin); response.setHeader('Vary', 'Origin'); }
  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS'); response.writeHead(allowed(request) ? 204 : 403); response.end(); return;
  }
  if (request.method === 'GET' && url.pathname === '/health') { response.writeHead(200); response.end(JSON.stringify({ ok: true, service: 'The Hollow private room relay' })); return; }
  response.writeHead(404); response.end(JSON.stringify({ ok: false, service: 'Room endpoint not found' }));
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 8192, perMessageDeflate: false });
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const match = /^\/rooms\/([a-z0-9]{24})$/.exec(url.pathname);
  if (!match || !allowed(request)) { socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return; }
  wss.handleUpgrade(request, socket, head, ws => {
    const entry = getRoom(match[1]);
    const id = randomUUID();
    entry.sockets.set(id, ws); entry.lastActivity = Date.now();
    const accepted = entry.room.connect(id, packet => {
      if (ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify(packet));
      if (packet.type === 'error' && ['host-left', 'room-closed', 'rate-limit'].includes(packet.code)) ws.close(1008, packet.code);
    });
    if (!accepted) { entry.sockets.delete(id); ws.close(1008, 'Room is unavailable'); return; }
    let disconnected = false;
    const disconnect = () => {
      if (disconnected) return; disconnected = true;
      entry.sockets.delete(id); entry.room.disconnect(id);
      if (entry.sockets.size === 0) { entry.room.dispose(); rooms.delete(match[1]); }
    };
    ws.on('message', (data, binary) => {
      entry.lastActivity = Date.now();
      if (binary) { ws.close(1003, 'Text messages only'); return; }
      entry.room.receive(id, data.toString('utf8'));
    });
    ws.on('close', disconnect); ws.on('error', disconnect);
  });
});
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [roomId, entry] of rooms) if (now - entry.lastActivity > 120_000) {
    entry.room.dispose();
    for (const ws of entry.sockets.values()) ws.close(1001, 'Room inactive');
    rooms.delete(roomId);
  }
}, 30_000);
cleanup.unref();
server.listen(port, host, () => console.log(`The Hollow room relay: ws://${host}:${port} (health: http://${host}:${port}/health)`));
server.on('error', error => { console.error(`Room relay could not start: ${error.message}`); process.exitCode = 1; });
function shutdown() {
  clearInterval(cleanup);
  for (const entry of rooms.values()) { entry.room.dispose(); for (const ws of entry.sockets.values()) ws.close(1001, 'Server stopped'); }
  rooms.clear(); wss.close(); server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
}
process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
