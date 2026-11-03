/**
 * ColoradoStoryScene.ts
 * ---------------------
 * Mentor Note: Book 2 — "Babci & Grandpa's Colorado Adventure"
 *
 * Architectural Highlights:
 * 1. 100% Unified UI Chrome with Book 1 (`StoryEngineScene.ts`):
 *    - Exact same picture-book paper frame (`drawPictureBookFrame`).
 *    - Exact same compact top cream parchment karaoke banner (`top: 10px, height: 84px`) with
 *      word-by-word highlighted pills (`Babci` spelled cleanly on screen while playing the
 *      pre-generated `Spuds Oxley - Grandpa` narration MP3s).
 *    - Exact same hanging top-left (`HUB`) and top-right (`Play Mode` / `Read to Me`) bookmark
 *      ribbons and bottom-left / bottom-right dog-eared page-turn corners (`p.1` .. `★ End`).
 *    - Exact same page-flip transition (`playPageFlipTransition`) and peaceful bedtime ending
 *      sequence (`triggerTheEndSequence`).
 * 2. Clean-Stage 32-Bit Hi-Bit Pixel Art Backgrounds (`1280x720`) + True Moving Sprite Actors:
 *    - Every moving actor (the Thule rooftop cargo box, red-tailed hawk, Grandpa & Babci on the
 *      front porch, Doggie in the hedge, Skee-Ball, claw grabber, coin-op pony, leaping rainbow
 *      trout, canyon chipmunk, Royal Gorge aerial gondola, bald eagle, brass train horn & pull-cord,
 *      whitewater kayak, Explorer Sparky, trail bunny, mountain bluebirds, Mom/Rita pulling Wyatt &
 *      Emma in the red Radio Flyer wagon across the lawn, putting green golf ball, sizzling pierogi
 *      skillet on the stove, island flour bowl & rolling pin, and Chef Doggie) is omitted from the
 *      static background painting and mounted as a true animated Phaser sprite with zero duplicate
 *      sticker overlays!
 */

import Phaser from 'phaser';
import { Howl } from 'howler';
import { ArcadeState, StoryMode } from '../core/ArcadeState';
import { AudioBus } from '../core/AudioBus';
import { Juice } from '../core/Juice';

type ColoradoHotspotAction =
  | 'thule-open'
  | 'car-horn'
  | 'hawk-soar'
  | 'family-wave'
  | 'porch-welcome'
  | 'butterflies-flutter'
  | 'doggie-peek'
  | 'claw-grab'
  | 'skeeball-roll'
  | 'pony-rock'
  | 'trout-leap'
  | 'water-shoes-splash'
  | 'chipmunk-hop'
  | 'gondola-glide'
  | 'eagle-swoop'
  | 'bridge-view'
  | 'train-horn-pull'
  | 'train-steam-chug'
  | 'kayak-paddle'
  | 'bunny-hop'
  | 'sparky-rock'
  | 'bluebirds-fly'
  | 'wagon-roll'
  | 'golf-putt'
  | 'patio-bloom'
  | 'pierogi-flip'
  | 'flour-puff'
  | 'doggie-chef-treat';

interface ColoradoHotspotSpec {
  id: string;
  spriteKey: string;
  x: number;
  y: number;
  baseScale: number;
  hitW: number;
  hitH: number;
  sfxFile: string;
  action: ColoradoHotspotAction;
  particleColors: number[];
  hiddenAtRest?: boolean;
}

interface ColoradoPageSpec {
  pageNumber: number;
  isCover?: boolean;
  title: string;
  bgKey: string;
  bgFile?: string;
  narrationFile: string;
  narrationText: string;
  ambientType:
    | 'cover-candlelight'
    | 'autumn-breeze'
    | 'sunny-yard'
    | 'arcade-lights'
    | 'river-sparkle'
    | 'gorge-breeze'
    | 'kitchen-steam';
  waterRegion?: { x: number; y: number; w: number; h: number };
  hotspots: ColoradoHotspotSpec[];
}

const COLORADO_PAGES: ColoradoPageSpec[] = [
  // SPREAD 1 (INDEX 0): Heirloom Leather & Gold-Leaf Cover Page on Candlelit Desk (`p0-cover.jpg`)
  {
    pageNumber: 1,
    isCover: true,
    title: "To Babci and Grandpa's House We Go!",
    bgKey: 'colorado-p0-cover',
    bgFile: '/assets/stories/colorado/pages/p0-cover.jpg?v=co3',
    narrationFile: '/assets/audio/colorado/narration/title.mp3?v=bobchee1',
    narrationText: '',
    ambientType: 'cover-candlelight',
    hotspots: []
  },

  // SPREAD 2 (INDEX 1): The Big Road Trip to Colorado (Clean Plate: p1-clean.jpg + 8 Multi-Frame Sprite Sheets)
  {
    pageNumber: 2,
    title: 'The Big Road Trip to Colorado',
    bgKey: 'colorado-p1-clean',
    bgFile: '/assets/stories/colorado/pages/p1-clean.jpg?v=p1v1',
    narrationFile: '/assets/audio/colorado/narration/page_1.mp3?v=bobchee1',
    narrationText:
      'We packed up our gray Subaru and our big rooftop box for a family road trip to Colorado! Dad held Wyatt in his cozy blue pajamas and Mom held baby Emma as we looked out over the golden autumn mountains.',
    ambientType: 'autumn-breeze',
    hotspots: []
  },

  // SPREAD 3 (INDEX 2): Arriving at Babci & Grandpa's House (Clean Plate: p2-clean.jpg + 8 Multi-Frame Sprite Sheets)
  {
    pageNumber: 3,
    title: "Arriving at Babci & Grandpa's House",
    bgKey: 'colorado-p2-clean',
    bgFile: '/assets/stories/colorado/pages/p2-clean.jpg?v=p2v1',
    narrationFile: '/assets/audio/colorado/narration/page_2.mp3?v=bobchee1',
    narrationText:
      "Hooray, we made it to Babci and Grandpa's sunny house in Colorado! Grandpa and Babci waved from the front porch by the purple lavender flowers and gave Wyatt and Emma the warmest hugs.",
    ambientType: 'sunny-yard',
    hotspots: []
  },

  // SPREAD 4 (INDEX 3): Manitou Springs Penny Arcade (Clean Plate: p3-clean.jpg + 7 Multi-Frame Sprite Sheets + Pinball Playfield)
  {
    pageNumber: 4,
    title: 'Manitou Springs Penny Arcade',
    bgKey: 'colorado-p3-clean',
    bgFile: '/assets/stories/colorado/pages/p3-clean.jpg?v=p3v1',
    narrationFile: '/assets/audio/colorado/narration/page_3.mp3?v=bobchee1',
    narrationText:
      'Next we visited the magical Manitou Springs Penny Arcade! Wyatt and Emma rolled wooden Skee-Balls, rode the bouncy pony, and won long strings of golden tickets while Grandpa and Babci cheered.',
    ambientType: 'arcade-lights',
    hotspots: []
  },

  // SPREAD 5 (INDEX 4): Splashing in Eleven Mile Canyon (`p4-clean.jpg` Clean-Plate Living Books Scene)
  {
    pageNumber: 5,
    title: 'Splashing in Eleven Mile Canyon',
    bgKey: 'colorado-p4-clean',
    bgFile: '/assets/stories/colorado/pages/p4-clean.jpg?v=p4v1',
    narrationFile: '/assets/audio/colorado/narration/page_4.mp3?v=bobchee1',
    narrationText:
      'In sunny Eleven Mile Canyon, Grandpa held Wyatt on the riverbank so he could dip his blue water shoes into the sparkling stream! Little sister Emma sat on a smooth river stone and splashed her hands in the cool water.',
    ambientType: 'river-sparkle',
    hotspots: []
  },

  // SPREAD 6 (INDEX 5): Across the Royal Gorge Bridge (`p5-clean.jpg` Clean-Plate Living Books Scene)
  {
    pageNumber: 6,
    title: 'Across the Royal Gorge Bridge',
    bgKey: 'colorado-p5-clean',
    bgFile: '/assets/stories/colorado/pages/p5-clean.jpg?v=p5v1',
    narrationFile: '/assets/audio/colorado/narration/page_5.mp3?v=bobchee1',
    narrationText:
      'Way up high across the Royal Gorge Bridge, we walked together over the deep red canyon! Wyatt and Emma waved at the bright red gondola gliding through the blue Colorado sky.',
    ambientType: 'gorge-breeze',
    hotspots: []
  },

  // SPREAD 7 (INDEX 6): Choo-Choo Through the Royal Gorge! (Refs: 5.jpg + ref_grandpa_babci.jpg + ref_immediate_family.jpg)
  {
    pageNumber: 7,
    title: 'Choo-Choo Through the Royal Gorge!',
    bgKey: 'colorado-p6-clean',
    bgFile: '/assets/stories/colorado/pages/p6-clean.jpg?v=p6v1',
    narrationFile: '/assets/audio/colorado/narration/page_6.mp3?v=bobchee1',
    narrationText:
      'All aboard the orange Royal Gorge train chugging right beside the rushing river! Grandpa lifted Wyatt up to pull the shiny brass cord, and the big train horn blasted a giant choo-choo through the canyon!',
    ambientType: 'river-sparkle',
    hotspots: []
  },

  // SPREAD 8 (INDEX 7): Exploring Garden of the Gods (Refs: ref_grandpa_babci.jpg + ref_immediate_family.jpg)
  {
    pageNumber: 8,
    title: 'Exploring Garden of the Gods',
    bgKey: 'colorado-p7-clean',
    bgFile: '/assets/stories/colorado/pages/p7-clean.jpg?v=p7v1',
    narrationFile: '/assets/audio/colorado/narration/page_7.mp3?v=bobchee1',
    narrationText:
      'At Garden of the Gods, giant glowing red rocks reached all the way up toward snowy Pikes Peak! Wyatt, Emma, Babci, and Grandpa explored the sunny trail with friendly bluebirds and a little bunny.',
    ambientType: 'gorge-breeze',
    hotspots: []
  },

  // SPREAD 9 (INDEX 8 — FINALE): Making Homemade Pierogis with Babci (`p8.jpg`)
  {
    pageNumber: 9,
    title: 'Making Homemade Pierogis with Babci',
    bgKey: 'colorado-p8-clean',
    bgFile: '/assets/stories/colorado/pages/p8.jpg?v=p8v1',
    narrationFile: '/assets/audio/colorado/narration/page_9.mp3?v=bobchee1',
    narrationText:
      "Inside Babci's cozy kitchen, we rolled out soft dough and pinched delicious homemade potato and cheese pierogis together! Wyatt and Emma got silly puffs of white flour on their noses while golden pierogis sizzled in butter on the stove.",
    ambientType: 'kitchen-steam',
    hotspots: []
  }
];

interface WordPillEntry {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  w: number;
  h: number;
  startRatio: number;
  endRatio: number;
  active: boolean;
}

export class ColoradoStoryScene extends Phaser.Scene {
  private currentPageIndex: number = 0;
  private storyMode: StoryMode = 'let-me-play';
  private isReading: boolean = false;
  private isEndingBook: boolean = false;
  private gondolaAtRightSide: boolean = false;

  private backdropContainer!: Phaser.GameObjects.Container;
  private ambientContainer!: Phaser.GameObjects.Container;
  private stageContainer!: Phaser.GameObjects.Container;
  private karaokeContainer!: Phaser.GameObjects.Container;
  private uiContainer!: Phaser.GameObjects.Container;
  private pageFlipOverlay!: Phaser.GameObjects.Graphics;

  private wordPills: WordPillEntry[] = [];
  private activeNarrationHowl: Howl | null = null;
  private p1AmbientIdleHowl: Howl | null = null;
  private p2AmbientMorningHowl: Howl | null = null;
  private p3AmbientArcadeHowl: Howl | null = null;
  private p3AmbientCrowdHowl: Howl | null = null;
  private p4AmbientStreamHowl: Howl | null = null;
  private p5AmbientWindHowl: Howl | null = null;
  private p5AmbientCableHowl: Howl | null = null;
  private p6AmbientTrainHowl: Howl | null = null;
  private p6AmbientRapidsHowl: Howl | null = null;
  private p7AmbientBreezeHowl: Howl | null = null;
  private p7AmbientBirdsHowl: Howl | null = null;
  private p8AmbientSizzleHowl: Howl | null = null;
  private p8AmbientGuitarHowl: Howl | null = null;
  private howlCache: Map<string, Howl> = new Map();
  private autoAdvanceTimer: Phaser.Time.TimerEvent | null = null;
  private fallbackStartMs: number = 0;
  private fallbackDurationMs: number = 14000;

  constructor() {
    super({ key: 'ColoradoStoryScene' });
  }

  public init(data?: { pageIndex?: number }): void {
    this.currentPageIndex = Phaser.Math.Clamp(data?.pageIndex ?? 0, 0, COLORADO_PAGES.length - 1);
    this.storyMode = ArcadeState.getStoryMode();
    this.isReading = false;
    this.isEndingBook = false;
    this.gondolaAtRightSide = false;
  }

