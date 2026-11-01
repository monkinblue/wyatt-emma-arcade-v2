/**
 * storyTypes.ts
 * -------------
 * Declarative schema for Living Books ("Just Grandma and Me" style) interactive story cartridges.
 * Supports:
 * - Multi-variation hotspot skits (`variations`: 1st, 2nd, and 3rd tap cycle through distinct gags!)
 * - Optional full-bleed 32-bit Hi-Bit Pixel Art page backgrounds (`backgroundSrc`: `p1-bg.png` / `.jpg`)
 *   with automatic storybook illustration fallback when files aren't dropped in yet.
 * - Optional real family voice recordings (`narrationAudioSrc` & `voiceAudioSrc`).
 */

import { SfxName } from '../core/AudioBus';

export type HotspotPropType =
  // Legacy / shared props
  | 'sparky'
  | 'doggie'
  | 'frog-boot'
  | 'owl-tree'
  | 'campfire'
  | 'marshmallow-log'
  | 'tent-zipper'
  | 'backpack'
  | 'pine-squirrel'
  | 'lake-fish'
  | 'turtle-rock'
  | 'lily-pad'
  | 'ducks'
  | 'hollow-skunk'
  | 'mushrooms'
  | 'firefly-jar'
  | 'shooting-star'
  | 'moon'
  | 'guitar-cricket'
  | 'sleeping-bag'
  | 'sandcastle-crab'
  | 'beach-umbrella'
  | 'seagull-hat'
  | 'pelican-bucket'
  | 'ocean-whale'
  | 'coconut-tree'
  | 'treasure-shell'
  | 'surfboard'
  // Page 1: Touchdown at the Airport
  | 'nana-papa-hug'
  | 'runway-jet'
  | 'baggage-doggie'
  | 'carousel-suitcases'
  | 'flight-board'
  | 'grr-terminal-sign'
  | 'welcome-balloon'
  // Page 2: Nana's House in Zeeland
  | 'horseshoe-driveway'
  | 'white-mailbox'
  | 'front-porch-papa'
  | 'garden-flowers'
  | 'red-maple-leaves'
  // Page 3: Grammy's Big Cozy Chair
  | 'grammy-recliner'
  | 'cuckoo-clock'
  | 'musical-teacup'
  | 'doggie-pillow'
  | 'family-photo'
  // Page 4: Nana's Garage & Classic White Convertible
  | 'vintage-horn'
  | 'winking-headlights'
  | 'rock-radio'
  | 'red-paddle'
  | 'workbench-tools'
  // Page 5: Dutch Village Brick Lane
  | 'wooden-clogs'
  | 'brick-bakery-1613'
  | 'autumn-butterflies'
  | 'street-lamp'
  | 'peeking-kitty'
  // Page 6: Red Drawbridge & Giant Dutch Windmill
  | 'windmill-sparky'
  | 'canal-bullfrogs'
  | 'red-drawbridge'
  | 'canal-tulips'
  // Page 7: Lake Michigan Beach
  | 'emma-sandcastle'
  | 'papa-skipping-stones'
  | 'splashing-waves'
  // Page 8: Cabin in the Woods
  | 'yard-geese'
  | 'juliet-balcony'
  | 'silver-chimney'
  | 'wind-chimes'
  | 'woodland-deer'
  // Page 9: Cabin Woodfire Stove & Nana's Blanket Lullaby
  | 'wall-ducks'
  | 'whistling-kettle'
  | 'owl-trivet'
  | 'toy-trucks'
  | 'ducks-unlimited-logs'
  | 'nana-blanket-lullaby';

export type GagAnimationType =
  | 'jump-flip'
  | 'squash-pop'
  | 'wobble-spin'
  | 'peek-a-boo'
  | 'inflate-pop'
  | 'splash-arc'
  | 'sparkle-sneeze'
  | 'fly-circle'
  | 'conga-hop'
  | 'smoke-hearts'
  | 'spin-sails'
  | 'sandcastle-upgrade'
  | 'rocking-lullaby'
  | 'log-toss'
  | 'drive-zoom'
  | 'split-flap-jitter'
  | 'jet-nose-tilt'
  | 'hug-hearts'
  | 'suitcases-slide';

export interface HotspotSkitVariation {
  gagAnimation: GagAnimationType;
  sfx: SfxName;
  popText: string;
  speechLine: string;
  voiceAudioSrc?: string;
}

export interface StoryHotspotData {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  propType: HotspotPropType;
  gagAnimation: GagAnimationType;
  sfx: SfxName;
  popText: string;
  speechLine: string;
  voiceAudioSrc?: string;
  particleColors?: number[];
  /**
   * Optional 1st / 2nd / 3rd tap variations so repeat taps reward Wyatt & Emma
   * with fresh Living Books comedy skits!
   */
  variations?: HotspotSkitVariation[];
}

export type StoryPageTheme =
  | 'forest-arrival'
  | 'sunny-lake'
  | 'twilight-woods'
  | 'campfire-roast'
  | 'starry-tent'
  | 'sunny-beach'
  | 'nana-cover'
  | 'nana-p1-airport'
  | 'nana-p2-zeeland-house'
  | 'nana-p3-grammy-chair'
  | 'nana-p4-convertible'
  | 'nana-p5-dutch-village'
  | 'nana-p6-windmill-bridge'
  | 'nana-p7-lake-michigan'
  | 'nana-p8-woods-cabin'
  | 'nana-p9-cabin-stove';

export interface StoryPageData {
  pageNumber: number;
  title: string;
  theme: StoryPageTheme;
  /**
   * Optional path to full-bleed 1280x720 page illustration (e.g. `/assets/stories/nana/p1-bg.png`).
   * Automatically checked at runtime; falls back to our warm bespoke storybook sketch if not yet added.
   */
  backgroundSrc?: string;
  words: string[];
  /**
   * Optional per-word start timestamps in milliseconds (matched to `narrationAudioSrc` speech envelope)
   * so each word in the top parchment banner highlights and bounces in exact sync with the narrator!
   */
  wordTimings?: number[];
  narrationDurationMs?: number;
  narrationAudioSrc?: string;
  hotspots: StoryHotspotData[];
}

export interface StoryCartridge {
  id: string;
  title: string;
  subtitle: string;
  coverEmoji: string;
  accentColor: number;
  pages: StoryPageData[];
}
