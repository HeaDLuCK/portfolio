import * as THREE from 'three';
import { GameAudio } from './audio';
import { createCar, createWorld } from './world';
import { angleDifference, clamp, clearRoad, emptyInput, initialVehicle, resolveCollisions, stepVehicle, type Vehicle } from './physics';
import { ROAD_CENTERS, type CarVisual, type CityWorld, type GameInput, type GameOptions, type GameQuality, type GameStats } from './types';

type Rival = { car: CarVisual; vehicle: Vehicle; target: { x: number; z: number }; replan: number; stuck: number; previousX: number; previousZ: number; pulse: THREE.PointLight };
type Traffic = { car: CarVisual; x: number; z: number; axis: 'x' | 'z'; direction: number; speed: number; near: boolean; touched: boolean };
type Pickup = { group: THREE.Group; kind: 'fuel' | 'repair' | 'nitro'; x: number; z: number; cooldown: number; phase: number };
type Particle = { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; size: number };
const STORAGE_KEY = 'last-exit-best-v1';
const CHECKPOINTS = [{ x: 0, z: -64 }, { x: 128, z: -64 }, { x: 128, z: 128 }, { x: -64, z: 128 }, { x: -128, z: 0 }, { x: 64, z: -128 }, { x: 192, z: 64 }, { x: 0, z: 192 }, { x: -192, z: -64 }];
const closestRoad = (n: number) => ROAD_CENTERS.reduce((best, value) => Math.abs(n - value) < Math.abs(n - best) ? value : best, 0);

/** All rendering, physics, AI and audio run locally. No game server or API is used. */
export class LastExitGame {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(58, 1, .25, 1000);
  private sun = new THREE.DirectionalLight(0xffdab0, 3.1);
  private world: CityWorld;
  private player: CarVisual;
  private vehicle = initialVehicle();
  private input = emptyInput();
  private audio = new GameAudio();
  private rivals: Rival[] = [];
  private traffic: Traffic[] = [];
  private pickups: Pickup[] = [];
  private checkpoint = new THREE.Group();
  private targetIndex = 0;
  private particleMesh: THREE.InstancedMesh;
  private particles: Particle[] = [];
  private particleCursor = 0;
  private skidMesh: THREE.InstancedMesh;
  private skidCursor = 0;
  private skidClock = 0;
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();
  private cameraTarget = new THREE.Vector3();
  private lookTarget = new THREE.Vector3();
  private currentLook = new THREE.Vector3(0, 1, -140);
  private resizeObserver: ResizeObserver;
  private previousTime = 0;
  private accumulator = 0;
  private lastStats = 0;
  private lastMap = 0;
  private elapsed = 0;
  private damageCooldown = 0;
  private driftTime = 0;
  private messageUntil = 0;
  private shake = 0;
  private disposed = false;
  private muted = false;
  private endSoundTimer: ReturnType<typeof setTimeout> | null = null;
  private quality: GameQuality;
  private lowQuality = false;
  private slowFrames = 0;
  private stats: GameStats = { phase: 'ready', speed: 0, fuel: 100, health: 100, boost: 100, score: 0, best: 0, seconds: 150, heat: 1, deliveries: 0, objectiveDistance: 91, message: 'FOLLOW THE AMBER BEACON', reason: '', combo: 1 };

