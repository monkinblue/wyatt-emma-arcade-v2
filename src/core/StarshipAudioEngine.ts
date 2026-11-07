/**
 * src/core/StarshipAudioEngine.ts
 * -------------------------------
 * Mentor Note:
 * `StarshipAudioEngine` powers the high-definition audio landscape for
 * **STARSHIP UNICORN: ORBITAL TRIVIA** (`StarshipUnicornScene.ts`).
 *
 * It combines two layers:
 *   1. **Pre-Generated ElevenLabs Mission Control Voice & SFX MP3s** (`assets/audio/starship/voice/*.mp3`
 *      and `assets/audio/starship/sfx/*.mp3`) played via Howler.js with clean voice ducking so
 *      overlapping callouts never muddy each other.
 *   2. **Zero-Latency Procedural WebAudio Sci-Fi & Game-Show Synthesizers** for tactile glassmorphic
 *      HUD telemetry chirps, 4-color answer pad lock-in chords, FICSIT Overclock power-up arpeggios,
 *      3D titanium dice clacks, pad-by-pad jetpack hop bursts, Hyperloop wormhole plasma sweeps,
 *      and the Galactic Unicorn Citadel synthwave victory anthem.
 */

import { Howl } from 'howler';

export type StarshipVoiceKey =
  | 'turn_robert'
  | 'turn_rita'
  | 'turn_wyatt'
  | 'turn_emma'
  | 'turn_papa'
  | 'turn_nana'
  | 'turn_grandpa'
  | 'turn_babci'
  | 'turn_guest'
  | 'welcome_title'
  | 'lobby_select'
  | 'launch_sequence'
  | 'overclock_engaged'
  | 'standard_thruster'
  | 'color_warp_bonus'
  | 'tile_wormhole'
  | 'tile_overclock'
  | 'tile_asteroid'
  | 'tile_rainbow_starship'
  | 'roll_prompt'
  | 'almost_there'
  | 'victory_citadel'
  | 'victory_robert'
  | 'victory_rita'
  | 'victory_wyatt'
  | 'victory_emma'
  | 'victory_papa'
  | 'victory_nana'
  | 'victory_grandpa'
  | 'victory_babci'
  | 'victory_guest';

export type StarshipSfxKey =
  | 'rocket_ignition'
  | 'hyperloop_whoosh'
  | 'overclock_chime'
  | 'asteroid_retro'
  | 'dice_tumble'
  | 'citadel_fanfare';

class StarshipAudioEngineImpl {
  private ctx: AudioContext | null = null;
  private voiceHowls: Map<StarshipVoiceKey, Howl> = new Map();
  private sfxHowls: Map<StarshipSfxKey, Howl> = new Map();
  private activeVoiceHowl: Howl | null = null;
  private ambientOscA: OscillatorNode | null = null;
  private ambientOscB: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Plays an ElevenLabs Mission Control announcer voice clip from `assets/audio/starship/voice/<key>.mp3`.
   * Automatically stops any previous announcer clip so voice callouts stay crisp.
   */
  public playVoice(key: StarshipVoiceKey, onEnd?: () => void): void {
    this.stopVoice();

    let howl = this.voiceHowls.get(key);
    if (!howl) {
      howl = new Howl({
        src: [`assets/audio/starship/voice/${key}.mp3`],
        volume: 0.96,
        preload: true
      });
      this.voiceHowls.set(key, howl);
    }

    this.activeVoiceHowl = howl;
    if (onEnd) {
      howl.once('end', () => {
        if (this.activeVoiceHowl === howl) {
          this.activeVoiceHowl = null;
        }
        onEnd();
      });
      howl.once('loaderror', () => {
        onEnd();
      });
    }
    howl.play();
  }

  public stopVoice(): void {
    if (this.activeVoiceHowl) {
      this.activeVoiceHowl.stop();
      this.activeVoiceHowl = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Reads a trivia question prompt aloud if the family taps the Read-Aloud speaker button.
   */
  public speakQuestionText(text: string): void {
    this.stopVoice();
    this.playUiChirp(920, 1280);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const clean = text.replace(/[^\w\s?,!.'-]/g, ' ').replace(/\s+/g, ' ').trim();
      const utter = new SpeechSynthesisUtterance(clean);
      utter.rate = 0.96;
      utter.pitch = 1.04;
      utter.volume = 0.95;
      window.speechSynthesis.speak(utter);
    }
  }

  /**
   * Plays a sampled sci-fi SFX clip (`assets/audio/starship/sfx/<key>.mp3`).
   */
  public playSampledSfx(key: StarshipSfxKey, volume = 0.65): void {
    let howl = this.sfxHowls.get(key);
    if (!howl) {
      howl = new Howl({
        src: [`assets/audio/starship/sfx/${key}.mp3`],
        volume,
        preload: true
      });
      this.sfxHowls.set(key, howl);
    }
    howl.volume(volume);
    howl.play();
  }

  /**
   * Subtle cosmic Starbase ambient pad while on the Mission Lobby or Orbital Board.
   */
  public startAmbientStarbasePad(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.ambientOscA) return;

    const now = ctx.currentTime;
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    oscA.type = 'sine';
    oscA.frequency.setValueAtTime(110, now); // A2
    oscB.type = 'triangle';
    oscB.frequency.setValueAtTime(164.81, now); // E3 fifth

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.032, now + 1.5);

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    oscA.start(now);
    oscB.start(now);

    this.ambientOscA = oscA;
    this.ambientOscB = oscB;
    this.ambientGain = gain;
  }

  public stopAmbientStarbasePad(): void {
    const ctx = this.ctx;
    if (ctx && this.ambientGain) {
      const now = ctx.currentTime;
      try {
        this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, now);
        this.ambientGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      } catch {
        // ignore
      }
    }
    setTimeout(() => {
      try {
        this.ambientOscA?.stop();
        this.ambientOscB?.stop();
      } catch {
        // ignore
      }
      this.ambientOscA = null;
      this.ambientOscB = null;
      this.ambientGain = null;
    }, 280);
  }

