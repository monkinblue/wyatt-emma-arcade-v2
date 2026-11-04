import Phaser from 'phaser';
import { AudioBus } from '../core/AudioBus';
import { Juice } from '../core/Juice';
import { UnicornAudioEngine } from '../audio/UnicornAudioEngine';

type RoyalRoomId = 'SPA_SALON' | 'TEA_PARTY' | 'STICKER_KINGDOM';

type ManeColorId = 'PINK' | 'BLUE' | 'LAVENDER' | 'GOLD';

interface ManeColorSpec {
  id: ManeColorId;
  tint: number;
  hex: string;
  voiceKey: string;
  potionTex: string;
}

type GemShapeId = 'CIRCLE' | 'HEART' | 'STAR' | 'SQUARE' | 'TRIANGLE';

interface GemPuzzleSpec {
  id: GemShapeId;
  texKey: string;
  voiceKey: string;
  accentColor: number;
  socketX: number;
  socketY: number;
  trayX: number;
  trayY: number;
}

type TreatKindId = 'CUPCAKE' | 'COOKIE' | 'HEART' | 'BERRY';

interface TreatKindSpec {
  id: TreatKindId;
  texKey: string;
  summaryPromptId: string;
  accentColor: number;
  standOffsetX: number;
  standOffsetY: number;
}

type CareNeedId = 'CHILLY' | 'SLEEPY' | 'TICKLE';

interface CareItemSpec {
  id: CareNeedId;
  texKey: string;
  promptId: string;
  bubbleEmoji: string;
  accentColor: number;
  trayX: number;
  trayY: number;
}

type StickerCategoryId = 'UNICORNS' | 'FRIENDS' | 'JEWELS' | 'SWEETS' | 'KINGDOM';

type StickerAnimStyle = 'FLUTTER' | 'TWIRL' | 'SPARKLE' | 'BOUNCE' | 'FLOAT';

interface StickerCatalogItem {
  id: string;
  texKey: string;
  category: StickerCategoryId;
  animStyle: StickerAnimStyle;
  baseScale: number;
  tapSound: 'UNICORN' | 'FANFARE' | 'CHIME' | 'SPARKY' | 'DOGGIE';
}

interface PlacedStickerActor {
  uid: number;
  spec: StickerCatalogItem;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  idleTween: Phaser.Tweens.Tween;
}

type KingdomBackdropId = 'MEADOW' | 'BALLROOM' | 'BEDROOM';

interface SpatialPromptSpec {
  promptId: string;
  iconTex: string;
  arrowSymbol: string;
  checkZone: (x: number, y: number, placed: PlacedStickerActor[]) => boolean;
}

const MANE_COLORS: Record<ManeColorId, ManeColorSpec> = {
  PINK: {
    id: 'PINK',
    tint: 0xfb7185,
    hex: '#fb7185',
    voiceKey: 'color_pink',
    potionTex: 'spa-potion-pink'
  },
  BLUE: {
    id: 'BLUE',
    tint: 0x38bdf8,
    hex: '#38bdf8',
    voiceKey: 'color_blue',
    potionTex: 'spa-potion-blue'
  },
  LAVENDER: {
    id: 'LAVENDER',
    tint: 0xc084fc,
    hex: '#c084fc',
    voiceKey: 'color_lavender',
    potionTex: 'spa-potion-gold'
  },
  GOLD: {
    id: 'GOLD',
    tint: 0xfacc15,
    hex: '#facc15',
    voiceKey: 'color_gold',
    potionTex: 'spa-potion-gold'
  }
};

const GEM_PUZZLE_SPECS: GemPuzzleSpec[] = [
  {
    id: 'CIRCLE',
    texKey: 'gem-circle-ruby',
    voiceKey: 'red_circle',
    accentColor: 0xf43f5e,
    socketX: 430,
    socketY: 162,
    trayX: 430,
    trayY: 256
  },
  {
    id: 'HEART',
    texKey: 'gem-heart-quartz',
    voiceKey: 'pink_heart',
    accentColor: 0xfb7185,
    socketX: 535,
    socketY: 146,
    trayX: 535,
    trayY: 256
  },
  {
    id: 'STAR',
    texKey: 'gem-star-topaz',
    voiceKey: 'yellow_star',
    accentColor: 0xfacc15,
    socketX: 640,
    socketY: 134,
    trayX: 640,
    trayY: 256
  },
  {
    id: 'SQUARE',
    texKey: 'gem-square-emerald',
    voiceKey: 'green_square',
    accentColor: 0x34d399,
    socketX: 745,
    socketY: 146,
    trayX: 745,
    trayY: 256
  },
  {
    id: 'TRIANGLE',
    texKey: 'gem-triangle-sapphire',
    voiceKey: 'blue_triangle',
    accentColor: 0x38bdf8,
    socketX: 850,
    socketY: 162,
    trayX: 850,
    trayY: 256
  }
];

const TREAT_SPECS: TreatKindSpec[] = [
  {
    id: 'CUPCAKE',
    texKey: 'treat-cupcake',
    summaryPromptId: 'tea_count_cupcakes',
    accentColor: 0xfb7185,
    standOffsetX: -32,
    standOffsetY: -68
  },
  {
    id: 'COOKIE',
    texKey: 'treat-star-cookie',
    summaryPromptId: 'tea_count_cookies',
    accentColor: 0xfacc15,
    standOffsetX: 32,
    standOffsetY: -68
  },
  {
    id: 'HEART',
    texKey: 'treat-sugar-heart',
    summaryPromptId: 'tea_count_hearts',
    accentColor: 0xf43f5e,
    standOffsetX: -36,
    standOffsetY: 2
  },
  {
    id: 'BERRY',
    texKey: 'treat-rainbow-berry',
    summaryPromptId: 'tea_count_berries',
    accentColor: 0x38bdf8,
    standOffsetX: 36,
    standOffsetY: 2
  }
];

const CARE_ITEMS: CareItemSpec[] = [
  {
    id: 'CHILLY',
    texKey: 'care-velvet-blanket',
    promptId: 'tea_care_blanket',
    bubbleEmoji: '❄️',
    accentColor: 0xfb7185,
    trayX: 1185,
    trayY: 245
  },
  {
    id: 'SLEEPY',
    texKey: 'care-starlight-pillow',
    promptId: 'tea_care_pillow',
    bubbleEmoji: '🌙',
    accentColor: 0x38bdf8,
    trayX: 1185,
    trayY: 365
  },
  {
    id: 'TICKLE',
    texKey: 'care-feather-wand',
    promptId: 'tea_care_tickle',
    bubbleEmoji: '🪶',
    accentColor: 0xfacc15,
    trayX: 1185,
    trayY: 485
  }
];

const STICKER_CATALOG: StickerCatalogItem[] = [
  // Category 1: Unicorns & Baby Pegasi (6)
  { id: 'stk-unicorn-prance', texKey: 'stk-unicorn-prance', category: 'UNICORNS', animStyle: 'FLUTTER', baseScale: 0.72, tapSound: 'UNICORN' },
  { id: 'stk-baby-pegasus-blue', texKey: 'stk-baby-pegasus-blue', category: 'UNICORNS', animStyle: 'FLUTTER', baseScale: 0.68, tapSound: 'UNICORN' },
  { id: 'stk-baby-unicorn-gold', texKey: 'stk-baby-unicorn-gold', category: 'UNICORNS', animStyle: 'BOUNCE', baseScale: 0.68, tapSound: 'UNICORN' },
  { id: 'stk-unicorn-sleepy', texKey: 'stk-unicorn-sleepy', category: 'UNICORNS', animStyle: 'FLOAT', baseScale: 0.68, tapSound: 'CHIME' },
  { id: 'stk-pegasus-rainbow', texKey: 'stk-pegasus-rainbow', category: 'UNICORNS', animStyle: 'FLUTTER', baseScale: 0.72, tapSound: 'UNICORN' },
  { id: 'stk-unicorn-carousel', texKey: 'stk-unicorn-carousel', category: 'UNICORNS', animStyle: 'BOUNCE', baseScale: 0.72, tapSound: 'FANFARE' },

  // Category 2: Princess Emma & Friends Poses (6)
  { id: 'stk-emma-curtsy', texKey: 'stk-emma-curtsy', category: 'FRIENDS', animStyle: 'TWIRL', baseScale: 0.72, tapSound: 'FANFARE' },
  { id: 'stk-emma-twirl', texKey: 'stk-emma-twirl', category: 'FRIENDS', animStyle: 'TWIRL', baseScale: 0.72, tapSound: 'FANFARE' },
  { id: 'stk-sparky-prince', texKey: 'stk-sparky-prince', category: 'FRIENDS', animStyle: 'BOUNCE', baseScale: 0.7, tapSound: 'SPARKY' },
  { id: 'stk-doggie-jester', texKey: 'stk-doggie-jester', category: 'FRIENDS', animStyle: 'BOUNCE', baseScale: 0.7, tapSound: 'DOGGIE' },
  { id: 'stk-fairy-butterfly', texKey: 'stk-fairy-butterfly', category: 'FRIENDS', animStyle: 'FLUTTER', baseScale: 0.64, tapSound: 'CHIME' },
  { id: 'stk-royal-swan', texKey: 'stk-royal-swan', category: 'FRIENDS', animStyle: 'FLOAT', baseScale: 0.68, tapSound: 'CHIME' },

  // Category 3: Crowns, Bows & Jewels (6)
  { id: 'stk-diamond-crown', texKey: 'stk-diamond-crown', category: 'JEWELS', animStyle: 'SPARKLE', baseScale: 0.68, tapSound: 'CHIME' },
  { id: 'stk-crystal-slipper', texKey: 'stk-crystal-slipper', category: 'JEWELS', animStyle: 'SPARKLE', baseScale: 0.66, tapSound: 'CHIME' },
  { id: 'stk-magic-scepter', texKey: 'stk-magic-scepter', category: 'JEWELS', animStyle: 'TWIRL', baseScale: 0.68, tapSound: 'FANFARE' },
  { id: 'stk-treasure-chest', texKey: 'stk-treasure-chest', category: 'JEWELS', animStyle: 'SPARKLE', baseScale: 0.68, tapSound: 'FANFARE' },
  { id: 'stk-heart-locket', texKey: 'stk-heart-locket', category: 'JEWELS', animStyle: 'FLOAT', baseScale: 0.66, tapSound: 'CHIME' },
  { id: 'stk-wing-bow', texKey: 'acc-wing-bow', category: 'JEWELS', animStyle: 'TWIRL', baseScale: 0.68, tapSound: 'CHIME' },

  // Category 4: Sweets & Tea Sets (6)
  { id: 'stk-birthday-cake', texKey: 'stk-birthday-cake', category: 'SWEETS', animStyle: 'BOUNCE', baseScale: 0.7, tapSound: 'FANFARE' },
  { id: 'stk-icecream-sundae', texKey: 'stk-icecream-sundae', category: 'SWEETS', animStyle: 'BOUNCE', baseScale: 0.68, tapSound: 'CHIME' },
  { id: 'stk-macaron-tower', texKey: 'stk-macaron-tower', category: 'SWEETS', animStyle: 'SPARKLE', baseScale: 0.68, tapSound: 'CHIME' },
  { id: 'stk-candy-carriage', texKey: 'stk-candy-carriage', category: 'SWEETS', animStyle: 'BOUNCE', baseScale: 0.74, tapSound: 'FANFARE' },
  { id: 'stk-cupcake-treat', texKey: 'treat-cupcake', category: 'SWEETS', animStyle: 'BOUNCE', baseScale: 0.72, tapSound: 'CHIME' },
  { id: 'stk-royal-teapot', texKey: 'tea-teapot', category: 'SWEETS', animStyle: 'FLOAT', baseScale: 0.66, tapSound: 'CHIME' },

  // Category 5: Rainbows, Castles & Pets (5) -> Total 29 distinct stickers!
  { id: 'stk-rainbow-arch', texKey: 'stk-rainbow-arch', category: 'KINGDOM', animStyle: 'FLOAT', baseScale: 0.82, tapSound: 'FANFARE' },
  { id: 'stk-royal-kitten', texKey: 'stk-royal-kitten', category: 'KINGDOM', animStyle: 'BOUNCE', baseScale: 0.68, tapSound: 'CHIME' },
  { id: 'stk-hot-air-balloon', texKey: 'stk-hot-air-balloon', category: 'KINGDOM', animStyle: 'FLOAT', baseScale: 0.76, tapSound: 'FANFARE' },
  { id: 'stk-castle-musicbox', texKey: 'hub-toy-unicorn', category: 'KINGDOM', animStyle: 'SPARKLE', baseScale: 0.42, tapSound: 'FANFARE' },
  { id: 'stk-starlight-pillow', texKey: 'care-starlight-pillow', category: 'KINGDOM', animStyle: 'FLOAT', baseScale: 0.66, tapSound: 'CHIME' }
];

