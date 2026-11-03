/**
 * BalloonPopScene.ts
 * ------------------
 * Mentor Note: "Balloon Letter Pop — Wyatt & Emma's Alphabet & Word Sky-Ship"
 *
 * Architectural Highlights:
 * 1. Heirloom Airship Cabinet Layout (`1280x720`):
 *    - Top Brass Marquee Word & Phonics Board (`x: 640, y: 58` inside the recessed mahogany marquee of `balloon-stage.jpg`):
 *      Displays the active Theme Pack badge on the left and carved wooden letter slots (`prop-tile` sprites) in the center.
 *    - Open, Unobstructed Sky Viewport (`x: 120..1160, y: 115..590`): No permanent crates or oversized stage props block the sky.
 *    - Left Airship Deck (`x: 175, y: 515`): Aviator Sparky & his Brass Balloon Inflator (`sparky-idle`, `sparky-pump`, `sparky-cheer`).
 *    - Bottom Airship Railing Track (`y: 545`, `x: 290..1020`): Sky-Basket Doggie (`doggie-idle`, `doggie-catch`, `doggie-cheer`)
 *      rolls smoothly to catch parachuting wooden letter tiles (`prop-parachute` + `prop-tile`) and launches them up into the marquee!
 *    - Bottom Brass Control Deck (`y: 672`): Dark mahogany-and-brass recessed backing strip (`x: 230..1050, y: 672`) mounting
 *      the 7 ornate square brass UI buttons (`ui-back`, `ui-mode-phonics`, `ui-mode-words`, `ui-theme`, `ui-speak`, `ui-wind`, `ui-album`)
 *      evenly spaced and centered across the deck.
 * 2. Buoyant Balloon Physics, Sparky Random Pump & Target Letter Guarantee:
 *    - Balloons rise gently (`vy ~ -48 to -68 px/s`) with sinusoidal horizontal breeze sway, soft elastic circle-to-circle
 *      collisions (`r = 52px`), and soft wall bounds at `x: 250` and `x: 1040`.
 *    - Automatic background spawning keeps ~7–8 balloons in the sky with at least 1–2 carrying the needed letter and the rest
 *      carrying varied random decoy letters.
 *    - Tapping Sparky pumps out a RANDOM letter balloon (25% chance of picking one of the remaining letters in the active word/target,
 *      75% chance of picking any random letter A–Z) with a random balloon color, while enforcing a clean max cap of 10 active balloons
 *      in the sky at once (gently floating the oldest highest balloon off the top if already at 10).
 * 3. Zero-Frustration Wrong Tap Handling:
 *    - Tapping a non-target balloon gives it a silly rubbery squash-and-stretch wobble, plays `playRubberBoing()`,
 *      nudges it sideways with a small puff of air, and speaks that balloon's letter while pulsing the target slot on the marquee!
 * 4. Two Focused Game Modes + Automatic 5-Word Rainbow Bonus + Persistent Word & Star Album (`'wyatt_emma_balloon_progress_v1'`):
 *    - Mode 1 (`ui-mode-phonics`): Emma's Phonics Discovery (A–Z letters & phonetic sounds with emoji picture clues).
 *    - Mode 2 (`ui-mode-words`): Wyatt's Word Builder across 6 Theme Packs (96 voiced words), triggering a fun 8-second
 *      Rainbow Balloon Bonus every 5 completed words!
 */

import Phaser from 'phaser';
import { ArcadeState } from '../core/ArcadeState';
import { AudioBus } from '../core/AudioBus';
import { Juice } from '../core/Juice';
import { BalloonAudioEngine } from '../audio/BalloonAudioEngine';

type GameMode = 'phonics' | 'words';
type ThemeId = 'family' | 'animals' | 'vehicles' | 'nature' | 'food' | 'home';

interface ThemePack {
  id: ThemeId;
  title: string;
  shortTitle: string;
  icon: string;
  colorHex: string;
  words: string[];
}

interface ActiveBalloon {
  id: number;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  letterText: Phaser.GameObjects.Text;
  hintRing: Phaser.GameObjects.Graphics;
  letter: string;
  texKey: string;
  isStar: boolean;
  isRainbow: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVy: number;
  radius: number;
  swayPhase: number;
  swayFreq: number;
  swayAmp: number;
  popped: boolean;
  retiring?: boolean;
}

interface ParachuteDrop {
  container: Phaser.GameObjects.Container;
  chuteSprite: Phaser.GameObjects.Image;
  tileSprite: Phaser.GameObjects.Image;
  letterText: Phaser.GameObjects.Text;
  letter: string;
  slotIndex: number;
  x: number;
  y: number;
  vy: number;
  swayPhase: number;
  caught: boolean;
}

interface WordSlot {
  container: Phaser.GameObjects.Container;
  tileBg: Phaser.GameObjects.Image;
  glowFrame: Phaser.GameObjects.Graphics;
  letterText: Phaser.GameObjects.Text;
  targetLetter: string;
  filled: boolean;
  inFlight: boolean;
  worldX: number;
  worldY: number;
}

interface BalloonProgressSave {
  stars: number;
  masteredLetters: string[];
  masteredWords: string[];
  lastMode: GameMode;
  lastTheme: ThemeId;
}

const PROGRESS_STORAGE_KEY = 'wyatt_emma_balloon_progress_v1';
const MAX_ACTIVE_BALLOONS = 10;

const BALLOON_COLOR_KEYS = [
  'balloon-red',
  'balloon-blue',
  'balloon-green',
  'balloon-gold',
  'balloon-purple',
  'balloon-coral'
];

const WORD_EMOJI_MAP: Record<string, string> = {
  // Family & Favorites
  WYATT: '👦', EMMA: '👧', MAMA: '👩', DADA: '👨', NANA: '👵', PAPA: '👴', DOG: '🐶', SPARKY: '🐉',
  // Animals
  CAT: '🐱', PIG: '🐷', BUG: '🐞', FOX: '🦊', HEN: '🐔', COW: '🐮', BAT: '🦇', OWL: '🦉',
  FROG: '🐸', BEAR: '🐻', DUCK: '🦆', FISH: '🐟', LION: '🦁', CRAB: '🦀', GOAT: '🐐', DEER: '🦌',
  TIGER: '🐯', ZEBRA: '🦓', SHARK: '🦈', WHALE: '🐳', HORSE: '🐴', SHEEP: '🐑', MOUSE: '🐭', SNAKE: '🐍',
  // Vehicles & Sky
  CAR: '🚗', BUS: '🚌', VAN: '🚐', JET: '✈️', SUB: '🚤', SHIP: '🚢',
  TRAIN: '🚂', TRUCK: '🚚', PLANE: '🛩️', BOAT: '⛵', ROCKET: '🚀', TRACTOR: '🚜',
  // Space & Nature
  SUN: '☀️', SKY: '🌤️', MUD: '🤎', LOG: '🪵', WEB: '🕸️', STAR: '⭐', MOON: '🌙', TREE: '🌳',
  RAIN: '🌧️', SNOW: '❄️', WIND: '💨', LEAF: '🍃', ROCK: '🪨', CLOUD: '☁️', EARTH: '🌍', OCEAN: '🌊',
  // Food & Treats
  JAM: '🍓', PIE: '🥧', CUP: '🥤', EGG: '🥚', NUT: '🥜', CAKE: '🎂', MILK: '🥛', CORN: '🌽',
  PEAR: '🍐', PLUM: '🍑', SOUP: '🍲', TACO: '🌮', APPLE: '🍎', BREAD: '🍞', PIZZA: '🍕', BERRY: '🫐',
  // Home & Toys
  HAT: '🎩', BED: '🛏️', BOX: '📦', RUG: '🧶', TOP: '🪀', PEN: '🖊️', BAG: '🎒', KEY: '🔑',
  BOOK: '📖', DRUM: '🥁', BALL: '⚽', DOLL: '🪆', KITE: '🪁', BELL: '🔔', TENT: '⛺', ROBOT: '🤖',
  CLOCK: '🕰️', CROWN: '👑'
};

