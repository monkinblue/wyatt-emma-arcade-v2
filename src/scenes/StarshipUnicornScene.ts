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
import triviaBankRaw from '../data/starshipTrivia.json';
import { ArcadeState } from '../core/ArcadeState';
import { AudioBus } from '../core/AudioBus';
import { Juice } from '../core/Juice';
import { StarshipAudio, StarshipVoiceKey } from '../core/StarshipAudioEngine';

export type AstronautId =
  | 'robert'
  | 'rita'
  | 'wyatt'
  | 'emma'
  | 'papa'
  | 'nana'
  | 'grandpa'
  | 'babci'
  | 'guest';

export type TriviaProfileTier = 'ADULT' | 'WYATT_4YO' | 'EMMA_3YO';

export interface TriviaQuestionItem {
  id: string;
  tier: TriviaProfileTier;
  category: string;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
}

interface TriviaBankData {
  version: string;
  counts?: {
    adult: number;
    wyatt4yo: number;
    emma3yo: number;
    total: number;
  };
  questions:
    | TriviaQuestionItem[]
    | {
        ADULT?: TriviaQuestionItem[];
        WYATT_4YO?: TriviaQuestionItem[];
        EMMA_3YO?: TriviaQuestionItem[];
      };
}

const TRIVIA_BANK = triviaBankRaw as unknown as TriviaBankData;

const FALLBACK_QUESTIONS: Record<TriviaProfileTier, TriviaQuestionItem> = {
  ADULT: {
    id: 'fallback_adult',
    tier: 'ADULT',
    category: 'Space & Aerospace',
    prompt: 'What are the giant mechanical catching arms on SpaceX Starbase launch tower nicknamed?',
    options: ['Cyber Tongs', 'Mechazilla (The Chopsticks)', 'Star Catcher 9000', 'Kraken Claws'],
    correctIndex: 1
  },
  WYATT_4YO: {
    id: 'fallback_wyatt',
    tier: 'WYATT_4YO',
    category: 'Space & Rockets',
    prompt: 'What counts down "3, 2, 1, BLAST OFF!" and flies up to the Moon?',
    options: ['🚀 A Rocket Ship', '🚲 A Bicycle', '🛒 A Shopping Cart', '🛋️ A Couch'],
    correctIndex: 0
  },
  EMMA_3YO: {
    id: 'fallback_emma',
    tier: 'EMMA_3YO',
    category: 'Unicorns & Magic',
    prompt: 'Tap the magical UNICORN with a sparkly horn!',
    options: ['🦄 Unicorn', '🐸 Frog', '🚜 Tractor', '🥦 Broccoli'],
    correctIndex: 0
  }
};

function getQuestionPoolForTier(tier: TriviaProfileTier): TriviaQuestionItem[] {
  const rawQ = TRIVIA_BANK?.questions;
  if (Array.isArray(rawQ)) {
    const filtered = rawQ.filter(
      (q) => q && q.tier === tier && Array.isArray(q.options) && q.options.length === 4
    );
    if (filtered.length > 0) return filtered;
  } else if (rawQ && typeof rawQ === 'object') {
    const tierList = rawQ[tier];
    if (Array.isArray(tierList) && tierList.length > 0) {
      return tierList;
    }
  }
  return [FALLBACK_QUESTIONS[tier] ?? FALLBACK_QUESTIONS.ADULT];
}

export interface AstronautRosterSpec {
  id: AstronautId;
  name: string;
  callsign: string;
  roleTitle: string;
  tier: TriviaProfileTier;
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
    turnVoice: 'turn_wyatt',
    victoryVoice: 'victory_wyatt'
  },
  {
    id: 'emma',
    name: 'EMMA',
    callsign: 'SPACE PRINCESS EMMA',
    roleTitle: 'Starlight Unicorn Specialist (Age 3)',
    tier: 'EMMA_3YO',
    suitColorHex: '#f472b6',
    suitColorNum: 0xf472b6,
    turnVoice: 'turn_emma',
    victoryVoice: 'victory_emma'
  },
  {
    id: 'robert',
    name: 'ROBERT',
    callsign: 'COMMANDER ROBERT',
    roleTitle: 'FICSIT Mission Commander',
    tier: 'ADULT',
    suitColorHex: '#f59e0b',
    suitColorNum: 0xf59e0b,
    turnVoice: 'turn_robert',
    victoryVoice: 'victory_robert'
  },
  {
    id: 'rita',
    name: 'RITA',
    callsign: 'FLIGHT DIRECTOR RITA',
    roleTitle: 'Starbase Flight Director',
    tier: 'ADULT',
    suitColorHex: '#38bdf8',
    suitColorNum: 0x38bdf8,
    turnVoice: 'turn_rita',
    victoryVoice: 'victory_rita'
  },
  {
    id: 'papa',
    name: 'PAPA',
    callsign: 'CHIEF ENGINEER PAPA',
    roleTitle: 'Deep-Space Chief Engineer',
    tier: 'ADULT',
    suitColorHex: '#60a5fa',
    suitColorNum: 0x60a5fa,
    turnVoice: 'turn_papa',
    victoryVoice: 'victory_papa'
  },
  {
    id: 'nana',
    name: 'NANA',
    callsign: 'SCIENCE OFFICER NANA',
    roleTitle: 'Orbital Science Officer',
    tier: 'ADULT',
    suitColorHex: '#7dd3fc',
    suitColorNum: 0x7dd3fc,
    turnVoice: 'turn_nana',
    victoryVoice: 'victory_nana'
  },
  {
    id: 'grandpa',
    name: 'GRANDPA',
    callsign: 'FLEET ADMIRAL GRANDPA',
    roleTitle: 'Starfleet Orbital Admiral',
    tier: 'ADULT',
    suitColorHex: '#93c5fd',
    suitColorNum: 0x93c5fd,
    turnVoice: 'turn_grandpa',
    victoryVoice: 'victory_grandpa'
  },
  {
    id: 'babci',
    name: 'BABCI',
    callsign: 'NAVIGATOR BABCI',
    roleTitle: 'Celestial Rose-Gold Navigator',
    tier: 'ADULT',
    suitColorHex: '#f9a8d4',
    suitColorNum: 0xf9a8d4,
    turnVoice: 'turn_babci',
    victoryVoice: 'victory_babci'
  },
  {
    id: 'guest',
    name: 'GUEST',
    callsign: 'VIP MISSION SPECIALIST',
    roleTitle: 'Chrome Nebula Specialist',
    tier: 'ADULT',
    suitColorHex: '#facc15',
    suitColorNum: 0xfacc15,
    turnVoice: 'turn_guest',
    victoryVoice: 'victory_guest'
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
  | 'WORMHOLE'
  | 'OVERCLOCK'
  | 'ASTEROID'
  | 'RAINBOW_STARSHIP'
  | 'CITADEL';

export interface OrbitalHexPad {
  index: number;
  numberLabel: number;
  x: number;
  y: number;
  sectorIndex: number; // 1..5
  padColor: PadColorType;
  special: SpecialTileType;
  wormholeTargetIndex?: number;
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
    title: 'SECTOR 1: STARBASE LAUNCH COMPLEX',
    subtitle: 'Orbital Gantry & Floodlights',
    x: 205,
    y: 472,
    accentColor: 0xf59e0b,
    hexColor: '#fbbf24',
    icon: '🚀'
  },
  {
    sectorNum: 2,
    title: 'SECTOR 2: FICSIT HYPER-REFINERY',
    subtitle: 'Plasma Conduits & Turbo Turbines',
    x: 880,
    y: 468,
    accentColor: 0xf97316,
    hexColor: '#fdba74',
    icon: '⚙️'
  },
  {
    sectorNum: 3,
    title: 'SECTOR 3: CRYSTAL ASTEROID TRENCH',
    subtitle: 'Bioluminescent Meteor Field',
    x: 645,
    y: 295,
    accentColor: 0xa855f7,
    hexColor: '#d8b4fe',
    icon: '☄️'
  },
  {
    sectorNum: 4,
    title: 'SECTOR 4: RAINBOW NEBULA RELAY',
    subtitle: 'Prismatic Starlight Bridges',
    x: 245,
    y: 162,
    accentColor: 0x38bdf8,
    hexColor: '#7dd3fc',
    icon: '🌈'
  },
  {
    sectorNum: 5,
    title: 'SECTOR 5: UNICORN CITADEL SUMMIT',
    subtitle: 'Galactic Champion Sanctuary',
    x: 1035,
    y: 74,
    accentColor: 0xf472b6,
    hexColor: '#f9a8d4',
    icon: '🦄'
  }
];

export class StarshipUnicornScene extends Phaser.Scene {
  // Mission Configuration State
  private selectedAstronautIds: AstronautId[] = ['wyatt', 'emma', 'robert', 'rita'];
  private missionTotalPads: 25 | 50 = 25;

  // Active Game State
  private scenePhase:
    | 'LOBBY'
    | 'TRIVIA'
    | 'LOCKING_ANSWER'
    | 'DICE_ROLL'
    | 'PATH_PREVIEW'
    | 'MOVING'
    | 'CUTSCENE'
    | 'VICTORY' = 'LOBBY';
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