const SPATIAL_PROMPTS: SpatialPromptSpec[] = [
  {
    promptId: 'spatial_high_sky',
    iconTex: 'stk-rainbow-arch',
    arrowSymbol: '⬆️☁️',
    checkZone: (_x, y) => y < 235
  },
  {
    promptId: 'spatial_next_to_emma',
    iconTex: 'stk-baby-unicorn-gold',
    arrowSymbol: '👧🏽↔️🦄',
    checkZone: (x, y, placed) => {
      const emma = placed.find((p) => p.spec.id.includes('emma'));
      if (emma) {
        return Phaser.Math.Distance.Between(x, y, emma.container.x, emma.container.y) < 220;
      }
      return y > 240 && y < 480;
    }
  },
  {
    promptId: 'spatial_on_stairs',
    iconTex: 'stk-emma-curtsy',
    arrowSymbol: '👑✨',
    checkZone: (x, y) => x > 520 && y > 210 && y < 480
  },
  {
    promptId: 'spatial_by_water',
    iconTex: 'stk-royal-swan',
    arrowSymbol: '💧🦢',
    checkZone: (x, y) => x < 640 && y > 280
  }
];

/**
 * Princess Emma's Unicorn Castle (`UnicornCastleScene.ts`)
 * ========================================================
 * A Nintendo-polished, 32-bit Hi-Bit Pixel Art pretend-play, unicorn salon,
 * royal tea party, and animated sticker-kingdom game for 3-year-old Emma.
 *
 * Zero-reading pure-picture UI with 3 seamless Royal Rooms:
 * - ACT 1 (`SPA_SALON`): Royal Unicorn Spa, Mane Color Mixing & Tiara Shape-Sorting Salon
 * - ACT 2 (`TEA_PARTY`): Royal Castle Tea Party, 1-5 Cupcake Bakery & Kindness Caretaking
 * - ACT 3 (`STICKER_KINGDOM`): Enchanted Living Sticker Kingdom with 3 switchable 1280x720 backdrops
 */
export class UnicornCastleScene extends Phaser.Scene {
  private audio!: UnicornAudioEngine;
  private activeRoom: RoyalRoomId = 'SPA_SALON';
  private goldenStarsEarned = 0;

  // Root Room Containers & Shared HUD
  private bgImage!: Phaser.GameObjects.Image;
  private ambientParticlesContainer!: Phaser.GameObjects.Container;
  private spaRoomContainer!: Phaser.GameObjects.Container;
  private teaRoomContainer!: Phaser.GameObjects.Container;
  private stickerRoomContainer!: Phaser.GameObjects.Container;
  private hudContainer!: Phaser.GameObjects.Container;
  private roomButtons: Map<RoyalRoomId, Phaser.GameObjects.Container> = new Map();
  private starScoreText!: Phaser.GameObjects.Text;

  // ===========================================================================
  // ACT 1 STATE: ROYAL UNICORN SPA & TIARA SHAPE SALON
  // ===========================================================================
  private maneSectionColors: ManeColorId[] = ['PINK', 'LAVENDER', 'PINK', 'LAVENDER'];
  private wishPatternColors: ManeColorId[] = ['PINK', 'BLUE', 'PINK', 'BLUE'];
  private wishPatternIndex = 0;
  private activePotionColor: ManeColorId = 'PINK';
  private wearingSaddle = true;
  private wearingBow = true;
  private wearingTiara = true;
  private gemTrayOpen = false;
  private socketedGems: Set<GemShapeId> = new Set();

  private spaEmmaSprite!: Phaser.GameObjects.Image;
  private spaUnicornContainer!: Phaser.GameObjects.Container;
  private spaUnicornSprite!: Phaser.GameObjects.Image;
  private spaSaddleSprite!: Phaser.GameObjects.Image;
  private spaBowSprite!: Phaser.GameObjects.Image;
  private spaTiaraSprite!: Phaser.GameObjects.Image;
  private spaCrownGemsGfx!: Phaser.GameObjects.Graphics;
  private spaManeLocksGfx!: Phaser.GameObjects.Graphics;
  private spaSoapBubblesContainer!: Phaser.GameObjects.Container;
  private spaSoapBubbleSprites: Phaser.GameObjects.Image[] = [];
  private spaWishBubbleContainer!: Phaser.GameObjects.Container;
  private spaWishSwatchesGfx!: Phaser.GameObjects.Graphics;
  private spaGemModalContainer!: Phaser.GameObjects.Container;
  private spaGemSprites: Map<GemShapeId, Phaser.GameObjects.Image> = new Map();
  private spaSocketCheckSprites: Map<GemShapeId, Phaser.GameObjects.Image> = new Map();

  // ===========================================================================
  // ACT 2 STATE: ROYAL CASTLE TEA PARTY & CUPCAKE BAKERY
  // ===========================================================================
  private teaGuestSprites: Phaser.GameObjects.Image[] = [];
  private teaGuestCupFill: number[] = [0, 0, 0, 0]; // 0..1 for each of the 4 guests
  private teaGuestCupGfx: Phaser.GameObjects.Graphics[] = [];
  private teaPlateContainers: Phaser.GameObjects.Container[] = [];
  private teaActiveGuestIdx = 1; // 0: Emma, 1: Unicorn, 2: Sparky, 3: Doggie
  private teaTargetTreatKind: TreatKindId = 'CUPCAKE';
  private teaTargetCount = 3; // 1..5
  private teaServedCount = 0;
  private teaCareGuestIdx = 3; // Guest currently showing an emotion caretaking bubble
  private teaActiveCareNeed: CareNeedId = 'CHILLY';
  private teaWishBubbleContainer!: Phaser.GameObjects.Container;
  private teaCareBubbleContainer!: Phaser.GameObjects.Container;
  private teaCareBlanketOverlay!: Phaser.GameObjects.Image;
  private teaCarePillowOverlay!: Phaser.GameObjects.Image;
  private teaPourStreamGfx!: Phaser.GameObjects.Graphics;
  private teaOrderCelebrated = false;