const THEME_PACKS: ThemePack[] = [
  {
    id: 'family',
    title: 'Family & Favorites',
    shortTitle: 'Family',
    icon: '👑',
    colorHex: '#fbbf24',
    words: ['WYATT', 'EMMA', 'MAMA', 'DADA', 'NANA', 'PAPA', 'DOG', 'SPARKY']
  },
  {
    id: 'animals',
    title: 'Animals',
    shortTitle: 'Animals',
    icon: '🦁',
    colorHex: '#34d399',
    words: [
      'CAT', 'PIG', 'BUG', 'FOX', 'HEN', 'COW', 'BAT', 'OWL',
      'FROG', 'BEAR', 'DUCK', 'FISH', 'LION', 'CRAB', 'GOAT', 'DEER',
      'TIGER', 'ZEBRA', 'SHARK', 'WHALE', 'HORSE', 'SHEEP', 'MOUSE', 'SNAKE'
    ]
  },
  {
    id: 'vehicles',
    title: 'Vehicles & Sky',
    shortTitle: 'Vehicles',
    icon: '🚀',
    colorHex: '#38bdf8',
    words: [
      'CAR', 'BUS', 'VAN', 'JET', 'SUB', 'SHIP',
      'TRAIN', 'TRUCK', 'PLANE', 'BOAT', 'ROCKET', 'TRACTOR'
    ]
  },
  {
    id: 'nature',
    title: 'Space & Nature',
    shortTitle: 'Nature',
    icon: '🌟',
    colorHex: '#a78bfa',
    words: [
      'SUN', 'SKY', 'MUD', 'LOG', 'WEB', 'STAR', 'MOON', 'TREE',
      'RAIN', 'SNOW', 'WIND', 'LEAF', 'ROCK', 'CLOUD', 'EARTH', 'OCEAN'
    ]
  },
  {
    id: 'food',
    title: 'Food & Treats',
    shortTitle: 'Treats',
    icon: '🎂',
    colorHex: '#f472b6',
    words: [
      'JAM', 'PIE', 'CUP', 'EGG', 'NUT', 'CAKE', 'MILK', 'CORN',
      'PEAR', 'PLUM', 'SOUP', 'TACO', 'APPLE', 'BREAD', 'PIZZA', 'BERRY'
    ]
  },
  {
    id: 'home',
    title: 'Home & Toys',
    shortTitle: 'Toys',
    icon: '🤖',
    colorHex: '#fb923c',
    words: [
      'HAT', 'BED', 'BOX', 'RUG', 'TOP', 'PEN', 'BAG', 'KEY',
      'BOOK', 'DRUM', 'BALL', 'DOLL', 'KITE', 'BELL', 'TENT', 'ROBOT',
      'CLOCK', 'CROWN'
    ]
  }
];

export class BalloonPopScene extends Phaser.Scene {
  private audio!: BalloonAudioEngine;
  private progress!: BalloonProgressSave;

  private currentMode: GameMode = 'words';
  private currentThemeIndex = 0;
  private wordCursorByTheme: Record<ThemeId, number> = {
    family: 0,
    animals: 0,
    vehicles: 0,
    nature: 0,
    food: 0,
    home: 0
  };
  private phonicsCursor = 0;
  private wordsCompletedInSession = 0;

  private targetWord = 'WYATT';
  private wordSlots: WordSlot[] = [];
  private activeBalloons: ActiveBalloon[] = [];
  private parachuteDrops: ParachuteDrop[] = [];
  private nextBalloonId = 1;

  // Airship companions
  private sparkyContainer!: Phaser.GameObjects.Container;
  private sparkySprite!: Phaser.GameObjects.Image;
  private sparkyStateTimer: Phaser.Time.TimerEvent | null = null;

  private doggieContainer!: Phaser.GameObjects.Container;
  private doggieSprite!: Phaser.GameObjects.Image;
  private doggieStateTimer: Phaser.Time.TimerEvent | null = null;
  private doggieDragging = false;
  private doggieTargetX = 640;

  // Marquee HUD (strictly centered Wooden Letter Tiles inside x: 390..890, y: 58)
  private marqueeContainer!: Phaser.GameObjects.Container;
  private lastPopVoicePromise: Promise<void> = Promise.resolve();

  // Rainbow Frenzy state (triggers automatically every 5 completed words in WORDS mode)
  private isFrenzyActive = false;
  private frenzyTimeRemaining = 0;
  private frenzyBannerContainer: Phaser.GameObjects.Container | null = null;
  private frenzySpawnTimer = 0;

  // Bottom UI buttons & active mode glow
  private modeButtonGlows: Map<GameMode, Phaser.GameObjects.Graphics> = new Map();
  private themeButtonLabel!: Phaser.GameObjects.Text;

  // Spawn & cooldown timers
  private spawnTimer = 0;
  private wrongTapVoiceCooldownUntil = 0;
  private roundTransitioning = false;
  private comboCount = 0;

  // Collector's Word & Star Album Modal
  private albumModal: Phaser.GameObjects.Container | null = null;
  private albumActiveThemeIndex = 0;

  constructor() {
    super({ key: 'BalloonPopScene' });
  }

  public create(): void {
    this.audio = new BalloonAudioEngine();
    this.progress = this.loadProgress();

    // Default mode: Emma (3) starts on Phonics Discovery or saved mode; Wyatt (4) starts on Word Builder or saved mode
    const activeKid = ArcadeState.getActiveKid().id;
    this.currentMode = this.progress.lastMode || (activeKid === 'emma' ? 'phonics' : 'words');
    const savedThemeIdx = THEME_PACKS.findIndex((t) => t.id === this.progress.lastTheme);
    this.currentThemeIndex = savedThemeIdx >= 0 ? savedThemeIdx : 0;

    this.activeBalloons = [];
    this.parachuteDrops = [];
    this.wordSlots = [];
    this.isFrenzyActive = false;
    this.roundTransitioning = false;
    this.wordsCompletedInSession = 0;
    this.albumModal = null;

    this.audio.preloadCoreClips(THEME_PACKS[this.currentThemeIndex].words);

    // 1. Full-screen Heirloom Airship Cabinet Background (`1280x720`)
    this.add.image(640, 360, 'balloon-stage').setDepth(1);

    // 2. Top Brass Marquee Word & Phonics Board (`x: 640, y: 58`)
    this.buildTopBrassMarquee();

    // 3. Left Airship Deck — Aviator Sparky & Balloon Inflator (`x: 175, y: 515`)
    this.buildAviatorSparky();

    // 4. Bottom Airship Railing Track — Sky-Basket Doggie (`y: 545`, `x: 290..1020`)
    this.buildSkyBasketDoggie();

    // 5. Bottom Brass Control Deck (`y: 672`, 7 evenly spaced square brass UI buttons)
    this.buildBottomControlDeck();

    // 6. Start initial round & spawn initial wave of balloons
    this.startNewTargetRound(true);

    this.cameras.main.fadeIn(320, 0, 0, 0);
  }

  // ===========================================================================
  // 1. PERSISTENT PROGRESS (`wyatt_emma_balloon_progress_v1`)
  // ===========================================================================