  constructor(private container: HTMLElement, private minimap: HTMLCanvasElement | null, private options: GameOptions) {
    this.quality = options.quality || 'auto';
    this.lowQuality = this.quality === 'low' || (this.quality === 'auto' && (window.innerWidth < 800 || navigator.hardwareConcurrency <= 4));
    this.renderer = new THREE.WebGLRenderer({ antialias: !this.lowQuality, powerPreference: 'high-performance', alpha: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = !this.lowQuality;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.lowQuality ? 1 : 1.7));
    this.renderer.domElement.setAttribute('aria-label', 'Last Exit 3D driving game. Use WASD or arrow keys to drive, Space to drift, Shift for nitro.');
    this.renderer.domElement.setAttribute('role', 'img');
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLost);
    container.appendChild(this.renderer.domElement);
    this.scene.fog = new THREE.Fog(0xd6b4a0, 100, 340);
    this.scene.add(new THREE.HemisphereLight(0xffefdc, 0x526a7b, 2.1));
    this.sun.position.set(-65, 95, -45);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 260 });
    this.sun.shadow.bias = -.00025;
    this.sun.shadow.normalBias = .045;
    this.scene.add(this.sun, this.sun.target);
    this.world = createWorld(this.scene, this.lowQuality);
    this.player = createCar(0xf4bf35);
    this.scene.add(this.player.group);
    this.createTraffic();
    this.createPickups();
    this.createCheckpoint();
    this.particleMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ transparent: true, opacity: .65, depthWrite: false }), 180);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.frustumCulled = false;
    for (let i = 0; i < 180; i++) {
      this.particles.push({ x: 0, y: -20, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 0 });
      this.dummy.scale.setScalar(0); this.dummy.updateMatrix(); this.particleMesh.setMatrixAt(i, this.dummy.matrix); this.particleMesh.setColorAt(i, new THREE.Color(0xffffff));
    }
    this.scene.add(this.particleMesh);
    this.skidMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(.24, 1.1), new THREE.MeshBasicMaterial({ color: 0x182027, transparent: true, opacity: .42, depthWrite: false }), 420);
    this.skidMesh.frustumCulled = false;
    for (let i = 0; i < 420; i++) { this.dummy.scale.setScalar(0); this.dummy.updateMatrix(); this.skidMesh.setMatrixAt(i, this.dummy.matrix); }
    this.scene.add(this.skidMesh);
    try { const best = Number(localStorage.getItem(STORAGE_KEY)); this.stats.best = Number.isFinite(best) ? clamp(best, 0, 1e12) : 0; } catch { /* Private browsing can deny storage. */ }
    this.camera.position.set(this.vehicle.x, 8.5, this.vehicle.z - 14);
    this.camera.lookAt(this.currentLook);
    this.player.group.position.set(this.vehicle.x, 0, this.vehicle.z);
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(container);
    this.resize();
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    window.addEventListener('blur', this.blur);
    document.addEventListener('visibilitychange', this.visibility);
    this.renderer.setAnimationLoop(this.frame);
    this.emitStats();
  }

  start() {
    if (this.disposed) return;
    this.stats.phase = 'playing'; this.previousTime = 0; this.accumulator = 0;
    void this.audio.unlock().then(() => { if (!this.disposed && this.stats.phase === 'playing') this.audio.play('start'); });
    this.emitStats();
  }
  pause() {
    if (this.disposed || this.stats.phase !== 'playing') return;
    this.stats.phase = 'paused'; this.input = emptyInput(); this.audio.suspend(); this.accumulator = 0; this.emitStats();
  }
  resume() {
    if (this.disposed || this.stats.phase !== 'paused') return;
    this.stats.phase = 'playing'; this.previousTime = 0; this.accumulator = 0; void this.audio.unlock(); this.emitStats();
  }
  restart() {
    if (this.disposed) return;
    if (this.endSoundTimer) { clearTimeout(this.endSoundTimer); this.endSoundTimer = null; }
    this.vehicle = initialVehicle(); this.input = emptyInput(); this.elapsed = 0; this.damageCooldown = 0; this.targetIndex = 0; this.driftTime = 0; this.shake = 0;
    this.stats = { ...this.stats, phase: 'playing', speed: 0, fuel: 100, health: 100, boost: 100, score: 0, seconds: 150, heat: 1, deliveries: 0, objectiveDistance: 91, message: 'FOLLOW THE AMBER BEACON', reason: '', combo: 1 };
    this.messageUntil = 4;
    this.rivals.forEach(rival => { this.scene.remove(rival.car.group, rival.pulse); this.disposeActor(rival.car.group); }); this.rivals = [];
    this.pickups.forEach(pickup => { pickup.cooldown = 0; pickup.group.visible = true; });
    this.traffic.forEach((traffic, i) => { traffic.near = false; traffic.touched = false; if (traffic.axis === 'x') traffic.x = (i * 43 % 380) - 190; else traffic.z = (i * 53 % 380) - 190; });
    for (const particle of this.particles) particle.life = 0;
    this.skidCursor = 0;
    for (let i = 0; i < 420; i++) { this.dummy.scale.setScalar(0); this.dummy.updateMatrix(); this.skidMesh.setMatrixAt(i, this.dummy.matrix); }
    this.skidMesh.instanceMatrix.needsUpdate = true;
    this.positionCheckpoint();
    this.camera.position.set(this.vehicle.x, 8.5, this.vehicle.z - 14); this.currentLook.set(this.vehicle.x, 1.2, this.vehicle.z + 8);
    this.previousTime = 0; this.accumulator = 0; void this.audio.unlock().then(() => { if (!this.disposed && this.stats.phase === 'playing') this.audio.play('start'); }); this.emitStats();
  }
  setInput(partial: Partial<GameInput>) { if (!this.disposed) Object.assign(this.input, partial); }
  setMuted(muted: boolean) { this.muted = muted; this.audio.setMuted(muted); this.options.onMuted?.(muted); }
  setQuality(quality: GameQuality) {
    this.quality = quality;
    this.lowQuality = quality === 'low' || (quality === 'auto' && (window.innerWidth < 800 || navigator.hardwareConcurrency <= 4));
    this.renderer.shadowMap.enabled = !this.lowQuality;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.lowQuality ? 1 : 1.7));
    this.resize();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.renderer.setAnimationLoop(null);
    if (this.endSoundTimer) clearTimeout(this.endSoundTimer);
    window.removeEventListener('keydown', this.keyDown); window.removeEventListener('keyup', this.keyUp); window.removeEventListener('blur', this.blur); document.removeEventListener('visibilitychange', this.visibility);
    this.resizeObserver.disconnect(); this.audio.dispose();
    this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLost);
    this.world.dispose();
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
    this.scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          materials.add(material);
          for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
        }
      }
    });
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); textures.forEach(texture => texture.dispose());
    this.particleMesh.dispose(); this.skidMesh.dispose(); this.sun.shadow.dispose(); this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove(); this.scene.clear();
  }

  private disposeActor(group: THREE.Group) {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    group.traverse(object => { if (object instanceof THREE.Mesh) { geometries.add(object.geometry); for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material); } });
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); group.clear();
  }

  private emitStats() { if (!this.disposed) this.options.onStats({ ...this.stats, speed: Math.round(this.stats.speed), score: Math.floor(this.stats.score) }); }
  private resize = () => {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth), height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height, false); this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
  };
  private contextLost = (event: Event) => { event.preventDefault(); this.pause(); this.options.onError('The graphics connection was interrupted. Reload the game to reconnect.'); };
  private blur = () => { this.input = emptyInput(); this.pause(); };
  private visibility = () => { if (document.hidden) this.blur(); };
  private control(code: string): keyof GameInput | undefined {
    return ({ KeyW: 'throttle', ArrowUp: 'throttle', KeyS: 'brake', ArrowDown: 'brake', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', Space: 'drift', ShiftLeft: 'boost', ShiftRight: 'boost' } as Record<string, keyof GameInput>)[code];
  }
  private keyDown = (event: KeyboardEvent) => {
    if (this.disposed || (event.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(event.target.tagName))) return;
    if (event.target instanceof HTMLButtonElement && (event.code === 'Space' || event.code === 'Enter')) return;
    const control = this.control(event.code);
    if (control) { event.preventDefault(); if (this.stats.phase === 'playing') this.input[control] = true; }
    if (event.repeat) return;
    if (event.code === 'Escape' || event.code === 'KeyP') { event.preventDefault(); if (this.stats.phase === 'playing') this.pause(); else if (this.stats.phase === 'paused') this.resume(); }
    if (event.code === 'KeyR') { event.preventDefault(); this.restart(); }
    if (event.code === 'KeyM') { event.preventDefault(); this.setMuted(!this.muted); }
  };
  private keyUp = (event: KeyboardEvent) => { const control = this.control(event.code); if (control) this.input[control] = false; };

  private frame = (time: number) => {
    if (this.disposed) return;
    const dt = this.previousTime ? Math.min((time - this.previousTime) / 1000, .1) : 0;
    this.previousTime = time;
    if (this.stats.phase === 'playing') {
      this.accumulator += dt;
      for (let steps = 0; this.accumulator >= 1 / 60 && steps < 6; steps++) { this.update(1 / 60); this.accumulator -= 1 / 60; if (this.stats.phase !== 'playing') { this.accumulator = 0; break; } }
      if (this.quality === 'auto' && !this.lowQuality && dt > .035) this.slowFrames += dt; else this.slowFrames = Math.max(0, this.slowFrames - dt * .2);
      if (this.slowFrames > 3) { this.lowQuality = true; this.renderer.shadowMap.enabled = false; this.renderer.setPixelRatio(1); this.resize(); }
    }
    this.render(dt);
    if (time - this.lastStats > 90) { this.emitStats(); this.lastStats = time; }
    if (time - this.lastMap > 100) { this.drawMap(); this.lastMap = time; }
  };

  private update(dt: number) {
    this.elapsed += dt; this.stats.seconds = Math.max(0, this.stats.seconds - dt);
    const boosting = this.input.boost && this.input.throttle && this.stats.boost > .8;
    const result = stepVehicle(this.vehicle, this.input, dt, boosting, this.world.colliders);
    this.stats.speed = result.speed * 3.6;
    this.stats.fuel = clamp(this.stats.fuel - dt * (.38 + result.speed * .014 + (boosting ? .55 : 0)), 0, 100);
    this.stats.boost = clamp(this.stats.boost + dt * (boosting ? -27 : result.drift ? 20 : 7.5), 0, 100);
    this.damageCooldown = Math.max(0, this.damageCooldown - dt);
    this.stats.score += result.speed * dt * 2;
    if (result.impact > 5) this.crash(result.impact);
    if (result.drift) {
      this.driftTime += dt; this.stats.combo = Math.min(4, 1 + Math.floor(this.driftTime / 1.4));
      this.stats.score += dt * 105 * this.stats.combo;
      if (this.elapsed > this.messageUntil) this.stats.message = `DRIFT ×${this.stats.combo}  +${Math.floor(this.driftTime * 105)}`;
      this.skidClock += dt;
      if (this.skidClock > .035) { this.addSkids(); this.skidClock = 0; this.spawnParticles(2, 0xa8b0af, .55, .8); }
    } else { this.driftTime = 0; this.stats.combo = 1; }
    if (this.elapsed > this.messageUntil && !result.drift) this.stats.message = 'FOLLOW THE AMBER BEACON';
    this.player.exhaust.visible = boosting;
    if (boosting && Math.random() < .7) this.spawnParticles(2, 0x70e7f2, .3, .4);
    if (this.stats.health < 28 && Math.random() < .15) this.spawnParticles(1, 0x5b6265, 1.8, 1.2);
    for (const light of this.player.brakeLights) {
      const material = light.material as THREE.MeshStandardMaterial;
      if ('emissiveIntensity' in material) material.emissiveIntensity = this.input.brake || this.input.drift ? 3 : .65;
    }
    this.stats.heat = clamp(1 + Math.floor(this.elapsed / 35) + Math.floor(this.stats.deliveries / 3), 1, 5);
    const wanted = this.elapsed < 7 ? 0 : Math.min(4, this.stats.heat + 1);
    if (this.rivals.length < wanted) this.spawnRival(this.rivals.length);
    this.updateRivals(dt);
    this.updateTraffic(dt);
    this.updatePickups(dt);
    const target = CHECKPOINTS[this.targetIndex];
    this.stats.objectiveDistance = Math.hypot(this.vehicle.x - target.x, this.vehicle.z - target.z);
    this.stats.objectiveBearing = angleDifference(Math.atan2(target.x - this.vehicle.x, target.z - this.vehicle.z), this.vehicle.heading);
    if (this.stats.objectiveDistance < 7.5) {
      this.stats.deliveries++; this.stats.score += 1200 + 200 * this.stats.heat; this.stats.seconds = Math.min(210, this.stats.seconds + 15); this.stats.boost = clamp(this.stats.boost + 25, 0, 100);
      this.notify(`CHECKPOINT  +15s  +${(1200 + 200 * this.stats.heat).toLocaleString('en-US')}`, 3); this.audio.play('delivery'); this.spawnParticles(26, 0xffd16b, 1.4, 1.4);
      this.targetIndex = (this.targetIndex + 1) % CHECKPOINTS.length; this.positionCheckpoint();
    }
    this.updateParticles(dt);
    this.audio.update(result.speed, this.input.throttle, boosting, this.rivals.some(r => Math.hypot(r.vehicle.x - this.vehicle.x, r.vehicle.z - this.vehicle.z) < 70) ? this.stats.heat : 0);
    if (this.stats.health <= 0) this.end('CAR WRECKED');
    else if (this.stats.fuel <= 0) this.end('OUT OF FUEL');
    else if (this.stats.seconds <= 0) this.end('SHIFT COMPLETE');
  }

  private render(dt: number) {
    const { x, z, heading, vx, vz } = this.vehicle;
    this.player.group.position.set(x, .035 + Math.sin(this.elapsed * 18) * Math.min(this.stats.speed / 4000, .035), z);
    this.player.group.rotation.y = heading;
    this.player.group.rotation.z = THREE.MathUtils.lerp(this.player.group.rotation.z, (Number(this.input.left) - Number(this.input.right)) * -.035 * Math.min(this.stats.speed / 70, 1), .12);
    if (this.stats.phase === 'playing') {
      for (const wheel of this.player.wheels) wheel.rotation.x += (vx * Math.sin(heading) + vz * Math.cos(heading)) * dt * 2.2;
      for (const traffic of this.traffic) for (const wheel of traffic.car.wheels) wheel.rotation.x += traffic.speed * dt * 2;
      for (const rival of this.rivals) for (const wheel of rival.car.wheels) wheel.rotation.x += 40 * dt;
    }
    const speed = this.stats.speed / 3.6, follow = 14 + Math.min(speed / 18, 3);
    this.cameraTarget.set(x - Math.sin(heading) * follow - vx * .08, 8.2 + speed * .025, z - Math.cos(heading) * follow - vz * .08);
    const blend = 1 - Math.exp(-Math.max(dt, .001) * 5);
    this.camera.position.lerp(this.cameraTarget, blend);
    this.lookTarget.set(x + Math.sin(heading) * 7, 1.1, z + Math.cos(heading) * 7);
    this.currentLook.lerp(this.lookTarget, 1 - Math.exp(-Math.max(dt, .001) * 8));
    this.shake = Math.max(0, this.shake - dt * 2);
    if (this.shake > 0) this.camera.position.y += Math.sin(this.elapsed * 80) * this.shake * .14;
    // Shorten the chase camera before it clips through a building on tight turns.
    const cameraRay = new THREE.Vector3().subVectors(this.camera.position, new THREE.Vector3(x, 3, z));
    const cameraDistance = Math.hypot(cameraRay.x, cameraRay.z);
    if (cameraDistance > 1 && !clearRoad(x, z, this.camera.position.x, this.camera.position.z, this.world.colliders)) {
      this.camera.position.x = x - Math.sin(heading) * 5; this.camera.position.z = z - Math.cos(heading) * 5; this.camera.position.y = 10;
    }
    this.camera.lookAt(this.currentLook);
    const fov = 58 + Math.min(speed / 6, 9) + (this.input.boost && this.stats.boost > 1 ? 4 : 0);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, fov, .04); this.camera.updateProjectionMatrix();
    this.sun.position.set(x - 65, 95, z - 45); this.sun.target.position.set(x, 0, z);
    this.checkpoint.children.forEach((child, i) => { if (i === 1) { child.rotation.y = this.elapsed; child.position.y = 4 + Math.sin(this.elapsed * 2) * .5; } });
    this.renderer.render(this.scene, this.camera);
  }

  private notify(message: string, duration = 2) { this.stats.message = message; this.messageUntil = this.elapsed + duration; }
  private crash(impact: number) {
    if (this.damageCooldown > 0 || this.elapsed < 3) return;
    this.stats.health = Math.max(0, this.stats.health - clamp(impact * .63, 5, 26)); this.damageCooldown = .85; this.shake = Math.min(impact / 14, 1.4);
    this.audio.play('crash'); this.spawnParticles(14, 0xffad54, .6, 1); this.notify('WATCH THE BODYWORK', 1.5);
  }
  private end(reason: string) {
    this.stats.phase = 'over'; this.stats.reason = reason; this.stats.best = Math.max(this.stats.best, Math.floor(this.stats.score)); this.input = emptyInput(); this.audio.play('end');
    this.endSoundTimer = setTimeout(() => { if (!this.disposed && this.stats.phase === 'over') this.audio.suspend(); this.endSoundTimer = null; }, 750);
    try { localStorage.setItem(STORAGE_KEY, String(this.stats.best)); } catch { /* Scores remain available for this visit. */ }
    this.emitStats();
  }

  private createCheckpoint() {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(6, .16, 6, 48), new THREE.MeshBasicMaterial({ color: 0xffcd68 })); ring.rotation.x = Math.PI / 2; ring.position.y = .12;
    const marker = new THREE.Mesh(new THREE.OctahedronGeometry(1.35), new THREE.MeshStandardMaterial({ color: 0xffca61, emissive: 0xcc7824, emissiveIntensity: .9, metalness: .5, roughness: .2 })); marker.position.y = 4;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 5, 19, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd386, transparent: true, opacity: .075, side: THREE.DoubleSide, depthWrite: false })); beam.position.y = 9.5;
    this.checkpoint.add(ring, marker, beam); this.scene.add(this.checkpoint); this.positionCheckpoint();
  }
  private positionCheckpoint() { const target = CHECKPOINTS[this.targetIndex]; this.checkpoint.position.set(target.x, 0, target.z); }

  private createPickups() {
    const spots: [number, number][] = [[-4,-108], [64,-28], [-64,-93], [99,-64], [124,32], [-4,91], [-128,30], [-35,128], [188,-108], [-64,160], [-164,-128], [31,-192], [64,96], [-95,0], [-128,158], [155,192], [-4,180], [99,0], [-192,-28], [159,-128], [64,-156], [-128,-160], [188,97], [-161,64]];
    spots.forEach(([x,z], index) => {
      const kind = (['fuel', 'repair', 'nitro'] as const)[index % 3];
      const color = kind === 'fuel' ? 0x83e3b4 : kind === 'repair' ? 0xff8c81 : 0x80d6ff;
      const group = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, .07, 5, 20), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .7 })); ring.rotation.x = Math.PI / 2; ring.position.y = -.9; group.add(ring);
      const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .45, metalness: .25, roughness: .3 });
      if (kind === 'fuel') {
        const can = new THREE.Mesh(new THREE.BoxGeometry(1,.95,.6), material); const neck = new THREE.Mesh(new THREE.BoxGeometry(.3,.26,.4), material); neck.position.set(.25,.58,0);
        const handle = new THREE.Mesh(new THREE.TorusGeometry(.22,.07,5,8,Math.PI), material); handle.position.set(-.12,.55,0); group.add(can,neck,handle);
      } else if (kind === 'repair') {
        group.add(new THREE.Mesh(new THREE.BoxGeometry(1.25,.4,.4), material),new THREE.Mesh(new THREE.BoxGeometry(.4,1.25,.4),material));
      } else {
        const shape = new THREE.Shape(); shape.moveTo(.15,.85); shape.lineTo(-.6,-.05); shape.lineTo(-.1,-.05); shape.lineTo(-.15,-.85); shape.lineTo(.6,.1); shape.lineTo(.1,.1); shape.closePath();
        group.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.22,bevelEnabled:false}),material));
      }
      group.position.set(x,1.4,z); this.scene.add(group); this.pickups.push({group,kind,x,z,cooldown:0,phase:index});
    });
  }
  private updatePickups(dt: number) {
    for (const pickup of this.pickups) {
      if (pickup.cooldown > 0) { pickup.cooldown -= dt; pickup.group.visible = pickup.cooldown <= 0; continue; }
      pickup.group.rotation.y += dt * .9; pickup.group.position.y = 1.4 + Math.sin(this.elapsed * 2 + pickup.phase) * .22;
      if (Math.hypot(pickup.x - this.vehicle.x, pickup.z - this.vehicle.z) < 3.5) {
        pickup.cooldown = 28; pickup.group.visible = false; this.stats.score += 150;
        if (pickup.kind === 'fuel') { this.stats.fuel = Math.min(100,this.stats.fuel+36); this.notify('FUEL +36'); }
        else if (pickup.kind === 'repair') { this.stats.health = Math.min(100,this.stats.health+32); this.notify('BODYWORK +32'); }
        else { this.stats.boost = Math.min(100,this.stats.boost+50); this.notify('NITRO +50'); }
        this.audio.play('pickup'); this.spawnParticles(10,pickup.kind === 'repair'?0xff8c81:0x83e3b4,.65,.8);
      }
    }
  }

  private createTraffic() {
    const colors = [0x91c0bd,0xd7d2c5,0x984f42,0x4d7297,0xb8ad85,0x777d81];
    for (let i=0;i<14;i++) {
      const car=createCar(colors[i%colors.length],false,true); const axis=i%2===0?'x':'z'; const direction=i%4<2?1:-1; const road=ROAD_CENTERS[(i*3+1)%7];
      const x=axis==='x'?(i*43%380)-190:road+(direction===1?-4:4),z=axis==='z'?(i*53%380)-190:road+(direction===1?4:-4);
      car.group.rotation.y=axis==='x'?direction*Math.PI/2:direction===1?0:Math.PI; car.group.position.set(x,0,z); car.exhaust.visible=false;
      this.scene.add(car.group); this.traffic.push({car,x,z,axis,direction,speed:9+(i%4)*2,near:false,touched:false});
    }
  }
  private updateTraffic(dt: number) {
    for (const traffic of this.traffic) {
      traffic[traffic.axis]+=traffic.direction*traffic.speed*dt;
      if(traffic[traffic.axis]>209)traffic[traffic.axis]=-209; if(traffic[traffic.axis]<-209)traffic[traffic.axis]=209;
      traffic.car.group.position.set(traffic.x,0,traffic.z);
      const dx=this.vehicle.x-traffic.x,dz=this.vehicle.z-traffic.z,distance=Math.hypot(dx,dz);
      if(distance<2.8&&distance>.01) {
        this.vehicle.x+=dx/distance*(2.8-distance); this.vehicle.z+=dz/distance*(2.8-distance);
        const impact=Math.hypot(this.vehicle.vx-(traffic.axis==='x'?traffic.direction*traffic.speed:0),this.vehicle.vz-(traffic.axis==='z'?traffic.direction*traffic.speed:0));
        this.vehicle.vx*=.7;this.vehicle.vz*=.7;this.crash(impact*.7); traffic.touched=true; traffic.near=false;
      } else if(distance<5.8&&!traffic.near&&this.stats.speed>65) {
        traffic.near=true;
      }
      if(distance>7&&traffic.near&&!traffic.touched) { traffic.near=false;this.stats.score+=200;this.stats.boost=Math.min(100,this.stats.boost+12);this.notify('NEAR MISS +200');this.audio.play('nearMiss'); }
      if(distance>12){traffic.near=false;traffic.touched=false;}
    }
  }

  private spawnRival(index: number) {
    const car=createCar(0x253746,true,true), point=this.rivalSpawn(index);
    const vehicle:Vehicle={x:point.x,z:point.z,vx:0,vz:0,heading:this.vehicle.heading};
    const pulse=new THREE.PointLight(0xff4b47,2,10);pulse.position.set(vehicle.x,2,vehicle.z);this.scene.add(car.group,pulse);
    car.exhaust.visible=false;
    this.rivals.push({car,vehicle,target:{x:vehicle.x,z:vehicle.z},replan:0,stuck:0,previousX:vehicle.x,previousZ:vehicle.z,pulse});
    if(index===0)this.notify('THEY FOUND YOU. KEEP MOVING.',3);
  }
  private rivalSpawn(index: number) {
    let best = { x: -192, z: -192 }, bestScore = Infinity;
    for (const x of ROAD_CENTERS) for (const z of ROAD_CENTERS) {
      const dx = x - this.vehicle.x, dz = z - this.vehicle.z, distance = Math.hypot(dx, dz);
      if (distance < 52 || distance > 170 || this.rivals.some(r => Math.hypot(r.vehicle.x - x, r.vehicle.z - z) < 20)) continue;
      const ahead = (dx * Math.sin(this.vehicle.heading) + dz * Math.cos(this.vehicle.heading)) / distance;
      const score = Math.abs(distance - (75 + index * 8)) + ahead * 32 + Math.abs(dx) * (index % 2 ? .02 : -.02);
      if (score < bestScore) { bestScore = score; best = { x, z }; }
    }
    return best;
  }
  private updateRivals(dt: number) {
    this.rivals.forEach((rival,index)=>{
      const v=rival.vehicle,distance=Math.hypot(v.x-this.vehicle.x,v.z-this.vehicle.z);
      rival.replan-=dt;
      const targetDistance=Math.hypot(v.x-rival.target.x,v.z-rival.target.z);
      if((distance<39&&clearRoad(v.x,v.z,this.vehicle.x,this.vehicle.z,this.world.colliders))) {
        rival.target={x:this.vehicle.x+this.vehicle.vx*.35,z:this.vehicle.z+this.vehicle.vz*.35};
      } else if(targetDistance<5 || rival.replan<0) {
        const nx=closestRoad(v.x),nz=closestRoad(v.z),px=closestRoad(this.vehicle.x),pz=closestRoad(this.vehicle.z);
        // Reach the next street junction before turning toward the player's junction.
        if(Math.abs(v.x-nx)>6&&Math.abs(v.z-nz)>6)rival.target={x:nx,z:nz};
        else if(Math.abs(v.x-nx)>6)rival.target={x:nx,z:nz};
        else if(Math.abs(v.z-nz)>6)rival.target={x:nx,z:nz};
        else if(Math.abs(px-nx)>.1&&(Math.abs(px-nx)>=Math.abs(pz-nz)||index%2===0))rival.target={x:nx+Math.sign(px-nx)*64,z:nz};
        else if(Math.abs(pz-nz)>.1)rival.target={x:nx,z:nz+Math.sign(pz-nz)*64};
        else rival.target={x:this.vehicle.x,z:this.vehicle.z};
        rival.replan=3;
      }
      const desired=Math.atan2(rival.target.x-v.x,rival.target.z-v.z),delta=angleDifference(desired,v.heading);
      v.heading+=clamp(delta,-2.1*dt,2.1*dt);
      const targetSpeed=(20+this.stats.heat*2.1+index*.6)*(Math.abs(delta)>1?.43:1);
      const fx=Math.sin(v.heading),fz=Math.cos(v.heading);
      v.vx=THREE.MathUtils.lerp(v.vx,fx*targetSpeed,dt*3.4);v.vz=THREE.MathUtils.lerp(v.vz,fz*targetSpeed,dt*3.4);
      v.x+=v.vx*dt;v.z+=v.vz*dt;const impact=resolveCollisions(v,this.world.colliders,1.4);
      if(impact>4)rival.replan=0;
      if(Math.hypot(v.x-rival.previousX,v.z-rival.previousZ)<dt*2)rival.stuck+=dt;else rival.stuck=Math.max(0,rival.stuck-dt*.4);
      rival.previousX=v.x;rival.previousZ=v.z;
      if(rival.stuck>2.5||distance>240) {
        const point=this.rivalSpawn(index);v.x=point.x;v.z=point.z;v.vx=0;v.vz=0;rival.stuck=0;rival.replan=0;
      }
      const dx=this.vehicle.x-v.x,dz=this.vehicle.z-v.z,d=Math.hypot(dx,dz);
      if(d<2.9&&d>.001) {
        this.vehicle.x+=dx/d*(2.9-d)*.6;this.vehicle.z+=dz/d*(2.9-d)*.6;v.x-=dx/d*(2.9-d)*.4;v.z-=dz/d*(2.9-d)*.4;
        this.vehicle.vx+=dx/d*dt*16;this.vehicle.vz+=dz/d*dt*16;
        this.crash(Math.max(8,Math.hypot(this.vehicle.vx-v.vx,this.vehicle.vz-v.vz)*.75));
      }
      rival.car.group.position.set(v.x,0,v.z);rival.car.group.rotation.y=v.heading;rival.pulse.position.set(v.x,2.2,v.z);
      rival.pulse.color.setHex(Math.sin(this.elapsed*12+index)>0?0xff4545:0x568aff);rival.pulse.intensity=this.lowQuality?0:1.8;
    });
  }

  private spawnParticles(count:number,color:number,life:number,size:number) {
    const heading=this.vehicle.heading;
    for(let i=0;i<count;i++) {
      const index=this.particleCursor++%this.particles.length,p=this.particles[index];
      p.x=this.vehicle.x-Math.sin(heading)*2+(Math.random()-.5)*1.5;p.z=this.vehicle.z-Math.cos(heading)*2+(Math.random()-.5)*1.5;p.y=.4+Math.random()*.5;
      p.vx=(Math.random()-.5)*6-this.vehicle.vx*.1;p.vz=(Math.random()-.5)*6-this.vehicle.vz*.1;p.vy=1+Math.random()*3;p.life=life;p.max=life;p.size=size*(.3+Math.random()*.7);
      this.color.setHex(color);this.particleMesh.setColorAt(index,this.color);
    }
    if(this.particleMesh.instanceColor)this.particleMesh.instanceColor.needsUpdate=true;
  }
  private updateParticles(dt:number) {
    this.particles.forEach((p,i)=>{
      if(p.life>0) {p.life-=dt;p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;p.vy-=dt*1.6;this.dummy.position.set(p.x,p.y,p.z);this.dummy.scale.setScalar(Math.max(0,p.life/p.max)*p.size);}
      else {this.dummy.position.set(0,-10,0);this.dummy.scale.setScalar(0);}
      this.dummy.rotation.set(0,0,0);this.dummy.updateMatrix();this.particleMesh.setMatrixAt(i,this.dummy.matrix);
    });this.particleMesh.instanceMatrix.needsUpdate=true;
  }
  private addSkids() {
    for(const offset of [-.86,.86]) {
      this.dummy.position.set(this.vehicle.x-Math.sin(this.vehicle.heading)*1.4+Math.cos(this.vehicle.heading)*offset,.045,this.vehicle.z-Math.cos(this.vehicle.heading)*1.4-Math.sin(this.vehicle.heading)*offset);
      this.dummy.rotation.set(-Math.PI/2,0,-this.vehicle.heading);this.dummy.scale.set(1,1,1);this.dummy.updateMatrix();this.skidMesh.setMatrixAt(this.skidCursor++%420,this.dummy.matrix);
    }this.skidMesh.instanceMatrix.needsUpdate=true;
  }

  private drawMap() {
    if(!this.minimap)return;
    const ctx=this.minimap.getContext('2d');if(!ctx)return;
    const w=this.minimap.width,h=this.minimap.height,scale=Math.min(w,h)/470;
    const mx=(x:number)=>w/2+x*scale,mz=(z:number)=>h/2-z*scale;
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#17242a';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#3f5356';ctx.lineWidth=17*scale;
    for(const road of ROAD_CENTERS) {ctx.beginPath();ctx.moveTo(mx(road),mz(-213));ctx.lineTo(mx(road),mz(213));ctx.stroke();ctx.beginPath();ctx.moveTo(mx(-213),mz(road));ctx.lineTo(mx(213),mz(road));ctx.stroke();}
    ctx.fillStyle='#28393d';for(const c of this.world.colliders)ctx.fillRect(mx(c.x-c.halfX),mz(c.z+c.halfZ),c.halfX*2*scale,c.halfZ*2*scale);
    for(const pickup of this.pickups)if(pickup.cooldown<=0){ctx.fillStyle=pickup.kind==='fuel'?'#83e3b4':pickup.kind==='repair'?'#ff8c81':'#80d6ff';ctx.fillRect(mx(pickup.x)-1.4,mz(pickup.z)-1.4,2.8,2.8);}
    const target=CHECKPOINTS[this.targetIndex];ctx.strokeStyle='#ffd36c';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(mx(target.x),mz(target.z),5,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#ffd36c';ctx.fillRect(mx(target.x)-1.5,mz(target.z)-1.5,3,3);
    ctx.fillStyle='#f57c7c';for(const rival of this.rivals){ctx.beginPath();ctx.arc(mx(rival.vehicle.x),mz(rival.vehicle.z),2.7,0,Math.PI*2);ctx.fill();}
    ctx.save();ctx.translate(mx(this.vehicle.x),mz(this.vehicle.z));ctx.rotate(this.vehicle.heading);ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(4,4);ctx.lineTo(0,2);ctx.lineTo(-4,4);ctx.closePath();ctx.fillStyle='#ffffff';ctx.fill();ctx.restore();
    ctx.fillStyle='#b5c7c7';ctx.font='9px monospace';ctx.fillText('N',w-14,13);
  }
}