  // Display Containers
  private bgContainer!: Phaser.GameObjects.Container;
  private biomePropsContainer!: Phaser.GameObjects.Container;
  private boardContainer!: Phaser.GameObjects.Container;
  private trajectoryLaserContainer!: Phaser.GameObjects.Container;
  private tokensContainer!: Phaser.GameObjects.Container;
  private topHudContainer!: Phaser.GameObjects.Container;
  private dockContainer!: Phaser.GameObjects.Container;
  private cutsceneContainer!: Phaser.GameObjects.Container;
  private lobbyContainer!: Phaser.GameObjects.Container;
  private victoryContainer!: Phaser.GameObjects.Container;
  private activeHighlightRing!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'StarshipUnicornScene' });
  }

  public create(): void {
    // Silence cozy music-box BGM so living-room speakers are 100% silent when idle
    AudioBus.stopCozyLoop();
    StarshipAudio.stopAmbientStarbasePad();
    this.enforceLinearFiltering();
    this.ensureSmoothGlowTextures();

    this.bgContainer = this.add.container(0, 0).setDepth(1);
    this.biomePropsContainer = this.add.container(0, 0).setDepth(5);
    this.boardContainer = this.add.container(0, 0).setDepth(10);
    this.trajectoryLaserContainer = this.add.container(0, 0).setDepth(18);
    this.tokensContainer = this.add.container(0, 0).setDepth(25);
    this.topHudContainer = this.add.container(0, 0).setDepth(40);
    this.dockContainer = this.add.container(0, 0).setDepth(50);
    this.cutsceneContainer = this.add.container(0, 0).setDepth(90);
    this.lobbyContainer = this.add.container(0, 0).setDepth(100);
    this.victoryContainer = this.add.container(0, 0).setDepth(150);

    this.renderCosmicBackdrop();
    this.buildAndRenderOrbitalBoard(this.missionTotalPads);
    this.renderTopMissionHeader();
    this.openPreFlightLobby(true);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      StarshipAudio.stopVoice();
      StarshipAudio.stopAmbientStarbasePad();
    });

    this.cameras.main.fadeIn(320, 4, 8, 22);
  }

  private enforceLinearFiltering(): void {
    const keysToSmooth: string[] = ['starship-board-bg', 'hub-toy-starship-unicorn', 'mode-tv'];
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
  }

  private renderCosmicBackdrop(): void {
    this.bgContainer.removeAll(true);

    if (this.textures.exists('starship-board-bg')) {
      this.textures.get('starship-board-bg').setFilter(Phaser.Textures.FilterMode.LINEAR);
      const bgImg = this.add
        .image(640, 360, 'starship-board-bg')
        .setOrigin(0.5, 0.5)
        .setDisplaySize(1280, 720);
      this.bgContainer.add(bgImg);
    } else {
      const g = this.add.graphics();
      g.fillGradientStyle(0x060b19, 0x0f172a, 0x1e1b4b, 0x090d16, 1);
      g.fillRect(0, 0, 1280, 720);
      this.bgContainer.add(g);
    }

    // Deep space tactical contrast scrim so 3D-extruded biome pads and laser lines pop cleanly
    const boardScrim = this.add.graphics();
    boardScrim.fillStyle(0x030712, 0.42);
    boardScrim.fillRect(0, 0, 1280, 720);
    this.bgContainer.add(boardScrim);

    // Subtle twinkling nebula stars
    const nebulaColors = [0x38bdf8, 0xf472b6, 0xa855f7, 0xf59e0b, 0x10b981];
    for (let i = 0; i < 16; i++) {
      const nx = Phaser.Math.Between(70, 1210);
      const ny = Phaser.Math.Between(65, 495);
      const scale = Phaser.Math.FloatBetween(0.16, 0.36);
      const flare = this.add
        .image(nx, ny, 'starship-flare-dot')
        .setTint(nebulaColors[i % nebulaColors.length])
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(scale)
        .setAlpha(Phaser.Math.FloatBetween(0.22, 0.7));
      this.bgContainer.add(flare);

      this.tweens.add({
        targets: flare,
        alpha: { from: 0.16, to: 0.8 },
        scaleX: { from: scale * 0.75, to: scale * 1.3 },
        scaleY: { from: scale * 0.75, to: scale * 1.3 },
        duration: Phaser.Math.Between(2000, 3600),
        delay: i * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
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
    const hubBtn = this.createSleekHeaderButton(88, 26, 152, 36, '◀ ARCADE HUB', 0x38bdf8, () => {
      StarshipAudio.playRockerSwitchClick(false);
      StarshipAudio.stopVoice();
      AudioBus.startCozyLoop();
      this.scene.start('HubScene');
    });
    this.topHudContainer.add(hubBtn);

    // 2. Mission Title & Trajectory Badge
    const titleText = this.add
      .text(176, 16, 'STARSHIP UNICORN', {
        fontFamily: '"Segoe UI", "Fredoka", system-ui, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#f8fafc'
      })
      .setOrigin(0, 0.5);
    const subText = this.add
      .text(176, 35, `5-SECTOR EXPEDITION • ${this.missionTotalPads} PADS`, {
        fontFamily: '"Segoe UI", "Fredoka", system-ui, sans-serif',
        fontSize: '10.5px',
        fontStyle: 'bold',
        color: '#f59e0b'
      })
      .setOrigin(0, 0.5);
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
      const pillW = this.players.length <= 4 ? 142 : 104;
      const spacing = pillW + 6;
      const totalWidth = this.players.length * spacing - 6;
      const startX = 685 - totalWidth / 2 + pillW / 2;
      const maxPadIdx = Math.max(1, this.boardPads.length - 1);

      this.players.forEach((p, idx) => {
        const px = startX + idx * spacing;
        const isCurrent = idx === this.activePlayerIndex;
        const rankNum = rankByPlayerIdx.get(idx) ?? idx + 1;
        const rankStr = rankBadges[rankNum - 1] ?? `${rankNum}TH`;
        const padsRemaining = Math.max(0, maxPadIdx - p.padIndex);

        const badge = this.add.container(px, 26);
        const bg = this.add.graphics();
        // 3D lower bevel
        bg.fillStyle(0x020617, 0.9);
        bg.fillRoundedRect(-pillW / 2, -17, pillW, 38, 8);
        bg.fillStyle(isCurrent ? 0x1e293b : 0x0f172a, 0.96);
        bg.fillRoundedRect(-pillW / 2, -19, pillW, 36, 8);
        bg.lineStyle(isCurrent ? 2.5 : 1.3, p.bay.color, isCurrent ? 1 : 0.65);
        bg.strokeRoundedRect(-pillW / 2, -19, pillW, 36, 8);
        badge.add(bg);

        if (this.textures.exists(`starship-token-${p.roster.id}`)) {
          const miniTok = this.add
            .image(-pillW / 2 + 16, -1, `starship-token-${p.roster.id}`)
            .setDisplaySize(26, 26);
          badge.add(miniTok);
        }

        const topRowText =
          this.players.length <= 4 ? `${rankStr} • ${p.roster.name}` : `${rankStr} ${p.roster.name}`;
        const nameLbl = this.add
          .text(8, -8, topRowText, {
            fontFamily: '"Segoe UI", "Fredoka", sans-serif',
            fontSize: this.players.length <= 4 ? '10px' : '9px',
            fontStyle: 'bold',
            color: isCurrent ? '#fde047' : '#f8fafc'
          })
          .setOrigin(0.5);

        const distText =
          padsRemaining === 0
            ? '🏆 AT CITADEL!'
            : this.players.length <= 4
            ? `PAD ${p.padIndex + 1} (${padsRemaining} TO GO)`
            : `P${p.padIndex + 1} (-${padsRemaining})`;

        const padLbl = this.add
          .text(8, 7, distText, {
            fontFamily: '"Segoe UI", "Fredoka", sans-serif',
            fontSize: this.players.length <= 4 ? '9.5px' : '8.5px',
            fontStyle: 'bold',
            color: p.bay.hex
          })
          .setOrigin(0.5);

        badge.add([nameLbl, padLbl]);
        this.topHudContainer.add(badge);
      });
    }

    // 4. Top-Right `[ ⚙ CREW LOBBY ]` & `[ 🔊 ]` Buttons
    const lobbyBtn = this.createSleekHeaderButton(1128, 26, 134, 36, '⚙ CREW LOBBY', 0xf59e0b, () => {
      StarshipAudio.playRockerSwitchClick(true);
      this.openPreFlightLobby(false);
    });
    this.topHudContainer.add(lobbyBtn);

    const muteBtn = this.createSleekHeaderButton(
      1232,
      26,
      52,
      36,
      AudioBus.getMuted() ? '🔇' : '🔊',
      0x94a3b8,
      () => {
        const muted = AudioBus.toggleMute();
        if (muted) {
          StarshipAudio.stopVoice();
        }
        this.renderTopMissionHeader();
      }
    );
    this.topHudContainer.add(muteBtn);
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
        fontFamily: '"Segoe UI", "Fredoka", system-ui, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#f8fafc'
      })
      .setOrigin(0.5);

    c.add([g, txt]);
    Juice.makeTactileButton(this, c, Math.max(w, 64), Math.max(h, 52), onTap, 'pop');
    return c;
  }

  // ===========================================================================
  // PRE-FLIGHT MISSION LOBBY (2–6 PLAYERS & MISSION LENGTH TOGGLE)
  // ===========================================================================

  private openPreFlightLobby(isInitialBoot: boolean): void {
    this.scenePhase = 'LOBBY';
    this.lobbyContainer.removeAll(true);
    this.lobbyContainer.setVisible(true);
    this.dockContainer.removeAll(true);
    this.cutsceneContainer.removeAll(true);
    this.trajectoryLaserContainer.removeAll(true);

    if (isInitialBoot) {
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

    const lobbyTitle = this.add
      .text(640, panelY + 33, 'STARSHIP UNICORN: ORBITAL TRIVIA — MISSION CONTROL', {
        fontFamily: '"Segoe UI", "Fredoka", system-ui, sans-serif',
        fontSize: '17.5px',
        fontStyle: 'bold',
        color: '#f8fafc',
        stroke: '#020617',
        strokeThickness: 3
      })
      .setOrigin(0.5);

    const lobbySubtitle = this.add
      .text(
        640,
        panelY + 59,
        `TAP ASTRONAUT EXOSUIT CARDS TO ASSIGN LAUNCH BAYS P1–P6 (${this.selectedAstronautIds.length}/6 CREW SELECTED — MIN 2, MAX 6)`,
        {
          fontFamily: '"Segoe UI", "Fredoka", system-ui, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#38bdf8'
        }
      )
      .setOrigin(0.5);
    this.lobbyContainer.add([lobbyTitle, lobbySubtitle]);

    const presetKidsParents = this.createSleekHeaderButton(
      1128,
      panelY + 47,
      180,
      34,
      '⚡ 4P CORE CREW',
      0x10b981,
      () => {
        this.selectedAstronautIds = ['wyatt', 'emma', 'robert', 'rita'];
        StarshipAudio.playLobbyToggle(true, 3);
        this.openPreFlightLobby(false);
      }
    );
    const presetGrandparents = this.createSleekHeaderButton(
      152,
      panelY + 47,
      184,
      34,
      '🌟 6P FAMILY PARTY',
      0xf59e0b,
      () => {
        this.selectedAstronautIds = ['wyatt', 'emma', 'robert', 'rita', 'papa', 'nana'];
        StarshipAudio.playLobbyToggle(true, 5);
        this.openPreFlightLobby(false);
      }
    );
    this.lobbyContainer.add([presetKidsParents, presetGrandparents]);

    const row1Specs = ASTRONAUT_ROSTER.slice(0, 5);
    const row2Specs = ASTRONAUT_ROSTER.slice(5, 9);

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
        bgG.fillStyle(0x0f172a, 0.72);
        bgG.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 14);
        bgG.lineStyle(1.5, 0x475569, 0.65);
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

      const tierLabel =
        spec.tier === 'WYATT_4YO'
          ? 'AGE 4 ASTRO-RANGER'
          : spec.tier === 'EMMA_3YO'
          ? 'AGE 3 SPACE PRINCESS'
          : 'COMMANDER TRIVIA';
      const tierPill = this.add.graphics();
      tierPill.fillStyle(0x090f1d, 0.94);
      tierPill.fillRoundedRect(-84, 79, 168, 22, 8);
      tierPill.lineStyle(1.4, isSelected && baySpec ? baySpec.color : 0x64748b, 0.9);
      tierPill.strokeRoundedRect(-84, 79, 168, 22, 8);
      const tierTxt = this.add
        .text(0, 90, tierLabel, {
          fontFamily: '"Segoe UI", "Fredoka", sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: isSelected && baySpec ? baySpec.hex : '#94a3b8'
        })
        .setOrigin(0.5);
      cardContainer.add([tierPill, tierTxt]);

      if (isSelected && baySpec) {
        const bayBadge = this.add.container(64, -84);
        const bbG = this.add.graphics();
        bbG.fillStyle(baySpec.color, 1);
        bbG.fillRoundedRect(-30, -14, 60, 28, 9);
        bbG.lineStyle(2, 0xffffff, 0.95);
        bbG.strokeRoundedRect(-30, -14, 60, 28, 9);
        const bbTxt = this.add
          .text(0, 0, `✓ ${baySpec.slotLabel}`, {
            fontFamily: '"Segoe UI", "Fredoka", sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#020617'
          })
          .setOrigin(0.5);
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
            fontFamily: '"Segoe UI", "Fredoka", sans-serif',
            fontSize: '10.5px',
            fontStyle: 'bold',
            color: '#cbd5e1'
          })
          .setOrigin(0.5);
        standbyBadge.add([sbG, sbTxt]);
        cardContainer.add(standbyBadge);
      }

      const hit = this.add
        .zone(0, 0, cardW + 6, cardH + 6)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      cardContainer.add(hit);

      hit.on('pointerdown', () => {
        const existingIdx = this.selectedAstronautIds.indexOf(spec.id);
        if (existingIdx !== -1) {
          if (this.selectedAstronautIds.length <= 2) {
            StarshipAudio.playUiChirp(320, 260);
            Juice.popFloatingLabel(this, cx, cy - 40, 'MIN 2 ASTRONAUTS!', '#f59e0b');
            return;
          }
          this.selectedAstronautIds.splice(existingIdx, 1);
          StarshipAudio.playLobbyToggle(false, existingIdx);
          this.openPreFlightLobby(false);
        } else {
          if (this.selectedAstronautIds.length >= 6) {
            StarshipAudio.playUiChirp(320, 260);
            Juice.popFloatingLabel(this, cx, cy - 40, 'MAX 6 LAUNCH BAYS FULL!', '#f59e0b');
            return;
          }
          this.selectedAstronautIds.push(spec.id);
          StarshipAudio.playLobbyToggle(true, this.selectedAstronautIds.length - 1);
          StarshipAudio.playVoice(spec.turnVoice);
          this.openPreFlightLobby(false);
        }
      });

      this.lobbyContainer.add(cardContainer);
    };

    const row1Xs = [196, 418, 640, 862, 1084];
    row1Specs.forEach((spec, idx) => {
      renderRosterCard(spec, row1Xs[idx], panelY + 198);
    });

    const row2Xs = [307, 529, 751, 973];
    row2Specs.forEach((spec, idx) => {
      renderRosterCard(spec, row2Xs[idx], panelY + 422);
    });

    const bottomY = panelY + 586;

    const isQuick = this.missionTotalPads === 25;
    const quickBtn = this.createTrajectoryToggleBtn(
      250,
      bottomY,
      360,
      64,
      '⚡ QUICK ORBIT (25 PADS)',
      'Fast 5-Sector Expedition • ~12 Min',
      isQuick,
      0x38bdf8,
      () => {
        if (this.missionTotalPads !== 25) {
          this.missionTotalPads = 25;
          StarshipAudio.playRockerSwitchClick(true);
          this.buildAndRenderOrbitalBoard(this.missionTotalPads);
          this.openPreFlightLobby(false);
        }
      }
    );

    const isGrand = this.missionTotalPads === 50;
    const grandBtn = this.createTrajectoryToggleBtn(
      628,
      bottomY,
      360,
      64,
      '🚀 GRAND ODYSSEY (50 PADS)',
      'Epic Galactic Voyage • ~25 Min',
      isGrand,
      0xf59e0b,
      () => {
        if (this.missionTotalPads !== 50) {
          this.missionTotalPads = 50;
          StarshipAudio.playRockerSwitchClick(true);
          this.buildAndRenderOrbitalBoard(this.missionTotalPads);
          this.openPreFlightLobby(false);
        }
      }
    );

    const launchBtn = this.add.container(1026, bottomY);
    const lw = 384;
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
      .text(0, -8, '🚀 INITIATE LAUNCH SEQUENCE', {
        fontFamily: '"Segoe UI", "Fredoka", system-ui, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#064e3b',
        strokeThickness: 3
      })
      .setOrigin(0.5);
    const launchSub = this.add
      .text(0, 14, `DEPLOY ${this.selectedAstronautIds.length} ASTRONAUT FIGURINES TO SECTOR 1`, {
        fontFamily: '"Segoe UI", "Fredoka", system-ui, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#d1fae5'
      })
      .setOrigin(0.5);

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
        this.initiateMissionLaunch();
      },
      'fanfare'
    );

    this.lobbyContainer.add([quickBtn, grandBtn, launchBtn]);
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
        fontFamily: '"Segoe UI", "Fredoka", system-ui, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: active ? '#ffffff' : '#cbd5e1'
      })
      .setOrigin(0.5);
    const t2 = this.add
      .text(0, 12, subtitle, {
        fontFamily: '"Segoe UI", "Fredoka", system-ui, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: active ? '#fde047' : '#64748b'
      })
      .setOrigin(0.5);

    c.add([g, t1, t2]);
    Juice.makeTactileButton(this, c, w, h, onTap, 'pop');
    return c;
  }

  private initiateMissionLaunch(): void {
    // Destroy all interactive Lobby & Victory children so no invisible scrim ever blocks input
    this.lobbyContainer.removeAll(true);
    this.lobbyContainer.setVisible(false);
    this.victoryContainer.removeAll(true);
    this.victoryContainer.setVisible(false);
    this.cutsceneContainer.removeAll(true);
    this.trajectoryLaserContainer.removeAll(true);

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
    this.scenePhase = 'TRIVIA';
    this.buildAndRenderOrbitalBoard(this.missionTotalPads);
    this.spawnPlayerBoardTokens();
    this.renderTopMissionHeader();

    StarshipAudio.playLaunchIgnition();
    Juice.burstStars(this, 640, 320, 28, [0x38bdf8, 0xf59e0b, 0xf472b6, 0x10b981]);

    this.startPlayerTurn(0);
  }

  // ===========================================================================
  // UPGRADE 4: COHERENT 5-SECTOR 3D ISOMETRIC BIOME BOARD
  // ===========================================================================

  private buildAndRenderOrbitalBoard(totalPads: 25 | 50): void {
    this.boardContainer.removeAll(true);
    this.biomePropsContainer.removeAll(true);
    this.trajectoryLaserContainer.removeAll(true);
    this.boardPads = [];

    const colorCycle: PadColorType[] = ['RED', 'BLUE', 'AMBER', 'EMERALD'];

    // Organic Winding S-Curve & Spiral Orbital Expedition Control Points across 5 Distinct Sectors:
    // Sector 1 (Bottom-Left Launch Complex) -> Sector 2 (Lower-Right FICSIT Hyper-Refinery)
    // -> Sector 3 (Center Crystal Asteroid Trench) -> Sector 4 (Upper-Left Rainbow Nebula Relay)
    // -> Sector 5 (Upper-Right Unicorn Citadel Summit)
    const splineWaypoints: Array<[number, number]> = [
      // Sector 1: Starbase Launch Complex
      [115, 430],
      [230, 444],
      [365, 436],
      [510, 418],
      // Sector 2: FICSIT Hyper-Refinery
      [665, 434],
      [835, 442],
      [1015, 428],
      [1145, 382],
      [1155, 314],
      // Sector 3: Crystal Asteroid Trench
      [1025, 276],
      [855, 286],
      [675, 304],
      [490, 294],
      [310, 272],
      // Sector 4: Rainbow Nebula Relay
      [165, 238],
      [142, 174],
      [268, 134],
      [448, 146],
      [632, 160],
      // Sector 5: Unicorn Citadel Summit
      [808, 142],
      [968, 124],
      [1132, 118]
    ];

    const spline = new Phaser.Curves.Spline(
      splineWaypoints.map(([wx, wy]) => new Phaser.Math.Vector2(wx, wy))
    );

    for (let padIdx = 0; padIdx < totalPads; padIdx++) {
      const t = totalPads <= 1 ? 0 : padIdx / (totalPads - 1);
      const pt = spline.getPoint(t);
      const x = Math.round(pt.x);
      const y = Math.round(pt.y);

      const sectorIndex = Math.min(5, Math.floor(t * 5) + 1);
      let padColor: PadColorType = colorCycle[padIdx % 4];

      let special: SpecialTileType = 'NONE';
      let wormholeTargetIndex: number | undefined;

      if (totalPads === 25) {
        if (padIdx === 6 || padIdx === 13 || padIdx === 20 || padIdx === 24) {
          padColor = 'RAINBOW';
        }
        if (padIdx === 0) {
          special = 'LAUNCHPAD';
        } else if (padIdx === 24) {
          special = 'CITADEL';
        } else if (padIdx === 4) {
          special = 'WORMHOLE';
          wormholeTargetIndex = 9;
        } else if (padIdx === 14) {
          special = 'WORMHOLE';
          wormholeTargetIndex = 19;
        } else if (padIdx === 7 || padIdx === 16) {
          special = 'OVERCLOCK';
        } else if (padIdx === 11 || padIdx === 21) {
          special = 'ASTEROID';
        } else if (padIdx === 8 || padIdx === 17) {
          special = 'RAINBOW_STARSHIP';
        }
      } else {
        if (padIdx % 8 === 7 || padIdx === 49) {
          padColor = 'RAINBOW';
        }
        if (padIdx === 0) {
          special = 'LAUNCHPAD';
        } else if (padIdx === 49) {
          special = 'CITADEL';
        } else if (padIdx === 5 || padIdx === 18 || padIdx === 31) {
          special = 'WORMHOLE';
          wormholeTargetIndex = Math.min(48, padIdx + 5);
        } else if (padIdx === 9 || padIdx === 22 || padIdx === 36 || padIdx === 42) {
          special = 'OVERCLOCK';
        } else if (padIdx === 14 || padIdx === 27 || padIdx === 39 || padIdx === 45) {
          special = 'ASTEROID';
        } else if (padIdx === 11 || padIdx === 24 || padIdx === 34) {
          special = 'RAINBOW_STARSHIP';
        }
      }

      this.boardPads.push({
        index: padIdx,
        numberLabel: padIdx + 1,
        x,
        y,
        sectorIndex,
        padColor,
        special,
        wormholeTargetIndex
      });
    }

    // 1. Render 5-Sector Ambient Biome Landmarks & Animated Props
    this.render5SectorBiomeLandmarksAndProps();

    // 2. Render Multi-Layered 3D Energy Bridges & Directional Light Pulses
    const bridgeG = this.add.graphics();
    for (let i = 0; i < this.boardPads.length - 1; i++) {
      const pA = this.boardPads[i];
      const pB = this.boardPads[i + 1];
      // Lower 3D structural girder shadow
      bridgeG.lineStyle(14, 0x020617, 0.72);
      bridgeG.lineBetween(pA.x, pA.y + 7, pB.x, pB.y + 7);
      // Outer plasma conduit aura
      const sectorCol = SECTOR_LANDMARKS[Math.min(4, pA.sectorIndex - 1)].accentColor;
      bridgeG.lineStyle(11, sectorCol, 0.24);
      bridgeG.lineBetween(pA.x, pA.y, pB.x, pB.y);
      // Brushed gunmetal deck girder
      bridgeG.lineStyle(6.5, 0x1e293b, 0.95);
      bridgeG.lineBetween(pA.x, pA.y, pB.x, pB.y);
      // Inner FICSIT telemetry light rail
      bridgeG.lineStyle(2, 0x38bdf8, 0.8);
      bridgeG.lineBetween(pA.x, pA.y, pB.x, pB.y);
    }

    // Draw glowing Hyperloop Wormhole plasma shortcut conduits (`+5` spaces)
    for (const pad of this.boardPads) {
      if (pad.special === 'WORMHOLE' && typeof pad.wormholeTargetIndex === 'number') {
        const dst = this.boardPads[pad.wormholeTargetIndex];
        if (dst) {
          const midX = (pad.x + dst.x) / 2;
          const midY = Math.min(pad.y, dst.y) - 44;
          const curve = new Phaser.Curves.QuadraticBezier(
            new Phaser.Math.Vector2(pad.x, pad.y),
            new Phaser.Math.Vector2(midX, midY),
            new Phaser.Math.Vector2(dst.x, dst.y)
          );
          const pts = curve.getPoints(28);
          bridgeG.lineStyle(11, 0x22d3ee, 0.25);
          bridgeG.strokePoints(pts, false);
          bridgeG.lineStyle(4, 0xa855f7, 0.88);
          bridgeG.strokePoints(pts, false);
          bridgeG.lineStyle(1.5, 0xffffff, 0.92);
          bridgeG.strokePoints(pts, false);
        }
      }
    }
    this.boardContainer.add(bridgeG);

    // Animated directional light pulses flowing along the energy bridge toward the Citadel
    for (let p = 0; p < 6; p++) {
      const pulseOrb = this.add
        .image(this.boardPads[0].x, this.boardPads[0].y, 'starship-flare-dot')
        .setTint(p % 2 === 0 ? 0x38bdf8 : 0xf59e0b)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.28)
        .setAlpha(0.8);
      this.boardContainer.add(pulseOrb);

      const flowState = { prog: p / 6 };
      this.tweens.add({
        targets: flowState,
        prog: flowState.prog + 1,
        duration: 9500,
        repeat: -1,
        onUpdate: () => {
          const wrapped = flowState.prog % 1;
          const pt = spline.getPoint(wrapped);
          pulseOrb.setPosition(pt.x, pt.y);
        }
      });
    }

    // 3. Render Every Board Tile as a 3D-Extruded Isometric Landing Platform
    const baseRadius = totalPads === 25 ? 27 : 20;
    for (const pad of this.boardPads) {
      const padNode = this.add.container(pad.x, pad.y);
      const pg = this.add.graphics();
      const cSpec = PAD_COLOR_HEX[pad.padColor];

      const isSpecial = pad.special !== 'NONE';
      const r = isSpecial ? baseRadius * 1.16 : baseRadius;
      const extrudeDepth = totalPads === 25 ? 10 : 7;

      // Ground drop shadow ellipse beneath the 3D platform
      pg.fillStyle(0x010409, 0.82);
      pg.fillEllipse(0, extrudeDepth + 6, r * 2.15, r * 1.25);

      // 3D Extruded Isometric Side Walls (lower bevel column)
      const topPts = this.getIsometricHexPoints(0, 0, r);
      const botPts = this.getIsometricHexPoints(0, extrudeDepth, r);

      // Draw lower 3D walls connecting bottom hex edges (indices 0->1, 1->2, 2->3)
      const wallColors = [cSpec.bevelMid, cSpec.bevelDark, 0x090f1d];
      for (let side = 0; side < 3; side++) {
        const iA = side;
        const iB = (side + 1) % 6;
        pg.fillStyle(wallColors[side], 0.98);
        pg.fillPoints([topPts[iA], topPts[iB], botPts[iB], botPts[iA]], true);
        pg.lineStyle(1, 0x334155, 0.7);
        pg.strokePoints([topPts[iA], topPts[iB], botPts[iB], botPts[iA]], true);
      }

      // Outer Brushed Gunmetal Platform Collar
      pg.fillStyle(0x1e293b, 0.98);
      pg.fillPoints(topPts, true);
      pg.lineStyle(isSpecial ? 3.5 : 2.2, cSpec.rim, 0.96);
      pg.strokePoints(topPts, true);

      // Inner Carbon-Fiber Colored Deck Plate
      const innerPts = this.getIsometricHexPoints(0, -1, r * 0.8);
      pg.fillStyle(cSpec.fill, 0.96);
      pg.fillPoints(innerPts, true);
      pg.lineStyle(1.2, 0xffffff, 0.45);
      pg.strokePoints(innerPts, true);

      padNode.add(pg);

      // Animated Rotating Hologram Ring on Special Pads
      if (isSpecial) {
        const holoRing = this.add.graphics();
        holoRing.lineStyle(2, cSpec.rim, 0.75);
        for (let a = 0; a < 4; a++) {
          const startAngle = Phaser.Math.DegToRad(a * 90 + 12);
          const endAngle = Phaser.Math.DegToRad(a * 90 + 62);
          holoRing.beginPath();
          holoRing.arc(0, 0, r + 5, startAngle, endAngle, false);
          holoRing.strokePath();
        }
        padNode.add(holoRing);
        this.tweens.add({
          targets: holoRing,
          angle: 360,
          scaleY: { from: 0.72, to: 0.82 },
          duration: 4200,
          repeat: -1,
          ease: 'Linear'
        });
      }

      // Pad Icon & Telemetry Label
      if (pad.special === 'LAUNCHPAD') {
        const lbl = this.add
          .text(0, -2, '🚀 1', {
            fontFamily: '"Segoe UI", "Fredoka", sans-serif',
            fontSize: totalPads === 25 ? '13px' : '10.5px',
            fontStyle: 'bold',
            color: '#ffffff'
          })
          .setOrigin(0.5);
        const tag = this.add
          .text(0, r * 0.78 + extrudeDepth + 8, 'STARBASE PAD 1', {
            fontFamily: '"Segoe UI", "Fredoka", sans-serif',
            fontSize: '9.5px',
            fontStyle: 'bold',
            color: '#38bdf8',
            stroke: '#020617',
            strokeThickness: 3
          })
          .setOrigin(0.5);
        padNode.add([lbl, tag]);
      } else if (pad.special === 'CITADEL') {
        const citadelGlow = this.add
          .image(0, -6, 'starship-smooth-glow')
          .setDisplaySize(135, 135)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.8);
        const lbl = this.add
          .text(0, -3, '🦄🏆', {
            fontSize: totalPads === 25 ? '20px' : '16px'
          })
          .setOrigin(0.5);
        const tag = this.add
          .text(0, -r - 12, '★ UNICORN CITADEL ★', {
            fontFamily: '"Segoe UI", "Fredoka", sans-serif',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#fde047',
            stroke: '#020617',
            strokeThickness: 3
          })
          .setOrigin(0.5);
        padNode.add([citadelGlow, lbl, tag]);
      } else if (pad.special === 'WORMHOLE') {
        const lbl = this.add
          .text(0, -4, '🌀', { fontSize: totalPads === 25 ? '15px' : '12px' })
          .setOrigin(0.5);
        const sub = this.add
          .text(0, 9, '+5 WARP', {
            fontFamily: '"Segoe UI", "Fredoka", sans-serif',
            fontSize: '8px',
            fontStyle: 'bold',
            color: '#67e8f9',
            stroke: '#020617',
            strokeThickness: 2
          })
          .setOrigin(0.5);
        padNode.add([lbl, sub]);
      } else if (pad.special === 'OVERCLOCK') {
        const lbl = this.add
          .text(0, -4, '⚡', { fontSize: totalPads === 25 ? '15px' : '12px' })
          .setOrigin(0.5);
        const sub = this.add
          .text(0, 9, '+3 BOOST', {
            fontFamily: '"Segoe UI", "Fredoka", sans-serif',
            fontSize: '8px',
            fontStyle: 'bold',
            color: '#fde047',
            stroke: '#020617',
            strokeThickness: 2
          })
          .setOrigin(0.5);
        padNode.add([lbl, sub]);
      } else if (pad.special === 'ASTEROID') {
        const lbl = this.add
          .text(0, -4, '☄️', { fontSize: totalPads === 25 ? '14px' : '11px' })
          .setOrigin(0.5);
        const sub = this.add
          .text(0, 9, '-2 WELL', {
            fontFamily: '"Segoe UI", "Fredoka", sans-serif',
            fontSize: '8px',
            fontStyle: 'bold',
            color: '#fca5a5',
            stroke: '#020617',
            strokeThickness: 2
          })
          .setOrigin(0.5);
        padNode.add([lbl, sub]);
      } else if (pad.special === 'RAINBOW_STARSHIP') {
        const lbl = this.add
          .text(0, -4, '🦄', { fontSize: totalPads === 25 ? '15px' : '12px' })
          .setOrigin(0.5);
        const sub = this.add
          .text(0, 9, 'RAINBOW', {
            fontFamily: '"Segoe UI", "Fredoka", sans-serif',
            fontSize: '8px',
            fontStyle: 'bold',
            color: '#f5d0fe',
            stroke: '#020617',
            strokeThickness: 2
          })
          .setOrigin(0.5);
        padNode.add([lbl, sub]);
      } else {
        const numTxt = this.add
          .text(0, -1, `${pad.numberLabel}`, {
            fontFamily: '"Segoe UI", "Fredoka", sans-serif',
            fontSize: totalPads === 25 ? '12.5px' : '10px',
            fontStyle: 'bold',
            color: '#f8fafc',
            stroke: '#020617',
            strokeThickness: 2
          })
          .setOrigin(0.5);
        padNode.add(numTxt);
      }

      this.boardContainer.add(padNode);
    }
  }

  private getIsometricHexPoints(cx: number, cy: number, radius: number): Phaser.Geom.Point[] {
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 6; i++) {
      const angleRad = Phaser.Math.DegToRad(60 * i);
      pts.push(
        new Phaser.Geom.Point(
          cx + radius * Math.cos(angleRad),
          cy + radius * Math.sin(angleRad) * 0.68 // Isometric foreshortening
        )
      );
    }
    return pts;
  }

  /**
   * Renders the 5 Visually Distinct Named Sectors with floating glassmorphic sector landmarks
   * and animated environmental props (rotating radar dish, spinning FICSIT refinery turbine,
   * drifting crystal meteors, and prismatic nebula relay rings).
   */
  private render5SectorBiomeLandmarksAndProps(): void {
    // 1. Sector 1 Animated Rotating Radar Dish & Amber Floodlight (`x: 72, y: 375`)
    const radarDish = this.add.container(72, 372);
    const radarG = this.add.graphics();
    radarG.fillStyle(0x1e293b, 0.9);
    radarG.fillCircle(0, 0, 22);
    radarG.lineStyle(2, 0xf59e0b, 0.85);
    radarG.strokeCircle(0, 0, 22);
    radarG.lineStyle(2, 0x38bdf8, 0.9);
    radarG.lineBetween(0, 0, 18, -10);
    radarG.fillStyle(0xf59e0b, 1);
    radarG.fillCircle(0, 0, 4);
    radarDish.add(radarG);
    this.biomePropsContainer.add(radarDish);
    this.tweens.add({
      targets: radarDish,
      angle: 360,
      duration: 6000,
      repeat: -1,
      ease: 'Linear'
    });

    // 2. Sector 2 Animated FICSIT Orange Plasma Turbine (`x: 1212, y: 446`)
    const turbine = this.add.container(1212, 446);
    const turbG = this.add.graphics();
    turbG.fillStyle(0x451a03, 0.9);
    turbG.fillCircle(0, 0, 24);
    turbG.lineStyle(2.5, 0xf97316, 0.95);
    turbG.strokeCircle(0, 0, 24);
    for (let b = 0; b < 6; b++) {
      const rad = Phaser.Math.DegToRad(b * 60);
      turbG.lineStyle(3, 0xfbbf24, 0.85);
      turbG.lineBetween(0, 0, Math.cos(rad) * 20, Math.sin(rad) * 20);
    }
    turbine.add(turbG);
    this.biomePropsContainer.add(turbine);
    this.tweens.add({
      targets: turbine,
      angle: -360,
      duration: 4500,
      repeat: -1,
      ease: 'Linear'
    });

    // 3. Sector 3 Drifting Bioluminescent Crystal Meteors
    const meteorCoords = [
      { x: 580, y: 238, col: 0xa855f7 },
      { x: 930, y: 226, col: 0x22d3ee },
      { x: 395, y: 222, col: 0xf472b6 }
    ];
    meteorCoords.forEach((mc, idx) => {
      const mG = this.add.graphics();
      mG.fillStyle(mc.col, 0.35);
      mG.fillCircle(0, 0, 14);
      mG.fillStyle(0x1e1b4b, 0.95);
      mG.fillTriangle(-10, 6, 0, -12, 11, 5);
      mG.lineStyle(2, mc.col, 0.95);
      mG.strokeTriangle(-10, 6, 0, -12, 11, 5);
      mG.setPosition(mc.x, mc.y);
      this.biomePropsContainer.add(mG);

      this.tweens.add({
        targets: mG,
        y: mc.y - 10,
        angle: { from: -8, to: 8 },
        duration: 2200 + idx * 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });

    // 4. Sector 4 Shimmering Rainbow Nebula Curtain & Holographic Relay Ring (`x: 92, y: 145`)
    const nebulaRelay = this.add.container(92, 145);
    const relayG = this.add.graphics();
    relayG.lineStyle(2.5, 0x38bdf8, 0.85);
    relayG.strokeEllipse(0, 0, 54, 24);
    relayG.lineStyle(2, 0xf472b6, 0.75);
    relayG.strokeEllipse(0, 0, 38, 16);
    nebulaRelay.add(relayG);
    this.biomePropsContainer.add(nebulaRelay);
    this.tweens.add({
      targets: nebulaRelay,
      angle: 360,
      scaleX: { from: 0.92, to: 1.08 },
      duration: 5400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 5. Sector 5 Iridescent Unicorn Citadel Spire Beacon (`x: 1212, y: 108`)
    const citadelBeacon = this.add
      .image(1212, 108, 'starship-smooth-glow')
      .setDisplaySize(140, 140)
      .setTint(0xf472b6)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.55);
    this.biomePropsContainer.add(citadelBeacon);
    this.tweens.add({
      targets: citadelBeacon,
      alpha: { from: 0.35, to: 0.78 },
      scaleX: { from: 0.5, to: 0.72 },
      scaleY: { from: 0.5, to: 0.72 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 6. Floating Glassmorphic Sector Landmark Plaques (Sectors 1..5)
    SECTOR_LANDMARKS.forEach((sec) => {
      const badge = this.add.container(sec.x, sec.y);
      const w = 232;
      const h = 30;
      const g = this.add.graphics();
      g.fillStyle(0x060c1a, 0.84);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
      g.lineStyle(1.5, sec.accentColor, 0.78);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);

      const title = this.add
        .text(0, -4, `${sec.icon} ${sec.title}`, {
          fontFamily: '"Segoe UI", "Fredoka", sans-serif',
          fontSize: '9.5px',
          fontStyle: 'bold',
          color: sec.hexColor
        })
        .setOrigin(0.5);
      const sub = this.add
        .text(0, 7, sec.subtitle, {
          fontFamily: '"Segoe UI", "Fredoka", sans-serif',
          fontSize: '8px',
          color: '#cbd5e1'
        })
        .setOrigin(0.5);

      badge.add([g, title, sub]);
      this.biomePropsContainer.add(badge);
    });
  }

  // ===========================================================================
  // UPGRADE 5: ACTUAL STANDING 3D-STYLED PLAYER FIGURINE PIECES
  // ===========================================================================

  /**
   * Builds tall, sculpted 3D-styled Astronaut Miniature Figurines standing on
   * Metallic Thruster Pedestals with upright armored exosuit shields, glowing
   * 3D antenna/crown crests, and dual jetpack flame emitters underneath!
   */
  private spawnPlayerBoardTokens(): void {
    this.tokensContainer.removeAll(true);

    this.activeHighlightRing = this.add.graphics();
    this.tokensContainer.add(this.activeHighlightRing);

    const scaleFactor = this.missionTotalPads === 25 ? 1.0 : 0.86;

    this.players.forEach((player, idx) => {
      const pos = this.computeTokenWorldPosition(player.padIndex, idx);
      const root = this.add.container(pos.x, pos.y).setScale(scaleFactor);

      // 1. Ground Drop Shadow Ellipse right on the landing pad deck
      const shadowG = this.add.graphics();
      shadowG.fillStyle(0x010409, 0.78);
      shadowG.fillEllipse(0, 4, 48, 18);
      root.add(shadowG);

      // 2. Sculpted Figurine Body Container (hovers & leans dynamically during jetpack hops!)
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

      // 3. 3D Tiered Metallic Thruster Pedestal Base + Upright Armored Exosuit Shield Frame
      const pedG = this.add.graphics();
      // Lower 3D metallic thruster skirt
      pedG.fillStyle(0x0f172a, 0.98);
      pedG.fillEllipse(0, -1, 44, 15);
      pedG.lineStyle(2, player.bay.color, 0.95);
      pedG.strokeEllipse(0, -1, 44, 15);

      // Upper 3D pedestal collar
      pedG.fillStyle(0x334155, 0.98);
      pedG.fillEllipse(0, -6, 36, 12);
      pedG.lineStyle(1.5, 0xffffff, 0.65);
      pedG.strokeEllipse(0, -6, 36, 12);

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
          fontFamily: '"Segoe UI", "Fredoka", sans-serif',
          fontSize: '8.5px',
          fontStyle: 'bold',
          color: '#ffffff'
        })
        .setOrigin(0.5);
      figurineBody.add([tagG, tagTxt]);

      // Gentle idle hover bob so every standing figurine feels alive on the board
      this.tweens.add({
        targets: figurineBody,
        y: { from: 0, to: -4 },
        duration: 1100 + idx * 130,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      player.tokenContainer = root;
      player.figurineBody = figurineBody;
      this.tokensContainer.add(root);
    });
  }

  private computeTokenWorldPosition(padIndex: number, playerSlotIdx: number): { x: number; y: number } {
    const clampedIdx = Phaser.Math.Clamp(padIndex, 0, this.boardPads.length - 1);
    const pad = this.boardPads[clampedIdx] ?? { x: 115, y: 430 };

    const occupants = this.players
      .map((p, idx) => ({ p, idx }))
      .filter((item) => item.p.padIndex === clampedIdx);

    if (occupants.length <= 1) {
      return { x: pad.x, y: pad.y - 2 };
    }

    const myOrder = Math.max(0, occupants.findIndex((item) => item.idx === playerSlotIdx));

    const clusterOffsets: Record<number, Array<[number, number]>> = {
      2: [
        [-26, -8],
        [26, -8]
      ],
      3: [
        [-32, -18],
        [32, -18],
        [0, 16]
      ],
      4: [
        [-30, -22],
        [30, -22],
        [-30, 16],
        [30, 16]
      ],
      5: [
        [-44, -22],
        [0, -26],
        [44, -22],
        [-26, 18],
        [26, 18]
      ],
      6: [
        [-46, -24],
        [0, -28],
        [46, -24],
        [-46, 18],
        [0, 22],
        [46, 18]
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
    const spreadRadius = 32;
    return {
      x: Math.round(pad.x + Math.cos(angle) * spreadRadius),
      y: Math.round(pad.y - 4 + Math.sin(angle) * (spreadRadius * 0.75))
    };
  }

  private refreshAllTokenOffsets(): void {
    this.players.forEach((p, idx) => {
      if (!p.tokenContainer) return;
      const target = this.computeTokenWorldPosition(p.padIndex, idx);
      this.tweens.add({
        targets: p.tokenContainer,
        x: target.x,
        y: target.y,
        duration: 240,
        ease: 'Quad.easeOut'
      });
      // Sort depth by Y coordinate so figurines in front naturally overlap figurines behind
      p.tokenContainer.setDepth(idx === this.activePlayerIndex ? 35 : 22 + idx);
    });

    const activePlayer = this.players[this.activePlayerIndex];
    if (activePlayer && activePlayer.tokenContainer && this.activeHighlightRing) {
      this.activeHighlightRing.clear();
      this.activeHighlightRing.lineStyle(3, activePlayer.bay.color, 0.92);
      this.activeHighlightRing.strokeEllipse(0, 0, 56, 22);
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

    this.scenePhase = 'TRIVIA';
    this.lastAnswerWasOverclock = false;
    this.currentQuestion = this.drawNonRepeatingQuestion(player.roster.tier);

    this.renderTopMissionHeader();
    this.refreshAllTokenOffsets();

    // Pulse active player figurine
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

    // Play non-blocking character turn voice callout
    try {
      StarshipAudio.playVoice(player.roster.turnVoice);
    } catch {
      // Never block UI if voice clip fails
    }

    // Render the Telemetry HUD & 4 Industrial Switchgear Answer Pads immediately
    this.renderTelemetryTriviaDock(player, this.currentQuestion);

    // Auto-read question for Emma or Wyatt tiers after a brief beat
    if (player.roster.tier === 'EMMA_3YO' || player.roster.tier === 'WYATT_4YO') {
      this.time.delayedCall(1250, () => {
        if (
          this.scene.isActive() &&
          this.scenePhase === 'TRIVIA' &&
          this.currentQuestion
        ) {
          this.speakQuestionAloud(this.currentQuestion);
        }
      });
    }
  }

  private drawNonRepeatingQuestion(tier: TriviaProfileTier): TriviaQuestionItem {
    const pool = getQuestionPoolForTier(tier);
    let available = pool.filter((q) => !this.askedQuestionIds.has(q.id));
    if (available.length === 0) {
      for (const q of pool) {
        this.askedQuestionIds.delete(q.id);
      }
      available = pool;
    }

    const chosen = Phaser.Utils.Array.GetRandom(available) as TriviaQuestionItem;
    this.askedQuestionIds.add(chosen.id);
    return chosen;
  }

  /**
   * Renders the FICSIT Telemetry Question Dock (`y: 472..598`) and the 4 Heavy Industrial
   * 3D Beveled Switchgear Answer Pads (`y: 606..710`) with physical hydraulic press
   * and 750ms sweeping amber scanner lock-in suspense!
   */
  private renderTelemetryTriviaDock(
    player: ActiveAstronautPlayer,
    question: TriviaQuestionItem
  ): void {
    this.dockContainer.removeAll(true);

    // 1. Upper Question Telemetry Console (`y: 472..598`)
    const dockG = this.add.graphics();
    // 3D lower metallic chassis lip
    dockG.fillStyle(0x020617, 0.96);
    dockG.fillRoundedRect(18, 476, 1244, 124, 14);
    // Main gunmetal glassmorphic console
    dockG.fillStyle(0x070d1b, 0.95);
    dockG.fillRoundedRect(18, 472, 1244, 124, 14);
    dockG.lineStyle(2.5, player.bay.color, 0.92);
    dockG.strokeRoundedRect(18, 472, 1244, 124, 14);

    // Subtle FICSIT safety-amber hazard corner accent strip on top-left of console
    dockG.fillStyle(0xf59e0b, 0.88);
    dockG.fillRoundedRect(28, 472, 165, 5, 2);
    this.dockContainer.add(dockG);

    // Left Crew Astronaut Portrait Frame (`x: 86, y: 534`)
    const portFrame = this.add.graphics();
    portFrame.fillStyle(0x0f172a, 0.98);
    portFrame.fillRoundedRect(34, 483, 104, 102, 12);
    portFrame.lineStyle(2.5, player.bay.color, 1);
    portFrame.strokeRoundedRect(34, 483, 104, 102, 12);
    this.dockContainer.add(portFrame);

    const cardKey = `starship-card-${player.roster.id}`;
    if (this.textures.exists(cardKey)) {
      this.textures.get(cardKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
      const portImg = this.add
        .image(86, 534, cardKey)
        .setDisplaySize(96, 94);
      this.dockContainer.add(portImg);
    }

    // Commander Header & Active Sector Info (`x: 154, y: 493`)
    const tierBadge =
      player.roster.tier === 'EMMA_3YO'
        ? '🦄 EMMA 3YO TIER'
        : player.roster.tier === 'WYATT_4YO'
        ? '🚀 WYATT 4YO TIER'
        : '🛰️ ADULT TIER';
    const currentPad = this.boardPads[player.padIndex] ?? this.boardPads[0];
    const currentSector = SECTOR_LANDMARKS[Math.min(4, (currentPad?.sectorIndex ?? 1) - 1)];

    const headerTxt = this.add
      .text(
        154,
        493,
        `${player.bay.slotLabel}: ${player.roster.callsign}  •  [${tierBadge}]  •  ${currentSector.title}`,
        {
          fontFamily: '"Segoe UI", "Fredoka", sans-serif',
          fontSize: '13.5px',
          fontStyle: 'bold',
          color: player.bay.hex
        }
      )
      .setOrigin(0, 0.5);

    const ruleHintTxt = this.add
      .text(
        154,
        513,
        '⚡ CORRECT TELEMETRY = OVERCLOCK DOUBLE DICE (2x 🎲 + COLOR WARP)   |   STANDARD = SINGLE THRUSTER (1x 🎲)',
        {
          fontFamily: '"Segoe UI", "Fredoka", sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#fde047'
        }
      )
      .setOrigin(0, 0.5);

    const promptTxt = this.add
      .text(154, 555, question.prompt, {
        fontFamily: '"Segoe UI", "Fredoka", sans-serif',
        fontSize: question.prompt.length > 88 ? '18px' : '20.5px',
        fontStyle: 'bold',
        color: '#ffffff',
        wordWrap: { width: 830 }
      })
      .setOrigin(0, 0.5);

    this.dockContainer.add([headerTxt, ruleHintTxt, promptTxt]);

    // Right Cockpit Rocker Switches (`[ 🔊 READ QUESTION ]` & `[ SKIP TO ROLL ➔ ]`)
    const readBtn = this.createCockpitRockerSwitch(
      1124,
      508,
      236,
      40,
      '🔊  READ QUESTION',
      0x0284c7,
      () => {
        this.speakQuestionAloud(question);
      }
    );
    const skipBtn = this.createCockpitRockerSwitch(
      1124,
      560,
      236,
      40,
      'SKIP TO ROLL ➔',
      0x475569,
      () => {
        if (this.scenePhase !== 'TRIVIA') return;
        this.handleTriviaSelection(-1, player, question);
      }
    );
    this.dockContainer.add([readBtn, skipBtn]);

    // 2. Four Heavy Industrial 3D Switchgear Answer Pads (`y: 606..710`)
    const safeOptions =
      Array.isArray(question.options) && question.options.length >= 4
        ? question.options
        : ['Option A', 'Option B', 'Option C', 'Option D'];

    const padW = 298;
    const padH = 92;
    const padGap = 16;
    const startX = 18 + padW / 2;
    const baseY = 654;

    OPTION_PAD_COLORS.forEach((theme, idx) => {
      const cx = startX + idx * (padW + padGap);
      const switchRoot = this.add.container(cx, baseY);

      // Fixed 3D Lower Shadow / Bevel Lip (stays anchored while cap depresses `y + 5px`)
      const baseLipG = this.add.graphics();
      baseLipG.fillStyle(0x010409, 0.95);
      baseLipG.fillRoundedRect(-padW / 2 - 2, -padH / 2 + 8, padW + 4, padH, 13);
      baseLipG.fillStyle(theme.bevelColor, 1);
      baseLipG.fillRoundedRect(-padW / 2, -padH / 2 + 6, padW, padH, 12);
      baseLipG.lineStyle(2, 0x1e293b, 0.95);
      baseLipG.strokeRoundedRect(-padW / 2, -padH / 2 + 6, padW, padH, 12);
      switchRoot.add(baseLipG);

      // Movable Upper Switchgear Cap Container (physically depresses `y + 5px` when locked in!)
      const capContainer = this.add.container(0, 0);
      switchRoot.add(capContainer);

      const capG = this.add.graphics();
      // Brushed gunmetal outer switchgear frame
      capG.fillStyle(0x1e293b, 0.98);
      capG.fillRoundedRect(-padW / 2, -padH / 2, padW, padH, 12);
      // Colored industrial inner switch plate
      capG.fillStyle(theme.bgFill, 0.95);
      capG.fillRoundedRect(-padW / 2 + 5, -padH / 2 + 5, padW - 10, padH - 10, 9);
      // Top specular highlight bevel
      capG.fillStyle(0xffffff, 0.14);
      capG.fillRoundedRect(-padW / 2 + 8, -padH / 2 + 7, padW - 16, 20, 6);

      // Subtle diagonal FICSIT safety-hazard striping along top header bar
      capG.fillStyle(0x020617, 0.32);
      for (let s = -padW / 2 + 16; s < padW / 2 - 24; s += 22) {
        capG.fillTriangle(s, -padH / 2 + 6, s + 10, -padH / 2 + 6, s + 4, -padH / 2 + 18);
      }

      // 4 Corner Hex-Rivets
      const rivetOffsets: Array<[number, number]> = [
        [-padW / 2 + 12, -padH / 2 + 12],
        [padW / 2 - 12, -padH / 2 + 12],
        [-padW / 2 + 12, padH / 2 - 12],
        [padW / 2 - 12, padH / 2 - 12]
      ];
      capG.fillStyle(0x94a3b8, 0.9);
      for (const [rx, ry] of rivetOffsets) {
        capG.fillCircle(rx, ry, 3);
      }

      // Outer neon rim
      capG.lineStyle(2.5, theme.rimColor, 0.96);
      capG.strokeRoundedRect(-padW / 2, -padH / 2, padW, padH, 12);
      capContainer.add(capG);

      // Illuminated Keycap Badge (`[ A • RUBY ]`, `[ B • PULSAR ]`, etc.)
      const keycapG = this.add.graphics();
      keycapG.fillStyle(0x020617, 0.88);
      keycapG.fillRoundedRect(-padW / 2 + 22, -padH / 2 + 10, 126, 22, 6);
      keycapG.lineStyle(1.5, theme.rimColor, 0.95);
      keycapG.strokeRoundedRect(-padW / 2 + 22, -padH / 2 + 10, 126, 22, 6);
      const keycapTxt = this.add
        .text(-padW / 2 + 85, -padH / 2 + 21, `[ ${theme.letter} • ${theme.codeName} ]`, {
          fontFamily: '"Segoe UI", "Fredoka", sans-serif',
          fontSize: '10.5px',
          fontStyle: 'bold',
          color: theme.hexText
        })
        .setOrigin(0.5);

      // Glowing LED Status Strip on top-right of button
      const ledStripG = this.add.graphics();
      ledStripG.fillStyle(0x020617, 0.9);
      ledStripG.fillRoundedRect(padW / 2 - 96, -padH / 2 + 12, 72, 16, 5);
      ledStripG.fillStyle(theme.rimColor, 0.95);
      ledStripG.fillRoundedRect(padW / 2 - 92, -padH / 2 + 15, 64, 10, 3);

      // Answer Option Text
      const optLabel = safeOptions[idx] ?? '';
      const optTxt = this.add
        .text(0, 13, optLabel, {
          fontFamily: '"Segoe UI", "Fredoka", sans-serif',
          fontSize: optLabel.length > 24 ? '15.5px' : '18.5px',
          fontStyle: 'bold',
          color: '#ffffff',
          align: 'center',
          wordWrap: { width: padW - 32 }
        })
        .setOrigin(0.5);

      // Hidden Amber Telemetry Lock-In Scanner Overlay (activates for 750ms when tapped!)
      const scannerOverlay = this.add.container(0, 0).setVisible(false);
      const scanBorderG = this.add.graphics();
      scanBorderG.lineStyle(4, 0xfbbf24, 1);
      scanBorderG.strokeRoundedRect(-padW / 2 + 2, -padH / 2 + 2, padW - 4, padH - 4, 11);
      const scanBeamG = this.add.graphics();
      scanBeamG.fillStyle(0xfbbf24, 0.35);
      scanBeamG.fillRoundedRect(-padW / 2 + 6, -12, padW - 12, 24, 4);
      const scanBadgeG = this.add.graphics();
      scanBadgeG.fillStyle(0x020617, 0.94);
      scanBadgeG.fillRoundedRect(-118, -padH / 2 + 9, 236, 24, 6);
      scanBadgeG.lineStyle(1.5, 0xfbbf24, 1);
      scanBadgeG.strokeRoundedRect(-118, -padH / 2 + 9, 236, 24, 6);
      const scanTxt = this.add
        .text(0, -padH / 2 + 21, '⚡ TELEMETRY LOCKED...', {
          fontFamily: '"Segoe UI", "Fredoka", sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#fde047'
        })
        .setOrigin(0.5);
      scannerOverlay.add([scanBorderG, scanBeamG, scanBadgeG, scanTxt]);

      capContainer.add([keycapG, keycapTxt, ledStripG, optTxt, scannerOverlay]);

      // Interactive Hit Area
      const hit = this.add
        .rectangle(0, 0, padW, padH, 0x000000, 0.001)
        .setInteractive({ useHandCursor: true });
      switchRoot.add(hit);

      hit.on('pointerdown', () => {
        if (this.scenePhase !== 'TRIVIA') return;
        this.scenePhase = 'LOCKING_ANSWER';

        // 1. Physical Hydraulic Press: depress switchgear cap `y + 5px` (collapsing its 3D lower bevel!)
        this.tweens.add({
          targets: capContainer,
          y: 5,
          duration: 75,
          ease: 'Quad.easeOut'
        });

        // 2. Fire heavy industrial pneumatic latch clunk + hydraulic hiss + sub-bass thud
        StarshipAudio.playPadLockIn(idx);

        // 3. Flash sweeping amber scanner bar ("⚡ TELEMETRY LOCKED...") for 750ms of game-show suspense!
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
      });

      this.dockContainer.add(switchRoot);
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
        fontFamily: '"Segoe UI", "Fredoka", sans-serif',
        fontSize: '12.5px',
        fontStyle: 'bold',
        color: '#f8fafc'
      })
      .setOrigin(0.5);
    cap.add([g, txt]);
    c.add(cap);

    const hit = this.add
      .rectangle(0, 0, w, h, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      StarshipAudio.playRockerSwitchClick();
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

  private speakQuestionAloud(question: TriviaQuestionItem): void {
    const opts = question.options
      .map((o: string, i: number) => `${OPTION_PAD_COLORS[i].letter}: ${o}`)
      .join('. ');
    StarshipAudio.speakQuestionText(`${question.prompt} ... ${opts}`);
  }

  private handleTriviaSelection(
    selectedIndex: number,
    player: ActiveAstronautPlayer,
    question: TriviaQuestionItem,
    chosenPadContainer?: Phaser.GameObjects.Container
  ): void {
    StarshipAudio.stopVoice();

    const isCorrect = selectedIndex === question.correctIndex;
    this.lastAnswerWasOverclock = isCorrect;

    if (isCorrect) {
      player.correctCount += 1;
      player.overclockCount += 1;
      StarshipAudio.playOverclockFanfare();
      StarshipAudio.playVoice('overclock_engaged');
      if (chosenPadContainer) {
        Juice.burstStars(this, chosenPadContainer.x, chosenPadContainer.y, 22, [
          0x10b981,
          0xfde047,
          0x38bdf8
        ]);
      }
    } else {
      // Positive Zero-Penalty Standard Single Thruster!
      StarshipAudio.playStandardThrusterTone();
      StarshipAudio.playVoice('standard_thruster');
    }

    // Transition to the 3D Dice Ignition Console after a clear celebratory reveal
    this.time.delayedCall(650, () => {
      if (!this.scene.isActive()) return;
      this.renderOrbitalDiceRollDock(player, question, isCorrect);
    });
  }

  // ===========================================================================
  // UPGRADE 3: TACTILE 3D DICE IGNITION CONSOLE & HOLOGRAPHIC PATH PREVIEW
  // ===========================================================================

  private renderOrbitalDiceRollDock(
    player: ActiveAstronautPlayer,
    question: TriviaQuestionItem,
    wasCorrect: boolean
  ): void {
    this.scenePhase = 'DICE_ROLL';
    this.dockContainer.removeAll(true);

    const correctAnswerText = question.options[question.correctIndex] ?? '';
    const bannerColor = wasCorrect ? 0x10b981 : 0x38bdf8;

    const bg = this.add.graphics();
    bg.fillStyle(0x020617, 0.98);
    bg.fillRoundedRect(18, 478, 1244, 232, 16);
    bg.fillStyle(0x070d1b, 0.96);
    bg.fillRoundedRect(18, 472, 1244, 232, 16);
    bg.lineStyle(3, bannerColor, 0.96);
    bg.strokeRoundedRect(18, 472, 1244, 232, 16);
    this.dockContainer.add(bg);

    // Left Status Telemetry Readout
    const statusTitle = wasCorrect
      ? `⚡ OVERCLOCK ENGAGED! ${player.roster.name.toUpperCase()} UNLOCKED DOUBLE THRUSTER DICE + COLOR WARP!`
      : `🚀 TELEMETRY SYNCED! ${player.roster.name.toUpperCase()} READY FOR SINGLE THRUSTER IGNITION!`;

    const statusSub = wasCorrect
      ? `Confirmed Answer: "${correctAnswerText}"  •  Roll TWO 3D Orbital Dice (2–12 Spaces) + Warp to matching ${PAD_COLOR_HEX[this.getMatchedPadColor(question.correctIndex)].label}!`
      : `Correct Telemetry: "${correctAnswerText}"  •  Zero Penalty! Roll ONE 3D Orbital Die (1–6 Spaces) forward!`;

    const titleTxt = this.add
      .text(44, 504, statusTitle, {
        fontFamily: '"Segoe UI", "Fredoka", sans-serif',
        fontSize: '18.5px',
        fontStyle: 'bold',
        color: wasCorrect ? '#6ee7b7' : '#7dd3fc'
      })
      .setOrigin(0, 0.5);

    const subTxt = this.add
      .text(44, 534, statusSub, {
        fontFamily: '"Segoe UI", "Fredoka", sans-serif',
        fontSize: '14px',
        color: '#e2e8f0'
      })
      .setOrigin(0, 0.5);

    this.dockContainer.add([titleTxt, subTxt]);

    // Centerpiece 3D Isometric Dice Cubes Display (`x: 340` and `x: 470`, `y: 622`)
    const die1 = this.create3DIsometricDie(wasCorrect ? 320 : 385, 622, 6, 0x38bdf8);
    this.dockContainer.add(die1.container);

    let die2: {
      container: Phaser.GameObjects.Container;
      setValue: (v: number) => void;
    } | null = null;

    if (wasCorrect) {
      die2 = this.create3DIsometricDie(455, 622, 6, 0xf59e0b);
      this.dockContainer.add(die2.container);
    }

    // Centerpiece Heavy Red/Amber `[ 🎲 SLAM TO IGNITE THRUSTER DICE ]` Plunger Console (`x: 885, y: 618`)
    const plungerRoot = this.add.container(885, 618);
    const btnW = 560;
    const btnH = 104;

    // 3D Lower Plunger Housing Lip
    const plungerBaseG = this.add.graphics();
    plungerBaseG.fillStyle(0x020617, 0.98);
    plungerBaseG.fillRoundedRect(-btnW / 2 - 4, -btnH / 2 + 10, btnW + 8, btnH + 4, 18);
    plungerBaseG.fillStyle(wasCorrect ? 0x78350f : 0x0c4a6e, 1);
    plungerBaseG.fillRoundedRect(-btnW / 2, -btnH / 2 + 8, btnW, btnH, 16);
    plungerRoot.add(plungerBaseG);

    const plungerCap = this.add.container(0, 0);
    const capG = this.add.graphics();
    capG.fillStyle(wasCorrect ? 0xd97706 : 0x0284c7, 0.98);
    capG.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16);
    capG.fillStyle(0xffffff, 0.18);
    capG.fillRoundedRect(-btnW / 2 + 10, -btnH / 2 + 8, btnW - 20, 28, 10);
    capG.lineStyle(3.5, 0xfef08a, 1);
    capG.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16);

    const plungerLabel = this.add
      .text(
        0,
        -8,
        wasCorrect
          ? '🎲  SLAM TO IGNITE 2x OVERCLOCK DICE!'
          : '🎲  SLAM TO IGNITE THRUSTER DIE!',
        {
          fontFamily: '"Segoe UI", "Fredoka", sans-serif',
          fontSize: '23px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#020617',
          strokeThickness: 4
        }
      )
      .setOrigin(0.5);

    const plungerSub = this.add
      .text(0, 24, 'PHYSICAL HYDRAULIC LAUNCH PLUNGER  •  TAP OR CLICK TO FIRE', {
        fontFamily: '"Segoe UI", "Fredoka", sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);

    plungerCap.add([capG, plungerLabel, plungerSub]);
    plungerRoot.add(plungerCap);

    // Gentle attention pulse on the plunger cap
    const pulseTween = this.tweens.add({
      targets: plungerCap,
      scaleX: { from: 1.0, to: 1.025 },
      scaleY: { from: 1.0, to: 1.025 },
      duration: 560,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const hit = this.add
      .rectangle(0, 0, btnW, btnH, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true });
    plungerRoot.add(hit);

    let rolled = false;
    hit.on('pointerdown', () => {
      if (rolled) return;
      rolled = true;
      hit.disableInteractive();
      pulseTween.stop();
      plungerCap.setScale(1);

      // Physically depress the plunger cap
      this.tweens.add({
        targets: plungerCap,
        y: 8,
        duration: 90,
        ease: 'Quad.easeOut'
      });

      this.execute3DOrbitalDiceRoll(
        player,
        wasCorrect,
        question.correctIndex,
        die1,
        die2,
        plungerLabel,
        plungerSub
      );
    });

    this.dockContainer.add(plungerRoot);
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
        fontFamily: '"Segoe UI", "Fredoka", sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#020617',
        strokeThickness: 4
      })
      .setOrigin(0.5);

    const leftSubTxt = this.add
      .text(-22, 10, `•${initialValue}•`, {
        fontFamily: '"Segoe UI", "Fredoka", sans-serif',
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

  private getMatchedPadColor(answerIdx: number): PadColorType {
    const map: PadColorType[] = ['RED', 'BLUE', 'AMBER', 'EMERALD'];
    return map[answerIdx % 4] ?? 'RED';
  }

  private execute3DOrbitalDiceRoll(
    player: ActiveAstronautPlayer,
    isOverclockDouble: boolean,
    correctAnswerIndex: number,
    die1: { container: Phaser.GameObjects.Container; setValue: (v: number) => void },
    die2: { container: Phaser.GameObjects.Container; setValue: (v: number) => void } | null,
    plungerLabel: Phaser.GameObjects.Text,
    plungerSub: Phaser.GameObjects.Text
  ): void {
    // Play heavy mechanical turbine spin-up + metallic dice clatter
    StarshipAudio.playDiceTumbleBurst();

    const finalD1 = Phaser.Math.Between(1, 6);
    const finalD2 = isOverclockDouble ? Phaser.Math.Between(1, 6) : 0;
    const totalRoll = finalD1 + finalD2;

    plungerLabel.setText('⚡ TURBINE DICE TUMBLING...');
    plungerSub.setText('CALCULATING ORBITAL TRAJECTORY TELEMETRY');

    // Tumble the 3D dice with glowing shockwave rings
    const targets = die2 ? [die1.container, die2.container] : [die1.container];
    this.tweens.add({
      targets,
      angle: { from: -18, to: 18 },
      y: '-=14',
      duration: 90,
      yoyo: true,
      repeat: 5
    });

    targets.forEach((dieNode, dIdx) => {
      const ring = this.add.graphics();
      ring.lineStyle(3, dIdx === 0 ? 0x38bdf8 : 0xf59e0b, 0.9);
      ring.strokeEllipse(0, 0, 84, 52);
      ring.setPosition(dieNode.x, dieNode.y);
      this.dockContainer.add(ring);
      this.tweens.add({
        targets: ring,
        scaleX: 1.75,
        scaleY: 1.75,
        alpha: 0,
        duration: 540,
        repeat: 1,
        onComplete: () => ring.destroy()
      });
    });

    let ticks = 0;
    this.time.addEvent({
      delay: 85,
      repeat: 7,
      callback: () => {
        ticks++;
        if (ticks <= 7) {
          die1.setValue(Phaser.Math.Between(1, 6));
          if (die2) die2.setValue(Phaser.Math.Between(1, 6));
        } else {
          die1.setValue(finalD1);
          if (die2) die2.setValue(finalD2);
          die1.container.setAngle(0);
          if (die2) die2.container.setAngle(0);

          plungerLabel.setText(
            isOverclockDouble
              ? `🚀 ROLLED ${finalD1} + ${finalD2} = ${totalRoll} PADS!`
              : `🚀 ROLLED ${finalD1} PADS FORWARD!`
          );
          plungerSub.setText('LOCKING HOLOGRAPHIC PATH TRAJECTORY ON BOARD...');

          Juice.burstStars(this, die1.container.x + 40, die1.container.y, 20, [
            0xfde047,
            0x38bdf8,
            0x10b981
          ]);

          // Illuminate the exact target path of pads on the board for 650ms before hopping!
          this.showHolographicTrajectoryPreview(player, totalRoll, () => {
            this.scenePhase = 'MOVING';
            const matchedColor = isOverclockDouble
              ? this.getMatchedPadColor(correctAnswerIndex)
              : null;

            this.hopPlayerTokenSteps(player, totalRoll, () => {
              this.onPrimaryMovementComplete(player, matchedColor);
            });
          });
        }
      }
    });
  }

  /**
   * Illuminates the exact target path of pads on the board with a glowing holographic
   * laser trajectory line and pulsing target rings for 650ms before the figurine hops!
   */
  private showHolographicTrajectoryPreview(
    player: ActiveAstronautPlayer,
    steps: number,
    onDone: () => void
  ): void {
    this.scenePhase = 'PATH_PREVIEW';
    this.trajectoryLaserContainer.removeAll(true);
    StarshipAudio.playTrajectoryLaserLock(steps);

    const startIdx = player.padIndex;
    const endIdx = Math.min(this.boardPads.length - 1, startIdx + steps);

    const laserG = this.add.graphics();
    for (let idx = startIdx; idx < endIdx; idx++) {
      const pA = this.boardPads[idx];
      const pB = this.boardPads[idx + 1];
      if (!pA || !pB) continue;

      // Outer laser aura
      laserG.lineStyle(12, player.bay.color, 0.35);
      laserG.lineBetween(pA.x, pA.y - 6, pB.x, pB.y - 6);
      // Inner high-intensity laser beam
      laserG.lineStyle(4, 0xfef08a, 0.96);
      laserG.lineBetween(pA.x, pA.y - 6, pB.x, pB.y - 6);

      // Target ring on each step pad
      const isFinalPad = idx + 1 === endIdx;
      laserG.lineStyle(isFinalPad ? 4 : 2.5, isFinalPad ? 0xfef08a : player.bay.color, 0.95);
      laserG.strokeEllipse(pB.x, pB.y, isFinalPad ? 62 : 44, isFinalPad ? 38 : 28);
    }

    // Floating Target Lock Badge above the destination pad
    const destPad = this.boardPads[endIdx];
    if (destPad) {
      const lockBadge = this.add
        .text(destPad.x, destPad.y - 44, `🎯 TARGET PAD ${destPad.numberLabel}`, {
          fontFamily: '"Segoe UI", "Fredoka", sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#fef08a',
          backgroundColor: '#020617',
          padding: { x: 8, y: 4 }
        })
        .setOrigin(0.5);
      this.trajectoryLaserContainer.add(lockBadge);
    }

    this.trajectoryLaserContainer.add(laserG);
    this.tweens.add({
      targets: laserG,
      alpha: { from: 1, to: 0.45 },
      duration: 160,
      yoyo: true,
      repeat: 3
    });

    this.time.delayedCall(650, () => {
      if (!this.scene.isActive()) return;
      this.time.delayedCall(steps * 610 + 400, () => {
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
      // Wait 800ms after landing on the final pad before triggering cutscenes or advancing turn!
      this.time.delayedCall(800, () => {
        if (this.scene.isActive()) onComplete();
      });
      return;
    }

    player.padIndex = Math.min(this.boardPads.length - 1, player.padIndex + 1);
    const nextPad = this.boardPads[player.padIndex];
    const token = player.tokenContainer;
    const figurine = player.figurineBody;

    if (!token) {
      onComplete();
      return;
    }

    // Play hydraulic jump whoosh + musical ascending pitch chime + landing thud
    StarshipAudio.playTokenHop(stepPitchIndex);

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

    // High parabolic arc (`y - 40px` peak) over `450ms`
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
        token.setPosition(curX, baseLinY - arcLift);

        if (this.activeHighlightRing) {
          this.activeHighlightRing.setPosition(curX, baseLinY + 2);
        }
      },
      onComplete: () => {
        // Spawn glowing landing shockwave ring on the pad!
        const shockG = this.add.graphics();
        shockG.lineStyle(3, player.bay.color, 0.95);
        shockG.strokeEllipse(0, 0, 36, 18);
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

  private onPrimaryMovementComplete(
    player: ActiveAstronautPlayer,
    overclockMatchedColor: PadColorType | null
  ): void {
    if (player.padIndex >= this.boardPads.length - 1) {
      this.triggerCitadelVictory(player);
      return;
    }

    // If Overclock Double Roll was earned, check for Color-Sync Thruster Warp (+1 to +3 spaces ahead)
    if (overclockMatchedColor) {
      let colorTargetIdx = -1;
      for (
        let scan = player.padIndex + 1;
        scan <= Math.min(this.boardPads.length - 2, player.padIndex + 3);
        scan++
      ) {
        const candidate = this.boardPads[scan];
        if (
          candidate.padColor === overclockMatchedColor ||
          candidate.padColor === 'RAINBOW'
        ) {
          colorTargetIdx = scan;
          break;
        }
      }

      if (colorTargetIdx > player.padIndex) {
        const bonusSteps = colorTargetIdx - player.padIndex;
        StarshipAudio.playVoice('color_warp_bonus');
        this.playWidescreenCutsceneOverlay(
          '🌈 COLOR-SYNC THRUSTER WARP!',
          `${player.roster.name} syncs with the next ${PAD_COLOR_HEX[overclockMatchedColor].label} (+${bonusSteps} Bonus Spaces)!`,
          player.bay.color,
          2200,
          () => {
            this.hopPlayerTokenSteps(player, bonusSteps, () => {
              this.evaluateLandedSpecialTile(player);
            });
          }
        );
        return;
      }
    }

    this.evaluateLandedSpecialTile(player);
  }

  // ===========================================================================
  // UPGRADE 7: CINEMATIC CUTSCENES & INTERACTIVE RANDOM SECTOR CHALLENGES
  // ===========================================================================

  private evaluateLandedSpecialTile(player: ActiveAstronautPlayer): void {
    if (player.padIndex >= this.boardPads.length - 1) {
      this.triggerCitadelVictory(player);
      return;
    }

    const pad = this.boardPads[player.padIndex];
    if (!pad) {
      this.finishTurnAndAdvancePlayer();
      return;
    }

    if (pad.special === 'WORMHOLE' && typeof pad.wormholeTargetIndex === 'number') {
      const targetIdx = pad.wormholeTargetIndex;
      StarshipAudio.playWormholeWarp();
      StarshipAudio.playVoice('tile_wormhole');
      this.playWidescreenCutsceneOverlay(
        '🌀 HYPERLOOP WORMHOLE CONDUIT!',
        `${player.roster.name} enters the Plasma Tunnel and warps ahead to Pad ${targetIdx + 1}!`,
        0x22d3ee,
        2900,
        () => {
          this.warpPlayerDirectlyToPad(player, targetIdx, () => {
            this.finishTurnAndAdvancePlayer();
          });
        }
      );
      return;
    }

    if (pad.special === 'OVERCLOCK') {
      const targetIdx = Math.min(this.boardPads.length - 1, player.padIndex + 3);
      StarshipAudio.playOverclockFanfare();
      StarshipAudio.playVoice('tile_overclock');
      this.playWidescreenCutsceneOverlay(
        '⚡ FICSIT OVERCLOCK PAD!',
        `Power Shards supercharge ${player.roster.name}'s jetpack (+3 Bonus Spaces)!`,
        0xf59e0b,
        2800,
        () => {
          this.hopPlayerTokenSteps(player, targetIdx - player.padIndex, () => {
            if (player.padIndex >= this.boardPads.length - 1) {
              this.triggerCitadelVictory(player);
            } else {
              this.finishTurnAndAdvancePlayer();
            }
          });
        }
      );
      return;
    }

    if (pad.special === 'RAINBOW_STARSHIP') {
      const targetIdx = Math.min(this.boardPads.length - 1, player.padIndex + 4);
      StarshipAudio.playOverclockFanfare();
      StarshipAudio.playVoice('tile_rainbow_starship');
      this.playWidescreenCutsceneOverlay(
        '🦄 RAINBOW STARSHIP ESCORT!',
        `The Cyber-Unicorn Cruiser escorts ${player.roster.name} +4 Spaces toward the Citadel!`,
        0xf472b6,
        2900,
        () => {
          this.hopPlayerTokenSteps(player, targetIdx - player.padIndex, () => {
            if (player.padIndex >= this.boardPads.length - 1) {
              this.triggerCitadelVictory(player);
            } else {
              this.finishTurnAndAdvancePlayer();
            }
          });
        }
      );
      return;
    }

    if (pad.special === 'ASTEROID') {
      const targetIdx = Math.max(0, player.padIndex - 2);
      StarshipAudio.playAsteroidRetro();
      StarshipAudio.playVoice('tile_asteroid');
      this.playWidescreenCutsceneOverlay(
        '☄️ ASTEROID GRAVITY WELL!',
        `Magnetic turbulence pulls ${player.roster.name} back 2 spaces to Pad ${targetIdx + 1}!`,
        0xef4444,
        2800,
        () => {
          this.warpPlayerDirectlyToPad(player, targetIdx, () => {
            this.finishTurnAndAdvancePlayer();
          });
        }
      );
      return;
    }

    // 25% Chance on normal pads to trigger an Interactive Random Sector Challenge!
    if (pad.special === 'NONE' && player.padIndex > 0 && Math.random() < 0.25) {
      this.triggerRandomSectorChallenge(player);
      return;
    }

    this.finishTurnAndAdvancePlayer();
  }

  /**
   * Plays a Full-Screen Widescreen Letterbox Cutscene Overlay (`2.8–3.5 seconds`)
   * with animated warp-speed star streaks, particle bursts, and holographic telemetry banners!
   */
  private playWidescreenCutsceneOverlay(
    headline: string,
    subtitle: string,
    accentHex: number,
    durationMs: number,
    onDone: () => void
  ): void {
    this.scenePhase = 'CUTSCENE';
    this.cutsceneContainer.removeAll(true);
    StarshipAudio.playCutsceneBannerSwoosh();

    const effectiveDuration = Math.max(2800, durationMs);

    // Widescreen Top & Bottom Cinema Letterbox Bars
    const topBar = this.add.rectangle(640, -35, 1280, 70, 0x010409, 0.96);
    const botBar = this.add.rectangle(640, 755, 1280, 70, 0x010409, 0.96);
    this.cutsceneContainer.add([topBar, botBar]);

    this.tweens.add({
      targets: topBar,
      y: 35,
      duration: 260,
      ease: 'Quad.easeOut'
    });
    this.tweens.add({
      targets: botBar,
      y: 685,
      duration: 260,
      ease: 'Quad.easeOut'
    });

    // Animated Warp-Speed Starlight Streaks / Rainbow Prism Beams across the cutscene stage
    for (let s = 0; s < 14; s++) {
      const sy = Phaser.Math.Between(110, 450);
      const streak = this.add.graphics();
      streak.lineStyle(Phaser.Math.Between(2, 4), s % 2 === 0 ? accentHex : 0xfef08a, 0.75);
      streak.lineBetween(0, 0, Phaser.Math.Between(90, 210), 0);
      streak.setPosition(-220, sy);
      this.cutsceneContainer.add(streak);

      this.tweens.add({
        targets: streak,
        x: 1450,
        duration: Phaser.Math.Between(650, 1250),
        delay: s * 95,
        ease: 'Quad.easeIn',
        onComplete: () => streak.destroy()
      });
    }

    // Center Holographic Cutscene Banner (`y: 280`)
    const banner = this.add.container(640, 280).setScale(0.75).setAlpha(0);
    const bG = this.add.graphics();
    bG.fillStyle(0x020617, 0.95);
    bG.fillRoundedRect(-470, -68, 940, 136, 18);
    bG.lineStyle(4, accentHex, 1);
    bG.strokeRoundedRect(-470, -68, 940, 136, 18);
    bG.fillStyle(accentHex, 0.2);
    bG.fillRoundedRect(-462, -60, 924, 34, 12);

    const headTxt = this.add
      .text(0, -22, headline, {
        fontFamily: '"Segoe UI", "Fredoka", sans-serif',
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#020617',
        strokeThickness: 5
      })
      .setOrigin(0.5);

    const subTxt = this.add
      .text(0, 26, subtitle, {
        fontFamily: '"Segoe UI", "Fredoka", sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#fde047',
        align: 'center',
        wordWrap: { width: 880 }
      })
      .setOrigin(0.5);

    banner.add([bG, headTxt, subTxt]);
    this.cutsceneContainer.add(banner);

    this.tweens.add({
      targets: banner,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 320,
      ease: 'Back.easeOut'
    });

    Juice.burstStars(this, 640, 280, 28, [accentHex, 0xfde047, 0xffffff]);

    this.time.delayedCall(effectiveDuration, () => {
      if (!this.scene.isActive()) return;
      this.tweens.add({
        targets: [banner, topBar, botBar],
        alpha: 0,
        duration: 240,
        onComplete: () => {
          this.cutsceneContainer.removeAll(true);
          onDone();
        }
      });
    });
  }

  /**
   * Triggers one of 3 Interactive Random Sector Challenges:
   * 1. `☄️ METEOR SHIELD REFLEX` (Tap one of 3 glowing industrial shield buttons for +2 boost)
   * 2. `🎰 FICSIT SUPPLY DROP ROULETTE` (Slam stop switch on orbital supply wheel)
   * 3. `🦄 STARLIGHT CATCH-UP BOOST` (Space Unicorn grants a +3 thruster boost)
   */
  private triggerRandomSectorChallenge(player: ActiveAstronautPlayer): void {
    this.scenePhase = 'CUTSCENE';
    this.cutsceneContainer.removeAll(true);
    StarshipAudio.playCutsceneBannerSwoosh();

    const rollType = Phaser.Math.Between(1, 3);

    if (rollType === 3) {
      // 3. `🦄 STARLIGHT CATCH-UP BOOST`
      this.playWidescreenCutsceneOverlay(
        '🦄 STARLIGHT UNICORN SURPRISE BOOST!',
        `The Cyber-Unicorn appears in a flash of starlight and grants ${player.roster.name} a +3 Pad Boost!`,
        0xf472b6,
        2900,
        () => {
          this.hopPlayerTokenSteps(player, 3, () => {
            if (player.padIndex >= this.boardPads.length - 1) {
              this.triggerCitadelVictory(player);
            } else {
              this.finishTurnAndAdvancePlayer();
            }
          });
        }
      );
      return;
    }

    // Full-screen interactive challenge modal
    const shade = this.add
      .rectangle(640, 360, 1280, 720, 0x020617, 0.78)
      .setInteractive();
    const card = this.add.container(640, 350);

    const cG = this.add.graphics();
    cG.fillStyle(0x070d1b, 0.98);
    cG.fillRoundedRect(-440, -195, 880, 390, 20);
    cG.lineStyle(4, 0xf59e0b, 1);
    cG.strokeRoundedRect(-440, -195, 880, 390, 20);
    card.add(cG);

    if (rollType === 1) {
      // 1. `☄️ METEOR SHIELD REFLEX`
      const title = this.add
        .text(0, -142, '☄️ SECTOR ALERT: METEOR SHIELD REFLEX!', {
          fontFamily: '"Segoe UI", "Fredoka", sans-serif',
          fontSize: '27px',
          fontStyle: 'bold',
          color: '#fde047'
        })
        .setOrigin(0.5);
      const sub = this.add
        .text(
          0,
          -98,
          `${player.roster.name}, tap any glowing FICSIT Deflector Shield to vaporize the meteor for a +2 Pad Boost!`,
          {
            fontFamily: '"Segoe UI", "Fredoka", sans-serif',
            fontSize: '16px',
            color: '#e2e8f0'
          }
        )
        .setOrigin(0.5);
      card.add([title, sub]);

      const shieldLabels = ['🛡️ ALPHA SHIELD', '🛡️ BETA SHIELD', '🛡️ OMEGA SHIELD'];
      const shieldColors = [0x38bdf8, 0xf59e0b, 0x10b981];
      let resolved = false;

      shieldLabels.forEach((lbl, idx) => {
        const bx = -260 + idx * 260;
        const by = 45;
        const btn = this.createCockpitRockerSwitch(bx, by, 225, 88, lbl, shieldColors[idx], () => {
          if (resolved) return;
          resolved = true;
          StarshipAudio.playOverclockFanfare();
          Juice.burstStars(this, 640 + bx, 350 + by, 24, [shieldColors[idx], 0xfde047]);
          sub.setText('⚡ METEOR VAPORIZED! +2 THRUSTER BOOST ENGAGED!');
          sub.setColor('#6ee7b7');

          this.time.delayedCall(950, () => {
            this.cutsceneContainer.removeAll(true);
            this.hopPlayerTokenSteps(player, 2, () => {
              if (player.padIndex >= this.boardPads.length - 1) {
                this.triggerCitadelVictory(player);
              } else {
                this.finishTurnAndAdvancePlayer();
              }
            });
          });
        });
        card.add(btn);
      });
    } else {
      // 2. `🎰 FICSIT SUPPLY DROP ROULETTE`
      const title = this.add
        .text(0, -142, '🎰 FICSIT ORBITAL SUPPLY DROP ROULETTE!', {
          fontFamily: '"Segoe UI", "Fredoka", sans-serif',
          fontSize: '27px',
          fontStyle: 'bold',
          color: '#38bdf8'
        })
        .setOrigin(0.5);
      const sub = this.add
        .text(
          0,
          -98,
          `${player.roster.name}, slam the LOCK SUPPLY DROP switch to claim your orbital thruster bonus!`,
          {
            fontFamily: '"Segoe UI", "Fredoka", sans-serif',
            fontSize: '16px',
            color: '#e2e8f0'
          }
        )
        .setOrigin(0.5);

      const wheelPrizes = [
        { label: '⚡ +1 THRUSTER PAD', steps: 1 },
        { label: '🚀 +2 THRUSTER PADS', steps: 2 },
        { label: '🌟 +3 SUPER BOOST PADS', steps: 3 },
        { label: '🌈 WARP TO NEXT COLOR PAD', steps: 4 }
      ];
      let currentPrizeIdx = 0;

      const prizeBoxG = this.add.graphics();
      prizeBoxG.fillStyle(0x020617, 0.95);
      prizeBoxG.fillRoundedRect(-250, -45, 500, 74, 14);
      prizeBoxG.lineStyle(3, 0xfde047, 1);
      prizeBoxG.strokeRoundedRect(-250, -45, 500, 74, 14);

      const prizeTxt = this.add
        .text(0, -8, wheelPrizes[0].label, {
          fontFamily: '"Segoe UI", "Fredoka", sans-serif',
          fontSize: '26px',
          fontStyle: 'bold',
          color: '#fde047'
        })
        .setOrigin(0.5);

      const spinTimer = this.time.addEvent({
        delay: 110,
        loop: true,
        callback: () => {
          currentPrizeIdx = (currentPrizeIdx + 1) % wheelPrizes.length;
          prizeTxt.setText(wheelPrizes[currentPrizeIdx].label);
          StarshipAudio.playUiChirp(740, 1080);
        }
      });

      let stopped = false;
      const stopBtn = this.createCockpitRockerSwitch(
        0,
        105,
        360,
        78,
        '🎯 SLAM TO LOCK SUPPLY DROP!',
        0x10b981,
        () => {
          if (stopped) return;
          stopped = true;
          spinTimer.remove(false);
          const won = wheelPrizes[currentPrizeIdx];
          StarshipAudio.playOverclockFanfare();
          Juice.burstStars(this, 640, 340, 26, [0x10b981, 0xfde047, 0x38bdf8]);
          sub.setText(`LOCKED IN: ${won.label}!`);
          sub.setColor('#6ee7b7');

          this.time.delayedCall(1000, () => {
            this.cutsceneContainer.removeAll(true);
            this.hopPlayerTokenSteps(player, won.steps, () => {
              if (player.padIndex >= this.boardPads.length - 1) {
                this.triggerCitadelVictory(player);
              } else {
                this.finishTurnAndAdvancePlayer();
              }
            });
          });
        }
      );

      card.add([title, sub, prizeBoxG, prizeTxt, stopBtn]);
    }

    this.cutsceneContainer.add([shade, card]);
  }

  private warpPlayerDirectlyToPad(
    player: ActiveAstronautPlayer,
    targetPadIndex: number,
    onDone: () => void
  ): void {
    player.padIndex = Phaser.Math.Clamp(targetPadIndex, 0, this.boardPads.length - 1);
    const dest = this.computeTokenWorldPosition(player.padIndex, this.activePlayerIndex);

    if (!player.tokenContainer) {
      onDone();
      return;
    }

    this.tweens.add({
      targets: player.tokenContainer,
      x: dest.x,
      y: dest.y,
      scaleX: { from: 1.35, to: 1.0 },
      scaleY: { from: 1.35, to: 1.0 },
      duration: 620,
      ease: 'Back.easeOut',
      onComplete: () => {
        Juice.burstStars(this, dest.x, dest.y, 18, [player.bay.color, 0xfde047]);
        this.refreshAllTokenOffsets();
        this.renderTopMissionHeader();
        this.time.delayedCall(700, () => {
          if (this.scene.isActive()) onDone();
        });
      }
    });
  }

  private finishTurnAndAdvancePlayer(): void {
    // Deliberate 1400ms pause between turns so the family can see the board state clearly
    this.time.delayedCall(1400, () => {
      if (!this.scene.isActive() || this.scenePhase === 'VICTORY') return;
      const nextIdx = (this.activePlayerIndex + 1) % this.players.length;
      this.startPlayerTurn(nextIdx);
    });
  }

  // ===========================================================================
  // GRAND UNICORN CITADEL VICTORY CELEBRATION
  // ===========================================================================

  private triggerCitadelVictory(winner: ActiveAstronautPlayer): void {
    this.scenePhase = 'VICTORY';
    this.dockContainer.removeAll(true);
    this.cutsceneContainer.removeAll(true);
    this.victoryContainer.removeAll(true);
    this.victoryContainer.setVisible(true);

    StarshipAudio.playVictoryAnthem();
    StarshipAudio.playVoice(winner.roster.victoryVoice);

    const shade = this.add
      .rectangle(640, 360, 1280, 720, 0x020617, 0.88)
      .setInteractive();
    this.victoryContainer.add(shade);

    const card = this.add.container(640, 360);
    const g = this.add.graphics();
    g.fillStyle(0x090f20, 0.97);
    g.fillRoundedRect(-470, -270, 940, 540, 24);
    g.lineStyle(4, 0xfde047, 1);
    g.strokeRoundedRect(-470, -270, 940, 540, 24);
    card.add(g);

    const crownTxt = this.add
      .text(0, -215, '🦄🏆  STARSHIP UNICORN CITADEL REACHED!  🏆🦄', {
        fontFamily: '"Segoe UI", "Fredoka", sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#fde047'
      })
      .setOrigin(0.5);

    const astroKey = `starship-astro-${winner.roster.id}`;
    if (this.textures.exists(astroKey)) {
      const portImg = this.add
        .image(0, -90, astroKey)
        .setDisplaySize(165, 165);
      card.add(portImg);
    }

    const winTitle = this.add
      .text(0, 22, `${winner.roster.callsign} WINS THE MISSION!`, {
        fontFamily: '"Segoe UI", "Fredoka", sans-serif',
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#020617',
        strokeThickness: 5
      })
      .setOrigin(0.5);

    const statsSummary = this.players
      .map(
        (p) =>
          `${p.roster.name}: Pad ${p.padIndex + 1}/${this.missionTotalPads} (${p.correctCount} ⚡)`
      )
      .join('   •   ');

    const statsTxt = this.add
      .text(0, 75, statsSummary, {
        fontFamily: '"Segoe UI", "Fredoka", sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#7dd3fc',
        align: 'center',
        wordWrap: { width: 860 }
      })
      .setOrigin(0.5);

    const playAgainBtn = this.createCockpitRockerSwitch(
      -175,
      175,
      300,
      64,
      '🚀  LAUNCH NEW MISSION',
      0x10b981,
      () => {
        this.openPreFlightLobby(false);
      }
    );

    const hubBtn = this.createCockpitRockerSwitch(
      175,
      175,
      300,
      64,
      '◄  RETURN TO ARCADE HUB',
      0x0284c7,
      () => {
        this.scene.start('HubScene');
      }
    );

    card.add([crownTxt, winTitle, statsTxt, playAgainBtn, hubBtn]);
    this.victoryContainer.add(card);

    Juice.burstStars(this, 640, 260, 45, [0xfde047, 0x38bdf8, 0xf472b6, 0x10b981]);
  }
}
