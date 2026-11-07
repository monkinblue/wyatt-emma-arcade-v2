/**
 * src/scenes/StarshipUnicornScene.ts
 * ----------------------------------
 * Mentor Note:
 * `StarshipUnicornScene` is the flagship Next-Gen 1080p/4K HD Living-Room TV Party Board Game
 * in Wyatt & Emma Arcade v2.0: **STARSHIP UNICORN: ORBITAL TRIVIA**.
 *
 * Architectural Highlights:
 * 1. **Strictly Linear HD Filtering (`Phaser.Textures.FilterMode.LINEAR`)**:
 *    Even though the global Phaser game config sets `pixelArt: true` for the 32-bit cabinet
 *    mini-games, `StarshipUnicornScene` explicitly sets `FilterMode.LINEAR` on all loaded
 *    and procedural textures so photorealistic SpaceX/FICSIT astronaut portraits, glassmorphic
 *    telemetry panels, and the 2560x1440 cosmic backdrop render with razor-sharp anti-aliasing.
 * 2. **Board-First 75% / 25% Screen Real Estate**:
 *    The cosmic hex pathway and all 2–6 astronaut tokens stay visible at all times across the
 *    upper 73% of the 1280x720 stage while the sleek glassmorphic Telemetry Trivia & 3D Orbital
 *    Dice Dock occupies the lower 27% (`y: 518..720`).
 * 3. **Age-Adaptive Non-Repeating Trivia Engine**:
 *    Automatically inspects the active astronaut's profile (`ADULT`, `WYATT_4YO`, or `EMMA_3YO`)
 *    and pulls non-repeating questions from `src/data/starshipTrivia.json` (335 questions total).
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
  counts: {
    adult: number;
    wyatt4yo: number;
    emma3yo: number;
    total: number;
  };
  questions: {
    ADULT: TriviaQuestionItem[];
    WYATT_4YO: TriviaQuestionItem[];
    EMMA_3YO: TriviaQuestionItem[];
  };
}

const TRIVIA_BANK = triviaBankRaw as unknown as TriviaBankData;

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
  index: number; // 0 .. totalPads - 1
  numberLabel: number; // 1 .. totalPads
  x: number;
  y: number;
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
  tokenRing?: Phaser.GameObjects.Graphics;
}

const PAD_COLOR_HEX: Record<PadColorType, { fill: number; rim: number; hex: string; label: string }> = {
  RED: { fill: 0x991b1b, rim: 0xf87171, hex: '#f87171', label: 'RED RUBY' },
  BLUE: { fill: 0x1e3a8a, rim: 0x38bdf8, hex: '#38bdf8', label: 'BLUE PULSAR' },
  AMBER: { fill: 0x78350f, rim: 0xfbbf24, hex: '#fbbf24', label: 'AMBER FICSIT' },
  EMERALD: { fill: 0x064e3b, rim: 0x34d399, hex: '#34d399', label: 'EMERALD NEBULA' },
  RAINBOW: { fill: 0x581c87, rim: 0xf0abfc, hex: '#f0abfc', label: 'RAINBOW WARP' }
};

const OPTION_PAD_COLORS: Array<{
  letter: string;
  name: string;
  padColor: PadColorType;
  bgFill: number;
  rimColor: number;
  hexText: string;
}> = [
  { letter: 'A', name: 'RED', padColor: 'RED', bgFill: 0x7f1d1d, rimColor: 0xf87171, hexText: '#fecaca' },
  { letter: 'B', name: 'BLUE', padColor: 'BLUE', bgFill: 0x0c4a6e, rimColor: 0x38bdf8, hexText: '#bae6fd' },
  { letter: 'C', name: 'AMBER', padColor: 'AMBER', bgFill: 0x78350f, rimColor: 0xfbbf24, hexText: '#fde68a' },
  { letter: 'D', name: 'EMERALD', padColor: 'EMERALD', bgFill: 0x064e3b, rimColor: 0x34d399, hexText: '#a7f3d0' }
];

export class StarshipUnicornScene extends Phaser.Scene {
  // Mission Configuration State
  private selectedAstronautIds: AstronautId[] = ['wyatt', 'emma', 'robert', 'rita'];
  private missionTotalPads: 25 | 50 = 25;

  // Active Game State
  private scenePhase: 'LOBBY' | 'TRIVIA' | 'DICE_ROLL' | 'MOVING' | 'VICTORY' = 'LOBBY';
  private players: ActiveAstronautPlayer[] = [];
  private activePlayerIndex = 0;
  private boardPads: OrbitalHexPad[] = [];

  // Session-Persistent Question History (never repeats in a session!)
  private askedQuestionIds: Set<string> = new Set();
  private currentQuestion: TriviaQuestionItem | null = null;
  private lastAnswerWasOverclock = false;
  private lastChosenPadColor: PadColorType = 'RED';
  private pendingColorWarpBonus = false;
  private isRollingDice = false;

  // Display Containers
  private bgContainer!: Phaser.GameObjects.Container;
  private boardContainer!: Phaser.GameObjects.Container;
  private tokensContainer!: Phaser.GameObjects.Container;
  private topHudContainer!: Phaser.GameObjects.Container;
  private dockContainer!: Phaser.GameObjects.Container;
  private lobbyContainer!: Phaser.GameObjects.Container;
  private victoryContainer!: Phaser.GameObjects.Container;
  private activeHighlightRing!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'StarshipUnicornScene' });
  }

  public create(): void {
    // Pause cozy music-box BGM so our SpaceX/Synthwave Starbase audio takes center stage
    AudioBus.stopCozyLoop();
    this.enforceLinearFiltering();
    this.ensureSmoothGlowTextures();

    this.bgContainer = this.add.container(0, 0).setDepth(1);
    this.boardContainer = this.add.container(0, 0).setDepth(10);
    this.tokensContainer = this.add.container(0, 0).setDepth(25);
    this.topHudContainer = this.add.container(0, 0).setDepth(40);
    this.dockContainer = this.add.container(0, 0).setDepth(50);
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

  /**
   * STRICT GUARDRAIL #3:
   * Force smooth `Phaser.Textures.FilterMode.LINEAR` on every texture used in
   * `StarshipUnicornScene` so there is ZERO pixelation anywhere in this scene!
   */
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

  /**
   * Creates high-resolution anti-aliased radial glow and starlight flare textures
   * with `FilterMode.LINEAR` for volumetric nebula lighting and jetpack exhausts.
   */
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

  /**
   * Renders the 2560x1440 Next-Gen Cosmic Backdrop (`starship-board-bg`), volumetric
   * bioluminescent nebula shimmer, and the iridescent Cyber-Unicorn Citadel beacon.
   */
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

    // Subtle dark glassmorphic vignette over the board region so glowing hex pads pop with 100% contrast
    const boardScrim = this.add.graphics();
    boardScrim.fillStyle(0x040814, 0.34);
    boardScrim.fillRect(0, 0, 1280, 720);
    this.bgContainer.add(boardScrim);

    // Volumetric bioluminescent nebula lights & twinkling starlight particles
    const nebulaColors = [0x38bdf8, 0xf472b6, 0xa855f7, 0xf59e0b, 0x10b981];
    for (let i = 0; i < 18; i++) {
      const nx = Phaser.Math.Between(80, 1200);
      const ny = Phaser.Math.Between(70, 500);
      const scale = Phaser.Math.FloatBetween(0.18, 0.42);
      const flare = this.add
        .image(nx, ny, 'starship-flare-dot')
        .setTint(nebulaColors[i % nebulaColors.length])
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(scale)
        .setAlpha(Phaser.Math.FloatBetween(0.25, 0.75));
      this.bgContainer.add(flare);

      this.tweens.add({
        targets: flare,
        alpha: { from: 0.18, to: 0.85 },
        scaleX: { from: scale * 0.75, to: scale * 1.35 },
        scaleY: { from: scale * 0.75, to: scale * 1.35 },
        duration: Phaser.Math.Between(1800, 3400),
        delay: i * 110,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  /**
   * Renders the sleek SpaceX / FICSIT Top Mission Telemetry Bar (`y: 0..52`).
   */
  private renderTopMissionHeader(): void {
    this.topHudContainer.removeAll(true);

    const barG = this.add.graphics();
    barG.fillStyle(0x070d19, 0.88);
    barG.fillRect(0, 0, 1280, 50);
    barG.lineStyle(2, 0x38bdf8, 0.65);
    barG.lineBetween(0, 50, 1280, 50);
    // FICSIT safety-amber accent stripe
    barG.fillStyle(0xf59e0b, 0.95);
    barG.fillRect(0, 48, 220, 3);
    barG.fillRect(1060, 48, 220, 3);
    this.topHudContainer.add(barG);

    // 1. Top-Left `[ ◀ ARCADE HUB ]` Button
    const hubBtn = this.createSleekHeaderButton(92, 25, 156, 36, '◀ ARCADE HUB', 0x38bdf8, () => {
      StarshipAudio.playUiChirp(880, 520);
      StarshipAudio.stopVoice();
      StarshipAudio.stopAmbientStarbasePad();
      AudioBus.startCozyLoop();
      this.scene.start('HubScene');
    });
    this.topHudContainer.add(hubBtn);

    // 2. Mission Title & Trajectory Badge (`STARSHIP UNICORN // ORBITAL TRIVIA`)
    const titleText = this.add
      .text(295, 16, 'STARSHIP UNICORN', {
        fontFamily: '"Segoe UI", "Fredoka", system-ui, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#f8fafc'
      })
      .setOrigin(0, 0.5);
    const subText = this.add
      .text(295, 34, `FICSIT ORBITAL TELEMETRY • ${this.missionTotalPads} PADS`, {
        fontFamily: '"Segoe UI", "Fredoka", system-ui, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#f59e0b'
      })
      .setOrigin(0, 0.5);
    this.topHudContainer.add([titleText, subText]);

    // 3. Center Live Crew Standings Strip (when in active mission)
    if (this.players.length > 0 && this.scenePhase !== 'LOBBY') {
      const startX = 520;
      const spacing = Math.min(92, Math.floor(510 / this.players.length));
      this.players.forEach((p, idx) => {
        const px = startX + idx * spacing;
        const isCurrent = idx === this.activePlayerIndex;
        const badge = this.add.container(px, 25);
        const bg = this.add.graphics();
        bg.fillStyle(isCurrent ? 0x1e293b : 0x0f172a, 0.95);
        bg.fillRoundedRect(-41, -17, 82, 34, 8);
        bg.lineStyle(isCurrent ? 2.5 : 1.2, p.bay.color, isCurrent ? 1 : 0.65);
        bg.strokeRoundedRect(-41, -17, 82, 34, 8);
        badge.add(bg);

        if (this.textures.exists(`starship-token-${p.roster.id}`)) {
          const miniTok = this.add
            .image(-24, 0, `starship-token-${p.roster.id}`)
            .setDisplaySize(26, 26);
          badge.add(miniTok);
        }

        const nameLbl = this.add
          .text(12, -6, p.roster.name, {
            fontFamily: '"Segoe UI", "Fredoka", sans-serif',
            fontSize: '10px',
            fontStyle: 'bold',
            color: isCurrent ? '#ffffff' : '#cbd5e1'
          })
          .setOrigin(0.5);
        const padLbl = this.add
          .text(12, 7, `PAD ${p.padIndex + 1}`, {
            fontFamily: '"Segoe UI", "Fredoka", sans-serif',
            fontSize: '10px',
            fontStyle: 'bold',
            color: p.bay.hex
          })
          .setOrigin(0.5);
        badge.add([nameLbl, padLbl]);
        this.topHudContainer.add(badge);
      });
    }

    // 4. Top-Right `[ ⚙ MISSION LOBBY ]` & `[ 🔊 ]` Buttons
    const lobbyBtn = this.createSleekHeaderButton(1125, 25, 138, 36, '⚙ CREW LOBBY', 0xf59e0b, () => {
      StarshipAudio.playUiChirp(740, 1180);
      this.openPreFlightLobby(false);
    });
    this.topHudContainer.add(lobbyBtn);

    const muteBtn = this.createSleekHeaderButton(
      1232,
      25,
      54,
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
    g.fillStyle(0x111c2d, 0.94);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 9);
    g.lineStyle(1.8, rimColor, 0.9);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 9);

    const txt = this.add
      .text(0, 0, label, {
        fontFamily: '"Segoe UI", "Fredoka", system-ui, sans-serif',
        fontSize: '12.5px',
        fontStyle: 'bold',
        color: '#f8fafc'
      })
      .setOrigin(0.5);

    c.add([g, txt]);
    Juice.makeTactileButton(this, c, Math.max(w, 64), Math.max(h, 52), onTap, 'pop');
    return c;
  }

  // ===========================================================================
  // GOAL 3: PRE-FLIGHT MISSION LOBBY (2–6 PLAYERS & MISSION LENGTH TOGGLE)
  // ===========================================================================

  private openPreFlightLobby(isInitialBoot: boolean): void {
    this.scenePhase = 'LOBBY';
    this.lobbyContainer.removeAll(true);
    this.lobbyContainer.setVisible(true);
    this.dockContainer.removeAll(true);

    StarshipAudio.startAmbientStarbasePad();
    if (isInitialBoot) {
      StarshipAudio.playVoice('welcome_title', () => {
        if (this.scenePhase === 'LOBBY') {
          StarshipAudio.playVoice('lobby_select');
        }
      });
    }

    // Translucent glassmorphic Starbase Mission Control overlay
    const scrim = this.add
      .rectangle(640, 360, 1280, 720, 0x030712, 0.82)
      .setInteractive();
    this.lobbyContainer.add(scrim);

    // Outer Brushed-Titanium & FICSIT Amber Mission Control Frame (`1216 x 644`)
    const panelW = 1216;
    const panelH = 644;
    const panelX = 640 - panelW / 2;
    const panelY = 376 - panelH / 2;

    const frameG = this.add.graphics();
    frameG.fillStyle(0x0b1324, 0.95);
    frameG.fillRoundedRect(panelX, panelY, panelW, panelH, 20);
    frameG.lineStyle(3, 0x38bdf8, 0.85);
    frameG.strokeRoundedRect(panelX, panelY, panelW, panelH, 20);
    frameG.lineStyle(1.5, 0xf59e0b, 0.75);
    frameG.strokeRoundedRect(panelX + 6, panelY + 6, panelW - 12, panelH - 12, 16);

    // Top FICSIT / SpaceX Header Banner inside Lobby
    frameG.fillStyle(0x111e36, 0.98);
    frameG.fillRoundedRect(panelX + 14, panelY + 14, panelW - 28, 66, 12);
    frameG.lineStyle(1.5, 0x38bdf8, 0.5);
    frameG.strokeRoundedRect(panelX + 14, panelY + 14, panelW - 28, 66, 12);
    this.lobbyContainer.add(frameG);

    const lobbyTitle = this.add
      .text(640, panelY + 34, 'STARSHIP UNICORN: ORBITAL TRIVIA — PRE-FLIGHT MISSION CONTROL', {
        fontFamily: '"Segoe UI", "Fredoka", system-ui, sans-serif',
        fontSize: '21px',
        fontStyle: 'bold',
        color: '#f8fafc',
        stroke: '#020617',
        strokeThickness: 3
      })
      .setOrigin(0.5);

    const lobbySubtitle = this.add
      .text(
        640,
        panelY + 60,
        `TAP ASTRONAUT EXOSUIT CARDS TO ASSIGN LAUNCH BAYS P1–P6 (${this.selectedAstronautIds.length}/6 CREW SELECTED — MIN 2, MAX 6)`,
        {
          fontFamily: '"Segoe UI", "Fredoka", system-ui, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#38bdf8'
        }
      )
      .setOrigin(0.5);
    this.lobbyContainer.add([lobbyTitle, lobbySubtitle]);

    // Quick Family Crew Preset Pill Buttons (Top-Right of Lobby Header)
    const presetKidsParents = this.createSleekHeaderButton(
      1095,
      panelY + 47,
      208,
      36,
      '⚡ 4P CORE CREW',
      0x10b981,
      () => {
        this.selectedAstronautIds = ['wyatt', 'emma', 'robert', 'rita'];
        StarshipAudio.playLobbyToggle(true, 3);
        this.openPreFlightLobby(false);
      }
    );
    const presetGrandparents = this.createSleekHeaderButton(
      185,
      panelY + 47,
      212,
      36,
      '🌟 6P FAMILY PARTY',
      0xf59e0b,
      () => {
        this.selectedAstronautIds = ['wyatt', 'emma', 'robert', 'rita', 'papa', 'nana'];
        StarshipAudio.playLobbyToggle(true, 5);
        this.openPreFlightLobby(false);
      }
    );
    this.lobbyContainer.add([presetKidsParents, presetGrandparents]);

    // -------------------------------------------------------------------------
    // 9 PHOTOREALISTIC SPACEX / FICSIT EXOSUIT ASTRONAUT CARDS (Row 1: 5, Row 2: 4)
    // -------------------------------------------------------------------------
    const row1Specs = ASTRONAUT_ROSTER.slice(0, 5);
    const row2Specs = ASTRONAUT_ROSTER.slice(5, 9);

    const renderRosterCard = (spec: AstronautRosterSpec, cx: number, cy: number) => {
      const slotIdx = this.selectedAstronautIds.indexOf(spec.id);
      const isSelected = slotIdx !== -1;
      const baySpec = isSelected ? PLAYER_BAY_COLORS[slotIdx] : null;

      const cardContainer = this.add.container(cx, cy);
      const cardW = 202;
      const cardH = 212;

      // Glowing Neon Launch Bay Backplate
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

      // High-Res Hexagonal Brushed-Titanium Avatar Card (`starship-card-<id>`)
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

      // Profile Age-Tier Pill at bottom of card (`ADULT TRIVIA`, `AGE 4 RANGER`, `AGE 3 PRINCESS`)
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

      // Launch Bay Badge (`P1` .. `P6`) in Top-Right Corner of Selected Card
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

      // Hit Area (`204x214`, well above `64x64px`)
      const hit = this.add
        .zone(0, 0, cardW + 6, cardH + 6)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      cardContainer.add(hit);

      hit.on('pointerdown', () => {
        const existingIdx = this.selectedAstronautIds.indexOf(spec.id);
        if (existingIdx !== -1) {
          // Enforce minimum 2 players
          if (this.selectedAstronautIds.length <= 2) {
            StarshipAudio.playUiChirp(320, 260);
            Juice.popFloatingLabel(this, cx, cy - 40, 'MIN 2 ASTRONAUTS!', '#f59e0b');
            return;
          }
          this.selectedAstronautIds.splice(existingIdx, 1);
          StarshipAudio.playLobbyToggle(false, existingIdx);
          this.openPreFlightLobby(false);
        } else {
          // Enforce maximum 6 players
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

    // Row 1 (5 astronauts: Wyatt, Emma, Robert, Rita, Papa)
    const row1Xs = [196, 418, 640, 862, 1084];
    row1Specs.forEach((spec, idx) => {
      renderRosterCard(spec, row1Xs[idx], panelY + 198);
    });

    // Row 2 (4 astronauts: Nana, Grandpa, Babci, Guest)
    const row2Xs = [307, 529, 751, 973];
    row2Specs.forEach((spec, idx) => {
      renderRosterCard(spec, row2Xs[idx], panelY + 422);
    });

    // -------------------------------------------------------------------------
    // BOTTOM CONTROL BAR: MISSION TRAJECTORY LENGTH TOGGLE + INITIATE LAUNCH
    // -------------------------------------------------------------------------
    const bottomY = panelY + 586;

    // 1. Quick Orbit (25 Pads) Toggle Button
    const isQuick = this.missionTotalPads === 25;
    const quickBtn = this.createTrajectoryToggleBtn(
      250,
      bottomY,
      360,
      64,
      '⚡ QUICK ORBIT (25 PADS)',
      'Fast Family Party • ~12 Minutes',
      isQuick,
      0x38bdf8,
      () => {
        if (this.missionTotalPads !== 25) {
          this.missionTotalPads = 25;
          StarshipAudio.playUiChirp(680, 1120);
          this.buildAndRenderOrbitalBoard(this.missionTotalPads);
          this.openPreFlightLobby(false);
        }
      }
    );

    // 2. Grand Odyssey (50 Pads) Toggle Button
    const isGrand = this.missionTotalPads === 50;
    const grandBtn = this.createTrajectoryToggleBtn(
      628,
      bottomY,
      360,
      64,
      '🚀 GRAND ODYSSEY (50 PADS)',
      'Epic Galactic Voyage • ~25 Minutes',
      isGrand,
      0xf59e0b,
      () => {
        if (this.missionTotalPads !== 50) {
          this.missionTotalPads = 50;
          StarshipAudio.playUiChirp(680, 1360);
          this.buildAndRenderOrbitalBoard(this.missionTotalPads);
          this.openPreFlightLobby(false);
        }
      }
    );

    // 3. Huge Glowing `[ 🚀 INITIATE LAUNCH SEQUENCE ]` Button
    const launchBtn = this.add.container(1026, bottomY);
    const lw = 384;
    const lh = 66;
    const lg = this.add.graphics();
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
      .text(0, 14, `LAUNCH ${this.selectedAstronautIds.length} ASTRONAUTS TO PAD 1`, {
        fontFamily: '"Segoe UI", "Fredoka", system-ui, sans-serif',
        fontSize: '11.5px',
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

  /**
   * Launches the mission from the Pre-Flight Lobby onto the 25-pad or 50-pad Orbital Hex Pathway!
   */
  private initiateMissionLaunch(): void {
    this.lobbyContainer.setVisible(false);
    this.victoryContainer.setVisible(false);
    this.victoryContainer.removeAll(true);

    // Build active player roster from `this.selectedAstronautIds`
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
    this.buildAndRenderOrbitalBoard(this.missionTotalPads);
    this.spawnPlayerBoardTokens();
    this.renderTopMissionHeader();

    StarshipAudio.playLaunchIgnition();
    Juice.burstStars(this, 640, 320, 28, [0x38bdf8, 0xf59e0b, 0xf472b6, 0x10b981]);

    StarshipAudio.playVoice('launch_sequence', () => {
      if (this.scenePhase !== 'LOBBY') {
        this.startPlayerTurn(0);
      }
    });

    // Also start the first player's turn promptly so the UI feels snappy and responsive
    this.time.delayedCall(650, () => {
      if (this.scenePhase === 'LOBBY') {
        this.startPlayerTurn(0);
      }
    });
  }

  // ===========================================================================
  // GOAL 4: THE HIGH-DEFINITION BOARD-FIRST TV LAYOUT (25 OR 50 HEX PADS)
  // ===========================================================================

  /**
   * Generates and renders the winding Candy Land-style Color-Coded Orbital Hex Pathway
   * (`25` or `50` pads) across `y: 74..486` so the entire board and all player tokens
   * remain 100% visible above the `y: 518..720` Telemetry Dock!
   */
  private buildAndRenderOrbitalBoard(totalPads: 25 | 50): void {
    this.boardContainer.removeAll(true);
    this.boardPads = [];

    const colorCycle: PadColorType[] = ['RED', 'BLUE', 'AMBER', 'EMERALD'];

    if (totalPads === 25) {
      // 3 sweeping serpentine orbital rows (9 + 8 + 8 = 25 pads)
      const rowCounts = [9, 8, 8];
      const rowYs = [442, 286, 132];
      let padIdx = 0;

      for (let r = 0; r < rowCounts.length; r++) {
        const count = rowCounts[r];
        const yBase = rowYs[r];
        for (let c = 0; c < count; c++) {
          const t = count === 1 ? 0.5 : c / (count - 1);
          const dirT = r % 2 === 0 ? t : 1 - t;
          const x = Math.round(118 + dirT * 1044);
          const waveY = Math.round(yBase + Math.sin(dirT * Math.PI * 2) * 18);

          let padColor: PadColorType = colorCycle[padIdx % 4];
          if (padIdx === 6 || padIdx === 13 || padIdx === 20 || padIdx === 24) {
            padColor = 'RAINBOW';
          }

          let special: SpecialTileType = 'NONE';
          let wormholeTargetIndex: number | undefined;
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

          this.boardPads.push({
            index: padIdx,
            numberLabel: padIdx + 1,
            x,
            y: waveY,
            padColor,
            special,
            wormholeTargetIndex
          });
          padIdx++;
        }
      }
    } else {
      // 50-Pad Grand Odyssey (4 serpentine orbital tiers: 13 + 13 + 12 + 12 = 50 pads)
      const rowCounts = [13, 13, 12, 12];
      const rowYs = [455, 344, 232, 118];
      let padIdx = 0;

      for (let r = 0; r < rowCounts.length; r++) {
        const count = rowCounts[r];
        const yBase = rowYs[r];
        for (let c = 0; c < count; c++) {
          const t = count === 1 ? 0.5 : c / (count - 1);
          const dirT = r % 2 === 0 ? t : 1 - t;
          const x = Math.round(102 + dirT * 1076);
          const waveY = Math.round(yBase + Math.sin(dirT * Math.PI * 2.5) * 12);

          let padColor: PadColorType = colorCycle[padIdx % 4];
          if (padIdx % 8 === 7 || padIdx === 49) {
            padColor = 'RAINBOW';
          }

          let special: SpecialTileType = 'NONE';
          let wormholeTargetIndex: number | undefined;
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

          this.boardPads.push({
            index: padIdx,
            numberLabel: padIdx + 1,
            x,
            y: waveY,
            padColor,
            special,
            wormholeTargetIndex
          });
          padIdx++;
        }
      }
    }

    // 1. Draw glowing titanium & plasma orbital spline track connecting Pad 1 -> Final Citadel
    const trackG = this.add.graphics();
    for (let i = 0; i < this.boardPads.length - 1; i++) {
      const pA = this.boardPads[i];
      const pB = this.boardPads[i + 1];
      // Outer plasma halo
      trackG.lineStyle(12, 0x38bdf8, 0.18);
      trackG.lineBetween(pA.x, pA.y, pB.x, pB.y);
      // Carbon-fiber titanium rail
      trackG.lineStyle(6, 0x1e293b, 0.92);
      trackG.lineBetween(pA.x, pA.y, pB.x, pB.y);
      // Inner FICSIT telemetry filament
      trackG.lineStyle(2, 0x94a3b8, 0.75);
      trackG.lineBetween(pA.x, pA.y, pB.x, pB.y);
    }

    // 2. Draw glowing Hyperloop Wormhole plasma shortcut tubes (`+5` spaces)
    for (const pad of this.boardPads) {
      if (pad.special === 'WORMHOLE' && typeof pad.wormholeTargetIndex === 'number') {
        const dst = this.boardPads[pad.wormholeTargetIndex];
        if (dst) {
          const midX = (pad.x + dst.x) / 2;
          const midY = Math.min(pad.y, dst.y) - 48;
          const curve = new Phaser.Curves.QuadraticBezier(
            new Phaser.Math.Vector2(pad.x, pad.y),
            new Phaser.Math.Vector2(midX, midY),
            new Phaser.Math.Vector2(dst.x, dst.y)
          );
          const pts = curve.getPoints(28);
          trackG.lineStyle(9, 0x22d3ee, 0.28);
          trackG.strokePoints(pts, false);
          trackG.lineStyle(3.5, 0xa855f7, 0.85);
          trackG.strokePoints(pts, false);
          trackG.lineStyle(1.5, 0xffffff, 0.9);
          trackG.strokePoints(pts, false);
        }
      }
    }
    this.boardContainer.add(trackG);

    // 3. Render each Hexagonal Carbon-Fiber & Neon Telemetry Pad
    const hexRadius = totalPads === 25 ? 29 : 22;
    for (const pad of this.boardPads) {
      const padNode = this.add.container(pad.x, pad.y);
      const pg = this.add.graphics();
      const cSpec = PAD_COLOR_HEX[pad.padColor];

      const isMilestone = pad.special !== 'NONE';
      const r = isMilestone ? hexRadius * 1.16 : hexRadius;

      // Drop shadow + outer neon bloom
      pg.fillStyle(0x020617, 0.72);
      this.drawFlatTopHexagon(pg, 2, 4, r + 3, true);
      pg.lineStyle(isMilestone ? 4.5 : 2.5, cSpec.rim, isMilestone ? 0.95 : 0.8);
      this.drawFlatTopHexagon(pg, 0, 0, r + 2, false);

      // Hex inner fill
      pg.fillStyle(cSpec.fill, 0.95);
      this.drawFlatTopHexagon(pg, 0, 0, r, true);

      // Brushed titanium inner bevel ring
      pg.lineStyle(1.5, 0xffffff, 0.45);
      this.drawFlatTopHexagon(pg, 0, 0, r - 4, false);
      padNode.add(pg);

      // Special Tile Icon + Callout Badge
      if (pad.special === 'LAUNCHPAD') {
        const lbl = this.add
          .text(0, -2, '🚀 1', {
            fontFamily: '"Segoe UI", "Fredoka", sans-serif',
            fontSize: totalPads === 25 ? '13px' : '11px',
            fontStyle: 'bold',
            color: '#ffffff'
          })
          .setOrigin(0.5);
        const tag = this.add
          .text(0, r + 11, 'STARBASE PAD 1', {
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
          .image(0, 0, 'starship-smooth-glow')
          .setDisplaySize(130, 130)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.75);
        const lbl = this.add
          .text(0, -2, '🦄🏆', {
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
          .text(0, -4, '🌀', { fontSize: totalPads === 25 ? '16px' : '13px' })
          .setOrigin(0.5);
        const sub = this.add
          .text(0, 10, '+5 WARP', {
            fontFamily: '"Segoe UI", "Fredoka", sans-serif',
            fontSize: '8.5px',
            fontStyle: 'bold',
            color: '#67e8f9',
            stroke: '#020617',
            strokeThickness: 2
          })
          .setOrigin(0.5);
        padNode.add([lbl, sub]);
      } else if (pad.special === 'OVERCLOCK') {
        const lbl = this.add
          .text(0, -4, '⚡', { fontSize: totalPads === 25 ? '16px' : '13px' })
          .setOrigin(0.5);
        const sub = this.add
          .text(0, 10, '+3 BOOST', {
            fontFamily: '"Segoe UI", "Fredoka", sans-serif',
            fontSize: '8.5px',
            fontStyle: 'bold',
            color: '#fde047',
            stroke: '#020617',
            strokeThickness: 2
          })
          .setOrigin(0.5);
        padNode.add([lbl, sub]);
      } else if (pad.special === 'ASTEROID') {
        const lbl = this.add
          .text(0, -4, '☄️', { fontSize: totalPads === 25 ? '15px' : '12px' })
          .setOrigin(0.5);
        const sub = this.add
          .text(0, 10, '-2 WELL', {
            fontFamily: '"Segoe UI", "Fredoka", sans-serif',
            fontSize: '8.5px',
            fontStyle: 'bold',
            color: '#fca5a5',
            stroke: '#020617',
            strokeThickness: 2
          })
          .setOrigin(0.5);
        padNode.add([lbl, sub]);
      } else if (pad.special === 'RAINBOW_STARSHIP') {
        const lbl = this.add
          .text(0, -4, '🦄', { fontSize: totalPads === 25 ? '16px' : '13px' })
          .setOrigin(0.5);
        const sub = this.add
          .text(0, 10, 'RAINBOW', {
            fontFamily: '"Segoe UI", "Fredoka", sans-serif',
            fontSize: '8.5px',
            fontStyle: 'bold',
            color: '#f5d0fe',
            stroke: '#020617',
            strokeThickness: 2
          })
          .setOrigin(0.5);
        padNode.add([lbl, sub]);
      } else {
        const numTxt = this.add
          .text(0, 0, `${pad.numberLabel}`, {
            fontFamily: '"Segoe UI", "Fredoka", sans-serif',
            fontSize: totalPads === 25 ? '13px' : '10.5px',
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

  private drawFlatTopHexagon(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    radius: number,
    fill: boolean
  ): void {
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 6; i++) {
      const angleRad = Phaser.Math.DegToRad(60 * i);
      pts.push(
        new Phaser.Geom.Point(
          cx + radius * Math.cos(angleRad),
          cy + radius * Math.sin(angleRad * 0.88) // slight perspective foreshortening
        )
      );
    }
    if (fill) {
      g.fillPoints(pts, true);
    } else {
      g.strokePoints(pts, true);
    }
  }

  /**
   * Spawns the circular photorealistic 3D spacesuit tokens (`starship-token-<id>`)
   * with glowing neon player bay rings (`P1`–`P6`) on Pad 1.
   */
  private spawnPlayerBoardTokens(): void {
    this.tokensContainer.removeAll(true);

    this.activeHighlightRing = this.add.graphics();
    this.tokensContainer.add(this.activeHighlightRing);

    const tokenDiameter = this.missionTotalPads === 25 ? 50 : 42;

    this.players.forEach((player, idx) => {
      const pos = this.computeTokenWorldPosition(player.padIndex, idx);
      const c = this.add.container(pos.x, pos.y);

      // Glowing neon player ring around the 3D titanium token
      const ring = this.add.graphics();
      ring.fillStyle(0x020617, 0.75);
      ring.fillCircle(0, 3, tokenDiameter / 2 + 4);
      ring.lineStyle(3.5, player.bay.color, 1);
      ring.strokeCircle(0, 0, tokenDiameter / 2 + 2);
      c.add(ring);

      const tokKey = `starship-token-${player.roster.id}`;
      if (this.textures.exists(tokKey)) {
        this.textures.get(tokKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
        const tokImg = this.add
          .image(0, 0, tokKey)
          .setOrigin(0.5, 0.5)
          .setDisplaySize(tokenDiameter, tokenDiameter);
        c.add(tokImg);
      }

      // Floating `P1: WYATT` tag pill beneath token
      const tagG = this.add.graphics();
      tagG.fillStyle(0x090f1d, 0.92);
      tagG.fillRoundedRect(-30, tokenDiameter / 2 - 4, 60, 15, 5);
      tagG.lineStyle(1.2, player.bay.color, 0.95);
      tagG.strokeRoundedRect(-30, tokenDiameter / 2 - 4, 60, 15, 5);
      const tagTxt = this.add
        .text(0, tokenDiameter / 2 + 3.5, `${player.bay.slotLabel} ${player.roster.name}`, {
          fontFamily: '"Segoe UI", "Fredoka", sans-serif',
          fontSize: '8.5px',
          fontStyle: 'bold',
          color: '#ffffff'
        })
        .setOrigin(0.5);
      c.add([tagG, tagTxt]);

      player.tokenContainer = c;
      player.tokenRing = ring;
      this.tokensContainer.add(c);
    });
  }

  /**
   * Computes a clean offset when multiple astronaut tokens share the same pad so every
   * spacesuit face remains visible.
   */
  private computeTokenWorldPosition(padIndex: number, playerSlotIdx: number): { x: number; y: number } {
    const clampedIdx = Phaser.Math.Clamp(padIndex, 0, this.boardPads.length - 1);
    const pad = this.boardPads[clampedIdx] ?? { x: 140, y: 440 };

    const occupants = this.players
      .map((p, idx) => ({ p, idx }))
      .filter((item) => item.p.padIndex === clampedIdx);

    if (occupants.length <= 1) {
      return { x: pad.x, y: pad.y - 10 };
    }

    const myOrder = occupants.findIndex((item) => item.idx === playerSlotIdx);
    const angle = (myOrder / occupants.length) * Math.PI * 2 - Math.PI / 2;
    const spreadRadius = occupants.length <= 3 ? 15 : 20;
    return {
      x: Math.round(pad.x + Math.cos(angle) * spreadRadius),
      y: Math.round(pad.y - 10 + Math.sin(angle) * (spreadRadius * 0.72))
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
        duration: 180,
        ease: 'Quad.easeOut'
      });
      p.tokenContainer.setDepth(idx === this.activePlayerIndex ? 30 : 20 + idx);
    });

    // Pulse highlight beacon beneath active astronaut token
    const activePlayer = this.players[this.activePlayerIndex];
    if (activePlayer && activePlayer.tokenContainer && this.activeHighlightRing) {
      this.activeHighlightRing.clear();
      this.activeHighlightRing.lineStyle(3, activePlayer.bay.color, 0.9);
      this.activeHighlightRing.strokeCircle(0, 0, 34);
      this.activeHighlightRing.setPosition(
        activePlayer.tokenContainer.x,
        activePlayer.tokenContainer.y
      );
    }
  }

  // ===========================================================================
  // GOAL 5: TURN LOOP — PHASE 1: AGE-ADAPTIVE TELEMETRY TRIVIA CHALLENGE
  // ===========================================================================

  private startPlayerTurn(playerIndex: number): void {
    if (this.players.length === 0) return;
    this.activePlayerIndex = playerIndex % this.players.length;
    this.scenePhase = 'TRIVIA';
    this.lastAnswerWasOverclock = false;
    this.pendingColorWarpBonus = false;
    this.isRollingDice = false;

    const activePlayer = this.players[this.activePlayerIndex];
    this.renderTopMissionHeader();
    this.refreshAllTokenOffsets();

    // Pull a non-repeating question tailored to `activePlayer.roster.tier` (`ADULT`, `WYATT_4YO`, `EMMA_3YO`)
    this.currentQuestion = this.drawNonRepeatingQuestion(activePlayer.roster.tier);

    // Announce active player's turn with personalized ElevenLabs voice clip
    StarshipAudio.playTriviaRevealShimmer();
    StarshipAudio.playVoice(activePlayer.roster.turnVoice);

    this.renderTelemetryTriviaDock(activePlayer, this.currentQuestion);
  }

  private drawNonRepeatingQuestion(tier: TriviaProfileTier): TriviaQuestionItem {
    const pool = TRIVIA_BANK.questions[tier] ?? TRIVIA_BANK.questions.ADULT;
    const unasked = pool.filter((q) => !this.askedQuestionIds.has(q.id));
    const candidatePool = unasked.length > 0 ? unasked : pool;

    // If all questions in this tier were exhausted in a marathon session, reset only this tier's history
    if (unasked.length === 0) {
      pool.forEach((q) => this.askedQuestionIds.delete(q.id));
    }

    const picked = Phaser.Utils.Array.GetRandom(candidatePool);
    this.askedQuestionIds.add(picked.id);
    return picked;
  }

  /**
   * Renders the sleek glassmorphic Telemetry Trivia Panel + 4 Giant Color-Coded Tablet Answer Pads
   * (`[ A: RED ]`, `[ B: BLUE ]`, `[ C: AMBER ]`, `[ D: EMERALD ]`) inside the bottom dock (`y: 516..716`)
   * while keeping the entire cosmic board & astronaut tokens visible above!
   */
  private renderTelemetryTriviaDock(
    player: ActiveAstronautPlayer,
    question: TriviaQuestionItem
  ): void {
    this.dockContainer.removeAll(true);

    const dockY = 514;
    const dockH = 202;

    // 1. Sleek SpaceX Crew Dragon Glassmorphic Dock Frame (`1256 x 198`)
    const g = this.add.graphics();
    g.fillStyle(0x060c1a, 0.94);
    g.fillRoundedRect(12, dockY, 1256, dockH, 18);
    g.lineStyle(2.5, player.bay.color, 0.92);
    g.strokeRoundedRect(12, dockY, 1256, dockH, 18);
    g.lineStyle(1, 0xffffff, 0.22);
    g.strokeRoundedRect(16, dockY + 4, 1248, dockH - 8, 15);
    this.dockContainer.add(g);

    // 2. Left Astronaut Telemetry Avatar & Callsign Card (`x: 24..234`)
    const portraitBox = this.add.container(128, dockY + 101);
    const pbG = this.add.graphics();
    pbG.fillStyle(0x0f172a, 0.96);
    pbG.fillRoundedRect(-98, -86, 196, 172, 14);
    pbG.lineStyle(2, player.bay.color, 0.9);
    pbG.strokeRoundedRect(-98, -86, 196, 172, 14);
    portraitBox.add(pbG);

    const astroKey = `starship-astro-${player.roster.id}`;
    if (this.textures.exists(astroKey)) {
      this.textures.get(astroKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
      const astroImg = this.add
        .image(0, -18, astroKey)
        .setOrigin(0.5, 0.5)
        .setDisplaySize(114, 114);
      portraitBox.add(astroImg);
    }

    const bayBadgeTxt = this.add
      .text(0, 50, `${player.bay.slotLabel} • ${player.roster.callsign}`, {
        fontFamily: '"Segoe UI", "Fredoka", sans-serif',
        fontSize: '11.5px',
        fontStyle: 'bold',
        color: player.bay.hex
      })
      .setOrigin(0.5);

    const tierBadgeTxt = this.add
      .text(
        0,
        68,
        player.roster.tier === 'EMMA_3YO'
          ? '★ EMMA 3YO VISUAL MODE'
          : player.roster.tier === 'WYATT_4YO'
          ? '★ WYATT 4YO RANGER MODE'
          : `★ ${question.category.toUpperCase()}`,
        {
          fontFamily: '"Segoe UI", "Fredoka", sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#fde047'
        }
      )
      .setOrigin(0.5);
    portraitBox.add([bayBadgeTxt, tierBadgeTxt]);
    this.dockContainer.add(portraitBox);

    // 3. Upper-Right Question Prompt Bar (`x: 240..1250, y: dockY + 10 .. dockY + 86`)
    const promptG = this.add.graphics();
    promptG.fillStyle(0x0f1b33, 0.95);
    promptG.fillRoundedRect(238, dockY + 12, 842, 74, 12);
    promptG.lineStyle(1.5, 0x38bdf8, 0.65);
    promptG.strokeRoundedRect(238, dockY + 12, 842, 74, 12);
    this.dockContainer.add(promptG);

    const isKidTier = player.roster.tier !== 'ADULT';
    const promptTxt = this.add
      .text(659, dockY + 49, question.prompt, {
        fontFamily: '"Segoe UI", "Fredoka", system-ui, sans-serif',
        fontSize: isKidTier ? '18.5px' : question.prompt.length > 95 ? '15.5px' : '17px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 810 }
      })
      .setOrigin(0.5);
    this.dockContainer.add(promptTxt);

    // Read-Aloud `[ 🔊 READ ]` Button & `[ SKIP ➔ ]` Button on far right of Prompt Bar (`x: 1090..1254`)
    const readBtn = this.createSleekHeaderButton(
      1168,
      dockY + 30,
      154,
      34,
      '🔊 READ QUESTION',
      0x38bdf8,
      () => {
        StarshipAudio.speakQuestionText(question.prompt);
      }
    );
    const skipBtn = this.createSleekHeaderButton(
      1168,
      dockY + 68,
      154,
      32,
      'SKIP TO ROLL ➔',
      0x94a3b8,
      () => {
        this.handleTriviaSelection(-1, question);
      }
    );
    this.dockContainer.add([readBtn, skipBtn]);

    // 4. Four Giant Color-Coded Tablet Answer Pads (`[ A: RED ]`, `[ B: BLUE ]`, `[ C: AMBER ]`, `[ D: EMERALD ]`)
    const padWidth = 244;
    const padHeight = 96;
    const padY = dockY + 144;
    const padXs = [362, 614, 866, 1118];

    question.options.forEach((optText, optIdx) => {
      const spec = OPTION_PAD_COLORS[optIdx];
      const px = padXs[optIdx];

      const padBtn = this.add.container(px, padY);
      const bg = this.add.graphics();
      // Drop shadow
      bg.fillStyle(0x020617, 0.75);
      bg.fillRoundedRect(-padWidth / 2 + 2, -padHeight / 2 + 3, padWidth, padHeight, 14);
      // Vibrant colored controller pad body
      bg.fillStyle(spec.bgFill, 0.96);
      bg.fillRoundedRect(-padWidth / 2, -padHeight / 2, padWidth, padHeight, 14);
      bg.lineStyle(3, spec.rimColor, 1);
      bg.strokeRoundedRect(-padWidth / 2, -padHeight / 2, padWidth, padHeight, 14);
      bg.lineStyle(1, 0xffffff, 0.35);
      bg.strokeRoundedRect(-padWidth / 2 + 4, -padHeight / 2 + 4, padWidth - 8, padHeight - 8, 11);

      // Top-left `[ A: RED ]` telemetry pill
      bg.fillStyle(0x020617, 0.68);
      bg.fillRoundedRect(-padWidth / 2 + 8, -padHeight / 2 + 7, 88, 20, 6);
      const badgeLbl = this.add
        .text(-padWidth / 2 + 52, -padHeight / 2 + 17, `[ ${spec.letter}: ${spec.name} ]`, {
          fontFamily: '"Segoe UI", "Fredoka", sans-serif',
          fontSize: '10.5px',
          fontStyle: 'bold',
          color: spec.hexText
        })
        .setOrigin(0.5);

      // Option text (extra-large for Emma 3YO visual emoji buttons & Wyatt 4YO buttons!)
      const optFontSize =
        player.roster.tier === 'EMMA_3YO'
          ? '21px'
          : player.roster.tier === 'WYATT_4YO'
          ? '17.5px'
          : optText.length > 26
          ? '14px'
          : '16px';

      const optLbl = this.add
        .text(0, 10, optText, {
          fontFamily: '"Segoe UI", "Fredoka", system-ui, sans-serif',
          fontSize: optFontSize,
          fontStyle: 'bold',
          color: '#ffffff',
          align: 'center',
          wordWrap: { width: padWidth - 20 }
        })
        .setOrigin(0.5);

      padBtn.add([bg, badgeLbl, optLbl]);

      const hit = this.add
        .zone(0, 0, padWidth, padHeight)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      padBtn.add(hit);

      hit.on('pointerdown', () => {
        if (this.scenePhase !== 'TRIVIA') return;
        StarshipAudio.playPadLockIn(optIdx);
        Juice.squashAndStretch(this, padBtn, 0.14, 130);
        this.handleTriviaSelection(optIdx, question);
      });

      this.dockContainer.add(padBtn);
    });

    // Slide the Telemetry Dock smoothly into view
    this.dockContainer.y = 40;
    this.tweens.add({
      targets: this.dockContainer,
      y: 0,
      duration: 220,
      ease: 'Cubic.easeOut'
    });
  }

  /**
   * Evaluates the selected trivia answer:
   * - Correct Answer (`OVERCLOCK ENGAGED!`): Unlocks Twin Turbo Booster Dice (`2–10` spaces +
   *   35% chance of Color Synchronization Warp Bonus to the next matching color pad!).
   * - Incorrect Answer / Skip: Zero penalty lockout! Briefly shows the right answer and unlocks
   *   the Standard Single Thruster Die (`1–4` spaces).
   */
  private handleTriviaSelection(chosenIndex: number, question: TriviaQuestionItem): void {
    if (this.scenePhase !== 'TRIVIA') return;
    this.scenePhase = 'DICE_ROLL';

    const activePlayer = this.players[this.activePlayerIndex];
    const isCorrect = chosenIndex === question.correctIndex;

    if (isCorrect) {
      this.lastAnswerWasOverclock = true;
      this.lastChosenPadColor = OPTION_PAD_COLORS[chosenIndex]?.padColor ?? 'RED';
      // 38% chance of triggering a Color Synchronization Warp Bonus on top of the Twin Booster Dice!
      this.pendingColorWarpBonus = Math.random() < 0.38;
      activePlayer.overclockCount++;
      activePlayer.correctCount++;

      StarshipAudio.playOverclockFanfare();
      StarshipAudio.playVoice('overclock_engaged');
      Juice.burstStars(this, 640, 560, 22, [0xfde047, 0x38bdf8, 0x10b981, 0xffffff]);
    } else {
      this.lastAnswerWasOverclock = false;
      this.pendingColorWarpBonus = false;
      StarshipAudio.playStandardThrusterTone();
      StarshipAudio.playVoice('standard_thruster');
    }

    const correctOptionText = question.options[question.correctIndex];
    this.renderOrbitalDiceRollDock(activePlayer, isCorrect, correctOptionText);
  }

  // ===========================================================================
  // GOAL 5: TURN LOOP — PHASE 2: HIGH-TECH 3D TITANIUM & PLASMA ORBITAL DICE
  // ===========================================================================

  private renderOrbitalDiceRollDock(
    player: ActiveAstronautPlayer,
    isOverclock: boolean,
    correctAnswerText: string
  ): void {
    this.dockContainer.removeAll(true);
    const dockY = 514;
    const dockH = 202;

    const g = this.add.graphics();
    g.fillStyle(0x060c1a, 0.95);
    g.fillRoundedRect(12, dockY, 1256, dockH, 18);
    g.lineStyle(3, isOverclock ? 0xf59e0b : player.bay.color, 0.96);
    g.strokeRoundedRect(12, dockY, 1256, dockH, 18);
    this.dockContainer.add(g);

    // 1. Left Astronaut Portrait Card
    const portraitBox = this.add.container(128, dockY + 101);
    const pbG = this.add.graphics();
    pbG.fillStyle(0x0f172a, 0.96);
    pbG.fillRoundedRect(-98, -86, 196, 172, 14);
    pbG.lineStyle(2, isOverclock ? 0xf59e0b : player.bay.color, 0.95);
    pbG.strokeRoundedRect(-98, -86, 196, 172, 14);
    portraitBox.add(pbG);

    const astroKey = `starship-astro-${player.roster.id}`;
    if (this.textures.exists(astroKey)) {
      const astroImg = this.add
        .image(0, -18, astroKey)
        .setOrigin(0.5, 0.5)
        .setDisplaySize(114, 114);
      portraitBox.add(astroImg);
    }

    const statusBadge = this.add
      .text(0, 54, isOverclock ? '⚡ OVERCLOCK ENGAGED!' : '🚀 THRUSTER READY', {
        fontFamily: '"Segoe UI", "Fredoka", sans-serif',
        fontSize: '11.5px',
        fontStyle: 'bold',
        color: isOverclock ? '#fde047' : '#38bdf8'
      })
      .setOrigin(0.5);
    portraitBox.add(statusBadge);
    this.dockContainer.add(portraitBox);

    // 2. Center Telemetry Status Banner (`x: 245..735`)
    const bannerG = this.add.graphics();
    bannerG.fillStyle(isOverclock ? 0x451a03 : 0x0f1b33, 0.92);
    bannerG.fillRoundedRect(242, dockY + 20, 488, 162, 14);
    bannerG.lineStyle(2, isOverclock ? 0xfbbf24 : 0x38bdf8, 0.85);
    bannerG.strokeRoundedRect(242, dockY + 20, 488, 162, 14);
    this.dockContainer.add(bannerG);

    const headline = this.add
      .text(
        486,
        dockY + 52,
        isOverclock
          ? '⚡ TWIN TURBO BOOSTER DICE UNLOCKED!'
          : '🚀 STANDARD ORBITAL THRUSTER ENGAGED!',
        {
          fontFamily: '"Segoe UI", "Fredoka", system-ui, sans-serif',
          fontSize: '18px',
          fontStyle: 'bold',
          color: isOverclock ? '#fde047' : '#38bdf8'
        }
      )
      .setOrigin(0.5);

    const answerFeedback = this.add
      .text(
        486,
        dockY + 92,
        isOverclock
          ? `Correct Answer: ${correctAnswerText}`
          : `Answer: ${correctAnswerText} — No penalty! Roll to advance!`,
        {
          fontFamily: '"Segoe UI", "Fredoka", system-ui, sans-serif',
          fontSize: '14.5px',
          fontStyle: 'bold',
          color: '#f8fafc',
          align: 'center',
          wordWrap: { width: 455 }
        }
      )
      .setOrigin(0.5);

    const subTelemetry = this.add
      .text(
        486,
        dockY + 144,
        isOverclock
          ? this.pendingColorWarpBonus
            ? `🎲 Roll 2 Booster Dice (2–10 Spaces) + 🌟 ${this.lastChosenPadColor} COLOR WARP BONUS!`
            : '🎲 Roll 2 Booster Dice (Advance 2–10 Orbital Pads!)'
          : '🎲 Roll Single Thruster Die (Advance 1–4 Orbital Pads!)',
        {
          fontFamily: '"Segoe UI", "Fredoka", system-ui, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: isOverclock ? '#6ee7b7' : '#bae6fd'
        }
      )
      .setOrigin(0.5);

    this.dockContainer.add([headline, answerFeedback, subTelemetry]);

    // 3. Interactive 3D-Shaded Titanium & Holographic Plasma Dice + `[ 🎲 ENGAGE THRUSTER ROLL ]` Button
    const die1 = this.create3DTitaniumDie(isOverclock ? 805 : 855, dockY + 101, 5, isOverclock ? 0xf59e0b : 0x38bdf8);
    this.dockContainer.add(die1.container);

    let die2: { container: Phaser.GameObjects.Container; drawFace: (val: number) => void } | null = null;
    if (isOverclock) {
      die2 = this.create3DTitaniumDie(915, dockY + 101, 5, 0x38bdf8);
      this.dockContainer.add(die2.container);
    }

    const rollBtn = this.add.container(1118, dockY + 101);
    const rw = 248;
    const rh = 128;
    const rg = this.add.graphics();
    rg.fillStyle(isOverclock ? 0xd97706 : 0x0284c7, 1);
    rg.fillRoundedRect(-rw / 2, -rh / 2, rw, rh, 18);
    rg.lineStyle(3.5, 0xffffff, 0.95);
    rg.strokeRoundedRect(-rw / 2, -rh / 2, rw, rh, 18);

    const rollTitle = this.add
      .text(0, -14, '🎲 ENGAGE\nTHRUSTER ROLL', {
        fontFamily: '"Segoe UI", "Fredoka", system-ui, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
        stroke: '#020617',
        strokeThickness: 3
      })
      .setOrigin(0.5);

    const rollSub = this.add
      .text(0, 38, isOverclock ? 'TWIN BOOSTER (2–10)' : 'THRUSTER DIE (1–4)', {
        fontFamily: '"Segoe UI", "Fredoka", sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);

    rollBtn.add([rg, rollTitle, rollSub]);
    this.dockContainer.add(rollBtn);

    const triggerRoll = () => {
      if (this.isRollingDice || this.scenePhase !== 'DICE_ROLL') return;
      this.isRollingDice = true;
      this.execute3DOrbitalDiceRoll(player, isOverclock, die1, die2, subTelemetry);
    };

    Juice.makeTactileButton(this, rollBtn, rw, rh, triggerRoll, 'pop');
    Juice.makeTactileButton(this, die1.container, 96, 96, triggerRoll, 'pop');
    if (die2) {
      Juice.makeTactileButton(this, die2.container, 96, 96, triggerRoll, 'pop');
    }
  }

  /**
   * Builds a 3D-shaded Brushed-Titanium & Holographic Plasma Orbital Die.
   */
  private create3DTitaniumDie(
    x: number,
    y: number,
    initialValue: number,
    neonColor: number
  ): { container: Phaser.GameObjects.Container; drawFace: (val: number) => void } {
    const container = this.add.container(x, y);
    const g = this.add.graphics();
    const numTxt = this.add
      .text(0, 26, `${initialValue}`, {
        fontFamily: '"Segoe UI", "Fredoka", sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);

    const pipPositions: Record<number, Array<[number, number]>> = {
      1: [[0, -4]],
      2: [
        [-16, -18],
        [16, 10]
      ],
      3: [
        [-18, -20],
        [0, -4],
        [18, 12]
      ],
      4: [
        [-16, -18],
        [16, -18],
        [-16, 10],
        [16, 10]
      ],
      5: [
        [-18, -20],
        [18, -20],
        [0, -4],
        [-18, 12],
        [18, 12]
      ]
    };

    const drawFace = (val: number) => {
      const clamped = Phaser.Math.Clamp(val, 1, 5);
      g.clear();
      // 3D Titanium Lower Extrusion Bevel
      g.fillStyle(0x020617, 0.85);
      g.fillRoundedRect(-44, -42, 88, 88, 18);
      g.fillStyle(0x334155, 1);
      g.fillRoundedRect(-44, -46, 88, 88, 18);
      // Brushed-Titanium Upper Face
      g.fillStyle(0x0f172a, 0.98);
      g.fillRoundedRect(-40, -42, 80, 80, 15);
      g.lineStyle(3, neonColor, 1);
      g.strokeRoundedRect(-40, -42, 80, 80, 15);
      g.lineStyle(1, 0xffffff, 0.45);
      g.strokeRoundedRect(-36, -38, 72, 72, 12);

      // Glowing Holographic Plasma Pips
      const pts = pipPositions[clamped] ?? pipPositions[1];
      for (const [px, py] of pts) {
        g.fillStyle(neonColor, 0.35);
        g.fillCircle(px, py, 9.5);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(px, py, 5.5);
      }

      numTxt.setText(`+${clamped}`);
    };

    drawFace(initialValue);
    container.add([g, numTxt]);
    return { container, drawFace };
  }

  /**
   * Tumbles the 3D Orbital Die / Twin Booster Dice with spin physics, shockwave rings,
   * and telemetry readout, then hops the player's spacesuit token pad-by-pad!
   */
  private execute3DOrbitalDiceRoll(
    player: ActiveAstronautPlayer,
    isOverclock: boolean,
    die1: { container: Phaser.GameObjects.Container; drawFace: (val: number) => void },
    die2: { container: Phaser.GameObjects.Container; drawFace: (val: number) => void } | null,
    readoutText: Phaser.GameObjects.Text
  ): void {
    StarshipAudio.playDiceTumbleBurst();

    const finalVal1 = isOverclock ? Phaser.Math.Between(1, 5) : Phaser.Math.Between(1, 4);
    const finalVal2 = isOverclock ? Phaser.Math.Between(1, 5) : 0;
    const totalSteps = finalVal1 + finalVal2;

    // Tumble animation over 720ms
    let ticks = 0;
    this.time.addEvent({
      delay: 75,
      repeat: 8,
      callback: () => {
        ticks++;
        if (ticks <= 8) {
          die1.drawFace(Phaser.Math.Between(1, 5));
          die1.container.setAngle(Phaser.Math.Between(-22, 22));
          if (die2) {
            die2.drawFace(Phaser.Math.Between(1, 5));
            die2.container.setAngle(Phaser.Math.Between(-22, 22));
          }
        } else {
          die1.drawFace(finalVal1);
          die1.container.setAngle(0);
          Juice.squashAndStretch(this, die1.container, 0.22, 160);
          if (die2) {
            die2.drawFace(finalVal2);
            die2.container.setAngle(0);
            Juice.squashAndStretch(this, die2.container, 0.22, 160);
          }

          readoutText.setText(
            isOverclock
              ? `🚀 THRUSTER LOCK: ${finalVal1} + ${finalVal2} = ADVANCE +${totalSteps} PADS!`
              : `🚀 THRUSTER LOCK: ADVANCE +${totalSteps} PADS!`
          );
          readoutText.setColor('#fde047');

          Juice.burstStars(this, die1.container.x, die1.container.y, 16, [0x38bdf8, 0xfde047, 0xffffff]);

          this.time.delayedCall(340, () => {
            this.hopPlayerTokenSteps(player, totalSteps);
          });
        }
      }
    });
  }

  /**
   * Hops the active astronaut's 3D spacesuit token pad-by-pad along the orbital hex pathway
   * with jetpack exhaust particles, then evaluates Color Warp & Special Board Tiles!
   */
  private hopPlayerTokenSteps(player: ActiveAstronautPlayer, remainingSteps: number, stepCount = 0): void {
    this.scenePhase = 'MOVING';
    const maxPadIndex = this.boardPads.length - 1;

    if (remainingSteps <= 0 || player.padIndex >= maxPadIndex) {
      this.onPrimaryMovementComplete(player);
      return;
    }

    player.padIndex = Math.min(maxPadIndex, player.padIndex + 1);
    const nextPos = this.computeTokenWorldPosition(player.padIndex, this.activePlayerIndex);

    StarshipAudio.playTokenHop(stepCount);
    this.renderTopMissionHeader();

    if (player.tokenContainer) {
      // Spawn jetpack plasma exhaust puff at current token position
      this.spawnJetpackExhaust(player.tokenContainer.x, player.tokenContainer.y, player.bay.color);

      const startY = player.tokenContainer.y;
      const peakY = Math.min(startY, nextPos.y) - 26;

      this.tweens.add({
        targets: player.tokenContainer,
        x: nextPos.x,
        scaleX: { from: 1.15, to: 1.0 },
        scaleY: { from: 0.88, to: 1.0 },
        duration: 210,
        ease: 'Quad.easeOut'
      });

      this.tweens.add({
        targets: player.tokenContainer,
        y: peakY,
        duration: 105,
        yoyo: false,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (!player.tokenContainer) return;
          this.tweens.add({
            targets: player.tokenContainer,
            y: nextPos.y,
            duration: 105,
            ease: 'Quad.easeIn',
            onComplete: () => {
              this.refreshAllTokenOffsets();
              if (player.padIndex >= maxPadIndex) {
                this.triggerCitadelVictory(player);
              } else {
                this.hopPlayerTokenSteps(player, remainingSteps - 1, stepCount + 1);
              }
            }
          });
        }
      });
    } else {
      this.onPrimaryMovementComplete(player);
    }
  }

  private spawnJetpackExhaust(x: number, y: number, color: number): void {
    for (let i = 0; i < 4; i++) {
      const p = this.add
        .image(
          x + Phaser.Math.Between(-8, 8),
          y + Phaser.Math.Between(4, 14),
          'starship-flare-dot'
        )
        .setTint(i % 2 === 0 ? color : 0xfde047)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.32)
        .setDepth(24);

      this.tweens.add({
        targets: p,
        y: p.y + Phaser.Math.Between(14, 28),
        alpha: 0,
        scaleX: 0.05,
        scaleY: 0.05,
        duration: 320,
        onComplete: () => p.destroy()
      });
    }
  }

  /**
   * After dice hops finish:
   * 1. Check if `this.pendingColorWarpBonus` is active (warps forward to next matching color pad!).
   * 2. Check if the landed pad is a Special Board Tile (`WORMHOLE`, `OVERCLOCK`, `ASTEROID`, `RAINBOW_STARSHIP`, `CITADEL`).
   */
  private onPrimaryMovementComplete(player: ActiveAstronautPlayer): void {
    const maxPadIndex = this.boardPads.length - 1;
    if (player.padIndex >= maxPadIndex) {
      this.triggerCitadelVictory(player);
      return;
    }

    // 1. Optional Color Synchronization Warp Bonus (from Overclock!)
    if (this.pendingColorWarpBonus) {
      this.pendingColorWarpBonus = false;
      const nextMatchingPad = this.boardPads.find(
        (p) => p.index > player.padIndex && p.index < maxPadIndex && p.padColor === this.lastChosenPadColor
      );
      if (nextMatchingPad && nextMatchingPad.index - player.padIndex <= 6) {
        StarshipAudio.playWormholeWarp();
        StarshipAudio.playVoice('color_warp_bonus');
        if (player.tokenContainer) {
          Juice.popFloatingLabel(
            this,
            player.tokenContainer.x,
            player.tokenContainer.y - 36,
            `🌟 ${this.lastChosenPadColor} COLOR WARP!`,
            '#fde047'
          );
        }
        this.warpPlayerDirectlyToPad(player, nextMatchingPad.index, () => {
          this.evaluateLandedSpecialTile(player);
        });
        return;
      }
    }

    this.evaluateLandedSpecialTile(player);
  }

  /**
   * Evaluates Special Board Tiles right on the orbital pathway:
   * - `🌀 HYPERLOOP WORMHOLE`: Launches astronaut pod `+5` spaces along the plasma tube!
   * - `⚡ FICSIT OVERCLOCK PAD`: Instant `+3` spaces boost!
   * - `☄️ ASTEROID GRAVITY WELL`: Gently bumps back `-2` spaces with retro-burn sparks!
   * - `🦄 RAINBOW STARSHIP LAUNCH`: Warps straight to the next `RAINBOW` tile!
   */
  private evaluateLandedSpecialTile(player: ActiveAstronautPlayer): void {
    const maxPadIndex = this.boardPads.length - 1;
    if (player.padIndex >= maxPadIndex) {
      this.triggerCitadelVictory(player);
      return;
    }

    const landedPad = this.boardPads[player.padIndex];
    if (!landedPad || landedPad.special === 'NONE' || landedPad.special === 'LAUNCHPAD') {
      this.finishTurnAndAdvancePlayer(player);
      return;
    }

    const tx = player.tokenContainer?.x ?? landedPad.x;
    const ty = player.tokenContainer?.y ?? landedPad.y;

    if (landedPad.special === 'WORMHOLE') {
      const targetIdx = Math.min(maxPadIndex, landedPad.wormholeTargetIndex ?? player.padIndex + 5);
      StarshipAudio.playWormholeWarp();
      StarshipAudio.playVoice('tile_wormhole');
      Juice.popFloatingLabel(this, tx, ty - 38, '🌀 HYPERLOOP WORMHOLE +5!', '#22d3ee');
      Juice.burstStars(this, tx, ty, 20, [0x22d3ee, 0xa855f7, 0xffffff]);

      this.time.delayedCall(420, () => {
        this.warpPlayerDirectlyToPad(player, targetIdx, () => {
          this.finishTurnAndAdvancePlayer(player);
        });
      });
      return;
    }

    if (landedPad.special === 'OVERCLOCK') {
      const targetIdx = Math.min(maxPadIndex, player.padIndex + 3);
      StarshipAudio.playOverclockFanfare();
      StarshipAudio.playVoice('tile_overclock');
      Juice.popFloatingLabel(this, tx, ty - 38, '⚡ FICSIT OVERCLOCK +3!', '#fde047');
      Juice.burstStars(this, tx, ty, 18, [0xfde047, 0xf59e0b, 0xffffff]);

      this.time.delayedCall(420, () => {
        this.warpPlayerDirectlyToPad(player, targetIdx, () => {
          this.finishTurnAndAdvancePlayer(player);
        });
      });
      return;
    }

    if (landedPad.special === 'ASTEROID') {
      const targetIdx = Math.max(0, player.padIndex - 2);
      StarshipAudio.playAsteroidRetro();
      StarshipAudio.playVoice('tile_asteroid');
      Juice.popFloatingLabel(this, tx, ty - 38, '☄️ GRAVITY WELL -2 PADS!', '#fca5a5');
      Juice.burstStars(this, tx, ty, 14, [0xf87171, 0xfbbf24]);

      this.time.delayedCall(420, () => {
        this.warpPlayerDirectlyToPad(player, targetIdx, () => {
          this.finishTurnAndAdvancePlayer(player);
        });
      });
      return;
    }

    if (landedPad.special === 'RAINBOW_STARSHIP') {
      const nextRainbow = this.boardPads.find(
        (p) => p.index > player.padIndex && p.padColor === 'RAINBOW'
      );
      const targetIdx = nextRainbow ? nextRainbow.index : Math.min(maxPadIndex, player.padIndex + 4);
      StarshipAudio.playWormholeWarp();
      StarshipAudio.playVoice('tile_rainbow_starship');
      Juice.popFloatingLabel(this, tx, ty - 38, '🦄 RAINBOW STARSHIP WARP!', '#f0abfc');
      Juice.burstStars(this, tx, ty, 24, [0xf472b6, 0x38bdf8, 0xfde047, 0xa855f7]);

      this.time.delayedCall(420, () => {
        this.warpPlayerDirectlyToPad(player, targetIdx, () => {
          this.finishTurnAndAdvancePlayer(player);
        });
      });
      return;
    }

    this.finishTurnAndAdvancePlayer(player);
  }

  private warpPlayerDirectlyToPad(
    player: ActiveAstronautPlayer,
    targetPadIndex: number,
    onDone: () => void
  ): void {
    const maxPadIndex = this.boardPads.length - 1;
    player.padIndex = Phaser.Math.Clamp(targetPadIndex, 0, maxPadIndex);
    const destPos = this.computeTokenWorldPosition(player.padIndex, this.activePlayerIndex);
    this.renderTopMissionHeader();

    if (!player.tokenContainer) {
      onDone();
      return;
    }

    this.tweens.add({
      targets: player.tokenContainer,
      x: destPos.x,
      y: destPos.y,
      scaleX: { from: 1.35, to: 1.0 },
      scaleY: { from: 1.35, to: 1.0 },
      duration: 520,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.refreshAllTokenOffsets();
        if (player.padIndex >= maxPadIndex) {
          this.triggerCitadelVictory(player);
        } else {
          onDone();
        }
      }
    });
  }

  private finishTurnAndAdvancePlayer(player: ActiveAstronautPlayer): void {
    const maxPadIndex = this.boardPads.length - 1;
    if (player.padIndex >= maxPadIndex) {
      this.triggerCitadelVictory(player);
      return;
    }

    // If the astronaut is within 4 pads of the Citadel, announce final orbital approach!
    if (maxPadIndex - player.padIndex <= 4) {
      StarshipAudio.playVoice('almost_there');
    }

    this.time.delayedCall(900, () => {
      if (this.scenePhase === 'MOVING') {
        const nextIdx = (this.activePlayerIndex + 1) % this.players.length;
        this.startPlayerTurn(nextIdx);
      }
    });
  }

  // ===========================================================================
  // STATE 3: GALACTIC UNICORN CITADEL VICTORY CELEBRATION
  // ===========================================================================

  private triggerCitadelVictory(winner: ActiveAstronautPlayer): void {
    this.scenePhase = 'VICTORY';
    this.dockContainer.removeAll(true);
    this.victoryContainer.removeAll(true);
    this.victoryContainer.setVisible(true);

    // Award 5 Arcade stars!
    ArcadeState.addStars(5);

    StarshipAudio.playVictoryAnthem();
    StarshipAudio.playVoice(winner.roster.victoryVoice);

    // Celebratory starlight bursts across the cosmic sky
    Juice.burstStars(this, 640, 260, 36, [0xfde047, 0x38bdf8, 0xf472b6, 0x10b981, 0xffffff]);

    const scrim = this.add
      .rectangle(640, 360, 1280, 720, 0x020617, 0.78)
      .setInteractive();
    this.victoryContainer.add(scrim);

    const card = this.add.container(640, 368);
    this.victoryContainer.add(card);

    const cw = 840;
    const ch = 520;
    const cg = this.add.graphics();
    cg.fillStyle(0x091326, 0.97);
    cg.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 24);
    cg.lineStyle(4, winner.bay.color, 1);
    cg.strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 24);
    cg.lineStyle(2, 0xfde047, 0.85);
    cg.strokeRoundedRect(-cw / 2 + 8, -ch / 2 + 8, cw - 16, ch - 16, 19);
    card.add(cg);

    // Radiant glow behind champion portrait
    const glow = this.add
      .image(0, -65, 'starship-smooth-glow')
      .setDisplaySize(320, 320)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.75);
    card.add(glow);

    const cardTexKey = `starship-card-${winner.roster.id}`;
    if (this.textures.exists(cardTexKey)) {
      const winnerCard = this.add
        .image(0, -62, cardTexKey)
        .setOrigin(0.5, 0.5)
        .setDisplaySize(210, 236);
      card.add(winnerCard);
    }

    const crownHeader = this.add
      .text(0, -214, '🦄🏆 GALACTIC UNICORN CITADEL CHAMPION! 🏆🦄', {
        fontFamily: '"Segoe UI", "Fredoka", system-ui, sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#fde047',
        stroke: '#020617',
        strokeThickness: 4
      })
      .setOrigin(0.5);

    const winnerHeadline = this.add
      .text(0, 84, `${winner.bay.slotLabel}: ${winner.roster.callsign}`, {
        fontFamily: '"Segoe UI", "Fredoka", system-ui, sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#020617',
        strokeThickness: 4
      })
      .setOrigin(0.5);

    const statsLine = this.add
      .text(
        0,
        122,
        `Reached Pad ${this.missionTotalPads} • ${winner.overclockCount} FICSIT Overclocks • +5 Arcade Stars Earned!`,
        {
          fontFamily: '"Segoe UI", "Fredoka", system-ui, sans-serif',
          fontSize: '15px',
          fontStyle: 'bold',
          color: '#67e8f9'
        }
      )
      .setOrigin(0.5);

    card.add([crownHeader, winnerHeadline, statsLine]);

    // Play Again & Return to Hub Buttons
    const playAgainBtn = this.createTrajectoryToggleBtn(
      -185,
      194,
      320,
      64,
      '🚀 PLAY NEW MISSION',
      'Return to Mission Control Lobby',
      true,
      0x10b981,
      () => {
        this.victoryContainer.setVisible(false);
        this.openPreFlightLobby(false);
      }
    );

    const returnHubBtn = this.createTrajectoryToggleBtn(
      185,
      194,
      320,
      64,
      '🏠 RETURN TO ARCADE HUB',
      'Back to Heirloom Bookshelf',
      true,
      0xf59e0b,
      () => {
        StarshipAudio.stopVoice();
        StarshipAudio.stopAmbientStarbasePad();
        AudioBus.startCozyLoop();
        this.scene.start('HubScene');
      }
    );

    card.add([playAgainBtn, returnHubBtn]);
    card.setScale(0.84);
    this.tweens.add({
      targets: card,
      scaleX: 1,
      scaleY: 1,
      duration: 280,
      ease: 'Back.easeOut'
    });
  }
}
