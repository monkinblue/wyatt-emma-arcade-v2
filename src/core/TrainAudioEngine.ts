/**
 * src/core/TrainAudioEngine.ts
 * ----------------------------
 * Mentor Note: Hybrid Howler.js + Web Audio API Steam & Toy Acoustics Engine for
 * "Grandpa's Clockwork Train Table" (`TrainTableScene.ts`).
 *
 * Why do we combine pre-rendered ElevenLabs MP3s with procedural Web Audio synthesis?
 * 1. **Calm Storybook Voiceover & Sampled Toy SFX (Howler.js):**
 *    Pre-generated Josh voiceover clips (`stability=0.86`, period endings, zero exclamation marks)
 *    in `/assets/audio/train/prompts/` and `/assets/audio/train/numbers/` guide Wyatt (age 4) and
 *    Emma (age 3) through counting 1-to-5 cargo items and choosing engineers with zero reading required.
 * 2. **Dynamic 5-Notch Steam Chug-Chug & Xylophone Rail Synthesis (Web Audio API):**
 *    As the child slides the brass throttle lever from Notch 1 (gentle chug) to Notch 5 (turbo express),
 *    the 4-beat steam cylinder rhythm (`CHUG-ga-chug-ga`) and wooden rail `clickety-clack` scale
 *    continuously in tempo and timbre with zero audio loop seams!
 */

import { Howl } from 'howler';
import { ArcadeState } from './ArcadeState';
import { AudioBus } from './AudioBus';

