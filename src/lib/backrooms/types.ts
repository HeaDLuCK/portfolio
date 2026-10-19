import type * as THREE from 'three';

export type HorrorPhase = 'ready' | 'intro' | 'playing' | 'paused' | 'caught' | 'escaped';
export type HorrorInput = { forward: boolean; backward: boolean; left: boolean; right: boolean; sprint: boolean };
export type HorrorQuality = 'auto' | 'high' | 'low';
export type HorrorStats = {
  phase: HorrorPhase; fuses: number; totalFuses: number; stamina: number; battery: number;
  flashlight: boolean; danger: number; elapsed: number; prompt: string; message: string;
  caption: string; introProgress: number; locked: boolean; muted: boolean;
};
export type HorrorOptions = { onStats: (stats: HorrorStats) => void; onError: (message: string) => void; quality?: HorrorQuality; reducedMotion?: boolean };
export type WallCollider = { x: number; z: number; halfX: number; halfZ: number };
export type HorrorWorld = {
  root: THREE.Group; fixtures: THREE.Vector3[]; fuseModels: THREE.Group[];
  exitDoor: THREE.Group; dispose(): void;
};
export type HollowVisual = { group: THREE.Group; head: THREE.Group; arms: THREE.Group[]; legs: THREE.Group[]; eyes: THREE.Mesh[] };
export const CELL_SIZE = 3.6;
export const CEILING_HEIGHT = 3.35;
