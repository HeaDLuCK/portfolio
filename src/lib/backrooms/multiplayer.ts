import { VALID_ROOM, type ClientPacket, type CoopOptions, type CoopState, type RoomPacket, type RoomSnapshot } from './multiplayer-types';

const emptyState = (): CoopState => ({ status: 'disconnected', room: '', you: '', host: '', players: [], run: null, error: '', invite: '' });

/** Rooms exchange anonymous game state through a relay, never peer-to-peer. */
export class HollowCoop {
  private socket: WebSocket | null = null;
  private state: CoopState = emptyState();
  private disposed = false;
  private generation = 0;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private finishPending: (() => void) | null = null;

  constructor(private options: CoopOptions) {}

  static configuredServer(): string | null {
    if (typeof window === 'undefined') return null;
    const configured = process.env.NEXT_PUBLIC_HOLLOW_ROOM_URL?.trim();
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
    try {
      const url = new URL(configured || (local ? `http://${window.location.hostname}:1999` : ''));
      if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return null;
      if (window.location.protocol === 'https:' && !['https:', 'wss:'].includes(url.protocol)) return null;
      url.protocol = ['https:', 'wss:'].includes(url.protocol) ? 'wss:' : 'ws:';
      return url.origin;
    } catch { return null; }
  }
  static available() { return HollowCoop.configuredServer() !== null; }
  static getRoomFromLocation(): string | null {
    if (typeof window === 'undefined') return null;
    const room = new URLSearchParams(window.location.hash.slice(1)).get('room');
    return room && VALID_ROOM.test(room) ? room : null;
  }
  static parseRoom(value: string): string | null {
    const raw = value.trim();
    if (VALID_ROOM.test(raw)) return raw;
    try { const url = new URL(raw); const room = new URLSearchParams(url.hash.slice(1)).get('room'); return room && VALID_ROOM.test(room) ? room : null; } catch { return null; }
  }
  async create() {
    const bytes = new Uint8Array(12); window.crypto.getRandomValues(bytes);
    await this.connect(Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join(''));
  }
  async join(value: string) {
    const room = HollowCoop.parseRoom(value);
    if (!room) { this.update({ ...emptyState(), status: 'error', error: 'This invitation is invalid. Paste the complete room link or its 24-character room key.' }); return; }
    await this.connect(room);
  }
  send(packet: ClientPacket) {
    if (this.disposed || this.socket?.readyState !== WebSocket.OPEN) return;
    if (this.socket.bufferedAmount > 65536) return;
    this.socket.send(JSON.stringify(packet));
  }
  leave() {
    this.generation++;
    this.finishPending?.(); this.finishPending = null;
    this.clearTimers();
    const socket = this.socket; this.socket = null;
    if (socket) { socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null; socket.close(1000, 'Player left'); }
    if (typeof window !== 'undefined' && HollowCoop.getRoomFromLocation() === this.state.room) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    this.update(emptyState());
  }
  dispose() { if (this.disposed) return; this.disposed = true; this.leave(); }

