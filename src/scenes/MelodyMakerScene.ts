/**
 * MelodyMakerScene.ts
 * -------------------
 * Mentor Note: The Full-Screen Heirloom Music Box & Puppet Theater (`1280x720`, Zero Words!)
 * for Wyatt (age 4) and Emma (age 3).
 *
 * Architectural Highlights:
 * 1. Full-Screen Workbench & Concert Stage (`melody-frame-bg.jpg`):
 *    - Upper Concert Puppet Stage (`x: 172..1108, y: 28..285`): Woodland Choir (`x: 375`),
 *      Conductor Sparky (`x: 640`), and Drummer Doggie (`x: 905`) stand behind the glowing
 *      brass footlights (`y: 262`) and animate reactively whenever low, mid, or high chime
 *      bars are struck (or when tapped directly for a solo flourish!).
 *    - Lower Walnut Soundboard (`x: 172..1108, y: 315..585`): 8 graduated rainbow C-Major
 *      chime bars (`key-0`..`key-7`) across `x = 246..1034` (`spacing = 112.5px`, `y = 452`)
 *      with multi-touch & continuous finger-swipe glissando support, animated wooden mallets
 *      (`prop-mallet-left` & `prop-mallet-right`), and the glowing guide firefly (`prop-firefly`).
 * 2. 100% Icon-Driven Navigation (Zero Text Labels):
 *    - Left 5 Mahogany Cubbies (`x: 78, y: 88, 198, 308, 418, 528`): 5 Instrument Voices
 *      (`voice-glockenspiel`, `voice-marimba`, `voice-piano`, `voice-doggie`, `voice-sparky`).
 *    - Right 4 Apothecary Shelves (`x: 1214, y: 95, 230, 365, 500`): 5 Classic & Custom Song
 *      Medallions (`song-twinkle`, `song-mary`, `song-macdonald`, `song-rowboat`, `song-roadster`)
 *      with bottom-right brass scroll arrows (`ui-page-left` at `1156`, `ui-page-right` at `1252`).
 *    - Bottom Wooden Trough (`y: 662`):
 *      - Return to Bookshelf (`tool-bookshelf` at `x: 76, y: 662`)
 *      - 3 Play / Teach Modes (`mode-autoplay` at `270`, `mode-firefly` at `430`, `mode-maestro` at `590`)
 *      - 2 Ambient Backing Rhythms (`rhythm-campfire` at `810`, `rhythm-parade` at `970`)
 */

import Phaser from 'phaser';
import { ArcadeState } from '../core/ArcadeState';
import { AudioBus } from '../core/AudioBus';
import { Juice } from '../core/Juice';
import { MelodyAudioEngine, RhythmType, VoiceType } from '../audio/MelodyAudioEngine';

type PlayMode = 'autoplay' | 'firefly' | 'maestro' | null;
type SongId = 'twinkle' | 'mary' | 'macdonald' | 'rowboat' | 'roadster';

interface SongNote {
  note: number; // 0..7 (C4..C5)
  beat: 1 | 2;  // 1 = quarter note, 2 = half-note hold
}

interface SongDefinition {
  id: SongId;
  texKey: string;
  accentColor: number;
  tempoMs: number;
  notes: SongNote[];
}

const HelperNotes = (raw: number[], holdIndices: number[]): SongNote[] => {
  const holdSet = new Set(holdIndices);
  return raw.map((note, idx) => ({
    note,
    beat: holdSet.has(idx) ? 2 : 1
  }));
};

const SONGS: readonly SongDefinition[] = [
  {
    id: 'twinkle',
    texKey: 'song-twinkle',
    accentColor: 0xfacc15,
    tempoMs: 410,
    notes: HelperNotes(
      [
        0, 0, 4, 4, 5, 5, 4,
        3, 3, 2, 2, 1, 1, 0,
        4, 4, 3, 3, 2, 2, 1,
        4, 4, 3, 3, 2, 2, 1,
        0, 0, 4, 4, 5, 5, 4,
        3, 3, 2, 2, 1, 1, 0
      ],
      [6, 13, 20, 27, 34, 41]
    )
  },
  {
    id: 'mary',
    texKey: 'song-mary',
    accentColor: 0xf43f5e,
    tempoMs: 390,
    notes: HelperNotes(
      [
        2, 1, 0, 1, 2, 2, 2,
        1, 1, 1,
        2, 4, 4,
        2, 1, 0, 1, 2, 2, 2, 2,
        1, 1, 2, 1, 0
      ],
      [6, 9, 12, 25]
    )
  },
  {
    id: 'macdonald',
    texKey: 'song-macdonald',
    accentColor: 0x22c55e,
    tempoMs: 390,
    notes: HelperNotes(
      [
        4, 4, 4, 1, 2, 2, 1,
        6, 6, 5, 5, 4,
        1, 4, 4, 4, 1, 2, 2, 1,
        6, 6, 5, 5, 4
      ],
      [6, 11, 19, 24]
    )
  },
  {
    id: 'rowboat',
    texKey: 'song-rowboat',
    accentColor: 0x38bdf8,
    tempoMs: 360,
    notes: HelperNotes(
      [
        0, 0, 0, 1, 2,
        2, 1, 2, 3, 4,
        7, 7, 7, 4, 4, 4, 2, 2, 2, 0, 0, 0,
        4, 3, 2, 1, 0
      ],
      [0, 1, 4, 9, 26]
    )
  },
  {
    id: 'roadster',
    texKey: 'song-roadster',
    accentColor: 0xf59e0b,
    tempoMs: 340,
    notes: HelperNotes(
      [
        0, 2, 4, 7,
        5, 4, 2, 4,
        3, 2, 1, 3,
        2, 4, 5, 4,
        0, 2, 4, 7,
        6, 5, 4, 2,
        1, 2, 3, 4,
        5, 6, 7, 7
      ],
      [3, 7, 11, 15, 19, 23, 31]
    )
  }
];

