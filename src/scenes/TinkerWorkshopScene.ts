/**
 * src/scenes/TinkerWorkshopScene.ts
 * ---------------------------------
 * Mentor Note: "Tinker Workshop v2.0" — Open-Arena 2D Rigid-Body Physics Marble Run & Sandbox
 * built for Wyatt (age 4) and Emma (age 3).
 *
 * Architectural Highlights:
 * 1. **Massive Open Playfield (`x: 40..1240, y: 30..585`) & Free-Form Continuous Placement:**
 *    No left/right sidebars and no restrictive peg grid! Children drag contraptions from the compact
 *    bottom brass-and-wood dock (`y: 595..710`) and place them anywhere in continuous 2D space.
 *    Tapping any placed contraption reveals a tactile **Brass Rotation Halo** with a draggable tilt
 *    handle, quick-tap `-15° / +15°` tilt buttons, a flip button, and a trash button.
 * 2. **Deterministic 8-Substep 2D Physics Solver (`~480Hz` effective step rate):**
 *    Swept-circle / anti-tunneling capsule collision, true rolling friction, angular spin velocity
 *    on marbles, material restitution (wood vs. brass vs. spring drum bumper), dynamic spinning
 *    paddle wheels, weight-tipping seesaw bridges, copper capture funnels, pentatonic chime bars,
 *    updraft wind bellows particle force fields, and elastic multi-marble clacking collisions.
 * 3. **Frustration Tolerance & Visual Debugging (Persistent Ghost Trajectory Trail):**
 *    Every marble drop leaves a glowing dotted Ghost Trail showing the exact arc and bounce points.
 *    The last run's Ghost Trail remains visible while the child adjusts their ramps so they can
 *    visually see *why* a marble missed and place their next piece directly on the arc.
 */

import Phaser from 'phaser';
import { AudioBus } from '../core/AudioBus';
import { Juice } from '../core/Juice';
import { TinkerAudioEngine } from '../core/TinkerAudioEngine';

type PartType =
  | 'part-ramp'
  | 'part-bowl'
  | 'part-drum-bumper'
  | 'part-paddle-wheel'
  | 'part-chime-bar'
  | 'part-funnel'
  | 'part-bellows'
  | 'part-cannon';

type MarbleType = 'marble-cobalt' | 'marble-comet' | 'marble-steel' | 'marble-emerald';
type WorkshopMode = 'stars' | 'sandbox';

interface PartCatalogEntry {
  key: PartType;
  label: string;
  dockW: number;
  dockH: number;
  boardW: number;
  boardH: number;
  rotatable: boolean;
  defaultAngleDeg: number;
}

interface MarbleCatalogEntry {
  key: MarbleType;
  label: string;
  mass: number;
  restitution: number;
  friction: number;
  speedBoost: number;
  trailColor: number;
  glowColor: number;
}

const PART_CATALOG: PartCatalogEntry[] = [
  {
    key: 'part-ramp',
    label: 'Straight Ramp',
    dockW: 88,
    dockH: 22,
    boardW: 176,
    boardH: 34,
    rotatable: true,
    defaultAngleDeg: 16
  },
  {
    key: 'part-bowl',
    label: 'Curved Chute',
    dockW: 82,
    dockH: 50,
    boardW: 156,
    boardH: 94,
    rotatable: true,
    defaultAngleDeg: 0
  },
  {
    key: 'part-drum-bumper',
    label: 'Drum Bumper',
    dockW: 66,
    dockH: 60,
    boardW: 96,
    boardH: 88,
    rotatable: true,
    defaultAngleDeg: 0
  },
  {
    key: 'part-paddle-wheel',
    label: 'Paddle Wheel',
    dockW: 68,
    dockH: 68,
    boardW: 118,
    boardH: 118,
    rotatable: true,
    defaultAngleDeg: 0
  },
  {
    key: 'part-chime-bar',
    label: 'Chime Bar',
    dockW: 84,
    dockH: 42,
    boardW: 164,
    boardH: 68,
    rotatable: true,
    defaultAngleDeg: -14
  },
  {
    key: 'part-funnel',
    label: 'Copper Funnel',
    dockW: 62,
    dockH: 68,
    boardW: 108,
    boardH: 118,
    rotatable: true,
    defaultAngleDeg: 0
  },
  {
    key: 'part-bellows',
    label: 'Updraft Fan',
    dockW: 44,
    dockH: 74,
    boardW: 68,
    boardH: 122,
    rotatable: true,
    defaultAngleDeg: 0
  },
  {
    key: 'part-cannon',
    label: 'Spring Cannon',
    dockW: 82,
    dockH: 42,
    boardW: 132,
    boardH: 66,
    rotatable: true,
    defaultAngleDeg: -20
  }
];

const PART_BY_KEY: Record<PartType, PartCatalogEntry> = Object.fromEntries(
  PART_CATALOG.map((p) => [p.key, p])
) as Record<PartType, PartCatalogEntry>;

const MARBLE_CATALOG: MarbleCatalogEntry[] = [
  {
    key: 'marble-cobalt',
    label: 'Cobalt Swirl',
    mass: 1.0,
    restitution: 0.52,
    friction: 0.0002,
    speedBoost: 1.0,
    trailColor: 0x38bdf8,
    glowColor: 0x0284c7
  },
  {
    key: 'marble-comet',
    label: 'Golden Comet',
    mass: 0.9,
    restitution: 0.64,
    friction: 0.0001,
    speedBoost: 1.18,
    trailColor: 0xfde047,
    glowColor: 0xf59e0b
  },
  {
    key: 'marble-steel',
    label: 'Heavy Steel',
    mass: 2.25,
    restitution: 0.28,
    friction: 0.0002,
    speedBoost: 1.04,
    trailColor: 0xe2e8f0,
    glowColor: 0x64748b
  },
  {
    key: 'marble-emerald',
    label: 'Super Bounce',
    mass: 0.85,
    restitution: 0.92,
    friction: 0.0002,
    speedBoost: 1.06,
    trailColor: 0x34d399,
    glowColor: 0x10b981
  }
];

const MARBLE_BY_KEY: Record<MarbleType, MarbleCatalogEntry> = Object.fromEntries(
  MARBLE_CATALOG.map((m) => [m.key, m])
) as Record<MarbleType, MarbleCatalogEntry>;

interface PlacedContraption {
  id: number;
  type: PartType;
  x: number;
  y: number;
  angleDeg: number;
  flipX: 1 | -1;
  lockedByPuzzle: boolean;
  sprite: Phaser.GameObjects.Image;
  shadowSprite: Phaser.GameObjects.Image;
  lockBadge?: Phaser.GameObjects.Arc;
  // Dynamic physics state for moving/hinged parts:
  wheelAngleDeg: number;
  wheelOmegaDeg: number;
  lastHitTime: number;
}

interface StarTarget {
  index: 0 | 1 | 2;
  x: number;
  y: number;
  collected: boolean;
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Arc;
  baseY: number;
}

interface TrailPoint {
  x: number;
  y: number;
  bounced: boolean;
}

interface ActiveMarble {
  id: number;
  marbleType: MarbleType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  omega: number;
  rotation: number;
  radius: number;
  mass: number;
  restitution: number;
  friction: number;
  speedBoost: number;
  trailColor: number;
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Arc;
  trail: TrailPoint[];
  lastTrailSampleAt: number;
  spawnTime: number;
  caught: boolean;
  rollingOnWood: boolean;
  inUpdraft: boolean;
  funnelCaptureId: number | null;
  funnelReleaseTime: number;
  cannonCaptureId: number | null;
  cannonFireTime: number;
  cannonCooldownUntil: number;
  partHitCooldowns: Map<number, number>;
}

interface WindParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface HandcraftedPuzzle {
  hopperX: number;
  cartX: number;
  stars: Array<{ x: number; y: number }>;
  obstacles: Array<{ type: PartType; x: number; y: number; angleDeg: number }>;
  starterParts: Array<{ type: PartType; x: number; y: number; angleDeg: number }>;
}

const HANDCRAFTED_PUZZLES: HandcraftedPuzzle[] = [
  // Puzzle 1: Gentle introductory slope with 1 starter ramp already nearly aligned
  {
    hopperX: 290,
    cartX: 820,
    stars: [
      { x: 370, y: 230 },
      { x: 560, y: 330 },
      { x: 760, y: 430 }
    ],
    obstacles: [],
    starterParts: [
      { type: 'part-ramp', x: 350, y: 265, angleDeg: 20 },
      { type: 'part-ramp', x: 560, y: 368, angleDeg: 18 }
    ]
  },
  // Puzzle 2: Bounce & Chime challenge across the center
  {
    hopperX: 960,
    cartX: 360,
    stars: [
      { x: 880, y: 235 },
      { x: 640, y: 310 },
      { x: 420, y: 410 }
    ],
    obstacles: [],
    starterParts: [
      { type: 'part-chime-bar', x: 890, y: 275, angleDeg: -18 },
      { type: 'part-drum-bumper', x: 650, y: 385, angleDeg: 0 }
    ]
  },
  // Puzzle 3: Navigating around a central fixed workshop beam
  {
    hopperX: 340,
    cartX: 900,
    stars: [
      { x: 340, y: 215 },
      { x: 615, y: 265 },
      { x: 845, y: 405 }
    ],
    obstacles: [
      { type: 'part-paddle-wheel', x: 495, y: 295, angleDeg: 0 }
    ],
    starterParts: [
      { type: 'part-ramp', x: 355, y: 255, angleDeg: 18 },
      { type: 'part-cannon', x: 585, y: 365, angleDeg: -22 }
    ]
  },
  // Puzzle 4: Updraft Bellows & Copper Funnel precision drop
  {
    hopperX: 260,
    cartX: 940,
    stars: [
      { x: 420, y: 340 },
      { x: 650, y: 220 },
      { x: 940, y: 390 }
    ],
    obstacles: [],
    starterParts: [
      { type: 'part-ramp', x: 330, y: 280, angleDeg: 22 },
      { type: 'part-bellows', x: 520, y: 420, angleDeg: 14 },
      { type: 'part-funnel', x: 940, y: 295, angleDeg: 0 }
    ]
  }
];

const ARENA_MIN_X = 54;
const ARENA_MAX_X = 1226;
const ARENA_MIN_Y = 48;
const ARENA_MAX_Y = 582;

const PLACE_MIN_X = 95;
const PLACE_MAX_X = 1185;
const PLACE_MIN_Y = 135;
const PLACE_MAX_Y = 505;

const HOPPER_RAIL_Y = 86;
const CART_TRACK_Y = 532;
const DOCK_Y = 655;
const CLEAR_BTN_X = 1224;
const CLEAR_BTN_Y = 655;

export class TinkerWorkshopScene extends Phaser.Scene {
  private audio!: TinkerAudioEngine;

  // Mode & Environment State
  private activeMode: WorkshopMode = 'stars';
  private activeMarbleType: MarbleType = 'marble-cobalt';
  private moonGravity = false;
  private fountainActive = false;
  private puzzleIndex = 0;
  private simTimeSec = 0;

  // Contraptions & Selection Halo State
  private contraptions: PlacedContraption[] = [];
  private nextContraptionId = 1;
  private selectedPart: PlacedContraption | null = null;
  private draggingPart: PlacedContraption | null = null;
  private dragOffset = { x: 0, y: 0 };
  private partMovedDuringDrag = false;
  private isRotatingWithHaloHandle = false;

  // Brass Rotation Halo UI
  private haloContainer!: Phaser.GameObjects.Container;
  private haloRingGraphics!: Phaser.GameObjects.Graphics;
  private haloHandleKnob!: Phaser.GameObjects.Container;
  private haloAngleText!: Phaser.GameObjects.Text;

  // Sparky Top Sliding Hopper (`y = 86`)
  private hopperX = 290;
  private sparkySprite!: Phaser.GameObjects.Image;
  private pullChainSprite!: Phaser.GameObjects.Image;
  private hopperMarbleBadge!: Phaser.GameObjects.Image;
  private hopperMarbleRing!: Phaser.GameObjects.Arc;
  private isDraggingHopper = false;

