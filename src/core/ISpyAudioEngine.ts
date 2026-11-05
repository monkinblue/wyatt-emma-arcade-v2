/**
 * src/core/ISpyAudioEngine.ts
 * ---------------------------
 * Mentor Note: Hybrid Howler.js + Web Audio API Detective Audio Engine for
 * "I Spy Curio Cabinet" (`ISpyScene.ts`).
 *
 * Why do we pair pre-generated ElevenLabs MP3s with a real-time Web Audio synthesizer?
 * 1. **Spoken Rhyming Riddles & Object Names (Howler.js):**
 *    Pre-rendered calm Josh voiceover clips (`stability=0.86`, period endings, zero exclamation marks)
 *    in `/assets/audio/ispy/riddles/`, `/assets/audio/ispy/items/`, and `/assets/audio/ispy/prompts/`
 *    let pre-readers (Wyatt age 4, Emma age 3) hear classic Walter Wick rhyming riddles and live
 *    multi-instance counts ("One brass key.", "Two brass keys.", "All three brass keys found.")
 *    with warm studio clarity and automatic BGM ducking.
 * 2. **Zero-Latency Tactile Studio Acoustics (Web Audio API + Studio SFX):**
 *    Every brass magnifying glass glide, watchmaker bezel click, golden starburst discovery pop,
 *    crimson wax seal stamp, and velvet trophy curio chime fires in <5ms with pitch-stepping!
 */

import { Howl } from 'howler';
import { ArcadeState } from './ArcadeState';
import { AudioBus } from './AudioBus';

