/**
 * ArtStudioScene.ts
 * -----------------
 * Full-Screen (1280x720) Heirloom Art & Sticker Studio ("Kid Pix meets Living Books").
 *
 * Upgraded 100% Icon-Driven Architecture for Ages 3–4 (Zero Reading Required):
 * - Maximized Studio Canvas (`x: 172, y: 28, width: 936, height: 560` — +52% larger area!):
 *   - Layer A (`depth: 10`): Offscreen HTML5 Canvas / Phaser CanvasTexture (`936x560`) initialized
 *     to warm cream parchment (`#fdf5d8`) for Wax Crayon, Watercolor & Glitter, 3-Mode Roller
 *     (Continuous Train Tracks, Alternating Puppy Paws, and Sparky Dragon Tracks), and BFS Paint Bucket.
 *   - Layer B (`depth: 20`): Transparent-background Coloring Book Ink Overlay (`tpl-01`..`tpl-12`, `936x560`)
 *     so children's strokes naturally color *underneath* crisp black line-art without erasing ink!
 *   - Layer C (`depth: 30`): Clipped Living Animated Stickers container (`172, 28, 936, 560`) holding
 *     placed 3-frame animated sprites that loop gently, play ElevenLabs SFX on tap, and can be dragged.
 * - 5 Left Mahogany Cubbies (`x: 64` center, `y: 88, 198, 308, 418, 528`):
 *   - Illustrated 32-bit sprites (`tool-crayon`, `tool-glitter-brush`, `tool-roller` with visual 3-mode badge,
 *     `tool-bucket`, and side-by-side `tool-undo` + `tool-sponge`) with warm golden radial glow + gentle bobbing.
 * - 4 Right Apothecary Shelves (`x: 1214` center, `y: 95, 230, 365, 500`):
 *   - Displays 4 Living Animated Stickers or 4 large `118x78` Coloring Page visual previews with zero text.
 * - Bottom Trough (`y: 662`):
 *   - `tool-bookshelf` (`x: 64, y: 662`), 12 layered heirloom brass paint wells (`ui-paint-well-fill` +
 *     `ui-paint-well-rim` at `x: 198..748`), 3 brass brush-size wells (`x: 810, 860, 910`),
 *     `ui-brass-frame` + `tool-sticker-box` toggle (`x: 1005, y: 662`), and `ui-page-left` / `ui-page-right`
 *     brass scroll medallions (`x: 1156, 1252, y: 662`) with golden indicator dots (`x: 1204, y: 662`).
 */

import Phaser from 'phaser';
import { ArcadeState } from '../core/ArcadeState';
import { AudioBus } from '../core/AudioBus';
import { Juice } from '../core/Juice';

type StudioToolId = 'crayon' | 'watercolor' | 'roller' | 'bucket';
type RollerModeId = 'tracks' | 'paws' | 'dragon';
type RightRackMode = 'stickers' | 'templates';

interface PaintColorSpec {
  hex: string;
  num: number;
  r: number;
  g: number;
  b: number;
}

interface LivingStickerSpec {
  id: string;
  texKey: string;
  numFrames: number;
  sfxPath: string;
  previewScale: number;
  canvasScale: number;
}

interface ColoringTemplateSpec {
  id: string;
  texKey: string;
}

interface PlacedStickerRecord {
  uid: number;
  spec: LivingStickerSpec;
  sprite: Phaser.GameObjects.Sprite;
  frameTimer: Phaser.Time.TimerEvent;
}

type UndoAction =
  | { type: 'paint'; imageData: ImageData }
  | { type: 'add-sticker'; uid: number };

const PAINT_POTS_ALL: PaintColorSpec[] = [
  { hex: '#e63946', num: 0xe63946, r: 230, g: 57, b: 70 },
  { hex: '#f4a261', num: 0xf4a261, r: 244, g: 162, b: 97 },
  { hex: '#e9c46a', num: 0xe9c46a, r: 233, g: 196, b: 106 },
  { hex: '#ff758f', num: 0xff758f, r: 255, g: 117, b: 143 },
  { hex: '#8d5b4c', num: 0x8d5b4c, r: 141, g: 91, b: 76 },
  { hex: '#fffdf7', num: 0xfffdf7, r: 255, g: 253, b: 247 },
  { hex: '#2a9d8f', num: 0x2a9d8f, r: 42, g: 157, b: 143 },
  { hex: '#52b788', num: 0x52b788, r: 82, g: 183, b: 136 },
  { hex: '#4cc9f0', num: 0x4cc9f0, r: 76, g: 201, b: 240 },
  { hex: '#3a86ff', num: 0x3a86ff, r: 58, g: 134, b: 255 },
  { hex: '#8338ec', num: 0x8338ec, r: 131, g: 56, b: 236 },
  { hex: '#2b2d42', num: 0x2b2d42, r: 43, g: 45, b: 66 }
];

const LIVING_STICKERS: LivingStickerSpec[] = [
  {
    id: 'sparky',
    texKey: 'p1-sprite-sparky',
    numFrames: 3,
    sfxPath: '/assets/stories/nana/audio/sfx-sparky-happy.mp3',
    previewScale: 0.13,
    canvasScale: 0.21
  },
  {
    id: 'doggie',
    texKey: 'p1-sprite-doggie',
    numFrames: 4,
    sfxPath: '/assets/stories/nana/audio/sfx-doggie-bark.mp3',
    previewScale: 0.16,
    canvasScale: 0.25
  },
  {
    id: 'wyatt',
    texKey: 'p8-sprite-kids-running',
    numFrames: 3,
    sfxPath: '/assets/stories/nana/audio/sfx-kids-cabin-laugh.mp3',
    previewScale: 0.34,
    canvasScale: 0.52
  },
  {
    id: 'emma',
    texKey: 'p7-sprite-kids-sandcastle',
    numFrames: 3,
    sfxPath: '/assets/stories/nana/audio/sfx-kids-sandcastle.mp3',
    previewScale: 0.28,
    canvasScale: 0.45
  },
  {
    id: 'nana',
    texKey: 'p8-sprite-nana-porch',
    numFrames: 3,
    sfxPath: '/assets/stories/nana/audio/sfx-nana-cocoa.mp3',
    previewScale: 0.22,
    canvasScale: 0.35
  },
  {
    id: 'papa',
    texKey: 'p7-sprite-papa-skipping',
    numFrames: 3,
    sfxPath: '/assets/stories/nana/audio/sfx-papa-stoneskip.mp3',
    previewScale: 0.29,
    canvasScale: 0.45
  },
  {
    id: 'roadster',
    texKey: 'p4-sprite-car-doggie',
    numFrames: 3,
    sfxPath: '/assets/stories/nana/audio/sfx-car-horn-rev.mp3',
    previewScale: 0.12,
    canvasScale: 0.24
  },
  {
    id: 'tugboat',
    texKey: 'p7-sprite-sailboat-horizon',
    numFrames: 3,
    sfxPath: '/assets/stories/nana/audio/sfx-sailboat-splash.mp3',
    previewScale: 0.3,
    canvasScale: 0.48
  },
  {
    id: 'kayak',
    texKey: 'p6-sprite-butterflies',
    numFrames: 3,
    sfxPath: '/assets/stories/nana/audio/sfx-butterflies-magic.mp3',
    previewScale: 0.25,
    canvasScale: 0.38
  },
  {
    id: 'tractor',
    texKey: 'p4-sprite-compressor',
    numFrames: 3,
    sfxPath: '/assets/stories/nana/audio/sfx-air-compressor.mp3',
    previewScale: 0.16,
    canvasScale: 0.26
  },
  {
    id: 'bluejay',
    texKey: 'p8-sprite-bluejay-porch',
    numFrames: 3,
    sfxPath: '/assets/stories/nana/audio/sfx-bluejay-whistle.mp3',
    previewScale: 0.3,
    canvasScale: 0.46
  },
  {
    id: 'squirrel',
    texKey: 'p2-sprite-squirrel',
    numFrames: 3,
    sfxPath: '/assets/stories/nana/audio/sfx-squirrel-chatter.mp3',
    previewScale: 0.1,
    canvasScale: 0.18
  },
  {
    id: 'deer',
    texKey: 'p8-sprite-forest-deer',
    numFrames: 3,
    sfxPath: '/assets/stories/nana/audio/sfx-forest-deer.mp3',
    previewScale: 0.24,
    canvasScale: 0.38
  },
  {
    id: 'geese',
    texKey: 'p8-sprite-canada-geese',
    numFrames: 3,
    sfxPath: '/assets/stories/nana/audio/sfx-geese-honk.mp3',
    previewScale: 0.26,
    canvasScale: 0.4
  },
  {
    id: 'crab',
    texKey: 'p7-sprite-seagulls-bucket',
    numFrames: 3,
    sfxPath: '/assets/stories/nana/audio/sfx-seagulls-squawk.mp3',
    previewScale: 0.28,
    canvasScale: 0.44
  },
  {
    id: 'fire',
    texKey: 'p9-sprite-stove-fire',
    numFrames: 3,
    sfxPath: '/assets/stories/nana/audio/sfx-sparky-smores.mp3',
    previewScale: 0.34,
    canvasScale: 0.52
  }
];

