import { cellToWorld, EXIT_CELL, FUSE_CELLS, HOLLOW_START, isOpen, moveCharacter, SPAWN_CELL, visibleBetween, worldToCell } from './level';
import { ROOM_CAPACITY, VALID_ROOM, type PlayerPose, type RoomPacket, type RoomPlayer, type SharedRun } from './multiplayer-types';

type Connection = {
  send: (packet: RoomPacket) => void;
  player: RoomPlayer;
  slot: number;
  movementBudget: number;
  poseAt: number;
  rateAt: number;
  rateCount: number;
};
const COLORS = [0xc5d2b8, 0xd6b185, 0x98bac4, 0xb9a4c7];
const OFFSETS = [[-.45, .35], [.45, .35], [-.45, -.35], [.45, -.35]];
const encoder = new TextEncoder();
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const angle = (value: number) => Math.atan2(Math.sin(value), Math.cos(value));
const validPosition = (x: number, z: number) => {
  if (!Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x) > 1000 || Math.abs(z) > 1000) return false;
  const cell = worldToCell(x, z);
  return isOpen(cell.x, cell.z);
};
const validPose = (value: unknown): value is PlayerPose => record(value)
  && finite(value.x) && finite(value.z) && finite(value.yaw)
  && typeof value.moving === 'boolean' && typeof value.sprinting === 'boolean' && typeof value.flashlight === 'boolean';

/**
 * Transport-independent, ephemeral authority for one private room. The host
 * simulates the creature; this relay owns membership, movement bounds, pickup
 * collection, and the shared result. No names, chat, IPs or persistence.
 */
export class HollowRoom {
  private connections = new Map<string, Connection>();
  private host = '';
  private closed = false;
  private startedAt = 0;
  private run: SharedRun = this.freshRun(0, 'lobby');

  constructor(readonly roomId: string) {
    if (!VALID_ROOM.test(roomId)) throw new Error('Invalid room key');
  }

