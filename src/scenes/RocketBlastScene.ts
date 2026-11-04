import Phaser from 'phaser';
import { ArcadeState } from '../core/ArcadeState';
import { AudioBus } from '../core/AudioBus';
import { Juice } from '../core/Juice';
import { RocketAudioEngine } from '../audio/RocketAudioEngine';

type RocketMissionMode = 'STAR_HOPPER' | 'LUNAR_CADET' | 'COMMANDER';
type NumberOrderMode = 'SEQUENTIAL' | 'RANDOM';

type RocketGamePhase =
  | 'FUELING_PAD'
  | 'READY_TO_LAUNCH'
  | 'COUNTDOWN_SEQUENCE'
  | 'SPACE_ASCENT'
  | 'PLANETARY_LANDING';

type PlaceValueSlot = 'HUNDREDS' | 'TENS' | 'ONES';

interface SkyFuelStarActor {
  id: number;
  slot: PlaceValueSlot;
  unitValue: 1 | 10 | 100;
  baseX: number;
  baseY: number;
  bobPhase: number;
  container: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Image;
  sprite: Phaser.GameObjects.Image;
  badgeText: Phaser.GameObjects.Text;
  isBusy: boolean;
}

interface AscentCollectible {
  id: number;
  kind: 'star' | 'satellite';
  numberLabel: number;
  x: number;
  y: number;
  vy: number;
  collected: boolean;
  container: Phaser.GameObjects.Container;
}

interface StageTankUi {
  slot: PlaceValueSlot;
  unitValue: 1 | 10 | 100;
  stageSprite: Phaser.GameObjects.Image;
  windowGfx: Phaser.GameObjects.Graphics;
  readoutBadge: Phaser.GameObjects.Container;
  readoutText: Phaser.GameObjects.Text;
  statusIconText: Phaser.GameObjects.Text;
  valveContainer: Phaser.GameObjects.Container;
  valveSprite: Phaser.GameObjects.Image;
  valveAlertText: Phaser.GameObjects.Text;
  baseY: number;
}

const COLOR_HUNDREDS = 0x38bdf8; // Cyan / Sapphire (100s)
const COLOR_TENS = 0xfbbf24;     // Golden Amber (10s)
const COLOR_ONES = 0x34d399;     // Emerald / Starlight (1s)

const HEX_HUNDREDS = '#38bdf8';
const HEX_TENS = '#fbbf24';
const HEX_ONES = '#34d399';

const STAR_HOPPER_SEQ = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const LUNAR_CADET_SEQ = [12, 24, 35, 41, 53, 62, 74, 85, 96, 15, 28, 47, 63, 81, 99];
const COMMANDER_SEQ = [123, 245, 312, 431, 524, 615, 732, 841, 925, 108, 350, 462, 583, 719, 999];

/**
 * Rocket Number Blast (`RocketBlastScene.ts`)
 * ===========================================
 * A 32-bit Hi-Bit Pixel Art space rocketry & base-10 place-value math game
 * spanning numbers `1` through `999` for Wyatt (age 4) and Emma (age 3).
 *
 * Clean Stage Rule:
 * - `rocket-bg` is a 100% clean Cape Canaveral & Starlight Observatory night backdrop.
 * - All modular rocket stages (`rocket-stage-100`, `rocket-stage-10`, `rocket-stage-1`),
 *   retractable brass gantry tower, steam-whistle release valves, Big Red Ignition Lever,
 *   sky fuel stars, plasma beams, Astronaut Sparky, and Space-Helmet Doggie are live
 *   interactive Phaser layers.
 */
export class RocketBlastScene extends Phaser.Scene {
  private audio!: RocketAudioEngine;
  private phase: RocketGamePhase = 'FUELING_PAD';

  // Mission Mode & Sequential/Random Order State
  private missionMode: RocketMissionMode = 'COMMANDER';
  private orderMode: NumberOrderMode = 'SEQUENTIAL';
  private seqCursorByMode: Record<RocketMissionMode, number> = {
    STAR_HOPPER: 0,
    LUNAR_CADET: 0,
    COMMANDER: 0
  };

  // Target Number (1..999) & Decomposed Place-Value Targets
  private targetNumber = 342;
  private targetHundreds = 3; // 0..9
  private targetTens = 4;     // 0..9
  private targetOnes = 2;     // 0..10 (1..10 in STAR_HOPPER, 0..9 in 2/3-stage modes)

  // Current Loaded Fuel Units per Stage
  private loadedHundreds = 0;
  private loadedTens = 0;
  private loadedOnes = 0;
  private overFuelWarnedBySlot: Record<PlaceValueSlot, boolean> = {
    HUNDREDS: false,
    TENS: false,
    ONES: false
  };

  // Backdrop & Parallax Space Ascent Layers
  private launchpadBgImage!: Phaser.GameObjects.Image;
  private skyGradientGfx!: Phaser.GameObjects.Graphics;
  private ambientStars: Phaser.GameObjects.Image[] = [];
  private launchSmokeContainer!: Phaser.GameObjects.Container;
  private plasmaBeamGfx!: Phaser.GameObjects.Graphics;

  // Rocket Stack, Retractable Gantry & Stage Tank Views
  private rocketRootContainer!: Phaser.GameObjects.Container;
  private rocketEngineFlameGfx!: Phaser.GameObjects.Graphics;
  private gantrySprite!: Phaser.GameObjects.Image;
  private stageTanks: Partial<Record<PlaceValueSlot, StageTankUi>> = {};
  private separationRingContainer!: Phaser.GameObjects.Container;
  private separationRingLabel!: Phaser.GameObjects.Text;

  // Sky Fuel Star Spawners
  private skyStarsContainer!: Phaser.GameObjects.Container;
  private skyStars: SkyFuelStarActor[] = [];
  private nextStarId = 1;

  // Big Red Ignition Lever & Companions on Launchpad
  private ignitionContainer!: Phaser.GameObjects.Container;
  private ignitionSprite!: Phaser.GameObjects.Image;
  private ignitionBannerText!: Phaser.GameObjects.Text;
  private sparkySprite!: Phaser.GameObjects.Image;
  private doggieSprite!: Phaser.GameObjects.Image;

  // Top Split-Flap Mission Target Counter & HUD Controls
  private hudContainer!: Phaser.GameObjects.Container;
  private flapHundredsBox!: Phaser.GameObjects.Container;
  private flapTensBox!: Phaser.GameObjects.Container;
  private flapOnesBox!: Phaser.GameObjects.Container;
  private flapHundredsText!: Phaser.GameObjects.Text;
  private flapTensText!: Phaser.GameObjects.Text;
  private flapOnesText!: Phaser.GameObjects.Text;
  private loadedCounterText!: Phaser.GameObjects.Text;
  private comparisonSymbolText!: Phaser.GameObjects.Text;
  private missionHintBannerText!: Phaser.GameObjects.Text;
  private modeButtons: Map<RocketMissionMode, Phaser.GameObjects.Container> = new Map();
  private orderBtnLabel!: Phaser.GameObjects.Text;

  // Countdown Overlay
  private countdownContainer!: Phaser.GameObjects.Container;
  private countdownBigText!: Phaser.GameObjects.Text;

  // Playable Space Ascent State (`SPACE_ASCENT` phase)
  private ascentHudContainer!: Phaser.GameObjects.Container;
  private ascentAltitudeBarGfx!: Phaser.GameObjects.Graphics;
  private ascentZoneTitleText!: Phaser.GameObjects.Text;
  private ascentCollectiblesContainer!: Phaser.GameObjects.Container;
  private ascentCollectibles: AscentCollectible[] = [];
  private ascentProgress = 0; // 0..1
  private rocketTargetX = 640;
  private stage1Separated = false;
  private stage2Separated = false;
  private awaitingSeparationSlot: 'STAGE_100' | 'STAGE_10' | null = null;
  private separationAutoTimer: Phaser.Time.TimerEvent | null = null;
  private bonusStarsCollected = 0;

