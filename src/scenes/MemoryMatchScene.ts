/**
 * MemoryMatchScene.ts
 * -------------------
 * Mentor Note: "Animal Match Safari" — Heirloom Mahogany & Emerald Felt Memory Match Game
 * for Wyatt (age 4) and Emma (age 3).
 *
 * Key Architectural Highlights:
 * 1. Calm, Spacious Emerald-Green Baize Felt Tabletop (`x: 90..1190, y: 35..565`) with
 *    oversized cards (`x: 130..1150, y: 55..550`) and zero HUD/text clutter.
 * 2. Round-Start Face-Up Memorization Preview:
 *    - Every round deals all cards FACE-UP with a warm golden shimmer countdown bar along the
 *      top edge of the felt (`3.5s` on `2x3`, `4.5s` on `3x4` / `4x4`), then flips all cards
 *      face-down in a smooth staggered wave with a crisp wooden card-flip sound.
 * 3. Strict Audio Discretion:
 *    - Card flips play ONLY the crisp tactile `card_flip` wooden click.
 *    - Voice narration speaks ONLY when a pair is matched or when tapping unlocked stickers in
 *      the Sanctuary Album.
 * 4. Five Oversized Pure-Picture Bottom Buttons (`96x96px` at `y: 640`, zero text labels):
 *    - Hub (Arcade House), Grid Size (dynamic mini-grid of 6, 12, or 16 golden cards),
 *      Match Mode (dynamic Twins / Mama & Baby / Letters illustration), Theme/World (dynamic
 *      Safari Lion / Ocean Turtle / Dino T-Rex / Treasure Crown sprite), and Sanctuary Album.
 * 5. Corner Companions:
 *    - Far Bottom-Left (`x: 65, y: 635`): Sparky (Spyglass X-Ray Peek helper)
 *    - Far Bottom-Right (`x: 1215, y: 635`): Doggie (Firefly Lantern Hint helper)
 */

import Phaser from 'phaser';
import { ArcadeState } from '../core/ArcadeState';
import { AudioBus } from '../core/AudioBus';
import { Juice } from '../core/Juice';
import { MatchAudioEngine } from '../audio/MatchAudioEngine';

export type MatchGridSizeId = '2x3' | '3x4' | '4x4';
export type MatchModeId = 'twins' | 'mama-baby' | 'letters';
export type MatchThemeId = 'safari' | 'ocean' | 'dino' | 'treasures';

export interface SanctuaryItemDef {
  id: string;
  spriteKey: string;
  wordKey: string;
  label: string;
  letter: string;
  theme: MatchThemeId;
  babySpriteKey?: string;
  babyWordKey?: string;
  babyLabel?: string;
  badgeColor?: number;
}

