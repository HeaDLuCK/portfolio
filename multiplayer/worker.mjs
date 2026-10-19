import { HollowRoom } from '../src/lib/backrooms/room.ts';

const ROOM_PATH = /^\/rooms\/([a-z0-9]{24})$/;
function allowedOrigin(request, env) {
  const origins = (env.ALLOW_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  const origin = request.headers.get('Origin');
  return origins.length === 0 || (origin !== null && origins.includes(origin));
}
function diagnostic(request, env, status = 200, message = 'The Hollow private room relay') {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  const origin = request.headers.get('Origin');
  if (origin && allowedOrigin(request, env)) { headers['Access-Control-Allow-Origin'] = origin; headers.Vary = 'Origin'; }
  return new Response(JSON.stringify({ ok: status === 200, service: message }), { status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      if (!allowedOrigin(request, env)) return diagnostic(request, env, 403, 'Origin is not allowed');
      return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': request.headers.get('Origin') || '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Max-Age': '3600', Vary: 'Origin' } });
    }
    if (url.pathname === '/health' && request.method === 'GET') return diagnostic(request, env);
    const match = ROOM_PATH.exec(url.pathname);
    if (!match) return diagnostic(request, env, 404, 'Room endpoint not found');
    if (!allowedOrigin(request, env)) return diagnostic(request, env, 403, 'Origin is not allowed');
    if (request.method !== 'GET' || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return diagnostic(request, env, 426, 'A WebSocket connection is required');
    const id = env.HOLLOW_ROOMS.idFromName(match[1]);
    return env.HOLLOW_ROOMS.get(id).fetch(request);
  },
};

/** One ephemeral in-memory four-player room per Durable Object instance. */
export class HollowRoomObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.room = null;
    this.sockets = new Map();
    this.lastActivity = Date.now();
    // Standard WebSocket acceptance intentionally keeps the active simulation
    // in memory. No room or player data is written to Durable Object storage.
    this.cleanupTimer = null;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const match = ROOM_PATH.exec(url.pathname);
    if (!match || request.method !== 'GET' || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('WebSocket room required', { status: 426 });
    if (!allowedOrigin(request, this.env)) return new Response('Origin is not allowed', { status: 403 });
    if (!this.room) this.room = new HollowRoom(match[1]);
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    const id = crypto.randomUUID();
    this.sockets.set(id, server);
    this.lastActivity = Date.now();
    const accepted = this.room.connect(id, packet => {
      try {
        server.send(JSON.stringify(packet));
        if (packet.type === 'error' && ['host-left', 'room-closed', 'rate-limit'].includes(packet.code)) server.close(1008, packet.code);
      } catch { this.disconnect(id); }
    });
    if (!accepted) {
      this.sockets.delete(id);
      server.close(1008, 'Room is unavailable');
      return new Response(null, { status: 101, webSocket: client });
    }
    server.addEventListener('message', event => {
      this.lastActivity = Date.now();
      if (typeof event.data !== 'string') { server.close(1003, 'Text messages only'); return; }
      this.room?.receive(id, event.data);
    });
    server.addEventListener('close', () => this.disconnect(id));
    server.addEventListener('error', () => this.disconnect(id));
    if (!this.cleanupTimer) this.cleanupTimer = setInterval(() => {
      if (Date.now() - this.lastActivity > 120_000) this.close();
    }, 30_000);
    return new Response(null, { status: 101, webSocket: client });
  }

  disconnect(id) {
    const socket = this.sockets.get(id);
    if (!socket) return;
    this.sockets.delete(id);
    this.room?.disconnect(id);
    try { socket.close(1000, 'Explorer disconnected'); } catch { /* Already closed. */ }
    if (this.sockets.size === 0 && this.cleanupTimer) {
      clearInterval(this.cleanupTimer); this.cleanupTimer = null;
    }
  }

  close() {
    this.room?.dispose();
    for (const socket of this.sockets.values()) { try { socket.close(1001, 'Room closed'); } catch { /* Already closed. */ } }
    this.sockets.clear();
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.cleanupTimer = null;
  }
}
