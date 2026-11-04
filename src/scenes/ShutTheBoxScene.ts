import Phaser from 'phaser';
import { ArcadeState } from '../core/ArcadeState';
import { AudioBus } from '../core/AudioBus';
import { Juice } from '../core/Juice';
import { ShutTheBoxAudioEngine } from '../audio/ShutTheBoxAudioEngine';

type TurnPhase =
  | 'READY_TO_ROLL'
  | 'ROLLING_DICE'
  | 'DICE_MATH_SCROLL'
  | 'FLIP_TILES'
  | 'SCORE_MATH_CHALLENGE'
  | 'SPARKY_TURN'
  | 'ROUND_CELEBRATION';

interface WoodenTileView {
  num: number;
  isUp: boolean;
  isSelected: boolean;
  isValidCandidate: boolean;
  container: Phaser.GameObjects.Container;
  bgSprite: Phaser.GameObjects.Image;
  numText: Phaser.GameObjects.Text;
  pipsGraphics: Phaser.GameObjects.Graphics;
  baseX: number;
  baseY: number;
}

/**
 * Great Hall Box of Ten (`ShutTheBoxScene.ts`)
 * ============================================
 * A 32-bit Hi-Bit Pixel Art tabletop math & dice game set in a candlelit
 * Hogwarts-style Great Hall Banquet for Wyatt (age 4) and Emma (age 3).
 *
 * Clean Stage Rule:
 * - Background (`shutthebox-stage`) has an empty emerald-green baize felt tray
 *   and empty top/bottom wooden racks.
 * - All 20 hinged wooden tiles (1-10 for Player at bottom, 1-10 for Professor
 *   Sparky at top), rolling dice, Floating Parchment Math Scroll, crystal orb
 *   choices, Professor Sparky, Doggie, and House Point Hourglasses are live
 *   interactive Phaser objects.
 */
export class ShutTheBoxScene extends Phaser.Scene {
  private audio!: ShutTheBoxAudioEngine;
  private phase: TurnPhase = 'READY_TO_ROLL';

  // Mode: 1 Die (Easy 1-6 for Emma) vs 2 Dice (Standard 2-12 for Wyatt)
  private diceCount: 1 | 2 = 2;
  private modeBtnText!: Phaser.GameObjects.Text;
  private modeSubText!: Phaser.GameObjects.Text;

  // Wooden 1-10 Tile Racks
  private playerTiles: WoodenTileView[] = [];
  private sparkyTiles: WoodenTileView[] = [];
  private selectedPlayerTiles: number[] = [];
  private validTileSubsets: number[][] = [];

  // Dice & Turn State
  private die1Value = 4;
  private die2Value = 3;
  private currentDiceSum = 7;
  private lastFlippedTiles: number[] = [];
  private turnCount = 0;

  // House Point Hourglass Scores
  private playerGems = 0;
  private sparkyGems = 0;
  private playerHourglassSprite!: Phaser.GameObjects.Image;
  private sparkyHourglassSprite!: Phaser.GameObjects.Image;
  private playerGemFillGfx!: Phaser.GameObjects.Graphics;
  private sparkyGemFillGfx!: Phaser.GameObjects.Graphics;
  private playerScoreText!: Phaser.GameObjects.Text;
  private sparkyScoreText!: Phaser.GameObjects.Text;

  // Characters
  private sparkySprite!: Phaser.GameObjects.Image;
  private doggieSprite!: Phaser.GameObjects.Image;

  // Felt Tray Interactive Elements
  private feltTrayContainer!: Phaser.GameObjects.Container;
  private diceCupSprite!: Phaser.GameObjects.Image;
  private die1Sprite!: Phaser.GameObjects.Image;
  private die2Sprite!: Phaser.GameObjects.Image;
  private feltBannerContainer!: Phaser.GameObjects.Container;
  private feltBannerText!: Phaser.GameObjects.Text;
  private feltSubBannerText!: Phaser.GameObjects.Text;

  // Floating Parchment Math Scroll / Score Math Modal
  private mathScrollContainer!: Phaser.GameObjects.Container;

