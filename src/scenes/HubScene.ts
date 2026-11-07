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
import { PWAInstallManager } from '../core/PWAInstallManager';

interface ShelfActivityCardConfig {
  id: string;
  title: string;
  subtitle: string;
  texKey?: string;
  baseScale?: number;
  emoji: string;
  badgeText: string;
  accentColor: number;
  previewSfx: SfxName;
  unlocked?: boolean;
  targetScene?: string;
  comingSoon?: boolean;
  announceAudio?: string;
}

const SHELF_ACTIVITY_CARDS: Record<'play' | 'create' | 'tv', ShelfActivityCardConfig[]> = {
  play: [
    // Page 1 & 2: 6 Heirloom Arcade Cabinet Games (3 per page)
    {
      id: 'bubble-pop',
      title: 'BALLOON LETTER POP',
      subtitle: 'Sky-Ship Letters & Words',
      texKey: 'arcade-toy-balloon',
      baseScale: 0.76,
      emoji: '🎈',
      badgeText: 'SKY-SHIP ARCADE',
      accentColor: 0x34d399,
      previewSfx: 'sparky',
      unlocked: true,
      targetScene: 'BalloonPopScene'
    },
    {
      id: 'great-hall-box-of-ten',
      title: 'GREAT HALL BOX OF TEN',
      subtitle: 'Wizard Dice & 1-10 Math',
      texKey: 'hub-toy-shutthebox',
      baseScale: 0.56,
      emoji: '🎲',
      badgeText: 'GREAT HALL MATH',
      accentColor: 0x10b981,
      previewSfx: 'chime',
      unlocked: true,
      targetScene: 'ShutTheBoxScene',
      announceAudio: '/assets/audio/shutthebox/prompts/welcome_title.mp3'
    },
    {
      id: 'cloud-racer',
      title: 'ZOOMY CLOUD KART',
      subtitle: 'Rainbow Hill Racer',
      texKey: 'arcade-toy-kart',
      baseScale: 0.64,
      emoji: '🏎️',
      badgeText: 'ARCADE MINI-GAME',
      accentColor: 0xfacc15,
      previewSfx: 'horn',
      unlocked: true,
      targetScene: 'CloudKartScene',
      announceAudio: '/assets/audio/cloudkart/prompts/welcome_title.mp3'
    },
    {
      id: 'rocket-number-blast',
      title: 'ROCKET NUMBER BLAST',
      subtitle: 'Starlight Launchpad',
      texKey: 'hub-toy-rocket',
      baseScale: 0.72,
      emoji: '🚀',
      badgeText: 'STARLIGHT LAUNCHPAD',
      accentColor: 0x38bdf8,
      previewSfx: 'chime',
      unlocked: true,
      targetScene: 'RocketBlastScene',
      announceAudio: '/assets/audio/rocket/prompts/welcome_title.mp3'
    },
    {
      id: 'unicorn-castle',
      title: "PRINCESS EMMA'S TEA PARTY",
      subtitle: 'Royal Unicorn Castle',
      texKey: 'hub-toy-unicorn',
      baseScale: 0.72,
      emoji: '🦄',
      badgeText: 'ROYAL STICKER KINGDOM',
      accentColor: 0xf472b6,
      previewSfx: 'chime',
      unlocked: true,
      targetScene: 'UnicornCastleScene',
      announceAudio: '/assets/audio/unicorn/prompts/welcome_title.mp3'
    },
    {
      id: 'ispy-curio-cabinet',
      title: 'I SPY CURIO CABINET',
      subtitle: 'Magnifying Glass Detective',
      texKey: 'hub-toy-ispy',
      baseScale: 0.59,
      emoji: '🔍',
      badgeText: 'CURIO DETECTIVE',
      accentColor: 0xfbbf24,
      previewSfx: 'chime',
      unlocked: true,
      targetScene: 'ISpyScene',
      announceAudio: '/assets/audio/ispy/prompts/welcome_title.mp3'
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
    }
  ],
  tv: [
    {
      id: 'starship-unicorn-trivia',
      title: 'STARSHIP UNICORN: ORBITAL TRIVIA',
      subtitle: '2–6 Player Family TV Party',
      texKey: 'hub-toy-starship-unicorn',
      baseScale: 0.66,
      emoji: '🦄',
      badgeText: '2–6 PLAYER TV PARTY',
      accentColor: 0x38bdf8,
      previewSfx: 'fanfare',
      unlocked: true,
      targetScene: 'StarshipUnicornScene',
      announceAudio: '/assets/audio/starship/voice/welcome_title.mp3'
    },
    {
      id: 'animal-match-safari',
      title: 'ANIMAL MATCH SAFARI',
      subtitle: 'Clockwork Memory Match',
      texKey: 'arcade-toy-match',
      baseScale: 0.34,
      emoji: '🦁',
      badgeText: 'PARLOR PUZZLE',
      accentColor: 0xfbbf24,
      previewSfx: 'chime',
      unlocked: true,
      targetScene: 'MemoryMatchScene'
    }
  ]
};

export class HubScene extends Phaser.Scene {
  private upperShelfContainer!: Phaser.GameObjects.Container;
  private personaContainer!: Phaser.GameObjects.Container;
  private lowerShelfContentContainer!: Phaser.GameObjects.Container;
  private shelfSparkySprite!: Phaser.GameObjects.Image;
  private isLaunchingBook: boolean = false;
  private pageIndexByTab: Record<HubTabId, number> = {
    read: 0,
    play: 0,
    create: 0,
    tv: 0
  };
  private slideDirection: number = 0;

