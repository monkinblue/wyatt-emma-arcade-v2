#!/usr/bin/env node
/**
 * Offline ElevenLabs Audio Generator Companion (`tools/build_balloon_audio.mjs`)
 * Mirrors `tools/build_balloon_audio.py` 1:1 for Windows machines where `python` is not installed.
 * Reads `ELEVENLABS_API_KEY` strictly from local `.env` (never imported in `src/`)
 * and saves static MP3 files into `public/assets/audio/balloon-pop/` using "Josh - Teacher for Kids".
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const LETTERS_DICT = {
  a: 'A.',
  b: 'Bee.',
  c: 'See.',
  d: 'Dee.',
  e: 'Ee.',
  f: 'Eff.',
  g: 'Jee.',
  h: 'Eightch.',
  i: 'Eye.',
  j: 'Jay.',
  k: 'Kay.',
  l: 'Ell.',
  m: 'Emm.',
  n: 'Enn.',
  o: 'Oh.',
  p: 'Pee.',
  q: 'Cue.',
  r: 'Are.',
  s: 'Ess.',
  t: 'Tee.',
  u: 'You.',
  v: 'Vee.',
  w: 'Double-you.',
  x: 'Ex.',
  y: 'Why.',
  z: 'Zee.'
};

const PHONICS_DICT = {
  a: 'ah, as in apple.',
  b: 'buh, as in bear.',
  c: 'kuh, as in cat.',
  d: 'duh, as in dog.',
  e: 'eh, as in elephant.',
  f: 'fff, as in fish.',
  g: 'guh, as in goat.',
  h: 'huh, as in hat.',
  i: 'ih, as in igloo.',
  j: 'juh, as in jet.',
  k: 'kuh, as in kite.',
  l: 'lll, as in lion.',
  m: 'mmm, as in monkey.',
  n: 'nnn, as in nest.',
  o: 'aw, as in octopus.',
  p: 'puh, as in pig.',
  q: 'kwuh, as in queen.',
  r: 'rrr, as in rabbit.',
  s: 'sss, as in sun.',
  t: 'tuh, as in train.',
  u: 'uh, as in umbrella.',
  v: 'vvv, as in van.',
  w: 'wuh, as in wagon.',
  x: 'ks, as in fox.',
  y: 'yuh, as in yo-yo.',
  z: 'zzz, as in zebra.'
};

const WORD_THEMES = {
  family: ['WYATT', 'EMMA', 'MAMA', 'DADA', 'NANA', 'PAPA', 'DOG', 'SPARKY'],
  animals: [
    'CAT', 'PIG', 'BUG', 'FOX', 'HEN', 'COW', 'BAT', 'OWL',
    'FROG', 'BEAR', 'DUCK', 'FISH', 'LION', 'CRAB', 'GOAT', 'DEER',
    'TIGER', 'ZEBRA', 'SHARK', 'WHALE', 'HORSE', 'SHEEP', 'MOUSE', 'SNAKE'
  ],
  vehicles: [
    'CAR', 'BUS', 'VAN', 'JET', 'SUB', 'SHIP',
    'TRAIN', 'TRUCK', 'PLANE', 'BOAT', 'ROCKET', 'TRACTOR'
  ],
  nature: [
    'SUN', 'SKY', 'MUD', 'LOG', 'WEB', 'STAR', 'MOON', 'TREE',
    'RAIN', 'SNOW', 'WIND', 'LEAF', 'ROCK', 'CLOUD', 'EARTH', 'OCEAN'
  ],
  food: [
    'JAM', 'PIE', 'CUP', 'EGG', 'NUT', 'CAKE', 'MILK', 'CORN',
    'PEAR', 'PLUM', 'SOUP', 'TACO', 'APPLE', 'BREAD', 'PIZZA', 'BERRY'
  ],
  home: [
    'HAT', 'BED', 'BOX', 'RUG', 'TOP', 'PEN', 'BAG', 'KEY',
    'BOOK', 'DRUM', 'BALL', 'DOLL', 'KITE', 'BELL', 'TENT', 'ROBOT',
    'CLOCK', 'CROWN'
  ]
};

const WORDS_DICT = {};
for (const wordList of Object.values(WORD_THEMES)) {
  for (const w of wordList) {
    const key = w.toLowerCase();
    WORDS_DICT[key] = `${key}.`;
  }
}

const PRAISE_DICT = {
  praise_wyatt: 'Great job spelling, Wyatt.',
  praise_emma: 'Wonderful job, Emma.',
  praise_frenzy: 'Bonus rainbow balloons. Pop as many as you like.',
  praise_star: 'You earned a gold star.',
  praise_complete: 'Well done, you built the whole word.',
  prompt_phonics: 'Find and pop the matching letter balloon.',
  prompt_spell: 'Pop the balloons in order to spell the word.'
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

async function apiGetJson(url, apiKey) {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'xi-api-key': apiKey,
      Accept: 'application/json'
    }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function checkSubscriptionCredits(apiKey) {
  try {
    const sub = await apiGetJson('https://api.elevenlabs.io/v1/user/subscription', apiKey);
    const used = sub.character_count ?? 0;
    const limit = sub.character_limit ?? 0;
    const remaining = Math.max(0, limit - used);
    const tier = sub.tier ?? 'unknown';
    console.log(
      `[ElevenLabs Subscription] Tier: ${tier} | Used: ${used.toLocaleString()} / ${limit.toLocaleString()} | Remaining credits: ${remaining.toLocaleString()} chars`
    );
  } catch (err) {
    console.log(`[ElevenLabs Subscription] Note: Could not read subscription info (${err.message}); continuing.`);
  }
}

async function resolveJoshVoiceId(apiKey, defaultVoiceId) {
  try {
    const data = await apiGetJson('https://api.elevenlabs.io/v1/voices', apiKey);
    const voices = data.voices ?? [];
    for (const v of voices) {
      const name = String(v.name ?? '');
      const vid = String(v.voice_id ?? '');
      if (name.toLowerCase().includes('josh - teacher for kids') && vid) {
        console.log(`[Voice Lookup] Found preferred Josh voice: '${name}' (voice_id=${vid})`);
        return { voiceId: vid, voiceName: name };
      }
    }
    for (const v of voices) {
      const name = String(v.name ?? '');
      const vid = String(v.voice_id ?? '');
      if (name.toLowerCase().includes('josh') && vid) {
        console.log(`[Voice Lookup] Found matching Josh voice: '${name}' (voice_id=${vid})`);
        return { voiceId: vid, voiceName: name };
      }
    }
    console.log(
      `[Voice Lookup] 'Josh' not in custom list (${voices.length} voices returned); using configured ELEVENLABS_VOICE_ID=${defaultVoiceId}`
    );
  } catch (err) {
    console.log(`[Voice Lookup] Could not list voices (${err.message}); falling back to ELEVENLABS_VOICE_ID=${defaultVoiceId}`);
  }
  return { voiceId: defaultVoiceId, voiceName: 'Josh - Teacher for Kids' };
}

async function synthesizeToMp3(
  apiKey,
  voiceId,
  text,
  outPath,
  modelId = 'eleven_multilingual_v2',
  previousText = '',
  nextText = ''
) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
  const payload = {
    text,
    model_id: modelId,
    voice_settings: {
      stability: 0.86,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: false
    }
  };
  if (previousText) payload.previous_text = previousText;
  if (nextText) payload.next_text = nextText;
  if (modelId === 'eleven_turbo_v2_5') payload.language_code = 'en';

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

  const arrayBuffer = await res.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  return buf.length;
}

function buildTaskList(baseOutDir, testOnly) {
  const lettersDir = path.join(baseOutDir, 'letters');
  const phonicsDir = path.join(baseOutDir, 'phonics');
  const wordsDir = path.join(baseOutDir, 'words');
  const praiseDir = path.join(baseOutDir, 'praise');

  if (testOnly) {
    return [
      ['letter_a', LETTERS_DICT.a, path.join(lettersDir, 'letter_a.mp3')],
      ['phonics_h', PHONICS_DICT.h, path.join(phonicsDir, 'phonics_h.mp3')],
      ['word_mama', WORDS_DICT.mama, path.join(wordsDir, 'word_mama.mp3')]
    ];
  }

  const tasks = [];
  for (const [ch, text] of Object.entries(LETTERS_DICT)) {
    tasks.push([`letter_${ch}`, text, path.join(lettersDir, `letter_${ch}.mp3`)]);
  }
  for (const [ch, text] of Object.entries(PHONICS_DICT)) {
    tasks.push([`phonics_${ch}`, text, path.join(phonicsDir, `phonics_${ch}.mp3`)]);
  }
  for (const [wordKey, text] of Object.entries(WORDS_DICT)) {
    tasks.push([`word_${wordKey}`, text, path.join(wordsDir, `word_${wordKey}.mp3`)]);
  }
  for (const [praiseId, text] of Object.entries(PRAISE_DICT)) {
    tasks.push([praiseId, text, path.join(praiseDir, `${praiseId}.mp3`)]);
  }
  return tasks;
}

async function main() {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test');
  const isAll = args.includes('--all');
  const onlyIdx = args.indexOf('--only');
  const onlyLabel = onlyIdx >= 0 ? args[onlyIdx + 1] : null;
  let force = args.includes('--force');

  if (!isTest && !isAll && !onlyLabel) {
    console.error('Usage: node tools/build_balloon_audio.mjs [--test | --all | --only <label>] [--force]');
    process.exit(1);
  }

  const envVars = loadEnvFile(ROOT_DIR);
  const apiKey = (envVars.ELEVENLABS_API_KEY ?? '').trim();
  const defaultVoiceId = (envVars.ELEVENLABS_VOICE_ID ?? 'NOpBlnGInO9m6vDvFkFC').trim();

  if (!apiKey) {
    console.error('ERROR: ELEVENLABS_API_KEY not found in .env!');
    process.exit(1);
  }

  await checkSubscriptionCredits(apiKey);
  const { voiceId, voiceName } = await resolveJoshVoiceId(apiKey, defaultVoiceId);
  console.log(`[Audio Builder] Using voice '${voiceName}' (${voiceId})`);

  const baseOutDir = path.join(ROOT_DIR, 'public', 'assets', 'audio', 'balloon-pop');
  for (const sub of ['letters', 'phonics', 'words', 'praise']) {
    fs.mkdirSync(path.join(baseOutDir, sub), { recursive: true });
  }

  let tasks = buildTaskList(baseOutDir, isTest);
  if (onlyLabel) {
    const wanted = new Set(onlyLabel.split(',').map((s) => s.trim()));
    tasks = buildTaskList(baseOutDir, false).filter((t) => wanted.has(t[0]));
    force = true;
  }
  let generatedCount = 0;
  let skippedCount = 0;

  for (const [label, text, outPath] of tasks) {
    const relPath = path.relative(ROOT_DIR, outPath).replace(/\\/g, '/');
    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
      const sizeB = fs.statSync(outPath).size;
      console.log(`  [CACHE HIT] ${relPath} (${sizeB.toLocaleString()} bytes) — '${text}'`);
      skippedCount++;
      continue;
    }

    let prevCtx = '';
    let nextCtx = '';
    if (label === 'letter_a') {
      prevCtx = "Let's say the first letter of the English alphabet calmly, which rhymes with day and play:";
      nextCtx = 'is for apron.';
    } else if (label === 'letter_h') {
      prevCtx = 'The eighth letter of the English alphabet is pronounced:';
    } else if (label === 'letter_r') {
      prevCtx = 'The letter after Q in the English alphabet is pronounced:';
    } else if (label.startsWith('letter_')) {
      prevCtx = 'Here is the next letter of the English alphabet:';
    } else if (label.startsWith('word_')) {
      prevCtx = "Let's read the word calmly:";
    }

    const sizeB = await synthesizeToMp3(apiKey, voiceId, text, outPath, 'eleven_multilingual_v2', prevCtx, nextCtx);
    console.log(`  [GENERATED] ${relPath} (${sizeB.toLocaleString()} bytes) — '${text}'`);
    generatedCount++;
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`\nDone! Generated: ${generatedCount} | Cached/Skipped: ${skippedCount} | Total: ${tasks.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
