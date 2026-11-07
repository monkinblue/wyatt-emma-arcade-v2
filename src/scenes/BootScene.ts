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
    this.mountHeirloomLoadingBar();

    // 0a. Hub Heirloom Bookshelf, 3 Mode Objects, 3 Individual Book Sprites & 3 Create Shelf Objects
    this.load.image('bookshelf-bg', '/assets/hub/bookshelf-bg.jpg?v=hub2');
    this.load.image('mode-read', '/assets/hub/sprites/mode-read.png?v=hub2');
    this.load.image('mode-arcade', '/assets/hub/sprites/mode-arcade.png?v=hub2');
    this.load.image('mode-create', '/assets/hub/sprites/mode-create.png?v=hub2');
    this.load.image('mode-tv', '/assets/hub/sprites/mode-tv.png?v=tv1');
    this.load.image('book-nana', '/assets/hub/sprites/book-nana.png?v=hub2');
    this.load.image('book-cover-colorado', '/assets/stories/colorado/pages/book-cover-colorado.png?v=co1');
    this.load.image('book-grandpa-bapci', '/assets/hub/sprites/book-grandpa-bapci.png?v=hub2');
    this.load.image('book-louisiana', '/assets/hub/sprites/book-louisiana.png?v=hub2');
    this.load.image('shelf-sparky', '/assets/hub/sprites/shelf-sparky.png?v=hub2');
    this.load.image('create-art-studio', '/assets/hub/sprites/create-art-studio.png?v=create1');
    this.load.image('create-tinker-box', '/assets/hub/sprites/create-tinker-box.png?v=create1');
    this.load.image('create-music-box', '/assets/hub/sprites/create-music-box.png?v=create1');
    this.load.image('arcade-toy-balloon', '/assets/hub/arcade/arcade-toy-balloon.png?v=arcade1');
    this.load.image('arcade-toy-match', '/assets/hub/arcade/arcade-toy-match.png?v=arcade2');
    this.load.image('hub-toy-shutthebox', '/assets/hub/arcade/hub-toy-shutthebox.png?v=stb1');
    this.load.image('arcade-toy-shutthebox', '/assets/hub/arcade/hub-toy-shutthebox.png?v=stb1');
    this.load.image('arcade-toy-bounce', '/assets/hub/arcade/arcade-toy-bounce.png?v=arcade1');
    this.load.image('arcade-toy-kart', '/assets/hub/arcade/arcade-toy-kart.png?v=arcade1');
    this.load.image('hub-toy-rocket', '/assets/hub/arcade/hub-toy-rocket.png?v=rk1');
    this.load.image('hub-toy-unicorn', '/assets/hub/arcade/hub-toy-unicorn.png?v=uc1');
    this.load.image('hub-toy-ispy', '/assets/hub/arcade/hub-toy-ispy.png?v=ispy2');
    this.load.image('hub-toy-train', '/assets/hub/arcade/hub-toy-train.png?v=tr1');
    this.load.image('hub-toy-starship-unicorn', '/assets/hub/arcade/hub-toy-starship-unicorn.png?v=su1');

    // 0a-1b. Starship Unicorn: Orbital Trivia (`StarshipUnicornScene.ts`) 1080p/4K HD Assets
    this.load.image('starship-board-bg', '/assets/games/starship-unicorn/starship-board-bg.jpg?v=su1');
    const starshipAstronautIds = [
      'robert',
      'rita',
      'wyatt',
      'emma',
      'papa',
      'nana',
      'grandpa',
      'babci',
      'guest'
    ];
    for (const astroId of starshipAstronautIds) {
      this.load.image(
        `starship-astro-${astroId}`,
        `/assets/games/starship-unicorn/portraits/astro_${astroId}.png?v=su1`
      );
      this.load.image(
        `starship-card-${astroId}`,
        `/assets/games/starship-unicorn/cards/card_${astroId}.png?v=su1`
      );
      this.load.image(
        `starship-token-${astroId}`,
        `/assets/games/starship-unicorn/tokens/token_${astroId}.png?v=su1`
      );
    }

    // 0a-2. Heirloom Art & Sticker Studio Frame + 8 Illustrated Tool Icons + 12 Coloring Book Templates (936x560)
    this.load.image('studio-frame-bg', '/assets/games/art-studio/studio-frame-bg.jpg?v=studio2');
    this.load.image('tool-crayon', '/assets/games/art-studio/sprites/tool-crayon.png?v=studio2');
    this.load.image('tool-glitter-brush', '/assets/games/art-studio/sprites/tool-glitter-brush.png?v=studio2');
    this.load.image('tool-roller', '/assets/games/art-studio/sprites/tool-roller.png?v=studio2');
    this.load.image('tool-bucket', '/assets/games/art-studio/sprites/tool-bucket.png?v=studio2');
    this.load.image('tool-undo', '/assets/games/art-studio/sprites/tool-undo.png?v=studio2');
    this.load.image('tool-sponge', '/assets/games/art-studio/sprites/tool-sponge.png?v=studio2');
    this.load.image('tool-bookshelf', '/assets/games/art-studio/sprites/tool-bookshelf.png?v=studio2');
    this.load.image('tool-sticker-box', '/assets/games/art-studio/sprites/tool-sticker-box.png?v=studio2');
    this.load.image('ui-paint-well-rim', '/assets/games/art-studio/sprites/ui-paint-well-rim.png?v=studio3');
    this.load.image('ui-paint-well-fill', '/assets/games/art-studio/sprites/ui-paint-well-fill.png?v=studio3');
    this.load.image('ui-brass-frame', '/assets/games/art-studio/sprites/ui-brass-frame.png?v=studio3');
    this.load.image('ui-page-left', '/assets/games/art-studio/sprites/ui-page-left.png?v=studio3');
    this.load.image('ui-page-right', '/assets/games/art-studio/sprites/ui-page-right.png?v=studio3');

    this.load.image('tpl-01-blank', '/assets/games/art-studio/templates/tpl-01-blank.png?v=studio2');
    this.load.image('tpl-02-sparky-doggie', '/assets/games/art-studio/templates/tpl-02-sparky-doggie.png?v=studio2');
    this.load.image('tpl-03-roadster', '/assets/games/art-studio/templates/tpl-03-roadster.png?v=studio2');
    this.load.image('tpl-04-tugboat', '/assets/games/art-studio/templates/tpl-04-tugboat.png?v=studio2');
    this.load.image('tpl-05-windmill', '/assets/games/art-studio/templates/tpl-05-windmill.png?v=studio2');
    this.load.image('tpl-06-airport', '/assets/games/art-studio/templates/tpl-06-airport.png?v=studio2');
    this.load.image('tpl-07-nanas-house', '/assets/games/art-studio/templates/tpl-07-nanas-house.png?v=studio2');
    this.load.image('tpl-08-garage', '/assets/games/art-studio/templates/tpl-08-garage.png?v=studio2');
    this.load.image('tpl-09-beach', '/assets/games/art-studio/templates/tpl-09-beach.png?v=studio2');
    this.load.image('tpl-10-cabin', '/assets/games/art-studio/templates/tpl-10-cabin.png?v=studio2');
    this.load.image('tpl-11-critters', '/assets/games/art-studio/templates/tpl-11-critters.png?v=studio2');
    this.load.image('tpl-12-bedtime', '/assets/games/art-studio/templates/tpl-12-bedtime.png?v=studio2');

    // 0a-3. Heirloom Music Box & Puppet Theater (`MelodyMakerScene.ts`) Frame + 36 Custom Sprites
    this.load.image('melody-frame-bg', '/assets/games/melody-maker/melody-frame-bg.jpg?v=melody2');
    for (let i = 0; i < 8; i++) {
      this.load.image(`key-${i}`, `/assets/games/melody-maker/sprites/key-${i}.png?v=melody2`);
    }
    this.load.image('prop-mallet-left', '/assets/games/melody-maker/sprites/prop-mallet-left.png?v=melody2');
    this.load.image('prop-mallet-right', '/assets/games/melody-maker/sprites/prop-mallet-right.png?v=melody2');
    this.load.image('prop-firefly', '/assets/games/melody-maker/sprites/prop-firefly.png?v=melody2');
    this.load.image('prop-star-burst', '/assets/games/melody-maker/sprites/prop-star-burst.png?v=melody2');

    for (let f = 0; f < 3; f++) {
      this.load.image(`band-sparky-${f}`, `/assets/games/melody-maker/sprites/band-sparky-${f}.png?v=melody1`);
      this.load.image(`band-doggie-${f}`, `/assets/games/melody-maker/sprites/band-doggie-${f}.png?v=melody1`);
      this.load.image(`band-choir-${f}`, `/assets/games/melody-maker/sprites/band-choir-${f}.png?v=melody1`);
    }

    this.load.image('voice-glockenspiel', '/assets/games/melody-maker/sprites/voice-glockenspiel.png?v=melody1');
    this.load.image('voice-marimba', '/assets/games/melody-maker/sprites/voice-marimba.png?v=melody1');
    this.load.image('voice-piano', '/assets/games/melody-maker/sprites/voice-piano.png?v=melody1');
    this.load.image('voice-doggie', '/assets/games/melody-maker/sprites/voice-doggie.png?v=melody1');
    this.load.image('voice-sparky', '/assets/games/melody-maker/sprites/voice-sparky.png?v=melody1');

    this.load.image('song-twinkle', '/assets/games/melody-maker/sprites/song-twinkle.png?v=melody1');
    this.load.image('song-mary', '/assets/games/melody-maker/sprites/song-mary.png?v=melody1');
    this.load.image('song-macdonald', '/assets/games/melody-maker/sprites/song-macdonald.png?v=melody1');
    this.load.image('song-rowboat', '/assets/games/melody-maker/sprites/song-rowboat.png?v=melody1');
    this.load.image('song-roadster', '/assets/games/melody-maker/sprites/song-roadster.png?v=melody1');

    this.load.image('mode-autoplay', '/assets/games/melody-maker/sprites/mode-autoplay.png?v=melody1');
    this.load.image('mode-firefly', '/assets/games/melody-maker/sprites/mode-firefly.png?v=melody1');
    this.load.image('mode-maestro', '/assets/games/melody-maker/sprites/mode-maestro.png?v=melody1');
    this.load.image('rhythm-campfire', '/assets/games/melody-maker/sprites/rhythm-campfire.png?v=melody1');
    this.load.image('rhythm-parade', '/assets/games/melody-maker/sprites/rhythm-parade.png?v=melody1');

    // 0a-4. Heirloom Tinker Workshop (`TinkerWorkshopScene.ts`) v2 Open Workshop Wall + 32-Bit Contraptions
    this.load.image('tinker-bg-v2', '/assets/games/tinker-workshop/tinker-bg-v2.png?v=tinker3');
    this.load.image('tinker-frame-bg', '/assets/games/tinker-workshop/tinker-frame-bg.jpg?v=tinker3');
    this.load.image('part-ramp', '/assets/games/tinker-workshop/sprites/part-ramp.png?v=tinker3');
    this.load.image('part-chute', '/assets/games/tinker-workshop/sprites/part-chute.png?v=tinker3');
    this.load.image('part-bowl', '/assets/games/tinker-workshop/sprites/part-bowl.png?v=tinker3');
    this.load.image('part-drum-bumper', '/assets/games/tinker-workshop/sprites/part-drum-bumper.png?v=tinker3');
    this.load.image('part-trampoline', '/assets/games/tinker-workshop/sprites/part-trampoline.png?v=tinker3');
    this.load.image('prop-bumper', '/assets/games/tinker-workshop/sprites/prop-bumper.png?v=tinker3');
    this.load.image('part-paddle-wheel', '/assets/games/tinker-workshop/sprites/part-paddle-wheel.png?v=tinker3');
    this.load.image('part-gear', '/assets/games/tinker-workshop/sprites/part-gear.png?v=tinker3');
    this.load.image('part-chime-bar', '/assets/games/tinker-workshop/sprites/part-chime-bar.png?v=tinker3');
    this.load.image('part-funnel', '/assets/games/tinker-workshop/sprites/part-funnel.png?v=tinker3');
    this.load.image('part-bellows', '/assets/games/tinker-workshop/sprites/part-bellows.png?v=tinker3');
    this.load.image('part-cannon', '/assets/games/tinker-workshop/sprites/part-cannon.png?v=tinker4');
    this.load.image('part-seesaw', '/assets/games/tinker-workshop/sprites/part-seesaw.png?v=tinker4');
    this.load.image('tinker-trash-can', '/assets/games/tinker-workshop/sprites/tinker-trash-can.png?v=tinker4');
    this.load.image('part-flipper', '/assets/games/tinker-workshop/sprites/part-flipper.png?v=tinker2');
    this.load.image('part-wedge', '/assets/games/tinker-workshop/sprites/part-wedge.png?v=tinker2');
    this.load.image('part-hammer', '/assets/games/tinker-workshop/sprites/part-hammer.png?v=tinker2');
    this.load.image('part-wall', '/assets/games/tinker-workshop/sprites/part-wall.png?v=tinker2');

    this.load.image('marble-cobalt', '/assets/games/tinker-workshop/sprites/marble-cobalt.png?v=tinker3');
    this.load.image('marble-comet', '/assets/games/tinker-workshop/sprites/marble-comet.png?v=tinker3');
    this.load.image('marble-steel', '/assets/games/tinker-workshop/sprites/marble-steel.png?v=tinker3');
    this.load.image('marble-emerald', '/assets/games/tinker-workshop/sprites/marble-emerald.png?v=tinker3');
    this.load.image('prop-marble', '/assets/games/tinker-workshop/sprites/prop-marble.png?v=tinker3');
    this.load.image('prop-acorn', '/assets/games/tinker-workshop/sprites/prop-acorn.png?v=tinker3');
    this.load.image('prop-star', '/assets/games/tinker-workshop/sprites/prop-star.png?v=tinker3');
    this.load.image('prop-chain', '/assets/games/tinker-workshop/sprites/prop-chain.png?v=tinker2');
    this.load.image('prop-pull-chain', '/assets/games/tinker-workshop/sprites/prop-chain.png?v=tinker2');

    for (let f = 0; f < 3; f++) {
      this.load.image(`tinker-sparky-${f}`, `/assets/games/tinker-workshop/sprites/tinker-sparky-${f}.png?v=tinker3`);
      this.load.image(`tinker-doggie-${f}`, `/assets/games/tinker-workshop/sprites/tinker-doggie-${f}.png?v=tinker3`);
      this.load.image(`sparky-hopper-${f + 1}`, `/assets/games/tinker-workshop/sprites/sparky-hopper-${f + 1}.png?v=tinker3`);
      this.load.image(`doggie-cart-${f + 1}`, `/assets/games/tinker-workshop/sprites/doggie-cart-${f + 1}.png?v=tinker3`);
    }

    for (let p = 1; p <= 5; p++) {
      this.load.image(`puzzle-${p}`, `/assets/games/tinker-workshop/sprites/puzzle-${p}.png?v=tinker1`);
    }

    this.load.image('tinker-mode-guide', '/assets/games/tinker-workshop/sprites/tinker-mode-guide.png?v=tinker1');
    this.load.image('tinker-mode-stars', '/assets/games/tinker-workshop/sprites/tinker-mode-stars.png?v=tinker1');
    this.load.image('tinker-mode-fountain', '/assets/games/tinker-workshop/sprites/tinker-mode-fountain.png?v=tinker1');
    this.load.image('tinker-action-drop', '/assets/games/tinker-workshop/sprites/tinker-action-drop.png?v=tinker1');
    this.load.image('tinker-action-clear', '/assets/games/tinker-workshop/sprites/tinker-action-clear.png?v=tinker4');

    // 0a-5. Balloon Letter Pop (`BalloonPopScene.ts`) Stage Background + 26 Custom Sprites
    this.load.image('balloon-stage', '/assets/games/balloon-pop/balloon-stage.jpg?v=balloon1');
    this.load.image('balloon-red', '/assets/games/balloon-pop/sprites/balloon-red.png?v=balloon1');
    this.load.image('balloon-blue', '/assets/games/balloon-pop/sprites/balloon-blue.png?v=balloon1');
    this.load.image('balloon-green', '/assets/games/balloon-pop/sprites/balloon-green.png?v=balloon1');
    this.load.image('balloon-gold', '/assets/games/balloon-pop/sprites/balloon-gold.png?v=balloon1');
    this.load.image('balloon-purple', '/assets/games/balloon-pop/sprites/balloon-purple.png?v=balloon1');
    this.load.image('balloon-coral', '/assets/games/balloon-pop/sprites/balloon-coral.png?v=balloon1');
    this.load.image('balloon-star', '/assets/games/balloon-pop/sprites/balloon-star.png?v=balloon1');
    this.load.image('balloon-rainbow', '/assets/games/balloon-pop/sprites/balloon-rainbow.png?v=balloon1');
    this.load.image('prop-tile', '/assets/games/balloon-pop/sprites/prop-tile.png?v=balloon1');
    this.load.image('prop-parachute', '/assets/games/balloon-pop/sprites/prop-parachute.png?v=balloon1');
    this.load.image('prop-crate', '/assets/games/balloon-pop/sprites/prop-crate.png?v=balloon1');
    this.load.image('prop-pinwheel', '/assets/games/balloon-pop/sprites/prop-pinwheel.png?v=balloon1');
    this.load.image('sparky-idle', '/assets/games/balloon-pop/sprites/sparky-idle.png?v=balloon1');
    this.load.image('sparky-pump', '/assets/games/balloon-pop/sprites/sparky-pump.png?v=balloon1');
    this.load.image('sparky-cheer', '/assets/games/balloon-pop/sprites/sparky-cheer.png?v=balloon1');
    this.load.image('doggie-idle', '/assets/games/balloon-pop/sprites/doggie-idle.png?v=balloon1');
    this.load.image('doggie-catch', '/assets/games/balloon-pop/sprites/doggie-catch.png?v=balloon1');
    this.load.image('doggie-cheer', '/assets/games/balloon-pop/sprites/doggie-cheer.png?v=balloon1');
    this.load.image('ui-back', '/assets/games/balloon-pop/sprites/ui-back.png?v=balloon1');
    this.load.image('ui-mode-phonics', '/assets/games/balloon-pop/sprites/ui-mode-phonics.png?v=balloon1');
    this.load.image('ui-mode-words', '/assets/games/balloon-pop/sprites/ui-mode-words.png?v=balloon1');
    this.load.image('ui-mode-cargo', '/assets/games/balloon-pop/sprites/ui-mode-cargo.png?v=balloon1');
    this.load.image('ui-theme', '/assets/games/balloon-pop/sprites/ui-theme.png?v=balloon1');
    this.load.image('ui-speak', '/assets/games/balloon-pop/sprites/ui-speak.png?v=balloon1');
    this.load.image('ui-wind', '/assets/games/balloon-pop/sprites/ui-wind.png?v=balloon1');
    this.load.image('ui-album', '/assets/games/balloon-pop/sprites/ui-album.png?v=balloon1');

    // 0a-6. Animal Match Safari (`MemoryMatchScene.ts`) Stage Background + 60 Custom Sprites
    this.load.image('match-stage-bg', '/assets/games/memory-match/sprites/match-stage-bg.png?v=match2');
    this.load.image('card-back', '/assets/games/memory-match/sprites/card-back.png?v=match1');
    this.load.image('card-front', '/assets/games/memory-match/sprites/card-front.png?v=match1');
    this.load.image('match-prop-key', '/assets/games/memory-match/sprites/prop-key.png?v=match1');
    this.load.image('chest-closed', '/assets/games/memory-match/sprites/chest-closed.png?v=match1');
    this.load.image('chest-open', '/assets/games/memory-match/sprites/chest-open.png?v=match1');
    this.load.image('char-sparky-spyglass', '/assets/games/memory-match/sprites/char-sparky-spyglass.png?v=match1');
    this.load.image('char-doggie-lantern', '/assets/games/memory-match/sprites/char-doggie-lantern.png?v=match1');
    this.load.image('match-prop-firefly', '/assets/games/memory-match/sprites/prop-firefly.png?v=match1');
    this.load.image('ui-grid', '/assets/games/memory-match/sprites/ui-grid.png?v=match1');
    this.load.image('ui-mode', '/assets/games/memory-match/sprites/ui-mode.png?v=match1');
    this.load.image('ui-hint', '/assets/games/memory-match/sprites/ui-hint.png?v=match1');
    this.load.image('ui-sanctuary', '/assets/games/memory-match/sprites/ui-sanctuary.png?v=match1');

    const matchCardSprites = [
      'safari-lion', 'safari-lion-cub', 'safari-elephant', 'safari-elephant-calf',
      'safari-bear', 'safari-bear-cub', 'safari-owl', 'safari-owlet',
      'safari-frog', 'safari-tadpole', 'safari-fox', 'safari-fox-kit',
      'safari-monkey', 'safari-monkey-baby', 'safari-duck', 'safari-duckling',
      'ocean-whale', 'ocean-octopus', 'ocean-turtle', 'ocean-clownfish',
      'ocean-crab', 'ocean-dolphin', 'ocean-seahorse', 'ocean-starfish',
      'dino-trex', 'dino-triceratops', 'dino-stegosaurus', 'dino-brachiosaurus',
      'dino-pterodactyl', 'dino-ankylosaurus', 'dino-baby', 'dino-egg',
      'veh-airship', 'veh-train', 'veh-firetruck', 'veh-submarine',
      'veh-biplane', 'veh-rocket', 'veh-tractor', 'veh-sailboat',
      'tr-dragon', 'tr-unicorn', 'tr-crown', 'tr-crystal',
      'tr-map', 'tr-cupcake', 'tr-strawberry', 'tr-acorn'
    ];
    for (const key of matchCardSprites) {
      this.load.image(key, `/assets/games/memory-match/sprites/${key}.png?v=match1`);
    }

    // 0a-6b. Great Hall Box of Ten (`ShutTheBoxScene.ts`) Stage Background + 24 Custom Sprites
    this.load.image('shutthebox-stage', '/assets/games/shutthebox/shutthebox-stage.png?v=stb1');
    const shutTheBoxSprites = [
      'tile-wood-up',
      'tile-wood-down',
      'tile-wood-gold',
      'prop-dice-cup',
      'die-face-1',
      'die-face-2',
      'die-face-3',
      'die-face-4',
      'die-face-5',
      'die-face-6',
      'die-tumble-1',
      'die-tumble-2',
      'prop-math-scroll',
      'orb-choice',
      'gem-ruby',
      'gem-emerald',
      'prof-sparky-idle',
      'prof-sparky-roll',
      'prof-sparky-cheer',
      'doggie-mage-cheer',
      'doggie-mage-idle',
      'hourglass-player',
      'hourglass-sparky',
      'prop-wizard-trophy'
    ];
    for (const sKey of shutTheBoxSprites) {
      this.load.image(`stb-${sKey}`, `/assets/games/shutthebox/sprites/${sKey}.png?v=stb2`);
    }
    for (let d = 1; d <= 6; d++) {
      this.load.image(`die-${d}`, `/assets/games/shutthebox/sprites/die-${d}.png?v=stb2`);
    }

    // 0a-6c. Zoomy Cloud Kart (`CloudKartScene.ts`) Stage Background + 16 Custom Sprites
    this.load.image('cloudkart-stage-bg', '/assets/games/cloudkart/cloudkart-stage-bg.png?v=ck1');
    const cloudKartSprites = [
      'kart-wyatt',
      'kart-emma',
      'kart-sparky',
      'kart-doggie',
      'spr-sky-gate',
      'spr-flag-start',
      'spr-flag-finish',
      'spr-boost-pad',
      'spr-cloud-ramp',
      'spr-star-coin',
      'spr-quill-kart',
      'spr-eraser-sponge',
      'spr-trophy-podium',
      'spr-golden-cup',
      'spr-cloud-puff',
      'spr-finish-arch'
    ];
    for (const ckKey of cloudKartSprites) {
      this.load.image(ckKey, `/assets/games/cloudkart/sprites/${ckKey}.png?v=ck1`);
    }

    // 0a-6d. Rocket Number Blast (`RocketBlastScene.ts`) Stage Background + 16 Custom Sprites
    this.load.image('rocket-bg', '/assets/games/rocket/rocket-bg.png?v=rk1');
    const rocketBlastSprites = [
      'rocket-stage-100',
      'rocket-stage-10',
      'rocket-stage-1',
      'gantry-tower',
      'steam-valve-lever',
      'ignition-lever',
      'astro-sparky',
      'astro-doggie',
      'fuel-core-100',
      'fuel-cluster-10',
      'fuel-gem-1',
      'bonus-satellite',
      'planet-cheese-moon',
      'planet-mars-saturn',
      'planet-crystal-nebula',
      'space-flag'
    ];
    for (const rkKey of rocketBlastSprites) {
      this.load.image(rkKey, `/assets/games/rocket/sprites/${rkKey}.png?v=rk1`);
    }

    // 0a-6e. Princess Emma's Unicorn Castle (`UnicornCastleScene.ts`) 5 Stage Backgrounds + 56 Custom Sprites
    const unicornBackgrounds = [
      'unicorn-spa-bg',
      'unicorn-teaparty-bg',
      'unicorn-sticker-meadow-bg',
      'unicorn-sticker-ballroom-bg',
      'unicorn-sticker-bedroom-bg'
    ];
    for (const ucBg of unicornBackgrounds) {
      this.load.image(ucBg, `/assets/games/unicorn/${ucBg}.png?v=uc1`);
    }
    const unicornCastleSprites = [
      // Characters & Accessories (8)
      'char-emma-princess',
      'char-emma-wand',
      'char-unicorn-base',
      'char-unicorn-happy',
      'char-sparky-bowtie',
      'char-doggie-crown',
      'acc-royal-saddle',
      'acc-royal-tiara',
      // Spa Tools & Gems (12)
      'spa-potion-pink',
      'spa-potion-blue',
      'spa-potion-gold',
      'spa-brush-starlight',
      'spa-shower-cloud',
      'spa-soap-bubble',
      'acc-wing-bow',
      'spa-wand-rainbow',
      'gem-circle-ruby',
      'gem-heart-quartz',
      'gem-star-topaz',
      'gem-square-emerald',
      // Tea Party, Bakery, Caretaking & Sapphire Gem (12)
      'gem-triangle-sapphire',
      'tea-teapot',
      'tea-cup-saucer',
      'tea-plate-silver',
      'treat-cupcake',
      'treat-star-cookie',
      'treat-sugar-heart',
      'treat-rainbow-berry',
      'tea-bakery-stand',
      'care-velvet-blanket',
      'care-starlight-pillow',
      'care-feather-wand',
      // Peel-and-Stick Living Stickers (24)
      'stk-unicorn-prance',
      'stk-baby-pegasus-blue',
      'stk-baby-unicorn-gold',
      'stk-unicorn-sleepy',
      'stk-pegasus-rainbow',
      'stk-unicorn-carousel',
      'stk-emma-curtsy',
      'stk-emma-twirl',
      'stk-sparky-prince',
      'stk-doggie-jester',
      'stk-fairy-butterfly',
      'stk-royal-swan',
      'stk-diamond-crown',
      'stk-crystal-slipper',
      'stk-magic-scepter',
      'stk-treasure-chest',
      'stk-heart-locket',
      'stk-birthday-cake',
      'stk-icecream-sundae',
      'stk-macaron-tower',
      'stk-candy-carriage',
      'stk-rainbow-arch',
      'stk-royal-kitten',
      'stk-hot-air-balloon'
    ];
    for (const ucKey of unicornCastleSprites) {
      this.load.image(ucKey, `/assets/games/unicorn/sprites/${ucKey}.png?v=uc2`);
    }

    // 0a-6f. I Spy Curio Cabinet (`ISpyScene.ts`) 4 High-Res 2560x1440 Studio Tableaux + 36 Miniature Object Sprites
    this.load.image('ispy-board-1', '/assets/games/ispy/boards/board-1-watchmaker.jpg?v=ispy1');
    this.load.image('ispy-board-1-full', '/assets/games/ispy/boards/board-1-watchmaker-full.jpg?v=ispy1');
    this.load.image('ispy-board-2', '/assets/games/ispy/boards/board-2-pirate.jpg?v=ispy1');
    this.load.image('ispy-board-2-full', '/assets/games/ispy/boards/board-2-pirate-full.jpg?v=ispy1');
    this.load.image('ispy-board-3', '/assets/games/ispy/boards/board-3-attic.jpg?v=ispy1');
    this.load.image('ispy-board-3-full', '/assets/games/ispy/boards/board-3-attic-full.jpg?v=ispy1');
    this.load.image('ispy-board-4', '/assets/games/ispy/boards/board-4-crater.jpg?v=ispy1');
    this.load.image('ispy-board-4-full', '/assets/games/ispy/boards/board-4-crater-full.jpg?v=ispy1');

    const ispySprites = [
      'item-alphabet-block',
      'item-amethyst-crystal',
      'item-blue-domino',
      'item-bowling-pin',
      'item-brass-compass',
      'item-brass-gear',
      'item-brass-key',
      'item-brass-sextant',
      'item-chess-knight',
      'item-doggie-figurine',
      'item-glass-marble',
      'item-gold-doubloon',
      'item-golden-acorn',
      'item-golden-crown',
      'item-green-trex',
      'item-jade-turtle',
      'item-music-bell',
      'item-painted-ladybug',
      'item-paperclip',
      'item-pearl-button',
      'item-pocket-watch',
      'item-porcelain-teacup',
      'item-red-die',
      'item-red-racecar',
      'item-red-roadster',
      'item-retro-rocket',
      'item-ruby-ring',
      'item-seashell',
      'item-silver-thimble',
      'item-silver-whistle',
      'item-sparky-figurine',
      'item-starfish',
      'item-strawberry-eraser',
      'item-t6-airplane',
      'item-triceratops',
      'item-wooden-train'
    ];
    for (const ispyKey of ispySprites) {
      this.load.image(ispyKey, `/assets/games/ispy/sprites/${ispyKey}.png?v=ispy1`);
    }

    // 0a-6g. Grandpa's Clockwork Train Table (`TrainTableScene.ts`) Stage Background + 24 Custom Sprites
    this.load.image('train-table-bg', '/assets/games/train/train-table-bg.png?v=tr1');
    const trainTableSprites = [
      'train-locomotive',
      'train-car-red',
      'train-car-blue',
      'train-car-gold',
      'char-grandpa',
      'char-wyatt',
      'char-emma',
      'char-doggie',
      'char-sparky',
      'mod-royal-bridge',
      'mod-stone-tunnel',
      'mod-xylophone-track',
      'mod-crossing-gate',
      'prop-station-depot',
      'prop-trex',
      'prop-unicorn-pasture',
      'prop-windmill',
      'prop-pine-forest',
      'prop-water-tower',
      'cargo-golden-log',
      'cargo-milk-barrel',
      'cargo-treasure-chest',
      'cargo-star-crate',
      'prop-whistle-cord'
    ];
    for (const trKey of trainTableSprites) {
      this.load.image(trKey, `/assets/games/train/sprites/${trKey}.png?v=tr1`);
    }

    // 0a-7. Book 2: "To Babci and Grandpa's House We Go! / A Colorado Adventure" (`ColoradoStoryScene.ts`)
    this.load.image('colorado-p0-cover', '/assets/stories/colorado/pages/p0-cover.jpg?v=co3');
    this.load.image('colorado-p1', '/assets/stories/colorado/pages/p1-clean.jpg?v=p1v1');
    this.load.image('colorado-p1-clean', '/assets/stories/colorado/pages/p1-clean.jpg?v=p1v1');
    this.load.image('colorado-p2', '/assets/stories/colorado/pages/p2-clean.jpg?v=p2v1');
    this.load.image('colorado-p2-clean', '/assets/stories/colorado/pages/p2-clean.jpg?v=p2v1');
    this.load.image('colorado-p3', '/assets/stories/colorado/pages/p3-clean.jpg?v=p3v1');
    this.load.image('colorado-p3-clean', '/assets/stories/colorado/pages/p3-clean.jpg?v=p3v1');
    this.load.image('colorado-p4', '/assets/stories/colorado/pages/p4-clean.jpg?v=p4v1');
    this.load.image('colorado-p4-clean', '/assets/stories/colorado/pages/p4-clean.jpg?v=p4v1');
    this.load.image('colorado-p5', '/assets/stories/colorado/pages/p5-clean.jpg?v=p5v1');
    this.load.image('colorado-p5-clean', '/assets/stories/colorado/pages/p5-clean.jpg?v=p5v1');
    this.load.image('colorado-p6', '/assets/stories/colorado/pages/p6-clean.jpg?v=p6v1');
    this.load.image('colorado-p6-clean', '/assets/stories/colorado/pages/p6-clean.jpg?v=p6v1');
    this.load.image('colorado-p7', '/assets/stories/colorado/pages/p7-clean.jpg?v=p7v1');
    this.load.image('colorado-p7-clean', '/assets/stories/colorado/pages/p7-clean.jpg?v=p7v1');
    this.load.image('colorado-p8', '/assets/stories/colorado/pages/p8.jpg?v=p8v1');
    this.load.image('colorado-p8-clean', '/assets/stories/colorado/pages/p8.jpg?v=p8v1');
    this.load.image('colorado-p9', '/assets/stories/colorado/pages/p8.jpg?v=p8v1');

    // Book 2 — Page 1 ("The Big Road Trip to Colorado") Multi-Frame Spritesheets & Foreground Mask
    this.load.spritesheet('p1_thule_sparky', '/assets/stories/colorado/sprites/p1/p1_thule_sparky.png?v=p1v1', {
      frameWidth: 462,
      frameHeight: 245
    });
    this.load.spritesheet('p1_doggie_suitcase', '/assets/stories/colorado/sprites/p1/p1_doggie_suitcase.png?v=p1v1', {
      frameWidth: 239,
      frameHeight: 269
    });
    this.load.spritesheet('p1_exhaust_smoke', '/assets/stories/colorado/sprites/p1/p1_exhaust_smoke.png?v=p1v1', {
      frameWidth: 249,
      frameHeight: 433
    });
    this.load.spritesheet('p1_bluebird', '/assets/stories/colorado/sprites/p1/p1_bluebird.png?v=p1v1', {
      frameWidth: 251,
      frameHeight: 276
    });
    this.load.spritesheet('p1_chipmunk', '/assets/stories/colorado/sprites/p1/p1_chipmunk.png?v=p1v1', {
      frameWidth: 263,
      frameHeight: 345
    });
    this.load.spritesheet('p1_eagle_soar', '/assets/stories/colorado/sprites/p1/p1_eagle_soar.png?v=p1v1', {
      frameWidth: 313,
      frameHeight: 252
    });
    this.load.spritesheet('p1_camping_cooler', '/assets/stories/colorado/sprites/p1/p1_camping_cooler.png?v=p1v1', {
      frameWidth: 266,
      frameHeight: 278
    });
    this.load.spritesheet('p1_autumn_leaves', '/assets/stories/colorado/sprites/p1/p1_autumn_leaves.png?v=p1v1', {
      frameWidth: 281,
      frameHeight: 281
    });
    this.load.image('p1_pine_freshener', '/assets/stories/colorado/sprites/p1/p1_pine_freshener.png?v=p1v1');
    this.load.image('p1_heads_foreground_mask', '/assets/stories/colorado/sprites/p1/p1_heads_foreground_mask.png?v=p1v2');

    // Book 2 — Page 2 ("Arriving at Babci & Grandpa's House") Multi-Frame 1x4 Spritesheets
    this.load.spritesheet('p2_grandparents_wave', '/assets/stories/colorado/sprites/p2/p2_grandparents_wave.png?v=p2v1', {
      frameWidth: 263,
      frameHeight: 332
    });
    this.load.spritesheet('p2_wyatt_run', '/assets/stories/colorado/sprites/p2/p2_wyatt_run.png?v=p2v1', {
      frameWidth: 229,
      frameHeight: 318
    });
    this.load.spritesheet('p2_emma_run', '/assets/stories/colorado/sprites/p2/p2_emma_run.png?v=p2v1', {
      frameWidth: 217,
      frameHeight: 315
    });
    this.load.spritesheet('p2_chimney_sparky', '/assets/stories/colorado/sprites/p2/p2_chimney_sparky.png?v=p2v1', {
      frameWidth: 190,
      frameHeight: 415
    });
    this.load.spritesheet('p2_bush_doggie', '/assets/stories/colorado/sprites/p2/p2_bush_doggie.png?v=p2v1', {
      frameWidth: 228,
      frameHeight: 324
    });
    this.load.spritesheet('p2_lavender_butterflies', '/assets/stories/colorado/sprites/p2/p2_lavender_butterflies.png?v=p2v1', {
      frameWidth: 240,
      frameHeight: 245
    });
    this.load.spritesheet('p2_lawn_sprinkler', '/assets/stories/colorado/sprites/p2/p2_lawn_sprinkler.png?v=p2v1', {
      frameWidth: 246,
      frameHeight: 192
    });
    this.load.spritesheet('p2_tree_squirrel', '/assets/stories/colorado/sprites/p2/p2_tree_squirrel.png?v=p2v1', {
      frameWidth: 250,
      frameHeight: 337
    });

    // Book 2 — Page 3 ("Manitou Springs Penny Arcade") Multi-Frame 1x4 Spritesheets
    this.load.spritesheet('p3_wyatt_skeeball', '/assets/stories/colorado/sprites/p3/p3_wyatt_skeeball.png?v=p3v1', {
      frameWidth: 271,
      frameHeight: 381
    });
    this.load.spritesheet('p3_emma_tickets', '/assets/stories/colorado/sprites/p3/p3_emma_tickets.png?v=p3v1', {
      frameWidth: 265,
      frameHeight: 414
    });
    this.load.spritesheet('p3_grandparents_cheer', '/assets/stories/colorado/sprites/p3/p3_grandparents_cheer.png?v=p3v1', {
      frameWidth: 280,
      frameHeight: 498
    });
    this.load.spritesheet('p3_pony_doggie', '/assets/stories/colorado/sprites/p3/p3_pony_doggie.png?v=p3v1', {
      frameWidth: 252,
      frameHeight: 409
    });
    this.load.spritesheet('p3_claw_sparky', '/assets/stories/colorado/sprites/p3/p3_claw_sparky.png?v=p3v1', {
      frameWidth: 219,
      frameHeight: 517
    });
    this.load.spritesheet('p3_fortuneteller', '/assets/stories/colorado/sprites/p3/p3_fortuneteller.png?v=p3v1', {
      frameWidth: 259,
      frameHeight: 291
    });
    this.load.spritesheet('p3_bigfoot_wheel', '/assets/stories/colorado/sprites/p3/p3_bigfoot_wheel.png?v=p3v1', {
      frameWidth: 267,
      frameHeight: 262
    });
    this.load.audio('p3_ambient_arcade_loop', '/assets/audio/colorado/sfx/p3_ambient_arcade_loop.mp3');
    this.load.audio('p3_ambient_crowd_chatter', '/assets/audio/colorado/sfx/p3_ambient_crowd_chatter.mp3');

    // Book 2 — Page 4 ("Eleven Mile Canyon & South Platte River") Multi-Frame 1x4 Spritesheets & Canyon Mask
    this.load.spritesheet('p4_bighorn', '/assets/stories/colorado/sprites/p4/p4_bighorn.png?v=p4v1', {
      frameWidth: 221,
      frameHeight: 367
    });
    this.load.spritesheet('p4_cessna', '/assets/stories/colorado/sprites/p4/p4_cessna.png?v=p4v1', {
      frameWidth: 240,
      frameHeight: 101
    });
    this.load.spritesheet('p4_doggie_fisherman', '/assets/stories/colorado/sprites/p4/p4_doggie_fisherman.png?v=p4v1', {
      frameWidth: 245,
      frameHeight: 235
    });
    this.load.spritesheet('p4_dragonfly', '/assets/stories/colorado/sprites/p4/p4_dragonfly.png?v=p4v1', {
      frameWidth: 221,
      frameHeight: 237
    });
    this.load.spritesheet('p4_sparky_tube', '/assets/stories/colorado/sprites/p4/p4_sparky_tube.png?v=p4v1', {
      frameWidth: 268,
      frameHeight: 210
    });
    this.load.image('p4_canyon_foreground_mask', '/assets/stories/colorado/sprites/p4/p4_canyon_foreground_mask.png?v=p4v1');
    this.load.audio('p4_ambient_stream', '/assets/audio/colorado/sfx/p4_ambient_stream.mp3');

    // Book 2 — Page 5 ("Royal Gorge Bridge & Aerial Gondola") Multi-Frame 1x4 Spritesheets & Cliff Mask
    this.load.spritesheet('p5_gondola_sparky', '/assets/stories/colorado/sprites/p5/p5_gondola_sparky.png?v=p5v1', {
      frameWidth: 221,
      frameHeight: 377
    });
    this.load.spritesheet('p5_tower_flags', '/assets/stories/colorado/sprites/p5/p5_tower_flags.png?v=p5v1', {
      frameWidth: 214,
      frameHeight: 136
    });
    this.load.spritesheet('p5_railing_doggie', '/assets/stories/colorado/sprites/p5/p5_railing_doggie.png?v=p5v1', {
      frameWidth: 175,
      frameHeight: 247
    });
    this.load.spritesheet('p5_canyon_eagle', '/assets/stories/colorado/sprites/p5/p5_canyon_eagle.png?v=p5v1', {
      frameWidth: 300,
      frameHeight: 204
    });
    this.load.spritesheet('p5_tiny_raft', '/assets/stories/colorado/sprites/p5/p5_tiny_raft.png?v=p5v1', {
      frameWidth: 156,
      frameHeight: 154
    });
    this.load.image('p5_bridge_cables_mask', '/assets/stories/colorado/sprites/p5/p5_bridge_cables_mask.png?v=p5v2');
    this.load.audio('p5_ambient_gorge_wind', '/assets/audio/colorado/sfx/p5_ambient_gorge_wind.mp3');
    this.load.audio('p5_gusting_canyon_wind', '/assets/audio/colorado/sfx/p5_gusting_canyon_wind.mp3');
    this.load.audio('p5_gondola_cable_loop', '/assets/audio/colorado/sfx/p5_gondola_cable_loop.mp3');

    // Book 2 — Page 6 ("Royal Gorge Train Vista Car") Multi-Frame 1x4 Spritesheets & Handrail Mask
    this.load.spritesheet('p6_wyatt_horn', '/assets/stories/colorado/sprites/p6/p6_wyatt_horn.png?v=p6v1', {
      frameWidth: 268,
      frameHeight: 549
    });
    this.load.spritesheet('p6_grandpa_cheer', '/assets/stories/colorado/sprites/p6/p6_grandpa_cheer.png?v=p6v1', {
      frameWidth: 150,
      frameHeight: 247
    });
    this.load.spritesheet('p6_babci_emma', '/assets/stories/colorado/sprites/p6/p6_babci_emma.png?v=p6v1', {
      frameWidth: 348,
      frameHeight: 448
    });
    this.load.spritesheet('p6_railing_doggie', '/assets/stories/colorado/sprites/p6/p6_railing_doggie.png?v=p6v1', {
      frameWidth: 334,
      frameHeight: 238
    });
    this.load.spritesheet('p6_river_otter', '/assets/stories/colorado/sprites/p6/p6_river_otter.png?v=p6v1', {
      frameWidth: 238,
      frameHeight: 199
    });
    this.load.image('p6_handrail_foreground_mask', '/assets/stories/colorado/sprites/p6/p6_handrail_foreground_mask.png?v=p6v1');
    this.load.audio('sfx_train_chug', '/assets/audio/colorado/sfx/sfx_train_chug.mp3');
    this.load.audio('sfx_train_horn', '/assets/audio/colorado/sfx/sfx_train_horn.mp3');
    this.load.audio('p6_ambient_river_rapids', '/assets/audio/colorado/sfx/p6_ambient_river_rapids.mp3');

    // Book 2 — Page 7 ("Garden of the Gods") Multi-Frame 1x4 Spritesheets & Page 7/8 Ambient Audio
    this.load.spritesheet('p7_grandparents_emma', '/assets/stories/colorado/sprites/p7/p7_grandparents_emma.png?v=p7v1', {
      frameWidth: 280,
      frameHeight: 350
    });
    this.load.spritesheet('p7_wyatt_point', '/assets/stories/colorado/sprites/p7/p7_wyatt_point.png?v=p7v1', {
      frameWidth: 242,
      frameHeight: 443
    });
    this.load.spritesheet('p7_boulder_sparky', '/assets/stories/colorado/sprites/p7/p7_boulder_sparky.png?v=p7v1', {
      frameWidth: 258,
      frameHeight: 283
    });
    this.load.spritesheet('p7_trail_doggie', '/assets/stories/colorado/sprites/p7/p7_trail_doggie.png?v=p7v1', {
      frameWidth: 236,
      frameHeight: 328
    });
    this.load.spritesheet('p7_bluebirds', '/assets/stories/colorado/sprites/p7/p7_bluebirds.png?v=p7v1', {
      frameWidth: 250,
      frameHeight: 165
    });
    this.load.audio('p7_ambient_nature_breeze', '/assets/audio/colorado/sfx/p7_ambient_nature_breeze.mp3');
    this.load.audio('p7_ambient_meadow_birds', '/assets/audio/colorado/sfx/p7_ambient_meadow_birds.mp3');
    this.load.audio('p8_pierogi_sizzle_loop', '/assets/audio/colorado/sfx/p8_pierogi_sizzle_loop.mp3');
    this.load.audio('p8_cozy_kitchen_guitar', '/assets/audio/colorado/sfx/p8_cozy_kitchen_guitar.mp3');

    const coloradoSprites = [
      'spr-thule-box', 'spr-subaru-wheel', 'spr-hawk', 'spr-wyatt-emma-wave',
      'spr-grandpa-babci-wave', 'spr-front-door', 'spr-butterflies', 'spr-doggie-bush',
      'spr-claw-plush', 'spr-skeeball', 'spr-arcade-pony', 'spr-neon-star',
      'spr-trout', 'spr-water-splash', 'spr-emma-splash', 'spr-chipmunk',
      'spr-gondola', 'spr-eagle', 'spr-co-flag', 'spr-train-horn',
      'spr-steam-puff', 'spr-conductor-hat', 'spr-kayak', 'spr-climber',
      'spr-camels-glow', 'spr-bunny', 'spr-sparky-rock', 'spr-wagon-ride',
      'spr-golf-ball', 'spr-golf-flag', 'spr-pierogi-pan', 'spr-flour-puff',
      'spr-pierogi-plate', 'spr-babci-hug', 'spr-doggie-chef', 'spr-sparky-chef',
      'spr-compass', 'spr-lavender-box', 'spr-ticket-burst', 'spr-creel-basket',
      'spr-binoculars', 'spr-rail-lantern', 'spr-bluebird', 'spr-columbine-pot',
      'spr-potato-cheese-bowl', 'spr-arrow-left', 'spr-arrow-right', 'spr-mountain-crest'
    ];
    for (const sKey of coloradoSprites) {
      this.load.image(sKey, `/assets/stories/colorado/sprites/${sKey}.png?v=co2`);
    }

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

  /**
   * Renders an ornate, centered Mahogany & Polished Brass Progress Bar (`560x38px`) with a warm
   * golden starlight fill, live percentage (`0%` -> `100%`), cycling status subtitles, and a
   * twinkling starlight shimmer on the leading edge while assets preload. Also fades out and
   * removes the pre-boot HTML `#heirloom-boot-splash` overlay once Phaser mounts.
   */
  private mountHeirloomLoadingBar(): void {
    if (typeof document !== 'undefined') {
      const htmlSplash = document.getElementById('heirloom-boot-splash');
      if (htmlSplash) {
        htmlSplash.style.opacity = '0';
        window.setTimeout(() => {
          htmlSplash.remove();
        }, 420);
      }
    }

    this.cameras.main.setBackgroundColor('#120c08');

    const root = this.add.container(640, 360).setDepth(500);

    // Ornate Mahogany & Brass Cabinet Backing Plaque
    const plaque = this.add.graphics();
    plaque.fillStyle(0x1c1008, 0.96);
    plaque.fillRoundedRect(-350, -145, 700, 290, 24);
    plaque.lineStyle(4, 0xd97706, 1);
    plaque.strokeRoundedRect(-350, -145, 700, 290, 24);
    plaque.lineStyle(1.5, 0xfef08a, 0.45);
    plaque.strokeRoundedRect(-342, -137, 684, 274, 20);

    // Corner brass rivets
    const rivetCoords = [
      [-326, -121],
      [326, -121],
      [-326, 121],
      [326, 121]
    ];
    for (const [rx, ry] of rivetCoords) {
      plaque.fillStyle(0xfbbf24, 1);
      plaque.fillCircle(rx, ry, 5);
      plaque.lineStyle(1.5, 0x78350f, 1);
      plaque.strokeCircle(rx, ry, 5);
    }

    const titleText = this.add
      .text(0, -96, "WYATT & EMMA'S HEIRLOOM ARCADE", {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#271206',
        strokeThickness: 4
      })
      .setOrigin(0.5);

    const percentText = this.add
      .text(0, -44, '0%', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#fde047',
        stroke: '#271206',
        strokeThickness: 5
      })
      .setOrigin(0.5);

    // Mahogany & Polished Brass Progress Bar Frame (`width: 560px, height: 38px`)
    const barW = 560;
    const barH = 38;
    const barX = -barW / 2;
    const barY = -barH / 2 + 8;

    const barTrack = this.add.graphics();
    // Recessed dark walnut trough
    barTrack.fillStyle(0x120904, 1);
    barTrack.fillRoundedRect(barX, barY, barW, barH, 19);
    // Outer polished brass bezel
    barTrack.lineStyle(4, 0xf59e0b, 1);
    barTrack.strokeRoundedRect(barX, barY, barW, barH, 19);
    // Inner golden rim highlight
    barTrack.lineStyle(1.5, 0xfef08a, 0.65);
    barTrack.strokeRoundedRect(barX + 3, barY + 3, barW - 6, barH - 6, 16);

    const barFill = this.add.graphics();

    // Twinkling Starlight Shimmer along the leading edge of the progress fill bar
    const leadingShimmer = this.add.graphics();
    leadingShimmer.fillStyle(0xffffff, 0.95);
    leadingShimmer.fillCircle(0, 0, 7);
    leadingShimmer.fillStyle(0xfef08a, 0.55);
    leadingShimmer.fillCircle(0, 0, 15);
    leadingShimmer.setPosition(barX + 14, barY + barH / 2);

    const shimmerTween = this.tweens.add({
      targets: leadingShimmer,
      scaleX: { from: 0.82, to: 1.28 },
      scaleY: { from: 0.82, to: 1.28 },
      alpha: { from: 0.72, to: 1.0 },
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const statusSubtitles = [
      'Polishing the brass gears...',
      'Inflating the cloud karts...',
      'Fueling the moon rocket...',
      'Setting up the unicorn tea party...'
    ];

    const subtitleText = this.add
      .text(0, 68, statusSubtitles[0], {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '20px',
        fontStyle: 'italic',
        color: '#fcd34d',
        stroke: '#1c0d06',
        strokeThickness: 3
      })
      .setOrigin(0.5);

    root.add([plaque, titleText, percentText, barTrack, barFill, leadingShimmer, subtitleText]);

    const drawProgress = (rawVal: number) => {
      const clamped = Phaser.Math.Clamp(rawVal, 0, 1);
      const pct = Math.round(clamped * 100);
      percentText.setText(`${pct}%`);

      const stageIdx = Math.min(
        statusSubtitles.length - 1,
        Math.floor(clamped * statusSubtitles.length)
      );
      subtitleText.setText(statusSubtitles[stageIdx]);

      const pad = 5;
      const innerMaxW = barW - pad * 2;
      const fillW = Math.max(24, innerMaxW * clamped);
      const innerH = barH - pad * 2;

      barFill.clear();
      if (clamped > 0.005) {
        // Warm golden starlight body fill
        barFill.fillStyle(0xf59e0b, 1);
        barFill.fillRoundedRect(barX + pad, barY + pad, fillW, innerH, 14);
        // Upper starlight specular ribbon
        barFill.fillStyle(0xfef08a, 0.85);
        barFill.fillRoundedRect(barX + pad + 4, barY + pad + 3, Math.max(12, fillW - 8), innerH * 0.42, 7);
      }

      leadingShimmer.setPosition(barX + pad + fillW - 6, barY + barH / 2);
    };

    drawProgress(0);

    const onProgress = (value: number) => {
      drawProgress(value);
    };

    this.load.on('progress', onProgress);
    this.load.once('complete', () => {
      drawProgress(1);
      this.load.off('progress', onProgress);
      shimmerTween.stop();
      root.destroy(true);
    });
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
      'mode-tv',
      'book-nana',
      'book-grandpa-bapci',
      'book-louisiana',
      'shelf-sparky',
      'create-art-studio',
      'create-tinker-box',
      'create-music-box',
      'arcade-toy-balloon',
      'arcade-toy-bounce',
      'arcade-toy-kart',
      'studio-frame-bg',
      'tool-crayon',
      'tool-glitter-brush',
      'tool-roller',
      'tool-bucket',
      'tool-undo',
      'tool-sponge',
      'tool-bookshelf',
      'tool-sticker-box',
      'ui-paint-well-rim',
      'ui-paint-well-fill',
      'ui-brass-frame',
      'ui-page-left',
      'ui-page-right',
      'melody-frame-bg',
      'key-0',
      'key-1',
      'key-2',
      'key-3',
      'key-4',
      'key-5',
      'key-6',
      'key-7',
      'prop-mallet-left',
      'prop-mallet-right',
      'prop-firefly',
      'prop-star-burst',
      'band-sparky-0',
      'band-sparky-1',
      'band-sparky-2',
      'band-doggie-0',
      'band-doggie-1',
      'band-doggie-2',
      'band-choir-0',
      'band-choir-1',
      'band-choir-2',
      'voice-glockenspiel',
      'voice-marimba',
      'voice-piano',
      'voice-doggie',
      'voice-sparky',
      'song-twinkle',
      'song-mary',
      'song-macdonald',
      'song-rowboat',
      'song-roadster',
      'mode-autoplay',
      'mode-firefly',
      'mode-maestro',
      'rhythm-campfire',
      'rhythm-parade',
      'tinker-frame-bg',
      'part-chute',
      'part-gear',
      'part-seesaw',
      'part-flipper',
      'part-trampoline',
      'part-bellows',
      'part-bowl',
      'part-wedge',
      'part-hammer',
      'part-funnel',
      'part-wall',
      'prop-marble',
      'prop-acorn',
      'prop-bumper',
      'prop-star',
      'prop-chain',
      'prop-pull-chain',
      'tinker-sparky-0',
      'tinker-sparky-1',
      'tinker-sparky-2',
      'tinker-doggie-0',
      'tinker-doggie-1',
      'tinker-doggie-2',
      'sparky-hopper-1',
      'sparky-hopper-2',
      'sparky-hopper-3',
      'doggie-cart-1',
      'doggie-cart-2',
      'doggie-cart-3',
      'puzzle-1',
      'puzzle-2',
      'puzzle-3',
      'puzzle-4',
      'puzzle-5',
      'tinker-mode-guide',
      'tinker-mode-stars',
      'tinker-mode-fountain',
      'tinker-action-drop',
      'tinker-action-clear',
      'colorado-p0-cover',
      'colorado-p1',
      'p1_thule_sparky',
      'p1_doggie_suitcase',
      'p1_exhaust_smoke',
      'p1_bluebird',
      'p1_chipmunk',
      'p1_eagle_soar',
      'p1_camping_cooler',
      'p1_autumn_leaves',
      'p1_pine_freshener',
      'p1_heads_foreground_mask',
      'colorado-p2',
      'colorado-p2-clean',
      'p2_grandparents_wave',
      'p2_wyatt_run',
      'p2_emma_run',
      'p2_chimney_sparky',
      'p2_bush_doggie',
      'p2_lavender_butterflies',
      'p2_lawn_sprinkler',
      'p2_tree_squirrel',
      'colorado-p3',
      'colorado-p3-clean',
      'p3_wyatt_skeeball',
      'p3_emma_tickets',
      'p3_grandparents_cheer',
      'p3_pony_doggie',
      'p3_claw_sparky',
      'p3_fortuneteller',
      'p3_bigfoot_wheel',
      'colorado-p4',
      'colorado-p4-clean',
      'p4_bighorn',
      'p4_cessna',
      'p4_doggie_fisherman',
      'p4_dragonfly',
      'p4_sparky_tube',
      'p4_canyon_foreground_mask',
      'colorado-p5',
      'colorado-p5-clean',
      'p5_gondola_sparky',
      'p5_tower_flags',
      'p5_railing_doggie',
      'p5_canyon_eagle',
      'p5_tiny_raft',
      'p5_bridge_cables_mask',
      'colorado-p6',
      'colorado-p6-clean',
      'p6_wyatt_horn',
      'p6_grandpa_cheer',
      'p6_babci_emma',
      'p6_railing_doggie',
      'p6_river_otter',
      'p6_handrail_foreground_mask',
      'colorado-p7',
      'colorado-p7-clean',
      'p7_grandparents_emma',
      'p7_wyatt_point',
      'p7_boulder_sparky',
      'p7_trail_doggie',
      'p7_bluebirds',
      'colorado-p8',
      'colorado-p8-clean',
      'colorado-p9'
    ];

    texKeys.forEach((key) => {
      if (this.textures.exists(key)) {
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    });

    // Enforce smooth LINEAR filtering on all Starship Unicorn 1080p/4K HD textures!
    const linearKeys = [
      'hub-toy-starship-unicorn',
      'starship-board-bg',
      'starship-astro-robert',
      'starship-astro-rita',
      'starship-astro-wyatt',
      'starship-astro-emma',
      'starship-astro-papa',
      'starship-astro-nana',
      'starship-astro-grandpa',
      'starship-astro-babci',
      'starship-astro-guest',
      'starship-card-robert',
      'starship-card-rita',
      'starship-card-wyatt',
      'starship-card-emma',
      'starship-card-papa',
      'starship-card-nana',
      'starship-card-grandpa',
      'starship-card-babci',
      'starship-card-guest',
      'starship-token-robert',
      'starship-token-rita',
      'starship-token-wyatt',
      'starship-token-emma',
      'starship-token-papa',
      'starship-token-nana',
      'starship-token-grandpa',
      'starship-token-babci',
      'starship-token-guest'
    ];
    linearKeys.forEach((key) => {
      if (this.textures.exists(key)) {
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
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
