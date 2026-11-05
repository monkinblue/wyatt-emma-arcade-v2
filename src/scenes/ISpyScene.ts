/**
 * src/scenes/ISpyScene.ts
 * -----------------------
 * Mentor Note: Walter Wick-Inspired Studio Toy Photography Hidden-Object Detective Game
 * ("I Spy Curio Cabinet") for Wyatt (age 4) and Emma (age 3).
 *
 * Architectural Highlights:
 * 1. **Deterministic 2-Pass Coordinate Manifest (`src/data/ispyLevels.json`):**
 *    Instead of guessing hitboxes on a flat AI image, `tools/build_ispy_assets.py` composites
 *    isolated studio-lit miniature objects onto four `2560x1440` studio photography tableaux with
 *    realistic contact drop-shadows and exports exact `(stageX, stageY, stageRadius, angle)`
 *    coordinates for every placed object.
 * 2. **Real-Time 2.5x Brass Magnifying Glass Lens (`radius: 115px`):**
 *    We render the `2560x1440` studio tableau at `0.5x` scale on the `1280x720` stage, and inside
 *    a circular `GeometryMask` (`radius: 115px`) we render a synchronized `zoomWorldContainer`
 *    at `2.5x` stage magnification (`zoomWorldContainer.x = lensX * (1 - 2.5)`). Because the
 *    underlying texture is `2560x1440`, the 2.5x lens samples crisp high-resolution studio pixels!
 * 3. **Multi-Instance Visual Checklist (`0/3`, `0/2`, `0/1`) & Spoken Rhyming Riddles:**
 *    Each of the 4 boards has 3 Riddle Tiers (Junior Scout -> Detective -> Master Inspector)
 *    with spoken ElevenLabs rhyming riddles, oversized studio picture cards, live pip counters,
 *    and a persistent Junior Detective Casebook & Curio Trophy Shelf (`wyatt_emma_ispy_progress_v1`).
 */

import Phaser from 'phaser';
import { ArcadeState } from '../core/ArcadeState';
import { AudioBus } from '../core/AudioBus';
import { ISpyAudioEngine } from '../core/ISpyAudioEngine';
import { Juice } from '../core/Juice';
import ispyManifestRaw from '../data/ispyLevels.json';

interface ISpyItemMeta {
  id: string;
  label: string;
  pluralLabel: string;
  audioKey: string;
  canRotateFull: boolean;
}

interface ISpyTargetSpec {
  itemType: string;
  count: number;
  label: string;
  pluralLabel: string;
  audioKey: string;
}

interface ISpyCurioReward {
  id: string;
  title: string;
  subtitle: string;
  itemType: string;
}

interface ISpyTierSpec {
  tier: 1 | 2 | 3;
  tierTitle: string;
  riddleId: string;
  riddleText: string;
  curioReward: ISpyCurioReward;
  targets: ISpyTargetSpec[];
}

interface ISpyPlacedObject {
  id: string;
  itemType: string;
  label: string;
  audioKey: string;
  role: 'target' | 'clutter';
  tier: number;
  texX: number;
  texY: number;
  stageX: number;
  stageY: number;
  texScale: number;
  stageScale: number;
  radius: number;
  stageRadius: number;
  angle: number;
}

interface ISpyBoardSpec {
  id: string;
  index: number;
  title: string;
  shortTitle: string;
  subtitle: string;
  boardKey: string;
  fullBoardKey: string;
  boardFile: string;
  fullBoardFile: string;
  rawFile: string;
  totalObjectCount: number;
  tiers: ISpyTierSpec[];
  placedObjects: ISpyPlacedObject[];
}

interface ISpyManifest {
  version: number;
  items: Record<string, ISpyItemMeta>;
  boards: ISpyBoardSpec[];
}

interface ISpySaveProgress {
  completedRiddles: Record<string, boolean>;
  unlockedCurios: Record<string, boolean>;
  lastBoardIndex: number;
  lastTierByBoard: Record<string, 1 | 2 | 3>;
}

interface LiveTargetInstance {
  spec: ISpyPlacedObject;
  collected: boolean;
  baseShadow: Phaser.GameObjects.Image;
  baseSprite: Phaser.GameObjects.Image;
  zoomShadow: Phaser.GameObjects.Image;
  zoomSprite: Phaser.GameObjects.Image;
}

interface ChecklistCardUI {
  target: ISpyTargetSpec;
  foundCount: number;
  container: Phaser.GameObjects.Container;
  cardBg: Phaser.GameObjects.Graphics;
  itemIcon: Phaser.GameObjects.Image;
  countText: Phaser.GameObjects.Text;
  pipDots: Phaser.GameObjects.Graphics[];
  stampContainer: Phaser.GameObjects.Container;
  stageX: number;
  stageY: number;
}

const STORAGE_KEY = 'wyatt_emma_ispy_progress_v1';
const LENS_RADIUS = 115;
const LENS_MAGNIFICATION = 2.5;
const AUTO_HINT_MS = 25000;

const MANIFEST = ispyManifestRaw as unknown as ISpyManifest;

export class ISpyScene extends Phaser.Scene {
  private audio!: ISpyAudioEngine;
  private progress!: ISpySaveProgress;

  private currentBoardIndex = 0;
  private currentTier: 1 | 2 | 3 = 1;
  private isTransitioning = false;
  private isModalOpen = false;

  // Stage & 2.5x Magnifying Glass containers
  private baseWorldContainer!: Phaser.GameObjects.Container;
  private zoomWorldContainer!: Phaser.GameObjects.Container;
  private zoomMaskGraphics!: Phaser.GameObjects.Graphics;
  private lensRimContainer!: Phaser.GameObjects.Container;
  private fxOverlayContainer!: Phaser.GameObjects.Container;
  private topBarContainer!: Phaser.GameObjects.Container;
  private bottomDockContainer!: Phaser.GameObjects.Container;
  private riddleBannerContainer!: Phaser.GameObjects.Container;
  private modalContainer: Phaser.GameObjects.Container | null = null;

  // Lens tracking state
  private lensX = 640;
  private lensY = 310;
  private targetLensX = 640;
  private targetLensY = 310;
  private isDraggingHandle = false;
  private pointerDownPos = { x: 0, y: 0 };
  private pointerDownTime = 0;

  // Active board objects & checklist UI
  private liveTargets: LiveTargetInstance[] = [];
  private checklistCards: Map<string, ChecklistCardUI> = new Map();
  private lastDiscoveryAt = 0;
  private autoHintDoneForCurrentTarget = false;

  constructor() {
    super({ key: 'ISpyScene' });
  }