  // Round Celebration Modal
  private celebrationContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'ShutTheBoxScene' });
  }

  public create(): void {
    this.audio = new ShutTheBoxAudioEngine();
    this.phase = 'READY_TO_ROLL';
    this.selectedPlayerTiles = [];
    this.lastFlippedTiles = [];
    this.turnCount = 0;
    this.playerGems = 0;
    this.sparkyGems = 0;

    // Default to 1 Die (1-6) for Emma (age 3) and 2 Dice (2-12) for Wyatt (age 4)
    const activeKid = ArcadeState.getActiveKid();
    this.diceCount = activeKid.id === 'emma' ? 1 : 2;

    this.applyNearestFilterToGameTextures();
    this.createBanquetStageBackground();
    this.createGreatHallFloatingCandles();
    this.createCompanionsAndHourglasses();
    this.createTopAndBottomWoodenTileRacks();
    this.createFeltTrayAndDiceCup();
    this.createTopHudControls();

    this.mathScrollContainer = this.add.container(640, 385).setDepth(120).setVisible(false);
    this.celebrationContainer = this.add.container(640, 360).setDepth(160).setVisible(false);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.audio.stopVoice();
    });
  }

  private applyNearestFilterToGameTextures(): void {
    const keys = [
      'shutthebox-stage',
      'stb-tile-wood-up',
      'stb-tile-wood-down',
      'stb-tile-wood-gold',
      'stb-prop-dice-cup',
      'stb-die-face-1',
      'stb-die-face-2',
      'stb-die-face-3',
      'stb-die-face-4',
      'stb-die-face-5',
      'stb-die-face-6',
      'die-1',
      'die-2',
      'die-3',
      'die-4',
      'die-5',
      'die-6',
      'stb-die-tumble-1',
      'stb-die-tumble-2',
      'stb-prop-math-scroll',
      'stb-orb-choice',
      'stb-gem-ruby',
      'stb-gem-emerald',
      'stb-prof-sparky-idle',
      'stb-prof-sparky-roll',
      'stb-prof-sparky-cheer',
      'stb-doggie-mage-cheer',
      'stb-doggie-mage-idle',
      'stb-hourglass-player',
      'stb-hourglass-sparky',
      'stb-prop-wizard-trophy'
    ];
    keys.forEach((k) => {
      if (this.textures.exists(k)) {
        this.textures.get(k).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    });
  }

  // ===========================================================================
  // 1. STAGE BACKGROUND, FLOATING CANDLES, COMPANIONS & HOUSE HOURGLASSES
  // ===========================================================================

  private createBanquetStageBackground(): void {
    if (this.textures.exists('shutthebox-stage')) {
      this.add.image(640, 360, 'shutthebox-stage').setDisplaySize(1280, 720).setDepth(1);
    } else {
      const bg = this.add.graphics().setDepth(1);
      bg.fillGradientStyle(0x1e110a, 0x1e110a, 0x3b1f0e, 0x3b1f0e, 1);
      bg.fillRect(0, 0, 1280, 720);
    }

    // Subtle warm candlelight vignette over the emerald baize felt center
    const feltGlow = this.add
      .image(640, 390, 'hub-radial-glow')
      .setDisplaySize(640, 340)
      .setTint(0x10b981)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.14)
      .setDepth(2);

    this.tweens.add({
      targets: feltGlow,
      alpha: { from: 0.1, to: 0.2 },
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private createGreatHallFloatingCandles(): void {
    const candlePoints = [
      { x: 150, y: 78 },
      { x: 310, y: 58 },
      { x: 485, y: 48 },
      { x: 795, y: 48 },
      { x: 970, y: 58 },
      { x: 1130, y: 78 }
    ];

    candlePoints.forEach((pt, idx) => {
      const halo = this.add
        .image(pt.x, pt.y, 'particle-star')
        .setTint(idx % 2 === 0 ? 0xfef08a : 0xfbbf24)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.32)
        .setAlpha(0.55)
        .setDepth(4);

      this.tweens.add({
        targets: halo,
        y: pt.y - 8,
        alpha: { from: 0.35, to: 0.85 },
        scaleX: { from: 0.26, to: 0.42 },
        scaleY: { from: 0.26, to: 0.42 },
        duration: 1600 + idx * 190,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });
  }

  private createCompanionsAndHourglasses(): void {
    // 1. Professor Sparky perched behind the top rim of the Box of Ten
    this.sparkySprite = this.add
      .image(640, 108, 'stb-prof-sparky-idle')
      .setOrigin(0.5, 0.5)
      .setScale(0.66)
      .setDepth(15)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: this.sparkySprite,
      y: 103,
      scaleY: 0.68,
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Brass plaque for Professor Sparky
    const sparkyTag = this.add.container(640, 174).setDepth(18);
    const sTagGfx = this.add.graphics();
    sTagGfx.fillStyle(0x1f1209, 0.92);
    sTagGfx.fillRoundedRect(-115, -13, 230, 26, 8);
    sTagGfx.lineStyle(2, 0xfbbf24, 0.95);
    sTagGfx.strokeRoundedRect(-115, -13, 230, 26, 8);
    const sTagTxt = this.add
      .text(0, 0, 'PROFESSOR SPARKY (1-10)', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    sparkyTag.add([sTagGfx, sTagTxt]);

    this.sparkySprite.on('pointerdown', () => {
      Juice.squashAndStretch(this, this.sparkySprite, 0.16, 150);
      Juice.burstStars(this, this.sparkySprite.x, this.sparkySprite.y - 20, 8, [0x34d399, 0xfef08a]);
      this.provideFriendlyHint();
    });

    // 2. Cheering Doggie Mage beside the right side of the board (Hint Companion!)
    this.doggieSprite = this.add
      .image(1135, 225, 'stb-doggie-mage-idle')
      .setOrigin(0.5, 0.5)
      .setScale(0.68)
      .setDepth(22)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: this.doggieSprite,
      y: 219,
      angle: { from: -2, to: 2 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Hint badge below Doggie
    const hintBadge = this.add.container(1135, 312).setDepth(24);
    const hbGfx = this.add.graphics();
    hbGfx.fillStyle(0x2a1408, 0.94);
    hbGfx.fillRoundedRect(-68, -15, 136, 30, 9);
    hbGfx.lineStyle(2, 0xfbbf24, 1);
    hbGfx.strokeRoundedRect(-68, -15, 136, 30, 9);
    const hbTxt = this.add
      .text(0, 0, '★ DOGGIE HINT', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    hintBadge.add([hbGfx, hbTxt]);

    const doggieHit = this.add
      .zone(1135, 245, 150, 190)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(25);

    doggieHit.on('pointerdown', () => {
      this.doggieSprite.setTexture('stb-doggie-mage-cheer');
      Juice.squashAndStretch(this, this.doggieSprite, 0.2, 160);
      Juice.burstStars(this, 1135, 200, 12, [0xfef08a, 0xfbbf24, 0xffffff]);
      this.provideFriendlyHint();
      this.time.delayedCall(1200, () => {
        if (this.doggieSprite && this.doggieSprite.active) {
          this.doggieSprite.setTexture('stb-doggie-mage-idle');
        }
      });
    });

    // 3. LEFT: Player's Great Hall Ruby House Hourglass (`x: 135, y: 455`)
    this.playerGemFillGfx = this.add.graphics().setDepth(19);
    this.playerHourglassSprite = this.add
      .image(135, 455, 'stb-hourglass-player')
      .setOrigin(0.5, 0.5)
      .setScale(0.76)
      .setDepth(20);

    const playerGlassPlaque = this.add.container(135, 608).setDepth(22);
    const pgGfx = this.add.graphics();
    pgGfx.fillStyle(0x3b0d11, 0.95);
    pgGfx.fillRoundedRect(-96, -24, 192, 48, 10);
    pgGfx.lineStyle(2.5, 0xfbbf24, 1);
    pgGfx.strokeRoundedRect(-96, -24, 192, 48, 10);
    const pgGemIcon = this.add.image(-58, 0, 'stb-gem-ruby').setScale(0.34);
    const kidLabel = ArcadeState.getActiveKid().name.toUpperCase();
    const pgTitle = this.add
      .text(10, -9, `${kidLabel}'S GEMS`, {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fecdd3'
      })
      .setOrigin(0.5);
    this.playerScoreText = this.add
      .text(10, 10, '0', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    playerGlassPlaque.add([pgGfx, pgGemIcon, pgTitle, this.playerScoreText]);

    // 4. RIGHT: Professor Sparky's Emerald House Hourglass (`x: 1135, y: 475`)
    this.sparkyGemFillGfx = this.add.graphics().setDepth(19);
    this.sparkyHourglassSprite = this.add
      .image(1135, 475, 'stb-hourglass-sparky')
      .setOrigin(0.5, 0.5)
      .setScale(0.72)
      .setDepth(20);

    const sparkyGlassPlaque = this.add.container(1135, 616).setDepth(22);
    const sgGfx = this.add.graphics();
    sgGfx.fillStyle(0x062e22, 0.95);
    sgGfx.fillRoundedRect(-96, -24, 192, 48, 10);
    sgGfx.lineStyle(2.5, 0xfbbf24, 1);
    sgGfx.strokeRoundedRect(-96, -24, 192, 48, 10);
    const sgGemIcon = this.add.image(-58, 0, 'stb-gem-emerald').setScale(0.34);
    const sgTitle = this.add
      .text(10, -9, 'SPARKY GEMS', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#a7f3d0'
      })
      .setOrigin(0.5);
    this.sparkyScoreText = this.add
      .text(10, 10, '0', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    sparkyGlassPlaque.add([sgGfx, sgGemIcon, sgTitle, this.sparkyScoreText]);

    this.updateHourglassVisualFill();
  }

  private updateHourglassVisualFill(): void {
    this.playerGemFillGfx.clear();
    const pRatio = Phaser.Math.Clamp(this.playerGems / 45, 0, 1);
    if (pRatio > 0) {
      const fillH = Math.round(58 * pRatio);
      this.playerGemFillGfx.fillStyle(0xf43f5e, 0.65);
      this.playerGemFillGfx.fillRoundedRect(135 - 32, 515 - fillH, 64, fillH, 8);
    }

    this.sparkyGemFillGfx.clear();
    const sRatio = Phaser.Math.Clamp(this.sparkyGems / 45, 0, 1);
    if (sRatio > 0) {
      const fillH = Math.round(54 * sRatio);
      this.sparkyGemFillGfx.fillStyle(0x10b981, 0.65);
      this.sparkyGemFillGfx.fillRoundedRect(1135 - 30, 530 - fillH, 60, fillH, 8);
    }

    this.playerScoreText.setText(`${this.playerGems}`);
    this.sparkyScoreText.setText(`${this.sparkyGems}`);
  }

  // ===========================================================================
  // 2. TOP & BOTTOM HINGED WOODEN 1-10 TILE RACKS
  // ===========================================================================

  private createTopAndBottomWoodenTileRacks(): void {
    this.playerTiles = [];
    this.sparkyTiles = [];

    // Top Row: Professor Sparky's 1-10 Wooden Hinged Tiles (`y: 232`)
    const topStartX = 370;
    const topStepX = 60;
    for (let n = 1; n <= 10; n++) {
      const tx = topStartX + (n - 1) * topStepX;
      const ty = 232;
      const tile = this.createWoodenTileView(n, tx, ty, 0.46, false);
      this.sparkyTiles.push(tile);
    }

    // Bottom Row: Player's 1-10 Wooden Hinged Tiles (`y: 552`)
    const botStartX = 352;
    const botStepX = 64;
    for (let n = 1; n <= 10; n++) {
      const tx = botStartX + (n - 1) * botStepX;
      const ty = 552;
      const tile = this.createWoodenTileView(n, tx, ty, 0.54, true);
      this.playerTiles.push(tile);
    }

    // Player Rack Brass Nameplate on lower wooden frame lip (`y: 626`)
    const kidName = ArcadeState.getActiveKid().name.toUpperCase();
    const playerTag = this.add.container(640, 626).setDepth(28);
    const pTagGfx = this.add.graphics();
    pTagGfx.fillStyle(0x231208, 0.95);
    pTagGfx.fillRoundedRect(-155, -14, 310, 28, 8);
    pTagGfx.lineStyle(2, 0xfbbf24, 1);
    pTagGfx.strokeRoundedRect(-155, -14, 310, 28, 8);
    const pTagTxt = this.add
      .text(0, 0, `★ ${kidName}'S WOODEN TILES (1 - 10) ★`, {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '13.5px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    playerTag.add([pTagGfx, pTagTxt]);
  }

  private createWoodenTileView(
    num: number,
    x: number,
    y: number,
    scale: number,
    isPlayerTile: boolean
  ): WoodenTileView {
    const container = this.add.container(x, y).setDepth(isPlayerTile ? 35 : 25);

    const bgSprite = this.add
      .image(0, 0, 'stb-tile-wood-up')
      .setOrigin(0.5, 0.5)
      .setScale(scale);

    // Visual counting pips carved into the upper face of the wooden tile
    const pipsGraphics = this.add.graphics();
    this.drawTileCountingPips(pipsGraphics, num, isPlayerTile ? -21 : -17, isPlayerTile ? 2.4 : 2.0);

    const numText = this.add
      .text(0, isPlayerTile ? 6 : 5, `${num}`, {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: isPlayerTile ? '25px' : '21px',
        fontStyle: 'bold',
        color: '#3b1806',
        stroke: '#fef3c7',
        strokeThickness: 2
      })
      .setOrigin(0.5);

    container.add([bgSprite, pipsGraphics, numText]);

    const tileView: WoodenTileView = {
      num,
      isUp: true,
      isSelected: false,
      isValidCandidate: false,
      container,
      bgSprite,
      numText,
      pipsGraphics,
      baseX: x,
      baseY: y
    };

    if (isPlayerTile) {
      // Generous 64x92px hit area for ages 3-4
      const hitZone = this.add
        .zone(0, 0, 64, 92)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      container.add(hitZone);

      hitZone.on('pointerdown', () => {
        this.onPlayerTileTapped(tileView);
      });
    }

    return tileView;
  }

  private drawTileCountingPips(
    gfx: Phaser.GameObjects.Graphics,
    count: number,
    centerY: number,
    radius: number
  ): void {
    gfx.clear();
    gfx.fillStyle(0x78350f, 0.9);
    const maxPerRow = 5;
    const rows = count > 5 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const r = Math.floor(i / maxPerRow);
      const c = i % maxPerRow;
      const itemsInRow = r === 0 ? Math.min(count, maxPerRow) : count - maxPerRow;
      const spacing = 7.5;
      const px = (c - (itemsInRow - 1) / 2) * spacing;
      const py = centerY + (rows === 2 ? (r === 0 ? -4 : 4) : 0);
      gfx.fillCircle(px, py, radius);
    }
  }

  // ===========================================================================
  // 3. EMERALD BAIZE FELT TRAY, DICE SHAKER CUP & TUMBLING IVORY DICE
  // ===========================================================================

  private createFeltTrayAndDiceCup(): void {
    this.feltTrayContainer = this.add.container(0, 0).setDepth(30);

    // Interactive green felt roll zone (`x: 320..960, y: 280..500`)
    const feltHitZone = this.add
      .zone(640, 390, 620, 210)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.feltTrayContainer.add(feltHitZone);

    feltHitZone.on('pointerdown', () => {
      if (this.phase === 'READY_TO_ROLL') {
        this.rollPlayerDice();
      }
    });

    // Leather & Brass Dice Shaker Cup on left of felt tray
    this.diceCupSprite = this.add
      .image(425, 392, 'stb-prop-dice-cup')
      .setOrigin(0.5, 0.5)
      .setScale(0.68)
      .setInteractive({ useHandCursor: true });
    this.feltTrayContainer.add(this.diceCupSprite);

    this.diceCupSprite.on('pointerdown', () => {
      if (this.phase === 'READY_TO_ROLL') {
        this.rollPlayerDice();
      }
    });

    // Gentle idle bob on the dice cup when ready to roll
    this.tweens.add({
      targets: this.diceCupSprite,
      y: 384,
      angle: { from: -4, to: 4 },
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Ivory Dice Sprites on the emerald felt
    this.die1Sprite = this.add
      .image(565, 392, 'stb-die-face-4')
      .setOrigin(0.5, 0.5)
      .setScale(0.66)
      .setVisible(false);

    this.die2Sprite = this.add
      .image(695, 392, 'stb-die-face-3')
      .setOrigin(0.5, 0.5)
      .setScale(0.66)
      .setVisible(false);

    this.feltTrayContainer.add([this.die1Sprite, this.die2Sprite]);

    // Live Equation / Instruction Banner on the Emerald Felt
    this.feltBannerContainer = this.add.container(690, 390);
    const fbGfx = this.add.graphics();
    fbGfx.fillStyle(0x063624, 0.92);
    fbGfx.fillRoundedRect(-195, -42, 390, 84, 16);
    fbGfx.lineStyle(3, 0xfbbf24, 1);
    fbGfx.strokeRoundedRect(-195, -42, 390, 84, 16);

    this.feltBannerText = this.add
      .text(0, -10, 'TAP DICE CUP TO ROLL', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '23px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#1c0d06',
        strokeThickness: 4
      })
      .setOrigin(0.5);

    this.feltSubBannerText = this.add
      .text(0, 19, 'Roll on the Great Hall green felt', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#a7f3d0'
      })
      .setOrigin(0.5);

    this.feltBannerContainer.add([fbGfx, this.feltBannerText, this.feltSubBannerText]);
    this.feltTrayContainer.add(this.feltBannerContainer);
  }

  // ===========================================================================
  // 4. TOP HUD CONTROLS (BACK TO HUB, 1 DIE / 2 DICE MODE TOGGLE, NEW BOX)
  // ===========================================================================

  private createTopHudControls(): void {
    // 1. Back to Hub Medallion (`x: 68, y: 54`, 76x76px hit zone)
    const backBtn = this.add.container(68, 54).setDepth(150);
    const bGfx = this.add.graphics();
    bGfx.fillStyle(0x271308, 0.95);
    bGfx.fillCircle(0, 0, 34);
    bGfx.lineStyle(3, 0xfbbf24, 1);
    bGfx.strokeCircle(0, 0, 34);

    if (this.textures.exists('ui-back')) {
      const icon = this.add.image(0, 0, 'ui-back').setDisplaySize(42, 42);
      backBtn.add([bGfx, icon]);
    } else {
      const txt = this.add
        .text(0, -2, '◀', {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '26px',
          fontStyle: 'bold',
          color: '#fef08a'
        })
        .setOrigin(0.5);
      backBtn.add([bGfx, txt]);
    }

    const backHit = this.add
      .zone(0, 0, 76, 76)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    backBtn.add(backHit);

    backHit.on('pointerdown', () => {
      this.audio.stopVoice();
      AudioBus.playSfx('tab');
      Juice.squashAndStretch(this, backBtn, 0.2, 130);
      this.time.delayedCall(150, () => {
        this.scene.start('HubScene');
      });
    });

    // 2. Mode Toggle Pill (`1 DIE: EASY 1-6` for Emma vs `2 DICE: ADD 2-12` for Wyatt)
    const modeBtn = this.add.container(1045, 52).setDepth(150);
    const mGfx = this.add.graphics();
    mGfx.fillStyle(0x231208, 0.95);
    mGfx.fillRoundedRect(-115, -28, 230, 56, 14);
    mGfx.lineStyle(2.5, 0xfbbf24, 1);
    mGfx.strokeRoundedRect(-115, -28, 230, 56, 14);

    this.modeBtnText = this.add
      .text(0, -8, '', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);

    this.modeSubText = this.add
      .text(0, 11, '', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '11.5px',
        fontStyle: 'bold',
        color: '#a7f3d0'
      })
      .setOrigin(0.5);

    this.refreshModeButtonLabel();
    modeBtn.add([mGfx, this.modeBtnText, this.modeSubText]);

    const modeHit = this.add
      .zone(0, 0, 230, 64)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    modeBtn.add(modeHit);

    modeHit.on('pointerdown', () => {
      if (this.phase === 'ROLLING_DICE' || this.phase === 'SPARKY_TURN') return;
      this.diceCount = this.diceCount === 2 ? 1 : 2;
      this.refreshModeButtonLabel();
      Juice.squashAndStretch(this, modeBtn, 0.16, 140);
      Juice.burstStars(this, 1045, 52, 10, [0xfef08a, 0xfbbf24]);
      this.audio.speakPrompt(this.diceCount === 1 ? 'mode_one_die' : 'mode_two_dice');
    });

    // 3. New Round / Reset Box Button (`x: 1218, y: 52`, 76x64px hit zone)
    const resetBtn = this.add.container(1218, 52).setDepth(150);
    const rGfx = this.add.graphics();
    rGfx.fillStyle(0x3b1d0a, 0.95);
    rGfx.fillRoundedRect(-44, -28, 88, 56, 14);
    rGfx.lineStyle(2.5, 0xfbbf24, 1);
    rGfx.strokeRoundedRect(-44, -28, 88, 56, 14);
    const rTxt = this.add
      .text(0, -6, '↻', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '23px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    const rSub = this.add
      .text(0, 13, 'RESET', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '10.5px',
        fontStyle: 'bold',
        color: '#fde68a'
      })
      .setOrigin(0.5);
    resetBtn.add([rGfx, rTxt, rSub]);

    const resetHit = this.add
      .zone(0, 0, 88, 64)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    resetBtn.add(resetHit);

    resetHit.on('pointerdown', () => {
      Juice.squashAndStretch(this, resetBtn, 0.18, 140);
      this.resetFullGame();
    });
  }

  private refreshModeButtonLabel(): void {
    if (this.diceCount === 1) {
      this.modeBtnText.setText('⚀ 1 DIE MODE (1-6)');
      this.modeSubText.setText('Emma Easy Counting • Tap to Switch');
    } else {
      this.modeBtnText.setText('⚃⚂ 2 DICE MODE (2-12)');
      this.modeSubText.setText('Wyatt Dice Addition • Tap to Switch');
    }
  }

  // ===========================================================================
  // 5. STEP A — ROLL THE DICE & SOLVE THE FLOATING PARCHMENT MATH SCROLL
  // ===========================================================================

  private rollPlayerDice(): void {
    if (this.phase !== 'READY_TO_ROLL') return;
    this.phase = 'ROLLING_DICE';
    this.turnCount++;
    this.selectedPlayerTiles = [];
    this.clearPlayerTileHighlights();

    // Check if any upright tiles remain
    const upNumbers = this.playerTiles.filter((t) => t.isUp).map((t) => t.num);
    if (upNumbers.length === 0) {
      this.showRoundCelebration(true);
      return;
    }

    // Choose kid-friendly dice values that guarantee a valid move among remaining upright tiles!
    const chosenDice = this.pickPlayableDiceRoll(upNumbers, this.diceCount);
    this.die1Value = chosenDice.d1;
    this.die2Value = chosenDice.d2;
    this.currentDiceSum = this.diceCount === 1 ? this.die1Value : this.die1Value + this.die2Value;

    // 1. Shake the leather dice cup
    this.audio.playDiceCupShake();
    this.feltBannerContainer.setVisible(false);
    this.die1Sprite.setVisible(false);
    this.die2Sprite.setVisible(false);

    this.tweens.add({
      targets: this.diceCupSprite,
      x: { from: 412, to: 442 },
      y: { from: 375, to: 402 },
      angle: { from: -18, to: 22 },
      scaleX: 0.75,
      scaleY: 0.62,
      duration: 65,
      yoyo: true,
      repeat: 4,
      onComplete: () => {
        this.diceCupSprite.setPosition(405, 392).setAngle(0).setScale(0.68);
        this.animateDiceTumbleOnFelt();
      }
    });
  }

  private pickPlayableDiceRoll(upNumbers: number[], diceCount: 1 | 2): { d1: number; d2: number } {
    // Find all achievable sums using 1 or 2 upright tiles
    const achievableSums = new Set<number>();
    for (let i = 0; i < upNumbers.length; i++) {
      achievableSums.add(upNumbers[i]);
      for (let j = i + 1; j < upNumbers.length; j++) {
        achievableSums.add(upNumbers[i] + upNumbers[j]);
      }
    }

    const validPairs: Array<{ d1: number; d2: number }> = [];
    if (diceCount === 1) {
      for (let d1 = 1; d1 <= 6; d1++) {
        if (achievableSums.has(d1)) {
          validPairs.push({ d1, d2: 0 });
        }
      }
      if (validPairs.length > 0) {
        return Phaser.Utils.Array.GetRandom(validPairs);
      }
      return { d1: Phaser.Math.Between(1, 6), d2: 0 };
    } else {
      for (let d1 = 1; d1 <= 6; d1++) {
        for (let d2 = 1; d2 <= 6; d2++) {
          if (achievableSums.has(d1 + d2)) {
            validPairs.push({ d1, d2 });
          }
        }
      }
      if (validPairs.length > 0) {
        return Phaser.Utils.Array.GetRandom(validPairs);
      }
      return { d1: Phaser.Math.Between(1, 6), d2: Phaser.Math.Between(1, 6) };
    }
  }

  private animateDiceTumbleOnFelt(): void {
    this.audio.playDiceRollFelt();

    this.die1Sprite
      .setPosition(455, 385)
      .setTexture('stb-die-face-1')
      .setVisible(true)
      .setScale(0.66);

    if (this.diceCount === 2) {
      this.die2Sprite
        .setPosition(475, 410)
        .setTexture('stb-die-face-6')
        .setVisible(true)
        .setScale(0.66);
    } else {
      this.die2Sprite.setVisible(false);
    }

    // Cycle top-down dice faces rapidly while tumbling/bouncing across the baize felt
    let ticks = 0;
    const tumbleTimer = this.time.addEvent({
      delay: 75,
      repeat: 5,
      callback: () => {
        ticks++;
        const f1 = ((ticks + 1) % 6) + 1;
        const f2 = ((ticks + 4) % 6) + 1;
        this.die1Sprite.setTexture(`stb-die-face-${f1}`);
        this.die2Sprite.setTexture(`stb-die-face-${f2}`);
      }
    });

    const targetX1 = this.diceCount === 1 ? 640 : 575;
    const targetX2 = 720;

    this.tweens.add({
      targets: this.die1Sprite,
      x: targetX1,
      y: 388,
      angle: 360,
      duration: 480,
      ease: 'Cubic.easeOut'
    });

    if (this.diceCount === 2) {
      this.tweens.add({
        targets: this.die2Sprite,
        x: targetX2,
        y: 392,
        angle: -360,
        duration: 510,
        ease: 'Cubic.easeOut'
      });
    }

    this.time.delayedCall(540, () => {
      tumbleTimer.remove(false);
      // Snap upright at angle = 0 on the exact rolled top-down face so pips are right-side-up
      this.die1Sprite.setTexture(`stb-die-face-${this.die1Value}`).setAngle(0);
      Juice.squashAndStretch(this, this.die1Sprite, 0.18, 140);

      if (this.diceCount === 2) {
        this.die2Sprite.setTexture(`stb-die-face-${this.die2Value}`).setAngle(0);
        Juice.squashAndStretch(this, this.die2Sprite, 0.18, 140);
      }

      Juice.burstStars(this, 640, 390, 12, [0xfef08a, 0xfbbf24, 0xffffff]);

      // Unfurl the Floating Parchment Math Scroll!
      this.time.delayedCall(380, () => {
        this.showDiceMathScroll();
      });
    });
  }

  /**
   * Unfurls the glowing Floating Parchment Math Scroll showing the dice math
   * equation with visual pip dots underneath each number (e.g., `[⚃ 4] + [⚂ 3] = ?`)
   * and 3 clickable glowing crystal orb answer choices (`6`, `7`, `8`).
   */
  private showDiceMathScroll(): void {
    this.phase = 'DICE_MATH_SCROLL';
    this.mathScrollContainer.removeAll(true);
    this.mathScrollContainer.setVisible(true);
    this.mathScrollContainer.setScale(0.2, 0.85).setAlpha(0);

    this.audio.playScrollUnfurl();
    this.audio.speakPrompt('prompt_scroll');

    // Dim backdrop so the Floating Parchment Math Scroll pops crisply
    const backdrop = this.add
      .rectangle(0, 0, 1280, 720, 0x0c0603, 0.45)
      .setInteractive();
    this.mathScrollContainer.add(backdrop);

    // Parchment Scroll Board (`760x350`)
    const cardW = 760;
    const cardH = 350;
    const scrollGfx = this.add.graphics();

    // Outer shadow & antique gold border
    scrollGfx.fillStyle(0x090401, 0.72);
    scrollGfx.fillRoundedRect(-cardW / 2 + 6, -cardH / 2 + 8, cardW, cardH, 24);

    scrollGfx.fillStyle(0xfdf3d7, 0.98);
    scrollGfx.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 22);
    scrollGfx.lineStyle(5, 0xd97706, 1);
    scrollGfx.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 22);
    scrollGfx.lineStyle(2, 0xfbbf24, 0.9);
    scrollGfx.strokeRoundedRect(-cardW / 2 + 8, -cardH / 2 + 8, cardW - 16, cardH - 16, 16);

    // Decorative scroll icon in top-left corner
    const scrollBadge = this.add
      .image(-cardW / 2 + 54, -cardH / 2 + 42, 'stb-prop-math-scroll')
      .setScale(0.36);

    const headerTxt = this.add
      .text(0, -cardH / 2 + 34, '★ GREAT HALL DICE MATH SCROLL ★', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#78350f'
      })
      .setOrigin(0.5);

    this.mathScrollContainer.add([scrollGfx, scrollBadge, headerTxt]);

    // Equation Display Row (`y: -38`)
    const eqY = -42;
    const pipDots: Phaser.GameObjects.Arc[] = [];

    if (this.diceCount === 2) {
      // Die 1 Card (`x: -195`)
      this.createScrollNumberCard(-195, eqY, this.die1Value, `stb-die-face-${this.die1Value}`, 0xe11d48, pipDots);

      // Plus Sign (`x: -85`)
      const plusTxt = this.add
        .text(-85, eqY - 8, '+', {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '46px',
          fontStyle: 'bold',
          color: '#92400e'
        })
        .setOrigin(0.5);
      this.mathScrollContainer.add(plusTxt);

      // Die 2 Card (`x: 25`)
      this.createScrollNumberCard(25, eqY, this.die2Value, `stb-die-face-${this.die2Value}`, 0x059669, pipDots);
    } else {
      // 1-Die Mode: Single Die Card (`x: -85`)
      this.createScrollNumberCard(-85, eqY, this.die1Value, `stb-die-face-${this.die1Value}`, 0xe11d48, pipDots);
    }

    // Equals Sign (`x: 130`)
    const eqTxt = this.add
      .text(130, eqY - 8, '=', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '46px',
        fontStyle: 'bold',
        color: '#92400e'
      })
      .setOrigin(0.5);

    // Mystery Answer Box (`x: 225`)
    const ansBoxGfx = this.add.graphics();
    ansBoxGfx.fillStyle(0xfef08a, 0.95);
    ansBoxGfx.fillRoundedRect(225 - 52, eqY - 58, 104, 104, 18);
    ansBoxGfx.lineStyle(3.5, 0xd97706, 1);
    ansBoxGfx.strokeRoundedRect(225 - 52, eqY - 58, 104, 104, 18);

    const mysteryText = this.add
      .text(225, eqY - 6, '?', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '50px',
        fontStyle: 'bold',
        color: '#b45309'
      })
      .setOrigin(0.5);

    this.mathScrollContainer.add([eqTxt, ansBoxGfx, mysteryText]);

    // 3 Clickable Glowing Crystal Orb Choices (`y: 106`)
    const choices = this.buildThreeMathChoices(this.currentDiceSum, this.diceCount === 1 ? 1 : 2, 12);
    const orbSpacing = 185;
    let solved = false;

    choices.forEach((choiceVal, idx) => {
      const ox = (idx - 1) * orbSpacing;
      const oy = 104;

      const orbBtn = this.add.container(ox, oy);
      const orbGlow = this.add
        .image(0, -4, 'hub-radial-glow')
        .setDisplaySize(135, 135)
        .setTint(0xfbbf24)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.35);

      const orbImg = this.add.image(0, 0, 'stb-orb-choice').setScale(0.76);
      const orbNum = this.add
        .text(0, -10, `${choiceVal}`, {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '36px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#451a03',
          strokeThickness: 6
        })
        .setOrigin(0.5);

      orbBtn.add([orbGlow, orbImg, orbNum]);
      this.mathScrollContainer.add(orbBtn);

      // Gentle float tween on each crystal orb
      this.tweens.add({
        targets: orbBtn,
        y: oy - 5,
        duration: 1100 + idx * 160,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      const hit = this.add
        .zone(0, 0, 118, 118)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      orbBtn.add(hit);

      hit.on('pointerdown', () => {
        if (solved) return;
        // Immediately speak ONLY the single clicked number
        this.audio.speakNumber(choiceVal);

        if (choiceVal === this.currentDiceSum) {
          solved = true;
          mysteryText.setText(`${choiceVal}`).setColor('#15803d');
          this.audio.playMathChime();
          Juice.squashAndStretch(this, orbBtn, 0.24, 180);
          Juice.burstStars(this, 640 + ox, 385 + oy, 24, [0xfef08a, 0xfbbf24, 0x34d399, 0xffffff]);

          this.time.delayedCall(900, () => {
            this.tweens.add({
              targets: this.mathScrollContainer,
              scaleX: 0.2,
              alpha: 0,
              duration: 240,
              ease: 'Back.easeIn',
              onComplete: () => {
                this.mathScrollContainer.setVisible(false);
                this.beginFlipTilesPhase();
              }
            });
          });
        } else {
          // Gentle zero-penalty wobble + sequential pip dot highlight so the child can count!
          this.audio.playGentleTryAgain();
          this.tweens.add({
            targets: orbBtn,
            x: { from: ox - 7, to: ox + 7 },
            duration: 55,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
              orbBtn.x = ox;
            }
          });
          this.pulseCountingDotsHelper(pipDots);
        }
      });
    });

    this.tweens.add({
      targets: this.mathScrollContainer,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 310,
      ease: 'Back.easeOut'
    });
  }

  private createScrollNumberCard(
    x: number,
    y: number,
    val: number,
    spriteKey: string,
    pipColor: number,
    pipDotsOut: Phaser.GameObjects.Arc[]
  ): void {
    const cardGfx = this.add.graphics();
    cardGfx.fillStyle(0xfffbeb, 0.98);
    cardGfx.fillRoundedRect(x - 68, y - 62, 136, 122, 16);
    cardGfx.lineStyle(2.5, 0xb45309, 0.9);
    cardGfx.strokeRoundedRect(x - 68, y - 62, 136, 122, 16);

    const icon = this.add.image(x - 26, y - 14, spriteKey).setScale(0.46);
    const numTxt = this.add
      .text(x + 28, y - 14, `${val}`, {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '38px',
        fontStyle: 'bold',
        color: '#451a03'
      })
      .setOrigin(0.5);

    const cardHit = this.add
      .zone(x, y, 136, 122)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    cardHit.on('pointerdown', () => {
      this.audio.speakNumber(val);
      Juice.squashAndStretch(this, icon, 0.16, 130);
    });

    this.mathScrollContainer.add([cardGfx, icon, numTxt, cardHit]);

    // Visual pip dots row underneath the number (`y + 36`)
    const maxPerRow = 5;
    const rows = val > 5 ? 2 : 1;
    for (let i = 0; i < val; i++) {
      const r = Math.floor(i / maxPerRow);
      const c = i % maxPerRow;
      const inRow = r === 0 ? Math.min(val, maxPerRow) : val - maxPerRow;
      const dotX = x + (c - (inRow - 1) / 2) * 18;
      const dotY = y + 34 + (rows === 2 ? (r === 0 ? -7 : 8) : 0);
      const dot = this.add.circle(dotX, dotY, 6.5, pipColor, 1).setStrokeStyle(1.5, 0x451a03);
      this.mathScrollContainer.add(dot);
      pipDotsOut.push(dot);
    }
  }

  private pulseCountingDotsHelper(dots: Phaser.GameObjects.Arc[]): void {
    dots.forEach((dot, idx) => {
      this.time.delayedCall(idx * 110, () => {
        if (!dot.active) return;
        this.tweens.add({
          targets: dot,
          scaleX: 1.55,
          scaleY: 1.55,
          duration: 110,
          yoyo: true,
          ease: 'Quad.easeOut'
        });
      });
    });
  }

  private buildThreeMathChoices(correct: number, minVal: number, maxVal: number): number[] {
    const set = new Set<number>([correct]);
    const offsets = [-1, 1, -2, 2, -3, 3];
    for (const off of offsets) {
      if (set.size >= 3) break;
      const candidate = correct + off;
      if (candidate >= minVal && candidate <= maxVal) {
        set.add(candidate);
      }
    }
    while (set.size < 3) {
      set.add(Phaser.Math.Between(minVal, Math.max(maxVal, correct + 2)));
    }
    return Array.from(set).sort((a, b) => a - b);
  }

  // ===========================================================================
  // 6. STEP B — FLIP THE WOODEN 1-10 TILES (WITH LIVE EQUATION & HIGHLIGHTING)
  // ===========================================================================

  private beginFlipTilesPhase(): void {
    this.phase = 'FLIP_TILES';
    this.selectedPlayerTiles = [];
    this.validTileSubsets = this.computeValidTileSubsets(this.currentDiceSum);

    // If no valid combinations exist among remaining upright tiles, end round & score!
    if (this.validTileSubsets.length === 0) {
      this.feltBannerContainer.setVisible(true);
      this.feltBannerText.setText(`NO TILES MAKE ${this.currentDiceSum}`);
      this.feltSubBannerText.setText('Moving to Great Hall Gem Scoring!');
      this.time.delayedCall(1200, () => {
        this.showScoreMathChallenge([this.currentDiceSum]);
      });
      return;
    }

    this.feltBannerContainer.setVisible(true);
    this.updateLiveTileEquationBanner();
    this.refreshPlayerTileCandidateHighlights();
  }

  private computeValidTileSubsets(targetSum: number): number[][] {
    const upNums = this.playerTiles.filter((t) => t.isUp).map((t) => t.num);
    const results: number[][] = [];

    // Single tile match (e.g., 7 = 7)
    for (const a of upNums) {
      if (a === targetSum) {
        results.push([a]);
      }
    }

    // Pair tile matches (e.g., 3 + 4 = 7, 2 + 5 = 7, 1 + 6 = 7)
    for (let i = 0; i < upNums.length; i++) {
      for (let j = i + 1; j < upNums.length; j++) {
        if (upNums[i] + upNums[j] === targetSum) {
          results.push([upNums[i], upNums[j]]);
        }
      }
    }

    return results;
  }

  private refreshPlayerTileCandidateHighlights(): void {
    // Determine which upright tiles can still complete `this.selectedPlayerTiles` to `this.currentDiceSum`
    const compatibleNums = new Set<number>();
    this.validTileSubsets.forEach((subset) => {
      const matchesAllSelected = this.selectedPlayerTiles.every((sel) => subset.includes(sel));
      if (matchesAllSelected) {
        subset.forEach((n) => compatibleNums.add(n));
      }
    });

    this.playerTiles.forEach((tile) => {
      this.tweens.killTweensOf(tile.container);
      if (!tile.isUp) {
        tile.isValidCandidate = false;
        tile.isSelected = false;
        tile.bgSprite.setTexture('stb-tile-wood-down').clearTint();
        tile.numText.setVisible(false);
        tile.pipsGraphics.setVisible(false);
        tile.container.setPosition(tile.baseX, tile.baseY);
        return;
      }

      const isSelected = this.selectedPlayerTiles.includes(tile.num);
      const isCandidate = compatibleNums.has(tile.num);
      tile.isSelected = isSelected;
      tile.isValidCandidate = isCandidate;

      if (isSelected) {
        tile.bgSprite.setTexture('stb-tile-wood-gold').setTint(0xfef08a);
        tile.container.setPosition(tile.baseX, tile.baseY - 14);
      } else if (isCandidate) {
        tile.bgSprite.setTexture('stb-tile-wood-gold').clearTint();
        tile.container.setPosition(tile.baseX, tile.baseY - 5);
        this.tweens.add({
          targets: tile.container,
          y: tile.baseY - 10,
          duration: 650,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      } else {
        tile.bgSprite.setTexture('stb-tile-wood-up').setTint(0xbba894);
        tile.container.setPosition(tile.baseX, tile.baseY);
      }
    });
  }

  private clearPlayerTileHighlights(): void {
    this.playerTiles.forEach((tile) => {
      this.tweens.killTweensOf(tile.container);
      tile.container.setPosition(tile.baseX, tile.baseY);
      if (tile.isUp) {
        tile.bgSprite.setTexture('stb-tile-wood-up').clearTint();
      } else {
        tile.bgSprite.setTexture('stb-tile-wood-down').clearTint();
      }
    });
  }

  private updateLiveTileEquationBanner(): void {
    if (this.selectedPlayerTiles.length === 0) {
      this.feltBannerText.setText(`FLIP TILES TO MAKE ${this.currentDiceSum}`);
      this.feltSubBannerText.setText(
        `Tap glowing golden tiles that equal ${this.currentDiceSum}`
      );
    } else if (this.selectedPlayerTiles.length === 1) {
      const first = this.selectedPlayerTiles[0];
      const needed = this.currentDiceSum - first;
      this.feltBannerText.setText(`${first} + [ ${needed} ] = ${this.currentDiceSum}`);
      this.feltSubBannerText.setText(`Now tap wooden tile ${needed} to make ${this.currentDiceSum}`);
    }
  }

  private onPlayerTileTapped(tile: WoodenTileView): void {
    if (!tile.isUp) return;

    // Immediately speak ONLY the single tapped wooden tile's number (1..10)
    this.audio.speakNumber(tile.num);

    if (this.phase !== 'FLIP_TILES') {
      Juice.squashAndStretch(this, tile.container, 0.14, 120);
      return;
    }

    // Allow deselecting an already-selected tile
    if (this.selectedPlayerTiles.includes(tile.num)) {
      this.selectedPlayerTiles = this.selectedPlayerTiles.filter((n) => n !== tile.num);
      this.audio.playTileSelectTap(tile.num);
      this.updateLiveTileEquationBanner();
      this.refreshPlayerTileCandidateHighlights();
      return;
    }

    if (!tile.isValidCandidate) {
      // Gentle shake if not part of a valid combination for the current sum
      this.audio.playGentleTryAgain();
      this.tweens.add({
        targets: tile.container,
        x: { from: tile.baseX - 5, to: tile.baseX + 5 },
        duration: 50,
        yoyo: true,
        repeat: 2,
        onComplete: () => {
          tile.container.x = tile.baseX;
        }
      });
      return;
    }

    this.selectedPlayerTiles.push(tile.num);
    this.audio.playTileSelectTap(tile.num);
    Juice.squashAndStretch(this, tile.container, 0.16, 130);

    const sumSoFar = this.selectedPlayerTiles.reduce((acc, v) => acc + v, 0);

    if (sumSoFar === this.currentDiceSum) {
      // Completed the target sum! Clack shut the selected wooden tiles!
      const flippedNums = [...this.selectedPlayerTiles];
      this.lastFlippedTiles = flippedNums;
      this.selectedPlayerTiles = [];

      if (flippedNums.length === 1) {
        this.feltBannerText.setText(`${flippedNums[0]} = ${this.currentDiceSum}`);
      } else {
        this.feltBannerText.setText(`${flippedNums[0]} + ${flippedNums[1]} = ${this.currentDiceSum}`);
      }
      this.feltSubBannerText.setText('Wooden tiles clacked shut!');

      flippedNums.forEach((n, idx) => {
        const targetTile = this.playerTiles.find((t) => t.num === n);
        if (targetTile) {
          this.time.delayedCall(idx * 140, () => {
            this.animateWoodenTileClackShut(targetTile, true);
          });
        }
      });

      this.time.delayedCall(1050, () => {
        this.clearPlayerTileHighlights();
        // Check if the player shut all 10 tiles!
        const anyUp = this.playerTiles.some((t) => t.isUp);
        if (!anyUp) {
          this.showScoreMathChallenge(flippedNums, true);
        } else {
          this.showScoreMathChallenge(flippedNums, false);
        }
      });
    } else {
      // Partial pair selected (e.g., tapped 3 toward 7 -> highlight 4!)
      this.updateLiveTileEquationBanner();
      this.refreshPlayerTileCandidateHighlights();
    }
  }

  private animateWoodenTileClackShut(tile: WoodenTileView, isPlayer: boolean): void {
    tile.isUp = false;
    tile.isSelected = false;
    tile.isValidCandidate = false;
    this.tweens.killTweensOf(tile.container);
    tile.container.setPosition(tile.baseX, tile.baseY);

    this.audio.playTileClackShut(tile.num);

    const baseScale = isPlayer ? 0.54 : 0.46;
    this.tweens.add({
      targets: tile.container,
      scaleY: 0.08,
      duration: 95,
      ease: 'Quad.easeIn',
      onComplete: () => {
        tile.bgSprite.setTexture('stb-tile-wood-down').clearTint();
        tile.bgSprite.setScale(baseScale);
        tile.numText.setVisible(false);
        tile.pipsGraphics.setVisible(false);

        Juice.burstStars(this, tile.baseX, tile.baseY, 10, [
          isPlayer ? 0xf43f5e : 0x10b981,
          0xfef08a,
          0xfbbf24
        ]);

        this.tweens.add({
          targets: tile.container,
          scaleY: 1,
          duration: 120,
          ease: 'Back.easeOut'
        });
      }
    });
  }

  // ===========================================================================
  // 7. STEP C — SCORE MATH CHALLENGE & PROFESSOR SPARKY'S COMPUTER TURN
  // ===========================================================================

  /**
   * Guides the player through a visual Score Math Challenge on screen, adding
   * their scored tiles/gems with visual ruby counters to pour glowing gems into
   * their Great Hall House Hourglass before Professor Sparky takes his turn!
   */
  private showScoreMathChallenge(flippedTiles: number[], allTilesShut = false): void {
    this.phase = 'SCORE_MATH_CHALLENGE';
    this.mathScrollContainer.removeAll(true);
    this.mathScrollContainer.setVisible(true);
    this.mathScrollContainer.setScale(0.25, 0.85).setAlpha(0);

    this.audio.playScrollUnfurl();
    this.audio.speakPrompt('prompt_score_math');

    // Compute the 2 gem clusters to add on the Score Math Challenge scroll:
    // If 2 tiles were flipped (e.g. 3 + 4 = 7), add [3 Rubies] + [4 Rubies] = 7!
    // If 1 tile was flipped (e.g. 6), add [Tile 6 Rubies] + [1 House Bonus Ruby] = 7!
    const gemA = flippedTiles.length >= 2 ? flippedTiles[0] : flippedTiles[0] ?? 3;
    const gemB = flippedTiles.length >= 2 ? flippedTiles[1] : 1;
    const totalGemsEarned = gemA + gemB;

    const backdrop = this.add
      .rectangle(0, 0, 1280, 720, 0x0c0603, 0.45)
      .setInteractive();
    this.mathScrollContainer.add(backdrop);

    const cardW = 760;
    const cardH = 350;
    const scrollGfx = this.add.graphics();
    scrollGfx.fillStyle(0x090401, 0.72);
    scrollGfx.fillRoundedRect(-cardW / 2 + 6, -cardH / 2 + 8, cardW, cardH, 24);
    scrollGfx.fillStyle(0xfffbeb, 0.98);
    scrollGfx.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 22);
    scrollGfx.lineStyle(5, 0xe11d48, 1);
    scrollGfx.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 22);
    scrollGfx.lineStyle(2, 0xfbbf24, 0.95);
    scrollGfx.strokeRoundedRect(-cardW / 2 + 8, -cardH / 2 + 8, cardW - 16, cardH - 16, 16);

    const headerTxt = this.add
      .text(0, -cardH / 2 + 34, '★ SCORE MATH: POUR YOUR HOUSE GEMS ★', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '21px',
        fontStyle: 'bold',
        color: '#9f1239'
      })
      .setOrigin(0.5);

    this.mathScrollContainer.add([scrollGfx, headerTxt]);

    const eqY = -42;
    const pipDots: Phaser.GameObjects.Arc[] = [];

    this.createScrollNumberCard(-195, eqY, gemA, 'stb-gem-ruby', 0xe11d48, pipDots);

    const plusTxt = this.add
      .text(-85, eqY - 8, '+', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '46px',
        fontStyle: 'bold',
        color: '#9f1239'
      })
      .setOrigin(0.5);

    this.createScrollNumberCard(25, eqY, gemB, 'stb-gem-ruby', 0xf59e0b, pipDots);

    const eqTxt = this.add
      .text(130, eqY - 8, '=', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '46px',
        fontStyle: 'bold',
        color: '#9f1239'
      })
      .setOrigin(0.5);

    const ansBoxGfx = this.add.graphics();
    ansBoxGfx.fillStyle(0xffe4e6, 0.96);
    ansBoxGfx.fillRoundedRect(225 - 52, eqY - 58, 104, 104, 18);
    ansBoxGfx.lineStyle(3.5, 0xe11d48, 1);
    ansBoxGfx.strokeRoundedRect(225 - 52, eqY - 58, 104, 104, 18);

    const mysteryText = this.add
      .text(225, eqY - 6, '?', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '50px',
        fontStyle: 'bold',
        color: '#be123c'
      })
      .setOrigin(0.5);

    this.mathScrollContainer.add([plusTxt, eqTxt, ansBoxGfx, mysteryText]);

    const choices = this.buildThreeMathChoices(totalGemsEarned, 2, 14);
    const orbSpacing = 185;
    let solved = false;

    choices.forEach((choiceVal, idx) => {
      const ox = (idx - 1) * orbSpacing;
      const oy = 104;

      const orbBtn = this.add.container(ox, oy);
      const orbGlow = this.add
        .image(0, -4, 'hub-radial-glow')
        .setDisplaySize(135, 135)
        .setTint(0xf43f5e)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.35);

      const orbImg = this.add.image(0, 0, 'stb-orb-choice').setScale(0.76);
      const orbNum = this.add
        .text(0, -10, `${choiceVal}`, {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '36px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#451a03',
          strokeThickness: 6
        })
        .setOrigin(0.5);

      orbBtn.add([orbGlow, orbImg, orbNum]);
      this.mathScrollContainer.add(orbBtn);

      const hit = this.add
        .zone(0, 0, 118, 118)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      orbBtn.add(hit);

      hit.on('pointerdown', () => {
        if (solved) return;
        // Immediately speak ONLY the single clicked number
        this.audio.speakNumber(choiceVal);

        if (choiceVal === totalGemsEarned) {
          solved = true;
          mysteryText.setText(`${choiceVal}`).setColor('#be123c');
          this.audio.playMathChime();
          Juice.squashAndStretch(this, orbBtn, 0.24, 180);
          Juice.burstStars(this, 640 + ox, 385 + oy, 22, [0xf43f5e, 0xfef08a, 0xffffff]);

          this.time.delayedCall(850, () => {
            this.tweens.add({
              targets: this.mathScrollContainer,
              scaleX: 0.2,
              alpha: 0,
              duration: 220,
              onComplete: () => {
                this.mathScrollContainer.setVisible(false);
                this.pourGemsIntoHourglass('player', totalGemsEarned, () => {
                  if (allTilesShut) {
                    this.showRoundCelebration(true);
                  } else {
                    this.runProfessorSparkyTurn();
                  }
                });
              }
            });
          });
        } else {
          this.audio.playGentleTryAgain();
          this.tweens.add({
            targets: orbBtn,
            x: { from: ox - 7, to: ox + 7 },
            duration: 55,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
              orbBtn.x = ox;
            }
          });
          this.pulseCountingDotsHelper(pipDots);
        }
      });
    });

    this.tweens.add({
      targets: this.mathScrollContainer,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 290,
      ease: 'Back.easeOut'
    });
  }

  private pourGemsIntoHourglass(
    target: 'player' | 'sparky',
    gemCount: number,
    onComplete: () => void
  ): void {
    this.audio.playGemsPourGlass();
    const isPlayer = target === 'player';
    const destX = isPlayer ? 135 : 1135;
    const destY = isPlayer ? 465 : 480;
    const texKey = isPlayer ? 'stb-gem-ruby' : 'stb-gem-emerald';

    if (isPlayer) {
      this.doggieSprite.setTexture('stb-doggie-mage-cheer');
      Juice.squashAndStretch(this, this.doggieSprite, 0.18, 160);
    }

    const visualDrops = Math.min(10, Math.max(3, gemCount));
    for (let i = 0; i < visualDrops; i++) {
      this.time.delayedCall(i * 65, () => {
        const gem = this.add
          .image(640 + Phaser.Math.Between(-80, 80), 390, texKey)
          .setScale(0.42)
          .setDepth(95);

        this.tweens.add({
          targets: gem,
          x: destX + Phaser.Math.Between(-14, 14),
          y: destY + Phaser.Math.Between(-15, 25),
          scaleX: 0.24,
          scaleY: 0.24,
          angle: 360,
          duration: 460,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            gem.destroy();
            if (isPlayer) {
              Juice.squashAndStretch(this, this.playerHourglassSprite, 0.08, 90);
            } else {
              Juice.squashAndStretch(this, this.sparkyHourglassSprite, 0.08, 90);
            }
          }
        });
      });
    }

    if (isPlayer) {
      this.playerGems += gemCount;
    } else {
      this.sparkyGems += gemCount;
    }

    this.time.delayedCall(visualDrops * 65 + 420, () => {
      this.updateHourglassVisualFill();
      Juice.burstStars(this, destX, destY - 30, 16, [
        isPlayer ? 0xf43f5e : 0x10b981,
        0xfef08a,
        0xffffff
      ]);
      if (isPlayer && this.doggieSprite.active) {
        this.doggieSprite.setTexture('stb-doggie-mage-idle');
      }
      onComplete();
    });
  }

  /**
   * Professor Sparky's animated AI opponent turn on the Top Row (`1`-`10`):
   * Rolls the dice, picks matching top-row wooden tiles, clacks them shut,
   * and pours emerald gems into his House Hourglass!
   */
  private runProfessorSparkyTurn(): void {
    this.phase = 'SPARKY_TURN';
    this.feltBannerContainer.setVisible(true);
    this.feltBannerText.setText("PROFESSOR SPARKY'S TURN");
    this.feltSubBannerText.setText('Watch Sparky roll and flip his top-row tiles!');

    this.sparkySprite.setTexture('stb-prof-sparky-roll');
    Juice.squashAndStretch(this, this.sparkySprite, 0.18, 160);
    this.audio.speakPrompt('turn_sparky');

    const upSparky = this.sparkyTiles.filter((t) => t.isUp).map((t) => t.num);
    if (upSparky.length === 0) {
      this.finishSparkyTurnAndReturnToPlayer();
      return;
    }

    const roll = this.pickPlayableDiceRoll(upSparky, this.diceCount);
    const sSum = this.diceCount === 1 ? roll.d1 : roll.d1 + roll.d2;

    this.time.delayedCall(650, () => {
      this.audio.playDiceCupShake();
      this.audio.playDiceRollFelt();

      this.die1Sprite
        .setPosition(560, 340)
        .setTexture(`stb-die-face-${roll.d1}`)
        .setVisible(true);
      Juice.squashAndStretch(this, this.die1Sprite, 0.2, 150);

      if (this.diceCount === 2) {
        this.die2Sprite
          .setPosition(700, 340)
          .setTexture(`stb-die-face-${roll.d2}`)
          .setVisible(true);
        Juice.squashAndStretch(this, this.die2Sprite, 0.2, 150);
        this.feltBannerText.setText(`SPARKY ROLLED ${roll.d1} + ${roll.d2} = ${sSum}`);
      } else {
        this.die2Sprite.setVisible(false);
        this.feltBannerText.setText(`SPARKY ROLLED ${sSum}`);
      }

      // Find a valid tile or pair in Sparky's top row
      const chosenTiles = this.pickSparkyTileMove(upSparky, sSum);

      this.time.delayedCall(850, () => {
        if (chosenTiles.length > 0) {
          this.feltSubBannerText.setText(
            `Professor Sparky flips tile${chosenTiles.length > 1 ? 's' : ''} ${chosenTiles.join(' + ')}!`
          );
          chosenTiles.forEach((num, idx) => {
            const tile = this.sparkyTiles.find((t) => t.num === num);
            if (tile) {
              this.time.delayedCall(idx * 170, () => {
                this.animateWoodenTileClackShut(tile, false);
              });
            }
          });

          this.sparkySprite.setTexture('stb-prof-sparky-cheer');
          this.time.delayedCall(650, () => {
            this.pourGemsIntoHourglass('sparky', sSum, () => {
              this.finishSparkyTurnAndReturnToPlayer();
            });
          });
        } else {
          this.feltSubBannerText.setText('No matching top tiles for Sparky this turn!');
          this.time.delayedCall(900, () => {
            this.finishSparkyTurnAndReturnToPlayer();
          });
        }
      });
    });
  }

  private pickSparkyTileMove(upNums: number[], targetSum: number): number[] {
    if (upNums.includes(targetSum)) {
      return [targetSum];
    }
    for (let i = 0; i < upNums.length; i++) {
      for (let j = i + 1; j < upNums.length; j++) {
        if (upNums[i] + upNums[j] === targetSum) {
          return [upNums[i], upNums[j]];
        }
      }
    }
    return [];
  }

  private finishSparkyTurnAndReturnToPlayer(): void {
    this.sparkySprite.setTexture('stb-prof-sparky-idle');

    const remainingPlayerTiles = this.playerTiles.filter((t) => t.isUp);
    if (remainingPlayerTiles.length === 0) {
      this.showRoundCelebration(true);
      return;
    }

    this.phase = 'READY_TO_ROLL';
    const kidName = ArcadeState.getActiveKid().name.toUpperCase();
    this.feltBannerContainer.setVisible(true);
    this.feltBannerText.setText(`${kidName}'S TURN — TAP DICE CUP`);
    this.feltSubBannerText.setText('Tap the leather dice cup or green felt to roll!');

    const promptId = ArcadeState.getActiveKid().id === 'emma' ? 'turn_emma' : 'turn_wyatt';
    this.audio.speakPrompt(promptId);
  }

  // ===========================================================================
  // 8. DOGGIE FRIENDLY HINT & GRAND HOUSE CUP CELEBRATION
  // ===========================================================================

  private provideFriendlyHint(): void {
    if (this.phase === 'READY_TO_ROLL') {
      this.audio.speakPrompt('prompt_roll');
      Juice.squashAndStretch(this, this.diceCupSprite, 0.22, 160);
    } else if (this.phase === 'DICE_MATH_SCROLL') {
      this.audio.speakNumber(this.currentDiceSum);
    } else if (this.phase === 'FLIP_TILES' && this.validTileSubsets.length > 0) {
      const hintSubset = this.validTileSubsets[0];
      hintSubset.forEach((n) => {
        const tile = this.playerTiles.find((t) => t.num === n);
        if (tile) {
          Juice.squashAndStretch(this, tile.container, 0.22, 180);
          Juice.burstStars(this, tile.baseX, tile.baseY - 12, 10, [0xfef08a, 0xfbbf24]);
        }
      });
      this.audio.speakNumber(hintSubset[0]);
    }
  }

  private showRoundCelebration(shutEntireBox: boolean): void {
    this.phase = 'ROUND_CELEBRATION';
    this.celebrationContainer.removeAll(true);
    this.celebrationContainer.setVisible(true);
    this.celebrationContainer.setScale(0.3).setAlpha(0);

    ArcadeState.addStars(3);
    this.audio.playHouseFanfare();
    this.sparkySprite.setTexture('stb-prof-sparky-cheer');
    this.doggieSprite.setTexture('stb-doggie-mage-cheer');

    if (shutEntireBox) {
      this.audio.speakPrompt('praise_shut_box');
    } else {
      const winClip =
        ArcadeState.getActiveKid().id === 'emma' ? 'praise_emma_win' : 'praise_wyatt_win';
      this.audio.speakPrompt(winClip);
    }

    const backdrop = this.add
      .rectangle(0, 0, 1280, 720, 0x090401, 0.62)
      .setInteractive();
    this.celebrationContainer.add(backdrop);

    const cardGfx = this.add.graphics();
    cardGfx.fillStyle(0x231208, 0.98);
    cardGfx.fillRoundedRect(-340, -210, 680, 420, 26);
    cardGfx.lineStyle(5, 0xfbbf24, 1);
    cardGfx.strokeRoundedRect(-340, -210, 680, 420, 26);

    const trophy = this.add.image(0, -78, 'stb-prop-wizard-trophy').setScale(0.76);
    const title = this.add
      .text(0, 46, shutEntireBox ? '★ YOU SHUT THE BOX OF TEN! ★' : '★ GREAT HALL HOUSE CUP! ★', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#1c0d06',
        strokeThickness: 5
      })
      .setOrigin(0.5);

    const sub = this.add
      .text(
        0,
        86,
        `${ArcadeState.getActiveKid().name}: ${this.playerGems} Ruby Gems  •  Professor Sparky: ${this.sparkyGems} Emerald Gems`,
        {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#fde68a'
        }
      )
      .setOrigin(0.5);

    const playAgainBtn = this.add.container(0, 150);
    const paGfx = this.add.graphics();
    paGfx.fillStyle(0x15803d, 1);
    paGfx.fillRoundedRect(-140, -32, 280, 64, 18);
    paGfx.lineStyle(3, 0xfef08a, 1);
    paGfx.strokeRoundedRect(-140, -32, 280, 64, 18);
    const paTxt = this.add
      .text(0, 0, '★ PLAY AGAIN ★', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffffff'
      })
      .setOrigin(0.5);
    playAgainBtn.add([paGfx, paTxt]);

    const paHit = this.add
      .zone(0, 0, 280, 68)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    playAgainBtn.add(paHit);

    paHit.on('pointerdown', () => {
      Juice.squashAndStretch(this, playAgainBtn, 0.2, 140);
      this.resetFullGame();
    });

    this.celebrationContainer.add([cardGfx, trophy, title, sub, playAgainBtn]);

    this.tweens.add({
      targets: this.celebrationContainer,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 380,
      ease: 'Back.easeOut'
    });

    Juice.burstStars(this, 640, 280, 32, [0xfef08a, 0xfbbf24, 0xf43f5e, 0x34d399, 0xffffff]);
  }

  private resetFullGame(): void {
    this.audio.stopVoice();
    this.mathScrollContainer.setVisible(false);
    this.celebrationContainer.setVisible(false);

    this.playerGems = 0;
    this.sparkyGems = 0;
    this.turnCount = 0;
    this.selectedPlayerTiles = [];
    this.updateHourglassVisualFill();

    [...this.playerTiles, ...this.sparkyTiles].forEach((tile, idx) => {
      tile.isUp = true;
      tile.isSelected = false;
      tile.isValidCandidate = false;
      this.tweens.killTweensOf(tile.container);
      tile.container.setPosition(tile.baseX, tile.baseY).setScale(1);
      tile.bgSprite.setTexture('stb-tile-wood-up').clearTint();
      tile.numText.setVisible(true);
      tile.pipsGraphics.setVisible(true);
      this.time.delayedCall(idx * 20, () => {
        Juice.squashAndStretch(this, tile.container, 0.12, 110);
      });
    });

    this.sparkySprite.setTexture('stb-prof-sparky-idle');
    this.doggieSprite.setTexture('stb-doggie-mage-idle');
    this.die1Sprite.setVisible(false);
    this.die2Sprite.setVisible(false);

    this.phase = 'READY_TO_ROLL';
    this.feltBannerContainer.setVisible(true);
    this.feltBannerText.setText('TAP DICE CUP TO ROLL');
    this.feltSubBannerText.setText('Roll on the Great Hall green felt');
    this.audio.speakPrompt('prompt_roll');
  }
}