  // Doggie Bottom Rolling Minecart (`y = 532`)
  private cartX = 820;
  private doggieSprite!: Phaser.GameObjects.Image;
  private cartCatchGlow!: Phaser.GameObjects.Arc;
  private starHudContainer!: Phaser.GameObjects.Container;
  private starHudSlots: Phaser.GameObjects.Image[] = [];
  private starHudText!: Phaser.GameObjects.Text;
  private isDraggingCart = false;
  private isCelebratingVictory = false;

  // Stars & Active Marbles
  private stars: StarTarget[] = [];
  private starsCollectedCount = 0;
  private marbles: ActiveMarble[] = [];
  private nextMarbleId = 1;
  private pairClinkCooldowns: Map<string, number> = new Map();
  private fountainTimer: Phaser.Time.TimerEvent | null = null;

  // Persistent Ghost Trajectory Trail & Wind Particles
  private lastCompletedTrail: TrailPoint[] = [];
  private lastTrailColor = 0x38bdf8;
  private lastTrailMissedPoint: { x: number; y: number } | null = null;
  private ghostTrailGraphics!: Phaser.GameObjects.Graphics;
  private liveSightLineGraphics!: Phaser.GameObjects.Graphics;
  private windGraphics!: Phaser.GameObjects.Graphics;
  private windParticles: WindParticle[] = [];

  // UI Highlights
  private marbleSelectorRings: Map<MarbleType, Phaser.GameObjects.Arc> = new Map();
  private modeBtnRings: Map<string, Phaser.GameObjects.Arc> = new Map();
  private gravityBtnBadge!: Phaser.GameObjects.Text;
  private gravityBtnRing!: Phaser.GameObjects.Arc;
  private fountainBtnRing!: Phaser.GameObjects.Arc;
  private clearBtnRing!: Phaser.GameObjects.Arc;
  private trashCanIcon!: Phaser.GameObjects.Image;

  constructor() {
    super({ key: 'TinkerWorkshopScene' });
  }

  public preload(): void {
    if (!this.textures.exists('tinker-bg-v2')) {
      this.load.image('tinker-bg-v2', '/assets/games/tinker-workshop/tinker-bg-v2.png?v=tinker3');
    }
    if (!this.textures.exists('tinker-trash-can')) {
      this.load.image('tinker-trash-can', '/assets/games/tinker-workshop/sprites/tinker-trash-can.png?v=tinker4');
    }
    for (const part of PART_CATALOG) {
      if (!this.textures.exists(part.key)) {
        this.load.image(part.key, `/assets/games/tinker-workshop/sprites/${part.key}.png?v=tinker4`);
      }
    }
    for (const marble of MARBLE_CATALOG) {
      if (!this.textures.exists(marble.key)) {
        this.load.image(marble.key, `/assets/games/tinker-workshop/sprites/${marble.key}.png?v=tinker3`);
      }
    }
  }