  public create(): void {
    this.audio = new ISpyAudioEngine();
    this.progress = this.loadProgress();
    this.currentBoardIndex = Phaser.Math.Clamp(this.progress.lastBoardIndex ?? 0, 0, MANIFEST.boards.length - 1);
    const boardId = MANIFEST.boards[this.currentBoardIndex]?.id ?? 'watchmaker';
    this.currentTier = this.progress.lastTierByBoard[boardId] ?? 1;
    this.isTransitioning = false;
    this.isModalOpen = false;

    this.applyLinearStudioFiltering();

    // 1. Base 1280x720 Studio World (0.5x of 2560x1440)
    this.baseWorldContainer = this.add.container(0, 0).setDepth(10);

    // 2. 2.5x Magnified Studio World inside circular GeometryMask (`radius: 115px`)
    this.zoomWorldContainer = this.add
      .container(0, 0)
      .setScale(LENS_MAGNIFICATION)
      .setDepth(60);

    this.zoomMaskGraphics = this.make.graphics({ x: 0, y: 0 });
    this.zoomMaskGraphics.fillStyle(0xffffff, 1);
    this.zoomMaskGraphics.fillCircle(0, 0, LENS_RADIUS);
    const geomMask = this.zoomMaskGraphics.createGeometryMask();
    this.zoomWorldContainer.setMask(geomMask);

    // 3. Ornate Brass Magnifying Glass Bezel, Specular Ring & Offset Mahogany Handle
    this.lensRimContainer = this.add.container(this.lensX, this.lensY).setDepth(70);
    this.buildOrnateBrassMagnifyingGlass();

    // 4. Celebratory FX & Close-Up Inspection Layer (above the lens!)
    this.fxOverlayContainer = this.add.container(0, 0).setDepth(85);

    // 5. Top Detective Bar (`y: 0..64`) & Bottom Mahogany Checklist Dock (`y: 564..720`)
    this.topBarContainer = this.add.container(0, 0).setDepth(100);
    this.bottomDockContainer = this.add.container(0, 0).setDepth(100);
    this.riddleBannerContainer = this.add.container(0, 0).setDepth(110);

    // 6. Load active board & riddle tier
    this.loadBoardAndTier(this.currentBoardIndex, this.currentTier, true);

    // 7. Install pointer/touch listeners for smooth 2.5x lens exploration & tap-to-find
    this.installStageInputListeners();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.audio.stopVoice();
    });

    this.cameras.main.fadeIn(260, 14, 9, 5);
  }

  public update(_time: number, delta: number): void {
    // Smoothly interpolate lens position toward target pointer/handle position
    const lerp = Math.min(1, delta * 0.025);
    const prevX = this.lensX;
    const prevY = this.lensY;
    this.lensX = Phaser.Math.Linear(this.lensX, this.targetLensX, lerp);
    this.lensY = Phaser.Math.Linear(this.lensY, this.targetLensY, lerp);

    const moveDist = Math.hypot(this.lensX - prevX, this.lensY - prevY);
    if (moveDist > 22 && !this.isModalOpen && !this.isTransitioning) {
      this.audio.playLensWhoosh(moveDist);
    }

    this.syncMagnifyingLensTransform();

    // Gentle 25-second helper hint so 3-year-old Emma or 4-year-old Wyatt never gets stuck
    if (
      !this.isModalOpen &&
      !this.isTransitioning &&
      !this.autoHintDoneForCurrentTarget &&
      performance.now() - this.lastDiscoveryAt > AUTO_HINT_MS
    ) {
      this.autoHintDoneForCurrentTarget = true;
      this.triggerGentleHelperHint(false);
    }
  }

  // ===========================================================================
  // TEXTURE FILTERING & SAVE DATA PERSISTENCE
  // ===========================================================================

  /**
   * Applies smooth bilinear filtering (`FilterMode.LINEAR`) to the 4 high-res `2560x1440`
   * Walter Wick studio boards and 36 studio-lit miniature object textures so the 2.5x
   * magnifying glass renders razor-sharp studio photography!
   */
  private applyLinearStudioFiltering(): void {
    for (const board of MANIFEST.boards) {
      if (this.textures.exists(board.boardKey)) {
        this.textures.get(board.boardKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
      if (this.textures.exists(board.fullBoardKey)) {
        this.textures.get(board.fullBoardKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    }
    for (const itemKey of Object.keys(MANIFEST.items)) {
      if (this.textures.exists(itemKey)) {
        this.textures.get(itemKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    }
  }

  private loadProgress(): ISpySaveProgress {
    const fallback: ISpySaveProgress = {
      completedRiddles: {},
      unlockedCurios: {},
      lastBoardIndex: 0,
      lastTierByBoard: {
        watchmaker: 1,
        pirate: 1,
        attic: 1,
        crater: 1
      }
    };
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as Partial<ISpySaveProgress>;
      return {
        completedRiddles: parsed.completedRiddles ?? {},
        unlockedCurios: parsed.unlockedCurios ?? {},
        lastBoardIndex: typeof parsed.lastBoardIndex === 'number' ? parsed.lastBoardIndex : 0,
        lastTierByBoard: {
          ...fallback.lastTierByBoard,
          ...(parsed.lastTierByBoard ?? {})
        }
      };
    } catch {
      return fallback;
    }
  }

  private saveProgress(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
    } catch {
      // Ignore storage quota errors
    }
  }

  private getTotalEarnedSeals(): number {
    let count = 0;
    for (const b of MANIFEST.boards) {
      for (const t of b.tiers) {
        if (this.progress.completedRiddles[t.riddleId]) count++;
      }
    }
    return count;
  }

  private getBoardEarnedSeals(board: ISpyBoardSpec): number {
    let count = 0;
    for (const t of board.tiers) {
      if (this.progress.completedRiddles[t.riddleId]) count++;
    }
    return count;
  }

  // ===========================================================================
  // 2.5x BRASS MAGNIFYING GLASS LENS & OFFSET MAHOGANY HANDLE
  // ===========================================================================

  private buildOrnateBrassMagnifyingGlass(): void {
    this.lensRimContainer.removeAll(true);

    const g = this.add.graphics();

    // 1. Soft drop shadow cast by the brass magnifying glass & handle onto the board
    g.fillStyle(0x070402, 0.42);
    g.fillCircle(6, 9, LENS_RADIUS + 13);

    // 2. Offset Carved Mahogany & Brass Handle (extending at 45 degrees to bottom-right)
    const handleContainer = this.add.container(0, 0);
    const hg = this.add.graphics();

    // Handle drop shadow
    hg.fillStyle(0x060301, 0.48);
    hg.fillRoundedRect(LENS_RADIUS - 4, -14 + 6, 128, 28, 12);

    // Brass neck ferrule Collar
    hg.fillStyle(0xd97706, 1);
    hg.fillRoundedRect(LENS_RADIUS - 6, -15, 28, 30, 6);
    hg.lineStyle(2, 0xfef08a, 0.9);
    hg.strokeRoundedRect(LENS_RADIUS - 6, -15, 28, 30, 6);

    // Turned Rosewood/Mahogany grip
    hg.fillStyle(0x451a03, 1);
    hg.fillRoundedRect(LENS_RADIUS + 18, -13, 86, 26, 11);
    hg.fillStyle(0x78350f, 0.85);
    hg.fillRoundedRect(LENS_RADIUS + 22, -9, 78, 9, 5);
    hg.lineStyle(2, 0xb45309, 0.95);
    hg.strokeRoundedRect(LENS_RADIUS + 18, -13, 86, 26, 11);

    // Brass pommel end-cap with grip rings
    hg.fillStyle(0xf59e0b, 1);
    hg.fillCircle(LENS_RADIUS + 106, 0, 14);
    hg.lineStyle(2, 0xfef08a, 0.9);
    hg.strokeCircle(LENS_RADIUS + 106, 0, 14);

    handleContainer.add(hg);
    handleContainer.setAngle(42);

    // 3. Subtle warm optical glass tint & inner refraction vignette inside the 115px lens
    g.fillStyle(0xfef9c3, 0.05);
    g.fillCircle(0, 0, LENS_RADIUS);
    g.lineStyle(5, 0x1c0d04, 0.34);
    g.strokeCircle(0, 0, LENS_RADIUS - 2);

    // 4. Specular Curved Glass Reflection Highlight Arcs
    g.lineStyle(4.5, 0xffffff, 0.38);
    g.beginPath();
    g.arc(0, 0, LENS_RADIUS - 14, Phaser.Math.DegToRad(202), Phaser.Math.DegToRad(252), false);
    g.strokePath();

    g.lineStyle(2.5, 0xfef08a, 0.32);
    g.beginPath();
    g.arc(0, 0, LENS_RADIUS - 21, Phaser.Math.DegToRad(210), Phaser.Math.DegToRad(242), false);
    g.strokePath();

    g.lineStyle(2.5, 0xffffff, 0.22);
    g.beginPath();
    g.arc(0, 0, LENS_RADIUS - 14, Phaser.Math.DegToRad(28), Phaser.Math.DegToRad(58), false);
    g.strokePath();

    // 5. Ornate Multi-Ring Antique Brass Bezel (`radius: 115px..127px`)
    g.lineStyle(12, 0xb45309, 1);
    g.strokeCircle(0, 0, LENS_RADIUS + 5);

    g.lineStyle(6, 0xf59e0b, 1);
    g.strokeCircle(0, 0, LENS_RADIUS + 5);

    g.lineStyle(2, 0xfef08a, 0.92);
    g.strokeCircle(0, 0, LENS_RADIUS + 1);

    g.lineStyle(2, 0x78350f, 0.95);
    g.strokeCircle(0, 0, LENS_RADIUS + 11);

    // 12 Watchmaker perimeter brass rivets around the bezel
    for (let i = 0; i < 12; i++) {
      const rad = (i * Math.PI * 2) / 12;
      const rx = Math.cos(rad) * (LENS_RADIUS + 5);
      const ry = Math.sin(rad) * (LENS_RADIUS + 5);
      g.fillStyle(0xfef08a, 0.95);
      g.fillCircle(rx, ry, 2.3);
    }

    // Subtle "2.5x" engraved watchmaker badge on top of bezel
    const badgeG = this.add.graphics();
    badgeG.fillStyle(0x271206, 0.95);
    badgeG.fillRoundedRect(-26, -LENS_RADIUS - 17, 52, 18, 6);
    badgeG.lineStyle(1.5, 0xfbbf24, 0.95);
    badgeG.strokeRoundedRect(-26, -LENS_RADIUS - 17, 52, 18, 6);
    const badgeTxt = this.add
      .text(0, -LENS_RADIUS - 8, '2.5×', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);

    this.lensRimContainer.add([handleContainer, g, badgeG, badgeTxt]);
  }

  /**
   * Synchronizes the circular mask and the 2.5x `zoomWorldContainer` so the stage point
   * `(lensX, lensY)` is always centered inside the lens at `2.5x` magnification!
   */
  private syncMagnifyingLensTransform(): void {
    this.lensX = Phaser.Math.Clamp(this.lensX, 85, 1195);
    this.lensY = Phaser.Math.Clamp(this.lensY, 85, 545);

    this.lensRimContainer.setPosition(this.lensX, this.lensY);
    this.zoomMaskGraphics.setPosition(this.lensX, this.lensY);

    // Exact 2.5x centering formula: screenPos = containerPos + stagePos * 2.5
    // For screenPos == lensPos when stagePos == lensPos:
    // containerPos = lensPos * (1 - 2.5) = -1.5 * lensPos
    this.zoomWorldContainer.setPosition(
      this.lensX * (1 - LENS_MAGNIFICATION),
      this.lensY * (1 - LENS_MAGNIFICATION)
    );
  }

  // ===========================================================================
  // BOARD & RIDDLE TIER LOADER
  // ===========================================================================

  private loadBoardAndTier(boardIdx: number, tier: 1 | 2 | 3, speakRiddleNow: boolean): void {
    this.currentBoardIndex = Phaser.Math.Clamp(boardIdx, 0, MANIFEST.boards.length - 1);
    this.currentTier = tier;

    const board = MANIFEST.boards[this.currentBoardIndex];
    const tierSpec = board.tiers.find((t) => t.tier === tier) ?? board.tiers[0];

    this.progress.lastBoardIndex = this.currentBoardIndex;
    this.progress.lastTierByBoard[board.id] = tierSpec.tier;
    this.saveProgress();

    this.baseWorldContainer.removeAll(true);
    this.zoomWorldContainer.removeAll(true);
    this.fxOverlayContainer.removeAll(true);
    this.liveTargets = [];

    // 1. Render 2560x1440 Studio Board on Base Stage (0.5x -> 1280x720) & Zoom Stage (2.5x)
    const baseBg = this.add
      .image(640, 360, board.boardKey)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(1280, 720);
    this.baseWorldContainer.add(baseBg);

    const zoomBg = this.add
      .image(640, 360, board.boardKey)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(1280, 720);
    this.zoomWorldContainer.add(zoomBg);

    // 2. Mount all 20 target objects on the board at their exact deterministic coordinates
    //    (Items belonging to the active tier are collectible; items from other tiers act as rich studio props)
    const targetObjects = board.placedObjects.filter((obj) => obj.role === 'target');
    for (const obj of targetObjects) {
      const baseShadow = this.add
        .image(obj.stageX + 2.5, obj.stageY + 3.5, obj.itemType)
        .setOrigin(0.5, 0.5)
        .setScale(obj.stageScale)
        .setAngle(obj.angle)
        .setTint(0x090502)
        .setAlpha(0.42);

      const baseSprite = this.add
        .image(obj.stageX, obj.stageY, obj.itemType)
        .setOrigin(0.5, 0.5)
        .setScale(obj.stageScale)
        .setAngle(obj.angle);

      const zoomShadow = this.add
        .image(obj.stageX + 2.5, obj.stageY + 3.5, obj.itemType)
        .setOrigin(0.5, 0.5)
        .setScale(obj.stageScale)
        .setAngle(obj.angle)
        .setTint(0x090502)
        .setAlpha(0.42);

      const zoomSprite = this.add
        .image(obj.stageX, obj.stageY, obj.itemType)
        .setOrigin(0.5, 0.5)
        .setScale(obj.stageScale)
        .setAngle(obj.angle);

      this.baseWorldContainer.add([baseShadow, baseSprite]);
      this.zoomWorldContainer.add([zoomShadow, zoomSprite]);

      this.liveTargets.push({
        spec: obj,
        collected: false,
        baseShadow,
        baseSprite,
        zoomShadow,
        zoomSprite
      });
    }

    // 3. Render Top Detective Bar & Bottom Mahogany Checklist Dock
    this.renderTopDetectiveBar(board, tierSpec);
    this.renderBottomChecklistDock(tierSpec);
    this.showRiddleParchmentToast(board, tierSpec);

    this.lastDiscoveryAt = performance.now();
    this.autoHintDoneForCurrentTarget = false;

    if (speakRiddleNow) {
      this.audio.speakRiddle(tierSpec.riddleId);
    }
  }

  // ===========================================================================
  // TOP DETECTIVE BAR (`y: 0..64`)
  // ===========================================================================

  private renderTopDetectiveBar(board: ISpyBoardSpec, activeTier: ISpyTierSpec): void {
    this.topBarContainer.removeAll(true);

    // Sleek carved mahogany top header bar (`height: 62px`)
    const barBg = this.add.graphics();
    barBg.fillStyle(0x140a04, 0.94);
    barBg.fillRect(0, 0, 1280, 62);
    barBg.lineStyle(2.5, 0xd97706, 0.95);
    barBg.lineBetween(0, 62, 1280, 62);
    barBg.lineStyle(1, 0xfef08a, 0.45);
    barBg.lineBetween(0, 59, 1280, 59);
    this.topBarContainer.add(barBg);

    // 1. Home / Bookshelf Button (`x: 42, y: 31`, >=64x64 hit area)
    const homeBtn = this.add.container(42, 31);
    const homeG = this.add.graphics();
    homeG.fillStyle(0x2e1608, 0.98);
    homeG.fillRoundedRect(-28, -22, 56, 44, 12);
    homeG.lineStyle(2, 0xfbbf24, 0.95);
    homeG.strokeRoundedRect(-28, -22, 56, 44, 12);
    const homeIcon = this.add.text(0, 0, '🏠', { fontSize: '23px' }).setOrigin(0.5);
    homeBtn.add([homeG, homeIcon]);
    this.topBarContainer.add(homeBtn);

    Juice.makeTactileButton(
      this,
      homeBtn,
      68,
      64,
      () => {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        this.audio.stopVoice();
        this.scene.start('HubScene');
      },
      'pop'
    );

    // 2. 4 Walter Wick Diorama Board Selector Pills (`x: 158..644, y: 31`)
    const boardIcons = ['🕰️', '🏴‍☠️', '🚂', '🦖'];
    const boardLabels = ['Watchmaker', 'Pirate Chest', 'Toy Attic', 'Space Crater'];
    MANIFEST.boards.forEach((bSpec, idx) => {
      const bx = 160 + idx * 148;
      const by = 31;
      const isCurrent = idx === this.currentBoardIndex;
      const seals = this.getBoardEarnedSeals(bSpec);

      const pill = this.add.container(bx, by);
      const pg = this.add.graphics();
      const pw = 138;
      const ph = 44;

      pg.fillStyle(isCurrent ? 0x451a03 : 0x231208, 0.96);
      pg.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 11);
      pg.lineStyle(isCurrent ? 2.5 : 1.5, isCurrent ? 0xfde047 : 0x92400e, 1);
      pg.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, 11);

      const iconTxt = this.add
        .text(-pw / 2 + 20, 0, boardIcons[idx] ?? '🔍', { fontSize: '19px' })
        .setOrigin(0.5);

      const titleTxt = this.add
        .text(8, -7, boardLabels[idx] ?? bSpec.shortTitle, {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: isCurrent ? '#fef08a' : '#e2d5c1'
        })
        .setOrigin(0.5);

      const sealStr = `${'★'.repeat(seals)}${'☆'.repeat(Math.max(0, 3 - seals))}`;
      const subTxt = this.add
        .text(8, 9, sealStr, {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: seals > 0 ? '#fbbf24' : '#94a3b8'
        })
        .setOrigin(0.5);

      pill.add([pg, iconTxt, titleTxt, subTxt]);
      this.topBarContainer.add(pill);

      Juice.makeTactileButton(
        this,
        pill,
        pw + 6,
        64,
        () => {
          if (this.isModalOpen || this.isTransitioning) return;
          if (idx !== this.currentBoardIndex) {
            this.audio.playBrassClick();
            const savedTier = this.progress.lastTierByBoard[bSpec.id] ?? 1;
            this.loadBoardAndTier(idx, savedTier, true);
          } else {
            this.showRiddleParchmentToast(board, activeTier);
          }
        },
        'tab'
      );
    });

    // 3. 3 Riddle Tier Wax Seal Buttons (`Tier 1..3`: Junior Scout, Detective, Master Inspector)
    const tierStartX = 742;
    board.tiers.forEach((tSpec, tIdx) => {
      const tx = tierStartX + tIdx * 66;
      const ty = 31;
      const isSelected = tSpec.tier === activeTier.tier;
      const isSolved = Boolean(this.progress.completedRiddles[tSpec.riddleId]);

      const tBtn = this.add.container(tx, ty);
      const tg = this.add.graphics();

      // Crimson & Gold Wax Seal circle
      tg.fillStyle(isSolved ? 0x991b1b : isSelected ? 0x78350f : 0x271409, 0.98);
      tg.fillCircle(0, 0, 22);
      tg.lineStyle(isSelected ? 3 : 1.8, isSelected ? 0xfef08a : isSolved ? 0xfbbf24 : 0x92400e, 1);
      tg.strokeCircle(0, 0, 22);

      if (isSolved) {
        tg.lineStyle(1, 0xfde047, 0.8);
        tg.strokeCircle(0, 0, 17);
      }

      const labelStr = isSolved ? `★${tSpec.tier}` : `#${tSpec.tier}`;
      const tTxt = this.add
        .text(0, 0, labelStr, {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '14px',
          fontStyle: 'bold',
          color: isSelected || isSolved ? '#fef08a' : '#cbb89d'
        })
        .setOrigin(0.5);

      tBtn.add([tg, tTxt]);
      this.topBarContainer.add(tBtn);

      Juice.makeTactileButton(
        this,
        tBtn,
        64,
        64,
        () => {
          if (this.isModalOpen || this.isTransitioning) return;
          this.audio.playBrassClick();
          this.loadBoardAndTier(this.currentBoardIndex, tSpec.tier, true);
        },
        'tab'
      );
    });

    // 4. Replay Rhyming Riddle Speaker Button (`x: 952, y: 31`)
    const replayBtn = this.add.container(952, 31);
    const rg = this.add.graphics();
    rg.fillStyle(0x065f46, 0.96);
    rg.fillRoundedRect(-44, -22, 88, 44, 12);
    rg.lineStyle(2, 0x34d399, 1);
    rg.strokeRoundedRect(-44, -22, 88, 44, 12);
    const rTxt = this.add
      .text(0, 0, '🔊 RIDDLE', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '12.5px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    replayBtn.add([rg, rTxt]);
    this.topBarContainer.add(replayBtn);

    Juice.makeTactileButton(
      this,
      replayBtn,
      92,
      64,
      () => {
        if (this.isModalOpen) return;
        this.showRiddleParchmentToast(board, activeTier);
        this.audio.speakRiddle(activeTier.riddleId);
      },
      'pop'
    );

    // 5. Sparky Magnifying Hint Helper Button (`x: 1052, y: 31`)
    const hintBtn = this.add.container(1052, 31);
    const hg = this.add.graphics();
    hg.fillStyle(0x3b1d0a, 0.96);
    hg.fillRoundedRect(-44, -22, 88, 44, 12);
    hg.lineStyle(2, 0xfbbf24, 1);
    hg.strokeRoundedRect(-44, -22, 88, 44, 12);

    const activeKid = ArcadeState.getActiveKid();
    const avatarKey = activeKid.id === 'emma' ? 'avatar-doggie' : 'avatar-sparky';
    const hintAvatar = this.add.image(-22, 0, avatarKey).setDisplaySize(32, 32);
    const hintLbl = this.add
      .text(14, 0, '💡 HINT', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    hintBtn.add([hg, hintAvatar, hintLbl]);
    this.topBarContainer.add(hintBtn);

    Juice.makeTactileButton(
      this,
      hintBtn,
      92,
      64,
      () => {
        if (this.isModalOpen || this.isTransitioning) return;
        this.triggerGentleHelperHint(true);
      },
      'chime'
    );

    // 6. Golden Detective Casebook & Curio Trophy Shelf Button (`x: 1188, y: 31`)
    const totalSeals = this.getTotalEarnedSeals();
    const trophyBtn = this.add.container(1188, 31);
    const trG = this.add.graphics();
    trG.fillStyle(0x78350f, 0.98);
    trG.fillRoundedRect(-76, -22, 152, 44, 12);
    trG.lineStyle(2.5, 0xfde047, 1);
    trG.strokeRoundedRect(-76, -22, 152, 44, 12);
    const trTxt = this.add
      .text(0, 0, `🏆 CURIOS ${totalSeals}/12`, {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    trophyBtn.add([trG, trTxt]);
    this.topBarContainer.add(trophyBtn);

    Juice.makeTactileButton(
      this,
      trophyBtn,
      156,
      64,
      () => {
        if (this.isTransitioning) return;
        this.openCasebookModal();
      },
      'fanfare'
    );
  }

  /**
   * Displays a warm, non-blocking parchment banner beneath the top bar showing the spoken
   * Walter Wick rhyming riddle for 4.8 seconds (or until tapped).
   */
  private showRiddleParchmentToast(board: ISpyBoardSpec, tierSpec: ISpyTierSpec): void {
    this.riddleBannerContainer.removeAll(true);

    const banner = this.add.container(640, 98);
    const w = 960;
    const h = 54;
    const bg = this.add.graphics();
    bg.fillStyle(0x1c0d06, 0.92);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    bg.lineStyle(2, 0xfbbf24, 0.95);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);

    const tierBadge = this.add
      .text(0, -13, `${board.title.toUpperCase()} — TIER ${tierSpec.tier}: ${tierSpec.tierTitle.toUpperCase()}`, {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '11.5px',
        fontStyle: 'bold',
        color: '#fbbf24'
      })
      .setOrigin(0.5);

    const riddleTxt = this.add
      .text(0, 8, `"${tierSpec.riddleText}"`, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '14.5px',
        fontStyle: 'italic',
        color: '#fef9c3'
      })
      .setOrigin(0.5);

    banner.add([bg, tierBadge, riddleTxt]);
    banner.setAlpha(0);
    this.riddleBannerContainer.add(banner);

    this.tweens.add({
      targets: banner,
      alpha: 1,
      duration: 220,
      hold: 4600,
      yoyo: true,
      onComplete: () => {
        banner.destroy();
      }
    });
  }

  // ===========================================================================
  // BOTTOM MAHOGANY MULTI-INSTANCE VISUAL CHECKLIST DOCK (`0/3`, `0/2`, `0/1`)
  // ===========================================================================

  private renderBottomChecklistDock(tierSpec: ISpyTierSpec): void {
    this.bottomDockContainer.removeAll(true);
    this.checklistCards.clear();

    const dockY = 566;
    const dockH = 154;

    // Carved mahogany & brass dock shelf
    const dockG = this.add.graphics();
    dockG.fillStyle(0x160b05, 0.95);
    dockG.fillRect(0, dockY, 1280, dockH);
    dockG.lineStyle(3, 0xd97706, 1);
    dockG.lineBetween(0, dockY, 1280, dockY);
    dockG.lineStyle(1, 0xfef08a, 0.55);
    dockG.lineBetween(0, dockY + 3, 1280, dockY + 3);
    this.bottomDockContainer.add(dockG);

    const numCards = tierSpec.targets.length;
    const cardW = numCards >= 4 ? 268 : 320;
    const cardH = 126;
    const gap = 22;
    const totalW = numCards * cardW + (numCards - 1) * gap;
    const startX = 640 - totalW / 2 + cardW / 2;
    const cardCenterY = dockY + dockH / 2 + 2;

    tierSpec.targets.forEach((target, idx) => {
      const cx = startX + idx * (cardW + gap);
      const cardContainer = this.add.container(cx, cardCenterY);

      const cardBg = this.add.graphics();
      this.drawChecklistCardBackground(cardBg, cardW, cardH, false);

      // Studio photo inset frame on the left of the card
      const photoBoxX = -cardW / 2 + 58;
      const photoBg = this.add.graphics();
      photoBg.fillStyle(0x271409, 0.95);
      photoBg.fillRoundedRect(photoBoxX - 44, -46, 88, 92, 12);
      photoBg.lineStyle(2, 0xd97706, 0.85);
      photoBg.strokeRoundedRect(photoBoxX - 44, -46, 88, 92, 12);

      // Isolated studio photo of the target object
      const itemIcon = this.add.image(photoBoxX, 0, target.itemType).setOrigin(0.5, 0.5);
      const maxIconDim = 74;
      const texW = Math.max(1, itemIcon.width);
      const texH = Math.max(1, itemIcon.height);
      const iconScale = Math.min(maxIconDim / texW, maxIconDim / texH);
      itemIcon.setScale(iconScale);

      // Target Item Label & Live Counter Badge (`0 / 3`, `0 / 2`, `0 / 1`)
      const textCenterX = 36;
      const displayLabel = target.count > 1 ? target.pluralLabel : target.label;
      const titleTxt = this.add
        .text(textCenterX, -34, displayLabel.toUpperCase(), {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: numCards >= 4 ? '14px' : '15.5px',
          fontStyle: 'bold',
          color: '#451a03'
        })
        .setOrigin(0.5);

      const countBadgeBg = this.add.graphics();
      countBadgeBg.fillStyle(0x3b1d0a, 0.96);
      countBadgeBg.fillRoundedRect(textCenterX - 46, -15, 92, 30, 10);
      countBadgeBg.lineStyle(1.8, 0xfbbf24, 0.95);
      countBadgeBg.strokeRoundedRect(textCenterX - 46, -15, 92, 30, 10);

      const countText = this.add
        .text(textCenterX, 0, `0 / ${target.count}`, {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '16px',
          fontStyle: 'bold',
          color: '#fef08a'
        })
        .setOrigin(0.5);

      // Glowing Pip Dots (`0..target.count`)
      const pipDots: Phaser.GameObjects.Graphics[] = [];
      const pipSpacing = 26;
      const pipStartX = textCenterX - ((target.count - 1) * pipSpacing) / 2;
      for (let p = 0; p < target.count; p++) {
        const pipG = this.add.graphics();
        pipG.setPosition(pipStartX + p * pipSpacing, 34);
        this.drawPipDot(pipG, false);
        pipDots.push(pipG);
      }

      // Green Checkmark & Gold Ribbon Stamp (hidden until `foundCount === target.count`)
      const stampContainer = this.add.container(cardW / 2 - 34, -cardH / 2 + 24).setVisible(false);
      const stampG = this.add.graphics();
      // Gold ribbon tails
      stampG.fillStyle(0xd97706, 1);
      stampG.fillTriangle(-14, 10, -24, 32, -4, 24);
      stampG.fillTriangle(14, 10, 24, 32, 4, 24);
      // Emerald green seal medallion
      stampG.fillStyle(0x059669, 1);
      stampG.fillCircle(0, 0, 22);
      stampG.lineStyle(3, 0xfef08a, 1);
      stampG.strokeCircle(0, 0, 22);
      const checkTxt = this.add
        .text(0, 0, '✓', {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '24px',
          fontStyle: 'bold',
          color: '#ffffff'
        })
        .setOrigin(0.5);
      stampContainer.add([stampG, checkTxt]);

      cardContainer.add([
        cardBg,
        photoBg,
        itemIcon,
        titleTxt,
        countBadgeBg,
        countText,
        ...pipDots,
        stampContainer
      ]);
      this.bottomDockContainer.add(cardContainer);

      // Tapping a picture card speaks its studio object name aloud & bounces the card!
      const hitZone = this.add
        .zone(0, 0, cardW, cardH)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      cardContainer.add(hitZone);

      hitZone.on('pointerdown', () => {
        if (this.isModalOpen || this.isTransitioning) return;
        Juice.squashAndStretch(this, cardContainer, 0.12, 140);
        this.audio.speakItemName(target.audioKey);
      });

      this.checklistCards.set(target.itemType, {
        target,
        foundCount: 0,
        container: cardContainer,
        cardBg,
        itemIcon,
        countText,
        pipDots,
        stampContainer,
        stageX: cx,
        stageY: cardCenterY
      });
    });
  }

  private drawChecklistCardBackground(
    g: Phaser.GameObjects.Graphics,
    w: number,
    h: number,
    isCompleted: boolean
  ): void {
    g.clear();
    // Drop shadow
    g.fillStyle(0x060301, 0.65);
    g.fillRoundedRect(-w / 2 + 3, -h / 2 + 4, w, h, 16);

    // Warm cream parchment card body (or soft golden-emerald tint when completed)
    g.fillStyle(isCompleted ? 0xecfdf5 : 0xfdf8ec, 0.98);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);

    g.lineStyle(3, isCompleted ? 0x10b981 : 0xd97706, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);

    g.lineStyle(1.2, isCompleted ? 0x34d399 : 0xfbbf24, 0.85);
    g.strokeRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 12);
  }

  private drawPipDot(g: Phaser.GameObjects.Graphics, filled: boolean): void {
    g.clear();
    if (filled) {
      g.fillStyle(0x10b981, 1);
      g.fillCircle(0, 0, 9);
      g.lineStyle(2, 0xfef08a, 1);
      g.strokeCircle(0, 0, 9);
      g.fillStyle(0xfef08a, 0.9);
      g.fillCircle(-2.5, -2.5, 3);
    } else {
      g.fillStyle(0xd6c7b2, 0.9);
      g.fillCircle(0, 0, 8);
      g.lineStyle(1.8, 0x78350f, 0.85);
      g.strokeCircle(0, 0, 8);
    }
  }

  // ===========================================================================
  // INTERACTIVE LENS DRAGGING & TAP-TO-FIND HIT DETECTION
  // ===========================================================================

  private installStageInputListeners(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isModalOpen || this.isTransitioning) return;

      // Ignore clicks inside top bar (`y < 64`) or bottom dock (`y > 564`)
      if (pointer.y < 64 || pointer.y > 564) return;

      this.pointerDownPos = { x: pointer.x, y: pointer.y };
      this.pointerDownTime = performance.now();

      // Check if grabbing the offset mahogany handle (`dx: +75..+110, dy: +70..+105`)
      const handleCenterX = this.lensX + 82;
      const handleCenterY = this.lensY + 76;
      const distToHandle = Math.hypot(pointer.x - handleCenterX, pointer.y - handleCenterY);

      if (distToHandle <= 74) {
        this.isDraggingHandle = true;
        this.targetLensX = pointer.x - 82;
        this.targetLensY = pointer.y - 76;
      } else {
        this.isDraggingHandle = false;
        this.targetLensX = pointer.x;
        this.targetLensY = pointer.y;
      }

      // Immediately check if the child tapped directly on a requested target object
      // (either through the 2.5x magnifying glass or directly on the stage!)
      this.tryCollectTargetAtPointer(pointer.x, pointer.y);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isModalOpen || this.isTransitioning) return;
      if (pointer.y < 64 || pointer.y > 564) return;

      if (this.isDraggingHandle && pointer.isDown) {
        this.targetLensX = pointer.x - 82;
        this.targetLensY = pointer.y - 76;
      } else if (pointer.isDown) {
        // Ergonomic slight upward offset when dragging on touch so a toddler's finger never covers the center
        const touchOffsetY = pointer.wasTouch ? -28 : 0;
        this.targetLensX = pointer.x;
        this.targetLensY = pointer.y + touchOffsetY;
      } else {
        this.targetLensX = pointer.x;
        this.targetLensY = pointer.y;
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.isModalOpen || this.isTransitioning) return;
      const dragDist = Math.hypot(pointer.x - this.pointerDownPos.x, pointer.y - this.pointerDownPos.y);
      const elapsed = performance.now() - this.pointerDownTime;
      this.isDraggingHandle = false;

      if (pointer.y >= 64 && pointer.y <= 564 && dragDist < 36 && elapsed < 550) {
        this.tryCollectTargetAtPointer(pointer.x, pointer.y);
      }
    });
  }

  /**
   * Checks whether `(tapX, tapY)` hits an uncollected active target object —
   * supporting BOTH:
   *   1. Tapping a 2.5x magnified object inside the circular lens (`worldPos = lensPos + (tapPos - lensPos) / 2.5`)
   *   2. Tapping directly on the object on the `1280x720` stage!
   */
  private tryCollectTargetAtPointer(tapX: number, tapY: number): void {
    const distFromLensCenter = Math.hypot(tapX - this.lensX, tapY - this.lensY);
    const lensWorldX = this.lensX + (tapX - this.lensX) / LENS_MAGNIFICATION;
    const lensWorldY = this.lensY + (tapY - this.lensY) / LENS_MAGNIFICATION;

    let bestCandidate: LiveTargetInstance | null = null;
    let bestDist = Infinity;

    for (const item of this.liveTargets) {
      if (item.collected) continue;

      const card = this.checklistCards.get(item.spec.itemType);
      // Only collect if this itemType is part of the current riddle tier AND still needs more instances
      if (!card || card.foundCount >= card.target.count) continue;

      // 1. Distance in stage coordinates
      const directDist = Math.hypot(tapX - item.spec.stageX, tapY - item.spec.stageY);

      // 2. Distance through the 2.5x magnifying glass lens (if tap is inside the 115px lens)
      const magnifiedDist =
        distFromLensCenter <= LENS_RADIUS + 14
          ? Math.hypot(lensWorldX - item.spec.stageX, lensWorldY - item.spec.stageY)
          : Infinity;

      const effectiveDist = Math.min(directDist, magnifiedDist);
      const hitRadius = Math.max(46, item.spec.stageRadius); // >= 92px diameter hit area

      if (effectiveDist <= hitRadius && effectiveDist < bestDist) {
        bestDist = effectiveDist;
        bestCandidate = item;
      }
    }

    if (bestCandidate) {
      this.collectTargetInstance(bestCandidate);
      return;
    }

    // Check if the child tapped a non-target studio miniature (gentle zero-punishment feedback)
    const board = MANIFEST.boards[this.currentBoardIndex];
    for (const obj of board.placedObjects) {
      const d = Math.hypot(tapX - obj.stageX, tapY - obj.stageY);
      if (d <= 36) {
        this.audio.playGentleClutterTap();
        // Tiny golden dust sparkle at tap point
        Juice.burstStars(this, tapX, tapY, 4, [0xfef08a, 0xd97706]);
        break;
      }
    }
  }

  /**
   * Executes the celebratory Golden Starburst Ring, 2.5x Magnifying Glass close-up pop,
   * spoken item/count confirmation, and flight into the bottom visual checklist card!
   */
  private collectTargetInstance(instance: LiveTargetInstance): void {
    if (instance.collected) return;
    instance.collected = true;
    this.lastDiscoveryAt = performance.now();
    this.autoHintDoneForCurrentTarget = false;

    // 1. Remove the found object and its shadow from the board so it physically lifts off!
    instance.baseShadow.setVisible(false);
    instance.baseSprite.setVisible(false);
    instance.zoomShadow.setVisible(false);
    instance.zoomSprite.setVisible(false);

    const startX = instance.spec.stageX;
    const startY = instance.spec.stageY;

    // Center the 2.5x Brass Magnifying Glass smoothly on the found object
    this.targetLensX = startX;
    this.targetLensY = startY;

    const card = this.checklistCards.get(instance.spec.itemType);
    if (!card) return;

    card.foundCount = Math.min(card.target.count, card.foundCount + 1);
    const foundNow = card.foundCount;
    const totalNeeded = card.target.count;

    // 2. Play discovery chime pop + speak live object count ("One brass key.", "All three brass keys found.")
    this.audio.playDiscoveryChimePop(foundNow - 1);
    this.audio.speakItemAndProgress(
      instance.spec.audioKey,
      instance.spec.itemType,
      foundNow,
      totalNeeded
    );

    // 3. Golden Starburst Ring & Star Particles around the discovery spot
    this.spawnGoldenStarburstRing(startX, startY);
    Juice.burstStars(this, startX, startY, 18, [0xfef08a, 0xfbbf24, 0x34d399, 0xffffff]);

    // 4. Pop the found object upward into the 2.5x Magnifying Glass for a close-up inspection!
    const popupContainer = this.add.container(startX, startY).setDepth(90);

    const glowRing = this.add.graphics();
    glowRing.fillStyle(0xfef08a, 0.28);
    glowRing.fillCircle(0, 0, 68);
    glowRing.lineStyle(3.5, 0xfde047, 0.95);
    glowRing.strokeCircle(0, 0, 68);

    const closeupSprite = this.add
      .image(0, 0, instance.spec.itemType)
      .setOrigin(0.5, 0.5)
      .setScale(instance.spec.stageScale * 2.55);

    const badgePill = this.add.graphics();
    badgePill.fillStyle(0x065f46, 0.96);
    badgePill.fillRoundedRect(-58, 46, 116, 28, 12);
    badgePill.lineStyle(2, 0xfef08a, 1);
    badgePill.strokeRoundedRect(-58, 46, 116, 28, 12);

    const badgeLabel = this.add
      .text(0, 60, `${foundNow} / ${totalNeeded} ✓`, {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);

    popupContainer.add([glowRing, closeupSprite, badgePill, badgeLabel]);
    popupContainer.setScale(0.35);
    this.fxOverlayContainer.add(popupContainer);

    // Pop up into the magnifying glass, hold briefly for inspection, then fly down into the checklist card!
    this.tweens.add({
      targets: popupContainer,
      scaleX: 1.08,
      scaleY: 1.08,
      y: startY - 12,
      duration: 240,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: popupContainer,
          x: card.stageX,
          y: card.stageY,
          scaleX: 0.32,
          scaleY: 0.32,
          duration: 460,
          delay: 320,
          ease: 'Cubic.easeInOut',
          onComplete: () => {
            popupContainer.destroy();
            this.updateChecklistCardOnArrival(card);
          }
        });
      }
    });
  }

  private spawnGoldenStarburstRing(x: number, y: number): void {
    const ring = this.add.graphics().setPosition(x, y).setDepth(88);
    ring.lineStyle(5, 0xfef08a, 1);
    ring.strokeCircle(0, 0, 26);
    ring.lineStyle(2.5, 0xf59e0b, 0.9);
    ring.strokeCircle(0, 0, 18);
    this.fxOverlayContainer.add(ring);

    this.tweens.add({
      targets: ring,
      scaleX: 3.4,
      scaleY: 3.4,
      alpha: 0,
      duration: 520,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy()
    });
  }

  private updateChecklistCardOnArrival(card: ChecklistCardUI): void {
    const isCardComplete = card.foundCount >= card.target.count;
    card.countText.setText(`${card.foundCount} / ${card.target.count}`);

    // Fill pip dots up to `card.foundCount`
    card.pipDots.forEach((pipG, idx) => {
      this.drawPipDot(pipG, idx < card.foundCount);
    });

    this.audio.playChecklistSlotSnap(isCardComplete);
    Juice.squashAndStretch(this, card.container, 0.16, 150);
    Juice.burstStars(this, card.stageX, card.stageY - 20, 10, [0xfef08a, 0x34d399, 0xfbbf24]);

    if (isCardComplete) {
      const numCards = this.checklistCards.size;
      const cardW = numCards >= 4 ? 268 : 320;
      const cardH = 126;
      this.drawChecklistCardBackground(card.cardBg, cardW, cardH, true);

      card.stampContainer.setVisible(true);
      card.stampContainer.setScale(2.1);
      this.tweens.add({
        targets: card.stampContainer,
        scaleX: 1,
        scaleY: 1,
        duration: 240,
        ease: 'Back.easeOut'
      });
    }

    // Check if ALL cards in the current Riddle Tier are now complete!
    let allComplete = true;
    for (const c of this.checklistCards.values()) {
      if (c.foundCount < c.target.count) {
        allComplete = false;
        break;
      }
    }

    if (allComplete) {
      this.time.delayedCall(520, () => {
        this.handleRiddleTierSolved();
      });
    }
  }

  // ===========================================================================
  // GENTLE SPARKY DETECTIVE HELPER HINT (MANUAL & 25-SECOND AUTO-PULSE)
  // ===========================================================================

  private triggerGentleHelperHint(speakHintVoice: boolean): void {
    // Pick the first uncollected active target instance
    const remaining = this.liveTargets.filter((item) => {
      if (item.collected) return false;
      const card = this.checklistCards.get(item.spec.itemType);
      return Boolean(card && card.foundCount < card.target.count);
    });

    if (remaining.length === 0) return;

    const hintTarget = remaining[0];
    const hx = hintTarget.spec.stageX;
    const hy = hintTarget.spec.stageY;

    if (speakHintVoice) {
      this.audio.speakPrompt('hint_shimmer');
    }

    // Pulse 3 golden shimmer rings + twinkling stars around the target object
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 260, () => {
        if (hintTarget.collected) return;
        const pulse = this.add.graphics().setPosition(hx, hy).setDepth(86);
        pulse.lineStyle(4, 0xfef08a, 0.95);
        pulse.strokeCircle(0, 0, 18);
        pulse.fillStyle(0xfde047, 0.22);
        pulse.fillCircle(0, 0, 18);
        this.fxOverlayContainer.add(pulse);

        this.tweens.add({
          targets: pulse,
          scaleX: 3.2,
          scaleY: 3.2,
          alpha: 0,
          duration: 760,
          ease: 'Sine.easeOut',
          onComplete: () => pulse.destroy()
        });

        Juice.burstStars(this, hx, hy, 6, [0xfef08a, 0xfbbf24]);
      });
    }

    // Gentle attention wiggle on the target sprite
    this.tweens.add({
      targets: [hintTarget.baseSprite, hintTarget.zoomSprite],
      scaleX: hintTarget.spec.stageScale * 1.22,
      scaleY: hintTarget.spec.stageScale * 1.22,
      duration: 220,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut'
    });
  }

  // ===========================================================================
  // RIDDLE TIER SOLVED: CRIMSON WAX SEAL & RARE CURIO TROPHY UNLOCK
  // ===========================================================================

  private handleRiddleTierSolved(): void {
    const board = MANIFEST.boards[this.currentBoardIndex];
    const tierSpec = board.tiers.find((t) => t.tier === this.currentTier) ?? board.tiers[0];

    this.progress.completedRiddles[tierSpec.riddleId] = true;
    this.progress.unlockedCurios[tierSpec.curioReward.id] = true;
    this.saveProgress();

    // Refresh top bar seals count
    this.renderTopDetectiveBar(board, tierSpec);

    this.audio.playWaxSealStamp();
    this.audio.playDetectiveFanfare();
    this.audio.speakCaseSolvedForActiveKid();

    this.openRiddleSolvedCelebrationModal(board, tierSpec);
  }

  private openRiddleSolvedCelebrationModal(board: ISpyBoardSpec, tierSpec: ISpyTierSpec): void {
    if (this.modalContainer) {
      this.modalContainer.destroy(true);
      this.modalContainer = null;
    }
    this.isModalOpen = true;

    const root = this.add.container(640, 360).setDepth(300);
    this.modalContainer = root;

    const backdrop = this.add.rectangle(0, 0, 1280, 720, 0x080402, 0.76).setInteractive();
    root.add(backdrop);

    const card = this.add.container(0, 0);
    root.add(card);

    const cardW = 720;
    const cardH = 440;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.65);
    g.fillRoundedRect(-cardW / 2 + 6, -cardH / 2 + 8, cardW, cardH, 26);
    g.fillStyle(0x1f1007, 0.98);
    g.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 26);
    g.lineStyle(4, 0xfbbf24, 1);
    g.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 26);
    g.lineStyle(1.5, 0xfef08a, 0.65);
    g.strokeRoundedRect(-cardW / 2 + 6, -cardH / 2 + 6, cardW - 12, cardH - 12, 20);

    const header = this.add
      .text(0, -172, '★ CASE SOLVED, JUNIOR DETECTIVE! ★', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '25px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#271206',
        strokeThickness: 4
      })
      .setOrigin(0.5);

    const subHeader = this.add
      .text(0, -136, `${board.title} — ${tierSpec.tierTitle} Seal Earned`, {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#fde68a'
      })
      .setOrigin(0.5);

    // Left showcase: Crimson & Gold Detective Wax Seal
    const sealBox = this.add.container(-155, -12);
    const sg = this.add.graphics();
    sg.fillStyle(0x7f1d1d, 1);
    sg.fillCircle(0, 0, 68);
    sg.lineStyle(5, 0xfbbf24, 1);
    sg.strokeCircle(0, 0, 68);
    sg.fillStyle(0x991b1b, 1);
    sg.fillCircle(0, 0, 54);
    sg.lineStyle(2, 0xfef08a, 0.9);
    sg.strokeCircle(0, 0, 54);
    const sealStar = this.add
      .text(0, -6, '★', {
        fontSize: '52px',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    const sealLbl = this.add
      .text(0, 34, `SEAL #${tierSpec.tier}`, {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    sealBox.add([sg, sealStar, sealLbl]);

    // Right showcase: Newly Unlocked Rare Golden Curio at 2.5x Zoom
    const curioBox = this.add.container(145, -12);
    const cg = this.add.graphics();
    cg.fillStyle(0x271206, 0.96);
    cg.fillRoundedRect(-130, -82, 260, 164, 18);
    cg.lineStyle(2.5, 0xfbbf24, 1);
    cg.strokeRoundedRect(-130, -82, 260, 164, 18);

    const curioGlow = this.add
      .image(0, -14, 'particle-star')
      .setTint(0xfef08a)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(2.2)
      .setAlpha(0.28);

    const curioSprite = this.add.image(0, -14, tierSpec.curioReward.itemType).setOrigin(0.5);
    const cMax = 96;
    const cScale = Math.min(cMax / Math.max(1, curioSprite.width), cMax / Math.max(1, curioSprite.height));
    curioSprite.setScale(cScale);

    const curioTitle = this.add
      .text(0, 52, `NEW CURIO: ${tierSpec.curioReward.title.toUpperCase()}`, {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '12.5px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);

    curioBox.add([cg, curioGlow, curioSprite, curioTitle]);

    // Bottom Action Buttons: `[ ▶ NEXT RIDDLE ]` and `[ 🏆 TROPHY SHELF ]`
    const nextBtn = this.add.container(-135, 148);
    const ng = this.add.graphics();
    ng.fillStyle(0x059669, 1);
    ng.fillRoundedRect(-125, -30, 250, 60, 16);
    ng.lineStyle(3, 0xfef08a, 1);
    ng.strokeRoundedRect(-125, -30, 250, 60, 16);
    const nTxt = this.add
      .text(0, 0, '▶ NEXT RIDDLE', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '19px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    nextBtn.add([ng, nTxt]);

    const shelfBtn = this.add.container(145, 148);
    const shG = this.add.graphics();
    shG.fillStyle(0xb45309, 1);
    shG.fillRoundedRect(-125, -30, 250, 60, 16);
    shG.lineStyle(3, 0xfef08a, 1);
    shG.strokeRoundedRect(-125, -30, 250, 60, 16);
    const shTxt = this.add
      .text(0, 0, '🏆 TROPHY SHELF', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    shelfBtn.add([shG, shTxt]);

    card.add([g, header, subHeader, sealBox, curioBox, nextBtn, shelfBtn]);
    card.setScale(0.84);

    this.tweens.add({
      targets: card,
      scaleX: 1,
      scaleY: 1,
      duration: 240,
      ease: 'Back.easeOut'
    });

    Juice.burstStars(this, 640, 260, 28, [0xfef08a, 0xfbbf24, 0x34d399, 0xffffff]);

    Juice.makeTactileButton(
      this,
      nextBtn,
      256,
      68,
      () => {
        this.closeActiveModal();
        if (this.currentTier < 3) {
          this.loadBoardAndTier(this.currentBoardIndex, (this.currentTier + 1) as 1 | 2 | 3, true);
        } else {
          const nextBoard = (this.currentBoardIndex + 1) % MANIFEST.boards.length;
          this.loadBoardAndTier(nextBoard, 1, true);
        }
      },
      'pop'
    );

    Juice.makeTactileButton(
      this,
      shelfBtn,
      256,
      68,
      () => {
        this.closeActiveModal();
        this.openCasebookModal();
      },
      'fanfare'
    );
  }

  // ===========================================================================
  // JUNIOR DETECTIVE CASEBOOK & COLLECTIBLE CURIO TROPHY SHELF MODAL
  // ===========================================================================

  private openCasebookModal(): void {
    if (this.modalContainer) {
      this.modalContainer.destroy(true);
      this.modalContainer = null;
    }
    this.isModalOpen = true;
    this.audio.speakPrompt('casebook_open');

    const root = this.add.container(640, 360).setDepth(320);
    this.modalContainer = root;

    const backdrop = this.add.rectangle(0, 0, 1280, 720, 0x070301, 0.82).setInteractive();
    root.add(backdrop);

    const cabinetW = 1120;
    const cabinetH = 630;
    const cabinet = this.add.container(0, 0);
    root.add(cabinet);

    const bg = this.add.graphics();
    // Outer drop shadow & carved mahogany cabinet body
    bg.fillStyle(0x000000, 0.72);
    bg.fillRoundedRect(-cabinetW / 2 + 8, -cabinetH / 2 + 10, cabinetW, cabinetH, 26);
    bg.fillStyle(0x1c0e06, 0.98);
    bg.fillRoundedRect(-cabinetW / 2, -cabinetH / 2, cabinetW, cabinetH, 26);
    bg.lineStyle(4, 0xd97706, 1);
    bg.strokeRoundedRect(-cabinetW / 2, -cabinetH / 2, cabinetW, cabinetH, 26);
    bg.lineStyle(1.5, 0xfef08a, 0.65);
    bg.strokeRoundedRect(-cabinetW / 2 + 6, -cabinetH / 2 + 6, cabinetW - 12, cabinetH - 12, 20);

    // Velvet trophy shelves inset
    bg.fillStyle(0x2b0912, 0.94);
    bg.fillRoundedRect(-cabinetW / 2 + 28, -42, cabinetW - 56, 286, 16);
    bg.lineStyle(2.5, 0xb45309, 0.95);
    bg.strokeRoundedRect(-cabinetW / 2 + 28, -42, cabinetW - 56, 286, 16);

    // Horizontal mahogany shelf divider between the 2 rows of 6 curios
    bg.fillStyle(0x3b1d0a, 1);
    bg.fillRect(-cabinetW / 2 + 30, 96, cabinetW - 60, 10);
    bg.lineStyle(1.5, 0xfbbf24, 0.75);
    bg.lineBetween(-cabinetW / 2 + 30, 96, cabinetW / 2 - 30, 96);

    cabinet.add(bg);

    const totalSeals = this.getTotalEarnedSeals();
    const headerTitle = this.add
      .text(
        0,
        -276,
        `JUNIOR DETECTIVE CASEBOOK & CURIO TROPHY SHELF (${totalSeals} / 12 SEALS)`,
        {
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#fef08a',
          stroke: '#271206',
          strokeThickness: 4
        }
      )
      .setOrigin(0.5);
    cabinet.add(headerTitle);

    // 1. Top Row: 4 Diorama Board Cards with Crimson & Gold Wax Seals (`0/3` .. `3/3`)
    MANIFEST.boards.forEach((bSpec, idx) => {
      const bx = -390 + idx * 260;
      const by = -148;
      const cardW = 242;
      const cardH = 172;
      const bCard = this.add.container(bx, by);

      const cg = this.add.graphics();
      cg.fillStyle(0x271409, 0.98);
      cg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 14);
      cg.lineStyle(2.5, idx === this.currentBoardIndex ? 0xfde047 : 0x92400e, 1);
      cg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 14);

      // Miniature preview of the full composited board
      const thumbKey = this.textures.exists(bSpec.fullBoardKey) ? bSpec.fullBoardKey : bSpec.boardKey;
      const thumb = this.add
        .image(0, -24, thumbKey)
        .setOrigin(0.5)
        .setDisplaySize(cardW - 20, 96);

      const titleTxt = this.add
        .text(0, 38, bSpec.shortTitle.toUpperCase(), {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#fef08a'
        })
        .setOrigin(0.5);

      bCard.add([cg, thumb, titleTxt]);

      // 3 Crimson Wax Seal slots along the bottom of the board card
      bSpec.tiers.forEach((tSpec, tIdx) => {
        const earned = Boolean(this.progress.completedRiddles[tSpec.riddleId]);
        const sx = -42 + tIdx * 42;
        const sy = 64;
        const sg = this.add.graphics();
        sg.fillStyle(earned ? 0x991b1b : 0x1c0d06, 1);
        sg.fillCircle(sx, sy, 14);
        sg.lineStyle(2, earned ? 0xfde047 : 0x78350f, 1);
        sg.strokeCircle(sx, sy, 14);
        const sStar = this.add
          .text(sx, sy, earned ? '★' : `${tSpec.tier}`, {
            fontFamily: '"Fredoka", Georgia, serif',
            fontSize: '12px',
            fontStyle: 'bold',
            color: earned ? '#fef08a' : '#78716c'
          })
          .setOrigin(0.5);
        bCard.add([sg, sStar]);
      });

      cabinet.add(bCard);

      Juice.makeTactileButton(
        this,
        bCard,
        cardW,
        cardH,
        () => {
          this.closeActiveModal();
          const savedTier = this.progress.lastTierByBoard[bSpec.id] ?? 1;
          this.loadBoardAndTier(idx, savedTier, true);
        },
        'tab'
      );
    });

    // 2. Velvet Curio Trophy Shelf: 12 Rare Golden Curios (2 rows × 6 columns)
    //    Tapping any curio inspects it at 2.5x zoom in the center loupe & plays its chime!
    const inspectOverlay = this.add.container(0, 0).setDepth(20);

    const allTiers: Array<{ board: ISpyBoardSpec; tier: ISpyTierSpec }> = [];
    for (const b of MANIFEST.boards) {
      for (const t of b.tiers) {
        allTiers.push({ board: b, tier: t });
      }
    }

    allTiers.forEach((entry, idx) => {
      const col = idx % 6;
      const row = Math.floor(idx / 6);
      const cx = -425 + col * 170;
      const cy = row === 0 ? 26 : 168;

      const curio = entry.tier.curioReward;
      const unlocked = Boolean(this.progress.unlockedCurios[curio.id]);
      const meta = MANIFEST.items[curio.itemType];

      const slot = this.add.container(cx, cy);
      const sg = this.add.graphics();

      // Golden velvet pedestal base
      sg.fillStyle(unlocked ? 0x451a03 : 0x1a0b05, 0.95);
      sg.fillRoundedRect(-72, -52, 144, 108, 12);
      sg.lineStyle(2, unlocked ? 0xfbbf24 : 0x573012, 0.95);
      sg.strokeRoundedRect(-72, -52, 144, 108, 12);

      const icon = this.add.image(0, -10, curio.itemType).setOrigin(0.5);
      const maxDim = 68;
      const sc = Math.min(maxDim / Math.max(1, icon.width), maxDim / Math.max(1, icon.height));
      icon.setScale(sc);

      if (!unlocked) {
        icon.setTint(0x1e1b18);
        icon.setAlpha(0.55);
      }

      const nameTxt = this.add
        .text(0, 38, unlocked ? curio.title : `🔒 ${entry.board.shortTitle} #${entry.tier.tier}`, {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '10.5px',
          fontStyle: 'bold',
          color: unlocked ? '#fef08a' : '#94a3b8'
        })
        .setOrigin(0.5);

      slot.add([sg, icon, nameTxt]);
      cabinet.add(slot);

      Juice.makeTactileButton(
        this,
        slot,
        146,
        110,
        () => {
          this.showCurioZoomLoupe(inspectOverlay, curio, meta, unlocked, entry.board, entry.tier);
        },
        unlocked ? 'chime' : 'pop'
      );
    });

    // 3. Close `[ ✓ BACK TO DETECTIVE DESK ]` Button (`y: 274`)
    const closeBtn = this.add.container(0, 274);
    const clG = this.add.graphics();
    clG.fillStyle(0x059669, 1);
    clG.fillRoundedRect(-165, -26, 330, 52, 15);
    clG.lineStyle(3, 0xfef08a, 1);
    clG.strokeRoundedRect(-165, -26, 330, 52, 15);
    const clTxt = this.add
      .text(0, 0, '✓ BACK TO DETECTIVE DESK', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    closeBtn.add([clG, clTxt]);
    cabinet.add([closeBtn, inspectOverlay]);

    Juice.makeTactileButton(
      this,
      closeBtn,
      340,
      64,
      () => {
        this.closeActiveModal();
      },
      'pop'
    );

    cabinet.setScale(0.9);
    this.tweens.add({
      targets: cabinet,
      scaleX: 1,
      scaleY: 1,
      duration: 210,
      ease: 'Back.easeOut'
    });
  }

  /**
   * Opens a 2.5x Brass Magnifying Loupe overlay inside the Trophy Shelf modal when a child
   * taps any Rare Golden Curio to inspect it up close and hear its crystal chime!
   */
  private showCurioZoomLoupe(
    inspectOverlay: Phaser.GameObjects.Container,
    curio: ISpyCurioReward,
    meta: ISpyItemMeta | undefined,
    unlocked: boolean,
    board: ISpyBoardSpec,
    tier: ISpyTierSpec
  ): void {
    inspectOverlay.removeAll(true);

    if (unlocked) {
      this.audio.playCurioSparkle(meta?.audioKey);
    } else {
      this.audio.playBrassClick();
    }

    const catcher = this.add.rectangle(0, 0, 1120, 630, 0x050201, 0.65).setInteractive();
    const card = this.add.container(0, 0);

    const g = this.add.graphics();
    g.fillStyle(0x231107, 0.98);
    g.fillRoundedRect(-230, -185, 460, 370, 24);
    g.lineStyle(4, 0xfde047, 1);
    g.strokeRoundedRect(-230, -185, 460, 370, 24);

    // 2.5x Brass Magnifying Glass Loupe Ring in center
    g.fillStyle(0x140904, 1);
    g.fillCircle(0, -28, 102);
    g.lineStyle(8, 0xd97706, 1);
    g.strokeCircle(0, -28, 102);
    g.lineStyle(2.5, 0xfef08a, 0.9);
    g.strokeCircle(0, -28, 96);

    const sprite = this.add.image(0, -28, curio.itemType).setOrigin(0.5);
    const maxZoomDim = 152; // 2.5x curio zoom!
    const zScale = Math.min(maxZoomDim / Math.max(1, sprite.width), maxZoomDim / Math.max(1, sprite.height));
    sprite.setScale(zScale);
    if (!unlocked) {
      sprite.setTint(0x272320);
      sprite.setAlpha(0.65);
    }

    const titleTxt = this.add
      .text(0, 96, unlocked ? `★ ${curio.title.toUpperCase()} ★` : `🔒 ${curio.title.toUpperCase()}`, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);

    const subTxt = this.add
      .text(
        0,
        124,
        unlocked
          ? `Earned from ${board.title} (${tier.tierTitle})`
          : `Solve ${board.shortTitle} Tier ${tier.tier} (${tier.tierTitle}) to unlock!`,
        {
          fontFamily: '"Fredoka", Georgia, serif',
          fontSize: '14px',
          color: '#fde68a'
        }
      )
      .setOrigin(0.5);

    const okBtn = this.add.container(0, 158);
    const okG = this.add.graphics();
    okG.fillStyle(unlocked ? 0x059669 : 0xb45309, 1);
    okG.fillRoundedRect(-95, -20, 190, 40, 12);
    okG.lineStyle(2, 0xfef08a, 1);
    okG.strokeRoundedRect(-95, -20, 190, 40, 12);
    const okLbl = this.add
      .text(0, 0, unlocked ? '✓ CLOSE LOUPE' : '▶ PLAY THIS RIDDLE', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);
    okBtn.add([okG, okLbl]);

    card.add([g, sprite, titleTxt, subTxt, okBtn]);
    inspectOverlay.add([catcher, card]);

    card.setScale(0.75);
    this.tweens.add({
      targets: card,
      scaleX: 1,
      scaleY: 1,
      duration: 190,
      ease: 'Back.easeOut'
    });

    if (unlocked) {
      Juice.burstStars(this, 640, 330, 16, [0xfef08a, 0xfbbf24, 0xffffff]);
    }

    catcher.on('pointerdown', () => {
      inspectOverlay.removeAll(true);
    });

    Juice.makeTactileButton(
      this,
      okBtn,
      200,
      56,
      () => {
        if (unlocked) {
          inspectOverlay.removeAll(true);
        } else {
          this.closeActiveModal();
          this.loadBoardAndTier(board.index, tier.tier, true);
        }
      },
      'pop'
    );
  }

  private closeActiveModal(): void {
    if (this.modalContainer) {
      this.modalContainer.destroy(true);
      this.modalContainer = null;
    }
    this.isModalOpen = false;
  }
}
