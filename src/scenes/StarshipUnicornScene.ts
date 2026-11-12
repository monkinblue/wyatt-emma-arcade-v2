/**
 * src/scenes/StarshipUnicornScene.ts
 * ----------------------------------
 * Mentor Note:
 * `StarshipUnicornScene` is the flagship Next-Gen 1080p/4K HD Living-Room TV Party Board Game
 * in Wyatt & Emma Arcade v2.0: **STARSHIP UNICORN: ORBITAL TRIVIA**.
 *
 * Major Showcase Upgrades:
 * 1. **100% Silent Idle Speaker State**: Zero continuous background hum oscillators.
 * 2. **Heavy Industrial FICSIT Switchgear Answer Pads & 750ms 2-Stage Lock-In Suspense**:
 *    3D beveled metallic switchgear buttons with corner hex-rivets, diagonal FICSIT hazard stripes,
 *    illuminated keycap badges (`[ A • RUBY ]`..`[ D • NEBULA ]`), physical `y + 5px` hydraulic
 *    depression, pneumatic latch SFX, and a 750ms sweeping amber scanner bar before reveal!
 * 3. **Tactile 3D Isometric Dice Ignition Console & 650ms Holographic Path Preview**:
 *    Centerpiece `[ 🎲 SLAM TO IGNITE THRUSTER DICE ]` plunger button, 3D-rendered isometric dice
 *    cubes, and a glowing holographic laser trajectory line illuminating the exact target pads!
 * 4. **Coherent 5-Sector 3D Isometric Biome Board**:
 *    Winding S-Curve & Spiral Orbital Expedition Map across 5 named sectors with rotating radar
 *    dishes, pulsing FICSIT orange plasma conduits, drifting crystal meteors, and 3D-extruded
 *    isometric landing platforms connected by animated directional energy bridges.
 * 5. **Standing 3D-Styled Player Figurine Miniatures**:
 *    Tall sculpted tabletop astronaut figurines standing on 3D tiered metallic thruster pedestals
 *    with upright armored exosuit portrait shields, glowing 3D crown/antenna crests, jetpack
 *    flame emitters, idle hover bob, and dynamic hop lean angles.
 * 6. **Slow, Weighty Movement Pacing (`450ms` parabolic hop + `160ms` settle, `800ms` post-landing)**
 *    & Live Rank Badges (`🥇 1ST`, `🥈 2ND`, `🥉 3RD`) + distance-to-Citadel readouts.
 * 7. **Widescreen Cinematic Cutscenes & 3 Interactive Random Mini-Challenges**:
 *    Full-screen letterbox cutscenes (`2.8–3.5s`) for special pads plus `☄️ METEOR SHIELD REFLEX`,
 *    `🎰 FICSIT SUPPLY DROP ROULETTE`, and `🦄 STARLIGHT CATCH-UP BOOST`!
 */

import Phaser from 'phaser';
import { ArcadeState } from '../core/ArcadeState';
import { AudioBus } from '../core/AudioBus';
import { Juice } from '../core/Juice';
import { StarshipAudio, StarshipVoiceKey } from '../core/StarshipAudioEngine';
import {
  ActiveTriviaQuestion,
  drawNextStarshipQuestion
} from '../data/starshipQuestionBank';

export type AstronautId =
  | 'robert'
  | 'rita'
  | 'wyatt'
  | 'emma'
  | 'papa'
  | 'nana'
  | 'grandpa'
  | 'babci'
  | 'guest'
  | 'dreadbot';

export type TriviaProfileTier = 'ADULT' | 'WYATT_4YO' | 'EMMA_3YO';

export type TriviaQuestionItem = ActiveTriviaQuestion;

export interface AstronautRosterSpec {
  id: AstronautId;
  name: string;
  callsign: string;
  roleTitle: string;
  tier: TriviaProfileTier;
  isAI?: boolean;
  suitColorHex: string;
  suitColorNum: number;
  turnVoice: StarshipVoiceKey;
  victoryVoice: StarshipVoiceKey;
}

export const ASTRONAUT_ROSTER: AstronautRosterSpec[] = [
  {
    id: 'wyatt',
    name: 'WYATT',
    callsign: 'ASTRO-RANGER WYATT',
    roleTitle: 'Emerald Bunny-Comms Ranger (Age 4)',
    tier: 'WYATT_4YO',
    suitColorHex: '#10b981',
    suitColorNum: 0x10b981,
    turnVoice: 'vo_turn_wyatt',
    victoryVoice: 'vo_victory'
  },
  {
    id: 'emma',
    name: 'EMMA',
    callsign: 'SPACE PRINCESS EMMA',
    roleTitle: 'Starlight Unicorn Specialist (Age 3)',
    tier: 'EMMA_3YO',
    suitColorHex: '#f472b6',
    suitColorNum: 0xf472b6,
    turnVoice: 'vo_turn_emma',
    victoryVoice: 'vo_victory'
  },
  {
    id: 'robert',
    name: 'ROBERT',
    callsign: 'COMMANDER ROBERT',
    roleTitle: 'FICSIT Mission Commander',
    tier: 'ADULT',
    suitColorHex: '#f59e0b',
    suitColorNum: 0xf59e0b,
    turnVoice: 'vo_turn_robert',
    victoryVoice: 'vo_victory'
  },
  {
    id: 'rita',
    name: 'RITA',
    callsign: 'FLIGHT DIRECTOR RITA',
    roleTitle: 'Starbase Flight Director',
    tier: 'ADULT',
    suitColorHex: '#38bdf8',
    suitColorNum: 0x38bdf8,
    turnVoice: 'vo_turn_rita',
    victoryVoice: 'vo_victory'
  },
  {
    id: 'papa',
    name: 'PAPA',
    callsign: 'CHIEF ENGINEER PAPA',
    roleTitle: 'Deep-Space Chief Engineer',
    tier: 'ADULT',
    suitColorHex: '#60a5fa',
    suitColorNum: 0x60a5fa,
    turnVoice: 'vo_turn_papa',
    victoryVoice: 'vo_victory'
  },
  {
    id: 'nana',
    name: 'NANA',
    callsign: "SHIP'S COUNSELOR NANA",
    roleTitle: "Ship's Counselor",
    tier: 'ADULT',
    suitColorHex: '#7dd3fc',
    suitColorNum: 0x7dd3fc,
    turnVoice: 'vo_turn_nana',
    victoryVoice: 'vo_victory'
  },
  {
    id: 'grandpa',
    name: 'GRANDPA',
    callsign: 'FLEET ADMIRAL GRANDPA',
    roleTitle: 'Starfleet Orbital Admiral',
    tier: 'ADULT',
    suitColorHex: '#93c5fd',
    suitColorNum: 0x93c5fd,
    turnVoice: 'vo_turn_grandpa',
    victoryVoice: 'vo_victory'
  },
  {
    id: 'babci',
    name: 'BABCI',
    callsign: 'NAVIGATOR BABCI',
    roleTitle: 'Celestial Rose-Gold Navigator',
    tier: 'ADULT',
    suitColorHex: '#f9a8d4',
    suitColorNum: 0xf9a8d4,
    turnVoice: 'vo_turn_babci',
    victoryVoice: 'vo_victory'
  },
  {
    id: 'guest',
    name: 'GUEST',
    callsign: 'VIP MISSION SPECIALIST',
    roleTitle: 'Chrome Nebula Specialist',
    tier: 'ADULT',
    suitColorHex: '#facc15',
    suitColorNum: 0xfacc15,
    turnVoice: 'vo_turn_guest',
    victoryVoice: 'vo_victory'
  },
  {
    id: 'dreadbot',
    name: 'DREAD-BOT X-99',
    callsign: 'ROGUE A.I. DREAD-BOT X-99',
    roleTitle: 'ROGUE A.I. NEMESIS',
    tier: 'ADULT',
    isAI: true,
    suitColorHex: '#ff2255',
    suitColorNum: 0xff2255,
    turnVoice: 'vo_turn_dreadbot',
    victoryVoice: 'vo_victory'
  }
];

export interface PlayerBayColorSpec {
  slotLabel: string;
  name: string;
  hex: string;
  color: number;
}

export const PLAYER_BAY_COLORS: PlayerBayColorSpec[] = [
  { slotLabel: 'P1', name: 'CYAN', hex: '#38bdf8', color: 0x38bdf8 },
  { slotLabel: 'P2', name: 'MAGENTA', hex: '#f472b6', color: 0xf472b6 },
  { slotLabel: 'P3', name: 'FICSIT AMBER', hex: '#f59e0b', color: 0xf59e0b },
  { slotLabel: 'P4', name: 'EMERALD', hex: '#10b981', color: 0x10b981 },
  { slotLabel: 'P5', name: 'VIOLET', hex: '#a855f7', color: 0xa855f7 },
  { slotLabel: 'P6', name: 'SOLAR GOLD', hex: '#facc15', color: 0xfacc15 }
];

export type PadColorType = 'RED' | 'BLUE' | 'AMBER' | 'EMERALD' | 'RAINBOW';

export type SpecialTileType =
  | 'NONE'
  | 'LAUNCHPAD'
  | 'ORBITAL_CHALLENGE'
  | 'CITADEL';

export interface OrbitalHexPad {
  index: number;
  numberLabel: number;
  x: number;
  y: number;
  sectorIndex: number; // 1..5
  padColor: PadColorType;
  special: SpecialTileType;
}

export interface ActiveAstronautPlayer {
  roster: AstronautRosterSpec;
  bay: PlayerBayColorSpec;
  padIndex: number;
  overclockCount: number;
  correctCount: number;
  tokenContainer?: Phaser.GameObjects.Container;
  figurineBody?: Phaser.GameObjects.Container;
}

const PAD_COLOR_HEX: Record<
  PadColorType,
  { fill: number; bevelDark: number; bevelMid: number; rim: number; hex: string; label: string }
> = {
  RED: {
    fill: 0x991b1b,
    bevelDark: 0x450a0a,
    bevelMid: 0x7f1d1d,
    rim: 0xf87171,
    hex: '#f87171',
    label: 'RUBY'
  },
  BLUE: {
    fill: 0x1e3a8a,
    bevelDark: 0x0f172a,
    bevelMid: 0x1e40af,
    rim: 0x38bdf8,
    hex: '#38bdf8',
    label: 'PULSAR'
  },
  AMBER: {
    fill: 0x92400e,
    bevelDark: 0x451a03,
    bevelMid: 0x78350f,
    rim: 0xfbbf24,
    hex: '#fbbf24',
    label: 'FICSIT'
  },
  EMERALD: {
    fill: 0x065f46,
    bevelDark: 0x022c22,
    bevelMid: 0x064e3b,
    rim: 0x34d399,
    hex: '#34d399',
    label: 'NEBULA'
  },
  RAINBOW: {
    fill: 0x6b21a8,
    bevelDark: 0x3b0764,
    bevelMid: 0x581c87,
    rim: 0xf0abfc,
    hex: '#f0abfc',
    label: 'PRISM'
  }
};

const OPTION_PAD_COLORS: Array<{
  letter: string;
  codeName: string;
  padColor: PadColorType;
  bgFill: number;
  bevelColor: number;
  rimColor: number;
  hexText: string;
}> = [
  {
    letter: 'A',
    codeName: 'RUBY',
    padColor: 'RED',
    bgFill: 0x7f1d1d,
    bevelColor: 0x450a0a,
    rimColor: 0xf87171,
    hexText: '#fecaca'
  },
  {
    letter: 'B',
    codeName: 'PULSAR',
    padColor: 'BLUE',
    bgFill: 0x0c4a6e,
    bevelColor: 0x082f49,
    rimColor: 0x38bdf8,
    hexText: '#bae6fd'
  },
  {
    letter: 'C',
    codeName: 'FICSIT',
    padColor: 'AMBER',
    bgFill: 0x78350f,
    bevelColor: 0x451a03,
    rimColor: 0xfbbf24,
    hexText: '#fde68a'
  },
  {
    letter: 'D',
    codeName: 'NEBULA',
    padColor: 'EMERALD',
    bgFill: 0x064e3b,
    bevelColor: 0x022c22,
    rimColor: 0x34d399,
    hexText: '#a7f3d0'
  }
];

interface SectorLandmarkSpec {
  sectorNum: number;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  accentColor: number;
  hexColor: string;
  icon: string;
}

const SECTOR_LANDMARKS: SectorLandmarkSpec[] = [
  {
    sectorNum: 1,
    title: 'SECTOR 1: STARBASE LAUNCHPAD',
    subtitle: 'Primary Orbital Gantry & LOX Venting',
    x: 148,
    y: 676,
    accentColor: 0x38bdf8,
    hexColor: '#7dd3fc',
    icon: '🚀'
  },
  {
    sectorNum: 2,
    title: 'SECTOR 2: FICSIT SMELTER COMPLEX',
    subtitle: 'Tri-Stack Alloy Refinery',
    x: 255,
    y: 74,
    accentColor: 0xf59e0b,
    hexColor: '#fbbf24',
    icon: '🏭'
  },
  {
    sectorNum: 3,
    title: 'SECTOR 3: GLASS-DOMED ROVER DEPOT',
    subtitle: 'Central Plateau Logistics Hub',
    x: 628,
    y: 238,
    accentColor: 0x10b981,
    hexColor: '#6ee7b7',
    icon: '🛸'
  },
  {
    sectorNum: 4,
    title: 'SECTOR 4: BOOSTER GANTRY ARRAY',
    subtitle: 'Secondary Orbital Fuel Complex',
    x: 985,
    y: 618,
    accentColor: 0xa855f7,
    hexColor: '#d8b4fe',
    icon: '⚡'
  },
  {
    sectorNum: 5,
    title: 'SECTOR 5: UNICORN CITADEL SUMMIT',
    subtitle: 'Iridescent Starbase Sanctuary',
    x: 1110,
    y: 74,
    accentColor: 0xf472b6,
    hexColor: '#f9a8d4',
    icon: '🦄'
  }
];

type OrbitalChallengeType =
  | 'chrono'
  | 'swarm'
  | 'phaselock'
  | 'asteroids'
  | 'memory'
  | 'anomaly';

const ACTIVE_MISSION_STORAGE_KEY = 'starship_active_mission_v1';

const STARSHIP_SCIFI_FONT_FAMILY = "'Orbitron', 'Rajdhani', sans-serif";

/**
 * Eagerly pre-warms the Google Fonts `'Orbitron'` and `'Rajdhani'` faces in the browser
 * as soon as this module is imported (during initial app boot), so Canvas 2D text in the
 * Crew Selection Lobby is 100% rasterizer-ready on the very first frame and NEVER swaps
 * from a fallback system font to `'Orbitron'` when toggling Dread-Bot or any crew card!
 */
let starshipFontsPrewarmed = false;
function prewarmStarshipSciFiFonts(): void {
  if (starshipFontsPrewarmed || typeof document === 'undefined') return;
  starshipFontsPrewarmed = true;
  try {
    if (document.fonts && typeof document.fonts.load === 'function') {
      void document.fonts.load("600 16px 'Orbitron'");
      void document.fonts.load("700 16px 'Orbitron'");
      void document.fonts.load("900 16px 'Orbitron'");
      void document.fonts.load("600 16px 'Rajdhani'");
      void document.fonts.load("700 16px 'Rajdhani'");
    }
    if (document.body && !document.getElementById('starship-font-prewarmer')) {
      const warmer = document.createElement('div');
      warmer.id = 'starship-font-prewarmer';
      warmer.setAttribute('aria-hidden', 'true');
      warmer.style.cssText =
        'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;' +
        "font-family:'Orbitron','Rajdhani',sans-serif;font-weight:700;";
      warmer.innerHTML =
        '<span style="font-family:\'Orbitron\',sans-serif;font-weight:700;">STARSHIP DREAD-BOT X-99 P1 P6</span>' +
        '<span style="font-family:\'Orbitron\',sans-serif;font-weight:900;">ORBITAL TRIVIA</span>' +
        '<span style="font-family:\'Rajdhani\',sans-serif;font-weight:700;">MISSION CONTROL</span>';
      document.body.appendChild(warmer);
    }
  } catch {
    // Ignore DOM/font prewarm errors
  }
}
prewarmStarshipSciFiFonts();

interface SavedStarshipMissionState {
  missionActive: true;
  totalPads: 25 | 50;
  currentPlayerIndex: number;
  activePlayers: Array<{
    id: AstronautId;
    currentPad: number;
    overclockCount: number;
    correctCount: number;
  }>;
}

export class StarshipUnicornScene extends Phaser.Scene {
  // Mission Configuration State
  private selectedAstronautIds: AstronautId[] = ['wyatt', 'emma', 'robert', 'rita'];
  private missionTotalPads: 25 | 50 = 25;
  private missionActive = false;

  // Active Game State
  private scenePhase:
    | 'LOBBY'
    | 'TURN_HANDOFF'
    | 'TRIVIA'
    | 'LOCKING_ANSWER'
    | 'DICE_ROLL'
    | 'PATH_PREVIEW'
    | 'MOVING'
    | 'CUTSCENE'
    | 'PAUSED'
    | 'VICTORY' = 'LOBBY';
  private pausedPhaseBeforeModal:
    | 'TURN_HANDOFF'
    | 'TRIVIA'
    | 'LOCKING_ANSWER'
    | 'DICE_ROLL'
    | 'PATH_PREVIEW'
    | 'MOVING'
    | 'CUTSCENE' = 'TURN_HANDOFF';
  private introRevealTimer: Phaser.Time.TimerEvent | null = null;
  private hasRolledThisTurn = false;
  private lobbySnapshotAstronautIds: AstronautId[] = [];
  private lobbySnapshotTotalPads: 25 | 50 = 25;
  private pausedTweensSnapshot: Phaser.Tweens.Tween[] = [];
  private players: ActiveAstronautPlayer[] = [];
  private activePlayerIndex = 0;
  private boardPads: OrbitalHexPad[] = [];

  // Session-Persistent Question History
  private askedQuestionIds: Set<string> = new Set();
  private currentQuestion: TriviaQuestionItem | null = null;
  private lastAnswerWasOverclock = false;
  private lastChosenPadColor: PadColorType = 'RED';
  private pendingColorWarpBonus = false;
  private isRollingDice = false;
  private hasPlayedWelcomeNarration = false;

  // Display Containers
  private bgContainer!: Phaser.GameObjects.Container;
  private biomePropsContainer!: Phaser.GameObjects.Container;
  private boardContainer!: Phaser.GameObjects.Container;
  private tronBlackoutContainer!: Phaser.GameObjects.Container;
  private trajectoryLaserContainer!: Phaser.GameObjects.Container;
  private tokensContainer!: Phaser.GameObjects.Container;
  private topHudContainer!: Phaser.GameObjects.Container;
  private dockContainer!: Phaser.GameObjects.Container;
  private diceConsoleContainer!: Phaser.GameObjects.Container;
  private cutsceneContainer!: Phaser.GameObjects.Container;
  private lobbyContainer!: Phaser.GameObjects.Container;
  private pauseModalContainer!: Phaser.GameObjects.Container;
  private victoryContainer!: Phaser.GameObjects.Container;
  private redAlertVignetteContainer!: Phaser.GameObjects.Container;
  private activeHighlightRing!: Phaser.GameObjects.Graphics;
  private padRimGlowMap: Map<number, Phaser.GameObjects.Graphics> = new Map();
  private triviaCountdownEvent: Phaser.Time.TimerEvent | null = null;
  private triviaCountdownTween: Phaser.Tweens.Tween | null = null;
  private kidReadAloudToken = 0;
  private kidReadAloudTimer: Phaser.Time.TimerEvent | null = null;
  private kidReadAloudResetVisuals: (() => void) | null = null;
  private orbitalChallengeDeck: OrbitalChallengeType[] = [];
  private dreadbotMoveDeck: number[] = [];
  private boundOnPopState: (() => void) | null = null;

  constructor() {
    super({ key: 'StarshipUnicornScene' });
  }

  public preload(): void {
    prewarmStarshipSciFiFonts();
    StarshipAudio.preloadAllSfx();
    if (!this.textures.exists('board-isometric-conveyor-world')) {
      this.load.image(
        'board-isometric-conveyor-world',
        '/assets/starship/board-isometric-conveyor-world.png?v=iso4'
      );
    }
    if (!this.textures.exists('board-isometric-factory')) {
      this.load.image('board-isometric-factory', '/assets/starship/board-isometric-factory.png?v=iso4');
    }
    if (!this.textures.exists('dice-plunger-console')) {
      this.load.image('dice-plunger-console', '/assets/starship/dice-plunger-console.png?v=plunger1');
    }
    if (!this.textures.exists('challenge-shield-turrets')) {
      this.load.spritesheet(
        'challenge-shield-turrets',
        '/assets/starship/challenge-shield-turrets.png?v=hw1',
        { frameWidth: 256, frameHeight: 256 }
      );
    }
    if (!this.textures.exists('challenge-cargo-crates')) {
      this.load.spritesheet(
        'challenge-cargo-crates',
        '/assets/starship/challenge-cargo-crates.png?v=hw1',
        { frameWidth: 256, frameHeight: 256 }
      );
    }
    if (!this.textures.exists('challenge-warp-core')) {
      this.load.image('challenge-warp-core', '/assets/starship/challenge-warp-core.png?v=hw1');
    }
    if (!this.textures.exists('hud-telemetry-comms-pod')) {
      this.load.image(
        'hud-telemetry-comms-pod',
        '/assets/starship/hud-telemetry-comms-pod.png?v=hw1'
      );
    }
    if (!this.textures.exists('ui-startrek-command-deck')) {
      this.load.image(
        'ui-startrek-command-deck',
        '/assets/starship/ui-startrek-command-deck.png?v=lcars1'
      );
    }
    if (!this.textures.exists('ui-startrek-top-pill')) {
      this.load.image(
        'ui-startrek-top-pill',
        '/assets/starship/ui-startrek-top-pill.png?v=lcars1'
      );
    }
    if (!this.textures.exists('sprite-3d-supply-pods')) {
      this.load.spritesheet(
        'sprite-3d-supply-pods',
        '/assets/starship/sprite-3d-supply-pods.png?v=lcars1',
        { frameWidth: 256, frameHeight: 256 }
      );
    }
    if (!this.textures.exists('starship-crew-dreadbot')) {
      this.load.image('starship-crew-dreadbot', '/assets/starship/crew-dreadbot.png');
    }
    if (!this.textures.exists('starship-astro-dreadbot')) {
      this.load.image(
        'starship-astro-dreadbot',
        '/assets/games/starship-unicorn/portraits/astro_dreadbot.png?v=su1'
      );
    }
    if (!this.textures.exists('starship-card-dreadbot')) {
      this.load.image(
        'starship-card-dreadbot',
        '/assets/games/starship-unicorn/cards/card_dreadbot.png?v=su2'
      );
    }
    if (!this.textures.exists('starship-token-dreadbot')) {
      this.load.image(
        'starship-token-dreadbot',
        '/assets/games/starship-unicorn/tokens/token_dreadbot.png?v=su1'
      );
    }
  }

  public create(): void {
    // Silence cozy music-box BGM & stop any leftover voice so living-room speakers are 100% clean
    AudioBus.stopCozyLoop();
    StarshipAudio.stopAllVoice();
    StarshipAudio.stopAmbientStarbasePad();
    this.hasPlayedWelcomeNarration = false;
    this.missionActive = false;
    this.installHighDpiSciFiTextPatch();
    this.enforceLinearFiltering();
    this.ensureSmoothGlowTextures();

    this.bgContainer = this.add.container(0, 0).setDepth(1);
    this.biomePropsContainer = this.add.container(0, 0).setDepth(5);
    this.boardContainer = this.add.container(0, 0).setDepth(10);
    this.tronBlackoutContainer = this.add.container(0, 0).setDepth(14);
    this.trajectoryLaserContainer = this.add.container(0, 0).setDepth(18);
    this.tokensContainer = this.add.container(0, 0).setDepth(100);
    this.redAlertVignetteContainer = this.add.container(0, 0).setDepth(840);
    this.topHudContainer = this.add.container(0, 0).setDepth(850);
    this.dockContainer = this.add.container(0, 0).setDepth(860).setAlpha(1).setVisible(true);
    this.diceConsoleContainer = this.add.container(0, 0).setDepth(910);
    this.cutsceneContainer = this.add.container(0, 0).setDepth(950);
    this.pauseModalContainer = this.add.container(0, 0).setDepth(3500).setVisible(false);
    this.lobbyContainer = this.add.container(0, 0).setDepth(3800);
    this.victoryContainer = this.add.container(0, 0).setDepth(4000).setVisible(false);

    this.renderCosmicBackdrop();
    this.buildAndRenderOrbitalBoard(this.missionTotalPads);
    this.renderTopMissionHeader();
    this.openPreFlightLobby(true);

    // Ensure that if the browser finishes downloading Orbitron/Rajdhani a moment after direct scene boot,
    // the Crew Lobby and HUD re-render once with identical Orbitron metrics so clicking Dread-Bot never shifts fonts.
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready
        .then(() => {
          if (!this.scene.isActive()) return;
          this.children.list.forEach((child) => {
            if (child instanceof Phaser.GameObjects.Text && child.active) {
              child.updateText();
            }
          });
          if (this.scenePhase === 'LOBBY' && this.lobbyContainer && this.lobbyContainer.visible) {
            this.openPreFlightLobby(false, true);
          }
        })
        .catch(() => {});
    }