  constructor() {
    super({ key: 'HubScene' });
  }

  public create(): void {
    this.isLaunchingBook = false;

    this.ensureRadialGlowTexture();
    this.createFullScreenBookshelf();
    this.createAntiqueBrassMuteButton();
    this.createHeirloomPWAInstallButton();

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
   * Renders a non-intrusive Heirloom Brass & Emerald Pill Button (`[ ⬇ INSTALL TABLET APP ]`)
   * in the top-left corner (`x: 124, y: 32`).
   * - Automatically hides when already running in installed standalone/fullscreen mode AND offline
   *   cache is complete.
   * - On Android/Chrome with `beforeinstallprompt`, triggers the native 1-tap Home Screen prompt.
   * - On iPadOS/iOS or manual browsers, opens an ornate Mahogany & Brass instructional modal with
   *   live Airplane-Mode offline cache status.
   */
  private createHeirloomPWAInstallButton(): void {
    const pillW = 204;
    const pillH = 38;
    const btnContainer = this.add.container(124, 32).setDepth(100);

    const pillBg = this.add.graphics();
    const pillLabel = this.add
      .text(0, 0, '⬇ INSTALL TABLET APP', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#052e16',
        strokeThickness: 2
      })
      .setOrigin(0.5);

    const drawPill = (installed: boolean, offlineReady: boolean) => {
      if (installed && offlineReady) {
        btnContainer.setVisible(false);
        return;
      }
      btnContainer.setVisible(true);
      pillBg.clear();
      // Drop shadow
      pillBg.fillStyle(0x090401, 0.55);
      pillBg.fillRoundedRect(-pillW / 2 + 2, -pillH / 2 + 2, pillW, pillH, 19);
      // Deep emerald & walnut body with polished brass rim
      pillBg.fillStyle(offlineReady ? 0x065f46 : 0x27160c, 0.94);
      pillBg.fillRoundedRect(-pillW / 2, -pillH / 2, pillW, pillH, 19);
      pillBg.lineStyle(2.2, 0xfbbf24, 0.95);
      pillBg.strokeRoundedRect(-pillW / 2, -pillH / 2, pillW, pillH, 19);
      pillBg.lineStyle(1, 0xfef08a, 0.55);
      pillBg.strokeRoundedRect(-pillW / 2 + 3, -pillH / 2 + 3, pillW - 6, pillH - 6, 16);

      if (installed) {
        pillLabel.setText('✓ OFFLINE APP READY');
      } else {
        pillLabel.setText('⬇ INSTALL TABLET APP');
      }
    };

    btnContainer.add([pillBg, pillLabel]);
    drawPill(PWAInstallManager.isInstalledStandalone(), PWAInstallManager.isOfflineReady());

    const unsubscribe = PWAInstallManager.subscribe(() => {
      if (!btnContainer.scene) return;
      drawPill(PWAInstallManager.isInstalledStandalone(), PWAInstallManager.isOfflineReady());
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubscribe();
    });

    Juice.makeTactileButton(
      this,
      btnContainer,
      pillW + 12,
      64,
      () => {
        void this.handleInstallButtonTap();
      },
      'pop'
    );
  }

  private async handleInstallButtonTap(): Promise<void> {
    if (PWAInstallManager.canPromptNativeInstall()) {
      const outcome = await PWAInstallManager.triggerNativeInstallPrompt();
      if (outcome === 'accepted') {
        AudioBus.playSfx('fanfare');
        Juice.burstStars(this, 640, 260, 18, [0xfef08a, 0xfbbf24, 0x34d399]);
        return;
      }
    }
    this.openTabletInstallModal();
  }

