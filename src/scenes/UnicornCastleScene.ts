import Phaser from 'phaser';
import { AudioBus } from '../core/AudioBus';
import { Juice } from '../core/Juice';
import { UnicornAudioEngine } from '../audio/UnicornAudioEngine';

/**
 * UnicornCastleScene ("Emma's Royal Sticker Tea Party")
 * -----------------------------------------------------
 * Mentor Note: Designed specifically for 3-year-old Emma with *Yoshi's Crafted World* / *Kirby*
 * tactile polish, zero mode tabs, zero reading required, and a crystal-clear "One Screen, One
 * Obvious Action" sequential pretend-play loop:
 *
 *   - **Step 1 (Dress the Guest):** Tap or drag the requested Puffy Foil Crown/Bow Sticker
 *     onto the pulsing golden dotted silhouette on the Guest's head (Color & Shape matching).
 *   - **Step 2 (Pour Shimmering Tea):** Tap or drag the requested Puffy Foil Teapot Sticker
 *     to the pulsing silhouette above the porcelain teacup — tilting 45° and streaming sparkling
 *     pastel tea particles until the cup fills and the Guest takes a happy sip!
 *   - **Step 3 (Serve 1, 2, or 3 Treat Stickers):** Tap or drag delicious Puffy Foil Cupcake/Treat
 *     Stickers onto the pulsing silhouettes on the Guest's china plate while counting aloud calmly
 *     ("One." -> "Two." -> "Three cupcakes.").
 *
 * Completing each Guest's 3-step tea service awards 1 Giant Golden Crown-Star (`[ ★ ] [ ★ ] [ ★ ]`).
 * Earning all 3 Crown-Stars triggers the **Grand Royal Sticker Chest Celebration Finale**, where
 * tapping anywhere stamps giant living Puffy Foil Stickers across the royal garden!
 */

type GuestId = 'UNICORN' | 'DOGGIE' | 'SPARKY' | 'GRANDPARENTS';
type TeaStepId = 'STEP1_CROWN' | 'STEP2_TEAPOT' | 'STEP3_TREATS' | 'GUEST_CELEBRATE' | 'FINALE_PARTY';
type ColorKey = 'pink' | 'purple' | 'yellow' | 'blue' | 'green';

interface TrayStickerSpec {
  id: string;
  spriteKey: string;
  tintHex?: number;
  badgeGemKey?: string;
  accentColor: number;
  colorKey: ColorKey;
  isCorrect: boolean;
}

interface GuestScenario {
  guestId: GuestId;
  name: string;
  baseSpriteKey: string;
  happySpriteKey: string;
  guestScale: number;
  headOffset: { x: number; y: number };
  mouthOffset: { x: number; y: number };
  // Step 1: Crown / Bow Sticker
  step1PromptId: string;
  targetCrownSticker: TrayStickerSpec;
  distractorCrowns: [TrayStickerSpec, TrayStickerSpec];
  // Step 2: Teapot Sticker
  step2PromptId: string;
  teaLiquidColor: number;
  teaSparkleColor: number;
  targetTeapotSticker: TrayStickerSpec;
  distractorTeapots: [TrayStickerSpec, TrayStickerSpec];
  // Step 3: Plate Treat Stickers (1, 2, or 3)
  step3PromptId: string;
  treatCount: 1 | 2 | 3;
  treatFinalSummaryPromptId: string;
  targetTreatSpriteKey: string;
  trayTreatStickers: [TrayStickerSpec, TrayStickerSpec, TrayStickerSpec];
}

interface TrayStickerButton {
  spec: TrayStickerSpec;
  root: Phaser.GameObjects.Container;
  puffyCard: Phaser.GameObjects.Container;
  sheenBar: Phaser.GameObjects.Rectangle;
  highlightRing: Phaser.GameObjects.Graphics;
  homeX: number;
  homeY: number;
  consumed: boolean;
}

interface FinaleLivingSticker {
  container: Phaser.GameObjects.Container;
  baseY: number;
  baseScale: number;
  phase: number;
  animMode: 'BOUNCE' | 'TWIRL' | 'FLUTTER' | 'SWAY';
}

const FINALE_LIVING_STICKER_KEYS: Array<{
  key: string;
  anim: 'BOUNCE' | 'TWIRL' | 'FLUTTER' | 'SWAY';
}> = [
  { key: 'stk-unicorn-prance', anim: 'BOUNCE' },
  { key: 'stk-emma-twirl', anim: 'TWIRL' },
  { key: 'stk-pegasus-rainbow', anim: 'FLUTTER' },
  { key: 'stk-candy-carriage', anim: 'BOUNCE' },
  { key: 'stk-royal-kitten', anim: 'BOUNCE' },
  { key: 'stk-baby-unicorn-gold', anim: 'BOUNCE' },
  { key: 'stk-baby-pegasus-blue', anim: 'FLUTTER' },
  { key: 'stk-birthday-cake', anim: 'SWAY' },
  { key: 'stk-rainbow-arch', anim: 'SWAY' },
  { key: 'stk-sparky-prince', anim: 'BOUNCE' },
  { key: 'stk-doggie-jester', anim: 'BOUNCE' },
  { key: 'stk-unicorn-carousel', anim: 'SWAY' },
  { key: 'stk-fairy-butterfly', anim: 'FLUTTER' },
  { key: 'stk-hot-air-balloon', anim: 'FLUTTER' },
  { key: 'stk-diamond-crown', anim: 'TWIRL' }
];

const COLOR_HINT_PROMPTS: Record<ColorKey, string> = {
  pink: 'hint_color_pink',
  purple: 'hint_color_purple',
  yellow: 'hint_color_yellow',
  blue: 'hint_color_blue',
  green: 'hint_color_green'
};

export class UnicornCastleScene extends Phaser.Scene {
  private audio!: UnicornAudioEngine;

  // Party Round & Step State
  private partyRoundIndex = 0;
  private guestSlotIndex = 0; // 0, 1, 2 (3 guests per party round)
  private starsEarned = 0;
  private currentStep: TeaStepId = 'STEP1_CROWN';
  private activeScenario!: GuestScenario;
  private stepTransitionLocked = false;
  private treatsServedOnPlate = 0;

  // Scene Layers
  private stageLayer!: Phaser.GameObjects.Container;
  private tablePropsLayer!: Phaser.GameObjects.Container;
  private silhouetteLayer!: Phaser.GameObjects.Container;
  private trayLayer!: Phaser.GameObjects.Container;
  private flightLayer!: Phaser.GameObjects.Container;
  private finaleLayer!: Phaser.GameObjects.Container;
  private hudLayer!: Phaser.GameObjects.Container;

  // Top 3-Star Progress Tracker
  private starSlotContainers: Phaser.GameObjects.Container[] = [];
  private starSlotFills: Phaser.GameObjects.Container[] = [];

  // Expressive Characters & Table Props
  private emmaContainer!: Phaser.GameObjects.Container;
  private emmaSprite!: Phaser.GameObjects.Image;
  private guestContainer!: Phaser.GameObjects.Container;
  private guestSprite!: Phaser.GameObjects.Image;
  private guestWornCrownContainer: Phaser.GameObjects.Container | null = null;
  private wishBubbleContainer!: Phaser.GameObjects.Container;
  private teacupContainer!: Phaser.GameObjects.Container;
  private teacupLiquidGraphics!: Phaser.GameObjects.Graphics;
  private plateContainer!: Phaser.GameObjects.Container;
  private plateServedStickers: Phaser.GameObjects.Container[] = [];

  // Active Target Silhouettes (for Step 1, Step 2, Step 3)
  private activeSilhouettes: Array<{
    container: Phaser.GameObjects.Container;
    worldX: number;
    worldY: number;
    filled: boolean;
  }> = [];

  // Bottom Velvet Sticker Tray (3 Oversized 145x145 Puffy Foil Stickers)
  private trayButtons: TrayStickerButton[] = [];

  // 3.5-Second Idle Automated Golden Helper Hand
  private idleElapsedSec = 0;
  private helperHandActive = false;
  private helperHandContainer!: Phaser.GameObjects.Container;
  private helperHandTween: Phaser.Tweens.Tween | null = null;

  // Grand Finale Sticker Stamp Party State
  private finaleStickers: FinaleLivingSticker[] = [];
  private finaleChestContainer: Phaser.GameObjects.Container | null = null;

  // Layout Constants (1280x720 Landscape Tablet)
  private readonly EMMA_POS = { x: 235, y: 318 };
  private readonly GUEST_POS = { x: 845, y: 274 };
  private readonly TEACUP_POS = { x: 525, y: 416 };
  private readonly TEAPOT_POUR_POS = { x: 525, y: 292 };
  private readonly PLATE_POS = { x: 805, y: 432 };
  private readonly TRAY_Y = 620;
  private readonly TRAY_SLOT_XS = [400, 640, 880];
  private readonly SNAP_RADIUS_PX = 190;

  constructor() {
    super({ key: 'UnicornCastleScene' });
  }

