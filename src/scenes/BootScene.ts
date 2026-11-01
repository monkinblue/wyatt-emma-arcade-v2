/**
 * BootScene.ts
 * ------------
 * Preloads assets and generates crisp procedural 2D Canvas/WebGL textures for:
 * - Sparky (Wyatt's friendly emerald-and-gold cloud dragon)
 * - Doggie (Emma's fluffy white stuffed dog sidekick)
 * - Stars, particles, and UI emblems
 * Then transitions cleanly into HubScene.
 */

import Phaser from 'phaser';
import { AudioBus } from '../core/AudioBus';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  /**
   * Explicitly preloads our Clean-Plate Page 1 background (`p1-bg-clean.jpg`), all staged page
   * paintings (`p2`, `p3`, `p5`..`p9`), and Page 1's transparent multi-frame `.png` spritesheets
   * (`p1-doggie.png`, `p1-sparky.png`, `p1-jet.png`) so `this.textures.exists(...)` is 100% true
   * on Frame 0 when entering `StoryEngineScene`!
   */
  public preload(): void {
    // 0a. Hub Heirloom Bookshelf, 3 Mode Objects & 3 Individual Book Sprites
    this.load.image('bookshelf-bg', '/assets/hub/bookshelf-bg.jpg?v=hub2');
    this.load.image('mode-read', '/assets/hub/sprites/mode-read.png?v=hub2');
    this.load.image('mode-arcade', '/assets/hub/sprites/mode-arcade.png?v=hub2');
    this.load.image('mode-create', '/assets/hub/sprites/mode-create.png?v=hub2');
    this.load.image('book-nana', '/assets/hub/sprites/book-nana.png?v=hub2');
    this.load.image('book-grandpa-bapci', '/assets/hub/sprites/book-grandpa-bapci.png?v=hub2');
    this.load.image('book-louisiana', '/assets/hub/sprites/book-louisiana.png?v=hub2');
    this.load.image('shelf-sparky', '/assets/hub/sprites/shelf-sparky.png?v=hub2');

    // 0b. Heirloom Leather & Gold-Leaf Cover Page
    this.load.image('story-bg-just-nana-and-us-cover', '/assets/stories/nana/cover-bg.jpg');

    // 1. Page 1 & Page 2 Clean Plates & Pixel-Contour Occluders
    this.load.image('story-bg-just-nana-and-us-p1', '/assets/stories/nana/p1-bg-clean.jpg');
    this.load.image('story-bg-just-nana-and-us-p1-clean', '/assets/stories/nana/p1-bg-clean.jpg');
    this.load.image('p1-window-occluder', '/assets/stories/nana/sprites/p1-window-occluder.png');

    this.load.image('story-bg-just-nana-and-us-p2', '/assets/stories/nana/p2-bg-clean.jpg?v=p2fix4');
    this.load.image('story-bg-just-nana-and-us-p2-clean', '/assets/stories/nana/p2-bg-clean.jpg?v=p2fix4');
    this.load.image('p2-bush-occluder', '/assets/stories/nana/sprites/p2-bush-occluder.png?v=p2fix2');
    this.load.image('p2-left-bush-occluder', '/assets/stories/nana/sprites/p2-left-bush-occluder.png?v=p2fix2');
    this.load.image('p2-weeping-bush-occluder', '/assets/stories/nana/sprites/p2-weeping-bush-occluder.png?v=p2fix2');

    this.load.image('story-bg-just-nana-and-us-p3', '/assets/stories/nana/p3-bg-clean.jpg?v=p3clean5');
    this.load.image('story-bg-just-nana-and-us-p3-clean', '/assets/stories/nana/p3-bg-clean.jpg?v=p3clean5');
    this.load.image('p3-lampshade-occluder', '/assets/stories/nana/sprites/p3-lampshade-occluder.png?v=p3clean5');

    this.load.image('story-bg-just-nana-and-us-p4', '/assets/stories/nana/p4-bg-clean.jpg?v=p4final2');
    this.load.image('story-bg-just-nana-and-us-p4-clean', '/assets/stories/nana/p4-bg-clean.jpg?v=p4final2');
    this.load.image('p4-car-occluder', '/assets/stories/nana/sprites/p4-car-occluder.png?v=p4final2');
    this.load.image('p4-shovel-occluder', '/assets/stories/nana/sprites/p4-shovel-occluder.png?v=p4final2');

    this.load.image('p6-bg-clean', '/assets/stories/nana/p6-bg-clean.jpg?v=p6final');
    this.load.image('story-bg-just-nana-and-us-p6', '/assets/stories/nana/p6-bg-clean.jpg?v=p6final');
    this.load.image('story-bg-just-nana-and-us-p6-clean', '/assets/stories/nana/p6-bg-clean.jpg?v=p6final');

    this.load.image('p7-bg-clean', '/assets/stories/nana/p7-bg-clean.jpg?v=p7fix2');
    this.load.image('story-bg-just-nana-and-us-p7', '/assets/stories/nana/p7-bg-clean.jpg?v=p7fix2');
    this.load.image('story-bg-just-nana-and-us-p7-clean', '/assets/stories/nana/p7-bg-clean.jpg?v=p7fix2');
    this.load.image('p7-chair-cover', '/assets/stories/nana/sprites/p7-chair-cover.png?v=p7fix2');

    this.load.image('p8-bg-clean', '/assets/stories/nana/p8-bg-clean.jpg?v=p8final');
    this.load.image('story-bg-just-nana-and-us-p8', '/assets/stories/nana/p8-bg-clean.jpg?v=p8final');
    this.load.image('story-bg-just-nana-and-us-p8-clean', '/assets/stories/nana/p8-bg-clean.jpg?v=p8final');
    this.load.image('p8-lower-railing-occluder', '/assets/stories/nana/sprites/p8-lower-railing-occluder.png?v=p8final');

    this.load.image('p9-bg-clean', '/assets/stories/nana/p9-bg-clean.jpg?v=p9final');
    this.load.image('story-bg-just-nana-and-us-p9', '/assets/stories/nana/p9-bg-clean.jpg?v=p9final');
    this.load.image('story-bg-just-nana-and-us-p9-clean', '/assets/stories/nana/p9-bg-clean.jpg?v=p9final');
    this.load.image('p9-stove-frame-occluder', '/assets/stories/nana/sprites/p9-stove-frame-occluder.png?v=p9final');

    // 3. Page 1 Transparent Spritesheets (verified exact pixel dimensions on disk):
    // - p1-doggie.png: 2248x562 total -> 4 frames of 562x562
    this.load.spritesheet('p1-sprite-doggie', '/assets/stories/nana/sprites/p1-doggie.png', {
      frameWidth: 562,
      frameHeight: 562
    });
    // - p1-sparky.png: 2298x764 total -> 3 frames of 766x764
    this.load.spritesheet('p1-sprite-sparky', '/assets/stories/nana/sprites/p1-sparky.png', {
      frameWidth: 766,
      frameHeight: 764
    });
    // - p1-jet.png: 2586x906 total -> 1 frame of 2586x906
    this.load.spritesheet('p1-sprite-jet', '/assets/stories/nana/sprites/p1-jet.png', {
      frameWidth: 2586,
      frameHeight: 906
    });
    // - p1-family.png: 3870x966 total -> 3 frames of 1290x966 (open arms -> embrace -> big squished group hug)
    this.load.spritesheet('p1-sprite-family', '/assets/stories/nana/sprites/p1-family.png', {
      frameWidth: 1290,
      frameHeight: 966
    });

    // 4. Page 2 Transparent Spritesheets (verified exact pixel dimensions on disk):
    // - p2-porch.png: 2592x1122 total -> 3 frames of 864x1122
    this.load.spritesheet('p2-sprite-porch', '/assets/stories/nana/sprites/p2-porch.png', {
      frameWidth: 864,
      frameHeight: 1122
    });
    // - p2-kids.png: 2598x842 total -> 3 frames of 866x842
    this.load.spritesheet('p2-sprite-kids', '/assets/stories/nana/sprites/p2-kids.png', {
      frameWidth: 866,
      frameHeight: 842
    });
    // - p2-mailbox.png: 2052x906 total -> 3 frames of 684x906
    this.load.spritesheet('p2-sprite-mailbox', '/assets/stories/nana/sprites/p2-mailbox.png?v=p2fix2', {
      frameWidth: 684,
      frameHeight: 906
    });
    // - p2-squirrel.png: 2766x966 total -> 3 frames of 922x966
    this.load.spritesheet('p2-sprite-squirrel', '/assets/stories/nana/sprites/p2-squirrel.png', {
      frameWidth: 922,
      frameHeight: 966
    });
    // - p2-sparky-bush.png: 2562x706 total -> 3 frames of 854x706
    this.load.spritesheet('p2-sprite-sparky-bush', '/assets/stories/nana/sprites/p2-sparky-bush.png', {
      frameWidth: 854,
      frameHeight: 706
    });
    // - p2-doggie-bush.png: 2592x1012 total -> 3 frames of 864x1012
    this.load.spritesheet('p2-sprite-doggie-bush', '/assets/stories/nana/sprites/p2-doggie-bush.png', {
      frameWidth: 864,
      frameHeight: 1012
    });
    // - p2-maple.png: 2520x824 total -> 3 frames of 840x824 (Japanese red maple wind gust + cardinal pop)
    this.load.spritesheet('p2-sprite-maple', '/assets/stories/nana/sprites/p2-maple.png?v=p2fix3', {
      frameWidth: 840,
      frameHeight: 824
    });

    // 5. Page 3 Transparent Spritesheets (verified exact pixel dimensions on disk):
    // - p3-clock.png: 1296x736 total -> 3 frames of 432x736
    this.load.spritesheet('p3-sprite-clock', '/assets/stories/nana/sprites/p3-clock.png?v=p3clean5', {
      frameWidth: 432,
      frameHeight: 736
    });
    // - p3-doggie.png: 1218x568 total -> 3 frames of 406x568
    this.load.spritesheet('p3-sprite-doggie', '/assets/stories/nana/sprites/p3-doggie.png?v=p3clean5', {
      frameWidth: 406,
      frameHeight: 568
    });
    // - p3-sparky-cookies.png: 1350x420 total -> 3 frames of 450x420
    this.load.spritesheet('p3-sprite-sparky-cookies', '/assets/stories/nana/sprites/p3-sparky-cookies.png?v=p3clean5', {
      frameWidth: 450,
      frameHeight: 420
    });
    // - p3-grammy-kids.png: 1374x582 total -> 3 frames of 458x582
    this.load.spritesheet('p3-sprite-grammy-kids', '/assets/stories/nana/sprites/p3-grammy-kids.png?v=p3clean5', {
      frameWidth: 458,
      frameHeight: 582
    });
    // - p3-painting-1.png: 1254x552 total -> 3 frames of 418x552
    this.load.spritesheet('p3-sprite-painting-1', '/assets/stories/nana/sprites/p3-painting-1.png?v=p3clean5', {
      frameWidth: 418,
      frameHeight: 552
    });
    // - p3-painting-2.png: 1098x614 total -> 3 frames of 366x614
    this.load.spritesheet('p3-sprite-painting-2', '/assets/stories/nana/sprites/p3-painting-2.png?v=p3clean5', {
      frameWidth: 366,
      frameHeight: 614
    });
    // - p3-painting-3.png: 1272x668 total -> 3 frames of 424x668
    this.load.spritesheet('p3-sprite-painting-3', '/assets/stories/nana/sprites/p3-painting-3.png?v=p3clean5', {
      frameWidth: 424,
      frameHeight: 668
    });
    // - p3-photo-1.png: 1296x620 total -> 3 frames of 432x620
    this.load.spritesheet('p3-sprite-photo-1', '/assets/stories/nana/sprites/p3-photo-1.png?v=p3clean5', {
      frameWidth: 432,
      frameHeight: 620
    });
    // - p3-photo-2.png: 1308x510 total -> 3 frames of 436x510
    this.load.spritesheet('p3-sprite-photo-2', '/assets/stories/nana/sprites/p3-photo-2.png?v=p3clean5', {
      frameWidth: 436,
      frameHeight: 510
    });
    // - p3-photo-3.png: 1344x396 total -> 3 frames of 448x396
    this.load.spritesheet('p3-sprite-photo-3', '/assets/stories/nana/sprites/p3-photo-3.png?v=p3clean5', {
      frameWidth: 448,
      frameHeight: 396
    });
    // - p3-photo-4.png: 1140x476 total -> 3 frames of 380x476
    this.load.spritesheet('p3-sprite-photo-4', '/assets/stories/nana/sprites/p3-photo-4.png?v=p3clean5', {
      frameWidth: 380,
      frameHeight: 476
    });

    // 6. Page 4 Transparent Spritesheets (verified exact pixel dimensions on disk):
    // - p4-car-doggie.png: 2670x752 total -> 3 frames of 890x752
    this.load.spritesheet('p4-sprite-car-doggie', '/assets/stories/nana/sprites/p4-car-doggie.png?v=p4final', {
      frameWidth: 890,
      frameHeight: 752
    });
    // - p4-hutch-items.png: 2562x1120 total -> 3 frames of 854x1120
    this.load.spritesheet('p4-sprite-hutch-items', '/assets/stories/nana/sprites/p4-hutch-items.png?v=p4final', {
      frameWidth: 854,
      frameHeight: 1120
    });
    // - p4-cardboard-box.png: 2658x810 total -> 3 frames of 886x810
    this.load.spritesheet('p4-sprite-cardboard-box', '/assets/stories/nana/sprites/p4-cardboard-box.png?v=p4final', {
      frameWidth: 886,
      frameHeight: 810
    });
    // - p4-wall-oven.png: 1152x688 total -> 3 frames of 384x688
    this.load.spritesheet('p4-sprite-wall-oven', '/assets/stories/nana/sprites/p4-wall-oven.png?v=p4final', {
      frameWidth: 384,
      frameHeight: 688
    });
    // - p4-wreath.png: 1356x478 total -> 3 frames of 452x478
    this.load.spritesheet('p4-sprite-wreath', '/assets/stories/nana/sprites/p4-wreath.png?v=p4final', {
      frameWidth: 452,
      frameHeight: 478
    });
    // - p4-compressor.png: 918x624 total -> 3 frames of 306x624
    this.load.spritesheet('p4-sprite-compressor', '/assets/stories/nana/sprites/p4-compressor.png?v=p4final', {
      frameWidth: 306,
      frameHeight: 624
    });
    // - p4-leaf-blower.png: 1386x258 total -> 3 frames of 462x258
    this.load.spritesheet('p4-sprite-leaf-blower', '/assets/stories/nana/sprites/p4-leaf-blower.png?v=p4final', {
      frameWidth: 462,
      frameHeight: 258
    });
    // - p4-sparky-cabinet.png: 1104x314 total -> 3 frames of 368x314
    this.load.spritesheet('p4-sprite-sparky-cabinet', '/assets/stories/nana/sprites/p4-sparky-cabinet.png?v=p4final', {
      frameWidth: 368,
      frameHeight: 314
    });

    // 7. Page 6 (Dutch Village) Transparent Spritesheets (verified exact pixel dimensions on disk):
    // - p6-family.png: 990x288 total -> 3 frames of 330x288
    this.load.spritesheet('p6-sprite-family', '/assets/stories/nana/sprites/p6-family.png?v=p6final', {
      frameWidth: 330,
      frameHeight: 288
    });
    // - p6-clogs-doggie.png: 984x332 total -> 3 frames of 328x332
    this.load.spritesheet('p6-sprite-clogs-doggie', '/assets/stories/nana/sprites/p6-clogs-doggie.png?v=p6final', {
      frameWidth: 328,
      frameHeight: 332
    });
    // - p6-sparky-planter.png: 978x410 total -> 3 frames of 326x410
    this.load.spritesheet('p6-sprite-sparky-planter', '/assets/stories/nana/sprites/p6-sparky-planter.png?v=p6final', {
      frameWidth: 326,
      frameHeight: 410
    });
    // - p6-chimney-stork.png: 990x434 total -> 3 frames of 330x434
    this.load.spritesheet('p6-sprite-chimney-stork', '/assets/stories/nana/sprites/p6-chimney-stork.png?v=p6final', {
      frameWidth: 330,
      frameHeight: 434
    });
    // - p6-dutch-door.png: 864x490 total -> 3 frames of 288x490
    this.load.spritesheet('p6-sprite-dutch-door', '/assets/stories/nana/sprites/p6-dutch-door.png?v=p6final', {
      frameWidth: 288,
      frameHeight: 490
    });
    // - p6-window-cat.png: 882x318 total -> 3 frames of 294x318
    this.load.spritesheet('p6-sprite-window-cat', '/assets/stories/nana/sprites/p6-window-cat.png?v=p6final', {
      frameWidth: 294,
      frameHeight: 318
    });
    // - p6-butterflies.png: 882x422 total -> 3 frames of 294x422
    this.load.spritesheet('p6-sprite-butterflies', '/assets/stories/nana/sprites/p6-butterflies.png?v=p6final', {
      frameWidth: 294,
      frameHeight: 422
    });
    // - p6-windmill-sails.png: 1074x348 total -> 3 frames of 358x348
    this.load.spritesheet('p6-sprite-windmill-sails', '/assets/stories/nana/sprites/p6-windmill-sails.png?v=p6final', {
      frameWidth: 358,
      frameHeight: 348
    });
    // - p6-ferris-wheel.png: 1056x392 total -> 3 frames of 352x392
    this.load.spritesheet('p6-sprite-ferris-wheel', '/assets/stories/nana/sprites/p6-ferris-wheel.png?v=p6final', {
      frameWidth: 352,
      frameHeight: 392
    });

    // 8. Page 7 (Lake Michigan Beach) Transparent Spritesheets (verified exact pixel dimensions on disk):
    // - p7-papa-skipping.png: 972x268 total -> 3 frames of 324x268
    this.load.spritesheet('p7-sprite-papa-skipping', '/assets/stories/nana/sprites/p7-papa-skipping.png?v=p7final', {
      frameWidth: 324,
      frameHeight: 268
    });
    // - p7-kids-sandcastle.png: 1032x302 total -> 3 frames of 344x302
    this.load.spritesheet('p7-sprite-kids-sandcastle', '/assets/stories/nana/sprites/p7-kids-sandcastle.png?v=p7final', {
      frameWidth: 344,
      frameHeight: 302
    });
    // - p7-nana-chair.png: 870x390 total -> 3 frames of 290x390
    this.load.spritesheet('p7-sprite-nana-chair', '/assets/stories/nana/sprites/p7-nana-chair.png?v=p7final', {
      frameWidth: 290,
      frameHeight: 390
    });
    // - p7-doggie-towel.png: 918x270 total -> 3 frames of 306x270
    this.load.spritesheet('p7-sprite-doggie-towel', '/assets/stories/nana/sprites/p7-doggie-towel.png?v=p7final', {
      frameWidth: 306,
      frameHeight: 270
    });
    // - p7-seagulls-bucket.png: 894x300 total -> 3 frames of 298x300
    this.load.spritesheet('p7-sprite-seagulls-bucket', '/assets/stories/nana/sprites/p7-seagulls-bucket.png?v=p7final', {
      frameWidth: 298,
      frameHeight: 300
    });
    // - p7-sparky-grill.png: 1026x276 total -> 3 frames of 342x276
    this.load.spritesheet('p7-sprite-sparky-grill', '/assets/stories/nana/sprites/p7-sparky-grill.png?v=p7fix2', {
      frameWidth: 342,
      frameHeight: 276
    });
    // - p7-sailboat-horizon.png: 846x302 total -> 3 frames of 282x302
    this.load.spritesheet('p7-sprite-sailboat-horizon', '/assets/stories/nana/sprites/p7-sailboat-horizon.png?v=p7final', {
      frameWidth: 282,
      frameHeight: 302
    });
    // - p7-beach-ball.png: 966x418 total -> 3 frames of 322x418
    this.load.spritesheet('p7-sprite-beach-ball', '/assets/stories/nana/sprites/p7-beach-ball.png?v=p7final', {
      frameWidth: 322,
      frameHeight: 418
    });

    // 9. Page 8 (Woodland Cabin) Transparent Spritesheets (verified exact pixel dimensions on disk):
    // - p8-kids-running.png: 924x224 total -> 3 frames of 308x224
    this.load.spritesheet('p8-sprite-kids-running', '/assets/stories/nana/sprites/p8-kids-running.png?v=p8final', {
      frameWidth: 308,
      frameHeight: 224
    });
    // - p8-nana-porch.png: 1032x472 total -> 3 frames of 344x472
    this.load.spritesheet('p8-sprite-nana-porch', '/assets/stories/nana/sprites/p8-nana-porch.png?v=p8final', {
      frameWidth: 344,
      frameHeight: 472
    });
    // - p8-sparky-chimney.png: 972x294 total -> 3 frames of 324x294
    this.load.spritesheet('p8-sprite-sparky-chimney', '/assets/stories/nana/sprites/p8-sparky-chimney.png?v=p8final', {
      frameWidth: 324,
      frameHeight: 294
    });
    // - p8-forest-deer.png: 936x390 total -> 3 frames of 312x390
    this.load.spritesheet('p8-sprite-forest-deer', '/assets/stories/nana/sprites/p8-forest-deer.png?v=p8final', {
      frameWidth: 312,
      frameHeight: 390
    });
    // - p8-canada-geese.png: 1104x288 total -> 3 frames of 368x288
    this.load.spritesheet('p8-sprite-canada-geese', '/assets/stories/nana/sprites/p8-canada-geese.png?v=p8final', {
      frameWidth: 368,
      frameHeight: 288
    });
    // - p8-wind-chimes.png: 1284x408 total -> 3 frames of 428x408
    this.load.spritesheet('p8-sprite-wind-chimes', '/assets/stories/nana/sprites/p8-wind-chimes.png?v=p8final', {
      frameWidth: 428,
      frameHeight: 408
    });
    // - p8-doggie-cellar.png: 972x238 total -> 3 frames of 324x238
    this.load.spritesheet('p8-sprite-doggie-cellar', '/assets/stories/nana/sprites/p8-doggie-cellar.png?v=p8final', {
      frameWidth: 324,
      frameHeight: 238
    });
    // - p8-bluejay-porch.png: 888x302 total -> 3 frames of 296x302
    this.load.spritesheet('p8-sprite-bluejay-porch', '/assets/stories/nana/sprites/p8-bluejay-porch.png?v=p8final', {
      frameWidth: 296,
      frameHeight: 302
    });

    // 10. Page 9 (Cozy Cabin Bedtime) Transparent Spritesheets (verified exact pixel dimensions on disk):
    // - p9-stove-fire.png: 852x226 total -> 3 frames of 284x226
    this.load.spritesheet('p9-sprite-stove-fire', '/assets/stories/nana/sprites/p9-stove-fire.png?v=p9final', {
      frameWidth: 284,
      frameHeight: 226
    });
    // - p9-doggie-sleeping.png: 840x168 total -> 3 frames of 280x168
    this.load.spritesheet('p9-sprite-doggie-sleeping', '/assets/stories/nana/sprites/p9-doggie-sleeping.png?v=p9final', {
      frameWidth: 280,
      frameHeight: 168
    });

    // 11. Preload "The End" music-box chord SFX, Hub Bookshelf SFX & all Page 1..9 MP3 narration & SFX
    this.load.audio('sfx-the-end', 'assets/stories/nana/audio/sfx-the-end.mp3');
    this.load.audio('sfx-book-select', 'assets/hub/audio/sfx-book-select.mp3');
    this.load.audio('sfx-book-locked', 'assets/hub/audio/sfx-book-locked.mp3');
    AudioBus.registerSfx('sfx-the-end', ['/assets/stories/nana/audio/sfx-the-end.mp3'], 0.65);
    AudioBus.registerSfx('sfx-book-select', ['/assets/hub/audio/sfx-book-select.mp3'], 0.9);
    AudioBus.registerSfx('sfx-book-locked', ['/assets/hub/audio/sfx-book-locked.mp3'], 0.85);
    AudioBus.preloadPage1Audio();
  }

  public create(): void {
    this.generateSharedTextures();
    this.applyPixelArtFilteringAndAnims();
    AudioBus.startCozyLoop();
    void this.preloadAvailableStoryBackgrounds().finally(() => {
      this.scene.start('HubScene');
    });
  }

  private applyPixelArtFilteringAndAnims(): void {
    const texKeys = [
      'story-bg-just-nana-and-us-cover',
      'story-bg-just-nana-and-us-p1',
      'story-bg-just-nana-and-us-p1-clean',
      'p1-window-occluder',
      'story-bg-just-nana-and-us-p2',
      'story-bg-just-nana-and-us-p2-clean',
      'p2-bush-occluder',
      'p2-left-bush-occluder',
      'p2-weeping-bush-occluder',
      'story-bg-just-nana-and-us-p3',
      'story-bg-just-nana-and-us-p3-clean',
      'p3-lampshade-occluder',
      'story-bg-just-nana-and-us-p5',
      'p6-bg-clean',
      'story-bg-just-nana-and-us-p6',
      'story-bg-just-nana-and-us-p6-clean',
      'story-bg-just-nana-and-us-p7',
      'story-bg-just-nana-and-us-p8',
      'story-bg-just-nana-and-us-p9',
      'p1-sprite-doggie',
      'p1-sprite-sparky',
      'p1-sprite-jet',
      'p1-sprite-family',
      'p1-pixel-smoke-puff',
      'p1-pixel-heart',
      'p2-sprite-porch',
      'p2-sprite-kids',
      'p2-sprite-mailbox',
      'p2-sprite-squirrel',
      'p2-sprite-sparky-bush',
      'p2-sprite-doggie-bush',
      'p2-sprite-maple',
      'p2-pixel-acorn',
      'p2-pixel-maple-leaf',
      'p2-pixel-cardinal',
      'p3-sprite-clock',
      'p3-sprite-doggie',
      'p3-sprite-sparky-cookies',
      'p3-sprite-grammy-kids',
      'p3-sprite-painting-1',
      'p3-sprite-painting-2',
      'p3-sprite-painting-3',
      'p3-sprite-photo-1',
      'p3-sprite-photo-2',
      'p3-sprite-photo-3',
      'p3-sprite-photo-4',
      'p3-pixel-bee',
      'p3-pixel-note',
      'story-bg-just-nana-and-us-p4',
      'story-bg-just-nana-and-us-p4-clean',
      'p4-car-occluder',
      'p4-shovel-occluder',
      'p4-sprite-car-doggie',
      'p4-sprite-hutch-items',
      'p4-sprite-cardboard-box',
      'p4-sprite-wall-oven',
      'p4-sprite-wreath',
      'p4-sprite-compressor',
      'p4-sprite-leaf-blower',
      'p4-sprite-sparky-cabinet',
      'p6-sprite-family',
      'p6-sprite-clogs-doggie',
      'p6-sprite-sparky-planter',
      'p6-sprite-chimney-stork',
      'p6-sprite-dutch-door',
      'p6-sprite-window-cat',
      'p6-sprite-butterflies',
      'p6-sprite-windmill-sails',
      'p6-sprite-ferris-wheel',
      'p7-bg-clean',
      'story-bg-just-nana-and-us-p7-clean',
      'p7-chair-cover',
      'p7-sprite-papa-skipping',
      'p7-sprite-kids-sandcastle',
      'p7-sprite-nana-chair',
      'p7-sprite-doggie-towel',
      'p7-sprite-seagulls-bucket',
      'p7-sprite-sparky-grill',
      'p7-sprite-sailboat-horizon',
      'p7-sprite-beach-ball',
      'p8-bg-clean',
      'story-bg-just-nana-and-us-p8',
      'story-bg-just-nana-and-us-p8-clean',
      'p8-lower-railing-occluder',
      'p8-sprite-kids-running',
      'p8-sprite-nana-porch',
      'p8-sprite-sparky-chimney',
      'p8-sprite-forest-deer',
      'p8-sprite-canada-geese',
      'p8-sprite-wind-chimes',
      'p8-sprite-doggie-cellar',
      'p8-sprite-bluejay-porch',
      'p9-bg-clean',
      'story-bg-just-nana-and-us-p9',
      'story-bg-just-nana-and-us-p9-clean',
      'p9-stove-frame-occluder',
      'p9-sprite-stove-fire',
      'p9-sprite-doggie-sleeping',
      'bookshelf-bg',
      'mode-read',
      'mode-arcade',
      'mode-create',
      'book-nana',
      'book-grandpa-bapci',
      'book-louisiana',
      'shelf-sparky'
    ];

    texKeys.forEach((key) => {
      if (this.textures.exists(key)) {
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    });

    if (this.textures.exists('p1-sprite-doggie') && !this.anims.exists('p1-doggie-bark-leap')) {
      this.anims.create({
        key: 'p1-doggie-bark-leap',
        frames: this.anims.generateFrameNumbers('p1-sprite-doggie', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: 0
      });
    }

    if (this.textures.exists('p1-sprite-sparky') && !this.anims.exists('p1-sparky-flap')) {
      this.anims.create({
        key: 'p1-sparky-flap',
        frames: [
          { key: 'p1-sprite-sparky', frame: 0 },
          { key: 'p1-sprite-sparky', frame: 1 },
          { key: 'p1-sprite-sparky', frame: 2 },
          { key: 'p1-sprite-sparky', frame: 1 }
        ],
        frameRate: 9,
        repeat: 3
      });
    }
  }

  /**
   * Probes `public/assets/stories/nana/p{1..9}-bg.jpg` and `.png` on boot so any dropped-in
   * 32-bit Hi-Bit Pixel Art illustrations are immediately in GPU memory on Frame 0!
   */
  private async preloadAvailableStoryBackgrounds(): Promise<void> {
    const foundPages: { key: string; url: string }[] = [];

    for (let p = 1; p <= 9; p++) {
      const key = `story-bg-just-nana-and-us-p${p}`;
      if (this.textures.exists(key)) continue;

      const candidates = [
        `/assets/stories/nana/p${p}-bg-clean.jpg`,
        `/assets/stories/nana/p${p}-bg-clean.png`,
        `/assets/stories/nana/p${p}-bg-clean.webp`,
        `/assets/stories/nana/p${p}-bg.jpg`,
        `/assets/stories/nana/p${p}-bg.png`,
        `/assets/stories/nana/p${p}-bg.webp`
      ];

      for (const url of candidates) {
        try {
          const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
          const contentType = res.headers.get('content-type') ?? '';
          if (res.ok && contentType.startsWith('image/')) {
            foundPages.push({ key, url });
            break;
          }
        } catch {
          // Ignore offline errors
        }
      }
    }

    if (foundPages.length === 0) return;

    await new Promise<void>((resolve) => {
      foundPages.forEach(({ key, url }) => {
        this.load.image(key, url);
      });
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        foundPages.forEach(({ key }) => {
          if (this.textures.exists(key)) {
            this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
          }
        });
        resolve();
      });
      this.load.start();
    });
  }

  private generateSharedTextures(): void {
    // 1. Star particle texture (32x32)
    if (!this.textures.exists('particle-star')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xffffff, 1);
      this.drawStarPolygon(g, 16, 16, 5, 14, 6);
      g.generateTexture('particle-star', 32, 32);
      g.destroy();
    }

    // 2. Sparky Avatar (96x96) — Emerald-and-Gold Cloud Dragon
    if (!this.textures.exists('avatar-sparky')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // Golden wings
      g.fillStyle(0xfbbf24, 1);
      g.fillTriangle(18, 56, 6, 30, 34, 42);
      g.fillTriangle(78, 56, 90, 30, 62, 42);

      // Emerald dragon head & body
      g.fillStyle(0x10b981, 1);
      g.fillCircle(48, 54, 28);
      g.fillRoundedRect(26, 48, 44, 34, 16);

      // Golden belly & horns
      g.fillStyle(0xfde047, 1);
      g.fillEllipse(48, 68, 26, 20);
      g.fillStyle(0xf59e0b, 1);
      g.fillTriangle(30, 30, 36, 10, 43, 29);
      g.fillTriangle(53, 29, 60, 10, 66, 30);

      // Rosy cheeks
      g.fillStyle(0x34d399, 1);
      g.fillCircle(28, 58, 6);
      g.fillCircle(68, 58, 6);

      // Big friendly eyes
      g.fillStyle(0xffffff, 1);
      g.fillCircle(38, 46, 8);
      g.fillCircle(58, 46, 8);
      g.fillStyle(0x0f172a, 1);
      g.fillCircle(39, 46, 4.5);
      g.fillCircle(57, 46, 4.5);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(41, 44, 2);
      g.fillCircle(59, 44, 2);

      // Happy smile
      g.lineStyle(3.5, 0x064e3b, 1);
      g.beginPath();
      g.arc(48, 54, 9, 0.2, Math.PI - 0.2, false);
      g.strokePath();

      g.generateTexture('avatar-sparky', 96, 96);
      g.destroy();
    }

    // 3. Doggie Avatar (96x96) — Emma's Fluffy White Stuffed Dog Sidekick
    if (!this.textures.exists('avatar-doggie')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // Floppy plush ears
      g.fillStyle(0xcbd5e1, 1);
      g.fillEllipse(20, 52, 18, 34);
      g.fillEllipse(76, 52, 18, 34);

      // Fluffy cloud puffs around head
      g.fillStyle(0xffffff, 1);
      g.fillCircle(48, 52, 28);
      g.fillCircle(34, 34, 14);
      g.fillCircle(48, 30, 15);
      g.fillCircle(62, 34, 14);
      g.fillCircle(28, 58, 14);
      g.fillCircle(68, 58, 14);

      // Berry pink collar & golden tag
      g.fillStyle(0xf43f5e, 1);
      g.fillRoundedRect(30, 72, 36, 9, 4);
      g.fillStyle(0xfbbf24, 1);
      g.fillCircle(48, 81, 6);

      // Rosy cheeks
      g.fillStyle(0xfda4af, 0.85);
      g.fillCircle(31, 56, 5.5);
      g.fillCircle(65, 56, 5.5);

      // Shiny button eyes
      g.fillStyle(0x1e293b, 1);
      g.fillCircle(38, 48, 5.5);
      g.fillCircle(58, 48, 5.5);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(39.5, 46.5, 2);
      g.fillCircle(59.5, 46.5, 2);

      // Cute pink nose & happy tongue
      g.fillStyle(0xf43f5e, 1);
      g.fillEllipse(48, 63, 9, 11);
      g.fillStyle(0x334155, 1);
      g.fillEllipse(48, 55, 11, 8);

      g.generateTexture('avatar-doggie', 96, 96);
      g.destroy();
    }

    // 4. Crisp 32-Bit Pixel-Art Smoke Puff Texture (24x24, 3px chunky pixel grid, 4 stepped shades)
    if (!this.textures.exists('p1-pixel-smoke-puff')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // Stepped palette: 1 = #94a3b8 (cool slate shadow), 2 = #cbd5e1 (mid warm grey),
      // 3 = #f1f5f9 (soft cloud white), 4 = #ffffff (pure highlight)
      const grid: number[][] = [
        [0, 0, 1, 1, 1, 1, 0, 0],
        [0, 1, 3, 4, 4, 3, 1, 0],
        [1, 3, 4, 4, 4, 4, 3, 1],
        [1, 3, 4, 4, 3, 3, 2, 1],
        [1, 2, 3, 3, 3, 2, 2, 1],
        [1, 2, 2, 3, 2, 2, 1, 0],
        [0, 1, 2, 2, 2, 1, 0, 0],
        [0, 0, 1, 1, 1, 0, 0, 0]
      ];
      const palette: Record<number, number> = {
        1: 0x94a3b8,
        2: 0xcbd5e1,
        3: 0xf1f5f9,
        4: 0xffffff
      };
      const pxSize = 3;
      for (let ry = 0; ry < grid.length; ry++) {
        for (let rx = 0; rx < grid[ry].length; rx++) {
          const code = grid[ry][rx];
          if (code > 0) {
            g.fillStyle(palette[code], 1);
            g.fillRect(rx * pxSize, ry * pxSize, pxSize, pxSize);
          }
        }
      }
      g.generateTexture('p1-pixel-smoke-puff', 24, 24);
      g.destroy();
    }

    // 5. Crisp 32-Bit Pixel-Art Heart Texture (22x20, 2px chunky pixel grid)
    if (!this.textures.exists('p1-pixel-heart')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // 1 = #881337 (dark outline), 2 = #e11d48 (deep ruby), 3 = #fb7185 (warm rose), 4 = #ffffff (shine)
      const heartGrid: number[][] = [
        [0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0],
        [1, 3, 3, 3, 1, 0, 1, 3, 3, 2, 1],
        [1, 3, 4, 3, 3, 1, 3, 3, 2, 2, 1],
        [1, 3, 3, 3, 3, 3, 3, 2, 2, 2, 1],
        [1, 2, 3, 3, 3, 3, 2, 2, 2, 2, 1],
        [0, 1, 2, 3, 3, 2, 2, 2, 2, 1, 0],
        [0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0],
        [0, 0, 0, 1, 2, 2, 2, 1, 0, 0, 0],
        [0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0]
      ];
      const heartPalette: Record<number, number> = {
        1: 0x881337,
        2: 0xe11d48,
        3: 0xfb7185,
        4: 0xffffff
      };
      const pSize = 2;
      for (let ry = 0; ry < heartGrid.length; ry++) {
        for (let rx = 0; rx < heartGrid[ry].length; rx++) {
          const code = heartGrid[ry][rx];
          if (code > 0) {
            g.fillStyle(heartPalette[code], 1);
            g.fillRect(rx * pSize, ry * pSize, pSize, pSize);
          }
        }
      }
      g.generateTexture('p1-pixel-heart', 22, 20);
      g.destroy();
    }

    // 6. Crisp 32-Bit Pixel-Art Acorn Texture (16x18, 2px chunky pixel grid) for Page 2 Squirrels
    if (!this.textures.exists('p2-pixel-acorn')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // 1 = #451a03 (dark bark outline), 2 = #78350f (cap brown), 3 = #d97706 (golden nut), 4 = #fef08a (shine)
      const acornGrid: number[][] = [
        [0, 0, 0, 1, 1, 0, 0, 0],
        [0, 0, 1, 2, 2, 1, 0, 0],
        [0, 1, 2, 2, 2, 2, 1, 0],
        [1, 2, 1, 2, 1, 2, 2, 1],
        [0, 1, 3, 4, 3, 3, 1, 0],
        [0, 1, 3, 4, 3, 3, 1, 0],
        [0, 1, 3, 3, 3, 3, 1, 0],
        [0, 0, 1, 3, 3, 1, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 0]
      ];
      const palette: Record<number, number> = {
        1: 0x451a03,
        2: 0x78350f,
        3: 0xd97706,
        4: 0xfef08a
      };
      for (let ry = 0; ry < acornGrid.length; ry++) {
        for (let rx = 0; rx < acornGrid[ry].length; rx++) {
          const code = acornGrid[ry][rx];
          if (code > 0) {
            g.fillStyle(palette[code], 1);
            g.fillRect(rx * 2, ry * 2, 2, 2);
          }
        }
      }
      g.generateTexture('p2-pixel-acorn', 16, 18);
      g.destroy();
    }

    // 7. Crisp 32-Bit Pixel-Art Red Maple Leaf Texture (18x18, 2px pixel grid)
    if (!this.textures.exists('p2-pixel-maple-leaf')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // 1 = #7f1d1d (crimson outline), 2 = #dc2626 (maple red), 3 = #f97316 (autumn orange highlight)
      const leafGrid: number[][] = [
        [0, 0, 0, 0, 1, 0, 0, 0, 0],
        [0, 1, 0, 1, 2, 1, 0, 1, 0],
        [1, 2, 1, 2, 3, 2, 1, 2, 1],
        [0, 1, 2, 3, 3, 2, 2, 1, 0],
        [1, 2, 3, 2, 2, 2, 3, 2, 1],
        [0, 1, 2, 2, 2, 2, 2, 1, 0],
        [0, 0, 1, 1, 2, 1, 1, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 0, 0]
      ];
      const palette: Record<number, number> = {
        1: 0x7f1d1d,
        2: 0xdc2626,
        3: 0xf97316
      };
      for (let ry = 0; ry < leafGrid.length; ry++) {
        for (let rx = 0; rx < leafGrid[ry].length; rx++) {
          const code = leafGrid[ry][rx];
          if (code > 0) {
            g.fillStyle(palette[code], 1);
            g.fillRect(rx * 2, ry * 2, 2, 2);
          }
        }
      }
      g.generateTexture('p2-pixel-maple-leaf', 18, 18);
      g.destroy();
    }

    // 8. Crisp 32-Bit Pixel-Art Red Cardinal Bird Texture (24x20, 2px pixel grid)
    if (!this.textures.exists('p2-pixel-cardinal')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // 1 = #1e293b (dark mask/outline), 2 = #dc2626 (bright cardinal red),
      // 3 = #ef4444 (highlight crest), 4 = #f59e0b (golden beak), 5 = #ffffff (eye glint)
      const birdGrid: number[][] = [
        [0, 0, 0, 0, 1, 3, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 3, 3, 2, 1, 0, 0, 0, 0],
        [0, 0, 0, 1, 2, 1, 5, 1, 4, 4, 0, 0],
        [0, 0, 1, 2, 2, 2, 1, 1, 4, 0, 0, 0],
        [1, 1, 2, 3, 3, 2, 2, 2, 1, 0, 0, 0],
        [0, 1, 2, 3, 2, 2, 2, 2, 1, 0, 0, 0],
        [0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0]
      ];
      const palette: Record<number, number> = {
        1: 0x1e293b,
        2: 0xdc2626,
        3: 0xef4444,
        4: 0xf59e0b,
        5: 0xffffff
      };
      for (let ry = 0; ry < birdGrid.length; ry++) {
        for (let rx = 0; rx < birdGrid[ry].length; rx++) {
          const code = birdGrid[ry][rx];
          if (code > 0) {
            g.fillStyle(palette[code], 1);
            g.fillRect(rx * 2, ry * 2, 2, 2);
          }
        }
      }
      g.generateTexture('p2-pixel-cardinal', 24, 20);
      g.destroy();
    }

    // 9. Soft radial golden glow texture (128x128) for Cover candlelight halos & floating dust motes
    if (!this.textures.exists('cover-candle-glow')) {
      const canvasTex = this.textures.createCanvas('cover-candle-glow', 128, 128);
      if (canvasTex) {
        const ctx = canvasTex.getContext();
        const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
        grad.addColorStop(0, 'rgba(255, 251, 215, 1.0)');
        grad.addColorStop(0.28, 'rgba(253, 224, 71, 0.72)');
        grad.addColorStop(0.62, 'rgba(245, 158, 11, 0.28)');
        grad.addColorStop(1, 'rgba(245, 158, 11, 0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 128, 128);
        canvasTex.refresh();
      }
    }

    // 10. Crisp 32-Bit Pixel-Art Bumblebee Texture (18x16, 2px pixel grid) for Page 3 Tulips
    if (!this.textures.exists('p3-pixel-bee')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // 1 = #1e293b (dark outline/stripes), 2 = #facc15 (bright bee yellow), 3 = #e0f2fe (wing white)
      const beeGrid: number[][] = [
        [0, 0, 3, 3, 0, 3, 3, 0, 0],
        [0, 3, 3, 3, 3, 3, 3, 0, 0],
        [0, 1, 2, 1, 2, 1, 2, 1, 0],
        [1, 2, 2, 1, 2, 1, 2, 2, 1],
        [1, 2, 2, 1, 2, 1, 2, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 0, 0]
      ];
      const palette: Record<number, number> = {
        1: 0x1e293b,
        2: 0xfacc15,
        3: 0xe0f2fe
      };
      for (let ry = 0; ry < beeGrid.length; ry++) {
        for (let rx = 0; rx < beeGrid[ry].length; rx++) {
          const code = beeGrid[ry][rx];
          if (code > 0) {
            g.fillStyle(palette[code], 1);
            g.fillRect(rx * 2, ry * 2, 2, 2);
          }
        }
      }
      g.generateTexture('p3-pixel-bee', 18, 14);
      g.destroy();
    }

    // 11. Crisp 32-Bit Pixel-Art Musical Note Texture (16x18, 2px pixel grid) for Page 3 Cuckoo Clock
    if (!this.textures.exists('p3-pixel-note')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      const noteGrid: number[][] = [
        [0, 0, 0, 1, 1, 1, 1, 0],
        [0, 0, 0, 1, 2, 2, 2, 1],
        [0, 0, 0, 1, 2, 1, 1, 0],
        [0, 0, 0, 1, 2, 1, 0, 0],
        [0, 0, 0, 1, 2, 1, 0, 0],
        [0, 1, 1, 1, 2, 1, 0, 0],
        [1, 2, 2, 2, 2, 1, 0, 0],
        [1, 2, 2, 2, 1, 0, 0, 0],
        [0, 1, 1, 1, 0, 0, 0, 0]
      ];
      const palette: Record<number, number> = {
        1: 0x78350f,
        2: 0xfde047
      };
      for (let ry = 0; ry < noteGrid.length; ry++) {
        for (let rx = 0; rx < noteGrid[ry].length; rx++) {
          const code = noteGrid[ry][rx];
          if (code > 0) {
            g.fillStyle(palette[code], 1);
            g.fillRect(rx * 2, ry * 2, 2, 2);
          }
        }
      }
      g.generateTexture('p3-pixel-note', 16, 18);
      g.destroy();
    }
  }

  private drawStarPolygon(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number
  ): void {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;
    const points: Phaser.Types.Math.Vector2Like[] = [];

    for (let i = 0; i < spikes; i++) {
      points.push({
        x: cx + Math.cos(rot) * outerRadius,
        y: cy + Math.sin(rot) * outerRadius
      });
      rot += step;
      points.push({
        x: cx + Math.cos(rot) * innerRadius,
        y: cy + Math.sin(rot) * innerRadius
      });
      rot += step;
    }
    g.fillPoints(points, true);
  }
}
