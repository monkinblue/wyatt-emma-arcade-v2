/**
 * src/scenes/TrainTableScene.ts
 * -----------------------------
 * Mentor Note: "Grandpa's Clockwork Train Table" — A Nintendo-polished (Captain Toad /
 * Brio Wooden Railway / Yoshi's Crafted World aesthetic) 32-bit Hi-Bit Pixel Art toy train
 * and miniature diorama world-builder for Wyatt (age 4) and Emma (age 3).
 *
 * Architectural Highlights:
 * 1. **Interactive Brio Track Piece Builder + Active Connector + Magic Finish Loop:**
 *    Kids can snap carved beechwood track pieces (`Straight`, `Curve Left`, `Curve Right`,
 *    `Xylophone`, `Bridge`, `Tunnel`, `Crossing Gate`) onto the glowing Active Track Connector
 *    with automatic tangent rotation, step backward with `[ Undo ]`, or close any open track
 *    into a complete circuit with `[ Magic Finish Loop ]` (plus 3 Classic Blueprint presets).
 * 2. **Free-Placement Living Scenery Toys on the Green Felt Table:**
 *    Scenery toys (`T-Rex`, `Pasture`, `Tower`, `Windmill`, `Forest`) can be dragged from the
 *    mahogany drawer and placed freely anywhere on the green felt table, repositioned at any
 *    time, or tapped to trigger their animations and sound effects.
 * 3. **Tangent-Aligned Consist & Top HUD Cab Cameo:**
 *    The active Engineer portrait (`Grandpa`, `Wyatt`, `Emma`, `Doggie`, `Sparky`) is displayed
 *    in the Top HUD Cab Cameo frame so the Crimson & Brass Steam Locomotive and its 3 tangent-aligned
 *    wooden cars (Red Hopper, Blue Gondola, Gold Coach) are 100% unobstructed on the rails.
 * 4. **Physical Sliding Brass Steam Throttle Lever (`STOP`, `1..5`):**
 *    The Brass T-handle physically slides along the quadrant slot in screen coordinates when
 *    dragged or tapped and snaps cleanly to the X coordinate of notches `STOP`, `1`, `2`, `3`, `4`, `5`.
 */

import Phaser from 'phaser';
import { ArcadeState } from '../core/ArcadeState';
import { Juice } from '../core/Juice';
import { TrainAudioEngine } from '../core/TrainAudioEngine';

type TrackBlueprintId = 'meadow' | 'gorge' | 'canyon';

type EngineerId = 'grandpa' | 'wyatt' | 'emma' | 'doggie' | 'sparky';

type CargoTypeId = 'logs' | 'barrels' | 'chests' | 'crates';

type TrackPieceKey =
  | 'track-straight'
  | 'track-curve-left'
  | 'track-curve-right'
  | 'mod-xylophone-track'
  | 'mod-royal-bridge'
  | 'mod-stone-tunnel'
  | 'mod-crossing-gate';

type SceneryToyKey =
  | 'prop-trex'
  | 'prop-unicorn-pasture'
  | 'prop-water-tower'
  | 'prop-windmill'
  | 'prop-pine-forest';

type DrawerToyKey = TrackPieceKey | SceneryToyKey;

interface SplineSample {
  x: number;
  y: number;
  dx: number;
  dy: number;
  dist: number;
}

interface PlacedTrackPiece {
  id: string;
  pieceKey: TrackPieceKey;
  startX: number;
  startY: number;
  startAngle: number;
  endX: number;
  endY: number;
  endAngle: number;
  midX: number;
  midY: number;
  midAngle: number;
  points: Array<{ x: number; y: number }>;
  lastTriggeredAt: number;
}

interface PlacedSceneryToy {
  id: string;
  toyKey: SceneryToyKey;
  x: number;
  y: number;
  scale: number;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  lastTriggeredAt: number;
}

interface BlueprintConfig {
  id: TrackBlueprintId;
  name: string;
  shortLabel: string;
  promptId: string;
  stationPos: { x: number; y: number };
  starterPieces: TrackPieceKey[];
  starterScenery: Array<{ toyKey: SceneryToyKey; x: number; y: number }>;
}

interface CargoOrderSpec {
  id: string;
  cargoType: CargoTypeId;
  name: string;
  singularName: string;
  spriteKey: string;
  targetCarIndex: number; // 0 = Red Car, 1 = Blue Car, 2 = Gold Car
  carColorLabel: string;
  carAccentHex: string;
  targetCount: number;
  orderPromptId: string;
  donePromptId: string;
}

const ENGINEER_SPECS: Array<{
  id: EngineerId;
  name: string;
  spriteKey: string;
  promptId: string;
  accentColor: number;
}> = [
  {
    id: 'grandpa',
    name: 'Grandpa',
    spriteKey: 'char-grandpa',
    promptId: 'engineer_grandpa',
    accentColor: 0x38bdf8
  },
  {
    id: 'wyatt',
    name: 'Wyatt',
    spriteKey: 'char-wyatt',
    promptId: 'engineer_wyatt',
    accentColor: 0x10b981
  },
  {
    id: 'emma',
    name: 'Emma',
    spriteKey: 'char-emma',
    promptId: 'engineer_emma',
    accentColor: 0xf472b6
  },
  {
    id: 'doggie',
    name: 'Doggie',
    spriteKey: 'char-doggie',
    promptId: 'engineer_doggie',
    accentColor: 0xfbbf24
  },
  {
    id: 'sparky',
    name: 'Sparky',
    spriteKey: 'char-sparky',
    promptId: 'engineer_sparky',
    accentColor: 0x34d399
  }
];

const TOY_DRAWER_ITEMS: Array<{
  toyKey: DrawerToyKey;
  kind: 'track' | 'scenery';
  title: string;
  shortLabel: string;
  badgeColor: number;
  promptId?: string;
}> = [
  {
    toyKey: 'track-straight',
    kind: 'track',
    title: 'Straight Track',
    shortLabel: 'Straight',
    badgeColor: 0xd97706
  },
  {
    toyKey: 'track-curve-left',
    kind: 'track',
    title: 'Curve Left Track',
    shortLabel: 'Curve L',
    badgeColor: 0xf59e0b
  },
  {
    toyKey: 'track-curve-right',
    kind: 'track',
    title: 'Curve Right Track',
    shortLabel: 'Curve R',
    badgeColor: 0xf59e0b
  },
  {
    toyKey: 'mod-xylophone-track',
    kind: 'track',
    title: 'Xylophone Track',
    shortLabel: 'Xylophone',
    badgeColor: 0xfbbf24,
    promptId: 'module_xylophone'
  },
  {
    toyKey: 'mod-royal-bridge',
    kind: 'track',
    title: 'Royal Gorge Bridge',
    shortLabel: 'Bridge',
    badgeColor: 0xef4444,
    promptId: 'module_bridge'
  },
  {
    toyKey: 'mod-stone-tunnel',
    kind: 'track',
    title: 'Echo Tunnel',
    shortLabel: 'Tunnel',
    badgeColor: 0x94a3b8,
    promptId: 'module_tunnel'
  },
  {
    toyKey: 'mod-crossing-gate',
    kind: 'track',
    title: 'Crossing Gate',
    shortLabel: 'Gate',
    badgeColor: 0xf87171,
    promptId: 'module_crossing'
  },
  {
    toyKey: 'prop-trex',
    kind: 'scenery',
    title: 'Friendly T-Rex',
    shortLabel: 'T-Rex',
    badgeColor: 0x22c55e
  },
  {
    toyKey: 'prop-unicorn-pasture',
    kind: 'scenery',
    title: 'Unicorn Pasture',
    shortLabel: 'Pasture',
    badgeColor: 0xf472b6
  },
  {
    toyKey: 'prop-water-tower',
    kind: 'scenery',
    title: 'Water Tower',
    shortLabel: 'Tower',
    badgeColor: 0x38bdf8
  },
  {
    toyKey: 'prop-windmill',
    kind: 'scenery',
    title: 'Spinning Windmill',
    shortLabel: 'Windmill',
    badgeColor: 0xf59e0b
  },
  {
    toyKey: 'prop-pine-forest',
    kind: 'scenery',
    title: 'Pine Forest',
    shortLabel: 'Forest',
    badgeColor: 0x10b981
  }
];

const CARGO_ORDERS: CargoOrderSpec[] = [
  {
    id: 'logs_3',
    cargoType: 'logs',
    name: 'Golden Logs',
    singularName: 'Golden Log',
    spriteKey: 'cargo-golden-log',
    targetCarIndex: 2,
    carColorLabel: 'GOLD CAR',
    carAccentHex: '#fbbf24',
    targetCount: 3,
    orderPromptId: 'order_logs_3',
    donePromptId: 'done_logs'
  },
  {
    id: 'barrels_2',
    cargoType: 'barrels',
    name: 'Strawberry Milk Barrels',
    singularName: 'Milk Barrel',
    spriteKey: 'cargo-milk-barrel',
    targetCarIndex: 0,
    carColorLabel: 'RED CAR',
    carAccentHex: '#f87171',
    targetCount: 2,
    orderPromptId: 'order_barrels_2',
    donePromptId: 'done_barrels'
  },
  {
    id: 'chests_3',
    cargoType: 'chests',
    name: 'Treasure Chests',
    singularName: 'Treasure Chest',
    spriteKey: 'cargo-treasure-chest',
    targetCarIndex: 2,
    carColorLabel: 'GOLD CAR',
    carAccentHex: '#fbbf24',
    targetCount: 3,
    orderPromptId: 'order_chests_3',
    donePromptId: 'done_chests'
  },
  {
    id: 'crates_4',
    cargoType: 'crates',
    name: 'Crystal Star Crates',
    singularName: 'Star Crate',
    spriteKey: 'cargo-star-crate',
    targetCarIndex: 1,
    carColorLabel: 'BLUE CAR',
    carAccentHex: '#38bdf8',
    targetCount: 4,
    orderPromptId: 'order_crates_4',
    donePromptId: 'done_crates'
  },
  {
    id: 'logs_4',
    cargoType: 'logs',
    name: 'Golden Logs',
    singularName: 'Golden Log',
    spriteKey: 'cargo-golden-log',
    targetCarIndex: 2,
    carColorLabel: 'GOLD CAR',
    carAccentHex: '#fbbf24',
    targetCount: 4,
    orderPromptId: 'order_logs_4',
    donePromptId: 'done_logs'
  },
  {
    id: 'barrels_5',
    cargoType: 'barrels',
    name: 'Strawberry Milk Barrels',
    singularName: 'Milk Barrel',
    spriteKey: 'cargo-milk-barrel',
    targetCarIndex: 0,
    carColorLabel: 'RED CAR',
    carAccentHex: '#f87171',
    targetCount: 5,
    orderPromptId: 'order_barrels_5',
    donePromptId: 'done_barrels'
  },
  {
    id: 'crates_3',
    cargoType: 'crates',
    name: 'Crystal Star Crates',
    singularName: 'Star Crate',
    spriteKey: 'cargo-star-crate',
    targetCarIndex: 1,
    carColorLabel: 'BLUE CAR',
    carAccentHex: '#38bdf8',
    targetCount: 3,
    orderPromptId: 'order_crates_3',
    donePromptId: 'done_crates'
  },
  {
    id: 'chests_2',
    cargoType: 'chests',
    name: 'Treasure Chests',
    singularName: 'Treasure Chest',
    spriteKey: 'cargo-treasure-chest',
    targetCarIndex: 2,
    carColorLabel: 'GOLD CAR',
    carAccentHex: '#fbbf24',
    targetCount: 2,
    orderPromptId: 'order_chests_2',
    donePromptId: 'done_chests'
  }
];

const TRACK_BLUEPRINTS: Record<TrackBlueprintId, BlueprintConfig> = {
  meadow: {
    id: 'meadow',
    name: 'Sunny Meadow Oval',
    shortLabel: '1. Meadow Oval',
    promptId: 'layout_meadow',
    stationPos: { x: 565, y: 406 },
    starterPieces: [
      'track-straight',
      'track-straight',
      'track-curve-right',
      'track-curve-right',
      'mod-xylophone-track',
      'track-curve-right',
      'track-curve-right',
      'mod-royal-bridge',
      'track-straight',
      'mod-stone-tunnel',
      'track-curve-right',
      'track-curve-right',
      'mod-crossing-gate'
    ],
    starterScenery: [
      { toyKey: 'prop-unicorn-pasture', x: 355, y: 315 },
      { toyKey: 'prop-trex', x: 755, y: 295 },
      { toyKey: 'prop-windmill', x: 1085, y: 270 },
      { toyKey: 'prop-pine-forest', x: 145, y: 185 },
      { toyKey: 'prop-water-tower', x: 325, y: 488 }
    ]
  },
  gorge: {
    id: 'gorge',
    name: 'Royal Gorge Bend',
    shortLabel: '2. Gorge Bend',
    promptId: 'layout_gorge',
    stationPos: { x: 565, y: 406 },
    starterPieces: [
      'track-straight',
      'track-curve-right',
      'track-curve-right',
      'mod-xylophone-track',
      'track-curve-right',
      'track-curve-left',
      'track-curve-right',
      'mod-royal-bridge',
      'track-curve-right',
      'mod-stone-tunnel',
      'track-curve-right',
      'mod-crossing-gate'
    ],
    starterScenery: [
      { toyKey: 'prop-trex', x: 790, y: 290 },
      { toyKey: 'prop-unicorn-pasture', x: 345, y: 325 },
      { toyKey: 'prop-water-tower', x: 305, y: 488 },
      { toyKey: 'prop-windmill', x: 1095, y: 275 },
      { toyKey: 'prop-pine-forest', x: 430, y: 155 }
    ]
  },
  canyon: {
    id: 'canyon',
    name: 'Winding Mountain Canyon',
    shortLabel: '3. Mountain Canyon',
    promptId: 'layout_canyon',
    stationPos: { x: 565, y: 406 },
    starterPieces: [
      'track-straight',
      'track-curve-right',
      'track-curve-right',
      'track-curve-left',
      'track-curve-right',
      'mod-xylophone-track',
      'track-curve-right',
      'mod-royal-bridge',
      'track-straight',
      'mod-stone-tunnel',
      'track-curve-right',
      'track-curve-right',
      'mod-crossing-gate'
    ],
    starterScenery: [
      { toyKey: 'prop-trex', x: 705, y: 320 },
      { toyKey: 'prop-unicorn-pasture', x: 425, y: 315 },
      { toyKey: 'prop-water-tower', x: 315, y: 488 },
      { toyKey: 'prop-windmill', x: 1100, y: 265 },
      { toyKey: 'prop-pine-forest', x: 145, y: 245 }
    ]
  }
};

