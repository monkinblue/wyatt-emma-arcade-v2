import { Howl } from 'howler';
import { AudioBus } from '../core/AudioBus';

/**
 * UnicornAudioEngine — Voice & Magical SFX Manager for "Princess Emma's Unicorn Castle" (`UnicornCastleScene.ts`).
 *
 * Uses pre-generated ElevenLabs "Josh - Teacher for Kids" MP3s in `/assets/audio/unicorn/`
 * (`stability=0.86`, calm storybook tone, period endings, zero exclamation marks) alongside
 * ElevenLabs Sound Generation API magical SFX (`sfx/*.mp3`) and zero-latency WebAudio harp/celesta layers.
 */
export class UnicornAudioEngine {
  private ctx: AudioContext | null = null;
  private activeVoiceHowl: Howl | null = null;
  private howlCache: Map<string, Howl> = new Map();
  private voiceSequenceToken = 0;
  private lastBubbleSfxTime = 0;
  private lastRinseSfxTime = 0;
  private lastPourSfxTime = 0;
  private lastBrushSfxTime = 0;

  constructor() {
    this.preloadCoreClips();
  }

  private preloadCoreClips(): void {
    for (let n = 1; n <= 5; n++) {
      this.getOrCreateHowl(`/assets/audio/unicorn/numbers/num_${n}.mp3?v=uc1`, 0.84);
    }
    const coreShapes = [
      'pink_heart',
      'purple_star',
      'blue_diamond',
      'yellow_circle',
      'green_square',
      'red_circle',
      'yellow_star',
      'blue_triangle',
      'color_pink',
      'color_blue',
      'color_lavender',
      'color_gold'
    ];
    for (const s of coreShapes) {
      this.getOrCreateHowl(`/assets/audio/unicorn/shapes/${s}.mp3?v=uc1`, 0.84);
    }
  }

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
    this.voiceSequenceToken++;
    AudioBus.stopLayerSfx('/assets/audio/unicorn/prompts/welcome_title.mp3');
    if (this.activeVoiceHowl) {
      this.activeVoiceHowl.stop();
      this.activeVoiceHowl = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public playVoiceSequence(relPaths: string[], onEnd?: () => void): void {
    if (AudioBus.getMuted() || relPaths.length === 0) {
      if (onEnd) onEnd();
      return;
    }
    this.stopVoice();
    const myToken = this.voiceSequenceToken;

    const playStep = (idx: number) => {
      if (this.voiceSequenceToken !== myToken || AudioBus.getMuted()) {
        return;
      }
      if (idx >= relPaths.length) {
        if (onEnd) onEnd();
        return;
      }

      const src = `/assets/audio/unicorn/${relPaths[idx]}`;
      const howl = this.getOrCreateHowl(src, 0.84);
      this.activeVoiceHowl = howl;

      let advanced = false;
      const advanceNext = () => {
        if (advanced || this.voiceSequenceToken !== myToken) return;
        advanced = true;
        if (this.activeVoiceHowl === howl) {
          this.activeVoiceHowl = null;
        }
        if (idx + 1 < relPaths.length) {
          playStep(idx + 1);
        } else if (onEnd) {
          onEnd();
        }
      };

      howl.once('end', advanceNext);
      howl.once('loaderror', advanceNext);
      howl.play();
    };

    playStep(0);
  }

  public playVoiceClip(relPath: string, onEnd?: () => void): void {
    this.playVoiceSequence([relPath], onEnd);
  }

  public speakPrompt(promptId: string, onEnd?: () => void): void {
    this.playVoiceClip(`prompts/${promptId}.mp3?v=uc1`, onEnd);
  }

  public speakShapeOrColor(shapeKey: string, onEnd?: () => void): void {
    this.playVoiceClip(`shapes/${shapeKey}.mp3?v=uc1`, onEnd);
  }

  public speakNumber(n: number, onEnd?: () => void): void {
    const clamped = Math.max(1, Math.min(5, Math.round(n)));
    this.playVoiceClip(`numbers/num_${clamped}.mp3?v=uc1`, onEnd);
  }

  public speakCountAndSummary(count: number, summaryPromptId: string, onEnd?: () => void): void {
    const clamped = Math.max(1, Math.min(5, Math.round(count)));
    this.playVoiceSequence(
      [`numbers/num_${clamped}.mp3?v=uc1`, `prompts/${summaryPromptId}.mp3?v=uc1`],
      onEnd
    );
  }

  // ===========================================================================
  // MAGICAL UNICORN CASTLE SFX (ElevenLabs MP3 + WebAudio Celesta/Harp Layers)
  // ===========================================================================

  private playSfxFile(sfxName: string, volume = 0.62): void {
    if (AudioBus.getMuted()) return;
    const src = `/assets/audio/unicorn/sfx/${sfxName}.mp3?v=uc1`;
    const howl = this.getOrCreateHowl(src, volume);
    howl.play();
  }

  /**
   * Soapy shampoo bubble lathering & soft sparkling foam pops (throttled for smooth dragging).
   */
  public playShampooBubbles(): void {
    const nowMs = Date.now();
    if (nowMs - this.lastBubbleSfxTime > 650) {
      this.lastBubbleSfxTime = nowMs;
      this.playSfxFile('shampoo_bubbles', 0.52);
    }

    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const baseFreq = 520 + Math.random() * 380;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.45, now + 0.085);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Magical starlight brush shimmer when painting the Unicorn's mane or tail sections.
   */
  public playSparkleBrush(sectionIndex = 0): void {
    const nowMs = Date.now();
    if (nowMs - this.lastBrushSfxTime < 140) return;
    this.lastBrushSfxTime = nowMs;

    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const scaleNotes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    const root = scaleNotes[sectionIndex % scaleNotes.length];
    [root, root * 1.25, root * 1.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.035);
      gain.gain.setValueAtTime(0.13, now + idx * 0.035);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.035 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.035);
      osc.stop(now + idx * 0.035 + 0.2);
    });
  }

  /**
   * Golden Cloud Showerhead waterfall rinse & crystal water droplets.
   */
  public playWaterfallRinse(): void {
    const nowMs = Date.now();
    if (nowMs - this.lastRinseSfxTime > 750) {
      this.lastRinseSfxTime = nowMs;
      this.playSfxFile('waterfall_rinse', 0.56);
    }

    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [880, 1046.5, 1318.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 60, now + idx * 0.03);
      gain.gain.setValueAtTime(0.08, now + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.03);
      osc.stop(now + idx * 0.03 + 0.14);
    });
  }

  /**
   * Crystal gem snapping into a carved golden crown socket (*clink-chime*).
   */
  public playGemSocketChime(socketIndex = 0): void {
    this.playSfxFile('gem_socket_chime', 0.66);
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const pentatonic = [523.25, 587.33, 659.25, 783.99, 1046.5];
    const base = pentatonic[socketIndex % pentatonic.length];
    [base, base * 1.5, base * 2].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);
      gain.gain.setValueAtTime(0.16, now + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.26);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.28);
    });
  }

  /**
   * Enchanted Porcelain Teapot pouring pastel rainbow tea into a teacup.
   */
  public playTeapotPour(fillProgress = 0.5): void {
    const nowMs = Date.now();
    if (nowMs - this.lastPourSfxTime > 720) {
      this.lastPourSfxTime = nowMs;
      this.playSfxFile('teapot_pour', 0.58);
    }

    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freq = 440 + fillProgress * 440;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.15, now + 0.11);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  /**
   * Delicate porcelain teacup & silver spoon clink when a cup finishes filling or a treat lands on a plate.
   */
  public playTeacupClink(countStep = 1): void {
    this.playSfxFile('teacup_clink', 0.62);
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 587.33, 659.25, 698.46, 783.99];
    const freq = notes[(Math.max(1, countStep) - 1) % notes.length];
    [freq, freq * 2].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.03);
      gain.gain.setValueAtTime(0.15, now + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.03);
      osc.stop(now + idx * 0.03 + 0.24);
    });
  }

  /**
   * Happy unicorn whinny & nuzzle cue.
   */
  public playUnicornWhinny(): void {
    this.playSfxFile('unicorn_whinny', 0.68);
  }

  /**
   * Tactile paper-peel sound when lifting a sticker from the ribbon drawer.
   */
  public playStickerPeel(): void {
    this.playSfxFile('sticker_peel', 0.62);
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.09);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  /**
   * Joyful musical pop when sticking or tapping an animated sticker on the kingdom stage.
   */
  public playStickerStick(stickerIndex = 0): void {
    this.playSfxFile('sticker_peel', 0.54);
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    const base = scale[stickerIndex % scale.length];
    [base, base * 1.25].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      gain.gain.setValueAtTime(0.15, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.2);
    });
  }

  /**
   * Harp & celesta royal music-box fanfare when completing a wish, tea request, or caretaking moment!
   */
  public playRoyalFanfare(): void {
    this.playSfxFile('royal_fanfare', 0.72);
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const arp = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    arp.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.065);
      gain.gain.setValueAtTime(0.14, now + idx * 0.065);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.065 + 0.34);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.065);
      osc.stop(now + idx * 0.065 + 0.36);
    });
  }
}