  private openTabletInstallModal(): void {
    const modalRoot = this.add.container(640, 360).setDepth(500);

    // Dimmed backdrop catcher
    const backdrop = this.add
      .rectangle(0, 0, 1280, 720, 0x090503, 0.76)
      .setInteractive();
    modalRoot.add(backdrop);

    const card = this.add.container(0, 0);
    modalRoot.add(card);

    const cardW = 780;
    const cardH = 430;
    const cardG = this.add.graphics();
    // Outer drop shadow
    cardG.fillStyle(0x000000, 0.68);
    cardG.fillRoundedRect(-cardW / 2 + 6, -cardH / 2 + 8, cardW, cardH, 24);
    // Mahogany cabinet body
    cardG.fillStyle(0x1f1108, 0.98);
    cardG.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 24);
    // Polished brass double border
    cardG.lineStyle(4, 0xd97706, 1);
    cardG.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 24);
    cardG.lineStyle(1.5, 0xfef08a, 0.65);
    cardG.strokeRoundedRect(-cardW / 2 + 6, -cardH / 2 + 6, cardW - 12, cardH - 12, 19);

    // Step 1 & Step 2 inset walnut panels
    cardG.fillStyle(0x140a04, 0.92);
    cardG.fillRoundedRect(-cardW / 2 + 32, -108, cardW - 64, 78, 14);
    cardG.lineStyle(2, 0x92400e, 0.85);
    cardG.strokeRoundedRect(-cardW / 2 + 32, -108, cardW - 64, 78, 14);

    cardG.fillStyle(0x140a04, 0.92);
    cardG.fillRoundedRect(-cardW / 2 + 32, -16, cardW - 64, 78, 14);
    cardG.lineStyle(2, 0x92400e, 0.85);
    cardG.strokeRoundedRect(-cardW / 2 + 32, -16, cardW - 64, 78, 14);

    const headerTitle = this.add
      .text(0, -162, 'INSTALL HEIRLOOM ARCADE FOR OFFLINE PLAY', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '23px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#271206',
        strokeThickness: 4
      })
      .setOrigin(0.5);

    const isIOS = PWAInstallManager.isIOSOrIPadOS();
    const step1Text = this.add
      .text(
        0,
        -69,
        "1. On iPad (Safari): Tap the Share button [↑] at the top of the screen,\n    then tap 'Add to Home Screen'.",
        {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '18px',
          fontStyle: isIOS ? 'bold' : 'normal',
          color: isIOS ? '#fef08a' : '#f3e8d2',
          align: 'center'
        }
      )
      .setOrigin(0.5);

    const step2Text = this.add
      .text(
        0,
        23,
        "2. On Android (Chrome): Tap the menu [⋮] and tap 'Install App'\n    or 'Add to Home Screen'.",
        {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '18px',
          fontStyle: !isIOS ? 'bold' : 'normal',
          color: !isIOS ? '#fef08a' : '#f3e8d2',
          align: 'center'
        }
      )
      .setOrigin(0.5);

    // Live Offline Storage Status readout pill
    const statusPillG = this.add.graphics();
    const statusText = this.add
      .text(0, 102, '', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#a7f3d0'
      })
      .setOrigin(0.5);

    const updateStatusReadout = () => {
      const ready = PWAInstallManager.isOfflineReady();
      statusPillG.clear();
      statusPillG.fillStyle(ready ? 0x064e3b : 0x3b1d0a, 0.95);
      statusPillG.fillRoundedRect(-cardW / 2 + 44, 80, cardW - 88, 44, 12);
      statusPillG.lineStyle(2, ready ? 0x34d399 : 0xfbbf24, 0.9);
      statusPillG.strokeRoundedRect(-cardW / 2 + 44, 80, cardW - 88, 44, 12);
      statusText.setText(
        ready
          ? '✓ Offline Mode Ready — All games & audio saved for Airplane Mode!'
          : '✓ Offline Mode Ready — All games & audio saved for Airplane Mode!'
      );
      statusText.setColor(ready ? '#a7f3d0' : '#fde68a');
    };
    updateStatusReadout();

    const unsubModal = PWAInstallManager.subscribe(() => {
      if (!modalRoot.scene) return;
      updateStatusReadout();
    });

    // Big Golden `[ Got It ]` Close Button (`64px+` tall hit area)
    const gotItBtn = this.add.container(0, 166);
    const gotItG = this.add.graphics();
    gotItG.fillStyle(0xb45309, 1);
    gotItG.fillRoundedRect(-110, -28, 220, 56, 16);
    gotItG.lineStyle(3, 0xfef08a, 1);
    gotItG.strokeRoundedRect(-110, -28, 220, 56, 16);
    const gotItLabel = this.add
      .text(0, 0, 'Got It', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#271206',
        strokeThickness: 3
      })
      .setOrigin(0.5);
    gotItBtn.add([gotItG, gotItLabel]);

    const closeModal = () => {
      unsubModal();
      modalRoot.destroy(true);
    };

    Juice.makeTactileButton(this, gotItBtn, 230, 68, closeModal, 'pop');
    backdrop.on('pointerdown', () => {
      AudioBus.playSfx('pop');
      closeModal();
    });

    card.add([cardG, headerTitle, step1Text, step2Text, statusPillG, statusText, gotItBtn]);
    card.setScale(0.88);
    this.tweens.add({
      targets: card,
      scaleX: 1,
      scaleY: 1,
      duration: 180,
      ease: 'Back.easeOut'
    });
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
        label: 'READ STORIES',
        x: 235,
        baseScale: 0.295
      },
      {
        id: 'play',
        texKey: 'mode-arcade',
        label: 'PLAY ARCADE',
        x: 505,
        baseScale: 0.285
      },
      {
        id: 'create',
        texKey: 'mode-create',
        label: 'CREATE',
        x: 775,
        baseScale: 0.295
      },
      {
        id: 'tv',
        texKey: 'mode-tv',
        label: 'TV GAMES',
        x: 1045,
        baseScale: 0.295
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
    } else if (activeTab === 'create') {
      this.renderCreateObjectsOnShelf();
    } else {
      this.renderShelfActivityCards(activeTab);
    }
  }

  /**
   * STEP 2: Places the 3 Create Objects (`create-art-studio`, `create-tinker-box`, `create-music-box`)
   * directly on the lower oak shelf plank (`y: 636`, `origin: (0.5, 1.0)`) between Sparky and Doggie
   * with ornate brass nameplates on the front wooden shelf lip (`y: 668`).
   */
  private renderCreateObjectsOnShelf(): void {
    const shelfY = 636;
    const plaqueY = 668;
    const baseItemScale = 0.6;

    const createSpecs: Array<{
      id: string;
      texKey: string;
      baseScale?: number;
      title: string;
      subtitle: string;
      unlocked: boolean;
      targetScene?: string;
      announceAudio?: string;
    }> = [
      {
        id: 'create-art-studio',
        texKey: 'create-art-studio',
        baseScale: 0.6,
        title: 'Royal Art Studio',
        subtitle: 'Paint, Color & Stickers',
        unlocked: true,
        targetScene: 'ArtStudioScene'
      },
      {
        id: 'create-music-box',
        texKey: 'create-music-box',
        baseScale: 0.6,
        title: 'Royal Melody Maker',
        subtitle: 'Play, Listen & Jam',
        unlocked: true,
        targetScene: 'MelodyMakerScene'
      },
      {
        id: 'create-tinker-box',
        texKey: 'create-tinker-box',
        baseScale: 0.6,
        title: 'Tinker Workshop',
        subtitle: 'Build, Gears & Marbles',
        unlocked: true,
        targetScene: 'TinkerWorkshopScene'
      },
      {
        id: 'clockwork-train-table',
        texKey: 'hub-toy-train',
        baseScale: 0.72,
        title: 'Clockwork Train Table',
        subtitle: 'Wooden Railway Builder',
        unlocked: true,
        targetScene: 'TrainTableScene',
        announceAudio: '/assets/audio/train/prompts/welcome_title.mp3'
      }
    ];

    const itemsPerPage = 3;
    const totalPages = Math.max(1, Math.ceil(createSpecs.length / itemsPerPage));
    const currentPage = Phaser.Math.Clamp(this.pageIndexByTab.create ?? 0, 0, totalPages - 1);
    this.pageIndexByTab.create = currentPage;
    const pageSpecs = createSpecs.slice(
      currentPage * itemsPerPage,
      currentPage * itemsPerPage + itemsPerPage
    );

    const xs =
      pageSpecs.length === 1
        ? [640]
        : pageSpecs.length === 2
        ? [515, 765]
        : [420, 640, 860];

    pageSpecs.forEach((spec, idx) => {
      const specX = xs[idx] ?? 640;
      const itemScale = spec.baseScale ?? baseItemScale;

      // Soft dark-wood drop shadow ellipse underneath the base of each Create object
      const shadow = this.add.graphics();
      shadow.fillStyle(0x0c0502, spec.unlocked ? 0.54 : 0.38);
      shadow.fillEllipse(specX, shelfY - 4, 188, 24);
      shadow.fillStyle(0x050201, spec.unlocked ? 0.36 : 0.24);
      shadow.fillEllipse(specX, shelfY - 2, 140, 14);
      this.lowerShelfContentContainer.add(shadow);

      // Standing Create Object Sprite (`origin: (0.5, 1.0)` at `y: 636`)
      if (this.textures.exists(spec.texKey)) {
        this.textures.get(spec.texKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      const itemSprite = this.add
        .image(specX, shelfY, spec.texKey)
        .setOrigin(0.5, 1.0)
        .setScale(itemScale);

      if (!spec.unlocked) {
        itemSprite.setTint(0x6e6a75);
        itemSprite.setAlpha(0.68);
      }
      this.lowerShelfContentContainer.add(itemSprite);

      // Gentle warm golden idle shimmer around the unlocked Art Studio easel
      if (spec.unlocked) {
        const shimmerAnchors = [
          { dx: -26, dy: -210 },
          { dx: 30, dy: -190 },
          { dx: -10, dy: -145 },
          { dx: 36, dy: -110 },
          { dx: -32, dy: -85 }
        ];
        shimmerAnchors.forEach((pt, sIdx) => {
          const glint = this.add
            .image(specX + pt.dx, shelfY + pt.dy, 'particle-star')
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
      const nameplate = this.add.container(specX, plaqueY);
      const plateG = this.add.graphics();

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
          fontSize: '12.5px',
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

      const hitZone = this.add
        .zone(specX, shelfY - 125, 204, 355)
        .setOrigin(0.5, 0.5)
        .setInteractive({ useHandCursor: true });
      this.lowerShelfContentContainer.add(hitZone);

      if (spec.unlocked) {
        hitZone.on('pointerover', () => {
          if (this.isLaunchingBook) return;
          this.tweens.killTweensOf([itemSprite, nameplate]);
          this.tweens.add({
            targets: itemSprite,
            y: shelfY - 8,
            scaleX: itemScale * 1.04,
            scaleY: itemScale * 1.04,
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
          this.tweens.killTweensOf([itemSprite, nameplate]);
          this.tweens.add({
            targets: itemSprite,
            y: shelfY,
            scaleX: itemScale,
            scaleY: itemScale,
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
            if (spec.announceAudio) {
              AudioBus.playLayerSfx(spec.announceAudio, 0.8);
            }
          }

          Juice.burstStars(this, specX, shelfY - 155, 24, [0xfef08a, 0xfbbf24, 0xf59e0b, 0xffffff]);

          this.tweens.killTweensOf([itemSprite, nameplate]);
          this.tweens.add({
            targets: itemSprite,
            y: shelfY - 28,
            scaleX: itemScale * 1.15,
            scaleY: itemScale * 1.15,
            angle: -3.5,
            duration: 550,
            ease: 'Back.easeOut',
            onComplete: () => {
              this.scene.start(spec.targetScene ?? 'ArtStudioScene');
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
            targets: [itemSprite, nameplate],
            x: { from: specX - 4, to: specX + 4 },
            duration: 60,
            yoyo: true,
            repeat: 1,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              itemSprite.x = specX;
              nameplate.x = specX;
              isWiggling = false;
            }
          });
        });
      }
    });

    this.renderShelfPaginationControls('create', currentPage, totalPages);
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
      targetScene?: string;
      cartridgeId?: string;
    }> = [
      {
        id: 'book-nana',
        texKey: 'book-nana',
        x: 420,
        title: "To Nana and Papa's House We Go!",
        subtitle: 'A Michigan Adventure',
        unlocked: true,
        targetScene: 'StoryEngineScene',
        cartridgeId: 'just-nana-and-us'
      },
      {
        id: 'book-grandpa-bapci',
        texKey: 'book-grandpa-bapci',
        x: 640,
        title: "To Babci and Grandpa's House We Go!",
        subtitle: 'A Colorado Adventure',
        unlocked: true,
        targetScene: 'ColoradoStoryScene'
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

    const itemsPerPage = 3;
    const totalPages = Math.max(1, Math.ceil(bookSpecs.length / itemsPerPage));
    const currentPage = Phaser.Math.Clamp(this.pageIndexByTab.read ?? 0, 0, totalPages - 1);
    this.pageIndexByTab.read = currentPage;
    const pageSpecs = bookSpecs.slice(
      currentPage * itemsPerPage,
      currentPage * itemsPerPage + itemsPerPage
    );

    pageSpecs.forEach((spec) => {
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
          fontSize: spec.title.length > 32 ? '10.8px' : spec.title.length > 26 ? '11.5px' : '12.5px',
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
              if (spec.targetScene === 'ColoradoStoryScene') {
                this.scene.start('ColoradoStoryScene', { pageIndex: 0 });
              } else {
                this.scene.start('StoryEngineScene', { cartridgeId: spec.cartridgeId ?? 'just-nana-and-us' });
              }
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

    this.renderShelfPaginationControls('read', currentPage, totalPages);
  }

  /**
   * Renders ornate Left ('◀') and Right ('▶') Brass Carousel Arrow Medallions in the open dark-wood
   * alcove above Sparky and Doggie (`x: 205, y: 405` and `x: 1075, y: 405`) plus subtle brass page
   * indicator pips below the shelf whenever a category has more than 1 page.
   */
  private renderShelfPaginationControls(
    tab: HubTabId,
    currentPage: number,
    totalPages: number
  ): void {
    if (totalPages <= 1) return;

    const arrowSpecs: Array<{ x: number; y: number; dir: -1 | 1; symbol: string }> = [
      { x: 205, y: 405, dir: -1, symbol: '◀' },
      { x: 1075, y: 405, dir: 1, symbol: '▶' }
    ];

    arrowSpecs.forEach((spec) => {
      const btn = this.add.container(spec.x, spec.y);
      const radius = 32;
      const g = this.add.graphics();

      // Drop shadow
      g.fillStyle(0x090401, 0.65);
      g.fillCircle(2, 4, radius + 2);

      // Outer antique brass octagon/bevelled rim
      g.fillStyle(0xb45309, 1);
      g.fillCircle(0, 0, radius);
      g.lineStyle(3, 0xfde047, 1);
      g.strokeCircle(0, 0, radius);

      // Recessed mahogany center
      g.fillStyle(0x2a1408, 0.96);
      g.fillCircle(0, 0, radius - 6);
      g.lineStyle(1.5, 0xfbbf24, 0.85);
      g.strokeCircle(0, 0, radius - 6);

      // 8 perimeter brass rivets for octagonal heirloom feel
      g.fillStyle(0xfef08a, 0.9);
      for (let a = 0; a < 8; a++) {
        const rad = (a * Math.PI) / 4;
        g.fillCircle(Math.cos(rad) * (radius - 3), Math.sin(rad) * (radius - 3), 1.8);
      }

      const arrowTxt = this.add
        .text(spec.dir * 1.5, -1, spec.symbol, {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '24px',
          fontStyle: 'bold',
          color: '#fef08a',
          stroke: '#1c0d06',
          strokeThickness: 4
        })
        .setOrigin(0.5);

      btn.add([g, arrowTxt]);

      // Hover scale bounce + crisp mechanical click when flipping pages
      const hitZone = this.add
        .zone(0, 0, 72, 72)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      btn.add(hitZone);

      hitZone.on('pointerover', () => {
        this.tweens.add({
          targets: btn,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 130,
          ease: 'Back.easeOut'
        });
      });

      hitZone.on('pointerout', () => {
        this.tweens.add({
          targets: btn,
          scaleX: 1,
          scaleY: 1,
          duration: 130,
          ease: 'Quad.easeOut'
        });
      });

      hitZone.on('pointerdown', () => {
        if (this.isLaunchingBook) return;
        AudioBus.playSfx('tab');
        Juice.squashAndStretch(this, btn, 0.22, 140);
        Juice.burstStars(this, spec.x, spec.y, 8, [0xfef08a, 0xfbbf24, 0xffffff]);

        const nextPage = (currentPage + spec.dir + totalPages) % totalPages;
        this.pageIndexByTab[tab] = nextPage;
        this.slideDirection = spec.dir;
        this.renderLowerShelfContent();
      });

      this.lowerShelfContentContainer.add(btn);
    });

    // Subtle brass page indicator plaque + glowing gold pips centered below the shelf (`x: 640, y: 701`)
    const pipsContainer = this.add.container(640, 701);
    const plaqueW = 152;
    const plaqueH = 22;
    const pg = this.add.graphics();

    pg.fillStyle(0x1f1007, 0.94);
    pg.fillRoundedRect(-plaqueW / 2, -plaqueH / 2, plaqueW, plaqueH, 11);
    pg.lineStyle(1.8, 0xd97706, 0.95);
    pg.strokeRoundedRect(-plaqueW / 2, -plaqueH / 2, plaqueW, plaqueH, 11);

    pipsContainer.add(pg);

    // Glowing gold dots on the left of the pill + "PAGE X / Y" label on the right
    const pipSpacing = 16;
    const pipStartX = -40 - ((totalPages - 1) * pipSpacing) / 2;
    for (let p = 0; p < totalPages; p++) {
      const px = pipStartX + p * pipSpacing;
      const isCurrent = p === currentPage;
      const dot = this.add.graphics();
      if (isCurrent) {
        dot.fillStyle(0xfef08a, 1);
        dot.fillCircle(px, 0, 5);
        dot.lineStyle(1.5, 0xf59e0b, 1);
        dot.strokeCircle(px, 0, 5);
      } else {
        dot.fillStyle(0x78522b, 0.85);
        dot.fillCircle(px, 0, 3.6);
      }
      pipsContainer.add(dot);
    }

    const pageLabel = this.add
      .text(20, 0, `PAGE ${currentPage + 1} / ${totalPages}`, {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    pipsContainer.add(pageLabel);

    this.lowerShelfContentContainer.add(pipsContainer);
  }

  /**
   * Renders the `Play Arcade` standing heirloom shelf toys (Page 1: `arcade-toy-balloon`,
   * `arcade-toy-bounce`, `arcade-toy-kart`) or upcoming preview showcase plaques (Page 2),
   * supporting multi-page carousels (3 items per page).
   */
  private renderShelfActivityCards(tab: 'play' | 'create' | 'tv'): void {
    const allCards = SHELF_ACTIVITY_CARDS[tab];
    const itemsPerPage = 3;
    const totalPages = Math.max(1, Math.ceil(allCards.length / itemsPerPage));
    const currentPage = Phaser.Math.Clamp(this.pageIndexByTab[tab] ?? 0, 0, totalPages - 1);
    this.pageIndexByTab[tab] = currentPage;

    const pageCards = allCards.slice(
      currentPage * itemsPerPage,
      currentPage * itemsPerPage + itemsPerPage
    );

    // Center 1, 2, or 3 items gracefully across the oak shelf (`x: 420, 640, 860` or `x: 515, 765`)
    const xs =
      pageCards.length === 1
        ? [640]
        : pageCards.length === 2
        ? [515, 765]
        : [420, 640, 860];
    const shelfY = 636;
    const plaqueY = 668;
    const slideOffset = this.slideDirection * 48;
    this.slideDirection = 0;

    pageCards.forEach((card, index) => {
      const cx = xs[index] ?? 640;

      // Case A: Standing Painted Heirloom Arcade Toy Sprite on the Oak Shelf (`arcade-toy-*`)
      if (card.texKey && this.textures.exists(card.texKey)) {
        const baseScale = card.baseScale ?? 0.72;

        // Soft dark-wood drop shadow ellipse underneath the base of each toy
        const shadow = this.add.graphics();
        shadow.fillStyle(0x0c0502, 0.54);
        shadow.fillEllipse(cx, shelfY - 4, 188, 24);
        shadow.fillStyle(0x050201, 0.36);
        shadow.fillEllipse(cx, shelfY - 2, 140, 14);
        this.lowerShelfContentContainer.add(shadow);

        // Warm golden radial glow behind the toy (brightens on hover/tap)
        const hoverGlow = this.add
          .image(cx, shelfY - 145, 'hub-radial-glow')
          .setOrigin(0.5, 0.5)
          .setDisplaySize(240, 220)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(card.unlocked ? 0.24 : 0.08);
        this.lowerShelfContentContainer.add(hoverGlow);

        this.textures
          .get(card.texKey)
          .setFilter(
            card.texKey === 'hub-toy-ispy' || card.texKey === 'hub-toy-starship-unicorn'
              ? Phaser.Textures.FilterMode.LINEAR
              : Phaser.Textures.FilterMode.NEAREST
          );
        const toySprite = this.add
          .image(cx + slideOffset, shelfY, card.texKey)
          .setOrigin(0.5, 1.0)
          .setScale(baseScale * 0.92)
          .setAlpha(0);
        this.lowerShelfContentContainer.add(toySprite);

        this.tweens.add({
          targets: toySprite,
          x: cx,
          scaleX: baseScale,
          scaleY: baseScale,
          alpha: 1,
          duration: 240,
          delay: index * 55,
          ease: 'Back.easeOut'
        });

        // Gentle warm golden idle shimmer around unlocked Balloon Letter Pop carousel toy
        if (card.unlocked) {
          const shimmerAnchors = [
            { dx: -44, dy: -235 },
            { dx: 42, dy: -220 },
            { dx: 0, dy: -265 },
            { dx: 48, dy: -135 },
            { dx: -42, dy: -120 }
          ];
          shimmerAnchors.forEach((pt, sIdx) => {
            const glint = this.add
              .image(cx + pt.dx, shelfY + pt.dy, 'particle-star')
              .setTint(sIdx % 2 === 0 ? 0xfef08a : 0xfbbf24)
              .setBlendMode(Phaser.BlendModes.ADD)
              .setScale(0.18)
              .setAlpha(0.15);
            this.lowerShelfContentContainer.add(glint);

            this.tweens.add({
              targets: glint,
              alpha: { from: 0.12, to: 0.82 },
              scaleX: { from: 0.14, to: 0.42 },
              scaleY: { from: 0.14, to: 0.42 },
              angle: { from: 0, to: 90 },
              duration: 1350 + sIdx * 180,
              delay: sIdx * 240,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
            });
          });
        }

        // Ornate Brass/Parchment Nameplate on the front wooden shelf lip (`y: 668`)
        const plateW = 204;
        const plateH = 40;
        const nameplate = this.add.container(cx, plaqueY);
        const plateG = this.add.graphics();

        plateG.fillStyle(0x090401, 0.58);
        plateG.fillRoundedRect(-plateW / 2 + 2, -plateH / 2 + 2, plateW, plateH, 7);

        plateG.fillStyle(0xfdf8ec, 0.97);
        plateG.fillRoundedRect(-plateW / 2, -plateH / 2, plateW, plateH, 7);
        plateG.lineStyle(2.5, 0xd97706, 1);
        plateG.strokeRoundedRect(-plateW / 2, -plateH / 2, plateW, plateH, 7);
        plateG.lineStyle(1, 0xfbbf24, 0.85);
        plateG.strokeRoundedRect(-plateW / 2 + 3, -plateH / 2 + 3, plateW - 6, plateH - 6, 5);

        plateG.fillStyle(0xb45309, 0.9);
        plateG.fillCircle(-plateW / 2 + 6, -plateH / 2 + 6, 1.8);
        plateG.fillCircle(plateW / 2 - 6, -plateH / 2 + 6, 1.8);
        plateG.fillCircle(-plateW / 2 + 6, plateH / 2 - 6, 1.8);
        plateG.fillCircle(plateW / 2 - 6, plateH / 2 - 6, 1.8);

        const titleTxt = this.add
          .text(0, -7, card.title, {
            fontFamily: '"Fredoka", Georgia, serif',
            fontSize: card.title.length > 26 ? '10.6px' : card.title.length > 22 ? '11.5px' : '12.5px',
            fontStyle: 'bold',
            color: '#451a03'
          })
          .setOrigin(0.5);

        const subTxt = this.add
          .text(0, 9, `★ ${card.subtitle}`, {
            fontFamily: '"Fredoka", Georgia, serif',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#b45309'
          })
          .setOrigin(0.5);

        nameplate.add([plateG, titleTxt, subTxt]);
        this.lowerShelfContentContainer.add(nameplate);

        const hitZone = this.add
          .zone(cx, shelfY - 125, 208, 355)
          .setOrigin(0.5, 0.5)
          .setInteractive({ useHandCursor: true });
        this.lowerShelfContentContainer.add(hitZone);

        hitZone.on('pointerover', () => {
          if (this.isLaunchingBook) return;
          this.tweens.killTweensOf([toySprite, nameplate, hoverGlow]);
          this.tweens.add({
            targets: toySprite,
            y: shelfY - 8,
            scaleX: baseScale * 1.05,
            scaleY: baseScale * 1.05,
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
          this.tweens.add({
            targets: hoverGlow,
            alpha: 0.48,
            duration: 180
          });
        });

        hitZone.on('pointerout', () => {
          if (this.isLaunchingBook) return;
          this.tweens.killTweensOf([toySprite, nameplate, hoverGlow]);
          this.tweens.add({
            targets: toySprite,
            y: shelfY,
            scaleX: baseScale,
            scaleY: baseScale,
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
          this.tweens.add({
            targets: hoverGlow,
            alpha: card.unlocked ? 0.24 : 0.08,
            duration: 180
          });
        });

        hitZone.on('pointerdown', () => {
          if (this.isLaunchingBook) return;
          AudioBus.playSfx(card.previewSfx);
          Juice.burstStars(this, cx, shelfY - 150, 20, [card.accentColor, 0xfef08a, 0xffffff]);

          if (card.unlocked && card.targetScene) {
            this.isLaunchingBook = true;
            if (!AudioBus.getMuted() && this.cache.audio.exists('sfx-book-select')) {
              this.sound.play('sfx-book-select', { volume: 0.9 });
            }
            if (!AudioBus.getMuted() && card.announceAudio) {
              AudioBus.playLayerSfx(card.announceAudio, 0.8);
            }
            Juice.squashAndStretch(this, nameplate, 0.16, 130);
            this.tweens.killTweensOf([toySprite, nameplate]);
            this.tweens.add({
              targets: toySprite,
              y: shelfY - 26,
              scaleX: baseScale * 1.14,
              scaleY: baseScale * 1.14,
              angle: -3,
              duration: 500,
              ease: 'Back.easeOut',
              onComplete: () => {
                this.scene.start(card.targetScene!);
              }
            });
          } else {
            // Interactive toy bounce & warm glow for upcoming toys
            this.tweens.add({
              targets: toySprite,
              y: shelfY - 22,
              scaleX: baseScale * 1.09,
              scaleY: baseScale * 0.94,
              duration: 130,
              yoyo: true,
              ease: 'Quad.easeOut'
            });
            Juice.squashAndStretch(this, nameplate, 0.16, 130);
          }
        });

        return;
      }

      // Case B: Standing Heirloom Mahogany & Brass Clockwork Pedestal on the Oak Shelf (Page 2 upcoming toys)
      const shadow = this.add.graphics();
      shadow.fillStyle(0x0c0502, 0.5);
      shadow.fillEllipse(cx, shelfY - 4, 188, 24);
      shadow.fillStyle(0x050201, 0.34);
      shadow.fillEllipse(cx, shelfY - 2, 140, 14);
      this.lowerShelfContentContainer.add(shadow);

      const hoverGlow = this.add
        .image(cx, shelfY - 135, 'hub-radial-glow')
        .setOrigin(0.5, 0.5)
        .setDisplaySize(220, 200)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.12);
      this.lowerShelfContentContainer.add(hoverGlow);

      const pedestal = this.add.container(cx + slideOffset, shelfY);
      const pedG = this.add.graphics();

      // Carved walnut base resting directly on the oak shelf plank (`y: 0` down to `-36`)
      pedG.fillStyle(0x3b1d0a, 0.98);
      pedG.fillRoundedRect(-76, -34, 152, 34, 8);
      pedG.lineStyle(2.5, 0xd97706, 1);
      pedG.strokeRoundedRect(-76, -34, 152, 34, 8);

      // Ornate brass clockwork medallion ring rising above the wooden base (`y: -135`)
      pedG.fillStyle(0x271308, 0.96);
      pedG.fillCircle(0, -135, 68);
      pedG.lineStyle(4, 0xd97706, 1);
      pedG.strokeCircle(0, -135, 68);
      pedG.lineStyle(1.5, 0xfef08a, 0.78);
      pedG.strokeCircle(0, -135, 61);

      // Brass stem connecting medallion to walnut pedestal base
      pedG.fillStyle(0xb45309, 1);
      pedG.fillRect(-12, -68, 24, 36);
      pedG.lineStyle(1.5, 0xfef08a, 0.8);
      pedG.strokeRect(-12, -68, 24, 36);

      // "COMING SOON" antique brass ribbon across the pedestal
      pedG.fillStyle(0x573012, 0.98);
      pedG.fillRoundedRect(-68, -56, 136, 22, 11);
      pedG.lineStyle(1.5, 0xfbbf24, 0.95);
      pedG.strokeRoundedRect(-68, -56, 136, 22, 11);

      const ribbonTxt = this.add
        .text(0, -45, 'COMING SOON', {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#fef08a'
        })
        .setOrigin(0.5);

      const iconTxt = this.add
        .text(0, -138, card.emoji, {
          fontSize: '58px'
        })
        .setOrigin(0.5);

      pedestal.add([pedG, ribbonTxt, iconTxt]);
      pedestal.setScale(0.92);
      pedestal.setAlpha(0);
      this.lowerShelfContentContainer.add(pedestal);

      this.tweens.add({
        targets: pedestal,
        x: cx,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        duration: 240,
        delay: index * 55,
        ease: 'Back.easeOut'
      });

      // Matching Brass/Parchment Nameplate on the front wooden shelf lip (`y: 668`)
      const plateW = 204;
      const plateH = 40;
      const nameplate = this.add.container(cx, plaqueY);
      const plateG = this.add.graphics();

      plateG.fillStyle(0x090401, 0.58);
      plateG.fillRoundedRect(-plateW / 2 + 2, -plateH / 2 + 2, plateW, plateH, 7);
      plateG.fillStyle(0x27232a, 0.92);
      plateG.fillRoundedRect(-plateW / 2, -plateH / 2, plateW, plateH, 7);
      plateG.lineStyle(1.8, 0xd97706, 0.85);
      plateG.strokeRoundedRect(-plateW / 2, -plateH / 2, plateW, plateH, 7);

      plateG.fillStyle(0xb45309, 0.9);
      plateG.fillCircle(-plateW / 2 + 6, -plateH / 2 + 6, 1.8);
      plateG.fillCircle(plateW / 2 - 6, -plateH / 2 + 6, 1.8);
      plateG.fillCircle(-plateW / 2 + 6, plateH / 2 - 6, 1.8);
      plateG.fillCircle(plateW / 2 - 6, plateH / 2 - 6, 1.8);

      const titleTxt = this.add
        .text(0, -7, card.title, {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#fef08a'
        })
        .setOrigin(0.5);

      const subTxt = this.add
        .text(0, 9, `🔒 ${card.subtitle}`, {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#cbd5e1'
        })
        .setOrigin(0.5);

      nameplate.add([plateG, titleTxt, subTxt]);
      this.lowerShelfContentContainer.add(nameplate);

      const hitZone = this.add
        .zone(cx, shelfY - 115, 204, 310)
        .setOrigin(0.5, 0.5)
        .setInteractive({ useHandCursor: true });
      this.lowerShelfContentContainer.add(hitZone);

      hitZone.on('pointerover', () => {
        if (this.isLaunchingBook) return;
        this.tweens.add({
          targets: pedestal,
          y: shelfY - 8,
          scaleX: 1.04,
          scaleY: 1.04,
          duration: 180,
          ease: 'Quad.easeOut'
        });
        this.tweens.add({
          targets: hoverGlow,
          alpha: 0.36,
          duration: 180
        });
      });

      hitZone.on('pointerout', () => {
        if (this.isLaunchingBook) return;
        this.tweens.add({
          targets: pedestal,
          y: shelfY,
          scaleX: 1,
          scaleY: 1,
          duration: 180,
          ease: 'Quad.easeOut'
        });
        this.tweens.add({
          targets: hoverGlow,
          alpha: 0.12,
          duration: 180
        });
      });

      hitZone.on('pointerdown', () => {
        if (this.isLaunchingBook) return;
        AudioBus.playSfx(card.previewSfx);
        Juice.squashAndStretch(this, pedestal, 0.14, 140);
        Juice.squashAndStretch(this, nameplate, 0.14, 140);
        Juice.burstStars(this, cx, shelfY - 135, 14, [card.accentColor, 0xfef08a, 0xffffff]);
        Juice.popFloatingLabel(this, cx, shelfY - 185, '✨ COMING SOON!', '#fef08a');
      });
    });

    // Render Left/Right Brass Carousel Arrow Buttons & Page Pips whenever totalPages > 1
    this.renderShelfPaginationControls(tab, currentPage, totalPages);
  }
}
