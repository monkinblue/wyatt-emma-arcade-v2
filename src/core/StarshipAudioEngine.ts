/**
 * src/core/StarshipAudioEngine.ts
 * -------------------------------
 * Mentor Note:
 * `StarshipAudioEngine` powers the Space-Industrial acoustic landscape for
 * **STARSHIP UNICORN: ORBITAL TRIVIA** (`StarshipUnicornScene.ts`).
 *
 * Strictly Space-Industrial Acoustics (ZERO 90s Arcade Boops):
 *   1. **100% Silent Idle State**: Continuous background ambient oscillators are completely
 *      removed so living-room TV / tablet speakers are dead-silent when idle.
 *   2. **Multi-Layered Industrial Synthesis**: Every sound is synthesized from:
 *      - **Sub-Bass Mechanical Mass (45–90Hz punch)**
 *      - **Metallic FM Solenoid / Bolt Clatter**
 *      - **Bandpass / Highpass Filtered White-Noise Pneumatic Steam / Hydraulic Hiss**
 *   3. **Pre-Generated ElevenLabs Mission Control Voice & Sampled Sci-Fi SFX MP3s**
 *      (`assets/audio/starship/voice/*.mp3` and `assets/audio/starship/sfx/*.mp3`).
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
  private lastWelcomeTimestamp = 0;
  private lastHoverTimestamp = 0;

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
   * Automatically stops any previous announcer clip and guards `welcome_title` against double-triggering.
   */
  public playVoice(key: StarshipVoiceKey, onEnd?: () => void): void {
    const nowMs = Date.now();
    if (key === 'welcome_title') {
      if (nowMs - this.lastWelcomeTimestamp < 3500) {
        return;
      }
      this.lastWelcomeTimestamp = nowMs;
    }

    this.stopAllVoice();

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

  public stopAllVoice(): void {
    if (this.activeVoiceHowl) {
      this.activeVoiceHowl.stop();
      this.activeVoiceHowl = null;
    }
    this.voiceHowls.forEach((h) => {
      if (h.playing()) {
        h.stop();
      }
    });
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public stopVoice(): void {
    this.stopAllVoice();
  }

  /**
   * Reads a trivia question prompt aloud if the family taps the Read-Aloud cockpit switch.
   */
  public speakQuestionText(text: string): void {
    this.stopAllVoice();
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
   * 100% SILENT IDLE STATE: No continuous OscillatorNode drone or background hum.
   */
  public startAmbientStarbasePad(): void {}
  public stopAmbientStarbasePad(): void {}

  // ===========================================================================
  // CORE INDUSTRIAL ACOUSTIC BUILDING BLOCKS
  //   1. Sub-Bass Mechanical Mass (45–90Hz punch)
  //   2. Metallic FM Solenoid / Bolt Clatter
  //   3. Bandpass / Highpass Filtered White-Noise Pneumatic Steam / Hydraulic Hiss
  // ===========================================================================

  private triggerSubBassMass(
    startHz: number,
    endHz: number,
    durationSec: number,
    peakGain: number,
    delaySec = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delaySec;

    const sub = ctx.createOscillator();
    const gain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(Math.max(24, startHz), now);
    sub.frequency.exponentialRampToValueAtTime(Math.max(20, endHz), now + durationSec);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + Math.min(0.012, durationSec * 0.18));
    gain.gain.exponentialRampToValueAtTime(0.0008, now + durationSec);

    sub.connect(gain);
    gain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + durationSec + 0.015);
  }

  private triggerFmSolenoidBolt(
    carrierStartHz: number,
    carrierEndHz: number,
    modFreqHz: number,
    modDepthHz: number,
    durationSec: number,
    peakGain: number,
    delaySec = 0,
    filterHz = 1800
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delaySec;

    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const outGain = ctx.createGain();

    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(Math.max(30, carrierStartHz), now);
    carrier.frequency.exponentialRampToValueAtTime(Math.max(24, carrierEndHz), now + durationSec);

    modulator.type = 'square';
    modulator.frequency.setValueAtTime(modFreqHz, now);
    modGain.gain.setValueAtTime(modDepthHz, now);
    modGain.gain.exponentialRampToValueAtTime(1, now + durationSec);

    filter.type = 'lowpass';
    filter.Q.setValueAtTime(2.2, now);
    filter.frequency.setValueAtTime(filterHz, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(180, filterHz * 0.28), now + durationSec);

    outGain.gain.setValueAtTime(0.001, now);
    outGain.gain.linearRampToValueAtTime(peakGain, now + Math.min(0.008, durationSec * 0.15));
    outGain.gain.exponentialRampToValueAtTime(0.0008, now + durationSec);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(filter);
    filter.connect(outGain);
    outGain.connect(ctx.destination);

    modulator.start(now);
    carrier.start(now);
    modulator.stop(now + durationSec + 0.015);
    carrier.stop(now + durationSec + 0.015);
  }

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
    gain.gain.linearRampToValueAtTime(peakGain, now + Math.min(0.018, durationSec * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0008, now + durationSec);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    src.start(now);
    src.stop(now + durationSec + 0.02);
  }

  // ===========================================================================
  // 1. BUTTON HOVER: MAGNETIC RELAY MICRO-CLICK + TACTICAL SAFETY TICK (15ms)
  // ===========================================================================

  /**
   * Subtle crisp magnetic relay micro-click + tactical firearm safety tick (`15ms` transient, zero musical boop).
   */
  public playHoverMicroClick(): void {
    const nowMs = Date.now();
    if (nowMs - this.lastHoverTimestamp < 45) return;
    this.lastHoverTimestamp = nowMs;

    // 78Hz -> 46Hz micro mechanical mass impulse (16ms)
    this.triggerSubBassMass(78, 46, 0.016, 0.09, 0);
    // 15ms metallic FM solenoid safety tick
    this.triggerFmSolenoidBolt(680, 190, 940, 420, 0.015, 0.08, 0, 2600);
    // 15ms highpass pneumatic micro-transient
    this.triggerNoiseBurst(0.015, 'highpass', 3400, 1800, 0.06, 0, 3.2);
  }

  /**
   * Mechanical solenoid ratchet tick (replaces any legacy UI chirp, e.g. on supply roulette wheel).
   */
  public playUiChirp(_startHz = 840, _endHz = 1320): void {
    this.triggerSubBassMass(82, 48, 0.025, 0.14, 0);
    this.triggerFmSolenoidBolt(420, 115, 680, 320, 0.024, 0.12, 0, 2200);
    this.triggerNoiseBurst(0.022, 'bandpass', 2800, 1200, 0.075, 0, 3.5);
  }

  // ===========================================================================
  // 2. COCKPIT ROCKER SWITCHES: 2-STAGE ANODIZED ALUMINUM TOGGLE (`KLACK-CLACK`)
  // ===========================================================================

  /**
   * Crisp 2-stage anodized aluminum cockpit toggle switch snap (`KLACK-CLACK`).
   */
  public playRockerSwitchClick(upward = true): void {
    // Stage 1: Detent release (`KLACK`, t = 0.00s)
    this.triggerSubBassMass(86, 44, 0.055, 0.24, 0);
    this.triggerFmSolenoidBolt(upward ? 320 : 260, 74, 540, 280, 0.036, 0.18, 0, 2100);
    this.triggerNoiseBurst(0.032, 'highpass', 2600, 1200, 0.09, 0, 2.8);

    // Stage 2: Anodized aluminum housing lock (`CLACK`, t = 0.038s)
    this.triggerSubBassMass(72, 38, 0.07, 0.22, 0.038);
    this.triggerFmSolenoidBolt(upward ? 440 : 210, upward ? 110 : 58, 720, 360, 0.045, 0.19, 0.038, 2400);
    this.triggerNoiseBurst(0.08, 'bandpass', 1900, 620, 0.08, 0.042, 2.2);
  }

  // ===========================================================================
  // 3. LOBBY CARD & MODE SELECTION: SATISFACTORY SPACE-ELEVATOR LATCH
  // ===========================================================================

  /**
   * Heavy Satisfactory Space-Elevator Latch:
   * Deep pneumatic piston thud + metallic bolt sliding into steel housing + short compressed-air release (`Psssh!`).
   */
  public playLobbyToggle(selected: boolean, slotIndex = 0): void {
    const offsetHz = (slotIndex % 6) * 12;

    // 1. Sub-bass pneumatic piston thud (88Hz -> 42Hz)
    this.triggerSubBassMass(selected ? 88 : 74, 42, 0.22, 0.36, 0);

    // 2. Metallic bolt sliding into steel housing (2-stage FM solenoid slide + lock)
    this.triggerFmSolenoidBolt(
      selected ? 240 + offsetHz : 195,
      selected ? 64 : 48,
      380 + offsetHz,
      260,
      0.095,
      0.24,
      0.01,
      1650
    );
    this.triggerFmSolenoidBolt(
      selected ? 360 + offsetHz : 165,
      selected ? 92 : 52,
      520,
      310,
      0.085,
      0.21,
      0.065,
      1950
    );

    // 3. Short compressed-air release (`Psssh!`)
    this.triggerNoiseBurst(
      0.22,
      'bandpass',
      selected ? 2200 : 1600,
      540,
      0.15,
      0.04,
      1.8
    );
  }

  // ===========================================================================
  // 4. `INITIATE LAUNCH SEQUENCE` LEVER SLAM: 3-STAGE ORBITAL CLAMP RELEASE
  // ===========================================================================

  /**
   * Massive 3-Stage Orbital Clamp Release (`CLANK! -> CLANK! -> CLANK!`)
   * + sub-bass thruster ignition rumble + high-pressure cryogenic vent roar.
   */
  public playLaunchIgnition(): void {
    this.playSampledSfx('rocket_ignition', 0.68);
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Three Heavy Orbital Gantry Clamps Releasing in Sequence (`CLANK! -> CLANK! -> CLANK!`)
    const clampTimes = [0.0, 0.17, 0.34];
    clampTimes.forEach((offset, idx) => {
      this.triggerSubBassMass(90 - idx * 8, 36, 0.16, 0.38, offset);
      this.triggerFmSolenoidBolt(
        290 + idx * 30,
        58,
        460 + idx * 55,
        380,
        0.12,
        0.26,
        offset + 0.006,
        1900
      );
      this.triggerNoiseBurst(0.11, 'bandpass', 2400, 680, 0.13, offset + 0.018, 2.1);
    });

    // 2. Sub-Bass Thruster Ignition Rumble (45Hz -> 90Hz -> 52Hz)
    const spoolStart = now + 0.48;
    this.triggerSubBassMass(86, 44, 1.15, 0.36, 0.48);

    const engineVoices = [55, 82.5, 110];
    engineVoices.forEach((baseHz, i) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseHz, spoolStart + i * 0.025);
      osc.frequency.exponentialRampToValueAtTime(baseHz * 2.4, spoolStart + 1.05);
      filter.type = 'lowpass';
      filter.Q.setValueAtTime(2.0, spoolStart);
      filter.frequency.setValueAtTime(220, spoolStart);
      filter.frequency.exponentialRampToValueAtTime(2100, spoolStart + 0.98);
      gain.gain.setValueAtTime(0.001, spoolStart);
      gain.gain.linearRampToValueAtTime(0.095, spoolStart + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, spoolStart + 1.15);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(spoolStart + i * 0.025);
      osc.stop(spoolStart + 1.18);
    });

    // 3. High-Pressure Cryogenic Vent Roar
    this.triggerNoiseBurst(0.95, 'bandpass', 2800, 420, 0.2, 0.5, 1.3);
  }

  // ===========================================================================
  // 5. MOTORIZED TELEMETRY DRAWER SLIDE UP / SLIDE DOWN
  // ===========================================================================

  /**
   * Audible electric servo motor whir + hydraulic rail slide + heavy rubber-gasket dock lock clunk
   * every time the Motorized Telemetry Drawer slides up (`y: +250 -> 0`) or retracts (`y: 0 -> +250`).
   */
  public playDrawerSlide(opening: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const slideDur = 0.29;

    // 1. Initial release solenoid click + sub-bass rail engage
    this.triggerSubBassMass(82, 46, 0.08, 0.22, 0);
    this.triggerFmSolenoidBolt(260, 72, 420, 220, 0.045, 0.14, 0, 1600);

    // 2. Electric Servo Motor Whir (`0.01s .. 0.29s`)
    const servoCarrier = ctx.createOscillator();
    const servoMod = ctx.createOscillator();
    const servoModGain = ctx.createGain();
    const servoFilter = ctx.createBiquadFilter();
    const servoGain = ctx.createGain();

    servoCarrier.type = 'sawtooth';
    servoCarrier.frequency.setValueAtTime(opening ? 135 : 225, now + 0.01);
    servoCarrier.frequency.exponentialRampToValueAtTime(opening ? 230 : 125, now + slideDur);

    servoMod.type = 'triangle';
    servoMod.frequency.setValueAtTime(58, now + 0.01);
    servoModGain.gain.setValueAtTime(24, now + 0.01);

    servoFilter.type = 'bandpass';
    servoFilter.Q.setValueAtTime(3.2, now + 0.01);
    servoFilter.frequency.setValueAtTime(opening ? 520 : 860, now + 0.01);
    servoFilter.frequency.exponentialRampToValueAtTime(opening ? 880 : 480, now + slideDur);

    servoGain.gain.setValueAtTime(0.001, now + 0.01);
    servoGain.gain.linearRampToValueAtTime(0.095, now + 0.05);
    servoGain.gain.exponentialRampToValueAtTime(0.001, now + slideDur);

    servoMod.connect(servoModGain);
    servoModGain.connect(servoCarrier.frequency);
    servoCarrier.connect(servoFilter);
    servoFilter.connect(servoGain);
    servoGain.connect(ctx.destination);

    servoMod.start(now + 0.01);
    servoCarrier.start(now + 0.01);
    servoMod.stop(now + slideDur + 0.01);
    servoCarrier.stop(now + slideDur + 0.01);

    // 3. Hydraulic Linear Rail Slide Hiss
    this.triggerNoiseBurst(slideDur, 'bandpass', opening ? 1500 : 1900, 680, 0.09, 0.01, 2.4);

    // 4. Heavy Rubber-Gasket Dock Lock Clunk at end of travel (`t = 0.28s`)
    this.triggerSubBassMass(86, 36, 0.14, 0.3, 0.28);
    this.triggerFmSolenoidBolt(195, 52, 310, 180, 0.08, 0.18, 0.28, 1200);
    this.triggerNoiseBurst(0.09, 'bandpass', 1400, 460, 0.08, 0.29, 2.0);
  }

  // ===========================================================================
  // 6. SWITCHGEAR ANSWER BUTTON PRESS & LOCK-IN RESOLUTION
  // ===========================================================================

  /**
   * Heavy industrial breaker-switch slam + 750ms Geiger-counter / radar telemetry lock-in ticks!
   */
  public playPadLockIn(optionIndex: number): void {
    // 1. Heavy Industrial Breaker-Switch Slam (`t = 0.00s`)
    this.triggerSubBassMass(90, 36, 0.22, 0.36, 0);
    this.triggerFmSolenoidBolt(
      260 + optionIndex * 22,
      58,
      440,
      320,
      0.11,
      0.24,
      0.008,
      1850
    );
    this.triggerFmSolenoidBolt(380, 88, 620, 290, 0.075, 0.18, 0.055, 2100);
    this.triggerNoiseBurst(0.22, 'bandpass', 2800, 680, 0.14, 0.025, 1.9);

    // 2. 750ms Geiger-Counter / Radar Telemetry Lock-In Ticks (8 crisp electromagnetic relay ticks)
    const tickOffsets = [0.09, 0.175, 0.26, 0.345, 0.43, 0.515, 0.6, 0.685];
    tickOffsets.forEach((offset, idx) => {
      const accel = 1 + idx * 0.08;
      this.triggerSubBassMass(74, 45, 0.024, 0.12, offset);
      this.triggerFmSolenoidBolt(
        480 * accel,
        140,
        820 * accel,
        390,
        0.02,
        0.1,
        offset,
        2800
      );
      this.triggerNoiseBurst(0.018, 'highpass', 3200, 1600, 0.065, offset, 3.5);
    });
  }

  /**
   * Correct Answer (`OVERCLOCK ENGAGED`):
   * FICSIT Power-Grid Turbine Spin-Up + Dual-Afterburner Plasma Ignition roar + resonant harmonic steel chord!
   */
  public playOverclockFanfare(): void {
    this.playSampledSfx('overclock_chime', 0.62);
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Sub-bass afterburner ignition punch (88Hz -> 42Hz)
    this.triggerSubBassMass(88, 42, 0.45, 0.36, 0);
    this.triggerFmSolenoidBolt(310, 74, 480, 320, 0.09, 0.22, 0, 2000);

    // 2. FICSIT Power-Grid Turbine Spin-Up + Resonant Harmonic Steel Chord (110Hz, 165Hz, 220Hz, 330Hz)
    const steelHarmonics = [110, 165, 220, 330];
    steelHarmonics.forEach((hz, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(hz * 0.65, now + idx * 0.025);
      osc.frequency.exponentialRampToValueAtTime(hz, now + 0.24 + idx * 0.02);

      filter.type = 'lowpass';
      filter.Q.setValueAtTime(3.0, now);
      filter.frequency.setValueAtTime(340, now);
      filter.frequency.exponentialRampToValueAtTime(2600, now + 0.38);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.095, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.68);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.025);
      osc.stop(now + 0.7);
    });

    // 3. Dual-Afterburner Plasma Ignition Roar
    this.triggerNoiseBurst(0.52, 'bandpass', 2400, 580, 0.17, 0.03, 1.6);
  }

  /**
   * Standard Answer (`SINGLE THRUSTER`):
   * Pneumatic pressure-valve release hiss + heavy auxiliary piston lock.
   */
  public playStandardThrusterTone(): void {
    // 1. Heavy auxiliary piston lock (2-stage mechanical bolt + sub-bass mass)
    this.triggerSubBassMass(84, 40, 0.22, 0.32, 0);
    this.triggerFmSolenoidBolt(220, 58, 360, 240, 0.09, 0.22, 0.005, 1600);
    this.triggerSubBassMass(76, 36, 0.18, 0.26, 0.11);
    this.triggerFmSolenoidBolt(280, 68, 440, 260, 0.085, 0.2, 0.11, 1800);

    // 2. Pneumatic pressure-valve release hiss (`Pssshhh!`)
    this.triggerNoiseBurst(0.34, 'bandpass', 2500, 560, 0.16, 0.03, 1.7);
    this.triggerNoiseBurst(0.24, 'highpass', 3600, 1400, 0.08, 0.06, 2.4);
  }

  public playTriviaRevealShimmer(): void {
    this.playDrawerSlide(true);
  }

  // ===========================================================================
  // 7. DICE IGNITION PLUNGER, TITANIUM DICE CLATTER & LASER TARGET-LOCK SWEEP
  // ===========================================================================

  /**
   * Heavy spring-loaded blast-plunger slam + rotating centrifuge turbine whine
   * + realistic heavy metallic titanium dice clattering across a steel deck plate!
   */
  public playDiceTumbleBurst(): void {
    this.playSampledSfx('dice_tumble', 0.65);
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Spring-loaded blast-plunger slam (sub-bass impact + FM spring release + pneumatic blast)
    this.triggerSubBassMass(90, 34, 0.22, 0.36, 0);
    this.triggerFmSolenoidBolt(280, 62, 520, 340, 0.11, 0.25, 0.008, 1900);
    this.triggerNoiseBurst(0.22, 'bandpass', 2600, 720, 0.14, 0.02, 2.0);

    // 2. Rotating centrifuge turbine whine (`95Hz -> 420Hz`)
    const turbOsc = ctx.createOscillator();
    const turbFilter = ctx.createBiquadFilter();
    const turbGain = ctx.createGain();
    turbOsc.type = 'sawtooth';
    turbOsc.frequency.setValueAtTime(95, now + 0.035);
    turbOsc.frequency.exponentialRampToValueAtTime(420, now + 0.66);
    turbFilter.type = 'bandpass';
    turbFilter.Q.setValueAtTime(2.6, now + 0.035);
    turbFilter.frequency.setValueAtTime(480, now + 0.035);
    turbFilter.frequency.exponentialRampToValueAtTime(1950, now + 0.66);
    turbGain.gain.setValueAtTime(0.001, now + 0.035);
    turbGain.gain.linearRampToValueAtTime(0.09, now + 0.16);
    turbGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    turbOsc.connect(turbFilter);
    turbFilter.connect(turbGain);
    turbGain.connect(ctx.destination);
    turbOsc.start(now + 0.035);
    turbOsc.stop(now + 0.72);

    // 3. Heavy metallic titanium dice clattering across a steel deck plate (9 physical impacts)
    for (let i = 0; i < 9; i++) {
      const offset = 0.04 + i * 0.076;
      const energy = Math.max(0.35, 1 - i * 0.07);
      // Steel deck plate thud (85Hz -> 44Hz)
      this.triggerSubBassMass(85, 44, 0.045, 0.18 * energy, offset);
      // Inharmonic FM titanium cube impact on steel
      this.triggerFmSolenoidBolt(
        390 + (i % 3) * 85,
        95 + (i % 2) * 30,
        920 + i * 65,
        540 * energy,
        0.042,
        0.16 * energy,
        offset,
        2600
      );
      // Sharp metallic contact transient
      this.triggerNoiseBurst(0.025, 'highpass', 3000, 1400, 0.07 * energy, offset, 3.0);
    }
  }

  /**
   * Holographic Laser Target-Lock Sweep when the trajectory line illuminates!
   */
  public playTrajectoryLaserLock(stepCount: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Sub-bass capacitor charge thud
    this.triggerSubBassMass(82, 45, 0.24, 0.26, 0);

    // 2. Electromagnetic holographic beam sweep (`160Hz -> 620Hz` filtered sawtooth)
    const sweepOsc = ctx.createOscillator();
    const sweepFilter = ctx.createBiquadFilter();
    const sweepGain = ctx.createGain();
    sweepOsc.type = 'sawtooth';
    sweepOsc.frequency.setValueAtTime(160, now);
    sweepOsc.frequency.exponentialRampToValueAtTime(620, now + 0.46);
    sweepFilter.type = 'bandpass';
    sweepFilter.Q.setValueAtTime(3.8, now);
    sweepFilter.frequency.setValueAtTime(600, now);
    sweepFilter.frequency.exponentialRampToValueAtTime(2600, now + 0.46);
    sweepGain.gain.setValueAtTime(0.001, now);
    sweepGain.gain.linearRampToValueAtTime(0.085, now + 0.08);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    sweepOsc.connect(sweepFilter);
    sweepFilter.connect(sweepGain);
    sweepGain.connect(ctx.destination);
    sweepOsc.start(now);
    sweepOsc.stop(now + 0.5);

    // 3. Rapid relay target-acquisition clicks along the trajectory pads + final magnetic clamp lock
    const count = Math.min(10, Math.max(1, stepCount));
    const spacing = Math.min(0.055, 0.42 / count);
    for (let i = 0; i < count; i++) {
      const offset = i * spacing;
      const isFinalLock = i === count - 1;
      this.triggerSubBassMass(isFinalLock ? 88 : 72, 42, isFinalLock ? 0.11 : 0.03, isFinalLock ? 0.26 : 0.12, offset);
      this.triggerFmSolenoidBolt(
        isFinalLock ? 340 : 520,
        isFinalLock ? 68 : 140,
        isFinalLock ? 580 : 880,
        360,
        isFinalLock ? 0.085 : 0.024,
        isFinalLock ? 0.2 : 0.1,
        offset,
        2400
      );
      this.triggerNoiseBurst(
        isFinalLock ? 0.12 : 0.02,
        'bandpass',
        2600,
        740,
        isFinalLock ? 0.11 : 0.05,
        offset,
        2.5
      );
    }
  }

  // ===========================================================================
  // 8. BOARD PIECE MOVEMENT: SPACEX RCS COLD-GAS THRUSTER HOP PHYSICS
  //    (ZERO MUSICAL SCALE BOOPS!)
  // ===========================================================================

  /**
   * True SpaceX RCS Cold-Gas Thruster Hop Physics (`450ms` flight + landing):
   * - Launch (`t = 0ms`): Pressurized nitrogen thruster burst (`PFFFT-WHOOSH!`) + mechanical servo knee push.
   * - Mid-Air (`t = 110..390ms`): Brief Doppler plasma hum.
   * - Pad Landing (`t = 440ms`): Heavy magnetic boot clank onto steel conveyor grating (`THUD-CLANK!`)
   *   + hydraulic shock-absorber compression hiss!
   */
  public playTokenHop(_stepIndex: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // --- A. LAUNCH (t = 0.00s): Pressurized Nitrogen RCS Burst (`PFFFT-WHOOSH!`) + Servo Knee Push ---
    this.triggerSubBassMass(78, 44, 0.11, 0.24, 0);
    // Crisp nitrogen solenoid valve crack (`PFFFT`)
    this.triggerFmSolenoidBolt(340, 88, 620, 310, 0.038, 0.15, 0, 2100);
    this.triggerNoiseBurst(0.045, 'highpass', 3400, 1500, 0.13, 0, 2.8);
    // Main cold-gas thruster exhaust (`WHOOSH!`)
    this.triggerNoiseBurst(0.23, 'bandpass', 1950, 540, 0.15, 0.02, 1.7);
    // Mechanical servo knee push (`125Hz -> 215Hz`)
    this.triggerFmSolenoidBolt(125, 215, 90, 45, 0.12, 0.1, 0.015, 950);

    // --- B. MID-AIR (t = 0.11s .. 0.39s): Brief Doppler Plasma Hum ---
    const dopplerOsc = ctx.createOscillator();
    const dopplerFilter = ctx.createBiquadFilter();
    const dopplerGain = ctx.createGain();
    dopplerOsc.type = 'sawtooth';
    dopplerOsc.frequency.setValueAtTime(74, now + 0.11);
    dopplerOsc.frequency.linearRampToValueAtTime(108, now + 0.24);
    dopplerOsc.frequency.linearRampToValueAtTime(66, now + 0.39);
    dopplerFilter.type = 'lowpass';
    dopplerFilter.frequency.setValueAtTime(290, now + 0.11);
    dopplerGain.gain.setValueAtTime(0.001, now + 0.11);
    dopplerGain.gain.linearRampToValueAtTime(0.065, now + 0.22);
    dopplerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    dopplerOsc.connect(dopplerFilter);
    dopplerFilter.connect(dopplerGain);
    dopplerGain.connect(ctx.destination);
    dopplerOsc.start(now + 0.11);
    dopplerOsc.stop(now + 0.41);

    // --- C. PAD LANDING (t = 0.44s): Heavy Magnetic Boot Clank (`THUD-CLANK!`) + Shock-Absorber Hiss ---
    const landTime = 0.44;
    // Sub-bass mechanical mass landing punch (88Hz -> 35Hz)
    this.triggerSubBassMass(88, 35, 0.15, 0.34, landTime);
    // Magnetic boot clank onto steel conveyor grating (`THUD-CLANK!`)
    this.triggerFmSolenoidBolt(255, 56, 460, 340, 0.085, 0.23, landTime + 0.005, 1850);
    this.triggerFmSolenoidBolt(390, 82, 710, 380, 0.065, 0.18, landTime + 0.032, 2200);
    // Hydraulic shock-absorber compression hiss (`Psssh!`)
    this.triggerNoiseBurst(0.16, 'bandpass', 2200, 520, 0.13, landTime + 0.025, 1.9);
  }

  // ===========================================================================
  // 9. SPECIAL PADS & CUTSCENES: HYPER-TUBE, TURBO COIL, CRYO VENT, PRISM CATAPULT
  // ===========================================================================

  /**
   * Cutscene bulkhead seal + pneumatic pressure release.
   */
  public playCutsceneBannerSwoosh(): void {
    this.triggerSubBassMass(90, 36, 0.42, 0.32, 0);
    this.triggerFmSolenoidBolt(240, 54, 380, 260, 0.11, 0.2, 0.01, 1600);
    this.triggerNoiseBurst(0.38, 'bandpass', 1800, 480, 0.15, 0.02, 1.5);
  }

  /**
   * `HYPER-TUBE` (`+5` Warp): Deep magnetic coil gun discharge + vacuum tube whoosh!
   */
  public playWormholeWarp(): void {
    this.playSampledSfx('hyperloop_whoosh', 0.7);
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Deep magnetic coil gun discharge (90Hz -> 30Hz sub-cannon + FM coil discharge)
    this.triggerSubBassMass(90, 30, 0.48, 0.38, 0);
    this.triggerFmSolenoidBolt(380, 62, 640, 480, 0.16, 0.26, 0.005, 2400);

    // 2. Vacuum tube magnetic acceleration sweep
    const coilOsc = ctx.createOscillator();
    const coilFilter = ctx.createBiquadFilter();
    const coilGain = ctx.createGain();
    coilOsc.type = 'sawtooth';
    coilOsc.frequency.setValueAtTime(72, now + 0.04);
    coilOsc.frequency.exponentialRampToValueAtTime(340, now + 0.36);
    coilOsc.frequency.exponentialRampToValueAtTime(88, now + 0.68);
    coilFilter.type = 'bandpass';
    coilFilter.Q.setValueAtTime(2.5, now + 0.04);
    coilFilter.frequency.setValueAtTime(320, now + 0.04);
    coilFilter.frequency.exponentialRampToValueAtTime(2200, now + 0.36);
    coilFilter.frequency.exponentialRampToValueAtTime(420, now + 0.68);
    coilGain.gain.setValueAtTime(0.001, now + 0.04);
    coilGain.gain.linearRampToValueAtTime(0.14, now + 0.18);
    coilGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    coilOsc.connect(coilFilter);
    coilFilter.connect(coilGain);
    coilGain.connect(ctx.destination);
    coilOsc.start(now + 0.04);
    coilOsc.stop(now + 0.72);

    // 3. Vacuum tube air-column whoosh
    this.triggerNoiseBurst(0.65, 'bandpass', 2400, 380, 0.18, 0.03, 1.4);
  }

  /**
   * `TURBO COIL` (`+3` Overclock): High-voltage transformer arc + supercharger turbine scream!
   */
  public playTurboCoilOverclock(): void {
    this.playSampledSfx('overclock_chime', 0.6);
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. High-voltage transformer arc (sub-bass 60Hz hum punch + rapid electrical arc snaps)
    this.triggerSubBassMass(86, 42, 0.42, 0.35, 0);
    const arcTimes = [0.0, 0.055, 0.11, 0.17];
    arcTimes.forEach((tOff, i) => {
      this.triggerFmSolenoidBolt(420 + i * 90, 95, 980, 620, 0.048, 0.22, tOff, 3200);
      this.triggerNoiseBurst(0.045, 'highpass', 3200, 1200, 0.12, tOff, 2.8);
    });

    // 2. Supercharger turbine scream (`110Hz -> 680Hz`)
    const scOsc = ctx.createOscillator();
    const scFilter = ctx.createBiquadFilter();
    const scGain = ctx.createGain();
    scOsc.type = 'sawtooth';
    scOsc.frequency.setValueAtTime(110, now + 0.08);
    scOsc.frequency.exponentialRampToValueAtTime(680, now + 0.65);
    scFilter.type = 'bandpass';
    scFilter.Q.setValueAtTime(3.0, now + 0.08);
    scFilter.frequency.setValueAtTime(480, now + 0.08);
    scFilter.frequency.exponentialRampToValueAtTime(2800, now + 0.65);
    scGain.gain.setValueAtTime(0.001, now + 0.08);
    scGain.gain.linearRampToValueAtTime(0.12, now + 0.24);
    scGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    scOsc.connect(scFilter);
    scFilter.connect(scGain);
    scGain.connect(ctx.destination);
    scOsc.start(now + 0.08);
    scOsc.stop(now + 0.72);

    this.triggerNoiseBurst(0.48, 'bandpass', 2600, 680, 0.16, 0.12, 1.6);
  }

  /**
   * `CRYO VENT` (`-2` Well): Freezing liquid-nitrogen pipe burst + metallic hull groan!
   */
  public playAsteroidRetro(): void {
    this.playSampledSfx('asteroid_retro', 0.65);
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Pipe rupture sub-bass impact + metallic valve fracture
    this.triggerSubBassMass(88, 32, 0.52, 0.36, 0);
    this.triggerFmSolenoidBolt(260, 48, 410, 320, 0.14, 0.24, 0, 1500);

    // 2. Freezing liquid-nitrogen pipe burst (explosive highpass + bandpass cryo-steam blast)
    this.triggerNoiseBurst(0.58, 'bandpass', 3400, 460, 0.2, 0.015, 1.4);
    this.triggerNoiseBurst(0.42, 'highpass', 4200, 1500, 0.11, 0.02, 2.2);

    // 3. Deep stressed metallic hull groan (`112Hz -> 44Hz` & `168Hz -> 62Hz`)
    const groanFreqs: Array<[number, number]> = [
      [112, 44],
      [168, 62]
    ];
    groanFreqs.forEach(([fStart, fEnd], idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(fStart, now + 0.06 + idx * 0.03);
      osc.frequency.exponentialRampToValueAtTime(fEnd, now + 0.64);
      filter.type = 'lowpass';
      filter.Q.setValueAtTime(3.4, now + 0.06);
      filter.frequency.setValueAtTime(420, now + 0.06);
      filter.frequency.exponentialRampToValueAtTime(140, now + 0.64);
      gain.gain.setValueAtTime(0.001, now + 0.06);
      gain.gain.linearRampToValueAtTime(0.11, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.68);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + 0.06 + idx * 0.03);
      osc.stop(now + 0.7);
    });
  }

  /**
   * `PRISM CATAPULT` (`+4` Escort): Heavy electromagnetic aircraft-carrier catapult launch roar!
   */
  public playPrismCatapultLaunch(): void {
    this.playSampledSfx('rocket_ignition', 0.62);
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Massive aircraft-carrier catapult holdback bar release (`CLANK-BOOM!`)
    this.triggerSubBassMass(90, 32, 0.55, 0.38, 0);
    this.triggerFmSolenoidBolt(320, 58, 540, 420, 0.14, 0.26, 0.005, 2100);
    this.triggerFmSolenoidBolt(460, 86, 720, 380, 0.1, 0.22, 0.065, 2400);

    // 2. Electromagnetic shuttle track acceleration roar (`65Hz -> 380Hz`)
    const shuttleOsc = ctx.createOscillator();
    const shuttleFilter = ctx.createBiquadFilter();
    const shuttleGain = ctx.createGain();
    shuttleOsc.type = 'sawtooth';
    shuttleOsc.frequency.setValueAtTime(65, now + 0.05);
    shuttleOsc.frequency.exponentialRampToValueAtTime(380, now + 0.68);
    shuttleFilter.type = 'lowpass';
    shuttleFilter.Q.setValueAtTime(2.6, now + 0.05);
    shuttleFilter.frequency.setValueAtTime(280, now + 0.05);
    shuttleFilter.frequency.exponentialRampToValueAtTime(2400, now + 0.68);
    shuttleGain.gain.setValueAtTime(0.001, now + 0.05);
    shuttleGain.gain.linearRampToValueAtTime(0.14, now + 0.22);
    shuttleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    shuttleOsc.connect(shuttleFilter);
    shuttleFilter.connect(shuttleGain);
    shuttleGain.connect(ctx.destination);
    shuttleOsc.start(now + 0.05);
    shuttleOsc.stop(now + 0.78);

    // 3. High-pressure steam catapult deck roar
    this.triggerNoiseBurst(0.72, 'bandpass', 2200, 440, 0.2, 0.04, 1.3);
  }

  /**
   * Galactic Unicorn Citadel Victory Sequence:
   * Orbital Docking Clamp Lock + Deep Sub-Bass Reactor Harmonics + Sampled Citadel Fanfare!
   */
  public playVictoryAnthem(): void {
    this.playSampledSfx('citadel_fanfare', 0.8);
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 2 heavy docking clamps + warm low-passed industrial reactor brass harmonic swell
    this.triggerSubBassMass(90, 34, 0.65, 0.36, 0);
    this.triggerFmSolenoidBolt(280, 62, 460, 340, 0.12, 0.24, 0.01, 1900);
    this.triggerNoiseBurst(0.55, 'bandpass', 2200, 480, 0.16, 0.04, 1.5);

    const reactorChord = [110, 164.81, 220, 277.18, 329.63];
    reactorChord.forEach((hz, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(hz, now + 0.12 + idx * 0.04);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(360, now + 0.12);
      filter.frequency.exponentialRampToValueAtTime(1800, now + 0.6);
      gain.gain.setValueAtTime(0.001, now + 0.12);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.32);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.45);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + 0.12 + idx * 0.04);
      osc.stop(now + 1.5);
    });
  }
}

export const StarshipAudio = new StarshipAudioEngineImpl();
