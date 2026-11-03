import Phaser from 'phaser';
import { ArcadeState } from '../core/ArcadeState';
import { AudioBus } from '../core/AudioBus';
import { Juice } from '../core/Juice';
import { TinkerAudioEngine } from '../audio/TinkerAudioEngine';

/**
 * 8x5 Walnut Pegboard Grid Coordinates inside the 936x560 Center Window (`x: 172..1108, y: 28..588`).
 */
const PEG_COLS_X = [337, 422, 509, 596, 684, 770, 856, 943] as const;
const PEG_ROWS_Y = [193, 264, 336, 407, 478] as const;

/**
 * Bottom Broom & Dustpan Clear / Trash Button Coordinates (`x: 970, y: 662`).
 */
const CLEAR_BTN_X = 970;
const CLEAR_BTN_Y = 662;

type PartType =
  | 'part-chute'
  | 'part-gear'
  | 'part-trampoline'
  | 'part-seesaw'
  | 'part-bellows'
  | 'part-hammer'
  | 'part-wall'
  | 'prop-bumper'
  | 'part-funnel'
  | 'part-flipper';

type WorkshopMode = 'freeplay' | 'stars';
type AmmoType = 'marble' | 'acorn';

interface PartConfig {
  key: PartType;
  cubbyW: number;
  cubbyH: number;
  boardW: number;
  boardH: number;
  originX: number;
  originY: number;
}

/**
 * Unified catalog of all 10 placeable Contraption Parts & Bonus Physics Shapes:
 * - Left 5 Cubbies (`x = 78`): `part-chute`, `part-gear`, `part-trampoline`, `part-seesaw`, `part-bellows`
 * - Right 4 Shelves (`x = 1202`, 2 pages):
 *   - Page 0: `part-hammer`, `part-wall`, `prop-bumper` (scaled down 15%), `part-funnel`
 *   - Page 1: `part-flipper`
 */
const PART_CONFIGS: Record<PartType, PartConfig> = {
  'part-chute': {
    key: 'part-chute',
    cubbyW: 112,
    cubbyH: 64,
    boardW: 156,
    boardH: 88,
    originX: 0.5,
    originY: 0.56
  },
  'part-gear': {
    key: 'part-gear',
    cubbyW: 86,
    cubbyH: 86,
    boardW: 108,
    boardH: 108,
    originX: 0.5,
    originY: 0.5
  },
  'part-trampoline': {
    key: 'part-trampoline',
    cubbyW: 106,
    cubbyH: 74,
    boardW: 132,
    boardH: 92,
    originX: 0.5,
    originY: 0.55
  },
  'part-seesaw': {
    key: 'part-seesaw',
    cubbyW: 114,
    cubbyH: 42,
    boardW: 152,
    boardH: 52,
    originX: 0.5,
    originY: 0.5
  },
  'part-bellows': {
    key: 'part-bellows',
    cubbyW: 106,
    cubbyH: 74,
    boardW: 134,
    boardH: 94,
    originX: 0.5,
    originY: 0.52
  },
  'part-hammer': {
    key: 'part-hammer',
    cubbyW: 68,
    cubbyH: 88,
    boardW: 78,
    boardH: 104,
    originX: 0.5,
    originY: 0.15
  },
  'part-wall': {
    key: 'part-wall',
    cubbyW: 28,
    cubbyH: 94,
    boardW: 34,
    boardH: 125,
    originX: 0.5,
    originY: 0.5
  },
  'prop-bumper': {
    key: 'prop-bumper',
    cubbyW: 65,
    cubbyH: 65,
    boardW: 58,
    boardH: 58,
    originX: 0.5,
    originY: 0.5
  },
  'part-funnel': {
    key: 'part-funnel',
    cubbyW: 94,
    cubbyH: 76,
    boardW: 118,
    boardH: 96,
    originX: 0.5,
    originY: 0.48
  },
  'part-flipper': {
    key: 'part-flipper',
    cubbyW: 104,
    cubbyH: 64,
    boardW: 136,
    boardH: 82,
    originX: 0.5,
    originY: 0.52
  }
};

const LEFT_CUBBY_PARTS: Array<{ key: PartType; y: number }> = [
  { key: 'part-chute', y: 88 },
  { key: 'part-gear', y: 198 },
  { key: 'part-trampoline', y: 308 },
  { key: 'part-seesaw', y: 418 },
  { key: 'part-bellows', y: 528 }
];

const RIGHT_SHELF_PAGES: PartType[][] = [
  ['part-hammer', 'part-wall', 'prop-bumper', 'part-funnel'],
  ['part-flipper']
];

interface PlacedPart {
  col: number;
  row: number;
  type: PartType;
  dir: 1 | -1;
  tiltDir: 1 | -1;
  currentAngleDeg: number;
  lockedByPuzzle: boolean;
  sprite: Phaser.GameObjects.Image;
  glowRing: Phaser.GameObjects.Arc;
  busyUntil: number;
  swingPhase: number;
}

interface StarInstance {
  index: 0 | 1 | 2;
  col: number;
  row: number;
  x: number;
  y: number;
  collected: boolean;
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Arc;
}

/**
 * Physics state for active marbles & acorns in the 8-substep continuous 2D rigid-body loop.
 */
interface SimBallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  restitution: number;
  isAcorn: boolean;
  rotation: number;
  simTime: number;
  ridingGearKey: string | null;
  gearCarryElapsed: number;
  inBellowsKey: string | null;
  bellowsTimer: number;
  lastGearKey: string;
  lastGearCooldown: number;
  lastBellowsKey: string;
  lastBellowsCooldown: number;
  lastSeesawKey: string;
  lastSeesawCooldown: number;
  touchingSeesawKey: string;
  touchingSeesawSubsteps: number;
  lastTrampolineKey: string;
  lastTrampolineCooldown: number;
  lastHammerKey: string;
  lastHammerCooldown: number;
  lastWallKey: string;
  lastWallCooldown: number;
  lastFunnelKey: string;
  lastFunnelCooldown: number;
  lastFlipperKey: string;
  lastFlipperCooldown: number;
  lastRollTickCooldown: number;
}

interface ActiveBall extends SimBallState {
  id: number;
  sprite: Phaser.GameObjects.Image;
  caught: boolean;
  spawnTime: number;
}

const FOUNTAIN_MARBLE_TINTS = [0xffffff, 0x7dd3fc, 0xfde047, 0x6ee7b7, 0xf9a8d4, 0xc4b5fd];

/**
 * Heirloom Tinker Workshop ("The Clockwork Marble & Acorn Automaton Wall")
 * Built for Wyatt (age 4) and Emma (age 3) — zero reading required, true 2D sub-stepped rigid-body physics,
 * elastic ball-to-ball collisions, 11 interactive contraption gadgets across Left & Right shelves,
 * Vacuum-Load & Blast Dragon Bellows, and Procedural Randomized 3-Star Challenge Mode!
 */
export class TinkerWorkshopScene extends Phaser.Scene {
  private audio!: TinkerAudioEngine;

  // Workshop State
  private activeMode: WorkshopMode = 'stars';
  private fountainEnabled = false;
  private activeAmmo: AmmoType = 'marble';
  private rightShelfPage = 0; // 0 = Page 1 (hammer, bowl, wedge, funnel), 1 = Page 2 (flipper, bumper)
  private rightPageDots: Phaser.GameObjects.Arc[] = [];
  private simClockSeconds = 0;

  // Board Grid & Contraption State
  private placedParts: Map<string, PlacedPart> = new Map();
  private pegHalos: Phaser.GameObjects.Arc[][] = [];
  private emptyPegInviteDots: Phaser.GameObjects.Arc[][] = [];
  private starInstances: StarInstance[] = [];

  // Sparky Hopper & Pull-Chain (`y = 102` along top brass gantry)
  private launchCol = 1;
  private sparkySprite!: Phaser.GameObjects.Image;
  private pullChainSprite!: Phaser.GameObjects.Image;
  private hopperAmmoBadge!: Phaser.GameObjects.Image;
  private hopperAmmoRing!: Phaser.GameObjects.Arc;
  private sparkyAnimTimer: Phaser.Time.TimerEvent | null = null;
  private isDraggingSparky = false;

  // Doggie Minecart Catcher (`y = 515` along bottom railroad track)
  private targetCol = 5;
  private doggieSprite!: Phaser.GameObjects.Image;
  private doggieAnimTimer: Phaser.Time.TimerEvent | null = null;
  private isDraggingDoggie = false;
  private isCelebratingVictory = false;

  // Doggie 3-Star Challenge HUD & Basket Barrier Shimmer
  private basketHudContainer!: Phaser.GameObjects.Container;
  private basketStarSlots: Phaser.GameObjects.Image[] = [];
  private basketCounterText!: Phaser.GameObjects.Text;
  private basketBarrierGraphics!: Phaser.GameObjects.Graphics;
  private basketRimHalo!: Phaser.GameObjects.Arc;
  private basketShimmerPhase = 0;

  // Active Marbles & Acorns
  private activeBalls: ActiveBall[] = [];
  private nextBallId = 1;
  private starsCollectedCount = 0;
  private fountainTimer: Phaser.Time.TimerEvent | null = null;
  private fountainCounter = 0;
  private pairClinkCooldowns: Map<string, number> = new Map();

  // Drag-and-Drop & Trajectory Sight-Line State
  private dragGhost: Phaser.GameObjects.Image | null = null;
  private dragPartType: PartType | null = null;
  private dragPartDir: 1 | -1 = 1;
  private dragSourcePegKey: string | null = null;
  private isDraggingFromBoard = false;
  private dragStartPointerPos = { x: 0, y: 0 };
  private trajectoryGraphics!: Phaser.GameObjects.Graphics;
  private trajectoryFadeTween: Phaser.Tweens.Tween | null = null;

  // UI Containers & Highlights
  private rightShelfContainer!: Phaser.GameObjects.Container;
  private bottomModeGlows: Map<string, Phaser.GameObjects.Arc> = new Map();
  private bottomModeFrames: Map<string, Phaser.GameObjects.Image> = new Map();

  // Ammo Button (`x: 810, y: 662`) Badge Overlay
  private ammoBtnGlow!: Phaser.GameObjects.Arc;
  private ammoBtnBadgeRing!: Phaser.GameObjects.Arc;
  private ammoBtnBadgeIcon!: Phaser.GameObjects.Image;