  public create(): void {
    this.audio = new UnicornAudioEngine();
    this.partyRoundIndex = 0;
    this.guestSlotIndex = 0;
    this.starsEarned = 0;
    this.treatsServedOnPlate = 0;
    this.stepTransitionLocked = false;
    this.trayButtons = [];
    this.activeSilhouettes = [];
    this.plateServedStickers = [];
    this.finaleStickers = [];
    this.idleElapsedSec = 0;
    this.helperHandActive = false;

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.audio.stopVoice();
    });

    // 1. Sunlit 32-Bit Pixel Art Royal Castle Garden Tea Table Backdrop
    this.buildGardenTeaStage();

    // 2. Scene Containers in strict painter's depth order
    this.stageLayer = this.add.container(0, 0).setDepth(20);
    this.tablePropsLayer = this.add.container(0, 0).setDepth(40);
    this.silhouetteLayer = this.add.container(0, 0).setDepth(55);
    this.trayLayer = this.add.container(0, 0).setDepth(80);
    this.finaleLayer = this.add.container(0, 0).setDepth(110);
    this.flightLayer = this.add.container(0, 0).setDepth(140);
    this.hudLayer = this.add.container(0, 0).setDepth(160);

    // 3. Top-Left Home Button (`92x92px`) + Top-Center 3-Crown-Star Progress Tracker
    this.buildTopHud();

    // 4. Bottom Ornate Velvet & Gold Royal Sticker Tray
    this.buildBottomVelvetTrayBackdrop();

    // 5. Princess Emma (left of table) + Porcelain Teacup & Royal China Plate on Table
    this.buildEmmaAndTableSetting();

    // 6. Automated Golden Helper Hand (hidden until 3.5s idle)
    this.buildGoldenHelperHand();

    // 7. Reset idle timer on any pointer interaction
    this.input.on('pointerdown', () => {
      this.resetIdleHelperTimer();
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) {
        this.resetIdleHelperTimer();
      }
    });

    // 8. Start Guest 1 (The Magical White Winged Unicorn)
    // Delay the first step voice prompt slightly if HubScene's title announcement is finishing
    this.startGuestEncounter(0, true);

    this.cameras.main.fadeIn(260, 20, 10, 28);
  }

  public update(time: number, delta: number): void {
    const dt = delta / 1000;

    // Gentle holographic foil sheen sweep across the 3 Puffy Stickers in the bottom tray
    for (let i = 0; i < this.trayButtons.length; i++) {
      const btn = this.trayButtons[i];
      if (!btn.consumed && btn.sheenBar.scene) {
        const sweep = Math.sin(time * 0.0024 + i * 1.3) * 58;
        btn.sheenBar.x = sweep;
      }
    }

    // Animate living stickers during the Grand Finale Party
    if (this.currentStep === 'FINALE_PARTY') {
      for (const ls of this.finaleStickers) {
        if (!ls.container.scene) continue;
        const t = time * 0.004 + ls.phase;
        if (ls.animMode === 'BOUNCE') {
          ls.container.y = ls.baseY - Math.abs(Math.sin(t * 1.35)) * 16;
          ls.container.scaleX = ls.baseScale * (1 + Math.sin(t * 2.7) * 0.05);
          ls.container.scaleY = ls.baseScale * (1 - Math.sin(t * 2.7) * 0.05);
        } else if (ls.animMode === 'TWIRL') {
          ls.container.angle = Math.sin(t * 1.5) * 12;
          ls.container.y = ls.baseY + Math.sin(t * 2.0) * 7;
        } else if (ls.animMode === 'FLUTTER') {
          ls.container.y = ls.baseY + Math.sin(t * 2.1) * 14;
          ls.container.angle = Math.cos(t * 1.6) * 8;
        } else {
          ls.container.angle = Math.sin(t * 1.2) * 7;
          ls.container.scaleX = ls.baseScale * (1 + Math.sin(t * 1.8) * 0.04);
        }
      }
      return;
    }

    // 3.5-Second Idle Timer for Automated Golden Helper Hand
    if (!this.stepTransitionLocked && this.activeSilhouettes.length > 0) {
      this.idleElapsedSec += dt;
      if (this.idleElapsedSec >= 3.5 && !this.helperHandActive) {
        this.showGoldenHelperHand();
      }
    }
  }

  // ===========================================================================
  // 1. STAGE BACKDROP, TOP HUD (3 CROWN-STARS) & VELVET STICKER TRAY
  // ===========================================================================

  private buildGardenTeaStage(): void {
    const bgKey = this.textures.exists('unicorn-teaparty-bg')
      ? 'unicorn-teaparty-bg'
      : 'unicorn-spa-bg';
    const bg = this.add.image(640, 360, bgKey).setDisplaySize(1280, 720).setDepth(1);
    if (this.textures.exists(bgKey)) {
      this.textures.get(bgKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    bg.setAlpha(1);

    // Warm sunlit royal tablecloth runner across the center garden tea table
    const tableCloth = this.add.graphics().setDepth(12);
    // Soft table drop shadow
    tableCloth.fillStyle(0x1e0b2e, 0.34);
    tableCloth.fillEllipse(650, 456, 760, 165);
    // Cream-and-rose royal lace table surface so porcelain teacup & plate pop with 100% clarity
    tableCloth.fillStyle(0xfff1f2, 0.94);
    tableCloth.fillEllipse(650, 442, 736, 150);
    tableCloth.lineStyle(5, 0xfbbf24, 0.95);
    tableCloth.strokeEllipse(650, 442, 736, 150);
    tableCloth.lineStyle(2, 0xf472b6, 0.75);
    tableCloth.strokeEllipse(650, 442, 706, 130);

    // Gentle floating garden sparkles in the sunlit background
    for (let i = 0; i < 12; i++) {
      const sx = Phaser.Math.Between(90, 1190);
      const sy = Phaser.Math.Between(95, 470);
      const star = this.add
        .star(sx, sy, 4, 2, 6, i % 2 === 0 ? 0xfef08a : 0xfbcfe8, 0.65)
        .setDepth(8);
      this.tweens.add({
        targets: star,
        alpha: { from: 0.2, to: 0.85 },
        scale: { from: 0.7, to: 1.25 },
        y: sy - Phaser.Math.Between(10, 24),
        duration: Phaser.Math.Between(1600, 2800),
        yoyo: true,
        repeat: -1,
        delay: i * 160,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private buildTopHud(): void {
    // 1. Oversized Tactile Home / Bookshelf Button (`92x92px` at top-left `x: 68, y: 56`)
    const homeBtn = this.add.container(68, 56);
    const homeG = this.add.graphics();
    homeG.fillStyle(0x1f0933, 0.94);
    homeG.fillRoundedRect(-44, -44, 88, 88, 22);
    homeG.lineStyle(4, 0xfbbf24, 1);
    homeG.strokeRoundedRect(-44, -44, 88, 88, 22);
    homeG.lineStyle(1.5, 0xfef08a, 0.7);
    homeG.strokeRoundedRect(-38, -38, 76, 76, 18);
    homeBtn.add(homeG);

    if (this.textures.exists('tool-bookshelf')) {
      const icon = this.add.image(0, -2, 'tool-bookshelf').setDisplaySize(54, 54);
      homeBtn.add(icon);
    } else {
      const txt = this.add.text(0, 0, '🏠', { fontSize: '40px' }).setOrigin(0.5);
      homeBtn.add(txt);
    }

    Juice.makeTactileButton(
      this,
      homeBtn,
      92,
      92,
      () => {
        this.audio.stopVoice();
        AudioBus.playSfx('pop');
        this.scene.start('HubScene');
      },
      'pop'
    );
    this.hudLayer.add(homeBtn);

    // 2. Visible 3-Star Party Progress Tracker (`[ ☆ ]  [ ☆ ]  [ ☆ ]` at Top Center `x: 640, y: 54`)
    const trackerBanner = this.add.container(640, 54);
    const bannerG = this.add.graphics();
    bannerG.fillStyle(0x2e0b46, 0.94);
    bannerG.fillRoundedRect(-210, -40, 420, 80, 40);
    bannerG.lineStyle(4, 0xfbbf24, 1);
    bannerG.strokeRoundedRect(-210, -40, 420, 80, 40);
    bannerG.lineStyle(2, 0xf9a8d4, 0.8);
    bannerG.strokeRoundedRect(-202, -33, 404, 66, 34);
    trackerBanner.add(bannerG);

    this.starSlotContainers = [];
    this.starSlotFills = [];
    const slotOffsets = [-124, 0, 124];

    for (let i = 0; i < 3; i++) {
      const slotC = this.add.container(slotOffsets[i], 0);
      // Empty recessed golden star socket
      const emptySocket = this.add.graphics();
      emptySocket.fillStyle(0x160424, 0.9);
      emptySocket.fillCircle(0, 0, 30);
      emptySocket.lineStyle(2.5, 0xb45309, 0.9);
      emptySocket.strokeCircle(0, 0, 30);
      const emptyStar = this.add.star(0, 0, 5, 11, 23, 0x4c1d95, 0.75);
      emptyStar.setStrokeStyle(2, 0xfbbf24, 0.65);
      slotC.add([emptySocket, emptyStar]);

      // Filled glowing Golden Crown-Star (revealed when guest completes Step 3)
      const fillC = this.add.container(0, 0).setVisible(false).setScale(0);
      const halo = this.add.circle(0, 0, 33, 0xfef08a, 0.35);
      const goldStar = this.add.star(0, 2, 5, 13, 27, 0xfacc15, 1);
      goldStar.setStrokeStyle(3, 0xffffff, 1);
      fillC.add([halo, goldStar]);
      if (this.textures.exists('acc-royal-tiara')) {
        const miniCrown = this.add
          .image(0, -14, 'acc-royal-tiara')
          .setDisplaySize(34, 24);
        fillC.add(miniCrown);
      }
      slotC.add(fillC);

      trackerBanner.add(slotC);
      this.starSlotContainers.push(slotC);
      this.starSlotFills.push(fillC);
    }

    this.hudLayer.add(trackerBanner);
  }

  private buildBottomVelvetTrayBackdrop(): void {
    const trayBg = this.add.graphics();
    // Drop shadow
    trayBg.fillStyle(0x090214, 0.65);
    trayBg.fillRoundedRect(206, 528, 876, 184, 34);
    // Royal velvet plum-and-rose cushion
    trayBg.fillStyle(0x3b0764, 0.96);
    trayBg.fillRoundedRect(202, 522, 876, 184, 34);
    // Recessed inner sticker well
    trayBg.fillStyle(0x581c87, 0.92);
    trayBg.fillRoundedRect(220, 536, 840, 156, 26);
    // Ornate polished gold bezel
    trayBg.lineStyle(5, 0xfbbf24, 1);
    trayBg.strokeRoundedRect(202, 522, 876, 184, 34);
    trayBg.lineStyle(2, 0xfef08a, 0.8);
    trayBg.strokeRoundedRect(212, 530, 856, 168, 28);

    // 3 Recessed Velvet Sticker Backing Pads (`145x145px` slots at `x = 400, 640, 880`)
    for (const sx of this.TRAY_SLOT_XS) {
      trayBg.fillStyle(0x2e1065, 0.78);
      trayBg.fillRoundedRect(sx - 76, this.TRAY_Y - 76, 152, 152, 26);
      trayBg.lineStyle(2, 0xc084fc, 0.55);
      trayBg.strokeRoundedRect(sx - 76, this.TRAY_Y - 76, 152, 152, 26);
    }

    this.trayLayer.add(trayBg);
  }

  private buildEmmaAndTableSetting(): void {
    // 1. Princess Emma on the Left of the Royal Tea Table (`x: 235, y: 318`)
    this.emmaContainer = this.add.container(this.EMMA_POS.x, this.EMMA_POS.y);
    const emmaShadow = this.add.ellipse(0, 126, 150, 34, 0x1e0b2e, 0.38);
    this.emmaSprite = this.add
      .image(0, 0, 'char-emma-princess')
      .setScale(0.95);
    this.emmaContainer.add([emmaShadow, this.emmaSprite]);
    this.stageLayer.add(this.emmaContainer);

    // Gentle breathing bounce for Princess Emma
    this.tweens.add({
      targets: this.emmaSprite,
      y: -6,
      scaleY: 0.97,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Tapping Princess Emma waves her magic wand with a happy giggle/chime!
    const emmaHit = this.add
      .zone(0, 0, 180, 260)
      .setInteractive({ useHandCursor: true });
    this.emmaContainer.add(emmaHit);
    emmaHit.on('pointerdown', () => {
      this.cheerEmma();
      this.audio.playSparkleBrush(2);
    });

    // 2. Guest Container Across/Beside the Table (`x: 845, y: 274`)
    this.guestContainer = this.add.container(this.GUEST_POS.x, this.GUEST_POS.y);
    const guestShadow = this.add.ellipse(0, 134, 190, 40, 0x1e0b2e, 0.38);
    this.guestSprite = this.add.image(0, 0, 'char-unicorn-base');
    this.guestContainer.add([guestShadow, this.guestSprite]);
    this.stageLayer.add(this.guestContainer);

    // Floating Visual Wish Bubble beside the Guest (`x: 1085, y: 205`)
    this.wishBubbleContainer = this.add.container(1085, 205);
    this.stageLayer.add(this.wishBubbleContainer);

    // 3. Oversized Porcelain Teacup & Saucer on the Table (`x: 525, y: 416`)
    this.teacupContainer = this.add.container(this.TEACUP_POS.x, this.TEACUP_POS.y);
    const cupShadow = this.add.ellipse(0, 42, 138, 28, 0x1e0b2e, 0.32);
    const cupSprite = this.add.image(0, 0, 'tea-cup-saucer').setScale(0.96);
    this.teacupLiquidGraphics = this.add.graphics();
    this.teacupContainer.add([cupShadow, cupSprite, this.teacupLiquidGraphics]);
    this.tablePropsLayer.add(this.teacupContainer);

    // 4. Large Royal China Plate on the Table (`x: 805, y: 432`)
    this.plateContainer = this.add.container(this.PLATE_POS.x, this.PLATE_POS.y);
    const plateShadow = this.add.ellipse(0, 32, 224, 48, 0x1e0b2e, 0.32);
    const plateRim = this.add.graphics();
    plateRim.fillStyle(0xffffff, 0.98);
    plateRim.fillEllipse(0, 4, 218, 86);
    plateRim.lineStyle(4, 0xfbbf24, 1);
    plateRim.strokeEllipse(0, 4, 218, 86);
    plateRim.lineStyle(2, 0xf472b6, 0.65);
    plateRim.strokeEllipse(0, 4, 182, 66);
    const plateSprite = this.add
      .image(0, 0, 'tea-plate-silver')
      .setDisplaySize(210, 96)
      .setAlpha(0.92);
    this.plateContainer.add([plateShadow, plateRim, plateSprite]);
    this.tablePropsLayer.add(this.plateContainer);
  }

  private cheerEmma(): void {
    if (!this.emmaSprite.scene) return;
    if (this.textures.exists('char-emma-wand')) {
      this.emmaSprite.setTexture('char-emma-wand');
      this.time.delayedCall(750, () => {
        if (this.emmaSprite.scene) {
          this.emmaSprite.setTexture('char-emma-princess');
        }
      });
    }
    Juice.squashAndStretch(this, this.emmaContainer, 0.16, 220);
    Juice.burstStars(this, this.EMMA_POS.x + 40, this.EMMA_POS.y - 60, 8, [
      0xfef08a,
      0xf472b6,
      0xc084fc
    ]);
  }

  // ===========================================================================
  // 2. PUFFY FOIL STICKER FACTORY (DIE-CUT WHITE BORDER + DROP SHADOW + SHEEN)
  // ===========================================================================

  /**
   * Builds a tangible *Yoshi's Crafted World*-style Puffy Foil Sticker container (`145x145px`
   * in tray or custom size on target) with:
   *   - Soft velvet drop shadow,
   *   - Thick white die-cut sticker backing cushion + 8-way white silhouette border,
   *   - Optional pastel/foil tint and shape gem badge,
   *   - Specular diagonal foil sheen bar.
   */
  private createPuffyStickerVisual(
    spec: TrayStickerSpec,
    targetBoxPx = 136
  ): {
    container: Phaser.GameObjects.Container;
    sheenBar: Phaser.GameObjects.Rectangle;
  } {
    const c = this.add.container(0, 0);

    // 1. Soft 3D Puffy Sticker Drop Shadow
    const dropShadow = this.add.ellipse(4, 10, targetBoxPx * 0.92, targetBoxPx * 0.86, 0x140424, 0.42);
    c.add(dropShadow);

    // 2. White Die-Cut Puffy Vinyl Cushion Backing Plate + Foil Accent Rim
    const dieCutPad = this.add.graphics();
    const r = targetBoxPx * 0.48;
    dieCutPad.fillStyle(0xffffff, 0.98);
    dieCutPad.fillCircle(0, 0, r);
    dieCutPad.lineStyle(5, 0xffffff, 1);
    dieCutPad.strokeCircle(0, 0, r + 2);
    dieCutPad.lineStyle(3, spec.accentColor, 0.92);
    dieCutPad.strokeCircle(0, 0, r - 5);
    // Subtle inner pastel foil glow
    dieCutPad.fillStyle(spec.accentColor, 0.16);
    dieCutPad.fillCircle(0, 0, r - 6);
    c.add(dieCutPad);

    // 3. 8-Way White Die-Cut Silhouette Offset Copies around the Sprite itself
    const spriteKey = this.textures.exists(spec.spriteKey) ? spec.spriteKey : 'treat-cupcake';
    const tex = this.textures.get(spriteKey).getSourceImage() as HTMLImageElement;
    const natW = tex?.width || 140;
    const natH = tex?.height || 140;
    const fitScale = Math.min((targetBoxPx * 0.82) / natW, (targetBoxPx * 0.82) / natH);

    const offsets = [
      [-4, 0],
      [4, 0],
      [0, -4],
      [0, 4],
      [-3, -3],
      [3, -3],
      [-3, 3],
      [3, 3]
    ];
    for (const [ox, oy] of offsets) {
      const sil = this.add
        .image(ox, oy, spriteKey)
        .setScale(fitScale)
        .setTintFill(0xffffff);
      c.add(sil);
    }

    // 4. Main Crisp 32-Bit Pixel Art Sticker Sprite
    const mainImg = this.add.image(0, 0, spriteKey).setScale(fitScale);
    if (spec.tintHex !== undefined) {
      mainImg.setTint(spec.tintHex);
    }
    c.add(mainImg);

    // 5. Optional Center/Corner Shape Gem Emblem (for Crown/Bow Color+Shape matching!)
    if (spec.badgeGemKey && this.textures.exists(spec.badgeGemKey)) {
      const gemBg = this.add.circle(0, 10, 22, 0xffffff, 0.95);
      const gemImg = this.add
        .image(0, 10, spec.badgeGemKey)
        .setDisplaySize(38, 38);
      c.add([gemBg, gemImg]);
    }

    // 6. Specular Foil Sheen Sweep Bar
    const sheenBar = this.add
      .rectangle(-36, -6, 16, targetBoxPx * 0.76, 0xffffff, 0.34)
      .setAngle(25);
    c.add(sheenBar);

    return { container: c, sheenBar };
  }

  // ===========================================================================
  // 3. SCENARIO GENERATOR FOR EACH TEA PARTY GUEST
  // ===========================================================================

  private buildScenarioForGuestSlot(slotIdx: number): GuestScenario {
    // Guests 0, 1, 2 on Round 0 are Unicorn, Doggie, Sparky.
    // On subsequent Play Again rounds (`partyRoundIndex > 0`), Babci & Grandpa join the rotation!
    const guestOrder: GuestId[] =
      this.partyRoundIndex % 2 === 1
        ? ['UNICORN', 'GRANDPARENTS', 'DOGGIE']
        : ['UNICORN', 'DOGGIE', 'SPARKY'];

    const guestId = guestOrder[slotIdx % guestOrder.length];
    const variant = (this.partyRoundIndex + slotIdx) % 2;

    if (guestId === 'UNICORN') {
      const usePurpleStar = variant === 1;
      const targetCrown: TrayStickerSpec = usePurpleStar
        ? {
            id: 'crown-purple-star',
            spriteKey: 'acc-royal-tiara',
            tintHex: 0xd8b4fe,
            badgeGemKey: 'gem-star-topaz',
            accentColor: 0xa855f7,
            colorKey: 'purple',
            isCorrect: true
          }
        : {
            id: 'crown-pink-heart',
            spriteKey: 'acc-royal-tiara',
            tintHex: 0xf9a8d4,
            badgeGemKey: 'gem-heart-quartz',
            accentColor: 0xf43f5e,
            colorKey: 'pink',
            isCorrect: true
          };

      return {
        guestId: 'UNICORN',
        name: 'Magical Unicorn',
        baseSpriteKey: 'char-unicorn-base',
        happySpriteKey: 'char-unicorn-happy',
        guestScale: 0.96,
        headOffset: { x: -32, y: -102 },
        mouthOffset: { x: -45, y: -42 },
        step1PromptId: usePurpleStar ? 'step1_unicorn_purple_star' : 'step1_unicorn_pink_heart',
        targetCrownSticker: targetCrown,
        distractorCrowns: [
          {
            id: 'crown-blue-circle',
            spriteKey: 'stk-diamond-crown',
            tintHex: 0x7dd3fc,
            badgeGemKey: 'gem-circle-ruby',
            accentColor: 0x0284c7,
            colorKey: 'blue',
            isCorrect: false
          },
          {
            id: 'crown-green-square',
            spriteKey: 'acc-wing-bow',
            tintHex: 0x6ee7b7,
            badgeGemKey: 'gem-square-emerald',
            accentColor: 0x10b981,
            colorKey: 'green',
            isCorrect: false
          }
        ],
        step2PromptId: 'step2_pour_pink_tea',
        teaLiquidColor: 0xf472b6,
        teaSparkleColor: 0xfbcfe8,
        targetTeapotSticker: {
          id: 'teapot-pink',
          spriteKey: 'tea-teapot',
          tintHex: 0xf9a8d4,
          badgeGemKey: 'gem-heart-quartz',
          accentColor: 0xf43f5e,
          colorKey: 'pink',
          isCorrect: true
        },
        distractorTeapots: [
          {
            id: 'teapot-blue',
            spriteKey: 'tea-teapot',
            tintHex: 0x7dd3fc,
            badgeGemKey: 'gem-triangle-sapphire',
            accentColor: 0x0284c7,
            colorKey: 'blue',
            isCorrect: false
          },
          {
            id: 'teapot-gold',
            spriteKey: 'tea-teapot',
            tintHex: 0xfde047,
            badgeGemKey: 'gem-star-topaz',
            accentColor: 0xf59e0b,
            colorKey: 'yellow',
            isCorrect: false
          }
        ],
        step3PromptId: 'step3_put_3_cupcakes',
        treatCount: 3,
        treatFinalSummaryPromptId: 'tea_count_cupcakes',
        targetTreatSpriteKey: 'treat-cupcake',
        trayTreatStickers: [
          {
            id: 'treat-1',
            spriteKey: 'treat-cupcake',
            accentColor: 0xf472b6,
            colorKey: 'pink',
            isCorrect: true
          },
          {
            id: 'treat-2',
            spriteKey: 'treat-cupcake',
            accentColor: 0xc084fc,
            colorKey: 'purple',
            isCorrect: true
          },
          {
            id: 'treat-3',
            spriteKey: 'treat-cupcake',
            accentColor: 0xfbbf24,
            colorKey: 'yellow',
            isCorrect: true
          }
        ]
      };
    }

    if (guestId === 'DOGGIE') {
      const useBlueCircle = variant === 1;
      const targetCrown: TrayStickerSpec = useBlueCircle
        ? {
            id: 'crown-blue-circle',
            spriteKey: 'stk-diamond-crown',
            tintHex: 0x7dd3fc,
            badgeGemKey: 'gem-circle-ruby',
            accentColor: 0x0284c7,
            colorKey: 'blue',
            isCorrect: true
          }
        : {
            id: 'crown-yellow-star',
            spriteKey: 'stk-diamond-crown',
            tintHex: 0xfde047,
            badgeGemKey: 'gem-star-topaz',
            accentColor: 0xf59e0b,
            colorKey: 'yellow',
            isCorrect: true
          };

      return {
        guestId: 'DOGGIE',
        name: 'Royal Doggie',
        baseSpriteKey: 'char-doggie-crown',
        happySpriteKey: 'char-doggie-crown',
        guestScale: 1.04,
        headOffset: { x: -4, y: -96 },
        mouthOffset: { x: -12, y: -28 },
        step1PromptId: useBlueCircle ? 'step1_doggie_blue_circle' : 'step1_doggie_yellow_star',
        targetCrownSticker: targetCrown,
        distractorCrowns: [
          {
            id: 'crown-pink-heart',
            spriteKey: 'acc-royal-tiara',
            tintHex: 0xf9a8d4,
            badgeGemKey: 'gem-heart-quartz',
            accentColor: 0xf43f5e,
            colorKey: 'pink',
            isCorrect: false
          },
          {
            id: 'crown-green-square',
            spriteKey: 'acc-wing-bow',
            tintHex: 0x6ee7b7,
            badgeGemKey: 'gem-square-emerald',
            accentColor: 0x10b981,
            colorKey: 'green',
            isCorrect: false
          }
        ],
        step2PromptId: 'step2_pour_blue_tea',
        teaLiquidColor: 0x38bdf8,
        teaSparkleColor: 0xbae6fd,
        targetTeapotSticker: {
          id: 'teapot-blue',
          spriteKey: 'tea-teapot',
          tintHex: 0x7dd3fc,
          badgeGemKey: 'gem-triangle-sapphire',
          accentColor: 0x0284c7,
          colorKey: 'blue',
          isCorrect: true
        },
        distractorTeapots: [
          {
            id: 'teapot-pink',
            spriteKey: 'tea-teapot',
            tintHex: 0xf9a8d4,
            badgeGemKey: 'gem-heart-quartz',
            accentColor: 0xf43f5e,
            colorKey: 'pink',
            isCorrect: false
          },
          {
            id: 'teapot-gold',
            spriteKey: 'tea-teapot',
            tintHex: 0xfde047,
            badgeGemKey: 'gem-star-topaz',
            accentColor: 0xf59e0b,
            colorKey: 'yellow',
            isCorrect: false
          }
        ],
        step3PromptId: 'step3_put_2_cookies',
        treatCount: 2,
        treatFinalSummaryPromptId: 'tea_count_cookies',
        targetTreatSpriteKey: 'treat-star-cookie',
        trayTreatStickers: [
          {
            id: 'treat-1',
            spriteKey: 'treat-star-cookie',
            accentColor: 0xfbbf24,
            colorKey: 'yellow',
            isCorrect: true
          },
          {
            id: 'treat-2',
            spriteKey: 'treat-star-cookie',
            accentColor: 0x38bdf8,
            colorKey: 'blue',
            isCorrect: true
          },
          {
            id: 'treat-3',
            spriteKey: 'treat-star-cookie',
            accentColor: 0xf472b6,
            colorKey: 'pink',
            isCorrect: true
          }
        ]
      };
    }

    if (guestId === 'GRANDPARENTS') {
      return {
        guestId: 'GRANDPARENTS',
        name: 'Babci & Grandpa',
        baseSpriteKey: this.textures.exists('spr-grandpa-babci-wave')
          ? 'spr-grandpa-babci-wave'
          : 'char-unicorn-happy',
        happySpriteKey: this.textures.exists('spr-grandpa-babci-wave')
          ? 'spr-grandpa-babci-wave'
          : 'char-unicorn-happy',
        guestScale: 0.94,
        headOffset: { x: 0, y: -102 },
        mouthOffset: { x: -10, y: -38 },
        step1PromptId: 'step1_grandparents_gold_crown',
        targetCrownSticker: {
          id: 'crown-yellow-star',
          spriteKey: 'acc-royal-tiara',
          tintHex: 0xfde047,
          badgeGemKey: 'gem-star-topaz',
          accentColor: 0xf59e0b,
          colorKey: 'yellow',
          isCorrect: true
        },
        distractorCrowns: [
          {
            id: 'crown-blue-circle',
            spriteKey: 'stk-diamond-crown',
            tintHex: 0x7dd3fc,
            badgeGemKey: 'gem-circle-ruby',
            accentColor: 0x0284c7,
            colorKey: 'blue',
            isCorrect: false
          },
          {
            id: 'crown-purple-star',
            spriteKey: 'acc-wing-bow',
            tintHex: 0xd8b4fe,
            badgeGemKey: 'gem-heart-quartz',
            accentColor: 0xa855f7,
            colorKey: 'purple',
            isCorrect: false
          }
        ],
        step2PromptId: 'step2_pour_gold_tea',
        teaLiquidColor: 0xfbbf24,
        teaSparkleColor: 0xfef08a,
        targetTeapotSticker: {
          id: 'teapot-gold',
          spriteKey: 'tea-teapot',
          tintHex: 0xfde047,
          badgeGemKey: 'gem-star-topaz',
          accentColor: 0xf59e0b,
          colorKey: 'yellow',
          isCorrect: true
        },
        distractorTeapots: [
          {
            id: 'teapot-pink',
            spriteKey: 'tea-teapot',
            tintHex: 0xf9a8d4,
            badgeGemKey: 'gem-heart-quartz',
            accentColor: 0xf43f5e,
            colorKey: 'pink',
            isCorrect: false
          },
          {
            id: 'teapot-blue',
            spriteKey: 'tea-teapot',
            tintHex: 0x7dd3fc,
            badgeGemKey: 'gem-triangle-sapphire',
            accentColor: 0x0284c7,
            colorKey: 'blue',
            isCorrect: false
          }
        ],
        step3PromptId: 'step3_put_2_cupcakes',
        treatCount: 2,
        treatFinalSummaryPromptId: 'count_2_cupcakes',
        targetTreatSpriteKey: 'treat-cupcake',
        trayTreatStickers: [
          {
            id: 'treat-1',
            spriteKey: 'treat-cupcake',
            accentColor: 0xf472b6,
            colorKey: 'pink',
            isCorrect: true
          },
          {
            id: 'treat-2',
            spriteKey: 'treat-cupcake',
            accentColor: 0xfbbf24,
            colorKey: 'yellow',
            isCorrect: true
          },
          {
            id: 'treat-3',
            spriteKey: 'treat-cupcake',
            accentColor: 0xc084fc,
            colorKey: 'purple',
            isCorrect: true
          }
        ]
      };
    }

    // Default Guest 3: Dapper Sparky (`SPARKY`)
    const usePinkBow = variant === 1;
    const useThreeHearts = variant === 1;
    return {
      guestId: 'SPARKY',
      name: 'Dapper Sparky',
      baseSpriteKey: 'char-sparky-bowtie',
      happySpriteKey: 'char-sparky-bowtie',
      guestScale: 1.0,
      headOffset: { x: 4, y: -96 },
      mouthOffset: { x: -16, y: -32 },
      step1PromptId: usePinkBow ? 'step1_sparky_pink_heart' : 'step1_sparky_green_square',
      targetCrownSticker: usePinkBow
        ? {
            id: 'bow-pink-heart',
            spriteKey: 'acc-wing-bow',
            tintHex: 0xf9a8d4,
            badgeGemKey: 'gem-heart-quartz',
            accentColor: 0xf43f5e,
            colorKey: 'pink',
            isCorrect: true
          }
        : {
            id: 'bow-green-square',
            spriteKey: 'acc-wing-bow',
            tintHex: 0x6ee7b7,
            badgeGemKey: 'gem-square-emerald',
            accentColor: 0x10b981,
            colorKey: 'green',
            isCorrect: true
          },
      distractorCrowns: [
        {
          id: 'crown-blue-circle',
          spriteKey: 'stk-diamond-crown',
          tintHex: 0x7dd3fc,
          badgeGemKey: 'gem-circle-ruby',
          accentColor: 0x0284c7,
          colorKey: 'blue',
          isCorrect: false
        },
        {
          id: 'crown-yellow-star',
          spriteKey: 'acc-royal-tiara',
          tintHex: 0xfde047,
          badgeGemKey: 'gem-star-topaz',
          accentColor: 0xf59e0b,
          colorKey: 'yellow',
          isCorrect: false
        }
      ],
      step2PromptId: 'step2_pour_gold_tea',
      teaLiquidColor: 0xfbbf24,
      teaSparkleColor: 0xfef08a,
      targetTeapotSticker: {
        id: 'teapot-gold',
        spriteKey: 'tea-teapot',
        tintHex: 0xfde047,
        badgeGemKey: 'gem-star-topaz',
        accentColor: 0xf59e0b,
        colorKey: 'yellow',
        isCorrect: true
      },
      distractorTeapots: [
        {
          id: 'teapot-pink',
          spriteKey: 'tea-teapot',
          tintHex: 0xf9a8d4,
          badgeGemKey: 'gem-heart-quartz',
          accentColor: 0xf43f5e,
          colorKey: 'pink',
          isCorrect: false
        },
        {
          id: 'teapot-blue',
          spriteKey: 'tea-teapot',
          tintHex: 0x7dd3fc,
          badgeGemKey: 'gem-triangle-sapphire',
          accentColor: 0x0284c7,
          colorKey: 'blue',
          isCorrect: false
        }
      ],
      step3PromptId: useThreeHearts ? 'step3_put_3_hearts' : 'step3_put_1_cupcake',
      treatCount: useThreeHearts ? 3 : 1,
      treatFinalSummaryPromptId: useThreeHearts ? 'count_3_hearts' : 'count_1_cupcake',
      targetTreatSpriteKey: useThreeHearts ? 'treat-sugar-heart' : 'treat-cupcake',
      trayTreatStickers: useThreeHearts
        ? [
            {
              id: 'treat-1',
              spriteKey: 'treat-sugar-heart',
              accentColor: 0xf43f5e,
              colorKey: 'pink',
              isCorrect: true
            },
            {
              id: 'treat-2',
              spriteKey: 'treat-sugar-heart',
              accentColor: 0xc084fc,
              colorKey: 'purple',
              isCorrect: true
            },
            {
              id: 'treat-3',
              spriteKey: 'treat-sugar-heart',
              accentColor: 0xfbbf24,
              colorKey: 'yellow',
              isCorrect: true
            }
          ]
        : [
            {
              id: 'treat-1',
              spriteKey: 'treat-cupcake',
              accentColor: 0xf472b6,
              colorKey: 'pink',
              isCorrect: true
            },
            {
              id: 'treat-2',
              spriteKey: 'treat-cupcake',
              accentColor: 0x38bdf8,
              colorKey: 'blue',
              isCorrect: true
            },
            {
              id: 'treat-3',
              spriteKey: 'treat-cupcake',
              accentColor: 0xfbbf24,
              colorKey: 'yellow',
              isCorrect: true
            }
          ]
    };
  }

  // ===========================================================================
  // 4. SEQUENTIAL 3-STEP TEA PARTY FLOW
  // ===========================================================================

  private startGuestEncounter(slotIdx: number, isInitialSceneLoad = false): void {
    this.guestSlotIndex = slotIdx;
    this.activeScenario = this.buildScenarioForGuestSlot(slotIdx);
    this.treatsServedOnPlate = 0;
    this.stepTransitionLocked = true;

    // Clear previous guest's worn crown, teacup fill, and plate treats
    if (this.guestWornCrownContainer) {
      this.guestWornCrownContainer.destroy(true);
      this.guestWornCrownContainer = null;
    }
    this.teacupLiquidGraphics.clear();
    for (const ps of this.plateServedStickers) {
      ps.destroy(true);
    }
    this.plateServedStickers = [];
    this.clearSilhouettes();
    this.wishBubbleContainer.removeAll(true);

    // Entrance animation for the focal Guest
    this.tweens.killTweensOf(this.guestSprite);
    this.guestSprite
      .setTexture(this.activeScenario.baseSpriteKey)
      .setScale(this.activeScenario.guestScale);

    this.guestContainer.setPosition(this.GUEST_POS.x + 220, this.GUEST_POS.y);
    this.guestContainer.setAlpha(0);

    this.tweens.add({
      targets: this.guestContainer,
      x: this.GUEST_POS.x,
      alpha: 1,
      duration: 420,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Gentle idle bob for Guest
        this.tweens.add({
          targets: this.guestSprite,
          y: { from: 0, to: -7 },
          duration: 1400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });

        this.enterStep1DressCrown(isInitialSceneLoad);
      }
    });
  }

  /**
   * STEP 1: Dress the Guest with a Royal Crown / Bow Puffy Sticker (Color & Shape Matching).
   */
  private enterStep1DressCrown(delayPromptForHubAudio = false): void {
    this.currentStep = 'STEP1_CROWN';
    this.stepTransitionLocked = false;
    this.clearSilhouettes();

    const headWorldX = this.GUEST_POS.x + this.activeScenario.headOffset.x;
    const headWorldY = this.GUEST_POS.y + this.activeScenario.headOffset.y;

    // 1. Pulsing Golden Dotted Silhouette directly on the Guest's head
    this.spawnPulsingSilhouette(
      headWorldX,
      headWorldY,
      this.activeScenario.targetCrownSticker.spriteKey,
      108,
      this.activeScenario.targetCrownSticker.badgeGemKey
    );

    // 2. Visual Thought Bubble showing the exact Crown/Bow Sticker requested
    this.renderGuestThoughtBubble([this.activeScenario.targetCrownSticker], 1);

    // 3. Populate the Bottom Velvet Sticker Tray with 3 oversized 145x145 Crown/Bow Stickers
    const choices = Phaser.Utils.Array.Shuffle([
      this.activeScenario.targetCrownSticker,
      this.activeScenario.distractorCrowns[0],
      this.activeScenario.distractorCrowns[1]
    ]);
    this.populateStickerTray(choices);

    // 4. Speak the clear 1-step instruction
    const delayMs = delayPromptForHubAudio ? 1600 : 120;
    this.time.delayedCall(delayMs, () => {
      if (this.currentStep === 'STEP1_CROWN') {
        this.audio.speakPrompt(this.activeScenario.step1PromptId);
      }
    });

    this.resetIdleHelperTimer();
  }

  /**
   * STEP 2: Pour the Shimmering Royal Tea (Cause & Effect).
   */
  private enterStep2PourTea(): void {
    this.currentStep = 'STEP2_TEAPOT';
    this.stepTransitionLocked = false;
    this.clearSilhouettes();

    // 1. Pulsing Golden Dotted Teapot Silhouette above the Guest's Porcelain Teacup
    this.spawnPulsingSilhouette(
      this.TEAPOT_POUR_POS.x,
      this.TEAPOT_POUR_POS.y,
      'tea-teapot',
      128,
      this.activeScenario.targetTeapotSticker.badgeGemKey
    );

    // 2. Visual Thought Bubble showing the requested Teapot Sticker
    this.renderGuestThoughtBubble([this.activeScenario.targetTeapotSticker], 1);

    // 3. Populate the Bottom Velvet Sticker Tray with 3 oversized 145x145 Teapot Stickers
    const choices = Phaser.Utils.Array.Shuffle([
      this.activeScenario.targetTeapotSticker,
      this.activeScenario.distractorTeapots[0],
      this.activeScenario.distractorTeapots[1]
    ]);
    this.populateStickerTray(choices);

    // 4. Speak the clear 1-step instruction
    this.audio.speakPrompt(this.activeScenario.step2PromptId);
    this.resetIdleHelperTimer();
  }

  /**
   * STEP 3: Serve 1, 2, or 3 Cupcake & Treat Stickers onto the China Plate (Counting 1-3).
   */
  private enterStep3ServeTreats(): void {
    this.currentStep = 'STEP3_TREATS';
    this.stepTransitionLocked = false;
    this.treatsServedOnPlate = 0;
    this.clearSilhouettes();

    const count = this.activeScenario.treatCount;
    const plateCoords = this.getPlateSilhouetteCoords(count);

    // 1. Spawn `1`, `2`, or `3` pulsing golden dotted cupcake/treat silhouettes on the plate
    for (const pt of plateCoords) {
      this.spawnPulsingSilhouette(
        pt.x,
        pt.y,
        this.activeScenario.targetTreatSpriteKey,
        92
      );
    }

    // 2. Visual Thought Bubble showing the exact count (1, 2, or 3 treats)
    this.renderGuestThoughtBubble(
      [this.activeScenario.trayTreatStickers[0]],
      count
    );

    // 3. Populate the Bottom Velvet Sticker Tray with 3 delicious Puffy Treat Stickers
    this.populateStickerTray([...this.activeScenario.trayTreatStickers]);

    // 4. Speak the clear counting request
    this.audio.speakPrompt(this.activeScenario.step3PromptId);
    this.resetIdleHelperTimer();
  }

  private getPlateSilhouetteCoords(count: 1 | 2 | 3): Array<{ x: number; y: number }> {
    const cx = this.PLATE_POS.x;
    const cy = this.PLATE_POS.y - 10;
    if (count === 1) {
      return [{ x: cx, y: cy }];
    }
    if (count === 2) {
      return [
        { x: cx - 48, y: cy },
        { x: cx + 48, y: cy }
      ];
    }
    return [
      { x: cx - 64, y: cy + 4 },
      { x: cx, y: cy - 12 },
      { x: cx + 64, y: cy + 4 }
    ];
  }

  // ===========================================================================
  // 5. PULSING GOLDEN SILHOUETTES & THOUGHT BUBBLE
  // ===========================================================================

  private clearSilhouettes(): void {
    this.silhouetteLayer.removeAll(true);
    this.activeSilhouettes = [];
  }

  private spawnPulsingSilhouette(
    worldX: number,
    worldY: number,
    spriteKey: string,
    sizePx: number,
    badgeGemKey?: string
  ): void {
    const c = this.add.container(worldX, worldY);

    // Glowing golden dotted ring around silhouette
    const ringG = this.add.graphics();
    const radius = sizePx * 0.54;
    ringG.fillStyle(0xfef08a, 0.2);
    ringG.fillCircle(0, 0, radius);

    const numDots = 16;
    for (let i = 0; i < numDots; i++) {
      const a0 = (i / numDots) * Math.PI * 2;
      const dx = Math.cos(a0) * radius;
      const dy = Math.sin(a0) * radius;
      ringG.fillStyle(i % 2 === 0 ? 0xfde047 : 0xffffff, 0.95);
      ringG.fillCircle(dx, dy, 4);
    }
    c.add(ringG);

    // Golden silhouette cutout of the target sprite
    if (this.textures.exists(spriteKey)) {
      const tex = this.textures.get(spriteKey).getSourceImage() as HTMLImageElement;
      const fit = Math.min((sizePx * 0.84) / (tex?.width || 128), (sizePx * 0.84) / (tex?.height || 128));
      const silImg = this.add
        .image(0, 0, spriteKey)
        .setScale(fit)
        .setTintFill(0xfde047)
        .setAlpha(0.65);
      c.add(silImg);
    }

    if (badgeGemKey && this.textures.exists(badgeGemKey)) {
      const gemHint = this.add
        .image(0, 8, badgeGemKey)
        .setDisplaySize(30, 30)
        .setAlpha(0.85);
      c.add(gemHint);
    }

    this.tweens.add({
      targets: c,
      scaleX: { from: 0.93, to: 1.08 },
      scaleY: { from: 0.93, to: 1.08 },
      alpha: { from: 0.78, to: 1.0 },
      duration: 680,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.silhouetteLayer.add(c);
    this.activeSilhouettes.push({
      container: c,
      worldX,
      worldY,
      filled: false
    });
  }

  private renderGuestThoughtBubble(specs: TrayStickerSpec[], repeatCount: number): void {
    this.wishBubbleContainer.removeAll(true);

    const bg = this.add.graphics();
    // Thought bubble tail clouds pointing toward the Guest
    bg.fillStyle(0xffffff, 0.96);
    bg.lineStyle(3, 0xfbbf24, 1);
    bg.fillCircle(-112, 42, 11);
    bg.strokeCircle(-112, 42, 11);
    bg.fillCircle(-92, 24, 16);
    bg.strokeCircle(-92, 24, 16);

    // Main thought cloud card
    bg.fillRoundedRect(-95, -68, 190, 136, 36);
    bg.lineStyle(4, 0xfbbf24, 1);
    bg.strokeRoundedRect(-95, -68, 190, 136, 36);
    bg.lineStyle(2, 0xf472b6, 0.7);
    bg.strokeRoundedRect(-87, -60, 174, 120, 30);
    this.wishBubbleContainer.add(bg);

    const spec = specs[0];
    if (repeatCount === 1) {
      const preview = this.createPuffyStickerVisual(spec, 96);
      this.wishBubbleContainer.add(preview.container);
    } else if (repeatCount === 2) {
      [-38, 38].forEach((ox) => {
        const preview = this.createPuffyStickerVisual(spec, 72);
        preview.container.setPosition(ox, 0);
        this.wishBubbleContainer.add(preview.container);
      });
    } else {
      const coords = [
        { x: -46, y: 12 },
        { x: 0, y: -16 },
        { x: 46, y: 12 }
      ];
      coords.forEach((pt) => {
        const preview = this.createPuffyStickerVisual(spec, 64);
        preview.container.setPosition(pt.x, pt.y);
        this.wishBubbleContainer.add(preview.container);
      });
    }

    this.wishBubbleContainer.setScale(0);
    this.tweens.add({
      targets: this.wishBubbleContainer,
      scaleX: 1,
      scaleY: 1,
      duration: 320,
      ease: 'Back.easeOut'
    });
  }

  // ===========================================================================
  // 6. BOTTOM TRAY INTERACTION ("TAP OR DRAG" NO-FAIL NINTENDO CONTROL)
  // ===========================================================================

  private populateStickerTray(specs: TrayStickerSpec[]): void {
    // Destroy old tray sticker buttons (keep backdrop at index 0)
    for (const tb of this.trayButtons) {
      tb.root.destroy(true);
    }
    this.trayButtons = [];

    specs.slice(0, 3).forEach((spec, idx) => {
      const homeX = this.TRAY_SLOT_XS[idx];
      const homeY = this.TRAY_Y;

      const root = this.add.container(homeX, homeY);

      // Highlight ring for pulsing the correct sticker if a wrong one is tapped
      const highlightRing = this.add.graphics();
      highlightRing.lineStyle(5, 0xfef08a, 0.95);
      highlightRing.strokeCircle(0, 0, 76);
      highlightRing.setVisible(false);
      root.add(highlightRing);

      const { container: puffyCard, sheenBar } = this.createPuffyStickerVisual(spec, 142);
      root.add(puffyCard);

      // Gentle breathing idle bounce in tray
      this.tweens.add({
        targets: puffyCard,
        y: { from: 0, to: -6 },
        scaleX: { from: 1.0, to: 1.03 },
        scaleY: { from: 1.0, to: 0.97 },
        duration: 1250 + idx * 140,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      const hitZone = this.add
        .zone(0, 0, 156, 156)
        .setInteractive({ useHandCursor: true, draggable: true });
      this.input.setDraggable(hitZone);
      root.add(hitZone);

      const trayBtn: TrayStickerButton = {
        spec,
        root,
        puffyCard,
        sheenBar,
        highlightRing,
        homeX,
        homeY,
        consumed: false
      };

      let dragMoved = false;
      let downX = 0;
      let downY = 0;

      hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (this.stepTransitionLocked || trayBtn.consumed) return;
        this.resetIdleHelperTimer();
        dragMoved = false;
        downX = pointer.x;
        downY = pointer.y;

        // Tactile paper-curl lift feedback
        root.setDepth(150);
        this.tweens.add({
          targets: root,
          scaleX: 1.14,
          scaleY: 1.14,
          angle: -5,
          duration: 110,
          ease: 'Back.easeOut'
        });
      });

      hitZone.on('drag', (pointer: Phaser.Input.Pointer) => {
        if (this.stepTransitionLocked || trayBtn.consumed) return;
        if (Phaser.Math.Distance.Between(pointer.x, pointer.y, downX, downY) > 12) {
          dragMoved = true;
        }
        root.setPosition(pointer.x, pointer.y - 18);

        // Magnetic snap check (`190px` radius!) while dragging near an unfilled target silhouette
        if (trayBtn.spec.isCorrect) {
          const targetSil = this.findNearestUnfilledSilhouette(root.x, root.y);
          if (
            targetSil &&
            Phaser.Math.Distance.Between(root.x, root.y, targetSil.worldX, targetSil.worldY) <=
              this.SNAP_RADIUS_PX
          ) {
            this.peelAndFlyStickerToTarget(trayBtn, targetSil);
          }
        }
      });

      hitZone.on('pointerup', () => {
        if (this.stepTransitionLocked || trayBtn.consumed) return;

        // No-Fail "Tap OR Drag" Control:
        // If tapped in place (`!dragMoved`) OR released within 190px of target, check match!
        const targetSil = this.findNearestUnfilledSilhouette(root.x, root.y);
        const withinSnap =
          targetSil &&
          Phaser.Math.Distance.Between(root.x, root.y, targetSil.worldX, targetSil.worldY) <=
            this.SNAP_RADIUS_PX;

        if (!dragMoved || withinSnap) {
          if (trayBtn.spec.isCorrect && targetSil) {
            this.peelAndFlyStickerToTarget(trayBtn, targetSil);
            return;
          } else if (!trayBtn.spec.isCorrect) {
            this.handleWrongStickerSelection(trayBtn);
            return;
          }
        }

        // Otherwise spring smoothly back to its velvet tray slot
        this.returnStickerToTraySlot(trayBtn);
      });

      // Pop-in entrance animation into tray
      root.setScale(0);
      this.tweens.add({
        targets: root,
        scaleX: 1,
        scaleY: 1,
        duration: 260,
        delay: idx * 75,
        ease: 'Back.easeOut'
      });

      this.trayLayer.add(root);
      this.trayButtons.push(trayBtn);
    });
  }

  private findNearestUnfilledSilhouette(
    x: number,
    y: number
  ): {
    container: Phaser.GameObjects.Container;
    worldX: number;
    worldY: number;
    filled: boolean;
  } | null {
    let best: {
      container: Phaser.GameObjects.Container;
      worldX: number;
      worldY: number;
      filled: boolean;
    } | null = null;
    let bestDist = Infinity;

    for (const sil of this.activeSilhouettes) {
      if (sil.filled) continue;
      const d = Phaser.Math.Distance.Between(x, y, sil.worldX, sil.worldY);
      if (d < bestDist) {
        bestDist = d;
        best = sil;
      }
    }
    return best;
  }

  private returnStickerToTraySlot(trayBtn: TrayStickerButton): void {
    this.tweens.add({
      targets: trayBtn.root,
      x: trayBtn.homeX,
      y: trayBtn.homeY,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      duration: 240,
      ease: 'Back.easeOut',
      onComplete: () => {
        trayBtn.root.setDepth(1);
      }
    });
  }

  /**
   * Gentle, zero-punishment feedback when Emma taps or drags a non-matching color sticker:
   * wobbles the sticker, kindly speaks its color ("That one is blue."), and pulses the correct sticker!
   */
  private handleWrongStickerSelection(trayBtn: TrayStickerButton): void {
    this.audio.playGentleWobble();
    const colorPrompt = COLOR_HINT_PROMPTS[trayBtn.spec.colorKey];
    if (colorPrompt) {
      this.audio.speakPrompt(colorPrompt);
    }

    this.tweens.add({
      targets: trayBtn.root,
      x: trayBtn.homeX,
      y: trayBtn.homeY,
      scaleX: 1,
      scaleY: 1,
      angle: { from: -12, to: 12 },
      duration: 90,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        trayBtn.root.setAngle(0);
        trayBtn.root.setPosition(trayBtn.homeX, trayBtn.homeY);
      }
    });

    // Pulse the correct sticker(s) brighter to guide Emma's eye
    for (const btn of this.trayButtons) {
      if (btn.spec.isCorrect && !btn.consumed) {
        btn.highlightRing.setVisible(true);
        btn.highlightRing.setAlpha(1);
        this.tweens.add({
          targets: btn.root,
          scaleX: 1.15,
          scaleY: 1.15,
          duration: 180,
          yoyo: true,
          repeat: 2,
          onComplete: () => {
            btn.highlightRing.setVisible(false);
          }
        });
      }
    }
  }

  // ===========================================================================
  // 7. STICKER PEEL ARC, RAINBOW RIBBON TRAIL & STEP COMPLETION ANIMATIONS
  // ===========================================================================

  private peelAndFlyStickerToTarget(
    trayBtn: TrayStickerButton,
    targetSil: {
      container: Phaser.GameObjects.Container;
      worldX: number;
      worldY: number;
      filled: boolean;
    }
  ): void {
    if (trayBtn.consumed || targetSil.filled) return;
    trayBtn.consumed = true;
    targetSil.filled = true;
    this.resetIdleHelperTimer();

    // Lock transitions for Step 1 & Step 2 immediately; for Step 3 lock while flying
    this.stepTransitionLocked = true;

    // 1. Crisp paper-peel *SHHH-POP!* sound
    this.audio.playStickerPeel();

    // Move sticker to top flight layer
    const startX = trayBtn.root.x;
    const startY = trayBtn.root.y;
    const endX = targetSil.worldX;
    const endY = targetSil.worldY;
    const ctrlX = (startX + endX) * 0.5 + Phaser.Math.Between(-50, 50);
    const ctrlY = Math.min(startY, endY) - 115;

    this.trayLayer.remove(trayBtn.root, false);
    this.flightLayer.add(trayBtn.root);
    trayBtn.root.setPosition(startX, startY);

    // Curl/peel scale pop then Bezier arc flight with rainbow starlight trail
    const flightObj = { t: 0 };
    const rainbowColors = [0xf43f5e, 0xfbbf24, 0x34d399, 0x38bdf8, 0xc084fc];
    let trailTick = 0;

    this.tweens.add({
      targets: flightObj,
      t: 1,
      duration: 460,
      ease: 'Cubic.easeInOut',
      onUpdate: () => {
        const u = 1 - flightObj.t;
        const bx = u * u * startX + 2 * u * flightObj.t * ctrlX + flightObj.t * flightObj.t * endX;
        const by = u * u * startY + 2 * u * flightObj.t * ctrlY + flightObj.t * flightObj.t * endY;
        trayBtn.root.setPosition(bx, by);

        // Paper curl stretch mid-flight
        const arcPulse = Math.sin(flightObj.t * Math.PI);
        trayBtn.root.setScale(1 + arcPulse * 0.28, 1 - arcPulse * 0.1);
        trayBtn.root.setAngle(arcPulse * -14);

        trailTick++;
        if (trailTick % 2 === 0) {
          const col = rainbowColors[trailTick % rainbowColors.length];
          const spark = this.add
            .star(
              bx + Phaser.Math.Between(-12, 12),
              by + Phaser.Math.Between(-12, 12),
              5,
              4,
              10,
              col,
              0.92
            )
            .setDepth(135);
          this.tweens.add({
            targets: spark,
            scale: 0,
            alpha: 0,
            angle: 90,
            duration: 320,
            onComplete: () => spark.destroy()
          });
        }
      },
      onComplete: () => {
        // Hide the pulsing target silhouette
        targetSil.container.setVisible(false);
        this.onStickerSnappedToTarget(trayBtn, targetSil.worldX, targetSil.worldY);
      }
    });
  }

  private onStickerSnappedToTarget(
    trayBtn: TrayStickerButton,
    targetX: number,
    targetY: number
  ): void {
    this.audio.playStickerStick(this.treatsServedOnPlate);
    Juice.burstStars(this, targetX, targetY, 14, [0xfef08a, 0xf472b6, 0x38bdf8, 0xffffff]);

    if (this.currentStep === 'STEP1_CROWN') {
      // Snap Crown/Bow Puffy Sticker onto the Guest's head!
      trayBtn.root.destroy(true);

      const wornCrown = this.createPuffyStickerVisual(
        this.activeScenario.targetCrownSticker,
        104
      ).container;
      wornCrown.setPosition(
        this.activeScenario.headOffset.x,
        this.activeScenario.headOffset.y
      );
      this.guestContainer.add(wornCrown);
      this.guestWornCrownContainer = wornCrown;

      Juice.squashAndStretch(this, wornCrown, 0.24, 260);
      Juice.squashAndStretch(this, this.guestContainer, 0.14, 240);
      this.cheerEmma();

      if (this.activeScenario.guestId === 'UNICORN') {
        this.guestSprite.setTexture(this.activeScenario.happySpriteKey);
        this.audio.playUnicornWhinny();
      } else {
        this.audio.playGemSocketChime(1);
      }

      this.audio.speakPrompt('step1_done_crown', () => {
        this.time.delayedCall(260, () => {
          this.enterStep2PourTea();
        });
      });
      return;
    }

    if (this.currentStep === 'STEP2_TEAPOT') {
      // Tilt Teapot 45° and pour a physical stream of sparkling pastel tea particles into the teacup!
      this.animateTeapotPourAndSip(trayBtn.root);
      return;
    }

    if (this.currentStep === 'STEP3_TREATS') {
      // Stick the Puffy Treat Sticker onto the plate silhouette and count aloud calmly!
      this.flightLayer.remove(trayBtn.root, false);
      this.tablePropsLayer.add(trayBtn.root);
      trayBtn.root.setPosition(targetX, targetY);
      trayBtn.root.setScale(0.68);
      trayBtn.root.setAngle(Phaser.Math.Between(-6, 6));
      this.plateServedStickers.push(trayBtn.root);

      Juice.squashAndStretch(this, trayBtn.root, 0.22, 240);
      this.treatsServedOnPlate++;
      this.audio.playTeacupClink(this.treatsServedOnPlate);

      const servedNow = this.treatsServedOnPlate;
      const totalRequired = this.activeScenario.treatCount;

      if (servedNow < totalRequired) {
        // Speak current number calmly ("One.", "Two.") and unlock immediately for the next treat!
        this.stepTransitionLocked = false;
        this.audio.speakNumber(servedNow);
        this.resetIdleHelperTimer();
      } else {
        // Plate is full! Count the final number + summary ("Three... Three cupcakes.") then munch!
        this.stepTransitionLocked = true;
        this.audio.speakCountAndSummary(
          servedNow,
          this.activeScenario.treatFinalSummaryPromptId,
          () => {
            this.celebrateGuestPlateComplete();
          }
        );
      }
    }
  }

  /**
   * Step 2 Animation: Teapot tilts `-45°` above the teacup, streams sparkling pastel tea droplets
   * with a pitch-rising *glug-glug-glug-DING!* fill sound, fills the teacup, and the Guest sips happily!
   */
  private animateTeapotPourAndSip(teapotNode: Phaser.GameObjects.Container): void {
    teapotNode.setPosition(this.TEAPOT_POUR_POS.x + 42, this.TEAPOT_POUR_POS.y - 8);
    teapotNode.setScale(0.95);

    this.tweens.add({
      targets: teapotNode,
      angle: -45,
      duration: 240,
      ease: 'Back.easeOut',
      onComplete: () => {
        const totalSteps = 10;
        let step = 0;

        const pourTimer = this.time.addEvent({
          delay: 115,
          repeat: totalSteps - 1,
          callback: () => {
            step++;
            const progress = step / totalSteps;
            this.audio.playTeapotPour(progress);

            // Spawn streaming pastel tea droplets & sparkles from spout into cup
            const spoutX = teapotNode.x - 54;
            const spoutY = teapotNode.y + 16;
            for (let d = 0; d < 3; d++) {
              const drop = this.add
                .circle(
                  spoutX + Phaser.Math.Between(-5, 5),
                  spoutY,
                  Phaser.Math.Between(5, 8),
                  d % 2 === 0
                    ? this.activeScenario.teaLiquidColor
                    : this.activeScenario.teaSparkleColor,
                  0.92
                )
                .setDepth(138);
              this.tweens.add({
                targets: drop,
                x: this.TEACUP_POS.x + Phaser.Math.Between(-14, 14),
                y: this.TEACUP_POS.y - 12,
                scale: 0.4,
                duration: 210,
                ease: 'Quad.easeIn',
                onComplete: () => drop.destroy()
              });
            }

            // Draw rising shimmering pastel tea inside the porcelain teacup
            this.teacupLiquidGraphics.clear();
            const fillW = 46 + progress * 16;
            const fillH = 10 + progress * 10;
            this.teacupLiquidGraphics.fillStyle(this.activeScenario.teaLiquidColor, 0.92);
            this.teacupLiquidGraphics.fillEllipse(-4, -18 - progress * 4, fillW, fillH);
            this.teacupLiquidGraphics.lineStyle(2, 0xffffff, 0.85);
            this.teacupLiquidGraphics.strokeEllipse(-4, -18 - progress * 4, fillW, fillH);

            if (step >= totalSteps) {
              pourTimer.remove(false);
              this.audio.playTeacupClink(5);
              Juice.burstStars(this, this.TEACUP_POS.x, this.TEACUP_POS.y - 18, 12, [
                0xfef08a,
                this.activeScenario.teaLiquidColor,
                0xffffff
              ]);

              // Pop teapot away & have the Guest take a big delighted sip with floating hearts!
              this.tweens.add({
                targets: teapotNode,
                angle: 0,
                scale: 0,
                alpha: 0,
                duration: 240,
                onComplete: () => teapotNode.destroy(true)
              });

              this.animateGuestHappySip();
            }
          }
        });
      }
    });
  }

  private animateGuestHappySip(): void {
    const mouthX = this.GUEST_POS.x + this.activeScenario.mouthOffset.x;
    const mouthY = this.GUEST_POS.y + this.activeScenario.mouthOffset.y;

    this.tweens.add({
      targets: this.teacupContainer,
      x: mouthX,
      y: mouthY + 28,
      angle: 22,
      duration: 380,
      yoyo: true,
      hold: 420,
      ease: 'Sine.easeInOut',
      onYoyo: () => {
        this.audio.playTeacupSip();
        this.spawnFloatingHearts(this.GUEST_POS.x, this.GUEST_POS.y - 80, 6);
        Juice.squashAndStretch(this, this.guestContainer, 0.15, 260);
      },
      onComplete: () => {
        this.teacupContainer.setPosition(this.TEACUP_POS.x, this.TEACUP_POS.y).setAngle(0);
        this.audio.speakPrompt('step2_done_sip', () => {
          this.time.delayedCall(220, () => {
            this.enterStep3ServeTreats();
          });
        });
      }
    });
  }

  /**
   * Step 3 Completion: Guest munches the treats on the plate with crumb sparkles, dances with
   * Princess Emma, and a Giant Golden Crown-Star flies up into the top 3-Star Progress Tracker!
   */
  private celebrateGuestPlateComplete(): void {
    this.currentStep = 'GUEST_CELEBRATE';
    this.audio.playTreatMunch();
    this.cheerEmma();

    // Munching bounce on each served treat sticker + crumb sparkles
    this.plateServedStickers.forEach((treatNode, idx) => {
      this.tweens.add({
        targets: treatNode,
        scaleX: 0,
        scaleY: 0,
        angle: 25,
        duration: 320,
        delay: idx * 160,
        ease: 'Back.easeIn',
        onStart: () => {
          Juice.burstStars(this, treatNode.x, treatNode.y, 10, [
            0xfef08a,
            0xf472b6,
            0xfbbf24
          ]);
        }
      });
    });

    // Happy dance bounce for Guest & Emma
    this.tweens.add({
      targets: [this.guestContainer, this.emmaContainer],
      y: '-=22',
      duration: 180,
      yoyo: true,
      repeat: 2,
      ease: 'Quad.easeOut'
    });
    this.spawnFloatingHearts(this.GUEST_POS.x, this.GUEST_POS.y - 90, 8);

    // Fly a Giant Golden Crown-Star from the plate up to the Top Progress Bar (`starSlotIndex`)
    const slotIdx = Math.min(2, this.starsEarned);
    const targetSlot = this.starSlotContainers[slotIdx];
    const targetWorldX = 640 + targetSlot.x;
    const targetWorldY = 54 + targetSlot.y;

    const flyingStar = this.add.container(this.PLATE_POS.x, this.PLATE_POS.y - 20).setDepth(180);
    const starGlow = this.add.circle(0, 0, 44, 0xfef08a, 0.55);
    const starShape = this.add.star(0, 0, 5, 18, 38, 0xfacc15, 1);
    starShape.setStrokeStyle(4, 0xffffff, 1);
    flyingStar.add([starGlow, starShape]);
    if (this.textures.exists('acc-royal-tiara')) {
      const miniCrown = this.add.image(0, -18, 'acc-royal-tiara').setDisplaySize(44, 30);
      flyingStar.add(miniCrown);
    }

    this.audio.playRoyalFanfare();

    this.tweens.add({
      targets: flyingStar,
      x: targetWorldX,
      y: targetWorldY,
      scaleX: { from: 1.35, to: 0.85 },
      scaleY: { from: 1.35, to: 0.85 },
      angle: 360,
      duration: 720,
      delay: 350,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        flyingStar.destroy(true);
        const fillNode = this.starSlotFills[slotIdx];
        if (fillNode) {
          fillNode.setVisible(true);
          this.tweens.add({
            targets: fillNode,
            scaleX: 1,
            scaleY: 1,
            duration: 280,
            ease: 'Back.easeOut'
          });
        }
        Juice.burstStars(this, targetWorldX, targetWorldY, 16, [
          0xfef08a,
          0xfacc15,
          0xffffff
        ]);

        this.starsEarned++;

        this.audio.speakPrompt('guest_star_earned', () => {
          if (this.starsEarned >= 3) {
            this.enterGrandFinaleStickerChestParty();
          } else {
            this.startGuestEncounter(this.guestSlotIndex + 1, false);
          }
        });
      }
    });
  }

  private spawnFloatingHearts(cx: number, cy: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const hx = cx + Phaser.Math.Between(-55, 55);
      const hy = cy + Phaser.Math.Between(-20, 20);
      const heart = this.textures.exists('p1-pixel-heart')
        ? this.add.image(hx, hy, 'p1-pixel-heart').setScale(1.4).setDepth(130)
        : this.add.star(hx, hy, 5, 6, 13, 0xf43f5e, 1).setDepth(130);

      this.tweens.add({
        targets: heart,
        y: hy - Phaser.Math.Between(45, 85),
        alpha: 0,
        scale: 0.5,
        duration: Phaser.Math.Between(650, 950),
        delay: i * 65,
        ease: 'Quad.easeOut',
        onComplete: () => heart.destroy()
      });
    }
  }

  // ===========================================================================
  // 8. AUTOMATED GOLDEN HELPER HAND (3.5-SECOND IDLE TIMER)
  // ===========================================================================

  private buildGoldenHelperHand(): void {
    this.helperHandContainer = this.add.container(0, 0).setDepth(175).setVisible(false);

    const glow = this.add.circle(0, 0, 34, 0xfef08a, 0.42);
    glow.setStrokeStyle(3, 0xfbbf24, 0.95);
    this.helperHandContainer.add(glow);

    if (this.textures.exists('spa-wand-rainbow')) {
      const wand = this.add
        .image(14, 14, 'spa-wand-rainbow')
        .setDisplaySize(76, 76)
        .setAngle(-20);
      this.helperHandContainer.add(wand);
    }
    const pointerTxt = this.add
      .text(-6, -8, '👆', { fontSize: '42px' })
      .setOrigin(0.5);
    this.helperHandContainer.add(pointerTxt);
  }

  private resetIdleHelperTimer(): void {
    this.idleElapsedSec = 0;
    if (this.helperHandActive) {
      this.helperHandActive = false;
      if (this.helperHandTween) {
        this.helperHandTween.stop();
        this.helperHandTween = null;
      }
      this.helperHandContainer.setVisible(false);
    }
  }

  private showGoldenHelperHand(): void {
    const correctBtn = this.trayButtons.find((b) => b.spec.isCorrect && !b.consumed);
    const targetSil = this.activeSilhouettes.find((s) => !s.filled);
    if (!correctBtn || !targetSil) return;

    this.helperHandActive = true;
    this.helperHandContainer.setVisible(true);
    this.helperHandContainer.setPosition(correctBtn.homeX, correctBtn.homeY);
    this.helperHandContainer.setAlpha(1);

    const runGlide = () => {
      if (!this.helperHandActive || !this.helperHandContainer.scene) return;
      this.helperHandContainer.setPosition(correctBtn.homeX, correctBtn.homeY);
      this.helperHandContainer.setScale(1);

      this.helperHandTween = this.tweens.add({
        targets: this.helperHandContainer,
        x: targetSil.worldX,
        y: targetSil.worldY,
        duration: 1250,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          if (Math.random() < 0.35) {
            const tw = this.add
              .star(
                this.helperHandContainer.x + Phaser.Math.Between(-8, 8),
                this.helperHandContainer.y + Phaser.Math.Between(-8, 8),
                4,
                2,
                6,
                0xfef08a,
                0.85
              )
              .setDepth(170);
            this.tweens.add({
              targets: tw,
              alpha: 0,
              scale: 0,
              duration: 280,
              onComplete: () => tw.destroy()
            });
          }
        },
        onComplete: () => {
          if (!this.helperHandActive) return;
          this.time.delayedCall(450, () => {
            if (this.helperHandActive) runGlide();
          });
        }
      });
    };

    runGlide();
  }

  // ===========================================================================
  // 9. GRAND FINALE: THE ROYAL STICKER CHEST PARTY MODE & [ ▶ PLAY AGAIN ]
  // ===========================================================================

  private enterGrandFinaleStickerChestParty(): void {
    this.currentStep = 'FINALE_PARTY';
    this.stepTransitionLocked = true;
    this.resetIdleHelperTimer();
    this.clearSilhouettes();
    this.wishBubbleContainer.removeAll(true);

    // Hide the bottom tray buttons so the entire screen is an open sticker party canvas
    for (const tb of this.trayButtons) {
      tb.root.setVisible(false);
    }

    // 1. All 3 Royal Friends (Unicorn, Doggie, and Sparky) join Princess Emma around the table cheering!
    this.guestSprite.setTexture('char-unicorn-happy').setScale(0.92);
    const friendDoggie = this.add
      .image(420, 275, 'char-doggie-crown')
      .setScale(0.88);
    const friendSparky = this.add
      .image(1055, 290, 'char-sparky-bowtie')
      .setScale(0.88);
    this.finaleLayer.add([friendDoggie, friendSparky]);

    this.tweens.add({
      targets: [friendDoggie, friendSparky],
      y: '-=16',
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 2. Massive Golden Unicorn Sticker Chest bursts open in the center of the stage!
    const chestC = this.add.container(640, 340);
    this.finaleChestContainer = chestC;

    const sunburst = this.add.graphics();
    for (let r = 0; r < 12; r++) {
      const a0 = (r / 12) * Math.PI * 2;
      const a1 = a0 + Math.PI / 18;
      sunburst.fillStyle(r % 2 === 0 ? 0xfef08a : 0xf472b6, 0.32);
      sunburst.beginPath();
      sunburst.moveTo(0, 0);
      sunburst.lineTo(Math.cos(a0) * 210, Math.sin(a0) * 210);
      sunburst.lineTo(Math.cos(a1) * 210, Math.sin(a1) * 210);
      sunburst.closePath();
      sunburst.fillPath();
    }
    chestC.add(sunburst);
    this.tweens.add({
      targets: sunburst,
      angle: 360,
      duration: 9000,
      repeat: -1
    });

    const chestSpec: TrayStickerSpec = {
      id: 'finale-chest',
      spriteKey: 'stk-treasure-chest',
      accentColor: 0xfbbf24,
      colorKey: 'yellow',
      isCorrect: true
    };
    const chestVisual = this.createPuffyStickerVisual(chestSpec, 195).container;
    chestC.add(chestVisual);
    this.finaleLayer.add(chestC);

    chestC.setScale(0);
    this.audio.playRoyalFanfare();
    this.audio.speakPrompt('finale_party_prompt');

    this.tweens.add({
      targets: chestC,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 440,
      ease: 'Back.easeOut',
      onComplete: () => {
        Juice.burstStars(this, 640, 320, 26, [
          0xfef08a,
          0xf472b6,
          0x38bdf8,
          0x34d399,
          0xc084fc
        ]);

        // Auto-pop 5 starter celebratory living stickers out of the chest!
        const starterCoords = [
          { x: 310, y: 185 },
          { x: 960, y: 180 },
          { x: 230, y: 470 },
          { x: 1040, y: 465 },
          { x: 640, y: 170 }
        ];
        starterCoords.forEach((pt, idx) => {
          this.time.delayedCall(idx * 160, () => {
            if (this.currentStep === 'FINALE_PARTY') {
              this.stampFinaleLivingSticker(pt.x, pt.y, idx);
            }
          });
        });
      }
    });

    // 3. Full-Screen "Tap Anywhere to Stamp Giant Living Stickers" Party Zone
    const partyStampZone = this.add
      .zone(640, 320, 1280, 540)
      .setInteractive({ useHandCursor: true });
    this.finaleLayer.add(partyStampZone);

    let stampCounter = 5;
    partyStampZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.currentStep !== 'FINALE_PARTY') return;
      this.stampFinaleLivingSticker(pointer.x, pointer.y, stampCounter++);
    });

    // 4. Huge, Unmistakable Glowing Emerald-and-Gold `[ ▶ PLAY AGAIN ]` Button (`y: 620`)
    const playAgainBtn = this.add.container(640, 620);
    const btnGlow = this.add.graphics();
    btnGlow.fillStyle(0x052e16, 0.95);
    btnGlow.fillRoundedRect(-190, -54, 380, 108, 54);
    btnGlow.fillStyle(0x10b981, 1);
    btnGlow.fillRoundedRect(-182, -48, 364, 96, 48);
    btnGlow.lineStyle(6, 0xfef08a, 1);
    btnGlow.strokeRoundedRect(-182, -48, 364, 96, 48);
    btnGlow.lineStyle(3, 0xfbbf24, 0.95);
    btnGlow.strokeRoundedRect(-172, -38, 344, 76, 38);

    const replayIcon = this.add
      .text(-112, 0, '↻', {
        fontFamily: '"Fredoka", sans-serif',
        fontSize: '54px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#064e3b',
        strokeThickness: 6
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: replayIcon,
      angle: 360,
      duration: 3200,
      repeat: -1
    });

    const playText = this.add
      .text(24, 0, 'PLAY AGAIN', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '34px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#064e3b',
        strokeThickness: 6
      })
      .setOrigin(0.5);

    playAgainBtn.add([btnGlow, replayIcon, playText]);
    this.finaleLayer.add(playAgainBtn);

    this.tweens.add({
      targets: playAgainBtn,
      scaleX: { from: 0.97, to: 1.05 },
      scaleY: { from: 0.97, to: 1.05 },
      duration: 720,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    Juice.makeTactileButton(
      this,
      playAgainBtn,
      380,
      108,
      () => {
        this.restartFreshTeaPartyRound();
      },
      'pop'
    );
  }

  private stampFinaleLivingSticker(x: number, y: number, index: number): void {
    const entry = FINALE_LIVING_STICKER_KEYS[index % FINALE_LIVING_STICKER_KEYS.length];
    const palette = [0xf472b6, 0xfbbf24, 0x38bdf8, 0xc084fc, 0x34d399];
    const spec: TrayStickerSpec = {
      id: `party-stk-${index}`,
      spriteKey: entry.key,
      accentColor: palette[index % palette.length],
      colorKey: 'pink',
      isCorrect: true
    };

    const { container } = this.createPuffyStickerVisual(spec, 138);
    container.setPosition(640, 340);
    container.setScale(0.2);
    this.finaleLayer.add(container);

    this.audio.playStickerStick(index);
    Juice.burstStars(this, x, y, 12, [0xfef08a, spec.accentColor, 0xffffff]);

    this.tweens.add({
      targets: container,
      x,
      y,
      scaleX: 1,
      scaleY: 1,
      duration: 320,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.finaleStickers.push({
          container,
          baseY: y,
          baseScale: 1,
          phase: index * 0.85,
          animMode: entry.anim
        });
      }
    });
  }

  private restartFreshTeaPartyRound(): void {
    this.audio.playRoyalFanfare();
    this.partyRoundIndex++;
    this.starsEarned = 0;

    // Reset Top 3-Star Progress Tracker
    for (const fill of this.starSlotFills) {
      fill.setVisible(false).setScale(0);
    }

    // Clear Finale Stickers & UI
    this.finaleLayer.removeAll(true);
    this.finaleStickers = [];
    this.finaleChestContainer = null;

    // Start Guest 1 of the new party round!
    this.startGuestEncounter(0, false);
  }
}