const COLORING_TEMPLATES: ColoringTemplateSpec[] = [
  { id: 'blank', texKey: 'tpl-01-blank' },
  { id: 'sparky-doggie', texKey: 'tpl-02-sparky-doggie' },
  { id: 'roadster', texKey: 'tpl-03-roadster' },
  { id: 'tugboat', texKey: 'tpl-04-tugboat' },
  { id: 'windmill', texKey: 'tpl-05-windmill' },
  { id: 'airport', texKey: 'tpl-06-airport' },
  { id: 'nanas-house', texKey: 'tpl-07-nanas-house' },
  { id: 'garage', texKey: 'tpl-08-garage' },
  { id: 'beach', texKey: 'tpl-09-beach' },
  { id: 'cabin', texKey: 'tpl-10-cabin' },
  { id: 'critters', texKey: 'tpl-11-critters' },
  { id: 'bedtime', texKey: 'tpl-12-bedtime' }
];

const BRUSH_RADII = [7, 16, 28];

export class ArtStudioScene extends Phaser.Scene {
  private readonly CANVAS_X = 172;
  private readonly CANVAS_Y = 28;
  private readonly CANVAS_W = 936;
  private readonly CANVAS_H = 560;

  private paintCanvasTex!: Phaser.Textures.CanvasTexture;
  private paintCtx!: CanvasRenderingContext2D;
  private paintImage!: Phaser.GameObjects.Image;
  private templateOverlayImage!: Phaser.GameObjects.Image;
  private stickerLayerContainer!: Phaser.GameObjects.Container;

  private leftCubbiesContainer!: Phaser.GameObjects.Container;
  private rightRackContainer!: Phaser.GameObjects.Container;
  private bottomTroughContainer!: Phaser.GameObjects.Container;

  private activeTool: StudioToolId = 'crayon';
  private rollerMode: RollerModeId = 'tracks';
  private activeColor: PaintColorSpec = PAINT_POTS_ALL[0];
  private activeBrushIdx: number = 1; // Medium
  private activeTemplateIdx: number = 1; // Default to Sparky & Doggie coloring page
  private rightRackMode: RightRackMode = 'stickers';
  private stickerPage: number = 0;
  private templatePage: number = 0;

  private isDrawing: boolean = false;
  private lastDrawX: number = 0;
  private lastDrawY: number = 0;
  private rollerAnchorX: number = 0;
  private rollerAnchorY: number = 0;
  private rollerStepSide: number = 1;

  private undoStack: UndoAction[] = [];
  private placedStickers: PlacedStickerRecord[] = [];
  private nextStickerUid: number = 1;
  private spongeConfirmArmed: boolean = false;
  private spongeConfirmTimer?: Phaser.Time.TimerEvent;
  private isSweepingSponge: boolean = false;

  // Cached template alpha map (936x560) for ink-aware Paint Bucket flood-fill
  private templateAlphaMap: Uint8ClampedArray = new Uint8ClampedArray(936 * 560);

  constructor() {
    super({ key: 'ArtStudioScene' });
  }

  public create(): void {
    this.undoStack = [];
    this.placedStickers = [];
    this.isDrawing = false;
    this.spongeConfirmArmed = false;
    this.isSweepingSponge = false;

    this.ensureRadialGlowTexture();

    // 1. Full-Screen Mahogany & Brass Studio Frame (`1280x720` with `936x560` center canvas)
    if (this.textures.exists('studio-frame-bg')) {
      this.textures.get('studio-frame-bg').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.add
        .image(640, 360, 'studio-frame-bg')
        .setOrigin(0.5, 0.5)
        .setDisplaySize(1280, 720)
        .setDepth(1);
    } else {
      const bg = this.add.graphics().setDepth(1);
      bg.fillStyle(0x2a1508, 1);
      bg.fillRect(0, 0, 1280, 720);
    }

    // 2. Initialize 3-Layer Canvas Architecture (`x: 172, y: 28, width: 936, height: 560`)
    this.initLayeredStudioCanvas();

    // 3. UI Containers for Left Tool Cubbies, Right Apothecary Shelves, and Bottom Trough
    this.leftCubbiesContainer = this.add.container(0, 0).setDepth(50);
    this.rightRackContainer = this.add.container(0, 0).setDepth(50);
    this.bottomTroughContainer = this.add.container(0, 0).setDepth(50);

    this.renderLeftToolCubbies();
    this.renderRightApothecaryRack();
    this.renderBottomWoodenTrough();

    this.cameras.main.fadeIn(260, 15, 10, 6);
  }

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
   * Sets up Layer A (Paint CanvasTexture `depth: 10`), Layer B (Coloring Book Ink Overlay `depth: 20`),
   * and Layer C (Clipped Living Animated Stickers Container `depth: 30`) at `(172, 28, 936, 560)`.
   */
  private initLayeredStudioCanvas(): void {
    const texKey = 'art-studio-paint-surface';
    if (this.textures.exists(texKey)) {
      this.textures.remove(texKey);
    }

    const canvasTex = this.textures.createCanvas(texKey, this.CANVAS_W, this.CANVAS_H);
    if (!canvasTex) return;
    this.paintCanvasTex = canvasTex;
    this.paintCtx = canvasTex.getContext();

    this.fillCanvasWithParchment();

    // Layer A: Paint Surface (`depth: 10`)
    this.paintImage = this.add
      .image(this.CANVAS_X, this.CANVAS_Y, texKey)
      .setOrigin(0, 0)
      .setDepth(10);

    // Layer B: Coloring Book Ink Overlay (`depth: 20`)
    const initialTpl = COLORING_TEMPLATES[this.activeTemplateIdx];
    this.templateOverlayImage = this.add
      .image(this.CANVAS_X, this.CANVAS_Y, initialTpl.texKey)
      .setOrigin(0, 0)
      .setDisplaySize(this.CANVAS_W, this.CANVAS_H)
      .setDepth(20);
    this.rebuildTemplateAlphaMap(initialTpl.texKey);

    // Layer C: Clipped Living Animated Stickers Container (`depth: 30`)
    this.stickerLayerContainer = this.add.container(0, 0).setDepth(30);
    const maskG = this.make.graphics({ x: 0, y: 0 });
    maskG.fillStyle(0xffffff, 1);
    maskG.fillRect(this.CANVAS_X, this.CANVAS_Y, this.CANVAS_W, this.CANVAS_H);
    this.stickerLayerContainer.setMask(maskG.createGeometryMask());

    // Interactive Drawing Surface over `(172, 28, 936, 560)` at `depth: 25`
    const drawZone = this.add
      .zone(this.CANVAS_X, this.CANVAS_Y, this.CANVAS_W, this.CANVAS_H)
      .setOrigin(0, 0)
      .setDepth(25)
      .setInteractive({ useHandCursor: true });

    drawZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isSweepingSponge) return;
      const lx = Math.floor(pointer.x - this.CANVAS_X);
      const ly = Math.floor(pointer.y - this.CANVAS_Y);
      if (lx < 0 || lx >= this.CANVAS_W || ly < 0 || ly >= this.CANVAS_H) return;