  private loadProgress(): BalloonProgressSave {
    const activeKid = ArcadeState.getActiveKid().id;
    const defaults: BalloonProgressSave = {
      stars: 0,
      masteredLetters: [],
      masteredWords: [],
      lastMode: activeKid === 'emma' ? 'phonics' : 'words',
      lastTheme: 'family'
    };

    try {
      const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw) as Partial<BalloonProgressSave>;
      return {
        stars: typeof parsed.stars === 'number' ? parsed.stars : 0,
        masteredLetters: Array.isArray(parsed.masteredLetters) ? parsed.masteredLetters : [],
        masteredWords: Array.isArray(parsed.masteredWords) ? parsed.masteredWords : [],
        lastMode:
          parsed.lastMode === 'phonics' || parsed.lastMode === 'words'
            ? parsed.lastMode
            : defaults.lastMode,
        lastTheme: THEME_PACKS.some((t) => t.id === parsed.lastTheme)
          ? (parsed.lastTheme as ThemeId)
          : 'family'
      };
    } catch {
      return defaults;
    }
  }

  private saveProgress(): void {
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(this.progress));
    } catch {
      // Ignore storage quota errors
    }
  }

  private awardStars(amount: number): void {
    this.progress.stars += amount;
    ArcadeState.addStars(amount);
    this.saveProgress();
  }

  // ===========================================================================
  // 2. HEIRLOOM CABINET LAYOUT BUILDERS
  // ===========================================================================

  private buildTopBrassMarquee(): void {
    this.marqueeContainer = this.add.container(640, 58).setDepth(30);

    // Subtle interactive hit zone over the recessed mahogany marquee (`x: 390..890, y: 58`)
    const hitZone = this.add
      .rectangle(0, 0, 500, 92, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true });
    hitZone.on('pointerdown', () => {
      Juice.squashAndStretch(this, this.marqueeContainer, 0.06, 130);
      this.playMarqueeAudioHint();
    });
    this.marqueeContainer.add(hitZone);
  }

  private buildAviatorSparky(): void {
    this.sparkyContainer = this.add.container(175, 515).setDepth(26);
    this.sparkySprite = this.add
      .image(0, 0, 'sparky-idle')
      .setDisplaySize(172, 165);
    this.sparkyContainer.add(this.sparkySprite);

    // Gentle breathing idle tween
    this.tweens.add({
      targets: this.sparkySprite,
      y: -5,
      duration: 1350,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Tapping Sparky pumps out a RANDOM letter balloon (25% remaining word letter, 75% any A-Z)
    // and enforces a max cap of 10 active balloons on screen!
    this.sparkyContainer.setSize(165, 165);
    this.sparkyContainer.setInteractive({ useHandCursor: true });
    this.sparkyContainer.on('pointerdown', () => {
      this.animateSparkyPump(true);
      this.audio.playWindGust();

      const randomLetter = this.pickSparkyPumpLetter();
      const randomColor = BALLOON_COLOR_KEYS[Phaser.Math.Between(0, BALLOON_COLOR_KEYS.length - 1)];
      this.spawnBalloon(randomLetter, Phaser.Math.Between(285, 560), randomColor);
      Juice.burstStars(this, 235, 485, 8, [0xfbbf24, 0x34d399, 0xffffff]);
    });
  }

  private pickSparkyPumpLetter(): string {
    const remainingWordLetters = this.wordSlots
      .filter((s) => !s.filled)
      .map((s) => s.targetLetter);

    // 25% chance of picking one of the remaining letters in the active word/target
    if (remainingWordLetters.length > 0 && Math.random() < 0.25) {
      return remainingWordLetters[Phaser.Math.Between(0, remainingWordLetters.length - 1)];
    }

    // 75% chance of picking any random letter A-Z
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return alphabet.charAt(Phaser.Math.Between(0, alphabet.length - 1));
  }

  private animateSparkyPump(withSparkles = false): void {
    if (!this.sparkySprite) return;
    if (this.sparkyStateTimer) {
      this.sparkyStateTimer.remove(false);
    }
    this.sparkySprite.setTexture('sparky-pump');
    this.sparkySprite.setDisplaySize(174, 165);
    Juice.squashAndStretch(this, this.sparkyContainer, 0.16, 130);

    if (withSparkles) {
      Juice.burstStars(this, this.sparkyContainer.x + 58, this.sparkyContainer.y - 12, 6, [
        0xfef08a,
        0xfbbf24,
        0xffffff
      ]);
    }

    this.sparkyStateTimer = this.time.delayedCall(520, () => {
      if (this.sparkySprite && this.sparkySprite.active) {
        this.sparkySprite.setTexture('sparky-idle');
        this.sparkySprite.setDisplaySize(172, 165);
      }
    });
  }

  private animateSparkyCheer(): void {
    if (!this.sparkySprite) return;
    if (this.sparkyStateTimer) {
      this.sparkyStateTimer.remove(false);
    }
    this.sparkySprite.setTexture('sparky-cheer');
    this.sparkySprite.setDisplaySize(178, 169);
    Juice.jumpFlip(this, this.sparkyContainer, 28, false);

    this.sparkyStateTimer = this.time.delayedCall(1400, () => {
      if (this.sparkySprite && this.sparkySprite.active) {
        this.sparkySprite.setTexture('sparky-idle');
        this.sparkySprite.setDisplaySize(172, 165);
      }
    });
  }

  private buildSkyBasketDoggie(): void {
    this.doggieContainer = this.add.container(640, 545).setDepth(28);
    this.doggieSprite = this.add
      .image(0, 0, 'doggie-idle')
      .setDisplaySize(126, 160);
    this.doggieContainer.add(this.doggieSprite);

    this.doggieContainer.setSize(130, 155);
    this.doggieContainer.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(this.doggieContainer);

    this.doggieContainer.on('pointerdown', () => {
      this.doggieDragging = true;
      AudioBus.playSfx('doggie');
      Juice.squashAndStretch(this, this.doggieContainer, 0.15, 120);
    });

    this.doggieContainer.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
      this.doggieDragging = true;
      const clampedX = Phaser.Math.Clamp(dragX, 290, 1020);
      this.doggieContainer.x = clampedX;
      this.doggieTargetX = clampedX;
    });

    this.doggieContainer.on('dragend', () => {
      this.doggieDragging = false;
    });
  }

  private setDoggiePose(pose: 'doggie-idle' | 'doggie-catch' | 'doggie-cheer', durationMs = 700): void {
    if (!this.doggieSprite) return;
    if (this.doggieStateTimer) {
      this.doggieStateTimer.remove(false);
    }
    this.doggieSprite.setTexture(pose);
    this.doggieSprite.setDisplaySize(128, 160);
    Juice.squashAndStretch(this, this.doggieContainer, 0.18, 130);

    if (pose !== 'doggie-idle') {
      this.doggieStateTimer = this.time.delayedCall(durationMs, () => {
        if (this.doggieSprite && this.doggieSprite.active) {
          this.doggieSprite.setTexture('doggie-idle');
          this.doggieSprite.setDisplaySize(126, 160);
        }
      });
    }
  }

  private buildBottomControlDeck(): void {
    const deckY = 672;

    // Dark mahogany-and-brass recessed backing strip (`x: 245..1035, y: 672`)
    const deckBg = this.add.graphics().setDepth(35);
    deckBg.fillStyle(0x1f1108, 0.94);
    deckBg.lineStyle(3, 0xd97706, 0.95);
    deckBg.fillRoundedRect(245, deckY - 42, 790, 84, 18);
    deckBg.strokeRoundedRect(245, deckY - 42, 790, 84, 18);

    // Inner brass trim hairline
    deckBg.lineStyle(1.5, 0xfef08a, 0.45);
    deckBg.strokeRoundedRect(251, deckY - 37, 778, 74, 14);

    interface DeckButtonSpec {
      tex: string;
      label: string;
      mode?: GameMode;
      isTheme?: boolean;
      onTap: () => void;
    }

    const specs: DeckButtonSpec[] = [
      {
        tex: 'ui-back',
        label: 'HUB',
        onTap: () => {
          this.audio.stopVoiceQueue();
          AudioBus.playSfx('pop');
          this.cameras.main.fadeOut(240, 0, 0, 0);
          this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start('HubScene');
          });
        }
      },
      {
        tex: 'ui-mode-phonics',
        label: 'A-B-C',
        mode: 'phonics',
        onTap: () => this.switchGameMode('phonics')
      },
      {
        tex: 'ui-mode-words',
        label: 'WORDS',
        mode: 'words',
        onTap: () => this.switchGameMode('words')
      },
      {
        tex: 'ui-theme',
        label: THEME_PACKS[this.currentThemeIndex].shortTitle.toUpperCase(),
        isTheme: true,
        onTap: () => this.cycleThemePack()
      },
      {
        tex: 'ui-speak',
        label: 'HEAR',
        onTap: () => this.triggerSpeakHint()
      },
      {
        tex: 'ui-wind',
        label: 'BREEZE',
        onTap: () => this.triggerWindGust()
      },
      {
        tex: 'ui-album',
        label: 'ALBUM',
        onTap: () => this.openAlbumModal()
      }
    ];

    // Space the 7 ornate brass buttons evenly and centered across x: 640 (step = 114px)
    const stepX = 114;
    const startX = 640 - ((specs.length - 1) * stepX) / 2;

    specs.forEach((spec, idx) => {
      const bx = Math.round(startX + idx * stepX);
      const btnContainer = this.add.container(bx, deckY - 5).setDepth(38);

      if (spec.mode) {
        const glow = this.add.graphics();
        glow.lineStyle(4, 0xfef08a, 1);
        glow.fillStyle(0xfbbf24, 0.25);
        glow.fillRoundedRect(-35, -35, 70, 70, 14);
        glow.strokeRoundedRect(-35, -35, 70, 70, 14);
        btnContainer.add(glow);
        this.modeButtonGlows.set(spec.mode, glow);
      }

      const icon = this.add.image(0, 0, spec.tex).setDisplaySize(64, 64);
      btnContainer.add(icon);

      const lbl = this.add
        .text(0, 34, spec.label, {
          fontFamily: '"Fredoka", "Nunito", sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#fef08a',
          stroke: '#1c0f06',
          strokeThickness: 4
        })
        .setOrigin(0.5);
      btnContainer.add(lbl);

      if (spec.isTheme) {
        this.themeButtonLabel = lbl;
      }

      Juice.makeTactileButton(this, btnContainer, 76, 76, spec.onTap, null);
    });

    this.refreshModeButtonGlows();
  }

  private refreshModeButtonGlows(): void {
    this.modeButtonGlows.forEach((glow, mode) => {
      glow.setVisible(mode === this.currentMode);
    });
  }

  // ===========================================================================
  // 3. MODE & THEME SWITCHING + TARGET WORD/LETTER ROUND SETUP
  // ===========================================================================

  private switchGameMode(mode: GameMode): void {
    if (this.albumModal) this.closeAlbumModal();
    if (this.currentMode === mode && !this.isFrenzyActive) {
      this.playMarqueeAudioHint();
      return;
    }

    this.currentMode = mode;
    this.progress.lastMode = mode;
    this.saveProgress();
    this.refreshModeButtonGlows();

    if (mode === 'phonics') {
      this.audio.playPraise('prompt_phonics');
    } else {
      this.audio.playPraise('prompt_spell');
    }

    this.startNewTargetRound(false);
  }

  private cycleThemePack(): void {
    if (this.albumModal) this.closeAlbumModal();
    this.currentThemeIndex = (this.currentThemeIndex + 1) % THEME_PACKS.length;
    const pack = THEME_PACKS[this.currentThemeIndex];
    this.progress.lastTheme = pack.id;
    this.saveProgress();

    if (this.themeButtonLabel) {
      this.themeButtonLabel.setText(pack.shortTitle.toUpperCase());
    }

    this.audio.preloadCoreClips(pack.words);
    AudioBus.playSfx('chime');

    if (this.currentMode === 'phonics') {
      const sampleWord = pack.words[0] || 'A';
      this.phonicsCursor = Math.max(0, sampleWord.charCodeAt(0) - 65);
    }

    this.startNewTargetRound(true);
  }

  private startNewTargetRound(speakTargetImmediately: boolean): void {
    this.roundTransitioning = false;
    this.comboCount = 0;

    // Clear any in-flight parachute drops
    for (const drop of this.parachuteDrops) {
      drop.container.destroy();
    }
    this.parachuteDrops = [];

    // Clear existing word slots
    for (const slot of this.wordSlots) {
      slot.container.destroy();
    }
    this.wordSlots = [];

    const pack = THEME_PACKS[this.currentThemeIndex];

    if (this.currentMode === 'phonics') {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const targetLetter = alphabet[this.phonicsCursor % alphabet.length];
      this.targetWord = targetLetter;

      this.createMarqueeSlots([targetLetter]);

      if (speakTargetImmediately) {
        this.lastPopVoicePromise = this.audio.playLetterThenPhonics(targetLetter);
      }
    } else {
      const words = pack.words;
      const cursor = this.wordCursorByTheme[pack.id] % words.length;
      this.targetWord = words[cursor];

      const letters = this.targetWord.split('');
      this.createMarqueeSlots(letters);

      if (speakTargetImmediately) {
        this.lastPopVoicePromise = this.audio.playWord(this.targetWord);
      }
    }

    // Ensure floating balloons immediately include at least 1–2 of the needed target letter
    this.ensureTargetLetterBalloonsOnScreen();
  }

  private createMarqueeSlots(letters: string[]): void {
    // Reserve the entire recessed mahogany board of the Top Brass Marquee (x: 390..890, centered at 640, 58)
    // exclusively for the Wooden Letter Tiles ('prop-tile'):
    // - 1 Letter (A-B-C mode): tile size 68x68px centered at (640, 58)
    // - 2 Letters: tile size 64x64px, step 80px
    // - 3 Letters (e.g. CAT, DOG): tile size 62x62px, center-to-center step 78px
    // - 4 Letters (e.g. MAMA, BEAR): tile size 60x60px, step 74px
    // - 5 Letters (e.g. WYATT, APPLE): tile size 56x56px, step 68px
    // - 6 Letters (e.g. SPARKY, ROCKET): tile size 52x52px, step 62px
    // - 7+ Letters (e.g. TRACTOR): tile size 46x46px, step 54px
    const len = letters.length;
    const slotSize =
      len === 1
        ? 68
        : len === 2
        ? 64
        : len === 3
        ? 62
        : len === 4
        ? 60
        : len === 5
        ? 56
        : len === 6
        ? 52
        : 46;
    const stepX =
      len === 1
        ? 0
        : len === 2
        ? 80
        : len === 3
        ? 78
        : len === 4
        ? 74
        : len === 5
        ? 68
        : len === 6
        ? 62
        : 54;

    // Centered horizontally at exact world x: 640 (localX: 0) and vertically at world y: 58 (localY: 0)
    const startX = -((len - 1) * stepX) / 2;

    const framePad = Math.max(3, Math.round(slotSize * 0.08));
    const frameCorner = Math.max(7, Math.round(slotSize * 0.18));
    const frameStroke = Math.max(2.5, slotSize * 0.055);

    letters.forEach((ch, idx) => {
      const sx = Math.round(startX + idx * stepX);
      const sy = 0;

      const slotContainer = this.add.container(sx, sy);

      const glowFrame = this.add.graphics();
      glowFrame.lineStyle(frameStroke, 0xfef08a, 0.95);
      glowFrame.fillStyle(0xfbbf24, 0.22);
      glowFrame.fillRoundedRect(
        -slotSize / 2 - framePad,
        -slotSize / 2 - framePad,
        slotSize + framePad * 2,
        slotSize + framePad * 2,
        frameCorner
      );
      glowFrame.strokeRoundedRect(
        -slotSize / 2 - framePad,
        -slotSize / 2 - framePad,
        slotSize + framePad * 2,
        slotSize + framePad * 2,
        frameCorner
      );
      glowFrame.setVisible(idx === 0);

      const tileBg = this.add
        .image(0, 0, 'prop-tile')
        .setDisplaySize(slotSize, slotSize)
        .setTint(0x8c6d53)
        .setAlpha(0.55);

      const fontSizePx = Math.round(slotSize * 0.56);
      const letterText = this.add
        .text(0, -1, ch, {
          fontFamily: '"Fredoka", "Nunito", sans-serif',
          fontSize: `${fontSizePx}px`,
          fontStyle: 'bold',
          color: '#fde68a',
          stroke: '#271406',
          strokeThickness: Math.max(4, Math.round(slotSize * 0.09))
        })
        .setOrigin(0.5)
        .setAlpha(0.32);

      slotContainer.add([glowFrame, tileBg, letterText]);
      this.marqueeContainer.add(slotContainer);

      this.wordSlots.push({
        container: slotContainer,
        tileBg,
        glowFrame,
        letterText,
        targetLetter: ch,
        filled: false,
        inFlight: false,
        worldX: 640 + sx,
        worldY: 58 + sy
      });
    });
  }

  private getNextNeededSlotIndex(): number {
    for (let i = 0; i < this.wordSlots.length; i++) {
      if (!this.wordSlots[i].filled && !this.wordSlots[i].inFlight) {
        return i;
      }
    }
    return -1;
  }

  private getCurrentlyNeededLetter(): string {
    const idx = this.getNextNeededSlotIndex();
    if (idx >= 0) {
      return this.wordSlots[idx].targetLetter;
    }
    for (let i = 0; i < this.wordSlots.length; i++) {
      if (!this.wordSlots[i].filled) return this.wordSlots[i].targetLetter;
    }
    return this.targetWord.charAt(0) || 'A';
  }

  private highlightActiveTargetSlot(): void {
    const activeIdx = this.getNextNeededSlotIndex();
    this.wordSlots.forEach((slot, idx) => {
      slot.glowFrame.setVisible(idx === activeIdx && !slot.filled);
      if (idx === activeIdx && !slot.filled) {
        Juice.squashAndStretch(this, slot.container, 0.20, 150);
      }
    });
  }

  // ===========================================================================
  // 4. BUOYANT BALLOON SPAWNING, PHYSICS & TARGET LETTER GUARANTEE
  // ===========================================================================

  private getLiveBalloons(): ActiveBalloon[] {
    return this.activeBalloons.filter((b) => !b.popped && !b.retiring);
  }

  private enforceMaxBalloonCap(): void {
    const live = this.getLiveBalloons();
    if (live.length < MAX_ACTIVE_BALLOONS) return;

    // Gently float the oldest highest balloon(s) off the top so the sky never exceeds 10 active balloons
    const excess = live.length - (MAX_ACTIVE_BALLOONS - 1);
    const sortedOldestHighest = [...live].sort((a, b) => a.y - b.y || a.id - b.id);

    for (let i = 0; i < excess && i < sortedOldestHighest.length; i++) {
      const oldest = sortedOldestHighest[i];
      oldest.retiring = true;
      oldest.baseVy = -260;
      oldest.vy = -260;
      this.tweens.add({
        targets: oldest.container,
        y: 110,
        alpha: 0,
        duration: 380,
        ease: 'Quad.easeIn',
        onComplete: () => {
          oldest.popped = true;
          oldest.container.destroy();
          this.activeBalloons = this.activeBalloons.filter((b) => b.id !== oldest.id);
        }
      });
    }
  }

  private ensureTargetLetterBalloonsOnScreen(): void {
    if (this.isFrenzyActive || this.roundTransitioning) return;

    const needed = this.getCurrentlyNeededLetter();
    const live = this.getLiveBalloons();
    const matchingBalloons = live.filter(
      (b) => b.letter === needed && b.y > 165 && b.y < 605
    );

    if (matchingBalloons.length < 1) {
      if (live.length < 8) {
        this.spawnBalloon(needed);
      } else {
        const candidate = live.find((b) => b.letter !== needed);
        if (candidate) {
          candidate.letter = needed;
          candidate.letterText.setText(needed);
          Juice.squashAndStretch(this, candidate.container, 0.15, 120);
        }
      }
    }
  }

  private pickSpawnLetter(): string {
    const needed = this.getCurrentlyNeededLetter();
    const live = this.getLiveBalloons();
    const matchingCount = live.filter(
      (b) => b.letter === needed && b.y > 165
    ).length;

    // Guarantee at least 1-2 balloons carry the needed letter; keep the rest varied random decoys
    if (matchingCount === 0) {
      return needed;
    }
    if (matchingCount === 1 && Math.random() < 0.32) {
      return needed;
    }

    // Occasional upcoming letter from the current word (20%), otherwise random decoy A-Z (80%)
    const upcomingLetters = this.wordSlots
      .filter((s) => !s.filled)
      .map((s) => s.targetLetter);
    if (upcomingLetters.length > 0 && Math.random() < 0.20) {
      return upcomingLetters[Phaser.Math.Between(0, upcomingLetters.length - 1)];
    }

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return alphabet.charAt(Phaser.Math.Between(0, alphabet.length - 1));
  }

  private spawnBalloon(
    forcedLetter?: string,
    forcedX?: number,
    forcedColorKey?: string
  ): ActiveBalloon {
    if (!this.isFrenzyActive) {
      this.enforceMaxBalloonCap();
    }

    const letter = forcedLetter || this.pickSpawnLetter();

    // Pick a non-overlapping X between 280 and 1020
    let spawnX = forcedX ?? Phaser.Math.Between(285, 1015);
    if (!forcedX) {
      for (let attempt = 0; attempt < 8; attempt++) {
        const testX = Phaser.Math.Between(285, 1015);
        const tooClose = this.activeBalloons.some(
          (b) => !b.popped && Math.abs(b.x - testX) < 95 && b.y > 470
        );
        if (!tooClose) {
          spawnX = testX;
          break;
        }
      }
    }
    const spawnY = 590;

    const isRainbow = !forcedColorKey && this.isFrenzyActive && Math.random() < 0.65;
    const isStar =
      !forcedColorKey &&
      !isRainbow &&
      (this.isFrenzyActive ? Math.random() < 0.5 : Math.random() < 0.14);
    const texKey =
      forcedColorKey ||
      (isRainbow
        ? 'balloon-rainbow'
        : isStar
        ? 'balloon-star'
        : BALLOON_COLOR_KEYS[Phaser.Math.Between(0, BALLOON_COLOR_KEYS.length - 1)]);

    const container = this.add.container(spawnX, spawnY).setDepth(20);

    const hintRing = this.add.graphics();
    hintRing.setVisible(false);
    container.add(hintRing);

    const sprite = this.add
      .image(0, 0, texKey)
      .setDisplaySize(isStar ? 122 : 112, isStar ? 148 : 144);
    container.add(sprite);

    const letterText = this.add
      .text(0, -18, letter, {
        fontFamily: '"Fredoka", "Nunito", sans-serif',
        fontSize: '42px',
        fontStyle: 'bold',
        color: '#fffbeb',
        stroke: '#271406',
        strokeThickness: 8
      })
      .setOrigin(0.5);
    container.add(letterText);

    // Pop-in inflation tween + Sparky pump animation
    container.setScale(0.25);
    this.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      duration: 240,
      ease: 'Back.easeOut'
    });
    this.animateSparkyPump(false);

    const baseVy = this.isFrenzyActive
      ? Phaser.Math.FloatBetween(-105, -145)
      : Phaser.Math.FloatBetween(-48, -68);

    const balloon: ActiveBalloon = {
      id: this.nextBalloonId++,
      container,
      sprite,
      letterText,
      hintRing,
      letter,
      texKey,
      isStar,
      isRainbow,
      x: spawnX,
      y: spawnY,
      vx: Phaser.Math.FloatBetween(-12, 12),
      vy: baseVy,
      baseVy,
      radius: 52,
      swayPhase: Phaser.Math.FloatBetween(0, Math.PI * 2),
      swayFreq: Phaser.Math.FloatBetween(1.4, 2.2),
      swayAmp: Phaser.Math.FloatBetween(14, 24),
      popped: false
    };

    // Generous 116x136px hit area for ages 3–4
    container.setSize(116, 136);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => {
      this.onBalloonTapped(balloon);
    });

    this.activeBalloons.push(balloon);
    return balloon;
  }

  // ===========================================================================
  // 5. BALLOON TAP HANDLING (RAINBOW FRENZY, CORRECT TAP & ZERO-FRUSTRATION WRONG TAP)
  // ===========================================================================

  private onBalloonTapped(balloon: ActiveBalloon): void {
    if (balloon.popped || balloon.retiring || this.albumModal) return;

    // During Rainbow Balloon Frenzy, tapping ANY balloon bursts it for bonus stars & musical chimes!
    if (this.isFrenzyActive) {
      this.popBalloonInFrenzy(balloon);
      return;
    }

    if (this.roundTransitioning) return;

    const neededSlotIdx = this.getNextNeededSlotIndex();
    const neededLetter = neededSlotIdx >= 0 ? this.wordSlots[neededSlotIdx].targetLetter : '';

    if (neededSlotIdx >= 0 && balloon.letter === neededLetter) {
      this.handleCorrectBalloonPop(balloon, neededSlotIdx);
    } else {
      this.handleWrongBalloonTap(balloon);
    }
  }

  private handleWrongBalloonTap(balloon: ActiveBalloon): void {
    // 1. Silly rubbery squash-and-stretch wobble + sideways air puff nudge
    this.audio.playRubberBoing();
    Juice.wobble(this, balloon.container, 16);

    const nudgeDir = balloon.x < 640 ? 1 : -1;
    balloon.vx += nudgeDir * 85;
    balloon.vy = Math.min(balloon.vy, -30);

    // Small visual puff of air
    Juice.burstStars(this, balloon.x, balloon.y - 10, 5, [0xe0f2fe, 0xffffff]);

    // 2. Gently pulse the needed letter slot on the Top Brass Marquee
    this.highlightActiveTargetSlot();

    // 3. Speak the tapped balloon's letter (with a 900ms cooldown so rapid taps don't spam)
    const now = this.time.now;
    if (now > this.wrongTapVoiceCooldownUntil) {
      this.wrongTapVoiceCooldownUntil = now + 900;
      this.audio.playLetter(balloon.letter);
    }
  }

  private handleCorrectBalloonPop(balloon: ActiveBalloon, slotIndex: number): void {
    balloon.popped = true;
    const slot = this.wordSlots[slotIndex];
    slot.inFlight = true;

    // 1. Confetti & star burst + ascending pentatonic pop SFX
    this.comboCount++;
    this.audio.playBalloonPop(this.comboCount - 1);
    Juice.burstStars(this, balloon.x, balloon.y - 10, balloon.isStar ? 18 : 12, [
      0xfbbf24,
      0x34d399,
      0xf472b6,
      0x38bdf8,
      0xffffff
    ]);

    if (balloon.isStar) {
      this.awardStars(2);
      Juice.popFloatingLabel(this, balloon.x, balloon.y - 24, '+2 ⭐', '#fef08a');
    } else {
      this.awardStars(1);
    }

    // 2. Speak the letter name followed 150ms later by its phonetic sound and track the Promise!
    this.lastPopVoicePromise = this.audio.playLetterThenPhonics(balloon.letter);

    // 3. Spawn the parachuting wooden letter tile (`prop-parachute` + `prop-tile`)
    this.spawnParachuteTile(balloon.x, balloon.y, balloon.letter, slotIndex);

    // 4. Destroy the popped balloon container cleanly
    balloon.container.destroy();
    this.activeBalloons = this.activeBalloons.filter((b) => b.id !== balloon.id);

    // Highlight the next slot if multi-letter word
    this.highlightActiveTargetSlot();
    this.ensureTargetLetterBalloonsOnScreen();
  }

  private popBalloonInFrenzy(balloon: ActiveBalloon): void {
    balloon.popped = true;
    this.comboCount++;
    this.audio.playBalloonPop(this.comboCount);
    this.awardStars(balloon.isStar ? 2 : 1);

    Juice.burstStars(this, balloon.x, balloon.y, 16, [
      0xfbbf24,
      0xf472b6,
      0x38bdf8,
      0x34d399,
      0xa78bfa,
      0xffffff
    ]);
    Juice.popFloatingLabel(
      this,
      balloon.x,
      balloon.y,
      balloon.isStar ? '⭐⭐ BONUS!' : '⭐ POP!',
      '#fef08a'
    );

    balloon.container.destroy();
    this.activeBalloons = this.activeBalloons.filter((b) => b.id !== balloon.id);
  }

  // ===========================================================================
  // 6. PARACHUTE TILE DROP & SKY-BASKET DOGGIE CATCH SEQUENCE
  // ===========================================================================

  private spawnParachuteTile(x: number, y: number, letter: string, slotIndex: number): void {
    this.audio.playParachuteWhoosh();

    const dropX = Phaser.Math.Clamp(x, 300, 1000);
    const dropY = Phaser.Math.Clamp(y, 150, 430);

    const container = this.add.container(dropX, dropY).setDepth(27);

    const chuteSprite = this.add
      .image(0, -44, 'prop-parachute')
      .setDisplaySize(86, 98);
    const tileSprite = this.add
      .image(0, 16, 'prop-tile')
      .setDisplaySize(56, 56);
    const letterText = this.add
      .text(0, 15, letter, {
        fontFamily: '"Fredoka", "Nunito", sans-serif',
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#271406',
        stroke: '#fef3c7',
        strokeThickness: 3
      })
      .setOrigin(0.5);

    container.add([chuteSprite, tileSprite, letterText]);

    this.parachuteDrops.push({
      container,
      chuteSprite,
      tileSprite,
      letterText,
      letter,
      slotIndex,
      x: dropX,
      y: dropY,
      vy: 155,
      swayPhase: 0,
      caught: false
    });
  }

  private catchParachuteTileWithDoggie(drop: ParachuteDrop): void {
    drop.caught = true;

    // 1. Switch Doggie to `doggie-catch` + happy squeak-bark!
    this.setDoggiePose('doggie-catch', 650);
    AudioBus.playSfx('doggie');
    Juice.burstStars(this, this.doggieContainer.x, this.doggieContainer.y - 45, 8, [
      0xfbbf24,
      0x38bdf8,
      0xffffff
    ]);

    // Fade out silk parachute canopy and launch the wooden letter tile up into the Top Brass Marquee slot
    this.tweens.add({
      targets: drop.chuteSprite,
      alpha: 0,
      scaleX: 0.3,
      scaleY: 0.3,
      y: -70,
      duration: 180,
      ease: 'Quad.easeOut'
    });

    const slot = this.wordSlots[drop.slotIndex];
    if (!slot) {
      drop.container.destroy();
      return;
    }

    this.tweens.add({
      targets: drop.container,
      x: slot.worldX,
      y: slot.worldY - 14,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 420,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        drop.container.destroy();
        this.lockTileIntoSlot(slot);
      }
    });
  }

  private lockTileIntoSlot(slot: WordSlot): void {
    slot.filled = true;
    slot.inFlight = false;
    slot.glowFrame.setVisible(false);
    slot.tileBg.clearTint();
    slot.tileBg.setAlpha(1);
    slot.letterText.setColor('#271406');
    slot.letterText.setStroke('#fef3c7', 3);
    slot.letterText.setAlpha(1);

    this.audio.playTileSnap();
    Juice.squashAndStretch(this, slot.container, 0.25, 160);
    Juice.burstStars(this, slot.worldX, slot.worldY, 10, [0xfbbf24, 0xfef08a, 0xffffff]);

    this.highlightActiveTargetSlot();

    // Check if all slots in the current round are now filled!
    if (this.wordSlots.every((s) => s.filled)) {
      this.onTargetRoundCompleted();
    } else {
      this.ensureTargetLetterBalloonsOnScreen();
    }
  }

  // ===========================================================================
  // 7. ROUND COMPLETION & AUTOMATIC 5-WORD RAINBOW BALLOON BONUS
  // ===========================================================================

  private onTargetRoundCompleted(): void {
    this.roundTransitioning = true;

    // Both Sparky & Doggie cheer!
    this.animateSparkyCheer();
    this.setDoggiePose('doggie-cheer', 1400);
    Juice.burstStars(this, 640, 95, 22, [0xfbbf24, 0x34d399, 0xf472b6, 0x38bdf8, 0xffffff]);

    const activeKid = ArcadeState.getActiveKid().id;
    const kidPraise = activeKid === 'emma' ? 'praise_emma' : 'praise_wyatt';

    if (this.currentMode === 'phonics') {
      const letter = this.targetWord.toUpperCase();
      if (!this.progress.masteredLetters.includes(letter)) {
        this.progress.masteredLetters.push(letter);
      }
      this.awardStars(2);
      this.phonicsCursor = (this.phonicsCursor + 1) % 26;

      // Play triumphant fanfare chord (WebAudio, never cuts off voice) and wait for
      // `playLetterThenPhonics` to completely finish playing + a calm 600ms breathing pause!
      this.audio.playTriumphantFanfareChord();
      void Promise.all([
        this.lastPopVoicePromise,
        this.audio.waitForActiveVoiceToFinish(3800)
      ]).then(() => {
        if (!this.scene.isActive()) return;
        this.time.delayedCall(600, () => {
          if (this.scene.isActive()) {
            this.startNewTargetRound(true);
          }
        });
      });
      return;
    }

    // Mode 2 ('words'): Record mastered word
    const wordUpper = this.targetWord.toUpperCase();
    const completedWord = this.targetWord;
    if (!this.progress.masteredWords.includes(wordUpper)) {
      this.progress.masteredWords.push(wordUpper);
    }
    this.awardStars(3);
    this.wordsCompletedInSession++;

    const pack = THEME_PACKS[this.currentThemeIndex];
    this.wordCursorByTheme[pack.id] = (this.wordCursorByTheme[pack.id] + 1) % pack.words.length;

    // Trigger the fun 8-second Rainbow Balloon Bonus every 5 completed words!
    const triggerFrenzyAfterWord = this.wordsCompletedInSession > 0 && this.wordsCompletedInSession % 5 === 0;

    const praiseClip = triggerFrenzyAfterWord
      ? undefined
      : Math.random() < 0.6
      ? kidPraise
      : 'praise_complete';

    // Wait for the final letter's phonics/letter audio to finish before playing the word celebration!
    void Promise.all([
      this.lastPopVoicePromise,
      this.audio.waitForActiveVoiceToFinish(3800)
    ]).then(() => {
      if (!this.scene.isActive()) return;
      this.time.delayedCall(220, () => {
        if (!this.scene.isActive()) return;
        this.audio.playWordCelebration(completedWord, praiseClip, () => {
          if (!this.scene.isActive()) return;
          if (triggerFrenzyAfterWord) {
            this.time.delayedCall(350, () => {
              if (this.scene.isActive()) {
                this.startRainbowBalloonFrenzy();
              }
            });
          } else {
            this.time.delayedCall(550, () => {
              if (this.scene.isActive()) {
                this.startNewTargetRound(true);
              }
            });
          }
        });
      });
    });
  }

  private startRainbowBalloonFrenzy(): void {
    this.isFrenzyActive = true;
    this.frenzyTimeRemaining = 8.0;
    this.frenzySpawnTimer = 0;

    this.audio.playPraise('praise_frenzy');
    this.animateSparkyCheer();
    this.setDoggiePose('doggie-cheer', 2500);

    // Show celebratory Frenzy banner below the marquee
    if (this.frenzyBannerContainer) {
      this.frenzyBannerContainer.destroy();
    }
    this.frenzyBannerContainer = this.add.container(640, 134).setDepth(32);
    const bg = this.add.graphics();
    bg.fillStyle(0x4c1d95, 0.92);
    bg.lineStyle(3, 0xfef08a, 1);
    bg.fillRoundedRect(-230, -22, 460, 44, 22);
    bg.strokeRoundedRect(-230, -22, 460, 44, 22);

    const txt = this.add
      .text(0, 0, '🌈 RAINBOW BALLOON BONUS! POP AS MANY AS YOU LIKE! 🌟', {
        fontFamily: '"Fredoka", "Nunito", sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#1e1b4b',
        strokeThickness: 4
      })
      .setOrigin(0.5);

    this.frenzyBannerContainer.add([bg, txt]);
    Juice.squashAndStretch(this, this.frenzyBannerContainer, 0.22, 180);

    // Spawn an immediate wave of rainbow & star balloons!
    for (let i = 0; i < 6; i++) {
      const b = this.spawnBalloon(undefined, 300 + i * 130);
      b.y = Phaser.Math.Between(480, 590);
      b.container.y = b.y;
    }
  }

  private endRainbowBalloonFrenzy(): void {
    this.isFrenzyActive = false;

    if (this.frenzyBannerContainer) {
      this.frenzyBannerContainer.destroy();
      this.frenzyBannerContainer = null;
    }

    this.audio.playTriumphantFanfareChord();
    this.startNewTargetRound(true);
  }

  // ===========================================================================
  // 8. SPECIAL BUTTON ACTIONS (SPEAK HINT, WIND GUST, COLLECTOR'S ALBUM MODAL)
  // ===========================================================================

  private playMarqueeAudioHint(): void {
    if (this.currentMode === 'phonics') {
      this.audio.playLetterThenPhonics(this.targetWord);
    } else {
      this.audio.playWord(this.targetWord);
    }
    this.highlightActiveTargetSlot();
  }

  private triggerSpeakHint(): void {
    this.playMarqueeAudioHint();

    // Surround matching balloon(s) on screen with a glowing golden sparkle ring!
    const needed = this.getCurrentlyNeededLetter();
    this.activeBalloons.forEach((b) => {
      if (!b.popped && !b.retiring && b.letter === needed) {
        b.hintRing.clear();
        b.hintRing.lineStyle(5, 0xfef08a, 0.95);
        b.hintRing.fillStyle(0xfbbf24, 0.18);
        b.hintRing.fillCircle(0, -14, 64);
        b.hintRing.strokeCircle(0, -14, 64);
        b.hintRing.setVisible(true);
        b.hintRing.setAlpha(1);

        Juice.squashAndStretch(this, b.container, 0.20, 160);
        Juice.burstStars(this, b.x, b.y - 14, 6, [0xfef08a, 0xfbbf24, 0xffffff]);

        this.tweens.add({
          targets: b.hintRing,
          alpha: 0,
          duration: 1400,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            if (b.hintRing && b.hintRing.active) {
              b.hintRing.setVisible(false);
            }
          }
        });
      }
    });
  }

  private triggerWindGust(): void {
    this.audio.playWindGust();

    // Spawn a neat temporary spinning pinwheel breeze effect above the BREEZE button
    const tempPinwheel = this.add
      .image(868, 585, 'prop-pinwheel')
      .setDisplaySize(64, 64)
      .setDepth(42)
      .setScale(0.3);

    Juice.burstStars(this, 868, 585, 10, [0xe0f2fe, 0xfef08a, 0xffffff]);

    this.tweens.add({
      targets: tempPinwheel,
      y: 535,
      scaleX: 0.72,
      scaleY: 0.72,
      angle: 540,
      alpha: { from: 1, to: 0 },
      duration: 760,
      ease: 'Cubic.easeOut',
      onComplete: () => tempPinwheel.destroy()
    });

    // Gently blow high balloons back down toward the middle of the sky so they are easy to reach!
    this.activeBalloons.forEach((b) => {
      if (b.popped || b.retiring) return;
      if (b.y < 430) {
        b.vy = Phaser.Math.FloatBetween(115, 175);
      } else {
        b.vy = Phaser.Math.FloatBetween(-25, 45);
      }
      b.vx += Phaser.Math.FloatBetween(-65, 65);
      Juice.wobble(this, b.container, 12);
    });
  }

  private openAlbumModal(): void {
    if (this.albumModal) {
      this.closeAlbumModal();
      return;
    }

    AudioBus.playSfx('chime');
    this.albumActiveThemeIndex = this.currentThemeIndex;

    const modal = this.add.container(640, 360).setDepth(200);
    this.albumModal = modal;

    // Dark backdrop
    const backdrop = this.add
      .rectangle(0, 0, 1280, 720, 0x090503, 0.78)
      .setInteractive();
    backdrop.on('pointerdown', () => this.closeAlbumModal());
    modal.add(backdrop);

    // Heirloom Mahogany & Brass Collector's Ledger Board (`980x580`)
    const board = this.add.graphics();
    board.fillStyle(0x271408, 0.98);
    board.lineStyle(5, 0xd97706, 1);
    board.fillRoundedRect(-490, -290, 980, 580, 24);
    board.strokeRoundedRect(-490, -290, 980, 580, 24);

    board.lineStyle(2, 0xfef08a, 0.55);
    board.strokeRoundedRect(-478, -278, 956, 556, 18);

    // Stop clicks inside board from closing modal
    const boardBlocker = this.add
      .rectangle(0, 0, 980, 580, 0x000000, 0.001)
      .setInteractive();
    modal.add([board, boardBlocker]);

    // Header
    const header = this.add
      .text(0, -246, `📖 SKY-SHIP WORD & PHONICS ALBUM   •   ⭐ ${this.progress.stars} STARS`, {
        fontFamily: '"Fredoka", "Nunito", sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#1c0f06',
        strokeThickness: 5
      })
      .setOrigin(0.5);
    modal.add(header);

    // Close Button (`X`)
    const closeBtn = this.add.container(442, -244);
    const closeBg = this.add.graphics();
    closeBg.fillStyle(0x991b1b, 1);
    closeBg.lineStyle(3, 0xfef08a, 1);
    closeBg.fillCircle(0, 0, 26);
    closeBg.strokeCircle(0, 0, 26);
    const closeTxt = this.add
      .text(0, -1, '✕', {
        fontFamily: '"Fredoka", "Nunito", sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffffff'
      })
      .setOrigin(0.5);
    closeBtn.add([closeBg, closeTxt]);
    Juice.makeTactileButton(this, closeBtn, 64, 64, () => this.closeAlbumModal(), 'pop');
    modal.add(closeBtn);

    // Section 1: A-Z Phonics Mastery Badges (`2 rows x 13 letters`)
    const azTitle = this.add
      .text(-445, -198, `🔤 A–Z Phonics (${this.progress.masteredLetters.length}/26 Mastered — Tap any letter to hear!)`, {
        fontFamily: '"Fredoka", "Nunito", sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#fde68a'
      })
      .setOrigin(0, 0.5);
    modal.add(azTitle);

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < 26; i++) {
      const ch = alphabet[i];
      const row = Math.floor(i / 13);
      const col = i % 13;
      const lx = -420 + col * 70;
      const ly = -156 + row * 48;
      const mastered = this.progress.masteredLetters.includes(ch);

      const badge = this.add.container(lx, ly);
      const bGfx = this.add.graphics();
      bGfx.fillStyle(mastered ? 0xd97706 : 0x3b2313, 1);
      bGfx.lineStyle(2, mastered ? 0xfef08a : 0x78350f, 1);
      bGfx.fillRoundedRect(-28, -19, 56, 38, 8);
      bGfx.strokeRoundedRect(-28, -19, 56, 38, 8);

      const bTxt = this.add
        .text(0, 0, mastered ? `${ch}★` : ch, {
          fontFamily: '"Fredoka", "Nunito", sans-serif',
          fontSize: '18px',
          fontStyle: 'bold',
          color: mastered ? '#fffbeb' : '#a8a29e'
        })
        .setOrigin(0.5);

      badge.add([bGfx, bTxt]);
      badge.setSize(60, 42);
      badge.setInteractive({ useHandCursor: true });
      badge.on('pointerdown', () => {
        Juice.squashAndStretch(this, badge, 0.2, 130);
        this.audio.playLetterThenPhonics(ch);
      });
      modal.add(badge);
    }

    // Section 2: Theme Pack Tabs + Word Grid
    const wordsContainer = this.add.container(0, 0);
    modal.add(wordsContainer);

    const renderThemeWords = (themeIdx: number) => {
      wordsContainer.removeAll(true);
      const pack = THEME_PACKS[themeIdx];

      // Theme selector tabs
      THEME_PACKS.forEach((tp, idx) => {
        const tx = -380 + idx * 152;
        const ty = -46;
        const isSel = idx === themeIdx;
        const tab = this.add.container(tx, ty);
        const tGfx = this.add.graphics();
        tGfx.fillStyle(isSel ? 0xb45309 : 0x3b2313, 1);
        tGfx.lineStyle(2.5, isSel ? 0xfef08a : 0x78350f, 1);
        tGfx.fillRoundedRect(-68, -20, 136, 40, 10);
        tGfx.strokeRoundedRect(-68, -20, 136, 40, 10);

        const tTxt = this.add
          .text(0, 0, `${tp.icon} ${tp.shortTitle}`, {
            fontFamily: '"Fredoka", "Nunito", sans-serif',
            fontSize: '16px',
            fontStyle: 'bold',
            color: isSel ? '#fef08a' : '#d6d3d1'
          })
          .setOrigin(0.5);

        tab.add([tGfx, tTxt]);
        tab.setSize(136, 44);
        tab.setInteractive({ useHandCursor: true });
        tab.on('pointerdown', () => {
          AudioBus.playSfx('pop');
          this.albumActiveThemeIndex = idx;
          renderThemeWords(idx);
        });
        wordsContainer.add(tab);
      });

      // Word Cards Grid (up to 24 words -> 6 cols x 4 rows)
      const cols = 6;
      pack.words.forEach((w, wIdx) => {
        const r = Math.floor(wIdx / cols);
        const c = wIdx % cols;
        const wx = -385 + c * 154;
        const wy = 24 + r * 66;
        const mastered = this.progress.masteredWords.includes(w);
        const emoji = WORD_EMOJI_MAP[w] || pack.icon;

        const card = this.add.container(wx, wy);
        const cGfx = this.add.graphics();
        cGfx.fillStyle(mastered ? 0x065f46 : 0x3b2313, 0.95);
        cGfx.lineStyle(2, mastered ? 0x34d399 : 0x78350f, 1);
        cGfx.fillRoundedRect(-70, -26, 140, 52, 10);
        cGfx.strokeRoundedRect(-70, -26, 140, 52, 10);

        const cTxt = this.add
          .text(0, 0, `${emoji} ${w}${mastered ? ' ⭐' : ''}`, {
            fontFamily: '"Fredoka", "Nunito", sans-serif',
            fontSize: '16px',
            fontStyle: 'bold',
            color: mastered ? '#ecfdf5' : '#d6d3d1'
          })
          .setOrigin(0.5);

        card.add([cGfx, cTxt]);
        card.setSize(142, 54);
        card.setInteractive({ useHandCursor: true });
        card.on('pointerdown', () => {
          Juice.squashAndStretch(this, card, 0.18, 130);
          this.audio.playWord(w);
        });
        wordsContainer.add(card);
      });
    };

    renderThemeWords(this.albumActiveThemeIndex);

    modal.setScale(0.85);
    this.tweens.add({
      targets: modal,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut'
    });
  }

  private closeAlbumModal(): void {
    if (!this.albumModal) return;
    AudioBus.playSfx('pop');
    this.albumModal.destroy();
    this.albumModal = null;
  }

  // ===========================================================================
  // 9. MAIN 60FPS UPDATE LOOP (BALLOON BUOYANCY, COLLISIONS, PARACHUTES & DOGGIE)
  // ===========================================================================

  public update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);

    if (this.albumModal) return;

    // 1. Rainbow Balloon Bonus timer & rapid spawning
    if (this.isFrenzyActive) {
      this.frenzyTimeRemaining -= dt;
      this.frenzySpawnTimer += dt;
      if (this.frenzySpawnTimer >= 0.48 && this.getLiveBalloons().length < MAX_ACTIVE_BALLOONS) {
        this.frenzySpawnTimer = 0;
        this.spawnBalloon();
      }
      if (this.frenzyTimeRemaining <= 0) {
        this.endRainbowBalloonFrenzy();
        return;
      }
    } else {
      // Normal background spawning: keep ~7-8 balloons on screen with 1-2 needed letters and varied decoys
      this.spawnTimer += dt;
      const targetCount = 7;
      if (this.spawnTimer >= 1.15 && this.getLiveBalloons().length < targetCount) {
        this.spawnTimer = 0;
        this.spawnBalloon();
      }
    }

    // 2. Update floating balloons (buoyancy, sinusoidal breeze sway, wall bounds, top wrap/respawn)
    for (let i = this.activeBalloons.length - 1; i >= 0; i--) {
      const b = this.activeBalloons[i];
      if (b.popped || b.retiring) continue;

      b.swayPhase += b.swayFreq * dt;
      const breezeVx = Math.cos(b.swayPhase) * b.swayAmp;

      // Smoothly relax vertical speed back toward buoyant upward drift `baseVy`
      b.vy = Phaser.Math.Linear(b.vy, b.baseVy, dt * 2.4);
      b.vx *= Math.pow(0.92, dt * 60);

      b.x += (b.vx + breezeVx) * dt;
      b.y += b.vy * dt;

      // Soft wall bounds at x: 250 and x: 1040
      if (b.x < 250) {
        b.x = 250;
        b.vx = Math.abs(b.vx) * 0.65 + 18;
      } else if (b.x > 1040) {
        b.x = 1040;
        b.vx = -Math.abs(b.vx) * 0.65 - 18;
      }

      // Gentle tilt proportional to horizontal breeze
      b.container.setPosition(b.x, b.y);
      b.container.angle = Phaser.Math.Clamp((b.vx + breezeVx) * 0.14, -10, 10);

      // When a balloon drifts above the upper sky frame (`y < 145`), recycle it cleanly
      if (b.y < 145) {
        b.container.destroy();
        this.activeBalloons.splice(i, 1);
        if (!this.isFrenzyActive) {
          this.ensureTargetLetterBalloonsOnScreen();
        }
      }
    }

    // 3. Soft elastic circle-to-circle collisions between floating balloons
    const n = this.activeBalloons.length;
    for (let i = 0; i < n; i++) {
      const b1 = this.activeBalloons[i];
      if (b1.popped || b1.retiring) continue;
      for (let j = i + 1; j < n; j++) {
        const b2 = this.activeBalloons[j];
        if (b2.popped || b2.retiring) continue;

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const minDist = b1.radius + b2.radius;
        const distSq = dx * dx + dy * dy;

        if (distSq > 0.001 && distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = (minDist - dist) * 0.5;

          b1.x -= nx * overlap;
          b1.y -= ny * overlap;
          b2.x += nx * overlap;
          b2.y += ny * overlap;

          const rvx = b2.vx - b1.vx;
          const rvy = b2.vy - b1.vy;
          const velAlongNormal = rvx * nx + rvy * ny;
          if (velAlongNormal < 0) {
            const impulse = -0.75 * velAlongNormal;
            b1.vx -= impulse * nx * 0.5;
            b1.vy -= impulse * ny * 0.5;
            b2.vx += impulse * nx * 0.5;
            b2.vy += impulse * ny * 0.5;
          }
        }
      }
    }

    // 4. Update parachuting wooden letter tiles & Sky-Basket Doggie auto-tracking
    let lowestDrop: ParachuteDrop | null = null;
    for (let i = this.parachuteDrops.length - 1; i >= 0; i--) {
      const drop = this.parachuteDrops[i];
      if (drop.caught) {
        this.parachuteDrops.splice(i, 1);
        continue;
      }

      drop.swayPhase += 3.2 * dt;
      drop.x = Phaser.Math.Clamp(drop.x + Math.sin(drop.swayPhase) * 24 * dt, 290, 1020);
      drop.y += drop.vy * dt;
      drop.container.setPosition(drop.x, drop.y);
      drop.container.angle = Math.sin(drop.swayPhase) * 6;

      if (!lowestDrop || drop.y > lowestDrop.y) {
        lowestDrop = drop;
      }

      // Check if the parachuting tile has reached Doggie's sky-basket height (`y >= 475`)
      const distToDoggieX = Math.abs(drop.x - this.doggieContainer.x);
      if ((drop.y >= 465 && distToDoggieX < 95) || drop.y >= 515) {
        this.catchParachuteTileWithDoggie(drop);
        this.parachuteDrops.splice(i, 1);
      }
    }

    // Smoothly roll Sky-Basket Doggie underneath the lowest falling parachute tile if not being dragged
    if (!this.doggieDragging && lowestDrop) {
      this.doggieTargetX = Phaser.Math.Clamp(lowestDrop.x, 290, 1020);
      this.doggieContainer.x = Phaser.Math.Linear(
        this.doggieContainer.x,
        this.doggieTargetX,
        Math.min(1, dt * 8.5)
      );
    }
  }
}
