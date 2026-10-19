type SoundKind = "pickup" | "crash" | "delivery" | "nearMiss" | "end" | "start";

type Voice = {
  source: AudioScheduledSourceNode;
  nodes: AudioNode[];
  release: () => void;
};

/** Small, entirely synthesized soundtrack. No audio is created before a gesture. */
export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private effects: GainNode | null = null;
  private engine: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineOscillators: OscillatorNode[] = [];
  private road: GainNode | null = null;
  private nitro: GainNode | null = null;
  private siren: GainNode | null = null;
  private sirenLfo: OscillatorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private sources = new Set<AudioScheduledSourceNode>();
  private nodes = new Set<AudioNode>();
  private voices = new Set<Voice>();
  private lastPlayed = new Map<SoundKind, number>();
  private muted = false;
  private paused = true;
  private disposed = false;

  /** Call directly from a click/key gesture, including when resuming a run. */
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

      if (this.context.state !== "running") await this.context.resume();
      // A tab can pause while the browser is resolving its audio permission.
      if (this.paused && this.context.state === "running") await this.context.suspend();
    } catch {
      // Audio is an enhancement: unavailable devices and denied audio stay silent.
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.context && this.master) {
      this.smooth(this.master.gain, muted ? 0 : 0.34, 0.025);
    }
  }

  /** Speed is metres/second, heat is the pursuit level from one to five. */
  update(speed: number, throttle: boolean, boost: boolean, heat: number): void {
    const context = this.context;
    if (!context || context.state !== "running" || this.paused || this.disposed) return;

    const velocity = Math.min(1, Math.max(0, Number.isFinite(speed) ? Math.abs(speed) / 58 : 0));
    const pursuit = Math.min(1, Math.max(0, Number.isFinite(heat) ? (heat - 0.65) / 4.35 : 0));
    // A little pitch fall at each virtual gear change gives acceleration character.
    const rev = velocity * 3.5;
    const gearPhase = rev - Math.floor(rev);
    const fundamental = 33 + velocity * 62 + gearPhase * 29 + (throttle ? 9 : 0) + (boost ? 13 : 0);

    this.engineOscillators.forEach((oscillator, index) => {
      this.smooth(oscillator.frequency, fundamental * (index === 0 ? 1 : 2.005), 0.075);
    });
    if (this.engine) this.smooth(this.engine.gain, 0.055 + velocity * 0.055 + (throttle ? 0.028 : 0), 0.07);
    if (this.engineFilter) this.smooth(this.engineFilter.frequency, 240 + velocity * 750 + (throttle ? 160 : 0), 0.12);
    if (this.road) this.smooth(this.road.gain, velocity * velocity * 0.038, 0.12);
    if (this.nitro) this.smooth(this.nitro.gain, boost ? 0.062 : 0, boost ? 0.065 : 0.18);
    if (this.siren) this.smooth(this.siren.gain, pursuit * (0.014 + velocity * 0.008), 0.5);
    if (this.sirenLfo) this.smooth(this.sirenLfo.frequency, 0.85 + pursuit * 0.6, 0.6);
  }

  play(kind: SoundKind): void {
    const context = this.context;
    if (!context || context.state !== "running" || this.paused || this.disposed) return;
    const now = context.currentTime;
    const cooldown = kind === "crash" ? 0.18 : kind === "nearMiss" ? 0.25 : 0.055;
    if (now - (this.lastPlayed.get(kind) ?? -Infinity) < cooldown) return;
    this.lastPlayed.set(kind, now);

    switch (kind) {
      case "pickup":
        this.tone(660, 840, 0.13, 0.11, "sine");
        this.tone(990, 1120, 0.2, 0.08, "sine", 0.075);
        break;
      case "crash":
        this.noise(0.24, 0.16, 1250);
        this.tone(92, 34, 0.23, 0.18, "triangle");
        break;
      case "delivery":
        [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
          this.tone(frequency, frequency, 0.32, 0.1, "sine", index * 0.085);
        });
        break;
      case "nearMiss":
        this.noise(0.14, 0.05, 2600);
        this.tone(980, 1450, 0.1, 0.035, "sine");
        break;
      case "start":
        [220, 277.18, 329.63, 440].forEach((frequency, index) => {
          this.tone(frequency, frequency * 1.005, 0.2, 0.085, "triangle", index * 0.065);
        });
        break;
      case "end":
        [329.63, 277.18, 220].forEach((frequency, index) => {
          this.tone(frequency, frequency * 0.96, 0.36, 0.095, "sine", index * 0.15);
        });
        break;
    }
  }

  suspend(): void {
    this.paused = true;
    this.stopEffects();
    this.lastPlayed.clear();
    if (this.context && this.context.state !== "closed") {
      [this.engine, this.road, this.nitro, this.siren].forEach((gain) => {
        if (!gain) return;
        gain.gain.cancelScheduledValues(this.context!.currentTime);
        gain.gain.setValueAtTime(0, this.context!.currentTime);
      });
      void this.context.suspend().catch(() => {});
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.paused = true;
    this.stopEffects();
    this.sources.forEach((source) => {
      try { source.stop(); } catch { /* Already stopped. */ }
    });
    this.nodes.forEach((node) => {
      try { node.disconnect(); } catch { /* Already disconnected. */ }
    });
    this.sources.clear();
    this.nodes.clear();
    this.engineOscillators = [];
    this.noiseBuffer = null;
    if (this.context && this.context.state !== "closed") void this.context.close().catch(() => {});
    this.context = null;
    this.master = this.effects = this.engine = this.road = this.nitro = this.siren = null;
    this.engineFilter = null;
    this.sirenLfo = null;
    this.lastPlayed.clear();
  }

  private track<T extends AudioNode>(node: T): T {
    this.nodes.add(node);
    return node;
  }

  private createGraph(context: AudioContext): void {
    this.master = this.track(context.createGain());
    this.master.gain.value = this.muted ? 0 : 0.34;
    const compressor = this.track(context.createDynamicsCompressor());
    compressor.threshold.value = -19;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.008;
    compressor.release.value = 0.18;
    this.master.connect(compressor).connect(context.destination);
    this.effects = this.track(context.createGain());
    this.effects.gain.value = 0.85;
    this.effects.connect(this.master);

    this.engine = this.track(context.createGain());
    this.engine.gain.value = 0;
    this.engineFilter = this.track(context.createBiquadFilter());
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.value = 450;
    this.engineFilter.Q.value = 0.65;
    this.engineFilter.connect(this.engine).connect(this.master);
    ["triangle", "sawtooth"].forEach((type, index) => {
      const oscillator = this.track(context.createOscillator());
      oscillator.type = type as OscillatorType;
      oscillator.frequency.value = index === 0 ? 38 : 76.2;
      const level = this.track(context.createGain());
      level.gain.value = index === 0 ? 0.85 : 0.22;
      oscillator.connect(level).connect(this.engineFilter!);
      oscillator.start();
      this.sources.add(oscillator);
      this.engineOscillators.push(oscillator);
    });

    this.noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const samples = this.noiseBuffer.getChannelData(0);
    let seed = 1234567;
    for (let index = 0; index < samples.length; index++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      samples[index] = (seed >>> 0) / 2147483648 - 1;
    }
    const noise = this.track(context.createBufferSource());
    noise.buffer = this.noiseBuffer;
    noise.loop = true;
    const roadFilter = this.track(context.createBiquadFilter());
    roadFilter.type = "bandpass";
    roadFilter.frequency.value = 750;
    roadFilter.Q.value = 0.45;
    this.road = this.track(context.createGain());
    this.road.gain.value = 0;
    noise.connect(roadFilter).connect(this.road).connect(this.master);
    const nitroFilter = this.track(context.createBiquadFilter());
    nitroFilter.type = "bandpass";
    nitroFilter.frequency.value = 1800;
    nitroFilter.Q.value = 0.5;
    this.nitro = this.track(context.createGain());
    this.nitro.gain.value = 0;
    noise.connect(nitroFilter).connect(this.nitro).connect(this.master);
    noise.start();
    this.sources.add(noise);

    const sirenOscillator = this.track(context.createOscillator());
    sirenOscillator.type = "sine";
    sirenOscillator.frequency.value = 690;
    this.sirenLfo = this.track(context.createOscillator());
    this.sirenLfo.frequency.value = 1;
    const sirenSweep = this.track(context.createGain());
    sirenSweep.gain.value = 155;
    this.sirenLfo.connect(sirenSweep).connect(sirenOscillator.frequency);
    this.siren = this.track(context.createGain());
    this.siren.gain.value = 0;
    sirenOscillator.connect(this.siren).connect(this.master);
    sirenOscillator.start();
    this.sirenLfo.start();
    this.sources.add(sirenOscillator);
    this.sources.add(this.sirenLfo);
  }

  private smooth(parameter: AudioParam, target: number, seconds: number): void {
    if (!this.context) return;
    // Cancel the old tail so frame updates cannot build an unbounded event queue.
    parameter.cancelScheduledValues(this.context.currentTime);
    parameter.setTargetAtTime(target, this.context.currentTime, seconds);
  }

  private tone(from: number, to: number, duration: number, volume: number, type: OscillatorType, delay = 0): void {
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
    envelope.gain.exponentialRampToValueAtTime(volume, start + 0.009);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope).connect(this.effects);
    this.registerVoice(oscillator, [oscillator, envelope]);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.025);
  }

  private noise(duration: number, volume: number, cutoff: number): void {
    const context = this.context;
    if (!context || !this.effects || !this.noiseBuffer) return;
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, context.currentTime);
    envelope.gain.exponentialRampToValueAtTime(volume, context.currentTime + 0.007);
    envelope.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    source.connect(filter).connect(envelope).connect(this.effects);
    this.registerVoice(source, [source, filter, envelope]);
    source.start();
    source.stop(context.currentTime + duration + 0.02);
  }

  private registerVoice(source: AudioScheduledSourceNode, nodes: AudioNode[]): void {
    // Dense collision/pickup moments cannot leave an ever-growing pool of voices.
    if (this.voices.size >= 16) {
      const oldest = this.voices.values().next().value as Voice | undefined;
      if (oldest) {
        try { oldest.source.stop(); } catch { /* It may have just ended. */ }
        oldest.release();
      }
    }
    const voice: Voice = {
      source,
      nodes,
      release: () => {
        source.onended = null;
        nodes.forEach((node) => node.disconnect());
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
