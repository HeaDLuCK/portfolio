import { CELL_SIZE, type WallCollider } from './types';

export type Cell = { x: number; z: number };
const WIDTH = 31, HEIGHT = 27;
const cells = Array.from({ length: HEIGHT }, () => Array<string>(WIDTH).fill('#'));
function carve(x1: number, z1: number, x2: number, z2: number) {
  for (let z = z1; z <= z2; z++) for (let x = x1; x <= x2; x++) cells[z][x] = '.';
}
carve(2, 21, 7, 24); // Entry and the camera's long northern sightline.
carve(4, 3, 5, 24);
carve(2, 2, 12, 7);
carve(5, 5, 25, 6);
carve(11, 6, 12, 23);
carve(10, 10, 17, 17);
carve(4, 22, 27, 23);
carve(24, 5, 25, 23);
carve(20, 9, 27, 14);
carve(20, 18, 27, 23);
carve(5, 12, 25, 13);
carve(7, 15, 11, 17);
carve(17, 4, 21, 7);
carve(16, 20, 21, 24);
carve(1, 10, 5, 11);
carve(13, 3, 15, 5);
for (const [x, z] of [[12,11],[15,11],[12,15],[15,15],[3,4],[8,4],[22,11],[25,11],[22,20],[25,20],[18,22]]) cells[z][x] = '#';

export const GRID = cells.map(row => row.join(''));
export const SPAWN_CELL: Cell = { x: 4, z: 23 };
export const EXIT_CELL: Cell = { x: 27, z: 22 };
export const FUSE_CELLS: Cell[] = [{ x: 7, z: 3 }, { x: 26, z: 10 }, { x: 19, z: 21 }];
export const HOLLOW_START: Cell = { x: 24, z: 6 };
export const cellToWorld = (x: number, z: number) => ({ x: (x - (WIDTH - 1) / 2) * CELL_SIZE, z: (z - (HEIGHT - 1) / 2) * CELL_SIZE });
export const worldToCell = (x: number, z: number): Cell => ({ x: Math.round(x / CELL_SIZE + (WIDTH - 1) / 2), z: Math.round(z / CELL_SIZE + (HEIGHT - 1) / 2) });
export const isOpen = (x: number, z: number) => GRID[z]?.[x] === '.';
export const OPEN_CELLS: Cell[] = GRID.flatMap((row, z) => [...row].flatMap((value, x) => value === '.' ? [{ x, z }] : []));
export const WALLS: WallCollider[] = GRID.flatMap((row, z) => [...row].flatMap((value, x) => value === '#' ? [{ ...cellToWorld(x, z), halfX: CELL_SIZE / 2, halfZ: CELL_SIZE / 2 }] : []));

/** Grid BFS produces short paths through rooms and around solid walls. */
export function findPath(from: Cell, to: Cell): Cell[] {
  if (!isOpen(from.x, from.z) || !isOpen(to.x, to.z)) return [];
  const key = (cell: Cell) => `${cell.x},${cell.z}`;
  const queue = [from], previous = new Map<string, Cell | null>([[key(from), null]]);
  let found = false;
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    if (current.x === to.x && current.z === to.z) { found = true; break; }
    for (const [dx, dz] of [[0,-1],[-1,0],[1,0],[0,1]]) {
      const next = { x: current.x + dx, z: current.z + dz }, id = key(next);
      if (isOpen(next.x, next.z) && !previous.has(id)) { previous.set(id, current); queue.push(next); }
    }
  }
  if (!found) return [];
  const path: Cell[] = []; let next: Cell | null = to;
  while (next) { path.push(next); next = previous.get(key(next)) ?? null; }
  return path.reverse().slice(1);
}

export function visibleBetween(ax: number, az: number, bx: number, bz: number): boolean {
  const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / (CELL_SIZE * .17));
  for (let i = 0; i <= steps; i++) {
    const t = steps ? i / steps : 0, cell = worldToCell(ax + (bx - ax) * t, az + (bz - az) * t);
    if (!isOpen(cell.x, cell.z)) return false;
  }
  return true;
}

/** Swept in small steps, then slid along walls: no corner tunnelling at low FPS. */
export function moveCharacter(position: { x: number; z: number }, dx: number, dz: number, radius = .28) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .18));
  for (let step = 0; step < steps; step++) {
    for (const [axis, delta] of [['x', dx / steps], ['z', dz / steps]] as const) {
      const candidate = { ...position, [axis]: position[axis] + delta };
      const cell = worldToCell(candidate.x, candidate.z);
      let blocked = false;
      for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) {
        if (isOpen(cell.x + ox, cell.z + oz)) continue;
        const wall = cellToWorld(cell.x + ox, cell.z + oz);
        const nx = Math.max(wall.x - CELL_SIZE / 2, Math.min(wall.x + CELL_SIZE / 2, candidate.x));
        const nz = Math.max(wall.z - CELL_SIZE / 2, Math.min(wall.z + CELL_SIZE / 2, candidate.z));
        if (Math.hypot(candidate.x - nx, candidate.z - nz) < radius) blocked = true;
      }
      if (!blocked) position[axis] = candidate[axis];
    }
  }
}
