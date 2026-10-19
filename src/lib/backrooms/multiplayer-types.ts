export type PlayerPose = { x: number; z: number; yaw: number; moving: boolean; sprinting: boolean; flashlight: boolean };
export type RoomPlayer = PlayerPose & { id: string; label: string; color: number; alive: boolean; escaped: boolean; paused: boolean };
export type SharedRun = { round: number; status: 'lobby' | 'playing' | 'escaped' | 'lost'; elapsed: number; fuses: number[]; monster: { x: number; z: number; yaw: number; hunt: boolean }; captured: string[]; escaped: string[] };
export type RoomSnapshot = { type: 'state'; you: string; host: string; players: RoomPlayer[]; run: SharedRun };
export type RoomError = { type: 'error'; message: string; code?: string };
export type ClientPacket =
  | { type: 'pose'; pose: PlayerPose; paused?: boolean }
  | { type: 'start' }
  | { type: 'restart' }
  | { type: 'interact' }
  | { type: 'world'; elapsed: number; monster: SharedRun['monster']; captured: string[] }
  | { type: 'ping' };
export type RoomPacket = RoomSnapshot | RoomError | { type: 'pong' };
export type CoopStatus = 'disconnected' | 'connecting' | 'lobby' | 'connected' | 'error' | 'closed';
export type CoopState = { status: CoopStatus; room: string; you: string; host: string; players: RoomPlayer[]; run: SharedRun | null; error: string; invite: string };
export type CoopOptions = { onState: (state: CoopState) => void; onSnapshot: (snapshot: RoomSnapshot) => void };
export const ROOM_CAPACITY = 4;
export const VALID_ROOM = /^[a-z0-9]{24}$/;