  public create(): void {
    this.backdropContainer = this.add.container(0, 0).setDepth(10);
    this.ambientContainer = this.add.container(0, 0).setDepth(25);
    this.stageContainer = this.add.container(0, 0).setDepth(50);
    this.karaokeContainer = this.add.container(0, 0).setDepth(200);
    this.uiContainer = this.add.container(0, 0).setDepth(300);
    this.pageFlipOverlay = this.add.graphics().setDepth(750).setAlpha(0);

    this.prewarmColoradoAudio();
    this.renderCurrentPage(false);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.stopCurrentNarration();
      this.stopPage1AmbientAudio();
    });
  }

  public update(): void {
    if (!this.isReading || this.wordPills.length === 0) return;

    let ratio = 0;
    if (this.activeNarrationHowl && this.activeNarrationHowl.playing()) {
      const seekSec = this.activeNarrationHowl.seek();
      const durSec = this.activeNarrationHowl.duration();
      if (typeof seekSec === 'number' && durSec > 0) {
        ratio = Phaser.Math.Clamp(seekSec / durSec, 0, 1);
      }
    } else if (this.fallbackStartMs > 0) {
      const elapsed = this.time.now - this.fallbackStartMs;
      ratio = Phaser.Math.Clamp(elapsed / this.fallbackDurationMs, 0, 1);
    }

    for (let i = 0; i < this.wordPills.length; i++) {
      const pill = this.wordPills[i];
      const shouldHighlight = ratio >= pill.startRatio && ratio <= pill.endRatio + 0.015;
      if (shouldHighlight !== pill.active) {
        pill.active = shouldHighlight;
        this.drawWordPillBg(pill.bg, pill.w, pill.h, shouldHighlight);
        pill.text.setColor(shouldHighlight ? '#78350f' : '#271206');
        if (shouldHighlight) {
          Juice.squashAndStretch(this, pill.container, 0.22, 135);
        }
      }
    }
  }

  private prewarmColoradoAudio(): void {
    const urls: string[] = [
      '/assets/audio/colorado/sfx/p1_ambient_idle.mp3',
      '/assets/audio/colorado/sfx/p1_exhaust_rev.mp3',
      '/assets/audio/colorado/sfx/p1_thule_sparky.mp3',
      '/assets/audio/colorado/sfx/p1_doggie_bark.mp3',
      '/assets/audio/colorado/sfx/p1_bluebird_chirp.mp3',
      '/assets/audio/colorado/sfx/p1_eagle_soar.mp3',
      '/assets/audio/colorado/sfx/p1_chipmunk_munch.mp3',
      '/assets/audio/colorado/sfx/p1_cooler_pop.mp3',
      '/assets/audio/colorado/sfx/p2_ambient_morning.mp3',
      '/assets/audio/colorado/sfx/p2_kids_run_giggle.mp3',
      '/assets/audio/colorado/sfx/p2_grandparents_hug.mp3',
      '/assets/audio/colorado/sfx/p2_chimney_sparky.mp3',
      '/assets/audio/colorado/sfx/p2_bush_doggie.mp3',
      '/assets/audio/colorado/sfx/p2_lavender_butterflies.mp3',
      '/assets/audio/colorado/sfx/p2_lawn_sprinkler.mp3',
      '/assets/audio/colorado/sfx/p2_squirrel_juggle.mp3',
      '/assets/audio/colorado/sfx/p3_ambient_arcade_loop.mp3',
      '/assets/audio/colorado/sfx/p3_ambient_crowd_chatter.mp3',
      '/assets/audio/colorado/sfx/p3_skeeball_roll.mp3',
      '/assets/audio/colorado/sfx/p3_skeeball_ding.mp3',
      '/assets/audio/colorado/sfx/p3_tickets_dispense.mp3',
      '/assets/audio/colorado/sfx/p3_emma_giggle.mp3',
      '/assets/audio/colorado/sfx/p3_grandparents_clap.mp3',
      '/assets/audio/colorado/sfx/p3_pony_spring.mp3',
      '/assets/audio/colorado/sfx/p3_doggie_squeak.mp3',
      '/assets/audio/colorado/sfx/p3_claw_servo.mp3',
      '/assets/audio/colorado/sfx/p3_sparky_chime.mp3',
      '/assets/audio/colorado/sfx/p3_fortune_organ.mp3',
      '/assets/audio/colorado/sfx/p3_wheel_spin.mp3',
      '/assets/audio/colorado/sfx/p3_pinball_bumpers.mp3',
      '/assets/audio/colorado/sfx/p3_pinball_bells.mp3',
      '/assets/audio/colorado/sfx/p4_ambient_stream.mp3',
      '/assets/audio/colorado/sfx/p4_cessna_prop.mp3',
      '/assets/audio/colorado/sfx/p4_water_splash.mp3',
      '/assets/audio/colorado/sfx/p4_kids_giggle_splash.mp3',
      '/assets/audio/colorado/sfx/p4_sparky_splash.mp3',
      '/assets/audio/colorado/sfx/p4_doggie_reel.mp3',
      '/assets/audio/colorado/sfx/p4_doggie_bark.mp3',
      '/assets/audio/colorado/sfx/p4_bighorn_leap.mp3',
      '/assets/audio/colorado/sfx/p4_dragonfly_zip.mp3',
      '/assets/audio/colorado/sfx/p5_ambient_gorge_wind.mp3',
      '/assets/audio/colorado/sfx/p5_gusting_canyon_wind.mp3',
      '/assets/audio/colorado/sfx/p5_gondola_cable_loop.mp3',
      '/assets/audio/colorado/sfx/p5_gondola_bell.mp3',
      '/assets/audio/colorado/sfx/p5_eagle_call.mp3',
      '/assets/audio/colorado/sfx/p5_eagle_wings.mp3',
      '/assets/audio/colorado/sfx/p5_flags_flutter.mp3',
      '/assets/audio/colorado/sfx/p5_raft_splash.mp3',
      '/assets/audio/colorado/sfx/p5_doggie_yip.mp3',
      '/assets/audio/colorado/sfx/sfx_train_chug.mp3',
      '/assets/audio/colorado/sfx/sfx_train_horn.mp3',
      '/assets/audio/colorado/sfx/p6_ambient_river_rapids.mp3',
      '/assets/audio/colorado/sfx/p6_otter_splash.mp3',
      '/assets/audio/colorado/sfx/p6_conductor_doggie_bell.mp3',
      '/assets/audio/colorado/sfx/p6_kids_horn_laugh.mp3',
      '/assets/audio/colorado/sfx/p7_ambient_nature_breeze.mp3',
      '/assets/audio/colorado/sfx/p7_ambient_meadow_birds.mp3',
      '/assets/audio/colorado/sfx/p7_bluebirds_chirp.mp3',
      '/assets/audio/colorado/sfx/p7_sparky_magic_puff.mp3',
      '/assets/audio/colorado/sfx/p7_doggie_camera_shutter.mp3',
      '/assets/audio/colorado/sfx/p7_wyatt_wow.mp3',
      '/assets/audio/colorado/sfx/p7_camels_kiss_harp.mp3',
      '/assets/audio/colorado/sfx/p8_pierogi_sizzle_loop.mp3',
      '/assets/audio/colorado/sfx/p8_cozy_kitchen_guitar.mp3'
    ];
    for (const page of COLORADO_PAGES) {
      if (!urls.includes(page.narrationFile)) {
        urls.push(page.narrationFile);
      }
      for (const hs of page.hotspots) {
        if (!urls.includes(hs.sfxFile)) {
          urls.push(hs.sfxFile);
        }
      }
    }
    for (const url of urls) {
      if (!this.howlCache.has(url)) {
        const isP1Ambient = url.endsWith('p1_ambient_idle.mp3');
        const isP2Ambient = url.endsWith('p2_ambient_morning.mp3');
        const isP3ArcadeAmbient = url.endsWith('p3_ambient_arcade_loop.mp3');
        const isP3CrowdAmbient = url.endsWith('p3_ambient_crowd_chatter.mp3');
        const isP4StreamAmbient = url.endsWith('p4_ambient_stream.mp3');
        const isP5WindAmbient = url.endsWith('p5_gusting_canyon_wind.mp3') || url.endsWith('p5_ambient_gorge_wind.mp3');
        const isP5CableAmbient = url.endsWith('p5_gondola_cable_loop.mp3');
        const isP6TrainAmbient = url.endsWith('sfx_train_chug.mp3');
        const isP6RapidsAmbient = url.endsWith('p6_ambient_river_rapids.mp3');
        const isP7BreezeAmbient = url.endsWith('p7_ambient_nature_breeze.mp3');
        const isP7BirdsAmbient = url.endsWith('p7_ambient_meadow_birds.mp3');
        const isP8SizzleAmbient = url.endsWith('p8_pierogi_sizzle_loop.mp3');
        const isP8GuitarAmbient = url.endsWith('p8_cozy_kitchen_guitar.mp3');
        const isLoop =
          isP1Ambient ||
          isP2Ambient ||
          isP3ArcadeAmbient ||
          isP3CrowdAmbient ||
          isP4StreamAmbient ||
          isP5WindAmbient ||
          isP5CableAmbient ||
          isP6TrainAmbient ||
          isP6RapidsAmbient ||
          isP7BreezeAmbient ||
          isP7BirdsAmbient ||
          isP8SizzleAmbient ||
          isP8GuitarAmbient;
        const vol = isP5WindAmbient
          ? 0.75
          : isP8SizzleAmbient
          ? 0.34
          : isP6TrainAmbient
          ? 0.28
          : isP7BreezeAmbient
          ? 0.25
          : isP4StreamAmbient || isP6RapidsAmbient || isP7BirdsAmbient
          ? 0.22
          : isP1Ambient || isP3CrowdAmbient
          ? 0.18
          : isP2Ambient || isP3ArcadeAmbient || isP5CableAmbient || isP8GuitarAmbient
          ? 0.16
          : url.includes('/narration/')
          ? 0.95
          : 0.88;
        this.howlCache.set(
          url,
          new Howl({
            src: [url],
            preload: true,
            loop: isLoop,
            volume: vol
          })
        );
      }
    }
  }

  private startPage1AmbientAudio(): void {
    this.stopPage1AmbientAudio();
    if (AudioBus.getMuted()) return;
    const url = '/assets/audio/colorado/sfx/p1_ambient_idle.mp3';
    let howl = this.howlCache.get(url);
    if (!howl) {
      howl = new Howl({
        src: [url],
        loop: true,
        volume: 0.18
      });
      this.howlCache.set(url, howl);
    } else {
      howl.loop(true);
      howl.volume(0.18);
    }
    this.p1AmbientIdleHowl = howl;
    if (!howl.playing()) {
      howl.play();
    }
  }

  private startPage2AmbientAudio(): void {
    this.stopPage1AmbientAudio();
    if (AudioBus.getMuted()) return;
    const url = '/assets/audio/colorado/sfx/p2_ambient_morning.mp3';
    let howl = this.howlCache.get(url);
    if (!howl) {
      howl = new Howl({
        src: [url],
        loop: true,
        volume: 0.16
      });
      this.howlCache.set(url, howl);
    } else {
      howl.loop(true);
      howl.volume(0.16);
    }
    this.p2AmbientMorningHowl = howl;
    if (!howl.playing()) {
      howl.play();
    }
  }

  private startPage3AmbientAudio(): void {
    this.stopPage1AmbientAudio();
    if (AudioBus.getMuted()) return;

    // 1. Arcade room carnival whistle/chime loop at `volume: 0.16`
    const arcadeUrl = '/assets/audio/colorado/sfx/p3_ambient_arcade_loop.mp3';
    let arcadeHowl = this.howlCache.get(arcadeUrl);
    if (!arcadeHowl) {
      arcadeHowl = new Howl({
        src: [arcadeUrl],
        loop: true,
        volume: 0.16
      });
      this.howlCache.set(arcadeUrl, arcadeHowl);
    } else {
      arcadeHowl.loop(true);
      arcadeHowl.volume(0.16);
    }
    this.p3AmbientArcadeHowl = arcadeHowl;
    if (!arcadeHowl.playing()) {
      arcadeHowl.play();
    }

    // 2. Simultaneous happy children laughing & indoor family crowd chatter loop at `volume: 0.18`
    const crowdUrl = '/assets/audio/colorado/sfx/p3_ambient_crowd_chatter.mp3';
    let crowdHowl = this.howlCache.get(crowdUrl);
    if (!crowdHowl) {
      crowdHowl = new Howl({
        src: [crowdUrl],
        loop: true,
        volume: 0.18
      });
      this.howlCache.set(crowdUrl, crowdHowl);
    } else {
      crowdHowl.loop(true);
      crowdHowl.volume(0.18);
    }
    this.p3AmbientCrowdHowl = crowdHowl;
    if (!crowdHowl.playing()) {
      crowdHowl.play();
    }
  }

  private startPage4AmbientAudio(): void {
    this.stopPage1AmbientAudio();
    if (AudioBus.getMuted()) return;
    const url = '/assets/audio/colorado/sfx/p4_ambient_stream.mp3';
    let howl = this.howlCache.get(url);
    if (!howl) {
      howl = new Howl({
        src: [url],
        loop: true,
        volume: 0.22
      });
      this.howlCache.set(url, howl);
    } else {
      howl.loop(true);
      howl.volume(0.22);
    }
    this.p4AmbientStreamHowl = howl;
    if (!howl.playing()) {
      howl.play();
    }
  }

  private startPage5AmbientAudio(): void {
    this.stopPage1AmbientAudio();
    if (AudioBus.getMuted()) return;

    // 1. Audible high-altitude mountain canyon gusting wind loop at `volume: 0.75`
    const windUrl = '/assets/audio/colorado/sfx/p5_gusting_canyon_wind.mp3';
    let windHowl = this.howlCache.get(windUrl);
    if (!windHowl) {
      windHowl = new Howl({
        src: [windUrl],
        loop: true,
        volume: 0.75
      });
      this.howlCache.set(windUrl, windHowl);
    } else {
      windHowl.loop(true);
      windHowl.volume(0.75);
    }
    this.p5AmbientWindHowl = windHowl;
    if (!windHowl.playing()) {
      windHowl.play();
    }

    // 2. Smooth rhythmic aerial cable car pulley hum loop at `volume: 0.16`
    const cableUrl = '/assets/audio/colorado/sfx/p5_gondola_cable_loop.mp3';
    let cableHowl = this.howlCache.get(cableUrl);
    if (!cableHowl) {
      cableHowl = new Howl({
        src: [cableUrl],
        loop: true,
        volume: 0.16
      });
      this.howlCache.set(cableUrl, cableHowl);
    } else {
      cableHowl.loop(true);
      cableHowl.volume(0.16);
    }
    this.p5AmbientCableHowl = cableHowl;
    if (!cableHowl.playing()) {
      cableHowl.play();
    }
  }

  private startPage6AmbientAudio(): void {
    this.stopPage1AmbientAudio();
    if (AudioBus.getMuted()) return;

    // 1. Rhythmic Royal Gorge train chugging loop at `volume: 0.28`
    const trainUrl = '/assets/audio/colorado/sfx/sfx_train_chug.mp3';
    let trainHowl = this.howlCache.get(trainUrl);
    if (!trainHowl) {
      trainHowl = new Howl({
        src: [trainUrl],
        loop: true,
        volume: 0.28
      });
      this.howlCache.set(trainUrl, trainHowl);
    } else {
      trainHowl.loop(true);
      trainHowl.volume(0.28);
    }
    this.p6AmbientTrainHowl = trainHowl;
    if (!trainHowl.playing()) {
      trainHowl.play();
    }

    // 2. Simultaneous Arkansas River whitewater rapids loop at `volume: 0.22`
    const rapidsUrl = '/assets/audio/colorado/sfx/p6_ambient_river_rapids.mp3';
    let rapidsHowl = this.howlCache.get(rapidsUrl);
    if (!rapidsHowl) {
      rapidsHowl = new Howl({
        src: [rapidsUrl],
        loop: true,
        volume: 0.22
      });
      this.howlCache.set(rapidsUrl, rapidsHowl);
    } else {
      rapidsHowl.loop(true);
      rapidsHowl.volume(0.22);
    }
    this.p6AmbientRapidsHowl = rapidsHowl;
    if (!rapidsHowl.playing()) {
      rapidsHowl.play();
    }
  }

  private startPage7AmbientAudio(): void {
    this.stopPage1AmbientAudio();
    if (AudioBus.getMuted()) return;

    // 1. Peaceful sunny mountain park breeze loop at `volume: 0.25`
    const breezeUrl = '/assets/audio/colorado/sfx/p7_ambient_nature_breeze.mp3';
    let breezeHowl = this.howlCache.get(breezeUrl);
    if (!breezeHowl) {
      breezeHowl = new Howl({
        src: [breezeUrl],
        loop: true,
        volume: 0.25
      });
      this.howlCache.set(breezeUrl, breezeHowl);
    } else {
      breezeHowl.loop(true);
      breezeHowl.volume(0.25);
    }
    this.p7AmbientBreezeHowl = breezeHowl;
    if (!breezeHowl.playing()) {
      breezeHowl.play();
    }

    // 2. Simultaneous cheerful meadow songbirds loop at `volume: 0.22`
    const birdsUrl = '/assets/audio/colorado/sfx/p7_ambient_meadow_birds.mp3';
    let birdsHowl = this.howlCache.get(birdsUrl);
    if (!birdsHowl) {
      birdsHowl = new Howl({
        src: [birdsUrl],
        loop: true,
        volume: 0.22
      });
      this.howlCache.set(birdsUrl, birdsHowl);
    } else {
      birdsHowl.loop(true);
      birdsHowl.volume(0.22);
    }
    this.p7AmbientBirdsHowl = birdsHowl;
    if (!birdsHowl.playing()) {
      birdsHowl.play();
    }
  }

  private startPage8AmbientAudio(): void {
    this.stopPage1AmbientAudio();
    if (AudioBus.getMuted()) return;

    // 1. Comforting cast-iron butter & pierogi sizzle loop at `volume: 0.34`
    const sizzleUrl = '/assets/audio/colorado/sfx/p8_pierogi_sizzle_loop.mp3';
    let sizzleHowl = this.howlCache.get(sizzleUrl);
    if (!sizzleHowl) {
      sizzleHowl = new Howl({
        src: [sizzleUrl],
        loop: true,
        volume: 0.34
      });
      this.howlCache.set(sizzleUrl, sizzleHowl);
    } else {
      sizzleHowl.loop(true);
      sizzleHowl.volume(0.34);
    }
    this.p8AmbientSizzleHowl = sizzleHowl;
    if (!sizzleHowl.playing()) {
      sizzleHowl.play();
    }

    // 2. Simultaneous warm fingerpicked acoustic guitar lullaby loop at `volume: 0.16`
    const guitarUrl = '/assets/audio/colorado/sfx/p8_cozy_kitchen_guitar.mp3';
    let guitarHowl = this.howlCache.get(guitarUrl);
    if (!guitarHowl) {
      guitarHowl = new Howl({
        src: [guitarUrl],
        loop: true,
        volume: 0.16
      });
      this.howlCache.set(guitarUrl, guitarHowl);
    } else {
      guitarHowl.loop(true);
      guitarHowl.volume(0.16);
    }
    this.p8AmbientGuitarHowl = guitarHowl;
    if (!guitarHowl.playing()) {
      guitarHowl.play();
    }
  }

  private stopPage1AmbientAudio(): void {
    if (this.p1AmbientIdleHowl) {
      this.p1AmbientIdleHowl.stop();
      this.p1AmbientIdleHowl = null;
    }
    if (this.p2AmbientMorningHowl) {
      this.p2AmbientMorningHowl.stop();
      this.p2AmbientMorningHowl = null;
    }
    if (this.p3AmbientArcadeHowl) {
      this.p3AmbientArcadeHowl.stop();
      this.p3AmbientArcadeHowl = null;
    }
    if (this.p3AmbientCrowdHowl) {
      this.p3AmbientCrowdHowl.stop();
      this.p3AmbientCrowdHowl = null;
    }
    if (this.p4AmbientStreamHowl) {
      this.p4AmbientStreamHowl.stop();
      this.p4AmbientStreamHowl = null;
    }
    if (this.p5AmbientWindHowl) {
      this.p5AmbientWindHowl.stop();
      this.p5AmbientWindHowl = null;
    }
    if (this.p5AmbientCableHowl) {
      this.p5AmbientCableHowl.stop();
      this.p5AmbientCableHowl = null;
    }
    if (this.p6AmbientTrainHowl) {
      this.p6AmbientTrainHowl.stop();
      this.p6AmbientTrainHowl = null;
    }
    if (this.p6AmbientRapidsHowl) {
      this.p6AmbientRapidsHowl.stop();
      this.p6AmbientRapidsHowl = null;
    }
    if (this.p7AmbientBreezeHowl) {
      this.p7AmbientBreezeHowl.stop();
      this.p7AmbientBreezeHowl = null;
    }
    if (this.p7AmbientBirdsHowl) {
      this.p7AmbientBirdsHowl.stop();
      this.p7AmbientBirdsHowl = null;
    }
    if (this.p8AmbientSizzleHowl) {
      this.p8AmbientSizzleHowl.stop();
      this.p8AmbientSizzleHowl = null;
    }
    if (this.p8AmbientGuitarHowl) {
      this.p8AmbientGuitarHowl.stop();
      this.p8AmbientGuitarHowl = null;
    }
  }

  private playColoradoSfx(sfxUrl: string, volume: number = 0.88): void {
    if (AudioBus.getMuted()) return;
    let howl = this.howlCache.get(sfxUrl);
    if (!howl) {
      howl = new Howl({ src: [sfxUrl], volume });
      this.howlCache.set(sfxUrl, howl);
    } else {
      howl.volume(volume);
    }
    howl.stop();
    howl.play();
  }

  private stopCurrentNarration(): void {
    this.isReading = false;
    this.fallbackStartMs = 0;
    if (this.autoAdvanceTimer) {
      this.autoAdvanceTimer.remove(false);
      this.autoAdvanceTimer = null;
    }
    if (this.activeNarrationHowl) {
      this.activeNarrationHowl.stop();
      this.activeNarrationHowl = null;
    }
    for (const pill of this.wordPills) {
      if (pill.active) {
        pill.active = false;
        if (pill.bg.scene) {
          this.drawWordPillBg(pill.bg, pill.w, pill.h, false);
          pill.text.setColor('#271206');
        }
      }
    }
  }

  private playPageNarration(): void {
    this.stopCurrentNarration();
    if (AudioBus.getMuted()) return;

    const spec = COLORADO_PAGES[this.currentPageIndex];
    let howl = this.howlCache.get(spec.narrationFile);
    if (!howl) {
      howl = new Howl({
        src: [spec.narrationFile],
        volume: 0.95
      });
      this.howlCache.set(spec.narrationFile, howl);
    }

    this.activeNarrationHowl = howl;
    this.isReading = true;
    this.fallbackStartMs = this.time.now;
    this.fallbackDurationMs = 15500;

    howl.off('end');
    howl.once('end', () => {
      this.isReading = false;
      for (const pill of this.wordPills) {
        pill.active = false;
        if (pill.bg.scene) {
          this.drawWordPillBg(pill.bg, pill.w, pill.h, false);
          pill.text.setColor('#271206');
        }
      }
      if (this.storyMode === 'read-to-me') {
        this.autoAdvanceTimer = this.time.delayedCall(2600, () => {
          if (this.currentPageIndex < COLORADO_PAGES.length - 1) {
            AudioBus.playSfx('page-turn');
            this.goToPage(this.currentPageIndex + 1, 'next');
          } else {
            this.triggerTheEndSequence();
          }
        });
      }
    });

    howl.play();
  }

  private goToPage(targetIndex: number, direction: 'next' | 'prev' = 'next'): void {
    if (this.isEndingBook) return;
    if (targetIndex >= COLORADO_PAGES.length) {
      this.triggerTheEndSequence();
      return;
    }
    this.stopCurrentNarration();
    this.currentPageIndex = Phaser.Math.Clamp(targetIndex, 0, COLORADO_PAGES.length - 1);
    this.renderCurrentPage(true, direction);
  }

  private renderCurrentPage(withPageCurlTransition: boolean = true, direction: 'next' | 'prev' = 'next'): void {
    this.stopCurrentNarration();
    this.stopPage1AmbientAudio();
    this.isEndingBook = false;
    this.gondolaAtRightSide = false;

    this.backdropContainer.removeAll(true);
    this.ambientContainer.removeAll(true);
    this.stageContainer.removeAll(true);
    this.karaokeContainer.removeAll(true);
    this.uiContainer.removeAll(true);
    this.wordPills = [];

    const page = COLORADO_PAGES[this.currentPageIndex];

    // 1. Mount Full-Bleed Clean-Stage 1280x720 32-Bit Hi-Bit Pixel Art Page Background (.jpg or .png)
    if (this.textures.exists(page.bgKey)) {
      this.textures.get(page.bgKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      const bgImg = this.add
        .image(640, 360, page.bgKey)
        .setOrigin(0.5, 0.5)
        .setDisplaySize(1280, 720);
      this.backdropContainer.add(bgImg);
    } else if (page.bgFile) {
      this.load.image(page.bgKey, page.bgFile);
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        if (this.scene.isActive() && this.textures.exists(page.bgKey)) {
          this.textures.get(page.bgKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
          const bgImg = this.add
            .image(640, 360, page.bgKey)
            .setOrigin(0.5, 0.5)
            .setDisplaySize(1280, 720);
          this.backdropContainer.removeAll(true);
          this.backdropContainer.add(bgImg);
        }
      });
      this.load.start();
    } else {
      const fallback = this.add.graphics();
      fallback.fillStyle(0x1e293b, 1);
      fallback.fillRect(0, 0, 1280, 720);
      this.backdropContainer.add(fallback);
    }

    // 2. Subtle Ambient Page Motion (Sparkling River Water on Pages 4, 5, 6; Kitchen Steam on Page 9)
    this.renderPageAmbientEffects(page);

    // 3. True Moving Sprite Actors on the Clean Stage (Zero duplicate stickers or dark oval shadows!)
    this.renderPageHotspots(page);

    // 4. Draw subtle picture-book paper border around the 1280x720 page (identical to Book 1)
    this.drawPictureBookFrame();

    // 5. Build the compact top cream parchment banner (`top: 10px, height: 84px`, identical to Book 1)
    //    Hidden on the Cover spread so none of the gold leaf title plaque or perched bluebirds get covered!
    if (!page.isCover && page.narrationText.trim().length > 0) {
      this.buildParchmentKaraokeBanner(page);
    }

    // 6. Build unobtrusive bookmark ribbons & dog-eared page-turn corners (identical to Book 1)
    this.buildBookNavigationChrome(page);

    // 7. Gentle parchment page-turn transition + automatic narration on Cover or in Read-to-Me mode
    if (withPageCurlTransition) {
      this.playPageFlipTransition(direction);
    } else {
      this.cameras.main.fadeIn(220, 28, 22, 16);
    }

    if (page.isCover || this.storyMode === 'read-to-me') {
      this.time.delayedCall(260, () => {
        const activePage = COLORADO_PAGES[this.currentPageIndex];
        if (this.scene.isActive() && (activePage?.isCover || this.storyMode === 'read-to-me')) {
          this.playPageNarration();
        }
      });
    }
  }

  /**
   * Identical to Book 1 (`StoryEngineScene.ts`):
   * Draws the warm cream and amber picture-book paper border around the `1280x720` stage.
   */
  private drawPictureBookFrame(): void {
    const frame = this.add.graphics();
    frame.lineStyle(10, 0xf5ead2, 0.9);
    frame.strokeRect(5, 5, 1270, 710);
    frame.lineStyle(2, 0x92400e, 0.45);
    frame.strokeRect(10, 10, 1260, 700);
    this.uiContainer.add(frame);
  }

  /**
   * Identical to Book 1 (`StoryEngineScene.ts`):
   * Smoothly wipes a warm cream parchment sheet across the screen on page turn.
   */
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

  /**
   * Identical to Book 1 (`StoryEngineScene.ts`):
   * Compact warm cream storybook parchment banner (`bannerX = 156, bannerY = 10, bannerW = 968, height >= 84px`)
   * with clickable word pills and full narration trigger on plaque click.
   */
  private buildParchmentKaraokeBanner(page: ColoradoPageSpec): void {
    const rawWords = page.narrationText.split(/\s+/).filter(Boolean);
    if (rawWords.length === 0) return;

    const bannerX = 156;
    const bannerY = 10;
    const bannerW = 968;

    const fullTextLen = rawWords.join(' ').length;
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

    const weights = rawWords.map((w) => {
      let wt = Math.max(2, w.replace(/[^a-zA-Z]/g, '').length);
      if (/[,.!?;:]$/.test(w)) wt += 2.6;
      return wt;
    });
    const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;

    const tempTexts = rawWords.map((word) => {
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

    let accumWeight = 0;
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

        const startRatio = accumWeight / totalWeight;
        accumWeight += weights[item.wordIndex];
        const endRatio = accumWeight / totalWeight;

        pillContainer.on('pointerdown', () => {
          AudioBus.playSfx('pop');
          const cleanWord = item.word.replace(/[^a-zA-Z0-9'-]/g, '');
          const spoken = cleanWord.replace(/Babci/gi, 'Bob-chee');
          AudioBus.speakWordOrPhrase(spoken || item.word);
          this.highlightWordIndex(item.wordIndex, true);
          Juice.burstStars(this, pillX, y, 6, [0xfbbf24, 0xf59e0b]);
        });

        this.karaokeContainer.add(pillContainer);
        this.wordPills[item.wordIndex] = {
          container: pillContainer,
          bg: pillBg,
          text: wordText,
          w: item.width,
          h: pillH,
          startRatio,
          endRatio,
          active: false
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
      pill.active = isMatch;
      this.drawWordPillBg(pill.bg, pill.w, pill.h, isMatch);
      pill.text.setColor(isMatch ? '#78350f' : '#271206');

      if (isMatch) {
        Juice.squashAndStretch(this, pill.container, 0.22, 135);
        if (singleTap) {
          this.time.delayedCall(520, () => {
            if (pill.bg.scene && !this.isReading) {
              pill.active = false;
              this.drawWordPillBg(pill.bg, pill.w, pill.h, false);
              pill.text.setColor('#271206');
            }
          });
        }
      }
    });
  }

  /**
   * Identical to Book 1 (`StoryEngineScene.ts`):
   * Hanging top bookmark ribbons (`HUB` at 58, 52 and `Play Mode` / `Read to Me` at 1208, 54)
   * plus bottom dog-eared page-turn corners (`p.1` .. `★ End`).
   */
  private buildBookNavigationChrome(page: ColoradoPageSpec): void {
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
    const isFinalePage = this.currentPageIndex >= COLORADO_PAGES.length - 1;
    Juice.makeTactileButton(
      this,
      homeRibbon,
      76,
      92,
      () => {
        if (isFinalePage) {
          this.triggerTheEndSequence();
          return;
        }
        this.stopCurrentNarration();
        this.stopPage1AmbientAudio();
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
      .text(0, 9, `${page.pageNumber} / ${COLORADO_PAGES.length}`, {
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

    const isLastPage = this.currentPageIndex >= COLORADO_PAGES.length - 1;
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

  /**
   * Calm Cinematic Fade-Out When Clicking Off Page 8 (Book Completion):
   * - Guards against double-clicks (`this.isEndingBook = true`).
   * - Creates a full-screen `1280x720` warm dark-amber/charcoal overlay rectangle (`#120D08`, `depth: 9999`, initial `alpha: 0.0`)
   *   and tweens its `alpha` smoothly from `0.0 -> 1.0` over `2,200ms` (`Sine.easeInOut`).
   * - Simultaneously tweens the volume of `p8_pierogi_sizzle_loop`, `p8_cozy_kitchen_guitar`, and any active narration
   *   smoothly down to `0.0` over `2,000ms`.
   * - Once the `2,200ms` fade completes, stops the Page 8 loops cleanly and transitions to `HubScene`.
   */
  private triggerTheEndSequence(): void {
    if (this.isEndingBook) return;
    this.isEndingBook = true;

    if (this.autoAdvanceTimer) {
      this.autoAdvanceTimer.remove(false);
      this.autoAdvanceTimer = null;
    }

    ArcadeState.addStars(5);

    // 1. Full-screen 1280x720 warm dark-amber/charcoal overlay rectangle (#120D08, depth: 9999, initial alpha: 0.0)
    const fadeOverlay = this.add
      .rectangle(640, 360, 1280, 720, 0x120d08, 1)
      .setOrigin(0.5, 0.5)
      .setDepth(9999)
      .setAlpha(0);

    // 2. Simultaneously tween the volume of p8_pierogi_sizzle_loop, p8_cozy_kitchen_guitar, and any active narration down to 0.0 over 2,000ms
    AudioBus.clearNarrationTimers();
    const activeHowls = [...AudioBus.getActiveNarrationAndAmbientHowls()];
    const candidateHowls: (Howl | null)[] = [
      this.activeNarrationHowl,
      this.p1AmbientIdleHowl,
      this.p2AmbientMorningHowl,
      this.p3AmbientArcadeHowl,
      this.p3AmbientCrowdHowl,
      this.p4AmbientStreamHowl,
      this.p5AmbientWindHowl,
      this.p5AmbientCableHowl,
      this.p6AmbientTrainHowl,
      this.p6AmbientRapidsHowl,
      this.p7AmbientBreezeHowl,
      this.p7AmbientBirdsHowl,
      this.p8AmbientSizzleHowl,
      this.p8AmbientGuitarHowl
    ];
    for (const h of candidateHowls) {
      if (h && h.playing() && !activeHowls.includes(h)) {
        activeHowls.push(h);
      }
    }

    activeHowls.forEach((howl) => {
      const volState = { volume: howl.volume() };
      this.tweens.add({
        targets: volState,
        volume: 0,
        duration: 2000,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          howl.volume(Math.max(0, volState.volume));
        },
        onComplete: () => {
          howl.stop();
        }
      });
    });

    // 3. Tween overlay alpha 0.0 -> 1.0 over 2,200ms (Sine.easeInOut), then stop loops and return to HubScene
    this.tweens.add({
      targets: fadeOverlay,
      alpha: 1,
      duration: 2200,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.stopCurrentNarration();
        this.stopPage1AmbientAudio();
        AudioBus.stopAmbientLoop();
        this.scene.start('HubScene');
      }
    });
  }

  /**
   * Minimal, non-intrusive Cover Page (`p0-cover.jpg`) ambiance matching Book 1's cover feel:
   * 1. Soft, warm flickering radial candlelight glow pulses at the upper-left desk candle (`x: 32, y: 42`)
   *    and upper-right desk candle (`x: 1218, y: 55`).
   * 2. 12 slow-drifting, warm golden dust motes floating gently across the candlelit wooden desk.
   * 3. Tapping the center family portrait or title plaque plays a warm harp/music-box chord and reads
   *    the cover title aloud.
   */
  private mountCoverAmbientMagic(): void {
    const glowKey = this.textures.exists('cover-candle-glow') ? 'cover-candle-glow' : 'particle-star';

    const candleFlames = [
      { x: 32, y: 42 },
      { x: 1218, y: 55 }
    ];

    candleFlames.forEach((flame, idx) => {
      const outerHalo = this.add
        .image(flame.x, flame.y, glowKey)
        .setOrigin(0.5, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xf59e0b)
        .setScale(1.38)
        .setAlpha(0.28);

      const innerHalo = this.add
        .image(flame.x, flame.y, glowKey)
        .setOrigin(0.5, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xfef08a)
        .setScale(0.62)
        .setAlpha(0.38);

      this.ambientContainer.add([outerHalo, innerHalo]);

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

    const motePalette = [0xfef08a, 0xfde047, 0xfbbf24, 0xfffbeb];
    for (let i = 0; i < 12; i++) {
      const startX = Phaser.Math.Between(55, 1225);
      const startY = Phaser.Math.Between(65, 675);
      const baseScale = Phaser.Math.FloatBetween(0.06, 0.15);
      const mote = this.add
        .image(startX, startY, glowKey)
        .setOrigin(0.5, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(motePalette[i % motePalette.length])
        .setScale(baseScale)
        .setAlpha(Phaser.Math.FloatBetween(0.1, 0.3));

      this.ambientContainer.add(mote);

      this.tweens.add({
        targets: mote,
        x: startX + Phaser.Math.Between(-45, 45),
        y: startY - Phaser.Math.Between(25, 68),
        duration: Phaser.Math.Between(5800, 9600),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      this.tweens.add({
        targets: mote,
        alpha: {
          from: Phaser.Math.FloatBetween(0.06, 0.14),
          to: Phaser.Math.FloatBetween(0.24, 0.42)
        },
        scaleX: baseScale * 1.22,
        scaleY: baseScale * 1.22,
        duration: Phaser.Math.Between(2200, 4100),
        delay: i * 180,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    // Interactive zone over the center family portrait and title plaque on Page 0 (`p0-cover.jpg`)
    const coverTapZone = this.add
      .zone(640, 360, 760, 580)
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });
    coverTapZone.on('pointerdown', () => {
      AudioBus.playSfx('chime');
      this.playPageNarration();
    });
    this.stageContainer.add(coverTapZone);
  }

  /**
   * Renders ambient candlelight on the Cover page, water shaders on Pages 4, 5, and 6,
   * rising kitchen steam on Page 9, and gentle floating sunlight motes.
   */
  private renderPageAmbientEffects(page: ColoradoPageSpec): void {
    if (page.isCover || page.ambientType === 'cover-candlelight') {
      this.mountCoverAmbientMagic();
      return;
    }

    if (page.waterRegion) {
      const { x, y, w, h } = page.waterRegion;
      for (let i = 0; i < 16; i++) {
        const rx = x + Phaser.Math.Between(12, Math.max(24, w - 12));
        const ry = y + Phaser.Math.Between(10, Math.max(20, h - 10));
        const ripple = this.add.graphics();
        ripple.fillStyle(0xe0f2fe, 0.5);
        ripple.fillRoundedRect(-16, -2, 32, 4, 2);
        ripple.setPosition(rx, ry);
        ripple.setBlendMode(Phaser.BlendModes.ADD);
        this.ambientContainer.add(ripple);

        this.tweens.add({
          targets: ripple,
          x: rx + Phaser.Math.Between(16, 38),
          alpha: { from: 0.14, to: 0.72 },
          scaleX: { from: 0.65, to: 1.3 },
          duration: 1450 + (i % 5) * 310,
          delay: i * 140,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    }

    if (
      page.ambientType === 'kitchen-steam' &&
      page.bgKey !== 'colorado-p8-clean' &&
      page.bgKey !== 'colorado-p8'
    ) {
      const steamSources = [
        { x: 825, y: 460 },
        { x: 215, y: 470 },
        { x: 540, y: 525 }
      ];
      steamSources.forEach((src, sIdx) => {
        for (let i = 0; i < 4; i++) {
          const puff = this.add.graphics();
          puff.fillStyle(0xffffff, 0.24);
          puff.fillCircle(0, 0, 12 + i * 3);
          puff.setPosition(src.x + Phaser.Math.Between(-16, 16), src.y);
          this.ambientContainer.add(puff);

          this.tweens.add({
            targets: puff,
            y: src.y - 70 - i * 10,
            x: puff.x + (i % 2 === 0 ? 12 : -12),
            alpha: { from: 0.3, to: 0 },
            scaleX: { from: 0.7, to: 1.55 },
            scaleY: { from: 0.7, to: 1.55 },
            duration: 2400 + i * 360,
            delay: sIdx * 300 + i * 420,
            repeat: -1,
            ease: 'Sine.easeOut'
          });
        }
      });
    }
  }

  /**
   * Mounts the true moving sprites on the clean stage with ZERO dark oval shadows and
   * ZERO floating text popups (strictly SFX + physical animation, matching Book 1!).
   */
  private renderPageHotspots(page: ColoradoPageSpec): void {
    if (page.isCover) return;
    if (page.bgKey === 'colorado-p1-clean') {
      this.mountPage1LivingScene();
      return;
    }
    if (page.bgKey === 'colorado-p2-clean' || page.bgKey === 'colorado-p2') {
      this.mountPage2LivingScene();
      return;
    }
    if (page.bgKey === 'colorado-p3-clean' || page.bgKey === 'colorado-p3') {
      this.mountPage3LivingScene();
      return;
    }
    if (page.bgKey === 'colorado-p4-clean' || page.bgKey === 'colorado-p4') {
      this.mountPage4LivingScene();
      return;
    }
    if (page.bgKey === 'colorado-p5-clean' || page.bgKey === 'colorado-p5') {
      this.mountPage5LivingScene();
      return;
    }
    if (page.bgKey === 'colorado-p6-clean' || page.bgKey === 'colorado-p6') {
      this.mountPage6LivingScene();
      return;
    }
    if (page.bgKey === 'colorado-p7-clean' || page.bgKey === 'colorado-p7') {
      this.mountPage7LivingScene();
      return;
    }
    if (page.bgKey === 'colorado-p8-clean' || page.bgKey === 'colorado-p8' || page.bgKey === 'colorado-p9') {
      this.mountPage8LivingScene();
      return;
    }
    page.hotspots.forEach((spec, idx) => {
      const actor = this.add.container(spec.x, spec.y);

      let spriteImg: Phaser.GameObjects.Image | null = null;
      if (spec.spriteKey && this.textures.exists(spec.spriteKey)) {
        this.textures.get(spec.spriteKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
        spriteImg = this.add
          .image(0, 0, spec.spriteKey)
          .setOrigin(0.5, 0.5)
          .setScale(spec.baseScale);
        actor.add(spriteImg);

        if (spec.hiddenAtRest) {
          spriteImg.setAlpha(0);
          // Subtle water ring ripple where the trout is swimming underneath
          const ring = this.add.graphics();
          ring.lineStyle(2.5, 0xe0f2fe, 0.75);
          ring.strokeEllipse(0, 8, 56, 18);
          actor.add(ring);
          this.tweens.add({
            targets: ring,
            scaleX: { from: 0.75, to: 1.35 },
            scaleY: { from: 0.75, to: 1.35 },
            alpha: { from: 0.75, to: 0.15 },
            duration: 1350,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        } else {
          // Gentle Living-Books idle breathing motion
          this.tweens.add({
            targets: spriteImg,
            y: { from: 0, to: -3.5 },
            scaleX: { from: spec.baseScale, to: spec.baseScale * 1.02 },
            scaleY: { from: spec.baseScale, to: spec.baseScale * 0.985 },
            duration: 1750 + idx * 240,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        }
      }

      const hitZone = this.add
        .zone(0, 0, Math.max(72, spec.hitW), Math.max(72, spec.hitH))
        .setOrigin(0.5, 0.5)
        .setInteractive({ useHandCursor: true });
      actor.add(hitZone);

      let isBusy = false;
      hitZone.on('pointerdown', () => {
        if (isBusy) return;
        isBusy = true;

        this.playColoradoSfx(spec.sfxFile);
        ArcadeState.markHotspotDiscovered(`colorado:p${page.pageNumber}:${spec.id}`);
        Juice.burstStars(this, actor.x, actor.y - 16, 16, spec.particleColors);

        this.runHotspotGagAnimation(spec, actor, spriteImg, () => {
          isBusy = false;
        });
      });

      this.stageContainer.add(actor);
    });
  }

  /**
   * Book 2 — Page 1 ("The Big Road Trip to Colorado") Clean-Plate Living Books Scene:
   * Mounts all 8 multi-frame sprite sheets, the pixel-registered foreground head-occlusion mask
   * (`p1_heads_foreground_mask.png`), the ambient rolling exhaust smoke + quiet engine idle loop,
   * the soaring Colorado golden eagle, the drifting autumn leaves, and the hanging pine-tree air
   * freshener in both `Read to Me` and `Play Mode`.
   */
  private mountPage1LivingScene(): void {
    const requiredSpritesheets: { key: string; url: string; frameWidth: number; frameHeight: number }[] = [
      { key: 'p1_thule_sparky', url: '/assets/stories/colorado/sprites/p1/p1_thule_sparky.png?v=p1v1', frameWidth: 462, frameHeight: 245 },
      { key: 'p1_doggie_suitcase', url: '/assets/stories/colorado/sprites/p1/p1_doggie_suitcase.png?v=p1v1', frameWidth: 239, frameHeight: 269 },
      { key: 'p1_exhaust_smoke', url: '/assets/stories/colorado/sprites/p1/p1_exhaust_smoke.png?v=p1v1', frameWidth: 249, frameHeight: 433 },
      { key: 'p1_bluebird', url: '/assets/stories/colorado/sprites/p1/p1_bluebird.png?v=p1v1', frameWidth: 251, frameHeight: 276 },
      { key: 'p1_chipmunk', url: '/assets/stories/colorado/sprites/p1/p1_chipmunk.png?v=p1v1', frameWidth: 263, frameHeight: 345 },
      { key: 'p1_eagle_soar', url: '/assets/stories/colorado/sprites/p1/p1_eagle_soar.png?v=p1v1', frameWidth: 313, frameHeight: 252 },
      { key: 'p1_camping_cooler', url: '/assets/stories/colorado/sprites/p1/p1_camping_cooler.png?v=p1v1', frameWidth: 266, frameHeight: 278 },
      { key: 'p1_autumn_leaves', url: '/assets/stories/colorado/sprites/p1/p1_autumn_leaves.png?v=p1v1', frameWidth: 281, frameHeight: 281 }
    ];
    const requiredImages: { key: string; url: string }[] = [
      { key: 'p1_pine_freshener', url: '/assets/stories/colorado/sprites/p1/p1_pine_freshener.png?v=p1v1' },
      { key: 'p1_heads_foreground_mask', url: '/assets/stories/colorado/sprites/p1/p1_heads_foreground_mask.png?v=p1v2' }
    ];

    let needsRuntimeLoad = false;
    for (const ss of requiredSpritesheets) {
      if (!this.textures.exists(ss.key)) {
        this.load.spritesheet(ss.key, ss.url, { frameWidth: ss.frameWidth, frameHeight: ss.frameHeight });
        needsRuntimeLoad = true;
      }
    }
    for (const img of requiredImages) {
      if (!this.textures.exists(img.key)) {
        this.load.image(img.key, img.url);
        needsRuntimeLoad = true;
      }
    }
    if (needsRuntimeLoad) {
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        if (this.scene.isActive() && COLORADO_PAGES[this.currentPageIndex]?.bgKey === 'colorado-p1-clean') {
          this.mountPage1LivingScene();
        }
      });
      this.load.start();
      return;
    }

    // Apply crisp NEAREST pixel-art filtering to all Page 1 textures
    [...requiredSpritesheets.map((s) => s.key), ...requiredImages.map((i) => i.key)].forEach((k) => {
      if (this.textures.exists(k)) {
        this.textures.get(k).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    });

    // Start quiet background engine + autumn breeze loop (`volume: 0.18`) while on Page 1
    this.startPage1AmbientAudio();

    // =========================================================================
    // 1. Thule Rooftop Cargo Box + Balloons + Sparky (`p1_thule_sparky`)
    //    & Foreground Head-Occlusion Mask (`p1_heads_foreground_mask`)
    // =========================================================================
    const thuleBaseX = 548;
    const thuleBaseY = 274;
    const thuleScale = 0.68;
    const thuleSprite = this.add
      .sprite(thuleBaseX, thuleBaseY, 'p1_thule_sparky', 0)
      .setOrigin(0.5, 1.0)
      .setScale(thuleScale)
      .setDepth(10);
    this.stageContainer.add(thuleSprite);

    // Foreground head mask at (385, 165), origin(0, 0), depth: 15, non-interactive
    const headsMask = this.add
      .image(385, 165, 'p1_heads_foreground_mask')
      .setOrigin(0, 0)
      .setDepth(15);
    headsMask.disableInteractive();
    this.stageContainer.add(headsMask);

    // Interactive zone over the rooftop Thule box (at depth 14 so headsMask stays non-interactive)
    const thuleZone = this.add
      .zone(thuleBaseX + 10, thuleBaseY - 38, 250, 96)
      .setOrigin(0.5, 0.5)
      .setDepth(14)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(thuleZone);

    let isThuleBusy = false;
    thuleZone.on('pointerdown', () => {
      if (isThuleBusy) return;
      isThuleBusy = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p1_thule_sparky.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p2:p1-thule');
      Juice.burstStars(this, thuleBaseX + 15, thuleBaseY - 56, 14, [0x34d399, 0xfde047, 0x38bdf8, 0xffffff]);

      // Shake the box slightly (x: +-3px for 200ms)
      this.tweens.add({
        targets: thuleSprite,
        x: { from: thuleBaseX - 3, to: thuleBaseX + 3 },
        duration: 50,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          if (!thuleSprite.scene) return;
          thuleSprite.setX(thuleBaseX);

          // Step frames 0 -> 1 -> 2 -> 3 at 6 fps (~166ms per frame)
          const stepMs = 166;
          thuleSprite.setFrame(1);
          this.time.delayedCall(stepMs, () => {
            if (!thuleSprite.scene) return;
            thuleSprite.setFrame(2);
          });
          this.time.delayedCall(stepMs * 2, () => {
            if (!thuleSprite.scene) return;
            thuleSprite.setFrame(3);

            // Hold Frame 3 for 1.8s while gently bobbing (y: 274 -> 270 -> 274)
            this.tweens.add({
              targets: thuleSprite,
              y: thuleBaseY - 4,
              duration: 300,
              yoyo: true,
              repeat: 2,
              ease: 'Sine.easeInOut'
            });

            // Emit 4 small rising balloon/sparkle particles (y: 200 -> 165, fading out before the text banner!)
            const balloonColors = [0xef4444, 0xfacc15, 0x38bdf8, 0x34d399];
            for (let b = 0; b < 4; b++) {
              this.time.delayedCall(b * 220, () => {
                if (!this.scene.isActive() || !thuleSprite.scene) return;
                const pX = thuleBaseX - 24 + b * 22;
                const particle = this.add
                  .image(pX, 200, 'particle-star')
                  .setTint(balloonColors[b % balloonColors.length])
                  .setScale(0.42)
                  .setAlpha(0.95)
                  .setDepth(11);
                this.stageContainer.add(particle);
                this.stageContainer.sort('depth');

                this.tweens.add({
                  targets: particle,
                  y: 165,
                  x: pX + (b % 2 === 0 ? -8 : 8),
                  alpha: 0,
                  scaleX: 0.18,
                  scaleY: 0.18,
                  duration: 720,
                  ease: 'Sine.easeOut',
                  onComplete: () => particle.destroy()
                });
              });
            }

            // Reverse frames 3 -> 2 -> 1 -> 0 after 1.8s hold
            this.time.delayedCall(1800, () => {
              if (!thuleSprite.scene) return;
              thuleSprite.setY(thuleBaseY);
              thuleSprite.setFrame(2);
              this.time.delayedCall(stepMs, () => {
                if (!thuleSprite.scene) return;
                thuleSprite.setFrame(1);
              });
              this.time.delayedCall(stepMs * 2, () => {
                if (!thuleSprite.scene) return;
                thuleSprite.setFrame(0);
                thuleSprite.setPosition(thuleBaseX, thuleBaseY);
                isThuleBusy = false;
              });
            });
          });
        }
      });
    });

    // =========================================================================
    // 2. Continuous Rolling Exhaust Smoke + Tap Engine Rev (`p1_exhaust_smoke`)
    // =========================================================================
    const smokeBaseX = 188;
    const smokeBaseY = 455;
    const smokeBaseScale = 0.22;
    const exhaustSprite = this.add
      .sprite(smokeBaseX, smokeBaseY, 'p1_exhaust_smoke', 0)
      .setOrigin(0.5, 0.5)
      .setScale(smokeBaseScale)
      .setAlpha(0.85)
      .setDepth(8);
    this.stageContainer.add(exhaustSprite);

    // Gentle continuous drift left/up (x: 188 -> 172, y: 455 -> 435 over 1.2s, repeating)
    this.tweens.add({
      targets: exhaustSprite,
      x: { from: smokeBaseX, to: 172 },
      y: { from: smokeBaseY, to: 435 },
      alpha: { from: 0.88, to: 0.62 },
      duration: 1200,
      repeat: -1,
      ease: 'Sine.easeOut'
    });

    let isRevving = false;
    let smokeFrame = 0;
    let smokeAccumMs = 0;
    const smokeTimer = this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        if (!exhaustSprite.scene) {
          smokeTimer.remove(false);
          return;
        }
        smokeAccumMs += 50;
        const frameDurationMs = isRevving ? 100 : 285; // 10 fps when revving, 3.5 fps idle
        if (smokeAccumMs >= frameDurationMs) {
          smokeAccumMs = 0;
          smokeFrame = (smokeFrame + 1) % 4;
          exhaustSprite.setFrame(smokeFrame);
        }
      }
    });

    // Tap zone covering both the exhaust smoke (188, 455) and rear left taillight/bumper (205, 410)
    const exhaustTapZone = this.add
      .zone(198, 420, 120, 160)
      .setOrigin(0.5, 0.5)
      .setDepth(9)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(exhaustTapZone);

    exhaustTapZone.on('pointerdown', () => {
      if (isRevving) return;
      isRevving = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p1_exhaust_rev.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p2:p1-exhaust');

      // Flash warm red additive glow circle over the left rear brake light (x: 218, y: 350)
      const glowKey = this.textures.exists('cover-candle-glow') ? 'cover-candle-glow' : 'particle-star';
      const brakeGlow = this.add
        .image(218, 350, glowKey)
        .setOrigin(0.5, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xef4444)
        .setScale(0.72)
        .setAlpha(0.92)
        .setDepth(14);
      this.stageContainer.add(brakeGlow);
      this.stageContainer.sort('depth');

      this.tweens.add({
        targets: brakeGlow,
        scaleX: 1.05,
        scaleY: 1.05,
        alpha: 0.25,
        duration: 240,
        yoyo: true,
        repeat: 2,
        onComplete: () => brakeGlow.destroy()
      });

      // Speed up exhaust smoke to 10 fps at 1.25x scale for 1.5s and vibrate car area slightly
      exhaustSprite.setScale(smokeBaseScale * 1.25);
      this.cameras.main.shake(420, 0.0025);

      this.time.delayedCall(1500, () => {
        isRevving = false;
        if (exhaustSprite.scene) {
          exhaustSprite.setScale(smokeBaseScale);
        }
      });
    });

    // =========================================================================
    // 3. Doggie in Aviator Sunglasses on Travel Suitcase (`p1_doggie_suitcase`)
    // =========================================================================
    const doggieBaseX = 315;
    const doggieBaseY = 615;
    const doggieScale = 0.41;
    const doggieSprite = this.add
      .sprite(doggieBaseX, doggieBaseY, 'p1_doggie_suitcase', 0)
      .setOrigin(0.5, 1.0)
      .setScale(doggieScale)
      .setDepth(20);
    this.stageContainer.add(doggieSprite);

    // Idle breathing squash-and-stretch tween (scaleY: 1.0 -> 1.03, 1500ms yoyo)
    const doggieIdleTween = this.tweens.add({
      targets: doggieSprite,
      scaleY: { from: doggieScale, to: doggieScale * 1.03 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const doggieZone = this.add
      .zone(doggieBaseX, doggieBaseY - 55, 110, 120)
      .setOrigin(0.5, 0.5)
      .setDepth(21)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(doggieZone);

    let isDoggieBusy = false;
    doggieZone.on('pointerdown', () => {
      if (isDoggieBusy) return;
      isDoggieBusy = true;
      doggieIdleTween.pause();

      this.playColoradoSfx('/assets/audio/colorado/sfx/p1_doggie_bark.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p2:p1-doggie');
      Juice.burstStars(this, doggieBaseX, doggieBaseY - 88, 14, [0xfde047, 0x38bdf8, 0xffffff]);

      // Animate 0 -> 1 (bark) -> 2 (jump up) -> 3 (tail wag) -> 2 -> 3 -> 0 at 7 fps (~143ms per step)
      const seq = [1, 2, 3, 2, 3, 0];
      const stepMs = 143;
      seq.forEach((frameIdx, idx) => {
        this.time.delayedCall(idx * stepMs, () => {
          if (!doggieSprite.scene) return;
          doggieSprite.setFrame(frameIdx);
          if (frameIdx === 2) {
            // Vertical hop tween (y: 615 -> 597 -> 615) during Frame 2
            this.tweens.add({
              targets: doggieSprite,
              y: doggieBaseY - 18,
              duration: 70,
              yoyo: true,
              ease: 'Quad.easeOut',
              onComplete: () => {
                if (doggieSprite.scene) doggieSprite.setY(doggieBaseY);
              }
            });
          }
          if (idx === seq.length - 1) {
            doggieSprite.setPosition(doggieBaseX, doggieBaseY);
            doggieSprite.setScale(doggieScale);
            doggieIdleTween.resume();
            isDoggieBusy = false;
          }
        });
      });
    });

    // =========================================================================
    // 4. Red Roadside Camping Cooler (`p1_camping_cooler`)
    // =========================================================================
    const coolerBaseX = 145;
    const coolerBaseY = 585;
    const coolerScale = 0.33;
    const coolerSprite = this.add
      .sprite(coolerBaseX, coolerBaseY, 'p1_camping_cooler', 0)
      .setOrigin(0.5, 1.0)
      .setScale(coolerScale)
      .setDepth(18);
    this.stageContainer.add(coolerSprite);

    const coolerZone = this.add
      .zone(coolerBaseX, coolerBaseY - 46, 104, 104)
      .setOrigin(0.5, 0.5)
      .setDepth(19)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(coolerZone);

    let isCoolerBusy = false;
    coolerZone.on('pointerdown', () => {
      if (isCoolerBusy) return;
      isCoolerBusy = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p1_cooler_pop.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p2:p1-cooler');
      Juice.burstStars(this, coolerBaseX, coolerBaseY - 76, 14, [0xef4444, 0x38bdf8, 0xfde047, 0xffffff]);

      // Rattle cooler (angle: -4 -> +4 -> 0), then animate 0 -> 1 -> 2 -> 3 -> 2 -> 3 -> 0 at 6 fps (~166ms)
      this.tweens.add({
        targets: coolerSprite,
        angle: { from: -4, to: 4 },
        duration: 55,
        yoyo: true,
        repeat: 2,
        onComplete: () => {
          if (!coolerSprite.scene) return;
          coolerSprite.setAngle(0);
          const seq = [1, 2, 3, 2, 3, 0];
          const stepMs = 166;
          seq.forEach((frameIdx, idx) => {
            this.time.delayedCall(idx * stepMs, () => {
              if (!coolerSprite.scene) return;
              coolerSprite.setFrame(frameIdx);
              if (idx === seq.length - 1) {
                coolerSprite.setPosition(coolerBaseX, coolerBaseY);
                coolerSprite.setAngle(0);
                isCoolerBusy = false;
              }
            });
          });
        }
      });
    });

    // =========================================================================
    // 5. Mountain Bluebird on `MENA ARK ->` Sign (`p1_bluebird`)
    // =========================================================================
    const birdBaseX = 42;
    const birdBaseY = 350;
    const birdScale = 0.22;
    const bluebirdSprite = this.add
      .sprite(birdBaseX, birdBaseY, 'p1_bluebird', 0)
      .setOrigin(0.5, 1.0)
      .setScale(birdScale)
      .setDepth(12);
    this.stageContainer.add(bluebirdSprite);

    let isBluebirdFlying = false;
    const bluebirdIdleTimer = this.time.addEvent({
      delay: 3500,
      loop: true,
      callback: () => {
        if (!bluebirdSprite.scene) {
          bluebirdIdleTimer.remove(false);
          return;
        }
        if (!isBluebirdFlying) {
          const nextFrame = bluebirdSprite.frame.name === '0' ? 1 : 0;
          bluebirdSprite.setFrame(nextFrame);
        }
      }
    });

    const bluebirdZone = this.add
      .zone(birdBaseX + 6, birdBaseY - 26, 86, 86)
      .setOrigin(0.5, 0.5)
      .setDepth(13)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(bluebirdZone);

    bluebirdZone.on('pointerdown', () => {
      if (isBluebirdFlying) return;
      isBluebirdFlying = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p1_bluebird_chirp.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p2:p1-bluebird');
      Juice.burstStars(this, birdBaseX + 10, birdBaseY - 36, 12, [0x38bdf8, 0xfde047, 0xffffff]);

      // Rapidly flap between Frame 2 (wings up) and Frame 3 (wings down) at 10 fps (100ms)
      const flapTimer = this.time.addEvent({
        delay: 100,
        loop: true,
        callback: () => {
          if (!bluebirdSprite.scene) {
            flapTimer.remove(false);
            return;
          }
          bluebirdSprite.setFrame(bluebirdSprite.frame.name === '2' ? 3 : 2);
        }
      });
      bluebirdSprite.setFrame(2);

      // Fly in a joyful arc across the left sky:
      // (42, 350) -> (190, 235) -> (95, 195) -> back to perch at (42, 350), strictly below y: 185!
      const curve = new Phaser.Curves.Spline([
        new Phaser.Math.Vector2(birdBaseX, birdBaseY),
        new Phaser.Math.Vector2(190, 235),
        new Phaser.Math.Vector2(95, 195),
        new Phaser.Math.Vector2(birdBaseX, birdBaseY)
      ]);

      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 1350,
        ease: 'Sine.easeInOut',
        onUpdate: (tw) => {
          if (!bluebirdSprite.scene) return;
          const t = tw.getValue() ?? 0;
          const pt = curve.getPoint(t);
          bluebirdSprite.setPosition(pt.x, Math.max(188, pt.y));
          bluebirdSprite.setFlipX(t > 0.42);
        },
        onComplete: () => {
          flapTimer.remove(false);
          if (!bluebirdSprite.scene) return;
          bluebirdSprite.setFlipX(false);
          bluebirdSprite.setPosition(birdBaseX, birdBaseY);
          bluebirdSprite.setFrame(0);
          isBluebirdFlying = false;
        }
      });
    });

    // =========================================================================
    // 6. Soaring Colorado Golden Eagle (`p1_eagle_soar`)
    // =========================================================================
    const eagleStartX = 960;
    const eagleStartY = 215;
    const eagleScale = 88 / 313; // ~88px wide (~0.281)
    const eagleSprite = this.add
      .sprite(eagleStartX, eagleStartY, 'p1_eagle_soar', 0)
      .setOrigin(0.5, 0.5)
      .setScale(eagleScale)
      .setDepth(6);
    this.stageContainer.add(eagleSprite);

    // Cycle frames 0 -> 1 -> 2 -> 1 at 3 fps (~333ms) while gliding
    const eagleFlapSeq = [0, 1, 2, 1];
    let eagleFlapIdx = 0;
    let isEagleSwooping = false;
    const eagleFlapTimer = this.time.addEvent({
      delay: 333,
      loop: true,
      callback: () => {
        if (!eagleSprite.scene) {
          eagleFlapTimer.remove(false);
          return;
        }
        if (!isEagleSwooping) {
          eagleFlapIdx = (eagleFlapIdx + 1) % eagleFlapSeq.length;
          eagleSprite.setFrame(eagleFlapSeq[eagleFlapIdx]);
        }
      }
    });

    // Horizontal glide between x: 860 and x: 1120 at y: 205..235 (strictly below top story banner!)
    let eagleDir = 1;
    const eagleGlideTimer = this.time.addEvent({
      delay: 30,
      loop: true,
      callback: () => {
        if (!eagleSprite.scene) {
          eagleGlideTimer.remove(false);
          return;
        }
        if (isEagleSwooping) return;
        eagleSprite.x += eagleDir * 1.15;
        if (eagleSprite.x >= 1120) {
          eagleSprite.x = 1120;
          eagleDir = -1;
          eagleSprite.setFlipX(true);
        } else if (eagleSprite.x <= 860) {
          eagleSprite.x = 860;
          eagleDir = 1;
          eagleSprite.setFlipX(false);
        }
        const progress = (eagleSprite.x - 860) / (1120 - 860);
        eagleSprite.y = 220 + Math.sin(progress * Math.PI * 2) * 12;
      }
    });

    eagleSprite.setInteractive(
      new Phaser.Geom.Rectangle(-30, -30, 373, 312),
      Phaser.Geom.Rectangle.Contains
    );
    if (eagleSprite.input) {
      eagleSprite.input.cursor = 'pointer';
    }

    eagleSprite.on('pointerdown', () => {
      if (isEagleSwooping) return;
      isEagleSwooping = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p1_eagle_soar.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p2:p1-eagle');

      const swoopOriginX = eagleSprite.x;
      eagleSprite.setFrame(3); // banking swoop

      // Emit golden wind sparkle particles along the swoop
      for (let s = 0; s < 5; s++) {
        this.time.delayedCall(s * 140, () => {
          if (!this.scene.isActive() || !eagleSprite.scene) return;
          Juice.burstStars(this, eagleSprite.x, eagleSprite.y, 4, [0xfef08a, 0xfbbf24, 0xffffff]);
        });
      }

      // Swoop down to y: 265 and loop back up to y: 205 (strictly below top story banner!)
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 1100,
        ease: 'Sine.easeInOut',
        onUpdate: (tw) => {
          if (!eagleSprite.scene) return;
          const t = tw.getValue() ?? 0;
          eagleSprite.x = Phaser.Math.Clamp(swoopOriginX + Math.sin(t * Math.PI * 2) * 55 * eagleDir, 850, 1130);
          eagleSprite.y = 205 + Math.sin(t * Math.PI) * 60; // 205 -> 265 -> 205
          eagleSprite.setAngle(Math.sin(t * Math.PI * 2) * 14 * eagleDir);
        },
        onComplete: () => {
          if (!eagleSprite.scene) return;
          eagleSprite.setAngle(0);
          eagleSprite.setFrame(0);
          isEagleSwooping = false;
        }
      });
    });

    // =========================================================================
    // 7. Roadside Colorado Chipmunk with Pinecone (`p1_chipmunk`)
    // =========================================================================
    const chipmunkBaseX = 1135;
    const chipmunkBaseY = 590;
    const chipmunkScale = 0.23;
    const chipmunkSprite = this.add
      .sprite(chipmunkBaseX, chipmunkBaseY, 'p1_chipmunk', 0)
      .setOrigin(0.5, 1.0)
      .setScale(chipmunkScale)
      .setDepth(20);
    this.stageContainer.add(chipmunkSprite);

    const chipmunkZone = this.add
      .zone(chipmunkBaseX, chipmunkBaseY - 40, 96, 96)
      .setOrigin(0.5, 0.5)
      .setDepth(21)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(chipmunkZone);

    let isChipmunkBusy = false;
    chipmunkZone.on('pointerdown', () => {
      if (isChipmunkBusy) return;
      isChipmunkBusy = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p1_chipmunk_munch.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p2:p1-chipmunk');
      Juice.burstStars(this, chipmunkBaseX, chipmunkBaseY - 68, 12, [0xfbbf24, 0x4ade80, 0xffffff]);

      // Frame 1 (munching fast for 600ms)
      chipmunkSprite.setFrame(1);
      this.tweens.add({
        targets: chipmunkSprite,
        scaleY: chipmunkScale * 1.06,
        scaleX: chipmunkScale * 0.96,
        duration: 100,
        yoyo: true,
        repeat: 2
      });

      // Then launch 35px into the air on Frame 2 with a 360-degree backflip rotation tween (450ms)
      this.time.delayedCall(600, () => {
        if (!chipmunkSprite.scene) return;
        chipmunkSprite.setScale(chipmunkScale);
        chipmunkSprite.setFrame(2);
        // Temporarily center origin during the mid-air 360 backflip so rotation is around the body
        const halfH = (345 * chipmunkScale) / 2;
        chipmunkSprite.setOrigin(0.5, 0.5);
        chipmunkSprite.setY(chipmunkBaseY - halfH);

        this.tweens.add({
          targets: chipmunkSprite,
          y: chipmunkBaseY - halfH - 35,
          duration: 225,
          yoyo: true,
          ease: 'Quad.easeOut'
        });

        this.tweens.add({
          targets: chipmunkSprite,
          angle: { from: 0, to: 360 },
          duration: 450,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            if (!chipmunkSprite.scene) return;
            // Land on Frame 3 (ta-da arms out for 700ms)
            chipmunkSprite.setAngle(0);
            chipmunkSprite.setOrigin(0.5, 1.0);
            chipmunkSprite.setPosition(chipmunkBaseX, chipmunkBaseY);
            chipmunkSprite.setFrame(3);

            this.time.delayedCall(700, () => {
              if (!chipmunkSprite.scene) return;
              chipmunkSprite.setFrame(0);
              isChipmunkBusy = false;
            });
          }
        });
      });
    });

    // =========================================================================
    // 8A. Ambient Drifting Autumn Leaves (`p1_autumn_leaves` frames 0, 1, 2)
    // =========================================================================
    for (let i = 0; i < 5; i++) {
      const leafFrame = i % 3; // Frames 0, 1, 2
      const targetPx = Phaser.Math.Between(24, 34);
      const leafScale = targetPx / 281;
      const startX = 180 + i * 235;
      const baseY = 285 + (i % 3) * 65;

      const leaf = this.add
        .sprite(startX, baseY, 'p1_autumn_leaves', leafFrame)
        .setOrigin(0.5, 0.5)
        .setScale(leafScale)
        .setDepth(11);
      this.stageContainer.add(leaf);

      leaf.setInteractive(
        new Phaser.Geom.Rectangle(-140, -140, 560, 560),
        Phaser.Geom.Rectangle.Contains
      );
      if (leaf.input) {
        leaf.input.cursor = 'pointer';
      }

      let isLeafSpinning = false;
      let leafPhase = i * 1.3;
      const leafSpeed = 0.55 + (i % 3) * 0.18;

      const leafTimer = this.time.addEvent({
        delay: 33,
        loop: true,
        callback: () => {
          if (!leaf.scene) {
            leafTimer.remove(false);
            return;
          }
          if (isLeafSpinning) return;
          leafPhase += 0.045;
          leaf.x -= leafSpeed;
          leaf.y = baseY + Math.sin(leafPhase) * 18;
          leaf.angle = Math.sin(leafPhase * 0.8) * 22;
          if (leaf.x < -30) {
            leaf.x = 1310;
          }
        }
      });

      leaf.on('pointerdown', () => {
        if (isLeafSpinning) return;
        isLeafSpinning = true;
        AudioBus.playSfx('chime');
        Juice.burstStars(this, leaf.x, leaf.y, 8, [0xfbbf24, 0xf97316, 0xef4444]);

        this.tweens.add({
          targets: leaf,
          x: leaf.x - 95,
          y: Math.max(200, leaf.y - 55),
          angle: leaf.angle + 540,
          alpha: 0,
          duration: 550,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            if (!leaf.scene) return;
            leaf.x = 1295;
            leaf.y = baseY;
            leaf.setAlpha(1);
            leaf.setAngle(0);
            isLeafSpinning = false;
          }
        });
      });
    }

    // =========================================================================
    // 8B. Pine-Tree Car Air Freshener (`p1_pine_freshener`)
    // =========================================================================
    const pineX = 805;
    const pineY = 345;
    const pineScale = 32 / 336; // ~32px tall (~0.095)
    const pineSprite = this.add
      .image(pineX, pineY, 'p1_pine_freshener')
      .setOrigin(0.5, 0.0)
      .setScale(pineScale)
      .setDepth(12);
    this.stageContainer.add(pineSprite);

    const pinePendulumTween = this.tweens.add({
      targets: pineSprite,
      angle: { from: -6, to: 6 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const pineZone = this.add
      .zone(pineX, pineY + 18, 76, 76)
      .setOrigin(0.5, 0.5)
      .setDepth(13)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(pineZone);

    let isPineSwinging = false;
    pineZone.on('pointerdown', () => {
      if (isPineSwinging) return;
      isPineSwinging = true;
      pinePendulumTween.pause();

      AudioBus.playSfx('chime');
      ArcadeState.markHotspotDiscovered('colorado:p2:p1-pine-freshener');
      Juice.burstStars(this, pineX, pineY + 20, 12, [0x34d399, 0xfde047, 0xffffff]);

      this.tweens.add({
        targets: pineSprite,
        angle: { from: -25, to: 25 },
        duration: 160,
        yoyo: true,
        repeat: 3,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (!pineSprite.scene) return;
          pineSprite.setAngle(-6);
          pinePendulumTween.resume();
          isPineSwinging = false;
        }
      });
    });

    // Sort stageContainer children by their exact `.setDepth(...)` values
    this.stageContainer.sort('depth');
  }

  /**
   * Book 2 — Page 2 ("Arriving at Babci & Grandpa's House") Clean-Plate Living Books Scene:
   * Mounts all 8 multi-frame sprite sheets on `p2-clean.jpg` with crisp NEAREST pixel-art filtering,
   * morning birds & breeze ambient loop (`p2_ambient_morning.mp3`), and rich interactive gags
   * in both `Read to Me` and `Play Mode`.
   */
  private mountPage2LivingScene(): void {
    const requiredSpritesheets: { key: string; url: string; frameWidth: number; frameHeight: number }[] = [
      { key: 'p2_grandparents_wave', url: '/assets/stories/colorado/sprites/p2/p2_grandparents_wave.png?v=p2v1', frameWidth: 263, frameHeight: 332 },
      { key: 'p2_wyatt_run', url: '/assets/stories/colorado/sprites/p2/p2_wyatt_run.png?v=p2v1', frameWidth: 229, frameHeight: 318 },
      { key: 'p2_emma_run', url: '/assets/stories/colorado/sprites/p2/p2_emma_run.png?v=p2v1', frameWidth: 217, frameHeight: 315 },
      { key: 'p2_chimney_sparky', url: '/assets/stories/colorado/sprites/p2/p2_chimney_sparky.png?v=p2v1', frameWidth: 190, frameHeight: 415 },
      { key: 'p2_bush_doggie', url: '/assets/stories/colorado/sprites/p2/p2_bush_doggie.png?v=p2v1', frameWidth: 228, frameHeight: 324 },
      { key: 'p2_lavender_butterflies', url: '/assets/stories/colorado/sprites/p2/p2_lavender_butterflies.png?v=p2v1', frameWidth: 240, frameHeight: 245 },
      { key: 'p2_lawn_sprinkler', url: '/assets/stories/colorado/sprites/p2/p2_lawn_sprinkler.png?v=p2v1', frameWidth: 246, frameHeight: 192 },
      { key: 'p2_tree_squirrel', url: '/assets/stories/colorado/sprites/p2/p2_tree_squirrel.png?v=p2v1', frameWidth: 250, frameHeight: 337 }
    ];

    let needsRuntimeLoad = false;
    for (const ss of requiredSpritesheets) {
      if (!this.textures.exists(ss.key)) {
        this.load.spritesheet(ss.key, ss.url, { frameWidth: ss.frameWidth, frameHeight: ss.frameHeight });
        needsRuntimeLoad = true;
      }
    }
    if (needsRuntimeLoad) {
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        const activeBg = COLORADO_PAGES[this.currentPageIndex]?.bgKey;
        if (this.scene.isActive() && (activeBg === 'colorado-p2-clean' || activeBg === 'colorado-p2')) {
          this.mountPage2LivingScene();
        }
      });
      this.load.start();
      return;
    }

    // Apply crisp NEAREST pixel-art filtering to all Page 2 textures
    requiredSpritesheets.forEach((s) => {
      if (this.textures.exists(s.key)) {
        this.textures.get(s.key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    });

    // Start quiet Colorado morning birds & breeze loop (`volume: 0.16`) while on Page 2
    this.startPage2AmbientAudio();

    // Helper to spawn floating pixel hearts rising from startY -> targetY
    const spawnFloatingPixelHearts = (centerX: number, startY: number, targetY: number, count: number = 5) => {
      const heartColors = [0xf43f5e, 0xf472b6, 0xfb7185, 0xef4444, 0xfda4af];
      for (let i = 0; i < count; i++) {
        this.time.delayedCall(i * 150, () => {
          if (!this.scene.isActive()) return;
          const hx = centerX + (i - Math.floor(count / 2)) * 28 + Phaser.Math.Between(-6, 6);
          const heart = this.add.graphics();
          const c = heartColors[i % heartColors.length];
          heart.fillStyle(c, 1);
          // Crisp pixel-art heart shape
          heart.fillRect(-6, -6, 5, 5);
          heart.fillRect(1, -6, 5, 5);
          heart.fillRect(-8, -3, 16, 6);
          heart.fillRect(-6, 3, 12, 3);
          heart.fillRect(-3, 6, 6, 3);
          heart.fillRect(-1, 9, 2, 2);
          heart.setPosition(hx, startY);
          heart.setDepth(26);
          this.stageContainer.add(heart);
          this.stageContainer.sort('depth');

          this.tweens.add({
            targets: heart,
            y: targetY,
            x: hx + (i % 2 === 0 ? -12 : 12),
            scaleX: { from: 0.75, to: 1.2 },
            scaleY: { from: 0.75, to: 1.2 },
            alpha: { from: 1, to: 0 },
            duration: 950,
            ease: 'Sine.easeOut',
            onComplete: () => heart.destroy()
          });
        });
      }
    };

    // =========================================================================
    // 1. Grandpa & Babci Welcoming on the Driveway (`p2_grandparents_wave`)
    // =========================================================================
    const gpBaseX = 995;
    const gpBaseY = 560;
    const gpScale = 0.725; // ~235px standing height
    const gpSprite = this.add
      .sprite(gpBaseX, gpBaseY, 'p2_grandparents_wave', 0)
      .setOrigin(0.5, 1.0)
      .setScale(gpScale)
      .setDepth(15);
    this.stageContainer.add(gpSprite);

    let isGpBusy = false;
    // Idle: gently alternate between Frame 0 and Frame 1 every 1.4s
    const gpIdleTimer = this.time.addEvent({
      delay: 1400,
      loop: true,
      callback: () => {
        if (!gpSprite.scene) {
          gpIdleTimer.remove(false);
          return;
        }
        if (!isGpBusy) {
          const nextFrame = gpSprite.frame.name === '0' ? 1 : 0;
          gpSprite.setFrame(nextFrame);
        }
      }
    });

    const playGrandparentsHugAnimation = (playSfx: boolean = true) => {
      if (isGpBusy || !gpSprite.scene) return;
      isGpBusy = true;

      if (playSfx) {
        this.playColoradoSfx('/assets/audio/colorado/sfx/p2_grandparents_hug.mp3');
      }
      ArcadeState.markHotspotDiscovered('colorado:p3:p2-grandparents');
      Juice.burstStars(this, gpBaseX, gpBaseY - 180, 14, [0xfde047, 0xf472b6, 0xfbbf24, 0xffffff]);

      // Spawn 5 floating pink/red pixel hearts above their heads (y: 330 -> 260)
      spawnFloatingPixelHearts(gpBaseX, 330, 260, 5);

      // Cycle frames 0 -> 1 -> 2 -> 3 -> 2 -> 3 -> 0 at 5 fps (200ms per step)
      const seq = [0, 1, 2, 3, 2, 3, 0];
      const stepMs = 200;
      seq.forEach((frameIdx, idx) => {
        this.time.delayedCall(idx * stepMs, () => {
          if (!gpSprite.scene) return;
          gpSprite.setFrame(frameIdx);
          if (frameIdx === 2 || frameIdx === 3) {
            this.tweens.add({
              targets: gpSprite,
              scaleY: gpScale * 1.03,
              scaleX: gpScale * 1.02,
              duration: 95,
              yoyo: true
            });
          }
          if (idx === seq.length - 1) {
            gpSprite.setScale(gpScale);
            gpSprite.setPosition(gpBaseX, gpBaseY);
            isGpBusy = false;
          }
        });
      });
    };

    const gpZone = this.add
      .zone(gpBaseX, gpBaseY - 118, 190, 240)
      .setOrigin(0.5, 0.5)
      .setDepth(16)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(gpZone);

    gpZone.on('pointerdown', () => {
      playGrandparentsHugAnimation(true);
    });

    // =========================================================================
    // 2 & 3. Wyatt (`p2_wyatt_run`) & Emma (`p2_emma_run`) Running Up to Hug
    // =========================================================================
    const wyattBaseX = 665;
    const wyattBaseY = 668;
    const wyattScale = 0.58; // ~180px tall
    const wyattSprite = this.add
      .sprite(wyattBaseX, wyattBaseY, 'p2_wyatt_run', 0)
      .setOrigin(0.5, 1.0)
      .setScale(wyattScale)
      .setDepth(22);
    this.stageContainer.add(wyattSprite);

    // Wyatt idle: Frame 0 with a subtle excited bounce (y: 668 <-> 663)
    const wyattIdleTween = this.tweens.add({
      targets: wyattSprite,
      y: { from: wyattBaseY, to: 663 },
      duration: 680,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const emmaBaseX = 835;
    const emmaBaseY = 655;
    const emmaScale = 0.505; // ~155px tall
    const emmaSprite = this.add
      .sprite(emmaBaseX, emmaBaseY, 'p2_emma_run', 0)
      .setOrigin(0.5, 1.0)
      .setScale(emmaScale)
      .setDepth(23);
    this.stageContainer.add(emmaSprite);

    // Emma idle: Frame 0 with a gentle happy sway
    const emmaIdleTween = this.tweens.add({
      targets: emmaSprite,
      angle: { from: -2.2, to: 2.2 },
      y: { from: emmaBaseY, to: emmaBaseY - 3 },
      duration: 820,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    let areKidsRunning = false;
    const triggerKidsRunAndHug = () => {
      if (areKidsRunning || !wyattSprite.scene || !emmaSprite.scene) return;
      areKidsRunning = true;

      wyattIdleTween.pause();
      emmaIdleTween.pause();
      wyattSprite.setPosition(wyattBaseX, wyattBaseY).setAngle(0).setFlipX(false);
      emmaSprite.setPosition(emmaBaseX, emmaBaseY).setAngle(0).setFlipX(false);

      this.playColoradoSfx('/assets/audio/colorado/sfx/p2_kids_run_giggle.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p3:p2-kids-run');
      Juice.burstStars(this, wyattBaseX, wyattBaseY - 90, 10, [0x38bdf8, 0xfde047, 0xffffff]);
      Juice.burstStars(this, emmaBaseX, emmaBaseY - 80, 10, [0xc084fc, 0xf472b6, 0xfde047]);

      // Loop running frames 0 -> 1 -> 2 -> 1 at 9 fps (~111ms per step)
      const runSeq = [0, 1, 2, 1];
      let wyattRunStep = 0;
      let emmaRunStep = 0;
      let wyattInRunLoop = true;
      let emmaInRunLoop = true;

      const runCycleTimer = this.time.addEvent({
        delay: 111,
        loop: true,
        callback: () => {
          if (!wyattSprite.scene || !emmaSprite.scene) {
            runCycleTimer.remove(false);
            return;
          }
          if (wyattInRunLoop) {
            wyattRunStep = (wyattRunStep + 1) % runSeq.length;
            wyattSprite.setFrame(runSeq[wyattRunStep]);
          }
          if (emmaInRunLoop) {
            emmaRunStep = (emmaRunStep + 1) % runSeq.length;
            emmaSprite.setFrame(runSeq[emmaRunStep]);
          }
        }
      });

      // Emma runs from (835, 655) -> (945, 588) over 950ms
      this.tweens.add({
        targets: emmaSprite,
        x: 945,
        y: 588,
        duration: 950,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (!emmaSprite.scene) return;
          emmaInRunLoop = false;
          // Land on Frame 3 (celebration hug pose) right in front of Babci's open arms with floating pixel hearts
          emmaSprite.setFrame(3);
          spawnFloatingPixelHearts(955, 455, 390, 3);
          this.tweens.add({
            targets: emmaSprite,
            y: 588 - 16,
            duration: 140,
            yoyo: true,
            ease: 'Quad.easeOut'
          });

          // Hold 900ms, then trot back to (835, 655) on Frame 0
          this.time.delayedCall(900, () => {
            if (!emmaSprite.scene) return;
            emmaInRunLoop = true;
            this.tweens.add({
              targets: emmaSprite,
              x: emmaBaseX,
              y: emmaBaseY,
              duration: 750,
              ease: 'Sine.easeInOut',
              onComplete: () => {
                if (!emmaSprite.scene) return;
                emmaInRunLoop = false;
                emmaSprite.setPosition(emmaBaseX, emmaBaseY);
                emmaSprite.setFrame(0);
              }
            });
          });
        }
      });

      // Wyatt runs from (665, 668) -> (885, 580) over 1100ms
      this.tweens.add({
        targets: wyattSprite,
        x: 885,
        y: 580,
        duration: 1100,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (!wyattSprite.scene) return;
          wyattInRunLoop = false;
          // Switch to Frame 3 (jumping hug pose with a 20px hop) as Grandpa & Babci play their hug/heart animation!
          wyattSprite.setFrame(3);
          playGrandparentsHugAnimation(true);

          this.tweens.add({
            targets: wyattSprite,
            y: 580 - 20,
            duration: 150,
            yoyo: true,
            ease: 'Quad.easeOut'
          });

          // Hold for 900ms, then smoothly trot back to starting spot (665, 668) on Frame 0
          this.time.delayedCall(900, () => {
            if (!wyattSprite.scene) return;
            wyattInRunLoop = true;
            this.tweens.add({
              targets: wyattSprite,
              x: wyattBaseX,
              y: wyattBaseY,
              duration: 850,
              ease: 'Sine.easeInOut',
              onComplete: () => {
                runCycleTimer.remove(false);
                if (!wyattSprite.scene || !emmaSprite.scene) return;
                wyattInRunLoop = false;
                wyattSprite.setPosition(wyattBaseX, wyattBaseY).setFrame(0);
                emmaSprite.setPosition(emmaBaseX, emmaBaseY).setFrame(0);
                wyattIdleTween.resume();
                emmaIdleTween.resume();
                areKidsRunning = false;
              }
            });
          });
        }
      });
    };

    const wyattZone = this.add
      .zone(wyattBaseX, wyattBaseY - 90, 130, 185)
      .setOrigin(0.5, 0.5)
      .setDepth(24)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(wyattZone);
    wyattZone.on('pointerdown', triggerKidsRunAndHug);

    const emmaZone = this.add
      .zone(emmaBaseX, emmaBaseY - 78, 120, 165)
      .setOrigin(0.5, 0.5)
      .setDepth(24)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(emmaZone);
    emmaZone.on('pointerdown', triggerKidsRunAndHug);

    // =========================================================================
    // 4. Sparky Popping Out of the Roof Chimney (`p2_chimney_sparky`)
    // =========================================================================
    const chimneyBaseX = 988;
    const chimneyBaseY = 208;
    const chimneyScale = 64 / 182; // ~0.352 (~64px wide chimney box covering the background chimney cleanly)
    const chimneySprite = this.add
      .sprite(chimneyBaseX, chimneyBaseY, 'p2_chimney_sparky', 0)
      .setOrigin(0.5, 1.0)
      .setScale(chimneyScale)
      .setDepth(12);
    this.stageContainer.add(chimneySprite);

    const chimneyZone = this.add
      .zone(chimneyBaseX, chimneyBaseY - 52, 96, 118)
      .setOrigin(0.5, 0.5)
      .setDepth(13)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(chimneyZone);

    let isChimneyBusy = false;
    chimneyZone.on('pointerdown', () => {
      if (isChimneyBusy) return;
      isChimneyBusy = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p2_chimney_sparky.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p3:p2-chimney-sparky');
      Juice.burstStars(this, chimneyBaseX, 155, 12, [0x34d399, 0xfde047, 0xffffff]);

      // Spawn golden sparkle particles from (988, 155)
      const sparkleColors = [0xfde047, 0xfbbf24, 0x34d399, 0xffffff];
      for (let s = 0; s < 6; s++) {
        this.time.delayedCall(180 + s * 140, () => {
          if (!this.scene.isActive() || !chimneySprite.scene) return;
          const sx = chimneyBaseX + Phaser.Math.Between(-20, 20);
          const sp = this.add
            .image(sx, 155, 'particle-star')
            .setTint(sparkleColors[s % sparkleColors.length])
            .setScale(0.36)
            .setAlpha(0.95)
            .setDepth(13);
          this.stageContainer.add(sp);
          this.stageContainer.sort('depth');

          this.tweens.add({
            targets: sp,
            y: 130,
            x: sx + (s % 2 === 0 ? -10 : 10),
            alpha: 0,
            scaleX: 0.14,
            scaleY: 0.14,
            duration: 620,
            ease: 'Sine.easeOut',
            onComplete: () => sp.destroy()
          });
        });
      }

      // Animate 0 -> 1 -> 2 -> 3 -> 2 -> 1 -> 0 at 5 fps (200ms per step)
      const seq = [1, 2, 3, 2, 1, 0];
      const stepMs = 200;
      seq.forEach((frameIdx, idx) => {
        this.time.delayedCall(idx * stepMs, () => {
          if (!chimneySprite.scene) return;
          chimneySprite.setFrame(frameIdx);
          if (idx === seq.length - 1) {
            chimneySprite.setPosition(chimneyBaseX, chimneyBaseY);
            isChimneyBusy = false;
          }
        });
      });
    });

    // =========================================================================
    // 5. Doggie in Aviator Sunglasses & Gardener Hat in the Green Bush (`p2_bush_doggie`)
    // =========================================================================
    const bushBaseX = 775;
    const bushBaseY = 495;
    const bushScale = 0.33; // ~92px tall
    const bushSprite = this.add
      .sprite(bushBaseX, bushBaseY, 'p2_bush_doggie', 0)
      .setOrigin(0.5, 1.0)
      .setScale(bushScale)
      .setDepth(16);
    this.stageContainer.add(bushSprite);

    let isBushBusy = false;
    // Idle: Frame 0 (ears peeking out of the bush, twitching slightly every 3s)
    const bushTwitchTimer = this.time.addEvent({
      delay: 3000,
      loop: true,
      callback: () => {
        if (!bushSprite.scene) {
          bushTwitchTimer.remove(false);
          return;
        }
        if (!isBushBusy) {
          this.tweens.add({
            targets: bushSprite,
            scaleY: bushScale * 1.04,
            angle: { from: -2, to: 2 },
            duration: 110,
            yoyo: true,
            repeat: 1,
            onComplete: () => {
              if (bushSprite.scene && !isBushBusy) {
                bushSprite.setScale(bushScale);
                bushSprite.setAngle(0);
              }
            }
          });
        }
      }
    });

    const bushZone = this.add
      .zone(bushBaseX, bushBaseY - 46, 108, 108)
      .setOrigin(0.5, 0.5)
      .setDepth(17)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(bushZone);

    bushZone.on('pointerdown', () => {
      if (isBushBusy) return;
      isBushBusy = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p2_bush_doggie.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p3:p2-bush-doggie');
      Juice.burstStars(this, bushBaseX, bushBaseY - 76, 12, [0x4ade80, 0xfde047, 0xffffff]);

      // Shake the bush tuft (x: +-3px), then play 0 -> 1 -> 2 -> 3 -> 2 -> 3 -> 1 -> 0 at 6 fps (~166ms/step)
      this.tweens.add({
        targets: bushSprite,
        x: { from: bushBaseX - 3, to: bushBaseX + 3 },
        duration: 45,
        yoyo: true,
        repeat: 2,
        onComplete: () => {
          if (!bushSprite.scene) return;
          bushSprite.setX(bushBaseX);

          const seq = [1, 2, 3, 2, 3, 1, 0];
          const stepMs = 166;
          seq.forEach((frameIdx, idx) => {
            this.time.delayedCall(idx * stepMs, () => {
              if (!bushSprite.scene) return;
              bushSprite.setFrame(frameIdx);
              if (frameIdx === 2) {
                // Playful pop upward
                this.tweens.add({
                  targets: bushSprite,
                  y: bushBaseY - 10,
                  scaleY: bushScale * 1.06,
                  duration: 80,
                  yoyo: true,
                  ease: 'Quad.easeOut',
                  onComplete: () => {
                    if (bushSprite.scene) {
                      bushSprite.setY(bushBaseY);
                      bushSprite.setScale(bushScale);
                    }
                  }
                });
              }
              if (idx === seq.length - 1) {
                bushSprite.setPosition(bushBaseX, bushBaseY);
                bushSprite.setScale(bushScale);
                bushSprite.setAngle(0);
                isBushBusy = false;
              }
            });
          });
        }
      });
    });

    // =========================================================================
    // 6. Swallowtail Butterflies & Fuzzy Bumblebee on the Purple Lavender (`p2_lavender_butterflies`)
    // =========================================================================
    const bfBaseX = 355;
    const bfBaseY = 470;
    const bfScale = 0.41; // ~95px wide
    const bfSprite = this.add
      .sprite(bfBaseX, bfBaseY, 'p2_lavender_butterflies', 0)
      .setOrigin(0.5, 0.5)
      .setScale(bfScale)
      .setDepth(18);
    this.stageContainer.add(bfSprite);

    let isBfSwirling = false;
    const bfCycleSeq = [0, 1, 2, 1];
    let bfCycleIdx = 0;

    // Continuously cycle frames 0 -> 1 -> 2 -> 1 at 5 fps (200ms)
    const bfFrameTimer = this.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => {
        if (!bfSprite.scene) {
          bfFrameTimer.remove(false);
          return;
        }
        if (!isBfSwirling) {
          bfCycleIdx = (bfCycleIdx + 1) % bfCycleSeq.length;
          bfSprite.setFrame(bfCycleSeq[bfCycleIdx]);
        }
      }
    });

    // Float in a gentle figure-eight wave over the purple lavender planter (x: 335 <-> 385, y: 460 <-> 480)
    let bfPhase = 0;
    const bfWaveTimer = this.time.addEvent({
      delay: 33,
      loop: true,
      callback: () => {
        if (!bfSprite.scene) {
          bfWaveTimer.remove(false);
          return;
        }
        if (isBfSwirling) return;
        bfPhase += 0.045;
        bfSprite.x = 360 + Math.sin(bfPhase) * 25; // 335 <-> 385
        bfSprite.y = 470 + Math.sin(bfPhase * 2) * 10; // 460 <-> 480
      }
    });

    const bfZone = this.add
      .zone(bfBaseX, bfBaseY, 130, 120)
      .setOrigin(0.5, 0.5)
      .setDepth(19)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(bfZone);

    bfZone.on('pointerdown', () => {
      if (isBfSwirling) return;
      isBfSwirling = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p2_lavender_butterflies.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p3:p2-lavender-butterflies');
      Juice.burstStars(this, bfSprite.x, bfSprite.y, 12, [0xfde047, 0xc084fc, 0xffffff]);

      // Switch to Frame 3 (magical sparkle burst)
      bfSprite.setFrame(3);

      // Release golden pollen particles while swirling upward over the lavender planter (y: 470 -> 395 -> 470)
      for (let p = 0; p < 7; p++) {
        this.time.delayedCall(p * 120, () => {
          if (!this.scene.isActive() || !bfSprite.scene) return;
          const pollen = this.add
            .image(bfSprite.x + Phaser.Math.Between(-18, 18), bfSprite.y + Phaser.Math.Between(-10, 10), 'particle-star')
            .setTint(p % 2 === 0 ? 0xfde047 : 0xfbbf24)
            .setScale(0.32)
            .setAlpha(0.92)
            .setDepth(19);
          this.stageContainer.add(pollen);
          this.stageContainer.sort('depth');

          this.tweens.add({
            targets: pollen,
            y: pollen.y + 24,
            alpha: 0,
            scaleX: 0.12,
            scaleY: 0.12,
            duration: 550,
            ease: 'Sine.easeOut',
            onComplete: () => pollen.destroy()
          });
        });
      }

      const startSwirlX = bfSprite.x;
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 1050,
        ease: 'Sine.easeInOut',
        onUpdate: (tw) => {
          if (!bfSprite.scene) return;
          const t = tw.getValue() ?? 0;
          bfSprite.x = startSwirlX + Math.sin(t * Math.PI * 2) * 32;
          bfSprite.y = 470 - Math.sin(t * Math.PI) * 75; // 470 -> 395 -> 470
        },
        onComplete: () => {
          if (!bfSprite.scene) return;
          bfSprite.setFrame(0);
          isBfSwirling = false;
        }
      });
    });

    // =========================================================================
    // 7. Pop-Up Lawn Sprinkler with Rainbow Spray (`p2_lawn_sprinkler`)
    // =========================================================================
    const spkBaseX = 455;
    const spkBaseY = 615;
    const spkScale = 0.516; // ~95px tall
    const spkSprite = this.add
      .sprite(spkBaseX, spkBaseY, 'p2_lawn_sprinkler', 0)
      .setOrigin(0.5, 1.0)
      .setScale(spkScale)
      .setDepth(20);
    this.stageContainer.add(spkSprite);

    const spkZone = this.add
      .zone(spkBaseX, spkBaseY - 48, 130, 110)
      .setOrigin(0.5, 0.5)
      .setDepth(21)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(spkZone);

    let isSprinklerActive = false;
    spkZone.on('pointerdown', () => {
      if (isSprinklerActive) return;
      isSprinklerActive = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p2_lawn_sprinkler.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p3:p2-lawn-sprinkler');
      Juice.burstStars(this, spkBaseX, spkBaseY - 70, 12, [0x38bdf8, 0xfde047, 0x4ade80, 0xf472b6]);

      // Step to Frame 1 (popping up), then rapidly cycle Frame 2 <-> Frame 3 at 6 fps (~166ms) for 2.0s
      spkSprite.setFrame(1);

      this.time.delayedCall(166, () => {
        if (!spkSprite.scene) return;
        spkSprite.setFrame(2);

        const sprayTimer = this.time.addEvent({
          delay: 166,
          loop: true,
          callback: () => {
            if (!spkSprite.scene) {
              sprayTimer.remove(false);
              return;
            }
            spkSprite.setFrame(spkSprite.frame.name === '2' ? 3 : 2);

            // Spawn tiny blue water droplet particles across the grass
            for (let d = 0; d < 3; d++) {
              const drop = this.add.graphics();
              drop.fillStyle(d % 2 === 0 ? 0x38bdf8 : 0xbae6fd, 0.9);
              drop.fillCircle(0, 0, 3);
              const startX = spkBaseX + Phaser.Math.Between(-18, 18);
              const startY = spkBaseY - 58;
              drop.setPosition(startX, startY);
              drop.setDepth(21);
              this.stageContainer.add(drop);
              this.stageContainer.sort('depth');

              const arcX = startX + Phaser.Math.Between(-68, 68);
              const landY = spkBaseY - Phaser.Math.Between(2, 18);
              this.tweens.add({
                targets: drop,
                x: arcX,
                y: landY,
                alpha: { from: 0.95, to: 0 },
                duration: 420,
                ease: 'Quad.easeIn',
                onComplete: () => drop.destroy()
              });
            }
          }
        });

        // Retract back to Frame 0 after 2.0s
        this.time.delayedCall(2000, () => {
          sprayTimer.remove(false);
          if (!spkSprite.scene) return;
          spkSprite.setFrame(1);
          this.time.delayedCall(150, () => {
            if (!spkSprite.scene) return;
            spkSprite.setFrame(0);
            isSprinklerActive = false;
          });
        });
      });
    });

    // =========================================================================
    // 8. Pine-Tree Red Squirrel Juggling Pinecones (`p2_tree_squirrel`)
    // =========================================================================
    const sqBaseX = 82;
    const sqBaseY = 385;
    const sqScale = 0.30; // ~88px tall
    const sqSprite = this.add
      .sprite(sqBaseX, sqBaseY, 'p2_tree_squirrel', 0)
      .setOrigin(0.5, 0.5)
      .setScale(sqScale)
      .setDepth(14);
    this.stageContainer.add(sqSprite);

    // Subtle idle tail/body bob
    const sqIdleTween = this.tweens.add({
      targets: sqSprite,
      scaleY: { from: sqScale, to: sqScale * 1.03 },
      duration: 1250,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const sqZone = this.add
      .zone(sqBaseX, sqBaseY, 100, 108)
      .setOrigin(0.5, 0.5)
      .setDepth(15)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(sqZone);

    let isSqBusy = false;
    sqZone.on('pointerdown', () => {
      if (isSqBusy) return;
      isSqBusy = true;
      sqIdleTween.pause();

      this.playColoradoSfx('/assets/audio/colorado/sfx/p2_squirrel_juggle.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p3:p2-tree-squirrel');
      Juice.burstStars(this, sqBaseX, sqBaseY - 38, 12, [0xfbbf24, 0x4ade80, 0xffffff]);

      // Animate 0 -> 1 -> 2 -> 3 -> 2 -> 3 -> 0 at 6 fps (~166ms/step) with a little hop
      const seq = [1, 2, 3, 2, 3, 0];
      const stepMs = 166;
      seq.forEach((frameIdx, idx) => {
        this.time.delayedCall(idx * stepMs, () => {
          if (!sqSprite.scene) return;
          sqSprite.setFrame(frameIdx);
          if (frameIdx === 2) {
            this.tweens.add({
              targets: sqSprite,
              y: sqBaseY - 10,
              duration: 75,
              yoyo: true,
              ease: 'Quad.easeOut',
              onComplete: () => {
                if (sqSprite.scene) sqSprite.setY(sqBaseY);
              }
            });
          }
          if (idx === seq.length - 1) {
            sqSprite.setPosition(sqBaseX, sqBaseY);
            sqSprite.setScale(sqScale);
            sqIdleTween.resume();
            isSqBusy = false;
          }
        });
      });
    });

    // Sort stageContainer children by their exact `.setDepth(...)` values
    this.stageContainer.sort('depth');
  }

  /**
   * Book 2 — Page 3 ("Manitou Springs Penny Arcade") Clean-Plate Living Books Scene:
   * Mounts all 7 multi-frame sprite sheets + the Pinball Machine Playfield Light Show & Bumper Ricochet
   * on `p3-clean.jpg` with crisp NEAREST pixel-art filtering, 14s arcade room ambience loop
   * (`p3_ambient_arcade_loop.mp3` at `volume: 0.18`), and dual-audio layered animations.
   */
  private mountPage3LivingScene(): void {
    const requiredSpritesheets: { key: string; url: string; frameWidth: number; frameHeight: number }[] = [
      { key: 'p3_wyatt_skeeball', url: '/assets/stories/colorado/sprites/p3/p3_wyatt_skeeball.png?v=p3v1', frameWidth: 271, frameHeight: 381 },
      { key: 'p3_emma_tickets', url: '/assets/stories/colorado/sprites/p3/p3_emma_tickets.png?v=p3v1', frameWidth: 265, frameHeight: 414 },
      { key: 'p3_grandparents_cheer', url: '/assets/stories/colorado/sprites/p3/p3_grandparents_cheer.png?v=p3v1', frameWidth: 280, frameHeight: 498 },
      { key: 'p3_pony_doggie', url: '/assets/stories/colorado/sprites/p3/p3_pony_doggie.png?v=p3v1', frameWidth: 252, frameHeight: 409 },
      { key: 'p3_claw_sparky', url: '/assets/stories/colorado/sprites/p3/p3_claw_sparky.png?v=p3v1', frameWidth: 219, frameHeight: 517 },
      { key: 'p3_fortuneteller', url: '/assets/stories/colorado/sprites/p3/p3_fortuneteller.png?v=p3v1', frameWidth: 259, frameHeight: 291 },
      { key: 'p3_bigfoot_wheel', url: '/assets/stories/colorado/sprites/p3/p3_bigfoot_wheel.png?v=p3v1', frameWidth: 267, frameHeight: 262 }
    ];

    let needsRuntimeLoad = false;
    for (const ss of requiredSpritesheets) {
      if (!this.textures.exists(ss.key)) {
        this.load.spritesheet(ss.key, ss.url, { frameWidth: ss.frameWidth, frameHeight: ss.frameHeight });
        needsRuntimeLoad = true;
      }
    }
    if (needsRuntimeLoad) {
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        const activeBg = COLORADO_PAGES[this.currentPageIndex]?.bgKey;
        if (this.scene.isActive() && (activeBg === 'colorado-p3-clean' || activeBg === 'colorado-p3')) {
          this.mountPage3LivingScene();
        }
      });
      this.load.start();
      return;
    }

    // Apply crisp NEAREST pixel-art filtering to all Page 3 textures
    requiredSpritesheets.forEach((s) => {
      if (this.textures.exists(s.key)) {
        this.textures.get(s.key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    });

    // Loop `p3_ambient_arcade_loop.mp3` continuously at `volume: 0.18` while on Page 3
    this.startPage3AmbientAudio();

    const glowKey = this.textures.exists('cover-candle-glow') ? 'cover-candle-glow' : 'particle-star';

    // =========================================================================
    // 1. Wyatt Bowling Skee-Ball (`p3_wyatt_skeeball`)
    // =========================================================================
    const wyattBaseX = 425;
    const wyattBaseY = 692;
    const wyattScale = 255 / 373; // ~255px tall (~0.684)
    const wyattSprite = this.add
      .sprite(wyattBaseX, wyattBaseY, 'p3_wyatt_skeeball', 0)
      .setOrigin(0.5, 1.0)
      .setScale(wyattScale)
      .setDepth(22);
    this.stageContainer.add(wyattSprite);

    const wyattIdleTween = this.tweens.add({
      targets: wyattSprite,
      scaleY: { from: wyattScale, to: wyattScale * 1.022 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const wyattZone = this.add
      .zone(wyattBaseX, wyattBaseY - 125, 175, 255)
      .setOrigin(0.5, 0.5)
      .setDepth(23)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(wyattZone);

    let isWyattBusy = false;
    wyattZone.on('pointerdown', () => {
      if (isWyattBusy) return;
      isWyattBusy = true;
      wyattIdleTween.pause();

      // Play `p3_skeeball_roll.mp3` immediately, then trigger `p3_skeeball_ding.mp3` after 550ms
      this.playColoradoSfx('/assets/audio/colorado/sfx/p3_skeeball_roll.mp3');
      this.time.delayedCall(550, () => {
        if (this.scene.isActive() && wyattSprite.scene) {
          this.playColoradoSfx('/assets/audio/colorado/sfx/p3_skeeball_ding.mp3');
          Juice.burstStars(this, 215, 410, 14, [0xfde047, 0xf59e0b, 0xffffff]);

          // Golden "100!" floating text popup over the Skee-Ball target rings (x: 215, y: 410)
          const scoreTxt = this.add
            .text(215, 410, '100!', {
              fontFamily: '"Fredoka", "Courier New", monospace',
              fontSize: '30px',
              fontStyle: 'bold',
              color: '#fde047',
              stroke: '#78350f',
              strokeThickness: 6
            })
            .setOrigin(0.5)
            .setDepth(28);
          this.stageContainer.add(scoreTxt);
          this.stageContainer.sort('depth');

          this.tweens.add({
            targets: scoreTxt,
            y: 355,
            scaleX: { from: 0.7, to: 1.25 },
            scaleY: { from: 0.7, to: 1.25 },
            alpha: { from: 1, to: 0 },
            duration: 950,
            ease: 'Back.easeOut',
            onComplete: () => scoreTxt.destroy()
          });
        }
      });

      ArcadeState.markHotspotDiscovered('colorado:p4:p3-wyatt-skeeball');
      Juice.burstStars(this, wyattBaseX, wyattBaseY - 140, 12, [0xfde047, 0x38bdf8, 0xffffff]);

      // Animate frames 0 -> 1 -> 2 -> 3 -> 2 -> 3 -> 0 (at 6 fps, ~166ms/step)
      const seq = [0, 1, 2, 3, 2, 3, 0];
      const stepMs = 166;
      seq.forEach((frameIdx, idx) => {
        this.time.delayedCall(idx * stepMs, () => {
          if (!wyattSprite.scene) return;
          wyattSprite.setFrame(frameIdx);
          if (frameIdx === 3) {
            this.tweens.add({
              targets: wyattSprite,
              y: wyattBaseY - 14,
              duration: 80,
              yoyo: true,
              ease: 'Quad.easeOut',
              onComplete: () => {
                if (wyattSprite.scene) wyattSprite.setY(wyattBaseY);
              }
            });
          }
          if (idx === seq.length - 1) {
            wyattSprite.setPosition(wyattBaseX, wyattBaseY);
            wyattSprite.setScale(wyattScale);
            wyattIdleTween.resume();
            isWyattBusy = false;
          }
        });
      });
    });

    // =========================================================================
    // 2. Emma Dancing with Golden Tickets (`p3_emma_tickets`)
    // =========================================================================
    const emmaBaseX = 615;
    const emmaBaseY = 682;
    const emmaScale = 225 / 406; // ~225px tall (~0.554)
    const emmaSprite = this.add
      .sprite(emmaBaseX, emmaBaseY, 'p3_emma_tickets', 0)
      .setOrigin(0.5, 1.0)
      .setScale(emmaScale)
      .setDepth(22);
    this.stageContainer.add(emmaSprite);

    const emmaIdleTween = this.tweens.add({
      targets: emmaSprite,
      angle: { from: -2, to: 2 },
      duration: 950,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const emmaZone = this.add
      .zone(emmaBaseX, emmaBaseY - 112, 160, 225)
      .setOrigin(0.5, 0.5)
      .setDepth(23)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(emmaZone);

    let isEmmaBusy = false;
    emmaZone.on('pointerdown', () => {
      if (isEmmaBusy) return;
      isEmmaBusy = true;
      emmaIdleTween.pause();
      emmaSprite.setAngle(0);

      // Play `p3_tickets_dispense.mp3` + `p3_emma_giggle.mp3` together
      this.playColoradoSfx('/assets/audio/colorado/sfx/p3_tickets_dispense.mp3');
      this.playColoradoSfx('/assets/audio/colorado/sfx/p3_emma_giggle.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p4:p3-emma-tickets');
      Juice.burstStars(this, emmaBaseX, emmaBaseY - 135, 14, [0xfde047, 0xf59e0b, 0xc084fc, 0xffffff]);

      // Spawn fluttering golden ticket confetti particles
      for (let t = 0; t < 10; t++) {
        this.time.delayedCall(t * 95, () => {
          if (!this.scene.isActive() || !emmaSprite.scene) return;
          const ticket = this.add.graphics();
          ticket.fillStyle(t % 2 === 0 ? 0xfbbf24 : 0xfde047, 1);
          ticket.fillRect(-7, -4, 14, 8);
          ticket.lineStyle(1.5, 0xb45309, 1);
          ticket.strokeRect(-7, -4, 14, 8);
          const tx = emmaBaseX + Phaser.Math.Between(-52, 52);
          const ty = emmaBaseY - Phaser.Math.Between(125, 195);
          ticket.setPosition(tx, ty);
          ticket.setDepth(25);
          this.stageContainer.add(ticket);
          this.stageContainer.sort('depth');

          this.tweens.add({
            targets: ticket,
            y: ty + Phaser.Math.Between(45, 85),
            x: tx + Phaser.Math.Between(-28, 28),
            angle: Phaser.Math.Between(-140, 140),
            alpha: { from: 1, to: 0 },
            duration: 720,
            ease: 'Sine.easeInOut',
            onComplete: () => ticket.destroy()
          });
        });
      }

      // Cycle frames 0 -> 1 -> 2 -> 3 -> 1 -> 2 -> 0 (at 6 fps, ~166ms/step)
      const seq = [0, 1, 2, 3, 1, 2, 0];
      const stepMs = 166;
      seq.forEach((frameIdx, idx) => {
        this.time.delayedCall(idx * stepMs, () => {
          if (!emmaSprite.scene) return;
          emmaSprite.setFrame(frameIdx);
          if (frameIdx === 2 || frameIdx === 3) {
            this.tweens.add({
              targets: emmaSprite,
              y: emmaBaseY - 12,
              duration: 75,
              yoyo: true,
              ease: 'Quad.easeOut',
              onComplete: () => {
                if (emmaSprite.scene) emmaSprite.setY(emmaBaseY);
              }
            });
          }
          if (idx === seq.length - 1) {
            emmaSprite.setPosition(emmaBaseX, emmaBaseY);
            emmaSprite.setScale(emmaScale);
            emmaIdleTween.resume();
            isEmmaBusy = false;
          }
        });
      });
    });

    // =========================================================================
    // 3. Grandpa & Babci Cheering (`p3_grandparents_cheer`)
    // =========================================================================
    const gpBaseX = 725;
    const gpBaseY = 598;
    const gpScale = 285 / 490; // ~285px tall (~0.582)
    const gpSprite = this.add
      .sprite(gpBaseX, gpBaseY, 'p3_grandparents_cheer', 0)
      .setOrigin(0.5, 1.0)
      .setScale(gpScale)
      .setDepth(16);
    this.stageContainer.add(gpSprite);

    let isGpBusy = false;
    // Idle: Gentle frame 0 <-> 1 sway
    const gpIdleTimer = this.time.addEvent({
      delay: 1500,
      loop: true,
      callback: () => {
        if (!gpSprite.scene) {
          gpIdleTimer.remove(false);
          return;
        }
        if (!isGpBusy) {
          gpSprite.setFrame(gpSprite.frame.name === '0' ? 1 : 0);
        }
      }
    });

    const gpZone = this.add
      .zone(gpBaseX, gpBaseY - 145, 165, 275)
      .setOrigin(0.5, 0.5)
      .setDepth(17)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(gpZone);

    gpZone.on('pointerdown', () => {
      if (isGpBusy) return;
      isGpBusy = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p3_grandparents_clap.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p4:p3-grandparents-cheer');
      Juice.burstStars(this, gpBaseX, gpBaseY - 220, 14, [0xfde047, 0xf472b6, 0xfbbf24, 0xffffff]);

      // Floating golden stars and hearts
      const heartColors = [0xf43f5e, 0xfde047, 0xf472b6, 0xfbbf24];
      for (let hIdx = 0; hIdx < 6; hIdx++) {
        this.time.delayedCall(hIdx * 140, () => {
          if (!this.scene.isActive() || !gpSprite.scene) return;
          const hx = gpBaseX + (hIdx - 2.5) * 26;
          const hy = gpBaseY - 245;
          const starOrHeart = this.add
            .image(hx, hy, 'particle-star')
            .setTint(heartColors[hIdx % heartColors.length])
            .setScale(0.42)
            .setDepth(18);
          this.stageContainer.add(starOrHeart);
          this.stageContainer.sort('depth');

          this.tweens.add({
            targets: starOrHeart,
            y: hy - 55,
            x: hx + (hIdx % 2 === 0 ? -10 : 10),
            alpha: { from: 1, to: 0 },
            scaleX: 0.16,
            scaleY: 0.16,
            duration: 780,
            ease: 'Sine.easeOut',
            onComplete: () => starOrHeart.destroy()
          });
        });
      }

      // Animate 0 -> 1 -> 2 -> 3 -> 2 -> 3 -> 0 (at 6 fps, ~166ms/step)
      const seq = [0, 1, 2, 3, 2, 3, 0];
      const stepMs = 166;
      seq.forEach((frameIdx, idx) => {
        this.time.delayedCall(idx * stepMs, () => {
          if (!gpSprite.scene) return;
          gpSprite.setFrame(frameIdx);
          if (frameIdx === 3) {
            this.tweens.add({
              targets: gpSprite,
              scaleY: gpScale * 1.03,
              duration: 75,
              yoyo: true
            });
          }
          if (idx === seq.length - 1) {
            gpSprite.setPosition(gpBaseX, gpBaseY);
            gpSprite.setScale(gpScale);
            isGpBusy = false;
          }
        });
      });
    });

    // =========================================================================
    // 4. Coin-Op Bouncy Pony with Doggie (`p3_pony_doggie`)
    // =========================================================================
    const ponyBaseX = 165;
    const ponyBaseY = 662;
    const ponyScale = 210 / 401; // ~210px tall (~0.524)
    const ponySprite = this.add
      .sprite(ponyBaseX, ponyBaseY, 'p3_pony_doggie', 0)
      .setOrigin(0.5, 1.0)
      .setScale(ponyScale)
      .setDepth(24);
    this.stageContainer.add(ponySprite);

    const ponyIdleTween = this.tweens.add({
      targets: ponySprite,
      scaleY: { from: ponyScale, to: ponyScale * 0.975 },
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const ponyZone = this.add
      .zone(ponyBaseX + 6, ponyBaseY - 105, 150, 210)
      .setOrigin(0.5, 0.5)
      .setDepth(25)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(ponyZone);

    let isPonyBusy = false;
    ponyZone.on('pointerdown', () => {
      if (isPonyBusy) return;
      isPonyBusy = true;
      ponyIdleTween.pause();

      // Play `p3_pony_spring.mp3` + `p3_doggie_squeak.mp3` (250ms delay)
      this.playColoradoSfx('/assets/audio/colorado/sfx/p3_pony_spring.mp3');
      this.time.delayedCall(250, () => {
        if (this.scene.isActive() && ponySprite.scene) {
          this.playColoradoSfx('/assets/audio/colorado/sfx/p3_doggie_squeak.mp3');
        }
      });

      ArcadeState.markHotspotDiscovered('colorado:p4:p3-pony-doggie');
      Juice.burstStars(this, ponyBaseX + 10, ponyBaseY - 148, 14, [0xfbbf24, 0x38bdf8, 0xf43f5e, 0xffffff]);

      // Animate 0 -> 1 -> 2 -> 3 -> 2 -> 3 -> 1 -> 0 (at 7 fps, ~143ms/step) with bouncy squash-and-stretch spring tween
      const seq = [0, 1, 2, 3, 2, 3, 1, 0];
      const stepMs = 143;
      seq.forEach((frameIdx, idx) => {
        this.time.delayedCall(idx * stepMs, () => {
          if (!ponySprite.scene) return;
          ponySprite.setFrame(frameIdx);
          if (frameIdx === 2) {
            this.tweens.add({
              targets: ponySprite,
              scaleY: ponyScale * 1.07,
              scaleX: ponyScale * 0.95,
              duration: 65,
              yoyo: true,
              ease: 'Back.easeOut'
            });
          } else if (frameIdx === 3) {
            this.tweens.add({
              targets: ponySprite,
              scaleY: ponyScale * 0.93,
              scaleX: ponyScale * 1.05,
              duration: 65,
              yoyo: true,
              ease: 'Sine.easeInOut'
            });
          }
          if (idx === seq.length - 1) {
            ponySprite.setPosition(ponyBaseX, ponyBaseY);
            ponySprite.setScale(ponyScale);
            ponyIdleTween.resume();
            isPonyBusy = false;
          }
        });
      });
    });

    // =========================================================================
    // 5. Claw Machine Grabbing Sparky (`p3_claw_sparky`)
    // =========================================================================
    const clawBaseX = 138;
    const clawBaseY = 318;
    const clawScale = 125 / 513; // ~125px tall (~0.244)
    const clawSprite = this.add
      .sprite(clawBaseX, clawBaseY, 'p3_claw_sparky', 0)
      .setOrigin(0.5, 0.0)
      .setScale(clawScale)
      .setDepth(14);
    this.stageContainer.add(clawSprite);

    // Hit area covering the claw machine glass `x: 35..185, y: 310..520`
    const clawZone = this.add
      .zone(110, 415, 150, 210)
      .setOrigin(0.5, 0.5)
      .setDepth(15)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(clawZone);

    let isClawBusy = false;
    clawZone.on('pointerdown', () => {
      if (isClawBusy) return;
      isClawBusy = true;

      // Play `p3_claw_servo.mp3`, then play `p3_sparky_chime.mp3` at 650ms
      this.playColoradoSfx('/assets/audio/colorado/sfx/p3_claw_servo.mp3');
      this.time.delayedCall(650, () => {
        if (this.scene.isActive() && clawSprite.scene) {
          this.playColoradoSfx('/assets/audio/colorado/sfx/p3_sparky_chime.mp3');
          Juice.burstStars(this, clawBaseX, clawBaseY + 88, 14, [0x34d399, 0xfde047, 0xffffff]);
        }
      });

      ArcadeState.markHotspotDiscovered('colorado:p4:p3-claw-sparky');

      // Step through frames 0 -> 1 -> 2 -> 3 -> 2 -> 1 -> 0 (at 5 fps, 200ms/step)
      const seq = [0, 1, 2, 3, 2, 1, 0];
      const stepMs = 200;
      seq.forEach((frameIdx, idx) => {
        this.time.delayedCall(idx * stepMs, () => {
          if (!clawSprite.scene) return;
          clawSprite.setFrame(frameIdx);
          if (idx === seq.length - 1) {
            clawSprite.setPosition(clawBaseX, clawBaseY);
            clawSprite.setScale(clawScale);
            isClawBusy = false;
          }
        });
      });
    });

    // =========================================================================
    // 6. Fortune-Teller Booth (`p3_fortuneteller`)
    // =========================================================================
    const ftBaseX = 342;
    const ftBaseY = 410;
    const ftScale = 68 / 283; // ~68px tall (~0.240)
    const ftSprite = this.add
      .sprite(ftBaseX, ftBaseY, 'p3_fortuneteller', 0)
      .setOrigin(0.5, 1.0)
      .setScale(ftScale)
      .setDepth(11);
    this.stageContainer.add(ftSprite);

    const ftZone = this.add
      .zone(ftBaseX, ftBaseY - 34, 88, 92)
      .setOrigin(0.5, 0.5)
      .setDepth(12)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(ftZone);

    let isFtBusy = false;
    ftZone.on('pointerdown', () => {
      if (isFtBusy) return;
      isFtBusy = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p3_fortune_organ.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p4:p3-fortuneteller');
      Juice.burstStars(this, ftBaseX, ftBaseY - 36, 12, [0x38bdf8, 0xc084fc, 0xfde047, 0xffffff]);

      // Cyan/purple additive glow pulse over the fortune teller crystal ball
      const mysticGlow = this.add
        .image(ftBaseX, ftBaseY - 24, glowKey)
        .setOrigin(0.5, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0x38bdf8)
        .setScale(0.48)
        .setAlpha(0.85)
        .setDepth(12);
      this.stageContainer.add(mysticGlow);
      this.stageContainer.sort('depth');

      this.tweens.add({
        targets: mysticGlow,
        scaleX: 1.05,
        scaleY: 1.05,
        alpha: 0,
        duration: 1100,
        ease: 'Sine.easeInOut',
        onUpdate: (tw) => {
          const p = tw.progress;
          mysticGlow.setTint(p < 0.5 ? 0x38bdf8 : 0xc084fc);
        },
        onComplete: () => mysticGlow.destroy()
      });

      // Cycle frames 0 -> 1 -> 2 -> 3 -> 2 -> 0 (at 5 fps, 200ms/step)
      const seq = [0, 1, 2, 3, 2, 0];
      const stepMs = 200;
      seq.forEach((frameIdx, idx) => {
        this.time.delayedCall(idx * stepMs, () => {
          if (!ftSprite.scene) return;
          ftSprite.setFrame(frameIdx);
          if (idx === seq.length - 1) {
            ftSprite.setPosition(ftBaseX, ftBaseY);
            ftSprite.setScale(ftScale);
            isFtBusy = false;
          }
        });
      });
    });

    // =========================================================================
    // 7. `BIGFOOT CRUSH` Rainbow Wheel (`p3_bigfoot_wheel`)
    // =========================================================================
    const wheelBaseX = 1038;
    const wheelBaseY = 272;
    const wheelScale = 112 / 254; // ~112px diameter (~0.441)
    const wheelSprite = this.add
      .sprite(wheelBaseX, wheelBaseY, 'p3_bigfoot_wheel', 0)
      .setOrigin(0.5, 0.5)
      .setScale(wheelScale)
      .setDepth(18);
    this.stageContainer.add(wheelSprite);

    let isWheelSpinning = false;
    let wheelIdleFrame = 0;
    // Ambient: Slowly cycles frames 0 -> 1 -> 2 at 2 fps (500ms) in idle
    const wheelIdleTimer = this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        if (!wheelSprite.scene) {
          wheelIdleTimer.remove(false);
          return;
        }
        if (!isWheelSpinning) {
          wheelIdleFrame = (wheelIdleFrame + 1) % 3;
          wheelSprite.setFrame(wheelIdleFrame);
        }
      }
    });

    const wheelZone = this.add
      .zone(wheelBaseX, wheelBaseY, 120, 120)
      .setOrigin(0.5, 0.5)
      .setDepth(19)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(wheelZone);

    wheelZone.on('pointerdown', () => {
      if (isWheelSpinning) return;
      isWheelSpinning = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p3_wheel_spin.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p4:p3-bigfoot-wheel');
      Juice.burstStars(this, wheelBaseX, wheelBaseY, 16, [0xfde047, 0x38bdf8, 0xf43f5e, 0x4ade80, 0xc084fc]);

      // Rapidly spin/cycle frames 0 -> 1 -> 2 -> 3 at 14 fps (~71ms/step) for 2.2s with neon starburst particles
      let spinFrame = 0;
      const fastSpinTimer = this.time.addEvent({
        delay: 71,
        loop: true,
        callback: () => {
          if (!wheelSprite.scene) {
            fastSpinTimer.remove(false);
            return;
          }
          spinFrame = (spinFrame + 1) % 4;
          wheelSprite.setFrame(spinFrame);
        }
      });

      this.tweens.add({
        targets: wheelSprite,
        angle: { from: 0, to: 1080 },
        duration: 2200,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          fastSpinTimer.remove(false);
          if (!wheelSprite.scene) return;
          wheelSprite.setAngle(0);
          wheelSprite.setFrame(0);
          Juice.burstStars(this, wheelBaseX, wheelBaseY, 10, [0xfde047, 0x38bdf8, 0xf472b6]);
          isWheelSpinning = false;
        }
      });
    });

    // =========================================================================
    // 8. Tasteful Ambient Flashing Arcade Lights Across the Other Machines
    // =========================================================================
    // 8a. Top Marquee Bulbs Above `BIGFOOT CRUSH`:
    // 5 warm golden-amber chaser lights pulsing in a sequential chaser wave (`alpha: 0.15 <-> 0.65`, `400ms` stagger)
    const marqueeBulbs = [
      { x: 1072, y: 136 },
      { x: 1115, y: 120 },
      { x: 1160, y: 102 },
      { x: 1208, y: 84 },
      { x: 1255, y: 66 }
    ];
    marqueeBulbs.forEach((b, idx) => {
      const bulbGlow = this.add
        .image(b.x, b.y, glowKey)
        .setOrigin(0.5, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xfbbf24)
        .setScale(0.28)
        .setAlpha(0.15)
        .setDepth(15);
      this.stageContainer.add(bulbGlow);

      this.tweens.add({
        targets: bulbGlow,
        alpha: { from: 0.15, to: 0.65 },
        scaleX: { from: 0.24, to: 0.36 },
        scaleY: { from: 0.24, to: 0.36 },
        delay: idx * 400,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });

    // 8b. Middle Arcade Backglass Cabinets (Behind Grandpa & Babci):
    // Warm orange/gold marquee glow on the rounded top cabinet at `(x: 690, y: 275)` and `(x: 745, y: 315)`
    const midCabinetMarquees = [
      { x: 690, y: 275, color: 0xf59e0b, scale: 0.48, delay: 0 },
      { x: 745, y: 315, color: 0xfbbf24, scale: 0.44, delay: 450 }
    ];
    midCabinetMarquees.forEach((m) => {
      const midGlow = this.add
        .image(m.x, m.y, glowKey)
        .setOrigin(0.5, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(m.color)
        .setScale(m.scale)
        .setAlpha(0.12)
        .setDepth(12);
      this.stageContainer.add(midGlow);

      this.tweens.add({
        targets: midGlow,
        alpha: { from: 0.12, to: 0.45 },
        scaleX: { from: m.scale * 0.9, to: m.scale * 1.12 },
        scaleY: { from: m.scale * 0.9, to: m.scale * 1.12 },
        delay: m.delay,
        duration: 1350,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });

    // Cyan and magenta neon screen shimmer on the upright arcade cabinet glass at `(x: 915, y: 395)` (`alpha: 0.10 <-> 0.38`)
    const uprightNeonCyan = this.add
      .image(915, 395, glowKey)
      .setOrigin(0.5, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0x38bdf8)
      .setScale(0.52)
      .setAlpha(0.1)
      .setDepth(13);
    this.stageContainer.add(uprightNeonCyan);

    this.tweens.add({
      targets: uprightNeonCyan,
      alpha: { from: 0.1, to: 0.38 },
      scaleX: { from: 0.46, to: 0.58 },
      scaleY: { from: 0.46, to: 0.58 },
      duration: 1150,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const uprightNeonMagenta = this.add
      .image(915, 395, glowKey)
      .setOrigin(0.5, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xe879f9)
      .setScale(0.46)
      .setAlpha(0.1)
      .setDepth(13);
    this.stageContainer.add(uprightNeonMagenta);

    this.tweens.add({
      targets: uprightNeonMagenta,
      alpha: { from: 0.1, to: 0.38 },
      scaleX: { from: 0.42, to: 0.54 },
      scaleY: { from: 0.42, to: 0.54 },
      delay: 575,
      duration: 1150,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 8c. Claw Machine & Skee-Ball Header:
    // Gentle warm yellow pulse on the `SKEE-BALL` marquee sign at `(x: 205, y: 280)` and claw machine top header at `(x: 115, y: 235)`
    const headerMarquees = [
      { x: 205, y: 280, scale: 0.46, delay: 0 },
      { x: 115, y: 235, scale: 0.44, delay: 500 }
    ];
    headerMarquees.forEach((hm) => {
      const hGlow = this.add
        .image(hm.x, hm.y, glowKey)
        .setOrigin(0.5, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xfde047)
        .setScale(hm.scale)
        .setAlpha(0.14)
        .setDepth(13);
      this.stageContainer.add(hGlow);

      this.tweens.add({
        targets: hGlow,
        alpha: { from: 0.14, to: 0.44 },
        scaleX: { from: hm.scale * 0.92, to: hm.scale * 1.1 },
        scaleY: { from: hm.scale * 0.92, to: hm.scale * 1.1 },
        delay: hm.delay,
        duration: 1250,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });

    // Soft pink vertical LED chaser shimmer along the claw machine corner light strip (`x: 92, y: 280..480`)
    const pinkStripYs = [280, 330, 380, 430, 480];
    pinkStripYs.forEach((py, idx) => {
      const pinkLed = this.add
        .image(92, py, glowKey)
        .setOrigin(0.5, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xf472b6)
        .setScale(0.22)
        .setAlpha(0.12)
        .setDepth(15);
      this.stageContainer.add(pinkLed);

      this.tweens.add({
        targets: pinkLed,
        alpha: { from: 0.12, to: 0.48 },
        scaleX: { from: 0.18, to: 0.27 },
        scaleY: { from: 0.18, to: 0.27 },
        delay: idx * 220,
        duration: 680,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });

    // =========================================================================
    // 9. Pinball Machine Playfield Light Show & Bumper Ricochet
    //    (Phaser Additive Lights over Existing Pinball Machine `x: 645..815, y: 505..635`)
    // =========================================================================
    const bumperCoords = [
      { x: 690, y: 542, idleColor: 0xf59e0b },
      { x: 725, y: 555, idleColor: 0x38bdf8 },
      { x: 770, y: 558, idleColor: 0xef4444 }
    ];

    // Gentle continuous multi-color attract-mode pulse (`amber`, `cyan`, `red` soft glows cycling every `900ms` at `alpha: 0.18 <-> 0.45`)
    const attractColors = [0xf59e0b, 0x38bdf8, 0xef4444];
    const attractGlows: Phaser.GameObjects.Image[] = [];
    bumperCoords.forEach((b, idx) => {
      const idleGlow = this.add
        .image(b.x, b.y, glowKey)
        .setOrigin(0.5, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(b.idleColor)
        .setScale(0.32)
        .setAlpha(0.18)
        .setDepth(19);
      this.stageContainer.add(idleGlow);
      attractGlows.push(idleGlow);

      this.tweens.add({
        targets: idleGlow,
        scaleX: { from: 0.26, to: 0.42 },
        scaleY: { from: 0.26, to: 0.42 },
        alpha: { from: 0.18, to: 0.45 },
        duration: 900,
        delay: idx * 300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });

    let attractCycleStep = 0;
    const pinballAttractTimer = this.time.addEvent({
      delay: 900,
      loop: true,
      callback: () => {
        if (!this.scene.isActive() || !attractGlows[0]?.scene) {
          pinballAttractTimer.remove(false);
          return;
        }
        attractCycleStep = (attractCycleStep + 1) % attractColors.length;
        attractGlows.forEach((g, idx) => {
          if (g.scene) {
            g.setTint(attractColors[(attractCycleStep + idx) % attractColors.length]);
          }
        });
      }
    });

    // Interactive zone over the glowing superhero pinball machine glass (`x: 645..815, y: 505..635`)
    const pinballZone = this.add
      .zone(730, 570, 170, 130)
      .setOrigin(0.5, 0.5)
      .setDepth(21)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(pinballZone);

    let isPinballActive = false;
    pinballZone.on('pointerdown', () => {
      if (isPinballActive) return;
      isPinballActive = true;

      // Play `p3_pinball_bumpers.mp3` and `p3_pinball_bells.mp3` simultaneously!
      this.playColoradoSfx('/assets/audio/colorado/sfx/p3_pinball_bumpers.mp3');
      this.playColoradoSfx('/assets/audio/colorado/sfx/p3_pinball_bells.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p4:p3-pinball-playfield');

      // Vibrate the pinball cabinet slightly (+-2px)
      this.cameras.main.shake(450, 0.0018);

      // Float up "JACKPOT! 5,000!" pixel text
      const jackpotTxt = this.add
        .text(730, 520, 'JACKPOT! 5,000!', {
          fontFamily: '"Fredoka", "Courier New", monospace',
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#fde047',
          stroke: '#78350f',
          strokeThickness: 5
        })
        .setOrigin(0.5)
        .setDepth(28);
      this.stageContainer.add(jackpotTxt);
      this.stageContainer.sort('depth');

      this.tweens.add({
        targets: jackpotTxt,
        y: 455,
        scaleX: { from: 0.75, to: 1.15 },
        scaleY: { from: 0.75, to: 1.15 },
        alpha: { from: 1, to: 0 },
        duration: 1450,
        ease: 'Back.easeOut',
        onComplete: () => jackpotTxt.destroy()
      });

      // Spawn 3 shiny silver pixel pinballs that ricochet rapidly inside `(655..795, 520..605)`
      // while strobing bright red, cyan, and gold additive bumper light flashes (`BlendMode.ADD`)
      const strobePalette = [0xef4444, 0x38bdf8, 0xfde047];
      const balls: {
        g: Phaser.GameObjects.Graphics;
        vx: number;
        vy: number;
      }[] = [];

      for (let i = 0; i < 3; i++) {
        const ballG = this.add.graphics();
        // Shiny silver pixel pinball with white specular highlight
        ballG.fillStyle(0x94a3b8, 1);
        ballG.fillCircle(0, 0, 5);
        ballG.fillStyle(0xe2e8f0, 1);
        ballG.fillCircle(-1, -1, 3.5);
        ballG.fillStyle(0xffffff, 1);
        ballG.fillRect(-2, -3, 2, 2);
        ballG.setPosition(680 + i * 32, 545 + (i % 2) * 24);
        ballG.setDepth(20);
        this.stageContainer.add(ballG);

        balls.push({
          g: ballG,
          vx: (i % 2 === 0 ? 1 : -1) * (8.5 + i * 1.4),
          vy: (i === 1 ? -1 : 1) * (6.8 + i * 1.1)
        });
      }
      this.stageContainer.sort('depth');

      let stepCount = 0;
      const ricochetTimer = this.time.addEvent({
        delay: 30,
        loop: true,
        callback: () => {
          if (!this.scene.isActive()) {
            ricochetTimer.remove(false);
            return;
          }
          stepCount++;
          balls.forEach((b, idx) => {
            if (!b.g.scene) return;
            b.g.x += b.vx;
            b.g.y += b.vy;

            let bounced = false;
            if (b.g.x <= 658) {
              b.g.x = 658;
              b.vx = Math.abs(b.vx);
              bounced = true;
            } else if (b.g.x >= 792) {
              b.g.x = 792;
              b.vx = -Math.abs(b.vx);
              bounced = true;
            }
            if (b.g.y <= 522) {
              b.g.y = 522;
              b.vy = Math.abs(b.vy);
              bounced = true;
            } else if (b.g.y >= 602) {
              b.g.y = 602;
              b.vy = -Math.abs(b.vy);
              bounced = true;
            }

            if (bounced && stepCount % 2 === 0) {
              const flash = this.add
                .image(b.g.x, b.g.y, glowKey)
                .setOrigin(0.5, 0.5)
                .setBlendMode(Phaser.BlendModes.ADD)
                .setTint(strobePalette[(stepCount + idx) % strobePalette.length])
                .setScale(0.45)
                .setAlpha(0.92)
                .setDepth(20);
              this.stageContainer.add(flash);
              this.stageContainer.sort('depth');

              this.tweens.add({
                targets: flash,
                scaleX: 0.78,
                scaleY: 0.78,
                alpha: 0,
                duration: 180,
                ease: 'Quad.easeOut',
                onComplete: () => flash.destroy()
              });
            }
          });
        }
      });

      this.time.delayedCall(2000, () => {
        ricochetTimer.remove(false);
        balls.forEach((b) => {
          if (b.g.scene) b.g.destroy();
        });
        isPinballActive = false;
      });
    });

    // Sort stageContainer children by their exact `.setDepth(...)` values
    this.stageContainer.sort('depth');
  }

  /**
   * Book 2 — Page 4 ("Eleven Mile Canyon & South Platte River") Clean-Plate Living Books Scene:
   * Mounts the distant Cessna 172 behind `p4_canyon_foreground_mask.png`, the distant Colorado
   * Bighorn Sheep on the right cliff step, mid-river Sparky in his striped inner tube, Doggie
   * fishing on the right boulder (`flipX: true`), the foreground dragonfly, 18 sunlit river water
   * glint bars, and interactive foot-splash + grandparents hug zones.
   */
  private mountPage4LivingScene(): void {
    const requiredSpritesheets: { key: string; url: string; frameWidth: number; frameHeight: number }[] = [
      { key: 'p4_bighorn', url: '/assets/stories/colorado/sprites/p4/p4_bighorn.png?v=p4v1', frameWidth: 221, frameHeight: 367 },
      { key: 'p4_cessna', url: '/assets/stories/colorado/sprites/p4/p4_cessna.png?v=p4v1', frameWidth: 240, frameHeight: 101 },
      { key: 'p4_doggie_fisherman', url: '/assets/stories/colorado/sprites/p4/p4_doggie_fisherman.png?v=p4v1', frameWidth: 245, frameHeight: 235 },
      { key: 'p4_dragonfly', url: '/assets/stories/colorado/sprites/p4/p4_dragonfly.png?v=p4v1', frameWidth: 221, frameHeight: 237 },
      { key: 'p4_sparky_tube', url: '/assets/stories/colorado/sprites/p4/p4_sparky_tube.png?v=p4v1', frameWidth: 268, frameHeight: 210 }
    ];
    const requiredImages: { key: string; url: string }[] = [
      { key: 'p4_canyon_foreground_mask', url: '/assets/stories/colorado/sprites/p4/p4_canyon_foreground_mask.png?v=p4v1' }
    ];

    let needsRuntimeLoad = false;
    for (const ss of requiredSpritesheets) {
      if (!this.textures.exists(ss.key)) {
        this.load.spritesheet(ss.key, ss.url, { frameWidth: ss.frameWidth, frameHeight: ss.frameHeight });
        needsRuntimeLoad = true;
      }
    }
    for (const img of requiredImages) {
      if (!this.textures.exists(img.key)) {
        this.load.image(img.key, img.url);
        needsRuntimeLoad = true;
      }
    }
    if (needsRuntimeLoad) {
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        const activeBg = COLORADO_PAGES[this.currentPageIndex]?.bgKey;
        if (this.scene.isActive() && (activeBg === 'colorado-p4-clean' || activeBg === 'colorado-p4')) {
          this.mountPage4LivingScene();
        }
      });
      this.load.start();
      return;
    }

    // Apply crisp NEAREST pixel-art filtering to all Page 4 textures
    [...requiredSpritesheets, ...requiredImages].forEach((t) => {
      if (this.textures.exists(t.key)) {
        this.textures.get(t.key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    });

    // Loop `p4_ambient_stream.mp3` continuously at `volume: 0.22` while on Page 4
    this.startPage4AmbientAudio();

    // =========================================================================
    // 1. Distant Cessna 172 Flying Right-to-Left Behind the Canyon Cliffs (`p4_cessna.png`)
    // =========================================================================
    const cessnaStartX = 785;
    const cessnaEndX = 310;
    const cessnaBaseY = 178;
    const cessnaScale = 46 / 232; // ~46px wide (~0.198)
    const cessnaSprite = this.add
      .sprite(cessnaStartX, cessnaBaseY, 'p4_cessna', 0)
      .setOrigin(0.5, 0.5)
      .setScale(cessnaScale)
      .setDepth(8);
    this.stageContainer.add(cessnaSprite);

    // Foreground Canyon Mask (`p4_canyon_foreground_mask.png`) at (240, 130) with origin(0, 0) at depth 12 (non-interactive)
    const canyonMaskImg = this.add
      .image(240, 130, 'p4_canyon_foreground_mask')
      .setOrigin(0, 0)
      .setDepth(12);
    this.stageContainer.add(canyonMaskImg);

    let isCessnaWaggling = false;
    let propToggle = false;
    // Cycle propeller frames 0 <-> 1 at 12 fps (~83ms) during normal flight, or wing-waggle 2 <-> 3 when tapped
    const cessnaFrameTimer = this.time.addEvent({
      delay: 83,
      loop: true,
      callback: () => {
        if (!cessnaSprite.scene) {
          cessnaFrameTimer.remove(false);
          return;
        }
        propToggle = !propToggle;
        if (isCessnaWaggling) {
          cessnaSprite.setFrame(propToggle ? 3 : 2);
        } else {
          cessnaSprite.setFrame(propToggle ? 1 : 0);
        }
      }
    });

    const startCessnaPass = () => {
      if (!this.scene.isActive() || !cessnaSprite.scene) return;
      cessnaSprite.setPosition(cessnaStartX, cessnaBaseY);
      cessnaSprite.setAlpha(1);
      this.tweens.add({
        targets: cessnaSprite,
        x: cessnaEndX,
        duration: 11000,
        ease: 'Linear',
        onComplete: () => {
          if (!this.scene.isActive() || !cessnaSprite.scene) return;
          this.time.delayedCall(2500, () => {
            if (this.scene.isActive() && cessnaSprite.scene) {
              startCessnaPass();
            }
          });
        }
      });
    };
    startCessnaPass();

    // Interactive zone following or covering the sky flight corridor (`x: 340..760, y: 145..215`)
    const cessnaSkyZone = this.add
      .zone(550, 178, 420, 72)
      .setOrigin(0.5, 0.5)
      .setDepth(13)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(cessnaSkyZone);

    cessnaSkyZone.on('pointerdown', () => {
      if (isCessnaWaggling || !cessnaSprite.scene) return;
      isCessnaWaggling = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p4_cessna_prop.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p5:p4-cessna');

      // Gentle sine bob (y: +-6px)
      this.tweens.add({
        targets: cessnaSprite,
        y: cessnaBaseY - 6,
        duration: 180,
        yoyo: true,
        repeat: 3,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (cessnaSprite.scene) cessnaSprite.setY(cessnaBaseY);
          isCessnaWaggling = false;
        }
      });

      // Puff 3 tiny white pixel cloud dots behind its tail!
      for (let p = 0; p < 3; p++) {
        this.time.delayedCall(p * 170, () => {
          if (!this.scene.isActive() || !cessnaSprite.scene) return;
          const puff = this.add.graphics();
          puff.fillStyle(0xffffff, 0.92);
          puff.fillRect(-3, -3, 6, 6);
          puff.fillStyle(0xe0f2fe, 0.85);
          puff.fillRect(-2, -2, 4, 4);
          const px = cessnaSprite.x + 22 + p * 6;
          const py = cessnaSprite.y + Phaser.Math.Between(-3, 3);
          puff.setPosition(px, py);
          puff.setDepth(9);
          this.stageContainer.add(puff);
          this.stageContainer.sort('depth');

          this.tweens.add({
            targets: puff,
            x: px + 18,
            y: py - 6,
            scaleX: { from: 0.8, to: 1.5 },
            scaleY: { from: 0.8, to: 1.5 },
            alpha: { from: 0.92, to: 0 },
            duration: 680,
            ease: 'Quad.easeOut',
            onComplete: () => puff.destroy()
          });
        });
      }
    });

    // =========================================================================
    // 2. Distant Colorado Bighorn Sheep on Right Cliff Ledge (`p4_bighorn.png`)
    // =========================================================================
    const bighornBaseX = 785;
    const bighornBaseY = 245;
    const bighornScale = 44 / 359; // ~44px tall (~0.123)
    const bighornSprite = this.add
      .sprite(bighornBaseX, bighornBaseY, 'p4_bighorn', 0)
      .setOrigin(0.5, 1.0)
      .setScale(bighornScale)
      .setDepth(14);
    this.stageContainer.add(bighornSprite);

    const bighornZone = this.add
      .zone(bighornBaseX, bighornBaseY - 24, 84, 84)
      .setOrigin(0.5, 0.5)
      .setDepth(15)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(bighornZone);

    let isBighornBusy = false;
    bighornZone.on('pointerdown', () => {
      if (isBighornBusy) return;
      isBighornBusy = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p4_bighorn_leap.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p5:p4-bighorn');
      Juice.burstStars(this, bighornBaseX, bighornBaseY - 26, 10, [0xfde047, 0xfbbf24, 0xffffff]);

      // Animate frames 0 -> 1 -> 2 -> 3 -> 0 (at 6 fps, ~166ms/step) with a nimble 14px upward hop along the rock ledge
      const seq = [0, 1, 2, 3, 0];
      const stepMs = 166;
      this.tweens.add({
        targets: bighornSprite,
        y: bighornBaseY - 14,
        duration: 330,
        yoyo: true,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (bighornSprite.scene) bighornSprite.setY(bighornBaseY);
        }
      });

      seq.forEach((frameIdx, idx) => {
        this.time.delayedCall(idx * stepMs, () => {
          if (!bighornSprite.scene) return;
          bighornSprite.setFrame(frameIdx);
          if (idx === seq.length - 1) {
            bighornSprite.setPosition(bighornBaseX, bighornBaseY);
            bighornSprite.setScale(bighornScale);
            isBighornBusy = false;
          }
        });
      });
    });

    // =========================================================================
    // 3. Mid-River Sparky Floating in Striped Inner Tube (`p4_sparky_tube.png`)
    // =========================================================================
    const sparkyBaseX = 745;
    const sparkyBaseY = 505;
    const sparkyScale = 84 / 260; // ~84px wide (~0.323)
    const sparkySprite = this.add
      .sprite(sparkyBaseX, sparkyBaseY, 'p4_sparky_tube', 0)
      .setOrigin(0.5, 1.0)
      .setScale(sparkyScale)
      .setDepth(16);
    this.stageContainer.add(sparkySprite);

    let isSparkyBusy = false;
    // Ambient Bob: Gently bobs on the river current (`y: 505 <-> 510, x: 745 <-> 755`, 2200ms yoyo) alternating frames 0 <-> 1
    const sparkyBobTween = this.tweens.add({
      targets: sparkySprite,
      x: { from: 745, to: 755 },
      y: { from: 505, to: 510 },
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const sparkyIdleTimer = this.time.addEvent({
      delay: 1100,
      loop: true,
      callback: () => {
        if (!sparkySprite.scene) {
          sparkyIdleTimer.remove(false);
          return;
        }
        if (!isSparkyBusy) {
          sparkySprite.setFrame(sparkySprite.frame.name === '0' ? 1 : 0);
        }
      }
    });

    const sparkyZone = this.add
      .zone(sparkyBaseX + 5, sparkyBaseY - 34, 110, 92)
      .setOrigin(0.5, 0.5)
      .setDepth(17)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(sparkyZone);

    sparkyZone.on('pointerdown', () => {
      if (isSparkyBusy) return;
      isSparkyBusy = true;
      sparkyBobTween.pause();

      // Play `p4_sparky_splash.mp3` + `p4_water_splash.mp3` (at volume: 0.4)
      this.playColoradoSfx('/assets/audio/colorado/sfx/p4_sparky_splash.mp3');
      this.playColoradoSfx('/assets/audio/colorado/sfx/p4_water_splash.mp3', 0.4);
      ArcadeState.markHotspotDiscovered('colorado:p5:p4-sparky-tube');
      Juice.burstStars(this, sparkySprite.x, sparkySprite.y - 42, 12, [0x38bdf8, 0x34d399, 0xfde047, 0xffffff]);

      // Spawn white/cyan pixel water droplets around his inner tube
      for (let d = 0; d < 10; d++) {
        const drop = this.add.graphics();
        drop.fillStyle(d % 2 === 0 ? 0xffffff : 0x7dd3fc, 0.95);
        drop.fillRect(-2, -2, 4, 4);
        const startX = sparkySprite.x + Phaser.Math.Between(-34, 34);
        const startY = sparkySprite.y - 10;
        drop.setPosition(startX, startY);
        drop.setDepth(17);
        this.stageContainer.add(drop);
        this.stageContainer.sort('depth');

        const arcX = startX + Phaser.Math.Between(-28, 28);
        const peakY = startY - Phaser.Math.Between(18, 38);
        this.tweens.add({
          targets: drop,
          x: arcX,
          y: { from: startY, to: peakY },
          duration: 280,
          yoyo: true,
          ease: 'Quad.easeOut',
          onComplete: () => drop.destroy()
        });
      }

      // Cycle frames 0 -> 1 -> 2 -> 3 -> 2 -> 0 (at 5 fps, 200ms/step)
      const seq = [0, 1, 2, 3, 2, 0];
      const stepMs = 200;
      seq.forEach((frameIdx, idx) => {
        this.time.delayedCall(idx * stepMs, () => {
          if (!sparkySprite.scene) return;
          sparkySprite.setFrame(frameIdx);
          if (idx === seq.length - 1) {
            sparkyBobTween.resume();
            isSparkyBusy = false;
          }
        });
      });
    });

    // =========================================================================
    // 4. Doggie in Aviator Sunglasses & Fishing Hat on Right Riverbank Boulder (`p4_doggie_fisherman.png`)
    // =========================================================================
    const doggieBaseX = 1135;
    const doggieBaseY = 590;
    const doggieScale = 96 / 227; // ~96px tall (~0.423)
    const doggieSprite = this.add
      .sprite(doggieBaseX, doggieBaseY, 'p4_doggie_fisherman', 0)
      .setOrigin(0.5, 1.0)
      .setScale(doggieScale)
      .setFlipX(true) // Faces LEFT toward the South Platte River!
      .setDepth(22);
    this.stageContainer.add(doggieSprite);

    const doggieIdleTween = this.tweens.add({
      targets: doggieSprite,
      scaleY: { from: doggieScale, to: doggieScale * 1.025 },
      duration: 1150,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const doggieZone = this.add
      .zone(doggieBaseX, doggieBaseY - 48, 118, 108)
      .setOrigin(0.5, 0.5)
      .setDepth(23)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(doggieZone);

    let isDoggieBusy = false;
    doggieZone.on('pointerdown', () => {
      if (isDoggieBusy) return;
      isDoggieBusy = true;
      doggieIdleTween.pause();

      // Play `p4_doggie_reel.mp3` + `p4_doggie_bark.mp3` (400ms delay)
      this.playColoradoSfx('/assets/audio/colorado/sfx/p4_doggie_reel.mp3');
      this.time.delayedCall(400, () => {
        if (this.scene.isActive() && doggieSprite.scene) {
          this.playColoradoSfx('/assets/audio/colorado/sfx/p4_doggie_bark.mp3');
        }
      });

      ArcadeState.markHotspotDiscovered('colorado:p5:p4-doggie-fisherman');
      Juice.burstStars(this, doggieBaseX - 24, doggieBaseY - 64, 14, [0xfde047, 0xfbbf24, 0x38bdf8, 0xffffff]);

      // Animate frames 0 -> 1 -> 2 -> 3 -> 2 -> 0 (at 6 fps, ~166ms/step) with a lively hop as he reels in his golden star-fish!
      const seq = [0, 1, 2, 3, 2, 0];
      const stepMs = 166;
      seq.forEach((frameIdx, idx) => {
        this.time.delayedCall(idx * stepMs, () => {
          if (!doggieSprite.scene) return;
          doggieSprite.setFrame(frameIdx);
          if (frameIdx === 2) {
            this.tweens.add({
              targets: doggieSprite,
              y: doggieBaseY - 12,
              duration: 80,
              yoyo: true,
              ease: 'Quad.easeOut',
              onComplete: () => {
                if (doggieSprite.scene) doggieSprite.setY(doggieBaseY);
              }
            });
          }
          if (idx === seq.length - 1) {
            doggieSprite.setPosition(doggieBaseX, doggieBaseY);
            doggieSprite.setScale(doggieScale);
            doggieIdleTween.resume();
            isDoggieBusy = false;
          }
        });
      });
    });

    // =========================================================================
    // 5. Close-Up Blue River Dragonfly by Left Foreground Wildflowers (`p4_dragonfly.png`)
    // =========================================================================
    const dfBaseX = 195;
    const dfBaseY = 615;
    const dfScale = 68 / 213; // ~68px wide (~0.319)
    const dfSprite = this.add
      .sprite(dfBaseX, dfBaseY, 'p4_dragonfly', 0)
      .setOrigin(0.5, 0.5)
      .setScale(dfScale)
      .setDepth(25);
    this.stageContainer.add(dfSprite);

    let isDfZipping = false;
    let dfFlutterToggle = false;
    // Ambient Hover: Rapidly flutters frames 0 <-> 1 at 10 fps (100ms) while hovering in a small figure-eight over the flowers
    const dfFlutterTimer = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (!dfSprite.scene) {
          dfFlutterTimer.remove(false);
          return;
        }
        dfFlutterToggle = !dfFlutterToggle;
        if (!isDfZipping) {
          dfSprite.setFrame(dfFlutterToggle ? 1 : 0);
        }
      }
    });

    let dfHoverPhase = 0;
    const dfHoverTimer = this.time.addEvent({
      delay: 45,
      loop: true,
      callback: () => {
        if (!dfSprite.scene) {
          dfHoverTimer.remove(false);
          return;
        }
        if (!isDfZipping) {
          dfHoverPhase += 0.11;
          dfSprite.x = dfBaseX + Math.sin(dfHoverPhase) * 14;
          dfSprite.y = dfBaseY + Math.sin(dfHoverPhase * 2) * 6;
        }
      }
    });

    const dfZone = this.add
      .zone(dfBaseX, dfBaseY, 108, 96)
      .setOrigin(0.5, 0.5)
      .setDepth(26)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(dfZone);

    dfZone.on('pointerdown', () => {
      if (isDfZipping) return;
      isDfZipping = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p4_dragonfly_zip.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p5:p4-dragonfly');
      Juice.burstStars(this, dfSprite.x, dfSprite.y, 12, [0x38bdf8, 0x34d399, 0xfde047, 0xffffff]);

      dfSprite.setFrame(2);

      // Cyan pixel sparkle trail spawner while darting
      const trailTimer = this.time.addEvent({
        delay: 55,
        repeat: 18,
        callback: () => {
          if (!this.scene.isActive() || !dfSprite.scene) return;
          const sp = this.add.graphics();
          sp.fillStyle(0x7dd3fc, 0.92);
          sp.fillRect(-2, -2, 4, 4);
          sp.setPosition(dfSprite.x + Phaser.Math.Between(-8, 8), dfSprite.y + Phaser.Math.Between(-6, 6));
          sp.setDepth(24);
          this.stageContainer.add(sp);
          this.stageContainer.sort('depth');

          this.tweens.add({
            targets: sp,
            y: sp.y + 10,
            alpha: 0,
            duration: 360,
            onComplete: () => sp.destroy()
          });
        }
      });

      // Dart playfully across the foreground riverbank: (195, 615) -> (340, 560) -> (145, 540) -> (195, 615)
      this.tweens.add({
        targets: dfSprite,
        x: 340,
        y: 560,
        duration: 340,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (!dfSprite.scene) return;
          dfSprite.setFrame(3);
          dfSprite.setFlipX(true);
          this.tweens.add({
            targets: dfSprite,
            x: 145,
            y: 540,
            duration: 380,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              if (!dfSprite.scene) return;
              dfSprite.setFlipX(false);
              dfSprite.setFrame(2);
              this.tweens.add({
                targets: dfSprite,
                x: dfBaseX,
                y: dfBaseY,
                duration: 340,
                ease: 'Back.easeOut',
                onComplete: () => {
                  trailTimer.remove(false);
                  if (!dfSprite.scene) return;
                  dfHoverPhase = 0;
                  dfSprite.setFrame(0);
                  isDfZipping = false;
                }
              });
            }
          });
        }
      });
    });

    // =========================================================================
    // 6. Tasteful River Water Shimmer & Interactive Foot-Splash Ripples
    // =========================================================================
    // 6a. Ambient River Shimmer: 18 small crisp pixel-art water glint bars (4x2 and 8x2 white/ice-blue rectangles)
    //     strictly inside the open blue river channel (`x: 685..980, y: 515..685`) to the right of Emma and the rocks
    const glintCoords = [
      { x: 690, y: 520, w: 4 },
      { x: 735, y: 530, w: 8 },
      { x: 780, y: 522, w: 4 },
      { x: 825, y: 538, w: 8 },
      { x: 870, y: 528, w: 4 },
      { x: 915, y: 545, w: 8 },
      { x: 705, y: 560, w: 4 },
      { x: 755, y: 572, w: 8 },
      { x: 805, y: 565, w: 4 },
      { x: 855, y: 580, w: 8 },
      { x: 905, y: 570, w: 4 },
      { x: 945, y: 588, w: 8 },
      { x: 715, y: 615, w: 8 },
      { x: 765, y: 632, w: 4 },
      { x: 815, y: 622, w: 8 },
      { x: 865, y: 642, w: 4 },
      { x: 910, y: 630, w: 8 },
      { x: 952, y: 655, w: 4 }
    ];

    glintCoords.forEach((gc, idx) => {
      const glint = this.add.graphics();
      glint.fillStyle(idx % 2 === 0 ? 0xffffff : 0xe0f2fe, 1);
      glint.fillRect(0, 0, gc.w, 2);
      glint.setPosition(gc.x, gc.y);
      glint.setAlpha(0);
      glint.setDepth(14);
      this.stageContainer.add(glint);

      const cycleDuration = 1800 + (idx % 6) * 260;
      this.tweens.add({
        targets: glint,
        x: gc.x + 12,
        y: gc.y + 4,
        alpha: { from: 0, to: 0.75 },
        delay: idx * 145,
        duration: cycleDuration / 2,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });

    // 6b. Interactive Foot-Splash Zone (Wyatt's blue water shoes & Emma's splashing feet `x: 310..560, y: 560..695`)
    const kidsSplashZone = this.add
      .zone(435, 628, 250, 135)
      .setOrigin(0.5, 0.5)
      .setDepth(21)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(kidsSplashZone);

    let isKidsSplashBusy = false;
    kidsSplashZone.on('pointerdown', () => {
      if (isKidsSplashBusy) return;
      isKidsSplashBusy = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p4_water_splash.mp3');
      this.playColoradoSfx('/assets/audio/colorado/sfx/p4_kids_giggle_splash.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p5:p4-kids-splash');

      // Spawn 3 expanding pixel-art concentric water ripple ovals around (375, 665) and (485, 625)
      const rippleCenters = [
        { x: 375, y: 665 },
        { x: 485, y: 625 }
      ];
      rippleCenters.forEach((rc) => {
        for (let rIdx = 0; rIdx < 3; rIdx++) {
          this.time.delayedCall(rIdx * 150, () => {
            if (!this.scene.isActive()) return;
            const ring = this.add.graphics();
            ring.lineStyle(2, rIdx % 2 === 0 ? 0xffffff : 0xbae6fd, 0.92);
            ring.strokeEllipse(0, 0, 36, 12);
            ring.setPosition(rc.x, rc.y);
            ring.setDepth(20);
            this.stageContainer.add(ring);
            this.stageContainer.sort('depth');

            this.tweens.add({
              targets: ring,
              scaleX: { from: 0.65, to: 2.35 },
              scaleY: { from: 0.65, to: 2.15 },
              alpha: { from: 0.92, to: 0 },
              duration: 760,
              ease: 'Cubic.easeOut',
              onComplete: () => ring.destroy()
            });
          });
        }
      });

      // Launch 12 bright white/sky-blue pixel water droplets upward in a playful splash arc!
      for (let i = 0; i < 12; i++) {
        const droplet = this.add.graphics();
        droplet.fillStyle(i % 2 === 0 ? 0xffffff : 0x7dd3fc, 0.96);
        droplet.fillRect(-2, -2, 4, 4);
        const baseCenter = i < 6 ? rippleCenters[0] : rippleCenters[1];
        const sx = baseCenter.x + Phaser.Math.Between(-28, 28);
        const sy = baseCenter.y - 6;
        droplet.setPosition(sx, sy);
        droplet.setDepth(22);
        this.stageContainer.add(droplet);
        this.stageContainer.sort('depth');

        const tx = sx + Phaser.Math.Between(-42, 42);
        const peakY = sy - Phaser.Math.Between(32, 68);
        this.tweens.add({
          targets: droplet,
          x: tx,
          y: peakY,
          duration: 310,
          ease: 'Quad.easeOut',
          onComplete: () => {
            if (!droplet.scene) return;
            this.tweens.add({
              targets: droplet,
              y: sy + 6,
              alpha: 0,
              duration: 290,
              ease: 'Quad.easeIn',
              onComplete: () => droplet.destroy()
            });
          }
        });
      }

      this.time.delayedCall(900, () => {
        isKidsSplashBusy = false;
      });
    });

    // 6c. Interactive Grandparents Zone (`x: 140..490, y: 185..580`):
    // Tapping Grandpa & Babci plays the real recorded `p2_grandparents_hug.mp3` clip and floats warm pixel hearts above them!
    const grandparentsZone = this.add
      .zone(315, 382, 350, 395)
      .setOrigin(0.5, 0.5)
      .setDepth(19)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(grandparentsZone);

    let isGpHugBusy = false;
    grandparentsZone.on('pointerdown', () => {
      if (isGpHugBusy) return;
      isGpHugBusy = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p2_grandparents_hug.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p5:p4-grandparents-hug');
      Juice.burstStars(this, 365, 255, 14, [0xf43f5e, 0xf472b6, 0xfde047, 0xffffff]);

      const heartColors = [0xf43f5e, 0xf472b6, 0xfde047, 0xfb7185];
      for (let h = 0; h < 6; h++) {
        this.time.delayedCall(h * 140, () => {
          if (!this.scene.isActive()) return;
          const hx = 315 + (h - 2.5) * 28;
          const hy = 250 + (h % 2) * 14;
          const heart = this.add.graphics();
          heart.fillStyle(heartColors[h % heartColors.length], 0.95);
          // Crisp 2D pixel heart
          heart.fillRect(-6, -4, 4, 4);
          heart.fillRect(2, -4, 4, 4);
          heart.fillRect(-8, -2, 16, 4);
          heart.fillRect(-6, 2, 12, 3);
          heart.fillRect(-3, 5, 6, 3);
          heart.fillRect(-1, 8, 2, 2);
          heart.setPosition(hx, hy);
          heart.setDepth(23);
          this.stageContainer.add(heart);
          this.stageContainer.sort('depth');

          this.tweens.add({
            targets: heart,
            y: hy - 55,
            x: hx + (h % 2 === 0 ? -10 : 10),
            alpha: { from: 1, to: 0 },
            duration: 850,
            ease: 'Sine.easeOut',
            onComplete: () => heart.destroy()
          });
        });
      }

      this.time.delayedCall(1200, () => {
        isGpHugBusy = false;
      });
    });

    // Sort stageContainer children by their exact `.setDepth(...)` values
    this.stageContainer.sort('depth');
  }

  /**
   * Book 2 — Page 5 ("Across the Royal Gorge Bridge") Clean-Plate Living Books Scene:
   * Mounts the diagonal cable-locked Red Aerial Gondola with Sparky (`p5_gondola_sparky.png`)
   * in the upper sky corridor (`x: 760 <-> 485`), the Steel Bridge Cables Foreground Mask
   * (`p5_bridge_cables_mask.png`) at `(0, 180)` (`depth: 18`), the 3 bridge tower flags (`p5_tower_flags.png`),
   * Doggie with binoculars standing on the slanted steel bridge handrail (`p5_railing_doggie.png`),
   * the Golden Eagle soaring in the left canyon chasm (`p5_canyon_eagle.png`), the tiny perspective-scaled
   * yellow raft on the turquoise Arkansas River (`p5_tiny_raft.png`) with 8 river glints, and the family zone.
   */
  private mountPage5LivingScene(): void {
    const requiredSpritesheets: { key: string; url: string; frameWidth: number; frameHeight: number }[] = [
      { key: 'p5_gondola_sparky', url: '/assets/stories/colorado/sprites/p5/p5_gondola_sparky.png?v=p5v1', frameWidth: 221, frameHeight: 377 },
      { key: 'p5_tower_flags', url: '/assets/stories/colorado/sprites/p5/p5_tower_flags.png?v=p5v1', frameWidth: 214, frameHeight: 136 },
      { key: 'p5_railing_doggie', url: '/assets/stories/colorado/sprites/p5/p5_railing_doggie.png?v=p5v1', frameWidth: 175, frameHeight: 247 },
      { key: 'p5_canyon_eagle', url: '/assets/stories/colorado/sprites/p5/p5_canyon_eagle.png?v=p5v1', frameWidth: 300, frameHeight: 204 },
      { key: 'p5_tiny_raft', url: '/assets/stories/colorado/sprites/p5/p5_tiny_raft.png?v=p5v1', frameWidth: 156, frameHeight: 154 }
    ];
    const requiredImages: { key: string; url: string }[] = [
      { key: 'p5_bridge_cables_mask', url: '/assets/stories/colorado/sprites/p5/p5_bridge_cables_mask.png?v=p5v2' }
    ];

    let needsRuntimeLoad = false;
    for (const ss of requiredSpritesheets) {
      if (!this.textures.exists(ss.key)) {
        this.load.spritesheet(ss.key, ss.url, { frameWidth: ss.frameWidth, frameHeight: ss.frameHeight });
        needsRuntimeLoad = true;
      }
    }
    for (const img of requiredImages) {
      if (!this.textures.exists(img.key)) {
        this.load.image(img.key, img.url);
        needsRuntimeLoad = true;
      }
    }
    if (needsRuntimeLoad) {
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        const activeBg = COLORADO_PAGES[this.currentPageIndex]?.bgKey;
        if (this.scene.isActive() && (activeBg === 'colorado-p5-clean' || activeBg === 'colorado-p5')) {
          this.mountPage5LivingScene();
        }
      });
      this.load.start();
      return;
    }

    // Apply crisp NEAREST pixel-art filtering to all Page 5 textures
    [...requiredSpritesheets, ...requiredImages].forEach((t) => {
      if (this.textures.exists(t.key)) {
        this.textures.get(t.key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    });

    // Loop `p5_ambient_gorge_wind.mp3` (0.42) and `p5_gondola_cable_loop.mp3` (0.16) simultaneously while on Page 5
    this.startPage5AmbientAudio();

    // Foreground Steel Bridge Cables Mask (`p5_bridge_cables_mask.png`) at (0, 180), origin(0, 0), depth 18
    // so the eagle (`depth: 12`) and river raft (`depth: 11`) always pass cleanly behind the bridge's steel cables!
    const bridgeCablesMaskImg = this.add
      .image(0, 180, 'p5_bridge_cables_mask')
      .setOrigin(0, 0)
      .setDepth(18);
    this.stageContainer.add(bridgeCablesMaskImg);

    // =========================================================================
    // 1. Red Aerial Gondola with Sparky Riding & Locking onto the Cable (`p5_gondola_sparky.png`)
    // =========================================================================
    const gondolaStartX = 760;
    const gondolaEndX = 485;
    const calcCableY = (x: number) => 294 - 0.3203 * x;
    const calcGondolaScale = (x: number) => {
      // Smoothly interpolate height from 132px at x = 760 up to 152px at x = 485
      const t = Phaser.Math.Clamp((gondolaStartX - x) / (gondolaStartX - gondolaEndX), 0, 1);
      const targetHeightPx = Phaser.Math.Linear(132, 152, t);
      return targetHeightPx / 369;
    };

    const gondolaSprite = this.add
      .sprite(gondolaStartX, calcCableY(gondolaStartX), 'p5_gondola_sparky', 0)
      .setOrigin(0.5, 0.05) // Pulley wheel groove at the top of the hanger arm sits directly on y_cable(x)
      .setScale(calcGondolaScale(gondolaStartX))
      .setDepth(10);
    this.stageContainer.add(gondolaSprite);

    // Interactive zone that tracks the gondola along the upper sky cable corridor (x: 485..760)
    const gondolaHitZone = this.add
      .zone(gondolaStartX, calcCableY(gondolaStartX) + 72, 124, 158)
      .setOrigin(0.5, 0.5)
      .setDepth(13)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(gondolaHitZone);

    // Continuous Diagonal Cable Glide + Perspective Scaling (8,500ms Sine.easeInOut yoyo)
    const gondolaProgress = { x: gondolaStartX };
    this.tweens.add({
      targets: gondolaProgress,
      x: gondolaEndX,
      duration: 8500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      onUpdate: () => {
        if (!gondolaSprite.scene) return;
        const gx = gondolaProgress.x;
        const gy = calcCableY(gx);
        const gs = calcGondolaScale(gx);
        gondolaSprite.setPosition(gx, gy);
        gondolaSprite.setScale(gs);
        if (gondolaHitZone.scene) {
          gondolaHitZone.setPosition(gx, gy + 72 * (gs / 0.38));
        }
      }
    });

    let isGondolaCheering = false;
    let gondolaWheelToggle = false;
    // Alternate frames 0 <-> 1 at 4 fps (250ms) so pulley wheels spin and Sparky waves his golden ticket
    const gondolaIdleTimer = this.time.addEvent({
      delay: 250,
      loop: true,
      callback: () => {
        if (!gondolaSprite.scene) {
          gondolaIdleTimer.remove(false);
          return;
        }
        gondolaWheelToggle = !gondolaWheelToggle;
        if (!isGondolaCheering) {
          gondolaSprite.setFrame(gondolaWheelToggle ? 1 : 0);
        }
      }
    });

    gondolaHitZone.on('pointerdown', () => {
      if (isGondolaCheering || !gondolaSprite.scene) return;
      isGondolaCheering = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p5_gondola_bell.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p6:p5-gondola-sparky');
      Juice.burstStars(this, gondolaSprite.x, gondolaSprite.y + 74, 16, [0xfde047, 0xef4444, 0xfbbf24, 0xffffff]);

      // Rock the gondola angle: -4deg <-> +4deg
      this.tweens.add({
        targets: gondolaSprite,
        angle: { from: -4, to: 4 },
        duration: 210,
        yoyo: true,
        repeat: 3,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (gondolaSprite.scene) gondolaSprite.setAngle(0);
        }
      });

      // Switch to frames 2 -> 3 -> 2 -> 3 -> 2 while Sparky cheers out the window with golden sparkles
      const cheerSeq = [2, 3, 2, 3, 2];
      const stepMs = 220;
      cheerSeq.forEach((fIdx, idx) => {
        this.time.delayedCall(idx * stepMs, () => {
          if (!gondolaSprite.scene) return;
          gondolaSprite.setFrame(fIdx);
          if (idx === cheerSeq.length - 1) {
            isGondolaCheering = false;
          }
        });
      });
    });

    // =========================================================================
    // 2. Three Bridge Tower Flags (`p5_tower_flags.png`)
    // =========================================================================
    const flagsBaseX = 1118;
    const flagsBaseY = 82;
    const flagsScale = 155 / 206; // ~155px wide covering the 3 static flags atop the right bridge tower
    const flagsSprite = this.add
      .sprite(flagsBaseX, flagsBaseY, 'p5_tower_flags', 0)
      .setOrigin(0.5, 0.5)
      .setScale(flagsScale)
      .setDepth(14);
    this.stageContainer.add(flagsSprite);

    let isFlagsGusting = false;
    let flagFrameIdx = 0;
    let flagAccumMs = 0;
    // Continuous wind loop at 7 fps (~142ms), speeding up to 14 fps (~71ms) for 1.8s when tapped
    const flagsWaveTimer = this.time.addEvent({
      delay: 35,
      loop: true,
      callback: () => {
        if (!flagsSprite.scene) {
          flagsWaveTimer.remove(false);
          return;
        }
        flagAccumMs += 35;
        const frameThreshold = isFlagsGusting ? 70 : 140;
        if (flagAccumMs >= frameThreshold) {
          flagAccumMs = 0;
          flagFrameIdx = (flagFrameIdx + 1) % 4;
          flagsSprite.setFrame(flagFrameIdx);
        }
      }
    });

    const flagsZone = this.add
      .zone(flagsBaseX, flagsBaseY, 165, 110)
      .setOrigin(0.5, 0.5)
      .setDepth(15)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(flagsZone);

    flagsZone.on('pointerdown', () => {
      if (isFlagsGusting || !flagsSprite.scene) return;
      isFlagsGusting = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p5_flags_flutter.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p6:p5-tower-flags');
      Juice.burstStars(this, flagsBaseX, flagsBaseY, 12, [0xffffff, 0xef4444, 0xfde047, 0x38bdf8]);

      // Spawn crisp white wind-swirl streaks streaming across the 3 flags
      for (let w = 0; w < 6; w++) {
        this.time.delayedCall(w * 160, () => {
          if (!this.scene.isActive() || !flagsSprite.scene) return;
          const streak = this.add.graphics();
          streak.fillStyle(0xffffff, 0.88);
          streak.fillRect(0, 0, 22, 2);
          streak.fillStyle(0xe0f2fe, 0.78);
          streak.fillRect(6, 3, 14, 2);
          const sx = flagsBaseX - 60 + (w % 2) * 18;
          const sy = flagsBaseY - 26 + (w % 3) * 22;
          streak.setPosition(sx, sy);
          streak.setDepth(15);
          this.stageContainer.add(streak);
          this.stageContainer.sort('depth');

          this.tweens.add({
            targets: streak,
            x: sx + 95,
            y: sy - 5,
            alpha: { from: 0.9, to: 0 },
            duration: 460,
            ease: 'Quad.easeOut',
            onComplete: () => streak.destroy()
          });
        });
      }

      this.time.delayedCall(1800, () => {
        isFlagsGusting = false;
      });
    });

    // =========================================================================
    // 3. Doggie with Binoculars on the Slanted Steel Bridge Handrail (`p5_railing_doggie.png`)
    // =========================================================================
    const doggieBaseX = 652;
    const doggieBaseY = 576;
    const doggieScale = 78 / 239; // ~78px tall (~0.326) standing squarely on the flat slanted steel handrail
    const doggieSprite = this.add
      .sprite(doggieBaseX, doggieBaseY, 'p5_railing_doggie', 0)
      .setOrigin(0.5, 1.0)
      .setScale(doggieScale)
      .setDepth(22);
    this.stageContainer.add(doggieSprite);

    let isDoggieBusy = false;
    // Idles on Frame 0, gently alternating to Frame 1 every 2.2s as he scans the gorge with his binoculars
    const doggieScanTimer = this.time.addEvent({
      delay: 2200,
      loop: true,
      callback: () => {
        if (!doggieSprite.scene) {
          doggieScanTimer.remove(false);
          return;
        }
        if (!isDoggieBusy) {
          doggieSprite.setFrame(doggieSprite.frame.name === '0' ? 1 : 0);
        }
      }
    });

    const doggieZone = this.add
      .zone(doggieBaseX, doggieBaseY - 40, 96, 96)
      .setOrigin(0.5, 0.5)
      .setDepth(23)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(doggieZone);

    doggieZone.on('pointerdown', () => {
      if (isDoggieBusy || !doggieSprite.scene) return;
      isDoggieBusy = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p5_doggie_yip.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p6:p5-railing-doggie');
      Juice.burstStars(this, doggieBaseX, doggieBaseY - 54, 12, [0xfde047, 0x38bdf8, 0xfbbf24, 0xffffff]);

      // Cheerful 12px upward hop on the handrail
      this.tweens.add({
        targets: doggieSprite,
        y: doggieBaseY - 12,
        duration: 180,
        yoyo: true,
        repeat: 1,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (doggieSprite.scene) doggieSprite.setY(doggieBaseY);
        }
      });

      // Animate 0 -> 1 -> 2 -> 3 -> 2 -> 0 at 6 fps (~166ms/step)
      const seq = [0, 1, 2, 3, 2, 0];
      const stepMs = 166;
      seq.forEach((fIdx, idx) => {
        this.time.delayedCall(idx * stepMs, () => {
          if (!doggieSprite.scene) return;
          doggieSprite.setFrame(fIdx);
          if (idx === seq.length - 1) {
            doggieSprite.setPosition(doggieBaseX, doggieBaseY);
            doggieSprite.setScale(doggieScale);
            isDoggieBusy = false;
          }
        });
      });
    });

    // =========================================================================
    // 4. Golden Eagle Soaring in Bottom-Left Canyon Chasm (`p5_canyon_eagle.png`)
    // =========================================================================
    const eagleStartX = 105;
    const eagleStartY = 485;
    const eagleMinX = 85;
    const eagleMinY = 430;
    const eagleMaxX = 275;
    const eagleMaxY = 555;
    const eagleScale = 72 / 292; // ~72px wide (~0.2466)
    const eagleSprite = this.add
      .sprite(eagleStartX, eagleStartY, 'p5_canyon_eagle', 0)
      .setOrigin(0.5, 0.5)
      .setScale(eagleScale)
      .setDepth(22); // Above `p5_bridge_cables_mask` (`depth: 18`) so zero cliff rock pixels clip it
    this.stageContainer.add(eagleSprite);

    const eagleZone = this.add
      .zone(eagleStartX, eagleStartY, 118, 96)
      .setOrigin(0.5, 0.5)
      .setDepth(23)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(eagleZone);

    let eagleFrameIdx = 0;
    // Continuously loops frames 0 -> 1 -> 2 -> 3 at 5 fps (200ms)
    const eagleFlapTimer = this.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => {
        if (!eagleSprite.scene) {
          eagleFlapTimer.remove(false);
          return;
        }
        eagleFrameIdx = (eagleFrameIdx + 1) % 4;
        eagleSprite.setFrame(eagleFrameIdx);
      }
    });

    let isEagleSwooping = false;
    // Glides in a smooth figure-eight thermal in the bottom 50% and left 25% of the image
    // between (85, 430) and (275, 555), starting at (105, 485) (6,000ms yoyo)
    const eagleGlideState = { t: 0.1 };
    const eagleGlideTween = this.tweens.add({
      targets: eagleGlideState,
      t: 1,
      duration: 6000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        if (!eagleSprite.scene || isEagleSwooping) return;
        const u = eagleGlideState.t;
        const ex = Phaser.Math.Linear(eagleMinX, eagleMaxX, u);
        const ey = Phaser.Math.Linear(eagleMinY, eagleMaxY, u) + Math.sin(u * Math.PI * 2) * 14;
        eagleSprite.setPosition(ex, ey);
        if (eagleZone.scene) {
          eagleZone.setPosition(ex, ey);
        }
      }
    });

    eagleZone.on('pointerdown', () => {
      if (isEagleSwooping || !eagleSprite.scene) return;
      isEagleSwooping = true;
      eagleGlideTween.pause();

      this.playColoradoSfx('/assets/audio/colorado/sfx/p5_eagle_call.mp3');
      this.playColoradoSfx('/assets/audio/colorado/sfx/p5_eagle_wings.mp3', 0.72);
      ArcadeState.markHotspotDiscovered('colorado:p6:p5-canyon-eagle');
      Juice.burstStars(this, eagleSprite.x, eagleSprite.y, 12, [0xfef08a, 0xfde047, 0x38bdf8, 0xffffff]);

      const startX = eagleSprite.x;
      const startY = eagleSprite.y;

      // White wind-trail particles streaming behind the eagle during its swoop
      const windTimer = this.time.addEvent({
        delay: 75,
        repeat: 13,
        callback: () => {
          if (!this.scene.isActive() || !eagleSprite.scene) return;
          const trail = this.add.graphics();
          trail.fillStyle(0xffffff, 0.88);
          trail.fillRect(-5, -1, 10, 2);
          trail.setPosition(eagleSprite.x + Phaser.Math.Between(-14, 14), eagleSprite.y + Phaser.Math.Between(-7, 7));
          trail.setDepth(21);
          this.stageContainer.add(trail);
          this.stageContainer.sort('depth');

          this.tweens.add({
            targets: trail,
            x: trail.x - 18,
            alpha: 0,
            duration: 380,
            onComplete: () => trail.destroy()
          });
        }
      });

      // Swoop in a graceful arc within the bottom-left gorge chasm (x: 80..300, y: 420..560) and return smoothly
      const swoopState = { p: 0 };
      this.tweens.add({
        targets: swoopState,
        p: 1,
        duration: 1100,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          if (!eagleSprite.scene) return;
          const p = swoopState.p;
          const sx = Phaser.Math.Clamp(startX + Math.sin(p * Math.PI * 2) * 34, 80, 300);
          const sy = Phaser.Math.Clamp(startY - Math.sin(p * Math.PI) * 38, 420, 560);
          eagleSprite.setPosition(sx, sy);
          eagleSprite.setAngle(Math.cos(p * Math.PI * 2) * -9);
          if (eagleZone.scene) {
            eagleZone.setPosition(sx, sy);
          }
        },
        onComplete: () => {
          windTimer.remove(false);
          if (!eagleSprite.scene) return;
          eagleSprite.setAngle(0);
          eagleSprite.setPosition(startX, startY);
          if (eagleZone.scene) {
            eagleZone.setPosition(startX, startY);
          }
          eagleGlideTween.resume();
          isEagleSwooping = false;
        }
      });
    });

    // =========================================================================
    // 5. Tiny Perspective-Scaled Yellow Raft on the Turquoise Arkansas River (`p5_tiny_raft.png`)
    // =========================================================================
    // 5a. 8 tiny crisp white pixel water glints (2x2 and 4x2) strictly inside the turquoise river ribbon
    //     (x along 520..625 matching y = 560 + (605 - x) * 0.82 +- 14px)
    const riverGlints = [
      { x: 618, y: 552, w: 2 },
      { x: 604, y: 560, w: 4 },
      { x: 592, y: 572, w: 2 },
      { x: 580, y: 582, w: 4 },
      { x: 568, y: 590, w: 2 },
      { x: 555, y: 602, w: 4 },
      { x: 542, y: 612, w: 2 },
      { x: 528, y: 624, w: 4 }
    ];
    riverGlints.forEach((rg, idx) => {
      const gBar = this.add.graphics();
      gBar.fillStyle(idx % 2 === 0 ? 0xffffff : 0xe0f2fe, 0.9);
      gBar.fillRect(0, 0, rg.w, 2);
      gBar.setPosition(rg.x, rg.y);
      gBar.setAlpha(0.15);
      gBar.setDepth(10);
      this.stageContainer.add(gBar);

      this.tweens.add({
        targets: gBar,
        x: rg.x - 4,
        y: rg.y + 3,
        alpha: { from: 0.15, to: 0.85 },
        duration: 950 + (idx % 4) * 210,
        delay: idx * 140,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });

    // 5b. Tiny perspective-scaled yellow raft (`~34px` wide, `angle: -28`, `depth: 11` behind `p5_bridge_cables_mask`)
    const raftStartX = 605;
    const raftStartY = 562;
    const raftEndX = 535;
    const raftEndY = 620;
    const raftScale = 34 / 148; // ~0.23
    const raftSprite = this.add
      .sprite(raftStartX, raftStartY, 'p5_tiny_raft', 0)
      .setOrigin(0.5, 0.5)
      .setScale(raftScale)
      .setAngle(-28)
      .setDepth(11);
    this.stageContainer.add(raftSprite);

    // Generous 70x70 hit zone that tracks the raft along the turquoise river water
    const raftZone = this.add
      .zone(raftStartX, raftStartY, 70, 70)
      .setOrigin(0.5, 0.5)
      .setDepth(19)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(raftZone);

    // Gently bobs along the center of the turquoise water from (605, 562) to (535, 620) (5,000ms yoyo)
    const raftPos = { x: raftStartX, y: raftStartY };
    this.tweens.add({
      targets: raftPos,
      x: raftEndX,
      y: raftEndY,
      duration: 5000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        if (!raftSprite.scene) return;
        raftSprite.setPosition(raftPos.x, raftPos.y);
        if (raftZone.scene) {
          raftZone.setPosition(raftPos.x, raftPos.y);
        }
      }
    });

    let isRaftCheering = false;
    let raftIdleToggle = false;
    // Cycle frames 0 <-> 1 at 3 fps (333ms) while drifting
    const raftIdleTimer = this.time.addEvent({
      delay: 333,
      loop: true,
      callback: () => {
        if (!raftSprite.scene) {
          raftIdleTimer.remove(false);
          return;
        }
        raftIdleToggle = !raftIdleToggle;
        if (!isRaftCheering) {
          raftSprite.setFrame(raftIdleToggle ? 1 : 0);
        }
      }
    });

    raftZone.on('pointerdown', () => {
      if (isRaftCheering || !raftSprite.scene) return;
      isRaftCheering = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p5_raft_splash.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p6:p5-tiny-raft');

      // Burst 10 tiny 2x2 white/turquoise water droplets around the raft!
      for (let d = 0; d < 10; d++) {
        const drop = this.add.graphics();
        drop.fillStyle(d % 2 === 0 ? 0xffffff : 0x38bdf8, 0.95);
        drop.fillRect(-1, -1, 2, 2);
        const sx = raftSprite.x + Phaser.Math.Between(-14, 14);
        const sy = raftSprite.y + Phaser.Math.Between(-8, 8);
        drop.setPosition(sx, sy);
        drop.setDepth(12);
        this.stageContainer.add(drop);
        this.stageContainer.sort('depth');

        this.tweens.add({
          targets: drop,
          x: sx + Phaser.Math.Between(-16, 16),
          y: sy - Phaser.Math.Between(12, 24),
          alpha: { from: 1, to: 0 },
          duration: 420,
          ease: 'Quad.easeOut',
          onComplete: () => drop.destroy()
        });
      }

      // Cycle frames 1 -> 2 -> 3 -> 2 -> 3 -> 0 at 6 fps (~166ms/step) as the tiny rafters cheer with raised paddles
      const seq = [1, 2, 3, 2, 3, 0];
      const stepMs = 166;
      seq.forEach((fIdx, idx) => {
        this.time.delayedCall(idx * stepMs, () => {
          if (!raftSprite.scene) return;
          raftSprite.setFrame(fIdx);
          if (idx === seq.length - 1) {
            isRaftCheering = false;
          }
        });
      });
    });

    // =========================================================================
    // 6. Interactive Family on the Wooden Bridge Deck (`x: 715..1235, y: 390..705`)
    // =========================================================================
    const familyBridgeZone = this.add
      .zone(975, 548, 520, 315)
      .setOrigin(0.5, 0.5)
      .setDepth(19)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(familyBridgeZone);

    let isFamilyCheerBusy = false;
    familyBridgeZone.on('pointerdown', () => {
      if (isFamilyCheerBusy) return;
      isFamilyCheerBusy = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p2_grandparents_hug.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p6:p5-bridge-family');
      Juice.burstStars(this, 965, 425, 16, [0xf43f5e, 0xfde047, 0xf472b6, 0x38bdf8, 0xffffff]);

      const heartColors = [0xf43f5e, 0xf472b6, 0xfde047, 0xfb7185, 0x38bdf8];
      for (let h = 0; h < 7; h++) {
        this.time.delayedCall(h * 130, () => {
          if (!this.scene.isActive()) return;
          const hx = 785 + h * 62;
          const hy = 415 + (h % 2) * 18;
          const heart = this.add.graphics();
          heart.fillStyle(heartColors[h % heartColors.length], 0.95);
          // Crisp 2D pixel heart
          heart.fillRect(-6, -4, 4, 4);
          heart.fillRect(2, -4, 4, 4);
          heart.fillRect(-8, -2, 16, 4);
          heart.fillRect(-6, 2, 12, 3);
          heart.fillRect(-3, 5, 6, 3);
          heart.fillRect(-1, 8, 2, 2);
          heart.setPosition(hx, hy);
          heart.setDepth(24);
          this.stageContainer.add(heart);
          this.stageContainer.sort('depth');

          this.tweens.add({
            targets: heart,
            y: hy - 58,
            x: hx + (h % 2 === 0 ? -10 : 10),
            alpha: { from: 1, to: 0 },
            duration: 880,
            ease: 'Sine.easeOut',
            onComplete: () => heart.destroy()
          });
        });
      }

      this.time.delayedCall(1200, () => {
        isFamilyCheerBusy = false;
      });
    });

    // Sort stageContainer children by their exact `.setDepth(...)` values
    this.stageContainer.sort('depth');
  }

  /**
   * Book 2 — Page 6 (`p6-clean.jpg` Royal Gorge Train Vista Car)
   * Builds the complete Living-Books interactive scene for Page 6:
   * - Simultaneous ambient Royal Gorge train chugging (`sfx_train_chug.mp3` at `0.28`) + Arkansas River rapids (`p6_ambient_river_rapids.mp3` at `0.22`)
   * - 1. Wyatt Pulling the Braided Rope & Blasting the Brass Train Horn (`p6_wyatt_horn.png`) at `(805, 268)`, `origin(0.5, 0.0)`, `depth: 20`
   * - 2. Grandpa Cheering on the Right Walkway (`p6_grandpa_cheer.png` at `(965, 658)`, `depth: 18` + `p6_handrail_foreground_mask.png` at `(915, 535)`, `depth: 23`)
   * - 3. Babci & Emma Clapping & Cheering on the Left Deck (`p6_babci_emma.png`) at `(615, 688)`, `origin(0.5, 1.0)`, `depth: 21`
   * - 4. Conductor Doggie with Red Lantern on the Left Orange Handrail (`p6_railing_doggie.png`) at `(412, 548)`, `origin(0.5, 1.0)`, `depth: 24`
   * - 5. Playful Colorado River Otter Riding a Log in the Whitewater Rapids (`p6_river_otter.png`) at `(215, 585)`, `origin(0.5, 0.5)`, `depth: 12`
   * - 6. Distant Train Locomotive Steam Puffs at `(328, 508)` + Interactive Distant Train Cars (`x: 305..460, y: 485..565`) + 16 River Rapid Shimmer Bars (`x: 45..385, y: 525..695`)
   */
  private mountPage6LivingScene(): void {
    this.startPage6AmbientAudio();

    const p6TexKeys = [
      'p6_wyatt_horn',
      'p6_grandpa_cheer',
      'p6_babci_emma',
      'p6_railing_doggie',
      'p6_river_otter',
      'p6_handrail_foreground_mask'
    ];
    for (const k of p6TexKeys) {
      if (this.textures.exists(k)) {
        this.textures.get(k).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }

    // =========================================================================
    // 2. Grandpa Cheering on the Right Walkway (`p6_grandpa_cheer.png` + `p6_handrail_foreground_mask.png`)
    // =========================================================================
    const grandpaBaseX = 965;
    const grandpaBaseY = 658;
    const grandpaScale = 285 / 247; // ~285px tall (~1.1538)
    const grandpaSprite = this.add
      .sprite(grandpaBaseX, grandpaBaseY, 'p6_grandpa_cheer', 0)
      .setOrigin(0.5, 1.0)
      .setScale(grandpaScale)
      .setFlipX(true)
      .setDepth(18); // Behind the slanted inner orange handrail mask (`depth: 23`)
    this.stageContainer.add(grandpaSprite);

    if (this.textures.exists('p6_handrail_foreground_mask')) {
      const handrailMask = this.add
        .image(915, 535, 'p6_handrail_foreground_mask')
        .setOrigin(0, 0)
        .setDepth(23);
      this.stageContainer.add(handrailMask);
    }

    let isGrandpaBusy = false;
    // Subtle train-car bounce (y: 658 <-> 660, 600ms yoyo) on frame 0
    this.tweens.add({
      targets: grandpaSprite,
      y: grandpaBaseY + 2,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const triggerGrandpaReaction = (playAudio: boolean): void => {
      if (isGrandpaBusy || !grandpaSprite.scene) return;
      isGrandpaBusy = true;

      if (playAudio) {
        this.playColoradoSfx('/assets/audio/colorado/sfx/p2_grandparents_hug.mp3');
      }
      ArcadeState.markHotspotDiscovered('colorado:p7:p6-grandpa-cheer');
      Juice.burstStars(this, grandpaBaseX, grandpaBaseY - 195, 14, [0xfde047, 0xfbbf24, 0x38bdf8, 0xffffff]);

      const seq = [0, 1, 2, 3, 1, 0];
      const stepMs = 166; // ~6 fps
      seq.forEach((fIdx, idx) => {
        this.time.delayedCall(idx * stepMs, () => {
          if (!grandpaSprite.scene) return;
          grandpaSprite.setFrame(fIdx);
          if (idx === seq.length - 1) {
            isGrandpaBusy = false;
          }
        });
      });
    };

    const grandpaZone = this.add
      .zone(grandpaBaseX, grandpaBaseY - 142, 165, 290)
      .setOrigin(0.5, 0.5)
      .setDepth(25)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(grandpaZone);
    grandpaZone.on('pointerdown', () => triggerGrandpaReaction(true));

    // =========================================================================
    // 3. Babci & Emma Clapping & Cheering on the Left Deck (`p6_babci_emma.png`)
    // =========================================================================
    const babciEmmaBaseX = 615;
    const babciEmmaBaseY = 688;
    const babciEmmaScale = 310 / 448; // ~310px tall (~0.692)
    const babciEmmaSprite = this.add
      .sprite(babciEmmaBaseX, babciEmmaBaseY, 'p6_babci_emma', 0)
      .setOrigin(0.5, 1.0)
      .setScale(babciEmmaScale)
      .setDepth(21);
    this.stageContainer.add(babciEmmaSprite);

    let isBabciEmmaBusy = false;
    // Gentle train-car bounce (y: 688 <-> 690, 600ms yoyo) holding frame 0
    this.tweens.add({
      targets: babciEmmaSprite,
      y: babciEmmaBaseY + 2,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const triggerBabciEmmaReaction = (playAudio: boolean): void => {
      if (isBabciEmmaBusy || !babciEmmaSprite.scene) return;
      isBabciEmmaBusy = true;

      if (playAudio) {
        this.playColoradoSfx('/assets/audio/colorado/sfx/p2_grandparents_hug.mp3');
        this.playColoradoSfx('/assets/audio/colorado/sfx/p6_kids_horn_laugh.mp3');
      }
      ArcadeState.markHotspotDiscovered('colorado:p7:p6-babci-emma');
      Juice.burstStars(this, babciEmmaBaseX, babciEmmaBaseY - 210, 14, [0xf472b6, 0xf43f5e, 0xfde047, 0xffffff]);

      // Floating pink pixel hearts and music notes
      const noteChars = ['♥', '♪', '♫', '♥', '♫'];
      const noteColors = ['#f43f5e', '#f472b6', '#fbbf24', '#fb7185', '#38bdf8'];
      for (let i = 0; i < 5; i++) {
        this.time.delayedCall(i * 135, () => {
          if (!this.scene.isActive() || !babciEmmaSprite.scene) return;
          const nx = babciEmmaBaseX + Phaser.Math.Between(-68, 68);
          const ny = babciEmmaBaseY - Phaser.Math.Between(185, 255);
          const noteTxt = this.add
            .text(nx, ny, noteChars[i % noteChars.length], {
              fontFamily: '"Fredoka", "Nunito", sans-serif',
              fontSize: '24px',
              fontStyle: 'bold',
              color: noteColors[i % noteColors.length],
              stroke: '#271206',
              strokeThickness: 4
            })
            .setOrigin(0.5, 0.5)
            .setDepth(26);
          this.stageContainer.add(noteTxt);
          this.stageContainer.sort('depth');

          this.tweens.add({
            targets: noteTxt,
            y: ny - 54,
            x: nx + (i % 2 === 0 ? -12 : 12),
            alpha: { from: 1, to: 0 },
            duration: 840,
            ease: 'Sine.easeOut',
            onComplete: () => noteTxt.destroy()
          });
        });
      }

      const seq = [0, 1, 2, 3, 1, 0];
      const stepMs = 166; // ~6 fps
      seq.forEach((fIdx, idx) => {
        this.time.delayedCall(idx * stepMs, () => {
          if (!babciEmmaSprite.scene) return;
          babciEmmaSprite.setFrame(fIdx);
          if (idx === seq.length - 1) {
            isBabciEmmaBusy = false;
          }
        });
      });
    };

    const babciEmmaZone = this.add
      .zone(babciEmmaBaseX, babciEmmaBaseY - 155, 215, 310)
      .setOrigin(0.5, 0.5)
      .setDepth(25)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(babciEmmaZone);
    babciEmmaZone.on('pointerdown', () => triggerBabciEmmaReaction(true));

    // =========================================================================
    // 1. Wyatt Pulling the Braided Rope & Blasting the Brass Train Horn (`p6_wyatt_horn.png`)
    // =========================================================================
    const wyattHornX = 805;
    const wyattHornY = 268;
    const wyattHornScale = 395 / 549; // ~395px tall (~0.7195)
    const wyattHornSprite = this.add
      .sprite(wyattHornX, wyattHornY, 'p6_wyatt_horn', 0)
      .setOrigin(0.5, 0.0)
      .setScale(wyattHornScale)
      .setDepth(20);
    this.stageContainer.add(wyattHornSprite);

    let isWyattHornBusy = false;
    // Gentle rhythmic train-car sway (y: 268 <-> 270, 600ms yoyo) holding frame 0
    this.tweens.add({
      targets: wyattHornSprite,
      y: wyattHornY + 2,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const spawnHornSteamAndNotes = (): void => {
      const hornBells = [
        { x: 750, y: 290, dir: -1 },
        { x: 860, y: 290, dir: 1 }
      ];
      for (const bell of hornBells) {
        // Crisp pixel-art white steam puffs bursting outward from each brass horn bell
        for (let p = 0; p < 6; p++) {
          this.time.delayedCall(p * 85, () => {
            if (!this.scene.isActive()) return;
            const puff = this.add.graphics();
            puff.fillStyle(0xffffff, 0.92);
            const r = Phaser.Math.Between(5, 9);
            puff.fillCircle(0, 0, r);
            puff.lineStyle(2, 0xcbd5e1, 0.75);
            puff.strokeCircle(0, 0, r);
            puff.setPosition(bell.x, bell.y + Phaser.Math.Between(-8, 8));
            puff.setDepth(26);
            this.stageContainer.add(puff);
            this.stageContainer.sort('depth');

            this.tweens.add({
              targets: puff,
              x: bell.x + bell.dir * Phaser.Math.Between(42, 88),
              y: bell.y - Phaser.Math.Between(16, 48),
              scaleX: 1.8,
              scaleY: 1.8,
              alpha: { from: 0.92, to: 0 },
              duration: 620,
              ease: 'Cubic.easeOut',
              onComplete: () => puff.destroy()
            });
          });
        }

        // Golden musical notes (♪, ♫) bursting left and right from (750, 290) and (860, 290)
        for (let n = 0; n < 3; n++) {
          this.time.delayedCall(n * 150, () => {
            if (!this.scene.isActive()) return;
            const note = this.add
              .text(bell.x, bell.y, n % 2 === 0 ? '♪' : '♫', {
                fontFamily: '"Fredoka", "Nunito", sans-serif',
                fontSize: '26px',
                fontStyle: 'bold',
                color: n % 2 === 0 ? '#fde047' : '#fb923c',
                stroke: '#271206',
                strokeThickness: 4
              })
              .setOrigin(0.5, 0.5)
              .setDepth(27);
            this.stageContainer.add(note);
            this.stageContainer.sort('depth');

            this.tweens.add({
              targets: note,
              x: bell.x + bell.dir * Phaser.Math.Between(50, 105),
              y: bell.y - Phaser.Math.Between(28, 65),
              alpha: { from: 1, to: 0 },
              scaleX: 1.35,
              scaleY: 1.35,
              duration: 780,
              ease: 'Sine.easeOut',
              onComplete: () => note.destroy()
            });
          });
        }
      }
    };

    const wyattHornZone = this.add
      .zone(wyattHornX, wyattHornY + 195, 195, 395)
      .setOrigin(0.5, 0.5)
      .setDepth(25)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(wyattHornZone);

    wyattHornZone.on('pointerdown', () => {
      if (isWyattHornBusy || !wyattHornSprite.scene) return;
      isWyattHornBusy = true;

      // Play protected brass train horn immediately + kids' horn laugh after 700ms
      this.playColoradoSfx('/assets/audio/colorado/sfx/sfx_train_horn.mp3');
      this.time.delayedCall(700, () => {
        if (this.scene.isActive()) {
          this.playColoradoSfx('/assets/audio/colorado/sfx/p6_kids_horn_laugh.mp3');
        }
      });

      ArcadeState.markHotspotDiscovered('colorado:p7:p6-wyatt-horn');
      Juice.burstStars(this, wyattHornX, 290, 16, [0xfde047, 0xf97316, 0xef4444, 0xffffff]);
      spawnHornSteamAndNotes();

      // Synchronized playful ear-cover/cheer reaction on Babci, Emma, and Grandpa!
      triggerBabciEmmaReaction(false);
      triggerGrandpaReaction(false);

      // Animate frames 0 -> 1 -> 2 -> 3 -> 2 -> 3 -> 0 at 6 fps (~166ms/step)
      const seq = [0, 1, 2, 3, 2, 3, 0];
      const stepMs = 166;
      seq.forEach((fIdx, idx) => {
        this.time.delayedCall(idx * stepMs, () => {
          if (!wyattHornSprite.scene) return;
          wyattHornSprite.setFrame(fIdx);
          if (idx === seq.length - 1) {
            isWyattHornBusy = false;
          }
        });
      });
    });

    // =========================================================================
    // 4. Conductor Doggie with Red Lantern on the Top Center Roof (`p6_railing_doggie.png`)
    // =========================================================================
    const doggieBaseX = 805;
    const doggieBaseY = 242;
    const doggieScale = 86 / 238; // ~86px tall (~0.3613)
    const doggieSprite = this.add
      .sprite(doggieBaseX, doggieBaseY, 'p6_railing_doggie', 0)
      .setOrigin(0.5, 1.0)
      .setScale(doggieScale)
      .setDepth(24);
    this.stageContainer.add(doggieSprite);

    let isDoggieBusy = false;
    // Gentle tail-wag / train-sway on frame 0
    this.tweens.add({
      targets: doggieSprite,
      angle: { from: -2.2, to: 2.2 },
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const doggieZone = this.add
      .zone(doggieBaseX, 200, 128, 108)
      .setOrigin(0.5, 0.5)
      .setDepth(26)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(doggieZone);

    doggieZone.on('pointerdown', () => {
      if (isDoggieBusy || !doggieSprite.scene) return;
      isDoggieBusy = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p6_conductor_doggie_bell.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p7:p6-railing-doggie');
      Juice.burstStars(this, 805, 210, 14, [0xef4444, 0xfde047, 0xfbbf24, 0xffffff]);

      // Warm red/gold additive lantern glow pulse
      const lanternGlow = this.add.graphics();
      lanternGlow.fillStyle(0xef4444, 0.45);
      lanternGlow.fillCircle(0, 0, 28);
      lanternGlow.fillStyle(0xfde047, 0.65);
      lanternGlow.fillCircle(0, 0, 14);
      lanternGlow.setBlendMode(Phaser.BlendModes.ADD);
      lanternGlow.setPosition(805, 210);
      lanternGlow.setDepth(25);
      this.stageContainer.add(lanternGlow);
      this.stageContainer.sort('depth');

      this.tweens.add({
        targets: lanternGlow,
        scaleX: 1.75,
        scaleY: 1.75,
        alpha: { from: 0.95, to: 0 },
        duration: 760,
        ease: 'Sine.easeOut',
        onComplete: () => lanternGlow.destroy()
      });

      // Cycle frames 0 -> 1 -> 2 -> 3 -> 0 at 6 fps (~166ms/step)
      const seq = [0, 1, 2, 3, 0];
      const stepMs = 166;
      seq.forEach((fIdx, idx) => {
        this.time.delayedCall(idx * stepMs, () => {
          if (!doggieSprite.scene) return;
          doggieSprite.setFrame(fIdx);
          if (idx === seq.length - 1) {
            isDoggieBusy = false;
          }
        });
      });
    });

    // =========================================================================
    // 5. Playful Colorado River Otter Riding a Log in the Whitewater Rapids (`p6_river_otter.png`)
    // =========================================================================
    const otterBaseX = 215;
    const otterBaseY = 585;
    const otterScale = 82 / 238; // ~82px wide (~0.3445)
    const otterSprite = this.add
      .sprite(otterBaseX, otterBaseY, 'p6_river_otter', 0)
      .setOrigin(0.5, 0.5)
      .setScale(otterScale)
      .setDepth(12);
    this.stageContainer.add(otterSprite);

    const otterZone = this.add
      .zone(otterBaseX, otterBaseY, 118, 92)
      .setOrigin(0.5, 0.5)
      .setDepth(16)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(otterZone);

    // Continuous Idle Motion: Bobs gently in the river current (x: 205 <-> 230, y: 580 <-> 592, 2,800ms Sine yoyo)
    const otterDrift = { t: 0 };
    this.tweens.add({
      targets: otterDrift,
      t: 1,
      duration: 2800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        if (!otterSprite.scene) return;
        const u = otterDrift.t;
        const ox = Phaser.Math.Linear(205, 230, u);
        const oy = Phaser.Math.Linear(580, 592, u) + Math.sin(u * Math.PI * 2) * 3;
        otterSprite.setPosition(ox, oy);
        if (otterZone.scene) {
          otterZone.setPosition(ox, oy);
        }
      }
    });

    let isOtterBusy = false;
    let otterIdleToggle = false;
    // Alternates frames 0 <-> 1 at 3 fps (333ms) while bobbing
    const otterIdleTimer = this.time.addEvent({
      delay: 333,
      loop: true,
      callback: () => {
        if (!otterSprite.scene) {
          otterIdleTimer.remove(false);
          return;
        }
        otterIdleToggle = !otterIdleToggle;
        if (!isOtterBusy) {
          otterSprite.setFrame(otterIdleToggle ? 1 : 0);
        }
      }
    });

    otterZone.on('pointerdown', () => {
      if (isOtterBusy || !otterSprite.scene) return;
      isOtterBusy = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p6_otter_splash.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p7:p6-river-otter');
      Juice.burstStars(this, otterSprite.x, otterSprite.y - 16, 12, [0x38bdf8, 0xe0f2fe, 0xfde047, 0xffffff]);

      // Burst 12 crisp white/cyan pixel water droplets around the log!
      for (let d = 0; d < 12; d++) {
        const drop = this.add.graphics();
        drop.fillStyle(d % 2 === 0 ? 0xffffff : 0x38bdf8, 0.95);
        drop.fillRect(-2, -2, 4, 4);
        const sx = otterSprite.x + Phaser.Math.Between(-28, 28);
        const sy = otterSprite.y + Phaser.Math.Between(-10, 10);
        drop.setPosition(sx, sy);
        drop.setDepth(14);
        this.stageContainer.add(drop);
        this.stageContainer.sort('depth');

        this.tweens.add({
          targets: drop,
          x: sx + Phaser.Math.Between(-26, 26),
          y: sy - Phaser.Math.Between(18, 42),
          alpha: { from: 1, to: 0 },
          duration: 480,
          ease: 'Quad.easeOut',
          onComplete: () => drop.destroy()
        });
      }

      // Animate frames 0 -> 1 -> 2 -> 3 -> 0 at 6 fps (~166ms/step)
      const seq = [0, 1, 2, 3, 0];
      const stepMs = 166;
      seq.forEach((fIdx, idx) => {
        this.time.delayedCall(idx * stepMs, () => {
          if (!otterSprite.scene) return;
          otterSprite.setFrame(fIdx);
          if (idx === seq.length - 1) {
            isOtterBusy = false;
          }
        });
      });
    });

    // =========================================================================
    // 6. Distant Train Locomotive Steam Puffs & River Rapid Shimmer
    // =========================================================================
    const spawnLocomotivePuff = (extraBig: boolean = false): void => {
      if (!this.scene.isActive()) return;
      const puff = this.add.graphics();
      const radius = extraBig ? Phaser.Math.Between(6, 10) : Phaser.Math.Between(3, 5);
      puff.fillStyle(0xffffff, 0.85);
      puff.fillCircle(0, 0, radius);
      puff.lineStyle(1.5, 0xe2e8f0, 0.7);
      puff.strokeCircle(0, 0, radius);
      const startX = 328 + Phaser.Math.Between(-6, 6);
      const startY = 508;
      puff.setPosition(startX, startY);
      puff.setDepth(13);
      this.stageContainer.add(puff);
      this.stageContainer.sort('depth');

      this.tweens.add({
        targets: puff,
        x: startX + Phaser.Math.Between(-14, 18),
        y: 455 - (extraBig ? Phaser.Math.Between(6, 18) : 0),
        scaleX: extraBig ? 2.1 : 1.65,
        scaleY: extraBig ? 2.1 : 1.65,
        alpha: { from: 0.85, to: 0.0 },
        duration: 2400,
        ease: 'Sine.easeOut',
        onComplete: () => puff.destroy()
      });
    };

    // Continuously puff tiny crisp pixel-art white steam clouds from the lead orange locomotive nose at (328, 508)
    spawnLocomotivePuff(false);
    const locoSteamTimer = this.time.addEvent({
      delay: 720,
      loop: true,
      callback: () => {
        if (!this.scene.isActive() || COLORADO_PAGES[this.currentPageIndex]?.bgKey !== 'colorado-p6-clean') {
          locoSteamTimer.remove(false);
          return;
        }
        spawnLocomotivePuff(false);
      }
    });

    // Make the distant orange train cars (x: 305..460, y: 485..565) clickable to play `sfx_train_horn.mp3` and burst extra steam rings!
    const distantTrainZone = this.add
      .zone(382, 525, 155, 80)
      .setOrigin(0.5, 0.5)
      .setDepth(15)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(distantTrainZone);

    distantTrainZone.on('pointerdown', () => {
      this.playColoradoSfx('/assets/audio/colorado/sfx/sfx_train_horn.mp3', 0.78);
      ArcadeState.markHotspotDiscovered('colorado:p7:p6-distant-train');
      Juice.burstStars(this, 345, 505, 12, [0xfde047, 0xf97316, 0xffffff]);
      for (let i = 0; i < 6; i++) {
        this.time.delayedCall(i * 110, () => spawnLocomotivePuff(true));
      }
    });

    // River Rapid Shimmer: 16 crisp white/ice-blue pixel water glint bars (4x2 and 6x2) strictly inside the left river channel (x: 45..385, y: 525..695)
    const rapidGlints = [
      { x: 65, y: 538, w: 4 },
      { x: 112, y: 546, w: 6 },
      { x: 168, y: 534, w: 4 },
      { x: 224, y: 544, w: 6 },
      { x: 278, y: 556, w: 4 },
      { x: 332, y: 568, w: 6 },
      { x: 84, y: 576, w: 6 },
      { x: 145, y: 588, w: 4 },
      { x: 262, y: 596, w: 6 },
      { x: 318, y: 608, w: 4 },
      { x: 368, y: 622, w: 6 },
      { x: 72, y: 628, w: 4 },
      { x: 134, y: 642, w: 6 },
      { x: 196, y: 654, w: 4 },
      { x: 268, y: 668, w: 6 },
      { x: 342, y: 682, w: 4 }
    ];
    rapidGlints.forEach((rg, idx) => {
      const gBar = this.add.graphics();
      gBar.fillStyle(idx % 2 === 0 ? 0xffffff : 0xe0f2fe, 0.9);
      gBar.fillRect(-rg.w / 2, -1, rg.w, 2);
      gBar.setPosition(rg.x, rg.y);
      gBar.setDepth(11);
      this.stageContainer.add(gBar);

      this.tweens.add({
        targets: gBar,
        x: rg.x + (idx % 2 === 0 ? 8 : -8),
        alpha: { from: 0.28, to: 0.95 },
        duration: 820 + (idx % 5) * 160,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });

    // Sort stageContainer children by their exact `.setDepth(...)` values
    this.stageContainer.sort('depth');
  }

  /**
   * Book 2 — Page 7 (`p7-clean.jpg` Garden of the Gods)
   * Builds the complete Living-Books interactive scene for Page 7:
   * - Simultaneous ambient nature breeze (`p7_ambient_nature_breeze.mp3` at `0.25`) + meadow songbirds (`p7_ambient_meadow_birds.mp3` at `0.22`)
   * - 1. Grandpa, Babci & Dark-Haired Emma on the Left Trail (`p7_grandparents_emma.png`) at `(318, 682)`, `origin(0.5, 1.0)`, `depth: 20`
   * - 2. Wyatt Looking Up & Pointing at the Kissing Camels (`p7_wyatt_point.png`) at `(505, 690)`, `origin(0.5, 1.0)`, `depth: 21`
   * - 3. Sparky the Dragon on the Right Orange Sandstone Boulder (`p7_boulder_sparky.png`) at `(1085, 562)`, `origin(0.5, 1.0)`, `depth: 22`
   * - 4. Explorer Doggie with Safari Hat & Camera on the Center Trail Rock (`p7_trail_doggie.png`) at `(685, 518)`, `origin(0.5, 1.0)`, `depth: 18`
   * - 5. Pair of Mountain Bluebirds Fluttering Over the Pine Trees (`p7_bluebirds.png`) at `(505, 395)`, `origin(0.5, 0.5)`, `depth: 16`
   * - 6. Interactive Kissing Camels Hit Zone (`x: 910..1135, y: 65..250`) & Pikes Peak Snow Sparkles (`x: 530..750, y: 215..295`)
   */
  private mountPage7LivingScene(): void {
    this.startPage7AmbientAudio();

    const p7TexKeys = [
      'p7_grandparents_emma',
      'p7_wyatt_point',
      'p7_boulder_sparky',
      'p7_trail_doggie',
      'p7_bluebirds'
    ];
    for (const k of p7TexKeys) {
      if (this.textures.exists(k)) {
        this.textures.get(k).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }

    // Helper: spawns the glowing pink pixel heart + golden sparkles between the Kissing Camels' noses at (1020, 148)
    const spawnKissingCamelsHeartMagic = (withFloatingMiniHearts: boolean): void => {
      if (!this.scene.isActive()) return;
      const camelX = 1020;
      const camelY = 148;
      Juice.burstStars(this, camelX, camelY, 16, [0xf43f5e, 0xf472b6, 0xfde047, 0xffffff]);

      // Big pulsing pink pixel heart right between the two Kissing Camels' noses at (1020, 148)
      const bigHeart = this.add.graphics();
      bigHeart.fillStyle(0xf43f5e, 0.96);
      bigHeart.fillRect(-12, -8, 8, 8);
      bigHeart.fillRect(4, -8, 8, 8);
      bigHeart.fillRect(-16, -4, 32, 8);
      bigHeart.fillRect(-12, 4, 24, 6);
      bigHeart.fillRect(-6, 10, 12, 6);
      bigHeart.fillRect(-2, 16, 4, 4);
      bigHeart.setPosition(camelX, camelY);
      bigHeart.setDepth(26);
      this.stageContainer.add(bigHeart);
      this.stageContainer.sort('depth');

      this.tweens.add({
        targets: bigHeart,
        scaleX: { from: 0.4, to: 1.35 },
        scaleY: { from: 0.4, to: 1.35 },
        y: camelY - 18,
        alpha: { from: 1, to: 0 },
        duration: 1150,
        ease: 'Back.easeOut',
        onComplete: () => bigHeart.destroy()
      });

      if (withFloatingMiniHearts) {
        const colors = [0xf43f5e, 0xf472b6, 0xfb7185, 0xfde047];
        for (let i = 0; i < 10; i++) {
          this.time.delayedCall(i * 95, () => {
            if (!this.scene.isActive()) return;
            const hx = camelX + Phaser.Math.Between(-58, 58);
            const hy = camelY + Phaser.Math.Between(-22, 22);
            const mh = this.add.graphics();
            mh.fillStyle(colors[i % colors.length], 0.95);
            mh.fillRect(-6, -4, 4, 4);
            mh.fillRect(2, -4, 4, 4);
            mh.fillRect(-8, -2, 16, 4);
            mh.fillRect(-6, 2, 12, 3);
            mh.fillRect(-3, 5, 6, 3);
            mh.fillRect(-1, 8, 2, 2);
            mh.setPosition(hx, hy);
            mh.setDepth(25);
            this.stageContainer.add(mh);
            this.stageContainer.sort('depth');

            this.tweens.add({
              targets: mh,
              y: hy - Phaser.Math.Between(36, 68),
              x: hx + (i % 2 === 0 ? -12 : 12),
              alpha: { from: 1, to: 0 },
              duration: 860,
              ease: 'Sine.easeOut',
              onComplete: () => mh.destroy()
            });
          });
        }
      }
    };

    // =========================================================================
    // 1. Grandpa, Babci & Dark-Haired Emma on the Left Trail (`p7_grandparents_emma.png`)
    // =========================================================================
    const gpEmmaX = 318;
    const gpEmmaY = 682;
    const gpEmmaScale = 295 / 350; // ~295px tall (~0.8429)
    const gpEmmaSprite = this.add
      .sprite(gpEmmaX, gpEmmaY, 'p7_grandparents_emma', 0)
      .setOrigin(0.5, 1.0)
      .setScale(gpEmmaScale)
      .setDepth(20);
    this.stageContainer.add(gpEmmaSprite);

    const gpEmmaZone = this.add
      .zone(gpEmmaX, gpEmmaY - 148, 235, 295)
      .setOrigin(0.5, 0.5)
      .setDepth(24)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(gpEmmaZone);

    let isGpEmmaBusy = false;
    gpEmmaZone.on('pointerdown', () => {
      if (isGpEmmaBusy || !gpEmmaSprite.scene) return;
      isGpEmmaBusy = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p2_grandparents_hug.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p8:p7-grandparents-emma');
      Juice.burstStars(this, gpEmmaX, gpEmmaY - 210, 16, [0xf472b6, 0xfde047, 0xf43f5e, 0xffffff]);

      // Float warm pink pixel hearts and golden stars above them
      const heartColors = [0xf43f5e, 0xf472b6, 0xfde047, 0xfb7185];
      for (let h = 0; h < 6; h++) {
        this.time.delayedCall(h * 130, () => {
          if (!this.scene.isActive() || !gpEmmaSprite.scene) return;
          const hx = gpEmmaX + Phaser.Math.Between(-85, 85);
          const hy = gpEmmaY - Phaser.Math.Between(195, 275);
          const heart = this.add.graphics();
          heart.fillStyle(heartColors[h % heartColors.length], 0.95);
          heart.fillRect(-6, -4, 4, 4);
          heart.fillRect(2, -4, 4, 4);
          heart.fillRect(-8, -2, 16, 4);
          heart.fillRect(-6, 2, 12, 3);
          heart.fillRect(-3, 5, 6, 3);
          heart.fillRect(-1, 8, 2, 2);
          heart.setPosition(hx, hy);
          heart.setDepth(25);
          this.stageContainer.add(heart);
          this.stageContainer.sort('depth');

          this.tweens.add({
            targets: heart,
            y: hy - 54,
            x: hx + (h % 2 === 0 ? -10 : 10),
            alpha: { from: 1, to: 0 },
            duration: 860,
            ease: 'Sine.easeOut',
            onComplete: () => heart.destroy()
          });
        });
      }

      // Cycle frames 0 -> 1 -> 2 -> 3 -> 1 -> 0 at 5 fps (200ms/step)
      const seq = [0, 1, 2, 3, 1, 0];
      const stepMs = 200;
      seq.forEach((fIdx, idx) => {
        this.time.delayedCall(idx * stepMs, () => {
          if (!gpEmmaSprite.scene) return;
          gpEmmaSprite.setFrame(fIdx);
          if (idx === seq.length - 1) {
            isGpEmmaBusy = false;
          }
        });
      });
    });

    // =========================================================================
    // 2. Wyatt Looking Up & Pointing at the Kissing Camels (`p7_wyatt_point.png`)
    // =========================================================================
    const wyattX = 505;
    const wyattY = 690;
    const wyattScale = 172 / 443; // ~172px tall (~0.3883)
    const wyattSprite = this.add
      .sprite(wyattX, wyattY, 'p7_wyatt_point', 0)
      .setOrigin(0.5, 1.0)
      .setScale(wyattScale)
      .setDepth(21);
    this.stageContainer.add(wyattSprite);

    const wyattZone = this.add
      .zone(wyattX, wyattY - 86, 125, 180)
      .setOrigin(0.5, 0.5)
      .setDepth(24)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(wyattZone);

    let isWyattBusy = false;
    wyattZone.on('pointerdown', () => {
      if (isWyattBusy || !wyattSprite.scene) return;
      isWyattBusy = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p7_wyatt_wow.mp3');
      this.time.delayedCall(300, () => {
        if (this.scene.isActive()) {
          this.playColoradoSfx('/assets/audio/colorado/sfx/p7_camels_kiss_harp.mp3');
          spawnKissingCamelsHeartMagic(false);
        }
      });

      ArcadeState.markHotspotDiscovered('colorado:p8:p7-wyatt-point');
      Juice.burstStars(this, wyattX, wyattY - 125, 14, [0xfde047, 0x38bdf8, 0xf472b6, 0xffffff]);

      // Animate frames 0 -> 1 -> 2 -> 3 -> 1 -> 0 at 6 fps (~166ms/step)
      const seq = [0, 1, 2, 3, 1, 0];
      const stepMs = 166;
      seq.forEach((fIdx, idx) => {
        this.time.delayedCall(idx * stepMs, () => {
          if (!wyattSprite.scene) return;
          wyattSprite.setFrame(fIdx);
          if (idx === seq.length - 1) {
            isWyattBusy = false;
          }
        });
      });
    });

    // =========================================================================
    // 3. Sparky the Dragon on the Right Orange Sandstone Boulder (`p7_boulder_sparky.png`)
    // =========================================================================
    const sparkyX = 1085;
    const sparkyY = 562;
    const sparkyScale = 122 / 283; // ~122px tall (~0.4311)
    const sparkySprite = this.add
      .sprite(sparkyX, sparkyY, 'p7_boulder_sparky', 0)
      .setOrigin(0.5, 1.0)
      .setScale(sparkyScale)
      .setDepth(22);
    this.stageContainer.add(sparkySprite);

    const sparkyZone = this.add
      .zone(sparkyX, sparkyY - 62, 138, 132)
      .setOrigin(0.5, 0.5)
      .setDepth(25)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(sparkyZone);

    let isSparkyBusy = false;
    sparkyZone.on('pointerdown', () => {
      if (isSparkyBusy || !sparkySprite.scene) return;
      isSparkyBusy = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p7_sparky_magic_puff.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p8:p7-boulder-sparky');
      Juice.burstStars(this, sparkyX, sparkyY - 75, 16, [0x34d399, 0xfde047, 0xf472b6, 0xffffff]);

      // Bouncy 16px hop
      this.tweens.add({
        targets: sparkySprite,
        y: sparkyY - 16,
        duration: 210,
        yoyo: true,
        repeat: 1,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (sparkySprite.scene) sparkySprite.setPosition(sparkyX, sparkyY);
        }
      });

      // Animate frames 0 -> 1 -> 2 -> 3 -> 1 -> 0 at 6 fps (~166ms/step)
      const seq = [0, 1, 2, 3, 1, 0];
      const stepMs = 166;
      seq.forEach((fIdx, idx) => {
        this.time.delayedCall(idx * stepMs, () => {
          if (!sparkySprite.scene) return;
          sparkySprite.setFrame(fIdx);
          if (idx === seq.length - 1) {
            isSparkyBusy = false;
          }
        });
      });
    });

    // =========================================================================
    // 4. Explorer Doggie with Safari Hat & Camera on the Center Trail Rock (`p7_trail_doggie.png`)
    // =========================================================================
    const doggieX = 685;
    const doggieY = 518;
    const doggieScale = 82 / 328; // ~82px tall (0.25)
    const doggieSprite = this.add
      .sprite(doggieX, doggieY, 'p7_trail_doggie', 0)
      .setOrigin(0.5, 1.0)
      .setScale(doggieScale)
      .setDepth(18);
    this.stageContainer.add(doggieSprite);

    const doggieZone = this.add
      .zone(doggieX, doggieY - 42, 112, 98)
      .setOrigin(0.5, 0.5)
      .setDepth(23)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(doggieZone);

    let isDoggieBusy = false;
    doggieZone.on('pointerdown', () => {
      if (isDoggieBusy || !doggieSprite.scene) return;
      isDoggieBusy = true;

      this.playColoradoSfx('/assets/audio/colorado/sfx/p7_doggie_camera_shutter.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p8:p7-trail-doggie');
      Juice.burstStars(this, 670, 485, 14, [0xffffff, 0xfef08a, 0xfde047, 0x38bdf8]);

      // Crisp white/yellow additive camera-flash starburst at (670, 485)
      const flashStar = this.add.graphics();
      flashStar.fillStyle(0xfef08a, 0.72);
      flashStar.fillCircle(0, 0, 32);
      flashStar.fillStyle(0xffffff, 0.96);
      flashStar.fillCircle(0, 0, 16);
      flashStar.fillRect(-38, -2, 76, 4);
      flashStar.fillRect(-2, -38, 4, 76);
      flashStar.setBlendMode(Phaser.BlendModes.ADD);
      flashStar.setPosition(670, 485);
      flashStar.setDepth(25);
      this.stageContainer.add(flashStar);
      this.stageContainer.sort('depth');

      this.tweens.add({
        targets: flashStar,
        scaleX: { from: 0.5, to: 1.9 },
        scaleY: { from: 0.5, to: 1.9 },
        alpha: { from: 1, to: 0 },
        duration: 420,
        ease: 'Cubic.easeOut',
        onComplete: () => flashStar.destroy()
      });

      // Cycle frames 0 -> 1 -> 2 -> 3 -> 0 at 6 fps (~166ms/step)
      const seq = [0, 1, 2, 3, 0];
      const stepMs = 166;
      seq.forEach((fIdx, idx) => {
        this.time.delayedCall(idx * stepMs, () => {
          if (!doggieSprite.scene) return;
          doggieSprite.setFrame(fIdx);
          if (idx === seq.length - 1) {
            isDoggieBusy = false;
          }
        });
      });
    });

    // =========================================================================
    // 5. Pair of Mountain Bluebirds Fluttering Over the Pine Trees (`p7_bluebirds.png`)
    // =========================================================================
    const birdsStartX = 505;
    const birdsStartY = 395;
    const birdsMinX = 430;
    const birdsMinY = 375;
    const birdsMaxX = 585;
    const birdsMaxY = 415;
    const birdsScale = 115 / 250; // ~115px wide (0.46)
    const birdsSprite = this.add
      .sprite(birdsStartX, birdsStartY, 'p7_bluebirds', 0)
      .setOrigin(0.5, 0.5)
      .setScale(birdsScale)
      .setDepth(16);
    this.stageContainer.add(birdsSprite);

    const birdsZone = this.add
      .zone(birdsStartX, birdsStartY, 132, 96)
      .setOrigin(0.5, 0.5)
      .setDepth(22)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(birdsZone);

    let birdsFrameIdx = 0;
    // Continuously flap through frames 0 -> 1 -> 2 -> 3 at 8 fps (125ms)
    const birdsFlapTimer = this.time.addEvent({
      delay: 125,
      loop: true,
      callback: () => {
        if (!birdsSprite.scene) {
          birdsFlapTimer.remove(false);
          return;
        }
        birdsFrameIdx = (birdsFrameIdx + 1) % 4;
        birdsSprite.setFrame(birdsFrameIdx);
      }
    });

    let isBirdsSwooping = false;
    // Glide in a figure-eight loop between (430, 375) and (585, 415) (4,800ms yoyo)
    const birdsGlideState = { t: 0.48 };
    const birdsGlideTween = this.tweens.add({
      targets: birdsGlideState,
      t: 1,
      duration: 4800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        if (!birdsSprite.scene || isBirdsSwooping) return;
        const u = birdsGlideState.t;
        const bx = Phaser.Math.Linear(birdsMinX, birdsMaxX, u);
        const by = Phaser.Math.Linear(birdsMinY, birdsMaxY, u) + Math.sin(u * Math.PI * 2) * 12;
        birdsSprite.setPosition(bx, by);
        if (birdsZone.scene) {
          birdsZone.setPosition(bx, by);
        }
      }
    });

    birdsZone.on('pointerdown', () => {
      if (isBirdsSwooping || !birdsSprite.scene) return;
      isBirdsSwooping = true;
      birdsGlideTween.pause();

      this.playColoradoSfx('/assets/audio/colorado/sfx/p7_bluebirds_chirp.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p8:p7-bluebirds');
      Juice.burstStars(this, birdsSprite.x, birdsSprite.y, 12, [0x38bdf8, 0xe0f2fe, 0xfde047, 0xffffff]);

      const sx0 = birdsSprite.x;
      const sy0 = birdsSprite.y;

      // Sky-blue musical notes (♪, ♫) trailing behind the bluebirds
      for (let n = 0; n < 5; n++) {
        this.time.delayedCall(n * 150, () => {
          if (!this.scene.isActive() || !birdsSprite.scene) return;
          const note = this.add
            .text(
              birdsSprite.x + Phaser.Math.Between(-24, 24),
              birdsSprite.y + Phaser.Math.Between(-12, 12),
              n % 2 === 0 ? '♪' : '♫',
              {
                fontFamily: '"Fredoka", "Nunito", sans-serif',
                fontSize: '22px',
                fontStyle: 'bold',
                color: n % 2 === 0 ? '#38bdf8' : '#7dd3fc',
                stroke: '#0c4a6e',
                strokeThickness: 3
              }
            )
            .setOrigin(0.5, 0.5)
            .setDepth(24);
          this.stageContainer.add(note);
          this.stageContainer.sort('depth');

          this.tweens.add({
            targets: note,
            y: note.y - 42,
            alpha: { from: 1, to: 0 },
            duration: 680,
            ease: 'Sine.easeOut',
            onComplete: () => note.destroy()
          });
        });
      }

      // Swoop upward around the red rock spires and return smoothly
      const swoopObj = { p: 0 };
      this.tweens.add({
        targets: swoopObj,
        p: 1,
        duration: 1050,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          if (!birdsSprite.scene) return;
          const p = swoopObj.p;
          const nx = sx0 + Math.sin(p * Math.PI * 2) * 44;
          const ny = sy0 - Math.sin(p * Math.PI) * 58;
          birdsSprite.setPosition(nx, ny);
          if (birdsZone.scene) {
            birdsZone.setPosition(nx, ny);
          }
        },
        onComplete: () => {
          if (!birdsSprite.scene) return;
          birdsSprite.setPosition(sx0, sy0);
          if (birdsZone.scene) {
            birdsZone.setPosition(sx0, sy0);
          }
          birdsGlideTween.resume();
          isBirdsSwooping = false;
        }
      });
    });

    // =========================================================================
    // 6. Interactive Kissing Camels Hit Zone (`x: 910..1135, y: 65..250`) & Pikes Peak Snow Sparkles
    // =========================================================================
    const kissingCamelsZone = this.add
      .zone(1022, 158, 225, 185)
      .setOrigin(0.5, 0.5)
      .setDepth(19)
      .setInteractive({ useHandCursor: true });
    this.stageContainer.add(kissingCamelsZone);

    kissingCamelsZone.on('pointerdown', () => {
      this.playColoradoSfx('/assets/audio/colorado/sfx/p7_camels_kiss_harp.mp3');
      ArcadeState.markHotspotDiscovered('colorado:p8:p7-kissing-camels');
      spawnKissingCamelsHeartMagic(true);
    });

    // Subtle white/cyan snow-sparkle glints twinkling across Pikes Peak (`x: 530..750, y: 215..295`)
    const pikesPeakSparkles = [
      { x: 548, y: 274 },
      { x: 576, y: 256 },
      { x: 604, y: 242 },
      { x: 632, y: 228 },
      { x: 658, y: 222 },
      { x: 684, y: 234 },
      { x: 712, y: 252 },
      { x: 738, y: 268 },
      { x: 618, y: 264 },
      { x: 672, y: 258 }
    ];
    pikesPeakSparkles.forEach((sp, idx) => {
      const glint = this.add.graphics();
      glint.fillStyle(idx % 2 === 0 ? 0xffffff : 0xe0f2fe, 0.9);
      glint.fillRect(-1, -3, 2, 6);
      glint.fillRect(-3, -1, 6, 2);
      glint.setPosition(sp.x, sp.y);
      glint.setDepth(12);
      this.stageContainer.add(glint);

      this.tweens.add({
        targets: glint,
        alpha: { from: 0.18, to: 0.92 },
        scaleX: { from: 0.65, to: 1.25 },
        scaleY: { from: 0.65, to: 1.25 },
        duration: 1100 + (idx % 5) * 240,
        delay: idx * 160,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });

    // Sort stageContainer children by their exact `.setDepth(...)` values
    this.stageContainer.sort('depth');
  }

  /**
   * Book 2 — Page 8 Finale (`public/assets/stories/colorado/pages/p8.jpg` Babci's Pierogi Kitchen)
   * Pure Ambiance, Vibes & Calm Fade-Out:
   * - 1. Zero clickable character hitboxes or interactive popups; loops `p8_pierogi_sizzle_loop` (`0.34`) + `p8_cozy_kitchen_guitar` (`0.16`)
   * - 2. Flickering gas stove flame & butter sizzle under the cast-iron pan (`x: 1052, y: 376` in 1280x720 page coords, directly under the skillet and above the stove knobs)
   * - 3. Rising pixel steam curls from the frying pan (`x: 1040..1065, y: 338 -> 175`) & Rita's pierogi platter (`x: 200..265, y: 372 -> 265`)
   * - 4. 12 floating flour dust motes (`x: 410..660, y: 470..640`)
   */
  private mountPage8LivingScene(): void {
    this.startPage8AmbientAudio();

    // =========================================================================
    // 2. Flickering Gas Stove Flame & Butter Sizzle Under the Cast-Iron Pan
    //    (On `p8.jpg` scaled to 1280x720, the dark burner grate gap directly underneath
    //     the black cast-iron skillet and above the stove knobs is at x = 1052, y = 376)
    // =========================================================================
    const burnerX = 1052;
    const burnerY = 376;

    // Outer warm amber glow: 38x6 additive rectangle at depth 15
    const outerFlameHalo = this.add
      .rectangle(burnerX, burnerY, 38, 6, 0xff8822, 0.55)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(15);
    this.stageContainer.add(outerFlameHalo);

    // Inner gas-blue core: 28x4 additive rectangle at depth 16
    const innerGasCore = this.add
      .rectangle(burnerX, burnerY, 28, 4, 0x44bbff, 0.75)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(16);
    this.stageContainer.add(innerGasCore);

    this.tweens.add({
      targets: outerFlameHalo,
      alpha: { from: 0.42, to: 0.78 },
      scaleX: { from: 0.92, to: 1.08 },
      scaleY: { from: 0.92, to: 1.08 },
      x: { from: burnerX - 1, to: burnerX + 1 },
      duration: 185,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.tweens.add({
      targets: innerGasCore,
      alpha: { from: 0.55, to: 0.88 },
      scaleX: { from: 0.94, to: 1.06 },
      y: { from: burnerY - 0.6, to: burnerY + 0.6 },
      duration: 145,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 4 tiny 3x3 flickering flame tips across x = 1038..1066 right in the burner gap
    const flameTipXs = [1038, 1047, 1057, 1066];
    const baseTipY = burnerY - 1;
    flameTipXs.forEach((tx, idx) => {
      const tip = this.add
        .rectangle(tx, baseTipY, 3, 3, idx % 2 === 0 ? 0x44bbff : 0xff8822, 0.75)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(16);
      this.stageContainer.add(tip);

      this.tweens.add({
        targets: tip,
        alpha: { from: 0.45, to: 0.85 },
        scaleX: { from: 0.92, to: 1.08 },
        scaleY: { from: 0.92, to: 1.08 },
        x: tx + (idx % 2 === 0 ? 1 : -1),
        y: baseTipY - 1,
        duration: 140 + idx * 28,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });

    // Inside the top of the cast-iron skillet around the golden pierogi (x: 1030..1074, y: 342..350):
    // periodically pop tiny 2x2 golden-butter sizzle sparks (#FFEE77)
    const sizzleSparkTimer = this.time.addEvent({
      delay: 190,
      loop: true,
      callback: () => {
        if (!this.scene.isActive() || this.currentPageIndex !== COLORADO_PAGES.length - 1) {
          sizzleSparkTimer.remove(false);
          return;
        }
        const sx = Phaser.Math.Between(1030, 1074);
        const sy = Phaser.Math.Between(342, 350);
        const spark = this.add
          .rectangle(sx, sy, 2, 2, 0xffee77, 0.95)
          .setDepth(16);
        this.stageContainer.add(spark);

        this.tweens.add({
          targets: spark,
          y: sy - Phaser.Math.Between(3, 5),
          x: sx + Phaser.Math.Between(-2, 2),
          alpha: { from: 0.95, to: 0 },
          duration: 350,
          ease: 'Quad.easeOut',
          onComplete: () => spark.destroy()
        });
      }
    });

    // =========================================================================
    // 3. Rising Pixel Steam Curls from the Skillet (`x: 1040..1065, y: 338 -> 175`)
    //    & Rita's Pierogi Platter (`x: 200..265, y: 372 -> 265`)
    // =========================================================================
    const spawnSkilletSteamPuff = (): void => {
      if (!this.scene.isActive() || this.currentPageIndex !== COLORADO_PAGES.length - 1) return;
      const w = Phaser.Math.Between(6, 14);
      const h = Phaser.Math.Between(6, 10);
      const puff = this.add.graphics();
      puff.fillStyle(0xffffff, 1);
      puff.fillRoundedRect(-w / 2, -h / 2, w, h, 3);
      const startX = Phaser.Math.Between(1040, 1065);
      const startY = 338;
      puff.setPosition(startX, startY);
      puff.setAlpha(0.45);
      puff.setDepth(17);
      this.stageContainer.add(puff);

      const state = { t: 0 };
      this.tweens.add({
        targets: state,
        t: 1,
        duration: 3400,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          if (!puff.scene) return;
          const u = state.t;
          // Drift upward from right above the golden pierogi in the skillet (y: 338)
          // toward the underside of the range hood (y: 175)
          const curY = Phaser.Math.Linear(338, 175, u);
          const curX = startX - u * 18 + Math.sin(u * Math.PI * 2.5) * 9;
          puff.setPosition(curX, curY);
          puff.setAlpha(0.45 * (1 - u));
          puff.setScale(1 + u * 0.45);
        },
        onComplete: () => puff.destroy()
      });
    };

    spawnSkilletSteamPuff();
    const skilletSteamTimer = this.time.addEvent({
      delay: 640,
      loop: true,
      callback: () => {
        if (!this.scene.isActive() || this.currentPageIndex !== COLORADO_PAGES.length - 1) {
          skilletSteamTimer.remove(false);
          return;
        }
        spawnSkilletSteamPuff();
      }
    });

    const spawnPlatterSteamWisp = (): void => {
      if (!this.scene.isActive() || this.currentPageIndex !== COLORADO_PAGES.length - 1) return;
      const w = Phaser.Math.Between(6, 10);
      const h = Phaser.Math.Between(5, 8);
      const wisp = this.add.graphics();
      wisp.fillStyle(0xffffff, 1);
      wisp.fillRoundedRect(-w / 2, -h / 2, w, h, 3);
      const startX = Phaser.Math.Between(200, 265);
      const startY = 372;
      wisp.setPosition(startX, startY);
      wisp.setAlpha(0.35);
      wisp.setDepth(17);
      this.stageContainer.add(wisp);

      const state = { t: 0 };
      this.tweens.add({
        targets: state,
        t: 1,
        duration: 3000,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          if (!wisp.scene) return;
          const u = state.t;
          const curY = Phaser.Math.Linear(372, 265, u);
          const curX = startX + Math.sin(u * Math.PI * 2) * 7;
          wisp.setPosition(curX, curY);
          wisp.setAlpha(0.35 * (1 - u));
          wisp.setScale(1 + u * 0.35);
        },
        onComplete: () => wisp.destroy()
      });
    };

    spawnPlatterSteamWisp();
    const platterSteamTimer = this.time.addEvent({
      delay: 780,
      loop: true,
      callback: () => {
        if (!this.scene.isActive() || this.currentPageIndex !== COLORADO_PAGES.length - 1) {
          platterSteamTimer.remove(false);
          return;
        }
        spawnPlatterSteamWisp();
      }
    });

    // =========================================================================
    // 4. Floating Kitchen Flour Motes (`x: 410..660, y: 470..640`)
    // =========================================================================
    // 12 tiny 2x2 warm cream/gold sunbeam flour motes drifting lazily above Babci's dough board (x: 410..660, y: 470..640)
    const flourMoteColors = [0xfffbeb, 0xfef08a, 0xfde68a, 0xffffff];
    for (let i = 0; i < 12; i++) {
      const mx = Phaser.Math.Between(410, 660);
      const my = Phaser.Math.Between(470, 640);
      const mote = this.add.graphics();
      mote.fillStyle(flourMoteColors[i % flourMoteColors.length], 0.85);
      mote.fillRect(-1, -1, 2, 2);
      mote.setPosition(mx, my);
      mote.setDepth(18);
      this.stageContainer.add(mote);

      this.tweens.add({
        targets: mote,
        x: mx + Phaser.Math.Between(-18, 18),
        y: my - Phaser.Math.Between(14, 28),
        alpha: { from: 0.25, to: 0.78 },
        duration: 3400 + (i % 4) * 520,
        delay: i * 190,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    // Sort stageContainer children by their exact `.setDepth(...)` values
    this.stageContainer.sort('depth');
  }

  /**
   * Executes physical, multi-click repeatable Living-Books animations for each Colorado hotspot!
   */
  private runHotspotGagAnimation(
    spec: ColoradoHotspotSpec,
    actor: Phaser.GameObjects.Container,
    spriteImg: Phaser.GameObjects.Image | null,
    onDone: () => void
  ): void {
    switch (spec.action) {
      case 'thule-open': {
        // Rooftop Thule cargo box pops up on the Subaru's roof rails, bounces suitcases, and Sparky peeks out!
        this.tweens.add({
          targets: actor,
          y: spec.y - 22,
          scaleX: 1.14,
          scaleY: 1.18,
          angle: { from: -5, to: 5 },
          duration: 210,
          yoyo: true,
          repeat: 2,
          ease: 'Back.easeOut',
          onComplete: () => {
            actor.setPosition(spec.x, spec.y);
            actor.setScale(1);
            actor.setAngle(0);
            onDone();
          }
        });
        return;
      }

      case 'car-horn': {
        // Subaru Forester honks, flashes warm ADD-blend headlights, and puffs pixel exhaust rings from the tailpipe!
        AudioBus.playSfx('horn');
        const glowKey = this.textures.exists('cover-candle-glow') ? 'cover-candle-glow' : 'particle-star';
        const beam = this.add
          .image(865, 500, glowKey)
          .setOrigin(0.2, 0.5)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setTint(0xfef08a)
          .setScale(0.25, 0.14)
          .setAlpha(0);
        this.stageContainer.add(beam);

        this.tweens.add({
          targets: beam,
          scaleX: 2.3,
          scaleY: 1.0,
          alpha: 0.82,
          duration: 210,
          yoyo: true,
          repeat: 2,
          ease: 'Quad.easeOut',
          onComplete: () => beam.destroy()
        });

        for (let i = 0; i < 6; i++) {
          this.time.delayedCall(i * 120, () => {
            if (!this.scene.isActive()) return;
            const puffKey = this.textures.exists('spr-steam-puff') ? 'spr-steam-puff' : 'particle-star';
            const exhaust = this.add
              .image(195, 560, puffKey)
              .setScale(0.14)
              .setAlpha(0.85);
            this.stageContainer.add(exhaust);
            this.tweens.add({
              targets: exhaust,
              x: 110 - i * 12,
              y: 515 - i * 10,
              scaleX: 0.42,
              scaleY: 0.42,
              alpha: 0,
              duration: 680,
              ease: 'Sine.easeOut',
              onComplete: () => exhaust.destroy()
            });
          });
        }

        this.time.delayedCall(850, onDone);
        return;
      }

      case 'family-wave':
      case 'porch-welcome': {
        // Warm family / Grandpa & Babci wave + floating pixel hearts!
        for (let i = 0; i < 6; i++) {
          this.time.delayedCall(i * 130, () => {
            if (!this.scene.isActive()) return;
            const heart = this.add
              .text(
                spec.x + Phaser.Math.Between(-55, 55),
                spec.y - Phaser.Math.Between(35, 75),
                i % 2 === 0 ? '💛' : '❤️',
                { fontSize: '22px' }
              )
              .setOrigin(0.5);
            this.stageContainer.add(heart);
            this.tweens.add({
              targets: heart,
              y: heart.y - 65,
              alpha: 0,
              scaleX: 1.35,
              scaleY: 1.35,
              duration: 720,
              ease: 'Sine.easeOut',
              onComplete: () => heart.destroy()
            });
          });
        }

        if (spriteImg) {
          this.tweens.add({
            targets: actor,
            y: spec.y - 18,
            scaleX: 1.08,
            scaleY: 1.08,
            angle: { from: -4, to: 4 },
            duration: 210,
            yoyo: true,
            repeat: 2,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              actor.setPosition(spec.x, spec.y);
              actor.setScale(1);
              actor.setAngle(0);
              onDone();
            }
          });
        } else {
          this.time.delayedCall(750, onDone);
        }
        return;
      }

      case 'doggie-peek': {
        // Doggie pops up high from behind the round green shrub, squeak-barks, and tucks back down!
        this.tweens.add({
          targets: actor,
          y: spec.y - 46,
          scaleX: 1.16,
          scaleY: 1.16,
          angle: { from: -7, to: 7 },
          duration: 220,
          yoyo: true,
          hold: 340,
          ease: 'Back.easeOut',
          onComplete: () => {
            actor.setPosition(spec.x, spec.y);
            actor.setScale(1);
            actor.setAngle(0);
            onDone();
          }
        });
        return;
      }

      case 'hawk-soar':
      case 'eagle-swoop':
      case 'bluebirds-fly':
      case 'butterflies-flutter': {
        // Glides across the sky / flowers in a wide graceful flight loop!
        const travelX = spec.action === 'butterflies-flutter' ? 95 : 260;
        const travelY = spec.action === 'butterflies-flutter' ? 35 : 55;
        this.tweens.addCounter({
          from: 0,
          to: Math.PI * 2,
          duration: 1450,
          onUpdate: (tw) => {
            const t = tw.getValue() ?? 0;
            actor.x = spec.x + Math.sin(t) * travelX;
            actor.y = spec.y - Math.sin(t * 2) * travelY;
            actor.angle = Math.cos(t) * -8;
          },
          onComplete: () => {
            actor.setPosition(spec.x, spec.y);
            actor.setAngle(0);
            actor.setScale(1);
            onDone();
          }
        });
        return;
      }

      case 'skeeball-roll': {
        // Wooden Skee-Ball rolls up the left lane ramp, jumps into the 100-point ring, and bursts golden tickets!
        this.tweens.add({
          targets: actor,
          x: spec.x - 85,
          y: spec.y - 185,
          angle: 720,
          scaleX: 0.72,
          scaleY: 0.72,
          duration: 520,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            Juice.burstStars(this, spec.x - 85, spec.y - 185, 22, [0xfde047, 0xf59e0b, 0xffffff]);
            if (this.textures.exists('spr-ticket-burst')) {
              const tickets = this.add
                .image(spec.x + 25, spec.y - 80, 'spr-ticket-burst')
                .setScale(0.2)
                .setAlpha(0.95);
              this.stageContainer.add(tickets);
              this.tweens.add({
                targets: tickets,
                y: spec.y - 145,
                scaleX: 0.58,
                scaleY: 0.58,
                alpha: 0,
                duration: 780,
                ease: 'Back.easeOut',
                onComplete: () => tickets.destroy()
              });
            }
            this.tweens.add({
              targets: actor,
              x: spec.x,
              y: spec.y,
              angle: 0,
              scaleX: 1,
              scaleY: 1,
              delay: 180,
              duration: 360,
              ease: 'Bounce.easeOut',
              onComplete: onDone
            });
          }
        });
        return;
      }

      case 'claw-grab': {
        // Claw grabber slides horizontally across the top of the claw machine, drops down, and lifts Sparky plushie!
        this.tweens.add({
          targets: actor,
          x: spec.x - 38,
          duration: 260,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            this.tweens.add({
              targets: actor,
              y: spec.y + 68,
              scaleY: 1.12,
              duration: 320,
              yoyo: true,
              hold: 220,
              ease: 'Back.easeInOut',
              onComplete: () => {
                this.tweens.add({
                  targets: actor,
                  x: spec.x,
                  y: spec.y,
                  scaleX: 1,
                  scaleY: 1,
                  duration: 260,
                  ease: 'Sine.easeInOut',
                  onComplete: onDone
                });
              }
            });
          }
        });
        return;
      }

      case 'pony-rock': {
        // Coin-op mechanical riding pony rocks back and forth with floating musical notes!
        const noteIcons = ['🎵', '🎶', '⭐'];
        for (let i = 0; i < 5; i++) {
          this.time.delayedCall(i * 150, () => {
            if (!this.scene.isActive()) return;
            const note = this.add
              .text(spec.x + Phaser.Math.Between(-35, 35), spec.y - 55, noteIcons[i % noteIcons.length], {
                fontSize: '22px'
              })
              .setOrigin(0.5);
            this.stageContainer.add(note);
            this.tweens.add({
              targets: note,
              y: note.y - 55,
              x: note.x + (i % 2 === 0 ? -18 : 18),
              alpha: 0,
              duration: 640,
              ease: 'Sine.easeOut',
              onComplete: () => note.destroy()
            });
          });
        }

        this.tweens.add({
          targets: actor,
          angle: { from: -11, to: 11 },
          y: spec.y - 14,
          duration: 210,
          yoyo: true,
          repeat: 3,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            actor.setPosition(spec.x, spec.y);
            actor.setAngle(0);
            onDone();
          }
        });
        return;
      }

      case 'trout-leap': {
        // Rainbow trout emerges from beneath the river water, leaps high in a parabolic arc, and dives back under!
        AudioBus.playSfx('splash');
        if (spriteImg) {
          spriteImg.setAlpha(1);
        }

        // Expanding water splash rings at takeoff point
        for (let i = 0; i < 3; i++) {
          const ring = this.add.graphics();
          ring.lineStyle(3, 0xe0f2fe, 0.9);
          ring.strokeEllipse(0, 0, 28, 10);
          ring.setPosition(spec.x + 35, spec.y + 10);
          this.stageContainer.add(ring);
          this.tweens.add({
            targets: ring,
            scaleX: 3.2,
            scaleY: 2.6,
            alpha: 0,
            delay: i * 90,
            duration: 480,
            ease: 'Quad.easeOut',
            onComplete: () => ring.destroy()
          });
        }

        this.tweens.addCounter({
          from: 0,
          to: 1,
          duration: 920,
          onUpdate: (tw) => {
            const t = tw.getValue() ?? 0;
            actor.x = Phaser.Math.Linear(spec.x + 40, spec.x - 95, t);
            actor.y = spec.y - Math.sin(t * Math.PI) * 165;
            actor.angle = Phaser.Math.Linear(28, -38, t);
          },
          onComplete: () => {
            Juice.burstStars(this, spec.x - 95, spec.y, 14, [0x38bdf8, 0xe0f2fe, 0xffffff]);
            if (spriteImg && spec.hiddenAtRest) {
              spriteImg.setAlpha(0);
            }
            actor.setPosition(spec.x, spec.y);
            actor.setAngle(0);
            onDone();
          }
        });
        return;
      }

      case 'water-shoes-splash': {
        // Animated pixel splash rings & droplets around Wyatt's blue water shoes and Emma's hands!
        AudioBus.playSfx('splash');
        const splashPoints = [
          { x: 405, y: 625 },
          { x: 505, y: 605 }
        ];
        splashPoints.forEach((pt) => {
          for (let i = 0; i < 4; i++) {
            const ring = this.add.graphics();
            ring.lineStyle(3, 0xffffff, 0.92);
            ring.strokeEllipse(0, 0, 24, 9);
            ring.setPosition(pt.x, pt.y);
            this.stageContainer.add(ring);
            this.tweens.add({
              targets: ring,
              scaleX: 3.6,
              scaleY: 2.8,
              alpha: 0,
              delay: i * 110,
              duration: 520,
              ease: 'Quad.easeOut',
              onComplete: () => ring.destroy()
            });
          }
        });
        this.time.delayedCall(680, onDone);
        return;
      }

      case 'gondola-glide': {
        // Red Royal Gorge gondola glides all the way across the overhead canyon cable and back on next click!
        const startX = this.gondolaAtRightSide ? 860 : 420;
        const startY = this.gondolaAtRightSide ? 145 : 155;
        const targetX = this.gondolaAtRightSide ? 420 : 860;
        const targetY = this.gondolaAtRightSide ? 155 : 145;
        this.gondolaAtRightSide = !this.gondolaAtRightSide;

        actor.setPosition(startX, startY);
        this.tweens.add({
          targets: actor,
          x: targetX,
          y: targetY,
          angle: { from: -4, to: 4 },
          duration: 1650,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            actor.setAngle(0);
            Juice.burstStars(this, targetX, targetY, 14, [0xef4444, 0xfde047, 0xffffff]);
            onDone();
          }
        });
        return;
      }

      case 'train-horn-pull': {
        // Wyatt pulls the brass horn cord down into his hand, blasts the horn, shakes camera, and puffs canyon steam!
        AudioBus.playSfx('horn');
        this.cameras.main.shake(680, 0.008);

        for (let i = 0; i < 5; i++) {
          this.time.delayedCall(i * 130, () => {
            if (!this.scene.isActive()) return;
            const steamX = spec.x + (i % 2 === 0 ? -55 : 55);
            const steamY = spec.y - 55 - i * 15;
            const puffKey = this.textures.exists('spr-steam-puff') ? 'spr-steam-puff' : 'particle-star';
            const steam = this.add
              .image(steamX, steamY, puffKey)
              .setScale(0.2)
              .setAlpha(0.95);
            this.stageContainer.add(steam);

            this.tweens.add({
              targets: steam,
              y: steamY - 95,
              x: steamX + (i % 2 === 0 ? -45 : 45),
              scaleX: 0.68,
              scaleY: 0.68,
              alpha: 0,
              duration: 920,
              ease: 'Cubic.easeOut',
              onComplete: () => steam.destroy()
            });
          });
        }

        this.tweens.add({
          targets: actor,
          y: spec.y + 24,
          scaleY: 1.14,
          scaleX: 0.94,
          duration: 190,
          yoyo: true,
          repeat: 2,
          ease: 'Back.easeOut',
          onComplete: () => {
            actor.setPosition(spec.x, spec.y);
            actor.setScale(1);
            onDone();
          }
        });
        return;
      }

      case 'train-steam-chug': {
        // Vista dome train cars ahead puff rhythmic white steam clouds up into the canyon!
        for (let i = 0; i < 6; i++) {
          this.time.delayedCall(i * 150, () => {
            if (!this.scene.isActive()) return;
            const puffKey = this.textures.exists('spr-steam-puff') ? 'spr-steam-puff' : 'particle-star';
            const puff = this.add
              .image(spec.x + Phaser.Math.Between(-35, 35), spec.y - 20, puffKey)
              .setScale(0.16)
              .setAlpha(0.9);
            this.stageContainer.add(puff);
            this.tweens.add({
              targets: puff,
              y: spec.y - 110 - i * 12,
              x: puff.x - 30,
              scaleX: 0.52,
              scaleY: 0.52,
              alpha: 0,
              duration: 780,
              ease: 'Sine.easeOut',
              onComplete: () => puff.destroy()
            });
          });
        }
        this.time.delayedCall(900, onDone);
        return;
      }

      case 'kayak-paddle': {
        // Whitewater kayaker bobs and paddles down the rushing river rapids!
        this.tweens.add({
          targets: actor,
          x: spec.x - 55,
          y: spec.y + 28,
          angle: { from: -9, to: 9 },
          duration: 460,
          yoyo: true,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            actor.setPosition(spec.x, spec.y);
            actor.setAngle(0);
            onDone();
          }
        });
        return;
      }

      case 'wagon-roll': {
        // Barefoot Mom/Rita pulls Wyatt and laughing Emma in the red Radio Flyer wagon all the way across Babci's green lawn!
        AudioBus.playSfx('giggle');
        this.tweens.add({
          targets: actor,
          x: spec.x - 210,
          y: spec.y + 12,
          angle: { from: -2.5, to: 2.5 },
          duration: 820,
          yoyo: true,
          ease: 'Quad.easeInOut',
          onComplete: () => {
            actor.setPosition(spec.x, spec.y);
            actor.setAngle(0);
            onDone();
          }
        });
        return;
      }

      case 'golf-putt': {
        // Putts a crisp white golf ball across the green putting turf straight into the golf hole at (422, 514)!
        const cupX = 422;
        const cupY = 514;
        const ball = this.add.circle(spec.x + 14, spec.y + 8, 6, 0xffffff, 1).setStrokeStyle(2, 0x334155, 1);
        this.stageContainer.add(ball);

        this.tweens.add({
          targets: ball,
          x: cupX,
          y: cupY,
          scaleX: 0.45,
          scaleY: 0.45,
          duration: 540,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            ball.destroy();
            AudioBus.playSfx('fanfare');
            Juice.burstStars(this, cupX, cupY - 20, 24, [0xfde047, 0x4ade80, 0xef4444, 0xffffff]);
            onDone();
          }
        });

        this.tweens.add({
          targets: actor,
          angle: { from: -12, to: 12 },
          duration: 180,
          yoyo: true,
          onComplete: () => actor.setAngle(0)
        });
        return;
      }

      case 'pierogi-flip': {
        // Cast-iron skillet on the front-right burner sizzles and flips golden pierogis high into the air!
        this.tweens.add({
          targets: actor,
          y: spec.y - 95,
          angle: 360,
          scaleX: 1.18,
          scaleY: 1.18,
          duration: 560,
          yoyo: true,
          ease: 'Back.easeOut',
          onComplete: () => {
            actor.setPosition(spec.x, spec.y);
            actor.setAngle(0);
            actor.setScale(1);
            onDone();
          }
        });
        return;
      }

      case 'flour-puff': {
        // Wooden rolling pin rocks on the island and puffs white pixel flour clouds onto Wyatt & Emma's noses!
        AudioBus.playSfx('sneeze');
        for (let i = 0; i < 8; i++) {
          const cloud = this.add.graphics();
          cloud.fillStyle(0xffffff, 0.88);
          cloud.fillCircle(0, 0, Phaser.Math.Between(14, 26));
          cloud.setPosition(
            spec.x + Phaser.Math.Between(-30, 40),
            spec.y + Phaser.Math.Between(-18, 10)
          );
          this.stageContainer.add(cloud);

          this.tweens.add({
            targets: cloud,
            x: 560 + Phaser.Math.Between(-45, 55),
            y: 405 + Phaser.Math.Between(-25, 20),
            scaleX: 1.75,
            scaleY: 1.75,
            alpha: 0,
            duration: 800 + i * 70,
            ease: 'Cubic.easeOut',
            onComplete: () => cloud.destroy()
          });
        }

        this.tweens.add({
          targets: actor,
          x: { from: spec.x - 14, to: spec.x + 14 },
          angle: { from: -8, to: 8 },
          duration: 160,
          yoyo: true,
          repeat: 2,
          onComplete: () => {
            actor.setPosition(spec.x, spec.y);
            actor.setAngle(0);
            onDone();
          }
        });
        return;
      }

      case 'doggie-chef-treat': {
        // Chef Doggie hops up in a high arc to catch a golden pierogi treat!
        const treat = this.add
          .ellipse(620, 480, 26, 16, 0xfde047, 1)
          .setStrokeStyle(2, 0xb45309, 1);
        this.stageContainer.add(treat);

        this.tweens.addCounter({
          from: 0,
          to: 1,
          duration: 460,
          onUpdate: (tw) => {
            const t = tw.getValue() ?? 0;
            treat.x = Phaser.Math.Linear(620, spec.x, t);
            treat.y = Phaser.Math.Linear(480, spec.y - 65, t) - Math.sin(t * Math.PI) * 95;
            treat.angle = t * 360;
          },
          onComplete: () => {
            treat.destroy();
            Juice.burstStars(this, spec.x, spec.y - 65, 16, [0xfde047, 0xf472b6, 0xffffff]);
          }
        });

        this.tweens.add({
          targets: actor,
          y: spec.y - 65,
          scaleX: 1.15,
          scaleY: 1.15,
          delay: 220,
          duration: 240,
          yoyo: true,
          ease: 'Back.easeOut',
          onComplete: () => {
            actor.setPosition(spec.x, spec.y);
            actor.setScale(1);
            onDone();
          }
        });
        return;
      }

      default: {
        // Joyful Living-Books squash-and-stretch hop
        this.tweens.add({
          targets: actor,
          y: spec.y - 26,
          scaleX: 1.14,
          scaleY: 1.14,
          angle: { from: -7, to: 7 },
          duration: 210,
          yoyo: true,
          repeat: 1,
          ease: 'Back.easeOut',
          onComplete: () => {
            actor.setPosition(spec.x, spec.y);
            actor.setAngle(0);
            actor.setScale(1);
            onDone();
          }
        });
      }
    }
  }
}