    // Block accidental Android / Pixel Tablet back-edge swipes: push a history guard state
    // and pop open the in-game `[ ⏸ PAUSE ]` modal instead of closing the app!
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState({ starshipBackGuard: true }, '');
      } catch {
        // Ignore history state restrictions
      }
      this.boundOnPopState = () => {
        try {
          window.history.pushState({ starshipBackGuard: true }, '');
        } catch {
          // Ignore
        }
        if (this.scene.isActive() && this.missionActive && this.scenePhase !== 'LOBBY' && this.scenePhase !== 'VICTORY') {
          if (!this.pauseModalContainer.visible) {
            this.openTacticalPauseModal();
          }
        }
      };
      window.addEventListener('popstate', this.boundOnPopState);
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (typeof window !== 'undefined' && this.boundOnPopState) {
        window.removeEventListener('popstate', this.boundOnPopState);
        this.boundOnPopState = null;
      }
      this.stopTriviaCountdownTimer();
      StarshipAudio.stopAllVoice();
      StarshipAudio.stopAmbientStarbasePad();
    });

    this.cameras.main.fadeIn(320, 4, 8, 22);
  }

  /**
   * Unbiased Fisher-Yates shuffle helper for randomizing crew play order,
   * the 6-challenge Orbital Challenge deck, and Drone Swarm answer buttons.
   */
  private fisherYatesShuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  /**
   * Draws the next mini-game from a shuffled deck of all 6 Orbital Challenge types,
   * reshuffling automatically when all 6 have been played so challenges are 100% randomized
   * and never tied to a specific board square!
   */
  private drawNextOrbitalChallenge(): OrbitalChallengeType {
    if (this.orbitalChallengeDeck.length === 0) {
      this.orbitalChallengeDeck = this.fisherYatesShuffle<OrbitalChallengeType>([
        'chrono',
        'swarm',
        'phaselock',
        'asteroids',
        'memory',
        'anomaly'
      ]);
    }
    return this.orbitalChallengeDeck.pop() ?? 'chrono';
  }

  /**
   * Draws the next thruster roll for Autonomous Dread-Bot X-99 from a Fisher-Yates shuffled
   * cycle of `[1, 2, 3, 4]` so Dread-Bot relentlessly advances 1, 2, 3, or 4 pads every single turn
   * without ever rolling 0 or 6!
   */
  private drawNextDreadbotRoll(): number {
    if (this.dreadbotMoveDeck.length === 0) {
      this.dreadbotMoveDeck = this.fisherYatesShuffle<number>([1, 2, 3, 4]);
    }
    return this.dreadbotMoveDeck.pop() ?? 2;
  }

  /**
   * Requests Android / Pixel Tablet Sticky Immersive Fullscreen (`navigationUI: 'hide'`)
   * so system edge-bars require two deliberate bezel swipes to reveal.
   */
  private requestImmersiveFullscreen(): void {
    if (typeof document === 'undefined') return;
    try {
      if (!document.fullscreenElement) {
        const docEl = document.documentElement as HTMLElement & {
          requestFullscreen?: (options?: { navigationUI?: 'hide' | 'show' | 'auto' }) => Promise<void>;
        };
        docEl.requestFullscreen?.({ navigationUI: 'hide' })?.catch(() => {});
      }
    } catch {
      // Ignore fullscreen permission errors
    }
  }

  private toggleImmersiveFullscreen(): void {
    if (typeof document === 'undefined') return;
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      } else {
        this.requestImmersiveFullscreen();
      }
    } catch {
      // Ignore fullscreen toggle errors
    }
  }

  /**
   * Live Mission Auto-Save (`localStorage` key `'starship_active_mission_v1'`).
   */
  private saveActiveMissionToStorage(): void {
    if (!this.missionActive || this.players.length < 2) return;
    try {
      const state: SavedStarshipMissionState = {
        missionActive: true,
        totalPads: this.missionTotalPads,
        currentPlayerIndex: this.activePlayerIndex % this.players.length,
        activePlayers: this.players.map((p) => ({
          id: p.roster.id,
          currentPad: p.padIndex,
          overclockCount: p.overclockCount,
          correctCount: p.correctCount
        }))
      };
      window.localStorage.setItem(ACTIVE_MISSION_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore localStorage quota/privacy errors
    }
  }

  private clearActiveMissionStorage(): void {
    try {
      window.localStorage.removeItem(ACTIVE_MISSION_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  private loadSavedMissionFromStorage(): SavedStarshipMissionState | null {
    try {
      const raw = window.localStorage.getItem(ACTIVE_MISSION_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SavedStarshipMissionState;
      if (
        parsed &&
        parsed.missionActive === true &&
        (parsed.totalPads === 25 || parsed.totalPads === 50) &&
        Array.isArray(parsed.activePlayers) &&
        parsed.activePlayers.length >= 2
      ) {
        return parsed;
      }
    } catch {
      // Ignore corrupt JSON
    }
    return null;
  }

  private resumeSavedMissionFromStorage(saved: SavedStarshipMissionState): void {
    this.requestImmersiveFullscreen();
    this.stopTriviaCountdownTimer();
    if (this.introRevealTimer) {
      this.introRevealTimer.remove(false);
      this.introRevealTimer = null;
    }

    this.missionActive = true;
    this.hasRolledThisTurn = false;
    this.pausedTweensSnapshot = [];
    this.missionTotalPads = saved.totalPads === 50 ? 50 : 25;
    this.selectedAstronautIds = saved.activePlayers.map((ap) => ap.id);

    this.lobbyContainer.removeAll(true);
    this.lobbyContainer.setVisible(false);
    this.pauseModalContainer.removeAll(true);
    this.pauseModalContainer.setVisible(false);
    this.victoryContainer.removeAll(true);
    this.victoryContainer.setVisible(false);
    this.cutsceneContainer.removeAll(true);
    this.tronBlackoutContainer.removeAll(true);
    this.trajectoryLaserContainer.removeAll(true);
    this.diceConsoleContainer.removeAll(true);
    this.dockContainer.removeAll(true);
    this.dockContainer.setPosition(0, 260).setVisible(false);

    this.buildAndRenderOrbitalBoard(this.missionTotalPads);
    const maxPadIdx = Math.max(1, this.boardPads.length - 1);

    this.players = saved.activePlayers.map((ap, idx) => {
      const roster = ASTRONAUT_ROSTER.find((r) => r.id === ap.id) ?? ASTRONAUT_ROSTER[0];
      const bay = PLAYER_BAY_COLORS[idx % PLAYER_BAY_COLORS.length];
      return {
        roster,
        bay,
        padIndex: Phaser.Math.Clamp(ap.currentPad || 0, 0, maxPadIdx - 1),
        overclockCount: ap.overclockCount || 0,
        correctCount: ap.correctCount || 0
      };
    });

    this.activePlayerIndex =
      Phaser.Math.Clamp(saved.currentPlayerIndex || 0, 0, Math.max(0, this.players.length - 1));
    this.spawnPlayerBoardTokens(false);
    this.refreshAllTokenOffsets();
    this.renderTopMissionHeader();
    this.startPlayerTurn(this.activePlayerIndex);
  }

  /**
   * Universal Auto-Fit Helper (`fitTextToWidth(textObj, maxWidth)`):
   * Checks if `textObj.width > maxWidth` and automatically scales `textObj` down so
   * geometric `Orbitron` typography NEVER overflows any button, pill, or panel border!
   */
  private fitTextToWidth(
    textObj: Phaser.GameObjects.Text,
    maxWidth: number
  ): Phaser.GameObjects.Text {
    if (!textObj || maxWidth <= 0) return textObj;
    textObj.setScale(1);
    if (textObj.width > maxWidth) {
      textObj.setScale(maxWidth / textObj.width);
    }
    return textObj;
  }

  /**
   * Freezes the 15-second question countdown timer, silences any active Red Alert klaxon,
   * and pauses active board/timer tweens while keeping modal UI interactive.
   */
  private pauseActiveMissionTimers(): void {
    if (
      this.scenePhase !== 'LOBBY' &&
      this.scenePhase !== 'PAUSED' &&
      this.scenePhase !== 'VICTORY'
    ) {
      this.pausedPhaseBeforeModal = this.scenePhase;
    }
    if (this.triviaCountdownEvent) {
      this.triviaCountdownEvent.paused = true;
    }
    if (this.triviaCountdownTween && this.triviaCountdownTween.isPlaying()) {
      this.triviaCountdownTween.pause();
    }
    this.cancelKidReadAloudSequence();
    StarshipAudio.stopRedAlertKlaxon();

    this.pausedTweensSnapshot = this.tweens
      .getTweens()
      .filter((t) => t.isPlaying());
    this.pausedTweensSnapshot.forEach((t) => t.pause());
  }

  /**
   * Resumes the exact turn phase, countdown timer, and board tweens after closing Pause or Mid-Game Lobby.
   */
  private resumeActiveMissionTimers(): void {
    this.scenePhase = this.pausedPhaseBeforeModal;
    this.pausedTweensSnapshot.forEach((t) => {
      if (t && t.isPaused()) {
        t.resume();
      }
    });
    this.pausedTweensSnapshot = [];

    if (this.triviaCountdownEvent) {
      this.triviaCountdownEvent.paused = false;
    }
    if (this.triviaCountdownTween && this.triviaCountdownTween.isPaused()) {
      this.triviaCountdownTween.resume();
    }
  }

  /**
   * Automatically upgrades every `Phaser.GameObjects.Text` in `StarshipUnicornScene`
   * to render at 2x–3x Retina DPI (`setResolution`) with LINEAR texture filtering and
   * Star Trek LCARS / SpaceX `'Orbitron', 'Rajdhani', sans-serif` typography!
   */
  private installHighDpiSciFiTextPatch(): void {
    const factory = this.add as unknown as {
      text: (
        x: number,
        y: number,
        text: string | string[],
        style?: Phaser.Types.GameObjects.Text.TextStyle
      ) => Phaser.GameObjects.Text;
      __starshipHiDpiPatched?: boolean;
    };
    if (factory.__starshipHiDpiPatched) return;
    factory.__starshipHiDpiPatched = true;

    const origText = factory.text.bind(this.add);
    const hiDpiRes = Math.max(2, typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2);

    factory.text = (
      x: number,
      y: number,
      text: string | string[],
      style?: Phaser.Types.GameObjects.Text.TextStyle
    ): Phaser.GameObjects.Text => {
      const mergedStyle: Phaser.Types.GameObjects.Text.TextStyle = {
        ...(style ? { ...style } : {}),
        fontFamily: STARSHIP_SCIFI_FONT_FAMILY
      };
      const t = origText(x, y, text, mergedStyle);
      t.setResolution(hiDpiRes);
      if (t.texture) {
        t.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
      const origSetStyle = t.setStyle.bind(t);
      t.setStyle = (nextStyle?: object) => {
        return origSetStyle({
          ...(nextStyle ? { ...(nextStyle as Record<string, unknown>) } : {}),
          fontFamily: STARSHIP_SCIFI_FONT_FAMILY
        });
      };
      const origSetFontFamily = t.setFontFamily.bind(t);
      t.setFontFamily = () => {
        return origSetFontFamily(STARSHIP_SCIFI_FONT_FAMILY);
      };
      return t;
    };
  }

  private enforceLinearFiltering(): void {
    const keysToSmooth: string[] = [
      'board-isometric-conveyor-world',
      'board-isometric-factory',
      'dice-plunger-console',
      'challenge-shield-turrets',
      'challenge-cargo-crates',
      'challenge-warp-core',
      'hud-telemetry-comms-pod',
      'ui-startrek-command-deck',
      'ui-startrek-top-pill',
      'sprite-3d-supply-pods',
      'starship-board-bg',
      'starship-crew-dreadbot',
      'hub-toy-starship-unicorn',
      'mode-tv'
    ];
    for (const spec of ASTRONAUT_ROSTER) {
      keysToSmooth.push(`starship-astro-${spec.id}`);
      keysToSmooth.push(`starship-card-${spec.id}`);
      keysToSmooth.push(`starship-token-${spec.id}`);
    }
    for (const key of keysToSmooth) {
      if (this.textures.exists(key)) {
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    }
  }

  private ensureSmoothGlowTextures(): void {
    if (!this.textures.exists('starship-smooth-glow')) {
      const canvasTex = this.textures.createCanvas('starship-smooth-glow', 256, 256);
      if (canvasTex) {
        const ctx = canvasTex.getContext();
        const grad = ctx.createRadialGradient(128, 128, 4, 128, 128, 128);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        grad.addColorStop(0.35, 'rgba(56, 189, 248, 0.65)');
        grad.addColorStop(0.7, 'rgba(168, 85, 247, 0.22)');
        grad.addColorStop(1, 'rgba(15, 23, 42, 0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);
        canvasTex.refresh();
        this.textures.get('starship-smooth-glow').setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    }

    if (!this.textures.exists('starship-flare-dot')) {
      const dotTex = this.textures.createCanvas('starship-flare-dot', 64, 64);
      if (dotTex) {
        const ctx = dotTex.getContext();
        const grad = ctx.createRadialGradient(32, 32, 1, 32, 32, 30);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        grad.addColorStop(0.4, 'rgba(250, 204, 21, 0.8)');
        grad.addColorStop(1, 'rgba(250, 204, 21, 0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        dotTex.refresh();
        this.textures.get('starship-flare-dot').setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    }

    if (!this.textures.exists('starship-smoke-puff')) {
      const smokeTex = this.textures.createCanvas('starship-smoke-puff', 96, 96);
      if (smokeTex) {
        const ctx = smokeTex.getContext();
        const grad = ctx.createRadialGradient(48, 48, 4, 48, 48, 44);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
        grad.addColorStop(0.5, 'rgba(226, 232, 240, 0.42)');
        grad.addColorStop(1, 'rgba(226, 232, 240, 0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 96, 96);
        smokeTex.refresh();
        this.textures.get('starship-smoke-puff').setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    }
  }

  private renderCosmicBackdrop(): void {
    this.bgContainer.removeAll(true);

    const bgKey = this.textures.exists('board-isometric-conveyor-world')
      ? 'board-isometric-conveyor-world'
      : this.textures.exists('board-isometric-factory')
      ? 'board-isometric-factory'
      : 'starship-board-bg';

    if (this.textures.exists(bgKey)) {
      this.textures.get(bgKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
      const bgImg = this.add
        .image(640, 360, bgKey)
        .setOrigin(0.5, 0.5)
        .setDisplaySize(1280, 720);
      this.bgContainer.add(bgImg);
    } else {
      const g = this.add.graphics();
      g.fillGradientStyle(0x060b19, 0x0f172a, 0x1e1b4b, 0x090d16, 1);
      g.fillRect(0, 0, 1280, 720);
      this.bgContainer.add(g);
    }

    // Subtle atmospheric contrast glaze (keeps the isometric alien plateau vibrant and crisp)
    const boardScrim = this.add.graphics();
    boardScrim.fillStyle(0x020617, 0.12);
    boardScrim.fillRect(0, 0, 1280, 720);
    this.bgContainer.add(boardScrim);
  }

  // ===========================================================================
  // UPGRADE 6B: TOP MISSION TELEMETRY BAR WITH LIVE RANK BADGES (`🥇 1ST`..)
  // ===========================================================================

  private renderTopMissionHeader(): void {
    this.topHudContainer.removeAll(true);

    const barG = this.add.graphics();
    barG.fillStyle(0x060b16, 0.94);
    barG.fillRect(0, 0, 1280, 52);
    barG.lineStyle(2, 0x38bdf8, 0.7);
    barG.lineBetween(0, 52, 1280, 52);
    // FICSIT safety-amber industrial stripes on left & right shoulders
    barG.fillStyle(0xf59e0b, 0.95);
    barG.fillRect(0, 49, 195, 3);
    barG.fillRect(1085, 49, 195, 3);
    this.topHudContainer.add(barG);

    // 1. Top-Left `[ ◀ ARCADE HUB ]` Rocker Switch
    const hubBtn = this.createSleekHeaderButton(72, 26, 126, 36, '◀ ARCADE HUB', 0x38bdf8, () => {
      this.stopTriviaCountdownTimer();
      StarshipAudio.playRockerSwitchClick(false);
      StarshipAudio.stopVoice();
      AudioBus.startCozyLoop();
      this.scene.start('HubScene');
    });
    this.topHudContainer.add(hubBtn);

    // 2. Mission Title & Trajectory Badge (auto-fitted for Orbitron)
    const titleText = this.add
      .text(142, 16, 'STARSHIP UNICORN', {
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#f8fafc'
      })
      .setOrigin(0, 0.5);
    this.fitTextToWidth(titleText, 146);

    const subText = this.add
      .text(142, 35, `5-SECTOR • ${this.missionTotalPads} PADS`, {
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#f59e0b'
      })
      .setOrigin(0, 0.5);
    this.fitTextToWidth(subText, 146);
    this.topHudContainer.add([titleText, subText]);

    // 3. Center Live Crew Standings Strip with Rank Medals (`🥇 1ST`, `🥈 2ND`, `🥉 3RD`) & Distance to Citadel
    if (this.players.length > 0 && this.scenePhase !== 'LOBBY') {
      // Compute live rank order by `padIndex` descending
      const sortedIndices = this.players
        .map((p, idx) => ({ idx, padIndex: p.padIndex }))
        .sort((a, b) => b.padIndex - a.padIndex);

      const rankByPlayerIdx = new Map<number, number>();
      sortedIndices.forEach((item, rankOrder) => {
        rankByPlayerIdx.set(item.idx, rankOrder + 1);
      });

      const rankBadges = ['🥇 1ST', '🥈 2ND', '🥉 3RD', '4TH', '5TH', '6TH'];
      const pillW = this.players.length <= 4 ? 142 : this.players.length === 5 ? 116 : 98;
      const spacing = pillW + 4;
      const totalWidth = this.players.length * spacing - 4;
      const startX = 564 - totalWidth / 2 + pillW / 2;
      const maxPadIdx = Math.max(1, this.boardPads.length - 1);

      this.players.forEach((p, idx) => {
        const px = startX + idx * spacing;
        const isCurrent = idx === this.activePlayerIndex;
        const rankNum = rankByPlayerIdx.get(idx) ?? idx + 1;
        const rankStr = rankBadges[rankNum - 1] ?? `${rankNum}TH`;
        const padsRemaining = Math.max(0, maxPadIdx - p.padIndex);

        const badge = this.add.container(px, 26);
        if (this.textures.exists('ui-startrek-top-pill')) {
          this.textures.get('ui-startrek-top-pill').setFilter(Phaser.Textures.FilterMode.LINEAR);
          const pillImg = this.add
            .image(0, 0, 'ui-startrek-top-pill')
            .setDisplaySize(pillW, 42);
          badge.add(pillImg);
        }
        const bg = this.add.graphics();
        bg.lineStyle(isCurrent ? 2.5 : 1.4, p.bay.color, isCurrent ? 1 : 0.72);
        bg.strokeRoundedRect(-pillW / 2, -20, pillW, 40, 18);
        badge.add(bg);

        const tokenKey = `starship-token-${p.roster.id}`;
        if (this.textures.exists(tokenKey)) {
          this.textures.get(tokenKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
          const miniTok = this.add
            .image(-pillW / 2 + 17, 1, tokenKey)
            .setDisplaySize(24, 24);
          badge.add(miniTok);
        }

        // Dark center region inside LCARS pill: left of right-hand orange LCARS cap with >=12px padding
        // and below top cyan bar with generous vertical padding!
        const leftSafeX = -pillW / 2 + 32;
        const rightSafeX = pillW / 2 - 18;
        const textCenterX = (leftSafeX + rightSafeX) / 2;
        const innerWidth = Math.max(48, rightSafeX - leftSafeX - 4);

        const topRowText =
          this.players.length <= 4 ? `${rankStr} • ${p.roster.name}` : `${rankStr} ${p.roster.name}`;
        const nameLbl = this.add
          .text(textCenterX, -5.5, topRowText, {
            fontSize: this.players.length <= 4 ? '10px' : '8.5px',
            fontStyle: 'bold',
            color: isCurrent ? '#fde047' : '#f8fafc'
          })
          .setOrigin(0.5);
        this.fitTextToWidth(nameLbl, innerWidth);

        const distText =
          padsRemaining === 0
            ? '🏆 AT CITADEL!'
            : this.players.length <= 4
            ? `PAD ${p.padIndex} (${padsRemaining} TO GO)`
            : `P${p.padIndex} (-${padsRemaining})`;

        const padLbl = this.add
          .text(textCenterX, 8, distText, {
            fontSize: this.players.length <= 4 ? '9px' : '8px',
            fontStyle: 'bold',
            color: p.bay.hex
          })
          .setOrigin(0.5);
        this.fitTextToWidth(padLbl, innerWidth);

        badge.add([nameLbl, padLbl]);
        this.topHudContainer.add(badge);
      });
    }

    // 4. Top-Right `[ ⛶ FULLSCREEN ]`, `[ ⏸ PAUSE ]`, `[ ⚙ CREW LOBBY ]` & `[ 🔊 ]` Buttons
    const fullscreenBtn = this.createSleekHeaderButton(
      910,
      26,
      96,
      36,
      '⛶ FULLSCREEN',
      0x38bdf8,
      () => {
        StarshipAudio.playRockerSwitchClick(true);
        this.toggleImmersiveFullscreen();
      }
    );
    this.topHudContainer.add(fullscreenBtn);

    const pauseBtn = this.createSleekHeaderButton(1008, 26, 86, 36, '⏸ PAUSE', 0x00f5d4, () => {
      StarshipAudio.playRockerSwitchClick(true);
      this.openTacticalPauseModal();
    });
    this.topHudContainer.add(pauseBtn);

    const lobbyBtn = this.createSleekHeaderButton(1124, 26, 130, 36, '⚙ CREW LOBBY', 0xf59e0b, () => {
      StarshipAudio.playRockerSwitchClick(true);
      this.openPreFlightLobby(false);
    });
    this.topHudContainer.add(lobbyBtn);

    const muteBtn = this.createSleekHeaderButton(
      1226,
      26,
      52,
      36,
      AudioBus.getMuted() ? '🔇' : '🔊',
      0x94a3b8,
      () => {
        StarshipAudio.playRockerSwitchClick(false);
        const muted = AudioBus.toggleMute();
        if (muted) {
          StarshipAudio.stopAllVoice();
        }
        this.renderTopMissionHeader();
      }
    );
    this.topHudContainer.add(muteBtn);
  }

  /**
   * Global `[ ⏸ PAUSE ]` Star Trek LCARS Tactical Hold Overlay (`⏸ MISSION ON TACTICAL HOLD`).
   * Freezes the 15-second question countdown timer, silences any active Red Alert klaxon,
   * pauses active board movement/timers, and presents 4 clear tactical command buttons.
   */
  private openTacticalPauseModal(): void {
    if (!this.missionActive || this.scenePhase === 'LOBBY' || this.scenePhase === 'VICTORY') {
      return;
    }
    if (this.pauseModalContainer.visible) {
      this.closeTacticalPauseModalAndResume();
      return;
    }

    this.pauseActiveMissionTimers();
    this.scenePhase = 'PAUSED';
    this.pauseModalContainer.removeAll(true);
    this.pauseModalContainer.setVisible(true).setDepth(3500);

    const scrim = this.add
      .rectangle(640, 360, 1280, 720, 0x020617, 0.76)
      .setInteractive();
    const deck = this.add.container(640, 368).setScale(0.92).setAlpha(0);
    this.pauseModalContainer.add([scrim, deck]);

    if (this.textures.exists('ui-startrek-command-deck')) {
      this.textures.get('ui-startrek-command-deck').setFilter(Phaser.Textures.FilterMode.LINEAR);
      const frameImg = this.add
        .image(0, 0, 'ui-startrek-command-deck')
        .setDisplaySize(860, 510);
      deck.add(frameImg);
    } else {
      const g = this.add.graphics();
      g.fillStyle(0x070d1b, 0.96);
      g.fillRoundedRect(-430, -255, 860, 510, 22);
      g.lineStyle(3, 0x00f5d4, 1);
      g.strokeRoundedRect(-430, -255, 860, 510, 22);
      deck.add(g);
    }

    const title = this.add
      .text(0, -172, '⏸ MISSION ON TACTICAL HOLD', {
        fontSize: '25px',
        fontStyle: 'bold',
        color: '#00f5d4',
        stroke: '#020617',
        strokeThickness: 5
      })
      .setOrigin(0.5);
    this.fitTextToWidth(title, 700);

    const sub = this.add
      .text(0, -134, 'ORBITAL TELEMETRY & THRUSTER CHRONOMETERS FROZEN', {
        fontSize: '13.5px',
        fontStyle: 'bold',
        color: '#fde047'
      })
      .setOrigin(0.5);
    this.fitTextToWidth(sub, 680);
    deck.add([title, sub]);

    const resumeBtn = this.createCockpitRockerSwitch(
      0,
      -58,
      460,
      58,
      '▶  RESUME MISSION',
      0x10b981,
      () => {
        this.closeTacticalPauseModalAndResume();
      }
    );

    const crewBtn = this.createCockpitRockerSwitch(
      0,
      14,
      460,
      58,
      '👥  ADD / DROP CREW',
      0xf59e0b,
      () => {
        this.pauseModalContainer.removeAll(true);
        this.pauseModalContainer.setVisible(false);
        this.openPreFlightLobby(false, true);
      }
    );

    const restartBtn = this.createCockpitRockerSwitch(
      0,
      86,
      460,
      58,
      '🔄  RESTART MISSION',
      0x38bdf8,
      () => {
        this.clearActiveMissionStorage();
        this.pauseModalContainer.removeAll(true);
        this.pauseModalContainer.setVisible(false);
        this.pausedTweensSnapshot = [];
        this.stopTriviaCountdownTimer();
        this.initiateMissionLaunch();
      }
    );

    const hubBtn = this.createCockpitRockerSwitch(
      0,
      158,
      460,
      58,
      '◀  ARCADE HUB',
      0x64748b,
      () => {
        this.pauseModalContainer.removeAll(true);
        this.pauseModalContainer.setVisible(false);
        this.pausedTweensSnapshot = [];
        this.stopTriviaCountdownTimer();
        StarshipAudio.stopAllVoice();
        AudioBus.startCozyLoop();
        this.scene.start('HubScene');
      }
    );

    deck.add([resumeBtn, crewBtn, restartBtn, hubBtn]);

    this.tweens.add({
      targets: deck,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 220,
      ease: 'Back.easeOut'
    });
  }

  private closeTacticalPauseModalAndResume(): void {
    this.pauseModalContainer.removeAll(true);
    this.pauseModalContainer.setVisible(false);
    this.resumeActiveMissionTimers();
  }

  /**
   * Polished 3D Metallic Cockpit Rocker Switch Button used in headers and telemetry toolbars.
   */
  private createSleekHeaderButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    rimColor: number,
    onTap: () => void
  ): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    // 3D lower metallic bezel
    g.fillStyle(0x020617, 0.92);
    g.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 8);
    g.fillStyle(0x1e293b, 0.98);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    g.lineStyle(2, rimColor, 0.92);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    // Corner hex rivets
    g.fillStyle(0x94a3b8, 0.85);
    g.fillCircle(-w / 2 + 6, -h / 2 + 6, 1.6);
    g.fillCircle(w / 2 - 6, -h / 2 + 6, 1.6);
    g.fillCircle(-w / 2 + 6, h / 2 - 6, 1.6);
    g.fillCircle(w / 2 - 6, h / 2 - 6, 1.6);

    const txt = this.add
      .text(0, 0, label, {
        fontSize: '11.5px',
        fontStyle: 'bold',
        color: '#f8fafc'
      })
      .setOrigin(0.5);
    this.fitTextToWidth(txt, w - 16);

    c.add([g, txt]);
    Juice.makeTactileButton(this, c, Math.max(w, 52), Math.max(h, 44), onTap, null);
    c.on('pointerover', () => {
      StarshipAudio.playHoverMicroClick();
    });
    return c;
  }

  // ===========================================================================
  // PRE-FLIGHT & LIVE MID-GAME MISSION LOBBY (RESUME + HOT-SWAP ROSTER)
  // ===========================================================================

  private openPreFlightLobby(isInitialBoot: boolean, isReRenderWithinLobby = false): void {
    const isMidGame = this.missionActive && !isInitialBoot;
    const savedMission = !isMidGame ? this.loadSavedMissionFromStorage() : null;

    if (isMidGame) {
      if (!isReRenderWithinLobby && this.scenePhase !== 'LOBBY') {
        this.pauseActiveMissionTimers();
        this.lobbySnapshotAstronautIds = [...this.selectedAstronautIds];
        this.lobbySnapshotTotalPads = this.missionTotalPads;
      }
    } else {
      this.stopTriviaCountdownTimer();
      this.dockContainer.removeAll(true);
      this.diceConsoleContainer.removeAll(true);
      this.cutsceneContainer.removeAll(true);
      this.tronBlackoutContainer.removeAll(true);
      this.trajectoryLaserContainer.removeAll(true);
    }

    this.pauseModalContainer.removeAll(true);
    this.pauseModalContainer.setVisible(false);
    this.victoryContainer.removeAll(true);
    this.victoryContainer.setVisible(false);

    this.scenePhase = 'LOBBY';
    this.lobbyContainer.removeAll(true);
    this.lobbyContainer.setVisible(true).setDepth(3800);

    if (isInitialBoot && !this.hasPlayedWelcomeNarration) {
      this.hasPlayedWelcomeNarration = true;
      StarshipAudio.stopAllVoice();
      StarshipAudio.playVoice('welcome_title', () => {
        if (this.scenePhase === 'LOBBY') {
          StarshipAudio.playVoice('lobby_select');
        }
      });
    }

    const scrim = this.add
      .rectangle(640, 360, 1280, 720, 0x030712, 0.84)
      .setInteractive();
    this.lobbyContainer.add(scrim);

    const panelW = 1216;
    const panelH = 644;
    const panelX = 640 - panelW / 2;
    const panelY = 376 - panelH / 2;

    const frameG = this.add.graphics();
    frameG.fillStyle(0x0b1324, 0.96);
    frameG.fillRoundedRect(panelX, panelY, panelW, panelH, 20);
    frameG.lineStyle(3, 0x38bdf8, 0.85);
    frameG.strokeRoundedRect(panelX, panelY, panelW, panelH, 20);
    frameG.lineStyle(1.5, 0xf59e0b, 0.75);
    frameG.strokeRoundedRect(panelX + 6, panelY + 6, panelW - 12, panelH - 12, 16);

    frameG.fillStyle(0x111e36, 0.98);
    frameG.fillRoundedRect(panelX + 14, panelY + 14, panelW - 28, 66, 12);
    frameG.lineStyle(1.5, 0x38bdf8, 0.5);
    frameG.strokeRoundedRect(panelX + 14, panelY + 14, panelW - 28, 66, 12);
    this.lobbyContainer.add(frameG);

    const hasTopRightBtn = isMidGame || Boolean(savedMission);
    const headerCenterX = isMidGame ? 516 : savedMission ? 446 : 640;
    const headerMaxW = isMidGame ? 910 : savedMission ? 760 : 1140;

    const lobbyTitle = this.add
      .text(
        headerCenterX,
        panelY + 33,
        isMidGame
          ? 'LIVE MID-GAME CREW ROSTER — ADD OR REMOVE ASTRONAUTS ON THE FLY'
          : 'STARSHIP UNICORN: ORBITAL TRIVIA — MISSION CONTROL',
        {
          fontFamily: STARSHIP_SCIFI_FONT_FAMILY,
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#f8fafc',
          stroke: '#020617',
          strokeThickness: 3
        }
      )
      .setOrigin(0.5);
    this.fitTextToWidth(lobbyTitle, headerMaxW);

    const lobbySubtitle = this.add
      .text(
        headerCenterX,
        panelY + 59,
        `TAP ASTRONAUT EXOSUIT CARDS TO ASSIGN LAUNCH BAYS P1–P6 (${this.selectedAstronautIds.length}/6 CREW SELECTED — MIN 2, MAX 6)`,
        {
          fontFamily: STARSHIP_SCIFI_FONT_FAMILY,
          fontSize: '11.5px',
          fontStyle: 'bold',
          color: '#38bdf8'
        }
      )
      .setOrigin(0.5);
    this.fitTextToWidth(lobbySubtitle, headerMaxW);
    this.lobbyContainer.add([lobbyTitle, lobbySubtitle]);

    // High-visibility top-right `[ ✕ RESUME MISSION ]` button when mid-game, or
    // prominent glowing emerald `[ 🚀 RESUME SAVED MISSION (IN PROGRESS) ]` button when a saved mission exists!
    if (isMidGame) {
      const resumeTopBtn = this.createCockpitRockerSwitch(
        panelX + panelW - 134,
        panelY + 47,
        220,
        46,
        '✕ RESUME MISSION',
        0xf59e0b,
        () => {
          this.selectedAstronautIds = [...this.lobbySnapshotAstronautIds];
          if (this.missionTotalPads !== this.lobbySnapshotTotalPads) {
            this.missionTotalPads = this.lobbySnapshotTotalPads;
            this.buildAndRenderOrbitalBoard(this.missionTotalPads);
            this.spawnPlayerBoardTokens(false);
            this.refreshAllTokenOffsets();
          }
          this.lobbyContainer.removeAll(true);
          this.lobbyContainer.setVisible(false);
          this.activePlayerIndex = this.activePlayerIndex % Math.max(1, this.players.length);
          this.resumeActiveMissionTimers();
          this.renderTopMissionHeader();
          this.ensureActiveTurnUiVisibleAfterLobbyResume();
        }
      );
      this.lobbyContainer.add(resumeTopBtn);
    } else if (savedMission && hasTopRightBtn) {
      const resumeSavedBtn = this.createCockpitRockerSwitch(
        panelX + panelW - 208,
        panelY + 47,
        376,
        48,
        '[ 🚀 RESUME SAVED MISSION (IN PROGRESS) ]',
        0x10b981,
        () => {
          this.resumeSavedMissionFromStorage(savedMission);
        }
      );
      this.tweens.add({
        targets: resumeSavedBtn,
        scaleX: { from: 1.0, to: 1.03 },
        scaleY: { from: 1.0, to: 1.03 },
        duration: 680,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      this.lobbyContainer.add(resumeSavedBtn);
    }

    const row1Specs = ASTRONAUT_ROSTER.slice(0, 5);
    const row2Specs = ASTRONAUT_ROSTER.slice(5, 10);

    const renderRosterCard = (spec: AstronautRosterSpec, cx: number, cy: number) => {
      const slotIdx = this.selectedAstronautIds.indexOf(spec.id);
      const isSelected = slotIdx !== -1;
      const baySpec = isSelected ? PLAYER_BAY_COLORS[slotIdx] : null;

      const cardContainer = this.add.container(cx, cy);
      const cardW = 202;
      const cardH = 212;

      const bgG = this.add.graphics();
      if (isSelected && baySpec) {
        bgG.fillStyle(baySpec.color, 0.22);
        bgG.fillRoundedRect(-cardW / 2 - 4, -cardH / 2 - 4, cardW + 8, cardH + 8, 16);
        bgG.lineStyle(3.2, baySpec.color, 1);
        bgG.strokeRoundedRect(-cardW / 2 - 2, -cardH / 2 - 2, cardW + 4, cardH + 4, 15);
      } else {
        bgG.fillStyle(spec.isAI ? 0x1f0612 : 0x0f172a, 0.82);
        bgG.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 14);
        bgG.lineStyle(spec.isAI ? 2.2 : 1.5, spec.isAI ? 0xff2255 : 0x475569, spec.isAI ? 0.9 : 0.65);
        bgG.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 14);
      }
      cardContainer.add(bgG);

      const cardTexKey = `starship-card-${spec.id}`;
      if (this.textures.exists(cardTexKey)) {
        this.textures.get(cardTexKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
        const cardImg = this.add
          .image(0, -10, cardTexKey)
          .setOrigin(0.5, 0.5)
          .setDisplaySize(166, 186);
        if (!isSelected) {
          cardImg.setAlpha(0.76);
        }
        cardContainer.add(cardImg);
      }

      const tierLabel = spec.isAI
        ? 'ROGUE AUTO-A.I.'
        : spec.tier === 'WYATT_4YO'
        ? 'AGE 4 ASTRO-RANGER'
        : spec.tier === 'EMMA_3YO'
        ? 'AGE 3 SPACE PRINCESS'
        : spec.id === 'nana'
        ? "SHIP'S COUNSELOR"
        : 'COMMANDER TRIVIA';
      const tierPill = this.add.graphics();
      tierPill.fillStyle(0x090f1d, 0.94);
      tierPill.fillRoundedRect(-84, 79, 168, 22, 8);
      tierPill.lineStyle(
        1.4,
        isSelected && baySpec ? baySpec.color : spec.isAI ? 0xff2255 : 0x64748b,
        0.9
      );
      tierPill.strokeRoundedRect(-84, 79, 168, 22, 8);
      const tierTxt = this.add
        .text(0, 90, tierLabel, {
          fontFamily: STARSHIP_SCIFI_FONT_FAMILY,
          fontSize: '9.5px',
          fontStyle: 'bold',
          color: isSelected && baySpec ? baySpec.hex : spec.isAI ? '#ff6b8b' : '#94a3b8'
        })
        .setOrigin(0.5);
      this.fitTextToWidth(tierTxt, 154);
      cardContainer.add([tierPill, tierTxt]);

      // Glowing `[ AUTO-AI ]` top-left badge on Dread-Bot's card
      if (spec.isAI) {
        const aiBadge = this.add.container(-52, -84);
        const aiG = this.add.graphics();
        aiG.fillStyle(0x881337, 0.96);
        aiG.fillRoundedRect(-42, -12, 84, 24, 7);
        aiG.lineStyle(1.8, 0xff2255, 1);
        aiG.strokeRoundedRect(-42, -12, 84, 24, 7);
        const aiTxt = this.add
          .text(0, 0, 'AUTO-AI', {
            fontFamily: STARSHIP_SCIFI_FONT_FAMILY,
            fontSize: '9.5px',
            fontStyle: 'bold',
            color: '#ffe4e6'
          })
          .setOrigin(0.5);
        this.fitTextToWidth(aiTxt, 76);
        aiBadge.add([aiG, aiTxt]);
        cardContainer.add(aiBadge);
      }

      if (isSelected && baySpec) {
        const bayBadge = this.add.container(64, -84);
        const bbG = this.add.graphics();
        bbG.fillStyle(baySpec.color, 1);
        bbG.fillRoundedRect(-30, -14, 60, 28, 9);
        bbG.lineStyle(2, 0xffffff, 0.95);
        bbG.strokeRoundedRect(-30, -14, 60, 28, 9);
        const bbTxt = this.add
          .text(0, 0, `✓ ${baySpec.slotLabel}`, {
            fontFamily: STARSHIP_SCIFI_FONT_FAMILY,
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#020617'
          })
          .setOrigin(0.5);
        this.fitTextToWidth(bbTxt, 50);
        bayBadge.add([bbG, bbTxt]);
        cardContainer.add(bayBadge);
      } else {
        const standbyBadge = this.add.container(62, -84);
        const sbG = this.add.graphics();
        sbG.fillStyle(0x1e293b, 0.9);
        sbG.fillRoundedRect(-28, -12, 56, 24, 7);
        sbG.lineStyle(1, 0x64748b, 0.7);
        sbG.strokeRoundedRect(-28, -12, 56, 24, 7);
        const sbTxt = this.add
          .text(0, 0, '+ JOIN', {
            fontFamily: STARSHIP_SCIFI_FONT_FAMILY,
            fontSize: '10px',
            fontStyle: 'bold',
            color: '#cbd5e1'
          })
          .setOrigin(0.5);
        this.fitTextToWidth(sbTxt, 48);
        standbyBadge.add([sbG, sbTxt]);
        cardContainer.add(standbyBadge);
      }

      const hit = this.add
        .zone(0, 0, cardW + 6, cardH + 6)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      cardContainer.add(hit);

      hit.on('pointerover', () => {
        StarshipAudio.playHoverMicroClick();
      });

      hit.on('pointerdown', () => {
        const existingIdx = this.selectedAstronautIds.indexOf(spec.id);
        if (existingIdx !== -1) {
          if (this.selectedAstronautIds.length <= 2) {
            StarshipAudio.playRockerSwitchClick(false);
            Juice.popFloatingLabel(this, cx, cy - 40, 'MIN 2 ASTRONAUTS!', '#f59e0b');
            return;
          }
          this.selectedAstronautIds.splice(existingIdx, 1);
          StarshipAudio.playLobbyToggle(false, existingIdx);
          this.openPreFlightLobby(false, true);
        } else {
          if (this.selectedAstronautIds.length >= 6) {
            StarshipAudio.playRockerSwitchClick(false);
            Juice.popFloatingLabel(this, cx, cy - 40, 'MAX 6 LAUNCH BAYS FULL!', '#f59e0b');
            return;
          }
          this.selectedAstronautIds.push(spec.id);
          StarshipAudio.playLobbyToggle(true, this.selectedAstronautIds.length - 1);
          StarshipAudio.playVoice(spec.turnVoice);
          this.openPreFlightLobby(false, true);
        }
      });

      this.lobbyContainer.add(cardContainer);
    };

    const row1Xs = [196, 418, 640, 862, 1084];
    row1Specs.forEach((spec, idx) => {
      renderRosterCard(spec, row1Xs[idx], panelY + 198);
    });

    const row2Xs = [196, 418, 640, 862, 1084];
    row2Specs.forEach((spec, idx) => {
      renderRosterCard(spec, row2Xs[idx], panelY + 422);
    });

    const bottomY = panelY + 586;

    const isQuick = this.missionTotalPads === 25;
    const toggleBtnW = isMidGame ? 248 : 360;
    const quickX = isMidGame ? 182 : 250;
    const grandX = isMidGame ? 444 : 628;

    const quickBtn = this.createTrajectoryToggleBtn(
      quickX,
      bottomY,
      toggleBtnW,
      64,
      '⚡ QUICK ORBIT (25 PADS)',
      'Fast 5-Sector Expedition • ~12 Min',
      isQuick,
      0x38bdf8,
      () => {
        StarshipAudio.playLobbyToggle(true, 0);
        if (this.missionTotalPads !== 25) {
          this.missionTotalPads = 25;
          this.buildAndRenderOrbitalBoard(this.missionTotalPads);
          this.openPreFlightLobby(false, true);
        }
      }
    );

    const isGrand = this.missionTotalPads === 50;
    const grandBtn = this.createTrajectoryToggleBtn(
      grandX,
      bottomY,
      toggleBtnW,
      64,
      '🚀 GRAND ODYSSEY (50 PADS)',
      'Epic Galactic Voyage • ~25 Min',
      isGrand,
      0xf59e0b,
      () => {
        StarshipAudio.playLobbyToggle(true, 2);
        if (this.missionTotalPads !== 50) {
          this.missionTotalPads = 50;
          this.buildAndRenderOrbitalBoard(this.missionTotalPads);
          this.openPreFlightLobby(false, true);
        }
      }
    );

    if (isMidGame) {
      const restartNewBtn = this.createCockpitRockerSwitch(
        716,
        bottomY,
        264,
        64,
        '🔄 RESTART NEW MISSION',
        0xf59e0b,
        () => {
          this.clearActiveMissionStorage();
          this.pausedTweensSnapshot = [];
          this.stopTriviaCountdownTimer();
          this.initiateMissionLaunch();
        }
      );
      this.lobbyContainer.add(restartNewBtn);
    }

    const launchBtn = this.add.container(isMidGame ? 1044 : 1026, bottomY);
    const lw = isMidGame ? 356 : 384;
    const lh = 66;
    const lg = this.add.graphics();
    // 3D heavy metallic lower bevel
    lg.fillStyle(0x022c22, 0.98);
    lg.fillRoundedRect(-lw / 2, -lh / 2 + 6, lw, lh, 16);
    lg.fillStyle(0x059669, 1);
    lg.fillRoundedRect(-lw / 2, -lh / 2, lw, lh, 16);
    lg.lineStyle(3.5, 0x6ee7b7, 1);
    lg.strokeRoundedRect(-lw / 2, -lh / 2, lw, lh, 16);
    lg.lineStyle(1.5, 0xffffff, 0.8);
    lg.strokeRoundedRect(-lw / 2 + 4, -lh / 2 + 4, lw - 8, lh - 8, 13);

    const launchTitle = this.add
      .text(
        0,
        -8,
        isMidGame ? 'APPLY ROSTER & RESUME' : 'INITIATE LAUNCH SEQUENCE',
        {
          fontFamily: STARSHIP_SCIFI_FONT_FAMILY,
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#064e3b',
          strokeThickness: 3
        }
      )
      .setOrigin(0.5);
    this.fitTextToWidth(launchTitle, lw - 24);

    const launchSub = this.add
      .text(
        0,
        14,
        isMidGame
          ? 'HOT-SWAP CREW & KEEP CURRENT PAD POSITIONS'
          : `RANDOMIZE ORDER & DEPLOY ${this.selectedAstronautIds.length} ASTRONAUTS TO PAD 0`,
        {
          fontFamily: STARSHIP_SCIFI_FONT_FAMILY,
          fontSize: '10.5px',
          fontStyle: 'bold',
          color: '#d1fae5'
        }
      )
      .setOrigin(0.5);
    this.fitTextToWidth(launchSub, lw - 24);

    launchBtn.add([lg, launchTitle, launchSub]);
    this.tweens.add({
      targets: launchBtn,
      scaleX: { from: 1.0, to: 1.03 },
      scaleY: { from: 1.0, to: 1.03 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    Juice.makeTactileButton(
      this,
      launchBtn,
      lw,
      lh,
      () => {
        if (isMidGame) {
          this.applyLiveRosterAndResume();
        } else {
          this.initiateMissionLaunch();
        }
      },
      null
    );
    launchBtn.on('pointerover', () => {
      StarshipAudio.playHoverMicroClick();
    });

    this.lobbyContainer.add([quickBtn, grandBtn, launchBtn]);
  }

  /**
   * Applies live mid-game roster changes without resetting the mission:
   * - Preserves every already-active player on their exact current pad (`padIndex`) and keeps stats.
   * - Spawns any newly added player onto `Pad 0` with their 3D astronaut figurine.
   * - Removes any deselected player's figurine (and advances the turn if the removed player was active).
   */
  private applyLiveRosterAndResume(): void {
    const prevActivePlayer = this.players[this.activePlayerIndex];
    const prevActiveId = prevActivePlayer ? prevActivePlayer.roster.id : null;
    const prevRosterChanged =
      this.selectedAstronautIds.length !== this.lobbySnapshotAstronautIds.length ||
      this.selectedAstronautIds.some((id, idx) => id !== this.lobbySnapshotAstronautIds[idx]);
    const maxPadIdx = Math.max(1, this.boardPads.length - 1);

    const updatedPlayers: ActiveAstronautPlayer[] = this.selectedAstronautIds.map((id, idx) => {
      const existing = this.players.find((p) => p.roster.id === id);
      const roster = ASTRONAUT_ROSTER.find((r) => r.id === id) ?? ASTRONAUT_ROSTER[0];
      const bay = PLAYER_BAY_COLORS[idx % PLAYER_BAY_COLORS.length];
      if (existing) {
        return {
          roster,
          bay,
          padIndex: Math.min(maxPadIdx - 1, existing.padIndex),
          overclockCount: existing.overclockCount,
          correctCount: existing.correctCount
        };
      }
      return {
        roster,
        bay,
        padIndex: 0,
        overclockCount: 0,
        correctCount: 0
      };
    });

    this.players = updatedPlayers;
    this.saveActiveMissionToStorage();
    this.spawnPlayerBoardTokens(false);
    this.refreshAllTokenOffsets();

    this.lobbyContainer.removeAll(true);
    this.lobbyContainer.setVisible(false);

    const newActiveIdx = prevActiveId
      ? this.players.findIndex((p) => p.roster.id === prevActiveId)
      : -1;

    if (newActiveIdx !== -1 && !prevRosterChanged && this.hasRolledThisTurn) {
      this.activePlayerIndex = newActiveIdx % Math.max(1, this.players.length);
      this.renderTopMissionHeader();
      this.refreshAllTokenOffsets();
      this.resumeActiveMissionTimers();
      this.ensureActiveTurnUiVisibleAfterLobbyResume();
    } else {
      // Ensure activePlayerIndex is clamped and re-engage the active turn cleanly so the game NEVER gets stuck on an empty board!
      this.activePlayerIndex =
        newActiveIdx !== -1
          ? newActiveIdx % Math.max(1, this.players.length)
          : this.activePlayerIndex % Math.max(1, this.players.length);
      if (this.introRevealTimer) {
        this.introRevealTimer.remove(false);
        this.introRevealTimer = null;
      }
      this.pausedTweensSnapshot = [];
      this.stopTriviaCountdownTimer();
      this.dockContainer.removeAll(true);
      this.diceConsoleContainer.removeAll(true);
      this.cutsceneContainer.removeAll(true);
      this.tronBlackoutContainer.removeAll(true);
      this.trajectoryLaserContainer.removeAll(true);
      this.renderTopMissionHeader();
      this.refreshAllTokenOffsets();
      this.startPlayerTurn(this.activePlayerIndex);
    }
  }

  /**
   * Guarantees that after closing the Crew Lobby mid-game, if neither the Turn Handoff modal,
   * Trivia Question Drawer, nor Dice Ignition Pod is visible on screen (or if the player has not rolled yet),
   * the active player's turn UI is immediately restored!
   */
  private ensureActiveTurnUiVisibleAfterLobbyResume(): void {
    this.activePlayerIndex = this.activePlayerIndex % Math.max(1, this.players.length);
    const hasHandoffOrCutscene = this.cutsceneContainer.length > 0;
    const hasTriviaDrawer = this.dockContainer.length > 0 && this.dockContainer.visible && this.dockContainer.y <= 50;
    const hasDiceConsole = this.diceConsoleContainer.length > 0;

    if (!hasHandoffOrCutscene && !hasTriviaDrawer && !hasDiceConsole && this.scenePhase !== 'MOVING') {
      if (this.introRevealTimer) {
        this.introRevealTimer.remove(false);
        this.introRevealTimer = null;
      }
      this.startPlayerTurn(this.activePlayerIndex);
    }
  }

  private createTrajectoryToggleBtn(
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    subtitle: string,
    active: boolean,
    accentColor: number,
    onTap: () => void
  ): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x020617, 0.95);
    g.fillRoundedRect(-w / 2, -h / 2 + 5, w, h, 14);
    g.fillStyle(active ? 0x172554 : 0x0f172a, 0.96);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    g.lineStyle(active ? 3 : 1.5, active ? accentColor : 0x475569, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);

    const t1 = this.add
      .text(0, -8, title, {
        fontSize: '14px',
        fontStyle: 'bold',
        color: active ? '#ffffff' : '#cbd5e1'
      })
      .setOrigin(0.5);
    this.fitTextToWidth(t1, w - 22);

    const t2 = this.add
      .text(0, 12, subtitle, {
        fontSize: '10.5px',
        fontStyle: 'bold',
        color: active ? '#fde047' : '#64748b'
      })
      .setOrigin(0.5);
    this.fitTextToWidth(t2, w - 22);

    c.add([g, t1, t2]);
    Juice.makeTactileButton(this, c, w, h, onTap, null);
    c.on('pointerover', () => {
      StarshipAudio.playHoverMicroClick();
    });
    return c;
  }

  private initiateMissionLaunch(): void {
    // Request Android / Pixel Tablet immersive fullscreen so system gesture bars stay hidden
    this.requestImmersiveFullscreen();

    this.missionActive = true;
    this.hasRolledThisTurn = false;
    this.pausedTweensSnapshot = [];
    this.stopTriviaCountdownTimer();
    if (this.introRevealTimer) {
      this.introRevealTimer.remove(false);
      this.introRevealTimer = null;
    }

    // 1. Close the Crew Lobby modal & clear overlays so no invisible scrim ever blocks input
    this.lobbyContainer.removeAll(true);
    this.lobbyContainer.setVisible(false);
    this.pauseModalContainer.removeAll(true);
    this.pauseModalContainer.setVisible(false);
    this.victoryContainer.removeAll(true);
    this.victoryContainer.setVisible(false);
    this.cutsceneContainer.removeAll(true);
    this.tronBlackoutContainer.removeAll(true);
    this.trajectoryLaserContainer.removeAll(true);
    this.diceConsoleContainer.removeAll(true);

    // 2. Keep the Motorized Telemetry Trivia Drawer 100% retracted off-screen (`y = +260`, invisible)
    //    for a full 8,500ms (8.5 seconds) so Emily E.'s launch announcement finishes cleanly and
    //    the entire 1280x720 isometric conveyor board is revealed!
    this.tweens.killTweensOf(this.dockContainer);
    this.dockContainer.removeAll(true);
    this.dockContainer.setPosition(0, 260).setVisible(false);

    // Fisher-Yates shuffle the selected crew roster at mission launch so play order (`1ST`, `2ND`, `3RD`...) is randomized every game!
    this.selectedAstronautIds = this.fisherYatesShuffle(this.selectedAstronautIds);
    this.orbitalChallengeDeck = [];
    this.dreadbotMoveDeck = [];

    this.players = this.selectedAstronautIds.map((id, idx) => {
      const roster = ASTRONAUT_ROSTER.find((r) => r.id === id) ?? ASTRONAUT_ROSTER[0];
      const bay = PLAYER_BAY_COLORS[idx % PLAYER_BAY_COLORS.length];
      return {
        roster,
        bay,
        padIndex: 0,
        overclockCount: 0,
        correctCount: 0
      };
    });

    this.activePlayerIndex = 0;
    this.scenePhase = 'CUTSCENE';
    this.buildAndRenderOrbitalBoard(this.missionTotalPads);
    this.spawnPlayerBoardTokens(true);
    this.renderTopMissionHeader();
    this.saveActiveMissionToStorage();

    // 3. Play `sfx_space_elevator_launch.mp3` + Emily E. Starbase PA Launch Announcement (`vo_mission_launch.mp3`)
    StarshipAudio.playLaunchIgnition();
    StarshipAudio.playPaVoice('vo_mission_launch');
    Juice.burstStars(this, 148, 616, 28, [0x38bdf8, 0xf59e0b, 0xf472b6, 0x10b981]);

    // 4. Show sleek top-center holographic mission banner during the 8.5-second reveal window
    const revealBanner = this.add.container(640, 88).setAlpha(0).setScale(0.92);
    const rbG = this.add.graphics();
    rbG.fillStyle(0x020617, 0.92);
    rbG.fillRoundedRect(-440, -28, 880, 56, 12);
    rbG.lineStyle(2.5, 0x38bdf8, 0.95);
    rbG.strokeRoundedRect(-440, -28, 880, 56, 12);
    rbG.fillStyle(0xf59e0b, 0.95);
    rbG.fillRoundedRect(-426, -28, 140, 4, 2);
    rbG.fillRoundedRect(286, -28, 140, 4, 2);

    const rbTitle = this.add
      .text(0, -7, 'ORBITAL TELEMETRY ONLINE — DEPLOYING CREW TO LAUNCHPAD BAY 0', {
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#020617',
        strokeThickness: 3
      })
      .setOrigin(0.5);
    this.fitTextToWidth(rbTitle, 840);

    const orderPreview = this.players.map((p, i) => `${i + 1}. ${p.roster.name}`).join(' • ');
    const rbSub = this.add
      .text(0, 13, `RANDOMIZED CREW ORDER: ${orderPreview}`, {
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#38bdf8'
      })
      .setOrigin(0.5);
    this.fitTextToWidth(rbSub, 840);

    revealBanner.add([rbG, rbTitle, rbSub]);
    this.cutsceneContainer.add(revealBanner);

    this.tweens.add({
      targets: revealBanner,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 320,
      ease: 'Back.easeOut'
    });

    // 5. After the full 8,500ms (8.5s) board deployment showcase finishes cleanly, open Player 1's Turn Handoff!
    this.introRevealTimer = this.time.delayedCall(8500, () => {
      this.introRevealTimer = null;
      if (!this.scene.isActive() || this.scenePhase === 'LOBBY') return;
      this.cutsceneContainer.removeAll(true);
      this.dockContainer.setPosition(0, 260).setVisible(false);
      this.startPlayerTurn(0);
    });
  }

  // ===========================================================================
  // PHASE C: INTEGRATED 3D ISOMETRIC CONVEYOR BOARD (TRANSLUCENT HOLOGRAM PADS)
  // ===========================================================================

  private buildAndRenderOrbitalBoard(totalPads: 25 | 50): void {
    this.boardContainer.removeAll(true);
    this.biomePropsContainer.removeAll(true);
    this.trajectoryLaserContainer.removeAll(true);
    this.padRimGlowMap.clear();
    this.boardPads = [];

    const colorCycle: PadColorType[] = ['RED', 'BLUE', 'AMBER', 'EMERALD'];

    // Ground-plane 30-degree isometric straightaways & 90-degree banked turns matching `board-isometric-conveyor-world.png`:
    // Snakes flat along the terrain corridors from Pad 0 (Bottom-Left Launchpad) -> Smelter -> Central Depot -> Booster Gantry -> Pad 25 (Top-Right Citadel)
    const isoCorridorWaypoints26: Array<[number, number]> = [
      // Leg 1 (Pads 0..5): Ascending NE along 30° isometric straightaway from Launchpad to Smelter Factory
      [148, 616],
      [176, 540],
      [204, 464],
      [232, 388],
      [260, 312],
      [288, 236],
      // 90° Isometric Corner at Smelter -> Leg 2 (Pads 6..10): Descending SE along 30° isometric straightaway
      [358, 268],
      [412, 326],
      [446, 398],
      [422, 474],
      [398, 550],
      // 90° Isometric Corner at Southern Terrace -> Leg 3 (Pads 11..16): Ascending NE through Central Rover Depot
      [468, 582],
      [538, 542],
      [596, 482],
      [652, 420],
      [708, 358],
      [764, 296],
      // 90° Isometric Corner at North-Central Ridge -> Leg 4 (Pads 17..20): Descending SE toward Booster Gantry
      [832, 328],
      [876, 396],
      [918, 464],
      [968, 512],
      // 90° Isometric Corner at Booster Gantry -> Leg 5 (Pads 21..25): Final Ascending NE Straightaway to Unicorn Citadel
      [1034, 466],
      [1068, 392],
      [1098, 318],
      [1124, 244],
      [1148, 172]
    ];

    // Helper to sample position and local straightaway tangent along the 26 ground-plane corridor points
    const sampleCorridorAtIndex = (padIdx: number, maxPads: 25 | 50) => {
      const floatIdx =
        maxPads === 25
          ? Phaser.Math.Clamp(padIdx, 0, 25)
          : Phaser.Math.Clamp((padIdx / 50) * 25, 0, 25);
      const i0 = Math.min(24, Math.floor(floatIdx));
      const i1 = Math.min(25, i0 + 1);
      const frac = floatIdx - i0;
      const p0 = isoCorridorWaypoints26[i0];
      const p1 = isoCorridorWaypoints26[i1];
      const x = Math.round(Phaser.Math.Linear(p0[0], p1[0], frac));
      const y = Math.round(Phaser.Math.Linear(p0[1], p1[1], frac));

      const dx = p1[0] - p0[0];
      const dy = p1[1] - p0[1];
      const len = Math.max(0.001, Math.hypot(dx, dy));
      return {
        x,
        y,
        tx: dx / len,
        ty: dy / len,
        angle: Math.atan2(dy, dx)
      };
    };

    const padSamples: Array<{ x: number; y: number; tx: number; ty: number; angle: number }> = [];

    for (let padIdx = 0; padIdx <= totalPads; padIdx++) {
      const sample = sampleCorridorAtIndex(padIdx, totalPads);
      padSamples.push(sample);

      const clampedT = padIdx / totalPads;
      const sectorIndex = Math.min(5, Math.floor(clampedT * 5) + 1);
      let padColor: PadColorType = padIdx === 0 ? 'BLUE' : colorCycle[(padIdx - 1) % 4];

      let special: SpecialTileType = 'NONE';
      // Double the Orbital Challenge frequency: 12 squares on 25-pad board (every 2nd pad!), 24 squares on 50-pad board
      const challengePads25 = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 23];
      const challengePads50 = [
        2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48
      ];

      if (totalPads === 25) {
        if (padIdx === 25) {
          padColor = 'RAINBOW';
        }
        if (padIdx === 0) {
          special = 'LAUNCHPAD';
        } else if (padIdx === 25) {
          special = 'CITADEL';
        } else if (challengePads25.includes(padIdx)) {
          special = 'ORBITAL_CHALLENGE';
        }
      } else {
        if (padIdx === 50) {
          padColor = 'RAINBOW';
        }
        if (padIdx === 0) {
          special = 'LAUNCHPAD';
        } else if (padIdx === 50) {
          special = 'CITADEL';
        } else if (challengePads50.includes(padIdx)) {
          special = 'ORBITAL_CHALLENGE';
        }
      }

      this.boardPads.push({
        index: padIdx,
        numberLabel: padIdx,
        x: sample.x,
        y: sample.y,
        sectorIndex,
        padColor,
        special
      });
    }

    // 1. Living Factory Environmental FX (Colored Refinery Smoke Plumes & Rocket Cryo-Steam) + Landmark Plaques
    this.render5SectorBiomeLandmarksAndProps();

    // 2. Flowing Plasma Orbs inside the Ground-Level Parallel Side Plasma Pipe (NO opaque 2D ribbon or sky arches!)
    const pipePts: Phaser.Math.Vector2[] = isoCorridorWaypoints26.map(([wx, wy], idx) => {
      const prev = isoCorridorWaypoints26[Math.max(0, idx - 1)];
      const next = isoCorridorWaypoints26[Math.min(isoCorridorWaypoints26.length - 1, idx + 1)];
      const dx = next[0] - prev[0];
      const dy = next[1] - prev[1];
      const len = Math.max(0.001, Math.hypot(dx, dy));
      const nx = -dy / len;
      const ny = (dx / len) * 0.75;
      return new Phaser.Math.Vector2(wx + nx * 29, wy + ny * 29);
    });

    const sphereColors = [0x22d3ee, 0xc084fc, 0xfbbf24];
    const pipeSpline = new Phaser.Curves.Spline(pipePts);
    for (let s = 0; s < 12; s++) {
      const col = sphereColors[s % sphereColors.length];
      const sphere = this.add
        .image(pipePts[0].x, pipePts[0].y, 'starship-flare-dot')
        .setTint(col)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.26)
        .setAlpha(0.95);
      this.boardContainer.add(sphere);

      const flowState = { prog: s / 12 };
      this.tweens.add({
        targets: flowState,
        prog: flowState.prog + 1,
        duration: 8200,
        repeat: -1,
        onUpdate: () => {
          const wrapped = flowState.prog % 1;
          const pt = pipeSpline.getPoint(wrapped);
          sphere.setPosition(pt.x, pt.y);
        }
      });
    }

    // 3. Translucent Perspective-Matched Isometric Parallelogram/Diamond Hologram Pads (`BlendModes.ADD`)
    //    Fill alpha `0.22`, crisp neon rim alpha `0.75` — painted 3D conveyor rollers remain 100% visible underneath!
    const halfLen = totalPads === 25 ? 24 : 15;
    const halfWid = totalPads === 25 ? 17 : 13;

    for (let i = 0; i < this.boardPads.length; i++) {
      const pad = this.boardPads[i];
      const sample = padSamples[i];
      const padNode = this.add.container(pad.x, pad.y);
      const cSpec = PAD_COLOR_HEX[pad.padColor];
      const isSpecial = pad.special !== 'NONE';

      // Perspective-matched 30° isometric normal & tangent vectors on the ground plane
      const tx = sample.tx * halfLen;
      const ty = sample.ty * halfLen;
      const nx = -sample.ty * halfWid;
      const ny = sample.tx * (halfWid * 0.75);

      const holoQuad =
        i === 0
          ? [
              new Phaser.Geom.Point(0, -20),
              new Phaser.Geom.Point(32, 0),
              new Phaser.Geom.Point(0, 20),
              new Phaser.Geom.Point(-32, 0)
            ]
          : [
              new Phaser.Geom.Point(-tx + nx, -ty + ny),
              new Phaser.Geom.Point(-tx - nx, -ty - ny),
              new Phaser.Geom.Point(tx - nx, ty - ny),
              new Phaser.Geom.Point(tx + nx, ty + ny)
            ];

      // Translucent Holographic Pad Overlay (`BlendModes.ADD`, fill alpha `0.22`, crisp neon rim alpha `0.75`)
      const holoG = this.add.graphics();
      holoG.setBlendMode(Phaser.BlendModes.ADD);
      holoG.fillStyle(cSpec.rim, 0.22);
      holoG.fillPoints(holoQuad, true);
      holoG.lineStyle(isSpecial ? 2.4 : 1.8, cSpec.rim, 0.75);
      holoG.strokePoints(holoQuad, true);

      // Subtle inner isometric holographic corner brackets
      const innerQuad = holoQuad.map((pt) => new Phaser.Geom.Point(pt.x * 0.78, pt.y * 0.78));
      holoG.lineStyle(1.0, 0xffffff, 0.35);
      holoG.strokePoints(innerQuad, true);
      padNode.add(holoG);

      // Dynamic Neon Rim Illumination Graphics (brightens when approached or occupied!)
      const activeRimG = this.add.graphics();
      activeRimG.setBlendMode(Phaser.BlendModes.ADD);
      activeRimG.lineStyle(3.5, 0xfef08a, 0.95);
      activeRimG.strokePoints(holoQuad, true);
      activeRimG.fillStyle(cSpec.rim, 0.32);
      activeRimG.fillPoints(holoQuad, true);
      activeRimG.setAlpha(0);
      padNode.add(activeRimG);
      this.padRimGlowMap.set(pad.index, activeRimG);

      // Animated Scrolling `» »` Light Chevrons inside each translucent isometric pad
      const dirAngle = sample.angle;
      const chevronTxt = this.add
        .text(0, 0, '» »', {
          fontFamily: '"Consolas", "Segoe UI", sans-serif',
          fontSize: totalPads === 25 ? '11px' : '8.5px',
          fontStyle: 'bold',
          color: cSpec.hex
        })
        .setOrigin(0.5)
        .setRotation(dirAngle)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.75);
      padNode.add(chevronTxt);

      const ux = Math.cos(dirAngle) * 5.0;
      const uy = Math.sin(dirAngle) * 3.8;
      this.tweens.add({
        targets: chevronTxt,
        x: { from: -ux, to: ux },
        y: { from: -uy, to: uy },
        alpha: { from: 0.25, to: 0.85 },
        duration: 760,
        repeat: -1,
        ease: 'Linear'
      });

      // Compact, Crisp Holographic Pad Numbers (`00`, `01`, `02`... `25`)
      const stencilNum = String(pad.numberLabel).padStart(2, '0');
      const numTxt = this.add
        .text(0, -1, stencilNum, {
          fontFamily: '"Consolas", "Segoe UI", monospace',
          fontSize: totalPads === 25 ? '11.5px' : '9px',
          fontStyle: 'bold',
          color: i === 0 ? '#fef08a' : '#f8fafc',
          stroke: '#020617',
          strokeThickness: 3
        })
        .setOrigin(0.5);
      padNode.add(numTxt);

      // Unmistakable Animated Holographic Beacons & High-Contrast Floating Pill Badges for Special Pads!
      const createSpecialFloatingPill = (
        label: string,
        offsetY: number,
        fillHex: number,
        rimHex: number,
        textColor: string
      ): Phaser.GameObjects.Container => {
        const pillNode = this.add.container(0, offsetY);
        const txt = this.add
          .text(0, 0, label, {
            fontSize: totalPads === 25 ? '10.5px' : '8.5px',
            fontStyle: 'bold',
            color: textColor,
            stroke: '#020617',
            strokeThickness: 3
          })
          .setOrigin(0.5);
        const pw = Math.max(88, Math.ceil(txt.width) + 20);
        const ph = totalPads === 25 ? 21 : 17;
        const pG = this.add.graphics();
        pG.fillStyle(fillHex, 0.94);
        pG.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, ph / 2);
        pG.lineStyle(2.2, rimHex, 1);
        pG.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, ph / 2);
        pillNode.add([pG, txt]);
        return pillNode;
      };

      if (i === 0) {
        const launchPill = createSpecialFloatingPill(
          '🚀 LAUNCHPAD BAY 0',
          27,
          0x020617,
          0x38bdf8,
          '#7dd3fc'
        );
        padNode.add(launchPill);
      } else if (pad.special === 'CITADEL') {
        const citadelGlow = this.add
          .image(0, -6, 'starship-smooth-glow')
          .setDisplaySize(124, 124)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.8);
        const citadelPill = createSpecialFloatingPill(
          '★ UNICORN CITADEL ★',
          28,
          0x2e1065,
          0xfde047,
          '#fde047'
        );
        padNode.add([citadelGlow, citadelPill]);
      } else if (pad.special === 'ORBITAL_CHALLENGE') {
        // 🛸 ORBITAL CHALLENGE: Spinning cyan-gold Star Trek tactical target ring (`BlendModes.ADD`)
        //    directly on the pad surface (no floating text labels so board art stays 100% clean!).
        const challengeGlow = this.add
          .image(0, 0, 'starship-smooth-glow')
          .setDisplaySize(82, 58)
          .setTint(0x00f5d4)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.68);

        const outerTarget = this.add.graphics();
        outerTarget.setBlendMode(Phaser.BlendModes.ADD);
        outerTarget.lineStyle(3.2, 0x00f5d4, 0.98);
        for (let a = 0; a < 360; a += 90) {
          outerTarget.beginPath();
          outerTarget.arc(
            0,
            0,
            24,
            Phaser.Math.DegToRad(a),
            Phaser.Math.DegToRad(a + 62),
            false
          );
          outerTarget.strokePath();
        }

        const innerTarget = this.add.graphics();
        innerTarget.setBlendMode(Phaser.BlendModes.ADD);
        innerTarget.lineStyle(2.8, 0xfde047, 0.98);
        for (let a = 45; a < 405; a += 90) {
          innerTarget.beginPath();
          innerTarget.arc(
            0,
            0,
            16,
            Phaser.Math.DegToRad(a),
            Phaser.Math.DegToRad(a + 58),
            false
          );
          innerTarget.strokePath();
        }

        this.tweens.add({
          targets: outerTarget,
          angle: 360,
          duration: 1850,
          repeat: -1
        });
        this.tweens.add({
          targets: innerTarget,
          angle: -360,
          duration: 1400,
          repeat: -1
        });

        padNode.add([challengeGlow, outerTarget, innerTarget]);
      }

      this.boardContainer.add(padNode);
    }
  }

  /**
   * Renders Living Factory Environmental FX anchored to the isometric terrain landmarks:
   * 1. Rising tri-color (cyan, emerald, amber) industrial smoke plumes from the 3 tall
   *    Smelter Factory smokestacks at top-left (`(196, 76)`, `(232, 68)`, `(268, 76)`).
   * 2. Venting white cryogenic liquid-oxygen (`LOX`) steam clouds billowing around the base
   *    of the vertical SpaceX rockets on their launch gantries (`(96, 596)` & `(995, 546)`).
   * 3. Dynamically sized glassmorphic sector plaques for the 5 isometric landmarks.
   */
  private render5SectorBiomeLandmarksAndProps(): void {
    // 1. Top-Left FICSIT Smelter Factory: Rising Tri-Color Smoke Plumes from the 3 Smokestacks
    const smokestacks: Array<{ x: number; y: number; tint: number }> = [
      { x: 196, y: 76, tint: 0x22d3ee }, // Cyan stack
      { x: 232, y: 68, tint: 0x10b981 }, // Emerald stack
      { x: 268, y: 76, tint: 0xf59e0b }  // Amber stack
    ];

    smokestacks.forEach((stack, sIdx) => {
      for (let p = 0; p < 5; p++) {
        const puff = this.add
          .image(stack.x, stack.y, 'starship-smoke-puff')
          .setTint(stack.tint)
          .setBlendMode(Phaser.BlendModes.SCREEN)
          .setScale(0.18)
          .setAlpha(0.0);
        this.biomePropsContainer.add(puff);

        this.tweens.add({
          targets: puff,
          x: stack.x + Phaser.Math.Between(-16, 22),
          y: stack.y - Phaser.Math.Between(36, 58),
          scaleX: { from: 0.16, to: 0.56 },
          scaleY: { from: 0.16, to: 0.48 },
          alpha: { from: 0.62, to: 0.0 },
          duration: 2600 + p * 220,
          delay: p * 520 + sIdx * 170,
          repeat: -1,
          ease: 'Sine.easeOut'
        });
      }
    });

    // 2. Vertical Rockets on Launch Gantries: Venting White Cryogenic LOX Steam Clouds
    const rocketBases: Array<{ x: number; y: number; scale: number }> = [
      { x: 102, y: 596, scale: 1.0 }, // Primary bottom-left SpaceX Starship Launchpad
      { x: 998, y: 546, scale: 0.82 } // Secondary mid-right Booster Gantry
    ];

    rocketBases.forEach((rb, rIdx) => {
      for (let c = 0; c < 6; c++) {
        const dir = c % 2 === 0 ? -1 : 1;
        const steam = this.add
          .image(rb.x, rb.y, 'starship-smoke-puff')
          .setTint(0xf8fafc)
          .setScale(0.2 * rb.scale)
          .setAlpha(0.0);
        this.biomePropsContainer.add(steam);

        this.tweens.add({
          targets: steam,
          x: rb.x + dir * Phaser.Math.Between(18, 46) * rb.scale,
          y: rb.y - Phaser.Math.Between(10, 32) * rb.scale,
          scaleX: { from: 0.18 * rb.scale, to: 0.62 * rb.scale },
          scaleY: { from: 0.14 * rb.scale, to: 0.42 * rb.scale },
          alpha: { from: 0.68, to: 0.0 },
          duration: 1900 + c * 180,
          delay: c * 310 + rIdx * 200,
          repeat: -1,
          ease: 'Quad.easeOut'
        });
      }
    });

    // 3. Top-Right Unicorn Citadel Pulsing Starlight Aura
    const citadelBeacon = this.add
      .image(1142, 138, 'starship-smooth-glow')
      .setDisplaySize(130, 130)
      .setTint(0xf472b6)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.5);
    this.biomePropsContainer.add(citadelBeacon);
    this.tweens.add({
      targets: citadelBeacon,
      alpha: { from: 0.3, to: 0.72 },
      scaleX: { from: 0.48, to: 0.68 },
      scaleY: { from: 0.48, to: 0.68 },
      duration: 1900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 4. Dynamically Sized Glassmorphic Sector Landmark Plaques (Sectors 1..5)
    SECTOR_LANDMARKS.forEach((sec) => {
      const titleText = this.add
        .text(0, -5, `${sec.icon} ${sec.title}`, {
          fontSize: '9px',
          fontStyle: 'bold',
          color: sec.hexColor
        })
        .setOrigin(0.5);
      const subText = this.add
        .text(0, 6.5, sec.subtitle, {
          fontSize: '7.5px',
          color: '#cbd5e1'
        })
        .setOrigin(0.5);

      const boxWidth = Math.ceil(Math.max(titleText.width, subText.width) + 44);
      const boxHeight = 30;
      const safeX = Phaser.Math.Clamp(sec.x, boxWidth / 2 + 10, 1280 - boxWidth / 2 - 10);

      const badge = this.add.container(safeX, sec.y);
      const g = this.add.graphics();
      g.fillStyle(0x060c1a, 0.86);
      g.fillRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 8);
      g.lineStyle(1.5, sec.accentColor, 0.88);
      g.strokeRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 8);

      badge.add([g, titleText, subText]);
      this.biomePropsContainer.add(badge);
    });
  }

  // ===========================================================================
  // UPGRADE 5: UPRIGHT 3D-STYLED ASTRONAUT MINIATURES ON ISOMETRIC PEDESTALS
  // ===========================================================================

  private getPerspectiveScaleForY(y: number): number {
    const baseScale = this.missionTotalPads === 25 ? 0.96 : 0.84;
    const depthFactor = 0.88 + 0.16 * Phaser.Math.Clamp(y / 720, 0, 1);
    return baseScale * depthFactor;
  }

  private spawnPlayerBoardTokens(staggerDrop = false): void {
    this.tokensContainer.removeAll(true);

    this.activeHighlightRing = this.add.graphics();
    this.tokensContainer.add(this.activeHighlightRing);

    this.players.forEach((player, idx) => {
      const pos = this.computeTokenWorldPosition(player.padIndex, idx);
      const perspScale = this.getPerspectiveScaleForY(pos.y);
      const root = this.add
        .container(pos.x, staggerDrop ? pos.y - 135 : pos.y)
        .setScale(perspScale)
        .setAlpha(staggerDrop ? 0 : 1);

      if (staggerDrop) {
        this.time.delayedCall(320 + idx * 420, () => {
          if (!this.scene.isActive() || !root.scene) return;
          root.setAlpha(1);
          StarshipAudio.playTokenHop(idx);
          this.tweens.add({
            targets: root,
            y: pos.y,
            duration: 380,
            ease: 'Back.easeOut',
            onComplete: () => {
              if (!this.scene.isActive()) return;
              const shockG = this.add.graphics();
              shockG.setBlendMode(Phaser.BlendModes.ADD);
              shockG.lineStyle(3, player.bay.color, 0.95);
              shockG.strokePoints(
                [
                  new Phaser.Geom.Point(0, -14),
                  new Phaser.Geom.Point(24, 0),
                  new Phaser.Geom.Point(0, 14),
                  new Phaser.Geom.Point(-24, 0)
                ],
                true
              );
              shockG.setPosition(pos.x, pos.y);
              this.tokensContainer.add(shockG);
              this.tweens.add({
                targets: shockG,
                scaleX: 1.85,
                scaleY: 1.85,
                alpha: 0,
                duration: 340,
                onComplete: () => shockG.destroy()
              });
            }
          });
        });
      }

      // 1. Isometric Diamond Ground Drop Shadow right on the conveyor deck plate
      const shadowG = this.add.graphics();
      shadowG.fillStyle(0x010409, 0.8);
      shadowG.fillPoints(
        [
          new Phaser.Geom.Point(0, -8),
          new Phaser.Geom.Point(24, 2),
          new Phaser.Geom.Point(0, 12),
          new Phaser.Geom.Point(-24, 2)
        ],
        true
      );
      root.add(shadowG);

      // 2. Sculpted Figurine Body Container (hovers & leans dynamically during conveyor hops!)
      const figurineBody = this.add.container(0, 0);
      root.add(figurineBody);

      // Dual Jetpack Plasma Flame Emitters underneath pedestal
      const flameLeft = this.add
        .image(-10, 2, 'starship-flare-dot')
        .setTint(player.bay.color)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.28);
      const flameRight = this.add
        .image(10, 2, 'starship-flare-dot')
        .setTint(0xfde047)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.28);
      figurineBody.add([flameLeft, flameRight]);

      this.tweens.add({
        targets: [flameLeft, flameRight],
        scaleY: { from: 0.2, to: 0.42 },
        alpha: { from: 0.55, to: 0.95 },
        duration: 280 + idx * 35,
        yoyo: true,
        repeat: -1
      });

      // 3. Perspective-Matched Isometric Pedestal Base + Upright Armored Exosuit Figurine Frame
      const pedG = this.add.graphics();
      // Lower 3D isometric diamond pedestal skirt
      const isoBaseBot = [
        new Phaser.Geom.Point(0, -9),
        new Phaser.Geom.Point(22, 0),
        new Phaser.Geom.Point(0, 9),
        new Phaser.Geom.Point(-22, 0)
      ];
      const isoBaseTop = [
        new Phaser.Geom.Point(0, -14),
        new Phaser.Geom.Point(19, -5),
        new Phaser.Geom.Point(0, 4),
        new Phaser.Geom.Point(-19, -5)
      ];
      pedG.fillStyle(0x0f172a, 0.98);
      pedG.fillPoints(isoBaseBot, true);
      pedG.lineStyle(2, player.bay.color, 0.98);
      pedG.strokePoints(isoBaseBot, true);

      pedG.fillStyle(0x334155, 0.98);
      pedG.fillPoints(isoBaseTop, true);
      pedG.lineStyle(1.4, 0xffffff, 0.7);
      pedG.strokePoints(isoBaseTop, true);

      // Upright 3D Exosuit Shoulder Pauldrons & Torso Shield Backing (`y: -6` up to `-56`)
      pedG.fillStyle(0x090f1d, 0.96);
      pedG.fillRoundedRect(-23, -55, 46, 48, 14);
      pedG.lineStyle(3, player.bay.color, 1);
      pedG.strokeRoundedRect(-23, -55, 46, 48, 14);
      pedG.lineStyle(1.2, 0xffffff, 0.6);
      pedG.strokeRoundedRect(-20, -52, 40, 42, 11);

      // Glowing 3D Antenna / Crown Crest on top of the figurine (`y: -55` up to `-66`)
      pedG.lineStyle(2.5, player.bay.color, 1);
      pedG.lineBetween(0, -55, 0, -64);
      pedG.fillStyle(0xfef08a, 1);
      pedG.fillCircle(0, -65, 3.5);
      figurineBody.add(pedG);

      // 4. High-Res Astronaut Portrait mounted inside the upright 3D Exosuit Figurine Shield
      const tokKey = `starship-token-${player.roster.id}`;
      if (this.textures.exists(tokKey)) {
        this.textures.get(tokKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
        const tokImg = this.add
          .image(0, -31, tokKey)
          .setOrigin(0.5, 0.5)
          .setDisplaySize(40, 40);
        figurineBody.add(tokImg);
      }

      // 5. Front Pedestal Nameplate Plaque (`P1 WYATT`)
      const tagG = this.add.graphics();
      tagG.fillStyle(0x020617, 0.95);
      tagG.fillRoundedRect(-31, -4, 62, 15, 5);
      tagG.lineStyle(1.4, player.bay.color, 1);
      tagG.strokeRoundedRect(-31, -4, 62, 15, 5);
      const tagTxt = this.add
        .text(0, 3.5, `${player.bay.slotLabel} ${player.roster.name}`, {
          fontSize: '8px',
          fontStyle: 'bold',
          color: '#ffffff'
        })
        .setOrigin(0.5);
      this.fitTextToWidth(tagTxt, 56);
      figurineBody.add([tagG, tagTxt]);

      // Gentle idle hover bob so every standing figurine feels alive on the conveyor belt
      this.tweens.add({
        targets: figurineBody,
        y: { from: 0, to: -4 },
        duration: 1100 + idx * 130,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      root.setDepth(100 + Math.floor(pos.y));
      player.tokenContainer = root;
      player.figurineBody = figurineBody;
      this.tokensContainer.add(root);
    });

    this.tokensContainer.sort('y');
  }

  private computeTokenWorldPosition(padIndex: number, playerSlotIdx: number): { x: number; y: number } {
    const clampedIdx = Phaser.Math.Clamp(padIndex, 0, this.boardPads.length - 1);
    const pad = this.boardPads[clampedIdx] ?? { x: 168, y: 604 };

    const occupants = this.players
      .map((p, idx) => ({ p, idx }))
      .filter((item) => item.p.padIndex === clampedIdx);

    if (occupants.length <= 1) {
      return { x: pad.x, y: pad.y - 2 };
    }

    const myOrder = Math.max(0, occupants.findIndex((item) => item.idx === playerSlotIdx));

    const clusterOffsets: Record<number, Array<[number, number]>> = {
      2: [
        [-24, -7],
        [24, 7]
      ],
      3: [
        [-28, -14],
        [28, -14],
        [0, 14]
      ],
      4: [
        [-28, -18],
        [28, -18],
        [-28, 14],
        [28, 14]
      ],
      5: [
        [-40, -18],
        [0, -22],
        [40, -18],
        [-24, 16],
        [24, 16]
      ],
      6: [
        [-42, -20],
        [0, -24],
        [42, -20],
        [-42, 16],
        [0, 20],
        [42, 16]
      ]
    };

    const preset = clusterOffsets[occupants.length];
    if (preset && preset[myOrder]) {
      const [dx, dy] = preset[myOrder];
      const safeX = Math.max(66, Math.min(1214, pad.x + dx));
      return {
        x: Math.round(safeX),
        y: Math.round(pad.y + dy)
      };
    }

    const angle = (myOrder / occupants.length) * Math.PI * 2 - Math.PI / 2;
    const spreadRadius = 30;
    return {
      x: Math.round(pad.x + Math.cos(angle) * spreadRadius),
      y: Math.round(pad.y - 4 + Math.sin(angle) * (spreadRadius * 0.72))
    };
  }

  private refreshAllTokenOffsets(): void {
    // Illuminate occupied conveyor deck plates
    this.padRimGlowMap.forEach((rimG, padIdx) => {
      const isOccupied = this.players.some((p) => p.padIndex === padIdx);
      rimG.setAlpha(isOccupied ? 0.85 : 0);
    });

    this.players.forEach((p, idx) => {
      if (!p.tokenContainer) return;
      const target = this.computeTokenWorldPosition(p.padIndex, idx);
      const targetScale = this.getPerspectiveScaleForY(target.y);
      this.tweens.add({
        targets: p.tokenContainer,
        x: target.x,
        y: target.y,
        scaleX: targetScale,
        scaleY: targetScale,
        duration: 240,
        ease: 'Quad.easeOut',
        onUpdate: () => {
          if (p.tokenContainer) {
            p.tokenContainer.setDepth(100 + Math.floor(p.tokenContainer.y));
          }
        },
        onComplete: () => {
          if (p.tokenContainer) {
            p.tokenContainer.setDepth(100 + Math.floor(p.tokenContainer.y));
          }
          this.tokensContainer.sort('y');
        }
      });
      p.tokenContainer.setDepth(100 + Math.floor(target.y));
    });

    this.tokensContainer.sort('y');

    const activePlayer = this.players[this.activePlayerIndex];
    if (activePlayer && activePlayer.tokenContainer && this.activeHighlightRing) {
      this.activeHighlightRing.clear();
      this.activeHighlightRing.lineStyle(3, activePlayer.bay.color, 0.92);
      this.activeHighlightRing.strokePoints(
        [
          new Phaser.Geom.Point(0, -14),
          new Phaser.Geom.Point(28, 0),
          new Phaser.Geom.Point(0, 14),
          new Phaser.Geom.Point(-28, 0)
        ],
        true
      );
      this.activeHighlightRing.setPosition(
        activePlayer.tokenContainer.x,
        activePlayer.tokenContainer.y + 2
      );
    }
  }


  // ===========================================================================
  // UPGRADE 2: HEAVY INDUSTRIAL FICSIT SWITCHGEAR ANSWER BUTTONS & 750MS LOCK-IN
  // ===========================================================================

  private startPlayerTurn(playerIdx: number): void {
    if (!this.players.length) return;
    this.activePlayerIndex = playerIdx % this.players.length;
    const player = this.players[this.activePlayerIndex];

    this.stopTriviaCountdownTimer();
    this.hasRolledThisTurn = false;
    this.lastAnswerWasOverclock = false;
    this.currentQuestion = this.drawNonRepeatingQuestion(player.roster.tier);
    this.saveActiveMissionToStorage();

    // Keep the Trivia Question Drawer retracted off-screen until the player taps `[ 🖖 ENGAGE TELEMETRY QUESTION ]`!
    this.tweens.killTweensOf(this.dockContainer);
    this.dockContainer.removeAll(true);
    this.dockContainer.setPosition(0, 260).setVisible(false);
    this.diceConsoleContainer.removeAll(true);
    this.cutsceneContainer.removeAll(true);
    this.tronBlackoutContainer.removeAll(true);
    this.trajectoryLaserContainer.removeAll(true);
    this.players.forEach((p) => {
      if (p.tokenContainer) {
        p.tokenContainer.setAlpha(1);
      }
    });

    this.renderTopMissionHeader();
    this.refreshAllTokenOffsets();

    // Pulse active player figurine on the board
    if (player.tokenContainer) {
      this.tweens.add({
        targets: player.tokenContainer,
        scaleX: { from: 1.0, to: 1.15 },
        scaleY: { from: 1.0, to: 1.15 },
        duration: 280,
        yoyo: true,
        repeat: 1,
        ease: 'Quad.easeOut'
      });
    }

    // Play ONLY the short Role + Name voice clip (`vo_turn_[id].mp3?v=3`)
    try {
      StarshipAudio.playVoice(player.roster.turnVoice);
    } catch {
      // Never block UI if voice clip fails
    }

    // Present the Star Trek LCARS Turn Handoff Screen before sliding up the Trivia Question Drawer!
    this.showStarTrekTurnHandoffScreen(player);
  }

  /**
   * Displays the Star Trek LCARS Turn Handoff Screen framed inside `ui-startrek-command-deck.png`
   * at the start of every player's turn so the family can hand the iPad to the next player
   * before the question & 15-second timer begin!
   */
  private showStarTrekTurnHandoffScreen(player: ActiveAstronautPlayer): void {
    this.scenePhase = 'TURN_HANDOFF';
    this.cutsceneContainer.removeAll(true);

    const shade = this.add
      .rectangle(640, 360, 1280, 720, 0x020617, 0.62)
      .setInteractive();
    const deckRoot = this.add.container(640, 368).setScale(0.9).setAlpha(0);
    this.cutsceneContainer.add([shade, deckRoot]);

    if (this.textures.exists('ui-startrek-command-deck')) {
      this.textures.get('ui-startrek-command-deck').setFilter(Phaser.Textures.FilterMode.LINEAR);
      const frameImg = this.add
        .image(0, 0, 'ui-startrek-command-deck')
        .setDisplaySize(940, 520);
      deckRoot.add(frameImg);
    } else {
      const fallbackG = this.add.graphics();
      fallbackG.fillStyle(0x070d1b, 0.96);
      fallbackG.fillRoundedRect(-460, -250, 920, 500, 22);
      fallbackG.lineStyle(3.5, player.bay.color, 1);
      fallbackG.strokeRoundedRect(-460, -250, 920, 500, 22);
      deckRoot.add(fallbackG);
    }

    const isAIPlayer = Boolean(player.roster.isAI);

    // Header: `🛸 COMMAND PAD HANDOFF: [PLAYER ROLE & NAME]` (or Rogue A.I. Override for Dread-Bot)
    const handoffTitle = this.add
      .text(
        0,
        -176,
        isAIPlayer
          ? `⚠️ ROGUE A.I. OVERRIDE: ${player.roster.callsign}`
          : `🛸 COMMAND PAD HANDOFF: ${player.roster.callsign}`,
        {
          fontSize: '23px',
          fontStyle: 'bold',
          color: isAIPlayer ? '#ff2255' : '#fde047',
          stroke: '#020617',
          strokeThickness: 5
        }
      )
      .setOrigin(0.5);
    this.fitTextToWidth(handoffTitle, 760);

    // Subtitle: `CURRENT POSITION: PAD [X] ([Y] PADS TO CITADEL)`
    const padsToGo = Math.max(0, this.missionTotalPads - player.padIndex);
    const handoffSub = this.add
      .text(
        0,
        -136,
        `CURRENT POSITION: PAD ${player.padIndex} (${padsToGo} ${padsToGo === 1 ? 'PAD' : 'PADS'} TO CITADEL)`,
        {
          fontSize: '15px',
          fontStyle: 'bold',
          color: '#38bdf8'
        }
      )
      .setOrigin(0.5);
    this.fitTextToWidth(handoffSub, 740);
    deckRoot.add([handoffTitle, handoffSub]);

    // Active Player's Large Spacesuit Portrait in a Glowing Hexagonal Frame (`y: -14`)
    const hexY = -14;
    const hexRx = 82;
    const hexRy = 76;
    const hexPts: Phaser.Geom.Point[] = [
      new Phaser.Geom.Point(0, hexY - hexRy),
      new Phaser.Geom.Point(hexRx, hexY - hexRy * 0.5),
      new Phaser.Geom.Point(hexRx, hexY + hexRy * 0.5),
      new Phaser.Geom.Point(0, hexY + hexRy),
      new Phaser.Geom.Point(-hexRx, hexY + hexRy * 0.5),
      new Phaser.Geom.Point(-hexRx, hexY - hexRy * 0.5)
    ];

    const hexGlow = this.add
      .image(0, hexY, 'starship-smooth-glow')
      .setDisplaySize(210, 195)
      .setTint(isAIPlayer ? 0xff2255 : player.bay.color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.55);
    deckRoot.add(hexGlow);

    const hexBgG = this.add.graphics();
    hexBgG.fillStyle(0x090f1d, 0.98);
    hexBgG.fillPoints(hexPts, true);
    deckRoot.add(hexBgG);

    const cardKey = `starship-card-${player.roster.id}`;
    const astroKey = `starship-astro-${player.roster.id}`;
    const resolvedKey = this.textures.exists(cardKey) ? cardKey : astroKey;
    if (this.textures.exists(resolvedKey)) {
      this.textures.get(resolvedKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
      const portImg = this.add
        .image(0, hexY, resolvedKey)
        .setDisplaySize(148, 162);
      deckRoot.add(portImg);
    }

    const hexRimG = this.add.graphics();
    hexRimG.lineStyle(4, isAIPlayer ? 0xff2255 : player.bay.color, 1);
    hexRimG.strokePoints(hexPts, true);
    const innerHexPts = hexPts.map(
      (pt) => new Phaser.Geom.Point(pt.x * 0.92, hexY + (pt.y - hexY) * 0.92)
    );
    hexRimG.lineStyle(1.8, 0xffffff, 0.85);
    hexRimG.strokePoints(innerHexPts, true);
    deckRoot.add(hexRimG);

    const tierInfo = isAIPlayer
      ? '🤖 AUTONOMOUS NEMESIS PROTOCOL • RELENTLESS 1–4 PAD THRUSTER ADVANCE!'
      : player.roster.tier === 'ADULT'
      ? '⚡ 15-SECOND TELEMETRY TIMER • CORRECT = ROLL 1x DIE (1–6 PADS)'
      : '🌟 ∞ NO TIME LIMIT • TAKE YOUR TIME & PICK THE RIGHT ANSWER!';
    const tierInfoTxt = this.add
      .text(0, 92, tierInfo, {
        fontSize: '13px',
        fontStyle: 'bold',
        color: isAIPlayer ? '#ff6b8b' : player.roster.tier === 'ADULT' ? '#7dd3fc' : '#6ee7b7'
      })
      .setOrigin(0.5);
    this.fitTextToWidth(tierInfoTxt, 740);
    deckRoot.add(tierInfoTxt);

    const proceedFromHandoffToTrivia = () => {
      if (this.scenePhase !== 'TURN_HANDOFF') return;
      this.scenePhase = isAIPlayer ? 'DICE_ROLL' : 'TRIVIA';
      this.tweens.add({
        targets: [deckRoot, shade],
        alpha: 0,
        duration: 180,
        onComplete: () => {
          this.cutsceneContainer.removeAll(true);
          if (!this.scene.isActive()) return;
          const activeQ =
            this.currentQuestion ?? this.drawNonRepeatingQuestion(player.roster.tier);
          this.currentQuestion = activeQ;
          if (isAIPlayer) {
            // Skip the Trivia Question Drawer completely for Autonomous Dread-Bot X-99
            // and go straight to the 3D Thruster Die Overlay (1, 2, 3, or 4 spaces every turn)!
            player.correctCount += 1;
            player.overclockCount += 1;
            this.dockContainer.removeAll(true);
            this.dockContainer.setPosition(0, 260).setVisible(false);
            this.renderOrbitalDiceRollDock(player, activeQ, true);
          } else {
            this.dockContainer.setPosition(0, 260).setVisible(true);
            this.renderTelemetryTriviaDock(player, activeQ);
          }
        }
      });
    };

    // Large, Tactile Glowing Star Trek LCARS Button: `[ 🖖 ENGAGE TELEMETRY QUESTION ]`
    // (or pulsing crimson status bar for Autonomous Dread-Bot that auto-advances after 3400ms so `vo_turn_dreadbot.mp3` finishes completely!)
    const readyBtn = this.createCockpitRockerSwitch(
      0,
      158,
      620,
      68,
      isAIPlayer
        ? '🤖 DREAD-BOT X-99 OVERRIDING COMMAND BRIDGE...'
        : '[ 🖖 ENGAGE TELEMETRY QUESTION ]',
      isAIPlayer ? 0xff2255 : 0x10b981,
      () => {
        if (!isAIPlayer) {
          proceedFromHandoffToTrivia();
        }
      }
    );
    deckRoot.add(readyBtn);

    if (isAIPlayer) {
      this.tweens.add({
        targets: readyBtn,
        alpha: { from: 1.0, to: 0.55 },
        duration: 320,
        yoyo: true,
        repeat: -1
      });
      this.time.delayedCall(3400, () => {
        if (this.scene.isActive() && this.scenePhase === 'TURN_HANDOFF') {
          proceedFromHandoffToTrivia();
        }
      });
    }

    this.tweens.add({
      targets: deckRoot,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 240,
      ease: 'Back.easeOut'
    });
  }

  private drawNonRepeatingQuestion(tier: TriviaProfileTier): TriviaQuestionItem {
    return drawNextStarshipQuestion(tier);
  }

  /**
   * Cancels any active Kid Question/Option read-aloud sequence, stops voice playback immediately,
   * clears pending highlight timers, and resets any highlighted card back to `scale: 1.0`.
   */
  private cancelKidReadAloudSequence(): void {
    this.kidReadAloudToken += 1;
    if (this.kidReadAloudTimer) {
      this.kidReadAloudTimer.remove(false);
      this.kidReadAloudTimer = null;
    }
    if (this.kidReadAloudResetVisuals) {
      try {
        this.kidReadAloudResetVisuals();
      } catch {
        // Ignore if display objects were already destroyed
      }
      this.kidReadAloudResetVisuals = null;
    }
    StarshipAudio.stopAllVoice();
  }

  /**
   * Renders the Motorized Sliding FICSIT Telemetry Trivia Drawer (`y: 472..710`).
   * - During `TRIVIA` phase: smoothly slides up from off-screen (`y: 260 -> 0`, `350ms` Cubic.easeOut).
   * - For Kids (`wyatt` & `emma`): renders 2 Giant Side-by-Side Option Cards (`LEFT CARD` and `RIGHT CARD`)
   *   with a `[ 🔊 REPLAY ]` button and synchronized Emily E. Question -> Left Card -> Right Card read-aloud & highlighting!
   * - For Commanders (Adults): renders 4 Answer Cards with the 15-Second Red Alert Countdown.
   * - As soon as Answer Lock-In finishes: automatically retracts down off-screen (`y: 0 -> 260`, `400ms`)
   *   so 100% of the 1280x720 isometric factory board is unobstructed during `ROLL` & `MOVE`!
   */
  private renderTelemetryTriviaDock(
    player: ActiveAstronautPlayer,
    question: TriviaQuestionItem
  ): void {
    this.stopTriviaCountdownTimer();
    this.cancelKidReadAloudSequence();
    this.tweens.killTweensOf(this.dockContainer);
    const wasRetracted = this.dockContainer.y > 10;
    this.dockContainer.removeAll(true);
    this.dockContainer.setVisible(true).setAlpha(1).setDepth(860);
    this.diceConsoleContainer.removeAll(true);
    this.diceConsoleContainer.setPosition(0, 0);

    const isKidsTier =
      Boolean(question.isKidQuestion) ||
      player.roster.id === 'wyatt' ||
      player.roster.id === 'emma' ||
      player.roster.tier !== 'ADULT';

    // 1. Upper Question Telemetry Console (`y: 468..582` for Kids, `y: 472..598` for Commanders)
    const consoleTopY = isKidsTier ? 464 : 472;
    const consoleH = isKidsTier ? 118 : 124;

    const dockG = this.add.graphics();
    // 3D lower metallic chassis lip
    dockG.fillStyle(0x020617, 0.96);
    dockG.fillRoundedRect(18, consoleTopY + 4, 1244, consoleH, 14);
    // Main gunmetal glassmorphic console
    dockG.fillStyle(0x070d1b, 0.95);
    dockG.fillRoundedRect(18, consoleTopY, 1244, consoleH, 14);
    dockG.lineStyle(2.5, player.bay.color, 0.92);
    dockG.strokeRoundedRect(18, consoleTopY, 1244, consoleH, 14);
    this.dockContainer.add(dockG);

    // Subtle Cyan Glow Border around the Question Box during Step 1 Question Read-Aloud!
    const questionBoxGlowG = this.add.graphics().setAlpha(0);
    questionBoxGlowG.setBlendMode(Phaser.BlendModes.ADD);
    questionBoxGlowG.fillStyle(0x00f5d4, 0.14);
    questionBoxGlowG.fillRoundedRect(18, consoleTopY, 1244, consoleH, 14);
    questionBoxGlowG.lineStyle(4.5, 0x00ffff, 1);
    questionBoxGlowG.strokeRoundedRect(18, consoleTopY, 1244, consoleH, 14);
    this.dockContainer.add(questionBoxGlowG);

    // Crimson Red-Alert Border Overlay on the Trivia Drawer (flashes at <= 5s remaining for Commanders)
    const redAlertDockBorderG = this.add.graphics().setAlpha(0);
    redAlertDockBorderG.lineStyle(4.5, 0xef4444, 1);
    redAlertDockBorderG.strokeRoundedRect(18, consoleTopY, 1244, consoleH, 14);
    this.dockContainer.add(redAlertDockBorderG);

    // Top Horizontal 15-Second Countdown Progress Bar (`x: 34..1246`)
    const reactorTrackW = 1212;
    const reactorTrackG = this.add.graphics();
    reactorTrackG.fillStyle(0x020617, 0.95);
    reactorTrackG.fillRoundedRect(34, consoleTopY + 3, reactorTrackW, 6, 3);
    const reactorBarFill = this.add
      .rectangle(34, consoleTopY + 6, reactorTrackW, 6, 0x00f5d4, 0.96)
      .setOrigin(0, 0.5);
    this.dockContainer.add([reactorTrackG, reactorBarFill]);

    // Left Hexagonal Spacesuit Portrait + Name Badge Underneath
    const hexX = 88;
    const hexY = consoleTopY + 50;
    const hexRx = 45;
    const hexRy = 38;
    const hexPts: Phaser.Geom.Point[] = [
      new Phaser.Geom.Point(hexX, hexY - hexRy),
      new Phaser.Geom.Point(hexX + hexRx, hexY - hexRy * 0.5),
      new Phaser.Geom.Point(hexX + hexRx, hexY + hexRy * 0.5),
      new Phaser.Geom.Point(hexX, hexY + hexRy),
      new Phaser.Geom.Point(hexX - hexRx, hexY + hexRy * 0.5),
      new Phaser.Geom.Point(hexX - hexRx, hexY - hexRy * 0.5)
    ];

    const portBgG = this.add.graphics();
    portBgG.fillStyle(0x0f172a, 0.98);
    portBgG.fillPoints(hexPts, true);
    this.dockContainer.add(portBgG);

    const tokenKey = `starship-token-${player.roster.id}`;
    const cardKey = `starship-card-${player.roster.id}`;
    const resolvedPortKey = this.textures.exists(tokenKey) ? tokenKey : cardKey;
    if (this.textures.exists(resolvedPortKey)) {
      this.textures.get(resolvedPortKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
      const portImg = this.add
        .image(hexX, hexY, resolvedPortKey)
        .setDisplaySize(72, 72);
      this.dockContainer.add(portImg);
    }

    const namePillY = consoleTopY + consoleH - 27;
    const portRimG = this.add.graphics();
    portRimG.lineStyle(2.8, player.bay.color, 1);
    portRimG.strokePoints(hexPts, true);
    // Name badge pill underneath hexagonal portrait
    portRimG.fillStyle(0x020617, 0.96);
    portRimG.fillRoundedRect(hexX - 48, namePillY, 96, 21, 6);
    portRimG.lineStyle(1.8, player.bay.color, 0.95);
    portRimG.strokeRoundedRect(hexX - 48, namePillY, 96, 21, 6);
    this.dockContainer.add(portRimG);

    const nameBadgeTxt = this.add
      .text(hexX, namePillY + 10.5, player.roster.name, {
        fontSize: '11px',
        fontStyle: 'bold',
        color: player.bay.hex
      })
      .setOrigin(0.5);
    this.fitTextToWidth(nameBadgeTxt, 86);
    this.dockContainer.add(nameBadgeTxt);

    // Question Text: Vertically centered to the right of the portrait in large, ultra-crisp 22px–25px font!
    const qFontSize =
      question.prompt.length > 95 ? '22px' : question.prompt.length > 65 ? '23.5px' : '25px';
    const promptTxt = this.add
      .text(162, consoleTopY + consoleH * 0.54, question.prompt, {
        fontSize: qFontSize,
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#020617',
        strokeThickness: 3,
        lineSpacing: 5,
        wordWrap: { width: isKidsTier ? 810 : 975 }
      })
      .setOrigin(0, 0.5);
    if (promptTxt.height > 90) {
      promptTxt.setScale(90 / promptTxt.height);
    }
    this.dockContainer.add(promptTxt);

    // Clean, Compact Top-Right Timer Readout (`15s` for Commander Tier, `∞ NO TIME LIMIT` for Kids Tier)
    const badgeW = isKidsTier ? 142 : 88;
    const badgeX = isKidsTier ? 1178 : 1204;
    const badgeY = consoleTopY + 30;
    const timerBadgeContainer = this.add.container(badgeX, badgeY);
    const timerBadgeG = this.add.graphics();
    const drawTimerBadgeBox = (borderColor: number, bgFill = 0x020617) => {
      timerBadgeG.clear();
      timerBadgeG.fillStyle(bgFill, 0.96);
      timerBadgeG.fillRoundedRect(-badgeW / 2, -15, badgeW, 30, 8);
      timerBadgeG.lineStyle(2, borderColor, 0.96);
      timerBadgeG.strokeRoundedRect(-badgeW / 2, -15, badgeW, 30, 8);
    };
    drawTimerBadgeBox(isKidsTier ? 0x10b981 : 0x00f5d4);

    if (isKidsTier) {
      reactorBarFill.setFillStyle(0x10b981, 0.96);
    }

    const timerBadgeTxt = this.add
      .text(0, 0, isKidsTier ? '∞ NO TIME LIMIT' : '15s', {
        fontSize: isKidsTier ? '11px' : '15px',
        fontStyle: 'bold',
        color: isKidsTier ? '#6ee7b7' : '#00f5d4'
      })
      .setOrigin(0.5);
    this.fitTextToWidth(timerBadgeTxt, badgeW - 14);
    timerBadgeContainer.add([timerBadgeG, timerBadgeTxt]);
    this.dockContainer.add(timerBadgeContainer);

    if (isKidsTier) {
      // =====================================================================
      // KIDS TIER (`wyatt` & `emma`):
      // 1. Compact `[ 🔊 REPLAY ]` button next to `∞ NO TIME LIMIT`
      // 2. 2 Giant Side-by-Side Choice Cards (`LEFT CARD` & `RIGHT CARD`, ~576x118 each, 26px–28px text)
      // 3. Synchronized Emily E. Question -> Left Card -> Right Card Read-Aloud & Golden-Cyan Highlighting!
      // =====================================================================
      const kidCards: Array<{
        switchRoot: Phaser.GameObjects.Container;
        highlightOverlay: Phaser.GameObjects.Container;
      }> = [];

      const kidThemes = [
        { rimColor: 0x38bdf8, fillMid: 0x0c4a6e }, // Left Card: Starlight Cyan
        { rimColor: 0xf472b6, fillMid: 0x4c1d95 }  // Right Card: Nebula Rose-Violet
      ];

      const kidOptions =
        Array.isArray(question.options) && question.options.length >= 2
          ? [question.options[0], question.options[1]]
          : ['✨ Option 1', '🌟 Option 2'];

      const padW = 576;
      const padH = 118;
      const padGap = 52;
      const startX = 640 - (padW + padGap) / 2;
      const baseY = 649;

      kidOptions.forEach((optLabel, idx) => {
        const cx = startX + idx * (padW + padGap);
        const theme = kidThemes[idx % kidThemes.length];
        const switchRoot = this.add.container(cx, baseY);

        // 3D Lower Shadow / Bevel Lip
        const baseLipG = this.add.graphics();
        baseLipG.fillStyle(0x010409, 0.95);
        baseLipG.fillRoundedRect(-padW / 2 - 2, -padH / 2 + 8, padW + 4, padH, 16);
        baseLipG.fillStyle(0x020617, 1);
        baseLipG.fillRoundedRect(-padW / 2, -padH / 2 + 6, padW, padH, 15);
        baseLipG.lineStyle(2, 0x1e293b, 0.95);
        baseLipG.strokeRoundedRect(-padW / 2, -padH / 2 + 6, padW, padH, 15);
        switchRoot.add(baseLipG);

        // Movable Upper Cockpit Button Cap
        const capContainer = this.add.container(0, 0);
        switchRoot.add(capContainer);

        const capG = this.add.graphics();
        capG.fillStyle(0x0f172a, 0.98);
        capG.fillRoundedRect(-padW / 2, -padH / 2, padW, padH, 15);
        capG.fillStyle(theme.fillMid, 0.42);
        capG.fillRoundedRect(-padW / 2 + 4, -padH / 2 + 4, padW - 8, padH - 8, 12);
        capG.fillStyle(0xffffff, 0.09);
        capG.fillRoundedRect(-padW / 2 + 10, -padH / 2 + 6, padW - 20, 20, 6);
        capG.lineStyle(3.2, theme.rimColor, 0.98);
        capG.strokeRoundedRect(-padW / 2, -padH / 2, padW, padH, 15);
        capContainer.add(capG);

        // Bright Glowing Golden-Cyan Star Trek Read-Aloud Highlight Overlay (`0x00ffff` / `0xffd700`, `lineWidth: 5`)
        const highlightOverlay = this.add.container(0, 0).setVisible(false);
        const hlG = this.add.graphics();
        hlG.fillStyle(0x00f5d4, 0.24);
        hlG.fillRoundedRect(-padW / 2, -padH / 2, padW, padH, 15);
        hlG.lineStyle(6, 0x00ffff, 0.98);
        hlG.strokeRoundedRect(-padW / 2 - 2, -padH / 2 - 2, padW + 4, padH + 4, 16);
        hlG.lineStyle(4, 0xffd700, 1);
        hlG.strokeRoundedRect(-padW / 2 + 4, -padH / 2 + 4, padW - 8, padH - 8, 12);
        highlightOverlay.add(hlG);
        capContainer.add(highlightOverlay);

        // Huge 26px–28px Bold Text + Large Emoji Icon
        const optTxt = this.add
          .text(0, 0, optLabel, {
            fontSize: '27px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#020617',
            strokeThickness: 4,
            align: 'center',
            wordWrap: { width: padW - 44 }
          })
          .setOrigin(0.5);
        this.fitTextToWidth(optTxt, padW - 44);
        if (optTxt.height * optTxt.scaleY > padH - 22) {
          const s = (padH - 22) / optTxt.height;
          optTxt.setScale(Math.min(optTxt.scaleX, s));
        }

        // Hidden Amber Telemetry Lock-In Scanner Overlay (activates for 750ms when tapped!)
        const scannerOverlay = this.add.container(0, 0).setVisible(false);
        const scanBorderG = this.add.graphics();
        scanBorderG.lineStyle(4.5, 0xfbbf24, 1);
        scanBorderG.strokeRoundedRect(-padW / 2 + 2, -padH / 2 + 2, padW - 4, padH - 4, 14);
        const scanBeamG = this.add.graphics();
        scanBeamG.fillStyle(0xfbbf24, 0.35);
        scanBeamG.fillRoundedRect(-padW / 2 + 8, -14, padW - 16, 28, 5);
        scannerOverlay.add([scanBorderG, scanBeamG]);

        capContainer.add([optTxt, scannerOverlay]);

        const hit = this.add
          .rectangle(0, 0, padW, padH, 0x000000, 0.001)
          .setInteractive({ useHandCursor: true });
        switchRoot.add(hit);

        hit.on('pointerover', () => {
          if (this.scenePhase === 'TRIVIA') {
            StarshipAudio.playHoverMicroClick();
          }
        });

        hit.on('pointerdown', () => {
          if (this.scenePhase !== 'TRIVIA') return;
          this.scenePhase = 'LOCKING_ANSWER';
          this.stopTriviaCountdownTimer();
          this.cancelKidReadAloudSequence();

          this.tweens.add({
            targets: capContainer,
            y: 5,
            duration: 75,
            ease: 'Quad.easeOut'
          });

          StarshipAudio.playPadLockIn(idx);

          scannerOverlay.setVisible(true);
          scanBeamG.y = -padH / 2 + 20;
          this.tweens.add({
            targets: scanBeamG,
            y: padH / 2 - 20,
            duration: 360,
            yoyo: true,
            repeat: 1,
            ease: 'Sine.easeInOut'
          });

          this.time.delayedCall(750, () => {
            if (!this.scene.isActive()) return;
            this.handleTriviaSelection(idx, player, question, switchRoot);
          });
        });

        this.dockContainer.add(switchRoot);
        kidCards.push({ switchRoot, highlightOverlay });
      });

      const startSynchronizedKidReadAloud = () => {
        if (!this.scene.isActive() || this.scenePhase !== 'TRIVIA') return;
        this.cancelKidReadAloudSequence();
        const myToken = this.kidReadAloudToken;

        const setCardHighlight = (cardIdx: 0 | 1, active: boolean) => {
          const item = kidCards[cardIdx];
          if (!item || !item.switchRoot.scene) return;
          this.tweens.killTweensOf(item.switchRoot);
          item.highlightOverlay.setVisible(active);
          this.tweens.add({
            targets: item.switchRoot,
            scaleX: active ? 1.05 : 1.0,
            scaleY: active ? 1.05 : 1.0,
            duration: 180,
            ease: active ? 'Back.easeOut' : 'Sine.easeOut'
          });
        };

        const resetAllVisuals = () => {
          if (questionBoxGlowG && questionBoxGlowG.scene) {
            this.tweens.killTweensOf(questionBoxGlowG);
            questionBoxGlowG.setAlpha(0);
          }
          setCardHighlight(0, false);
          setCardHighlight(1, false);
        };
        this.kidReadAloudResetVisuals = resetAllVisuals;

        const qAudioUrl = question.questionAudioUrl ?? `/assets/sfx/starship/kids/${question.id}_q.mp3`;
        const leftAudioUrl =
          question.optionAudioUrls?.[0] ?? `/assets/sfx/starship/kids/${question.id}_a.mp3`;
        const rightAudioUrl =
          question.optionAudioUrls?.[1] ?? `/assets/sfx/starship/kids/${question.id}_b.mp3`;

        // Step 1: Read Question Aloud (`kid_XX_q.mp3`) while pulsing cyan glow around Question Box
        questionBoxGlowG.setAlpha(0.35);
        this.tweens.add({
          targets: questionBoxGlowG,
          alpha: { from: 0.25, to: 0.92 },
          duration: 460,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });

        StarshipAudio.playKidClipUrl(qAudioUrl, () => {
          if (!this.scene.isActive() || this.scenePhase !== 'TRIVIA' || this.kidReadAloudToken !== myToken) {
            return;
          }
          this.tweens.killTweensOf(questionBoxGlowG);
          questionBoxGlowG.setAlpha(0);

          // Step 2: Highlight LEFT Card (`scale: 1.05`, Golden-Cyan border) & Read Left Option
          setCardHighlight(0, true);
          setCardHighlight(1, false);

          StarshipAudio.playKidClipUrl(leftAudioUrl, () => {
            if (!this.scene.isActive() || this.scenePhase !== 'TRIVIA' || this.kidReadAloudToken !== myToken) {
              return;
            }
            // Restore Left Card after reading & pause 250ms before highlighting Right Card
            setCardHighlight(0, false);

            this.kidReadAloudTimer = this.time.delayedCall(250, () => {
              this.kidReadAloudTimer = null;
              if (!this.scene.isActive() || this.scenePhase !== 'TRIVIA' || this.kidReadAloudToken !== myToken) {
                return;
              }
              // Step 3: Highlight RIGHT Card (`scale: 1.05`, Golden-Cyan border) & Read Right Option
              setCardHighlight(1, true);

              StarshipAudio.playKidClipUrl(rightAudioUrl, () => {
                if (!this.scene.isActive() || this.kidReadAloudToken !== myToken) {
                  return;
                }
                // Step 4: Restore both cards to normal interactive state
                setCardHighlight(0, false);
                setCardHighlight(1, false);
              });
            });
          });
        });
      };

      // Compact `[ 🔊 REPLAY ]` button inside the top-right of the Kid Question Box (next to `∞ NO TIME LIMIT`)
      const replayBtn = this.createSleekHeaderButton(
        1042,
        badgeY,
        114,
        30,
        '🔊 REPLAY',
        0x00f5d4,
        () => {
          if (this.scenePhase === 'TRIVIA') {
            startSynchronizedKidReadAloud();
          }
        }
      );
      this.dockContainer.add(replayBtn);

      if (wasRetracted) {
        StarshipAudio.playDrawerSlide(true);
        this.dockContainer.setPosition(0, 260);
        this.tweens.add({
          targets: this.dockContainer,
          y: 0,
          duration: 360,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            if (this.scene.isActive() && this.scenePhase === 'TRIVIA') {
              startSynchronizedKidReadAloud();
            }
          }
        });
      } else {
        this.dockContainer.setPosition(0, 0);
        startSynchronizedKidReadAloud();
      }
      return;
    }

    // 2. COMMANDER TIER (ADULTS & ROGUE A.I. DREAD-BOT): Four Sleek, High-Contrast Star Trek / SpaceX Cockpit Answer Buttons (`y: 606..710`)
    const isAIPlayer = Boolean(player.roster.isAI);
    if (isAIPlayer) {
      // Pulsing Crimson Status Banner for Dread-Bot X-99
      drawTimerBadgeBox(0xff2255, 0x4c0519);
      timerBadgeTxt.setText('🤖 AUTO-AI');
      timerBadgeTxt.setColor('#ffe4e6');
      this.fitTextToWidth(timerBadgeTxt, badgeW - 10);
      reactorBarFill.setFillStyle(0xff2255, 0.96);

      const aiBanner = this.add.container(640, consoleTopY - 18);
      const aiBannerG = this.add.graphics();
      aiBannerG.fillStyle(0x4c0519, 0.96);
      aiBannerG.fillRoundedRect(-260, -15, 520, 30, 8);
      aiBannerG.lineStyle(2.5, 0xff2255, 1);
      aiBannerG.strokeRoundedRect(-260, -15, 520, 30, 8);
      const aiBannerTxt = this.add
        .text(0, 0, '🤖 DREAD-BOT SCANNING TELEMETRY...', {
          fontSize: '13.5px',
          fontStyle: 'bold',
          color: '#ffe4e6'
        })
        .setOrigin(0.5);
      this.fitTextToWidth(aiBannerTxt, 496);
      aiBanner.add([aiBannerG, aiBannerTxt]);
      this.dockContainer.add(aiBanner);
      this.tweens.add({
        targets: aiBanner,
        alpha: { from: 1.0, to: 0.48 },
        duration: 320,
        yoyo: true,
        repeat: -1
      });
    }

    const safeOptions =
      Array.isArray(question.options) && question.options.length >= 4
        ? question.options
        : ['Option A', 'Option B', 'Option C', 'Option D'];

    const padW = 298;
    const padH = 92;
    const padGap = 16;
    const startX = 18 + padW / 2;
    const baseY = 654;

    const commanderButtons: Array<{
      switchRoot: Phaser.GameObjects.Container;
      capContainer: Phaser.GameObjects.Container;
      scannerOverlay: Phaser.GameObjects.Container;
      scanBeamG: Phaser.GameObjects.Graphics;
      aiTargetG: Phaser.GameObjects.Graphics;
      lockInAnswer: () => void;
    }> = [];

    OPTION_PAD_COLORS.forEach((theme, idx) => {
      const cx = startX + idx * (padW + padGap);
      const switchRoot = this.add.container(cx, baseY);

      // Fixed 3D Lower Shadow / Bevel Lip (stays anchored while cap depresses `y + 5px`)
      const baseLipG = this.add.graphics();
      baseLipG.fillStyle(0x010409, 0.95);
      baseLipG.fillRoundedRect(-padW / 2 - 2, -padH / 2 + 8, padW + 4, padH, 13);
      baseLipG.fillStyle(0x020617, 1);
      baseLipG.fillRoundedRect(-padW / 2, -padH / 2 + 6, padW, padH, 12);
      baseLipG.lineStyle(2, 0x1e293b, 0.95);
      baseLipG.strokeRoundedRect(-padW / 2, -padH / 2 + 6, padW, padH, 12);
      switchRoot.add(baseLipG);

      // Movable Upper Cockpit Button Cap (physically depresses `y + 5px` when locked in!)
      const capContainer = this.add.container(0, 0);
      switchRoot.add(capContainer);

      const capG = this.add.graphics();
      // Sleek Star Trek / SpaceX dark metallic cockpit button chassis
      capG.fillStyle(0x0f172a, 0.98);
      capG.fillRoundedRect(-padW / 2, -padH / 2, padW, padH, 12);
      capG.fillStyle(0x111c33, 0.96);
      capG.fillRoundedRect(-padW / 2 + 4, -padH / 2 + 4, padW - 8, padH - 8, 9);
      // Subtle top glass specular highlight
      capG.fillStyle(0xffffff, 0.08);
      capG.fillRoundedRect(-padW / 2 + 8, -padH / 2 + 6, padW - 16, 16, 5);
      // Crisp high-contrast neon border
      capG.lineStyle(2.5, theme.rimColor, 0.96);
      capG.strokeRoundedRect(-padW / 2, -padH / 2, padW, padH, 12);
      capContainer.add(capG);

      // Crimson AI Targeting Reticle Overlay (cycles across buttons during Dread-Bot's 1800ms scan)
      const aiTargetG = this.add.graphics().setVisible(false);
      aiTargetG.fillStyle(0xff2255, 0.28);
      aiTargetG.fillRoundedRect(-padW / 2, -padH / 2, padW, padH, 12);
      aiTargetG.lineStyle(5, 0xff2255, 1);
      aiTargetG.strokeRoundedRect(-padW / 2 - 2, -padH / 2 - 2, padW + 4, padH + 4, 13);
      capContainer.add(aiTargetG);

      // ONLY the Large, Centered Answer Text (and Emoji Icon) Inside (`22px–24px` bold)
      const optLabel = safeOptions[idx] ?? '';
      const optFontSize = optLabel.length > 22 ? '22px' : '24px';
      const optTxt = this.add
        .text(0, 0, optLabel, {
          fontSize: optFontSize,
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#020617',
          strokeThickness: 3,
          align: 'center',
          wordWrap: { width: padW - 28 }
        })
        .setOrigin(0.5);
      this.fitTextToWidth(optTxt, padW - 28);
      if (optTxt.height * optTxt.scaleY > padH - 18) {
        const s = (padH - 18) / optTxt.height;
        optTxt.setScale(Math.min(optTxt.scaleX, s));
      }

      // Hidden Amber Telemetry Lock-In Scanner Overlay (activates for 750ms when tapped!)
      const scannerOverlay = this.add.container(0, 0).setVisible(false);
      const scanBorderG = this.add.graphics();
      scanBorderG.lineStyle(4, 0xfbbf24, 1);
      scanBorderG.strokeRoundedRect(-padW / 2 + 2, -padH / 2 + 2, padW - 4, padH - 4, 11);
      const scanBeamG = this.add.graphics();
      scanBeamG.fillStyle(0xfbbf24, 0.35);
      scanBeamG.fillRoundedRect(-padW / 2 + 6, -12, padW - 12, 24, 4);
      scannerOverlay.add([scanBorderG, scanBeamG]);

      capContainer.add([optTxt, scannerOverlay]);

      const lockInAnswer = () => {
        if (this.scenePhase !== 'TRIVIA') return;
        this.scenePhase = 'LOCKING_ANSWER';
        this.stopTriviaCountdownTimer();
        commanderButtons.forEach((b) => b.aiTargetG.setVisible(false));

        // 1. Physical Hydraulic Press: depress switchgear cap `y + 5px` (collapsing its 3D lower bevel!)
        this.tweens.add({
          targets: capContainer,
          y: 5,
          duration: 75,
          ease: 'Quad.easeOut'
        });

        // 2. Fire heavy industrial breaker-switch slam + 750ms Geiger/radar telemetry lock-in ticks
        StarshipAudio.playPadLockIn(idx);

        // 3. Flash sweeping amber scanner bar for 750ms of game-show suspense!
        scannerOverlay.setVisible(true);
        scanBeamG.y = -padH / 2 + 18;
        this.tweens.add({
          targets: scanBeamG,
          y: padH / 2 - 18,
          duration: 360,
          yoyo: true,
          repeat: 1,
          ease: 'Sine.easeInOut'
        });

        this.time.delayedCall(750, () => {
          if (!this.scene.isActive()) return;
          this.handleTriviaSelection(idx, player, question, switchRoot);
        });
      };

      // Interactive Hit Area (disabled during Dread-Bot's autonomous turn!)
      if (!isAIPlayer) {
        const hit = this.add
          .rectangle(0, 0, padW, padH, 0x000000, 0.001)
          .setInteractive({ useHandCursor: true });
        switchRoot.add(hit);

        hit.on('pointerover', () => {
          if (this.scenePhase === 'TRIVIA') {
            StarshipAudio.playHoverMicroClick();
          }
        });

        hit.on('pointerdown', () => {
          lockInAnswer();
        });
      }

      this.dockContainer.add(switchRoot);
      commanderButtons.push({
        switchRoot,
        capContainer,
        scannerOverlay,
        scanBeamG,
        aiTargetG,
        lockInAnswer
      });
    });

    const startDreadBotAutoScan = () => {
      if (!this.scene.isActive() || this.scenePhase !== 'TRIVIA') return;
      let cycleTick = 0;
      const cycleEvent = this.time.addEvent({
        delay: 220,
        repeat: 9,
        callback: () => {
          if (!this.scene.isActive() || this.scenePhase !== 'TRIVIA') {
            cycleEvent.remove(false);
            return;
          }
          const highlightIdx = cycleTick % commanderButtons.length;
          commanderButtons.forEach((btn, bIdx) => {
            btn.aiTargetG.setVisible(bIdx === highlightIdx);
          });
          StarshipAudio.playHoverMicroClick();
          cycleTick += 1;
        }
      });

      this.time.delayedCall(2400, () => {
        if (!this.scene.isActive() || this.scenePhase !== 'TRIVIA') return;
        cycleEvent.remove(false);
        // 55% chance Dread-Bot picks the correct answer, 45% chance of picking a random wrong answer
        const pickCorrect = Math.random() < 0.55;
        let chosenIdx = question.correctIndex;
        if (!pickCorrect) {
          const wrongIndices = [0, 1, 2, 3].filter((i) => i !== question.correctIndex);
          chosenIdx = Phaser.Utils.Array.GetRandom(wrongIndices) ?? 0;
        }
        commanderButtons.forEach((btn, bIdx) => {
          btn.aiTargetG.setVisible(bIdx === chosenIdx);
        });
        const targetBtn = commanderButtons[chosenIdx] ?? commanderButtons[0];
        targetBtn?.lockInAnswer();
      });
    };

    // Guarantee `dockContainer` is at `y = 0` during `TRIVIA` (slides back up from `+260` after reveal or `ROLL`/`MOVE`)
    // Start the 15-Second Orbital Telemetry Countdown for Human Commander Tier, or Auto-Scan for Dread-Bot!
    if (wasRetracted) {
      StarshipAudio.playDrawerSlide(true);
      this.dockContainer.setPosition(0, 260);
      this.tweens.add({
        targets: this.dockContainer,
        y: 0,
        duration: 360,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          if (this.scene.isActive() && this.scenePhase === 'TRIVIA' && !isKidsTier) {
            if (isAIPlayer) {
              startDreadBotAutoScan();
            } else {
              this.startTriviaCountdownTimer(
                player,
                question,
                reactorBarFill,
                timerBadgeTxt,
                drawTimerBadgeBox,
                redAlertDockBorderG
              );
            }
          }
        }
      });
    } else {
      this.dockContainer.setPosition(0, 0);
      if (!isKidsTier) {
        if (isAIPlayer) {
          startDreadBotAutoScan();
        } else {
          this.startTriviaCountdownTimer(
            player,
            question,
            reactorBarFill,
            timerBadgeTxt,
            drawTimerBadgeBox,
            redAlertDockBorderG
          );
        }
      }
    }
  }

  private stopTriviaCountdownTimer(): void {
    this.cancelKidReadAloudSequence();
    if (this.triviaCountdownEvent) {
      this.triviaCountdownEvent.remove(false);
      this.triviaCountdownEvent = null;
    }
    if (this.triviaCountdownTween) {
      this.triviaCountdownTween.stop();
      this.triviaCountdownTween = null;
    }
    StarshipAudio.stopRedAlertKlaxon();
    if (this.redAlertVignetteContainer) {
      this.tweens.killTweensOf(this.redAlertVignetteContainer);
      this.redAlertVignetteContainer.removeAll(true);
      this.redAlertVignetteContainer.setAlpha(1);
    }
  }

  private startTriviaCountdownTimer(
    player: ActiveAstronautPlayer,
    question: TriviaQuestionItem,
    reactorBarFill: Phaser.GameObjects.Rectangle,
    timerBadgeTxt: Phaser.GameObjects.Text,
    drawTimerBadgeBox: (borderColor: number, bgFill?: number) => void,
    redAlertDockBorderG: Phaser.GameObjects.Graphics
  ): void {
    this.stopTriviaCountdownTimer();

    let secondsRemaining = 15;

    // Smooth continuous bar shrink from 1.0 -> 0.0 over 15,000ms
    this.triviaCountdownTween = this.tweens.add({
      targets: reactorBarFill,
      scaleX: 0,
      duration: 15000,
      ease: 'Linear'
    });

    this.triviaCountdownEvent = this.time.addEvent({
      delay: 1000,
      repeat: 14,
      callback: () => {
        if (!this.scene.isActive() || this.scenePhase !== 'TRIVIA') {
          this.stopTriviaCountdownTimer();
          return;
        }

        secondsRemaining -= 1;

        if (secondsRemaining >= 6) {
          // 15s -> 6s: Smooth transition from Neon Cyan (`#00f5d4`) to Amber (`#f59e0b`)
          const t = Phaser.Math.Clamp((15 - secondsRemaining) / 9, 0, 1);
          const colObj = Phaser.Display.Color.Interpolate.ColorWithColor(
            new Phaser.Display.Color(0, 245, 212),
            new Phaser.Display.Color(245, 158, 11),
            100,
            Math.round(t * 100)
          );
          const hexNum = Phaser.Display.Color.GetColor(colObj.r, colObj.g, colObj.b);
          const hexStr = `#${hexNum.toString(16).padStart(6, '0')}`;

          reactorBarFill.setFillStyle(hexNum, 0.96);
          drawTimerBadgeBox(hexNum);
          timerBadgeTxt.setText(`${secondsRemaining}s`);
          timerBadgeTxt.setColor(hexStr);
          this.fitTextToWidth(timerBadgeTxt, 76);
        } else if (secondsRemaining >= 1) {
          // 5s -> 1s: ENGAGE STAR TREK "RED ALERT" BRIDGE MODE!
          if (secondsRemaining === 5) {
            StarshipAudio.playPaVoice('vo_red_alert');
          }
          StarshipAudio.playRedAlertKlaxon();
          this.pulseRedAlertBridgeVignette();

          reactorBarFill.setFillStyle(0xef4444, 1);
          drawTimerBadgeBox(0xef4444, 0x450a0a);
          timerBadgeTxt.setText(`🚨 ${secondsRemaining}s`);
          timerBadgeTxt.setColor('#fecaca');
          this.fitTextToWidth(timerBadgeTxt, 76);

          redAlertDockBorderG.setAlpha(1);
          this.tweens.add({
            targets: redAlertDockBorderG,
            alpha: { from: 1.0, to: 0.2 },
            duration: 480,
            yoyo: true
          });
        } else {
          // 0s: TELEMETRY WINDOW EXPIRED -> Play `sfx_timer_expired.mp3` & pass turn after Verdict Screen!
          this.stopTriviaCountdownTimer();
          this.scenePhase = 'LOCKING_ANSWER';
          StarshipAudio.playTimerExpired();

          reactorBarFill.setScale(0, 1);
          drawTimerBadgeBox(0xef4444, 0x450a0a);
          timerBadgeTxt.setText('0s');
          timerBadgeTxt.setColor('#fca5a5');
          this.fitTextToWidth(timerBadgeTxt, 76);

          this.time.delayedCall(450, () => {
            if (!this.scene.isActive()) return;
            this.handleTriviaSelection(-1, player, question);
          });
        }
      }
    });
  }

  private pulseRedAlertBridgeVignette(): void {
    this.redAlertVignetteContainer.removeAll(true);
    const g = this.add.graphics();
    g.setBlendMode(Phaser.BlendModes.ADD);
    // Outer crimson emergency bridge lighting frame & corner glow
    g.fillStyle(0xef4444, 1);
    g.fillRect(0, 52, 1280, 26);
    g.fillRect(0, 694, 1280, 26);
    g.fillRect(0, 52, 28, 668);
    g.fillRect(1252, 52, 28, 668);
    g.lineStyle(8, 0xef4444, 1);
    g.strokeRect(4, 56, 1272, 660);
    g.setAlpha(0);
    this.redAlertVignetteContainer.add(g);

    this.tweens.add({
      targets: g,
      alpha: { from: 0.0, to: 0.28 },
      duration: 460,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        g.destroy();
      }
    });
  }

  private createCockpitRockerSwitch(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    accentHex: number,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const lipG = this.add.graphics();
    lipG.fillStyle(0x020617, 0.95);
    lipG.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 9);
    c.add(lipG);

    const cap = this.add.container(0, 0);
    const g = this.add.graphics();
    g.fillStyle(0x1e293b, 0.98);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 9);
    g.fillStyle(accentHex, 0.35);
    g.fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 7);
    g.lineStyle(2, accentHex, 0.95);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 9);

    const txt = this.add
      .text(0, 0, label, {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#f8fafc'
      })
      .setOrigin(0.5);
    this.fitTextToWidth(txt, w - 22);
    cap.add([g, txt]);
    c.add(cap);

    const hit = this.add
      .rectangle(0, 0, w, h, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => {
      StarshipAudio.playHoverMicroClick();
    });
    hit.on('pointerdown', () => {
      StarshipAudio.playRockerSwitchClick(true);
      this.tweens.add({
        targets: cap,
        y: 3,
        duration: 70,
        yoyo: true
      });
      onClick();
    });
    c.add(hit);
    return c;
  }

  private handleTriviaSelection(
    selectedIndex: number,
    player: ActiveAstronautPlayer,
    question: TriviaQuestionItem,
    chosenPadContainer?: Phaser.GameObjects.Container
  ): void {
    this.stopTriviaCountdownTimer();
    StarshipAudio.stopVoice();

    const isSkipOrTimeout = selectedIndex < 0;
    const isCorrect = !isSkipOrTimeout && selectedIndex === question.correctIndex;
    this.lastAnswerWasOverclock = isCorrect;

    const retractDrawerAndContinue = () => {
      if (!this.scene.isActive()) return;
      StarshipAudio.playDrawerSlide(false);
      this.tweens.killTweensOf(this.dockContainer);
      this.tweens.add({
        targets: this.dockContainer,
        y: 260,
        duration: 360,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          this.dockContainer.removeAll(true);
          if (!this.scene.isActive()) return;
          if (isCorrect) {
            // RIGHT ANSWER -> Open 1x Standard Die Ignition Pod (1–6 spaces)!
            this.renderOrbitalDiceRollDock(player, question, true);
          } else {
            // WRONG ANSWER or TIMEOUT -> Thrusters offline this turn; advance directly to next player!
            this.finishTurnAndAdvancePlayer();
          }
        }
      });
    };

    if (isCorrect) {
      player.correctCount += 1;
      player.overclockCount += 1;
      StarshipAudio.playAnswerCorrectFanfare();
      StarshipAudio.playPaVoice('vo_verdict_correct');
      if (chosenPadContainer) {
        Juice.burstStars(this, chosenPadContainer.x, chosenPadContainer.y, 26, [
          0x10b981,
          0xfde047,
          0x38bdf8
        ]);
      }
    } else {
      StarshipAudio.playAnswerWrongBuzzer();
      StarshipAudio.playPaVoice('vo_verdict_wrong');
    }

    this.showStarTrekTacticalVerdictOverlay(
      player,
      question,
      isCorrect,
      retractDrawerAndContinue
    );
  }

  /**
   * Displays a 2.2-second Star Trek Bridge Tactical Verdict Screen framed by `ui-startrek-command-deck.png`
   * so every player in the living room immediately sees & hears whether the answer was RIGHT or WRONG!
   */
  private showStarTrekTacticalVerdictOverlay(
    player: ActiveAstronautPlayer,
    question: TriviaQuestionItem,
    isCorrect: boolean,
    onDone: () => void
  ): void {
    this.cutsceneContainer.removeAll(true);

    const correctOptionText =
      question.options[question.correctIndex] ?? question.options[0] ?? ' VERIFIED';

    const shade = this.add
      .rectangle(640, 360, 1280, 720, 0x020617, 0.55)
      .setInteractive();
    const deck = this.add.container(640, 290).setScale(0.86).setAlpha(0);
    this.cutsceneContainer.add([shade, deck]);

    if (this.textures.exists('ui-startrek-command-deck')) {
      this.textures.get('ui-startrek-command-deck').setFilter(Phaser.Textures.FilterMode.LINEAR);
      const deckImg = this.add
        .image(0, 0, 'ui-startrek-command-deck')
        .setDisplaySize(860, 380);
      deck.add(deckImg);
    }

    const accentColor = isCorrect ? 0x10b981 : 0xef4444;
    const secondaryColor = isCorrect ? 0xfbbf24 : 0xef4444;

    // Glowing LCARS Status Diagnostic Bar inside the Command Deck Frame
    const lcarsBar = this.add.graphics();
    lcarsBar.lineStyle(4, accentColor, 0.96);
    lcarsBar.strokeRoundedRect(-378, -146, 756, 292, 18);
    lcarsBar.fillStyle(accentColor, 0.22);
    lcarsBar.fillRoundedRect(-368, -138, 736, 48, 12);
    deck.add(lcarsBar);

    this.tweens.add({
      targets: lcarsBar,
      alpha: { from: 1.0, to: 0.45 },
      duration: 360,
      yoyo: true,
      repeat: 4
    });

    // Left Player Portrait inside LCARS Frame (`x: -272, y: 12`)
    const cardKey = `starship-card-${player.roster.id}`;
    if (this.textures.exists(cardKey)) {
      this.textures.get(cardKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
      const portImg = this.add
        .image(-272, 14, cardKey)
        .setDisplaySize(134, 146);
      deck.add(portImg);
    }
    const portRim = this.add.graphics();
    portRim.lineStyle(3.5, accentColor, 1);
    portRim.strokeRoundedRect(-340, -60, 136, 148, 14);
    deck.add(portRim);

    // Top Verdict Headline
    const titleStr = isCorrect
      ? '🟢 TACTICAL TELEMETRY VERIFIED — CORRECT!'
      : '🔴 TELEMETRY MISMATCH — INCORRECT!';
    const titleTxt = this.add
      .text(0, -114, titleStr, {
        fontSize: '20px',
        fontStyle: 'bold',
        color: isCorrect ? '#6ee7b7' : '#fca5a5',
        stroke: '#020617',
        strokeThickness: 5
      })
      .setOrigin(0.5);
    this.fitTextToWidth(titleTxt, 700);

    // Center Correct Answer Readout
    const subStr = isCorrect
      ? `✓ LOCKED IN: ${correctOptionText.toUpperCase()}`
      : `CORRECT TELEMETRY: ${correctOptionText.toUpperCase()}`;
    const subTxt = this.add
      .text(58, -12, subStr, {
        fontSize: '21px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 500 },
        stroke: '#020617',
        strokeThickness: 4
      })
      .setOrigin(0.5);

    // Bottom Reward / Offline Status Pill
    const badgeG = this.add.graphics();
    badgeG.fillStyle(0x020617, 0.96);
    badgeG.fillRoundedRect(-188, 52, 530, 54, 12);
    badgeG.lineStyle(2.5, secondaryColor, 1);
    badgeG.strokeRoundedRect(-188, 52, 530, 54, 12);

    const rewardStr = isCorrect
      ? '⚡ PRIMARY THRUSTER ONLINE: 1x DIE (1–6 PADS)'
      : '✕ TELEMETRY MISMATCH — THRUSTERS OFFLINE THIS TURN';
    const rewardTxt = this.add
      .text(77, 79, rewardStr, {
        fontSize: '13px',
        fontStyle: 'bold',
        color: isCorrect ? '#fde047' : '#fca5a5',
        align: 'center'
      })
      .setOrigin(0.5);
    this.fitTextToWidth(rewardTxt, 502);

    deck.add([titleTxt, subTxt, badgeG, rewardTxt]);

    this.tweens.add({
      targets: deck,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 240,
      ease: 'Back.easeOut'
    });

    if (isCorrect) {
      Juice.burstStars(this, 640, 280, 30, [0x10b981, 0xfde047, 0x00f5d4]);
    }

    this.time.delayedCall(2200, () => {
      if (!this.scene.isActive()) return;
      this.tweens.add({
        targets: [deck, shade],
        alpha: 0,
        duration: 220,
        onComplete: () => {
          this.cutsceneContainer.removeAll(true);
          onDone();
        }
      });
    });
  }

  // ===========================================================================
  // UPGRADE 3 & 5: COMPACT BOTTOM-RIGHT 3D IGNITION POD (1x STANDARD DIE: 1–6 PADS)
  // ===========================================================================

  private renderOrbitalDiceRollDock(
    player: ActiveAstronautPlayer,
    _question: TriviaQuestionItem,
    wasCorrect: boolean
  ): void {
    this.scenePhase = 'DICE_ROLL';
    this.dockContainer.removeAll(true);
    this.diceConsoleContainer.removeAll(true);

    const isAIPlayer = Boolean(player.roster.isAI);
    const bannerColor = isAIPlayer ? 0xff2255 : 0x10b981;
    const podW = 380;
    const podH = 165;
    const podX = 1060;
    const podY = 615;

    const podRoot = this.add.container(podX, podY + 180);
    this.diceConsoleContainer.add(podRoot);

    // Compact Bottom-Right Corner Pod Housing (`380x165` at `x: 1060, y: 615`)
    const bg = this.add.graphics();
    bg.fillStyle(0x020617, 0.96);
    bg.fillRoundedRect(-podW / 2, -podH / 2 + 5, podW, podH, 16);
    bg.fillStyle(0x070d1b, 0.94);
    bg.fillRoundedRect(-podW / 2, -podH / 2, podW, podH, 16);
    // Subtle FICSIT safety-amber corner accents
    bg.fillStyle(0xf59e0b, 0.9);
    bg.fillRoundedRect(-podW / 2 + 14, -podH / 2, 74, 4, 2);
    bg.fillRoundedRect(podW / 2 - 88, -podH / 2, 74, 4, 2);
    bg.lineStyle(2.5, bannerColor, 0.96);
    bg.strokeRoundedRect(-podW / 2, -podH / 2, podW, podH, 16);
    podRoot.add(bg);

    // 1. Top Header Strip: Sleek Status Badge (`⚡ PRIMARY THRUSTER ONLINE: 1x DIE (1–6 PADS)` or Rogue Thrusters for Dread-Bot)
    const statusTitle = isAIPlayer
      ? '🤖 DREAD-BOT ENGAGING ROGUE THRUSTERS...'
      : '⚡ PRIMARY THRUSTER ONLINE: 1x DIE (1–6 PADS)';

    const statusBadgeG = this.add.graphics();
    statusBadgeG.fillStyle(0x020617, 0.96);
    statusBadgeG.fillRoundedRect(-podW / 2 + 12, -podH / 2 + 9, podW - 24, 24, 7);
    statusBadgeG.lineStyle(1.5, bannerColor, 0.92);
    statusBadgeG.strokeRoundedRect(-podW / 2 + 12, -podH / 2 + 9, podW - 24, 24, 7);
    const titleTxt = this.add
      .text(0, -podH / 2 + 21, statusTitle, {
        fontSize: '10.5px',
        fontStyle: 'bold',
        color: isAIPlayer ? '#fda4af' : '#6ee7b7'
      })
      .setOrigin(0.5);
    this.fitTextToWidth(titleTxt, podW - 36);
    podRoot.add([statusBadgeG, titleTxt]);

    // 2. Left Side of Pod (`x: -88, y: 18`): Holographic Plasma Containment Ring + 1x 3D Isometric Die Cube
    const ringX = -88;
    const ringY = 22;

    const ringGlow = this.add
      .image(ringX, ringY + 12, 'starship-smooth-glow')
      .setDisplaySize(165, 86)
      .setTint(bannerColor)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.42);
    podRoot.add(ringGlow);

    const containmentRingG = this.add.graphics();
    containmentRingG.fillStyle(0x020617, 0.88);
    containmentRingG.fillEllipse(ringX, ringY + 14, 158, 62);
    containmentRingG.lineStyle(2.5, bannerColor, 0.95);
    containmentRingG.strokeEllipse(ringX, ringY + 14, 158, 62);
    containmentRingG.lineStyle(1.5, 0xfde047, 0.65);
    containmentRingG.strokeEllipse(ringX, ringY + 14, 126, 46);
    podRoot.add(containmentRingG);

    const die1 = this.create3DIsometricDie(
      ringX,
      ringY - 2,
      isAIPlayer ? 4 : 6,
      isAIPlayer ? 0xff2255 : 0x38bdf8
    );
    die1.container.setScale(0.66);
    podRoot.add(die1.container);

    // 3. Right Side of Pod (`x: 92, y: 16`): 3D Ignition Plunger Sprite (`dice-plunger-console.png`)
    const plungerRoot = this.add.container(92, 16);
    const hitW = 166;
    const hitH = 118;

    // Subtle recessed socket ring beneath the 3D Plunger Sprite
    const socketG = this.add.graphics();
    socketG.fillStyle(0x020617, 0.92);
    socketG.fillEllipse(0, 12, 132, 48);
    socketG.lineStyle(2, bannerColor, 0.78);
    socketG.strokeEllipse(0, 12, 132, 48);
    plungerRoot.add(socketG);

    const plungerCap = this.add.container(0, -10);
    const basePlungerScale = 0.44;
    if (this.textures.exists('dice-plunger-console')) {
      this.textures.get('dice-plunger-console').setFilter(Phaser.Textures.FilterMode.LINEAR);
      const plungerImg = this.add
        .image(0, 0, 'dice-plunger-console')
        .setScale(basePlungerScale);
      plungerCap.add(plungerImg);
    } else {
      const fallbackG = this.add.graphics();
      fallbackG.fillStyle(0xd97706, 1);
      fallbackG.fillCircle(0, 0, 36);
      plungerCap.add(fallbackG);
    }
    plungerRoot.add(plungerCap);

    // Crisp glowing label (`IGNITE THRUSTERS`) below the 3D plunger cap
    const labelPlateG = this.add.graphics();
    labelPlateG.fillStyle(0x020617, 0.94);
    labelPlateG.fillRoundedRect(-78, 30, 156, 32, 7);
    labelPlateG.lineStyle(1.5, isAIPlayer ? 0xff2255 : 0xfef08a, 0.92);
    labelPlateG.strokeRoundedRect(-78, 30, 156, 32, 7);
    plungerRoot.add(labelPlateG);

    const plungerLabel = this.add
      .text(0, 41, isAIPlayer ? '🤖 DREAD-BOT ENGAGING ROGUE THRUSTERS...' : 'IGNITE THRUSTER DIE', {
        fontSize: '11.5px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#020617',
        strokeThickness: 3
      })
      .setOrigin(0.5);
    this.fitTextToWidth(plungerLabel, 144);

    const plungerSub = this.add
      .text(0, 54, isAIPlayer ? 'LOCKING 1–4 PAD BURN' : 'ROLL 1–6 PADS', {
        fontSize: '8.5px',
        fontStyle: 'bold',
        color: isAIPlayer ? '#fda4af' : '#fef08a'
      })
      .setOrigin(0.5);
    this.fitTextToWidth(plungerSub, 144);

    plungerRoot.add([plungerLabel, plungerSub]);

    const pulseTween = this.tweens.add({
      targets: plungerCap,
      scaleX: { from: 1.0, to: 1.05 },
      scaleY: { from: 1.0, to: 1.05 },
      duration: 560,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const hit = this.add
      .rectangle(0, 4, hitW, hitH, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true });
    plungerRoot.add(hit);

    let rolled = false;
    const triggerPlungerIgnition = () => {
      if (rolled) return;
      rolled = true;
      hit.disableInteractive();
      pulseTween.stop();
      plungerCap.setScale(1);

      // Physically slam the 3D plunger sprite downward (`y + 8`, `scaleY: 0.88`, `Cubic.easeOut`)
      this.tweens.add({
        targets: plungerCap,
        y: plungerCap.y + 8,
        scaleY: 0.88,
        duration: 105,
        ease: 'Cubic.easeOut'
      });

      // Expanding Cyan/Amber Shockwave Ring around the plunger
      const shockRing = this.add.graphics();
      shockRing.setBlendMode(Phaser.BlendModes.ADD);
      shockRing.lineStyle(4, bannerColor, 1);
      shockRing.strokeEllipse(0, 6, 92, 42);
      shockRing.lineStyle(2, 0xffffff, 0.9);
      shockRing.strokeEllipse(0, 6, 68, 30);
      plungerRoot.add(shockRing);

      this.tweens.add({
        targets: shockRing,
        scaleX: 1.95,
        scaleY: 1.95,
        alpha: 0,
        duration: 420,
        ease: 'Cubic.easeOut',
        onComplete: () => shockRing.destroy()
      });

      this.execute3DOrbitalDiceRoll(
        player,
        wasCorrect,
        die1,
        null,
        plungerLabel,
        plungerSub,
        podRoot
      );
    };

    if (isAIPlayer) {
      hit.disableInteractive();
      this.time.delayedCall(950, () => {
        if (this.scene.isActive() && this.scenePhase === 'DICE_ROLL') {
          triggerPlungerIgnition();
        }
      });
    } else {
      hit.on('pointerover', () => {
        if (!rolled) {
          StarshipAudio.playHoverMicroClick();
        }
      });
      hit.on('pointerdown', () => {
        triggerPlungerIgnition();
      });
    }

    podRoot.add(plungerRoot);

    // Slide the compact Bottom-Right Dice Ignition Pod smoothly into place (`x: 1060, y: 615`)
    this.tweens.add({
      targets: podRoot,
      y: podY,
      duration: 300,
      ease: 'Cubic.easeOut'
    });
  }

  /**
   * Builds a gleaming 3D-rendered Isometric Die Cube with top, left, and right beveled faces
   * plus dynamic glowing telemetry pips and large numeric readout.
   */
  private create3DIsometricDie(
    x: number,
    y: number,
    initialValue: number,
    rimColor: number
  ): {
    container: Phaser.GameObjects.Container;
    setValue: (v: number) => void;
  } {
    const container = this.add.container(x, y);

    // Ground shadow
    const shadowG = this.add.graphics();
    shadowG.fillStyle(0x010409, 0.85);
    shadowG.fillEllipse(0, 42, 96, 28);
    container.add(shadowG);

    const cubeG = this.add.graphics();
    const topFace = [
      new Phaser.Geom.Point(0, -48),
      new Phaser.Geom.Point(44, -24),
      new Phaser.Geom.Point(0, 0),
      new Phaser.Geom.Point(-44, -24)
    ];
    const leftFace = [
      new Phaser.Geom.Point(-44, -24),
      new Phaser.Geom.Point(0, 0),
      new Phaser.Geom.Point(0, 42),
      new Phaser.Geom.Point(-44, 18)
    ];
    const rightFace = [
      new Phaser.Geom.Point(0, 0),
      new Phaser.Geom.Point(44, -24),
      new Phaser.Geom.Point(44, 18),
      new Phaser.Geom.Point(0, 42)
    ];

    cubeG.fillStyle(0x334155, 0.98);
    cubeG.fillPoints(topFace, true);
    cubeG.fillStyle(0x1e293b, 0.98);
    cubeG.fillPoints(leftFace, true);
    cubeG.fillStyle(0x0f172a, 0.98);
    cubeG.fillPoints(rightFace, true);

    cubeG.lineStyle(2.5, rimColor, 0.98);
    cubeG.strokePoints(topFace, true);
    cubeG.strokePoints(leftFace, true);
    cubeG.strokePoints(rightFace, true);
    container.add(cubeG);

    const valTxt = this.add
      .text(0, -24, `${initialValue}`, {
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#020617',
        strokeThickness: 4
      })
      .setOrigin(0.5);

    const leftSubTxt = this.add
      .text(-22, 10, `•${initialValue}•`, {
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#7dd3fc'
      })
      .setOrigin(0.5);

    const rightSubTxt = this.add
      .text(22, 10, `🎲`, {
        fontSize: '15px'
      })
      .setOrigin(0.5);

    container.add([valTxt, leftSubTxt, rightSubTxt]);

    return {
      container,
      setValue: (v: number) => {
        valTxt.setText(`${v}`);
        leftSubTxt.setText(`•${v}•`);
      }
    };
  }

  private execute3DOrbitalDiceRoll(
    player: ActiveAstronautPlayer,
    _wasCorrect: boolean,
    die1: { container: Phaser.GameObjects.Container; setValue: (v: number) => void },
    die2: { container: Phaser.GameObjects.Container; setValue: (v: number) => void } | null,
    plungerLabel: Phaser.GameObjects.Text,
    plungerSub: Phaser.GameObjects.Text,
    podRoot?: Phaser.GameObjects.Container
  ): void {
    this.hasRolledThisTurn = true;
    // Play heavy mechanical turbine spin-up + metallic dice clatter
    StarshipAudio.playDiceTumbleBurst();

    const isAIPlayer = Boolean(player.roster.isAI);
    const finalD1 = isAIPlayer ? this.drawNextDreadbotRoll() : Phaser.Math.Between(1, 6);
    const totalRoll = finalD1;

    plungerLabel.setText(isAIPlayer ? '🤖 ROGUE THRUSTERS...' : '⚡ TUMBLING...');
    this.fitTextToWidth(plungerLabel, 144);
    plungerSub.setText('LOCKING TRAJECTORY');
    this.fitTextToWidth(plungerSub, 144);

    // Tumble the 3D die inside the Holographic Plasma Containment Ring
    const targets = die2 ? [die1.container, die2.container] : [die1.container];
    this.tweens.add({
      targets,
      angle: { from: -18, to: 18 },
      y: '-=10',
      duration: 90,
      yoyo: true,
      repeat: 5
    });

    let ticks = 0;
    this.time.addEvent({
      delay: 85,
      repeat: 7,
      callback: () => {
        ticks++;
        if (ticks <= 7) {
          die1.setValue(isAIPlayer ? Phaser.Math.Between(1, 4) : Phaser.Math.Between(1, 6));
          if (die2) die2.setValue(Phaser.Math.Between(1, 6));
        } else {
          die1.setValue(finalD1);
          die1.container.setAngle(0);

          plungerLabel.setText(`🚀 ROLLED ${finalD1} ${finalD1 === 1 ? 'PAD' : 'PADS'}!`);
          this.fitTextToWidth(plungerLabel, 144);
          plungerSub.setText('LOCKING TRON PATH...');
          this.fitTextToWidth(plungerSub, 144);

          Juice.burstStars(
            this,
            1060,
            600,
            20,
            isAIPlayer ? [0xff2255, 0xfde047, 0x38bdf8] : [0xfde047, 0x38bdf8, 0x10b981]
          );

          const startTronPathSequence = () => {
            if (!this.scene.isActive()) return;
            this.diceConsoleContainer.removeAll(true);
            this.showHolographicTrajectoryPreview(player, totalRoll, () => {
              this.scenePhase = 'MOVING';
              this.hopPlayerTokenSteps(player, totalRoll, () => {
                this.onPrimaryMovementComplete(player);
              });
            });
          };

          // Slide the compact Dice Ignition Pod down off-screen, then snap on the Tron Tactical Blackout!
          if (podRoot) {
            this.tweens.add({
              targets: podRoot,
              y: 820,
              duration: 280,
              delay: 260,
              ease: 'Cubic.easeIn',
              onComplete: () => {
                startTronPathSequence();
              }
            });
          } else {
            this.time.delayedCall(260, () => {
              startTronPathSequence();
            });
          }
        }
      }
    });
  }

  /**
   * TRON TACTICAL BLACKOUT & SEQUENTIAL PATH-LOCK SEQUENCE (3-BEAT CHOREOGRAPHY):
   * 1. Beat 1 — Instant "Lights Out" + Deep Breaker Lock (`t = 0ms`):
   *    The exact millisecond the blackout shroud (`0x02040a`, alpha `0.84` at depth `14`) snaps on
   *    and the board lights go out, fire `StarshipAudio.playBlackoutBreakerLock()`.
   * 2. Beat 2 — 1.5 Seconds of Pure Blackout Silence (`1500ms` Pause):
   *    Hold the darkened board in complete stillness and silence for `1500ms` (1.5 seconds) —
   *    nothing moves and no path pads light up yet.
   * 3. Beat 3 — Sequential Neon Path Ignition + Final Lights-On Clack:
   *    After the `1500ms` pause completes, step through each pad in the rolled path (`240ms` per pad)
   *    using `StarshipAudio.playTronPathStepClack(step - 1)` as each neon pad ignites, pause `380ms`
   *    at the end of the lit path, and fire one final crisp mechanical clack (`playTronBlackoutRestoreClack()`)
   *    as the blackout shroud snaps off and the figurine hops forward!
   */
  private showHolographicTrajectoryPreview(
    player: ActiveAstronautPlayer,
    steps: number,
    onDone: () => void
  ): void {
    this.scenePhase = 'PATH_PREVIEW';
    this.tronBlackoutContainer.removeAll(true);
    this.trajectoryLaserContainer.removeAll(true);

    const startIdx = player.padIndex;
    const endIdx = Math.min(this.boardPads.length - 1, startIdx + Math.max(1, steps));
    const actualSteps = Math.max(0, endIdx - startIdx);
    const tronPrimaryHex = player.roster.isAI ? 0xff2255 : 0x00f5d4;

    // -------------------------------------------------------------------------
    // BEAT 1 (`t = 0ms`): Instant "Lights Out" + Deep Resonant Breaker Lock
    // -------------------------------------------------------------------------
    const blackoutShroud = this.add
      .rectangle(640, 360, 1280, 720, 0x02040a, 0.84)
      .setAlpha(1);
    this.tronBlackoutContainer.add(blackoutShroud);

    // Fire the heavy 3-layer mechanical breaker lock at the exact millisecond the lights snap out
    StarshipAudio.playBlackoutBreakerLock();

    // Dim non-active player figurines while the Tron Blackout is active so ONLY the active player's pad & figurine shine
    this.players.forEach((p) => {
      if (p !== player && p.tokenContainer) {
        p.tokenContainer.setAlpha(0.24);
      } else if (p === player && p.tokenContainer) {
        p.tokenContainer.setAlpha(1);
      }
    });

    // Illuminate the active player's starting pad above the blackout shroud (`depth: 18`)
    const startPad = this.boardPads[startIdx];
    if (startPad) {
      const startSpot = this.add
        .image(startPad.x, startPad.y, 'starship-smooth-glow')
        .setDisplaySize(124, 82)
        .setTint(player.bay.color)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.78);
      const startRingG = this.add.graphics();
      startRingG.lineStyle(3.2, 0x00f5d4, 0.96);
      startRingG.strokePoints(
        [
          new Phaser.Geom.Point(startPad.x, startPad.y - 17),
          new Phaser.Geom.Point(startPad.x + 28, startPad.y),
          new Phaser.Geom.Point(startPad.x, startPad.y + 17),
          new Phaser.Geom.Point(startPad.x - 28, startPad.y)
        ],
        true
      );
      startRingG.lineStyle(2, 0xfde047, 0.92);
      startRingG.strokePoints(
        [
          new Phaser.Geom.Point(startPad.x, startPad.y - 13),
          new Phaser.Geom.Point(startPad.x + 21, startPad.y),
          new Phaser.Geom.Point(startPad.x, startPad.y + 13),
          new Phaser.Geom.Point(startPad.x - 21, startPad.y)
        ],
        true
      );
      this.trajectoryLaserContainer.add([startSpot, startRingG]);
    }

    // -------------------------------------------------------------------------
    // BEAT 2 (`1500ms` Pause): Hold darkened board in pure blackout stillness & silence
    // BEAT 3 (`t >= 1500ms`): Sequential Neon Path Ignition (`CLACK -> CLACK -> CLACK`)
    // -------------------------------------------------------------------------
    const stepIntervalMs = 240;
    const blackoutLeadInMs = 1500;

    for (let step = 1; step <= actualSteps; step++) {
      const padIdx = startIdx + step;
      const isFinalPad = padIdx === endIdx;
      const stepDelay = blackoutLeadInMs + (step - 1) * stepIntervalMs;

      this.time.delayedCall(stepDelay, () => {
        if (!this.scene.isActive() || this.scenePhase !== 'PATH_PREVIEW') return;

        const pA = this.boardPads[padIdx - 1];
        const pB = this.boardPads[padIdx];
        if (!pA || !pB) return;

        // Crisp ascending mechanical path-lock / clack SFX for this pad!
        StarshipAudio.playTronPathStepClack(step - 1);

        // Illuminate the conveyor deck plate neon rim
        const rimGlow = this.padRimGlowMap.get(padIdx);
        if (rimGlow) {
          rimGlow.setAlpha(1);
        }

        // Pad Spotlight (`BlendModes.ADD`, depth `18` above blackout shroud)
        const outerSpot = this.add
          .image(pB.x, pB.y, 'starship-smooth-glow')
          .setDisplaySize(isFinalPad ? 156 : 118, isFinalPad ? 102 : 76)
          .setTint(tronPrimaryHex)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.86);
        const innerGoldSpot = this.add
          .image(pB.x, pB.y, 'starship-smooth-glow')
          .setDisplaySize(isFinalPad ? 92 : 68, isFinalPad ? 60 : 44)
          .setTint(0xfde047)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.75);

        // Connecting Light-Beam Segment (`pA -> pB`)
        const beamG = this.add.graphics();
        beamG.setBlendMode(Phaser.BlendModes.ADD);
        // Wide outer Tron neon aura
        beamG.lineStyle(14, tronPrimaryHex, 0.52);
        beamG.lineBetween(pA.x, pA.y - 4, pB.x, pB.y - 4);
        // High-intensity Tron Cyan light-beam
        beamG.lineStyle(6.5, 0x00f5d4, 0.95);
        beamG.lineBetween(pA.x, pA.y - 4, pB.x, pB.y - 4);
        // Super-bright Gold/White core laser
        beamG.lineStyle(3, 0xfef08a, 1);
        beamG.lineBetween(pA.x, pA.y - 4, pB.x, pB.y - 4);

        // Super-Bright Glowing Tron Cyan/Gold Neon Ring on Pad `pB`
        const ringContainer = this.add.container(pB.x, pB.y).setScale(0.72);
        const ringG = this.add.graphics();
        ringG.setBlendMode(Phaser.BlendModes.ADD);
        const rx = isFinalPad ? 35 : 28;
        const ry = isFinalPad ? 22 : 17;
        ringG.lineStyle(isFinalPad ? 4.2 : 3.2, 0x00f5d4, 1);
        ringG.strokePoints(
          [
            new Phaser.Geom.Point(0, -ry),
            new Phaser.Geom.Point(rx, 0),
            new Phaser.Geom.Point(0, ry),
            new Phaser.Geom.Point(-rx, 0)
          ],
          true
        );
        const rxInner = isFinalPad ? 27 : 21;
        const ryInner = isFinalPad ? 16.5 : 12.5;
        ringG.lineStyle(isFinalPad ? 3 : 2.2, 0xfde047, 0.98);
        ringG.strokePoints(
          [
            new Phaser.Geom.Point(0, -ryInner),
            new Phaser.Geom.Point(rxInner, 0),
            new Phaser.Geom.Point(0, ryInner),
            new Phaser.Geom.Point(-rxInner, 0)
          ],
          true
        );
        ringG.fillStyle(0xfef08a, 1);
        ringG.fillCircle(0, 0, isFinalPad ? 4.5 : 3.2);
        ringContainer.add(ringG);

        this.trajectoryLaserContainer.add([outerSpot, innerGoldSpot, beamG, ringContainer]);

        this.tweens.add({
          targets: ringContainer,
          scaleX: 1,
          scaleY: 1,
          duration: 140,
          ease: 'Back.easeOut'
        });

        if (isFinalPad) {
          const lockBadge = this.add
            .text(
              pB.x,
              pB.y - 44,
              `🎯 TARGET PAD ${String(pB.numberLabel).padStart(2, '0')}`,
              {
                fontSize: '12px',
                fontStyle: 'bold',
                color: '#fef08a',
                backgroundColor: '#020617',
                padding: { x: 8, y: 4 }
              }
            )
            .setOrigin(0.5);
          this.trajectoryLaserContainer.add(lockBadge);
        }
      });
    }

    // 3. Final Mechanical Clack — Wait `380ms` after final destination pad locks in,
    //    then play final mechanical latch SFX and snap off the blackout shroud (`150ms`)
    //    right as the player's figurine begins hopping along the illuminated pads!
    const lastPadLockMs =
      blackoutLeadInMs + Math.max(0, actualSteps - 1) * stepIntervalMs;
    const restoreLightsDelayMs = lastPadLockMs + 380;

    this.time.delayedCall(restoreLightsDelayMs, () => {
      if (!this.scene.isActive()) return;

      // Play one final crisp mechanical clack/latch SFX as the blackout shroud snaps off!
      StarshipAudio.playTronBlackoutRestoreClack();

      // Restore non-active player token visibility
      this.players.forEach((p) => {
        if (p.tokenContainer) {
          this.tweens.add({
            targets: p.tokenContainer,
            alpha: 1,
            duration: 150,
            ease: 'Quad.easeOut'
          });
        }
      });

      // Snap/fade off the blackout shroud (`150ms`)
      this.tweens.add({
        targets: blackoutShroud,
        alpha: 0,
        duration: 150,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.tronBlackoutContainer.removeAll(true);
        }
      });

      // Keep the neon path illuminated while the figurine hops along the pads, then clear
      this.time.delayedCall(actualSteps * 610 + 400, () => {
        if (this.scene.isActive()) {
          this.trajectoryLaserContainer.removeAll(true);
        }
      });

      onDone();
    });
  }

  // ===========================================================================
  // UPGRADE 6: SLOW, DELIBERATE, WEIGHTY MOVEMENT PACING (`450ms` HOP + `160ms` SETTLE)
  // ===========================================================================

  private hopPlayerTokenSteps(
    player: ActiveAstronautPlayer,
    stepsRemaining: number,
    onComplete: () => void,
    stepPitchIndex = 0
  ): void {
    if (stepsRemaining <= 0 || player.padIndex >= this.boardPads.length - 1) {
      this.refreshAllTokenOffsets();
      this.renderTopMissionHeader();
      this.saveActiveMissionToStorage();
      if (player.roster.isAI && player.padIndex < this.boardPads.length - 1) {
        onComplete();
        return;
      }
      // Wait 800ms after landing on the final pad before triggering cutscenes or advancing turn!
      this.time.delayedCall(800, () => {
        if (this.scene.isActive()) onComplete();
      });
      return;
    }

    player.padIndex = Math.min(this.boardPads.length - 1, player.padIndex + 1);
    this.saveActiveMissionToStorage();
    const nextPad = this.boardPads[player.padIndex];
    const token = player.tokenContainer;
    const figurine = player.figurineBody;

    if (!token) {
      onComplete();
      return;
    }

    // Play SpaceX RCS cold-gas nitrogen burst + mid-air Doppler plasma hum + magnetic boot clank
    StarshipAudio.playTokenHop(stepPitchIndex);

    // Illuminate approached conveyor deck plate rim
    const nextRim = this.padRimGlowMap.get(nextPad.index);
    if (nextRim) {
      nextRim.setAlpha(1);
    }

    const startX = token.x;
    const startY = token.y;
    const destPos = this.computeTokenWorldPosition(player.padIndex, this.activePlayerIndex);
    const leanDirection = destPos.x >= startX ? 14 : -14;

    // Jetpack exhaust puff at takeoff pad
    const puff = this.add
      .image(startX, startY, 'starship-flare-dot')
      .setTint(player.bay.color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.38)
      .setAlpha(0.9);
    this.tokensContainer.add(puff);
    this.tweens.add({
      targets: puff,
      scale: 0.05,
      alpha: 0,
      duration: 420,
      onComplete: () => puff.destroy()
    });

    // Lean figurine forward during flight, then settle upright on landing
    if (figurine) {
      this.tweens.add({
        targets: figurine,
        angle: leanDirection,
        duration: 210,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });
    }

    // High parabolic arc (`y - 40px` peak) over `450ms` with live perspective scaling & Y-depth sorting
    const hopState = { t: 0 };
    this.tweens.add({
      targets: hopState,
      t: 1,
      duration: 450,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const curX = Phaser.Math.Linear(startX, destPos.x, hopState.t);
        const baseLinY = Phaser.Math.Linear(startY, destPos.y, hopState.t);
        const arcLift = Math.sin(hopState.t * Math.PI) * 40;
        const perspScale = this.getPerspectiveScaleForY(baseLinY);
        token.setPosition(curX, baseLinY - arcLift);
        token.setScale(perspScale);
        token.setDepth(100 + Math.floor(baseLinY));

        if (this.activeHighlightRing) {
          this.activeHighlightRing.setPosition(curX, baseLinY + 2);
        }
      },
      onComplete: () => {
        this.tokensContainer.sort('y');

        // Spawn glowing isometric diamond landing shockwave on the conveyor deck plate!
        const shockG = this.add.graphics();
        shockG.lineStyle(3, player.bay.color, 0.95);
        shockG.strokePoints(
          [
            new Phaser.Geom.Point(0, -14),
            new Phaser.Geom.Point(24, 0),
            new Phaser.Geom.Point(0, 14),
            new Phaser.Geom.Point(-24, 0)
          ],
          true
        );
        shockG.setPosition(nextPad.x, nextPad.y);
        this.tokensContainer.add(shockG);
        this.tweens.add({
          targets: shockG,
          scaleX: 1.85,
          scaleY: 1.85,
          alpha: 0,
          duration: 340,
          onComplete: () => shockG.destroy()
        });

        this.renderTopMissionHeader();

        // Check if player reached the Unicorn Citadel final pad
        if (player.padIndex >= this.boardPads.length - 1) {
          this.refreshAllTokenOffsets();
          this.time.delayedCall(800, () => {
            if (this.scene.isActive()) onComplete();
          });
          return;
        }

        // 160ms deliberate settle pause on each pad before the next hop (`610ms` total per space)
        this.time.delayedCall(160, () => {
          if (!this.scene.isActive()) return;
          this.hopPlayerTokenSteps(player, stepsRemaining - 1, onComplete, stepPitchIndex + 1);
        });
      }
    });
  }

  private onPrimaryMovementComplete(player: ActiveAstronautPlayer): void {
    if (player.padIndex >= this.boardPads.length - 1) {
      this.triggerCitadelVictory(player);
      return;
    }

    this.evaluateLandedSpecialTile(player);
  }

  // ===========================================================================
  // UPGRADE 7 & 8: UNIFIED ORBITAL CHALLENGE SQUARES & 6 AGE-TUNED BRIDGE MINI-GAMES
  // ===========================================================================

  private evaluateLandedSpecialTile(player: ActiveAstronautPlayer): void {
    if (player.padIndex >= this.boardPads.length - 1) {
      this.triggerCitadelVictory(player);
      return;
    }

    // When Autonomous Dread-Bot X-99 finishes hopping to its destination pad,
    // skip the Orbital Challenge mini-game modal and advance to the next player's turn after a 900ms beat!
    if (player.roster.isAI) {
      this.finishTurnAndAdvancePlayer(900);
      return;
    }

    const pad = this.boardPads[player.padIndex];
    if (!pad) {
      this.finishTurnAndAdvancePlayer();
      return;
    }

    if (pad.special === 'ORBITAL_CHALLENGE') {
      this.triggerMiniChallengeModal(player);
      return;
    }

    this.finishTurnAndAdvancePlayer();
  }

  private triggerMiniChallengeModal(player: ActiveAstronautPlayer): void {
    this.scenePhase = 'CUTSCENE';
    this.cutsceneContainer.removeAll(true);
    StarshipAudio.playCutsceneBannerSwoosh();
    StarshipAudio.playPaVoice('vo_airdrop_incoming');

    // 1. Draw the next Orbital Challenge from the shuffled 6-game deck BEFORE showing the rules briefing!
    const challengeType = this.drawNextOrbitalChallenge();

    const shade = this.add
      .rectangle(640, 360, 1280, 720, 0x020617, 0.64)
      .setInteractive();
    const deckRoot = this.add.container(640, 360).setScale(0.9).setAlpha(0);
    this.cutsceneContainer.add([shade, deckRoot]);

    // Star Trek LCARS Command Deck Frame (`ui-startrek-command-deck.png`, `960x540`)
    if (this.textures.exists('ui-startrek-command-deck')) {
      this.textures.get('ui-startrek-command-deck').setFilter(Phaser.Textures.FilterMode.LINEAR);
      const frameImg = this.add
        .image(0, 0, 'ui-startrek-command-deck')
        .setDisplaySize(960, 540);
      deckRoot.add(frameImg);
    }

    const stageContainer = this.add.container(0, 0);
    deckRoot.add(stageContainer);

    this.tweens.add({
      targets: deckRoot,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 260,
      ease: 'Back.easeOut'
    });

    const isEmmaTier = player.roster.id === 'emma' || player.roster.tier === 'EMMA_3YO';
    const isWyattTier = player.roster.id === 'wyatt' || player.roster.tier === 'WYATT_4YO';
    const isKidTier = isEmmaTier || isWyattTier || player.roster.tier !== 'ADULT';

    let briefingHeaderText = '';
    let briefingRulesText = '';
    let briefingTargetBadge = '';
    let startButtonLabel = '';
    let accentHex = 0x00f5d4;

    if (challengeType === 'chrono') {
      briefingHeaderText = '⏱️ ORBITAL CHALLENGE: 2.00-SECOND CHRONO-BURN';
      briefingRulesText =
        'HOW TO PLAY: A digital warp timer will count upward from 0.00s. Tap [⚡ CUT THRUSTERS!] as close to 2.00 SECONDS as you can!';
      briefingTargetBadge = isKidTier
        ? '🎯 TARGET WINDOW: 1.35s – 2.65s (BUTTON TURNS GREEN AT 2.00s!) • WIN +2 PADS'
        : '🎯 TARGET WINDOW: 1.88s – 2.12s (DIGITS CLOAK AFTER 1.30s!) • WIN +2 PADS';
      startButtonLabel = '[ 🖖 START 2.00s CHRONO-BURN ]';
      accentHex = 0xf59e0b;
    } else if (challengeType === 'swarm') {
      briefingHeaderText = '🛸 ORBITAL CHALLENGE: QUANTUM DRONE COUNT';
      briefingRulesText =
        'HOW TO PLAY: Count ONLY the glowing CYAN plasma drones bouncing across the sensor grid before time runs out! (Ignore any red meteors!)';
      briefingTargetBadge = isEmmaTier
        ? '🎯 SPACE PRINCESS SCAN: COUNT 4–7 BLUE DRONES (4.2s) • WIN +2 PADS'
        : isWyattTier
        ? '🎯 ASTRO-RANGER SCAN: COUNT 6–11 BLUE DRONES + 2 RED METEORS (3.8s) • WIN +2 PADS'
        : '🎯 COMMANDER SCAN: COUNT 11–18 HIGH-SPEED DRONES + 4 RED DECOYS (3.5s) • WIN +2 PADS';
      startButtonLabel = '[ 🖖 RELEASE THE DRONE SWARM ]';
      accentHex = 0x00f5d4;
    } else if (challengeType === 'phaselock') {
      briefingHeaderText = '⚡ ORBITAL CHALLENGE: WARP CORE PHASE LOCK';
      briefingRulesText =
        'HOW TO PLAY: Watch the oscillating plasma needle sweep across the gauge. Tap [🔒 LOCK CONTAINMENT] right when it crosses the GOLDEN center zone!';
      briefingTargetBadge = isKidTier
        ? '🎯 JUNIOR CADET GAUGE: GENTLE 3.0s SWEEP & WIDE 38% GOLD ZONE • WIN +2 PADS'
        : '🎯 COMMANDER GAUGE: HIGH-SPEED 1.4s SWEEP & NARROW 8% GOLD ZONE • WIN +2 PADS';
      startButtonLabel = '[ 🖖 START WARP PHASE LOCK ]';
      accentHex = 0x10b981;
    } else if (challengeType === 'asteroids') {
      briefingHeaderText = '☄️ ORBITAL CHALLENGE: ASTEROID SHIELD DEFLECTOR';
      briefingRulesText =
        'HOW TO PLAY: Tap all incoming RED METEORS to blast them with phasers before time runs out! DO NOT tap friendly GREEN ESCAPE PODS!';
      briefingTargetBadge = isEmmaTier
        ? '🎯 SPACE PRINCESS PHASERS: BLAST 5 RED METEORS IN 5.0s • WIN +2 PADS'
        : isWyattTier
        ? '🎯 ASTRO-RANGER PHASERS: BLAST 7 RED METEORS (AVOID 2 GREEN PODS!) • WIN +2 PADS'
        : '🎯 COMMANDER PHASERS: BLAST 10 RAPID RED METEORS (AVOID 4 GREEN PODS!) • WIN +2 PADS';
      startButtonLabel = '[ 🖖 ENGAGE PHASER ARRAY ]';
      accentHex = 0xef4444;
    } else if (challengeType === 'memory') {
      briefingHeaderText = '🎹 ORBITAL CHALLENGE: SUBSPACE SIGNAL MEMORY';
      briefingRulesText =
        'HOW TO PLAY: Watch the 4 warp crystals light up and chime in sequence. Repeat the exact pattern by tapping the crystals in order!';
      briefingTargetBadge = isEmmaTier
        ? '🎯 SPACE PRINCESS MEMORY: REPEAT 3-CRYSTAL HARMONIC SEQUENCE • WIN +2 PADS'
        : isWyattTier
        ? '🎯 ASTRO-RANGER MEMORY: REPEAT 4-CRYSTAL HARMONIC SEQUENCE • WIN +2 PADS'
        : '🎯 COMMANDER MEMORY: REPEAT 5-STEP HIGH-SPEED SUBSPACE SEQUENCE • WIN +2 PADS';
      startButtonLabel = '[ 🖖 TRANSMIT SUBSPACE SEQUENCE ]';
      accentHex = 0xa855f7;
    } else {
      briefingHeaderText = '🔍 ORBITAL CHALLENGE: HOLO-DECK ANOMALY SCAN';
      briefingRulesText =
        'HOW TO PLAY: Every cell in the grid shows the exact same sprite—except 1 ANOMALY SPRITE with a visual glitch (flipped, tilted, or phase-tinted)! Tap it fast!';
      briefingTargetBadge = isEmmaTier
        ? '🎯 SPACE PRINCESS SCAN: 3x2 SPRITE GRID (6 SPRITES • 5.0s) • WIN +2 PADS'
        : isWyattTier
        ? '🎯 ASTRO-RANGER SCAN: 3x3 SPRITE GRID (9 SPRITES • 3.8s) • WIN +2 PADS'
        : '🎯 COMMANDER SCAN: 5x4 SPRITE GRID (20 SPRITES • 2.3s) • WIN +2 PADS';
      startButtonLabel = '[ 🖖 INITIATE SENSOR SCAN ]';
      accentHex = 0x38bdf8;
    }

    const gateHeader = this.add
      .text(0, -184, briefingHeaderText, {
        fontSize: '21px',
        fontStyle: 'bold',
        color: '#fde047',
        stroke: '#020617',
        strokeThickness: 5
      })
      .setOrigin(0.5);
    this.fitTextToWidth(gateHeader, 760);

    const isAIPlayer = Boolean(player.roster.isAI);
    const gateSub = this.add
      .text(
        0,
        -144,
        isAIPlayer
          ? `⚠️ ROGUE A.I. ${player.roster.name} INTERCEPTING ORBITAL CHALLENGE...`
          : `PILOT AT CONTROLS: ${player.roster.callsign} • NOTHING STARTS UNTIL YOU TAP BELOW`,
        {
          fontSize: '14px',
          fontStyle: 'bold',
          color: isAIPlayer ? '#ff2255' : '#38bdf8'
        }
      )
      .setOrigin(0.5);
    this.fitTextToWidth(gateSub, 760);

    stageContainer.add([gateHeader, gateSub]);

    // Left Column (`x: -255, y: -14`): Active Player Portrait Card
    const portX = -255;
    const portY = -14;
    const cardKey = `starship-card-${player.roster.id}`;
    if (this.textures.exists(cardKey)) {
      this.textures.get(cardKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
      const portImg = this.add
        .image(portX, portY, cardKey)
        .setDisplaySize(156, 172);
      stageContainer.add(portImg);
    }
    const portRim = this.add.graphics();
    portRim.lineStyle(3.5, isAIPlayer ? 0xff2255 : player.bay.color, 1);
    portRim.strokeRoundedRect(portX - 80, portY - 88, 160, 176, 16);
    stageContainer.add(portRim);

    // Right Column (`x: 88, y: -14`): Star Trek LCARS Rules & Target Briefing Box
    const rulesBoxW = 490;
    const rulesBoxH = 176;
    const rulesBoxX = 88;
    const rulesBoxY = -14;
    const rulesG = this.add.graphics();
    rulesG.fillStyle(0x020617, 0.94);
    rulesG.fillRoundedRect(
      rulesBoxX - rulesBoxW / 2,
      rulesBoxY - rulesBoxH / 2,
      rulesBoxW,
      rulesBoxH,
      16
    );
    rulesG.lineStyle(3, isAIPlayer ? 0xff2255 : accentHex, 0.95);
    rulesG.strokeRoundedRect(
      rulesBoxX - rulesBoxW / 2,
      rulesBoxY - rulesBoxH / 2,
      rulesBoxW,
      rulesBoxH,
      16
    );
    stageContainer.add(rulesG);

    const rulesBodyTxt = this.add
      .text(rulesBoxX, rulesBoxY - 22, briefingRulesText, {
        fontFamily: '"Rajdhani", "Segoe UI", sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#f8fafc',
        align: 'center',
        wordWrap: { width: rulesBoxW - 36 }
      })
      .setOrigin(0.5);

    const targetBadgeTxt = this.add
      .text(rulesBoxX, rulesBoxY + 52, briefingTargetBadge, {
        fontSize: '12.5px',
        fontStyle: 'bold',
        color: '#6ee7b7',
        backgroundColor: '#064e3b',
        padding: { x: 10, y: 6 }
      })
      .setOrigin(0.5);
    this.fitTextToWidth(targetBadgeTxt, rulesBoxW - 28);

    stageContainer.add([rulesBodyTxt, targetBadgeTxt]);

    let challengeStarted = false;
    const startChallengeNow = () => {
      if (challengeStarted || !this.scene.isActive() || !stageContainer.scene) return;
      challengeStarted = true;
      stageContainer.removeAll(true);
      this.launchOrbitalTacticalChallenge(player, stageContainer, challengeType);
    };

    // Large Glowing 3D-Styled Star Trek LCARS Start Button (`[ 🖖 START ... ]`)
    const engageBtn = this.createCockpitRockerSwitch(
      0,
      158,
      580,
      68,
      isAIPlayer ? '🤖 DREAD-BOT OVERRIDING ORBITAL CHALLENGE...' : startButtonLabel,
      isAIPlayer ? 0xff2255 : accentHex,
      () => {
        if (!isAIPlayer) {
          startChallengeNow();
        }
      }
    );
    stageContainer.add(engageBtn);

    if (isAIPlayer) {
      this.tweens.add({
        targets: engageBtn,
        alpha: { from: 1.0, to: 0.52 },
        duration: 300,
        yoyo: true,
        repeat: -1
      });
      this.time.delayedCall(1400, () => {
        startChallengeNow();
      });
    }
  }

  private completeMiniChallengeAndAdvance(
    player: ActiveAstronautPlayer,
    bonusSteps: number
  ): void {
    this.time.delayedCall(1450, () => {
      if (!this.scene.isActive()) return;
      this.cutsceneContainer.removeAll(true);
      if (bonusSteps > 0) {
        this.hopPlayerTokenSteps(player, bonusSteps, () => {
          if (player.padIndex >= this.boardPads.length - 1) {
            this.triggerCitadelVictory(player);
          } else {
            this.finishTurnAndAdvancePlayer();
          }
        });
      } else {
        this.finishTurnAndAdvancePlayer();
      }
    });
  }

  /**
   * Launches the pre-selected Star Trek Bridge Orbital Challenge inside the Command Deck Frame,
   * dynamically tuned for Emma (3yo), Wyatt (4yo), Commanders (Adults), and Autonomous Dread-Bot!
   * Winning any Orbital Challenge awards a `+2 OVERCLOCK PAD BOOST`!
   */
  private launchOrbitalTacticalChallenge(
    player: ActiveAstronautPlayer,
    stageContainer: Phaser.GameObjects.Container,
    challengeType: OrbitalChallengeType
  ): void {
    // Autonomous Dread-Bot X-99 Tactical Override (2000ms simulated laser/scanner visuals -> 50% +2 Pads / 50% 0 Pads)
    if (player.roster.isAI) {
      const title = this.add
        .text(0, -180, '🤖 DREAD-BOT EXECUTING TACTICAL OVERRIDE...', {
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#ff2255',
          stroke: '#020617',
          strokeThickness: 5
        })
        .setOrigin(0.5);
      this.fitTextToWidth(title, 760);

      const sub = this.add
        .text(0, -142, `BYPASSING STARFLEET SECURITY PROTOCOLS (${challengeType.toUpperCase()})...`, {
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#fde047'
        })
        .setOrigin(0.5);
      this.fitTextToWidth(sub, 760);
      stageContainer.add([title, sub]);

      const gridW = 680;
      const gridH = 220;
      const boxG = this.add.graphics();
      boxG.fillStyle(0x020617, 0.94);
      boxG.fillRoundedRect(-gridW / 2, -108, gridW, gridH, 16);
      boxG.lineStyle(3, 0xff2255, 0.95);
      boxG.strokeRoundedRect(-gridW / 2, -108, gridW, gridH, 16);
      stageContainer.add(boxG);

      if (this.textures.exists('starship-card-dreadbot')) {
        const botImg = this.add
          .image(0, -2, 'starship-card-dreadbot')
          .setDisplaySize(148, 164);
        stageContainer.add(botImg);
      }

      // Sweeping crimson laser beam & rotating target rings inside the telemetry box
      const laserBeam = this.add
        .rectangle(0, -96, gridW - 24, 8, 0xff2255, 0.8)
        .setBlendMode(Phaser.BlendModes.ADD);
      stageContainer.add(laserBeam);
      this.tweens.add({
        targets: laserBeam,
        y: 96,
        duration: 380,
        yoyo: true,
        repeat: 4,
        ease: 'Sine.easeInOut'
      });

      const statusTxt = this.add
        .text(0, 152, '⚡ COMPUTING QUANTUM OVERRIDE VECTORS...', {
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#ff6b8b',
          stroke: '#020617',
          strokeThickness: 4
        })
        .setOrigin(0.5);
      this.fitTextToWidth(statusTxt, 740);
      stageContainer.add(statusTxt);

      const soundPulse = this.time.addEvent({
        delay: 320,
        repeat: 5,
        callback: () => {
          if (this.scene.isActive()) {
            StarshipAudio.playTrajectoryLaserLock(1);
          }
        }
      });

      this.time.delayedCall(2000, () => {
        if (!this.scene.isActive()) return;
        soundPulse.remove(false);
        // 50% chance Dread-Bot wins the +2 OVERCLOCK PAD BOOST, 50% chance Dread-Bot malfunctions (0 bonus steps)
        const won = Math.random() < 0.5;
        if (won) {
          StarshipAudio.playAnswerCorrectFanfare();
          title.setText('🟢 DREAD-BOT OVERRIDE SUCCESSFUL! +2 OVERCLOCK PAD BOOST!');
          title.setColor('#6ee7b7');
          this.fitTextToWidth(title, 760);
          statusTxt.setText('🤖 ROGUE A.I. ADVANCING +2 BONUS PADS!');
          statusTxt.setColor('#6ee7b7');
          this.fitTextToWidth(statusTxt, 740);
          Juice.burstStars(this, 640, 340, 28, [0xff2255, 0xfde047, 0x00f5d4]);
          this.completeMiniChallengeAndAdvance(player, 2);
        } else {
          StarshipAudio.playAnswerWrongBuzzer();
          title.setText('🔴 DREAD-BOT CIRCUIT MALFUNCTION — OVERRIDE BLOCKED!');
          title.setColor('#fca5a5');
          this.fitTextToWidth(title, 760);
          statusTxt.setText('⚡ STARFLEET FIREWALL HELD — 0 BONUS PADS!');
          statusTxt.setColor('#fde047');
          this.fitTextToWidth(statusTxt, 740);
          this.completeMiniChallengeAndAdvance(player, 0);
        }
      });
      return;
    }
    const isEmmaTier = player.roster.id === 'emma' || player.roster.tier === 'EMMA_3YO';
    const isWyattTier = player.roster.id === 'wyatt' || player.roster.tier === 'WYATT_4YO';
    const isKidTier = isEmmaTier || isWyattTier || player.roster.tier !== 'ADULT';

    if (challengeType === 'chrono') {
      // =======================================================================
      // CHALLENGE 1: `CHRONO-THRUSTER 2.00s PRECISION BURN`
      // - Commander Tier: Target 2.00s ± 0.12s (1.88s–2.12s), digits cloak after 1.30s.
      // - Kids Tier: Target 2.00s ± 0.65s (1.35s–2.65s), digits stay 100% visible,
      //   and during 1.40s–2.50s the button pulses bright emerald green with `[ ⚡ TAP NOW! 2.00s! ]`!
      // =======================================================================
      const minTarget = isKidTier ? 1.35 : 1.88;
      const maxTarget = isKidTier ? 2.65 : 2.12;

      const title = this.add
        .text(0, -184, '⏱️ CHRONO-THRUSTER 2.00s PRECISION BURN!', {
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#fde047',
          stroke: '#020617',
          strokeThickness: 4
        })
        .setOrigin(0.5);
      this.fitTextToWidth(title, 760);

      const subText = isKidTier
        ? `${player.roster.name}: Watch the clock count to 2.00s and tap when the button turns GREEN!`
        : `${player.roster.name}: Cut thrusters between 1.88s and 2.12s (2.00s ± 0.12s) for +2 Pads!`;

      const sub = this.add
        .text(0, -144, subText, {
          fontSize: '13.5px',
          fontStyle: 'bold',
          color: '#7dd3fc'
        })
        .setOrigin(0.5);
      this.fitTextToWidth(sub, 760);
      stageContainer.add([title, sub]);

      // Star Trek Warp-Core Digital Chronometer Display
      const chronoBox = this.add.graphics();
      chronoBox.fillStyle(0x020617, 0.96);
      chronoBox.fillRoundedRect(-240, -92, 480, 148, 18);
      chronoBox.lineStyle(3.5, 0x00f5d4, 1);
      chronoBox.strokeRoundedRect(-240, -92, 480, 148, 18);
      stageContainer.add(chronoBox);

      const chronoDigits = this.add
        .text(0, -32, '0.00s', {
          fontSize: '60px',
          fontStyle: 'bold',
          color: '#00f5d4',
          stroke: '#020617',
          strokeThickness: 6
        })
        .setOrigin(0.5);

      const windowLabelText = isKidTier
        ? 'TARGET WINDOW: 1.35s — 2.65s (TAP AT 2.00s!)'
        : 'TARGET WINDOW: 1.88s — 2.12s';

      const interferenceLbl = this.add
        .text(0, 32, windowLabelText, {
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#fde047'
        })
        .setOrigin(0.5);
      this.fitTextToWidth(interferenceLbl, 440);
      stageContainer.add([chronoDigits, interferenceLbl]);

      const startMs = performance.now();
      let stopped = false;
      let kidGreenPulseActive = false;

      // Custom interactive button so we can dynamically pulse it emerald green for Kids Tier during 1.40s–2.50s
      const btnW = 460;
      const btnH = 74;
      const cutBtnContainer = this.add.container(0, 148);
      const cutBtnBg = this.add.graphics();
      const drawCutButton = (accentHex: number, fillHex: number) => {
        cutBtnBg.clear();
        cutBtnBg.fillStyle(fillHex, 0.96);
        cutBtnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16);
        cutBtnBg.lineStyle(3.5, accentHex, 1);
        cutBtnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16);
      };
      drawCutButton(0xf59e0b, 0x0f172a);

      const cutBtnTxt = this.add
        .text(0, 0, '⚡  CUT THRUSTERS NOW!', {
          fontSize: '20px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#020617',
          strokeThickness: 4
        })
        .setOrigin(0.5);
      this.fitTextToWidth(cutBtnTxt, btnW - 36);

      const cutBtnHit = this.add
        .rectangle(0, 0, btnW, btnH, 0x000000, 0.001)
        .setInteractive({ useHandCursor: true });

      cutBtnContainer.add([cutBtnBg, cutBtnTxt, cutBtnHit]);
      stageContainer.add(cutBtnContainer);

      const finishChronoBurn = (elapsedSec: number) => {
        if (stopped) return;
        stopped = true;
        chronoTimer.remove(false);

        chronoDigits.setAlpha(1);
        const formatted = `${elapsedSec.toFixed(2)}s`;
        const hitTarget = elapsedSec >= minTarget && elapsedSec <= maxTarget;

        if (hitTarget) {
          StarshipAudio.playAnswerCorrectFanfare();
          chronoDigits.setText(`${formatted} • BULLSEYE!`);
          chronoDigits.setColor('#6ee7b7');
          chronoDigits.setFontSize(36);
          this.fitTextToWidth(chronoDigits, 440);
          interferenceLbl.setText('🟢 +2 OVERCLOCK PAD BOOST UNLOCKED!');
          interferenceLbl.setColor('#6ee7b7');
          this.fitTextToWidth(interferenceLbl, 440);
          Juice.burstStars(this, 640, 330, 32, [0x10b981, 0xfde047, 0x00f5d4]);
          this.completeMiniChallengeAndAdvance(player, 2);
        } else {
          StarshipAudio.playAnswerWrongBuzzer();
          const verdict = elapsedSec < minTarget ? 'TOO EARLY!' : 'OVERBURN!';
          chronoDigits.setText(`${formatted} — ${verdict}`);
          chronoDigits.setColor('#fca5a5');
          chronoDigits.setFontSize(36);
          this.fitTextToWidth(chronoDigits, 440);
          interferenceLbl.setText('🚀 +1 AUXILIARY CONSOLATION PAD BOOST');
          interferenceLbl.setColor('#fde047');
          this.fitTextToWidth(interferenceLbl, 440);
          this.completeMiniChallengeAndAdvance(player, 1);
        }
      };

      cutBtnHit.on('pointerover', () => {
        if (!stopped) StarshipAudio.playHoverMicroClick();
      });
      cutBtnHit.on('pointerdown', () => {
        if (stopped) return;
        const elapsed = (performance.now() - startMs) / 1000;
        finishChronoBurn(elapsed);
      });

      const chronoTimer = this.time.addEvent({
        delay: 16,
        loop: true,
        callback: () => {
          if (stopped || !this.scene.isActive()) return;
          const elapsed = (performance.now() - startMs) / 1000;
          chronoDigits.setText(`${elapsed.toFixed(2)}s`);

          if (isKidTier) {
            // Kids Tier: Digits stay 100% visible, and during 1.40s–2.50s pulse button bright emerald green!
            if (elapsed >= 1.4 && elapsed <= 2.5) {
              chronoDigits.setColor('#6ee7b7');
              interferenceLbl.setText('🟢 NOW! TAP THE GREEN BUTTON AT 2.00s! 🟢');
              interferenceLbl.setColor('#6ee7b7');
              this.fitTextToWidth(interferenceLbl, 440);
              if (!kidGreenPulseActive) {
                kidGreenPulseActive = true;
                drawCutButton(0x10b981, 0x065f46);
                cutBtnTxt.setText('[ ⚡ TAP NOW! 2.00s! ]');
                cutBtnTxt.setColor('#ecfdf5');
                this.fitTextToWidth(cutBtnTxt, btnW - 36);
                this.tweens.add({
                  targets: cutBtnContainer,
                  scaleX: 1.06,
                  scaleY: 1.06,
                  duration: 180,
                  yoyo: true,
                  repeat: 3
                });
              }
            } else if (elapsed > 2.5) {
              drawCutButton(0xf59e0b, 0x0f172a);
              cutBtnTxt.setText('⚡  CUT THRUSTERS NOW!');
              this.fitTextToWidth(cutBtnTxt, btnW - 36);
            }
          } else {
            // Commander Tier: After 1.30s, digits cloak/flicker with plasma interference!
            if (elapsed >= 1.3) {
              chronoDigits.setAlpha(Phaser.Math.FloatBetween(0.18, 0.85));
              chronoDigits.setColor(Math.random() > 0.5 ? '#fde047' : '#38bdf8');
              interferenceLbl.setText('⚡ PLASMA INTERFERENCE — FEEL THE 2.00s RHYTHM! ⚡');
              this.fitTextToWidth(interferenceLbl, 440);
            }
          }

          if (elapsed >= (isKidTier ? 3.4 : 3.2)) {
            finishChronoBurn(elapsed);
          }
        }
      });
    } else if (challengeType === 'swarm') {
      // =======================================================================
      // CHALLENGE 2: `QUANTUM DRONE SWARM COUNT` (Harder for Kids + Randomized 4 Answer Buttons!)
      // - Emma (3yo): 4 to 7 cyan drones (medium speed, 0 red decoys, 4.2s duration).
      // - Wyatt (4yo): 6 to 11 faster-moving cyan drones + 2 red decoy meteors (3.8s duration).
      // - Commanders (Adults): 11 to 18 high-speed cyan drones + 4 red decoy meteors (3.5s duration).
      // =======================================================================
      const targetCount = isEmmaTier
        ? Phaser.Math.Between(4, 7)
        : isWyattTier
        ? Phaser.Math.Between(6, 11)
        : Phaser.Math.Between(11, 18);
      const decoyCount = isEmmaTier ? 0 : isWyattTier ? 2 : 4;
      const sweepDurationMs = isEmmaTier ? 4200 : isWyattTier ? 3800 : 3500;

      const title = this.add
        .text(0, -184, '🛸 QUANTUM DRONE SWARM SENSOR SWEEP!', {
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#00f5d4',
          stroke: '#020617',
          strokeThickness: 4
        })
        .setOrigin(0.5);
      this.fitTextToWidth(title, 760);

      const subPrompt = isEmmaTier
        ? `${player.roster.name}: Point and count the glowing BLUE DRONES out loud!`
        : `${player.roster.name}: Count ONLY the CYAN PLASMA DRONES (ignore red decoy meteors)!`;

      const sub = this.add
        .text(0, -146, subPrompt, {
          fontSize: '13.5px',
          fontStyle: 'bold',
          color: '#fde047'
        })
        .setOrigin(0.5);
      this.fitTextToWidth(sub, 760);
      stageContainer.add([title, sub]);

      const gridW = 680;
      const gridH = 220;
      const gridBox = this.add.graphics();
      gridBox.fillStyle(0x020617, 0.92);
      gridBox.fillRoundedRect(-gridW / 2, -112, gridW, gridH, 16);
      gridBox.lineStyle(2.5, 0x00f5d4, 0.9);
      gridBox.strokeRoundedRect(-gridW / 2, -112, gridW, gridH, 16);
      stageContainer.add(gridBox);

      const swarmContainer = this.add.container(0, -2);
      stageContainer.add(swarmContainer);

      interface SwarmEntity {
        node: Phaser.GameObjects.Container;
        vx: number;
        vy: number;
      }
      const entities: SwarmEntity[] = [];

      for (let i = 0; i < targetCount + decoyCount; i++) {
        const isDecoy = i >= targetCount;
        const sx = Phaser.Math.Between(-gridW / 2 + 48, gridW / 2 - 48);
        const sy = Phaser.Math.Between(-gridH / 2 + 36, gridH / 2 - 36);
        const node = this.add.container(sx, sy);

        const droneRadius = isEmmaTier ? 16 : isWyattTier ? (isDecoy ? 11 : 13) : isDecoy ? 9 : 10;
        const glowScale = isEmmaTier ? 0.95 : isWyattTier ? 0.78 : isDecoy ? 0.58 : 0.68;

        const glow = this.add
          .image(0, 0, 'starship-flare-dot')
          .setTint(isDecoy ? 0xef4444 : 0x00f5d4)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(glowScale);
        const core = this.add.graphics();
        core.fillStyle(isDecoy ? 0xef4444 : 0xa5f3fc, 1);
        core.fillCircle(0, 0, droneRadius);
        core.lineStyle(2.5, 0xffffff, 0.95);
        core.strokeCircle(0, 0, droneRadius + 3);
        node.add([glow, core]);
        swarmContainer.add(node);

        const speed = isEmmaTier
          ? Phaser.Math.FloatBetween(1.15, 1.85)
          : isWyattTier
          ? Phaser.Math.FloatBetween(1.75, 2.75)
          : Phaser.Math.FloatBetween(2.6, 4.2);
        const ang = Phaser.Math.FloatBetween(0, Math.PI * 2);
        entities.push({
          node,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed
        });
      }

      const moveTimer = this.time.addEvent({
        delay: 20,
        loop: true,
        callback: () => {
          if (!this.scene.isActive()) return;
          const maxX = gridW / 2 - 34;
          const maxY = gridH / 2 - 30;
          for (const ent of entities) {
            ent.node.x += ent.vx;
            ent.node.y += ent.vy;
            if (ent.node.x < -maxX || ent.node.x > maxX) ent.vx *= -1;
            if (ent.node.y < -maxY || ent.node.y > maxY) ent.vy *= -1;
          }
        }
      });

      const statusMsg = isEmmaTier
        ? '🔭 COUNT THE BLUE DRONES OUT LOUD! (4.2s)'
        : isWyattTier
        ? '🔭 COUNT ONLY THE BLUE DRONES — IGNORE RED METEORS! (3.8s)'
        : '🔭 HIGH-SPEED SENSOR SWEEP IN PROGRESS (3.5s)... COUNT FAST!';
      const statusTxt = this.add
        .text(0, 152, statusMsg, {
          fontSize: '16px',
          fontStyle: 'bold',
          color: '#7dd3fc'
        })
        .setOrigin(0.5);
      this.fitTextToWidth(statusTxt, 740);
      stageContainer.add(statusTxt);

      this.time.delayedCall(sweepDurationMs, () => {
        if (!this.scene.isActive()) return;
        moveTimer.remove(false);
        // Immediately destroy and hide EVERY cyan plasma drone and red decoy meteor inside the sensor grid!
        swarmContainer.removeAll(true);
        swarmContainer.setVisible(false);
        statusTxt.setVisible(false);

        const lockedReadoutTxt = this.add
          .text(0, -2, '🔒 SENSOR SWEEP COMPLETE — HOW MANY CYAN DRONES DID YOU COUNT?', {
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#fde047',
            stroke: '#020617',
            strokeThickness: 4,
            align: 'center',
            wordWrap: { width: gridW - 48 }
          })
          .setOrigin(0.5);
        this.fitTextToWidth(lockedReadoutTxt, gridW - 40);
        stageContainer.add(lockedReadoutTxt);

        sub.setText('SELECT YOUR COUNT BELOW FOR A +2 OVERCLOCK PAD BOOST!');
        this.fitTextToWidth(sub, 760);

        // Generate 3 unique nearby integer distractors (`> 0`) around `targetCount`,
        // put `[targetCount, d1, d2, d3]` into an array, and Fisher-Yates shuffle the 4 options!
        const candidatePool: number[] = [];
        for (const offset of [-3, -2, -1, 1, 2, 3, 4]) {
          const val = targetCount + offset;
          if (val > 0 && val !== targetCount) {
            candidatePool.push(val);
          }
        }
        const shuffledDistractors = this.fisherYatesShuffle(candidatePool).slice(0, 3);
        const choices = this.fisherYatesShuffle([targetCount, ...shuffledDistractors]);
        let answered = false;

        choices.forEach((val, idx) => {
          const bx = -270 + idx * 180;
          const btnLabel = isKidTier ? `${val}` : `${val} DRONES`;
          const btn = this.createCockpitRockerSwitch(
            bx,
            152,
            158,
            64,
            btnLabel,
            0x0284c7,
            () => {
              if (answered) return;
              answered = true;

              if (val === targetCount) {
                StarshipAudio.playAnswerCorrectFanfare();
                lockedReadoutTxt.setText(`🟢 EXACT SENSOR MATCH: ${targetCount} CYAN DRONES!`);
                lockedReadoutTxt.setColor('#6ee7b7');
                this.fitTextToWidth(lockedReadoutTxt, gridW - 40);
                sub.setText(`🟢 EXACT SENSOR MATCH (${targetCount} DRONES)! +2 OVERCLOCK PAD BOOST!`);
                sub.setColor('#6ee7b7');
                this.fitTextToWidth(sub, 760);
                Juice.burstStars(this, 640, 340, 30, [0x10b981, 0xfde047, 0x00f5d4]);
                this.completeMiniChallengeAndAdvance(player, 2);
              } else {
                StarshipAudio.playAnswerWrongBuzzer();
                lockedReadoutTxt.setText(`🔴 ACTUAL SENSOR COUNT WAS ${targetCount} CYAN DRONES!`);
                lockedReadoutTxt.setColor('#fca5a5');
                this.fitTextToWidth(lockedReadoutTxt, gridW - 40);
                sub.setText(`🔴 ACTUAL COUNT WAS ${targetCount} DRONES! +1 AUXILIARY PAD BOOST`);
                sub.setColor('#fca5a5');
                this.fitTextToWidth(sub, 760);
                this.completeMiniChallengeAndAdvance(player, 1);
              }
            }
          );
          stageContainer.add(btn);
        });
      });
    } else if (challengeType === 'phaselock') {
      // =======================================================================
      // CHALLENGE 3: `WARP CORE PHASE LOCK`
      // - Commander Tier: Fast 1.4s needle sweep with a narrow 8% golden target zone.
      // - Kids Tier: Smooth, gentle 3.0s needle sweep with a wide, generous 38% golden target zone!
      // =======================================================================
      const title = this.add
        .text(0, -184, '🌀 WARP CORE PHASE CONTAINMENT LOCK!', {
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#f472b6',
          stroke: '#020617',
          strokeThickness: 4
        })
        .setOrigin(0.5);
      this.fitTextToWidth(title, 760);
      const sub = this.add
        .text(
          0,
          -144,
          `${player.roster.name}: Lock Phase Containment while the plasma needle is inside the GOLD ZONE!`,
          {
            fontSize: '13.5px',
            fontStyle: 'bold',
            color: '#fde047'
          }
        )
        .setOrigin(0.5);
      this.fitTextToWidth(sub, 760);
      stageContainer.add([title, sub]);

      // Spinning 3D Warp Core Sprite above the Phase Containment Bar
      if (this.textures.exists('challenge-warp-core')) {
        const coreSprite = this.add
          .image(0, -42, 'challenge-warp-core')
          .setScale(0.68);
        stageContainer.add(coreSprite);
        this.tweens.add({
          targets: coreSprite,
          angle: 360,
          duration: 2800,
          repeat: -1
        });
      }

      // Horizontal Star Trek Warp Containment Bar (`w: 600, y: 64`)
      const barW = 600;
      const targetHalfW = isKidTier ? 114 : 24;
      const halfSweepDurationMs = isKidTier ? 1500 : 700;

      const barG = this.add.graphics();
      barG.fillStyle(0x020617, 0.96);
      barG.fillRoundedRect(-barW / 2, 42, barW, 44, 12);
      // Glowing Golden Target Zone in the center (`-targetHalfW..+targetHalfW`)
      barG.fillStyle(0xf59e0b, 0.48);
      barG.fillRoundedRect(-targetHalfW, 44, targetHalfW * 2, 40, 6);
      barG.lineStyle(3, 0xfde047, 1);
      barG.strokeRoundedRect(-targetHalfW, 44, targetHalfW * 2, 40, 6);
      barG.lineStyle(2.5, 0x38bdf8, 0.95);
      barG.strokeRoundedRect(-barW / 2, 42, barW, 44, 12);
      stageContainer.add(barG);

      // Oscillating Plasma Needle
      const needle = this.add.container(-275, 64);
      const needleGlow = this.add
        .image(0, 0, 'starship-flare-dot')
        .setTint(0x00f5d4)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.85);
      const needleBar = this.add.rectangle(0, 0, 10, 58, 0xffffff, 1);
      needle.add([needleGlow, needleBar]);
      stageContainer.add(needle);

      const sweepTween = this.tweens.add({
        targets: needle,
        x: 275,
        duration: halfSweepDurationMs,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      let locked = false;
      const lockBtn = this.createCockpitRockerSwitch(
        0,
        152,
        460,
        72,
        '🔒  LOCK PHASE CONTAINMENT',
        0x10b981,
        () => {
          if (locked) return;
          locked = true;
          sweepTween.stop();

          const inGoldZone = Math.abs(needle.x) <= targetHalfW;
          if (inGoldZone) {
            StarshipAudio.playSlingshotBoost();
            StarshipAudio.playAnswerCorrectFanfare();
            sub.setText('🟢 PHASE CONTAINMENT LOCKED IN GOLD ZONE! +2 OVERCLOCK PAD BOOST!');
            sub.setColor('#6ee7b7');
            this.fitTextToWidth(sub, 760);
            Juice.burstStars(this, 640, 360, 32, [0x10b981, 0xfde047, 0x00f5d4]);
            this.completeMiniChallengeAndAdvance(player, 2);
          } else {
            StarshipAudio.playAnswerWrongBuzzer();
            sub.setText('🔴 PHASE DRIFT OUTSIDE GOLD ZONE — +1 AUXILIARY PAD BOOST!');
            sub.setColor('#fca5a5');
            this.fitTextToWidth(sub, 760);
            this.completeMiniChallengeAndAdvance(player, 1);
          }
        }
      );
      stageContainer.add(lockBtn);
    } else if (challengeType === 'asteroids') {
      // =======================================================================
      // CHALLENGE 4: `☄️ ASTEROID SHIELD DEFLECTOR` (Tap-to-Blast Phasers)
      // - Emma (3yo): 5 large slow crimson meteors, 0 green escape pods (5.0s).
      // - Wyatt (4yo): 7 faster crimson meteors + 2 friendly green escape pods (5.0s).
      // - Commanders: 10 rapid crimson meteors + 4 friendly green escape pods (5.0s).
      // =======================================================================
      const targetMeteors = isEmmaTier ? 5 : isWyattTier ? 7 : 10;
      const greenPods = isEmmaTier ? 0 : isWyattTier ? 2 : 4;
      const durationMs = 5000;

      const title = this.add
        .text(0, -184, '☄️ ASTEROID SHIELD DEFLECTOR — PHASER ARRAY ONLINE!', {
          fontSize: '21px',
          fontStyle: 'bold',
          color: '#fde047',
          stroke: '#020617',
          strokeThickness: 4
        })
        .setOrigin(0.5);
      this.fitTextToWidth(title, 760);

      const sub = this.add
        .text(
          0,
          -146,
          isEmmaTier
            ? `${player.roster.name}: Tap every glowing RED METEOR to blast it with phasers!`
            : `${player.roster.name}: Tap all RED METEORS! DO NOT tap friendly GREEN ESCAPE PODS!`,
          {
            fontSize: '13.5px',
            fontStyle: 'bold',
            color: '#7dd3fc'
          }
        )
        .setOrigin(0.5);
      this.fitTextToWidth(sub, 760);
      stageContainer.add([title, sub]);

      const gridW = 720;
      const gridH = 240;
      const gridBox = this.add.graphics();
      gridBox.fillStyle(0x020617, 0.94);
      gridBox.fillRoundedRect(-gridW / 2, -116, gridW, gridH, 16);
      gridBox.lineStyle(2.5, 0xef4444, 0.92);
      gridBox.strokeRoundedRect(-gridW / 2, -116, gridW, gridH, 16);
      stageContainer.add(gridBox);

      const fieldContainer = this.add.container(0, 4);
      const beamContainer = this.add.container(0, 4);
      stageContainer.add([fieldContainer, beamContainer]);

      // Bottom-center phaser turret emitter graphic
      const turretG = this.add.graphics();
      turretG.fillStyle(0x0f172a, 1);
      turretG.fillCircle(0, 114, 20);
      turretG.lineStyle(3, 0x00f5d4, 1);
      turretG.strokeCircle(0, 114, 20);
      fieldContainer.add(turretG);

      let blastedCount = 0;
      let finished = false;
      const startMs = performance.now();

      const statusTxt = this.add
        .text(0, 154, `💥 BLASTED: 0 / ${targetMeteors}   •   ⏱️ 5.0s REMAINING`, {
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#fde047',
          stroke: '#020617',
          strokeThickness: 4
        })
        .setOrigin(0.5);
      this.fitTextToWidth(statusTxt, 740);
      stageContainer.add(statusTxt);

      interface AsteroidObj {
        node: Phaser.GameObjects.Container;
        vx: number;
        vy: number;
        alive: boolean;
      }
      const objs: AsteroidObj[] = [];

      const endAsteroidChallenge = (won: boolean, reasonText: string) => {
        if (finished) return;
        finished = true;
        loopTimer.remove(false);

        if (won) {
          StarshipAudio.playAnswerCorrectFanfare();
          sub.setText(`🟢 ${reasonText} +2 OVERCLOCK PAD BOOST!`);
          sub.setColor('#6ee7b7');
          this.fitTextToWidth(sub, 760);
          statusTxt.setText(`🏆 ALL ${targetMeteors} RED METEORS VAPORIZED!`);
          statusTxt.setColor('#6ee7b7');
          this.fitTextToWidth(statusTxt, 740);
          Juice.burstStars(this, 640, 340, 34, [0x10b981, 0xfde047, 0x00f5d4]);
          this.completeMiniChallengeAndAdvance(player, 2);
        } else {
          StarshipAudio.playAnswerWrongBuzzer();
          sub.setText(`🔴 ${reasonText} +1 AUXILIARY PAD BOOST!`);
          sub.setColor('#fca5a5');
          this.fitTextToWidth(sub, 760);
          statusTxt.setText(reasonText);
          statusTxt.setColor('#fca5a5');
          this.fitTextToWidth(statusTxt, 740);
          this.completeMiniChallengeAndAdvance(player, 1);
        }
      };

      const totalObjects = targetMeteors + greenPods;
      for (let i = 0; i < totalObjects; i++) {
        const isGreenPod = i >= targetMeteors;
        const sx = Phaser.Math.Between(-gridW / 2 + 58, gridW / 2 - 58);
        const sy = Phaser.Math.Between(-gridH / 2 + 42, gridH / 2 - 48);
        const node = this.add.container(sx, sy);

        const radius = isEmmaTier ? 30 : isWyattTier ? 25 : 22;
        const colorHex = isGreenPod ? 0x10b981 : 0xef4444;

        const glow = this.add
          .image(0, 0, 'starship-flare-dot')
          .setTint(colorHex)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(isEmmaTier ? 1.2 : 0.95);

        const ringG = this.add.graphics();
        ringG.fillStyle(isGreenPod ? 0x064e3b : 0x450a0a, 0.95);
        ringG.fillCircle(0, 0, radius);
        ringG.lineStyle(3, colorHex, 1);
        ringG.strokeCircle(0, 0, radius);

        const iconTxt = this.add
          .text(0, 0, isGreenPod ? '🛸' : '☄️', {
            fontSize: isEmmaTier ? '28px' : '22px'
          })
          .setOrigin(0.5);

        const hitZone = this.add
          .circle(0, 0, radius + 12, 0x000000, 0.001)
          .setInteractive({ useHandCursor: true });

        node.add([glow, ringG, iconTxt, hitZone]);
        fieldContainer.add(node);

        const speed = isEmmaTier
          ? Phaser.Math.FloatBetween(0.7, 1.25)
          : isWyattTier
          ? Phaser.Math.FloatBetween(1.3, 2.1)
          : Phaser.Math.FloatBetween(1.9, 3.1);
        const ang = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const objRecord: AsteroidObj = {
          node,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          alive: true
        };
        objs.push(objRecord);

        hitZone.on('pointerdown', () => {
          if (finished || !objRecord.alive) return;
          objRecord.alive = false;

          // Fire cyan phaser beam from bottom-center turret `(0, 114)` to target `(node.x, node.y)`
          const phaserG = this.add.graphics();
          phaserG.setBlendMode(Phaser.BlendModes.ADD);
          phaserG.lineStyle(8, isGreenPod ? 0xef4444 : 0x00f5d4, 0.45);
          phaserG.lineBetween(0, 114, node.x, node.y);
          phaserG.lineStyle(3, 0xffffff, 1);
          phaserG.lineBetween(0, 114, node.x, node.y);
          beamContainer.add(phaserG);
          this.tweens.add({
            targets: phaserG,
            alpha: 0,
            duration: 180,
            onComplete: () => phaserG.destroy()
          });

          if (isGreenPod) {
            endAsteroidChallenge(false, 'FRIENDLY GREEN ESCAPE POD HIT!');
            return;
          }

          StarshipAudio.playTrajectoryLaserLock(2);
          Juice.burstStars(this, 640 + node.x, 364 + node.y, 16, [0x00f5d4, 0xfde047, 0xef4444]);
          node.destroy();

          blastedCount += 1;
          const remSec = Math.max(0, (durationMs - (performance.now() - startMs)) / 1000);
          statusTxt.setText(
            `💥 BLASTED: ${blastedCount} / ${targetMeteors}   •   ⏱️ ${remSec.toFixed(1)}s REMAINING`
          );
          this.fitTextToWidth(statusTxt, 740);

          if (blastedCount >= targetMeteors) {
            endAsteroidChallenge(true, `ALL ${targetMeteors} RED METEORS VAPORIZED!`);
          }
        });
      }

      const loopTimer = this.time.addEvent({
        delay: 20,
        loop: true,
        callback: () => {
          if (finished || !this.scene.isActive()) return;
          const elapsed = performance.now() - startMs;
          const remSec = Math.max(0, (durationMs - elapsed) / 1000);
          statusTxt.setText(
            `💥 BLASTED: ${blastedCount} / ${targetMeteors}   •   ⏱️ ${remSec.toFixed(1)}s REMAINING`
          );
          this.fitTextToWidth(statusTxt, 740);

          const maxX = gridW / 2 - 36;
          const maxY = gridH / 2 - 34;
          for (const o of objs) {
            if (!o.alive) continue;
            o.node.x += o.vx;
            o.node.y += o.vy;
            if (o.node.x < -maxX || o.node.x > maxX) o.vx *= -1;
            if (o.node.y < -maxY || o.node.y > maxY) o.vy *= -1;
          }

          if (elapsed >= durationMs) {
            endAsteroidChallenge(
              false,
              `SHIELD WINDOW EXPIRED (${blastedCount}/${targetMeteors} BLASTED)!`
            );
          }
        }
      });
    } else if (challengeType === 'memory') {
      // =======================================================================
      // CHALLENGE 5: `🎹 SUBSPACE SIGNAL MEMORY` (Star Trek Simon Says)
      // - Emma (3yo): 3-step sequence
      // - Wyatt (4yo): 4-step sequence
      // - Commanders: 5-step high-speed sequence
      // =======================================================================
      const sequenceLength = isEmmaTier ? 3 : isWyattTier ? 4 : 5;
      const stepDelayMs = isEmmaTier ? 680 : isWyattTier ? 580 : 430;

      const title = this.add
        .text(0, -184, '🎹 SUBSPACE SIGNAL MEMORY — HARMONIC WARP CRYSTALS!', {
          fontSize: '21px',
          fontStyle: 'bold',
          color: '#fde047',
          stroke: '#020617',
          strokeThickness: 4
        })
        .setOrigin(0.5);
      this.fitTextToWidth(title, 760);

      const sub = this.add
        .text(0, -146, 'WATCH & LISTEN TO THE SUBSPACE CRYSTAL SEQUENCE...', {
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#7dd3fc'
        })
        .setOrigin(0.5);
      this.fitTextToWidth(sub, 760);
      stageContainer.add([title, sub]);

      const crystalSpecs = [
        { label: '🔷 CYAN ALPHA', color: 0x00f5d4, x: -165, y: -38 },
        { label: '🔶 AMBER BETA', color: 0xf59e0b, x: 165, y: -38 },
        { label: '🟣 VIOLET GAMMA', color: 0xa855f7, x: -165, y: 66 },
        { label: '🟢 EMERALD DELTA', color: 0x10b981, x: 165, y: 66 }
      ];

      const sequence: number[] = [];
      for (let i = 0; i < sequenceLength; i++) {
        sequence.push(Phaser.Math.Between(0, 3));
      }

      let acceptingInput = false;
      let playerStepIdx = 0;
      let finished = false;

      const statusTxt = this.add
        .text(0, 154, `📡 RECEIVING SUBSPACE TRANSMISSION (0 / ${sequenceLength})...`, {
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#fde047',
          stroke: '#020617',
          strokeThickness: 4
        })
        .setOrigin(0.5);
      this.fitTextToWidth(statusTxt, 740);
      stageContainer.add(statusTxt);

      const crystalHooks: Array<{ flash: () => void }> = [];

      crystalSpecs.forEach((spec, idx) => {
        const c = this.add.container(spec.x, spec.y);
        const w = 296;
        const h = 84;

        const baseG = this.add.graphics();
        baseG.fillStyle(0x0f172a, 0.96);
        baseG.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
        baseG.lineStyle(3, spec.color, 0.85);
        baseG.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);

        const flashG = this.add.graphics().setAlpha(0);
        flashG.fillStyle(spec.color, 0.85);
        flashG.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
        flashG.lineStyle(4, 0xffffff, 1);
        flashG.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);

        const txt = this.add
          .text(0, 0, spec.label, {
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#020617',
            strokeThickness: 4
          })
          .setOrigin(0.5);
        this.fitTextToWidth(txt, w - 24);

        const hit = this.add
          .rectangle(0, 0, w, h, 0x000000, 0.001)
          .setInteractive({ useHandCursor: true });

        c.add([baseG, flashG, txt, hit]);
        stageContainer.add(c);

        const flashCrystal = () => {
          StarshipAudio.playMemoryCrystalChime(idx);
          flashG.setAlpha(1);
          c.setScale(1.06);
          this.tweens.add({
            targets: flashG,
            alpha: 0,
            duration: Math.min(360, stepDelayMs - 70),
            ease: 'Quad.easeOut'
          });
          this.tweens.add({
            targets: c,
            scaleX: 1,
            scaleY: 1,
            duration: 200,
            ease: 'Back.easeOut'
          });
        };

        crystalHooks.push({ flash: flashCrystal });

        hit.on('pointerdown', () => {
          if (!acceptingInput || finished) return;
          flashCrystal();

          const expectedIdx = sequence[playerStepIdx];
          if (idx === expectedIdx) {
            playerStepIdx += 1;
            statusTxt.setText(
              `🟢 YOUR TURN: TAP THE SEQUENCE (${playerStepIdx} / ${sequenceLength})`
            );
            this.fitTextToWidth(statusTxt, 740);

            if (playerStepIdx >= sequenceLength) {
              finished = true;
              acceptingInput = false;
              StarshipAudio.playAnswerCorrectFanfare();
              sub.setText('🟢 SUBSPACE SEQUENCE VERIFIED! +2 OVERCLOCK PAD BOOST!');
              sub.setColor('#6ee7b7');
              this.fitTextToWidth(sub, 760);
              statusTxt.setText(`🏆 PERFECT ${sequenceLength}-CRYSTAL HARMONIC SYNC!`);
              statusTxt.setColor('#6ee7b7');
              this.fitTextToWidth(statusTxt, 740);
              Juice.burstStars(this, 640, 340, 32, [0x10b981, 0xfde047, 0x00f5d4]);
              this.completeMiniChallengeAndAdvance(player, 2);
            }
          } else {
            finished = true;
            acceptingInput = false;
            StarshipAudio.playAnswerWrongBuzzer();
            sub.setText('🔴 SUBSPACE HARMONIC MISMATCH — +1 AUXILIARY PAD BOOST!');
            sub.setColor('#fca5a5');
            this.fitTextToWidth(sub, 760);
            statusTxt.setText(
              `EXPECTED ${crystalSpecs[expectedIdx].label} • +1 AUXILIARY PAD BOOST`
            );
            statusTxt.setColor('#fca5a5');
            this.fitTextToWidth(statusTxt, 740);
            this.completeMiniChallengeAndAdvance(player, 1);
          }
        });
      });

      // Play the computer sequence step-by-step
      sequence.forEach((crystalIdx, stepNum) => {
        this.time.delayedCall(450 + stepNum * stepDelayMs, () => {
          if (!this.scene.isActive() || finished) return;
          statusTxt.setText(
            `📡 TRANSMITTING CRYSTAL ${stepNum + 1} OF ${sequenceLength}...`
          );
          this.fitTextToWidth(statusTxt, 740);
          crystalHooks[crystalIdx]?.flash();
        });
      });

      this.time.delayedCall(520 + sequenceLength * stepDelayMs, () => {
        if (!this.scene.isActive() || finished) return;
        acceptingInput = true;
        sub.setText(`${player.roster.name}: TAP THE WARP CRYSTALS IN THE EXACT SAME ORDER!`);
        sub.setColor('#fde047');
        this.fitTextToWidth(sub, 760);
        statusTxt.setText(`🖖 YOUR TURN: TAP THE SEQUENCE (0 / ${sequenceLength})`);
        statusTxt.setColor('#6ee7b7');
        this.fitTextToWidth(statusTxt, 740);
      });
    } else {
      // =======================================================================
      // CHALLENGE 6: `🔍 HOLO-DECK ANOMALY SCAN` (Real Game Sprites + Subtle Visual Glitches!)
      // - Every cell in the grid renders the EXACT SAME base game sprite texture!
      // - Emma (3yo): 3 cols x 2 rows (6 large sprites), 5.0s (5000ms) — anomaly is upside-down (`setFlipY(true)`) + golden-pink tint!
      // - Wyatt (4yo): 3 cols x 3 rows (9 sprites), 3.8s (3800ms) — anomaly is upside-down, tilted 35°, or bright green/magenta tinted!
      // - Commanders (Adults): 5 cols x 4 rows (20 sprites), 2.3s (2300ms) — anomaly has 1 subtle glitch:
      //   mirrored (`setFlipX(true)`), tilted (`±16°`), upside-down (`setFlipY(true)`), subtle phase-tint (`0x99ddff`/`0xffbbdd`), or 80% scale!
      // =======================================================================
      const cols = isEmmaTier ? 3 : isWyattTier ? 3 : 5;
      const rows = isEmmaTier ? 2 : isWyattTier ? 3 : 4;
      const totalCards = cols * rows;
      const durationMs = isEmmaTier ? 5000 : isWyattTier ? 3800 : 2300;

      // Build candidate pool of real loaded game sprites
      const candidateSprites: Array<{ key: string; frame?: number; label: string }> = [
        { key: 'starship-astro-wyatt', label: 'ASTRO WYATT' },
        { key: 'starship-astro-emma', label: 'PRINCESS EMMA' },
        { key: 'starship-astro-robert', label: 'COMMANDER ROBERT' },
        { key: 'starship-astro-rita', label: 'DIRECTOR RITA' },
        { key: 'starship-astro-papa', label: 'ENGINEER PAPA' },
        { key: 'starship-astro-nana', label: 'COUNSELOR NANA' },
        { key: 'starship-astro-grandpa', label: 'ADMIRAL GRANDPA' },
        { key: 'starship-astro-babci', label: 'NAVIGATOR BABCI' },
        { key: 'starship-astro-dreadbot', label: 'DREAD-BOT X-99' },
        { key: 'starship-card-wyatt', label: 'WYATT EXOSUIT' },
        { key: 'starship-card-emma', label: 'EMMA EXOSUIT' },
        { key: 'starship-card-robert', label: 'ROBERT EXOSUIT' },
        { key: 'starship-card-rita', label: 'RITA EXOSUIT' },
        { key: 'challenge-warp-core', label: 'WARP CORE' },
        { key: 'dice-plunger-console', label: 'THRUSTER POD' },
        { key: 'sprite-3d-supply-pods', frame: 0, label: 'SUPPLY POD ALPHA' },
        { key: 'sprite-3d-supply-pods', frame: 1, label: 'SUPPLY POD BETA' },
        { key: 'sprite-3d-supply-pods', frame: 2, label: 'SUPPLY POD GAMMA' }
      ].filter((s) => this.textures.exists(s.key));

      const chosenSpriteSpec =
        (Phaser.Utils.Array.GetRandom(candidateSprites) as
          | { key: string; frame?: number; label: string }
          | undefined) ?? { key: 'challenge-warp-core', label: 'WARP CORE' };

      if (this.textures.exists(chosenSpriteSpec.key)) {
        this.textures.get(chosenSpriteSpec.key).setFilter(Phaser.Textures.FilterMode.LINEAR);
      }

      const anomalyIndex = Phaser.Math.Between(0, totalCards - 1);

      // Select the tier-appropriate visual mutation for the 1 anomaly sprite
      type CommanderGlitchType = 'flipX' | 'tilt16' | 'flipY' | 'tintShift' | 'shrunk80';
      type WyattGlitchType = 'flipY' | 'tilt35' | 'neonTint';

      const commanderGlitch: CommanderGlitchType = Phaser.Utils.Array.GetRandom([
        'flipX',
        'tilt16',
        'flipY',
        'tintShift',
        'shrunk80'
      ] as CommanderGlitchType[]);

      const wyattGlitch: WyattGlitchType = Phaser.Utils.Array.GetRandom([
        'flipY',
        'tilt35',
        'neonTint'
      ] as WyattGlitchType[]);

      const title = this.add
        .text(0, -184, '🔍 HOLO-DECK ANOMALY SCAN — SPOT THE 1 GLITCHED SPRITE!', {
          fontSize: '21px',
          fontStyle: 'bold',
          color: '#fde047',
          stroke: '#020617',
          strokeThickness: 4
        })
        .setOrigin(0.5);
      this.fitTextToWidth(title, 760);

      const subPrompt = isEmmaTier
        ? `${player.roster.name}: Tap the 1 UPSIDE-DOWN ${chosenSpriteSpec.label} sprite!`
        : isWyattTier
        ? `${player.roster.name}: All 9 cells show ${chosenSpriteSpec.label} — tap the 1 GLITCHED sprite!`
        : `${player.roster.name}: 20 ${chosenSpriteSpec.label} sprites — tap the 1 subtle visual glitch in 2.3s!`;

      const sub = this.add
        .text(0, -146, subPrompt, {
          fontSize: '13.5px',
          fontStyle: 'bold',
          color: '#7dd3fc'
        })
        .setOrigin(0.5);
      this.fitTextToWidth(sub, 760);
      stageContainer.add([title, sub]);

      const cardW = isEmmaTier ? 176 : isWyattTier ? 156 : 118;
      const cardH = isEmmaTier ? 104 : isWyattTier ? 72 : 54;
      const gapX = isEmmaTier ? 20 : isWyattTier ? 16 : 12;
      const gapY = isEmmaTier ? 16 : isWyattTier ? 12 : 10;
      const totalGridW = cols * cardW + (cols - 1) * gapX;
      const totalGridH = rows * cardH + (rows - 1) * gapY;
      const startX = -totalGridW / 2 + cardW / 2;
      const startY = 4 - totalGridH / 2 + cardH / 2;

      let finished = false;
      const startMs = performance.now();

      const statusTxt = this.add
        .text(0, 154, `⏱️ SENSOR WINDOW: ${(durationMs / 1000).toFixed(1)}s REMAINING`, {
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#00f5d4',
          stroke: '#020617',
          strokeThickness: 4
        })
        .setOrigin(0.5);
      this.fitTextToWidth(statusTxt, 740);
      stageContainer.add(statusTxt);

      const resolveScan = (won: boolean, reason: string) => {
        if (finished) return;
        finished = true;
        scanTimer.remove(false);

        if (won) {
          StarshipAudio.playAnswerCorrectFanfare();
          sub.setText(`🟢 ${reason} +2 OVERCLOCK PAD BOOST!`);
          sub.setColor('#6ee7b7');
          this.fitTextToWidth(sub, 760);
          statusTxt.setText('🏆 HOLO-DECK ANOMALY ISOLATED!');
          statusTxt.setColor('#6ee7b7');
          this.fitTextToWidth(statusTxt, 740);
          Juice.burstStars(this, 640, 340, 32, [0x10b981, 0xfde047, 0x00f5d4]);
          this.completeMiniChallengeAndAdvance(player, 2);
        } else {
          StarshipAudio.playAnswerWrongBuzzer();
          sub.setText(`🔴 ${reason} +1 AUXILIARY PAD BOOST!`);
          sub.setColor('#fca5a5');
          this.fitTextToWidth(sub, 760);
          statusTxt.setText(`${reason} • +1 AUXILIARY PAD BOOST`);
          statusTxt.setColor('#fca5a5');
          this.fitTextToWidth(statusTxt, 740);
          this.completeMiniChallengeAndAdvance(player, 1);
        }
      };

      const spriteBoxSize = isEmmaTier ? 84 : isWyattTier ? 58 : 44;

      for (let i = 0; i < totalCards; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const cx = startX + c * (cardW + gapX);
        const cy = startY + r * (cardH + gapY);
        const isAnomaly = i === anomalyIndex;

        const cardNode = this.add.container(cx, cy);
        const bgG = this.add.graphics();
        bgG.fillStyle(0x0f172a, 0.96);
        bgG.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 11);
        bgG.lineStyle(2.2, 0x38bdf8, 0.9);
        bgG.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 11);

        const sprite = this.add
          .image(0, 0, chosenSpriteSpec.key, chosenSpriteSpec.frame)
          .setOrigin(0.5);
        sprite.setDisplaySize(spriteBoxSize, spriteBoxSize);
        const baseScaleX = sprite.scaleX;
        const baseScaleY = sprite.scaleY;

        let glitchLabel = 'ANOMALY GLITCH';
        if (isAnomaly) {
          if (isEmmaTier) {
            // Emma (3yo): upside-down (`setFlipY(true)`) + golden-pink tint (`0xff99cc` / `0xffd700`)
            sprite.setFlipY(true);
            sprite.setTint(Math.random() > 0.5 ? 0xff99cc : 0xffd700);
            glitchLabel = 'UPSIDE-DOWN SPRITE';
          } else if (isWyattTier) {
            // Wyatt (4yo): upside-down (`setFlipY(true)`), tilted `35°`, or bright green/magenta tinted (`0x55ff88`)
            if (wyattGlitch === 'flipY') {
              sprite.setFlipY(true);
              glitchLabel = 'UPSIDE-DOWN SPRITE';
            } else if (wyattGlitch === 'tilt35') {
              sprite.setAngle(Math.random() > 0.5 ? 35 : -35);
              glitchLabel = 'TILTED 35° SPRITE';
            } else {
              sprite.setTint(Math.random() > 0.5 ? 0x55ff88 : 0xff55dd);
              glitchLabel = 'PHASE-TINTED SPRITE';
            }
          } else {
            // Commander Tier (Adults): 1 subtle visual glitch among 20 identical sprites in 2.3s!
            if (commanderGlitch === 'flipX') {
              sprite.setFlipX(true);
              glitchLabel = 'MIRRORED SPRITE';
            } else if (commanderGlitch === 'tilt16') {
              sprite.setAngle(Math.random() > 0.5 ? 16 : -16);
              glitchLabel = 'OFF-AXIS 16° SPRITE';
            } else if (commanderGlitch === 'flipY') {
              sprite.setFlipY(true);
              glitchLabel = 'INVERTED SPRITE';
            } else if (commanderGlitch === 'tintShift') {
              sprite.setTint(Math.random() > 0.5 ? 0x99ddff : 0xffbbdd);
              glitchLabel = 'PHASE-SHIFTED SPRITE';
            } else {
              sprite.setScale(baseScaleX * 0.8, baseScaleY * 0.8);
              glitchLabel = 'SCALE-ANOMALY SPRITE';
            }
          }
        }

        const hit = this.add
          .rectangle(0, 0, cardW, cardH, 0x000000, 0.001)
          .setInteractive({ useHandCursor: true });

        cardNode.add([bgG, sprite, hit]);
        stageContainer.add(cardNode);

        hit.on('pointerdown', () => {
          if (finished) return;
          bgG.clear();
          bgG.fillStyle(isAnomaly ? 0x065f46 : 0x450a0a, 0.98);
          bgG.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 11);
          bgG.lineStyle(3.5, isAnomaly ? 0x10b981 : 0xef4444, 1);
          bgG.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 11);

          if (isAnomaly) {
            resolveScan(true, `${glitchLabel} LOCKED IN!`);
          } else {
            resolveScan(false, `NORMAL ${chosenSpriteSpec.label} TAPPED!`);
          }
        });
      }

      const scanTimer = this.time.addEvent({
        delay: 30,
        loop: true,
        callback: () => {
          if (finished || !this.scene.isActive()) return;
          const elapsed = performance.now() - startMs;
          const remSec = Math.max(0, (durationMs - elapsed) / 1000);
          statusTxt.setText(`⏱️ SENSOR WINDOW: ${remSec.toFixed(1)}s REMAINING`);
          this.fitTextToWidth(statusTxt, 740);
          if (elapsed >= durationMs) {
            resolveScan(false, 'SENSOR SCAN WINDOW EXPIRED!');
          }
        }
      });
    }
  }

  private finishTurnAndAdvancePlayer(delayMs = 1400): void {
    // Deliberate pause between turns (1400ms for humans, 900ms beat for Dread-Bot) so the family can see the board state clearly
    this.time.delayedCall(delayMs, () => {
      if (!this.scene.isActive() || this.scenePhase === 'VICTORY') return;
      const nextIdx = (this.activePlayerIndex + 1) % this.players.length;
      this.startPlayerTurn(nextIdx);
    });
  }

  // ===========================================================================
  // UPGRADE 3: GRAND UNICORN CITADEL VICTORY CELEBRATION (`ui-startrek-command-deck`)
  // ===========================================================================

  private triggerCitadelVictory(winner: ActiveAstronautPlayer): void {
    this.stopTriviaCountdownTimer();
    this.missionActive = false;
    this.clearActiveMissionStorage();
    this.pausedTweensSnapshot = [];
    this.scenePhase = 'VICTORY';

    this.dockContainer.removeAll(true);
    this.diceConsoleContainer.removeAll(true);
    this.cutsceneContainer.removeAll(true);
    this.tronBlackoutContainer.removeAll(true);
    this.trajectoryLaserContainer.removeAll(true);
    this.pauseModalContainer.removeAll(true);
    this.pauseModalContainer.setVisible(false);
    this.lobbyContainer.removeAll(true);
    this.lobbyContainer.setVisible(false);

    this.victoryContainer.removeAll(true);
    this.victoryContainer.setVisible(true).setDepth(4000);

    StarshipAudio.playVictoryAnthem();
    StarshipAudio.playVoice(winner.roster.victoryVoice);

    const shade = this.add
      .rectangle(640, 360, 1280, 720, 0x020617, 0.88)
      .setInteractive();
    this.victoryContainer.add(shade);

    const card = this.add.container(640, 360);
    if (this.textures.exists('ui-startrek-command-deck')) {
      this.textures.get('ui-startrek-command-deck').setFilter(Phaser.Textures.FilterMode.LINEAR);
      const frameImg = this.add
        .image(0, 0, 'ui-startrek-command-deck')
        .setDisplaySize(980, 560);
      card.add(frameImg);
    } else {
      const g = this.add.graphics();
      g.fillStyle(0x090f20, 0.97);
      g.fillRoundedRect(-470, -270, 940, 540, 24);
      g.lineStyle(4, 0xfde047, 1);
      g.strokeRoundedRect(-470, -270, 940, 540, 24);
      card.add(g);
    }

    const crownTxt = this.add
      .text(0, -196, '🦄🏆  STARSHIP UNICORN CITADEL REACHED!  🏆🦄', {
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#fde047',
        stroke: '#020617',
        strokeThickness: 5
      })
      .setOrigin(0.5);
    this.fitTextToWidth(crownTxt, 780);

    const astroKey = `starship-astro-${winner.roster.id}`;
    const cardKey = `starship-card-${winner.roster.id}`;
    const portKey = this.textures.exists(astroKey) ? astroKey : cardKey;
    if (this.textures.exists(portKey)) {
      this.textures.get(portKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
      const portImg = this.add
        .image(0, -76, portKey)
        .setDisplaySize(156, 156);
      card.add(portImg);
    }
    const portRim = this.add.graphics();
    portRim.lineStyle(3.5, winner.bay.color, 1);
    portRim.strokeRoundedRect(-80, -156, 160, 160, 16);
    card.add(portRim);

    const winTitle = this.add
      .text(0, 26, `${winner.roster.callsign} WINS THE MISSION!`, {
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#020617',
        strokeThickness: 5
      })
      .setOrigin(0.5);
    this.fitTextToWidth(winTitle, 780);

    const statsSummary = this.players
      .map(
        (p) =>
          `${p.roster.name}: Pad ${p.padIndex}/${this.missionTotalPads} (${p.correctCount} ⚡)`
      )
      .join('   •   ');

    const statsTxt = this.add
      .text(0, 76, statsSummary, {
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#7dd3fc',
        align: 'center',
        wordWrap: { width: 780 }
      })
      .setOrigin(0.5);
    this.fitTextToWidth(statsTxt, 780);

    card.add([crownTxt, winTitle, statsTxt]);
    this.victoryContainer.add(card);

    // Explicit top-level interactive buttons on `this.victoryContainer` (`depth: 4000`)
    const launchNewBtn = this.createCockpitRockerSwitch(
      640 - 185,
      360 + 162,
      330,
      64,
      '🚀  LAUNCH NEW MISSION',
      0x10b981,
      () => {
        this.stopTriviaCountdownTimer();
        StarshipAudio.stopAllVoice();
        this.missionActive = false;
        this.players.forEach((p) => {
          p.padIndex = 0;
          p.correctCount = 0;
          p.overclockCount = 0;
        });
        this.victoryContainer.removeAll(true);
        this.victoryContainer.setVisible(false);
        this.openPreFlightLobby(false);
      }
    );

    const hubBtn = this.createCockpitRockerSwitch(
      640 + 185,
      360 + 162,
      330,
      64,
      '◀  RETURN TO ARCADE HUB',
      0x0284c7,
      () => {
        this.stopTriviaCountdownTimer();
        StarshipAudio.stopAllVoice();
        this.missionActive = false;
        this.victoryContainer.removeAll(true);
        this.victoryContainer.setVisible(false);
        AudioBus.startCozyLoop();
        this.scene.start('HubScene');
      }
    );

    this.victoryContainer.add([launchNewBtn, hubBtn]);

    Juice.burstStars(this, 640, 260, 45, [0xfde047, 0x38bdf8, 0xf472b6, 0x10b981]);
  }
}