const BAR_COLORS: readonly number[] = [
  0xef4444, // 0: Red (C4)
  0xf97316, // 1: Orange (D4)
  0xfacc15, // 2: Yellow (E4)
  0x22c55e, // 3: Green (F4)
  0x14b8a6, // 4: Teal (G4)
  0x3b82f6, // 5: Blue (A4)
  0x6366f1, // 6: Indigo (B4)
  0xfb7185  // 7: Coral (C5)
];

interface ChimeBarEntry {
  index: number;
  x: number;
  y: number;
  baseWidth: number;
  baseHeight: number;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  targetRing: Phaser.GameObjects.Image;
}

interface BandPerformer {
  id: 'choir' | 'sparky' | 'doggie';
  prefix: string;
  x: number;
  y: number;
  targetHeight: number;
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  animTimer?: Phaser.Time.TimerEvent;
}

export class MelodyMakerScene extends Phaser.Scene {
  private audioEngine!: MelodyAudioEngine;

  private activeVoice: VoiceType = 'glockenspiel';
  private activeSongId: SongId = 'twinkle';
  private activePlayMode: PlayMode = null;
  private activeRhythm: RhythmType = null;
  private songShelfPage = 0;

  // Song Sequence State
  private songStepIndex = 0;
  private autoplayTimer?: Phaser.Time.TimerEvent;
  private nextMalletSide: 'left' | 'right' = 'left';

  // Glissando Pointer Tracking
  private lastGlissandoBarIndex: number | null = null;
  private lastBarTriggerTime: number[] = [0, 0, 0, 0, 0, 0, 0, 0];

  // Containers & Scene Objects
  private leftCubbiesContainer!: Phaser.GameObjects.Container;
  private rightShelfContainer!: Phaser.GameObjects.Container;
  private bottomTroughContainer!: Phaser.GameObjects.Container;
  private stageContainer!: Phaser.GameObjects.Container;
  private soundboardContainer!: Phaser.GameObjects.Container;

  private chimeBars: ChimeBarEntry[] = [];
  private performers: Record<'choir' | 'sparky' | 'doggie', BandPerformer> = {} as Record<
    'choir' | 'sparky' | 'doggie',
    BandPerformer
  >;

  private malletLeft!: Phaser.GameObjects.Image;
  private malletRight!: Phaser.GameObjects.Image;
  private fireflyContainer!: Phaser.GameObjects.Container;
  private fireflySprite!: Phaser.GameObjects.Image;
  private fireflyHalo!: Phaser.GameObjects.Image;

  constructor() {
    super({ key: 'MelodyMakerScene' });
  }

