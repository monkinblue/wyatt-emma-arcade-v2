/**
 * src/core/StarshipAudioEngine.ts
 * -------------------------------
 * Mentor Note:
 * `StarshipAudioEngine` powers the high-definition audio landscape for
 * **STARSHIP UNICORN: ORBITAL TRIVIA** (`StarshipUnicornScene.ts`).
 *
 * Key Upgrades:
 *   1. **100% Silent Idle State**: Continuous background ambient oscillators are completely
 *      removed so living-room TV / tablet speakers are dead-silent when idle.
 *   2. **Heavy FICSIT Industrial Switchgear & Pneumatic Hydraulics**: Multi-layered WebAudio
 *      synthesizers generate physical switch latch clunks, pressurized hydraulic air hisses,
 *      sub-bass lock-in thuds, tension scanner pulses, and mechanical turbine dice spin-ups.
 *   3. **Pre-Generated ElevenLabs Mission Control Voice & SFX MP3s** (`assets/audio/starship/voice/*.mp3`
 *      and `assets/audio/starship/sfx/*.mp3`) played via Howler.js.
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

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
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
   * Reads a trivia question prompt aloud if the family taps the Read-Aloud cockpit switch.
   */
  public speakQuestionText(text: string): void {
    this.stopVoice();
    this.playRockerSwitchClick(true);
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
   * UPGRADE 1: 100% SILENT IDLE STATE.
   * No continuous OscillatorNode drone or background hum is ever started.
   */
  public startAmbientStarbasePad(): void {
    // Intentionally silent so speakers have zero idle hum.
  }

  public stopAmbientStarbasePad(): void {
    // No-op (idle hum removed).
  }

  /**
   * Helper to synthesize filtered white noise bursts (for pneumatic air hisses & thruster exhaust).
   */
  private triggerNoiseBurst(
    durationSec: number,
    filterType: BiquadFilterType,
    startFreq: number,
    endFreq: number,
    peakGain: number,
    delaySec = 0,
    qFactor = 2.0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delaySec;

    const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.setValueAtTime(qFactor, now);
    filter.frequency.setValueAtTime(startFreq, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + durationSec);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + Math.min(0.02, durationSec * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0008, now + durationSec);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    src.start(now);
    src.stop(now + durationSec + 0.02);
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
   * Tactile metallic cockpit rocker switch click (`[ 🔊 READ QUESTION ]` / `[ SKIP TO ROLL ➔ ]`).
   */
  public playRockerSwitchClick(upward = true): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Mechanical spring snap
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(upward ? 280 : 420, now);
    osc.frequency.exponentialRampToValueAtTime(upward ? 680 : 190, now + 0.065);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);

    // Subtle pneumatic micro-puff
    this.triggerNoiseBurst(0.06, 'bandpass', 2200, 900, 0.06, 0.01, 3.0);
  }

  /**
   * UPGRADE 2: HEAVY INDUSTRIAL PNEUMATIC LATCH CLUNK + HYDRAULIC HISS + SUB-BASS LOCK-IN THUD
   * Fires when a player presses one of the 4 FICSIT Switchgear Answer Pads (`[A • RUBY]` .. `[D • NEBULA]`),
   * followed by 4 rapid telemetry scanner lock-in ticks during the 750ms suspense window!
   */
  public playPadLockIn(optionIndex: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Sub-bass mechanical lock-in thud (heavy physical switch bottoming out)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(115, now);
    subOsc.frequency.exponentialRampToValueAtTime(34, now + 0.22);
    subGain.gain.setValueAtTime(0.32, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.25);

    // 2. Metallic switchgear latch clunk (gunmetal relay engagement)
    const latchOsc = ctx.createOscillator();
    const latchGain = ctx.createGain();
    latchOsc.type = 'sawtooth';
    latchOsc.frequency.setValueAtTime(240, now + 0.015);
    latchOsc.frequency.exponentialRampToValueAtTime(68, now + 0.095);
    latchGain.gain.setValueAtTime(0.18, now + 0.015);
    latchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    latchOsc.connect(latchGain);
    latchGain.connect(ctx.destination);
    latchOsc.start(now + 0.015);
    latchOsc.stop(now + 0.12);

    // 3. Pressurized hydraulic air release hiss (`pssshhh`)
    this.triggerNoiseBurst(0.24, 'bandpass', 3200, 780, 0.14, 0.03, 1.8);

    // 4. Keycap harmonic confirmation tone + 4 suspense scanner telemetry pulses over 700ms
    const padHz = [440, 523.25, 659.25, 783.99][optionIndex % 4];
    const toneOsc = ctx.createOscillator();
    const toneGain = ctx.createGain();
    toneOsc.type = 'triangle';
    toneOsc.frequency.setValueAtTime(padHz, now + 0.04);
    toneOsc.frequency.exponentialRampToValueAtTime(padHz * 1.12, now + 0.18);
    toneGain.gain.setValueAtTime(0.14, now + 0.04);
    toneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    toneOsc.connect(toneGain);
    toneGain.connect(ctx.destination);
    toneOsc.start(now + 0.04);
    toneOsc.stop(now + 0.22);

    // Suspense scanner pulses at 160ms, 310ms, 460ms, 610ms
    const scanTimes = [0.16, 0.31, 0.46, 0.61];
    scanTimes.forEach((offset, idx) => {
      const sOsc = ctx.createOscillator();
      const sGain = ctx.createGain();
      sOsc.type = 'sine';
      sOsc.frequency.setValueAtTime(580 + idx * 140, now + offset);
      sOsc.frequency.exponentialRampToValueAtTime(720 + idx * 160, now + offset + 0.06);
      sGain.gain.setValueAtTime(0.075, now + offset);
      sGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.07);
      sOsc.connect(sGain);
      sGain.connect(ctx.destination);
      sOsc.start(now + offset);
      sOsc.stop(now + offset + 0.08);
    });
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
   * Triumphant FICSIT Overclock fanfare when a trivia answer is CORRECT!
   */
  public playOverclockFanfare(): void {
    this.playSampledSfx('overclock_chime', 0.65);
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

      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
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

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.27);
    });
  }

  /**
   * UPGRADE 3: HEAVY MECHANICAL TURBINE SPIN-UP + METALLIC 3D DICE CLATTER
   * Fires when slamming `[ 🎲 SLAM TO IGNITE THRUSTER DICE ]`.
   */
  public playDiceTumbleBurst(): void {
    this.playSampledSfx('dice_tumble', 0.65);
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Plunger slam sub-thud + pneumatic release
    const slamOsc = ctx.createOscillator();
    const slamGain = ctx.createGain();
    slamOsc.type = 'sine';
    slamOsc.frequency.setValueAtTime(125, now);
    slamOsc.frequency.exponentialRampToValueAtTime(38, now + 0.2);
    slamGain.gain.setValueAtTime(0.28, now);
    slamGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    slamOsc.connect(slamGain);
    slamGain.connect(ctx.destination);
    slamOsc.start(now);
    slamOsc.stop(now + 0.23);

    this.triggerNoiseBurst(0.22, 'bandpass', 2800, 900, 0.12, 0.02, 2.2);

    // 2. Mechanical turbine spin-up whine (`140Hz -> 760Hz`)
    const turbOsc = ctx.createOscillator();
    const turbFilter = ctx.createBiquadFilter();
    const turbGain = ctx.createGain();
    turbOsc.type = 'sawtooth';
    turbOsc.frequency.setValueAtTime(140, now + 0.04);
    turbOsc.frequency.exponentialRampToValueAtTime(760, now + 0.68);
    turbFilter.type = 'bandpass';
    turbFilter.frequency.setValueAtTime(800, now + 0.04);
    turbFilter.frequency.exponentialRampToValueAtTime(2400, now + 0.68);
    turbGain.gain.setValueAtTime(0.001, now + 0.04);
    turbGain.gain.linearRampToValueAtTime(0.085, now + 0.18);
    turbGain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
    turbOsc.connect(turbFilter);
    turbFilter.connect(turbGain);
    turbGain.connect(ctx.destination);
    turbOsc.start(now + 0.04);
    turbOsc.stop(now + 0.74);

    // 3. Metallic titanium isometric dice clatter ticks
    for (let i = 0; i < 9; i++) {
      const t = now + i * 0.082;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(580 + i * 88, t);
      osc.frequency.exponentialRampToValueAtTime(1240 + i * 105, t + 0.05);

      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.065);
    }
  }

  /**
   * UPGRADE 3B: HOLOGRAPHIC LASER TRAJECTORY LOCK SEQUENCE
   * Plays rapid ascending holographic laser lock-on pips across the previewed path (`650ms`).
   */
  public playTrajectoryLaserLock(stepCount: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const count = Math.min(10, Math.max(1, stepCount));
    const spacing = Math.min(0.065, 0.48 / count);

    for (let i = 0; i < count; i++) {
      const t = now + i * spacing;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const hz = 660 * Math.pow(1.06, i);
      osc.frequency.setValueAtTime(hz, t);
      osc.frequency.exponentialRampToValueAtTime(hz * 1.18, t + 0.055);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.065);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.07);
    }
  }

  /**
   * UPGRADE 6: WEIGHTY PARABOLIC JETPACK HOP + MUSICAL ASCENDING PITCH CHIME + LANDING THUD
   * Each hop takes `450ms` arc + `160ms` settle:
   *   - Launch (`t = 0ms`): Hydraulic jetpack whoosh + ascending major-scale chime (`C -> D -> E -> F -> G -> A -> B -> C...`)
   *   - Landing (`t = 430ms`): Heavy metallic figurine pedestal landing thud on the 3D deck plate!
   */
  public playTokenHop(stepIndex: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // C Major / Lydian ascending scale frequencies (C5, D5, E5, F#5, G5, A5, B5, C6, D6, E6)
    const scale = [
      523.25, 587.33, 659.25, 739.99, 783.99, 880.0, 987.77, 1046.5, 1174.66, 1318.51
    ];
    const hz = scale[stepIndex % scale.length];

    // 1. Jetpack hydraulic launch whoosh (`0..240ms`)
    this.triggerNoiseBurst(0.22, 'bandpass', 950, 2600, 0.09, 0, 1.8);

    // 2. Musical ascending pitch chime (`0..280ms`)
    const chimeOsc = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    chimeOsc.type = 'triangle';
    chimeOsc.frequency.setValueAtTime(hz * 0.96, now);
    chimeOsc.frequency.exponentialRampToValueAtTime(hz, now + 0.06);
    chimeGain.gain.setValueAtTime(0.15, now);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    chimeOsc.connect(chimeGain);
    chimeGain.connect(ctx.destination);
    chimeOsc.start(now);
    chimeOsc.stop(now + 0.3);

    // 3. Heavy metallic pedestal landing thud when touching down at `t + 0.42s`
    const landOsc = ctx.createOscillator();
    const landGain = ctx.createGain();
    landOsc.type = 'sine';
    landOsc.frequency.setValueAtTime(118, now + 0.42);
    landOsc.frequency.exponentialRampToValueAtTime(42, now + 0.54);
    landGain.gain.setValueAtTime(0.22, now + 0.42);
    landGain.gain.exponentialRampToValueAtTime(0.001, now + 0.56);
    landOsc.connect(landGain);
    landGain.connect(ctx.destination);
    landOsc.start(now + 0.42);
    landOsc.stop(now + 0.57);
  }

  /**
   * UPGRADE 7: CINEMATIC CUTSCENE STINGER
   */
  public playCutsceneBannerSwoosh(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    this.triggerNoiseBurst(0.35, 'bandpass', 400, 2200, 0.14, 0, 1.5);

    const sub = ctx.createOscillator();
    const gain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(95, now);
    sub.frequency.exponentialRampToValueAtTime(38, now + 0.45);
    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    sub.connect(gain);
    gain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.5);
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
