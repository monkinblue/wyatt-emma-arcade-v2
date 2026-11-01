/**
 * HubScene.ts
 * -----------
 * Full-Screen (1280x720) 32-Bit Pixel Art Heirloom Bookshelf Main Menu!
 *
 * Features:
 * 1. Full-Screen Wooden Bookcase (`bookshelf-bg.jpg` across 1280x720) with an unobtrusive
 *    antique brass speaker/mute toggle button in the top-right corner (`x: 1245, y: 32`).
 * 2. Upper-Shelf Interactive Mode Objects (`y: 176`) + Engraved Brass Nameplates (`y: 186`):
 *    - Left (`x: 255`): `'mode-read'` (Open Castle Pop-Up Book) -> `READ & EXPLORE`
 *    - Center (`x: 640`): `'mode-arcade'` (Wood & Brass Mini Arcade Cabinet) -> `PLAY ARCADE`
 *    - Right (`x: 1025`): `'mode-create'` (Tabletop Wooden Easel & Palette) -> `CREATE`
 * 3. Lower-Shelf Companion Persona Hotspots + Brass Nameplates (`y: 668`):
 *    - Bottom-Left (`x: 165, y: 575`): Sleeping Sparky -> `★ WYATT & SPARKY ★` (`x: 165, y: 668`)
 *    - Bottom-Right (`x: 1115, y: 575`): Doggie & Firefly Jar -> `★ EMMA & DOGGIE ★` (`x: 1125, y: 668`)
 * 4. Center Lower Oak Shelf (`x: 310..970, y: 240..636`):
 *    - `Read & Explore`: 3 Standing Heirloom Leather Books (`book-nana` at `x: 420`,
 *      `book-grandpa-bapci` at `x: 640`, `book-louisiana` at `x: 860`, `y: 636`) with brass plaques at `y: 668`.
 *    - `Play Arcade` / `Create`: 3 Warm Parchment & Walnut Cards nestled inside the center shelf cavity.
 */

import Phaser from 'phaser';
import { ArcadeState, HubTabId, KidId } from '../core/ArcadeState';
import { AudioBus, SfxName } from '../core/AudioBus';
import { Juice } from '../core/Juice';

interface ShelfActivityCardConfig {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  badgeText: string;
  accentColor: number;
  previewSfx: SfxName;
}

const SHELF_ACTIVITY_CARDS: Record<'play' | 'create', ShelfActivityCardConfig[]> = {
  play: [
    {
      id: 'bubble-pop',
      title: "Sparky's Bubble Pop!",
      subtitle: 'Pop floating rainbow dragon bubbles!',
      emoji: '🫧',
      badgeText: 'ARCADE MINI-GAME',
      accentColor: 0x34d399,
      previewSfx: 'sparky'
    },
    {
      id: 'doggie-catch',
      title: "Doggie's Treat Bounce",
      subtitle: 'Boing across clouds to catch crunchy bones!',
      emoji: '🦴',
      badgeText: 'ARCADE MINI-GAME',
      accentColor: 0xf472b6,
      previewSfx: 'doggie'
    },
    {
      id: 'cloud-racer',
      title: 'Zoomy Cloud Kart',
      subtitle: 'Honk the horn and zoom over rainbow hills!',
      emoji: '🏎️',
      badgeText: 'ARCADE MINI-GAME',
      accentColor: 0xfacc15,
      previewSfx: 'horn'
    }
  ],
  create: [
    {
      id: 'sticker-scene',
      title: 'Living Sticker Theater',
      subtitle: 'Stamp animated dragons, puppies & silly hats!',
      emoji: '🌟',
      badgeText: 'CREATE STUDIO',
      accentColor: 0xfde047,
      previewSfx: 'chime'
    },
    {
      id: 'critter-band',
      title: 'Silly Critter Band',
      subtitle: 'Tap frogs, owls & bongo mushrooms to make music!',
      emoji: '🥁',
      badgeText: 'CREATE STUDIO',
      accentColor: 0xfbbf24,
      previewSfx: 'fanfare'
    },
    {
      id: 'rainbow-paint',
      title: 'Magic Finger Paint',
      subtitle: 'Splash glowing neon colors & glitter trails!',
      emoji: '🎨',
      badgeText: 'CREATE STUDIO',
      accentColor: 0x38bdf8,
      previewSfx: 'pop'
    }
  ]
};

export class HubScene extends Phaser.Scene {
  private upperShelfContainer!: Phaser.GameObjects.Container;
  private personaContainer!: Phaser.GameObjects.Container;
  private lowerShelfContentContainer!: Phaser.GameObjects.Container;
  private shelfSparkySprite!: Phaser.GameObjects.Image;
  private isLaunchingBook: boolean = false;

  constructor() {
    super({ key: 'HubScene' });
  }