  // ===========================================================================
  // ACT 3 STATE: EMMA'S ENCHANTED LIVING STICKER KINGDOM
  // ===========================================================================
  private activeBackdrop: KingdomBackdropId = 'MEADOW';
  private activeStickerCategory: StickerCategoryId = 'UNICORNS';
  private placedStickersLayer!: Phaser.GameObjects.Container;
  private stickerDrawerItemsContainer!: Phaser.GameObjects.Container;
  private stickerCategoryTabButtons: Map<StickerCategoryId, Phaser.GameObjects.Container> = new Map();
  private backdropButtons: Map<KingdomBackdropId, Phaser.GameObjects.Container> = new Map();
  private placedStickers: PlacedStickerActor[] = [];
  private nextStickerUid = 1;
  private spatialPromptIdx = 0;
  private spatialPromptBubble!: Phaser.GameObjects.Container;
  private spatialPromptIcon!: Phaser.GameObjects.Image;
  private spatialPromptArrowTxt!: Phaser.GameObjects.Text;
  private stickerBoxContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'UnicornCastleScene' });
  }

  public create(): void {
    this.audio = new UnicornAudioEngine();
    this.activeRoom = 'SPA_SALON';
    this.goldenStarsEarned = 0;
    this.socketedGems.clear();
    this.placedStickers = [];

    this.applyNearestFilterToTextures();
    this.createSharedBackdropAndAmbientSparkles();

    this.spaRoomContainer = this.add.container(0, 0).setDepth(20);
    this.teaRoomContainer = this.add.container(0, 0).setDepth(20).setVisible(false);
    this.stickerRoomContainer = this.add.container(0, 0).setDepth(20).setVisible(false);
    this.hudContainer = this.add.container(0, 0).setDepth(100);

    this.buildAct1SpaSalonRoom();
    this.buildAct2TeaPartyRoom();
    this.buildAct3StickerKingdomRoom();
    this.buildBottomRoomDockAndTopHud();

    // Start in Act 1 silently so HubScene's single welcome_title.mp3 plays cleanly without double-echoing
    this.switchRoyalRoom('SPA_SALON', false);

    this.cameras.main.fadeIn(260, 24, 12, 28);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.audio.stopVoice();
    });
  }

  private applyNearestFilterToTextures(): void {
    const texKeys = [
      'hub-toy-unicorn',
      'unicorn-spa-bg',
      'unicorn-teaparty-bg',
      'unicorn-sticker-meadow-bg',
      'unicorn-sticker-ballroom-bg',
      'unicorn-sticker-bedroom-bg',
      'char-emma-princess',
      'char-emma-wand',
      'char-unicorn-base',
      'char-unicorn-happy',
      'char-sparky-bowtie',
      'char-doggie-crown',
      'acc-royal-saddle',
      'acc-royal-tiara',
      'spa-potion-pink',
      'spa-potion-blue',
      'spa-potion-gold',
      'spa-brush-starlight',
      'spa-shower-cloud',
      'spa-soap-bubble',
      'acc-wing-bow',
      'spa-wand-rainbow',
      'gem-circle-ruby',
      'gem-heart-quartz',
      'gem-star-topaz',
      'gem-square-emerald',
      'gem-triangle-sapphire',
      'tea-teapot',
      'tea-cup-saucer',
      'tea-plate-silver',
      'treat-cupcake',
      'treat-star-cookie',
      'treat-sugar-heart',
      'treat-rainbow-berry',
      'tea-bakery-stand',
      'care-velvet-blanket',
      'care-starlight-pillow',
      'care-feather-wand',
      ...STICKER_CATALOG.map((s) => s.texKey)
    ];

    for (const k of texKeys) {
      if (this.textures.exists(k)) {
        this.textures.get(k).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }
  }

  private createSharedBackdropAndAmbientSparkles(): void {
    this.bgImage = this.add
      .image(640, 360, 'unicorn-spa-bg')
      .setDisplaySize(1280, 720)
      .setDepth(1);

    this.ambientParticlesContainer = this.add.container(0, 0).setDepth(5);
    const sparkleColors = [0xfef08a, 0xfbcfe8, 0xc4b5fd, 0xffffff];
    for (let i = 0; i < 18; i++) {
      const sx = Phaser.Math.Between(70, 1210);
      const sy = Phaser.Math.Between(65, 540);
      const baseScale = Phaser.Math.FloatBetween(0.16, 0.32);
      const glint = this.add
        .image(sx, sy, 'particle-star')
        .setTint(sparkleColors[i % sparkleColors.length])
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(baseScale)
        .setAlpha(0.35);
      this.ambientParticlesContainer.add(glint);

      this.tweens.add({
        targets: glint,
        y: sy - Phaser.Math.Between(12, 28),
        alpha: { from: 0.18, to: 0.82 },
        scaleX: { from: baseScale * 0.7, to: baseScale * 1.25 },
        scaleY: { from: baseScale * 0.7, to: baseScale * 1.25 },
        duration: Phaser.Math.Between(1400, 2600),
        delay: i * 110,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  // ===========================================================================
  // BOTTOM ROOM DOCK (3 HUGE 96x96+ TACTILE PICTURE BUTTONS) & TOP HUD
  // ===========================================================================

  private buildBottomRoomDockAndTopHud(): void {
    // 1. Top-Left Home / Hub Shelf Button (`x: 58, y: 48`, 96x96px hit zone)
    const homeBtn = this.add.container(58, 48);
    const homeGfx = this.add.graphics();
    homeGfx.fillStyle(0x3b0764, 0.94);
    homeGfx.fillCircle(0, 0, 38);
    homeGfx.lineStyle(3.5, 0xfde047, 1);
    homeGfx.strokeCircle(0, 0, 38);
    homeGfx.lineStyle(1.5, 0xfbcfe8, 0.85);
    homeGfx.strokeCircle(0, 0, 32);

    const homeIcon = this.textures.exists('ui-back')
      ? this.add.image(0, 0, 'ui-back').setScale(0.34)
      : this.add.text(0, 0, '🏰', { fontSize: '32px' }).setOrigin(0.5);

    homeBtn.add([homeGfx, homeIcon]);
    this.hudContainer.add(homeBtn);

    Juice.makeTactileButton(
      this,
      homeBtn,
      96,
      96,
      () => {
        this.audio.stopVoice();
        this.cameras.main.fadeOut(220, 18, 10, 24);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.scene.start('HubScene');
        });
      },
      'pop'
    );

    // 2. Top-Left Golden Sticker Star Counter Pill (`x: 168, y: 48`)
    const starPill = this.add.container(168, 48);
    const spGfx = this.add.graphics();
    spGfx.fillStyle(0x4a044e, 0.92);
    spGfx.fillRoundedRect(-58, -26, 116, 52, 26);
    spGfx.lineStyle(3, 0xfacc15, 1);
    spGfx.strokeRoundedRect(-58, -26, 116, 52, 26);

    const starIcon = this.add
      .image(-24, 0, 'gem-star-topaz')
      .setScale(0.32);

    this.starScoreText = this.add
      .text(16, 0, '0', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#3b0764',
        strokeThickness: 4
      })
      .setOrigin(0.5);

    starPill.add([spGfx, starIcon, this.starScoreText]);
    this.hudContainer.add(starPill);

    Juice.makeTactileButton(
      this,
      starPill,
      116,
      64,
      () => {
        this.audio.playRoyalFanfare();
        Juice.burstStars(this, 168, 48, 12, [0xfef08a, 0xf472b6, 0xffffff]);
      },
      null
    );

    // 3. Bottom Royal Room Switcher Dock (`y: 664`) — 3 Huge Pure-Picture Tactile Buttons (156x96px each)
    const dockBg = this.add.graphics();
    dockBg.fillStyle(0x2e1065, 0.92);
    dockBg.fillRoundedRect(350, 614, 580, 98, 28);
    dockBg.lineStyle(3.5, 0xfacc15, 1);
    dockBg.strokeRoundedRect(350, 614, 580, 98, 28);
    dockBg.lineStyle(1.5, 0xfbcfe8, 0.7);
    dockBg.strokeRoundedRect(356, 620, 568, 86, 24);
    this.hudContainer.add(dockBg);

    const roomSpecs: Array<{
      id: RoyalRoomId;
      x: number;
      primaryTex: string;
      secondaryTex: string;
      accentColor: number;
      promptId: string;
    }> = [
      {
        id: 'SPA_SALON',
        x: 455,
        primaryTex: 'char-unicorn-base',
        secondaryTex: 'spa-brush-starlight',
        accentColor: 0xf472b6,
        promptId: 'room_spa'
      },
      {
        id: 'TEA_PARTY',
        x: 640,
        primaryTex: 'tea-teapot',
        secondaryTex: 'treat-cupcake',
        accentColor: 0xfacc15,
        promptId: 'room_teaparty'
      },
      {
        id: 'STICKER_KINGDOM',
        x: 825,
        primaryTex: 'stk-rainbow-arch',
        secondaryTex: 'stk-unicorn-prance',
        accentColor: 0x38bdf8,
        promptId: 'room_stickers'
      }
    ];

    roomSpecs.forEach((spec) => {
      const btn = this.add.container(spec.x, 663);
      const bg = this.add.graphics();
      const glow = this.add
        .image(0, 0, 'hub-radial-glow')
        .setDisplaySize(160, 110)
        .setTint(spec.accentColor)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.35);

      const icon1 = this.add
        .image(-20, 2, spec.primaryTex)
        .setScale(spec.id === 'SPA_SALON' ? 0.25 : spec.id === 'STICKER_KINGDOM' ? 0.34 : 0.38);
      const icon2 = this.add
        .image(28, 6, spec.secondaryTex)
        .setScale(0.34);

      btn.add([glow, bg, icon1, icon2]);
      btn.setData('bgGfx', bg);
      btn.setData('glowImg', glow);
      btn.setData('accentColor', spec.accentColor);
      this.hudContainer.add(btn);
      this.roomButtons.set(spec.id, btn);

      Juice.makeTactileButton(
        this,
        btn,
        164,
        96,
        () => {
          if (this.activeRoom !== spec.id) {
            this.switchRoyalRoom(spec.id, true);
          } else {
            this.audio.speakPrompt(spec.promptId);
            Juice.burstStars(this, spec.x, 635, 10, [spec.accentColor, 0xfef08a, 0xffffff]);
          }
        },
        'tab'
      );
    });
  }

  private awardGoldenStar(fxX: number, fxY: number): void {
    this.goldenStarsEarned++;
    this.starScoreText.setText(String(this.goldenStarsEarned));
    Juice.squashAndStretch(this, this.starScoreText, 0.28, 180);

    const flyStar = this.add
      .image(fxX, fxY, 'gem-star-topaz')
      .setScale(0.45)
      .setDepth(120);

    this.tweens.add({
      targets: flyStar,
      x: 168,
      y: 48,
      scaleX: 0.25,
      scaleY: 0.25,
      angle: 360,
      duration: 680,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        flyStar.destroy();
        Juice.burstStars(this, 168, 48, 10, [0xfef08a, 0xfacc15, 0xffffff]);
      }
    });
  }

  private switchRoyalRoom(roomId: RoyalRoomId, speakTransition: boolean): void {
    this.activeRoom = roomId;

    this.spaRoomContainer.setVisible(roomId === 'SPA_SALON');
    this.teaRoomContainer.setVisible(roomId === 'TEA_PARTY');
    this.stickerRoomContainer.setVisible(roomId === 'STICKER_KINGDOM');

    if (roomId === 'SPA_SALON') {
      this.bgImage.setTexture('unicorn-spa-bg').setDisplaySize(1280, 720);
      if (speakTransition) this.audio.speakPrompt('room_spa');
    } else if (roomId === 'TEA_PARTY') {
      this.bgImage.setTexture('unicorn-teaparty-bg').setDisplaySize(1280, 720);
      this.syncTeaPartyUnicornStyle();
      if (speakTransition) this.audio.speakPrompt('room_teaparty');
    } else {
      this.applyStickerKingdomBackdrop(this.activeBackdrop);
      if (speakTransition) this.audio.speakPrompt('room_stickers');
    }

    // Update bottom room button visual highlights
    this.roomButtons.forEach((btn, id) => {
      const isSelected = id === roomId;
      const bg = btn.getData('bgGfx') as Phaser.GameObjects.Graphics;
      const glow = btn.getData('glowImg') as Phaser.GameObjects.Image;
      const accent = btn.getData('accentColor') as number;

      bg.clear();
      if (isSelected) {
        bg.fillStyle(0x581c87, 0.98);
        bg.fillRoundedRect(-76, -40, 152, 80, 22);
        bg.lineStyle(4, 0xfef08a, 1);
        bg.strokeRoundedRect(-76, -40, 152, 80, 22);
        bg.lineStyle(2, accent, 0.95);
        bg.strokeRoundedRect(-70, -34, 140, 68, 18);
        glow.setAlpha(0.65);
        btn.setScale(1.06);
      } else {
        bg.fillStyle(0x1e1b4b, 0.86);
        bg.fillRoundedRect(-72, -36, 144, 72, 20);
        bg.lineStyle(2, 0x7e22ce, 0.75);
        bg.strokeRoundedRect(-72, -36, 144, 72, 20);
        glow.setAlpha(0.15);
        btn.setScale(0.96);
      }
    });
  }

  // ===========================================================================
  // ACT 1: THE ROYAL UNICORN SPA, COLOR MIXING & TIARA SHAPE SALON
  // ===========================================================================

  private buildAct1SpaSalonRoom(): void {
    // 1. Princess Emma standing in the Crystal Courtyard (`x: 255, y: 410`)
    const emmaShadow = this.add.graphics();
    emmaShadow.fillStyle(0x1e1b4b, 0.32);
    emmaShadow.fillEllipse(255, 535, 140, 26);
    this.spaRoomContainer.add(emmaShadow);

    this.spaEmmaSprite = this.add
      .image(255, 410, 'char-emma-princess')
      .setScale(0.92)
      .setInteractive({ useHandCursor: true });
    this.spaRoomContainer.add(this.spaEmmaSprite);

    this.tweens.add({
      targets: this.spaEmmaSprite,
      y: 403,
      duration: 1650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.spaEmmaSprite.on('pointerdown', () => {
      this.spaEmmaSprite.setTexture('char-emma-wand');
      this.audio.playRoyalFanfare();
      Juice.squashAndStretch(this, this.spaEmmaSprite, 0.16, 160);
      Juice.burstStars(this, 255, 340, 14, [0xfb7185, 0xc084fc, 0xfef08a, 0xffffff]);
      this.time.delayedCall(1200, () => {
        if (this.spaEmmaSprite && this.spaEmmaSprite.active) {
          this.spaEmmaSprite.setTexture('char-emma-princess');
        }
      });
    });

    // 2. Large Expressive White Winged Unicorn (`x: 615, y: 390`) + Interactive Mane/Tail & Accessories
    const uniShadow = this.add.graphics();
    uniShadow.fillStyle(0x1e1b4b, 0.34);
    uniShadow.fillEllipse(615, 542, 230, 34);
    this.spaRoomContainer.add(uniShadow);

    this.spaUnicornContainer = this.add.container(615, 395);
    this.spaRoomContainer.add(this.spaUnicornContainer);

    this.spaUnicornSprite = this.add
      .image(0, 0, 'char-unicorn-base')
      .setScale(1.06)
      .setInteractive({ useHandCursor: true });

    // Colored mane & tail locks overlay (4 distinct interactive sections: Crown, Neck, Upper Tail, Lower Tail)
    this.spaManeLocksGfx = this.add.graphics();

    // Dress-up accessories mounted directly onto the Unicorn
    this.spaSaddleSprite = this.add
      .image(24, 24, 'acc-royal-saddle')
      .setScale(0.46)
      .setVisible(this.wearingSaddle);

    this.spaBowSprite = this.add
      .image(42, -32, 'acc-wing-bow')
      .setScale(0.36)
      .setVisible(this.wearingBow);

    this.spaTiaraSprite = this.add
      .image(-58, -108, 'acc-royal-tiara')
      .setScale(0.38)
      .setAngle(-10)
      .setVisible(this.wearingTiara);

    this.spaCrownGemsGfx = this.add.graphics();

    // Soap lather bubbles container overlaid on the Unicorn
    this.spaSoapBubblesContainer = this.add.container(0, 0);

    this.spaUnicornContainer.add([
      this.spaUnicornSprite,
      this.spaManeLocksGfx,
      this.spaSaddleSprite,
      this.spaBowSprite,
      this.spaTiaraSprite,
      this.spaCrownGemsGfx,
      this.spaSoapBubblesContainer
    ]);

    this.tweens.add({
      targets: this.spaUnicornContainer,
      y: 388,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Tapping the Unicorn directly paints the next mane lock with the active potion color or whinnies!
    this.spaUnicornSprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const localX = pointer.x - this.spaUnicornContainer.x;
      const localY = pointer.y - this.spaUnicornContainer.y;
      const sectionIdx = this.getManeSectionFromOffset(localX, localY);
      this.paintManeSection(sectionIdx, this.activePotionColor, pointer.x, pointer.y);
    });

    this.redrawUnicornManeAndCrownGems();

    // 3. Floating Visual Wish Bubble above the Unicorn (`x: 615, y: 128`)
    this.spaWishBubbleContainer = this.add.container(615, 128);
    const wbGfx = this.add.graphics();
    wbGfx.fillStyle(0xffffff, 0.95);
    wbGfx.fillRoundedRect(-145, -44, 290, 88, 28);
    wbGfx.lineStyle(3.5, 0xfacc15, 1);
    wbGfx.strokeRoundedRect(-145, -44, 290, 88, 28);
    wbGfx.fillStyle(0xffffff, 0.95);
    wbGfx.fillCircle(0, 54, 10);
    wbGfx.lineStyle(2.5, 0xfacc15, 1);
    wbGfx.strokeCircle(0, 54, 10);

    this.spaWishSwatchesGfx = this.add.graphics();

    const shuffleWishBtn = this.add.container(112, 0);
    const shufGfx = this.add.graphics();
    shufGfx.fillStyle(0x4a044e, 0.95);
    shufGfx.fillCircle(0, 0, 24);
    shufGfx.lineStyle(2.5, 0xfef08a, 1);
    shufGfx.strokeCircle(0, 0, 24);
    const shufIcon = this.add.text(0, 0, '🔄', { fontSize: '22px' }).setOrigin(0.5);
    shuffleWishBtn.add([shufGfx, shufIcon]);

    this.spaWishBubbleContainer.add([wbGfx, this.spaWishSwatchesGfx, shuffleWishBtn]);
    this.spaRoomContainer.add(this.spaWishBubbleContainer);

    Juice.makeTactileButton(
      this,
      this.spaWishBubbleContainer,
      280,
      88,
      () => {
        this.cycleUnicornColorWish(true);
      },
      'pop'
    );

    this.drawSpaWishBubbleSwatches();

    // 4. Right Crystal Salon Pedestal: 4 Color Potion Bottles (`x: 1020..1185, y: 210..340`)
    const potionPanelGfx = this.add.graphics();
    potionPanelGfx.fillStyle(0x2e1065, 0.78);
    potionPanelGfx.fillRoundedRect(945, 130, 305, 445, 26);
    potionPanelGfx.lineStyle(3, 0xfacc15, 0.95);
    potionPanelGfx.strokeRoundedRect(945, 130, 305, 445, 26);
    this.spaRoomContainer.add(potionPanelGfx);

    const potionLayouts: Array<{ colorId: ManeColorId; x: number; y: number }> = [
      { colorId: 'PINK', x: 1022, y: 205 },
      { colorId: 'BLUE', x: 1168, y: 205 },
      { colorId: 'LAVENDER', x: 1022, y: 335 },
      { colorId: 'GOLD', x: 1168, y: 335 }
    ];

    potionLayouts.forEach((pLayout) => {
      const spec = MANE_COLORS[pLayout.colorId];
      const bottleContainer = this.add.container(pLayout.x, pLayout.y);

      const ringGfx = this.add.graphics();
      ringGfx.fillStyle(spec.tint, 0.28);
      ringGfx.fillCircle(0, 0, 48);
      ringGfx.lineStyle(3.5, spec.tint, 1);
      ringGfx.strokeCircle(0, 0, 48);

      const bottleSprite = this.add
        .image(0, -2, spec.potionTex)
        .setScale(0.5);
      if (pLayout.colorId === 'LAVENDER') {
        bottleSprite.setTint(0xd8b4fe);
      }

      bottleContainer.add([ringGfx, bottleSprite]);
      this.spaRoomContainer.add(bottleContainer);

      const hitZone = this.add
        .zone(0, 0, 104, 104)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true, draggable: true });
      bottleContainer.add(hitZone);
      this.input.setDraggable(hitZone);

      let lastPaintSection = -1;

      hitZone.on('pointerdown', () => {
        this.activePotionColor = pLayout.colorId;
        this.audio.speakShapeOrColor(spec.voiceKey);
        Juice.squashAndStretch(this, bottleContainer, 0.2, 140);
        Juice.burstStars(this, pLayout.x, pLayout.y, 8, [spec.tint, 0xffffff]);
      });

      hitZone.on('dragstart', () => {
        this.activePotionColor = pLayout.colorId;
        bottleContainer.setDepth(60);
        bottleContainer.setScale(1.15);
        bottleSprite.setAngle(-22);
        lastPaintSection = -1;
      });

      hitZone.on('drag', (pointer: Phaser.Input.Pointer) => {
        bottleContainer.setPosition(pointer.x, pointer.y);
        const dist = Phaser.Math.Distance.Between(
          pointer.x,
          pointer.y,
          this.spaUnicornContainer.x,
          this.spaUnicornContainer.y
        );
        if (dist < 175) {
          const secIdx = this.getManeSectionFromOffset(
            pointer.x - this.spaUnicornContainer.x,
            pointer.y - this.spaUnicornContainer.y
          );
          if (secIdx !== lastPaintSection) {
            lastPaintSection = secIdx;
            this.paintManeSection(secIdx, pLayout.colorId, pointer.x, pointer.y);
          }
        }
      });

      hitZone.on('dragend', () => {
        this.tweens.add({
          targets: bottleContainer,
          x: pLayout.x,
          y: pLayout.y,
          scaleX: 1,
          scaleY: 1,
          duration: 240,
          ease: 'Back.easeOut',
          onComplete: () => {
            bottleContainer.setDepth(20);
            bottleSprite.setAngle(0);
          }
        });
      });
    });

    // 5. Tactile Starlight Brush (`x: 1022, y: 485`) & Golden Cloud Showerhead (`x: 1168, y: 485`)
    this.createSpaDraggableBrush(1022, 485);
    this.createSpaDraggableShowerhead(1168, 485);

    // 6. Left Crystal Dress-Up & Royal Crown Gem Puzzle Pedestal (`x: 108, y: 215..495`)
    const leftPanelGfx = this.add.graphics();
    leftPanelGfx.fillStyle(0x2e1065, 0.78);
    leftPanelGfx.fillRoundedRect(36, 145, 136, 420, 26);
    leftPanelGfx.lineStyle(3, 0xfacc15, 0.95);
    leftPanelGfx.strokeRoundedRect(36, 145, 136, 420, 26);
    this.spaRoomContainer.add(leftPanelGfx);

    const dressSpecs: Array<{
      texKey: string;
      y: number;
      accent: number;
      onTap: () => void;
    }> = [
      {
        texKey: 'acc-royal-tiara',
        y: 225,
        accent: 0xfacc15,
        onTap: () => {
          this.wearingTiara = true;
          this.spaTiaraSprite.setVisible(true);
          this.toggleCrownGemPuzzleModal(true);
        }
      },
      {
        texKey: 'acc-royal-saddle',
        y: 355,
        accent: 0xf472b6,
        onTap: () => {
          this.wearingSaddle = !this.wearingSaddle;
          this.spaSaddleSprite.setVisible(this.wearingSaddle);
          this.audio.playGemSocketChime(2);
          Juice.squashAndStretch(this, this.spaUnicornContainer, 0.14, 150);
          Juice.burstStars(this, 635, 415, 12, [0xfacc15, 0xf472b6, 0xffffff]);
        }
      },
      {
        texKey: 'acc-wing-bow',
        y: 485,
        accent: 0xc084fc,
        onTap: () => {
          this.wearingBow = !this.wearingBow;
          this.spaBowSprite.setVisible(this.wearingBow);
          this.audio.playGemSocketChime(4);
          Juice.squashAndStretch(this, this.spaUnicornContainer, 0.14, 150);
          Juice.burstStars(this, 655, 360, 12, [0xc084fc, 0xfef08a, 0xffffff]);
        }
      }
    ];

    dressSpecs.forEach((dSpec) => {
      const btn = this.add.container(104, dSpec.y);
      const g = this.add.graphics();
      g.fillStyle(0x4a044e, 0.92);
      g.fillCircle(0, 0, 50);
      g.lineStyle(3.5, dSpec.accent, 1);
      g.strokeCircle(0, 0, 50);
      const spr = this.add.image(0, 0, dSpec.texKey).setScale(0.42);
      btn.add([g, spr]);
      this.spaRoomContainer.add(btn);

      Juice.makeTactileButton(this, btn, 104, 104, dSpec.onTap, 'pop');
    });

    // 7. Build the Pop-Up Royal Crown Gem Socket Bar (`spaGemModalContainer`)
    this.buildRoyalCrownGemSocketBar();
  }

  private createSpaDraggableBrush(homeX: number, homeY: number): void {
    const brushContainer = this.add.container(homeX, homeY);
    const bg = this.add.graphics();
    bg.fillStyle(0x4a044e, 0.92);
    bg.fillCircle(0, 0, 48);
    bg.lineStyle(3.5, 0xfef08a, 1);
    bg.strokeCircle(0, 0, 48);

    const brushSprite = this.add.image(0, 0, 'spa-brush-starlight').setScale(0.46);
    brushContainer.add([bg, brushSprite]);
    this.spaRoomContainer.add(brushContainer);

    const hitZone = this.add
      .zone(0, 0, 104, 104)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true, draggable: true });
    brushContainer.add(hitZone);
    this.input.setDraggable(hitZone);

    let lastBubbleMs = 0;

    hitZone.on('pointerdown', () => {
      this.audio.playSparkleBrush(0);
      this.spawnSoapBubbleOnUnicorn(
        Phaser.Math.Between(-75, 65),
        Phaser.Math.Between(-95, 20)
      );
      Juice.squashAndStretch(this, brushContainer, 0.18, 140);
    });

    hitZone.on('dragstart', () => {
      brushContainer.setDepth(65);
      brushContainer.setScale(1.15);
    });

    hitZone.on('drag', (pointer: Phaser.Input.Pointer) => {
      brushContainer.setPosition(pointer.x, pointer.y);
      const dist = Phaser.Math.Distance.Between(
        pointer.x,
        pointer.y,
        this.spaUnicornContainer.x,
        this.spaUnicornContainer.y
      );
      if (dist < 185) {
        const now = Date.now();
        if (now - lastBubbleMs > 120) {
          lastBubbleMs = now;
          this.audio.playShampooBubbles();
          this.spawnSoapBubbleOnUnicorn(
            pointer.x - this.spaUnicornContainer.x + Phaser.Math.Between(-18, 18),
            pointer.y - this.spaUnicornContainer.y + Phaser.Math.Between(-18, 18)
          );
          const secIdx = this.getManeSectionFromOffset(
            pointer.x - this.spaUnicornContainer.x,
            pointer.y - this.spaUnicornContainer.y
          );
          this.paintManeSection(secIdx, this.activePotionColor, pointer.x, pointer.y, true);
        }
      }
    });

    hitZone.on('dragend', () => {
      if (this.spaSoapBubbleSprites.length >= 4) {
        this.audio.speakPrompt('spa_wash_bubbles');
      }
      this.tweens.add({
        targets: brushContainer,
        x: homeX,
        y: homeY,
        scaleX: 1,
        scaleY: 1,
        duration: 240,
        ease: 'Back.easeOut',
        onComplete: () => brushContainer.setDepth(20)
      });
    });
  }

  private createSpaDraggableShowerhead(homeX: number, homeY: number): void {
    const showerContainer = this.add.container(homeX, homeY);
    const bg = this.add.graphics();
    bg.fillStyle(0x0c4a6e, 0.92);
    bg.fillCircle(0, 0, 48);
    bg.lineStyle(3.5, 0x38bdf8, 1);
    bg.strokeCircle(0, 0, 48);

    const showerSprite = this.add.image(0, 0, 'spa-shower-cloud').setScale(0.46);
    const waterGfx = this.add.graphics();
    showerContainer.add([bg, waterGfx, showerSprite]);
    this.spaRoomContainer.add(showerContainer);

    const hitZone = this.add
      .zone(0, 0, 104, 104)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true, draggable: true });
    showerContainer.add(hitZone);
    this.input.setDraggable(hitZone);

    hitZone.on('pointerdown', () => {
      this.rinseUnicornSoapBubbles();
      Juice.squashAndStretch(this, showerContainer, 0.18, 140);
    });

    hitZone.on('dragstart', () => {
      showerContainer.setDepth(65);
      showerContainer.setScale(1.15);
    });

    hitZone.on('drag', (pointer: Phaser.Input.Pointer) => {
      showerContainer.setPosition(pointer.x, pointer.y);
      waterGfx.clear();
      waterGfx.lineStyle(3, 0x7dd3fc, 0.85);
      for (let i = -2; i <= 2; i++) {
        const dropOffset = (Date.now() / 8 + i * 17) % 45;
        waterGfx.lineBetween(i * 12, 22 + dropOffset, i * 14, 42 + dropOffset);
      }

      const dist = Phaser.Math.Distance.Between(
        pointer.x,
        pointer.y,
        this.spaUnicornContainer.x,
        this.spaUnicornContainer.y
      );
      if (dist < 210) {
        this.audio.playWaterfallRinse();
        this.rinseSingleBubbleNear(
          pointer.x - this.spaUnicornContainer.x,
          pointer.y - this.spaUnicornContainer.y
        );
      }
    });

    hitZone.on('dragend', () => {
      waterGfx.clear();
      this.tweens.add({
        targets: showerContainer,
        x: homeX,
        y: homeY,
        scaleX: 1,
        scaleY: 1,
        duration: 240,
        ease: 'Back.easeOut',
        onComplete: () => showerContainer.setDepth(20)
      });
    });
  }

  private spawnSoapBubbleOnUnicorn(localX: number, localY: number): void {
    if (this.spaSoapBubbleSprites.length > 18) {
      const oldest = this.spaSoapBubbleSprites.shift();
      oldest?.destroy();
    }
    const bub = this.add
      .image(localX, localY, 'spa-soap-bubble')
      .setScale(Phaser.Math.FloatBetween(0.22, 0.38))
      .setAlpha(0.92);
    this.spaSoapBubblesContainer.add(bub);
    this.spaSoapBubbleSprites.push(bub);

    this.tweens.add({
      targets: bub,
      scaleX: bub.scaleX * 1.12,
      scaleY: bub.scaleY * 1.12,
      y: localY - 6,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private rinseSingleBubbleNear(localX: number, localY: number): void {
    if (this.spaSoapBubbleSprites.length === 0) return;
    let removedAny = false;
    this.spaSoapBubbleSprites = this.spaSoapBubbleSprites.filter((bub) => {
      const d = Phaser.Math.Distance.Between(localX, localY, bub.x, bub.y);
      if (d < 95) {
        removedAny = true;
        Juice.burstStars(
          this,
          this.spaUnicornContainer.x + bub.x,
          this.spaUnicornContainer.y + bub.y,
          4,
          [0x7dd3fc, 0xffffff]
        );
        bub.destroy();
        return false;
      }
      return true;
    });

    if (removedAny && this.spaSoapBubbleSprites.length === 0) {
      this.celebrateCleanUnicornRinse();
    }
  }

  private rinseUnicornSoapBubbles(): void {
    this.audio.playWaterfallRinse();
    this.spaSoapBubbleSprites.forEach((bub) => bub.destroy());
    this.spaSoapBubbleSprites = [];
    this.celebrateCleanUnicornRinse();
  }

  private celebrateCleanUnicornRinse(): void {
    this.audio.playUnicornWhinny();
    this.audio.speakPrompt('spa_rinse_clean');
    this.spaUnicornSprite.setTexture('char-unicorn-happy');
    Juice.squashAndStretch(this, this.spaUnicornContainer, 0.16, 180);
    Juice.burstStars(this, 615, 340, 18, [0x7dd3fc, 0xfef08a, 0xffffff]);
    this.time.delayedCall(1200, () => {
      if (this.spaUnicornSprite && this.spaUnicornSprite.active) {
        this.spaUnicornSprite.setTexture('char-unicorn-base');
      }
    });
  }

  private getManeSectionFromOffset(localX: number, localY: number): number {
    if (localX < 0) {
      return localY < -55 ? 0 : 1; // 0: Crown Forelock, 1: Neck Mane
    }
    return localY < 15 ? 2 : 3; // 2: Upper Tail, 3: Lower Tail Tip
  }

  private paintManeSection(
    sectionIdx: number,
    newColor: ManeColorId,
    fxX: number,
    fxY: number,
    silentVoice = false
  ): void {
    const prevColor = this.maneSectionColors[sectionIdx];
    // Color Mixing Discovery: Pink + Blue mixes into Royal Lavender!
    let finalColor = newColor;
    if (
      (prevColor === 'PINK' && newColor === 'BLUE') ||
      (prevColor === 'BLUE' && newColor === 'PINK')
    ) {
      finalColor = 'LAVENDER';
    }

    this.maneSectionColors[sectionIdx] = finalColor;
    this.redrawUnicornManeAndCrownGems();
    this.audio.playSparkleBrush(sectionIdx);

    const spec = MANE_COLORS[finalColor];
    Juice.burstStars(this, fxX, fxY, 8, [spec.tint, 0xfef08a, 0xffffff]);

    if (!silentVoice) {
      this.audio.speakShapeOrColor(spec.voiceKey);
    }

    // Check if the 4 mane sections match the Unicorn's floating wish bubble pattern!
    const matchesWish = this.wishPatternColors.every(
      (wishCol, idx) => this.maneSectionColors[idx] === wishCol
    );
    if (matchesWish) {
      this.audio.playRoyalFanfare();
      this.audio.speakShapeOrColor('pattern_match');
      this.spaUnicornSprite.setTexture('char-unicorn-happy');
      this.awardGoldenStar(615, 290);
      Juice.burstStars(this, 615, 290, 24, [0xfb7185, 0x38bdf8, 0xfacc15, 0xc084fc]);
      this.time.delayedCall(1400, () => {
        if (this.spaUnicornSprite && this.spaUnicornSprite.active) {
          this.spaUnicornSprite.setTexture('char-unicorn-base');
        }
        this.cycleUnicornColorWish(false);
      });
    }
  }

  private redrawUnicornManeAndCrownGems(): void {
    this.spaManeLocksGfx.clear();

    // Draw 4 silky, glowing mane & tail locks over the Unicorn's mane/tail
    const lockCoords: Array<{ x: number; y: number; rx: number; ry: number }> = [
      { x: -58, y: -84, rx: 32, ry: 20 }, // 0: Forelock crown
      { x: -34, y: -22, rx: 28, ry: 44 }, // 1: Neck mane
      { x: 96, y: -2, rx: 26, ry: 34 },   // 2: Upper tail
      { x: 108, y: 52, rx: 28, ry: 36 }   // 3: Lower tail
    ];

    lockCoords.forEach((lc, idx) => {
      const col = MANE_COLORS[this.maneSectionColors[idx]].tint;
      this.spaManeLocksGfx.fillStyle(col, 0.72);
      this.spaManeLocksGfx.fillEllipse(lc.x, lc.y, lc.rx * 2, lc.ry * 2);
      this.spaManeLocksGfx.fillStyle(0xffffff, 0.38);
      this.spaManeLocksGfx.fillEllipse(lc.x - 6, lc.y - 8, lc.rx * 0.7, lc.ry * 0.5);
    });

    // Draw socketed gems on the Unicorn's live tiara & saddle!
    this.spaCrownGemsGfx.clear();
    if (this.wearingTiara) {
      GEM_PUZZLE_SPECS.forEach((gSpec, idx) => {
        if (this.socketedGems.has(gSpec.id)) {
          const gx = -76 + idx * 9;
          const gy = -110 - (idx === 2 ? 6 : idx === 1 || idx === 3 ? 3 : 0);
          this.spaCrownGemsGfx.fillStyle(gSpec.accentColor, 1);
          this.spaCrownGemsGfx.fillCircle(gx, gy, 5);
          this.spaCrownGemsGfx.lineStyle(1.5, 0xffffff, 0.9);
          this.spaCrownGemsGfx.strokeCircle(gx, gy, 5);
        }
      });
    }
  }

  private drawSpaWishBubbleSwatches(): void {
    this.spaWishSwatchesGfx.clear();
    const startX = -102;
    const spacing = 54;
    this.wishPatternColors.forEach((colId, idx) => {
      const cx = startX + idx * spacing;
      const spec = MANE_COLORS[colId];
      this.spaWishSwatchesGfx.fillStyle(spec.tint, 1);
      this.spaWishSwatchesGfx.fillCircle(cx, 0, 20);
      this.spaWishSwatchesGfx.lineStyle(3, 0x4a044e, 1);
      this.spaWishSwatchesGfx.strokeCircle(cx, 0, 20);
      this.spaWishSwatchesGfx.fillStyle(0xffffff, 0.65);
      this.spaWishSwatchesGfx.fillCircle(cx - 6, -6, 5);
    });
  }

  private cycleUnicornColorWish(speakWish: boolean): void {
    const patterns: ManeColorId[][] = [
      ['PINK', 'BLUE', 'PINK', 'BLUE'],
      ['PINK', 'PINK', 'PINK', 'PINK'],
      ['GOLD', 'LAVENDER', 'GOLD', 'LAVENDER'],
      ['BLUE', 'BLUE', 'BLUE', 'BLUE'],
      ['LAVENDER', 'PINK', 'LAVENDER', 'PINK'],
      ['GOLD', 'GOLD', 'GOLD', 'GOLD']
    ];
    this.wishPatternIndex = (this.wishPatternIndex + 1) % patterns.length;
    this.wishPatternColors = [...patterns[this.wishPatternIndex]];
    this.drawSpaWishBubbleSwatches();
    Juice.squashAndStretch(this, this.spaWishBubbleContainer, 0.14, 140);
    if (speakWish) {
      const firstSpec = MANE_COLORS[this.wishPatternColors[0]];
      this.audio.speakShapeOrColor(firstSpec.voiceKey);
    }
  }

  private buildRoyalCrownGemSocketBar(): void {
    this.spaGemModalContainer = this.add.container(0, 0).setDepth(75).setVisible(false);
    this.spaRoomContainer.add(this.spaGemModalContainer);

    const backdropGfx = this.add.graphics();
    backdropGfx.fillStyle(0x1e1b4b, 0.94);
    backdropGfx.fillRoundedRect(320, 74, 640, 244, 28);
    backdropGfx.lineStyle(4, 0xfacc15, 1);
    backdropGfx.strokeRoundedRect(320, 74, 640, 244, 28);
    backdropGfx.lineStyle(2, 0xfbcfe8, 0.8);
    backdropGfx.strokeRoundedRect(328, 82, 624, 228, 22);
    this.spaGemModalContainer.add(backdropGfx);

    // Close button on the top-right of the Crown Gem Socket Bar
    const closeBtn = this.add.container(924, 108);
    const cGfx = this.add.graphics();
    cGfx.fillStyle(0x881337, 0.95);
    cGfx.fillCircle(0, 0, 22);
    cGfx.lineStyle(2.5, 0xfef08a, 1);
    cGfx.strokeCircle(0, 0, 22);
    const cTxt = this.add.text(0, 0, '✖', { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);
    closeBtn.add([cGfx, cTxt]);
    this.spaGemModalContainer.add(closeBtn);

    Juice.makeTactileButton(
      this,
      closeBtn,
      64,
      64,
      () => {
        this.toggleCrownGemPuzzleModal(false);
      },
      'pop'
    );

    // Draw the 5 Carved Shape Sockets on the Golden Crown Arch (`y: 134..162`)
    const socketGfx = this.add.graphics();
    this.spaGemModalContainer.add(socketGfx);

    GEM_PUZZLE_SPECS.forEach((spec, idx) => {
      socketGfx.fillStyle(0x0f172a, 0.92);
      socketGfx.lineStyle(3.5, spec.accentColor, 0.95);
      this.drawCarvedGemSocketShape(socketGfx, spec.id, spec.socketX, spec.socketY, 34);

      const placedImg = this.add
        .image(spec.socketX, spec.socketY, spec.texKey)
        .setScale(0.46)
        .setVisible(false);
      this.spaGemModalContainer.add(placedImg);
      this.spaSocketCheckSprites.set(spec.id, placedImg);

      // Draggable & tappable oversized crystal gem in the lower tray (`y: 256`)
      const gemSprite = this.add
        .image(spec.trayX, spec.trayY, spec.texKey)
        .setScale(0.54)
        .setInteractive({ useHandCursor: true, draggable: true });
      this.spaGemModalContainer.add(gemSprite);
      this.spaGemSprites.set(spec.id, gemSprite);
      this.input.setDraggable(gemSprite);

      // Tapping a gem also snaps it smoothly for 3-year-old accessibility!
      gemSprite.on('pointerdown', () => {
        this.audio.speakShapeOrColor(spec.voiceKey);
      });

      gemSprite.on('dragstart', () => {
        gemSprite.setScale(0.66);
        this.spaGemModalContainer.bringToTop(gemSprite);
      });

      gemSprite.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        gemSprite.setPosition(dragX, dragY);
      });

      gemSprite.on('dragend', () => {
        const dist = Phaser.Math.Distance.Between(
          gemSprite.x,
          gemSprite.y,
          spec.socketX,
          spec.socketY
        );
        if (dist < 95) {
          this.snapGemIntoCrownSocket(spec, idx);
        } else {
          // If she just tapped the gem without dragging far, also snap it gently!
          const tapDist = Phaser.Math.Distance.Between(
            gemSprite.x,
            gemSprite.y,
            spec.trayX,
            spec.trayY
          );
          if (tapDist < 18) {
            this.snapGemIntoCrownSocket(spec, idx);
          } else {
            this.tweens.add({
              targets: gemSprite,
              x: spec.trayX,
              y: spec.trayY,
              scaleX: 0.54,
              scaleY: 0.54,
              duration: 220,
              ease: 'Back.easeOut'
            });
          }
        }
      });
    });
  }

  private drawCarvedGemSocketShape(
    g: Phaser.GameObjects.Graphics,
    shape: GemShapeId,
    cx: number,
    cy: number,
    r: number
  ): void {
    if (shape === 'CIRCLE') {
      g.fillCircle(cx, cy, r);
      g.strokeCircle(cx, cy, r);
    } else if (shape === 'SQUARE') {
      g.fillRoundedRect(cx - r, cy - r, r * 2, r * 2, 8);
      g.strokeRoundedRect(cx - r, cy - r, r * 2, r * 2, 8);
    } else if (shape === 'TRIANGLE') {
      const pts = [
        { x: cx, y: cy - r },
        { x: cx + r, y: cy + r * 0.85 },
        { x: cx - r, y: cy + r * 0.85 }
      ];
      g.fillPoints(pts, true);
      g.strokePoints(pts, true);
    } else if (shape === 'HEART') {
      g.fillCircle(cx - r * 0.45, cy - r * 0.25, r * 0.55);
      g.fillCircle(cx + r * 0.45, cy - r * 0.25, r * 0.55);
      const pts = [
        { x: cx - r * 0.95, y: cy - r * 0.05 },
        { x: cx + r * 0.95, y: cy - r * 0.05 },
        { x: cx, y: cy + r * 0.95 }
      ];
      g.fillPoints(pts, true);
      g.strokeCircle(cx, cy, r);
    } else {
      // 5-point Star
      const pts: Array<{ x: number; y: number }> = [];
      let rot = (Math.PI / 2) * 3;
      const step = Math.PI / 5;
      for (let i = 0; i < 5; i++) {
        pts.push({ x: cx + Math.cos(rot) * r, y: cy + Math.sin(rot) * r });
        rot += step;
        pts.push({ x: cx + Math.cos(rot) * (r * 0.48), y: cy + Math.sin(rot) * (r * 0.48) });
        rot += step;
      }
      g.fillPoints(pts, true);
      g.strokePoints(pts, true);
    }
  }

  private toggleCrownGemPuzzleModal(open: boolean): void {
    this.gemTrayOpen = open;
    this.spaWishBubbleContainer.setVisible(!open);
    this.spaGemModalContainer.setVisible(open);

    if (open) {
      if (this.socketedGems.size === GEM_PUZZLE_SPECS.length) {
        // Reset gems for another round of shape-sorting fun!
        this.socketedGems.clear();
        GEM_PUZZLE_SPECS.forEach((s) => {
          this.spaSocketCheckSprites.get(s.id)?.setVisible(false);
          const gSpr = this.spaGemSprites.get(s.id);
          if (gSpr) {
            gSpr.setPosition(s.trayX, s.trayY).setScale(0.54).setVisible(true);
          }
        });
      }
      this.audio.speakPrompt('spa_tiara_prompt');
    }
  }

  private snapGemIntoCrownSocket(spec: GemPuzzleSpec, index: number): void {
    if (this.socketedGems.has(spec.id)) return;
    this.socketedGems.add(spec.id);

    const gemSpr = this.spaGemSprites.get(spec.id);
    if (gemSpr) {
      gemSpr.setVisible(false);
    }
    const socketSpr = this.spaSocketCheckSprites.get(spec.id);
    if (socketSpr) {
      socketSpr.setVisible(true);
      Juice.squashAndStretch(this, socketSpr, 0.25, 160);
    }

    this.audio.playGemSocketChime(index);
    this.audio.speakShapeOrColor(spec.voiceKey);
    Juice.burstStars(this, spec.socketX, spec.socketY, 14, [spec.accentColor, 0xfef08a, 0xffffff]);
    this.redrawUnicornManeAndCrownGems();

    if (this.socketedGems.size === GEM_PUZZLE_SPECS.length) {
      this.time.delayedCall(950, () => {
        this.audio.playRoyalFanfare();
        this.audio.speakPrompt('spa_tiara_complete');
        this.awardGoldenStar(640, 145);
        this.spaUnicornSprite.setTexture('char-unicorn-happy');
        Juice.burstStars(this, 615, 340, 26, [0xfacc15, 0xfb7185, 0x38bdf8, 0x34d399]);
        this.time.delayedCall(1500, () => {
          this.toggleCrownGemPuzzleModal(false);
          if (this.spaUnicornSprite && this.spaUnicornSprite.active) {
            this.spaUnicornSprite.setTexture('char-unicorn-base');
          }
        });
      });
    }
  }

  // ===========================================================================
  // ACT 2: THE ROYAL CASTLE TEA PARTY & CUPCAKE BAKERY (COUNTING 1-5 & EMPATHY)
  // ===========================================================================

  private buildAct2TeaPartyRoom(): void {
    // 1. 4 Royal Tea Party Guests seated behind the lace banquet table
    const guestSpecs: Array<{ texKey: string; x: number; y: number; scale: number; sound: () => void }> = [
      {
        texKey: 'char-emma-princess',
        x: 305,
        y: 345,
        scale: 0.78,
        sound: () => this.audio.playRoyalFanfare()
      },
      {
        texKey: 'char-unicorn-base',
        x: 525,
        y: 330,
        scale: 0.82,
        sound: () => this.audio.playUnicornWhinny()
      },
      {
        texKey: 'char-sparky-bowtie',
        x: 755,
        y: 345,
        scale: 0.78,
        sound: () => AudioBus.playSfx('sparky')
      },
      {
        texKey: 'char-doggie-crown',
        x: 965,
        y: 355,
        scale: 0.78,
        sound: () => AudioBus.playSfx('doggie')
      }
    ];

    this.teaGuestSprites = [];
    this.teaGuestCupGfx = [];
    this.teaPlateContainers = [];

    guestSpecs.forEach((gSpec, idx) => {
      const spr = this.add
        .image(gSpec.x, gSpec.y, gSpec.texKey)
        .setScale(gSpec.scale)
        .setInteractive({ useHandCursor: true });
      this.teaRoomContainer.add(spr);
      this.teaGuestSprites.push(spr);

      this.tweens.add({
        targets: spr,
        y: gSpec.y - 6,
        duration: 1500 + idx * 180,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      spr.on('pointerdown', () => {
        gSpec.sound();
        Juice.squashAndStretch(this, spr, 0.16, 150);
        Juice.burstStars(this, gSpec.x, gSpec.y - 60, 10, [0xfef08a, 0xfb7185, 0xffffff]);
      });

      // Silver Dessert Plate (`tea-plate-silver`) on the lace table in front of each guest
      const plateX = gSpec.x - 26;
      const plateY = 510;
      const plateSprite = this.add
        .image(plateX, plateY, 'tea-plate-silver')
        .setScale(0.54)
        .setInteractive({ useHandCursor: true });
      this.teaRoomContainer.add(plateSprite);

      const plateItemsContainer = this.add.container(plateX, plateY);
      this.teaRoomContainer.add(plateItemsContainer);
      this.teaPlateContainers.push(plateItemsContainer);

      // Porcelain Teacup (`tea-cup-saucer`) on the right of each plate
      const cupX = gSpec.x + 48;
      const cupY = 492;
      const cupSprite = this.add
        .image(cupX, cupY, 'tea-cup-saucer')
        .setScale(0.46)
        .setInteractive({ useHandCursor: true });
      const cupLiquidGfx = this.add.graphics();
      this.teaRoomContainer.add([cupSprite, cupLiquidGfx]);
      this.teaGuestCupGfx.push(cupLiquidGfx);

      // Tapping a teacup sips or chimes!
      cupSprite.on('pointerdown', () => {
        this.audio.playTeacupClink(idx + 1);
        Juice.squashAndStretch(this, cupSprite, 0.18, 130);
        if (this.teaGuestCupFill[idx] >= 0.8) {
          this.teaGuestCupFill[idx] = 0;
          this.redrawTeaCupsLiquid();
          Juice.burstStars(this, cupX, cupY - 15, 10, [0xfef08a, 0xf472b6, 0x38bdf8]);
        }
      });
    });

    // Comfort overlays (Blanket & Pillow) for Kindness Caretaking
    this.teaCarePillowOverlay = this.add
      .image(965, 395, 'care-starlight-pillow')
      .setScale(0.52)
      .setVisible(false);
    this.teaCareBlanketOverlay = this.add
      .image(965, 405, 'care-velvet-blanket')
      .setScale(0.56)
      .setVisible(false);
    this.teaRoomContainer.add([this.teaCarePillowOverlay, this.teaCareBlanketOverlay]);

    // 2. Enchanted Porcelain Teapot (`tea-teapot`, `x: 640, y: 558`) for Tactile Tea Pouring
    this.teaPourStreamGfx = this.add.graphics().setDepth(55);
    this.teaRoomContainer.add(this.teaPourStreamGfx);

    const teapotHomeX = 640;
    const teapotHomeY = 558;
    const teapotSprite = this.add
      .image(teapotHomeX, teapotHomeY, 'tea-teapot')
      .setScale(0.62)
      .setInteractive({ useHandCursor: true, draggable: true });
    this.teaRoomContainer.add(teapotSprite);
    this.input.setDraggable(teapotSprite);

    teapotSprite.on('pointerdown', () => {
      this.audio.playTeacupClink(1);
      Juice.squashAndStretch(this, teapotSprite, 0.16, 140);
    });

    teapotSprite.on('dragstart', () => {
      teapotSprite.setDepth(60);
      teapotSprite.setScale(0.72);
      teapotSprite.setAngle(-28);
    });

    teapotSprite.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      teapotSprite.setPosition(dragX, dragY);
      this.teaPourStreamGfx.clear();

      // Check if teapot spout is positioned above any guest's teacup
      guestSpecs.forEach((gSpec, gIdx) => {
        const cupX = gSpec.x + 48;
        const cupY = 492;
        const d = Phaser.Math.Distance.Between(dragX - 45, dragY + 10, cupX, cupY);
        if (d < 95) {
          // Stream pastel rainbow tea from spout into teacup!
          const spoutX = dragX - 54;
          const spoutY = dragY - 4;
          const rainbowCols = [0xfb7185, 0xfacc15, 0x34d399, 0x38bdf8, 0xc084fc];
          rainbowCols.forEach((col, cIdx) => {
            this.teaPourStreamGfx.lineStyle(3, col, 0.88);
            this.teaPourStreamGfx.lineBetween(
              spoutX + (cIdx - 2) * 2,
              spoutY,
              cupX + (cIdx - 2) * 2.5,
              cupY - 6
            );
          });

          const prevFill = this.teaGuestCupFill[gIdx];
          this.teaGuestCupFill[gIdx] = Math.min(1, prevFill + 0.022);
          this.audio.playTeapotPour(this.teaGuestCupFill[gIdx]);
          this.redrawTeaCupsLiquid();

          if (prevFill < 1 && this.teaGuestCupFill[gIdx] >= 1) {
            this.audio.playTeacupClink(5);
            this.audio.speakPrompt('tea_pour_complete');
            this.awardGoldenStar(cupX, cupY - 20);
            Juice.burstStars(this, cupX, cupY - 20, 14, [0xfef08a, 0xf472b6, 0x38bdf8]);
          }
        }
      });
    });

    teapotSprite.on('dragend', () => {
      this.teaPourStreamGfx.clear();
      this.tweens.add({
        targets: teapotSprite,
        x: teapotHomeX,
        y: teapotHomeY,
        scaleX: 0.62,
        scaleY: 0.62,
        angle: 0,
        duration: 240,
        ease: 'Back.easeOut',
        onComplete: () => teapotSprite.setDepth(20)
      });
    });

    // 3. Tiered Silver Bakery Stand (`tea-bakery-stand`, `x: 118, y: 445`) + 4 Royal Treats
    const bakeryStand = this.add
      .image(118, 445, 'tea-bakery-stand')
      .setScale(0.95);
    this.teaRoomContainer.add(bakeryStand);

    TREAT_SPECS.forEach((tSpec) => {
      const tx = 118 + tSpec.standOffsetX;
      const ty = 445 + tSpec.standOffsetY;

      const treatSpawner = this.add
        .image(tx, ty, tSpec.texKey)
        .setScale(0.52)
        .setInteractive({ useHandCursor: true, draggable: true });
      this.teaRoomContainer.add(treatSpawner);
      this.input.setDraggable(treatSpawner);

      treatSpawner.on('dragstart', () => {
        treatSpawner.setDepth(65);
        treatSpawner.setScale(0.66);
      });

      treatSpawner.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        treatSpawner.setPosition(dragX, dragY);
      });

      treatSpawner.on('dragend', () => {
        const targetGuestX = guestSpecs[this.teaActiveGuestIdx].x - 26;
        const targetPlateY = 510;
        const distToActivePlate = Phaser.Math.Distance.Between(
          treatSpawner.x,
          treatSpawner.y,
          targetGuestX,
          targetPlateY
        );
        const distFromSpawner = Phaser.Math.Distance.Between(
          treatSpawner.x,
          treatSpawner.y,
          tx,
          ty
        );

        // Serve if dropped near the table OR tapped directly on the bakery stand
        if (distToActivePlate < 220 || treatSpawner.y > 410 || distFromSpawner < 20) {
          this.serveTreatOntoGuestPlate(tSpec);
        }

        treatSpawner.setPosition(tx, ty);
        treatSpawner.setScale(0.52);
        treatSpawner.setDepth(20);
      });
    });

    // 4. Pure-Picture Counting 1-5 Request Bubble (`teaWishBubbleContainer`)
    this.teaWishBubbleContainer = this.add.container(525, 165);
    this.teaRoomContainer.add(this.teaWishBubbleContainer);

    // 5. Right Velvet Caretaking Tray (`CARE_ITEMS` for Chilly, Sleepy & Tickle/Hug)
    const careTrayBg = this.add.graphics();
    careTrayBg.fillStyle(0x2e1065, 0.78);
    careTrayBg.fillRoundedRect(1120, 175, 130, 380, 24);
    careTrayBg.lineStyle(3, 0xfacc15, 0.95);
    careTrayBg.strokeRoundedRect(1120, 175, 130, 380, 24);
    this.teaRoomContainer.add(careTrayBg);

    this.teaCareBubbleContainer = this.add.container(965, 215);
    this.teaRoomContainer.add(this.teaCareBubbleContainer);

    CARE_ITEMS.forEach((cSpec) => {
      const itemSpr = this.add
        .image(cSpec.trayX, cSpec.trayY, cSpec.texKey)
        .setScale(0.52)
        .setInteractive({ useHandCursor: true, draggable: true });
      this.teaRoomContainer.add(itemSpr);
      this.input.setDraggable(itemSpr);

      itemSpr.on('dragstart', () => {
        itemSpr.setDepth(65);
        itemSpr.setScale(0.66);
      });

      itemSpr.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        itemSpr.setPosition(dragX, dragY);
      });

      itemSpr.on('dragend', () => {
        const careGuestSpr = this.teaGuestSprites[this.teaCareGuestIdx];
        const d = Phaser.Math.Distance.Between(
          itemSpr.x,
          itemSpr.y,
          careGuestSpr.x,
          careGuestSpr.y
        );
        const tapDist = Phaser.Math.Distance.Between(
          itemSpr.x,
          itemSpr.y,
          cSpec.trayX,
          cSpec.trayY
        );

        if (d < 210 || tapDist < 20) {
          this.applyKindnessCareItem(cSpec);
        }

        this.tweens.add({
          targets: itemSpr,
          x: cSpec.trayX,
          y: cSpec.trayY,
          scaleX: 0.52,
          scaleY: 0.52,
          duration: 220,
          ease: 'Back.easeOut',
          onComplete: () => itemSpr.setDepth(20)
        });
      });
    });

    this.startNewTeaTreatRequest(false);
    this.refreshTeaCareNeedBubble();
  }

  private syncTeaPartyUnicornStyle(): void {
    const teaUnicorn = this.teaGuestSprites[1];
    if (!teaUnicorn) return;
    const primaryManeTint = MANE_COLORS[this.maneSectionColors[0]].tint;
    // Subtle warm tint reflection on the Tea Party Unicorn from her Spa styling
    teaUnicorn.setTint(
      Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0xffffff),
        Phaser.Display.Color.ValueToColor(primaryManeTint),
        100,
        18
      ).color
    );
  }

  private redrawTeaCupsLiquid(): void {
    const guestXs = [305, 525, 755, 965];
    this.teaGuestCupGfx.forEach((gfx, idx) => {
      gfx.clear();
      const fill = this.teaGuestCupFill[idx];
      if (fill <= 0.02) return;
      const cupX = guestXs[idx] + 45;
      const cupY = 481;
      gfx.fillStyle(0xf472b6, 0.88);
      gfx.fillEllipse(cupX, cupY, 34 * fill, 12 * fill);
      gfx.fillStyle(0xfef08a, 0.65);
      gfx.fillEllipse(cupX - 4, cupY - 2, 14 * fill, 5 * fill);
    });
  }

  private startNewTeaTreatRequest(advanceGuest = true): void {
    this.teaOrderCelebrated = false;
    this.teaServedCount = 0;

    if (advanceGuest) {
      this.teaActiveGuestIdx = (this.teaActiveGuestIdx + 1) % 4;
    }

    // Clear plates for fresh one-to-one counting
    this.teaPlateContainers.forEach((c) => c.removeAll(true));

    const randomTreat = TREAT_SPECS[Phaser.Math.Between(0, TREAT_SPECS.length - 1)];
    this.teaTargetTreatKind = randomTreat.id;
    this.teaTargetCount = Phaser.Math.Between(1, 5);

    this.renderTeaTreatWishBubble();
  }

  private renderTeaTreatWishBubble(): void {
    this.teaWishBubbleContainer.removeAll(true);

    const guestX = [305, 525, 755, 965][this.teaActiveGuestIdx];
    this.teaWishBubbleContainer.setPosition(guestX, 165);

    const spec = TREAT_SPECS.find((t) => t.id === this.teaTargetTreatKind) ?? TREAT_SPECS[0];
    const bubbleW = Math.max(150, this.teaTargetCount * 46 + 44);
    const bubbleH = 84;

    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.96);
    bg.fillRoundedRect(-bubbleW / 2, -bubbleH / 2, bubbleW, bubbleH, 26);
    bg.lineStyle(3.5, spec.accentColor, 1);
    bg.strokeRoundedRect(-bubbleW / 2, -bubbleH / 2, bubbleW, bubbleH, 26);
    bg.fillStyle(0xffffff, 0.96);
    bg.fillCircle(0, bubbleH / 2 + 10, 9);
    bg.strokeCircle(0, bubbleH / 2 + 10, 9);
    this.teaWishBubbleContainer.add(bg);

    const startX = -((this.teaTargetCount - 1) * 44) / 2;
    for (let i = 0; i < this.teaTargetCount; i++) {
      const ix = startX + i * 44;
      const isServed = i < this.teaServedCount;

      const slotCircle = this.add.graphics();
      slotCircle.fillStyle(isServed ? 0x34d399 : 0xf1f5f9, 0.9);
      slotCircle.fillCircle(ix, 26, 6);
      this.teaWishBubbleContainer.add(slotCircle);

      const icon = this.add
        .image(ix, -6, spec.texKey)
        .setScale(0.32)
        .setAlpha(isServed ? 1.0 : 0.42);
      this.teaWishBubbleContainer.add(icon);
    }

    Juice.makeTactileButton(
      this,
      this.teaWishBubbleContainer,
      bubbleW,
      bubbleH,
      () => {
        this.audio.speakNumber(this.teaTargetCount);
      },
      'pop'
    );
  }

  private serveTreatOntoGuestPlate(treatSpec: TreatKindSpec): void {
    if (this.teaOrderCelebrated) return;

    this.teaServedCount++;
    const plateContainer = this.teaPlateContainers[this.teaActiveGuestIdx];

    const angle = ((this.teaServedCount - 1) / Math.max(1, this.teaTargetCount)) * Math.PI * 2;
    const radius = this.teaTargetCount === 1 ? 0 : 22;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * (radius * 0.55) - 6;

    const servedSpr = this.add
      .image(px, py, treatSpec.texKey)
      .setScale(0.36);
    plateContainer.add(servedSpr);
    Juice.squashAndStretch(this, servedSpr, 0.25, 160);

    this.audio.playTeacupClink(this.teaServedCount);
    this.renderTeaTreatWishBubble();

    if (this.teaServedCount < this.teaTargetCount) {
      // Calm one-to-one counting ("One.", "Two."...)
      this.audio.speakNumber(this.teaServedCount);
    } else if (this.teaServedCount === this.teaTargetCount) {
      this.teaOrderCelebrated = true;
      const summaryId =
        this.teaTargetCount === 1 ? 'tea_count_one' : treatSpec.summaryPromptId;
      this.audio.speakCountAndSummary(this.teaTargetCount, summaryId);
      this.audio.playRoyalFanfare();

      const guestSpr = this.teaGuestSprites[this.teaActiveGuestIdx];
      this.awardGoldenStar(guestSpr.x, guestSpr.y - 40);

      // Delighted munching bounce + heart burst!
      this.tweens.add({
        targets: guestSpr,
        scaleX: guestSpr.scaleX * 1.14,
        scaleY: guestSpr.scaleY * 0.88,
        duration: 130,
        yoyo: true,
        repeat: 3,
        ease: 'Quad.easeInOut'
      });

      Juice.burstStars(this, guestSpr.x, guestSpr.y - 50, 22, [
        treatSpec.accentColor,
        0xfef08a,
        0xffffff
      ]);

      this.time.delayedCall(2100, () => {
        this.startNewTeaTreatRequest(true);
      });
    }
  }

  private refreshTeaCareNeedBubble(): void {
    this.teaCareBubbleContainer.removeAll(true);

    // Choose a guest different from the treat-counting guest so bubbles never overlap
    this.teaCareGuestIdx = (this.teaActiveGuestIdx + 2) % 4;
    const guestX = [305, 525, 755, 965][this.teaCareGuestIdx];
    this.teaCareBubbleContainer.setPosition(guestX, 195);

    const needs: CareNeedId[] = ['CHILLY', 'SLEEPY', 'TICKLE'];
    this.teaActiveCareNeed = needs[Phaser.Math.Between(0, needs.length - 1)];
    const careSpec = CARE_ITEMS.find((c) => c.id === this.teaActiveCareNeed) ?? CARE_ITEMS[0];

    const bg = this.add.graphics();
    bg.fillStyle(0x3b0764, 0.94);
    bg.fillCircle(0, 0, 36);
    bg.lineStyle(3, careSpec.accentColor, 1);
    bg.strokeCircle(0, 0, 36);

    const emojiTxt = this.add
      .text(-12, -2, careSpec.bubbleEmoji, { fontSize: '22px' })
      .setOrigin(0.5);
    const itemIcon = this.add
      .image(14, 2, careSpec.texKey)
      .setScale(0.24);

    this.teaCareBubbleContainer.add([bg, emojiTxt, itemIcon]);
  }

  private applyKindnessCareItem(careSpec: CareItemSpec): void {
    const guestSpr = this.teaGuestSprites[this.teaCareGuestIdx];
    if (!guestSpr) return;

    this.audio.playRoyalFanfare();
    this.audio.speakPrompt(careSpec.promptId);
    this.awardGoldenStar(guestSpr.x, guestSpr.y - 30);

    if (careSpec.id === 'CHILLY') {
      this.teaCareBlanketOverlay
        .setPosition(guestSpr.x, guestSpr.y + 42)
        .setVisible(true);
      Juice.squashAndStretch(this, this.teaCareBlanketOverlay, 0.2, 180);
    } else if (careSpec.id === 'SLEEPY') {
      this.teaCarePillowOverlay
        .setPosition(guestSpr.x - 24, guestSpr.y + 28)
        .setVisible(true);
      Juice.squashAndStretch(this, this.teaCarePillowOverlay, 0.2, 180);
    } else {
      // Tickle wiggle!
      this.tweens.add({
        targets: guestSpr,
        angle: { from: -10, to: 10 },
        duration: 90,
        yoyo: true,
        repeat: 5,
        onComplete: () => guestSpr.setAngle(0)
      });
    }

    Juice.burstStars(this, guestSpr.x, guestSpr.y - 40, 20, [
      careSpec.accentColor,
      0xfef08a,
      0xffffff
    ]);

    this.time.delayedCall(2200, () => {
      this.teaCareBlanketOverlay.setVisible(false);
      this.teaCarePillowOverlay.setVisible(false);
      this.refreshTeaCareNeedBubble();
    });
  }

  // ===========================================================================
  // ACT 3: EMMA'S ENCHANTED LIVING STICKER KINGDOM (3 BACKDROPS & 29 STICKERS)
  // ===========================================================================

  private buildAct3StickerKingdomRoom(): void {
    // 1. Placed Living Stickers Stage Layer (`placedStickersLayer`)
    this.placedStickersLayer = this.add.container(0, 0);
    this.stickerRoomContainer.add(this.placedStickersLayer);

    // 2. Top-Center 3 Switchable Full-Screen Backdrop Buttons (`x: 520, 640, 760, y: 48`)
    const backdropSpecs: Array<{ id: KingdomBackdropId; x: number; texKey: string; accent: number }> = [
      { id: 'MEADOW', x: 520, texKey: 'unicorn-sticker-meadow-bg', accent: 0x34d399 },
      { id: 'BALLROOM', x: 640, texKey: 'unicorn-sticker-ballroom-bg', accent: 0xf472b6 },
      { id: 'BEDROOM', x: 760, texKey: 'unicorn-sticker-bedroom-bg', accent: 0x38bdf8 }
    ];

    backdropSpecs.forEach((bSpec) => {
      const btn = this.add.container(bSpec.x, 48);
      const border = this.add.graphics();
      const thumb = this.add
        .image(0, 0, bSpec.texKey)
        .setDisplaySize(86, 48);

      btn.add([thumb, border]);
      btn.setData('borderGfx', border);
      btn.setData('accentColor', bSpec.accent);
      this.stickerRoomContainer.add(btn);
      this.backdropButtons.set(bSpec.id, btn);

      Juice.makeTactileButton(
        this,
        btn,
        104,
        68,
        () => {
          this.applyStickerKingdomBackdrop(bSpec.id);
          this.audio.playGemSocketChime(1);
          Juice.burstStars(this, bSpec.x, 48, 10, [bSpec.accent, 0xfef08a, 0xffffff]);
        },
        'tab'
      );
    });

    // 3. Top-Right Friendly Spatial Discovery Helper from Sparky (`x: 1125, y: 56`)
    this.spatialPromptBubble = this.add.container(1125, 56);
    const spBg = this.add.graphics();
    spBg.fillStyle(0x2e1065, 0.94);
    spBg.fillRoundedRect(-115, -34, 230, 68, 24);
    spBg.lineStyle(3, 0x34d399, 1);
    spBg.strokeRoundedRect(-115, -34, 230, 68, 24);

    const sparkyHead = this.add
      .image(-72, 2, 'char-sparky-bowtie')
      .setScale(0.26);

    this.spatialPromptIcon = this.add
      .image(-6, 0, 'stk-rainbow-arch')
      .setScale(0.28);

    this.spatialPromptArrowTxt = this.add
      .text(62, 0, '⬆️☁️', { fontSize: '24px' })
      .setOrigin(0.5);

    this.spatialPromptBubble.add([
      spBg,
      sparkyHead,
      this.spatialPromptIcon,
      this.spatialPromptArrowTxt
    ]);
    this.stickerRoomContainer.add(this.spatialPromptBubble);

    Juice.makeTactileButton(
      this,
      this.spatialPromptBubble,
      230,
      76,
      () => {
        this.cycleSpatialDiscoveryPrompt(true);
      },
      'pop'
    );

    // 4. Bottom-Right Royal Sticker Box (`x: 1195, y: 545`) to put away or clear stickers
    this.stickerBoxContainer = this.add.container(1195, 545);
    const boxBg = this.add.graphics();
    boxBg.fillStyle(0x4a044e, 0.94);
    boxBg.fillCircle(0, 0, 46);
    boxBg.lineStyle(3.5, 0xfacc15, 1);
    boxBg.strokeCircle(0, 0, 46);

    const boxTex = this.textures.exists('tool-sticker-box')
      ? 'tool-sticker-box'
      : 'stk-treasure-chest';
    const boxSprite = this.add.image(0, 0, boxTex).setScale(0.38);
    this.stickerBoxContainer.add([boxBg, boxSprite]);
    this.stickerRoomContainer.add(this.stickerBoxContainer);

    // 5. Sticker Ribbon Drawer (`y: 505..604`) + 5 Category Tabs (`y: 468`)
    const drawerBg = this.add.graphics();
    drawerBg.fillStyle(0x1e1b4b, 0.88);
    drawerBg.fillRoundedRect(140, 492, 980, 114, 24);
    drawerBg.lineStyle(3, 0xf472b6, 0.95);
    drawerBg.strokeRoundedRect(140, 492, 980, 114, 24);
    this.stickerRoomContainer.add(drawerBg);

    const catSpecs: Array<{
      id: StickerCategoryId;
      x: number;
      iconTex: string;
      accent: number;
    }> = [
      { id: 'UNICORNS', x: 300, iconTex: 'stk-unicorn-prance', accent: 0xf472b6 },
      { id: 'FRIENDS', x: 465, iconTex: 'stk-emma-curtsy', accent: 0xc084fc },
      { id: 'JEWELS', x: 630, iconTex: 'stk-diamond-crown', accent: 0xfacc15 },
      { id: 'SWEETS', x: 795, iconTex: 'stk-birthday-cake', accent: 0xfb7185 },
      { id: 'KINGDOM', x: 960, iconTex: 'stk-rainbow-arch', accent: 0x38bdf8 }
    ];

    catSpecs.forEach((cSpec) => {
      const tabBtn = this.add.container(cSpec.x, 466);
      const tGfx = this.add.graphics();
      const tIcon = this.add.image(0, 0, cSpec.iconTex).setScale(0.24);
      tabBtn.add([tGfx, tIcon]);
      tabBtn.setData('tabGfx', tGfx);
      tabBtn.setData('accentColor', cSpec.accent);
      this.stickerRoomContainer.add(tabBtn);
      this.stickerCategoryTabButtons.set(cSpec.id, tabBtn);

      Juice.makeTactileButton(
        this,
        tabBtn,
        136,
        54,
        () => {
          this.selectStickerCategory(cSpec.id);
        },
        'tab'
      );
    });

    this.stickerDrawerItemsContainer = this.add.container(0, 0);
    this.stickerRoomContainer.add(this.stickerDrawerItemsContainer);

    this.selectStickerCategory('UNICORNS');

    // Place 2 welcoming starter stickers on the stage so the Kingdom feels alive immediately!
    this.spawnPlacedLivingSticker(STICKER_CATALOG[6], 380, 345, false); // Princess Emma Curtsy
    this.spawnPlacedLivingSticker(STICKER_CATALOG[0], 560, 330, false); // Prancing Unicorn
  }

  private applyStickerKingdomBackdrop(backdropId: KingdomBackdropId): void {
    this.activeBackdrop = backdropId;
    const texMap: Record<KingdomBackdropId, string> = {
      MEADOW: 'unicorn-sticker-meadow-bg',
      BALLROOM: 'unicorn-sticker-ballroom-bg',
      BEDROOM: 'unicorn-sticker-bedroom-bg'
    };
    if (this.activeRoom === 'STICKER_KINGDOM') {
      this.bgImage.setTexture(texMap[backdropId]).setDisplaySize(1280, 720);
    }

    this.backdropButtons.forEach((btn, id) => {
      const border = btn.getData('borderGfx') as Phaser.GameObjects.Graphics;
      const accent = btn.getData('accentColor') as number;
      border.clear();
      if (id === backdropId) {
        border.lineStyle(4, 0xfef08a, 1);
        border.strokeRoundedRect(-45, -26, 90, 52, 8);
        border.lineStyle(2, accent, 1);
        border.strokeRoundedRect(-49, -30, 98, 60, 10);
        btn.setScale(1.08);
      } else {
        border.lineStyle(2, 0x94a3b8, 0.75);
        border.strokeRoundedRect(-43, -24, 86, 48, 6);
        btn.setScale(0.95);
      }
    });
  }

  private selectStickerCategory(catId: StickerCategoryId): void {
    this.activeStickerCategory = catId;

    this.stickerCategoryTabButtons.forEach((btn, id) => {
      const gfx = btn.getData('tabGfx') as Phaser.GameObjects.Graphics;
      const accent = btn.getData('accentColor') as number;
      gfx.clear();
      if (id === catId) {
        gfx.fillStyle(0x4a044e, 0.98);
        gfx.fillRoundedRect(-62, -24, 124, 48, 16);
        gfx.lineStyle(3.5, 0xfef08a, 1);
        gfx.strokeRoundedRect(-62, -24, 124, 48, 16);
        btn.setScale(1.06);
      } else {
        gfx.fillStyle(0x1e1b4b, 0.85);
        gfx.fillRoundedRect(-56, -20, 112, 40, 14);
        gfx.lineStyle(2, accent, 0.7);
        gfx.strokeRoundedRect(-56, -20, 112, 40, 14);
        btn.setScale(0.95);
      }
    });

    this.stickerDrawerItemsContainer.removeAll(true);
    const items = STICKER_CATALOG.filter((s) => s.category === catId);
    const count = items.length;
    const spacing = count >= 6 ? 150 : 175;
    const startX = 630 - ((count - 1) * spacing) / 2;

    items.forEach((spec, idx) => {
      const ix = startX + idx * spacing;
      const iy = 548;

      const slotBg = this.add.graphics();
      slotBg.fillStyle(0x3b0764, 0.75);
      slotBg.fillRoundedRect(ix - 54, iy - 44, 108, 88, 18);
      slotBg.lineStyle(2, 0xfbcfe8, 0.65);
      slotBg.strokeRoundedRect(ix - 54, iy - 44, 108, 88, 18);
      this.stickerDrawerItemsContainer.add(slotBg);

      const drawerSpr = this.add
        .image(ix, iy, spec.texKey)
        .setScale(spec.baseScale * 0.62)
        .setInteractive({ useHandCursor: true, draggable: true });
      this.stickerDrawerItemsContainer.add(drawerSpr);
      this.input.setDraggable(drawerSpr);

      drawerSpr.on('dragstart', () => {
        this.audio.playStickerPeel();
        drawerSpr.setDepth(85);
        // Satisfying paper-peel curl & scale pop
        this.tweens.add({
          targets: drawerSpr,
          scaleX: spec.baseScale * 1.08,
          scaleY: spec.baseScale * 0.92,
          angle: -10,
          duration: 120,
          ease: 'Back.easeOut'
        });
      });

      drawerSpr.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        drawerSpr.setPosition(dragX, dragY);
      });

      drawerSpr.on('dragend', () => {
        const dropX = drawerSpr.x;
        const dropY = drawerSpr.y;
        const dragDist = Phaser.Math.Distance.Between(dropX, dropY, ix, iy);

        // Return drawer icon to its ribbon slot
        drawerSpr.setPosition(ix, iy);
        drawerSpr.setScale(spec.baseScale * 0.62);
        drawerSpr.setAngle(0);
        drawerSpr.setDepth(20);

        if (dropY < 455) {
          this.spawnPlacedLivingSticker(spec, dropX, dropY, true);
        } else if (dragDist < 20) {
          // Single-tap on drawer sticker places it onto a lovely spot on the stage!
          const randX = Phaser.Math.Between(220, 1020);
          const randY = Phaser.Math.Between(180, 395);
          this.spawnPlacedLivingSticker(spec, randX, randY, true);
        }
      });
    });
  }

  private spawnPlacedLivingSticker(
    spec: StickerCatalogItem,
    x: number,
    y: number,
    withPeelSound: boolean
  ): void {
    const uid = this.nextStickerUid++;
    const container = this.add.container(x, y);

    const shadow = this.add
      .image(4, 8, spec.texKey)
      .setScale(spec.baseScale)
      .setTint(0x090414)
      .setAlpha(0.32);

    const sprite = this.add
      .image(0, 0, spec.texKey)
      .setScale(spec.baseScale);

    container.add([shadow, sprite]);
    this.placedStickersLayer.add(container);

    // Smooth peel-and-stick elastic pop onto the canvas
    container.setScale(1.28);
    this.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      duration: 240,
      ease: 'Back.easeOut'
    });

    // Continuous "Living Sticker" idle animation based on its category style
    const idleTween = this.createLivingStickerIdleTween(sprite, spec);

    const actor: PlacedStickerActor = {
      uid,
      spec,
      container,
      sprite,
      shadow,
      idleTween
    };
    this.placedStickers.push(actor);

    const hitZone = this.add
      .zone(0, 0, 130, 130)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true, draggable: true });
    container.add(hitZone);
    this.input.setDraggable(hitZone);

    let wasDragged = false;

    hitZone.on('dragstart', () => {
      wasDragged = false;
      this.audio.playStickerPeel();
      this.placedStickersLayer.bringToTop(container);
      container.setScale(1.14);
    });

    hitZone.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      wasDragged = true;
      const worldX = container.x + dragX;
      const worldY = container.y + dragY;
      container.setPosition(worldX, worldY);
    });

    hitZone.on('dragend', () => {
      container.setScale(1.0);
      const distToBox = Phaser.Math.Distance.Between(
        container.x,
        container.y,
        this.stickerBoxContainer.x,
        this.stickerBoxContainer.y
      );

      // Put away into the Royal Sticker Box if dragged into the bottom-right corner or back into drawer
      if (distToBox < 95 || container.y > 480) {
        this.removePlacedSticker(actor);
        return;
      }

      if (!wasDragged) {
        this.triggerLivingStickerTapGag(actor);
      } else {
        this.audio.playStickerStick(uid);
        Juice.burstStars(this, container.x, container.y, 10, [0xfef08a, 0xf472b6, 0xffffff]);
        this.checkSpatialDiscoveryCompletion(container.x, container.y);
      }
    });

    if (withPeelSound) {
      this.audio.playStickerStick(uid);
      Juice.burstStars(this, x, y, 14, [0xfef08a, 0xf472b6, 0x38bdf8, 0xffffff]);
      this.checkSpatialDiscoveryCompletion(x, y);
    }
  }

  private createLivingStickerIdleTween(
    sprite: Phaser.GameObjects.Image,
    spec: StickerCatalogItem
  ): Phaser.Tweens.Tween {
    if (spec.animStyle === 'FLUTTER') {
      return this.tweens.add({
        targets: sprite,
        y: -9,
        scaleX: spec.baseScale * 1.04,
        scaleY: spec.baseScale * 0.97,
        duration: 950,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
    if (spec.animStyle === 'TWIRL') {
      return this.tweens.add({
        targets: sprite,
        angle: { from: -6, to: 6 },
        y: -5,
        duration: 1250,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
    if (spec.animStyle === 'SPARKLE') {
      return this.tweens.add({
        targets: sprite,
        scaleX: { from: spec.baseScale * 0.96, to: spec.baseScale * 1.06 },
        scaleY: { from: spec.baseScale * 0.96, to: spec.baseScale * 1.06 },
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
    if (spec.animStyle === 'BOUNCE') {
      return this.tweens.add({
        targets: sprite,
        y: -8,
        scaleY: spec.baseScale * 1.05,
        duration: 850,
        yoyo: true,
        repeat: -1,
        ease: 'Quad.easeInOut'
      });
    }
    // FLOAT
    return this.tweens.add({
      targets: sprite,
      y: -10,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private triggerLivingStickerTapGag(actor: PlacedStickerActor): void {
    const { spec, container } = actor;
    if (spec.tapSound === 'UNICORN') {
      this.audio.playUnicornWhinny();
    } else if (spec.tapSound === 'FANFARE') {
      this.audio.playRoyalFanfare();
    } else if (spec.tapSound === 'SPARKY') {
      AudioBus.playSfx('sparky');
    } else if (spec.tapSound === 'DOGGIE') {
      AudioBus.playSfx('doggie');
    } else {
      this.audio.playGemSocketChime(actor.uid);
    }

    Juice.squashAndStretch(this, container, 0.24, 180);
    Juice.burstStars(this, container.x, container.y - 20, 14, [
      0xfef08a,
      0xf472b6,
      0x38bdf8,
      0xffffff
    ]);
  }

  private removePlacedSticker(actor: PlacedStickerActor): void {
    this.audio.playStickerPeel();
    actor.idleTween.stop();
    this.placedStickers = this.placedStickers.filter((p) => p.uid !== actor.uid);
    Juice.squashAndStretch(this, this.stickerBoxContainer, 0.22, 140);

    this.tweens.add({
      targets: actor.container,
      x: this.stickerBoxContainer.x,
      y: this.stickerBoxContainer.y,
      scaleX: 0.1,
      scaleY: 0.1,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeIn',
      onComplete: () => actor.container.destroy()
    });
  }

  private cycleSpatialDiscoveryPrompt(speakPrompt: boolean): void {
    this.spatialPromptIdx = (this.spatialPromptIdx + 1) % SPATIAL_PROMPTS.length;
    const spec = SPATIAL_PROMPTS[this.spatialPromptIdx];
    this.spatialPromptIcon.setTexture(spec.iconTex);
    this.spatialPromptArrowTxt.setText(spec.arrowSymbol);
    Juice.squashAndStretch(this, this.spatialPromptBubble, 0.16, 140);
    if (speakPrompt) {
      this.audio.speakPrompt(spec.promptId);
    }
  }

  private checkSpatialDiscoveryCompletion(x: number, y: number): void {
    const currentPrompt = SPATIAL_PROMPTS[this.spatialPromptIdx];
    if (currentPrompt.checkZone(x, y, this.placedStickers)) {
      this.awardGoldenStar(x, y);
      this.cycleSpatialDiscoveryPrompt(false);
    }
  }
}
