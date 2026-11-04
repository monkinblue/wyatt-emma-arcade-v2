import Phaser from 'phaser';
import { ArcadeState } from '../core/ArcadeState';
import { AudioBus } from '../core/AudioBus';
import { Juice } from '../core/Juice';
import { CloudKartAudioEngine } from '../audio/CloudKartAudioEngine';
import {
  NormalizedPoint,
  PenmanshipEngine,
  RecordedHandwritingSample
} from '../core/PenmanshipEngine';

type KartGamePhase =
  | 'RACE_DRIVING'
  | 'GATE_APPROACHING'
  | 'SKY_GATE_PENMANSHIP'
  | 'ADMIRE_WRITING'
  | 'GATE_TURBO_LAUNCH'
  | 'FINISH_ARCH_SPRINT'
  | 'PODIUM_CELEBRATION';

type CharacterSetMode = 'UPPERCASE' | 'LOWERCASE' | 'NUMBERS' | 'MIXED';
type OrderMode = 'SEQUENTIAL' | 'RANDOM';
type CorridorWidthMode = 'PRECISION' | 'COZY';

interface TrackObject {
  id: number;
  kind: 'coin' | 'boost' | 'ramp';
  lane: number;
  x: number;
  y: number;
  collected: boolean;
  sprite: Phaser.GameObjects.Image;
  glow?: Phaser.GameObjects.Image;
}

interface RivalKartActor {
  id: 'sparky' | 'doggie';
  lane: number;
  targetLane: number;
  baseX: number;
  x: number;
  y: number;
  bobPhase: number;
  laneTimer: number;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Graphics;
}

const UPPERCASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const LOWERCASE_CHARS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const NUMBER_CHARS = '0123456789'.split('');
const LANE_YS = [476, 554, 632];
const GATES_PER_RACE = 3;

const RAINBOW_COLORS = [
  0xef4444, // Red
  0xf97316, // Orange
  0xfacc15, // Gold
  0x10b981, // Emerald
  0x38bdf8, // Sky Blue
  0xa855f7  // Amethyst
];

/**
 * Zoomy Cloud Kart (`CloudKartScene.ts`)
 * ======================================
 * A 32-bit Hi-Bit Pixel Art arcade kart racing and strict multi-stroke penmanship
 * game set on the Rainbow Hill Skyway for Wyatt (age 4) and Emma (age 3).
 *
 * Clean Stage Rule:
 * - `cloudkart-stage-bg` is a 100% clean sky-island & cobblestone highway backdrop.
 * - All karts, clouds, coins, boost pads, ramps, Sky-Gates, flags, guide corridors,
 *   and persistent hand-drawn freehand ink strokes are live Phaser layers.
 */
export class CloudKartScene extends Phaser.Scene {
  private audio!: CloudKartAudioEngine;
  private penmanship!: PenmanshipEngine;
  private phase: KartGamePhase = 'RACE_DRIVING';

  // Settings & Modes
  private charSetMode: CharacterSetMode = 'UPPERCASE';
  private orderMode: OrderMode = 'SEQUENTIAL';
  private corridorMode: CorridorWidthMode = 'PRECISION';
  private sequentialCursor = 0;

  // Race & Gate State (3 Gates per race)
  private currentGateIndex = 0; // 0, 1, 2
  private gateTargets: string[] = ['A', 'B', 'C'];
  private completedGateSamples: Array<RecordedHandwritingSample | null> = [null, null, null];
  private raceCoinsCollected = 0;
  private coinCombo = 0;

  // Driving Physics & Track State
  private heroLane = 1;
  private heroTargetY = LANE_YS[1];
  private heroCurrentY = LANE_YS[1];
  private heroJumpZ = 0;
  private heroJumpVelZ = 0;
  private trackSpeed = 380;
  private baseTrackSpeed = 380;
  private turboBoostTimer = 0;
  private legDistanceRemaining = 2400;
  private trackScrollOffset = 0;
  private nextSpawnX = 480;
  private nextTrackObjId = 1;

  // Parallax & Track Visual Layers
  private skyClouds: Phaser.GameObjects.Image[] = [];
  private trackStripeGfx!: Phaser.GameObjects.Graphics;
  private trackObjectsContainer!: Phaser.GameObjects.Container;
  private trackObjects: TrackObject[] = [];
  private approachingGateSprite!: Phaser.GameObjects.Image;
  private finishArchSprite!: Phaser.GameObjects.Image;

  // Hero Kart & Friendly Rivals
  private heroContainer!: Phaser.GameObjects.Container;
  private heroShadowGfx!: Phaser.GameObjects.Graphics;
  private heroKartSprite!: Phaser.GameObjects.Image;
  private heroExhaustGfx!: Phaser.GameObjects.Graphics;
  private rivalKarts: RivalKartActor[] = [];

  // Top HUD & 3-Gate Trophy Progress Bar
  private hudContainer!: Phaser.GameObjects.Container;
  private charSetBtnLabel!: Phaser.GameObjects.Text;
  private charSetBtnSub!: Phaser.GameObjects.Text;
  private orderBtnLabel!: Phaser.GameObjects.Text;
  private orderBtnSub!: Phaser.GameObjects.Text;
  private corridorBtnLabel!: Phaser.GameObjects.Text;
  private corridorBtnSub!: Phaser.GameObjects.Text;
  private coinCountText!: Phaser.GameObjects.Text;
  private trophySlotContainers: Phaser.GameObjects.Container[] = [];
  private trophySlotInkGfx: Phaser.GameObjects.Graphics[] = [];
  private trophySlotPlaceholderTexts: Phaser.GameObjects.Text[] = [];

  // Driving Controls HUD
  private drivingControlsContainer!: Phaser.GameObjects.Container;
  private raceBannerText!: Phaser.GameObjects.Text;

  // Sky-Gate Penmanship Modal & Live Ink Canvas
  private skyGateModalContainer!: Phaser.GameObjects.Container;
  private skyGateBoardGfx!: Phaser.GameObjects.Graphics;
  private guideTrackGfx!: Phaser.GameObjects.Graphics;
  private offTrackAlertGfx!: Phaser.GameObjects.Graphics;
  private authenticInkGfx!: Phaser.GameObjects.Graphics;
  private startFlagSprite!: Phaser.GameObjects.Image;
  private startFlagRingGfx!: Phaser.GameObjects.Graphics;
  private finishFlagSprite!: Phaser.GameObjects.Image;
  private finishFlagRingGfx!: Phaser.GameObjects.Graphics;
  private ghostGuideQuill!: Phaser.GameObjects.Image;
  private liveFingerQuill!: Phaser.GameObjects.Image;
  private gateHeaderText!: Phaser.GameObjects.Text;
  private gateStrokeStepText!: Phaser.GameObjects.Text;
  private gateHintBannerText!: Phaser.GameObjects.Text;
  private eraserBtnContainer!: Phaser.GameObjects.Container;

  // Penmanship Animation State
  private readonly canvasCenterX = 640;
  private readonly canvasCenterY = 392;
  private readonly canvasBoxSize = 376;
  private isPointerDownOnCanvas = false;
  private guidePulseTime = 0;
  private offTrackFlashTimer = 0;
  private lastStartFlagReminderAt = 0;