      this.disarmSpongeConfirm();
      this.pushPaintUndoSnapshot();

      if (this.activeTool === 'bucket') {
        AudioBus.playSfx('pop');
        this.floodFillCanvas(lx, ly, this.activeColor);
        Juice.burstStars(this, pointer.x, pointer.y, 12, [this.activeColor.num, 0xfef08a, 0xffffff]);
        return;
      }

      this.isDrawing = true;
      this.lastDrawX = lx;
      this.lastDrawY = ly;
      this.rollerAnchorX = lx;
      this.rollerAnchorY = ly;
      this.rollerStepSide = 1;

      if (this.activeTool === 'crayon') {
        AudioBus.playSfx('pop');
        this.stampWaxCrayonDab(lx, ly);
        this.paintCanvasTex.refresh();
      } else if (this.activeTool === 'watercolor') {
        AudioBus.playSfx('chime');
        this.stampWatercolorDab(lx, ly, pointer.x, pointer.y);
        this.paintCanvasTex.refresh();
      } else if (this.activeTool === 'roller') {
        AudioBus.playSfx(this.rollerMode === 'paws' ? 'doggie' : this.rollerMode === 'dragon' ? 'sparky' : 'pop');
        if (this.rollerMode === 'paws') {
          this.stampPuppyPawPrint(lx, ly, 0, 1);
          this.rollerStepSide = -1;
        } else if (this.rollerMode === 'dragon') {
          this.stampDragonFootprint(lx, ly, 0, 1);
          this.rollerStepSide = -1;
        } else {
          this.stampRailroadCrossTie(lx, ly, 1, 0, 0, 1);
        }
        this.paintCanvasTex.refresh();
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDrawing || !pointer.isDown || this.isSweepingSponge) return;
      const lx = Phaser.Math.Clamp(Math.floor(pointer.x - this.CANVAS_X), 0, this.CANVAS_W - 1);
      const ly = Phaser.Math.Clamp(Math.floor(pointer.y - this.CANVAS_Y), 0, this.CANVAS_H - 1);

