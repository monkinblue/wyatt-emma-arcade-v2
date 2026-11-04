#!/usr/bin/env node
/**
 * Node.js Companion for `tools/build_shutthebox_audio.py` (`tools/build_shutthebox_audio.mjs`)
 * Runs directly on Windows where `python` is the Microsoft Store stub.
 * Reads `ELEVENLABS_API_KEY` from `.env` (never imported in `src/`) and generates:
 *   - `public/assets/audio/shutthebox/numbers/num_<1..20>.mp3`
 *   - `public/assets/audio/shutthebox/prompts/<id>.mp3`
 *   - `public/assets/audio/shutthebox/sfx/<id>.mp3`
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Each number entry: [spokenText, previousText, nextText]
const NUMBERS_DICT = {
  1: ['One.', "Let's count the numbers clearly.", 'Two, three, four.'],
  2: ['Two.', 'One.', 'Three, four, five.'],
  3: ['Three.', 'One, two.', 'Four, five, six.'],
  4: ['Four.', 'One, two, three.', 'Five, six, seven.'],
  5: ['Five.', 'Two, three, four.', 'Six, seven, eight.'],
  6: ['Six.', 'Three, four, five.', 'Seven, eight, nine.'],
  7: ['Seven.', 'Four, five, six.', 'Eight, nine, ten.'],
  8: ['Eight.', 'Five, six, seven.', 'Nine, ten, eleven.'],
  9: ['Nine.', 'Six, seven, eight.', 'Ten, eleven, twelve.'],
  10: ['Ten.', 'Seven, eight, nine.', 'Eleven, twelve.'],
  11: ['Eleven.', 'Eight, nine, ten.', 'Twelve, thirteen.'],
  12: ['Twelve.', 'Nine, ten, eleven.', 'Thirteen, fourteen.'],
  13: ['Thirteen.', 'Ten, eleven, twelve.', 'Fourteen, fifteen.'],
  14: ['Fourteen.', 'Eleven, twelve, thirteen.', 'Fifteen, sixteen.'],
  15: ['Fifteen.', 'Twelve, thirteen, fourteen.', 'Sixteen, seventeen.'],
  16: ['Sixteen.', 'Thirteen, fourteen, fifteen.', 'Seventeen, eighteen.'],
  17: ['Seventeen.', 'Fourteen, fifteen, sixteen.', 'Eighteen, nineteen.'],
  18: ['Eighteen.', 'Fifteen, sixteen, seventeen.', 'Nineteen, twenty.'],
  19: ['Nineteen.', 'Sixteen, seventeen, eighteen.', 'Twenty.'],
  20: ['Twenty.', 'Seventeen, eighteen, nineteen.', 'Great counting.']
};

const PROMPTS_DICT = {
  welcome_title: 'Welcome to the Great Hall Box of Ten.',
  turn_wyatt: "Wyatt's turn to roll the dice.",
  turn_emma: "Emma's turn to roll the dice.",
  turn_sparky: "Now it is Professor Sparky's turn.",
  prompt_roll: 'Tap the dice cup to roll on the green felt.',
  prompt_scroll: 'Count the dots and tap the magic number.',
  prompt_flip: 'Now flip the wooden tiles that make that number.',
  prompt_score_math: "Let's add up your House gems for this round.",
  praise_math: 'Wonderful math. Now flip your wooden tiles.',
  praise_shut_box: 'Incredible. You shut every single tile in the box.',
  praise_wyatt_win: 'Great job, Wyatt. Your House hourglass is glowing.',
  praise_emma_win: 'Wonderful job, Emma. Doggie loves your House gems.',
  praise_sparky_turn: 'Professor Sparky flipped his wooden tiles.',
  mode_one_die: 'One die mode. Numbers one through six.',
  mode_two_dice: 'Two dice mode. Add both dice together.'
};

const SFX_DICT = {
  dice_cup_shake: ['Wooden dice rattling inside a leather and brass dice shaker cup', 1.4],
  dice_roll_felt: ['Two ivory wooden dice tumbling and rolling to a stop on soft green baize felt table', 1.6],
  tile_clack_shut: ['Crisp mechanical hinged maple wood tile flipping and clacking shut on a wooden box', 1.0],
  scroll_unfurl: ['Thick antique parchment scroll unfurling smoothly with a soft magical shimmer', 1.4],
  math_chime: ['Warm magical celesta and antique brass bell chord for solving a wizard puzzle', 1.8],
  gems_pour_glass: ['Glowing crystal ruby and emerald gems clinking and pouring into a glass hourglass', 2.0],
  house_fanfare: ['Cozy magical banquet hall harp and warm brass fanfare celebration', 2.5]
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

async function synthesizeVoiceMp3(
  apiKey,
  voiceId,
  text,
  outPath,
  modelId = 'eleven_turbo_v2_5',
  previousText = "Let's count the numbers.",
  nextText = ''
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
  if (nextText) {
    payload.next_text = nextText;
  }
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
  const regenNumbers = process.argv.includes('--regen-numbers');
  const envVars = loadEnvFile(ROOT_DIR);
  const apiKey = (envVars.ELEVENLABS_API_KEY ?? '').trim();
  const voiceId = (envVars.ELEVENLABS_VOICE_ID ?? 'nzFihrBIvB34imQBuxub').trim();

  if (!apiKey) {
    console.error('ERROR: ELEVENLABS_API_KEY not found in .env!');
    process.exit(1);
  }

  await checkSubscriptionCredits(apiKey, 'Before Build');

  const baseOutDir = path.join(ROOT_DIR, 'public', 'assets', 'audio', 'shutthebox');
  const numbersDir = path.join(baseOutDir, 'numbers');
  const promptsDir = path.join(baseOutDir, 'prompts');
  const sfxDir = path.join(baseOutDir, 'sfx');

  for (const d of [numbersDir, promptsDir, sfxDir]) {
    fs.mkdirSync(d, { recursive: true });
  }

  // 1. Numbers 1..20 with eleven_turbo_v2_5 + previous_text + next_text
  for (const [numKey, [text, prevTxt, nextTxt]] of Object.entries(NUMBERS_DICT)) {
    const outPath = path.join(numbersDir, `num_${numKey}.mp3`);
    const forceThis = force || regenNumbers || numKey === '1';
    if (!forceThis && fs.existsSync(outPath) && fs.statSync(outPath).size > 800) {
      console.log(`  [CACHE HIT] numbers/num_${numKey}.mp3`);
      continue;
    }
    const sizeB = await synthesizeVoiceMp3(
      apiKey,
      voiceId,
      text,
      outPath,
      'eleven_turbo_v2_5',
      prevTxt,
      nextTxt
    );
    console.log(`  [GENERATED NUMBER] numbers/num_${numKey}.mp3 (${sizeB.toLocaleString()} bytes) — '${text}'`);
    await new Promise((r) => setTimeout(r, 90));
  }

  // 2. Prompts & Encouragement
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
      "Let's guide the children warmly and calmly in our Great Hall game."
    );
    console.log(`  [GENERATED PROMPT] prompts/${promptKey}.mp3 (${sizeB.toLocaleString()} bytes) — '${text}'`);
    await new Promise((r) => setTimeout(r, 120));
  }

  // 3. Acoustic Tabletop SFX via ElevenLabs Sound Generation
  for (const [sfxKey, [sfxPrompt, dur]] of Object.entries(SFX_DICT)) {
    const outPath = path.join(sfxDir, `${sfxKey}.mp3`);
    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 800) {
      console.log(`  [CACHE HIT] sfx/${sfxKey}.mp3`);
      continue;
    }
    try {
      const sizeB = await synthesizeSfxMp3(apiKey, sfxPrompt, outPath, dur);
      console.log(`  [GENERATED SFX] sfx/${sfxKey}.mp3 (${sizeB.toLocaleString()} bytes) — '${sfxPrompt}'`);
      await new Promise((r) => setTimeout(r, 150));
    } catch (err) {
      console.log(`  [SFX FALLBACK NOTE] sfx/${sfxKey}.mp3 (${err.message}) — WebAudio synth fallback will handle.`);
    }
  }

  await checkSubscriptionCredits(apiKey, 'After Build');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
