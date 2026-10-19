import type { Collider, GameInput } from './types';
import { CITY_LIMIT } from './types';

export type Vehicle = { x: number; z: number; vx: number; vz: number; heading: number };
export const emptyInput = (): GameInput => ({ throttle: false, brake: false, left: false, right: false, drift: false, boost: false });
export const initialVehicle = (): Vehicle => ({ x: -4, z: -155, vx: 0, vz: 0, heading: 0 });
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const angleDifference = (target: number, current: number) => Math.atan2(Math.sin(target - current), Math.cos(target - current));

/** Circle/rectangle contact keeps cars outside walls, including corner and inside cases. */
export function resolveCollisions(car: Vehicle, colliders: Collider[], radius = 1.35): number {
  let impact = 0;
  for (const box of colliders) {
    if (Math.abs(car.x - box.x) > box.halfX + radius || Math.abs(car.z - box.z) > box.halfZ + radius) continue;
    const nearX = clamp(car.x, box.x - box.halfX, box.x + box.halfX);
    const nearZ = clamp(car.z, box.z - box.halfZ, box.z + box.halfZ);
    let nx = car.x - nearX, nz = car.z - nearZ;
    const distance = Math.hypot(nx, nz);
    let depth = radius - distance;
    if (depth <= 0) continue;
    if (distance > .0001) { nx /= distance; nz /= distance; }
    else {
      const dx = box.halfX - Math.abs(car.x - box.x);
      const dz = box.halfZ - Math.abs(car.z - box.z);
      if (dx < dz) { nx = car.x >= box.x ? 1 : -1; nz = 0; depth = radius + dx; }
      else { nz = car.z >= box.z ? 1 : -1; nx = 0; depth = radius + dz; }
    }
    car.x += nx * (depth + .015); car.z += nz * (depth + .015);
    const inward = car.vx * nx + car.vz * nz;
    if (inward < 0) {
      impact = Math.max(impact, -inward);
      car.vx -= inward * nx * 1.32; car.vz -= inward * nz * 1.32;
    }
  }
  for (const axis of ['x', 'z'] as const) {
    if (Math.abs(car[axis]) > CITY_LIMIT) {
      const key = axis === 'x' ? 'vx' : 'vz';
      if (car[axis] * car[key] > 0) { impact = Math.max(impact, Math.abs(car[key])); car[key] *= -.4; }
      car[axis] = clamp(car[axis], -CITY_LIMIT, CITY_LIMIT);
    }
  }
  return impact;
}

/** Fixed 60 Hz arcade model: traction, reverse braking, handbrake slip and nitro. */
export function stepVehicle(car: Vehicle, input: GameInput, dt: number, boosting: boolean, colliders: Collider[]) {
  const forwardX = Math.sin(car.heading), forwardZ = Math.cos(car.heading);
  let forward = car.vx * forwardX + car.vz * forwardZ;
  const steering = Number(input.left) - Number(input.right);
  const drift = input.drift && Math.abs(forward) > 7;
  if (Math.abs(forward) > .5) {
    car.heading += steering * dt * (0.25 + Math.min(Math.abs(forward) / 18, 1) * 1.45) * Math.sign(forward) * (drift ? 1.3 : 1);
    car.heading = Math.atan2(Math.sin(car.heading), Math.cos(car.heading));
  }
  const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
  forward = car.vx * fx + car.vz * fz;
  let lateral = car.vx * fz - car.vz * fx;
  if (input.throttle) forward += (boosting ? 35 : 21) * dt;
  if (input.brake) forward -= (forward > 1 ? 40 : 14) * dt;
  const drag = Math.exp(-(input.drift ? .21 : input.throttle ? .1 : .65) * dt);
  forward *= drag;
  forward = clamp(forward, -11, boosting ? 58 : 42);
  lateral *= Math.exp(-(drift ? 1.65 : 9.5) * dt);
  car.vx = fx * forward + fz * lateral;
  car.vz = fz * forward - fx * lateral;
  car.x += car.vx * dt; car.z += car.vz * dt;
  const impact = resolveCollisions(car, colliders);
  return { impact, speed: Math.hypot(car.vx, car.vz), drift: drift && Math.abs(lateral) > 2.2 && Math.abs(steering) > 0, lateral };
}

/** A segment test, used to keep pursuing cars on streets until the player is in sight. */
export function clearRoad(ax: number, az: number, bx: number, bz: number, colliders: Collider[]): boolean {
  for (const box of colliders) {
    let near = 0, far = 1;
    for (const axis of [0, 1]) {
      const a = axis === 0 ? ax : az, d = axis === 0 ? bx - ax : bz - az;
      const center = axis === 0 ? box.x : box.z, half = (axis === 0 ? box.halfX : box.halfZ) + 1.6;
      if (Math.abs(d) < .0001) { if (a < center - half || a > center + half) { far = -1; break; } }
      else {
        const t1 = (center - half - a) / d, t2 = (center + half - a) / d;
        near = Math.max(near, Math.min(t1, t2)); far = Math.min(far, Math.max(t1, t2));
      }
      if (near > far) break;
    }
    if (near <= far && far >= 0 && near <= 1) return false;
  }
  return true;
}
