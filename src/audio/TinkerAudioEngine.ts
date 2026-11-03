/**
 * TinkerAudioEngine.ts
 * --------------------
 * Mentor Note: Mechanical & Physics Web Audio API Studio for the Heirloom Tinker Workshop
 * ("The Clockwork Marble & Acorn Automaton Wall" — `TinkerWorkshopScene.ts`).
 *
 * Why a custom Web Audio synthesizer + convolution reverb here?
 * - In a Rube Goldberg marble & acorn contraption wall, multiple mechanical events happen in
 *   rapid succession: wooden chute rolling ticks, brass gear ratchets, trampoline spring boings,
 *   seesaw antique bells, accordion wind bellows puffs, and ascending star-collection arpeggios.
 * - By routing procedural physical-modeling synthesizers and decoded character voice buffers
 *   (`sfx-doggie.mp3`, `sfx-sparky.mp3`) through a warm 0.95s walnut-workshop impulse response
 *   (`ConvolverNode` at `20%` wet) and a master `DynamicsCompressorNode`, every clack, ratchet,
 *   and bell chime feels like a real heirloom wooden toy in Papa's workshop!
 */

import { AudioBus } from '../core/AudioBus';

export class TinkerAudioEngine {
  private ctx: AudioContext | null = null;
  private masterInput: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private doggieBuffer: AudioBuffer | null = null;
  private sparkyBuffer: AudioBuffer | null = null;
  private samplesLoading = false;
  private lastRollTickTime = 0;
  private lastFunnelClangTime = 0;

  constructor() {
    this.ensureContext();
    void this.preloadSampleBuffers();
  }

  /**
   * Initializes the Web Audio graph with a warm wooden workshop room convolution reverb
   * (`20%` wet) and a master `DynamicsCompressorNode`.
   */
  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;

      this.ctx = new AudioCtx();

      this.masterInput = this.ctx.createGain();
      this.masterInput.gain.value = 0.92;

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -14;
      this.compressor.knee.value = 16;
      this.compressor.ratio.value = 4.0;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.16;

      this.dryGain = this.ctx.createGain();
      this.dryGain.gain.value = 0.80;

      this.wetGain = this.ctx.createGain();
      this.wetGain.gain.value = 0.20;

      this.convolver = this.ctx.createConvolver();
      this.convolver.buffer = this.createWorkshopImpulseResponse(this.ctx, 0.95);

      this.masterInput.connect(this.dryGain);
      this.masterInput.connect(this.convolver);
      this.convolver.connect(this.wetGain);

