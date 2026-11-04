import { Howl } from 'howler';
import { AudioBus } from '../core/AudioBus';

/**
 * RocketAudioEngine — Composable Place-Value Voice (1 to 999) & Space Rocketry SFX Manager
 * for "Rocket Number Blast" (`RocketBlastScene.ts`).
 *
 * Uses pre-generated ElevenLabs "Josh - Teacher for Kids" MP3s in `/assets/audio/rocket/`
 * (`stability=0.86`, calm period endings, zero exclamation marks) alongside ElevenLabs
 * Sound Generation API space SFX (`sfx/*.mp3`) and zero-latency WebAudio musical layers.
 */
export class RocketAudioEngine {
  private ctx: AudioContext | null = null;
  private activeVoiceHowl: Howl | null = null;
  private howlCache: Map<string, Howl> = new Map();
  private voiceSequenceToken = 0;
  private chainTimer: number | null = null;

  constructor() {
    this.preloadCoreNumberClips();
  }

  private preloadCoreNumberClips(): void {
    // Pre-warm single-digit and base-10 place value clips for zero-latency fuel taps
    const priorityNums = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      20, 30, 40, 50, 60, 70, 80, 90,
      100, 200, 300, 400, 500, 600, 700, 800, 900
    ];
    for (const n of priorityNums) {
      this.getOrCreateHowl(`/assets/audio/rocket/numbers/num_${n}.mp3?v=rk1`, 0.84);
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
    if (this.chainTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.chainTimer);
      this.chainTimer = null;
    }
    AudioBus.stopLayerSfx('/assets/audio/rocket/prompts/welcome_title.mp3');
    if (this.activeVoiceHowl) {
      this.activeVoiceHowl.stop();
      this.activeVoiceHowl = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Plays a sequence of relative MP3 paths under `/assets/audio/rocket/` back-to-back.
   * Cancels any in-flight sequence immediately so rapid tapping never queues stale clips.
   */
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

      const src = `/assets/audio/rocket/${relPaths[idx]}`;
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
    this.playVoiceClip(`prompts/${promptId}.mp3?v=rk1`, onEnd);
  }

  /**
   * Decomposes any integer `1`..`999` into its exact place-value voice clips:
   * - Hundreds (`num_100`..`num_900`)
   * - Teens (`num_1`..`num_19`) or Tens (`num_20`..`num_90`) + Ones (`num_1`..`num_9`)
   */
  public decomposeNumberToClips(n: number): string[] {
    const val = Math.max(1, Math.min(999, Math.round(Number(n))));
    const clips: string[] = [];

    const hundreds = Math.floor(val / 100) * 100;
    if (hundreds >= 100) {
      clips.push(`numbers/num_${hundreds}.mp3?v=rk1`);
    }

    const rem = val % 100;
    if (rem > 0) {
      if (rem <= 20) {
        clips.push(`numbers/num_${rem}.mp3?v=rk1`);
      } else {
        const tens = Math.floor(rem / 10) * 10;
        const ones = rem % 10;
        clips.push(`numbers/num_${tens}.mp3?v=rk1`);
        if (ones > 0) {
          clips.push(`numbers/num_${ones}.mp3?v=rk1`);
        }
      }
    }

    return clips;
  }

  /**
   * Speaks any integer `1`–`999` naturally by chaining the exact hundred + ten/teen + one clips.
   */
  public speakNumber(n: number, onEnd?: () => void): void {
    const clips = this.decomposeNumberToClips(n);
    this.playVoiceSequence(clips, onEnd);
  }

  /**
   * Immediately speaks a single-clip stage value (`1`..`10`, `10`..`90`, or `100`..`900`)
   * when tapping fuel stars in the sky so rapid tapping has zero multi-clip latency!
   */
  public speakStageFuelValue(stageValue: number, fallbackUnit: 1 | 10 | 100, onEnd?: () => void): void {
    const cleanVal = stageValue > 0 ? stageValue : fallbackUnit;
    this.speakNumber(cleanVal, onEnd);
  }

