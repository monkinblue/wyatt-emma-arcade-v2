/**
 * src/core/TinkerAudioEngine.ts
 * -----------------------------
 * Mentor Note: Dynamic Physics & Voice Audio Engine for "Tinker Workshop" (`TinkerWorkshopScene.ts`).
 *
 * What does this file do and why do we use a hybrid Howler.js + Web Audio API architecture?
 * 1. **ElevenLabs Sound Effects & Voice Coaching (Howler.js):**
 *    Pre-generated MP3s in `/assets/audio/tinker/prompts/` (calm Josh voice lines with `stability=0.86`
 *    and period endings) and `/assets/audio/tinker/sfx/` (soft/hard wood impacts, brass bells, spring boings,
 *    bellows wind, wooden rolling loop, funnel drops, and minecart fanfare) give rich studio texture.
 * 2. **Velocity-Scaled & Pitch-Stepped Synthesis (Web Audio API):**
 *    When a marble strikes a Musical Pentatonic Chime Bar at position `x`, rolls faster down a steep ramp,
 *    or collects Stars `1 -> 2 -> 3`, we modulate playback rate, volume, and harmonic partials in real time
 *    through a warm walnut-workshop room impulse response (`ConvolverNode` + `DynamicsCompressorNode`).
 */

import { Howl } from 'howler';
import { ArcadeState } from './ArcadeState';
import { AudioBus } from './AudioBus';