  // Planetary Touchdown Finale Modal (`PLANETARY_LANDING` phase)
  private landingContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'RocketBlastScene' });
  }

  public create(): void {
    this.audio = new RocketAudioEngine();
    this.phase = 'FUELING_PAD';

    // Default to Star Hopper (1-10) for Emma (age 3) and Commander (100-999) for Wyatt (age 4)
    const activeKid = ArcadeState.getActiveKid();
    this.missionMode = activeKid.id === 'emma' ? 'STAR_HOPPER' : 'COMMANDER';
    this.orderMode = 'SEQUENTIAL';

    this.applyNearestFilterToTextures();
    this.createStarlightLaunchpadBackdrop();
    this.createCompanionsAndIgnitionConsole();
    this.createRocketAndGantryContainer();
    this.createSkyStarsLayer();
    this.createTopSplitFlapHudAndModeBar();
    this.createCountdownAndAscentUi();
    this.createPlanetaryLandingContainer();
    this.setupSpaceSteeringInput();

    // Start first mission silently so HubScene's welcome_title.mp3 plays cleanly without overlap
    this.startNewMission(false);

    this.cameras.main.fadeIn(260, 8, 12, 28);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.audio.stopVoice();
    });
  }

  private applyNearestFilterToTextures(): void {
    const keys = [
      'rocket-bg',
      'rocket-stage-100',
      'rocket-stage-10',
      'rocket-stage-1',
      'gantry-tower',
      'steam-valve-lever',
      'ignition-lever',
      'astro-sparky',
      'astro-doggie',
      'fuel-core-100',
      'fuel-cluster-10',
      'fuel-gem-1',
      'bonus-satellite',
      'planet-cheese-moon',
      'planet-mars-saturn',
      'planet-crystal-nebula',
      'space-flag'
    ];
    for (const k of keys) {
      if (this.textures.exists(k)) {
        this.textures.get(k).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }
  }

  // ===========================================================================
  // 1. CLEAN-STAGE CAPE CANAVERAL / OBSERVATORY NIGHT LAUNCHPAD & SKY LAYERS
  // ===========================================================================

  private createStarlightLaunchpadBackdrop(): void {
    // Dynamic atmospheric sky gradient behind the launchpad (used during vertical space ascent)
    this.skyGradientGfx = this.add.graphics().setDepth(1);
    this.drawSkyGradientForAltitude(0);

    if (this.textures.exists('rocket-bg')) {
      this.launchpadBgImage = this.add
        .image(640, 360, 'rocket-bg')
        .setDisplaySize(1280, 720)
        .setDepth(2);
    } else {
      this.launchpadBgImage = this.add
        .image(640, 360, 'particle-star')
        .setVisible(false)
        .setDepth(2);
    }

    // Twinkling ambient night stars across the upper sky
    this.ambientStars = [];
    const starColors = [0xffffff, 0xfef08a, 0x38bdf8, 0xf472b6];
    for (let i = 0; i < 28; i++) {
      const sx = Phaser.Math.Between(60, 1220);
      const sy = Phaser.Math.Between(70, 440);
      const baseScale = Phaser.Math.FloatBetween(0.16, 0.34);
      const star = this.add
        .image(sx, sy, 'particle-star')
        .setTint(starColors[i % starColors.length])
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(baseScale)
        .setAlpha(Phaser.Math.FloatBetween(0.25, 0.85))
        .setDepth(3);

      this.tweens.add({
        targets: star,
        alpha: { from: 0.2, to: 0.9 },
        scaleX: { from: baseScale * 0.75, to: baseScale * 1.25 },
        scaleY: { from: baseScale * 0.75, to: baseScale * 1.25 },
        duration: Phaser.Math.Between(1200, 2400),
        delay: i * 90,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      this.ambientStars.push(star);
    }

    this.launchSmokeContainer = this.add.container(0, 0).setDepth(28);
    this.plasmaBeamGfx = this.add.graphics().setDepth(45);
  }

  private drawSkyGradientForAltitude(altProgress: number): void {
    this.skyGradientGfx.clear();
    // Smoothly transition sky colors across the 5 flight zones:
    // 0.00 - 0.25: Night Launchpad -> Fluffy Clouds (#0c1438 -> #1e3a8a)
    // 0.25 - 0.55: Upper Stratosphere (#172554 -> #0f172a)
    // 0.55 - 0.80: Earth Orbit (#090d1e -> #1e1b4b)
    // 0.80 - 1.00: Deep Space Crystal Nebula (#050511 -> #2e1065)
    let topColor = 0x070b1e;
    let botColor = 0x172554;
    if (altProgress < 0.33) {
      topColor = 0x09102c;
      botColor = 0x1e3a8a;
    } else if (altProgress < 0.66) {
      topColor = 0x050818;
      botColor = 0x0f172a;
    } else {
      topColor = 0x03030c;
      botColor = 0x3b0764;
    }
    this.skyGradientGfx.fillGradientStyle(topColor, topColor, botColor, botColor, 1);
    this.skyGradientGfx.fillRect(0, 0, 1280, 720);
  }

  // ===========================================================================
  // 2. ASTRONAUT SPARKY, SPACE-HELMET DOGGIE & BIG RED IGNITION LEVER
  // ===========================================================================

  private createCompanionsAndIgnitionConsole(): void {
    // 1. Astronaut Sparky on Left Launchpad Deck (`x: 155, y: 552`)
    this.sparkySprite = this.add
      .image(155, 552, 'astro-sparky')
      .setOrigin(0.5, 0.5)
      .setScale(0.64)
      .setDepth(32)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: this.sparkySprite,
      y: 544,
      duration: 1650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.sparkySprite.on('pointerdown', () => {
      AudioBus.playSfx('sparky');
      Juice.squashAndStretch(this, this.sparkySprite, 0.18, 150);
      Juice.burstStars(this, 155, 500, 10, [0x34d399, 0xfef08a, 0xffffff]);
      this.speakFriendlyCompanionHint();
    });

    // 2. Space-Helmet Doggie on Right Launchpad Deck (`x: 1125, y: 548`)
    this.doggieSprite = this.add
      .image(1125, 548, 'astro-doggie')
      .setOrigin(0.5, 0.5)
      .setScale(0.62)
      .setDepth(32)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: this.doggieSprite,
      y: 538,
      angle: { from: -3, to: 3 },
      duration: 1450,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.doggieSprite.on('pointerdown', () => {
      AudioBus.playSfx('doggie');
      Juice.squashAndStretch(this, this.doggieSprite, 0.2, 150);
      Juice.burstStars(this, 1125, 495, 10, [0xfef08a, 0x38bdf8, 0xffffff]);
      this.speakFriendlyCompanionHint();
    });

    // 3. Big Red Ignition Button & Brass Launch Lever (`x: 948, y: 555`)
    this.ignitionContainer = this.add.container(948, 555).setDepth(38);

    const ignGlow = this.add
      .image(0, 0, 'hub-radial-glow')
      .setDisplaySize(230, 190)
      .setTint(0xef4444)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.15);

    this.tweens.add({
      targets: ignGlow,
      alpha: { from: 0.2, to: 0.72 },
      scaleX: { from: 0.92, to: 1.12 },
      scaleY: { from: 0.92, to: 1.12 },
      duration: 750,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.ignitionSprite = this.add
      .image(0, 0, 'ignition-lever')
      .setOrigin(0.5, 0.5)
      .setScale(0.66);

    const bannerBg = this.add.graphics();
    bannerBg.fillStyle(0x450a0a, 0.96);
    bannerBg.fillRoundedRect(-106, -96, 212, 34, 10);
    bannerBg.lineStyle(2.5, 0xfef08a, 1);
    bannerBg.strokeRoundedRect(-106, -96, 212, 34, 10);

    this.ignitionBannerText = this.add
      .text(0, -79, '🔒 FUEL ROCKET FIRST', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '13.5px',
        fontStyle: 'bold',
        color: '#fca5a5'
      })
      .setOrigin(0.5);

    this.ignitionContainer.add([ignGlow, this.ignitionSprite, bannerBg, this.ignitionBannerText]);

    Juice.makeTactileButton(
      this,
      this.ignitionContainer,
      180,
      160,
      () => {
        if (this.phase === 'READY_TO_LAUNCH') {
          this.triggerBlastOffCountdown();
        } else if (this.phase === 'FUELING_PAD') {
          this.speakFriendlyCompanionHint();
        }
      },
      'pop'
    );
  }

  private speakFriendlyCompanionHint(): void {
    if (this.phase === 'READY_TO_LAUNCH') {
      this.audio.speakPrompt('ready_for_launch');
      return;
    }
    if (
      (this.missionMode === 'COMMANDER' && this.loadedHundreds > this.targetHundreds) ||
      (this.missionMode !== 'STAR_HOPPER' && this.loadedTens > this.targetTens) ||
      this.loadedOnes > this.targetOnes
    ) {
      this.audio.speakPrompt('over_fuel_valve');
      return;
    }
    this.audio.speakNumber(this.targetNumber);
  }

  // ===========================================================================
  // 3. MODULAR 3-STAGE ROCKET STACK, GANTRY TOWER & STEAM-WHISTLE VALVES
  // ===========================================================================

  private createRocketAndGantryContainer(): void {
    // Retractable Brass Launch Gantry Tower (`x: 505, y: 472`)
    this.gantrySprite = this.add
      .image(505, 598, 'gantry-tower')
      .setOrigin(0.5, 1.0)
      .setScale(0.95)
      .setDepth(22);

    // Rocket Root Container (`x: 640, y: 590`) holds the active 1, 2, or 3 stages
    this.rocketRootContainer = this.add.container(640, 590).setDepth(26);
    this.rocketEngineFlameGfx = this.add.graphics();
    this.rocketRootContainer.add(this.rocketEngineFlameGfx);

    // Interactive Stage Separation Ring (flashes during SPACE_ASCENT)
    this.separationRingContainer = this.add.container(0, -140).setVisible(false);
    const ringGfx = this.add.graphics();
    ringGfx.lineStyle(5, 0xfef08a, 1);
    ringGfx.strokeEllipse(0, 0, 190, 44);
    ringGfx.lineStyle(3, 0xef4444, 0.95);
    ringGfx.strokeEllipse(0, 0, 206, 54);
    ringGfx.fillStyle(0x7f1d1d, 0.95);
    ringGfx.fillRoundedRect(-128, -56, 256, 32, 12);
    ringGfx.lineStyle(2.5, 0xfef08a, 1);
    ringGfx.strokeRoundedRect(-128, -56, 256, 32, 12);

    this.separationRingLabel = this.add
      .text(0, -40, '⚡ TAP: SEPARATE BOOSTER! ⚡', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);

    this.separationRingContainer.add([ringGfx, this.separationRingLabel]);
    Juice.makeTactileButton(
      this,
      this.separationRingContainer,
      260,
      90,
      () => {
        if (this.awaitingSeparationSlot) {
          this.executeBoosterStageSeparation(this.awaitingSeparationSlot);
        }
      },
      'zap'
    );
    this.rocketRootContainer.add(this.separationRingContainer);
  }

  /**
   * Rebuilds the modular 1-stage, 2-stage, or 3-stage rocket stack on the launchpad
   * with live Place-Value Glass Fuel Windows and tactile Brass Steam-Whistle Release Valves.
   */
  private buildRocketStackForCurrentMode(): void {
    // Destroy previous stage tank views while keeping engine flame graphics & separation ring
    Object.values(this.stageTanks).forEach((ui) => {
      if (!ui) return;
      ui.stageSprite.destroy();
      ui.windowGfx.destroy();
      ui.readoutBadge.destroy();
      ui.valveContainer.destroy();
    });
    this.stageTanks = {};

    this.rocketRootContainer.setPosition(640, 590);
    this.rocketRootContainer.setAngle(0);
    this.rocketRootContainer.setScale(1);
    this.rocketEngineFlameGfx.clear();
    this.separationRingContainer.setVisible(false);

    // Reset gantry tower upright next to rocket
    this.gantrySprite.setPosition(510, 598);
    this.gantrySprite.setAngle(0);
    this.gantrySprite.setAlpha(1);
    this.gantrySprite.setVisible(true);

    if (this.missionMode === 'STAR_HOPPER') {
      // Single-stage rocket (1-10): Large Command Capsule + thruster skirt
      this.createStageTankUi('ONES', 1, 'rocket-stage-1', -120, 0.95, COLOR_ONES);
    } else if (this.missionMode === 'LUNAR_CADET') {
      // Two-stage rocket (10-99): Bottom Tens Tank + Top Ones Capsule
      this.createStageTankUi('TENS', 10, 'rocket-stage-10', -86, 0.78, COLOR_TENS);
      this.createStageTankUi('ONES', 1, 'rocket-stage-1', -236, 0.78, COLOR_ONES);
    } else {
      // Three-stage heavy Saturn rocket (100-999):
      // Bottom Stage 1 (Hundreds 100s) + Middle Stage 2 (Tens 10s) + Top Stage 3 (Ones 1s)
      this.createStageTankUi('HUNDREDS', 100, 'rocket-stage-100', -78, 0.68, COLOR_HUNDREDS);
      this.createStageTankUi('TENS', 10, 'rocket-stage-10', -208, 0.68, COLOR_TENS);
      this.createStageTankUi('ONES', 1, 'rocket-stage-1', -334, 0.68, COLOR_ONES);
    }

    this.refreshRocketTankGaugesAndValves();
  }

  private createStageTankUi(
    slot: PlaceValueSlot,
    unitValue: 1 | 10 | 100,
    texKey: string,
    centerY: number,
    scale: number,
    accentColor: number
  ): void {
    const stageSprite = this.add
      .image(0, centerY, texKey)
      .setOrigin(0.5, 0.5)
      .setScale(scale)
      .setInteractive({ useHandCursor: true });

    const windowGfx = this.add.graphics();

    // Place-Value Digital Fuel Readout Pill on the left side of the stage
    const readoutBadge = this.add.container(-108, centerY);
    const rGfx = this.add.graphics();
    rGfx.fillStyle(0x090d1e, 0.94);
    rGfx.fillRoundedRect(-58, -20, 116, 40, 10);
    rGfx.lineStyle(2.5, accentColor, 1);
    rGfx.strokeRoundedRect(-58, -20, 116, 40, 10);

    const slotLabel =
      slot === 'HUNDREDS' ? '100s TANK' : slot === 'TENS' ? '10s TANK' : '1s TANK';
    const topLbl = this.add
      .text(0, -9, slotLabel, {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#94a3b8'
      })
      .setOrigin(0.5);

    const readoutText = this.add
      .text(-8, 7, '0', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    const statusIconText = this.add
      .text(38, 7, '', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#34d399'
      })
      .setOrigin(0.5);

    readoutBadge.add([rGfx, topLbl, readoutText, statusIconText]);

    // Tactile Brass Steam-Whistle Release Valve on the right side of the stage (`x: +118`)
    const valveContainer = this.add.container(122, centerY);
    const valveGlow = this.add
      .image(0, 0, 'hub-radial-glow')
      .setDisplaySize(115, 115)
      .setTint(0xf59e0b)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.75);

    this.tweens.add({
      targets: valveGlow,
      alpha: { from: 0.35, to: 0.88 },
      scaleX: { from: 0.9, to: 1.15 },
      scaleY: { from: 0.9, to: 1.15 },
      duration: 520,
      yoyo: true,
      repeat: -1
    });

    const valveSprite = this.add
      .image(0, 0, 'steam-valve-lever')
      .setOrigin(0.5, 0.5)
      .setScale(0.36);

    const vPill = this.add.graphics();
    vPill.fillStyle(0x78350f, 0.96);
    vPill.fillRoundedRect(-64, 24, 128, 24, 8);
    vPill.lineStyle(2, 0xfef08a, 1);
    vPill.strokeRoundedRect(-64, 24, 128, 24, 8);

    const valveAlertText = this.add
      .text(0, 36, `PULL VALVE (-${unitValue})`, {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);

    valveContainer.add([valveGlow, valveSprite, vPill, valveAlertText]);
    Juice.makeTactileButton(
      this,
      valveContainer,
      110,
      88,
      () => {
        this.releaseSteamFromStage(slot);
      },
      null
    );

    // Tapping a stage tank speaks its current place-value fuel level
    stageSprite.on('pointerdown', () => {
      if (this.phase !== 'FUELING_PAD' && this.phase !== 'READY_TO_LAUNCH') return;
      const count = this.getLoadedCountForSlot(slot);
      if (count > 0) {
        this.audio.speakStageFuelValue(count * unitValue, unitValue);
      } else {
        this.audio.speakNumber(this.targetNumber);
      }
      Juice.squashAndStretch(this, stageSprite, 0.1, 130);
    });

    this.rocketRootContainer.add([stageSprite, windowGfx, readoutBadge, valveContainer]);
    // Keep separation ring on top of stages
    this.rocketRootContainer.bringToTop(this.separationRingContainer);

    this.stageTanks[slot] = {
      slot,
      unitValue,
      stageSprite,
      windowGfx,
      readoutBadge,
      readoutText,
      statusIconText,
      valveContainer,
      valveSprite,
      valveAlertText,
      baseY: centerY
    };
  }

  private getLoadedCountForSlot(slot: PlaceValueSlot): number {
    if (slot === 'HUNDREDS') return this.loadedHundreds;
    if (slot === 'TENS') return this.loadedTens;
    return this.loadedOnes;
  }

  private getTargetCountForSlot(slot: PlaceValueSlot): number {
    if (slot === 'HUNDREDS') return this.targetHundreds;
    if (slot === 'TENS') return this.targetTens;
    return this.targetOnes;
  }

  private getLoadedTotalNumber(): number {
    return this.loadedHundreds * 100 + this.loadedTens * 10 + this.loadedOnes;
  }

  // ===========================================================================
  // 4. SKY FUEL STAR SPAWNERS (+100 SUPERNOVA, +10 CONSTELLATION, +1 STAR GEM)
  // ===========================================================================

  private createSkyStarsLayer(): void {
    this.skyStarsContainer = this.add.container(0, 0).setDepth(34);
  }

  private spawnSkyFuelStarsForMode(): void {
    this.skyStarsContainer.removeAll(true);
    this.skyStars = [];

    if (this.missionMode === 'STAR_HOPPER') {
      // Spawn twinkling +1 Star Gems across both left and right sky zones
      const leftPositions = [
        { x: 155, y: 195 },
        { x: 295, y: 165 },
        { x: 215, y: 300 },
        { x: 345, y: 315 },
        { x: 145, y: 405 }
      ];
      const rightPositions = [
        { x: 935, y: 175 },
        { x: 1095, y: 195 },
        { x: 1005, y: 295 },
        { x: 1140, y: 335 },
        { x: 905, y: 395 }
      ];
      [...leftPositions, ...rightPositions].forEach((pt, idx) => {
        this.createSkyFuelStar('ONES', 1, 'fuel-gem-1', pt.x, pt.y, idx * 0.6);
      });
    } else if (this.missionMode === 'LUNAR_CADET') {
      // Left Sky Zone: Glowing Constellation Clusters (+10 each)
      const tensPositions = [
        { x: 155, y: 185 },
        { x: 310, y: 165 },
        { x: 225, y: 290 },
        { x: 145, y: 395 },
        { x: 325, y: 395 }
      ];
      tensPositions.forEach((pt, idx) => {
        this.createSkyFuelStar('TENS', 10, 'fuel-cluster-10', pt.x, pt.y, idx * 0.7);
      });

      // Right Sky Zone: Twinkling Single Star Gems (+1 each)
      const onesPositions = [
        { x: 935, y: 175 },
        { x: 1105, y: 185 },
        { x: 1015, y: 285 },
        { x: 915, y: 385 },
        { x: 1125, y: 385 }
      ];
      onesPositions.forEach((pt, idx) => {
        this.createSkyFuelStar('ONES', 1, 'fuel-gem-1', pt.x, pt.y, idx * 0.7 + 0.3);
      });
    } else {
      // Commander Wyatt Mode (100-999):
      // Sky Zone 1 (Left): Mega Supernova Cores (+100 each)
      const hundredsPositions = [
        { x: 145, y: 180 },
        { x: 285, y: 255 },
        { x: 155, y: 345 },
        { x: 295, y: 415 }
      ];
      hundredsPositions.forEach((pt, idx) => {
        this.createSkyFuelStar('HUNDREDS', 100, 'fuel-core-100', pt.x, pt.y, idx * 0.8);
      });

      // Sky Zone 2 (Upper Right-Center): Golden Constellation Clusters (+10 each)
      const tensPositions = [
        { x: 855, y: 170 },
        { x: 985, y: 225 },
        { x: 855, y: 315 },
        { x: 975, y: 385 }
      ];
      tensPositions.forEach((pt, idx) => {
        this.createSkyFuelStar('TENS', 10, 'fuel-cluster-10', pt.x, pt.y, idx * 0.8 + 0.3);
      });

      // Sky Zone 3 (Far Right): Twinkling Star Gems (+1 each)
      const onesPositions = [
        { x: 1135, y: 165 },
        { x: 1175, y: 265 },
        { x: 1115, y: 355 },
        { x: 1185, y: 430 }
      ];
      onesPositions.forEach((pt, idx) => {
        this.createSkyFuelStar('ONES', 1, 'fuel-gem-1', pt.x, pt.y, idx * 0.8 + 0.6);
      });
    }
  }

  private createSkyFuelStar(
    slot: PlaceValueSlot,
    unitValue: 1 | 10 | 100,
    texKey: string,
    x: number,
    y: number,
    bobPhase: number
  ): void {
    const container = this.add.container(x, y);
    const accentColor =
      slot === 'HUNDREDS' ? COLOR_HUNDREDS : slot === 'TENS' ? COLOR_TENS : COLOR_ONES;

    const glow = this.add
      .image(0, 0, 'hub-radial-glow')
      .setDisplaySize(128, 128)
      .setTint(accentColor)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.42);

    const spriteScale = unitValue === 100 ? 0.52 : unitValue === 10 ? 0.54 : 0.52;
    const sprite = this.add.image(0, -4, texKey).setOrigin(0.5, 0.5).setScale(spriteScale);

    const pillBg = this.add.graphics();
    pillBg.fillStyle(0x090d1e, 0.92);
    pillBg.fillRoundedRect(-32, 26, 64, 24, 8);
    pillBg.lineStyle(2, accentColor, 1);
    pillBg.strokeRoundedRect(-32, 26, 64, 24, 8);

    const badgeText = this.add
      .text(0, 38, `+${unitValue}`, {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: slot === 'HUNDREDS' ? HEX_HUNDREDS : slot === 'TENS' ? HEX_TENS : HEX_ONES
      })
      .setOrigin(0.5);

    container.add([glow, sprite, pillBg, badgeText]);

    const actor: SkyFuelStarActor = {
      id: this.nextStarId++,
      slot,
      unitValue,
      baseX: x,
      baseY: y,
      bobPhase,
      container,
      glow,
      sprite,
      badgeText,
      isBusy: false
    };

    Juice.makeTactileButton(
      this,
      container,
      96,
      96,
      () => {
        this.onTapSkyFuelStar(actor);
      },
      null
    );

    this.skyStarsContainer.add(container);
    this.skyStars.push(actor);
  }

  private onTapSkyFuelStar(actor: SkyFuelStarActor): void {
    if (this.phase !== 'FUELING_PAD' && this.phase !== 'READY_TO_LAUNCH') return;
    if (actor.isBusy) return;

    const slot = actor.slot;
    const maxCap = this.missionMode === 'STAR_HOPPER' ? 12 : 9;
    const currentCount = this.getLoadedCountForSlot(slot);

    if (currentCount >= maxCap) {
      this.audio.playPressureGaugeWobble();
      this.audio.speakPrompt('over_fuel_valve');
      return;
    }

    actor.isBusy = true;

    // Increment stage fuel count
    if (slot === 'HUNDREDS') {
      this.loadedHundreds++;
    } else if (slot === 'TENS') {
      this.loadedTens++;
    } else {
      this.loadedOnes++;
    }

    const newCount = this.getLoadedCountForSlot(slot);
    const targetCount = this.getTargetCountForSlot(slot);

    // Fire vivid Starlight / Plasma Laser Beam from the tapped star into the matching Rocket Stage Tank!
    const tankUi = this.stageTanks[slot];
    const targetWorldX = this.rocketRootContainer.x;
    const targetWorldY = this.rocketRootContainer.y + (tankUi ? tankUi.baseY : -140);

    this.fireStarlightPlasmaBeam(
      actor.container.x,
      actor.container.y,
      targetWorldX,
      targetWorldY,
      actor.unitValue
    );

    // Play place-value laser SFX + immediately speak current stage fuel value!
    if (actor.unitValue === 100) {
      this.audio.playLaserBeamHundreds(newCount);
    } else if (actor.unitValue === 10) {
      this.audio.playLaserBeamTens(newCount);
    } else {
      this.audio.playLaserBeamOnes(newCount);
    }

    if (newCount > targetCount && !this.overFuelWarnedBySlot[slot]) {
      this.overFuelWarnedBySlot[slot] = true;
      this.audio.playPressureGaugeWobble();
      this.audio.speakPrompt('over_fuel_valve');
    } else {
      this.audio.speakStageFuelValue(newCount * actor.unitValue, actor.unitValue);
    }

    // Pop floating +100 / +10 / +1 label & respawn star smoothly
    const colorHex =
      slot === 'HUNDREDS' ? HEX_HUNDREDS : slot === 'TENS' ? HEX_TENS : HEX_ONES;
    Juice.popFloatingLabel(
      this,
      actor.container.x,
      actor.container.y - 12,
      `+${actor.unitValue}`,
      colorHex
    );
    Juice.burstStars(this, targetWorldX, targetWorldY, 12, [
      slot === 'HUNDREDS' ? COLOR_HUNDREDS : slot === 'TENS' ? COLOR_TENS : COLOR_ONES,
      0xfef08a,
      0xffffff
    ]);

    if (tankUi) {
      Juice.squashAndStretch(this, tankUi.stageSprite, 0.14, 140);
    }

    // Brief respawn pop animation on the sky star so the sky never runs out of stars
    this.tweens.add({
      targets: actor.container,
      scaleX: 0.15,
      scaleY: 0.15,
      alpha: 0.2,
      duration: 140,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.tweens.add({
          targets: actor.container,
          scaleX: 1,
          scaleY: 1,
          alpha: 1,
          duration: 240,
          ease: 'Back.easeOut',
          onComplete: () => {
            actor.isBusy = false;
          }
        });
      }
    });

    this.refreshRocketTankGaugesAndValves();
    this.checkIfTargetMatched();
  }

  private fireStarlightPlasmaBeam(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    unitValue: 1 | 10 | 100
  ): void {
    const beamColor =
      unitValue === 100 ? COLOR_HUNDREDS : unitValue === 10 ? COLOR_TENS : COLOR_ONES;
    const outerThickness = unitValue === 100 ? 18 : unitValue === 10 ? 13 : 9;

    const beamObj = { progress: 1 };
    this.tweens.add({
      targets: beamObj,
      progress: 0,
      duration: 320,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        this.plasmaBeamGfx.clear();
        const alpha = beamObj.progress;
        this.plasmaBeamGfx.lineStyle(outerThickness * alpha, beamColor, 0.65 * alpha);
        this.plasmaBeamGfx.lineBetween(fromX, fromY, toX, toY);
        this.plasmaBeamGfx.lineStyle(Math.max(3, outerThickness * 0.4 * alpha), 0xffffff, 0.95 * alpha);
        this.plasmaBeamGfx.lineBetween(fromX, fromY, toX, toY);
        this.plasmaBeamGfx.fillStyle(0xffffff, alpha);
        this.plasmaBeamGfx.fillCircle(toX, toY, 14 * alpha);
      },
      onComplete: () => {
        this.plasmaBeamGfx.clear();
      }
    });
  }

  /**
   * Tactile Steam-Release Valve (`>` Comparison):
   * Pops 1 unit of fuel (`-100`, `-10`, or `-1`) out of an over-fueled (or non-empty) tank
   * with a hilarious *PSSSHHH-POP!* steam cloud!
   */
  private releaseSteamFromStage(slot: PlaceValueSlot): void {
    if (this.phase !== 'FUELING_PAD' && this.phase !== 'READY_TO_LAUNCH') return;

    const currentCount = this.getLoadedCountForSlot(slot);
    if (currentCount <= 0) return;

    if (slot === 'HUNDREDS') {
      this.loadedHundreds--;
    } else if (slot === 'TENS') {
      this.loadedTens--;
    } else {
      this.loadedOnes--;
    }

    const tankUi = this.stageTanks[slot];
    const valveWorldX = this.rocketRootContainer.x + 122;
    const valveWorldY = this.rocketRootContainer.y + (tankUi ? tankUi.baseY : -140);

    // Play hilarious steam-whistle valve SFX & spin the brass valve wheel
    this.audio.playSteamValveRelease();
    if (tankUi) {
      this.tweens.add({
        targets: tankUi.valveSprite,
        angle: { from: 0, to: 360 },
        duration: 360,
        ease: 'Back.easeOut'
      });
      Juice.squashAndStretch(this, tankUi.stageSprite, 0.16, 150);
    }

    // Billowing white pixel-art steam puffs + popped star arc back into the sky!
    for (let i = 0; i < 9; i++) {
      const puff = this.add
        .circle(
          valveWorldX,
          valveWorldY,
          Phaser.Math.Between(10, 22),
          i % 2 === 0 ? 0xf8fafc : 0xe2e8f0,
          0.88
        )
        .setDepth(50);

      this.tweens.add({
        targets: puff,
        x: valveWorldX + Phaser.Math.Between(35, 135),
        y: valveWorldY - Phaser.Math.Between(25, 110),
        scaleX: 2.1,
        scaleY: 2.1,
        alpha: 0,
        duration: Phaser.Math.Between(420, 680),
        ease: 'Cubic.easeOut',
        onComplete: () => puff.destroy()
      });
    }

    const unitVal = slot === 'HUNDREDS' ? 100 : slot === 'TENS' ? 10 : 1;
    Juice.popFloatingLabel(
      this,
      valveWorldX,
      valveWorldY - 24,
      `💨 -${unitVal} STEAM!`,
      '#fef08a'
    );

    if (this.getLoadedCountForSlot(slot) <= this.getTargetCountForSlot(slot)) {
      this.overFuelWarnedBySlot[slot] = false;
    }

    this.refreshRocketTankGaugesAndValves();
    this.checkIfTargetMatched();
  }

  /**
   * Updates all 3 Place-Value Stage Fuel Windows, Steam-Release Valves, and Top Split-Flap Readout.
   */
  private refreshRocketTankGaugesAndValves(): void {
    const slots: PlaceValueSlot[] = ['HUNDREDS', 'TENS', 'ONES'];

    for (const slot of slots) {
      const ui = this.stageTanks[slot];
      if (!ui) continue;

      const loaded = this.getLoadedCountForSlot(slot);
      const target = this.getTargetCountForSlot(slot);
      const loadedVal = loaded * ui.unitValue;
      const targetVal = target * ui.unitValue;
      const isOver = loaded > target;
      const isExact = loaded === target;

      // Draw glowing vertical glass fuel bar on the center of the rocket stage
      ui.windowGfx.clear();
      const barW = 22;
      const barH = 68;
      const bx = -barW / 2;
      const by = ui.baseY - barH / 2;

      ui.windowGfx.fillStyle(0x090d1e, 0.88);
      ui.windowGfx.fillRoundedRect(bx, by, barW, barH, 6);

      const ratio = target > 0 ? Math.min(1, loaded / target) : loaded > 0 ? 1 : 0;
      const fillH = Math.round((barH - 6) * ratio);
      const fillColor = isOver
        ? 0xf97316 // Warm Amber Pressure Glow when over-fueled (`>`)
        : slot === 'HUNDREDS'
        ? COLOR_HUNDREDS
        : slot === 'TENS'
        ? COLOR_TENS
        : COLOR_ONES;

      if (fillH > 0) {
        ui.windowGfx.fillStyle(fillColor, 0.95);
        ui.windowGfx.fillRoundedRect(bx + 3, by + barH - 3 - fillH, barW - 6, fillH, 4);
      }

      ui.windowGfx.lineStyle(2, isOver ? 0xfef08a : isExact ? 0x34d399 : 0x94a3b8, 1);
      ui.windowGfx.strokeRoundedRect(bx, by, barW, barH, 6);

      // Update stage digital badge
      ui.readoutText.setText(`${loadedVal}/${targetVal}`);
      if (isOver) {
        ui.readoutText.setColor('#fdba74');
        ui.statusIconText.setText('>');
        ui.statusIconText.setColor('#fb923c');
        ui.stageSprite.setTint(0xffedd5);
      } else if (isExact) {
        ui.readoutText.setColor('#fef08a');
        ui.statusIconText.setText('✓');
        ui.statusIconText.setColor('#34d399');
        ui.stageSprite.clearTint();
      } else {
        ui.readoutText.setColor('#ffffff');
        ui.statusIconText.setText('<');
        ui.statusIconText.setColor('#38bdf8');
        ui.stageSprite.clearTint();
      }

      // Show tactile Brass Steam-Whistle Release Valve whenever loaded > 0 (and highlight brightly when over-fueled!)
      ui.valveContainer.setVisible(loaded > 0);
      ui.valveContainer.setAlpha(isOver ? 1.0 : 0.78);
      ui.valveAlertText.setText(isOver ? `OVER! PULL (-${ui.unitValue})` : `VALVE (-${ui.unitValue})`);
    }

    // Update Top Split-Flap Live Comparison Display
    const totalLoaded = this.getLoadedTotalNumber();
    if (this.loadedCounterText) {
      this.loadedCounterText.setText(`FUEL: ${totalLoaded}`);
    }
    if (this.comparisonSymbolText) {
      if (totalLoaded === this.targetNumber && this.isEveryActiveStageExact()) {
        this.comparisonSymbolText.setText('= MATCH!');
        this.comparisonSymbolText.setColor('#34d399');
      } else if (totalLoaded > this.targetNumber) {
        this.comparisonSymbolText.setText('> TOO MUCH FUEL');
        this.comparisonSymbolText.setColor('#fb923c');
      } else {
        this.comparisonSymbolText.setText('< ADD STAR FUEL');
        this.comparisonSymbolText.setColor('#38bdf8');
      }
    }
  }

  private isEveryActiveStageExact(): boolean {
    if (this.missionMode === 'STAR_HOPPER') {
      return this.loadedOnes === this.targetOnes;
    }
    if (this.missionMode === 'LUNAR_CADET') {
      return this.loadedTens === this.targetTens && this.loadedOnes === this.targetOnes;
    }
    return (
      this.loadedHundreds === this.targetHundreds &&
      this.loadedTens === this.targetTens &&
      this.loadedOnes === this.targetOnes
    );
  }

  private checkIfTargetMatched(): void {
    const exactMatch = this.isEveryActiveStageExact();
    if (exactMatch && this.phase === 'FUELING_PAD') {
      this.phase = 'READY_TO_LAUNCH';
      this.ignitionBannerText.setText('🚀 PULL TO BLAST OFF!');
      this.ignitionBannerText.setColor('#fef08a');
      Juice.squashAndStretch(this, this.ignitionContainer, 0.22, 160);
      Juice.burstStars(this, 948, 520, 20, [0xef4444, 0xfef08a, 0x34d399]);

      this.missionHintBannerText.setText(
        `★ TARGET ${this.targetNumber} MATCHED! PULL THE BIG RED LAUNCH LEVER! ★`
      );

      // Speak the complete number (1-999) followed by the launch invitation!
      this.audio.speakNumber(this.targetNumber, () => {
        if (this.phase === 'READY_TO_LAUNCH') {
          this.audio.speakPrompt('ready_for_launch');
        }
      });
    } else if (!exactMatch && this.phase === 'READY_TO_LAUNCH') {
      this.phase = 'FUELING_PAD';
      this.ignitionBannerText.setText('🔒 FUEL ROCKET FIRST');
      this.ignitionBannerText.setColor('#fca5a5');
      this.updateMissionHintBanner();
    } else {
      this.updateMissionHintBanner();
    }
  }

  private updateMissionHintBanner(): void {
    if (!this.missionHintBannerText) return;
    if (
      (this.missionMode === 'COMMANDER' && this.loadedHundreds > this.targetHundreds) ||
      (this.missionMode !== 'STAR_HOPPER' && this.loadedTens > this.targetTens) ||
      this.loadedOnes > this.targetOnes
    ) {
      this.missionHintBannerText.setText(
        '💨 TOO MUCH FUEL IN THAT TANK! PULL THE BRASS STEAM VALVE TO RELEASE ONE!'
      );
      return;
    }

    if (this.missionMode === 'STAR_HOPPER') {
      this.missionHintBannerText.setText(
        `★ TAP +1 STAR GEMS TO FUEL THE ROCKET TO ${this.targetNumber}! ★`
      );
    } else if (this.missionMode === 'LUNAR_CADET') {
      this.missionHintBannerText.setText(
        `★ TAP +10 CLUSTERS (${this.targetTens * 10}) & +1 GEMS (${this.targetOnes}) TO BUILD ${this.targetNumber}! ★`
      );
    } else {
      this.missionHintBannerText.setText(
        `★ TAP +100 CORES (${this.targetHundreds * 100}), +10 CLUSTERS (${this.targetTens * 10}) & +1 GEMS (${this.targetOnes}) = ${this.targetNumber}! ★`
      );
    }
  }

  // ===========================================================================
  // 5. TOP SPLIT-FLAP MISSION COUNTER & 3-MODE VISUAL TOGGLE BAR
  // ===========================================================================

  private createTopSplitFlapHudAndModeBar(): void {
    this.hudContainer = this.add.container(0, 0).setDepth(80);

    // 1. Top-Left Heirloom Back-to-Shelf Button (`x: 68, y: 42`)
    const backBtn = this.add.container(68, 42);
    const bGfx = this.add.graphics();
    bGfx.fillStyle(0x090d1e, 0.92);
    bGfx.fillRoundedRect(-52, -26, 104, 52, 14);
    bGfx.lineStyle(2.5, 0xfbbf24, 1);
    bGfx.strokeRoundedRect(-52, -26, 104, 52, 14);
    const bTxt = this.add
      .text(0, 0, '◀ HUB', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    backBtn.add([bGfx, bTxt]);
    Juice.makeTactileButton(
      this,
      backBtn,
      104,
      64,
      () => {
        this.audio.stopVoice();
        this.scene.start('HubScene');
      },
      'tab'
    );
    this.hudContainer.add(backBtn);

    // 2. Chunky Brass Mechanical Split-Flap Mission Target Counter (`x: 640, y: 48`)
    const counterPanel = this.add.container(640, 48);
    const cpGfx = this.add.graphics();
    cpGfx.fillStyle(0x090d1e, 0.96);
    cpGfx.fillRoundedRect(-275, -38, 550, 76, 16);
    cpGfx.lineStyle(3, 0xd97706, 1);
    cpGfx.strokeRoundedRect(-275, -38, 550, 76, 16);
    cpGfx.lineStyle(1.5, 0xfef08a, 0.75);
    cpGfx.strokeRoundedRect(-270, -33, 540, 66, 13);
    counterPanel.add(cpGfx);

    const targetTitle = this.add
      .text(-205, -14, 'TARGET\nNUMBER', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fef08a',
        align: 'center'
      })
      .setOrigin(0.5);
    counterPanel.add(targetTitle);

    const speakIcon = this.add
      .text(-205, 16, '🔊 TAP', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#38bdf8'
      })
      .setOrigin(0.5);
    counterPanel.add(speakIcon);

    // 3 Color-Coded Place-Value Split-Flap Digit Cards (100s Cyan, 10s Gold, 1s Emerald)
    const hFlap = this.createSplitFlapDigitCard(-118, 0, '100s', COLOR_HUNDREDS, HEX_HUNDREDS);
    this.flapHundredsBox = hFlap.box;
    this.flapHundredsText = hFlap.digitText;

    const tFlap = this.createSplitFlapDigitCard(-48, 0, '10s', COLOR_TENS, HEX_TENS);
    this.flapTensBox = tFlap.box;
    this.flapTensText = tFlap.digitText;

    const oFlap = this.createSplitFlapDigitCard(22, 0, '1s', COLOR_ONES, HEX_ONES);
    this.flapOnesBox = oFlap.box;
    this.flapOnesText = oFlap.digitText;

    counterPanel.add([this.flapHundredsBox, this.flapTensBox, this.flapOnesBox]);

    // Live Fuel Loaded & Comparison Readout on the right side of the Split-Flap Board
    this.loadedCounterText = this.add
      .text(165, -10, 'FUEL: 0', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    this.comparisonSymbolText = this.add
      .text(165, 14, '< ADD STAR FUEL', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '12.5px',
        fontStyle: 'bold',
        color: '#38bdf8'
      })
      .setOrigin(0.5);

    counterPanel.add([this.loadedCounterText, this.comparisonSymbolText]);

    // Tapping the Split-Flap Counter speaks the full target number (1-999)
    const flapHit = this.add
      .zone(0, 0, 550, 76)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    flapHit.on('pointerdown', () => {
      AudioBus.playSfx('split-flap');
      Juice.squashAndStretch(this, counterPanel, 0.08, 120);
      this.audio.speakNumber(this.targetNumber);
    });
    counterPanel.add(flapHit);
    this.hudContainer.add(counterPanel);

    // 3. Top-Right Order Toggle (`1,2,3` vs `🎲 MIX`) & New Number Button
    const orderBtn = this.add.container(1032, 42);
    const oGfx = this.add.graphics();
    oGfx.fillStyle(0x090d1e, 0.92);
    oGfx.fillRoundedRect(-58, -26, 116, 52, 14);
    oGfx.lineStyle(2, 0x38bdf8, 0.95);
    oGfx.strokeRoundedRect(-58, -26, 116, 52, 14);
    this.orderBtnLabel = this.add
      .text(0, 0, '🔢 IN ORDER', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    orderBtn.add([oGfx, this.orderBtnLabel]);
    Juice.makeTactileButton(
      this,
      orderBtn,
      116,
      64,
      () => {
        this.orderMode = this.orderMode === 'SEQUENTIAL' ? 'RANDOM' : 'SEQUENTIAL';
        this.orderBtnLabel.setText(this.orderMode === 'SEQUENTIAL' ? '🔢 IN ORDER' : '🎲 RANDOM');
        this.startNewMission(true);
      },
      'tab'
    );
    this.hudContainer.add(orderBtn);

    const nextNumBtn = this.add.container(1172, 42);
    const nGfx = this.add.graphics();
    nGfx.fillStyle(0x090d1e, 0.92);
    nGfx.fillRoundedRect(-64, -26, 128, 52, 14);
    nGfx.lineStyle(2.5, 0x34d399, 1);
    nGfx.strokeRoundedRect(-64, -26, 128, 52, 14);
    const nTxt = this.add
      .text(0, 0, '🎲 NEW #', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#34d399'
      })
      .setOrigin(0.5);
    nextNumBtn.add([nGfx, nTxt]);
    Juice.makeTactileButton(
      this,
      nextNumBtn,
      128,
      64,
      () => {
        this.startNewMission(true);
      },
      'split-flap'
    );
    this.hudContainer.add(nextNumBtn);

    // 4. Mission Guidance Banner Pill (`x: 640, y: 108`)
    const hintPill = this.add.container(640, 108);
    const hpGfx = this.add.graphics();
    hpGfx.fillStyle(0x090d1e, 0.88);
    hpGfx.fillRoundedRect(-355, -18, 710, 36, 18);
    hpGfx.lineStyle(2, 0xfbbf24, 0.9);
    hpGfx.strokeRoundedRect(-355, -18, 710, 36, 18);
    this.missionHintBannerText = this.add
      .text(0, 0, '★ TAP GLOWING STARS IN THE SKY TO FUEL YOUR ROCKET! ★', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    hintPill.add([hpGfx, this.missionHintBannerText]);
    this.hudContainer.add(hintPill);

    // 5. Bottom-Center 3 Instant Mission Modes Visual Toggle Bar (`y: 678`)
    const modesSpecs: Array<{
      mode: RocketMissionMode;
      x: number;
      title: string;
      sub: string;
      color: number;
    }> = [
      {
        mode: 'STAR_HOPPER',
        x: 360,
        title: '⭐ STAR HOPPER (1–10)',
        sub: 'Emma 1-Stage Rocket',
        color: COLOR_ONES
      },
      {
        mode: 'LUNAR_CADET',
        x: 640,
        title: '🌙 LUNAR CADET (10–99)',
        sub: '2-Stage (10s + 1s)',
        color: COLOR_TENS
      },
      {
        mode: 'COMMANDER',
        x: 920,
        title: '🚀 COMMANDER (100–999)',
        sub: 'Wyatt 3-Stage Saturn',
        color: COLOR_HUNDREDS
      }
    ];

    modesSpecs.forEach((spec) => {
      const btn = this.add.container(spec.x, 678);
      this.modeButtons.set(spec.mode, btn);
      Juice.makeTactileButton(
        this,
        btn,
        254,
        64,
        () => {
          if (this.missionMode !== spec.mode) {
            this.missionMode = spec.mode;
            const promptKey =
              spec.mode === 'STAR_HOPPER'
                ? 'mode_star_hopper'
                : spec.mode === 'LUNAR_CADET'
                ? 'mode_lunar_cadet'
                : 'mode_commander';
            this.startNewMission(false);
            this.audio.speakPrompt(promptKey, () => {
              this.audio.speakNumber(this.targetNumber);
            });
          } else {
            this.audio.speakNumber(this.targetNumber);
          }
        },
        'tab'
      );
      this.hudContainer.add(btn);
    });

    this.refreshModeButtonsVisuals();
  }

  private createSplitFlapDigitCard(
    x: number,
    y: number,
    placeLabel: string,
    borderColor: number,
    textColorHex: string
  ): { box: Phaser.GameObjects.Container; digitText: Phaser.GameObjects.Text } {
    const box = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x1e293b, 0.98);
    g.fillRoundedRect(-29, -28, 58, 56, 8);
    g.lineStyle(2.5, borderColor, 1);
    g.strokeRoundedRect(-29, -28, 58, 56, 8);
    // Mechanical split-flap horizontal hinge line
    g.lineStyle(1.5, 0x090d1e, 0.9);
    g.lineBetween(-27, 2, 27, 2);

    const placeTxt = this.add
      .text(0, -18, placeLabel, {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: textColorHex
      })
      .setOrigin(0.5);

    const digitText = this.add
      .text(0, 7, '0', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: textColorHex
      })
      .setOrigin(0.5);

    box.add([g, placeTxt, digitText]);
    return { box, digitText };
  }

  private refreshModeButtonsVisuals(): void {
    const specs: Array<{
      mode: RocketMissionMode;
      title: string;
      sub: string;
      color: number;
    }> = [
      {
        mode: 'STAR_HOPPER',
        title: '⭐ STAR HOPPER (1–10)',
        sub: 'Emma 1-Stage Rocket',
        color: COLOR_ONES
      },
      {
        mode: 'LUNAR_CADET',
        title: '🌙 LUNAR CADET (10–99)',
        sub: '2-Stage (10s + 1s)',
        color: COLOR_TENS
      },
      {
        mode: 'COMMANDER',
        title: '🚀 COMMANDER (100–999)',
        sub: 'Wyatt 3-Stage Saturn',
        color: COLOR_HUNDREDS
      }
    ];

    specs.forEach((spec) => {
      const btn = this.modeButtons.get(spec.mode);
      if (!btn) return;
      btn.removeAll(true);

      const isSelected = this.missionMode === spec.mode;
      const g = this.add.graphics();
      g.fillStyle(isSelected ? 0x1e293b : 0x090d1e, isSelected ? 0.98 : 0.86);
      g.fillRoundedRect(-126, -26, 252, 52, 14);
      g.lineStyle(isSelected ? 3.5 : 1.8, isSelected ? spec.color : 0x475569, 1);
      g.strokeRoundedRect(-126, -26, 252, 52, 14);

      const tTxt = this.add
        .text(0, -7, spec.title, {
          fontFamily: '"Fredoka", sans-serif',
          fontSize: '14px',
          fontStyle: 'bold',
          color: isSelected ? '#fef08a' : '#cbd5e1'
        })
        .setOrigin(0.5);

      const sTxt = this.add
        .text(0, 11, spec.sub, {
          fontFamily: '"Fredoka", sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: isSelected ? '#38bdf8' : '#94a3b8'
        })
        .setOrigin(0.5);

      btn.add([g, tTxt, sTxt]);
    });
  }

  // ===========================================================================
  // 6. MISSION TARGET GENERATOR (`1` TO `999`) & SPLIT-FLAP REEL ANIMATION
  // ===========================================================================

  private pickNextTargetNumber(): number {
    if (this.missionMode === 'STAR_HOPPER') {
      if (this.orderMode === 'SEQUENTIAL') {
        const n = STAR_HOPPER_SEQ[this.seqCursorByMode.STAR_HOPPER % STAR_HOPPER_SEQ.length];
        this.seqCursorByMode.STAR_HOPPER++;
        return n;
      }
      return Phaser.Math.Between(1, 10);
    }

    if (this.missionMode === 'LUNAR_CADET') {
      if (this.orderMode === 'SEQUENTIAL') {
        const n = LUNAR_CADET_SEQ[this.seqCursorByMode.LUNAR_CADET % LUNAR_CADET_SEQ.length];
        this.seqCursorByMode.LUNAR_CADET++;
        return n;
      }
      const tens = Phaser.Math.Between(1, 9) * 10;
      const ones = Phaser.Math.Between(1, 9);
      return tens + ones;
    }

    // Commander Mode (100-999): pick numbers with non-zero digits so all 3 stages are active and fun
    if (this.orderMode === 'SEQUENTIAL') {
      const n = COMMANDER_SEQ[this.seqCursorByMode.COMMANDER % COMMANDER_SEQ.length];
      this.seqCursorByMode.COMMANDER++;
      return n;
    }
    const h = Phaser.Math.Between(1, 9) * 100;
    const t = Phaser.Math.Between(1, 9) * 10;
    const o = Phaser.Math.Between(1, 9);
    return h + t + o;
  }

  private startNewMission(speakTargetImmediately: boolean): void {
    this.phase = 'FUELING_PAD';
    this.loadedHundreds = 0;
    this.loadedTens = 0;
    this.loadedOnes = 0;
    this.overFuelWarnedBySlot = { HUNDREDS: false, TENS: false, ONES: false };

    this.targetNumber = this.pickNextTargetNumber();

    if (this.missionMode === 'STAR_HOPPER') {
      this.targetHundreds = 0;
      this.targetTens = 0;
      this.targetOnes = this.targetNumber; // 1..10 in single-stage mode
    } else if (this.missionMode === 'LUNAR_CADET') {
      this.targetHundreds = 0;
      this.targetTens = Math.floor(this.targetNumber / 10);
      this.targetOnes = this.targetNumber % 10;
    } else {
      this.targetHundreds = Math.floor(this.targetNumber / 100);
      this.targetTens = Math.floor((this.targetNumber % 100) / 10);
      this.targetOnes = this.targetNumber % 10;
    }

    // Restore launchpad visibility & HUD
    this.drawSkyGradientForAltitude(0);
    this.launchpadBgImage.setVisible(true).setY(360).setAlpha(1);
    this.sparkySprite.setVisible(true);
    this.doggieSprite.setVisible(true);
    this.ignitionContainer.setVisible(true);
    this.ignitionBannerText.setText('🔒 FUEL ROCKET FIRST');
    this.ignitionBannerText.setColor('#fca5a5');
    this.skyStarsContainer.setVisible(true);
    this.hudContainer.setVisible(true);
    this.countdownContainer.setVisible(false);
    this.ascentHudContainer.setVisible(false);
    this.ascentCollectiblesContainer.removeAll(true);
    this.landingContainer.setVisible(false);

    // Update Split-Flap Counter Digits
    this.flapHundredsBox.setAlpha(this.missionMode === 'COMMANDER' ? 1 : 0.28);
    this.flapTensBox.setAlpha(this.missionMode !== 'STAR_HOPPER' ? 1 : 0.28);
    this.flapOnesBox.setAlpha(1);

    this.flapHundredsText.setText(String(this.targetHundreds));
    this.flapTensText.setText(String(this.targetTens));
    this.flapOnesText.setText(String(this.targetOnes));

    Juice.squashAndStretch(this, this.flapHundredsBox, 0.16, 130);
    Juice.squashAndStretch(this, this.flapTensBox, 0.16, 130);
    Juice.squashAndStretch(this, this.flapOnesBox, 0.16, 130);

    this.refreshModeButtonsVisuals();
    this.buildRocketStackForCurrentMode();
    this.spawnSkyFuelStarsForMode();
    this.updateMissionHintBanner();

    if (speakTargetImmediately) {
      this.audio.speakNumber(this.targetNumber);
    }
  }

  // ===========================================================================
  // 7. "3... 2... 1... BLAST OFF!" COUNTDOWN & PLAYABLE MULTI-STAGE SPACE ASCENT
  // ===========================================================================

  private createCountdownAndAscentUi(): void {
    // 1. Giant Countdown Overlay (`x: 640, y: 290`)
    this.countdownContainer = this.add.container(640, 290).setDepth(110).setVisible(false);
    const cCircle = this.add.graphics();
    cCircle.fillStyle(0x090d1e, 0.92);
    cCircle.fillCircle(0, 0, 110);
    cCircle.lineStyle(5, 0xfef08a, 1);
    cCircle.strokeCircle(0, 0, 110);
    cCircle.lineStyle(3, 0xef4444, 0.9);
    cCircle.strokeCircle(0, 0, 98);

    this.countdownBigText = this.add
      .text(0, 0, '3', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '96px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#7f1d1d',
        strokeThickness: 8
      })
      .setOrigin(0.5);
    this.countdownContainer.add([cCircle, this.countdownBigText]);

    // 2. Space Ascent Collectibles Layer & Flight HUD
    this.ascentCollectiblesContainer = this.add.container(0, 0).setDepth(24);
    this.ascentHudContainer = this.add.container(0, 0).setDepth(95).setVisible(false);

    const flightBanner = this.add.container(640, 46);
    const fbGfx = this.add.graphics();
    fbGfx.fillStyle(0x090d1e, 0.92);
    fbGfx.fillRoundedRect(-290, -28, 580, 56, 16);
    fbGfx.lineStyle(3, 0x38bdf8, 1);
    fbGfx.strokeRoundedRect(-290, -28, 580, 56, 16);

    this.ascentZoneTitleText = this.add
      .text(0, -6, '🚀 ROCKET ASCENT: DRAG OR TAP TO STEER!', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);

    const subSteerTxt = this.add
      .text(0, 14, '★ COLLECT SHOOTING STARS & SATELLITES ON YOUR WAY TO SPACE! ★', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#38bdf8'
      })
      .setOrigin(0.5);

    flightBanner.add([fbGfx, this.ascentZoneTitleText, subSteerTxt]);
    this.ascentHudContainer.add(flightBanner);

    // Left & Right Tactile Flight Steering Buttons (`x: 92, y: 610` and `x: 1188, y: 610`)
    const steerLeftBtn = this.createSteerButton(92, 610, '◀', () => {
      this.rocketTargetX = Phaser.Math.Clamp(this.rocketTargetX - 135, 220, 1060);
    });
    const steerRightBtn = this.createSteerButton(1188, 610, '▶', () => {
      this.rocketTargetX = Phaser.Math.Clamp(this.rocketTargetX + 135, 220, 1060);
    });
    this.ascentHudContainer.add([steerLeftBtn, steerRightBtn]);

    this.ascentAltitudeBarGfx = this.add.graphics();
    this.ascentHudContainer.add(this.ascentAltitudeBarGfx);
  }

  private createSteerButton(
    x: number,
    y: number,
    symbol: string,
    onTap: () => void
  ): Phaser.GameObjects.Container {
    const btn = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x090d1e, 0.9);
    g.fillCircle(0, 0, 42);
    g.lineStyle(3.5, 0xfef08a, 1);
    g.strokeCircle(0, 0, 42);
    const txt = this.add
      .text(0, 0, symbol, {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    btn.add([g, txt]);
    Juice.makeTactileButton(this, btn, 84, 84, onTap, 'pop');
    return btn;
  }

  private setupSpaceSteeringInput(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.phase === 'SPACE_ASCENT' && pointer.isDown) {
        this.rocketTargetX = Phaser.Math.Clamp(pointer.x, 220, 1060);
      }
    });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.phase === 'SPACE_ASCENT' && pointer.y > 110) {
        this.rocketTargetX = Phaser.Math.Clamp(pointer.x, 220, 1060);
      }
    });
  }

  /**
   * Triggers the hydraulic gantry retraction, billowing launch trench smoke, camera rumble,
   * and "Three... Two... One... Blast off." countdown!
   */
  private triggerBlastOffCountdown(): void {
    if (this.phase !== 'READY_TO_LAUNCH') return;
    this.phase = 'COUNTDOWN_SEQUENCE';

    this.skyStarsContainer.setVisible(false);
    this.ignitionContainer.setVisible(false);
    Object.values(this.stageTanks).forEach((ui) => {
      if (ui) ui.valveContainer.setVisible(false);
    });

    // Retract brass gantry arm outward to the left with hydraulic hiss
    this.audio.playGantryClampsRetract();
    this.tweens.add({
      targets: this.gantrySprite,
      x: 375,
      angle: -22,
      alpha: 0.75,
      duration: 1100,
      ease: 'Back.easeInOut'
    });

    this.countdownContainer.setVisible(true);

    const runStep = (label: string, promptKey: string, delayMs: number) => {
      this.time.delayedCall(delayMs, () => {
        if (this.phase !== 'COUNTDOWN_SEQUENCE') return;
        this.countdownBigText.setText(label);
        this.countdownContainer.setScale(0.5);
        this.tweens.add({
          targets: this.countdownContainer,
          scaleX: 1,
          scaleY: 1,
          duration: 280,
          ease: 'Back.easeOut'
        });
        this.audio.speakPrompt(promptKey);
        this.spawnLaunchTrenchSmokeBurst(10);
        Juice.shake(this, 220, 0.005);
      });
    };

    runStep('3', 'countdown_3', 0);
    runStep('2', 'countdown_2', 950);
    runStep('1', 'countdown_1', 1900);

    this.time.delayedCall(2850, () => {
      if (this.phase !== 'COUNTDOWN_SEQUENCE') return;
      this.countdownBigText.setText('GO!');
      this.audio.speakPrompt('blast_off');
      this.audio.playRocketEngineRoar();
      this.spawnLaunchTrenchSmokeBurst(26);
      Juice.shake(this, 500, 0.009);

      this.time.delayedCall(450, () => {
        this.beginPlayableSpaceAscent();
      });
    });
  }

  private spawnLaunchTrenchSmokeBurst(count: number): void {
    const baseX = this.rocketRootContainer.x;
    const baseY = 595;
    for (let i = 0; i < count; i++) {
      const puff = this.add.circle(
        baseX + Phaser.Math.Between(-65, 65),
        baseY + Phaser.Math.Between(-15, 15),
        Phaser.Math.Between(16, 36),
        i % 3 === 0 ? 0xfef08a : i % 2 === 0 ? 0xe2e8f0 : 0x94a3b8,
        0.85
      );
      this.launchSmokeContainer.add(puff);

      this.tweens.add({
        targets: puff,
        x: puff.x + Phaser.Math.Between(-160, 160),
        y: puff.y - Phaser.Math.Between(25, 110),
        scaleX: 2.3,
        scaleY: 2.3,
        alpha: 0,
        duration: Phaser.Math.Between(520, 920),
        ease: 'Cubic.easeOut',
        onComplete: () => puff.destroy()
      });
    }
  }

  private beginPlayableSpaceAscent(): void {
    this.phase = 'SPACE_ASCENT';
    this.countdownContainer.setVisible(false);
    this.hudContainer.setVisible(false);
    this.ascentHudContainer.setVisible(true);
    this.sparkySprite.setVisible(false);
    this.doggieSprite.setVisible(false);
    this.gantrySprite.setVisible(false);

    // Hide tank readout pills during flight so rocket silhouette is sleek
    Object.values(this.stageTanks).forEach((ui) => {
      if (ui) {
        ui.readoutBadge.setVisible(false);
        ui.valveContainer.setVisible(false);
      }
    });

    this.ascentProgress = 0;
    this.rocketTargetX = 640;
    this.stage1Separated = false;
    this.stage2Separated = false;
    this.awaitingSeparationSlot = null;
    this.bonusStarsCollected = 0;

    this.rocketRootContainer.setPosition(640, 565);
    this.rocketRootContainer.setScale(0.84);

    // Spawn collectible Shooting Stars & Number Satellites for the ascent
    this.ascentCollectiblesContainer.removeAll(true);
    this.ascentCollectibles = [];
    for (let i = 0; i < 14; i++) {
      this.spawnAscentCollectible(-120 - i * 195);
    }
  }

  private spawnAscentCollectible(startY: number): void {
    const isSatellite = Phaser.Math.Between(0, 2) === 0;
    const x = Phaser.Math.Between(240, 1040);
    const container = this.add.container(x, startY);

    const glow = this.add
      .image(0, 0, 'hub-radial-glow')
      .setDisplaySize(96, 96)
      .setTint(isSatellite ? 0x38bdf8 : 0xfef08a)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.5);

    const sprite = this.add
      .image(0, 0, isSatellite ? 'bonus-satellite' : 'fuel-gem-1')
      .setScale(isSatellite ? 0.48 : 0.44);

    const numChoices = [this.targetNumber, 10, 100, 5, 20, 50];
    const numberLabel = numChoices[Phaser.Math.Between(0, numChoices.length - 1)];

    const lbl = this.add
      .text(0, 32, `★ ${numberLabel}`, {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#090d1e',
        strokeThickness: 4
      })
      .setOrigin(0.5);

    container.add([glow, sprite, lbl]);
    this.ascentCollectiblesContainer.add(container);

    this.ascentCollectibles.push({
      id: this.nextStarId++,
      kind: isSatellite ? 'satellite' : 'star',
      numberLabel,
      x,
      y: startY,
      vy: Phaser.Math.Between(250, 310),
      collected: false,
      container
    });
  }

  /**
   * Prompts or executes multi-stage booster separation during space ascent!
   */
  private triggerStageSeparationPrompt(stageSlot: 'STAGE_100' | 'STAGE_10'): void {
    if (this.awaitingSeparationSlot) return;
    this.awaitingSeparationSlot = stageSlot;

    const ringY = stageSlot === 'STAGE_100' ? -135 : this.missionMode === 'COMMANDER' ? -265 : -155;
    this.separationRingContainer.setPosition(0, ringY);
    this.separationRingContainer.setVisible(true);
    this.separationRingContainer.setScale(0.85);

    this.tweens.add({
      targets: this.separationRingContainer,
      scaleX: 1.06,
      scaleY: 1.06,
      duration: 320,
      yoyo: true,
      repeat: 4
    });

    this.audio.speakPrompt('stage_separation');

    // Auto-trigger after 1.9s if the child is busy steering so flight never stalls!
    if (this.separationAutoTimer) {
      this.separationAutoTimer.remove(false);
    }
    this.separationAutoTimer = this.time.delayedCall(1900, () => {
      if (this.awaitingSeparationSlot === stageSlot && this.phase === 'SPACE_ASCENT') {
        this.executeBoosterStageSeparation(stageSlot);
      }
    });
  }

  private executeBoosterStageSeparation(stageSlot: 'STAGE_100' | 'STAGE_10'): void {
    if (this.awaitingSeparationSlot !== stageSlot) return;
    this.awaitingSeparationSlot = null;
    this.separationRingContainer.setVisible(false);

    if (this.separationAutoTimer) {
      this.separationAutoTimer.remove(false);
      this.separationAutoTimer = null;
    }

    if (stageSlot === 'STAGE_100') {
      this.stage1Separated = true;
    } else {
      this.stage2Separated = true;
    }

    this.audio.playStageSeparationPyro();
    Juice.shake(this, 260, 0.006);

    const slotKey: PlaceValueSlot = stageSlot === 'STAGE_100' ? 'HUNDREDS' : 'TENS';
    const tankUi = this.stageTanks[slotKey];
    if (tankUi) {
      tankUi.windowGfx.clear();

      // Spawn a tumbling detached booster sprite falling away into space!
      const worldX = this.rocketRootContainer.x;
      const worldY = this.rocketRootContainer.y + tankUi.baseY * this.rocketRootContainer.scaleY;
      const detached = this.add
        .image(worldX, worldY, tankUi.stageSprite.texture.key)
        .setScale(tankUi.stageSprite.scaleX * this.rocketRootContainer.scaleX)
        .setDepth(25);

      tankUi.stageSprite.setVisible(false);

      Juice.burstStars(this, worldX, worldY - 30, 18, [0xfef08a, 0x38bdf8, 0xef4444]);
      Juice.popFloatingLabel(this, worldX, worldY - 40, '⚡ STAGE SEPARATION!', '#fef08a');

      this.tweens.add({
        targets: detached,
        y: worldY + 340,
        x: worldX + Phaser.Math.Between(-90, 90),
        angle: Phaser.Math.Between(-65, 65),
        alpha: 0,
        duration: 1250,
        ease: 'Quad.easeIn',
        onComplete: () => detached.destroy()
      });
    }
  }

  // ===========================================================================
  // 8. PLANETARY LANDING FINALE & SPACE NUMBER FLAG CELEBRATION
  // ===========================================================================

  private createPlanetaryLandingContainer(): void {
    this.landingContainer = this.add.container(0, 0).setDepth(130).setVisible(false);
  }

  private beginPlanetaryLandingFinale(): void {
    this.phase = 'PLANETARY_LANDING';
    this.ascentHudContainer.setVisible(false);
    this.ascentCollectiblesContainer.removeAll(true);
    this.rocketEngineFlameGfx.clear();
    this.separationRingContainer.setVisible(false);

    this.landingContainer.removeAll(true);
    this.landingContainer.setVisible(true);

    // 1. Deep Starry Space Backdrop Dimmer
    const bgOverlay = this.add.graphics();
    bgOverlay.fillGradientStyle(0x040714, 0x040714, 0x1e1b4b, 0x1e1b4b, 0.95);
    bgOverlay.fillRect(0, 0, 1280, 720);
    this.landingContainer.add(bgOverlay);

    // 2. Destination Planet Surface Sprite & Title
    const planetSpec =
      this.missionMode === 'STAR_HOPPER'
        ? {
            tex: 'planet-cheese-moon',
            title: '🧀 TOUCHDOWN ON THE CHEESE MOON! 🧀',
            prompt: 'landing_cheese_moon'
          }
        : this.missionMode === 'LUNAR_CADET'
        ? {
            tex: 'planet-mars-saturn',
            title: '🪐 TOUCHDOWN ON THE RED CRATERS OF MARS! 🪐',
            prompt: 'landing_mars_saturn'
          }
        : {
            tex: 'planet-crystal-nebula',
            title: '🌌 TOUCHDOWN AT THE CRYSTAL NEBULA STATION! 🌌',
            prompt: 'landing_crystal_nebula'
          };

    const planetGlow = this.add
      .image(640, 505, 'hub-radial-glow')
      .setDisplaySize(720, 380)
      .setTint(0x38bdf8)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.32);

    const planetSurface = this.add
      .image(640, 520, planetSpec.tex)
      .setOrigin(0.5, 0.5)
      .setScale(1.65);

    // 3. Landed Command Capsule, Astronaut Sparky, Space-Helmet Doggie & Glowing Number Flag!
    const landedCapsule = this.add
      .image(455, 385, 'rocket-stage-1')
      .setOrigin(0.5, 0.5)
      .setScale(0.82);

    const sparkyLanding = this.add
      .image(305, 435, 'astro-sparky')
      .setOrigin(0.5, 0.5)
      .setScale(0.68);

    const doggieLanding = this.add
      .image(955, 435, 'astro-doggie')
      .setOrigin(0.5, 0.5)
      .setScale(0.66);

    // Glowing Space Flag Pole & Banner (`x: 715, y: 355`) displaying the exact number built!
    const flagContainer = this.add.container(715, 355);
    const flagSprite = this.add.image(0, 0, 'space-flag').setOrigin(0.5, 0.5).setScale(0.96);

    const flagNumberText = this.add
      .text(24, -46, String(this.targetNumber), {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '54px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#1e1b4b',
        strokeThickness: 8
      })
      .setOrigin(0.5);

    // Place-Value Decomposition Equation on the Flag Banner
    const equationStr =
      this.missionMode === 'STAR_HOPPER'
        ? `${this.targetNumber} ONES`
        : this.missionMode === 'LUNAR_CADET'
        ? `${this.targetTens * 10} + ${this.targetOnes}`
        : `${this.targetHundreds * 100} + ${this.targetTens * 10} + ${this.targetOnes}`;

    const flagEqText = this.add
      .text(24, 2, equationStr, {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#93c5fd',
        stroke: '#090d1e',
        strokeThickness: 4
      })
      .setOrigin(0.5);

    flagContainer.add([flagSprite, flagNumberText, flagEqText]);
    flagContainer.setScale(0.2);

    this.tweens.add({
      targets: flagContainer,
      scaleX: 1,
      scaleY: 1,
      duration: 520,
      ease: 'Back.easeOut'
    });

    // Tapping the Space Flag speaks the number again!
    Juice.makeTactileButton(
      this,
      flagContainer,
      240,
      240,
      () => {
        this.audio.speakNumber(this.targetNumber);
        Juice.burstStars(this, 715, 315, 16, [0xfef08a, 0x38bdf8, 0x34d399]);
      },
      'chime'
    );

    // 4. Top Mission Accomplished Banner & Action Buttons
    const headerCard = this.add.container(640, 95);
    const hcGfx = this.add.graphics();
    hcGfx.fillStyle(0x090d1e, 0.95);
    hcGfx.fillRoundedRect(-420, -52, 840, 104, 22);
    hcGfx.lineStyle(3.5, 0xfbbf24, 1);
    hcGfx.strokeRoundedRect(-420, -52, 840, 104, 22);

    const activeKid = ArcadeState.getActiveKid();
    const t1 = this.add
      .text(0, -16, planetSpec.title, {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '25px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);

    const t2 = this.add
      .text(
        0,
        20,
        `★ ${activeKid.name.toUpperCase()} BUILT ROCKET NUMBER ${this.targetNumber} (${equationStr})! ★`,
        {
          fontFamily: '"Fredoka", sans-serif',
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#34d399'
        }
      )
      .setOrigin(0.5);

    headerCard.add([hcGfx, t1, t2]);

    // Hear Number Button & Next Mission Button (`y: 650`)
    const hearBtn = this.add.container(450, 650);
    const hbGfx = this.add.graphics();
    hbGfx.fillStyle(0x1e3a8a, 0.96);
    hbGfx.fillRoundedRect(-150, -32, 300, 64, 18);
    hbGfx.lineStyle(3, 0x38bdf8, 1);
    hbGfx.strokeRoundedRect(-150, -32, 300, 64, 18);
    const hbTxt = this.add
      .text(0, 0, `🔊 HEAR ${this.targetNumber}`, {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '21px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    hearBtn.add([hbGfx, hbTxt]);
    Juice.makeTactileButton(
      this,
      hearBtn,
      300,
      64,
      () => {
        this.audio.speakNumber(this.targetNumber);
      },
      'chime'
    );

    const nextBtn = this.add.container(830, 650);
    const nbGfx = this.add.graphics();
    nbGfx.fillStyle(0x065f46, 0.96);
    nbGfx.fillRoundedRect(-170, -32, 340, 64, 18);
    nbGfx.lineStyle(3, 0xfef08a, 1);
    nbGfx.strokeRoundedRect(-170, -32, 340, 64, 18);
    const nbTxt = this.add
      .text(0, 0, '🚀 NEXT SPACE MISSION ▶', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '21px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    nextBtn.add([nbGfx, nbTxt]);
    Juice.makeTactileButton(
      this,
      nextBtn,
      340,
      64,
      () => {
        this.startNewMission(true);
      },
      'fanfare'
    );

    this.landingContainer.add([
      planetGlow,
      planetSurface,
      landedCapsule,
      sparkyLanding,
      doggieLanding,
      flagContainer,
      headerCard,
      hearBtn,
      nextBtn
    ]);

    // Award stars, burst celebratory fireworks & play fanfare + landing narration + number readout!
    ArcadeState.addStars(3);
    this.audio.playPlanetFlagFanfare();
    Juice.burstStars(this, 640, 320, 32, [0xfef08a, 0x38bdf8, 0x34d399, 0xf472b6]);

    this.time.delayedCall(450, () => {
      if (this.phase !== 'PLANETARY_LANDING') return;
      this.audio.speakPrompt(planetSpec.prompt, () => {
        if (this.phase === 'PLANETARY_LANDING') {
          this.audio.speakNumber(this.targetNumber);
        }
      });
    });
  }

  // ===========================================================================
  // 9. FRAME UPDATE LOOP (SKY STAR BOBBING & SPACE ASCENT FLIGHT PHYSICS)
  // ===========================================================================

  public update(time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);

    // 1. Gentle floating bob for Sky Fuel Stars on the launchpad
    if (this.phase === 'FUELING_PAD' || this.phase === 'READY_TO_LAUNCH') {
      const tSec = time * 0.0025;
      for (const star of this.skyStars) {
        if (!star.isBusy) {
          star.container.y = star.baseY + Math.sin(tSec + star.bobPhase) * 7;
        }
      }
    }

    // 2. Active Rocket Engine Plume during Countdown & Space Ascent
    if (this.phase === 'COUNTDOWN_SEQUENCE' || this.phase === 'SPACE_ASCENT') {
      this.drawActiveRocketFlamePlume(time);
    }

    // 3. Playable Vertical Space Flight & Stage Separations
    if (this.phase === 'SPACE_ASCENT') {
      this.ascentProgress = Math.min(1, this.ascentProgress + dt * 0.145);
      this.drawSkyGradientForAltitude(this.ascentProgress);

      // Scroll launchpad downward out of view during first 25% of ascent
      if (this.ascentProgress < 0.28) {
        this.launchpadBgImage.setY(360 + this.ascentProgress * 1450);
        this.launchpadBgImage.setAlpha(Math.max(0, 1 - this.ascentProgress * 3.6));
      } else {
        this.launchpadBgImage.setVisible(false);
      }

      // Smooth horizontal steering toward pointer/button target X
      const prevX = this.rocketRootContainer.x;
      this.rocketRootContainer.x = Phaser.Math.Linear(prevX, this.rocketTargetX, dt * 8.5);
      const tilt = Phaser.Math.Clamp((this.rocketTargetX - prevX) * 0.18, -14, 14);
      this.rocketRootContainer.setAngle(tilt);
      this.rocketRootContainer.y = 530 - Math.sin(this.ascentProgress * Math.PI) * 55;

      // Update Zone Banner & Altitude Bar
      this.updateAscentZoneBannerAndBar();

      // Trigger Multi-Stage Booster Separation rings at altitude milestones!
      if (this.missionMode === 'COMMANDER') {
        if (!this.stage1Separated && this.ascentProgress >= 0.32) {
          this.triggerStageSeparationPrompt('STAGE_100');
        } else if (this.stage1Separated && !this.stage2Separated && this.ascentProgress >= 0.65) {
          this.triggerStageSeparationPrompt('STAGE_10');
        }
      } else if (this.missionMode === 'LUNAR_CADET') {
        if (!this.stage2Separated && this.ascentProgress >= 0.48) {
          this.triggerStageSeparationPrompt('STAGE_10');
        }
      }

      // Move & collect Shooting Stars & Number Satellites
      for (const item of this.ascentCollectibles) {
        if (item.collected) continue;
        item.y += item.vy * dt;
        item.container.setPosition(item.x, item.y);

        const dist = Phaser.Math.Distance.Between(
          this.rocketRootContainer.x,
          this.rocketRootContainer.y - 140,
          item.x,
          item.y
        );
        if (dist < 105) {
          item.collected = true;
          item.container.setVisible(false);
          this.bonusStarsCollected++;
          AudioBus.playSfx('chime');
          Juice.burstStars(this, item.x, item.y, 12, [0xfef08a, 0x38bdf8, 0x34d399]);
          Juice.popFloatingLabel(this, item.x, item.y - 20, `★ +${item.numberLabel}!`, '#fef08a');
        }
      }

      if (this.ascentProgress >= 1) {
        this.beginPlanetaryLandingFinale();
      }
    }
  }

  private drawActiveRocketFlamePlume(time: number): void {
    this.rocketEngineFlameGfx.clear();

    // Determine bottom of currently attached lowest stage
    let nozzleY = -12;
    if (this.missionMode === 'COMMANDER') {
      nozzleY = !this.stage1Separated ? 35 : !this.stage2Separated ? -115 : -245;
    } else if (this.missionMode === 'LUNAR_CADET') {
      nozzleY = !this.stage2Separated ? 5 : -148;
    } else {
      nozzleY = -8;
    }

    const flicker = Math.sin(time * 0.045) * 14;
    const outerLen = 95 + flicker;
    const innerLen = 58 + flicker * 0.6;

    const flameColor =
      this.missionMode === 'COMMANDER' && !this.stage1Separated
        ? COLOR_HUNDREDS
        : this.missionMode !== 'STAR_HOPPER' && !this.stage2Separated
        ? COLOR_TENS
        : 0xf97316;

    this.rocketEngineFlameGfx.fillStyle(flameColor, 0.85);
    this.rocketEngineFlameGfx.fillTriangle(-32, nozzleY, 32, nozzleY, 0, nozzleY + outerLen);
    this.rocketEngineFlameGfx.fillStyle(0xfef08a, 0.95);
    this.rocketEngineFlameGfx.fillTriangle(-18, nozzleY, 18, nozzleY, 0, nozzleY + innerLen);
  }

  private updateAscentZoneBannerAndBar(): void {
    const p = this.ascentProgress;
    let zoneName = 'NIGHT LAUNCHPAD';
    if (p >= 0.8) zoneName = '🌌 DEEP SPACE NEBULA';
    else if (p >= 0.55) zoneName = '🛰️ EARTH ORBIT';
    else if (p >= 0.28) zoneName = '🌠 UPPER STRATOSPHERE';
    else if (p >= 0.1) zoneName = '☁️ FLUFFY STARLIGHT CLOUDS';

    this.ascentZoneTitleText.setText(
      `🚀 ${zoneName} — MISSION NUMBER ${this.targetNumber}`
    );

    // Draw vertical altitude progress bar on far left (`x: 38, y: 150..500`)
    this.ascentAltitudeBarGfx.clear();
    const bx = 32;
    const by = 150;
    const bw = 18;
    const bh = 340;
    this.ascentAltitudeBarGfx.fillStyle(0x090d1e, 0.88);
    this.ascentAltitudeBarGfx.fillRoundedRect(bx, by, bw, bh, 9);
    const fillH = Math.round(bh * p);
    this.ascentAltitudeBarGfx.fillStyle(0x34d399, 0.95);
    this.ascentAltitudeBarGfx.fillRoundedRect(bx + 3, by + bh - fillH, bw - 6, fillH, 6);
    this.ascentAltitudeBarGfx.lineStyle(2, 0xfef08a, 1);
    this.ascentAltitudeBarGfx.strokeRoundedRect(bx, by, bw, bh, 9);
  }
}
