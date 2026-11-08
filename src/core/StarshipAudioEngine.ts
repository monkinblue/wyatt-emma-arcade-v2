/**
 * src/core/StarshipAudioEngine.ts
 * -------------------------------
 * Mentor Note:
 * `StarshipAudioEngine` powers the studio-grade Space-Industrial acoustic landscape and
 * ElevenLabs `"Emily E.- Operator & Public Announcement"` PA voice announcements for
 * **STARSHIP UNICORN: ORBITAL TRIVIA** (`StarshipUnicornScene.ts`).
 *
 * Strictly Sampled ElevenLabs `.MP3` Space-Industrial Acoustics & PA Voice Announcements:
 *   1. **100% Silent Idle State**: Zero continuous background oscillators.
 *   2. **Studio-Grade ElevenLabs Space-Industrial `.MP3` Sound Effects**
 *      (`public/assets/sfx/starship/sfx_*.mp3`).
 *   3. **18 ElevenLabs `"Emily E.- Operator & Public Announcement"` PA Voice Clips**
 *      (`public/assets/sfx/starship/vo_*.mp3`) — zero browser `window.speechSynthesis` fallback!
 */

import { Howl } from 'howler';
import { AudioBus } from './AudioBus';

export type StarshipPaVoiceKey =
  | 'vo_mission_launch'
  | 'vo_turn_wyatt'
  | 'vo_turn_emma'
  | 'vo_turn_robert'
  | 'vo_turn_rita'
  | 'vo_turn_papa'
  | 'vo_turn_nana'
  | 'vo_turn_grandpa'
  | 'vo_turn_babci'
  | 'vo_turn_guest'
  | 'vo_turn_dreadbot'
  | 'vo_verdict_correct'
  | 'vo_verdict_wrong'
  | 'vo_red_alert'
  | 'vo_hypertube'
  | 'vo_turbocoil'
  | 'vo_cryovent'
  | 'vo_airdrop_incoming'
  | 'vo_victory';

export type StarshipVoiceKey =
  | StarshipPaVoiceKey
  | 'turn_robert'
  | 'turn_rita'
  | 'turn_wyatt'
  | 'turn_emma'
  | 'turn_papa'
  | 'turn_nana'
  | 'turn_grandpa'
  | 'turn_babci'
  | 'turn_guest'
  | 'turn_dreadbot'
  | 'welcome_title'
  | 'lobby_select'
  | 'launch_sequence'
  | 'overclock_engaged'
  | 'standard_thruster'
  | 'tile_wormhole'
  | 'tile_overclock'
  | 'tile_asteroid'
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
  | 'victory_guest'
  | 'victory_dreadbot';

export type StarshipIndustrialSfxKey =
  | 'sfx_lobby_latch'
  | 'sfx_space_elevator_launch'
  | 'sfx_drawer_servo'
  | 'sfx_switchgear_slam'
  | 'sfx_overclock_correct'
  | 'sfx_thruster_standard'
  | 'sfx_dice_plunger'
  | 'sfx_jetpack_hop'
  | 'sfx_shield_deflect'
  | 'sfx_trajectory_lock'
  | 'sfx_hypertube_warp'
  | 'sfx_turbocoil_boost'
  | 'sfx_cryovent_freeze'
  | 'sfx_meteor_shatter'
  | 'sfx_crate_open'
  | 'sfx_slingshot_boost'
  | 'sfx_red_alert_klaxon'
  | 'sfx_timer_expired'
  | 'sfx_answer_correct_fanfare'
  | 'sfx_answer_wrong_buzzer';

export type StarshipLegacySfxKey =
  | 'rocket_ignition'
  | 'hyperloop_whoosh'
  | 'overclock_chime'
  | 'asteroid_retro'
  | 'dice_tumble'
  | 'citadel_fanfare';

const INDUSTRIAL_SFX_KEYS: StarshipIndustrialSfxKey[] = [
  'sfx_lobby_latch',
  'sfx_space_elevator_launch',
  'sfx_drawer_servo',
  'sfx_switchgear_slam',
  'sfx_overclock_correct',
  'sfx_thruster_standard',
  'sfx_dice_plunger',
  'sfx_jetpack_hop',
  'sfx_shield_deflect',
  'sfx_trajectory_lock',
  'sfx_hypertube_warp',
  'sfx_turbocoil_boost',
  'sfx_cryovent_freeze',
  'sfx_meteor_shatter',
  'sfx_crate_open',
  'sfx_slingshot_boost',
  'sfx_red_alert_klaxon',
  'sfx_timer_expired',
  'sfx_answer_correct_fanfare',
  'sfx_answer_wrong_buzzer'
];

