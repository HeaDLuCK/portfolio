import * as THREE from 'three';
import { HorrorAudio } from './audio';
import { createHollow, createHorrorWorld } from './world';
import { cellToWorld, HOLLOW_START, EXIT_CELL, findPath, FUSE_CELLS, moveCharacter, OPEN_CELLS, SPAWN_CELL, visibleBetween, worldToCell, type Cell } from './level';
import { CELL_SIZE, type HollowVisual, type HorrorInput, type HorrorOptions, type HorrorPhase, type HorrorQuality, type HorrorStats, type HorrorWorld } from './types';
import type { HollowCoop } from './multiplayer';
import type { RoomPlayer, RoomSnapshot } from './multiplayer-types';

const emptyInput = (): HorrorInput => ({ forward: false, backward: false, left: false, right: false, sprint: false });
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const angleDelta = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const INITIAL: HorrorStats = { phase: 'ready', fuses: 0, totalFuses: 3, stamina: 100, battery: 100, flashlight: true, danger: 0, elapsed: 0, prompt: '', message: 'Restore the three circuits. Find the exit.', caption: '', introProgress: 0, locked: false, muted: false };

/** Solo horror and optional private co-op. Multiplayer relays anonymous game poses. */
export class HorrorGame {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(70, 1, .07, 100);
  private world: HorrorWorld;
  private hollow: HollowVisual;
  private audio = new HorrorAudio();
  private stats: HorrorStats = { ...INITIAL };
  private input = emptyInput();
  private position = cellToWorld(SPAWN_CELL.x, SPAWN_CELL.z);
  private hollowPosition = cellToWorld(HOLLOW_START.x, HOLLOW_START.z);
  private yaw = 0;
  private pitch = 0;
  private turnLeft = false;
  private turnRight = false;
  private flashlight = new THREE.SpotLight(0xffefd1, 45, 28, .48, .7, 1.25);
  private flashlightTarget = new THREE.Object3D();
  private lamps: THREE.PointLight[] = [];
  private hemisphere = new THREE.HemisphereLight(0xbeb393, 0x1c1b13, .62);
  private resizeObserver: ResizeObserver;
  private previousTime = 0;
  private accumulator = 0;
  private lastStats = 0;
  private elapsed = 0;
  private introTime = 0;
  private introFigure: THREE.Group;
  private activeFuses = new Set<number>();
  private hollowPath: Cell[] = [];
  private pathTimer = 0;
  private memory = 0;
  private lastKnown = { ...this.position };
  private directorTime = 0;
  private walkClock = 0;
  private messageUntil = 0;
  private captionUntil = 0;
  private scareTime = 0;
  private ambientTime = 12;
  private hunt = false;
  private introEvent = -1;
  private pausePhase: HorrorPhase = 'playing';
  private disposed = false;
  private lowQuality = false;
  private dragging = false;
  private dragX = 0;
  private dragY = 0;
  private endTimer: ReturnType<typeof setTimeout> | null = null;
  private quality: HorrorQuality;
  private reducedMotion: boolean;
  private slowFrames = 0;
  private coop: HollowCoop | null = null;
  private roomSnapshot: RoomSnapshot | null = null;
  private coopRound = -1;
  private poseClock = 0;
  private worldClock = 0;
  private roomWasPaused = false;
  private monsterYaw = 0;
  private teammates = new Map<string, { group: THREE.Group; target: RoomPlayer }>();