  private async connect(room: string) {
    if (this.disposed) return;
    this.leave();
    const server = HollowCoop.configuredServer();
    if (!server) { this.update({ ...emptyState(), status: 'error', error: 'Online rooms are not connected on this site yet. You can play alone.' }); return; }
    const generation = ++this.generation;
    const invite = new URL(window.location.href); invite.hash = new URLSearchParams({ room }).toString();
    this.update({ ...emptyState(), status: 'connecting', room, invite: invite.href });
    await new Promise<void>(resolve => {
      let settled = false;
      const finish = () => { if (!settled) { settled = true; this.finishPending = null; resolve(); } };
      this.finishPending = finish;
      let socket: WebSocket;
      try { socket = new WebSocket(`${server}/rooms/${room}`); } catch { this.fail('Unable to open the room connection. Check the room service URL.'); finish(); return; }
      this.socket = socket;
      this.timeout = setTimeout(() => { if (generation !== this.generation) return; this.fail('The room service did not answer. Start the local room server or check the deployed service.'); socket.close(); finish(); }, 12000);
      socket.onopen = () => {
        if (generation !== this.generation) return;
        this.heartbeat = setInterval(() => this.send({ type: 'ping' }), 15000);
      };
      socket.onmessage = event => {
        if (generation !== this.generation || typeof event.data !== 'string' || event.data.length > 32768) return;
        let packet: RoomPacket;
        try { packet = JSON.parse(event.data) as RoomPacket; } catch { return; }
        if (!packet || typeof packet !== 'object') return;
        if (packet.type === 'error') {
          this.fail(typeof packet.message === 'string' ? packet.message : 'The room connection could not continue.', packet.code === 'host-left' ? 'closed' : 'error');
          socket.close(); finish(); return;
        }
        if (packet.type !== 'state' || !this.validSnapshot(packet)) return;
        if (this.timeout) { clearTimeout(this.timeout); this.timeout = null; }
        const snapshot = packet as RoomSnapshot;
        this.update({ ...this.state, status: snapshot.run.status === 'lobby' ? 'lobby' : 'connected', you: snapshot.you, host: snapshot.host, players: snapshot.players, run: snapshot.run, error: '' });
        if (HollowCoop.getRoomFromLocation() !== room) window.history.replaceState(window.history.state, '', invite.pathname + invite.search + invite.hash);
        this.options.onSnapshot(snapshot); finish();
      };
      socket.onerror = () => {
        if (generation !== this.generation) return;
        this.fail('The room service is unreachable. Check your connection and try again.'); finish();
      };
      socket.onclose = () => {
        if (generation !== this.generation) return;
        this.clearTimers(); this.socket = null;
        if (!['error','closed','disconnected'].includes(this.state.status)) this.fail('The room connection ended. Create or join a new room.', 'closed');
        finish();
      };
    });
  }
  private validSnapshot(packet: RoomSnapshot) {
    if (typeof packet.you !== 'string' || typeof packet.host !== 'string' || !Array.isArray(packet.players) || packet.players.length > 4 || !packet.run || !['lobby','playing','escaped','lost'].includes(packet.run.status)) return false;
    if (!Number.isFinite(packet.run.round) || !Number.isFinite(packet.run.elapsed) || !Array.isArray(packet.run.fuses) || packet.run.fuses.length > 3 || !packet.run.fuses.every(n => Number.isInteger(n) && n >= 0 && n < 3)) return false;
    if (!Array.isArray(packet.run.captured) || !Array.isArray(packet.run.escaped) || !packet.run.monster || ![packet.run.monster.x,packet.run.monster.z,packet.run.monster.yaw].every(Number.isFinite)) return false;
    return packet.players.every(p => p && typeof p.id === 'string' && typeof p.label === 'string' && p.label.length < 32 && [p.x,p.z,p.yaw,p.color].every(Number.isFinite) && Math.abs(p.x)<100 && Math.abs(p.z)<100 && typeof p.alive === 'boolean');
  }
  private update(state: CoopState) {
    const signature = (s: CoopState) => JSON.stringify([s.status,s.room,s.you,s.host,s.error,s.invite,s.run?.status,s.run?.round,s.run?.fuses,s.players.map(p=>[p.id,p.label,p.alive,p.escaped,p.paused])]);
    const changed = signature(this.state) !== signature(state);
    this.state = state;
    if (!this.disposed && changed) this.options.onState({ ...state, players: [...state.players] });
  }
  private fail(message: string, status: 'error' | 'closed' = 'error') { this.clearTimers(); this.update({ ...this.state, status, error: message }); }
  private clearTimers() { if (this.heartbeat) clearInterval(this.heartbeat); if (this.timeout) clearTimeout(this.timeout); this.heartbeat = this.timeout = null; }
}
