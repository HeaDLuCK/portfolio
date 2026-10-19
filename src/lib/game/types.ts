import type { Group, Mesh, Scene } from 'three';

export type GamePhase = 'ready' | 'playing' | 'paused' | 'over';
export type GameQuality = 'auto' | 'high' | 'low';
export type GameInput = { throttle: boolean; brake: boolean; left: boolean; right: boolean; drift: boolean; boost: boolean };
export type GameStats = {
  phase: GamePhase; speed: number; fuel: number; health: number; boost: number;
  score: number; best: number; seconds: number; heat: number; deliveries: number;
  objectiveDistance: number; objectiveBearing?: number; message: string; reason: string; combo: number;
};
export type Collider = { x: number; z: number; halfX: number; halfZ: number };
export type CarVisual = { group: Group; wheels: Group[]; brakeLights: Mesh[]; exhaust: Group };
export type CityWorld = {
  colliders: Collider[];
  dispose: () => void;
};
export type GameOptions = {
  onStats: (stats: GameStats) => void;
  onError: (message: string) => void;
  onMuted?: (muted: boolean) => void;
  quality?: GameQuality;
};
export type WorldFactory = (scene: Scene, lowQuality: boolean) => CityWorld;
export const ROAD_SPACING = 64;
export const CITY_LIMIT = 216;
export const ROAD_CENTERS = [-192, -128, -64, 0, 64, 128, 192];