const THROTTLE_NOTCH_BASE_X = 924;
const THROTTLE_NOTCH_STEP_X = 56;

export class TrainTableScene extends Phaser.Scene {
  private audio!: TrainAudioEngine;

  // World & UI layers (World layers zoom with camera follow; UI layers stay pinned to screen!)
  private worldRoot!: Phaser.GameObjects.Container;
  private trackGraphics!: Phaser.GameObjects.Graphics;
  private trackModulesContainer!: Phaser.GameObjects.Container;
  private activeConnectorContainer!: Phaser.GameObjects.Container;
  private sceneryContainer!: Phaser.GameObjects.Container;
  private stationContainer!: Phaser.GameObjects.Container;
  private trainConsistContainer!: Phaser.GameObjects.Container;
  private tunnelHoodContainer!: Phaser.GameObjects.Container;
  private worldFxContainer!: Phaser.GameObjects.Container;
  private uiRoot!: Phaser.GameObjects.Container;

  // Active Track Blueprint, Modular Track Pieces & Uniform Arc-Length Spline Table
  private currentBlueprintId: TrackBlueprintId = 'meadow';
  private placedTrackPieces: PlacedTrackPiece[] = [];
  private magicClosingPoints: Array<{ x: number; y: number }> = [];
  private isLoopClosed = true;
  private splineSamples: SplineSample[] = [];
  private totalTrackLength = 1800;

  // Track Module Visuals & Freely Placed Scenery Toys
  private trackModuleSprites: Map<
    string,
    { sprite: Phaser.GameObjects.Image; hoodSprite?: Phaser.GameObjects.Image }
  > = new Map();
  private placedSceneryToys: PlacedSceneryToy[] = [];
  private stationCraneArm: Phaser.GameObjects.Graphics | null = null;

  // Train Consist State (Locomotive + Red Car, Blue Car, Gold Car)
  private locoDist = 0;
  private shuttleDirection: 1 | -1 = 1;
  private throttleNotch = 2; // 0 = STOP, 1..5 = Speed Notches
  private currentSpeedPxPerSec = 110;
  private activeEngineer: EngineerId = 'wyatt';

  private locoContainer!: Phaser.GameObjects.Container;
  private locoSprite!: Phaser.GameObjects.Image;
  private locoHeadlightCone!: Phaser.GameObjects.Graphics;
  private carContainers: Phaser.GameObjects.Container[] = [];
  private carSprites: Phaser.GameObjects.Image[] = [];
  private carCargoContainers: Phaser.GameObjects.Container[] = [];

  // Top HUD Cab Cameo Portrait (moved off the locomotive so the engine & cars are 100% visible!)
  private hudCabCameoSprite!: Phaser.GameObjects.Image;
  private hudCabCameoNameText!: Phaser.GameObjects.Text;
  private hudEngineerRingMap: Map<EngineerId, Phaser.GameObjects.Graphics> = new Map();

  // Act 2: Grand Central Station Cargo & Passenger Loader State
  private isStoppingForStation = false;
  private isAtStationModalOpen = false;
  private stationOrderIndex = 0;
  private currentLoadedCount = 0;
  private stationModalContainer: Phaser.GameObjects.Container | null = null;
  private starsEarnedCount = 0;
  private starScoreLabel!: Phaser.GameObjects.Text;

  // Act 3: Engineer Controls & Camera Follow
  private isCameraFollow = false;
  private cameraFollowBtnBg!: Phaser.GameObjects.Graphics;
  private cameraFollowBtnText!: Phaser.GameObjects.Text;
  private blueprintBtnText!: Phaser.GameObjects.Text;
  private throttleHandle!: Phaser.GameObjects.Container;
  private throttleNotchLabels: Phaser.GameObjects.Text[] = [];
  private whistleCordContainer!: Phaser.GameObjects.Container;
  private whistleRopeGraphics!: Phaser.GameObjects.Graphics;
  private whistleTasselSprite!: Phaser.GameObjects.Image;
  private whistlePullOffset = 0;

  // Toy Drawer & Drag State
  private drawerContainer!: Phaser.GameObjects.Container;
  private drawerCardMap: Map<string, Phaser.GameObjects.Container> = new Map();
  private activeDragGhost: Phaser.GameObjects.Image | null = null;
  private activeDragToyKey: DrawerToyKey | null = null;
  private activeDragKind: 'track' | 'scenery' | null = null;

  // Xylophone & Tunnel Trigger Trackers
  private lastXyloBarPlayed = -1;
  private wasInsideTunnel = false;

  constructor() {
    super({ key: 'TrainTableScene' });
  }

