/**
 * MelodyAudioEngine.ts
 * --------------------
 * Mentor Note: Studio-Grade Web Audio API + Sampled Audio Engine for the Heirloom
 * Music Box & Puppet Theater (`MelodyMakerScene.ts`).
 *
 * Why a dedicated Web Audio graph here?
 * - Polyphonic Glissandos: When a 3- or 4-year-old swipes their hand rapidly across all 8
 *   rainbow chime bars, we want all 8 notes to ring out simultaneously in a warm wooden hall
 *   without clipping or cutting each other off.
 * - Master Music-Box Reverb & Dynamics Bus: A procedural stereo impulse response (`1.4s` warm
 *   mahogany music-box resonance with high-frequency damping) feeds a `ConvolverNode` (`22%` wet)
 *   into a `DynamicsCompressorNode`, giving every voice an heirloom acoustic depth.
 * - 5 Distinct Instrument Voices:
 *   1. `'glockenspiel'`: Crystal Brass Glockenspiel (metallic mallet strike + stereo detuned bell partials)
 *   2. `'marimba'`: Warm Rosewood Marimba (yarn mallet woody transient + fundamental/4th-harmonic resonator)
 *   3. `'piano'`: Storybook Grand Piano & Golden Harp (3 detuned stereo strings + dynamic low-pass filter)
 *   4. `'doggie'`: Doggie Bark Choir (pitch-shifted `sfx-doggie-bark.mp3` `AudioBuffer` + vocal formant synth body)
 *   5. `'sparky'`: Sparky Dragon Bell & Bluebird Synth (FM handbell shimmer + pitch-shifted `sfx-bluejay-whistle.mp3` + 6Hz LFO vibrato)
 * - 2 Ambient Backing Rhythm Loops (`108 BPM`):
 *   - `'campfire'`: Cozy low wood-bongo (`110Hz`/`165Hz`) + soft maraca eighth-note shaker
 *   - `'parade'`: Bouncy snare brush & tambourine jingle + warm brass tuba root/fifth bass puff (`C2`/`G2`)
 */

import { AudioBus } from '../core/AudioBus';

export type VoiceType = 'glockenspiel' | 'marimba' | 'piano' | 'doggie' | 'sparky';
export type RhythmType = 'campfire' | 'parade' | null;

/** 8-Note C-Major Diatonic Scale (`C4` through `C5`) in Hz */
export const C_MAJOR_FREQS: readonly number[] = [
  261.63, // 0: C4 (Red)
  293.66, // 1: D4 (Orange)
  329.63, // 2: E4 (Yellow)
  349.23, // 3: F4 (Green)
  392.00, // 4: G4 (Teal)
  440.00, // 5: A4 (Blue)
  493.88, // 6: B4 (Indigo)
  523.25  // 7: C5 (Coral)
];

/** Semitone offsets above C4 for each of the 8 diatonic bars */
const SEMITONES_FROM_C4: readonly number[] = [0, 2, 4, 5, 7, 9, 11, 12];

export class MelodyAudioEngine {
  private ctx: AudioContext | null = null;
  private masterInput: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private doggieBuffer: AudioBuffer | null = null;
  private sparkyBirdBuffer: AudioBuffer | null = null;
  private samplesLoading = false;

  private activeRhythm: RhythmType = null;
  private rhythmTimerId: number | null = null;
  private rhythmStep = 0;

  constructor() {
    this.ensureContext();
    void this.preloadSampleBuffers();
  }

  /**
   * Initializes the Web Audio graph with a 22% wet procedural wooden-hall ConvolverNode
   * and a master DynamicsCompressorNode so glissandos never clip.
   */
  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;

      this.ctx = new AudioCtx();

      // Master input node collecting all voices & rhythm instruments
      this.masterInput = this.ctx.createGain();
      this.masterInput.gain.value = 0.92;

      // Compressor prevents clipping during 8-bar glissando sweeps
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -14;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 4.5;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.18;

      // Dry / Wet (78% / 22%) reverb split
      this.dryGain = this.ctx.createGain();
      this.dryGain.gain.value = 0.78;

      this.wetGain = this.ctx.createGain();
      this.wetGain.gain.value = 0.22;

      this.convolver = this.ctx.createConvolver();
      this.convolver.buffer = this.createMusicBoxImpulseResponse(this.ctx, 1.4);

