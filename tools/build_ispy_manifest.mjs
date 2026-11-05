#!/usr/bin/env node
/**
 * Deterministic 2-Pass Walter Wick Studio Layout & Coordinate Manifest Builder
 * (`tools/build_ispy_manifest.mjs` -> `src/data/ispyLevels.json`).
 *
 * Scatters 102 miniature objects per board across the 2560x1440 studio backdrop:
 *   - 20 Target Instances across 3 Riddle Tiers (Junior Scout, Detective, Master Inspector)
 *     constrained to the safe interactive stage zone (texX: 250..2310, texY: 180..1050 =>
 *     stageX: 125..1155, stageY: 90..525) with >= 165px target-to-target spacing.
 *   - 82 Clutter/Decoy Instances chosen exclusively from non-target item types for that board,
 *     with >= 122px clearance from every target center so no target is ever occluded or buried.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export const ITEM_CATALOG = {
  'item-brass-key': {
    id: 'item-brass-key',
    label: 'Brass Key',
    pluralLabel: 'Brass Keys',
    audioKey: 'item_brass_key',
    canRotateFull: true
  },
  'item-red-die': {
    id: 'item-red-die',
    label: 'Red Die',
    pluralLabel: 'Red Dice',
    audioKey: 'item_red_die',
    canRotateFull: true
  },
  'item-glass-marble': {
    id: 'item-glass-marble',
    label: 'Swirl Marble',
    pluralLabel: 'Swirl Marbles',
    audioKey: 'item_glass_marble',
    canRotateFull: true
  },
  'item-silver-thimble': {
    id: 'item-silver-thimble',
    label: 'Silver Thimble',
    pluralLabel: 'Silver Thimbles',
    audioKey: 'item_silver_thimble',
    canRotateFull: false
  },
  'item-chess-knight': {
    id: 'item-chess-knight',
    label: 'Chess Knight',
    pluralLabel: 'Chess Knights',
    audioKey: 'item_chess_knight',
    canRotateFull: false
  },
  'item-red-racecar': {
    id: 'item-red-racecar',
    label: 'Red Racecar',
    pluralLabel: 'Red Racecars',
    audioKey: 'item_red_racecar',
    canRotateFull: false
  },
  'item-golden-acorn': {
    id: 'item-golden-acorn',
    label: 'Golden Acorn',
    pluralLabel: 'Golden Acorns',
    audioKey: 'item_golden_acorn',
    canRotateFull: true
  },
  'item-green-trex': {
    id: 'item-green-trex',
    label: 'Green Dinosaur',
    pluralLabel: 'Green Dinosaurs',
    audioKey: 'item_green_trex',
    canRotateFull: false
  },
  'item-pearl-button': {
    id: 'item-pearl-button',
    label: 'Pearl Button',
    pluralLabel: 'Pearl Buttons',
    audioKey: 'item_pearl_button',
    canRotateFull: true
  },
  'item-brass-compass': {
    id: 'item-brass-compass',
    label: 'Brass Compass',
    pluralLabel: 'Brass Compasses',
    audioKey: 'item_brass_compass',
    canRotateFull: false
  },
  'item-strawberry-eraser': {
    id: 'item-strawberry-eraser',
    label: 'Strawberry Eraser',
    pluralLabel: 'Strawberry Erasers',
    audioKey: 'item_strawberry_eraser',
    canRotateFull: false
  },
  'item-blue-domino': {
    id: 'item-blue-domino',
    label: 'Blue Domino',
    pluralLabel: 'Blue Dominoes',
    audioKey: 'item_blue_domino',
    canRotateFull: true
  },
  'item-painted-ladybug': {
    id: 'item-painted-ladybug',
    label: 'Painted Ladybug',
    pluralLabel: 'Painted Ladybugs',
    audioKey: 'item_painted_ladybug',
    canRotateFull: true
  },
  'item-t6-airplane': {
    id: 'item-t6-airplane',
    label: 'Tiny Airplane',
    pluralLabel: 'Tiny Airplanes',
    audioKey: 'item_t6_airplane',
    canRotateFull: false
  },
  'item-red-roadster': {
    id: 'item-red-roadster',
    label: 'Red Roadster',
    pluralLabel: 'Red Roadsters',
    audioKey: 'item_red_roadster',
    canRotateFull: false
  },
  'item-golden-crown': {
    id: 'item-golden-crown',
    label: 'Golden Crown',
    pluralLabel: 'Golden Crowns',
    audioKey: 'item_golden_crown',
    canRotateFull: false
  },
  'item-starfish': {
    id: 'item-starfish',
    label: 'Ocean Starfish',
    pluralLabel: 'Ocean Starfish',
    audioKey: 'item_starfish',
    canRotateFull: true
  },
  'item-paperclip': {
    id: 'item-paperclip',
    label: 'Shiny Paperclip',
    pluralLabel: 'Shiny Paperclips',
    audioKey: 'item_paperclip',
    canRotateFull: true
  },
  'item-pocket-watch': {
    id: 'item-pocket-watch',
    label: 'Pocket Watch',
    pluralLabel: 'Pocket Watches',
    audioKey: 'item_pocket_watch',
    canRotateFull: false
  },
  'item-bowling-pin': {
    id: 'item-bowling-pin',
    label: 'Bowling Pin',
    pluralLabel: 'Bowling Pins',
    audioKey: 'item_bowling_pin',
    canRotateFull: false
  },
  'item-sparky-figurine': {
    id: 'item-sparky-figurine',
    label: 'Little Sparky',
    pluralLabel: 'Little Sparkys',
    audioKey: 'item_sparky_figurine',
    canRotateFull: false
  },
  'item-doggie-figurine': {
    id: 'item-doggie-figurine',
    label: 'Fluffy Doggie',
    pluralLabel: 'Fluffy Doggies',
    audioKey: 'item_doggie_figurine',
    canRotateFull: false
  },
  'item-brass-gear': {
    id: 'item-brass-gear',
    label: 'Brass Gear',
    pluralLabel: 'Brass Gears',
    audioKey: 'item_brass_key',
    canRotateFull: true
  },
  'item-gold-doubloon': {
    id: 'item-gold-doubloon',
    label: 'Gold Doubloon',
    pluralLabel: 'Gold Doubloons',
    audioKey: 'item_golden_crown',
    canRotateFull: true
  },
  'item-ruby-ring': {
    id: 'item-ruby-ring',
    label: 'Ruby Ring',
    pluralLabel: 'Ruby Rings',
    audioKey: 'item_ruby_ring',
    canRotateFull: false
  },
  'item-seashell': {
    id: 'item-seashell',
    label: 'Striped Seashell',
    pluralLabel: 'Striped Seashells',
    audioKey: 'item_seashell',
    canRotateFull: true
  },
  'item-wooden-train': {
    id: 'item-wooden-train',
    label: 'Wooden Train',
    pluralLabel: 'Wooden Trains',
    audioKey: 'item_wooden_train',
    canRotateFull: false
  },
  'item-alphabet-block': {
    id: 'item-alphabet-block',
    label: 'Alphabet Block',
    pluralLabel: 'Alphabet Blocks',
    audioKey: 'item_alphabet_block',
    canRotateFull: false
  },
  'item-porcelain-teacup': {
    id: 'item-porcelain-teacup',
    label: 'Porcelain Teacup',
    pluralLabel: 'Porcelain Teacups',
    audioKey: 'item_porcelain_teacup',
    canRotateFull: false
  },
  'item-amethyst-crystal': {
    id: 'item-amethyst-crystal',
    label: 'Purple Crystal',
    pluralLabel: 'Purple Crystals',
    audioKey: 'item_amethyst_crystal',
    canRotateFull: false
  },
  'item-retro-rocket': {
    id: 'item-retro-rocket',
    label: 'Space Rocket',
    pluralLabel: 'Space Rockets',
    audioKey: 'item_retro_rocket',
    canRotateFull: false
  },
  'item-triceratops': {
    id: 'item-triceratops',
    label: 'Triceratops',
    pluralLabel: 'Triceratops',
    audioKey: 'item_triceratops',
    canRotateFull: false
  },
  'item-brass-sextant': {
    id: 'item-brass-sextant',
    label: 'Brass Sextant',
    pluralLabel: 'Brass Sextants',
    audioKey: 'item_brass_sextant',
    canRotateFull: false
  },
  'item-silver-whistle': {
    id: 'item-silver-whistle',
    label: 'Silver Whistle',
    pluralLabel: 'Silver Whistles',
    audioKey: 'item_silver_whistle',
    canRotateFull: false
  },
  'item-jade-turtle': {
    id: 'item-jade-turtle',
    label: 'Jade Turtle',
    pluralLabel: 'Jade Turtles',
    audioKey: 'item_jade_turtle',
    canRotateFull: true
  },
  'item-music-bell': {
    id: 'item-music-bell',
    label: 'Golden Bell',
    pluralLabel: 'Golden Bells',
    audioKey: 'item_music_bell',
    canRotateFull: false
  }
};

const ALL_ITEM_KEYS = Object.keys(ITEM_CATALOG);

const BOARD_SPECS = [
  {
    id: 'watchmaker',
    index: 0,
    title: "Grandpa's Watchmaker Drawer",
    shortTitle: 'Watchmaker Drawer',
    subtitle: 'Velvet Trays & Clockwork Gears',
    boardKey: 'ispy-board-1',
    fullBoardKey: 'ispy-board-1-full',
    boardFile: 'board-1-watchmaker.jpg',
    fullBoardFile: 'board-1-watchmaker-full.jpg',
    rawFile: 'board-1-watchmaker-raw.jpg',
    seed: 1042,
    tiers: [
      {
        tier: 1,
        tierTitle: 'Junior Scout',
        riddleId: 'riddle_b1_t1',
        riddleText:
          "I spy with my little eye, inside Grandpa's watchmaker drawer... three brass keys, two red dice, and one golden pocket watch ticking nice.",
        curioReward: {
          id: 'curio_pocket_watch',
          title: "Grandpa's Chronometer",
          subtitle: 'Watchmaker Tier 1 Seal',
          itemType: 'item-pocket-watch'
        },
        targets: [
          { itemType: 'item-brass-key', count: 3 },
          { itemType: 'item-red-die', count: 2 },
          { itemType: 'item-pocket-watch', count: 1 }
        ]
      },
      {
        tier: 2,
        tierTitle: 'Detective',
        riddleId: 'riddle_b1_t2',
        riddleText:
          'I spy with my little eye, gleaming in the velvet tray... three swirl marbles, two silver thimbles, and one tiny airplane ready to fly away.',
        curioReward: {
          id: 'curio_t6_airplane',
          title: 'Golden T-6 Texan',
          subtitle: 'Watchmaker Tier 2 Seal',
          itemType: 'item-t6-airplane'
        },
        targets: [
          { itemType: 'item-glass-marble', count: 3 },
          { itemType: 'item-silver-thimble', count: 2 },
          { itemType: 'item-t6-airplane', count: 1 }
        ]
      },
      {
        tier: 3,
        tierTitle: 'Master Inspector',
        riddleId: 'riddle_b1_t3',
        riddleText:
          'I spy with my little eye, hidden among the clockwork gears... three pearl buttons, two chess knights, two red roadsters, and one little Sparky dragon.',
        curioReward: {
          id: 'curio_sparky_dragon',
          title: 'Crystal Dragon Sparky',
          subtitle: 'Watchmaker Master Seal',
          itemType: 'item-sparky-figurine'
        },
        targets: [
          { itemType: 'item-pearl-button', count: 3 },
          { itemType: 'item-chess-knight', count: 2 },
          { itemType: 'item-red-roadster', count: 2 },
          { itemType: 'item-sparky-figurine', count: 1 }
        ]
      }
    ]
  },
  {
    id: 'pirate',
    index: 1,
    title: "Pirate Captain's Chest",
    shortTitle: 'Pirate Chest',
    subtitle: 'Maps, Doubloons & Sea Jewels',
    boardKey: 'ispy-board-2',
    fullBoardKey: 'ispy-board-2-full',
    boardFile: 'board-2-pirate.jpg',
    fullBoardFile: 'board-2-pirate-full.jpg',
    rawFile: 'board-2-pirate-raw.jpg',
    seed: 2089,
    tiers: [
      {
        tier: 1,
        tierTitle: 'Junior Scout',
        riddleId: 'riddle_b2_t1',
        riddleText:
          'I spy with my little eye, deep in the pirate treasure chest... three ocean starfish, two golden crowns, and one brass compass pointing west.',
        curioReward: {
          id: 'curio_diamond_crown',
          title: 'Diamond Royal Crown',
          subtitle: 'Pirate Chest Tier 1 Seal',
          itemType: 'item-golden-crown'
        },
        targets: [
          { itemType: 'item-starfish', count: 3 },
          { itemType: 'item-golden-crown', count: 2 },
          { itemType: 'item-brass-compass', count: 1 }
        ]
      },
      {
        tier: 2,
        tierTitle: 'Detective',
        riddleId: 'riddle_b2_t2',
        riddleText:
          "I spy with my little eye, where the captain's doubloons shine... three ruby rings, two striped seashells, and one brass sextant on the brine.",
        curioReward: {
          id: 'curio_brass_sextant',
          title: 'Antique Brass Sextant',
          subtitle: 'Pirate Chest Tier 2 Seal',
          itemType: 'item-brass-sextant'
        },
        targets: [
          { itemType: 'item-ruby-ring', count: 3 },
          { itemType: 'item-seashell', count: 2 },
          { itemType: 'item-brass-sextant', count: 1 }
        ]
      },
      {
        tier: 3,
        tierTitle: 'Master Inspector',
        riddleId: 'riddle_b2_t3',
        riddleText:
          'I spy with my little eye, beside the pirate map and rope... three brass keys, two jade turtles, two golden acorns, and one fluffy Doggie.',
        curioReward: {
          id: 'curio_captain_doggie',
          title: 'Pearl Captain Doggie',
          subtitle: 'Pirate Chest Master Seal',
          itemType: 'item-doggie-figurine'
        },
        targets: [
          { itemType: 'item-brass-key', count: 3 },
          { itemType: 'item-jade-turtle', count: 2 },
          { itemType: 'item-golden-acorn', count: 2 },
          { itemType: 'item-doggie-figurine', count: 1 }
        ]
      }
    ]
  },
  {
    id: 'attic',
    index: 2,
    title: "Enchanted Toymaker's Attic",
    shortTitle: "Toymaker's Attic",
    subtitle: 'Wooden Blocks, Ribbons & Trains',
    boardKey: 'ispy-board-3',
    fullBoardKey: 'ispy-board-3-full',
    boardFile: 'board-3-attic.jpg',
    fullBoardFile: 'board-3-attic-full.jpg',
    rawFile: 'board-3-attic-raw.jpg',
    seed: 3177,
    tiers: [
      {
        tier: 1,
        tierTitle: 'Junior Scout',
        riddleId: 'riddle_b3_t1',
        riddleText:
          "I spy with my little eye, up in the cozy toymaker's loft... three red racecars, two bowling pins, and one wooden train chugging soft.",
        curioReward: {
          id: 'curio_wooden_train',
          title: 'Heirloom Locomotive',
          subtitle: "Toymaker's Tier 1 Seal",
          itemType: 'item-wooden-train'
        },
        targets: [
          { itemType: 'item-red-racecar', count: 3 },
          { itemType: 'item-bowling-pin', count: 2 },
          { itemType: 'item-wooden-train', count: 1 }
        ]
      },
      {
        tier: 2,
        tierTitle: 'Detective',
        riddleId: 'riddle_b3_t2',
        riddleText:
          'I spy with my little eye, tucked by the wooden blocks so neat... three blue dominoes, two strawberry erasers, and one painted ladybug sweet.',
        curioReward: {
          id: 'curio_garden_ladybug',
          title: 'Enameled Ladybug',
          subtitle: "Toymaker's Tier 2 Seal",
          itemType: 'item-painted-ladybug'
        },
        targets: [
          { itemType: 'item-blue-domino', count: 3 },
          { itemType: 'item-strawberry-eraser', count: 2 },
          { itemType: 'item-painted-ladybug', count: 1 }
        ]
      },
      {
        tier: 3,
        tierTitle: 'Master Inspector',
        riddleId: 'riddle_b3_t3',
        riddleText:
          "I spy with my little eye, where the toymaker's ribbons curl... three shiny paperclips, two alphabet blocks, two porcelain teacups, and one golden bell.",
        curioReward: {
          id: 'curio_music_bell',
          title: "Chime Master's Bell",
          subtitle: "Toymaker's Master Seal",
          itemType: 'item-music-bell'
        },
        targets: [
          { itemType: 'item-paperclip', count: 3 },
          { itemType: 'item-alphabet-block', count: 2 },
          { itemType: 'item-porcelain-teacup', count: 2 },
          { itemType: 'item-music-bell', count: 1 }
        ]
      }
    ]
  },
  {
    id: 'crater',
    index: 3,
    title: 'Crystal Dinosaur & Space Crater',
    shortTitle: 'Crystal Space Crater',
    subtitle: 'Moon Craters, Dinosaurs & Quartz',
    boardKey: 'ispy-board-4',
    fullBoardKey: 'ispy-board-4-full',
    boardFile: 'board-4-crater.jpg',
    fullBoardFile: 'board-4-crater-full.jpg',
    rawFile: 'board-4-crater-raw.jpg',
    seed: 4293,
    tiers: [
      {
        tier: 1,
        tierTitle: 'Junior Scout',
        riddleId: 'riddle_b4_t1',
        riddleText:
          'I spy with my little eye, across the moon sand crater floor... three green dinosaurs, two purple crystals, and one space rocket ready to soar.',
        curioReward: {
          id: 'curio_retro_rocket',
          title: 'Starlight Chrome Rocket',
          subtitle: 'Space Crater Tier 1 Seal',
          itemType: 'item-retro-rocket'
        },
        targets: [
          { itemType: 'item-green-trex', count: 3 },
          { itemType: 'item-amethyst-crystal', count: 2 },
          { itemType: 'item-retro-rocket', count: 1 }
        ]
      },
      {
        tier: 2,
        tierTitle: 'Detective',
        riddleId: 'riddle_b4_t2',
        riddleText:
          'I spy with my little eye, among the glowing crystal stones... three swirl marbles, two triceratops, and one silver whistle with bright tones.',
        curioReward: {
          id: 'curio_silver_whistle',
          title: "Inspector's Whistle",
          subtitle: 'Space Crater Tier 2 Seal',
          itemType: 'item-silver-whistle'
        },
        targets: [
          { itemType: 'item-glass-marble', count: 3 },
          { itemType: 'item-triceratops', count: 2 },
          { itemType: 'item-silver-whistle', count: 1 }
        ]
      },
      {
        tier: 3,
        tierTitle: 'Master Inspector',
        riddleId: 'riddle_b4_t3',
        riddleText:
          'I spy with my little eye, in the starlight crystal crater box... three golden acorns, two red roadsters, two tiny airplanes, and one little Sparky on the rocks.',
        curioReward: {
          id: 'curio_amethyst_geode',
          title: 'Nebula Amethyst Geode',
          subtitle: 'Space Crater Master Seal',
          itemType: 'item-amethyst-crystal'
        },
        targets: [
          { itemType: 'item-golden-acorn', count: 3 },
          { itemType: 'item-red-roadster', count: 2 },
          { itemType: 'item-t6-airplane', count: 2 },
          { itemType: 'item-sparky-figurine', count: 1 }
        ]
      }
    ]
  }
];

function createMulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildBoardObjects(boardSpec) {
  const rand = createMulberry32(boardSpec.seed);
  const placedObjects = [];
  const targetTypeSet = new Set();

  for (const tierSpec of boardSpec.tiers) {
    for (const t of tierSpec.targets) {
      targetTypeSet.add(t.itemType);
    }
  }

  // 1. Place all 20 Target Instances in the safe interactive stage playfield
  //    texX: [240..2320] (stageX: 120..1160)
  //    texY: [185..1030] (stageY: 92.5..515, clear of top bar 0..66 and bottom dock 560..720)
  for (const tierSpec of boardSpec.tiers) {
    for (const targetGroup of tierSpec.targets) {
      const meta = ITEM_CATALOG[targetGroup.itemType];
      targetGroup.label = meta.label;
      targetGroup.pluralLabel = meta.pluralLabel;
      targetGroup.audioKey = meta.audioKey;

      for (let inst = 0; inst < targetGroup.count; inst++) {
        let bestX = 1280;
        let bestY = 600;
        let bestMinDist = -1;

        for (let attempt = 0; attempt < 260; attempt++) {
          const candX = Math.round(250 + rand() * (2310 - 250));
          const candY = Math.round(188 + rand() * (1026 - 188));
          let minDist = Infinity;

          for (const existing of placedObjects) {
            const d = Math.hypot(candX - existing.texX, candY - existing.texY);
            // Extra spread between identical target items so duplicates live in different compartments
            const weight = existing.itemType === targetGroup.itemType ? 0.45 : 1.0;
            const effDist = d * weight;
            if (effDist < minDist) minDist = effDist;
          }

          if (minDist >= 172) {
            bestX = candX;
            bestY = candY;
            break;
          }
          if (minDist > bestMinDist) {
            bestMinDist = minDist;
            bestX = candX;
            bestY = candY;
          }
        }

        const angle = meta.canRotateFull
          ? Math.round((rand() * 2 - 1) * 155)
          : Math.round((rand() * 2 - 1) * 24);
        const texScale = Number((0.72 + rand() * 0.1).toFixed(3));

        placedObjects.push({
          id: `${boardSpec.id}_t${tierSpec.tier}_${targetGroup.itemType}_${inst}`,
          itemType: targetGroup.itemType,
          label: meta.label,
          audioKey: meta.audioKey,
          role: 'target',
          tier: tierSpec.tier,
          texX: bestX,
          texY: bestY,
          stageX: Number((bestX * 0.5).toFixed(1)),
          stageY: Number((bestY * 0.5).toFixed(1)),
          texScale,
          stageScale: Number((texScale * 0.5).toFixed(3)),
          radius: 96,
          stageRadius: 48,
          angle
        });
      }
    }
  }

  // 2. Scatter 82 Clutter/Decoy Objects chosen strictly from non-target items for this board
  const clutterPool = ALL_ITEM_KEYS.filter(
    (k) => !targetTypeSet.has(k) && k !== 'item-sparky-figurine' && k !== 'item-doggie-figurine'
  );

  const clutterCount = 82;
  for (let c = 0; c < clutterCount; c++) {
    const itemType = clutterPool[c % clutterPool.length];
    const meta = ITEM_CATALOG[itemType];

    let bestX = 1280;
    let bestY = 720;
    let bestScore = -1;

    for (let attempt = 0; attempt < 180; attempt++) {
      const candX = Math.round(145 + rand() * (2415 - 145));
      const candY = Math.round(125 + rand() * (1305 - 125));

      let minTargetDist = Infinity;
      let minAnyDist = Infinity;

      for (const existing of placedObjects) {
        const d = Math.hypot(candX - existing.texX, candY - existing.texY);
        if (existing.role === 'target') {
          if (d < minTargetDist) minTargetDist = d;
        }
        if (d < minAnyDist) minAnyDist = d;
      }

      if (minTargetDist >= 134 && minAnyDist >= 104) {
        bestX = candX;
        bestY = candY;
        break;
      }

      const score = Math.min(minTargetDist * 1.2, minAnyDist * 1.4);
      if (score > bestScore) {
        bestScore = score;
        bestX = candX;
        bestY = candY;
      }
    }

    const angle = meta.canRotateFull
      ? Math.round((rand() * 2 - 1) * 165)
      : Math.round((rand() * 2 - 1) * 28);
    const texScale = Number((0.60 + rand() * 0.14).toFixed(3));

    placedObjects.push({
      id: `${boardSpec.id}_clutter_${c}`,
      itemType,
      label: meta.label,
      audioKey: meta.audioKey,
      role: 'clutter',
      tier: 0,
      texX: bestX,
      texY: bestY,
      stageX: Number((bestX * 0.5).toFixed(1)),
      stageY: Number((bestY * 0.5).toFixed(1)),
      texScale,
      stageScale: Number((texScale * 0.5).toFixed(3)),
      radius: 80,
      stageRadius: 40,
      angle
    });
  }

  return {
    ...boardSpec,
    totalObjectCount: placedObjects.length,
    placedObjects
  };
}

function main() {
  const boards = BOARD_SPECS.map((b) => buildBoardObjects(b));
  const manifest = {
    version: 1,
    logicalStageResolution: { width: 1280, height: 720 },
    boardTextureResolution: { width: 2560, height: 1440 },
    magnifyingGlassMagnification: 2.5,
    items: ITEM_CATALOG,
    boards
  };

  const outPath = path.join(ROOT_DIR, 'src', 'data', 'ispyLevels.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(
    `  [MANIFEST EXPORTED] src/data/ispyLevels.json (${boards.length} boards, ${boards[0].totalObjectCount} objects/board)`
  );
}

main();