      this.drawInterpolatedSegment(this.lastDrawX, this.lastDrawY, lx, ly);
      this.lastDrawX = lx;
      this.lastDrawY = ly;
      this.paintCanvasTex.refresh();
    });

    this.input.on('pointerup', () => {
      this.isDrawing = false;
    });
  }

  private fillCanvasWithParchment(): void {
    this.paintCtx.fillStyle = '#fdf5d8';
    this.paintCtx.fillRect(0, 0, this.CANVAS_W, this.CANVAS_H);
    this.paintCanvasTex.refresh();
  }

  private pushPaintUndoSnapshot(): void {
    const snap = this.paintCtx.getImageData(0, 0, this.CANVAS_W, this.CANVAS_H);
    this.undoStack.push({ type: 'paint', imageData: snap });
    if (this.undoStack.length > 12) {
      this.undoStack.shift();
    }
  }

  private performUndo(): void {
    if (this.isSweepingSponge) return;
    const action = this.undoStack.pop();
    if (!action) {
      AudioBus.playSfx('boing');
      return;
    }

    AudioBus.playSfx('pop');
    if (action.type === 'paint') {
      this.paintCtx.putImageData(action.imageData, 0, 0);
      this.paintCanvasTex.refresh();
    } else if (action.type === 'add-sticker') {
      this.removeStickerByUid(action.uid);
    }
  }

  private rebuildTemplateAlphaMap(texKey: string): void {
    this.templateAlphaMap.fill(0);
    if (!this.textures.exists(texKey) || texKey === 'tpl-01-blank') return;

    const srcImg = this.textures.get(texKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    if (!srcImg) return;

    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = this.CANVAS_W;
    tmpCanvas.height = this.CANVAS_H;
    const tmpCtx = tmpCanvas.getContext('2d');
    if (!tmpCtx) return;

    tmpCtx.drawImage(srcImg, 0, 0, this.CANVAS_W, this.CANVAS_H);
    const imgData = tmpCtx.getImageData(0, 0, this.CANVAS_W, this.CANVAS_H).data;
    for (let i = 0; i < this.CANVAS_W * this.CANVAS_H; i++) {
      this.templateAlphaMap[i] = imgData[i * 4 + 3];
    }
  }

  private drawInterpolatedSegment(x0: number, y0: number, x1: number, y1: number): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;

    if (this.activeTool === 'roller') {
      this.advanceRollerPath(x1, y1);
      return;
    }

    const radius = BRUSH_RADII[this.activeBrushIdx];
    const step = Math.max(2, radius * 0.28);
    const steps = Math.ceil(dist / step);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const ix = x0 + dx * t;
      const iy = y0 + dy * t;
      if (this.activeTool === 'crayon') {
        this.stampWaxCrayonDab(ix, iy);
      } else if (this.activeTool === 'watercolor') {
        const emitSparkle = i === steps && Math.random() < 0.48;
        this.stampWatercolorDab(
          ix,
          iy,
          emitSparkle ? this.CANVAS_X + ix : -1,
          emitSparkle ? this.CANVAS_Y + iy : -1
        );
      }
    }
  }

  /**
   * STEP 4: Advances the 3-Mode Roller along the pointer path from `(rollerAnchorX, rollerAnchorY)` to `(targetX, targetY)`:
   * - `'tracks'`: Every 18px, draws continuous parallel steel/paint rails + perpendicular wooden cross-tie & rail spikes!
   * - `'paws'`: Every 34px, alternates `side = +1 / -1` offset by `normal * 9px` and draws a 4-bean puppy paw print!
   * - `'dragon'`: Every 36px, alternates `side = +1 / -1` offset by `normal * 10px` and draws a 3-clawed Sparky footprint!
   */
  private advanceRollerPath(targetX: number, targetY: number): void {
    const stepDist = this.rollerMode === 'tracks' ? 18 : this.rollerMode === 'paws' ? 34 : 36;

    while (true) {
      const dx = targetX - this.rollerAnchorX;
      const dy = targetY - this.rollerAnchorY;
      const len = Math.hypot(dx, dy);
      if (len < stepDist) break;

      const ux = dx / len;
      const uy = dy / len;
      const nx = -uy;
      const ny = ux;
      const nextX = this.rollerAnchorX + ux * stepDist;
      const nextY = this.rollerAnchorY + uy * stepDist;
      const angle = Math.atan2(dy, dx);

      if (this.rollerMode === 'tracks') {
        this.drawRailroadSegment(this.rollerAnchorX, this.rollerAnchorY, nextX, nextY, ux, uy, nx, ny);
      } else if (this.rollerMode === 'paws') {
        this.stampPuppyPawPrint(nextX, nextY, angle, this.rollerStepSide);
        this.rollerStepSide = -this.rollerStepSide;
      } else {
        this.stampDragonFootprint(nextX, nextY, angle, this.rollerStepSide);
        this.rollerStepSide = -this.rollerStepSide;
      }

      this.rollerAnchorX = nextX;
      this.rollerAnchorY = nextY;
    }
  }

  /**
   * Draws two continuous parallel rail lines connecting `(x0, y0)` to `(x1, y1)` plus a perpendicular
   * wooden cross-tie and two rail spikes at `(x1, y1)`.
   */
  private drawRailroadSegment(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    ux: number,
    uy: number,
    nx: number,
    ny: number
  ): void {
    const size = Math.max(18, BRUSH_RADII[this.activeBrushIdx] * 1.35);
    const railOffset = size * 0.48;
    const ctx = this.paintCtx;

    // 1. Perpendicular wooden cross-tie first (underneath rails)
    this.stampRailroadCrossTie(x1, y1, ux, uy, nx, ny);

    // 2. Two continuous parallel rail lines connecting (x0, y0) to (x1, y1)
    ctx.save();
    ctx.strokeStyle = this.activeColor.hex;
    ctx.lineWidth = Math.max(3, size * 0.17);
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.96;

    // Left rail
    ctx.beginPath();
    ctx.moveTo(x0 + nx * railOffset, y0 + ny * railOffset);
    ctx.lineTo(x1 + nx * railOffset, y1 + ny * railOffset);
    ctx.stroke();

    // Right rail
    ctx.beginPath();
    ctx.moveTo(x0 - nx * railOffset, y0 - ny * railOffset);
    ctx.lineTo(x1 - nx * railOffset, y1 - ny * railOffset);
    ctx.stroke();

    // Two dark/gold rail spikes where the rails cross the tie
    ctx.fillStyle = '#3b1d0a';
    ctx.beginPath();
    ctx.arc(x1 + nx * railOffset, y1 + ny * railOffset, Math.max(1.8, size * 0.09), 0, Math.PI * 2);
    ctx.arc(x1 - nx * railOffset, y1 - ny * railOffset, Math.max(1.8, size * 0.09), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private stampRailroadCrossTie(
    px: number,
    py: number,
    _ux: number,
    _uy: number,
    nx: number,
    ny: number
  ): void {
    const size = Math.max(18, BRUSH_RADII[this.activeBrushIdx] * 1.35);
    const tieHalf = size * 0.72;
    const ctx = this.paintCtx;

    ctx.save();
    // Warm wooden sleeper tie tinted by active color
    ctx.strokeStyle = this.activeColor.hex;
    ctx.lineWidth = 6;
    ctx.lineCap = 'butt';
    ctx.globalAlpha = 0.82;
    ctx.beginPath();
    ctx.moveTo(px - nx * tieHalf, py - ny * tieHalf);
    ctx.lineTo(px + nx * tieHalf, py + ny * tieHalf);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Draws an alternating Left/Right Puppy Paw Print (oval heel pad + 4 oval toe beans in a forward arc).
   */
  private stampPuppyPawPrint(px: number, py: number, angleRad: number, side: number): void {
    const scale = Math.max(0.85, BRUSH_RADII[this.activeBrushIdx] / 14);
    const nx = -Math.sin(angleRad);
    const ny = Math.cos(angleRad);
    const cx = px + nx * (9 * side);
    const cy = py + ny * (9 * side);

    const ctx = this.paintCtx;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angleRad);
    ctx.fillStyle = this.activeColor.hex;
    ctx.globalAlpha = 0.94;

    // Kidney/oval main heel pad (overlapping double lobe + main oval)
    ctx.beginPath();
    ctx.ellipse(-3 * scale, 0, 5.2 * scale, 6.8 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-5.2 * scale, -2.5 * scale, 3.6 * scale, 0, Math.PI * 2);
    ctx.arc(-5.2 * scale, 2.5 * scale, 3.6 * scale, 0, Math.PI * 2);
    ctx.fill();

    // 4 distinct oval toe beans arranged in an arc in front of the heel pad
    const toes = [
      { x: 4.8 * scale, y: -7.2 * scale, rot: -0.32 },
      { x: 7.8 * scale, y: -2.6 * scale, rot: -0.1 },
      { x: 7.8 * scale, y: 2.6 * scale, rot: 0.1 },
      { x: 4.8 * scale, y: 7.2 * scale, rot: 0.32 }
    ];
    toes.forEach((t) => {
      ctx.beginPath();
      ctx.ellipse(t.x, t.y, 3.1 * scale, 2.1 * scale, t.rot, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  /**
   * Draws an alternating Left/Right Sparky Dragon Footprint (heel pad + 3 forward-pointing clawed toes + golden spark dots).
   */
  private stampDragonFootprint(px: number, py: number, angleRad: number, side: number): void {
    const scale = Math.max(0.85, BRUSH_RADII[this.activeBrushIdx] / 14);
    const nx = -Math.sin(angleRad);
    const ny = Math.cos(angleRad);
    const cx = px + nx * (10 * side);
    const cy = py + ny * (10 * side);

    const ctx = this.paintCtx;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angleRad);
    ctx.fillStyle = this.activeColor.hex;
    ctx.globalAlpha = 0.94;

    // Bold dragon heel pad
    ctx.beginPath();
    ctx.ellipse(-4 * scale, 0, 5.5 * scale, 5.8 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3 forward-pointing clawed toes (center, left-splayed, right-splayed)
    const clawAngles = [-0.46, 0, 0.46];
    clawAngles.forEach((ca) => {
      ctx.save();
      ctx.rotate(ca);
      ctx.beginPath();
      ctx.moveTo(-1 * scale, -3.2 * scale);
      ctx.lineTo(11.5 * scale, 0);
      ctx.lineTo(-1 * scale, 3.2 * scale);
      ctx.closePath();
      ctx.fill();

      // Golden claw tip spark dot
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(13 * scale, 0, 1.6 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = this.activeColor.hex;
      ctx.restore();
    });

    ctx.restore();
  }

  private stampWaxCrayonDab(cx: number, cy: number): void {
    const r = BRUSH_RADII[this.activeBrushIdx];
    const ctx = this.paintCtx;
    ctx.save();
    ctx.fillStyle = this.activeColor.hex;

    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
    ctx.fill();

    const grains = Math.max(10, Math.floor(r * 1.4));
    ctx.globalAlpha = 0.58;
    for (let i = 0; i < grains; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.random() * r;
      const gx = cx + Math.cos(ang) * rad;
      const gy = cy + Math.sin(ang) * rad;
      const gr = Math.max(1.2, r * 0.18 * Math.random());
      ctx.beginPath();
      ctx.arc(gx, gy, gr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private stampWatercolorDab(cx: number, cy: number, stageX: number, stageY: number): void {
    const r = BRUSH_RADII[this.activeBrushIdx] * 1.35;
    const ctx = this.paintCtx;
    const { r: cr, g: cg, b: cb } = this.activeColor;

    ctx.save();
    const grad = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
    grad.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, 0.22)`);
    grad.addColorStop(0.65, `rgba(${cr}, ${cg}, ${cb}, 0.12)`);
    grad.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0.0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    if (Math.random() < 0.35) {
      ctx.fillStyle = '#fff9db';
      ctx.globalAlpha = 0.85;
      const fx = cx + (Math.random() - 0.5) * r * 1.1;
      const fy = cy + (Math.random() - 0.5) * r * 1.1;
      ctx.fillRect(fx - 1.5, fy - 1.5, 3, 3);
    }
    ctx.restore();

    if (stageX > 0 && stageY > 0) {
      const star = this.add
        .image(
          stageX + Phaser.Math.Between(-8, 8),
          stageY + Phaser.Math.Between(-8, 8),
          'particle-star'
        )
        .setTint(Phaser.Utils.Array.GetRandom([0xfef08a, 0xfbbf24, this.activeColor.num, 0xffffff]))
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.28)
        .setDepth(35);

      this.tweens.add({
        targets: star,
        y: star.y - 16,
        alpha: 0,
        scaleX: 0.05,
        scaleY: 0.05,
        angle: 90,
        duration: 420,
        ease: 'Quad.easeOut',
        onComplete: () => star.destroy()
      });
    }
  }

  private floodFillCanvas(startX: number, startY: number, fillSpec: PaintColorSpec): void {
    const W = this.CANVAS_W;
    const H = this.CANVAS_H;
    const startIdx = startY * W + startX;

    if (this.templateAlphaMap[startIdx] > 110) return;

    const imgData = this.paintCtx.getImageData(0, 0, W, H);
    const data = imgData.data;

    const sr = data[startIdx * 4];
    const sg = data[startIdx * 4 + 1];
    const sb = data[startIdx * 4 + 2];

    const fr = fillSpec.r;
    const fg = fillSpec.g;
    const fb = fillSpec.b;

    if (Math.abs(sr - fr) < 6 && Math.abs(sg - fg) < 6 && Math.abs(sb - fb) < 6) {
      return;
    }

    const tol = 42;
    const visited = new Uint8Array(W * H);
    const queue = new Int32Array(W * H);
    let head = 0;
    let tail = 0;

    visited[startIdx] = 1;
    queue[tail++] = startIdx;

    while (head < tail) {
      const idx = queue[head++];
      const off = idx * 4;
      data[off] = fr;
      data[off + 1] = fg;
      data[off + 2] = fb;
      data[off + 3] = 255;

      const x = idx % W;
      const y = (idx / W) | 0;

      if (x > 0) {
        const n = idx - 1;
        if (!visited[n] && this.templateAlphaMap[n] <= 85) {
          const noff = n * 4;
          if (
            Math.abs(data[noff] - sr) <= tol &&
            Math.abs(data[noff + 1] - sg) <= tol &&
            Math.abs(data[noff + 2] - sb) <= tol
          ) {
            visited[n] = 1;
            queue[tail++] = n;
          }
        }
      }
      if (x < W - 1) {
        const n = idx + 1;
        if (!visited[n] && this.templateAlphaMap[n] <= 85) {
          const noff = n * 4;
          if (
            Math.abs(data[noff] - sr) <= tol &&
            Math.abs(data[noff + 1] - sg) <= tol &&
            Math.abs(data[noff + 2] - sb) <= tol
          ) {
            visited[n] = 1;
            queue[tail++] = n;
          }
        }
      }
      if (y > 0) {
        const n = idx - W;
        if (!visited[n] && this.templateAlphaMap[n] <= 85) {
          const noff = n * 4;
          if (
            Math.abs(data[noff] - sr) <= tol &&
            Math.abs(data[noff + 1] - sg) <= tol &&
            Math.abs(data[noff + 2] - sb) <= tol
          ) {
            visited[n] = 1;
            queue[tail++] = n;
          }
        }
      }
      if (y < H - 1) {
        const n = idx + W;
        if (!visited[n] && this.templateAlphaMap[n] <= 85) {
          const noff = n * 4;
          if (
            Math.abs(data[noff] - sr) <= tol &&
            Math.abs(data[noff + 1] - sg) <= tol &&
            Math.abs(data[noff + 2] - sb) <= tol
          ) {
            visited[n] = 1;
            queue[tail++] = n;
          }
        }
      }
    }

    this.paintCtx.putImageData(imgData, 0, 0);
    this.paintCanvasTex.refresh();
  }

  /**
   * STEP 2.1: Renders the 5 Left Mahogany Cubbies centered horizontally at `x = 78`
   * (`y = 88, 198, 308, 418, 528`) with smaller `64x56` tool sprites so they sit comfortably
   * inside the dark wood, plus the visual 3-mode badge on Cubby 3 (`'tool-roller'`).
   */
  private renderLeftToolCubbies(): void {
    this.leftCubbiesContainer.removeAll(true);

    const cubbyX = 78;
    const cubbyW = 106;
    const cubbyH = 88;

    const toolCubbies: Array<{
      id: StudioToolId;
      y: number;
      texKey: string;
      accent: number;
    }> = [
      { id: 'crayon', y: 88, texKey: 'tool-crayon', accent: 0xef4444 },
      { id: 'watercolor', y: 198, texKey: 'tool-glitter-brush', accent: 0x38bdf8 },
      { id: 'roller', y: 308, texKey: 'tool-roller', accent: 0x34d399 },
      { id: 'bucket', y: 418, texKey: 'tool-bucket', accent: 0xfbbf24 }
    ];

    toolCubbies.forEach((cubby) => {
      const isSelected = this.activeTool === cubby.id;
      const container = this.add.container(cubbyX, cubby.y);

      if (isSelected) {
        const glow = this.add
          .image(0, 0, 'hub-radial-glow')
          .setOrigin(0.5)
          .setDisplaySize(108, 92)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.62);
        container.add(glow);

        this.tweens.add({
          targets: glow,
          alpha: { from: 0.42, to: 0.75 },
          duration: 1200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }

      if (this.textures.exists(cubby.texKey)) {
        this.textures.get(cubby.texKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }

      const iconW = isSelected ? 64 * 1.12 : 64;
      const iconH = isSelected ? 56 * 1.12 : 56;
      const sprite = this.add
        .image(0, 0, cubby.texKey)
        .setOrigin(0.5)
        .setDisplaySize(iconW, iconH)
        .setAlpha(isSelected ? 1.0 : 0.88);

      if (isSelected) {
        this.tweens.add({
          targets: sprite,
          y: { from: -2, to: 2.5 },
          angle: { from: -3.5, to: 3.5 },
          duration: 1100,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }

      container.add(sprite);

      // STEP 4.2: Visual mode badge in the bottom-right corner of Cubby 3 (`tool-roller`) at (x: 98, y: 328)
      if (cubby.id === 'roller') {
        const badge = this.createRollerModeBadge(20, 20);
        container.add(badge);
      }

      this.leftCubbiesContainer.add(container);

      const hit = this.add
        .zone(cubbyX, cubby.y, cubbyW, cubbyH)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      this.leftCubbiesContainer.add(hit);

      hit.on('pointerdown', () => {
        if (this.isSweepingSponge) return;
        this.disarmSpongeConfirm();

        if (cubby.id === 'roller') {
          if (this.activeTool === 'roller') {
            // Cycle rollerMode: 'tracks' -> 'paws' -> 'dragon'
            this.rollerMode =
              this.rollerMode === 'tracks'
                ? 'paws'
                : this.rollerMode === 'paws'
                  ? 'dragon'
                  : 'tracks';
          } else {
            this.activeTool = 'roller';
          }
          AudioBus.playSfx(
            this.rollerMode === 'paws' ? 'doggie' : this.rollerMode === 'dragon' ? 'sparky' : 'pop'
          );
        } else {
          AudioBus.playSfx('tab');
          this.activeTool = cubby.id;
        }

        if (cubby.id === 'bucket' && this.rightRackMode !== 'templates') {
          this.rightRackMode = 'templates';
          this.renderRightApothecaryRack();
        }

        this.renderLeftToolCubbies();
        Juice.burstStars(this, cubbyX, cubby.y, 8, [cubby.accent, 0xfef08a, 0xffffff]);
      });
    });

    // Cubby 5 (`y: 528`): `'tool-undo'` at `x: 52, y: 528` (42x44) and `'tool-sponge'` at `x: 100, y: 528` (44x44)
    const cubby5Y = 528;

    // Left Half: Undo (`x: 52, y: 528`)
    const undoContainer = this.add.container(52, cubby5Y);
    if (this.textures.exists('tool-undo')) {
      this.textures.get('tool-undo').setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    const undoSprite = this.add
      .image(0, 0, 'tool-undo')
      .setOrigin(0.5)
      .setDisplaySize(42, 44);
    undoContainer.add(undoSprite);
    this.leftCubbiesContainer.add(undoContainer);

    const undoHit = this.add
      .zone(52, cubby5Y, 50, 78)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.leftCubbiesContainer.add(undoHit);

    undoHit.on('pointerdown', () => {
      this.disarmSpongeConfirm();
      Juice.squashAndStretch(this, undoContainer, 0.18, 120);
      this.performUndo();
    });

    // Right Half: Sponge (`x: 100, y: 528`)
    const spongeContainer = this.add.container(100, cubby5Y);
    if (this.spongeConfirmArmed) {
      const confirmGlow = this.add
        .image(0, 0, 'hub-radial-glow')
        .setOrigin(0.5)
        .setDisplaySize(74, 74)
        .setTint(0x38bdf8)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.8);
      spongeContainer.add(confirmGlow);
    }

    if (this.textures.exists('tool-sponge')) {
      this.textures.get('tool-sponge').setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    const spongeSprite = this.add
      .image(0, 0, 'tool-sponge')
      .setOrigin(0.5)
      .setDisplaySize(this.spongeConfirmArmed ? 50 : 44, this.spongeConfirmArmed ? 50 : 44);
    spongeContainer.add(spongeSprite);

    if (this.spongeConfirmArmed) {
      const badgeG = this.add.graphics();
      badgeG.fillStyle(0x22c55e, 1);
      badgeG.fillCircle(14, -14, 10);
      badgeG.lineStyle(2, 0xffffff, 1);
      badgeG.strokeCircle(14, -14, 10);
      badgeG.lineStyle(2.5, 0xffffff, 1);
      badgeG.beginPath();
      badgeG.moveTo(10, -14);
      badgeG.lineTo(13, -11);
      badgeG.lineTo(19, -18);
      badgeG.strokePath();
      spongeContainer.add(badgeG);

      this.tweens.add({
        targets: spongeContainer,
        scaleX: { from: 0.95, to: 1.08 },
        scaleY: { from: 0.95, to: 1.08 },
        duration: 280,
        yoyo: true,
        repeat: -1
      });
    }

    this.leftCubbiesContainer.add(spongeContainer);

    const spongeHit = this.add
      .zone(100, cubby5Y, 50, 78)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.leftCubbiesContainer.add(spongeHit);

    spongeHit.on('pointerdown', () => {
      if (this.isSweepingSponge) return;
      if (!this.spongeConfirmArmed) {
        this.spongeConfirmArmed = true;
        AudioBus.playSfx('pop');
        this.renderLeftToolCubbies();
        this.spongeConfirmTimer?.remove(false);
        this.spongeConfirmTimer = this.time.delayedCall(3200, () => {
          this.disarmSpongeConfirm();
        });
      } else {
        this.disarmSpongeConfirm();
        this.runBubblySpongeWipe();
      }
    });
  }

  /**
   * Renders a small, clear visual mode badge in the bottom-right corner of Cubby 3 (`tool-roller`)
   * showing either a mini railroad track tie, a 4-toe paw pad, or a 3-toe dragon claw!
   */
  private createRollerModeBadge(bx: number, by: number): Phaser.GameObjects.Container {
    const badge = this.add.container(bx, by);
    const g = this.add.graphics();

    // Antique brass medallion disc
    g.fillStyle(0x271206, 0.96);
    g.fillCircle(0, 0, 14);
    g.lineStyle(2, this.activeTool === 'roller' ? 0xfde047 : 0xd97706, 1);
    g.strokeCircle(0, 0, 14);

    if (this.rollerMode === 'tracks') {
      // Mini railroad track (two vertical rails + two horizontal ties)
      g.lineStyle(2, 0xfef08a, 1);
      g.beginPath();
      g.moveTo(-4.5, -8);
      g.lineTo(-4.5, 8);
      g.moveTo(4.5, -8);
      g.lineTo(4.5, 8);
      g.moveTo(-8, -3.5);
      g.lineTo(8, -3.5);
      g.moveTo(-8, 3.5);
      g.lineTo(8, 3.5);
      g.strokePath();
    } else if (this.rollerMode === 'paws') {
      // 4-toe puppy paw pad
      g.fillStyle(0xf472b6, 1);
      g.fillEllipse(0, 3.5, 9, 7);
      g.fillCircle(-6.5, -2.5, 2.2);
      g.fillCircle(-2.3, -5.5, 2.2);
      g.fillCircle(2.3, -5.5, 2.2);
      g.fillCircle(6.5, -2.5, 2.2);
    } else {
      // 3-toe emerald dragon claw
      g.fillStyle(0x34d399, 1);
      g.fillCircle(0, 4, 4.5);
      g.fillTriangle(-2, 3, -8, -6, 0, -1);
      g.fillTriangle(-2.5, 2, 0, -8, 2.5, 2);
      g.fillTriangle(0, -1, 8, -6, 2, 3);
    }

    badge.add(g);
    return badge;
  }

  private disarmSpongeConfirm(): void {
    if (!this.spongeConfirmArmed) return;
    this.spongeConfirmArmed = false;
    this.spongeConfirmTimer?.remove(false);
    this.renderLeftToolCubbies();
  }

  private runBubblySpongeWipe(): void {
    this.isSweepingSponge = true;
    this.pushPaintUndoSnapshot();
    AudioBus.playSfx('splash');

    const sponge = this.add
      .image(this.CANVAS_X - 40, this.CANVAS_Y + this.CANVAS_H / 2, 'tool-sponge')
      .setOrigin(0.5)
      .setDisplaySize(130, 130)
      .setDepth(60);

    const bubbleTimer = this.time.addEvent({
      delay: 35,
      repeat: 18,
      callback: () => {
        const bx = sponge.x + Phaser.Math.Between(-45, 45);
        const by = this.CANVAS_Y + Phaser.Math.Between(30, this.CANVAS_H - 30);
        const r = Phaser.Math.Between(10, 26);
        const bubble = this.add.graphics().setDepth(58);
        bubble.fillStyle(0xe0f2fe, 0.75);
        bubble.fillCircle(0, 0, r);
        bubble.lineStyle(2, 0xffffff, 0.9);
        bubble.strokeCircle(0, 0, r);
        bubble.setPosition(bx, by);

        this.tweens.add({
          targets: bubble,
          y: by - 40,
          alpha: 0,
          scaleX: 1.3,
          scaleY: 1.3,
          duration: 380,
          onComplete: () => bubble.destroy()
        });
      }
    });

    this.tweens.add({
      targets: sponge,
      x: this.CANVAS_X + this.CANVAS_W + 40,
      angle: { from: -18, to: 18 },
      duration: 680,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        bubbleTimer.remove(false);
        sponge.destroy();
        this.fillCanvasWithParchment();
        this.clearAllPlacedStickers();
        this.isSweepingSponge = false;
      }
    });
  }

  /**
   * STEP 2.2: Renders the 4 Right Apothecary Shelf Compartments centered at `x = 1214`
   * (`y = 95, 230, 365, 500`) plus the new `'ui-page-left'` and `'ui-page-right'` scroll medallions
   * at `y = 662`.
   */
  private renderRightApothecaryRack(): void {
    this.rightRackContainer.removeAll(true);

    const rackX = 1214;
    const shelfYs = [95, 230, 365, 500];

    if (this.rightRackMode === 'stickers') {
      const totalPages = Math.ceil(LIVING_STICKERS.length / 4);
      this.stickerPage = Phaser.Math.Wrap(this.stickerPage, 0, totalPages);
      const startIdx = this.stickerPage * 4;
      const pageItems = LIVING_STICKERS.slice(startIdx, startIdx + 4);

      pageItems.forEach((spec, idx) => {
        const sy = shelfYs[idx];
        const slot = this.add.container(rackX, sy);

        const glow = this.add
          .image(0, 0, 'hub-radial-glow')
          .setOrigin(0.5)
          .setDisplaySize(110, 88)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.28);
        slot.add(glow);

        if (this.textures.exists(spec.texKey)) {
          this.textures.get(spec.texKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
          const previewSprite = this.add
            .sprite(0, 0, spec.texKey, 0)
            .setOrigin(0.5, 0.5)
            .setScale(spec.previewScale);
          slot.add(previewSprite);
        }

        this.rightRackContainer.add(slot);

        const hit = this.add
          .zone(rackX, sy, 128, 108)
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });
        this.rightRackContainer.add(hit);

        hit.on('pointerdown', () => {
          if (this.isSweepingSponge) return;
          this.disarmSpongeConfirm();
          Juice.squashAndStretch(this, slot, 0.16, 130);
          const dropX = this.CANVAS_X + this.CANVAS_W / 2 + Phaser.Math.Between(-210, 210);
          const dropY = this.CANVAS_Y + this.CANVAS_H / 2 + Phaser.Math.Between(-130, 130);
          this.placeLivingStickerOnCanvas(spec, dropX, dropY, true);
        });
      });

      this.renderRightRackPager(this.stickerPage, totalPages, (delta) => {
        this.stickerPage = Phaser.Math.Wrap(this.stickerPage + delta, 0, totalPages);
        AudioBus.playSfx('tab');
        this.renderRightApothecaryRack();
      });
    } else {
      const totalPages = Math.ceil(COLORING_TEMPLATES.length / 4);
      this.templatePage = Phaser.Math.Wrap(this.templatePage, 0, totalPages);
      const startIdx = this.templatePage * 4;
      const pageItems = COLORING_TEMPLATES.slice(startIdx, startIdx + 4);

      pageItems.forEach((tpl, idx) => {
        const globalIdx = startIdx + idx;
        const isSelected = globalIdx === this.activeTemplateIdx;
        const sy = shelfYs[idx];
        const slot = this.add.container(rackX, sy);

        if (isSelected) {
          const glow = this.add
            .image(0, 0, 'hub-radial-glow')
            .setOrigin(0.5)
            .setDisplaySize(142, 108)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setAlpha(0.65);
          slot.add(glow);
        }

        const thumbG = this.add.graphics();
        thumbG.fillStyle(0xfdf5d8, 0.98);
        thumbG.fillRoundedRect(-59, -39, 118, 78, 8);
        thumbG.lineStyle(isSelected ? 3.5 : 2, isSelected ? 0xfde047 : 0xb45309, 1);
        thumbG.strokeRoundedRect(-59, -39, 118, 78, 8);
        slot.add(thumbG);

        if (this.textures.exists(tpl.texKey)) {
          const thumbImg = this.add
            .image(0, 0, tpl.texKey)
            .setOrigin(0.5)
            .setDisplaySize(110, 70);
          slot.add(thumbImg);
        }

        this.rightRackContainer.add(slot);

        const hit = this.add
          .zone(rackX, sy, 128, 108)
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });
        this.rightRackContainer.add(hit);

        hit.on('pointerdown', () => {
          if (this.isSweepingSponge) return;
          this.disarmSpongeConfirm();
          this.activeTemplateIdx = globalIdx;
          AudioBus.playSfx('tab');
          this.templateOverlayImage.setTexture(tpl.texKey);
          this.templateOverlayImage.setDisplaySize(this.CANVAS_W, this.CANVAS_H);
          this.rebuildTemplateAlphaMap(tpl.texKey);
          this.renderRightApothecaryRack();
          Juice.burstStars(this, rackX, sy, 10, [0xfde047, 0xfbbf24, 0xffffff]);
        });
      });

      this.renderRightRackPager(this.templatePage, totalPages, (delta) => {
        this.templatePage = Phaser.Math.Wrap(this.templatePage + delta, 0, totalPages);
        AudioBus.playSfx('tab');
        this.renderRightApothecaryRack();
      });
    }
  }

  /**
   * STEP 3.4: Right Page Scroll Buttons (`y: 662`) using `'ui-page-left'` (`x: 1156, y: 662`, 46x46)
   * and `'ui-page-right'` (`x: 1252, y: 662`, 46x46), with warm golden page dots centered at `x: 1204, y: 662`.
   */
  private renderRightRackPager(
    currentPageIdx: number,
    totalPages: number,
    onStep: (delta: number) => void
  ): void {
    const pagerY = 662;

    if (this.textures.exists('ui-page-left')) {
      this.textures.get('ui-page-left').setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    if (this.textures.exists('ui-page-right')) {
      this.textures.get('ui-page-right').setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    const leftBtn = this.add
      .image(1156, pagerY, 'ui-page-left')
      .setOrigin(0.5)
      .setDisplaySize(46, 46);
    const rightBtn = this.add
      .image(1252, pagerY, 'ui-page-right')
      .setOrigin(0.5)
      .setDisplaySize(46, 46);

    const dotsG = this.add.graphics();
    const dotSpacing = 11;
    const startDotX = 1204 - ((totalPages - 1) * dotSpacing) / 2;
    for (let i = 0; i < totalPages; i++) {
      const dx = startDotX + i * dotSpacing;
      const isCurrent = i === currentPageIdx;
      dotsG.fillStyle(isCurrent ? 0xfde047 : 0x78522b, 1);
      dotsG.fillCircle(dx, pagerY, isCurrent ? 4.2 : 2.8);
    }

    this.rightRackContainer.add([leftBtn, rightBtn, dotsG]);

    const prevHit = this.add
      .zone(1156, pagerY, 56, 58)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const nextHit = this.add
      .zone(1252, pagerY, 56, 58)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.rightRackContainer.add([prevHit, nextHit]);

    prevHit.on('pointerdown', () => {
      Juice.squashAndStretch(this, leftBtn, 0.16, 110);
      onStep(-1);
    });
    nextHit.on('pointerdown', () => {
      Juice.squashAndStretch(this, rightBtn, 0.16, 110);
      onStep(1);
    });
  }

  private placeLivingStickerOnCanvas(
    spec: LivingStickerSpec,
    stageX: number,
    stageY: number,
    recordUndo: boolean
  ): void {
    if (!this.textures.exists(spec.texKey)) return;

    const uid = this.nextStickerUid++;
    const sprite = this.add
      .sprite(stageX, stageY, spec.texKey, 0)
      .setOrigin(0.5, 0.5)
      .setScale(0.05)
      .setInteractive({ draggable: true, useHandCursor: true });

    this.stickerLayerContainer.add(sprite);

    AudioBus.playLayerSfx(spec.sfxPath, 0.85);
    Juice.burstStars(this, stageX, stageY, 14, [0xfef08a, 0xfbbf24, 0xffffff]);

    this.tweens.add({
      targets: sprite,
      scaleX: spec.canvasScale,
      scaleY: spec.canvasScale,
      duration: 280,
      ease: 'Back.easeOut'
    });

    let frameIdx = 0;
    const frameTimer = this.time.addEvent({
      delay: 240,
      loop: true,
      callback: () => {
        if (!sprite.active) return;
        frameIdx = (frameIdx + 1) % spec.numFrames;
        sprite.setFrame(frameIdx);
      }
    });

    const record: PlacedStickerRecord = { uid, spec, sprite, frameTimer };
    this.placedStickers.push(record);

    if (recordUndo) {
      this.undoStack.push({ type: 'add-sticker', uid });
      if (this.undoStack.length > 12) {
        this.undoStack.shift();
      }
    }

    let wasDragged = false;
    sprite.on('pointerdown', () => {
      wasDragged = false;
      this.stickerLayerContainer.bringToTop(sprite);
    });

    sprite.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      wasDragged = true;
      sprite.setPosition(dragX, dragY);
    });

    sprite.on('dragend', () => {
      if (
        sprite.x < this.CANVAS_X ||
        sprite.x > this.CANVAS_X + this.CANVAS_W ||
        sprite.y < this.CANVAS_Y ||
        sprite.y > this.CANVAS_Y + this.CANVAS_H
      ) {
        AudioBus.playSfx('pop');
        this.removeStickerByUid(uid);
        return;
      }

      if (!wasDragged) {
        AudioBus.playLayerSfx(spec.sfxPath, 0.85);
        this.tweens.add({
          targets: sprite,
          scaleX: spec.canvasScale * 1.18,
          scaleY: spec.canvasScale * 0.86,
          duration: 110,
          yoyo: true,
          ease: 'Quad.easeOut',
          onComplete: () => sprite.setScale(spec.canvasScale)
        });
        Juice.burstStars(this, sprite.x, sprite.y, 10, [0xfef08a, 0xfbbf24, 0xffffff]);
      }
    });
  }

  private removeStickerByUid(uid: number): void {
    const idx = this.placedStickers.findIndex((s) => s.uid === uid);
    if (idx === -1) return;
    const [removed] = this.placedStickers.splice(idx, 1);
    removed.frameTimer.remove(false);
    removed.sprite.destroy();
  }

  private clearAllPlacedStickers(): void {
    this.placedStickers.forEach((s) => {
      s.frameTimer.remove(false);
      s.sprite.destroy();
    });
    this.placedStickers = [];
  }

  /**
   * STEP 3: Renders the Bottom Trough (`y: 662`):
   * - Bottom-Left Bookshelf Button (`x: 76, y: 662`, `78x64`)
   * - 12 Heirloom Brass Paint Wells (`x: 198..748, y: 662`, layered `ui-paint-well-fill` + `ui-paint-well-rim`)
   * - 3 Brush Size Wells (`x: 810, 860, 910, y: 662`, framed in `ui-paint-well-rim` at `36x36`, `42x42`, `48x48`)
   * - Sticker / Coloring Chest (`x: 1005, y: 662`, `ui-brass-frame` `88x76` + `tool-sticker-box` `68x58`)
   */
  private renderBottomWoodenTrough(): void {
    this.bottomTroughContainer.removeAll(true);

    // 1. Bottom-Left Bookshelf Button (`x: 76, y: 662`, `78x64`)
    const backContainer = this.add.container(76, 662);
    if (this.textures.exists('tool-bookshelf')) {
      this.textures.get('tool-bookshelf').setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    const backSprite = this.add
      .image(0, 0, 'tool-bookshelf')
      .setOrigin(0.5)
      .setDisplaySize(78, 64);
    backContainer.add(backSprite);
    this.bottomTroughContainer.add(backContainer);

    const backHit = this.add
      .zone(76, 662, 108, 84)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.bottomTroughContainer.add(backHit);

    backHit.on('pointerdown', () => {
      AudioBus.playSfx('tab');
      Juice.squashAndStretch(this, backContainer, 0.18, 120);
      ArcadeState.setActiveTab('create');
      this.scene.start('HubScene');
    });

    // 2. 12 Heirloom Brass Paint Wells (`x: 198..748, y: 662`, spacing `50px`)
    PAINT_POTS_ALL.forEach((pot, idx) => {
      const px = 198 + idx * 50;
      this.renderPaintWell(px, 662, pot);
    });

    // 3. 3 Brush Size Wells (`x: 810, 860, 910, y: 662` framed in `ui-paint-well-rim` at `36x36`, `42x42`, `48x48`)
    const brushXs = [810, 860, 910];
    const wellSizes = [36, 42, 48];
    const dotRadii = [4.5, 8.5, 13];
    if (this.textures.exists('ui-paint-well-rim')) {
      this.textures.get('ui-paint-well-rim').setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    brushXs.forEach((bx, idx) => {
      const by = 662;
      const isSelected = this.activeBrushIdx === idx;
      const bContainer = this.add.container(bx, isSelected ? by - 4 : by);
      const wSize = isSelected ? wellSizes[idx] + 4 : wellSizes[idx];

      if (isSelected) {
        const glow = this.add
          .image(0, 0, 'hub-radial-glow')
          .setOrigin(0.5)
          .setDisplaySize(wSize + 24, wSize + 24)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.6);
        bContainer.add(glow);
      }

      // Dark wood backing inside the rim + active paint dot
      const dotG = this.add.graphics();
      dotG.fillStyle(0x1f0f06, 0.96);
      dotG.fillCircle(0, 0, wSize * 0.34);

      const dotR = dotRadii[idx];
      dotG.fillStyle(this.activeColor.num, 1);
      dotG.fillCircle(0, 0, dotR);
      dotG.lineStyle(1.2, 0xffffff, 0.9);
      dotG.strokeCircle(0, 0, dotR);
      bContainer.add(dotG);

      const rimImg = this.add
        .image(0, 0, 'ui-paint-well-rim')
        .setOrigin(0.5)
        .setDisplaySize(wSize, wSize);
      bContainer.add(rimImg);

      this.bottomTroughContainer.add(bContainer);

      const hit = this.add
        .zone(bx, by, 48, 56)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      this.bottomTroughContainer.add(hit);

      hit.on('pointerdown', () => {
        this.activeBrushIdx = idx;
        AudioBus.playSfx('pop');
        this.renderBottomWoodenTrough();
      });
    });

    // 4. Sticker / Coloring Chest Frame (`x: 1005, y: 662`): `'ui-brass-frame'` (88x76) + `'tool-sticker-box'` (68x58)
    const toggleX = 1005;
    const toggleY = 662;
    const toggleContainer = this.add.container(toggleX, toggleY);

    const toggleGlow = this.add
      .image(0, 0, 'hub-radial-glow')
      .setOrigin(0.5)
      .setDisplaySize(116, 94)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(this.rightRackMode === 'stickers' ? 0.62 : 0.32);
    toggleContainer.add(toggleGlow);

    if (this.textures.exists('ui-brass-frame')) {
      this.textures.get('ui-brass-frame').setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    if (this.textures.exists('tool-sticker-box')) {
      this.textures.get('tool-sticker-box').setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    const brassFrameImg = this.add
      .image(0, 0, 'ui-brass-frame')
      .setOrigin(0.5)
      .setDisplaySize(88, 76);

    const stickerBoxSprite = this.add
      .image(0, 0, 'tool-sticker-box')
      .setOrigin(0.5)
      .setDisplaySize(68, 58);

    toggleContainer.add([brassFrameImg, stickerBoxSprite]);
    this.bottomTroughContainer.add(toggleContainer);

    const toggleHit = this.add
      .zone(toggleX, toggleY, 96, 82)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.bottomTroughContainer.add(toggleHit);

    toggleHit.on('pointerdown', () => {
      AudioBus.playSfx(this.rightRackMode === 'stickers' ? 'doggie' : 'sparky');
      this.rightRackMode = this.rightRackMode === 'stickers' ? 'templates' : 'stickers';
      Juice.squashAndStretch(this, toggleContainer, 0.18, 140);
      this.renderRightApothecaryRack();
      this.renderBottomWoodenTrough();
      Juice.burstStars(this, toggleX, toggleY - 12, 12, [0xfde047, 0xfbbf24, 0xffffff]);
    });
  }

  /**
   * STEP 3.1: Renders each of the 12 Heirloom Brass Paint Wells (`x: 198..748, y: 662`)
   * using layered `'ui-paint-well-fill'` (tinted to the pot's color) + `'ui-paint-well-rim'` on top (`42x42`,
   * or `50x50` with a warm golden glow when selected!).
   */
  private renderPaintWell(x: number, y: number, pot: PaintColorSpec): void {
    const isSelected = this.activeColor.hex === pot.hex;
    const wellY = isSelected ? y - 6 : y;
    const size = isSelected ? 50 : 42;
    const container = this.add.container(x, wellY);

    if (isSelected) {
      const glow = this.add
        .image(0, 0, 'hub-radial-glow')
        .setOrigin(0.5)
        .setDisplaySize(70, 70)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.65);
      container.add(glow);
    }

    if (this.textures.exists('ui-paint-well-fill')) {
      this.textures.get('ui-paint-well-fill').setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    if (this.textures.exists('ui-paint-well-rim')) {
      this.textures.get('ui-paint-well-rim').setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    const fillImg = this.add
      .image(0, 0, 'ui-paint-well-fill')
      .setOrigin(0.5)
      .setDisplaySize(size, size)
      .setTint(pot.num);

    const rimImg = this.add
      .image(0, 0, 'ui-paint-well-rim')
      .setOrigin(0.5)
      .setDisplaySize(size, size);

    container.add([fillImg, rimImg]);
    this.bottomTroughContainer.add(container);

    const hit = this.add
      .zone(x, y, 48, 58)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.bottomTroughContainer.add(hit);

    hit.on('pointerdown', () => {
      this.activeColor = pot;
      AudioBus.playSfx('pop');
      this.renderBottomWoodenTrough();
      Juice.burstStars(this, x, y - 16, 8, [pot.num, 0xfef08a, 0xffffff]);
    });
  }
}