  /**
   * Crisp SpaceX Crew Dragon glassmorphic HUD telemetry chirp.
   */
  public playUiChirp(startHz = 840, endHz = 1320): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startHz, now);
    osc.frequency.exponentialRampToValueAtTime(endHz, now + 0.085);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Lobby astronaut bay lock-in or de-selection tone.
   */
  public playLobbyToggle(selected: boolean, slotIndex = 0): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const baseFreqs = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    const f = baseFreqs[slotIndex % baseFreqs.length];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = selected ? 'triangle' : 'sine';
    if (selected) {
      osc.frequency.setValueAtTime(f * 0.75, now);
      osc.frequency.exponentialRampToValueAtTime(f * 1.5, now + 0.14);
    } else {
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.65, now + 0.12);
    }

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  /**
   * Deep SpaceX Raptor engine ignition rumble + ascending orbital telemetry sweep.
   */
  public playLaunchIgnition(): void {
    this.playSampledSfx('rocket_ignition', 0.68);
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Rising synth chord
    const notes = [220, 277.18, 329.63, 440, 659.25];
    notes.forEach((hz, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(hz * 0.5, now + idx * 0.06);
      osc.frequency.exponentialRampToValueAtTime(hz, now + 0.75 + idx * 0.05);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, now);
      filter.frequency.exponentialRampToValueAtTime(3200, now + 0.9);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.065, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.15);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.06);
      osc.stop(now + 1.2);
    });
  }

  /**
   * Game-show telemetry reveal chord when a new Trivia card slides in.
   */
  public playTriviaRevealShimmer(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5];

    freqs.forEach((hz, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(hz, now + i * 0.045);

      gain.gain.setValueAtTime(0.075, now + i * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.045 + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.045);
      osc.stop(now + i * 0.045 + 0.34);
    });
  }

  /**
   * Tactile color pad press sound when a player taps [A: RED], [B: BLUE], [C: AMBER], or [D: EMERALD].
   */
  public playPadLockIn(optionIndex: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const padHz = [523.25, 659.25, 783.99, 987.77][optionIndex % 4];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(padHz, now);
    osc.frequency.exponentialRampToValueAtTime(padHz * 1.25, now + 0.11);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  /**
   * Triumphant FICSIT Overclock fanfare when a trivia answer is CORRECT!
   */
  public playOverclockFanfare(): void {
    this.playSampledSfx('overclock_chime', 0.62);
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const arpeggio = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    arpeggio.forEach((hz, idx) => {
      const t = now + idx * 0.065;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(hz, t);

      gain.gain.setValueAtTime(0.13, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  /**
   * Warm, encouraging standard thruster power-up when an answer is missed or skipped (never harsh!).
   */
  public playStandardThrusterTone(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [440, 523.25, 659.25];
    notes.forEach((hz, idx) => {
      const t = now + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(hz, t);

      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.27);
    });
  }

  /**
   * 3D Titanium & Holographic Plasma Dice tumble clack + energy lock-in.
   */
  public playDiceTumbleBurst(): void {
    this.playSampledSfx('dice_tumble', 0.6);
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    for (let i = 0; i < 8; i++) {
      const t = now + i * 0.075;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(620 + i * 95, t);
      osc.frequency.exponentialRampToValueAtTime(1180 + i * 110, t + 0.045);

      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    }
  }

  /**
   * Crisp ascending jetpack hop sound as an astronaut token hops pad-by-pad along the hex track.
   */
  public playTokenHop(stepIndex: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 987.77, 1046.5, 1174.66, 1318.51, 1567.98];
    const hz = scale[stepIndex % scale.length];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(hz * 0.82, now);
    osc.frequency.exponentialRampToValueAtTime(hz * 1.18, now + 0.11);

    gain.gain.setValueAtTime(0.13, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  /**
   * Hyperloop Wormhole (`+5` spaces) or Rainbow Starship Warp audio sweep.
   */
  public playWormholeWarp(): void {
    this.playSampledSfx('hyperloop_whoosh', 0.72);
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.55);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.62);
  }

  /**
   * Asteroid Gravity Well (`-2` spaces) gentle retro-thruster braking burst.
   */
  public playAsteroidRetro(): void {
    this.playSampledSfx('asteroid_retro', 0.65);
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.35);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(950, now);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  /**
   * Galactic Unicorn Citadel Victory Anthem!
   */
  public playVictoryAnthem(): void {
    this.playSampledSfx('citadel_fanfare', 0.78);
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const chordMelody = [
      { hz: 523.25, t: 0.0, d: 0.22 },
      { hz: 659.25, t: 0.18, d: 0.22 },
      { hz: 783.99, t: 0.36, d: 0.22 },
      { hz: 1046.5, t: 0.54, d: 0.42 },
      { hz: 880.0, t: 0.92, d: 0.22 },
      { hz: 1046.5, t: 1.12, d: 0.65 },
      { hz: 1318.51, t: 1.12, d: 0.65 },
      { hz: 1567.98, t: 1.12, d: 0.65 }
    ];

    chordMelody.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.hz, now + note.t);

      gain.gain.setValueAtTime(0.12, now + note.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + note.t);
      osc.stop(now + note.t + note.d + 0.02);
    });
  }
}

export const StarshipAudio = new StarshipAudioEngineImpl();