  connect(id: string, send: (packet: RoomPacket) => void): boolean {
    const reject = (message: string, code: string) => {
      try { send({ type: 'error', message, code }); } catch { /* A failed socket has no state to retain. */ }
      return false;
    };
    if (this.closed) return reject('This private room has closed. Create a new room.', 'room-closed');
    if (this.run.status === 'lost' || this.run.status === 'escaped') return reject('This recording has ended. Ask the host to restart before joining.', 'run-ended');
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) return reject('Invalid anonymous player ID.', 'invalid-id');
    if (this.connections.has(id)) return reject('That explorer is already connected.', 'duplicate-player');
    if (this.connections.size >= ROOM_CAPACITY) return reject('This room already has four explorers.', 'room-full');
    const used = new Set([...this.connections.values()].map(connection => connection.slot));
    let slot = 0;
    while (used.has(slot)) slot++;
    const spawn = this.spawn(slot);
    const now = Date.now();
    const player: RoomPlayer = {
      id, label: `Explorer ${String(slot + 1).padStart(2, '0')}`, color: COLORS[slot],
      ...spawn, yaw: 0, moving: false, sprinting: false, flashlight: true,
      alive: true, escaped: false, paused: false,
    };
    this.connections.set(id, { send, player, slot, movementBudget: .7, poseAt: now, rateAt: now, rateCount: 0 });
    if (!this.host) this.host = id;
    this.broadcast();
    return true;
  }

  receive(id: string, data: string): void {
    const connection = this.connections.get(id);
    if (!connection || this.closed) return;
    const now = Date.now();
    if (now - connection.rateAt >= 1000 || now < connection.rateAt) { connection.rateAt = now; connection.rateCount = 0; }
    connection.rateCount++;
    if (connection.rateCount > 60) {
      if (connection.rateCount === 61) this.error(connection, 'Too many room messages. Reconnect to continue.', 'rate-limit');
      return;
    }
    if (typeof data !== 'string' || data.length > 8192 || encoder.encode(data).byteLength > 8192) {
      this.error(connection, 'Room messages must be text smaller than 8 KB.', 'invalid-packet');
      return;
    }
    let packet: unknown;
    try { packet = JSON.parse(data); } catch { this.error(connection, 'Invalid room message.', 'invalid-packet'); return; }
    if (!record(packet) || typeof packet.type !== 'string') { this.error(connection, 'Invalid room message.', 'invalid-packet'); return; }
    switch (packet.type) {
      case 'ping': this.send(connection, { type: 'pong' }); break;
      case 'start':
      case 'restart':
        if (id !== this.host) { this.error(connection, 'Only the host can start or restart this expedition.', 'host-only'); return; }
        if (packet.type === 'start' && this.run.status !== 'lobby') return;
        this.start(now);
        break;
      case 'pose': {
        if (!validPose(packet.pose) || (packet.paused !== undefined && typeof packet.paused !== 'boolean') || !validPosition(packet.pose.x, packet.pose.z)) {
          this.error(connection, 'Invalid explorer position.', 'invalid-packet'); return;
        }
        this.pose(connection, packet.pose, packet.paused as boolean | undefined, now);
        break;
      }
      case 'interact': this.interact(connection); break;
      case 'world':
        if (id !== this.host) { this.error(connection, 'Only the host can update the creature.', 'host-only'); return; }
        this.world(connection, packet, now);
        break;
      default: this.error(connection, 'Unknown room message.', 'invalid-packet');
    }
  }

  disconnect(id: string): void {
    if (this.closed || !this.connections.has(id)) return;
    if (id === this.host) {
      // Never silently promote a guest into an unsynchronised host simulation.
      this.closed = true;
      for (const [otherId, connection] of this.connections) {
        if (otherId !== id) this.error(connection, 'The host left. This private room has closed.', 'host-left');
      }
      this.connections.clear();
      this.host = '';
      return;
    }
    this.connections.delete(id);
    this.checkLost();
    this.broadcast();
  }

  dispose(): void {
    if (this.closed) return;
    this.closed = true;
    for (const connection of this.connections.values()) this.error(connection, 'This private room has closed.', 'room-closed');
    this.connections.clear();
    this.host = '';
  }

  private spawn(slot: number) {
    const point = cellToWorld(SPAWN_CELL.x, SPAWN_CELL.z);
    return { x: point.x + OFFSETS[slot][0], z: point.z + OFFSETS[slot][1] };
  }

  private freshRun(round: number, status: SharedRun['status']): SharedRun {
    return { round, status, elapsed: 0, fuses: [], monster: { ...cellToWorld(HOLLOW_START.x, HOLLOW_START.z), yaw: 0, hunt: false }, captured: [], escaped: [] };
  }

  private start(now: number) {
    this.run = this.freshRun(this.run.round + 1, 'playing');
    this.startedAt = now;
    for (const connection of this.connections.values()) {
      Object.assign(connection.player, this.spawn(connection.slot), { yaw: 0, alive: true, escaped: false, paused: false, moving: false, sprinting: false, flashlight: true });
      connection.poseAt = now;
      connection.movementBudget = .7;
    }
    this.broadcast();
  }

  private hostPaused() { return this.connections.get(this.host)?.player.paused === true; }

  private pose(connection: Connection, pose: PlayerPose, paused: boolean | undefined, now: number) {
    const player = connection.player;
    const wasPaused = player.paused;
    if (paused !== undefined) player.paused = paused;
    const seconds = Math.max(0, Math.min(1, (now - connection.poseAt) / 1000));
    connection.poseAt = now;
    // A bounded credit, rather than a fixed per-packet tolerance, prevents a
    // high packet rate from multiplying the allowed running speed.
    connection.movementBudget = Math.min(2.5, connection.movementBudget + seconds * 5.1);
    if (wasPaused && !player.paused) connection.movementBudget = Math.min(connection.movementBudget, .7);
    if (this.run.status === 'playing' && player.alive && !player.escaped && !player.paused && !this.hostPaused()) {
      const dx = pose.x - player.x; const dz = pose.z - player.z;
      const distance = Math.hypot(dx, dz);
      const limit = Math.min(distance, connection.movementBudget);
      const previous = { x: player.x, z: player.z };
      if (distance > .0001 && limit > 0) moveCharacter(player, dx / distance * limit, dz / distance * limit, .28);
      connection.movementBudget = Math.max(0, connection.movementBudget - Math.hypot(player.x - previous.x, player.z - previous.z));
      player.moving = pose.moving && Math.hypot(player.x - previous.x, player.z - previous.z) > .005;
      player.sprinting = pose.sprinting && player.moving;
    } else { player.moving = false; player.sprinting = false; }
    player.yaw = angle(pose.yaw);
    player.flashlight = pose.flashlight;
    this.broadcast();
  }

  private interact(connection: Connection) {
    const player = connection.player;
    if (this.run.status !== 'playing' || !player.alive || player.escaped || player.paused || this.hostPaused()) return;
    for (let index = 0; index < FUSE_CELLS.length; index++) {
      if (this.run.fuses.includes(index)) continue;
      const fuse = cellToWorld(FUSE_CELLS[index].x, FUSE_CELLS[index].z);
      if (Math.hypot(fuse.x - player.x, fuse.z - player.z) <= 2.5 && visibleBetween(player.x, player.z, fuse.x, fuse.z)) {
        this.run.fuses.push(index);
        this.run.fuses.sort((a, b) => a - b);
        this.broadcast();
        return;
      }
    }
    const exit = cellToWorld(EXIT_CELL.x, EXIT_CELL.z);
    if (this.run.fuses.length === FUSE_CELLS.length && Math.hypot(exit.x - player.x, exit.z - player.z) <= 3 && visibleBetween(player.x, player.z, exit.x, exit.z)) {
      player.escaped = true; player.moving = false; player.sprinting = false;
      this.run.escaped.push(player.id);
      this.run.status = 'escaped';
      this.broadcast();
    }
  }

  private world(connection: Connection, packet: Record<string, unknown>, now: number) {
    const monster = packet.monster;
    if (!record(monster) || !finite(monster.x) || !finite(monster.z) || !finite(monster.yaw) || typeof monster.hunt !== 'boolean'
      || !validPosition(monster.x, monster.z) || !finite(packet.elapsed) || packet.elapsed < 0 || packet.elapsed > 86400
      || !Array.isArray(packet.captured) || packet.captured.length > ROOM_CAPACITY || !packet.captured.every(id => typeof id === 'string' && id.length <= 80)) {
      this.error(connection, 'Invalid creature update.', 'invalid-packet'); return;
    }
    if (this.run.status !== 'playing' || this.hostPaused()) return;
    const timeLimit = Math.max(0, (now - this.startedAt) / 1000) + 3;
    if (packet.elapsed + .05 < this.run.elapsed || packet.elapsed > timeLimit) {
      this.error(connection, 'Invalid expedition clock.', 'invalid-packet'); return;
    }
    this.run.elapsed = Math.max(this.run.elapsed, packet.elapsed);
    this.run.monster = { x: monster.x, z: monster.z, yaw: angle(monster.yaw), hunt: monster.hunt };
    for (const id of packet.captured as string[]) {
      const target = this.connections.get(id)?.player;
      if (!target || !target.alive || target.escaped || this.run.elapsed < 5) continue;
      if (Math.hypot(target.x - monster.x, target.z - monster.z) > 1.6 || !visibleBetween(target.x, target.z, monster.x, monster.z)) continue;
      target.alive = false; target.moving = false; target.sprinting = false;
      if (!this.run.captured.includes(id)) this.run.captured.push(id);
    }
    this.checkLost();
    this.broadcast();
  }

  private checkLost() {
    if (this.run.status === 'playing' && this.connections.size > 0 && [...this.connections.values()].every(connection => !connection.player.alive && !connection.player.escaped)) this.run.status = 'lost';
  }

  private error(connection: Connection, message: string, code: string) { this.send(connection, { type: 'error', message, code }); }
  private send(connection: Connection, packet: RoomPacket) {
    try { connection.send(packet); } catch { /* Adapter close/error events remove dead transports. */ }
  }
  private broadcast() {
    for (const [id, connection] of this.connections) {
      this.send(connection, {
        type: 'state', you: id, host: this.host,
        players: [...this.connections.values()].map(item => ({ ...item.player })),
        run: { ...this.run, fuses: [...this.run.fuses], captured: [...this.run.captured], escaped: [...this.run.escaped], monster: { ...this.run.monster } },
      });
    }
  }
}