  public create(): void {
    this.audio = new TinkerAudioEngine();

    // Reset state cleanly
    this.contraptions = [];
    this.selectedPart = null;
    this.draggingPart = null;
    this.isRotatingWithHaloHandle = false;
    this.stars = [];
    this.starsCollectedCount = 0;
    this.marbles = [];
    this.pairClinkCooldowns.clear();
    this.lastCompletedTrail = [];
    this.lastTrailMissedPoint = null;
    this.windParticles = [];
    this.marbleSelectorRings.clear();
    this.modeBtnRings.clear();
    this.activeMode = 'stars';
    this.activeMarbleType = 'marble-cobalt';
    this.moonGravity = false;
    this.fountainActive = false;
    this.isCelebratingVictory = false;
    this.simTimeSec = 0;

    // 1. Wide-Open Heirloom Walnut & Brass Workshop Wall (`1280x720`)
    const bgKey = this.textures.exists('tinker-bg-v2') ? 'tinker-bg-v2' : 'tinker-frame-bg';
    this.add.image(640, 360, bgKey).setDisplaySize(1280, 720).setDepth(0);

    // 2. Graphics Layers: Wind Particles, Persistent Ghost Trail, and Live Sight-Line
    this.windGraphics = this.add.graphics().setDepth(8);
    this.ghostTrailGraphics = this.add.graphics().setDepth(10);
    this.liveSightLineGraphics = this.add.graphics().setDepth(12);

    // 3. Build Sparky's Sliding Top Brass Hopper (`y = 86`) & Doggie's Rolling Minecart (`y = 532`)
    this.buildSparkyHopper();
    this.buildDoggieMinecart();

    // 4. Build Tactile Circular Brass Rotation Halo (hidden until a contraption is tapped/selected)
    this.buildBrassRotationHalo();

    // 5. Build Top Navigation & Mode Bar + Compact Bottom Brass-and-Wood Parts Dock (`y: 595..710`)
    this.buildTopBarControls();
    this.buildBottomPartsDock();

    // 6. Register Unified Pointer Drag & Rotation Handlers
    this.registerPointerInteractions();

    // 7. Load Initial 3-Star Challenge Puzzle
    this.loadStarChallengePuzzle(0, false);

    // 8. Play calm welcome narration once after scene transition settles
    this.time.delayedCall(240, () => {
      this.audio.speakPrompt('welcome_title');
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.fountainTimer) {
        this.fountainTimer.remove(false);
        this.fountainTimer = null;
      }
      this.audio.stopAll();
    });
  }

  // ===========================================================================
  // SCALE LOCK HELPERS
  // ===========================================================================

  private lockBaseScale(
    sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
    flipX: 1 | -1 = 1
  ): void {
    const bx = Math.abs(sprite.scaleX);
    const by = Math.abs(sprite.scaleY);
    sprite.setData('baseScaleX', bx);
    sprite.setData('baseScaleY', by);
    sprite.setData('flipXSign', flipX);
    sprite.setScale(bx * flipX, by);
  }

  private restoreBaseScale(
    sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite
  ): void {
    const bx = (sprite.getData('baseScaleX') as number) ?? Math.abs(sprite.scaleX);
    const by = (sprite.getData('baseScaleY') as number) ?? Math.abs(sprite.scaleY);
    const flipX = (sprite.getData('flipXSign') as 1 | -1) ?? (sprite.scaleX < 0 ? -1 : 1);
    sprite.setScale(bx * flipX, by);
  }

  private pulseSprite(
    sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
    multX: number,
    multY: number,
    duration = 150
  ): void {
    this.tweens.killTweensOf(sprite);
    this.restoreBaseScale(sprite);
    const bx = sprite.getData('baseScaleX') as number;
    const by = sprite.getData('baseScaleY') as number;
    const flipX = (sprite.getData('flipXSign') as 1 | -1) ?? 1;

    this.tweens.add({
      targets: sprite,
      scaleX: bx * flipX * multX,
      scaleY: by * multY,
      duration: duration * 0.5,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => this.restoreBaseScale(sprite)
    });
  }

  // ===========================================================================
  // SPARKY TOP SLIDING BRASS HOPPER & DOGGIE BOTTOM ROLLING MINECART
  // ===========================================================================

  private buildSparkyHopper(): void {
    this.pullChainSprite = this.add
      .image(this.hopperX - 58, HOPPER_RAIL_Y + 18, 'prop-pull-chain')
      .setDisplaySize(32, 84)
      .setDepth(24)
      .setInteractive({ useHandCursor: true });
    this.lockBaseScale(this.pullChainSprite, 1);

    this.sparkySprite = this.add
      .image(this.hopperX, HOPPER_RAIL_Y, 'sparky-hopper-1')
      .setDisplaySize(108, 128)
      .setDepth(25)
      .setInteractive({ useHandCursor: true, draggable: true });
    this.lockBaseScale(this.sparkySprite, 1);
    this.input.setDraggable(this.sparkySprite);

    this.hopperMarbleRing = this.add
      .circle(this.hopperX + 38, HOPPER_RAIL_Y - 18, 18, 0x1e293b, 0.9)
      .setStrokeStyle(2.5, 0xfde047, 0.95)
      .setDepth(26);

    this.hopperMarbleBadge = this.add
      .image(this.hopperX + 38, HOPPER_RAIL_Y - 18, this.activeMarbleType)
      .setDisplaySize(26, 26)
      .setDepth(27);
    this.lockBaseScale(this.hopperMarbleBadge, 1);

    let dragStartX = 0;
    let movedHopper = false;

    this.sparkySprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      dragStartX = pointer.x;
      movedHopper = false;
    });

    this.sparkySprite.on('drag', (pointer: Phaser.Input.Pointer, dragX: number) => {
      if (Math.abs(pointer.x - dragStartX) > 10) {
        movedHopper = true;
      }
      if (!movedHopper) return;

      if (this.activeMode === 'stars') {
        if (!this.isDraggingHopper) {
          this.isDraggingHopper = true;
          this.audio.playRotateClick();
          const baseX = this.hopperX;
          this.tweens.add({
            targets: this.sparkySprite,
            x: { from: baseX - 6, to: baseX + 6 },
            duration: 60,
            yoyo: true,
            repeat: 2,
            onUpdate: () => this.syncHopperAttachments(),
            onComplete: () => {
              this.sparkySprite.x = baseX;
              this.syncHopperAttachments();
              this.isDraggingHopper = false;
            }
          });
        }
        return;
      }

      this.isDraggingHopper = true;
      this.hopperX = Phaser.Math.Clamp(dragX, 120, 1160);
      this.sparkySprite.x = this.hopperX;
      this.syncHopperAttachments();
    });

    this.sparkySprite.on('dragend', () => {
      this.isDraggingHopper = false;
    });

    this.sparkySprite.on('pointerup', () => {
      if (!movedHopper) {
        this.launchMarbleFromHopper();
      }
    });

    this.pullChainSprite.on('pointerdown', () => {
      this.tweens.killTweensOf(this.pullChainSprite);
      this.pullChainSprite.y = HOPPER_RAIL_Y + 18;
      this.tweens.add({
        targets: this.pullChainSprite,
        y: HOPPER_RAIL_Y + 36,
        duration: 110,
        yoyo: true,
        ease: 'Back.easeOut'
      });
      this.launchMarbleFromHopper();
    });
  }

  private syncHopperAttachments(): void {
    const sx = this.sparkySprite.x;
    const sy = this.sparkySprite.y;
    this.pullChainSprite.setPosition(sx - 58, sy + 18);
    this.hopperMarbleRing.setPosition(sx + 38, sy - 18);
    this.hopperMarbleBadge.setPosition(sx + 38, sy - 18);
  }

  private buildDoggieMinecart(): void {
    this.cartCatchGlow = this.add
      .circle(this.cartX, CART_TRACK_Y - 12, 46, 0x34d399, 0.12)
      .setStrokeStyle(2.5, 0xfde047, 0.55)
      .setDepth(23);

    this.doggieSprite = this.add
      .image(this.cartX, CART_TRACK_Y, 'doggie-cart-1')
      .setDisplaySize(124, 124)
      .setDepth(25)
      .setInteractive({ useHandCursor: true, draggable: true });
    this.lockBaseScale(this.doggieSprite, 1);
    this.input.setDraggable(this.doggieSprite);

    // 3-Star Progress Tracker HUD above Doggie's cart
    this.starHudContainer = this.add.container(this.cartX, CART_TRACK_Y - 76).setDepth(27);
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x271206, 0.92);
    hudBg.lineStyle(2.5, 0xfbbf24, 0.95);
    hudBg.fillRoundedRect(-64, -18, 128, 36, 12);
    hudBg.strokeRoundedRect(-64, -18, 128, 36, 12);
    this.starHudContainer.add(hudBg);

    this.starHudSlots = [];
    [-40, -14, 12].forEach((sx) => {
      const slot = this.add
        .image(sx, 0, 'prop-star')
        .setDisplaySize(22, 22)
        .setTint(0x451a03)
        .setAlpha(0.55);
      this.lockBaseScale(slot, 1);
      this.starHudContainer.add(slot);
      this.starHudSlots.push(slot);
    });

    this.starHudText = this.add
      .text(42, 0, '0/3', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#fde047'
      })
      .setOrigin(0.5);
    this.starHudContainer.add(this.starHudText);

    this.doggieSprite.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
      if (this.activeMode === 'stars') {
        if (!this.isDraggingCart) {
          this.isDraggingCart = true;
          this.audio.playRotateClick();
          const baseX = this.cartX;
          this.tweens.add({
            targets: this.doggieSprite,
            x: { from: baseX - 6, to: baseX + 6 },
            duration: 60,
            yoyo: true,
            repeat: 2,
            onUpdate: () => this.syncCartAttachments(),
            onComplete: () => {
              this.doggieSprite.x = baseX;
              this.syncCartAttachments();
              this.isDraggingCart = false;
            }
          });
        }
        return;
      }

      this.isDraggingCart = true;
      this.cartX = Phaser.Math.Clamp(dragX, 130, 1150);
      this.doggieSprite.x = this.cartX;
      this.syncCartAttachments();
    });

    this.doggieSprite.on('dragend', () => {
      this.isDraggingCart = false;
    });
  }

  private syncCartAttachments(): void {
    const cx = this.doggieSprite.x;
    const cy = this.doggieSprite.y;
    this.cartCatchGlow.setPosition(cx, cy - 12);
    this.starHudContainer.setPosition(cx, cy - 76);
  }

  private updateStarHudVisuals(): void {
    this.starHudContainer.setVisible(this.activeMode === 'stars');
    this.starHudText.setText(`${this.starsCollectedCount}/3`);
    this.starHudSlots.forEach((slot, idx) => {
      const collected = this.stars[idx]?.collected ?? false;
      if (collected) {
        slot.clearTint();
        slot.setAlpha(1.0);
      } else {
        slot.setTint(0x451a03);
        slot.setAlpha(0.55);
      }
    });
  }

  // ===========================================================================
  // TACTILE BRASS ROTATION HALO / TILT HANDLE
  // ===========================================================================

  private buildBrassRotationHalo(): void {
    this.haloContainer = this.add.container(0, 0).setDepth(60).setVisible(false);
    this.haloRingGraphics = this.add.graphics();
    this.haloContainer.add(this.haloRingGraphics);

    const haloRadius = 78;

    // Angle readout pill at top of halo
    const pillBg = this.add.graphics();
    pillBg.fillStyle(0x1c0d06, 0.92);
    pillBg.lineStyle(2, 0xfbbf24, 0.95);
    pillBg.fillRoundedRect(-34, -haloRadius - 32, 68, 24, 8);
    pillBg.strokeRoundedRect(-34, -haloRadius - 32, 68, 24, 8);
    this.haloAngleText = this.add
      .text(0, -haloRadius - 20, '0°', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    this.haloContainer.add([pillBg, this.haloAngleText]);

    // Draggable Brass Tilt Knob on the halo perimeter
    this.haloHandleKnob = this.add.container(haloRadius, 0);
    const knobG = this.add.graphics();
    knobG.fillStyle(0x451a03, 0.96);
    knobG.fillCircle(0, 0, 20);
    knobG.lineStyle(3, 0xfde047, 1);
    knobG.strokeCircle(0, 0, 20);
    const knobTxt = this.add
      .text(0, 0, '⟳', { fontSize: '20px', color: '#fef08a', fontStyle: 'bold' })
      .setOrigin(0.5);
    const knobZone = this.add
      .zone(0, 0, 56, 56)
      .setInteractive({ useHandCursor: true });
    this.haloHandleKnob.add([knobG, knobTxt, knobZone]);
    this.haloContainer.add(this.haloHandleKnob);

    knobZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      this.isRotatingWithHaloHandle = true;
      this.audio.playRotateClick();
    });

    // Helper for Halo Quick-Action Buttons (-15 deg, +15 deg, Flip, Trash)
    const makeHaloBtn = (
      bx: number,
      by: number,
      label: string,
      fillHex: number,
      strokeHex: number,
      onClick: () => void
    ) => {
      const btn = this.add.container(bx, by);
      const g = this.add.graphics();
      g.fillStyle(fillHex, 0.95);
      g.fillCircle(0, 0, 22);
      g.lineStyle(2.5, strokeHex, 1);
      g.strokeCircle(0, 0, 22);
      const t = this.add
        .text(0, 0, label, {
          fontFamily: '"Fredoka", sans-serif',
          fontSize: '18px',
          fontStyle: 'bold',
          color: '#fef08a'
        })
        .setOrigin(0.5);
      const z = this.add.zone(0, 0, 56, 56).setInteractive({ useHandCursor: true });
      z.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event?.stopPropagation();
        Juice.squashAndStretch(this, btn, 0.18, 120);
        onClick();
      });
      btn.add([g, t, z]);
      this.haloContainer.add(btn);
      return btn;
    };

    // Left Quick-Tilt CCW (-15 deg)
    makeHaloBtn(-haloRadius - 24, 0, '↶', 0x271206, 0xfbbf24, () => {
      this.nudgeSelectedPartAngle(-15);
    });

    // Right Quick-Tilt CW (+15 deg)
    makeHaloBtn(haloRadius + 24, 0, '↷', 0x271206, 0xfbbf24, () => {
      this.nudgeSelectedPartAngle(15);
    });
  }

  private selectContraption(part: PlacedContraption | null): void {
    if (part && part.lockedByPuzzle) {
      this.audio.playRotateClick();
      this.pulseSprite(part.sprite, 1.08, 0.94, 140);
      return;
    }
    this.selectedPart = part;
    this.refreshHaloVisuals();
    this.drawLiveSightLine();
  }

  private refreshHaloVisuals(): void {
    if (!this.selectedPart || !this.contraptions.includes(this.selectedPart)) {
      this.haloContainer.setVisible(false);
      this.liveSightLineGraphics.clear();
      return;
    }

    const part = this.selectedPart;
    const haloRadius = 78;

    this.haloContainer.setPosition(part.x, part.y);
    this.haloContainer.setVisible(true);

    this.haloRingGraphics.clear();
    // Soft golden selection halo + degree tick marks
    this.haloRingGraphics.fillStyle(0xfde047, 0.08);
    this.haloRingGraphics.fillCircle(0, 0, haloRadius);
    this.haloRingGraphics.lineStyle(2.5, 0xfbbf24, 0.85);
    this.haloRingGraphics.strokeCircle(0, 0, haloRadius);

    for (let deg = 0; deg < 360; deg += 15) {
      const rad = Phaser.Math.DegToRad(deg);
      const inner = deg % 45 === 0 ? haloRadius - 9 : haloRadius - 5;
      this.haloRingGraphics.lineStyle(deg % 45 === 0 ? 2 : 1, 0xfde047, 0.65);
      this.haloRingGraphics.beginPath();
      this.haloRingGraphics.moveTo(Math.cos(rad) * inner, Math.sin(rad) * inner);
      this.haloRingGraphics.lineTo(Math.cos(rad) * haloRadius, Math.sin(rad) * haloRadius);
      this.haloRingGraphics.strokePath();
    }

    const roundedDeg = Math.round(Phaser.Math.Angle.WrapDegrees(part.angleDeg));
    this.haloAngleText.setText(`${roundedDeg > 0 ? '+' : ''}${roundedDeg}°`);

    this.haloHandleKnob.setVisible(true);
    const rad = Phaser.Math.DegToRad(part.angleDeg);
    this.haloHandleKnob.setPosition(Math.cos(rad) * haloRadius, Math.sin(rad) * haloRadius);
  }

  private nudgeSelectedPartAngle(deltaDeg: number): void {
    if (!this.selectedPart || this.selectedPart.lockedByPuzzle) return;

    // Full 360° smooth rotation (-180° to +180°) with zero angle clamping
    const nextDeg = Phaser.Math.Angle.WrapDegrees(
      Math.round((this.selectedPart.angleDeg + deltaDeg) / 5) * 5
    );
    this.selectedPart.angleDeg = nextDeg;
    this.selectedPart.wheelAngleDeg = nextDeg;
    this.audio.playRotateClick();
    this.syncContraptionVisuals(this.selectedPart);
    this.refreshHaloVisuals();
    this.drawLiveSightLine();
  }

  // ===========================================================================
  // TOP BAR CONTROLS & COMPACT BOTTOM BRASS-AND-WOOD PARTS DOCK (`y: 595..710`)
  // ===========================================================================

  private buildTopBarControls(): void {
    // 1. Top-Left Back to Bookshelf Button (`x = 58, y = 44`)
    const backBtn = this.add.container(58, 44).setDepth(50);
    const backBg = this.add.graphics();
    backBg.fillStyle(0x271206, 0.92);
    backBg.fillCircle(0, 0, 26);
    backBg.lineStyle(2.5, 0xfbbf24, 0.95);
    backBg.strokeCircle(0, 0, 26);
    const backIcon = this.add
      .image(0, 0, 'tool-bookshelf')
      .setDisplaySize(38, 38);
    this.lockBaseScale(backIcon, 1);
    backBtn.add([backBg, backIcon]);

    Juice.makeTactileButton(
      this,
      backBtn,
      64,
      64,
      () => {
        this.audio.stopAll();
        this.scene.start('HubScene');
      },
      'pop'
    );

    // 2. Top-Right Mode & Sandbox Controls (`y = 44`)
    const makeTopRoundBtn = (
      x: number,
      y: number,
      id: string,
      iconKey: string | null,
      emojiText: string | null,
      onClick: () => void
    ) => {
      const c = this.add.container(x, y).setDepth(50);
      const ring = this.add
        .circle(0, 0, 27, 0x271206, 0.92)
        .setStrokeStyle(2.5, 0xfbbf24, 0.9);
      c.add(ring);
      this.modeBtnRings.set(id, ring);

      if (iconKey && this.textures.exists(iconKey)) {
        const img = this.add.image(0, 0, iconKey).setDisplaySize(36, 36);
        this.lockBaseScale(img, 1);
        c.add(img);
      } else if (emojiText) {
        const txt = this.add
          .text(0, 0, emojiText, {
            fontFamily: '"Fredoka", sans-serif',
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#fef08a'
          })
          .setOrigin(0.5);
        c.add(txt);
        if (id === 'gravity') {
          this.gravityBtnBadge = txt;
          this.gravityBtnRing = ring;
        }
      }

      if (id === 'fountain') {
        this.fountainBtnRing = ring;
      }

      Juice.makeTactileButton(this, c, 64, 64, onClick, 'tab');
      return c;
    };

    // Star Challenge Mode (`x = 990`)
    makeTopRoundBtn(990, 44, 'stars', 'tinker-mode-stars', null, () => {
      this.switchWorkshopMode('stars');
    });

    // Pure Sandbox Mode (`x = 1056`)
    makeTopRoundBtn(1056, 44, 'sandbox', 'tinker-mode-guide', null, () => {
      this.switchWorkshopMode('sandbox');
    });

    // Multi-Marble Fountain Shower (`x = 1122`)
    makeTopRoundBtn(1122, 44, 'fountain', 'tinker-mode-fountain', null, () => {
      this.toggleMarbleFountain();
    });

    // Moon / Normal Gravity Toggle (`x = 1188`)
    makeTopRoundBtn(1188, 44, 'gravity', null, '🌍', () => {
      this.moonGravity = !this.moonGravity;
      if (this.gravityBtnBadge) {
        this.gravityBtnBadge.setText(this.moonGravity ? '🌙' : '🌍');
      }
      if (this.gravityBtnRing) {
        this.gravityBtnRing.setFillStyle(this.moonGravity ? 0x312e81 : 0x271206, 0.95);
        this.gravityBtnRing.setStrokeStyle(3, this.moonGravity ? 0x38bdf8 : 0xfbbf24, 1);
      }
      this.audio.speakPrompt(this.moonGravity ? 'gravity_moon' : 'gravity_normal');
    });

    this.updateTopModeHighlights();
  }

  private updateTopModeHighlights(): void {
    const starsRing = this.modeBtnRings.get('stars');
    const sandboxRing = this.modeBtnRings.get('sandbox');
    if (starsRing) {
      const active = this.activeMode === 'stars';
      starsRing.setFillStyle(active ? 0x451a03 : 0x271206, 0.95);
      starsRing.setStrokeStyle(active ? 3.5 : 2, active ? 0xfde047 : 0x92400e, 1);
    }
    if (sandboxRing) {
      const active = this.activeMode === 'sandbox';
      sandboxRing.setFillStyle(active ? 0x451a03 : 0x271206, 0.95);
      sandboxRing.setStrokeStyle(active ? 3.5 : 2, active ? 0xfde047 : 0x92400e, 1);
    }
  }

  private switchWorkshopMode(mode: WorkshopMode): void {
    if (this.activeMode === mode) return;
    this.activeMode = mode;
    this.selectContraption(null);
    this.clearActiveMarbles();

    if (mode === 'stars') {
      this.loadStarChallengePuzzle(this.puzzleIndex, false);
      this.audio.speakPrompt('mode_stars');
    } else {
      // Remove puzzle lock badges and stars so child has a 100% open sandbox
      this.stars.forEach((s) => {
        s.sprite.destroy();
        s.glow.destroy();
      });
      this.stars = [];
      this.contraptions.forEach((c) => {
        c.lockedByPuzzle = false;
        if (c.lockBadge) {
          c.lockBadge.destroy();
          c.lockBadge = undefined;
        }
      });
      this.updateStarHudVisuals();
      this.audio.speakPrompt('mode_sandbox');
    }
    this.updateTopModeHighlights();
  }

  private buildBottomPartsDock(): void {
    // 1. Left-to-Center: All 8 Contraption Parts in the compact bottom dock (`x = 80..822, y = 655`)
    const startX = 80;
    const stepX = 104;

    PART_CATALOG.forEach((part, idx) => {
      const slotX = startX + idx * stepX;
      const slotY = DOCK_Y;

      const slotBg = this.add.graphics().setDepth(42);
      slotBg.fillStyle(0x1c0d06, 0.86);
      slotBg.lineStyle(2, 0xb45309, 0.88);
      slotBg.fillRoundedRect(slotX - 46, slotY - 44, 92, 88, 12);
      slotBg.strokeRoundedRect(slotX - 46, slotY - 44, 92, 88, 12);

      const icon = this.add
        .image(slotX, slotY - 4, part.key)
        .setDisplaySize(part.dockW, part.dockH)
        .setDepth(44);
      this.lockBaseScale(icon, 1);

      const hitZone = this.add
        .zone(slotX, slotY, 96, 92)
        .setInteractive({ useHandCursor: true })
        .setDepth(46);

      hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        this.audio.playPegSnap();
        this.pulseSprite(icon, 1.15, 0.88, 140);
        this.spawnAndStartDraggingContraption(part.key, pointer.x, pointer.y);
      });
    });

    // Divider line between Contraptions and Marble Selector
    const divG = this.add.graphics().setDepth(43);
    divG.lineStyle(2, 0xd97706, 0.65);
    divG.beginPath();
    divG.moveTo(874, 612);
    divG.lineTo(874, 698);
    divG.strokePath();

    // 2. 4 Swirl Marbles Selector Wells (`x = 910, 964, 1018, 1072, y = 655`)
    MARBLE_CATALOG.forEach((marble, mIdx) => {
      const mx = 910 + mIdx * 54;
      const my = DOCK_Y;

      const ring = this.add
        .circle(mx, my, 23, 0x1e293b, 0.9)
        .setStrokeStyle(2.5, mIdx === 0 ? 0xfde047 : 0x78350f, 0.95)
        .setDepth(43);
      this.marbleSelectorRings.set(marble.key, ring);

      const mIcon = this.add
        .image(mx, my, marble.key)
        .setDisplaySize(34, 34)
        .setDepth(44);
      this.lockBaseScale(mIcon, 1);

      const mZone = this.add
        .zone(mx, my, 52, 76)
        .setInteractive({ useHandCursor: true })
        .setDepth(46);

      mZone.on('pointerdown', () => {
        this.selectMarbleType(marble.key);
        this.pulseSprite(mIcon, 1.2, 0.85, 140);
      });
    });

    // 3. Big Tactile Drop / Launch Button (`x = 1146, y = 655`)
    const dropContainer = this.add.container(1146, DOCK_Y).setDepth(45);
    const dropRing = this.add
      .circle(0, 0, 32, 0x065f46, 0.95)
      .setStrokeStyle(3, 0x34d399, 1);
    const dropIcon = this.add
      .image(0, 0, 'tinker-action-drop')
      .setDisplaySize(44, 44);
    this.lockBaseScale(dropIcon, 1);
    dropContainer.add([dropRing, dropIcon]);

    Juice.makeTactileButton(
      this,
      dropContainer,
      68,
      68,
      () => {
        this.launchMarbleFromHopper();
      },
      'pop'
    );

    // 4. Brass Workshop Trash Can (Drag-to-Delete Drop-Zone for Single Contraption at `x = 1224, y = 655`)
    const clearContainer = this.add.container(CLEAR_BTN_X, CLEAR_BTN_Y).setDepth(45);
    this.clearBtnRing = this.add
      .circle(0, 0, 32, 0x451a03, 0.95)
      .setStrokeStyle(2.5, 0xfbbf24, 0.95);
    const trashKey = this.textures.exists('tinker-trash-can') ? 'tinker-trash-can' : 'tinker-action-clear';
    this.trashCanIcon = this.add
      .image(0, 0, trashKey)
      .setDisplaySize(44, 54);
    this.lockBaseScale(this.trashCanIcon, 1);
    clearContainer.add([this.clearBtnRing, this.trashCanIcon]);

    const trashTapZone = this.add
      .zone(CLEAR_BTN_X, CLEAR_BTN_Y, 68, 68)
      .setInteractive({ useHandCursor: true })
      .setDepth(46);
    trashTapZone.on('pointerdown', () => {
      if (this.draggingPart) return;
      this.audio.playRotateClick();
      if (this.trashCanIcon) {
        this.pulseSprite(this.trashCanIcon, 1.12, 0.9, 150);
      }
      this.tweens.killTweensOf(clearContainer);
      clearContainer.setAngle(0);
      this.tweens.add({
        targets: clearContainer,
        angle: { from: -8, to: 8 },
        duration: 65,
        yoyo: true,
        repeat: 2,
        onComplete: () => clearContainer.setAngle(0)
      });
    });
  }

  private selectMarbleType(marbleType: MarbleType): void {
    this.activeMarbleType = marbleType;
    this.audio.playBallClink(180, marbleType === 'marble-steel');

    this.hopperMarbleBadge.setTexture(marbleType);
    this.restoreBaseScale(this.hopperMarbleBadge);
    this.pulseSprite(this.hopperMarbleBadge, 1.22, 0.85, 140);

    this.marbleSelectorRings.forEach((ring, key) => {
      const selected = key === marbleType;
      ring.setStrokeStyle(selected ? 3.5 : 2, selected ? 0xfde047 : 0x78350f, 1);
      ring.setFillStyle(selected ? 0x3b1d0a : 0x1e293b, 0.95);
    });
  }

  // ===========================================================================
  // CONTRAPTION CREATION, DRAGGING, ROTATION & REMOVAL
  // ===========================================================================

  private createContraptionOnBoard(
    type: PartType,
    x: number,
    y: number,
    angleDeg?: number,
    lockedByPuzzle = false
  ): PlacedContraption {
    const cfg = PART_BY_KEY[type];
    const initialAngle = angleDeg ?? cfg.defaultAngleDeg;

    const shadowSprite = this.add
      .image(x + 4, y + 6, type)
      .setDisplaySize(cfg.boardW, cfg.boardH)
      .setTint(0x000000)
      .setAlpha(0.35)
      .setAngle(initialAngle)
      .setDepth(18);
    this.lockBaseScale(shadowSprite, 1);

    const sprite = this.add
      .image(x, y, type)
      .setDisplaySize(cfg.boardW, cfg.boardH)
      .setAngle(initialAngle)
      .setDepth(20)
      .setInteractive({ useHandCursor: true });
    this.lockBaseScale(sprite, 1);

    let lockBadge: Phaser.GameObjects.Arc | undefined;
    if (lockedByPuzzle) {
      lockBadge = this.add
        .circle(x, y, 10, 0x78350f, 0.95)
        .setStrokeStyle(2, 0xfde047, 0.95)
        .setDepth(22);
    }

    const part: PlacedContraption = {
      id: this.nextContraptionId++,
      type,
      x,
      y,
      angleDeg: initialAngle,
      flipX: 1,
      lockedByPuzzle,
      sprite,
      shadowSprite,
      lockBadge,
      wheelAngleDeg: initialAngle,
      wheelOmegaDeg: 0,
      lastHitTime: 0
    };

    sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (part.lockedByPuzzle) {
        this.selectContraption(part);
        return;
      }
      this.selectContraption(part);
      this.draggingPart = part;
      this.partMovedDuringDrag = false;
      this.dragOffset.x = part.x - pointer.x;
      this.dragOffset.y = part.y - pointer.y;
      part.sprite.setDepth(35);
      part.shadowSprite.setDepth(34);
    });

    this.contraptions.push(part);
    return part;
  }

  private spawnAndStartDraggingContraption(type: PartType, pointerX: number, pointerY: number): void {
    const clampedY = Math.min(pointerY - 24, PLACE_MAX_Y);
    const part = this.createContraptionOnBoard(type, pointerX, clampedY);
    this.selectContraption(part);
    this.draggingPart = part;
    this.partMovedDuringDrag = true;
    this.dragOffset.x = 0;
    this.dragOffset.y = -18;
    part.sprite.setDepth(35);
    part.shadowSprite.setDepth(34);
    this.refreshHaloVisuals();
    this.drawLiveSightLine();
  }

  private syncContraptionVisuals(part: PlacedContraption): void {
    const renderAngle =
      part.type === 'part-paddle-wheel'
        ? part.wheelAngleDeg
        : part.angleDeg;

    part.sprite.setPosition(part.x, part.y).setAngle(renderAngle);
    part.shadowSprite.setPosition(part.x + 4, part.y + 6).setAngle(renderAngle);
    if (part.lockBadge) {
      part.lockBadge.setPosition(part.x, part.y);
    }
  }

  private removeContraption(part: PlacedContraption): void {
    this.audio.playSweepClear();
    Juice.burstStars(this, part.x, part.y, 8, [0xfde047, 0xfbbf24]);
    part.sprite.destroy();
    part.shadowSprite.destroy();
    if (part.lockBadge) part.lockBadge.destroy();
    this.contraptions = this.contraptions.filter((c) => c.id !== part.id);
    if (this.selectedPart?.id === part.id) {
      this.selectContraption(null);
    }
  }

  private registerPointerInteractions(): void {
    // Clicking bare workshop wall deselects the rotation halo
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
      if (currentlyOver.length === 0 && pointer.y < 590) {
        this.selectContraption(null);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isRotatingWithHaloHandle && this.selectedPart && !this.selectedPart.lockedByPuzzle) {
        const dx = pointer.x - this.selectedPart.x;
        const dy = pointer.y - this.selectedPart.y;
        const rawDeg = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
        // Full 360° smooth rotation (-180° to +180°) with zero clamping
        const wrappedDeg = Phaser.Math.Angle.WrapDegrees(Math.round(rawDeg / 3) * 3);
        if (wrappedDeg !== this.selectedPart.angleDeg) {
          this.selectedPart.angleDeg = wrappedDeg;
          this.selectedPart.wheelAngleDeg = wrappedDeg;
          this.audio.playRotateClick();
          this.syncContraptionVisuals(this.selectedPart);
          this.refreshHaloVisuals();
          this.drawLiveSightLine();
        }
        return;
      }

      if (this.draggingPart && !this.draggingPart.lockedByPuzzle) {
        this.partMovedDuringDrag = true;
        const targetX = Phaser.Math.Clamp(pointer.x + this.dragOffset.x, PLACE_MIN_X, 1245);
        const targetY = Phaser.Math.Clamp(pointer.y + this.dragOffset.y, PLACE_MIN_Y, 685);
        this.draggingPart.x = targetX;
        this.draggingPart.y = targetY;
        this.syncContraptionVisuals(this.draggingPart);
        this.refreshHaloVisuals();
        this.drawLiveSightLine();

        // Highlight bottom-right Brass Workshop Trash Can when dragging a contraption near it
        const nearTrash =
          Phaser.Math.Distance.Between(pointer.x, pointer.y, CLEAR_BTN_X, CLEAR_BTN_Y) < 78 ||
          Phaser.Math.Distance.Between(this.draggingPart.x, this.draggingPart.y, CLEAR_BTN_X, CLEAR_BTN_Y) < 82;
        this.clearBtnRing.setFillStyle(nearTrash ? 0x7f1d1d : 0x451a03, 0.96);
        this.clearBtnRing.setStrokeStyle(nearTrash ? 4.5 : 2.5, nearTrash ? 0xf87171 : 0xfbbf24, 1);
        if (this.trashCanIcon) {
          const bx = (this.trashCanIcon.getData('baseScaleX') as number) ?? 1;
          const by = (this.trashCanIcon.getData('baseScaleY') as number) ?? 1;
          this.trashCanIcon.setScale(bx * (nearTrash ? 1.18 : 1.0), by * (nearTrash ? 1.18 : 1.0));
        }
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.isRotatingWithHaloHandle) {
        this.isRotatingWithHaloHandle = false;
        return;
      }

      if (this.draggingPart) {
        const part = this.draggingPart;
        this.draggingPart = null;
        this.clearBtnRing.setFillStyle(0x451a03, 0.95);
        this.clearBtnRing.setStrokeStyle(2.5, 0xfbbf24, 0.95);
        if (this.trashCanIcon) {
          this.restoreBaseScale(this.trashCanIcon);
        }

        const droppedInTrashCan =
          Phaser.Math.Distance.Between(pointer.x, pointer.y, CLEAR_BTN_X, CLEAR_BTN_Y) < 78 ||
          Phaser.Math.Distance.Between(part.x, part.y, CLEAR_BTN_X, CLEAR_BTN_Y) < 82;

        if (droppedInTrashCan) {
          if (this.trashCanIcon) {
            this.pulseSprite(this.trashCanIcon, 1.25, 0.82, 160);
          }
          this.removeContraption(part);
          return;
        }

        part.x = Phaser.Math.Clamp(part.x, PLACE_MIN_X, PLACE_MAX_X);
        part.y = Phaser.Math.Clamp(part.y, PLACE_MIN_Y, PLACE_MAX_Y);
        part.sprite.setDepth(20);
        part.shadowSprite.setDepth(18);
        this.syncContraptionVisuals(part);

        if (this.partMovedDuringDrag) {
          this.audio.playPegSnap();
          this.pulseSprite(part.sprite, 1.08, 0.94, 140);
        }
        this.refreshHaloVisuals();
        this.drawLiveSightLine();
      }
    });
  }

  /**
   * Draws a subtle predictive sight-line showing the slope, updraft, or cannon blast trajectory
   * of the currently selected contraption so children can align it directly with the Ghost Trail!
   */
  private drawLiveSightLine(): void {
    this.liveSightLineGraphics.clear();
    if (!this.selectedPart) return;

    const p = this.selectedPart;
    const rad = Phaser.Math.DegToRad(p.angleDeg);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    this.liveSightLineGraphics.lineStyle(2.5, 0xfef08a, 0.55);

    if (p.type === 'part-bellows') {
      // Upward wind stream preview
      const nx = Math.sin(rad);
      const ny = -Math.cos(rad);
      for (let d = 24; d <= 180; d += 18) {
        this.liveSightLineGraphics.fillStyle(0xfde047, 0.75 * (1 - d / 210));
        this.liveSightLineGraphics.fillCircle(p.x + nx * d, p.y + ny * d, 4);
      }
    } else if (p.type === 'part-cannon') {
      // 360° Brass Spring Cannon blast arc preview from nozzle tip
      const nozzleX = p.x + cos * 54;
      const nozzleY = p.y + sin * 54;
      const launchSpeed = 760;
      const g = this.moonGravity ? 265 : 690;
      for (let step = 1; step <= 9; step++) {
        const t = step * 0.042;
        const bx = nozzleX + cos * launchSpeed * t;
        const by = nozzleY + sin * launchSpeed * t + 0.5 * g * t * t;
        this.liveSightLineGraphics.fillStyle(0xfde047, 0.85 - step * 0.08);
        this.liveSightLineGraphics.fillCircle(bx, by, 4.5);
      }
    } else {
      // Slope direction & roll-off preview dots
      const dirSign = sin >= 0 ? 1 : -1;
      const halfSpan = 88;
      const endX = p.x + cos * halfSpan * dirSign;
      const endY = p.y + sin * halfSpan * dirSign;
      for (let step = 1; step <= 7; step++) {
        const t = step * 0.065;
        const gx = endX + cos * dirSign * 220 * t;
        const gy = endY + sin * dirSign * 220 * t + 0.5 * 520 * t * t;
        this.liveSightLineGraphics.fillStyle(0xfef08a, 0.7 - step * 0.08);
        this.liveSightLineGraphics.fillCircle(gx, gy, 3.5);
      }
    }
  }

  // ===========================================================================
  // 3-STAR CHALLENGE PUZZLES (HANDCRAFTED + PROCEDURAL)
  // ===========================================================================

  private loadStarChallengePuzzle(index: number, playAudioCue = true): void {
    this.puzzleIndex = index;
    this.isCelebratingVictory = false;
    this.selectContraption(null);
    this.clearActiveMarbles();
    this.lastCompletedTrail = [];
    this.lastTrailMissedPoint = null;
    this.renderGhostTrail();

    // Clear existing contraptions & stars
    this.contraptions.forEach((c) => {
      c.sprite.destroy();
      c.shadowSprite.destroy();
      if (c.lockBadge) c.lockBadge.destroy();
    });
    this.contraptions = [];

    this.stars.forEach((s) => {
      s.sprite.destroy();
      s.glow.destroy();
    });
    this.stars = [];
    this.starsCollectedCount = 0;

    // Use handcrafted puzzles first, then procedural variations
    let puzzle: HandcraftedPuzzle;
    if (index < HANDCRAFTED_PUZZLES.length) {
      puzzle = HANDCRAFTED_PUZZLES[index];
    } else {
      const goRight = index % 2 === 0;
      const hX = goRight ? Phaser.Math.Between(240, 420) : Phaser.Math.Between(860, 1040);
      const cX = goRight ? Phaser.Math.Between(780, 1020) : Phaser.Math.Between(260, 500);
      const s1X = Phaser.Math.Linear(hX, cX, 0.22);
      const s2X = Phaser.Math.Linear(hX, cX, 0.54);
      const s3X = Phaser.Math.Linear(hX, cX, 0.85);
      puzzle = {
        hopperX: hX,
        cartX: cX,
        stars: [
          { x: s1X, y: 225 },
          { x: s2X, y: 325 },
          { x: s3X, y: 420 }
        ],
        obstacles: [
          {
            type: 'part-paddle-wheel',
            x: Phaser.Math.Linear(hX, cX, 0.38),
            y: 280,
            angleDeg: 0
          }
        ],
        starterParts: [
          {
            type: 'part-ramp',
            x: s1X,
            y: 265,
            angleDeg: goRight ? 18 : -18
          },
          {
            type: 'part-chime-bar',
            x: s2X,
            y: 365,
            angleDeg: goRight ? 16 : -16
          }
        ]
      };
    }

    // Position Sparky's Hopper & Doggie's Minecart
    this.hopperX = puzzle.hopperX;
    this.cartX = puzzle.cartX;

    this.tweens.add({
      targets: this.sparkySprite,
      x: this.hopperX,
      duration: 280,
      ease: 'Back.easeOut',
      onUpdate: () => this.syncHopperAttachments()
    });

    this.doggieSprite.setTexture('doggie-cart-1');
    this.restoreBaseScale(this.doggieSprite);
    this.tweens.add({
      targets: this.doggieSprite,
      x: this.cartX,
      duration: 280,
      ease: 'Back.easeOut',
      onUpdate: () => this.syncCartAttachments()
    });

    // Spawn 3 Golden Compass Stars
    puzzle.stars.forEach((st, idx) => {
      const starIdx = (idx as 0 | 1 | 2);
      const glow = this.add
        .circle(st.x, st.y, 32, 0xfde047, 0.2)
        .setStrokeStyle(2, 0xfbbf24, 0.5)
        .setDepth(15);

      const sprite = this.add
        .image(st.x, st.y, 'prop-star')
        .setDisplaySize(54, 54)
        .setDepth(16);
      this.lockBaseScale(sprite, 1);

      this.stars.push({
        index: starIdx,
        x: st.x,
        y: st.y,
        baseY: st.y,
        collected: false,
        sprite,
        glow
      });
    });

    // Spawn Fixed Workshop Obstacles & Player-Adjustable Starter Contraptions
    puzzle.obstacles.forEach((obs) => {
      this.createContraptionOnBoard(obs.type, obs.x, obs.y, obs.angleDeg, true);
    });
    puzzle.starterParts.forEach((sp) => {
      this.createContraptionOnBoard(sp.type, sp.x, sp.y, sp.angleDeg, false);
    });

    this.updateStarHudVisuals();
    if (playAudioCue) {
      this.audio.playPegSnap();
    }
  }

  private resetStarsForNewRun(): void {
    this.starsCollectedCount = 0;
    this.stars.forEach((s) => {
      s.collected = false;
      s.sprite.setAlpha(1).clearTint();
      this.restoreBaseScale(s.sprite);
      s.glow.setAlpha(1);
    });
    this.updateStarHudVisuals();
  }

  // ===========================================================================
  // MARBLE LAUNCHER & MULTI-MARBLE FOUNTAIN SHOWER
  // ===========================================================================

  private launchMarbleFromHopper(overrideType?: MarbleType): void {
    if (this.isCelebratingVictory) return;

    if (this.activeMode === 'stars' && this.marbles.length === 0) {
      this.resetStarsForNewRun();
    }

    const mType = overrideType ?? this.activeMarbleType;
    const cfg = MARBLE_BY_KEY[mType];

    // Animate Sparky Hopper drop
    this.audio.playHopperDrop();
    this.pulseSprite(this.sparkySprite, 1.1, 0.9, 160);

    const spawnX = this.sparkySprite.x + Phaser.Math.FloatBetween(-2.5, 2.5);
    const spawnY = HOPPER_RAIL_Y + 48;
    const radius = 17;

    const glow = this.add
      .circle(spawnX, spawnY, radius + 5, cfg.glowColor, 0.28)
      .setDepth(28);

    const sprite = this.add
      .image(spawnX, spawnY, mType)
      .setDisplaySize(radius * 2, radius * 2)
      .setDepth(29);
    this.lockBaseScale(sprite, 1);

    const marble: ActiveMarble = {
      id: this.nextMarbleId++,
      marbleType: mType,
      x: spawnX,
      y: spawnY,
      vx: Phaser.Math.FloatBetween(-6, 6),
      vy: 28,
      omega: 0,
      rotation: 0,
      radius,
      mass: cfg.mass,
      restitution: cfg.restitution,
      friction: cfg.friction,
      speedBoost: cfg.speedBoost,
      trailColor: cfg.trailColor,
      sprite,
      glow,
      trail: [{ x: spawnX, y: spawnY, bounced: false }],
      lastTrailSampleAt: this.simTimeSec,
      spawnTime: this.simTimeSec,
      caught: false,
      rollingOnWood: false,
      inUpdraft: false,
      funnelCaptureId: null,
      funnelReleaseTime: 0,
      cannonCaptureId: null,
      cannonFireTime: 0,
      cannonCooldownUntil: 0,
      partHitCooldowns: new Map()
    };

    this.marbles.push(marble);
  }

  private toggleMarbleFountain(): void {
    if (this.fountainTimer) {
      this.fountainTimer.remove(false);
      this.fountainTimer = null;
      this.fountainActive = false;
      if (this.fountainBtnRing) {
        this.fountainBtnRing.setFillStyle(0x271206, 0.92);
        this.fountainBtnRing.setStrokeStyle(2.5, 0xfbbf24, 0.9);
      }
      return;
    }

    this.fountainActive = true;
    if (this.fountainBtnRing) {
      this.fountainBtnRing.setFillStyle(0x065f46, 0.96);
      this.fountainBtnRing.setStrokeStyle(3.5, 0x34d399, 1);
    }
    this.audio.speakPrompt('fountain_on');

    const sequenceTypes: MarbleType[] = [
      'marble-cobalt',
      'marble-comet',
      'marble-emerald',
      'marble-steel',
      'marble-cobalt',
      'marble-comet',
      'marble-emerald',
      'marble-cobalt'
    ];
    let dropIndex = 0;

    this.launchMarbleFromHopper(sequenceTypes[0]);
    dropIndex++;

    this.fountainTimer = this.time.addEvent({
      delay: 380,
      repeat: sequenceTypes.length - 2,
      callback: () => {
        if (dropIndex < sequenceTypes.length) {
          this.launchMarbleFromHopper(sequenceTypes[dropIndex]);
          dropIndex++;
        }
        if (dropIndex >= sequenceTypes.length) {
          this.fountainActive = false;
          this.fountainTimer = null;
          if (this.fountainBtnRing) {
            this.fountainBtnRing.setFillStyle(0x271206, 0.92);
            this.fountainBtnRing.setStrokeStyle(2.5, 0xfbbf24, 0.9);
          }
        }
      }
    });
  }

  private clearActiveMarbles(): void {
    this.marbles.forEach((m) => {
      m.sprite.destroy();
      m.glow.destroy();
    });
    this.marbles = [];
    this.audio.updateRollingLoop(0, false);
  }

  // ===========================================================================
  // PERSISTENT GHOST TRAJECTORY TRAIL (VISUAL DEBUGGING FOR AGES 3–4)
  // ===========================================================================

  private renderGhostTrail(): void {
    this.ghostTrailGraphics.clear();

    // 1. Draw the Persistent Ghost Trail from the last test run so the child can align ramps!
    if (this.lastCompletedTrail.length > 1) {
      for (let i = 0; i < this.lastCompletedTrail.length; i++) {
        const pt = this.lastCompletedTrail[i];
        const progress = i / this.lastCompletedTrail.length;
        const alpha = 0.24 + (1 - progress * 0.45) * 0.38;

        if (pt.bounced) {
          this.ghostTrailGraphics.lineStyle(2, 0xfef08a, alpha + 0.2);
          this.ghostTrailGraphics.strokeCircle(pt.x, pt.y, 7);
        } else {
          this.ghostTrailGraphics.fillStyle(this.lastTrailColor, alpha);
          this.ghostTrailGraphics.fillCircle(pt.x, pt.y, 4);
        }
      }

      if (this.lastTrailMissedPoint) {
        const mp = this.lastTrailMissedPoint;
        const pulseRadius = 14 + Math.sin(this.simTimeSec * 5) * 3;
        this.ghostTrailGraphics.lineStyle(2.5, 0xfbbf24, 0.78);
        this.ghostTrailGraphics.strokeCircle(mp.x, mp.y, pulseRadius);
      }
    }

    // 2. Draw active marbles' live glowing trails
    for (const m of this.marbles) {
      for (let i = 0; i < m.trail.length; i++) {
        const pt = m.trail[i];
        const ageAlpha = ((i + 1) / m.trail.length) * 0.72;
        if (pt.bounced) {
          this.ghostTrailGraphics.fillStyle(0xfef08a, ageAlpha);
          this.ghostTrailGraphics.fillCircle(pt.x, pt.y, 5.5);
        } else {
          this.ghostTrailGraphics.fillStyle(m.trailColor, ageAlpha);
          this.ghostTrailGraphics.fillCircle(pt.x, pt.y, 3.8);
        }
      }
    }
  }

  // ===========================================================================
  // 8-SUBSTEP DETERMINISTIC 2D RIGID-BODY PHYSICS ENGINE
  // ===========================================================================

  public update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    this.simTimeSec += dt;

    // Gentle floating bob on uncollected Golden Compass Stars
    for (const st of this.stars) {
      if (!st.collected) {
        st.sprite.y = st.baseY + Math.sin(this.simTimeSec * 3.2 + st.index * 1.4) * 4;
        st.glow.y = st.sprite.y;
      }
    }

    // Update Wind Bellows golden air particle streams
    this.updateWindParticles(dt);

    // Step dynamic contraption bodies (Paddle Wheel inertia)
    for (const part of this.contraptions) {
      if (part.type === 'part-paddle-wheel') {
        part.wheelAngleDeg = (part.wheelAngleDeg + part.wheelOmegaDeg * dt) % 360;
        part.wheelOmegaDeg *= Math.pow(0.48, dt); // Smooth mechanical bearing damping
        if (Math.abs(part.wheelOmegaDeg) > 0.2) {
          this.syncContraptionVisuals(part);
        }
      }
    }

    if (this.marbles.length === 0) {
      this.audio.updateRollingLoop(0, false);
      if (this.lastTrailMissedPoint) {
        this.renderGhostTrail();
      }
      return;
    }

    const subSteps = 8;
    const subDt = dt / subSteps;
    const gravityY = this.moonGravity ? 265 : 690;

    for (const m of this.marbles) {
      m.rollingOnWood = false;
    }

    for (let s = 0; s < subSteps; s++) {
      this.stepPhysicsSubstep(subDt, gravityY);
    }

    // Sync marble sprites, sample Ghost Trails, and check Minecart catch or Bottom Miss
    let maxWoodRollSpeed = 0;
    let anyRollingOnWood = false;
    const finishedMarbles: ActiveMarble[] = [];

    for (const m of this.marbles) {
      m.sprite.setPosition(m.x, m.y).setRotation(m.rotation);
      m.glow.setPosition(m.x, m.y);

      const speed = Math.hypot(m.vx, m.vy);
      if (m.rollingOnWood && speed > 18) {
        anyRollingOnWood = true;
        if (speed > maxWoodRollSpeed) maxWoodRollSpeed = speed;
      }

      if (this.simTimeSec - m.lastTrailSampleAt >= 0.028) {
        m.lastTrailSampleAt = this.simTimeSec;
        m.trail.push({ x: m.x, y: m.y, bounced: false });
        if (m.trail.length > 140) m.trail.shift();
      }

      // Check Star Collection
      for (const st of this.stars) {
        if (!st.collected && Phaser.Math.Distance.Between(m.x, m.y, st.x, st.y) <= m.radius + 28) {
          this.collectStar(st);
        }
      }

      // Check Doggie Minecart Catch (`cartX`, `CART_TRACK_Y`)
      const dxCart = m.x - this.cartX;
      const dyCart = m.y - (CART_TRACK_Y - 12);
      if (Math.abs(dxCart) <= 48 && dyCart >= -26 && dyCart <= 28 && m.vy >= -40) {
        m.caught = true;
        finishedMarbles.push(m);
        this.onMarbleCaughtInCart(m);
        continue;
      }

      // Check Bottom Miss (`y > ARENA_MAX_Y`) or timeout (`> 16s`)
      if (m.y > ARENA_MAX_Y || this.simTimeSec - m.spawnTime > 16) {
        finishedMarbles.push(m);
        this.onMarbleMissedBottom(m);
      }
    }

    if (finishedMarbles.length > 0) {
      const finishedIds = new Set(finishedMarbles.map((fm) => fm.id));
      finishedMarbles.forEach((fm) => {
        fm.sprite.destroy();
        fm.glow.destroy();
      });
      this.marbles = this.marbles.filter((m) => !finishedIds.has(m.id));
    }

    this.audio.updateRollingLoop(maxWoodRollSpeed, anyRollingOnWood);
    this.renderGhostTrail();
  }

  private stepPhysicsSubstep(subDt: number, gravityY: number): void {
    // 1. Advance each marble & apply Brass Spring Cannon / Wind Bellows / Copper Funnel forces
    for (const m of this.marbles) {
      // Brass Spring Cannon 0.35s capture & high-velocity 360° nozzle blast
      if (m.cannonCaptureId !== null) {
        const cannon = this.contraptions.find((c) => c.id === m.cannonCaptureId);
        if (!cannon) {
          m.cannonCaptureId = null;
          m.sprite.setAlpha(1);
          this.restoreBaseScale(m.sprite);
        } else if (this.simTimeSec < m.cannonFireTime) {
          const rad = Phaser.Math.DegToRad(cannon.angleDeg);
          m.x = cannon.x - Math.cos(rad) * 10;
          m.y = cannon.y - Math.sin(rad) * 10;
          m.vx = 0;
          m.vy = 0;
          m.omega = 0;
          continue;
        } else {
          // FIRE the marble out the cannon nozzle in the exact 360° direction it is aimed!
          const rad = Phaser.Math.DegToRad(cannon.angleDeg);
          const dirX = Math.cos(rad);
          const dirY = Math.sin(rad);
          const nozzleOffset = 54;
          m.x = cannon.x + dirX * nozzleOffset;
          m.y = cannon.y + dirY * nozzleOffset;
          const launchSpeed = 760 * m.speedBoost;
          m.vx = dirX * launchSpeed;
          m.vy = dirY * launchSpeed;
          m.omega = (dirX >= 0 ? 1 : -1) * 16;
          m.cannonCaptureId = null;
          m.cannonCooldownUntil = this.simTimeSec + 0.24;
          m.sprite.setAlpha(1);
          this.restoreBaseScale(m.sprite);
          m.trail.push({ x: m.x, y: m.y, bounced: true });

          this.audio.playCannonFire();
          this.pulseSprite(cannon.sprite, 1.28, 0.76, 190);
          this.spawnCannonBlastEffects(m.x, m.y, dirX, dirY);
        }
      }

      // Copper Funnel capture & straight tube drop
      if (m.funnelCaptureId !== null) {
        const funnel = this.contraptions.find((c) => c.id === m.funnelCaptureId);
        if (funnel && this.simTimeSec < m.funnelReleaseTime) {
          const fRad = Phaser.Math.DegToRad(funnel.angleDeg);
          const dropDirX = -Math.sin(fRad);
          const dropDirY = Math.cos(fRad);
          m.x = Phaser.Math.Linear(m.x, funnel.x, 18 * subDt) + dropDirX * 235 * subDt;
          m.y = Phaser.Math.Linear(m.y, funnel.y, 18 * subDt) + dropDirY * 235 * subDt;
          m.vx = dropDirX * 235;
          m.vy = dropDirY * 235;
          m.rotation += 4 * subDt;
          continue;
        } else {
          m.funnelCaptureId = null;
        }
      }

      // Apply gravity
      m.vy += gravityY * subDt;

      // Apply Updraft Wind Bellows force fields (single puff sound strictly once on entry)
      let insideAnyUpdraft = false;
      for (const part of this.contraptions) {
        if (part.type !== 'part-bellows') continue;
        const rad = Phaser.Math.DegToRad(part.angleDeg);
        const dirX = Math.sin(rad);
        const dirY = -Math.cos(rad);
        const relX = m.x - part.x;
        const relY = m.y - part.y;
        const along = relX * dirX + relY * dirY;
        const perp = Math.abs(relX * (-dirY) + relY * dirX);

        if (along > -20 && along < 250 && perp < 48) {
          insideAnyUpdraft = true;
          const strength = (1 - along / 260) * (1280 / Math.max(0.75, m.mass));
          m.vx += dirX * strength * subDt;
          m.vy += dirY * strength * subDt;
          m.vx += (-relX * (-dirY) - relY * dirX) * 2.2 * subDt;
        }
      }

      if (insideAnyUpdraft && !m.inUpdraft) {
        m.inUpdraft = true;
        this.audio.playBellowsPuff();
      } else if (!insideAnyUpdraft && m.inUpdraft) {
        m.inUpdraft = false;
      }

      // Minimal air drag so downhill ramps and cannon blasts retain crisp velocity
      m.vx *= 1 - 0.015 * subDt;
      m.vy *= 1 - 0.015 * subDt;

      const prevX = m.x;
      const prevY = m.y;
      m.x += m.vx * subDt;
      m.y += m.vy * subDt;
      m.rotation += m.omega * subDt;

      // Left / Right Arena Walnut Walls (`ARENA_MIN_X`, `ARENA_MAX_X`)
      if (m.x - m.radius < ARENA_MIN_X) {
        m.x = ARENA_MIN_X + m.radius;
        const hitSpd = Math.abs(m.vx);
        m.vx = Math.abs(m.vx) * 0.58;
        if (hitSpd > 65) this.audio.playWoodCollision(hitSpd, m.mass);
      } else if (m.x + m.radius > ARENA_MAX_X) {
        m.x = ARENA_MAX_X - m.radius;
        const hitSpd = Math.abs(m.vx);
        m.vx = -Math.abs(m.vx) * 0.58;
        if (hitSpd > 65) this.audio.playWoodCollision(hitSpd, m.mass);
      }
      if (m.y - m.radius < ARENA_MIN_Y) {
        m.y = ARENA_MIN_Y + m.radius;
        m.vy = Math.abs(m.vy) * 0.45;
      }

      // Collide against all placed contraptions using anti-tunneling swept checks
      for (const part of this.contraptions) {
        this.collideMarbleWithContraption(m, prevX, prevY, part, subDt, gravityY);
      }
    }

    // 2. Multi-marble elastic ball-to-ball collisions
    for (let i = 0; i < this.marbles.length; i++) {
      for (let j = i + 1; j < this.marbles.length; j++) {
        this.resolveMarblePairCollision(this.marbles[i], this.marbles[j]);
      }
    }
  }

  private spawnCannonBlastEffects(nozzleX: number, nozzleY: number, dirX: number, dirY: number): void {
    // Golden pixel-art star burst at muzzle
    Juice.burstStars(this, nozzleX, nozzleY, 12, [0xfef08a, 0xfde047, 0xfbbf24, 0xffffff]);

    // Puff of golden pixel-art smoke rings expanding outward from the cannon nozzle
    for (let i = 0; i < 6; i++) {
      const puff = this.add
        .circle(
          nozzleX + dirX * (6 + i * 4) + Phaser.Math.FloatBetween(-8, 8),
          nozzleY + dirY * (6 + i * 4) + Phaser.Math.FloatBetween(-8, 8),
          Phaser.Math.FloatBetween(7, 13),
          i % 2 === 0 ? 0xfef08a : 0xfde68a,
          0.82
        )
        .setDepth(32);

      const spreadAngle = Math.atan2(dirY, dirX) + Phaser.Math.FloatBetween(-0.48, 0.48);
      const dist = Phaser.Math.FloatBetween(28, 64);
      this.tweens.add({
        targets: puff,
        x: puff.x + Math.cos(spreadAngle) * dist,
        y: puff.y + Math.sin(spreadAngle) * dist - 8,
        scaleX: 2.1,
        scaleY: 2.1,
        alpha: 0,
        duration: Phaser.Math.Between(260, 420),
        ease: 'Quad.easeOut',
        onComplete: () => puff.destroy()
      });
    }
  }

  private collideMarbleWithContraption(
    m: ActiveMarble,
    prevX: number,
    prevY: number,
    part: PlacedContraption,
    subDt: number,
    gravityY: number
  ): void {
    // Quick bounding-sphere reject
    if (Phaser.Math.Distance.Between(m.x, m.y, part.x, part.y) > 135) return;

    const lastHit = m.partHitCooldowns.get(part.id) ?? 0;

    // 1. Brass Spring Cannon / Marble Blaster (`part-cannon`)
    if (part.type === 'part-cannon') {
      if (m.cannonCaptureId === null && this.simTimeSec >= m.cannonCooldownUntil) {
        const distToCannon = Phaser.Math.Distance.Between(m.x, m.y, part.x, part.y);
        if (distToCannon <= 46) {
          m.cannonCaptureId = part.id;
          m.cannonFireTime = this.simTimeSec + 0.35;
          m.vx = 0;
          m.vy = 0;
          m.omega = 0;
          m.sprite.setAlpha(0.35);
          m.trail.push({ x: part.x, y: part.y, bounced: true });

          this.audio.playCannonWindup();

          // Visual 0.35s spring coil wind-up squash on the cannon barrel
          this.tweens.killTweensOf(part.sprite);
          this.restoreBaseScale(part.sprite);
          const bx = (part.sprite.getData('baseScaleX') as number) ?? Math.abs(part.sprite.scaleX);
          const by = (part.sprite.getData('baseScaleY') as number) ?? Math.abs(part.sprite.scaleY);
          this.tweens.add({
            targets: part.sprite,
            scaleX: bx * 0.78,
            scaleY: by * 1.2,
            duration: 320,
            ease: 'Sine.easeInOut'
          });
        }
      }
      return;
    }

    // 2. Copper Funnel & Tube Drop (`part-funnel`, rotatable 360°)
    if (part.type === 'part-funnel') {
      const fRad = Phaser.Math.DegToRad(part.angleDeg);
      const cosF = Math.cos(fRad);
      const sinF = Math.sin(fRad);
      const dx = m.x - part.x;
      const dy = m.y - part.y;
      const localX = dx * cosF + dy * sinF;
      const localY = -dx * sinF + dy * cosF;

      if (Math.abs(localX) < 42 && localY > -56 && localY < -4) {
        m.funnelCaptureId = part.id;
        m.funnelReleaseTime = this.simTimeSec + 0.24;
        if (this.simTimeSec - lastHit > 0.2) {
          m.partHitCooldowns.set(part.id, this.simTimeSec);
          this.audio.playFunnelClang(Math.hypot(m.vx, m.vy));
          this.pulseSprite(part.sprite, 1.08, 0.94, 150);
          m.trail.push({ x: m.x, y: m.y, bounced: true });
        }
        return;
      }
      // Funnel outer rim walls rotated by `part.angleDeg`
      const toWorld = (lx: number, ly: number) => ({
        wx: part.x + lx * cosF - ly * sinF,
        wy: part.y + lx * sinF + ly * cosF
      });
      const lTop = toWorld(-46, -46);
      const lBot = toWorld(-14, 10);
      const rTop = toWorld(46, -46);
      const rBot = toWorld(14, 10);

      this.collideCapsuleSegment(
        m,
        prevX,
        prevY,
        lTop.wx,
        lTop.wy,
        lBot.wx,
        lBot.wy,
        6,
        0.35,
        part,
        subDt,
        gravityY
      );
      this.collideCapsuleSegment(
        m,
        prevX,
        prevY,
        rTop.wx,
        rTop.wy,
        rBot.wx,
        rBot.wy,
        6,
        0.35,
        part,
        subDt,
        gravityY
      );
      return;
    }

    // 3. Spring-Loaded Brass Drum Bumper
    if (part.type === 'part-drum-bumper') {
      const rad = Phaser.Math.DegToRad(part.angleDeg);
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const padCx = part.x + sin * 14;
      const padCy = part.y - cos * 14;
      const hit = this.collideCapsuleSegment(
        m,
        prevX,
        prevY,
        padCx - cos * 36,
        padCy - sin * 36,
        padCx + cos * 36,
        padCy + sin * 36,
        18,
        1.25,
        part,
        subDt,
        gravityY
      );
      if (hit && this.simTimeSec - lastHit > 0.08) {
        m.partHitCooldowns.set(part.id, this.simTimeSec);
        const upX = Math.sin(rad);
        const upY = -Math.cos(rad);
        const boost = 290 * m.restitution + 180;
        m.vx += upX * boost * 0.85;
        m.vy += upY * boost * 0.85;
        this.audio.playDrumBumperBoing(hit.impactSpeed);
        this.pulseSprite(part.sprite, 1.22, 0.78, 180);
        m.trail.push({ x: m.x, y: m.y, bounced: true });
      }
      return;
    }

    // 4. Spinning Brass Paddle Wheel (8 radial blades that accelerate when struck)
    if (part.type === 'part-paddle-wheel') {
      const numBlades = 8;
      const wheelRad = 54;
      for (let b = 0; b < numBlades; b++) {
        const bladeDeg = part.wheelAngleDeg + b * (360 / numBlades);
        const bRad = Phaser.Math.DegToRad(bladeDeg);
        const bx = part.x + Math.cos(bRad) * wheelRad;
        const by = part.y + Math.sin(bRad) * wheelRad;
        const hit = this.collideCapsuleSegment(
          m,
          prevX,
          prevY,
          part.x,
          part.y,
          bx,
          by,
          6,
          0.48,
          part,
          subDt,
          gravityY
        );
        if (hit) {
          // Cross-product torque from marble impact onto wheel
          const rx = m.x - part.x;
          const ry = m.y - part.y;
          const torque = (rx * hit.relVy - ry * hit.relVx) * 0.045 * m.mass;
          part.wheelOmegaDeg = Phaser.Math.Clamp(part.wheelOmegaDeg + torque, -420, 420);

          // Tangential push from spinning blade back onto marble
          const tangX = -Math.sin(bRad);
          const tangY = Math.cos(bRad);
          const bladeTipVel = Phaser.Math.DegToRad(part.wheelOmegaDeg) * wheelRad * 0.35;
          m.vx += tangX * bladeTipVel;
          m.vy += tangY * bladeTipVel;

          if (this.simTimeSec - lastHit > 0.1) {
            m.partHitCooldowns.set(part.id, this.simTimeSec);
            this.audio.playPaddleWheelStrike(part.wheelOmegaDeg / 60);
            m.trail.push({ x: m.x, y: m.y, bounced: true });
          }
          break;
        }
      }
      return;
    }

    // 5. Curved Wooden Chute / Half-Pipe Bowl (6-segment U-shaped arc)
    if (part.type === 'part-bowl') {
      const baseRad = Phaser.Math.DegToRad(part.angleDeg);
      const cosB = Math.cos(baseRad);
      const sinB = Math.sin(baseRad);
      const rx = 68;
      const ry = 38;
      const cyOff = -10;
      const segs = 6;

      for (let i = 0; i < segs; i++) {
        const a0 = Math.PI * (0.08 + (i / segs) * 0.84);
        const a1 = Math.PI * (0.08 + ((i + 1) / segs) * 0.84);
        const lx0 = Math.cos(a0) * rx;
        const ly0 = cyOff + Math.sin(a0) * ry;
        const lx1 = Math.cos(a1) * rx;
        const ly1 = cyOff + Math.sin(a1) * ry;

        const wx0 = part.x + lx0 * cosB - ly0 * sinB;
        const wy0 = part.y + lx0 * sinB + ly0 * cosB;
        const wx1 = part.x + lx1 * cosB - ly1 * sinB;
        const wy1 = part.y + lx1 * sinB + ly1 * cosB;

        const hit = this.collideCapsuleSegment(m, prevX, prevY, wx0, wy0, wx1, wy1, 8, 0.35, part, subDt, gravityY);
        if (hit) {
          m.rollingOnWood = true;
          if (hit.impactSpeed > 75 && this.simTimeSec - lastHit > 0.12) {
            m.partHitCooldowns.set(part.id, this.simTimeSec);
            this.audio.playWoodCollision(hit.impactSpeed, m.mass);
            m.trail.push({ x: m.x, y: m.y, bounced: true });
          }
        }
      }
      return;
    }

    // 6. Musical Pentatonic Chime Bar
    if (part.type === 'part-chime-bar') {
      const rad = Phaser.Math.DegToRad(part.angleDeg);
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const halfLen = 76;
      const hit = this.collideCapsuleSegment(
        m,
        prevX,
        prevY,
        part.x - cos * halfLen,
        part.y - sin * halfLen,
        part.x + cos * halfLen,
        part.y + sin * halfLen,
        14,
        0.65,
        part,
        subDt,
        gravityY
      );
      if (hit) {
        m.rollingOnWood = true;
        if (this.simTimeSec - lastHit > 0.11) {
          m.partHitCooldowns.set(part.id, this.simTimeSec);
          const normX = (hit.tAlong + 0.01) * 0.98;
          const noteIdx = this.audio.playPentatonicChimeBar(normX, hit.impactSpeed);
          this.pulseSprite(part.sprite, 1.06, 0.94, 130);
          const noteColors = [0xf43f5e, 0xfbbf24, 0x10b981, 0x38bdf8, 0xa855f7];
          Juice.burstStars(this, m.x, m.y, 5, [noteColors[noteIdx] ?? 0xfde047, 0xffffff]);
          m.trail.push({ x: m.x, y: m.y, bounced: true });
        }
      }
      return;
    }

    // 7. Hardwood Straight Ramp (`part-ramp`)
    if (part.type === 'part-ramp') {
      const rad = Phaser.Math.DegToRad(part.angleDeg);
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const halfLen = 82;
      const hit = this.collideCapsuleSegment(
        m,
        prevX,
        prevY,
        part.x - cos * halfLen,
        part.y - sin * halfLen,
        part.x + cos * halfLen,
        part.y + sin * halfLen,
        10,
        0.32,
        part,
        subDt,
        gravityY
      );
      if (hit) {
        m.rollingOnWood = true;
        if (hit.impactSpeed > 75 && this.simTimeSec - lastHit > 0.12) {
          m.partHitCooldowns.set(part.id, this.simTimeSec);
          this.audio.playWoodCollision(hit.impactSpeed, m.mass);
          m.trail.push({ x: m.x, y: m.y, bounced: true });
        }
      }
    }
  }

  /**
   * Continuous swept-circle / closest-point capsule collision solver with near-zero rolling drag
   * (`0.9998` per substep) and downhill slope acceleration (`g * sin(theta)`).
   */
  private collideCapsuleSegment(
    m: ActiveMarble,
    prevX: number,
    prevY: number,
    ax: number,
    ay: number,
    bx: number,
    by: number,
    capsuleRadius: number,
    surfaceRestitution: number,
    part: PlacedContraption,
    subDt: number,
    gravityY: number
  ): { impactSpeed: number; tAlong: number; relVx: number; relVy: number } | null {
    const abx = bx - ax;
    const aby = by - ay;
    const abLenSq = Math.max(0.0001, abx * abx + aby * aby);

    // Check current point first; only fall back to midpoint if fast motion crossed the segment
    const tCur = Phaser.Math.Clamp(((m.x - ax) * abx + (m.y - ay) * aby) / abLenSq, 0, 1);
    const cxCur = ax + abx * tCur;
    const cyCur = ay + aby * tCur;
    const dCur = Math.hypot(m.x - cxCur, m.y - cyCur);

    const checkX = (prevX + m.x) * 0.5;
    const checkY = (prevY + m.y) * 0.5;
    const tMid = Phaser.Math.Clamp(((checkX - ax) * abx + (checkY - ay) * aby) / abLenSq, 0, 1);
    const cxMid = ax + abx * tMid;
    const cyMid = ay + aby * tMid;
    const dMid = Math.hypot(checkX - cxMid, checkY - cyMid);

    const minDist = m.radius + capsuleRadius;
    if (dCur >= minDist && dMid >= minDist) return null;

    // Never snap backward to midpoint when dCur is already within contact radius!
    const useMid = dCur >= minDist && dMid < minDist;
    const tAlong = useMid ? tMid : tCur;
    const closestX = useMid ? cxMid : cxCur;
    const closestY = useMid ? cyMid : cyCur;

    let nx = m.x - closestX;
    let ny = m.y - closestY;
    let dist = Math.hypot(nx, ny);
    if (dist < 0.0001) {
      const segLen = Math.sqrt(abLenSq);
      nx = aby / segLen;
      ny = -abx / segLen;
      dist = 1;
    } else {
      nx /= dist;
      ny /= dist;
    }

    // Project cleanly along the surface normal without pulling backward along the tangent
    m.x = closestX + nx * minDist;
    m.y = closestY + ny * minDist;

    const relVx = m.vx;
    const relVy = m.vy;
    const vn = m.vx * nx + m.vy * ny;

    if (vn < 0) {
      const combinedRestitution = Math.min(1.35, surfaceRestitution * (0.55 + m.restitution * 0.75));
      const bounceThreshold = 42;
      const effectiveRest = Math.abs(vn) < bounceThreshold ? 0.0 : combinedRestitution;

      m.vx -= (1 + effectiveRest) * vn * nx;
      m.vy -= (1 + effectiveRest) * vn * ny;

      // Unit tangent along the ramp surface
      const tx = -ny;
      const ty = nx;
      let vt = m.vx * tx + m.vy * ty;

      // Near-zero per-substep rolling drag (`0.9998`) + brisk downhill slope component (`g * sin(theta)`)
      const rollingDrag = 0.9998;
      vt *= rollingDrag;

      const isRampOrChute =
        part.type === 'part-ramp' || part.type === 'part-chime-bar' || part.type === 'part-bowl';
      if (isRampOrChute && Math.abs(ty) > 0.015) {
        // Ensure gravity's tangential slope component (`g * sin(theta)`, where `sin(theta) = ty`)
        // accelerates the marble briskly downhill even on shallow angles!
        vt += gravityY * ty * 0.48 * subDt * m.speedBoost;
      }

      const vnAfter = m.vx * nx + m.vy * ny;
      m.vx = nx * vnAfter + tx * vt;
      m.vy = ny * vnAfter + ty * vt;
      m.omega = vt / Math.max(8, m.radius);
    }

    return {
      impactSpeed: Math.abs(vn),
      tAlong,
      relVx,
      relVy
    };
  }

  private resolveMarblePairCollision(a: ActiveMarble, b: ActiveMarble): void {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const minDist = a.radius + b.radius;
    if (dist <= 0.0001 || dist >= minDist) return;

    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;
    const totalMass = a.mass + b.mass;

    a.x -= nx * overlap * (b.mass / totalMass);
    a.y -= ny * overlap * (b.mass / totalMass);
    b.x += nx * overlap * (a.mass / totalMass);
    b.y += ny * overlap * (a.mass / totalMass);

    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const velAlongNormal = rvx * nx + rvy * ny;
    if (velAlongNormal > 0) return;

    const e = Math.min(0.95, (a.restitution + b.restitution) * 0.55);
    const jImpulse = (-(1 + e) * velAlongNormal) / (1 / a.mass + 1 / b.mass);
    const impX = jImpulse * nx;
    const impY = jImpulse * ny;

    a.vx -= impX / a.mass;
    a.vy -= impY / a.mass;
    b.vx += impX / b.mass;
    b.vy += impY / b.mass;

    const pairKey = a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;
    const lastClink = this.pairClinkCooldowns.get(pairKey) ?? 0;
    const impactSpeed = Math.abs(velAlongNormal);
    if (impactSpeed > 45 && this.simTimeSec - lastClink > 0.09) {
      this.pairClinkCooldowns.set(pairKey, this.simTimeSec);
      this.audio.playBallClink(
        impactSpeed,
        a.marbleType === 'marble-steel' || b.marbleType === 'marble-steel'
      );
    }
  }

  // ===========================================================================
  // WIND BELLOWS GOLDEN PARTICLE STREAM
  // ===========================================================================

  private updateWindParticles(dt: number): void {
    this.windGraphics.clear();

    for (const part of this.contraptions) {
      if (part.type !== 'part-bellows') continue;
      if (Math.random() < 0.65) {
        const rad = Phaser.Math.DegToRad(part.angleDeg);
        const dirX = Math.sin(rad);
        const dirY = -Math.cos(rad);
        const perpX = -dirY;
        const perpY = dirX;
        const spread = Phaser.Math.FloatBetween(-18, 18);

        this.windParticles.push({
          x: part.x + dirX * 36 + perpX * spread,
          y: part.y + dirY * 36 + perpY * spread,
          vx: dirX * Phaser.Math.FloatBetween(190, 260) + perpX * Phaser.Math.FloatBetween(-15, 15),
          vy: dirY * Phaser.Math.FloatBetween(190, 260) + perpY * Phaser.Math.FloatBetween(-15, 15),
          life: 0,
          maxLife: Phaser.Math.FloatBetween(0.55, 0.85)
        });
      }
    }

    const alive: WindParticle[] = [];
    for (const wp of this.windParticles) {
      wp.life += dt;
      if (wp.life >= wp.maxLife) continue;
      wp.x += wp.vx * dt;
      wp.y += wp.vy * dt;
      const alpha = (1 - wp.life / wp.maxLife) * 0.58;
      this.windGraphics.fillStyle(0xfef08a, alpha);
      this.windGraphics.fillCircle(wp.x, wp.y, 3.2);
      alive.push(wp);
    }
    this.windParticles = alive;
  }

  // ===========================================================================
  // STAR COLLECTION, VICTORY SEQUENCE & ZERO-PUNISHMENT MISS HANDLING
  // ===========================================================================

  private collectStar(st: StarTarget): void {
    st.collected = true;
    this.starsCollectedCount = Math.min(3, this.starsCollectedCount + 1);
    this.audio.playStarCollect(st.index);

    Juice.burstStars(this, st.x, st.y, 16, [0xfef08a, 0xfde047, 0xfbbf24, 0xffffff]);
    this.tweens.add({
      targets: [st.sprite, st.glow],
      scaleX: st.sprite.scaleX * 1.4,
      scaleY: st.sprite.scaleY * 1.4,
      alpha: 0.18,
      duration: 240,
      ease: 'Back.easeOut'
    });

    this.updateStarHudVisuals();
  }

  private onMarbleCaughtInCart(m: ActiveMarble): void {
    this.lastCompletedTrail = [...m.trail, { x: this.cartX, y: CART_TRACK_Y - 10, bounced: true }];
    this.lastTrailColor = m.trailColor;
    this.lastTrailMissedPoint = null;

    if (this.activeMode === 'stars' && this.starsCollectedCount < 3) {
      // Caught in cart, but still need remaining Golden Stars — gentle encouragement!
      this.audio.playAlmostThud();
      this.pulseSprite(this.doggieSprite, 1.12, 0.9, 170);
      Juice.burstStars(this, this.cartX, CART_TRACK_Y - 24, 10, [0xfde047, 0x38bdf8]);
      return;
    }

    // Full Victory in Star Challenge Mode (3/3 Stars) OR joyful catch in Sandbox Mode!
    const isStarPuzzleVictory = this.activeMode === 'stars' && this.starsCollectedCount >= 3;
    this.audio.playCartCatch(isStarPuzzleVictory);

    this.doggieSprite.setTexture('doggie-cart-2');
    this.restoreBaseScale(this.doggieSprite);
    this.pulseSprite(this.doggieSprite, 1.18, 0.86, 220);

    Juice.burstStars(
      this,
      this.cartX,
      CART_TRACK_Y - 30,
      isStarPuzzleVictory ? 32 : 14,
      [0xfef08a, 0xfde047, 0x34d399, 0x38bdf8, 0xf472b6]
    );

    if (isStarPuzzleVictory && !this.isCelebratingVictory) {
      this.isCelebratingVictory = true;
      this.time.delayedCall(450, () => {
        this.audio.speakVictoryForActiveKid();
      });

      // Celebratory confetti cascade across the workshop
      for (let b = 0; b < 4; b++) {
        this.time.delayedCall(b * 320, () => {
          Juice.burstStars(
            this,
            Phaser.Math.Between(260, 1020),
            Phaser.Math.Between(160, 380),
            20,
            [0xfde047, 0x34d399, 0x38bdf8, 0xf472b6, 0xffffff]
          );
        });
      }

      this.time.delayedCall(3400, () => {
        if (this.scene.isActive()) {
          this.loadStarChallengePuzzle(this.puzzleIndex + 1, true);
        }
      });
    } else {
      this.time.delayedCall(900, () => {
        if (this.doggieSprite && this.doggieSprite.active && !this.isCelebratingVictory) {
          this.doggieSprite.setTexture('doggie-cart-1');
          this.restoreBaseScale(this.doggieSprite);
        }
      });
    }
  }

  private onMarbleMissedBottom(m: ActiveMarble): void {
    // Save the marble's Ghost Trail so the child can see where it rolled and adjust their ramps!
    this.lastCompletedTrail = [...m.trail];
    this.lastTrailColor = m.trailColor;
    const lastPt = m.trail[m.trail.length - 1] ?? { x: m.x, y: Math.min(m.y, 565) };
    this.lastTrailMissedPoint = { x: lastPt.x, y: Math.min(lastPt.y, 560) };

    // Zero punishment: gentle wooden settle sound + occasional supportive coaching prompt
    const allowVoice = !this.fountainActive && this.marbles.length <= 1;
    this.audio.playGentleMissSettle(allowVoice);
  }
}