  constructor(private container: HTMLElement, private options: HorrorOptions) {
    this.quality = options.quality || 'auto';
    this.reducedMotion = options.reducedMotion ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.lowQuality = this.quality === 'low' || (this.quality === 'auto' && (window.innerWidth < 800 || navigator.hardwareConcurrency <= 4));
    this.renderer = new THREE.WebGLRenderer({ antialias: !this.lowQuality, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.13;
    this.renderer.shadowMap.enabled = !this.lowQuality;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.lowQuality ? 1 : 1.65));
    const canvas = this.renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', 'The Backrooms: The Hollow. First person horror. WASD to walk, Shift to run, E to interact, F for flashlight. Drag or use the mouse to look.');
    canvas.addEventListener('webglcontextlost', this.contextLost);
    canvas.addEventListener('pointerdown', this.pointerDown);
    canvas.addEventListener('pointerup', this.pointerUp);
    canvas.addEventListener('pointercancel', this.pointerUp);
    canvas.addEventListener('click', this.requestControl);
    container.appendChild(canvas);
    this.scene.background = new THREE.Color(0x15150e);
    this.scene.fog = new THREE.FogExp2(0x18180f, .033);
    this.scene.add(this.hemisphere, this.camera);
    this.world = createHorrorWorld(this.scene, this.lowQuality);
    this.hollow = createHollow();
    this.world.root.add(this.hollow.group);
    this.hollow.group.position.set(this.hollowPosition.x, 0, this.hollowPosition.z);
    this.flashlight.position.set(.14, -.14, -.12);
    this.flashlightTarget.position.set(0, 0, -1);
    this.camera.add(this.flashlight, this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;
    this.flashlight.castShadow = !this.lowQuality;
    this.flashlight.shadow.mapSize.set(1024, 1024);
    this.flashlight.shadow.camera.near = .15;
    this.flashlight.shadow.bias = -.00015;
    this.flashlight.shadow.normalBias = .015;
    for (let i = 0; i < 5; i++) {
      const light = new THREE.PointLight(0xffdf9e, 20, 15, 1.8); this.scene.add(light); this.lamps.push(light);
    }
    this.introFigure = this.createAdultFigure();
    this.world.root.add(this.introFigure);
    this.resizeObserver = new ResizeObserver(this.resize); this.resizeObserver.observe(container); this.resize();
    window.addEventListener('keydown', this.keyDown); window.addEventListener('keyup', this.keyUp); window.addEventListener('blur', this.blur);
    document.addEventListener('mousemove', this.mouseMove); document.addEventListener('pointerup', this.pointerUp); document.addEventListener('pointerlockchange', this.lockChanged); document.addEventListener('visibilitychange', this.visibility);
    this.camera.rotation.order = 'YXZ';
    this.renderer.setAnimationLoop(this.frame);
    this.emit();
  }

  start() {
    if (this.disposed) return;
    this.stats.phase = 'intro'; this.introTime = 0; this.introEvent = -1; this.previousTime = 0;
    void this.audio.unlock().then(() => { if (!this.disposed && this.stats.phase === 'intro') this.audio.play('start'); });
    this.emit();
  }
  configureCoop(coop: HollowCoop) {
    this.coop = coop; this.introFigure.visible = false; this.stats.phase = 'ready';
  }
  applyRoomSnapshot(snapshot: RoomSnapshot) {
    if (this.disposed || !this.coop) return;
    this.roomSnapshot = snapshot;
    const self = snapshot.players.find(player => player.id === snapshot.you);
    if (!self) return;
    if (snapshot.run.status !== 'lobby' && snapshot.run.round !== this.coopRound) {
      this.coopRound = snapshot.run.round;
      this.resetRun(); this.position = { x: self.x, z: self.z }; this.yaw = self.yaw;
      this.hollowPosition = { x: snapshot.run.monster.x, z: snapshot.run.monster.z };
    }
    if (snapshot.run.status !== 'lobby') {
      if (snapshot.you !== snapshot.host) {
        this.hollowPosition = { x: snapshot.run.monster.x, z: snapshot.run.monster.z };
        this.hollow.group.rotation.y = snapshot.run.monster.yaw; this.hunt = snapshot.run.monster.hunt; this.elapsed = snapshot.run.elapsed;
      }
      const oldCount = this.activeFuses.size;
      this.activeFuses = new Set(snapshot.run.fuses); this.stats.fuses = this.activeFuses.size;
      this.world.fuseModels.forEach((model, i) => model.visible = !this.activeFuses.has(i));
      if (this.activeFuses.size > oldCount) {
        this.audio.play('fuse'); this.stats.battery = Math.min(100, this.stats.battery + 18);
        this.notify(this.stats.fuses === 3 ? 'All circuits restored. Find the red exit door.' : `A teammate restored a circuit. ${3-this.stats.fuses} remain.`, 5);
        this.lastKnown = { ...this.position }; this.memory = 7; this.hunt = true;
      }
      // Reconcile only meaningful server corrections, preserving smooth local movement.
      if (Math.hypot(self.x-this.position.x,self.z-this.position.z)>1.2) this.position={x:self.x,z:self.z};
      if (snapshot.run.status === 'escaped') {
        if (this.stats.phase !== 'escaped') { if (this.stats.phase !== 'playing') this.stats.phase = 'playing'; this.finish('escaped'); }
      } else if (!self.alive && this.stats.phase !== 'caught') {
        this.stats.phase = 'playing'; this.finish('caught');
      }
    }
    const current = new Set<string>();
    for (const player of snapshot.players) {
      if (player.id === snapshot.you) continue;
      current.add(player.id);
      let peer = this.teammates.get(player.id);
      if (!peer) {
        const group = this.createAdultFigure(player.color);
        group.position.set(player.x,0,player.z); this.world.root.add(group);
        peer = {group,target:player}; this.teammates.set(player.id,peer);
      }
      peer.target = player; peer.group.visible = player.alive && !player.escaped;
    }
    for (const [id, peer] of this.teammates) if (!current.has(id)) { this.releaseFigure(peer.group); this.teammates.delete(id); }
  }
  skipIntro() {
    if (this.disposed || (this.stats.phase !== 'intro' && this.stats.phase !== 'ready')) return;
    this.stats.phase = 'playing'; this.stats.caption = ''; this.stats.introProgress = 1; this.stats.message = 'Restore the three circuits. Find the exit.';
    this.position = cellToWorld(SPAWN_CELL.x, SPAWN_CELL.z); this.yaw = 0; this.pitch = 0;
    this.hollowPosition = cellToWorld(HOLLOW_START.x, HOLLOW_START.z); this.introFigure.visible = false; this.hollow.group.visible = true;
    this.previousTime = 0; this.accumulator = 0; this.messageUntil = 7; this.captionUntil = 0;
    this.emit();
  }
  pause() {
    if (this.disposed || !['playing', 'intro'].includes(this.stats.phase)) return;
    this.pausePhase = this.stats.phase; this.stats.phase = 'paused'; this.input = emptyInput(); this.turnLeft = this.turnRight = false; this.dragging = false;
    this.audio.suspend(); this.accumulator = 0; this.releaseControl(); this.emit();
  }
  resume() {
    if (this.disposed || this.stats.phase !== 'paused') return;
    this.stats.phase = this.pausePhase; this.previousTime = 0; this.accumulator = 0; void this.audio.unlock(); this.emit();
  }
  restart() {
    if (this.disposed) return;
    if (this.coop) { this.coop.send({ type:'restart' }); return; }
    this.resetRun();
  }
  private resetRun() {
    if (this.endTimer) { clearTimeout(this.endTimer); this.endTimer = null; }
    const muted = this.stats.muted;
    this.stats = { ...INITIAL, muted, phase: 'playing', introProgress: 1 };
    this.monsterYaw=0;this.poseClock=0;this.worldClock=0;this.roomWasPaused=false;
    this.input = emptyInput(); this.position = cellToWorld(SPAWN_CELL.x, SPAWN_CELL.z); this.hollowPosition = cellToWorld(HOLLOW_START.x, HOLLOW_START.z);
    this.elapsed = 0; this.scareTime = 0; this.yaw = 0; this.pitch = 0; this.memory = 0; this.hunt = false; this.directorTime = 0; this.pathTimer = 0; this.hollowPath = []; this.walkClock = 0;
    this.turnLeft = this.turnRight = false; this.previousTime = 0; this.accumulator = 0; this.messageUntil = 7; this.captionUntil = 0; this.activeFuses.clear(); this.introFigure.visible = false;
    this.world.fuseModels.forEach(model => model.visible = true); this.hollow.group.visible = true; this.hollow.head.rotation.set(0,0,0); this.ambientTime = 12;
    void this.audio.unlock(); this.emit();
  }
  setInput(input: Partial<HorrorInput>) { if (!this.disposed) Object.assign(this.input, input); }
  look(dx: number, dy: number) {
    if (this.disposed || this.stats.phase !== 'playing' || !Number.isFinite(dx) || !Number.isFinite(dy)) return;
    this.yaw -= clamp(dx, -350, 350) * .0024; this.pitch = clamp(this.pitch - clamp(dy, -350, 350) * .0024, -1.25, 1.25);
  }
  setMuted(muted: boolean) { this.stats.muted = muted; this.audio.setMuted(muted); if (!muted && ['playing','intro'].includes(this.stats.phase)) void this.audio.unlock(); this.emit(); }
  setQuality(quality: HorrorQuality) {
    this.quality = quality; this.lowQuality = quality === 'low' || (quality === 'auto' && (window.innerWidth < 800 || navigator.hardwareConcurrency <= 4));
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.lowQuality ? 1 : 1.65)); this.renderer.shadowMap.enabled = !this.lowQuality; this.flashlight.castShadow = !this.lowQuality; this.resize();
  }
  toggleFlashlight() {
    if (this.stats.phase !== 'playing') return;
    this.stats.flashlight = !this.stats.flashlight; this.audio.play('flicker'); this.emit();
  }
  interact() {
    if (this.stats.phase !== 'playing') return;
    if (this.coop) { this.sendPose(); this.coop.send({ type:'interact' }); return; }
    for (let i = 0; i < FUSE_CELLS.length; i++) {
      const point = cellToWorld(FUSE_CELLS[i].x, FUSE_CELLS[i].z);
      if (!this.activeFuses.has(i) && Math.hypot(point.x - this.position.x, point.z - this.position.z) < 2.5 && visibleBetween(this.position.x, this.position.z, point.x, point.z)) {
        this.activeFuses.add(i); this.stats.fuses = this.activeFuses.size; this.world.fuseModels[i].visible = false;
        this.stats.battery = Math.min(100, this.stats.battery + 18); this.audio.play('fuse');
        this.notify(this.stats.fuses === 3 ? 'All circuits restored. Find the red exit door.' : `Circuit ${this.stats.fuses} restored. ${3-this.stats.fuses} remain.`, 5);
        this.caption('A distant metal door unlocks.', 3); this.memory = Math.max(this.memory, 7); this.lastKnown = { ...this.position }; this.hunt = true;
        this.emit(); return;
      }
    }
    const exit = cellToWorld(EXIT_CELL.x, EXIT_CELL.z);
    if (Math.hypot(exit.x - this.position.x, exit.z - this.position.z) < 3) {
      if (this.stats.fuses === 3) this.finish('escaped');
      else { this.notify(`No power. ${3-this.stats.fuses} circuits are still missing.`, 4); this.audio.play('door'); }
    }
  }
  requestControl = () => {
    if (this.disposed || this.stats.phase !== 'playing') return;
    void this.audio.unlock();
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const canvas = this.renderer.domElement;
    if (document.pointerLockElement === canvas || !canvas.requestPointerLock) return;
    try { const result = canvas.requestPointerLock(); if (result && typeof result.catch === 'function') void result.catch(() => {}); } catch { /* Drag to look remains available. */ }
  };
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.renderer.setAnimationLoop(null); if (this.endTimer) clearTimeout(this.endTimer);
    window.removeEventListener('keydown',this.keyDown);window.removeEventListener('keyup',this.keyUp);window.removeEventListener('blur',this.blur);
    document.removeEventListener('mousemove',this.mouseMove);document.removeEventListener('pointerup',this.pointerUp);document.removeEventListener('pointerlockchange',this.lockChanged);document.removeEventListener('visibilitychange',this.visibility);
    const canvas=this.renderer.domElement;canvas.removeEventListener('webglcontextlost',this.contextLost);canvas.removeEventListener('pointerdown',this.pointerDown);canvas.removeEventListener('pointerup',this.pointerUp);canvas.removeEventListener('pointercancel',this.pointerUp);canvas.removeEventListener('click',this.requestControl);
    this.releaseControl();this.resizeObserver.disconnect();this.audio.dispose();this.world.dispose();this.teammates?.clear();this.flashlight.shadow.dispose();this.renderer.dispose();this.renderer.forceContextLoss();canvas.remove();this.scene.clear();
  }

  private emit() { if (!this.disposed) this.options.onStats({ ...this.stats }); }
  private notify(message: string, seconds = 4) { this.stats.message = message; this.messageUntil = this.elapsed + seconds; }
  private caption(text: string, seconds = 3) { this.stats.caption = text; this.captionUntil = this.elapsed + seconds; }
  private resize = () => { if (this.disposed) return; const w=Math.max(1,this.container.clientWidth),h=Math.max(1,this.container.clientHeight);this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix(); };
  private contextLost = (event: Event) => { event.preventDefault();this.pause();this.options.onError('The graphics connection was interrupted. Restart the recording to reconnect.'); };
  private releaseControl() { if (document.pointerLockElement === this.renderer.domElement) document.exitPointerLock(); }
  private lockChanged = () => {
    const wasLocked = this.stats.locked;this.stats.locked=document.pointerLockElement===this.renderer.domElement;
    if(wasLocked&&!this.stats.locked&&this.stats.phase==='playing')this.pause();this.emit();
  };
  private blur = () => { this.input=emptyInput();this.turnLeft=this.turnRight=false;this.pause(); };
  private visibility = () => { if(document.hidden)this.blur(); };
  private pointerDown = (event: PointerEvent) => { if(event.pointerType==='mouse'&&event.button===0) {this.dragging=true;this.dragX=event.clientX;this.dragY=event.clientY;} };
  private pointerUp = () => { this.dragging=false; };
  private mouseMove = (event: MouseEvent) => {
    if(this.stats.locked)this.look(event.movementX,event.movementY);
    else if(this.dragging){this.look(event.clientX-this.dragX,event.clientY-this.dragY);this.dragX=event.clientX;this.dragY=event.clientY;}
  };
  private control(code:string):keyof HorrorInput|undefined {return ({KeyW:'forward',ArrowUp:'forward',KeyS:'backward',ArrowDown:'backward',KeyA:'left',KeyD:'right',ShiftLeft:'sprint',ShiftRight:'sprint'} as Record<string,keyof HorrorInput>)[code];}
  private keyDown = (event:KeyboardEvent) => {
    if(this.disposed||(event.target instanceof HTMLElement&&/INPUT|SELECT|TEXTAREA/.test(event.target.tagName)))return;
    if(event.target instanceof HTMLButtonElement&&(event.code==='Space'||event.code==='Enter'))return;
    if(event.code==='Escape'||event.code==='KeyP'){event.preventDefault();if(this.stats.phase==='paused')this.resume();else this.pause();return;}
    if(this.stats.phase!=='playing')return;
    const control=this.control(event.code);if(control){event.preventDefault();this.input[control]=true;}
    if(event.code==='ArrowLeft'){event.preventDefault();this.turnLeft=true;}if(event.code==='ArrowRight'){event.preventDefault();this.turnRight=true;}
    if(event.repeat)return;
    if(event.code==='KeyF'){event.preventDefault();this.toggleFlashlight();}if(event.code==='KeyE'){event.preventDefault();this.interact();}if(event.code==='KeyM'){event.preventDefault();this.setMuted(!this.stats.muted);}
  };
  private keyUp = (event:KeyboardEvent) => {const control=this.control(event.code);if(control)this.input[control]=false;if(event.code==='ArrowLeft')this.turnLeft=false;if(event.code==='ArrowRight')this.turnRight=false;};

  private frame = (time:number) => {
    if(this.disposed)return;
    const dt=this.previousTime?Math.min((time-this.previousTime)/1000,.1):0;this.previousTime=time;
    const roomPlaying=this.coop&&this.roomSnapshot?.run.status==='playing';
    const hostPaused=roomPlaying&&this.roomSnapshot?.players.find(player=>player.id===this.roomSnapshot?.host)?.paused;
    if(this.roomWasPaused&&!hostPaused&&this.stats.phase==='playing') { void this.audio.unlock();this.stats.message=''; }
    this.roomWasPaused=Boolean(hostPaused);
    if(this.coop) {
      this.poseClock+=dt;
      if(this.poseClock>.05){this.sendPose();this.poseClock=0;}
    }
    if(this.stats.phase==='intro')this.updateIntro(dt);
    else if(roomPlaying&&hostPaused) {
      this.stats.message='The host paused the recording.'; this.audio.suspend(); this.accumulator=0;
    }
    else if(this.stats.phase==='playing') {
      this.accumulator+=dt;
      for(let i=0;this.accumulator>=1/60&&i<6;i++){this.update(1/60);this.accumulator-=1/60;if(this.stats.phase!=='playing'){this.accumulator=0;break;}}
      if(this.quality==='auto'&&!this.lowQuality&&dt>.035)this.slowFrames+=dt;else this.slowFrames=Math.max(0,this.slowFrames-dt*.25);
      if(this.slowFrames>3){this.lowQuality=true;this.renderer.setPixelRatio(1);this.renderer.shadowMap.enabled=false;this.flashlight.castShadow=false;this.resize();}
    }else if(this.stats.phase==='caught') {
      this.scareTime+=dt;
      if(roomPlaying&&this.isHost()) { this.elapsed+=dt;this.updateHollow(dt,false,false);this.sendWorld(dt); }
    }
    this.render(dt);
    if(time-this.lastStats>100){this.emit();this.lastStats=time;}
  };

  private updateIntro(dt:number) {
    this.introTime+=dt;this.stats.introProgress=clamp(this.introTime/12,0,1);
    const stage=this.introTime<3?0:this.introTime<6?1:this.introTime<9?2:3;
    if(stage!==this.introEvent){this.introEvent=stage;
      this.stats.caption=['RECOVERED FOOTAGE / FIELD INVESTIGATOR / CAMERA 04','The buzzing stopped. Then there were footsteps.','The investigator never reached the next room.','The recording continues. You are inside.'][stage];
      if(stage===1)this.audio.play('door');if(stage===2)this.audio.play('whisper');if(stage===3)this.audio.play('sting');
    }
    const spawn=cellToWorld(SPAWN_CELL.x,SPAWN_CELL.z),distance=Math.min(this.introTime*.65,5);
    this.introFigure.visible=this.introTime<8.2;this.introFigure.position.set(spawn.x,0,spawn.z-3-distance);this.introFigure.rotation.y=Math.PI;
    this.introFigure.children.forEach((part,index)=>{if(index>=3)part.rotation.x=Math.sin(this.introTime*4+index)*.14;});
    this.hollow.group.visible=this.introTime>6&&this.introTime<9.7;this.hollow.group.position.set(spawn.x+2.8,0,spawn.z-10);this.hollow.group.rotation.y=Math.PI*.14;
    this.camera.position.set(spawn.x+2.2,2.75,spawn.z+1.7);this.camera.rotation.set(-.14,-.075,this.reducedMotion?0:Math.sin(this.introTime*1.1)*.012,'YXZ');this.camera.fov=63;this.camera.updateProjectionMatrix();
    this.flashlight.visible=false;this.audio.update(dt,this.introTime>6?.5:.05,this.introTime<7,false,false);
    if(this.introTime>=12)this.skipIntro();
  }

  private update(dt:number) {
    this.elapsed+=dt;this.stats.elapsed=this.elapsed;
    this.yaw+=(Number(this.turnLeft)-Number(this.turnRight))*dt*1.6;
    let forward=Number(this.input.forward)-Number(this.input.backward),side=Number(this.input.right)-Number(this.input.left);
    const magnitude=Math.hypot(forward,side);if(magnitude>1){forward/=magnitude;side/=magnitude;}
    const moving=magnitude>.01,sprinting=moving&&this.input.sprint&&this.stats.stamina>3;
    this.stats.stamina=clamp(this.stats.stamina+dt*(sprinting?-22:11),0,100);
    const speed=sprinting?4.65:2.45;
    moveCharacter(this.position,(-Math.sin(this.yaw)*forward+Math.cos(this.yaw)*side)*speed*dt,(-Math.cos(this.yaw)*forward-Math.sin(this.yaw)*side)*speed*dt);
    if(moving)this.walkClock+=dt*(sprinting?12:8);
    this.stats.battery=clamp(this.stats.battery+dt*(this.stats.flashlight?-.23:.52),0,100);
    if(this.stats.battery<=0)this.stats.flashlight=false;
    if(!this.coop||this.isHost())this.updateHollow(dt,moving,sprinting);
    else this.updateGuestPresence(dt);
    if(this.coop&&this.isHost())this.sendWorld(dt);
    if(this.stats.phase!=='playing')return;
    this.stats.prompt='';
    for(let i=0;i<FUSE_CELLS.length;i++)if(!this.activeFuses.has(i)) {
      const p=cellToWorld(FUSE_CELLS[i].x,FUSE_CELLS[i].z);
      if(Math.hypot(p.x-this.position.x,p.z-this.position.z)<2.5&&visibleBetween(this.position.x,this.position.z,p.x,p.z))this.stats.prompt='E / Restore circuit';
    }
    const exit=cellToWorld(EXIT_CELL.x,EXIT_CELL.z);
    if(Math.hypot(exit.x-this.position.x,exit.z-this.position.z)<3)this.stats.prompt=this.stats.fuses===3?'E / Open exit':'E / Inspect locked exit';
    if(this.elapsed>this.messageUntil)this.stats.message='';if(this.elapsed>this.captionUntil)this.stats.caption='';
    this.ambientTime-=dt;
    if(this.ambientTime<=0){this.ambientTime=15+Math.random()*12;this.audio.play(this.hunt?'whisper':'flicker');this.caption(this.hunt?'[Uneven footsteps, close behind]':'[A fluorescent tube clicks off somewhere nearby]',3);}
    this.audio.update(dt,this.stats.danger,moving,sprinting,this.stats.flashlight);
  }

  private updateHollow(dt:number,moving:boolean,sprinting:boolean) {
    const living=this.roomSnapshot?.players.filter(player=>player.alive&&!player.escaped);
    let targetPlayer={...this.position,moving,sprinting,flashlight:this.stats.flashlight};
    if(this.coop&&living?.length) {
      const detected=living.map(player=>player.id===this.roomSnapshot?.you?{...player,...this.position,moving,sprinting}:player).filter(player=>{
        const distance=Math.hypot(player.x-this.hollowPosition.x,player.z-this.hollowPosition.z);
        return (distance<(player.flashlight?32:21)&&visibleBetween(this.hollowPosition.x,this.hollowPosition.z,player.x,player.z))||(player.moving&&distance<(player.sprinting?24:8));
      }).sort((a,b)=>Math.hypot(a.x-this.hollowPosition.x,a.z-this.hollowPosition.z)-Math.hypot(b.x-this.hollowPosition.x,b.z-this.hollowPosition.z));
      if(detected.length)targetPlayer=detected[0];
      else if(!living.some(player=>player.id===this.roomSnapshot?.you))targetPlayer={...living[0]};
    }
    let distance=Math.hypot(this.hollowPosition.x-targetPlayer.x,this.hollowPosition.z-targetPlayer.z);
    const sight=distance<(targetPlayer.flashlight?32:21)&&visibleBetween(this.hollowPosition.x,this.hollowPosition.z,targetPlayer.x,targetPlayer.z);
    const heard=targetPlayer.moving&&distance<(targetPlayer.sprinting?24:8);
    if(sight||heard){this.memory=9;this.lastKnown={x:targetPlayer.x,z:targetPlayer.z};if(!this.hunt&&this.elapsed>4){this.audio.play('whisper');this.caption('[Footsteps stop. Something has noticed you.]',4);}this.hunt=true;}
    else this.memory=Math.max(0,this.memory-dt);
    if(this.memory===0)this.hunt=false;
    this.pathTimer-=dt;
    if(this.pathTimer<=0){
      const from=worldToCell(this.hollowPosition.x,this.hollowPosition.z);
      const target=this.hunt?worldToCell(this.lastKnown.x,this.lastKnown.z):this.patrolCell();
      this.hollowPath=findPath(from,target);this.pathTimer=this.hunt?.7:4;
    }
    let target:{x:number;z:number}|null=null;
    if(this.hunt&&sight&&distance<12)target=targetPlayer;
    else if(this.hollowPath.length){target=cellToWorld(this.hollowPath[0].x,this.hollowPath[0].z);if(Math.hypot(target.x-this.hollowPosition.x,target.z-this.hollowPosition.z)<.28){this.hollowPath.shift();target=this.hollowPath.length?cellToWorld(this.hollowPath[0].x,this.hollowPath[0].z):null;}}
    if(target){
      const dx=target.x-this.hollowPosition.x,dz=target.z-this.hollowPosition.z,d=Math.hypot(dx,dz);
      const speed=this.hunt?3.12+this.stats.fuses*.14:1.5;
      if(d>.01){moveCharacter(this.hollowPosition,dx/d*Math.min(d,speed*dt),dz/d*Math.min(d,speed*dt),.27);const desired=Math.atan2(dx,dz);const heading=this.monsterYaw??this.hollow.group.rotation.y;this.monsterYaw=heading+angleDelta(desired,heading)*Math.min(1,dt*7);this.hollow.group.rotation.y=this.monsterYaw;}
    }
    distance=Math.hypot(this.hollowPosition.x-this.position.x,this.hollowPosition.z-this.position.z);
    const closeSight=distance<24&&visibleBetween(this.hollowPosition.x,this.hollowPosition.z,this.position.x,this.position.z);
    const targetDanger=closeSight?clamp(1-distance/25,0,1):this.hunt?clamp(.5-distance/85,.08,.45):clamp(.25-distance/75,0,.18);
    this.stats.danger=THREE.MathUtils.lerp(this.stats.danger,targetDanger,dt*3);
    this.hollow.group.position.set(this.hollowPosition.x,Math.sin(this.elapsed*3.7)*.025,this.hollowPosition.z);
    this.hollow.head.rotation.z=this.reducedMotion?-.12:Math.sin(this.elapsed*1.7)*.12-.13;
    this.hollow.head.rotation.y=Math.sin(this.elapsed*.9)*.1;
    this.hollow.arms.forEach((arm,i)=>arm.rotation.x=Math.sin(this.elapsed*(this.hunt?5:2.7)+i*Math.PI)*.21);
    this.hollow.legs.forEach((leg,i)=>leg.rotation.x=Math.sin(this.elapsed*(this.hunt?5:2.7)+i*Math.PI)*.2);
    this.directorTime+=dt;
    if(this.elapsed>22&&distance>37&&this.directorTime>17){this.repositionHollow();this.directorTime=0;}
    if(!this.coop&&distance<1.12&&visibleBetween(this.hollowPosition.x,this.hollowPosition.z,this.position.x,this.position.z)&&this.elapsed>5)this.finish('caught');
  }
  private isHost() { return Boolean(this.roomSnapshot&&this.roomSnapshot.you===this.roomSnapshot.host); }
  private sendPose() {
    if(!this.coop||!this.roomSnapshot)return;
    this.coop.send({type:'pose',pose:{...this.position,yaw:this.yaw,moving:this.stats.phase==='playing'&&(this.input.forward||this.input.backward||this.input.left||this.input.right),sprinting:this.stats.phase==='playing'&&this.input.sprint&&this.stats.stamina>3,flashlight:this.stats.flashlight},paused:this.stats.phase==='paused'});
  }
  private sendWorld(dt:number) {
    if(!this.coop||!this.roomSnapshot)return;
    this.worldClock+=dt;if(this.worldClock<.1)return;this.worldClock=0;
    const captured=this.elapsed>5?this.roomSnapshot.players.filter(player=>player.alive&&!player.escaped&&Math.hypot((player.id===this.roomSnapshot?.you?this.position.x:player.x)-this.hollowPosition.x,(player.id===this.roomSnapshot?.you?this.position.z:player.z)-this.hollowPosition.z)<1.15&&visibleBetween(this.hollowPosition.x,this.hollowPosition.z,player.x,player.z)).map(player=>player.id):[];
    this.coop.send({type:'world',elapsed:this.elapsed,monster:{...this.hollowPosition,yaw:this.monsterYaw,hunt:this.hunt},captured});
  }
  private updateGuestPresence(dt:number) {
    const distance=Math.hypot(this.hollowPosition.x-this.position.x,this.hollowPosition.z-this.position.z),visible=distance<24&&visibleBetween(this.hollowPosition.x,this.hollowPosition.z,this.position.x,this.position.z);
    this.stats.danger=THREE.MathUtils.lerp(this.stats.danger,visible?clamp(1-distance/25,0,1):this.hunt?.25:0,dt*3);
    this.hollow.group.position.set(this.hollowPosition.x,Math.sin(this.elapsed*3.7)*.025,this.hollowPosition.z);this.hollow.head.rotation.z=-.13+Math.sin(this.elapsed*1.7)*.08;
    this.hollow.arms.forEach((arm,i)=>arm.rotation.x=Math.sin(this.elapsed*5+i*Math.PI)*.21);this.hollow.legs.forEach((leg,i)=>leg.rotation.x=Math.sin(this.elapsed*5+i*Math.PI)*.2);
  }
  private patrolCell():Cell {
    if(this.hollowPath.length)return this.hollowPath[this.hollowPath.length-1];
    const points=[{x:4,z:10},{x:12,z:13},{x:24,z:22},{x:7,z:5},{x:21,z:12},{x:17,z:22}];
    return points[Math.floor(this.elapsed/11)%points.length];
  }
  /** Only relocate out of sight and at a fair distance; never materialize on the player. */
  private repositionHollow() {
    const living=this.coop?this.roomSnapshot?.players.filter(p=>p.alive&&!p.escaped):undefined;
    const anchor=living?.find(p=>p.id===this.roomSnapshot?.you)??living?.[0]??{...this.position,yaw:this.yaw};
    const candidates=OPEN_CELLS.filter(cell=>{
      const p=cellToWorld(cell.x,cell.z),dx=p.x-anchor.x,dz=p.z-anchor.z,d=Math.hypot(dx,dz);
      if(d<19||d>32)return false;
      if(living?.some(player=>Math.hypot(p.x-player.x,p.z-player.z)<19||visibleBetween(player.x,player.z,p.x,p.z)))return false;
      const facing=(-Math.sin(anchor.yaw)*dx-Math.cos(anchor.yaw)*dz)/d;
      return facing<-.35&&!visibleBetween(anchor.x,anchor.z,p.x,p.z);
    });
    if(!candidates.length)return;
    const target=candidates[Math.floor(Math.random()*candidates.length)];this.hollowPosition=cellToWorld(target.x,target.z);this.hollowPath=[];this.pathTimer=0;this.audio.play('whisper');this.caption('[A second set of footsteps]',3);
  }

  private render(dt:number) {
    if(this.teammates)for(const peer of this.teammates.values()) {
      const blend=1-Math.exp(-dt*13);peer.group.position.x=THREE.MathUtils.lerp(peer.group.position.x,peer.target.x,blend);peer.group.position.z=THREE.MathUtils.lerp(peer.group.position.z,peer.target.z,blend);
      peer.group.rotation.y+=angleDelta(peer.target.yaw+Math.PI,peer.group.rotation.y)*blend;
      peer.group.children.forEach((part,i)=>{if(i>=3)part.rotation.x=peer.target.moving?Math.sin(this.elapsed*(peer.target.sprinting?11:7)+i)*.15:0;});
    }
    if(this.stats.phase!=='intro'&&!(this.stats.phase==='paused'&&this.pausePhase==='intro')) {
      const moving=this.input.forward||this.input.backward||this.input.left||this.input.right;
      const bob=this.reducedMotion?0:moving&&this.stats.phase==='playing'?Math.sin(this.walkClock)*.025:Math.sin(this.elapsed*.8)*.006;
      this.camera.position.set(this.position.x,1.65+bob,this.position.z);
      if(this.stats.phase==='caught') {
        const h=this.yaw;this.hollow.group.position.set(this.position.x-Math.sin(h)*1.35,0,this.position.z-Math.cos(h)*1.35);this.hollow.group.rotation.y=h;
        this.hollow.head.rotation.z=-.3;this.camera.rotation.set(.5,h,this.reducedMotion?0:Math.sin(this.scareTime*24)*.025,'YXZ');
      }else this.camera.rotation.set(this.pitch,this.yaw,this.reducedMotion?0:Math.sin(this.walkClock*.5)*(moving?.005:0),'YXZ');
      const fov=this.stats.phase==='caught'?61:this.input.sprint&&moving?75:70;
      this.camera.fov=THREE.MathUtils.lerp(this.camera.fov,fov,Math.min(1,dt*4));this.camera.updateProjectionMatrix();
      this.flashlight.visible=this.stats.flashlight||this.stats.phase==='caught';
      this.flashlight.intensity=this.stats.phase==='caught'?60:45*(this.stats.battery<15?.82:1);
    }
    const reference=this.stats.phase==='intro'?this.camera.position:this.position;
    const fixtures=[...this.world.fixtures].sort((a,b)=>(a.x-reference.x)**2+(a.z-reference.z)**2-((b.x-reference.x)**2+(b.z-reference.z)**2));
    this.lamps.forEach((lamp,i)=>{
      const p=fixtures[i];if(!p){lamp.intensity=0;return;}lamp.position.copy(p);lamp.position.y-=.17;
      const phase=this.stats.phase==='intro'?this.introTime:this.elapsed;
      const flicker=this.reducedMotion?1:(Math.sin(phase*2.7+i*8.1)>.96&&Math.sin(phase*11+i)>.3?.18:1);
      const introDrop=this.stats.phase==='intro'&&this.introTime>7.8&&this.introTime<8.7?.05:1;
      lamp.intensity=(i<3?24:16)*flicker*introDrop;
    });
    this.world.fuseModels.forEach((model,i)=>{if(model.visible)model.rotation.y=Math.sin(this.elapsed*.8+i)*.035;});
    this.hemisphere.intensity=this.stats.phase==='caught'?.34:.62;
    this.renderer.render(this.scene,this.camera);
  }
  private finish(phase:'caught'|'escaped') {
    if(this.stats.phase!=='playing')return;
    this.stats.phase=phase;this.stats.prompt='';this.stats.message='';this.stats.caption=phase==='caught'?'[The recording is interrupted]':'[The fluorescent hum fades]';this.scareTime=0;
    this.stats.danger=phase==='caught'?1:0;this.input=emptyInput();this.audio.play(phase==='caught'?'caught':'escape');this.releaseControl();
    this.endTimer=setTimeout(()=>{if(!this.disposed&&['caught','escaped'].includes(this.stats.phase))this.audio.suspend();this.endTimer=null;},phase==='caught'?950:1400);
    this.emit();
  }
  private releaseFigure(group:THREE.Group) {
    const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();group.traverse(object=>{if(object instanceof THREE.Mesh){geometries.add(object.geometry);for(const m of Array.isArray(object.material)?object.material:[object.material])materials.add(m);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());group.removeFromParent();group.clear();
  }
  private createAdultFigure(color=0x292c28) {
    const group=new THREE.Group();
    const cloth=new THREE.MeshStandardMaterial({color:new THREE.Color(color).multiplyScalar(.23),roughness:1});
    const skin=new THREE.MeshStandardMaterial({color:0x806652,roughness:1});
    const dark=new THREE.MeshStandardMaterial({color:0x151b1b,roughness:1});
    const hair=new THREE.MeshStandardMaterial({color:0x1b1713,roughness:1});
    const trim=new THREE.MeshStandardMaterial({color,roughness:.85});
    const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.22,.5,5,12),cloth);torso.position.y=1.13;torso.scale.z=.76;group.add(torso);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.145,14,10),skin);head.position.y=1.76;head.scale.z=.94;group.add(head);
    const cap=new THREE.Mesh(new THREE.SphereGeometry(.151,14,8,0,Math.PI*2,0,Math.PI*.54),hair);cap.position.y=.012;head.add(cap);
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(.068,.08,.13,8),skin);neck.position.y=-.16;head.add(neck);
    const pack=new THREE.Mesh(new THREE.BoxGeometry(.32,.43,.16),dark);pack.position.set(0,1.22,-.23);group.add(pack);
    const pocket=new THREE.Mesh(new THREE.BoxGeometry(.23,.17,.055),cloth);pocket.position.set(0,-.07,-.1);pack.add(pocket);
    const patch=new THREE.Mesh(new THREE.BoxGeometry(.15,.025,.008),trim);patch.position.set(0,.12,-.085);pack.add(patch);
    for(const side of [-1,1]){
      const strap=new THREE.Mesh(new THREE.BoxGeometry(.032,.56,.025),dark);strap.position.set(side*.14,.1,.20);torso.add(strap);
      const leg=new THREE.Group();leg.position.set(side*.13,.89,0);group.add(leg);
      const trousers=new THREE.Mesh(new THREE.CapsuleGeometry(.085,.62,4,8),dark);trousers.position.y=-.38;leg.add(trousers);
      const boot=new THREE.Mesh(new THREE.BoxGeometry(.15,.13,.25),dark);boot.position.set(0,-.82,.045);leg.add(boot);
      const arm=new THREE.Group();arm.position.set(side*.25,1.48,0);group.add(arm);
      const sleeve=new THREE.Mesh(new THREE.CapsuleGeometry(.066,.43,4,8),cloth);sleeve.position.set(side*.025,-.25,0);arm.add(sleeve);
      const hand=new THREE.Mesh(new THREE.SphereGeometry(.065,8,6),skin);hand.position.set(side*.025,-.56,0);hand.scale.y=1.25;arm.add(hand);
    }
    group.traverse(object=>{if(object instanceof THREE.Mesh)object.castShadow=true;});return group;
  }
}