export const SANCTUARY_CATALOG: SanctuaryItemDef[] = [
  // 1. SAFARI & WOODLAND (8 Adult + Baby Pairs = 16 sprites)
  {
    id: 'safari-lion',
    spriteKey: 'safari-lion',
    wordKey: 'lion',
    label: 'LION',
    letter: 'L',
    theme: 'safari',
    babySpriteKey: 'safari-lion-cub',
    babyWordKey: 'cub',
    babyLabel: 'LION CUB',
    badgeColor: 0xf59e0b
  },
  {
    id: 'safari-elephant',
    spriteKey: 'safari-elephant',
    wordKey: 'elephant',
    label: 'ELEPHANT',
    letter: 'E',
    theme: 'safari',
    babySpriteKey: 'safari-elephant-calf',
    babyWordKey: 'calf',
    babyLabel: 'CALF',
    badgeColor: 0x38bdf8
  },
  {
    id: 'safari-bear',
    spriteKey: 'safari-bear',
    wordKey: 'bear',
    label: 'BEAR',
    letter: 'B',
    theme: 'safari',
    babySpriteKey: 'safari-bear-cub',
    babyWordKey: 'cub',
    babyLabel: 'BEAR CUB',
    badgeColor: 0xd97706
  },
  {
    id: 'safari-owl',
    spriteKey: 'safari-owl',
    wordKey: 'owl',
    label: 'BARN OWL',
    letter: 'O',
    theme: 'safari',
    babySpriteKey: 'safari-owlet',
    babyWordKey: 'owlet',
    babyLabel: 'OWLET',
    badgeColor: 0xa855f7
  },
  {
    id: 'safari-frog',
    spriteKey: 'safari-frog',
    wordKey: 'frog',
    label: 'FROG',
    letter: 'F',
    theme: 'safari',
    babySpriteKey: 'safari-tadpole',
    babyWordKey: 'tadpole',
    babyLabel: 'TADPOLE',
    badgeColor: 0x22c55e
  },
  {
    id: 'safari-fox',
    spriteKey: 'safari-fox',
    wordKey: 'fox',
    label: 'RED FOX',
    letter: 'F',
    theme: 'safari',
    babySpriteKey: 'safari-fox-kit',
    babyWordKey: 'kit',
    babyLabel: 'FOX KIT',
    badgeColor: 0xef4444
  },
  {
    id: 'safari-monkey',
    spriteKey: 'safari-monkey',
    wordKey: 'monkey',
    label: 'MONKEY',
    letter: 'M',
    theme: 'safari',
    babySpriteKey: 'safari-monkey-baby',
    babyWordKey: 'monkey',
    babyLabel: 'BABY MONKEY',
    badgeColor: 0xfacc15
  },
  {
    id: 'safari-duck',
    spriteKey: 'safari-duck',
    wordKey: 'duck',
    label: 'MAMA DUCK',
    letter: 'D',
    theme: 'safari',
    babySpriteKey: 'safari-duckling',
    babyWordKey: 'duckling',
    babyLabel: 'DUCKLING',
    badgeColor: 0x14b8a6
  },

  // 2. OCEAN REEF (8 creatures)
  {
    id: 'ocean-whale',
    spriteKey: 'ocean-whale',
    wordKey: 'whale',
    label: 'WHALE',
    letter: 'W',
    theme: 'ocean'
  },
  {
    id: 'ocean-octopus',
    spriteKey: 'ocean-octopus',
    wordKey: 'octopus',
    label: 'OCTOPUS',
    letter: 'O',
    theme: 'ocean'
  },
  {
    id: 'ocean-turtle',
    spriteKey: 'ocean-turtle',
    wordKey: 'turtle',
    label: 'TURTLE',
    letter: 'T',
    theme: 'ocean'
  },
  {
    id: 'ocean-clownfish',
    spriteKey: 'ocean-clownfish',
    wordKey: 'clownfish',
    label: 'CLOWNFISH',
    letter: 'C',
    theme: 'ocean'
  },
  {
    id: 'ocean-crab',
    spriteKey: 'ocean-crab',
    wordKey: 'crab',
    label: 'CRAB',
    letter: 'C',
    theme: 'ocean'
  },
  {
    id: 'ocean-dolphin',
    spriteKey: 'ocean-dolphin',
    wordKey: 'dolphin',
    label: 'DOLPHIN',
    letter: 'D',
    theme: 'ocean'
  },
  {
    id: 'ocean-seahorse',
    spriteKey: 'ocean-seahorse',
    wordKey: 'seahorse',
    label: 'SEAHORSE',
    letter: 'S',
    theme: 'ocean'
  },
  {
    id: 'ocean-starfish',
    spriteKey: 'ocean-starfish',
    wordKey: 'starfish',
    label: 'STARFISH',
    letter: 'S',
    theme: 'ocean'
  },

  // 3. DINOSAUR VALLEY (8 dinosaurs)
  {
    id: 'dino-trex',
    spriteKey: 'dino-trex',
    wordKey: 'trex',
    label: 'T-REX',
    letter: 'T',
    theme: 'dino'
  },
  {
    id: 'dino-triceratops',
    spriteKey: 'dino-triceratops',
    wordKey: 'triceratops',
    label: 'TRICERATOPS',
    letter: 'T',
    theme: 'dino'
  },
  {
    id: 'dino-stegosaurus',
    spriteKey: 'dino-stegosaurus',
    wordKey: 'stegosaurus',
    label: 'STEGOSAURUS',
    letter: 'S',
    theme: 'dino'
  },
  {
    id: 'dino-brachiosaurus',
    spriteKey: 'dino-brachiosaurus',
    wordKey: 'brachiosaurus',
    label: 'BRACHIOSAURUS',
    letter: 'B',
    theme: 'dino'
  },
  {
    id: 'dino-pterodactyl',
    spriteKey: 'dino-pterodactyl',
    wordKey: 'pterodactyl',
    label: 'PTERODACTYL',
    letter: 'P',
    theme: 'dino'
  },
  {
    id: 'dino-ankylosaurus',
    spriteKey: 'dino-ankylosaurus',
    wordKey: 'ankylosaurus',
    label: 'ANKYLOSAURUS',
    letter: 'A',
    theme: 'dino'
  },
  {
    id: 'dino-baby',
    spriteKey: 'dino-baby',
    wordKey: 'dinosaur',
    label: 'BABY DINO',
    letter: 'D',
    theme: 'dino'
  },
  {
    id: 'dino-egg',
    spriteKey: 'dino-egg',
    wordKey: 'egg',
    label: 'DINO EGG',
    letter: 'E',
    theme: 'dino'
  },

  // 4. SKY-SHIP & TREASURES (16 items)
  {
    id: 'veh-airship',
    spriteKey: 'veh-airship',
    wordKey: 'airship',
    label: 'AIRSHIP',
    letter: 'A',
    theme: 'treasures'
  },
  {
    id: 'veh-train',
    spriteKey: 'veh-train',
    wordKey: 'train',
    label: 'TRAIN',
    letter: 'T',
    theme: 'treasures'
  },
  {
    id: 'veh-firetruck',
    spriteKey: 'veh-firetruck',
    wordKey: 'firetruck',
    label: 'FIRE TRUCK',
    letter: 'F',
    theme: 'treasures'
  },
  {
    id: 'veh-submarine',
    spriteKey: 'veh-submarine',
    wordKey: 'submarine',
    label: 'SUBMARINE',
    letter: 'S',
    theme: 'treasures'
  },
  {
    id: 'veh-biplane',
    spriteKey: 'veh-biplane',
    wordKey: 'biplane',
    label: 'BIPLANE',
    letter: 'B',
    theme: 'treasures'
  },
  {
    id: 'veh-rocket',
    spriteKey: 'veh-rocket',
    wordKey: 'rocket',
    label: 'ROCKET',
    letter: 'R',
    theme: 'treasures'
  },
  {
    id: 'veh-tractor',
    spriteKey: 'veh-tractor',
    wordKey: 'tractor',
    label: 'TRACTOR',
    letter: 'T',
    theme: 'treasures'
  },
  {
    id: 'veh-sailboat',
    spriteKey: 'veh-sailboat',
    wordKey: 'boat',
    label: 'SAILBOAT',
    letter: 'S',
    theme: 'treasures'
  },
  {
    id: 'tr-dragon',
    spriteKey: 'tr-dragon',
    wordKey: 'dragon',
    label: 'DRAGON',
    letter: 'D',
    theme: 'treasures'
  },
  {
    id: 'tr-unicorn',
    spriteKey: 'tr-unicorn',
    wordKey: 'unicorn',
    label: 'UNICORN',
    letter: 'U',
    theme: 'treasures'
  },
  {
    id: 'tr-crown',
    spriteKey: 'tr-crown',
    wordKey: 'crown',
    label: 'CROWN',
    letter: 'C',
    theme: 'treasures'
  },
  {
    id: 'tr-crystal',
    spriteKey: 'tr-crystal',
    wordKey: 'crystal',
    label: 'CRYSTAL',
    letter: 'C',
    theme: 'treasures'
  },
  {
    id: 'tr-map',
    spriteKey: 'tr-map',
    wordKey: 'map',
    label: 'MAP',
    letter: 'M',
    theme: 'treasures'
  },
  {
    id: 'tr-cupcake',
    spriteKey: 'tr-cupcake',
    wordKey: 'cupcake',
    label: 'CUPCAKE',
    letter: 'C',
    theme: 'treasures'
  },
  {
    id: 'tr-strawberry',
    spriteKey: 'tr-strawberry',
    wordKey: 'strawberry',
    label: 'STRAWBERRY',
    letter: 'S',
    theme: 'treasures'
  },
  {
    id: 'tr-acorn',
    spriteKey: 'tr-acorn',
    wordKey: 'acorn',
    label: 'ACORN',
    letter: 'A',
    theme: 'treasures'
  }
];

interface MatchSaveData {
  unlockedIds: string[];
  gridSize: MatchGridSizeId;
  mode: MatchModeId;
  theme: MatchThemeId;
}

interface CardInstance {
  uid: number;
  pairId: string;
  cardKind: 'picture' | 'baby' | 'letter';
  spriteKey: string;
  wordKey: string;
  partnerWordKey?: string;
  letter: string;
  badgeColor: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isFlipped: boolean;
  isMatched: boolean;
  isAnimating: boolean;
  container: Phaser.GameObjects.Container;
  backImage: Phaser.GameObjects.Image;
  frontContainer: Phaser.GameObjects.Container;
  xraySprite: Phaser.GameObjects.Image;
  highlightRing: Phaser.GameObjects.Graphics;
}

const STORAGE_KEY = 'wyatt_emma_match_v1';

export class MemoryMatchScene extends Phaser.Scene {
  private audio!: MatchAudioEngine;
  private saveData!: MatchSaveData;

  private gridSize: MatchGridSizeId = '2x3';
  private matchMode: MatchModeId = 'twins';
  private activeTheme: MatchThemeId = 'safari';

  private cards: CardInstance[] = [];
  private flippedCards: CardInstance[] = [];
  private isBoardLocked = false;
  private streakCount = 0;
  private comboCount = 0;

  // Stage UI Containers & Sprites
  private boardContainer!: Phaser.GameObjects.Container;
  private fxContainer!: Phaser.GameObjects.Container;
  private sparkySprite!: Phaser.GameObjects.Image;
  private doggieSprite!: Phaser.GameObjects.Image;

  // Dynamic Icon Containers for the 5 Pure-Picture Bottom Buttons
  private gridBtnIconContainer?: Phaser.GameObjects.Container;
  private modeBtnIconContainer?: Phaser.GameObjects.Container;
  private themeBtnIconContainer?: Phaser.GameObjects.Container;

  // Round-Start Face-Up Memorization Preview Timers & Shimmer Bar
  private previewTimers: Phaser.Time.TimerEvent[] = [];
  private previewBarTween?: Phaser.Tweens.Tween;
  private previewBarContainer?: Phaser.GameObjects.Container;

