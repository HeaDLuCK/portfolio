export type HorrorSound = "step" | "fuse" | "door" | "whisper" | "sting" | "caught" | "escape" | "flicker" | "start";

type Voice = { source: AudioScheduledSourceNode; release: () => void };

/** Gesture-unlocked, entirely synthesized room sound. No downloads or speech. */
export class HorrorAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private effects: GainNode | null = null;
  private hum: GainNode | null = null;
  private drone: GainNode | null = null;
  private air: GainNode | null = null;
  private droneOscillators: OscillatorNode[] = [];
  private noiseBuffer: AudioBuffer | null = null;
  private nodes = new Set<AudioNode>();
  private sources = new Set<AudioScheduledSourceNode>();
  private voices = new Set<Voice>();
  private lastPlayed = new Map<HorrorSound, number>();
  private paused = true;
  private muted = false;
  private disposed = false;
  private stepClock = 0;
  private heartbeatClock = 0;
  private roomClock = 0;
  private nextWhisper = 17;
  private leftFoot = false;
  private danger = 0;

  /** Call from a start/resume button or other direct user gesture. */
  async unlock(): Promise<void> {
    if (this.disposed || typeof window === "undefined") return;
    this.paused = false;
    try {
      if (!this.context) {
        const AudioContextClass = window.AudioContext ??
          (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        this.context = new AudioContextClass({ latencyHint: "interactive" });
        this.createGraph(this.context);
      }
      const context = this.context;
      if (context.state !== "running") await context.resume();
      if (this.disposed || this.context !== context) return;
      // Pause can happen while the browser resolves a resume request.
      if (this.paused) {
        if (context.state === "running") await context.suspend();
        return;
      }
      this.smooth(this.master!.gain, this.muted ? 0 : 0.42, 0.04);
      this.smooth(this.hum!.gain, 0.024, 0.12);
      this.smooth(this.air!.gain, 0.015, 0.2);
      this.smooth(this.drone!.gain, 0.016, 0.4);
    } catch {
      // An unavailable device or rejected resume leaves the game playable silently.
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.smooth(this.master.gain, muted ? 0 : 0.42, 0.025);
    if (muted) this.stopEffects();
  }

  /** Owns footstep cadence; callers need not separately emit step events. */
  update(dt: number, danger: number, moving: boolean, sprinting: boolean, flashlight: boolean): void {
    const context = this.context;
    if (!context || context.state !== "running" || this.paused || this.disposed) return;
    const elapsed = Number.isFinite(dt) ? Math.min(0.1, Math.max(0, dt)) : 0;
    this.danger = Number.isFinite(danger) ? Math.max(0, Math.min(1, danger)) : 0;
    const threat = this.danger;
    this.smooth(this.hum!.gain, (flashlight ? 0.024 : 0.018) + threat * 0.005, 0.3);
    this.smooth(this.air!.gain, 0.015 + threat * 0.011, 0.6);
    this.smooth(this.drone!.gain, 0.016 + threat * 0.048, 0.8);
    this.droneOscillators.forEach((oscillator, index) => {
      this.smooth(oscillator.frequency, [43.65, 65.55, 87.5][index] + threat * (index + 1) * 0.38, 0.9);
    });

    if (moving) {
      this.stepClock -= elapsed;
      if (this.stepClock <= 0) {
        this.play("step");
        this.stepClock = sprinting ? 0.31 : 0.52;
      }
    } else this.stepClock = Math.min(this.stepClock, 0.12);

    this.heartbeatClock -= elapsed;
    if (threat > 0.24 && this.heartbeatClock <= 0) {
      const volume = 0.022 + threat * 0.055;
      if (!this.muted) {
        this.tone(73, 43, 0.15, volume, "sine");
        this.tone(64, 38, 0.17, volume * 0.68, "sine", 0.17);
      }
      this.heartbeatClock = 1.12 - threat * 0.56;
    }
    this.roomClock += elapsed;
    if (this.roomClock >= this.nextWhisper) {
      if (threat > 0.12) this.play("whisper");
      else this.play("flicker");
      this.nextWhisper = this.roomClock + 14 + Math.random() * 14 - threat * 6;
    }
  }

  play(kind: HorrorSound): void {
    const context = this.context;
    if (!context || context.state !== "running" || this.paused || this.disposed || this.muted) return;
    const cooldown: Record<HorrorSound, number> = {
      step: 0.2, fuse: 0.4, door: 0.7, whisper: 6, sting: 3,
      caught: 2, escape: 2, flicker: 0.5, start: 1,
    };
    if (context.currentTime - (this.lastPlayed.get(kind) ?? -Infinity) < cooldown[kind]) return;
    this.lastPlayed.set(kind, context.currentTime);

    switch (kind) {
      case "step": {
        this.leftFoot = !this.leftFoot;
        const pan = this.leftFoot ? -0.13 : 0.13;
        this.tone(102 + Math.random() * 14, 48, 0.11, 0.075, "sine", 0, pan);
        this.noise(0.14, 0.065, 640 + Math.random() * 180, 0.65, pan, 0, 0.006);
        break;
      }
      case "fuse":
        this.noise(0.08, 0.12, 1700, 1.1, 0, 0, 0.006);
        this.tone(760, 440, 0.11, 0.035, "triangle");
        this.tone(114, 96, 0.3, 0.045, "sine", 0.07);
        break;
      case "door":
        this.tone(155, 61, 0.75, 0.06, "triangle", 0, -0.25);
        this.tone(221, 112, 0.62, 0.022, "sine", 0.04, 0.2);
        this.noise(0.65, 0.065, 390, 3, -0.2, 0.06, 0.05);
        this.tone(71, 38, 0.18, 0.13, "sine", 0.56);
        break;
      case "whisper": {
        // Breathy moving formants suggest a presence without producing words.
        const pan = Math.random() > 0.5 ? -0.8 : 0.8;
        this.noise(1.45, 0.063, 960, 3.7, pan, 0, 0.23, -pan * 0.55);
        this.noise(1.1, 0.025, 1980, 5.5, -pan * 0.4, 0.15, 0.19, pan);
        this.tone(138, 124, 1.2, 0.009, "sine", 0.1, pan);
        break;
      }
      case "sting":
        this.tone(146.8, 91, 0.95, 0.1, "triangle");
        this.tone(155.6, 112, 0.9, 0.07, "sine", 0.02, -0.35);
        this.noise(0.8, 0.085, 1120, 1.3, 0.3, 0, 0.06);
        break;
      case "caught":
        this.tone(93, 31, 0.8, 0.19, "triangle");
        this.tone(207, 58, 0.7, 0.06, "sine", 0.015, -0.2);
        this.noise(0.68, 0.16, 830, 1.1, 0, 0, 0.025);
        break;
      case "escape":
        this.noise(1.2, 0.05, 1300, 0.5, 0, 0, 0.2);
        [130.81, 196, 261.63].forEach((frequency, index) => {
          this.tone(frequency, frequency, 1.8, 0.024, "sine", index * 0.13);
        });
        break;
      case "flicker":
        this.noise(0.055, 0.05, 1650, 1.3, -0.4, 0, 0.003);
        this.noise(0.09, 0.035, 1200, 1.8, 0.4, 0.11, 0.004);
        break;
      case "start":
        this.tone(87.3, 43.65, 1.7, 0.07, "sine");
        this.noise(1.35, 0.045, 570, 1.8, 0, 0, 0.2);
        break;
    }
  }

  suspend(): void {
    this.paused = true;
    this.stepClock = 0;
    this.heartbeatClock = 0;
    this.stopEffects();
    this.lastPlayed.clear();
    const context = this.context;
    if (!context || context.state === "closed") return;
    [this.hum, this.drone, this.air].forEach((node) => {
      if (!node) return;
      node.gain.cancelScheduledValues(context.currentTime);
      node.gain.setValueAtTime(0, context.currentTime);
    });
    void context.suspend().catch(() => {});
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.paused = true;
    this.stopEffects();
    this.sources.forEach((source) => { try { source.stop(); } catch { /* Already ended. */ } });
    this.nodes.forEach((node) => { try { node.disconnect(); } catch { /* Already disconnected. */ } });
    this.sources.clear();
    this.nodes.clear();
    this.lastPlayed.clear();
    this.droneOscillators = [];
    this.noiseBuffer = null;
    if (this.context && this.context.state !== "closed") void this.context.close().catch(() => {});
    this.context = null;
    this.master = this.effects = this.hum = this.drone = this.air = null;
  }

  private track<T extends AudioNode>(node: T): T { this.nodes.add(node); return node; }

  private createGraph(context: AudioContext): void {
    this.master = this.track(context.createGain());
    this.master.gain.value = this.muted ? 0 : 0.42;
    const compressor = this.track(context.createDynamicsCompressor());
    compressor.threshold.value = -22;
    compressor.knee.value = 18;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.2;
    const ceiling = this.track(context.createBiquadFilter());
    ceiling.type = "lowpass";
    ceiling.frequency.value = 4800;
    ceiling.Q.value = 0.5;
    this.master.connect(ceiling).connect(compressor).connect(context.destination);

    this.effects = this.track(context.createGain());
    this.effects.gain.value = 0.8;
    this.effects.connect(this.master);
    // A restrained, filtered slap echo gives the empty rooms an audible size.
    const echo = this.track(context.createDelay(1));
    echo.delayTime.value = 0.19;
    const echoFilter = this.track(context.createBiquadFilter());
    echoFilter.type = "lowpass";
    echoFilter.frequency.value = 1300;
    const echoFeedback = this.track(context.createGain());
    echoFeedback.gain.value = 0.13;
    const echoWet = this.track(context.createGain());
    echoWet.gain.value = 0.15;
    this.effects.connect(echo).connect(echoFilter).connect(echoWet).connect(this.master);
    echoFilter.connect(echoFeedback).connect(echo);

    this.noiseBuffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
    const samples = this.noiseBuffer.getChannelData(0);
    let seed = 849230;
    for (let index = 0; index < samples.length; index++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      samples[index] = (seed >>> 0) / 2147483648 - 1;
    }
    const roomNoise = this.track(context.createBufferSource());
    roomNoise.buffer = this.noiseBuffer;
    roomNoise.loop = true;
    const airFilter = this.track(context.createBiquadFilter());
    airFilter.type = "bandpass";
    airFilter.frequency.value = 370;
    airFilter.Q.value = 0.7;
    this.air = this.track(context.createGain());
    this.air.gain.value = 0;
    roomNoise.connect(airFilter).connect(this.air).connect(this.master);
    roomNoise.start();
    this.sources.add(roomNoise);

    this.hum = this.track(context.createGain());
    this.hum.gain.value = 0;
    [100, 200.17].forEach((frequency, index) => {
      const oscillator = this.track(context.createOscillator());
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      const level = this.track(context.createGain());
      level.gain.value = index === 0 ? 0.8 : 0.24;
      oscillator.connect(level).connect(this.hum!);
      oscillator.start();
      this.sources.add(oscillator);
    });
    this.hum.connect(this.master);

    this.drone = this.track(context.createGain());
    this.drone.gain.value = 0;
    this.drone.connect(this.master);
    [43.65, 65.55, 87.5].forEach((frequency, index) => {
      const oscillator = this.track(context.createOscillator());
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      const level = this.track(context.createGain());
      level.gain.value = index === 0 ? 0.72 : 0.25;
      const panner = this.track(context.createStereoPanner());
      panner.pan.value = index === 0 ? 0 : index === 1 ? -0.65 : 0.65;
      oscillator.connect(level).connect(panner).connect(this.drone!);
      oscillator.start();
      this.sources.add(oscillator);
      this.droneOscillators.push(oscillator);
    });
  }

  private smooth(parameter: AudioParam, target: number, seconds: number): void {
    if (!this.context) return;
    parameter.cancelScheduledValues(this.context.currentTime);
    parameter.setTargetAtTime(target, this.context.currentTime, seconds);
  }

  private tone(from: number, to: number, duration: number, volume: number, type: OscillatorType,
    delay = 0, pan = 0): void {
    const context = this.context;
    if (!context || !this.effects) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, context.currentTime);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.025, duration * 0.2));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    const panner = context.createStereoPanner();
    panner.pan.value = pan;
    oscillator.connect(envelope).connect(panner).connect(this.effects);
    this.registerVoice(oscillator, [oscillator, envelope, panner]);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  private noise(duration: number, volume: number, frequency: number, q: number, pan: number,
    delay = 0, attack = 0.015, endPan = pan): void {
    const context = this.context;
    if (!context || !this.effects || !this.noiseBuffer) return;
    const start = context.currentTime + delay;
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(frequency, start);
    filter.frequency.exponentialRampToValueAtTime(frequency * 0.7, start + duration);
    filter.Q.value = q;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, context.currentTime);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + Math.min(attack, duration * 0.45));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    const panner = context.createStereoPanner();
    panner.pan.setValueAtTime(pan, start);
    panner.pan.linearRampToValueAtTime(endPan, start + duration);
    source.connect(filter).connect(envelope).connect(panner).connect(this.effects);
    this.registerVoice(source, [source, filter, envelope, panner]);
    source.start(start, Math.random() * 0.8);
    source.stop(start + duration + 0.03);
  }

  private registerVoice(source: AudioScheduledSourceNode, nodes: AudioNode[]): void {
    if (this.voices.size >= 24) {
      const oldest = this.voices.values().next().value as Voice | undefined;
      if (oldest) { try { oldest.source.stop(); } catch { /* Already ended. */ } oldest.release(); }
    }
    const voice: Voice = {
      source,
      release: () => {
        source.onended = null;
        nodes.forEach((node) => { try { node.disconnect(); } catch { /* Already disconnected. */ } });
        this.voices.delete(voice);
      },
    };
    this.voices.add(voice);
    source.onended = voice.release;
  }

  private stopEffects(): void {
    [...this.voices].forEach((voice) => {
      try { voice.source.stop(); } catch { /* Already ended. */ }
      voice.release();
    });
  }
}