  // Broom & Dustpan Trash Drop-Zone UI (`x: 970, y: 662`)
  private clearBtnGlow!: Phaser.GameObjects.Arc;
  private clearBtnFrame!: Phaser.GameObjects.Image;
  private clearBtnIcon!: Phaser.GameObjects.Image;
  private clearTrashPulseTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super({ key: 'TinkerWorkshopScene' });
  }

  public create(): void {
    this.audio = new TinkerAudioEngine();

    // Reset state cleanly on scene entry
    this.placedParts.clear();
    this.pegHalos = [];
    this.emptyPegInviteDots = [];
    this.starInstances = [];
    this.activeBalls = [];
    this.pairClinkCooldowns.clear();
    this.bottomModeGlows.clear();
    this.bottomModeFrames.clear();
    this.starsCollectedCount = 0;
    this.activeMode = 'stars';
    this.fountainEnabled = false;
    this.activeAmmo = 'marble';
    this.rightShelfPage = 0;
    this.simClockSeconds = 0;
    this.isDraggingSparky = false;
    this.isDraggingDoggie = false;
    this.isCelebratingVictory = false;

    // 1. Full-Screen Composite Background (`1280x720`)
    this.add.image(640, 360, 'tinker-frame-bg').setDepth(0);

    // 2. Build 8x5 Pegboard Visual Socket Highlights (Bare wall pegs are 100% ghost to balls!)
    this.buildPegGridVisuals();

    // 3. Trajectory Sight-Line Graphics Layer
    this.trajectoryGraphics = this.add.graphics().setDepth(28);

    // 4. Build Sparky Top Hopper & Brass Pull-Chain (`y = 102`) + Doggie Bottom Minecart + 3-Star HUD (`y = 515`)
    this.buildSparkyHopperAndChain();
    this.buildDoggieMinecartAndStarHud();

    // 5. Build Left 5 Contraption Tool Cubbies (`x = 78`)
    this.buildLeftToolCubbies();

    // 6. Build Right 4 Bonus Physics Gadget Shelves (`x = 1202`) + Page Arrows (`y = 662`)
    this.rightShelfContainer = this.add.container(0, 0).setDepth(35);
    this.buildRightShelfPageArrows();
    this.renderRightGadgetShelves();

    // 7. Build Bottom Trough Controls (`y = 662`)
    this.buildBottomTroughControls();

    // 8. Register Unified Pointer Drag-and-Drop Handlers
    this.registerPointerDragHandlers();

    // 9. Generate Initial Procedural 3-Star Challenge Board
    this.generateProceduralStarChallenge(false);

    // Clean up audio & timers on scene shutdown
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.fountainTimer) {
        this.fountainTimer.remove(false);
        this.fountainTimer = null;
      }
      this.audio.stopAll();
    });
  }

  /**
   * Locks a sprite's immutable baseline scale right after `setDisplaySize(...)` so tweens and `setTexture()`
   * swaps never compound or stretch the sprite.
   */
  private lockBaseScale(
    sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
    dir: number = 1
  ): void {
    const bx = Math.abs(sprite.scaleX);
    const by = Math.abs(sprite.scaleY);
    sprite.setData('baseScaleX', bx);
    sprite.setData('baseScaleY', by);
    sprite.setData('dir', dir);
    sprite.setScale(bx * dir, by);
  }

  /**
   * Restores a sprite's exact baseline scale (and horizontal `dir` sign) after any `setTexture()` swap or interrupted tween.
   */
  private restoreBaseScale(
    sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite
  ): void {
    const bx = (sprite.getData('baseScaleX') as number) ?? Math.abs(sprite.scaleX);
    const by = (sprite.getData('baseScaleY') as number) ?? Math.abs(sprite.scaleY);
    const dir = (sprite.getData('dir') as number) ?? (sprite.scaleX < 0 ? -1 : 1);
    const flipY = (sprite.getData('flipYSign') as number) ?? 1;
    sprite.setScale(bx * dir, by * flipY);
  }

  /**
   * Runs a clean squash-and-stretch pulse relative to the sprite's locked `baseScale`, killing any prior tween first.
   */
  private pulseSprite(
    sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
    multX: number,
    multY: number,
    duration = 140
  ): void {
    this.tweens.killTweensOf(sprite);
    this.restoreBaseScale(sprite);
    const bx = sprite.getData('baseScaleX') as number;
    const by = sprite.getData('baseScaleY') as number;
    const dir = (sprite.getData('dir') as number) ?? 1;
    const flipY = (sprite.getData('flipYSign') as number) ?? 1;

    this.tweens.add({
      targets: sprite,
      scaleX: bx * dir * multX,
      scaleY: by * flipY * multY,
      duration: duration * 0.5,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.restoreBaseScale(sprite);
      }
    });
  }

  /**
   * 1. Builds the 40 Pegboard Mounting Socket Visuals (`8 cols x 5 rows`).
   * Bare wall pegs are strictly visual sockets for placing tools — marbles and acorns pass straight over bare pegs!
   */
  private buildPegGridVisuals(): void {
    for (let c = 0; c < PEG_COLS_X.length; c++) {
      this.pegHalos[c] = [];
      this.emptyPegInviteDots[c] = [];
      for (let r = 0; r < PEG_ROWS_Y.length; r++) {
        const px = PEG_COLS_X[c];
        const py = PEG_ROWS_Y[r];

        const inviteDot = this.add
          .circle(px, py, 6, 0xfde047, 0.20)
          .setDepth(5);

        this.tweens.add({
          targets: inviteDot,
          alpha: { from: 0.10, to: 0.34 },
          scale: { from: 0.9, to: 1.2 },
          duration: 1500 + ((c + r) % 4) * 220,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        this.emptyPegInviteDots[c][r] = inviteDot;

        const halo = this.add
          .circle(px, py, 32, 0xfde047, 0.0)
          .setStrokeStyle(3, 0xfbbf24, 0.0)
          .setDepth(6);
        this.pegHalos[c][r] = halo;
      }
    }
  }

  /**
   * 2. Builds Left 5 Contraption Tool Cubbies (`x = 78, y = 88, 198, 308, 418, 528`).
   */
  private buildLeftToolCubbies(): void {
    const cubbyX = 78;

    LEFT_CUBBY_PARTS.forEach((slot) => {
      const cfg = PART_CONFIGS[slot.key];
      const glow = this.add
        .circle(cubbyX, slot.y, 44, 0xfde047, 0.14)
        .setStrokeStyle(2, 0xfbbf24, 0.35)
        .setDepth(32);

      const icon = this.add
        .image(cubbyX, slot.y, cfg.key)
        .setDisplaySize(cfg.cubbyW, cfg.cubbyH)
        .setDepth(35);
      this.lockBaseScale(icon, 1);

      const hitZone = this.add
        .zone(cubbyX, slot.y, 124, 96)
        .setInteractive({ useHandCursor: true })
        .setDepth(36);

      hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        this.audio.playPegSnap();
        this.pulseSprite(icon, 1.15, 0.88, 150);
        glow.setFillStyle(0xfde047, 0.38);
        this.time.delayedCall(180, () => glow.setFillStyle(0xfde047, 0.14));

        this.startCubbyDrag(cfg.key, pointer);
      });
    });
  }

  /**
   * 3. Builds Right 4 Shelves (`x = 1202, y = 95, 230, 365, 500`) as Bonus Physics Gadget Cubbies (2 Pages)
   * switched via `ui-page-left` and `ui-page-right` at `y = 662`!
   * - Page 1: `part-hammer`, `part-bowl`, `part-wedge`, `part-funnel`
   * - Page 2: `part-flipper`, `prop-bumper`
   */
  private renderRightGadgetShelves(): void {
    this.rightShelfContainer.removeAll(true);

    const shelfX = 1202;
    const shelfYs = [95, 230, 365, 500];
    const pageParts = RIGHT_SHELF_PAGES[this.rightShelfPage] ?? RIGHT_SHELF_PAGES[0];

    pageParts.forEach((partKey, slotIdx) => {
      if (slotIdx >= shelfYs.length) return;
      const sy = shelfYs[slotIdx];
      const cfg = PART_CONFIGS[partKey];

      const glow = this.add
        .circle(shelfX, sy, 44, 0xfde047, 0.16)
        .setStrokeStyle(2.5, 0xfbbf24, 0.45);
      this.rightShelfContainer.add(glow);

      const icon = this.add
        .image(shelfX, sy, cfg.key)
        .setDisplaySize(cfg.cubbyW, cfg.cubbyH);
      this.lockBaseScale(icon, 1);
      this.rightShelfContainer.add(icon);

      const hitZone = this.add
        .zone(shelfX, sy, 124, 104)
        .setInteractive({ useHandCursor: true });

      hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        this.audio.playPegSnap();
        this.pulseSprite(icon, 1.15, 0.88, 150);
        glow.setFillStyle(0xfde047, 0.40);
        this.time.delayedCall(180, () => {
          if (glow.active) glow.setFillStyle(0xfde047, 0.16);
        });

        this.startCubbyDrag(cfg.key, pointer);
      });

      this.rightShelfContainer.add(hitZone);
    });
  }

  private buildRightShelfPageArrows(): void {
    const leftArrow = this.add
      .image(1156, 662, 'ui-page-left')
      .setDisplaySize(54, 54)
      .setDepth(36)
      .setInteractive({ useHandCursor: true });
    this.lockBaseScale(leftArrow, 1);

    const rightArrow = this.add
      .image(1252, 662, 'ui-page-right')
      .setDisplaySize(54, 54)
      .setDepth(36)
      .setInteractive({ useHandCursor: true });
    this.lockBaseScale(rightArrow, 1);

    this.rightPageDots = [0, 1].map((pIdx) =>
      this.add
        .circle(1196 + pIdx * 16, 662, 5, pIdx === this.rightShelfPage ? 0xfde047 : 0x78350f, 1)
        .setStrokeStyle(1.5, 0xfbbf24, 0.8)
        .setDepth(36)
    );

    const cyclePage = (delta: number) => {
      this.rightShelfPage = Phaser.Math.Wrap(this.rightShelfPage + delta, 0, RIGHT_SHELF_PAGES.length);
      AudioBus.playSfx('tab');
      this.rightPageDots.forEach((dot, idx) => {
        dot.setFillStyle(idx === this.rightShelfPage ? 0xfde047 : 0x78350f, 1);
      });
      this.renderRightGadgetShelves();
    };

    leftArrow.on('pointerdown', () => {
      this.pulseSprite(leftArrow, 1.15, 1.15, 130);
      cyclePage(-1);
    });

    rightArrow.on('pointerdown', () => {
      this.pulseSprite(rightArrow, 1.15, 1.15, 130);
      cyclePage(1);
    });
  }

  /**
   * 4. Builds Sparky's Brass Hopper (`y = 102`), Loaded-Ammo Preview Badge, and Brass Pull-Chain (`y = 112`).
   * - Clicking/tapping Sparky or pulling the Brass Chain drops a ball immediately.
   * - In Free-Play Mode (`'freeplay'`), kids can drag Sparky left/right across the top gantry columns (`0..7`)!
   * - In 3-Star Challenge Mode (`'stars'`), Sparky is locked to `this.launchCol` (trying to drag gives a gentle wiggle).
   */
  private buildSparkyHopperAndChain(): void {
    const hopperX = PEG_COLS_X[this.launchCol];
    const hopperY = 102;

    this.pullChainSprite = this.add
      .image(hopperX - 65, hopperY + 12, 'prop-pull-chain')
      .setDisplaySize(38, 92)
      .setDepth(24)
      .setInteractive({ useHandCursor: true });
    this.lockBaseScale(this.pullChainSprite, 1);

    this.sparkySprite = this.add
      .image(hopperX, hopperY, 'sparky-hopper-1')
      .setDisplaySize(134, 112)
      .setDepth(25)
      .setInteractive({ useHandCursor: true, draggable: true });
    this.lockBaseScale(this.sparkySprite, 1);
    this.input.setDraggable(this.sparkySprite);

    this.hopperAmmoRing = this.add
      .circle(hopperX + 42, hopperY - 24, 17, 0x1e293b, 0.85)
      .setStrokeStyle(2.5, 0xfbbf24, 0.95)
      .setDepth(26);

    this.hopperAmmoBadge = this.add
      .image(hopperX + 42, hopperY - 24, 'prop-marble')
      .setDisplaySize(24, 24)
      .setDepth(27);
    this.lockBaseScale(this.hopperAmmoBadge, 1);

    const triggerDrop = () => {
      if (this.activeMode === 'stars' && this.activeBalls.length === 0) {
        this.resetStarsForNewRun();
      }
      this.spawnBallFromHopper();
    };

    let sparkyDragStartX = 0;
    let sparkyDragged = false;

    this.sparkySprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      sparkyDragStartX = pointer.x;
      sparkyDragged = false;
    });

    this.sparkySprite.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
      if (Math.abs(_pointer.x - sparkyDragStartX) > 12) {
        sparkyDragged = true;
      }
      if (!sparkyDragged) return;

      if (this.activeMode === 'stars') {
        if (!this.isDraggingSparky) {
          this.isDraggingSparky = true;
          this.audio.playRotateClick();
          this.tweens.killTweensOf(this.sparkySprite);
          const lockedX = PEG_COLS_X[this.launchCol];
          this.tweens.add({
            targets: this.sparkySprite,
            x: { from: lockedX - 7, to: lockedX + 7 },
            duration: 65,
            yoyo: true,
            repeat: 2,
            onUpdate: () => this.syncSparkyAttachments(),
            onComplete: () => {
              this.sparkySprite.x = lockedX;
              this.syncSparkyAttachments();
              this.isDraggingSparky = false;
            }
          });
        }
        return;
      }

      this.isDraggingSparky = true;
      const clampedX = Phaser.Math.Clamp(dragX, PEG_COLS_X[0], PEG_COLS_X[PEG_COLS_X.length - 1]);
      this.sparkySprite.x = clampedX;
      this.syncSparkyAttachments();

      let nearestCol = 0;
      let minD = Infinity;
      PEG_COLS_X.forEach((cx, idx) => {
        const d = Math.abs(clampedX - cx);
        if (d < minD) {
          minD = d;
          nearestCol = idx;
        }
      });
      this.launchCol = nearestCol;
    });

    this.sparkySprite.on('dragend', () => {
      if (!sparkyDragged) return;
      if (this.activeMode === 'freeplay') {
        const snappedX = PEG_COLS_X[this.launchCol];
        this.audio.playPegSnap();
        this.tweens.add({
          targets: this.sparkySprite,
          x: snappedX,
          duration: 140,
          ease: 'Back.easeOut',
          onUpdate: () => this.syncSparkyAttachments(),
          onComplete: () => {
            this.syncSparkyAttachments();
            this.isDraggingSparky = false;
          }
        });
      } else {
        this.isDraggingSparky = false;
      }
    });

    this.sparkySprite.on('pointerup', () => {
      if (!sparkyDragged) {
        triggerDrop();
      }
    });

    this.pullChainSprite.on('pointerdown', () => {
      this.tweens.killTweensOf(this.pullChainSprite);
      this.pullChainSprite.y = hopperY + 12;
      this.tweens.add({
        targets: this.pullChainSprite,
        y: hopperY + 30,
        duration: 110,
        yoyo: true,
        ease: 'Back.easeOut'
      });
      triggerDrop();
    });
  }

  private syncSparkyAttachments(): void {
    const sx = this.sparkySprite.x;
    const sy = this.sparkySprite.y;
    this.pullChainSprite.x = sx - 65;
    this.hopperAmmoRing.setPosition(sx + 42, sy - 24);
    this.hopperAmmoBadge.setPosition(sx + 42, sy - 24);
  }

  private playSparkyDropAnim(): void {
    if (this.sparkyAnimTimer) {
      this.sparkyAnimTimer.remove(false);
    }

    this.sparkySprite.setTexture('sparky-hopper-2');
    this.restoreBaseScale(this.sparkySprite);
    this.pulseSprite(this.sparkySprite, 1.08, 0.92, 160);

    this.sparkyAnimTimer = this.time.delayedCall(180, () => {
      this.sparkySprite.setTexture('sparky-hopper-3');
      this.restoreBaseScale(this.sparkySprite);

      this.sparkyAnimTimer = this.time.delayedCall(260, () => {
        this.sparkySprite.setTexture('sparky-hopper-1');
        this.restoreBaseScale(this.sparkySprite);
      });
    });
  }

  /**
   * 5. Builds Doggie's Minecart Catcher (`y = 515`) AND the attached 3-Star Progress Tracker HUD + Rim Barrier Shimmer!
   */
  private buildDoggieMinecartAndStarHud(): void {
    const cartX = this.getDoggieCartXForCol(this.targetCol);
    const cartY = 515;

    this.doggieSprite = this.add
      .image(cartX, cartY, 'doggie-cart-1')
      .setDisplaySize(138, 108)
      .setDepth(25)
      .setInteractive({ useHandCursor: true, draggable: true });
    this.lockBaseScale(this.doggieSprite, 1);
    this.input.setDraggable(this.doggieSprite);

    this.basketRimHalo = this.add
      .circle(cartX + 28, cartY - 12, 34, 0x34d399, 0)
      .setStrokeStyle(3, 0xfde047, 0)
      .setDepth(25);

    this.basketBarrierGraphics = this.add.graphics().setDepth(26);

    this.basketHudContainer = this.add.container(cartX + 18, cartY - 68).setDepth(27);

    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x271206, 0.90);
    hudBg.lineStyle(2.5, 0xfbbf24, 0.95);
    hudBg.fillRoundedRect(-68, -20, 136, 38, 12);
    hudBg.strokeRoundedRect(-68, -20, 136, 38, 12);
    this.basketHudContainer.add(hudBg);

    this.basketStarSlots = [];
    const slotXs = [-44, -18, 8];
    slotXs.forEach((sx) => {
      const slotStar = this.add
        .image(sx, -1, 'prop-star')
        .setDisplaySize(24, 24)
        .setTint(0x451a03)
        .setAlpha(0.55);
      this.lockBaseScale(slotStar, 1);
      this.basketHudContainer.add(slotStar);
      this.basketStarSlots.push(slotStar);
    });

    this.basketCounterText = this.add
      .text(42, -1, '0/3', {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#fde047',
        stroke: '#451a03',
        strokeThickness: 3
      })
      .setOrigin(0.5, 0.5);
    this.basketHudContainer.add(this.basketCounterText);

    this.doggieSprite.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
      if (this.activeMode === 'stars') {
        if (!this.isDraggingDoggie) {
          this.isDraggingDoggie = true;
          this.audio.playRotateClick();
          this.tweens.killTweensOf(this.doggieSprite);
          const lockedX = this.getDoggieCartXForCol(this.targetCol);
          this.tweens.add({
            targets: this.doggieSprite,
            x: { from: lockedX - 7, to: lockedX + 7 },
            duration: 65,
            yoyo: true,
            repeat: 2,
            onUpdate: () => this.syncDoggieAttachments(),
            onComplete: () => {
              this.doggieSprite.x = lockedX;
              this.syncDoggieAttachments();
              this.isDraggingDoggie = false;
            }
          });
        }
        return;
      }

      this.isDraggingDoggie = true;
      const clampedX = Phaser.Math.Clamp(dragX, 300, 930);
      this.doggieSprite.x = clampedX;
      this.syncDoggieAttachments();

      let nearestCol = 0;
      let minD = Infinity;
      PEG_COLS_X.forEach((cx, idx) => {
        const d = Math.abs(clampedX + 28 - cx);
        if (d < minD) {
          minD = d;
          nearestCol = idx;
        }
      });
      this.targetCol = nearestCol;
    });

    this.doggieSprite.on('dragend', () => {
      this.isDraggingDoggie = false;
      if (this.activeMode === 'freeplay') {
        this.audio.playPegSnap();
      }
    });

    this.refreshBasketStarHud();
  }

  private syncDoggieAttachments(): void {
    const dx = this.doggieSprite.x;
    const dy = this.doggieSprite.y;
    const clampedHudX = Phaser.Math.Clamp(dx + 18, 255, 1025);
    this.basketHudContainer.setPosition(clampedHudX, dy - 68);
    this.basketRimHalo.setPosition(dx + 28, dy - 12);
  }

  private refreshBasketStarHud(): void {
    if (!this.basketHudContainer) return;

    const isStarMode = this.activeMode === 'stars';
    this.basketHudContainer.setVisible(isStarMode);
    this.basketBarrierGraphics.setVisible(isStarMode);
    this.basketRimHalo.setVisible(isStarMode);

    if (!isStarMode) return;

    const count = Phaser.Math.Clamp(this.starsCollectedCount, 0, 3);
    this.basketCounterText.setText(`${count}/3`);
    this.basketCounterText.setColor(count >= 3 ? '#6ee7b7' : '#fde047');

    this.basketStarSlots.forEach((slot, idx) => {
      this.restoreBaseScale(slot);
      if (idx < count) {
        slot.clearTint();
        slot.setAlpha(1);
      } else {
        slot.setTint(0x451a03);
        slot.setAlpha(0.55);
      }
    });

    if (count >= 3) {
      this.basketRimHalo.setFillStyle(0x34d399, 0.28);
      this.basketRimHalo.setStrokeStyle(3.5, 0xfde047, 0.95);
    } else {
      this.basketRimHalo.setFillStyle(0x34d399, 0);
      this.basketRimHalo.setStrokeStyle(3, 0xfde047, 0);
    }
  }

  private updateBasketBarrierShimmer(dt: number): void {
    this.basketBarrierGraphics.clear();
    if (this.activeMode !== 'stars' || this.starsCollectedCount >= 3) return;

    this.basketShimmerPhase += dt * 4.5;
    const rimX = this.doggieSprite.x + 28;
    const rimY = this.doggieSprite.y - 14;
    const pulseAlpha = 0.42 + 0.22 * Math.sin(this.basketShimmerPhase);

    this.basketBarrierGraphics.fillStyle(0xfbbf24, pulseAlpha * 0.45);
    this.basketBarrierGraphics.fillRoundedRect(rimX - 34, rimY - 5, 68, 10, 5);
    this.basketBarrierGraphics.lineStyle(2.5, 0xfde047, pulseAlpha);
    this.basketBarrierGraphics.strokeRoundedRect(rimX - 34, rimY - 5, 68, 10, 5);
  }

  private getDoggieCartXForCol(col: number): number {
    return PEG_COLS_X[Phaser.Math.Clamp(col, 0, PEG_COLS_X.length - 1)] - 28;
  }

  private playDoggieCatchAnim(isGrandVictory: boolean): void {
    if (this.doggieAnimTimer) {
      this.doggieAnimTimer.remove(false);
    }

    this.doggieSprite.setTexture('doggie-cart-2');
    this.restoreBaseScale(this.doggieSprite);
    this.pulseSprite(this.doggieSprite, 1.12, 0.88, 150);

    const holdDuration = isGrandVictory ? 1200 : 520;
    this.doggieAnimTimer = this.time.delayedCall(150, () => {
      this.doggieSprite.setTexture('doggie-cart-3');
      this.restoreBaseScale(this.doggieSprite);
      this.pulseSprite(this.doggieSprite, 1.15, 0.90, 220);

      this.doggieAnimTimer = this.time.delayedCall(holdDuration, () => {
        this.doggieSprite.setTexture('doggie-cart-1');
        this.restoreBaseScale(this.doggieSprite);
      });
    });
  }

  /**
   * Spawns a new active ball (`radius = 18px`) from Sparky's hopper using the selected `this.activeAmmo`:
   * - Glass Marble (`prop-marble`): `mass = 1.0, restitution = 0.88` (lighter & bouncier)
   * - Golden Acorn (`prop-acorn`): `mass = 1.6, restitution = 0.65` (heavy wrecking ball)
   */
  private spawnBallFromHopper(tint?: number, forceAcorn?: boolean): void {
    if (this.activeBalls.length >= 14) return;

    this.audio.playHopperDrop();
    this.playSparkyDropAnim();

    const spawnX = this.sparkySprite.x + (Math.random() - 0.5) * 3;
    const spawnY = 144;

    const isAcorn = forceAcorn !== undefined ? forceAcorn : this.activeAmmo === 'acorn';
    const texKey = isAcorn ? 'prop-acorn' : 'prop-marble';

    const ballSprite = this.add
      .image(spawnX, spawnY, texKey)
      .setDisplaySize(36, 36)
      .setDepth(22);

    if (tint !== undefined && !isAcorn) {
      ballSprite.setTint(tint);
    } else if (this.fountainEnabled && !isAcorn) {
      const fTint = FOUNTAIN_MARBLE_TINTS[this.fountainCounter % FOUNTAIN_MARBLE_TINTS.length];
      ballSprite.setTint(fTint);
    }

    this.fountainCounter++;
    Juice.burstStars(this, spawnX, spawnY + 4, 5, [0xfde047, 0xfbbf24, 0xffffff]);

    this.activeBalls.push({
      id: this.nextBallId++,
      x: spawnX,
      y: spawnY,
      vx: (Math.random() - 0.5) * 6,
      vy: 45,
      radius: 18,
      mass: isAcorn ? 1.6 : 1.0,
      restitution: isAcorn ? 0.65 : 0.88,
      isAcorn,
      rotation: 0,
      simTime: this.simClockSeconds,
      sprite: ballSprite,
      caught: false,
      ridingGearKey: null,
      gearCarryElapsed: 0,
      inBellowsKey: null,
      bellowsTimer: 0,
      lastGearKey: '',
      lastGearCooldown: 0,
      lastBellowsKey: '',
      lastBellowsCooldown: 0,
      lastSeesawKey: '',
      lastSeesawCooldown: 0,
      touchingSeesawKey: '',
      touchingSeesawSubsteps: 0,
      lastTrampolineKey: '',
      lastTrampolineCooldown: 0,
      lastHammerKey: '',
      lastHammerCooldown: 0,
      lastWallKey: '',
      lastWallCooldown: 0,
      lastFunnelKey: '',
      lastFunnelCooldown: 0,
      lastFlipperKey: '',
      lastFlipperCooldown: 0,
      lastRollTickCooldown: 0,
      spawnTime: this.time.now
    });
  }

  /**
   * Places or replaces a contraption part on `(col, row)`, locking its immutable baseScale,
   * setting its initial visual tilt (`part-trampoline` at `+-10 deg`, `part-seesaw` at `+-20 deg`),
   * and showing the compact glowing directional arrow indicator!
   */
  private placePartOnPeg(
    col: number,
    row: number,
    partType: PartType,
    dir: 1 | -1,
    lockedByPuzzle: boolean,
    playEffects: boolean
  ): PlacedPart {
    const key = `${col},${row}`;
    const existing = this.placedParts.get(key);
    if (existing) {
      if (existing.lockedByPuzzle && !lockedByPuzzle) {
        this.flipPlacedPartDirection(existing);
        return existing;
      }
      existing.sprite.destroy();
      existing.glowRing.destroy();
      this.placedParts.delete(key);
    }

    const cfg = PART_CONFIGS[partType];
    const px = PEG_COLS_X[col];
    const py = PEG_ROWS_Y[row];

    const glowRadius = partType === 'prop-bumper' ? 24 : 28;
    const glowRing = this.add
      .circle(px, py, glowRadius, lockedByPuzzle ? 0xd97706 : 0xfde047, lockedByPuzzle ? 0.28 : 0.18)
      .setStrokeStyle(lockedByPuzzle ? 2.5 : 2, lockedByPuzzle ? 0xf59e0b : 0xfbbf24, 0.7)
      .setDepth(14);

    const sprite = this.add
      .image(px, py, partType)
      .setOrigin(cfg.originX, cfg.originY)
      .setDisplaySize(cfg.boardW, cfg.boardH)
      .setDepth(16);

    // Keep part-seesaw unflipped horizontally so its horizontal beam rocks cleanly between -20 deg and +20 deg!
    const spriteScaleDir = partType === 'part-seesaw' ? 1 : dir;
    this.lockBaseScale(sprite, spriteScaleDir);

    const initialAngleDeg =
      partType === 'part-trampoline'
        ? dir * 10
        : partType === 'part-seesaw'
          ? dir * 20
          : 0;
    sprite.setAngle(initialAngleDeg);

    const placed: PlacedPart = {
      col,
      row,
      type: partType,
      dir,
      tiltDir: dir,
      currentAngleDeg: initialAngleDeg,
      lockedByPuzzle,
      sprite,
      glowRing,
      busyUntil: 0,
      swingPhase: col * 0.75 + row * 1.15
    };

    this.placedParts.set(key, placed);
    this.emptyPegInviteDots[col][row].setVisible(false);

    if (playEffects) {
      this.audio.playPegSnap();
      this.pulseSprite(sprite, 1.16, 0.86, 160);
      Juice.burstStars(this, px, py, 7, [0xfde047, 0xfbbf24]);
      this.showDirectionIndicatorForPart(placed);
    }

    return placed;
  }

  private removePartFromPeg(col: number, row: number): void {
    const key = `${col},${row}`;
    const existing = this.placedParts.get(key);
    if (!existing || existing.lockedByPuzzle) return;

    existing.sprite.destroy();
    existing.glowRing.destroy();
    this.placedParts.delete(key);
    this.emptyPegInviteDots[col][row].setVisible(true);
  }

  /**
   * Flips a placed contraption part's orientation (`dir: 1 | -1`):
   * - For `part-seesaw`: toggles `tiltDir = -tiltDir`, rings `playSeesawBell()`, and rocks smoothly to `tiltDir * 20 deg`!
   * - For `part-trampoline`: tilts drum pad to `dir * 10 deg`.
   * - For `part-hammer`: shifts `swingPhase` by `Math.PI`.
   * - For all other parts: flips horizontal direction (`scaleX` sign) and shows the compact directional arrow!
   */
  private flipPlacedPartDirection(part: PlacedPart): void {
    if (part.lockedByPuzzle && part.type === 'prop-bumper') {
      this.audio.playSeesawBell();
      this.pulseSprite(part.sprite, 1.18, 1.18, 140);
      return;
    }

    part.dir = part.dir === 1 ? -1 : 1;
    part.tiltDir = part.dir;

    if (part.type === 'part-hammer') {
      part.swingPhase += Math.PI;
      this.audio.playRotateClick();
    } else if (part.type === 'part-seesaw') {
      part.sprite.setData('dir', 1);
      this.restoreBaseScale(part.sprite);
      this.audio.playSeesawBell();
      const px = PEG_COLS_X[part.col];
      const py = PEG_ROWS_Y[part.row];
      Juice.burstStars(this, px, py - 8, 6, [0xfde047, 0xfbbf24]);
    } else if (part.type === 'part-trampoline') {
      part.sprite.setData('dir', part.dir);
      part.currentAngleDeg = part.dir * 10;
      part.sprite.setAngle(part.currentAngleDeg);
      this.restoreBaseScale(part.sprite);
      this.audio.playRotateClick();
    } else {
      part.sprite.setData('dir', part.dir);
      part.currentAngleDeg = 0;
      part.sprite.setAngle(0);
      this.restoreBaseScale(part.sprite);
      this.audio.playRotateClick();
    }

    this.pulseSprite(part.sprite, 1.16, 0.88, 140);
    this.showDirectionIndicatorForPart(part);
  }

  /**
   * 1. COMPACT GLOWING DIRECTIONAL ARROW INDICATOR (~48px long with crisp arrowhead):
   * - Replaces the old 45-frame predictive trajectory path so the game never spoils or fakes where balls will land.
   * - Appears right over a placed tool for `1.1 seconds` whenever the player places, drags, or taps-to-flip a directional tool:
   *   - `part-chute`: points down-right (`+22 deg` when `dir = 1`) or down-left (`158 deg` when `dir = -1`).
   *   - `part-trampoline`: points up-right (`-68 deg` when `dir = 1`) or up-left (`-112 deg` when `dir = -1`).
   *   - `part-seesaw`: points down the currently tilted slope (`+20 deg` or `160 deg`) + compact bi-directional rocking arrow (`<->`).
   *   - `part-bellows`: points horizontally right (`0 deg` when `dir = 1`) or left (`180 deg` when `dir = -1`).
   *   - `part-flipper`: points diagonally up-right (`-55 deg` when `dir = 1`) or up-left (`-125 deg` when `dir = -1`).
   */
  private showDirectionIndicatorForPart(part: PlacedPart): void {
    const px = PEG_COLS_X[part.col];
    const py = PEG_ROWS_Y[part.row];
    const effectiveDir = part.type === 'part-seesaw' ? part.tiltDir : part.dir;
    this.drawDirectionArrowAt(px, py, part.type, effectiveDir, true);
  }

  private drawDirectionArrowAt(
    px: number,
    py: number,
    partType: PartType,
    dir: 1 | -1,
    fadeAfter1100ms: boolean
  ): void {
    if (this.trajectoryFadeTween) {
      this.trajectoryFadeTween.stop();
      this.trajectoryFadeTween = null;
    }
    this.trajectoryGraphics.clear();
    this.trajectoryGraphics.setAlpha(1);
    this.trajectoryGraphics.setDepth(42);

    let angleDeg: number | null = null;
    let offsetX = 0;
    let offsetY = -30;

    switch (partType) {
      case 'part-chute':
        angleDeg = dir === 1 ? 22 : 158;
        offsetY = -26;
        break;
      case 'part-trampoline':
        angleDeg = dir === 1 ? -68 : -112;
        offsetX = dir * 8;
        offsetY = -36;
        break;
      case 'part-seesaw':
        angleDeg = dir === 1 ? 20 : 160;
        offsetY = -28;
        break;
      case 'part-bellows':
        angleDeg = dir === 1 ? 0 : 180;
        offsetX = dir * 24;
        offsetY = -28;
        break;
      case 'part-flipper':
        angleDeg = dir === 1 ? -55 : -125;
        offsetX = dir * 10;
        offsetY = -34;
        break;
      case 'part-gear':
        angleDeg = dir === 1 ? -25 : -155;
        offsetY = -44;
        break;
      default:
        angleDeg = null;
        break;
    }

    if (angleDeg === null) return;

    const cx = px + offsetX;
    const cy = py + offsetY;
    const rad = Phaser.Math.DegToRad(angleDeg);
    const ux = Math.cos(rad);
    const uy = Math.sin(rad);
    const nx = -uy;
    const ny = ux;

    const halfLen = 24; // ~48px total length
    const tailX = cx - ux * halfLen;
    const tailY = cy - uy * halfLen;
    const tipX = cx + ux * halfLen;
    const tipY = cy + uy * halfLen;
    const shaftEndX = tipX - ux * 12;
    const shaftEndY = tipY - uy * 12;

    // Outer antique-brass halo + crisp golden shaft
    this.trajectoryGraphics.lineStyle(8, 0x92400e, 0.55);
    this.trajectoryGraphics.beginPath();
    this.trajectoryGraphics.moveTo(tailX, tailY);
    this.trajectoryGraphics.lineTo(shaftEndX, shaftEndY);
    this.trajectoryGraphics.strokePath();

    this.trajectoryGraphics.lineStyle(4.5, 0xfde047, 0.98);
    this.trajectoryGraphics.beginPath();
    this.trajectoryGraphics.moveTo(tailX, tailY);
    this.trajectoryGraphics.lineTo(shaftEndX, shaftEndY);
    this.trajectoryGraphics.strokePath();

    // Tail cap dot
    this.trajectoryGraphics.fillStyle(0xfbbf24, 0.95);
    this.trajectoryGraphics.fillCircle(tailX, tailY, 3.5);

    // Crisp golden arrowhead triangle
    const headBaseX = tipX - ux * 14;
    const headBaseY = tipY - uy * 14;
    const wingW = 9.5;
    const leftWingX = headBaseX + nx * wingW;
    const leftWingY = headBaseY + ny * wingW;
    const rightWingX = headBaseX - nx * wingW;
    const rightWingY = headBaseY - ny * wingW;

    this.trajectoryGraphics.fillStyle(0xfde047, 0.98);
    this.trajectoryGraphics.lineStyle(2, 0xb45309, 0.95);
    this.trajectoryGraphics.beginPath();
    this.trajectoryGraphics.moveTo(tipX, tipY);
    this.trajectoryGraphics.lineTo(leftWingX, leftWingY);
    this.trajectoryGraphics.lineTo(rightWingX, rightWingY);
    this.trajectoryGraphics.closePath();
    this.trajectoryGraphics.fillPath();
    this.trajectoryGraphics.strokePath();

    // For part-seesaw, also draw a compact bi-directional rocking indicator (<->) above the pivot
    if (partType === 'part-seesaw') {
      const rockY = py - 48;
      this.trajectoryGraphics.lineStyle(2.5, 0xfbbf24, 0.9);
      this.trajectoryGraphics.beginPath();
      this.trajectoryGraphics.moveTo(px - 16, rockY);
      this.trajectoryGraphics.lineTo(px + 16, rockY);
      this.trajectoryGraphics.strokePath();

      this.trajectoryGraphics.fillStyle(0xfde047, 0.95);
      this.trajectoryGraphics.fillTriangle(px - 22, rockY, px - 14, rockY - 5, px - 14, rockY + 5);
      this.trajectoryGraphics.fillTriangle(px + 22, rockY, px + 14, rockY - 5, px + 14, rockY + 5);
    }

    if (fadeAfter1100ms) {
      this.trajectoryFadeTween = this.tweens.add({
        targets: this.trajectoryGraphics,
        alpha: 0,
        delay: 820,
        duration: 280,
        ease: 'Sine.easeOut',
        onComplete: () => {
          this.trajectoryGraphics.clear();
        }
      });
    }
  }

  /**
   * Pointer Drag-and-Drop Handlers (works for both Left 5 Cubbies AND Right 4 Bonus Gadget Shelves!)
   * + Single-Piece Drag-to-Trash on the Broom & Dustpan Button (`970, 662`).
   */
  private startCubbyDrag(partType: PartType, pointer: Phaser.Input.Pointer): void {
    this.cleanupDragGhost();
    const cfg = PART_CONFIGS[partType];

    this.dragPartType = partType;
    this.dragPartDir = 1;
    this.dragSourcePegKey = null;
    this.isDraggingFromBoard = false;
    this.dragStartPointerPos = { x: pointer.x, y: pointer.y };

    this.dragGhost = this.add
      .image(pointer.x, pointer.y, partType)
      .setOrigin(cfg.originX, cfg.originY)
      .setDisplaySize(cfg.boardW, cfg.boardH)
      .setAlpha(0.0)
      .setDepth(50);
    this.lockBaseScale(this.dragGhost, 1);
    if (partType === 'part-trampoline') {
      this.dragGhost.setAngle(10);
    } else if (partType === 'part-seesaw') {
      this.dragGhost.setAngle(20);
    }
  }

  private beginBoardPartInteraction(part: PlacedPart, pointer: Phaser.Input.Pointer): void {
    this.cleanupDragGhost();
    const cfg = PART_CONFIGS[part.type];

    this.dragPartType = part.type;
    this.dragPartDir = part.type === 'part-seesaw' ? part.tiltDir : part.dir;
    this.dragSourcePegKey = `${part.col},${part.row}`;
    this.isDraggingFromBoard = false;
    this.dragStartPointerPos = { x: pointer.x, y: pointer.y };

    if (!part.lockedByPuzzle) {
      const ghostScaleDir = part.type === 'part-seesaw' ? 1 : part.dir;
      this.dragGhost = this.add
        .image(pointer.x, pointer.y, part.type)
        .setOrigin(cfg.originX, cfg.originY)
        .setDisplaySize(cfg.boardW * 1.08, cfg.boardH * 1.08)
        .setAlpha(0.0)
        .setDepth(50);
      this.lockBaseScale(this.dragGhost, ghostScaleDir);
      this.dragGhost.setAngle(part.currentAngleDeg);
    }
  }

  private setTrashDropZoneActive(active: boolean, hoveredNearBroom = false): void {
    if (!this.clearBtnGlow || !this.clearBtnIcon || !this.clearBtnFrame) return;

    if (active) {
      const scaleMult = hoveredNearBroom ? 1.22 : 1.12;
      this.clearBtnGlow.setFillStyle(hoveredNearBroom ? 0xfbbf24 : 0xfde047, hoveredNearBroom ? 0.5 : 0.32);
      this.clearBtnGlow.setStrokeStyle(3.5, 0xf59e0b, 0.95);

      const iconBX = (this.clearBtnIcon.getData('baseScaleX') as number) ?? Math.abs(this.clearBtnIcon.scaleX);
      const iconBY = (this.clearBtnIcon.getData('baseScaleY') as number) ?? Math.abs(this.clearBtnIcon.scaleY);
      const frameBX = (this.clearBtnFrame.getData('baseScaleX') as number) ?? Math.abs(this.clearBtnFrame.scaleX);
      const frameBY = (this.clearBtnFrame.getData('baseScaleY') as number) ?? Math.abs(this.clearBtnFrame.scaleY);

      this.clearBtnIcon.setScale(iconBX * scaleMult, iconBY * scaleMult);
      this.clearBtnFrame.setScale(frameBX * scaleMult, frameBY * scaleMult);
    } else {
      if (this.clearTrashPulseTween) {
        this.clearTrashPulseTween.stop();
        this.clearTrashPulseTween = null;
      }
      this.clearBtnGlow.setFillStyle(0xfde047, 0);
      this.clearBtnGlow.setStrokeStyle(3, 0xfbbf24, 0);
      this.restoreBaseScale(this.clearBtnIcon);
      this.restoreBaseScale(this.clearBtnFrame);
    }
  }

  private registerPointerDragHandlers(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.dragPartType || this.isDraggingSparky || this.isDraggingDoggie) return;
      if (pointer.x < 172 || pointer.x > 1108 || pointer.y < 140 || pointer.y > 540) return;

      const nearest = this.findNearestPeg(pointer.x, pointer.y, 54, true);
      if (nearest) {
        const key = `${nearest.col},${nearest.row}`;
        const existing = this.placedParts.get(key);
        if (existing) {
          this.beginBoardPartInteraction(existing, pointer);
        }
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragPartType || !pointer.isDown) return;

      const dist = Phaser.Math.Distance.Between(
        this.dragStartPointerPos.x,
        this.dragStartPointerPos.y,
        pointer.x,
        pointer.y
      );

      if (dist > 10 && this.dragGhost) {
        this.isDraggingFromBoard = true;
        this.dragGhost.setAlpha(0.92);
        this.dragGhost.setPosition(pointer.x, pointer.y);

        if (this.dragSourcePegKey) {
          const srcPart = this.placedParts.get(this.dragSourcePegKey);
          if (srcPart && !srcPart.lockedByPuzzle) {
            srcPart.sprite.setAlpha(0.35);
          }
          const distToBroom = Phaser.Math.Distance.Between(pointer.x, pointer.y, CLEAR_BTN_X, CLEAR_BTN_Y);
          this.setTrashDropZoneActive(true, distToBroom <= 75);
        }

        const nearest = this.findNearestPeg(pointer.x, pointer.y, 56, false);
        this.highlightHoveredPeg(nearest);
        if (nearest) {
          const snapX = PEG_COLS_X[nearest.col];
          const snapY = PEG_ROWS_Y[nearest.row];
          this.dragGhost.setPosition(snapX, snapY);
          this.drawDirectionArrowAt(snapX, snapY, this.dragPartType, this.dragPartDir, false);
        } else {
          this.trajectoryGraphics.clear();
        }
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragPartType) return;

      const wasBoardPeg = this.dragSourcePegKey;
      const partType = this.dragPartType;
      const partDir = this.dragPartDir;
      const dragged = this.isDraggingFromBoard;

      this.highlightHoveredPeg(null);
      this.setTrashDropZoneActive(false);

      if (wasBoardPeg && !dragged) {
        const existing = this.placedParts.get(wasBoardPeg);
        if (existing) {
          existing.sprite.setAlpha(1);
          this.flipPlacedPartDirection(existing);
        }
        this.cleanupDragGhost();
        return;
      }

      if (dragged) {
        const distToBroom = Phaser.Math.Distance.Between(pointer.x, pointer.y, CLEAR_BTN_X, CLEAR_BTN_Y);
        const isTrashDrop =
          distToBroom <= 75 || pointer.x < 170 || pointer.x > 1110 || pointer.y > 590;
        const targetPeg = isTrashDrop ? null : this.findNearestPeg(pointer.x, pointer.y, 62, false);

        if (wasBoardPeg) {
          const [srcCol, srcRow] = wasBoardPeg.split(',').map(Number);
          const srcPart = this.placedParts.get(wasBoardPeg);
          if (srcPart) srcPart.sprite.setAlpha(1);

          if (isTrashDrop) {
            this.trajectoryGraphics.clear();
            const sparkleX = distToBroom <= 75 ? CLEAR_BTN_X : pointer.x;
            const sparkleY = distToBroom <= 75 ? CLEAR_BTN_Y : pointer.y;
            this.removePartFromPeg(srcCol, srcRow);
            this.audio.playSweepClear();
            Juice.burstStars(this, sparkleX, sparkleY, 10, [0xfde047, 0xfbbf24, 0xffffff]);
            if (distToBroom <= 75) {
              this.pulseSprite(this.clearBtnIcon, 1.2, 0.85, 150);
            }
          } else if (targetPeg) {
            if (targetPeg.col !== srcCol || targetPeg.row !== srcRow) {
              this.removePartFromPeg(srcCol, srcRow);
              this.placePartOnPeg(targetPeg.col, targetPeg.row, partType, partDir, false, true);
            } else if (srcPart) {
              this.showDirectionIndicatorForPart(srcPart);
            }
          } else {
            this.trajectoryGraphics.clear();
          }
        } else if (targetPeg) {
          this.placePartOnPeg(targetPeg.col, targetPeg.row, partType, 1, false, true);
        } else {
          this.trajectoryGraphics.clear();
        }
      }

      this.cleanupDragGhost();
    });
  }

  private findNearestPeg(
    x: number,
    y: number,
    maxDist: number,
    allowLockedPegs: boolean
  ): { col: number; row: number } | null {
    let best: { col: number; row: number } | null = null;
    let bestDist = maxDist;

    for (let c = 0; c < PEG_COLS_X.length; c++) {
      for (let r = 0; r < PEG_ROWS_Y.length; r++) {
        if (!allowLockedPegs) {
          const existing = this.placedParts.get(`${c},${r}`);
          if (existing && existing.lockedByPuzzle) continue;
        }
        const d = Phaser.Math.Distance.Between(x, y, PEG_COLS_X[c], PEG_ROWS_Y[r]);
        if (d < bestDist) {
          bestDist = d;
          best = { col: c, row: r };
        }
      }
    }
    return best;
  }

  private highlightHoveredPeg(peg: { col: number; row: number } | null): void {
    for (let c = 0; c < PEG_COLS_X.length; c++) {
      for (let r = 0; r < PEG_ROWS_Y.length; r++) {
        const halo = this.pegHalos[c]?.[r];
        if (!halo) continue;
        if (peg && peg.col === c && peg.row === r) {
          halo.setFillStyle(0xfde047, 0.35);
          halo.setStrokeStyle(3.5, 0xfbbf24, 0.95);
        } else {
          halo.setFillStyle(0xfde047, 0.0);
          halo.setStrokeStyle(3, 0xfbbf24, 0.0);
        }
      }
    }
  }

  private cleanupDragGhost(): void {
    if (this.dragGhost) {
      this.dragGhost.destroy();
      this.dragGhost = null;
    }
    this.dragPartType = null;
    this.dragSourcePegKey = null;
    this.isDraggingFromBoard = false;
  }

  /**
   * 5. PROCEDURAL RANDOMIZED 3-STAR CHALLENGE MODE:
   * - Picks a random top launch column for Sparky (`launchCol` in `1..6`) and a distant bottom target
   *   column for Doggie (`targetCol` in `1..6` where `Math.abs(targetCol - launchCol) >= 2`).
   * - Locks both Sparky and Doggie at those columns while in 3-Star Mode!
   * - Places 3 Golden Stars (`prop-star`) on 3 distinct, well-spaced pegs across rows 1, 2, and 3.
   * - Places 2 or 3 non-removable Pinball Bumper Obstacles (`prop-bumper`, marked with `lockedByPuzzle = true`
   *   so the Clear Broom doesn't delete them, while still allowing players to drag/delete their own placed parts!)
   *   on strategic pegs between Sparky, the stars, and Doggie.
   */
  private generateProceduralStarChallenge(playAudio = true): void {
    if (playAudio) {
      AudioBus.playSfx('tab');
    }

    this.clearAllBalls();
    this.placedParts.forEach((p) => {
      p.sprite.destroy();
      p.glowRing.destroy();
    });
    this.placedParts.clear();

    this.starInstances.forEach((s) => {
      s.sprite.destroy();
      s.glow.destroy();
    });
    this.starInstances = [];
    this.starsCollectedCount = 0;

    for (let c = 0; c < PEG_COLS_X.length; c++) {
      for (let r = 0; r < PEG_ROWS_Y.length; r++) {
        this.emptyPegInviteDots[c][r].setVisible(true);
      }
    }

    // a) Pick random launchCol (1..6) and distant targetCol (1..6, |targetCol - launchCol| >= 2)
    this.launchCol = Phaser.Math.Between(1, 6);
    const candidateTargets: number[] = [];
    for (let c = 1; c <= 6; c++) {
      if (Math.abs(c - this.launchCol) >= 2) {
        candidateTargets.push(c);
      }
    }
    this.targetCol =
      candidateTargets[Phaser.Math.Between(0, candidateTargets.length - 1)] ??
      (this.launchCol <= 3 ? 5 : 2);

    const hopperX = PEG_COLS_X[this.launchCol];
    this.tweens.killTweensOf(this.sparkySprite);
    this.tweens.add({
      targets: this.sparkySprite,
      x: hopperX,
      duration: 260,
      ease: 'Cubic.easeOut',
      onUpdate: () => this.syncSparkyAttachments(),
      onComplete: () => this.syncSparkyAttachments()
    });

    const doggieX = this.getDoggieCartXForCol(this.targetCol);
    this.tweens.killTweensOf(this.doggieSprite);
    this.tweens.add({
      targets: this.doggieSprite,
      x: doggieX,
      duration: 280,
      ease: 'Cubic.easeOut',
      onUpdate: () => this.syncDoggieAttachments(),
      onComplete: () => this.syncDoggieAttachments()
    });

    // b) Place 3 Golden Stars on 3 distinct, well-spaced pegs across rows 1, 2, and 3
    const usedCols = new Set<number>();
    const starSpecs: Array<{ col: number; row: number }> = [];
    const starRows = [1, 2, 3];

    starRows.forEach((rowIdx, i) => {
      const t = (i + 0.5) / 3;
      const idealCol = Math.round(Phaser.Math.Linear(this.launchCol, this.targetCol, t));
      const candidates: number[] = [];
      for (let c = 1; c <= 6; c++) {
        if (!usedCols.has(c) && Math.abs(c - idealCol) <= 2) {
          candidates.push(c);
        }
      }
      if (candidates.length === 0) {
        for (let c = 1; c <= 6; c++) {
          if (!usedCols.has(c)) candidates.push(c);
        }
      }
      const chosenCol = candidates[Phaser.Math.Between(0, candidates.length - 1)] ?? (i + 2);
      usedCols.add(chosenCol);
      starSpecs.push({ col: chosenCol, row: rowIdx });
    });

    starSpecs.forEach((sSpec, idx) => {
      const sx = PEG_COLS_X[sSpec.col];
      const sy = PEG_ROWS_Y[sSpec.row] - 12;

      const glow = this.add.circle(sx, sy, 24, 0xfde047, 0.22).setDepth(18);
      const sprite = this.add
        .image(sx, sy, 'prop-star')
        .setDisplaySize(44, 44)
        .setDepth(19);
      this.lockBaseScale(sprite, 1);

      this.tweens.add({
        targets: [sprite, glow],
        y: sy - 5,
        duration: 900 + idx * 140,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      this.starInstances.push({
        index: idx as 0 | 1 | 2,
        col: sSpec.col,
        row: sSpec.row,
        x: sx,
        y: sy,
        collected: false,
        sprite,
        glow
      });
    });

    // c) Place 2 or 3 non-removable Pinball Bumper Obstacles (`prop-bumper`, `lockedByPuzzle = true`)
    const bumperCount = Phaser.Math.Between(2, 3);
    const minC = Math.max(0, Math.min(this.launchCol, this.targetCol) - 1);
    const maxC = Math.min(7, Math.max(this.launchCol, this.targetCol) + 1);
    const bumperCandidates: Array<{ col: number; row: number }> = [];

    for (let r = 1; r <= 4; r++) {
      for (let c = minC; c <= maxC; c++) {
        // Leave top launch peg (launchCol, 0), bottom target peg (targetCol, 4), and star pegs free!
        if (c === this.launchCol && r <= 1) continue;
        if (c === this.targetCol && r === 4) continue;
        if (starSpecs.some((st) => st.col === c && st.row === r)) continue;
        bumperCandidates.push({ col: c, row: r });
      }
    }

    Phaser.Utils.Array.Shuffle(bumperCandidates);
    const chosenBumpers: Array<{ col: number; row: number }> = [];
    for (const cand of bumperCandidates) {
      if (chosenBumpers.length >= bumperCount) break;
      // Space bumpers so two obstacles aren't right next to each other on the same row
      if (
        chosenBumpers.some(
          (b) => Math.abs(b.col - cand.col) <= 1 && Math.abs(b.row - cand.row) <= 1
        )
      ) {
        continue;
      }
      chosenBumpers.push(cand);
    }

    chosenBumpers.forEach((bSpec) => {
      this.placePartOnPeg(bSpec.col, bSpec.row, 'prop-bumper', 1, true, false);
    });

    this.refreshBasketStarHud();
  }

  private resetStarsForNewRun(): void {
    this.starsCollectedCount = 0;
    this.starInstances.forEach((st) => {
      st.collected = false;
      st.sprite.setVisible(true).setAlpha(1);
      this.restoreBaseScale(st.sprite);
      st.glow.setVisible(true).setAlpha(1).setScale(1);
    });
    this.refreshBasketStarHud();
  }

  private clearAllBalls(): void {
    this.activeBalls.forEach((b) => b.sprite.destroy());
    this.activeBalls = [];
    this.pairClinkCooldowns.clear();
  }

  /**
   * Bottom Trough (`y: 662`):
   * - Bookshelf Return (`x: 76`)
   * - Button 1 (`x: 270`, `'tinker-mode-guide'`): FREE-PLAY / INSPECTOR LAB MODE
   * - Button 2 (`x: 430`, `'tinker-mode-stars'`): PROCEDURAL 3-STAR CHALLENGE MODE (Tap to deal a fresh 3-Star board!)
   * - Button 3 (`x: 590`, `'tinker-mode-fountain'`): CONTINUOUS FOUNTAIN TOGGLE (`0.95s` interval)
   * - Button 4 (`x: 810`, `'tinker-action-drop'`): AMMO SELECTOR TOGGLE (MARBLE vs. ACORN) with live badge
   * - Button 5 (`x: 970`, `'tinker-action-clear'`): Whisk Broom & Brass Dustpan (Tap to Sweep All User Parts, or Drag-to-Trash Single Part)
   */
  private buildBottomTroughControls(): void {
    const troughY = 662;

    const bookshelfBtn = this.add
      .image(76, troughY, 'tool-bookshelf')
      .setDisplaySize(78, 64)
      .setDepth(35)
      .setInteractive({ useHandCursor: true });
    this.lockBaseScale(bookshelfBtn, 1);

    bookshelfBtn.on('pointerdown', () => {
      AudioBus.playSfx('tab');
      ArcadeState.setActiveTab('create');
      this.scene.start('HubScene');
    });

    // Button 1 (`x: 270`): FREE-PLAY / INSPECTOR LAB MODE
    this.buildBottomModeSlot('freeplay', 270, troughY, 'tinker-mode-guide', () => {
      this.setWorkshopMode('freeplay', true);
    });

    // Button 2 (`x: 430`): PROCEDURAL 3-STAR CHALLENGE MODE
    this.buildBottomModeSlot('stars', 430, troughY, 'tinker-mode-stars', () => {
      this.setWorkshopMode('stars', true);
    });

    // Button 3 (`x: 590`): CONTINUOUS FOUNTAIN ON/OFF TOGGLE
    this.buildBottomModeSlot('fountain', 590, troughY, 'tinker-mode-fountain', () => {
      this.toggleFountain();
    });

    // Button 4 (`x: 810`): AMMO SELECTOR TOGGLE (Glass Marble vs. Heavy Golden Acorn)
    this.ammoBtnGlow = this.add
      .circle(810, troughY, 42, 0xfde047, 0.20)
      .setStrokeStyle(3, 0xfbbf24, 0.65)
      .setDepth(33);

    this.buildBottomActionSwitch(810, troughY, 'tinker-action-drop', () => {
      this.toggleActiveAmmo();
    });

    this.ammoBtnBadgeRing = this.add
      .circle(810 + 26, troughY - 22, 16, 0x1e293b, 0.92)
      .setStrokeStyle(2.5, 0xfde047, 0.95)
      .setDepth(37);

    this.ammoBtnBadgeIcon = this.add
      .image(810 + 26, troughY - 22, 'prop-marble')
      .setDisplaySize(22, 22)
      .setDepth(38);
    this.lockBaseScale(this.ammoBtnBadgeIcon, 1);

    // Button 5 (`x: 970`): Whisk Broom & Brass Dustpan
    this.clearBtnGlow = this.add
      .circle(CLEAR_BTN_X, CLEAR_BTN_Y, 46, 0xfde047, 0)
      .setStrokeStyle(3, 0xfbbf24, 0)
      .setDepth(33);

    const clearRefs = this.buildBottomActionSwitch(CLEAR_BTN_X, CLEAR_BTN_Y, 'tinker-action-clear', () => {
      if (!this.isDraggingFromBoard) {
        this.sweepAndResetUserBoard();
      }
    });
    this.clearBtnFrame = clearRefs.frame;
    this.clearBtnIcon = clearRefs.icon;

    this.refreshBottomModeHighlights();
    this.refreshAmmoSelectorBadges();
  }

  private buildBottomModeSlot(
    key: string,
    x: number,
    y: number,
    iconKey: string,
    onTap: () => void
  ): void {
    const glow = this.add
      .circle(x, y, 42, 0xfde047, 0)
      .setStrokeStyle(3, 0xfbbf24, 0)
      .setDepth(33);
    this.bottomModeGlows.set(key, glow);

    const frame = this.add
      .image(x, y, 'ui-brass-frame')
      .setDisplaySize(84, 72)
      .setDepth(34);
    this.lockBaseScale(frame, 1);
    this.bottomModeFrames.set(key, frame);

    const icon = this.add
      .image(x, y, iconKey)
      .setDisplaySize(60, 60)
      .setDepth(35);
    this.lockBaseScale(icon, 1);

    const hit = this.add
      .zone(x, y, 96, 80)
      .setInteractive({ useHandCursor: true })
      .setDepth(36);

    hit.on('pointerdown', () => {
      this.pulseSprite(icon, 1.16, 1.16, 140);
      onTap();
    });
  }

  private buildBottomActionSwitch(
    x: number,
    y: number,
    iconKey: string,
    onTap: () => void
  ): { frame: Phaser.GameObjects.Image; icon: Phaser.GameObjects.Image } {
    const frame = this.add
      .image(x, y, 'ui-brass-frame')
      .setDisplaySize(84, 72)
      .setDepth(34);
    this.lockBaseScale(frame, 1);

    const icon = this.add
      .image(x, y, iconKey)
      .setDisplaySize(60, 60)
      .setDepth(35);
    this.lockBaseScale(icon, 1);

    const hit = this.add
      .zone(x, y, 96, 80)
      .setInteractive({ useHandCursor: true })
      .setDepth(36);

    hit.on('pointerdown', () => {
      this.pulseSprite(icon, 1.18, 1.18, 150);
      this.pulseSprite(frame, 1.08, 1.08, 150);
      onTap();
    });

    return { frame, icon };
  }

  /**
   * Switches between:
   * - `'freeplay'` (Button 1: Inspector Lab Mode — clears stars & puzzle obstacles, unlocks user parts, unlocks Sparky & Doggie dragging)
   * - `'stars'` (Button 2: Procedural 3-Star Challenge Mode — generates a fresh 3-Star Challenge layout with 3 stars & 2-3 locked bumpers)
   */
  private setWorkshopMode(mode: WorkshopMode, playSound: boolean): void {
    this.activeMode = mode;
    if (playSound) {
      this.audio.playRotateClick();
    }

    if (mode === 'freeplay') {
      this.starInstances.forEach((s) => {
        s.sprite.destroy();
        s.glow.destroy();
      });
      this.starInstances = [];
      this.starsCollectedCount = 0;

      // Remove puzzle-locked bumper obstacles and unlock any remaining user parts
      const lockedKeys: string[] = [];
      this.placedParts.forEach((p, key) => {
        if (p.lockedByPuzzle) {
          lockedKeys.push(key);
        } else {
          p.glowRing.setFillStyle(0xfde047, 0.18);
        }
      });
      lockedKeys.forEach((key) => {
        const p = this.placedParts.get(key);
        if (p) {
          p.sprite.destroy();
          p.glowRing.destroy();
          this.placedParts.delete(key);
          this.emptyPegInviteDots[p.col][p.row].setVisible(true);
        }
      });

      this.refreshBasketStarHud();
    } else {
      // Generate a fresh procedural 3-Star Challenge board!
      this.generateProceduralStarChallenge(false);
    }

    this.refreshBottomModeHighlights();
  }

  private toggleFountain(): void {
    this.fountainEnabled = !this.fountainEnabled;
    this.audio.playRotateClick();

    if (this.fountainTimer) {
      this.fountainTimer.remove(false);
      this.fountainTimer = null;
    }

    if (this.fountainEnabled) {
      if (this.activeMode === 'stars' && this.activeBalls.length === 0) {
        this.resetStarsForNewRun();
      }
      this.spawnBallFromHopper();
      this.fountainTimer = this.time.addEvent({
        delay: 950,
        loop: true,
        callback: () => {
          this.spawnBallFromHopper();
        }
      });
    }

    this.refreshBottomModeHighlights();
  }

  private toggleActiveAmmo(): void {
    this.activeAmmo = this.activeAmmo === 'marble' ? 'acorn' : 'marble';
    this.audio.playRotateClick();
    this.refreshAmmoSelectorBadges();

    this.pulseSprite(this.ammoBtnBadgeIcon, 1.32, 0.82, 160);
    this.pulseSprite(this.hopperAmmoBadge, 1.32, 0.82, 160);
    Juice.burstStars(this, 810, 646, 6, [0xfde047, 0xfbbf24, 0xffffff]);
    Juice.burstStars(
      this,
      this.hopperAmmoBadge.x,
      this.hopperAmmoBadge.y,
      6,
      [0xfde047, 0xfbbf24, 0xffffff]
    );
  }

  private refreshAmmoSelectorBadges(): void {
    const texKey = this.activeAmmo === 'acorn' ? 'prop-acorn' : 'prop-marble';
    const ringColor = this.activeAmmo === 'acorn' ? 0xf59e0b : 0x38bdf8;

    if (this.ammoBtnBadgeIcon) {
      this.ammoBtnBadgeIcon.setTexture(texKey).setDisplaySize(22, 22);
      this.lockBaseScale(this.ammoBtnBadgeIcon, 1);
      this.ammoBtnBadgeRing.setStrokeStyle(2.5, ringColor, 0.95);
      this.ammoBtnGlow.setFillStyle(ringColor, 0.24);
      this.ammoBtnGlow.setStrokeStyle(3, 0xfbbf24, 0.8);
    }

    if (this.hopperAmmoBadge) {
      this.hopperAmmoBadge.setTexture(texKey).setDisplaySize(24, 24);
      this.lockBaseScale(this.hopperAmmoBadge, 1);
      this.hopperAmmoRing.setStrokeStyle(2.5, ringColor, 0.95);
    }
  }

  private refreshBottomModeHighlights(): void {
    const states: Record<string, boolean> = {
      freeplay: this.activeMode === 'freeplay',
      stars: this.activeMode === 'stars',
      fountain: this.fountainEnabled
    };

    Object.entries(states).forEach(([key, isActive]) => {
      const glow = this.bottomModeGlows.get(key);
      const frame = this.bottomModeFrames.get(key);
      if (!glow || !frame) return;

      if (isActive) {
        glow.setFillStyle(0xfde047, 0.34);
        glow.setStrokeStyle(3.5, 0xfbbf24, 0.95);
        frame.setTint(0xfffbeb);
      } else {
        glow.setFillStyle(0xfde047, 0);
        glow.setStrokeStyle(3, 0xfbbf24, 0);
        frame.clearTint();
      }
    });
  }

  /**
   * Sweeps away all user-placed parts while keeping any `lockedByPuzzle` bumper obstacles intact in 3-Star Challenge Mode!
   */
  private sweepAndResetUserBoard(): void {
    this.audio.playSweepClear();
    this.clearAllBalls();
    this.resetStarsForNewRun();

    const toRemove: PlacedPart[] = [];
    this.placedParts.forEach((part) => {
      if (!part.lockedByPuzzle) {
        toRemove.push(part);
      }
    });

    toRemove.forEach((part, idx) => {
      const px = PEG_COLS_X[part.col];
      const py = PEG_ROWS_Y[part.row];
      this.time.delayedCall(idx * 35, () => {
        Juice.burstStars(this, px, py, 5, [0xfde047, 0xffffff]);
      });
      this.removePartFromPeg(part.col, part.row);
    });

    if (toRemove.length === 0) {
      Juice.burstStars(this, 640, 336, 10, [0xfde047, 0xfbbf24, 0xffffff]);
    }
  }

  /**
   * TRUE 2D SUB-STEPPED RIGID-BODY PHYSICS LOOP (`8 substeps` per frame):
   * - Bare wall pegs are 100% ghost (zero collision).
   * - Updates self-swinging pendulum hammers (`part-hammer`) continuously in real time.
   * - Runs pairwise elastic 2D circle-to-circle collisions between all active marbles & acorns in every substep!
   */
  public update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.033);
    const substeps = 8;
    const subDt = dt / substeps;

    this.simClockSeconds += dt;
    this.updateBasketBarrierShimmer(dt);

    // Continuously swing all placed Pendulum Hammers (`part-hammer`), interpolate Seesaw Bell (`part-seesaw`)
    // smoothly toward `tiltDir * 20 deg` at `180 deg/sec`, and update funnel depth layering
    this.placedParts.forEach((part) => {
      if (part.type === 'part-hammer') {
        const angleDeg = Math.sin(this.simClockSeconds * 3.6 + part.swingPhase) * 52;
        part.sprite.setAngle(angleDeg);
      } else if (part.type === 'part-seesaw') {
        const targetAngle = part.tiltDir * 20;
        const diff = targetAngle - part.currentAngleDeg;
        if (Math.abs(diff) > 0.01) {
          const maxStep = 180 * dt;
          part.currentAngleDeg += Phaser.Math.Clamp(diff, -maxStep, maxStep);
        } else {
          part.currentAngleDeg = targetAngle;
        }
        part.sprite.setAngle(part.currentAngleDeg);
      } else if (part.type === 'part-trampoline') {
        part.currentAngleDeg = part.dir * 10;
        part.sprite.setAngle(part.currentAngleDeg);
      } else if (part.type === 'part-funnel') {
        const px = PEG_COLS_X[part.col];
        const py = PEG_ROWS_Y[part.row];
        const hasBallInside = this.activeBalls.some(
          (b) => !b.caught && Math.abs(b.x - px) < 50 && b.y >= py - 24 && b.y <= py + 34
        );
        // Set part-funnel depth above the ball (22) while a ball drops inside the brass cone!
        part.sprite.setDepth(hasBallInside ? 24 : 16);
      }
    });

    for (let i = this.activeBalls.length - 1; i >= 0; i--) {
      if (!this.activeBalls[i].sprite.active) {
        this.activeBalls.splice(i, 1);
      }
    }

    for (let s = 0; s < substeps; s++) {
      const substepTime = this.simClockSeconds - dt + (s + 1) * subDt;

      for (let i = 0; i < this.activeBalls.length; i++) {
        const ball = this.activeBalls[i];
        if (ball.caught) continue;

        ball.simTime = substepTime;
        this.stepBallPhysicsSubstep(ball, subDt);
        this.checkStarCollisions(ball);

        if (!ball.inBellowsKey && ball.y >= 502) {
          const basketCenterX = this.doggieSprite.x + 28;
          if (Math.abs(ball.x - basketCenterX) <= 56 && ball.y <= 562) {
            this.handleBallCaughtInBasket(ball);
          }
        }
      }

      this.resolveBallToBallCollisions();
    }

    let anyRemovedFloor = false;
    for (let i = this.activeBalls.length - 1; i >= 0; i--) {
      const ball = this.activeBalls[i];
      if (ball.caught) continue;

      ball.sprite.setPosition(ball.x, ball.y);
      ball.sprite.setRotation(ball.rotation);

      if (ball.y > 578) {
        Juice.burstStars(this, ball.x, 568, 4, [0xfde047, 0xffffff]);
        ball.sprite.destroy();
        this.activeBalls.splice(i, 1);
        anyRemovedFloor = true;
      }
    }

    if (
      anyRemovedFloor &&
      this.activeMode === 'stars' &&
      !this.isCelebratingVictory &&
      this.activeBalls.length === 0 &&
      this.starsCollectedCount > 0
    ) {
      this.time.delayedCall(260, () => {
        if (this.activeBalls.length === 0 && !this.isCelebratingVictory) {
          this.resetStarsForNewRun();
        }
      });
    }
  }

  /**
   * REAL BALL-TO-BALL COLLISIONS (MARBLES & ACORNS):
   * - Golden Acorns (`prop-acorn`): `mass = 1.6`, `restitution = 0.65` (heavy wrecking balls)
   * - Glass Marbles (`prop-marble`): `mass = 1.0`, `restitution = 0.88` (lighter and bouncier)
   */
  private resolveBallToBallCollisions(): void {
    const n = this.activeBalls.length;
    if (n < 2) return;

    const now = this.time.now;

    for (let i = 0; i < n; i++) {
      const b1 = this.activeBalls[i];
      if (b1.caught || b1.ridingGearKey || b1.inBellowsKey) continue;

      for (let j = i + 1; j < n; j++) {
        const b2 = this.activeBalls[j];
        if (b2.caught || b2.ridingGearKey || b2.inBellowsKey) continue;

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = b1.radius + b2.radius;

        if (dist < minDist) {
          const nx = dist > 0.001 ? dx / dist : 1;
          const ny = dist > 0.001 ? dy / dist : 0;
          const overlap = minDist - dist;

          const invM1 = 1 / b1.mass;
          const invM2 = 1 / b2.mass;
          const invMassSum = invM1 + invM2;

          const sep = overlap + 0.15;
          b1.x -= nx * sep * (invM1 / invMassSum);
          b1.y -= ny * sep * (invM1 / invMassSum);
          b2.x += nx * sep * (invM2 / invMassSum);
          b2.y += ny * sep * (invM2 / invMassSum);

          const rvx = b2.vx - b1.vx;
          const rvy = b2.vy - b1.vy;
          const vn = rvx * nx + rvy * ny;

          if (vn < 0) {
            const e = Math.min(b1.restitution, b2.restitution);
            const impulse = (-(1 + e) * vn) / invMassSum;

            b1.vx -= impulse * invM1 * nx;
            b1.vy -= impulse * invM1 * ny;
            b2.vx += impulse * invM2 * nx;
            b2.vy += impulse * invM2 * ny;

            b1.rotation -= impulse * 0.012 * invM1;
            b2.rotation += impulse * 0.012 * invM2;

            const minId = Math.min(b1.id, b2.id);
            const maxId = Math.max(b1.id, b2.id);
            const pairKey = `${minId}-${maxId}`;
            const lastClink = this.pairClinkCooldowns.get(pairKey) ?? 0;

            if (now - lastClink > 80 && Math.abs(vn) > 28) {
              this.pairClinkCooldowns.set(pairKey, now);
              this.audio.playBallClink(Math.abs(vn), b1.isAcorn || b2.isAcorn);

              if (Math.abs(vn) > 95) {
                const midX = (b1.x + b2.x) * 0.5;
                const midY = (b1.y + b2.y) * 0.5;
                Juice.burstStars(this, midX, midY, 4, [0xfde047, 0xffffff]);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Advances a single physics substep (`subDt`) for an active `ActiveBall`.
   * Bare wall pegs are 100% ghost — only placed contraption parts and pinball bumpers collide!
   */
  private stepBallPhysicsSubstep(ball: SimBallState, subDt: number): void {
    const G = ball.isAcorn ? 740 : 680;

    // Decrement per-ball part cooldowns
    if (ball.lastGearCooldown > 0) {
      ball.lastGearCooldown -= subDt;
      if (ball.lastGearCooldown <= 0) ball.lastGearKey = '';
    }
    if (ball.lastBellowsCooldown > 0) {
      ball.lastBellowsCooldown -= subDt;
      if (ball.lastBellowsCooldown <= 0) ball.lastBellowsKey = '';
    }
    if (ball.lastSeesawCooldown > 0) {
      ball.lastSeesawCooldown -= subDt;
      if (ball.lastSeesawCooldown <= 0) ball.lastSeesawKey = '';
    }
    if (ball.lastTrampolineCooldown > 0) {
      ball.lastTrampolineCooldown -= subDt;
      if (ball.lastTrampolineCooldown <= 0) ball.lastTrampolineKey = '';
    }
    if (ball.lastHammerCooldown > 0) {
      ball.lastHammerCooldown -= subDt;
      if (ball.lastHammerCooldown <= 0) ball.lastHammerKey = '';
    }
    if (ball.lastWallCooldown > 0) {
      ball.lastWallCooldown -= subDt;
      if (ball.lastWallCooldown <= 0) ball.lastWallKey = '';
    }
    if (ball.lastFunnelCooldown > 0) {
      ball.lastFunnelCooldown -= subDt;
      if (ball.lastFunnelCooldown <= 0) ball.lastFunnelKey = '';
    }
    if (ball.lastFlipperCooldown > 0) {
      ball.lastFlipperCooldown -= subDt;
      if (ball.lastFlipperCooldown <= 0) ball.lastFlipperKey = '';
    }
    if (ball.lastRollTickCooldown > 0) {
      ball.lastRollTickCooldown -= subDt;
    }

    // 0a. If currently vacuum-loaded inside a Dragon Bellows (`part-bellows`) waiting to blast (`220ms`):
    if (ball.inBellowsKey) {
      const bellowsPart = this.placedParts.get(ball.inBellowsKey);
      if (!bellowsPart || bellowsPart.type !== 'part-bellows') {
        ball.inBellowsKey = null;
        if ('sprite' in ball) {
          (ball as ActiveBall).sprite.setVisible(true);
        }
      } else {
        const bx = PEG_COLS_X[bellowsPart.col];
        const by = PEG_ROWS_Y[bellowsPart.row];
        ball.x = bx;
        ball.y = by;
        ball.vx = 0;
        ball.vy = 0;
        ball.bellowsTimer -= subDt;

        if (ball.bellowsTimer <= 0) {
          const nozzleX = bx + bellowsPart.dir * 58;
          const nozzleY = by - 4;
          const firedKey = ball.inBellowsKey;

          ball.inBellowsKey = null;
          ball.x = nozzleX;
          ball.y = nozzleY;
          ball.vx = bellowsPart.dir * 640;
          ball.vy = -95;
          ball.lastBellowsKey = firedKey;
          ball.lastBellowsCooldown = 0.40;

          if ('sprite' in ball) {
            (ball as ActiveBall).sprite.setVisible(true);
            (ball as ActiveBall).sprite.setPosition(nozzleX, nozzleY);
          }
          this.audio.playBellowsPuff();
          this.pulseSprite(bellowsPart.sprite, 1.22, 0.84, 150);
          Juice.burstStars(
            this,
            nozzleX,
            nozzleY,
            10,
            [0xfde047, 0xfbbf24, 0xf97316, 0xffffff]
          );
        }
        return;
      }
    }

    // 0b. If currently carried along a Brass Scoop-Wheel Gear's upper rim arc (~0.28s):
    if (ball.ridingGearKey) {
      const gearPart = this.placedParts.get(ball.ridingGearKey);
      if (!gearPart || gearPart.type !== 'part-gear') {
        ball.ridingGearKey = null;
      } else {
        const gx = PEG_COLS_X[gearPart.col];
        const gy = PEG_ROWS_Y[gearPart.row];
        const carryDuration = 0.28;
        ball.gearCarryElapsed += subDt;
        const t = Math.min(1, ball.gearCarryElapsed / carryDuration);

        const startA = gearPart.dir === 1 ? -Math.PI * 0.88 : -Math.PI * 0.12;
        const endA = gearPart.dir === 1 ? -Math.PI * 0.12 : -Math.PI * 0.88;
        const angle = Phaser.Math.Linear(startA, endA, t);
        const rimR = 44;

        ball.x = gx + Math.cos(angle) * rimR;
        ball.y = gy + Math.sin(angle) * rimR;
        ball.rotation += gearPart.dir * 8.5 * subDt;

        gearPart.sprite.angle += gearPart.dir * (180 / carryDuration) * subDt;
        [-1, 1].forEach((offset) => {
          const neighbor = this.placedParts.get(`${gearPart.col + offset},${gearPart.row}`);
          if (neighbor && neighbor.type === 'part-gear') {
            neighbor.sprite.angle -= gearPart.dir * (180 / carryDuration) * subDt;
          }
        });

        if (t >= 1) {
          ball.vx = gearPart.dir * (ball.isAcorn ? 155 : 175);
          ball.vy = ball.isAcorn ? -180 : -205;
          ball.lastGearKey = ball.ridingGearKey;
          ball.lastGearCooldown = 0.24;
          ball.ridingGearKey = null;
        }
        return;
      }
    }

    // 1. Apply 2D Gravity, Air Drag (0.999), and Angular Velocity proportional to horizontal speed (vx / radius)
    ball.vy += G * subDt;
    ball.vx *= 0.999;
    ball.vy *= 0.999;
    ball.x += ball.vx * subDt;
    ball.y += ball.vy * subDt;
    ball.rotation += (ball.vx / ball.radius) * subDt;

    // 2. Side wall bounds inside the 936x560 brass window (`x: 255..1025`)
    if (ball.x < 255) {
      ball.x = 255;
      ball.vx = Math.abs(ball.vx) * 0.65;
    } else if (ball.x > 1025) {
      ball.x = 1025;
      ball.vx = -Math.abs(ball.vx) * 0.65;
    }

    // 3. Placed Contraption & Physics Gadget Colliders ONLY (Bare wall pegs have ZERO collision!)
    for (const [pegKey, part] of this.placedParts.entries()) {
      const px = PEG_COLS_X[part.col];
      const py = PEG_ROWS_Y[part.row];

      switch (part.type) {
        case 'part-chute':
          this.collideWoodenChute(ball, part, px, py, subDt);
          break;
        case 'part-seesaw':
          this.collideSeesaw(ball, part, px, py, pegKey, subDt);
          break;
        case 'part-trampoline':
          this.collideTrampoline(ball, part, px, py, pegKey);
          break;
        case 'part-gear':
          this.collideScoopGear(ball, part, px, py, pegKey);
          break;
        case 'part-bellows':
          this.collideBellowsCannon(ball, part, px, py, pegKey);
          if (ball.inBellowsKey) return;
          break;
        case 'part-hammer':
          this.collidePendulumHammer(ball, part, px, py, pegKey);
          break;
        case 'part-wall':
          this.collideVerticalWall(ball, part, px, py, pegKey);
          break;
        case 'part-funnel':
          this.collideCatchFunnel(ball, part, px, py, pegKey);
          break;
        case 'part-flipper':
          this.collidePinballFlipper(ball, part, px, py, pegKey);
          break;
        case 'prop-bumper':
          this.collidePinballBumper(ball, part, px, py);
          break;
      }
    }
  }

  /**
   * 2. PURE NATIVE CAPSULE PHYSICS FOR WOODEN CHUTE (`part-chute`):
   * - Models `part-chute` at peg `(px, py)` as a thick tilted line-segment capsule of length `128px`
   *   (half-length `L = 64px`, capsule radius `R = 10px`) tilted at angle `theta = +22 degrees` when `dir = 1`
   *   (sloping down-right `\`) and `-22 degrees` when `dir = -1` (sloping down-left `/`).
   * - Includes a small circular end-post collider (`radius = 8px`) at the raised high end of the chute
   *   (`px - 62 * dir, py - 28`) matching the raised brass lip on the artwork so balls dropping near the back lip
   *   bounce forward onto the ramp instead of slipping off the back.
   * - In every substep, finds the closest point `C` on the capsule segment to `(ball.x, ball.y)`. If `dist < ball.radius + R`:
   *   - Pushes the ball out along the exact collision normal `(nx, ny) = (bx - Cx, by - Cy) / dist`.
   *   - Computes relative normal velocity `vn = vx * nx + vy * ny`. If `vn < 0`, reflects ONLY the normal component
   *     with wood restitution `e = 0.24` (`vn_new = -vn * 0.24`), leaving the tangential velocity untouched so natural
   *     gravity (`G = 680`) accelerates the ball smoothly down the slope from either top or bottom!
   */
  private collideWoodenChute(
    ball: SimBallState,
    part: PlacedPart,
    px: number,
    py: number,
    subDt: number
  ): void {
    // 1. Small circular end-post collider (radius = 8px) at the raised high end of the chute (px - 62 * dir, py - 28)
    const postX = px - 62 * part.dir;
    const postY = py - 28;
    const postR = 8;
    const pdx = ball.x - postX;
    const pdy = ball.y - postY;
    const pDist = Math.hypot(pdx, pdy);
    const minPostDist = ball.radius + postR;

    if (pDist < minPostDist) {
      const pnx = pDist > 0.0001 ? pdx / pDist : part.dir * 0.707;
      const pny = pDist > 0.0001 ? pdy / pDist : -0.707;
      ball.x = postX + pnx * minPostDist;
      ball.y = postY + pny * minPostDist;

      const pvn = ball.vx * pnx + ball.vy * pny;
      if (pvn < 0) {
        const pvnNew = -pvn * 0.35;
        ball.vx += (pvnNew - pvn) * pnx;
        ball.vy += (pvnNew - pvn) * pny;
      }
      // Gentle forward nudge if balanced dead-center on top of the brass end-post
      if (Math.abs(ball.vx) < 25) {
        ball.vx += part.dir * 45;
      }
    }

    // 2. Thick tilted line-segment capsule of length 128px (half-length L = 64px, capsule radius R = 10px)
    //    tilted at theta = +22 deg when dir = 1 (\) and -22 deg when dir = -1 (/)
    const L = 64;
    const R = 10;
    const thetaRad = Phaser.Math.DegToRad(part.dir * 22);
    const ux = Math.cos(thetaRad);
    const uy = Math.sin(thetaRad);

    const ax = px - L * ux;
    const ay = py - L * uy;
    const bx = px + L * ux;
    const by = py + L * uy;

    const abx = bx - ax;
    const aby = by - ay;
    const abLenSq = abx * abx + aby * aby;
    const t = Phaser.Math.Clamp(((ball.x - ax) * abx + (ball.y - ay) * aby) / abLenSq, 0, 1);

    const cx = ax + t * abx;
    const cy = ay + t * aby;
    const dx = ball.x - cx;
    const dy = ball.y - cy;
    const dist = Math.hypot(dx, dy);
    const minDist = ball.radius + R;

    if (dist < minDist) {
      const nx = dist > 0.0001 ? dx / dist : -uy;
      const ny = dist > 0.0001 ? dy / dist : -ux;

      ball.x = cx + nx * minDist;
      ball.y = cy + ny * minDist;

      const vn = ball.vx * nx + ball.vy * ny;
      if (vn < 0) {
        const vnNew = -vn * 0.24;
        ball.vx += (vnNew - vn) * nx;
        ball.vy += (vnNew - vn) * ny;
      }

      // Tangential rolling angular velocity along the wood surface
      const tx = -ny;
      const ty = nx;
      const vt = ball.vx * tx + ball.vy * ty;
      ball.rotation += (vt / ball.radius) * subDt;

      const speed = Math.hypot(ball.vx, ball.vy);
      if (speed > 28 && ball.lastRollTickCooldown <= 0) {
        ball.lastRollTickCooldown = 0.09;
        this.audio.playRollTick(speed);
      }
    }
  }

  /**
   * 4. NATIVE "TIP-TAP" ALTERNATING SWITCHER FOR SEESAW BELL (`part-seesaw`):
   * - Each placed `part-seesaw` stores `tiltDir = 1` (`+20 deg` sloping down-right `\`) or `tiltDir = -1`
   *   (`-20 deg` sloping down-left `/`), smoothly interpolating `currentAngleDeg` toward `tiltDir * 20` at `180 deg/sec`.
   * - Models the seesaw beam as a native line-segment capsule (`L = 62px`, `R = 9px`) at its current instantaneous angle.
   * - Resolves normal collision natively just like `part-chute` (`e = 0.20`) so the ball rolls naturally down the slope.
   * - Dynamic Tip-Tap Flip Mechanic:
   *   - If the ball lands on the RAISED half of the beam (`s * tiltDir < -14`), OR once a ball has rolled past the
   *     center pivot toward the lower tip (`s * tiltDir > 22`) or exits the seesaw, automatically toggles
   *     `tiltDir = -tiltDir` (with a `320ms` flip cooldown per seesaw), plays `playSeesawBell()` ONCE on flip,
   *     and rocks the beam to the opposite 20-degree stop!
   */
  private collideSeesaw(
    ball: SimBallState,
    part: PlacedPart,
    px: number,
    py: number,
    pegKey: string,
    subDt: number
  ): void {
    const L = 62;
    const R = 9;
    const centerY = py - 5;
    const thetaRad = Phaser.Math.DegToRad(part.currentAngleDeg);
    const ux = Math.cos(thetaRad);
    const uy = Math.sin(thetaRad);

    const relX = ball.x - px;
    const relY = ball.y - centerY;
    const s = Phaser.Math.Clamp(relX * ux + relY * uy, -L, L);

    const cx = px + s * ux;
    const cy = centerY + s * uy;
    const dx = ball.x - cx;
    const dy = ball.y - cy;
    const dist = Math.hypot(dx, dy);
    const minDist = ball.radius + R;

    if (dist < minDist) {
      const nx = dist > 0.0001 ? dx / dist : -uy;
      const ny = dist > 0.0001 ? dy / dist : -ux;

      ball.x = cx + nx * minDist;
      ball.y = cy + ny * minDist;

      const vn = ball.vx * nx + ball.vy * ny;
      if (vn < 0) {
        const vnNew = -vn * 0.20;
        ball.vx += (vnNew - vn) * nx;
        ball.vy += (vnNew - vn) * ny;
      }

      // Tangential rolling angular velocity along the seesaw plank
      const tx = -ny;
      const ty = nx;
      const vt = ball.vx * tx + ball.vy * ty;
      ball.rotation += (vt / ball.radius) * subDt;

      const speed = Math.hypot(ball.vx, ball.vy);
      if (speed > 28 && ball.lastRollTickCooldown <= 0) {
        ball.lastRollTickCooldown = 0.09;
        this.audio.playRollTick(speed);
      }

      // Only trigger Tip-Tap flip when ball is on the TOP side of the seesaw beam (ny < -0.15)
      if (ny < -0.15 && (ball.lastSeesawKey !== pegKey || ball.lastSeesawCooldown <= 0)) {
        ball.touchingSeesawKey = pegKey;
        ball.touchingSeesawSubsteps++;

        // Signed distance from center pivot toward the currently lowered tip (`> 0` = lower half, `< 0` = raised half)
        const downhillCoord = s * part.tiltDir;

        if (downhillCoord < -14 || downhillCoord > 22) {
          this.triggerSeesawFlip(ball, part, px, py, pegKey);
        }
      }
    } else if (
      ball.touchingSeesawKey === pegKey &&
      dist > minDist + 6 &&
      (ball.lastSeesawKey !== pegKey || ball.lastSeesawCooldown <= 0)
    ) {
      // Ball rolled across and exited the seesaw -> flip to the opposite 20-deg stop for the next ball!
      this.triggerSeesawFlip(ball, part, px, py, pegKey);
    }
  }

  private triggerSeesawFlip(
    ball: SimBallState,
    part: PlacedPart,
    px: number,
    py: number,
    pegKey: string
  ): void {
    ball.lastSeesawKey = pegKey;
    ball.lastSeesawCooldown = 0.36;
    ball.touchingSeesawKey = '';
    ball.touchingSeesawSubsteps = 0;

    const now = this.time.now;
    if (now > part.busyUntil) {
      part.busyUntil = now + 320;
      part.tiltDir = part.tiltDir === 1 ? -1 : 1;
      part.dir = part.tiltDir;
      this.audio.playSeesawBell();
      Juice.burstStars(this, px + part.tiltDir * 28, py - 8, 7, [0xfde047, 0xfbbf24, 0xffffff]);
    }
  }

  /**
   * 3. PURE NATIVE CAPSULE BOUNCE FOR SPRING TRAMPOLINE (`part-trampoline`):
   * - Visually tilts `part-trampoline` slightly (`+10 degrees` when `dir = 1`, `-10 degrees` when `dir = -1`)
   *   so kids can clearly see which way the leather drum is angled to bounce.
   * - Models the leather bounce pad as a thick line-segment capsule centered at `(px, py - 14)` with
   *   half-length `L = 50px`, capsule radius `R = 12px`, tilted at the drum's exact angle (`+10 deg` or `-10 deg`).
   * - In every physics substep, finds the closest point `C` on the drum capsule to `(ball.x, ball.y)`.
   *   If `dist < ball.radius + R`:
   *   - Pushes the ball out along the exact collision normal `(nx, ny)`.
   *   - If `vn = vx * nx + vy * ny < 0`, reflects the velocity vector purely across `(nx, ny)` with active
   *     spring restitution `e = 1.28` and enforces a minimum normal bounce speed of `440 px/s` along `(nx, ny)`:
   *     `targetVn = Math.max(440, Math.abs(vn) * 1.28)`
   *     `vx = vx - vn * nx + targetVn * nx`
   *     `vy = vy - vn * ny + targetVn * ny`
   */
  private collideTrampoline(
    ball: SimBallState,
    part: PlacedPart,
    px: number,
    py: number,
    pegKey: string
  ): void {
    const L = 50;
    const R = 12;
    const padCenterY = py - 14;
    const thetaRad = Phaser.Math.DegToRad(part.dir * 10);
    const ux = Math.cos(thetaRad);
    const uy = Math.sin(thetaRad);

    const ax = px - L * ux;
    const ay = padCenterY - L * uy;
    const bx = px + L * ux;
    const by = padCenterY + L * uy;

    const abx = bx - ax;
    const aby = by - ay;
    const abLenSq = abx * abx + aby * aby;
    const t = Phaser.Math.Clamp(((ball.x - ax) * abx + (ball.y - ay) * aby) / abLenSq, 0, 1);

    const cx = ax + t * abx;
    const cy = ay + t * aby;
    const dx = ball.x - cx;
    const dy = ball.y - cy;
    const dist = Math.hypot(dx, dy);
    const minDist = ball.radius + R;

    if (dist < minDist) {
      const nx = dist > 0.0001 ? dx / dist : Math.sin(thetaRad);
      const ny = dist > 0.0001 ? dy / dist : -Math.cos(thetaRad);

      ball.x = cx + nx * (minDist + 0.5);
      ball.y = cy + ny * (minDist + 0.5);

      const vn = ball.vx * nx + ball.vy * ny;
      if (vn < 0) {
        const targetVn = Math.max(440, Math.abs(vn) * 1.28);
        ball.vx = ball.vx - vn * nx + targetVn * nx;
        ball.vy = ball.vy - vn * ny + targetVn * ny;

        if (ball.lastTrampolineKey !== pegKey || ball.lastTrampolineCooldown <= 0) {
          ball.lastTrampolineKey = pegKey;
          ball.lastTrampolineCooldown = 0.14;
          this.audio.playTrampolineBounce();
          this.pulseSprite(part.sprite, 1.18, 0.72, 130);
          Juice.burstStars(this, cx, cy, 9, [0xfde047, 0xfbbf24, 0xffffff]);
        }
      }
    }
  }

  /**
   * Brass Scoop-Wheel Gear (`part-gear`).
   */
  private collideScoopGear(
    ball: SimBallState,
    _part: PlacedPart,
    px: number,
    py: number,
    pegKey: string
  ): void {
    if (ball.ridingGearKey || (ball.lastGearKey === pegKey && ball.lastGearCooldown > 0)) {
      return;
    }

    const dist = Math.hypot(ball.x - px, ball.y - py);
    if (dist <= 48 + ball.radius * 0.6) {
      ball.ridingGearKey = pegKey;
      ball.gearCarryElapsed = 0;
      ball.vx = 0;
      ball.vy = 0;

      this.audio.playGearRatchet();
      Juice.burstStars(this, px, py - 24, 5, [0xfde047, 0xfbbf24]);
    }
  }

  /**
   * UPGRADED DRAGON BELLOWS (`part-bellows`) -> SUCK-IN & BLAST CANNON:
   * - When a ball comes within `52px` of `part-bellows` (and is not on `400ms` exit cooldown for that bellows),
   *   immediately capture the ball inside the bellows chamber for `220ms`, play `playBellowsIntake()`,
   *   and compress the bellows (`scaleX: baseScaleX * dir * 0.78, scaleY: baseScaleY * 1.12`).
   * - After `220ms`, `stepBallPhysicsSubstep` snaps the bellows forward ONCE, plays `playBellowsPuff()` ONCE
   *   with golden fire/wind sparkles at `(px + dir * 58, py - 4)`, unhides the ball at the nozzle,
   *   and fires it horizontally (`vx = dir * 640, vy = -95`) with a `400ms` exit cooldown!
   */
  private collideBellowsCannon(
    ball: SimBallState,
    part: PlacedPart,
    px: number,
    py: number,
    pegKey: string
  ): void {
    if (ball.inBellowsKey || (ball.lastBellowsKey === pegKey && ball.lastBellowsCooldown > 0)) {
      return;
    }

    const dist = Math.hypot(ball.x - px, ball.y - py);
    if (dist <= 52) {
      ball.inBellowsKey = pegKey;
      ball.bellowsTimer = 0.22;
      ball.x = px;
      ball.y = py;
      ball.vx = 0;
      ball.vy = 0;

      if ('sprite' in ball) {
        (ball as ActiveBall).sprite.setVisible(false);
      }

      this.audio.playBellowsIntake();
      Juice.burstStars(this, px, py, 5, [0x7dd3fc, 0xfde047, 0xffffff]);

      this.tweens.killTweensOf(part.sprite);
      this.restoreBaseScale(part.sprite);
      const bx = part.sprite.getData('baseScaleX') as number;
      const by = part.sprite.getData('baseScaleY') as number;
      this.tweens.add({
        targets: part.sprite,
        scaleX: bx * part.dir * 0.78,
        scaleY: by * 1.12,
        duration: 210,
        ease: 'Sine.easeInOut'
      });
    }
  }

  /**
   * Self-Swinging Pendulum Hammer (`part-hammer`):
   * - Mounts with `origin(0.5, 0.15)` on the peg so the mallet head hangs down `76px`.
   * - Swings continuously in `update()` via `angle = Math.sin(timeSeconds * 3.6 + swingPhase) * 52` deg.
   * - Computes the mallet head world position `(hx, hy)` and tangential velocity `hvx` in every substep!
   */
  private collidePendulumHammer(
    ball: SimBallState,
    part: PlacedPart,
    px: number,
    py: number,
    pegKey: string
  ): void {
    if (ball.lastHammerKey === pegKey && ball.lastHammerCooldown > 0) return;

    const maxDeg = 52;
    const freq = 3.6;
    const phase = part.swingPhase;
    const angleDeg = Math.sin(ball.simTime * freq + phase) * maxDeg;
    const rad = Phaser.Math.DegToRad(angleDeg);

    // World coordinates of the swinging wooden mallet head (76px below pivot at angle = 0)
    const armLen = 76;
    const hx = px - Math.sin(rad) * armLen;
    const hy = py + Math.cos(rad) * armLen;

    // Instantaneous angular velocity (rad/s) and horizontal mallet speed `hvx`
    const omegaRad = freq * Math.cos(ball.simTime * freq + phase) * Phaser.Math.DegToRad(maxDeg);
    const hvx = -Math.cos(rad) * armLen * omegaRad;

    const dx = ball.x - hx;
    const dy = ball.y - hy;
    const dist = Math.hypot(dx, dy);
    const minDist = ball.radius + 28;

    if (dist < minDist) {
      const nx = dist > 0.001 ? dx / dist : (hvx >= 0 ? 1 : -1);
      const ny = dist > 0.001 ? dy / dist : -0.5;

      ball.x = hx + nx * (minDist + 1);
      ball.y = hy + ny * (minDist + 1);

      const pushDir = Math.abs(nx) > 0.2 ? nx : (hvx >= 0 ? 0.85 : -0.85);
      ball.vx = hvx * 1.35 + pushDir * 260;
      ball.vy = -Math.max(220, Math.abs(ball.vy) * 0.85);

      ball.lastHammerKey = pegKey;
      ball.lastHammerCooldown = 0.22;

      this.audio.playHammerThwack();
      Juice.burstStars(this, hx, hy, 9, [0xfde047, 0xfbbf24, 0xffffff]);
    }
  }

  /**
   * Vertical Mahogany-and-Brass Bounce Wall (`part-wall`):
   * - Acts as a vertical thick line/capsule collider centered at `(px, py)` with `halfHeight = 58px` and `halfWidth = 16px`.
   * - When a ball flying horizontally (from the Dragon Cannon, Pendulum Hammer, or a fast ramp) hits the left or right
   *   face of `part-wall`, reflects its horizontal velocity cleanly (`vx = -vx * 0.78`), plays a crisp woody-brass
   *   clack sound (`playPegSnap()`), pulses the wall slightly, and lets gravity drop the ball downward!
   */
  private collideVerticalWall(
    ball: SimBallState,
    part: PlacedPart,
    px: number,
    py: number,
    pegKey: string
  ): void {
    const halfH = 58;
    const halfW = 16;
    const minDistX = halfW + ball.radius;

    // Closest point on the vertical segment (px, py - 42) .. (px, py + 42)
    const segHalf = halfH - halfW;
    const closestY = Phaser.Math.Clamp(ball.y, py - segHalf, py + segHalf);
    const dx = ball.x - px;
    const dy = ball.y - closestY;
    const dist = Math.hypot(dx, dy);

    if (dist < minDistX) {
      if (Math.abs(ball.y - py) <= halfH) {
        // Left or right vertical face hit
        const side: 1 | -1 = dx >= 0 ? 1 : -1;
        ball.x = px + side * (minDistX + 0.5);

        if (ball.vx * side < 0) {
          ball.vx = -ball.vx * 0.78;
        } else if (Math.abs(ball.vx) < 45) {
          ball.vx = side * 65;
        }
      } else {
        // Top or bottom cap hit
        const nx = dist > 0.001 ? dx / dist : (ball.vx >= 0 ? 0.35 : -0.35);
        const ny = dist > 0.001 ? dy / dist : -1;
        ball.x = px + nx * (minDistX + 0.5);
        ball.y = closestY + ny * (minDistX + 0.5);

        const vn = ball.vx * nx + ball.vy * ny;
        if (vn < 0) {
          ball.vx -= 1.65 * vn * nx;
          ball.vy -= 1.65 * vn * ny;
        }
      }

      if (ball.lastWallKey !== pegKey || ball.lastWallCooldown <= 0) {
        ball.lastWallKey = pegKey;
        ball.lastWallCooldown = 0.09;
        this.audio.playPegSnap();
        this.pulseSprite(part.sprite, 1.20, 0.94, 130);
        Juice.burstStars(this, ball.x, ball.y, 6, [0xfde047, 0xfbbf24]);
      }
    }
  }

  /**
   * MULTI-CLANG INNER CONE PHYSICS FOR THE BRASS FUNNEL (`part-funnel`):
   * - Models `part-funnel` at `(px, py)` with two angled inner sheet-brass cone walls forming a V-throat
   *   from `y = py - 38` (width `+- 46px`) narrowing down to the vertical neck at `y = py + 14` (width `+- 8px`),
   *   and exiting at `y = py + 40`.
   */
  private collideCatchFunnel(
    ball: SimBallState,
    part: PlacedPart,
    px: number,
    py: number,
    pegKey: string
  ): void {
    if (ball.lastFunnelKey === pegKey && ball.lastFunnelCooldown > 0) return;

    const dx = ball.x - px;
    const dy = ball.y - py;

    if (Math.abs(dx) < 52 && dy >= -38 && dy <= 36) {
      // Normalized depth along the V-cone (0 at top rim y = py - 38, 1 at neck y = py + 14)
      const coneT = Phaser.Math.Clamp((ball.y - (py - 38)) / 52, 0, 1);
      const halfWidth = Phaser.Math.Linear(46, 8, coneT);
      const xLeft = px - halfWidth;
      const xRight = px + halfWidth;

      // Ensure a gentle initial horizontal offset when dropped dead-center so even a vertical drop clangs inside the cone!
      if (dy < -18 && Math.abs(dx) < 4 && Math.abs(ball.vx) < 25) {
        ball.vx = part.dir * 135;
      }

      if (ball.x < xLeft || ball.x > xRight) {
        const hitLeft = ball.x < xLeft;
        ball.x = hitLeft ? xLeft : xRight;

        // Bounce horizontal velocity back across the center of the funnel with metallic damping
        ball.vx = -ball.vx * 0.62 + (px - ball.x) * 2.5;
        if (coneT < 0.85 && Math.abs(ball.vx) < 75) {
          ball.vx = (hitLeft ? 1 : -1) * (125 * (1 - coneT * 0.5));
        }

        // Slow vertical fall slightly so the ball visibly clangs back and forth down the cone
        ball.vy = Math.min(ball.vy, 175);
        if (ball.vy < 80) {
          ball.vy = 95;
        }

        const pitchMultiplier = 0.95 + coneT * 0.58;
        this.audio.playFunnelClang(pitchMultiplier);
      }

      // Pop out the bottom vertical spout at (px, py + 40) going straight down (vx *= 0.15)
      if (dy >= 30) {
        ball.x = px;
        ball.y = py + 40;
        ball.vx *= 0.15;
        ball.vy = Math.max(ball.vy, 165);
        ball.lastFunnelKey = pegKey;
        ball.lastFunnelCooldown = 0.26;

        this.audio.playFunnelDrop();
        this.pulseSprite(part.sprite, 0.92, 1.12, 130);
        Juice.burstStars(this, px, py + 40, 6, [0xfde047, 0xfbbf24]);
      }
    }
  }

  /**
   * Geared Pinball Kicker (`part-flipper`):
   * - When a ball touches the flipper, rotates the flipper upward (`-28` degrees for `140ms`),
   *   plays `playGearRatchet()`, and launches the ball upward and diagonally in `part.dir`
   *   (`vx = dir * 260, vy = -440`)!
   */
  private collidePinballFlipper(
    ball: SimBallState,
    part: PlacedPart,
    px: number,
    py: number,
    pegKey: string
  ): void {
    if (ball.lastFlipperKey === pegKey && ball.lastFlipperCooldown > 0) return;

    if (Math.abs(ball.x - px) <= 58 && Math.abs(ball.y - py) <= 34) {
      ball.y = py - ball.radius - 10;
      ball.vx = part.dir * 260;
      ball.vy = -440;

      ball.lastFlipperKey = pegKey;
      ball.lastFlipperCooldown = 0.26;

      this.audio.playGearRatchet();
      this.audio.playTrampolineBounce();
      Juice.burstStars(this, px + part.dir * 24, py - 12, 9, [0xfde047, 0xfbbf24, 0xffffff]);

      this.tweens.killTweensOf(part.sprite);
      this.restoreBaseScale(part.sprite);
      part.sprite.setAngle(-part.dir * 28);
      this.tweens.add({
        targets: part.sprite,
        angle: 0,
        duration: 180,
        delay: 60,
        ease: 'Back.easeOut'
      });
    }
  }

  /**
   * Round Brass Pinball Bumper (`prop-bumper` — scaled down 15% to `radius = 28px`):
   * - Carries incoming horizontal momentum forward instead of reversing it when a ball bounces off the top/sides
   *   (`ball.y < py + 10`)!
   */
  private collidePinballBumper(
    ball: SimBallState,
    part: PlacedPart,
    px: number,
    py: number
  ): void {
    const dx = ball.x - px;
    const dy = ball.y - py;
    const dist = Math.hypot(dx, dy);
    const minDist = ball.radius + 28; // Reduced 15% from 34px down to 28px

    if (dist < minDist) {
      // Record incoming horizontal travel direction BEFORE impact
      const incomingVx = ball.vx;
      const incomingVy = ball.vy;
      const travelDir = Math.abs(incomingVx) > 25 ? Math.sign(incomingVx) : (ball.x >= px ? 1 : -1);

      const nx = dist > 0.001 ? dx / dist : 0;
      const ny = dist > 0.001 ? dy / dist : -1;

      ball.x = px + nx * (minDist + 0.5);
      ball.y = py + ny * (minDist + 0.5);

      const vn = ball.vx * nx + ball.vy * ny;
      if (vn < 0) {
        const restitution = ball.isAcorn ? 0.72 : 0.92;
        ball.vx -= (1 + restitution) * vn * nx;
        ball.vy -= (1 + restitution) * vn * ny;
      }

      // Whenever ball.y < py + 10 (not shot nearly flat into the bottom/opposite side wall),
      // carry horizontal momentum forward in travelDir!
      if (ball.y < py + 10) {
        ball.vx = travelDir * Math.max(185, Math.abs(incomingVx) * 0.95);
        ball.vy = -Math.max(250, Math.abs(incomingVy) * 0.85);
      } else {
        const minBounceSpeed = ball.isAcorn ? 230 : 275;
        const speed = Math.hypot(ball.vx, ball.vy);
        if (speed < minBounceSpeed) {
          const outAngle = Math.atan2(ny, nx);
          ball.vx = Math.cos(outAngle) * minBounceSpeed;
          ball.vy = Math.sin(outAngle) * minBounceSpeed;
        }
      }

      const now = this.time.now;
      if (now > part.busyUntil) {
        part.busyUntil = now + 90;
        this.audio.playSeesawBell();
        this.pulseSprite(part.sprite, 1.2, 1.2, 140);
        Juice.burstStars(this, px, py, 6, [0xfde047, 0xfbbf24]);
      }
    }
  }

  /**
   * Collects floating stars (`prop-star`) on contact and flies a glowing star trail directly into
   * the next empty slot on Doggie's 3-Star Progress Tracker HUD!
   */
  private checkStarCollisions(ball: ActiveBall): void {
    if (ball.inBellowsKey) return;

    for (const star of this.starInstances) {
      if (star.collected) continue;
      const d = Phaser.Math.Distance.Between(ball.x, ball.y, star.x, star.y);
      if (d <= 46) {
        star.collected = true;
        const slotIdx = Math.min(2, this.starsCollectedCount) as 0 | 1 | 2;
        this.starsCollectedCount++;
        this.audio.playStarCollect(slotIdx);

        Juice.burstStars(this, star.x, star.y, 12, [0xfde047, 0xfbbf24, 0xffffff]);

        star.sprite.setVisible(false);
        star.glow.setVisible(false);

        this.animateFlyingStarToHudSlot(star.x, star.y, slotIdx);
        this.refreshBasketStarHud();

        if (this.starsCollectedCount === 3) {
          const rimX = this.doggieSprite.x + 28;
          const rimY = this.doggieSprite.y - 12;
          Juice.burstStars(this, rimX, rimY, 16, [0x34d399, 0xfde047, 0xffffff]);
        }
      }
    }
  }

  private animateFlyingStarToHudSlot(startX: number, startY: number, slotIdx: 0 | 1 | 2): void {
    const flyer = this.add
      .image(startX, startY, 'prop-star')
      .setDisplaySize(42, 42)
      .setDepth(45);
    this.lockBaseScale(flyer, 1);

    const slotSprite = this.basketStarSlots[slotIdx];
    const targetX = this.basketHudContainer.x + (slotSprite ? slotSprite.x : 0);
    const targetY = this.basketHudContainer.y + (slotSprite ? slotSprite.y : 0);

    const bx = flyer.getData('baseScaleX') as number;
    const by = flyer.getData('baseScaleY') as number;

    this.tweens.add({
      targets: flyer,
      x: targetX,
      y: targetY,
      scaleX: bx * 0.58,
      scaleY: by * 0.58,
      duration: 280,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        flyer.destroy();
        if (slotSprite) {
          this.pulseSprite(slotSprite, 1.35, 1.35, 160);
          Juice.burstStars(this, targetX, targetY, 6, [0xfde047, 0x34d399, 0xffffff]);
        }
      }
    });
  }

  /**
   * OBVIOUS 3-STAR WIN CONDITION HUD & STRICT VICTORY RULE IN CHALLENGE MODE:
   * - In 3-Star Challenge Mode (`'stars'`), a ball landing in Doggie's basket ONLY wins the round
   *   if ALL 3 STARS (`3 / 3`) have been collected!
   * - Upon winning `3 / 3`, triggers the grand Victory Celebration, confetti shower, and automatically
   *   deals a brand-new procedural 3-Star Challenge board!
   */
  private handleBallCaughtInBasket(ball: ActiveBall): void {
    ball.caught = true;
    const catchX = this.doggieSprite.x + 28;
    const catchY = 515;

    if (this.activeMode === 'stars' && this.starsCollectedCount < 3) {
      this.audio.playAlmostThud();

      this.tweens.killTweensOf(this.basketHudContainer);
      const baseHudX = Phaser.Math.Clamp(this.doggieSprite.x + 18, 255, 1025);
      this.tweens.add({
        targets: this.basketHudContainer,
        x: { from: baseHudX - 7, to: baseHudX + 7 },
        duration: 65,
        yoyo: true,
        repeat: 2,
        onComplete: () => {
          this.basketHudContainer.x = baseHudX;
        }
      });

      this.basketStarSlots.forEach((slot, idx) => {
        if (idx >= this.starsCollectedCount) {
          slot.setTint(0xf59e0b).setAlpha(0.95);
          this.pulseSprite(slot, 1.38, 1.38, 220);
          this.time.delayedCall(260, () => {
            if (idx >= this.starsCollectedCount) {
              slot.setTint(0x451a03).setAlpha(0.55);
            }
          });
        }
      });

      this.tweens.add({
        targets: ball.sprite,
        x: catchX + (Math.random() < 0.5 ? -24 : 24),
        y: catchY - 22,
        scaleX: 0.15,
        scaleY: 0.15,
        alpha: 0,
        duration: 240,
        ease: 'Quad.easeOut',
        onComplete: () => {
          ball.sprite.destroy();
          const idx = this.activeBalls.indexOf(ball);
          if (idx >= 0) this.activeBalls.splice(idx, 1);

          if (this.activeBalls.length === 0 && !this.isCelebratingVictory) {
            this.resetStarsForNewRun();
          }
        }
      });
      return;
    }

    const isChallengeVictory = this.activeMode === 'stars' && this.starsCollectedCount >= 3;
    const playGrandFanfare = isChallengeVictory || !this.fountainEnabled;

    this.audio.playCartCatch(playGrandFanfare);
    this.playDoggieCatchAnim(isChallengeVictory);

    if (isChallengeVictory) {
      this.isCelebratingVictory = true;

      for (let burst = 0; burst < 4; burst++) {
        this.time.delayedCall(burst * 160, () => {
          Juice.burstStars(
            this,
            catchX + (burst - 1.5) * 38,
            catchY - 24 - burst * 12,
            18,
            [0xfde047, 0xfbbf24, 0x34d399, 0xf43f5e, 0x38bdf8, 0xffffff]
          );
        });
      }

      // Transition automatically to a brand-new procedural 3-Star Challenge board after the celebration!
      this.time.delayedCall(1650, () => {
        this.isCelebratingVictory = false;
        if (this.activeMode === 'stars') {
          this.generateProceduralStarChallenge(true);
        }
      });
    } else {
      Juice.burstStars(
        this,
        catchX,
        catchY,
        this.fountainEnabled ? 10 : 18,
        [0xfde047, 0xfbbf24, 0x34d399, 0xffffff]
      );
    }

    this.tweens.add({
      targets: ball.sprite,
      x: catchX,
      y: catchY + 12,
      scaleX: 0.1,
      scaleY: 0.1,
      alpha: 0,
      duration: 220,
      ease: 'Back.easeIn',
      onComplete: () => {
        ball.sprite.destroy();
        const idx = this.activeBalls.indexOf(ball);
        if (idx >= 0) this.activeBalls.splice(idx, 1);
      }
    });
  }
}
