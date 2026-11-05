/**
 * src/scenes/TrainTableScene.ts
 * -----------------------------
 * Mentor Note: "Grandpa's Clockwork Train Table" — A Nintendo-polished (Captain Toad /
 * Brio Wooden Railway / Yoshi's Crafted World aesthetic) 32-bit Hi-Bit Pixel Art toy train
 * and miniature diorama world-builder for Wyatt (age 4) and Emma (age 3).
 *
 * Architectural Highlights:
 * 1. **Zero-Frustration Continuous Spline Track + Modular Node Socket System:**
 *    Instead of forcing a 3- or 4-year-old to assemble 20 tiny puzzle pieces before the train
 *    can move, the table always starts with a complete, working grand loop of carved beechwood
 *    Brio tracks. Kids can switch between 3 Classic Blueprints (Sunny Meadow Oval, Royal Gorge
 *    Figure-8 Bridge, Winding Mountain Canyon Loop) and snap Special Track Modules & Living
 *    Scenery Toys into glowing Golden Dotted Sockets at any time — even while the train chugs!
 * 2. **Uniform Arc-Length Catmull-Rom Spline Follower:**
 *    We sample the closed spline into a 1,000-point arc-length lookup table so the Crimson &
 *    Brass Steam Locomotive and its 3 trailing wooden cars (Red Hopper, Blue Gondola, Gold Coach)
 *    maintain exact constant pixel spacing around tight curves without bunching or stretching.
 * 3. **3-Act Tactile Play Loop:**
 *    - Act 1: Snap-and-Play Track Modules (Bridge, Tunnel, Xylophone Track, Crossing Gate) &
 *      Living Diorama Toys (Friendly T-Rex, Unicorn Pasture, Windmill, Pine Forest, Water Tower).
 *    - Act 2: Grand Central Station Cargo & Passenger Loader (Counting 1-5 logs, milk barrels,
 *      treasure chests, and crystal crates with Grandpa's swinging wooden crane + choosing who
 *      rides in the locomotive cab!).
 *    - Act 3: Tactile Brass Engineer Dashboard (5-Notch Brass Throttle Lever `STOP..5`, hanging
 *      Braided Golden Whistle Pull-Cord, and `1.55x` Camera Follow / Bird's-Eye Zoom Toggle).
 */

import Phaser from 'phaser';
import { ArcadeState } from '../core/ArcadeState';
import { AudioBus } from '../core/AudioBus';
import { Juice } from '../core/Juice';
import { TrainAudioEngine } from '../core/TrainAudioEngine';

type TrackBlueprintId = 'meadow' | 'gorge' | 'canyon';

type EngineerId = 'grandpa' | 'wyatt' | 'emma' | 'doggie' | 'sparky';

type CargoTypeId = 'logs' | 'barrels' | 'chests' | 'crates';

interface SplineSample {
  x: number;
  y: number;
  dx: number;
  dy: number;
  dist: number;
}

interface ToySocketSpec {
  id: string;
  kind: 'track' | 'scenery';
  toyKey: string;
  label: string;
  x: number;
  y: number;
  trackT?: number;
  scale: number;
}

