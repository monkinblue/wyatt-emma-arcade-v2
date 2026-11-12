/**
 * VelvetAudio.ts
 * --------------
 * Lightweight procedural WebAudio lounge synthesizer for "After Hours: Wavelength".
 *
 * Acoustic palette:
 * - Warm Fender-Rhodes-style electric piano tines + lowpass-filtered velvet pad voices
 * - Subtle stereo feedback delay for candlelit lounge depth
 * - Strictly ZERO harsh square/sawtooth arcade boops
 */

import { PlayerId } from './velvetTypes';

class VelvetAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private delayIn: GainNode | null = null;
  private muted: boolean = false;
  private activeSwellStop: (() => void) | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : 0.85;
        this.masterGain.connect(this.ctx.destination);

        // Warm stereo-feel lounge echo bus
        this.delayIn = this.ctx.createGain();
        this.delayIn.gain.value = 0.24;

        const delay = this.ctx.createDelay(1.0);
        delay.delayTime.value = 0.28;

        const feedback = this.ctx.createGain();
        feedback.gain.value = 0.32;

        const dampFilter = this.ctx.createBiquadFilter();
        dampFilter.type = 'lowpass';
        dampFilter.frequency.value = 1650;

        this.delayIn.connect(delay);
        delay.connect(dampFilter);
        dampFilter.connect(feedback);
        feedback.connect(delay);
        dampFilter.connect(this.masterGain);
      } catch {
        return null;
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.85, this.ctx.currentTime, 0.04);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * Warm electric-piano / Rhodes voice with gentle bell overtone and warm body.
   */
  private playRhodesNote(
    freq: number,
    startTime: number,
    duration: number,
    velocity: number = 0.16,
    pan: number = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(velocity, startTime + 0.018);
    env.gain.exponentialRampToValueAtTime(velocity * 0.42, startTime + 0.22);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(3400, freq * 5.2), startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(420, freq * 1.8), startTime + duration * 0.8);

    // Fundamental warm sine
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, startTime);

    // Soft detuned triangle body
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 1.0025, startTime);
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.28;

    // Delicate tine overtone (decays quickly for vintage Rhodes warmth)
    const tine = ctx.createOscillator();
    tine.type = 'sine';
    tine.frequency.setValueAtTime(freq * 4, startTime);
    const tineGain = ctx.createGain();
    tineGain.gain.setValueAtTime(velocity * 0.18, startTime);
    tineGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.14);

    osc1.connect(filter);
    osc2.connect(osc2Gain);
    osc2Gain.connect(filter);
    tine.connect(tineGain);
    tineGain.connect(filter);

    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(pan, startTime);
      filter.connect(panner);
      panner.connect(env);
    } else {
      filter.connect(env);
    }

    env.connect(this.masterGain);
    if (this.delayIn) {
      env.connect(this.delayIn);
    }

    osc1.start(startTime);
    osc2.start(startTime);
    tine.start(startTime);

    const stopAt = startTime + duration + 0.05;
    osc1.stop(stopAt);
    osc2.stop(stopAt);
    tine.stop(stopAt);
  }

  /**
   * Lush low-passed warm velvet pad layer.
   */
  private playVelvetPadVoice(
    freq: number,
    startTime: number,
    attack: number,
    hold: number,
    release: number,
    peakGain: number = 0.09
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(peakGain, startTime + attack);
    env.gain.setValueAtTime(peakGain * 0.9, startTime + attack + hold);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + attack + hold + release);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(380, startTime);
    filter.frequency.linearRampToValueAtTime(1050, startTime + attack + hold * 0.5);
    filter.frequency.exponentialRampToValueAtTime(320, startTime + attack + hold + release);
    filter.Q.value = 0.8;

    const oscA = ctx.createOscillator();
    oscA.type = 'triangle';
    oscA.frequency.setValueAtTime(freq * 0.997, startTime);

    const oscB = ctx.createOscillator();
    oscB.type = 'sine';
    oscB.frequency.setValueAtTime(freq * 1.003, startTime);

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(env);
    env.connect(this.masterGain);
    if (this.delayIn) {
      env.connect(this.delayIn);
    }

    const total = attack + hold + release + 0.05;
    oscA.start(startTime);
    oscB.start(startTime);
    oscA.stop(startTime + total);
    oscB.stop(startTime + total);
  }

  /**
   * Played right at 5000ms when holding the "Remembering Louisiana" book spine:
   * Deep, velvety low Dmaj9 chord welcoming Robert & Rita into After Hours.
   */
  public playSecretUnlockChord(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;
    const now = ctx.currentTime;

    // Deep warm bass + lush major-9th velvet pad
    const padNotes = [73.42, 110.0, 146.83, 185.0, 220.0, 277.18, 329.63]; // D2, A2, D3, F#3, A3, C#4, E4
    padNotes.forEach((freq, i) => {
      this.playVelvetPadVoice(freq, now + i * 0.04, 0.38, 0.55, 1.35, i === 0 ? 0.14 : 0.075);
    });

    // Gentle Rhodes arpeggio shimmer on top
    const rhodesNotes = [293.66, 369.99, 440.0, 554.37, 659.25]; // D4, F#4, A4, C#5, E5
    rhodesNotes.forEach((freq, i) => {
      this.playRhodesNote(freq, now + 0.14 + i * 0.075, 1.8, 0.085, (i - 2) * 0.22);
    });
  }

  /**
   * Warm Rhodes lounge chord when the TV Host lobby initializes.
   */
  public playRoomLaunchPad(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;
    const now = ctx.currentTime;

    // Fmaj9 warm lounge voicing
    [174.61, 220.0, 261.63, 329.63, 392.0].forEach((freq, idx) => {
      this.playRhodesNote(freq, now + idx * 0.06, 1.65, 0.095, (idx - 2) * 0.2);
    });
  }

  /**
   * Warm harmonic chime when Robert or Rita connects their phone to the pedestal.
   */
  public playPlayerJoinChime(player: PlayerId): void {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;
    const now = ctx.currentTime;

    if (player === 'robert') {
      // Warm Champagne Gold voicing (BbMaj7 -> C6/9 feel)
      const freqs = [233.08, 293.66, 349.23, 440.0, 523.25];
      freqs.forEach((f, idx) => {
        this.playRhodesNote(f, now + idx * 0.055, 1.35, 0.12, -0.25 + idx * 0.1);
      });
    } else {
      // Soft Velvet Rose voicing (EbMaj9 upper register sparkle)
      const freqs = [311.13, 392.0, 466.16, 587.33, 698.46];
      freqs.forEach((f, idx) => {
        this.playRhodesNote(f, now + idx * 0.055, 1.35, 0.12, 0.25 - idx * 0.1);
      });
    }
  }

  /**
   * Subtle, tactile brushed-velvet harmonic tick when a partner locks in their slider.
   */
  public playPartnerLockTick(player: PlayerId): void {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;
    const now = ctx.currentTime;

    const base = player === 'robert' ? 392.0 : 493.88;
    this.playRhodesNote(base, now, 0.42, 0.09, player === 'robert' ? -0.25 : 0.25);
    this.playRhodesNote(base * 1.5, now + 0.045, 0.5, 0.075, player === 'robert' ? -0.15 : 0.15);
  }

  /**
   * Lush 1.8s rising tension swell as Robert & Rita's indicators sweep across 0–100.
   */
  public playRevealTensionSwell(durationMs: number = 1800): void {
    this.stopActiveSwell();
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;

    const now = ctx.currentTime;
    const dur = durationMs / 1000;

    const swellGain = ctx.createGain();
    swellGain.gain.setValueAtTime(0.0001, now);
    swellGain.gain.exponentialRampToValueAtTime(0.18, now + dur * 0.88);
    swellGain.gain.exponentialRampToValueAtTime(0.0001, now + dur + 0.18);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, now);
    filter.frequency.exponentialRampToValueAtTime(2100, now + dur * 0.92);
    filter.Q.value = 2.2;

    // Warm suspended chord (Csus2 / G9 tension) that wants to resolve on lock!
    const ratios = [130.81, 196.0, 293.66, 392.0];
    const oscs: OscillatorNode[] = [];

    ratios.forEach((baseFreq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(baseFreq * 0.96, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.04, now + dur);
      osc.connect(filter);
      osc.start(now);
      osc.stop(now + dur + 0.22);
      oscs.push(osc);
    });

    // Subtle delicate tick pulses decelerating into the lock
    const pulseTimes = [0.12, 0.28, 0.46, 0.66, 0.88, 1.12, 1.38, 1.64];
    pulseTimes.forEach((t, idx) => {
      if (t < dur) {
        this.playRhodesNote(523.25 + idx * 32, now + t, 0.16, 0.035, (idx % 2 === 0 ? -1 : 1) * 0.2);
      }
    });

    filter.connect(swellGain);
    swellGain.connect(this.masterGain);
    if (this.delayIn) {
      swellGain.connect(this.delayIn);
    }

    this.activeSwellStop = () => {
      try {
        swellGain.gain.cancelScheduledValues(ctx.currentTime);
        swellGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.03);
        oscs.forEach((o) => {
          try {
            o.stop(ctx.currentTime + 0.08);
          } catch {
            // ignore
          }
        });
      } catch {
        // ignore
      }
      this.activeSwellStop = null;
    };
  }

  public stopActiveSwell(): void {
    if (this.activeSwellStop) {
      this.activeSwellStop();
    }
  }

  /**
   * Plays the dynamic harmonic resolution chord when the two needles lock onto their numbers.
   */
  public playRevealVerdict(gap: number): void {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;
    const now = ctx.currentTime;

    if (gap <= 5) {
      // SOULMATE BULLSEYE: Lush Cmaj9 / Cmaj13 warm celebration + sparkling upper Rhodes cascade!
      const bassAndPad = [130.81, 196.0, 246.94, 293.66, 329.63]; // C3, G3, B3, D4, E4
      bassAndPad.forEach((f, idx) => {
        this.playVelvetPadVoice(f, now + idx * 0.025, 0.12, 0.65, 1.5, idx === 0 ? 0.14 : 0.085);
      });
      const sparkle = [392.0, 493.88, 587.33, 659.25, 783.99, 987.77, 1174.66]; // G4, B4, D5, E5, G5, B5, D6
      sparkle.forEach((f, idx) => {
        this.playRhodesNote(f, now + idx * 0.055, 1.9, 0.12, (idx - 3) * 0.16);
      });
    } else if (gap <= 15) {
      // LOCKED IN SYNC: Warm Fmaj9 chord
      const chord = [174.61, 261.63, 329.63, 440.0, 523.25, 659.25];
      chord.forEach((f, idx) => {
        this.playRhodesNote(f, now + idx * 0.045, 1.55, 0.11, (idx - 2.5) * 0.15);
      });
    } else if (gap <= 30) {
      // INTRIGUING GAP: Jazzy Dm9 speakeasy chord
      const chord = [146.83, 220.0, 261.63, 329.63, 440.0];
      chord.forEach((f, idx) => {
        this.playRhodesNote(f, now + idx * 0.055, 1.45, 0.1, (idx - 2) * 0.18);
      });
    } else {
      // WILDLY DIFFERENT WAVELENGTHS: Playful dramatic smoky lounge chord (A7alt / Ebmaj7#11 intrigue)
      const chord = [110.0, 196.0, 277.18, 349.23, 466.16];
      chord.forEach((f, idx) => {
        this.playRhodesNote(f, now + idx * 0.06, 1.5, 0.105, (idx - 2) * 0.22);
      });
    }
  }

  public playUiSoftTap(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;
    const now = ctx.currentTime;
    this.playRhodesNote(440, now, 0.22, 0.06, 0);
  }
}

export const VelvetAudio = new VelvetAudioEngine();