export const PA_VOICE_KEYS: StarshipPaVoiceKey[] = [
  'vo_mission_launch',
  'vo_turn_wyatt',
  'vo_turn_emma',
  'vo_turn_robert',
  'vo_turn_rita',
  'vo_turn_papa',
  'vo_turn_nana',
  'vo_turn_grandpa',
  'vo_turn_babci',
  'vo_turn_guest',
  'vo_turn_dreadbot',
  'vo_verdict_correct',
  'vo_verdict_wrong',
  'vo_red_alert',
  'vo_hypertube',
  'vo_turbocoil',
  'vo_cryovent',
  'vo_airdrop_incoming',
  'vo_victory'
];

const LEGACY_TO_PA_VOICE_MAP: Partial<Record<StarshipVoiceKey, StarshipPaVoiceKey>> = {
  launch_sequence: 'vo_mission_launch',
  turn_wyatt: 'vo_turn_wyatt',
  turn_emma: 'vo_turn_emma',
  turn_robert: 'vo_turn_robert',
  turn_rita: 'vo_turn_rita',
  turn_papa: 'vo_turn_papa',
  turn_nana: 'vo_turn_nana',
  turn_grandpa: 'vo_turn_grandpa',
  turn_babci: 'vo_turn_babci',
  turn_guest: 'vo_turn_guest',
  turn_dreadbot: 'vo_turn_dreadbot',
  overclock_engaged: 'vo_verdict_correct',
  standard_thruster: 'vo_verdict_wrong',
  tile_wormhole: 'vo_hypertube',
  tile_overclock: 'vo_turbocoil',
  tile_asteroid: 'vo_cryovent',
  victory_citadel: 'vo_victory',
  victory_wyatt: 'vo_victory',
  victory_emma: 'vo_victory',
  victory_robert: 'vo_victory',
  victory_rita: 'vo_victory',
  victory_papa: 'vo_victory',
  victory_nana: 'vo_victory',
  victory_grandpa: 'vo_victory',
  victory_babci: 'vo_victory',
  victory_guest: 'vo_victory',
  victory_dreadbot: 'vo_victory'
};

class StarshipAudioEngineImpl {
  private paVoiceHowls: Map<StarshipPaVoiceKey, Howl> = new Map();
  private kidClipHowls: Map<string, Howl> = new Map();
  private industrialHowls: Map<StarshipIndustrialSfxKey, Howl> = new Map();
  private legacySfxHowls: Map<StarshipLegacySfxKey, Howl> = new Map();
  private activeVoiceHowl: Howl | null = null;
  private lastHoverTimestamp = 0;
  private preloaded = false;

  /**
   * Preloads all ElevenLabs Space-Industrial `.mp3` SFX files and all 18 Emily E. PA Operator
   * `vo_*.mp3` voice files (`public/assets/sfx/starship/*.mp3`) via Howler for instant playback.
   */
  public preloadAllSfx(): void {
    if (this.preloaded) return;
    this.preloaded = true;

    for (const key of INDUSTRIAL_SFX_KEYS) {
      if (!this.industrialHowls.has(key)) {
        const howl = new Howl({
          src: [`/assets/sfx/starship/${key}.mp3`],
          volume: 0.9,
          preload: true
        });
        this.industrialHowls.set(key, howl);
      }
    }

    for (const voKey of PA_VOICE_KEYS) {
      if (!this.paVoiceHowls.has(voKey)) {
        const howl = new Howl({
          src: [`/assets/sfx/starship/${voKey}.mp3`],
          volume: 0.98,
          preload: true
        });
        this.paVoiceHowls.set(voKey, howl);
      }
    }
  }

  /**
   * Plays one of the studio-grade ElevenLabs `.mp3` Space-Industrial / Futuristic SFX clips
   * from `/assets/sfx/starship/<key>.mp3`.
   */
  public playIndustrialSfx(
    key: StarshipIndustrialSfxKey,
    volume = 0.9,
    rate = 1.0
  ): number | null {
    if (AudioBus.getMuted()) return null;
    this.preloadAllSfx();

    let howl = this.industrialHowls.get(key);
    if (!howl) {
      howl = new Howl({
        src: [`/assets/sfx/starship/${key}.mp3`],
        volume,
        preload: true
      });
      this.industrialHowls.set(key, howl);
    }

    const soundId = howl.play();
    howl.volume(volume, soundId);
    howl.rate(rate, soundId);
    return soundId;
  }