  // Podium Celebration Modal
  private podiumContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'CloudKartScene' });
  }

  public create(): void {
    this.audio = new CloudKartAudioEngine();

    const activeKid = ArcadeState.getActiveKid();
    this.corridorMode = activeKid.id === 'emma' ? 'COZY' : 'PRECISION';
    const initialRadius = this.corridorMode === 'COZY' ? 55 : 38;

    this.penmanship = new PenmanshipEngine(
      this.canvasCenterX,
      this.canvasCenterY,
      this.canvasBoxSize,
      initialRadius
    );

    this.applyNearestFilterToTextures();
    this.createSkywayStageAndParallax();
    this.createTrackSurfaceAndActors();
    this.createHeroAndRivalKarts();
    this.createTopHudAndTrophyBar();
    this.createDrivingHudControls();
    this.createSkyGatePenmanshipModal();
    this.createPodiumCelebrationModal();
    this.setupStageTouchInput();

    this.startNewRace(false);

    this.cameras.main.fadeIn(260, 12, 18, 38);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.audio.stopVoice();
    });
  }

  private applyNearestFilterToTextures(): void {
    const keys = [
      'cloudkart-stage-bg',
      'kart-wyatt',
      'kart-emma',
      'kart-sparky',
      'kart-doggie',
      'spr-sky-gate',
      'spr-flag-start',
      'spr-flag-finish',
      'spr-boost-pad',
      'spr-cloud-ramp',
      'spr-star-coin',
      'spr-quill-kart',
      'spr-eraser-sponge',
      'spr-trophy-podium',
      'spr-golden-cup',
      'spr-cloud-puff',
      'spr-finish-arch'
    ];
    keys.forEach((k) => {
      if (this.textures.exists(k)) {
        this.textures.get(k).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    });
  }

  // ===========================================================================
  // 1. CLEAN-STAGE SKYWAY BACKDROP, PARALLAX CLOUDS & 3-LANE TRACK
  // ===========================================================================

  private createSkywayStageAndParallax(): void {
    if (this.textures.exists('cloudkart-stage-bg')) {
      this.add.image(640, 360, 'cloudkart-stage-bg').setDisplaySize(1280, 720).setDepth(1);
    } else {
      const fallback = this.add.graphics().setDepth(1);
      fallback.fillGradientStyle(0x0284c7, 0x0284c7, 0x38bdf8, 0x38bdf8, 1);
      fallback.fillRect(0, 0, 1280, 400);
      fallback.fillStyle(0x16a34a, 1);
      fallback.fillRect(0, 400, 1280, 320);
    }

    // Parallax drifting cumulus cloud puffs in the upper sky
    this.skyClouds = [];
    const cloudConfigs = [
      { x: 180, y: 115, scale: 0.55, alpha: 0.82 },
      { x: 540, y: 88, scale: 0.44, alpha: 0.72 },
      { x: 920, y: 128, scale: 0.62, alpha: 0.85 },
      { x: 1210, y: 96, scale: 0.48, alpha: 0.76 }
    ];
    cloudConfigs.forEach((cfg) => {
      if (this.textures.exists('spr-cloud-puff')) {
        const cl = this.add
          .image(cfg.x, cfg.y, 'spr-cloud-puff')
          .setScale(cfg.scale)
          .setAlpha(cfg.alpha)
          .setDepth(2);
        this.skyClouds.push(cl);
      }
    });

    // Dynamic scrolling road lane dividers & rainbow curb shimmer
    this.trackStripeGfx = this.add.graphics().setDepth(4);
  }

  private createTrackSurfaceAndActors(): void {
    this.trackObjectsContainer = this.add.container(0, 0).setDepth(10);

    // Approaching Sky-Gate Archway on the track (scrolls in when leg completes)
    this.approachingGateSprite = this.add
      .image(1480, 520, 'spr-sky-gate')
      .setOrigin(0.5, 0.85)
      .setScale(1.18)
      .setDepth(14)
      .setVisible(false);

    // Grand Checkered Finish Archway (scrolls in after Gate 3)
    this.finishArchSprite = this.add
      .image(1480, 525, 'spr-finish-arch')
      .setOrigin(0.5, 0.85)
      .setScale(1.22)
      .setDepth(14)
      .setVisible(false);
  }

  private createHeroAndRivalKarts(): void {
    // 1. Friendly Rival Karts: Sparky (top lane) & Doggie (bottom lane)
    this.rivalKarts = [];
    const rivalSpecs: Array<{
      id: 'sparky' | 'doggie';
      tex: string;
      lane: number;
      baseX: number;
    }> = [
      { id: 'sparky', tex: 'kart-sparky', lane: 0, baseX: 465 },
      { id: 'doggie', tex: 'kart-doggie', lane: 2, baseX: 425 }
    ];

    rivalSpecs.forEach((spec, idx) => {
      const container = this.add.container(spec.baseX, LANE_YS[spec.lane]).setDepth(16 + spec.lane);
      const shadow = this.add.graphics();
      shadow.fillStyle(0x090d16, 0.38);
      shadow.fillEllipse(0, 42, 132, 24);

      const sprite = this.add
        .image(0, 0, spec.tex)
        .setOrigin(0.5, 0.58)
        .setScale(0.62)
        .setInteractive({ useHandCursor: true });

      sprite.on('pointerdown', () => {
        if (this.phase !== 'RACE_DRIVING') return;
        AudioBus.playSfx(spec.id === 'sparky' ? 'sparky' : 'doggie');
        Juice.squashAndStretch(this, sprite, 0.16, 160);
        Juice.burstStars(this, container.x, container.y - 35, 10, [0xfef08a, 0x38bdf8, 0xffffff]);
      });

      container.add([shadow, sprite]);
      this.rivalKarts.push({
        id: spec.id,
        lane: spec.lane,
        targetLane: spec.lane,
        baseX: spec.baseX,
        x: spec.baseX,
        y: LANE_YS[spec.lane],
        bobPhase: idx * 1.7,
        laneTimer: 3200 + idx * 1400,
        container,
        sprite,
        shadow
      });
    });

    // 2. Hero Cloud Kart (Wyatt or Emma in the Crimson & Brass Winged Roadster)
    this.heroContainer = this.add.container(255, LANE_YS[1]).setDepth(20);

    this.heroShadowGfx = this.add.graphics();
    this.heroShadowGfx.fillStyle(0x090d16, 0.44);
    this.heroShadowGfx.fillEllipse(0, 46, 152, 26);

    this.heroExhaustGfx = this.add.graphics();

    const activeKid = ArcadeState.getActiveKid();
    const heroTex = activeKid.id === 'emma' ? 'kart-emma' : 'kart-wyatt';
    this.heroKartSprite = this.add
      .image(0, 0, heroTex)
      .setOrigin(0.5, 0.58)
      .setScale(0.72)
      .setInteractive({ useHandCursor: true });

    this.heroKartSprite.on('pointerdown', () => {
      if (this.phase !== 'RACE_DRIVING') return;
      this.triggerManualMiniBoost();
    });

    this.heroContainer.add([this.heroShadowGfx, this.heroExhaustGfx, this.heroKartSprite]);
  }

  // ===========================================================================
  // 2. TOP HUD, VISUAL MODE BUTTONS & 3-GATE HANDWRITING TROPHY BAR
  // ===========================================================================

  private createTopHudAndTrophyBar(): void {
    this.hudContainer = this.add.container(0, 0).setDepth(90);

    // 1. Top-Left Home / Bookshelf Button (68x68 hit area)
    const homeBtn = this.add.container(48, 42);
    const homeBg = this.add.graphics();
    homeBg.fillStyle(0x1e1b4b, 0.94);
    homeBg.fillCircle(0, 0, 30);
    homeBg.lineStyle(3, 0xfbbf24, 1);
    homeBg.strokeCircle(0, 0, 30);
    homeBg.lineStyle(1.5, 0xfef08a, 0.7);
    homeBg.strokeCircle(0, 0, 25);
    homeBtn.add(homeBg);

    if (this.textures.exists('ui-back')) {
      const icon = this.add.image(0, 0, 'ui-back').setDisplaySize(38, 38);
      homeBtn.add(icon);
    } else {
      const txt = this.add
        .text(0, 0, '🏠', { fontSize: '26px' })
        .setOrigin(0.5);
      homeBtn.add(txt);
    }

    Juice.makeTactileButton(
      this,
      homeBtn,
      68,
      68,
      () => {
        this.audio.stopVoice();
        this.scene.start('HubScene');
      },
      'pop'
    );
    this.hudContainer.add(homeBtn);

    // 2. Character Set Toggle Button (`ABC` / `123` / `ABC+123`) at x: 162, y: 42
    const charSetBtn = this.createOrnateHudPill(162, 42, 128, 56, () => {
      this.cycleCharacterSetMode();
    });
    this.charSetBtnLabel = charSetBtn.mainText;
    this.charSetBtnSub = charSetBtn.subText;
    this.hudContainer.add(charSetBtn.container);

    // 3. Sequential vs Random Toggle Button at x: 302, y: 42
    const orderBtn = this.createOrnateHudPill(302, 42, 128, 56, () => {
      this.toggleOrderMode();
    });
    this.orderBtnLabel = orderBtn.mainText;
    this.orderBtnSub = orderBtn.subText;
    this.hudContainer.add(orderBtn.container);

    // 4. Center Top Race Progress Trophy Bar (`[ Gate 1 ] [ Gate 2 ] [ Gate 3 ]`) at x: 635, y: 42
    this.createCenterTrophyProgressBar(635, 42);

    // 5. Corridor Width Precision Toggle (`Wyatt 38px` vs `Emma 55px`) at x: 985, y: 42
    const corridorBtn = this.createOrnateHudPill(985, 42, 148, 56, () => {
      this.toggleCorridorWidthMode();
    });
    this.corridorBtnLabel = corridorBtn.mainText;
    this.corridorBtnSub = corridorBtn.subText;
    this.hudContainer.add(corridorBtn.container);

    // 6. Star Coin Counter Plaque at x: 1138, y: 42
    const coinPlaque = this.add.container(1138, 42);
    const coinBg = this.add.graphics();
    coinBg.fillStyle(0x1e1b4b, 0.94);
    coinBg.fillRoundedRect(-58, -26, 116, 52, 14);
    coinBg.lineStyle(2.5, 0xfbbf24, 1);
    coinBg.strokeRoundedRect(-58, -26, 116, 52, 14);
    coinPlaque.add(coinBg);

    if (this.textures.exists('spr-star-coin')) {
      const coinIcon = this.add.image(-28, 0, 'spr-star-coin').setDisplaySize(34, 34);
      coinPlaque.add(coinIcon);
    }
    this.coinCountText = this.add
      .text(14, 0, '0', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#0f172a',
        strokeThickness: 4
      })
      .setOrigin(0.5);
    coinPlaque.add(this.coinCountText);
    this.hudContainer.add(coinPlaque);

    // 7. Mute Button at top-right (x: 1236, y: 42)
    const muteBtn = this.add.container(1236, 42);
    const muteBg = this.add.graphics();
    muteBg.fillStyle(0x1e1b4b, 0.92);
    muteBg.fillCircle(0, 0, 26);
    muteBg.lineStyle(2.5, 0xfbbf24, 0.95);
    muteBg.strokeCircle(0, 0, 26);
    const muteTxt = this.add
      .text(0, 0, AudioBus.getMuted() ? '🔇' : '🔊', { fontSize: '20px' })
      .setOrigin(0.5);
    muteBtn.add([muteBg, muteTxt]);
    Juice.makeTactileButton(
      this,
      muteBtn,
      64,
      64,
      () => {
        const muted = AudioBus.toggleMute();
        muteTxt.setText(muted ? '🔇' : '🔊');
        if (muted) this.audio.stopVoice();
      },
      'pop'
    );
    this.hudContainer.add(muteBtn);

    this.refreshHudButtonLabels();
  }

  private createOrnateHudPill(
    x: number,
    y: number,
    w: number,
    h: number,
    onTap: () => void
  ): {
    container: Phaser.GameObjects.Container;
    mainText: Phaser.GameObjects.Text;
    subText: Phaser.GameObjects.Text;
  } {
    const container = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x090d16, 0.5);
    g.fillRoundedRect(-w / 2 + 2, -h / 2 + 3, w, h, 14);
    g.fillStyle(0x1e1b4b, 0.95);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    g.lineStyle(2.5, 0xf59e0b, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    g.lineStyle(1, 0xfef08a, 0.65);
    g.strokeRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 11);

    const mainText = this.add
      .text(0, -8, '', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#0f172a',
        strokeThickness: 3
      })
      .setOrigin(0.5);

    const subText = this.add
      .text(0, 12, '', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#38bdf8'
      })
      .setOrigin(0.5);

    container.add([g, mainText, subText]);
    Juice.makeTactileButton(this, container, Math.max(68, w), Math.max(64, h), onTap, 'tab');
    return { container, mainText, subText };
  }

  /**
   * Builds the Top Race Progress Trophy Bar (`[ Gate 1 ] [ Gate 2 ] [ Gate 3 ]`)
   * where each gate stamps the child's EXACT authentic hand-drawn letter/number!
   */
  private createCenterTrophyProgressBar(cx: number, cy: number): void {
    const barW = 480;
    const barH = 64;
    const barContainer = this.add.container(cx, cy);

    const bg = this.add.graphics();
    bg.fillStyle(0x090d16, 0.55);
    bg.fillRoundedRect(-barW / 2 + 2, -barH / 2 + 3, barW, barH, 16);
    bg.fillStyle(0x172554, 0.96);
    bg.fillRoundedRect(-barW / 2, -barH / 2, barW, barH, 16);
    bg.lineStyle(3, 0xfbbf24, 1);
    bg.strokeRoundedRect(-barW / 2, -barH / 2, barW, barH, 16);
    barContainer.add(bg);

    this.trophySlotContainers = [];
    this.trophySlotInkGfx = [];
    this.trophySlotPlaceholderTexts = [];

    const slotXs = [-148, 0, 148];
    for (let i = 0; i < GATES_PER_RACE; i++) {
      const slot = this.add.container(slotXs[i], 0);
      const slotW = 132;
      const slotH = 50;

      const sg = this.add.graphics();
      sg.fillStyle(0x0f172a, 0.95);
      sg.fillRoundedRect(-slotW / 2, -slotH / 2, slotW, slotH, 10);
      sg.lineStyle(2, 0x38bdf8, 0.85);
      sg.strokeRoundedRect(-slotW / 2, -slotH / 2, slotW, slotH, 10);

      const gateLabel = this.add
        .text(-slotW / 2 + 10, 0, `GATE ${i + 1}`, {
          fontFamily: '"Fredoka", sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#93c5fd'
        })
        .setOrigin(0, 0.5);

      // Authentic hand-drawn stamp frame on the right half of the slot (`x: +30, y: 0`, `42x42`)
      const stampFrame = this.add.graphics();
      stampFrame.fillStyle(0x1e293b, 1);
      stampFrame.fillRoundedRect(6, -21, 44, 42, 7);
      stampFrame.lineStyle(1.5, 0xfacc15, 0.9);
      stampFrame.strokeRoundedRect(6, -21, 44, 42, 7);

      const placeholderTxt = this.add
        .text(28, 0, '?', {
          fontFamily: '"Fredoka", sans-serif',
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#475569'
        })
        .setOrigin(0.5);

      const inkGfx = this.add.graphics();

      slot.add([sg, gateLabel, stampFrame, placeholderTxt, inkGfx]);

      // Tapping a completed trophy slot pronounces that character and sparkles!
      const hit = this.add
        .zone(0, 0, slotW, 64)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        const ch = this.gateTargets[i];
        if (ch) {
          this.audio.speakCharacter(ch);
          Juice.squashAndStretch(this, slot, 0.14, 140);
          Juice.burstStars(this, cx + slotXs[i] + 28, cy, 8, [0xfef08a, 0x38bdf8]);
        }
      });
      slot.add(hit);

      barContainer.add(slot);
      this.trophySlotContainers.push(slot);
      this.trophySlotInkGfx.push(inkGfx);
      this.trophySlotPlaceholderTexts.push(placeholderTxt);
    }

    this.hudContainer.add(barContainer);
  }

  private createDrivingHudControls(): void {
    this.drivingControlsContainer = this.add.container(0, 0).setDepth(85);

    // 1. Left-side Lane Steer Up (▲) & Down (▼) Tactile Buttons (for easy 1-tap lane changes)
    const upBtn = this.createSteerArrowButton(66, 505, '▲', () => {
      this.steerHeroLane(-1);
    });
    const downBtn = this.createSteerArrowButton(66, 615, '▼', () => {
      this.steerHeroLane(1);
    });
    this.drivingControlsContainer.add([upBtn, downBtn]);

    // 2. Right-side Rainbow Horn / Turbo Boost Button (`⚡ BOOST`) & Quick Gate Button (`✏️ GATE`)
    const boostBtn = this.add.container(1196, 608);
    const bGfx = this.add.graphics();
    bGfx.fillStyle(0x090d16, 0.55);
    bGfx.fillCircle(2, 4, 46);
    bGfx.fillStyle(0xd97706, 1);
    bGfx.fillCircle(0, 0, 44);
    bGfx.lineStyle(4, 0xfef08a, 1);
    bGfx.strokeCircle(0, 0, 44);
    const boostIcon = this.add
      .text(0, -8, '🎺', { fontSize: '30px' })
      .setOrigin(0.5);
    const boostLbl = this.add
      .text(0, 20, 'TURBO', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#451a03',
        strokeThickness: 3
      })
      .setOrigin(0.5);
    boostBtn.add([bGfx, boostIcon, boostLbl]);
    Juice.makeTactileButton(
      this,
      boostBtn,
      92,
      92,
      () => {
        this.triggerManualMiniBoost();
      },
      'horn'
    );
    this.drivingControlsContainer.add(boostBtn);

    // Quick "Jump to Sky-Gate" button right above Turbo so impatient kids can jump straight to writing
    const writeNowBtn = this.add.container(1196, 502);
    const wGfx = this.add.graphics();
    wGfx.fillStyle(0x090d16, 0.5);
    wGfx.fillRoundedRect(-52, -32, 108, 64, 16);
    wGfx.fillStyle(0x0284c7, 0.96);
    wGfx.fillRoundedRect(-54, -34, 108, 64, 16);
    wGfx.lineStyle(3, 0xfef08a, 1);
    wGfx.strokeRoundedRect(-54, -34, 108, 64, 16);
    const wIcon = this.add.image(-24, 0, 'spr-quill-kart').setDisplaySize(36, 36);
    const wTxt = this.add
      .text(18, 0, 'WRITE\nGATE', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fef08a',
        align: 'center',
        stroke: '#0f172a',
        strokeThickness: 3
      })
      .setOrigin(0.5);
    writeNowBtn.add([wGfx, wIcon, wTxt]);
    Juice.makeTactileButton(
      this,
      writeNowBtn,
      108,
      68,
      () => {
        if (this.phase === 'RACE_DRIVING') {
          this.legDistanceRemaining = 0;
        }
      },
      'chime'
    );
    this.drivingControlsContainer.add(writeNowBtn);

    // 3. Floating Race Status Pill Banner above the road (`x: 640, y: 106`)
    const bannerPill = this.add.container(640, 104);
    const bpGfx = this.add.graphics();
    bpGfx.fillStyle(0x0f172a, 0.86);
    bpGfx.fillRoundedRect(-250, -20, 500, 40, 20);
    bpGfx.lineStyle(2, 0xfbbf24, 0.9);
    bpGfx.strokeRoundedRect(-250, -20, 500, 40, 20);
    this.raceBannerText = this.add
      .text(0, 0, '★ STEER YOUR KART & COLLECT STAR COINS! ★', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    bannerPill.add([bpGfx, this.raceBannerText]);
    this.drivingControlsContainer.add(bannerPill);
  }

  private createSteerArrowButton(
    x: number,
    y: number,
    symbol: string,
    onTap: () => void
  ): Phaser.GameObjects.Container {
    const btn = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x090d16, 0.55);
    g.fillCircle(2, 3, 38);
    g.fillStyle(0x1e1b4b, 0.94);
    g.fillCircle(0, 0, 36);
    g.lineStyle(3, 0xfbbf24, 1);
    g.strokeCircle(0, 0, 36);

    const txt = this.add
      .text(0, 0, symbol, {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#0f172a',
        strokeThickness: 4
      })
      .setOrigin(0.5);

    btn.add([g, txt]);
    Juice.makeTactileButton(this, btn, 76, 76, onTap, 'pop');
    return btn;
  }

  // ===========================================================================
  // 3. SKY-GATE PENMANSHIP MODAL & PERSISTENT LIVE INK CANVAS
  // ===========================================================================

  private createSkyGatePenmanshipModal(): void {
    this.skyGateModalContainer = this.add.container(0, 0).setDepth(120).setVisible(false);

    // Soft sky backdrop dimmer so the Sky-Writing Canvas Gate pops with crystal clarity
    const dimBg = this.add.graphics();
    dimBg.fillStyle(0x090d16, 0.52);
    dimBg.fillRect(0, 80, 1280, 640);
    this.skyGateModalContainer.add(dimBg);

    // Left & Right Ornate Sky-Gate Pillars framing the central writing board
    if (this.textures.exists('spr-sky-gate')) {
      const leftPillar = this.add
        .image(258, 415, 'spr-sky-gate')
        .setScale(1.08)
        .setAlpha(0.96);
      const rightPillar = this.add
        .image(1022, 415, 'spr-sky-gate')
        .setScale(1.08)
        .setFlipX(true)
        .setAlpha(0.96);
      this.skyGateModalContainer.add([leftPillar, rightPillar]);
    }

    // Central Sky-Writing Slate Board (`440x440` outer frame around `376x376` writing canvas)
    this.skyGateBoardGfx = this.add.graphics();
    this.drawSkyGateSlateBoard(false);
    this.skyGateModalContainer.add(this.skyGateBoardGfx);

    // Top Header Plaque on the Sky-Gate (`GATE 1 OF 3 — WRITE 'A'`)
    const headerPlaque = this.add.container(this.canvasCenterX, 122);
    const hpGfx = this.add.graphics();
    hpGfx.fillStyle(0x1e1b4b, 0.98);
    hpGfx.fillRoundedRect(-240, -28, 480, 56, 18);
    hpGfx.lineStyle(3, 0xfbbf24, 1);
    hpGfx.strokeRoundedRect(-240, -28, 480, 56, 18);
    hpGfx.lineStyle(1.5, 0xfef08a, 0.7);
    hpGfx.strokeRoundedRect(-235, -23, 470, 46, 15);

    this.gateHeaderText = this.add
      .text(0, -7, 'SKY-GATE 1: WRITE A', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#0f172a',
        strokeThickness: 4
      })
      .setOrigin(0.5);

    this.gateStrokeStepText = this.add
      .text(0, 15, 'STROKE 1 OF 3', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#38bdf8'
      })
      .setOrigin(0.5);

    headerPlaque.add([hpGfx, this.gateHeaderText, this.gateStrokeStepText]);

    // Quick Previous (◀) & Next (▶) Character Stepper Buttons on the Gate Header
    const prevCharBtn = this.createMiniCircleButton(-202, 0, '◀', () => {
      this.stepGateTargetCharacter(-1);
    });
    const nextCharBtn = this.createMiniCircleButton(202, 0, '▶', () => {
      this.stepGateTargetCharacter(1);
    });
    headerPlaque.add([prevCharBtn, nextCharBtn]);
    this.skyGateModalContainer.add(headerPlaque);

    // Guide Track Graphics Layer (fades out during the 2-second Admire Your Writing celebration!)
    this.guideTrackGfx = this.add.graphics();
    this.offTrackAlertGfx = this.add.graphics();

    // Persistent Authentic Freehand Ink Layer (NEVER replaced by a computer font!)
    this.authenticInkGfx = this.add.graphics();

    // Start Flag (`spr-flag-start`) & Pulsing Ring
    this.startFlagRingGfx = this.add.graphics();
    this.startFlagSprite = this.add
      .image(0, 0, 'spr-flag-start')
      .setOrigin(0.22, 0.88)
      .setDisplaySize(54, 66);

    // Checkered Finish Flag (`spr-flag-finish`) & Ring
    this.finishFlagRingGfx = this.add.graphics();
    this.finishFlagSprite = this.add
      .image(0, 0, 'spr-flag-finish')
      .setOrigin(0.22, 0.88)
      .setDisplaySize(54, 66);

    // Animated Ghost Guide Quill (`spr-quill-kart`) & Live Finger Tip Quill
    this.ghostGuideQuill = this.add
      .image(0, 0, 'spr-quill-kart')
      .setOrigin(0.15, 0.85)
      .setDisplaySize(46, 52)
      .setAlpha(0.68);

    this.liveFingerQuill = this.add
      .image(0, 0, 'spr-quill-kart')
      .setOrigin(0.15, 0.85)
      .setDisplaySize(56, 62)
      .setVisible(false);

    this.skyGateModalContainer.add([
      this.guideTrackGfx,
      this.offTrackAlertGfx,
      this.finishFlagRingGfx,
      this.finishFlagSprite,
      this.startFlagRingGfx,
      this.startFlagSprite,
      this.ghostGuideQuill,
      this.authenticInkGfx,
      this.liveFingerQuill
    ]);

    // Right-Side Clear / Re-Write Button (`spr-eraser-sponge`) + Speak Character Button (`🔊`)
    this.eraserBtnContainer = this.add.container(948, 340);
    const erBg = this.add.graphics();
    erBg.fillStyle(0x090d16, 0.55);
    erBg.fillRoundedRect(-56, -54, 112, 108, 20);
    erBg.fillStyle(0x1e1b4b, 0.96);
    erBg.fillRoundedRect(-58, -56, 112, 108, 20);
    erBg.lineStyle(3, 0xfbbf24, 1);
    erBg.strokeRoundedRect(-58, -56, 112, 108, 20);
    const erIcon = this.add.image(0, -14, 'spr-eraser-sponge').setDisplaySize(64, 58);
    const erTxt = this.add
      .text(0, 32, 'RE-WRITE', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#0f172a',
        strokeThickness: 3
      })
      .setOrigin(0.5);
    this.eraserBtnContainer.add([erBg, erIcon, erTxt]);
    Juice.makeTactileButton(
      this,
      this.eraserBtnContainer,
      112,
      108,
      () => {
        this.clearAndRewriteCurrentCharacter();
      },
      'splash'
    );
    this.skyGateModalContainer.add(this.eraserBtnContainer);

    // Speak Letter/Number Button on Left of Canvas (`x: 332, y: 340`)
    const speakBtn = this.add.container(332, 340);
    const spBg = this.add.graphics();
    spBg.fillStyle(0x090d16, 0.55);
    spBg.fillRoundedRect(-56, -54, 112, 108, 20);
    spBg.fillStyle(0x1e1b4b, 0.96);
    spBg.fillRoundedRect(-58, -56, 112, 108, 20);
    spBg.lineStyle(3, 0x38bdf8, 1);
    spBg.strokeRoundedRect(-58, -56, 112, 108, 20);
    const spIcon = this.add
      .text(0, -12, '🔊', { fontSize: '38px' })
      .setOrigin(0.5);
    const spTxt = this.add
      .text(0, 32, 'HEAR IT', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#0f172a',
        strokeThickness: 3
      })
      .setOrigin(0.5);
    speakBtn.add([spBg, spIcon, spTxt]);
    Juice.makeTactileButton(
      this,
      speakBtn,
      112,
      108,
      () => {
        const glyph = this.penmanship.getActiveGlyph();
        this.audio.speakCharacter(glyph.char);
        Juice.burstStars(this, 332, 340, 10, [0x38bdf8, 0xfef08a]);
      },
      'chime'
    );
    this.skyGateModalContainer.add(speakBtn);

    // Bottom Guidance Pill Banner (`x: 640, y: 664`)
    const hintPill = this.add.container(this.canvasCenterX, 664);
    const hpBg = this.add.graphics();
    hpBg.fillStyle(0x0f172a, 0.94);
    hpBg.fillRoundedRect(-290, -22, 580, 44, 22);
    hpBg.lineStyle(2.5, 0x10b981, 0.95);
    hpBg.strokeRoundedRect(-290, -22, 580, 44, 22);
    this.gateHintBannerText = this.add
      .text(0, 0, 'Start at the green flag at the top.', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    hintPill.add([hpBg, this.gateHintBannerText]);
    this.skyGateModalContainer.add(hintPill);
  }

  private createMiniCircleButton(
    x: number,
    y: number,
    symbol: string,
    onTap: () => void
  ): Phaser.GameObjects.Container {
    const btn = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x0f172a, 0.95);
    g.fillCircle(0, 0, 20);
    g.lineStyle(2, 0xfbbf24, 1);
    g.strokeCircle(0, 0, 20);
    const txt = this.add
      .text(0, 0, symbol, {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    btn.add([g, txt]);
    Juice.makeTactileButton(this, btn, 64, 64, onTap, 'tab');
    return btn;
  }

  private drawSkyGateSlateBoard(isAdmireMode: boolean): void {
    this.skyGateBoardGfx.clear();
    const outerSize = 448;
    const ox = this.canvasCenterX - outerSize / 2;
    const oy = this.canvasCenterY - outerSize / 2;

    // Drop shadow
    this.skyGateBoardGfx.fillStyle(0x020617, 0.65);
    this.skyGateBoardGfx.fillRoundedRect(ox + 6, oy + 8, outerSize, outerSize, 28);

    // Ornate Brass Outer Bevel Frame
    this.skyGateBoardGfx.fillStyle(0xb45309, 1);
    this.skyGateBoardGfx.fillRoundedRect(ox, oy, outerSize, outerSize, 26);
    this.skyGateBoardGfx.lineStyle(4, 0xfef08a, 1);
    this.skyGateBoardGfx.strokeRoundedRect(ox, oy, outerSize, outerSize, 26);

    // Starlight Navy Slate Canvas Interior
    const innerPad = 14;
    const ix = ox + innerPad;
    const iy = oy + innerPad;
    const iw = outerSize - innerPad * 2;
    this.skyGateBoardGfx.fillStyle(isAdmireMode ? 0x091936 : 0x0f172a, 0.98);
    this.skyGateBoardGfx.fillRoundedRect(ix, iy, iw, iw, 18);
    this.skyGateBoardGfx.lineStyle(2.5, isAdmireMode ? 0xfacc15 : 0x38bdf8, 0.9);
    this.skyGateBoardGfx.strokeRoundedRect(ix, iy, iw, iw, 18);

    // Primary-School Handwriting Ruled Guide Lines (fade away during 2-second Admire celebration!)
    if (!isAdmireMode) {
      const left = this.canvasCenterX - this.canvasBoxSize / 2 + 12;
      const right = this.canvasCenterX + this.canvasBoxSize / 2 - 12;
      const topY = this.canvasCenterY - this.canvasBoxSize / 2 + 0.12 * this.canvasBoxSize;
      const midY = this.canvasCenterY;
      const botY = this.canvasCenterY - this.canvasBoxSize / 2 + 0.88 * this.canvasBoxSize;

      // Top Sky Line (solid soft blue)
      this.skyGateBoardGfx.lineStyle(1.5, 0x38bdf8, 0.28);
      this.skyGateBoardGfx.lineBetween(left, topY, right, topY);

      // Middle Dashed Cloud Line
      this.skyGateBoardGfx.lineStyle(1.5, 0xfef08a, 0.24);
      for (let dx = left; dx < right; dx += 18) {
        this.skyGateBoardGfx.lineBetween(dx, midY, Math.min(right, dx + 10), midY);
      }

      // Bottom Baseline (solid soft emerald)
      this.skyGateBoardGfx.lineStyle(2, 0x34d399, 0.34);
      this.skyGateBoardGfx.lineBetween(left, botY, right, botY);
    }
  }

  // ===========================================================================
  // 4. CHAMPIONSHIP PODIUM CELEBRATION MODAL (DISPLAYS ALL 3 HAND-DRAWN LETTERS!)
  // ===========================================================================

  private createPodiumCelebrationModal(): void {
    this.podiumContainer = this.add.container(0, 0).setDepth(150).setVisible(false);
  }

  private showPodiumCelebration(): void {
    this.phase = 'PODIUM_CELEBRATION';
    this.drivingControlsContainer.setVisible(false);
    this.skyGateModalContainer.setVisible(false);
    this.podiumContainer.removeAll(true);
    this.podiumContainer.setVisible(true);

    // 1. Starry Backdrop Overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x090d16, 0.72);
    overlay.fillRect(0, 82, 1280, 638);
    this.podiumContainer.add(overlay);

    // 2. Ornate Championship Banner Panel (`980x580` centered at `640, 392`)
    const panel = this.add.container(640, 392);
    const pg = this.add.graphics();
    pg.fillStyle(0x040711, 0.65);
    pg.fillRoundedRect(-486, -284, 976, 572, 28);
    pg.fillStyle(0x172554, 0.97);
    pg.fillRoundedRect(-488, -286, 976, 572, 28);
    pg.lineStyle(4, 0xfbbf24, 1);
    pg.strokeRoundedRect(-488, -286, 976, 572, 28);
    pg.lineStyle(2, 0xfef08a, 0.75);
    pg.strokeRoundedRect(-480, -278, 960, 556, 24);
    panel.add(pg);

    const activeKid = ArcadeState.getActiveKid();
    const titleStr =
      activeKid.id === 'emma'
        ? '★ EMMA & DOGGIE RAINBOW HILL CHAMPIONS! ★'
        : '★ WYATT & SPARKY RAINBOW HILL CHAMPIONS! ★';

    const titleText = this.add
      .text(0, -242, titleStr, {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#0f172a',
        strokeThickness: 5
      })
      .setOrigin(0.5);

    const subText = this.add
      .text(0, -208, 'LOOK AT YOUR REAL HANDWRITING ON THE CHAMPIONSHIP BANNER!', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#93c5fd'
      })
      .setOrigin(0.5);
    panel.add([titleText, subText]);

    // 3. The 3 Championship Handwriting Gallery Frames Side-by-Side (`y: -68`)
    const galleryXs = [-270, 0, 270];
    for (let i = 0; i < GATES_PER_RACE; i++) {
      const sample = this.completedGateSamples[i];
      const charStr = sample?.character ?? this.gateTargets[i] ?? 'A';
      const card = this.add.container(galleryXs[i], -68);

      const frameW = 224;
      const frameH = 214;
      const fg = this.add.graphics();
      fg.fillStyle(0x090d16, 0.55);
      fg.fillRoundedRect(-frameW / 2 + 3, -frameH / 2 + 4, frameW, frameH, 20);
      fg.fillStyle(0x0f172a, 0.98);
      fg.fillRoundedRect(-frameW / 2, -frameH / 2, frameW, frameH, 20);
      fg.lineStyle(3.5, RAINBOW_COLORS[i * 2], 1);
      fg.strokeRoundedRect(-frameW / 2, -frameH / 2, frameW, frameH, 20);
      fg.lineStyle(1.5, 0xfef08a, 0.8);
      fg.strokeRoundedRect(-frameW / 2 + 5, -frameH / 2 + 5, frameW - 10, frameH - 10, 16);

      // Subtle ruled baseline inside each Championship Frame
      fg.lineStyle(1.5, 0x38bdf8, 0.22);
      fg.lineBetween(-82, -58, 82, -58);
      fg.lineStyle(1.5, 0x34d399, 0.28);
      fg.lineBetween(-82, 58, 82, 58);

      const badgeLbl = this.add
        .text(0, -frameH / 2 + 20, `GATE ${i + 1} • "${charStr}"`, {
          fontFamily: '"Fredoka", sans-serif',
          fontSize: '15px',
          fontStyle: 'bold',
          color: '#fef08a'
        })
        .setOrigin(0.5);

      // Render the child's EXACT authentic freehand strokes inside the 154x154 box!
      const inkGfx = this.add.graphics();
      if (sample && sample.freehandStrokes.length > 0) {
        this.renderNormalizedFreehandStrokes(inkGfx, sample.freehandStrokes, 0, 10, 152, 1.0);
      }

      card.add([fg, badgeLbl, inkGfx]);

      // Tap frame to hear pronunciation & burst stars
      const hit = this.add
        .zone(0, 0, frameW, frameH)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        this.audio.speakCharacter(charStr);
        Juice.squashAndStretch(this, card, 0.1, 160);
        Juice.burstStars(this, 640 + galleryXs[i], 324, 16, [0xfef08a, 0x38bdf8, 0xf472b6]);
      });
      card.add(hit);

      card.setScale(0.2);
      this.tweens.add({
        targets: card,
        scaleX: 1,
        scaleY: 1,
        duration: 420,
        delay: 120 + i * 140,
        ease: 'Back.easeOut'
      });

      panel.add(card);
    }

    // 4. Lower Podium Showcase: Championship Podium (`spr-trophy-podium`), Golden Cup & Karts
    if (this.textures.exists('spr-trophy-podium')) {
      const podium = this.add.image(-255, 162, 'spr-trophy-podium').setScale(0.76);
      panel.add(podium);
    }
    if (this.textures.exists('spr-golden-cup')) {
      const cup = this.add.image(-255, 76, 'spr-golden-cup').setScale(0.58);
      this.tweens.add({
        targets: cup,
        y: 68,
        scaleX: 0.62,
        scaleY: 0.62,
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      panel.add(cup);
    }

    const heroTex = activeKid.id === 'emma' ? 'kart-emma' : 'kart-wyatt';
    const winnerKart = this.add.image(-85, 158, heroTex).setScale(0.56);
    const sparkyPod = this.add.image(-395, 168, 'kart-sparky').setScale(0.46);
    panel.add([sparkyPod, winnerKart]);

    // 5. Action Buttons: "NEXT RACE (NEW LETTERS)" & "PRACTICE THESE AGAIN"
    const nextRaceBtn = this.add.container(215, 132);
    const nbGfx = this.add.graphics();
    nbGfx.fillStyle(0x090d16, 0.55);
    nbGfx.fillRoundedRect(-178, -36, 356, 72, 20);
    nbGfx.fillStyle(0x10b981, 1);
    nbGfx.fillRoundedRect(-180, -38, 356, 72, 20);
    nbGfx.lineStyle(3.5, 0xfef08a, 1);
    nbGfx.strokeRoundedRect(-180, -38, 356, 72, 20);
    const nbTxt = this.add
      .text(0, 0, '🏎️ NEXT RACE (NEW GATES)', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#064e3b',
        strokeThickness: 4
      })
      .setOrigin(0.5);
    nextRaceBtn.add([nbGfx, nbTxt]);
    Juice.makeTactileButton(
      this,
      nextRaceBtn,
      356,
      72,
      () => {
        this.podiumContainer.setVisible(false);
        this.startNewRace(true);
      },
      'fanfare'
    );
    panel.add(nextRaceBtn);

    const replaySameBtn = this.add.container(215, 218);
    const rbGfx = this.add.graphics();
    rbGfx.fillStyle(0x1e293b, 0.96);
    rbGfx.fillRoundedRect(-150, -28, 300, 56, 16);
    rbGfx.lineStyle(2.5, 0xfbbf24, 1);
    rbGfx.strokeRoundedRect(-150, -28, 300, 56, 16);
    const rbTxt = this.add
      .text(0, 0, '✏️ RE-WRITE SAME 3 GATES', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    replaySameBtn.add([rbGfx, rbTxt]);
    Juice.makeTactileButton(
      this,
      replaySameBtn,
      300,
      58,
      () => {
        this.podiumContainer.setVisible(false);
        this.sequentialCursor = Math.max(0, this.sequentialCursor - GATES_PER_RACE);
        this.startNewRace(true);
      },
      'pop'
    );
    panel.add(replaySameBtn);

    this.podiumContainer.add(panel);

    // Award bonus stars & play fanfare + championship voice prompt
    ArcadeState.addStars(3);
    this.audio.playPodiumFanfare();
    Juice.burstStars(this, 640, 260, 32, [0xfef08a, 0xfbbf24, 0x38bdf8, 0xf472b6]);

    this.time.delayedCall(450, () => {
      if (this.phase !== 'PODIUM_CELEBRATION') return;
      this.audio.speakPrompt(activeKid.id === 'emma' ? 'podium_emma' : 'podium_wyatt');
    });
  }

  // ===========================================================================
  // 5. RACE FLOW, CHARACTER SELECTION & MODE TOGGLES
  // ===========================================================================

  private getPoolForCurrentMode(): string[] {
    if (this.charSetMode === 'NUMBERS') return NUMBER_CHARS;
    if (this.charSetMode === 'LOWERCASE') return LOWERCASE_CHARS;
    if (this.charSetMode === 'MIXED') return [...UPPERCASE_CHARS, ...NUMBER_CHARS];
    return UPPERCASE_CHARS;
  }

  private pickThreeGateCharacters(): string[] {
    const pool = this.getPoolForCurrentMode();
    const chosen: string[] = [];

    if (this.orderMode === 'SEQUENTIAL') {
      for (let i = 0; i < GATES_PER_RACE; i++) {
        const idx = (this.sequentialCursor + i) % pool.length;
        chosen.push(pool[idx]);
      }
      this.sequentialCursor = (this.sequentialCursor + GATES_PER_RACE) % pool.length;
    } else {
      const shuffled = Phaser.Utils.Array.Shuffle([...pool]);
      for (let i = 0; i < GATES_PER_RACE; i++) {
        chosen.push(shuffled[i % shuffled.length]);
      }
    }
    return chosen;
  }

  private startNewRace(playStartVoice: boolean): void {
    this.currentGateIndex = 0;
    this.gateTargets = this.pickThreeGateCharacters();
    this.completedGateSamples = [null, null, null];
    this.clearTrackObjects();

    const activeKid = ArcadeState.getActiveKid();
    this.heroKartSprite.setTexture(activeKid.id === 'emma' ? 'kart-emma' : 'kart-wyatt');

    this.refreshTrophyProgressBar();
    this.beginDrivingLeg();

    if (playStartVoice) {
      this.audio.speakPrompt(activeKid.id === 'emma' ? 'race_start_emma' : 'race_start_wyatt');
    }
  }

  private beginDrivingLeg(): void {
    this.phase = 'RACE_DRIVING';
    this.skyGateModalContainer.setVisible(false);
    this.podiumContainer.setVisible(false);
    this.drivingControlsContainer.setVisible(true);
    this.approachingGateSprite.setVisible(false);
    this.finishArchSprite.setVisible(false);

    this.baseTrackSpeed = 410;
    this.trackSpeed = this.baseTrackSpeed;
    this.legDistanceRemaining = 2150;
    this.nextSpawnX = 360;

    const nextChar = this.gateTargets[this.currentGateIndex] ?? 'A';
    this.raceBannerText.setText(
      `★ RACE TO SKY-GATE ${this.currentGateIndex + 1} (LETTER "${nextChar}" AHEAD!) ★`
    );
    this.audio.playKartEnginePurr();
  }

  private cycleCharacterSetMode(): void {
    if (this.charSetMode === 'UPPERCASE') {
      this.charSetMode = 'NUMBERS';
      this.audio.speakPrompt('mode_numbers');
    } else if (this.charSetMode === 'NUMBERS') {
      this.charSetMode = 'LOWERCASE';
      this.audio.speakPrompt('mode_uppercase');
    } else if (this.charSetMode === 'LOWERCASE') {
      this.charSetMode = 'MIXED';
      this.audio.speakPrompt('mode_mixed');
    } else {
      this.charSetMode = 'UPPERCASE';
      this.audio.speakPrompt('mode_uppercase');
    }
    this.sequentialCursor = 0;
    this.refreshHudButtonLabels();
    this.updateUpcomingGateTargetsAfterModeChange();
  }

  private toggleOrderMode(): void {
    this.orderMode = this.orderMode === 'SEQUENTIAL' ? 'RANDOM' : 'SEQUENTIAL';
    this.audio.speakPrompt(this.orderMode === 'SEQUENTIAL' ? 'mode_sequential' : 'mode_random');
    this.refreshHudButtonLabels();
    this.updateUpcomingGateTargetsAfterModeChange();
  }

  private toggleCorridorWidthMode(): void {
    this.corridorMode = this.corridorMode === 'PRECISION' ? 'COZY' : 'PRECISION';
    const newRadius = this.corridorMode === 'COZY' ? 55 : 38;
    this.penmanship.setCorridorRadiusPx(newRadius);
    this.audio.speakPrompt(this.corridorMode === 'PRECISION' ? 'track_precision' : 'track_cozy');
    this.refreshHudButtonLabels();

    if (this.phase === 'SKY_GATE_PENMANSHIP') {
      this.renderPenmanshipGuides();
    }
  }

  private updateUpcomingGateTargetsAfterModeChange(): void {
    const fresh = this.pickThreeGateCharacters();
    for (let i = this.currentGateIndex; i < GATES_PER_RACE; i++) {
      if (!this.completedGateSamples[i]) {
        this.gateTargets[i] = fresh[i];
      }
    }
    this.refreshTrophyProgressBar();

    if (this.phase === 'SKY_GATE_PENMANSHIP') {
      this.loadCurrentGateIntoPenmanshipEngine();
    } else if (this.phase === 'RACE_DRIVING') {
      const nextChar = this.gateTargets[this.currentGateIndex] ?? 'A';
      this.raceBannerText.setText(
        `★ RACE TO SKY-GATE ${this.currentGateIndex + 1} ("${nextChar}" AHEAD!) ★`
      );
    }
  }

  private refreshHudButtonLabels(): void {
    if (this.charSetMode === 'UPPERCASE') {
      this.charSetBtnLabel.setText('ABC');
      this.charSetBtnSub.setText('UPPERCASE A-Z');
    } else if (this.charSetMode === 'LOWERCASE') {
      this.charSetBtnLabel.setText('abc');
      this.charSetBtnSub.setText('LOWERCASE a-z');
    } else if (this.charSetMode === 'NUMBERS') {
      this.charSetBtnLabel.setText('0 - 9');
      this.charSetBtnSub.setText('NUMBERS');
    } else {
      this.charSetBtnLabel.setText('ABC+9');
      this.charSetBtnSub.setText('MIXED MODE');
    }

    if (this.orderMode === 'SEQUENTIAL') {
      this.orderBtnLabel.setText('A → B');
      this.orderBtnSub.setText('IN ORDER');
    } else {
      this.orderBtnLabel.setText('🎲 MIX');
      this.orderBtnSub.setText('SURPRISE');
    }

    if (this.corridorMode === 'PRECISION') {
      this.corridorBtnLabel.setText('🐉 WYATT');
      this.corridorBtnSub.setText('PRECISION 38px');
    } else {
      this.corridorBtnLabel.setText('🐶 EMMA');
      this.corridorBtnSub.setText('COZY WIDE 55px');
    }
  }

  /**
   * Updates the 3 Trophy Slots in the Top HUD Bar.
   * Completed gates render the child's exact freehand ink strokes; upcoming gates show the target character.
   */
  private refreshTrophyProgressBar(): void {
    for (let i = 0; i < GATES_PER_RACE; i++) {
      const sample = this.completedGateSamples[i];
      const inkGfx = this.trophySlotInkGfx[i];
      const placeholder = this.trophySlotPlaceholderTexts[i];
      inkGfx.clear();

      if (sample && sample.freehandStrokes.length > 0) {
        placeholder.setVisible(false);
        this.renderNormalizedFreehandStrokes(inkGfx, sample.freehandStrokes, 28, 0, 34, 0.42);
      } else {
        placeholder.setVisible(true);
        placeholder.setText(this.gateTargets[i] ?? '?');
        placeholder.setColor(i === this.currentGateIndex ? '#fef08a' : '#64748b');
      }
    }
  }

  // ===========================================================================
  // 6. TOUCH / STYLUS INPUT & PENMANSHIP EXECUTION
  // ===========================================================================

  private setupStageTouchInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Ignore clicks on the top HUD bar
      if (pointer.y < 82) return;

      if (this.phase === 'RACE_DRIVING') {
        // Direct touch-to-lane steering on the highway
        if (pointer.x > 130 && pointer.x < 1110 && pointer.y >= 410) {
          this.steerHeroToPointerY(pointer.y);
        }
        return;
      }

      if (this.phase === 'SKY_GATE_PENMANSHIP') {
        if (this.isPointInsideWritingSlate(pointer.x, pointer.y)) {
          this.isPointerDownOnCanvas = true;
          this.handlePenmanshipPointer(pointer.x, pointer.y, true);
        }
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;

      if (this.phase === 'RACE_DRIVING') {
        if (pointer.x > 130 && pointer.x < 1110 && pointer.y >= 400) {
          this.steerHeroToPointerY(pointer.y);
        }
        return;
      }

      if (this.phase === 'SKY_GATE_PENMANSHIP' && this.isPointerDownOnCanvas) {
        this.handlePenmanshipPointer(pointer.x, pointer.y, false);
      }
    });

    const onPointerUp = () => {
      if (this.isPointerDownOnCanvas) {
        this.isPointerDownOnCanvas = false;
        this.liveFingerQuill.setVisible(false);
        this.penmanship.handlePointerUp();
        if (this.phase === 'SKY_GATE_PENMANSHIP') {
          this.renderPenmanshipGuides();
        }
      }
    };

    this.input.on('pointerup', onPointerUp);
    this.input.on('pointerupoutside', onPointerUp);
  }

  private isPointInsideWritingSlate(x: number, y: number): boolean {
    const half = this.canvasBoxSize / 2 + 42;
    return (
      Math.abs(x - this.canvasCenterX) <= half &&
      Math.abs(y - this.canvasCenterY) <= half
    );
  }

  private openSkyGatePenmanshipChallenge(): void {
    this.phase = 'SKY_GATE_PENMANSHIP';
    this.drivingControlsContainer.setVisible(false);
    this.skyGateModalContainer.setVisible(true);
    this.eraserBtnContainer.setVisible(true);

    this.drawSkyGateSlateBoard(false);
    this.loadCurrentGateIntoPenmanshipEngine();

    const glyph = this.penmanship.getActiveGlyph();
    this.audio.speakPrompt(glyph.isNumber ? 'gate_intro_number' : 'gate_intro_letter', () => {
      if (this.phase === 'SKY_GATE_PENMANSHIP') {
        this.audio.speakCharacter(glyph.char);
      }
    });
  }

  private loadCurrentGateIntoPenmanshipEngine(): void {
    const targetChar = this.gateTargets[this.currentGateIndex] ?? 'A';
    const glyph = this.penmanship.loadCharacter(targetChar);
    const kindWord = glyph.isNumber ? 'NUMBER' : 'LETTER';

    this.gateHeaderText.setText(
      `SKY-GATE ${this.currentGateIndex + 1} OF ${GATES_PER_RACE}: WRITE ${kindWord} "${glyph.char}"`
    );
    this.gateStrokeStepText.setText(
      `STROKE 1 OF ${glyph.strokes.length} • ${
        this.corridorMode === 'PRECISION' ? 'STANDARD TRACK (38px)' : 'COZY WIDE TRACK (55px)'
      }`
    );
    const stroke = this.penmanship.getCurrentStroke();
    this.gateHintBannerText.setText(stroke?.hint ?? 'Start at the green flag at the top.');

    this.guideTrackGfx.setAlpha(1);
    this.startFlagSprite.setVisible(true).setAlpha(1);
    this.startFlagRingGfx.setVisible(true).setAlpha(1);
    this.finishFlagSprite.setVisible(true).setAlpha(1);
    this.finishFlagRingGfx.setVisible(true).setAlpha(1);
    this.ghostGuideQuill.setVisible(true);

    this.renderPenmanshipGuides();
    this.renderLiveAuthenticInk();
  }

  private stepGateTargetCharacter(dir: -1 | 1): void {
    if (this.phase !== 'SKY_GATE_PENMANSHIP') return;
    const pool = this.getPoolForCurrentMode();
    const current = this.gateTargets[this.currentGateIndex] ?? pool[0];
    const curIdx = Math.max(0, pool.indexOf(current));
    const nextIdx = (curIdx + dir + pool.length) % pool.length;
    this.gateTargets[this.currentGateIndex] = pool[nextIdx];

    this.refreshTrophyProgressBar();
    this.loadCurrentGateIntoPenmanshipEngine();
    this.audio.speakCharacter(pool[nextIdx]);
  }

  private clearAndRewriteCurrentCharacter(): void {
    if (this.phase !== 'SKY_GATE_PENMANSHIP' && this.phase !== 'ADMIRE_WRITING') return;
    this.phase = 'SKY_GATE_PENMANSHIP';
    this.drawSkyGateSlateBoard(false);
    this.penmanship.resetCurrentCharacter();

    const glyph = this.penmanship.getActiveGlyph();
    this.gateStrokeStepText.setText(`STROKE 1 OF ${glyph.strokes.length} • FRESH CANVAS`);
    const stroke = this.penmanship.getCurrentStroke();
    this.gateHintBannerText.setText(stroke?.hint ?? 'Start at the green flag at the top.');

    this.guideTrackGfx.setAlpha(1);
    this.startFlagSprite.setVisible(true).setAlpha(1);
    this.startFlagRingGfx.setVisible(true).setAlpha(1);
    this.finishFlagSprite.setVisible(true).setAlpha(1);
    this.finishFlagRingGfx.setVisible(true).setAlpha(1);
    this.ghostGuideQuill.setVisible(true);

    this.renderPenmanshipGuides();
    this.renderLiveAuthenticInk();
    this.audio.speakPrompt('stroke_try_rewrite');
  }

  private handlePenmanshipPointer(x: number, y: number, isDown: boolean): void {
    const res = isDown
      ? this.penmanship.handlePointerDown(x, y)
      : this.penmanship.handlePointerMove(x, y);

    const glyph = this.penmanship.getActiveGlyph();

    if (res.status === 'WAITING_FOR_START_FLAG') {
      this.liveFingerQuill.setVisible(false);
      // Bounce the Green Starting Flag and remind child where to start
      Juice.squashAndStretch(this, this.startFlagSprite, 0.24, 180);
      this.gateHintBannerText.setText('Touch the glowing GREEN FLAG to start this stroke!');
      const now = performance.now();
      if (now - this.lastStartFlagReminderAt > 2200) {
        this.lastStartFlagReminderAt = now;
        this.audio.speakPrompt('stroke_start_flag');
      }
      this.renderPenmanshipGuides();
      return;
    }

    if (res.status === 'OFF_TRACK_RUMBLE') {
      this.offTrackFlashTimer = 360;
      this.liveFingerQuill.setPosition(x, y).setVisible(true).setTint(0xf59e0b);
      this.gateHintBannerText.setText(
        'Off-road cloud rumble! Slide your finger back onto the glowing green circle.'
      );
      const rumbled = this.audio.playOffTrackRumble();
      if (rumbled) {
        this.cameras.main.shake(90, 0.003);
      }
      this.renderPenmanshipGuides();
      return;
    }

    if (res.status === 'ADVANCING_ON_TRACK') {
      this.liveFingerQuill.setPosition(x, y).setVisible(true).clearTint();
      this.audio.playTraceProgressTick(res.strokeProgress);
      if (Math.random() < 0.35) {
        Juice.burstStars(this, x, y, 2, [0xfef08a, 0x38bdf8, 0xf472b6]);
      }
      const stroke = this.penmanship.getCurrentStroke();
      this.gateHintBannerText.setText(stroke?.hint ?? 'Keep following the glowing cloud track!');
      this.renderPenmanshipGuides();
      this.renderLiveAuthenticInk();
      return;
    }

    if (res.status === 'STROKE_COMPLETED') {
      this.liveFingerQuill.setVisible(false);
      const completedStrokeNum = this.penmanship.getCurrentStrokeIndex();
      this.audio.playStrokeCompleteChime(completedStrokeNum);
      Juice.burstStars(this, res.finishPoint.x, res.finishPoint.y, 16, [
        0x10b981,
        0xfef08a,
        0xffffff
      ]);

      const nextStrokeNum = completedStrokeNum + 1;
      this.gateStrokeStepText.setText(
        `STROKE ${nextStrokeNum} OF ${glyph.strokes.length} • LIFT FINGER TO NEXT GREEN FLAG`
      );
      const nextStroke = this.penmanship.getCurrentStroke();
      this.gateHintBannerText.setText(
        nextStroke?.hint ?? 'Great stroke! Start at the next green flag.'
      );

      this.renderPenmanshipGuides();
      this.renderLiveAuthenticInk();
      Juice.squashAndStretch(this, this.startFlagSprite, 0.25, 220);
      return;
    }

    if (res.status === 'CHARACTER_COMPLETED') {
      this.liveFingerQuill.setVisible(false);
      this.isPointerDownOnCanvas = false;
      this.renderLiveAuthenticInk();
      this.triggerAdmireWritingCelebration();
    }
  }

  /**
   * 2-Second "Admire Your Writing" Celebration:
   * - Fades away the background guide track, dashed lines, Green Flag, and Checkered Flag
   *   so the child's pure, authentic hand-drawn letter/number shines prominently on screen!
   * - Stamps their exact hand-drawn letter/number into the Top Race Progress Trophy Bar!
   */
  private triggerAdmireWritingCelebration(): void {
    this.phase = 'ADMIRE_WRITING';
    const sample = this.penmanship.getRecordedSample();
    this.completedGateSamples[this.currentGateIndex] = sample;

    const glyph = this.penmanship.getActiveGlyph();
    this.drawSkyGateSlateBoard(true);

    // Hide all guide overlays so ONLY their authentic freehand writing shines!
    this.tweens.add({
      targets: [
        this.guideTrackGfx,
        this.startFlagSprite,
        this.startFlagRingGfx,
        this.finishFlagSprite,
        this.finishFlagRingGfx
      ],
      alpha: 0,
      duration: 240
    });
    this.offTrackAlertGfx.clear();
    this.ghostGuideQuill.setVisible(false);

    this.gateHeaderText.setText(`★ BEAUTIFUL "${glyph.char}"! ADMIRE YOUR WRITING! ★`);
    this.gateStrokeStepText.setText('STAMPED INTO YOUR CHAMPIONSHIP TROPHY BAR!');
    this.gateHintBannerText.setText('Look at the real letter you wrote by hand!');

    // Stamp into Top Race Progress Trophy Bar with a star burst!
    this.refreshTrophyProgressBar();
    const slotContainer = this.trophySlotContainers[this.currentGateIndex];
    if (slotContainer) {
      Juice.squashAndStretch(this, slotContainer, 0.22, 240);
    }

    ArcadeState.addStars(2);
    this.audio.playStrokeCompleteChime(4);
    Juice.burstStars(this, this.canvasCenterX, this.canvasCenterY, 28, [
      0xfef08a,
      0xfbbf24,
      0x34d399,
      0x38bdf8
    ]);

    // Speak character name + warm praise
    this.audio.speakCharacter(glyph.char, () => {
      if (this.phase === 'ADMIRE_WRITING') {
        this.audio.speakPrompt(glyph.isNumber ? 'admire_number' : 'admire_letter');
      }
    });

    // Hold for 2.1 seconds so the child can admire their pure hand-drawn writing (or tap Re-Write if desired)
    this.time.delayedCall(2150, () => {
      if (this.phase !== 'ADMIRE_WRITING') return;
      this.launchGateMegaRainbowTurbo();
    });
  }

  private launchGateMegaRainbowTurbo(): void {
    this.phase = 'GATE_TURBO_LAUNCH';
    this.skyGateModalContainer.setVisible(false);
    this.drivingControlsContainer.setVisible(true);

    this.audio.playSkyGateOpen();
    this.audio.speakPrompt('turbo_boost_go');

    // Open the Sky-Gate on the track & ignite Mega Rainbow Turbo!
    this.turboBoostTimer = 2600;
    this.trackSpeed = 760;
    Juice.burstStars(this, this.heroContainer.x + 80, this.heroContainer.y, 26, RAINBOW_COLORS);

    const completedGateNumber = this.currentGateIndex + 1;
    this.raceBannerText.setText(
      `★ SKY-GATE ${completedGateNumber} CLEARED! MEGA RAINBOW TURBO BOOST! ★`
    );

    this.currentGateIndex++;
    this.refreshTrophyProgressBar();

    this.time.delayedCall(1450, () => {
      if (this.currentGateIndex >= GATES_PER_RACE) {
        // Sprint through the Checkered Finish Arch to the Championship Podium!
        this.phase = 'FINISH_ARCH_SPRINT';
        this.finishArchSprite.setPosition(1380, 525).setVisible(true);
        this.raceBannerText.setText('★ FINISH LINE AHEAD! ZOOM THROUGH THE CHECKERED ARCH! ★');
      } else {
        this.beginDrivingLeg();
      }
    });
  }

  // ===========================================================================
  // 7. PENMANSHIP CORRIDOR & AUTHENTIC FREEHAND INK RENDERING
  // ===========================================================================

  private renderPenmanshipGuides(): void {
    this.guideTrackGfx.clear();
    this.offTrackAlertGfx.clear();
    this.startFlagRingGfx.clear();
    this.finishFlagRingGfx.clear();

    const glyph = this.penmanship.getActiveGlyph();
    const activeStrokeIdx = this.penmanship.getCurrentStrokeIndex();
    const corridorWidth = this.penmanship.getCorridorRadiusPx() * 2;

    // 1. Render future strokes dimly (`alpha: 0.20`) so the child sees the whole character silhouette
    for (let sIdx = activeStrokeIdx + 1; sIdx < glyph.strokes.length; sIdx++) {
      const futurePts = glyph.strokes[sIdx].waypoints.map((wp) =>
        this.penmanship.normalizedToScreen(wp)
      );
      this.strokeScreenPolyline(this.guideTrackGfx, futurePts, corridorWidth * 0.78, 0x334155, 0.26);
      this.strokeScreenPolyline(this.guideTrackGfx, futurePts, 6, 0x94a3b8, 0.25);
    }

    // 2. Render ONLY the currently active stroke with a bright Skyway Corridor, Start Flag & Checkered Finish
    const activeStroke = this.penmanship.getCurrentStroke();
    if (!activeStroke) return;

    const screenPts = activeStroke.waypoints.map((wp) => this.penmanship.normalizedToScreen(wp));

    // Outer corridor boundary glow (amber when off-track, sky-blue when on-track)
    const isOff = this.penmanship.getIsOffTrack() || this.offTrackFlashTimer > 0;
    const outerRimColor = isOff ? 0xf59e0b : 0x38bdf8;
    this.strokeScreenPolyline(this.guideTrackGfx, screenPts, corridorWidth + 8, outerRimColor, 0.35);

    // Asphalt/Cloud Track Corridor Interior
    this.strokeScreenPolyline(this.guideTrackGfx, screenPts, corridorWidth, 0x1e293b, 0.92);

    // Directional Chevrons along the active stroke from start to finish
    const chevronStep = 6;
    for (let i = 2; i < screenPts.length - 2; i += chevronStep) {
      const p0 = screenPts[i];
      const p1 = screenPts[i + 1];
      const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      const wingLen = 10;
      const wingAng = 2.45;

      this.guideTrackGfx.lineStyle(3, 0xfef08a, 0.55);
      this.guideTrackGfx.beginPath();
      this.guideTrackGfx.moveTo(
        p0.x + Math.cos(ang + wingAng) * wingLen,
        p0.y + Math.sin(ang + wingAng) * wingLen
      );
      this.guideTrackGfx.lineTo(p0.x, p0.y);
      this.guideTrackGfx.lineTo(
        p0.x + Math.cos(ang - wingAng) * wingLen,
        p0.y + Math.sin(ang - wingAng) * wingLen
      );
      this.guideTrackGfx.strokePath();
    }

    // 3. Position Green Starting Flag / Resume Circle & Checkered Finish Target
    const resumePt = this.penmanship.getActiveResumeScreenPoint();
    const finishPt = this.penmanship.getActiveFinishScreenPoint();

    const pulseScale = 1 + Math.sin(this.guidePulseTime * 5) * 0.12;
    this.startFlagRingGfx.fillStyle(isOff ? 0xf59e0b : 0x10b981, 0.28);
    this.startFlagRingGfx.fillCircle(
      resumePt.x,
      resumePt.y,
      this.penmanship.getCorridorRadiusPx() * 0.85 * pulseScale
    );
    this.startFlagRingGfx.lineStyle(3.5, isOff ? 0xfef08a : 0x34d399, 0.98);
    this.startFlagRingGfx.strokeCircle(
      resumePt.x,
      resumePt.y,
      this.penmanship.getCorridorRadiusPx() * 0.85 * pulseScale
    );
    this.startFlagSprite.setPosition(resumePt.x, resumePt.y);

    this.finishFlagRingGfx.fillStyle(0xfacc15, 0.22);
    this.finishFlagRingGfx.fillCircle(finishPt.x, finishPt.y, 24);
    this.finishFlagRingGfx.lineStyle(3, 0xfef08a, 0.9);
    this.finishFlagRingGfx.strokeCircle(finishPt.x, finishPt.y, 24);
    this.finishFlagSprite.setPosition(finishPt.x, finishPt.y);
  }

  /**
   * Renders the child's EXACT authentic hand-drawn freehand strokes on the Sky-Writing Canvas.
   * NEVER replaces their hand-drawn line with a computer font!
   */
  private renderLiveAuthenticInk(): void {
    this.authenticInkGfx.clear();
    const strokes = this.penmanship.getAllFreehandStrokesNormalized();
    if (strokes.length === 0) return;

    this.renderNormalizedFreehandStrokes(
      this.authenticInkGfx,
      strokes,
      this.canvasCenterX,
      this.canvasCenterY,
      this.canvasBoxSize,
      1.0
    );
  }

  /**
   * Reusable multi-layered Starlight Rainbow-Gold Ink renderer that draws any recorded
   * `NormalizedPoint[][]` at arbitrary center `(cx, cy)` and size `boxSize` (used on the
   * main `376x376` Sky-Gate Canvas, the `34x34` Top Trophy Bar slots, and the `152x152`
   * Championship Podium Banner frames!).
   */
  private renderNormalizedFreehandStrokes(
    gfx: Phaser.GameObjects.Graphics,
    strokes: NormalizedPoint[][],
    cx: number,
    cy: number,
    boxSize: number,
    thicknessScale: number
  ): void {
    const left = cx - boxSize / 2;
    const top = cy - boxSize / 2;

    strokes.forEach((stroke, sIdx) => {
      if (stroke.length === 0) return;
      const pts = stroke.map((np) => ({
        x: left + np.nx * boxSize,
        y: top + np.ny * boxSize
      }));

      const accentColor = RAINBOW_COLORS[sIdx % RAINBOW_COLORS.length];
      const outerW = Math.max(4, Math.round(28 * thicknessScale));
      const midW = Math.max(3, Math.round(18 * thicknessScale));
      const coreW = Math.max(2, Math.round(9 * thicknessScale));

      // Layer 1: Rainbow Starlight Outer Halo
      this.strokeScreenPolyline(gfx, pts, outerW, accentColor, 0.42);
      // Layer 2: Warm Golden Ribbon Body
      this.strokeScreenPolyline(gfx, pts, midW, 0xfbbf24, 0.96);
      // Layer 3: Crisp Cream-White High-Contrast Core
      this.strokeScreenPolyline(gfx, pts, coreW, 0xfefce8, 1.0);
    });
  }

  private strokeScreenPolyline(
    gfx: Phaser.GameObjects.Graphics,
    pts: Array<{ x: number; y: number }>,
    width: number,
    color: number,
    alpha: number
  ): void {
    if (pts.length === 0) return;
    gfx.fillStyle(color, alpha);
    gfx.lineStyle(width, color, alpha);

    if (pts.length === 1) {
      gfx.fillCircle(pts[0].x, pts[0].y, width / 2);
      return;
    }

    gfx.beginPath();
    gfx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      gfx.lineTo(pts[i].x, pts[i].y);
    }
    gfx.strokePath();

    // Round caps & joints so thick pixel-art ink ribbons look smooth around curves
    const capRadius = width * 0.48;
    const step = pts.length > 24 ? 2 : 1;
    for (let i = 0; i < pts.length; i += step) {
      gfx.fillCircle(pts[i].x, pts[i].y, capRadius);
    }
    const last = pts[pts.length - 1];
    gfx.fillCircle(last.x, last.y, capRadius);
  }

  // ===========================================================================
  // 8. 60FPS GAME LOOP: DRIVING PHYSICS, TRACK SPAWNS & GHOST QUILL GUIDE
  // ===========================================================================

  public update(_time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    this.guidePulseTime += dt;

    if (this.offTrackFlashTimer > 0) {
      this.offTrackFlashTimer = Math.max(0, this.offTrackFlashTimer - delta);
    }

    // Animate ghost guide quill along the active stroke when child is not touching canvas
    if (this.phase === 'SKY_GATE_PENMANSHIP') {
      const stroke = this.penmanship.getCurrentStroke();
      if (stroke && !this.isPointerDownOnCanvas && stroke.waypoints.length > 1) {
        this.ghostGuideQuill.setVisible(true);
        const cycle = (this.guidePulseTime * 0.55) % 1;
        const idx = Math.min(
          stroke.waypoints.length - 1,
          Math.floor(cycle * stroke.waypoints.length)
        );
        const pt = this.penmanship.normalizedToScreen(stroke.waypoints[idx]);
        this.ghostGuideQuill.setPosition(pt.x, pt.y);
      } else {
        this.ghostGuideQuill.setVisible(false);
      }
      this.renderPenmanshipGuides();
      return;
    }

    if (
      this.phase !== 'RACE_DRIVING' &&
      this.phase !== 'GATE_APPROACHING' &&
      this.phase !== 'GATE_TURBO_LAUNCH' &&
      this.phase !== 'FINISH_ARCH_SPRINT'
    ) {
      return;
    }

    // 1. Update Turbo Speed Decay
    if (this.turboBoostTimer > 0) {
      this.turboBoostTimer = Math.max(0, this.turboBoostTimer - delta);
      this.trackSpeed = 720;
    } else {
      this.trackSpeed = Phaser.Math.Linear(this.trackSpeed, this.baseTrackSpeed, dt * 4);
    }

    // 2. Scroll Parallax Sky Clouds & Road Lane Stripes
    const scrollDx = this.trackSpeed * dt;
    this.trackScrollOffset = (this.trackScrollOffset + scrollDx) % 120;
    this.skyClouds.forEach((cl, idx) => {
      cl.x -= scrollDx * (0.12 + idx * 0.04);
      if (cl.x < -160) cl.x = 1440;
    });
    this.drawScrollingTrackStripes();

    // 3. Smooth Hero Kart Lane Steering & Jump Physics
    this.heroTargetY = LANE_YS[this.heroLane];
    this.heroCurrentY = Phaser.Math.Linear(this.heroCurrentY, this.heroTargetY, dt * 11);

    if (this.heroJumpZ > 0 || this.heroJumpVelZ !== 0) {
      this.heroJumpZ += this.heroJumpVelZ * dt;
      this.heroJumpVelZ -= 980 * dt;
      if (this.heroJumpZ <= 0) {
        this.heroJumpZ = 0;
        this.heroJumpVelZ = 0;
        Juice.squashAndStretch(this, this.heroKartSprite, 0.14, 150);
      }
    }

    const engineBob = Math.sin(this.guidePulseTime * 18) * 2.2;
    this.heroContainer.setPosition(255, this.heroCurrentY);
    this.heroContainer.setDepth(17 + this.heroLane);
    this.heroKartSprite.setY(-this.heroJumpZ + engineBob);
    const jumpScale = 0.72 + (this.heroJumpZ / 90) * 0.14;
    this.heroKartSprite.setScale(jumpScale);
    this.heroShadowGfx.setScale(1 - (this.heroJumpZ / 160) * 0.35);

    this.drawHeroRainbowExhaust();

    // 4. Update Friendly Rival Karts (Sparky & Doggie)
    this.updateRivalKarts(dt);

    // 5. Spawn & Scroll Track Collectibles (Star Coins, Boost Pads, Cloud Ramps)
    if (this.phase === 'RACE_DRIVING') {
      this.updateTrackObjects(scrollDx);
      this.legDistanceRemaining -= scrollDx;

      if (this.legDistanceRemaining <= 0) {
        this.phase = 'GATE_APPROACHING';
        this.approachingGateSprite.setPosition(1380, 520).setVisible(true);
      }
    } else if (this.phase === 'GATE_APPROACHING') {
      this.updateTrackObjects(scrollDx);
      this.approachingGateSprite.x -= scrollDx;
      if (this.approachingGateSprite.x <= 820) {
        this.openSkyGatePenmanshipChallenge();
      }
    } else if (this.phase === 'FINISH_ARCH_SPRINT') {
      this.finishArchSprite.x -= scrollDx;
      if (this.finishArchSprite.x <= 320) {
        this.showPodiumCelebration();
      }
    }
  }

  private drawScrollingTrackStripes(): void {
    this.trackStripeGfx.clear();

    // Two golden-white dashed lane dividers separating the 3 cobblestone lanes
    const dividerYs = [515, 593];
    this.trackStripeGfx.fillStyle(0xfef08a, 0.58);
    dividerYs.forEach((dy) => {
      for (let x = -120; x < 1360; x += 120) {
        const sx = x - this.trackScrollOffset;
        this.trackStripeGfx.fillRoundedRect(sx, dy - 3, 58, 6, 3);
      }
    });
  }

  private drawHeroRainbowExhaust(): void {
    this.heroExhaustGfx.clear();
    const isBoosting = this.turboBoostTimer > 0;
    const plumeLen = isBoosting ? 95 : 42;
    const baseY = -this.heroJumpZ + 6;

    for (let i = 0; i < RAINBOW_COLORS.length; i++) {
      const ry = baseY - 12 + i * 4.5;
      const wave = Math.sin(this.guidePulseTime * 22 + i * 0.8) * (isBoosting ? 7 : 3);
      this.heroExhaustGfx.lineStyle(isBoosting ? 5 : 3, RAINBOW_COLORS[i], isBoosting ? 0.92 : 0.65);
      this.heroExhaustGfx.beginPath();
      this.heroExhaustGfx.moveTo(-72, ry);
      this.heroExhaustGfx.lineTo(-72 - plumeLen * 0.5, ry + wave);
      this.heroExhaustGfx.lineTo(-72 - plumeLen, ry - wave * 0.6);
      this.heroExhaustGfx.strokePath();
    }
  }

  private updateRivalKarts(dt: number): void {
    this.rivalKarts.forEach((rival, idx) => {
      rival.bobPhase += dt * 14;
      rival.laneTimer -= dt * 1000;
      if (rival.laneTimer <= 0) {
        rival.laneTimer = Phaser.Math.Between(2800, 4600);
        // Pick a lane that doesn't collide with hero
        const candidates = [0, 1, 2].filter((l) => l !== this.heroLane);
        rival.targetLane = candidates[idx % candidates.length];
      }

      const targetY = LANE_YS[rival.targetLane];
      rival.y = Phaser.Math.Linear(rival.y, targetY, dt * 5);
      const targetX = rival.baseX + Math.sin(this.guidePulseTime * 1.6 + idx * 2) * 55;
      rival.x = Phaser.Math.Linear(rival.x, targetX, dt * 3);

      rival.container.setPosition(rival.x, rival.y);
      rival.container.setDepth(16 + Math.round((rival.y - 476) / 78));
      rival.sprite.setY(Math.sin(rival.bobPhase) * 2.5);
    });
  }

  private updateTrackObjects(scrollDx: number): void {
    this.nextSpawnX -= scrollDx;
    if (this.nextSpawnX <= 0 && this.legDistanceRemaining > 420) {
      this.spawnTrackGroup(1360);
      this.nextSpawnX = Phaser.Math.Between(340, 480);
    }

    for (let i = this.trackObjects.length - 1; i >= 0; i--) {
      const obj = this.trackObjects[i];
      obj.x -= scrollDx;
      obj.sprite.setX(obj.x);
      if (obj.glow) obj.glow.setX(obj.x);

      // Check collision with Hero Kart (`x: 255`)
      if (!obj.collected && Math.abs(obj.x - 255) < 68 && Math.abs(obj.y - this.heroCurrentY) < 46) {
        obj.collected = true;
        this.onHitTrackObject(obj);
      }

      if (obj.x < -140) {
        obj.sprite.destroy();
        if (obj.glow) obj.glow.destroy();
        this.trackObjects.splice(i, 1);
      }
    }
  }

  private spawnTrackGroup(startX: number): void {
    const lane = Phaser.Math.Between(0, 2);
    const roll = Math.random();

    if (roll < 0.58) {
      // Spawn a ribbon of 3 Golden Star Coins
      for (let c = 0; c < 3; c++) {
        const cx = startX + c * 74;
        const cy = LANE_YS[lane];
        const glow = this.add
          .image(cx, cy - 10, 'hub-radial-glow')
          .setDisplaySize(68, 68)
          .setTint(0xfef08a)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.35);
        const sprite = this.add
          .image(cx, cy - 10, 'spr-star-coin')
          .setDisplaySize(52, 52);
        this.trackObjectsContainer.add([glow, sprite]);
        this.trackObjects.push({
          id: this.nextTrackObjId++,
          kind: 'coin',
          lane,
          x: cx,
          y: cy,
          collected: false,
          sprite,
          glow
        });
      }
    } else if (roll < 0.82) {
      // Spawn a Rainbow Chevron Speed Boost Pad
      const cy = LANE_YS[lane];
      const sprite = this.add
        .image(startX, cy + 16, 'spr-boost-pad')
        .setDisplaySize(118, 72);
      this.trackObjectsContainer.add(sprite);
      this.trackObjects.push({
        id: this.nextTrackObjId++,
        kind: 'boost',
        lane,
        x: startX,
        y: cy,
        collected: false,
        sprite
      });
    } else {
      // Spawn a Fluffy Cloud Jump Ramp
      const cy = LANE_YS[lane];
      const sprite = this.add
        .image(startX, cy + 10, 'spr-cloud-ramp')
        .setDisplaySize(116, 78);
      this.trackObjectsContainer.add(sprite);
      this.trackObjects.push({
        id: this.nextTrackObjId++,
        kind: 'ramp',
        lane,
        x: startX,
        y: cy,
        collected: false,
        sprite
      });
    }
  }

  private onHitTrackObject(obj: TrackObject): void {
    if (obj.kind === 'coin') {
      this.raceCoinsCollected++;
      this.coinCombo++;
      this.coinCountText.setText(String(this.raceCoinsCollected));
      ArcadeState.addStars(1);
      this.audio.playStarCoinPickup(this.coinCombo);
      Juice.burstStars(this, obj.x, obj.y - 16, 8, [0xfef08a, 0xfbbf24, 0xffffff]);
      obj.sprite.setVisible(false);
      if (obj.glow) obj.glow.setVisible(false);
    } else if (obj.kind === 'boost') {
      this.turboBoostTimer = 1400;
      this.audio.playRainbowBoostPad();
      Juice.popFloatingLabel(this, this.heroContainer.x, this.heroContainer.y - 65, '⚡ TURBO!', '#fef08a');
      Juice.burstStars(this, obj.x, obj.y, 14, RAINBOW_COLORS);
    } else if (obj.kind === 'ramp') {
      this.heroJumpVelZ = 430;
      this.audio.playCloudRampJump();
      Juice.popFloatingLabel(this, this.heroContainer.x, this.heroContainer.y - 75, '☁️ SKY HOP!', '#38bdf8');
    }
  }

  private clearTrackObjects(): void {
    this.trackObjects.forEach((o) => {
      o.sprite.destroy();
      if (o.glow) o.glow.destroy();
    });
    this.trackObjects = [];
  }

  private steerHeroLane(deltaLane: -1 | 1): void {
    if (this.phase !== 'RACE_DRIVING' && this.phase !== 'GATE_APPROACHING') return;
    const next = Phaser.Math.Clamp(this.heroLane + deltaLane, 0, 2);
    if (next !== this.heroLane) {
      this.heroLane = next;
      AudioBus.playSfx('pop');
      Juice.squashAndStretch(this, this.heroKartSprite, 0.1, 120);
    }
  }

  private steerHeroToPointerY(pointerY: number): void {
    let bestLane = 0;
    let bestDist = Infinity;
    LANE_YS.forEach((ly, idx) => {
      const d = Math.abs(pointerY - ly);
      if (d < bestDist) {
        bestDist = d;
        bestLane = idx;
      }
    });
    if (bestLane !== this.heroLane) {
      this.heroLane = bestLane;
      Juice.squashAndStretch(this, this.heroKartSprite, 0.08, 110);
    }
  }

  private triggerManualMiniBoost(): void {
    if (this.phase !== 'RACE_DRIVING' && this.phase !== 'GATE_APPROACHING') return;
    this.turboBoostTimer = Math.max(this.turboBoostTimer, 1100);
    this.audio.playRainbowBoostPad();
    Juice.squashAndStretch(this, this.heroKartSprite, 0.15, 150);
    Juice.burstStars(this, this.heroContainer.x - 45, this.heroContainer.y, 10, RAINBOW_COLORS);
  }
}