export class TrainAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private howlCache: Map<string, Howl> = new Map();
  private activeVoiceHowl: Howl | null = null;
  private voiceQueueTimer: number | null = null;

  // 4-beat steam cylinder rhythm state
  private chugPhase = 0;
  private chugBeatIndex = 0;
  private lastCrossingDingAt = 0;

  constructor() {
    this.ensureContext();
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.85;
      this.masterGain.connect(this.ctx.destination);
      this.noiseBuffer = this.createNoiseBuffer(this.ctx, 1.0);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * durationSec);
    const buf = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2 + white * 0.18) * 1.6;
    }
    return buf;
  }

  private getOrCreateHowl(src: string, volume = 0.85): Howl {
    let howl = this.howlCache.get(src);
    if (!howl) {
      howl = new Howl({
        src: [src],
        volume,
        preload: true
      });
      this.howlCache.set(src, howl);
    } else {
      howl.volume(volume);
    }
    return howl;
  }

  private playSfxMp3(sfxKey: string, volume = 0.68, rate = 1.0): void {
    if (AudioBus.getMuted()) return;
    const src = `/assets/audio/train/sfx/${sfxKey}.mp3?v=tr1`;
    const howl = this.getOrCreateHowl(src, Math.max(0.05, Math.min(1.0, volume)));
    const id = howl.play();
    if (rate !== 1.0) {
      howl.rate(Math.max(0.6, Math.min(1.6, rate)), id);
    }
  }

  public stopVoice(): void {
    AudioBus.stopLayerSfx('/assets/audio/train/prompts/welcome_title.mp3');
    if (this.voiceQueueTimer !== null) {
      window.clearTimeout(this.voiceQueueTimer);
      this.voiceQueueTimer = null;
    }
    if (this.activeVoiceHowl) {
      this.activeVoiceHowl.stop();
      this.activeVoiceHowl = null;
    }
    AudioBus.duckBgm(false);
  }

  public shutdown(): void {
    this.stopVoice();
  }

  private playVoiceClipUrl(url: string, onEnd?: () => void): void {
    if (AudioBus.getMuted()) {
      if (onEnd) onEnd();
      return;
    }
    this.stopVoice();
    AudioBus.duckBgm(true);

    const howl = this.getOrCreateHowl(url, 0.94);
    this.activeVoiceHowl = howl;

    const finish = () => {
      if (this.activeVoiceHowl === howl) {
        this.activeVoiceHowl = null;
        AudioBus.duckBgm(false);
      }
      if (onEnd) onEnd();
    };

    howl.once('end', finish);
    howl.once('loaderror', finish);
    howl.play();
  }

  public speakPrompt(promptId: string, onEnd?: () => void): void {
    this.playVoiceClipUrl(`/assets/audio/train/prompts/${promptId}.mp3?v=tr1`, onEnd);
  }

  public speakNumber(n: number, onEnd?: () => void): void {
    const clamped = Math.max(1, Math.min(5, Math.round(n)));
    this.playVoiceClipUrl(`/assets/audio/train/numbers/num_${clamped}.mp3?v=tr1`, onEnd);
  }

  /**
   * Speaks the current cargo count ("One.", "Two.", ...) and, when the order is complete,
   * chains into the completion prompt ("Golden logs loaded. All aboard.") and active kid praise!
   */
  public speakCargoCountStep(
    currentCount: number,
    targetCount: number,
    donePromptId: string,
    onCompleteAll?: () => void
  ): void {
    if (AudioBus.getMuted()) {
      if (currentCount >= targetCount && onCompleteAll) onCompleteAll();
      return;
    }
    this.speakNumber(currentCount, () => {
      if (currentCount < targetCount) return;
      if (AudioBus.getMuted()) {
        if (onCompleteAll) onCompleteAll();
        return;
      }
      this.voiceQueueTimer = window.setTimeout(() => {
        this.speakPrompt(donePromptId, () => {
          if (AudioBus.getMuted()) {
            if (onCompleteAll) onCompleteAll();
            return;
          }
          const kid = ArcadeState.getActiveKid();
          const kidPraise = kid.id === 'emma' ? 'great_job_emma' : 'great_job_wyatt';
          this.voiceQueueTimer = window.setTimeout(() => {
            this.speakPrompt(kidPraise, onCompleteAll);
          }, 160);
        });
      }, 140);
    });
  }

  // ===========================================================================
  // DYNAMIC 5-NOTCH STEAM CHUG-CHUG & RAIL CLICKETY-CLACK SYNTHESIZER
  // ===========================================================================

  /**
   * Called every frame from `TrainTableScene.update()`.
   * Advances the 4-beat steam cylinder chug cycle (`CHUG-ga-chug-ga`) at a rate proportional
   * to `throttleNotch` (`1..5`). Returns `true` on primary steam exhaust beats (0 and 2) so
   * the locomotive smokestack can emit synchronized pixel-art steam puffs!
   */
  public updateSteamChug(
    dtSec: number,
    throttleNotch: number,
    isInsideTunnel: boolean
  ): boolean {
    if (throttleNotch <= 0) {
      this.chugPhase = 0;
      return false;
    }

    // Beats per second scales smoothly from Notch 1 (3.2 Hz) up to Notch 5 (9.6 Hz turbo express!)
    const beatsPerSec = 1.9 + throttleNotch * 1.45;
    this.chugPhase += dtSec * beatsPerSec;

    if (this.chugPhase < 1.0) {
      return false;
    }

    this.chugPhase -= Math.floor(this.chugPhase);
    const beat = this.chugBeatIndex % 4;
    this.chugBeatIndex++;

    if (!AudioBus.getMuted()) {
      this.triggerSingleSteamPuff(beat, throttleNotch, isInsideTunnel);
    }

    return beat === 0 || beat === 2;
  }

  private triggerSingleSteamPuff(
    beat: number,
    throttleNotch: number,
    isInsideTunnel: boolean
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    const isAccent = beat === 0;
    const isSecondary = beat === 2;
    const speedNorm = Math.min(1, throttleNotch / 5);

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    // Bandpass filter shaped for warm wooden/brass steam cylinder chug
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const baseFreq = isInsideTunnel
      ? isAccent
        ? 290
        : 230
      : isAccent
      ? 480 + speedNorm * 160
      : isSecondary
      ? 410 + speedNorm * 130
      : 340 + speedNorm * 110;
    filter.frequency.setValueAtTime(baseFreq, now);
    filter.frequency.exponentialRampToValueAtTime(baseFreq * 0.62, now + 0.085);
    filter.Q.setValueAtTime(isInsideTunnel ? 3.2 : 1.8, now);

    const gain = ctx.createGain();
    const peakGain =
      (isAccent ? 0.16 : isSecondary ? 0.12 : 0.075) * (0.75 + speedNorm * 0.35);
    const dur = Math.max(0.045, 0.105 - speedNorm * 0.04);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now, Math.random() * 0.4, dur + 0.02);

    // Subtle wooden Brio rail joint "click-clack" on beats 0 and 2
    if (isAccent || isSecondary) {
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'triangle';
      const clickFreq = isAccent ? 640 : 540;
      clickOsc.frequency.setValueAtTime(clickFreq, now);
      clickOsc.frequency.exponentialRampToValueAtTime(190, now + 0.024);

      clickGain.gain.setValueAtTime(0.055, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

      clickOsc.connect(clickGain);
      clickGain.connect(this.masterGain);
      clickOsc.start(now);
      clickOsc.stop(now + 0.03);
    }
  }

  // ===========================================================================
  // TACTILE TOY & STEAM LOCOMOTIVE SFX
  // ===========================================================================

  /**
   * Joyful dual-chime brass steam whistle (`CHOO-CHOOOO!`) when pulling the braided golden rope
   * or entering the Echo Mountain Stone Tunnel!
   */
  public playSteamWhistle(inTunnel = false): void {
    if (AudioBus.getMuted()) return;
    this.playSfxMp3(inTunnel ? 'tunnel_echo_whistle' : 'steam_whistle', 0.78, 1.0);

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    // Warm dual-chime steam chord (F4 + A4 + D5)
    const freqs = inTunnel ? [349.23, 440.0, 587.33] : [392.0, 493.88, 659.25];
    freqs.forEach((f, idx) => {
      if (!this.masterGain) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f * 0.97, now);
      osc.frequency.linearRampToValueAtTime(f, now + 0.05);
      osc.frequency.setValueAtTime(f, now + 0.38);
      osc.frequency.exponentialRampToValueAtTime(f * 0.94, now + 0.56);

      const vol = idx === 0 ? 0.14 : 0.1;
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(vol, now + 0.035);
      g.gain.setValueAtTime(vol, now + 0.36);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.58);

      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.6);
    });
  }

  /**
   * Crisp brass quadrant throttle lever detent click (`STOP`, `1..5`).
   * Plays a warm pneumatic steam brake hiss when notched down to `0` (`STOP`).
   */
  public playThrottleClick(notch: number): void {
    if (AudioBus.getMuted()) return;
    if (notch === 0) {
      this.playSfxMp3('steam_brake_hiss', 0.62, 1.0);
    }

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    const baseFreq = 520 + notch * 115;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.48, now + 0.04);

    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Tactile beechwood Brio track & scenery socket magnetic snap (`clack-pop!`).
   */
  public playWoodTrackSnap(): void {
    if (AudioBus.getMuted()) return;
    this.playSfxMp3('wood_track_clack', 0.72, 1.0);

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const notes = [440, 659.25, 880];
    notes.forEach((f, i) => {
      if (!this.masterGain) return;
      const t = now + i * 0.042;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  }

  /**
   * Plays a joyful ascending marimba/xylophone chime bar note (`0..5`) as the train wheels
   * roll over the Rainbow Xylophone Melodic Track!
   */
  public playXylophoneBar(barIndex: number): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    const freq = scale[Math.abs(barIndex) % scale.length];

    const osc = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const g = ctx.createGain();
    const og = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(freq * 2, now);

    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.26, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    og.gain.setValueAtTime(0.001, now);
    og.gain.linearRampToValueAtTime(0.09, now + 0.004);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(g);
    overtone.connect(og);
    g.connect(this.masterGain);
    og.connect(this.masterGain);

    osc.start(now);
    overtone.start(now);
    osc.stop(now + 0.36);
    overtone.stop(now + 0.14);
  }

  /**
   * Classic railroad crossing bell `DING-DING-DING-DING!` when the striped gate drops!
   */
  public playCrossingBell(playSample = false): void {
    if (AudioBus.getMuted()) return;
    const nowMs = performance.now();
    if (nowMs - this.lastCrossingDingAt < 180) return;
    this.lastCrossingDingAt = nowMs;

    if (playSample) {
      this.playSfxMp3('crossing_bell', 0.65, 1.0);
    }

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const g = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(1318.51, now); // E6
    osc2.frequency.setValueAtTime(1975.53, now); // B6 bell overtone

    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.22, now + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc1.connect(g);
    osc2.connect(g);
    g.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  }

  /**
   * Satisfying wooden crane *THUNK-BOING!* when a piece of cargo drops into a hopper car!
   */
  public playCargoCraneThunk(countStep = 1): void {
    if (AudioBus.getMuted()) return;
    const rate = 0.96 + Math.min(5, countStep) * 0.05;
    this.playSfxMp3('cargo_crane_thunk', 0.72, rate);

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    // 1. Heavy wooden cargo thud
    const thud = ctx.createOscillator();
    const thudG = ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(195 * rate, now);
    thud.frequency.exponentialRampToValueAtTime(72, now + 0.11);
    thudG.gain.setValueAtTime(0.35, now);
    thudG.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    thud.connect(thudG);
    thudG.connect(this.masterGain);
    thud.start(now);
    thud.stop(now + 0.14);

    // 2. Springy car-suspension boing + chime
    const boing = ctx.createOscillator();
    const boingG = ctx.createGain();
    boing.type = 'triangle';
    const chimeFreq = 392 * Math.pow(1.08, countStep);
    boing.frequency.setValueAtTime(chimeFreq * 0.72, now + 0.05);
    boing.frequency.exponentialRampToValueAtTime(chimeFreq * 1.25, now + 0.19);
    boingG.gain.setValueAtTime(0.22, now + 0.05);
    boingG.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    boing.connect(boingG);
    boingG.connect(this.masterGain);
    boing.start(now + 0.05);
    boing.stop(now + 0.26);
  }

  /**
   * Living Scenery Toy SFX: Water Tower splash, Friendly T-Rex chomp/roar, Unicorn sparkle!
   */
  public playWaterTowerSplash(): void {
    if (AudioBus.getMuted()) return;
    this.playSfxMp3('water_tower_splash', 0.75, 1.0);
  }

  public playTRexRoar(): void {
    if (AudioBus.getMuted()) return;
    this.playSfxMp3('trex_friendly_roar', 0.75, 1.0);
  }

  public playUnicornSparkle(): void {
    if (AudioBus.getMuted()) return;
    this.playSfxMp3('unicorn_whinny_sparkle', 0.75, 1.0);
  }
}
