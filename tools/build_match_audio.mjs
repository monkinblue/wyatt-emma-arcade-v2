#!/usr/bin/env node
/**
 * Node.js Companion for `tools/build_match_audio.py` (`tools/build_match_audio.mjs`)
 * Runs directly on Windows where `python` is the Microsoft Store stub.
 * Reads `ELEVENLABS_API_KEY` from `.env` (never imported in `src/`) and generates:
 *   - `public/assets/audio/memory-match/words/word_<w>.mp3`
 *   - `public/assets/audio/memory-match/whispers/<id>.mp3`
 *   - `public/assets/audio/memory-match/sfx/<id>.mp3`
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const NEW_WORDS_DICT = {
  cub: 'cub.',
  elephant: 'elephant.',
  calf: 'calf.',
  owl: 'owl.',
  owlet: 'owlet.',
  tadpole: 'tadpole.',
  fox: 'fox.',
  kit: 'kit.',
  monkey: 'monkey.',
  duckling: 'duckling.',
  octopus: 'octopus.',
  turtle: 'turtle.',
  clownfish: 'clownfish.',
  dolphin: 'dolphin.',
  seahorse: 'seahorse.',
  starfish: 'starfish.',
  trex: 'T-Rex.',
  triceratops: 'triceratops.',
  stegosaurus: 'stegosaurus.',
  brachiosaurus: 'brachiosaurus.',
  pterodactyl: 'pterodactyl.',
  ankylosaurus: 'ankylosaurus.',
  dinosaur: 'dinosaur.',
  airship: 'airship.',
  firetruck: 'fire truck.',
  submarine: 'submarine.',
  biplane: 'biplane.',
  tractor: 'tractor.',
  dragon: 'dragon.',
  unicorn: 'unicorn.',
  crystal: 'crystal.',
  map: 'map.',
  cupcake: 'cupcake.',
  strawberry: 'strawberry.',
  acorn: 'acorn.'
};

const WHISPERS_DICT = {
  key_found: 'You found the hidden golden key.',
  chest_open: 'The mystery treasure chest is open.',
  mama_baby: 'Mama and baby are back together.',
  board_clear: 'Wonderful matching.'
};

const SFX_DICT = {
  card_flip: 'Crisp tactile wooden tile flip click on soft felt table',
  match_chime: 'Warm magical antique brass music box chime chord',
  chest_unlock: 'Ornate brass treasure chest lock click and magical sparkle chime',
  firefly_twinkle: 'Soft magical fairy firefly bell shimmer',
  spyglass_peek: 'Gentle brass telescope lens click and warm magical hum',
  mismatch_thud: 'Soft gentle wooden tap'
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

async function checkSubscriptionCredits(apiKey, label) {
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: { 'xi-api-key': apiKey, Accept: 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const sub = await res.json();
    const used = sub.character_count ?? 0;
    const limit = sub.character_limit ?? 0;
    const remaining = Math.max(0, limit - used);
    console.log(
      `[ElevenLabs ${label}] Tier: ${sub.tier ?? 'unknown'} | Used: ${used.toLocaleString()} / ${limit.toLocaleString()} | Remaining credits: ${remaining.toLocaleString()} chars`
    );
    return { used, limit, remaining };
  } catch (err) {
    console.log(`[ElevenLabs ${label}] Could not read subscription info (${err.message})`);
    return { used: 0, limit: 0, remaining: 0 };
  }
}

async function synthesizeVoiceMp3(apiKey, voiceId, text, outPath, previousText = "Let's read the word calmly:") {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
  const payload = {
    text,
    model_id: 'eleven_multilingual_v2',
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

async function synthesizeSfxMp3(apiKey, prompt, outPath, durationSeconds = 1.5) {
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
    console.error('ERROR: ELEVENLABS_API_KEY not found in .env!');
    process.exit(1);
  }

  await checkSubscriptionCredits(apiKey, 'Before Build');

  const baseOutDir = path.join(ROOT_DIR, 'public', 'assets', 'audio', 'memory-match');
  const wordsDir = path.join(baseOutDir, 'words');
  const whispersDir = path.join(baseOutDir, 'whispers');
  const sfxDir = path.join(baseOutDir, 'sfx');
  for (const d of [wordsDir, whispersDir, sfxDir]) {
    fs.mkdirSync(d, { recursive: true });
  }

  const balloonWordsDir = path.join(ROOT_DIR, 'public', 'assets', 'audio', 'balloon-pop', 'words');

  for (const [wordKey, promptText] of Object.entries(NEW_WORDS_DICT)) {
    const outPath = path.join(wordsDir, `word_${wordKey}.mp3`);
    const balloonExisting = path.join(balloonWordsDir, `word_${wordKey}.mp3`);
    if (!force && !fs.existsSync(outPath) && fs.existsSync(balloonExisting)) {
      fs.copyFileSync(balloonExisting, outPath);
      console.log(`  [REUSED BALLOON-POP] words/word_${wordKey}.mp3 (0 credits)`);
      continue;
    }
    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 800) {
      console.log(`  [CACHE HIT] words/word_${wordKey}.mp3`);
      continue;
    }
    const sizeB = await synthesizeVoiceMp3(apiKey, voiceId, promptText, outPath);
    console.log(`  [GENERATED WORD] words/word_${wordKey}.mp3 (${sizeB.toLocaleString()} bytes) — '${promptText}'`);
    await new Promise((r) => setTimeout(r, 120));
  }

  for (const [whisperId, promptText] of Object.entries(WHISPERS_DICT)) {
    const outPath = path.join(whispersDir, `${whisperId}.mp3`);
    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 800) {
      console.log(`  [CACHE HIT] whispers/${whisperId}.mp3`);
      continue;
    }
    const sizeB = await synthesizeVoiceMp3(
      apiKey,
      voiceId,
      promptText,
      outPath,
      "Let's whisper calmly and warmly to the children:"
    );
    console.log(`  [GENERATED WHISPER] whispers/${whisperId}.mp3 (${sizeB.toLocaleString()} bytes) — '${promptText}'`);
    await new Promise((r) => setTimeout(r, 120));
  }

  for (const [sfxId, sfxPrompt] of Object.entries(SFX_DICT)) {
    const outPath = path.join(sfxDir, `${sfxId}.mp3`);
    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 800) {
      console.log(`  [CACHE HIT] sfx/${sfxId}.mp3`);
      continue;
    }
    try {
      const sizeB = await synthesizeSfxMp3(apiKey, sfxPrompt, outPath, 1.5);
      console.log(`  [GENERATED SFX] sfx/${sfxId}.mp3 (${sizeB.toLocaleString()} bytes) — '${sfxPrompt}'`);
      await new Promise((r) => setTimeout(r, 150));
    } catch (err) {
      console.log(`  [SFX FALLBACK NOTE] sfx/${sfxId}.mp3 (${err.message}) — WebAudio synth fallback will handle.`);
    }
  }

  await checkSubscriptionCredits(apiKey, 'After Build');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