interface BlueprintConfig {
  id: TrackBlueprintId;
  name: string;
  shortLabel: string;
  promptId: string;
  controlPoints: Array<{ x: number; y: number }>;
  stationT: number;
  stationPos: { x: number; y: number };
  sockets: ToySocketSpec[];
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
  toyKey: string;
  kind: 'track' | 'scenery';
  title: string;
  badgeColor: number;
  promptId?: string;
}> = [
  {
    toyKey: 'mod-royal-bridge',
    kind: 'track',
    title: 'Royal Gorge Bridge',
    badgeColor: 0xef4444,
    promptId: 'module_bridge'
  },
  {
    toyKey: 'mod-stone-tunnel',
    kind: 'track',
    title: 'Echo Tunnel',
    badgeColor: 0x94a3b8,
    promptId: 'module_tunnel'
  },
  {
    toyKey: 'mod-xylophone-track',
    kind: 'track',
    title: 'Xylophone Track',
    badgeColor: 0xfbbf24,
    promptId: 'module_xylophone'
  },
  {
    toyKey: 'mod-crossing-gate',
    kind: 'track',
    title: 'Crossing Gate',
    badgeColor: 0xf87171,
    promptId: 'module_crossing'
  },
  {
    toyKey: 'prop-trex',
    kind: 'scenery',
    title: 'Friendly T-Rex',
    badgeColor: 0x22c55e
  },
  {
    toyKey: 'prop-unicorn-pasture',
    kind: 'scenery',
    title: 'Unicorn Pasture',
    badgeColor: 0xf472b6
  },
  {
    toyKey: 'prop-water-tower',
    kind: 'scenery',
    title: 'Water Tower',
    badgeColor: 0x38bdf8
  },
  {
    toyKey: 'prop-windmill',
    kind: 'scenery',
    title: 'Spinning Windmill',
    badgeColor: 0xf59e0b
  },
  {
    toyKey: 'prop-pine-forest',
    kind: 'scenery',
    title: 'Pine Forest',
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
    controlPoints: [
      { x: 560, y: 472 },
      { x: 310, y: 465 },
      { x: 185, y: 365 },
      { x: 225, y: 215 },
      { x: 455, y: 155 },
      { x: 760, y: 162 },
      { x: 985, y: 225 },
      { x: 1020, y: 375 },
      { x: 835, y: 470 }
    ],
    stationT: 0.0,
    stationPos: { x: 560, y: 404 },
    sockets: [
      {
        id: 'sock-bridge',
        kind: 'track',
        toyKey: 'mod-royal-bridge',
        label: 'Bridge Socket',
        x: 475,
        y: 158,
        trackT: 0.45,
        scale: 0.62
      },
      {
        id: 'sock-tunnel',
        kind: 'track',
        toyKey: 'mod-stone-tunnel',
        label: 'Tunnel Socket',
        x: 880,
        y: 185,
        trackT: 0.64,
        scale: 0.68
      },
      {
        id: 'sock-xylo',
        kind: 'track',
        toyKey: 'mod-xylophone-track',
        label: 'Xylophone Rail',
        x: 205,
        y: 290,
        trackT: 0.28,
        scale: 0.56
      },
      {
        id: 'sock-crossing',
        kind: 'track',
        toyKey: 'mod-crossing-gate',
        label: 'Crossing Gate',
        x: 935,
        y: 425,
        trackT: 0.84,
        scale: 0.58
      },
      {
        id: 'sock-trex',
        kind: 'scenery',
        toyKey: 'prop-trex',
        label: 'Dino Canyon',
        x: 745,
        y: 285,
        trackT: 0.56,
        scale: 0.58
      },
      {
        id: 'sock-unicorn',
        kind: 'scenery',
        toyKey: 'prop-unicorn-pasture',
        label: 'Unicorn Meadow',
        x: 355,
        y: 310,
        trackT: 0.18,
        scale: 0.6
      },
      {
        id: 'sock-water',
        kind: 'scenery',
        toyKey: 'prop-water-tower',
        label: 'Water Tower',
        x: 330,
        y: 485,
        trackT: 0.11,
        scale: 0.56
      },
      {
        id: 'sock-windmill',
        kind: 'scenery',
        toyKey: 'prop-windmill',
        label: 'Dutch Windmill',
        x: 1095,
        y: 285,
        trackT: 0.74,
        scale: 0.58
      },
      {
        id: 'sock-pines',
        kind: 'scenery',
        toyKey: 'prop-pine-forest',
        label: 'Pine Forest',
        x: 135,
        y: 175,
        trackT: 0.34,
        scale: 0.58
      }
    ]
  },
  gorge: {
    id: 'gorge',
    name: 'Royal Gorge Figure-8',
    shortLabel: '2. Figure-8 Gorge',
    promptId: 'layout_gorge',
    controlPoints: [
      { x: 560, y: 478 },
      { x: 265, y: 470 },
      { x: 165, y: 335 },
      { x: 270, y: 175 },
      { x: 565, y: 265 },
      { x: 865, y: 425 },
      { x: 1035, y: 315 },
      { x: 925, y: 165 },
      { x: 640, y: 255 },
      { x: 775, y: 468 }
    ],
    stationT: 0.0,
    stationPos: { x: 555, y: 410 },
    sockets: [
      {
        id: 'sock-bridge',
        kind: 'track',
        toyKey: 'mod-royal-bridge',
        label: 'Gorge Crossover',
        x: 595,
        y: 260,
        trackT: 0.44,
        scale: 0.64
      },
      {
        id: 'sock-tunnel',
        kind: 'track',
        toyKey: 'mod-stone-tunnel',
        label: 'Cliff Tunnel',
        x: 945,
        y: 185,
        trackT: 0.74,
        scale: 0.68
      },
      {
        id: 'sock-xylo',
        kind: 'track',
        toyKey: 'mod-xylophone-track',
        label: 'Melody Curve',
        x: 215,
        y: 245,
        trackT: 0.27,
        scale: 0.56
      },
      {
        id: 'sock-crossing',
        kind: 'track',
        toyKey: 'mod-crossing-gate',
        label: 'Crossing Gate',
        x: 865,
        y: 430,
        trackT: 0.55,
        scale: 0.58
      },
      {
        id: 'sock-trex',
        kind: 'scenery',
        toyKey: 'prop-trex',
        label: 'T-Rex Lookout',
        x: 805,
        y: 280,
        trackT: 0.62,
        scale: 0.58
      },
      {
        id: 'sock-unicorn',
        kind: 'scenery',
        toyKey: 'prop-unicorn-pasture',
        label: 'Unicorn Loop',
        x: 345,
        y: 335,
        trackT: 0.16,
        scale: 0.6
      },
      {
        id: 'sock-water',
        kind: 'scenery',
        toyKey: 'prop-water-tower',
        label: 'Water Tower',
        x: 295,
        y: 485,
        trackT: 0.1,
        scale: 0.56
      },
      {
        id: 'sock-windmill',
        kind: 'scenery',
        toyKey: 'prop-windmill',
        label: 'Windmill Hill',
        x: 1105,
        y: 285,
        trackT: 0.66,
        scale: 0.58
      },
      {
        id: 'sock-pines',
        kind: 'scenery',
        toyKey: 'prop-pine-forest',
        label: 'Pine Woods',
        x: 435,
        y: 150,
        trackT: 0.36,
        scale: 0.58
      }
    ]
  },
  canyon: {
    id: 'canyon',
    name: 'Winding Mountain Canyon',
    shortLabel: '3. Mountain Canyon',
    promptId: 'layout_canyon',
    controlPoints: [
      { x: 560, y: 478 },
      { x: 285, y: 475 },
      { x: 175, y: 380 },
      { x: 315, y: 285 },
      { x: 225, y: 165 },
      { x: 525, y: 150 },
      { x: 695, y: 270 },
      { x: 945, y: 165 },
      { x: 1035, y: 335 },
      { x: 845, y: 472 }
    ],
    stationT: 0.0,
    stationPos: { x: 560, y: 410 },
    sockets: [
      {
        id: 'sock-bridge',
        kind: 'track',
        toyKey: 'mod-royal-bridge',
        label: 'River Bridge',
        x: 525,
        y: 155,
        trackT: 0.49,
        scale: 0.62
      },
      {
        id: 'sock-tunnel',
        kind: 'track',
        toyKey: 'mod-stone-tunnel',
        label: 'Echo Tunnel',
        x: 945,
        y: 175,
        trackT: 0.69,
        scale: 0.68
      },
      {
        id: 'sock-xylo',
        kind: 'track',
        toyKey: 'mod-xylophone-track',
        label: 'Xylophone Pass',
        x: 265,
        y: 225,
        trackT: 0.34,
        scale: 0.56
      },
      {
        id: 'sock-crossing',
        kind: 'track',
        toyKey: 'mod-crossing-gate',
        label: 'Crossing Gate',
        x: 945,
        y: 420,
        trackT: 0.85,
        scale: 0.58
      },
      {
        id: 'sock-trex',
        kind: 'scenery',
        toyKey: 'prop-trex',
        label: 'Canyon T-Rex',
        x: 705,
        y: 325,
        trackT: 0.59,
        scale: 0.58
      },
      {
        id: 'sock-unicorn',
        kind: 'scenery',
        toyKey: 'prop-unicorn-pasture',
        label: 'Unicorn Glade',
        x: 435,
        y: 315,
        trackT: 0.25,
        scale: 0.6
      },
      {
        id: 'sock-water',
        kind: 'scenery',
        toyKey: 'prop-water-tower',
        label: 'Water Tower',
        x: 315,
        y: 485,
        trackT: 0.1,
        scale: 0.56
      },
      {
        id: 'sock-windmill',
        kind: 'scenery',
        toyKey: 'prop-windmill',
        label: 'Mesa Windmill',
        x: 1105,
        y: 265,
        trackT: 0.77,
        scale: 0.58
      },
      {
        id: 'sock-pines',
        kind: 'scenery',
        toyKey: 'prop-pine-forest',
        label: 'Alpine Pines',
        x: 135,
        y: 255,
        trackT: 0.2,
        scale: 0.58
      }
    ]
  }
};

export class TrainTableScene extends Phaser.Scene {
  private audio!: TrainAudioEngine;

  // World & UI layers (World layers zoom with camera follow; UI layers stay pinned to screen!)
  private worldRoot!: Phaser.GameObjects.Container;
  private trackGraphics!: Phaser.GameObjects.Graphics;
  private socketUnderlayContainer!: Phaser.GameObjects.Container;
  private stationContainer!: Phaser.GameObjects.Container;
  private trainConsistContainer!: Phaser.GameObjects.Container;
  private tunnelHoodContainer!: Phaser.GameObjects.Container;
  private worldFxContainer!: Phaser.GameObjects.Container;
  private uiRoot!: Phaser.GameObjects.Container;

  // Active Track Blueprint & Uniform Arc-Length Spline Table
  private currentBlueprintId: TrackBlueprintId = 'meadow';
  private splineSamples: SplineSample[] = [];
  private totalTrackLength = 1800;

