import { Howl } from 'howler';
import { AudioBus } from '../core/AudioBus';

/**
 * CloudKartAudioEngine — Offline Voice, Letter/Number Pronunciation & Arcade Kart SFX Manager
 * for "Zoomy Cloud Kart" (`CloudKartScene.ts`).
 *
 * Uses pre-generated ElevenLabs "Josh - Teacher for Kids" MP3s in `/assets/audio/cloudkart/`
 * (`stability=0.86`, calm period endings, zero exclamation marks) alongside ElevenLabs
 * Sound Generation API SFX (`sfx/*.mp3`) and zero-latency WebAudio musical accents.
 */
export class CloudKartAudioEngine {
  private ctx: AudioContext | null = null;
  private activeVoiceHowl: Howl | null = null;
  private howlCache: Map<string, Howl> = new Map();
  private lastRumbleAt = 0;
  private lastTraceSparkleAt = 0;

  private getContext(): AudioContext | null {
    if (AudioBus.getMuted()) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getOrCreateHowl(src: string, volume: number): Howl {
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

  public stopVoice(): void {
    AudioBus.stopLayerSfx('/assets/audio/cloudkart/prompts/welcome_title.mp3');
    if (this.activeVoiceHowl) {
      this.activeVoiceHowl.stop();
      this.activeVoiceHowl = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Plays an offline MP3 from `/assets/audio/cloudkart/<relPath>` with warm headroom (`0.82`).
   */
  public playVoiceClip(relPath: string, onEnd?: () => void): void {
    if (AudioBus.getMuted()) {
      if (onEnd) onEnd();
      return;
    }
    this.stopVoice();

    const src = `/assets/audio/cloudkart/${relPath}`;
    const howl = this.getOrCreateHowl(src, 0.82);
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

  public speakPrompt(promptId: string, onEnd?: () => void): void {
    this.playVoiceClip(`prompts/${promptId}.mp3?v=ck1`, onEnd);
  }

  /**
   * Speaks a single character (`A`–`Z` or `0`–`9`) using the offline Josh MP3 library.
   */
  public speakCharacter(char: string, onEnd?: () => void): void {
    const clean = char.trim();
    if (/^[0-9]$/.test(clean)) {
      this.playVoiceClip(`numbers/num_${clean}.mp3?v=ck1`, onEnd);
    } else {
      const lower = clean.toLowerCase();
      this.playVoiceClip(`letters/letter_${lower}.mp3?v=ck1`, onEnd);
    }
  }

  // ===========================================================================
  // ARCADE KART & PENMANSHIP SFX (ElevenLabs MP3 + Zero-Latency WebAudio Layer)
  // ===========================================================================

  private playSfxFile(sfxName: string, volume = 0.62): void {
    if (AudioBus.getMuted()) return;
    const src = `/assets/audio/cloudkart/sfx/${sfxName}.mp3?v=ck1`;
    const howl = this.getOrCreateHowl(src, volume);
    howl.play();
  }

  public playKartEnginePurr(): void {
    this.playSfxFile('kart_engine_purr', 0.45);
  }

  public playStarCoinPickup(combo = 0): void {
    this.playSfxFile('star_coin_chime', 0.58);
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const baseFreq = 587.33 * Math.pow(1.05946, Math.min(10, combo));
    [baseFreq, baseFreq * 1.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.055);
      gain.gain.setValueAtTime(0.16, now + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.24);
    });
  }

  public playRainbowBoostPad(): void {
    this.playSfxFile('rainbow_turbo_boost', 0.65);
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.18, now + idx * 0.045 + 0.18);
      gain.gain.setValueAtTime(0.14, now + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.22);
    });
  }

  public playCloudRampJump(): void {
    AudioBus.playSfx('boing');
  }

  /**
   * Plays a gentle ascending starlight shimmer as the child drags along the valid stroke corridor.
   * Throttled so continuous pointermove events sound musical and calm.
   */
  public playTraceProgressTick(progressRatio: number): void {
    const nowMs = performance.now();
    if (nowMs - this.lastTraceSparkleAt < 85) return;
    this.lastTraceSparkleAt = nowMs;

    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const freq = 440 + Math.max(0, Math.min(1, progressRatio)) * 440;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.08, now + 0.06);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.075);
  }

  public playChalkTraceStart(): void {
    this.playSfxFile('chalk_trace_loop', 0.44);
  }

  /**
   * Gentle tactile cloud rumble when straying outside the penmanship track corridor.
   * Throttled to once every 420ms so it never overwhelms the child.
   */
  public playOffTrackRumble(): boolean {
    const nowMs = performance.now();
    if (nowMs - this.lastRumbleAt < 420) return false;
    this.lastRumbleAt = nowMs;

    this.playSfxFile('off_track_rumble', 0.52);
    const ctx = this.getContext();
    if (!ctx) return true;

    const now = ctx.currentTime;
    [165, 138].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      osc.frequency.exponentialRampToValueAtTime(92, now + idx * 0.07 + 0.08);

      gain.gain.setValueAtTime(0.14, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.095);
    });
    return true;
  }

  public playStrokeCompleteChime(strokeNum: number): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const root = 523.25 * Math.pow(1.122, Math.min(4, strokeNum - 1));
    [root, root * 1.25, root * 1.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      gain.gain.setValueAtTime(0.18, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.3);
    });
  }

  public playSkyGateOpen(): void {
    this.playSfxFile('sky_gate_open', 0.66);
  }

  public playPodiumFanfare(): void {
    this.playSfxFile('podium_fanfare', 0.72);
  }
}
