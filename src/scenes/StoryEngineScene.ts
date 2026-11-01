/**
 * StoryEngineScene.ts
 * -------------------
 * Authentic 1992 Brøderbund *Just Grandma and Me* (Living Books) 2D Picture-Book Engine!
 *
 * Architectural Features:
 * 1. True Picture-Book Aesthetic & Slim Parchment Banner:
 *    - Compact warm cream storybook parchment banner (`top: 10px, height: 84px`, staying above `y = 94`
 *      so ceiling details like the Page 1 `ARRIVALS` sign at `(335, 158)` are 100% unobstructed).
 *    - Subtle, warm dog-eared page-turn corners at the bottom-left and bottom-right of the screen.
 *    - Unobtrusive hanging bookmark ribbons in the top corners to return to the Hub or toggle Play/Read mode.
 * 2. Hi-Res (`2752x1536` -> `1280x720`) Scaling & Dynamic Cutout Patch Animation:
 *    - Every loaded page background uses `.setOrigin(0.5, 0.5).setDisplaySize(1280, 720)` centered at `(640, 360)`.
 *    - Slices each hotspot's `(x, y, width, height)` multiplied by `(sourceWidth / 1280)` and `(sourceHeight / 720)`
 *      from the hi-res source image, then scales the cutout sprite back to `(width, height)` on the `1280x720`
 *      stage for zero-offset, pixel-exact alignment!
 * 3. Visual `Shift + D` Drag-and-Resize Hotspot Editor (`import.meta.env.DEV` only):
 *    - Drag any hotspot box to move `(x, y)` or drag its bottom-right corner handle to resize `(width, height)` live!
 *    - Click `[📋 Copy Page Hotspots]` in the debug bar to copy the updated TypeScript hotspot array to the clipboard!
 */

import Phaser from 'phaser';
import { ArcadeState, StoryMode } from '../core/ArcadeState';
import { AudioBus } from '../core/AudioBus';
import { Juice } from '../core/Juice';
import { STORY_CARTRIDGES } from '../stories/campoutAdventure';
import { JUST_NANA_AND_US } from '../stories/justNanaAndUs';
import {
  GagAnimationType,
  HotspotPropType,
  StoryCartridge,
  StoryHotspotData,
  StoryPageData
} from '../stories/storyTypes';

interface HotspotActorEntry {
  hotspot: StoryHotspotData;
  actor: Phaser.GameObjects.Container;
  hitZone: Phaser.GameObjects.Zone;
  placeholderNode: Phaser.GameObjects.Container;
  patchShadow: Phaser.GameObjects.Graphics;
  patchImage: Phaser.GameObjects.Image | null;
  spriteActor: Phaser.GameObjects.Sprite | null;
  cutoutTimer: Phaser.Time.TimerEvent | null;
}

type DebugDragState =
  | {
      mode: 'move';
      entry: HotspotActorEntry;
      startPointerX: number;
      startPointerY: number;
      startHotspotX: number;
      startHotspotY: number;
      moved: boolean;
    }
  | {
      mode: 'resize';
      entry: HotspotActorEntry;
      anchorLeft: number;
      anchorTop: number;
      moved: boolean;
    };

export class StoryEngineScene extends Phaser.Scene {
  private cartridge!: StoryCartridge;
  private currentPageIndex: number = 0;
  private storyMode: StoryMode = 'let-me-play';
  private cancelNarration: (() => void) | null = null;
  private autoAdvanceTimer: Phaser.Time.TimerEvent | null = null;

  private backdropContainer!: Phaser.GameObjects.Container;
  private exteriorStageContainer!: Phaser.GameObjects.Container;
  private occluderContainer!: Phaser.GameObjects.Container;
  private stageContainer!: Phaser.GameObjects.Container;
  private karaokeContainer!: Phaser.GameObjects.Container;
  private uiContainer!: Phaser.GameObjects.Container;
  private pageFlipOverlay!: Phaser.GameObjects.Graphics;
  private debugGraphics!: Phaser.GameObjects.Graphics;
  private debugLabelsContainer!: Phaser.GameObjects.Container;
  private debugHudContainer!: Phaser.GameObjects.Container;
  private debugHudText!: Phaser.GameObjects.Text;

  private hotspotEntries: HotspotActorEntry[] = [];
  private activeDebugDrag: DebugDragState | null = null;
  private patchRevisionCounter: number = 0;

  private wordPills: {
    container: Phaser.GameObjects.Container;
    bg: Phaser.GameObjects.Graphics;
    text: Phaser.GameObjects.Text;
    w: number;
    h: number;
  }[] = [];

  private debugEnabled: boolean = false;
  private bgProbeCache: Map<string, string | null> = new Map();
  private p3ClockDoggieBusy: boolean = false;
  private isEndingBook: boolean = false;
  private p1SplitFlapCells: {
    container: Phaser.GameObjects.Container;
    topFlap: Phaser.GameObjects.Graphics;
    bottomFlap: Phaser.GameObjects.Graphics;
    text: Phaser.GameObjects.Text;
    currentChar: string;
  }[] = [];

  constructor() {
    super({ key: 'StoryEngineScene' });
  }

  public init(data: { cartridgeId?: string; pageIndex?: number }): void {
    const id = data?.cartridgeId ?? JUST_NANA_AND_US.id;
    this.cartridge = STORY_CARTRIDGES[id] ?? JUST_NANA_AND_US;
    this.currentPageIndex = data?.pageIndex ?? 0;
    this.storyMode = ArcadeState.getStoryMode();
    this.isEndingBook = false;
  }

  public create(): void {
    this.backdropContainer = this.add.container(0, 0).setDepth(10);
    this.exteriorStageContainer = this.add.container(0, 0).setDepth(20);
    this.occluderContainer = this.add.container(0, 0).setDepth(30);
    this.stageContainer = this.add.container(0, 0).setDepth(50);
    this.karaokeContainer = this.add.container(0, 0).setDepth(200);
    this.uiContainer = this.add.container(0, 0).setDepth(300);
    this.pageFlipOverlay = this.add.graphics().setDepth(750).setAlpha(0);
    this.debugGraphics = this.add.graphics().setDepth(800);
    this.debugLabelsContainer = this.add.container(0, 0).setDepth(810);
    this.debugHudContainer = this.add.container(0, 0).setDepth(850).setVisible(false);

    this.buildDebugHudBar();
    this.setupDebugEditorListeners();
    this.renderCurrentPage(false);
  }

  /**
   * Builds the bottom `Shift + D` Developer Toolbar including the live coordinate readout
   * and the `[📋 Copy Page Hotspots]` clipboard export button!
   */
  private buildDebugHudBar(): void {
    const barBg = this.add.graphics();
    barBg.fillStyle(0x0f172a, 0.94);
    barBg.fillRoundedRect(140, 672, 1000, 42, 12);
    barBg.lineStyle(2, 0x22d3ee, 0.9);
    barBg.strokeRoundedRect(140, 672, 1000, 42, 12);

    this.debugHudText = this.add
      .text(158, 693, '🛠️ DEBUG EDITOR (Shift+D) | Drag box to move, drag ↘ corner to resize', {
        fontFamily: 'monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#22d3ee'
      })
      .setOrigin(0, 0.5);

    // `[📋 Copy Page Hotspots]` button
    const copyBtn = this.add.container(1015, 693);
    const copyBg = this.add.graphics();
    copyBg.fillStyle(0x10b981, 1);
    copyBg.fillRoundedRect(-112, -16, 224, 32, 8);
    copyBg.lineStyle(2, 0xfef08a, 1);
    copyBg.strokeRoundedRect(-112, -16, 224, 32, 8);

    const copyTxt = this.add
      .text(0, 0, '📋 Copy Page Hotspots', {
        fontFamily: 'monospace',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#0f172a'
      })
      .setOrigin(0.5);

    copyBtn.add([copyBg, copyTxt]);
    copyBtn.setSize(224, 36);
    copyBtn.setInteractive({ useHandCursor: true });
    copyBtn.on('pointerdown', (pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.copyCurrentPageHotspotsToClipboard(pointer.x, pointer.y);
    });

    this.debugHudContainer.add([barBg, this.debugHudText, copyBtn]);
  }

  private copyCurrentPageHotspotsToClipboard(px: number, py: number): void {
    const page = this.getCurrentPage();
    const formatted = page.hotspots
      .map((h) => {
        return [
          `        {`,
          `          id: '${h.id}',`,
          `          label: ${JSON.stringify(h.label)},`,
          `          x: ${Math.round(h.x)},`,
          `          y: ${Math.round(h.y)},`,
          `          width: ${Math.round(h.width)},`,
          `          height: ${Math.round(h.height)},`
        ].join('\n');
      })
      .join('\n');

    const fullJson = JSON.stringify(
      page.hotspots.map((h) => ({
        id: h.id,
        label: h.label,
        x: Math.round(h.x),
        y: Math.round(h.y),
        width: Math.round(h.width),
        height: Math.round(h.height)
      })),
      null,
      2
    );

    const payload = `// Page ${page.pageNumber} Hotspots (${page.title})\n${fullJson}\n\n/* TypeScript Snippet:\n${formatted}\n*/`;

    // eslint-disable-next-line no-console
    console.log(payload);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(payload).catch(() => {});
    }