const PENTATONIC_FREQS = [523.25, 587.33, 659.25, 783.99, 880.0] as const; // C5, D5, E5, G5, A5
const MISS_PROMPT_KEYS = ['miss_trail_1', 'miss_trail_2', 'miss_trail_3'] as const;

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

  private howlCache: Map<string, Howl> = new Map();
  private activeVoiceHowl: Howl | null = null;
  private rollLoopHowl: Howl | null = null;
  private rollLoopSoundId: number | null = null;

  private lastRollTickTime = 0;
  private lastWoodHitTime = 0;
  private lastPaddleWhirTime = 0;
  private lastBellowsWhooshTime = 0;
  private lastFunnelSoundTime = 0;
  private lastMissVoiceAt = 0;
  private missCounter = 0;

  constructor() {
    this.ensureContext();
    void this.preloadSampleBuffers();
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;

      this.ctx = new AudioCtx();

      this.masterInput = this.ctx.createGain();
      this.masterInput.gain.value = 0.9;

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -14;
      this.compressor.knee.value = 16;
      this.compressor.ratio.value = 4.0;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.16;

      this.dryGain = this.ctx.createGain();
      this.dryGain.gain.value = 0.82;

      this.wetGain = this.ctx.createGain();
      this.wetGain.gain.value = 0.18;

      this.convolver = this.ctx.createConvolver();
      this.convolver.buffer = this.createWorkshopImpulseResponse(this.ctx, 0.85);

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

  private createWorkshopImpulseResponse(ctx: AudioContext, durationSec: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * durationSec);
    const impulse = ctx.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      let lpPrev = 0;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const env = Math.pow(1 - i / length, 2.4) * Math.exp(-t * 3.2);
        const rawNoise = Math.random() * 2 - 1;
        const damp = 0.28 + 0.42 * Math.exp(-t * 3.8);
        lpPrev = lpPrev + damp * (rawNoise - lpPrev);
        data[i] = lpPrev * env * 0.82;
      }
    }
    return impulse;
  }

  private createWhiteNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

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

  private getOrCreateHowl(src: string, volume = 0.65, loop = false): Howl {
    let howl = this.howlCache.get(src);
    if (!howl) {
      howl = new Howl({
        src: [src],
        volume,
        loop,
        preload: true
      });
      this.howlCache.set(src, howl);
    } else {
      howl.volume(volume);
      howl.loop(loop);
    }
    return howl;
  }

  private playSfxHowl(sfxKey: string, volume = 0.55, rate = 1.0): void {
    if (AudioBus.getMuted()) return;
    const src = `/assets/audio/tinker/sfx/${sfxKey}.mp3?v=tk2`;
    const howl = this.getOrCreateHowl(src, Math.max(0.05, Math.min(1.0, volume)), false);
    const id = howl.play();
    if (rate !== 1.0) {
      howl.rate(Math.max(0.5, Math.min(2.0, rate)), id);
    }
  }

  // ===========================================================================
  // VOICE COACHING & NARRATION (`stability=0.86`, calm period endings)
  // ===========================================================================

  public stopVoice(): void {
    AudioBus.stopLayerSfx('/assets/audio/tinker/prompts/welcome_title.mp3');
    if (this.activeVoiceHowl) {
      this.activeVoiceHowl.stop();
      this.activeVoiceHowl = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public speakPrompt(promptId: string, onEnd?: () => void): void {
    if (AudioBus.getMuted()) {
      if (onEnd) onEnd();
      return;
    }
    this.stopVoice();

    const src = `/assets/audio/tinker/prompts/${promptId}.mp3?v=tk2`;
    const howl = this.getOrCreateHowl(src, 0.82, false);
    this.activeVoiceHowl = howl;

    howl.once('end', () => {
      if (this.activeVoiceHowl === howl) {
        this.activeVoiceHowl = null;
      }
      if (onEnd) onEnd();
    });

    howl.once('loaderror', () => {
      if (this.activeVoiceHowl === howl) {
        this.activeVoiceHowl = null;
      }
      if (onEnd) onEnd();
    });

    howl.play();
  }

  public speakVictoryForActiveKid(): void {
    const kid = ArcadeState.getActiveKid();
    this.speakPrompt(kid.id === 'emma' ? 'victory_emma' : 'victory_wyatt');
  }

  // ===========================================================================
  // DYNAMIC ROLLING LOOP MODULATED BY MARBLE SPEED
  // ===========================================================================

  /**
   * Modulates the continuous wooden rolling loop (`wood_roll_loop.mp3`) + subtle hardwood ticks
   * based on the fastest rolling marble currently in contact with a wooden surface.
   */
  public updateRollingLoop(maxRollingSpeed: number, isRollingOnWood: boolean): void {
    if (AudioBus.getMuted() || !isRollingOnWood || maxRollingSpeed < 18) {
      if (this.rollLoopHowl && this.rollLoopSoundId !== null && this.rollLoopHowl.playing(this.rollLoopSoundId)) {
        this.rollLoopHowl.volume(0, this.rollLoopSoundId);
      }
      return;
    }

    const src = '/assets/audio/tinker/sfx/wood_roll_loop.mp3?v=tk2';
    if (!this.rollLoopHowl) {
      this.rollLoopHowl = this.getOrCreateHowl(src, 0.0, true);
    }

    const normSpeed = Math.min(1.0, maxRollingSpeed / 480);
    const targetVol = 0.08 + normSpeed * 0.34;
    const targetRate = 0.78 + normSpeed * 0.56;

    if (this.rollLoopSoundId === null || !this.rollLoopHowl.playing(this.rollLoopSoundId)) {
      this.rollLoopSoundId = this.rollLoopHowl.play();
    }

    this.rollLoopHowl.volume(targetVol, this.rollLoopSoundId);
    this.rollLoopHowl.rate(targetRate, this.rollLoopSoundId);

    this.playRollTick(maxRollingSpeed);
  }

  public playRollTick(speed = 1.0): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;

    const nowMs = performance.now();
    const minIntervalMs = Math.max(44, 98 - Math.min(52, speed * 0.14));
    if (nowMs - this.lastRollTickTime < minIntervalMs) return;
    this.lastRollTickTime = nowMs;

    const now = ctx.currentTime;
    const pitchFactor = 0.92 + Math.min(0.35, speed / 700) + (Math.random() * 0.06 - 0.03);

    const osc = ctx.createOscillator();
    const bp = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(510 * pitchFactor, now);
    osc.frequency.exponentialRampToValueAtTime(280 * pitchFactor, now + 0.022);

    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(660 * pitchFactor, now);
    bp.Q.setValueAtTime(3.0, now);

    const vol = Math.min(0.18, 0.06 + (speed / 550) * 0.1);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.026);

    osc.connect(bp);
    bp.connect(gain);
    gain.connect(this.masterInput);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  // ===========================================================================
  // VELOCITY-SCALED COLLISION & CONTRAPTION SFX
  // ===========================================================================

  /**
   * Velocity-scaled wooden impact: soft wooden tap (`impactSpeed < 210`) vs. hard wooden clack (`>= 210`).
   */
  public playWoodCollision(impactSpeed: number, mass = 1.0): void {
    if (AudioBus.getMuted()) return;
    const nowMs = performance.now();
    if (nowMs - this.lastWoodHitTime < 45) return;
    this.lastWoodHitTime = nowMs;

    const normVel = Math.min(1.0, Math.max(0.15, impactSpeed / 460));
    const pitchRate = Math.max(0.75, Math.min(1.25, (1.05 - (mass - 1.0) * 0.12) + (Math.random() * 0.08 - 0.04)));

    if (impactSpeed < 210) {
      this.playSfxHowl('wood_tap_soft', 0.25 + normVel * 0.42, pitchRate);
    } else {
      this.playSfxHowl('wood_clack_hard', 0.35 + normVel * 0.48, pitchRate);
    }

    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    const woodOsc = ctx.createOscillator();
    const woodGain = ctx.createGain();
    woodOsc.type = 'triangle';
    const baseFreq = (impactSpeed >= 210 ? 240 : 185) * pitchRate;
    woodOsc.frequency.setValueAtTime(baseFreq, now);
    woodOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.52, now + 0.055);

    woodGain.gain.setValueAtTime(0.24 * normVel, now);
    woodGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    woodOsc.connect(woodGain);
    woodGain.connect(this.masterInput);
    woodOsc.start(now);
    woodOsc.stop(now + 0.065);
  }

  /**
   * Spring-Loaded Brass Drum Bumper bounce (`spring_drum_boing.mp3` + drum/bell ring).
   */
  public playDrumBumperBoing(impactSpeed = 280): void {
    if (AudioBus.getMuted()) return;
    const normVel = Math.min(1.0, Math.max(0.35, impactSpeed / 450));
    this.playSfxHowl('spring_drum_boing', 0.48 + normVel * 0.35, 0.96 + normVel * 0.12);

    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    // Layer 1: Warm drum membrane pitch-bend (135Hz -> 295Hz -> 165Hz)
    const drumOsc = ctx.createOscillator();
    const drumGain = ctx.createGain();
    drumOsc.type = 'sine';
    drumOsc.frequency.setValueAtTime(135, now);
    drumOsc.frequency.exponentialRampToValueAtTime(295, now + 0.08);
    drumOsc.frequency.exponentialRampToValueAtTime(165, now + 0.25);

    drumGain.gain.setValueAtTime(0.001, now);
    drumGain.gain.linearRampToValueAtTime(0.42 * normVel, now + 0.008);
    drumGain.gain.exponentialRampToValueAtTime(0.001, now + 0.27);

    drumOsc.connect(drumGain);
    drumGain.connect(this.masterInput);
    drumOsc.start(now);
    drumOsc.stop(now + 0.29);

    // Layer 2: Brass rim bell overtone
    const bellOsc = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(880, now);
    bellGain.gain.setValueAtTime(0.18 * normVel, now);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    bellOsc.connect(bellGain);
    bellGain.connect(this.masterInput);
    bellOsc.start(now);
    bellOsc.stop(now + 0.34);
  }

  public playTrampolineBounce(): void {
    this.playDrumBumperBoing(300);
  }

  /**
   * Musical Pentatonic Chime Bar: rings one of 5 pentatonic notes (`C5, D5, E5, G5, A5`)
   * based on horizontal hit position (`normX` in `0..1`). Returns bar index `0..4`.
   */
  public playPentatonicChimeBar(normX: number, impactSpeed = 240): number {
    const clamped = Math.max(0, Math.min(0.999, normX));
    const barIndex = Math.floor(clamped * 5);
    const freq = PENTATONIC_FREQS[barIndex] ?? 523.25;
    const normVel = Math.min(1.0, Math.max(0.35, impactSpeed / 400));

    // Pitch-shifted bell ding sample
    const rate = freq / 659.25;
    this.playSfxHowl('brass_bell_ding', 0.36 * normVel, rate);

    if (AudioBus.getMuted()) return barIndex;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return barIndex;
    const now = ctx.currentTime;

    const partials = [
      { mult: 1.0, gain: 0.36 * normVel, decay: 0.85 },
      { mult: 2.0, gain: 0.16 * normVel, decay: 0.48 },
      { mult: 3.0, gain: 0.08 * normVel, decay: 0.26 }
    ];

    partials.forEach((p) => {
      if (!this.masterInput) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * p.mult, now);

      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(p.gain, now + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0008, now + p.decay);

      osc.connect(g);
      g.connect(this.masterInput);
      osc.start(now);
      osc.stop(now + p.decay + 0.02);
    });

    return barIndex;
  }

  /**
   * Spinning Brass Paddle Wheel click/whir when struck by a marble.
   */
  public playPaddleWheelStrike(angularSpeed = 4.0): void {
    if (AudioBus.getMuted()) return;
    const nowMs = performance.now();
    if (nowMs - this.lastPaddleWhirTime < 95) return;
    this.lastPaddleWhirTime = nowMs;

    const rate = Math.max(0.85, Math.min(1.4, 0.9 + Math.abs(angularSpeed) * 0.05));
    this.playSfxHowl('paddle_wheel_whir', 0.42, rate);
    this.playGearRatchet();
  }

  public playGearRatchet(): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    const ticks = [
      { offset: 0.0, freq: 1650, body: 420, gain: 0.22 },
      { offset: 0.06, freq: 1920, body: 480, gain: 0.2 },
      { offset: 0.12, freq: 2150, body: 530, gain: 0.24 }
    ];

    ticks.forEach((tk) => {
      if (!this.masterInput) return;
      const t = now + tk.offset;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(tk.freq, t);
      osc.frequency.exponentialRampToValueAtTime(tk.body, t + 0.026);

      g.gain.setValueAtTime(tk.gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.032);

      osc.connect(g);
      g.connect(this.masterInput);
      osc.start(t);
      osc.stop(t + 0.036);
    });
  }

  /**
   * Brass Spring Cannon / Marble Blaster wind-up ratchet (`0.35s` capture & coil compression).
   */
  public playCannonWindup(): void {
    if (AudioBus.getMuted()) return;
    this.playGearRatchet();

    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    // Rising brass spring coil tension sweep over 0.3s
    const coilOsc = ctx.createOscillator();
    const coilGain = ctx.createGain();
    coilOsc.type = 'triangle';
    coilOsc.frequency.setValueAtTime(220, now);
    coilOsc.frequency.exponentialRampToValueAtTime(540, now + 0.3);

    coilGain.gain.setValueAtTime(0.001, now);
    coilGain.gain.linearRampToValueAtTime(0.22, now + 0.04);
    coilGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    coilOsc.connect(coilGain);
    coilGain.connect(this.masterInput);
    coilOsc.start(now);
    coilOsc.stop(now + 0.33);
  }

  /**
   * Brass Spring Cannon / Marble Blaster launch (*BOING-POP!* cartoon cannon + spring release).
   */
  public playCannonFire(): void {
    if (AudioBus.getMuted()) return;
    this.playSfxHowl('spring_drum_boing', 0.68, 1.16);
    this.playSfxHowl('wood_clack_hard', 0.52, 0.88);

    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    // Layer 1: Punchy cartoon cannon POP thump (280Hz -> 72Hz)
    const popOsc = ctx.createOscillator();
    const popGain = ctx.createGain();
    popOsc.type = 'sine';
    popOsc.frequency.setValueAtTime(280, now);
    popOsc.frequency.exponentialRampToValueAtTime(72, now + 0.11);

    popGain.gain.setValueAtTime(0.001, now);
    popGain.gain.linearRampToValueAtTime(0.56, now + 0.005);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    popOsc.connect(popGain);
    popGain.connect(this.masterInput);
    popOsc.start(now);
    popOsc.stop(now + 0.14);

    // Layer 2: Joyful spring BOING pitch bend (190Hz -> 580Hz -> 340Hz)
    const boingOsc = ctx.createOscillator();
    const boingGain = ctx.createGain();
    boingOsc.type = 'triangle';
    boingOsc.frequency.setValueAtTime(190, now + 0.01);
    boingOsc.frequency.exponentialRampToValueAtTime(580, now + 0.09);
    boingOsc.frequency.exponentialRampToValueAtTime(340, now + 0.22);

    boingGain.gain.setValueAtTime(0.001, now + 0.01);
    boingGain.gain.linearRampToValueAtTime(0.36, now + 0.025);
    boingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    boingOsc.connect(boingGain);
    boingGain.connect(this.masterInput);
    boingOsc.start(now + 0.01);
    boingOsc.stop(now + 0.28);

    // Layer 3: Crisp air puff burst at nozzle
    if (this.noiseBuffer) {
      const nSrc = ctx.createBufferSource();
      nSrc.buffer = this.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(950, now);
      bp.Q.setValueAtTime(1.6, now);

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.32, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      nSrc.connect(bp);
      bp.connect(nGain);
      nGain.connect(this.masterInput);
      nSrc.start(now);
      nSrc.stop(now + 0.1);
    }
  }

  public playSeesawBell(): void {
    this.playCannonFire();
  }

  /**
   * Wind Bellows / Updraft Fan single short, crisp air-puff sound played strictly once on entry.
   */
  public playBellowsPuff(): void {
    if (AudioBus.getMuted()) return;
    const nowMs = performance.now();
    if (nowMs - this.lastBellowsWhooshTime < 140) return;
    this.lastBellowsWhooshTime = nowMs;

    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    // Short, crisp single air-puff (0.15s) — never loops or drones
    if (this.noiseBuffer) {
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = this.noiseBuffer;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(520, now);
      bp.frequency.exponentialRampToValueAtTime(1350, now + 0.055);
      bp.frequency.exponentialRampToValueAtTime(640, now + 0.15);
      bp.Q.setValueAtTime(2.2, now);

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.001, now);
      nGain.gain.linearRampToValueAtTime(0.34, now + 0.015);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      noiseSrc.connect(bp);
      bp.connect(nGain);
      nGain.connect(this.masterInput);
      noiseSrc.start(now);
      noiseSrc.stop(now + 0.17);
    }

    const puffOsc = ctx.createOscillator();
    const puffGain = ctx.createGain();
    puffOsc.type = 'sine';
    puffOsc.frequency.setValueAtTime(240, now);
    puffOsc.frequency.exponentialRampToValueAtTime(380, now + 0.07);
    puffGain.gain.setValueAtTime(0.001, now);
    puffGain.gain.linearRampToValueAtTime(0.14, now + 0.012);
    puffGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    puffOsc.connect(puffGain);
    puffGain.connect(this.masterInput);
    puffOsc.start(now);
    puffOsc.stop(now + 0.13);
  }

  public playBellowsIntake(): void {
    this.playBellowsPuff();
  }

  /**
   * Copper Funnel & Tube Drop spiral catch + straight drop ping.
   */
  public playFunnelClang(impactSpeed = 160): void {
    if (AudioBus.getMuted()) return;
    const nowMs = performance.now();
    if (nowMs - this.lastFunnelSoundTime < 110) return;
    this.lastFunnelSoundTime = nowMs;

    const intensity = Math.min(1, Math.max(0.3, impactSpeed / 260));
    this.playSfxHowl('funnel_spiral_drop', 0.46 * intensity, 1.0);

    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    const partials = [
      { freq: 620, endFreq: 560, gain: 0.24 * intensity, dur: 0.16 },
      { freq: 1185, endFreq: 1090, gain: 0.16 * intensity, dur: 0.13 }
    ];

    partials.forEach((p) => {
      if (!this.masterInput) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(p.freq, now);
      osc.frequency.exponentialRampToValueAtTime(p.endFreq, now + p.dur);

      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(p.gain, now + 0.003);
      g.gain.exponentialRampToValueAtTime(0.001, now + p.dur);

      osc.connect(g);
      g.connect(this.masterInput);
      osc.start(now);
      osc.stop(now + p.dur + 0.01);
    });
  }

  /**
   * Star Chime pitch-stepping `1 -> 2 -> 3` (`starIndex: 0 | 1 | 2`).
   */
  public playStarCollect(starIndex: 0 | 1 | 2): void {
    if (AudioBus.getMuted()) return;
    const pitchSteps: Record<0 | 1 | 2, number> = {
      0: 1.0,
      1: 1.12246, // +2 semitones
      2: 1.25992  // +4 semitones (Major third)
    };
    this.playSfxHowl('star_chime', 0.62, pitchSteps[starIndex] ?? 1.0);

    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    const starArpeggios: Record<0 | 1 | 2, number[]> = {
      0: [523.25, 659.25],          // Star 1: C5 -> E5
      1: [659.25, 783.99],          // Star 2: E5 -> G5
      2: [783.99, 1046.5, 1318.51]  // Star 3: G5 -> C6 -> E6
    };

    const notes = starArpeggios[starIndex] ?? starArpeggios[0];
    notes.forEach((freq, i) => {
      if (!this.masterInput) return;
      const t = now + i * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.58);

      osc.connect(gain);
      gain.connect(this.masterInput);
      osc.start(t);
      osc.stop(t + 0.6);
    });
  }

  /**
   * Minecart catch celebration (`minecart_catch_fanfare.mp3` + Doggie happy bark + C-Major brass chord).
   */
  public playCartCatch(fullFanfare = true): void {
    if (AudioBus.getMuted()) return;
    if (fullFanfare) {
      this.playSfxHowl('minecart_catch_fanfare', 0.72, 1.0);
    } else {
      this.playSfxHowl('wood_tap_soft', 0.55, 0.92);
    }

    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    // Cozy wooden cart catch thud
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(150, now);
    thudOsc.frequency.exponentialRampToValueAtTime(82, now + 0.11);

    thudGain.gain.setValueAtTime(0.42, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    thudOsc.connect(thudGain);
    thudGain.connect(this.masterInput);
    thudOsc.start(now);
    thudOsc.stop(now + 0.14);

    if (this.doggieBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.doggieBuffer;
      src.playbackRate.setValueAtTime(1.08, now + 0.04);

      const sGain = ctx.createGain();
      const offset = Math.min(0.04, this.doggieBuffer.duration * 0.04);
      const dur = Math.min(0.45, Math.max(0.2, this.doggieBuffer.duration - offset));

      sGain.gain.setValueAtTime(0.001, now + 0.04);
      sGain.gain.linearRampToValueAtTime(0.58, now + 0.055);
      sGain.gain.exponentialRampToValueAtTime(0.002, now + 0.04 + dur);

      src.connect(sGain);
      sGain.connect(this.masterInput);
      src.start(now + 0.04, offset, dur + 0.02);
    }
  }

  /**
   * Zero-punishment gentle wooden settle when a marble misses the minecart, plus calm supportive coaching.
   */
  public playGentleMissSettle(allowVoiceHint = true): void {
    if (AudioBus.getMuted()) return;
    this.playSfxHowl('wood_tap_soft', 0.38, 0.85);

    const ctx = this.ensureContext();
    if (ctx && this.masterInput) {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(195, now);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.12);
      g.gain.setValueAtTime(0.22, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(g);
      g.connect(this.masterInput);
      osc.start(now);
      osc.stop(now + 0.15);
    }

    if (allowVoiceHint) {
      const nowMs = performance.now();
      if (nowMs - this.lastMissVoiceAt > 11500 && !this.activeVoiceHowl) {
        this.lastMissVoiceAt = nowMs;
        const promptKey = MISS_PROMPT_KEYS[this.missCounter % MISS_PROMPT_KEYS.length];
        this.missCounter++;
        this.speakPrompt(promptKey);
      }
    }
  }

  public playAlmostThud(): void {
    this.playGentleMissSettle(false);
    const nowMs = performance.now();
    if (nowMs - this.lastMissVoiceAt > 10500 && !this.activeVoiceHowl) {
      this.lastMissVoiceAt = nowMs;
      this.speakPrompt('almost_stars');
    }
  }

  public playPegSnap(): void {
    this.playSfxHowl('wood_tap_soft', 0.45, 1.08);
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    const woodOsc = ctx.createOscillator();
    const woodGain = ctx.createGain();
    woodOsc.type = 'triangle';
    woodOsc.frequency.setValueAtTime(190, now);
    woodOsc.frequency.exponentialRampToValueAtTime(98, now + 0.06);
    woodGain.gain.setValueAtTime(0.38, now);
    woodGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    woodOsc.connect(woodGain);
    woodGain.connect(this.masterInput);
    woodOsc.start(now);
    woodOsc.stop(now + 0.075);
  }

  public playRotateClick(): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    const impulses = [
      { delay: 0, freq: 2200, gain: 0.22 },
      { delay: 0.024, freq: 2950, gain: 0.26 }
    ];

    impulses.forEach((imp) => {
      if (!this.masterInput) return;
      const t = now + imp.delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(imp.freq, t);
      osc.frequency.exponentialRampToValueAtTime(imp.freq * 0.5, t + 0.018);

      gain.gain.setValueAtTime(imp.gain, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.022);

      osc.connect(gain);
      gain.connect(this.masterInput);
      osc.start(t);
      osc.stop(t + 0.025);
    });
  }

  public playHopperDrop(): void {
    if (AudioBus.getMuted()) return;
    this.playSfxHowl('wood_clack_hard', 0.42, 1.15);

    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.045);

    g.gain.setValueAtTime(0.28, now);
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
      const dur = Math.min(0.26, Math.max(0.14, this.sparkyBuffer.duration - offset));

      sGain.gain.setValueAtTime(0.001, now + 0.02);
      sGain.gain.linearRampToValueAtTime(0.28, now + 0.035);
      sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02 + dur);

      src.connect(sGain);
      sGain.connect(this.masterInput);
      src.start(now + 0.02, offset, dur + 0.02);
    }
  }

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
      g.gain.linearRampToValueAtTime(0.32, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      src.connect(bp);
      bp.connect(g);
      g.connect(this.masterInput);
      src.start(now);
      src.stop(now + 0.26);
    }
  }

  public playBallClink(impactSpeed = 120, isHeavySteel = false): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;
    const now = ctx.currentTime;

    const intensity = Math.min(1, Math.max(0.28, impactSpeed / 260));
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = isHeavySteel ? 'triangle' : 'sine';
    const baseFreq = isHeavySteel ? 1140 : 1960;
    osc1.frequency.setValueAtTime(baseFreq, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.68, now + 0.05);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.26 * intensity, now + 0.003);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    osc1.connect(gain1);
    gain1.connect(this.masterInput);
    osc1.start(now);
    osc1.stop(now + 0.06);
  }

  public stopAll(): void {
    this.stopVoice();
    if (this.rollLoopHowl && this.rollLoopSoundId !== null) {
      this.rollLoopHowl.stop(this.rollLoopSoundId);
      this.rollLoopSoundId = null;
    }
    if (this.ctx && this.ctx.state === 'running') {
      void this.ctx.suspend().catch(() => {});
    }
  }
}