  public create(): void {
    this.isLaunchingBook = false;

    this.ensureRadialGlowTexture();
    this.createFullScreenBookshelf();
    this.createAntiqueBrassMuteButton();

    this.upperShelfContainer = this.add.container(0, 0).setDepth(20);
    this.personaContainer = this.add.container(0, 0).setDepth(25);
    this.lowerShelfContentContainer = this.add.container(0, 0).setDepth(30);

    this.renderUpperShelfModes();
    this.renderPersonaCompanions();
    this.renderLowerShelfContent();

    this.cameras.main.fadeIn(260, 12, 8, 6);
  }

  /**
   * Generates a soft radial spotlight texture (`hub-radial-glow`) once for warm golden mode
   * spotlights and companion persona highlights.
   */
  private ensureRadialGlowTexture(): void {
    if (this.textures.exists('hub-radial-glow')) return;
    const canvasTex = this.textures.createCanvas('hub-radial-glow', 256, 256);
    if (!canvasTex) return;
    const ctx = canvasTex.getContext();
    const grad = ctx.createRadialGradient(128, 128, 6, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255, 230, 140, 1.0)');
    grad.addColorStop(0.45, 'rgba(251, 191, 36, 0.55)');
    grad.addColorStop(1, 'rgba(251, 191, 36, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    canvasTex.refresh();
  }

  /**
   * Renders `'bookshelf-bg'` full-screen across the entire `1280x720` canvas (`x: 640, y: 360`,
   * `displayWidth: 1280, displayHeight: 720`), plus the breathing sleeping Sparky overlay on the
   * bottom-left and continuous ambient fireflies over Doggie's jar on the bottom-right.
   */
  private createFullScreenBookshelf(): void {
    if (this.textures.exists('bookshelf-bg')) {
      this.textures.get('bookshelf-bg').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.add
        .image(640, 360, 'bookshelf-bg')
        .setOrigin(0.5, 0.5)
        .setDisplaySize(1280, 720)
        .setDepth(1);
    } else {
      const fallbackBg = this.add.graphics().setDepth(1);
      fallbackBg.fillStyle(0x271206, 1);
      fallbackBg.fillRect(0, 0, 1280, 720);
    }

    // Mount breathing `shelf-sparky` aligned 1:1 over sleeping Sparky on the full-screen 1280x720 shelf
    const scaleX = 1280 / 1024; // 1.25
    const scaleY = 720 / 572;   // 1.2587412587
    if (this.textures.exists('shelf-sparky')) {
      this.textures.get('shelf-sparky').setFilter(Phaser.Textures.FilterMode.NEAREST);
      const sparkyStageX = (50 + 78) * scaleX; // 160
      const sparkyStageBottomY = (390 + 125) * scaleY; // 648.25
      this.shelfSparkySprite = this.add
        .image(sparkyStageX, sparkyStageBottomY, 'shelf-sparky')
        .setOrigin(0.5, 1.0)
        .setScale(scaleX, scaleY)
        .setDepth(5);

      this.tweens.add({
        targets: this.shelfSparkySprite,
        scaleY: { from: scaleY, to: scaleY * 1.035 },
        scaleX: { from: scaleX, to: scaleX * 1.012 },
        duration: 2400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    // Continuous ambient firefly twinkles over Doggie's mason jar on the right (x: ~1064, y: ~565)
    const jarCenterX = 851 * scaleX; // 1063.75
    const jarCenterY = 448 * scaleY; // 563.9
    const fireflyColors = [0xfef08a, 0xfde047, 0xfbbf24, 0xffffff];
    for (let i = 0; i < 14; i++) {
      const fx = jarCenterX + Phaser.Math.Between(-42, 52);
      const fy = jarCenterY + Phaser.Math.Between(-85, 42);
      const baseScale = Phaser.Math.FloatBetween(0.16, 0.34);
      const firefly = this.add
        .image(fx, fy, 'particle-star')
        .setTint(fireflyColors[i % fireflyColors.length])
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(baseScale)
        .setAlpha(Phaser.Math.FloatBetween(0.25, 0.85))
        .setDepth(6);

      this.tweens.add({
        targets: firefly,
        x: fx + Phaser.Math.Between(-18, 18),
        y: fy - Phaser.Math.Between(14, 34),
        alpha: { from: 0.18, to: 0.92 },
        scaleX: { from: baseScale * 0.7, to: baseScale * 1.3 },
        scaleY: { from: baseScale * 0.7, to: baseScale * 1.3 },
        duration: Phaser.Math.Between(1400, 2600),
        delay: i * 130,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  /**
   * Tucks a tiny, unobtrusive antique brass speaker/mute toggle button into the top-right corner
   * (`x: 1245, y: 32`, `alpha: 0.75`).
   */
  private createAntiqueBrassMuteButton(): void {
    const muteBtn = this.add.container(1245, 32).setAlpha(0.75).setDepth(100);
    const muteBg = this.add.graphics();
    muteBg.fillStyle(0x27160c, 0.92);
    muteBg.fillCircle(0, 0, 20);
    muteBg.lineStyle(2, 0xd97706, 0.9);
    muteBg.strokeCircle(0, 0, 20);
    muteBg.lineStyle(1, 0xfef08a, 0.55);
    muteBg.strokeCircle(0, 0, 17);

    const muteLabel = this.add
      .text(0, 0, AudioBus.getMuted() ? '🔇' : '🔊', {
        fontSize: '18px'
      })
      .setOrigin(0.5);

    muteBtn.add([muteBg, muteLabel]);
    Juice.makeTactileButton(
      this,
      muteBtn,
      64,
      64,
      () => {
        const muted = AudioBus.toggleMute();
        muteLabel.setText(muted ? '🔇' : '🔊');
      },
      'pop'
    );
  }

  /**
   * STEP 3: Renders the 3 Upper-Shelf Mode Objects (`Read & Explore`, `Play Arcade`, `Create`)
   * resting on the upper oak ledge (`y: 176`) + Engraved Brass Nameplates on the upper shelf lip (`y: 186`).
   */
  private renderUpperShelfModes(): void {
    this.upperShelfContainer.removeAll(true);

    const activeTab = ArcadeState.getActiveTab();
    const upperShelfY = 176;
    const plaqueY = 186;

    const modeSpecs: Array<{
      id: HubTabId;
      texKey: string;
      label: string;
      x: number;
      baseScale: number;
    }> = [
      {
        id: 'read',
        texKey: 'mode-read',
        label: 'READ & EXPLORE',
        x: 255,
        baseScale: 0.305
      },
      {
        id: 'play',
        texKey: 'mode-arcade',
        label: 'PLAY ARCADE',
        x: 640,
        baseScale: 0.295
      },
      {
        id: 'create',
        texKey: 'mode-create',
        label: 'CREATE',
        x: 1025,
        baseScale: 0.31
      }
    ];

    modeSpecs.forEach((spec) => {
      const isSelected = spec.id === activeTab;
      const targetScale = isSelected ? spec.baseScale * 1.05 : spec.baseScale * 0.96;

      // Soft warm golden radial spotlight behind the currently selected mode object
      if (isSelected) {
        const spotlight = this.add
          .image(spec.x, upperShelfY - 76, 'hub-radial-glow')
          .setOrigin(0.5, 0.5)
          .setDisplaySize(260, 210)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.38);
        this.upperShelfContainer.add(spotlight);

        this.tweens.add({
          targets: spotlight,
          alpha: { from: 0.28, to: 0.46 },
          scaleX: { from: spotlight.scaleX * 0.95, to: spotlight.scaleX * 1.05 },
          scaleY: { from: spotlight.scaleY * 0.95, to: spotlight.scaleY * 1.05 },
          duration: 1800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }

      // Drop shadow on the upper oak ledge
      const ledgeShadow = this.add.graphics();
      ledgeShadow.fillStyle(0x0c0502, isSelected ? 0.52 : 0.35);
      ledgeShadow.fillEllipse(spec.x, upperShelfY - 3, 118, 14);
      this.upperShelfContainer.add(ledgeShadow);

      // Mode Object Sprite (`origin: (0.5, 1.0)` bottom-center at `y: 176`)
      if (this.textures.exists(spec.texKey)) {
        this.textures.get(spec.texKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      const modeSprite = this.add
        .image(spec.x, upperShelfY, spec.texKey)
        .setOrigin(0.5, 1.0)
        .setScale(targetScale);

      if (isSelected) {
        modeSprite.clearTint();
        modeSprite.setAlpha(1.0);
      } else {
        modeSprite.setTint(0x998f85);
        modeSprite.setAlpha(0.78);
      }
      this.upperShelfContainer.add(modeSprite);

      // Engraved Antique Brass & Dark-Walnut Nameplate on the Upper Shelf Lip (`y: 186`)
      const plaqueW = 172;
      const plaqueH = 26;
      const plaqueContainer = this.add.container(spec.x, plaqueY);
      const plaqueG = this.add.graphics();

      // Drop shadow on wood lip
      plaqueG.fillStyle(0x090401, 0.58);
      plaqueG.fillRoundedRect(-plaqueW / 2 + 2, -plaqueH / 2 + 2, plaqueW, plaqueH, 6);

      if (isSelected) {
        plaqueG.fillStyle(0x3b1d0a, 0.96);
        plaqueG.fillRoundedRect(-plaqueW / 2, -plaqueH / 2, plaqueW, plaqueH, 6);
        plaqueG.lineStyle(2.5, 0xfbbf24, 1);
        plaqueG.strokeRoundedRect(-plaqueW / 2, -plaqueH / 2, plaqueW, plaqueH, 6);
        plaqueG.lineStyle(1, 0xfef08a, 0.85);
        plaqueG.strokeRoundedRect(-plaqueW / 2 + 3, -plaqueH / 2 + 3, plaqueW - 6, plaqueH - 6, 4);
      } else {
        plaqueG.fillStyle(0x23140b, 0.9);
        plaqueG.fillRoundedRect(-plaqueW / 2, -plaqueH / 2, plaqueW, plaqueH, 6);
        plaqueG.lineStyle(1.5, 0x85582a, 0.78);
        plaqueG.strokeRoundedRect(-plaqueW / 2, -plaqueH / 2, plaqueW, plaqueH, 6);
      }

      // Corner brass rivets
      plaqueG.fillStyle(isSelected ? 0xfbbf24 : 0x78522b, 0.9);
      plaqueG.fillCircle(-plaqueW / 2 + 6, 0, 2);
      plaqueG.fillCircle(plaqueW / 2 - 6, 0, 2);

      const plaqueText = this.add
        .text(0, 0, spec.label, {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: isSelected ? '#fef08a' : '#cbb89d'
        })
        .setOrigin(0.5);

      plaqueContainer.add([plaqueG, plaqueText]);
      this.upperShelfContainer.add(plaqueContainer);

      // Interactive Hit Zone covering both the mode object and its brass nameplate
      const hitZone = this.add
        .zone(spec.x, 108, 190, 185)
        .setOrigin(0.5, 0.5)
        .setInteractive({ useHandCursor: true });
      this.upperShelfContainer.add(hitZone);

      hitZone.on('pointerdown', () => {
        if (this.isLaunchingBook) return;
        AudioBus.playSfx('tab');

        // Gentle tactile bounce
        this.tweens.add({
          targets: modeSprite,
          scaleX: spec.baseScale * 1.12,
          scaleY: spec.baseScale * 0.94,
          duration: 90,
          yoyo: true,
          ease: 'Quad.easeOut',
          onComplete: () => {
            if (ArcadeState.getActiveTab() !== spec.id) {
              ArcadeState.setActiveTab(spec.id);
              this.renderUpperShelfModes();
              this.renderLowerShelfContent();
            } else {
              modeSprite.setScale(spec.baseScale * 1.05);
            }
          }
        });
        Juice.squashAndStretch(this, plaqueContainer, 0.16, 120);
        Juice.burstStars(this, spec.x, upperShelfY - 65, 10, [0xfef08a, 0xfbbf24, 0xffffff]);
      });
    });
  }

  /**
   * STEP 4: Persona Selection via Sparky (Bottom-Left) & Doggie + Firefly Jar (Bottom-Right)
   * on the main lower oak shelf, with ornate brass nameplates on the front wooden shelf lip (`y: 668`).
   */
  private renderPersonaCompanions(): void {
    this.personaContainer.removeAll(true);

    const activeKid = ArcadeState.getActiveKid();
    const isWyatt = activeKid.id === 'wyatt';
    const isEmma = activeKid.id === 'emma';

    // 1. Active Persona Magical Glow & Floating Sparkles
    if (isWyatt) {
      const sparkyGlow = this.add
        .image(165, 580, 'hub-radial-glow')
        .setOrigin(0.5, 0.5)
        .setDisplaySize(250, 195)
        .setTint(0x34d399)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.32);
      this.personaContainer.add(sparkyGlow);

      this.tweens.add({
        targets: sparkyGlow,
        alpha: { from: 0.22, to: 0.44 },
        duration: 1600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      const sparkyPts = [
        { x: 112, y: 525 },
        { x: 165, y: 505 },
        { x: 215, y: 535 },
        { x: 140, y: 555 }
      ];
      sparkyPts.forEach((pt, idx) => {
        const sp = this.add
          .image(pt.x, pt.y, 'particle-star')
          .setTint(idx % 2 === 0 ? 0xfef08a : 0x34d399)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(0.24)
          .setAlpha(0.3);
        this.personaContainer.add(sp);

        this.tweens.add({
          targets: sp,
          y: pt.y - 14,
          alpha: { from: 0.2, to: 0.85 },
          scaleX: { from: 0.18, to: 0.42 },
          scaleY: { from: 0.18, to: 0.42 },
          duration: 1300 + idx * 210,
          delay: idx * 180,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      });
    }

    if (isEmma) {
      const doggieGlow = this.add
        .image(1115, 575, 'hub-radial-glow')
        .setOrigin(0.5, 0.5)
        .setDisplaySize(260, 210)
        .setTint(0xfde047)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.36);
      this.personaContainer.add(doggieGlow);

      this.tweens.add({
        targets: doggieGlow,
        alpha: { from: 0.24, to: 0.48 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      const doggiePts = [
        { x: 1055, y: 515 },
        { x: 1115, y: 495 },
        { x: 1168, y: 525 },
        { x: 1085, y: 545 }
      ];
      doggiePts.forEach((pt, idx) => {
        const sp = this.add
          .image(pt.x, pt.y, 'particle-star')
          .setTint(idx % 2 === 0 ? 0xfef08a : 0xfbbf24)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(0.28)
          .setAlpha(0.4);
        this.personaContainer.add(sp);

        this.tweens.add({
          targets: sp,
          y: pt.y - 16,
          alpha: { from: 0.25, to: 0.95 },
          scaleX: { from: 0.2, to: 0.46 },
          scaleY: { from: 0.2, to: 0.46 },
          duration: 1200 + idx * 190,
          delay: idx * 160,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      });
    }

    // 2. Ornate Brass Nameplate Below Sparky (`x: 165, y: 668`): `★ WYATT & SPARKY ★`
    const wyattPlaque = this.createPersonaBrassPlaque(165, 668, '★ WYATT & SPARKY ★', isWyatt);
    this.personaContainer.add(wyattPlaque);

    // 3. Ornate Brass Nameplate Below Doggie (`x: 1125, y: 668`): `★ EMMA & DOGGIE ★`
    const emmaPlaque = this.createPersonaBrassPlaque(1125, 668, '★ EMMA & DOGGIE ★', isEmma);
    this.personaContainer.add(emmaPlaque);

    // 4. Interactive Persona Hotspots for Sparky (x: 165, y: 575, w: 190, h: 150) + Plaque
    const sparkyZone = this.add
      .zone(165, 595, 195, 190)
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });
    this.personaContainer.add(sparkyZone);

    sparkyZone.on('pointerdown', () => {
      if (this.isLaunchingBook) return;
      this.selectPersona('wyatt', 165, 575, wyattPlaque);
    });

    // 5. Interactive Persona Hotspot for Doggie + Firefly Jar (x: 1115, y: 575, w: 195, h: 160) + Plaque
    const doggieZone = this.add
      .zone(1118, 595, 200, 195)
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });
    this.personaContainer.add(doggieZone);

    doggieZone.on('pointerdown', () => {
      if (this.isLaunchingBook) return;
      this.selectPersona('emma', 1115, 575, emmaPlaque);
    });
  }

  private createPersonaBrassPlaque(
    x: number,
    y: number,
    text: string,
    isActive: boolean
  ): Phaser.GameObjects.Container {
    const w = 186;
    const h = 34;
    const container = this.add.container(x, y);
    const g = this.add.graphics();

    // Drop shadow on wood lip
    g.fillStyle(0x090401, 0.58);
    g.fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w, h, 7);

    if (isActive) {
      // Highlighted bright gold & rich amber brass plaque
      g.fillStyle(0x451a03, 0.96);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 7);
      g.lineStyle(2.5, 0xfde047, 1);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 7);
      g.lineStyle(1, 0xfef08a, 0.9);
      g.strokeRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 5);
    } else {
      // Muted antique bronze plaque
      g.fillStyle(0x23140b, 0.88);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 7);
      g.lineStyle(1.5, 0x78522b, 0.72);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 7);
    }

    // Corner brass rivets
    g.fillStyle(isActive ? 0xfde047 : 0x78522b, 0.9);
    g.fillCircle(-w / 2 + 6, 0, 2);
    g.fillCircle(w / 2 - 6, 0, 2);

    const label = this.add
      .text(0, 0, text, {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: isActive ? '#fef08a' : '#b89f82'
      })
      .setOrigin(0.5);

    container.add([g, label]);
    return container;
  }

  private selectPersona(
    kidId: KidId,
    fxX: number,
    fxY: number,
    plaque: Phaser.GameObjects.Container
  ): void {
    ArcadeState.setActiveKid(kidId);
    AudioBus.playSfx(kidId === 'wyatt' ? 'sparky' : 'doggie');

    // Celebratory pulse glow
    const pulse = this.add
      .image(fxX, fxY, 'hub-radial-glow')
      .setOrigin(0.5, 0.5)
      .setDisplaySize(90, 90)
      .setTint(kidId === 'wyatt' ? 0x34d399 : 0xfde047)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.85)
      .setDepth(45);

    this.tweens.add({
      targets: pulse,
      displayWidth: 310,
      displayHeight: 260,
      alpha: 0,
      duration: 520,
      ease: 'Cubic.easeOut',
      onComplete: () => pulse.destroy()
    });

    if (kidId === 'wyatt' && this.shelfSparkySprite) {
      const baseScaleX = 1280 / 1024;
      const baseScaleY = 720 / 572;
      this.tweens.add({
        targets: this.shelfSparkySprite,
        scaleX: baseScaleX * 1.08,
        scaleY: baseScaleY * 1.1,
        duration: 140,
        yoyo: true,
        ease: 'Quad.easeOut'
      });
    }

    Juice.squashAndStretch(this, plaque, 0.2, 140);
    Juice.burstStars(
      this,
      fxX,
      fxY - 20,
      16,
      kidId === 'wyatt' ? [0x34d399, 0xfde047, 0xffffff] : [0xfde047, 0xfbbf24, 0xffffff]
    );

    this.renderPersonaCompanions();
  }

  /**
   * STEP 5: Renders the Main Lower Shelf Content (`y: ~636` between Sparky and Doggie):
   * - In `Read & Explore` mode: stands the 3 heirloom leather books (`book-nana` at `x: 420`,
   *   `book-grandpa-bapci` at `x: 640`, `book-louisiana` at `x: 860`, resting at `y: 636` with
   *   brass title plaques on the front shelf lip at `y: 668`).
   * - In `Play Arcade` and `Create` modes: displays the 3 selection cards neatly inside the
   *   center oak shelf cavity (`x: 310..970, y: 240..625`) styled with warm parchment/wood borders.
   */
  private renderLowerShelfContent(): void {
    this.lowerShelfContentContainer.removeAll(true);

    const activeTab = ArcadeState.getActiveTab();
    if (activeTab === 'read') {
      this.renderReadBooksOnShelf();
    } else {
      this.renderShelfActivityCards(activeTab);
    }
  }

  private renderReadBooksOnShelf(): void {
    const shelfY = 636;
    const plaqueY = 668;
    const baseBookScale = 0.64;

    const bookSpecs: Array<{
      id: string;
      texKey: string;
      x: number;
      title: string;
      subtitle: string;
      unlocked: boolean;
      cartridgeId?: string;
    }> = [
      {
        id: 'book-nana',
        texKey: 'book-nana',
        x: 420,
        title: "To Nana and Papa's House We Go!",
        subtitle: 'A Michigan Adventure',
        unlocked: true,
        cartridgeId: 'just-nana-and-us'
      },
      {
        id: 'book-grandpa-bapci',
        texKey: 'book-grandpa-bapci',
        x: 640,
        title: "Grandpa & Bapci's House",
        subtitle: 'Coming Soon',
        unlocked: false
      },
      {
        id: 'book-louisiana',
        texKey: 'book-louisiana',
        x: 860,
        title: 'Remembering Louisiana',
        subtitle: 'Coming Soon',
        unlocked: false
      }
    ];

    bookSpecs.forEach((spec) => {
      // Soft dark-wood drop shadow ellipse underneath the base of each book
      const shadow = this.add.graphics();
      shadow.fillStyle(0x0c0502, spec.unlocked ? 0.54 : 0.38);
      shadow.fillEllipse(spec.x, shelfY - 4, 188, 24);
      shadow.fillStyle(0x050201, spec.unlocked ? 0.36 : 0.24);
      shadow.fillEllipse(spec.x, shelfY - 2, 140, 14);
      this.lowerShelfContentContainer.add(shadow);

      // Standing Book Sprite (`origin: (0.5, 1.0)` at `y: 636`)
      if (this.textures.exists(spec.texKey)) {
        this.textures.get(spec.texKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      const bookSprite = this.add
        .image(spec.x, shelfY, spec.texKey)
        .setOrigin(0.5, 1.0)
        .setScale(baseBookScale);

      if (!spec.unlocked) {
        bookSprite.setTint(0x6e6a75);
        bookSprite.setAlpha(0.68);
      }
      this.lowerShelfContentContainer.add(bookSprite);

      // Gentle warm golden idle shimmer around the cover emblem on Book 1 (`book-nana`)
      if (spec.unlocked) {
        const shimmerAnchors = [
          { dx: -16, dy: -215 },
          { dx: 32, dy: -188 },
          { dx: -8, dy: -140 },
          { dx: 26, dy: -102 },
          { dx: -28, dy: -82 }
        ];
        shimmerAnchors.forEach((pt, sIdx) => {
          const glint = this.add
            .image(spec.x + pt.dx, shelfY + pt.dy, 'particle-star')
            .setTint(sIdx % 2 === 0 ? 0xfef08a : 0xfbbf24)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setScale(0.18)
            .setAlpha(0.15);
          this.lowerShelfContentContainer.add(glint);

          this.tweens.add({
            targets: glint,
            alpha: { from: 0.1, to: 0.78 },
            scaleX: { from: 0.14, to: 0.4 },
            scaleY: { from: 0.14, to: 0.4 },
            angle: { from: 0, to: 90 },
            duration: 1350 + sIdx * 180,
            delay: sIdx * 260,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        });
      }

      // Ornate Brass/Parchment Nameplate on the front wooden shelf lip (`y: 668`)
      const plateW = 204;
      const plateH = 40;
      const nameplate = this.add.container(spec.x, plaqueY);
      const plateG = this.add.graphics();

      // Drop shadow on wood lip
      plateG.fillStyle(0x090401, 0.58);
      plateG.fillRoundedRect(-plateW / 2 + 2, -plateH / 2 + 2, plateW, plateH, 7);

      if (spec.unlocked) {
        plateG.fillStyle(0xfdf8ec, 0.97);
        plateG.fillRoundedRect(-plateW / 2, -plateH / 2, plateW, plateH, 7);
        plateG.lineStyle(2.5, 0xd97706, 1);
        plateG.strokeRoundedRect(-plateW / 2, -plateH / 2, plateW, plateH, 7);
        plateG.lineStyle(1, 0xfbbf24, 0.85);
        plateG.strokeRoundedRect(-plateW / 2 + 3, -plateH / 2 + 3, plateW - 6, plateH - 6, 5);
      } else {
        plateG.fillStyle(0x27232a, 0.92);
        plateG.fillRoundedRect(-plateW / 2, -plateH / 2, plateW, plateH, 7);
        plateG.lineStyle(1.8, 0x78716c, 0.85);
        plateG.strokeRoundedRect(-plateW / 2, -plateH / 2, plateW, plateH, 7);
      }

      const rivetColor = spec.unlocked ? 0xb45309 : 0x57534e;
      plateG.fillStyle(rivetColor, 0.9);
      plateG.fillCircle(-plateW / 2 + 6, -plateH / 2 + 6, 1.8);
      plateG.fillCircle(plateW / 2 - 6, -plateH / 2 + 6, 1.8);
      plateG.fillCircle(-plateW / 2 + 6, plateH / 2 - 6, 1.8);
      plateG.fillCircle(plateW / 2 - 6, plateH / 2 - 6, 1.8);

      const titleTxt = this.add
        .text(0, -7, spec.title, {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: spec.title.length > 26 ? '11.5px' : '12.5px',
          fontStyle: 'bold',
          color: spec.unlocked ? '#451a03' : '#cbd5e1'
        })
        .setOrigin(0.5);

      const subTxt = this.add
        .text(0, 9, spec.unlocked ? `★ ${spec.subtitle}` : `🔒 ${spec.subtitle}`, {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: spec.unlocked ? '#b45309' : '#94a3b8'
        })
        .setOrigin(0.5);

      nameplate.add([plateG, titleTxt, subTxt]);
      this.lowerShelfContentContainer.add(nameplate);

      // Interactive Hit Zone covering the book and its brass nameplate
      const hitZone = this.add
        .zone(spec.x, shelfY - 125, 204, 355)
        .setOrigin(0.5, 0.5)
        .setInteractive({ useHandCursor: true });
      this.lowerShelfContentContainer.add(hitZone);

      if (spec.unlocked) {
        hitZone.on('pointerover', () => {
          if (this.isLaunchingBook) return;
          this.tweens.killTweensOf([bookSprite, nameplate]);
          this.tweens.add({
            targets: bookSprite,
            y: shelfY - 8,
            scaleX: baseBookScale * 1.04,
            scaleY: baseBookScale * 1.04,
            duration: 180,
            ease: 'Quad.easeOut'
          });
          this.tweens.add({
            targets: nameplate,
            scaleX: 1.04,
            scaleY: 1.04,
            duration: 180,
            ease: 'Quad.easeOut'
          });
        });

        hitZone.on('pointerout', () => {
          if (this.isLaunchingBook) return;
          this.tweens.killTweensOf([bookSprite, nameplate]);
          this.tweens.add({
            targets: bookSprite,
            y: shelfY,
            scaleX: baseBookScale,
            scaleY: baseBookScale,
            angle: 0,
            duration: 180,
            ease: 'Quad.easeOut'
          });
          this.tweens.add({
            targets: nameplate,
            scaleX: 1,
            scaleY: 1,
            duration: 180,
            ease: 'Quad.easeOut'
          });
        });

        hitZone.on('pointerdown', () => {
          if (this.isLaunchingBook) return;
          this.isLaunchingBook = true;

          if (!AudioBus.getMuted()) {
            if (this.cache.audio.exists('sfx-book-select')) {
              this.sound.play('sfx-book-select', { volume: 0.9 });
            } else {
              AudioBus.playLayerSfx('/assets/hub/audio/sfx-book-select.mp3', 0.9);
            }
          }

          Juice.burstStars(this, spec.x, shelfY - 155, 24, [0xfef08a, 0xfbbf24, 0xf59e0b, 0xffffff]);

          this.tweens.killTweensOf([bookSprite, nameplate]);
          this.tweens.add({
            targets: bookSprite,
            y: shelfY - 28,
            scaleX: baseBookScale * 1.15,
            scaleY: baseBookScale * 1.15,
            angle: -3.5,
            duration: 650,
            ease: 'Back.easeOut',
            onComplete: () => {
              this.scene.start('StoryEngineScene', { cartridgeId: spec.cartridgeId ?? 'just-nana-and-us' });
            }
          });
        });
      } else {
        let isWiggling = false;
        hitZone.on('pointerdown', () => {
          if (this.isLaunchingBook || isWiggling) return;
          isWiggling = true;

          if (!AudioBus.getMuted()) {
            if (this.cache.audio.exists('sfx-book-locked')) {
              this.sound.play('sfx-book-locked', { volume: 0.85 });
            } else {
              AudioBus.playLayerSfx('/assets/hub/audio/sfx-book-locked.mp3', 0.85);
            }
          }

          this.tweens.add({
            targets: [bookSprite, nameplate],
            x: { from: spec.x - 4, to: spec.x + 4 },
            duration: 60,
            yoyo: true,
            repeat: 1,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              bookSprite.x = spec.x;
              nameplate.x = spec.x;
              isWiggling = false;
            }
          });
        });
      }
    });
  }

  /**
   * Renders the `Play Arcade` or `Create` selection cards neatly inside the center oak shelf cavity
   * (`x: 310..970, y: 240..625`) styled with warm parchment, carved walnut, and antique brass borders.
   */
  private renderShelfActivityCards(tab: 'play' | 'create'): void {
    const cards = SHELF_ACTIVITY_CARDS[tab];
    const xs = [420, 640, 860];
    const cardY = 445;
    const cardW = 204;
    const cardH = 316;

    cards.forEach((card, index) => {
      const cx = xs[index] ?? 640;
      const container = this.add.container(cx, cardY);

      // Soft dark-wood drop shadow on the shelf plank
      const shadow = this.add.graphics();
      shadow.fillStyle(0x090401, 0.52);
      shadow.fillEllipse(0, cardH / 2 + 12, 184, 22);
      container.add(shadow);

      // Heirloom Walnut & Cream Parchment Card Frame
      const bg = this.add.graphics();
      bg.fillStyle(0x2a1508, 0.96);
      bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
      bg.lineStyle(3, 0xd97706, 1);
      bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);

      // Inner warm parchment face
      bg.fillStyle(0xfdf8ec, 0.96);
      bg.fillRoundedRect(-cardW / 2 + 8, -cardH / 2 + 8, cardW - 16, cardH - 16, 12);
      bg.lineStyle(1.5, 0xb45309, 0.7);
      bg.strokeRoundedRect(-cardW / 2 + 8, -cardH / 2 + 8, cardW - 16, cardH - 16, 12);

      // Top dark-wood art recessed alcove inside card
      bg.fillStyle(0x3b1d0a, 0.94);
      bg.fillRoundedRect(-cardW / 2 + 16, -cardH / 2 + 42, cardW - 32, 112, 10);
      bg.lineStyle(1.5, 0xfbbf24, 0.75);
      bg.strokeRoundedRect(-cardW / 2 + 16, -cardH / 2 + 42, cardW - 32, 112, 10);

      // Top brass badge header
      bg.fillStyle(0x451a03, 1);
      bg.fillRoundedRect(-78, -cardH / 2 + 14, 156, 22, 11);
      bg.lineStyle(1.5, 0xfbbf24, 0.9);
      bg.strokeRoundedRect(-78, -cardH / 2 + 14, 156, 22, 11);

      const badgeTxt = this.add
        .text(0, -cardH / 2 + 25, card.badgeText, {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '10.5px',
          fontStyle: 'bold',
          color: '#fef08a'
        })
        .setOrigin(0.5);

      const mainEmoji = this.add
        .text(0, -cardH / 2 + 98, card.emoji, {
          fontSize: '56px'
        })
        .setOrigin(0.5);

      const titleTxt = this.add
        .text(0, 26, card.title, {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#451a03',
          align: 'center',
          wordWrap: { width: cardW - 28 }
        })
        .setOrigin(0.5);

      const subTxt = this.add
        .text(0, 72, card.subtitle, {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '12.5px',
          color: '#78350f',
          align: 'center',
          wordWrap: { width: cardW - 30 }
        })
        .setOrigin(0.5);

      // Bottom antique brass action plaque
      const btnBg = this.add.graphics();
      btnBg.fillStyle(0xb45309, 1);
      btnBg.fillRoundedRect(-80, cardH / 2 - 46, 160, 30, 15);
      btnBg.lineStyle(2, 0xfde047, 1);
      btnBg.strokeRoundedRect(-80, cardH / 2 - 46, 160, 30, 15);

      const btnTxt = this.add
        .text(0, cardH / 2 - 31, '✨ TAP TO PLAY', {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '12.5px',
          fontStyle: 'bold',
          color: '#fef08a'
        })
        .setOrigin(0.5);

      container.add([bg, badgeTxt, mainEmoji, titleTxt, subTxt, btnBg, btnTxt]);

      container.setScale(0.85);
      container.setAlpha(0);
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        duration: 240,
        delay: index * 55,
        ease: 'Back.easeOut'
      });

      Juice.makeTactileButton(
        this,
        container,
        cardW,
        cardH,
        () => {
          AudioBus.playSfx(card.previewSfx);
          Juice.jumpFlip(this, mainEmoji, 28, true);
          Juice.burstStars(this, cx, cardY - 40, 14, [card.accentColor, 0xfef08a, 0xffffff]);
        },
        card.previewSfx
      );

      this.lowerShelfContentContainer.add(container);
    });
  }
}