export class ISpyAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private howlCache: Map<string, Howl> = new Map();
  private activeVoiceHowl: Howl | null = null;
  private voiceQueueTimer: number | null = null;
  private lastWhooshAt = 0;
  private lastClutterTapAt = 0;

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
      this.noiseBuffer = this.createWhiteNoiseBuffer(this.ctx, 0.5);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private createWhiteNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * durationSec);
    const buf = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
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

  private playSfxMp3(sfxKey: string, volume = 0.65, rate = 1.0): void {
    if (AudioBus.getMuted()) return;
    const src = `/assets/audio/ispy/sfx/${sfxKey}.mp3?v=ispy1`;
    const howl = this.getOrCreateHowl(src, Math.max(0.05, Math.min(1.0, volume)));
    const id = howl.play();
    if (rate !== 1.0) {
      howl.rate(Math.max(0.6, Math.min(1.6, rate)), id);
    }
  }

  public stopVoice(): void {
    AudioBus.stopLayerSfx('/assets/audio/ispy/prompts/welcome_title.mp3');
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

  /**
   * Speaks one of the 12 Walter Wick rhyming riddles (`riddle_b1_t1` .. `riddle_b4_t3`).
   */
  public speakRiddle(riddleId: string, onEnd?: () => void): void {
    this.playVoiceClipUrl(`/assets/audio/ispy/riddles/${riddleId}.mp3?v=ispy1`, onEnd);
  }

  /**
   * Speaks a general detective prompt (`welcome_title`, `hint_shimmer`, `casebook_open`, etc.).
   */
  public speakPrompt(promptId: string, onEnd?: () => void): void {
    this.playVoiceClipUrl(`/assets/audio/ispy/prompts/${promptId}.mp3?v=ispy1`, onEnd);
  }

  /**
   * Speaks a single miniature object's studio name (`item_brass_key`, `item_t6_airplane`, etc.).
   */
  public speakItemName(audioKey: string, onEnd?: () => void): void {
    this.playVoiceClipUrl(`/assets/audio/ispy/items/${audioKey}.mp3?v=ispy1`, onEnd);
  }

  /**
   * Speaks the discovered object and its live multi-instance progress count!
   * - For `item-brass-key` with `totalNeeded === 3`, plays the dedicated phrase
   *   (`"One brass key."` -> `"Two brass keys."` -> `"All three brass keys found."`).
   * - For all other items, speaks the item name (`"Swirl glass marble."`) followed by the
   *   exact count confirmation (`"One found."`, `"Two found."`, `"Both found."`, `"All three found."`).
   */
  public speakItemAndProgress(
    audioKey: string,
    itemType: string,
    foundNow: number,
    totalNeeded: number,
    onEnd?: () => void
  ): void {
    if (AudioBus.getMuted()) {
      if (onEnd) onEnd();
      return;
    }

    if (itemType === 'item-brass-key' && totalNeeded === 3) {
      const keyClip =
        foundNow === 1
          ? 'count_one_key'
          : foundNow === 2
          ? 'count_two_keys'
          : 'count_all_three_keys';
      this.speakPrompt(keyClip, onEnd);
      return;
    }

    // For single-instance items (`1/1`), speaking the item name cleanly confirms discovery
    if (totalNeeded <= 1) {
      this.speakItemName(audioKey, onEnd);
      return;
    }

    const countPrompt =
      foundNow >= totalNeeded
        ? totalNeeded === 2
          ? 'count_all_two_found'
          : 'count_all_three_found'
        : foundNow === 1
        ? 'count_one_found'
        : 'count_two_found';

    this.speakItemName(audioKey, () => {
      if (AudioBus.getMuted()) {
        if (onEnd) onEnd();
        return;
      }
      this.voiceQueueTimer = window.setTimeout(() => {
        this.speakPrompt(countPrompt, onEnd);
      }, 110);
    });
  }

  /**
   * Celebrates solving a riddle tier with personalized Wyatt & Sparky or Emma & Doggie praise!
   */
  public speakCaseSolvedForActiveKid(onEnd?: () => void): void {
    if (AudioBus.getMuted()) {
      if (onEnd) onEnd();
      return;
    }
    const kid = ArcadeState.getActiveKid();
    const kidPrompt = kid.id === 'emma' ? 'case_solved_emma' : 'case_solved_wyatt';
    this.speakPrompt('case_solved', () => {
      if (AudioBus.getMuted()) {
        if (onEnd) onEnd();
        return;
      }
      this.voiceQueueTimer = window.setTimeout(() => {
        this.speakPrompt(kidPrompt, onEnd);
      }, 160);
    });
  }

  // ===========================================================================
  // STUDIO SFX & WEB AUDIO TACTILE SYNTHESIS
  // ===========================================================================

  /**
   * Soft warm brass-and-velvet lens whoosh when sweeping the 2.5x magnifying glass fast across the board.
   */
  public playLensWhoosh(speed = 24): void {
    if (AudioBus.getMuted()) return;
    const nowMs = performance.now();
    if (nowMs - this.lastWhooshAt < 420) return;
    this.lastWhooshAt = nowMs;

    const norm = Math.min(1, Math.max(0.25, speed / 55));
    this.playSfxMp3('lens_whoosh', 0.22 * norm, 0.94 + norm * 0.14);

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(340, now);
    bp.frequency.exponentialRampToValueAtTime(720, now + 0.08);
    bp.frequency.exponentialRampToValueAtTime(290, now + 0.18);
    bp.Q.setValueAtTime(2.6, now);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.09 * norm, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

    src.connect(bp);
    bp.connect(g);
    g.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.2);
  }

  /**
   * Crisp antique watchmaker brass click for UI buttons, board switches, and tier tabs.
   */
  public playBrassClick(): void {
    if (AudioBus.getMuted()) return;
    this.playSfxMp3('brass_click', 0.55, 1.0);

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1420, now);
    osc.frequency.exponentialRampToValueAtTime(460, now + 0.035);

    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.042);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  /**
   * Celebratory Golden Starburst Ring discovery pop when a hidden target object is tapped!
   */
  public playDiscoveryChimePop(instanceStep = 0): void {
    if (AudioBus.getMuted()) return;
    const rate = 1.0 + Math.min(3, instanceStep) * 0.06;
    this.playSfxMp3('chime_discovery_pop', 0.72, rate);

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    // Warm pop + ascending celesta triad
    const popOsc = ctx.createOscillator();
    const popGain = ctx.createGain();
    popOsc.type = 'sine';
    popOsc.frequency.setValueAtTime(360 * rate, now);
    popOsc.frequency.exponentialRampToValueAtTime(780 * rate, now + 0.085);
    popGain.gain.setValueAtTime(0.28, now);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    popOsc.connect(popGain);
    popGain.connect(this.masterGain);
    popOsc.start(now);
    popOsc.stop(now + 0.11);

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      if (!this.masterGain) return;
      const t = now + 0.03 + idx * 0.048;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * rate, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  /**
   * Tactile slot chime when a found object lands inside its bottom checklist picture card!
   */
  public playChecklistSlotSnap(isCardComplete = false): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const freqs = isCardComplete ? [659.25, 880, 1174.66] : [587.33, 880];
    freqs.forEach((f, idx) => {
      if (!this.masterGain) return;
      const t = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.24, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  /**
   * Rich heavy brass stamp pressing into a Crimson & Gold Detective Wax Seal!
   */
  public playWaxSealStamp(): void {
    if (AudioBus.getMuted()) return;
    this.playSfxMp3('wax_seal_stamp', 0.78, 1.0);

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    // Warm wax thud + golden brass resonance
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(165, now);
    thud.frequency.exponentialRampToValueAtTime(64, now + 0.14);
    thudGain.gain.setValueAtTime(0.45, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    thud.connect(thudGain);
    thudGain.connect(this.masterGain);
    thud.start(now);
    thud.stop(now + 0.17);

    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.type = 'sine';
    bell.frequency.setValueAtTime(1046.5, now + 0.04);
    bellGain.gain.setValueAtTime(0.22, now + 0.04);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    bell.connect(bellGain);
    bellGain.connect(this.masterGain);
    bell.start(now + 0.04);
    bell.stop(now + 0.5);
  }

  /**
   * Celebratory Junior Detective Case Solved fanfare!
   */
  public playDetectiveFanfare(): void {
    if (AudioBus.getMuted()) return;
    this.playSfxMp3('detective_fanfare', 0.82, 1.0);

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    chord.forEach((freq, idx) => {
      if (!this.masterGain) return;
      const t = now + idx * 0.07;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.24, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.68);
    });
  }

  /**
   * Plays a sparkling crystal curio glissando & speaks the curio name when inspecting a Rare Golden Curio!
   */
  public playCurioSparkle(audioKey?: string): void {
    if (AudioBus.getMuted()) return;
    this.playSfxMp3('curio_sparkle', 0.72, 1.0);
    if (audioKey) {
      this.speakItemName(audioKey);
    }
  }

  /**
   * Gentle, zero-punishment tactile studio micro-clink when tapping a non-target decoy object.
   */
  public playGentleClutterTap(): void {
    if (AudioBus.getMuted()) return;
    const nowMs = performance.now();
    if (nowMs - this.lastClutterTapAt < 120) return;
    this.lastClutterTapAt = nowMs;

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    const base = 420 + Math.random() * 140;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 0.68, now + 0.055);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }
}
