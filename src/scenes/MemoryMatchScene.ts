/**
 * MemoryMatchScene.ts
 * -------------------
 * Mentor Note: "Animal Match Safari" — 10x Heirloom Clockwork Parlor Memory Match Game
 * for Wyatt (age 4) and Emma (age 3).
 *
 * Key Architectural Highlights:
 * 1. Tactile 2-Stage 3D Card Flip (`scaleX: 1 -> 0 -> 1`) on an emerald-green baize felt parlor table.
 * 2. Strict Audio Discretion: Card flips play ONLY the crisp tactile `card_flip` wooden click
 *    (zero voice chatter on card flips!). Josh speaks calmly ONLY when a pair is matched, when the
 *    Golden Key unlocks the Mystery Treasure Chest, or when tapping unlocked stickers in the Sanctuary Album.
 * 3. Three Kid-Tailored Grid Sizes:
 *    - `2x3 COZY` (6 giant cards / 3 pairs for Emma)
 *    - `3x4 EXPLORER` (12 cards / 6 pairs)
 *    - `4x4 MASTER` (16 cards / 8 pairs for Wyatt)
 * 4. Three Educational Match Modes:
 *    - `TWINS`: Classic identical pairs across 4 richly painted theme decks
 *    - `MAMA & BABY`: Match adult Safari animals (`Lion`, `Elephant`, `Bear`, `Owl`, `Frog`, `Fox`, `Monkey`, `Duck`)
 *      to their babies (`Cub`, `Calf`, `Owlet`, `Tadpole`, `Kit`, `Duckling`) with color-matched family heart badges
 *    - `LETTERS`: Match carved wooden uppercase starting letters (`L` on `prop-tile`) to painted creatures (`Lion`)
 * 5. Companion Helpers & Mystery Chest:
 *    - Left (`x: 105, y: 500`): Sparky with his Brass Spyglass (2-streak X-Ray Peek reveals 2 unmatched cards!)
 *    - Right (`x: 1175, y: 500`): Doggie with her Firefly Lantern (zero-penalty Firefly Peek hint!)
 *    - Hidden Golden Clockwork Key under one pair on every board that flies up to unlock the Mystery Treasure Chest!
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
  // 1. SAFARI & WOODLAND (8 Adult + Baby Pairs = 16 sprites, 8 catalog slots + 8 baby bonus)
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
  private lastMatchedWordKey = 'lion';

  // Hidden Golden Key & Mystery Chest state
  private hiddenKeyPairId = '';
  private hiddenKeyUnderCardUid = -1;
  private isKeyFoundThisRound = false;
  private underCardKeyProp?: Phaser.GameObjects.Image;

  // Stage UI Containers & Sprites
  private boardContainer!: Phaser.GameObjects.Container;
  private fxContainer!: Phaser.GameObjects.Container;
  private sparkySprite!: Phaser.GameObjects.Image;
  private doggieSprite!: Phaser.GameObjects.Image;
  private streakPipGraphics!: Phaser.GameObjects.Graphics;
  private topChestSprite!: Phaser.GameObjects.Image;
  private topKeySlotSprite!: Phaser.GameObjects.Image;
  private topStickerCountText!: Phaser.GameObjects.Text;

  // Bottom Control Bar Labels
  private gridBtnLabel?: Phaser.GameObjects.Text;
  private modeBtnLabel?: Phaser.GameObjects.Text;
  private themeBtnLabel?: Phaser.GameObjects.Text;

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
    this.buildTopTrophyAlcove();
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
    const defaultUnlocked = ['safari-lion', 'safari-elephant', 'safari-bear', 'ocean-whale', 'dino-trex', 'veh-airship'];

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<MatchSaveData>;
        this.saveData = {
          unlockedIds: Array.isArray(parsed.unlockedIds) && parsed.unlockedIds.length > 0
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
      g.fillRoundedRect(170, 115, 940, 480, 22);
    }
  }

  /**
   * Top Trophy Alcove (`x: 640, y: 58`):
   * Houses the Golden Key slot (`match-prop-key`), the Mystery Brass Treasure Chest
   * (`chest-closed` -> `chest-open`), and the unlocked Sanctuary Sticker counter.
   */
  private buildTopTrophyAlcove(): void {
    const alcove = this.add.container(640, 56).setDepth(30);

    const bg = this.add.graphics();
    bg.fillStyle(0x1e0f07, 0.94);
    bg.fillRoundedRect(-175, -36, 350, 72, 18);
    bg.lineStyle(3, 0xd97706, 0.96);
    bg.strokeRoundedRect(-175, -36, 350, 72, 18);
    bg.lineStyle(1.2, 0xfef08a, 0.72);
    bg.strokeRoundedRect(-169, -30, 338, 60, 14);
    alcove.add(bg);

    const chestGlow = this.add
      .image(-12, 0, 'match-radial-glow')
      .setDisplaySize(110, 82)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.38);
    alcove.add(chestGlow);

    // 1. Golden Key Slot (`x: -112` relative to 640 -> `x: 528`)
    const keyRecess = this.add.graphics();
    keyRecess.fillStyle(0x0f0703, 0.85);
    keyRecess.fillCircle(-112, 0, 25);
    keyRecess.lineStyle(1.5, 0x92400e, 0.85);
    keyRecess.strokeCircle(-112, 0, 25);
    alcove.add(keyRecess);

    this.topKeySlotSprite = this.add
      .image(-112, 0, 'match-prop-key')
      .setDisplaySize(26, 46)
      .setTint(0x3b2313)
      .setAlpha(0.65);
    alcove.add(this.topKeySlotSprite);

    // 2. Mystery Brass Treasure Chest (`x: -14` relative to 640 -> `x: 626`)
    this.topChestSprite = this.add
      .image(-14, 0, 'chest-closed')
      .setDisplaySize(66, 58);
    alcove.add(this.topChestSprite);

    // 3. Sanctuary Unlocked Count (`x: 92` relative to 640 -> `x: 732`)
    this.topStickerCountText = this.add
      .text(92, 0, `★ ${this.saveData.unlockedIds.length}/${SANCTUARY_CATALOG.length}`, {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#1c0d06',
        strokeThickness: 4
      })
      .setOrigin(0.5);
    alcove.add(this.topStickerCountText);

    const hitZone = this.add
      .zone(640, 56, 350, 72)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(31);

    hitZone.on('pointerdown', () => {
      AudioBus.playSfx('pop');
      this.openSanctuaryModal();
    });
  }

  /**
   * Left Companion (`x: 105, y: 500`): Sparky with Brass Spyglass + 2-Pip Streak Meter
   * Right Companion (`x: 1175, y: 500`): Doggie with Firefly Lantern
   */
  private buildCompanions(): void {
    // 1. Sparky (`x: 105, y: 500`)
    const sparkyShadow = this.add.graphics().setDepth(14);
    sparkyShadow.fillStyle(0x080301, 0.55);
    sparkyShadow.fillEllipse(105, 582, 134, 24);

    const sparkyGlow = this.add
      .image(105, 495, 'match-radial-glow')
      .setDisplaySize(210, 210)
      .setTint(0x34d399)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.28)
      .setDepth(14);

    this.sparkySprite = this.add
      .image(105, 500, 'char-sparky-spyglass')
      .setDisplaySize(148, 154)
      .setDepth(15);

    this.tweens.add({
      targets: [this.sparkySprite, sparkyGlow],
      y: '-=5',
      duration: 1900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 2-Pip Brass Spyglass Charge Meter below Sparky (`x: 105, y: 602`)
    this.streakPipGraphics = this.add.graphics().setDepth(16);
    this.drawSparkyStreakPips();

    const sparkyZone = this.add
      .zone(105, 510, 155, 190)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(25);

    sparkyZone.on('pointerdown', () => {
      if (this.sanctuaryModal) return;
      this.triggerSparkySpyglassPeek();
    });

    // 2. Doggie (`x: 1175, y: 500`)
    const doggieShadow = this.add.graphics().setDepth(14);
    doggieShadow.fillStyle(0x080301, 0.55);
    doggieShadow.fillEllipse(1175, 582, 134, 24);

    const doggieGlow = this.add
      .image(1175, 495, 'match-radial-glow')
      .setDisplaySize(215, 215)
      .setTint(0xfde047)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.34)
      .setDepth(14);

    this.doggieSprite = this.add
      .image(1175, 500, 'char-doggie-lantern')
      .setDisplaySize(136, 154)
      .setDepth(15);

    this.tweens.add({
      targets: [this.doggieSprite, doggieGlow],
      y: '-=6',
      duration: 1650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const doggieZone = this.add
      .zone(1175, 510, 155, 190)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(25);

    doggieZone.on('pointerdown', () => {
      if (this.sanctuaryModal) return;
      this.triggerDoggieFireflyHint();
    });
  }

  private drawSparkyStreakPips(): void {
    this.streakPipGraphics.clear();
    const cx = 105;
    const cy = 602;
    this.streakPipGraphics.fillStyle(0x1f1108, 0.92);
    this.streakPipGraphics.fillRoundedRect(cx - 44, cy - 13, 88, 26, 12);
    this.streakPipGraphics.lineStyle(2, 0xd97706, 0.95);
    this.streakPipGraphics.strokeRoundedRect(cx - 44, cy - 13, 88, 26, 12);

    for (let i = 0; i < 2; i++) {
      const px = cx - 18 + i * 36;
      const active = this.streakCount > i;
      this.streakPipGraphics.fillStyle(active ? 0xfde047 : 0x3b2313, 1);
      this.streakPipGraphics.fillCircle(px, cy, 8);
      this.streakPipGraphics.lineStyle(1.5, active ? 0xffffff : 0x78350f, 0.9);
      this.streakPipGraphics.strokeCircle(px, cy, 8);
    }
  }

  // ---------------------------------------------------------------------------
  // BOARD DEALING & 3D CARD CONTAINERS
  // ---------------------------------------------------------------------------

  private getGridDimensions(): { rows: number; cols: number; cardW: number; cardH: number; stepX: number; stepY: number } {
    if (this.gridSize === '2x3') {
      return { rows: 2, cols: 3, cardW: 158, cardH: 198, stepX: 215, stepY: 214 };
    }
    if (this.gridSize === '3x4') {
      return { rows: 3, cols: 4, cardW: 124, cardH: 138, stepX: 175, stepY: 148 };
    }
    return { rows: 4, cols: 4, cardW: 104, cardH: 104, stepX: 160, stepY: 112 };
  }

  private selectPairsForBoard(numPairs: number): SanctuaryItemDef[] {
    // In Mama & Baby mode, always use the 8 Safari Adult+Baby pairs
    let pool: SanctuaryItemDef[];
    if (this.matchMode === 'mama-baby') {
      pool = SANCTUARY_CATALOG.filter((it) => it.theme === 'safari' && Boolean(it.babySpriteKey));
    } else {
      pool = SANCTUARY_CATALOG.filter((it) => it.theme === this.activeTheme);
    }

    const shuffled = Phaser.Utils.Array.Shuffle([...pool]);

    if (this.matchMode === 'letters') {
      // Ensure every pair on the board has a unique starting letter so letter matching is 100% unambiguous!
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

  private dealNewBoard(): void {
    this.isBoardLocked = false;
    this.flippedCards = [];
    this.cards = [];
    this.comboCount = 0;
    this.isKeyFoundThisRound = false;
    this.boardContainer.removeAll(true);
    this.fxContainer.removeAll(true);

    // Reset top alcove key & chest for the new board
    this.topKeySlotSprite.setTint(0x3b2313).setAlpha(0.65).setScale(1);
    this.topChestSprite.setTexture('chest-closed').setDisplaySize(66, 58);

    const { rows, cols, cardW, cardH, stepX, stepY } = this.getGridDimensions();
    const numPairs = (rows * cols) / 2;
    const chosenPairs = this.selectPairsForBoard(numPairs);

    // Choose 1 random pair to hide the Golden Clockwork Key underneath!
    const keyPair = Phaser.Utils.Array.GetRandom(chosenPairs);
    this.hiddenKeyPairId = keyPair.id;

    const paletteColors = [0xf59e0b, 0x38bdf8, 0x22c55e, 0xa855f7, 0xef4444, 0xfacc15, 0x14b8a6, 0xf472b6];

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
    const centerX = 640;
    const centerY = 352;
    const startX = centerX - ((cols - 1) * stepX) / 2;
    const startY = centerY - ((rows - 1) * stepY) / 2;

    let keyAssigned = false;

    shuffledDeck.forEach((spec, idx) => {
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      const targetX = Math.round(startX + c * stepX);
      const targetY = Math.round(startY + r * stepY);

      if (!keyAssigned && spec.pairId === this.hiddenKeyPairId) {
        keyAssigned = true;
        this.hiddenKeyUnderCardUid = idx;

        // Place subtle glinting Golden Key peeking under this card on the felt tabletop
        this.underCardKeyProp = this.add
          .image(targetX, targetY, 'match-prop-key')
          .setDisplaySize(Math.round(cardW * 0.34), Math.round(cardH * 0.56))
          .setAngle(-22)
          .setAlpha(0.85);
        this.boardContainer.add(this.underCardKeyProp);
      }

      const card = this.createCardInstance(idx, spec, targetX, targetY, cardW, cardH);
      this.cards.push(card);

      // Staggered deal-in animation
      card.container.setScale(0.01);
      this.tweens.add({
        targets: card.container,
        scaleX: 1,
        scaleY: 1,
        duration: 240,
        delay: idx * 28,
        ease: 'Back.easeOut'
      });
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
    height: number
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
    const backImage = this.add.image(0, 0, 'card-back').setDisplaySize(width, height);
    container.add(backImage);

    // 4. Translucent X-Ray Spyglass overlay icon on the back of the card (hidden until Sparky peeks)
    const xraySprite = this.add
      .image(0, 0, spec.spriteKey)
      .setTint(0xfef08a)
      .setAlpha(0);
    this.fitSpriteInsideBox(xraySprite, width * 0.68, height * 0.68);
    container.add(xraySprite);

    // 5. Face-up card front container (`card-front` + centered illustration or wooden letter tile)
    const frontContainer = this.add.container(0, 0).setVisible(false);
    const frontFrame = this.add.image(0, 0, 'card-front').setDisplaySize(width, height);
    frontContainer.add(frontFrame);

    if (spec.cardKind === 'letter') {
      const tileImg = this.add
        .image(0, 0, 'prop-tile')
        .setDisplaySize(Math.round(width * 0.72), Math.round(width * 0.72));
      const letterTxt = this.add
        .text(0, -2, spec.letter, {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: `${Math.round(width * 0.42)}px`,
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
      badgeG.fillCircle(bx, by, 11);
      badgeG.lineStyle(2, 0xffffff, 0.9);
      badgeG.strokeCircle(bx, by, 11);
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
          fontSize: '12px',
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
      isFlipped: false,
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
    if (this.sanctuaryModal || this.isBoardLocked || card.isFlipped || card.isMatched || card.isAnimating) {
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
      this.drawSparkyStreakPips();
      this.lastMatchedWordKey = first.wordKey;

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

      // Check if this matched pair was hiding the Golden Clockwork Key!
      const foundKeyNow = !this.isKeyFoundThisRound && first.pairId === this.hiddenKeyPairId;

      // 2. Speak the matched creature/treasure word calmly at volume 0.82
      void this.audio
        .playMatchAnnouncement(
          this.matchMode,
          first.wordKey,
          second.wordKey,
          first.letter
        )
        .then(() => {
          if (foundKeyNow) {
            this.launchGoldenKeyToChest(first, second);
          }
        });

      this.flippedCards = [];
      this.isBoardLocked = false;

      // Trigger Sparky's Spyglass X-Ray Peek automatically if 2 pairs matched in a row and pairs remain!
      const remainingUnmatched = this.cards.filter((c) => !c.isMatched);
      if (this.streakCount >= 2 && remainingUnmatched.length >= 4) {
        this.time.delayedCall(650, () => {
          if (this.streakCount >= 2) {
            this.streakCount = 0;
            this.drawSparkyStreakPips();
            this.triggerSparkySpyglassPeek();
          }
        });
      }

      if (remainingUnmatched.length === 0) {
        this.onBoardCleared(foundKeyNow ? 2200 : 1200);
      }
    } else {
      // MISMATCH — zero penalty, gentle pause so Wyatt & Emma can memorize the pictures
      this.streakCount = 0;
      this.drawSparkyStreakPips();

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

  // ---------------------------------------------------------------------------
  // HIDDEN GOLDEN KEY & MYSTERY TREASURE CHEST UNLOCK
  // ---------------------------------------------------------------------------

  private launchGoldenKeyToChest(cardA: CardInstance, cardB: CardInstance): void {
    if (this.isKeyFoundThisRound) return;
    this.isKeyFoundThisRound = true;

    if (this.underCardKeyProp) {
      this.underCardKeyProp.destroy();
      this.underCardKeyProp = undefined;
    }

    const originCard = cardA.uid === this.hiddenKeyUnderCardUid ? cardA : cardB;
    const startX = originCard.x;
    const startY = originCard.y;
    const endX = 626;
    const endY = 56;

    const flyingKey = this.add
      .image(startX, startY, 'match-prop-key')
      .setDisplaySize(44, 78)
      .setDepth(55);
    this.fxContainer.add(flyingKey);

    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(startX, startY),
      new Phaser.Math.Vector2((startX + endX) / 2, Math.min(startY, endY) - 120),
      new Phaser.Math.Vector2(endX, endY)
    );

    const pathFollower = { t: 0 };
    this.tweens.add({
      targets: pathFollower,
      t: 1,
      duration: 780,
      ease: 'Cubic.easeInOut',
      onUpdate: () => {
        const pt = curve.getPoint(pathFollower.t);
        flyingKey.setPosition(pt.x, pt.y);
        flyingKey.setAngle(pathFollower.t * 360);
      },
      onComplete: () => {
        flyingKey.destroy();

        // Light up Key Slot & Swap Closed Chest -> Open Chest with Gems!
        this.topKeySlotSprite.clearTint().setAlpha(1);
        Juice.squashAndStretch(this, this.topKeySlotSprite, 0.25, 180);

        this.topChestSprite.setTexture('chest-open').setDisplaySize(72, 68);
        Juice.squashAndStretch(this, this.topChestSprite, 0.28, 220);
        Juice.burstStars(this, 626, 56, 22, [0xfef08a, 0xfbbf24, 0x34d399, 0x60a5fa]);

        this.audio.playChestUnlock();
        void this.audio.playWhisper('key_found');

        // Bonus unlock a locked Sanctuary sticker!
        this.unlockRandomLockedSanctuarySticker();
      }
    });
  }

  private unlockSanctuaryItem(itemId: string): void {
    if (!this.saveData.unlockedIds.includes(itemId)) {
      this.saveData.unlockedIds.push(itemId);
      this.persistSaveData();
      this.topStickerCountText.setText(
        `★ ${this.saveData.unlockedIds.length}/${SANCTUARY_CATALOG.length}`
      );
      Juice.squashAndStretch(this, this.topStickerCountText, 0.2, 150);
    }
  }

  private unlockRandomLockedSanctuarySticker(): void {
    const locked = SANCTUARY_CATALOG.filter((it) => !this.saveData.unlockedIds.includes(it.id));
    if (locked.length === 0) return;
    const chosen = Phaser.Utils.Array.GetRandom(locked);
    this.unlockSanctuaryItem(chosen.id);
  }

  private onBoardCleared(delayMs: number): void {
    this.time.delayedCall(delayMs, () => {
      this.audio.playChestUnlock();
      void this.audio.playWhisper('board_clear');

      Juice.burstStars(this, 640, 340, 32, [0xfef08a, 0xfbbf24, 0x34d399, 0xf472b6]);
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

  /**
   * Shines a warm golden spyglass beam from Sparky (`105, 480`) across 2 unmatched face-down cards,
   * briefly revealing their translucent ghostly icons (`alpha: 0.72`) through the mahogany card backs
   * for 2.2 seconds!
   */
  private triggerSparkySpyglassPeek(): void {
    const faceDownUnmatched = this.cards.filter((c) => !c.isMatched && !c.isFlipped);
    if (faceDownUnmatched.length === 0) return;

    this.audio.playSpyglassPeek();
    Juice.squashAndStretch(this, this.sparkySprite, 0.22, 180);

    // Pick a matching pair if available so the X-Ray peek is super helpful!
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
      beamG.moveTo(135, 485);
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

  /**
   * Launches a glowing `match-prop-firefly` from Doggie's lantern (`1175, 480`) that hovers over
   * a matching pair on the board and makes both tiles gently wiggle with golden sparkles—zero penalty!
   */
  private triggerDoggieFireflyHint(): void {
    const unmatched = this.cards.filter((c) => !c.isMatched);
    if (unmatched.length < 2) return;

    this.audio.playFireflyTwinkle();
    Juice.squashAndStretch(this, this.doggieSprite, 0.22, 180);

    // Find a matching pair (prioritizing any currently flipped card's partner!)
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
        .image(1155, 485, 'match-prop-firefly')
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
  // BOTTOM CONTROL BAR (`y: 672` — 7 EVENLY SPACED BRASS BUTTONS)
  // ---------------------------------------------------------------------------

  private buildBottomControlBar(): void {
    const barY = 672;
    const xs = [200, 346, 493, 640, 786, 933, 1080];

    const specs: Array<{
      id: string;
      iconKey: string;
      label: string;
      x: number;
      onClick: () => void;
      assignLabel?: (txt: Phaser.GameObjects.Text) => void;
    }> = [
      {
        id: 'hub',
        iconKey: 'ui-back',
        label: 'HUB',
        x: xs[0],
        onClick: () => {
          this.audio.stopVoiceQueue();
          AudioBus.playSfx('pop');
          this.scene.start('HubScene');
        }
      },
      {
        id: 'grid',
        iconKey: 'ui-grid',
        label: this.getGridLabelText(),
        x: xs[1],
        assignLabel: (txt) => {
          this.gridBtnLabel = txt;
        },
        onClick: () => {
          const order: MatchGridSizeId[] = ['2x3', '3x4', '4x4'];
          this.gridSize = order[(order.indexOf(this.gridSize) + 1) % order.length];
          this.gridBtnLabel?.setText(this.getGridLabelText());
          this.persistSaveData();
          AudioBus.playSfx('tab');
          this.dealNewBoard();
        }
      },
      {
        id: 'mode',
        iconKey: 'ui-mode',
        label: this.getModeLabelText(),
        x: xs[2],
        assignLabel: (txt) => {
          this.modeBtnLabel = txt;
        },
        onClick: () => {
          const order: MatchModeId[] = ['twins', 'mama-baby', 'letters'];
          this.matchMode = order[(order.indexOf(this.matchMode) + 1) % order.length];
          if (this.matchMode === 'mama-baby') {
            this.activeTheme = 'safari';
            this.themeBtnLabel?.setText(this.getThemeLabelText());
          }
          this.modeBtnLabel?.setText(this.getModeLabelText());
          this.persistSaveData();
          AudioBus.playSfx('tab');
          this.dealNewBoard();
        }
      },
      {
        id: 'theme',
        iconKey: 'ui-theme',
        label: this.getThemeLabelText(),
        x: xs[3],
        assignLabel: (txt) => {
          this.themeBtnLabel = txt;
        },
        onClick: () => {
          const order: MatchThemeId[] = ['safari', 'ocean', 'dino', 'treasures'];
          this.activeTheme = order[(order.indexOf(this.activeTheme) + 1) % order.length];
          if (this.matchMode === 'mama-baby' && this.activeTheme !== 'safari') {
            this.matchMode = 'twins';
            this.modeBtnLabel?.setText(this.getModeLabelText());
          }
          this.themeBtnLabel?.setText(this.getThemeLabelText());
          this.persistSaveData();
          AudioBus.playSfx('tab');
          this.dealNewBoard();
        }
      },
      {
        id: 'peek',
        iconKey: 'ui-hint',
        label: 'PEEK',
        x: xs[4],
        onClick: () => {
          this.triggerDoggieFireflyHint();
        }
      },
      {
        id: 'hear',
        iconKey: 'ui-speak',
        label: 'HEAR',
        x: xs[5],
        onClick: () => {
          if (this.matchMode === 'mama-baby') {
            void this.audio.playWhisper('mama_baby');
          } else {
            void this.audio.playWord(this.lastMatchedWordKey);
          }
        }
      },
      {
        id: 'album',
        iconKey: 'ui-sanctuary',
        label: 'ALBUM',
        x: xs[6],
        onClick: () => {
          AudioBus.playSfx('pop');
          this.openSanctuaryModal();
        }
      }
    ];

    specs.forEach((spec) => {
      const btn = this.add.container(spec.x, barY - 8).setDepth(35);

      const icon = this.add.image(0, -4, spec.iconKey).setDisplaySize(54, 54);
      const plaque = this.add.graphics();
      plaque.fillStyle(0x1f1108, 0.94);
      plaque.fillRoundedRect(-52, 20, 104, 20, 6);
      plaque.lineStyle(1.5, 0xd97706, 0.92);
      plaque.strokeRoundedRect(-52, 20, 104, 20, 6);

      const txt = this.add
        .text(0, 30, spec.label, {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#fef08a'
        })
        .setOrigin(0.5);

      spec.assignLabel?.(txt);
      btn.add([icon, plaque, txt]);

      Juice.makeTactileButton(this, btn, 96, 72, () => {
        if (this.sanctuaryModal && spec.id !== 'album') return;
        spec.onClick();
      });
    });
  }

  private getGridLabelText(): string {
    if (this.gridSize === '2x3') return '2x3 COZY';
    if (this.gridSize === '3x4') return '3x4 EXPLORER';
    return '4x4 MASTER';
  }

  private getModeLabelText(): string {
    if (this.matchMode === 'twins') return 'TWINS';
    if (this.matchMode === 'mama-baby') return 'MAMA & BABY';
    return 'LETTERS';
  }

  private getThemeLabelText(): string {
    if (this.activeTheme === 'safari') return 'SAFARI';
    if (this.activeTheme === 'ocean') return 'OCEAN';
    if (this.activeTheme === 'dino') return 'DINOS';
    return 'TREASURES';
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
