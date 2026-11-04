import { Howl } from 'howler';
import { AudioBus } from '../core/AudioBus';

/**
 * ShutTheBoxAudioEngine — Offline Voice & Acoustic Tabletop SFX Manager
 * for "Great Hall Box of Ten" (`ShutTheBoxScene.ts`).
 *
 * Uses pre-generated ElevenLabs "Josh - Teacher for Kids" MP3s in
 * `/assets/audio/shutthebox/` alongside ElevenLabs Sound Generation API
 * tabletop SFX (`sfx/*.mp3`) and zero-latency WebAudio acoustic accents.
 *
 * Strictly speaks single numbers (`num_1.mp3`..`num_20.mp3`) immediately when
 * clicked — zero chained or pre-baked "X plus Y equals Z" equation readouts.
 */
export class ShutTheBoxAudioEngine {
  private ctx: AudioContext | null = null;
  private activeVoiceHowl: Howl | null = null;
  private howlCache: Map<string, Howl> = new Map();

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
    AudioBus.stopLayerSfx('/assets/audio/shutthebox/prompts/welcome_title.mp3');
    if (this.activeVoiceHowl) {
      this.activeVoiceHowl.stop();
      this.activeVoiceHowl = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Plays an offline MP3 from `/assets/audio/shutthebox/<relPath>` with headroom attenuation (`0.80`).
   */
  public playVoiceClip(relPath: string, onEnd?: () => void): void {
    if (AudioBus.getMuted()) {
      if (onEnd) onEnd();
      return;
    }
    this.stopVoice();

    const src = `/assets/audio/shutthebox/${relPath}`;
    const howl = this.getOrCreateHowl(src, 0.8);
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
    this.playVoiceClip(`prompts/${promptId}.mp3?v=stb2`, onEnd);
  }

  /**
   * Speaks ONLY the single integer `n` (`1`..`20`) immediately when clicked.
   * Direct 1-to-1 integer mapping (`n` -> `numbers/num_${n}.mp3?v=stb2`) with
   * zero array offset bugs.
   */
  public speakNumber(n: number, onEnd?: () => void): void {
    const exactInt = Math.max(1, Math.min(20, Math.round(Number(n))));
    this.playVoiceClip(`numbers/num_${exactInt}.mp3?v=stb2`, onEnd);
  }

  // ===========================================================================
  // ACOUSTIC TABLETOP SFX (ElevenLabs MP3 + Zero-Latency WebAudio Layer)
  // ===========================================================================

  private playSfxFile(sfxName: string, volume = 0.62): void {
    if (AudioBus.getMuted()) return;
    const src = `/assets/audio/shutthebox/sfx/${sfxName}.mp3?v=stb2`;
    const howl = this.getOrCreateHowl(src, volume);
    howl.play();
  }

  public playDiceCupShake(): void {
    this.playSfxFile('dice_cup_shake', 0.65);
    const ctx = this.getContext();
    if (!ctx) return;

    // Warm hollow wooden cup rattle clicks
    const now = ctx.currentTime;
    [0, 0.07, 0.14, 0.22, 0.29].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320 + (i % 3) * 85, now + offset);
      osc.frequency.exponentialRampToValueAtTime(140, now + offset + 0.045);

      gain.gain.setValueAtTime(0.14, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.055);
    });
  }

  public playDiceRollFelt(): void {
    this.playSfxFile('dice_roll_felt', 0.68);
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [0, 0.08, 0.17, 0.28, 0.41].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260 - idx * 22, now + offset);
      osc.frequency.exponentialRampToValueAtTime(95, now + offset + 0.04);

      gain.gain.setValueAtTime(0.15 * (1 - idx * 0.15), now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.05);
    });
  }

  public playTileClackShut(tileNumber = 5): void {
    this.playSfxFile('tile_clack_shut', 0.68);
    const ctx = this.getContext();
    if (!ctx) return;

    // Crisp mechanical maple-on-walnut wood clack with subtle pitch progression by tile 1..10
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const baseFreq = 390 + tileNumber * 24;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(135, now + 0.065);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playTileSelectTap(tileNumber = 5): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const baseFreq = 440 + tileNumber * 32;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, now + 0.08);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.095);
  }

  public playScrollUnfurl(): void {
    this.playSfxFile('scroll_unfurl', 0.6);
  }

  public playMathChime(): void {
    this.playSfxFile('math_chime', 0.62);
    const ctx = this.getContext();
    if (!ctx) return;

    // Warm Great Hall celesta triad (C5 - E5 - G5 - C6)
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.055);

      gain.gain.setValueAtTime(0.14, now + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.42);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.45);
    });
  }

  public playGentleTryAgain(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [330, 293.66].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);

      gain.gain.setValueAtTime(0.12, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.18);
    });
  }

  public playGemsPourGlass(): void {
    this.playSfxFile('gems_pour_glass', 0.64);
  }

  public playHouseFanfare(): void {
    this.playSfxFile('house_fanfare', 0.68);
  }
}