  // Placed Toys Map (`socketId -> toyKey`) & Live GameObjects
  private placedToysBySocket: Map<string, string> = new Map();
  private socketVisuals: Map<
    string,
    {
      container: Phaser.GameObjects.Container;
      ringG: Phaser.GameObjects.Graphics;
      toySprite?: Phaser.GameObjects.Image;
      spec: ToySocketSpec;
      lastTriggeredAt: number;
    }
  > = new Map();
  private tunnelHoodSprite: Phaser.GameObjects.Image | null = null;
  private stationCraneArm: Phaser.GameObjects.Graphics | null = null;
  private stationBellSprite: Phaser.GameObjects.Container | null = null;

  // Train Consist State (Locomotive + Red Car, Blue Car, Gold Car)
  private locoDist = 0;
  private throttleNotch = 2; // 0 = STOP, 1..5 = Speed Notches
  private currentSpeedPxPerSec = 110;
  private activeEngineer: EngineerId = 'wyatt';
  private activePassenger: EngineerId = 'emma';

  private locoContainer!: Phaser.GameObjects.Container;
  private locoSprite!: Phaser.GameObjects.Image;
  private locoHeadlightCone!: Phaser.GameObjects.Graphics;
  private locoEngineerBadge!: Phaser.GameObjects.Image;
  private carContainers: Phaser.GameObjects.Container[] = [];
  private carSprites: Phaser.GameObjects.Image[] = [];
  private carCargoContainers: Phaser.GameObjects.Container[] = [];
  private coachPassengerBadge!: Phaser.GameObjects.Image;

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
  private activeDragToyKey: string | null = null;

  // Xylophone & Tunnel & Crossing Gate Trigger Trackers
  private lastXyloBarPlayed = -1;
  private wasInsideTunnel = false;
  private crossingGateArmAngle = 0;

  constructor() {
    super({ key: 'TrainTableScene' });
  }

  public create(): void {
    this.audio = new TrainAudioEngine();

    // Default engineer to the currently active kid profile in ArcadeState!
    const activeKid = ArcadeState.getActiveKid();
    this.activeEngineer = activeKid.id === 'emma' ? 'emma' : 'wyatt';
    this.activePassenger = activeKid.id === 'emma' ? 'doggie' : 'sparky';
    this.throttleNotch = 2;
    this.isCameraFollow = false;
    this.isStoppingForStation = false;
    this.isAtStationModalOpen = false;
    this.currentLoadedCount = 0;
    this.starsEarnedCount = 0;

    // Pre-populate Royal Gorge Bridge and Echo Mountain Tunnel on startup so the table feels rich
    // immediately, while leaving 7 inviting sockets open (or swappable) for discovery!
    this.placedToysBySocket.clear();
    this.placedToysBySocket.set('sock-bridge', 'mod-royal-bridge');
    this.placedToysBySocket.set('sock-tunnel', 'mod-stone-tunnel');

    this.createWorldLayers();
    this.buildTrackBlueprint('meadow', false);
    this.createTrainConsist();
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
    this.socketUnderlayContainer = this.add.container(0, 0);
    this.stationContainer = this.add.container(0, 0);
    this.trainConsistContainer = this.add.container(0, 0);
    this.tunnelHoodContainer = this.add.container(0, 0);
    this.worldFxContainer = this.add.container(0, 0);

    this.worldRoot.add([
      this.trackGraphics,
      this.socketUnderlayContainer,
      this.stationContainer,
      this.trainConsistContainer,
      this.tunnelHoodContainer,
      this.worldFxContainer
    ]);
  }

  // ===========================================================================
  // SPLINE TRACK GENERATOR & MODULAR SOCKET BUILDER
  // ===========================================================================

  private buildTrackBlueprint(blueprintId: TrackBlueprintId, announceVoice = true): void {
    this.currentBlueprintId = blueprintId;
    const bp = TRACK_BLUEPRINTS[blueprintId];

    // 1. Sample closed Catmull-Rom curve into uniform arc-length lookup table
    this.computeUniformSplineTable(bp.controlPoints, 1000);

    // 2. Render multi-layered carved beechwood Brio track along the spline
    this.renderCarvedBeechwoodTrack();

    // 3. Render Grandpa's Wooden Train Depot beside the southern straightaway
    this.renderGrandpasTrainDepot(bp);

    // 4. Render Interactive Track & Scenery Sockets (and any placed toys)
    this.renderSocketsAndPlacedToys(bp);

    // Place locomotive just departing the station
    this.locoDist = bp.stationT * this.totalTrackLength;

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
   * Evaluates a closed Catmull-Rom spline through `pts` and resamples it at 1,000 uniform
   * arc-length steps so train cars maintain rock-solid constant spacing around every curve.
   */
  private computeUniformSplineTable(
    pts: Array<{ x: number; y: number }>,
    numUniformSamples: number
  ): void {
    const n = pts.length;
    const rawCount = n * 80;
    const rawPts: Array<{ x: number; y: number; cumDist: number }> = [];

    const evalCatmullRom = (tGlobal: number): { x: number; y: number } => {
      const scaled = ((tGlobal % 1) + 1) % 1 * n;
      const idx = Math.floor(scaled);
      const u = scaled - idx;

      const p0 = pts[(idx - 1 + n) % n];
      const p1 = pts[idx % n];
      const p2 = pts[(idx + 1) % n];
      const p3 = pts[(idx + 2) % n];

      const u2 = u * u;
      const u3 = u2 * u;

      const x =
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * u +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3);
      const y =
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * u +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3);
      return { x, y };
    };

    let accum = 0;
    let prev = evalCatmullRom(0);
    rawPts.push({ x: prev.x, y: prev.y, cumDist: 0 });

    for (let i = 1; i <= rawCount; i++) {
      const pt = evalCatmullRom(i / rawCount);
      accum += Math.hypot(pt.x - prev.x, pt.y - prev.y);
      rawPts.push({ x: pt.x, y: pt.y, cumDist: accum });
      prev = pt;
    }

    this.totalTrackLength = Math.max(100, accum);
    this.splineSamples = [];

    let rawIdx = 0;
    for (let k = 0; k < numUniformSamples; k++) {
      const targetD = (k / numUniformSamples) * this.totalTrackLength;
      while (rawIdx < rawPts.length - 2 && rawPts[rawIdx + 1].cumDist < targetD) {
        rawIdx++;
      }
      const a = rawPts[rawIdx];
      const b = rawPts[rawIdx + 1];
      const span = Math.max(0.0001, b.cumDist - a.cumDist);
      const frac = Phaser.Math.Clamp((targetD - a.cumDist) / span, 0, 1);
      const x = Phaser.Math.Linear(a.x, b.x, frac);
      const y = Phaser.Math.Linear(a.y, b.y, frac);
      this.splineSamples.push({ x, y, dx: 1, dy: 0, dist: targetD });
    }