  public create(): void {
    this.cameras.main.setBackgroundColor('#160d08');
    this.cameras.main.fadeIn(320, 18, 10, 6);

    // Duck Hub background music while inside the Music Box so notes ring out cleanly
    AudioBus.duckBgm(true);

    this.audioEngine = new MelodyAudioEngine();
    void this.audioEngine.preloadSampleBuffers();

    this.activeVoice = 'glockenspiel';
    this.activeSongId = 'twinkle';
    this.activePlayMode = null;
    this.activeRhythm = null;
    this.songShelfPage = 0;
    this.songStepIndex = 0;
    this.lastGlissandoBarIndex = null;

    // 1. Full-Screen Heirloom Music Box & Puppet Theater Frame (1280x720)
    if (this.textures.exists('melody-frame-bg')) {
      this.textures.get('melody-frame-bg').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.add
        .image(640, 360, 'melody-frame-bg')
        .setOrigin(0.5)
        .setDisplaySize(1280, 720)
        .setDepth(1);
    }

    // 2. Upper Concert Puppet Stage (`x: 172..1108, y: 28..285` — The Living Band)
    this.stageContainer = this.add.container(0, 0).setDepth(15);
    this.buildConcertStageBand();

    // 3. Lower Walnut Soundboard (`x: 172..1108, y: 315..585` — 8 Chime Bars + Mallets + Firefly)
    this.soundboardContainer = this.add.container(0, 0).setDepth(25);
    this.buildWalnutSoundboard();

    // 4. Left 5 Instrument Voice Cubbies (`x: 78, y: 88, 198, 308, 418, 528`)
    this.leftCubbiesContainer = this.add.container(0, 0).setDepth(40);
    this.renderLeftVoiceCubbies();

    // 5. Right 4 Song Medallion Shelves (`x: 1214, y: 95, 230, 365, 500`) + Scroll Arrows (`y: 662`)
    this.rightShelfContainer = this.add.container(0, 0).setDepth(40);
    this.renderRightSongShelves();

    // 6. Bottom Trough (`y: 662` — Bookshelf Button + 3 Play Modes + 2 Rhythm Loops)
    this.bottomTroughContainer = this.add.container(0, 0).setDepth(40);
    this.renderBottomTrough();

    // Clean up timers & audio loops when leaving the scene
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanupMusicBox();
    });

    // Welcome chime glissando
    this.time.delayedCall(220, () => {
      this.audioEngine.playChord([0, 2, 4, 7], this.activeVoice, 55, 0.5);
    });
  }

  /**
   * STEP 3.2: Places the 3 animated band performers standing on the wooden stage floor
   * right behind the glowing brass footlights (`y: 262`, `origin: (0.5, 1.0)`):
   * - Left Stage (`x: 375, y: 262`): Woodland Choir (`band-choir-0..2`, `displayHeight: 165`)
   * - Center Stage (`x: 640, y: 264`): Conductor Sparky (`band-sparky-0..2`, `displayHeight: 175`)
   * - Right Stage (`x: 905, y: 262`): Drummer Doggie (`band-doggie-0..2`, `displayHeight: 168`)
   */
  private buildConcertStageBand(): void {
    this.stageContainer.removeAll(true);

    // Subtle warm footlight shimmer along y = 258
    for (let i = 0; i < 7; i++) {
      const lx = 260 + i * 126;
      const footlightGlow = this.add
        .image(lx, 254, 'hub-radial-glow')
        .setOrigin(0.5)
        .setDisplaySize(86, 54)
        .setTint(0xfef08a)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.22);
      this.stageContainer.add(footlightGlow);

      this.tweens.add({
        targets: footlightGlow,
        alpha: { from: 0.16, to: 0.32 },
        duration: 1300 + i * 140,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    const specs: Array<{
      id: 'choir' | 'sparky' | 'doggie';
      prefix: string;
      x: number;
      y: number;
      targetHeight: number;
      tintColor: number;
    }> = [
      { id: 'choir', prefix: 'band-choir', x: 375, y: 262, targetHeight: 165, tintColor: 0x38bdf8 },
      { id: 'sparky', prefix: 'band-sparky', x: 640, y: 264, targetHeight: 175, tintColor: 0x34d399 },
      { id: 'doggie', prefix: 'band-doggie', x: 905, y: 262, targetHeight: 168, tintColor: 0xfacc15 }
    ];

    specs.forEach((spec, idx) => {
      const texKey0 = `${spec.prefix}-0`;
      const glow = this.add
        .image(spec.x, spec.y - spec.targetHeight * 0.48, 'hub-radial-glow')
        .setOrigin(0.5)
        .setDisplaySize(210, 190)
        .setTint(spec.tintColor)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.18);
      this.stageContainer.add(glow);

      const sprite = this.add.image(spec.x, spec.y, texKey0).setOrigin(0.5, 1.0);
      this.applyPerformerSize(sprite, texKey0, spec.targetHeight);
      this.stageContainer.add(sprite);

      // Gentle rhythmic idle bob
      this.tweens.add({
        targets: sprite,
        scaleY: { from: sprite.scaleY * 0.985, to: sprite.scaleY * 1.02 },
        duration: 850 + idx * 90,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      const performer: BandPerformer = {
        id: spec.id,
        prefix: spec.prefix,
        x: spec.x,
        y: spec.y,
        targetHeight: spec.targetHeight,
        sprite,
        glow
      };
      this.performers[spec.id] = performer;

      // Direct stage tap solo flourish!
      const hitZone = this.add
        .zone(spec.x, spec.y - spec.targetHeight * 0.5, 210, spec.targetHeight + 16)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      this.stageContainer.add(hitZone);

      hitZone.on('pointerdown', () => {
        this.animateBandPerformer(spec.id, true);
        if (spec.id === 'doggie') {
          this.audioEngine.playChord([0, 2, 4], 'doggie', 70, 0.85);
        } else if (spec.id === 'sparky') {
          this.audioEngine.playChord([2, 4, 7], 'sparky', 65, 0.85);
        } else {
          this.audioEngine.playChord([4, 6, 7], 'piano', 65, 0.85);
        }
      });
    });
  }

  private applyPerformerSize(
    sprite: Phaser.GameObjects.Image,
    texKey: string,
    targetHeight: number
  ): void {
    if (!this.textures.exists(texKey)) return;
    this.textures.get(texKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
    const frame = this.textures.get(texKey).getSourceImage() as HTMLImageElement;
    const aspect = frame && frame.height > 0 ? frame.width / frame.height : 1.15;
    sprite.setDisplaySize(Math.round(targetHeight * aspect), targetHeight);
  }

  /**
   * Animates a band performer through frames `1 -> 2 -> 0` with a joyful squash-and-stretch bounce.
   */
  private animateBandPerformer(id: 'choir' | 'sparky' | 'doggie', isSolo = false): void {
    const perf = this.performers[id];
    if (!perf) return;

    perf.animTimer?.remove(false);

    const f1 = `${perf.prefix}-1`;
    const f2 = `${perf.prefix}-2`;
    const f0 = `${perf.prefix}-0`;

    perf.sprite.setTexture(f1);
    this.applyPerformerSize(perf.sprite, f1, perf.targetHeight);

    this.tweens.add({
      targets: perf.glow,
      alpha: { from: 0.65, to: 0.18 },
      duration: 420,
      ease: 'Cubic.easeOut'
    });

    this.tweens.add({
      targets: perf.sprite,
      y: perf.y - (isSolo ? 12 : 6),
      duration: 110,
      yoyo: true,
      ease: 'Quad.easeOut'
    });

    perf.animTimer = this.time.delayedCall(150, () => {
      perf.sprite.setTexture(f2);
      this.applyPerformerSize(perf.sprite, f2, perf.targetHeight);

      if (isSolo) {
        this.spawnFloatingNote(perf.x, perf.y - perf.targetHeight * 0.75, 0xfef08a);
        Juice.burstStars(this, perf.x, perf.y - perf.targetHeight * 0.65, 8, [
          0xfacc15,
          0xffffff,
          0x38bdf8
        ]);
      }

      perf.animTimer = this.time.delayedCall(220, () => {
        perf.sprite.setTexture(f0);
        this.applyPerformerSize(perf.sprite, f0, perf.targetHeight);
      });
    });
  }

  /**
   * STEP 3.3: Builds the Lower Walnut Soundboard (`x: 172..1108, y: 315..585`):
   * - 8 sliced chime bars (`key-0` to `key-7`) evenly across `x = 246` to `1034` (`spacing = 112.5px`, `y = 452` center),
   *   scaled so `key-0` is `~88x250` stepping smoothly down to `key-7` at `~88x186`.
   * - Multi-touch & Glissando slide support across all 8 bars (`108x260` hitboxes).
   * - Animated wooden mallets (`prop-mallet-left` & `prop-mallet-right`) + Firefly guide (`prop-firefly`).
   */
  private buildWalnutSoundboard(): void {
    this.soundboardContainer.removeAll(true);
    this.chimeBars = [];

    const startX = 246;
    const spacing = 112.5;
    const centerY = 452;

    for (let i = 0; i < 8; i++) {
      const bx = Math.round(startX + i * spacing);
      const bw = 88;
      const bh = Math.round(250 - i * ((250 - 186) / 7)); // 250 down to 186
      const texKey = `key-${i}`;

      if (this.textures.exists(texKey)) {
        this.textures.get(texKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }

      const barContainer = this.add.container(bx, centerY);

      // Firefly / Target pulse aura behind the bar
      const targetRing = this.add
        .image(0, 0, 'hub-radial-glow')
        .setOrigin(0.5)
        .setDisplaySize(bw + 54, bh + 44)
        .setTint(0xfef08a)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0);

      // Strike flash glow
      const glow = this.add
        .image(0, 0, 'hub-radial-glow')
        .setOrigin(0.5)
        .setDisplaySize(bw + 46, bh + 38)
        .setTint(BAR_COLORS[i])
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0);

      // Drop shadow under each chime bar
      const shadow = this.add
        .rectangle(4, 7, bw - 8, bh - 8, 0x000000, 0.38)
        .setOrigin(0.5);

      const sprite = this.add
        .image(0, 0, texKey)
        .setOrigin(0.5)
        .setDisplaySize(bw, bh);

      barContainer.add([targetRing, glow, shadow, sprite]);
      this.soundboardContainer.add(barContainer);

      this.chimeBars.push({
        index: i,
        x: bx,
        y: centerY,
        baseWidth: bw,
        baseHeight: bh,
        container: barContainer,
        sprite,
        glow,
        targetRing
      });
    }

    // Animated Left & Right Wooden Mallets (`prop-mallet-left` & `prop-mallet-right`)
    // Origins set to the exact center of each round brass-and-felt ball head!
    this.malletLeft = this.add
      .image(235, 545, 'prop-mallet-left')
      .setOrigin(0.84, 0.16)
      .setDisplaySize(124, 93)
      .setAngle(-18)
      .setDepth(32);
    this.malletRight = this.add
      .image(1045, 545, 'prop-mallet-right')
      .setOrigin(0.16, 0.16)
      .setDisplaySize(124, 93)
      .setAngle(18)
      .setDepth(32);
    this.soundboardContainer.add([this.malletLeft, this.malletRight]);

    // Glowing Firefly Guide (`prop-firefly`) for Mode 2 ("Follow the Firefly")
    this.fireflyContainer = this.add.container(246, 325).setDepth(35).setVisible(false);
    this.fireflyHalo = this.add
      .image(0, 0, 'hub-radial-glow')
      .setOrigin(0.5)
      .setDisplaySize(118, 118)
      .setTint(0xfef08a)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.75);
    this.fireflySprite = this.add
      .image(0, 0, 'prop-firefly')
      .setOrigin(0.5)
      .setDisplaySize(76, 68);
    this.fireflyContainer.add([this.fireflyHalo, this.fireflySprite]);
    this.soundboardContainer.add(this.fireflyContainer);

    this.tweens.add({
      targets: this.fireflySprite,
      y: { from: -6, to: 6 },
      angle: { from: -5, to: 5 },
      duration: 580,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: this.fireflyHalo,
      scaleX: { from: 0.9, to: 1.18 },
      scaleY: { from: 0.9, to: 1.18 },
      alpha: { from: 0.55, to: 0.9 },
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Multi-Touch & Glissando Pointer Handling across the 8 Chime Bars
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const hitBar = this.getBarIndexAtPointer(pointer.x, pointer.y);
      if (hitBar !== null) {
        this.lastGlissandoBarIndex = hitBar;
        this.handleUserBarStrike(hitBar, pointer.x, pointer.y);
      } else {
        this.lastGlissandoBarIndex = null;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      const hitBar = this.getBarIndexAtPointer(pointer.x, pointer.y);
      if (hitBar !== null && hitBar !== this.lastGlissandoBarIndex) {
        this.lastGlissandoBarIndex = hitBar;
        // In Maestro mode, only trigger on discrete taps or slow slides so a single swipe doesn't race the whole song
        if (this.activePlayMode === 'maestro') {
          const now = this.time.now;
          if (now - this.lastBarTriggerTime[hitBar] > 210) {
            this.handleUserBarStrike(hitBar, pointer.x, pointer.y);
          }
        } else {
          this.handleUserBarStrike(hitBar, pointer.x, pointer.y);
        }
      } else if (hitBar === null) {
        this.lastGlissandoBarIndex = null;
      }
    });

    this.input.on('pointerup', () => {
      this.lastGlissandoBarIndex = null;
    });
  }

  /**
   * Checks if `(px, py)` falls inside one of the 8 chime bar hitboxes (`108px` wide x `260px` tall).
   */
  private getBarIndexAtPointer(px: number, py: number): number | null {
    if (py < 318 || py > 582 || px < 185 || px > 1095) return null;

    for (let i = 0; i < this.chimeBars.length; i++) {
      const bar = this.chimeBars[i];
      if (Math.abs(px - bar.x) <= 54 && Math.abs(py - bar.y) <= 130) {
        return i;
      }
    }
    return null;
  }

  /**
   * Handles a kid tapping or swiping onto a chime bar (`0..7`), adapting behavior
   * for Free Play, Autoplay tap-along, Firefly teach mode, or Toddler Maestro mode!
   */
  private handleUserBarStrike(tappedBarIndex: number, tapX?: number, tapY?: number): void {
    const song = this.getActiveSong();

    if (this.activePlayMode === 'maestro') {
      // Mode 3: "Toddler Maestro" — tapping ANY bar plays the NEXT note of the selected song!
      const step = song.notes[this.songStepIndex] ?? song.notes[0];
      const targetBar = step.note;
      this.lastBarTriggerTime[tappedBarIndex] = this.time.now;

      this.strikeChimeBar(targetBar, true);
      this.songStepIndex++;

      if (this.songStepIndex >= song.notes.length) {
        this.songStepIndex = 0;
        this.triggerSongFinaleCelebration();
      }
      return;
    }

    if (this.activePlayMode === 'firefly') {
      // Mode 2: "Follow the Firefly" — check if the kid tapped the glowing target bar!
      const expectedStep = song.notes[this.songStepIndex] ?? song.notes[0];
      if (tappedBarIndex === expectedStep.note) {
        // Joyful firefly loop-de-loop star burst!
        this.strikeChimeBar(tappedBarIndex, true, tapX, tapY);
        this.animateFireflySuccess(this.chimeBars[tappedBarIndex].x);

        this.songStepIndex++;
        if (this.songStepIndex >= song.notes.length) {
          this.songStepIndex = 0;
          this.triggerSongFinaleCelebration();
          this.time.delayedCall(900, () => {
            if (this.activePlayMode === 'firefly') {
              this.positionFireflyOverCurrentNote();
            }
          });
        } else {
          this.positionFireflyOverCurrentNote();
        }
      } else {
        // Still let the tapped bar ring softly so the music box always feels alive, while nudging the firefly
        this.strikeChimeBar(tappedBarIndex, false, tapX, tapY, 0.65);
        Juice.squashAndStretch(this, this.fireflyContainer, 0.22, 160);
      }
      return;
    }

    // Free Play or tap-along during Autoplay
    this.strikeChimeBar(tappedBarIndex, true, tapX, tapY);
  }

  /**
   * Strikes chime bar `barIndex` (`0..7`), triggering:
   * 1. Studio audio note (`this.audioEngine.playNote`)
   * 2. Squash-and-stretch + warm golden additive glow on the bar
   * 3. `'prop-star-burst'` burst + floating musical notes rising toward the stage
   * 4. Reactive upper-stage band animation (Low `0..2` -> Doggie, Mid `3..5` -> Sparky, High `6..7` -> Choir)
   * 5. Wooden mallet swing (`prop-mallet-left` or `prop-mallet-right`)
   */
  private strikeChimeBar(
    barIndex: number,
    swingMallet = true,
    strikeX?: number,
    strikeY?: number,
    volumeScale = 1.0
  ): void {
    const bar = this.chimeBars[barIndex];
    if (!bar) return;

    this.lastBarTriggerTime[barIndex] = this.time.now;

    // 1. Play studio-grade note
    this.audioEngine.playNote(barIndex, this.activeVoice, volumeScale);

    // 2. Bar squash & bounce (`scaleX: 1.08, scaleY: 0.94 -> 1.0`) + additive glow flash
    this.tweens.killTweensOf(bar.sprite);
    bar.sprite.setDisplaySize(bar.baseWidth * 1.08, bar.baseHeight * 0.94);
    this.tweens.add({
      targets: bar.sprite,
      displayWidth: bar.baseWidth,
      displayHeight: bar.baseHeight,
      duration: 240,
      ease: 'Back.easeOut'
    });

    this.tweens.killTweensOf(bar.glow);
    bar.glow.setAlpha(0.88);
    this.tweens.add({
      targets: bar.glow,
      alpha: 0,
      duration: 380,
      ease: 'Cubic.easeOut'
    });

    // 3. Pop `'prop-star-burst'` at the strike point + float golden musical note up toward stage
    const sx = strikeX ?? bar.x;
    const sy = strikeY ?? bar.y;
    this.spawnStarBurstProp(sx, sy, BAR_COLORS[barIndex]);
    this.spawnFloatingNote(bar.x, bar.y - bar.baseHeight * 0.42, BAR_COLORS[barIndex]);

    // 4. Reactive Stage Band Animation:
    // Low notes (0..2) -> Drummer Doggie
    // Mid notes (3..5) -> Conductor Sparky
    // High notes (6..7) -> Woodland Choir
    if (barIndex <= 2) {
      this.animateBandPerformer('doggie', false);
    } else if (barIndex <= 5) {
      this.animateBandPerformer('sparky', false);
    } else {
      this.animateBandPerformer('choir', false);
    }

    // 5. Swing wooden mallet so its ball head strikes `(sx, sy)` dead-center
    if (swingMallet) {
      this.swingMalletToBar(barIndex, sx, sy);
    }
  }

  /**
   * Tweens `prop-mallet-left` (`origin: 0.84, 0.16`) or `prop-mallet-right` (`origin: 0.16, 0.16`)
   * directly to `(targetX, targetY)` so the round brass ball head strikes the exact click point /
   * golden treble clef with a crisp wrist snap rotation (`angle: 0 -> +12` left, `0 -> -12` right)
   * before rebounding smoothly to rest (`(235, 545, -18)` / `(1045, 545, +18)`).
   */
  private swingMalletToBar(barIndex: number, targetX?: number, targetY?: number): void {
    const bar = this.chimeBars[barIndex];
    if (!bar) return;

    const useLeft =
      this.activePlayMode === 'autoplay'
        ? (this.nextMalletSide = this.nextMalletSide === 'left' ? 'right' : 'left') === 'left'
        : barIndex <= 3;

    const mallet = useLeft ? this.malletLeft : this.malletRight;
    const restX = useLeft ? 235 : 1045;
    const restY = 545;
    const restAngle = useLeft ? -18 : 18;
    const strikeTargetX = targetX ?? bar.x;
    const strikeTargetY = targetY ?? bar.y;

    this.tweens.killTweensOf(mallet);
    mallet.setPosition(strikeTargetX + (useLeft ? -14 : 14), strikeTargetY - 26);
    mallet.setAngle(0);

    this.tweens.add({
      targets: mallet,
      x: strikeTargetX,
      y: strikeTargetY,
      angle: useLeft ? 12 : -12,
      duration: 65,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: mallet,
          x: restX,
          y: restY,
          angle: restAngle,
          duration: 280,
          ease: 'Sine.easeInOut'
        });
      }
    });
  }

  /**
   * Pops the sliced `'prop-star-burst'` sprite at `(x, y)` with a quick spin and fade.
   */
  private spawnStarBurstProp(x: number, y: number, tintColor: number): void {
    if (!this.textures.exists('prop-star-burst')) {
      Juice.burstStars(this, x, y, 5, [tintColor, 0xfef08a]);
      return;
    }

    const burst = this.add
      .image(x, y, 'prop-star-burst')
      .setOrigin(0.5)
      .setDisplaySize(24, 24)
      .setDepth(34);

    this.tweens.add({
      targets: burst,
      displayWidth: 74,
      displayHeight: 74,
      angle: Phaser.Math.Between(-35, 35),
      alpha: { from: 1.0, to: 0.0 },
      duration: 360,
      ease: 'Cubic.easeOut',
      onComplete: () => burst.destroy()
    });
  }

  /**
   * Floats a glowing golden eighth-note / beamed-note particle up from a struck chime bar toward the stage.
   */
  private spawnFloatingNote(x: number, y: number, accentColor: number): void {
    const g = this.add.graphics().setPosition(x, y).setDepth(33);
    // Outer golden halo
    g.fillStyle(accentColor, 0.35);
    g.fillCircle(0, 0, 14);
    // Crisp golden musical eighth note (zero text characters)
    g.fillStyle(0xfef08a, 1);
    g.fillEllipse(-4, 4, 11, 8);
    g.fillRect(0, -14, 3.5, 18);
    g.fillTriangle(3.5, -14, 13, -9, 3.5, -6);

    const driftX = x + Phaser.Math.Between(-28, 28);
    this.tweens.add({
      targets: g,
      x: driftX,
      y: y - Phaser.Math.Between(75, 125),
      alpha: { from: 1, to: 0 },
      scaleX: { from: 0.85, to: 1.2 },
      scaleY: { from: 0.85, to: 1.2 },
      duration: 720,
      ease: 'Sine.easeOut',
      onComplete: () => g.destroy()
    });
  }

  private getActiveSong(): SongDefinition {
    return SONGS.find((s) => s.id === this.activeSongId) ?? SONGS[0];
  }

  /**
   * Starts or switches the active Play Mode (`'autoplay' | 'firefly' | 'maestro' | null`).
   */
  private setPlayMode(mode: PlayMode): void {
    this.stopAutoplayTimer();
    this.clearBarTargetHighlights();
    this.activePlayMode = mode;
    this.songStepIndex = 0;

    if (mode === 'autoplay') {
      this.fireflyContainer.setVisible(false);
      this.scheduleNextAutoplayStep(120);
    } else if (mode === 'firefly') {
      this.fireflyContainer.setVisible(true);
      this.positionFireflyOverCurrentNote();
    } else if (mode === 'maestro') {
      this.fireflyContainer.setVisible(false);
      // Soft golden shimmer across all 8 bars so Emma knows tapping anywhere makes magic!
      this.chimeBars.forEach((b, idx) => {
        b.targetRing.setAlpha(0.28);
        this.tweens.add({
          targets: b.targetRing,
          alpha: { from: 0.14, to: 0.36 },
          duration: 700 + idx * 50,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      });
    } else {
      this.fireflyContainer.setVisible(false);
    }

    this.renderBottomTrough();
    this.renderRightSongShelves();
  }

  private stopAutoplayTimer(): void {
    if (this.autoplayTimer) {
      this.autoplayTimer.remove(false);
      this.autoplayTimer = undefined;
    }
  }

  private clearBarTargetHighlights(): void {
    this.chimeBars.forEach((b) => {
      this.tweens.killTweensOf(b.targetRing);
      b.targetRing.setAlpha(0);
    });
  }

  /**
   * Mode 1: Clockwork Autoplay Concert scheduler.
   */
  private scheduleNextAutoplayStep(delayMs: number): void {
    this.stopAutoplayTimer();
    if (this.activePlayMode !== 'autoplay') return;

    this.autoplayTimer = this.time.delayedCall(delayMs, () => {
      if (this.activePlayMode !== 'autoplay') return;
      const song = this.getActiveSong();
      const step = song.notes[this.songStepIndex];
      if (!step) {
        this.songStepIndex = 0;
        this.triggerSongFinaleCelebration();
        this.scheduleNextAutoplayStep(1200);
        return;
      }

      this.strikeChimeBar(step.note, true);
      this.songStepIndex++;

      if (this.songStepIndex >= song.notes.length) {
        this.songStepIndex = 0;
        this.autoplayTimer = this.time.delayedCall(song.tempoMs * 1.4, () => {
          this.triggerSongFinaleCelebration();
          this.scheduleNextAutoplayStep(1300);
        });
      } else {
        this.scheduleNextAutoplayStep(song.tempoMs * step.beat);
      }
    });
  }

  /**
   * Mode 2: Moves `'prop-firefly'` smoothly over the next chime bar in the active song and pulses that bar's golden halo.
   */
  private positionFireflyOverCurrentNote(): void {
    this.clearBarTargetHighlights();
    if (this.activePlayMode !== 'firefly') return;

    const song = this.getActiveSong();
    const step = song.notes[this.songStepIndex] ?? song.notes[0];
    const targetBar = this.chimeBars[step.note];
    if (!targetBar) return;

    this.fireflyContainer.setVisible(true);
    this.tweens.killTweensOf(this.fireflyContainer);
    this.tweens.add({
      targets: this.fireflyContainer,
      x: targetBar.x,
      y: targetBar.y - targetBar.baseHeight * 0.5 - 32,
      duration: 240,
      ease: 'Back.easeOut'
    });

    targetBar.targetRing.setAlpha(0.55);
    this.tweens.add({
      targets: targetBar.targetRing,
      alpha: { from: 0.35, to: 0.85 },
      duration: 460,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private animateFireflySuccess(barX: number): void {
    Juice.burstStars(this, barX, this.fireflyContainer.y, 7, [0xfef08a, 0xfacc15, 0xffffff]);
  }

  /**
   * STEP 3.5: Song Finale Celebration!
   * All 3 band members jump into Frame 3 (`frame 2`) celebration pose, golden star-bursts shower
   * from the stage footlights, and a joyful chord rings out!
   */
  private triggerSongFinaleCelebration(): void {
    this.animateBandPerformer('choir', true);
    this.animateBandPerformer('sparky', true);
    this.animateBandPerformer('doggie', true);

    this.audioEngine.playChord([0, 2, 4, 7], this.activeVoice, 60, 0.75);

    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 75, () => {
        const fx = 280 + i * 144;
        this.spawnStarBurstProp(fx, 235, BAR_COLORS[i % BAR_COLORS.length]);
        Juice.burstStars(this, fx, 215, 8, [0xfacc15, 0xfef08a, 0xffffff, 0x38bdf8]);
      });
    }
  }

  /**
   * STEP 3.6a: Renders the Left 5 Instrument Voice Cubbies (`x: 78, y: 88, 198, 308, 418, 528`).
   */
  private renderLeftVoiceCubbies(): void {
    this.leftCubbiesContainer.removeAll(true);

    const cubbyX = 78;
    const cubbyW = 106;
    const cubbyH = 88;

    const voices: Array<{
      id: VoiceType;
      y: number;
      texKey: string;
      accent: number;
      previewChord: number[];
    }> = [
      {
        id: 'glockenspiel',
        y: 88,
        texKey: 'voice-glockenspiel',
        accent: 0xfacc15,
        previewChord: [0, 4, 7]
      },
      {
        id: 'marimba',
        y: 198,
        texKey: 'voice-marimba',
        accent: 0xf97316,
        previewChord: [0, 2, 4]
      },
      {
        id: 'piano',
        y: 308,
        texKey: 'voice-piano',
        accent: 0x38bdf8,
        previewChord: [0, 2, 4, 7]
      },
      {
        id: 'doggie',
        y: 418,
        texKey: 'voice-doggie',
        accent: 0xf43f5e,
        previewChord: [0, 4, 7]
      },
      {
        id: 'sparky',
        y: 528,
        texKey: 'voice-sparky',
        accent: 0x34d399,
        previewChord: [2, 4, 7]
      }
    ];

    voices.forEach((v) => {
      const isSelected = this.activeVoice === v.id;
      const container = this.add.container(cubbyX, v.y);

      if (isSelected) {
        const glow = this.add
          .image(0, 0, 'hub-radial-glow')
          .setOrigin(0.5)
          .setDisplaySize(108, 92)
          .setTint(v.accent)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.65);
        container.add(glow);

        this.tweens.add({
          targets: glow,
          alpha: { from: 0.42, to: 0.78 },
          duration: 1150,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }

      if (this.textures.exists(v.texKey)) {
        this.textures.get(v.texKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }

      const iconW = isSelected ? Math.round(64 * 1.12) : 64;
      const iconH = isSelected ? Math.round(56 * 1.12) : 56;
      const sprite = this.add
        .image(0, 0, v.texKey)
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
      this.leftCubbiesContainer.add(container);

      const hit = this.add
        .zone(cubbyX, v.y, cubbyW, cubbyH)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      this.leftCubbiesContainer.add(hit);

      hit.on('pointerdown', () => {
        this.activeVoice = v.id;
        this.renderLeftVoiceCubbies();
        this.audioEngine.playChord(v.previewChord, v.id, 55, 0.75);
        Juice.burstStars(this, cubbyX, v.y, 8, [v.accent, 0xfef08a, 0xffffff]);

        if (v.id === 'doggie') {
          this.animateBandPerformer('doggie', true);
        } else if (v.id === 'sparky') {
          this.animateBandPerformer('sparky', true);
        } else {
          this.animateBandPerformer('choir', false);
        }
      });
    });
  }

  /**
   * STEP 3.6c: Renders the Right 4 Apothecary Shelves (`x: 1214, y: 95, 230, 365, 500`)
   * with the 5 circular brass Song Medallions (`86x86`) and bottom-right scroll arrows
   * (`ui-page-left` at `x: 1156, y: 662` and `ui-page-right` at `x: 1252, y: 662`).
   */
  private renderRightSongShelves(): void {
    this.rightShelfContainer.removeAll(true);

    const shelfX = 1214;
    const shelfYs = [95, 230, 365, 500];

    // Window of 4 songs based on songShelfPage (0 -> songs 0..3, 1 -> songs 1..4)
    const startIdx = this.songShelfPage === 0 ? 0 : 1;
    const visibleSongs = SONGS.slice(startIdx, startIdx + 4);

    visibleSongs.forEach((song, slotIdx) => {
      const sy = shelfYs[slotIdx];
      const isSelected = this.activeSongId === song.id;
      const container = this.add.container(shelfX, sy);

      if (isSelected) {
        const aura = this.add
          .image(0, 0, 'hub-radial-glow')
          .setOrigin(0.5)
          .setDisplaySize(118, 118)
          .setTint(song.accentColor)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.72);
        container.add(aura);

        this.tweens.add({
          targets: aura,
          alpha: { from: 0.45, to: 0.85 },
          scaleX: { from: 0.94, to: 1.08 },
          scaleY: { from: 0.94, to: 1.08 },
          duration: 1050,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }

      if (this.textures.exists(song.texKey)) {
        this.textures.get(song.texKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }

      const size = isSelected ? 92 : 86;
      const medallion = this.add
        .image(0, 0, song.texKey)
        .setOrigin(0.5)
        .setDisplaySize(size, size);

      if (isSelected && this.activePlayMode !== null) {
        this.tweens.add({
          targets: medallion,
          angle: { from: -4, to: 4 },
          duration: 950,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }

      container.add(medallion);
      this.rightShelfContainer.add(container);

      const hit = this.add
        .zone(shelfX, sy, 114, 110)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      this.rightShelfContainer.add(hit);

      hit.on('pointerdown', () => {
        AudioBus.playSfx('pop');
        this.activeSongId = song.id;
        Juice.burstStars(this, shelfX, sy, 9, [song.accentColor, 0xfef08a, 0xffffff]);

        // Tapping a Song Medallion starts it in the active Play Mode (defaulting to 'autoplay' if none was running)
        const targetMode: PlayMode = this.activePlayMode ?? 'autoplay';
        this.setPlayMode(targetMode);
      });
    });

    // Bottom-Right Page Scroll Buttons (`ui-page-left` at 1156, 662 and `ui-page-right` at 1252, 662)
    const scrollButtons: Array<{ x: number; tex: string; delta: number }> = [
      { x: 1156, tex: 'ui-page-left', delta: -1 },
      { x: 1252, tex: 'ui-page-right', delta: 1 }
    ];

    scrollButtons.forEach((btn) => {
      const btnContainer = this.add.container(btn.x, 662);
      if (this.textures.exists(btn.tex)) {
        this.textures.get(btn.tex).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      const arrowSprite = this.add
        .image(0, 0, btn.tex)
        .setOrigin(0.5)
        .setDisplaySize(46, 46);
      btnContainer.add(arrowSprite);
      this.rightShelfContainer.add(btnContainer);

      const hit = this.add
        .zone(btn.x, 662, 64, 68)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      this.rightShelfContainer.add(hit);

      hit.on('pointerdown', () => {
        AudioBus.playSfx('tab');
        Juice.squashAndStretch(this, btnContainer, 0.18, 120);
        this.songShelfPage = this.songShelfPage === 0 ? 1 : 0;
        this.renderRightSongShelves();
      });
    });

    // Small golden page indicator pip between the scroll arrows (`x: 1204, y: 662`)
    const pipG = this.add.graphics();
    for (let p = 0; p < 2; p++) {
      const px = 1197 + p * 14;
      const active = this.songShelfPage === p;
      pipG.fillStyle(active ? 0xfacc15 : 0x78350f, 1);
      pipG.fillCircle(px, 662, active ? 5.5 : 4);
      pipG.lineStyle(1.5, 0xfef08a, active ? 0.9 : 0.35);
      pipG.strokeCircle(px, 662, active ? 5.5 : 4);
    }
    this.rightShelfContainer.add(pipG);
  }

  /**
   * STEP 3.6b & 3.6d: Renders the Bottom Wooden Trough (`y: 662`):
   * - `x: 76, y: 662` -> `'tool-bookshelf'` (`78x64`) Return to Bookshelf button
   * - 5 Large Tactile Brass Controls framed with `'ui-brass-frame'` (`84x72`) and icon (`58x52`):
   *   - `x: 270, y: 662` -> `'mode-autoplay'` (Clockwork Autoplay toggle)
   *   - `x: 430, y: 662` -> `'mode-firefly'` (Follow the Firefly teach mode toggle)
   *   - `x: 590, y: 662` -> `'mode-maestro'` (Toddler Maestro one-tap mode toggle)
   *   - `x: 810, y: 662` -> `'rhythm-campfire'` (Campfire Drum & Shaker backing beat toggle)
   *   - `x: 970, y: 662` -> `'rhythm-parade'` (Upbeat Parade backing beat toggle)
   */
  private renderBottomTrough(): void {
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
      this.cleanupMusicBox();
      ArcadeState.setActiveTab('create');
      this.scene.start('HubScene');
    });

    // 2. 3 Play / Teach Mode Brass Switches (`x: 270, 430, 590, y: 662`)
    const modeButtons: Array<{
      mode: Exclude<PlayMode, null>;
      x: number;
      texKey: string;
      accent: number;
    }> = [
      { mode: 'autoplay', x: 270, texKey: 'mode-autoplay', accent: 0xfacc15 },
      { mode: 'firefly', x: 430, texKey: 'mode-firefly', accent: 0x34d399 },
      { mode: 'maestro', x: 590, texKey: 'mode-maestro', accent: 0x38bdf8 }
    ];

    modeButtons.forEach((btn) => {
      const isSelected = this.activePlayMode === btn.mode;
      this.createFramedBottomButton(
        btn.x,
        662,
        btn.texKey,
        isSelected,
        btn.accent,
        () => {
          AudioBus.playSfx('pop');
          const nextMode: PlayMode = this.activePlayMode === btn.mode ? null : btn.mode;
          this.setPlayMode(nextMode);
          Juice.burstStars(this, btn.x, 650, 8, [btn.accent, 0xfef08a, 0xffffff]);
        }
      );
    });

    // 3. 2 Ambient Backing Rhythm Switches (`x: 810, 970, y: 662`)
    const rhythmButtons: Array<{
      rhythm: Exclude<RhythmType, null>;
      x: number;
      texKey: string;
      accent: number;
    }> = [
      { rhythm: 'campfire', x: 810, texKey: 'rhythm-campfire', accent: 0xf97316 },
      { rhythm: 'parade', x: 970, texKey: 'rhythm-parade', accent: 0xf43f5e }
    ];

    rhythmButtons.forEach((btn) => {
      const isSelected = this.activeRhythm === btn.rhythm;
      this.createFramedBottomButton(
        btn.x,
        662,
        btn.texKey,
        isSelected,
        btn.accent,
        () => {
          AudioBus.playSfx('pop');
          this.activeRhythm = this.audioEngine.toggleRhythm(btn.rhythm);
          this.renderBottomTrough();
          Juice.burstStars(this, btn.x, 650, 8, [btn.accent, 0xfef08a, 0xffffff]);
        }
      );
    });
  }

  /**
   * Helper to render one of the 5 bottom trough buttons framed inside `'ui-brass-frame'` (`84x72`)
   * with the icon (`58x52`) inside.
   */
  private createFramedBottomButton(
    x: number,
    y: number,
    iconKey: string,
    isActive: boolean,
    accentColor: number,
    onTap: () => void
  ): void {
    const container = this.add.container(x, y);

    if (isActive) {
      const glow = this.add
        .image(0, 0, 'hub-radial-glow')
        .setOrigin(0.5)
        .setDisplaySize(118, 96)
        .setTint(accentColor)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.72);
      container.add(glow);

      this.tweens.add({
        targets: glow,
        alpha: { from: 0.45, to: 0.82 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    if (this.textures.exists('ui-brass-frame')) {
      this.textures.get('ui-brass-frame').setFilter(Phaser.Textures.FilterMode.NEAREST);
      const frameImg = this.add
        .image(0, 0, 'ui-brass-frame')
        .setOrigin(0.5)
        .setDisplaySize(isActive ? 88 : 84, isActive ? 76 : 72);
      container.add(frameImg);
    }

    if (this.textures.exists(iconKey)) {
      this.textures.get(iconKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    const iconImg = this.add
      .image(0, 0, iconKey)
      .setOrigin(0.5)
      .setDisplaySize(isActive ? 62 : 58, isActive ? 56 : 52);

    if (isActive) {
      this.tweens.add({
        targets: iconImg,
        scaleX: { from: iconImg.scaleX * 0.96, to: iconImg.scaleX * 1.06 },
        scaleY: { from: iconImg.scaleY * 0.96, to: iconImg.scaleY * 1.06 },
        duration: 720,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    container.add(iconImg);
    this.bottomTroughContainer.add(container);

    const hit = this.add
      .zone(x, y, 108, 82)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.bottomTroughContainer.add(hit);

    hit.on('pointerdown', () => {
      Juice.squashAndStretch(this, container, 0.16, 120);
      onTap();
    });
  }

  private cleanupMusicBox(): void {
    this.stopAutoplayTimer();
    this.audioEngine?.stopAll();
    AudioBus.duckBgm(false);
  }
}