  public create(): void {
    this.audio = new TrainAudioEngine();

    // Default engineer to the currently active kid profile in ArcadeState!
    const activeKid = ArcadeState.getActiveKid();
    this.activeEngineer = activeKid.id === 'emma' ? 'emma' : 'wyatt';
    this.throttleNotch = 2;
    this.shuttleDirection = 1;
    this.isCameraFollow = false;
    this.isStoppingForStation = false;
    this.isAtStationModalOpen = false;
    this.currentLoadedCount = 0;
    this.starsEarnedCount = 0;

    this.createProceduralTrackPieceTextures();
    this.createWorldLayers();
    this.createTrainConsist();
    this.buildTrackBlueprint('meadow', false);
    this.createFixedUILayer();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.audio.shutdown();
    });

    this.cameras.main.fadeIn(280, 10, 18, 12);

    // Speak calm welcome prompt if not already playing from HubScene launch
    this.time.delayedCall(220, () => {
      this.audio.speakPrompt('welcome_title');
    });
  }

  // ===========================================================================
  // PROCEDURAL 32-BIT BEECHWOOD TRACK PIECE TEXTURES (IN-MEMORY ONLY)
  // ===========================================================================

  /**
   * Mentor Note: We generate crisp in-memory textures for `track-straight`,
   * `track-curve-left`, and `track-curve-right` using Phaser's Graphics -> `generateTexture`
   * pipeline so kids have tactile Brio wooden track icons to drag and snap onto the
   * Active Track Connector without touching any files on disk.
   */
  private createProceduralTrackPieceTextures(): void {
    if (!this.textures.exists('track-straight')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // Beechwood straight plank + recessed rails + Brio jigsaw peg
      g.fillStyle(0x784416, 1);
      g.fillRoundedRect(10, 26, 88, 44, 8);
      g.fillStyle(0xdfb178, 1);
      g.fillRoundedRect(12, 28, 84, 38, 7);
      g.lineStyle(3, 0xb88148, 0.85);
      for (let x = 22; x <= 86; x += 16) {
        g.lineBetween(x, 31, x, 63);
      }
      g.fillStyle(0x855022, 1);
      g.fillRect(14, 35, 80, 5);
      g.fillRect(14, 54, 80, 5);
      // Jigsaw peg on right
      g.fillStyle(0xd29c60, 1);
      g.fillCircle(103, 47, 8);
      g.lineStyle(2, 0x6b3a12, 1);
      g.strokeCircle(103, 47, 8);
      g.generateTexture('track-straight', 116, 96);
      g.destroy();
    }

    const buildCurveTex = (key: string, flipY: boolean) => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ x: 0, y: 0 });
      const cy = flipY ? 84 : 12;
      const startA = flipY ? Phaser.Math.DegToRad(-85) : Phaser.Math.DegToRad(10);
      const endA = flipY ? Phaser.Math.DegToRad(-10) : Phaser.Math.DegToRad(85);

      g.lineStyle(38, 0x784416, 1);
      g.beginPath();
      g.arc(18, cy, 62, startA, endA, false);
      g.strokePath();

      g.lineStyle(31, 0xdfb178, 1);
      g.beginPath();
      g.arc(18, cy, 62, startA, endA, false);
      g.strokePath();

      g.lineStyle(4.5, 0x855022, 0.95);
      g.beginPath();
      g.arc(18, cy, 54, startA, endA, false);
      g.strokePath();
      g.beginPath();
      g.arc(18, cy, 70, startA, endA, false);
      g.strokePath();

      const pegX = 18 + Math.cos(endA) * 62;
      const pegY = cy + Math.sin(endA) * 62;
      g.fillStyle(0xd29c60, 1);
      g.fillCircle(pegX, pegY, 7);
      g.lineStyle(2, 0x6b3a12, 1);
      g.strokeCircle(pegX, pegY, 7);

      g.generateTexture(key, 116, 96);
      g.destroy();
    };

    buildCurveTex('track-curve-left', true);
    buildCurveTex('track-curve-right', false);
  }

  // ===========================================================================
  // WORLD LAYERS & HEIRLOOM FELT TRAIN TABLE
  // ===========================================================================

  private createWorldLayers(): void {
    this.worldRoot = this.add.container(0, 0).setDepth(1);

    if (this.textures.exists('train-table-bg')) {
      const bg = this.add
        .image(640, 360, 'train-table-bg')
        .setOrigin(0.5, 0.5)
        .setDisplaySize(1280, 720);
      this.worldRoot.add(bg);
    } else {
      const fallback = this.add.graphics();
      fallback.fillStyle(0x064e3b, 1);
      fallback.fillRect(0, 0, 1280, 720);
      this.worldRoot.add(fallback);
    }

    this.trackGraphics = this.add.graphics();
    this.trackModulesContainer = this.add.container(0, 0);
    this.activeConnectorContainer = this.add.container(0, 0);
    this.sceneryContainer = this.add.container(0, 0);
    this.stationContainer = this.add.container(0, 0);
    this.trainConsistContainer = this.add.container(0, 0);
    this.tunnelHoodContainer = this.add.container(0, 0);
    this.worldFxContainer = this.add.container(0, 0);

    this.worldRoot.add([
      this.trackGraphics,
      this.trackModulesContainer,
      this.activeConnectorContainer,
      this.sceneryContainer,
      this.stationContainer,
      this.trainConsistContainer,
      this.tunnelHoodContainer,
      this.worldFxContainer
    ]);
  }

  // ===========================================================================
  // MODULAR BRIO TRACK BUILDER, ACTIVE CONNECTOR & MAGIC FINISH LOOP
  // ===========================================================================

  private buildTrackBlueprint(blueprintId: TrackBlueprintId, announceVoice = true): void {
    this.currentBlueprintId = blueprintId;
    const bp = TRACK_BLUEPRINTS[blueprintId];

    // 1. Reset track pieces to the blueprint's starter modular sequence
    this.placedTrackPieces = [];
    this.createStarterStationPiece();
    for (const pieceKey of bp.starterPieces) {
      this.appendTrackPieceInternal(pieceKey);
    }

    // 2. Complete the loop smoothly back to Grandpa's Train Depot
    this.isLoopClosed = true;
    this.rebuildTrackSplineAndVisuals();

    // 3. Render Grandpa's Wooden Train Depot beside the southern straightaway
    this.renderGrandpasTrainDepot(bp);

    // 4. Populate initial free-placement Scenery Toys on the green felt table
    this.clearAllSceneryToys();
    for (const sc of bp.starterScenery) {
      this.placeSceneryToyOnFelt(sc.toyKey, sc.x, sc.y, false);
    }

    // Place locomotive departing the station
    this.locoDist = 60;
    this.shuttleDirection = 1;
    this.updateTrainConsistPositions();

    if (this.blueprintBtnText) {
      this.blueprintBtnText.setText(`🗺️ ${bp.shortLabel}`);
    }

    if (announceVoice) {
      this.audio.playWoodTrackSnap();
      this.audio.speakPrompt(bp.promptId);
      Juice.burstStars(this, 640, 310, 18, [0xfef08a, 0xfbbf24, 0x34d399]);
    }
  }

  /**
   * Creates the anchor Brio straight track piece in front of Grandpa's Wooden Train Depot.
   */
  private createStarterStationPiece(): void {
    const startX = 635;
    const startY = 474;
    const endX = 505;
    const endY = 474;
    const angle = Math.PI; // Heading West along the southern straightaway
    const points: Array<{ x: number; y: number }> = [];
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push({
        x: Phaser.Math.Linear(startX, endX, t),
        y: Phaser.Math.Linear(startY, endY, t)
      });
    }
    this.placedTrackPieces.push({
      id: 'piece-0-station',
      pieceKey: 'track-straight',
      startX,
      startY,
      startAngle: angle,
      endX,
      endY,
      endAngle: angle,
      midX: (startX + endX) * 0.5,
      midY: (startY + endY) * 0.5,
      midAngle: angle,
      points,
      lastTriggeredAt: 0
    });
  }

  public getActiveTrackConnector(): { x: number; y: number; angle: number } {
    const tail = this.placedTrackPieces[this.placedTrackPieces.length - 1];
    if (!tail) {
      return { x: 505, y: 474, angle: Math.PI };
    }
    return { x: tail.endX, y: tail.endY, angle: tail.endAngle };
  }

  /**
   * Computes the geometry for a newly snapped Track Piece (`Straight`, `Curve Left`, `Curve Right`,
   * `Xylophone`, `Bridge`, `Tunnel`, `Crossing Gate`) with automatic tangent rotation from the
   * Active Track Connector, gently steering inside the green felt table boundaries if needed.
   */
  private appendTrackPieceInternal(pieceKey: TrackPieceKey): PlacedTrackPiece {
    const conn = this.getActiveTrackConnector();
    const startX = conn.x;
    const startY = conn.y;
    let startAngle = conn.angle;

    // Gentle playfield boundary assist so kids can never accidentally build off the felt table
    const marginLeft = 175;
    const marginRight = 1095;
    const marginTop = 148;
    const marginBottom = 486;
    const testX = startX + Math.cos(startAngle) * 115;
    const testY = startY + Math.sin(startAngle) * 115;

    let deltaAngle = 0;
    if (pieceKey === 'track-curve-left') {
      deltaAngle = -Math.PI / 4; // -45 deg left turn
    } else if (pieceKey === 'track-curve-right') {
      deltaAngle = Math.PI / 4; // +45 deg right turn
    }

    // If a piece would exit the felt table bounds, auto-curve inward toward the table center
    if (testX < marginLeft || testX > marginRight || testY < marginTop || testY > marginBottom) {
      const toCenterAngle = Math.atan2(315 - startY, 640 - startX);
      const angleDiff = Phaser.Math.Angle.Wrap(toCenterAngle - startAngle);
      if (deltaAngle === 0) {
        startAngle = Phaser.Math.Angle.Wrap(startAngle + Phaser.Math.Clamp(angleDiff, -0.55, 0.55));
      } else if (angleDiff * deltaAngle < 0) {
        deltaAngle = Phaser.Math.Clamp(angleDiff, -Math.PI / 3, Math.PI / 3);
      }
    }

    const segLength =
      pieceKey === 'mod-royal-bridge' || pieceKey === 'mod-stone-tunnel' ? 128 : 114;
    const steps = 14;
    const points: Array<{ x: number; y: number }> = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = startAngle + deltaAngle * 0.5 * t;
      const dist = segLength * t;
      const px = Phaser.Math.Clamp(startX + Math.cos(a) * dist, 130, 1135);
      const py = Phaser.Math.Clamp(startY + Math.sin(a) * dist, 128, 495);
      points.push({ x: px, y: py });
    }

    const endPt = points[points.length - 1];
    const midPt = points[Math.floor(points.length / 2)];
    const endAngle = Phaser.Math.Angle.Wrap(startAngle + deltaAngle);
    const midAngle = Phaser.Math.Angle.Wrap(startAngle + deltaAngle * 0.5);

    const piece: PlacedTrackPiece = {
      id: `piece-${this.placedTrackPieces.length}-${Date.now()}`,
      pieceKey,
      startX,
      startY,
      startAngle,
      endX: endPt.x,
      endY: endPt.y,
      endAngle,
      midX: midPt.x,
      midY: midPt.y,
      midAngle,
      points,
      lastTriggeredAt: 0
    };

    this.placedTrackPieces.push(piece);
    return piece;
  }

  /**
   * Snaps a Track Piece (`Straight`, `Curve Left/Right`, `Xylophone`, `Bridge`, `Tunnel`,
   * `Crossing Gate`) onto the Active Track Connector with auto-rotation!
   */
  private snapTrackPieceToActiveConnector(
    pieceKey: TrackPieceKey,
    speakConfirmation = true
  ): void {
    // If the loop was previously auto-closed and the user already has a full blueprint,
    // snapping a new piece opens the active builder head (or trims if > 16 pieces) so they
    // can visibly see each piece extend the Active Track Connector!
    if (this.isLoopClosed && this.placedTrackPieces.length >= 13) {
      this.placedTrackPieces.splice(8);
    }

    const newPiece = this.appendTrackPieceInternal(pieceKey);

    // Check if the new piece naturally reached Grandpa's Station origin
    const origin = this.placedTrackPieces[0];
    const distToStart = Math.hypot(newPiece.endX - origin.startX, newPiece.endY - origin.startY);
    this.isLoopClosed = this.placedTrackPieces.length >= 5 && distToStart < 105;

    this.rebuildTrackSplineAndVisuals();

    // Audio & Starburst feedback at the newly snapped piece
    this.audio.playWoodTrackSnap();
    Juice.burstStars(this, newPiece.midX, newPiece.midY, 16, [0xfef08a, 0xfbbf24, 0x34d399]);

    const label =
      TOY_DRAWER_ITEMS.find((d) => d.toyKey === pieceKey)?.shortLabel ?? 'Track';
    Juice.popFloatingLabel(
      this,
      newPiece.midX,
      newPiece.midY - 26,
      `✨ ${label.toUpperCase()} SNAPPED!`,
      '#fef08a'
    );

    const drawerSpec = TOY_DRAWER_ITEMS.find((d) => d.toyKey === pieceKey);
    if (speakConfirmation && drawerSpec?.promptId) {
      this.audio.speakPrompt(drawerSpec.promptId);
    }
  }

  /**
   * `[ ↩ Undo ]` Button Handler:
   * Removes the last placed track piece (or opens a magic-finished loop) and moves the
   * glowing Active Track Connector back to the previous piece's end.
   */
  private undoLastTrackPiece(): void {
    if (this.isLoopClosed && this.placedTrackPieces.length > 2) {
      this.isLoopClosed = false;
      this.placedTrackPieces.pop();
    } else if (this.placedTrackPieces.length > 1) {
      this.placedTrackPieces.pop();
      this.isLoopClosed = false;
    } else {
      // Always keep at least the starter Station platform piece
      this.isLoopClosed = false;
    }

    this.rebuildTrackSplineAndVisuals();
    const conn = this.getActiveTrackConnector();
    this.audio.playWoodTrackSnap();
    Juice.burstStars(this, conn.x, conn.y, 10, [0xfef08a, 0xf87171]);
    Juice.popFloatingLabel(this, conn.x, conn.y - 26, '↩ UNDO TRACK', '#fef08a');
  }

  /**
   * `[ ✨ Magic Finish Loop ]` Button Handler:
   * Smoothly completes the track loop from the Active Track Connector back to Grandpa's
   * Station Depot so the train can chug continuously around the circuit!
   */
  private magicFinishTrackLoop(): void {
    // Ensure there are enough pieces to form a roomy loop before closing
    while (this.placedTrackPieces.length < 6) {
      this.appendTrackPieceInternal('track-curve-right');
    }

    this.isLoopClosed = true;
    this.rebuildTrackSplineAndVisuals();

    this.audio.playWoodTrackSnap();
    this.audio.playSteamWhistle(false);
    this.spawnLocomotiveSteamPuff(true);
    Juice.burstStars(this, 640, 310, 24, [0xfef08a, 0xfbbf24, 0x34d399, 0x38bdf8]);
    Juice.popFloatingLabel(this, 640, 290, '✨ MAGIC LOOP COMPLETE!', '#fef08a');

    if (this.throttleNotch === 0) {
      this.setThrottleNotch(2, false);
    }
  }

  /**
   * Rebuilds the uniform arc-length lookup table (`this.splineSamples`), redraws the carved
   * beechwood Brio track, renders all snapped special track modules with auto-rotation, and
   * updates the glowing Active Track Connector.
   */
  private rebuildTrackSplineAndVisuals(): void {
    const rawChain: Array<{ x: number; y: number }> = [];
    for (let pIdx = 0; pIdx < this.placedTrackPieces.length; pIdx++) {
      const piece = this.placedTrackPieces[pIdx];
      for (let i = 0; i < piece.points.length; i++) {
        if (pIdx > 0 && i === 0) continue;
        rawChain.push(piece.points[i]);
      }
    }

    this.magicClosingPoints = [];
    if (this.isLoopClosed && this.placedTrackPieces.length > 0) {
      const first = this.placedTrackPieces[0];
      const last = this.placedTrackPieces[this.placedTrackPieces.length - 1];
      const distGap = Math.hypot(first.startX - last.endX, first.startY - last.endY);

      if (distGap > 18) {
        // Build a smooth cubic Hermite bridge from Active Connector back to Station start
        const tangentScale = Math.max(120, distGap * 0.65);
        const p0x = last.endX;
        const p0y = last.endY;
        const m0x = Math.cos(last.endAngle) * tangentScale;
        const m0y = Math.sin(last.endAngle) * tangentScale;

        const p1x = first.startX;
        const p1y = first.startY;
        const m1x = Math.cos(first.startAngle) * tangentScale;
        const m1y = Math.sin(first.startAngle) * tangentScale;

        const bridgeSteps = Math.max(16, Math.ceil(distGap / 18));
        for (let s = 1; s <= bridgeSteps; s++) {
          const t = s / bridgeSteps;
          const t2 = t * t;
          const t3 = t2 * t;
          const h00 = 2 * t3 - 3 * t2 + 1;
          const h10 = t3 - 2 * t2 + t;
          const h01 = -2 * t3 + 3 * t2;
          const h11 = t3 - t2;

          const bx = Phaser.Math.Clamp(
            h00 * p0x + h10 * m0x + h01 * p1x + h11 * m1x,
            125,
            1140
          );
          const by = Phaser.Math.Clamp(
            h00 * p0y + h10 * m0y + h01 * p1y + h11 * m1y,
            125,
            495
          );
          this.magicClosingPoints.push({ x: bx, y: by });
          rawChain.push({ x: bx, y: by });
        }
      }
    }

    this.computeUniformPolylineTable(rawChain, 1000, this.isLoopClosed);
    this.renderCarvedBeechwoodTrack();
    this.renderPlacedTrackModules();
    this.renderActiveTrackConnector();
  }

  private computeUniformPolylineTable(
    pts: Array<{ x: number; y: number }>,
    numUniformSamples: number,
    closed: boolean
  ): void {
    if (pts.length < 2) return;
    const rawPts: Array<{ x: number; y: number; cumDist: number }> = [];
    let accum = 0;
    rawPts.push({ x: pts[0].x, y: pts[0].y, cumDist: 0 });

    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      if (d < 0.5) continue;
      accum += d;
      rawPts.push({ x: pts[i].x, y: pts[i].y, cumDist: accum });
    }

    if (closed && rawPts.length > 2) {
      const first = rawPts[0];
      const last = rawPts[rawPts.length - 1];
      const closeD = Math.hypot(first.x - last.x, first.y - last.y);
      if (closeD > 1) {
        accum += closeD;
        rawPts.push({ x: first.x, y: first.y, cumDist: accum });
      }
    }

    this.totalTrackLength = Math.max(120, accum);
    this.splineSamples = [];

    let rawIdx = 0;
    for (let k = 0; k < numUniformSamples; k++) {
      const targetD = (k / numUniformSamples) * this.totalTrackLength;
      while (rawIdx < rawPts.length - 2 && rawPts[rawIdx + 1].cumDist < targetD) {
        rawIdx++;
      }
      const a = rawPts[rawIdx];
      const b = rawPts[rawIdx + 1] ?? a;
      const span = Math.max(0.0001, b.cumDist - a.cumDist);
      const frac = Phaser.Math.Clamp((targetD - a.cumDist) / span, 0, 1);
      const x = Phaser.Math.Linear(a.x, b.x, frac);
      const y = Phaser.Math.Linear(a.y, b.y, frac);
      this.splineSamples.push({ x, y, dx: -1, dy: 0, dist: targetD });
    }

    // Compute smooth unit tangent vectors `(dx, dy)`
    const m = this.splineSamples.length;
    for (let k = 0; k < m; k++) {
      const prevIdx = closed ? (k - 4 + m) % m : Math.max(0, k - 4);
      const nextIdx = closed ? (k + 4) % m : Math.min(m - 1, k + 4);
      const prevS = this.splineSamples[prevIdx];
      const nextS = this.splineSamples[nextIdx];
      const vx = nextS.x - prevS.x;
      const vy = nextS.y - prevS.y;
      const len = Math.max(0.0001, Math.hypot(vx, vy));
      this.splineSamples[k].dx = vx / len;
      this.splineSamples[k].dy = vy / len;
    }
  }

  private sampleSplineAtDist(dist: number): SplineSample {
    const m = this.splineSamples.length;
    if (m === 0) return { x: 560, y: 474, dx: -1, dy: 0, dist: 0 };

    const wrapped = this.isLoopClosed
      ? ((dist % this.totalTrackLength) + this.totalTrackLength) % this.totalTrackLength
      : Phaser.Math.Clamp(dist, 0, this.totalTrackLength);

    const fIdx = (wrapped / this.totalTrackLength) * (m - 1);
    const i0 = Math.floor(fIdx) % m;
    const i1 = this.isLoopClosed ? (i0 + 1) % m : Math.min(m - 1, i0 + 1);
    const frac = fIdx - Math.floor(fIdx);
    const s0 = this.splineSamples[i0];
    const s1 = this.splineSamples[i1];
    return {
      x: Phaser.Math.Linear(s0.x, s1.x, frac),
      y: Phaser.Math.Linear(s0.y, s1.y, frac),
      dx: Phaser.Math.Linear(s0.dx, s1.dx, frac),
      dy: Phaser.Math.Linear(s0.dy, s1.dy, frac),
      dist: wrapped
    };
  }

  /**
   * Renders a tactile carved beechwood Brio railway track along `this.splineSamples`:
   * - Soft tabletop drop shadow
   * - Beveled mahogany edge & sanded golden beechwood deck
   * - Carved cross-ties & recessed dual wheel grooves
   * - Classic Brio rounded jigsaw puzzle connectors at every piece joint
   */
  private renderCarvedBeechwoodTrack(): void {
    const g = this.trackGraphics;
    g.clear();

    const m = this.splineSamples.length;
    if (m < 4) return;

    // 1. Soft dark contact shadow on the green felt
    g.lineStyle(42, 0x041f14, 0.48);
    g.beginPath();
    for (let i = 0; i < m; i += 3) {
      const s = this.splineSamples[i];
      if (i === 0) g.moveTo(s.x + 3, s.y + 6);
      else g.lineTo(s.x + 3, s.y + 6);
    }
    if (this.isLoopClosed) g.closePath();
    g.strokePath();

    // 2. Dark walnut beveled roadbed rim
    g.lineStyle(36, 0x784416, 1);
    g.beginPath();
    for (let i = 0; i < m; i += 2) {
      const s = this.splineSamples[i];
      if (i === 0) g.moveTo(s.x, s.y + 2);
      else g.lineTo(s.x, s.y + 2);
    }
    if (this.isLoopClosed) g.closePath();
    g.strokePath();

    // 3. Warm sanded beechwood top plank
    g.lineStyle(30, 0xdfb178, 1);
    g.beginPath();
    for (let i = 0; i < m; i += 2) {
      const s = this.splineSamples[i];
      if (i === 0) g.moveTo(s.x, s.y);
      else g.lineTo(s.x, s.y);
    }
    if (this.isLoopClosed) g.closePath();
    g.strokePath();

    // 4. Carved wooden cross-ties every 20px
    const tieStep = Math.max(1, Math.floor((20 / this.totalTrackLength) * m));
    g.lineStyle(3, 0xb88148, 0.65);
    for (let i = 0; i < m; i += tieStep) {
      const s = this.splineSamples[i];
      const nx = -s.dy;
      const ny = s.dx;
      g.beginPath();
      g.moveTo(s.x - nx * 13, s.y - ny * 13);
      g.lineTo(s.x + nx * 13, s.y + ny * 13);
      g.strokePath();
    }

    // 5. Twin recessed Brio wheel grooves (+/- 8.5px normal offset)
    for (const offset of [-8.5, 8.5]) {
      g.lineStyle(4.5, 0x855022, 0.95);
      g.beginPath();
      for (let i = 0; i < m; i += 2) {
        const s = this.splineSamples[i];
        const rx = s.x - s.dy * offset;
        const ry = s.y + s.dx * offset;
        if (i === 0) g.moveTo(rx, ry);
        else g.lineTo(rx, ry);
      }
      if (this.isLoopClosed) g.closePath();
      g.strokePath();

      // Specular rail highlight
      g.lineStyle(1.4, 0xfef3c7, 0.52);
      g.beginPath();
      for (let i = 0; i < m; i += 3) {
        const s = this.splineSamples[i];
        const rx = s.x - s.dy * (offset - 1.2);
        const ry = s.y + s.dx * (offset - 1.2);
        if (i === 0) g.moveTo(rx, ry);
        else g.lineTo(rx, ry);
      }
      if (this.isLoopClosed) g.closePath();
      g.strokePath();
    }

    // 6. Classic Brio rounded jigsaw joint lines & pegs at every placed piece boundary
    for (const piece of this.placedTrackPieces) {
      const nx = -Math.sin(piece.endAngle);
      const ny = Math.cos(piece.endAngle);
      g.lineStyle(2.2, 0x6b3a12, 0.9);
      g.beginPath();
      g.moveTo(piece.endX - nx * 15, piece.endY - ny * 15);
      g.lineTo(piece.endX + nx * 15, piece.endY + ny * 15);
      g.strokePath();

      const pegX = piece.endX + Math.cos(piece.endAngle) * 7;
      const pegY = piece.endY + Math.sin(piece.endAngle) * 7;
      g.fillStyle(0xd29c60, 1);
      g.fillCircle(pegX, pegY, 4.8);
      g.lineStyle(1.8, 0x6b3a12, 0.95);
      g.strokeCircle(pegX, pegY, 4.8);
    }
  }

  /**
   * Renders any special track modules (`Xylophone`, `Bridge`, `Tunnel`, `Crossing Gate`)
   * snapped into `this.placedTrackPieces` with automatic tangent rotation.
   */
  private renderPlacedTrackModules(): void {
    this.trackModulesContainer.removeAll(true);
    this.tunnelHoodContainer.removeAll(true);
    this.trackModuleSprites.clear();

    for (const piece of this.placedTrackPieces) {
      if (
        piece.pieceKey === 'track-straight' ||
        piece.pieceKey === 'track-curve-left' ||
        piece.pieceKey === 'track-curve-right'
      ) {
        continue;
      }

      if (!this.textures.exists(piece.pieceKey)) continue;
      this.textures.get(piece.pieceKey).setFilter(Phaser.Textures.FilterMode.NEAREST);

      const cont = this.add.container(piece.midX, piece.midY);
      const sh = this.add.graphics();
      sh.fillStyle(0x041b11, 0.45);
      sh.fillEllipse(0, 10, 115, 34);
      cont.add(sh);

      // Compute auto-rotation angle aligned with the piece's track tangent
      const dx = Math.cos(piece.midAngle);
      const dy = Math.sin(piece.midAngle);
      const slopeDeg = Phaser.Math.Clamp(
        Phaser.Math.RadToDeg(Math.atan2(dy, Math.max(0.2, Math.abs(dx)))),
        -28,
        28
      );

      let scale = 0.58;
      let autoRotDeg = slopeDeg * (dx >= 0 ? 1 : -1);
      if (piece.pieceKey === 'mod-xylophone-track') {
        scale = 0.56;
        // Compensate for the xylophone sprite's isometric diagonal so it sits flush on the rails
        autoRotDeg = -24 + slopeDeg * 0.7;
      } else if (piece.pieceKey === 'mod-royal-bridge') {
        scale = 0.62;
        autoRotDeg = 22 + slopeDeg * 0.55;
      } else if (piece.pieceKey === 'mod-stone-tunnel') {
        scale = 0.68;
        autoRotDeg = Phaser.Math.Clamp(slopeDeg * 0.35, -12, 12);
      } else if (piece.pieceKey === 'mod-crossing-gate') {
        scale = 0.58;
        autoRotDeg = Phaser.Math.Clamp(slopeDeg * 0.35, -12, 12);
      }

      const spr = this.add
        .image(0, 0, piece.pieceKey)
        .setOrigin(0.5, 0.58)
        .setScale(scale)
        .setAngle(autoRotDeg);
      cont.add(spr);

      let hoodSprite: Phaser.GameObjects.Image | undefined;
      if (piece.pieceKey === 'mod-stone-tunnel') {
        hoodSprite = this.add
          .image(piece.midX, piece.midY - 6, 'mod-stone-tunnel')
          .setOrigin(0.5, 0.58)
          .setScale(scale * 1.02)
          .setAngle(autoRotDeg)
          .setAlpha(0.92);
        this.tunnelHoodContainer.add(hoodSprite);
      }

      const hit = this.add
        .zone(0, 0, 88, 88)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        this.triggerTrackModuleGag(piece, true);
      });
      cont.add(hit);

      this.trackModulesContainer.add(cont);
      this.trackModuleSprites.set(piece.id, { sprite: spr, hoodSprite });
    }
  }

  /**
   * Renders the glowing Golden Brio Jigsaw Connector at the end of the last placed track piece
   * so kids can see exactly where the next track piece will snap and auto-rotate!
   */
  private renderActiveTrackConnector(): void {
    this.activeConnectorContainer.removeAll(true);
    const conn = this.getActiveTrackConnector();

    const badgeCont = this.add.container(conn.x, conn.y);
    const ringG = this.add.graphics();

    const ringColor = this.isLoopClosed ? 0xfbbf24 : 0x34d399;
    ringG.fillStyle(0x064e3b, 0.65);
    ringG.fillCircle(0, 0, 30);

    const segments = 10;
    ringG.lineStyle(3.5, ringColor, 0.98);
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = a0 + (Math.PI * 2) / (segments * 1.7);
      ringG.beginPath();
      ringG.arc(0, 0, 30, a0, a1, false);
      ringG.strokePath();
    }

    // Directional arrow showing the auto-rotation tangent direction
    const arrowX = Math.cos(conn.angle) * 16;
    const arrowY = Math.sin(conn.angle) * 16;
    ringG.fillStyle(0xfef08a, 1);
    ringG.fillCircle(arrowX, arrowY, 6);

    const lbl = this.add
      .text(0, -38, this.isLoopClosed ? '✨ SNAP TRACK' : '✨ NEXT TRACK', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#1e1b4b',
        strokeThickness: 3
      })
      .setOrigin(0.5);

    badgeCont.add([ringG, lbl]);

    // Tapping the Active Track Connector directly snaps a Straight/Curve track piece!
    const hit = this.add
      .zone(0, 0, 76, 76)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      this.snapTrackPieceToActiveConnector('track-curve-right', true);
    });
    badgeCont.add(hit);

    this.tweens.add({
      targets: badgeCont,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 750,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.activeConnectorContainer.add(badgeCont);
  }

  // ===========================================================================
  // FREE-PLACEMENT SCENERY TOYS ON THE GREEN FELT TABLE
  // ===========================================================================

  private clearAllSceneryToys(): void {
    this.sceneryContainer.removeAll(true);
    this.placedSceneryToys = [];
  }

  /**
   * Places a Scenery Toy (`T-Rex`, `Pasture`, `Tower`, `Windmill`, `Forest`) freely at any
   * `(worldX, worldY)` coordinate on the green felt table, and makes it draggable so kids
   * can reposition it anywhere on the felt at any time!
   */
  private placeSceneryToyOnFelt(
    toyKey: SceneryToyKey,
    worldX: number,
    worldY: number,
    celebrate = true
  ): PlacedSceneryToy | null {
    if (!this.textures.exists(toyKey)) return null;
    this.textures.get(toyKey).setFilter(Phaser.Textures.FilterMode.NEAREST);

    const clampedX = Phaser.Math.Clamp(worldX, 95, 1185);
    const clampedY = Phaser.Math.Clamp(worldY, 95, 525);
    const baseScale = 0.58;

    const cont = this.add.container(clampedX, clampedY);

    const sh = this.add.graphics();
    sh.fillStyle(0x041b11, 0.45);
    sh.fillEllipse(0, 12, 110, 32);
    cont.add(sh);

    const spr = this.add
      .image(0, 0, toyKey)
      .setOrigin(0.5, 0.58)
      .setScale(baseScale);
    cont.add(spr);

    const placedRecord: PlacedSceneryToy = {
      id: `scenery-${toyKey}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      toyKey,
      x: clampedX,
      y: clampedY,
      scale: baseScale,
      container: cont,
      sprite: spr,
      lastTriggeredAt: 0
    };

    // Hit zone is both tappable (triggers gag) AND freely draggable anywhere on the green felt table!
    const hit = this.add
      .zone(0, 0, 92, 92)
      .setOrigin(0.5)
      .setInteractive({ draggable: true, useHandCursor: true });
    cont.add(hit);

    let dragDist = 0;
    hit.on('dragstart', () => {
      dragDist = 0;
      cont.setDepth(50);
      spr.setScale(baseScale * 1.12);
    });

    hit.on('drag', (pointer: Phaser.Input.Pointer) => {
      dragDist += Math.hypot(pointer.velocity.x, pointer.velocity.y) + 3;
      const pt = this.screenToWorld(pointer.x, pointer.y);
      const nx = Phaser.Math.Clamp(pt.x, 90, 1190);
      const ny = Phaser.Math.Clamp(pt.y, 90, 560);
      cont.setPosition(nx, ny);
      placedRecord.x = nx;
      placedRecord.y = ny;
    });

    hit.on('dragend', (pointer: Phaser.Input.Pointer) => {
      cont.setDepth(1);
      spr.setScale(baseScale);

      // If dragged down into the bottom mahogany drawer (`pointer.y > 578`), remove from table
      if (pointer.y > 578 && dragDist > 24) {
        const idx = this.placedSceneryToys.indexOf(placedRecord);
        if (idx >= 0) this.placedSceneryToys.splice(idx, 1);
        cont.destroy(true);
        this.audio.playWoodTrackSnap();
        return;
      }

      if (dragDist < 18) {
        this.triggerSceneryToyGag(placedRecord, true);
      } else {
        this.audio.playWoodTrackSnap();
        Juice.burstStars(this, placedRecord.x, placedRecord.y - 10, 10, [
          0xfef08a,
          0x34d399
        ]);
        this.triggerSceneryToyGag(placedRecord, true);
      }
    });

    this.sceneryContainer.add(cont);
    this.placedSceneryToys.push(placedRecord);

    if (celebrate) {
      this.audio.playWoodTrackSnap();
      Juice.burstStars(this, clampedX, clampedY - 12, 16, [0xfef08a, 0xfbbf24, 0x34d399]);
      spr.setScale(baseScale * 1.24, baseScale * 0.82);
      this.tweens.add({
        targets: spr,
        scaleX: baseScale,
        scaleY: baseScale,
        duration: 260,
        ease: 'Elastic.easeOut'
      });
      this.triggerSceneryToyGag(placedRecord, true);
    }

    return placedRecord;
  }

  private screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const scale = this.worldRoot ? this.worldRoot.scaleX || 1 : 1;
    const wx = (screenX - (this.worldRoot?.x ?? 0)) / scale;
    const wy = (screenY - (this.worldRoot?.y ?? 0)) / scale;
    return { x: wx, y: wy };
  }

  // ===========================================================================
  // GRANDPA'S WOODEN TRAIN DEPOT & CRANE
  // ===========================================================================

  private renderGrandpasTrainDepot(bp: BlueprintConfig): void {
    this.stationContainer.removeAll(true);

    const sx = bp.stationPos.x;
    const sy = bp.stationPos.y;

    // Soft drop shadow on the felt
    const shadow = this.add.graphics();
    shadow.fillStyle(0x041b11, 0.55);
    shadow.fillEllipse(sx, sy + 16, 210, 56);
    this.stationContainer.add(shadow);

    // Station Depot Sprite (`prop-station-depot`)
    if (this.textures.exists('prop-station-depot')) {
      this.textures.get('prop-station-depot').setFilter(Phaser.Textures.FilterMode.NEAREST);
      const depotImg = this.add
        .image(sx, sy - 10, 'prop-station-depot')
        .setOrigin(0.5, 0.65)
        .setScale(0.68)
        .setInteractive({ useHandCursor: true });

      depotImg.on('pointerdown', () => {
        Juice.squashAndStretch(this, depotImg, 0.14, 130);
        this.requestStopAtStation();
      });

      this.stationContainer.add(depotImg);
    }

    // Swinging Wooden Crane Arm Graphic next to the station roof for Act 2 Cargo Loading
    this.stationCraneArm = this.add.graphics();
    this.drawStationCraneArm(sx + 68, sy - 24, sx + 88, sy + 28);
    this.stationContainer.add(this.stationCraneArm);

    // Interactive Glowing Station Bell & "LOAD CARGO" Callout Badge above the depot
    const bellBadge = this.add.container(sx, sy - 108);
    const badgeG = this.add.graphics();
    badgeG.fillStyle(0x271206, 0.94);
    badgeG.fillRoundedRect(-88, -20, 176, 40, 14);
    badgeG.lineStyle(2.5, 0xfbbf24, 1);
    badgeG.strokeRoundedRect(-88, -20, 176, 40, 14);

    const bellTxt = this.add
      .text(0, 0, '🔔 STATION CARGO', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);

    bellBadge.add([badgeG, bellTxt]);
    this.stationContainer.add(bellBadge);

    this.tweens.add({
      targets: bellBadge,
      y: sy - 114,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    Juice.makeTactileButton(
      this,
      bellBadge,
      180,
      64,
      () => {
        this.requestStopAtStation();
      },
      'chime'
    );
  }

  private drawStationCraneArm(baseX: number, baseY: number, hookX: number, hookY: number): void {
    if (!this.stationCraneArm) return;
    const g = this.stationCraneArm;
    g.clear();
    g.lineStyle(6, 0x92400e, 1);
    g.beginPath();
    g.moveTo(baseX, baseY);
    g.lineTo(hookX, hookY - 22);
    g.strokePath();

    g.lineStyle(2.5, 0xfbbf24, 1);
    g.beginPath();
    g.moveTo(baseX, baseY);
    g.lineTo(hookX, hookY - 22);
    g.strokePath();

    g.lineStyle(2.5, 0xfef08a, 0.95);
    g.beginPath();
    g.moveTo(hookX, hookY - 22);
    g.lineTo(hookX, hookY);
    g.strokePath();

    g.fillStyle(0xfbbf24, 1);
    g.fillCircle(hookX, hookY, 5);
  }

  // ===========================================================================
  // TRACK MODULE & SCENERY TOY INTERACTIVE GAGS
  // ===========================================================================

  private triggerTrackModuleGag(piece: PlacedTrackPiece, isDirectTap = false): void {
    const now = this.time.now;
    if (!isDirectTap && now - piece.lastTriggeredAt < 2600) return;
    piece.lastTriggeredAt = now;

    const entry = this.trackModuleSprites.get(piece.id);
    if (!entry) return;
    const spr = entry.sprite;
    const baseScale = spr.scaleX;
    const wx = piece.midX;
    const wy = piece.midY;

    switch (piece.pieceKey) {
      case 'mod-royal-bridge': {
        this.tweens.add({
          targets: spr,
          scaleX: baseScale * 1.07,
          scaleY: baseScale * 0.94,
          duration: 130,
          yoyo: true,
          repeat: 1
        });
        Juice.burstStars(this, wx, wy - 18, 10, [0xfef08a, 0x38bdf8, 0xffffff]);
        if (isDirectTap) this.audio.playWoodTrackSnap();
        break;
      }
      case 'mod-stone-tunnel': {
        this.audio.playSteamWhistle(true);
        Juice.popFloatingLabel(this, wx, wy - 44, '🔊 WHOO-WHOO!', '#fef08a');
        if (entry.hoodSprite) {
          this.tweens.add({
            targets: entry.hoodSprite,
            scaleX: baseScale * 1.08,
            scaleY: baseScale * 0.96,
            duration: 160,
            yoyo: true
          });
        }
        break;
      }
      case 'mod-xylophone-track': {
        for (let b = 0; b < 6; b++) {
          this.time.delayedCall(b * 65, () => {
            this.audio.playXylophoneBar(b);
          });
        }
        this.tweens.add({
          targets: spr,
          scaleX: baseScale * 1.1,
          scaleY: baseScale * 0.9,
          duration: 120,
          yoyo: true
        });
        Juice.popFloatingLabel(this, wx, wy - 28, '🎵 ♪ ♫', '#fde047');
        Juice.burstStars(this, wx, wy, 12, [0xef4444, 0xfbbf24, 0x34d399, 0x38bdf8, 0xa855f7]);
        break;
      }
      case 'mod-crossing-gate': {
        this.audio.playCrossingBell(true);
        this.tweens.add({
          targets: spr,
          angle: spr.angle - 10,
          duration: 140,
          yoyo: true,
          repeat: 2
        });
        Juice.popFloatingLabel(this, wx, wy - 42, '🔔 DING-DING!', '#f87171');
        break;
      }
    }
  }

  private triggerSceneryToyGag(toy: PlacedSceneryToy, isDirectTap = false): void {
    const now = this.time.now;
    if (!isDirectTap && now - toy.lastTriggeredAt < 2600) return;
    toy.lastTriggeredAt = now;

    const spr = toy.sprite;
    const baseScale = toy.scale;
    const wx = toy.x;
    const wy = toy.y;

    this.tweens.killTweensOf(spr);
    spr.setScale(baseScale);
    spr.setAngle(0);
    spr.setY(0);

    switch (toy.toyKey) {
      case 'prop-trex': {
        this.audio.playTRexRoar();
        this.tweens.add({
          targets: spr,
          y: -22,
          angle: { from: -14, to: 14 },
          scaleX: baseScale * 1.15,
          scaleY: baseScale * 1.15,
          duration: 160,
          yoyo: true,
          repeat: 1,
          onComplete: () => {
            spr.setY(0);
            spr.setAngle(0);
            spr.setScale(baseScale);
          }
        });
        Juice.popFloatingLabel(this, wx, wy - 45, '🦖 RAWR-CHOMP!', '#4ade80');
        break;
      }
      case 'prop-unicorn-pasture': {
        this.audio.playUnicornSparkle();
        this.tweens.add({
          targets: spr,
          y: -24,
          angle: -14,
          scaleX: baseScale * 1.14,
          scaleY: baseScale * 1.14,
          duration: 210,
          yoyo: true,
          onComplete: () => {
            spr.setY(0);
            spr.setAngle(0);
            spr.setScale(baseScale);
          }
        });
        Juice.burstStars(this, wx, wy - 20, 16, [0xf472b6, 0xfef08a, 0x38bdf8, 0xc084fc]);
        Juice.popFloatingLabel(this, wx, wy - 44, '🦄✨ NEIGH!', '#f472b6');
        break;
      }
      case 'prop-water-tower': {
        this.audio.playWaterTowerSplash();
        this.tweens.add({
          targets: spr,
          angle: -15,
          scaleX: baseScale * 1.12,
          scaleY: baseScale * 0.9,
          duration: 180,
          yoyo: true,
          onComplete: () => {
            spr.setAngle(0);
            spr.setScale(baseScale);
          }
        });
        Juice.burstStars(this, wx - 16, wy + 8, 14, [0x38bdf8, 0x7dd3fc, 0xe0f2fe]);
        Juice.popFloatingLabel(this, wx, wy - 42, '💦 SPLASH!', '#38bdf8');
        break;
      }
      case 'prop-windmill': {
        this.audio.playWoodTrackSnap();
        this.tweens.add({
          targets: spr,
          angle: { from: -10, to: 10 },
          scaleX: baseScale * 1.1,
          scaleY: baseScale * 1.1,
          duration: 160,
          yoyo: true,
          repeat: 2,
          onComplete: () => {
            spr.setAngle(0);
            spr.setScale(baseScale);
          }
        });
        Juice.burstStars(this, wx, wy - 25, 10, [0xfef08a, 0xfbbf24, 0xffffff]);
        Juice.popFloatingLabel(this, wx, wy - 42, '🌬️ WHOOSH!', '#fef08a');
        break;
      }
      case 'prop-pine-forest': {
        this.audio.playXylophoneBar(4);
        this.time.delayedCall(90, () => this.audio.playXylophoneBar(5));
        this.tweens.add({
          targets: spr,
          scaleX: baseScale * 1.12,
          scaleY: baseScale * 0.9,
          duration: 140,
          yoyo: true,
          repeat: 1,
          onComplete: () => spr.setScale(baseScale)
        });
        Juice.popFloatingLabel(this, wx, wy - 38, '🌲🐦 TWEET!', '#34d399');
        break;
      }
    }
  }

  // ===========================================================================
  // TRAIN CONSIST (UNOBSTRUCTED LOCOMOTIVE + TANGENT-ALIGNED RED, BLUE & GOLD CARS)
  // ===========================================================================

  private createTrainConsist(): void {
    this.trainConsistContainer.removeAll(true);
    this.carContainers = [];
    this.carSprites = [];
    this.carCargoContainers = [];

    const carKeys = ['train-car-red', 'train-car-blue', 'train-car-gold'];

    // Create the 3 trailing cars first (so the locomotive renders on top when rounding bends)
    for (let i = 2; i >= 0; i--) {
      const key = carKeys[i];
      const carCont = this.add.container(0, 0);

      const shadow = this.add.graphics();
      shadow.fillStyle(0x03140c, 0.52);
      shadow.fillEllipse(0, 14, 76, 22);
      carCont.add(shadow);

      if (this.textures.exists(key)) {
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      const carSpr = this.add
        .image(0, 0, key)
        .setOrigin(0.5, 0.58)
        .setScale(0.44);
      carCont.add(carSpr);

      // Cargo stack container mounted inside the open hopper/gondola bed of each car
      const cargoStack = this.add.container(0, -12);
      carCont.add(cargoStack);

      // Interactive tap on any train car: bounces suspension & plays cargo chime!
      const hit = this.add
        .zone(0, -6, 82, 68)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        this.audio.playCargoCraneThunk(i + 1);
        Juice.squashAndStretch(this, carCont, 0.2, 130);
      });
      carCont.add(hit);

      this.trainConsistContainer.add(carCont);
      this.carContainers[i] = carCont;
      this.carSprites[i] = carSpr;
      this.carCargoContainers[i] = cargoStack;
    }

    // Create the Crimson & Brass Steam Locomotive (`train-locomotive`) — 100% unobstructed!
    this.locoContainer = this.add.container(0, 0);

    const locoShadow = this.add.graphics();
    locoShadow.fillStyle(0x03140c, 0.56);
    locoShadow.fillEllipse(0, 16, 94, 24);
    this.locoContainer.add(locoShadow);

    // Golden headlight beam cone (illuminates when entering Echo Mountain Stone Tunnel!)
    this.locoHeadlightCone = this.add.graphics();
    this.locoHeadlightCone.fillStyle(0xfef08a, 0.34);
    this.locoHeadlightCone.fillTriangle(0, -8, -125, -46, -125, 30);
    this.locoHeadlightCone.setBlendMode(Phaser.BlendModes.ADD);
    this.locoHeadlightCone.setAlpha(0.18);
    this.locoContainer.add(this.locoHeadlightCone);

    if (this.textures.exists('train-locomotive')) {
      this.textures.get('train-locomotive').setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.locoSprite = this.add
      .image(0, 0, 'train-locomotive')
      .setOrigin(0.5, 0.58)
      .setScale(0.48);
    this.locoContainer.add(this.locoSprite);

    // Tapping the locomotive directly blows the steam whistle and puffs starlight steam!
    const locoHit = this.add
      .zone(0, -10, 96, 80)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    locoHit.on('pointerdown', () => {
      this.pullBrassWhistleCord();
    });
    this.locoContainer.add(locoHit);

    this.trainConsistContainer.add(this.locoContainer);
  }

  /**
   * Computes the tangent-aligned rotation for our 3/4-isometric locomotive and wooden cars
   * so their wheelbases sit flush along the track tangent `(dx, dy)` while staying upright.
   */
  private computeTangentCarAngle(dx: number, dy: number): { facingRight: boolean; angleDeg: number } {
    const facingRight = dx >= 0;
    const tangentDeg = Phaser.Math.Clamp(
      Phaser.Math.RadToDeg(Math.atan2(dy, Math.max(0.18, Math.abs(dx)))),
      -52,
      52
    );
    // Built-in isometric chassis baseline compensation (`-22deg` when flipped right, `+22deg` when left)
    const isoBaseDeg = facingRight ? -22 : 22;
    const angleDeg = facingRight ? isoBaseDeg + tangentDeg : isoBaseDeg - tangentDeg;
    return { facingRight, angleDeg };
  }

  /**
   * Updates the 2.5D tabletop position and tangent alignment of the Locomotive and its 3 trailing cars.
   */
  private updateTrainConsistPositions(): void {
    if (!this.locoContainer || this.splineSamples.length === 0) return;

    const locoSample = this.sampleSplineAtDist(this.locoDist);
    this.locoContainer.setPosition(locoSample.x, locoSample.y);

    const locoPose = this.computeTangentCarAngle(locoSample.dx, locoSample.dy);
    this.locoSprite.setFlipX(locoPose.facingRight);
    this.locoContainer.setAngle(locoPose.angleDeg);

    // Aim the headlight cone forward along the locomotive's travel direction
    this.locoHeadlightCone.setScale(locoPose.facingRight ? -1 : 1, 1);
    this.locoHeadlightCone.setX(locoPose.facingRight ? 28 : -28);

    // Position the 3 trailing wooden cars at constant 80px arc-length intervals behind the locomotive
    const carSpacing = 80;
    for (let i = 0; i < 3; i++) {
      const carDist = this.locoDist - (i + 1) * carSpacing;
      const carSample = this.sampleSplineAtDist(carDist);
      const carCont = this.carContainers[i];
      const carSpr = this.carSprites[i];
      if (!carCont || !carSpr) continue;

      carCont.setPosition(carSample.x, carSample.y);
      const carPose = this.computeTangentCarAngle(carSample.dx, carSample.dy);
      carSpr.setFlipX(carPose.facingRight);
      carCont.setAngle(carPose.angleDeg);
    }
  }

  /**
   * Emits a puff of pixel-art white & golden starlight steam from the locomotive smokestack!
   */
  private spawnLocomotiveSteamPuff(isBigWhistleBlast = false): void {
    if (!this.locoContainer) return;
    const facingRight = this.locoSprite.flipX;
    const stackX = this.locoContainer.x + (facingRight ? 16 : -16);
    const stackY = this.locoContainer.y - 34;

    const count = isBigWhistleBlast ? 7 : 2;
    for (let i = 0; i < count; i++) {
      const puff = this.add.graphics();
      const radius = Phaser.Math.Between(isBigWhistleBlast ? 10 : 7, isBigWhistleBlast ? 18 : 12);
      const isGold = this.throttleNotch >= 4 || isBigWhistleBlast;
      puff.fillStyle(isGold && i % 2 === 0 ? 0xfef08a : 0xffffff, 0.88);
      puff.fillCircle(0, 0, radius);
      puff.lineStyle(2, 0xfbbf24, 0.55);
      puff.strokeCircle(0, 0, radius);
      puff.setPosition(
        stackX + Phaser.Math.Between(-8, 8),
        stackY + Phaser.Math.Between(-6, 4)
      );
      this.worldFxContainer.add(puff);

      this.tweens.add({
        targets: puff,
        x: puff.x + Phaser.Math.Between(-24, 24),
        y: puff.y - Phaser.Math.Between(32, 68),
        scaleX: 1.75,
        scaleY: 1.75,
        alpha: 0,
        duration: Phaser.Math.Between(520, 860),
        ease: 'Cubic.easeOut',
        onComplete: () => puff.destroy()
      });
    }
  }

  // ===========================================================================
  // ACT 2: GRAND CENTRAL STATION CARGO & PASSENGER LOADER MODAL
  // ===========================================================================

  private requestStopAtStation(): void {
    if (this.isAtStationModalOpen) return;
    this.audio.speakPrompt('pulling_into_station');

    const targetDist = 60;
    this.isStoppingForStation = true;
    this.setThrottleNotch(0, false);

    this.tweens.addCounter({
      from: this.locoDist,
      to: targetDist,
      duration: 520,
      ease: 'Cubic.easeOut',
      onUpdate: (tw) => {
        const val = tw.getValue();
        if (typeof val === 'number') {
          this.locoDist = val;
          this.updateTrainConsistPositions();
        }
      },
      onComplete: () => {
        this.locoDist = targetDist;
        this.updateTrainConsistPositions();
        this.isStoppingForStation = false;
        this.openStationCargoModal();
      }
    });
  }

  private openStationCargoModal(): void {
    if (this.stationModalContainer) {
      this.stationModalContainer.destroy(true);
      this.stationModalContainer = null;
    }

    this.isAtStationModalOpen = true;
    this.currentLoadedCount = 0;

    this.carCargoContainers.forEach((c) => c.removeAll(true));

    const order = CARGO_ORDERS[this.stationOrderIndex % CARGO_ORDERS.length];

    this.time.delayedCall(120, () => {
      this.audio.speakPrompt(order.orderPromptId);
    });

    const modal = this.add.container(640, 255).setDepth(350);
    this.uiRoot.add(modal);
    this.stationModalContainer = modal;

    const cardW = 650;
    const cardH = 290;
    const bg = this.add.graphics();
    bg.fillStyle(0x04120b, 0.72);
    bg.fillRoundedRect(-cardW / 2 + 6, -cardH / 2 + 8, cardW, cardH, 24);
    bg.fillStyle(0x271308, 0.97);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 24);
    bg.lineStyle(4, 0xfbbf24, 1);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 24);
    bg.lineStyle(1.5, 0xfef08a, 0.75);
    bg.strokeRoundedRect(-cardW / 2 + 6, -cardH / 2 + 6, cardW - 12, cardH - 12, 18);

    bg.fillStyle(0x160a04, 0.94);
    bg.fillRoundedRect(-cardW / 2 + 24, -18, cardW - 48, 108, 16);
    bg.lineStyle(2, 0xb45309, 0.9);
    bg.strokeRoundedRect(-cardW / 2 + 24, -18, cardW - 48, 108, 16);
    modal.add(bg);

    const titleTxt = this.add
      .text(0, -112, `GRAND CENTRAL STATION — LOAD ${order.carColorLabel}`, {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);

    const promptTxt = this.add
      .text(
        0,
        -80,
        `Tap ${order.targetCount} ${order.name} to load them with Grandpa's Crane!`,
        {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '16px',
          fontStyle: 'bold',
          color: order.carAccentHex
        }
      )
      .setOrigin(0.5);

    const progressTxt = this.add
      .text(0, -46, `LOADED: 0 / ${order.targetCount}`, {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#1e1b4b',
        strokeThickness: 4
      })
      .setOrigin(0.5);

    modal.add([titleTxt, promptTxt, progressTxt]);

    const itemSpacing = 112;
    const startX = -((5 - 1) * itemSpacing) / 2;

    for (let i = 0; i < 5; i++) {
      const ix = startX + i * itemSpacing;
      const iy = 36;
      const itemSlot = this.add.container(ix, iy);

      const slotCircle = this.add.graphics();
      slotCircle.fillStyle(i < order.targetCount ? 0x3b1d0a : 0x1f1209, 0.95);
      slotCircle.fillCircle(0, 0, 42);
      slotCircle.lineStyle(
        2.5,
        i < order.targetCount ? 0xfbbf24 : 0x78522b,
        i < order.targetCount ? 1 : 0.6
      );
      slotCircle.strokeCircle(0, 0, 42);
      itemSlot.add(slotCircle);

      if (this.textures.exists(order.spriteKey)) {
        this.textures.get(order.spriteKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      const cargoSpr = this.add
        .image(0, 0, order.spriteKey)
        .setOrigin(0.5, 0.5)
        .setScale(0.48);
      itemSlot.add(cargoSpr);

      let isLoaded = false;
      const hit = this.add
        .zone(0, 0, 88, 88)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      itemSlot.add(hit);

      hit.on('pointerdown', () => {
        if (isLoaded || this.currentLoadedCount >= order.targetCount) return;
        isLoaded = true;
        this.currentLoadedCount++;
        const stepCount = this.currentLoadedCount;

        progressTxt.setText(`LOADED: ${stepCount} / ${order.targetCount}`);
        Juice.squashAndStretch(this, progressTxt, 0.22, 130);

        cargoSpr.setAlpha(0.25);
        slotCircle.clear();
        slotCircle.fillStyle(0x064e3b, 0.85);
        slotCircle.fillCircle(0, 0, 42);
        slotCircle.lineStyle(2.5, 0x34d399, 1);
        slotCircle.strokeCircle(0, 0, 42);

        const checkLabel = this.add
          .text(0, 0, `${stepCount}`, {
            fontFamily: '"Fredoka", Georgia, serif',
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#fef08a',
            stroke: '#064e3b',
            strokeThickness: 4
          })
          .setOrigin(0.5);
        itemSlot.add(checkLabel);

        this.animateCraneCargoDrop(modal.x + ix, modal.y + iy, order, stepCount);
      });

      modal.add(itemSlot);
    }

    const engLabel = this.add
      .text(-235, 116, 'ENGINEER:', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fde68a'
      })
      .setOrigin(0.5);
    modal.add(engLabel);

    ENGINEER_SPECS.forEach((eng, idx) => {
      const ex = -140 + idx * 58;
      const ey = 116;
      const eBtn = this.add.container(ex, ey);
      const eRing = this.add.graphics();
      const isSelected = eng.id === this.activeEngineer;
      eRing.fillStyle(0x1c0d06, 1);
      eRing.fillCircle(0, 0, 23);
      eRing.lineStyle(isSelected ? 3 : 1.5, isSelected ? 0x34d399 : 0xd97706, 1);
      eRing.strokeCircle(0, 0, 23);

      const eImg = this.add
        .image(0, 0, eng.spriteKey)
        .setOrigin(0.5)
        .setScale(0.27);
      eBtn.add([eRing, eImg]);

      Juice.makeTactileButton(
        this,
        eBtn,
        56,
        64,
        () => {
          this.selectEngineer(eng.id);
          this.openStationCargoModal();
        },
        'pop'
      );
      modal.add(eBtn);
    });

    const goBtn = this.add.container(215, 116);
    const goG = this.add.graphics();
    goG.fillStyle(0x059669, 1);
    goG.fillRoundedRect(-86, -24, 172, 48, 16);
    goG.lineStyle(3, 0xfef08a, 1);
    goG.strokeRoundedRect(-86, -24, 172, 48, 16);
    const goTxt = this.add
      .text(0, 0, '🚂 ALL ABOARD!', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    goBtn.add([goG, goTxt]);

    Juice.makeTactileButton(
      this,
      goBtn,
      176,
      64,
      () => {
        this.departStationAfterLoading();
      },
      'horn'
    );
    modal.add(goBtn);

    modal.setScale(0.86);
    this.tweens.add({
      targets: modal,
      scaleX: 1,
      scaleY: 1,
      duration: 210,
      ease: 'Back.easeOut'
    });
  }

  private animateCraneCargoDrop(
    startX: number,
    startY: number,
    order: CargoOrderSpec,
    stepCount: number
  ): void {
    const targetCar = this.carContainers[order.targetCarIndex] ?? this.carContainers[0];
    const destX = targetCar ? targetCar.x : 440;
    const destY = targetCar ? targetCar.y - 14 : 465;

    const bp = TRACK_BLUEPRINTS[this.currentBlueprintId];
    const craneBaseX = bp.stationPos.x + 68;
    const craneBaseY = bp.stationPos.y - 24;

    const flyingCargo = this.add
      .image(startX, startY, order.spriteKey)
      .setDepth(420)
      .setScale(0.46);

    this.tweens.add({
      targets: flyingCargo,
      x: destX,
      y: destY,
      scaleX: 0.34,
      scaleY: 0.34,
      duration: 310,
      ease: 'Back.easeIn',
      onUpdate: () => {
        this.drawStationCraneArm(craneBaseX, craneBaseY, flyingCargo.x, flyingCargo.y);
      },
      onComplete: () => {
        flyingCargo.destroy();
        this.drawStationCraneArm(
          craneBaseX,
          craneBaseY,
          bp.stationPos.x + 88,
          bp.stationPos.y + 28
        );

        const cargoStack = this.carCargoContainers[order.targetCarIndex];
        if (cargoStack) {
          const offsetX = (((stepCount - 1) % 3) - 1) * 14;
          const offsetY = -Math.floor((stepCount - 1) / 3) * 10;
          const loadedImg = this.add
            .image(offsetX, offsetY, order.spriteKey)
            .setScale(0.26);
          cargoStack.add(loadedImg);
        }

        if (targetCar) {
          Juice.squashAndStretch(this, targetCar, 0.26, 150);
          Juice.burstStars(this, destX, destY - 10, 12, [0xfef08a, 0xfbbf24, 0x34d399]);
          Juice.popFloatingLabel(this, destX, destY - 24, `${stepCount}!`, order.carAccentHex);
        }

        this.audio.playCargoCraneThunk(stepCount);

        const isOrderComplete = stepCount >= order.targetCount;
        if (isOrderComplete) {
          this.starsEarnedCount++;
          ArcadeState.addStars(1);
          if (this.starScoreLabel) {
            this.starScoreLabel.setText(`★ ${this.starsEarnedCount}`);
            Juice.squashAndStretch(this, this.starScoreLabel, 0.25, 140);
          }
          this.stationOrderIndex = (this.stationOrderIndex + 1) % CARGO_ORDERS.length;
        }

        this.audio.speakCargoCountStep(
          stepCount,
          order.targetCount,
          order.donePromptId,
          () => {
            if (this.isAtStationModalOpen) {
              this.departStationAfterLoading();
            }
          }
        );
      }
    });
  }

  private departStationAfterLoading(): void {
    if (this.stationModalContainer) {
      this.stationModalContainer.destroy(true);
      this.stationModalContainer = null;
    }
    this.isAtStationModalOpen = false;
    this.isStoppingForStation = false;

    this.audio.playSteamWhistle(false);
    this.spawnLocomotiveSteamPuff(true);
    this.setThrottleNotch(Math.max(2, this.throttleNotch || 3), false);
  }

  private selectEngineer(engineerId: EngineerId): void {
    this.activeEngineer = engineerId;
    const spec = ENGINEER_SPECS.find((e) => e.id === engineerId) ?? ENGINEER_SPECS[0];

    // Update the Top HUD Cab Cameo Portrait & Name (keeping the locomotive 100% uncovered!)
    if (this.hudCabCameoSprite && this.textures.exists(spec.spriteKey)) {
      this.hudCabCameoSprite.setTexture(spec.spriteKey);
      Juice.squashAndStretch(this, this.hudCabCameoSprite, 0.24, 140);
    }
    if (this.hudCabCameoNameText) {
      this.hudCabCameoNameText.setText(`CAB: ${spec.name.toUpperCase()}`);
    }

    this.hudEngineerRingMap.forEach((ring, id) => {
      const s = ENGINEER_SPECS.find((e) => e.id === id) ?? ENGINEER_SPECS[0];
      const active = id === this.activeEngineer;
      ring.clear();
      ring.fillStyle(0x140904, 1);
      ring.fillCircle(0, 0, 17);
      ring.lineStyle(active ? 3 : 1.5, active ? 0xfef08a : s.accentColor, 1);
      ring.strokeCircle(0, 0, 17);
    });

    this.audio.speakPrompt(spec.promptId);
  }

  // ===========================================================================
  // ACT 3: FIXED HUD (WITH CAB CAMEO), TRACK BUILDER BAR, TOY DRAWER & SLIDING THROTTLE
  // ===========================================================================

  private createFixedUILayer(): void {
    this.uiRoot = this.add.container(0, 0).setDepth(200);
    this.uiRoot.setScrollFactor(0);

    this.createTopBarHUD();
    this.createHangingWhistlePullCord();
    this.createTrackBuilderToolbar();
    this.createBottomMahoganyToyDrawer();
    this.createBrassThrottleControlPanel();
  }

  private createTopBarHUD(): void {
    // 1. Top-Left Home `[ ⬅ ARCADE ]` Button (`x: 92, y: 38`, `>=64px` hit area)
    const homeBtn = this.add.container(92, 38);
    const homeG = this.add.graphics();
    homeG.fillStyle(0x271206, 0.95);
    homeG.fillRoundedRect(-76, -24, 152, 48, 16);
    homeG.lineStyle(2.5, 0xfbbf24, 1);
    homeG.strokeRoundedRect(-76, -24, 152, 48, 16);
    const homeTxt = this.add
      .text(0, 0, '⬅ ARCADE', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    homeBtn.add([homeG, homeTxt]);

    Juice.makeTactileButton(
      this,
      homeBtn,
      160,
      64,
      () => {
        this.audio.shutdown();
        this.scene.start('HubScene');
      },
      'pop'
    );
    this.uiRoot.add(homeBtn);

    // 2. Top HUD Cab Cameo & Engineer Selector Pill (`x: 382, y: 38`)
    // Houses the active Cab Cameo Portrait so no giant circle blocks the locomotive on the rails!
    const engBar = this.add.container(382, 38);
    const engBg = this.add.graphics();
    engBg.fillStyle(0x271206, 0.95);
    engBg.fillRoundedRect(-198, -26, 396, 52, 16);
    engBg.lineStyle(2.5, 0xd97706, 0.95);
    engBg.strokeRoundedRect(-198, -26, 396, 52, 16);
    engBar.add(engBg);

    const activeSpec =
      ENGINEER_SPECS.find((e) => e.id === this.activeEngineer) ?? ENGINEER_SPECS[1];

    // Brass Cab Cameo Porthole on the left side of the HUD pill
    const cameoRing = this.add.graphics();
    cameoRing.fillStyle(0x090402, 1);
    cameoRing.fillCircle(-164, 0, 22);
    cameoRing.lineStyle(3, 0xfbbf24, 1);
    cameoRing.strokeCircle(-164, 0, 22);
    engBar.add(cameoRing);

    this.hudCabCameoSprite = this.add
      .image(-164, 0, activeSpec.spriteKey)
      .setOrigin(0.5)
      .setScale(0.24);
    engBar.add(this.hudCabCameoSprite);

    this.hudCabCameoNameText = this.add
      .text(-96, 0, `CAB: ${activeSpec.name.toUpperCase()}`, {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    engBar.add(this.hudCabCameoNameText);

    this.hudEngineerRingMap.clear();
    ENGINEER_SPECS.forEach((spec, idx) => {
      const bx = -14 + idx * 46;
      const bCont = this.add.container(bx, 0);
      const bCircle = this.add.graphics();
      const isSelected = spec.id === this.activeEngineer;
      bCircle.fillStyle(0x140904, 1);
      bCircle.fillCircle(0, 0, 17);
      bCircle.lineStyle(isSelected ? 3 : 1.5, isSelected ? 0xfef08a : spec.accentColor, 1);
      bCircle.strokeCircle(0, 0, 17);
      this.hudEngineerRingMap.set(spec.id, bCircle);

      const bImg = this.add
        .image(0, 0, spec.spriteKey)
        .setOrigin(0.5)
        .setScale(0.2);
      bCont.add([bCircle, bImg]);

      Juice.makeTactileButton(
        this,
        bCont,
        46,
        64,
        () => {
          this.selectEngineer(spec.id);
          Juice.burstStars(this, 382 + bx, 38, 8, [spec.accentColor, 0xfef08a]);
        },
        'pop'
      );
      engBar.add(bCont);
    });
    this.uiRoot.add(engBar);

    // 3. Track Blueprint Switcher Button (`x: 696, y: 38`)
    const bpBtn = this.add.container(696, 38);
    const bpG = this.add.graphics();
    bpG.fillStyle(0x271206, 0.95);
    bpG.fillRoundedRect(-105, -24, 210, 48, 16);
    bpG.lineStyle(2.5, 0xfbbf24, 1);
    bpG.strokeRoundedRect(-105, -24, 210, 48, 16);

    this.blueprintBtnText = this.add
      .text(0, 0, '🗺️ 1. Meadow Oval', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    bpBtn.add([bpG, this.blueprintBtnText]);

    Juice.makeTactileButton(
      this,
      bpBtn,
      214,
      64,
      () => {
        const order: TrackBlueprintId[] = ['meadow', 'gorge', 'canyon'];
        const nextIdx = (order.indexOf(this.currentBlueprintId) + 1) % order.length;
        this.buildTrackBlueprint(order[nextIdx], true);
      },
      'tab'
    );
    this.uiRoot.add(bpBtn);

    // 4. Camera Follow / Bird's-Eye Zoom Toggle Button (`x: 912, y: 38`)
    const camBtn = this.add.container(912, 38);
    this.cameraFollowBtnBg = this.add.graphics();
    this.cameraFollowBtnText = this.add
      .text(0, 0, '🔍 FOLLOW CAB', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    camBtn.add([this.cameraFollowBtnBg, this.cameraFollowBtnText]);
    this.redrawCameraFollowButton();

    Juice.makeTactileButton(
      this,
      camBtn,
      184,
      64,
      () => {
        this.toggleCameraFollowMode();
      },
      'pop'
    );
    this.uiRoot.add(camBtn);

    // 5. Star Counter Pill (`x: 1064, y: 38`)
    const starPill = this.add.container(1064, 38);
    const starG = this.add.graphics();
    starG.fillStyle(0x271206, 0.94);
    starG.fillRoundedRect(-46, -22, 92, 44, 14);
    starG.lineStyle(2, 0xfbbf24, 1);
    starG.strokeRoundedRect(-46, -22, 92, 44, 14);
    this.starScoreLabel = this.add
      .text(0, 0, '★ 0', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    starPill.add([starG, this.starScoreLabel]);
    this.uiRoot.add(starPill);
  }

  private redrawCameraFollowButton(): void {
    if (!this.cameraFollowBtnBg) return;
    this.cameraFollowBtnBg.clear();
    this.cameraFollowBtnBg.fillStyle(this.isCameraFollow ? 0x065f46 : 0x271206, 0.95);
    this.cameraFollowBtnBg.fillRoundedRect(-90, -24, 180, 48, 16);
    this.cameraFollowBtnBg.lineStyle(2.5, this.isCameraFollow ? 0x34d399 : 0xfbbf24, 1);
    this.cameraFollowBtnBg.strokeRoundedRect(-90, -24, 180, 48, 16);
    this.cameraFollowBtnText.setText(this.isCameraFollow ? '🔍 TABLE VIEW' : '🔍 FOLLOW CAB');
  }

  private toggleCameraFollowMode(): void {
    this.isCameraFollow = !this.isCameraFollow;
    this.redrawCameraFollowButton();

    if (!this.isCameraFollow) {
      this.tweens.add({
        targets: this.worldRoot,
        scaleX: 1,
        scaleY: 1,
        x: 0,
        y: 0,
        duration: 360,
        ease: 'Cubic.easeOut'
      });
    }
  }

  /**
   * Track Builder Action Toolbar above the bottom-left Mahogany Toy Drawer:
   * - `[ ↩ Undo ]`: removes the last snapped track piece
   * - `[ ✨ Magic Finish Loop ]`: auto-completes any open track back to Grandpa's Train Depot
   */
  private createTrackBuilderToolbar(): void {
    // 1. `[ ↩ Undo ]` Button (`x: 88, y: 556`)
    const undoBtn = this.add.container(88, 556);
    const undoG = this.add.graphics();
    undoG.fillStyle(0x271206, 0.96);
    undoG.fillRoundedRect(-64, -20, 128, 40, 13);
    undoG.lineStyle(2.5, 0xf87171, 1);
    undoG.strokeRoundedRect(-64, -20, 128, 40, 13);
    const undoTxt = this.add
      .text(0, 0, '↩ Undo', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    undoBtn.add([undoG, undoTxt]);

    Juice.makeTactileButton(
      this,
      undoBtn,
      134,
      64,
      () => {
        this.undoLastTrackPiece();
      },
      'pop'
    );
    this.uiRoot.add(undoBtn);

    // 2. `[ ✨ Magic Finish Loop ]` Button (`x: 268, y: 556`)
    const magicBtn = this.add.container(268, 556);
    const magicG = this.add.graphics();
    magicG.fillStyle(0x065f46, 0.96);
    magicG.fillRoundedRect(-104, -20, 208, 40, 13);
    magicG.lineStyle(2.5, 0x34d399, 1);
    magicG.strokeRoundedRect(-104, -20, 208, 40, 13);
    const magicTxt = this.add
      .text(0, 0, '✨ Magic Finish Loop', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    magicBtn.add([magicG, magicTxt]);

    Juice.makeTactileButton(
      this,
      magicBtn,
      214,
      64,
      () => {
        this.magicFinishTrackLoop();
      },
      'chime'
    );
    this.uiRoot.add(magicBtn);
  }

  /**
   * Top-Right Hanging Braided Golden Whistle Rope Cord (`x: 1196, y: 0..165`)!
   * Kids can physically drag the rope downward or tap it to blast the steam whistle!
   */
  private createHangingWhistlePullCord(): void {
    this.whistleCordContainer = this.add.container(1196, 0);
    this.whistleRopeGraphics = this.add.graphics();
    this.whistleCordContainer.add(this.whistleRopeGraphics);

    if (this.textures.exists('prop-whistle-cord')) {
      this.textures.get('prop-whistle-cord').setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.whistleTasselSprite = this.add
      .image(0, 118, 'prop-whistle-cord')
      .setOrigin(0.5, 0.5)
      .setScale(0.54);
    this.whistleCordContainer.add(this.whistleTasselSprite);

    const label = this.add
      .text(0, 164, 'PULL WHISTLE', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#271206',
        strokeThickness: 3
      })
      .setOrigin(0.5);
    this.whistleCordContainer.add(label);

    this.redrawWhistleCord(0);

    const hit = this.add
      .zone(0, 108, 110, 165)
      .setOrigin(0.5)
      .setInteractive({ draggable: true, useHandCursor: true });
    this.whistleCordContainer.add(hit);

    hit.on('pointerdown', () => {
      this.pullBrassWhistleCord();
    });

    hit.on('drag', (pointer: Phaser.Input.Pointer) => {
      const pull = Phaser.Math.Clamp(pointer.y - 108, 0, 58);
      this.redrawWhistleCord(pull);
    });

    hit.on('dragend', () => {
      this.pullBrassWhistleCord();
    });

    this.uiRoot.add(this.whistleCordContainer);
  }

  private redrawWhistleCord(pullOffset: number): void {
    this.whistlePullOffset = pullOffset;
    const g = this.whistleRopeGraphics;
    g.clear();

    const endY = 92 + pullOffset;
    g.lineStyle(8, 0x92400e, 1);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, endY);
    g.strokePath();

    g.lineStyle(4.5, 0xfbbf24, 1);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, endY);
    g.strokePath();

    g.fillStyle(0xfef08a, 1);
    for (let y = 14; y < endY; y += 14) {
      g.fillCircle(0, y, 3);
    }

    if (this.whistleTasselSprite) {
      this.whistleTasselSprite.setY(118 + pullOffset);
    }
  }

  private pullBrassWhistleCord(): void {
    this.audio.playSteamWhistle(this.wasInsideTunnel);
    this.spawnLocomotiveSteamPuff(true);
    Juice.shake(this, 150, 0.0045);

    if (this.locoContainer) {
      Juice.popFloatingLabel(
        this,
        this.locoContainer.x,
        this.locoContainer.y - 54,
        '🚂 CHOO-CHOOO!',
        '#fef08a'
      );
    }

    this.tweens.addCounter({
      from: Math.max(28, this.whistlePullOffset),
      to: 0,
      duration: 340,
      ease: 'Elastic.easeOut',
      onUpdate: (tw) => {
        this.redrawWhistleCord(tw.getValue() ?? 0);
      }
    });
  }

  /**
   * Bottom Mahogany Toy Drawer (`x: 20..866, y: 586..708`):
   * Houses all 7 Track Pieces (`Straight`, `Curve L`, `Curve R`, `Xylophone`, `Bridge`, `Tunnel`, `Gate`)
   * and all 5 Scenery Toys (`T-Rex`, `Pasture`, `Tower`, `Windmill`, `Forest`).
   * - Track pieces snap onto the Active Track Connector with auto-rotation!
   * - Scenery toys can be dragged and placed freely anywhere on the green felt table!
   */
  private createBottomMahoganyToyDrawer(): void {
    this.drawerContainer = this.add.container(0, 0);
    this.drawerCardMap.clear();

    const drawerBg = this.add.graphics();
    drawerBg.fillStyle(0x1f0f06, 0.95);
    drawerBg.fillRoundedRect(20, 586, 846, 122, 18);
    drawerBg.lineStyle(3, 0xd97706, 1);
    drawerBg.strokeRoundedRect(20, 586, 846, 122, 18);
    drawerBg.lineStyle(1, 0xfef08a, 0.65);
    drawerBg.strokeRoundedRect(24, 590, 838, 114, 15);
    this.drawerContainer.add(drawerBg);

    const startX = 58;
    const spacing = 69;
    const cy = 647;

    TOY_DRAWER_ITEMS.forEach((item, idx) => {
      const cx = startX + idx * spacing;
      const card = this.add.container(cx, cy);

      const cardG = this.add.graphics();
      cardG.fillStyle(0x2e170a, 0.96);
      cardG.fillRoundedRect(-31, -48, 62, 96, 11);
      cardG.lineStyle(2, item.badgeColor, 0.95);
      cardG.strokeRoundedRect(-31, -48, 62, 96, 11);
      card.add(cardG);

      if (this.textures.exists(item.toyKey)) {
        this.textures.get(item.toyKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
        const iconScale = item.toyKey.startsWith('track-') ? 0.44 : 0.25;
        const icon = this.add
          .image(0, -9, item.toyKey)
          .setOrigin(0.5)
          .setScale(iconScale);
        card.add(icon);
      }

      const shortLbl = this.add
        .text(0, 32, item.shortLabel, {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '10.5px',
          fontStyle: 'bold',
          color: '#fef08a'
        })
        .setOrigin(0.5);
      card.add(shortLbl);

      const hit = this.add
        .zone(0, 0, 68, 102)
        .setOrigin(0.5)
        .setInteractive({ draggable: true, useHandCursor: true });
      card.add(hit);

      let draggedDistance = 0;

      hit.on('dragstart', (pointer: Phaser.Input.Pointer) => {
        draggedDistance = 0;
        this.activeDragToyKey = item.toyKey;
        this.activeDragKind = item.kind;
        if (this.activeDragGhost) {
          this.activeDragGhost.destroy();
        }
        const ghostScale = item.toyKey.startsWith('track-') ? 0.72 : 0.54;
        this.activeDragGhost = this.add
          .image(pointer.x, pointer.y, item.toyKey)
          .setDepth(500)
          .setScale(ghostScale)
          .setAlpha(0.92);
      });

      hit.on('drag', (pointer: Phaser.Input.Pointer) => {
        draggedDistance += Math.hypot(pointer.velocity.x, pointer.velocity.y) + 4;
        if (this.activeDragGhost) {
          this.activeDragGhost.setPosition(pointer.x, pointer.y);
          // Auto-rotate track piece preview to match the Active Track Connector's angle!
          if (this.activeDragKind === 'track') {
            const conn = this.getActiveTrackConnector();
            this.activeDragGhost.setRotation(conn.angle);
          }
        }
      });

      hit.on('dragend', (pointer: Phaser.Input.Pointer) => {
        if (this.activeDragGhost) {
          this.activeDragGhost.destroy();
          this.activeDragGhost = null;
        }
        const draggedKey = this.activeDragToyKey;
        const draggedKind = this.activeDragKind;
        this.activeDragToyKey = null;
        this.activeDragKind = null;

        if (!draggedKey || !draggedKind) return;

        if (draggedKind === 'track') {
          // Track piece: snap onto the Active Track Connector with auto-rotation!
          Juice.squashAndStretch(this, card, 0.2, 130);
          this.snapTrackPieceToActiveConnector(draggedKey as TrackPieceKey, true);
        } else {
          // Scenery toy: place freely wherever dropped on the green felt table!
          Juice.squashAndStretch(this, card, 0.2, 130);
          if (draggedDistance < 22 || pointer.y > 570) {
            // Quick-tap in drawer: arc onto a pleasant spot on the green felt table
            const rx = Phaser.Math.Between(180, 1060);
            const ry = Phaser.Math.Between(160, 440);
            this.placeSceneryToyOnFelt(draggedKey as SceneryToyKey, rx, ry, true);
          } else {
            const worldPt = this.screenToWorld(pointer.x, pointer.y);
            this.placeSceneryToyOnFelt(
              draggedKey as SceneryToyKey,
              worldPt.x,
              worldPt.y,
              true
            );
          }
        }
      });

      this.drawerContainer.add(card);
      this.drawerCardMap.set(item.toyKey, card);
    });

    this.uiRoot.add(this.drawerContainer);
  }

  /**
   * Bottom-Right Brass & Mahogany Engineer Control Panel (`x: 876..1258, y: 586..708`):
   * Features the 5-Notch Brass Throttle Lever (`STOP`, `1`, `2`, `3`, `4`, `5`) whose
   * T-handle physically slides in screen X coordinates (`924..1204`) when dragged or tapped
   * and snaps cleanly to the active notch!
   */
  private createBrassThrottleControlPanel(): void {
    const panel = this.add.container(0, 0);

    const bg = this.add.graphics();
    bg.fillStyle(0x241107, 0.96);
    bg.fillRoundedRect(876, 586, 382, 122, 18);
    bg.lineStyle(3, 0xfbbf24, 1);
    bg.strokeRoundedRect(876, 586, 382, 122, 18);
    bg.lineStyle(1, 0xfef08a, 0.65);
    bg.strokeRoundedRect(880, 590, 374, 114, 15);

    // Brass quadrant slot groove (`x: 910..1226, y: 646..664`)
    bg.fillStyle(0x0c0502, 1);
    bg.fillRoundedRect(910, 646, 316, 18, 9);
    bg.lineStyle(2, 0xd97706, 0.95);
    bg.strokeRoundedRect(910, 646, 316, 18, 9);
    panel.add(bg);

    const header = this.add
      .text(1067, 606, '⚡ BRASS STEAM THROTTLE LEVER ⚡', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    panel.add(header);

    const notchNames = ['STOP', '1', '2', '3', '4', '5'];
    const notchColors = ['#f87171', '#fef08a', '#fef08a', '#34d399', '#38bdf8', '#f472b6'];
    this.throttleNotchLabels = [];

    for (let n = 0; n <= 5; n++) {
      const nx = THROTTLE_NOTCH_BASE_X + n * THROTTLE_NOTCH_STEP_X;
      const ny = 655;

      // Brass detent tick
      const tick = this.add.graphics();
      tick.fillStyle(0xfbbf24, 0.9);
      tick.fillCircle(nx, ny, 5);
      panel.add(tick);

      const lbl = this.add
        .text(nx, 686, notchNames[n], {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: n === 0 ? '13px' : '16px',
          fontStyle: 'bold',
          color: notchColors[n]
        })
        .setOrigin(0.5);
      panel.add(lbl);
      this.throttleNotchLabels.push(lbl);
    }

    // Heavy Crimson & Brass Draggable Throttle T-Handle (`x: 924 + notch * 56, y: 650`)
    this.throttleHandle = this.add.container(
      THROTTLE_NOTCH_BASE_X + this.throttleNotch * THROTTLE_NOTCH_STEP_X,
      650
    );
    const hG = this.add.graphics();
    // Brass shaft
    hG.fillStyle(0xd97706, 1);
    hG.fillRoundedRect(-7, -24, 14, 38, 5);
    hG.lineStyle(2, 0xfef08a, 1);
    hG.strokeRoundedRect(-7, -24, 14, 38, 5);
    // Crimson T-handle grip knob
    hG.fillStyle(0xdc2626, 1);
    hG.fillRoundedRect(-22, -36, 44, 24, 10);
    hG.lineStyle(2.5, 0xfef08a, 1);
    hG.strokeRoundedRect(-22, -36, 44, 24, 10);
    this.throttleHandle.add(hG);
    panel.add(this.throttleHandle);

    // Full-slot interactive & draggable zone (`x: 896..1238, y: 606..702`) in root UI coordinates
    // so tapping ANY notch OR dragging the T-handle slides in exact screen X (`924..1204`)!
    const slotInteractZone = this.add
      .zone(1067, 654, 352, 96)
      .setOrigin(0.5)
      .setInteractive({ draggable: true, useHandCursor: true });
    panel.add(slotInteractZone);

    const slideThrottleToPointerX = (pointerX: number, snapImmediately: boolean) => {
      const minX = THROTTLE_NOTCH_BASE_X;
      const maxX = THROTTLE_NOTCH_BASE_X + 5 * THROTTLE_NOTCH_STEP_X;
      const clampedX = Phaser.Math.Clamp(pointerX, minX, maxX);
      const nearestNotch = Phaser.Math.Clamp(
        Math.round((clampedX - minX) / THROTTLE_NOTCH_STEP_X),
        0,
        5
      );

      if (snapImmediately) {
        this.setThrottleNotch(nearestNotch, true);
      } else {
        this.tweens.killTweensOf(this.throttleHandle);
        this.throttleHandle.setX(clampedX);
        if (nearestNotch !== this.throttleNotch) {
          this.throttleNotch = nearestNotch;
          this.refreshThrottleNotchLabelHighlights();
          this.audio.playThrottleClick(nearestNotch);
          if (nearestNotch >= 4) {
            this.spawnLocomotiveSteamPuff(false);
          }
        }
      }
    };

    slotInteractZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      slideThrottleToPointerX(pointer.x, true);
    });

    slotInteractZone.on('drag', (pointer: Phaser.Input.Pointer) => {
      slideThrottleToPointerX(pointer.x, false);
    });

    slotInteractZone.on('dragend', () => {
      this.setThrottleNotch(this.throttleNotch, false);
    });

    this.refreshThrottleNotchLabelHighlights();
    this.uiRoot.add(panel);
  }

  private refreshThrottleNotchLabelHighlights(): void {
    this.throttleNotchLabels.forEach((lbl, idx) => {
      const isActive = idx === this.throttleNotch;
      lbl.setScale(isActive ? 1.22 : 1.0);
      lbl.setAlpha(isActive ? 1.0 : 0.78);
    });
  }

  private setThrottleNotch(notch: number, playAudioFeedback = true): void {
    const clamped = Phaser.Math.Clamp(notch, 0, 5);
    this.throttleNotch = clamped;
    this.refreshThrottleNotchLabelHighlights();

    if (this.throttleHandle) {
      const targetX = THROTTLE_NOTCH_BASE_X + clamped * THROTTLE_NOTCH_STEP_X;
      this.tweens.killTweensOf(this.throttleHandle);
      this.tweens.add({
        targets: this.throttleHandle,
        x: targetX,
        duration: 110,
        ease: 'Back.easeOut'
      });
      Juice.squashAndStretch(this, this.throttleHandle, 0.16, 110);
    }

    if (playAudioFeedback) {
      this.audio.playThrottleClick(clamped);
      if (clamped >= 4) {
        this.spawnLocomotiveSteamPuff(false);
      }
    }
  }

  // ===========================================================================
  // MAIN GAME LOOP: TRAIN KINEMATICS, MODULE TRIGGERS & CAMERA FOLLOW
  // ===========================================================================

  public update(_time: number, delta: number): void {
    const dtSec = Math.min(0.05, delta / 1000);

    // 1. Smoothly interpolate train speed toward target throttle notch (`0..5`)
    const targetSpeed =
      this.isAtStationModalOpen || this.isStoppingForStation
        ? 0
        : this.throttleNotch === 0
        ? 0
        : 55 + this.throttleNotch * 48;

    this.currentSpeedPxPerSec = Phaser.Math.Linear(
      this.currentSpeedPxPerSec,
      targetSpeed,
      Math.min(1, dtSec * 6.5)
    );

    if (this.currentSpeedPxPerSec > 0.5 && !this.isStoppingForStation) {
      if (this.isLoopClosed) {
        this.locoDist =
          (this.locoDist + this.currentSpeedPxPerSec * dtSec) % this.totalTrackLength;
      } else {
        // When track is open (being built), shuttle smoothly along the placed track pieces
        const minD = Math.min(245, this.totalTrackLength * 0.35);
        const maxD = Math.max(minD + 20, this.totalTrackLength - 28);
        this.locoDist += this.currentSpeedPxPerSec * dtSec * this.shuttleDirection;
        if (this.locoDist >= maxD) {
          this.locoDist = maxD;
          this.shuttleDirection = -1;
        } else if (this.locoDist <= minD) {
          this.locoDist = minD;
          this.shuttleDirection = 1;
        }
      }
      this.updateTrainConsistPositions();
    }

    // 2. Check proximity to snapped Track Modules (`Bridge`, `Tunnel`, `Xylophone`, `Crossing Gate`)
    let isInsideTunnelNow = false;
    if (this.locoContainer) {
      for (const piece of this.placedTrackPieces) {
        if (
          piece.pieceKey === 'track-straight' ||
          piece.pieceKey === 'track-curve-left' ||
          piece.pieceKey === 'track-curve-right'
        ) {
          continue;
        }

        const distToLoco = Math.hypot(
          this.locoContainer.x - piece.midX,
          this.locoContainer.y - piece.midY
        );

        if (piece.pieceKey === 'mod-stone-tunnel' && distToLoco < 86) {
          isInsideTunnelNow = true;
        }

        if (
          piece.pieceKey === 'mod-xylophone-track' &&
          distToLoco < 68 &&
          this.throttleNotch > 0
        ) {
          const barIdx = Math.floor(((this.locoDist % 72) / 72) * 6);
          if (barIdx !== this.lastXyloBarPlayed) {
            this.lastXyloBarPlayed = barIdx;
            this.audio.playXylophoneBar(barIdx);
            if (barIdx % 2 === 0) {
              Juice.burstStars(
                this,
                this.locoContainer.x,
                this.locoContainer.y,
                4,
                [0xef4444, 0xfbbf24, 0x34d399, 0x38bdf8]
              );
            }
          }
        }

        if (this.throttleNotch > 0 && distToLoco < 78) {
          this.triggerTrackModuleGag(piece, false);
        }
      }

      // 2b. Check proximity to freely placed Scenery Toys on the green felt table
      for (const scToy of this.placedSceneryToys) {
        const distToScenery = Math.hypot(
          this.locoContainer.x - scToy.x,
          this.locoContainer.y - scToy.y
        );
        if (this.throttleNotch > 0 && distToScenery < 108) {
          this.triggerSceneryToyGag(scToy, false);
        }
      }
    }

    // 3. Headlight illumination inside Echo Mountain Stone Tunnel
    if (this.locoHeadlightCone) {
      this.locoHeadlightCone.setAlpha(isInsideTunnelNow ? 0.78 : 0.16);
    }
    if (isInsideTunnelNow && !this.wasInsideTunnel) {
      this.audio.playSteamWhistle(true);
    }
    this.wasInsideTunnel = isInsideTunnelNow;

    // 4. Advance procedural 4-beat Steam Chug-Chug Engine & emit synchronized steam puffs!
    const puffedBeat = this.audio.updateSteamChug(
      dtSec,
      this.isAtStationModalOpen ? 0 : this.throttleNotch,
      isInsideTunnelNow
    );
    if (puffedBeat) {
      this.spawnLocomotiveSteamPuff(false);
    }

    // 5. Smooth Camera Follow Mode (`1.55x` zoom tracking the locomotive cab within table bounds)
    if (this.isCameraFollow && this.locoContainer) {
      const zoom = 1.55;
      const targetX = Phaser.Math.Clamp(
        640 - this.locoContainer.x * zoom,
        1280 * (1 - zoom),
        0
      );
      const targetY = Phaser.Math.Clamp(
        320 - this.locoContainer.y * zoom,
        720 * (1 - zoom),
        0
      );
      this.worldRoot.setScale(
        Phaser.Math.Linear(this.worldRoot.scaleX, zoom, dtSec * 6),
        Phaser.Math.Linear(this.worldRoot.scaleY, zoom, dtSec * 6)
      );
      this.worldRoot.setPosition(
        Phaser.Math.Linear(this.worldRoot.x, targetX, dtSec * 6),
        Phaser.Math.Linear(this.worldRoot.y, targetY, dtSec * 6)
      );
    }
  }
}