      this.dryGain.connect(this.compressor);
      this.wetGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      this.noiseBuffer = this.createWhiteNoiseBuffer(this.ctx, 0.6);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  /**
   * Generates a 0.95-second stereo impulse response modeling a warm walnut & mahogany workshop room
   * with crisp early reflections and natural high-frequency absorption.
   */
  private createWorkshopImpulseResponse(ctx: AudioContext, durationSec: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * durationSec);
    const impulse = ctx.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      let lpPrev = 0;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const env = Math.pow(1 - i / length, 2.4) * Math.exp(-t * 3.1);
        const rawNoise = Math.random() * 2 - 1;
        const damp = 0.28 + 0.42 * Math.exp(-t * 3.8);
        lpPrev = lpPrev + damp * (rawNoise - lpPrev);
        data[i] = lpPrev * env * 0.85;
      }
    }
    return impulse;
  }

  /**
   * Pre-generates a 0.6s white noise buffer for bellows wind gusts, whisk brooms, and woody clicks.
   */
  private createWhiteNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * Preloads and decodes `sfx-doggie.mp3` and `sfx-sparky.mp3` (with fallbacks) into `AudioBuffer`s.
   */
  public async preloadSampleBuffers(): Promise<void> {
    if (this.samplesLoading || (this.doggieBuffer && this.sparkyBuffer)) return;
    this.samplesLoading = true;

    const ctx = this.ensureContext();
    if (!ctx) {
      this.samplesLoading = false;
      return;
    }

    const loadFirstAvailable = async (urls: string[]): Promise<AudioBuffer | null> => {
      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const arr = await res.arrayBuffer();
          return await ctx.decodeAudioData(arr.slice(0));
        } catch {
          // Try next fallback
        }
      }
      return null;
    };

    try {
      const [doggie, sparky] = await Promise.all([
        loadFirstAvailable([
          '/assets/stories/nana/audio/sfx-doggie.mp3',
          '/assets/stories/nana/audio/sfx-doggie-bark.mp3'
        ]),
        loadFirstAvailable([
          '/assets/stories/nana/audio/sfx-sparky.mp3',
          '/assets/stories/nana/audio/sfx-sparky-tulip.mp3',
          '/assets/stories/nana/audio/sfx-bluejay-whistle.mp3'
        ])
      ]);
      if (doggie) this.doggieBuffer = doggie;
      if (sparky) this.sparkyBuffer = sparky;
    } finally {
      this.samplesLoading = false;
    }
  }

  /**
   * 1. `playPegSnap()`:
   * Crisp, chunky mahogany peg *clack-thud* (`180Hz -> 95Hz` woody resonant filter + short `1400Hz` brass click transient).
   */
  public playPegSnap(): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    // Layer 1: Chunky mahogany peg clack-thud (180Hz -> 95Hz woody resonant filter)
    const woodOsc = ctx.createOscillator();
    const woodFilter = ctx.createBiquadFilter();
    const woodGain = ctx.createGain();

    woodOsc.type = 'triangle';
    woodOsc.frequency.setValueAtTime(180, now);
    woodOsc.frequency.exponentialRampToValueAtTime(95, now + 0.065);

    woodFilter.type = 'bandpass';
    woodFilter.frequency.setValueAtTime(240, now);
    woodFilter.Q.setValueAtTime(2.6, now);

    woodGain.gain.setValueAtTime(0.001, now);
    woodGain.gain.linearRampToValueAtTime(0.55, now + 0.004);
    woodGain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

    woodOsc.connect(woodFilter);
    woodFilter.connect(woodGain);
    woodGain.connect(this.masterInput);
    woodOsc.start(now);
    woodOsc.stop(now + 0.09);

    // Layer 2: Short 1400Hz brass click transient
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(1400, now);
    clickOsc.frequency.exponentialRampToValueAtTime(680, now + 0.018);

    clickGain.gain.setValueAtTime(0.28, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);

    clickOsc.connect(clickGain);
    clickGain.connect(this.masterInput);
    clickOsc.start(now);
    clickOsc.stop(now + 0.025);
  }

  /**
   * 2. `playRotateClick()`:
   * Tactile brass ratchet click (`2400Hz` & `3200Hz` dual-impulse mechanical latch).
   */
  public playRotateClick(): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    const impulses = [
      { delay: 0, freq: 2400, gain: 0.26 },
      { delay: 0.028, freq: 3200, gain: 0.32 }
    ];

    impulses.forEach((imp) => {
      if (!this.masterInput) return;
      const t = now + imp.delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(imp.freq, t);
      osc.frequency.exponentialRampToValueAtTime(imp.freq * 0.48, t + 0.02);

      gain.gain.setValueAtTime(imp.gain, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.024);

      osc.connect(gain);
      gain.connect(this.masterInput);
      osc.start(t);
      osc.stop(t + 0.028);
    });
  }

  /**
   * 3. `playRollTick(speed)`:
   * Subtle wooden marble-on-mahogany rolling rattle triggered periodically while a marble rolls along a wooden chute.
   */
  public playRollTick(speed = 1.0): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;

    const nowMs = performance.now();
    const minIntervalMs = Math.max(42, 95 - Math.min(50, speed * 0.15));
    if (nowMs - this.lastRollTickTime < minIntervalMs) return;
    this.lastRollTickTime = nowMs;

    const now = ctx.currentTime;
    const pitchFactor = 0.92 + Math.min(0.35, speed / 700) + (Math.random() * 0.08 - 0.04);

    const osc = ctx.createOscillator();
    const bp = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520 * pitchFactor, now);
    osc.frequency.exponentialRampToValueAtTime(290 * pitchFactor, now + 0.022);

    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(680 * pitchFactor, now);
    bp.Q.setValueAtTime(3.0, now);

    const vol = Math.min(0.22, 0.08 + (speed / 500) * 0.1);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.026);

    osc.connect(bp);
    bp.connect(gain);
    gain.connect(this.masterInput);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  /**
   * 4. `playGearRatchet()`:
   * Clockwork brass escapement ratchet tick-tock as a scoop-gear lifts or transfers a marble.
   */
  public playGearRatchet(): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    // 4-step clockwork brass escapement ratchet sequence
    const ticks = [
      { offset: 0.0, freq: 1650, body: 420, gain: 0.25 },
      { offset: 0.065, freq: 1920, body: 480, gain: 0.22 },
      { offset: 0.13, freq: 1750, body: 440, gain: 0.25 },
      { offset: 0.195, freq: 2180, body: 540, gain: 0.30 }
    ];

    ticks.forEach((tk) => {
      if (!this.masterInput) return;
      const t = now + tk.offset;

      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(tk.freq, t);
      osc.frequency.exponentialRampToValueAtTime(tk.body, t + 0.028);

      g.gain.setValueAtTime(tk.gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

      osc.connect(g);
      g.connect(this.masterInput);
      osc.start(t);
      osc.stop(t + 0.04);
    });
  }

  /**
   * 5. `playTrampolineBounce()`:
   * Joyful leather drum *boing-thump!* (`130Hz -> 290Hz` pitch bend + warm brass spring shimmer).
   */
  public playTrampolineBounce(): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    // Layer 1: Leather drum boing-thump (130Hz -> 290Hz -> 165Hz)
    const drumOsc = ctx.createOscillator();
    const drumGain = ctx.createGain();
    drumOsc.type = 'sine';
    drumOsc.frequency.setValueAtTime(130, now);
    drumOsc.frequency.exponentialRampToValueAtTime(290, now + 0.085);
    drumOsc.frequency.exponentialRampToValueAtTime(165, now + 0.26);

    drumGain.gain.setValueAtTime(0.001, now);
    drumGain.gain.linearRampToValueAtTime(0.52, now + 0.008);
    drumGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    drumOsc.connect(drumGain);
    drumGain.connect(this.masterInput);
    drumOsc.start(now);
    drumOsc.stop(now + 0.30);

    // Layer 2: Warm brass coiled spring shimmer (FM vibrato overtone)
    const springOsc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const springGain = ctx.createGain();

    springOsc.type = 'triangle';
    springOsc.frequency.setValueAtTime(520, now);
    springOsc.frequency.exponentialRampToValueAtTime(880, now + 0.18);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(28, now);
    lfoGain.gain.setValueAtTime(65, now);
    lfo.connect(lfoGain);
    lfoGain.connect(springOsc.frequency);

    springGain.gain.setValueAtTime(0.001, now);
    springGain.gain.linearRampToValueAtTime(0.22, now + 0.012);
    springGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    springOsc.connect(springGain);
    springGain.connect(this.masterInput);

    lfo.start(now);
    springOsc.start(now);
    lfo.stop(now + 0.26);
    springOsc.stop(now + 0.26);
  }

  /**
   * 6. `playSeesawBell()`:
   * Bright, resonant antique brass bell chime (`1046.5Hz C6 + 1567.98Hz G6` bell partials with `1.1s` shimmer)
   * when the seesaw tips or a bumper bell is struck!
   */
  public playSeesawBell(): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    const partials = [
      { freq: 1046.5, gain: 0.36, decay: 1.1 },    // C6 fundamental
      { freq: 1567.98, gain: 0.24, decay: 0.85 },  // G6 fifth
      { freq: 2093.0, gain: 0.14, decay: 0.55 },   // C7 octave shimmer
      { freq: 2884.2, gain: 0.08, decay: 0.32 }    // Inharmonic brass bell ping
    ];

    partials.forEach((p) => {
      if (!this.masterInput) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(p.freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(p.gain, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + p.decay);

      osc.connect(gain);
      gain.connect(this.masterInput);
      osc.start(now);
      osc.stop(now + p.decay + 0.02);
    });
  }

  /**
   * 7. `playBellowsPuff()`:
   * Whooshing accordion wind-gust (bandpass-swept white noise `300Hz -> 1200Hz -> 400Hz` over `280ms` + magical sparkle chime).
   */
  public playBellowsPuff(): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    // Layer 1: Bandpass-swept white noise (300Hz -> 1200Hz -> 400Hz over 280ms)
    if (this.noiseBuffer) {
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = this.noiseBuffer;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(300, now);
      bp.frequency.exponentialRampToValueAtTime(1200, now + 0.11);
      bp.frequency.exponentialRampToValueAtTime(400, now + 0.28);
      bp.Q.setValueAtTime(1.8, now);

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.001, now);
      nGain.gain.linearRampToValueAtTime(0.42, now + 0.045);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.29);

      noiseSrc.connect(bp);
      bp.connect(nGain);
      nGain.connect(this.masterInput);
      noiseSrc.start(now);
      noiseSrc.stop(now + 0.31);
    }

    // Layer 2: Magical accordion & wind sparkle chord (G5 -> B5 -> D6)
    const sparkleFreqs = [783.99, 987.77, 1174.66];
    sparkleFreqs.forEach((f, idx) => {
      if (!this.masterInput) return;
      const t = now + idx * 0.035;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);

      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);

      osc.connect(g);
      g.connect(this.masterInput);
      osc.start(t);
      osc.stop(t + 0.28);
    });
  }

  /**
   * 8. `playStarCollect(starIndex: 0 | 1 | 2)`:
   * Ascending C-Major triad arpeggio chime (`C5 -> E5 -> G5 -> C6`) so collecting stars 1, 2, and 3 builds musical excitement!
   */
  public playStarCollect(starIndex: 0 | 1 | 2): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    // Each star plays a two-note ascending sparkle interval climbing C5 -> E5 -> G5 -> C6
    const starArpeggios: Record<0 | 1 | 2, number[]> = {
      0: [523.25, 659.25],          // Star 1: C5 -> E5
      1: [659.25, 783.99],          // Star 2: E5 -> G5
      2: [783.99, 1046.50, 1318.51] // Star 3: G5 -> C6 -> E6 triumphant sparkle!
    };

    const notes = starArpeggios[starIndex] ?? starArpeggios[0];
    notes.forEach((freq, i) => {
      if (!this.masterInput) return;
      const t = now + i * 0.055;
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 2.0, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.32, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.65);

      const otGain = ctx.createGain();
      otGain.gain.setValueAtTime(0.12, t);
      otGain.gain.exponentialRampToValueAtTime(0.0008, t + 0.35);

      osc.connect(gain);
      overtone.connect(otGain);
      otGain.connect(gain);
      gain.connect(this.masterInput);

      osc.start(t);
      overtone.start(t);
      osc.stop(t + 0.68);
      overtone.stop(t + 0.68);
    });
  }

  /**
   * 9. `playCartCatch()`:
   * Celebratory wooden cart thud + pitch-shifted happy Doggie bark snippet (`sfx-doggie.mp3`)
   * + victory brass fanfare when the puzzle goal is completed!
   */
  public playCartCatch(fullFanfare = true): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    // 1. Cozy wooden cart basket catch thud (150Hz -> 82Hz)
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(150, now);
    thudOsc.frequency.exponentialRampToValueAtTime(82, now + 0.11);

    thudGain.gain.setValueAtTime(0.48, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    thudOsc.connect(thudGain);
    thudGain.connect(this.masterInput);
    thudOsc.start(now);
    thudOsc.stop(now + 0.14);

    // 2. Pitch-shifted happy Doggie bark snippet
    if (this.doggieBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.doggieBuffer;
      src.playbackRate.setValueAtTime(1.08, now + 0.04);

      const sGain = ctx.createGain();
      const offset = Math.min(0.04, this.doggieBuffer.duration * 0.04);
      const dur = Math.min(0.45, Math.max(0.2, this.doggieBuffer.duration - offset));

      sGain.gain.setValueAtTime(0.001, now + 0.04);
      sGain.gain.linearRampToValueAtTime(0.62, now + 0.055);
      sGain.gain.exponentialRampToValueAtTime(0.002, now + 0.04 + dur);

      src.connect(sGain);
      sGain.connect(this.masterInput);
      src.start(now + 0.04, offset, dur + 0.02);
    }

    if (!fullFanfare) return;

    // 3. Celebratory C-Major victory brass & glockenspiel fanfare (C5 - E5 - G5 - C6)
    const fanfareNotes = [
      { freq: 523.25, delay: 0.08, dur: 0.28 },
      { freq: 659.25, delay: 0.17, dur: 0.28 },
      { freq: 783.99, delay: 0.26, dur: 0.30 },
      { freq: 1046.50, delay: 0.36, dur: 0.85 }
    ];

    fanfareNotes.forEach((n) => {
      if (!this.masterInput) return;
      const t = now + n.delay;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(n.freq, t);
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(n.freq * 1.002, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2600, t);
      filter.frequency.exponentialRampToValueAtTime(1100, t + n.dur);

      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.26, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0008, t + n.dur);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(g);
      g.connect(this.masterInput);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + n.dur + 0.02);
      osc2.stop(t + n.dur + 0.02);
    });
  }

  /**
   * Plays a brass hopper lever clack + cheerful Sparky chirp when launching a marble or acorn.
   */
  public playHopperDrop(): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    // Brass lever pull clack
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.045);

    g.gain.setValueAtTime(0.32, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(g);
    g.connect(this.masterInput);
    osc.start(now);
    osc.stop(now + 0.065);

    if (this.sparkyBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.sparkyBuffer;
      src.playbackRate.setValueAtTime(1.15, now + 0.02);

      const sGain = ctx.createGain();
      const offset = Math.min(0.04, this.sparkyBuffer.duration * 0.04);
      const dur = Math.min(0.28, Math.max(0.14, this.sparkyBuffer.duration - offset));

      sGain.gain.setValueAtTime(0.001, now + 0.02);
      sGain.gain.linearRampToValueAtTime(0.30, now + 0.035);
      sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02 + dur);

      src.connect(sGain);
      sGain.connect(this.masterInput);
      src.start(now + 0.02, offset, dur + 0.02);
    }
  }

  /**
   * Plays a cheerful whisk-broom sweep sound and descending sparkle chime when clearing user-placed parts.
   */
  public playSweepClear(): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1800, now);
      bp.frequency.exponentialRampToValueAtTime(650, now + 0.24);
      bp.Q.setValueAtTime(1.5, now);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.34, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      src.connect(bp);
      bp.connect(g);
      g.connect(this.masterInput);
      src.start(now);
      src.stop(now + 0.26);
    }
  }

  /**
   * Plays a crisp glass-marble clink or warm hardwood-acorn knock when two active balls collide.
   */
  public playBallClink(impactSpeed = 120, hasAcorn = false): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    const intensity = Math.min(1, Math.max(0.28, impactSpeed / 260));

    // Primary resonant ping (glassy high ring vs. dense hardwood/brass knock)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = hasAcorn ? 'triangle' : 'sine';
    const baseFreq = hasAcorn ? 760 : 1920;
    osc1.frequency.setValueAtTime(baseFreq, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.65, now + 0.055);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.26 * intensity, now + 0.003);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc1.connect(gain1);
    gain1.connect(this.masterInput);
    osc1.start(now);
    osc1.stop(now + 0.065);

    // Secondary harmonic overtone click
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    const overtoneFreq = hasAcorn ? 1340 : 2880;
    osc2.frequency.setValueAtTime(overtoneFreq, now);
    osc2.frequency.exponentialRampToValueAtTime(overtoneFreq * 0.8, now + 0.03);

    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.linearRampToValueAtTime(0.16 * intensity, now + 0.002);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc2.connect(gain2);
    gain2.connect(this.masterInput);
    osc2.start(now);
    osc2.stop(now + 0.04);
  }

  /**
   * Plays a gentle, encouraging woody double-thud when a ball lands in Doggie's cart in 3-Star Challenge Mode
   * before all 3 stars (`3 / 3`) have been collected.
   */
  public playAlmostThud(): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    const notes = [245, 185];
    notes.forEach((freq, idx) => {
      if (!this.masterInput) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.11;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.72, t + 0.09);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.095);

      osc.connect(gain);
      gain.connect(this.masterInput);
      osc.start(t);
      osc.stop(t + 0.1);
    });
  }

  /**
   * Plays a quick vacuum-intake whoosh when the Dragon Bellows (`part-bellows`) sucks in a ball
   * over `220ms` before firing it out of the nozzle.
   */
  public playBellowsIntake(): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(980, now);
      bp.frequency.exponentialRampToValueAtTime(280, now + 0.18);
      bp.Q.setValueAtTime(2.2, now);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.32, now + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.20);

      src.connect(bp);
      bp.connect(g);
      g.connect(this.masterInput);
      src.start(now);
      src.stop(now + 0.21);
    }

    const osc = ctx.createOscillator();
    const gOsc = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.18);

    gOsc.gain.setValueAtTime(0.001, now);
    gOsc.gain.linearRampToValueAtTime(0.18, now + 0.05);
    gOsc.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

    osc.connect(gOsc);
    gOsc.connect(this.masterInput);
    osc.start(now);
    osc.stop(now + 0.20);
  }

  /**
   * Plays a chunky hardwood mallet thwack + brass collar ring when `part-hammer` strikes a ball.
   */
  public playHammerThwack(): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    // Hardwood mallet body punch (160Hz -> 68Hz)
    const woodOsc = ctx.createOscillator();
    const woodGain = ctx.createGain();
    woodOsc.type = 'triangle';
    woodOsc.frequency.setValueAtTime(160, now);
    woodOsc.frequency.exponentialRampToValueAtTime(68, now + 0.09);

    woodGain.gain.setValueAtTime(0.001, now);
    woodGain.gain.linearRampToValueAtTime(0.55, now + 0.004);
    woodGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    woodOsc.connect(woodGain);
    woodGain.connect(this.masterInput);
    woodOsc.start(now);
    woodOsc.stop(now + 0.12);

    // Brass mallet band overtone ring
    const ringOsc = ctx.createOscillator();
    const ringGain = ctx.createGain();
    ringOsc.type = 'sine';
    ringOsc.frequency.setValueAtTime(920, now);
    ringOsc.frequency.exponentialRampToValueAtTime(540, now + 0.07);

    ringGain.gain.setValueAtTime(0.24, now);
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    ringOsc.connect(ringGain);
    ringGain.connect(this.masterInput);
    ringOsc.start(now);
    ringOsc.stop(now + 0.085);
  }

  /**
   * Plays a warm brass funnel swirl-clink when `part-funnel` catches and drops a ball straight down.
   */
  public playFunnelDrop(): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1180, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.09);

    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.28, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.10);

    osc.connect(g);
    g.connect(this.masterInput);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  /**
   * Plays a bright metallic sheet-brass clang (`clank-clink-tink!`) with a 55ms cooldown
   * as a ball ricochets back and forth off the narrowing inner cone walls of `part-funnel`.
   */
  public playFunnelClang(pitchMultiplier = 1.0): void {
    if (AudioBus.getMuted()) return;
    const nowMs = performance.now();
    if (nowMs - this.lastFunnelClangTime < 55) return;
    this.lastFunnelClangTime = nowMs;

    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    const p = Math.max(0.85, Math.min(1.65, pitchMultiplier));

    // Metallic sheet-brass fundamental + inharmonic bell partial
    const freqs = [1120 * p, 1740 * p, 2620 * p];
    const gains = [0.24, 0.16, 0.09];

    freqs.forEach((f, idx) => {
      if (!this.masterInput) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.86, now + 0.065);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(gains[idx], now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

      osc.connect(gain);
      gain.connect(this.masterInput);
      osc.start(now);
      osc.stop(now + 0.08);
    });
  }

  public stopAll(): void {
    // One-shot synth voices auto-terminate cleanly
  }
}