    // Compute smooth unit tangent vectors `(dx, dy)`
    const m = this.splineSamples.length;
    for (let k = 0; k < m; k++) {
      const prevS = this.splineSamples[(k - 3 + m) % m];
      const nextS = this.splineSamples[(k + 3) % m];
      const vx = nextS.x - prevS.x;
      const vy = nextS.y - prevS.y;
      const len = Math.max(0.0001, Math.hypot(vx, vy));
      this.splineSamples[k].dx = vx / len;
      this.splineSamples[k].dy = vy / len;
    }
  }

  private sampleSplineAtDist(dist: number): SplineSample {
    const m = this.splineSamples.length;
    if (m === 0) return { x: 640, y: 360, dx: -1, dy: 0, dist: 0 };
    const wrapped = ((dist % this.totalTrackLength) + this.totalTrackLength) % this.totalTrackLength;
    const fIdx = (wrapped / this.totalTrackLength) * m;
    const i0 = Math.floor(fIdx) % m;
    const i1 = (i0 + 1) % m;
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
   * - Classic Brio rounded jigsaw puzzle connectors every 120px
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
    g.closePath();
    g.strokePath();

    // 2. Dark walnut beveled roadbed rim
    g.lineStyle(36, 0x784416, 1);
    g.beginPath();
    for (let i = 0; i < m; i += 2) {
      const s = this.splineSamples[i];
      if (i === 0) g.moveTo(s.x, s.y + 2);
      else g.lineTo(s.x, s.y + 2);
    }
    g.closePath();
    g.strokePath();

    // 3. Warm sanded beechwood top plank
    g.lineStyle(30, 0xdfb178, 1);
    g.beginPath();
    for (let i = 0; i < m; i += 2) {
      const s = this.splineSamples[i];
      if (i === 0) g.moveTo(s.x, s.y);
      else g.lineTo(s.x, s.y);
    }
    g.closePath();
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
      g.closePath();
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
      g.closePath();
      g.strokePath();
    }

    // 6. Classic Brio rounded jigsaw joint lines & pegs every 115px
    const jointStep = Math.max(1, Math.floor((115 / this.totalTrackLength) * m));
    for (let i = 0; i < m; i += jointStep) {
      const s = this.splineSamples[i];
      const nx = -s.dy;
      const ny = s.dx;
      g.lineStyle(2, 0x6b3a12, 0.85);
      g.beginPath();
      g.moveTo(s.x - nx * 15, s.y - ny * 15);
      g.lineTo(s.x + nx * 15, s.y + ny * 15);
      g.strokePath();

      const pegX = s.x + s.dx * 7;
      const pegY = s.y + s.dy * 7;
      g.fillStyle(0xd29c60, 1);
      g.fillCircle(pegX, pegY, 4.5);
      g.lineStyle(1.8, 0x6b3a12, 0.9);
      g.strokeCircle(pegX, pegY, 4.5);
    }
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
    this.stationBellSprite = bellBadge;

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
    // Wooden crane boom
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

    // Braided hoist cable + brass hook
    g.lineStyle(2.5, 0xfef08a, 0.95);
    g.beginPath();
    g.moveTo(hookX, hookY - 22);
    g.lineTo(hookX, hookY);
    g.strokePath();

    g.fillStyle(0xfbbf24, 1);
    g.fillCircle(hookX, hookY, 5);
  }

  // ===========================================================================
  // ACT 1: SNAP-AND-PLAY TRACK MODULES & LIVING DIORAMA SOCKETS
  // ===========================================================================

  private renderSocketsAndPlacedToys(bp: BlueprintConfig): void {
    this.socketUnderlayContainer.removeAll(true);
    this.tunnelHoodContainer.removeAll(true);
    this.socketVisuals.clear();
    this.tunnelHoodSprite = null;

    for (const spec of bp.sockets) {
      let sx = spec.x;
      let sy = spec.y;
      if (spec.kind === 'track' && typeof spec.trackT === 'number') {
        const sample = this.sampleSplineAtDist(spec.trackT * this.totalTrackLength);
        sx = sample.x;
        sy = sample.y;
      }

      const container = this.add.container(sx, sy);
      const ringG = this.add.graphics();
      container.add(ringG);

      const placedKey = this.placedToysBySocket.get(spec.id);
      this.drawSocketRing(ringG, spec.kind, Boolean(placedKey));

      let toySprite: Phaser.GameObjects.Image | undefined;
      if (placedKey && this.textures.exists(placedKey)) {
        this.textures.get(placedKey).setFilter(Phaser.Textures.FilterMode.NEAREST);

        // Soft contact shadow
        const sh = this.add.graphics();
        sh.fillStyle(0x041b11, 0.45);
        sh.fillEllipse(0, 10, 115, 34);
        container.add(sh);

        toySprite = this.add
          .image(0, 0, placedKey)
          .setOrigin(0.5, 0.58)
          .setScale(spec.scale);
        container.add(toySprite);

        // If this is the Echo Mountain Stone Tunnel, also mount a raised 2.5D portal hood
        // above the train layer so the locomotive visibly drives inside the mountain arch!
        if (placedKey === 'mod-stone-tunnel') {
          this.tunnelHoodSprite = this.add
            .image(sx, sy - 6, 'mod-stone-tunnel')
            .setOrigin(0.5, 0.58)
            .setScale(spec.scale * 1.02)
            .setAlpha(0.92);
          this.tunnelHoodContainer.add(this.tunnelHoodSprite);
        }
      } else {
        // Inviting golden socket icon + label for empty sockets
        const badge = this.add
          .text(0, 0, spec.kind === 'track' ? '✨ RAIL' : '🌲 TOY', {
            fontFamily: '"Fredoka", Georgia, serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#fef08a',
            stroke: '#1e1b4b',
            strokeThickness: 3
          })
          .setOrigin(0.5);
        container.add(badge);
      }

      // Interactive >=76x76px hit zone:
      // - If empty: tapping auto-places the matching toy from the drawer with a magnetic arc!
      // - If filled: tapping triggers the toy's interactive animation & sound gag!
      const hitZone = this.add
        .zone(0, 0, 86, 86)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      container.add(hitZone);

      hitZone.on('pointerdown', () => {
        const currentPlaced = this.placedToysBySocket.get(spec.id);
        if (currentPlaced) {
          this.triggerPlacedToyGag(spec.id, true);
        } else {
          this.autoArcToyFromDrawerToSocket(spec.toyKey, spec);
        }
      });

      this.socketUnderlayContainer.add(container);
      this.socketVisuals.set(spec.id, {
        container,
        ringG,
        toySprite,
        spec: { ...spec, x: sx, y: sy },
        lastTriggeredAt: 0
      });
    }

    this.refreshToyDrawerHighlights();
  }

  private drawSocketRing(
    g: Phaser.GameObjects.Graphics,
    kind: 'track' | 'scenery',
    isFilled: boolean
  ): void {
    g.clear();
    if (isFilled) {
      g.lineStyle(2, 0xfef08a, 0.32);
      g.strokeCircle(0, 4, 42);
      return;
    }

    const color = kind === 'track' ? 0xfbbf24 : 0x34d399;
    g.fillStyle(0x064e3b, 0.55);
    g.fillCircle(0, 0, 38);

    // Dotted golden/emerald socket ring
    const segments = 12;
    g.lineStyle(3.5, color, 0.95);
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = a0 + (Math.PI * 2) / (segments * 1.8);
      g.beginPath();
      g.arc(0, 0, 38, a0, a1, false);
      g.strokePath();
    }
  }

  /**
   * Launches a wooden toy from the bottom mahogany drawer in a high bouncy arc into its
   * matching socket on the train table!
   */
  private autoArcToyFromDrawerToSocket(toyKey: string, targetSocket?: ToySocketSpec): void {
    const bp = TRACK_BLUEPRINTS[this.currentBlueprintId];
    const spec =
      targetSocket ??
      bp.sockets.find((s) => s.toyKey === toyKey) ??
      bp.sockets[0];
    if (!spec) return;

    const visual = this.socketVisuals.get(spec.id);
    const destX = visual ? visual.spec.x : spec.x;
    const destY = visual ? visual.spec.y : spec.y;

    const drawerCard = this.drawerCardMap.get(toyKey);
    const startX = drawerCard ? drawerCard.x : 540;
    const startY = drawerCard ? drawerCard.y : 655;

    if (this.textures.exists(toyKey)) {
      const flyer = this.add
        .image(startX, startY, toyKey)
        .setDepth(450)
        .setScale(0.38);

      this.tweens.add({
        targets: flyer,
        x: destX,
        y: destY,
        scaleX: spec.scale,
        scaleY: spec.scale,
        angle: 360,
        duration: 420,
        ease: 'Back.easeOut',
        onComplete: () => {
          flyer.destroy();
          this.snapToyIntoSocket(spec.id, toyKey, true);
        }
      });
    } else {
      this.snapToyIntoSocket(spec.id, toyKey, true);
    }
  }

  private snapToyIntoSocket(socketId: string, toyKey: string, speakConfirmation = true): void {
    this.placedToysBySocket.set(socketId, toyKey);
    const bp = TRACK_BLUEPRINTS[this.currentBlueprintId];
    this.renderSocketsAndPlacedToys(bp);

    const visual = this.socketVisuals.get(socketId);
    if (visual) {
      this.audio.playWoodTrackSnap();
      Juice.burstStars(this, visual.spec.x, visual.spec.y - 12, 16, [0xfef08a, 0xfbbf24, 0x34d399]);
      if (visual.toySprite) {
        const baseScale = visual.spec.scale;
        visual.toySprite.setScale(baseScale * 1.24, baseScale * 0.82);
        this.tweens.add({
          targets: visual.toySprite,
          scaleX: baseScale,
          scaleY: baseScale,
          duration: 280,
          ease: 'Elastic.easeOut'
        });
      }
    }

    const drawerSpec = TOY_DRAWER_ITEMS.find((d) => d.toyKey === toyKey);
    if (speakConfirmation && drawerSpec?.promptId) {
      this.audio.speakPrompt(drawerSpec.promptId);
    } else if (speakConfirmation) {
      this.triggerPlacedToyGag(socketId, true);
    }
  }

  /**
   * Triggers the joyful visual & audio gag of any placed Track Module or Scenery Toy
   * (either when tapped directly by the child OR when the train chugs past!).
   */
  private triggerPlacedToyGag(socketId: string, isDirectTap = false): void {
    const visual = this.socketVisuals.get(socketId);
    if (!visual || !visual.toySprite) return;

    const now = this.time.now;
    if (!isDirectTap && now - visual.lastTriggeredAt < 2600) return;
    visual.lastTriggeredAt = now;

    const toyKey = this.placedToysBySocket.get(socketId);
    const spr = visual.toySprite;
    const baseScale = visual.spec.scale;
    const wx = visual.spec.x;
    const wy = visual.spec.y;

    this.tweens.killTweensOf(spr);
    spr.setScale(baseScale);
    spr.setAngle(0);

    switch (toyKey) {
      case 'mod-royal-bridge': {
        // Suspension bridge cables shimmer & sway gently
        this.tweens.add({
          targets: spr,
          scaleX: baseScale * 1.07,
          scaleY: baseScale * 0.94,
          angle: { from: -2.5, to: 2.5 },
          duration: 130,
          yoyo: true,
          repeat: 2,
          onComplete: () => {
            spr.setScale(baseScale);
            spr.setAngle(0);
          }
        });
        Juice.burstStars(this, wx, wy - 18, 10, [0xfef08a, 0x38bdf8, 0xffffff]);
        if (isDirectTap) {
          this.audio.playWoodTrackSnap();
        }
        break;
      }

      case 'mod-stone-tunnel': {
        // Echo Mountain Stone Tunnel: headlight glow + echoing cavern whistle!
        this.audio.playSteamWhistle(true);
        Juice.popFloatingLabel(this, wx, wy - 44, '🔊 WHOO-WHOO!', '#fef08a');
        if (this.tunnelHoodSprite) {
          this.tweens.add({
            targets: this.tunnelHoodSprite,
            scaleX: baseScale * 1.08,
            scaleY: baseScale * 0.96,
            duration: 160,
            yoyo: true
          });
        }
        break;
      }

      case 'mod-xylophone-track': {
        // Play ascending 6-bar rainbow marimba glissando!
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
        // Clanging railroad crossing gate & flashing red lanterns!
        this.audio.playCrossingBell(true);
        this.tweens.add({
          targets: spr,
          angle: { from: -12, to: 8 },
          duration: 140,
          yoyo: true,
          repeat: 3,
          onComplete: () => spr.setAngle(0)
        });
        Juice.popFloatingLabel(this, wx, wy - 42, '🔔 DING-DING!', '#f87171');
        break;
      }

      case 'prop-trex': {
        // Chomping Friendly T-Rex roars & hops!
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
        // Unicorn rears up with rainbow sparkles!
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
        // Water tower tips spout & dumps a splash of water into the locomotive tender!
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
        // Windmill rocks & gusts breeze stars!
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
        // Pine trees sway with chirping birds!
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
  // TRAIN CONSIST (LOCOMOTIVE + RED, BLUE & GOLD CARS + CAB PORTRAITS)
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
      shadow.fillEllipse(0, 16, 78, 22);
      carCont.add(shadow);

      if (this.textures.exists(key)) {
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      const carSpr = this.add
        .image(0, 0, key)
        .setOrigin(0.5, 0.62)
        .setScale(0.44);
      carCont.add(carSpr);

      // Cargo stack container mounted inside the open hopper/gondola bed of each car
      const cargoStack = this.add.container(0, -14);
      carCont.add(cargoStack);

      // On the Gold Passenger/Treasure Car (index 2), also mount a circular Passenger Portrait badge!
      if (i === 2) {
        const passSpec =
          ENGINEER_SPECS.find((e) => e.id === this.activePassenger) ?? ENGINEER_SPECS[2];
        this.coachPassengerBadge = this.add
          .image(0, -18, passSpec.spriteKey)
          .setOrigin(0.5, 0.5)
          .setScale(0.22);
        carCont.add(this.coachPassengerBadge);
      }

      // Interactive tap on any train car: bounces suspension & blows whistle/chime!
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

    // Create the Crimson & Brass Steam Locomotive (`train-locomotive`)
    this.locoContainer = this.add.container(0, 0);

    const locoShadow = this.add.graphics();
    locoShadow.fillStyle(0x03140c, 0.56);
    locoShadow.fillEllipse(0, 18, 96, 26);
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
      .setOrigin(0.5, 0.64)
      .setScale(0.48);
    this.locoContainer.add(this.locoSprite);

    // Engineer Portrait Badge seated proudly above the locomotive cab window!
    const engSpec =
      ENGINEER_SPECS.find((e) => e.id === this.activeEngineer) ?? ENGINEER_SPECS[1];
    this.locoEngineerBadge = this.add
      .image(16, -26, engSpec.spriteKey)
      .setOrigin(0.5, 0.5)
      .setScale(0.26);
    this.locoContainer.add(this.locoEngineerBadge);

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
    this.updateTrainConsistPositions();
  }

  /**
   * Updates the 2.5D tabletop position and orientation of the Locomotive and its 3 trailing cars.
   * Ensures sprites NEVER flip upside down on the bottom half of the loop by flipping `flipX`
   * based on horizontal travel direction (`dx >= 0`) and keeping the roof/smokestack upright!
   */
  private updateTrainConsistPositions(): void {
    const locoSample = this.sampleSplineAtDist(this.locoDist);
    this.locoContainer.setPosition(locoSample.x, locoSample.y);

    const facingRight = locoSample.dx >= 0;
    this.locoSprite.setFlipX(facingRight);

    // Gentle 2.5D tabletop pitch angle so the locomotive follows slopes naturally while staying upright
    const locoTilt = facingRight
      ? Phaser.Math.Clamp(locoSample.dy * 24, -22, 22)
      : Phaser.Math.Clamp(-locoSample.dy * 24, -22, 22);
    this.locoContainer.setAngle(locoTilt);

    // Position the engineer portrait over the cab side and aim the headlight cone forward
    this.locoEngineerBadge.setX(facingRight ? -18 : 18);
    this.locoHeadlightCone.setScale(facingRight ? -1 : 1, 1);
    this.locoHeadlightCone.setX(facingRight ? 28 : -28);

    // Position the 3 trailing wooden cars at constant 82px arc-length intervals behind the locomotive
    const carSpacing = 82;
    for (let i = 0; i < 3; i++) {
      const carDist = this.locoDist - (i + 1) * carSpacing;
      const carSample = this.sampleSplineAtDist(carDist);
      const carCont = this.carContainers[i];
      const carSpr = this.carSprites[i];
      if (!carCont || !carSpr) continue;

      carCont.setPosition(carSample.x, carSample.y);
      const carRight = carSample.dx >= 0;
      carSpr.setFlipX(carRight);
      const carTilt = carRight
        ? Phaser.Math.Clamp(carSample.dy * 22, -20, 20)
        : Phaser.Math.Clamp(-carSample.dy * 22, -20, 20);
      carCont.setAngle(carTilt);
    }
  }

  /**
   * Emits a puff of pixel-art white & golden starlight steam from the locomotive smokestack!
   */
  private spawnLocomotiveSteamPuff(isBigWhistleBlast = false): void {
    if (!this.locoContainer) return;
    const facingRight = this.locoSprite.flipX;
    const stackX = this.locoContainer.x + (facingRight ? 18 : -18);
    const stackY = this.locoContainer.y - 38;

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

    // Smoothly glide the train to Grandpa's Wooden Train Depot and open the Cargo Loader!
    const bp = TRACK_BLUEPRINTS[this.currentBlueprintId];
    const targetDist = bp.stationT * this.totalTrackLength;
    this.isStoppingForStation = true;
    this.setThrottleNotch(0, false);

    this.tweens.addCounter({
      from: this.locoDist,
      to: targetDist + this.totalTrackLength,
      duration: 620,
      ease: 'Cubic.easeOut',
      onUpdate: (tw) => {
        const val = tw.getValue();
        if (typeof val === 'number') {
          this.locoDist = val % this.totalTrackLength;
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

    // Clear previous cargo sprites from the cars for a fresh loading round
    this.carCargoContainers.forEach((c) => c.removeAll(true));

    const order = CARGO_ORDERS[this.stationOrderIndex % CARGO_ORDERS.length];

    // Speak the station cargo order aloud ("Load three golden logs onto the train.")
    this.time.delayedCall(120, () => {
      this.audio.speakPrompt(order.orderPromptId);
    });

    const modal = this.add.container(640, 255).setDepth(350);
    this.uiRoot.add(modal);
    this.stationModalContainer = modal;

    const cardW = 650;
    const cardH = 290;
    const bg = this.add.graphics();
    // Drop shadow
    bg.fillStyle(0x04120b, 0.72);
    bg.fillRoundedRect(-cardW / 2 + 6, -cardH / 2 + 8, cardW, cardH, 24);
    // Warm mahogany & parchment station order board
    bg.fillStyle(0x271308, 0.97);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 24);
    bg.lineStyle(4, 0xfbbf24, 1);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 24);
    bg.lineStyle(1.5, 0xfef08a, 0.75);
    bg.strokeRoundedRect(-cardW / 2 + 6, -cardH / 2 + 6, cardW - 12, cardH - 12, 18);

    // Recessed platform tray for the 5 tactile cargo items
    bg.fillStyle(0x160a04, 0.94);
    bg.fillRoundedRect(-cardW / 2 + 24, -18, cardW - 48, 108, 16);
    bg.lineStyle(2, 0xb45309, 0.9);
    bg.strokeRoundedRect(-cardW / 2 + 24, -18, cardW - 48, 108, 16);
    modal.add(bg);

    // Header Title + Big Target Number Badge
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

    // Render 5 big tactile cargo items on the station platform
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

        // Animate cargo flying from platform via Grandpa's Crane into the target train car!
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

        this.animateCraneCargoDrop(
          modal.x + ix,
          modal.y + iy,
          order,
          stepCount
        );
      });

      modal.add(itemSlot);
    }

    // Bottom Row inside Modal: Choose Engineer Portraits (`Grandpa`, `Wyatt`, `Emma`, `Doggie`, `Sparky`)
    // + `[ 🚂 ALL ABOARD! GO! ]` launch button!
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

    // Big Green `[ 🚂 ALL ABOARD! ]` Button
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

  /**
   * Swings Grandpa's wooden crane arm, drops the cargo piece into the target train car with
   * a springy *THUNK-BOING!*, squashes the car suspension, and counts aloud (`1..5`)!
   */
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
        this.drawStationCraneArm(craneBaseX, craneBaseY, bp.stationPos.x + 88, bp.stationPos.y + 28);

        // Add stacked cargo inside the target train car's open bed!
        const cargoStack = this.carCargoContainers[order.targetCarIndex];
        if (cargoStack) {
          const offsetX = ((stepCount - 1) % 3 - 1) * 14;
          const offsetY = -Math.floor((stepCount - 1) / 3) * 10;
          const loadedImg = this.add
            .image(offsetX, offsetY, order.spriteKey)
            .setScale(0.26);
          cargoStack.add(loadedImg);
        }

        // Squash & rebound the train car suspension!
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
    if (this.locoEngineerBadge && this.textures.exists(spec.spriteKey)) {
      this.locoEngineerBadge.setTexture(spec.spriteKey);
      Juice.squashAndStretch(this, this.locoEngineerBadge, 0.25, 140);
    }
    this.audio.speakPrompt(spec.promptId);
  }

  // ===========================================================================
  // ACT 3: FIXED HUD, MAHOGANY TOY DRAWER, BRASS THROTTLE & WHISTLE PULL-CORD
  // ===========================================================================

  private createFixedUILayer(): void {
    this.uiRoot = this.add.container(0, 0).setDepth(200);
    // Pin UI root to screen coordinates so Camera Follow zoom (`1.55x`) only zooms the train table!
    this.uiRoot.setScrollFactor(0);

    this.createTopBarHUD();
    this.createHangingWhistlePullCord();
    this.createBottomMahoganyToyDrawer();
    this.createBrassThrottleControlPanel();
  }

  private createTopBarHUD(): void {
    // 1. Top-Left Home `[ 🏠 ARCADE SHELF ]` Button (`x: 96, y: 38`, `>=64px` hit area)
    const homeBtn = this.add.container(98, 38);
    const homeG = this.add.graphics();
    homeG.fillStyle(0x271206, 0.95);
    homeG.fillRoundedRect(-82, -24, 164, 48, 16);
    homeG.lineStyle(2.5, 0xfbbf24, 1);
    homeG.strokeRoundedRect(-82, -24, 164, 48, 16);
    const homeTxt = this.add
      .text(0, 0, '⬅ ARCADE', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    homeBtn.add([homeG, homeTxt]);

    Juice.makeTactileButton(
      this,
      homeBtn,
      170,
      64,
      () => {
        this.audio.shutdown();
        this.scene.start('HubScene');
      },
      'pop'
    );
    this.uiRoot.add(homeBtn);

    // 2. Quick Engineer Selector Pill (`x: 345, y: 38`)
    const engBar = this.add.container(355, 38);
    const engBg = this.add.graphics();
    engBg.fillStyle(0x271206, 0.94);
    engBg.fillRoundedRect(-155, -24, 310, 48, 16);
    engBg.lineStyle(2, 0xd97706, 0.95);
    engBg.strokeRoundedRect(-155, -24, 310, 48, 16);
    engBar.add(engBg);

    ENGINEER_SPECS.forEach((spec, idx) => {
      const bx = -116 + idx * 58;
      const bCont = this.add.container(bx, 0);
      const bCircle = this.add.graphics();
      bCircle.fillStyle(0x140904, 1);
      bCircle.fillCircle(0, 0, 19);
      bCircle.lineStyle(2, spec.accentColor, 0.95);
      bCircle.strokeCircle(0, 0, 19);

      const bImg = this.add
        .image(0, 0, spec.spriteKey)
        .setOrigin(0.5)
        .setScale(0.23);
      bCont.add([bCircle, bImg]);

      Juice.makeTactileButton(
        this,
        bCont,
        54,
        64,
        () => {
          this.selectEngineer(spec.id);
          Juice.burstStars(this, 355 + bx, 38, 8, [spec.accentColor, 0xfef08a]);
        },
        'pop'
      );
      engBar.add(bCont);
    });
    this.uiRoot.add(engBar);

    // 3. Track Blueprint Switcher Button (`x: 640, y: 38`)
    const bpBtn = this.add.container(645, 38);
    const bpG = this.add.graphics();
    bpG.fillStyle(0x271206, 0.95);
    bpG.fillRoundedRect(-115, -24, 230, 48, 16);
    bpG.lineStyle(2.5, 0xfbbf24, 1);
    bpG.strokeRoundedRect(-115, -24, 230, 48, 16);

    this.blueprintBtnText = this.add
      .text(0, 0, '🗺️ 1. Meadow Oval', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    bpBtn.add([bpG, this.blueprintBtnText]);

    Juice.makeTactileButton(
      this,
      bpBtn,
      234,
      64,
      () => {
        const order: TrackBlueprintId[] = ['meadow', 'gorge', 'canyon'];
        const nextIdx = (order.indexOf(this.currentBlueprintId) + 1) % order.length;
        this.buildTrackBlueprint(order[nextIdx], true);
      },
      'tab'
    );
    this.uiRoot.add(bpBtn);

    // 4. Camera Follow / Bird's-Eye Zoom Toggle Button (`🔍 FOLLOW TRAIN`, `x: 890, y: 38`)
    const camBtn = this.add.container(895, 38);
    this.cameraFollowBtnBg = this.add.graphics();
    this.cameraFollowBtnText = this.add
      .text(0, 0, '🔍 FOLLOW TRAIN', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    camBtn.add([this.cameraFollowBtnBg, this.cameraFollowBtnText]);
    this.redrawCameraFollowButton();

    Juice.makeTactileButton(
      this,
      camBtn,
      196,
      64,
      () => {
        this.toggleCameraFollowMode();
      },
      'pop'
    );
    this.uiRoot.add(camBtn);

    // 5. Star Counter Pill (`x: 1055, y: 38`)
    const starPill = this.add.container(1058, 38);
    const starG = this.add.graphics();
    starG.fillStyle(0x271206, 0.94);
    starG.fillRoundedRect(-48, -22, 96, 44, 14);
    starG.lineStyle(2, 0xfbbf24, 1);
    starG.strokeRoundedRect(-48, -22, 96, 44, 14);
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
    this.cameraFollowBtnBg.fillRoundedRect(-96, -24, 192, 48, 16);
    this.cameraFollowBtnBg.lineStyle(2.5, this.isCameraFollow ? 0x34d399 : 0xfbbf24, 1);
    this.cameraFollowBtnBg.strokeRoundedRect(-96, -24, 192, 48, 16);
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

    hit.on('drag', (_pointer: Phaser.Input.Pointer, _dragX: number, dragY: number) => {
      const pull = Phaser.Math.Clamp(dragY - 108, 0, 58);
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

    // Braided golden rope from top bezel down to whistle tassel
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

    // Braided knots along the cord
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
   * Bottom Mahogany Toy Drawer (`x: 24..855, y: 584..708`):
   * Houses the 9 chunky 32-bit wooden toys (4 Special Track Modules + 5 Scenery Toys)
   * with both Drag-and-Drop and 1-Tap Auto-Arc Magnetic Placement!
   */
  private createBottomMahoganyToyDrawer(): void {
    this.drawerContainer = this.add.container(0, 0);
    this.drawerCardMap.clear();

    const drawerBg = this.add.graphics();
    drawerBg.fillStyle(0x1f0f06, 0.95);
    drawerBg.fillRoundedRect(22, 586, 842, 122, 18);
    drawerBg.lineStyle(3, 0xd97706, 1);
    drawerBg.strokeRoundedRect(22, 586, 842, 122, 18);
    drawerBg.lineStyle(1, 0xfef08a, 0.65);
    drawerBg.strokeRoundedRect(26, 590, 834, 114, 15);
    this.drawerContainer.add(drawerBg);

    const startX = 72;
    const spacing = 86;
    const cy = 646;

    TOY_DRAWER_ITEMS.forEach((item, idx) => {
      const cx = startX + idx * spacing;
      const card = this.add.container(cx, cy);

      const cardG = this.add.graphics();
      cardG.fillStyle(0x2e170a, 0.96);
      cardG.fillRoundedRect(-38, -48, 76, 96, 12);
      cardG.lineStyle(2, item.badgeColor, 0.95);
      cardG.strokeRoundedRect(-38, -48, 76, 96, 12);
      card.add(cardG);

      if (this.textures.exists(item.toyKey)) {
        this.textures.get(item.toyKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
        const icon = this.add
          .image(0, -8, item.toyKey)
          .setOrigin(0.5)
          .setScale(0.28);
        card.add(icon);
      }

      const shortLbl = this.add
        .text(0, 32, item.title.split(' ').slice(-1)[0], {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#fef08a'
        })
        .setOrigin(0.5);
      card.add(shortLbl);

      const hit = this.add
        .zone(0, 0, 82, 102)
        .setOrigin(0.5)
        .setInteractive({ draggable: true, useHandCursor: true });
      card.add(hit);

      let draggedDistance = 0;

      hit.on('dragstart', (pointer: Phaser.Input.Pointer) => {
        draggedDistance = 0;
        this.activeDragToyKey = item.toyKey;
        if (this.activeDragGhost) {
          this.activeDragGhost.destroy();
        }
        this.activeDragGhost = this.add
          .image(pointer.x, pointer.y, item.toyKey)
          .setDepth(500)
          .setScale(0.54)
          .setAlpha(0.92);
      });

      hit.on('drag', (pointer: Phaser.Input.Pointer) => {
        draggedDistance += Math.hypot(pointer.velocity.x, pointer.velocity.y) + 4;
        if (this.activeDragGhost) {
          this.activeDragGhost.setPosition(pointer.x, pointer.y);
        }
      });

      hit.on('dragend', (pointer: Phaser.Input.Pointer) => {
        if (this.activeDragGhost) {
          this.activeDragGhost.destroy();
          this.activeDragGhost = null;
        }
        const draggedKey = this.activeDragToyKey;
        this.activeDragToyKey = null;

        if (!draggedKey) return;

        // If it was a quick tap (or dropped still over the drawer), auto-arc into its matching socket!
        if (draggedDistance < 24 || pointer.y > 565) {
          Juice.squashAndStretch(this, card, 0.2, 130);
          this.autoArcToyFromDrawerToSocket(draggedKey);
          return;
        }

        // Find nearest compatible socket (or matching socket)
        const bp = TRACK_BLUEPRINTS[this.currentBlueprintId];
        const matchingSocket = bp.sockets.find((s) => s.toyKey === draggedKey);
        if (matchingSocket) {
          this.snapToyIntoSocket(matchingSocket.id, draggedKey, true);
        }
      });

      this.drawerContainer.add(card);
      this.drawerCardMap.set(item.toyKey, card);
    });

    this.uiRoot.add(this.drawerContainer);
    this.refreshToyDrawerHighlights();
  }

  private refreshToyDrawerHighlights(): void {
    const placedSet = new Set<string>(this.placedToysBySocket.values());
    this.drawerCardMap.forEach((card, toyKey) => {
      card.setAlpha(placedSet.has(toyKey) ? 0.78 : 1.0);
    });
  }

  /**
   * Bottom-Right Brass & Mahogany Engineer Control Panel (`x: 876..1258, y: 586..708`):
   * Features the 5-Notch Brass Throttle Lever (`STOP`, `1`, `2`, `3`, `4`, `5`) and
   * Station Stop/Load button!
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

    // Brass quadrant slot groove (`x: 916..1220, y: 654`)
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
      const nx = 924 + n * 56;
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

      // Direct tap zone for each throttle notch (`56x86px`)
      const nZone = this.add
        .zone(nx, 658, 56, 86)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      nZone.on('pointerdown', () => {
        this.setThrottleNotch(n, true);
      });
      panel.add(nZone);
    }

    // Heavy Crimson & Brass Draggable Throttle Lever Handle
    this.throttleHandle = this.add.container(924 + this.throttleNotch * 56, 650);
    const hG = this.add.graphics();
    // Brass shaft
    hG.fillStyle(0xd97706, 1);
    hG.fillRoundedRect(-7, -24, 14, 38, 5);
    hG.lineStyle(2, 0xfef08a, 1);
    hG.strokeRoundedRect(-7, -24, 14, 38, 5);
    // Crimson grip knob
    hG.fillStyle(0xdc2626, 1);
    hG.fillRoundedRect(-20, -34, 40, 22, 10);
    hG.lineStyle(2.5, 0xfef08a, 1);
    hG.strokeRoundedRect(-20, -34, 40, 22, 10);
    this.throttleHandle.add(hG);

    const handleHit = this.add
      .zone(0, -12, 68, 78)
      .setOrigin(0.5)
      .setInteractive({ draggable: true, useHandCursor: true });
    this.throttleHandle.add(handleHit);

    handleHit.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
      const clampedX = Phaser.Math.Clamp(dragX, 924, 924 + 5 * 56);
      this.throttleHandle.setX(clampedX);
      const nearestNotch = Math.round((clampedX - 924) / 56);
      if (nearestNotch !== this.throttleNotch) {
        this.setThrottleNotch(nearestNotch, true);
      }
    });

    handleHit.on('dragend', () => {
      this.throttleHandle.setX(924 + this.throttleNotch * 56);
    });

    panel.add(this.throttleHandle);
    this.uiRoot.add(panel);
  }

  private setThrottleNotch(notch: number, playAudioFeedback = true): void {
    const clamped = Phaser.Math.Clamp(notch, 0, 5);
    this.throttleNotch = clamped;

    if (this.throttleHandle) {
      this.tweens.add({
        targets: this.throttleHandle,
        x: 924 + clamped * 56,
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
      this.locoDist =
        (this.locoDist + this.currentSpeedPxPerSec * dtSec) % this.totalTrackLength;
      this.updateTrainConsistPositions();
    }

    // 2. Check proximity to placed Track Modules & Living Scenery Toys
    let isInsideTunnelNow = false;
    this.socketVisuals.forEach((visual, socketId) => {
      const placedKey = this.placedToysBySocket.get(socketId);
      if (!placedKey || !this.locoContainer) return;

      const distToLoco = Math.hypot(
        this.locoContainer.x - visual.spec.x,
        this.locoContainer.y - visual.spec.y
      );

      if (placedKey === 'mod-stone-tunnel' && distToLoco < 86) {
        isInsideTunnelNow = true;
      }

      // Rainbow Xylophone Melodic Track: play each bar as the locomotive rolls over!
      if (placedKey === 'mod-xylophone-track' && distToLoco < 68 && this.throttleNotch > 0) {
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

      // Trigger placed toy gag when the locomotive chugs past!
      if (this.throttleNotch > 0 && distToLoco < 78) {
        this.triggerPlacedToyGag(socketId, false);
      }
    });

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