  // ===========================================================================
  // SPACE ROCKETRY & PLACE-VALUE SFX (ElevenLabs MP3 + WebAudio Musical Layers)
  // ===========================================================================

  private playSfxFile(sfxName: string, volume = 0.64): void {
    if (AudioBus.getMuted()) return;
    const src = `/assets/audio/rocket/sfx/${sfxName}.mp3?v=rk1`;
    const howl = this.getOrCreateHowl(src, volume);
    howl.play();
  }

  /**
   * `+1` Star Gem Laser Beam: High crystal starlight chime (`1s` Place Value).
   */
  public playLaserBeamOnes(count = 1): void {
    this.playSfxFile('laser_chime_1', 0.56);
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const baseFreq = 587.33 * Math.pow(1.05946, Math.min(10, count));
    [baseFreq, baseFreq * 1.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + idx * 0.045 + 0.14);
      gain.gain.setValueAtTime(0.16, now + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.18);
    });
  }

  /**
   * `+10` Constellation Cluster Beam: Rich golden chord chime (`10s` Place Value).
   */
  public playLaserBeamTens(tensCount = 1): void {
    this.playSfxFile('laser_chord_10', 0.62);
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const root = 440 * Math.pow(1.05946, Math.min(9, tensCount));
    [root, root * 1.25, root * 1.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      gain.gain.setValueAtTime(0.17, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.26);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.28);
    });
  }

  /**
   * `+100` Mega Supernova Core Beam: Deep resonant sapphire bass thrum + cosmic brass pulse (`100s` Place Value).
   */
  public playLaserBeamHundreds(hundredsCount = 1): void {
    this.playSfxFile('laser_supernova_100', 0.68);
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const subFreq = 130.81 * Math.pow(1.05946, Math.min(9, hundredsCount));
    [subFreq, subFreq * 2, subFreq * 3].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.035);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.12, now + idx * 0.035 + 0.32);
      gain.gain.setValueAtTime(idx === 0 ? 0.18 : 0.14, now + idx * 0.035);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.035 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.035);
      osc.stop(now + idx * 0.035 + 0.38);
    });
  }

  /**
   * Gentle warm amber pressure-gauge wobble cue when a stage tank is over-fueled (`>`).
   * Never uses a harsh buzzer!
   */
  public playPressureGaugeWobble(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [392, 440, 392, 466.16].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      gain.gain.setValueAtTime(0.14, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.14);
    });
  }

  /**
   * Hilarious *PSSSHHH-POP!* Brass Steam-Whistle Valve release when popping excess fuel out.
   */
  public playSteamValveRelease(): void {
    this.playSfxFile('steam_whistle_valve', 0.72);
    AudioBus.playSfx('kettle');
    this.playVoiceClip('prompts/steam_released.mp3?v=rk1');
  }

  /**
   * Hydraulic brass gantry clamp retraction + countdown beep.
   */
  public playGantryClampsRetract(): void {
    this.playSfxFile('gantry_clamps', 0.68);
    AudioBus.playSfx('split-flap');
  }

  /**
   * Rocket main engine ignition roar & ascent thrust.
   */
  public playRocketEngineRoar(): void {
    this.playSfxFile('rocket_engine_roar', 0.72);
    AudioBus.playSfx('jet-whoosh');
  }

  /**
   * Multi-stage booster separation bolts + upper stage ignition!
   */
  public playStageSeparationPyro(): void {
    this.playSfxFile('stage_separation_pyro', 0.74);
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);
      gain.gain.setValueAtTime(0.18, now + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.28);
    });
  }

  /**
   * Planetary touchdown & glowing number flag planting fanfare!
   */
  public playPlanetFlagFanfare(): void {
    this.playSfxFile('planet_flag_fanfare', 0.76);
    AudioBus.playSfx('fanfare');
  }
}
