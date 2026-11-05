#!/usr/bin/env node
/**
 * Node.js Companion for `tools/build_ispy_audio.py` (`tools/build_ispy_audio.mjs`)
 * Runs directly on Windows where `python` is the Microsoft Store stub.
 * Reads `ELEVENLABS_API_KEY` strictly from `.env` (never imported in `src/`) and generates:
 *   - `public/assets/audio/ispy/riddles/riddle_b<1..4>_t<1..3>.mp3`
 *   - `public/assets/audio/ispy/items/<item_id>.mp3`
 *   - `public/assets/audio/ispy/prompts/<prompt_id>.mp3`
 *   - `public/assets/audio/ispy/sfx/<sfx_id>.mp3`
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const RIDDLES_DICT = {
  riddle_b1_t1:
    "I spy with my little eye, inside Grandpa's watchmaker drawer... three brass keys, two red dice, and one golden pocket watch ticking nice.",
  riddle_b1_t2:
    'I spy with my little eye, gleaming in the velvet tray... three swirl marbles, two silver thimbles, and one tiny airplane ready to fly away.',
  riddle_b1_t3:
    'I spy with my little eye, hidden among the clockwork gears... three pearl buttons, two chess knights, two red roadsters, and one little Sparky dragon.',
  riddle_b2_t1:
    'I spy with my little eye, deep in the pirate treasure chest... three ocean starfish, two golden crowns, and one brass compass pointing west.',
  riddle_b2_t2:
    "I spy with my little eye, where the captain's doubloons shine... three ruby rings, two striped seashells, and one brass sextant on the brine.",
  riddle_b2_t3:
    'I spy with my little eye, beside the pirate map and rope... three brass keys, two jade turtles, two golden acorns, and one fluffy Doggie.',
  riddle_b3_t1:
    "I spy with my little eye, up in the cozy toymaker's loft... three red racecars, two bowling pins, and one wooden train chugging soft.",
  riddle_b3_t2:
    'I spy with my little eye, tucked by the wooden blocks so neat... three blue dominoes, two strawberry erasers, and one painted ladybug sweet.',
  riddle_b3_t3:
    "I spy with my little eye, where the toymaker's ribbons curl... three shiny paperclips, two alphabet blocks, two porcelain teacups, and one golden bell.",
  riddle_b4_t1:
    'I spy with my little eye, across the moon sand crater floor... three green dinosaurs, two purple crystals, and one space rocket ready to soar.',
  riddle_b4_t2:
    'I spy with my little eye, among the glowing crystal stones... three swirl marbles, two triceratops, and one silver whistle with bright tones.',
  riddle_b4_t3:
    'I spy with my little eye, in the starlight crystal crater box... three golden acorns, two red roadsters, two tiny airplanes, and one little Sparky on the rocks.'
};

const ITEMS_DICT = {
  item_brass_key: 'Brass skeleton key.',
  item_red_die: 'Red casino die.',
  item_glass_marble: 'Swirl glass marble.',
  item_silver_thimble: 'Silver thimble.',
  item_chess_knight: 'Wooden chess knight.',
  item_red_racecar: 'Red toy racecar.',
  item_golden_acorn: 'Golden acorn.',
  item_green_trex: 'Green dinosaur.',
  item_pearl_button: 'Pearl button.',
  item_brass_compass: 'Brass compass.',
  item_strawberry_eraser: 'Strawberry eraser.',
  item_blue_domino: 'Blue domino.',
  item_painted_ladybug: 'Painted ladybug.',
  item_t6_airplane: 'Tiny T-Six airplane.',
  item_red_roadster: 'Red vintage roadster.',
  item_golden_crown: 'Golden royal crown.',
  item_starfish: 'Ocean starfish.',
  item_paperclip: 'Shiny paperclip.',
  item_pocket_watch: 'Golden pocket watch.',
  item_bowling_pin: 'Wooden bowling pin.',
  item_sparky_figurine: 'Little Sparky dragon.',
  item_doggie_figurine: 'Fluffy Doggie sidekick.',
  item_ruby_ring: 'Royal ruby ring.',
  item_seashell: 'Striped conch seashell.',
  item_wooden_train: 'Wooden train engine.',
  item_alphabet_block: 'Wooden alphabet block.',
  item_porcelain_teacup: 'Porcelain teacup.',
  item_amethyst_crystal: 'Purple amethyst crystal.',
  item_retro_rocket: 'Retro space rocket.',
  item_triceratops: 'Toy triceratops.',
  item_brass_sextant: 'Antique brass sextant.',
  item_silver_whistle: 'Silver detective whistle.',
  item_jade_turtle: 'Jade sea turtle.',
  item_music_bell: 'Golden chime bell.'
};

const PROMPTS_DICT = {
  welcome_title:
    "Welcome to the I Spy Curio Cabinet. Pick up the brass magnifying glass and let's solve a riddle.",
  count_one_found: 'One found.',
  count_two_found: 'Two found.',
  count_all_two_found: 'Both found.',
  count_all_three_found: 'All three found.',
  count_one_key: 'One brass key.',
  count_two_keys: 'Two brass keys.',
  count_all_three_keys: 'All three brass keys found.',
  case_solved: 'Case solved, Junior Detective.',
  case_solved_wyatt:
    'Wonderful detective work, Wyatt and Sparky. You earned a golden wax seal.',
  case_solved_emma:
    'Wonderful detective work, Emma and Doggie. You earned a golden wax seal.',
  hint_shimmer: 'Look closely where the golden stars are twinkling.',
  casebook_open: 'Junior Detective Casebook and Curio Trophy Shelf.',
  curio_unlocked: 'A rare golden curio has been added to your shelf.'
};

const SFX_DICT = {
  lens_whoosh: [
    'Soft warm antique brass magnifying glass glide whoosh across velvet',
    0.9
  ],
  brass_click: [
    'Crisp mechanical antique watchmaker brass bezel click and latch',
    0.7
  ],
  chime_discovery_pop: [
    'Warm magical crystal bell chime and joyful discovery pop',
    1.2
  ],
  wax_seal_stamp: [
    'Rich tactile heavy brass stamp pressing into warm wax seal with a golden bell ring',
    1.2
  ],
  detective_fanfare: [
    'Warm enchanting music box celesta and brass detective mystery solved fanfare',
    2.6
  ],
  curio_sparkle: [
    'Delicate sparkling crystal glass curio chime and music box glissando',
    1.4
  ]
};

function loadEnvFile(rootDir) {
  const envVars = {};
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const rawLine of raw.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const eqIdx = line.indexOf('=');
      const k = line.slice(0, eqIdx).trim();
      const v = line.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      envVars[k] = v;
    }
  }
  return envVars;
}

async function synthesizeVoiceMp3(
  apiKey,
  voiceId,
  text,
  outPath,
  modelId = 'eleven_turbo_v2_5',
  previousText = "Let's read a calm, warm Walter Wick I Spy rhyming riddle for young detectives."
) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
  const payload = {
    text,
    model_id: modelId,
    previous_text: previousText,
    voice_settings: {
      stability: 0.86,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: false
    }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  return buf.length;
}

async function synthesizeSfxMp3(apiKey, prompt, outPath, durationSeconds = 1.2) {
  const url = 'https://api.elevenlabs.io/v1/sound-generation';
  const payload = {
    text: prompt,
    duration_seconds: durationSeconds,
    prompt_influence: 0.45
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  return buf.length;
}

async function main() {
  const force = process.argv.includes('--force');
  const envVars = loadEnvFile(ROOT_DIR);
  const apiKey = (envVars.ELEVENLABS_API_KEY ?? '').trim();
  const voiceId = (envVars.ELEVENLABS_VOICE_ID ?? 'nzFihrBIvB34imQBuxub').trim();

  if (!apiKey) {
    console.error('ERROR: ELEVENLABS_API_KEY not found in .env');
    process.exit(1);
  }

  const baseOutDir = path.join(ROOT_DIR, 'public', 'assets', 'audio', 'ispy');
  const riddlesDir = path.join(baseOutDir, 'riddles');
  const itemsDir = path.join(baseOutDir, 'items');
  const promptsDir = path.join(baseOutDir, 'prompts');
  const sfxDir = path.join(baseOutDir, 'sfx');

  for (const d of [riddlesDir, itemsDir, promptsDir, sfxDir]) {
    fs.mkdirSync(d, { recursive: true });
  }

  for (const [riddleKey, text] of Object.entries(RIDDLES_DICT)) {
    const outPath = path.join(riddlesDir, `${riddleKey}.mp3`);
    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 800) {
      console.log(`  [CACHE HIT] riddles/${riddleKey}.mp3`);
      continue;
    }
    const sizeB = await synthesizeVoiceMp3(apiKey, voiceId, text, outPath);
    console.log(`  [GENERATED RIDDLE] riddles/${riddleKey}.mp3 (${sizeB.toLocaleString()} bytes)`);
    await new Promise((r) => setTimeout(r, 90));
  }

  for (const [itemKey, text] of Object.entries(ITEMS_DICT)) {
    const outPath = path.join(itemsDir, `${itemKey}.mp3`);
    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 800) {
      console.log(`  [CACHE HIT] items/${itemKey}.mp3`);
      continue;
    }
    const sizeB = await synthesizeVoiceMp3(
      apiKey,
      voiceId,
      text,
      outPath,
      'eleven_turbo_v2_5',
      "Let's name each miniature curio treasure clearly and calmly."
    );
    console.log(`  [GENERATED ITEM] items/${itemKey}.mp3 (${sizeB.toLocaleString()} bytes)`);
    await new Promise((r) => setTimeout(r, 80));
  }

  for (const [promptKey, text] of Object.entries(PROMPTS_DICT)) {
    const outPath = path.join(promptsDir, `${promptKey}.mp3`);
    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 800) {
      console.log(`  [CACHE HIT] prompts/${promptKey}.mp3`);
      continue;
    }
    const sizeB = await synthesizeVoiceMp3(
      apiKey,
      voiceId,
      text,
      outPath,
      'eleven_turbo_v2_5',
      "Let's encourage our young detectives calmly and warmly."
    );
    console.log(`  [GENERATED PROMPT] prompts/${promptKey}.mp3 (${sizeB.toLocaleString()} bytes)`);
    await new Promise((r) => setTimeout(r, 80));
  }

  for (const [sfxKey, [sfxPrompt, dur]] of Object.entries(SFX_DICT)) {
    const outPath = path.join(sfxDir, `${sfxKey}.mp3`);
    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 800) {
      console.log(`  [CACHE HIT] sfx/${sfxKey}.mp3`);
      continue;
    }
    try {
      const sizeB = await synthesizeSfxMp3(apiKey, sfxPrompt, outPath, dur);
      console.log(`  [GENERATED SFX] sfx/${sfxKey}.mp3 (${sizeB.toLocaleString()} bytes)`);
      await new Promise((r) => setTimeout(r, 140));
    } catch (err) {
      console.log(`  [SFX FALLBACK NOTE] sfx/${sfxKey}.mp3 (${err.message}) — WebAudio synth fallback will handle.`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