  // Sanctuary Album Modal
  private sanctuaryModal?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'MemoryMatchScene' });
  }

  public create(): void {
    this.audio = new MatchAudioEngine();
    this.loadSaveData();

    const allWords = SANCTUARY_CATALOG.flatMap((it) =>
      it.babyWordKey ? [it.wordKey, it.babyWordKey] : [it.wordKey]
    );
    this.audio.preloadDeckAudio(allWords);

    this.ensureGlowTexture();
    this.buildStageBackground();
    this.buildCompanions();

    this.boardContainer = this.add.container(0, 0).setDepth(20);
    this.fxContainer = this.add.container(0, 0).setDepth(45);

    this.buildBottomControlBar();
    this.dealNewBoard();

    this.cameras.main.fadeIn(260, 12, 8, 6);
  }

  private loadSaveData(): void {
    const activeKid = ArcadeState.getActiveKid();
    const defaultGrid: MatchGridSizeId = activeKid.id === 'emma' ? '2x3' : '3x4';
    const defaultUnlocked = [
      'safari-lion',
      'safari-elephant',
      'safari-bear',
      'ocean-whale',
      'dino-trex',
      'veh-airship'
    ];

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<MatchSaveData>;
        this.saveData = {
          unlockedIds:
            Array.isArray(parsed.unlockedIds) && parsed.unlockedIds.length > 0
              ? parsed.unlockedIds
              : defaultUnlocked,
          gridSize: parsed.gridSize ?? defaultGrid,
          mode: parsed.mode ?? 'twins',
          theme: parsed.theme ?? 'safari'
        };
      } else {
        this.saveData = {
          unlockedIds: defaultUnlocked,
          gridSize: defaultGrid,
          mode: 'twins',
          theme: 'safari'
        };
      }
    } catch {
      this.saveData = {
        unlockedIds: defaultUnlocked,
        gridSize: defaultGrid,
        mode: 'twins',
        theme: 'safari'
      };
    }

    this.gridSize = this.saveData.gridSize;
    this.matchMode = this.saveData.mode;
    this.activeTheme = this.saveData.theme;
  }

  private persistSaveData(): void {
    this.saveData.gridSize = this.gridSize;
    this.saveData.mode = this.matchMode;
    this.saveData.theme = this.activeTheme;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.saveData));
    } catch {
      // Ignore storage quota errors
    }
  }

  private ensureGlowTexture(): void {
    if (this.textures.exists('match-radial-glow')) return;
    const canvasTex = this.textures.createCanvas('match-radial-glow', 256, 256);
    if (!canvasTex) return;
    const ctx = canvasTex.getContext();
    const grad = ctx.createRadialGradient(128, 128, 6, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255, 240, 165, 1.0)');
    grad.addColorStop(0.45, 'rgba(251, 191, 36, 0.55)');
    grad.addColorStop(1, 'rgba(251, 191, 36, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    canvasTex.refresh();
  }

  private buildStageBackground(): void {
    if (this.textures.exists('match-stage-bg')) {
      this.add
        .image(640, 360, 'match-stage-bg')
        .setOrigin(0.5, 0.5)
        .setDisplaySize(1280, 720)
        .setDepth(1);
    } else {
      const g = this.add.graphics().setDepth(1);
      g.fillStyle(0x1e110a, 1);
      g.fillRect(0, 0, 1280, 720);
      g.fillStyle(0x064e3b, 1);
      g.fillRoundedRect(90, 35, 1100, 530, 22);
    }
  }

  /**
   * Far Bottom-Left (`x: 65, y: 635`): Sparky with Brass Spyglass
   * Far Bottom-Right (`x: 1215, y: 635`): Doggie with Firefly Lantern
   * Scaled cleanly so they never overlap the expanded card arena or the 5 bottom buttons.
   */
  private buildCompanions(): void {
    // 1. Sparky (`x: 65, y: 635`)
    const sparkyShadow = this.add.graphics().setDepth(14);
    sparkyShadow.fillStyle(0x080301, 0.55);
    sparkyShadow.fillEllipse(65, 692, 92, 18);

    const sparkyGlow = this.add
      .image(65, 632, 'match-radial-glow')
      .setDisplaySize(145, 145)
      .setTint(0x34d399)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.24)
      .setDepth(14);

    this.sparkySprite = this.add
      .image(65, 635, 'char-sparky-spyglass')
      .setDisplaySize(102, 106)
      .setDepth(15);

    this.tweens.add({
      targets: [this.sparkySprite, sparkyGlow],
      y: '-=4',
      duration: 1900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const sparkyZone = this.add
      .zone(65, 635, 112, 116)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(36);

    sparkyZone.on('pointerdown', () => {
      if (this.sanctuaryModal || this.isBoardLocked) return;
      this.triggerSparkySpyglassPeek();
    });

    // 2. Doggie (`x: 1215, y: 635`)
    const doggieShadow = this.add.graphics().setDepth(14);
    doggieShadow.fillStyle(0x080301, 0.55);
    doggieShadow.fillEllipse(1215, 692, 92, 18);

    const doggieGlow = this.add
      .image(1215, 632, 'match-radial-glow')
      .setDisplaySize(145, 145)
      .setTint(0xfde047)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.28)
      .setDepth(14);

    this.doggieSprite = this.add
      .image(1215, 635, 'char-doggie-lantern')
      .setDisplaySize(96, 108)
      .setDepth(15);

    this.tweens.add({
      targets: [this.doggieSprite, doggieGlow],
      y: '-=4',
      duration: 1650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const doggieZone = this.add
      .zone(1215, 635, 112, 116)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(36);

    doggieZone.on('pointerdown', () => {
      if (this.sanctuaryModal || this.isBoardLocked) return;
      this.triggerDoggieFireflyHint();
    });
  }

  // ---------------------------------------------------------------------------
  // BOARD DEALING, EXPANDED FELT BOUNDS (`x: 130..1150, y: 55..550`) & PREVIEW
  // ---------------------------------------------------------------------------

  private getGridDimensions(): {
    rows: number;
    cols: number;
    cardW: number;
    cardH: number;
    stepX: number;
    stepY: number;
  } {
    // Maximized across the spacious emerald-green felt arena (`x: 130..1150, y: 55..550`)
    if (this.gridSize === '2x3') {
      return { rows: 2, cols: 3, cardW: 218, cardH: 220, stepX: 280, stepY: 238 };
    }
    if (this.gridSize === '3x4') {
      return { rows: 3, cols: 4, cardW: 174, cardH: 148, stepX: 226, stepY: 162 };
    }
    return { rows: 4, cols: 4, cardW: 166, cardH: 112, stepX: 220, stepY: 122 };
  }

  private selectPairsForBoard(numPairs: number): SanctuaryItemDef[] {
    let pool: SanctuaryItemDef[];
    if (this.matchMode === 'mama-baby') {
      pool = SANCTUARY_CATALOG.filter((it) => it.theme === 'safari' && Boolean(it.babySpriteKey));
    } else {
      pool = SANCTUARY_CATALOG.filter((it) => it.theme === this.activeTheme);
    }

    const shuffled = Phaser.Utils.Array.Shuffle([...pool]);

    if (this.matchMode === 'letters') {
      const uniqueByLetter: SanctuaryItemDef[] = [];
      const usedLetters = new Set<string>();
      for (const item of shuffled) {
        if (!usedLetters.has(item.letter)) {
          usedLetters.add(item.letter);
          uniqueByLetter.push(item);
          if (uniqueByLetter.length === numPairs) break;
        }
      }
      if (uniqueByLetter.length < numPairs) {
        const fallbackPool = Phaser.Utils.Array.Shuffle([...SANCTUARY_CATALOG]);
        for (const item of fallbackPool) {
          if (!usedLetters.has(item.letter)) {
            usedLetters.add(item.letter);
            uniqueByLetter.push(item);
            if (uniqueByLetter.length === numPairs) break;
          }
        }
      }
      return uniqueByLetter.slice(0, numPairs);
    }

    return shuffled.slice(0, numPairs);
  }

  private clearPreviewTimersAndBar(): void {
    for (const timer of this.previewTimers) {
      timer.remove(false);
    }
    this.previewTimers = [];

    if (this.previewBarTween) {
      this.previewBarTween.stop();
      this.previewBarTween = undefined;
    }

    if (this.previewBarContainer) {
      this.previewBarContainer.destroy(true);
      this.previewBarContainer = undefined;
    }
  }

  private dealNewBoard(): void {
    this.clearPreviewTimersAndBar();

    // Lock board during the round-start face-up memorization preview
    this.isBoardLocked = true;
    this.flippedCards = [];
    this.cards = [];
    this.comboCount = 0;
    this.streakCount = 0;
    this.boardContainer.removeAll(true);
    this.fxContainer.removeAll(true);

    const { rows, cols, cardW, cardH, stepX, stepY } = this.getGridDimensions();
    const numPairs = (rows * cols) / 2;
    const chosenPairs = this.selectPairsForBoard(numPairs);

    const paletteColors = [
      0xf59e0b, 0x38bdf8, 0x22c55e, 0xa855f7, 0xef4444, 0xfacc15, 0x14b8a6, 0xf472b6
    ];

    interface RawCardSpec {
      pairId: string;
      cardKind: 'picture' | 'baby' | 'letter';
      spriteKey: string;
      wordKey: string;
      partnerWordKey?: string;
      letter: string;
      badgeColor: number;
    }

    const deckSpecs: RawCardSpec[] = [];
    chosenPairs.forEach((pair, idx) => {
      const badgeColor = pair.badgeColor ?? paletteColors[idx % paletteColors.length];
      if (this.matchMode === 'mama-baby' && pair.babySpriteKey && pair.babyWordKey) {
        deckSpecs.push({
          pairId: pair.id,
          cardKind: 'picture',
          spriteKey: pair.spriteKey,
          wordKey: pair.wordKey,
          partnerWordKey: pair.babyWordKey,
          letter: pair.letter,
          badgeColor
        });
        deckSpecs.push({
          pairId: pair.id,
          cardKind: 'baby',
          spriteKey: pair.babySpriteKey,
          wordKey: pair.babyWordKey,
          partnerWordKey: pair.wordKey,
          letter: pair.letter,
          badgeColor
        });
      } else if (this.matchMode === 'letters') {
        deckSpecs.push({
          pairId: pair.id,
          cardKind: 'letter',
          spriteKey: 'prop-tile',
          wordKey: pair.wordKey,
          letter: pair.letter,
          badgeColor
        });
        deckSpecs.push({
          pairId: pair.id,
          cardKind: 'picture',
          spriteKey: pair.spriteKey,
          wordKey: pair.wordKey,
          letter: pair.letter,
          badgeColor
        });
      } else {
        deckSpecs.push({
          pairId: pair.id,
          cardKind: 'picture',
          spriteKey: pair.spriteKey,
          wordKey: pair.wordKey,
          letter: pair.letter,
          badgeColor
        });
        deckSpecs.push({
          pairId: pair.id,
          cardKind: 'picture',
          spriteKey: pair.spriteKey,
          wordKey: pair.wordKey,
          letter: pair.letter,
          badgeColor
        });
      }
    });

    const shuffledDeck = Phaser.Utils.Array.Shuffle(deckSpecs);
    // Centered inside the expanded green felt bounds (`x: 130..1150, y: 55..550`)
    const centerX = 640;
    const centerY = 304;
    const startX = centerX - ((cols - 1) * stepX) / 2;
    const startY = centerY - ((rows - 1) * stepY) / 2;

    shuffledDeck.forEach((spec, idx) => {
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      const targetX = Math.round(startX + c * stepX);
      const targetY = Math.round(startY + r * stepY);

      // Deal all cards FACE-UP initially for the round-start memorization preview
      const card = this.createCardInstance(idx, spec, targetX, targetY, cardW, cardH, true);
      this.cards.push(card);

      card.container.setScale(0.01);
      this.tweens.add({
        targets: card.container,
        scaleX: 1,
        scaleY: 1,
        duration: 230,
        delay: idx * 24,
        ease: 'Back.easeOut'
      });
    });

    // Start the face-up memorization preview countdown (3.5s on 2x3, 4.5s on 3x4 / 4x4)
    const previewDurationMs = this.gridSize === '2x3' ? 3500 : 4500;
    this.startMemorizationPreview(previewDurationMs);
  }

  /**
   * Non-intrusive golden shimmer bar along the top edge of the felt (`y: 44`) that counts down
   * the face-up memorization phase (`3.5s` on `2x3`, `4.5s` on `3x4` / `4x4`) before flipping
   * all cards face-down in a smooth staggered wave.
   */
  private startMemorizationPreview(durationMs: number): void {
    const barW = 540;
    const barH = 8;
    const barX = 640;
    const barY = 44;

    const container = this.add.container(barX, barY).setDepth(48);
    this.previewBarContainer = container;

    const track = this.add.graphics();
    track.fillStyle(0x042619, 0.78);
    track.fillRoundedRect(-barW / 2 - 3, -barH / 2 - 3, barW + 6, barH + 6, 7);
    track.lineStyle(1.5, 0xd97706, 0.85);
    track.strokeRoundedRect(-barW / 2 - 3, -barH / 2 - 3, barW + 6, barH + 6, 7);
    container.add(track);

    const fill = this.add.graphics();
    const sparkle = this.add
      .image(barW / 2, 0, 'match-radial-glow')
      .setDisplaySize(32, 32)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.85);
    container.add([fill, sparkle]);

    const progressState = { p: 1 };
    const redrawBar = (p: number): void => {
      fill.clear();
      const currentW = Math.max(4, Math.round(barW * p));
      fill.fillStyle(0xfbbf24, 0.95);
      fill.fillRoundedRect(-barW / 2, -barH / 2, currentW, barH, 4);
      fill.fillStyle(0xfef08a, 0.75);
      fill.fillRoundedRect(-barW / 2, -barH / 2, currentW, Math.max(2, barH * 0.45), 3);
      sparkle.setX(-barW / 2 + currentW);
    };
    redrawBar(1);

    this.previewBarTween = this.tweens.add({
      targets: progressState,
      p: 0,
      duration: durationMs,
      ease: 'Linear',
      onUpdate: () => {
        redrawBar(progressState.p);
      },
      onComplete: () => {
        if (this.previewBarContainer) {
          this.tweens.add({
            targets: this.previewBarContainer,
            alpha: 0,
            duration: 200,
            onComplete: () => {
              this.previewBarContainer?.destroy(true);
              this.previewBarContainer = undefined;
            }
          });
        }
        this.flipAllCardsFaceDownWave();
      }
    });
  }

  private flipAllCardsFaceDownWave(): void {
    const total = this.cards.length;
    if (total === 0) {
      this.isBoardLocked = false;
      return;
    }

    let completedCount = 0;
    this.cards.forEach((card, idx) => {
      const t = this.time.delayedCall(idx * 42, () => {
        // Play pleasant staggered wooden flip clicks across the wave without overlapping every single frame
        if (idx === 0 || idx === Math.floor(total / 2) || idx === total - 1) {
          this.audio.playCardFlip();
        }
        this.flipCardFaceDown(card, () => {
          completedCount++;
          if (completedCount >= total) {
            this.isBoardLocked = false;
          }
        });
      });
      this.previewTimers.push(t);
    });
  }

  private createCardInstance(
    uid: number,
    spec: {
      pairId: string;
      cardKind: 'picture' | 'baby' | 'letter';
      spriteKey: string;
      wordKey: string;
      partnerWordKey?: string;
      letter: string;
      badgeColor: number;
    },
    x: number,
    y: number,
    width: number,
    height: number,
    startFaceUp = true
  ): CardInstance {
    const container = this.add.container(x, y);

    // 1. Grounded drop shadow on the felt tabletop
    const shadow = this.add.graphics();
    shadow.fillStyle(0x041f14, 0.55);
    shadow.fillRoundedRect(-width / 2 + 4, -height / 2 + 6, width, height, 12);
    container.add(shadow);

    // 2. Golden highlight ring (used during Firefly Hint or match celebration)
    const highlightRing = this.add.graphics();
    highlightRing.lineStyle(4, 0xfef08a, 0.95);
    highlightRing.strokeRoundedRect(-width / 2 - 4, -height / 2 - 4, width + 8, height + 8, 14);
    highlightRing.setVisible(false);
    container.add(highlightRing);

    // 3. Face-down card back (`card-back`)
    const backImage = this.add
      .image(0, 0, 'card-back')
      .setDisplaySize(width, height)
      .setVisible(!startFaceUp);
    container.add(backImage);

    // 4. Translucent X-Ray Spyglass overlay icon on the back of the card (hidden until Sparky peeks)
    const xraySprite = this.add
      .image(0, 0, spec.spriteKey)
      .setTint(0xfef08a)
      .setAlpha(0);
    this.fitSpriteInsideBox(xraySprite, width * 0.68, height * 0.68);
    container.add(xraySprite);

    // 5. Face-up card front container (`card-front` + centered illustration or wooden letter tile)
    const frontContainer = this.add.container(0, 0).setVisible(startFaceUp);
    const frontFrame = this.add.image(0, 0, 'card-front').setDisplaySize(width, height);
    frontContainer.add(frontFrame);

    if (spec.cardKind === 'letter') {
      const tileSize = Math.round(Math.min(width, height) * 0.72);
      const tileImg = this.add
        .image(0, 0, 'prop-tile')
        .setDisplaySize(tileSize, tileSize);
      const letterTxt = this.add
        .text(0, -2, spec.letter, {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: `${Math.round(tileSize * 0.58)}px`,
          fontStyle: 'bold',
          color: '#2c1507',
          stroke: '#fef3c7',
          strokeThickness: 2
        })
        .setOrigin(0.5);
      frontContainer.add([tileImg, letterTxt]);
    } else {
      const artSprite = this.add.image(0, 0, spec.spriteKey);
      this.fitSpriteInsideBox(artSprite, width * 0.76, height * 0.74);
      frontContainer.add(artSprite);
    }

    // Family bond / Phonics corner badge so ages 3-4 can spot pairs visually
    if (this.matchMode === 'mama-baby' || this.matchMode === 'letters') {
      const bx = width / 2 - 18;
      const by = -height / 2 + 18;
      const badgeG = this.add.graphics();
      badgeG.fillStyle(spec.badgeColor, 1);
      badgeG.fillCircle(bx, by, 12);
      badgeG.lineStyle(2, 0xffffff, 0.9);
      badgeG.strokeCircle(bx, by, 12);
      frontContainer.add(badgeG);

      const badgeSymbol =
        this.matchMode === 'mama-baby'
          ? spec.cardKind === 'baby'
            ? '♥'
            : '♛'
          : spec.letter;

      const badgeTxt = this.add
        .text(bx, by, badgeSymbol, {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#1e0f07'
        })
        .setOrigin(0.5);
      frontContainer.add(badgeTxt);
    }

    container.add(frontContainer);
    this.boardContainer.add(container);

    const cardObj: CardInstance = {
      uid,
      pairId: spec.pairId,
      cardKind: spec.cardKind,
      spriteKey: spec.spriteKey,
      wordKey: spec.wordKey,
      partnerWordKey: spec.partnerWordKey,
      letter: spec.letter,
      badgeColor: spec.badgeColor,
      x,
      y,
      width,
      height,
      isFlipped: startFaceUp,
      isMatched: false,
      isAnimating: false,
      container,
      backImage,
      frontContainer,
      xraySprite,
      highlightRing
    };

    const hitArea = this.add
      .zone(0, 0, Math.max(68, width), Math.max(68, height))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    container.add(hitArea);

    hitArea.on('pointerdown', () => {
      this.onCardTapped(cardObj);
    });

    return cardObj;
  }

  private fitSpriteInsideBox(img: Phaser.GameObjects.Image, maxW: number, maxH: number): void {
    const tex = img.texture.getSourceImage() as { width?: number; height?: number };
    const tw = tex?.width || 200;
    const th = tex?.height || 200;
    const scale = Math.min(maxW / tw, maxH / th);
    img.setScale(scale);
  }

  // ---------------------------------------------------------------------------
  // 3D CARD FLIP & MATCH EVALUATION (STRICT AUDIO DISCRETION!)
  // ---------------------------------------------------------------------------

  private onCardTapped(card: CardInstance): void {
    if (
      this.sanctuaryModal ||
      this.isBoardLocked ||
      card.isFlipped ||
      card.isMatched ||
      card.isAnimating
    ) {
      return;
    }
    if (this.flippedCards.length >= 2) {
      return;
    }

    // CRITICAL AUDIO DISCRETION RULE: Flipping a card plays ONLY the crisp tactile card_flip click!
    this.audio.playCardFlip();

    this.flipCardFaceUp(card, () => {
      this.flippedCards.push(card);
      if (this.flippedCards.length === 2) {
        this.evaluateFlippedPair();
      }
    });
  }

  private flipCardFaceUp(card: CardInstance, onComplete?: () => void): void {
    card.isAnimating = true;
    card.isFlipped = true;
    card.xraySprite.setAlpha(0);

    // Stage 1: Horizontal squeeze to 0 (`scaleX: 1 -> 0`) + slight lift
    this.tweens.add({
      targets: card.container,
      scaleX: 0,
      scaleY: 1.06,
      y: card.y - 6,
      duration: 105,
      ease: 'Quad.easeIn',
      onComplete: () => {
        card.backImage.setVisible(false);
        card.frontContainer.setVisible(true);

        // Stage 2: Expand face-up (`scaleX: 0 -> 1`)
        this.tweens.add({
          targets: card.container,
          scaleX: 1,
          scaleY: 1,
          y: card.y,
          duration: 125,
          ease: 'Back.easeOut',
          onComplete: () => {
            card.isAnimating = false;
            onComplete?.();
          }
        });
      }
    });
  }

  private flipCardFaceDown(card: CardInstance, onComplete?: () => void): void {
    card.isAnimating = true;
    this.tweens.add({
      targets: card.container,
      scaleX: 0,
      scaleY: 1.04,
      duration: 105,
      ease: 'Quad.easeIn',
      onComplete: () => {
        card.frontContainer.setVisible(false);
        card.backImage.setVisible(true);
        card.isFlipped = false;

        this.tweens.add({
          targets: card.container,
          scaleX: 1,
          scaleY: 1,
          duration: 120,
          ease: 'Quad.easeOut',
          onComplete: () => {
            card.isAnimating = false;
            onComplete?.();
          }
        });
      }
    });
  }

  private evaluateFlippedPair(): void {
    const [first, second] = this.flippedCards;
    if (!first || !second) return;

    this.isBoardLocked = true;

    if (first.pairId === second.pairId) {
      // MATCH!
      first.isMatched = true;
      second.isMatched = true;
      first.highlightRing.setVisible(true);
      second.highlightRing.setVisible(true);

      this.comboCount++;
      this.streakCount = Math.min(2, this.streakCount + 1);

      // Unlock this creature in the Sanctuary Album if not yet unlocked
      this.unlockSanctuaryItem(first.pairId);

      // 1. Acoustic music-box chime + star bursts on both cards
      this.audio.playMatchChime(this.comboCount - 1);
      Juice.burstStars(this, first.x, first.y, 12, [0xfef08a, 0xfbbf24, 0x34d399]);
      Juice.burstStars(this, second.x, second.y, 12, [0xfef08a, 0xfbbf24, 0x34d399]);

      this.tweens.add({
        targets: [first.container, second.container],
        scaleX: 1.09,
        scaleY: 1.09,
        duration: 150,
        yoyo: true,
        ease: 'Back.easeOut'
      });

      // 2. Speak the matched creature/treasure word calmly
      void this.audio.playMatchAnnouncement(
        this.matchMode,
        first.wordKey,
        second.wordKey,
        first.letter
      );

      this.flippedCards = [];
      this.isBoardLocked = false;

      // Trigger Sparky's Spyglass X-Ray Peek automatically if 2 pairs matched in a row and pairs remain!
      const remainingUnmatched = this.cards.filter((c) => !c.isMatched);
      if (this.streakCount >= 2 && remainingUnmatched.length >= 4) {
        this.time.delayedCall(650, () => {
          if (this.streakCount >= 2) {
            this.streakCount = 0;
            this.triggerSparkySpyglassPeek();
          }
        });
      }

      if (remainingUnmatched.length === 0) {
        this.onBoardCleared(1200);
      }
    } else {
      // MISMATCH — zero penalty, gentle pause so Wyatt & Emma can memorize the pictures
      this.streakCount = 0;

      this.time.delayedCall(920, () => {
        this.audio.playMismatchThud();
        this.flipCardFaceDown(first);
        this.flipCardFaceDown(second, () => {
          this.flippedCards = [];
          this.isBoardLocked = false;
        });
      });
    }
  }

  private unlockSanctuaryItem(itemId: string): void {
    if (!this.saveData.unlockedIds.includes(itemId)) {
      this.saveData.unlockedIds.push(itemId);
      this.persistSaveData();
    }
  }

  private onBoardCleared(delayMs: number): void {
    this.time.delayedCall(delayMs, () => {
      this.audio.playChestUnlock();
      void this.audio.playWhisper('board_clear');

      Juice.burstStars(this, 640, 304, 32, [0xfef08a, 0xfbbf24, 0x34d399, 0xf472b6]);
      Juice.squashAndStretch(this, this.sparkySprite, 0.22, 220);
      Juice.squashAndStretch(this, this.doggieSprite, 0.22, 220);

      this.time.delayedCall(2100, () => {
        this.dealNewBoard();
      });
    });
  }

  // ---------------------------------------------------------------------------
  // SPARKY'S SPYGLASS X-RAY PEEK & DOGGIE'S FIREFLY LANTERN HINT
  // ---------------------------------------------------------------------------

  private triggerSparkySpyglassPeek(): void {
    const faceDownUnmatched = this.cards.filter((c) => !c.isMatched && !c.isFlipped);
    if (faceDownUnmatched.length === 0) return;

    this.audio.playSpyglassPeek();
    Juice.squashAndStretch(this, this.sparkySprite, 0.22, 180);

    const byPair = new Map<string, CardInstance[]>();
    for (const c of faceDownUnmatched) {
      const list = byPair.get(c.pairId) ?? [];
      list.push(c);
      byPair.set(c.pairId, list);
    }
    const completePairs = Array.from(byPair.values()).filter((arr) => arr.length >= 2);
    const targets =
      completePairs.length > 0
        ? Phaser.Utils.Array.GetRandom(completePairs).slice(0, 2)
        : Phaser.Utils.Array.Shuffle([...faceDownUnmatched]).slice(0, 2);

    const beamG = this.add.graphics().setDepth(42);
    this.fxContainer.add(beamG);

    targets.forEach((card) => {
      beamG.fillStyle(0xfef08a, 0.16);
      beamG.beginPath();
      beamG.moveTo(95, 615);
      beamG.lineTo(card.x - 36, card.y - 36);
      beamG.lineTo(card.x + 36, card.y + 36);
      beamG.closePath();
      beamG.fillPath();

      card.xraySprite.setAlpha(0.75);
      this.tweens.add({
        targets: card.xraySprite,
        alpha: 0,
        delay: 1850,
        duration: 350,
        ease: 'Quad.easeOut'
      });
    });

    this.tweens.add({
      targets: beamG,
      alpha: 0,
      delay: 1700,
      duration: 500,
      onComplete: () => beamG.destroy()
    });
  }

  private triggerDoggieFireflyHint(): void {
    const unmatched = this.cards.filter((c) => !c.isMatched);
    if (unmatched.length < 2) return;

    this.audio.playFireflyTwinkle();
    Juice.squashAndStretch(this, this.doggieSprite, 0.22, 180);

    let targetPairId = unmatched[0].pairId;
    if (this.flippedCards.length === 1) {
      targetPairId = this.flippedCards[0].pairId;
    } else {
      const uniquePairIds = Array.from(new Set(unmatched.map((c) => c.pairId)));
      targetPairId = Phaser.Utils.Array.GetRandom(uniquePairIds);
    }

    const pairCards = unmatched.filter((c) => c.pairId === targetPairId);
    if (pairCards.length === 0) return;

    pairCards.forEach((card, idx) => {
      const firefly = this.add
        .image(1185, 615, 'match-prop-firefly')
        .setDisplaySize(54, 44)
        .setDepth(52);
      this.fxContainer.add(firefly);

      this.tweens.add({
        targets: firefly,
        x: card.x,
        y: card.y - 12,
        duration: 520 + idx * 90,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          card.highlightRing.setVisible(true);
          Juice.burstStars(this, card.x, card.y, 8, [0xfef08a, 0xfde047]);

          this.tweens.add({
            targets: card.container,
            angle: { from: -5, to: 5 },
            duration: 95,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
              card.container.setAngle(0);
              if (!card.isMatched) {
                card.highlightRing.setVisible(false);
              }
            }
          });

          this.tweens.add({
            targets: firefly,
            y: card.y - 36,
            alpha: 0,
            duration: 520,
            delay: 420,
            onComplete: () => firefly.destroy()
          });
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // FIVE OVERSIZED PURE-PICTURE BOTTOM BUTTONS (`96x96px` at `y: 640`)
  // ---------------------------------------------------------------------------

  private buildBottomControlBar(): void {
    const barY = 640;
    const xs = [300, 470, 640, 810, 980];

    const buttonDefs: Array<{
      id: string;
      x: number;
      mountIcon: (iconContainer: Phaser.GameObjects.Container) => void;
      onClick: () => void;
    }> = [
      // 1. Hub Button (Arcade House icon)
      {
        id: 'hub',
        x: xs[0],
        mountIcon: (iconContainer) => {
          const icon = this.add.image(0, 0, 'ui-back');
          this.fitSpriteInsideBox(icon, 68, 68);
          iconContainer.add(icon);
        },
        onClick: () => {
          this.clearPreviewTimersAndBar();
          this.audio.stopVoiceQueue();
          AudioBus.playSfx('pop');
          this.scene.start('HubScene');
        }
      },
      // 2. Grid Size Button (`2x3` -> `3x4` -> `4x4` dynamic visual mini-grid)
      {
        id: 'grid',
        x: xs[1],
        mountIcon: (iconContainer) => {
          this.gridBtnIconContainer = iconContainer;
          this.renderGridButtonIcon();
        },
        onClick: () => {
          const order: MatchGridSizeId[] = ['2x3', '3x4', '4x4'];
          this.gridSize = order[(order.indexOf(this.gridSize) + 1) % order.length];
          this.renderGridButtonIcon();
          this.persistSaveData();
          AudioBus.playSfx('tab');
          this.dealNewBoard();
        }
      },
      // 3. Match Mode Button (`Twins` -> `Mama & Baby` -> `Letters` dynamic visual picture)
      {
        id: 'mode',
        x: xs[2],
        mountIcon: (iconContainer) => {
          this.modeBtnIconContainer = iconContainer;
          this.renderModeButtonIcon();
        },
        onClick: () => {
          const order: MatchModeId[] = ['twins', 'mama-baby', 'letters'];
          this.matchMode = order[(order.indexOf(this.matchMode) + 1) % order.length];
          if (this.matchMode === 'mama-baby') {
            this.activeTheme = 'safari';
            this.renderThemeButtonIcon();
          }
          this.renderModeButtonIcon();
          this.persistSaveData();
          AudioBus.playSfx('tab');
          this.dealNewBoard();
        }
      },
      // 4. Theme / World Button (`Safari` -> `Ocean` -> `Dinos` -> `Treasures` dynamic sprite)
      {
        id: 'theme',
        x: xs[3],
        mountIcon: (iconContainer) => {
          this.themeBtnIconContainer = iconContainer;
          this.renderThemeButtonIcon();
        },
        onClick: () => {
          const order: MatchThemeId[] = ['safari', 'ocean', 'dino', 'treasures'];
          this.activeTheme = order[(order.indexOf(this.activeTheme) + 1) % order.length];
          if (this.matchMode === 'mama-baby' && this.activeTheme !== 'safari') {
            this.matchMode = 'twins';
            this.renderModeButtonIcon();
          }
          this.renderThemeButtonIcon();
          this.persistSaveData();
          AudioBus.playSfx('tab');
          this.dealNewBoard();
        }
      },
      // 5. Album Button (Ornate Sanctuary Sticker Book icon)
      {
        id: 'album',
        x: xs[4],
        mountIcon: (iconContainer) => {
          const icon = this.add.image(0, 0, 'ui-sanctuary');
          this.fitSpriteInsideBox(icon, 70, 70);
          iconContainer.add(icon);
        },
        onClick: () => {
          AudioBus.playSfx('pop');
          this.openSanctuaryModal();
        }
      }
    ];

    buttonDefs.forEach((def) => {
      const btn = this.add.container(def.x, barY).setDepth(35);

      // Tactile 96x96 brass-and-mahogany square picture button frame (zero text plaques!)
      const frameG = this.add.graphics();
      // Drop shadow
      frameG.fillStyle(0x090402, 0.65);
      frameG.fillRoundedRect(-48, -43, 96, 96, 18);
      // Polished brass outer bezel
      frameG.fillStyle(0xd97706, 1);
      frameG.fillRoundedRect(-48, -48, 96, 96, 18);
      frameG.lineStyle(2.5, 0xfef08a, 0.95);
      frameG.strokeRoundedRect(-48, -48, 96, 96, 18);
      // Warm mahogany recessed face
      frameG.fillStyle(0x26130a, 0.98);
      frameG.fillRoundedRect(-41, -41, 82, 82, 13);
      frameG.lineStyle(1.5, 0x92400e, 0.9);
      frameG.strokeRoundedRect(-41, -41, 82, 82, 13);
      // 4 brass corner rivets
      frameG.fillStyle(0xfde047, 0.9);
      frameG.fillCircle(-36, -36, 2.2);
      frameG.fillCircle(36, -36, 2.2);
      frameG.fillCircle(-36, 36, 2.2);
      frameG.fillCircle(36, 36, 2.2);

      const iconContainer = this.add.container(0, 0);
      def.mountIcon(iconContainer);

      btn.add([frameG, iconContainer]);

      Juice.makeTactileButton(this, btn, 96, 96, () => {
        if (this.sanctuaryModal && def.id !== 'album') return;
        def.onClick();
      });
    });
  }

  /**
   * Dynamically draws 6 big golden rectangles (`2x3`), 12 medium rectangles (`3x4`),
   * or 16 small rectangles (`4x4`) inside the Grid Size button face.
   */
  private renderGridButtonIcon(): void {
    if (!this.gridBtnIconContainer) return;
    this.gridBtnIconContainer.removeAll(true);

    const g = this.add.graphics();
    let rows = 2;
    let cols = 3;
    let cellW = 19;
    let cellH = 25;
    let gapX = 5;
    let gapY = 6;
    let radius = 4;

    if (this.gridSize === '3x4') {
      rows = 3;
      cols = 4;
      cellW = 14;
      cellH = 17;
      gapX = 4;
      gapY = 4;
      radius = 3;
    } else if (this.gridSize === '4x4') {
      rows = 4;
      cols = 4;
      cellW = 14;
      cellH = 13;
      gapX = 4;
      gapY = 3.5;
      radius = 2.5;
    }

    const totalW = cols * cellW + (cols - 1) * gapX;
    const totalH = rows * cellH + (rows - 1) * gapY;
    const startX = -totalW / 2;
    const startY = -totalH / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const rx = startX + c * (cellW + gapX);
        const ry = startY + r * (cellH + gapY);
        g.fillStyle(0x0f0703, 0.65);
        g.fillRoundedRect(rx + 1, ry + 1.5, cellW, cellH, radius);
        g.fillStyle(0xfbbf24, 1);
        g.fillRoundedRect(rx, ry, cellW, cellH, radius);
        g.lineStyle(1.4, 0xfef08a, 0.95);
        g.strokeRoundedRect(rx, ry, cellW, cellH, radius);
      }
    }

    this.gridBtnIconContainer.add(g);
  }

  /**
   * Cycles the Match Mode button picture clearly on every click:
   * - `twins`: Two identical animal sprites side-by-side (`safari-lion` + `safari-lion`)
   * - `mama-baby`: Large adult animal sprite (`safari-lion`) next to small baby sprite (`safari-lion-cub`)
   * - `letters`: Bold wooden letter block (`A`) next to an animal badge (`safari-lion`)
   */
  private renderModeButtonIcon(): void {
    if (!this.modeBtnIconContainer) return;
    this.modeBtnIconContainer.removeAll(true);

    const representativeKey = this.getThemeRepresentativeSpriteKey();

    if (this.matchMode === 'twins') {
      const leftSprite = this.add.image(-17, 2, representativeKey).setAngle(-5);
      this.fitSpriteInsideBox(leftSprite, 40, 46);
      const rightSprite = this.add.image(17, 2, representativeKey).setAngle(5);
      this.fitSpriteInsideBox(rightSprite, 40, 46);
      this.modeBtnIconContainer.add([leftSprite, rightSprite]);
    } else if (this.matchMode === 'mama-baby') {
      const mamaSprite = this.add.image(-14, 0, 'safari-lion');
      this.fitSpriteInsideBox(mamaSprite, 46, 52);
      const babySprite = this.add.image(19, 9, 'safari-lion-cub');
      this.fitSpriteInsideBox(babySprite, 30, 34);
      const heart = this.add
        .text(10, -20, '♥', {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '18px',
          fontStyle: 'bold',
          color: '#f472b6',
          stroke: '#1e0f07',
          strokeThickness: 3
        })
        .setOrigin(0.5);
      this.modeBtnIconContainer.add([mamaSprite, babySprite, heart]);
    } else {
      const tile = this.add.image(-17, 0, 'prop-tile').setDisplaySize(38, 38);
      const letterTxt = this.add
        .text(-17, -1, 'A', {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '23px',
          fontStyle: 'bold',
          color: '#2c1507',
          stroke: '#fef3c7',
          strokeThickness: 2
        })
        .setOrigin(0.5);
      const animalBadge = this.add.image(18, 2, representativeKey);
      this.fitSpriteInsideBox(animalBadge, 38, 44);
      this.modeBtnIconContainer.add([tile, letterTxt, animalBadge]);
    }
  }

  /**
   * Displays a large, vibrant artwork sprite from the currently active theme right inside
   * the Theme / World button (`safari-lion`, `ocean-turtle`, `dino-trex`, `tr-crown`).
   */
  private renderThemeButtonIcon(): void {
    if (!this.themeBtnIconContainer) return;
    this.themeBtnIconContainer.removeAll(true);

    const spriteKey = this.getThemeRepresentativeSpriteKey();
    const icon = this.add.image(0, 0, spriteKey);
    this.fitSpriteInsideBox(icon, 68, 68);
    this.themeBtnIconContainer.add(icon);
  }

  private getThemeRepresentativeSpriteKey(): string {
    if (this.activeTheme === 'safari') return 'safari-lion';
    if (this.activeTheme === 'ocean') return 'ocean-turtle';
    if (this.activeTheme === 'dino') return 'dino-trex';
    return 'tr-crown';
  }

  // ---------------------------------------------------------------------------
  // SAFARI SANCTUARY COLLECTOR'S DIORAMA MODAL (40 CREATURES & TREASURES)
  // ---------------------------------------------------------------------------

  private openSanctuaryModal(): void {
    if (this.sanctuaryModal) {
      this.closeSanctuaryModal();
      return;
    }

    const modal = this.add.container(0, 0).setDepth(120);
    this.sanctuaryModal = modal;

    const backdrop = this.add
      .rectangle(640, 360, 1280, 720, 0x090402, 0.82)
      .setInteractive();
    modal.add(backdrop);

    const panel = this.add.graphics();
    panel.fillStyle(0x231209, 0.98);
    panel.fillRoundedRect(110, 46, 1060, 628, 24);
    panel.lineStyle(4, 0xfbbf24, 1);
    panel.strokeRoundedRect(110, 46, 1060, 628, 24);
    panel.lineStyle(1.5, 0xfef08a, 0.7);
    panel.strokeRoundedRect(118, 54, 1044, 612, 18);
    modal.add(panel);

    const title = this.add
      .text(
        640,
        82,
        `★ SAFARI SANCTUARY ALBUM (${this.saveData.unlockedIds.length}/${SANCTUARY_CATALOG.length}) ★`,
        {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '24px',
          fontStyle: 'bold',
          color: '#fef08a',
          stroke: '#120804',
          strokeThickness: 4
        }
      )
      .setOrigin(0.5);
    modal.add(title);

    // 8 columns x 5 rows = 40 items
    const cols = 8;
    const startX = 202;
    const startY = 158;
    const stepX = 125;
    const stepY = 104;

    SANCTUARY_CATALOG.forEach((item, idx) => {
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      const cx = startX + c * stepX;
      const cy = startY + r * stepY;
      const isUnlocked = this.saveData.unlockedIds.includes(item.id);

      const cell = this.add.container(cx, cy);
      const slotG = this.add.graphics();
      slotG.fillStyle(isUnlocked ? 0x3b1f0e : 0x160b05, 0.95);
      slotG.fillRoundedRect(-52, -42, 104, 88, 12);
      slotG.lineStyle(2, isUnlocked ? 0xfbbf24 : 0x57361a, 0.9);
      slotG.strokeRoundedRect(-52, -42, 104, 88, 12);
      cell.add(slotG);

      const sp = this.add.image(0, -8, item.spriteKey);
      this.fitSpriteInsideBox(sp, 62, 54);
      if (!isUnlocked) {
        sp.setTint(0x0c0603).setAlpha(0.75);
      }
      cell.add(sp);

      const lbl = this.add
        .text(0, 31, isUnlocked ? item.label : '???', {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: isUnlocked ? '#fef08a' : '#78522b'
        })
        .setOrigin(0.5);
      cell.add(lbl);

      if (isUnlocked) {
        const hit = this.add
          .zone(0, 0, 104, 88)
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });
        cell.add(hit);
        hit.on('pointerdown', () => {
          Juice.squashAndStretch(this, sp, 0.24, 160);
          Juice.burstStars(this, cx, cy - 8, 8, [0xfef08a, 0xfbbf24]);
          void this.audio.playWord(item.wordKey);
        });
      }

      modal.add(cell);
    });

    // Close button (`x: 1132, y: 82`)
    const closeBtn = this.add.container(1132, 82);
    const closeG = this.add.graphics();
    closeG.fillStyle(0x7f1d1d, 0.95);
    closeG.fillCircle(0, 0, 22);
    closeG.lineStyle(2.5, 0xfbbf24, 1);
    closeG.strokeCircle(0, 0, 22);
    const closeTxt = this.add
      .text(0, 0, '✕', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    closeBtn.add([closeG, closeTxt]);
    modal.add(closeBtn);

    Juice.makeTactileButton(this, closeBtn, 64, 64, () => {
      AudioBus.playSfx('pop');
      this.closeSanctuaryModal();
    });
  }

  private closeSanctuaryModal(): void {
    if (!this.sanctuaryModal) return;
    this.sanctuaryModal.destroy(true);
    this.sanctuaryModal = undefined;
  }
}