  /**
   * Plays an ElevenLabs `"Emily E.- Operator & Public Announcement"` PA voice clip
   * from `/assets/sfx/starship/<voKey>.mp3`.
   */
  public playPaVoice(voKey: StarshipPaVoiceKey, onEnd?: () => void): void {
    if (AudioBus.getMuted()) {
      if (onEnd) onEnd();
      return;
    }
    this.preloadAllSfx();
    this.stopAllVoice();

    let howl = this.paVoiceHowls.get(voKey);
    if (!howl) {
      howl = new Howl({
        src: [`/assets/sfx/starship/${voKey}.mp3`],
        volume: 0.98,
        preload: true
      });
      this.paVoiceHowls.set(voKey, howl);
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
    howl.volume(0.98);
    howl.play();
  }

  /**
   * Resolves any `StarshipVoiceKey` (either a direct `vo_*` key or a mapped event key)
   * and plays the corresponding Emily E. Starbase PA Operator `.mp3` clip.
   */
  public playVoice(key: StarshipVoiceKey, onEnd?: () => void): void {
    const resolvedPaKey: StarshipPaVoiceKey | undefined = key.startsWith('vo_')
      ? (key as StarshipPaVoiceKey)
      : LEGACY_TO_PA_VOICE_MAP[key];

    if (resolvedPaKey) {
      this.playPaVoice(resolvedPaKey, onEnd);
      return;
    }

    if (onEnd) onEnd();
  }

  /**
   * Plays a Kid Question or Option `.mp3` clip (`/assets/sfx/starship/kids/kid_XX_q.mp3`, `_a.mp3`, `_b.mp3`)
   * and invokes `onEnd` when playback finishes (or if muted / failed to load).
   */
  public playKidClipUrl(url: string, onEnd?: () => void): void {
    if (AudioBus.getMuted()) {
      if (onEnd) onEnd();
      return;
    }
    this.stopAllVoice();

    let howl = this.kidClipHowls.get(url);
    if (!howl) {
      howl = new Howl({
        src: [url],
        volume: 0.98,
        preload: true
      });
      this.kidClipHowls.set(url, howl);
    }

    this.activeVoiceHowl = howl;
    let completed = false;
    const fireOnce = () => {
      if (completed) return;
      completed = true;
      if (this.activeVoiceHowl === howl) {
        this.activeVoiceHowl = null;
      }
      if (onEnd) onEnd();
    };

    howl.off('end');
    howl.off('loaderror');
    howl.off('playerror');
    howl.once('end', fireOnce);
    howl.once('loaderror', fireOnce);
    howl.once('playerror', fireOnce);

    howl.volume(0.98);
    howl.play();
  }

  public stopAllVoice(): void {
    if (this.activeVoiceHowl) {
      this.activeVoiceHowl.off('end');
      this.activeVoiceHowl.stop();
      this.activeVoiceHowl = null;
    }
    this.paVoiceHowls.forEach((h) => {
      h.off('end');
      if (h.playing()) {
        h.stop();
      }
    });
    this.kidClipHowls.forEach((h) => {
      h.off('end');
      if (h.playing()) {
        h.stop();
      }
    });
  }

  public stopVoice(): void {
    this.stopAllVoice();
  }

  /**
   * Trivia questions are strictly un-voiced so the family can read questions aloud
   * without any TTS or PA voice talking over them.
   */
  public speakQuestionText(_text: string): void {
    // Intentionally silent — zero browser speechSynthesis fallback.
  }

  /**
   * Plays a sampled special-event SFX clip (`/assets/audio/starship/sfx/<key>.mp3`).
   */
  public playSampledSfx(key: StarshipLegacySfxKey, volume = 0.78): void {
    if (AudioBus.getMuted()) return;
    let howl = this.legacySfxHowls.get(key);
    if (!howl) {
      howl = new Howl({
        src: [`/assets/audio/starship/sfx/${key}.mp3`],
        volume,
        preload: true
      });
      this.legacySfxHowls.set(key, howl);
    }
    howl.volume(volume);
    howl.play();
  }

  /**
   * 100% SILENT IDLE STATE: Zero continuous background hum oscillators.
   */
  public startAmbientStarbasePad(): void {}
  public stopAmbientStarbasePad(): void {}

  // ===========================================================================
  // REAL ELEVENLABS `.MP3` SPACE-INDUSTRIAL SFX TRIGGERS (ZERO SYNTH BOOPS!)
  // ===========================================================================

  public playHoverMicroClick(): void {
    const nowMs = Date.now();
    if (nowMs - this.lastHoverTimestamp < 65) return;
    this.lastHoverTimestamp = nowMs;
    this.playIndustrialSfx('sfx_lobby_latch', 0.16, 1.85);
  }

  public playUiChirp(_startHz = 840, _endHz = 1320): void {
    this.playIndustrialSfx('sfx_lobby_latch', 0.32, 1.55);
  }

  public playRockerSwitchClick(upward = true): void {
    this.playIndustrialSfx('sfx_lobby_latch', 0.68, upward ? 1.18 : 1.06);
  }

  public playLobbyToggle(selected: boolean, slotIndex = 0): void {
    const rate = selected ? 0.96 + (slotIndex % 6) * 0.02 : 0.88;
    this.playIndustrialSfx('sfx_lobby_latch', 0.92, rate);
  }

  public playLaunchIgnition(): void {
    this.playIndustrialSfx('sfx_space_elevator_launch', 0.98, 1.0);
  }

  public playDrawerSlide(opening: boolean): void {
    this.playIndustrialSfx('sfx_drawer_servo', 0.9, opening ? 1.0 : 0.92);
  }

  public playPadLockIn(optionIndex: number): void {
    const rate = 0.96 + (optionIndex % 4) * 0.03;
    this.playIndustrialSfx('sfx_switchgear_slam', 0.95, rate);
  }

  public playOverclockFanfare(): void {
    this.playIndustrialSfx('sfx_overclock_correct', 0.96, 1.0);
  }

  public playStandardThrusterTone(): void {
    this.playIndustrialSfx('sfx_thruster_standard', 0.92, 1.0);
  }

  public playTriviaRevealShimmer(): void {
    this.playDrawerSlide(true);
  }

  public playDiceTumbleBurst(): void {
    this.playIndustrialSfx('sfx_dice_plunger', 0.96, 1.0);
  }

  /**
   * Holographic Laser Trajectory Lock:
   * Preserves the exact beloved path-light thud (`sfx_trajectory_lock.mp3`) untouched!
   */
  public playTrajectoryLaserLock(_stepCount: number): void {
    this.playIndustrialSfx('sfx_trajectory_lock', 0.68, 1.12);
  }

  public playShieldDeflect(): void {
    this.playIndustrialSfx('sfx_shield_deflect', 0.94, 1.0);
  }

  public playTokenHop(stepIndex: number): void {
    const rate = 0.96 + (stepIndex % 5) * 0.022;
    this.playIndustrialSfx('sfx_jetpack_hop', 0.9, rate);
  }

  public playCutsceneBannerSwoosh(): void {
    this.playIndustrialSfx('sfx_drawer_servo', 0.82, 0.88);
  }

  public playWormholeWarp(): void {
    this.playIndustrialSfx('sfx_hypertube_warp', 0.96, 1.0);
  }

  public playHypertubeWarp(): void {
    this.playIndustrialSfx('sfx_hypertube_warp', 0.96, 1.0);
  }

  public playTurboCoilOverclock(): void {
    this.playIndustrialSfx('sfx_turbocoil_boost', 0.96, 1.0);
  }

  public playAsteroidRetro(): void {
    this.playIndustrialSfx('sfx_cryovent_freeze', 0.95, 1.0);
  }

  public playCryoVentFreeze(): void {
    this.playIndustrialSfx('sfx_cryovent_freeze', 0.95, 1.0);
  }

  public playMeteorShatter(): void {
    this.playIndustrialSfx('sfx_meteor_shatter', 0.96, 1.0);
  }

  public playMemoryCrystalChime(crystalIndex: number): void {
    const harmonicRates = [0.85, 1.0, 1.18, 1.34];
    const rate = harmonicRates[Math.abs(crystalIndex) % harmonicRates.length];
    this.playIndustrialSfx('sfx_trajectory_lock', 0.88, rate);
  }

  public playCrateOpen(): void {
    this.playIndustrialSfx('sfx_crate_open', 0.96, 1.0);
  }

  public playSlingshotBoost(): void {
    this.playIndustrialSfx('sfx_slingshot_boost', 0.96, 1.0);
  }

  public playRedAlertKlaxon(): void {
    this.playIndustrialSfx('sfx_red_alert_klaxon', 0.88, 1.0);
  }

  public stopRedAlertKlaxon(): void {
    const howl = this.industrialHowls.get('sfx_red_alert_klaxon');
    if (howl && howl.playing()) {
      howl.stop();
    }
  }

  public playTimerExpired(): void {
    this.stopRedAlertKlaxon();
    this.playIndustrialSfx('sfx_timer_expired', 0.92, 1.0);
  }

  public playAnswerCorrectFanfare(): void {
    this.playIndustrialSfx('sfx_answer_correct_fanfare', 0.96, 1.0);
  }

  public playAnswerWrongBuzzer(): void {
    this.playIndustrialSfx('sfx_answer_wrong_buzzer', 0.94, 1.0);
  }

  public playVictoryAnthem(): void {
    this.playSampledSfx('citadel_fanfare', 0.95);
    this.playIndustrialSfx('sfx_overclock_correct', 0.82, 0.96);
  }
}

export const StarshipAudio = new StarshipAudioEngineImpl();