      this.masterInput.connect(this.dryGain);
      this.masterInput.connect(this.convolver);
      this.convolver.connect(this.wetGain);

      this.dryGain.connect(this.compressor);
      this.wetGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      this.noiseBuffer = this.createWhiteNoiseBuffer(this.ctx, 0.5);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  /**
   * Generates a 1.4-second stereo impulse response modeling a warm mahogany & brass music-box hall
   * with early wooden reflections and smooth high-frequency damping.
   */
  private createMusicBoxImpulseResponse(ctx: AudioContext, durationSec: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * durationSec);
    const impulse = ctx.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      let lpPrev = 0;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        // Exponential decay with warm wooden early reflections
        const env = Math.pow(1 - i / length, 2.6) * Math.exp(-t * 2.4);
        const rawNoise = Math.random() * 2 - 1;
        // Progressive high-frequency damping as tail decays
        const damp = 0.32 + 0.45 * Math.exp(-t * 3.0);
        lpPrev = lpPrev + damp * (rawNoise - lpPrev);
        data[i] = lpPrev * env * 0.85;
      }
    }
    return impulse;
  }

  /**
   * Pre-generates a reusable 0.5-second white noise buffer for mallet transients, shakers & snares.
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
   * Decodes the Doggie bark sample and Blue Jay / Sparky sample into Web Audio `AudioBuffer`s
   * for real-time pitch-shifted playback (`playbackRate = 2^(semitones/12)`).
   */
  public async preloadSampleBuffers(): Promise<void> {
    if (this.samplesLoading || (this.doggieBuffer && this.sparkyBirdBuffer)) return;
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
          const decoded = await ctx.decodeAudioData(arr.slice(0));
          return decoded;
        } catch {
          // Try next fallback candidate
        }
      }
      return null;
    };

    try {
      const [doggie, bird] = await Promise.all([
        loadFirstAvailable([
          '/assets/stories/nana/audio/sfx-doggie.mp3',
          '/assets/stories/nana/audio/sfx-doggie-bark.mp3'
        ]),
        loadFirstAvailable([
          '/assets/stories/nana/audio/sfx-bluejay.mp3',
          '/assets/stories/nana/audio/sfx-bluejay-whistle.mp3',
          '/assets/stories/nana/audio/sfx-sparky.mp3',
          '/assets/stories/nana/audio/sfx-sparky-tulip.mp3'
        ])
      ]);
      if (doggie) this.doggieBuffer = doggie;
      if (bird) this.sparkyBirdBuffer = bird;
    } finally {
      this.samplesLoading = false;
    }
  }

  /**
   * Plays one of the 8 C-Major chime bars (`0..7`) using the selected instrument voice (`VoiceType`).
   */
  public playNote(noteIndex: number, voice: VoiceType, volumeScale = 1.0): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;

    const clampedIdx = Math.max(0, Math.min(7, Math.floor(noteIndex)));
    const freq = C_MAJOR_FREQS[clampedIdx];
    const semitonesFromF4 = SEMITONES_FROM_C4[clampedIdx] - 5; // F4 = index 3 (5 semitones above C4)

    switch (voice) {
      case 'glockenspiel':
        this.playGlockenspiel(ctx, freq, volumeScale);
        break;
      case 'marimba':
        this.playMarimba(ctx, freq, volumeScale);
        break;
      case 'piano':
        this.playPianoHarp(ctx, freq, volumeScale);
        break;
      case 'doggie':
        this.playDoggieChoir(ctx, freq, semitonesFromF4, volumeScale);
        break;
      case 'sparky':
        this.playSparkyDragonBell(ctx, freq, semitonesFromF4, volumeScale);
        break;
    }
  }

  /**
   * Plays a celebratory chord across multiple note indices (e.g., `[0, 2, 4, 7]`).
   */
  public playChord(noteIndices: number[], voice: VoiceType, staggerMs = 45, volumeScale = 0.65): void {
    noteIndices.forEach((idx, i) => {
      window.setTimeout(() => {
        this.playNote(idx, voice, volumeScale);
      }, i * staggerMs);
    });
  }

  /**
   * Voice 1: `'glockenspiel'` (Crystal Brass Glockenspiel)
   * - Layer 1: Metallic mallet strike transient (`12ms` bandpass noise burst at `3200Hz` + short `8x` harmonic ping).
   * - Layer 2: Stereo detuned bell partials (`1.0x` sine, `2.756x` sine at `0.35` gain, `5.404x` sine at `0.15` gain)
   *   with a natural `1.35s` exponential ring-out.
   */
  private playGlockenspiel(ctx: AudioContext, freq: number, vol: number): void {
    if (!this.masterInput) return;
    const now = ctx.currentTime;

    // Layer 1a: 12ms bandpass noise burst at 3200Hz
    if (this.noiseBuffer) {
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = this.noiseBuffer;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(3200, now);
      bp.Q.setValueAtTime(3.2, now);

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.22 * vol, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

      noiseSrc.connect(bp);
      bp.connect(nGain);
      nGain.connect(this.masterInput);

      noiseSrc.start(now);
      noiseSrc.stop(now + 0.018);
    }

    // Layer 1b: Short 8x metallic harmonic ping
    const pingOsc = ctx.createOscillator();
    const pingGain = ctx.createGain();
    pingOsc.type = 'sine';
    pingOsc.frequency.setValueAtTime(Math.min(14000, freq * 8.0), now);
    pingGain.gain.setValueAtTime(0.11 * vol, now);
    pingGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.045);
    pingOsc.connect(pingGain);
    pingGain.connect(this.masterInput);
    pingOsc.start(now);
    pingOsc.stop(now + 0.05);

    // Layer 2: Stereo detuned bell partials (1.0x, 2.756x at 0.35, 5.404x at 0.15) with 1.35s exponential ring-out
    const partials: Array<{ ratio: number; gain: number; decay: number; detuneCents: number; pan: number }> = [
      { ratio: 1.0, gain: 0.38, decay: 1.35, detuneCents: -2.5, pan: -0.25 },
      { ratio: 1.0, gain: 0.38, decay: 1.35, detuneCents: 2.5, pan: 0.25 },
      { ratio: 2.756, gain: 0.35 * 0.45, decay: 0.75, detuneCents: 1.5, pan: -0.15 },
      { ratio: 5.404, gain: 0.15 * 0.45, decay: 0.38, detuneCents: -1.5, pan: 0.15 }
    ];

    partials.forEach((p) => {
      if (!this.masterInput) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * p.ratio, now);
      osc.detune.setValueAtTime(p.detuneCents, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(p.gain * vol, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + p.decay);

      if (typeof ctx.createStereoPanner === 'function') {
        const panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(p.pan, now);
        osc.connect(gain);
        gain.connect(panner);
        panner.connect(this.masterInput);
      } else {
        osc.connect(gain);
        gain.connect(this.masterInput);
      }

      osc.start(now);
      osc.stop(now + p.decay + 0.02);
    });
  }

  /**
   * Voice 2: `'marimba'` (Warm Rosewood Marimba)
   * - Layer 1: Soft yarn mallet wooden thud (`18ms` low-pass filtered triangle pitch-drop transient `f*1.8 -> f`).
   * - Layer 2: Fundamental `1.0x` triangle/sine blend + `4.0x` fifth-octave marimba resonator harmonic with warm `420ms` woody decay.
   */
  private playMarimba(ctx: AudioContext, freq: number, vol: number): void {
    if (!this.masterInput) return;
    const now = ctx.currentTime;

    // Layer 1: 18ms yarn mallet wooden thud (pitch-drop f*1.8 -> f)
    const thudOsc = ctx.createOscillator();
    const thudFilter = ctx.createBiquadFilter();
    const thudGain = ctx.createGain();

    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(freq * 1.8, now);
    thudOsc.frequency.exponentialRampToValueAtTime(freq, now + 0.018);

    thudFilter.type = 'lowpass';
    thudFilter.frequency.setValueAtTime(950, now);

    thudGain.gain.setValueAtTime(0.36 * vol, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

    thudOsc.connect(thudFilter);
    thudFilter.connect(thudGain);
    thudGain.connect(this.masterInput);
    thudOsc.start(now);
    thudOsc.stop(now + 0.032);

    // Layer 2a: Fundamental 1.0x warm rosewood body (sine + filtered triangle blend, 420ms decay)
    const bodyOsc1 = ctx.createOscillator();
    const bodyOsc2 = ctx.createOscillator();
    const bodyFilter = ctx.createBiquadFilter();
    const bodyGain = ctx.createGain();

    bodyOsc1.type = 'sine';
    bodyOsc1.frequency.setValueAtTime(freq, now);
    bodyOsc2.type = 'triangle';
    bodyOsc2.frequency.setValueAtTime(freq, now);

    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(freq * 3.2, now);

    bodyGain.gain.setValueAtTime(0.001, now);
    bodyGain.gain.linearRampToValueAtTime(0.42 * vol, now + 0.005);
    bodyGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.44);

    bodyOsc1.connect(bodyFilter);
    bodyOsc2.connect(bodyFilter);
    bodyFilter.connect(bodyGain);
    bodyGain.connect(this.masterInput);

    bodyOsc1.start(now);
    bodyOsc2.start(now);
    bodyOsc1.stop(now + 0.46);
    bodyOsc2.stop(now + 0.46);

    // Layer 2b: 4.0x two-octave marimba tube resonator harmonic
    const resOsc = ctx.createOscillator();
    const resGain = ctx.createGain();
    resOsc.type = 'sine';
    resOsc.frequency.setValueAtTime(freq * 4.0, now);
    resGain.gain.setValueAtTime(0.001, now);
    resGain.gain.linearRampToValueAtTime(0.18 * vol, now + 0.004);
    resGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.19);

    resOsc.connect(resGain);
    resGain.connect(this.masterInput);
    resOsc.start(now);
    resOsc.stop(now + 0.21);
  }

  /**
   * Voice 3: `'piano'` (Storybook Grand Piano & Golden Harp)
   * - 3 slightly detuned stereo strings (`-3 cents, 0, +3 cents`) mixing triangle + warm harmonic partials (`1x, 2x, 3x, 4x`)
   *   through a dynamic low-pass filter that opens brightly on strike (`2800Hz -> 900Hz`) with a lush `1.6s` harp sustain.
   */
  private playPianoHarp(ctx: AudioContext, freq: number, vol: number): void {
    if (!this.masterInput) return;
    const now = ctx.currentTime;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, now);
    filter.frequency.exponentialRampToValueAtTime(900, now + 0.65);
    filter.Q.setValueAtTime(1.4, now);

    const envGain = ctx.createGain();
    envGain.gain.setValueAtTime(0.001, now);
    envGain.gain.linearRampToValueAtTime(0.45 * vol, now + 0.006);
    envGain.gain.exponentialRampToValueAtTime(0.14 * vol, now + 0.28);
    envGain.gain.exponentialRampToValueAtTime(0.0008, now + 1.6);

    filter.connect(envGain);
    envGain.connect(this.masterInput);

    // 3 slightly detuned stereo strings (-3, 0, +3 cents)
    const detunes = [-3, 0, 3];
    detunes.forEach((cents) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime(cents, now);
      g.gain.setValueAtTime(0.28, now);
      osc.connect(g);
      g.connect(filter);
      osc.start(now);
      osc.stop(now + 1.62);
    });

    // Warm harmonic overtones (2x, 3x, 4x)
    const harmonics = [
      { mult: 2.0, amp: 0.16, dur: 0.95 },
      { mult: 3.0, amp: 0.09, dur: 0.65 },
      { mult: 4.0, amp: 0.045, dur: 0.42 }
    ];
    harmonics.forEach((h) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * h.mult, now);
      g.gain.setValueAtTime(h.amp, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + h.dur);
      osc.connect(g);
      g.connect(filter);
      osc.start(now);
      osc.stop(now + h.dur + 0.02);
    });
  }

  /**
   * Voice 4: `'doggie'` (Doggie Bark Choir — Pitch-Shifted Sample + Musical Body!)
   * - Plays decoded `sfx-doggie-bark.mp3` via `AudioBufferSourceNode` with
   *   `playbackRate.value = Math.pow(2, semitonesFromF4 / 12)`.
   * - Layers a warm, playful vocal formant synth envelope underneath at the exact target frequency
   *   so every bark sings clearly on pitch!
   */
  private playDoggieChoir(ctx: AudioContext, freq: number, semitonesFromF4: number, vol: number): void {
    if (!this.masterInput) return;
    const now = ctx.currentTime;
    const rate = Math.pow(2, semitonesFromF4 / 12);

    // 1. Pitch-shifted Doggie bark sample transient
    if (this.doggieBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.doggieBuffer;
      src.playbackRate.setValueAtTime(rate, now);

      const sampleGain = ctx.createGain();
      const offset = Math.min(0.05, Math.max(0, this.doggieBuffer.duration * 0.05));
      const playDur = Math.min(0.42, Math.max(0.18, this.doggieBuffer.duration - offset));

      sampleGain.gain.setValueAtTime(0.001, now);
      sampleGain.gain.linearRampToValueAtTime(0.68 * vol, now + 0.012);
      sampleGain.gain.exponentialRampToValueAtTime(0.002, now + playDur);

      src.connect(sampleGain);
      sampleGain.connect(this.masterInput);
      src.start(now, offset, playDur + 0.02);
    }

    // 2. Playful pitched vocal formant synth body ("ruff-singing" at exact target note frequency)
    const bodyOsc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const formantFilter = ctx.createBiquadFilter();
    const bodyGain = ctx.createGain();

    bodyOsc.type = 'sawtooth';
    // Slight playful pitch scoop up into the note like a happy puppy bark
    bodyOsc.frequency.setValueAtTime(freq * 0.92, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(freq * 1.03, now + 0.045);
    bodyOsc.frequency.exponentialRampToValueAtTime(freq, now + 0.11);

    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(freq, now);

    // Vocal "ah-oof" formant bandpass/lowpass
    formantFilter.type = 'bandpass';
    formantFilter.frequency.setValueAtTime(freq * 2.4, now);
    formantFilter.frequency.exponentialRampToValueAtTime(freq * 1.6, now + 0.32);
    formantFilter.Q.setValueAtTime(2.2, now);

    bodyGain.gain.setValueAtTime(0.001, now);
    bodyGain.gain.linearRampToValueAtTime(0.38 * vol, now + 0.015);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    bodyOsc.connect(formantFilter);
    subOsc.connect(bodyGain);
    formantFilter.connect(bodyGain);
    bodyGain.connect(this.masterInput);

    bodyOsc.start(now);
    subOsc.start(now);
    bodyOsc.stop(now + 0.44);
    subOsc.stop(now + 0.44);
  }

  /**
   * Voice 5: `'sparky'` (Sparky Dragon Bell & Bluebird Synth)
   * - Layers a shimmering golden handbell (`1x, 2x, 3.01x` FM bell shimmer) with a pitch-shifted
   *   snippet of `sfx-bluejay-whistle.mp3` + a gentle pitch-vibrato (`6Hz` LFO) so it sounds like
   *   Sparky and the Blue Jay singing in harmony!
   */
  private playSparkyDragonBell(ctx: AudioContext, freq: number, semitonesFromF4: number, vol: number): void {
    if (!this.masterInput) return;
    const now = ctx.currentTime;
    const rate = Math.pow(2, semitonesFromF4 / 12);

    // 1. Pitch-shifted Blue Jay / Sparky sample snippet
    if (this.sparkyBirdBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.sparkyBirdBuffer;
      src.playbackRate.setValueAtTime(rate, now);

      const sampleGain = ctx.createGain();
      const offset = Math.min(0.04, Math.max(0, this.sparkyBirdBuffer.duration * 0.04));
      const playDur = Math.min(0.45, Math.max(0.2, this.sparkyBirdBuffer.duration - offset));

      sampleGain.gain.setValueAtTime(0.001, now);
      sampleGain.gain.linearRampToValueAtTime(0.35 * vol, now + 0.018);
      sampleGain.gain.exponentialRampToValueAtTime(0.002, now + playDur);

      src.connect(sampleGain);
      sampleGain.connect(this.masterInput);
      src.start(now, offset, playDur + 0.02);
    }

    // 2. 6Hz LFO vibrato for singing flute/bluebird shimmer
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(6.0, now);
    lfoGain.gain.setValueAtTime(4.5, now); // +/- 4.5Hz gentle singing vibrato
    lfo.connect(lfoGain);
    lfo.start(now);
    lfo.stop(now + 1.15);

    // 3. Golden handbell + singing flute harmonics (1x, 2x, 3.01x)
    const partials = [
      { mult: 1.0, amp: 0.36, dur: 1.1, type: 'sine' as OscillatorType },
      { mult: 2.0, amp: 0.18, dur: 0.85, type: 'triangle' as OscillatorType },
      { mult: 3.01, amp: 0.10, dur: 0.55, type: 'sine' as OscillatorType }
    ];

    partials.forEach((p) => {
      if (!this.masterInput) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = p.type;
      osc.frequency.setValueAtTime(freq * p.mult, now);
      lfoGain.connect(osc.frequency);

      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(p.amp * vol, now + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0008, now + p.dur);

      osc.connect(g);
      g.connect(this.masterInput);
      osc.start(now);
      osc.stop(now + p.dur + 0.02);
    });
  }

  /**
   * Toggles between the 2 ambient backing rhythm loops (`'campfire' | 'parade' | null`)
   * at a gentle 108 BPM eighth-note step grid (`277.7ms` per eighth note).
   */
  public toggleRhythm(rhythm: RhythmType): RhythmType {
    if (this.activeRhythm === rhythm) {
      this.stopRhythm();
      return null;
    }

    this.stopRhythm();
    this.activeRhythm = rhythm;
    if (!rhythm) return null;

    this.rhythmStep = 0;
    const eighthNoteMs = Math.round((60 / 108 / 2) * 1000); // ~278ms per eighth note (108 BPM)
    this.triggerRhythmStep();
    this.rhythmTimerId = window.setInterval(() => {
      this.triggerRhythmStep();
    }, eighthNoteMs);

    return this.activeRhythm;
  }

  public getActiveRhythm(): RhythmType {
    return this.activeRhythm;
  }

  public stopRhythm(): void {
    if (this.rhythmTimerId !== null) {
      window.clearInterval(this.rhythmTimerId);
      this.rhythmTimerId = null;
    }
    this.activeRhythm = null;
  }

  public stopAll(): void {
    this.stopRhythm();
  }

  private triggerRhythmStep(): void {
    if (AudioBus.getMuted() || !this.activeRhythm) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterInput) return;

    const step = this.rhythmStep % 8; // 8 eighth-notes per 4/4 bar
    this.rhythmStep++;

    if (this.activeRhythm === 'campfire') {
      // Campfire: Cozy low wood-bongo on beats 1 (step 0), 2.5 (step 3), 3 (step 4), 4.5 (step 7)
      if (step === 0 || step === 4) {
        this.playWoodBongo(ctx, 110, 0.28);
      } else if (step === 3 || step === 6) {
        this.playWoodBongo(ctx, 165, 0.22);
      }
      // Soft maraca shaker on every eighth note (accented on off-beats)
      this.playMaracaShaker(ctx, step % 2 === 1 ? 0.11 : 0.06);
    } else if (this.activeRhythm === 'parade') {
      // Parade: Warm brass tuba root/fifth bass puff on beats 1 (C2=65.4Hz) and 3 (G2=98.0Hz)
      if (step === 0 || step === 4) {
        const bassFreq = step === 0 ? 130.81 : 98.0; // C3 / G2 warm audible bass on tablet speakers
        this.playTubaPuff(ctx, bassFreq, 0.26);
      }
      // Bouncy snare brush & tambourine jingle on backbeats (steps 2, 6) and light brush on step 7
      if (step === 2 || step === 6) {
        this.playSnareTambourine(ctx, 0.16);
      } else if (step === 7) {
        this.playSnareTambourine(ctx, 0.09);
      }
    }
  }

  private playWoodBongo(ctx: AudioContext, freq: number, vol: number): void {
    if (!this.masterInput) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.45, now);
    osc.frequency.exponentialRampToValueAtTime(freq, now + 0.025);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.78, now + 0.14);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterInput);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  private playMaracaShaker(ctx: AudioContext, vol: number): void {
    if (!this.masterInput || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(5200, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.048);

    src.connect(hp);
    hp.connect(gain);
    gain.connect(this.masterInput);
    src.start(now);
    src.stop(now + 0.055);
  }

  private playTubaPuff(ctx: AudioContext, freq: number, vol: number): void {
    if (!this.masterInput) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(480, now);
    filter.frequency.exponentialRampToValueAtTime(220, now + 0.22);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterInput);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  private playSnareTambourine(ctx: AudioContext, vol: number): void {
    if (!this.masterInput || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2600, now);
    bp.Q.setValueAtTime(1.2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    src.connect(bp);
    bp.connect(gain);
    gain.connect(this.masterInput);
    src.start(now);
    src.stop(now + 0.1);

    // Tambourine metallic jingle ping
    const jingle = ctx.createOscillator();
    const jGain = ctx.createGain();
    jingle.type = 'sine';
    jingle.frequency.setValueAtTime(6400, now);
    jGain.gain.setValueAtTime(vol * 0.35, now);
    jGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    jingle.connect(jGain);
    jGain.connect(this.masterInput);
    jingle.start(now);
    jingle.stop(now + 0.07);
  }
}