    AudioBus.playSfx('chime');
    Juice.burstStars(this, px, py - 15, 12, [0x22d3ee, 0xfef08a]);
    Juice.popFloatingLabel(this, 640, 645, `📋 Copied Page ${page.pageNumber} Hotspots!`, '#22d3ee');
    this.debugHudText.setText(
      `✅ Copied Page ${page.pageNumber} (${page.hotspots.length} hotspots) to clipboard & console!`
    );
  }

  private setupDebugEditorListeners(): void {
    if (!import.meta.env.DEV) return;

    this.input.keyboard?.on('keydown-D', (event: KeyboardEvent) => {
      if (event.shiftKey) {
        this.debugEnabled = !this.debugEnabled;
        this.activeDebugDrag = null;
        AudioBus.playSfx('zap');
        this.refreshDebugOverlay();
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.debugEnabled) return;
      const rx = Math.round(pointer.x);
      const ry = Math.round(pointer.y);

      // Ignore clicks on the bottom debug toolbar itself
      if (ry >= 668 && rx >= 135 && rx <= 1145) return;

      // 1. Check if pointer clicked a bottom-right resize handle (32x32px hit zone, smallest area first)
      const sortedBySmallestArea = [...this.hotspotEntries].sort((a, b) => {
        const areaA = Math.max(64, a.hotspot.width) * Math.max(64, a.hotspot.height);
        const areaB = Math.max(64, b.hotspot.width) * Math.max(64, b.hotspot.height);
        return areaA - areaB;
      });

      for (const entry of sortedBySmallestArea) {
        const h = entry.hotspot;
        const hitW = Math.max(64, h.width);
        const hitH = Math.max(64, h.height);
        const right = h.x + hitW / 2;
        const bottom = h.y + hitH / 2;

        if (Math.abs(pointer.x - right) <= 16 && Math.abs(pointer.y - bottom) <= 16) {
          this.activeDebugDrag = {
            mode: 'resize',
            entry,
            anchorLeft: h.x - hitW / 2,
            anchorTop: h.y - hitH / 2,
            moved: false
          };
          return;
        }
      }

      // 2. Check if pointer clicked inside any hotspot box (smallest area first to match Smart Overlap Priority)
      for (const entry of sortedBySmallestArea) {
        const h = entry.hotspot;
        const hitW = Math.max(64, h.width);
        const hitH = Math.max(64, h.height);
        const left = h.x - hitW / 2;
        const top = h.y - hitH / 2;

        if (pointer.x >= left && pointer.x <= left + hitW && pointer.y >= top && pointer.y <= top + hitH) {
          this.activeDebugDrag = {
            mode: 'move',
            entry,
            startPointerX: pointer.x,
            startPointerY: pointer.y,
            startHotspotX: h.x,
            startHotspotY: h.y,
            moved: false
          };
          return;
        }
      }

      // 3. Otherwise log empty stage click coordinate
      const page = this.getCurrentPage();
      const msg = `[StoryEngine Debug] Page ${page.pageNumber} Click -> (x: ${rx}, y: ${ry})`;
      // eslint-disable-next-line no-console
      console.log(msg);
      this.debugHudText.setText(
        `🛠️ Page ${page.pageNumber} Click: (x: ${rx}, y: ${ry}) | Drag box to move, drag ↘ corner to resize`
      );
      Juice.popFloatingLabel(this, rx, ry, `(${rx}, ${ry})`, '#22d3ee');
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.debugEnabled || !this.activeDebugDrag || !pointer.isDown) return;

      const drag = this.activeDebugDrag;
      const h = drag.entry.hotspot;

      if (drag.mode === 'move') {
        const dx = pointer.x - drag.startPointerX;
        const dy = pointer.y - drag.startPointerY;
        if (Math.hypot(dx, dy) > 4) {
          drag.moved = true;
        }
        h.x = Math.round(Phaser.Math.Clamp(drag.startHotspotX + dx, 32, 1248));
        h.y = Math.round(Phaser.Math.Clamp(drag.startHotspotY + dy, 32, 688));
        drag.entry.actor.setPosition(h.x, h.y);
        drag.entry.actor.setData('baseX', h.x);
        drag.entry.actor.setData('baseY', h.y);
        this.syncHotspotHitZone(drag.entry);
        this.debugHudText.setText(
          `✥ Moving ${h.id} -> x: ${h.x}, y: ${h.y} [${h.width}x${h.height}]`
        );
        this.refreshDebugOverlay();
      } else if (drag.mode === 'resize') {
        drag.moved = true;
        const newRight = Phaser.Math.Clamp(Math.round(pointer.x), drag.anchorLeft + 64, 1280);
        const newBottom = Phaser.Math.Clamp(Math.round(pointer.y), drag.anchorTop + 64, 720);
        h.width = Math.round(newRight - drag.anchorLeft);
        h.height = Math.round(newBottom - drag.anchorTop);
        h.x = Math.round(drag.anchorLeft + h.width / 2);
        h.y = Math.round(drag.anchorTop + h.height / 2);
        drag.entry.actor.setPosition(h.x, h.y);
        drag.entry.actor.setData('baseX', h.x);
        drag.entry.actor.setData('baseY', h.y);
        this.syncHotspotHitZone(drag.entry);
        this.updateHitZoneDepths();
        this.debugHudText.setText(
          `↘ Resizing ${h.id} -> x: ${h.x}, y: ${h.y}, width: ${h.width}, height: ${h.height}`
        );
        this.refreshDebugOverlay();
      }
    });

    this.input.on('pointerup', () => {
      if (!this.debugEnabled || !this.activeDebugDrag) return;
      const drag = this.activeDebugDrag;
      this.activeDebugDrag = null;

      if (drag.moved) {
        // Update standalone top-level hitZone & re-slice the hi-res cutout patch at the new coordinates!
        const entry = drag.entry;
        this.syncHotspotHitZone(entry);
        this.updateHitZoneDepths();

        entry.patchShadow.clear();
        entry.patchShadow.fillStyle(0x090d16, 0.36);
        entry.patchShadow.fillRoundedRect(
          -entry.hotspot.width / 2 + 5,
          -entry.hotspot.height / 2 + 8,
          entry.hotspot.width,
          entry.hotspot.height,
          18
        );

        const page = this.getCurrentPage();
        const bgTexKey = this.getPageTextureKey(page);
        if (this.textures.exists(bgTexKey)) {
          this.rebuildSingleCutoutPatch(entry, bgTexKey);
        }

        AudioBus.playSfx('pop');
        this.refreshDebugOverlay();
      } else {
        // Quick click in debug mode without dragging: trigger the hotspot gag to test it!
        this.triggerHotspotSkit(drag.entry, this.getCurrentPage().pageNumber);
      }
    });
  }

  /**
   * Keeps a hotspot's standalone `Phaser.GameObjects.Zone` locked 1:1 with `(x, y, width, height)`
   * in top-level `1280x720` stage space so the clickable region and cyan debug box never drift apart!
   */
  private syncHotspotHitZone(entry: HotspotActorEntry): void {
    const h = entry.hotspot;
    const hitW = Math.max(64, Math.round(h.width));
    const hitH = Math.max(64, Math.round(h.height));
    entry.hitZone.setPosition(h.x, h.y);
    entry.hitZone.setSize(hitW, hitH);
    if (entry.hitZone.input && entry.hitZone.input.hitArea) {
      (entry.hitZone.input.hitArea as Phaser.Geom.Rectangle).setTo(0, 0, hitW, hitH);
    }
  }

  /**
   * Smart Overlap Priority: Sorts `hitZone` depths inversely by area (`width * height`)
   * so smaller, specific props (like suitcases or Doggie) ALWAYS win click priority
   * over larger group hitboxes nearby!
   */
  private updateHitZoneDepths(): void {
    const sortedLargestFirst = [...this.hotspotEntries].sort((a, b) => {
      const areaA = Math.max(64, a.hotspot.width) * Math.max(64, a.hotspot.height);
      const areaB = Math.max(64, b.hotspot.width) * Math.max(64, b.hotspot.height);
      return areaB - areaA;
    });

    sortedLargestFirst.forEach((entry, index) => {
      entry.hitZone.setDepth(60 + index);
    });
  }

  private getCurrentPage(): StoryPageData {
    return this.cartridge.pages[this.currentPageIndex] ?? this.cartridge.pages[0];
  }

  /**
   * Resolves the preloaded Phaser texture key from the page's stable `theme` or `backgroundSrc`
   * stem (`cover-bg`, `p1-bg`, `p2-bg`, etc.) so inserting the Cover at index 0 never shifts
   * or breaks any page's background plate or clean plate!
   */
  private getPageTextureKey(page: StoryPageData): string {
    if (page.theme === 'nana-cover') {
      return `story-bg-${this.cartridge.id}-cover`;
    }
    if (page.theme === 'nana-p1-airport') {
      return `story-bg-${this.cartridge.id}-p1`;
    }
    if (page.theme === 'nana-p2-zeeland-house') {
      return `story-bg-${this.cartridge.id}-p2`;
    }
    const match = page.backgroundSrc?.match(/\/p(\d+)-bg/i);
    if (match) {
      return `story-bg-${this.cartridge.id}-p${match[1]}`;
    }
    return `story-bg-${this.cartridge.id}-p${page.pageNumber}`;
  }

  private renderCurrentPage(withPageCurlTransition: boolean = true, direction: 'next' | 'prev' = 'next'): void {
    this.stopCurrentNarration();
    AudioBus.stopAmbientLoop();

    this.hotspotEntries.forEach((entry) => {
      if (entry.cutoutTimer) {
        entry.cutoutTimer.remove(false);
      }
      entry.hitZone.destroy();
    });

    this.p1SplitFlapCells = [];
    this.p3ClockDoggieBusy = false;
    this.isEndingBook = false;

    this.backdropContainer.removeAll(true);
    this.exteriorStageContainer.removeAll(true);
    this.occluderContainer.removeAll(true);
    this.stageContainer.removeAll(true);
    this.karaokeContainer.removeAll(true);
    this.uiContainer.removeAll(true);
    this.hotspotEntries = [];
    this.wordPills = [];

    const page = this.getCurrentPage();
    const bgTexKey = this.getPageTextureKey(page);
    const hasPreloadedRealArt = this.textures.exists(bgTexKey);

    // Preload all hotspot SFX for this page into Howler for <5ms zero-latency tap playback!
    AudioBus.preloadHotspotSfx(page.hotspots.map((h) => h.voiceAudioSrc));

    // 1. Draw the fallback storybook illustration underneath
    this.drawPageBackdrop(page);

    // 2. Spawn all interactive hotspots on the stage + sort standalone hitZones inversely by area.
    // On Airport (`nana-p1-airport`), exterior window actors (`p1-runway-jet` and `p1-sparky-window`) live in
    // `exteriorStageContainer` (depth 20) directly BELOW `p1-window-occluder` (depth 30), and on Nana's House
    // (`nana-p2-zeeland-house`), bush peekers (`p2-sparky-bush` and `p2-doggie-bush`) live in `exteriorStageContainer`
    // directly BELOW the bush occluders (depth 30)!
    page.hotspots.forEach((hotspot) => {
      const entry = this.createHotspotActor(hotspot, page.pageNumber, hasPreloadedRealArt);
      this.hotspotEntries.push(entry);
      const isExteriorOrOccluded =
        (page.theme === 'nana-p1-airport' &&
          (hotspot.id === 'p1-runway-jet' || hotspot.id === 'p1-sparky-window')) ||
        (page.theme === 'nana-p2-zeeland-house' &&
          (hotspot.id === 'p2-sparky-bush' || hotspot.id === 'p2-doggie-bush'));

      if (isExteriorOrOccluded) {
        this.exteriorStageContainer.add(entry.actor);
      } else {
        this.stageContainer.add(entry.actor);
      }
    });
    this.updateHitZoneDepths();

    // 3. Mount full-bleed hi-res art (`cover-bg.jpg` or `p{N}-bg.jpg`) scaled to 1280x720 & wire Dynamic Cutout Patches!
    this.tryMountFullBleedArt(page);

    // 4. Draw subtle picture-book paper border around the 1280x720 page
    this.drawPictureBookFrame();

    // 5. Build the compact top cream parchment banner (`top: 10px, height: 84px`) —
    // completely hidden on the Cover spread so none of the gold leaf title or perched bluebirds get covered!
    if (page.theme !== 'nana-cover' && page.words.length > 0) {
      this.buildParchmentKaraokeBanner(page);
    }

    // 6. Build unobtrusive bookmark ribbons & dog-eared page-turn corners
    this.buildBookNavigationChrome(page);

    // 7. Refresh Shift+D debug outlines if enabled
    this.refreshDebugOverlay();

    // 8. Gentle parchment page-turn transition + automatic narration
    if (withPageCurlTransition) {
      this.playPageFlipTransition(direction);
    } else {
      this.cameras.main.fadeIn(220, 28, 22, 16);
    }

    if (page.theme === 'nana-cover' || this.storyMode === 'read-to-me') {
      this.time.delayedCall(260, () => {
        if (this.scene.isActive() && (this.getCurrentPage().theme === 'nana-cover' || this.storyMode === 'read-to-me')) {
          this.playPageNarration();
        }
      });
    }
  }

  /**
   * Mounts the hi-res (`2752x1536`) page background centered at `(640, 360)` with
   * `.setOrigin(0.5, 0.5).setDisplaySize(1280, 720)` so it fits the `1280x720` stage edge-to-edge!
   * Prioritizes `p{N}-bg-clean.jpg` (clean plate without baked-in sprites) when present in
   * `public/assets/stories/nana/`, falling back to `p{N}-bg.jpg`.
   */
  private tryMountFullBleedArt(page: StoryPageData): void {
    const baseSrc = page.backgroundSrc ?? `/assets/stories/nana/p${page.pageNumber}-bg.jpg`;
    const texKey = this.getPageTextureKey(page);
    const cleanKey = `${texKey}-clean`;

    if (page.theme === 'nana-cover') {
      this.mountCoverAmbientMagic();
    } else if (page.theme === 'nana-p1-airport') {
      this.mountPage1LivingBookActors();
    } else if (page.theme === 'nana-p2-zeeland-house') {
      this.mountPage2LivingBookActors();
    } else if (page.theme === 'nana-p3-grammy-chair') {
      this.mountPage3LivingBookActors();
    } else if (page.theme === 'nana-p4-convertible') {
      this.mountPage4LivingBookActors();
    } else if (page.theme === 'nana-p5-dutch-village') {
      this.mountPage6LivingBookActors();
    } else if (page.theme === 'nana-p7-lake-michigan') {
      this.mountPage7LivingBookActors();
    } else if (page.theme === 'nana-p8-woods-cabin') {
      this.mountPage8LivingBookActors();
    } else if (page.theme === 'nana-p9-cabin-stove') {
      this.mountPage9LivingBookActors();
    }

    // Fast synchronous path: if BootScene already preloaded the clean plate or page background,
    // mount it immediately on Frame 0 with zero async fetch race conditions!
    if (page.backgroundSrc && this.textures.exists(page.backgroundSrc)) {
      this.mountResolvedBackgroundTexture(page.backgroundSrc, page);
      return;
    }
    if (this.textures.exists(cleanKey)) {
      this.mountResolvedBackgroundTexture(cleanKey, page);
      return;
    }
    if (this.textures.exists(texKey)) {
      this.mountResolvedBackgroundTexture(texKey, page);
      return;
    }

    // Fallback runtime loader if a newly dropped image wasn't in BootScene yet
    void this.resolveRealImageUrl(baseSrc).then((validUrl) => {
      if (!this.scene.isActive() || this.getCurrentPage().theme !== page.theme || !validUrl) {
        return;
      }

      const targetKey = validUrl.includes('-clean') ? cleanKey : texKey;
      if (this.textures.exists(targetKey)) {
        this.mountResolvedBackgroundTexture(targetKey, page);
        return;
      }

      this.load.image(targetKey, validUrl);
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        if (
          this.scene.isActive() &&
          this.getCurrentPage().theme === page.theme &&
          this.textures.exists(targetKey)
        ) {
          this.mountResolvedBackgroundTexture(targetKey, page);
        }
      });
      this.load.start();
    });
  }

  private mountResolvedBackgroundTexture(texKey: string, page: StoryPageData): void {
    this.textures.get(texKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.backdropContainer.removeAll(true);
    const img = this.add.image(640, 360, texKey).setOrigin(0.5, 0.5).setDisplaySize(1280, 720);
    this.backdropContainer.add(img);
    this.attachRealArtCutoutPatches(texKey, page);
  }

  /**
   * Purely Ambient, Magical Cover Presentation (`cover-bg.jpg`, ZERO clickable hotspots):
   * 1. Warm, softly breathing/flickering golden candlelight glow halos (`Phaser.BlendModes.ADD`)
   *    centered over the two desk candle flames on the left (`~42, 72`) and right (`~1225, 68`).
   * 2. Slow, dreamy floating golden dust motes drifting gently across the candlelit desk and leather book cover.
   * 3. Subtle, periodic golden-leaf glint/shimmer particle twinkles dancing along the embossed
   *    gold filigree corners and hand-lettered title plaque (`y: 60..250, x: 260..1020`).
   */
  private mountCoverAmbientMagic(): void {
    const glowKey = this.textures.exists('cover-candle-glow') ? 'cover-candle-glow' : 'particle-star';

    // 1. Two Desk Candle Flame Halos: Left (42, 72) and Right (1225, 68)
    const candleFlames = [
      { x: 42, y: 72 },
      { x: 1225, y: 68 }
    ];

    candleFlames.forEach((flame, idx) => {
      // Soft outer warm amber breathing halo
      const outerHalo = this.add
        .image(flame.x, flame.y, glowKey)
        .setOrigin(0.5, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xf59e0b)
        .setScale(1.38)
        .setAlpha(0.28);

      // Inner golden-cream flame flicker halo
      const innerHalo = this.add
        .image(flame.x, flame.y, glowKey)
        .setOrigin(0.5, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xfef08a)
        .setScale(0.62)
        .setAlpha(0.38);

      this.stageContainer.add([outerHalo, innerHalo]);

      this.tweens.add({
        targets: outerHalo,
        scaleX: { from: 1.24, to: 1.54 },
        scaleY: { from: 1.22, to: 1.52 },
        alpha: { from: 0.2, to: 0.36 },
        duration: 1850 + idx * 320,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      this.tweens.add({
        targets: innerHalo,
        scaleX: { from: 0.54, to: 0.72 },
        scaleY: { from: 0.56, to: 0.76 },
        alpha: { from: 0.26, to: 0.46 },
        y: { from: flame.y - 2, to: flame.y + 1.5 },
        duration: 440 + idx * 90,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });

    // 2. Slow, dreamy floating golden dust motes drifting across the candlelit desk & leather cover
    const motePalette = [0xfef08a, 0xfde047, 0xfbbf24, 0xfffbeb];
    for (let i = 0; i < 24; i++) {
      const startX = Phaser.Math.Between(55, 1225);
      const startY = Phaser.Math.Between(65, 675);
      const baseScale = Phaser.Math.FloatBetween(0.06, 0.16);
      const mote = this.add
        .image(startX, startY, glowKey)
        .setOrigin(0.5, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(motePalette[i % motePalette.length])
        .setScale(baseScale)
        .setAlpha(Phaser.Math.FloatBetween(0.1, 0.32));

      this.stageContainer.add(mote);

      this.tweens.add({
        targets: mote,
        x: startX + Phaser.Math.Between(-48, 48),
        y: startY - Phaser.Math.Between(28, 72),
        duration: Phaser.Math.Between(5600, 9600),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      this.tweens.add({
        targets: mote,
        alpha: {
          from: Phaser.Math.FloatBetween(0.06, 0.15),
          to: Phaser.Math.FloatBetween(0.28, 0.48)
        },
        scaleX: baseScale * 1.25,
        scaleY: baseScale * 1.25,
        duration: Phaser.Math.Between(2200, 4100),
        delay: i * 160,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    // 3. Subtle, periodic golden-leaf glint/shimmer particle twinkles along the embossed gold filigree
    // corners and hand-lettered gold title plaque (x: 260..1020, y: 60..250)
    const goldLeafAnchors = [
      // Embossed gold title plaque & lettering ("To Nana and Papa's House We Go! A Michigan Adventure")
      { x: 345, y: 112 },
      { x: 465, y: 98 },
      { x: 585, y: 108 },
      { x: 640, y: 145 },
      { x: 735, y: 105 },
      { x: 855, y: 112 },
      { x: 940, y: 120 },
      { x: 495, y: 185 },
      { x: 640, y: 192 },
      { x: 785, y: 185 },
      // Ornate upper gold filigree corners & arches
      { x: 278, y: 74 },
      { x: 315, y: 145 },
      { x: 1002, y: 74 },
      { x: 965, y: 145 },
      { x: 390, y: 232 },
      { x: 890, y: 232 }
    ];

    goldLeafAnchors.forEach((pt, idx) => {
      const glint = this.add
        .image(
          pt.x + Phaser.Math.Between(-14, 14),
          pt.y + Phaser.Math.Between(-10, 10),
          'particle-star'
        )
        .setOrigin(0.5, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(idx % 3 === 0 ? 0xffffff : idx % 2 === 0 ? 0xfef08a : 0xfbbf24)
        .setScale(0)
        .setAlpha(0);

      this.stageContainer.add(glint);

      const cycleGlint = (initialDelay: number) => {
        this.tweens.add({
          targets: glint,
          scaleX: Phaser.Math.FloatBetween(0.36, 0.62),
          scaleY: Phaser.Math.FloatBetween(0.36, 0.62),
          alpha: Phaser.Math.FloatBetween(0.55, 0.85),
          angle: { from: 0, to: 90 },
          delay: initialDelay,
          duration: Phaser.Math.Between(650, 980),
          yoyo: true,
          hold: Phaser.Math.Between(120, 260),
          ease: 'Sine.easeInOut',
          onComplete: () => {
            if (!this.scene.isActive() || !glint.scene) return;
            glint.setPosition(
              pt.x + Phaser.Math.Between(-18, 18),
              pt.y + Phaser.Math.Between(-12, 12)
            );
            cycleGlint(Phaser.Math.Between(2400, 5800));
          }
        });
      };

      cycleGlint(idx * 340 + Phaser.Math.Between(100, 900));
    });
  }

  /**
   * Sets up Page 1 ("Touchdown at the Airport") Living Books multi-frame sprite actors,
   * pixel-contour window occluder (`p1-window-occluder.png`), and live animated 8-character
   * `ARRIVALS` split-flap board aligned 1:1 with the painted sign slots!
   */
  private mountPage1LivingBookActors(): void {
    this.mountPage1WindowOccluder();
    this.buildPage1SplitFlapBoard();
    this.mountPreloadedPage1Sprites();
    void this.loadAndMountPage1SpriteActors();
  }

  /**
   * Renders `p1-window-occluder.png` (`2752x1536` scaled to `1280x720` at `(640, 360)`) inside
   * `this.occluderContainer` (`depth = 30`), directly ABOVE `p1-jet` and `p1-sparky` (`depth = 20`)
   * and BELOW `p1-doggie`, the `ARRIVALS` split-flap letters, and UI (`depth = 50..300`)!
   * Because only the exterior sky gradient, horizon haze, green grass strip, and grey tarmac
   * inside the 5 window bays have `alpha = 0`, the jet and Sparky pass seamlessly behind the
   * exact pixel contours of Wyatt, Nana, Papa, the jetbridge, the pedestrian silhouettes,
   * the `ARRIVALS` sign, and the 4 vertical window mullions!
   */
  private mountPage1WindowOccluder(): void {
    this.occluderContainer.removeAll(true);
    const occluderKey = 'p1-window-occluder';

    if (this.textures.exists(occluderKey)) {
      this.textures.get(occluderKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      const occImg = this.add
        .image(640, 360, occluderKey)
        .setOrigin(0.5, 0.5)
        .setDisplaySize(1280, 720);
      this.occluderContainer.add(occImg);
      return;
    }

    // Fallback runtime load if not yet in texture cache
    this.load.image(occluderKey, '/assets/stories/nana/sprites/p1-window-occluder.png');
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      if (
        this.scene.isActive() &&
        this.getCurrentPage().theme === 'nana-p1-airport' &&
        this.textures.exists(occluderKey)
      ) {
        this.textures.get(occluderKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.occluderContainer.removeAll(true);
        const occImg = this.add
          .image(640, 360, occluderKey)
          .setOrigin(0.5, 0.5)
          .setDisplaySize(1280, 720);
        this.occluderContainer.add(occImg);
      }
    });
    this.load.start();
  }

  /**
   * Synchronously mounts Page 1's preloaded transparent `.png` spritesheets (`p1-sprite-doggie`,
   * `p1-sprite-sparky`, `p1-sprite-jet`, `p1-sprite-family`) on Frame 0 so `entry.spriteActor` is immediately active!
   */
  private mountPreloadedPage1Sprites(): void {
    const preloadedSpecs: {
      hotspotId: string;
      texKey: string;
      offsetX?: number;
      offsetY?: number;
    }[] = [
      { hotspotId: 'p1-runway-jet', texKey: 'p1-sprite-jet' },
      { hotspotId: 'p1-baggage-doggie', texKey: 'p1-sprite-doggie' },
      { hotspotId: 'p1-sparky-window', texKey: 'p1-sprite-sparky' },
      { hotspotId: 'p1-nana-papa-hug', texKey: 'p1-sprite-family', offsetX: 28, offsetY: -24 }
    ];

    for (const spec of preloadedSpecs) {
      if (!this.textures.exists(spec.texKey)) continue;
      const entry = this.hotspotEntries.find((e) => e.hotspot.id === spec.hotspotId);
      if (!entry) continue;

      this.textures.get(spec.texKey).setFilter(Phaser.Textures.FilterMode.NEAREST);

      if (entry.spriteActor) {
        entry.spriteActor.destroy();
      }
      if (entry.patchImage) {
        entry.patchImage.destroy();
        entry.patchImage = null;
      }
      entry.placeholderNode.setVisible(false);

      const sprite = this.add
        .sprite(spec.offsetX ?? 0, spec.offsetY ?? 0, spec.texKey, 0)
        .setOrigin(0.5, 0.5);
      const frameObj = sprite.frame;
      if (frameObj && frameObj.width > 0 && frameObj.height > 0) {
        const scale = Math.min(entry.hotspot.width / frameObj.width, entry.hotspot.height / frameObj.height);
        sprite.setScale(scale);
        sprite.setData('baseScale', scale);
      }

      entry.actor.add(sprite);
      entry.spriteActor = sprite;
    }
  }

  /**
   * Sets up Page 2 ("Nana's Cozy House in Zeeland!") Living Books multi-frame sprite actors
   * aligned 1:1 with the pixel diff of `p2-bg.jpg` vs `p2-bg-clean.jpg` in 1280x720 space:
   * - `p2-porch` (Nana & Papa at 615, 392, scale 0.095 -> 77x97px)
   * - `p2-kids` (Wyatt & Emma at 354, 461, scale 0.135 -> 108x112px)
   * - `p2-mailbox` (Mailbox & bluebirds at 955, 535, scale 0.128 -> 76px wide on post x=950)
   * - `p2-squirrel` (Two squirrels on central oak branch forks: 613, 226 & flipped 787, 181, scale 0.048 -> 36x36px)
   * - `p2-sparky-bush` (Tiny baby dragon Sparky at 985, 352, scale 0.088 behind `p2-weeping-bush-occluder`)
   * - `p2-doggie-bush` (Doggie at 464, 380, scale 0.068 behind `p2-left-bush-occluder`)
   * - `p2-maple-leaves` (Animated 3-frame Japanese red maple & cardinal at 98, 368, scale 0.258)
   */
  private mountPage2LivingBookActors(): void {
    this.occluderContainer.removeAll(true);
    const occluderKeys = ['p2-left-bush-occluder', 'p2-weeping-bush-occluder'];
    let mountedSplitOccluders = false;
    for (const occKey of occluderKeys) {
      if (this.textures.exists(occKey)) {
        this.textures.get(occKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
        const occImg = this.add
          .image(640, 360, occKey)
          .setOrigin(0.5, 0.5)
          .setDisplaySize(1280, 720);
        this.occluderContainer.add(occImg);
        mountedSplitOccluders = true;
      }
    }
    if (!mountedSplitOccluders && this.textures.exists('p2-bush-occluder')) {
      this.textures.get('p2-bush-occluder').setFilter(Phaser.Textures.FilterMode.NEAREST);
      const occImg = this.add
        .image(640, 360, 'p2-bush-occluder')
        .setOrigin(0.5, 0.5)
        .setDisplaySize(1280, 720);
      this.occluderContainer.add(occImg);
    }

    const singleSpriteSpecs: {
      hotspotId: string;
      texKey: string;
      scale: number;
      offsetX?: number;
      offsetY?: number;
    }[] = [
      { hotspotId: 'p2-porch', texKey: 'p2-sprite-porch', scale: 0.105, offsetX: 0, offsetY: 0 },
      { hotspotId: 'p2-kids', texKey: 'p2-sprite-kids', scale: 0.135, offsetX: 0, offsetY: 0 },
      { hotspotId: 'p2-mailbox', texKey: 'p2-sprite-mailbox', scale: 0.132, offsetX: -12, offsetY: -12 },
      { hotspotId: 'p2-sparky-bush', texKey: 'p2-sprite-sparky-bush', scale: 0.088, offsetX: 0, offsetY: -36 },
      { hotspotId: 'p2-doggie-bush', texKey: 'p2-sprite-doggie-bush', scale: 0.038, offsetX: 0, offsetY: -48 },
      { hotspotId: 'p2-maple-leaves', texKey: 'p2-sprite-maple', scale: 0.258, offsetX: 0, offsetY: 0 }
    ];

    for (const spec of singleSpriteSpecs) {
      if (!this.textures.exists(spec.texKey)) continue;
      const entry = this.hotspotEntries.find((e) => e.hotspot.id === spec.hotspotId);
      if (!entry) continue;

      this.textures.get(spec.texKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      if (entry.spriteActor) {
        entry.spriteActor.destroy();
      }
      if (entry.patchImage) {
        entry.patchImage.destroy();
        entry.patchImage = null;
      }
      entry.placeholderNode.setVisible(false);

      const sprite = this.add
        .sprite(spec.offsetX ?? 0, spec.offsetY ?? 0, spec.texKey, 0)
        .setOrigin(0.5, 0.5)
        .setScale(spec.scale);
      sprite.setData('baseScale', spec.scale);

      entry.actor.add(sprite);
      entry.spriteActor = sprite;
    }

    // Mount TWO tree squirrels inside `p2-squirrel` perched on the two central oak branch forks:
    // - Left squirrel at stage (613, 226)
    // - Right flipped squirrel at stage (787, 181)
    if (this.textures.exists('p2-sprite-squirrel')) {
      const sqEntry = this.hotspotEntries.find((e) => e.hotspot.id === 'p2-squirrel');
      if (sqEntry) {
        this.textures.get('p2-sprite-squirrel').setFilter(Phaser.Textures.FilterMode.NEAREST);
        if (sqEntry.spriteActor) {
          sqEntry.spriteActor.destroy();
        }
        if (sqEntry.patchImage) {
          sqEntry.patchImage.destroy();
          sqEntry.patchImage = null;
        }
        sqEntry.placeholderNode.setVisible(false);

        const baseX = sqEntry.hotspot.x;
        const baseY = sqEntry.hotspot.y;
        const sqScale = 0.048;

        const leftSq = this.add
          .sprite(613 - baseX, 226 - baseY, 'p2-sprite-squirrel', 0)
          .setOrigin(0.5, 0.5)
          .setScale(sqScale);
        const rightSq = this.add
          .sprite(787 - baseX, 181 - baseY, 'p2-sprite-squirrel', 0)
          .setOrigin(0.5, 0.5)
          .setFlipX(true)
          .setScale(sqScale);

        sqEntry.actor.add([leftSq, rightSq]);
        sqEntry.spriteActor = leftSq;
        sqEntry.actor.setData('leftSquirrel', leftSq);
        sqEntry.actor.setData('rightSquirrel', rightSq);
        sqEntry.actor.setData('sqBaseScale', sqScale);
      }
    }
  }

  /**
   * Sets up Page 3 ("Grammy's Big Cozy Chair!") Living Books multi-frame sprite actors aligned 1:1 with `p3-bg.jpg`:
   * - `p3-clock` (Carved wooden chalet cuckoo clock at 75, 250, scale 0.30)
   * - `p3-doggie` (Fluffy cream puppy in sunglasses at 126, 605, scale 0.21 — coupled with `p3-clock`!)
   * - `p3-sparky-cookies` (Floral teacup, chocolate-chip cookies & baby dragon Sparky at 1138, 575, scale 0.306 [68% of 0.45], offsetY: -18)
   * - `p3-grammy-kids` (Grammy, Wyatt & Emma in the grey recliner at 560, 495, scale 0.84, offsetX: -12, offsetY: 8)
   * - `p3-painting-1..3` (3 individual animated abstract wall canvases above the couch)
   * - `p3-photo-1..4` (4 individual animated wooden-framed family portraits on the right wall)
   */
  private mountPage3LivingBookActors(): void {
    this.occluderContainer.removeAll(true);

    // Ensure `p3-lamp` NEVER creates an opaque rectangular cutout patch that overlaps Sparky or the cookies!
    const lampEntry = this.hotspotEntries.find((e) => e.hotspot.id === 'p3-lamp');
    if (lampEntry) {
      if (lampEntry.patchImage) {
        lampEntry.patchImage.destroy();
        lampEntry.patchImage = null;
      }
      lampEntry.patchShadow.setAlpha(0);
      lampEntry.placeholderNode.setVisible(false);
    }

    const p3Specs: {
      hotspotId: string;
      texKey: string;
      scale: number;
      offsetX?: number;
      offsetY?: number;
      depth: number;
    }[] = [
      { hotspotId: 'p3-clock', texKey: 'p3-sprite-clock', scale: 0.30, offsetX: 0, offsetY: 0, depth: 15 },
      { hotspotId: 'p3-doggie', texKey: 'p3-sprite-doggie', scale: 0.21, offsetX: 0, offsetY: 6, depth: 15 },
      { hotspotId: 'p3-sparky-cookies', texKey: 'p3-sprite-sparky-cookies', scale: 0.269, offsetX: 0, offsetY: -18, depth: 25 },
      { hotspotId: 'p3-grammy-kids', texKey: 'p3-sprite-grammy-kids', scale: 0.84, offsetX: 0, offsetY: 8, depth: 25 },
      { hotspotId: 'p3-painting-1', texKey: 'p3-sprite-painting-1', scale: 0.26, offsetX: 0, offsetY: 0, depth: 5 },
      { hotspotId: 'p3-painting-2', texKey: 'p3-sprite-painting-2', scale: 0.28, offsetX: 0, offsetY: 0, depth: 5 },
      { hotspotId: 'p3-painting-3', texKey: 'p3-sprite-painting-3', scale: 0.195, offsetX: 0, offsetY: 0, depth: 5 },
      { hotspotId: 'p3-photo-1', texKey: 'p3-sprite-photo-1', scale: 0.23, offsetX: 0, offsetY: 0, depth: 5 },
      { hotspotId: 'p3-photo-2', texKey: 'p3-sprite-photo-2', scale: 0.24, offsetX: 0, offsetY: 0, depth: 5 },
      { hotspotId: 'p3-photo-3', texKey: 'p3-sprite-photo-3', scale: 0.185, offsetX: 0, offsetY: 0, depth: 5 },
      { hotspotId: 'p3-photo-4', texKey: 'p3-sprite-photo-4', scale: 0.18, offsetX: 0, offsetY: 0, depth: 5 }
    ];

    for (const spec of p3Specs) {
      if (!this.textures.exists(spec.texKey)) continue;
      const entry = this.hotspotEntries.find((e) => e.hotspot.id === spec.hotspotId);
      if (!entry) continue;

      this.textures.get(spec.texKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      if (entry.spriteActor) {
        entry.spriteActor.destroy();
      }
      if (entry.patchImage) {
        entry.patchImage.destroy();
        entry.patchImage = null;
      }
      entry.placeholderNode.setVisible(false);

      const sprite = this.add
        .sprite(spec.offsetX ?? 0, spec.offsetY ?? 0, spec.texKey, 0)
        .setOrigin(0.5, 0.5)
        .setScale(spec.scale);
      sprite.setData('baseScale', spec.scale);

      entry.actor.add(sprite);
      entry.actor.setDepth(spec.depth);
      entry.spriteActor = sprite;
    }

    // Mount the upper-right white lampshade occluder (x: 1170..1280, y: 215..360) at depth 15
    // so the bottom-right corner of the small Emma portrait (`p3-photo-4` at depth 5) tucks naturally behind the lampshade!
    if (this.textures.exists('p3-lampshade-occluder')) {
      this.textures.get('p3-lampshade-occluder').setFilter(Phaser.Textures.FilterMode.NEAREST);
      const lampshadeOcc = this.add
        .image(1170, 215, 'p3-lampshade-occluder')
        .setOrigin(0, 0)
        .setDepth(15);
      this.stageContainer.add(lampshadeOcc);
    }

    this.stageContainer.sort('depth');
  }

  /**
   * Sets up Page 4 ("Nana's Convertible in the Garage!") Living Books multi-frame sprite actors
   * and foreground occluders (`p4-car-occluder` at depth 20, `p4-shovel-occluder` at depth 16)
   * aligned 1:1 with `p4-bg-clean.jpg`!
   */
  private mountPage4LivingBookActors(): void {
    this.occluderContainer.removeAll(true);

    // Ensure `p4-garage-opener` never creates an opaque cutout patch
    for (const hid of ['p4-garage-opener']) {
      const hEntry = this.hotspotEntries.find((e) => e.hotspot.id === hid);
      if (hEntry) {
        if (hEntry.patchImage) {
          hEntry.patchImage.destroy();
          hEntry.patchImage = null;
        }
        hEntry.patchShadow.setAlpha(0);
        hEntry.placeholderNode.setVisible(false);
      }
    }

    const p4Specs: {
      hotspotId: string;
      texKey: string;
      scale: number;
      offsetX?: number;
      offsetY?: number;
      depth: number;
    }[] = [
      { hotspotId: 'p4-wreath', texKey: 'p4-sprite-wreath', scale: 0.205, offsetX: 0, offsetY: 0, depth: 8 },
      { hotspotId: 'p4-wall-oven', texKey: 'p4-sprite-wall-oven', scale: 0.296, offsetX: -4, offsetY: -65, depth: 10 },
      { hotspotId: 'p4-hutch-items', texKey: 'p4-sprite-hutch-items', scale: 0.132, offsetX: 11, offsetY: -11, depth: 10 },
      { hotspotId: 'p4-sparky-cabinet', texKey: 'p4-sprite-sparky-cabinet', scale: 0.24, offsetX: -2, offsetY: -45, depth: 11 },
      { hotspotId: 'p4-cardboard-box', texKey: 'p4-sprite-cardboard-box', scale: 0.126, offsetX: 0, offsetY: -10, depth: 12 },
      { hotspotId: 'p4-car-doggie', texKey: 'p4-sprite-car-doggie', scale: 0.14, offsetX: 22, offsetY: -89, depth: 15 },
      { hotspotId: 'p4-compressor', texKey: 'p4-sprite-compressor', scale: 0.35, offsetX: 12, offsetY: -32, depth: 18 },
      { hotspotId: 'p4-leaf-blower', texKey: 'p4-sprite-leaf-blower', scale: 0.60, offsetX: -12, offsetY: -36, depth: 25 }
    ];

    for (const spec of p4Specs) {
      if (!this.textures.exists(spec.texKey)) continue;
      const entry = this.hotspotEntries.find((e) => e.hotspot.id === spec.hotspotId);
      if (!entry) continue;

      this.textures.get(spec.texKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      if (entry.spriteActor) {
        entry.spriteActor.destroy();
      }
      if (entry.patchImage) {
        entry.patchImage.destroy();
        entry.patchImage = null;
      }
      entry.placeholderNode.setVisible(false);

      const sprite = this.add
        .sprite(spec.offsetX ?? 0, spec.offsetY ?? 0, spec.texKey, 0)
        .setOrigin(0.5, 0.5)
        .setScale(spec.scale);
      sprite.setData('baseScale', spec.scale);

      entry.actor.add(sprite);
      entry.actor.setDepth(spec.depth);
      entry.spriteActor = sprite;
    }

    // Mount Right Cream Cabinet + Snow Shovel foreground occluder (x: 1022, y: 298) at depth 16 above `p4-sparky-cabinet` (depth 11)
    if (this.textures.exists('p4-shovel-occluder')) {
      this.textures.get('p4-shovel-occluder').setFilter(Phaser.Textures.FilterMode.NEAREST);
      const shovelOcc = this.add
        .image(1022, 298, 'p4-shovel-occluder')
        .setOrigin(0, 0)
        .setDepth(16);
      this.stageContainer.add(shovelOcc);
    }

    // Mount Car Cockpit & Rear Fender foreground occluder (x: 45, y: 370) at depth 20 above `p4-car-doggie` (depth 15)
    if (this.textures.exists('p4-car-occluder')) {
      this.textures.get('p4-car-occluder').setFilter(Phaser.Textures.FilterMode.NEAREST);
      const carOcc = this.add
        .image(45, 370, 'p4-car-occluder')
        .setOrigin(0, 0)
        .setDepth(20);
      carOcc.setName('p4-car-occluder-img');
      this.stageContainer.add(carOcc);
    }

    this.stageContainer.sort('depth');
  }

  /**
   * Mounts the 9 custom 3-frame Page 6 (Spread 6: Dutch Village) sprites onto `p6-bg-clean.jpg` (1280x720)
   * with 1:1 pixel alignment, NEAREST filtering, continuous gentle idle rotation on `p6-windmill-sails`,
   * and continuous gentle idle bob on `p6-butterflies`.
   */
  private mountPage6LivingBookActors(): void {
    const p6Specs: Array<{
      hotspotId: string;
      texKey: string;
      scaleX: number;
      scaleY: number;
      depth: number;
      offsetX?: number;
      offsetY?: number;
    }> = [
      // 1. Nana, Papa, Wyatt & Emma holding hands down the center brick path (x: 545, y: 615)
      {
        hotspotId: 'p6-family',
        texKey: 'p6-sprite-family',
        scaleX: 0.85,
        scaleY: 0.85,
        depth: 25,
        offsetX: 0,
        offsetY: -60
      },
      // 2. Red Dutch Windmill Sails hub-centered on the left windmill tower (x: 332, y: 325)
      {
        hotspotId: 'p6-windmill-sails',
        texKey: 'p6-sprite-windmill-sails',
        scaleX: 0.25,
        scaleY: 0.25,
        depth: 8,
        offsetX: 3,
        offsetY: -6
      },
      // 3. Distant Carnival Ferris Wheel centered on the blue A-frame legs (x: 530, y: 372, ~55x55px)
      {
        hotspotId: 'p6-ferris-wheel',
        texKey: 'p6-sprite-ferris-wheel',
        scaleX: 0.155,
        scaleY: 0.155,
        depth: 6,
        offsetX: -12,
        offsetY: -4
      },
      // 4. Doggie & Dancing Yellow Wooden Clogs on the right sidewalk (x: 935, y: 590)
      {
        hotspotId: 'p6-clogs-doggie',
        texKey: 'p6-sprite-clogs-doggie',
        scaleX: 0.28,
        scaleY: 0.28,
        depth: 22,
        offsetX: 0,
        offsetY: -15
      },
      // 5. Recessed Blue Dutch Door under "1613" (x: 976, y: 455)
      {
        hotspotId: 'p6-dutch-door',
        texKey: 'p6-sprite-dutch-door',
        scaleX: 0.20,
        scaleY: 0.37,
        depth: 12,
        offsetX: 4,
        offsetY: -53
      },
      // 6. White Stork perched atop the "1613" stepped brick gable peak (x: 985, y: 95)
      {
        hotspotId: 'p6-chimney-stork',
        texKey: 'p6-sprite-chimney-stork',
        scaleX: 0.24,
        scaleY: 0.24,
        depth: 10,
        offsetX: 4,
        offsetY: -33
      },
      // 7. Sparky tucked into the right brick flower planter (x: 885, y: 505)
      {
        hotspotId: 'p6-sparky-planter',
        texKey: 'p6-sprite-sparky-planter',
        scaleX: 0.24,
        scaleY: 0.24,
        depth: 18,
        offsetX: 0,
        offsetY: -20
      },
      // 8. Butterflies hovering over the left flowerbeds (x: 225, y: 435)
      {
        hotspotId: 'p6-butterflies',
        texKey: 'p6-sprite-butterflies',
        scaleX: 0.30,
        scaleY: 0.30,
        depth: 20,
        offsetX: 0,
        offsetY: 0
      },
      // 9. Orange Cat seated inside the open right cottage window (x: 1128, y: 530, offset to window sill y: 398)
      {
        hotspotId: 'p6-window-cat',
        texKey: 'p6-sprite-window-cat',
        scaleX: 0.20,
        scaleY: 0.20,
        depth: 14,
        offsetX: 0,
        offsetY: -132
      }
    ];

    for (const spec of p6Specs) {
      if (!this.textures.exists(spec.texKey)) continue;
      const entry = this.hotspotEntries.find((e) => e.hotspot.id === spec.hotspotId);
      if (!entry) continue;

      this.textures.get(spec.texKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      if (entry.spriteActor) {
        entry.spriteActor.destroy();
      }
      if (entry.patchImage) {
        entry.patchImage.destroy();
        entry.patchImage = null;
      }
      entry.placeholderNode.setVisible(false);

      const sprite = this.add
        .sprite(spec.offsetX ?? 0, spec.offsetY ?? 0, spec.texKey, 0)
        .setOrigin(0.5, 0.5)
        .setScale(spec.scaleX, spec.scaleY);
      sprite.setData('baseScale', spec.scaleX);
      sprite.setData('baseScaleX', spec.scaleX);
      sprite.setData('baseScaleY', spec.scaleY);
      sprite.setData('baseX', spec.offsetX ?? 0);
      sprite.setData('baseY', spec.offsetY ?? 0);

      entry.actor.add(sprite);
      entry.actor.setDepth(spec.depth);
      entry.spriteActor = sprite;

      // Continuous gentle idle rotation on `p6-windmill-sails`
      if (spec.hotspotId === 'p6-windmill-sails') {
        const idleTween = this.tweens.add({
          targets: sprite,
          angle: 360,
          duration: 14000,
          repeat: -1,
          ease: 'Linear'
        });
        sprite.setData('idleTween', idleTween);
      }

      // Continuous gentle idle bob on `p6-butterflies`
      if (spec.hotspotId === 'p6-butterflies') {
        const baseY = spec.offsetY ?? 0;
        const idleTween = this.tweens.add({
          targets: sprite,
          y: { from: baseY - 5, to: baseY + 5 },
          duration: 1600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        sprite.setData('idleTween', idleTween);
      }

      // Ensure clicking directly on the cat inside the upper cottage window (x: 1128, y: 398) also triggers the gag!
      if (spec.hotspotId === 'p6-window-cat') {
        const upperWindowZone = this.add
          .zone(entry.hotspot.x + (spec.offsetX ?? 0), entry.hotspot.y + (spec.offsetY ?? 0), 120, 120)
          .setOrigin(0.5, 0.5)
          .setInteractive({ useHandCursor: true })
          .setDepth(245);
        upperWindowZone.on('pointerdown', () => {
          if (this.debugEnabled) return;
          this.triggerHotspotSkit(entry, 6);
        });
        this.stageContainer.add(upperWindowZone);
      }
    }

    this.stageContainer.sort('depth');
  }

  /**
   * Mounts the 8 custom 3-frame Page 7 (Lake Michigan Beach) sprites + `p7-chair-cover` static sand patch
   * onto `p7-bg-clean.jpg` (1280x720) with 1:1 pixel alignment, NEAREST filtering, and a continuous
   * gentle horizontal drift tween on `p7-sailboat-horizon`.
   */
  private mountPage7LivingBookActors(): void {
    // Mount static clean-sand patch over the empty chair on `p7-bg-clean.jpg` at depth 19 (under `p7-nana-chair` at depth 20)
    // so there is zero chair doubling even when Nana bounces!
    if (this.textures.exists('p7-chair-cover')) {
      this.textures.get('p7-chair-cover').setFilter(Phaser.Textures.FilterMode.NEAREST);
      const chairCover = this.add
        .image(985, 325, 'p7-chair-cover')
        .setOrigin(0, 0)
        .setDepth(19);
      this.stageContainer.add(chairCover);
    }

    const p7Specs: Array<{
      hotspotId: string;
      texKey: string;
      scaleX: number;
      scaleY: number;
      depth: number;
      offsetX?: number;
      offsetY?: number;
    }> = [
      // 1. Papa skipping stones at the left shoreline (hotspot x: 315, y: 395)
      {
        hotspotId: 'p7-papa-skipping',
        texKey: 'p7-sprite-papa-skipping',
        scaleX: 1.18,
        scaleY: 1.18,
        depth: 18,
        offsetX: -23,
        offsetY: -55
      },
      // 2. Emma & Wyatt building the giant sandcastle in foreground sand (hotspot x: 745, y: 555)
      {
        hotspotId: 'p7-kids-sandcastle',
        texKey: 'p7-sprite-kids-sandcastle',
        scaleX: 1.18,
        scaleY: 1.18,
        depth: 25,
        offsetX: 10,
        offsetY: -35
      },
      // 3. Nana cheering in the striped beach chair under the rainbow umbrella (hotspot x: 1105, y: 445)
      {
        hotspotId: 'p7-nana-chair',
        texKey: 'p7-sprite-nana-chair',
        scaleX: 0.94,
        scaleY: 0.94,
        depth: 20,
        offsetX: 0,
        offsetY: -50
      },
      // 4. Doggie in sunglasses on the open golden sand (hotspot x: 955, y: 635)
      {
        hotspotId: 'p7-doggie-towel',
        texKey: 'p7-sprite-doggie-towel',
        scaleX: 0.40,
        scaleY: 0.40,
        depth: 25,
        offsetX: 0,
        offsetY: 0
      },
      // 5. Two seagulls perched on the red beach bucket behind the kids (hotspot x: 775, y: 375)
      {
        hotspotId: 'p7-seagulls-bucket',
        texKey: 'p7-sprite-seagulls-bucket',
        scaleX: 0.52,
        scaleY: 0.52,
        depth: 14,
        offsetX: 0,
        offsetY: -10
      },
      // 6. Sparky roasting a marshmallow in the middle stone fire-pit box (hotspot x: 1005, y: 285)
      {
        hotspotId: 'p7-sparky-grill',
        texKey: 'p7-sprite-sparky-grill',
        scaleX: 0.42,
        scaleY: 0.42,
        depth: 12,
        offsetX: 0,
        offsetY: 0
      },
      // 7. Sailboat on the upper-left Lake Michigan horizon line (hotspot x: 165, y: 215)
      {
        hotspotId: 'p7-sailboat-horizon',
        texKey: 'p7-sprite-sailboat-horizon',
        scaleX: 0.38,
        scaleY: 0.38,
        depth: 6,
        offsetX: 0,
        offsetY: -12
      },
      // 8. Rainbow beach ball on the foreground sand (hotspot x: 520, y: 585)
      {
        hotspotId: 'p7-beach-ball',
        texKey: 'p7-sprite-beach-ball',
        scaleX: 0.30,
        scaleY: 0.30,
        depth: 22,
        offsetX: 0,
        offsetY: -30
      }
    ];

    for (const spec of p7Specs) {
      if (!this.textures.exists(spec.texKey)) continue;
      const entry = this.hotspotEntries.find((e) => e.hotspot.id === spec.hotspotId);
      if (!entry) continue;

      this.textures.get(spec.texKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      if (entry.spriteActor) {
        entry.spriteActor.destroy();
      }
      if (entry.patchImage) {
        entry.patchImage.destroy();
        entry.patchImage = null;
      }
      entry.placeholderNode.setVisible(false);

      const sprite = this.add
        .sprite(spec.offsetX ?? 0, spec.offsetY ?? 0, spec.texKey, 0)
        .setOrigin(0.5, 0.5)
        .setScale(spec.scaleX, spec.scaleY);
      sprite.setData('baseScale', spec.scaleX);
      sprite.setData('baseScaleX', spec.scaleX);
      sprite.setData('baseScaleY', spec.scaleY);
      sprite.setData('baseX', spec.offsetX ?? 0);
      sprite.setData('baseY', spec.offsetY ?? 0);

      entry.actor.add(sprite);
      entry.actor.setDepth(spec.depth);
      entry.spriteActor = sprite;

      // Gentle continuous horizontal drift tween on `p7-sailboat-horizon`
      if (spec.hotspotId === 'p7-sailboat-horizon') {
        const baseX = spec.offsetX ?? 0;
        const idleTween = this.tweens.add({
          targets: sprite,
          x: { from: baseX - 14, to: baseX + 14 },
          duration: 4200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        sprite.setData('idleTween', idleTween);
      }
    }

    // Hide placeholder on `p7-umbrella-canopy` and add a full canopy hit zone covering (x: 960..1270, y: 55..230)
    const umbrellaEntry = this.hotspotEntries.find((e) => e.hotspot.id === 'p7-umbrella-canopy');
    if (umbrellaEntry) {
      umbrellaEntry.placeholderNode.setVisible(false);
      const canopyRectZone = this.add
        .zone(1115, 142, 310, 175)
        .setOrigin(0.5, 0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(245);
      canopyRectZone.on('pointerdown', () => {
        if (this.debugEnabled) return;
        this.triggerHotspotSkit(umbrellaEntry, 7);
      });
      this.stageContainer.add(canopyRectZone);
    }

    this.stageContainer.sort('depth');
  }

  /**
   * Mounts the 8 custom 3-frame Page 8 (Woodland Cabin) sprites + `p8-lower-railing-occluder`
   * foreground porch railing patch onto `p8-bg-clean.jpg` (1280x720) with 1:1 pixel alignment,
   * NEAREST filtering, continuous gentle bob + chimney smoke puffs on `p8-sparky-chimney`,
   * continuous pendulum sway on `p8-wind-chimes`, and woodland sunbeam pollen motes in the left trees!
   */
  private mountPage8LivingBookActors(): void {
    // 1. Mount lower wooden porch railing foreground occluder (x: 592, y: 473, 96x102) at depth 22
    // so `p8-nana-porch` (depth 18) stands naturally behind the wooden porch railing!
    if (this.textures.exists('p8-lower-railing-occluder')) {
      this.textures.get('p8-lower-railing-occluder').setFilter(Phaser.Textures.FilterMode.NEAREST);
      const railingOcc = this.add
        .image(592, 473, 'p8-lower-railing-occluder')
        .setOrigin(0, 0)
        .setDepth(22);
      railingOcc.setName('p8-lower-railing-occluder-img');
      this.stageContainer.add(railingOcc);
    }

    const p8Specs: Array<{
      hotspotId: string;
      texKey: string;
      scaleX: number;
      scaleY: number;
      depth: number;
      originX?: number;
      originY?: number;
      offsetX?: number;
      offsetY?: number;
    }> = [
      // 1. Wyatt & Emma running across the foreground dirt driveway toward the cabin (x: 1012, y: 606)
      {
        hotspotId: 'p8-kids-running',
        texKey: 'p8-sprite-kids-running',
        scaleX: 0.62,
        scaleY: 0.62,
        depth: 25,
        offsetX: 0,
        offsetY: 0
      },
      // 2. Nana on the cabin porch behind `p8-lower-railing-occluder` (hotspot x: 640, y: 445 -> sprite y: 462)
      {
        hotspotId: 'p8-nana-porch',
        texKey: 'p8-sprite-nana-porch',
        scaleX: 0.34,
        scaleY: 0.34,
        depth: 18,
        offsetX: 0,
        offsetY: 17
      },
      // 3. Sparky hovering beside the tall silver chimney pipe (x: 955, y: 125)
      {
        hotspotId: 'p8-sparky-chimney',
        texKey: 'p8-sprite-sparky-chimney',
        scaleX: 0.36,
        scaleY: 0.36,
        depth: 15,
        offsetX: 0,
        offsetY: 0
      },
      // 4. Silver wind chimes hanging directly from the left roof eave hook (origin 0.5, 0.0 at x: 436, y: 370)
      {
        hotspotId: 'p8-wind-chimes',
        texKey: 'p8-sprite-wind-chimes',
        scaleX: 0.22,
        scaleY: 0.22,
        depth: 16,
        originX: 0.5,
        originY: 0.0,
        offsetX: 0,
        offsetY: -25
      },
      // 5. Spotted woodland deer beside the left pine tree trunk (x: 86, y: 480)
      {
        hotspotId: 'p8-forest-deer',
        texKey: 'p8-sprite-forest-deer',
        scaleX: 0.36,
        scaleY: 0.36,
        depth: 12,
        offsetX: 0,
        offsetY: 0
      },
      // 6. Two Canada geese on the left grassy lawn in front of the cellar ramp (x: 172, y: 595)
      {
        hotspotId: 'p8-canada-geese',
        texKey: 'p8-sprite-canada-geese',
        scaleX: 0.56,
        scaleY: 0.56,
        depth: 20,
        offsetX: 0,
        offsetY: 0
      },
      // 7. Doggie & pinecone squirrel beside the slanted cellar door and porch steps (x: 345, y: 555)
      {
        hotspotId: 'p8-doggie-cellar',
        texKey: 'p8-sprite-doggie-cellar',
        scaleX: 0.30,
        scaleY: 0.30,
        depth: 19,
        offsetX: 0,
        offsetY: 0
      },
      // 8. Bluejay perched on the right-hand side-porch wooden railing (x: 982, y: 452)
      {
        hotspotId: 'p8-bluejay-porch',
        texKey: 'p8-sprite-bluejay-porch',
        scaleX: 0.16,
        scaleY: 0.16,
        depth: 17,
        offsetX: 0,
        offsetY: 0
      }
    ];

    for (const spec of p8Specs) {
      if (!this.textures.exists(spec.texKey)) continue;
      const entry = this.hotspotEntries.find((e) => e.hotspot.id === spec.hotspotId);
      if (!entry) continue;

      this.textures.get(spec.texKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      if (entry.spriteActor) {
        entry.spriteActor.destroy();
      }
      if (entry.patchImage) {
        entry.patchImage.destroy();
        entry.patchImage = null;
      }
      entry.placeholderNode.setVisible(false);

      const sprite = this.add
        .sprite(spec.offsetX ?? 0, spec.offsetY ?? 0, spec.texKey, 0)
        .setOrigin(spec.originX ?? 0.5, spec.originY ?? 0.5)
        .setScale(spec.scaleX, spec.scaleY);
      sprite.setData('baseScale', spec.scaleX);
      sprite.setData('baseScaleX', spec.scaleX);
      sprite.setData('baseScaleY', spec.scaleY);
      sprite.setData('baseX', spec.offsetX ?? 0);
      sprite.setData('baseY', spec.offsetY ?? 0);

      entry.actor.add(sprite);
      entry.actor.setDepth(spec.depth);
      entry.spriteActor = sprite;

      // Ambient Loop 1: Continuous gentle floating bob tween (y: +-7px sinusoidal over 1800ms) on `p8-sparky-chimney`
      if (spec.hotspotId === 'p8-sparky-chimney') {
        const baseY = spec.offsetY ?? 0;
        const idleTween = this.tweens.add({
          targets: sprite,
          y: { from: baseY - 7, to: baseY + 7 },
          duration: 1800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        sprite.setData('idleTween', idleTween);
      }

      // Ambient Loop 2: Continuous gentle pendulum sway tween (-2.5 deg <-> +2.5 deg over 2400ms) on `p8-wind-chimes`
      if (spec.hotspotId === 'p8-wind-chimes') {
        const idleTween = this.tweens.add({
          targets: sprite,
          angle: { from: -2.5, to: 2.5 },
          duration: 2400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        sprite.setData('idleTween', idleTween);
      }
    }

    // Ambient Loop 3: Slow rising smoke puff particles from the tall silver chimney top (x: 873, y: 74)
    if (this.textures.exists('p1-pixel-smoke-puff')) {
      const chimneySmoke = this.add.particles(873, 74, 'p1-pixel-smoke-puff', {
        x: { min: -5, max: 5 },
        y: { min: -2, max: 2 },
        speedX: { min: 4, max: 14 },
        speedY: { min: -24, max: -12 },
        scale: { start: 0.45, end: 1.05 },
        alpha: { start: 0.65, end: 0 },
        lifespan: 3200,
        frequency: 1150,
        quantity: 1,
        tint: [0xffffff, 0xf8fafc, 0xfce7f3]
      });
      chimneySmoke.setDepth(14);
      this.stageContainer.add(chimneySmoke);
    }

    // Ambient Loop 4: Woodland sunbeam firefly/pollen drift in the left sunlit trees (x: 60..360, y: 90..430)
    const pollenTex = this.textures.exists('cover-gold-dust') ? 'cover-gold-dust' : 'particle-star';
    const sunbeamPollen = this.add.particles(0, 0, pollenTex, {
      x: { min: 60, max: 360 },
      y: { min: 90, max: 430 },
      speedX: { min: 5, max: 16 },
      speedY: { min: -8, max: 10 },
      scale: { start: 0.25, end: 0.65 },
      alpha: { start: 0, end: 0.72, ease: 'Sine.easeInOut' },
      lifespan: 4200,
      frequency: 420,
      quantity: 1,
      blendMode: Phaser.BlendModes.ADD,
      tint: [0xfef08a, 0xfde047, 0xfbbf24, 0xd9f99d]
    });
    sunbeamPollen.setDepth(11);
    this.stageContainer.add(sunbeamPollen);

    this.stageContainer.sort('depth');
  }

  /**
   * Mounts the Page 9 (Cozy Cabin Bedtime) continuous calm ambient animations onto `p9-bg-clean.jpg` (1280x720)
   * with ZERO clickable hotspots:
   * 1. `p9-stove-fire` (x: 639, y: 472, scale: 0.50, depth: 12) nested cleanly inside the black wood-burning
   *    stove window behind `p9-stove-frame-occluder` (x: 550, y: 420, depth: 14), looping frames `0 -> 1 -> 2 -> 1`
   *    at `frameRate: 4, repeat: -1`, plus a warm amber radial hearth glow (`0xff9933`, `alpha: 0.12 <-> 0.22` over `2200ms`).
   * 2. `p9-doggie-sleeping` (x: 832, y: 638, scale: 0.44, depth: 18) curled up on the floor between the brick hearth pad
   *    and Nana's armchair, looping a slow breathing cycle (`0 -> 1 -> 2 -> 0` at `1200ms` per frame + subtle `scaleY` chest rise).
   * 3. Soft looping fireplace ambient audio (`sfx-fireplace-ambient.mp3`, `volume: 0.25`, `loop: true`) playing underneath `p9-narration.mp3`.
   */
  private mountPage9LivingBookActors(): void {
    // 1. Warm glowing firebox interior backing inside the stove window (x: 573..704, y: 441..521)
    const fireboxBg = this.add.graphics();
    fireboxBg.fillStyle(0x280c04, 1);
    fireboxBg.fillRect(573, 441, 131, 80);
    fireboxBg.fillStyle(0x4a1608, 0.85);
    fireboxBg.fillRect(577, 446, 123, 70);
    fireboxBg.setDepth(11);
    this.stageContainer.add(fireboxBg);

    // 2. Continuous Cozy Hearth Fire Loop (`p9-sprite-stove-fire` at x: 639, y: 472, scale: 0.50, depth: 12)
    if (this.textures.exists('p9-sprite-stove-fire')) {
      this.textures.get('p9-sprite-stove-fire').setFilter(Phaser.Textures.FilterMode.NEAREST);
      if (!this.anims.exists('p9-stove-fire-loop')) {
        this.anims.create({
          key: 'p9-stove-fire-loop',
          frames: [
            { key: 'p9-sprite-stove-fire', frame: 0 },
            { key: 'p9-sprite-stove-fire', frame: 1 },
            { key: 'p9-sprite-stove-fire', frame: 2 },
            { key: 'p9-sprite-stove-fire', frame: 1 }
          ],
          frameRate: 4,
          repeat: -1
        });
      }

      const fireSprite = this.add
        .sprite(639, 472, 'p9-sprite-stove-fire', 0)
        .setOrigin(0.5, 0.5)
        .setScale(0.50)
        .setDepth(12);
      fireSprite.play('p9-stove-fire-loop');
      this.stageContainer.add(fireSprite);
    }

    // 3. Cast-iron stove window frame occluder (`p9-stove-frame-occluder` at x: 550, y: 420, depth: 14)
    if (this.textures.exists('p9-stove-frame-occluder')) {
      this.textures.get('p9-stove-frame-occluder').setFilter(Phaser.Textures.FilterMode.NEAREST);
      const stoveFrameOcc = this.add
        .image(550, 420, 'p9-stove-frame-occluder')
        .setOrigin(0, 0)
        .setDepth(14);
      this.stageContainer.add(stoveFrameOcc);
    }

    // 4. Soft, warm amber radial glow (`0xff9933`, `alpha: 0.12 <-> 0.22` over `2200ms`, `yoyo: true, repeat: -1`)
    // over the stove hearth and cabin floor
    if (!this.textures.exists('p9-hearth-radial-glow')) {
      const glowCanvas = this.textures.createCanvas('p9-hearth-radial-glow', 256, 256);
      if (glowCanvas) {
        const ctx = glowCanvas.getContext();
        const grad = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
        grad.addColorStop(0, 'rgba(255, 175, 75, 1.0)');
        grad.addColorStop(0.45, 'rgba(255, 153, 51, 0.55)');
        grad.addColorStop(1, 'rgba(255, 153, 51, 0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);
        glowCanvas.refresh();
      }
    }

    const hearthGlow = this.add
      .image(640, 520, 'p9-hearth-radial-glow')
      .setOrigin(0.5, 0.5)
      .setDisplaySize(540, 340)
      .setTint(0xff9933)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.12)
      .setDepth(15);
    this.stageContainer.add(hearthGlow);

    this.tweens.add({
      targets: hearthGlow,
      alpha: { from: 0.12, to: 0.22 },
      scaleX: { from: hearthGlow.scaleX * 0.96, to: hearthGlow.scaleX * 1.05 },
      scaleY: { from: hearthGlow.scaleY * 0.96, to: hearthGlow.scaleY * 1.05 },
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 5. Continuous Gentle Breathing Loop on `p9-doggie-sleeping` (x: 832, y: 638, scale: 0.44, depth: 18)
    if (this.textures.exists('p9-sprite-doggie-sleeping')) {
      this.textures.get('p9-sprite-doggie-sleeping').setFilter(Phaser.Textures.FilterMode.NEAREST);
      const doggieBaseScale = 0.44;
      const doggieSprite = this.add
        .sprite(832, 638, 'p9-sprite-doggie-sleeping', 0)
        .setOrigin(0.5, 0.5)
        .setScale(doggieBaseScale)
        .setDepth(18);
      this.stageContainer.add(doggieSprite);

      // Slow peaceful frame cycle: 0 -> 1 -> 2 -> 0 at 1200ms per frame
      const breathFrames = [0, 1, 2];
      let breathStep = 0;
      const breathTimer = this.time.addEvent({
        delay: 1200,
        loop: true,
        callback: () => {
          if (!this.scene.isActive() || !doggieSprite.scene || !doggieSprite.active) {
            breathTimer.remove(false);
            return;
          }
          breathStep = (breathStep + 1) % breathFrames.length;
          doggieSprite.setFrame(breathFrames[breathStep] ?? 0);
        }
      });

      // Subtle chest-rise breathing tween (`scaleY: 1.0 <-> 1.03` over `2600ms`, `yoyo: true, repeat: -1`)
      this.tweens.add({
        targets: doggieSprite,
        scaleY: { from: doggieBaseScale, to: doggieBaseScale * 1.03 },
        y: { from: 638, to: 636.5 },
        duration: 2600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    // 6. Start soft looping fireplace ambient audio (`sfx-fireplace-ambient.mp3`, volume: 0.25)
    AudioBus.startAmbientLoop('/assets/stories/nana/audio/sfx-fireplace-ambient.mp3', 0.25);

    this.stageContainer.sort('depth');
  }

  /**
   * Renders 8 live mechanical split-flap letter cells aligned 1:1 with the exact measured
   * `(x, y, width, height)` of the 8 dark charcoal rectangular slots inside the painted
   * `ARRIVALS` sign (`y = 135..179.5`, `cellW = 31`, `cellH = 45`), with zero extra gold housing
   * border and zero underlying painted letters peeking out!
   */
  private buildPage1SplitFlapBoard(): void {
    const boardEntry = this.hotspotEntries.find((e) => e.hotspot.id === 'p1-flight-board');
    if (!boardEntry) return;

    this.p1SplitFlapCells = [];
    const initialWord = 'ARRIVALS';

    // Exact 1280x720 stage coordinates measured from the 8 painted slots in p1-bg-clean.jpg (2752x1536):
    // Source X ranges: [438..503, 508..574, 580..645, 650..717, 723..788, 794..858, 864..929, 935..999]
    // Source Y range: 288..383 -> stage Y: 135.0..179.53 (centerY = 157.25, height = 45)
    const slotStageCentersX = [218.85, 251.65, 284.9, 317.9, 351.4, 384.2, 417.0, 449.8];
    const slotStageCenterY = 157.25;
    const cellW = 31;
    const cellH = 45;

    const boardBaseX = boardEntry.hotspot.x;
    const boardBaseY = boardEntry.hotspot.y;

    for (let i = 0; i < 8; i++) {
      const ch = initialWord[i] ?? ' ';
      const stageX = slotStageCentersX[i] ?? 218.85 + i * 33;
      const localX = stageX - boardBaseX;
      const localY = slotStageCenterY - boardBaseY;

      const cellContainer = this.add.container(localX, localY);

      // Upper flap (#322738) with 1px dark outline (#020105)
      const topFlap = this.add.graphics();
      topFlap.fillStyle(0x020105, 1);
      topFlap.fillRect(-cellW / 2, -cellH / 2, cellW, cellH / 2);
      topFlap.fillStyle(0x322738, 1);
      topFlap.fillRect(-cellW / 2 + 1, -cellH / 2 + 1, cellW - 2, cellH / 2 - 1.5);

      // Lower flap (#3a2e40) with 1px dark outline (#020105)
      const bottomFlap = this.add.graphics();
      bottomFlap.fillStyle(0x020105, 1);
      bottomFlap.fillRect(-cellW / 2, 0, cellW, cellH / 2);
      bottomFlap.fillStyle(0x3a2e40, 1);
      bottomFlap.fillRect(-cellW / 2 + 1, 0.5, cellW - 2, cellH / 2 - 1.5);

      // Center horizontal split-hinge line (#05040c) + tiny side hinge notches
      const hingeLine = this.add.graphics();
      hingeLine.fillStyle(0x05040c, 1);
      hingeLine.fillRect(-cellW / 2, -1, cellW, 2);
      hingeLine.fillStyle(0x78716c, 0.75);
      hingeLine.fillRect(-cellW / 2 + 1, -1.5, 2, 3);
      hingeLine.fillRect(cellW / 2 - 3, -1.5, 2, 3);

      // Warm cream-white pixel font (#f5ebd6) matching the painted letters
      const text = this.add
        .text(0, 0, ch, {
          fontFamily: '"Courier New", Consolas, monospace',
          fontSize: '29px',
          fontStyle: 'bold',
          color: '#f5ebd6'
        })
        .setOrigin(0.5, 0.5);

      cellContainer.add([topFlap, bottomFlap, text, hingeLine]);
      boardEntry.actor.add(cellContainer);

      this.p1SplitFlapCells.push({
        container: cellContainer,
        topFlap,
        bottomFlap,
        text,
        currentChar: ch
      });
    }
  }

  /**
   * Flips the 8 split-flap cells on the `ARRIVALS` board through `"HI WYATT"` -> `"HI EMMA!"`
   * -> `"LUV NANA"` -> `"ARRIVALS"` timed to the exact 1,600ms mechanical clatter of `sfx-flap-board.mp3`!
   */
  private animatePage1SplitFlapBoard(tapIndex: number): void {
    if (this.p1SplitFlapCells.length === 0) return;

    const messages = ['HI WYATT', 'HI EMMA!', 'LUV NANA', 'ARRIVALS'];
    const targetMsg = (messages[tapIndex % messages.length] ?? 'ARRIVALS').padEnd(8, ' ').slice(0, 8);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789! ';

    // Clatter for ~1,580ms and snap all 8 tiles onto the final greeting right on the 1,600ms final click!
    const totalClatterMs = 1580;

    this.p1SplitFlapCells.forEach((cell, cellIdx) => {
      const targetChar = targetMsg[cellIdx] ?? ' ';
      const flipsCount = 14 + (cellIdx % 3);
      const cellStartMs = cellIdx * 28;
      const stepInterval = Math.floor((totalClatterMs - cellStartMs) / flipsCount);

      for (let step = 0; step < flipsCount; step++) {
        const isFinal = step === flipsCount - 1;
        const delayMs = isFinal ? totalClatterMs + cellIdx * 8 : cellStartMs + step * stepInterval;

        this.time.delayedCall(delayMs, () => {
          if (!this.scene.isActive() || !cell.container.scene) return;
          const nextChar = isFinal
            ? targetChar
            : alphabet[Phaser.Math.Between(0, alphabet.length - 1)] ?? 'A';

          this.tweens.add({
            targets: cell.container,
            scaleY: 0.14,
            duration: 28,
            ease: 'Quad.easeIn',
            onComplete: () => {
              if (!cell.text.scene) return;
              cell.text.setText(nextChar);
              cell.text.setColor(isFinal && targetMsg !== 'ARRIVALS' ? '#fde047' : '#f5ebd6');
              cell.currentChar = nextChar;
              this.tweens.add({
                targets: cell.container,
                scaleY: 1,
                duration: isFinal ? 42 : 28,
                ease: isFinal ? 'Back.easeOut' : 'Quad.easeOut'
              });
            }
          });
        });
      }
    });
  }

  /**
   * Probes `public/assets/stories/nana/sprites/` (and `raw/`) for Page 1 sprite sheets:
   * - `p1-jet.png` (1-frame runway jet)
   * - `p1-doggie.png` (4-frame bark-and-leap sheet)
   * - `p1-sparky.png` (3-frame wing-flap sheet)
   * Preserves pre-cleaned uniform spritesheets from `sprites/` 1:1, or auto-chroma-keys `raw/`!
   */
  private async loadAndMountPage1SpriteActors(): Promise<void> {
    const specs: {
      hotspotId: string;
      texKey: string;
      animKey: string;
      numFrames: number;
      verticalAnchor: 'bottom' | 'center';
      candidates: string[];
    }[] = [
      {
        hotspotId: 'p1-runway-jet',
        texKey: 'p1-sprite-jet',
        animKey: 'p1-jet-idle',
        numFrames: 1,
        verticalAnchor: 'center',
        candidates: [
          '/assets/stories/nana/sprites/p1-jet.png',
          '/assets/stories/nana/raw/p1-jet-raw.png',
          '/assets/stories/nana/raw/p1-jet-raw.jpg'
        ]
      },
      {
        hotspotId: 'p1-baggage-doggie',
        texKey: 'p1-sprite-doggie',
        animKey: 'p1-doggie-bark-leap',
        numFrames: 4,
        verticalAnchor: 'bottom',
        candidates: [
          '/assets/stories/nana/sprites/p1-doggie.png',
          '/assets/stories/nana/raw/p1-doggie-raw.png',
          '/assets/stories/nana/raw/p1-doggie-raw.jpg'
        ]
      },
      {
        hotspotId: 'p1-sparky-window',
        texKey: 'p1-sprite-sparky',
        animKey: 'p1-sparky-flap',
        numFrames: 3,
        verticalAnchor: 'center',
        candidates: [
          '/assets/stories/nana/sprites/p1-sparky.png',
          '/assets/stories/nana/raw/p1-sparky-raw.png',
          '/assets/stories/nana/raw/p1-sparky-raw.jpg'
        ]
      },
      {
        hotspotId: 'p1-nana-papa-hug',
        texKey: 'p1-sprite-family',
        animKey: 'p1-family-hug',
        numFrames: 3,
        verticalAnchor: 'bottom',
        candidates: [
          '/assets/stories/nana/sprites/p1-family.png',
          '/assets/stories/nana/raw/p1-family-raw.png',
          '/assets/stories/nana/raw/p1-family-raw.jpg'
        ]
      }
    ];

    for (const spec of specs) {
      // Skip async fetch if already preloaded by BootScene and mounted synchronously!
      const existingEntry = this.hotspotEntries.find((e) => e.hotspot.id === spec.hotspotId);
      if (this.textures.exists(spec.texKey) && existingEntry?.spriteActor) {
        continue;
      }

      let foundUrl: string | null = null;
      for (const url of spec.candidates) {
        try {
          const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
          const contentType = res.headers.get('content-type') ?? '';
          if (res.ok && contentType.startsWith('image/')) {
            foundUrl = url;
            break;
          }
        } catch {
          // Ignore offline errors
        }
      }

      if (!foundUrl || !this.scene.isActive() || this.getCurrentPage().theme !== 'nana-p1-airport') {
        continue;
      }

      const rawKey = `${spec.texKey}-raw-img`;
      if (!this.textures.exists(spec.texKey)) {
        await new Promise<void>((resolve) => {
          this.load.image(rawKey, foundUrl!);
          this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
          this.load.start();
        });

        if (!this.scene.isActive() || !this.textures.exists(rawKey)) continue;

        if (foundUrl.includes('/sprites/')) {
          // Pre-cleaned spritesheet from tools/clean_sprites.py: register uniform frames directly!
          const rawTex = this.textures.get(rawKey);
          const srcImg = rawTex?.getSourceImage() as HTMLImageElement | undefined;
          if (srcImg && srcImg.width > 0 && srcImg.height > 0) {
            const frameWidth = Math.floor(srcImg.width / spec.numFrames);
            const frameHeight = srcImg.height;
            this.textures.addSpriteSheet(spec.texKey, srcImg, {
              frameWidth,
              frameHeight
            });
            this.textures.get(spec.texKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
          }
        } else {
          this.prepareCleanSpritesheetTexture(rawKey, spec.texKey, spec.numFrames, spec.verticalAnchor);
        }
      }

      if (!this.textures.exists(spec.texKey)) continue;

      const entry = this.hotspotEntries.find((e) => e.hotspot.id === spec.hotspotId);
      if (!entry) continue;

      if (spec.hotspotId === 'p1-sparky-window' && !this.anims.exists(spec.animKey)) {
        this.anims.create({
          key: spec.animKey,
          frames: [
            { key: spec.texKey, frame: 0 },
            { key: spec.texKey, frame: 1 },
            { key: spec.texKey, frame: 2 },
            { key: spec.texKey, frame: 1 }
          ],
          frameRate: 9,
          repeat: 3
        });
      } else if (spec.numFrames > 1 && !this.anims.exists(spec.animKey)) {
        this.anims.create({
          key: spec.animKey,
          frames: this.anims.generateFrameNumbers(spec.texKey, {
            start: 0,
            end: spec.numFrames - 1
          }),
          frameRate: 8,
          repeat: 0
        });
      }

      if (entry.spriteActor) {
        entry.spriteActor.destroy();
      }
      if (entry.patchImage) {
        entry.patchImage.destroy();
        entry.patchImage = null;
      }
      entry.placeholderNode.setVisible(false);

      const sprite = this.add.sprite(0, 0, spec.texKey, 0).setOrigin(0.5, 0.5);
      // Fit neatly within the hotspot's logical dimensions while preserving aspect ratio
      const frameObj = sprite.frame;
      if (frameObj && frameObj.width > 0 && frameObj.height > 0) {
        const scale = Math.min(entry.hotspot.width / frameObj.width, entry.hotspot.height / frameObj.height);
        sprite.setScale(scale);
        sprite.setData('baseScale', scale);
      }

      entry.actor.add(sprite);
      entry.spriteActor = sprite;
    }
  }

  /**
   * Client-side mirror of `/tools/clean_sprites.py`:
   * Removes any `#FF00FF` magenta background + desaturates anti-aliased magenta edge spill,
   * normalizes multi-frame strips into uniform frame widths, and registers a Phaser spritesheet!
   */
  private prepareCleanSpritesheetTexture(
    rawKey: string,
    targetKey: string,
    numFrames: number,
    verticalAnchor: 'bottom' | 'center'
  ): void {
    const rawTex = this.textures.get(rawKey);
    const srcImg = rawTex?.getSourceImage() as HTMLImageElement | HTMLCanvasElement | undefined;
    if (!srcImg || !srcImg.width || !srcImg.height) return;

    const w = srcImg.width;
    const h = srcImg.height;
    const workCanvas = document.createElement('canvas');
    workCanvas.width = w;
    workCanvas.height = h;
    const ctx = workCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(srcImg, 0, 0);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a === 0) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const rbMin = Math.min(r, b);
      const rbDiff = Math.abs(r - b);
      const magentaExcess = rbMin - g - rbDiff * 0.45;

      if (magentaExcess > 85 && g < 135) {
        data[i + 3] = 0;
      } else if (magentaExcess > 14) {
        let newA = a;
        if (magentaExcess > 24 && g < 175) {
          const ramp = Math.max(0, Math.min(1, 1 - (magentaExcess - 24) / 61));
          newA = Math.round(a * ramp);
        }
        if (newA < 4) {
          data[i + 3] = 0;
        } else {
          const spill = Math.max(0, Math.min(1, (magentaExcess - 14) / 70));
          const neutral = Math.round(g * 0.7 + rbMin * 0.3);
          data[i] = Math.round(r * (1 - spill) + neutral * spill);
          data[i + 2] = Math.round(b * (1 - spill) + neutral * spill);
          data[i + 3] = newA;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Slice into `numFrames` equal-width normalized cells
    const rawSliceW = w / numFrames;
    const boxes: ({ x: number; y: number; w: number; h: number } | null)[] = [];
    let maxFrameW = 16;
    let maxFrameH = 16;

    for (let f = 0; f < numFrames; f++) {
      const sx0 = Math.round(f * rawSliceW);
      const sx1 = Math.round((f + 1) * rawSliceW);
      let minX = sx1;
      let maxX = sx0;
      let minY = h;
      let maxY = 0;
      let hasPixels = false;

      for (let py = 0; py < h; py++) {
        for (let px = sx0; px < sx1; px++) {
          const alpha = data[(py * w + px) * 4 + 3];
          if (alpha > 8) {
            hasPixels = true;
            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;
          }
        }
      }

      if (hasPixels) {
        const bw = maxX - minX + 1;
        const bh = maxY - minY + 1;
        boxes.push({ x: minX, y: minY, w: bw, h: bh });
        if (bw > maxFrameW) maxFrameW = bw;
        if (bh > maxFrameH) maxFrameH = bh;
      } else {
        boxes.push(null);
      }
    }

    const pad = 4;
    let cellW = maxFrameW + pad * 2;
    let cellH = maxFrameH + pad * 2;
    cellW += cellW % 2;
    cellH += cellH % 2;

    const sheetCanvas = document.createElement('canvas');
    sheetCanvas.width = cellW * numFrames;
    sheetCanvas.height = cellH;
    const sCtx = sheetCanvas.getContext('2d');
    if (!sCtx) return;
    sCtx.imageSmoothingEnabled = false;

    boxes.forEach((box, idx) => {
      if (!box) return;
      const dx = idx * cellW + Math.floor((cellW - box.w) / 2);
      const dy =
        verticalAnchor === 'bottom'
          ? cellH - pad - box.h
          : Math.floor((cellH - box.h) / 2);
      sCtx.drawImage(workCanvas, box.x, box.y, box.w, box.h, dx, dy, box.w, box.h);
    });

    const sheetImg = new Image();
    sheetImg.src = sheetCanvas.toDataURL('image/png');
    this.textures.addSpriteSheet(targetKey, sheetCanvas as unknown as HTMLImageElement, {
      frameWidth: cellW,
      frameHeight: cellH
    });
    this.textures.get(targetKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
  }

  /**
   * Slices each hotspot's rectangular patch `(x, y, width, height)` from the hi-res (`2752x1536`)
   * source image using exact `(sourceWidth / 1280)` and `(sourceHeight / 720)` scaling, then
   * displays the cutout sprite scaled back down to `(width, height)` on the `1280x720` stage!
   */
  private attachRealArtCutoutPatches(bgTexKey: string, _page: StoryPageData): void {
    this.hotspotEntries.forEach((entry) => {
      entry.placeholderNode.setVisible(false);
      this.rebuildSingleCutoutPatch(entry, bgTexKey);
    });
  }

  private rebuildSingleCutoutPatch(entry: HotspotActorEntry, bgTexKey: string): void {
    // Skip static cutout patch if a multi-frame sprite actor or live split-flap board is active
    const customActorIds = new Set([
      'p1-baggage-doggie',
      'p1-runway-jet',
      'p1-sparky-window',
      'p1-flight-board',
      'p2-porch',
      'p2-kids',
      'p2-mailbox',
      'p2-squirrel',
      'p2-sparky-bush',
      'p2-doggie-bush',
      'p2-maple-leaves',
      'p3-clock',
      'p3-doggie',
      'p3-sparky-cookies',
      'p3-grammy-kids',
      'p3-lamp',
      'p3-painting-1',
      'p3-painting-2',
      'p3-painting-3',
      'p3-photo-1',
      'p3-photo-2',
      'p3-photo-3',
      'p3-photo-4',
      'p4-car-doggie',
      'p4-hutch-items',
      'p4-cardboard-box',
      'p4-wall-oven',
      'p4-wreath',
      'p4-compressor',
      'p4-leaf-blower',
      'p4-sparky-cabinet',
      'p4-garage-opener',
      'p6-family',
      'p6-windmill-sails',
      'p6-ferris-wheel',
      'p6-clogs-doggie',
      'p6-dutch-door',
      'p6-chimney-stork',
      'p6-sparky-planter',
      'p6-butterflies',
      'p6-window-cat',
      'p7-papa-skipping',
      'p7-kids-sandcastle',
      'p7-nana-chair',
      'p7-doggie-towel',
      'p7-seagulls-bucket',
      'p7-sparky-grill',
      'p7-sailboat-horizon',
      'p7-beach-ball',
      'p7-umbrella-canopy',
      'p8-kids-running',
      'p8-nana-porch',
      'p8-sparky-chimney',
      'p8-wind-chimes',
      'p8-forest-deer',
      'p8-canada-geese',
      'p8-doggie-cellar',
      'p8-bluejay-porch'
    ]);
    if (entry.spriteActor || customActorIds.has(entry.hotspot.id)) return;

    const phaserTex = this.textures.get(bgTexKey);
    const sourceImg = phaserTex?.getSourceImage() as HTMLImageElement | HTMLCanvasElement | undefined;
    if (!sourceImg || !sourceImg.width || !sourceImg.height) return;

    const sourceWidth = sourceImg.width;
    const sourceHeight = sourceImg.height;
    const scaleX = sourceWidth / 1280;
    const scaleY = sourceHeight / 720;

    const h = entry.hotspot;
    const logicalW = Math.max(16, Math.round(h.width));
    const logicalH = Math.max(16, Math.round(h.height));
    const logicalLeft = h.x - logicalW / 2;
    const logicalTop = h.y - logicalH / 2;

    // Multiply logical 1280x720 rect by (sourceWidth / 1280) and (sourceHeight / 720)
    const sx = logicalLeft * scaleX;
    const sy = logicalTop * scaleY;
    const sw = logicalW * scaleX;
    const sh = logicalH * scaleY;

    const canvasW = Math.max(1, Math.round(sw));
    const canvasH = Math.max(1, Math.round(sh));

    this.patchRevisionCounter += 1;
    const patchKey = `${bgTexKey}-cutout-${h.id}-${logicalLeft}-${logicalTop}-${logicalW}x${logicalH}-r${this.patchRevisionCounter}`;

    const canvasTex = this.textures.createCanvas(patchKey, canvasW, canvasH);
    if (canvasTex) {
      const ctx = canvasTex.getContext();
      ctx.save();
      ctx.imageSmoothingEnabled = false;

      const radius = Math.min(Math.round(22 * scaleX), Math.floor(Math.min(canvasW, canvasH) * 0.22));
      this.traceRoundedRect(ctx, 0, 0, canvasW, canvasH, radius);
      ctx.clip();

      // Clamp source slice safely if a hotspot extends past the 0..1280 / 0..720 boundary
      const clampedSx = Math.max(0, sx);
      const clampedSy = Math.max(0, sy);
      const dstOffsetX = clampedSx - sx;
      const dstOffsetY = clampedSy - sy;
      const clampedSw = Math.min(sourceWidth - clampedSx, sw - dstOffsetX);
      const clampedSh = Math.min(sourceHeight - clampedSy, sh - dstOffsetY);

      if (clampedSw > 0 && clampedSh > 0) {
        ctx.drawImage(
          sourceImg,
          clampedSx,
          clampedSy,
          clampedSw,
          clampedSh,
          dstOffsetX,
          dstOffsetY,
          clampedSw,
          clampedSh
        );
      }

      ctx.restore();

      canvasTex.refresh();
      canvasTex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    if (entry.patchImage) {
      entry.patchImage.destroy();
    }

    // Display the cutout sprite scaled back down to (logicalW, logicalH) centered at (0, 0) inside actor!
    const patchSprite = this.add
      .image(0, 0, patchKey)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(logicalW, logicalH)
      .setAlpha(0);
    entry.actor.add(patchSprite);
    entry.patchImage = patchSprite;
  }

  private traceRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private async resolveRealImageUrl(src: string): Promise<string | null> {
    const cached = this.bgProbeCache.get(src);
    if (cached) {
      return cached;
    }

    const baseNoExt = src.replace(/(-clean)?\.(png|jpg|jpeg|webp)$/i, '');
    const candidates = [
      `${baseNoExt}-clean.jpg`,
      `${baseNoExt}-clean.png`,
      `${baseNoExt}-clean.webp`,
      `${baseNoExt}.jpg`,
      `${baseNoExt}.png`,
      `${baseNoExt}.webp`
    ];

    for (const url of candidates) {
      try {
        const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
        const contentType = res.headers.get('content-type') ?? '';
        if (res.ok && contentType.startsWith('image/')) {
          this.bgProbeCache.set(src, url);
          return url;
        }
      } catch {
        // Ignore offline errors
      }
    }

    return null;
  }

  private drawPictureBookFrame(): void {
    const frame = this.add.graphics();
    frame.lineStyle(10, 0xf5ead2, 0.9);
    frame.strokeRect(5, 5, 1270, 710);
    frame.lineStyle(2, 0x92400e, 0.45);
    frame.strokeRect(10, 10, 1260, 700);
    this.uiContainer.add(frame);
  }

  private playPageFlipTransition(direction: 'next' | 'prev'): void {
    this.pageFlipOverlay.clear();
    this.pageFlipOverlay.fillStyle(0xfdf8ec, 0.92);
    this.pageFlipOverlay.fillRect(0, 0, 1280, 720);
    this.pageFlipOverlay.lineStyle(6, 0xd97706, 0.55);
    this.pageFlipOverlay.strokeRect(0, 0, 1280, 720);

    this.pageFlipOverlay.setPosition(direction === 'next' ? 1280 : -1280, 0);
    this.pageFlipOverlay.setAlpha(1);

    this.tweens.add({
      targets: this.pageFlipOverlay,
      x: 0,
      alpha: 0,
      duration: 340,
      ease: 'Cubic.easeOut'
    });
  }

  private buildParchmentKaraokeBanner(page: StoryPageData): void {
    if (page.theme === 'nana-cover' || page.words.length === 0) return;

    const bannerX = 156;
    const bannerY = 10;
    const bannerW = 968;

    const fullTextLen = page.words.join(' ').length;
    const isLongSentence = fullTextLen > 110;

    const fontStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: '"Fredoka", "Georgia", "Nunito", serif',
      fontSize: isLongSentence ? '19px' : '21px',
      fontStyle: 'bold',
      color: '#271206'
    };

    const pillPadX = isLongSentence ? 12 : 16;
    const minPillW = isLongSentence ? 36 : 44;
    const pillGap = isLongSentence ? 5 : 6;
    const maxRowWidth = bannerW - 34;

    const tempTexts = page.words.map((word) => {
      const t = this.add.text(0, 0, word, fontStyle).setVisible(false);
      const width = Math.max(minPillW, Math.ceil(t.width + pillPadX));
      t.destroy();
      return { word, width };
    });

    const rows: { word: string; width: number; wordIndex: number }[][] = [[]];
    let currentRowWidth = 0;

    tempTexts.forEach((item, index) => {
      if (currentRowWidth + item.width + pillGap > maxRowWidth && rows[rows.length - 1].length > 0) {
        rows.push([]);
        currentRowWidth = 0;
      }
      rows[rows.length - 1].push({ ...item, wordIndex: index });
      currentRowWidth += item.width + pillGap;
    });

    const pillH = isLongSentence ? 28 : 30;
    const rowHeight = rows.length === 1 ? 0 : isLongSentence ? 31 : 34;
    const startY = rows.length === 1 ? 52 : rows.length === 2 ? 35 : 32;

    // Dynamically size the parchment banner height so there is always at least 18px of cream padding below the last row!
    const lastRowCenterY = startY + (rows.length - 1) * rowHeight;
    const lastRowBottomY = lastRowCenterY + pillH / 2;
    const bannerH = Math.max(84, Math.ceil(lastRowBottomY - bannerY + 18));

    const bannerBg = this.add.graphics();
    bannerBg.fillStyle(0x271206, 0.26);
    bannerBg.fillRoundedRect(bannerX + 3, bannerY + 4, bannerW, bannerH, 18);
    bannerBg.fillStyle(0xfdf8ec, 0.94);
    bannerBg.fillRoundedRect(bannerX, bannerY, bannerW, bannerH, 18);
    bannerBg.lineStyle(2.5, 0xb45309, 0.85);
    bannerBg.strokeRoundedRect(bannerX, bannerY, bannerW, bannerH, 18);
    bannerBg.lineStyle(1, 0xd97706, 0.45);
    bannerBg.strokeRoundedRect(bannerX + 5, bannerY + 5, bannerW - 10, bannerH - 10, 14);

    [
      [bannerX + 13, bannerY + 13],
      [bannerX + bannerW - 13, bannerY + 13],
      [bannerX + 13, bannerY + bannerH - 13],
      [bannerX + bannerW - 13, bannerY + bannerH - 13]
    ].forEach(([cx, cy]) => {
      bannerBg.fillStyle(0xd97706, 0.7);
      bannerBg.fillCircle(cx, cy, 3);
    });

    this.karaokeContainer.add(bannerBg);

    // Allow clicking the top parchment plaque background to explicitly read the page sentence aloud!
    const plaqueZone = this.add
      .zone(bannerX + bannerW / 2, bannerY + bannerH / 2, bannerW, bannerH)
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });
    plaqueZone.on('pointerdown', () => {
      AudioBus.playSfx('pop');
      this.playPageNarration();
    });
    this.karaokeContainer.add(plaqueZone);

    rows.forEach((row, rIdx) => {
      const totalW = row.reduce((acc, cur) => acc + cur.width, 0) + (row.length - 1) * pillGap;
      let cursorX = 640 - totalW / 2;
      const y = startY + rIdx * rowHeight;

      row.forEach((item) => {
        const pillX = cursorX + item.width / 2;
        const pillContainer = this.add.container(pillX, y);

        const pillBg = this.add.graphics();
        this.drawWordPillBg(pillBg, item.width, pillH, false);

        const wordText = this.add.text(0, 0, item.word, fontStyle).setOrigin(0.5);

        pillContainer.add([pillBg, wordText]);

        const hitW = Math.max(54, item.width);
        const hitH = 44;
        pillContainer.setSize(hitW, hitH);
        pillContainer.setInteractive({ useHandCursor: true });

        pillContainer.on('pointerdown', () => {
          AudioBus.playSfx('pop');
          const cleanWord = item.word.replace(/[^a-zA-Z0-9'-]/g, '');
          AudioBus.speakWordOrPhrase(cleanWord || item.word);
          this.highlightWordIndex(item.wordIndex, true);
          Juice.burstStars(this, pillX, y, 6, [0xfbbf24, 0xf59e0b]);
        });

        this.karaokeContainer.add(pillContainer);
        this.wordPills[item.wordIndex] = {
          container: pillContainer,
          bg: pillBg,
          text: wordText,
          w: item.width,
          h: pillH
        };

        cursorX += item.width + pillGap;
      });
    });
  }

  private drawWordPillBg(
    g: Phaser.GameObjects.Graphics,
    w: number,
    h: number,
    highlighted: boolean
  ): void {
    g.clear();
    if (highlighted) {
      g.fillStyle(0xfde047, 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 9);
      g.lineStyle(2, 0xd97706, 1);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 9);
    } else {
      g.fillStyle(0xf5ead2, 0.5);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    }
  }

  private highlightWordIndex(activeIndex: number, singleTap: boolean = false): void {
    this.wordPills.forEach((pill, idx) => {
      const isMatch = idx === activeIndex;
      this.drawWordPillBg(pill.bg, pill.w, pill.h, isMatch);
      pill.text.setColor(isMatch ? '#78350f' : '#271206');

      if (isMatch) {
        Juice.squashAndStretch(this, pill.container, 0.22, 135);
        if (singleTap) {
          this.time.delayedCall(520, () => {
            if (pill.bg.scene) {
              this.drawWordPillBg(pill.bg, pill.w, pill.h, false);
              pill.text.setColor('#271206');
            }
          });
        }
      }
    });
  }

  private playPageNarration(): void {
    const page = this.getCurrentPage();
    this.stopCurrentNarration();

    if (page.theme === 'nana-cover') {
      this.cancelNarration = AudioBus.playCoverNarrationIfPresent(
        page.narrationAudioSrc,
        () => {
          if (this.storyMode === 'read-to-me') {
            this.autoAdvanceTimer = this.time.delayedCall(2600, () => {
              if (this.currentPageIndex < this.cartridge.pages.length - 1) {
                AudioBus.playSfx('page-turn');
                this.goToPage(this.currentPageIndex + 1, 'next');
              }
            });
          }
        }
      );
      return;
    }

    this.cancelNarration = AudioBus.playStoryNarration(
      page.words,
      (wordIndex) => {
        this.highlightWordIndex(wordIndex, false);
      },
      () => {
        if (this.storyMode === 'read-to-me') {
          this.autoAdvanceTimer = this.time.delayedCall(2600, () => {
            if (this.currentPageIndex < this.cartridge.pages.length - 1) {
              AudioBus.playSfx('page-turn');
              this.goToPage(this.currentPageIndex + 1, 'next');
            }
          });
        }
      },
      page.narrationAudioSrc,
      page.wordTimings,
      page.narrationDurationMs
    );
  }

  private stopCurrentNarration(): void {
    if (this.cancelNarration) {
      this.cancelNarration();
      this.cancelNarration = null;
    }
    if (this.autoAdvanceTimer) {
      this.autoAdvanceTimer.remove(false);
      this.autoAdvanceTimer = null;
    }
  }

  private buildBookNavigationChrome(page: StoryPageData): void {
    const homeRibbon = this.add.container(58, 52);
    const rBg = this.add.graphics();
    rBg.fillStyle(0x000000, 0.25);
    rBg.fillPoints(
      [
        { x: -34, y: -52 },
        { x: 40, y: -52 },
        { x: 40, y: 42 },
        { x: 3, y: 24 },
        { x: -34, y: 42 }
      ],
      true
    );
    rBg.fillStyle(0xbe123c, 0.96);
    rBg.fillPoints(
      [
        { x: -36, y: -52 },
        { x: 36, y: -52 },
        { x: 36, y: 38 },
        { x: 0, y: 20 },
        { x: -36, y: 38 }
      ],
      true
    );
    rBg.lineStyle(2, 0xfde047, 0.85);
    rBg.strokePoints(
      [
        { x: -31, y: -52 },
        { x: 31, y: -52 },
        { x: 31, y: 30 },
        { x: 0, y: 14 },
        { x: -31, y: 30 }
      ],
      true
    );

    const homeIcon = this.add.text(0, -14, '🏠', { fontSize: '28px' }).setOrigin(0.5);
    const homeTxt = this.add
      .text(0, 8, 'HUB', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fef08a'
      })
      .setOrigin(0.5);

    homeRibbon.add([rBg, homeIcon, homeTxt]);
    Juice.makeTactileButton(
      this,
      homeRibbon,
      76,
      92,
      () => {
        this.stopCurrentNarration();
        AudioBus.stopAmbientLoop();
        this.scene.start('HubScene');
      },
      'pop'
    );
    this.uiContainer.add(homeRibbon);

    const modeRibbon = this.add.container(1208, 54);
    const mBg = this.add.graphics();
    const isPlayMode = this.storyMode === 'let-me-play';
    mBg.fillStyle(0x000000, 0.22);
    mBg.fillPoints(
      [
        { x: -50, y: -54 },
        { x: 54, y: -54 },
        { x: 54, y: 64 },
        { x: 2, y: 46 },
        { x: -50, y: 64 }
      ],
      true
    );
    mBg.fillStyle(isPlayMode ? 0xfdf8ec : 0xfef3c7, 0.96);
    mBg.fillPoints(
      [
        { x: -52, y: -54 },
        { x: 52, y: -54 },
        { x: 52, y: 60 },
        { x: 0, y: 42 },
        { x: -52, y: 60 }
      ],
      true
    );
    mBg.lineStyle(2.5, 0xb45309, 0.85);
    mBg.strokePoints(
      [
        { x: -47, y: -54 },
        { x: 47, y: -54 },
        { x: 47, y: 53 },
        { x: 0, y: 36 },
        { x: -47, y: 53 }
      ],
      true
    );

    const modeEmoji = this.add
      .text(0, -27, isPlayMode ? '🖐️🔊' : '📖🔊', { fontSize: '21px' })
      .setOrigin(0.5);
    const modeLabel = this.add
      .text(0, -6, isPlayMode ? 'Play Mode' : 'Read to Me', {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#78350f'
      })
      .setOrigin(0.5);
    const pageNumTiny = this.add
      .text(0, 9, `${page.pageNumber} / ${this.cartridge.pages.length}`, {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#92400e'
      })
      .setOrigin(0.5);

    modeRibbon.add([mBg, modeEmoji, modeLabel, pageNumTiny]);
    Juice.makeTactileButton(
      this,
      modeRibbon,
      104,
      114,
      () => {
        this.storyMode = this.storyMode === 'let-me-play' ? 'read-to-me' : 'let-me-play';
        ArcadeState.setStoryMode(this.storyMode);
        Juice.burstStars(this, 1208, 54, 10, [0xfbbf24, 0xf59e0b]);
        this.renderCurrentPage(false);
        this.playPageNarration();
      },
      'chime'
    );
    this.uiContainer.add(modeRibbon);

    if (this.currentPageIndex > 0) {
      const prevCorner = this.createDogEarCorner('left', page.pageNumber - 1, false, () => {
        this.goToPage(this.currentPageIndex - 1, 'prev');
      });
      this.uiContainer.add(prevCorner);
    }

    const isLastPage = this.currentPageIndex >= this.cartridge.pages.length - 1;
    const nextCorner = this.createDogEarCorner(
      'right',
      isLastPage ? page.pageNumber : page.pageNumber + 1,
      isLastPage,
      () => {
        if (isLastPage) {
          this.triggerTheEndSequence();
        } else {
          this.goToPage(this.currentPageIndex + 1, 'next');
        }
      }
    );
    this.uiContainer.add(nextCorner);
  }

  /**
   * Peaceful bedtime ending sequence when clicking "The End" (`★ End`) or advancing past the final page:
   * - Guards against double-clicks so it can only be triggered once.
   * - Plays `'sfx-the-end'` at a warm, gentle volume (`volume: 0.65`).
   * - Smoothly fades out any active narration or ambient audio (such as `sfx-fireplace-ambient`)
   *   over `2500ms` using a Phaser tween on its volume down to `0` before stopping it.
   * - Triggers a slow, peaceful camera fade-to-black: `this.cameras.main.fadeOut(2800, 10, 8, 18)`.
   * - Listens for `Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE`, waits a `400ms` beat in the
   *   quiet darkness, and transitions cleanly back to `HubScene`.
   */
  private triggerTheEndSequence(): void {
    if (this.isEndingBook) return;
    this.isEndingBook = true;

    if (this.autoAdvanceTimer) {
      this.autoAdvanceTimer.remove(false);
      this.autoAdvanceTimer = null;
    }

    ArcadeState.addStars(5);

    // 1. Play `'sfx-the-end'` at a warm, gentle volume (volume: 0.65)
    if (!AudioBus.getMuted()) {
      if (this.cache.audio.exists('sfx-the-end')) {
        this.sound.play('sfx-the-end', { volume: 0.65 });
      } else {
        AudioBus.playLayerSfx('/assets/stories/nana/audio/sfx-the-end.mp3', 0.65);
      }
    }

    // 2. Smoothly fade out any active narration or ambient audio (such as `sfx-fireplace-ambient`)
    // over 2500ms using a Phaser tween on its volume down to 0 before stopping it
    AudioBus.clearNarrationTimers();
    const activeHowls = AudioBus.getActiveNarrationAndAmbientHowls();
    activeHowls.forEach((howl) => {
      const volState = { volume: howl.volume() };
      this.tweens.add({
        targets: volState,
        volume: 0,
        duration: 2500,
        ease: 'Linear',
        onUpdate: () => {
          howl.volume(Math.max(0, volState.volume));
        },
        onComplete: () => {
          howl.stop();
        }
      });
    });

    this.time.delayedCall(2500, () => {
      this.stopCurrentNarration();
      AudioBus.stopAmbientLoop();
    });

    // 3. Slow, peaceful midnight-indigo/black camera fade-out over 2800ms + 400ms quiet beat before returning to Hub
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.time.delayedCall(400, () => {
        this.stopCurrentNarration();
        AudioBus.stopAmbientLoop();
        this.scene.start('HubScene');
      });
    });
    this.cameras.main.fadeOut(2800, 10, 8, 18);
  }

  private createDogEarCorner(
    side: 'left' | 'right',
    targetPageNum: number,
    isFinish: boolean,
    onTurn: () => void
  ): Phaser.GameObjects.Container {
    const size = 112;
    const cx = side === 'left' ? 58 : 1222;
    const cy = 662;
    const container = this.add.container(cx, cy);

    const g = this.add.graphics();
    if (side === 'right') {
      g.fillStyle(0x271206, 0.32);
      g.fillTriangle(-44, 52, 52, -44, -22, -22);
      g.fillStyle(0xfdf8ec, 0.96);
      g.fillTriangle(-48, 52, 52, -48, -16, -16);
      g.fillStyle(0xe7d8b9, 0.96);
      g.fillTriangle(-48, 52, 52, -48, 52, 52);
      g.lineStyle(2.5, 0xb45309, 0.8);
      g.strokeTriangle(-48, 52, 52, -48, -16, -16);
    } else {
      g.fillStyle(0x271206, 0.32);
      g.fillTriangle(-52, -44, 44, 52, 22, -22);
      g.fillStyle(0xfdf8ec, 0.96);
      g.fillTriangle(-52, -48, 48, 52, 16, -16);
      g.fillStyle(0xe7d8b9, 0.96);
      g.fillTriangle(-52, -48, 48, 52, -52, 52);
      g.lineStyle(2.5, 0xb45309, 0.8);
      g.strokeTriangle(-52, -48, 48, 52, 16, -16);
    }

    const labelStr = isFinish ? '★ End' : `p.${targetPageNum}`;
    const label = this.add
      .text(side === 'right' ? 12 : -12, 16, labelStr, {
        fontFamily: '"Fredoka", Georgia, serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#78350f'
      })
      .setOrigin(0.5);

    container.add([g, label]);

    this.tweens.add({
      targets: container,
      scaleX: 1.06,
      scaleY: 1.06,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    Juice.makeTactileButton(this, container, size, size, onTurn, isFinish ? null : 'page-turn');
    return container;
  }

  private goToPage(targetIndex: number, direction: 'next' | 'prev' = 'next'): void {
    if (this.isEndingBook) return;
    if (targetIndex >= this.cartridge.pages.length) {
      this.triggerTheEndSequence();
      return;
    }
    this.stopCurrentNarration();
    this.currentPageIndex = Phaser.Math.Clamp(targetIndex, 0, this.cartridge.pages.length - 1);
    this.renderCurrentPage(true, direction);
  }

  private createHotspotActor(
    hotspot: StoryHotspotData,
    pageNum: number,
    hasRealArt: boolean
  ): HotspotActorEntry {
    const actor = this.add.container(hotspot.x, hotspot.y);
    actor.setData('baseX', hotspot.x);
    actor.setData('baseY', hotspot.y);
    actor.setData('tapCount', 0);
    actor.setData('sandcastleStage', 1);

    const patchShadow = this.add.graphics();
    patchShadow.fillStyle(0x090d16, 0.38);
    patchShadow.fillRoundedRect(
      -hotspot.width / 2 + 6,
      -hotspot.height / 2 + 10,
      hotspot.width,
      hotspot.height,
      20
    );
    patchShadow.setAlpha(0);
    actor.add(patchShadow);

    const placeholderNode = this.add.container(0, 0);
    this.drawHotspotVisualProp(placeholderNode, hotspot.propType, 1);
    placeholderNode.setVisible(!hasRealArt);
    actor.add(placeholderNode);

    this.tweens.add({
      targets: placeholderNode,
      scaleY: 1.028,
      scaleX: 0.985,
      duration: Phaser.Math.Between(1450, 2150),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const hitW = Math.max(64, Math.round(hotspot.width));
    const hitH = Math.max(64, Math.round(hotspot.height));

    // Decoupled top-level 1280x720 stage hitZone (uses Rectangle(0, 0, hitW, hitH) in local Zone space — NEVER -hitW/2!)
    const hitZone = this.add.zone(hotspot.x, hotspot.y, hitW, hitH).setOrigin(0.5, 0.5);
    hitZone.setInteractive({ useHandCursor: true });

    const entry: HotspotActorEntry = {
      hotspot,
      actor,
      hitZone,
      placeholderNode,
      patchShadow,
      patchImage: null,
      spriteActor: null,
      cutoutTimer: null
    };

    hitZone.on('pointerdown', () => {
      // When Shift+D Debug Editor is active, pointerdown/move/up is handled by the drag/resize editor!
      if (this.debugEnabled) return;
      this.triggerHotspotSkit(entry, pageNum);
    });

    return entry;
  }

  private triggerHotspotSkit(entry: HotspotActorEntry, pageNum: number): void {
    const { actor, hotspot } = entry;
    if (entry.spriteActor?.getData('gagBusy') || actor.getData('gagBusy')) {
      return;
    }
    if (
      (hotspot.id === 'p3-doggie' ||
        hotspot.id === 'p3-clock' ||
        hotspot.id === 'p3-doggie-pillow' ||
        hotspot.id === 'p3-cuckoo-clock') &&
      this.p3ClockDoggieBusy
    ) {
      return;
    }
    const tapIndex = (actor.getData('tapCount') as number) ?? 0;
    actor.setData('tapCount', tapIndex + 1);

    const variations = hotspot.variations;
    const activeVar =
      variations && variations.length > 0
        ? variations[tapIndex % variations.length]
        : {
            gagAnimation: hotspot.gagAnimation,
            sfx: hotspot.sfx,
            popText: hotspot.popText,
            speechLine: hotspot.speechLine,
            voiceAudioSrc: hotspot.voiceAudioSrc
          };

    // STRICTLY SFX ONLY ON HOTSPOT CLICKS — NEVER voice narration, window.speechSynthesis, or floating text popups!
    const activeKid = ArcadeState.getActiveKid();
    const kidOrder: ('wyatt' | 'emma')[] =
      activeKid.id === 'emma'
        ? tapIndex % 2 === 0
          ? ['emma', 'wyatt']
          : ['wyatt', 'emma']
        : tapIndex % 2 === 0
          ? ['wyatt', 'emma']
          : ['emma', 'wyatt'];

    AudioBus.playHotspotSfx(
      activeVar.sfx,
      activeVar.voiceAudioSrc ?? hotspot.voiceAudioSrc,
      kidOrder
    );

    ArcadeState.markHotspotDiscovered(`${this.cartridge.id}:p${pageNum}:${hotspot.id}`);

    Juice.burstStars(
      this,
      hotspot.x,
      hotspot.y - 16,
      16,
      hotspot.particleColors ?? [0xfbbf24, 0x34d399, 0xf472b6, 0x38bdf8]
    );

    // Pure visual prop flair (zero floating text labels or captions!)
    this.spawnCustomPropFlair(hotspot, tapIndex);

    this.playGagAnimation(entry, activeVar.gagAnimation, tapIndex);
  }

  private spawnCustomPropFlair(hotspot: StoryHotspotData, _tapIndex: number): void {
    if (hotspot.id === 'p1-baggage-doggie') {
      Juice.burstStars(this, hotspot.x, hotspot.y - 24, 14, [0xfde047, 0xf97316, 0x38bdf8, 0xffffff]);
    } else if (hotspot.id === 'p1-carousel-suitcases') {
      Juice.burstStars(this, hotspot.x, hotspot.y - 18, 14, [0x22c55e, 0x38bdf8, 0xfacc15, 0xf472b6]);
    } else if (hotspot.id === 'p1-sparky-window') {
      Juice.burstStars(this, hotspot.x, hotspot.y, 20, [0x10b981, 0x34d399, 0xfbbf24, 0xfef08a]);
    } else if (hotspot.id === 'p1-grr-sign') {
      // 3-beat airport PA ding-dong-ding chime glow synced to sfx-airport-chime.mp3 (0ms, 336ms, 600ms) — zero text popups!
      const chimeTimes = [0, 336, 600];
      chimeTimes.forEach((delayMs, idx) => {
        this.time.delayedCall(delayMs, () => {
          if (!this.scene.isActive()) return;
          const glow = this.add
            .ellipse(hotspot.x, hotspot.y, hotspot.width + 24, hotspot.height + 20, 0xfde047, 0.36)
            .setDepth(462);
          this.tweens.add({
            targets: glow,
            scaleX: 1.25,
            scaleY: 1.25,
            alpha: 0,
            duration: 320,
            ease: 'Quad.easeOut',
            onComplete: () => glow.destroy()
          });
          Juice.burstStars(
            this,
            hotspot.x - 30 + idx * 30,
            hotspot.y - 10,
            6,
            [0xfde047, 0x38bdf8, 0xffffff]
          );
        });
      });
    }
  }

  private activateCutoutPatchForGag(entry: HotspotActorEntry, durationMs: number = 640): void {
    if (!entry.patchImage) return;
    if (entry.cutoutTimer) {
      entry.cutoutTimer.remove(false);
      entry.cutoutTimer = null;
    }
    this.tweens.killTweensOf([entry.patchImage, entry.patchShadow]);
    entry.patchImage.setAlpha(1);
    entry.patchShadow.setAlpha(0.95);
    entry.actor.setDepth(120);

    const baseX = (entry.actor.getData('baseX') as number) ?? entry.hotspot.x;
    const baseY = (entry.actor.getData('baseY') as number) ?? entry.hotspot.y;

    entry.cutoutTimer = this.time.delayedCall(durationMs, () => {
      if (!this.scene.isActive() || !entry.patchImage) return;
      this.tweens.killTweensOf(entry.actor);

      // Smoothly return cutout to exact (x, y, scale: 1, angle: 0) before hiding!
      this.tweens.add({
        targets: entry.actor,
        x: baseX,
        y: baseY,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        duration: 130,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (!this.scene.isActive() || !entry.patchImage) return;
          entry.actor.setPosition(baseX, baseY);
          entry.actor.setScale(1, 1);
          entry.actor.setAngle(0);
          this.tweens.add({
            targets: [entry.patchImage, entry.patchShadow],
            alpha: 0,
            duration: 110,
            ease: 'Quad.easeOut',
            onComplete: () => {
              entry.actor.setDepth(50);
            }
          });
        }
      });
    });
  }

  /**
   * Page 1 Runway Jet Takeoff & Taxi-Back Sequence (`sfx-jet-takeoff.mp3`, 3,432ms):
   * Layered inside `this.exteriorStageContainer` (`depth = 20`, UNDER `p1-window-occluder.png` at `depth = 30`)
   * so both the jet AND its 32-bit pixel-art turbine exhaust & tire screech smoke pass realistically
   * BEHIND the vertical window mullions, BEHIND the `ARRIVALS` sign, and BEHIND the family!
   * - 0.0s..0.7s: Engine spool-up vibration + fast horizontal exhaust puffs blasting backward from the under-wing engine nacelle
   * - 0.7s..1.4s: Accelerate right down the tarmac leaving expanding billowing pixel smoke & tire puffs along the runway
   * - 1.4s..2.35s: Pitch nose up `-16°` and climb diagonally into the sky with turbine exhaust trailing the engine
   * - 2.35s..3.25s: Taxi smoothly back into view from the left!
   */
  private playPage1JetTakeoffSequence(
    entry: HotspotActorEntry,
    baseX: number,
    baseY: number
  ): void {
    const { actor } = entry;
    if (!entry.spriteActor) {
      this.activateCutoutPatchForGag(entry, 3300);
    }

    const spawnPixelSmokePuff = (
      worldX: number,
      worldY: number,
      velX: number,
      velY: number,
      startScale: number,
      endScale: number,
      durationMs: number,
      tint?: number
    ) => {
      if (!this.scene.isActive() || !this.textures.exists('p1-pixel-smoke-puff')) return;
      const puff = this.add
        .image(worldX, worldY, 'p1-pixel-smoke-puff')
        .setOrigin(0.5, 0.5)
        .setScale(startScale)
        .setAlpha(0.92);
      if (tint) {
        puff.setTint(tint);
      }
      this.exteriorStageContainer.add(puff);
      // Keep the jet actor above its own smoke trail inside exteriorStageContainer
      this.exteriorStageContainer.bringToTop(actor);

      this.tweens.add({
        targets: puff,
        x: worldX + velX,
        y: worldY + velY,
        scaleX: endScale,
        scaleY: endScale,
        alpha: 0,
        duration: durationMs,
        ease: 'Quad.easeOut',
        onComplete: () => puff.destroy()
      });
    };

    // Helper to transform local jet offsets (nacelle / landing gear tires) into exteriorStageContainer coordinates
    const getJetWorldPoint = (localX: number, localY: number) => {
      const rad = Phaser.Math.DegToRad(actor.angle);
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return {
        x: actor.x + localX * cos - localY * sin,
        y: actor.y + localX * sin + localY * cos
      };
    };

    // 1. 0.0s..0.7s Engine Spool-Up: blast fast horizontal pixel exhaust puffs backward from under-wing engine nacelle!
    for (let i = 0; i < 14; i++) {
      this.time.delayedCall(i * 48, () => {
        if (!this.scene.isActive()) return;
        const nacelle = getJetWorldPoint(8, 38);
        spawnPixelSmokePuff(
          nacelle.x + Phaser.Math.Between(-6, 4),
          nacelle.y + Phaser.Math.Between(-4, 5),
          Phaser.Math.Between(-135, -85),
          Phaser.Math.Between(-6, 10),
          Phaser.Math.FloatBetween(0.75, 1.05),
          Phaser.Math.FloatBetween(1.85, 2.45),
          440,
          i % 3 === 0 ? 0xe2e8f0 : 0xffffff
        );
      });
    }

    // 2. 0.7s..2.2s Tarmac Roll & -16° Sky Climb: billowing turbine exhaust + runway tire screech puffs!
    for (let i = 0; i < 24; i++) {
      const delayMs = 680 + i * 62;
      this.time.delayedCall(delayMs, () => {
        if (!this.scene.isActive() || actor.x > 1120) return;
        // Under-wing turbine exhaust puff following the jet's pitch angle
        const nacelle = getJetWorldPoint(6, 38);
        const isClimbing = delayMs >= 1350;
        spawnPixelSmokePuff(
          nacelle.x + Phaser.Math.Between(-8, 4),
          nacelle.y + Phaser.Math.Between(-4, 6),
          Phaser.Math.Between(-120, -70),
          isClimbing ? Phaser.Math.Between(16, 42) : Phaser.Math.Between(-10, 12),
          Phaser.Math.FloatBetween(0.95, 1.3),
          Phaser.Math.FloatBetween(2.3, 3.1),
          580,
          i % 2 === 0 ? 0xffffff : 0xf1f5f9
        );

        // During tarmac acceleration (680..1420ms), also spawn crisp tire-screech runway puffs at the landing gear wheels!
        if (delayMs <= 1450) {
          const mainGear = getJetWorldPoint(-4, 58);
          spawnPixelSmokePuff(
            mainGear.x + Phaser.Math.Between(-10, 6),
            mainGear.y + Phaser.Math.Between(-2, 4),
            Phaser.Math.Between(-95, -50),
            Phaser.Math.Between(-14, -3),
            Phaser.Math.FloatBetween(0.85, 1.15),
            Phaser.Math.FloatBetween(2.1, 2.75),
            620,
            0xe2e8f0
          );
        }
      });
    }

    // Phase 0 (0..680ms): Turbine spool-up vibration on the runway
    this.tweens.add({
      targets: actor,
      x: baseX + 18,
      y: { from: baseY - 1.5, to: baseY + 1.5 },
      duration: 68,
      yoyo: true,
      repeat: 4,
      onComplete: () => {
        if (!this.scene.isActive()) return;
        // Phase 1 (680..1380ms): Accelerate right down the tarmac
        this.tweens.add({
          targets: actor,
          x: baseX + 185,
          y: baseY - 4,
          angle: -4,
          duration: 700,
          ease: 'Quad.easeIn',
          onComplete: () => {
            if (!this.scene.isActive()) return;
            // Phase 2 (1380..2350ms): Pitch nose up -16° and climb diagonally into the sky out of view
            this.tweens.add({
              targets: actor,
              x: 1140,
              y: 105,
              angle: -16,
              duration: 970,
              ease: 'Cubic.easeIn',
              onComplete: () => {
                if (!this.scene.isActive()) return;
                // Phase 3 (2350..3250ms): Taxi smoothly back into view from the left of the runway!
                actor.setPosition(85, baseY);
                actor.setAngle(0);
                this.tweens.add({
                  targets: actor,
                  x: baseX,
                  y: baseY,
                  angle: 0,
                  duration: 900,
                  ease: 'Cubic.easeOut'
                });
              }
            });
          }
        });
      }
    });
  }

  private playGagAnimation(
    entry: HotspotActorEntry,
    gag: GagAnimationType,
    tapIndex: number
  ): void {
    const { actor, hotspot } = entry;
    const baseX = (actor.getData('baseX') as number) ?? hotspot.x;
    const baseY = (actor.getData('baseY') as number) ?? hotspot.y;
    this.tweens.killTweensOf(actor);
    actor.setPosition(baseX, baseY);
    actor.setScale(1, 1);
    actor.setAngle(0);

    // 1. Page 1 `ARRIVALS` Split-Flap Board: physically flip letters for 1,600ms matching `sfx-flap-board.mp3`
    if (hotspot.id === 'p1-flight-board') {
      this.animatePage1SplitFlapBoard(tapIndex);
      this.tweens.add({
        targets: actor,
        y: { from: baseY - 2.5, to: baseY + 2.5 },
        duration: 50,
        yoyo: true,
        repeat: 14,
        onComplete: () => {
          actor.setPosition(baseX, baseY);
        }
      });
      return;
    }

    // 2. Page 1 Runway Jet: puff exhaust, accelerate right down tarmac, pitch nose -16°, climb diagonally into sky, taxi back from left!
    if (hotspot.id === 'p1-runway-jet') {
      this.playPage1JetTakeoffSequence(entry, baseX, baseY);
      return;
    }

    // 3. Page 1 Doggie (`p1-doggie.png` 4-frame sheet synced to `sfx-doggie-bark.mp3`, 1,632ms):
    // Frame 0 (sit in shades) -> Frame 1 (play-bow crouch) -> Frame 2 (bark #1 at 55ms)
    // -> Frame 3 (high mid-air leap off suitcase at 335ms bark #2) -> Frame 2 (bark #3 at 1120ms) -> Frame 0 (1520ms)
    if (hotspot.id === 'p1-baggage-doggie') {
      const sprite = entry.spriteActor;
      if (sprite) {
        sprite.stop();
        // 0ms: Frame 1 play-bow crouch
        sprite.setFrame(1);
        this.tweens.add({
          targets: actor,
          scaleX: 1.12,
          scaleY: 0.88,
          y: baseY + 6,
          duration: 55,
          ease: 'Quad.easeOut'
        });

        // 55ms: Frame 2 open-mouth Bark #1!
        this.time.delayedCall(55, () => {
          if (!this.scene.isActive() || !sprite.scene) return;
          sprite.setFrame(2);
          this.tweens.add({
            targets: actor,
            scaleX: 0.94,
            scaleY: 1.08,
            y: baseY - 14,
            duration: 130,
            yoyo: true,
            ease: 'Quad.easeOut'
          });
        });

        // 335ms: Frame 3 high mid-air leap timed to Bark #2!
        this.time.delayedCall(335, () => {
          if (!this.scene.isActive() || !sprite.scene) return;
          sprite.setFrame(3);
          this.tweens.add({
            targets: actor,
            y: baseY - 78,
            scaleX: 1.06,
            scaleY: 1.08,
            angle: { from: -9, to: 9 },
            duration: 340,
            yoyo: true,
            ease: 'Quad.easeOut',
            onComplete: () => {
              if (!this.scene.isActive() || !sprite.scene) return;
              actor.setPosition(baseX, baseY);
              actor.setScale(1, 1);
              actor.setAngle(0);
              sprite.setFrame(1);
              Juice.squashAndStretch(this, actor, 0.18, 110);
            }
          });
        });

        // 1120ms: Frame 2 happy Bark #3!
        this.time.delayedCall(1120, () => {
          if (!this.scene.isActive() || !sprite.scene) return;
          sprite.setFrame(2);
          this.tweens.add({
            targets: actor,
            y: baseY - 18,
            angle: -6,
            duration: 140,
            yoyo: true,
            ease: 'Back.easeOut'
          });
        });

        // 1520ms: Return to Frame 0 sitting proudly in cool airport sunglasses!
        this.time.delayedCall(1520, () => {
          if (!this.scene.isActive() || !sprite.scene) return;
          sprite.setFrame(0);
          actor.setPosition(baseX, baseY);
          actor.setScale(1, 1);
          actor.setAngle(0);
        });
      } else {
        this.activateCutoutPatchForGag(entry, 1500);
        Juice.jumpFlip(this, actor, 74, false);
      }
      return;
    }

    // 4. Page 1 Sparky (`p1-sparky.png` 3-frame wing-flap sheet synced to `sfx-sparky-wings.mp3`, 1,944ms):
    // Cycle frames 0-1-2-1 while flying a playful loop across the terminal window panes with golden sparkles!
    if (hotspot.id === 'p1-sparky-window') {
      if (entry.spriteActor && this.anims.exists('p1-sparky-flap')) {
        entry.spriteActor.play('p1-sparky-flap');
        entry.spriteActor.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
          entry.spriteActor?.setFrame(0);
        });
      } else {
        this.activateCutoutPatchForGag(entry, 1850);
      }

      // Trail golden sparkle puffs along Sparky's flight loop inside exteriorStageContainer (depth 20)
      // so they pass naturally behind `p1-window-occluder.png` (depth 30)!
      for (let i = 0; i < 12; i++) {
        this.time.delayedCall(i * 140, () => {
          if (!this.scene.isActive()) return;
          const glint = this.add.star(
            actor.x + Phaser.Math.Between(-28, 28),
            actor.y + Phaser.Math.Between(-18, 18),
            4,
            3,
            8,
            i % 2 === 0 ? 0xfde047 : 0x34d399,
            0.92
          );
          this.exteriorStageContainer.add(glint);
          this.tweens.add({
            targets: glint,
            y: glint.y + 26,
            alpha: 0,
            angle: 120,
            scaleX: 0.2,
            scaleY: 0.2,
            duration: 480,
            onComplete: () => glint.destroy()
          });
        });
      }

      this.tweens.addCounter({
        from: 0,
        to: Math.PI * 2,
        duration: 1820,
        onUpdate: (tween) => {
          const val = tween.getValue() ?? 0;
          actor.x = baseX + Math.sin(val) * 135;
          actor.y = baseY - Math.sin(val * 2) * 38;
          actor.angle = Math.cos(val) * 9;
        },
        onComplete: () => {
          actor.setPosition(baseX, baseY);
          actor.setAngle(0);
          Juice.squashAndStretch(this, actor, 0.16, 120);
        }
      });
      return;
    }

    // 5. Page 1 Family Hug (`p1-family.png` 3-frame sheet synced to Wyatt & Emma's `sfx-wyatt-iloveyou.m4a`, 2,368ms):
    // Voice onset is at 10ms ("Love you Nana Papa!") and ends at 2,315ms.
    // Frame 0 -> Frame 1 (110ms) -> Frame 2 (260ms..2420ms, holding the big squished group hug for the entire 2,315ms voice clip!) -> Frame 1 (2420ms) -> Frame 0 (2700ms):
    if (hotspot.id === 'p1-nana-papa-hug') {
      const sprite = entry.spriteActor;
      if (sprite) {
        sprite.stop();
        // 0ms..110ms: Frame 0 -> Frame 1 quick embrace step-in right as "Love..." begins!
        this.tweens.add({
          targets: actor,
          scaleX: 1.04,
          scaleY: 0.96,
          y: baseY + 4,
          duration: 105,
          ease: 'Quad.easeOut'
        });

        this.time.delayedCall(110, () => {
          if (!this.scene.isActive() || !sprite.scene) return;
          sprite.setFrame(1);
          this.tweens.add({
            targets: actor,
            scaleX: 0.97,
            scaleY: 1.04,
            y: baseY - 6,
            duration: 145,
            ease: 'Back.easeOut'
          });
        });

        // Frame 2 at 260ms..2420ms (2,160ms hold): hold the big squished group hug for the full length of "Love you Nana Papa!" (2,315ms)!
        this.time.delayedCall(260, () => {
          if (!this.scene.isActive() || !sprite.scene) return;
          sprite.setFrame(2);
          actor.setPosition(baseX, baseY);
          Juice.squashAndStretch(this, actor, 0.14, 145);

          this.tweens.add({
            targets: actor,
            angle: { from: -3.5, to: 3.5 },
            y: baseY - 4,
            duration: 270,
            yoyo: true,
            repeat: 7,
            ease: 'Sine.easeInOut'
          });

          // Spawn floating 32-bit pixel-art hearts above the hugging family throughout the entire clip!
          for (let i = 0; i < 11; i++) {
            this.time.delayedCall(i * 185, () => {
              if (!this.scene.isActive() || !this.textures.exists('p1-pixel-heart')) return;
              const hx = baseX + 15 + Phaser.Math.Between(-135, 135);
              const hy = baseY - Phaser.Math.Between(95, 165);
              const heart = this.add
                .image(hx, hy, 'p1-pixel-heart')
                .setOrigin(0.5, 0.5)
                .setScale(Phaser.Math.FloatBetween(1.1, 1.55))
                .setDepth(460);
              this.tweens.add({
                targets: heart,
                y: hy - Phaser.Math.Between(65, 105),
                x: hx + Phaser.Math.Between(-24, 24),
                scaleX: heart.scaleX * 1.25,
                scaleY: heart.scaleY * 1.25,
                alpha: 0,
                duration: 820,
                ease: 'Sine.easeOut',
                onComplete: () => heart.destroy()
              });
            });
          }
        });

        // Frame 1 at 2420ms (after the 2,315ms voice clip finishes): step back warmly from the hug
        this.time.delayedCall(2420, () => {
          if (!this.scene.isActive() || !sprite.scene) return;
          this.tweens.killTweensOf(actor);
          actor.setAngle(0);
          actor.setPosition(baseX, baseY);
          sprite.setFrame(1);
          Juice.squashAndStretch(this, actor, 0.1, 130);
        });

        // Frame 0 at 2700ms: return smoothly to idle open-arms pose
        this.time.delayedCall(2700, () => {
          if (!this.scene.isActive() || !sprite.scene) return;
          sprite.setFrame(0);
          actor.setPosition(baseX, baseY);
          actor.setScale(1, 1);
          actor.setAngle(0);
        });
        return;
      }
    }

    // =========================================================================
    // PAGE 2 INTERACTIVE GAGS ("Nana's Cozy House in Zeeland!")
    // =========================================================================

    // 1. Page 2 Porch Wave (`p2-porch` at ~485, 355 + `sfx-porch-wave.mp3`):
    // Nana & Papa wave warmly from the front porch (frames 0 -> 1 -> 2 -> 1 -> 0) with floating pixel hearts!
    if (hotspot.id === 'p2-porch') {
      const sprite = entry.spriteActor;
      if (sprite) {
        sprite.stop();
        const frameTimeline = [
          { ms: 0, frame: 1 },
          { ms: 260, frame: 2 },
          { ms: 540, frame: 1 },
          { ms: 820, frame: 2 },
          { ms: 1120, frame: 1 },
          { ms: 1420, frame: 2 },
          { ms: 1720, frame: 0 }
        ];
        frameTimeline.forEach(({ ms, frame }) => {
          this.time.delayedCall(ms, () => {
            if (!this.scene.isActive() || !sprite.scene) return;
            sprite.setFrame(frame);
          });
        });

        this.tweens.add({
          targets: actor,
          y: baseY - 12,
          scaleX: 1.05,
          scaleY: 1.05,
          angle: { from: -3, to: 3 },
          duration: 240,
          yoyo: true,
          repeat: 3,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            actor.setPosition(baseX, baseY);
            actor.setScale(1, 1);
            actor.setAngle(0);
          }
        });

        for (let i = 0; i < 6; i++) {
          this.time.delayedCall(i * 240, () => {
            if (!this.scene.isActive() || !this.textures.exists('p1-pixel-heart')) return;
            const hx = baseX + Phaser.Math.Between(-45, 45);
            const hy = baseY - Phaser.Math.Between(35, 65);
            const heart = this.add
              .image(hx, hy, 'p1-pixel-heart')
              .setOrigin(0.5, 0.5)
              .setScale(Phaser.Math.FloatBetween(0.95, 1.35))
              .setDepth(460);
            this.tweens.add({
              targets: heart,
              y: hy - Phaser.Math.Between(45, 75),
              x: hx + Phaser.Math.Between(-16, 16),
              alpha: 0,
              duration: 720,
              ease: 'Sine.easeOut',
              onComplete: () => heart.destroy()
            });
          });
        }
        return;
      }
    }

    // 2. Page 2 Kids Driveway Sprint (`p2-kids` at ~280, 445 + `sfx-kids-run.mp3`):
    // Wyatt & Emma sprint up the horseshoe driveway curve toward the porch cycling frames 0 <-> 1,
    // leap and cheer at the top on frame 2, and trot smoothly back!
    if (hotspot.id === 'p2-kids') {
      const sprite = entry.spriteActor;
      if (sprite) {
        sprite.stop();
        // Rapid running stride frames (0 <-> 1) during the driveway dash
        for (let step = 0; step < 6; step++) {
          this.time.delayedCall(step * 145, () => {
            if (!this.scene.isActive() || !sprite.scene) return;
            sprite.setFrame(step % 2 === 0 ? 1 : 0);
          });
        }

        // Dash up the curved driveway toward the front porch
        this.tweens.add({
          targets: actor,
          x: baseX + 95,
          y: baseY - 38,
          scaleX: 0.94,
          scaleY: 0.94,
          angle: { from: -5, to: 5 },
          duration: 870,
          ease: 'Quad.easeOut',
          onComplete: () => {
            if (!this.scene.isActive() || !sprite.scene) return;
            // Frame 2: Cheer & point at Nana's porch!
            sprite.setFrame(2);
            actor.setAngle(0);
            Juice.burstStars(this, actor.x, actor.y - 30, 12, [0xfde047, 0x38bdf8, 0x4ade80]);
            this.tweens.add({
              targets: actor,
              y: actor.y - 24,
              duration: 210,
              yoyo: true,
              ease: 'Quad.easeOut',
              onComplete: () => {
                if (!this.scene.isActive() || !sprite.scene) return;
                sprite.setFrame(1);
                this.tweens.add({
                  targets: actor,
                  x: baseX,
                  y: baseY,
                  scaleX: 1,
                  scaleY: 1,
                  angle: 0,
                  duration: 540,
                  ease: 'Sine.easeInOut',
                  onComplete: () => {
                    if (!this.scene.isActive() || !sprite.scene) return;
                    sprite.setFrame(0);
                    actor.setPosition(baseX, baseY);
                  }
                });
              }
            });
          }
        });
        return;
      }
    }

    // 3. Page 2 Mailbox & Singing Bluebirds (`p2-mailbox` at ~755, 560 + `sfx-mailbox-birds.mp3`):
    // Frame 0 (closed with perched bluebirds) -> Frame 1 (door pops open with letters & singing birds)
    // -> Frame 2 (bluebirds flutter & postcard pops out) -> Frame 0!
    if (hotspot.id === 'p2-mailbox') {
      const sprite = entry.spriteActor;
      if (sprite) {
        sprite.stop();
        Juice.squashAndStretch(this, actor, 0.18, 130);

        const mailboxFrames = [
          { ms: 80, frame: 1 },
          { ms: 420, frame: 2 },
          { ms: 860, frame: 1 },
          { ms: 1220, frame: 2 },
          { ms: 1580, frame: 1 },
          { ms: 1840, frame: 0 }
        ];
        mailboxFrames.forEach(({ ms, frame }) => {
          this.time.delayedCall(ms, () => {
            if (!this.scene.isActive() || !sprite.scene) return;
            sprite.setFrame(frame);
          });
        });

        this.tweens.add({
          targets: actor,
          y: baseY - 16,
          angle: { from: -5, to: 5 },
          duration: 230,
          yoyo: true,
          repeat: 3,
          ease: 'Back.easeOut',
          onComplete: () => {
            actor.setPosition(baseX, baseY);
            actor.setScale(1, 1);
            actor.setAngle(0);
          }
        });
        return;
      }
    }

    // 4. Page 2 Two Tree Squirrels (`p2-squirrel` on oak branch forks at 613, 226 & flipped 787, 181 + simultaneous
    // `sfx-squirrels.mp3` vol 1.0 + `sfx-tree-rustle.mp3` vol 0.7 + spinning pixel acorn toss!):
    if (hotspot.id === 'p2-squirrel') {
      const leftSq = actor.getData('leftSquirrel') as Phaser.GameObjects.Sprite | undefined;
      const rightSq = actor.getData('rightSquirrel') as Phaser.GameObjects.Sprite | undefined;
      const sqScale = (actor.getData('sqBaseScale') as number) ?? 0.048;

      if (leftSq && rightSq) {
        const leftBaseX = 613 - baseX;
        const leftBaseY = 226 - baseY;
        const rightBaseX = 787 - baseX;
        const rightBaseY = 181 - baseY;

        this.tweens.killTweensOf([leftSq, rightSq]);
        leftSq.setPosition(leftBaseX, leftBaseY).setScale(sqScale);
        rightSq.setPosition(rightBaseX, rightBaseY).setScale(sqScale);

        // Chitter & hop sequence for both squirrels
        const sqFrames = [
          { ms: 0, l: 1, r: 0 },
          { ms: 220, l: 2, r: 1 },
          { ms: 480, l: 1, r: 2 },
          { ms: 760, l: 0, r: 1 },
          { ms: 1040, l: 2, r: 2 },
          { ms: 1360, l: 1, r: 1 },
          { ms: 1680, l: 0, r: 0 }
        ];
        sqFrames.forEach(({ ms, l, r }) => {
          this.time.delayedCall(ms, () => {
            if (!this.scene.isActive() || !leftSq.scene || !rightSq.scene) return;
            leftSq.setFrame(l);
            rightSq.setFrame(r);
          });
        });

        this.tweens.add({
          targets: leftSq,
          y: leftBaseY - 16,
          duration: 210,
          yoyo: true,
          repeat: 3,
          ease: 'Quad.easeOut',
          onComplete: () => leftSq.setPosition(leftBaseX, leftBaseY)
        });

        this.tweens.add({
          targets: rightSq,
          y: rightBaseY - 16,
          delay: 140,
          duration: 210,
          yoyo: true,
          repeat: 3,
          ease: 'Quad.easeOut',
          onComplete: () => rightSq.setPosition(rightBaseX, rightBaseY)
        });

        // Toss a spinning pixel acorn in a high parabolic arc between the two oak branch forks (613, 224) <-> (787, 179)!
        if (this.textures.exists('p2-pixel-acorn')) {
          const acorn = this.add
            .image(616, 222, 'p2-pixel-acorn')
            .setOrigin(0.5, 0.5)
            .setScale(1.25)
            .setDepth(465);

          this.tweens.addCounter({
            from: 0,
            to: 1,
            duration: 760,
            onUpdate: (tw) => {
              const t = tw.getValue() ?? 0;
              acorn.x = Phaser.Math.Linear(616, 784, t);
              acorn.y = Phaser.Math.Linear(222, 179, t) - Math.sin(t * Math.PI) * 52;
              acorn.angle = t * 540;
            },
            onComplete: () => {
              if (!this.scene.isActive() || !acorn.scene) return;
              Juice.burstStars(this, 784, 179, 8, [0xfde047, 0xf97316, 0x4ade80]);
              // Toss back from right squirrel to left squirrel!
              this.tweens.addCounter({
                from: 0,
                to: 1,
                duration: 760,
                onUpdate: (tw2) => {
                  const t2 = tw2.getValue() ?? 0;
                  acorn.x = Phaser.Math.Linear(784, 616, t2);
                  acorn.y = Phaser.Math.Linear(179, 222, t2) - Math.sin(t2 * Math.PI) * 48;
                  acorn.angle = -t2 * 540;
                },
                onComplete: () => {
                  acorn.destroy();
                }
              });
            }
          });
        }
        return;
      }
    }

    // 5. Page 2 Sparky Weeping-Bush Peeker (`p2-sparky-bush` behind `p2-weeping-bush-occluder` at 992, 382 + `sfx-sparky-wings.mp3`):
    // Pops up from behind the right weeping-bush occluder (`depth = 20` behind `depth = 30`), flaps wings (0-1-2-1-0),
    // and ducks cleanly back behind the solid weeping shrub occluder with zero leftover pixels!
    if (hotspot.id === 'p2-sparky-bush') {
      const sprite = entry.spriteActor;
      if (sprite) {
        const prevTimers = (actor.getData('gagTimers') as Phaser.Time.TimerEvent[] | undefined) ?? [];
        prevTimers.forEach((t) => t.remove(false));
        const newTimers: Phaser.Time.TimerEvent[] = [];

        sprite.stop();
        sprite.setFrame(0);
        const flapFrames = [
          { ms: 0, frame: 1 },
          { ms: 220, frame: 2 },
          { ms: 460, frame: 1 },
          { ms: 700, frame: 2 },
          { ms: 960, frame: 1 },
          { ms: 1220, frame: 2 },
          { ms: 1480, frame: 1 },
          { ms: 1680, frame: 0 }
        ];
        flapFrames.forEach(({ ms, frame }) => {
          newTimers.push(
            this.time.delayedCall(ms, () => {
              if (!this.scene.isActive() || !sprite.scene) return;
              sprite.setFrame(frame);
            })
          );
        });
        actor.setData('gagTimers', newTimers);

        this.tweens.add({
          targets: actor,
          y: baseY - 18,
          duration: 340,
          yoyo: true,
          hold: 1000,
          ease: 'Back.easeOut',
          onComplete: () => {
            if (!this.scene.isActive() || !sprite.scene) return;
            sprite.setFrame(0);
            actor.setPosition(baseX, baseY);
            actor.setScale(1, 1);
            actor.setAngle(0);
          }
        });

        for (let i = 0; i < 10; i++) {
          this.time.delayedCall(i * 150, () => {
            if (!this.scene.isActive()) return;
            const glint = this.add.star(
              actor.x + Phaser.Math.Between(-24, 24),
              actor.y - 34 + Phaser.Math.Between(-14, 14),
              4,
              3,
              7,
              i % 2 === 0 ? 0xfde047 : 0x10b981,
              0.92
            );
            this.exteriorStageContainer.add(glint);
            this.tweens.add({
              targets: glint,
              y: glint.y - 24,
              alpha: 0,
              angle: 140,
              duration: 460,
              onComplete: () => glint.destroy()
            });
          });
        }
        return;
      }
    }

    // 6. Page 2 Doggie Left-Bush Peeker (`p2-doggie-bush` behind `p2-left-bush-occluder` at 458, 428 + `sfx-doggie-bark.mp3`):
    // Scaled down to 55% (`scale = 0.038`) and tucked behind the solid round green bush occluder (`depth = 20` behind `depth = 30`).
    // Clamps upward pop to 6px so Frame 1 & Frame 2 animate Doggie leaping out of the top of the bush while his flat bottom cut line
    // ALWAYS stays hidden below the solid `y = 388` top edge of `p2-left-bush-occluder.png`!
    if (hotspot.id === 'p2-doggie-bush') {
      const sprite = entry.spriteActor;
      if (sprite) {
        const prevTimers = (actor.getData('gagTimers') as Phaser.Time.TimerEvent[] | undefined) ?? [];
        prevTimers.forEach((t) => t.remove(false));
        const newTimers: Phaser.Time.TimerEvent[] = [];

        sprite.stop();
        sprite.setFrame(0);
        const barkFrames = [
          { ms: 0, frame: 1 },
          { ms: 160, frame: 2 },
          { ms: 460, frame: 1 },
          { ms: 760, frame: 2 },
          { ms: 1120, frame: 1 },
          { ms: 1460, frame: 0 }
        ];
        barkFrames.forEach(({ ms, frame }) => {
          newTimers.push(
            this.time.delayedCall(ms, () => {
              if (!this.scene.isActive() || !sprite.scene) return;
              sprite.setFrame(frame);
            })
          );
        });
        actor.setData('gagTimers', newTimers);

        this.tweens.add({
          targets: actor,
          y: baseY - 6,
          duration: 300,
          yoyo: true,
          hold: 860,
          ease: 'Quad.easeOut',
          onComplete: () => {
            if (!this.scene.isActive() || !sprite.scene) return;
            sprite.setFrame(0);
            actor.setPosition(baseX, baseY);
            actor.setScale(1, 1);
            actor.setAngle(0);
          }
        });
        return;
      }
    }

    // 7. Page 2 Animated Red Maple Tree & Cardinal (`p2-maple-leaves` at 98, 368 + `sfx-maple-leaves.mp3`):
    // Cycles `p2-sprite-maple` Frames 0 -> 1 -> 2 -> 1 -> 0 (wind gust bending crimson branches + red cardinal popping out!)
    // PLUS swirling crimson/gold pixel maple leaves drifting across the yard!
    if (hotspot.id === 'p2-maple-leaves') {
      const sprite = entry.spriteActor;
      if (sprite) {
        sprite.stop();
        const mapleFrames = [
          { ms: 0, frame: 1 },
          { ms: 260, frame: 2 },
          { ms: 680, frame: 1 },
          { ms: 980, frame: 2 },
          { ms: 1420, frame: 1 },
          { ms: 1740, frame: 0 }
        ];
        mapleFrames.forEach(({ ms, frame }) => {
          this.time.delayedCall(ms, () => {
            if (!this.scene.isActive() || !sprite.scene) return;
            sprite.setFrame(frame);
          });
        });

        this.tweens.add({
          targets: actor,
          x: { from: baseX - 3, to: baseX + 5 },
          angle: { from: -2.5, to: 3.5 },
          duration: 180,
          yoyo: true,
          repeat: 4,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            actor.setPosition(baseX, baseY);
            actor.setScale(1, 1);
            actor.setAngle(0);
          }
        });
      } else {
        this.activateCutoutPatchForGag(entry, 1650);
      }

      // Shower 18 tumbling red-and-gold pixel maple leaves across the left yard!
      if (this.textures.exists('p2-pixel-maple-leaf')) {
        for (let i = 0; i < 18; i++) {
          this.time.delayedCall(i * 65, () => {
            if (!this.scene.isActive()) return;
            const startX = baseX + Phaser.Math.Between(-55, 75);
            const startY = baseY + Phaser.Math.Between(-95, 15);
            const leaf = this.add
              .image(startX, startY, 'p2-pixel-maple-leaf')
              .setOrigin(0.5, 0.5)
              .setScale(Phaser.Math.FloatBetween(1.0, 1.55))
              .setDepth(462);
            if (i % 3 === 0) {
              leaf.setTint(0xfbbf24);
            }
            const driftX = startX + Phaser.Math.Between(55, 210);
            const driftY = startY + Phaser.Math.Between(95, 210);
            this.tweens.addCounter({
              from: 0,
              to: 1,
              duration: Phaser.Math.Between(950, 1450),
              onUpdate: (tw) => {
                const t = tw.getValue() ?? 0;
                leaf.x = Phaser.Math.Linear(startX, driftX, t) + Math.sin(t * Math.PI * 3) * 18;
                leaf.y = Phaser.Math.Linear(startY, driftY, t);
                leaf.angle = t * 320;
                if (t > 0.75) {
                  leaf.setAlpha(1 - (t - 0.75) / 0.25);
                }
              },
              onComplete: () => leaf.destroy()
            });
          });
        }
      }
      return;
    }

    // =========================================================================
    // PAGE 3 BESPOKE COUPLED & MULTI-FRAME LIVING BOOKS GAGS (`p3-*`)
    // =========================================================================

    // 1A. Page 3 Coupled Doggie -> Cuckoo Clock Chain Tug (`p3-doggie` at 126, 605 coupled with `p3-clock` at 75, 250):
    // Doggie leaps straight up (`y: 605 -> 335`, Frames 0 -> 1 -> 2) to bite the hanging brass pinecone chain (`x: 75, y: 310`);
    // the instant he grabs it, `p3-clock` switches to Frame 1 and gets yanked downward (`y: 250 -> 288`) with a tug-tug bounce,
    // then springs back up to `y: 250` (`Back.easeOut`, Frame 0) as Doggie lands cleanly back at `(126, 605)` (Frame 0)!
    if (hotspot.id === 'p3-doggie' || hotspot.id === 'p3-doggie-pillow') {
      const dogSprite = entry.spriteActor;
      const clockEntry = this.hotspotEntries.find(
        (e) => e.hotspot.id === 'p3-clock' || e.hotspot.id === 'p3-cuckoo-clock'
      );
      const clockActor = clockEntry?.actor;
      const clockSprite = clockEntry?.spriteActor;
      const clockBaseX = (clockActor?.getData('baseX') as number) ?? 75;
      const clockBaseY = (clockActor?.getData('baseY') as number) ?? 250;

      this.p3ClockDoggieBusy = true;
      this.time.delayedCall(1720, () => {
        this.p3ClockDoggieBusy = false;
      });

      if (!dogSprite) {
        this.activateCutoutPatchForGag(entry, 1560);
      } else {
        dogSprite.stop();
        dogSprite.setFrame(1);
      }
      if (clockEntry && !clockSprite) {
        this.activateCutoutPatchForGag(clockEntry, 1560);
      }

      // Leap straight up toward the hanging brass pinecone chain (`y: 605 -> 335`)
      this.tweens.add({
        targets: actor,
        x: clockBaseX + 12,
        y: 335,
        scaleX: 0.95,
        scaleY: 1.08,
        duration: 310,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (!this.scene.isActive() || !actor.scene) return;
          if (dogSprite) {
            dogSprite.setFrame(2);
          }

          // Yank `p3-clock` downward (`250 -> 288`) on Frame 1 with a playful tug-tug bounce!
          if (clockActor) {
            this.tweens.killTweensOf(clockActor);
            if (clockSprite) {
              clockSprite.setFrame(1);
            }
            Juice.burstStars(this, clockBaseX, clockBaseY + 60, 10, [0xfef08a, 0xfbbf24, 0xffffff]);

            this.tweens.add({
              targets: clockActor,
              y: 288,
              angle: -4,
              duration: 140,
              ease: 'Quad.easeOut',
              onComplete: () => {
                if (!this.scene.isActive() || !clockActor.scene) return;
                // Second playful tug bounce while Doggie hangs on
                this.tweens.add({
                  targets: clockActor,
                  y: { from: 272, to: 290 },
                  angle: { from: 4, to: -4 },
                  duration: 130,
                  yoyo: true,
                  repeat: 1,
                  onComplete: () => {
                    if (!this.scene.isActive() || !clockActor.scene) return;
                    if (clockSprite) {
                      clockSprite.setFrame(0);
                    }
                    this.tweens.add({
                      targets: clockActor,
                      x: clockBaseX,
                      y: clockBaseY,
                      angle: 0,
                      scaleX: 1,
                      scaleY: 1,
                      duration: 420,
                      ease: 'Back.easeOut',
                      onComplete: () => {
                        clockActor.setPosition(clockBaseX, clockBaseY);
                        clockActor.setAngle(0);
                        Juice.squashAndStretch(this, clockActor, 0.14, 120);
                      }
                    });
                  }
                });
              }
            });
          }

          // Tug-tug mid-air bounce for Doggie while holding the chain (310ms..860ms)
          this.tweens.add({
            targets: actor,
            y: 352,
            angle: { from: -5, to: 5 },
            duration: 135,
            yoyo: true,
            repeat: 1,
            onComplete: () => {
              if (!this.scene.isActive() || !actor.scene) return;
              if (dogSprite) {
                dogSprite.setFrame(1);
              }
              // Land smoothly back at `(126, 605)` (Frame 0)
              this.tweens.add({
                targets: actor,
                x: baseX,
                y: baseY,
                scaleX: 1,
                scaleY: 1,
                angle: 0,
                duration: 380,
                ease: 'Bounce.easeOut',
                onComplete: () => {
                  if (!this.scene.isActive() || !actor.scene) return;
                  if (dogSprite) {
                    dogSprite.setFrame(0);
                  }
                  actor.setPosition(baseX, baseY);
                  actor.setScale(1, 1);
                  actor.setAngle(0);
                }
              });
            }
          });
        }
      });
      return;
    }

    // 1B. Page 3 Carved Wooden Cuckoo Clock (`p3-clock` at 75, 250 + `sfx-cuckoo-clock.mp3`):
    // Switches to Frame 2 (wooden bluebird popped out on accordion spring!), rocks playfully with floating
    // musical notes & golden gear sparkles, and ALWAYS resets cleanly to Frame 0 at `(baseX, baseY)`!
    if (hotspot.id === 'p3-clock' || hotspot.id === 'p3-cuckoo-clock') {
      const sprite = entry.spriteActor;
      this.p3ClockDoggieBusy = true;
      this.time.delayedCall(1620, () => {
        this.p3ClockDoggieBusy = false;
      });

      if (sprite) {
        sprite.stop();
        sprite.setFrame(2);
      } else {
        this.activateCutoutPatchForGag(entry, 1500);
      }

      const resetClockToRest = () => {
        if (!this.scene.isActive() || !actor.scene) return;
        if (sprite && sprite.scene) {
          sprite.setFrame(0);
        }
        actor.setPosition(baseX, baseY);
        actor.setScale(1, 1);
        actor.setAngle(0);
      };

      // Pulse #1 ("Cuck-oo!") and Pulse #2 ("Cuck-oo!") — NOTE: never call Juice.squashAndStretch(this, actor)
      // inside delayedCalls while actor has an active angle tween, because squashAndStretch calls killTweensOf(actor)!
      [140, 740].forEach((delayMs) => {
        this.time.delayedCall(delayMs, () => {
          if (!this.scene.isActive() || !actor.scene) return;
          Juice.burstStars(this, baseX + 18, baseY - 35, 8, [0xfbbf24, 0x38bdf8, 0xfef08a]);

          if (this.textures.exists('p3-pixel-note')) {
            for (let n = 0; n < 2; n++) {
              const note = this.add
                .image(
                  baseX + Phaser.Math.Between(-20, 35),
                  baseY - 30 + Phaser.Math.Between(-10, 10),
                  'p3-pixel-note'
                )
                .setOrigin(0.5, 0.5)
                .setScale(1.25)
                .setDepth(465);
              this.tweens.add({
                targets: note,
                x: note.x + Phaser.Math.Between(25, 65),
                y: note.y - Phaser.Math.Between(35, 65),
                angle: Phaser.Math.Between(-20, 25),
                alpha: 0,
                duration: 680,
                ease: 'Sine.easeOut',
                onComplete: () => note.destroy()
              });
            }
          }
        });
      });

      this.tweens.add({
        targets: actor,
        angle: { from: -6, to: 6 },
        scaleX: { from: 1.0, to: 1.05 },
        scaleY: { from: 1.0, to: 1.05 },
        duration: 180,
        yoyo: true,
        repeat: 3,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          resetClockToRest();
        }
      });

      // Bulletproof fallback timer so `p3-clock` can NEVER get stuck on Frame 2!
      this.time.delayedCall(1500, () => {
        resetClockToRest();
      });
      return;
    }

    // 1C. Page 3 Floral Teacup, Chocolate-Chip Cookies & Baby Dragon Sparky (`p3-sparky-cookies` at 1138, 575 + `sfx-tea-cookies.mp3`):
    // Animates Frames 0 -> 1 -> 2 -> 1 -> 0 as Sparky pops up behind the cookie plate to nibble a chocolate-chip cookie
    // while pink heart-shaped steam rises from the floral teacup!
    if (hotspot.id === 'p3-sparky-cookies' || hotspot.id === 'p3-musical-teacup') {
      const sprite = entry.spriteActor;
      if (sprite) {
        sprite.stop();
        const cookieFrames = [
          { ms: 0, frame: 1 },
          { ms: 340, frame: 2 },
          { ms: 920, frame: 1 },
          { ms: 1220, frame: 2 },
          { ms: 1580, frame: 0 }
        ];
        cookieFrames.forEach(({ ms, frame }) => {
          this.time.delayedCall(ms, () => {
            if (!this.scene.isActive() || !sprite.scene) return;
            sprite.setFrame(frame);
          });
        });
      }

      this.tweens.add({
        targets: actor,
        y: baseY - 7,
        angle: { from: -3.5, to: 3.5 },
        duration: 200,
        yoyo: true,
        repeat: 3,
        ease: 'Back.easeOut',
        onComplete: () => {
          if (sprite && sprite.scene) {
            sprite.setFrame(0);
          }
          actor.setPosition(baseX, baseY);
          actor.setScale(1, 1);
          actor.setAngle(0);
        }
      });

      // Rising pink heart steam from the floral teacup + golden dragon cookie crumbs
      for (let i = 0; i < 6; i++) {
        this.time.delayedCall(120 + i * 210, () => {
          if (!this.scene.isActive() || !this.textures.exists('p1-pixel-heart')) return;
          const hx = baseX - 38 + Phaser.Math.Between(-12, 18);
          const hy = baseY - 28;
          const heart = this.add
            .image(hx, hy, 'p1-pixel-heart')
            .setOrigin(0.5, 0.5)
            .setScale(Phaser.Math.FloatBetween(0.85, 1.2))
            .setDepth(465);
          this.tweens.add({
            targets: heart,
            y: hy - Phaser.Math.Between(40, 70),
            x: hx + Math.sin(i) * 14,
            alpha: 0,
            duration: 680,
            ease: 'Sine.easeOut',
            onComplete: () => heart.destroy()
          });
        });
      }
      return;
    }

    // 1D. Page 3 Grammy, Wyatt & Emma 3-Frame Animated Sprite (`p3-grammy-kids` at 560, 495 + `sfx-grammy-giggle.mp3`):
    // Cycles Frame 0 (resting cuddle) -> Frame 1 (big bear hug & Wyatt laughing/kicking legs) -> Frame 2 (Grammy kiss, Wyatt thumbs-up & Emma clapping) -> Frame 1 -> Frame 0!
    if (hotspot.id === 'p3-grammy-kids' || hotspot.id === 'p3-grammy-recliner') {
      const sprite = entry.spriteActor;
      if (sprite) {
        sprite.stop();
        const cuddleFrames = [
          { ms: 0, frame: 1 },
          { ms: 420, frame: 2 },
          { ms: 980, frame: 1 },
          { ms: 1320, frame: 2 },
          { ms: 1720, frame: 0 }
        ];
        cuddleFrames.forEach(({ ms, frame }) => {
          this.time.delayedCall(ms, () => {
            if (!this.scene.isActive() || !sprite.scene) return;
            sprite.setFrame(frame);
          });
        });
      }

      this.tweens.add({
        targets: actor,
        y: baseY - 8,
        angle: { from: -2.0, to: 2.0 },
        duration: 215,
        yoyo: true,
        repeat: 3,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (sprite && sprite.scene) {
            sprite.setFrame(0);
          }
          actor.setPosition(baseX, baseY);
          actor.setScale(1, 1);
          actor.setAngle(0);
        }
      });

      for (let i = 0; i < 9; i++) {
        this.time.delayedCall(i * 165, () => {
          if (!this.scene.isActive() || !this.textures.exists('p1-pixel-heart')) return;
          const hx = baseX + Phaser.Math.Between(-135, 135);
          const hy = baseY - Phaser.Math.Between(65, 145);
          const heart = this.add
            .image(hx, hy, 'p1-pixel-heart')
            .setOrigin(0.5, 0.5)
            .setScale(Phaser.Math.FloatBetween(1.0, 1.48))
            .setDepth(464);
          if (i % 2 === 1) {
            heart.setTint(0xfde047);
          }
          this.tweens.add({
            targets: heart,
            y: hy - Phaser.Math.Between(55, 90),
            x: hx + Math.sin(i) * 18,
            alpha: 0,
            duration: 760,
            ease: 'Sine.easeOut',
            onComplete: () => heart.destroy()
          });
        });
      }
      return;
    }

    // 1E. Page 3 Table Lamp (`p3-lamp` at 1235, 405 + `sfx-lamp-click.mp3`):
    // Pure Phaser `ADD`-blend warm golden light glow cones + pull-chain sparkle burst (ZERO opaque rectangular background crop so nothing ever overlaps Sparky or the cookies!).
    if (hotspot.id === 'p3-lamp') {
      Juice.burstStars(this, 1215, 435, 10, [0xfef08a, 0xfbbf24, 0xffffff]);

      const glowKey = this.textures.exists('cover-candle-glow') ? 'cover-candle-glow' : 'particle-star';
      const upperHalo = this.add
        .image(1215, 365, glowKey)
        .setOrigin(0.5, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xfef08a)
        .setScale(0.2)
        .setAlpha(0)
        .setDepth(455);
      const lowerCone = this.add
        .image(1140, 520, glowKey)
        .setOrigin(0.5, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xfbbf24)
        .setScale(0.3)
        .setAlpha(0)
        .setDepth(454);

      this.tweens.add({
        targets: upperHalo,
        scaleX: 2.8,
        scaleY: 2.4,
        alpha: 0.52,
        duration: 320,
        yoyo: true,
        hold: 640,
        ease: 'Sine.easeInOut',
        onComplete: () => upperHalo.destroy()
      });
      this.tweens.add({
        targets: lowerCone,
        scaleX: 3.6,
        scaleY: 2.8,
        alpha: 0.38,
        duration: 340,
        yoyo: true,
        hold: 640,
        ease: 'Sine.easeInOut',
        onComplete: () => lowerCone.destroy()
      });
      return;
    }

    // 1F. Page 3 Individual Framed Family Portraits (`p3-photo-1`..`p3-photo-4` + `sfx-photo-chime.mp3`):
    // Cycles 0 -> 1 (waving/high-fiving) -> 2 (hugging with hearts/stars) -> 1 -> 0 with a playful frame tilt!
    if (
      hotspot.id === 'p3-photo-1' ||
      hotspot.id === 'p3-photo-2' ||
      hotspot.id === 'p3-photo-3' ||
      hotspot.id === 'p3-photo-4' ||
      hotspot.id === 'p3-photos' ||
      hotspot.id === 'p3-family-photo'
    ) {
      const sprite = entry.spriteActor;
      if (sprite) {
        sprite.stop();
        const photoFrames = [
          { ms: 0, frame: 1 },
          { ms: 380, frame: 2 },
          { ms: 940, frame: 1 },
          { ms: 1260, frame: 2 },
          { ms: 1620, frame: 0 }
        ];
        photoFrames.forEach(({ ms, frame }) => {
          this.time.delayedCall(ms, () => {
            if (!this.scene.isActive() || !sprite.scene) return;
            sprite.setFrame(frame);
          });
        });
      }

      this.tweens.add({
        targets: actor,
        angle: { from: -4.5, to: 4.5 },
        scaleX: 1.06,
        scaleY: 1.06,
        duration: 200,
        yoyo: true,
        repeat: 3,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (sprite && sprite.scene) {
            sprite.setFrame(0);
          }
          actor.setPosition(baseX, baseY);
          actor.setScale(1, 1);
          actor.setAngle(0);
        }
      });

      Juice.burstStars(this, baseX, baseY, 10, [0xfef08a, 0xfbbf24, 0xf472b6, 0xffffff]);
      return;
    }

    // 1G. Page 3 Individual Abstract Wall Paintings (`p3-painting-1` Frog, `p3-painting-2` Dolphin, `p3-painting-3` Flamingo + `sfx-painting-boing.mp3`):
    // Cycles 0 -> 1 -> 2 -> 1 -> 0 as the abstract paint morphs into a hopping frog, leaping dolphin, or dancing flamingo before returning to Frame 0!
    if (
      hotspot.id === 'p3-painting-1' ||
      hotspot.id === 'p3-painting-2' ||
      hotspot.id === 'p3-painting-3' ||
      hotspot.id === 'p3-paintings'
    ) {
      const sprite = entry.spriteActor;
      if (sprite) {
        sprite.stop();
        const paintingFrames = [
          { ms: 0, frame: 1 },
          { ms: 340, frame: 2 },
          { ms: 880, frame: 1 },
          { ms: 1200, frame: 2 },
          { ms: 1580, frame: 0 }
        ];
        paintingFrames.forEach(({ ms, frame }) => {
          this.time.delayedCall(ms, () => {
            if (!this.scene.isActive() || !sprite.scene) return;
            sprite.setFrame(frame);
          });
        });
      }

      this.tweens.add({
        targets: actor,
        y: baseY - 12,
        angle: { from: -5, to: 5 },
        scaleX: 1.06,
        scaleY: 1.06,
        duration: 195,
        yoyo: true,
        repeat: 3,
        ease: 'Back.easeOut',
        onComplete: () => {
          if (sprite && sprite.scene) {
            sprite.setFrame(0);
          }
          actor.setPosition(baseX, baseY);
          actor.setScale(1, 1);
          actor.setAngle(0);
        }
      });

      const splashColors =
        hotspot.id === 'p3-painting-1'
          ? [0x22c55e, 0x86efac, 0xfde047]
          : hotspot.id === 'p3-painting-2'
            ? [0x06b6d4, 0x38bdf8, 0xffffff]
            : [0xe11d48, 0xf43f5e, 0xfde047];
      Juice.burstStars(this, baseX, baseY, 12, splashColors);
      return;
    }

    // 2. Page 3 Papa & Wyatt's Toy Train (`p3-papa-wyatt` at 455, 565 + `sfx-toy-train.mp3`):
    // Cycles 0 -> 1 -> 2 -> 1 -> 0 while spawning rising white pixel steam puffs along the oval track!
    if (hotspot.id === 'p3-papa-wyatt') {
      const sprite = entry.spriteActor;
      if (sprite) {
        sprite.stop();
        const trainFrames = [
          { ms: 0, frame: 1 },
          { ms: 380, frame: 2 },
          { ms: 840, frame: 1 },
          { ms: 1260, frame: 2 },
          { ms: 1680, frame: 0 }
        ];
        trainFrames.forEach(({ ms, frame }) => {
          this.time.delayedCall(ms, () => {
            if (!this.scene.isActive() || !sprite.scene) return;
            sprite.setFrame(frame);
          });
        });

        this.tweens.add({
          targets: actor,
          y: baseY - 10,
          duration: 210,
          yoyo: true,
          repeat: 3,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            actor.setPosition(baseX, baseY);
            actor.setScale(1, 1);
            actor.setAngle(0);
          }
        });

        // Spawn rising white pixel steam puffs chugging around the track loop
        if (this.textures.exists('p1-pixel-smoke-puff')) {
          for (let i = 0; i < 8; i++) {
            this.time.delayedCall(i * 195, () => {
              if (!this.scene.isActive()) return;
              const angleRad = (i / 8) * Math.PI * 2;
              const puffX = baseX + Math.cos(angleRad) * 52;
              const puffY = baseY + 28 + Math.sin(angleRad) * 16;
              const puff = this.add
                .image(puffX, puffY, 'p1-pixel-smoke-puff')
                .setOrigin(0.5, 0.5)
                .setScale(0.75)
                .setAlpha(0.9)
                .setDepth(462);
              this.tweens.add({
                targets: puff,
                y: puffY - Phaser.Math.Between(38, 64),
                x: puffX + Phaser.Math.Between(-14, 14),
                scaleX: 1.65,
                scaleY: 1.65,
                alpha: 0,
                duration: 620,
                ease: 'Quad.easeOut',
                onComplete: () => puff.destroy()
              });
            });
          }
        }
        return;
      }
    }

    // 3. Page 3 Nana & Emma Baking (`p3-nana-emma` at 765, 430 + `sfx-baking-giggle.mp3`):
    // Animates 0 -> 1 -> 2 -> 0 while drifting warm golden/rose pixel hearts & sweet aroma swirls upward!
    if (hotspot.id === 'p3-nana-emma') {
      const sprite = entry.spriteActor;
      if (sprite) {
        sprite.stop();
        const bakeFrames = [
          { ms: 0, frame: 1 },
          { ms: 420, frame: 2 },
          { ms: 1080, frame: 1 },
          { ms: 1520, frame: 0 }
        ];
        bakeFrames.forEach(({ ms, frame }) => {
          this.time.delayedCall(ms, () => {
            if (!this.scene.isActive() || !sprite.scene) return;
            sprite.setFrame(frame);
          });
        });

        this.tweens.add({
          targets: actor,
          y: baseY - 12,
          scaleX: 1.04,
          scaleY: 1.04,
          duration: 240,
          yoyo: true,
          repeat: 2,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            actor.setPosition(baseX, baseY);
            actor.setScale(1, 1);
            actor.setAngle(0);
          }
        });

        for (let i = 0; i < 7; i++) {
          this.time.delayedCall(i * 185, () => {
            if (!this.scene.isActive() || !this.textures.exists('p1-pixel-heart')) return;
            const hx = baseX + Phaser.Math.Between(-50, 50);
            const hy = baseY - Phaser.Math.Between(20, 55);
            const heart = this.add
              .image(hx, hy, 'p1-pixel-heart')
              .setOrigin(0.5, 0.5)
              .setScale(Phaser.Math.FloatBetween(0.95, 1.35))
              .setDepth(464);
            if (i % 2 === 1) {
              heart.setTint(0xfde047);
            }
            this.tweens.add({
              targets: heart,
              y: hy - Phaser.Math.Between(48, 78),
              x: hx + Math.sin(i) * 18,
              alpha: 0,
              duration: 740,
              ease: 'Sine.easeOut',
              onComplete: () => heart.destroy()
            });
          });
        }
        return;
      }
    }

    // 4. Page 3 Sunny Windowsill Tulips (`p3-tulips` at 825, 230 + `sfx-tulip-bee.mp3`):
    // Animates 0 -> 1 -> 2 -> 1 -> 0 plus a tiny golden pixel bee particle zipping a figure-8 arc above the pot!
    if (hotspot.id === 'p3-tulips') {
      const sprite = entry.spriteActor;
      if (sprite) {
        sprite.stop();
        const tulipFrames = [
          { ms: 0, frame: 1 },
          { ms: 340, frame: 2 },
          { ms: 760, frame: 1 },
          { ms: 1140, frame: 2 },
          { ms: 1520, frame: 0 }
        ];
        tulipFrames.forEach(({ ms, frame }) => {
          this.time.delayedCall(ms, () => {
            if (!this.scene.isActive() || !sprite.scene) return;
            sprite.setFrame(frame);
          });
        });

        this.tweens.add({
          targets: actor,
          angle: { from: -5, to: 5 },
          duration: 210,
          yoyo: true,
          repeat: 3,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            actor.setPosition(baseX, baseY);
            actor.setScale(1, 1);
            actor.setAngle(0);
          }
        });

        if (this.textures.exists('p3-pixel-bee')) {
          const bee = this.add
            .image(baseX, baseY - 38, 'p3-pixel-bee')
            .setOrigin(0.5, 0.5)
            .setScale(1.35)
            .setDepth(466);

          this.tweens.addCounter({
            from: 0,
            to: Math.PI * 2,
            duration: 1480,
            onUpdate: (tw) => {
              const t = tw.getValue() ?? 0;
              const nextX = baseX + Math.sin(t) * 56;
              const nextY = baseY - 46 + Math.sin(t * 2) * 22;
              bee.setFlipX(Math.cos(t) < 0);
              bee.setPosition(nextX, nextY);
            },
            onComplete: () => bee.destroy()
          });
        }
        return;
      }
    }

    // 5. Page 3 Whistling Stovetop Kettle (`p3-kettle` at 1055, 365 + `sfx-kettle-whistle.mp3`):
    // Rapid rattle shake + 0 -> 1 -> 2 -> 1 -> 0 with rising pixel steam rings!
    if (hotspot.id === 'p3-kettle') {
      const sprite = entry.spriteActor;
      if (sprite) {
        sprite.stop();
        const kettleFrames = [
          { ms: 0, frame: 1 },
          { ms: 320, frame: 2 },
          { ms: 780, frame: 1 },
          { ms: 1080, frame: 2 },
          { ms: 1580, frame: 0 }
        ];
        kettleFrames.forEach(({ ms, frame }) => {
          this.time.delayedCall(ms, () => {
            if (!this.scene.isActive() || !sprite.scene) return;
            sprite.setFrame(frame);
          });
        });

        this.tweens.add({
          targets: actor,
          x: { from: baseX - 3.5, to: baseX + 3.5 },
          y: baseY - 8,
          angle: { from: -6, to: 6 },
          duration: 85,
          yoyo: true,
          repeat: 8,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            actor.setPosition(baseX, baseY);
            actor.setScale(1, 1);
            actor.setAngle(0);
          }
        });

        if (this.textures.exists('p1-pixel-smoke-puff')) {
          for (let i = 0; i < 7; i++) {
            this.time.delayedCall(260 + i * 175, () => {
              if (!this.scene.isActive()) return;
              const ring = this.add
                .image(baseX + Phaser.Math.Between(-12, 16), baseY - 38, 'p1-pixel-smoke-puff')
                .setOrigin(0.5, 0.5)
                .setScale(0.85)
                .setAlpha(0.92)
                .setDepth(464);
              this.tweens.add({
                targets: ring,
                y: baseY - 115 - i * 8,
                x: ring.x + Phaser.Math.Between(-18, 18),
                scaleX: 1.9,
                scaleY: 1.9,
                alpha: 0,
                duration: 640,
                ease: 'Sine.easeOut',
                onComplete: () => ring.destroy()
              });
            });
          }
        }
        return;
      }
    }

    // 6. Page 3 Sparky's Cookie Jar (`p3-sparky-jar` at 1155, 385 + `sfx-cookie-dragon.mp3`):
    // Wobble jar + 0 -> 1 -> 2 -> 1 -> 0 with flying cookie crumbs & golden dragon sparkles!
    if (hotspot.id === 'p3-sparky-jar') {
      const sprite = entry.spriteActor;
      if (sprite) {
        sprite.stop();
        const jarFrames = [
          { ms: 0, frame: 1 },
          { ms: 340, frame: 2 },
          { ms: 920, frame: 1 },
          { ms: 1220, frame: 2 },
          { ms: 1580, frame: 0 }
        ];
        jarFrames.forEach(({ ms, frame }) => {
          this.time.delayedCall(ms, () => {
            if (!this.scene.isActive() || !sprite.scene) return;
            sprite.setFrame(frame);
          });
        });

        this.tweens.add({
          targets: actor,
          y: baseY - 14,
          angle: { from: -6, to: 6 },
          duration: 190,
          yoyo: true,
          repeat: 3,
          ease: 'Back.easeOut',
          onComplete: () => {
            actor.setPosition(baseX, baseY);
            actor.setScale(1, 1);
            actor.setAngle(0);
          }
        });

        // Cookie crumbs & emerald/gold dragon sparkles
        for (let i = 0; i < 12; i++) {
          this.time.delayedCall(220 + i * 95, () => {
            if (!this.scene.isActive()) return;
            const isCrumb = i % 2 === 0;
            const particle = this.add.circle(
              baseX + Phaser.Math.Between(-26, 26),
              baseY - 28 + Phaser.Math.Between(-12, 12),
              isCrumb ? 3.5 : 4.5,
              isCrumb ? 0xd97706 : i % 4 === 1 ? 0x10b981 : 0xfde047,
              0.95
            );
            particle.setDepth(465);
            this.tweens.add({
              targets: particle,
              x: particle.x + Phaser.Math.Between(-38, 38),
              y: particle.y + (isCrumb ? Phaser.Math.Between(18, 44) : Phaser.Math.Between(-36, -16)),
              alpha: 0,
              duration: 520,
              ease: 'Quad.easeOut',
              onComplete: () => particle.destroy()
            });
          });
        }
        return;
      }
    }

    // ============================================================================
    // PAGE 4 ("Nana's Convertible in the Garage!") — 9 BESPOKE LIVING BOOKS GAGS
    // ============================================================================

    // 1. `p4-car-doggie` (Cockpit at depth 15, tucked behind `p4-car-occluder` at depth 20):
    // Cycles 0 -> 1 -> 2 -> 1 -> 0, bounces the convertible slightly, flashes two warm ADD-blend
    // headlight beams from the front right bumper, and floats musical horn notes upward!
    if (hotspot.id === 'p4-car-doggie') {
      const sprite = entry.spriteActor;
      if (sprite) {
        if (sprite.getData('gagBusy')) return;
        sprite.setData('gagBusy', true);
        sprite.stop();
        const carOcc = this.stageContainer.getByName('p4-car-occluder-img') as Phaser.GameObjects.Image | null;
        const resetCar = () => {
          if (!this.scene.isActive() || !sprite.scene) return;
          sprite.setFrame(0);
          sprite.setAngle(0);
          sprite.setData('gagBusy', false);
          actor.setPosition(baseX, baseY);
          actor.setScale(1, 1);
          actor.setAngle(0);
          if (carOcc && carOcc.scene) {
            carOcc.setPosition(45, 370);
          }
        };

        const frames = [
          { ms: 0, frame: 1 },
          { ms: 380, frame: 2 },
          { ms: 840, frame: 1 },
          { ms: 1240, frame: 2 },
          { ms: 1620, frame: 0 }
        ];
        frames.forEach(({ ms, frame }) => {
          this.time.delayedCall(ms, () => {
            if (!this.scene.isActive() || !sprite.scene) return;
            sprite.setFrame(frame);
          });
        });

        this.tweens.add({
          targets: actor,
          y: baseY - 4,
          duration: 135,
          yoyo: true,
          repeat: 5,
          ease: 'Sine.easeInOut',
          onComplete: resetCar
        });

        if (carOcc) {
          this.tweens.add({
            targets: carOcc,
            y: 367,
            duration: 135,
            yoyo: true,
            repeat: 5,
            ease: 'Sine.easeInOut'
          });
        }
        this.time.delayedCall(1720, resetCar);

        // Two warm ADD-blend headlight beams flashing from the right front bumper/fender
        const beamAnchors = [
          { x: 612, y: 468 },
          { x: 655, y: 458 }
        ];
        const glowKey = this.textures.exists('cover-candle-glow') ? 'cover-candle-glow' : 'particle-star';
        beamAnchors.forEach((pt, idx) => {
          const beam = this.add
            .image(pt.x, pt.y, glowKey)
            .setOrigin(0.2, 0.5)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setTint(0xfef08a)
            .setScale(0.2, 0.12)
            .setAlpha(0)
            .setDepth(460);
          this.tweens.add({
            targets: beam,
            scaleX: 2.2,
            scaleY: 0.95,
            alpha: 0.78,
            delay: idx * 70,
            duration: 210,
            yoyo: true,
            repeat: 2,
            ease: 'Quad.easeOut',
            onComplete: () => beam.destroy()
          });
        });

        // Floating musical horn notes
        if (this.textures.exists('p3-pixel-note')) {
          const noteTints = [0xfacc15, 0x38bdf8, 0xf472b6, 0x34d399];
          for (let i = 0; i < 6; i++) {
            this.time.delayedCall(90 + i * 210, () => {
              if (!this.scene.isActive()) return;
              const note = this.add
                .image(baseX + Phaser.Math.Between(-55, 45), baseY - 120, 'p3-pixel-note')
                .setOrigin(0.5, 0.5)
                .setTint(noteTints[i % noteTints.length])
                .setScale(1.1)
                .setDepth(466);
              this.tweens.add({
                targets: note,
                x: note.x + Phaser.Math.Between(-28, 36),
                y: note.y - Phaser.Math.Between(55, 95),
                angle: Phaser.Math.Between(-18, 18),
                alpha: 0,
                duration: 680,
                ease: 'Sine.easeOut',
                onComplete: () => note.destroy()
              });
            });
          }
        }
        return;
      }
    }

    // 2. `p4-cardboard-box` (Brown cardboard box & mechanic mouse on the left folding table at depth 12):
    // Cycles 0 -> 1 -> 2 -> 1 -> 0 with a playful rattle shake and golden sparkles!
    if (hotspot.id === 'p4-cardboard-box') {
      const sprite = entry.spriteActor;
      if (sprite) {
        if (sprite.getData('gagBusy')) return;
        sprite.setData('gagBusy', true);
        sprite.stop();
        const resetBox = () => {
          if (!this.scene.isActive() || !sprite.scene) return;
          sprite.setFrame(0);
          sprite.setAngle(0);
          sprite.setData('gagBusy', false);
          actor.setPosition(baseX, baseY);
          actor.setScale(1, 1);
          actor.setAngle(0);
        };

        const frames = [
          { ms: 0, frame: 1 },
          { ms: 380, frame: 2 },
          { ms: 880, frame: 1 },
          { ms: 1220, frame: 2 },
          { ms: 1620, frame: 0 }
        ];
        frames.forEach(({ ms, frame }) => {
          this.time.delayedCall(ms, () => {
            if (!this.scene.isActive() || !sprite.scene) return;
            sprite.setFrame(frame);
          });
        });

        this.tweens.add({
          targets: actor,
          x: { from: baseX - 2, to: baseX + 2 },
          duration: 85,
          yoyo: true,
          repeat: 8,
          ease: 'Sine.easeInOut',
          onComplete: resetBox
        });
        this.time.delayedCall(1700, resetBox);

        Juice.burstStars(this, baseX, baseY - 15, 12, [0xfef08a, 0x34d399, 0xfbbf24]);
        return;
      }
    }

    // 3. `p4-leaf-blower` (Bottom-right floor at depth 25 — COUPLED GAG!):
    // Vibrates and cycles 0 -> 1 -> 2 -> 1 -> 0, shoots a stream of tumbling pixel autumn leaves
    // across the garage floor toward the car, AND simultaneously triggers a wind-wiggle on `p4-car-doggie` and `p4-wreath`!
    if (hotspot.id === 'p4-leaf-blower') {
      const sprite = entry.spriteActor;
      if (sprite) {
        if (sprite.getData('gagBusy')) return;
        sprite.setData('gagBusy', true);
        sprite.stop();
        const resetBlower = () => {
          if (!this.scene.isActive() || !sprite.scene) return;
          sprite.setFrame(0);
          sprite.setAngle(0);
          sprite.setData('gagBusy', false);
          actor.setPosition(baseX, baseY);
          actor.setScale(1, 1);
          actor.setAngle(0);
        };

        const frames = [
          { ms: 0, frame: 1 },
          { ms: 320, frame: 2 },
          { ms: 820, frame: 1 },
          { ms: 1180, frame: 2 },
          { ms: 1680, frame: 0 }
        ];
        frames.forEach(({ ms, frame }) => {
          this.time.delayedCall(ms, () => {
            if (!this.scene.isActive() || !sprite.scene) return;
            sprite.setFrame(frame);
          });
        });

        this.tweens.add({
          targets: actor,
          x: { from: baseX - 3, to: baseX + 3 },
          y: { from: baseY - 2, to: baseY + 2 },
          duration: 65,
          yoyo: true,
          repeat: 11,
          ease: 'Sine.easeInOut',
          onComplete: resetBlower
        });
        this.time.delayedCall(1760, resetBlower);

        // Stream of tumbling pixel autumn leaves across the garage floor toward the convertible
        const leafTex = this.textures.exists('p2-pixel-maple-leaf') ? 'p2-pixel-maple-leaf' : 'particle-star';
        const leafColors = [0xef4444, 0xf97316, 0xfacc15, 0xd97706];
        for (let i = 0; i < 14; i++) {
          this.time.delayedCall(120 + i * 85, () => {
            if (!this.scene.isActive()) return;
            const startX = 835 + Phaser.Math.Between(-15, 25);
            const startY = 595 + Phaser.Math.Between(-18, 18);
            const leaf = this.add
              .image(startX, startY, leafTex)
              .setOrigin(0.5, 0.5)
              .setTint(leafColors[i % leafColors.length])
              .setScale(Phaser.Math.FloatBetween(0.95, 1.45))
              .setDepth(464);
            this.tweens.add({
              targets: leaf,
              x: startX - Phaser.Math.Between(240, 480),
              y: startY - Phaser.Math.Between(35, 165),
              angle: Phaser.Math.Between(-260, 260),
              alpha: { from: 1, to: 0 },
              duration: Phaser.Math.Between(680, 980),
              ease: 'Cubic.easeOut',
              onComplete: () => leaf.destroy()
            });
          });
        }

        // Coupled wind-wiggle on `p4-car-doggie` (Doggie's ears!) and `p4-wreath`!
        const carDoggieEntry = this.hotspotEntries.find((e) => e.hotspot.id === 'p4-car-doggie');
        if (carDoggieEntry?.spriteActor && !carDoggieEntry.spriteActor.getData('gagBusy')) {
          const cdSprite = carDoggieEntry.spriteActor;
          const cdActor = carDoggieEntry.actor;
          const cdBaseX = carDoggieEntry.hotspot.x;
          const cdBaseY = carDoggieEntry.hotspot.y;
          cdSprite.setFrame(1);
          this.tweens.add({
            targets: cdActor,
            angle: { from: -2.5, to: 2.5 },
            delay: 240,
            duration: 110,
            yoyo: true,
            repeat: 3,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              cdSprite.setFrame(0);
              cdSprite.setAngle(0);
              cdActor.setPosition(cdBaseX, cdBaseY);
              cdActor.setAngle(0);
            }
          });
        }

        const wreathEntry = this.hotspotEntries.find((e) => e.hotspot.id === 'p4-wreath');
        if (wreathEntry?.spriteActor && !wreathEntry.spriteActor.getData('gagBusy')) {
          const wrSprite = wreathEntry.spriteActor;
          const wrActor = wreathEntry.actor;
          const wrBaseX = wreathEntry.hotspot.x;
          const wrBaseY = wreathEntry.hotspot.y;
          wrSprite.setFrame(1);
          this.tweens.add({
            targets: wrActor,
            angle: { from: -6, to: 6 },
            delay: 300,
            duration: 120,
            yoyo: true,
            repeat: 3,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              wrSprite.setFrame(0);
              wrSprite.setAngle(0);
              wrActor.setPosition(wrBaseX, wrBaseY);
              wrActor.setAngle(0);
            }
          });
        }
        return;
      }
    }

    // 4. `p4-sparky-cabinet` (Tiny Mechanic Sparky peeking from behind the tall right cream cabinet at depth 11):
    // Pops out to the left, animates 0 -> 1 -> 2 -> 1 -> 0 with golden dragon sparkles, and tucks back!
    if (hotspot.id === 'p4-sparky-cabinet') {
      const sprite = entry.spriteActor;
      if (sprite) {
        if (sprite.getData('gagBusy')) return;
        sprite.setData('gagBusy', true);
        sprite.stop();
        const resetCabinet = () => {
          if (!this.scene.isActive() || !sprite.scene) return;
          sprite.setFrame(0);
          sprite.setAngle(0);
          sprite.setData('gagBusy', false);
          actor.setPosition(baseX, baseY);
          actor.setScale(1, 1);
          actor.setAngle(0);
        };

        const frames = [
          { ms: 0, frame: 1 },
          { ms: 380, frame: 2 },
          { ms: 1050, frame: 1 },
          { ms: 1450, frame: 0 }
        ];
        frames.forEach(({ ms, frame }) => {
          this.time.delayedCall(ms, () => {
            if (!this.scene.isActive() || !sprite.scene) return;
            sprite.setFrame(frame);
          });
        });

        this.tweens.add({
          targets: actor,
          x: baseX - 18,
          y: baseY - 10,
          duration: 280,
          yoyo: true,
          hold: 860,
          ease: 'Back.easeOut',
          onComplete: resetCabinet
        });
        this.time.delayedCall(1550, resetCabinet);

        Juice.burstStars(this, baseX - 15, baseY - 45, 14, [0x10b981, 0xfacc15, 0xfef08a]);
        return;
      }
    }

    // 5. `p4-wall-oven` (White wall oven & juggling paper towel rolls on the left wooden shelf at depth 10):
    if (hotspot.id === 'p4-wall-oven') {
      const sprite = entry.spriteActor;
      if (sprite) {
        if (sprite.getData('gagBusy')) return;
        sprite.setData('gagBusy', true);
        sprite.stop();
        const resetOven = () => {
          if (!this.scene.isActive() || !sprite.scene) return;
          sprite.setFrame(0);
          sprite.setAngle(0);
          sprite.setData('gagBusy', false);
          actor.setPosition(baseX, baseY);
          actor.setScale(1, 1);
          actor.setAngle(0);
        };

        const frames = [
          { ms: 0, frame: 1 },
          { ms: 380, frame: 2 },
          { ms: 840, frame: 1 },
          { ms: 1200, frame: 2 },
          { ms: 1580, frame: 0 }
        ];
        frames.forEach(({ ms, frame }) => {
          this.time.delayedCall(ms, () => {
            if (!this.scene.isActive() || !sprite.scene) return;
            sprite.setFrame(frame);
          });
        });

        this.tweens.add({
          targets: actor,
          y: baseY - 4,
          duration: 190,
          yoyo: true,
          repeat: 3,
          ease: 'Sine.easeInOut',
          onComplete: resetOven
        });
        this.time.delayedCall(1650, resetOven);

        // Warm ADD-blend golden glow inside the wall oven window (x: 221, y: 292)
        const glowKey = this.textures.exists('cover-candle-glow') ? 'cover-candle-glow' : 'particle-star';
        const ovenGlow = this.add
          .image(221, 292, glowKey)
          .setOrigin(0.5, 0.5)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setTint(0xfde047)
          .setScale(0.55, 0.38)
          .setAlpha(0)
          .setDepth(458);
        this.tweens.add({
          targets: ovenGlow,
          alpha: 0.72,
          scaleX: 0.72,
          scaleY: 0.48,
          duration: 280,
          yoyo: true,
          hold: 920,
          ease: 'Sine.easeInOut',
          onComplete: () => ovenGlow.destroy()
        });

        Juice.burstStars(this, baseX - 5, baseY - 65, 12, [0xfef08a, 0xfbbf24, 0xffffff]);
        return;
      }
    }

    // 6. `p4-compressor` (Black upright wheeled air compressor at depth 18):
    // Shakes with a chug tween, cycles 0 -> 1 -> 2 -> 0, and puffs rising pixel steam rings!
    if (hotspot.id === 'p4-compressor') {
      const sprite = entry.spriteActor;
      if (sprite) {
        if (sprite.getData('gagBusy')) return;
        sprite.setData('gagBusy', true);
        sprite.stop();
        const resetCompressor = () => {
          if (!this.scene.isActive() || !sprite.scene) return;
          sprite.setFrame(0);
          sprite.setAngle(0);
          sprite.setData('gagBusy', false);
          actor.setPosition(baseX, baseY);
          actor.setScale(1, 1);
          actor.setAngle(0);
        };

        const frames = [
          { ms: 0, frame: 1 },
          { ms: 460, frame: 2 },
          { ms: 1050, frame: 1 },
          { ms: 1320, frame: 2 },
          { ms: 1620, frame: 0 }
        ];
        frames.forEach(({ ms, frame }) => {
          this.time.delayedCall(ms, () => {
            if (!this.scene.isActive() || !sprite.scene) return;
            sprite.setFrame(frame);
          });
        });

        this.tweens.add({
          targets: actor,
          x: { from: baseX - 3, to: baseX + 3 },
          y: { from: baseY - 2, to: baseY + 2 },
          angle: { from: -2.5, to: 2.5 },
          duration: 75,
          yoyo: true,
          repeat: 9,
          ease: 'Sine.easeInOut',
          onComplete: resetCompressor
        });
        this.time.delayedCall(1700, resetCompressor);

        if (this.textures.exists('p1-pixel-smoke-puff')) {
          for (let i = 0; i < 7; i++) {
            this.time.delayedCall(120 + i * 165, () => {
              if (!this.scene.isActive()) return;
              const ring = this.add
                .image(baseX + 12 + Phaser.Math.Between(-12, 12), baseY - 78, 'p1-pixel-smoke-puff')
                .setOrigin(0.5, 0.5)
                .setScale(0.85)
                .setAlpha(0.92)
                .setDepth(465);
              this.tweens.add({
                targets: ring,
                y: baseY - 155 - i * 10,
                x: ring.x + Phaser.Math.Between(-18, 18),
                scaleX: 1.9,
                scaleY: 1.9,
                alpha: 0,
                duration: 620,
                ease: 'Sine.easeOut',
                onComplete: () => ring.destroy()
              });
            });
          }
        }
        Juice.burstStars(this, baseX + 12, baseY - 60, 10, [0xffffff, 0x38bdf8, 0xef4444]);
        return;
      }
    }

    // 7. `p4-wreath` (Back wood wall at depth 8):
    // Cycles 0 -> 1 -> 2 -> 1 -> 0 with fluttering flower petals & musical notes!
    if (hotspot.id === 'p4-wreath') {
      const sprite = entry.spriteActor;
      if (sprite) {
        if (sprite.getData('gagBusy')) return;
        sprite.setData('gagBusy', true);
        sprite.stop();
        const resetWreath = () => {
          if (!this.scene.isActive() || !sprite.scene) return;
          sprite.setFrame(0);
          sprite.setAngle(0);
          sprite.setData('gagBusy', false);
          actor.setPosition(baseX, baseY);
          actor.setScale(1, 1);
          actor.setAngle(0);
        };

        const frames = [
          { ms: 0, frame: 1 },
          { ms: 340, frame: 2 },
          { ms: 780, frame: 1 },
          { ms: 1120, frame: 2 },
          { ms: 1520, frame: 0 }
        ];
        frames.forEach(({ ms, frame }) => {
          this.time.delayedCall(ms, () => {
            if (!this.scene.isActive() || !sprite.scene) return;
            sprite.setFrame(frame);
          });
        });

        this.tweens.add({
          targets: actor,
          angle: { from: -6, to: 6 },
          duration: 180,
          yoyo: true,
          repeat: 3,
          ease: 'Sine.easeInOut',
          onComplete: resetWreath
        });
        this.time.delayedCall(1600, resetWreath);

        Juice.burstStars(this, baseX, baseY, 10, [0xf472b6, 0x38bdf8, 0xfacc15]);
        return;
      }
    }

    // 8. `p4-hutch-items` (Two rows of bottles, cans, toolbox & bucket inside the angled cream hutch at depth 10):
    // Cycles 0 -> 1 -> 2 -> 1 -> 0 with floating musical xylophone notes & colorful sparkles!
    if (hotspot.id === 'p4-hutch-items') {
      const sprite = entry.spriteActor;
      if (sprite) {
        if (sprite.getData('gagBusy')) return;
        sprite.setData('gagBusy', true);
        sprite.stop();
        const resetHutch = () => {
          if (!this.scene.isActive() || !sprite.scene) return;
          sprite.setFrame(0);
          sprite.setAngle(0);
          sprite.setData('gagBusy', false);
          actor.setPosition(baseX, baseY);
          actor.setScale(1, 1);
          actor.setAngle(0);
        };

        const frames = [
          { ms: 0, frame: 1 },
          { ms: 360, frame: 2 },
          { ms: 780, frame: 1 },
          { ms: 1140, frame: 2 },
          { ms: 1540, frame: 0 }
        ];
        frames.forEach(({ ms, frame }) => {
          this.time.delayedCall(ms, () => {
            if (!this.scene.isActive() || !sprite.scene) return;
            sprite.setFrame(frame);
          });
        });

        this.tweens.add({
          targets: actor,
          y: baseY - 3,
          duration: 175,
          yoyo: true,
          repeat: 3,
          ease: 'Sine.easeInOut',
          onComplete: resetHutch
        });
        this.time.delayedCall(1620, resetHutch);

        const tints = [0x38bdf8, 0xef4444, 0xfacc15, 0x22c55e, 0xf472b6];
        if (this.textures.exists('p3-pixel-note')) {
          for (let i = 0; i < 8; i++) {
            this.time.delayedCall(60 + i * 160, () => {
              if (!this.scene.isActive()) return;
              const note = this.add
                .image(baseX + Phaser.Math.Between(-55, 65), baseY + Phaser.Math.Between(-45, 25), 'p3-pixel-note')
                .setOrigin(0.5, 0.5)
                .setTint(tints[i % tints.length])
                .setScale(1.15)
                .setDepth(465);
              this.tweens.add({
                targets: note,
                y: note.y - Phaser.Math.Between(50, 85),
                x: note.x + Phaser.Math.Between(-24, 24),
                angle: Phaser.Math.Between(-20, 20),
                alpha: 0,
                duration: 640,
                ease: 'Sine.easeOut',
                onComplete: () => note.destroy()
              });
            });
          }
        }
        Juice.burstStars(this, baseX - 20, baseY - 20, 10, tints);
        Juice.burstStars(this, baseX + 30, baseY + 15, 10, tints);
        return;
      }
    }

    // 9. `p4-garage-opener` (Overhead ceiling motor box around x: 415, y: 105):
    // Pulses a warm overhead ADD-blend work-light cone illuminating Nana's MGB convertible!
    if (hotspot.id === 'p4-garage-opener') {
      if (actor.getData('gagBusy')) return;
      actor.setData('gagBusy', true);
      this.time.delayedCall(1450, () => {
        if (this.scene.isActive() && actor.scene) {
          actor.setData('gagBusy', false);
          actor.setPosition(baseX, baseY);
          actor.setAngle(0);
        }
      });

      const glowKey = this.textures.exists('cover-candle-glow') ? 'cover-candle-glow' : 'particle-star';
      const upperBulb = this.add
        .image(415, 118, glowKey)
        .setOrigin(0.5, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xfef08a)
        .setScale(0.3)
        .setAlpha(0)
        .setDepth(458);

      const hoodCone = this.add
        .image(415, 345, glowKey)
        .setOrigin(0.5, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xfde047)
        .setScale(1.2, 1.8)
        .setAlpha(0)
        .setDepth(457);

      this.tweens.add({
        targets: upperBulb,
        scaleX: 1.5,
        scaleY: 1.1,
        alpha: 0.85,
        duration: 320,
        yoyo: true,
        hold: 680,
        ease: 'Sine.easeInOut',
        onComplete: () => upperBulb.destroy()
      });

      this.tweens.add({
        targets: hoodCone,
        scaleX: 3.2,
        scaleY: 3.8,
        alpha: 0.42,
        duration: 360,
        yoyo: true,
        hold: 640,
        ease: 'Sine.easeInOut',
        onComplete: () => hoodCone.destroy()
      });

      Juice.burstStars(this, 415, 118, 10, [0xfef08a, 0xfbbf24, 0xffffff]);
      return;
    }

    // =========================================================================
    // PAGE 6 (SPREAD 6 — DUTCH VILLAGE): 9 Custom 3-Frame Sprite Gags
    // =========================================================================
    const id = entry.hotspot.id;
    if (id === 'p6-family' && entry.spriteActor) {
      const spr = entry.spriteActor;
      if (spr.getData('gagBusy')) return;
      spr.setData('gagBusy', true);

      const baseScaleX = (spr.getData('baseScaleX') as number) ?? spr.scaleX;
      const baseScaleY = (spr.getData('baseScaleY') as number) ?? spr.scaleY;
      const baseX = (spr.getData('baseX') as number) ?? spr.x;
      const baseY = (spr.getData('baseY') as number) ?? spr.y;

      const frames = [1, 2, 1, 0];
      frames.forEach((f, idx) => {
        this.time.delayedCall(idx * 240, () => {
          if (spr.scene) spr.setFrame(f);
        });
      });

      this.tweens.add({
        targets: spr,
        y: baseY - 14,
        scaleX: baseScaleX * 1.04,
        scaleY: baseScaleY * 0.96,
        duration: 180,
        yoyo: true,
        repeat: 2,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (spr.scene) {
            spr.setFrame(0);
            spr.setPosition(baseX, baseY);
            spr.setScale(baseScaleX, baseScaleY);
            spr.setAngle(0);
            spr.setData('gagBusy', false);
          }
        }
      });
      return;
    }

    if (id === 'p6-windmill-sails' && entry.spriteActor) {
      const spr = entry.spriteActor;
      if (spr.getData('gagBusy')) return;
      spr.setData('gagBusy', true);

      const baseScaleX = (spr.getData('baseScaleX') as number) ?? spr.scaleX;
      const baseScaleY = (spr.getData('baseScaleY') as number) ?? spr.scaleY;
      const baseX = (spr.getData('baseX') as number) ?? spr.x;
      const baseY = (spr.getData('baseY') as number) ?? spr.y;

      const idleTween = spr.getData('idleTween') as Phaser.Tweens.Tween | undefined;
      if (idleTween && idleTween.isPlaying()) {
        idleTween.pause();
      }

      // Cycle frames 0 -> 1 -> 2 -> 0 while spinning faster in the breeze
      const frames = [1, 2, 0, 1, 2, 0];
      frames.forEach((f, idx) => {
        this.time.delayedCall(idx * 220, () => {
          if (spr.scene) spr.setFrame(f);
        });
      });

      const startAngle = spr.angle;
      this.tweens.add({
        targets: spr,
        angle: startAngle + 360,
        duration: 1350,
        ease: 'Cubic.easeInOut',
        onComplete: () => {
          if (spr.scene) {
            spr.setFrame(0);
            spr.setPosition(baseX, baseY);
            spr.setScale(baseScaleX, baseScaleY);
            spr.setAngle(0);
            spr.setData('gagBusy', false);
            if (idleTween) {
              idleTween.restart();
            }
          }
        }
      });

      // Coupled breeze wiggle on `p6-butterflies` and `p6-sparky-planter`
      for (const coupledId of ['p6-butterflies', 'p6-sparky-planter']) {
        const coupledEntry = this.hotspotEntries.find((e) => e.hotspot.id === coupledId);
        const coupledSpr = coupledEntry?.spriteActor;
        if (coupledSpr && !coupledSpr.getData('gagBusy')) {
          this.tweens.add({
            targets: coupledSpr,
            angle: { from: -6, to: 6 },
            duration: 140,
            yoyo: true,
            repeat: 3,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              if (coupledSpr.scene) coupledSpr.setAngle(0);
            }
          });
        }
      }
      return;
    }

    if (id === 'p6-ferris-wheel' && entry.spriteActor) {
      const spr = entry.spriteActor;
      if (spr.getData('gagBusy')) return;
      spr.setData('gagBusy', true);

      const baseScaleX = (spr.getData('baseScaleX') as number) ?? spr.scaleX;
      const baseScaleY = (spr.getData('baseScaleY') as number) ?? spr.scaleY;
      const baseX = (spr.getData('baseX') as number) ?? spr.x;
      const baseY = (spr.getData('baseY') as number) ?? spr.y;

      const frames = [1, 2, 0, 1, 2, 0];
      frames.forEach((f, idx) => {
        this.time.delayedCall(idx * 230, () => {
          if (spr.scene) spr.setFrame(f);
        });
      });

      // Burst carnival sparkles around the wheel hub
      Juice.burstStars(this, entry.hotspot.x - 12, entry.hotspot.y - 4, 18, [
        0x38bdf8,
        0xfbbf24,
        0xf43f5e,
        0xa855f7,
        0xffffff
      ]);

      this.tweens.add({
        targets: spr,
        angle: 360,
        duration: 1400,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (spr.scene) {
            spr.setFrame(0);
            spr.setPosition(baseX, baseY);
            spr.setScale(baseScaleX, baseScaleY);
            spr.setAngle(0);
            spr.setData('gagBusy', false);
          }
        }
      });
      return;
    }

    if (id === 'p6-clogs-doggie' && entry.spriteActor) {
      const spr = entry.spriteActor;
      if (spr.getData('gagBusy')) return;
      spr.setData('gagBusy', true);

      const baseScaleX = (spr.getData('baseScaleX') as number) ?? spr.scaleX;
      const baseScaleY = (spr.getData('baseScaleY') as number) ?? spr.scaleY;
      const baseX = (spr.getData('baseX') as number) ?? spr.x;
      const baseY = (spr.getData('baseY') as number) ?? spr.y;

      const frames = [1, 2, 1, 0];
      frames.forEach((f, idx) => {
        this.time.delayedCall(idx * 230, () => {
          if (spr.scene) spr.setFrame(f);
        });
      });

      this.tweens.add({
        targets: spr,
        y: baseY - 12,
        angle: { from: -5, to: 5 },
        duration: 160,
        yoyo: true,
        repeat: 2,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (spr.scene) {
            spr.setFrame(0);
            spr.setPosition(baseX, baseY);
            spr.setScale(baseScaleX, baseScaleY);
            spr.setAngle(0);
            spr.setData('gagBusy', false);
          }
        }
      });
      return;
    }

    if (id === 'p6-dutch-door' && entry.spriteActor) {
      const spr = entry.spriteActor;
      if (spr.getData('gagBusy')) return;
      spr.setData('gagBusy', true);

      const baseScaleX = (spr.getData('baseScaleX') as number) ?? spr.scaleX;
      const baseScaleY = (spr.getData('baseScaleY') as number) ?? spr.scaleY;
      const baseX = (spr.getData('baseX') as number) ?? spr.x;
      const baseY = (spr.getData('baseY') as number) ?? spr.y;

      const frames = [1, 2, 1, 0];
      frames.forEach((f, idx) => {
        this.time.delayedCall(idx * 260, () => {
          if (spr.scene) spr.setFrame(f);
        });
      });

      this.tweens.add({
        targets: spr,
        scaleX: baseScaleX * 1.05,
        scaleY: baseScaleY * 1.03,
        duration: 220,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.time.delayedCall(280, () => {
            if (spr.scene) {
              spr.setFrame(0);
              spr.setPosition(baseX, baseY);
              spr.setScale(baseScaleX, baseScaleY);
              spr.setAngle(0);
              spr.setData('gagBusy', false);
            }
          });
        }
      });
      return;
    }

    if (id === 'p6-chimney-stork' && entry.spriteActor) {
      const spr = entry.spriteActor;
      if (spr.getData('gagBusy')) return;
      spr.setData('gagBusy', true);

      const baseScaleX = (spr.getData('baseScaleX') as number) ?? spr.scaleX;
      const baseScaleY = (spr.getData('baseScaleY') as number) ?? spr.scaleY;
      const baseX = (spr.getData('baseX') as number) ?? spr.x;
      const baseY = (spr.getData('baseY') as number) ?? spr.y;

      const frames = [1, 2, 1, 0];
      frames.forEach((f, idx) => {
        this.time.delayedCall(idx * 240, () => {
          if (spr.scene) spr.setFrame(f);
        });
      });

      this.tweens.add({
        targets: spr,
        y: baseY - 14,
        scaleX: baseScaleX * 1.06,
        scaleY: baseScaleY * 1.06,
        duration: 220,
        yoyo: true,
        repeat: 1,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.time.delayedCall(180, () => {
            if (spr.scene) {
              spr.setFrame(0);
              spr.setPosition(baseX, baseY);
              spr.setScale(baseScaleX, baseScaleY);
              spr.setAngle(0);
              spr.setData('gagBusy', false);
            }
          });
        }
      });
      return;
    }

    if (id === 'p6-sparky-planter' && entry.spriteActor) {
      const spr = entry.spriteActor;
      if (spr.getData('gagBusy')) return;
      spr.setData('gagBusy', true);

      const baseScaleX = (spr.getData('baseScaleX') as number) ?? spr.scaleX;
      const baseScaleY = (spr.getData('baseScaleY') as number) ?? spr.scaleY;
      const baseX = (spr.getData('baseX') as number) ?? spr.x;
      const baseY = (spr.getData('baseY') as number) ?? spr.y;

      const frames = [1, 2, 1, 0];
      frames.forEach((f, idx) => {
        this.time.delayedCall(idx * 240, () => {
          if (spr.scene) spr.setFrame(f);
        });
      });

      this.tweens.add({
        targets: spr,
        y: baseY - 12,
        scaleX: baseScaleX * 1.08,
        scaleY: baseScaleY * 1.08,
        duration: 210,
        yoyo: true,
        repeat: 1,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.time.delayedCall(200, () => {
            if (spr.scene) {
              spr.setFrame(0);
              spr.setPosition(baseX, baseY);
              spr.setScale(baseScaleX, baseScaleY);
              spr.setAngle(0);
              spr.setData('gagBusy', false);
            }
          });
        }
      });
      return;
    }

    if (id === 'p6-butterflies' && entry.spriteActor) {
      const spr = entry.spriteActor;
      if (spr.getData('gagBusy')) return;
      spr.setData('gagBusy', true);

      const baseScaleX = (spr.getData('baseScaleX') as number) ?? spr.scaleX;
      const baseScaleY = (spr.getData('baseScaleY') as number) ?? spr.scaleY;
      const baseX = (spr.getData('baseX') as number) ?? spr.x;
      const baseY = (spr.getData('baseY') as number) ?? spr.y;

      const idleTween = spr.getData('idleTween') as Phaser.Tweens.Tween | undefined;
      if (idleTween && idleTween.isPlaying()) {
        idleTween.pause();
      }

      const frames = [1, 2, 1, 0];
      frames.forEach((f, idx) => {
        this.time.delayedCall(idx * 230, () => {
          if (spr.scene) spr.setFrame(f);
        });
      });

      this.tweens.add({
        targets: spr,
        y: baseY - 18,
        scaleX: baseScaleX * 1.1,
        scaleY: baseScaleY * 1.1,
        duration: 230,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (spr.scene) {
            spr.setFrame(0);
            spr.setPosition(baseX, baseY);
            spr.setScale(baseScaleX, baseScaleY);
            spr.setAngle(0);
            spr.setData('gagBusy', false);
            if (idleTween) {
              idleTween.restart();
            }
          }
        }
      });
      return;
    }

    if (id === 'p6-window-cat' && entry.spriteActor) {
      const spr = entry.spriteActor;
      if (spr.getData('gagBusy')) return;
      spr.setData('gagBusy', true);

      const baseScaleX = (spr.getData('baseScaleX') as number) ?? spr.scaleX;
      const baseScaleY = (spr.getData('baseScaleY') as number) ?? spr.scaleY;
      const baseX = (spr.getData('baseX') as number) ?? spr.x;
      const baseY = (spr.getData('baseY') as number) ?? spr.y;

      const frames = [1, 2, 1, 0];
      frames.forEach((f, idx) => {
        this.time.delayedCall(idx * 240, () => {
          if (spr.scene) spr.setFrame(f);
        });
      });

      // Spawn warm floating heart particles from the cottage window (1128, 398)
      const catWorldX = entry.hotspot.x + baseX;
      const catWorldY = entry.hotspot.y + baseY;
      for (let i = 0; i < 6; i++) {
        this.time.delayedCall(i * 110, () => {
          if (!this.scene.isActive()) return;
          const heart = this.add
            .text(catWorldX + (i % 2 === 0 ? -14 : 14), catWorldY - 16, '❤️', {
              fontSize: '20px'
            })
            .setOrigin(0.5, 0.5)
            .setDepth(465);
          this.tweens.add({
            targets: heart,
            y: catWorldY - 64 - i * 6,
            x: heart.x + (i % 2 === 0 ? -10 : 10),
            alpha: { from: 1, to: 0 },
            scale: { from: 0.7, to: 1.25 },
            duration: 680,
            ease: 'Sine.easeOut',
            onComplete: () => heart.destroy()
          });
        });
      }

      this.tweens.add({
        targets: spr,
        y: baseY - 8,
        scaleX: baseScaleX * 1.07,
        scaleY: baseScaleY * 1.07,
        duration: 210,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.time.delayedCall(200, () => {
            if (spr.scene) {
              spr.setFrame(0);
              spr.setPosition(baseX, baseY);
              spr.setScale(baseScaleX, baseScaleY);
              spr.setAngle(0);
              spr.setData('gagBusy', false);
            }
          });
        }
      });
      return;
    }

    // =========================================================================
    // PAGE 7 (LAKE MICHIGAN BEACH): 9 Custom Interactive Gags
    // =========================================================================
    if (id === 'p7-papa-skipping' && entry.spriteActor) {
      const spr = entry.spriteActor;
      if (spr.getData('gagBusy')) return;
      spr.setData('gagBusy', true);

      const baseScaleX = (spr.getData('baseScaleX') as number) ?? spr.scaleX;
      const baseScaleY = (spr.getData('baseScaleY') as number) ?? spr.scaleY;
      const baseX = (spr.getData('baseX') as number) ?? spr.x;
      const baseY = (spr.getData('baseY') as number) ?? spr.y;

      const frames = [1, 2, 1, 0];
      frames.forEach((f, idx) => {
        this.time.delayedCall(idx * 260, () => {
          if (spr.scene) spr.setFrame(f);
        });
      });

      // Animate a skipping grey stone arc with 3 expanding white water-ripple rings across the water to the left (x: 220 -> 140 -> 60)
      const stone = this.add
        .ellipse(245, 345, 22, 11, 0x94a3b8, 1)
        .setStrokeStyle(2, 0x334155, 1)
        .setDepth(462);

      const skipStops = [
        { x: 220, y: 365 },
        { x: 140, y: 345 },
        { x: 60, y: 325 }
      ];

      skipStops.forEach((stop, i) => {
        this.time.delayedCall(i * 240, () => {
          if (!this.scene.isActive()) return;
          this.tweens.add({
            targets: stone,
            x: stop.x,
            y: { value: stop.y, ease: 'Bounce.easeOut' },
            duration: 220,
            onComplete: () => {
              if (!this.scene.isActive()) return;
              const ring = this.add
                .ellipse(stop.x, stop.y + 4, 14, 7)
                .setStrokeStyle(3, 0xffffff, 0.95)
                .setDepth(461);
              this.tweens.add({
                targets: ring,
                scaleX: 3.4,
                scaleY: 2.6,
                alpha: 0,
                duration: 460,
                ease: 'Quad.easeOut',
                onComplete: () => ring.destroy()
              });
              if (i === skipStops.length - 1) {
                stone.destroy();
              }
            }
          });
        });
      });

      this.tweens.add({
        targets: spr,
        y: baseY - 10,
        duration: 210,
        yoyo: true,
        repeat: 1,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.time.delayedCall(340, () => {
            if (spr.scene) {
              spr.setFrame(0);
              spr.setPosition(baseX, baseY);
              spr.setScale(baseScaleX, baseScaleY);
              spr.setAngle(0);
              spr.setData('gagBusy', false);
            }
          });
        }
      });
      return;
    }

    if (id === 'p7-kids-sandcastle' && entry.spriteActor) {
      const spr = entry.spriteActor;
      if (spr.getData('gagBusy')) return;
      spr.setData('gagBusy', true);

      const baseScaleX = (spr.getData('baseScaleX') as number) ?? spr.scaleX;
      const baseScaleY = (spr.getData('baseScaleY') as number) ?? spr.scaleY;
      const baseX = (spr.getData('baseX') as number) ?? spr.x;
      const baseY = (spr.getData('baseY') as number) ?? spr.y;

      const frames = [1, 2, 1, 0];
      frames.forEach((f, idx) => {
        this.time.delayedCall(idx * 270, () => {
          if (spr.scene) spr.setFrame(f);
        });
      });

      // Burst golden sand/star sparkles above the castle tower
      this.time.delayedCall(260, () => {
        if (!this.scene.isActive()) return;
        Juice.burstStars(this, entry.hotspot.x + 10, entry.hotspot.y - 95, 20, [
          0xfde047,
          0xfbbf24,
          0xf59e0b,
          0x38bdf8,
          0xffffff
        ]);
      });

      this.tweens.add({
        targets: spr,
        y: baseY - 14,
        scaleX: baseScaleX * 1.04,
        scaleY: baseScaleY * 1.04,
        duration: 220,
        yoyo: true,
        repeat: 1,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.time.delayedCall(260, () => {
            if (spr.scene) {
              spr.setFrame(0);
              spr.setPosition(baseX, baseY);
              spr.setScale(baseScaleX, baseScaleY);
              spr.setAngle(0);
              spr.setData('gagBusy', false);
            }
          });
        }
      });
      return;
    }

    if (id === 'p7-nana-chair' && entry.spriteActor) {
      const spr = entry.spriteActor;
      if (spr.getData('gagBusy')) return;
      spr.setData('gagBusy', true);

      const baseScaleX = (spr.getData('baseScaleX') as number) ?? spr.scaleX;
      const baseScaleY = (spr.getData('baseScaleY') as number) ?? spr.scaleY;
      const baseX = (spr.getData('baseX') as number) ?? spr.x;
      const baseY = (spr.getData('baseY') as number) ?? spr.y;

      const frames = [1, 2, 1, 0];
      frames.forEach((f, idx) => {
        this.time.delayedCall(idx * 250, () => {
          if (spr.scene) spr.setFrame(f);
        });
      });

      // Float warm pink heart particles above Nana
      for (let i = 0; i < 6; i++) {
        this.time.delayedCall(i * 110, () => {
          if (!this.scene.isActive()) return;
          const heart = this.add
            .text(entry.hotspot.x - 20 + (i % 3) * 18, entry.hotspot.y - 120, '🩷', {
              fontSize: '22px'
            })
            .setOrigin(0.5, 0.5)
            .setDepth(465);
          this.tweens.add({
            targets: heart,
            y: heart.y - 55 - i * 5,
            x: heart.x + (i % 2 === 0 ? -12 : 12),
            alpha: { from: 1, to: 0 },
            scale: { from: 0.75, to: 1.25 },
            duration: 700,
            ease: 'Sine.easeOut',
            onComplete: () => heart.destroy()
          });
        });
      }

      this.tweens.add({
        targets: spr,
        y: baseY - 8,
        scaleX: baseScaleX * 1.03,
        scaleY: baseScaleY * 1.03,
        duration: 210,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.time.delayedCall(220, () => {
            if (spr.scene) {
              spr.setFrame(0);
              spr.setPosition(baseX, baseY);
              spr.setScale(baseScaleX, baseScaleY);
              spr.setAngle(0);
              spr.setData('gagBusy', false);
            }
          });
        }
      });
      return;
    }

    if (id === 'p7-doggie-towel' && entry.spriteActor) {
      const spr = entry.spriteActor;
      if (spr.getData('gagBusy')) return;
      spr.setData('gagBusy', true);

      const baseScaleX = (spr.getData('baseScaleX') as number) ?? spr.scaleX;
      const baseScaleY = (spr.getData('baseScaleY') as number) ?? spr.scaleY;
      const baseX = (spr.getData('baseX') as number) ?? spr.x;
      const baseY = (spr.getData('baseY') as number) ?? spr.y;

      const frames = [1, 2, 1, 0];
      frames.forEach((f, idx) => {
        this.time.delayedCall(idx * 250, () => {
          if (spr.scene) spr.setFrame(f);
        });
      });

      // Kick up golden sand particles on Frame 1 followed by a pink seashell sparkle on Frame 2
      for (let i = 0; i < 10; i++) {
        const sandDot = this.add
          .circle(entry.hotspot.x + 8, entry.hotspot.y + 18, 4, i % 2 === 0 ? 0xfacc15 : 0xfbbf24, 0.95)
          .setDepth(463);
        const angle = Phaser.Math.DegToRad(-140 + i * 12);
        const dist = 26 + (i % 3) * 14;
        this.tweens.add({
          targets: sandDot,
          x: sandDot.x + Math.cos(angle) * dist,
          y: sandDot.y + Math.sin(angle) * dist,
          alpha: 0,
          duration: 380,
          ease: 'Quad.easeOut',
          onComplete: () => sandDot.destroy()
        });
      }

      this.time.delayedCall(250, () => {
        if (!this.scene.isActive()) return;
        Juice.burstStars(this, entry.hotspot.x + 18, entry.hotspot.y - 18, 14, [
          0xf472b6,
          0xf43f5e,
          0xfde047,
          0xffffff
        ]);
      });

      this.tweens.add({
        targets: spr,
        y: baseY - 12,
        scaleX: baseScaleX * 1.08,
        scaleY: baseScaleY * 1.08,
        duration: 200,
        yoyo: true,
        repeat: 1,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.time.delayedCall(240, () => {
            if (spr.scene) {
              spr.setFrame(0);
              spr.setPosition(baseX, baseY);
              spr.setScale(baseScaleX, baseScaleY);
              spr.setAngle(0);
              spr.setData('gagBusy', false);
            }
          });
        }
      });
      return;
    }

    if (id === 'p7-seagulls-bucket' && entry.spriteActor) {
      const spr = entry.spriteActor;
      if (spr.getData('gagBusy')) return;
      spr.setData('gagBusy', true);

      const baseScaleX = (spr.getData('baseScaleX') as number) ?? spr.scaleX;
      const baseScaleY = (spr.getData('baseScaleY') as number) ?? spr.scaleY;
      const baseX = (spr.getData('baseX') as number) ?? spr.x;
      const baseY = (spr.getData('baseY') as number) ?? spr.y;

      const frames = [1, 2, 1, 0];
      frames.forEach((f, idx) => {
        this.time.delayedCall(idx * 240, () => {
          if (spr.scene) spr.setFrame(f);
        });
      });

      this.tweens.add({
        targets: spr,
        y: baseY - 16,
        scaleX: baseScaleX * 1.06,
        scaleY: baseScaleY * 1.06,
        duration: 190,
        yoyo: true,
        repeat: 1,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.time.delayedCall(220, () => {
            if (spr.scene) {
              spr.setFrame(0);
              spr.setPosition(baseX, baseY);
              spr.setScale(baseScaleX, baseScaleY);
              spr.setAngle(0);
              spr.setData('gagBusy', false);
            }
          });
        }
      });
      return;
    }

    if (id === 'p7-sparky-grill' && entry.spriteActor) {
      const spr = entry.spriteActor;
      if (spr.getData('gagBusy')) return;
      spr.setData('gagBusy', true);

      const baseScaleX = (spr.getData('baseScaleX') as number) ?? spr.scaleX;
      const baseScaleY = (spr.getData('baseScaleY') as number) ?? spr.scaleY;
      const baseX = (spr.getData('baseX') as number) ?? spr.x;
      const baseY = (spr.getData('baseY') as number) ?? spr.y;

      const frames = [1, 2, 1, 0];
      frames.forEach((f, idx) => {
        this.time.delayedCall(idx * 250, () => {
          if (spr.scene) spr.setFrame(f);
        });
      });

      // Warm golden ember sparkles rising from the fire pit
      for (let i = 0; i < 12; i++) {
        this.time.delayedCall(i * 45, () => {
          if (!this.scene.isActive()) return;
          const ember = this.add
            .circle(
              entry.hotspot.x - 18 + (i % 5) * 9,
              entry.hotspot.y - 22,
              3.5,
              i % 2 === 0 ? 0xfbbf24 : 0xf97316,
              0.95
            )
            .setDepth(463);
          this.tweens.add({
            targets: ember,
            y: ember.y - 38 - (i % 3) * 12,
            x: ember.x + (i % 2 === 0 ? -8 : 8),
            alpha: 0,
            scale: 0.3,
            duration: 520,
            ease: 'Sine.easeOut',
            onComplete: () => ember.destroy()
          });
        });
      }

      // Keep the stone fire-pit base 100% stationary while Sparky pops up across frames 0 -> 1 -> 2 -> 1 -> 0
      this.time.delayedCall(1050, () => {
        if (spr.scene) {
          spr.setFrame(0);
          spr.setPosition(baseX, baseY);
          spr.setScale(baseScaleX, baseScaleY);
          spr.setAngle(0);
          spr.setData('gagBusy', false);
        }
      });
      return;
    }

    if (id === 'p7-sailboat-horizon' && entry.spriteActor) {
      const spr = entry.spriteActor;
      if (spr.getData('gagBusy')) return;
      spr.setData('gagBusy', true);

      const baseScaleX = (spr.getData('baseScaleX') as number) ?? spr.scaleX;
      const baseScaleY = (spr.getData('baseScaleY') as number) ?? spr.scaleY;
      const baseX = (spr.getData('baseX') as number) ?? spr.x;
      const baseY = (spr.getData('baseY') as number) ?? spr.y;

      const idleTween = spr.getData('idleTween') as Phaser.Tweens.Tween | undefined;
      if (idleTween && idleTween.isPlaying()) {
        idleTween.pause();
      }

      const frames = [1, 2, 1, 0];
      frames.forEach((f, idx) => {
        this.time.delayedCall(idx * 260, () => {
          if (spr.scene) spr.setFrame(f);
        });
      });

      this.tweens.add({
        targets: spr,
        y: baseY - 10,
        scaleX: baseScaleX * 1.08,
        scaleY: baseScaleY * 1.08,
        duration: 230,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.time.delayedCall(220, () => {
            if (spr.scene) {
              spr.setFrame(0);
              spr.setPosition(baseX, baseY);
              spr.setScale(baseScaleX, baseScaleY);
              spr.setAngle(0);
              spr.setData('gagBusy', false);
              if (idleTween) {
                idleTween.restart();
              }
            }
          });
        }
      });
      return;
    }

    if (id === 'p7-beach-ball' && entry.spriteActor) {
      const spr = entry.spriteActor;
      if (spr.getData('gagBusy')) return;
      spr.setData('gagBusy', true);

      const baseScaleX = (spr.getData('baseScaleX') as number) ?? spr.scaleX;
      const baseScaleY = (spr.getData('baseScaleY') as number) ?? spr.scaleY;
      const baseX = (spr.getData('baseX') as number) ?? spr.x;
      const baseY = (spr.getData('baseY') as number) ?? spr.y;

      const frames = [1, 2, 1, 0];
      frames.forEach((f, idx) => {
        this.time.delayedCall(idx * 240, () => {
          if (spr.scene) spr.setFrame(f);
        });
      });

      // Playful bounce arc in the sand
      this.tweens.add({
        targets: spr,
        y: baseY - 38,
        x: baseX + 12,
        scaleX: baseScaleX * 1.1,
        scaleY: baseScaleY * 1.1,
        duration: 230,
        yoyo: true,
        repeat: 1,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.time.delayedCall(180, () => {
            if (spr.scene) {
              spr.setFrame(0);
              spr.setPosition(baseX, baseY);
              spr.setScale(baseScaleX, baseScaleY);
              spr.setAngle(0);
              spr.setData('gagBusy', false);
            }
          });
        }
      });
      return;
    }

    if (id === 'p7-umbrella-canopy') {
      if (actor.getData('gagBusy')) return;
      actor.setData('gagBusy', true);

      // Sunny shimmer over the rainbow beach umbrella canopy (x: 1115, y: 142)
      const glowKey = this.textures.exists('cover-candle-glow') ? 'cover-candle-glow' : 'particle-star';
      const shimmer = this.add
        .image(1115, 142, glowKey)
        .setOrigin(0.5, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xfef08a)
        .setScale(2.2, 1.2)
        .setAlpha(0)
        .setDepth(460);

      this.tweens.add({
        targets: shimmer,
        alpha: 0.55,
        scaleX: 2.8,
        scaleY: 1.5,
        duration: 320,
        yoyo: true,
        hold: 340,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          shimmer.destroy();
          actor.setData('gagBusy', false);
        }
      });

      Juice.burstStars(this, 1115, 142, 16, [0xfef08a, 0xfbbf24, 0x38bdf8, 0xf43f5e, 0xffffff]);

      // Coupled beach breeze reaction on `p7-seagulls-bucket` and `p7-sailboat-horizon`
      for (const coupledId of ['p7-seagulls-bucket', 'p7-sailboat-horizon']) {
        const coupledEntry = this.hotspotEntries.find((e) => e.hotspot.id === coupledId);
        const coupledSpr = coupledEntry?.spriteActor;
        if (coupledSpr && !coupledSpr.getData('gagBusy')) {
          this.tweens.add({
            targets: coupledSpr,
            angle: { from: -6, to: 6 },
            duration: 150,
            yoyo: true,
            repeat: 3,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              if (coupledSpr.scene) coupledSpr.setAngle(0);
            }
          });
        }
      }
      return;
    }

    // =========================================================================
    // PAGE 8 (WOODLAND CABIN): 8 Custom Interactive Gags
    // =========================================================================
    if (id === 'p8-kids-running' && entry.spriteActor) {
      const spr = entry.spriteActor;
      if (spr.getData('gagBusy')) return;
      spr.setData('gagBusy', true);

      const baseScaleX = (spr.getData('baseScaleX') as number) ?? spr.scaleX;
      const baseScaleY = (spr.getData('baseScaleY') as number) ?? spr.scaleY;
      const baseX = (spr.getData('baseX') as number) ?? spr.x;
      const baseY = (spr.getData('baseY') as number) ?? spr.y;

      const frames = [1, 2, 1, 0];
      frames.forEach((f, idx) => {
        this.time.delayedCall(idx * 260, () => {
          if (spr.scene) spr.setFrame(f);
        });
      });

      // Excited star-jump bounce + golden star particle burst
      Juice.burstStars(this, entry.hotspot.x, entry.hotspot.y - 45, 18, [
        0xfde047,
        0xfbbf24,
        0x22c55e,
        0xc084fc,
        0xffffff
      ]);

      this.tweens.add({
        targets: spr,
        y: baseY - 22,
        scaleX: baseScaleX * 1.06,
        scaleY: baseScaleY * 1.06,
        duration: 210,
        yoyo: true,
        repeat: 1,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.time.delayedCall(260, () => {
            if (spr.scene) {
              spr.setFrame(0);
              spr.setPosition(baseX, baseY);
              spr.setScale(baseScaleX, baseScaleY);
              spr.setAngle(0);
              spr.setData('gagBusy', false);
            }
          });
        }
      });
      return;
    }

    if (id === 'p8-nana-porch' && entry.spriteActor) {
      const spr = entry.spriteActor;
      if (spr.getData('gagBusy')) return;
      spr.setData('gagBusy', true);

      const baseScaleX = (spr.getData('baseScaleX') as number) ?? spr.scaleX;
      const baseScaleY = (spr.getData('baseScaleY') as number) ?? spr.scaleY;
      const baseX = (spr.getData('baseX') as number) ?? spr.x;
      const baseY = (spr.getData('baseY') as number) ?? spr.y;

      const frames = [1, 2, 1, 0];
      frames.forEach((f, idx) => {
        this.time.delayedCall(idx * 270, () => {
          if (spr.scene) spr.setFrame(f);
        });
      });

      // Float warm pink heart steam puffs upward from Nana's cocoa mug and open arms
      const heartTex = this.textures.exists('p1-pixel-heart') ? 'p1-pixel-heart' : 'particle-star';
      for (let i = 0; i < 7; i++) {
        this.time.delayedCall(i * 115, () => {
          if (!this.scene.isActive()) return;
          const heart = this.add
            .image(entry.hotspot.x + 14 + ((i % 3) - 1) * 14, entry.hotspot.y - 32, heartTex)
            .setOrigin(0.5, 0.5)
            .setTint(i % 2 === 0 ? 0xf472b6 : 0xfb7185)
            .setScale(0.75)
            .setDepth(465);
          this.tweens.add({
            targets: heart,
            y: heart.y - 52 - i * 5,
            x: heart.x + (i % 2 === 0 ? 12 : -10),
            alpha: { from: 0.95, to: 0 },
            scale: { from: 0.65, to: 1.15 },
            duration: 720,
            ease: 'Sine.easeOut',
            onComplete: () => heart.destroy()
          });
        });
      }

      this.tweens.add({
        targets: spr,
        y: baseY - 6,
        scaleX: baseScaleX * 1.03,
        scaleY: baseScaleY * 1.03,
        duration: 220,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.time.delayedCall(260, () => {
            if (spr.scene) {
              spr.setFrame(0);
              spr.setPosition(baseX, baseY);
              spr.setScale(baseScaleX, baseScaleY);
              spr.setAngle(0);
              spr.setData('gagBusy', false);
            }
          });
        }
      });
      return;
    }

    if (id === 'p8-sparky-chimney' && entry.spriteActor) {
      const spr = entry.spriteActor;
      if (spr.getData('gagBusy')) return;
      spr.setData('gagBusy', true);

      const baseScaleX = (spr.getData('baseScaleX') as number) ?? spr.scaleX;
      const baseScaleY = (spr.getData('baseScaleY') as number) ?? spr.scaleY;
      const baseX = (spr.getData('baseX') as number) ?? spr.x;
      const baseY = (spr.getData('baseY') as number) ?? spr.y;

      const idleTween = spr.getData('idleTween') as Phaser.Tweens.Tween | undefined;
      if (idleTween && idleTween.isPlaying()) {
        idleTween.pause();
      }

      const frames = [1, 2, 1, 0];
      frames.forEach((f, idx) => {
        this.time.delayedCall(idx * 270, () => {
          if (spr.scene) spr.setFrame(f);
        });
      });

      // Burst golden-pink heart embers + happy mid-air flip tween
      Juice.burstStars(this, entry.hotspot.x + 15, entry.hotspot.y - 10, 18, [
        0xf472b6,
        0xfbbf24,
        0xfef08a,
        0x10b981,
        0xffffff
      ]);

      this.tweens.add({
        targets: spr,
        y: baseY - 20,
        angle: 360,
        scaleX: baseScaleX * 1.08,
        scaleY: baseScaleY * 1.08,
        duration: 540,
        yoyo: true,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (spr.scene) {
            spr.setFrame(0);
            spr.setPosition(baseX, baseY);
            spr.setScale(baseScaleX, baseScaleY);
            spr.setAngle(0);
            spr.setData('gagBusy', false);
            if (idleTween) {
              idleTween.restart();
            }
          }
        }
      });
      return;
    }

    if (id === 'p8-wind-chimes' && entry.spriteActor) {
      const spr = entry.spriteActor;
      if (spr.getData('gagBusy')) return;
      spr.setData('gagBusy', true);

      const baseScaleX = (spr.getData('baseScaleX') as number) ?? spr.scaleX;
      const baseScaleY = (spr.getData('baseScaleY') as number) ?? spr.scaleY;
      const baseX = (spr.getData('baseX') as number) ?? spr.x;
      const baseY = (spr.getData('baseY') as number) ?? spr.y;

      const idleTween = spr.getData('idleTween') as Phaser.Tweens.Tween | undefined;
      if (idleTween && idleTween.isPlaying()) {
        idleTween.pause();
      }

      const frames = [1, 2, 1, 0];
      frames.forEach((f, idx) => {
        this.time.delayedCall(idx * 250, () => {
          if (spr.scene) spr.setFrame(f);
        });
      });

      // Swirling musical notes around the wind chimes
      if (this.textures.exists('p3-pixel-note')) {
        const noteColors = [0x38bdf8, 0xfacc15, 0xf472b6, 0x34d399];
        for (let i = 0; i < 6; i++) {
          this.time.delayedCall(i * 110, () => {
            if (!this.scene.isActive()) return;
            const note = this.add
              .image(entry.hotspot.x + (i % 2 === 0 ? -18 : 18), entry.hotspot.y + 5, 'p3-pixel-note')
              .setOrigin(0.5, 0.5)
              .setTint(noteColors[i % noteColors.length])
              .setScale(0.95)
              .setDepth(466);
            this.tweens.add({
              targets: note,
              x: note.x + (i % 2 === 0 ? -26 : 28),
              y: note.y - 42 - i * 5,
              angle: i % 2 === 0 ? -18 : 18,
              alpha: 0,
              duration: 640,
              ease: 'Sine.easeOut',
              onComplete: () => note.destroy()
            });
          });
        }
      }

      // Coupled forest breeze wiggle on `p8-sparky-chimney` and `p8-bluejay-porch`
      for (const coupledId of ['p8-sparky-chimney', 'p8-bluejay-porch']) {
        const coupledEntry = this.hotspotEntries.find((e) => e.hotspot.id === coupledId);
        const coupledSpr = coupledEntry?.spriteActor;
        if (coupledSpr && !coupledSpr.getData('gagBusy')) {
          this.tweens.add({
            targets: coupledSpr,
            angle: { from: -7, to: 7 },
            duration: 140,
            yoyo: true,
            repeat: 3,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              if (coupledSpr.scene) coupledSpr.setAngle(0);
            }
          });
        }
      }

      this.tweens.add({
        targets: spr,
        angle: { from: -11, to: 11 },
        duration: 180,
        yoyo: true,
        repeat: 2,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.time.delayedCall(180, () => {
            if (spr.scene) {
              spr.setFrame(0);
              spr.setPosition(baseX, baseY);
              spr.setScale(baseScaleX, baseScaleY);
              spr.setAngle(0);
              spr.setData('gagBusy', false);
              if (idleTween) {
                idleTween.restart();
              }
            }
          });
        }
      });
      return;
    }

    if (id === 'p8-forest-deer' && entry.spriteActor) {
      const spr = entry.spriteActor;
      if (spr.getData('gagBusy')) return;
      spr.setData('gagBusy', true);

      const baseScaleX = (spr.getData('baseScaleX') as number) ?? spr.scaleX;
      const baseScaleY = (spr.getData('baseScaleY') as number) ?? spr.scaleY;
      const baseX = (spr.getData('baseX') as number) ?? spr.x;
      const baseY = (spr.getData('baseY') as number) ?? spr.y;

      const frames = [1, 2, 1, 0];
      frames.forEach((f, idx) => {
        this.time.delayedCall(idx * 270, () => {
          if (spr.scene) spr.setFrame(f);
        });
      });

      // Floating music notes from the little yellow songbird on the deer's antlers
      if (this.textures.exists('p3-pixel-note')) {
        const noteColors = [0xfacc15, 0x4ade80, 0x38bdf8, 0xf472b6];
        for (let i = 0; i < 5; i++) {
          this.time.delayedCall(150 + i * 125, () => {
            if (!this.scene.isActive()) return;
            const note = this.add
              .image(entry.hotspot.x + 18, entry.hotspot.y - 54, 'p3-pixel-note')
              .setOrigin(0.5, 0.5)
              .setTint(noteColors[i % noteColors.length])
              .setScale(0.9)
              .setDepth(466);
            this.tweens.add({
              targets: note,
              x: note.x + Phaser.Math.Between(-18, 24),
              y: note.y - 45 - i * 4,
              alpha: 0,
              duration: 620,
              ease: 'Sine.easeOut',
              onComplete: () => note.destroy()
            });
          });
        }
      }

      this.tweens.add({
        targets: spr,
        y: baseY - 10,
        scaleX: baseScaleX * 1.04,
        scaleY: baseScaleY * 1.04,
        duration: 220,
        yoyo: true,
        repeat: 1,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.time.delayedCall(260, () => {
            if (spr.scene) {
              spr.setFrame(0);
              spr.setPosition(baseX, baseY);
              spr.setScale(baseScaleX, baseScaleY);
              spr.setAngle(0);
              spr.setData('gagBusy', false);
            }
          });
        }
      });
      return;
    }

    if (id === 'p8-canada-geese' && entry.spriteActor) {
      const spr = entry.spriteActor;
      if (spr.getData('gagBusy')) return;
      spr.setData('gagBusy', true);

      const baseScaleX = (spr.getData('baseScaleX') as number) ?? spr.scaleX;
      const baseScaleY = (spr.getData('baseScaleY') as number) ?? spr.scaleY;
      const baseX = (spr.getData('baseX') as number) ?? spr.x;
      const baseY = (spr.getData('baseY') as number) ?? spr.y;

      const frames = [1, 2, 1, 0];
      frames.forEach((f, idx) => {
        this.time.delayedCall(idx * 260, () => {
          if (spr.scene) spr.setFrame(f);
        });
      });

      // Funny synchronized goose hop
      this.tweens.add({
        targets: spr,
        y: baseY - 20,
        scaleX: baseScaleX * 1.06,
        scaleY: baseScaleY * 1.06,
        duration: 200,
        yoyo: true,
        repeat: 1,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.time.delayedCall(260, () => {
            if (spr.scene) {
              spr.setFrame(0);
              spr.setPosition(baseX, baseY);
              spr.setScale(baseScaleX, baseScaleY);
              spr.setAngle(0);
              spr.setData('gagBusy', false);
            }
          });
        }
      });
      return;
    }

    if (id === 'p8-doggie-cellar' && entry.spriteActor) {
      const spr = entry.spriteActor;
      if (spr.getData('gagBusy')) return;
      spr.setData('gagBusy', true);

      const baseScaleX = (spr.getData('baseScaleX') as number) ?? spr.scaleX;
      const baseScaleY = (spr.getData('baseScaleY') as number) ?? spr.scaleY;
      const baseX = (spr.getData('baseX') as number) ?? spr.x;
      const baseY = (spr.getData('baseY') as number) ?? spr.y;

      const frames = [1, 2, 1, 0];
      frames.forEach((f, idx) => {
        this.time.delayedCall(idx * 260, () => {
          if (spr.scene) spr.setFrame(f);
        });
      });

      this.tweens.add({
        targets: spr,
        y: baseY - 14,
        scaleX: baseScaleX * 1.07,
        scaleY: baseScaleY * 1.07,
        duration: 210,
        yoyo: true,
        repeat: 1,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.time.delayedCall(250, () => {
            if (spr.scene) {
              spr.setFrame(0);
              spr.setPosition(baseX, baseY);
              spr.setScale(baseScaleX, baseScaleY);
              spr.setAngle(0);
              spr.setData('gagBusy', false);
            }
          });
        }
      });
      return;
    }

    if (id === 'p8-bluejay-porch' && entry.spriteActor) {
      const spr = entry.spriteActor;
      if (spr.getData('gagBusy')) return;
      spr.setData('gagBusy', true);

      const baseScaleX = (spr.getData('baseScaleX') as number) ?? spr.scaleX;
      const baseScaleY = (spr.getData('baseScaleY') as number) ?? spr.scaleY;
      const baseX = (spr.getData('baseX') as number) ?? spr.x;
      const baseY = (spr.getData('baseY') as number) ?? spr.y;

      const frames = [1, 2, 1, 0];
      frames.forEach((f, idx) => {
        this.time.delayedCall(idx * 240, () => {
          if (spr.scene) spr.setFrame(f);
        });
      });

      // Little flutter hop above the wooden side-porch railing
      this.tweens.add({
        targets: spr,
        y: baseY - 18,
        scaleX: baseScaleX * 1.12,
        scaleY: baseScaleY * 1.12,
        duration: 190,
        yoyo: true,
        repeat: 1,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.time.delayedCall(220, () => {
            if (spr.scene) {
              spr.setFrame(0);
              spr.setPosition(baseX, baseY);
              spr.setScale(baseScaleX, baseScaleY);
              spr.setAngle(0);
              spr.setData('gagBusy', false);
            }
          });
        }
      });
      return;
    }

    this.activateCutoutPatchForGag(entry, 740);

    switch (gag) {
      case 'jump-flip':
        Juice.jumpFlip(this, actor, 54, false);
        this.tweens.add({
          targets: actor,
          angle: { from: -8, to: 8 },
          duration: 110,
          yoyo: true,
          repeat: 2
        });
        break;

      case 'squash-pop':
        Juice.squashAndStretch(this, actor, 0.28, 170);
        Juice.shake(this, 110, 0.0025);
        break;

      case 'wobble-spin':
        Juice.wobble(this, actor, 14);
        break;

      case 'peek-a-boo':
        this.tweens.add({
          targets: actor,
          y: baseY - 36,
          scaleX: 1.15,
          scaleY: 1.15,
          duration: 200,
          yoyo: true,
          hold: 240,
          ease: 'Back.easeOut',
          onComplete: () => {
            Juice.squashAndStretch(this, actor, 0.18, 125);
          }
        });
        break;

      case 'inflate-pop':
        this.tweens.add({
          targets: actor,
          scaleX: 1.28,
          scaleY: 1.28,
          duration: 280,
          ease: 'Back.easeOut',
          onComplete: () => {
            Juice.shake(this, 130, 0.003);
            Juice.burstStars(this, baseX, baseY, 16);
            this.tweens.add({
              targets: actor,
              scaleX: 1,
              scaleY: 1,
              duration: 220,
              ease: 'Elastic.easeOut'
            });
          }
        });
        break;

      case 'splash-arc':
        this.tweens.add({
          targets: actor,
          y: baseY - 58,
          x: baseX + 26,
          angle: -16,
          duration: 320,
          yoyo: true,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            actor.setPosition(baseX, baseY);
            actor.setAngle(0);
            Juice.squashAndStretch(this, actor, 0.22, 130);
          }
        });
        break;

      case 'sparkle-sneeze':
        this.tweens.add({
          targets: actor,
          scaleX: 0.85,
          scaleY: 1.2,
          y: baseY - 16,
          duration: 170,
          ease: 'Quad.easeOut',
          onComplete: () => {
            Juice.shake(this, 140, 0.004);
            Juice.burstStars(this, baseX + 35, baseY - 15, 22, [0xfef08a, 0x34d399, 0xffffff]);
            Juice.squashAndStretch(this, actor, 0.25, 150);
            actor.y = baseY;
          }
        });
        break;

      case 'fly-circle':
        this.tweens.addCounter({
          from: 0,
          to: Math.PI * 2,
          duration: 620,
          onUpdate: (tween) => {
            const val = tween.getValue() ?? 0;
            actor.x = baseX + Math.sin(val) * 34;
            actor.y = baseY - Math.sin(val * 2) * 20;
          },
          onComplete: () => {
            actor.setPosition(baseX, baseY);
            Juice.squashAndStretch(this, actor, 0.18, 120);
          }
        });
        break;

      case 'conga-hop':
        this.tweens.add({
          targets: actor,
          x: baseX + 28,
          y: baseY - 22,
          angle: 9,
          duration: 145,
          yoyo: true,
          repeat: 2,
          ease: 'Quad.easeOut',
          onComplete: () => {
            actor.setPosition(baseX, baseY);
            actor.setAngle(0);
            Juice.squashAndStretch(this, actor, 0.2, 125);
          }
        });
        break;

      case 'smoke-hearts':
        Juice.squashAndStretch(this, actor, 0.22, 145);
        for (let i = 0; i < 4; i++) {
          this.time.delayedCall(i * 140, () => {
            if (!this.scene.isActive() || !this.textures.exists('p1-pixel-smoke-puff')) return;
            const ring = this.add
              .image(baseX + Phaser.Math.Between(-18, 18), baseY - 35, 'p1-pixel-smoke-puff')
              .setOrigin(0.5)
              .setDepth(450);
            this.tweens.add({
              targets: ring,
              y: baseY - 125 - i * 20,
              scaleX: 2.0,
              scaleY: 2.0,
              alpha: 0,
              duration: 700,
              ease: 'Sine.easeOut',
              onComplete: () => ring.destroy()
            });
          });
        }
        break;

      case 'hug-hearts':
        this.tweens.add({
          targets: actor,
          y: baseY - 20,
          scaleX: 1.07,
          scaleY: 1.09,
          duration: 180,
          yoyo: true,
          repeat: 1,
          ease: 'Sine.easeOut',
          onComplete: () => {
            actor.setPosition(baseX, baseY);
            Juice.squashAndStretch(this, actor, 0.16, 130);
          }
        });
        for (let i = 0; i < 6; i++) {
          this.time.delayedCall(i * 75, () => {
            if (!this.scene.isActive() || !this.textures.exists('p1-pixel-heart')) return;
            const hx = baseX + Phaser.Math.Between(-110, 110);
            const hy = baseY + Phaser.Math.Between(-100, -20);
            const heart = this.add
              .image(hx, hy, 'p1-pixel-heart')
              .setOrigin(0.5)
              .setScale(1.25)
              .setDepth(460);
            this.tweens.add({
              targets: heart,
              y: hy - 85,
              scaleX: 1.6,
              scaleY: 1.6,
              alpha: 0,
              duration: 680,
              ease: 'Cubic.easeOut',
              onComplete: () => heart.destroy()
            });
          });
        }
        break;

      case 'suitcases-slide':
        this.tweens.add({
          targets: actor,
          x: { from: baseX - 24, to: baseX + 24 },
          y: baseY - 10,
          angle: { from: -5, to: 5 },
          duration: 130,
          yoyo: true,
          repeat: 2,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            actor.setPosition(baseX, baseY);
            actor.setAngle(0);
            Juice.squashAndStretch(this, actor, 0.2, 120);
          }
        });
        break;

      case 'jet-nose-tilt':
        this.tweens.add({
          targets: actor,
          x: baseX - 22,
          y: baseY - 14,
          angle: 7,
          scaleX: 1.06,
          scaleY: 1.06,
          duration: 280,
          yoyo: true,
          hold: 120,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            actor.setPosition(baseX, baseY);
            actor.setAngle(0);
          }
        });
        for (let i = 0; i < 8; i++) {
          const breeze = this.add
            .circle(
              baseX + Phaser.Math.Between(-140, 140),
              baseY + Phaser.Math.Between(-20, 30),
              Phaser.Math.Between(4, 8),
              0xe0f2fe,
              0.85
            )
            .setDepth(450);
          this.tweens.add({
            targets: breeze,
            x: breeze.x + Phaser.Math.Between(70, 140),
            alpha: 0,
            scaleX: 2.2,
            duration: 460,
            ease: 'Quad.easeOut',
            onComplete: () => breeze.destroy()
          });
        }
        break;

      case 'split-flap-jitter':
        this.tweens.add({
          targets: actor,
          y: { from: baseY - 5, to: baseY + 5 },
          scaleY: { from: 0.92, to: 1.08 },
          duration: 48,
          yoyo: true,
          repeat: 5,
          onComplete: () => {
            actor.setPosition(baseX, baseY);
            actor.setScale(1, 1);
          }
        });
        break;

      case 'spin-sails':
        this.tweens.add({
          targets: actor,
          angle: 360,
          scaleX: 1.12,
          scaleY: 1.12,
          duration: 620,
          ease: 'Cubic.easeInOut',
          onComplete: () => {
            actor.setAngle(0);
            Juice.squashAndStretch(this, actor, 0.2, 130);
          }
        });
        break;

      case 'sandcastle-upgrade': {
        const nextStage = (tapIndex % 3) + 1;
        actor.setData('sandcastleStage', nextStage);
        entry.placeholderNode.removeAll(true);
        this.drawHotspotVisualProp(entry.placeholderNode, hotspot.propType, nextStage);
        Juice.squashAndStretch(this, actor, 0.3, 175);
        break;
      }

      case 'rocking-lullaby':
        this.tweens.add({
          targets: actor,
          angle: { from: -7, to: 7 },
          duration: 280,
          yoyo: true,
          repeat: 2,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            actor.setAngle(0);
            Juice.squashAndStretch(this, actor, 0.14, 120);
          }
        });
        Juice.burstStars(this, baseX, baseY - 45, 10, [0xf472b6, 0xfde047, 0xffffff]);
        break;

      case 'log-toss':
        this.tweens.add({
          targets: actor,
          x: baseX + 90,
          y: baseY - 80,
          angle: 140,
          duration: 300,
          yoyo: true,
          ease: 'Quad.easeOut',
          onComplete: () => {
            actor.setPosition(baseX, baseY);
            actor.setAngle(0);
            Juice.burstStars(this, baseX + 100, baseY - 75, 18, [0xf97316, 0xfacc15, 0xef4444]);
            Juice.squashAndStretch(this, actor, 0.22, 135);
          }
        });
        break;

      case 'drive-zoom':
        this.tweens.add({
          targets: actor,
          x: baseX + 65,
          y: baseY - 10,
          scaleX: 1.08,
          duration: 230,
          yoyo: true,
          repeat: 1,
          ease: 'Cubic.easeInOut',
          onComplete: () => {
            actor.setPosition(baseX, baseY);
            Juice.squashAndStretch(this, actor, 0.2, 125);
          }
        });
        break;
    }
  }

  private drawHotspotVisualProp(
    container: Phaser.GameObjects.Container,
    propType: HotspotPropType,
    stage: number = 1
  ): void {
    if (propType === 'sparky') {
      const shadow = this.add.ellipse(0, 52, 96, 24, 0x000000, 0.28);
      const sprite = this.add.image(0, 0, 'avatar-sparky').setScale(1.25);
      container.add([shadow, sprite]);
      return;
    }

    if (propType === 'doggie') {
      const shadow = this.add.ellipse(0, 50, 88, 22, 0x000000, 0.28);
      const sprite = this.add.image(0, 0, 'avatar-doggie').setScale(1.18);
      container.add([shadow, sprite]);
      return;
    }

    const g = this.add.graphics();
    container.add(g);

    switch (propType) {
      case 'emma-sandcastle': {
        g.fillStyle(0x000000, 0.18);
        g.fillEllipse(0, 52, 180, 28);
        g.fillStyle(0xfbbf24, 1);
        g.fillEllipse(0, 36, 155, 48);
        g.fillStyle(0xf59e0b, 1);
        g.fillRoundedRect(-44, -6, 88, 48, 12);

        if (stage >= 2) {
          g.fillStyle(0xf59e0b, 1);
          g.fillRoundedRect(-82, 4, 42, 42, 8);
          g.fillRoundedRect(40, 4, 42, 42, 8);
          g.fillStyle(0xfbbf24, 1);
          g.fillRect(-36, -24, 72, 22);
          g.fillStyle(0x38bdf8, 0.85);
          g.fillEllipse(0, 48, 165, 16);
        }

        if (stage >= 3) {
          g.fillStyle(0xd97706, 1);
          g.fillTriangle(-28, -24, 0, -68, 28, -24);
          g.fillTriangle(-82, 4, -61, -30, -40, 4);
          g.fillTriangle(40, 4, 61, -30, 82, 4);
          g.lineStyle(3, 0x78350f, 1);
          g.lineBetween(0, -68, 0, -90);
          g.fillStyle(0xef4444, 1);
          g.fillTriangle(0, -90, 0, -74, 26, -82);
          const crab = this.add.text(0, -42, '🦀👑', { fontSize: '30px' }).setOrigin(0.5);
          container.add(crab);
        } else {
          g.fillStyle(0xef4444, 1);
          g.fillRoundedRect(-22, -32, 44, 28, 6);
        }
        break;
      }

      case 'windmill-sparky': {
        g.fillStyle(0x78350f, 1);
        g.fillTriangle(-48, 85, 0, -35, 48, 85);
        g.lineStyle(7, 0xfef08a, 1);
        g.lineBetween(-78, -78, 78, 78);
        g.lineBetween(-78, 78, 78, -78);
        g.fillStyle(0xef4444, 0.88);
        g.fillRect(14, -74, 22, 54);
        g.fillRect(-36, 20, 22, 54);
        g.fillRect(-74, -36, 54, 22);
        g.fillRect(20, 14, 54, 22);
        g.fillStyle(0xfbbf24, 1);
        g.fillCircle(0, 0, 14);
        const miniSparky = this.add.image(42, -42, 'avatar-sparky').setScale(0.58);
        container.add(miniSparky);
        break;
      }

      case 'nana-blanket-lullaby': {
        g.fillStyle(0x000000, 0.28);
        g.fillEllipse(0, 74, 210, 32);
        g.lineStyle(7, 0x78350f, 1);
        g.strokeEllipse(0, 62, 180, 28);
        g.fillStyle(0x92400e, 1);
        g.fillRoundedRect(-68, -68, 136, 128, 28);
        g.fillStyle(0x1e1b4b, 1);
        g.fillRoundedRect(-74, -10, 148, 78, 32);
        g.lineStyle(3, 0x38bdf8, 0.65);
        g.strokeRoundedRect(-74, -10, 148, 78, 32);
        const faces = this.add.text(0, -24, '👵👦👧🐶', { fontSize: '38px' }).setOrigin(0.5);
        const heart = this.add
          .text(0, 26, '🌙 Cozy Blanket Lullaby ♥', {
            fontFamily: '"Fredoka", Georgia, serif',
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#fef08a'
          })
          .setOrigin(0.5);
        container.add([faces, heart]);
        break;
      }

      default: {
        const emojiMap: Partial<Record<HotspotPropType, string>> = {
          'nana-papa-hug': '👵👴❤️',
          'runway-jet': '✈️🐉',
          'baggage-doggie': '🧳🐶',
          'carousel-suitcases': '🧳🏷️',
          'flight-board': '🪧✈️',
          'grr-terminal-sign': '🪧🔔',
          'welcome-balloon': '🎈⭐',
          'horseshoe-driveway': '🛴🛣️',
          'white-mailbox': '📬🐦',
          'front-porch-papa': '👴👋',
          'garden-flowers': '🌷🌸',
          'grammy-recliner': '🛋️👵💖',
          'cuckoo-clock': '🕰️🐦',
          'musical-teacup': '☕🎵',
          'doggie-pillow': '🛋️🐶',
          'family-photo': '🖼️✨',
          'vintage-horn': '🚗📯',
          'winking-headlights': '🚘💡',
          'rock-radio': '📻🎶',
          'red-paddle': '🏓🔴',
          'workbench-tools': '🔧🔨',
          'wooden-clogs': '👞🎶',
          'brick-bakery-1613': '🥨🏠',
          'autumn-butterflies': '🦋🌼',
          'street-lamp': '🏮✨',
          'peeking-kitty': '🐱🪟',
          'canal-bullfrogs': '🐸🪷',
          'red-drawbridge': '🌉👦👧',
          'canal-tulips': '🌷🌷',
          'papa-skipping-stones': '👴🪨💦',
          'splashing-waves': '🌊👣',
          'beach-umbrella': '⛱️🌈',
          'seagull-hat': '🐦🎩',
          'yard-geese': '🪿🪿🎶',
          'juliet-balcony': '🪵👴🐉',
          'silver-chimney': '🏠🤍💨',
          'wind-chimes': '🎐🎵',
          'woodland-deer': '🦌🌲',
          'wall-ducks': '🦆🦆🪵',
          'whistling-kettle': '🫖💨',
          'owl-trivet': '🦉🔥',
          'toy-trucks': '🛻🚜',
          'ducks-unlimited-logs': '🪵🔥',
          'pine-squirrel': '🐿️🌰',
          backpack: '🎒',
          'turtle-rock': '🐢',
          'lily-pad': '🪷',
          ducks: '🦆🐤',
          'hollow-skunk': '🦨',
          mushrooms: '🍄',
          'firefly-jar': '🏮',
          'shooting-star': '🌠',
          moon: '🌙',
          'guitar-cricket': '🦗',
          'sleeping-bag': '🛌',
          'sandcastle-crab': '🦀',
          'ocean-whale': '🐳',
          'tent-zipper': '⛺',
          'frog-boot': '🥾🐸',
          'owl-tree': '🦉',
          campfire: '🔥',
          'marshmallow-log': '🍡',
          'lake-fish': '🐟'
        };

        g.fillStyle(0x271206, 0.22);
        g.fillEllipse(0, 42, 110, 24);
        g.fillStyle(0xfdf8ec, 0.26);
        g.fillCircle(0, 0, 50);
        g.lineStyle(2, 0xfef08a, 0.45);
        g.strokeCircle(0, 0, 50);

        const emojiTxt = this.add
          .text(0, 0, emojiMap[propType] ?? '✨', {
            fontSize: '48px'
          })
          .setOrigin(0.5);
        container.add(emojiTxt);
        break;
      }
    }
  }

  private drawPageBackdrop(page: StoryPageData): void {
    const g = this.add.graphics();
    this.backdropContainer.add(g);

    switch (page.theme) {
      case 'nana-p4-convertible': {
        g.fillGradientStyle(0xe2e8f0, 0xe2e8f0, 0xf1f5f9, 0xcbd5e1, 1);
        g.fillRect(0, 0, 1280, 720);
        g.fillStyle(0x7dd3fc, 0.75);
        g.fillRect(140, 150, 720, 290);
        g.fillStyle(0x94a3b8, 1);
        g.fillRect(0, 440, 1280, 280);
        g.fillStyle(0xffffff, 1);
        g.fillRoundedRect(260, 405, 660, 150, 38);
        g.lineStyle(4, 0x475569, 0.8);
        g.strokeRoundedRect(260, 405, 660, 150, 38);
        g.fillStyle(0x1e293b, 1);
        g.fillCircle(395, 555, 52);
        g.fillCircle(785, 555, 52);
        g.fillStyle(0xf8fafc, 1);
        g.fillCircle(395, 555, 28);
        g.fillCircle(785, 555, 28);
        break;
      }

      default: {
        g.fillGradientStyle(0x38bdf8, 0x38bdf8, 0xbae6fd, 0xfdf8ec, 1);
        g.fillRect(0, 0, 1280, 720);
        g.fillStyle(0x10b981, 0.35);
        g.fillRect(0, 470, 1280, 250);
        break;
      }
    }
  }

  /**
   * Renders the `Shift + D` (`import.meta.env.DEV` only) Visual Drag-and-Resize Hotspot Editor:
   * - Cyan hitbox outlines (`left, top, hitW, hitH`)
   * - Red center crosshair (`x, y`)
   * - Interactive magenta/gold bottom-right resize handle (`right, bottom`)
   * - Coordinate label tag above each box
   */
  private refreshDebugOverlay(): void {
    this.debugGraphics.clear();
    this.debugLabelsContainer.removeAll(true);
    this.debugHudContainer.setVisible(this.debugEnabled);

    if (!this.debugEnabled) return;

    const page = this.getCurrentPage();

    page.hotspots.forEach((h) => {
      const hitW = Math.max(64, h.width);
      const hitH = Math.max(64, h.height);
      const left = h.x - hitW / 2;
      const top = h.y - hitH / 2;
      const right = left + hitW;
      const bottom = top + hitH;

      // Translucent cyan drag box
      this.debugGraphics.fillStyle(0x22d3ee, 0.16);
      this.debugGraphics.fillRect(left, top, hitW, hitH);
      this.debugGraphics.lineStyle(2.5, 0x22d3ee, 1);
      this.debugGraphics.strokeRect(left, top, hitW, hitH);

      // Center crosshair
      this.debugGraphics.lineStyle(2, 0xf43f5e, 1);
      this.debugGraphics.lineBetween(h.x - 10, h.y, h.x + 10, h.y);
      this.debugGraphics.lineBetween(h.x, h.y - 10, h.x, h.y + 10);

      // Bottom-right corner resize handle (magenta square with gold border)
      this.debugGraphics.fillStyle(0xf43f5e, 1);
      this.debugGraphics.fillRect(right - 9, bottom - 9, 18, 18);
      this.debugGraphics.lineStyle(2, 0xfef08a, 1);
      this.debugGraphics.strokeRect(right - 9, bottom - 9, 18, 18);

      const tag = this.add
        .text(h.x, Math.max(14, top - 12), `${h.id} (${h.x}, ${h.y}) [${hitW}x${hitH}]`, {
          fontFamily: 'monospace',
          fontSize: '12px',
          backgroundColor: '#0f172add',
          color: '#fef08a',
          padding: { x: 5, y: 2 }
        })
        .setOrigin(0.5);
      this.debugLabelsContainer.add(tag);
    });
  }
}
